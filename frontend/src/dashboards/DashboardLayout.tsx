import type { DashboardConfig } from "../types";
import type { ActiveFilters } from "../components/FilterBar";
import KPICard from "../components/KPICard";
import InsightsPanel from "../components/InsightsPanel";
import FilterBar from "../components/FilterBar";
import ChartRenderer from "../charts/ChartRenderer";

/**
 * Renders a dashboard entirely from the backend-provided `config.layout`
 * array. No dashboard type is hardcoded here -- a Sales dataset produces
 * a completely different set of blocks than an HR or Student dataset,
 * purely driven by what the backend decided to include.
 */
export default function DashboardLayout({
  config,
  onFilterChange,
  onRegenerateChart,
}: {
  config: DashboardConfig;
  onFilterChange?: (active: ActiveFilters) => void;
  onRegenerateChart?: (chartId: string) => void;
}) {
  const kpiById = Object.fromEntries(config.kpis.map((k) => [k.id, k]));
  const chartById = Object.fromEntries(config.charts.map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      {config.layout.map((block, idx) => {
        switch (block.block_type) {
          case "filters":
            return (
              <FilterBar
                key={idx}
                filters={config.filters}
                onChange={onFilterChange ?? (() => {})}
              />
            );

          case "kpi_row":
            return (
              <div
                key={idx}
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${Math.min(block.columns, 4)}, minmax(0, 1fr))` }}
              >
                {block.refs.map((ref) => kpiById[ref] && <KPICard key={ref} kpi={kpiById[ref]} />)}
              </div>
            );

          case "chart":
            return (
              <div key={idx} className="grid grid-cols-1">
                {block.refs.map((ref) => {
                  const chart = chartById[ref];
                  if (!chart) return null;
                  return (
                    <div key={ref} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-slate-800">{chart.title}</h3>
                        {onRegenerateChart && (
                          <button
                            onClick={() => onRegenerateChart(chart.id)}
                            className="text-xs text-brand-600 hover:underline"
                          >
                            Regenerate
                          </button>
                        )}
                      </div>
                      <ChartRenderer chart={chart} />
                    </div>
                  );
                })}
              </div>
            );

          case "chart_grid":
            return (
              <div
                key={idx}
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${block.columns}, minmax(0, 1fr))` }}
              >
                {block.refs.map((ref) => {
                  const chart = chartById[ref];
                  if (!chart) return null;
                  return (
                    <div key={ref} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-slate-800">{chart.title}</h3>
                        {onRegenerateChart && (
                          <button
                            onClick={() => onRegenerateChart(chart.id)}
                            className="text-xs text-brand-600 hover:underline"
                          >
                            Regenerate
                          </button>
                        )}
                      </div>
                      <ChartRenderer chart={chart} />
                    </div>
                  );
                })}
              </div>
            );

          case "insights":
            return <InsightsPanel key={idx} insights={config.insights} />;

          default:
            return null;
        }
      })}
    </div>
  );
}
