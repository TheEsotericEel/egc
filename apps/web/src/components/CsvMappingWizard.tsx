"use client";

import React from "react";

type Row = Record<string, string | number>;

type Field = {
  key: string;
  label: string;
  description?: string;
};

type Mapping = Record<string, string>; // fieldKey -> headerName

type Props = {
  headers: string[];
  sampleRows: Row[]; // first N rows for preview
  onConfirm: (mapping: Mapping) => void;
  presetNamespace?: string; // e.g. "orders" | "payouts"
  requiredFields?: Field[];
};

const DEFAULT_FIELDS: Field[] = [
  { key: "itemPrice", label: "Item Price", description: "Sold price, excluding shipping paid by buyer" },
  { key: "shippingCharged", label: "Shipping Charged", description: "Amount buyer paid for shipping" },
  { key: "shippingCost", label: "Shipping Cost", description: "Your label/postage cost" },
  { key: "cogs", label: "COGS", description: "Cost of goods sold" },
  { key: "feeRate", label: "Fee Rate %", description: "Platform+ad fee percent if known" },
];

const STORAGE_PREFIX = "egc_csv_preset::";

function norm(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

const SYNONYMS: Record<string, string[]> = {
  itemPrice: ["itemprice","price","sold price","sale price","total price","order price","item amount","amount","total","transaction amount"],
  shippingCharged: ["shipping charged","shipping","buyer paid shipping","shipping amount","postage charged","shipping_charge","postage"],
  shippingCost: ["shipping cost","label cost","postage cost","shipping paid","ship cost","carrier cost"],
  cogs: ["cogs","cost of goods","purchase price","buy cost","acquisition cost","item cost","unit cost"],
  feeRate: ["fee rate","final value fee %","fvf %","ad rate","promoted rate","ad fee %","fee %","platform fee %","commission %"],
};

function getPresetKey(namespace: string, name: string) {
  return `${STORAGE_PREFIX}${namespace}::${name}`;
}

function listPresetNames(namespace: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const names: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (k.startsWith(`${STORAGE_PREFIX}${namespace}::`)) {
        const name = k.split("::").pop();
        if (name) names.push(name);
      }
    }
    return names.sort();
  } catch {
    return [];
  }
}

function savePreset(namespace: string, name: string, mapping: Mapping, headers: string[]) {
  if (typeof window === "undefined") return;
  const payload = { mapping, headers };
  localStorage.setItem(getPresetKey(namespace, name), JSON.stringify(payload));
}

function loadPreset(namespace: string, name: string): { mapping: Mapping; headers: string[] } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(getPresetKey(namespace, name));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function deletePreset(namespace: string, name: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getPresetKey(namespace, name));
}

function autoMap(headers: string[], fields: Field[]): Mapping {
  const mapping: Mapping = {};
  const used = new Set<string>();
  const normalizedHeaders = headers.map((h) => ({ h, n: norm(h) }));
  for (const f of fields) {
    const syns = SYNONYMS[f.key] ?? [];
    let candidate = normalizedHeaders.find(({ n }) => syns.includes(n) || n === norm(f.label));
    if (!candidate) candidate = normalizedHeaders.find(({ n }) => syns.some((s) => n.includes(s)));
    if (candidate && !used.has(candidate.h)) {
      mapping[f.key] = candidate.h;
      used.add(candidate.h);
    } else {
      mapping[f.key] = "";
    }
  }
  return mapping;
}

function validateMapping(mapping: Mapping, fields: Field[], headers: string[]) {
  const errors: string[] = [];
  const values = Object.values(mapping).filter(Boolean);
  const unique = new Set(values);
  if (values.length !== unique.size) {
    errors.push("Each field must map to a unique header.");
  }
  for (const f of fields) {
    const h = mapping[f.key];
    if (!h) errors.push(`Missing mapping for "${f.label}".`);
    if (h && !headers.includes(h)) errors.push(`Mapped header not found for "${f.label}": ${h}`);
  }
  return errors;
}

