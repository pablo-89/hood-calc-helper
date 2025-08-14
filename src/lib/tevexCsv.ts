export interface TevexHoodCsvEntry {
  modelo: string;
  codigo?: string;
  anchoMm: number;
  fondoMm: number;
  filtros?: number;
  motor?: string; // si Monoblock y definido según ancho
}

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function parseNumberLike(value: unknown): number | undefined {
  if (value == null) return undefined;
  const s = String(value).replace(/[^0-9.,]/g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
}

export async function loadTevexHoodsFromCsv(possibleNames: string[] = [
  '/TARIFA_TEVEX_2024.csv',
  '/TARIFA TEVEX 2024.csv',
  '/TEVEX_CAMPANAS.csv',
  '/campanas_tevex.csv',
  '/TARIFA TEVEX CAMPANAS.csv',
  '/public/TARIFA_TEVEX_2024.csv',
  '/public/TARIFA TEVEX 2024.csv',
  '/public/TEVEX_CAMPANAS.csv',
]): Promise<TevexHoodCsvEntry[] | undefined> {
  let txt: string | null = null;
  for (const path of possibleNames) {
    try {
      let res = await fetch(path);
      if (!res.ok) {
        const encoded = encodeURI(path);
        if (encoded !== path) {
          res = await fetch(encoded);
        }
      }
      if (res.ok) { txt = await res.text(); break; }
    } catch (e) {
      console.debug('CSV fetch error', path, e);
    }
  }
  if (!txt) return undefined;
  const lines = txt.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines.shift()!;
  const rawCols = header.split(/[,;\t]/).map(s => s.trim());
  const cols = rawCols.map(c => stripDiacritics(c.toLowerCase()));
  const findIdx = (pred: (c: string) => boolean) => cols.findIndex(pred);
  const contains = (frag: string) => (c: string) => c.includes(frag);
  const iModelo = findIdx(c => c.includes('modelo') || c.includes('campana') || c.includes('nombre'));
  const iCodigo = findIdx(c => c.includes('cod') || c.includes('ref'));
  const iAncho = findIdx(c => c.includes('ancho') || c.includes('largo') || c.includes('width'));
  const iFondo = findIdx(c => c.includes('fondo') || c.includes('profund') || c.includes('depth'));
  const iFiltros = findIdx(c => c.includes('filtro'));
  const iMotor = findIdx(c => c.includes('motor') || c.includes('ventilador'));

  const out: TevexHoodCsvEntry[] = [];
  for (const line of lines) {
    const parts = line.split(/[,;\t]/).map(s => s.trim());
    const modelo = iModelo >= 0 ? parts[iModelo] : (parts[0] || '');
    if (!modelo) continue;
    const codigo = iCodigo >= 0 ? parts[iCodigo] : undefined;
    const anchoMm = iAncho >= 0 ? parseNumberLike(parts[iAncho]) : undefined;
    const fondoMm = iFondo >= 0 ? parseNumberLike(parts[iFondo]) : undefined;
    const filtros = iFiltros >= 0 ? parseNumberLike(parts[iFiltros]) : undefined;
    const motor = iMotor >= 0 ? parts[iMotor] : undefined;
    if (!anchoMm || !fondoMm) continue;
    out.push({ modelo, codigo, anchoMm, fondoMm, filtros: filtros ?? undefined, motor: motor && motor.length ? motor : undefined });
  }
  return out;
}