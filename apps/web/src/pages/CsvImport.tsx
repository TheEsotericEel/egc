"use client";

import React from "react";
import CsvMappingWizard from "../components/CsvMappingWizard";
import { parseCsvFile, type CsvWorkerEvent, type CsvParserHandle } from "../lib/csvParserClient";

type Row = Record<string, string | number>;

export default function CsvImport() {
  const [file, setFile] = React.useState<File | null>(null);
  const [parsing, setParsing] = React.useState(false);
  const [progressRows, setProgressRows] = React.useState(0);
  const [progressPercent, setProgressPercent] = React.useState<number | undefined>(undefined);
  const [headers, setHeaders] = React.useState<string[] | null>(null);
  const [sampleRows, setSampleRows] = React.useState<Row[]>([]);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleRef = React.useRef<CsvParserHandle | null>(null);

  function resetState() {
    setParsing(false);
    setProgressRows(0);
    setProgressPercent(undefined);
    setHeaders(null);
    setSampleRows([]);
    setErrorMsg(null);
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
          case "error":
            setErrorMsg(ev.message);
            setParsing(false);
            break;
          case "aborted":
            setParsing(false);
            break;
          case "done":
            setParsing(false);
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
    // Forward mapping to next step (rollups) or state store.
    // __REPLACE_ME::MAPPING_CONSUMER__
    console.log("Confirmed mapping:", mapping);
    alert("Mapping confirmed. Wire this to your rollups step next.");
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
        <section className="rounded-2xl border p-4">
          <CsvMappingWizard
            headers={headers}
            sampleRows={sampleRows}
            onConfirm={handleConfirm}
            presetNamespace="orders"
          />
        </section>
      )}
    </div>
  );
}
