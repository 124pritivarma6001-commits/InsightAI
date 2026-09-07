import { TrendingUp, TrendingDown, Activity, Database, List, Percent, Layers } from "lucide-react";
import type { KPIConfig } from "../types";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "trending-up": TrendingUp,
  activity: Activity,
  database: Database,
  list: List,
  percent: Percent,
  layers: Layers,
};

function formatValue(value: number | string): string {
  if (typeof value === "number") {
    if (Math.abs(value) >= 1000) {
      return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
    }
    return value.toString();
  }
  return value;
}

export default function KPICard({ kpi }: { kpi: KPIConfig }) {
  const Icon = ICONS[kpi.icon ?? ""] ?? Activity;
  const isPositive = (kpi.delta ?? 0) >= 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{kpi.label}</span>
        <Icon className="w-4 h-4 text-brand-500" />
      </div>
      <div className="text-2xl font-semibold text-slate-900">{formatValue(kpi.value)}</div>
      {kpi.delta !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {kpi.delta}% {kpi.delta_label ?? ""}
        </div>
      )}
    </div>
  );
}
