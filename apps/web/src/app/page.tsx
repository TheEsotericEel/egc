"use client";

import { useState } from "react";
import { gross, net } from "@egc/calc-core";

export default function Home() {
  const [itemPrice, setItemPrice] = useState(100);
  const [shippingCharged, setShippingCharged] = useState(0);
  const [shippingCost, setShippingCost] = useState(8);
  const [cogs, setCogs] = useState(12);
  const [feeRate, setFeeRate] = useState(0.13);

  const g = gross(itemPrice, shippingCharged);
  const n = net(itemPrice, shippingCharged, shippingCost, cogs, feeRate);

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">EGC Demo</h1>

      <div className="grid gap-4 max-w-md">
        <label className="grid gap-1">
          <span>Item price</span>
          <input
            type="number"
            className="border rounded p-2"
            value={itemPrice}
            onChange={(e) => setItemPrice(Number(e.target.value))}
          />
        </label>

        <label className="grid gap-1">
          <span>Shipping charged</span>
          <input
            type="number"
            className="border rounded p-2"
            value={shippingCharged}
            onChange={(e) => setShippingCharged(Number(e.target.value))}
          />
        </label>

        <label className="grid gap-1">
          <span>Shipping cost</span>
          <input
            type="number"
            className="border rounded p-2"
            value={shippingCost}
            onChange={(e) => setShippingCost(Number(e.target.value))}
          />
        </label>

        <label className="grid gap-1">
          <span>COGS</span>
          <input
            type="number"
            className="border rounded p-2"
            value={cogs}
            onChange={(e) => setCogs(Number(e.target.value))}
          />
        </label>

        <label className="grid gap-1">
          <span>Fee rate (e.g., 0.13 = 13%)</span>
          <input
            type="number"
            step="0.001"
            className="border rounded p-2"
            value={feeRate}
            onChange={(e) => setFeeRate(Number(e.target.value))}
          />
        </label>

        <div className="mt-4 grid gap-2">
          <div>Gross: <strong>${g.toFixed(2)}</strong></div>
          <div>Net: <strong>${n.toFixed(2)}</strong></div>
        </div>
      </div>
    </main>
  );
}
