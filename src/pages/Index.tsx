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
import { computeBOM, defaultFanPrices } from "@/lib/budget";
import { FANS } from "@/data/fans";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ReferenceDot, ReferenceLine } from "recharts";

const formato = (n: number, dec = 2) =>
  new Intl.NumberFormat("es-ES", { maximumFractionDigits: dec }).format(n);

const helperText = {
  vap: "Valores típicos industriales: 0,25–0,50 m/s según campana y duty.",
  vd: "7–12 m/s recomendado en extracción de grasas; ajustar por ruido.",
  alturaGas: "Industrial: 0,90–1,20 m sobre plano de cocción (ver fabricante).",
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
    longitudHoriz: 5,
    longitudVert: 4,
    longitudTransicion: 1,
    accesorios: { codo90: 2, codo45: 0, transiciones: 1, rejillas: 1, compuertas: 1 },
    tipoConducto: "circular",
    lugarExpulsion: "tejado",
    orientacionSalida: "vertical",
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
  const [tipoInforme, setTipoInforme] = useState<"cliente" | "tecnico">("cliente");
  const [margenPct, setMargenPct] = useState<number>(20);
  const [precios, setPrecios] = useState({
    ductoML: 35,
    codo90: 18,
    codo45: 16,
    transicion: 22,
    rejilla: 28,
    compuerta: 30,
    terminal: 95,
    ventilador: defaultFanPrices(),
  });
  const [compararFan, setCompararFan] = useState(false);
  const [fanModeloExtra, setFanModeloExtra] = useState<string | undefined>(undefined);

  // Persistencia en localStorage
  const STORAGE_KEY = "hood_calc_prefs_v1";
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (typeof saved?.margenPct === 'number') setMargenPct(saved.margenPct);
      if (saved?.precios && typeof saved.precios === 'object') setPrecios((p) => ({ ...p, ...saved.precios }));
      if (typeof saved?.compararFan === 'boolean') setCompararFan(saved.compararFan);
      if (typeof saved?.fanModeloExtra === 'string') setFanModeloExtra(saved.fanModeloExtra);
      if (saved?.tipoInforme === 'cliente' || saved?.tipoInforme === 'tecnico') setTipoInforme(saved.tipoInforme);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      const toSave = { precios, margenPct, compararFan, fanModeloExtra, tipoInforme };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {}
  }, [precios, margenPct, compararFan, fanModeloExtra, tipoInforme]);

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
      longitudConducto: (data.longitudHoriz ?? 0) + (data.longitudVert ?? 0) + (data.longitudTransicion ?? 0),
      caudalDiseno: filtroOn && selectedFiltro ? caudalDisenoOverride : data.caudalDiseno,
      perdidaFiltrosPa: data.perdidaFiltrosPa + dpFiltroTotal,
    };

    const r = computeAll(inputForCompute);
    return { results: r, filtroClamped: filtroOn && selectedFiltro ? QpreMargin > maxQ : false, filtroDpTotal: dpFiltroTotal };
  }, [data, filtroOn, selectedFiltro, dpFiltroLimpio, estadoSucio]);

  // Validación en tiempo real
  const validation = useMemo(() => validateInput(data, { filtroOn, filtro: selectedFiltro, dpFiltroLimpio }), [data, filtroOn, selectedFiltro, dpFiltroLimpio]);

  const fanChartModel = useMemo(() => {
    if (results.fanModeloSugerido) return FANS.find(f => f.modelo === results.fanModeloSugerido);
    if (selectedFiltro) return FANS.find(f => f.modelo === selectedFiltro.ventilador);
    return undefined;
  }, [results.fanModeloSugerido, selectedFiltro]);

  const fanChartModelExtra = useMemo(() => {
    if (!compararFan || !fanModeloExtra) return undefined;
    return FANS.find(f => f.modelo === fanModeloExtra);
  }, [compararFan, fanModeloExtra]);

  const generateTicks = (min: number, max: number, count = 5) => {
    if (max <= min) return [min, max];
    const step = (max - min) / (count - 1);
    const ticks: number[] = [];
    for (let i = 0; i < count; i++) ticks.push(Math.round(min + i * step));
    return Array.from(new Set(ticks));
  };

  const qTicks = useMemo(() => {
    const qs = [
      ...(fanChartModel?.curva.map(p => p.Q) ?? []),
      ...(fanChartModelExtra?.curva.map(p => p.Q) ?? []),
    ];
    if (qs.length === 0) return undefined;
    const min = Math.min(...qs, Math.round(results.Q));
    const max = Math.max(...qs, Math.round(results.Q));
    return generateTicks(min, max, 5);
  }, [fanChartModel, fanChartModelExtra, results.Q]);

  const dpTicks = useMemo(() => {
    const dps = [
      ...(fanChartModel?.curva.map(p => p.dp) ?? []),
      ...(fanChartModelExtra?.curva.map(p => p.dp) ?? []),
    ];
    if (dps.length === 0) return undefined;
    const min = 0;
    const max = Math.max(...dps, Math.round(results.deltaPtotal));
    return generateTicks(min, max, 5);
  }, [fanChartModel, fanChartModelExtra, results.deltaPtotal]);

  const interpCurve = useMemo(() => {
    const c = fanChartModel?.curva;
    if (!c || c.length < 2) return [] as { q: number; dp: number }[];
    const out: { q: number; dp: number }[] = [];
    const stepsPerSeg = 10;
    for (let i = 0; i < c.length - 1; i++) {
      const a = c[i];
      const b = c[i + 1];
      for (let s = 0; s <= stepsPerSeg; s++) {
        const t = s / stepsPerSeg;
        out.push({ q: Math.round(a.Q + (b.Q - a.Q) * t), dp: Math.round(a.dp + (b.dp - a.dp) * t) });
      }
    }
    return out;
  }, [fanChartModel]);

  const interpCurveExtra = useMemo(() => {
    const c = fanChartModelExtra?.curva;
    if (!c || c.length < 2) return [] as { q: number; dp: number }[];
    const out: { q: number; dp: number }[] = [];
    const stepsPerSeg = 10;
    for (let i = 0; i < c.length - 1; i++) {
      const a = c[i];
      const b = c[i + 1];
      for (let s = 0; s <= stepsPerSeg; s++) {
        const t = s / stepsPerSeg;
        out.push({ q: Math.round(a.Q + (b.Q - a.Q) * t), dp: Math.round(a.dp + (b.dp - a.dp) * t) });
      }
    }
    return out;
  }, [fanChartModelExtra]);

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
    doc.text(
      tipoInforme === "cliente" ? "Informe de oferta - Sistema de extracción" : "Memoria técnica - Sistema de extracción",
      marginX,
      y
    );
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

    sep(tipoInforme === "cliente" ? "Solución propuesta" : "Datos de diseño");
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

    sep(tipoInforme === "cliente" ? "Parámetros principales" : "Resultados de cálculo");
    kv("Q", `${results.Q.toFixed(0)} m³/h (${results.Qs.toFixed(3)} m³/s)`);
    kv("Sección requerida", `${results.Areq.toFixed(3)} m² (Vd = ${data.velocidadDucto} m/s)`);
    kv("Diámetro equivalente", `${results.Dmm.toFixed(0)} mm`);
    kv("Longitud equivalente (Leq)", `${results.Leq.toFixed(1)} m`);
    kv("Δp por fricción", `${results.deltaPf.toFixed(0)} Pa`);
    kv("Δp total", `${results.deltaPtotal.toFixed(0)} Pa`);
    if (results.VrectActual) kv("Velocidad en conducto rectangular", `${results.VrectActual.toFixed(2)} m/s`);

    if (tipoInforme === "tecnico") sep("Desglose de pérdidas");
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
    if (results.fanModeloSugerido) {
      kv("Modelo sugerido por curva", `${results.fanModeloSugerido}`);
    } else if (selectedFiltro) {
      kv("Modelo orientativo (filtro)", `${selectedFiltro.ventilador} (${selectedFiltro.potenciaKw} kW)`);
    }

    if (tipoInforme === "tecnico" && (validation.formErrors.length > 0 || validation.warnings.length > 0)) {
      sep("Avisos y verificaciones");
      bullets([...validation.formErrors, ...validation.warnings]);
      if (filtroOn && selectedFiltro && (validation as any).QpreMargin && (validation as any).QpreMargin > selectedFiltro.caudalMax) {
        bullets(["El caudal calculado supera el máximo del filtro seleccionado."]);
      }
    }

    if (tipoInforme === "cliente") {
      sep("Resumen de oferta");
      const bom = computeBOM({
        longitudConducto: data.longitudConducto,
        accesorios: data.accesorios,
        diametroMm: results.Dmm,
        ventiladorSugerido: selectedFiltro?.ventilador,
        electroFiltroModelo: filtroOn ? selectedFiltro?.modelo : undefined,
        margenPct,
      }, precios);
      bullets(bom.items.map(i => `${i.descripcion} — ${i.cantidad} ${i.unidad}${i.subtotal != null ? ` (${Math.round(i.subtotal)} €)` : ""}`));
      line(`Subtotal: ${Math.round(bom.total)} €`, { bold: true });
      line(`Total con margen (${margenPct}%): ${Math.round(bom.totalConMargen)} €`, { bold: true });
    } else {
      sep("Recomendaciones");
      bullets([
        "Ajustar altura según combustible y normativa aplicable.",
        "Mantenimiento y limpieza de filtros cada ~500 h de uso.",
        "Verificar niveles de ruido según exigencias del local.",
      ]);

      // Curva del ventilador (si hay modelo coincidente)
      const fanModel = results.fanModeloSugerido ? FANS.find(f => f.modelo === results.fanModeloSugerido) : undefined;
      if (fanModel) {
        sep("Curva del ventilador");
        // Área de grafico
        const gx = marginX;
        const gy = y;
        const gw = pageWidth - marginX * 2;
        const gh = 60;
        // Escalas simples
        const qs = fanModel.curva.map(p => p.Q);
        const dps = fanModel.curva.map(p => p.dp);
        const qMin = Math.min(...qs, 0);
        const qMax = Math.max(...qs, Math.round(results.Q));
        const dpMin = 0;
        const dpMax = Math.max(...dps, Math.round(results.deltaPtotal));
        const sx = (q: number) => gx + (q - qMin) / Math.max(1, qMax - qMin) * gw;
        const sy = (dp: number) => gy + gh - (dp - dpMin) / Math.max(1, dpMax - dpMin) * gh;
        // Ejes
        doc.setDrawColor(180);
        doc.line(gx, gy + gh, gx + gw, gy + gh);
        doc.line(gx, gy, gx, gy + gh);
        // ticks
        const makeTicks = (min: number, max: number, n = 5) => {
          const out: number[] = [];
          if (max <= min) return [min, max];
          const step = (max - min) / (n - 1);
          for (let i = 0; i < n; i++) out.push(Math.round(min + i * step));
          return out;
        };
        const qTicksPdf = makeTicks(qMin, qMax, 5);
        const dpTicksPdf = makeTicks(dpMin, dpMax, 5);
        doc.setFontSize(8);
        qTicksPdf.forEach(v => {
          const x = sx(v);
          doc.line(x, gy + gh, x, gy + gh + 2);
          doc.text(String(v), x, gy + gh + 6, { align: 'center' });
        });
        dpTicksPdf.forEach(v => {
          const ytick = sy(v);
          doc.line(gx - 2, ytick, gx, ytick);
          doc.text(String(v), gx - 4, ytick + 2, { align: 'right' });
        });
        // gridlines at ticks
        doc.setDrawColor(220);
        qTicksPdf.forEach(v => {
          const x = sx(v);
          doc.line(x, gy, x, gy + gh);
        });
        dpTicksPdf.forEach(v => {
          const yline = sy(v);
          doc.line(gx, yline, gx + gw, yline);
        });
        // Curva (interpolada)
        doc.setDrawColor(0);
        const stepsPerSeg = 10;
        for (let i = 0; i < fanModel.curva.length - 1; i++) {
          const a = fanModel.curva[i];
          const b = fanModel.curva[i + 1];
          let prevX = sx(a.Q);
          let prevY = sy(a.dp);
          for (let s = 1; s <= stepsPerSeg; s++) {
            const t = s / stepsPerSeg;
            const q = a.Q + (b.Q - a.Q) * t;
            const dp = a.dp + (b.dp - a.dp) * t;
            const nx = sx(q);
            const ny = sy(dp);
            doc.line(prevX, prevY, nx, ny);
            prevX = nx;
            prevY = ny;
          }
        }
        // Punto de operación + crosshair
        const px = sx(Math.round(results.Q));
        const py = sy(Math.round(results.deltaPtotal));
        doc.setFillColor(200, 0, 0);
        // crosshair dashed
        ;(doc as any).setLineDash?.([2, 2], 0);
        doc.line(px, gy, px, gy + gh);
        doc.line(gx, py, gx + gw, py);
        ;(doc as any).setLineDash?.([], 0);
        doc.circle(px, py, 1.8, 'F');
        doc.setFontSize(8);
        const label = `${results.fanModeloSugerido ? results.fanModeloSugerido + ' — ' : ''}Q=${Math.round(results.Q)} m³/h, Δp=${Math.round(results.deltaPtotal)} Pa`;
        doc.text(label, Math.min(px + 4, gx + gw - 10), Math.max(py - 4, gy + 8));
        // Etiquetas
        doc.setFontSize(9);
        doc.text(`Q (m³/h)`, gx + gw, gy + gh + 12, { align: 'right' });
        doc.text(`Δp (Pa)`, gx, gy - 2);
        y += gh + 16;
      }
    }

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

  const exportBOMCSV = () => {
    const bom = computeBOM({
      longitudConducto: data.longitudConducto,
      accesorios: data.accesorios,
      diametroMm: results.Dmm,
      ventiladorSugerido: selectedFiltro?.ventilador,
      electroFiltroModelo: filtroOn ? selectedFiltro?.modelo : undefined,
    });
    const rows = [
      ["Código", "Descripción", "Unidad", "Cantidad"],
      ...bom.items.map(i => [i.codigo, i.descripcion, i.unidad, String(i.cantidad)]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "presupuesto_bom.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("BOM exportado");
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
                      <Label>Tramo horizontal (m)</Label>
                      <Input type="number" step="0.1" value={data.longitudHoriz ?? 0}
                        onChange={(e) => onChange("longitudHoriz", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <Label>Tramo vertical (m)</Label>
                      <Input type="number" step="0.1" value={data.longitudVert ?? 0}
                        onChange={(e) => onChange("longitudVert", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <Label>Transición (m)</Label>
                      <Input type="number" step="0.1" value={data.longitudTransicion ?? 0}
                        onChange={(e) => onChange("longitudTransicion", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="flex items-end">
                      <div className="rounded-md border p-3 w-full">
                        <div className="text-xs text-muted-foreground">Longitud total</div>
                        <div className="font-semibold">{formato((data.longitudHoriz ?? 0) + (data.longitudVert ?? 0) + (data.longitudTransicion ?? 0), 1)} m</div>
                      </div>
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
                      <Label>Tipo de informe</Label>
                      <Select value={tipoInforme} onValueChange={(v) => setTipoInforme(v as any)}>
                        <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cliente">Cliente (oferta)</SelectItem>
                          <SelectItem value="tecnico">Técnico (memoria)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                      <Label>Orientación salida</Label>
                      <Select value={data.orientacionSalida} onValueChange={(v) => onChange("orientacionSalida", v as any)}>
                        <SelectTrigger><SelectValue placeholder="Orientación" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vertical">Vertical</SelectItem>
                          <SelectItem value="horizontal">Horizontal</SelectItem>
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

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Precios y margen</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                      <div>
                        <Label>Ducto (€/m)</Label>
                        <Input type="number" value={precios.ductoML}
                          onChange={(e) => setPrecios({ ...precios, ductoML: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label>Codo 90° (€/ud)</Label>
                        <Input type="number" value={precios.codo90}
                          onChange={(e) => setPrecios({ ...precios, codo90: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label>Codo 45° (€/ud)</Label>
                        <Input type="number" value={precios.codo45}
                          onChange={(e) => setPrecios({ ...precios, codo45: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label>Transición (€/ud)</Label>
                        <Input type="number" value={precios.transicion}
                          onChange={(e) => setPrecios({ ...precios, transicion: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label>Rejilla (€/ud)</Label>
                        <Input type="number" value={precios.rejilla}
                          onChange={(e) => setPrecios({ ...precios, rejilla: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label>Compuerta (€/ud)</Label>
                        <Input type="number" value={precios.compuerta}
                          onChange={(e) => setPrecios({ ...precios, compuerta: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label>Terminal (€/ud)</Label>
                        <Input type="number" value={precios.terminal}
                          onChange={(e) => setPrecios({ ...precios, terminal: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label>Margen comercial (%)</Label>
                        <Input type="number" value={margenPct}
                          onChange={(e) => setMargenPct(parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button variant="hero" className="hover-lift" onClick={exportPDF}>Exportar PDF</Button>
                    <Button variant="secondary" className="hover-lift" onClick={exportCSV}>Exportar CSV</Button>
                    <Button variant="secondary" className="hover-lift" onClick={exportBOMCSV}>Exportar BOM</Button>
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

                {/* Curva ventilador y punto de operación */}
                {fanChartModel && (
                  <div>
                    <h3 className="text-base font-medium mb-1">Curva ventilador (orientativa)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <Switch checked={compararFan} onCheckedChange={setCompararFan} />
                        <span className="text-sm">Comparar con otro modelo</span>
                      </div>
                      {compararFan && (
                        <div>
                          <Select value={fanModeloExtra ?? ""} onValueChange={setFanModeloExtra}>
                            <SelectTrigger><SelectValue placeholder="Selecciona modelo" /></SelectTrigger>
                            <SelectContent>
                              {FANS.map(f => (
                                <SelectItem key={f.modelo} value={f.modelo}>{f.modelo}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <ChartContainer config={{ q: { label: "Q (m³/h)" }, dp: { label: "Δp (Pa)" } }}>
                      <LineChart data={interpCurve} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="q" domain={qTicks ? [qTicks[0], qTicks[qTicks.length - 1]] : undefined} ticks={qTicks} tickFormatter={(v) => `${v}`} />
                        <YAxis dataKey="dp" domain={dpTicks ? [dpTicks[0], dpTicks[dpTicks.length - 1]] : undefined} ticks={dpTicks} tickFormatter={(v) => `${v}`} />
                        {/* Gridlines at ticks */}
                        {qTicks?.map((x) => (
                          <ReferenceLine key={`vx-${x}`} x={x} stroke="currentColor" strokeOpacity={0.1} />
                        ))}
                        {dpTicks?.map((y) => (
                          <ReferenceLine key={`hy-${y}`} y={y} stroke="currentColor" strokeOpacity={0.1} />
                        ))}
                        <Line type="monotone" dataKey="dp" name={`Curva ventilador ${fanChartModel?.modelo ?? ""}`} stroke="hsl(var(--primary))" dot={false} />
                        {compararFan && interpCurveExtra.length > 0 && (
                          <Line type="monotone" dataKey="dp" name={`Curva ventilador ${fanChartModelExtra?.modelo ?? ""}`} data={interpCurveExtra} stroke="hsl(var(--secondary))" dot={false} />
                        )}
                        {/* Crosshair at operation point */}
                        <ReferenceLine x={Math.round(results.Q)} stroke="hsl(var(--destructive))" strokeDasharray="4 4" />
                        <ReferenceLine y={Math.round(results.deltaPtotal)} stroke="hsl(var(--destructive))" strokeDasharray="4 4" />
                        <ReferenceDot x={Math.round(results.Q)} y={Math.round(results.deltaPtotal)} r={4} fill="hsl(var(--destructive))" stroke="none" label={{ position: 'top', value: `Q=${Math.round(results.Q)} Δp=${Math.round(results.deltaPtotal)}` }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                      </LineChart>
                    </ChartContainer>
                    <p className="text-xs text-muted-foreground mt-1">Punto operación: Q={formato(results.Q,0)} m³/h, Δp={formato(results.deltaPtotal,0)} Pa</p>
                    {qTicks && dpTicks && (
                      <div className="text-[10px] text-muted-foreground mt-1">
                        <div>Horiz (Q m³/h): {qTicks.join(" · ")}</div>
                        <div>Vert (Δp Pa): {dpTicks.join(" · ")}</div>
                      </div>
                    )}
                  </div>
                )}

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
                  {results.fanModeloSugerido && (
                    <p className="text-xs text-muted-foreground">Modelo sugerido por curva: {results.fanModeloSugerido}</p>
                  )}
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
