// Read accessors + derived aggregates over the seed. In production this is the
// query layer over Postgres; here it's pure functions over in-memory seed data.
// Everything is deterministic so the UI renders identically on every run.

import { chainHash } from "../hash";
import type {
  AuditLogEntry,
  ChartOfAccount,
  CostCentre,
  CurrencyCode,
  TaxCode,
  User,
} from "../types";
import * as seed from "./seed";

export { seed };
export const {
  NOW,
  TODAY,
  ORG,
  USERS,
  CURRENT_USER_ID,
  ACCOUNTS,
  TAX_CODES,
  COST_CENTRES,
  TRANSACTIONS,
  RECEIPTS,
  MATCHES,
  EINVOICES,
  RECORDS,
  SYNC_REFS,
  APPROVALS,
  POSITIONS,
  NEWS,
  PREFERENCES,
  COUNTRY_CONFIGS,
} = seed;

// ── FX (illustrative, fixed for determinism — to base currency MYR) ─────────

export const FX_TO_MYR: Record<CurrencyCode, number> = {
  MYR: 1,
  SGD: 3.3,
  USD: 4.45,
};

/** Convert any minor-unit amount to base-currency (MYR) minor units. */
export function toBase(minor: number, currency: CurrencyCode): number {
  return Math.round(minor * FX_TO_MYR[currency]);
}

// ── Lookups ─────────────────────────────────────────────────────────────────

export function account(code?: string): ChartOfAccount | undefined {
  return ACCOUNTS.find((a) => a.code === code);
}
export function taxCode(code?: string): TaxCode | undefined {
  return TAX_CODES.find((t) => t.code === code);
}
export function costCentre(code?: string): CostCentre | undefined {
  return COST_CENTRES.find((c) => c.code === code);
}
export function user(id?: string): User | undefined {
  return USERS.find((u) => u.id === id);
}
export const currentUser = (): User => user(CURRENT_USER_ID)!;

export function receipt(id?: string) {
  return RECEIPTS.find((r) => r.id === id);
}
export function transaction(id?: string) {
  return TRANSACTIONS.find((t) => t.id === id);
}
export function matchForTransaction(txnId: string) {
  return MATCHES.find((m) => m.transactionId === txnId);
}
export function matchForReceipt(rcpId: string) {
  return MATCHES.find((m) => m.receiptId === rcpId);
}

// ── Immutable audit chain (computed from raw events) ────────────────────────

export const AUDIT: AuditLogEntry[] = (() => {
  const sorted = [...seed.RAW_AUDIT].sort((a, b) => a.at.localeCompare(b.at));
  let prev = "genesis0000000000";
  return sorted.map((e, i): AuditLogEntry => {
    const payload = `${e.at}|${e.actor}|${e.action}|${e.target ?? ""}|${e.detail}`;
    const hash = chainHash(prev, payload);
    const entry: AuditLogEntry = {
      seq: i + 1,
      at: e.at,
      actor: e.actor,
      action: e.action,
      target: e.target,
      detail: e.detail,
      prevHash: prev,
      hash,
      tier: e.tier,
    };
    prev = hash;
    return entry;
  });
})();

// ── Derived aggregates ──────────────────────────────────────────────────────

export interface SpendBucket {
  key: string;
  label: string;
  amountBaseMinor: number;
  count: number;
}

export function spendByAccount(): SpendBucket[] {
  const map = new Map<string, SpendBucket>();
  for (const r of RECORDS) {
    const acc = account(r.account);
    const k = r.account;
    const cur = map.get(k) ?? {
      key: k,
      label: acc ? acc.name : k,
      amountBaseMinor: 0,
      count: 0,
    };
    cur.amountBaseMinor += toBase(r.amountMinor, r.currency);
    cur.count += 1;
    map.set(k, cur);
  }
  return [...map.values()].sort((a, b) => b.amountBaseMinor - a.amountBaseMinor);
}

