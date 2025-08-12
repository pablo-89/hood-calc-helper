export interface BOMItem {
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precioUnitario?: number; // opcional
  subtotal?: number; // opcional
}

export interface PriceCatalog {
  ductoML?: number; // €/m
  codo90?: number; // €/ud
  codo45?: number; // €/ud
  transicion?: number; // €/ud
  rejilla?: number; // €/ud
  compuerta?: number; // €/ud
  terminal?: number; // €/ud
  ventilador?: Record<string, number>; // por modelo
  electroFiltro?: Record<string, number>; // por modelo
}

export interface ComputeBOMParams {
  // esenciales
  longitudConducto: number; // m recto
  accesorios: { codo90: number; codo45: number; transiciones: number; rejillas: number; compuertas: number; };
  diametroMm?: number; // mm (equiv.)
  terminalSeleccionado?: string; // texto libre
  ventiladorSugerido?: string; // modelo
  electroFiltroModelo?: string; // modelo
}

export function computeBOM(params: ComputeBOMParams, precios?: PriceCatalog) {
  const items: BOMItem[] = [];
  const push = (i: BOMItem) => {
    const subtotal = i.precioUnitario != null ? i.cantidad * i.precioUnitario : undefined;
    items.push({ ...i, subtotal });
  };

  // Ducto lineal
  if (params.longitudConducto > 0) {
    push({
      codigo: "DUCT-ML",
      descripcion: `Conducto galvanizado ${params.diametroMm ? `Ø${Math.round(params.diametroMm)}mm equiv.` : "(según plano)"}`,
      unidad: "m",
      cantidad: Math.max(0, params.longitudConducto),
      precioUnitario: precios?.ductoML,
    });
  }

  const acc = params.accesorios;
  if (acc.codo90) push({ codigo: "ACC-C90", descripcion: "Codo 90°", unidad: "ud", cantidad: acc.codo90, precioUnitario: precios?.codo90 });
  if (acc.codo45) push({ codigo: "ACC-C45", descripcion: "Codo 45°", unidad: "ud", cantidad: acc.codo45, precioUnitario: precios?.codo45 });
  if (acc.transiciones) push({ codigo: "ACC-TR", descripcion: "Transición", unidad: "ud", cantidad: acc.transiciones, precioUnitario: precios?.transicion });
  if (acc.rejillas) push({ codigo: "ACC-RJ", descripcion: "Rejilla/compuerta regulación", unidad: "ud", cantidad: acc.rejillas, precioUnitario: precios?.rejilla });
  if (acc.compuertas) push({ codigo: "ACC-CMP", descripcion: "Compuerta corte", unidad: "ud", cantidad: acc.compuertas, precioUnitario: precios?.compuerta });

  if (params.terminalSeleccionado) {
    push({ codigo: "TERM-01", descripcion: `Terminal: ${params.terminalSeleccionado}`, unidad: "ud", cantidad: 1, precioUnitario: precios?.terminal });
  }

  if (params.ventiladorSugerido) {
    const p = precios?.ventilador?.[params.ventiladorSugerido];
    push({ codigo: "FAN-SEL", descripcion: `Ventilador: ${params.ventiladorSugerido}`, unidad: "ud", cantidad: 1, precioUnitario: p });
  }

  if (params.electroFiltroModelo) {
    const p = precios?.electroFiltro?.[params.electroFiltroModelo];
    push({ codigo: "EFS-SEL", descripcion: `Filtro electrostático: ${params.electroFiltroModelo}`, unidad: "ud", cantidad: 1, precioUnitario: p });
  }

  const total = items.reduce((s, it) => s + (it.subtotal ?? 0), 0);
  return { items, total };
}