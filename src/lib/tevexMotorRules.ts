// Selector de motor TEVEX para campanas Monoblock según largo (L) y fondo (F)
// Basado en tablas "LARGO - VENTILADOR" de Óptima Monoblock mural (F 800/1000/1200)
// Nota: Para longitudes que requieren doble ventilador (>= 3200), devolvemos undefined por ahora

export function selectMotorForMonoblock(hoodModel: string, lengthMeters: number, depthMeters: number, isHomologada400?: boolean): string | undefined {
  const Lmm = Math.round(lengthMeters * 1000);
  const Fmm = Math.round(depthMeters * 1000);
  // Normalizar fondo a 800/1000/1200
  const fondos = [800, 1000, 1200];
  const fondo = fondos.reduce((prev, curr) => Math.abs(curr - Fmm) < Math.abs(prev - Fmm) ? curr : prev, 800);

  // Si es versión 400º/2H (Monoblock 400º), la tabla muestra siempre 9/9 3/4 CV hasta 3000 mm
  if (isHomologada400) {
    if (Lmm <= 3000) return "TMI 400º/2H 9/9 3/4 CV (II)";
    return undefined; // requeriría doble ventilador
  }

  // Reglas base para Óptima/Premium/Low/Invertida Monoblock estándar (no 400º)
  // Elegimos el ventilador de mayor CV listado para ese largo (según F800/F1000/F1200, patrones muy similares)
  if (Lmm <= 1000) return "TMI 9/9 1/3 CV (II)";
  if (Lmm <= 1500) return "TMI 9/9 1/2 CV (II)";
  if (Lmm <= 2500) return "TMI 9/9 3/4 CV (II)";
  if (Lmm <= 3000) return "TMI 10/10 1 CV (III)";
  return undefined; // a partir de 3200 mm suele requerir 2x 9/9
}