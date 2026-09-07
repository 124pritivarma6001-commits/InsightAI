import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  ReferenceDot,
} from "recharts";
import type { ChartConfig } from "../types";

// Soft modern pastel palette aligned with enterprise reference UI
const PALETTE = [
  "#6366F1", // Indigo
  "#8B5CF6", // Violet
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#EC4899", // Pink
  "#F59E0B", // Amber
  "#06B6D4", // Cyan
  "#64748B", // Slate
];

// Custom sleek dark tooltip pill matching reference image
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-2xl shadow-xl border border-slate-800 text-xs flex flex-col gap-1.5 z-50 pointer-events-none">
        {label && <span className="font-bold text-slate-300 border-b border-slate-800 pb-1">{label}</span>}
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || "#8B5CF6" }} />
              <span className="text-slate-300">{entry.name}:</span>
            </div>
            <span className="font-bold font-mono text-white">
              {typeof entry.value === "number" ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

// Compact, readable number formatter for axis ticks (prevents label collisions)
function formatAxisNumber(val: any): string {
  if (typeof val !== "number") return String(val ?? "");
  const abs = Math.abs(val);
  if (abs >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
  if (Number.isInteger(val)) return String(val);
  return val.toFixed(1);
}

// Truncate long strings with ellipsis for axis labels
function truncateLabel(val: any, maxLen = 11): string {
  const str = String(val ?? "");
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}

export function getAxisLabels(chart: ChartConfig): { xLabel: string; yLabel: string } {
  if (chart.x_title && chart.y_title) {
    return { xLabel: chart.x_title, yLabel: chart.y_title };
  }
  switch (chart.type) {
    case "bar":
      return {
        xLabel: chart.x_title || (chart.x ? `${chart.x}` : "Category"),
        yLabel: chart.y_title || (chart.y?.[0] ? `Total ${chart.y[0]}` : "Aggregated Metric"),
      };
    case "horizontal_bar":
      return {
        xLabel: chart.x || chart.y?.[0] ? `${chart.x || chart.y?.[0]}` : "Measure Value",
        yLabel: chart.y?.[0] || chart.x ? `${chart.y?.[0] || chart.x}` : "Ranking Dimension",
      };
    case "line":
    case "area":
      return {
        xLabel: chart.x ? `${chart.x} (Chronological)` : "Date / Timeline",
        yLabel: chart.y && chart.y.length > 0 ? chart.y.join(" & ") : "Volume Value",
      };
    case "histogram":
      return {
        xLabel: chart.x ? `${chart.x} (Value Buckets)` : "Buckets",
        yLabel: "Frequency (Record Count)",
      };
    case "scatter":
      return {
        xLabel: chart.x ? `${chart.x}` : "Independent Variable (X)",
        yLabel: chart.y?.[0] ? `${chart.y[0]}` : "Dependent Variable (Y)",
      };
    case "box_plot":
      return {
        xLabel: chart.x ? `${chart.x} (Quartile Range)` : "Numerical Range",
        yLabel: "Dispersion & Outliers",
      };
    case "pie":
      return {
        xLabel: chart.x ? `${chart.x} Segments` : "Segments",
        yLabel: chart.y?.[0] ? `Proportion of ${chart.y[0]}` : "Share Percentage (%)",
      };
    case "heatmap":
      return {
        xLabel: "Pairwise Dimensions",
        yLabel: "Pearson Correlation (r)",
      };
    default:
      return {
        xLabel: chart.x || "Dimension",
        yLabel: chart.y?.[0] || "Value",
      };
  }
}

// Correlation Heatmap Table Component
function HeatmapGrid({ matrix }: { matrix: Record<string, Record<string, number>> }) {
  const cols = Object.keys(matrix || {});
  if (cols.length === 0) return <p className="text-xs text-slate-400 p-4">No correlation data available.</p>;

  const colorFor = (v: number) => {
    const intensity = Math.round(Math.abs(v) * 200);
    return v >= 0
      ? `rgb(${245 - intensity * 0.5}, ${245 - intensity * 0.5}, 255)`
      : `rgb(255, ${245 - intensity * 0.5}, ${245 - intensity * 0.5})`;
  };

  return (
    <div className="h-full w-full overflow-auto flex flex-col justify-center p-1">
      <table className="text-[11px] border-collapse w-full">
        <thead>
          <tr>
            <th className="p-1.5 text-left text-slate-400 font-semibold uppercase text-[10px]">Dimension</th>
            {cols.map((c) => (
              <th key={c} className="p-1.5 font-bold text-slate-700 text-center whitespace-nowrap text-[10px]" title={c}>
                {truncateLabel(c, 8)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {cols.map((row) => (
            <tr key={row}>
              <td className="p-1.5 font-semibold text-slate-700 whitespace-nowrap text-[10px]" title={row}>
                {truncateLabel(row, 10)}
              </td>
              {cols.map((col) => {
                const val = matrix[row]?.[col] ?? 0;
                return (
                  <td
                    key={col}
                    className="p-1.5 text-center font-mono font-bold text-[10px] rounded transition hover:scale-105"
                    style={{ backgroundColor: colorFor(val) }}
                    title={`${row} & ${col}: ${val >= 0 ? "+" : ""}${val.toFixed(2)}`}
                  >
                    {val.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Box Plot & Five-Number Summary Distribution Card
function BoxPlotView({ data }: { data: any }) {
  if (!data || data.min === undefined) return <p className="text-xs text-slate-400 p-4">Distribution data unavailable.</p>;

  const { min, q1, median, q3, max, mean, outlier_count } = data;
  const range = max - min || 1;
  const q1Pct = Math.max(0, Math.min(100, ((q1 - min) / range) * 100));
  const medianPct = Math.max(0, Math.min(100, ((median - min) / range) * 100));
  const q3Pct = Math.max(0, Math.min(100, ((q3 - min) / range) * 100));

  return (
    <div className="h-full w-full flex flex-col justify-center px-2 py-3 space-y-4">
      {/* 5-Number Metric Summary Grid */}
      <div className="grid grid-cols-5 gap-1.5 text-center bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Min</span>
          <span className="text-xs font-mono font-bold text-slate-800">{formatAxisNumber(min)}</span>
        </div>
        <div className="flex flex-col border-l border-slate-200">
          <span className="text-[10px] font-bold text-indigo-500 uppercase">Q1 (25%)</span>
          <span className="text-xs font-mono font-bold text-slate-800">{formatAxisNumber(q1)}</span>
        </div>
        <div className="flex flex-col border-l border-slate-200 bg-indigo-100/50 rounded-lg py-0.5">
          <span className="text-[10px] font-bold text-indigo-700 uppercase">Median</span>
          <span className="text-xs font-mono font-black text-indigo-900">{formatAxisNumber(median)}</span>
        </div>
        <div className="flex flex-col border-l border-slate-200">
          <span className="text-[10px] font-bold text-indigo-500 uppercase">Q3 (75%)</span>
          <span className="text-xs font-mono font-bold text-slate-800">{formatAxisNumber(q3)}</span>
        </div>
        <div className="flex flex-col border-l border-slate-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Max</span>
          <span className="text-xs font-mono font-bold text-slate-800">{formatAxisNumber(max)}</span>
        </div>
      </div>

      {/* Visual Interquartile Range Graphic */}
      <div className="relative pt-4 pb-2 px-1">
        {/* Whiskers Line */}
        <div className="h-1 bg-slate-200 rounded-full w-full relative">
          {/* IQR Box (Q1 to Q3) */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-5 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-md border border-indigo-700/30 shadow-xs"
            style={{ left: `${q1Pct}%`, width: `${Math.max(4, q3Pct - q1Pct)}%` }}
          />
          {/* Median Bar Marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-7 bg-amber-400 rounded-full shadow-md z-10"
            style={{ left: `${medianPct}%` }}
            title={`Median: ${median}`}
          />
        </div>

        {/* Labels below graphic */}
        <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-3 px-0.5">
          <span>{formatAxisNumber(min)}</span>
          <span className="text-indigo-600 font-bold">IQR: {formatAxisNumber(q3 - q1)}</span>
          <span>{formatAxisNumber(max)}</span>
        </div>
      </div>

      {/* Outliers and Mean Indicator */}
      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
        <span className="text-slate-500 text-[11px]">
          Sample Mean: <span className="font-bold text-slate-800 font-mono">{formatAxisNumber(mean)}</span>
        </span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
          outlier_count > 0 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
        }`}>
          {outlier_count > 0 ? `${outlier_count} Outliers Identified` : "Normal Distribution"}
        </span>
      </div>
    </div>
  );
}

export default function ChartRenderer({
  chart,
  compact = false,
}: {
  chart: ChartConfig;
  compact?: boolean;
}) {
  const data = chart.data as any;
  const axisLabels = getAxisLabels(chart);

  const renderChartBody = () => {
    switch (chart.type) {
      // 1. HERO LINE CHART
      case "line": {
        const seriesKeys = chart.y ?? [];
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 15, right: 20, left: 25, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                axisLine={{ stroke: "#E2E8F0" }}
                tickLine={false}
                dy={6}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
                width={45}
                tickFormatter={formatAxisNumber}
              />
              <Tooltip content={<CustomTooltip />} />
              {seriesKeys.length > 1 && (
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
              )}
              {seriesKeys.map((key: string, i: number) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={PALETTE[i % PALETTE.length]}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: PALETTE[i % PALETTE.length], strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              ))}
              {chart.markers?.map((marker, idx) => (
                <ReferenceDot
                  key={idx}
                  x={marker.period}
                  y={marker.value}
                  r={5}
                  fill="#EF4444"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  label={{ value: marker.type, position: "top", fill: "#EF4444", fontSize: 10, fontWeight: 600 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      }

      // 2. AREA CHART
      case "area": {
        const seriesKeys = chart.y ?? [];
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 15, right: 20, left: 25, bottom: 25 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                axisLine={{ stroke: "#E2E8F0" }}
                tickLine={false}
                dy={6}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
                width={45}
                tickFormatter={formatAxisNumber}
              />
              <Tooltip content={<CustomTooltip />} />
              {seriesKeys.map((key: string, i: number) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={PALETTE[i % PALETTE.length]}
                  fill="url(#areaGrad)"
                  strokeWidth={2.5}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
      }

      // 3. VERTICAL BAR CHART (Rotated labels, proper bottom margin)
      case "bar":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 15, right: 15, left: 25, bottom: 45 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#64748B" }}
                angle={-25}
                textAnchor="end"
                height={45}
                axisLine={{ stroke: "#E2E8F0" }}
                tickLine={false}
                interval={0}
                tickFormatter={(val) => truncateLabel(val, 12)}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
                width={45}
                tickFormatter={formatAxisNumber}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#6366F1" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        );

      // 4. HORIZONTAL BAR CHART (Perfect for Rankings & Long Category Names)
      case "horizontal_bar":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 15, right: 25, left: 20, bottom: 15 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: "#94A3B8" }}
                axisLine={{ stroke: "#E2E8F0" }}
                tickLine={false}
                tickFormatter={formatAxisNumber}
              />
              <YAxis
                dataKey="label"
                type="category"
                width={85}
                tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => truncateLabel(val, 12)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#8B5CF6" radius={[0, 6, 6, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        );

      // 5. DONUT / PIE CHART (Low-cardinality proportions)
      case "pie":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="44%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={4}
              >
                {(data ?? []).map((_: unknown, i: number) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="#FFFFFF" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, bottom: 0 }}
                formatter={(val) => truncateLabel(val, 14)}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      // 6. SCATTER PLOT (Sampled, non-overlapping axes)
      case "scatter":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 15, right: 20, left: 25, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis
                dataKey="x"
                name={chart.x ?? "X"}
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                axisLine={{ stroke: "#E2E8F0" }}
                tickFormatter={formatAxisNumber}
                dy={6}
              />
              <YAxis
                dataKey="y"
                name={chart.y?.[0] ?? "Y"}
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                axisLine={false}
                width={45}
                tickFormatter={formatAxisNumber}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={data} fill="#6366F1" opacity={0.65} />
            </ScatterChart>
          </ResponsiveContainer>
        );

      // 7. HISTOGRAM (Frequency Distribution)
      case "histogram":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 15, right: 15, left: 25, bottom: 45 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="bucket"
                tick={{ fontSize: 10, fill: "#64748B" }}
                angle={-25}
                textAnchor="end"
                height={45}
                axisLine={{ stroke: "#E2E8F0" }}
                tickLine={false}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
                width={40}
                tickFormatter={formatAxisNumber}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        );

      // 8. BOX PLOT (Distribution & Outlier Quartiles)
      case "box_plot":
        return <BoxPlotView data={data} />;

      // 9. CORRELATION HEATMAP
      case "heatmap":
        return <HeatmapGrid matrix={data} />;

      default:
        return <p className="text-xs text-slate-400 p-4">Visualization format unavailable for: {chart.type}</p>;
    }
  };

  return (
    <div className="h-full w-full flex flex-col justify-between overflow-hidden">
      {/* Dynamic X-Axis & Y-Axis Explanatory Subheadings */}
      <div className="flex items-center justify-between gap-2 px-1 pb-2 pt-0.5 text-[11px] font-medium text-slate-500 border-b border-slate-100/90 mb-2 shrink-0">
        <div className="flex items-center gap-1.5 truncate max-w-[50%]" title={axisLabels.xLabel}>
          <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
            X-Axis
          </span>
          <span className="font-semibold text-slate-700 truncate">{axisLabels.xLabel}</span>
        </div>
        <div className="flex items-center gap-1.5 truncate max-w-[50%]" title={axisLabels.yLabel}>
          <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded shrink-0">
            Y-Axis
          </span>
          <span className="font-semibold text-slate-700 truncate">{axisLabels.yLabel}</span>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="flex-1 w-full min-h-0 overflow-hidden relative">
        {renderChartBody()}
      </div>
    </div>
  );
}
