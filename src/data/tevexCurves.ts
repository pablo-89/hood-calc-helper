import { FanCurvePoint } from "@/data/fans";

// Curvas reales para modelos TEVEX concretos (si están disponibles)
// La clave debe coincidir EXACTAMENTE con el texto del selector TEVEX (p.ej. "TMT 9/9", "TMT4 LUX 10/10", "TSO 400º/2H 30/14", "TMI4 400º/2H 10/10")
export const TEVEX_CURVES: Record<string, FanCurvePoint[]> = {
  // Rellenar con datos reales Q (m3/h) - dp (Pa) cuando estén disponibles
};

// Genera una clave canónica a partir del nombre mostrado en los selectores
// Mapea cajas/ventiladores a familia + tamaño
export function normalizeCurveKey(sourceName: string): string | undefined {
  const s = sourceName.trim();
  const upper = s.toUpperCase();
  // Patron tamaño A/B (p.ej. 9/9, 10/10, 30/14)
  const size = upper.match(/(\d{1,2}\/\d{1,2})/);
  const sizeStr = size ? size[1] : undefined;

  // TMT4 LUX
  if (/TMT4/.test(upper) || /TMT\s?4\s?LUX/.test(upper)) {
    return sizeStr ? `TMT4 LUX ${sizeStr}` : undefined;
  }
  // TMT
  if (/\bTMT\b/.test(upper)) {
    return sizeStr ? `TMT ${sizeStr}` : undefined;
  }
  // TSO 400º/2H
  if (/\bTSO\b/.test(upper)) {
    return sizeStr ? `TSO 400º/2H ${sizeStr}` : undefined;
  }
  // TMI4 400º/2H
  if (/\bTMI4\b/.test(upper)) {
    return sizeStr ? `TMI4 400º/2H ${sizeStr}` : undefined;
  }
  // TMI 400º (no caja, motor integrado)
  if (/TMI\s?400/.test(upper)) {
    return sizeStr ? `TMI4 400º/2H ${sizeStr}` : undefined;
  }
  // TSOR: si en un futuro hay CSVs
  if (/\bTSOR\b/.test(upper)) {
    return sizeStr ? `TSOR ${sizeStr}` : undefined;
  }
  // Motor/caja con texto "Caja <familia> ..." -> reutilizar detecciones previas
  if (/^CAJA\s+TMT4/.test(upper)) return sizeStr ? `TMT4 LUX ${sizeStr}` : undefined;
  if (/^CAJA\s+TMT\b/.test(upper)) return sizeStr ? `TMT ${sizeStr}` : undefined;
  if (/^CAJA\s+TSO/.test(upper)) return sizeStr ? `TSO 400º/2H ${sizeStr}` : undefined;
  if (/^CAJA\s+TMI4/.test(upper)) return sizeStr ? `TMI4 400º/2H ${sizeStr}` : undefined;

  // Como último recurso, si el texto ya parece canónico
  if (/^(TMT4 LUX|TMT|TSO 400º\/2H|TMI4 400º\/2H)\s+\d{1,2}\/\d{1,2}$/i.test(s)) return s;
  return undefined;
}