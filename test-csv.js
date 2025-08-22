import { loadTevexHoodsFromCsv } from './src/lib/tevexCsv.js';

async function testCsv() {
  try {
    console.log('Cargando CSV...');
    const data = await loadTevexHoodsFromCsv();
    console.log('Total entries:', data?.length || 0);
    
    if (data && data.length > 0) {
      console.log('\nPrimeras 5 entradas:');
      data.slice(0, 5).forEach((entry, i) => {
        console.log(`${i+1}. Modelo: '${entry.modelo}', Ancho: ${entry.anchoMm}, Fondo: ${entry.fondoMm}, Motor: '${entry.motor || 'N/A'}', M3H: ${entry.m3h || 'N/A'}`);
      });
      
      const monoblock = data.filter(e => /monoblock/i.test(e.modelo));
      console.log('\nEntradas Monoblock:', monoblock.length);
      if (monoblock.length > 0) {
        console.log('Primeras 5 Monoblock:');
        monoblock.slice(0, 5).forEach((entry, i) => {
          console.log(`${i+1}. Modelo: '${entry.modelo}', Ancho: ${entry.anchoMm}, Fondo: ${entry.fondoMm}, Motor: '${entry.motor || 'N/A'}', M3H: ${entry.m3h || 'N/A'}`);
        });
      }
      
      // Verificar modelos únicos
      const modelos = [...new Set(data.map(e => e.modelo))];
      console.log('\nModelos únicos encontrados:', modelos.length);
      console.log('Primeros 10 modelos:');
      modelos.slice(0, 10).forEach((modelo, i) => {
        console.log(`${i+1}. ${modelo}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testCsv();