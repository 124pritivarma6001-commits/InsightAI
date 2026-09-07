import React from "react";
import {
  X,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Database,
  ArrowRight,
  ShieldCheck,
  Share2,
} from "lucide-react";
import type { InsightConfig } from "../types";

interface InsightDetailModalProps {
  insight: InsightConfig | null;
  isOpen: boolean;
  onClose: () => void;
  onExploreData?: () => void;
}

export default function InsightDetailModal({
  insight,
  isOpen,
  onClose,
  onExploreData,
}: InsightDetailModalProps) {
  if (!isOpen || !insight) return null;

  const priority = insight.priority || (insight.importance === "High Impact" ? "critical" : "important");
  const priorityTheme = {
    critical: {
      badgeBg: "bg-rose-50 border-rose-200 text-rose-700",
      dotBg: "bg-rose-500",
      label: "CRITICAL / HIGH PRIORITY",
    },
    important: {
      badgeBg: "bg-amber-50 border-amber-200 text-amber-700",
      dotBg: "bg-amber-500",
      label: "IMPORTANT",
    },
    informational: {
      badgeBg: "bg-indigo-50 border-indigo-200 text-indigo-700",
      dotBg: "bg-indigo-500",
      label: "INFORMATIONAL",
    },
  }[priority] || {
    badgeBg: "bg-slate-100 border-slate-200 text-slate-700",
    dotBg: "bg-slate-500",
    label: "OBSERVATION",
  };

  const deepDive = insight.deep_dive;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-[32px] shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase border ${priorityTheme.badgeBg}`}
            >
              <span className={`w-2 h-2 rounded-full ${priorityTheme.dotBg} animate-pulse`} />
              {priorityTheme.label}
            </span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {insight.category || "Analytical Signal"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800">
          {/* Main Title & Finding */}
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">
              {insight.title || insight.text}
            </h2>
            <div className="bg-indigo-50/60 border border-indigo-100/80 rounded-2xl p-4">
              <p className="text-sm font-bold text-indigo-950 leading-relaxed">
                "{insight.finding || insight.text}"
              </p>
              {insight.supporting_metric && (
                <div className="mt-2.5 pt-2 border-t border-indigo-200/60 flex items-center gap-2">
                  <span className="text-xs font-semibold text-indigo-700">Supporting Metric:</span>
                  <span className="text-xs font-mono font-black text-indigo-900 bg-white px-2 py-0.5 rounded-lg border border-indigo-200">
                    {insight.supporting_metric}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Key Data Points Pills (if available) */}
          {deepDive?.important_data_points && deepDive.important_data_points.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                Key Analytical Indicators
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {deepDive.important_data_points.map((pt, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">{pt.label}</p>
                    <p className="text-sm font-black font-mono text-slate-900 mt-0.5">{pt.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Why It Matters */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Why It Matters
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium bg-slate-50 border border-slate-100 rounded-xl p-3.5">
              {insight.why_it_matters ||
                insight.explanation ||
                "This observation represents a meaningful structural deviation or correlation that directly influences operational forecasting."}
            </p>
          </div>

          {/* Detailed Analytical Breakdown */}
          {deepDive?.full_explanation && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Detailed Statistical Assessment
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {deepDive.full_explanation}
              </p>
            </div>
          )}

          {/* Detected Pattern & Possible Cause */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {deepDive?.pattern && (
              <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  Detected Pattern
                </span>
                <span className="text-xs font-semibold text-slate-800">
                  {deepDive.pattern}
                </span>
              </div>
            )}
            {deepDive?.possible_explanation && (
              <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  Likely Operational Cause
                </span>
                <span className="text-xs font-semibold text-slate-800">
                  {deepDive.possible_explanation}
                </span>
              </div>
            )}
          </div>

          {/* Recommended Actions */}
          <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                Recommended Strategic Action
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-emerald-900 font-semibold mb-3">
              {insight.recommendation || "Review flagged attributes and adjust operational resources."}
            </p>

            {deepDive?.action_steps && deepDive.action_steps.length > 0 && (
              <ul className="space-y-2 border-t border-emerald-200/60 pt-3">
                {deepDive.action_steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-emerald-800 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Algorithmic Provenance Footer */}
          {insight.why_ai_found_this && (
            <div className="p-4 bg-slate-50 border border-slate-200/80 text-slate-700 rounded-2xl text-[11px] space-y-1.5 font-mono">
              <div className="flex items-center gap-1.5 text-indigo-700 font-bold uppercase tracking-wider text-[10px]">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Deterministic Calculation Provenance</span>
              </div>
              <p className="text-slate-500">
                Calculation: <span className="text-slate-800 font-semibold">{insight.why_ai_found_this.calculation}</span>
              </p>
              <p className="text-slate-500">
                Source Dimensions:{" "}
                <span className="text-indigo-700 font-semibold">
                  {insight.why_ai_found_this.source_columns?.join(", ")}
                </span>
              </p>
              <p className="text-slate-500">
                Reason: <span className="text-emerald-700 font-semibold">{insight.why_ai_found_this.reason}</span>
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            Close
          </button>
          {onExploreData && (
            <button
              onClick={() => {
                onClose();
                onExploreData();
              }}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <span>Inspect Records in Data Explorer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
