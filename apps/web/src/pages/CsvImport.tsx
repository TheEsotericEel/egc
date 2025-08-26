"use client";

import React from "react";
import CsvMappingWizard from "../components/CsvMappingWizard";
import { parseCsvFile, type CsvWorkerEvent, type CsvParserHandle } from "../lib/csvParserClient";
import { mapRowsToOrders, computeDailyRollups, type OrderLite, type DailyRollupLite } from "../lib/rollupClient";

type Row = Record<string, string | number>;

export default function CsvImport() {
  const [file, setFile] = React.useState<File | null>(null);
  const [parsing, setParsing] = React.useState(false);
  const [progressRows, setProgressRows] = React.useState(0);
  const [progressPercent, setProgressPercent] = React.useState<number | undefined>(undefined);
  const [headers, setHeaders] = React.useState<string[] | null>(null);
  const [sampleRows, setSampleRows] = React.useState<Row[]>([]);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [rollups, setRollups] = React.useState<DailyRollupLite[] | null>(null);

  const handleRef = React.useRef<CsvParserHandle | null>(null);
  const [allRows, setAllRows] = React.useState<Row[]>([]);

  function resetState() {
    setParsing(false);
    setProgressRows(0);
    setProgressPercent(undefined);
    setHeaders(null);
    setSampleRows([]);
    setErrorMsg(null);
    setRollups(null);
    setAllRows([]);
    handleRef.current = null;
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    resetState();
  }

  function startParse() {
    if (!file) return;
    setParsing(true);
    setErrorMsg(null);
    setProgressRows(0);
    setProgressPercent(undefined);
    setHeaders(null);
    setSampleRows([]);
    setAllRows([]);

    const rows: Row[] = [];

    handleRef.current = parseCsvFile(
      file,
      { header: true, sampleSize: 20 },
      (ev: CsvWorkerEvent) => {
        switch (ev.type) {
          case "ready":
            break;
          case "headers":
            setHeaders(ev.headers);
            break;
          case "progress":
            setProgressRows(ev.rows);
            setProgressPercent(ev.percent);
            break;
          case "sample":
            setSampleRows(ev.rows);
            break;
          case "chunk":
            // In real use, would accumulate rows per chunk; here only sample is shown.
            // Could wire chunk data if needed for rollups.
            break;
          case "error":
            setErrorMsg(ev.message);
            setParsing(false);
            break;
          case "aborted":
            setParsing(false);
            break;
          case "done":
            setParsing(false);
            // NOTE: At present we only use sampleRows; integration with full dataset
            // will require streaming accumulation or re-parse.
            break;
          default:
            break;
        }
      }
    );
  }

  function cancelParse() {
    handleRef.current?.cancel();
    handleRef.current = null;
    setParsing(false);
  }

  function handleConfirm(mapping: Record<string, string>) {
    // Map sampleRows to Orders and compute rollups
    const orders: OrderLite[] = mapRowsToOrders(sampleRows, mapping);
    const rollupData: DailyRollupLite[] = computeDailyRollups(orders);
    setRollups(rollupData);

    // __REPLACE_ME::POST_ENDPOINT__ can be used with postRollups(rollupData) later
    console.log("Computed rollups:", rollupData);
  }

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">CSV Import</h1>
        <p className="text-sm text-gray-600">Upload a CSV, parse it in a Web Worker, then map headers.</p>
      </header>

      <section className="rounded-2xl border p-4 space-y-3">
        <label className="block text-sm font-medium">Choose CSV file</label>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={onFileChange}
          className="block w-full rounded border p-2"
        />

        <div className="flex gap-2">
          <button
            className="rounded-xl border px-4 py-2 disabled:opacity-50"
            onClick={startParse}
            disabled={!file || parsing}
            title={!file ? "Select a CSV file first" : "Start parsing"}
          >
            Start parsing
          </button>
          <button
            className="rounded-xl border px-4 py-2 disabled:opacity-50"
            onClick={cancelParse}
            disabled={!parsing}
            title="Cancel parsing"
          >
            Cancel
          </button>
          <button
            className="rounded-xl border px-4 py-2"
            onClick={resetState}
            title="Reset page state"
          >
            Reset
          </button>
        </div>

        <div className="text-sm text-gray-700">
          <div>Rows processed: <span className="font-mono">{progressRows}</span></div>
          <div>Progress: <span className="font-mono">{progressPercent ?? "—"}{progressPercent != null ? "%" : ""}</span></div>
          {errorMsg && (
            <div className="mt-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-rose-700">
              Error: {errorMsg}
            </div>
          )}
        </div>
      </section>

      {headers && headers.length > 0 && (
        <section className="rounded-2xl border p-4 space-y-6">
          <CsvMappingWizard
            headers={headers}
            sampleRows={sampleRows}
            onConfirm={handleConfirm}
            presetNamespace="orders"
          />

          {rollups && rollups.length > 0 && (
            <div className="mt-6 rounded-xl border p-4 bg-gray-50">
              <h2 className="text-lg font-semibold mb-2">Rollup Preview</h2>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="px-2 py-1 text-left">Date</th>
                    <th className="px-2 py-1 text-right">Gross</th>
                    <th className="px-2 py-1 text-right">Fees</th>
                    <th className="px-2 py-1 text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {rollups.map((r) => (
                    <tr key={r.date} className="border-b">
                      <td className="px-2 py-1">{r.date}</td>
                      <td className="px-2 py-1 text-right">{r.gross.toFixed(2)}</td>
                      <td className="px-2 py-1 text-right">{r.fees.toFixed(2)}</td>
                      <td className="px-2 py-1 text-right">{r.net.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
