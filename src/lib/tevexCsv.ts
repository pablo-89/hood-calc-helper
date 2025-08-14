export interface TevexHoodCsvEntry {
  modelo: string;
  codigo?: string;
  anchoMm: number;
  fondoMm: number;
  filtros?: number;
  motor?: string; // si Monoblock y definido según ancho
}

function parseNumberLike(value: any): number | undefined {
  if (value == null) return undefined;
  const s = String(value).replace(/[^0-9.,]/g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
}

export async function loadTevexHoodsFromCsv(possibleNames: string[] = [
  '/TARIFA TEVEX 2024.csv',
  '/TEVEX_CAMPANAS.csv',
  '/campanas_tevex.csv',
  '/TARIFA TEVEX CAMPANAS.csv',
  '/public/TARIFA TEVEX 2024.csv',
  '/public/TEVEX_CAMPANAS.csv',
]): Promise<TevexHoodCsvEntry[] | undefined> {
  let txt: string | null = null;
  for (const path of possibleNames) {
    try {
      const res = await fetch(path);
      if (res.ok) { txt = await res.text(); break; }
    } catch {}
  }
  if (!txt) return undefined;
  const lines = txt.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines.shift()!;
  const cols = header.split(/[,;\t]/).map(s => s.trim().toLowerCase());
  const idx = (nameRe: RegExp) => cols.findIndex(c => nameRe.test(c));
  const iModelo = idx(/modelo/);
  const iCodigo = idx(/cod|ref/);
  const iAncho = idx(/ancho|largo|width/);
  const iFondo = idx(/fondo|profundidad|depth/);
  const iFiltros = idx(/filtro/);
  const iMotor = idx(/motor|ventilador/);
  const out: TevexHoodCsvEntry[] = [];
  for (const line of lines) {
    const parts = line.split(/[,;\t]/).map(s => s.trim());
    const modelo = iModelo >= 0 ? parts[iModelo] : '';
    if (!modelo) continue;
    const codigo = iCodigo >= 0 ? parts[iCodigo] : undefined;
    const anchoMm = iAncho >= 0 ? parseNumberLike(parts[iAncho]) : undefined;
    const fondoMm = iFondo >= 0 ? parseNumberLike(parts[iFondo]) : undefined;
    const filtros = iFiltros >= 0 ? parseNumberLike(parts[iFiltros]) : undefined;
    const motor = iMotor >= 0 ? parts[iMotor] : undefined;
    if (!anchoMm || !fondoMm) continue;
    out.push({ modelo, codigo, anchoMm, fondoMm, filtros: filtros ?? undefined, motor: motor?.length ? motor : undefined });
  }
  return out;
}