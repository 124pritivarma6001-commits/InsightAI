import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  Sparkles,
  BarChart3,
  Brain,
  FileSpreadsheet,
  CheckCircle2,
  TrendingUp,
  PieChart as PieIcon,
  Globe,
  Check,
} from "lucide-react";
import { datasetApi } from "../services/api";
import { Language, SUPPORTED_LANGUAGES, getStoredLanguage, setStoredLanguage, t } from "../utils/i18n";

export default function Landing() {
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [currentLang, setCurrentLang] = useState<Language>(getStoredLanguage());
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleLangChange = (e: any) => {
      if (e.detail) setCurrentLang(e.detail);
    };
    window.addEventListener("language_change", handleLangChange);
    return () => window.removeEventListener("language_change", handleLangChange);
  }, []);

  const handleLanguageChange = (lang: Language) => {
    setStoredLanguage(lang);
    setCurrentLang(lang);
    setLangDropdownOpen(false);
  };

  const handleFile = async (file: File) => {
    setError(null);

    // 1 GB Hard Limit check
    const ONE_GB = 1024 * 1024 * 1024;
    if (file.size > ONE_GB) {
      setError(t("fileSizeError", currentLang));
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    setUploadStatus(t("uploadingFile", currentLang));

    try {
      const dataset = await datasetApi.upload(file, (pct) => {
        setUploadProgress(pct);
        if (pct < 100) {
          setUploadStatus(`${t("uploadingFile", currentLang)} ${pct}%`);
        } else {
          setUploadStatus(t("processingDataset", currentLang));
        }
      });
      setUploadProgress(100);
      setUploadStatus(t("analyzingDataset", currentLang));
      setTimeout(() => {
        navigate(`/analysis/${dataset.id}`);
      }, 400);
    } catch (err: any) {
      const serverMsg = err?.response?.data?.detail;
      setError(serverMsg || (err instanceof Error ? err.message : "Upload failed. Please check your dataset format."));
      setLoading(false);
      setUploadProgress(null);
      setUploadStatus("");
    }
  };

  const handleSample = async (sampleType: "sales" | "marketing" | "healthcare" = "sales") => {
    setLoading(true);
    setError(null);
    setUploadProgress(null);
    setUploadStatus(t("processingDataset", currentLang));
    try {
      const dataset = await datasetApi.loadSample(sampleType);
      navigate(`/analysis/${dataset.id}`);
    } catch (err: any) {
      const serverMsg = err?.response?.data?.detail;
      setError(serverMsg || (err instanceof Error ? err.message : "Could not load sample dataset"));
      setLoading(false);
      setUploadStatus("");
    }
  };

  return (
    <div className="min-h-[calc(100vh-60px)] bg-gradient-to-br from-[#ECEBF7] via-[#F3F1F9] to-[#E9EDFB] px-4 md:px-8 py-8 md:py-12 flex flex-col justify-between items-center relative overflow-hidden">
      {/* Decorative ambient radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-indigo-200/40 via-purple-100/30 to-blue-200/30 blur-3xl pointer-events-none rounded-full" />

      {/* Top Bar Language Switcher */}
      <div className="w-full max-w-7xl mx-auto flex justify-end relative z-20 mb-2">
        <div className="relative">
          <button
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-white/90 hover:bg-white border border-slate-200/80 rounded-full text-xs font-bold text-slate-700 shadow-2xs backdrop-blur-md transition cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-600" />
            <span>
              {SUPPORTED_LANGUAGES.find((l) => l.code === currentLang)?.flag}{" "}
              {SUPPORTED_LANGUAGES.find((l) => l.code === currentLang)?.nativeLabel}
            </span>
          </button>

          {langDropdownOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-30 animate-in fade-in-50 zoom-in-95">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition cursor-pointer ${
                    currentLang === lang.code
                      ? "bg-indigo-50 font-bold text-indigo-700"
                      : "text-slate-700 hover:bg-slate-50 font-medium"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.nativeLabel}</span>
                  </span>
                  {currentLang === lang.code && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Hero Container */}
      <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10 my-auto">
        
        {/* Left Hero Column: Headline & Controls */}
        <div className="lg:col-span-7 text-center lg:text-left space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/80 border border-indigo-100/80 shadow-2xs backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-semibold text-indigo-700">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>AI-Powered Dashboard Generation</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
            {t("uploadTitle", currentLang)}
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
            {t("uploadSubtitle", currentLang)}
          </p>

          {/* Primary Action Button & Progress */}
          <div className="pt-2 flex flex-col items-center lg:items-start gap-4">
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 w-full">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold px-7 py-3.5 rounded-2xl shadow-lg shadow-indigo-600/25 transition-all transform active:scale-95 disabled:opacity-60 text-sm cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{loading ? uploadStatus || t("processingDataset", currentLang) : t("uploadAnyDataset", currentLang)}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>

            {/* Upload Progress Bar (Visible for Large Datasets) */}
            {loading && uploadProgress !== null && (
              <div className="w-full max-w-md bg-white p-3.5 rounded-2xl border border-indigo-100 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-2 text-indigo-700">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                    {uploadStatus}
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.max(5, uploadProgress)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Benchmark Domain Presets (Matching Reference Image) */}
          <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
            <span className="text-xs font-semibold text-slate-500">{t("testWithBenchmark", currentLang)}:</span>
            <button
              onClick={() => handleSample("sales")}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-white/90 hover:bg-white border border-slate-200/80 hover:border-amber-400 text-slate-800 text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-2xs transition cursor-pointer"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              {t("benchmarkSales", currentLang)}
            </button>
            <button
              onClick={() => handleSample("marketing")}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-white/90 hover:bg-white border border-slate-200/80 hover:border-blue-400 text-slate-800 text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-2xs transition cursor-pointer"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              {t("benchmarkMarketing", currentLang)}
            </button>
            <button
              onClick={() => handleSample("healthcare")}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-white/90 hover:bg-white border border-slate-200/80 hover:border-emerald-400 text-slate-800 text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-2xs transition cursor-pointer"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              {t("benchmarkHealthcare", currentLang)}
            </button>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-700 max-w-md">
              {error}
            </div>
          )}
        </div>

        {/* Right Hero Column: Graphical 3D Illustration Card Matching media_1788762211942.jpg */}
        <div className="lg:col-span-5 flex justify-center items-center">
          <div className="relative w-full max-w-[460px]">
            
            {/* Floating CSV badge */}
            <div className="absolute -top-4 left-10 z-20 bg-emerald-500 text-white rounded-2xl p-3 shadow-lg shadow-emerald-500/20 flex items-center justify-center font-bold text-xs transform -rotate-6">
              <FileSpreadsheet className="w-5 h-5" />
            </div>

            {/* Floating XLSX badge */}
            <div className="absolute top-16 -left-3 z-20 bg-green-600 text-white rounded-2xl p-3 shadow-lg shadow-green-600/20 flex items-center justify-center font-bold text-xs transform rotate-3">
              <span className="font-mono text-sm font-black">X</span>
            </div>

            {/* Top right "From Data to Insights" pill */}
            <div className="absolute -top-3 right-4 z-20 bg-white/95 border border-indigo-100 shadow-md rounded-full px-3.5 py-1.5 flex items-center gap-1.5 text-[11px] font-bold text-indigo-700">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>From Data to Insights ✨</span>
            </div>

            {/* Central Dashboard Mockup Card */}
            <div className="bg-white/95 backdrop-blur-xl border border-white/80 rounded-[32px] p-6 shadow-[0_20px_60px_rgba(45,35,80,0.12)] space-y-5">
              
              {/* Card Header with Traffic dots */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Automated Dashboard</span>
              </div>

              {/* Chart Mockups Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col justify-between h-28">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Volume Trend</span>
                  <div className="flex items-end gap-1.5 h-14 w-full px-1">
                    <div className="w-1/5 bg-indigo-200 rounded-t-md h-[40%]" />
                    <div className="w-1/5 bg-indigo-300 rounded-t-md h-[65%]" />
                    <div className="w-1/5 bg-indigo-400 rounded-t-md h-[55%]" />
                    <div className="w-1/5 bg-indigo-500 rounded-t-md h-[85%]" />
                    <div className="w-1/5 bg-indigo-600 rounded-t-md h-[100%]" />
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center justify-center h-28 relative">
                  <div className="w-16 h-16 rounded-full border-4 border-indigo-500 border-t-purple-400 border-r-amber-400 flex items-center justify-center">
                    <PieIcon className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Line Trend Simulation Graphic */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-700">Trajectory Curve</span>
                  <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> +18.4%
                  </span>
                </div>
                <div className="h-10 flex items-center">
                  <svg className="w-full h-8 overflow-visible" viewBox="0 0 200 40">
                    <path
                      d="M 0 30 Q 30 35, 60 20 T 120 15 T 160 25 T 200 5"
                      fill="none"
                      stroke="#6366F1"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <circle cx="200" cy="5" r="4" fill="#4F46E5" />
                  </svg>
                </div>
              </div>

              {/* Feature Check List Badges (Matching Screenshot) */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-indigo-50/60 p-2 rounded-xl border border-indigo-100/60">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Auto Visualizations</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-indigo-50/60 p-2 rounded-xl border border-indigo-100/60">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Detects Patterns & Anomalies</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-indigo-50/60 p-2 rounded-xl border border-indigo-100/60">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Interactive Dashboard & What-If</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Bottom 3 Feature Pipeline Cards (Matching Reference Screenshot) */}
      <div className="max-w-7xl w-full mx-auto grid grid-cols-1 md:grid-cols-3 gap-5 pt-10 pb-4 relative z-10">
        
        {/* Card 1: Understand (Soft Warm Amber) */}
        <div className="bg-[#FFF8F2]/90 border border-[#FDE3CF] rounded-3xl p-5 shadow-2xs hover:scale-[1.01] transition-transform">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">1. Understand</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Automatically profiles columns, types, distributions, and generates Data Quality Scores.
          </p>
        </div>

        {/* Card 2: Analyze (Soft Sky Blue) */}
        <div className="bg-[#F0F7FF]/90 border border-[#D3E7FC] rounded-3xl p-5 shadow-2xs hover:scale-[1.01] transition-transform">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700">
              <Brain className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">2. Analyze</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Runs correlation, itemized anomaly detection, trends, and K-Means segmentation with ML.
          </p>
        </div>

        {/* Card 3: Generate (Soft Lilac / Purple) */}
        <div className="bg-[#F8F5FF]/90 border border-[#E7DEFC] rounded-3xl p-5 shadow-2xs hover:scale-[1.01] transition-transform">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">3. Generate</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Selects the best charts, structures AI Insights, and assembles a live, interactive dashboard.
          </p>
        </div>

      </div>
    </div>
  );
}
