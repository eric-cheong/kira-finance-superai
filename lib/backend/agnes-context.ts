import { state } from "./state";
import { getExportBlockers, getWorkflowDashboard } from "@/lib/erp-close";

export interface CloseSummary {
  clientId: string;
  legalName: string;
  tradingName: string;
  closePeriod: string;
  erp: string;
  tin: string;
  msic: string;
  msicDescription: string;
  sstRegistrationNo?: string;
  ready: number;
  blocked: number;
  exportable: number;
  approved: number;
  exported: number;
  total: number;
  topSupplier: string;
  blockedSuppliers: string[];
  blockerMessages: string[];
  currency: string;
}

/**
 * Deterministic snapshot of the current month-end close, shared by the Agnes
 * image and video generators so their prompts reflect real workspace numbers.
 */
export function closeSummary(clientId?: string): CloseSummary {
  const client = state.closeBookClients.find((c) => c.id === clientId) ?? state.closeBookClients[0];
  const records = state.closeBookRecords.filter((record) => record.clientId === client?.id);
  const dashboard = getWorkflowDashboard(records);
  const blocked = records.filter((record) => record.status === "needs_review");
  const ready = records.filter((record) => record.status === "ready" || record.status === "approved");
  const blockedRecordDetails = records
    .map((record) => ({
      record,
      blockers: getExportBlockers(record).filter((reason) => reason.code !== "already_exported"),
    }))
    .filter((item) => item.blockers.length > 0);

  const supplierCounts = new Map<string, number>();
  for (const record of records) {
    const name = record.supplierName ?? "Unknown supplier";
    supplierCounts.set(name, (supplierCounts.get(name) ?? 0) + 1);
  }
  const topSupplier = [...supplierCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  return {
    clientId: client?.id ?? "client",
    legalName: client?.legalName ?? "Kira Roasters Sdn Bhd",
    tradingName: client?.tradingName ?? "Kira Roasters Sdn Bhd",
    closePeriod: client?.closePeriod ?? "current period",
    erp: client?.erp ?? "AutoCount",
    tin: client?.tin ?? "—",
    msic: client?.msic ?? "—",
    msicDescription: client?.msicDescription ?? "SME finance operations",
    sstRegistrationNo: client?.sstRegistrationNo,
    ready: ready.length,
    blocked: dashboard.closeReadiness.blockedRecords || blocked.length,
    exportable: dashboard.closeReadiness.exportableRecords,
    approved: dashboard.statusCounts.approved,
    exported: dashboard.statusCounts.exported,
    total: records.length,
    topSupplier,
    blockedSuppliers: blockedRecordDetails
      .map(({ record }) => record.supplierName ?? "Unknown supplier")
      .slice(0, 4),
    blockerMessages: blockedRecordDetails
      .flatMap(({ record, blockers }) => blockers.map((blocker) => `${record.supplierName ?? record.id}: ${blocker.message}`))
      .slice(0, 4),
    currency: "MYR",
  };
}
