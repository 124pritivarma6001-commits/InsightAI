export interface CleaningReport {
  rows_before: number;
  rows_after: number;
  duplicate_rows_removed: number;
  missing_values_before: number;
  missing_values_after: number;
  columns_format_fixed: Record<string, string>;
  columns_text_normalized: string[];
  missing_values_filled: Record<string, { count: number; strategy: string; fill_value: unknown }>;
  missing_values_left: Record<string, number>;
  outliers_flagged?: number;
  quality_score?: number;
  completeness_score?: number;
  consistency_score?: number;
  duplicate_free_score?: number;
  log: string[];
}

export interface DatasetSummary {
  id: string;
  filename: string;
  row_count: number;
  column_count: number;
  numerical_columns: number;
  categorical_columns: number;
  date_columns: number;
  missing_values: number;
  duplicate_rows: number;
  dataset_domain: string | null;
  created_at: string;
  cleaning_report?: CleaningReport | null;
}

export interface ColumnProfile {
  name: string;
  dtype: string;
  pandas_dtype: string;
  missing_count: number;
  missing_pct: number;
  unique_count: number;
  sample_values: unknown[];
  stats: Record<string, unknown>;
}

export interface DatasetDetail extends DatasetSummary {
  column_profile: ColumnProfile[];
  preview_rows: Record<string, unknown>[];
}

export interface KPIConfig {
  id: string;
  label: string;
  sub_label?: string;
  value: number | string;
  raw_value?: number;
  delta?: number;
  delta_label?: string;
  theme?: "amber" | "blue" | "slate" | "purple";
  icon?: string;
}

export interface ChartMarker {
  type: string;
  period: string;
  value: number;
}

export interface ChartConfig {
  id: string;
  type: "line" | "bar" | "pie" | "scatter" | "histogram" | "heatmap" | "kpi" | "area" | "horizontal_bar" | "box_plot";
  title: string;
  subtitle?: string;
  ai_recommended?: boolean;
  why_this_chart?: string;
  x?: string | null;
  y?: string[] | null;
  x_title?: string | null;
  y_title?: string | null;
  data: unknown;
  importance: number;
  size: "small" | "medium" | "large" | "full";
  markers?: ChartMarker[];
}

export interface InsightDeepDive {
  full_explanation: string;
  pattern: string;
  possible_explanation: string;
  important_data_points: { label: string; value: string }[];
  action_steps: string[];
}

export interface InsightConfig {
  id: string;
  icon: string;
  text: string;
  category: "trend" | "anomaly" | "correlation" | "ranking" | "segmentation" | "recommendation" | string;
  title?: string;
  finding?: string;
  supporting_metric?: string;
  priority?: "critical" | "important" | "informational";
  priority_label?: string;
  importance?: "High Impact" | "Medium Impact" | "Low Impact";
  why_it_matters?: string;
  explanation?: string;
  recommendation?: string;
  deep_dive?: InsightDeepDive;
  why_ai_found_this?: {
    source_columns: string[];
    calculation: string;
    metric_value: string;
    reason: string;
  };
}

export interface FilterConfig {
  id: string;
  column: string;
  type: "categorical" | "date_range" | "numeric_range";
  options?: (string | number)[];
  min?: string | number;
  max?: string | number;
}

export interface LayoutBlock {
  block_type: "kpi_row" | "chart" | "chart_grid" | "insights" | "filters";
  refs: string[];
  columns: number;
}

export interface DetailedAnomaly {
  id: string;
  row_index: number;
  column: string;
  value: number;
  expected_range?: string;
  method: string;
  severity: "High" | "Medium" | "Low";
  anomaly_score: number;
  explanation: string;
}

export interface WhatIfDriver {
  driver: string;
  target: string;
  correlation: number;
  relationship: string;
}

export interface WhatIfResponse {
  success: boolean;
  error?: string;
  driver_column?: string;
  target_column?: string;
  percentage_change?: number;
  current_driver_mean?: number;
  simulated_driver_mean?: number;
  current_target_value?: number;
  simulated_target_value?: number;
  estimated_change?: number;
  percentage_change_result?: number;
  correlation?: number;
  r_squared?: number;
  confidence_score?: number;
  disclaimer?: string;
  summary?: string;
}

export interface AskDataResponse {
  answer: string;
  supporting_metric?: string;
  category?: string;
  confidence?: number;
}

export interface DashboardConfig {
  id?: string;
  dataset_id: string;
  title: string;
  domain: string;
  domain_name?: string;
  domain_confidence?: number;
  domain_reasoning?: string;
  summary?: string;
  key_takeaways?: string[];
  kpis: KPIConfig[];
  charts: ChartConfig[];
  insights: InsightConfig[];
  filters: FilterConfig[];
  layout: LayoutBlock[];
  cleaning_report?: CleaningReport | null;
  what_if_drivers?: WhatIfDriver[];
  suggested_questions?: string[];
  detailed_anomalies?: DetailedAnomaly[];
  clustering_info?: Record<string, unknown>;
  version?: number;
  generated_at?: string;
}

export interface AnalysisResult {
  dataset_id: string;
  correlations: {
    matrix: Record<string, Record<string, number>>;
    significant_pairs: Array<{
      column_a: string;
      column_b: string;
      correlation: number;
      strength: string;
      direction: string;
      explanation?: string;
    }>;
    strongest_positive?: Record<string, unknown>;
    strongest_negative?: Record<string, unknown>;
  };
  anomalies: {
    summary: Array<Record<string, unknown>>;
    records: DetailedAnomaly[];
    total_anomalies: number;
  } | Array<Record<string, unknown>>;
  trends: Array<Record<string, unknown>>;
  clusters: Record<string, unknown>;
}

