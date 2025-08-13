// Selector de motor TEVEX para campanas Monoblock según largo (L) y fondo (F)
// Basado en tablas "LARGO - VENTILADOR" del catálogo (Óptima/Premium/Low, mural/central)
// Nota: Para longitudes que requieren doble ventilador (>= 3200 en central), devolvemos undefined

export function selectMotorForMonoblock(hoodModel: string, lengthMeters: number, depthMeters: number, isHomologada400?: boolean): string | undefined {
  const Lmm = Math.round(lengthMeters * 1000);
  const Fmm = Math.round(depthMeters * 1000);
  const isCentral = /central/i.test(hoodModel);

  // CENTRAL: patrones convergen en 10/10 1 T4/T6/T8/T10 y dobles a partir de ~2900-3200
  if (isCentral) {
    if (Lmm <= 1200) return "TMT 10/10 1 T4";
    if (Lmm <= 1700) return "TMT 10/10 1 T6";
    if (Lmm <= 2200) return "TMT 10/10 1 T8";
    if (Lmm <= 2700) return "TMT 10/10 1 T10";
    // 2900-3100 y superiores: pasan a 2 x 10/10 1T (no autoseleccionamos doble)
    return undefined;
  }

  // MURAL: usar reglas base por 9/9 y 10/10 en tramos
  if (isHomologada400) {
    if (Lmm <= 3000) return "TMI 400º/2H 9/9 3/4 CV (II)";
    return undefined;
  }
  if (Lmm <= 1000) return "TMI 9/9 1/3 CV (II)";
  if (Lmm <= 1500) return "TMI 9/9 1/2 CV (II)";
  if (Lmm <= 2500) return "TMI 9/9 3/4 CV (II)";
  if (Lmm <= 3000) return "TMI 10/10 1 CV (III)";
  return undefined;
}