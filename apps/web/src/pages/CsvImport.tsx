"use client";

import React from "react";
import CsvMappingWizard from "../components/CsvMappingWizard";

/**
 * CsvImport
 * A thin host for the CSV Mapping Wizard.
 * Replace the placeholders with your actual CSV preview data and next-step handler.
 */

type Row = Record<string, string | number>;

export default function CsvImport() {
  // TODO: connect these to your existing CSV preview step.
  // Replace the placeholders with real values from parser state.
  // Examples: from context/store, props, or loader.
  const headers: string[] =
    /* __REPLACE_ME::HEADERS_FROM_PARSER__ */ [
      // Temporary demo defaults so the page renders.
      "Price",
      "Shipping Charged",
      "Shipping Cost",
      "COGS",
      "Fee %"
    ];

  const sampleRows: Row[] =
    /* __REPLACE_ME::ROWS_FROM_PARSER__ */ [
      { "Price": 49.99, "Shipping Charged": 6.99, "Shipping Cost": 5.25, "COGS": 10.0, "Fee %": 13.25 },
      { "Price": 24.0, "Shipping Charged": 0, "Shipping Cost": 4.12, "COGS": 3.0, "Fee %": 12.9 }
    ];

  function handleConfirm(mapping: Record<string, string>) {
    // Forward mapping to your next step:
    // - Save to state and advance UI
    // - Trigger rollups step to compute metrics (6-c)
    // Replace console.log with your real consumer.
    // __REPLACE_ME::MAPPING_CONSUMER__
    console.log("Confirmed CSV mapping:", mapping);
    alert("Mapping confirmed. Wire this to your rollups step next.");
  }

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-6">
      <h1 className="text-2xl font-semibold mb-4">CSV Import</h1>
      <p className="text-sm text-gray-600 mb-6">
        Map your CSV headers to required fields, then continue to calculations.
      </p>

      <CsvMappingWizard
        headers={headers}
        sampleRows={sampleRows}
        onConfirm={handleConfirm}
        presetNamespace="orders"
        // Optional: override required fields with custom labels/descriptions
        // requiredFields={[
        //   { key: "itemPrice", label: "Item Price" },
        //   { key: "shippingCharged", label: "Shipping Charged" },
        //   { key: "shippingCost", label: "Shipping Cost" },
        //   { key: "cogs", label: "COGS" },
        //   { key: "feeRate", label: "Fee Rate %" },
        // ]}
      />
    </div>
  );
}
