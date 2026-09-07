import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { dashboardApi, datasetApi } from "../services/api";

const STEPS = [
  { key: "uploaded", label: "Dataset uploaded" },
  { key: "types", label: "Data types detected" },
  { key: "patterns", label: "Patterns analyzed" },
  { key: "insights", label: "Insights extracted" },
  { key: "charts", label: "Visualizations selected" },
  { key: "dashboard", label: "Dashboard generated" },
];

export default function Analysis() {
  const { datasetId } = useParams<{ datasetId: string }>();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!datasetId) return;
    let cancelled = false;

    const run = async () => {
      try {
        setStepIndex(1);
        await datasetApi.get(datasetId);
        if (cancelled) return;

        setStepIndex(2);
        await datasetApi.analyze(datasetId);
        if (cancelled) return;

        setStepIndex(3);
        await dashboardApi.recommendCharts(datasetId).catch(() => null);
        if (cancelled) return;

        setStepIndex(4);
        await dashboardApi.generateInsights(datasetId).catch(() => null);
        if (cancelled) return;

        setStepIndex(5);
        const dashboard = await dashboardApi.generate(datasetId);
        if (cancelled) return;

        setStepIndex(6);
        setTimeout(() => {
          if (!cancelled) navigate(`/dashboard/${dashboard.id}`);
        }, 500);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Analysis failed");
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [datasetId, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl shadow-sm p-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-6">Analyzing your dataset…</h2>
        <ul className="space-y-4">
          {STEPS.map((step, idx) => {
            const done = stepIndex > idx + 1 || (stepIndex === STEPS.length && idx === STEPS.length - 1);
            const active = stepIndex === idx + 1;
            return (
              <li key={step.key} className="flex items-center gap-3">
                {done ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : active ? (
                  <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
                )}
                <span className={done || active ? "text-slate-800" : "text-slate-400"}>{step.label}</span>
              </li>
            );
          })}
        </ul>

        {error && (
          <div className="mt-6 flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
            <XCircle className="w-4 h-4 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
