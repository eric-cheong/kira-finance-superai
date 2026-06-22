import type { VerifiedBillRecord } from "@/lib/erp-close";

export interface InvoiceVerificationResult {
  lhdnReady: boolean;
  lhdnMissingFields: string[];
  mathOk: boolean;
  statementFound: boolean;
}

const REQUIRED_LHDN_FIELDS: Array<[string, (record: VerifiedBillRecord) => unknown]> = [
  ["supplierName", (record) => record.supplierName],
  ["supplierTin", (record) => record.supplierTin],
  ["invoiceNumber", (record) => record.invoiceNumber],
  ["invoiceDate", (record) => record.invoiceDate],
  ["currency", (record) => record.currency],
  ["subtotalMinor", (record) => record.subtotalMinor],
  ["taxMinor", (record) => record.taxMinor],
  ["totalMinor", (record) => record.totalMinor],
  ["taxTreatment", (record) => record.taxTreatment],
  ["erpMapping.lhdnClassificationCode", (record) => record.erpMapping?.lhdnClassificationCode],
];

function present(value: unknown) {
  return value !== undefined && value !== null && value !== "";
}

export function verifyInvoiceForLhdnAndStatement(record: VerifiedBillRecord): InvoiceVerificationResult {
  const missing = REQUIRED_LHDN_FIELDS
    .filter(([, getter]) => !present(getter(record)))
    .map(([field]) => field);
  if (record.lines.length === 0) missing.push("lines");
  if (record.lines.some((line) => !line.description || !present(line.netAmountMinor))) missing.push("lines.description/netAmountMinor");

  const lineSubtotal = record.lines.reduce((sum, line) => sum + line.netAmountMinor, 0);
  const subtotal = record.subtotalMinor ?? 0;
  const tax = record.taxMinor ?? 0;
  const total = record.totalMinor ?? 0;
  const mathOk = subtotal + tax === total && (lineSubtotal === 0 || Math.abs(lineSubtotal - subtotal) <= Math.max(100, Math.round(subtotal * 0.15)));
  const statementFound = record.supplierStatementMatch?.state === "matched";

  return {
    lhdnReady: missing.length === 0 && mathOk,
    lhdnMissingFields: missing,
    mathOk,
    statementFound,
  };
}
