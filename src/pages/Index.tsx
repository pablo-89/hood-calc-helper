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

const formato = (n: number, dec = 2) =>
  new Intl.NumberFormat("es-ES", { maximumFractionDigits: dec }).format(n);

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
    const line = (y: number, text: string) => doc.text(text, 14, y);

    doc.setFontSize(16);
    line(20, "Informe de cálculo de campana de extracción");
    doc.setFontSize(11);

    let y = 30;
    const add = (label: string, value: string) => {
      line(y, `${label}: ${value}`);
      y += 7;
    };

    add("Tipo de campana", data.tipoCampana);
    add("Dimensiones (L x F)", `${data.L} m x ${data.F} m`);
    add("Altura instalación", `${data.alturaInstalacion} m`);
    add("Tipo de cocina", data.tipoCocina);
    if (data.potenciaTermica) add("Potencia térmica", `${data.potenciaTermica} kW`);
    add("Velocidad de captura (Vap)", `${data.velocidadCaptura} m/s`);
    if (data.caudalDiseno) add("Caudal de diseño", `${data.caudalDiseno} m³/h`);

    y += 3;
    line(y, "Resultados");
    y += 7;
    add("Q", `${results.Q.toFixed(0)} m³/h (${results.Qs.toFixed(3)} m³/s)`);
    add("Sección requerida", `${results.Areq.toFixed(3)} m² (Vd = ${data.velocidadDucto} m/s)`);
    add("Diámetro equivalente", `${results.Dmm.toFixed(0)} mm`);
    add("Longitud equivalente (Leq)", `${results.Leq.toFixed(1)} m`);
    add("Δp fricción", `${results.deltaPf.toFixed(0)} Pa`);
    add("Δp total", `${results.deltaPtotal.toFixed(0)} Pa`);

    if (results.VrectActual) add("Velocidad en conducto rectangular", `${results.VrectActual.toFixed(2)} m/s`);

    y += 3;
    add("Recomendación ventilador", results.recomendacionVentilador);

    if (results.avisos.length) {
      y += 3;
      line(y, "Avisos");
      y += 7;
      results.avisos.forEach((a) => add("-", a));
    }

    doc.save("informe_campana.pdf");
    toast.success("PDF exportado");
  };

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
                </div>
                <div>
                  <Label>Fondo F (m)</Label>
                  <Input type="number" step="0.01" value={data.F}
                    onChange={(e) => onChange("F", parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>Altura instalación (m)</Label>
                  <Input type="number" step="0.01" value={data.alturaInstalacion}
                    onChange={(e) => onChange("alturaInstalacion", parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>Potencia térmica (kW, opcional)</Label>
                  <Input type="number" step="1" value={data.potenciaTermica ?? ""}
                    onChange={(e) => onChange("potenciaTermica", e.target.value ? parseFloat(e.target.value) : undefined)} />
                </div>
                <div>
                  <Label>Velocidad de captura Vap (m/s)</Label>
                  <Input type="number" step="0.01" value={data.velocidadCaptura}
                    onChange={(e) => onChange("velocidadCaptura", parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>Caudal de diseño (m³/h, opcional)</Label>
                  <Input type="number" step="1" value={data.caudalDiseno ?? ""}
                    onChange={(e) => onChange("caudalDiseno", e.target.value ? parseFloat(e.target.value) : undefined)} />
                </div>
              </div>

              <Separator />

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
                  <Label>Velocidad en conducto Vd (m/s)</Label>
                  <Input type="number" step="0.1" value={data.velocidadDucto}
                    onChange={(e) => onChange("velocidadDucto", parseFloat(e.target.value) || 0)} />
                </div>
                {data.tipoConducto === "rectangular" && (
                  <>
                    <div>
                      <Label>Ancho rect (m)</Label>
                      <Input type="number" step="0.01" value={data.anchoRect ?? ""}
                        onChange={(e) => onChange("anchoRect", e.target.value ? parseFloat(e.target.value) : undefined)} />
                    </div>
                    <div>
                      <Label>Alto rect (m)</Label>
                      <Input type="number" step="0.01" value={data.altoRect ?? ""}
                        onChange={(e) => onChange("altoRect", e.target.value ? parseFloat(e.target.value) : undefined)} />
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
                  <Label>Fricción (Pa/m)</Label>
                  <Input type="number" step="0.1" value={data.friccionPaPorM}
                    onChange={(e) => onChange("friccionPaPorM", parseFloat(e.target.value) || 0)} />
                </div>
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

              <Separator />

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
                              <div className="text-xs text-muted-foreground">Δp total filtro</div>
                              <div className="font-medium">{formato(filtroDpTotal ?? 0,0)} Pa</div>
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
                              <div className="text-xs text-muted-foreground">Tolvas Ø asp/imp</div>
                              <div className="font-medium">{selectedFiltro.tolvaAspMm} / {selectedFiltro.tolvaImpMm} mm</div>
                            </div>
                          </div>
                          {filtroClamped && (
                            <div className="mt-3 text-xs text-amber-600">
                              Caudal limitado al máximo del filtro seleccionado.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Separator />

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Margen de caudal (%)</Label>
                  <Input type="number" value={data.margenCaudalPct}
                    onChange={(e) => onChange("margenCaudalPct", parseFloat(e.target.value) || 0)} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="hero" className="hover-lift" onClick={exportPDF}>Exportar PDF</Button>
                <Button variant="secondary" className="hover-lift" onClick={exportCSV}>Exportar CSV</Button>
              </div>
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
                  <h3 className="text-base font-medium mb-1">Selección de ventilador</h3>
                  <p className="text-sm text-muted-foreground">{results.recomendacionVentilador}</p>
                </div>

                {(results.avisos.length > 0 || filtroClamped) && (
                  <div>
                    <h3 className="text-base font-medium mb-1">Avisos</h3>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                      {results.avisos.map((a, i) => (
                        <li key={i}>{a}</li>
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

export default Index;
