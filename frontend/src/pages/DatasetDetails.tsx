import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { datasetApi } from "../services/api";
import type { DatasetDetail } from "../types";

const TYPE_COLORS: Record<string, string> = {
  numerical: "bg-blue-100 text-blue-700",
  categorical: "bg-green-100 text-green-700",
  datetime: "bg-purple-100 text-purple-700",
  boolean: "bg-amber-100 text-amber-700",
  id: "bg-slate-100 text-slate-700",
  text: "bg-pink-100 text-pink-700",
};

export default function DatasetDetails() {
  const { datasetId } = useParams<{ datasetId: string }>();
  const [dataset, setDataset] = useState<DatasetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!datasetId) return;
    datasetApi
      .get(datasetId)
      .then(setDataset)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dataset"))
      .finally(() => setLoading(false));
  }, [datasetId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (error || !dataset) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {error ?? "Dataset not found"}
      </div>
    );
  }

  const previewCols = dataset.preview_rows.length > 0 ? Object.keys(dataset.preview_rows[0]) : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link to="/" className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-semibold text-slate-800">{dataset.filename}</h1>
            <p className="text-xs text-slate-500">
              {dataset.row_count.toLocaleString()} rows · {dataset.column_count} columns
              {dataset.dataset_domain ? ` · ${dataset.dataset_domain} domain` : ""}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <SummaryStat label="Rows" value={dataset.row_count.toLocaleString()} />
          <SummaryStat label="Columns" value={dataset.column_count} />
          <SummaryStat label="Numerical" value={dataset.numerical_columns} />
          <SummaryStat label="Categorical" value={dataset.categorical_columns} />
          <SummaryStat label="Date Columns" value={dataset.date_columns} />
          <SummaryStat label="Missing Values" value={dataset.missing_values} warn={dataset.missing_values > 0} />
          <SummaryStat label="Duplicate Rows" value={dataset.duplicate_rows} warn={dataset.duplicate_rows > 0} />
        </div>

        {dataset.cleaning_report && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-1">Automatic Data Cleaning</h2>
            <p className="text-xs text-slate-500 mb-3">
              Applied automatically before analysis — {dataset.cleaning_report.rows_before.toLocaleString()} rows in,{" "}
              {dataset.cleaning_report.rows_after.toLocaleString()} rows after cleaning.
            </p>
            <ul className="space-y-1.5 text-sm text-slate-600 list-disc list-inside">
              {dataset.cleaning_report.log.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Column Information</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="py-2 pr-4">Column</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Missing</th>
                  <th className="py-2 pr-4">Unique</th>
                  <th className="py-2 pr-4">Sample</th>
                </tr>
              </thead>
              <tbody>
                {dataset.column_profile.map((col) => (
                  <tr key={col.name} className="border-b border-slate-50">
                    <td className="py-2 pr-4 font-medium text-slate-700">{col.name}</td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[col.dtype] ?? "bg-slate-100"}`}>
                        {col.dtype}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-slate-600">
                      {col.missing_count} ({col.missing_pct}%)
                    </td>
                    <td className="py-2 pr-4 text-slate-600">{col.unique_count}</td>
                    <td className="py-2 pr-4 text-slate-500 truncate max-w-xs">
                      {col.sample_values.slice(0, 3).map(String).join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Dataset Preview</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  {previewCols.map((c) => (
                    <th key={c} className="py-2 pr-4 whitespace-nowrap">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataset.preview_rows.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-50">
                    {previewCols.map((c) => (
                      <td key={c} className="py-1.5 pr-4 whitespace-nowrap text-slate-600">
                        {String(row[c] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function SummaryStat({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-xl font-semibold mt-1 ${warn ? "text-amber-600" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}
