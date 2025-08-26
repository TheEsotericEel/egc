import CsvImport from "@/features/csv/CsvImport";

export default function CsvPage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">CSV Import</h1>
      <CsvImport />
    </main>
  );
}
