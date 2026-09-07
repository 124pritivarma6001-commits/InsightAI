import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Trash2, ArrowRight } from "lucide-react";
import { datasetApi } from "../services/api";
import type { DatasetSummary } from "../types";

export default function MyDatasets() {
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    datasetApi
      .list()
      .then(setDatasets)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load datasets"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this dataset? This cannot be undone.")) return;
    try {
      await datasetApi.remove(id);
      setDatasets((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete dataset");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-semibold text-slate-800">My Datasets</h1>
          <Link to="/" className="text-xs font-medium text-brand-600 hover:underline">
            Upload new dataset
          </Link>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
          </div>
        )}

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {!loading && datasets.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
            No saved datasets yet. Upload one from the home page.
          </div>
        )}

        <div className="space-y-3">
          {datasets.map((d) => (
            <div
              key={d.id}
              className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{d.filename}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {d.row_count.toLocaleString()} rows · {d.column_count} columns
                  {d.dataset_domain ? ` · ${d.dataset_domain}` : ""} ·{" "}
                  {new Date(d.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to={`/analysis/${d.id}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
                >
                  Open <ArrowRight className="w-3 h-3" />
                </Link>
                <button
                  onClick={() => handleDelete(d.id)}
                  className="text-slate-400 hover:text-red-600"
                  title="Delete dataset"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
