export interface TevexHood {
  modelo: string;
  tipo: "mural" | "central";
  LdefaultM: number;
  FdefaultM: number;
  salida?: { tipo: "circular" | "rectangular"; diamMm?: number; anchoMm?: number; altoMm?: number };
}

export interface TevexFan {
  modelo: string;
  referencia?: string;
}

export const TEVEX_HOODS: TevexHood[] = [
  { modelo: "TEVEX-MURAL-1000", tipo: "mural", LdefaultM: 1.0, FdefaultM: 1.0, salida: { tipo: "circular", diamMm: 300 } },
  { modelo: "TEVEX-MURAL-2000", tipo: "mural", LdefaultM: 2.0, FdefaultM: 1.1, salida: { tipo: "circular", diamMm: 400 } },
  { modelo: "TEVEX-ISLA-1200", tipo: "central", LdefaultM: 1.2, FdefaultM: 1.2, salida: { tipo: "circular", diamMm: 350 } },
];

export const TEVEX_FANS: TevexFan[] = [
  { modelo: "TEVEX-FAN-400" },
  { modelo: "TEVEX-FAN-500" },
  { modelo: "TEVEX-FAN-600" },
];