/**
 * rollupClient
 * Map parsed CSV rows (with header mapping) into Orders and compute rollups client-side.
 * Only summary data will be POSTed, not raw rows.
 *
 * NOTE: Local types used until @egc/calc-core exports formal ones.
 */

type Row = Record<string, string | number>;

export type OrderLite = {
  date: string;                 // YYYY-MM-DD
  itemPrice: number;
  shippingCharged: number;
  shippingCost: number;
  cogs: number;
  feeRate: number;              // percent 0..100
  qty: number;
};

export type DailyRollupLite = {
  date: string;                 // YYYY-MM-DD
  gross: number;
  fees: number;
  net: number;
  asp: number;                  // average selling price (placeholder calc)
  str: number;                  // sell-through rate (placeholder calc)
};

export function mapRowsToOrders(rows: Row[], mapping: Record<string, string>): OrderLite[] {
  return rows.map((r) => {
    const itemPrice = Number(r[mapping.itemPrice] ?? 0) || 0;
    const shippingCharged = Number(r[mapping.shippingCharged] ?? 0) || 0;
    const shippingCost = Number(r[mapping.shippingCost] ?? 0) || 0;
    const cogs = Number(r[mapping.cogs] ?? 0) || 0;
    const feeRate = Number(r[mapping.feeRate] ?? 0) || 0;

    // TODO: add date mapping once available in the wizard
    const date = new Date().toISOString().slice(0, 10);

    return {
      date,
      itemPrice,
      shippingCharged,
      shippingCost,
      cogs,
      feeRate,
      qty: 1,
    };
  });
}

export function computeDailyRollups(orders: OrderLite[]): DailyRollupLite[] {
  const map = new Map<string, DailyRollupLite>();

  for (const o of orders) {
    const d = o.date;
    if (!map.has(d)) {
      map.set(d, { date: d, gross: 0, fees: 0, net: 0, asp: 0, str: 0 });
    }
    const r = map.get(d)!;

    const grossVal = o.itemPrice + o.shippingCharged;
    const feeVal = (grossVal * o.feeRate) / 100;
    const netVal = grossVal - feeVal - o.shippingCost - o.cogs;

    r.gross += grossVal;
    r.fees += feeVal;
    r.net += netVal;
  }

  // crude ASP/STR placeholders; refine after calc-core is wired
  for (const r of map.values()) {
    r.asp = r.gross; // placeholder
    r.str = 1;       // placeholder
  }

  return Array.from(map.values());
}

export async function postRollups(rollups: DailyRollupLite[]): Promise<void> {
  const res = await fetch("__REPLACE_ME::POST_ENDPOINT__", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rollups }),
  });
  if (!res.ok) {
    throw new Error(`Failed to post rollups: ${res.status}`);
  }
}





