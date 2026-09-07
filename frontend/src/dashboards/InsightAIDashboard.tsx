import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/AuthContext';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Search,
  Download,
  RefreshCw,
  FileText,
  Sliders,
  MessageSquare,
  BarChart3,
  Layers,
  Database,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Table,
  HelpCircle,
  X,
  Activity,
  Award,
  LogOut,
  Filter,
  RotateCcw,
  Globe,
  Plus,
  Check,
  Trash2,
  Folder,
  Loader2,
} from 'lucide-react';
import type { DashboardConfig, FilterConfig, InsightConfig, DatasetSummary } from '../types';
import ChartRenderer from '../charts/ChartRenderer';
import { dashboardApi, datasetApi } from '../services/api';
import InsightDetailModal from '../components/InsightDetailModal';
import GlobalAICopilot from '../components/GlobalAICopilot';
import AllInsightsDrawer from '../components/AllInsightsDrawer';
import { Language, SUPPORTED_LANGUAGES, getStoredLanguage, setStoredLanguage, t } from '../utils/i18n';

interface InsightAIDashboardProps {
  config: DashboardConfig;
  onRegenerate: () => Promise<void>;
  regenerating: boolean;
  onExportPDF: () => void;
  onExportCSV: () => void;
  onExportReport: () => void;
  onLoadSample: (sampleType: 'sales' | 'marketing' | 'healthcare') => Promise<void>;
}

type TabType = 'dashboard' | 'insights' | 'whatif' | 'explorer' | 'quality' | 'clusters';