export default function CsvMappingWizard(props: Props) {
  const fields = props.requiredFields ?? DEFAULT_FIELDS;
  const [mapping, setMapping] = React.useState<Mapping>(() => autoMap(props.headers, fields));
  const [namespace, setNamespace] = React.useState<string>(props.presetNamespace ?? "orders");
  const [selectedPreset, setSelectedPreset] = React.useState<string>("");
  const [mismatchInfo, setMismatchInfo] = React.useState<string[]>([]);

  const presetNames = React.useMemo(() => listPresetNames(namespace), [namespace]);
  const errors = React.useMemo(() => validateMapping(mapping, fields, props.headers), [mapping, fields, props.headers]);

  function handleChange(fieldKey: string, header: string) {
    setMapping((m) => ({ ...m, [fieldKey]: header }));
  }

  function handleAutoMap() {
    setMapping(autoMap(props.headers, fields));
  }

  function handleClear() {
    const blank: Mapping = {};
    for (const f of fields) blank[f.key] = "";
    setMapping(blank);
  }

  function handleSavePreset() {
    const name = prompt("Preset name:");
    if (!name) return;
    savePreset(namespace, name, mapping, props.headers);
    setSelectedPreset(name);
  }

  function handleLoadPreset(name: string) {
    setSelectedPreset(name);
    const payload = loadPreset(namespace, name);
    if (!payload) return;
    const { mapping: saved, headers: presetHeaders } = payload;
    const missing: string[] = [];
    Object.values(saved).forEach((h) => {
      if (h && !props.headers.includes(h)) missing.push(h);
    });
    setMismatchInfo(missing);
    const applied: Mapping = {};
    for (const f of fields) {
      const h = saved[f.key] ?? "";
      applied[f.key] = h && props.headers.includes(h) ? h : "";
    }
    setMapping(applied);
  }

  function handleDeletePreset() {
    if (!selectedPreset) return;
    if (!confirm(`Delete preset "${selectedPreset}"?`)) return;
    deletePreset(namespace, selectedPreset);
    setSelectedPreset("");
  }

  const firstRow = props.sampleRows?.[0] ?? {};

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border p-4">
        <h2 className="text-xl font-semibold">CSV Mapping</h2>
        <p className="text-sm text-gray-500">Map your CSV headers to required fields, save or reuse presets, then continue.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="col-span-1 rounded-2xl border p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Preset namespace</label>
            <input
              className="w-full rounded border p-2"
              value={namespace}
              onChange={(e) => setNamespace(e.target.value.trim() || "default")}
              placeholder="orders or payouts"
            />
          </div>

          <div className="flex gap-2">
            <button className="rounded-xl border px-3 py-2" onClick={handleAutoMap}>Auto-map</button>
            <button className="rounded-xl border px-3 py-2" onClick={handleClear}>Clear</button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Presets</label>
            <div className="flex gap-2">
              <select
                className="flex-1 rounded border p-2"
                value={selectedPreset}
                onChange={(e) => handleLoadPreset(e.target.value)}
              >
                <option value="">— Select preset —</option>
                {presetNames.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <button className="rounded-xl border px-3 py-2" onClick={handleSavePreset}>Save</button>
              <button className="rounded-xl border px-3 py-2" onClick={handleDeletePreset} disabled={!selectedPreset}>Delete</button>
            </div>
            {mismatchInfo.length > 0 && (
              <p className="text-xs text-amber-600">
                Missing in current file: {mismatchInfo.join(", ")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Headers detected</label>
            <div className="max-h-32 overflow-auto rounded border p-2 text-xs">
              {props.headers.join(", ")}
            </div>
          </div>
        </div>

        <div className="col-span-2 rounded-2xl border p-4">
          <div className="space-y-4">
            {fields.map((f) => {
              const chosen = mapping[f.key] || "";
              const sample = chosen ? String(firstRow[chosen] ?? "") : "";
              return (
                <div key={f.key} className="grid md:grid-cols-3 gap-3 items-center">
                  <div>
                    <div className="font-medium">{f.label}</div>
                    {f.description && <div className="text-xs text-gray-500">{f.description}</div>}
                  </div>
                  <div className="md:col-span-2 flex items-center gap-3">
                    <select
                      className="min-w-56 flex-1 rounded border p-2"
                      value={chosen}
                      onChange={(e) => handleChange(f.key, e.target.value)}
                    >
                      <option value="">— Unmapped —</option>
                      {props.headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <div className="text-xs text-gray-600">
                      <div className="font-mono">sample: {sample || "—"}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {errors.length > 0 && (
            <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
              <div className="font-semibold mb-1">Fix before continuing:</div>
              <ul className="list-disc pl-5">
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              className="rounded-xl border px-4 py-2 disabled:opacity-50"
              onClick={() => props.onConfirm(mapping)}
              disabled={errors.length > 0}
              title={errors.length > 0 ? "Resolve errors to continue" : "Confirm mapping"}
            >
              Confirm mapping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}





