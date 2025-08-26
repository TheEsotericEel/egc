/* eslint-disable no-restricted-globals */
import { parse, ParseResult } from "papaparse";

type WorkerMsgIn =
  | { type: "PARSE_FILE"; file: File; options: { header: boolean; delimiter?: string } };

type WorkerMsgOut =
  | { type: "PROGRESS"; progress: number }
  | { type: "CHUNK"; rows: Record<string, string>[] }
  | { type: "DONE"; rows: Record<string, string>[]; errors: string[] }
  | { type: "ERROR"; error: string };

self.onmessage = async (e: MessageEvent<WorkerMsgIn>) => {
  try {
    const data = e.data;
    if (data.type !== "PARSE_FILE") return;

    const allRows: Record<string, string>[] = [];
    const errors: string[] = [];
    let count = 0;

    parse<Record<string, string>>(data.file, {
      header: data.options.header,
      delimiter: data.options.delimiter,
      skipEmptyLines: true,
      worker: false, // already inside a Web Worker
      chunk: (res: ParseResult<Record<string, string>>) => {
        if (res.errors?.length) {
          for (const err of res.errors) errors.push(`${err.type}:${err.message}`);
        }
        if (res.data?.length) {
          allRows.push(...res.data);
          count += res.data.length;
          (self as unknown as Worker).postMessage({ type: "CHUNK", rows: res.data } as WorkerMsgOut);
          (self as unknown as Worker).postMessage({ type: "PROGRESS", progress: count } as WorkerMsgOut);
        }
      },
      complete: () => {
        (self as unknown as Worker).postMessage({ type: "DONE", rows: allRows, errors } as WorkerMsgOut);
      },
      error: (err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        (self as unknown as Worker).postMessage({ type: "ERROR", error: msg } as WorkerMsgOut);
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    (self as unknown as Worker).postMessage({ type: "ERROR", error: msg } as WorkerMsgOut);
  }
}
