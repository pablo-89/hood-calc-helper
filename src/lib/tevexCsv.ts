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
  
  if (!txt) {
    console.log('❌ No se pudo cargar ningún CSV');
    return undefined;
  }
  
  const lines = txt.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  
  const out: TevexHoodCsvEntry[] = [];
  let debugCount = 0;
  
  for (const line of lines) {
    // Saltar líneas que son headers o vacías
    if (line.trim().length < 10) continue;
    if (/MODELO|ANCHO|FONDO|FILTROS|M3\/H/i.test(line)) continue;
    if (/<html[\s\S]*>/i.test(line)) continue;
    
    // Buscar líneas que contienen modelos de campanas
    const modelMatch = line.match(/^\s*(CAMPANA\s+[^0-9]+?)(\s+\d+\/\d+\s+\d+\/\d+\s+cv)?\s+(\d{3,5})/i);
    
    if (modelMatch) {
      const modeloCompleto = modelMatch[1].trim();
      const motorInfo = modelMatch[2] ? modelMatch[2].trim() : undefined;
      const primerAncho = parseInt(modelMatch[3], 10);
      
      if (debugCount < 5) {
        console.log(`🔍 Debug línea ${debugCount + 1}:`, {
          linea: line.substring(0, 100) + '...',
          modeloCompleto,
          motorInfo,
          primerAncho
        });
        debugCount++;
      }
      
      // Extraer todos los números de la línea (anchos, filtros, m3h, fondos)
      const nums = line.match(/\d{3,5}/g) || [];
      if (nums.length >= 4) {
        const anchoMm = parseInt(nums[0], 10);
        
        // Procesar grupos de datos (filtros, m3h, fondo) en grupos de 3
        for (let i = 1; i + 2 < nums.length; i += 3) {
          const filtros = parseInt(nums[i], 10);
          const m3h = parseInt(nums[i + 1], 10);
          const fondoMm = parseInt(nums[i + 2], 10);
          
          if (Number.isFinite(anchoMm) && Number.isFinite(fondoMm)) {
            out.push({
              modelo: modeloCompleto,
              anchoMm,
              fondoMm,
              filtros: Number.isFinite(filtros) ? filtros : undefined,
              m3h: Number.isFinite(m3h) ? m3h : undefined,
              motor: motorInfo
            });
          }
        }
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