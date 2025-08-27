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
 * Append more fields by editing this array only.
 */
const FIELDS: CalcField[] = [
  // Sale
  { key: "price", label: "Selling price per item", type: "money", step: 0.01, min: 0, group: "Sale" },
  { key: "quantity", label: "Quantity", type: "number", step: 1, min: 1, group: "Sale" },
  { key: "cogs", label: "COGS per item", type: "money", step: 0.01, min: 0, group: "Sale" },

  // Goals
  { key: "netGoal", label: "Net goal (period)", type: "money", step: 0.01, min: 0, group: "Goals" },

  // Shipping
  { key: "buyerPaysShipping", label: "Buyer pays shipping", type: "boolean", group: "Shipping" },
  { key: "shippingChargeToBuyer", label: "Shipping charged to buyer", type: "money", step: 0.01, min: 0, group: "Shipping" },
  { key: "yourShippingCost", label: "Your shipping cost (per order)", type: "money", step: 0.01, min: 0, group: "Shipping" },
  { key: "packagingCostPerOrder", label: "Packaging cost (per order)", type: "money", step: 0.01, min: 0, group: "Shipping", help: "Boxes, mailers, tape" },
  { key: "insuranceCost", label: "Shipping insurance (per order)", type: "money", step: 0.01, min: 0, group: "Shipping" },
  { key: "handlingFeeToBuyer", label: "Handling fee charged to buyer", type: "money", step: 0.01, min: 0, group: "Shipping" },

  // Promotions / Ads
  { key: "promotedListingsRate", label: "Promoted Listings rate", type: "percent", step: 0.1, min: 0, max: 100, group: "Promotions" },
  { key: "promoShare", label: "Orders with promo applied", type: "percent", step: 1, min: 0, max: 100, group: "Promotions", help: "Percent of sales that incur ad fee" },
  { key: "promoAdvancedBudget", label: "Promoted Listings Advanced budget (daily est.)", type: "money", step: 0.01, min: 0, group: "Promotions", help: "Placeholder for PPC budgets" },

  // Store and fees
  { key: "finalValueFeeRate", label: "Final value fee rate", type: "percent", step: 0.1, min: 0, max: 100, group: "Store", help: "Category+store tier blended %" },
  { key: "categoryFeeOverrideRate", label: "Category override rate (optional)", type: "percent", step: 0.1, min: 0, max: 100, group: "Store", help: "If a specific category differs" },
  { key: "topRatedSellerDiscountRate", label: "Top Rated Seller discount", type: "percent", step: 0.1, min: 0, max: 100, group: "Store", help: "TRS/TRS+ discount %" },
  { key: "paymentProcessingRate", label: "Payment processing rate", type: "percent", step: 0.1, min: 0, max: 100, group: "Store" },
  { key: "paymentFixedFee", label: "Payment fixed fee per order", type: "money", step: 0.01, min: 0, group: "Store" },
  { key: "monthlyStoreFee", label: "Monthly store subscription", type: "money", step: 0.01, min: 0, group: "Store" },

  // Discounts / Markdown
  { key: "sellerCouponPercent", label: "Seller coupon or markdown", type: "percent", step: 0.1, min: 0, max: 100, group: "Discounts" },
  { key: "offerToBuyerPercent", label: "Offer-to-buyer discount", type: "percent", step: 0.1, min: 0, max: 100, group: "Discounts" },

  // Returns / Refunds
  { key: "returnRatePercent", label: "Return rate (orders)", type: "percent", step: 0.1, min: 0, max: 100, group: "Returns" },
  { key: "avgRefundPercent", label: "Avg refund % of order when returned", type: "percent", step: 0.1, min: 0, max: 100, group: "Returns" },
  { key: "labelCostOnReturns", label: "Return label cost (avg per return)", type: "money", step: 0.01, min: 0, group: "Returns" },
  { key: "restockingFeePercent", label: "Restocking fee charged to buyer", type: "percent", step: 0.1, min: 0, max: 100, group: "Returns" },

  // Taxes
  { key: "salesTaxOnItem", label: "Sales tax collected on item", type: "percent", step: 0.1, min: 0, max: 100, group: "Taxes", help: "Usually excluded from seller net" },
  { key: "marketplaceFacilitatorTax", label: "Marketplace facilitator tax handled", type: "boolean", group: "Taxes", help: "If platform remits tax" },

  // Payments / Misc platform
  { key: "disputeRatePercent", label: "Payment disputes rate (orders)", type: "percent", step: 0.1, min: 0, max: 100, group: "Payments" },
  { key: "avgDisputeLoss", label: "Avg loss per dispute (incl. fees)", type: "money", step: 0.01, min: 0, group: "Payments" },

  // International
  { key: "intlFeePercent", label: "International fee %", type: "percent", step: 0.1, min: 0, max: 100, group: "International", help: "Cross-border/currency conversion %" },
  { key: "intlExtraShipCost", label: "Intl extra ship cost (avg per order)", type: "money", step: 0.01, min: 0, group: "International" },

  // Other
  { key: "miscFixedCostPerOrder", label: "Misc fixed cost (per order)", type: "money", step: 0.01, min: 0, group: "Other" },
  { key: "miscPercentOfGross", label: "Misc % of gross", type: "percent", step: 0.1, min: 0, max: 100, group: "Other" },
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

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = !max || max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  const pctLabel = (pct * 100).toFixed(1) + "%";
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span>Goal Progress</span>
        <span>{pctLabel}</span>
      </div>
      <div className="h-3 rounded-full bg-gray-200">
        <div
          className="h-3 rounded-full bg-gray-800"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <div className="mt-1 text-xs">
        {value.toLocaleString(undefined, { style: "currency", currency: "USD" })} /{" "}
        {max.toLocaleString(undefined, { style: "currency", currency: "USD" })}
      </div>
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
            <div className="pt-4">
              <ProgressBar value={result.net} max={inputs.netGoal} />
            </div>
          </Group>
        </div>
      </div>
    </main>
  );
}

