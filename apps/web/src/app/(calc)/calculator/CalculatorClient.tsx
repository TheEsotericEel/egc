"use client";

import { useState } from "react";

type TabId =
  | "sale"
  | "shipping"
  | "cogs"
  | "sellerFees"
  | "ads"
  | "payments"
  | "crossBorder"
  | "taxes"
  | "returnsAdjustments"
  | "storeOverhead"
  | "goals"
  | "attribution"
  | "rollup"
  | "variance";

const TABS: { id: TabId; label: string; hint?: string }[] = [
  { id: "sale", label: "Sale amounts" },
  { id: "shipping", label: "Shipping costs" },
  { id: "cogs", label: "COGS" },
  { id: "sellerFees", label: "Seller fees" },
  { id: "ads", label: "Advertising" },
  { id: "payments", label: "Payment processing" },
  { id: "crossBorder", label: "Cross-border & currency" },
  { id: "taxes", label: "Taxes" },
  { id: "returnsAdjustments", label: "Refunds & adjustments" },
  { id: "storeOverhead", label: "Store & overhead" },
  { id: "goals", label: "Goals" },
  { id: "attribution", label: "Attribution knobs" },
  { id: "rollup", label: "Rollup summary" },
  { id: "variance", label: "Variance" },
];

export default function CalculatorClient() {
  const [active, setActive] = useState<TabId>("sale");

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Permanent ESTIMATION badge per scope */}
      <div className="mb-4 inline-flex select-none items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-wider">
        <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
        ESTIMATION
      </div>

      <div className="grid grid-cols-12 gap-4">
        <aside className="col-span-12 md:col-span-3">
          <nav className="rounded-xl border">
            <ul className="divide-y">
              {TABS.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setActive(t.id)}
                    className={[
                      "w-full text-left px-4 py-3",
                      active === t.id ? "bg-black/5 font-medium" : "hover:bg-black/5",
                    ].join(" ")}
                    aria-current={active === t.id ? "page" : undefined}
                  >
                    {t.label}
                    {t.hint ? <span className="ml-2 text-xs opacity-60">{t.hint}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="col-span-12 md:col-span-9">
          <Section visible={active === "sale"} title="Sale amounts" todo="SaleAmountsSection.tsx" />
          <Section visible={active === "shipping"} title="Shipping costs" todo="ShippingCostsSection.tsx" />
          <Section visible={active === "cogs"} title="COGS" todo="COGSSection.tsx" />
          <Section visible={active === "sellerFees"} title="Seller fees" todo="SellerFeesSection.tsx" />
          <Section visible={active === "ads"} title="Advertising" todo="AdvertisingSection.tsx" />
          <Section visible={active === "payments"} title="Payment processing" todo="PaymentsSection.tsx" />
          <Section visible={active === "crossBorder"} title="Cross-border & currency" todo="CrossBorderSection.tsx" />
          <Section visible={active === "taxes"} title="Taxes" todo="TaxesSection.tsx" />
          <Section
            visible={active === "returnsAdjustments"}
            title="Refunds & adjustments"
            todo="ReturnsAdjustmentsSection.tsx"
          />
          <Section visible={active === "storeOverhead"} title="Store & overhead" todo="StoreOverheadSection.tsx" />
          <Section visible={active === "goals"} title="Goals" todo="GoalsSection.tsx" />
          <Section visible={active === "attribution"} title="Attribution knobs" todo="AttributionKnobsSection.tsx" />
          <Section visible={active === "rollup"} title="Rollup summary" todo="RollupSummary.tsx" />
          <Section visible={active === "variance"} title="Variance" todo="VariancePanel.tsx" />
        </main>
      </div>
    </div>
  );
}

function Section(props: { visible: boolean; title: string; todo: string }) {
  if (!props.visible) return null;
  return (
    <section className="rounded-xl border p-4 md:p-6">
      <h1 className="text-xl font-semibold">{props.title}</h1>
      <p className="mt-2 text-sm opacity-70">
        Placeholder. This area will render <code>{props.todo}</code> when implemented.
      </p>
      <div className="mt-4 rounded-lg border p-4">
        <ul className="list-disc pl-5 text-sm opacity-80">
          <li>Inputs and outputs per your “Calculator Math Buckets.”</li>
          <li>Wire to <code>@egc/calc-core</code> once section components exist.</li>
          <li>Keep recompute fast for Phase 2 dashboard. </li>
        </ul>
      </div>
    </section>
  );
}