export function spendByCostCentre(): SpendBucket[] {
  const map = new Map<string, SpendBucket>();
  for (const r of RECORDS) {
    const cc = costCentre(r.costCentre);
    const k = r.costCentre ?? "—";
    const cur = map.get(k) ?? {
      key: k,
      label: cc ? cc.name : "Unassigned",
      amountBaseMinor: 0,
      count: 0,
    };
    cur.amountBaseMinor += toBase(r.amountMinor, r.currency);
    cur.count += 1;
    map.set(k, cur);
  }
  return [...map.values()].sort((a, b) => b.amountBaseMinor - a.amountBaseMinor);
}

export function totalSpendBaseMinor(): number {
  return RECORDS.reduce((s, r) => s + toBase(r.amountMinor, r.currency), 0);
}

export function matchStats() {
  const total = TRANSACTIONS.length;
  const matched = TRANSACTIONS.filter((t) => t.status === "matched").length;
  const review = TRANSACTIONS.filter((t) => t.status === "needs_review").length;
  const unmatched = TRANSACTIONS.filter((t) => t.status === "unmatched").length;
  return {
    total,
    matched,
    review,
    unmatched,
    matchedPct: Math.round((matched / total) * 100),
  };
}

export function receiptStats() {
  const total = RECEIPTS.length;
  const confirmed = RECEIPTS.filter((r) => r.status === "confirmed").length;
  const review = RECEIPTS.filter((r) => r.status === "needs_review").length;
  return { total, confirmed, review };
}

export function einvoiceStats() {
  const by = (s: string) => EINVOICES.filter((e) => e.state === s).length;
  return {
    total: EINVOICES.length,
    validated: by("validated"),
    submitted: by("submitted"),
    queued: by("queued"),
    draft: by("draft"),
    rejected: by("rejected"),
  };
}

export function openApprovals() {
  return APPROVALS.filter((a) => a.state === "open").sort((a, b) => b.tier - a.tier);
}

/** Close-readiness: a 0-100 score from match rate, coding, and e-invoice health. */
export function closeReadiness() {
  const m = matchStats();
  const matchScore = m.matchedPct; // %
  const coded = RECORDS.length;
  const reconciled = RECORDS.filter((r) => r.reconciled).length;
  const codingScore = Math.round((reconciled / Math.max(coded, 1)) * 100);
  const ei = einvoiceStats();
  const eiHealthy = ei.validated + ei.submitted;
  const eiScore = Math.round((eiHealthy / Math.max(ei.total, 1)) * 100);
  const score = Math.round(matchScore * 0.45 + codingScore * 0.3 + eiScore * 0.25);
  const blockers: string[] = [];
  if (m.unmatched + m.review > 0)
    blockers.push(`${m.unmatched + m.review} transactions unmatched / in review`);
  if (ei.rejected > 0) blockers.push(`${ei.rejected} e-invoice rejected (action needed)`);
  if (ei.queued + ei.draft > 0)
    blockers.push(`${ei.queued + ei.draft} e-invoices not yet submitted`);
  if (reconciled < coded)
    blockers.push(`${coded - reconciled} record entries not reconciled`);
  return { score, blockers };
}

export function portfolioStats() {
  let costBase = 0;
  let valueBase = 0;
  for (const p of POSITIONS) {
    const c = toBase(p.avgCostMinor * p.units, p.instrument.currency);
    const v = toBase(p.lastMinor * p.units, p.instrument.currency);
    costBase += c;
    valueBase += v;
  }
  const pnl = valueBase - costBase;
  const pnlPct = costBase > 0 ? (pnl / costBase) * 100 : 0;
  // Concentration = largest position share of portfolio value.
  const shares = POSITIONS.map((p) => ({
    name: p.instrument.name,
    symbol: p.instrument.symbol,
    valueBase: toBase(p.lastMinor * p.units, p.instrument.currency),
  })).sort((a, b) => b.valueBase - a.valueBase);
  const topShare =
    valueBase > 0 ? Math.round((shares[0].valueBase / valueBase) * 100) : 0;
  return { costBase, valueBase, pnl, pnlPct, topShare, shares };
}
