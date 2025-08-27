"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/**
 * Schema-first inputs for scalability.
 * Add fields by editing FIELDS. No JSX surgery.
 */

type FieldType = "money" | "percent" | "number" | "boolean";

type CalcFieldBase = {
  key: string;
  label: string;
  type: FieldType;
  help?: string;
  min?: number;
  max?: number;
  step?: number;
  group: "Sale" | "Shipping" | "Promotions" | "Store" | "Goals" | "Other";
};

type MoneyField = CalcFieldBase & { type: "money" };
type PercentField = CalcFieldBase & { type: "percent" };
type NumberField = CalcFieldBase & { type: "number" };
type BooleanField = CalcFieldBase & { type: "boolean" };

type CalcField = MoneyField | PercentField | NumberField | BooleanField;

// Initial schema. Extend safely later.
const FIELDS: CalcField[] = [
  // Sale
  { key: "price", label: "Selling price per item", type: "money", step: 0.01, min: 0, group: "Sale" },
  { key: "quantity", label: "Quantity", type: "number", step: 1, min: 1, group: "Sale" },
  { key: "cogs", label: "COGS per item", type: "money", step: 0.01, min: 0, group: "Sale" },

  // Shipping
  { key: "buyerPaysShipping", label: "Buyer pays shipping", type: "boolean", group: "Shipping" },
  { key: "shippingChargeToBuyer", label: "Shipping charged to buyer", type: "money", step: 0.01, min: 0, group: "Shipping" },
  { key: "yourShippingCost", label: "Your shipping cost", type: "money", step: 0.01, min: 0, group: "Shipping" },

  // Promotions
  { key: "promotedListingsRate", label: "Promoted Listings rate", type: "percent", step: 0.1, min: 0, max: 100, group: "Promotions" },
  { key: "promoShare", label: "Orders with promo applied", type: "percent", step: 1, min: 0, max: 100, group: "Promotions", help: "Percent of sales that incur ad fee" },

  // Store and fees
  { key: "finalValueFeeRate", label: "Final value fee rate", type: "percent", step: 0.1, min: 0, max: 100, group: "Store", help: "Category+store tier blended %" },
  { key: "paymentProcessingRate", label: "Payment processing rate", type: "percent", step: 0.1, min: 0, max: 100, group: "Store" },
  { key: "paymentFixedFee", label: "Payment fixed fee per order", type: "money", step: 0.01, min: 0, group: "Store" },
  { key: "monthlyStoreFee", label: "Monthly store subscription", type: "money", step: 0.01, min: 0, group: "Store" },

  // Goals
  { key: "netGoal", label: "Net goal (period)", type: "money", step: 0.01, min: 0, group: "Goals" },

  // Other
  { key: "salesTaxOnItem", label: "Sales tax collected on item", type: "percent", step: 0.1, min: 0, max: 100, group: "Other", help: "Usually excluded from seller net" },

  // Future fields slot
  // __REPLACE_ME::FIELD_SCHEMA_ADDITIONS__
];

// Default values for fast testing
const DEFAULTS: Record<string, number | boolean> = {
  price: 20,
  quantity: 1,
  cogs: 5,

  buyerPaysShipping: false,
  shippingChargeToBuyer: 0,
  yourShippingCost: 4.5,

  promotedListingsRate: 3.0,
  promoShare: 60,

  finalValueFeeRate: 13.25,
  paymentProcessingRate: 2.9,
  paymentFixedFee: 0.30,
  monthlyStoreFee: 27.95,

  netGoal: 1000,

  salesTaxOnItem: 0,
};

type Inputs = typeof DEFAULTS;

function asPct(n: number) {
  return (n / 100);
}

function currency(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function clamp(n: number, min?: number, max?: number) {
  if (min != null && n < min) return min;
  if (max != null && n > max) return max;
  return n;
}

/**
 * Prefill hook for 7-b:
 * Later replace the TODO with CSV/API sources.
 * Keeps UI stable while data source evolves.
 */
function usePrefill(current: Inputs): Inputs {
  // TODO: __REPLACE_ME::PREFILL_SOURCE__
  // Example future sources:
  // - CSV rollups from /csv flow
  // - API averages from eBay sync
  // For now: return current unchanged.
  return current;
}

/**
 * Compute core rollup for preview purposes.
 * Replace with calc-core later.
 */
function compute(inputs: Inputs) {
  const qty = Number(inputs.quantity) || 0;
  const price = Number(inputs.price) || 0;
  const cogs = Number(inputs.cogs) || 0;
  const itemSubtotal = price * qty;

  const buyerPaysShipping = Boolean(inputs.buyerPaysShipping);
  const shippingChargeToBuyer = Number(inputs.shippingChargeToBuyer) || 0;
  const yourShippingCost = Number(inputs.yourShippingCost) || 0;
  const shippingRevenue = buyerPaysShipping ? shippingChargeToBuyer : 0;

  // Gross considered for FVF typically includes item + shipping charged to buyer.
  const gross = itemSubtotal + shippingRevenue;

  const finalValueFee = gross * asPct(Number(inputs.finalValueFeeRate) || 0);
  const processingFee = gross * asPct(Number(inputs.paymentProcessingRate) || 0) + (qty > 0 ? Number(inputs.paymentFixedFee) || 0 : 0);

  // Promoted Listings: applied only to the share of orders that used ads
  const promoRate = asPct(Number(inputs.promotedListingsRate) || 0);
  const promoShare = asPct(Number(clamp(Number(inputs.promoShare) || 0, 0, 100)));
  const promoFee = gross * promoRate * promoShare;

  const totalCOGS = cogs * qty;
  const totalShipCost = yourShippingCost; // per-order estimate; refine later per-qty if needed

  const fees = finalValueFee + processingFee + promoFee;
  const net = gross - fees - totalCOGS - totalShipCost;
  const marginPct = gross > 0 ? (net / gross) * 100 : 0;

  return {
    qty,
    itemSubtotal,
    shippingRevenue,
    gross,
    finalValueFee,
    processingFee,
    promoFee,
    fees,
    totalCOGS,
    totalShipCost,
    net,
    marginPct,
  };
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border p-4 space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
      </header>
      {children}
    </section>
  );
}

