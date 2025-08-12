import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { computeAll, type InputData, calcQ, applyMargin } from "@/lib/hoodCalc";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { ELECTRO_FILTERS } from "@/lib/electroFilters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { validateInput } from "@/lib/validation";

const formato = (n: number, dec = 2) =>
  new Intl.NumberFormat("es-ES", { maximumFractionDigits: dec }).format(n);

const helperText = {
  vap: "0,30 m/s (recomendado para campana mural). 0,25 m/s para central.",
  vd: "5–15 m/s habitual. 8–12 m/s recomendado para cocinas.",
  alturaGas: "Altura recomendada gas: 0,70–0,80 m. Eléctrica: 0,65–0,75 m.",
  friccion: "Fricción típica 0,6–1,5 Pa/m según rugosidad y velocidad.",
};

const Index = () => {
  const [data, setData] = useState<InputData>({
    tipoCampana: "mural",
    L: 2,
    F: 1.1,
    alturaInstalacion: 0.7,
    tipoCocina: "gas",
    velocidadCaptura: 0.3, // mural por defecto
    longitudConducto: 10,
    accesorios: { codo90: 2, codo45: 0, transiciones: 1, rejillas: 1, compuertas: 1 },
    tipoConducto: "circular",
    lugarExpulsion: "tejado",
    supresionIncendios: true,
    velocidadDucto: 10,
    margenCaudalPct: 15,
    friccionPaPorM: 1.0,
    perdidaFiltrosPa: 80,
    perdidaSalidaPa: 50,
  });

  // Filtro electrostático
  const [filtroOn, setFiltroOn] = useState(false);
  const [modeloFiltro, setModeloFiltro] = useState<string | undefined>(undefined);
  const selectedFiltro = useMemo(() => ELECTRO_FILTERS.find(f => f.modelo === modeloFiltro), [modeloFiltro]);
  const [dpFiltroLimpio, setDpFiltroLimpio] = useState<number | undefined>(undefined);
  const [estadoSucio, setEstadoSucio] = useState(false);

  // Wizard tab y aporte de aire
  const [activeTab, setActiveTab] = useState("campana");
  const [aportePct, setAportePct] = useState<number>(90); // % del caudal extraído
  
  // Datos de entrega
  const [entrega, setEntrega] = useState({
    cliente: "",
    proyecto: "",
    obra: "",
    responsable: "",
    empresa: "",
    nif: "",
    email: "",
    telefono: "",
    observaciones: "",
  });

  // Ajustar Vap recomendado según tipo campana si el usuario no lo ha cambiado manualmente
  useEffect(() => {
    setData((d) => ({
      ...d,
      velocidadCaptura: d.tipoCampana === "mural" ? 0.3 : 0.25,
    }));
  }, [data.tipoCampana]);

  const { results, filtroClamped, filtroDpTotal } = useMemo(() => {
    const Qsin = data.caudalDiseno && data.caudalDiseno > 0
      ? data.caudalDiseno
      : calcQ(data.tipoCampana, data.L, data.F, data.velocidadCaptura);
    const QpreMargin = applyMargin(Qsin, data.margenCaudalPct);

    const maxQ = filtroOn && selectedFiltro ? selectedFiltro.caudalMax : Infinity;
    const clampedQ = Math.min(QpreMargin, maxQ);
    const caudalDisenoOverride = clampedQ / (1 + data.margenCaudalPct / 100);

    const dpFiltroBase = dpFiltroLimpio ?? selectedFiltro?.dpFiltroLimpioPa ?? 0;
    const dpFiltroEff = dpFiltroBase * (estadoSucio ? 1.5 : 1);
    const dpCarbon = selectedFiltro?.dpCarbonPa ?? 0;
    const dpFiltroTotal = filtroOn && selectedFiltro ? dpFiltroEff + dpCarbon : 0;

    const inputForCompute: InputData = {
      ...data,
      caudalDiseno: filtroOn && selectedFiltro ? caudalDisenoOverride : data.caudalDiseno,
      perdidaFiltrosPa: data.perdidaFiltrosPa + dpFiltroTotal,
    };

    const r = computeAll(inputForCompute);
    return { results: r, filtroClamped: filtroOn && selectedFiltro ? QpreMargin > maxQ : false, filtroDpTotal: dpFiltroTotal };
  }, [data, filtroOn, selectedFiltro, dpFiltroLimpio, estadoSucio]);

  // Validación en tiempo real
  const validation = useMemo(() => validateInput(data, { filtroOn, filtro: selectedFiltro, dpFiltroLimpio }), [data, filtroOn, selectedFiltro, dpFiltroLimpio]);

  const onChange = (field: keyof InputData, value: any) => {
    setData((d) => ({ ...d, [field]: value }));
  };

  const onAccessoryChange = (key: keyof InputData["accesorios"], value: number) => {
    setData((d) => ({ ...d, accesorios: { ...d.accesorios, [key]: value } }));
  };

  const exportCSV = () => {
    const rows: Record<string, string | number>[] = [
      { Campo: "Tipo de campana", Valor: data.tipoCampana },
      { Campo: "L (m)", Valor: data.L },
      { Campo: "F (m)", Valor: data.F },
      { Campo: "Altura (m)", Valor: data.alturaInstalacion },
      { Campo: "Tipo cocina", Valor: data.tipoCocina },
      { Campo: "Vap (m/s)", Valor: data.velocidadCaptura },
      { Campo: "Vd (m/s)", Valor: data.velocidadDucto },
      { Campo: "Q (m3/h)", Valor: results.Q.toFixed(0) },
      { Campo: "Q (m3/s)", Valor: results.Qs.toFixed(3) },
      { Campo: "Área req (m2)", Valor: results.Areq.toFixed(3) },
      { Campo: "Diámetro (mm)", Valor: results.Dmm.toFixed(0) },
      { Campo: "Leq (m)", Valor: results.Leq.toFixed(1) },
      { Campo: "Δp fricción (Pa)", Valor: results.deltaPf.toFixed(0) },
      { Campo: "Δp total (Pa)", Valor: results.deltaPtotal.toFixed(0) },
      { Campo: "Ventilador", Valor: results.recomendacionVentilador },
      { Campo: "Aporte (%)", Valor: aportePct },
      { Campo: "Q aporte (m3/h)", Valor: Math.round((aportePct / 100) * results.Q) },
    ];
    const header = Object.keys(rows[0]).join(",");
    const body = rows.map((r) => `${r["Campo"]},${r["Valor"]}`).join("\n");
    const csv = header + "\n" + body;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "calculo_campana.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 14;
    const bottomMargin = 12;
    let y = 18;

    const ensureSpace = (lines = 1, lineHeight = 6) => {
      if (y + lines * lineHeight > pageHeight - bottomMargin) {
        doc.addPage();
        y = 18;
      }
    };

    const line = (text: string, opts?: { bold?: boolean }) => {
      if (opts?.bold) doc.setFont(undefined, "bold"); else doc.setFont(undefined, "normal");
      ensureSpace();
      doc.text(text, marginX, y);
      y += 7;
    };
    const wrap = (text: string, indent = 0, lh = 6) => {
      const lines = doc.splitTextToSize(text, pageWidth - marginX * 2 - indent);
      lines.forEach((l) => {
        ensureSpace(1, lh);
        doc.text(l, marginX + indent, y);
        y += lh;
      });
    };
    const bullets = (items: string[], indent = 2) => {
      items.forEach((it) => wrap(`• ${it}`, indent));
    };
    const sep = (title?: string) => {
      ensureSpace(1, 4);
      doc.setDrawColor(180);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 6;
      if (title) {
        doc.setFont(undefined, "bold");
        ensureSpace();
        doc.text(title, marginX, y);
        y += 6;
      }
    };
    const kv = (k: string, v: string) => { line(`${k}: ${v}`); };
    const now = new Date();
    const fdate = now.toLocaleDateString("es-ES");

    // Encabezado
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text("Informe de entrega - Campana de extracción", marginX, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    line(`Fecha: ${fdate}`);
    if (entrega.empresa) line(`Empresa emisora: ${entrega.empresa}`);

    sep("Datos del cliente");
    kv("Cliente", entrega.cliente || "-");
    kv("Proyecto", entrega.proyecto || "-");
    kv("Obra/Dirección", entrega.obra || "-");
    kv("Responsable", entrega.responsable || "-");
    if (entrega.nif) kv("NIF", entrega.nif);
    if (entrega.email) kv("Email", entrega.email);
    if (entrega.telefono) kv("Teléfono", entrega.telefono);

    sep("Solución propuesta");
    kv("Tipo de campana", data.tipoCampana);
    kv("Dimensiones (L x F)", `${data.L} m x ${data.F} m`);
    kv("Altura instalación", `${data.alturaInstalacion} m`);
    kv("Tipo de cocina", data.tipoCocina);
    if (data.potenciaTermica) kv("Potencia térmica", `${data.potenciaTermica} kW`);
    kv("Vap (m/s)", `${data.velocidadCaptura}`);
    if (filtroOn && selectedFiltro) {
      kv("Filtro electrostático", selectedFiltro.modelo);
      kv("Caudal máx. filtro", `${selectedFiltro.caudalMax} m³/h`);
      kv("Δp carbón", `${selectedFiltro.dpCarbonPa} Pa`);
      kv("Tolvas Ø asp/imp", `${selectedFiltro.tolvaAspMm} / ${selectedFiltro.tolvaImpMm} mm`);
    }

    sep("Resultados de cálculo");
    kv("Q", `${results.Q.toFixed(0)} m³/h (${results.Qs.toFixed(3)} m³/s)`);
    kv("Sección requerida", `${results.Areq.toFixed(3)} m² (Vd = ${data.velocidadDucto} m/s)`);
    kv("Diámetro equivalente", `${results.Dmm.toFixed(0)} mm`);
    kv("Longitud equivalente (Leq)", `${results.Leq.toFixed(1)} m`);
    kv("Δp por fricción", `${results.deltaPf.toFixed(0)} Pa`);
    kv("Δp total", `${results.deltaPtotal.toFixed(0)} Pa`);
    if (results.VrectActual) kv("Velocidad en conducto rectangular", `${results.VrectActual.toFixed(2)} m/s`);

    sep("Desglose de pérdidas");
    kv("Conducto recto", `${Math.round(data.friccionPaPorM * data.longitudConducto)} Pa`);
    kv("Accesorios (equivalente)", `${Math.round(data.friccionPaPorM * Math.max(0, results.Leq - data.longitudConducto))} Pa`);
    kv("Filtros + carbón", `${Math.round((data.perdidaFiltrosPa || 0) + (filtroDpTotal || 0))} Pa`);
    kv("Salida/terminal", `${Math.round(data.perdidaSalidaPa || 0)} Pa`);

    sep("Aporte de aire");
    kv("Aporte (%)", `${aportePct}%`);
    kv("Q aporte", `${Math.round((aportePct / 100) * results.Q)} m³/h`);

    sep("Selección de ventilador");
    const reqQ = Math.round(results.Q);
    const reqDp = Math.round(results.deltaPtotal * 1.25);
    kv("Q requerido", `${reqQ} m³/h`);
    kv("Δp requerido", `${reqDp} Pa (margen 25%)`);
    if (selectedFiltro) kv("Modelo orientativo", `${selectedFiltro.ventilador} (${selectedFiltro.potenciaKw} kW)`);

    if (validation.formErrors.length > 0 || validation.warnings.length > 0) {
      sep("Avisos y verificaciones");
      bullets([...validation.formErrors, ...validation.warnings]);
      if (filtroOn && selectedFiltro && (validation as any).QpreMargin && (validation as any).QpreMargin > selectedFiltro.caudalMax) {
        bullets(["El caudal calculado supera el máximo del filtro seleccionado."]);
      }
    }

    sep("Recomendaciones");
    bullets([
      "Ajustar altura según combustible y normativa aplicable.",
      "Mantenimiento y limpieza de filtros cada ~500 h de uso.",
      "Verificar niveles de ruido según exigencias del local.",
    ]);

    if (entrega.observaciones) {
      sep("Observaciones");
      wrap(entrega.observaciones);
    }

    // Firmas
    y += 6;
    ensureSpace();
    doc.setDrawColor(0);
    doc.line(marginX, y, marginX + 60, y);
    doc.line(pageWidth - marginX - 60, y, pageWidth - marginX, y);
    y += 5;
    doc.text("Firma y sello emisor", marginX, y);
    doc.text("Conforme cliente", pageWidth - marginX - 60, y);

    // Pie de página
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const footer = `Página ${i} de ${pageCount}`;
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(footer, pageWidth - marginX, doc.internal.pageSize.getHeight() - 10, { align: "right" });
      doc.setTextColor(0);
    }

    doc.save("informe_campana_cliente.pdf");
    toast.success("Informe PDF exportado");
  };

  // Desglose de pérdidas
  const extraEq = results.Leq - data.longitudConducto;
  const dpRecto = data.friccionPaPorM * data.longitudConducto;
  const dpAcc = data.friccionPaPorM * Math.max(0, extraEq);
  const dpFiltros = (data.perdidaFiltrosPa || 0) + (filtroDpTotal || 0);
  const dpSalida = data.perdidaSalidaPa || 0;

  return (
    <>
      <Helmet>
        <title>Calculadora de campanas de extracción | Caudal, conductos y Δp</title>
        <meta name="description" content="Calcula caudal de extracción, sección de conductos y pérdidas de carga para campanas de cocina profesionales. Resultados con informe PDF/CSV." />
        <link rel="canonical" href={window.location.origin + "/"} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Calculadora de campanas de extracción",
            applicationCategory: "EngineeringApplication",
            offers: { "@type": "Offer", price: 0 },
            operatingSystem: "Web",
            description:
              "Calcula caudal de extracción, dimensionado de conductos y pérdidas de carga para campanas de cocina.",
          })}
        </script>
      </Helmet>

      <header className="bg-hero-gradient">
        <div className="container mx-auto px-4 py-10">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Calculadora de campanas de extracción
            </h1>
            <p className="mt-3 text-muted-foreground">
              Introduce los datos del proyecto y obtén caudal (Q), sección/diámetro de conducto y Δp total con recomendaciones.
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Datos de entrada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4">
                  <TabsTrigger value="campana">Campana</TabsTrigger>
                  <TabsTrigger value="conducto">Conductos</TabsTrigger>
                  <TabsTrigger value="filtros">Filtros</TabsTrigger>
                  <TabsTrigger value="salida">Aporte/Salida</TabsTrigger>
                </TabsList>

                <TabsContent value="campana" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Tipo de campana</Label>
                      <Select value={data.tipoCampana} onValueChange={(v) => onChange("tipoCampana", v as any)}>
                        <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mural">Mural (pared)</SelectItem>
                          <SelectItem value="central">Central (isla)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Tipo de cocina/combustible</Label>
                      <Select value={data.tipoCocina} onValueChange={(v) => onChange("tipoCocina", v)}>
                        <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gas">Gas</SelectItem>
                          <SelectItem value="eléctrica">Eléctrica</SelectItem>
                          <SelectItem value="char-broiler">Char-broiler</SelectItem>
                          <SelectItem value="plancha">Plancha</SelectItem>
                          <SelectItem value="mixta">Mixta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Longitud L (m)</Label>
                      <Input type="number" step="0.01" value={data.L}
                        onChange={(e) => onChange("L", parseFloat(e.target.value) || 0)} />
                      {validation.fieldErrors.L && <p className="text-xs text-red-600 mt-1">{validation.fieldErrors.L}</p>}
                    </div>
                    <div>
                      <Label>Fondo F (m)</Label>
                      <Input type="number" step="0.01" value={data.F}
                        onChange={(e) => onChange("F", parseFloat(e.target.value) || 0)} />
                      {validation.fieldErrors.F && <p className="text-xs text-red-600 mt-1">{validation.fieldErrors.F}</p>}
                    </div>
                    <div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center justify-between">
                              <Label>Altura instalación (m)</Label>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent><p>{helperText.alturaGas}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Input type="number" step="0.01" value={data.alturaInstalacion}
                        onChange={(e) => onChange("alturaInstalacion", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <Label>Potencia térmica (kW, opcional)</Label>
                      <Input type="number" step="1" value={data.potenciaTermica ?? ""}
                        onChange={(e) => onChange("potenciaTermica", e.target.value ? parseFloat(e.target.value) : undefined)} />
                    </div>
                    <div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center justify-between">
                              <Label>Velocidad de captura Vap (m/s)</Label>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent><p>{helperText.vap}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Input type="number" step="0.01" placeholder="0,30 recomendado" value={data.velocidadCaptura}
                        onChange={(e) => onChange("velocidadCaptura", parseFloat(e.target.value) || 0)} />
                      {validation.fieldErrors.velocidadCaptura && <p className="text-xs text-red-600 mt-1">{validation.fieldErrors.velocidadCaptura}</p>}
                    </div>
                    <div>
                      <Label>Caudal de diseño (m³/h, opcional)</Label>
                      <Input type="number" step="1" value={data.caudalDiseno ?? ""}
                        onChange={(e) => onChange("caudalDiseno", e.target.value ? parseFloat(e.target.value) : undefined)} />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="conducto" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Tipo de conducto</Label>
                      <Select value={data.tipoConducto} onValueChange={(v) => onChange("tipoConducto", v as any)}>
                        <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="circular">Circular</SelectItem>
                          <SelectItem value="rectangular">Rectangular</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center justify-between">
                              <Label>Velocidad en conducto Vd (m/s)</Label>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent><p>{helperText.vd}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Input type="number" step="0.1" placeholder="8–12 recomendado" value={data.velocidadDucto}
                        onChange={(e) => onChange("velocidadDucto", parseFloat(e.target.value) || 0)} />
                      {validation.fieldErrors.velocidadDucto && <p className="text-xs text-red-600 mt-1">{validation.fieldErrors.velocidadDucto}</p>}
                    </div>
                    {data.tipoConducto === "rectangular" && (
                      <>
                        <div>
                          <Label>Ancho rect (m)</Label>
                          <Input type="number" step="0.01" value={data.anchoRect ?? ""}
                            onChange={(e) => onChange("anchoRect", e.target.value ? parseFloat(e.target.value) : undefined)} />
                          {validation.fieldErrors.anchoRect && <p className="text-xs text-red-600 mt-1">{validation.fieldErrors.anchoRect as string}</p>}
                        </div>
                        <div>
                          <Label>Alto rect (m)</Label>
                          <Input type="number" step="0.01" value={data.altoRect ?? ""}
                            onChange={(e) => onChange("altoRect", e.target.value ? parseFloat(e.target.value) : undefined)} />
                          {validation.fieldErrors.altoRect && <p className="text-xs text-red-600 mt-1">{validation.fieldErrors.altoRect as string}</p>}
                        </div>
                      </>
                    )}
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Longitud total de conducto (m)</Label>
                      <Input type="number" step="0.1" value={data.longitudConducto}
                        onChange={(e) => onChange("longitudConducto", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center justify-between">
                              <Label>Fricción (Pa/m)</Label>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent><p>{helperText.friccion}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Input type="number" step="0.1" value={data.friccionPaPorM}
                        onChange={(e) => onChange("friccionPaPorM", parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <Label>Codos 90°</Label>
                      <Input type="number" value={data.accesorios.codo90}
                        onChange={(e) => onAccessoryChange("codo90", parseInt(e.target.value || "0"))} />
                    </div>
                    <div>
                      <Label>Codos 45°</Label>
                      <Input type="number" value={data.accesorios.codo45}
                        onChange={(e) => onAccessoryChange("codo45", parseInt(e.target.value || "0"))} />
                    </div>
                    <div>
                      <Label>Transiciones</Label>
                      <Input type="number" value={data.accesorios.transiciones}
                        onChange={(e) => onAccessoryChange("transiciones", parseInt(e.target.value || "0"))} />
                    </div>
                    <div>
                      <Label>Rejillas</Label>
                      <Input type="number" value={data.accesorios.rejillas}
                        onChange={(e) => onAccessoryChange("rejillas", parseInt(e.target.value || "0"))} />
                    </div>
                    <div>
                      <Label>Compuertas</Label>
                      <Input type="number" value={data.accesorios.compuertas}
                        onChange={(e) => onAccessoryChange("compuertas", parseInt(e.target.value || "0"))} />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="filtros" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Filtro electrostático</Label>
                      <Switch checked={filtroOn} onCheckedChange={setFiltroOn} />
                    </div>

                    {filtroOn && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label>Modelo</Label>
                          <Select value={modeloFiltro ?? ""} onValueChange={(v) => setModeloFiltro(v)}>
                            <SelectTrigger><SelectValue placeholder="Selecciona modelo" /></SelectTrigger>
                            <SelectContent>
                              {ELECTRO_FILTERS.map((f) => (
                                <SelectItem key={f.modelo} value={f.modelo}>{f.modelo}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Δp filtro limpio (Pa)</Label>
                          <Input
                            type="number"
                            placeholder={selectedFiltro?.dpFiltroLimpioPa !== undefined ? String(selectedFiltro.dpFiltroLimpioPa) : "Introduce valor"}
                            value={dpFiltroLimpio ?? (selectedFiltro?.dpFiltroLimpioPa ?? "")}
                            onChange={(e) =>
                              setDpFiltroLimpio(e.target.value ? parseFloat(e.target.value) : undefined)
                            }
                          />
                          <div className="mt-1 text-xs text-muted-foreground">
                            Puedes ajustar para estado sucio (+50%).
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <Switch checked={estadoSucio} onCheckedChange={setEstadoSucio} />
                          <Label>Estado sucio (+50%)</Label>
                        </div>

                        {selectedFiltro && (
                          <div className="sm:col-span-2">
                            <div className="rounded-md border p-3 text-sm">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div>
                                  <div className="text-xs text-muted-foreground">Caudal máx.</div>
                                  <div className="font-medium">{formato(selectedFiltro.caudalMax,0)} m³/h</div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">Δp carbón</div>
                                  <div className="font-medium">{selectedFiltro.dpCarbonPa} Pa</div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">Tolvas Ø asp/imp</div>
                                  <div className="font-medium">{selectedFiltro.tolvaAspMm} / {selectedFiltro.tolvaImpMm} mm</div>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                                <div>
                                  <div className="text-xs text-muted-foreground">Ventilador recomendado</div>
                                  <div className="font-medium">{selectedFiltro.ventilador} ({selectedFiltro.potenciaKw} kW)</div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">Dimensiones A×B×C</div>
                                  <div className="font-medium">{selectedFiltro.dimensiones}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">Δp total filtro</div>
                                  <div className="font-medium">{formato(filtroDpTotal ?? 0,0)} Pa</div>
                                </div>
                              </div>
                              {filtroClamped && (
                                <div className="mt-3 text-xs text-amber-600">
                                  Caudal limitado al máximo del filtro seleccionado.
                                </div>
                              )}
                              {validation.formErrors.length > 0 && (
                                <ul className="mt-2 list-disc pl-5 text-xs text-red-600 space-y-1">
                                  {validation.formErrors.map((e, i) => <li key={i}>{e}</li>)}
                                </ul>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="salida" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label>Lugar de expulsión</Label>
                      <Select value={data.lugarExpulsion} onValueChange={(v) => onChange("lugarExpulsion", v)}>
                        <SelectTrigger><SelectValue placeholder="Lugar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tejado">Tejado</SelectItem>
                          <SelectItem value="fachada">Fachada</SelectItem>
                          <SelectItem value="ventilación forzada">Ventilación forzada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Ruido máx. dB(A) (opcional)</Label>
                      <Input type="number" value={data.nivelRuidoMax ?? ""}
                        onChange={(e) => onChange("nivelRuidoMax", e.target.value ? parseFloat(e.target.value) : undefined)} />
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-6">
                      <Label>Supresión de incendios</Label>
                      <Switch checked={data.supresionIncendios} onCheckedChange={(v) => onChange("supresionIncendios", v)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label>Pérdida en filtros (Pa)</Label>
                      <Input type="number" step="1" value={data.perdidaFiltrosPa}
                        onChange={(e) => onChange("perdidaFiltrosPa", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <Label>Pérdida salida/terminal (Pa)</Label>
                      <Input type="number" step="1" value={data.perdidaSalidaPa}
                        onChange={(e) => onChange("perdidaSalidaPa", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <Label>Margen de caudal (%)</Label>
                      <Input type="number" value={data.margenCaudalPct}
                        onChange={(e) => onChange("margenCaudalPct", parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label>Aporte de aire (%)</Label>
                      <Input type="number" step="1" value={aportePct}
                        onChange={(e) => setAportePct(parseFloat(e.target.value) || 0)} />
                      <div className="mt-1 text-xs text-muted-foreground">Proporción del caudal extraído a reponer (p.ej. 80–90%).</div>
                    </div>
                    <div className="sm:col-span-2 flex items-end">
                      <div className="rounded-md border p-3 w-full">
                        <div className="text-xs text-muted-foreground">Caudal de aporte</div>
                        <div className="font-semibold">{formato((aportePct / 100) * results.Q, 0)} m³/h</div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Datos de entrega (para informe)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label>Cliente</Label>
                        <Input value={entrega.cliente} onChange={(e) => setEntrega({ ...entrega, cliente: e.target.value })} />
                      </div>
                      <div>
                        <Label>Proyecto</Label>
                        <Input value={entrega.proyecto} onChange={(e) => setEntrega({ ...entrega, proyecto: e.target.value })} />
                      </div>
                      <div>
                        <Label>Obra/Dirección</Label>
                        <Input value={entrega.obra} onChange={(e) => setEntrega({ ...entrega, obra: e.target.value })} />
                      </div>
                      <div>
                        <Label>Responsable</Label>
                        <Input value={entrega.responsable} onChange={(e) => setEntrega({ ...entrega, responsable: e.target.value })} />
                      </div>
                      <div>
                        <Label>Empresa emisora</Label>
                        <Input value={entrega.empresa} onChange={(e) => setEntrega({ ...entrega, empresa: e.target.value })} />
                      </div>
                      <div>
                        <Label>NIF</Label>
                        <Input value={entrega.nif} onChange={(e) => setEntrega({ ...entrega, nif: e.target.value })} />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input value={entrega.email} onChange={(e) => setEntrega({ ...entrega, email: e.target.value })} />
                      </div>
                      <div>
                        <Label>Teléfono</Label>
                        <Input value={entrega.telefono} onChange={(e) => setEntrega({ ...entrega, telefono: e.target.value })} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Observaciones</Label>
                        <Input value={entrega.observaciones} onChange={(e) => setEntrega({ ...entrega, observaciones: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button variant="hero" className="hover-lift" onClick={exportPDF}>Exportar PDF</Button>
                    <Button variant="secondary" className="hover-lift" onClick={exportCSV}>Exportar CSV</Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Resultados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Stat label="Caudal Q" value={`${formato(results.Q,0)} m³/h`} />
                  <Stat label="Caudal Qs" value={`${formato(results.Qs,3)} m³/s`} />
                  <Stat label="Sección requerida" value={`${formato(results.Areq,3)} m²`} />
                  <Stat label="Diámetro equivalente" value={`${formato(results.Dmm,0)} mm`} />
                  <Stat label="Longitud equivalente" value={`${formato(results.Leq,1)} m`} />
                  <Stat label="Δp fricción" value={`${formato(results.deltaPf,0)} Pa`} />
                  <Stat label="Δp total" value={`${formato(results.deltaPtotal,0)} Pa`} />
                  {results.VrectActual && (
                    <Stat label="V en conducto rectangular" value={`${formato(results.VrectActual,2)} m/s`} />
                  )}
                </div>

                <Separator />

                <div>
                  <h3 className="text-base font-medium mb-1">Desglose de pérdidas</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <StatSmall label="Conducto recto" value={`${formato(dpRecto,0)} Pa`} />
                    <StatSmall label="Accesorios (equiv.)" value={`${formato(dpAcc,0)} Pa`} />
                    <StatSmall label="Filtros + carbón" value={`${formato(dpFiltros,0)} Pa`} />
                    <StatSmall label="Salida/terminal" value={`${formato(dpSalida,0)} Pa`} />
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-base font-medium mb-1">Selección de ventilador</h3>
                  <p className="text-sm text-muted-foreground">{results.recomendacionVentilador}</p>
                </div>

                {(results.avisos.length > 0 || validation.warnings.length > 0 || validation.formErrors.length > 0 || filtroClamped) && (
                  <div>
                    <h3 className="text-base font-medium mb-1">Avisos</h3>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                      {results.avisos.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                      {validation.warnings.map((a, i) => (
                        <li key={`w-${i}`}>{a}</li>
                      ))}
                      {validation.formErrors.map((a, i) => (
                        <li key={`e-${i}`} className="text-red-600">{a}</li>
                      ))}
                      {filtroClamped && (
                        <li>Caudal limitado al máximo del filtro seleccionado.</li>
                      )}
                    </ul>
                  </div>
                )}

                <Separator />

                <div className="text-sm text-muted-foreground">
                  <p>
                    Notas: Valores de partida (Vap, Vd, fricción) ajustables. Verifica con normativa y
                    fabricante. Mantén filtros limpios y realiza mantenimiento periódico.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border p-4">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-lg font-semibold">{value}</div>
  </div>
);

const StatSmall = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border p-3">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-sm font-semibold">{value}</div>
  </div>
);

export default Index;
