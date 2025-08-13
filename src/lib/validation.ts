import { z } from "zod";
import type { InputData } from "./hoodCalc";
import type { ElectroFilter } from "./electroFilters";

export const inputSchema = z.object({
  tipoCampana: z.enum(["mural", "central"]),
  L: z.number().min(0.5, { message: "L debe ser ≥ 0,5 m" }).max(8, { message: "L debe ser ≤ 8 m" }),
  F: z.number().min(0.5, { message: "F debe ser ≥ 0,5 m" }).max(5, { message: "F debe ser ≤ 5 m" }),
  alturaInstalacion: z
    .number()
    .min(0.6, { message: "Altura no válida" })
    .max(2.5, { message: "Altura no válida" }),
  tipoCocina: z.string().min(1),
  potenciaTermica: z.number().optional(),
  velocidadCaptura: z
    .number({ invalid_type_error: "El valor ingresado no es numérico." })
    .min(0.1, { message: "Vap debe ser ≥ 0,1 m/s" })
    .max(0.7, { message: "Vap debe ser ≤ 0,7 m/s" }),
  caudalDiseno: z.number().optional(),
  longitudConducto: z.number().min(0, { message: "Longitud ≥ 0" }).max(500, { message: "Longitud demasiado alta" }),
  longitudHoriz: z.number().optional(),
  longitudVert: z.number().optional(),
  longitudTransicion: z.number().optional(),
  accesorios: z.object({
    codo90: z.number().min(0),
    codo45: z.number().min(0),
    transiciones: z.number().min(0),
    rejillas: z.number().min(0),
    compuertas: z.number().min(0),
  }),
  tipoConducto: z.enum(["circular", "rectangular"]),
  anchoRect: z.number().optional(),
  altoRect: z.number().optional(),
  lugarExpulsion: z.string().min(1),
  orientacionSalida: z.enum(["horizontal", "vertical"]).optional(),
  nivelRuidoMax: z.number().optional(),
  supresionIncendios: z.boolean(),
  velocidadDucto: z
    .number({ invalid_type_error: "El valor ingresado no es numérico." })
    .min(5, { message: "Vd debe ser ≥ 5 m/s" })
    .max(18, { message: "Vd debe ser ≤ 18 m/s" }),
  margenCaudalPct: z.number().min(0).max(50),
  friccionPaPorM: z.number().min(0.1).max(5),
  perdidaFiltrosPa: z.number().min(0),
  perdidaSalidaPa: z.number().min(0),
});

export interface ValidationResult {
  fieldErrors: Partial<Record<keyof InputData | string, string | undefined>>;
  formErrors: string[];
  warnings: string[];
  qExceedsFilter: boolean;
  QpreMargin?: number;
}

export function validateInput(
  data: InputData,
  opts?: { filtroOn?: boolean; filtro?: ElectroFilter | undefined; dpFiltroLimpio?: number; dirty?: boolean }
): ValidationResult {
  const parse = inputSchema.safeParse(data);
  const fieldErrors: ValidationResult["fieldErrors"] = {};
  const formErrors: string[] = [];
  const warnings: string[] = [];

  if (!parse.success) {
    for (const issue of parse.error.issues) {
      const path = issue.path.join(".");
      fieldErrors[path] = issue.message;
    }
  }

  // Altura recomendada industrial
  const minH = 0.9;
  const maxH = 1.2;
  if (data.alturaInstalacion < minH || data.alturaInstalacion > maxH) {
    warnings.push(`Altura recomendada sobre plano de cocción: ${minH}–${maxH} m (industrial).`);
  }

  // Rectangular requiere dimensiones
  if (data.tipoConducto === "rectangular") {
    if (data.anchoRect == null || data.altoRect == null || data.anchoRect <= 0 || data.altoRect <= 0) {
      fieldErrors["anchoRect"] = fieldErrors["anchoRect"] ?? "Requerido";
      fieldErrors["altoRect"] = fieldErrors["altoRect"] ?? "Requerido";
    }
  }

  // Caudal vs filtro
  let qExceedsFilter = false;
  let QpreMargin: number | undefined = undefined;
  if (opts?.filtroOn && opts?.filtro) {
    const perimetroLibre = data.tipoCampana === "mural" ? data.L + 2 * data.F : 2 * data.L + 2 * data.F;
    const Qbase = perimetroLibre * data.velocidadCaptura * 3600; // m3/h
    const Qsin = data.caudalDiseno && data.caudalDiseno > 0 ? data.caudalDiseno : Qbase;
    QpreMargin = Qsin * (1 + data.margenCaudalPct / 100);
    if (QpreMargin > opts.filtro.caudalMax) {
      qExceedsFilter = true;
      formErrors.push(
        `El caudal calculado (${Math.round(QpreMargin)} m³/h) supera el máximo del filtro seleccionado (${opts.filtro.caudalMax} m³/h).`
      );
    }
  }

  // Longitudes coherentes
  const sum = (data.longitudHoriz ?? 0) + (data.longitudVert ?? 0) + (data.longitudTransicion ?? 0);
  if (sum > 0 && Math.abs(sum - (data.longitudConducto || 0)) > 0.5) {
    warnings.push(`Longitud total por tramos (${sum.toFixed(1)} m) difiere de la total (${(data.longitudConducto||0).toFixed(1)} m). Se usará el desglose.`);
  }

  return { fieldErrors, formErrors, warnings, qExceedsFilter, QpreMargin };
}