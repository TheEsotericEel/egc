/**
 * /api/rollups
 * GET  -> health check
 * POST -> accept client-computed rollups
 */

export type RollupRow = {
  column: string;
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
};

export type RollupsPayload = {
  rollups: RollupRow[];
  totalRows: number;
  headers?: string[];
  fileMeta?: { name: string; size: number; type?: string };
};

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function validatePayload(body: unknown): { ok: true; data: RollupsPayload } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Body must be an object" };
  const b = body as Record<string, unknown>;

  if (!Array.isArray(b.rollups)) return { ok: false, error: "rollups must be an array" };
  if (!isFiniteNumber(b.totalRows)) return { ok: false, error: "totalRows must be a number" };

  for (const r of b.rollups) {
    const rr = r as Record<string, unknown>;
    if (typeof rr.column !== "string") return { ok: false, error: "rollups[].column must be a string" };
    if (!isFiniteNumber(rr.count)) return { ok: false, error: `rollups[${rr.column}].count must be a number` };
    for (const k of ["sum", "min", "max", "avg"] as const) {
      if (!isFiniteNumber(rr[k])) return { ok: false, error: `rollups[${rr.column}].${k} must be a number` };
    }
  }

  if (b.headers && !Array.isArray(b.headers)) return { ok: false, error: "headers must be an array of strings if present" };
  if (b.fileMeta && (typeof b.fileMeta !== "object" || b.fileMeta === null)) return { ok: false, error: "fileMeta must be an object if present" };

  return {
    ok: true,
    data: {
      rollups: b.rollups as RollupRow[],
      totalRows: b.totalRows as number,
      headers: (b.headers as string[]) ?? undefined,
      fileMeta: (b.fileMeta as RollupsPayload["fileMeta"]) ?? undefined,
    },
  };
}

export async function GET(): Promise<Response> {
  return new Response(JSON.stringify({ ok: true, method: "GET", route: "/api/rollups" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: Request): Promise<Response> {
  // __REPLACE_ME::AUTHN__ add auth when available
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const v = validatePayload(body);
  if (!v.ok) {
    return new Response(JSON.stringify({ ok: false, error: v.error }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // __REPLACE_ME::PERSIST_ROLLUPS__
  console.log("rollups:received", {
    totalRows: v.data.totalRows,
    rollupColumns: v.data.rollups.length,
    file: v.data.fileMeta?.name ?? null,
  });

  return new Response(JSON.stringify({ ok: true, received: { rows: v.data.totalRows, cols: v.data.rollups.length } }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}