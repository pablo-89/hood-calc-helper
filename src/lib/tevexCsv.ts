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
  if (!s) return "";
  // Primero normalizar caracteres Unicode
  let base = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Reemplazar caracteres problemáticos del CSV (caracteres de reemplazo Unicode)
  base = base
    .replace(/\uFFFD/g, 'O') // Carácter de reemplazo por O (ÓPTIMA -> OPTIMA)
    .replace(/[]/g, 'A') // Carácter corrupto por A
    .replace(/[]/g, 'E') // Carácter corrupto por E
    .replace(/[]/g, 'I') // Carácter corrupto por I
    .replace(/[]/g, 'O') // Carácter corrupto por O
    .replace(/[]/g, 'U') // Carácter corrupto por U
    .replace(/[]/g, 'N') // Carácter corrupto por N
    .replace(/[]/g, 'A') // Carácter corrupto por A
    .replace(/[]/g, 'E') // Carácter corrupto por E
    .replace(/[]/g, 'I') // Carácter corrupto por I
    .replace(/[]/g, 'O') // Carácter corrupto por O
    .replace(/[]/g, 'U') // Carácter corrupto por U
    .replace(/[]/g, 'N'); // Carácter corrupto por N
  // Ser menos agresivo con la limpieza final - mantener más caracteres
  return base.toUpperCase()
    .replace(/[^A-Z0-9/\-\. ]/g, '') // Mantener guiones y puntos
    .replace(/\s+/g, ' ')
    .trim();
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
  console.log('=== CSV LOADER DEBUG ===');
  console.log('Trying paths:', possibleNames);
  
  let txt: string | null = null;
  for (const path of possibleNames) {
    try {
      console.log('Trying path:', path);
      let res = await fetch(path);
      console.log('Response status:', res.status, res.statusText);
      console.log('Response headers:', Object.fromEntries(res.headers.entries()));
      
      if (!res.ok) {
        console.log('Response not OK, trying encoded...');
        const encoded = encodeURI(path);
        if (encoded !== path) {
          res = await fetch(encoded);
          console.log('Encoded response status:', res.status, res.statusText);
        }
      }
      
      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        console.log('Content-Type:', ct);
        const t = await res.text();
        console.log('Response text length:', t.length);
        console.log('First 200 chars:', t.substring(0, 200));
        
        const looksHtml = ct.includes('text/html') || /<html[\s\S]*>/i.test(t);
        if (looksHtml) {
          console.log('Looks like HTML, skipping...');
          continue;
        }
        
        // Ensure it has at least 2 non-empty lines
        const lines = t.split(/\r?\n/).filter(Boolean);
        console.log('Lines count:', lines.length);
        if (lines.length >= 2) {
          txt = t;
          console.log('CSV content loaded successfully');
          break;
        } else {
          console.log('Not enough lines, skipping...');
        }
      }
    } catch (e) {
      console.error('CSV fetch error for path:', path, e);
    }
  }
  
  if (!txt) {
    console.log('No CSV content found');
    return undefined;
  }
  
  console.log('Processing CSV content...');
  const lines = txt.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) {
    console.log('No lines to process');
    return [];
  }
  
  // El CSV tiene formato de tabla con espacios fijos, no separadores CSV estándar
  // Vamos a parsear línea por línea extrayendo los campos por posición
  console.log('Parsing fixed-width format...');
  
  const out: TevexHoodCsvEntry[] = [];
  for (const line of lines) {
    // Skip header lines and empty lines
    if (line.trim().length === 0 || line.includes('MODELO') || line.includes('ANCHO') || line.includes('FILTROS')) {
      continue;
    }
    
    // Skip lines that look like HTML or are too short
    if (/<html[\s\S]*>/i.test(line) || line.length < 20) {
      continue;
    }
    
    try {
      // Parse fixed-width format based on the structure we saw
      // Ajustando posiciones basándome en los logs de debug
      const modelo = line.substring(0, 50).trim();
      const anchoStr = line.substring(50, 80).trim();
      const filtrosStr = line.substring(80, 100).trim();
      const m3hStr = line.substring(100, 130).trim(); // Ajustado: más ancho para capturar M3/H
      const fondoStr = line.substring(130, 160).trim(); // Ajustado: más ancho para capturar FONDO
      
      // Debug: log first few lines to see what we're getting
      if (out.length < 3) {
        console.log('Parsing line:', line.substring(0, 150));
        console.log('  modelo:', `"${modelo}"`);
        console.log('  anchoStr:', `"${anchoStr}"`);
        console.log('  filtrosStr:', `"${filtrosStr}"`);
        console.log('  m3hStr:', `"${m3hStr}"`);
        console.log('  fondoStr:', `"${fondoStr}"`);
      }
      
      // Skip if no modelo or if it's just whitespace
      if (!modelo || modelo.length === 0 || /^\s*$/.test(modelo)) {
        continue;
      }
      
      // Parse numbers
      const anchoMm = parseNumberLike(anchoStr);
      const filtros = parseNumberLike(filtrosStr);
      const m3h = parseNumberLike(m3hStr);
      const fondoMm = parseNumberLike(fondoStr);
      
      // Debug: log parsed numbers
      if (out.length < 3) {
        console.log('  parsed anchoMm:', anchoMm);
        console.log('  parsed filtros:', filtros);
        console.log('  parsed m3h:', m3h);
        console.log('  parsed fondoMm:', fondoMm);
      }
      
      // Only add if we have valid dimensions
      if (anchoMm && fondoMm) {
        out.push({
          modelo: modelo.replace(/\s+/g, ' ').trim(),
          anchoMm,
          fondoMm,
          filtros,
          m3h
        });
      }
    } catch (e) {
      console.log('Error parsing line:', line.substring(0, 100), e);
      continue;
    }
  }
  
  console.log('Parsed entries:', out.length);
  if (out.length > 0) {
    console.log('Sample parsed entry:', out[0]);
  }
  
  return out;
}