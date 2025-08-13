export interface FanCurvePoint {
  Q: number; // m3/h
  dp: number; // Pa
}

export interface FanModel {
  modelo: string;
  precioEuro?: number;
  curva: FanCurvePoint[]; // simple discrete curve
}

export const FANS: FanModel[] = [
  {
    modelo: "BP-ERP 10/10 MC 4P",
    precioEuro: 820,
    curva: [
      { Q: 2000, dp: 420 },
      { Q: 3000, dp: 360 },
      { Q: 4000, dp: 290 },
      { Q: 5000, dp: 220 },
      { Q: 6000, dp: 150 },
    ],
  },
  {
    modelo: "BP-ERP 12/12 MC 6P",
    precioEuro: 980,
    curva: [
      { Q: 3000, dp: 500 },
      { Q: 4000, dp: 440 },
      { Q: 5000, dp: 380 },
      { Q: 6000, dp: 320 },
      { Q: 7000, dp: 260 },
    ],
  },
  {
    modelo: "BP-ERP 9/9 4P",
    precioEuro: 690,
    curva: [
      { Q: 1500, dp: 420 },
      { Q: 2000, dp: 360 },
      { Q: 2500, dp: 300 },
      { Q: 3000, dp: 240 },
      { Q: 3500, dp: 180 },
    ],
  },
];