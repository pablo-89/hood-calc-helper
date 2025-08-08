export interface ElectroFilter {
  modelo: string;
  caudalMax: number; // m3/h
  filtro: string;
  ventilador: string;
  potenciaKw: number;
  dimensiones: string; // A×B×C (mm)
  dpFiltroLimpioPa?: number; // Pa (limpio)
  dpCarbonPa: number; // Pa
  tolvaAspMm: number;
  tolvaImpMm: number;
}

export const ELECTRO_FILTERS: ElectroFilter[] = [
  {
    modelo: "UFE-WINDS300",
    caudalMax: 3500,
    filtro: "WINDS300",
    ventilador: "BP-ERP 10/10 MC 4P",
    potenciaKw: 0.59,
    dimensiones: "625×520×1000",
    dpFiltroLimpioPa: undefined,
    dpCarbonPa: 120,
    tolvaAspMm: 300,
    tolvaImpMm: 300,
  },
  {
    modelo: "UFE-WINDS500",
    caudalMax: 5000,
    filtro: "WINDS500",
    ventilador: "BP-ERP 12/12 MC 6P",
    potenciaKw: 0.76,
    dimensiones: "610×780×1200",
    dpFiltroLimpioPa: undefined,
    dpCarbonPa: 120,
    tolvaAspMm: 400,
    tolvaImpMm: 400,
  },
  {
    modelo: "UFE-HEPLUS1400",
    caudalMax: 2000,
    filtro: "HEPLUS1400",
    ventilador: "BP-ERP 9/9 4P",
    potenciaKw: 0.35,
    dimensiones: "478×(515)×632×800",
    dpFiltroLimpioPa: undefined,
    dpCarbonPa: 120,
    tolvaAspMm: 250,
    tolvaImpMm: 250,
  },
  {
    modelo: "UFE-HEPLUS2000",
    caudalMax: 3000,
    filtro: "HEPLUS2000",
    ventilador: "BP-ERP 10/10 MC 4P",
    potenciaKw: 0.59,
    dimensiones: "520×(616)×632×900",
    dpFiltroLimpioPa: undefined,
    dpCarbonPa: 120,
    tolvaAspMm: 300,
    tolvaImpMm: 300,
  },
];