function InputRenderer({
  field,
  value,
  onChange,
}: {
  field: CalcField;
  value: number | boolean;
  onChange: (next: number | boolean) => void;
}) {
  const common = "w-full rounded border px-3 py-2";
  const help = field.help ? <p className="text-xs opacity-70">{field.help}</p> : null;

  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          className="size-4"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.currentTarget.checked)}
        />
        <span className="select-none">{field.label}</span>
        {help}
      </label>
    );
  }

  const step =
    field.step ??
    (field.type === "percent" ? 0.1 : field.type === "money" ? 0.01 : 1);

  return (
    <label className="grid gap-1">
      <span className="text-sm">{field.label}</span>
      <input
        type="number"
        className={common}
        value={Number(value)}
        step={step}
        min={field.min as number | undefined}
        max={field.max as number | undefined}
        onChange={(e) => {
          const n = Number(e.currentTarget.value);
          onChange(clamp(isFinite(n) ? n : 0, field.min, field.max));
        }}
      />
      {help}
    </label>
  );
}

function Badge() {
  return (
    <span className="text-[10px] font-semibold tracking-wide rounded-full border px-2 py-1">
      ESTIMATION
    </span>
  );
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}

export default function CalculatorClient() {
  // Build state from defaults
  const [inputs, setInputs] = useState<Inputs>({ ...DEFAULTS });

  // Autofill slot for 7-b. Keeps UI constant as we swap sources later.
  const prefilled = usePrefill(inputs);

  const groups = useMemo(() => {
    const map = new Map<string, CalcField[]>();
    for (const f of FIELDS) {
      if (!map.has(f.group)) map.set(f.group, []);
      map.get(f.group)!.push(f);
    }
    return Array.from(map.entries());
  }, []);

  const result = useMemo(() => compute(prefilled), [prefilled]);

  function update(key: string, val: number | boolean) {
    setInputs((s) => ({ ...s, [key]: val }));
  }

  // Optional: sync prefill back into inputs once at mount if it ever diverges
  useEffect(() => {
    // no-op for now; reserved for future CSV/API prefill normalization
  }, []);

  return (
    <main className="p-6 grid gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Calculator Playground</h1>
          <Badge />
        </div>
        <div className="text-sm">
          <Link href="/csv" className="underline">Go to CSV Import</Link>
        </div>
      </div>

      {/* Layout: Inputs left, Results+Chart right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs column */}
        <div className="lg:col-span-1 space-y-4">
          {groups.map(([group, fields]) => (
            <Group key={group} title={group}>
              <div className="grid gap-3">
                {fields.map((f) => (
                  <InputRenderer
                    key={f.key}
                    field={f}
                    value={inputs[f.key] as number | boolean}
                    onChange={(v) => update(f.key, v)}
                  />
                ))}
              </div>
            </Group>
          ))}
        </div>

        {/* Results + Chart column */}
        <div className="lg:col-span-2 space-y-4">
          <Group title="Results">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <ResultCard label="Qty" value={result.qty.toString()} />
              <ResultCard label="Item Subtotal" value={currency(result.itemSubtotal)} />
              <ResultCard label="Shipping Revenue" value={currency(result.shippingRevenue)} />
              <ResultCard label="Gross" value={currency(result.gross)} />
              <ResultCard label="Final Value Fee" value={currency(result.finalValueFee)} />
              <ResultCard label="Processing Fee" value={currency(result.processingFee)} />
              <ResultCard label="Promo Fee" value={currency(result.promoFee)} />
              <ResultCard label="Total Fees" value={currency(result.fees)} />
              <ResultCard label="COGS" value={currency(result.totalCOGS)} />
              <ResultCard label="Your Shipping Cost" value={currency(result.totalShipCost)} />
              <ResultCard label="Net" value={currency(result.net)} />
              <ResultCard label="Margin %" value={result.marginPct.toFixed(2) + "%"} />
              {/* __REPLACE_ME::RESULT_CARDS_EXTRA__ */}
            </div>
          </Group>

          <Group title="Chart">
            <div className="grid place-items-center h-48 border rounded-lg">
              <p className="text-sm opacity-70">
                Chart placeholder. Wire your <code>RechartsDemo</code> here later.
              </p>
            </div>
          </Group>
        </div>
      </div>
    </main>
  );
}
