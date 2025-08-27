"use client";

import dynamic from "next/dynamic";

// Avoid SSR issues with Recharts by loading client-side
const CsvImport = dynamic(() => import("../../features/csv/CsvImport"), { ssr: false });

export default function CsvPage() {
  return <CsvImport />;
}
