"use client";

import { useCalculatorStore } from "../../stores/calculatorStore";

function NumInput({
  label,
  value,
  onChange,
  step = "0.01",
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: string;
}) {
  return (
    <label className="grid gap-1">
      <span>{label}</span>
      <input
        type="number"
        step={step}
        className="border rounded p-2"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export default function SaleAmountsSection() {
  const { input, set } = useCalculatorStore();

  return (
    <section className="grid gap-4 max-w-xl">
      <NumInput
        label="Item price"
        value={input.sale.itemPrice}
        onChange={(n) => set("sale.itemPrice", n)}
      />
      <NumInput
        label="Quantity"
        step="1"
        value={input.sale.quantity}
        onChange={(n) => set("sale.quantity", Math.max(1, Math.floor(n)))}
      />
      <NumInput
        label="Shipping charged to buyer"
        value={input.sale.shippingChargedToBuyer}
        onChange={(n) => set("sale.shippingChargedToBuyer", n)}
      />
      <NumInput
        label="Seller-funded coupon/discount"
        value={input.sale.sellerCouponDiscount}
        onChange={(n) => set("sale.sellerCouponDiscount", n)}
      />
      <NumInput
        label="Order-level discount (markdown/sale)"
        value={input.sale.orderLevelDiscount}
        onChange={(n) => set("sale.orderLevelDiscount", n)}
      />
      <NumInput
        label="Combined-order discount"
        value={input.sale.combinedOrderDiscount}
        onChange={(n) => set("sale.combinedOrderDiscount", n)}
      />
      <NumInput
        label="Gift cards/store credit applied"
        value={input.sale.giftCardOrStoreCreditApplied}
        onChange={(n) => set("sale.giftCardOrStoreCreditApplied", n)}
      />
      <NumInput
        label="Tip"
        value={input.sale.tip}
        onChange={(n) => set("sale.tip", n)}
      />
    </section>
  );
}





