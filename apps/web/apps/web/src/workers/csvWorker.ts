/* eslint-disable @typescript-eslint/no-explicit-any */
import Papa, { type ParseResult } from "papaparse";

type Row = Record<string, string | number>;
type AnyRec = Record<string, unknown>;

let aborted = false;

// Parse strings like "$1,234.56", "1,234", "12%", "(123.45)" → number.
// Leave dates and non-numeric tokens as strings.
function coerceNumber(input: unknown): string | number {
  if (typeof input === "number") return Number.isFinite(input) ? input : "";
  if (typeof input !== "string") return String(input ?? "");
  let s = input.trim();
  if (s === "") return "";

  // Common "nullish" CSV placeholders
  if (s === "NA" || s === "N/A" || s === "null" || s === "NULL" || s === "-") return "";

  // Negative in parentheses: (123.45) -> -123.45
  const parenNeg = /^\((.*)\)$/.exec(s);
  if (parenNeg) s = `-${parenNeg[1]}`;

  // Remove common currency/formatting chars: $ , % spaces
  s = s.replace(/[\s$,]/g, "");

  // Allow trailing % (already stripped, but handle odd cases)
  s = s.replace(/%$/, "");

  // If remaining is a plain number, parse it
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    return Number.isFinite(n) ? n : input;
  }

  return input; // keep original string if not numeric
}

function normalizeRow(r: AnyRec): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(r)) out[k] = coerceNumber(v);
  return out;
}

// Post helper: emit both lowercase (new) and uppercase (legacy UI) events
function post(type: string, payload?: Record<string, any>) {
  (postMessage as any)({ type, ...(payload ?? {}) });
  if (type === "progress") (postMessage as any)({ type: "PROGRESS", progress: payload?.rows ?? 0 });
  else if (type === "chunk") (postMessage as any)({ type: "CHUNK", rows: payload?.rows ?? [] });
  else if (type === "done") (postMessage as any)({ type: "DONE", errors: [] as string[] });
  else if (type === "error") (postMessage as any)({ type: "ERROR", error: String(payload?.message ?? "Unknown error") });
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
      delimiter,
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
          for (let i = 0; i < normRows.length && sample.length < sampleSize; i++) sample.push(normRows[i]);

          totalRows += normRows.length;
          post("chunk", { rows: normRows });

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

// Ready signal
post("ready");
