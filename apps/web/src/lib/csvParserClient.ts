/**
 * CSV Parser Client wrapper
 * Spawns the csvWorker.ts and wires events.
 */

export type CsvWorkerEvent =
  | { type: "ready" }
  | { type: "progress"; rows: number; bytes?: number; percent?: number }
  | { type: "headers"; headers: string[] }
  | { type: "sample"; rows: Record<string, string | number>[] }
  | { type: "chunk"; rows: number }
  | { type: "done"; rows: number }
  | { type: "aborted" }
  | { type: "error"; message: string };

export type CsvParserHandle = {
  cancel: () => void;
};

/**
 * Start parsing a CSV file in a worker.
 */
export function parseCsvFile(
  file: File,
  opts: { header?: boolean; sampleSize?: number } = {},
  onEvent: (e: CsvWorkerEvent) => void
): CsvParserHandle {
  // Dynamically import worker. With Vite, use new URL import.meta.
  const worker = new Worker(new URL("../workers/csvWorker.ts", import.meta.url), {
    type: "module",
  });

  worker.onmessage = (ev: MessageEvent<CsvWorkerEvent>) => {
    onEvent(ev.data);
  };

  worker.onerror = (err) => {
    onEvent({ type: "error", message: err.message || "Worker error" });
  };

  worker.postMessage({ type: "parse", file, options: opts });

  return {
    cancel: () => {
      worker.postMessage({ type: "cancel" });
      worker.terminate();
    },
  };
}
