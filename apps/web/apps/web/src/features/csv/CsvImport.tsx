"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";

// Local types and defaults (keep lightweight and explicit here)
type CsvRow = Record<string, string | number>;
const DEFAULT_PARSE_OPTIONS = { previewRows: 20 as const };

export default function CsvImport() {
  const [file, setFile] = useState<File | null>(null);
  const [header, setHeader] = useState(true);
  const [delimiter, setDelimiter] = useState(",");
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<CsvRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Worker is ESM
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
          setTotalRows((r) => r + rows.length);
          // Build preview up to configured size
          setPreview((p) => {
            if (p.length >= (DEFAULT_PARSE_OPTIONS.previewRows ?? 20)) return p;
            const needed = (DEFAULT_PARSE_OPTIONS.previewRows ?? 20) - p.length;
            return p.concat(rows.slice(0, needed));
          });
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
        default:
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

  const onSelectFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview([]);
    setErrors([]);
    setProgress(0);
    setTotalRows(0);
  };

  const onParse = () => {
    if (!file || !workerRef.current) return;
    setParsing(true);
    setPreview([]);
    setErrors([]);
    setProgress(0);
    setTotalRows(0);
    workerRef.current.postMessage({
      type: "PARSE_FILE",
      file,
      options: { header, delimiter },
    });
  };

  return (
    <div className="p-6">
      {/* Container-level contrast fix */}
      <div className="max-w-6xl mx-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm">
        <header className="px-6 pt-6 pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-xl font-semibold">Import CSV</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Select a CSV and parse. The first {DEFAULT_PARSE_OPTIONS.previewRows} rows will show below for mapping.
          </p>
        </header>

        <section className="px-6 py-4 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium">File</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={onSelectFile}
              className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-neutral-100 dark:file:bg-neutral-800 file:px-4 file:py-2 file:text-neutral-900 dark:file:text-neutral-100 hover:file:bg-neutral-200 dark:hover:file:bg-neutral-700"
            />
            {file && <span className="text-xs text-neutral-600 dark:text-neutral-300">Selected: {file.name}</span>}
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={header}
                onChange={(e) => setHeader(e.target.checked)}
                className="h-4 w-4 accent-neutral-800 dark:accent-neutral-200"
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
                className="border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 rounded-md px-2 py-1 text-sm"
              />
            </label>

            <div className="col-span-2">
              <button
                type="button"
                onClick={onParse}
                disabled={!file || parsing}
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
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
              <div
                className="h-2 rounded bg-neutral-800 dark:bg-neutral-200 transition-all"
                style={{
                  width:
                    totalRows > 0 && file && "size" in file && typeof file.size === "number"
                      ? undefined
                      : Math.min(100, Math.round((preview.length / (DEFAULT_PARSE_OPTIONS.previewRows || 1)) * 100)) + "%",
                }}
              />
            </div>
          </div>
        )}

        <section className="px-6 py-4">
          <h3 className="text-lg font-semibold mb-2">
            Preview <span className="text-sm font-normal text-neutral-600 dark:text-neutral-300">(first {DEFAULT_PARSE_OPTIONS.previewRows})</span>
          </h3>

          {!preview.length ? (
            <div className="text-sm text-neutral-600 dark:text-neutral-300">No data yet.</div>
          ) : (
            <div className="overflow-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
              <table className="min-w-full table-auto border-collapse">
                <thead className="bg-neutral-50 dark:bg-neutral-800/60">
                  <tr>
                    {headers.map((h) => (
                      <th
                        key={h}
                        className="border-b border-neutral-200 dark:border-neutral-800 px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className={i % 2 ? "bg-neutral-50/60 dark:bg-neutral-800/40" : ""}>
                      {headers.map((h) => (
                        <td key={h} className="border-b border-neutral-200 dark:border-neutral-800 px-2 py-1 text-sm align-top">
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
            <div className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
              Total rows seen so far: {totalRows.toLocaleString()}
            </div>
          )}

          {!!errors.length && (
            <div className="mt-4 rounded-lg border border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-red-950/40 p-3">
              <div className="font-semibold text-red-800 dark:text-red-200 mb-1">Errors</div>
              <ul className="list-disc pl-5 text-sm text-red-700 dark:text-red-300">
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="px-6 pb-6 border-t border-neutral-200 dark:border-neutral-800">
          <h3 className="text-lg font-semibold mb-2">Mapping (placeholder)</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Next: add dropdowns to map CSV headers to fields like <code>itemPrice</code>, <code>cogs</code>, <code>fees</code>, etc.
            Saved presets will live here.
          </p>
        </section>
      </div>
    </div>
  );
}
