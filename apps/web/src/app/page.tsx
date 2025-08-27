"use client";

import { useMemo, useState } from "react";
import { gross, net } from "@egc/calc-core";

type Inputs = {
  itemPrice: number;
  shippingCharged: number;
  shippingCost: number;
  cogs: number;
  feeRate: number; // decimal, e.g., 0.13 = 13%
};

type ItemRow = {
  id: number;
  inputs: Inputs;
  gross: number;
  fees: number;
  net: number;
  marginPct: number;
};

function computeRow(i: Inputs): Omit<ItemRow, "id" | "inputs"> {
  const g = gross(i.itemPrice, i.shippingCharged);
  const fees = g * i.feeRate;
  const n = net(i.itemPrice, i.shippingCharged, i.shippingCost, i.cogs, i.feeRate);
  const marginPct = g === 0 ? 0 : (n / g) * 100;
  return { gross: g, fees, net: n, marginPct };
}

export default function Page() {
  const [inputs, setInputs] = useState<Inputs>({
    itemPrice: 100,
    shippingCharged: 0,
    shippingCost: 8,
    cogs: 12,
    feeRate: 0.13,
  });

  const [rows, setRows] = useState<ItemRow[]>([]);
  const [nextId, setNextId] = useState(1);

  const preview = useMemo(() => computeRow(inputs), [inputs]);

  const totals = useMemo(() => {
    const acc = rows.reduce(
      (a, r) => {
        a.gross += r.gross;
        a.fees += r.fees;
        a.shippingCost += r.inputs.shippingCost;
        a.cogs += r.inputs.cogs;
        a.net += r.net;
        return a;
      },
      { gross: 0, fees: 0, shippingCost: 0, cogs: 0, net: 0 }
    );
    const marginPct = acc.gross === 0 ? 0 : (acc.net / acc.gross) * 100;
    return { ...acc, marginPct };
  }, [rows]);

  function num(v: string) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function addItem() {
    const computed = computeRow(inputs);
    setRows((prev) => [
      ...prev,
      {
        id: nextId,
        inputs,
        ...computed,
      },
    ]);
    setNextId((id) => id + 1);
    setInputs((s) => ({ ...s, itemPrice: 0 })); // reset only itemPrice
  }

  function clearAll() {
    setRows([]);
    setNextId(1);
  }

  function removeItem(id: number) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">EGC Manual Calculator</h1>

      <div className="grid gap-6 max-w-3xl">
        {/* Inputs */}
        <div className="grid gap-4 max-w-md">
          <label className="grid gap-1">
            <span>Item price</span>
            <input
              type="number"
              className="border rounded p-2"
              value={inputs.itemPrice}
              onChange={(e) =>
                setInputs((s) => ({ ...s, itemPrice: num(e.target.value) }))
              }
            />
          </label>

          <label className="grid gap-1">
            <span>Shipping charged</span>
            <input
              type="number"
              className="border rounded p-2"
              value={inputs.shippingCharged}
              onChange={(e) =>
                setInputs((s) => ({ ...s, shippingCharged: num(e.target.value) }))
              }
            />
          </label>

          <label className="grid gap-1">
            <span>Shipping cost</span>
            <input
              type="number"
              className="border rounded p-2"
              value={inputs.shippingCost}
              onChange={(e) =>
                setInputs((s) => ({ ...s, shippingCost: num(e.target.value) }))
              }
            />
          </label>

          <p className="mt-2">
            <a href="/csv" className="underline">
              Go to CSV Import
            </a>
          </p>

          <label className="grid gap-1">
            <span>COGS</span>
            <input
              type="number"
              className="border rounded p-2"
              value={inputs.cogs}
              onChange={(e) => setInputs((s) => ({ ...s, cogs: num(e.target.value) }))}
            />
          </label>

          <label className="grid gap-1">
            <span>Fee rate (e.g., 0.13 = 13%)</span>
            <input
              type="number"
              step="0.001"
              className="border rounded p-2"
              value={inputs.feeRate}
              onChange={(e) =>
                setInputs((s) => ({ ...s, feeRate: num(e.target.value) }))
              }
            />
          </label>

          <div className="flex gap-3">
            <button className="border rounded px-4 py-2" onClick={addItem}>
              Add item
            </button>
            <button className="border rounded px-4 py-2" onClick={clearAll}>
              Clear list
            </button>
          </div>
        </div>

        {/* Live preview */}
        <div className="rounded-2xl border p-4">
          <div className="text-lg font-semibold mb-2">Preview</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-sm text-gray-500">Gross</div>
              <div className="text-xl font-medium">${preview.gross.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Fees</div>
              <div className="text-xl font-medium">${preview.fees.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Net</div>
              <div className="text-xl font-medium">${preview.net.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Margin %</div>
              <div className="text-xl font-medium">
                {preview.marginPct.toFixed(2)}%
              </div>
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-600">
            Using: item ${inputs.itemPrice.toFixed(2)}, ship charged $
            {inputs.shippingCharged.toFixed(2)}, ship cost $
            {inputs.shippingCost.toFixed(2)}, COGS ${inputs.cogs.toFixed(2)}, fee
            rate {(inputs.feeRate * 100).toFixed(2)}%
          </div>
        </div>

        {/* Items list */}
        <div className="grid gap-3">
          <h2 className="text-xl font-semibold">Items</h2>
          {rows.length === 0 ? (
            <div className="text-gray-600">No items yet. Add the first one.</div>
          ) : (
            <ul className="grid gap-3">
              {rows.map((r) => (
                <li key={r.id} className="rounded-2xl border p-4">
                  <div className="flex items-start justify-between">
                    <div className="font-medium">Item #{r.id}</div>
                    <button
                      className="text-sm underline"
                      onClick={() => removeItem(r.id)}
                    >
                      remove
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      Item price: <strong>${r.inputs.itemPrice.toFixed(2)}</strong>
                    </div>
                    <div>
                      Shipping charged:{" "}
                      <strong>${r.inputs.shippingCharged.toFixed(2)}</strong>
                    </div>
                    <div>
                      Shipping cost:{" "}
                      <strong>${r.inputs.shippingCost.toFixed(2)}</strong>
                    </div>
                    <div>
                      COGS: <strong>${r.inputs.cogs.toFixed(2)}</strong>
                    </div>
                    <div>
                      Fee rate:{" "}
                      <strong>{(r.inputs.feeRate * 100).toFixed(2)}%</strong>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-500">Gross</div>
                      <div className="text-lg font-medium">
                        ${r.gross.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Fees</div>
                      <div className="text-lg font-medium">
                        ${r.fees.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Net</div>
                      <div className="text-lg font-medium">
                        ${r.net.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Margin %</div>
                      <div className="text-lg font-medium">
                        {r.marginPct.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Running totals */}
        <div className="rounded-2xl border p-4">
          <div className="text-lg font-semibold mb-2">Running total</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-sm text-gray-500">Gross</div>
              <div className="text-xl font-medium">${totals.gross.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Fees</div>
              <div className="text-xl font-medium">${totals.fees.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Shipping cost</div>
              <div className="text-xl font-medium">
                ${totals.shippingCost.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">COGS</div>
              <div className="text-xl font-medium">${totals.cogs.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Net</div>
              <div className="text-xl font-medium">${totals.net.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Margin %</div>
              <div className="text-xl font-medium">
                {totals.marginPct.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}




