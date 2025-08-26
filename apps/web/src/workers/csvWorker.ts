/*
  CSV Worker: Papa Parse streaming in a Web Worker

  From main thread:
    postMessage({ type: 'parse', file: Blob|File, options?: { header?: boolean; sampleSize?: number } })
    postMessage({ type: 'cancel' })

  To main thread:
    { type: 'ready' }
    { type: 'progress', rows: number, bytes?: number, percent?: number }
    { type: 'headers', headers: string[] }
    { type: 'sample', rows: Array<Record<string, string | number>> }
    { type: 'chunk', rows: number }
    { type: 'done', rows: number }
    { type: 'aborted' }
    { type: 'error', message: string }
*/

import Papa, { type ParseResult } from "papaparse";

type Row = Record<string, string | number>;

let aborted = false;

function toNumberIfNumeric(v: unknown): string | number {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return String(v ?? "");
  const trimmed = v.trim();
  if (trimmed === "") return "";
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : trimmed;
}

function normalizeRow(r: Record<string, unknown>): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(r)) out[k] = toNumberIfNumeric(v);
  return out;
}

function post(type: string, payload?: Record<string, unknown>) {
  // In worker context, global postMessage exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (postMessage as any)({ type, ...(payload ?? {}) });
}

onmessage = (ev: MessageEvent) => {
  const data = ev.data;
  if (!data || typeof data.type !== "string") return;

  if (data.type === "cancel") {
    aborted = true;
    post("aborted");
    return;
  }

  if (data.type === "parse") {
    // Accept Blob | File; some worker runtimes lack File constructor
    const file = data.file as Blob;
    if (!file) {
      post("error", { message: "csvWorker: missing file Blob." });
      return;
    }

    const header: boolean = data.options?.header ?? true;
    const sampleSize: number = Math.max(1, Math.min(200, data.options?.sampleSize ?? 20));

    aborted = false;
    let totalRows = 0;
    let headersSent = false;
    const sample: Row[] = [];

    Papa.parse(file as unknown as any, {
      header,
      dynamicTyping: false,
      skipEmptyLines: "greedy",
      chunkSize: 1024 * 256,
      chunk: (results: ParseResult<Record<string, unknown>>) => {
        if (aborted) return;

        if (!headersSent) {
          const headers = Array.isArray(results.meta.fields)
            ? results.meta.fields
            : Object.keys((results.data as Record<string, unknown>[])[0] ?? {});
          post("headers", { headers });
          headersSent = true;
        }

        const rows = results.data as Record<string, unknown>[];
        if (rows && rows.length > 0) {
          for (let i = 0; i < rows.length && sample.length < sampleSize; i++) {
            sample.push(normalizeRow(rows[i]));
          }

          totalRows += rows.length;
          post("chunk", { rows: rows.length });

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
