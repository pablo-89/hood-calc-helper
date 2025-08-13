import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ReferenceDot, ReferenceLine, ReferenceArea } from "recharts";

export interface FanCurvePoint { q: number; dp: number }

export function FanCurveChart({
  mainCurve,
  extraCurve,
  systemCurve,
  qTicks,
  dpTicks,
  qOp,
  dpOp,
  mainName,
  extraName,
  tolBox,
}: {
  mainCurve: FanCurvePoint[];
  extraCurve?: FanCurvePoint[];
  systemCurve?: FanCurvePoint[];
  qTicks?: number[];
  dpTicks?: number[];
  qOp: number;
  dpOp: number;
  mainName: string;
  extraName?: string;
  tolBox?: { qMin: number; qMax: number; dpMin: number; dpMax: number };
}) {
  return (
    <ChartContainer config={{ q: { label: "Q (m³/h)" }, dp: { label: "Δp (Pa)" } }}>
      <LineChart data={mainCurve} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="q" domain={qTicks ? [qTicks[0], qTicks[qTicks.length - 1]] : undefined} ticks={qTicks} tickFormatter={(v) => `${v}`} />
        <YAxis dataKey="dp" domain={dpTicks ? [dpTicks[0], dpTicks[dpTicks.length - 1]] : undefined} ticks={dpTicks} tickFormatter={(v) => `${v}`} />
        {qTicks?.map((x) => (
          <ReferenceLine key={`vx-${x}`} x={x} stroke="currentColor" strokeOpacity={0.08} />
        ))}
        {dpTicks?.map((y) => (
          <ReferenceLine key={`hy-${y}`} y={y} stroke="currentColor" strokeOpacity={0.08} />
        ))}
        {tolBox && (
          <ReferenceArea x1={tolBox.qMin} x2={tolBox.qMax} y1={tolBox.dpMin} y2={tolBox.dpMax} fill="hsl(var(--accent))" fillOpacity={0.08} />
        )}
        {systemCurve && systemCurve.length > 0 && (
          <Line type="monotone" dataKey="dp" name="Curva del sistema" data={systemCurve} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" dot={false} />
        )}
        <Line type="monotone" dataKey="dp" name={mainName} stroke="hsl(var(--primary))" dot={false} />
        {extraCurve && extraCurve.length > 0 && (
          <Line type="monotone" dataKey="dp" name={extraName ?? "Curva comparada"} data={extraCurve} stroke="hsl(var(--secondary))" dot={false} />
        )}
        <ReferenceLine x={Math.round(qOp)} stroke="hsl(var(--destructive))" strokeDasharray="4 4" />
        <ReferenceLine y={Math.round(dpOp)} stroke="hsl(var(--destructive))" strokeDasharray="4 4" />
        <ReferenceDot x={Math.round(qOp)} y={Math.round(dpOp)} r={4} fill="hsl(var(--destructive))" stroke="none" label={{ position: 'top', value: `Q=${Math.round(qOp)} Δp=${Math.round(dpOp)}` }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
      </LineChart>
    </ChartContainer>
  );
}