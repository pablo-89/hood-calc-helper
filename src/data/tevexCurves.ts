import { FanCurvePoint } from "@/data/fans";

// Curvas reales para modelos TEVEX concretos (si están disponibles)
// La clave debe coincidir EXACTAMENTE con el texto del selector TEVEX (p.ej. "TMT 9/9", "TMT4 10/10 400º/2H", "TSO 400º/2H 30/14", "TMI 12/12 1 CV (II)")
export const TEVEX_CURVES: Record<string, FanCurvePoint[]> = {
  // Ejemplos (rellenar con datos reales Q (m3/h) - dp (Pa) cuando estén disponibles)
  // "TSO 400º/2H 30/14": [
  //   { Q: 3000, dp: 800 },
  //   { Q: 4000, dp: 720 },
  //   { Q: 5000, dp: 640 },
  //   { Q: 6000, dp: 560 },
  //   { Q: 7000, dp: 480 },
  // ],
};