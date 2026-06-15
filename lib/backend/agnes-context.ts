import { state } from "./state";

export interface CloseSummary {
  clientId: string;
  tradingName: string;
  closePeriod: string;
  ready: number;
  blocked: number;
  total: number;
  topSupplier: string;
  currency: string;
}

/**
 * Deterministic snapshot of the current month-end close, shared by the Agnes
 * image and video generators so their prompts reflect real workspace numbers.
 */
export function closeSummary(clientId?: string): CloseSummary {
  const client = state.closeBookClients.find((c) => c.id === clientId) ?? state.closeBookClients[0];
  const records = state.closeBookRecords.filter((record) => record.clientId === client?.id);
  const blocked = records.filter((record) => record.status === "needs_review");
  const ready = records.filter((record) => record.status === "ready" || record.status === "approved");

  const supplierCounts = new Map<string, number>();
  for (const record of records) {
    const name = record.supplierName ?? "Unknown supplier";
    supplierCounts.set(name, (supplierCounts.get(name) ?? 0) + 1);
  }
  const topSupplier = [...supplierCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  return {
    clientId: client?.id ?? "client",
    tradingName: client?.tradingName ?? "Kira Roasters Sdn Bhd",
    closePeriod: client?.closePeriod ?? "current period",
    ready: ready.length,
    blocked: blocked.length,
    total: records.length,
    topSupplier,
    currency: "MYR",
  };
}
