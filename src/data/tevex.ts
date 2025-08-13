export interface TevexHood {
  modelo: string;
  tipo: "mural" | "central";
  LdefaultM: number;
  FdefaultM: number;
}

export interface TevexFan {
  modelo: string;
  referencia?: string;
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
  { modelo: "Óptima Monoblock mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },
  { modelo: "Óptima Monoblock central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL },

  // Premium
  { modelo: "Premium básica mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },
  { modelo: "Premium básica central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL },
  { modelo: "Premium integral mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },
  { modelo: "Premium integral central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL },
  { modelo: "Premium compensada mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },
  { modelo: "Premium compensada central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL },
  { modelo: "Premium Monoblock mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },
  { modelo: "Premium Monoblock central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL },
  { modelo: "Premium Inductora mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },
  { modelo: "Premium Inductora central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL },

  // Invertida
  { modelo: "Invertida básica mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },
  { modelo: "Invertida integral mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },
  { modelo: "Invertida compensada mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },
  { modelo: "Invertida Monoblock mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },

  // Low
  { modelo: "Low básica mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },
  { modelo: "Low básica central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL },
  { modelo: "Low integral mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },
  { modelo: "Low integral central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL },
  { modelo: "Low compensada mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },
  { modelo: "Low compensada central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL },
  { modelo: "Low Monoblock mural", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },
  { modelo: "Low Monoblock central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL },

  // Perimetral (según índice aparecen referencias central)
  { modelo: "Perimetral básica central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL },
  { modelo: "Perimetral integral central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL },
  { modelo: "Perimetral compensada central", tipo: "central", LdefaultM: DEF_L_CENTRAL, FdefaultM: DEF_F_CENTRAL },

  // Vahos
  { modelo: "Vahos", tipo: "mural", LdefaultM: DEF_L_MURAL, FdefaultM: DEF_F_MURAL },
];

export const TEVEX_FANS: TevexFan[] = [
  { modelo: "TMI" },
  { modelo: "TMI4 400º/2H" },
  { modelo: "TMT" },
  { modelo: "TMT4 400º/2H" },
  { modelo: "TSO 400º/2H" },
  { modelo: "TSOR" },
];