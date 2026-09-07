import type { InsightConfig } from "../types";

const CATEGORY_STYLES: Record<string, string> = {
  trend: "bg-blue-50 border-blue-100",
  anomaly: "bg-amber-50 border-amber-100",
  correlation: "bg-purple-50 border-purple-100",
  ranking: "bg-green-50 border-green-100",
  segmentation: "bg-cyan-50 border-cyan-100",
};

export default function InsightsPanel({ insights }: { insights: InsightConfig[] }) {
  if (insights.length === 0) {
    return <p className="text-sm text-slate-500">No notable insights were detected for this dataset.</p>;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800 mb-3">AI Insights</h3>
      <ul className="space-y-2">
        {insights.map((insight) => (
          <li
            key={insight.id}
            className={`flex items-start gap-2 text-sm text-slate-700 border rounded-lg px-3 py-2 ${
              CATEGORY_STYLES[insight.category] ?? "bg-slate-50 border-slate-100"
            }`}
          >
            <span>{insight.icon}</span>
            <span>{insight.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
