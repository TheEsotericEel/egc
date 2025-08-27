/* eslint-disable @typescript-eslint/no-explicit-any */
/*
  CSV Worker: Papa Parse streaming in a Web Worker

  From main thread:
    // supported commands
    postMessage({ type: 'parse', file: Blob|File, options?: { header?: boolean; sampleSize?: number; delimiter?: string } })
    postMessage({ type: 'PARSE_FILE', file: Blob|File, options?: { header?: boolean; sampleSize?: number; delimiter?: string } })
    postMessage({ type: 'cancel' })

  Lowercase events for new client wrapper:
    { type: 'ready' }
    { type: 'progress', rows: number, bytes?: number, percent?: number }
    { type: 'headers', headers: string[] }
    { type: 'sample', rows: Array<Record<string, string | number>> }
    { type: 'chunk', rows: Array<Record<string, string | number>> }
    { type: 'done', rows: number }
    { type: 'aborted' }
    { type: 'error', message: string }

  Uppercase aliases for current CsvImport.tsx:
    { type: 'PROGRESS', progress: number }
    { type: 'CHUNK', rows: Array<Record<string, string | number>> }
    { type: 'DONE', errors?: string[] }
    { type: 'ERROR', error: string }
*/

import Papa, { type ParseResult } from "papaparse";

type Row = Record<string, string | number>;
type AnyRec = Record<string, unknown>;

let aborted = false;

/** Convert numeric-like strings to numbers, leave others as-is */
function toNumberIfNumeric(v: unknown): string | number {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return String(v ?? "");
  const trimmed = v.trim();
  if (trimmed === "") return "";
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : trimmed;
}

function normalizeRow(r: AnyRec): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(r)) out[k] = toNumberIfNumeric(v);
  return out;
}

/** Post in both lowercase (new) and uppercase (legacy UI) where applicable */
function post(type: string, payload?: Record<string, any>) {
  (postMessage as any)({ type, ...(payload ?? {}) });

  // Uppercase aliases for current CsvImport.tsx
  if (type === "progress") {
    (postMessage as any)({ type: "PROGRESS", progress: (payload?.rows as number) ?? 0 });
  } else if (type === "chunk") {
    (postMessage as any)({ type: "CHUNK", rows: payload?.rows ?? [] });
  } else if (type === "done") {
    (postMessage as any)({ type: "DONE", errors: [] as string[] });
  } else if (type === "error") {
    (postMessage as any)({ type: "ERROR", error: String(payload?.message ?? "Unknown error") });
  }
}

onmessage = (ev: MessageEvent) => {
  const data: any = ev.data;
  if (!data || typeof data.type !== "string") return;

  if (data.type === "cancel") {
    aborted = true;
    post("aborted");
    return;
  }

  if (data.type === "parse" || data.type === "PARSE_FILE") {
    const file = data.file as Blob;
    if (!file) {
      post("error", { message: "csvWorker: missing file Blob." });
      return;
    }

    const header: boolean = data.options?.header ?? true;
    const sampleSize: number = Math.max(1, Math.min(200, data.options?.sampleSize ?? 20));
    const delimiter: string | undefined = data.options?.delimiter;

    aborted = false;
    let totalRows = 0;
    let headersSent = false;
    const sample: Row[] = [];

    Papa.parse(file as unknown as any, {
      header,
      dynamicTyping: false,
      skipEmptyLines: "greedy",
      delimiter, // honor UI option
      chunkSize: 1024 * 256,
      chunk: (results: ParseResult<AnyRec>) => {
        if (aborted) return;

        if (!headersSent) {
          const headers = Array.isArray(results.meta.fields)
            ? (results.meta.fields as string[])
            : Object.keys((results.data as AnyRec[])[0] ?? {});
          post("headers", { headers });
          headersSent = true;
        }

        const rawRows = (results.data as AnyRec[]) || [];
        const normRows = rawRows.map(normalizeRow);

        if (normRows.length > 0) {
          // build sample for preview elsewhere
          for (let i = 0; i < normRows.length && sample.length < sampleSize; i++) {
            sample.push(normRows[i]);
          }
          totalRows += normRows.length;

          // send rows for UI preview slicing
          post("chunk", { rows: normRows });

          // progress by cursor if available, else just rows
          const cursor = (results as unknown as { meta?: { cursor?: number } })?.meta?.cursor;
          const size = (file as any)?.size as number | undefined;
          if (typeof cursor === "number" && typeof size === "number" && size > 0) {
            const percent = Math.min(100, Math.round((cursor / size) * 100));
            post("progress", { rows: totalRows, bytes: cursor, percent });
          } else {
            post("progress", { rows: totalRows });
          }
        }
      },
      complete: () => {
        if (aborted) {
          post("aborted");
          return;
        }
        post("sample", { rows: sample });
        post("done", { rows: totalRows });
      },
      error: (err: { message?: string }) => {
        post("error", { message: err?.message || "Unknown CSV parse error" });
      },
    } as any);

    return;
  }
};

// Notify main thread that the worker is ready
post("ready");
