// ─────────────────────────────────────────────────────────────────────────────
// Kira data model.
//
// Design rule that shapes every type here: the platform ORCHESTRATES and RECORDS
// but NEVER settles, holds, or moves customer money. The record store below is a
// *system of record-keeping*, not a money ledger. `RecordEntry` captures what
// happened for accounting/audit; settlement always lives at the customer's bank
// or a licensed partner.
// ─────────────────────────────────────────────────────────────────────────────

import type { CurrencyCode } from "./format";
export type { CurrencyCode };

// ── Approval & action taxonomy (the human-in-the-loop spine) ────────────────

/** Four approval tiers, mapped from the spec. */
export type ApprovalTier =
  | 1 // No approval — daily summaries, read-only insight
  | 2 // Soft approval — notification / preference changes
  | 3 // Explicit approval — money movement, e-invoice submission, investment action
  | 4; // Mandatory human review — regulated advice, high-risk, abnormal activity

export const TIER_LABEL: Record<ApprovalTier, string> = {
  1: "No approval",
  2: "Soft approval",
  3: "Explicit approval",
  4: "Mandatory review",
};

/** Every action an agent can take is classified into exactly one of these. */
export type ActionClass =
  | "read-only"
  | "suggestion"
  | "notification"
  | "human-approved"
  | "prohibited";

export type ConfidenceBand = "high" | "medium" | "low";

export function bandOf(confidence: number): ConfidenceBand {
  if (confidence >= 85) return "high";
  if (confidence >= 70) return "medium";
  return "low";
}

export type ProductPhase = 1 | 2 | 3;

// ── Tenancy, identity, RBAC ─────────────────────────────────────────────────

export type Role = "employee" | "approver" | "finance_admin" | "auditor";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string;
}

export type TaxModel = "MY_SST" | "SG_GST";

/** MyInvois rollout phase (MY). Phase gates whether e-invoicing is mandatory yet. */
export type MyInvoisPhase = "phase1" | "phase2" | "phase3" | "not_applicable";

export interface TaxProfile {
  model: TaxModel;
  registered: boolean; // GST/SST registered?
  registrationNo?: string;
  myInvoisPhase: MyInvoisPhase;
  sstRate?: number; // MY service tax rate, e.g. 6 / 8
  gstRate?: number; // SG GST rate, e.g. 9
  baseCurrency: CurrencyCode;
}

export interface Organization {
  id: string;
  legalName: string;
  brandName: string;
  country: "MY" | "SG";
  uen?: string; // SG
  ssmNo?: string; // MY
  industry: string;
  taxProfile: TaxProfile;
  fiscalYearEnd: string; // MM-DD
}

// ── Chart of accounts / coding dimensions ───────────────────────────────────

export interface ChartOfAccount {
  code: string;
  name: string;
  type: "expense" | "asset" | "liability" | "income" | "equity";
}

export interface TaxCode {
  code: string; // e.g. "SST-S6", "GST-SR9", "GST-ZR", "OUT-OF-SCOPE"
  label: string;
  rate: number; // percent
  model: TaxModel;
}

export interface CostCentre {
  code: string;
  name: string;
}

// ── Money-in (read-only) — imported, never moved ────────────────────────────

export type SourceKind = "card" | "bank" | "manual";

export interface TransactionEvent {
  id: string;
  // Append-only: imported card/bank line. We never originate or move this money.
  occurredAt: string; // ISO
  importedAt: string; // ISO
  description: string;
  merchant: string;
  amountMinor: number; // positive = outflow (spend)
  currency: CurrencyCode;
  source: SourceKind;
  sourceRef: string; // e.g. "Maybank •• 4417" — NEVER a full PAN (no-PAN rule)
  cardLast4?: string;
  status: "unmatched" | "matched" | "needs_review";
}

export type DocStatus =
  | "extracted"
  | "needs_review"
  | "confirmed"
  | "rejected";

/** Receipt or supplier invoice captured via photo / email forwarding. */
export interface Receipt {
  id: string;
  kind: "receipt" | "invoice";
  capturedAt: string;
  capturedVia: "mobile" | "email" | "upload";
  supplier: string;
  // Extracted fields (each carries an OCR confidence 0-100).
  totalMinor: number;
  taxMinor: number;
  currency: CurrencyCode;
  docDate: string;
  docNo?: string;
  ocrConfidence: number;
  suggestedAccount?: string; // ChartOfAccount.code
  suggestedTaxCode?: string; // TaxCode.code
  suggestedCostCentre?: string;
  status: DocStatus;
  thumbHint: string; // emoji/tone hint for the placeholder thumbnail
  lineItems: { label: string; amountMinor: number }[];
}

