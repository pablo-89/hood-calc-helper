export interface TevexHoodCsvEntry {
  modelo: string;
  codigo?: string;
  anchoMm: number;
  fondoMm: number;
  filtros?: number;
  motor?: string;
  m3h?: number;
  referencia?: string;
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

function extractFondoYReferencia(raw: unknown): { fondoMm?: number; referencia?: string } {
  if (raw == null) return {};
  const s = String(raw).trim();
  if (!s) return {};
  const numMatch = s.match(/(\d{2,4})/); // primera cifra (mm)
  const fondoMm = numMatch ? parseInt(numMatch[1], 10) : undefined;
  // referencia: quitar el número y separadores obvios
  const referencia = s.replace(numMatch ? numMatch[1] : '', '').replace(/[:\-–•]/g, '').trim();
  return { fondoMm, referencia: referencia || undefined };
}

export async function loadTevexHoodsFromCsv(possibleNames: string[] = [
  '/BSD-CAMP.CSV',
  '/bsd-camp.csv',
  '/BSD-CAMP-CLEAN.csv',
  '/bsd-camp-clean.csv',
  '/TARIFA_TEVEX_2024.csv',
  '/TARIFA TEVEX 2024.csv',
  '/TEVEX_CAMPANAS.csv',
  '/campanas_tevex.csv',
  '/TARIFA TEVEX CAMPANAS.csv',
  '/public/BSD-CAMP.CSV',
  '/public/bsd-camp.csv',
  '/public/BSD-CAMP-CLEAN.csv',
  '/public/bsd-camp-clean.csv',
  '/public/TARIFA_TEVEX_2024.csv',
  '/public/TARIFA TEVEX 2024.csv',
  '/public/TEVEX_CAMPANAS.csv',
  // Remote raw fallbacks
  'https://raw.githubusercontent.com/pablo-89/hood-calc-helper/main/public/BSD-CAMP-CLEAN.csv',
  'https://raw.githubusercontent.com/pablo-89/hood-calc-helper/main/public/BSD-CAMP.csv',
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
  const iModelo = findIdx(c => c.includes('modelo') || c.includes('campana') || c.includes('nombre'));
  const iCodigo = findIdx(c => c.includes('cod') || c.includes('ref'));
  const iAncho = findIdx(c => c.includes('ancho') || c.includes('largo') || c.includes('width'));
  const iFondo = findIdx(c => c.includes('fondo') || c.includes('profund') || c.includes('depth'));
  const iFiltros = findIdx(c => c.includes('filtro'));
  const iMotor = findIdx(c => c.includes('motor') || c.includes('ventilador'));
  const iM3h = findIdx(c => c.includes('m3/h') || c.includes('m3h') || c.includes('m3') || c.includes('caudal'));

  const out: TevexHoodCsvEntry[] = [];
  for (const line of lines) {
    const parts = line.split(/[,;\t]/).map(s => s.trim());

    // Fallback por posiciones (A,B,C,D,E,F,I,J,M,N,Q,R) si faltan cabeceras
    const modeloPos = parts[0] || undefined; // A
    const motorPos = parts[1] || undefined; // B
    const anchoPos = parts[2] || undefined; // C
    const filtrosPos = parts[3] || undefined; // D
    const fondoRef1 = parts[4] || undefined; // E
    const precio1 = parts[5] || undefined; // F (no usado)
    const fondoRef2 = parts[8] || undefined; // I
    const precio2 = parts[9] || undefined; // J (no usado)
    const fondoRef3 = parts[12] || undefined; // M
    const precio3 = parts[13] || undefined; // N (no usado)
    const fondoRef4 = parts[16] || undefined; // Q
    const precio4 = parts[17] || undefined; // R (no usado)

    const modeloVal = iModelo >= 0 ? (parts[iModelo] || modeloPos) : (modeloPos || parts[0] || '');
    if (!modeloVal) continue;

    const anchoMm = iAncho >= 0 ? (parseNumberLike(parts[iAncho]) ?? parseNumberLike(anchoPos)) : (parseNumberLike(anchoPos));
    const filtros = iFiltros >= 0 ? (parseNumberLike(parts[iFiltros]) ?? parseNumberLike(filtrosPos)) : parseNumberLike(filtrosPos);
    const codigo = iCodigo >= 0 ? parts[iCodigo] : undefined;
    const motor = iMotor >= 0 ? parts[iMotor] : (motorPos || undefined);
    const m3h = iM3h >= 0 ? parseNumberLike(parts[iM3h]) : undefined;

    // Fondos: cabecera estándar o múltiples por posiciones
    if (iFondo >= 0) {
      const fondoMm = parseNumberLike(parts[iFondo]);
      if (anchoMm && fondoMm) out.push({ modelo: modeloVal, codigo, anchoMm, fondoMm, filtros, motor, m3h });
    } else {
      // intentar extraer de los grupos E/I/M/Q
      const groups = [fondoRef1, fondoRef2, fondoRef3, fondoRef4].filter(Boolean);
      for (const g of groups) {
        const { fondoMm, referencia } = extractFondoYReferencia(g);
        if (anchoMm && fondoMm) out.push({ modelo: modeloVal, codigo, anchoMm, fondoMm, filtros, motor, m3h, referencia });
      }
    }
  }
  return out;
}