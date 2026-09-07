import axios from "axios";
import type {
  AnalysisResult,
  DashboardConfig,
  DatasetDetail,
  DatasetSummary,
} from "../types";

const api = axios.create({
  baseURL: "/api",
  timeout: 60000,
});

// Attach JWT if present (protected routes / persisting to a personal account)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize backend error payloads into a readable message
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const detail =
      error?.response?.data?.detail ?? error?.message ?? "Unexpected error occurred.";
    return Promise.reject(new Error(detail));
  }
);

export const authApi = {
  register: (email: string, password: string, full_name?: string) =>
    api.post("/auth/register", { email, password, full_name }),
  login: async (email: string, password: string) => {
    const res = await api.post<{ access_token: string }>("/auth/login", { email, password });
    localStorage.setItem("access_token", res.data.access_token);
    return res.data;
  },
  logout: () => {
    localStorage.removeItem("access_token");
  },
  me: () => api.get("/auth/me"),
};

export const datasetApi = {
  upload: async (file: File, onProgress?: (pct: number) => void): Promise<DatasetSummary> => {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post<DatasetSummary>("/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(pct);
        }
      },
    });
    return res.data;
  },

  loadSample: async (sampleType: "sales" | "marketing" | "healthcare" = "sales"): Promise<DatasetSummary> => {
    const res = await api.post<DatasetSummary>(`/upload/sample?sample_type=${sampleType}`);
    return res.data;
  },

  list: async (): Promise<DatasetSummary[]> => {
    const res = await api.get<DatasetSummary[]>("/datasets");
    return res.data;
  },

  get: async (id: string, page = 1, pageSize = 50, search = ""): Promise<DatasetDetail> => {
    const params = new URLSearchParams();
    if (page) params.append("page", String(page));
    if (pageSize) params.append("page_size", String(pageSize));
    if (search) params.append("search", search);
    const res = await api.get<DatasetDetail>(`/datasets/${id}?${params.toString()}`);
    return res.data;
  },

  remove: (id: string) => api.delete(`/datasets/${id}`),

  analyze: async (datasetId: string): Promise<AnalysisResult> => {
    const res = await api.post<AnalysisResult>(`/analyze?dataset_id=${datasetId}`);
    return res.data;
  },

  downloadCleanedUrl: (datasetId: string) => `/api/datasets/${datasetId}/download-cleaned`,
};

export const dashboardApi = {
  generate: async (datasetId: string): Promise<DashboardConfig> => {
    const res = await api.post<DashboardConfig>(`/generate-dashboard?dataset_id=${datasetId}`);
    return res.data;
  },

  get: async (dashboardId: string): Promise<DashboardConfig> => {
    const res = await api.get<DashboardConfig>(`/dashboards/${dashboardId}`);
    return res.data;
  },

  regenerate: async (dashboardId: string): Promise<DashboardConfig> => {
    const res = await api.post<DashboardConfig>(`/dashboards/${dashboardId}/regenerate`);
    return res.data;
  },

  recommendCharts: (datasetId: string) =>
    api.post(`/recommend-charts?dataset_id=${datasetId}`),

  generateInsights: (datasetId: string) =>
    api.post(`/generate-insights?dataset_id=${datasetId}`),

  runWhatIf: async (
    datasetId: string,
    driverColumn: string,
    targetColumn: string,
    percentageChange: number
  ): Promise<import("../types").WhatIfResponse> => {
    const res = await api.post("/what-if", {
      dataset_id: datasetId,
      driver_column: driverColumn,
      target_column: targetColumn,
      percentage_change: percentageChange,
    });
    return res.data;
  },

  askData: async (
    datasetId: string,
    question: string,
    activeFilters?: Record<string, any>,
    currentContext?: Record<string, any>,
    language?: string
  ): Promise<any> => {
    const res = await api.post("/ask-data", {
      dataset_id: datasetId,
      question,
      active_filters: activeFilters,
      current_context: currentContext,
      language: language || "en",
    });
    return res.data;
  },
};

export default api;
