import React, { useState, useMemo } from "react";
import {
  X,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Search,
} from "lucide-react";
import type { InsightConfig } from "../types";

interface AllInsightsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  insights: InsightConfig[];
  domainName: string;
  onSelectInsight: (insight: InsightConfig) => void;
}

export default function AllInsightsDrawer({
  isOpen,
  onClose,
  insights,
  domainName,
  onSelectInsight,
}: AllInsightsDrawerProps) {
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredInsights = useMemo(() => {
    return insights.filter((ins) => {
      // Category / Priority filter
      if (filterCategory === "critical") {
        const p = ins.priority || (ins.importance === "High Impact" ? "critical" : "important");
        if (p !== "critical") return false;
      } else if (filterCategory === "important") {
        const p = ins.priority || (ins.importance === "High Impact" ? "critical" : "important");
        if (p !== "important") return false;
      } else if (filterCategory === "informational") {
        const p = ins.priority || (ins.importance === "High Impact" ? "critical" : "important");
        if (p !== "informational") return false;
      } else if (filterCategory !== "all" && ins.category !== filterCategory) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (ins.title || "").toLowerCase().includes(q);
        const findingMatch = (ins.finding || ins.text || "").toLowerCase().includes(q);
        const metricMatch = (ins.supporting_metric || "").toLowerCase().includes(q);
        return titleMatch || findingMatch || metricMatch;
      }

      return true;
    });
  }, [insights, filterCategory, searchQuery]);

  if (!isOpen) return null;

  const categories = [
    { id: "all", label: `All (${insights.length})` },
    {
      id: "critical",
      label: `Critical (${
        insights.filter(
          (i) =>
            (i.priority || (i.importance === "High Impact" ? "critical" : "important")) ===
            "critical"
        ).length
      })`,
    },
    {
      id: "important",
      label: `Important (${
        insights.filter(
          (i) =>
            (i.priority || (i.importance === "High Impact" ? "critical" : "important")) ===
            "important"
        ).length
      })`,
    },
    {
      id: "informational",
      label: `Informational (${
        insights.filter(
          (i) =>
            (i.priority || (i.importance === "High Impact" ? "critical" : "important")) ===
            "informational"
        ).length
      })`,
    },
    { id: "trend", label: `Trends (${insights.filter((i) => i.category === "trend").length})` },
    {
      id: "anomaly",
      label: `Anomalies (${insights.filter((i) => i.category === "anomaly").length})`,
    },
    {
      id: "correlation",
      label: `Correlations (${insights.filter((i) => i.category === "correlation").length})`,
    },
    {
      id: "ranking",
      label: `Rankings (${insights.filter((i) => i.category === "ranking").length})`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl border-l border-slate-200 flex flex-col transform transition-transform ease-in-out duration-300">
          
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    All AI Insights
                  </h2>
                  <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-100">
                    {insights.length} Total
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Data-driven findings across {domainName}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search & Category Tabs */}
          <div className="p-5 border-b border-slate-100 space-y-3 shrink-0 bg-white">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search findings by keyword, column, or metric..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFilterCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                    filterCategory === cat.id
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-100/80 hover:bg-slate-200/60 text-slate-600"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Insight Cards List */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {filteredInsights.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                No insights match the selected filter or search query.
              </div>
            ) : (
              filteredInsights.map((insight, idx) => {
                const priority =
                  insight.priority ||
                  (insight.importance === "High Impact" ? "critical" : "important");
                const priorityTheme = {
                  critical: {
                    badge: "bg-rose-50 text-rose-700 border-rose-200",
                    label: "HIGH PRIORITY",
                    dot: "bg-rose-500",
                  },
                  important: {
                    badge: "bg-amber-50 text-amber-700 border-amber-200",
                    label: "IMPORTANT",
                    dot: "bg-amber-500",
                  },
                  informational: {
                    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
                    label: "KEY FINDING",
                    dot: "bg-indigo-500",
                  },
                }[priority] || {
                  badge: "bg-slate-50 text-slate-700 border-slate-200",
                  label: "OBSERVATION",
                  dot: "bg-slate-400",
                };

                return (
                  <div
                    key={insight.id || idx}
                    className="bg-white border border-slate-200/80 rounded-2xl p-4.5 hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Priority + Category Row */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${priorityTheme.badge}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${priorityTheme.dot}`} />
                            {priorityTheme.label}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {insight.category}
                          </span>
                        </div>
                        {insight.supporting_metric && (
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100/80 px-2 py-0.5 rounded-lg text-[10px]">
                            {insight.supporting_metric}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-1.5">
                        {insight.title || insight.text}
                      </h3>

                      {/* One-Line Finding */}
                      <p className="text-xs text-slate-600 leading-relaxed mb-2.5">
                        "{insight.finding || insight.text}"
                      </p>

                      {/* Why It Matters */}
                      {insight.why_it_matters && (
                        <p className="text-[11px] text-slate-500 mb-2 leading-normal">
                          <span className="font-bold text-slate-700">Why it matters: </span>
                          {insight.why_it_matters}
                        </p>
                      )}

                      {/* Recommendation */}
                      {insight.recommendation && (
                        <p className="text-[11px] text-emerald-800 bg-emerald-50/70 border border-emerald-100 rounded-lg p-2 leading-normal mb-3">
                          <span className="font-bold text-emerald-950">Recommended action: </span>
                          {insight.recommendation}
                        </p>
                      )}
                    </div>

                    {/* View Details Button */}
                    <button
                      onClick={() => {
                        onSelectInsight(insight);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                    >
                      <span>View Deep Dive & Provenance</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
