import { loadTevexExcelMapping } from "@/lib/tevexExcel";

let cachedExcel: Promise<import("@/lib/tevexExcel").TevexExcelMapping | undefined> | undefined;
async function getExcel() {
  if (!cachedExcel) cachedExcel = loadTevexExcelMapping();
  return cachedExcel;
}

export async function selectMotorForMonoblockExcelAware(hoodModel: string, lengthMeters: number, depthMeters: number, isHomologada400?: boolean): Promise<string | undefined> {
  const mapping = await getExcel();
  if (mapping) {
    const key = hoodModel.trim().toUpperCase();
    const Lmm = Math.round(lengthMeters * 1000);
    const Fmm = Math.round(depthMeters * 1000);
    const entries = mapping.models[key];
    if (entries && entries.length > 0) {
      // elegir por fondo más cercano y primer tramo con maxLargo >= L
      const byFondo = entries
        .map(e => ({ e, df: isFinite(e.fondoMm) ? Math.abs(e.fondoMm - Fmm) : 0 }))
        .sort((a, b) => a.df - b.df)
        .map(x => x.e);
      for (const e of byFondo) {
        if (isFinite(e.maxLargoMm)) {
          if (Lmm <= e.maxLargoMm) return e.motor;
        }
      }
      // si no hay tramos con maxLargo, devolver el último motor declarado
      return byFondo[byFondo.length - 1]?.motor;
    }
  }
  // fallback a reglas estáticas
  return selectMotorForMonoblock(hoodModel, lengthMeters, depthMeters, isHomologada400);
}

// Selector de motor TEVEX para campanas Monoblock según largo (L) y fondo (F)
// Basado en tablas "LARGO - VENTILADOR" del catálogo (Óptima/Premium/Low, mural/central)
// Nota: Para longitudes que requieren doble ventilador (>= 3200 en central), devolvemos undefined

export function selectMotorForMonoblock(hoodModel: string, lengthMeters: number, depthMeters: number, isHomologada400?: boolean): string | undefined {
  const Lmm = Math.round(lengthMeters * 1000);
  const Fmm = Math.round(depthMeters * 1000);
  const isCentral = /central/i.test(hoodModel);

  // CENTRAL: patrones convergen en 10/10 1 T4/T6/T8/T10 y dobles a partir de ~2900-3200
  if (isCentral) {
    if (Lmm <= 1200) return "TMT 10/10 1 T4";
    if (Lmm <= 1700) return "TMT 10/10 1 T6";
    if (Lmm <= 2200) return "TMT 10/10 1 T8";
    if (Lmm <= 2700) return "TMT 10/10 1 T10";
    // 2900-3100 y superiores: pasan a 2 x 10/10 1T (no autoseleccionamos doble)
    return undefined;
  }

  // MURAL: usar reglas base por 9/9 y 10/10 en tramos
  if (isHomologada400) {
    if (Lmm <= 3000) return "TMI 400º/2H 9/9 3/4 CV (II)";
    return undefined;
  }
  if (Lmm <= 1000) return "TMI 9/9 1/3 CV (II)";
  if (Lmm <= 1500) return "TMI 9/9 1/2 CV (II)";
  if (Lmm <= 2500) return "TMI 9/9 3/4 CV (II)";
  if (Lmm <= 3000) return "TMI 10/10 1 CV (III)";
  return undefined;
}