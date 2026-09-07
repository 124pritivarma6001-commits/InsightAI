import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { RefreshCw, Download, FileText, ArrowLeft, Loader2 } from "lucide-react";
import { dashboardApi, datasetApi } from "../services/api";
import type { DashboardConfig } from "../types";
import DashboardLayout from "../dashboards/DashboardLayout";
import InsightAIDashboard from "../dashboards/InsightAIDashboard";
import type { ActiveFilters } from "../components/FilterBar";

export default function Dashboard() {
  const { dashboardId } = useParams<{ dashboardId: string }>();
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});

  const load = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardApi.get(id);
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dashboardId) load(dashboardId);
  }, [dashboardId]);

  const handleRegenerate = async () => {
    if (!dashboardId) return;
    setRegenerating(true);
    try {
      const data = await dashboardApi.regenerate(dashboardId);
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  };

  const handleRegenerateChart = async () => {
    // Individual chart regeneration re-runs the full recommendation pass;
    // the backend then swaps in a freshly computed chart set.
    await handleRegenerate();
  };

  const handleExportCSV = () => {
    if (!config) return;
    const rows: string[] = ["metric,value"];
    config.kpis.forEach((k) => rows.push(`${k.label},${k.value}`));
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.title.replace(/\s+/g, "_")}_data.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportReport = () => {
    if (!config) return;
    const lines = [
      `${config.title}`,
      `Generated: ${config.generated_at ?? new Date().toISOString()}`,
      "",
      ...(config.summary ? ["Summary:", config.summary, ""] : []),
      "KPIs:",
      ...config.kpis.map((k) => `- ${k.label}: ${k.value}`),
      "",
      "AI Insights:",
      ...config.insights.map((i) => `- ${i.icon} ${i.text}`),
      ...(config.cleaning_report?.log.length
        ? ["", "Data Cleaning:", ...config.cleaning_report.log.map((l) => `- ${l}`)]
        : []),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.title.replace(/\s+/g, "_")}_report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    if (!config) return;
    const el = document.getElementById("dashboard-capture");
    if (!el) return;
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const canvas = await html2canvas(el, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pageWidth, imgHeight);
    pdf.save(`${config.title.replace(/\s+/g, "_")}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6">
        <div>
          <p className="text-red-600 font-medium">{error ?? "Dashboard not found"}</p>
          <Link to="/" className="text-brand-600 text-sm hover:underline mt-2 inline-block">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const handleLoadSample = async (sampleType: "sales" | "marketing" | "healthcare") => {
    setLoading(true);
    try {
      const sample = await datasetApi.loadSample(sampleType);
      const newDash = await dashboardApi.generate(sample.id);
      setConfig(newDash);
      window.history.pushState({}, "", `/dashboard/${newDash.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sample");
    } finally {
      setLoading(false);
    }
  };

  return (
    <InsightAIDashboard
      config={config}
      onRegenerate={handleRegenerate}
      regenerating={regenerating}
      onExportPDF={handleExportPDF}
      onExportCSV={handleExportCSV}
      onExportReport={handleExportReport}
      onLoadSample={handleLoadSample}
    />
  );
}
