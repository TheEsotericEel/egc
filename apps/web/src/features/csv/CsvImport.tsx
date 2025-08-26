"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_PARSE_OPTIONS, type CsvRow } from "./types";

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
    // Create worker from module source
    const w = new Worker(new URL("../../workers/csvWorker.ts", import.meta.url), { type: "module" });
    workerRef.current = w;

    w.onmessage = (ev: MessageEvent) => {
      const msg = ev.data;
      if (msg.type === "PROGRESS") {
        setProgress(msg.progress as number);
      } else if (msg.type === "CHUNK") {
        setTotalRows((r) => r + (Array.isArray(msg.rows) ? msg.rows.length : 0));
        if (preview.length < (DEFAULT_PARSE_OPTIONS.previewRows ?? 10)) {
          const needed = (DEFAULT_PARSE_OPTIONS.previewRows ?? 10) - preview.length;
          const next = (msg.rows as CsvRow[]).slice(0, needed);
          setPreview((p) => p.concat(next));
        }
      } else if (msg.type === "DONE") {
        setParsing(false);
        setErrors(msg.errors ?? []);
      } else if (msg.type === "ERROR") {
        setParsing(false);
        setErrors((e) => e.concat(String(msg.error)));
      }
    };

    return () => {
      w.terminate();
      workerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headers = useMemo(() => {
    if (!preview.length) return [];
    return Object.keys(preview[0] ?? {});
  }, [preview]);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      options: { header, delimiter }
    });
  };

  return (
    <div className="max-w-3xl mx-auto grid gap-6">
      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">Import CSV</h2>
        <input type="file" accept=".csv,text/csv" onChange={onSelectFile} />
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={header} onChange={(e) => setHeader(e.target.checked)} />
            <span>First row is header</span>
          </label>
          <label className="flex items-center gap-2">
            <span>Delimiter</span>
            <input
              className="border rounded px-2 py-1 w-16"
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value)}
            />
          </label>
          <button
            className="px-3 py-1 rounded bg-black text-white disabled:opacity-50"
            onClick={onParse}
            disabled={!file || parsing}
          >
            {parsing ? "Parsing…" : "Parse"}
          </button>
        </div>

        {progress > 0 && (
          <div className="text-sm text-gray-600">Rows processed: {progress.toLocaleString()}</div>
        )}
      </section>

      <section className="grid gap-3">
        <h3 className="font-semibold">Preview (first {DEFAULT_PARSE_OPTIONS.previewRows})</h3>
        {!preview.length ? (
          <div className="text-sm text-gray-500">No data yet.</div>
        ) : (
          <div className="overflow-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {headers.map((h) => (
                    <th key={h} className="text-left px-2 py-1 border-b">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="odd:bg-white even:bg-gray-50">
                    {headers.map((h) => (
                      <td key={h} className="px-2 py-1 border-b">
                        {row[h]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalRows > 0 && (
          <div className="text-sm text-gray-600">
            Total rows seen so far: {totalRows.toLocaleString()}
          </div>
        )}
        {!!errors.length && (
          <div className="text-sm text-red-600">
            <div className="font-semibold mb-1">Errors</div>
            <ul className="list-disc ml-5">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="grid gap-2">
        <h3 className="font-semibold">Mapping (placeholder)</h3>
        <div className="text-sm text-gray-600">
          Next: add dropdowns to map CSV headers to fields like itemPrice, cogs, fees, etc. Saved presets will live
          here.
        </div>
      </section>
    </div>
  );
}
