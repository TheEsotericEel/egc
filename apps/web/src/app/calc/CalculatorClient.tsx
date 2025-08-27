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
  group:
    | "Sale"
    | "Shipping"
    | "Promotions"
    | "Store"
    | "Goals"
    | "Discounts"
    | "Returns"
    | "Taxes"
    | "Payments"
    | "International"
    | "Other";
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

  // Future fields slot
  // __REPLACE_ME::FIELD_SCHEMA_ADDITIONS__
];

// Default values for fast testing
const DEFAULTS: Record<string, number | boolean> = {
  // Sale
  price: 20,
  quantity: 1,
  cogs: 5,

  // Shipping
  buyerPaysShipping: false,
  shippingChargeToBuyer: 0,
  yourShippingCost: 4.5,
  packagingCostPerOrder: 0.25,
  insuranceCost: 0,
  handlingFeeToBuyer: 0,

  // Promotions / Ads
  promotedListingsRate: 3.0,
  promoShare: 60,
  promoAdvancedBudget: 0,

  // Store and fees
  finalValueFeeRate: 13.25,
  categoryFeeOverrideRate: 0,
  topRatedSellerDiscountRate: 0,
  paymentProcessingRate: 2.9,
  paymentFixedFee: 0.3,
  monthlyStoreFee: 27.95,

  // Discounts / Markdown
  sellerCouponPercent: 0,
  offerToBuyerPercent: 0,

  // Returns / Refunds
  returnRatePercent: 0,
  avgRefundPercent: 100,
  labelCostOnReturns: 0,
  restockingFeePercent: 0,

  // Taxes
  salesTaxOnItem: 0,
  marketplaceFacilitatorTax: true,

  // Payments / Misc platform
  disputeRatePercent: 0,
  avgDisputeLoss: 0,

  // International
  intlFeePercent: 0,
  intlExtraShipCost: 0,

  // Other
  miscFixedCostPerOrder: 0,
  miscPercentOfGross: 0,
};

type Inputs = typeof DEFAULTS;

function asPct(n: number) {
  return n / 100;
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
  return current;
}

/**
 * Compute core rollup for preview purposes.
 * Replace with calc-core later.
 *
 * Notes:
 * - Many bucket fields are not yet applied to the math preview.
 * - We will integrate them incrementally with calc-core to keep recompute fast.
 * - This file focuses on schema/UI completeness first.
 */
