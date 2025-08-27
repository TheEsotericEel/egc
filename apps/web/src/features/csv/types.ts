export type CsvRow = Record<string, string>;
export type CsvChunk = { rows: CsvRow[]; errors: string[]; progress: number };

export type CsvMapping = {
  // Example mapping keys. We will extend as needed.
  itemPrice?: string;
  shippingCharged?: string;
  shippingCost?: string;
  cogs?: string;
  feeRate?: string;
};

export type CsvParseOptions = {
  header: boolean;
  delimiter?: string;
  encoding?: string;
  previewRows?: number;
};

export const DEFAULT_PARSE_OPTIONS: CsvParseOptions = {
  header: true,
  delimiter: ",",
  encoding: "utf-8",
  previewRows: 10
};





