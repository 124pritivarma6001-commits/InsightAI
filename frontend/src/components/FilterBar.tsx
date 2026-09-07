import { useState } from "react";
import type { FilterConfig } from "../types";

export interface ActiveFilters {
  [column: string]: string | [string, string] | undefined;
}

export default function FilterBar({
  filters,
  onChange,
}: {
  filters: FilterConfig[];
  onChange: (active: ActiveFilters) => void;
}) {
  const [active, setActive] = useState<ActiveFilters>({});

  const update = (column: string, value: string | [string, string] | undefined) => {
    const next = { ...active, [column]: value };
    setActive(next);
    onChange(next);
  };

  const reset = () => {
    setActive({});
    onChange({});
  };

  if (filters.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center gap-3">
      {filters.map((f) =>
        f.type === "categorical" ? (
          <div key={f.id} className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">{f.column}</label>
            <select
              className="text-sm border border-slate-200 rounded-md px-2 py-1"
              value={(active[f.column] as string) ?? "All"}
              onChange={(e) => update(f.column, e.target.value === "All" ? undefined : e.target.value)}
            >
              <option>All</option>
              {(f.options ?? []).map((opt) => (
                <option key={String(opt)} value={String(opt)}>
                  {String(opt)}
                </option>
              ))}
            </select>
          </div>
        ) : f.type === "date_range" ? (
          <div key={f.id} className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">{f.column}</label>
            <input
              type="date"
              className="text-sm border border-slate-200 rounded-md px-2 py-1"
              defaultValue={String(f.min ?? "")}
              onChange={(e) => {
                const current = (active[f.column] as [string, string]) ?? [String(f.min), String(f.max)];
                update(f.column, [e.target.value, current[1]]);
              }}
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              className="text-sm border border-slate-200 rounded-md px-2 py-1"
              defaultValue={String(f.max ?? "")}
              onChange={(e) => {
                const current = (active[f.column] as [string, string]) ?? [String(f.min), String(f.max)];
                update(f.column, [current[0], e.target.value]);
              }}
            />
          </div>
        ) : null
      )}
      <button onClick={reset} className="ml-auto text-xs font-medium text-brand-600 hover:underline">
        Reset filters
      </button>
    </div>
  );
}