function compute(inputs: Inputs) {
  const qty = Number(inputs.quantity) || 0;
  const price = Number(inputs.price) || 0;
  const cogs = Number(inputs.cogs) || 0;
  const itemSubtotal = price * qty;

  const buyerPaysShipping = Boolean(inputs.buyerPaysShipping);
  const shippingChargeToBuyer = Number(inputs.shippingChargeToBuyer) || 0;
  const yourShippingCost = Number(inputs.yourShippingCost) || 0;
  const packaging = Number(inputs.packagingCostPerOrder) || 0;
  const insurance = Number(inputs.insuranceCost) || 0;
  const handlingToBuyer = Number(inputs.handlingFeeToBuyer) || 0;

  // Discounts applied to item price
  const sellerCoupon = asPct(Number(inputs.sellerCouponPercent) || 0);
  const offerToBuyer = asPct(Number(inputs.offerToBuyerPercent) || 0);
  const discountMultiplier = 1 - clamp(sellerCoupon + offerToBuyer, 0, 1);

  // Gross includes item after discounts + shipping charged + handling charged
  const discountedItemSubtotal = itemSubtotal * discountMultiplier;
  const shippingRevenue = buyerPaysShipping ? shippingChargeToBuyer + handlingToBuyer : 0;
  const grossBase = discountedItemSubtotal + shippingRevenue;

  // FVF: optional category override, then TRS discount
  const baseFvf = Number(inputs.categoryFeeOverrideRate) > 0 ? Number(inputs.categoryFeeOverrideRate) : Number(inputs.finalValueFeeRate) || 0;
  const trsDiscount = asPct(Number(inputs.topRatedSellerDiscountRate) || 0);
  const effectiveFvfRate = clamp(baseFvf * (1 - trsDiscount), 0, 100);
  const finalValueFee = grossBase * asPct(effectiveFvfRate);

  // Processing + fixed
  const processingFee = grossBase * asPct(Number(inputs.paymentProcessingRate) || 0) + (qty > 0 ? Number(inputs.paymentFixedFee) || 0 : 0);

  // Promoted Listings: share-based
  const promoRate = asPct(Number(inputs.promotedListingsRate) || 0);
  const promoShare = asPct(Number(clamp(Number(inputs.promoShare) || 0, 0, 100)));
  const promoFee = grossBase * promoRate * promoShare;

  // Misc percent
  const miscPct = asPct(Number(inputs.miscPercentOfGross) || 0);
  const miscPctFee = grossBase * miscPct;

  // International extras
  const intlPctFee = grossBase * asPct(Number(inputs.intlFeePercent) || 0);
  const intlExtraShip = Number(inputs.intlExtraShipCost) || 0;

  // Returns expected value (very simple placeholder EV)
  const returnRate = asPct(Number(inputs.returnRatePercent) || 0);
  const avgRefundPct = asPct(Number(inputs.avgRefundPercent) || 0);
  const restockPct = asPct(Number(inputs.restockingFeePercent) || 0);
  const expectedReturnLoss =
    returnRate *
    (grossBase * avgRefundPct - grossBase * restockPct + Number(inputs.labelCostOnReturns || 0));

  // Disputes expected value
  const disputeEV = asPct(Number(inputs.disputeRatePercent) || 0) * (Number(inputs.avgDisputeLoss) || 0);

  // Per-order fixed costs
  const perOrderFixed = packaging + insurance + (Number(inputs.miscFixedCostPerOrder) || 0);

  // Shipping cost you pay, plus intl add-on EV
  const totalShipCost = yourShippingCost + intlExtraShip;

  // Costs
  const fees =
    finalValueFee +
    processingFee +
    promoFee +
    miscPctFee +
    intlPctFee +
    disputeEV;

  const totalCOGS = cogs * qty;

  const net = grossBase - fees - totalCOGS - totalShipCost - perOrderFixed - expectedReturnLoss;
  const marginPct = grossBase > 0 ? (net / grossBase) * 100 : 0;

  return {
    qty,
    itemSubtotal: discountedItemSubtotal,
    shippingRevenue,
    gross: grossBase,
    finalValueFee,
    processingFee,
    promoFee,
    miscPctFee,
    intlPctFee,
    disputeEV,
    fees,
    totalCOGS,
    totalShipCost,
    perOrderFixed,
    expectedReturnLoss,
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
    // reserved for future CSV/API prefill normalization
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
              <ResultCard label="Item Subtotal (after discounts)" value={currency(result.itemSubtotal)} />
              <ResultCard label="Shipping Revenue" value={currency(result.shippingRevenue)} />
              <ResultCard label="Gross" value={currency(result.gross)} />
              <ResultCard label="Final Value Fee" value={currency(result.finalValueFee)} />
              <ResultCard label="Processing Fee" value={currency(result.processingFee)} />
              <ResultCard label="Promo Fee" value={currency(result.promoFee)} />
              <ResultCard label="Misc % Fee" value={currency(result.miscPctFee)} />
              <ResultCard label="Intl % Fee" value={currency(result.intlPctFee)} />
              <ResultCard label="Dispute EV" value={currency(result.disputeEV)} />
              <ResultCard label="COGS" value={currency(result.totalCOGS)} />
              <ResultCard label="Shipping + Intl Extra" value={currency(result.totalShipCost)} />
              <ResultCard label="Per-order Fixed" value={currency(result.perOrderFixed)} />
              <ResultCard label="Returns EV" value={currency(result.expectedReturnLoss)} />
              <ResultCard label="Net" value={currency(result.net)} />
              <ResultCard label="Margin %" value={result.marginPct.toFixed(2) + "%"} />
              {/* __REPLACE_ME::RESULT_CARDS_EXTRA__ */}
            </div>
            <p className="text-xs opacity-60 pt-2">
              __REPLACE_ME::BUCKET_NOTES__
            </p>
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