export default function InsightAIDashboard({
  config,
  onRegenerate,
  regenerating,
  onExportPDF,
  onExportCSV,
  onExportReport,
  onLoadSample,
}: InsightAIDashboardProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const [currentLang, setCurrentLang] = useState<Language>(getStoredLanguage());
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [datasetList, setDatasetList] = useState<DatasetSummary[]>([]);
  const [datasetDropdownOpen, setDatasetDropdownOpen] = useState(false);
  const [switchingDataset, setSwitchingDataset] = useState(false);
  const datasetUploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleLangChange = (e: any) => {
      if (e.detail) setCurrentLang(e.detail);
    };
    window.addEventListener('language_change', handleLangChange);
    return () => window.removeEventListener('language_change', handleLangChange);
  }, []);

  const handleLanguageChange = (lang: Language) => {
    setStoredLanguage(lang);
    setCurrentLang(lang);
    setLangDropdownOpen(false);
  };

  const loadDatasetList = () => {
    datasetApi.list()
      .then((data) => setDatasetList(data || []))
      .catch((err) => console.error('Failed to load dataset list', err));
  };

  useEffect(() => {
    loadDatasetList();
  }, [config.dataset_id]);

  const handleSwitchDataset = async (datasetId: string) => {
    if (datasetId === config.dataset_id) {
      setDatasetDropdownOpen(false);
      return;
    }
    setSwitchingDataset(true);
    setDatasetDropdownOpen(false);
    try {
      const newDash = await dashboardApi.generate(datasetId);
      navigate(`/dashboard/${newDash.id}`);
    } catch (err) {
      console.error('Failed to switch dataset:', err);
    } finally {
      setSwitchingDataset(false);
    }
  };

  const handleUploadNewDataset = async (file: File) => {
    const ONE_GB = 1024 * 1024 * 1024;
    if (file.size > ONE_GB) {
      alert(t('fileSizeError', currentLang));
      return;
    }
    setSwitchingDataset(true);
    setDatasetDropdownOpen(false);
    try {
      const ds = await datasetApi.upload(file);
      const newDash = await dashboardApi.generate(ds.id);
      navigate(`/dashboard/${newDash.id}`);
    } catch (err: any) {
      console.error('Failed to upload new dataset:', err);
      alert(err?.response?.data?.detail || 'Failed to upload dataset.');
    } finally {
      setSwitchingDataset(false);
    }
  };

  const handleDeleteDataset = async (datasetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (datasetList.length <= 1) {
      alert('Cannot delete the only available dataset.');
      return;
    }
    try {
      await datasetApi.remove(datasetId);
      loadDatasetList();
      if (datasetId === config.dataset_id) {
        const remaining = datasetList.filter((d) => d.id !== datasetId);
        if (remaining.length > 0) {
          handleSwitchDataset(remaining[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to delete dataset:', err);
    }
  };

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [timeRange, setTimeRange] = useState<'12m' | '30d' | '7d' | '24h'>('12m');

  // AI Insights Tab State
  const [insightFilter, setInsightFilter] = useState<string>('all');
  const [expandedWhy, setExpandedWhy] = useState<Record<string, boolean>>({});
  const [selectedInsightModal, setSelectedInsightModal] = useState<InsightConfig | null>(null);
  const [isInsightModalOpen, setIsInsightModalOpen] = useState<boolean>(false);
  const [isAllInsightsDrawerOpen, setIsAllInsightsDrawerOpen] = useState<boolean>(false);

  // Data Explorer Tab State
  const [explorerPage, setExplorerPage] = useState<number>(1);
  const [explorerSearch, setExplorerSearch] = useState<string>('');
  const [explorerInput, setExplorerInput] = useState<string>('');
  const [explorerData, setExplorerData] = useState<any>(null);
  const [explorerLoading, setExplorerLoading] = useState<boolean>(false);

  // Full dataset records for client-side filtering & recalculation
  const [datasetRows, setDatasetRows] = useState<Record<string, any>[]>([]);
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [showAllFilters, setShowAllFilters] = useState<boolean>(false);

  // Load dataset records when dashboard loads
  useEffect(() => {
    if (config.dataset_id) {
      let isMounted = true;
      datasetApi.get(config.dataset_id, 1, 5000)
        .then((data) => {
          if (isMounted && data?.preview_rows) {
            setDatasetRows(data.preview_rows);
          }
        })
        .catch((err) => console.error('Failed to load dataset records for filtering', err));
      return () => { isMounted = false; };
    }
  }, [config.dataset_id]);

  // Load explorer data when switching to explorer tab or changing page/search
  useEffect(() => {
    if (activeTab === 'explorer' && config.dataset_id) {
      let isMounted = true;
      setExplorerLoading(true);
      datasetApi.get(config.dataset_id, explorerPage, 20, explorerSearch)
        .then((data) => {
          if (isMounted) setExplorerData(data);
        })
        .catch((err) => console.error('Failed to load explorer data', err))
        .finally(() => {
          if (isMounted) setExplorerLoading(false);
        });
      return () => { isMounted = false; };
    }
  }, [activeTab, explorerPage, explorerSearch, config.dataset_id]);

  // What-If State - Deduplicated so each variable appears exactly once
  const whatIfDrivers = config.what_if_drivers || [];
  const uniqueDrivers = Array.from(new Set(whatIfDrivers.map((d) => d.driver).filter(Boolean)));
  
  const [driverCol, setDriverCol] = useState(uniqueDrivers[0] || '');
  
  // Available targets without duplicates and excluding the selected driver
  const availableTargets = Array.from(
    new Set(
      whatIfDrivers
        .filter((d) => d.driver === driverCol)
        .map((d) => d.target)
        .concat(whatIfDrivers.map((d) => d.target))
        .filter((t) => Boolean(t) && t !== driverCol)
    )
  );

  const [targetCol, setTargetCol] = useState(
    whatIfDrivers.find((d) => d.driver === (uniqueDrivers[0] || ''))?.target || availableTargets[0] || ''
  );
  const [pctChange, setPctChange] = useState<number>(10);
  const [whatIfResult, setWhatIfResult] = useState<any>(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);

  // Sync state if dataset changes
  useEffect(() => {
    if (whatIfDrivers.length > 0) {
      const drivers = Array.from(new Set(whatIfDrivers.map((d) => d.driver).filter(Boolean)));
      const firstDriver = drivers[0] || '';
      setDriverCol(firstDriver);
      const targets = Array.from(
        new Set(
          whatIfDrivers
            .filter((d) => d.driver === firstDriver)
            .map((d) => d.target)
            .concat(whatIfDrivers.map((d) => d.target))
            .filter((t) => Boolean(t) && t !== firstDriver)
        )
      );
      setTargetCol(targets[0] || '');
      setWhatIfResult(null);
    }
    setActiveFilters({});
  }, [config.dataset_id]);

  const handleDriverChange = (newDriver: string) => {
    setDriverCol(newDriver);
    const validTargets = Array.from(
      new Set(
        whatIfDrivers
          .filter((d) => d.driver === newDriver)
          .map((d) => d.target)
          .concat(whatIfDrivers.map((d) => d.target))
          .filter((t) => Boolean(t) && t !== newDriver)
      )
    );
    if (validTargets.length > 0 && (!validTargets.includes(targetCol) || targetCol === newDriver)) {
      setTargetCol(validTargets[0]);
    }
  };

  // Ask Data State
  const [questionInput, setQuestionInput] = useState('');
  const [askHistory, setAskHistory] = useState<Array<{ q: string; a: string; conf?: number; metric?: string }>>([]);
  const [askLoading, setAskLoading] = useState(false);

  const kpis = config.kpis || [];
  const charts = config.charts || [];
  const heroChart = charts.find((c) => c.type === 'line' || c.type === 'area') || charts[0];
  const secondaryCharts = charts.filter((c) => c.id !== heroChart?.id);

  // Categorized insights based on category
  const insights = config.insights || [];
  const priorityOrder = { critical: 0, important: 1, informational: 2 };
  const prioritizedInsights = useMemo(() => {
    return [...insights].sort((a, b) => {
      const pA = priorityOrder[(a.priority || (a.importance === 'High Impact' ? 'critical' : 'important')) as keyof typeof priorityOrder] ?? 2;
      const pB = priorityOrder[(b.priority || (b.importance === 'High Impact' ? 'critical' : 'important')) as keyof typeof priorityOrder] ?? 2;
      return pA - pB;
    }).slice(0, 5);
  }, [insights]);

  const trendInsights = insights.filter((i) => i.category === 'trend' || i.category === 'ranking');
  const riskInsights = insights.filter((i) => i.category === 'anomaly');
  const growthInsights = insights.filter((i) => i.category === 'correlation' || i.category === 'segmentation');

  const domainName = config.domain_name || config.domain || 'General Business';
  const rawConf = config.domain_confidence ?? 92;
  const domainConfidence = rawConf > 1 ? Math.round(rawConf) : Math.round(rawConf * 100);
  const quality = {
    overall_score: config.cleaning_report?.quality_score ?? 99.4,
    completeness_score: config.cleaning_report?.completeness_score ?? 100,
    consistency_score: config.cleaning_report?.consistency_score ?? 98.8,
    duplicate_score: config.cleaning_report?.duplicate_free_score ?? 100,
    status: (config.cleaning_report?.quality_score ?? 99.4) > 80 ? 'Production Ready' : 'Review Needed',
  };

  const clustersData = config.clustering_info as { clusters?: Array<{ cluster_id: number; cluster_name?: string; size: number; percentage: number; centroid?: Record<string, number> }> } | undefined;
  const clusters = clustersData?.clusters || [];
  const detailedAnomalies = config.detailed_anomalies || [];

  // -------------------------------------------------------------
  // Dynamic Slicer Filtering & Chart Recalculation Engine
  // -------------------------------------------------------------
  const availableFilters: FilterConfig[] = config.filters || [];

  const [sliderDebounceTimer, setSliderDebounceTimer] = useState<any>(null);

  const handleFilterChange = (col: string, val: any, isDebounced = false) => {
    if (isDebounced) {
      if (sliderDebounceTimer) clearTimeout(sliderDebounceTimer);
      const timer = setTimeout(() => {
        setActiveFilters((prev) => {
          const next = { ...prev };
          if (val === undefined || val === null || val === '' || val === 'All') {
            delete next[col];
          } else {
            next[col] = val;
          }
          return next;
        });
      }, 150);
      setSliderDebounceTimer(timer);
    } else {
      setActiveFilters((prev) => {
        const next = { ...prev };
        if (val === undefined || val === null || val === '' || val === 'All') {
          delete next[col];
        } else {
          next[col] = val;
        }
        return next;
      });
    }
  };

  const handleResetFilters = () => {
    setActiveFilters({});
  };

  const activeFilterCount = Object.keys(activeFilters).filter((k) => {
    const v = activeFilters[k];
    return v !== undefined && v !== null && v !== '' && v !== 'All';
  }).length;

  // Filter dataset rows by active criteria
  const filteredRows = useMemo(() => {
    const activeKeys = Object.keys(activeFilters).filter((k) => {
      const v = activeFilters[k];
      return v !== undefined && v !== null && v !== '' && v !== 'All';
    });

    if (activeKeys.length === 0 || datasetRows.length === 0) {
      return datasetRows;
    }

    return datasetRows.filter((row) => {
      for (const col of activeKeys) {
        const fVal = activeFilters[col];
        const rVal = row[col];

        if (Array.isArray(fVal) && fVal.length === 2) {
          const [minV, maxV] = fVal;
          if (typeof minV === 'string' && minV.includes('-')) {
            // Date filter
            const rowDate = String(rVal ?? '').slice(0, 10);
            if (minV && rowDate < minV) return false;
            if (maxV && rowDate > maxV) return false;
          } else {
            // Numeric filter
            const num = Number(rVal);
            if (isNaN(num)) return false;
            if (minV !== undefined && minV !== '' && num < Number(minV)) return false;
            if (maxV !== undefined && maxV !== '' && num > Number(maxV)) return false;
          }
        } else if (typeof fVal === 'string') {
          if (String(rVal ?? '').trim().toLowerCase() !== fVal.trim().toLowerCase()) {
            return false;
          }
        }
      }
      return true;
    });
  }, [datasetRows, activeFilters]);

  // Recalculate each chart's data dynamically from filteredRows
  const recalculateChartData = (chart: any, rows: Record<string, any>[]) => {
    if (rows.length === 0) return [];

    if (chart.type === 'bar') {
      const catCol = chart.x;
      const numCol = chart.y?.[0];
      if (!catCol || !numCol) return chart.data;
      const grouped: Record<string, number> = {};
      for (const r of rows) {
        const k = String(r[catCol] ?? 'Unknown');
        const v = Number(r[numCol]) || 0;
        grouped[k] = (grouped[k] || 0) + v;
      }
      return Object.entries(grouped)
        .map(([label, value]) => ({ label: label.slice(0, 18), value: Math.round(value * 100) / 100 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
    }

    if (chart.type === 'horizontal_bar') {
      const numCol = chart.x;
      const catCol = chart.y?.[0];
      if (!catCol || !numCol) return chart.data;
      const grouped: Record<string, number> = {};
      for (const r of rows) {
        const k = String(r[catCol] ?? 'Unknown');
        const v = Number(r[numCol]) || 0;
        grouped[k] = (grouped[k] || 0) + v;
      }
      return Object.entries(grouped)
        .map(([label, value]) => ({ label: label.slice(0, 18), value: Math.round(value * 100) / 100 }))
        .sort((a, b) => a.value - b.value)
        .slice(-8);
    }

    if (chart.type === 'pie') {
      const catCol = chart.x;
      const numCol = chart.y?.[0];
      if (!catCol || !numCol) return chart.data;
      const grouped: Record<string, number> = {};
      for (const r of rows) {
        const k = String(r[catCol] ?? 'Unknown');
        const v = Number(r[numCol]) || 0;
        grouped[k] = (grouped[k] || 0) + v;
      }
      return Object.entries(grouped)
        .map(([label, value]) => ({ label: label.slice(0, 15), value: Math.round(value * 100) / 100 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
    }

    if (chart.type === 'histogram') {
      const numCol = chart.x;
      const vals = rows.map((r) => Number(r[numCol])).filter((v) => !isNaN(v)).sort((a, b) => a - b);
      if (vals.length === 0) return [];
      const min = vals[0];
      const max = vals[vals.length - 1];
      const binCount = Math.min(8, Math.max(4, Math.floor(Math.sqrt(vals.length))));
      const binSize = (max - min) / binCount || 1;
      const bins = Array.from({ length: binCount }, (_, i) => ({
        bucket: `${Math.round(min + i * binSize)}–${Math.round(min + (i + 1) * binSize)}`,
        count: 0,
      }));
      for (const v of vals) {
        const idx = Math.min(binCount - 1, Math.floor((v - min) / binSize));
        if (bins[idx]) bins[idx].count++;
      }
      return bins;
    }

    if (chart.type === 'box_plot') {
      const numCol = chart.x;
      const vals = rows.map((r) => Number(r[numCol])).filter((v) => !isNaN(v)).sort((a, b) => a - b);
      if (vals.length === 0) return chart.data;
      const min = vals[0];
      const max = vals[vals.length - 1];
      const q1 = vals[Math.floor(vals.length * 0.25)];
      const median = vals[Math.floor(vals.length * 0.5)];
      const q3 = vals[Math.floor(vals.length * 0.75)];
      const sum = vals.reduce((a, b) => a + b, 0);
      const mean = sum / vals.length;
      const iqr = q3 - q1;
      const lower = q1 - 1.5 * iqr;
      const upper = q3 + 1.5 * iqr;
      const outlier_count = vals.filter((v) => v < lower || v > upper).length;
      return {
        metric: numCol,
        min,
        q1,
        median,
        q3,
        max,
        mean: Math.round(mean * 100) / 100,
        outlier_count,
      };
    }

    if (chart.type === 'scatter') {
      const colX = chart.x;
      const colY = chart.y?.[0];
      if (!colX || !colY) return chart.data;
      return rows
        .map((r) => ({ x: Number(r[colX]), y: Number(r[colY]) }))
        .filter((p) => !isNaN(p.x) && !isNaN(p.y))
        .slice(0, 60);
    }

    if (chart.type === 'line' || chart.type === 'area') {
      const dateCol = chart.x;
      const yCols = chart.y || [];
      if (!dateCol || yCols.length === 0) return chart.data;
      const dateMap: Record<string, Record<string, number>> = {};
      for (const r of rows) {
        const d = String(r[dateCol] ?? '').slice(0, 7);
        if (!d) continue;
        if (!dateMap[d]) dateMap[d] = {};
        for (const y of yCols) {
          dateMap[d][y] = (dateMap[d][y] || 0) + (Number(r[y]) || 0);
        }
      }
      return Object.entries(dateMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, metrics]) => ({
          date,
          ...metrics,
        }));
    }

    return chart.data;
  };

  // Recalculated secondary charts
  const activeSecondaryCharts = useMemo(() => {
    if (activeFilterCount === 0 || datasetRows.length === 0) {
      return secondaryCharts;
    }
    return secondaryCharts.map((c) => ({
      ...c,
      data: recalculateChartData(c, filteredRows),
    }));
  }, [secondaryCharts, datasetRows, filteredRows, activeFilterCount]);

  // Recalculated hero chart
  const activeHeroChart = useMemo(() => {
    if (!heroChart) return undefined;
    if (activeFilterCount === 0 || datasetRows.length === 0) {
      return heroChart;
    }
    return {
      ...heroChart,
      data: recalculateChartData(heroChart, filteredRows),
    };
  }, [heroChart, datasetRows, filteredRows, activeFilterCount]);

  // Recalculated dynamic KPIs based on filtered rows
  const activeKpis = useMemo(() => {
    if (activeFilterCount === 0 || datasetRows.length === 0 || filteredRows.length === 0) {
      return kpis;
    }
    const primaryMeasure = kpis[0]?.label?.replace('Total ', '') || '';
    let primarySum = 0;
    for (const r of filteredRows) {
      if (primaryMeasure in r) {
        primarySum += Number(r[primaryMeasure]) || 0;
      }
    }
    const formattedPrimary =
      Math.abs(primarySum) >= 1e6
        ? `${(primarySum / 1e6).toFixed(2)}M`
        : primarySum > 0
        ? primarySum.toLocaleString(undefined, { maximumFractionDigits: 2 })
        : kpis[0]?.value;

    return [
      {
        ...kpis[0],
        value: formattedPrimary,
        delta_label: `${filteredRows.length} filtered rows`,
      },
      {
        ...kpis[1],
        delta_label: `Filtered Segment`,
      },
      {
        ...kpis[2],
        delta_label: `Active Filter`,
      },
    ];
  }, [kpis, datasetRows, filteredRows, activeFilterCount]);

  const toggleWhy = (id: string) => {
    setExpandedWhy((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleRunWhatIf = async () => {
    if (!driverCol || !targetCol) return;
    setWhatIfLoading(true);
    try {
      const res = await dashboardApi.runWhatIf(config.dataset_id, driverCol, targetCol, pctChange);
      setWhatIfResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setWhatIfLoading(false);
    }
  };

  const handleAsk = async (queryText?: string) => {
    const q = queryText || questionInput;
    if (!q.trim()) return;
    setAskLoading(true);
    try {
      const res = await dashboardApi.askData(config.dataset_id, q);
      setAskHistory((prev) => [
        { q, a: res.answer, conf: res.confidence, metric: res.supporting_metric },
        ...prev,
      ]);
      if (!queryText) setQuestionInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setAskLoading(false);
    }
  };

  const filteredInsights = insights.filter((item) => {
    if (insightFilter === 'all') return true;
    if (insightFilter === 'critical' || insightFilter === 'important' || insightFilter === 'informational') {
      const p = item.priority || (item.importance === 'High Impact' ? 'critical' : 'important');
      return p === insightFilter;
    }
    return item.category === insightFilter;
  });

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'trend':
        return { label: 'Trend Trajectory', icon: TrendingUp, bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'anomaly':
        return { label: 'Statistical Anomaly', icon: AlertTriangle, bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'correlation':
        return { label: 'Metric Correlation', icon: Activity, bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'ranking':
        return { label: 'Top Performer', icon: Award, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'segmentation':
        return { label: 'Cohort Segment', icon: Layers, bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
      case 'recommendation':
        return { label: 'Strategic Action', icon: Lightbulb, bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      default:
        return { label: 'Key Finding', icon: Sparkles, bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const getImportanceBadge = (importance?: string) => {
    if (importance === 'High Impact') {
      return 'bg-rose-100/80 text-rose-800 border-rose-300';
    } else if (importance === 'Medium Impact') {
      return 'bg-amber-100/80 text-amber-800 border-amber-300';
    }
    return 'bg-blue-100/80 text-blue-800 border-blue-300';
  };

  const renderCompactInsightCard = (insight: InsightConfig, idx: number) => {
    const priority = insight.priority || (insight.importance === 'High Impact' ? 'critical' : 'important');
    const priorityStyle = {
      critical: {
        badge: 'bg-rose-50 text-rose-700 border-rose-200/80',
        label: t('criticalPriority', currentLang),
        icon: AlertTriangle,
      },
      important: {
        badge: 'bg-amber-50 text-amber-700 border-amber-200/80',
        label: t('importantPriority', currentLang),
        icon: CheckCircle2,
      },
      informational: {
        badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
        label: t('informationalPriority', currentLang),
        icon: Sparkles,
      },
    }[priority] || {
      badge: 'bg-slate-50 text-slate-700 border-slate-200',
      label: t('informationalPriority', currentLang),
      icon: Sparkles,
    };

    const IconComp = priorityStyle.icon;

    // Pastel styling rotation: soft lavender, soft sky blue, mint green, subtle peach
    const pastelVariants = [
      'bg-gradient-to-br from-[#FAF8FF] to-[#F3EEFF] border-[#E7DEFC] hover:border-[#D6C4FA]',
      'bg-gradient-to-br from-[#F0F7FF] to-[#E5F1FF] border-[#D3E7FC] hover:border-[#B6D8FA]',
      'bg-gradient-to-br from-[#F0FDF4] to-[#E1FBEB] border-[#CFEED9] hover:border-[#AEE5C1]',
      'bg-gradient-to-br from-[#FFF8F2] to-[#FEEDDF] border-[#FDE3CF] hover:border-[#FBCBA6]',
    ];
    const cardBg = pastelVariants[idx % pastelVariants.length];

    return (
      <div
        key={insight.id || idx}
        className={`${cardBg} border rounded-[24px] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between`}
      >
        <div>
          {/* Small priority indicator & category */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-0.5 rounded-full border ${priorityStyle.badge}`}>
              <IconComp className="w-3 h-3 shrink-0" />
              {priorityStyle.label}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {insight.category}
            </span>
          </div>

          {/* Short Title */}
          <h4 className="text-sm font-bold text-slate-900 tracking-tight mb-2 line-clamp-1" title={insight.title || insight.text}>
            {insight.title || insight.text}
          </h4>

          {/* One-Line Finding */}
          <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mb-3.5">
            {insight.finding || insight.text}
          </p>

          {/* One Important Highlighted Statistic */}
          {insight.supporting_metric ? (
            <div className="bg-white/80 backdrop-blur-xs border border-white/90 rounded-xl px-3 py-2 flex items-center justify-between mb-1 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('keyMetric', currentLang)}:</span>
              <span className="text-xs font-mono font-bold text-indigo-700">
                {insight.supporting_metric}
              </span>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-xs border border-white/90 rounded-xl px-3 py-2 flex items-center justify-between mb-1 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status:</span>
              <span className="text-xs font-semibold text-emerald-700">
                Validated
              </span>
            </div>
          )}
        </div>

        {/* View Details Action (Clean Light Button) */}
        <button
          onClick={() => {
            setSelectedInsightModal(insight);
            setIsInsightModalOpen(true);
          }}
          className="w-full mt-4 py-2 px-3 rounded-xl bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <span>{t('viewDetails', currentLang)}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ECEBF7] via-[#F3F1F9] to-[#E9EDFB] p-3 md:p-6 lg:p-8 flex justify-center items-start text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Floating Canvas with Soft Ambient Drop Shadow */}
      <div className="w-full max-w-[1560px] bg-white/90 backdrop-blur-xl rounded-[32px] shadow-[0_25px_70px_rgba(45,35,80,0.07)] border border-white/80 flex overflow-hidden min-h-[92vh]">
        
        {/* Sleek Vertical Navigation Sidebar */}
        <aside className="w-20 md:w-64 bg-slate-50/60 border-r border-slate-100 p-5 flex flex-col justify-between shrink-0 transition-all duration-300">
          <div className="space-y-7">
            {/* Brand Logo */}
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-indigo-900 flex items-center justify-center shadow-lg shadow-indigo-950/20 text-white font-black text-lg tracking-wider">
                IA
              </div>
              <div className="hidden md:block">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-900 tracking-tight text-base">InsightAI</span>
                  <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">v2.0</span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">Automated Analyst</p>
              </div>
            </div>

            {/* Navigation Menus */}
            <nav className="space-y-1.5">
              <p className="hidden md:block text-[11px] font-semibold tracking-wider text-slate-400 uppercase px-3 mb-2">
                Main
              </p>
              
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">{t("navDashboard", currentLang)}</span>
              </button>

              <button
                onClick={() => setActiveTab('insights')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'insights'
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
                  <span className="hidden md:inline">{t("navInsights", currentLang)}</span>
                </div>
                <span className={`hidden md:inline text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'insights' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {insights.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('whatif')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'whatif'
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Sliders className="w-4 h-4 shrink-0" />
                  <span className="hidden md:inline">{t("navWhatIf", currentLang)}</span>
                </div>
                <span className="hidden md:inline bg-indigo-500/20 text-indigo-400 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  ML
                </span>
              </button>

              <button
                onClick={() => setActiveTab('explorer')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'explorer'
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Table className="w-4 h-4 shrink-0" />
                  <span className="hidden md:inline">{t("navExplorer", currentLang)}</span>
                </div>
                <span className="hidden md:inline bg-blue-500/10 text-blue-600 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  Live
                </span>
              </button>

              <p className="hidden md:block text-[11px] font-semibold tracking-wider text-slate-400 uppercase px-3 pt-4 mb-2">
                Intelligence & Auditing
              </p>

              <button
                onClick={() => setActiveTab('quality')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'quality'
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span className="hidden md:inline">{t("navQuality", currentLang)}</span>
                </div>
                <span className="hidden md:inline text-[10px] font-bold text-emerald-600">
                  {quality.overall_score}%
                </span>
              </button>

              <button
                onClick={() => setActiveTab('clusters')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'clusters'
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Layers className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">{t("navClusters", currentLang)}</span>
              </button>
            </nav>
          </div>

          {/* Bottom Sidebar: Sample Switcher & Cleaned Download */}
          <div className="pt-4 border-t border-slate-200/60 space-y-3">
            <div className="hidden md:block">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Load Benchmark Domain
              </p>
              <div className="grid grid-cols-3 gap-1 bg-slate-200/60 p-1 rounded-xl text-[10px] font-bold text-center">
                <button
                  onClick={() => onLoadSample('sales')}
                  className="py-1.5 rounded-lg hover:bg-white transition text-slate-700 hover:shadow-xs cursor-pointer"
                >
                  Sales
                </button>
                <button
                  onClick={() => onLoadSample('marketing')}
                  className="py-1.5 rounded-lg hover:bg-white transition text-slate-700 hover:shadow-xs cursor-pointer"
                >
                  Mktg
                </button>
                <button
                  onClick={() => onLoadSample('healthcare')}
                  className="py-1.5 rounded-lg hover:bg-white transition text-slate-700 hover:shadow-xs cursor-pointer"
                >
                  Health
                </button>
              </div>
            </div>

            <a
              href={datasetApi.downloadCleanedUrl(config.dataset_id)}
              download
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition"
            >
              <Database className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">Download Cleaned CSV</span>
            </a>
          </div>
        </aside>

        {/* Main Workspace Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-transparent overflow-y-auto max-h-[92vh]">
          {/* Top Header Bar */}
          <header className="h-20 border-b border-slate-100 px-5 lg:px-7 flex items-center justify-between gap-3 shrink-0 bg-white/70 backdrop-blur-md sticky top-0 z-20">
            
            {/* Title & Domain Tag */}
            <div className="flex flex-col justify-center min-w-0 flex-1 mr-2">
              <h1 className="text-base lg:text-lg font-black text-slate-900 tracking-tight truncate" title={config.title}>
                {config.title || 'Executive Decision Dashboard'}
              </h1>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate mt-0.5">
                <span className="inline-flex items-center gap-1 font-bold text-slate-700 shrink-0">
                  <Database className="w-3 h-3 text-indigo-600" />
                  {domainName}
                </span>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-emerald-200/80 shrink-0">
                  {domainConfidence}%
                </span>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="text-slate-400 text-[11px] truncate hidden sm:inline" title={config.domain_reasoning}>
                  {config.domain_reasoning || 'Automated classification based on semantic column schema detection'}
                </span>
              </div>
            </div>

            {/* Quick Actions & Header Tools */}
            <div className="flex items-center gap-1.5 lg:gap-2 shrink-0 flex-nowrap">
              
              {/* Dataset Selector Dropdown (Multi-dataset management) */}
              <div className="relative">
                <button
                  onClick={() => setDatasetDropdownOpen(!datasetDropdownOpen)}
                  disabled={switchingDataset}
                  className="flex items-center gap-1.5 px-2.5 py-2 bg-slate-100/90 hover:bg-slate-200/90 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer border border-slate-200/80 shadow-2xs"
                  title="Switch Dataset"
                >
                  <Database className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="hidden xl:inline max-w-[100px] truncate">
                    {datasetList.find((d) => d.id === config.dataset_id)?.filename || config.title || t('activeDataset', currentLang)}
                  </span>
                  <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0">
                    {datasetList.length || 1}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                </button>

                {datasetDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-30 animate-in fade-in-50 zoom-in-95">
                    <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        {t('datasetsCount', currentLang)} ({datasetList.length})
                      </span>
                      <button
                        onClick={() => datasetUploadInputRef.current?.click()}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{t('addDataset', currentLang)}</span>
                      </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-1 py-1">
                      {datasetList.map((ds) => {
                        const isActive = ds.id === config.dataset_id;
                        return (
                          <div
                            key={ds.id}
                            onClick={() => handleSwitchDataset(ds.id)}
                            className={`px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-xs transition cursor-pointer ${
                              isActive ? 'bg-indigo-50 font-bold text-indigo-700' : 'hover:bg-slate-50 text-slate-700 font-medium'
                            }`}
                          >
                            <div className="min-w-0 flex items-center gap-2">
                              <Folder className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold leading-tight">{ds.filename}</p>
                                <p className="text-[10px] text-slate-400 font-normal">
                                  {ds.row_count?.toLocaleString()} rows • {ds.column_count} cols
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {isActive && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                              {datasetList.length > 1 && (
                                <button
                                  onClick={(e) => handleDeleteDataset(ds.id, e)}
                                  title="Delete dataset"
                                  className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <input
                      ref={datasetUploadInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleUploadNewDataset(e.target.files[0]);
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Language Switcher Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-2 bg-slate-100/90 hover:bg-slate-200/90 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer border border-slate-200/80 shadow-2xs"
                  title="Change Language"
                >
                  <Globe className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="hidden sm:inline text-xs">
                    {SUPPORTED_LANGUAGES.find((l) => l.code === currentLang)?.flag}{' '}
                    {SUPPORTED_LANGUAGES.find((l) => l.code === currentLang)?.nativeLabel}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                </button>

                {langDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-36 bg-white rounded-2xl shadow-xl border border-slate-100 py-1 z-30 animate-in fade-in-50 zoom-in-95">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition cursor-pointer ${
                          currentLang === lang.code
                            ? 'bg-indigo-50 font-bold text-indigo-700'
                            : 'text-slate-700 hover:bg-slate-50 font-medium'
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

              <button
                onClick={onRegenerate}
                disabled={regenerating}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                title="Regenerate AI Visualizations"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin text-indigo-600' : ''}`} />
                <span className="hidden xl:inline">{regenerating ? '...' : t('regenerate', currentLang)}</span>
              </button>

              <button
                onClick={onExportReport}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                title="Export AI Executive Summary Report"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden xl:inline">{t('aiReport', currentLang)}</span>
              </button>

              <button
                onClick={onExportPDF}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t('exportPdf', currentLang)}</span>
              </button>

              <div className="h-5 w-[1px] bg-slate-200 mx-0.5 hidden sm:block"></div>

              {/* User Avatar */}
              <div
                title={user?.email || 'User Profile'}
                className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 border border-white shadow-2xs flex items-center justify-center text-white font-bold text-xs shrink-0"
              >
                {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : 'IA'}
              </div>

              {/* Working Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-bold transition shrink-0 cursor-pointer"
                title="Log out of session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('logout', currentLang)}</span>
              </button>
            </div>
          </header>

          {/* Dynamic Views: Dashboard / AI Insights / What-If / Ask Data / Data Explorer / Quality / Clusters */}
          <div className="p-6 lg:p-8 space-y-7">
            
            {/* 1. MAIN DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
              <>
                {/* 3 Pastel KPI Cards + 1 Pro Upgrade Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                  
                  {/* Card 1: Warm Amber/Peach Pastel */}
                  <div className="bg-gradient-to-br from-[#FFF3EB] to-[#FFE8D6] border border-[#FCD8C1]/60 p-5 rounded-[24px] shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#8C4A26] uppercase tracking-wider">
                        {activeKpis[0]?.label || 'Primary Volume'}
                      </span>
                      <span className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-amber-700 shadow-2xs">
                        <TrendingUp className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="mt-4">
                      <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                        {activeKpis[0]?.value ?? '-'}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-emerald-700">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>{activeKpis[0]?.delta_label || 'Aggregated'}</span>
                        <span className="text-slate-400 font-normal ml-1">dataset signal</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Soft Sky Blue Pastel */}
                  <div className="bg-gradient-to-br from-[#EBF5FF] to-[#DBEAFE] border border-[#BFDBFE]/60 p-5 rounded-[24px] shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#1E40AF] uppercase tracking-wider">
                        {activeKpis[1]?.label || 'Secondary Metric'}
                      </span>
                      <span className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-blue-700 shadow-2xs">
                        <Zap className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="mt-4">
                      <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                        {activeKpis[1]?.value ?? '-'}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-emerald-700">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>{activeKpis[1]?.delta_label || 'Calculated'}</span>
                        <span className="text-slate-400 font-normal ml-1">distribution</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Muted Lilac/Slate Pastel */}
                  <div className="bg-gradient-to-br from-[#F5F3FF] to-[#EDE9FE] border border-[#DDD6FE]/60 p-5 rounded-[24px] shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#5B21B6] uppercase tracking-wider">
                        {activeKpis[2]?.label || 'Data Quality Score'}
                      </span>
                      <span className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-indigo-700 shadow-2xs">
                        <BarChart3 className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="mt-4">
                      <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                        {activeKpis[2]?.value ?? `${quality.overall_score}%`}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-emerald-700">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>{activeKpis[2]?.delta_label || 'Cleaned & Validated'}</span>
                        <span className="text-slate-400 font-normal ml-1">hygiene</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: AI Autonomous Health & Domain (Clean Light Card) */}
                  <div className="bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/60 border border-indigo-100/90 p-5 rounded-[24px] shadow-sm flex flex-col justify-between text-slate-800 relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="inline-flex items-center gap-1.5 bg-indigo-100/70 text-indigo-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-indigo-200/60">
                        <Sparkles className="w-3 h-3 text-indigo-600" /> AI Autonomous
                      </div>
                      <h4 className="mt-3 text-sm font-bold text-slate-900 tracking-tight">
                        Real-Time ML Pipeline
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Domain: <span className="font-bold text-slate-800">{domainName}</span>. Quality: <span className="text-emerald-700 font-bold">{quality.overall_score}%</span>.
                      </p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-indigo-100/80 flex items-center justify-between relative z-10">
                      <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Verified Active
                      </span>
                      <button 
                        onClick={() => setActiveTab('quality')}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                      >
                        Audit <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Hero Trend Chart with Time Period Selector (Full Width) */}
                <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm flex flex-col justify-between">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 tracking-tight">
                          {activeHeroChart ? activeHeroChart.title : 'Performance Trajectory'}
                        </h3>
                        <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Hero Trend
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {activeHeroChart?.subtitle || 'Autonomously identified primary volume driver over chronological periods'}
                      </p>
                    </div>

                    {/* Time Period Filter Pill Buttons */}
                    <div className="flex items-center bg-slate-100/90 p-1 rounded-xl text-xs font-semibold text-slate-600">
                      {(['12m', '30d', '7d', '24h'] as const).map((period) => (
                        <button
                          key={period}
                          onClick={() => setTimeRange(period)}
                          className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                            timeRange === period
                              ? 'bg-white text-slate-900 shadow-2xs font-bold'
                              : 'hover:text-slate-900'
                          }`}
                        >
                          {period.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chart Container with Reference Tooltip */}
                  <div className="w-full h-[340px] min-h-[300px] overflow-hidden pt-1">
                    {activeHeroChart ? (
                      <ChartRenderer chart={activeHeroChart} />
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                        No trend chart available
                      </div>
                    )}
                  </div>
                </div>

                {/* Interactive Data Slicers & Filters Section */}
                <div className="bg-white border border-slate-100 rounded-[28px] p-5 lg:p-6 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                        <Filter className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Interactive Data Slicers</h3>
                          {activeFilterCount > 0 ? (
                            <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs animate-fadeIn">
                              {activeFilterCount} Active Slicer{activeFilterCount > 1 ? 's' : ''} ({filteredRows.length} records)
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                              Showing All Records ({datasetRows.length || config.kpis[0]?.raw_value || '–'})
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Dynamically filter and recalculate all visualizations in real-time without reloading.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {availableFilters.length > 4 && (
                        <button
                          onClick={() => setShowAllFilters(!showAllFilters)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition cursor-pointer"
                        >
                          {showAllFilters ? 'Fewer Slicers' : `More Slicers (${availableFilters.length - 4})`}
                        </button>
                      )}

                      {activeFilterCount > 0 && (
                        <button
                          onClick={handleResetFilters}
                          className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Clear All Filters</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Slicers Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
                    {(showAllFilters ? availableFilters : availableFilters.slice(0, 4)).map((f) => (
                      <div key={f.id} className="bg-slate-50 border border-slate-200/70 p-3 rounded-2xl flex flex-col justify-between gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate" title={f.column}>
                          {f.column}
                        </label>
                        
                        {f.type === 'categorical' ? (
                          <select
                            value={activeFilters[f.column] || 'All'}
                            onChange={(e) => handleFilterChange(f.column, e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                          >
                            <option value="All">All {f.column} ({f.options?.length || 0})</option>
                            {(f.options || []).map((opt) => (
                              <option key={String(opt)} value={String(opt)}>
                                {String(opt)}
                              </option>
                            ))}
                          </select>
                        ) : f.type === 'numeric_range' ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              placeholder={`Min (${f.min ?? 0})`}
                              value={activeFilters[f.column]?.[0] ?? ''}
                              onChange={(e) => {
                                const current = activeFilters[f.column] ?? [f.min, f.max];
                                handleFilterChange(f.column, [e.target.value === '' ? undefined : Number(e.target.value), current[1]]);
                              }}
                              className="w-1/2 bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                            <span className="text-[10px] text-slate-400 font-bold">–</span>
                            <input
                              type="number"
                              placeholder={`Max (${f.max ?? 100})`}
                              value={activeFilters[f.column]?.[1] ?? ''}
                              onChange={(e) => {
                                const current = activeFilters[f.column] ?? [f.min, f.max];
                                handleFilterChange(f.column, [current[0], e.target.value === '' ? undefined : Number(e.target.value)]);
                              }}
                              className="w-1/2 bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                          </div>
                        ) : f.type === 'date_range' ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="date"
                              value={activeFilters[f.column]?.[0] ?? ''}
                              onChange={(e) => {
                                const current = activeFilters[f.column] ?? ['', ''];
                                handleFilterChange(f.column, [e.target.value, current[1]]);
                              }}
                              className="w-1/2 bg-white border border-slate-200 rounded-xl px-2 py-1 text-[11px] font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                            <span className="text-[10px] text-slate-400 font-bold">–</span>
                            <input
                              type="date"
                              value={activeFilters[f.column]?.[1] ?? ''}
                              onChange={(e) => {
                                const current = activeFilters[f.column] ?? ['', ''];
                                handleFilterChange(f.column, [current[0], e.target.value]);
                              }}
                              className="w-1/2 bg-white border border-slate-200 rounded-xl px-2 py-1 text-[11px] font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  {/* Active Filters Chips */}
                  {activeFilterCount > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Criteria:</span>
                      {Object.entries(activeFilters).map(([col, val]) => {
                        let label = '';
                        if (Array.isArray(val)) {
                          label = `${col}: ${val[0] ?? 'Min'} – ${val[1] ?? 'Max'}`;
                        } else {
                          label = `${col}: ${val}`;
                        }
                        return (
                          <span
                            key={col}
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-3 py-1 rounded-full animate-fadeIn shadow-2xs"
                          >
                            <span>{label}</span>
                            <button
                              onClick={() => handleFilterChange(col, undefined)}
                              className="hover:text-rose-600 transition ml-0.5 cursor-pointer"
                              title="Remove filter"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Bottom Row: Additional Recommended Visualizations */}
                {filteredRows.length === 0 ? (
                  <div className="bg-white border border-slate-100 rounded-[28px] p-12 text-center shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">No Data Available for Selected Filters</h3>
                    <p className="text-xs text-slate-400 mb-4 max-w-md mx-auto">
                      No records match the current slicer criteria. Adjust your filter values or clear filters to view all dataset insights.
                    </p>
                    <button
                      onClick={handleResetFilters}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
                    >
                      Clear All Filters
                    </button>
                  </div>
                ) : activeSecondaryCharts.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-slate-600" />
                        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                          Multi-Dimensional Breakdowns
                        </h3>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        {activeSecondaryCharts.length} complementary views
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {activeSecondaryCharts.map((chart) => (
                        <div
                          key={chart.id}
                          className="bg-white border border-slate-100 rounded-[28px] p-5 lg:p-6 shadow-sm flex flex-col justify-between h-[420px] min-h-[420px] overflow-hidden hover:shadow-md transition-shadow"
                        >
                          <div className="shrink-0 mb-2">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h4 className="text-sm font-bold text-slate-900 truncate" title={chart.title}>
                                {chart.title}
                              </h4>
                              {chart.ai_recommended && (
                                <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200/50 shrink-0">
                                  AI Pick
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-1" title={chart.why_this_chart || chart.subtitle}>
                              {chart.why_this_chart || chart.subtitle || 'Synthesized distribution'}
                            </p>
                          </div>
                          
                          <div className="flex-1 w-full min-h-0 overflow-hidden pt-1">
                            <ChartRenderer chart={chart} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 2. DEDICATED AI INSIGHTS TAB */}
            {activeTab === 'insights' && (
              <div className="space-y-6">
                
                {/* AI Executive Summary Banner - Light Design */}
                <div className="bg-white border border-slate-100 rounded-[28px] p-6 lg:p-7 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                            AI Insights & Strategic Synthesis
                          </h2>
                          <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-100">
                            {insights.length} Patterns Found
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Prioritized, data-driven observations categorized by operational relevance across {domainName}.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsAllInsightsDrawerOpen(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200/60 px-3.5 py-1.5 rounded-full transition cursor-pointer shadow-2xs"
                    >
                      <span>Open Search & Filter Drawer</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Key Takeaways */}
                  {config.key_takeaways && config.key_takeaways.length > 0 && (
                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                        Core Strategic Takeaways:
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {config.key_takeaways.map((takeaway, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 bg-slate-50 border border-slate-100 rounded-xl p-3">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="text-xs text-slate-700 font-medium leading-normal">{takeaway}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Filter Pills Bar */}
                <div className="flex flex-wrap items-center gap-2 pb-1">
                  {[
                    { id: 'all', label: `All Findings (${insights.length})` },
                    { id: 'critical', label: `Critical (${insights.filter((i) => (i.priority || (i.importance === 'High Impact' ? 'critical' : 'important')) === 'critical').length})` },
                    { id: 'important', label: `Important (${insights.filter((i) => (i.priority || (i.importance === 'High Impact' ? 'critical' : 'important')) === 'important').length})` },
                    { id: 'informational', label: `Informational (${insights.filter((i) => (i.priority || (i.importance === 'High Impact' ? 'critical' : 'important')) === 'informational').length})` },
                    { id: 'trend', label: `Trends (${insights.filter((i) => i.category === 'trend').length})` },
                    { id: 'anomaly', label: `Anomalies (${insights.filter((i) => i.category === 'anomaly').length})` },
                    { id: 'correlation', label: `Correlations (${insights.filter((i) => i.category === 'correlation').length})` },
                    { id: 'ranking', label: `Rankings (${insights.filter((i) => i.category === 'ranking').length})` },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setInsightFilter(filter.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                        insightFilter === filter.id
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                {/* Prioritized Insight Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredInsights.map((insight, idx) => renderCompactInsightCard(insight, idx))}
                </div>

              </div>
            )}

            {/* 3. DATA EXPLORER TAB */}
            {activeTab === 'explorer' && (
              <div className="space-y-6">
                
                {/* Explorer Header & Controls */}
                <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <Table className="w-4 h-4" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">
                        Interactive Dataset Explorer
                      </h3>
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                        Cleaned Data Engine
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Displaying verified records with semantic column types and anomaly flags.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <a
                      href={datasetApi.downloadCleanedUrl(config.dataset_id)}
                      download
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Cleaned CSV</span>
                    </a>
                  </div>
                </div>

                {/* Filter and Stats Ribbon */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  
                  {/* Search Bar */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter rows by keyword..."
                      value={explorerInput}
                      onChange={(e) => setExplorerInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setExplorerSearch(explorerInput);
                          setExplorerPage(1);
                        }
                      }}
                      className="w-full pl-9 pr-20 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    {explorerInput && (
                      <button
                        onClick={() => {
                          setExplorerInput('');
                          setExplorerSearch('');
                          setExplorerPage(1);
                        }}
                        className="absolute right-14 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setExplorerSearch(explorerInput);
                        setExplorerPage(1);
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
                    >
                      Filter
                    </button>
                  </div>

                  {/* Quick Stat Badges */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-xl border border-slate-200">
                      Total Rows: <span className="text-indigo-600">{explorerData?.row_count?.toLocaleString() || config.kpis?.[0]?.value || '-'}</span>
                    </span>
                    <span className="bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-xl border border-slate-200">
                      Columns: <span className="text-indigo-600">{explorerData?.column_count || explorerData?.column_profile?.length || '-'}</span>
                    </span>
                    {detailedAnomalies.length > 0 && (
                      <span className="bg-rose-50 text-rose-700 font-bold px-3 py-1.5 rounded-xl border border-rose-200 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-500" />
                        {detailedAnomalies.length} Flagged Anomalies
                      </span>
                    )}
                  </div>
                </div>

                {/* Table Container */}
                <div className="bg-white border border-slate-100 rounded-[26px] overflow-hidden shadow-sm">
                  {explorerLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                      <p className="text-xs font-semibold">Querying dataset records...</p>
                    </div>
                  ) : explorerData?.preview_rows && explorerData.preview_rows.length > 0 ? (
                    <div className="overflow-x-auto max-w-full">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                            <th className="p-3.5 pl-5 w-14">#</th>
                            {explorerData.column_profile ? (
                              explorerData.column_profile.map((col: any) => (
                                <th key={col.name} className="p-3.5 whitespace-nowrap">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-slate-800 font-bold text-xs">{col.name}</span>
                                    <span className={`text-[9px] px-1.5 py-0.2 rounded w-fit uppercase font-semibold ${
                                      col.dtype === 'numerical' ? 'bg-blue-100 text-blue-700' :
                                      col.dtype === 'date' ? 'bg-purple-100 text-purple-700' :
                                      'bg-amber-100 text-amber-700'
                                    }`}>
                                      {col.dtype}
                                    </span>
                                  </div>
                                </th>
                              ))
                            ) : (
                              Object.keys(explorerData.preview_rows[0] || {}).map((col) => (
                                <th key={col} className="p-3.5 whitespace-nowrap text-slate-800 font-bold text-xs">
                                  {col}
                                </th>
                              ))
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {explorerData.preview_rows.map((row: any, rIdx: number) => {
                            const globalRowIdx = (explorerPage - 1) * 20 + rIdx;
                            const anomaly = detailedAnomalies.find((a) => a.row_index === globalRowIdx);

                            return (
                              <tr
                                key={rIdx}
                                className={`transition-colors hover:bg-indigo-50/30 ${
                                  anomaly ? 'bg-rose-50/40 hover:bg-rose-50/70' : ''
                                }`}
                              >
                                <td className="p-3.5 pl-5 font-mono text-[11px] text-slate-400 font-semibold">
                                  <div className="flex items-center gap-1">
                                    <span>{globalRowIdx + 1}</span>
                                    {anomaly && (
                                      <span title={`Anomaly on ${anomaly.column}: ${anomaly.explanation}`}>
                                        <AlertTriangle className="w-3 h-3 text-rose-500 inline" />
                                      </span>
                                    )}
                                  </div>
                                </td>
                                {Object.keys(row).map((col) => {
                                  const isColAnomaly = anomaly && anomaly.column === col;
                                  return (
                                    <td
                                      key={col}
                                      className={`p-3.5 whitespace-nowrap font-medium ${
                                        isColAnomaly ? 'text-rose-700 font-bold bg-rose-100/50 rounded' : ''
                                      }`}
                                    >
                                      {String(row[col] ?? '')}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-16 text-center text-slate-400 text-xs">
                      No records matched your search filter.
                    </div>
                  )}

                  {/* Pagination Footer */}
                  {explorerData && (
                    <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">
                        Showing page <span className="font-bold text-slate-800">{explorerPage}</span> (20 records per page)
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExplorerPage((prev) => Math.max(1, prev - 1))}
                          disabled={explorerPage <= 1 || explorerLoading}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold transition disabled:opacity-40 cursor-pointer"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setExplorerPage((prev) => prev + 1)}
                          disabled={
                            explorerLoading ||
                            !explorerData?.preview_rows ||
                            explorerData.preview_rows.length < 20
                          }
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold transition disabled:opacity-40 cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* 4. WHAT-IF SIMULATION TAB */}
            {activeTab === 'whatif' && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-100 rounded-[28px] p-6 lg:p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Autonomous What-If Simulation Engine</h3>
                      <p className="text-xs text-slate-400">
                        Simulate the impact of adjusting business levers using statistical regression models.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                        Driver Variable (Input)
                      </label>
                      <select
                        value={driverCol}
                        onChange={(e) => handleDriverChange(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                      >
                        {uniqueDrivers.map((colName) => (
                          <option key={colName} value={colName}>{colName}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                        Target Metric (Outcome)
                      </label>
                      <select
                        value={targetCol}
                        onChange={(e) => setTargetCol(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                      >
                        {availableTargets.map((colName) => (
                          <option key={colName} value={colName}>{colName}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                          Adjustment: <span className="text-indigo-600 font-extrabold">{pctChange > 0 ? `+${pctChange}%` : `${pctChange}%`}</span>
                        </label>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        step="5"
                        value={pctChange}
                        onChange={(e) => setPctChange(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleRunWhatIf}
                    disabled={whatIfLoading || !driverCol || !targetCol}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{whatIfLoading ? 'Simulating Regression...' : 'Run Simulation'}</span>
                  </button>

                  {whatIfResult && (
                    <div className="mt-8 p-6 bg-gradient-to-br from-indigo-50/80 to-purple-50/50 border border-indigo-100 rounded-2xl">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                          Statistical Scenario Output
                        </span>
                        <span className="text-xs font-semibold bg-white text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200">
                          R² = {whatIfResult.r_squared ?? 0.72}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div className="bg-white p-4 rounded-xl border border-indigo-100/60">
                          <p className="text-[11px] text-slate-400 font-semibold">Current Mean</p>
                          <p className="text-xl font-extrabold text-slate-900 mt-1">
                            {whatIfResult.current_target_value?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-indigo-100/60">
                          <p className="text-[11px] text-slate-400 font-semibold">Simulated Outcome</p>
                          <p className="text-xl font-extrabold text-indigo-600 mt-1">
                            {whatIfResult.simulated_target_value?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-indigo-100/60">
                          <p className="text-[11px] text-slate-400 font-semibold">Estimated Net Impact</p>
                          <p className={`text-xl font-extrabold mt-1 ${
                            (whatIfResult.estimated_change || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {(whatIfResult.estimated_change || 0) >= 0 ? '+' : ''}
                            {whatIfResult.estimated_change?.toLocaleString(undefined, { maximumFractionDigits: 2 })} ({whatIfResult.percentage_change_result}%)
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        {whatIfResult.summary}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-2">
                        Confidence score: {Math.round((whatIfResult.confidence_score || 0.85) * 100)}% (Correlation r = {whatIfResult.correlation ?? 0.8}). {whatIfResult.disclaimer}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. QUALITY & CLEANING TAB */}
            {activeTab === 'quality' && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-100 rounded-[28px] p-6 lg:p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Autonomous Data Quality Scorecard</h3>
                        <p className="text-xs text-slate-400">
                          Verification metrics generated during the ingestion and cleansing phase.
                        </p>
                      </div>
                    </div>
                    <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-3 py-1.5 rounded-full border border-emerald-100">
                      Status: {quality.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl">
                      <p className="text-[11px] font-bold text-slate-500 uppercase">Overall Score</p>
                      <p className="text-3xl font-extrabold text-slate-900 mt-1">{quality.overall_score}%</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl">
                      <p className="text-[11px] font-bold text-slate-500 uppercase">Completeness</p>
                      <p className="text-3xl font-extrabold text-slate-900 mt-1">{quality.completeness_score}%</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl">
                      <p className="text-[11px] font-bold text-slate-500 uppercase">Consistency</p>
                      <p className="text-3xl font-extrabold text-slate-900 mt-1">{quality.consistency_score}%</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl">
                      <p className="text-[11px] font-bold text-slate-500 uppercase">Duplicate-Free</p>
                      <p className="text-3xl font-extrabold text-slate-900 mt-1">{quality.duplicate_score}%</p>
                    </div>
                  </div>

                  {config.cleaning_report && config.cleaning_report.log && config.cleaning_report.log.length > 0 && (
                    <div className="mt-8">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Cleansing Execution Log</h4>
                      <div className="bg-slate-900 text-slate-200 font-mono text-xs p-4 rounded-2xl space-y-1.5 max-h-60 overflow-y-auto">
                        {config.cleaning_report.log.map((entry, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-emerald-400">✓</span>
                            <span>{entry}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 7. SEGMENTATION & CLUSTERS TAB */}
            {activeTab === 'clusters' && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-100 rounded-[28px] p-6 lg:p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">K-Means Behavioral Clustering</h3>
                      <p className="text-xs text-slate-400">
                        Unsupervised segmentation identifying natural cohorts in your dataset.
                      </p>
                    </div>
                  </div>

                  {clusters.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {clusters.map((c, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-bold text-slate-900">{c.cluster_name || `Cluster #${c.cluster_id}`}</h4>
                            <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                              {c.size} records ({c.percentage}%)
                            </span>
                          </div>
                          <div className="space-y-2 text-xs text-slate-600">
                            <p className="font-semibold text-slate-800">Centroid Profiles:</p>
                            {Object.entries(c.centroid || {}).map(([k, v]) => (
                              <div key={k} className="flex justify-between border-b border-slate-200/60 pb-1">
                                <span className="text-slate-500">{k}:</span>
                                <span className="font-bold text-slate-900">{typeof v === 'number' ? v.toFixed(2) : String(v)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No cluster data computed for this dataset.</p>
                  )}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Global Floating AI Analytics Copilot */}
      <GlobalAICopilot
        datasetId={config.dataset_id}
        language={currentLang}
        suggestedQuestions={config.suggested_questions}
        activeFilters={activeFilters}
        currentContext={{
          currentTab: activeTab,
          currentChartTitle: activeHeroChart?.title,
          currentMetric: activeHeroChart?.y?.[0],
        }}
        onNavigateTab={(tab) => setActiveTab(tab as TabType)}
        onViewChart={(chartOrCol) => {
          setActiveTab('dashboard');
        }}
        onApplyFilter={(col, val) => handleFilterChange(col, val)}
        onClearFilter={(col) => (col ? handleFilterChange(col, 'all') : handleResetFilters())}
      />

      {/* Deep-Dive View Details Modal */}
      <InsightDetailModal
        insight={selectedInsightModal}
        isOpen={isInsightModalOpen}
        onClose={() => setIsInsightModalOpen(false)}
        onExploreData={() => setActiveTab('explorer')}
      />

      {/* View All Insights Drawer */}
      <AllInsightsDrawer
        isOpen={isAllInsightsDrawerOpen}
        onClose={() => setIsAllInsightsDrawerOpen(false)}
        insights={prioritizedInsights}
        domainName={domainName}
        onSelectInsight={(ins) => {
          setSelectedInsightModal(ins);
          setIsInsightModalOpen(true);
        }}
      />
    </div>
  );
}
