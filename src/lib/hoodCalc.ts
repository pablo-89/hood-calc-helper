import { FANS } from "@/data/fans";
export type HoodType = "mural" | "central";
export type DuctType = "circular" | "rectangular";

export interface AccessoryCounts {
  codo90: number;
  codo45: number;
  transiciones: number;
  rejillas: number;
  compuertas: number;
}

export interface InputData {
  tipoCampana: HoodType;
  L: number; // m
  F: number; // m
  alturaInstalacion: number; // m (industrial, sobre plano de cocción sugerido 0.9–1.2 m)
  tipoCocina: string;
  potenciaTermica?: number; // kW
  velocidadCaptura: number; // Vap m/s
  caudalDiseno?: number; // m3/h
  longitudConducto: number; // m (total, compatibilidad)
  // Nuevas longitudes desglosadas
  longitudHoriz?: number; // m
  longitudVert?: number; // m
  longitudTransicion?: number; // m
  accesorios: AccessoryCounts;
  tipoConducto: DuctType;
  anchoRect?: number; // m
  altoRect?: number; // m
  lugarExpulsion: string;
  orientacionSalida?: "horizontal" | "vertical";
  nivelRuidoMax?: number; // dBA
  supresionIncendios: boolean;
  velocidadDucto: number; // Vd m/s
  margenCaudalPct: number; // % e.g. 15
  friccionPaPorM: number; // Pa/m
  perdidaFiltrosPa: number; // Pa
  perdidaSalidaPa: number; // Pa
}

export interface Results {
  Q: number; // m3/h
  Qs: number; // m3/s
  Areq: number; // m2
  Dmm: number; // mm
  Leq: number; // m
  deltaPf: number; // Pa
  deltaPtotal: number; // Pa
  recomendacionVentilador: string;
  avisos: string[];
  VrectActual?: number; // m/s if rectangular provided
  fanModeloSugerido?: string;
}

const EQ_LEN = {
  codo90: 3,
  codo45: 1.5,
  transiciones: 1.5,
  rejillas: 2,
  compuertas: 2,
};

// New modular API aligning with requested signatures
export function calcCaudal(type: HoodType, L: number, F: number, vap: number): number {
  const perimetroLibre = type === "mural" ? L + 2 * F : 2 * L + 2 * F;
  return perimetroLibre * vap * 3600; // m3/h
}

export function calcConducto(Q: number, Vd: number): { A: number; D: number } {
  const Qs = Q / 3600; // m3/s
  const A = Qs / Vd; // m2
  const D = Math.sqrt((4 * A) / Math.PI); // m
  return { A, D };
}

export function calcPerdidas(
  conducto: { Leq: number; friccionPaPorM: number },
  accesorios: AccessoryCounts,
  filtro?: { perdidasPa?: number },
  salida?: { perdidasPa?: number }
): number {
  const Leq = calcLeq(conducto.Leq, accesorios);
  const deltaPf = conducto.friccionPaPorM * Leq;
  const total = deltaPf + (filtro?.perdidasPa ?? 0) + (salida?.perdidasPa ?? 0);
  return total;
}

export interface Ventilador {
  modelo?: string;
  potenciaKw?: number;
  caudalMin: number; // m3/h
  deltaPmin: number; // Pa
}

export function selectVentilador(Q: number, deltaP: number): Ventilador | null {
  // Placeholder selector. In absence of a catalog, recommend with 25% margin
  const caudalMin = Math.ceil(Q * 1.0);
  const deltaPmin = Math.ceil(deltaP * 1.25);
  return { caudalMin, deltaPmin };
}

export function calcQ(tipo: HoodType, L: number, F: number, Vap: number): number {
  const perimetroLibre = tipo === "mural" ? L + 2 * F : 2 * L + 2 * F;
  return perimetroLibre * Vap * 3600; // m3/h
}

export function applyMargin(Q: number, margenPct: number): number {
  return Q * (1 + margenPct / 100);
}

