"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type CsvRow = Record<string, string | number>;

type NumStats = {
  count: number;
  sum: number;
  min: number;
  max: number;
};
function emptyStats(): NumStats {
  return { count: 0, sum: 0, min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY };
}
function updateStats(s: NumStats, v: number): NumStats {
  const n = s.count + 1;
  const sum = s.sum + v;
  const min = Math.min(s.min, v);
  const max = Math.max(s.max, v);
  return { count: n, sum, min, max };
}

const DEFAULT_PREVIEW_ROWS = 20;

export default function CsvImport() {
  const [file, setFile] = useState<File | null>(null);
  const [header, setHeader] = useState(true);
  const [delimiter, setDelimiter] = useState(",");
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<CsvRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);

  // streaming rollups
  const [rollups, setRollups] = useState<Record<string, NumStats>>({});
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const w = new Worker(new URL("../../workers/csvWorker.ts", import.meta.url), { type: "module" });
    workerRef.current = w;

    w.onmessage = (ev: MessageEvent) => {
      const msg = ev.data;
      switch (msg?.type) {
        case "PROGRESS":
          setProgress(Number(msg.progress || 0));
          break;

        case "CHUNK": {
          const rows = Array.isArray(msg.rows) ? (msg.rows as CsvRow[]) : [];
          if (rows.length) {
            setTotalRows((r) => r + rows.length);

            // build preview list, capped
            setPreview((p) => {
              if (p.length >= DEFAULT_PREVIEW_ROWS) return p;
              const needed = DEFAULT_PREVIEW_ROWS - p.length;
              return p.concat(rows.slice(0, needed));
            });

            // update numeric rollups in place without storing all rows
            setRollups((prev) => {
              const next = { ...prev };
              for (const row of rows) {
                for (const [k, v] of Object.entries(row)) {
                  if (typeof v !== "number" || Number.isNaN(v)) continue;
                  next[k] = updateStats(next[k] ?? emptyStats(), v);
                }
              }
              return next;
            });
          }
          break;
        }

        case "DONE":
          setParsing(false);
          setErrors(Array.isArray(msg.errors) ? msg.errors.map(String) : []);
          break;

        case "ERROR":
          setParsing(false);
          setErrors((e) => e.concat(String(msg.error ?? "Unknown error")));
          break;
      }
    };

    return () => {
      w.terminate();
      workerRef.current = null;
    };
  }, []);

  const headers = useMemo<string[]>(() => {
    if (!preview.length) return [];
    return Object.keys(preview[0] ?? {});
  }, [preview]);

  const numericRollupRows = useMemo(() => {
    // Only include columns that saw at least one numeric value
    const entries = Object.entries(rollups).filter(([, s]) => s?.count > 0);
    // stable sort by header name
    entries.sort(([a], [b]) => a.localeCompare(b));
    return entries.map(([key, s]) => ({
      column: key,
      count: s.count,
      sum: s.sum,
      min: s.min === Number.POSITIVE_INFINITY ? "" : s.min,
      max: s.max === Number.NEGATIVE_INFINITY ? "" : s.max,
      avg: s.count ? s.sum / s.count : 0,
    }));
  }, [rollups]);

  // Chart data: top N numeric columns by count, show average value
  const CHART_MAX_SERIES = 12;
  const chartData = useMemo(() => {
    const rows = [...numericRollupRows]
      .sort((a, b) => b.count - a.count)
      .slice(0, CHART_MAX_SERIES)
      .map((r) => ({ column: r.column, avg: r.avg }));
    return rows;
  }, [numericRollupRows]);

  const onSelectFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    // reset state
    setPreview([]);
    setErrors([]);
    setProgress(0);
    setTotalRows(0);
    setRollups({});
  };

  const onParse = () => {
    if (!file || !workerRef.current) return;
    setParsing(true);
    setPreview([]);
    setErrors([]);
    setProgress(0);
    setTotalRows(0);
    setRollups({});
    workerRef.current.postMessage({
      type: "PARSE_FILE",
      file,
      options: { header, delimiter },
    });
  };

  return (
    <div className="p-6">
      {/* Higher contrast container and text */}
      <div className="max-w-6xl mx-auto rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow">
        <header className="px-6 pt-6 pb-4 border-b border-neutral-300 dark:border-neutral-800">
          <h2 className="text-xl font-semibold">Import CSV</h2>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            Parse a CSV. Preview first {DEFAULT_PREVIEW_ROWS}. Live rollups compute as rows stream in, then a chart renders from those rollups.
          </p>
        </header>

        <section className="px-6 py-4 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium">File</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={onSelectFile}
              className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-neutral-200 dark:file:bg-neutral-800 file:px-4 file:py-2 file:text-neutral-900 dark:file:text-neutral-100 hover:file:bg-neutral-300 dark:hover:file:bg-neutral-700"
            />
            {file && <span className="text-xs text-neutral-700 dark:text-neutral-300">Selected: {file.name}</span>}
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={header}
                onChange={(e) => setHeader(e.target.checked)}
                className="h-4 w-4 accent-neutral-900 dark:accent-neutral-200"
              />
              <span className="text-sm">First row is header</span>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium">Delimiter</span>
              <input
                type="text"
                value={delimiter}
                maxLength={1}
                onChange={(e) => setDelimiter(e.target.value)}
                className="border border-neutral-400 dark:border-neutral-700 bg-white dark:bg-neutral-950 rounded-md px-2 py-1 text-sm text-neutral-900 dark:text-neutral-100"
              />
            </label>

            <div className="col-span-2">
              <button
                type="button"
                onClick={onParse}
                disabled={!file || parsing}
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-400 dark:border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-50"
              >
                {parsing ? "Parsing…" : "Parse"}
              </button>
            </div>
          </div>
        </section>

        {progress > 0 && (
          <div className="px-6 pb-2">
            <div className="text-sm">Rows processed: {progress.toLocaleString()}</div>
            <div className="mt-2 h-2 rounded bg-neutral-200 dark:bg-neutral-800">
              <div className="h-2 rounded bg-neutral-900 dark:bg-neutral-200 transition-all" style={{ width: "100%" }} />
            </div>
          </div>
        )}

        <section className="px-6 py-4 grid gap-6 md:grid-cols-2">
          {/* Preview table */}
          <div>
            <h3 className="text-lg font-semibold mb-2">
              Preview <span className="text-sm font-normal text-neutral-700 dark:text-neutral-300">(first {DEFAULT_PREVIEW_ROWS})</span>
            </h3>

            {!preview.length ? (
              <div className="text-sm text-neutral-700 dark:text-neutral-300">No data yet.</div>
            ) : (
              <div className="overflow-auto rounded-lg border border-neutral-300 dark:border-neutral-800">
                <table className="min-w-full table-auto border-collapse">
                  <thead className="bg-neutral-200 dark:bg-neutral-800">
                    <tr>
                      {headers.map((h) => (
                        <th
                          key={h}
                          className="border-b border-neutral-300 dark:border-neutral-800 px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className={i % 2 ? "bg-neutral-100 dark:bg-neutral-800/40" : ""}>
                        {headers.map((h) => (
                          <td key={h} className="border-b border-neutral-300 dark:border-neutral-800 px-2 py-1 text-sm align-top">
                            {String((row as Record<string, unknown>)[h] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalRows > 0 && (
              <div className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">
                Total rows seen so far: {totalRows.toLocaleString()}
              </div>
            )}
          </div>

          {/* Rollup panel */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Numeric column rollups</h3>
            {!numericRollupRows.length ? (
              <div className="text-sm text-neutral-700 dark:text-neutral-300">No numeric values detected yet.</div>
            ) : (
              <div className="overflow-auto rounded-lg border border-neutral-300 dark:border-neutral-800">
                <table className="min-w-full table-fixed border-collapse">
                  <thead className="bg-neutral-200 dark:bg-neutral-800">
                    <tr>
                      {["Column", "Count", "Sum", "Min", "Max", "Avg"].map((h) => (
                        <th key={h} className="border-b border-neutral-300 dark:border-neutral-800 px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {numericRollupRows.map((r) => (
                      <tr key={r.column} className="odd:bg-neutral-100 odd:dark:bg-neutral-800/40">
                        <td className="border-b border-neutral-300 dark:border-neutral-800 px-2 py-1 text-sm break-words">{r.column}</td>
                        <td className="border-b border-neutral-300 dark:border-neutral-800 px-2 py-1 text-sm">{r.count.toLocaleString()}</td>
                        <td className="border-b border-neutral-300 dark:border-neutral-800 px-2 py-1 text-sm">{r.sum.toLocaleString()}</td>
                        <td className="border-b border-neutral-300 dark:border-neutral-800 px-2 py-1 text-sm">{String(r.min)}</td>
                        <td className="border-b border-neutral-300 dark:border-neutral-800 px-2 py-1 text-sm">{String(r.max)}</td>
                        <td className="border-b border-neutral-300 dark:border-neutral-800 px-2 py-1 text-sm">{r.avg.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-2 text-xs text-neutral-700 dark:text-neutral-400">
              Rollups compute from streamed chunks. No full CSV kept in memory.
            </p>
          </div>
        </section>

        {/* First chart from rollups */}
        <section className="px-6 pb-6">
          <h3 className="text-lg font-semibold mb-2">First chart: Average by numeric column</h3>
          {!chartData.length ? (
            <div className="text-sm text-neutral-700 dark:text-neutral-300">No numeric columns to chart yet.</div>
          ) : (
            <div className="h-80 rounded-2xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="column" angle={-20} textAnchor="end" interval={0} height={60} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avg" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-2 text-xs text-neutral-700 dark:text-neutral-400">
            This validates CSV → rollups → chart. Replace with domain metrics next.
          </p>
        </section>

        {!!errors.length && (
          <section className="px-6 pb-6">
            <div className="mt-2 rounded-lg border border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-red-950/40 p-3">
              <div className="font-semibold text-red-800 dark:text-red-200 mb-1">Errors</div>
              <ul className="list-disc pl-5 text-sm text-red-700 dark:text-red-300">
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
