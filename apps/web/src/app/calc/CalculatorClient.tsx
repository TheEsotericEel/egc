"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { compute, type CalcInputs, type CalcResult } from "../../../../../packages/calc-core/src/calc";

/**
 * Extend core inputs with UI-only fields.
 */
type AppInputs = CalcInputs & {
  netGoal: number;
};

type FieldType = "money" | "percent" | "number" | "boolean";

type CalcFieldBase = {
  key: keyof AppInputs;
  label: string;
  type: FieldType;
  help?: string;
  min?: number;
  max?: number;
  step?: number;
  group: string;
};

type CalcField = CalcFieldBase;

/**
 * Adapter: strip UI-only keys before calling core.
 */
function toCore(inputs: AppInputs): CalcInputs {
  const { netGoal, ...rest } = inputs;
  return rest;
}

/**
 * Schema of fields. Includes UI-only ones like netGoal.
 */
const FIELDS: CalcField[] = [
  { key: "price", label: "Selling price per item", type: "money", step: 0.01, min: 0, group: "Sale" },
  { key: "quantity", label: "Quantity", type: "number", step: 1, min: 1, group: "Sale" },
  { key: "cogs", label: "COGS per item", type: "money", step: 0.01, min: 0, group: "Sale" },
  { key: "netGoal", label: "Net goal (period)", type: "money", step: 0.01, min: 0, group: "Goals" },
  // ...keep other schema entries here...
];

/**
 * Default values, including netGoal.
 */
const DEFAULTS: AppInputs = {
  // Sale
  price: 20,
  quantity: 1,
  cogs: 5,

  // Goals
  netGoal: 1000,

  // Shipping
  buyerPaysShipping: false,
  shippingChargeToBuyer: 0,
  yourShippingCost: 4.5,
  packagingCostPerOrder: 0.25,
  insuranceCost: 0,
  handlingFeeToBuyer: 0,

  // Promotions
  promotedListingsRate: 3.0,
  promoShare: 60,
  promoAdvancedBudget: 0,

  // Store
  finalValueFeeRate: 13.25,
  categoryFeeOverrideRate: 0,
  topRatedSellerDiscountRate: 0,
  paymentProcessingRate: 2.9,
  paymentFixedFee: 0.3,
  monthlyStoreFee: 27.95,

  // Discounts
  sellerCouponPercent: 0,
  offerToBuyerPercent: 0,

  // Returns
  returnRatePercent: 0,
  avgRefundPercent: 100,
  labelCostOnReturns: 0,
  restockingFeePercent: 0,

  // Taxes
  salesTaxOnItem: 0,
  marketplaceFacilitatorTax: true,

  // Payments
  disputeRatePercent: 0,
  avgDisputeLoss: 0,

  // International
  intlFeePercent: 0,
  intlExtraShipCost: 0,

  // Other
  miscFixedCostPerOrder: 0,
  miscPercentOfGross: 0,
};

/**
 * Hook for autofill (7-b).
 */
function usePrefill(current: AppInputs): AppInputs {
  return current;
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
        min={field.min}
        max={field.max}
        onChange={(e) => {
          const n = Number(e.currentTarget.value);
          onChange(isFinite(n) ? n : 0);
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
  const [inputs, setInputs] = useState<AppInputs>({ ...DEFAULTS });

  const prefilled = usePrefill(inputs);

  const groups = useMemo(() => {
    const map = new Map<string, CalcField[]>();
    for (const f of FIELDS) {
      if (!map.has(f.group)) map.set(f.group, []);
      map.get(f.group)!.push(f);
    }
    return Array.from(map.entries());
  }, []);

  const result: CalcResult = useMemo(() => compute(toCore(prefilled)), [prefilled]);

  function update(key: keyof AppInputs, val: number | boolean) {
    setInputs((s: AppInputs) => ({ ...s, [key]: val } as AppInputs));
  }

  useEffect(() => {
    // reserved for CSV/API prefill normalization
  }, []);

  return (
    <main className="p-6 grid gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Calculator Playground</h1>
          <Badge />
        </div>
        <div className="text-sm">
          <Link href="/csv" className="underline">Go to CSV Import</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          {groups.map(([group, fields]) => (
            <Group key={group} title={group}>
              <div className="grid gap-3">
                {fields.map((f) => (
                  <InputRenderer
                    key={String(f.key)}
                    field={f}
                    value={inputs[f.key]}
                    onChange={(v) => update(f.key, v)}
                  />
                ))}
              </div>
            </Group>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Group title="Results">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <ResultCard label="Qty" value={result.qty.toString()} />
              <ResultCard label="Gross" value={result.gross.toLocaleString(undefined,{style:"currency",currency:"USD"})} />
              <ResultCard label="Net" value={result.net.toLocaleString(undefined,{style:"currency",currency:"USD"})} />
              <ResultCard label="Margin %" value={result.marginPct.toFixed(2) + "%"} />
              <ResultCard label="Net Goal" value={inputs.netGoal.toLocaleString(undefined,{style:"currency",currency:"USD"})} />
            </div>
          </Group>
        </div>
      </div>
    </main>
  );
}