export function calcDuctSection(Q: number, Vd: number) {
  const Qs = Q / 3600; // m3/s
  const A = Qs / Vd; // m2
  const D = Math.sqrt((4 * A) / Math.PI); // m
  return { Qs, A, Dmm: D * 1000 };
}

export function calcLeq(longitud: number, acc: AccessoryCounts) {
  const extra =
    acc.codo90 * EQ_LEN.codo90 +
    acc.codo45 * EQ_LEN.codo45 +
    acc.transiciones * EQ_LEN.transiciones +
    acc.rejillas * EQ_LEN.rejillas +
    acc.compuertas * EQ_LEN.compuertas;
  return longitud + extra;
}

export function calcLeqDetailed(horiz: number, vert: number, transicion: number, acc: AccessoryCounts) {
  const base = (horiz || 0) + (vert || 0) + (transicion || 0);
  return calcLeq(base, acc);
}

export function calcLosses(Leq: number, friccion: number, perdFiltros: number, perdSalida: number) {
  const deltaPf = friccion * Leq; // Pa
  const deltaPtotal = deltaPf + perdFiltros + perdSalida;
  return { deltaPf, deltaPtotal };
}

export function selectFanByCurve(Q: number, deltaP: number): string | undefined {
  // Choose first fan whose curve has a point with dp >= required at Q within tolerance
  const qReq = Math.round(Q);
  const dpReq = Math.round(deltaP);
  for (const fan of FANS) {
    for (const pt of fan.curva) {
      if (pt.Q >= qReq && pt.dp >= dpReq) {
        return fan.modelo;
      }
    }
  }
  return undefined;
}

export function computeAll(input: InputData): Results {
  const avisos: string[] = [];

  // Altura recomendada industrial (sobre plano cocción)
  const h = input.alturaInstalacion;
  const rango: [number, number] = [0.9, 1.2];
  if (h < rango[0] || h > rango[1]) {
    avisos.push(
      `Altura sobre plano de cocción recomendada ${rango[0]}–${rango[1]} m en campanas industriales (ver fabricante).`
    );
  }

  const Qbase = calcQ(input.tipoCampana, input.L, input.F, input.velocidadCaptura);
  const Qsin = input.caudalDiseno && input.caudalDiseno > 0 ? input.caudalDiseno : Qbase;
  const Q = applyMargin(Qsin, input.margenCaudalPct);

  const { Qs, A, Dmm } = calcDuctSection(Q, input.velocidadDucto);

  const totalLong = (input.longitudHoriz ?? 0) + (input.longitudVert ?? 0) + (input.longitudTransicion ?? 0);
  const Leq = calcLeqDetailed(input.longitudHoriz ?? totalLong, input.longitudVert ?? 0, input.longitudTransicion ?? 0, input.accesorios);

  const { deltaPf, deltaPtotal } = calcLosses(
    Leq,
    input.friccionPaPorM,
    input.perdidaFiltrosPa,
    input.perdidaSalidaPa
  );

  let VrectActual: number | undefined;
  if (input.tipoConducto === "rectangular" && input.anchoRect && input.altoRect) {
    const Arect = input.anchoRect * input.altoRect; // m2
    VrectActual = Qs / Arect;
  }

  const fanModeloSugerido = selectFanByCurve(Q, deltaPtotal);

  const recomendacionVentilador = fanModeloSugerido
    ? `Sugerido: ${fanModeloSugerido} para Q ≈ ${Q.toFixed(0)} m³/h y Δp ≥ ${(deltaPtotal).toFixed(0)} Pa.`
    : `Selecciona ventilador con Q ≥ ${Q.toFixed(0)} m³/h y Δp ≥ ${(deltaPtotal * 1.25).toFixed(0)} Pa (margen 25%).`;

  return { Q, Qs, Areq: A, Dmm, Leq, deltaPf, deltaPtotal, recomendacionVentilador, avisos, VrectActual, fanModeloSugerido };
}
