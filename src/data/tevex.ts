export interface TevexHood {
  modelo: string;
  tipo: "mural" | "central";
  LdefaultM: number;
  FdefaultM: number;
  motorIncluidoModelo?: string; // si el modelo viene con motor
}

export interface TevexFan {
  modelo: string;
  referencia?: string;
}

export interface TevexCaja {
  modelo: string;
}

// Valores por defecto razonables si no hay ficha (se ajustarán con el catálogo detallado)
const DEF_L_MURAL = 2.0;
const DEF_F_MURAL = 1.1;
const DEF_L_CENTRAL = 2.0;
const DEF_F_CENTRAL = 1.2;

export const TEVEX_HOODS: TevexHood[] = [
  // Óptima
  { modelo: "Óptima básica mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },
  { modelo: "Óptima básica central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL },
  { modelo: "Óptima integral mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },
  { modelo: "Óptima integral central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL },
  { modelo: "Óptima compensada mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },
  { modelo: "Óptima compensada central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL },
  { modelo: "Óptima Monoblock mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL, motorIncluidoModelo: "TMI" },
  { modelo: "Óptima Monoblock central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL, motorIncluidoModelo: "TMI" },

  // Premium
  { modelo: "Premium básica mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },
  { modelo: "Premium básica central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL },
  { modelo: "Premium integral mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },
  { modelo: "Premium integral central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL },
  { modelo: "Premium compensada mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },
  { modelo: "Premium compensada central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL },
  { modelo: "Premium Monoblock mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL, motorIncluidoModelo: "TMI" },
  { modelo: "Premium Monoblock central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL, motorIncluidoModelo: "TMI" },
  { modelo: "Premium Inductora mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },
  { modelo: "Premium Inductora central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL },

  // Invertida
  { modelo: "Invertida básica mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },
  { modelo: "Invertida integral mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },
  { modelo: "Invertida compensada mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },
  { modelo: "Invertida Monoblock mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL, motorIncluidoModelo: "TMI" },

  // Low
  { modelo: "Low básica mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },
  { modelo: "Low básica central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL },
  { modelo: "Low integral mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },
  { modelo: "Low integral central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL },
  { modelo: "Low compensada mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },
  { modelo: "Low compensada central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL },
  { modelo: "Low Monoblock mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL, motorIncluidoModelo: "TMI" },
  { modelo: "Low Monoblock central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL, motorIncluidoModelo: "TMI" },

  // Perimetral (según índice aparecen referencias central)
  { modelo: "Perimetral básica central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL },
  { modelo: "Perimetral integral central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL },
  { modelo: "Perimetral compensada central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL },

  // Vahos
  { modelo: "Vahos", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },
];

export const TEVEX_FANS: TevexFan[] = [
  // TMI estándar
  { modelo: "TMI 7/7 1/5 CV (II)" },
  { modelo: "TMI 9/9 1/3 CV (II)" },
  { modelo: "TMI 9/9 1/2 CV (II)" },
  { modelo: "TMI 9/9 3/4 CV (II)" },
  { modelo: "TMI 10/10 1/3 CV (II)" },
  { modelo: "TMI 10/10 1/2 CV (II)" },
  { modelo: "TMI 10/10 3/4 CV (II 4P)" },
  { modelo: "TMI 10/10 3/4 CV (II 6P)" },
  { modelo: "TMI 10/10 1 CV (III)" },
  { modelo: "TMI 12/12 1 CV (II)" },
  { modelo: "TMI 12/12 1,5 CV (III T)" },
  { modelo: "TMI 12/12 1,5 CV (II M)" },

  // TMT a transmisión
  { modelo: "TMT 9/9" },
  { modelo: "TMT 10/10" },
  { modelo: "TMT 12/12" },
  { modelo: "TMT 15/15" },
  { modelo: "TMT 18/18" },

  // TMI 400º/2H
  { modelo: "TMI 400º/2H 9/9 3/4 CV (II)" },
  { modelo: "TMI 400º/2H 9/9 3/4 CV (III)" },
  { modelo: "TMI 400º/2H 10/10 3/4 CV (II)" },
  { modelo: "TMI 400º/2H 10/10 3/4 CV (III)" },

  // TMT4 400º/2H
  { modelo: "TMT4 9/9 400º/2H" },
  { modelo: "TMT4 10/10 400º/2H" },
  { modelo: "TMT4 12/12 400º/2H" },
  { modelo: "TMT4 15/15 400º/2H" },
  { modelo: "TMT4 18/18 400º/2H" },

  // TSO 400º/2H (simple aspiración)
  { modelo: "TSO 400º/2H 10/5" },
  { modelo: "TSO 400º/2H 12/6" },
  { modelo: "TSO 400º/2H 15/7" },
  { modelo: "TSO 400º/2H 18/9" },
  { modelo: "TSO 400º/2H 20/10" },
  { modelo: "TSO 400º/2H 22/11" },
  { modelo: "TSO 400º/2H 25/12" },
  { modelo: "TSO 400º/2H 30/14" },

  // TSOR a transmisión
  { modelo: "TSOR 200" },
  { modelo: "TSOR 225" },
  { modelo: "TSOR 250" },
  { modelo: "TSOR 280" },
  { modelo: "TSOR 315" },
  { modelo: "TSOR 355" },
  { modelo: "TSOR 400" },
  { modelo: "TSOR 450" },
  { modelo: "TSOR 500" },
  { modelo: "TSOR 560" },
  { modelo: "TSOR 630" },
];

export const TEVEX_CAJAS: TevexCaja[] = [
  // Cajas TMT
  { modelo: "Caja TMT 9/9 3/4 CV" },
  { modelo: "Caja TMT 9/9 1 CV" },
  { modelo: "Caja TMT 9/9 1,5 CV" },
  { modelo: "Caja TMT 9/9 2 CV" },
  { modelo: "Caja TMT 9/9 3 CV" },
  { modelo: "Caja TMT 10/10 3/4 CV" },
  { modelo: "Caja TMT 10/10 1 CV" },
  { modelo: "Caja TMT 10/10 1,5 CV" },
  { modelo: "Caja TMT 10/10 2 CV" },
  { modelo: "Caja TMT 10/10 3 CV" },
  { modelo: "Caja TMT 12/12 1 CV" },
  { modelo: "Caja TMT 12/12 1,5 CV" },
  { modelo: "Caja TMT 12/12 2 CV" },
  { modelo: "Caja TMT 12/12 3 CV" },
  { modelo: "Caja TMT 12/12 4 CV" },
  { modelo: "Caja TMT 15/15 1,5 CV" },
  { modelo: "Caja TMT 15/15 2 CV" },
  { modelo: "Caja TMT 15/15 3 CV" },
  { modelo: "Caja TMT 15/15 4 CV" },
  { modelo: "Caja TMT 18/18 2 CV" },
  { modelo: "Caja TMT 18/18 3 CV" },
  { modelo: "Caja TMT 18/18 4 CV" },
  { modelo: "Caja TMT 18/18 5,5 CV" },
  { modelo: "Caja TMT 18/18 7,5 CV" },

  // Cajas TMT Gran Caudal (GC)
  { modelo: "Caja TMT GC 20/20 4 CV" },
  { modelo: "Caja TMT GC 20/20 5,5 CV" },
  { modelo: "Caja TMT GC 20/20 7,5 CV" },
  { modelo: "Caja TMT GC 20/20 10 CV" },
  { modelo: "Caja TMT GC 22/22 5,5 CV" },
  { modelo: "Caja TMT GC 22/22 7,5 CV" },
  { modelo: "Caja TMT GC 22/22 10 CV" },
  { modelo: "Caja TMT GC 22/22 15 CV" },
  { modelo: "Caja TMT GC 25/25 5,5 CV" },
  { modelo: "Caja TMT GC 25/25 7,5 CV" },
  { modelo: "Caja TMT GC 25/25 10 CV" },
  { modelo: "Caja TMT GC 25/25 15 CV" },
  { modelo: "Caja TMT GC 30/28 7,5 CV" },
  { modelo: "Caja TMT GC 30/28 10 CV" },
  { modelo: "Caja TMT GC 30/28 15 CV" },
  { modelo: "Caja TMT GC 30/28 20 CV" },

  // Cajas TMI4 400º/2H
  { modelo: "Caja TMI4 9/9 3/4 CV (III)" },
  { modelo: "Caja TMI4 9/9 3/4 CV (II)" },
  { modelo: "Caja TMI4 10/10 3/4 CV (III)" },
  { modelo: "Caja TMI4 10/10 3/4 CV (II)" },

  // Cajas TMI
  { modelo: "Caja TMI 7/7 1/5 CV" },
  { modelo: "Caja TMI 9/9 1/3 CV" },
  { modelo: "Caja TMI 9/9 1/2 CV" },
  { modelo: "Caja TMI 9/9 3/4 CV" },
  { modelo: "Caja TMI 10/10 1/3 CV" },
  { modelo: "Caja TMI 10/10 1/2 CV" },
  { modelo: "Caja TMI 10/10 3/4 CV" },
  { modelo: "Caja TMI 10/10 1 CV (III)" },
  { modelo: "Caja TMI 12/12 1 CV" },
  { modelo: "Caja TMI 12/12 1,5 CV (III)" },
  { modelo: "Caja TMI 12/12 1,5 CV" },

  // Cajas TMI Filtro Aspiración
  { modelo: "Caja TMI Filtro Aspiración 7/7 1/5 CV" },
  { modelo: "Caja TMI Filtro Aspiración 9/9 1/3 CV" },
  { modelo: "Caja TMI Filtro Aspiración 9/9 1/2 CV" },
  { modelo: "Caja TMI Filtro Aspiración 9/9 3/4 CV" },
  { modelo: "Caja TMI Filtro Aspiración 10/10 1/3 CV" },
  { modelo: "Caja TMI Filtro Aspiración 10/10 1/2 CV" },
  { modelo: "Caja TMI Filtro Aspiración 10/10 3/4 CV" },
  { modelo: "Caja TMI Filtro Aspiración 10/10 1 CV (III)" },
  { modelo: "Caja TMI Filtro Aspiración 12/12 1 CV" },
  { modelo: "Caja TMI Filtro Aspiración 12/12 1,5 CV (T)" },
  { modelo: "Caja TMI Filtro Aspiración 12/12 1,5 CV (M)" },

  // Cajas TMI Anticorrosión
  { modelo: "Caja TMI Anticorrosión 7/7 1/5 CV" },
  { modelo: "Caja TMI Anticorrosión 9/9 1/3 CV" },
  { modelo: "Caja TMI Anticorrosión 9/9 1/2 CV" },
  { modelo: "Caja TMI Anticorrosión 9/9 3/4 CV" },
  { modelo: "Caja TMI Anticorrosión 10/10 1/3 CV" },
  { modelo: "Caja TMI Anticorrosión 10/10 1/2 CV" },
  { modelo: "Caja TMI Anticorrosión 10/10 3/4 CV" },
  { modelo: "Caja TMI Anticorrosión 10/10 1 CV (III)" },
  { modelo: "Caja TMI Anticorrosión 12/12 1 CV" },
  { modelo: "Caja TMI Anticorrosión 12/12 1,5 CV (III)" },
  { modelo: "Caja TMI Anticorrosión 12/12 1,5 CV" },

  // Cajas TSO 400º/2H
  { modelo: "Caja TSO 400º/2H 10/5 3/4 CV" },
  { modelo: "Caja TSO 400º/2H 10/5 1 CV" },
  { modelo: "Caja TSO 400º/2H 10/5 1,5 CV" },
  { modelo: "Caja TSO 400º/2H 12/6 1 CV" },
  { modelo: "Caja TSO 400º/2H 12/6 1,5 CV" },
  { modelo: "Caja TSO 400º/2H 12/6 2 CV" },
  { modelo: "Caja TSO 400º/2H 15/7,5 2 CV" },
  { modelo: "Caja TSO 400º/2H 15/7,5 3 CV" },
  { modelo: "Caja TSO 400º/2H 18/9 2 CV" },
  { modelo: "Caja TSO 400º/2H 18/9 3 CV" },
  { modelo: "Caja TSO 400º/2H 18/9 4 CV" },
  { modelo: "Caja TSO 400º/2H 20/10 3 CV" },
  { modelo: "Caja TSO 400º/2H 20/10 4 CV" },
  { modelo: "Caja TSO 400º/2H 20/10 5,5 CV" },
  { modelo: "Caja TSO 400º/2H 20/10 7,5 CV" },
  { modelo: "Caja TSO 400º/2H 22/11 3 CV" },
  { modelo: "Caja TSO 400º/2H 22/11 4 CV" },
  { modelo: "Caja TSO 400º/2H 22/11 5,5 CV" },
  { modelo: "Caja TSO 400º/2H 22/11 7,5 CV" },
  { modelo: "Caja TSO 400º/2H 25/12,5 4 CV" },
  { modelo: "Caja TSO 400º/2H 25/12,5 5,5 CV" },
  { modelo: "Caja TSO 400º/2H 25/12,5 7,5 CV" },
  { modelo: "Caja TSO 400º/2H 25/12,5 10 CV" },
  { modelo: "Caja TSO 400º/2H 30/14 5,5 CV" },
  { modelo: "Caja TSO 400º/2H 30/14 7,5 CV" },
  { modelo: "Caja TSO 400º/2H 30/14 10 CV" },
  { modelo: "Caja TSO 400º/2H 30/14 12,5 CV" },
  { modelo: "Caja TSO 400º/2H 30/14 15 CV" },

  // Cajas TSOR
  { modelo: "Caja TSOR 250 1 CV" },
  { modelo: "Caja TSOR 250 2 CV" },
  { modelo: "Caja TSOR 250 3 CV" },
  { modelo: "Caja TSOR 280 1 CV" },
  { modelo: "Caja TSOR 280 2 CV" },
  { modelo: "Caja TSOR 280 3 CV" },
  { modelo: "Caja TSOR 315 1 CV" },
  { modelo: "Caja TSOR 315 2 CV" },
  { modelo: "Caja TSOR 315 3 CV" },
  { modelo: "Caja TSOR 315 4 CV" },
  { modelo: "Caja TSOR 355 2 CV" },
  { modelo: "Caja TSOR 355 3 CV" },
  { modelo: "Caja TSOR 355 4 CV" },
  { modelo: "Caja TSOR 355 5,5 CV" },
  { modelo: "Caja TSOR 400 3 CV" },
  { modelo: "Caja TSOR 400 4 CV" },
  { modelo: "Caja TSOR 400 5,5 CV" },
  { modelo: "Caja TSOR 400 7,5 CV" },
  { modelo: "Caja TSOR 450 3 CV" },
  { modelo: "Caja TSOR 450 4 CV" },
  { modelo: "Caja TSOR 450 5,5 CV" },
  { modelo: "Caja TSOR 450 7,5 CV" },
  { modelo: "Caja TSOR 500 3 CV" },
  { modelo: "Caja TSOR 500 4 CV" },
  { modelo: "Caja TSOR 500 5,5 CV" },
  { modelo: "Caja TSOR 500 7,5 CV" },
  { modelo: "Caja TSOR 500 10 CV" },
  { modelo: "Caja TSOR 560 3 CV" },
  { modelo: "Caja TSOR 560 4 CV" },
  { modelo: "Caja TSOR 560 5,5 CV" },
  { modelo: "Caja TSOR 560 7,5 CV" },
  { modelo: "Caja TSOR 560 10 CV" },
  { modelo: "Caja TSOR 560 12,5 CV" },
  { modelo: "Caja TSOR 630 3 CV" },
  { modelo: "Caja TSOR 630 4 CV" },
  { modelo: "Caja TSOR 630 5,5 CV" },
  { modelo: "Caja TSOR 630 7,5 CV" },
  { modelo: "Caja TSOR 630 10 CV" },
  { modelo: "Caja TSOR 630 12,5 CV" },
  { modelo: "Caja TSOR 630 15 CV" },
];