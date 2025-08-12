import { z } from "zod";
import type { InputData } from "./hoodCalc";
import type { ElectroFilter } from "./electroFilters";

export const inputSchema = z.object({
  tipoCampana: z.enum(["mural", "central"]),
  L: z.number().min(0.5, { message: "L debe ser ≥ 0,5 m" }).max(5, { message: "L debe ser ≤ 5 m" }),
  F: z.number().min(0.5, { message: "F debe ser ≥ 0,5 m" }).max(5, { message: "F debe ser ≤ 5 m" }),
  alturaInstalacion: z
    .number()
    .min(0.5, { message: "Altura no válida" })
    .max(2.5, { message: "Altura no válida" }),
  tipoCocina: z.string().min(1),
  potenciaTermica: z.number().optional(),
  velocidadCaptura: z
    .number({ invalid_type_error: "El valor ingresado no es numérico." })
    .min(0.1, { message: "Vap debe ser ≥ 0,1 m/s" })
    .max(0.5, { message: "Vap debe ser ≤ 0,5 m/s" }),
  caudalDiseno: z.number().optional(),
  longitudConducto: z.number().min(0, { message: "Longitud ≥ 0" }).max(200, { message: "Longitud demasiado alta" }),
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
  nivelRuidoMax: z.number().optional(),
  supresionIncendios: z.boolean(),
  velocidadDucto: z
    .number({ invalid_type_error: "El valor ingresado no es numérico." })
    .min(5, { message: "Vd debe ser ≥ 5 m/s" })
    .max(15, { message: "Vd debe ser ≤ 15 m/s" }),
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

  // Altura recomendada según cocina
  const gas = data.tipoCocina.toLowerCase().includes("gas");
  const minH = gas ? 0.7 : 0.65;
  const maxH = gas ? 0.8 : 0.75;
  if (data.alturaInstalacion < minH || data.alturaInstalacion > maxH) {
    warnings.push(`Altura recomendada ${minH}–${maxH} m para ${data.tipoCocina}.`);
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
    // Caudal calculado con margen vs caudalMax del filtro
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

  return { fieldErrors, formErrors, warnings, qExceedsFilter, QpreMargin };
}