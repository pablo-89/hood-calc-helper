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
  '/BSD-CAMP-CLEAN.csv',
  '/BSD-CAMP.csv',
  // Remote raw fallbacks (GitHub)
  'https://raw.githubusercontent.com/pablo-89/hood-calc-helper/main/public/BSD-CAMP-CLEAN.csv',
  'https://raw.githubusercontent.com/pablo-89/hood-calc-helper/main/public/BSD-CAMP.csv',
]): Promise<TevexHoodCsvEntry[] | undefined> {
  let txt: string | null = null;
  console.log('🔍 Intentando cargar CSV desde:', possibleNames);
  
  for (const path of possibleNames) {
    try {
      let res = await fetch(path);
      if (!res.ok) {
        const encoded = encodeURI(path);
        if (encoded !== path) {
          res = await fetch(encoded);
        }
      }
      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        const t = await res.text();
        const looksHtml = ct.includes('text/html') || /<html[\s\S]*>/i.test(t);
        if (looksHtml) {
          console.log('⚠️ Archivo HTML detectado, saltando:', path);
          continue;
        }
        // Ensure it has at least 2 non-empty lines
        const lines = t.split(/\r?\n/).filter(Boolean);
        if (lines.length >= 2) {
          txt = t;
          console.log('✅ CSV cargado exitosamente desde:', path, 'Líneas:', lines.length);
          break;
        }
      }
    } catch (e) {
      console.debug('❌ Error cargando CSV', path, e);
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
  const iFiltros = findIdx(c => c.includes('filtro'));
  const iMotor = findIdx(c => c.includes('motor') || c.includes('ventilador'));
  const allFondoIdxs = cols
    .map((c, idx) => ({ c, idx }))
    .filter(x => x.c.includes('fondo') || x.c.includes('profund') || x.c.includes('depth'))
    .map(x => x.idx);
  const allM3hIdxs = cols
    .map((c, idx) => ({ c, idx }))
    .filter(x => x.c.includes('m3/h') || x.c.includes('m3h') || x.c.includes('m3') || x.c.includes('caudal'))
    .map(x => x.idx);

  const out: TevexHoodCsvEntry[] = [];
  let debugCount = 0;
  
  for (const line of lines) {
    const parts = line.split(/[,;\t]/).map(s => s.trim());
    if (parts.length < 2) continue;
    // Avoid lines that look like HTML
    if (/<html[\s\S]*>/i.test(line)) continue;

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

    let modeloVal = iModelo >= 0 ? (parts[iModelo] || modeloPos) : (modeloPos || parts[0] || '');
    if (!modeloVal) continue;

    let anchoMm = iAncho >= 0 ? (parseNumberLike(parts[iAncho]) ?? parseNumberLike(anchoPos)) : (parseNumberLike(anchoPos));
    const filtros = iFiltros >= 0 ? (parseNumberLike(parts[iFiltros]) ?? parseNumberLike(filtrosPos)) : parseNumberLike(filtrosPos);
    const codigo = iCodigo >= 0 ? parts[iCodigo] : undefined;
    let motor = iMotor >= 0 ? parts[iMotor] : (motorPos || undefined);

    // Fallback para CSV fijo por espacios: detectar números de la línea
    if (!anchoMm || allFondoIdxs.length === 0) {
      const nums = line.match(/\d{3,5}/g) || [];
      if (nums.length >= 4) {
        const anchoToken = parseInt(nums[0], 10);
        if (Number.isFinite(anchoToken)) anchoMm = anchoToken;
        
        // Extraer modelo y motor de la parte antes del primer número
        const beforeAncho = line.split(String(anchoToken))[0]?.trim();
        if (beforeAncho) {
          // Buscar patrón de motor (ej: "9/9 1/3 cv", "9/9 1/2 cv", etc.)
          const motorMatch = beforeAncho.match(/(\d+\/\d+\s+\d+\/\d+\s+cv)/i);
          const extractedMotor = motorMatch ? motorMatch[1].trim() : undefined;
          
          // El modelo es todo lo que está antes del motor (o toda la línea si no hay motor)
          const modelText = motorMatch 
            ? beforeAncho.replace(motorMatch[0], '').trim()
            : beforeAncho;
          
          if (modelText) {
            modeloVal = modelText.replace(/\s+/g, ' ').trim();
          }
          
          // Usar el motor extraído si existe
          if (extractedMotor) {
            motor = extractedMotor;
          }
          
          // Debug para las primeras 5 líneas procesadas
          if (debugCount < 5 && modeloVal.includes('MONOBLOCK')) {
            console.log(`🔍 Debug línea ${debugCount + 1}:`, {
              linea: line.substring(0, 100) + '...',
              modeloVal,
              motor,
              anchoMm,
              beforeAncho: beforeAncho?.substring(0, 50) + '...'
            });
            debugCount++;
          }
        }
        
        for (let i = 1; i + 2 < nums.length; i += 3) {
          const nf = parseInt(nums[i], 10);
          const m3 = parseInt(nums[i + 1], 10);
          const fondo = parseInt(nums[i + 2], 10);
          if (Number.isFinite(anchoMm) && Number.isFinite(fondo)) {
            out.push({ 
              modelo: modeloVal, 
              codigo, 
              anchoMm: anchoMm!, 
              fondoMm: fondo, 
              filtros: Number.isFinite(nf) ? nf : undefined, 
              motor: motor || extractedMotor, 
              m3h: Number.isFinite(m3) ? m3 : undefined 
            });
          }
        }
        continue;
      }
    }

    // Fondos y M3/H: soportar múltiples grupos por fila (con cabeceras)
    if (allFondoIdxs.length > 0) {
      // M3/H por fila (asociado al ANCHO). Tomar primer M3/H numérico de la fila
      let rowM3h: number | undefined = undefined;
      for (const mi of allM3hIdxs) {
        const v = parseNumberLike(parts[mi]);
        if (Number.isFinite(v as any)) { rowM3h = v; break; }
      }
      // Generar una entrada por cada FONDO usando el mismo M3/H
      for (const fi of allFondoIdxs) {
        const fondoMm = parseNumberLike(parts[fi]);
        if (!anchoMm || !fondoMm) continue;
        out.push({ modelo: modeloVal, codigo, anchoMm, fondoMm, filtros, motor, m3h: rowM3h });
      }
    } else {
      // intentar extraer de los grupos E/I/M/Q (formato alternativo con fondo+referencia)
      const groups = [fondoRef1, fondoRef2, fondoRef3, fondoRef4].filter(Boolean);
      for (const g of groups) {
        const { fondoMm, referencia } = extractFondoYReferencia(g);
        if (anchoMm && fondoMm) out.push({ modelo: modeloVal, codigo, anchoMm, fondoMm, filtros, motor, referencia });
      }
    }
  }
  
  console.log(`📊 CSV procesado: ${out.length} entradas totales`);
  const monoblockEntries = out.filter(e => /monoblock/i.test(e.modelo));
  console.log(`🏭 Entradas Monoblock: ${monoblockEntries.length}`);
  if (monoblockEntries.length > 0) {
    console.log('🔧 Primeros 3 Monoblock:', monoblockEntries.slice(0, 3).map(e => ({
      modelo: e.modelo,
      ancho: e.anchoMm,
      fondo: e.fondoMm,
      motor: e.motor,
      m3h: e.m3h
    })));
  }
  
  return out;
}