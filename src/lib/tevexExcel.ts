export interface TevexExcelRow {
  modelo: string;
  tipo?: string;
  fondoMm?: number;
  largoMm?: number;
  ventilador?: string;
}

export interface TevexExcelMapping {
  // key: normalized model name (upper), values by fondo and threshold largo
  models: Record<string, Array<{ fondoMm: number; maxLargoMm: number; motor: string }>>;
}

function normalizeModelName(name: string): string {
  return name.trim().toUpperCase();
}

export async function loadTevexExcelMapping(possibleNames: string[] = [
  "/TARIFA TEVEX EXCEL 2024.xlsx",
  "/public/TARIFA TEVEX EXCEL 2024.xlsx",
]): Promise<TevexExcelMapping | undefined> {
  let buf: ArrayBuffer | null = null;
  for (const path of possibleNames) {
    try {
      const res = await fetch(path);
      if (res.ok) { buf = await res.arrayBuffer(); break; }
    } catch {}
  }
  if (!buf) return undefined;

  let XLSX: any;
  try {
    // dynamic import to avoid bundling if not used
    XLSX = await import("xlsx");
  } catch {
    return undefined;
  }
  try {
    const wb = XLSX.read(buf, { type: "array" });
    const mapping: TevexExcelMapping = { models: {} };
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: null });
      if (!Array.isArray(rows) || rows.length === 0) continue;
      // Try to find column names
      const header = Object.keys(rows[0]).map(String);
      const findKey = (needle: RegExp) => header.find(h => needle.test(h.toString().toLowerCase()));
      const kModelo = findKey(/modelo/);
      const kFondo = findKey(/fondo|profundidad/);
      const kLargo = findKey(/largo|longitud/);
      const kVent = findKey(/ventilador|motor/);
      if (!kModelo || !kVent) continue;
      for (const r of rows) {
        const modelo = (r[kModelo] ?? "").toString();
        if (!modelo) continue;
        const ventilador = (r[kVent] ?? "").toString();
        if (!ventilador) continue;
        const fondoMm = kFondo ? Number(String(r[kFondo]).replace(/[^0-9.]/g, "")) : NaN;
        const largoMm = kLargo ? Number(String(r[kLargo]).replace(/[^0-9.]/g, "")) : NaN;
        const key = normalizeModelName(modelo);
        if (!mapping.models[key]) mapping.models[key] = [];
        mapping.models[key].push({ fondoMm: Number.isFinite(fondoMm) ? fondoMm : NaN, maxLargoMm: Number.isFinite(largoMm) ? largoMm : NaN, motor: ventilador });
      }
    }
    // sort by fondo then maxLargo
    for (const k of Object.keys(mapping.models)) {
      mapping.models[k].sort((a, b) => (a.fondoMm - b.fondoMm) || (a.maxLargoMm - b.maxLargoMm));
    }
    return mapping;
  } catch {
    return undefined;
  }
}