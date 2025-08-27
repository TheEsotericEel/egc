/**
 * CSV Parser Client wrapper
 * Spawns the csvWorker.ts and wires events with robust error reporting.
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

export function parseCsvFile(
  file: Blob, // accept Blob|File; worker also treats it as Blob
  opts: { header?: boolean; sampleSize?: number } = {},
  onEvent: (e: CsvWorkerEvent) => void
): CsvParserHandle {
  // Ensure this runs client-side only
  if (typeof window === "undefined") {
    onEvent({ type: "error", message: "parseCsvFile called on server" });
    return { cancel: () => {} };
  }

  // Create worker (Next.js/Turbopack supports URL with import.meta.url)
  const worker = new Worker(new URL("../workers/csvWorker.ts", import.meta.url), {
    type: "module",
  });

  // Safety timeout: if no message within 10s after parse starts, surface error
  let watchdog: number | undefined = undefined;
  function armWatchdog() {
    clearWatchdog();
    watchdog = window.setTimeout(() => {
      onEvent({
        type: "error",
        message:
          "CSV worker silent for 10s. Possible worker load failure or bundler issue. Check console for worker load errors.",
      });
      // Best effort terminate
      try {
        worker.terminate();
      } catch {}
    }, 10000);
  }
  function clearWatchdog() {
    if (watchdog !== undefined) {
      window.clearTimeout(watchdog);
      watchdog = undefined;
    }
  }

  worker.addEventListener("message", (ev: MessageEvent<CsvWorkerEvent>) => {
    // Any message means the worker is alive
    clearWatchdog();
    // Simple console trace for debugging
    // console.debug("[csvWorker message]", ev.data);
    onEvent(ev.data);
  });

  worker.addEventListener("error", (ev: ErrorEvent) => {
    clearWatchdog();
    onEvent({ type: "error", message: ev.message || "Worker runtime error" });
  });

  worker.addEventListener("messageerror", (ev: MessageEvent) => {
    clearWatchdog();
    onEvent({ type: "error", message: "Structured cloning failed when sending data to/from worker." });
  });

  try {
    worker.postMessage({ type: "parse", file, options: opts });
    armWatchdog();
  } catch (e: unknown) {
    clearWatchdog();
    onEvent({
      type: "error",
      message: e instanceof Error ? e.message : "Failed to start CSV worker",
    });
  }

  return {
    cancel: () => {
      try {
        worker.postMessage({ type: "cancel" });
      } catch {}
      try {
        worker.terminate();
      } catch {}
      clearWatchdog();
    },
  };
}