export interface Match {
  id: string;
  transactionId: string;
  receiptId: string;
  score: number; // 0-100 fuzzy confidence
  basis: string[]; // ["amount", "date±1d", "merchant~0.92"]
  state: "auto" | "suggested" | "confirmed";
}

// ── Approvals & workflow ────────────────────────────────────────────────────

export interface ApprovalStep {
  order: number;
  role: Role;
  approverName?: string;
  state: "pending" | "approved" | "rejected" | "skipped";
  actedAt?: string;
  note?: string;
}

export interface ApprovalRequest {
  id: string;
  title: string;
  subject: string; // what is being approved
  amountMinor?: number;
  currency?: CurrencyCode;
  tier: ApprovalTier;
  reversible: boolean;
  raisedBy: string; // agent or user
  raisedAt: string;
  confidence: number;
  evidence: string[];
  steps: ApprovalStep[];
  state: "open" | "approved" | "rejected";
  linkedKind?: "einvoice" | "expense" | "billpay" | "suggestion";
  linkedId?: string;
}

// ── System of record-keeping (NOT a money ledger) ───────────────────────────

export interface RecordEntry {
  id: string;
  postedAt: string;
  memo: string;
  account: string; // ChartOfAccount.code
  taxCode: string; // TaxCode.code
  costCentre?: string;
  amountMinor: number;
  taxAmountMinor: number;
  currency: CurrencyCode;
  sourceTransactionId?: string;
  sourceReceiptId?: string;
  reconciled: boolean;
}

// ── E-invoicing (MyInvois / Peppol-InvoiceNow) ──────────────────────────────

export type EInvoiceChannel = "MyInvois" | "Peppol-InvoiceNow";

export type EInvoiceState =
  | "draft"
  | "queued"
  | "submitted"
  | "validated"
  | "rejected"
  | "cancelled";

export interface EInvoice {
  id: string;
  channel: EInvoiceChannel;
  direction: "outbound" | "inbound";
  counterparty: string;
  counterpartyId?: string; // TIN / UEN
  issueDate: string;
  currency: CurrencyCode;
  netMinor: number;
  taxMinor: number;
  grossMinor: number;
  state: EInvoiceState;
  uuid?: string; // LHDN UUID / Peppol message id
  qrHint?: string;
  validationResponse?: string; // stored validation result (retention requirement)
  rejectionReason?: string;
  submittedAt?: string;
}

export interface AccountingSyncRef {
  id: string;
  provider: "Codat" | "Rutter" | "Merge" | "AutoCount" | "SQL Account" | "Xero";
  internalEntryId: string;
  externalId: string;
  syncedAt: string;
  state: "synced" | "pending" | "error";
}

// ── Immutable audit log (hash-chained) ──────────────────────────────────────

export interface AuditLogEntry {
  seq: number;
  at: string;
  actor: string; // agent name or user id
  action: string;
  target?: string;
  detail: string;
  prevHash: string;
  hash: string;
  tier?: ApprovalTier;
}

// ── Personal-finance / briefing side (Phase 2, present but read-only) ───────

export interface Instrument {
  symbol: string;
  name: string;
  kind: "equity" | "etf" | "crypto" | "reit";
  currency: CurrencyCode;
}

export interface Position {
  instrument: Instrument;
  units: number;
  avgCostMinor: number;
  lastMinor: number;
  dayChangePct: number;
}

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  url: string;
  publishedAt: string;
  relevance: number; // 0-100
  verified: boolean;
  summary: string;
}

// ── Preferences & memory ────────────────────────────────────────────────────

export interface UserPreference {
  userId: string;
  baseCurrency: CurrencyCode;
  locale: "en-MY" | "en-SG";
  language: "en" | "ms" | "zh";
  /** Confidence at/above which low-risk items auto-pass instead of queuing. */
  automationThreshold: number;
  riskTolerance: "conservative" | "balanced" | "growth";
  channels: { push: boolean; email: boolean; slack: boolean; whatsapp: boolean };
  quietHours: { from: string; to: string };
  briefingTime: string; // "07:30"
}

export interface RunMemory {
  // Prior-run memory used for RAG / continuity.
  lastRunAt?: string;
  recentThemes: string[];
  acknowledgedAlertIds: string[];
}

// ── Country configuration (metadata, not code forks) ────────────────────────

export interface CountryConfig {
  country: "MY" | "SG";
  taxModel: TaxModel;
  eInvoiceChannel: EInvoiceChannel;
  eInvoiceSchema: string; // "MyInvois 1.0" | "PINT-SG"
  regulator: string;
  paymentMethods: string[];
  languagePack: string[];
}
