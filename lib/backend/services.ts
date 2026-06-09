import { getOperatingFunction, KIRA_LOOP, OPERATING_FUNCTIONS } from "@/lib/operating-functions";
import {
  canExportRecord,
  getExportBlockers,
  getWorkflowDashboard,
  type CloseBookExceptionType,
  type ExportDestination,
  type VerifiedBillRecord,
} from "@/lib/erp-close";
import { money } from "@/lib/format";
import type {
  ApprovalRequest,
  ApprovalTier,
  Booking,
  BookingQuote,
  BookingQuoteOption,
  BookingType,
  CurrencyCode,
  EInvoiceState,
  ForecastBucket,
  Match,
  Organization,
  Receipt,
  RecordEntry,
  TransactionEvent,
  UserPreference,
  VendorRisk,
} from "@/lib/types";
import { chainHash } from "@/lib/hash";
import { NOW } from "@/lib/data/seed";
import { ApiError } from "./http";
import { appendAudit, confirmationRef, nextId, resetState, snapshotPath, state, type OnboardingRun } from "./state";

type ApprovalDecision = "approved" | "rejected" | "open";
type BookingDecision = "approve" | "reject";
type CaptureSource = "mobile" | "email" | "upload";

const SUPPORTED_ACCOUNTING = new Set(["AutoCount", "SQL Account", "Xero"]);
const RISK = new Set<UserPreference["riskTolerance"]>(["conservative", "balanced", "growth"]);
const CHANNELS = ["push", "email", "slack", "whatsapp"] as const;
const CONNECTORS = [
  { name: "AutoCount", kind: "Accounting (local)", state: "connected" },
  { name: "Xero", kind: "Accounting (SG entity)", state: "connected" },
  { name: "SQL Account", kind: "Accounting (local)", state: "available" },
  { name: "LHDN MyInvois", kind: "E-invoicing (MY)", state: "connected" },
  { name: "Peppol / InvoiceNow", kind: "E-invoicing (SG)", state: "connected" },
  { name: "Maybank / CIMB / DBS", kind: "Transaction feed (CSV)", state: "connected" },
] as const;

export interface CaptureField {
  key: "account" | "taxCode" | "costCentre";
  label: string;
  value: string;
  confidence: number;
}

export interface CaptureDraft {
  receipt: Receipt;
  fields: CaptureField[];
  reviewThreshold: number;
  needsReview: boolean;
}

export function health() {
  return {
    status: "ok",
    mode: "local-offline",
    persistence: "json-file",
    snapshotPath,
    counts: {
      users: state.users.length,
      transactions: state.transactions.length,
      receipts: state.receipts.length,
      approvals: state.approvals.length,
      auditEntries: state.audit.length,
    },
  };
}

export function session() {
  return {
    user: currentUser(),
    org: state.org,
    preferences: state.preferences,
    navigationBadges: {
      approvals: openApprovals().length,
      receiptsInReview: receiptStats().review,
    },
  };
}

export function reference() {
  return {
    accounts: state.accounts,
    taxCodes: state.taxCodes,
    costCentres: state.costCentres,
    countryConfigs: state.countryConfigs,
    fxRates: FX_TO_MYR,
  };
}

export function settings() {
  return {
    org: state.org,
    taxProfile: state.org.taxProfile,
    preferences: state.preferences,
    connectors: CONNECTORS,
    users: state.users,
    residency: {
      primary: "Malaysia (ap-southeast)",
      sgEntityData: "Singapore region",
      encryption: "AES-256 at rest · TLS 1.2+ in transit",
      cardData: "never stored",
      auditLog: "hash-chained",
      retention: "7 years (tax) · configurable",
    },
  };
}

export function connectors() {
  return { connectors: CONNECTORS };
}

export function connectConnector(name: string, input: unknown = {}) {
  const decoded = decodeURIComponent(name);
  const connector = CONNECTORS.find((item) => item.name.toLowerCase() === decoded.toLowerCase());
  if (!connector) throw new ApiError(404, "CONNECTOR_NOT_FOUND", `Connector ${decoded} was not found.`);
  appendAudit({
    actor: state.currentUserId,
    action: "connector.connect",
    target: connector.name,
    detail: isRecord(input) && typeof input.credentialsRef === "string"
      ? `Connected using credentials ref ${input.credentialsRef}. No secret value stored.`
      : "Connector connection simulated locally. No secret value stored.",
    tier: 2,
  });
  return { connector: { ...connector, state: "connected" } };
}

export function users() {
  return { users: state.users };
}

export function roadmap() {
  return {
    phases: [
      {
        phase: 1,
        title: "License-free MVP",
        boundary: "Read-only money. No balances, transfers, cards, FX execution, or trades.",
        gate: "Onboard < 1 day; high auto-match and first-pass e-invoice acceptance.",
      },
      {
        phase: 2,
        title: "Intelligence + Partnered Rails",
        boundary: "Money moves only through a licensed bank/BaaS partner; Kira remains an orchestrator.",
        gate: "Partner payments reconcile cleanly; KYC/AML process audited; no PAN touches Kira.",
      },
      {
        phase: 3,
        title: "Full ERP + Prediction",
        boundary: "Same licensed-partner rule at enterprise scale.",
        gate: "Multi-book close runs cleanly; certifications live; marketplace ships third-party connectors.",
      },
    ],
    features: [
      "Receipt / invoice OCR",
      "Receipt-to-transaction matching",
      "Multi-layer approvals",
      "Accounting write-back",
      "MyInvois + Peppol/InvoiceNow",
      "Read-only daily briefing",
      "Portfolio and market intelligence",
      "Partner-executed bill pay",
      "Full ERP ledger core",
      "AI forecasting",
    ],
    actionMatrix: [
      { action: "Generate daily summaries", class: "read-only", tier: 1 },
      { action: "Change notification preference", class: "notification", tier: 2 },
      { action: "Suggest GST/SST recode", class: "suggestion", tier: 3 },
      { action: "Submit e-invoice", class: "human-approved", tier: 3 },
      { action: "Move money directly", class: "prohibited", tier: 4 },
    ],
    architecture: ["Next.js App Router", "Local JSON persistence", "Future SQLite/Postgres repository seam", "Hash-chained audit"],
    failures: ["OCR low confidence", "Accounting sync failure", "E-invoice rejection", "Agent disagreement", "Partner/payment failure"],
    sources: [
      "LHDN e-Invoice FAQs",
      "IRAS GST InvoiceNow Requirement",
      "IMDA InvoiceNow / Peppol technical playbook",
      "MAS financial institutions directory",
    ],
  };
}

export function summary() {
  return {
    now: state.rawAudit[state.rawAudit.length - 1]?.at,
    org: state.org,
    preferences: state.preferences,
    stats: {
      matches: matchStats(),
      receipts: receiptStats(),
      einvoices: einvoiceStats(),
      closeReadiness: closeReadiness(),
    },
  };
}

export function listApprovals() {
  return [...state.approvals].sort((a, b) => {
    if (a.state !== b.state) return a.state === "open" ? -1 : 1;
    return b.tier - a.tier || b.raisedAt.localeCompare(a.raisedAt);
  });
}

export function decideApproval(
  id: string,
  input: { decision: ApprovalDecision; confirm?: boolean; actorId?: string; note?: string },
) {
  if (!input || !["approved", "rejected", "open"].includes(input.decision)) {
    throw new ApiError(400, "INVALID_DECISION", "Decision must be approved, rejected, or open.");
  }
  const approval = state.approvals.find((item) => item.id === id);
  if (!approval) throw new ApiError(404, "APPROVAL_NOT_FOUND", `Approval ${id} was not found.`);

  if (input.decision === "open") {
    if (approval.state === "approved" && !approval.reversible) {
      throw new ApiError(409, "IRREVERSIBLE_APPROVAL", "Irreversible approvals cannot be reopened.");
    }
    approval.state = "open";
    for (const step of approval.steps) {
      step.state = "pending";
      step.actedAt = undefined;
      step.note = undefined;
    }
    appendAudit({
      actor: input.actorId ?? state.currentUserId,
      action: "approval.reopen",
      target: approval.id,
      detail: `${approval.title} reopened. ${input.note ?? "No supplier or money action was taken."}`,
      tier: approval.tier,
    });
    return { approval };
  }

  if (approval.state !== "open") {
    throw new ApiError(409, "APPROVAL_CLOSED", `Approval ${id} is already ${approval.state}.`);
  }

  const requiresConfirm = approval.tier >= 4 || !approval.reversible;
  if (input.decision === "approved" && requiresConfirm && !input.confirm) {
    throw new ApiError(
      409,
      "CONFIRMATION_REQUIRED",
      "This approval requires a second explicit confirmation before approval.",
      { tier: approval.tier, reversible: approval.reversible },
    );
  }

  approval.state = input.decision;
  const step = approval.steps.find((item) => item.state === "pending") ?? approval.steps[0];
  if (step) {
    step.state = input.decision;
    step.actedAt = new Date().toISOString();
    step.note = input.note;
  }

  if (input.decision === "approved" && approval.linkedKind === "einvoice" && approval.linkedId) {
    submitEInvoiceFromApproval(approval);
  }

  appendAudit({
    actor: input.actorId ?? state.currentUserId,
    action: input.decision === "approved" ? "approval.approved" : "approval.rejected",
    target: approval.id,
    detail: `${approval.title} ${input.decision}. Default on ambiguity remains no action.`,
    tier: approval.tier,
  });
  return { approval };
}

export function createCapture(input: { source?: CaptureSource } = {}): CaptureDraft {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ApiError(400, "INVALID_BODY", "Capture request must be an object.");
  }
  const source = input.source ?? "mobile";
  if (!["mobile", "email", "upload"].includes(source)) {
    throw new ApiError(400, "INVALID_CAPTURE_SOURCE", "Capture source must be mobile, email, or upload.");
  }
  const fields = captureFields();
  const low = Math.min(...fields.map((field) => field.confidence));
  const receipt: Receipt = {
    id: nextId("rcp", state.receipts),
    kind: "invoice",
    capturedAt: new Date().toISOString(),
    capturedVia: source,
    supplier: "Common Roots Roastery",
    totalMinor: 128400,
    taxMinor: 0,
    currency: "MYR",
    docDate: "2026-06-09",
    docNo: `CRR-2026-${String(state.receipts.length + 1).padStart(4, "0")}`,
    ocrConfidence: low,
    suggestedAccount: "5010",
    suggestedTaxCode: "OUT",
    suggestedCostCentre: "CC-TTDI",
    status: low < 85 ? "needs_review" : "extracted",
    thumbHint: "beans",
    lineItems: [{ label: "Green coffee beans · 30kg", amountMinor: 128400 }],
  };
  state.receipts.unshift(receipt);
  appendAudit({
    actor: "Document AI",
    action: "capture.extracted",
    target: receipt.id,
    detail: `Extracted ${receipt.supplier} ${money(receipt.totalMinor, receipt.currency)} via ${source}; lowest field confidence ${low}%.`,
    tier: low < 70 ? 4 : low < 85 ? 3 : 1,
  });
  return captureDraft(receipt);
}

export function reviewCapture(id: string, input: { account?: string; taxCode?: string; costCentre?: string } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ApiError(400, "INVALID_BODY", "Review request must be an object.");
  }
  const receipt = getReceiptOrThrow(id);
  if (input.account) ensureAccount(input.account);
  if (input.taxCode) ensureTaxCode(input.taxCode);
  if (input.costCentre) ensureCostCentre(input.costCentre);
  receipt.suggestedAccount = input.account ?? receipt.suggestedAccount;
  receipt.suggestedTaxCode = input.taxCode ?? receipt.suggestedTaxCode;
  receipt.suggestedCostCentre = input.costCentre ?? receipt.suggestedCostCentre;
  receipt.ocrConfidence = Math.max(receipt.ocrConfidence, 88);
  receipt.status = "extracted";
  appendAudit({
    actor: state.currentUserId,
    action: "capture.reviewed",
    target: receipt.id,
    detail: `Coding reviewed: ${receipt.suggestedAccount}/${receipt.suggestedTaxCode}/${receipt.suggestedCostCentre}.`,
    tier: 3,
  });
  return captureDraft(receipt);
}

export function postCapture(id: string) {
  const receipt = getReceiptOrThrow(id);
  if (receipt.status === "needs_review" || receipt.ocrConfidence < 85) {
    throw new ApiError(409, "REVIEW_REQUIRED", "Low-confidence capture must be reviewed before posting.");
  }
  if (receipt.status === "confirmed") {
    const existing = state.records.find((record) => record.sourceReceiptId === receipt.id);
    return { receipt, record: existing };
  }
  ensureAccount(receipt.suggestedAccount);
  ensureTaxCode(receipt.suggestedTaxCode);
  if (receipt.suggestedCostCentre) ensureCostCentre(receipt.suggestedCostCentre);

  const record: RecordEntry = {
    id: nextId("rec", state.records),
    postedAt: new Date().toISOString(),
    memo: `${receipt.supplier} · ${receipt.docNo ?? "captured document"}`,
    account: receipt.suggestedAccount!,
    taxCode: receipt.suggestedTaxCode!,
    costCentre: receipt.suggestedCostCentre,
    amountMinor: receipt.totalMinor,
    taxAmountMinor: receipt.taxMinor,
    currency: receipt.currency,
    sourceReceiptId: receipt.id,
    reconciled: false,
  };
  state.records.push(record);
  receipt.status = "confirmed";
  appendAudit({
    actor: state.currentUserId,
    action: "record.post",
    target: record.id,
    detail: `Posted record from ${receipt.id}. This is record-keeping only; no payment or settlement occurred.`,
    tier: 1,
  });
  return { receipt, record };
}

export function listBookings() {
  return {
    quotes: state.bookingQuotes,
    bookings: state.bookings,
  };
}

export function decideBooking(
  quoteId: string,
  input: { decision: BookingDecision; selectedIndex?: number; confirm?: boolean; actorId?: string },
) {
  if (!input || !["approve", "reject"].includes(input.decision)) {
    throw new ApiError(400, "INVALID_DECISION", "Booking decision must be approve or reject.");
  }
  const quote = state.bookingQuotes.find((item) => item.id === quoteId);
  if (!quote) throw new ApiError(404, "QUOTE_NOT_FOUND", `Quote ${quoteId} was not found.`);
  if (quote.status !== "open") throw new ApiError(409, "QUOTE_CLOSED", `Quote ${quoteId} is already ${quote.status}.`);

  if (input.decision === "reject") {
    quote.status = "expired";
    appendAudit({
      actor: input.actorId ?? state.currentUserId,
      action: "booking.quote.reject",
      target: quote.id,
      detail: "Quote declined. No supplier action, card charge, or reservation was placed.",
      tier: 3,
    });
    return { quote, booking: null };
  }

  if (!input.confirm) {
    throw new ApiError(409, "CONFIRMATION_REQUIRED", "Booking approval requires explicit confirmation.");
  }
  const option = quote.options.find((item) => item.index === input.selectedIndex);
  if (!option) throw new ApiError(400, "INVALID_OPTION", "Selected booking option does not exist on this quote.");
  ensureOptionNotExpired(option);

  quote.status = "selected";
  quote.selectedIndex = option.index;
  const booking: Booking = {
    id: nextId("bk", state.bookings),
    quoteId: quote.id,
    type: quote.type,
    supplier: option.supplier,
    description: quote.description,
    startDate: "2026-06-12",
    endDate: "2026-06-14",
    amountMinor: option.amountMinor,
    currency: option.currency,
    status: "booked",
    confirmationRef: confirmationRef(`${quote.id}|${option.index}`),
    bookedAt: new Date().toISOString(),
    travellerId: quote.requestedBy,
    departmentBudgetCode: "CC-HQ",
  };
  state.bookings.unshift(booking);
  appendAudit({
    actor: input.actorId ?? state.currentUserId,
    action: "booking.approved",
    target: booking.id,
    detail: `${option.label} approved from ${quote.id}. Booking record created; no money was moved or held by Kira.`,
    tier: 3,
  });
  return { quote, booking };
}

export function createBookingQuote(input: unknown) {
  if (!isRecord(input)) throw new ApiError(400, "INVALID_BODY", "Booking quote payload must be an object.");
  const type = bookingTypeField(input.type ?? "flight");
  const description = stringField(input.description, "description");
  const budgetMinor = typeof input.budgetMinor === "number" ? Math.max(1000, Math.round(input.budgetMinor)) : 52000;
  const quote: BookingQuote = {
    id: nextId("bq", state.bookingQuotes),
    requestedBy: typeof input.requestedBy === "string" ? input.requestedBy : state.currentUserId,
    type,
    description,
    createdAt: new Date().toISOString(),
    options: [
      {
        index: 0,
        label: `${description} · standard`,
        supplier: type === "hotel" ? "Citadines" : type === "product" ? "Preferred vendor" : "AirAsia",
        amountMinor: budgetMinor,
        currency: "MYR",
        breakdown: [{ item: "Offline researched estimate", amountMinor: budgetMinor }],
        notes: ["Generated by local quote engine", "Supplier action requires explicit approval"],
        expiresAt: "2026-06-09T23:59:00+08:00",
      },
      {
        index: 1,
        label: `${description} · flexible`,
        supplier: type === "hotel" ? "Hotel Clover" : type === "product" ? "Alternate vendor" : "Malaysia Airlines",
        amountMinor: Math.round(budgetMinor * 1.18),
        currency: "MYR",
        breakdown: [{ item: "Flexible offline estimate", amountMinor: Math.round(budgetMinor * 1.18) }],
        notes: ["More flexible terms", "No card charge or reservation placed by Kira"],
        expiresAt: "2026-06-09T23:59:00+08:00",
      },
    ],
    researchSources: ["Local offline quote generator", "Policy: explicit approval before booking"],
    status: "open",
  };
  state.bookingQuotes.unshift(quote);
  appendAudit({
    actor: "Booking Agent",
    action: "booking.quote.create",
    target: quote.id,
    detail: `Created ${type} quote options for approval. No supplier action was taken.`,
    tier: 1,
  });
  return { quote };
}

export function getPreferences() {
  return state.preferences;
}

export function updatePreferences(input: unknown) {
  if (!isRecord(input)) throw new ApiError(400, "INVALID_BODY", "Preferences patch must be an object.");
  const threshold = input.automationThreshold;
  const risk = input.riskTolerance;
  const channels = input.channels;
  if (
    threshold !== undefined &&
    (typeof threshold !== "number" || !Number.isInteger(threshold) || threshold < 50 || threshold > 100)
  ) {
    throw new ApiError(400, "INVALID_THRESHOLD", "Automation threshold must be an integer from 50 to 100.");
  }
  if (risk !== undefined && (typeof risk !== "string" || !RISK.has(risk as UserPreference["riskTolerance"]))) {
    throw new ApiError(400, "INVALID_RISK", "Risk tolerance is not supported.");
  }
  if (channels !== undefined) {
    if (!isRecord(channels)) throw new ApiError(400, "INVALID_CHANNELS", "Channels must be an object.");
    for (const key of Object.keys(channels)) {
      if (!CHANNELS.includes(key as (typeof CHANNELS)[number]) || typeof channels[key] !== "boolean") {
        throw new ApiError(400, "INVALID_CHANNELS", "Channels may only contain push, email, slack, and whatsapp booleans.");
      }
    }
  }

  if (typeof threshold === "number") state.preferences.automationThreshold = threshold;
  if (typeof risk === "string") state.preferences.riskTolerance = risk as UserPreference["riskTolerance"];
  if (isRecord(channels)) {
    state.preferences.channels = { ...state.preferences.channels, ...channels };
  }
  appendAudit({
    actor: state.currentUserId,
    action: "preferences.update",
    target: state.preferences.userId,
    detail: "Automation preferences updated as a tier-2 soft-approval action. Safety gates still override thresholds.",
    tier: 2,
  });
  return state.preferences;
}

export function completeOnboarding(input: unknown) {
  if (!isRecord(input)) throw new ApiError(400, "INVALID_BODY", "Onboarding payload must be an object.");
  const legalName = stringField(input.legalName, "legalName");
  const industry = stringField(input.industry, "industry");
  const country = input.country === "MY" || input.country === "SG" ? input.country : null;
  const accountingProvider = stringField(input.accountingProvider, "accountingProvider");
  if (!country) throw new ApiError(400, "INVALID_COUNTRY", "Country must be MY or SG.");
  if (!SUPPORTED_ACCOUNTING.has(accountingProvider)) {
    throw new ApiError(400, "UNSUPPORTED_CONNECTOR", "QuickBooks is not wired in this backend yet. Use AutoCount, SQL Account, or Xero.");
  }

  Object.assign(state.org, {
    legalName,
    brandName: legalName.replace(/\s+(Sdn Bhd|Pte Ltd|PLT)$/i, ""),
    country,
    industry,
    taxProfile: {
      ...state.org.taxProfile,
      model: country === "MY" ? "MY_SST" : "SG_GST",
      registered: true,
      myInvoisPhase: country === "MY" ? "phase2" : "not_applicable",
      sstRate: country === "MY" ? 8 : undefined,
      gstRate: country === "SG" ? 9 : undefined,
      baseCurrency: country === "MY" ? "MYR" : "SGD",
    },
  } satisfies Partial<Organization>);
  Object.assign(state.preferences, {
    baseCurrency: country === "MY" ? "MYR" : "SGD",
    locale: country === "MY" ? "en-MY" : "en-SG",
    automationThreshold: 85,
  } satisfies Partial<UserPreference>);

  const run: OnboardingRun = {
    id: nextId("onb", state.onboardingRuns),
    completedAt: new Date().toISOString(),
    legalName,
    country,
    industry,
    accountingProvider,
    feeds: Array.isArray(input.feeds) ? input.feeds.filter((item): item is string => typeof item === "string") : [],
  };
  state.onboardingRuns.unshift(run);
  appendAudit({
    actor: state.currentUserId,
    action: "onboarding.complete",
    target: run.id,
    detail: `${legalName} provisioned with ${country === "MY" ? "SST/MyInvois" : "GST/InvoiceNow"} and ${accountingProvider}.`,
    tier: 2,
  });
  return { org: state.org, preferences: state.preferences, run };
}

export function listTransactions() {
  return {
    transactions: state.transactions,
    matches: state.matches,
    receipts: state.receipts,
    stats: matchStats(),
  };
}

export function importTransactions(input: unknown) {
  if (!isRecord(input)) throw new ApiError(400, "INVALID_BODY", "Transaction import payload must be an object.");
  const rows = Array.isArray(input.rows) ? input.rows : [];
  if (rows.length === 0) throw new ApiError(400, "NO_ROWS", "Provide at least one transaction row.");

  const imported: TransactionEvent[] = [];
  rows.forEach((row, index) => {
    if (!isRecord(row)) throw new ApiError(400, "INVALID_ROW", `Row ${index + 1} must be an object.`);
    const merchant = stringField(row.merchant ?? row.description, `rows[${index}].merchant`);
    const amountMinor = numberField(row.amountMinor, `rows[${index}].amountMinor`);
    const currency = currencyField(row.currency ?? "MYR", `rows[${index}].currency`);
    const sourceRef = stringField(row.sourceRef ?? "Manual import", `rows[${index}].sourceRef`);
    ensureMaskedSourceRef(sourceRef);
    imported.push({
      id: nextId("txn", [...state.transactions, ...imported]),
      occurredAt: typeof row.occurredAt === "string" ? row.occurredAt : new Date().toISOString(),
      importedAt: new Date().toISOString(),
      description: typeof row.description === "string" ? row.description : merchant.toUpperCase(),
      merchant,
      amountMinor,
      currency,
      source: row.source === "card" || row.source === "bank" ? row.source : "manual",
      sourceRef,
      cardLast4: typeof row.cardLast4 === "string" ? row.cardLast4.slice(-4) : undefined,
      status: "unmatched",
    });
  });

  state.transactions.unshift(...imported);
  appendAudit({
    actor: "Ingestion",
    action: "import.transactions",
    target: String(input.source ?? "manual"),
    detail: `Imported ${imported.length} read-only transaction line${imported.length === 1 ? "" : "s"}. No PAN stored.`,
    tier: 1,
  });
  return { imported, stats: matchStats() };
}

export function confirmMatch(id: string, input: unknown = {}) {
  const match = state.matches.find((item) => item.id === id);
  if (!match) throw new ApiError(404, "MATCH_NOT_FOUND", `Match ${id} was not found.`);
  const txn = transaction(match.transactionId);
  const rcp = receipt(match.receiptId);
  if (!txn || !rcp) throw new ApiError(409, "MATCH_TARGET_MISSING", "Match is missing its transaction or receipt target.");
  match.state = "confirmed";
  txn.status = "matched";
  if (rcp.status !== "confirmed") rcp.status = "confirmed";
  appendAudit({
    actor: isRecord(input) && typeof input.actorId === "string" ? input.actorId : state.currentUserId,
    action: "match.confirm",
    target: id,
    detail: `Confirmed match ${txn.id} ↔ ${rcp.id} at ${match.score}% confidence.`,
    tier: 1,
  });
  return { match, transaction: txn, receipt: rcp };
}

export function listCaptureInbox() {
  return {
    receipts: state.receipts,
    stats: receiptStats(),
  };
}

export function listEinvoices() {
  return {
    einvoices: state.einvoices,
    countryConfigs: state.countryConfigs,
    stats: einvoiceStats(),
  };
}

export function requestEInvoiceSubmission(id: string, input: unknown = {}) {
  const invoice = getEInvoiceOrThrow(id);
  if (!["draft", "queued"].includes(invoice.state)) {
    throw new ApiError(409, "EINVOICE_NOT_SUBMITTABLE", "Only draft or queued e-invoices can request submission approval.");
  }
  const existing = state.approvals.find(
    (approval) => approval.state === "open" && approval.linkedKind === "einvoice" && approval.linkedId === invoice.id,
  );
  if (existing) return { einvoice: invoice, approval: existing };

  const approval = createApproval({
    title: `Submit e-invoice to ${invoice.counterparty}`,
    subject: `${invoice.channel} ${invoice.direction} · ${invoice.id}`,
    amountMinor: invoice.grossMinor,
    currency: invoice.currency,
    tier: 3,
    reversible: false,
    raisedBy: "Compliance/Safety Agent",
    confidence: 88,
    evidence: [
      `Counterparty ${invoice.counterpartyId ?? "ID pending"} checked before submission`,
      `Gross amount ${money(invoice.grossMinor, invoice.currency)} retained for audit`,
      "Submission remains blocked until explicit human approval",
    ],
    linkedKind: "einvoice",
    linkedId: invoice.id,
  });
  appendAudit({
    actor: isRecord(input) && typeof input.actorId === "string" ? input.actorId : "Compliance/Safety Agent",
    action: "einvoice.submit.request",
    target: invoice.id,
    detail: `Created approval ${approval.id} for e-invoice submission.`,
    tier: 3,
  });
  return { einvoice: invoice, approval };
}

export function updateEInvoice(id: string, input: unknown) {
  if (!isRecord(input)) throw new ApiError(400, "INVALID_BODY", "E-invoice patch must be an object.");
  const invoice = getEInvoiceOrThrow(id);
  if (invoice.state === "validated" && !input.correctionNote) {
    throw new ApiError(409, "VALIDATED_EINVOICE_LOCKED", "Validated e-invoices need a correction note before editing.");
  }
  if (typeof input.counterpartyId === "string") invoice.counterpartyId = input.counterpartyId.trim();
  if (input.taxMinor !== undefined) {
    const taxMinor = numberField(input.taxMinor, "taxMinor");
    invoice.taxMinor = taxMinor;
    invoice.grossMinor = invoice.netMinor + taxMinor;
  }
  if (typeof input.rejectionReason === "string") invoice.rejectionReason = input.rejectionReason.trim();
  if (typeof input.state === "string") {
    const next = input.state as EInvoiceState;
    if (!["draft", "queued", "rejected"].includes(next)) {
      throw new ApiError(400, "INVALID_EINVOICE_STATE", "Patch can only move an invoice to draft, queued, or rejected.");
    }
    invoice.state = next;
  }
  appendAudit({
    actor: state.currentUserId,
    action: "einvoice.correct",
    target: invoice.id,
    detail: typeof input.correctionNote === "string" ? input.correctionNote : "E-invoice metadata corrected offline.",
    tier: 3,
  });
  return { einvoice: invoice };
}

export function cancelEInvoice(id: string, input: unknown) {
  if (!isRecord(input)) throw new ApiError(400, "INVALID_BODY", "Cancellation payload must be an object.");
  const invoice = getEInvoiceOrThrow(id);
  const reason = stringField(input.reason, "reason");
  if ((invoice.state === "submitted" || invoice.state === "validated") && input.confirm !== true) {
    throw new ApiError(409, "CONFIRMATION_REQUIRED", "Submitted or validated e-invoices require explicit cancellation confirmation.");
  }
  invoice.state = "cancelled";
  invoice.validationResponse = invoice.validationResponse
    ? `${invoice.validationResponse} · CANCELLED: ${reason}`
    : `CANCELLED: ${reason}`;
  appendAudit({
    actor: state.currentUserId,
    action: "einvoice.cancel",
    target: invoice.id,
    detail: reason,
    tier: 3,
  });
  return { einvoice: invoice };
}

export function analytics() {
  return {
    spendByAccount: spendByAccount(),
    spendByCostCentre: spendByCostCentre(),
    totalSpendBaseMinor: totalSpendBaseMinor(),
    fxToMyr: FX_TO_MYR,
  };
}

export function auditTrail() {
  return {
    entries: state.audit,
    verified: verifyAuditChain(),
  };
}

export function vendors() {
  return state.vendors;
}

export function runVendorEnrichment(input: unknown = {}) {
  const ids =
    isRecord(input) && Array.isArray(input.vendorIds)
      ? input.vendorIds.filter((id): id is string => typeof id === "string")
      : state.vendors.map((vendor) => vendor.id);
  const updated = state.vendors.filter((vendor) => ids.includes(vendor.id));
  for (const vendor of updated) {
    vendor.lastEnrichedAt = new Date().toISOString();
    vendor.priceIntelligence =
      vendor.priceIntelligence ?? "Offline enrichment run completed; monitor pricing at next procurement cycle.";
    if (vendor.transactionCount > 4 && vendor.riskLevel === "low") {
      vendor.riskLevel = "medium";
      vendor.riskNotes = vendor.riskNotes ?? "Spend concentration increased; review alternate suppliers before next order.";
    }
  }
  appendAudit({
    actor: "Vendor Intelligence Agent",
    action: "vendor.enrich",
    target: updated.map((vendor) => vendor.id).join(","),
    detail: `Updated ${updated.length} vendor enrichment record${updated.length === 1 ? "" : "s"} offline.`,
    tier: 1,
  });
  return { runId: confirmationRef(`vendor|${ids.join(",")}`), updatedVendors: updated };
}

export function updateVendorRisk(id: string, input: unknown) {
  if (!isRecord(input)) throw new ApiError(400, "INVALID_BODY", "Vendor risk patch must be an object.");
  const vendor = state.vendors.find((item) => item.id === id);
  if (!vendor) throw new ApiError(404, "VENDOR_NOT_FOUND", `Vendor ${id} was not found.`);
  if (input.riskLevel !== undefined) {
    if (input.riskLevel !== "low" && input.riskLevel !== "medium" && input.riskLevel !== "high") {
      throw new ApiError(400, "INVALID_VENDOR_RISK", "Vendor risk level must be low, medium, or high.");
    }
    vendor.riskLevel = input.riskLevel as VendorRisk;
  }
  if (typeof input.riskNotes === "string") vendor.riskNotes = input.riskNotes.trim();
  appendAudit({
    actor: state.currentUserId,
    action: "vendor.risk.update",
    target: vendor.id,
    detail: `Vendor risk set to ${vendor.riskLevel}.`,
    tier: 2,
  });
  return { vendor };
}

export function forecast() {
  return state.forecastBuckets;
}

export function runForecast(input: unknown = {}) {
  const horizonDays = isRecord(input) && typeof input.horizonDays === "number" ? Math.max(1, Math.round(input.horizonDays)) : 90;
  const assumptions = isRecord(input) && isRecord(input.assumptions) ? input.assumptions : {};
  const run = {
    id: nextId("fc_run", state.forecastRuns),
    createdAt: new Date().toISOString(),
    horizonDays,
    assumptions,
  };
  state.forecastRuns.unshift(run);
  appendAudit({
    actor: "Cashflow Forecast Agent",
    action: "forecast.run",
    target: run.id,
    detail: `Generated ${horizonDays}-day informational forecast. No payment, disbursement, or settlement was scheduled.`,
    tier: 1,
  });
  return { runId: run.id, buckets: state.forecastBuckets, assumptions };
}

export function portfolio() {
  return {
    positions: state.positions,
    news: state.news,
    stats: portfolioStats(),
  };
}

export function erpClose() {
  return {
    clients: state.closeBookClients,
    suppliers: state.closeBookSuppliers,
    records: state.closeBookRecords,
    dashboard: getWorkflowDashboard(state.closeBookRecords),
  };
}

export function getCloseBookBill(id: string) {
  const record = getCloseBookRecordOrThrow(id);
  return { record, blockers: getExportBlockers(record), auditTrail: record.auditTrail };
}

export function updateCloseBookBill(id: string, input: unknown) {
  if (!isRecord(input)) throw new ApiError(400, "INVALID_BODY", "Bill patch must be an object.");
  const record = getCloseBookRecordOrThrow(id);
  if (typeof input.supplierTin === "string") record.supplierTin = input.supplierTin.trim();
  if (typeof input.supplierSstRegistrationNo === "string") record.supplierSstRegistrationNo = input.supplierSstRegistrationNo.trim();
  if (input.totalMinor !== undefined) record.totalMinor = numberField(input.totalMinor, "totalMinor");
  if (input.taxMinor !== undefined) record.taxMinor = numberField(input.taxMinor, "taxMinor");
  if (
    input.taxTreatment === "sst_8_service" ||
    input.taxTreatment === "sst_exempt" ||
    input.taxTreatment === "imported_taxable_service" ||
    input.taxTreatment === "out_of_scope"
  ) {
    record.taxTreatment = input.taxTreatment;
  }
  if (isRecord(input.erpMapping)) {
    record.erpMapping = {
      destination:
        input.erpMapping.destination === "AutoCount" ||
        input.erpMapping.destination === "SQL Account" ||
        input.erpMapping.destination === "Xero" ||
        input.erpMapping.destination === "LHDN MyInvois"
          ? input.erpMapping.destination
          : record.erpMapping?.destination ?? state.closeBookClients[0]?.erp ?? "AutoCount",
      vendorId: typeof input.erpMapping.vendorId === "string" ? input.erpMapping.vendorId : record.erpMapping?.vendorId,
      apAccountCode: typeof input.erpMapping.apAccountCode === "string" ? input.erpMapping.apAccountCode : record.erpMapping?.apAccountCode,
      expenseAccountCode:
        typeof input.erpMapping.expenseAccountCode === "string"
          ? input.erpMapping.expenseAccountCode
          : record.erpMapping?.expenseAccountCode,
      taxCode: typeof input.erpMapping.taxCode === "string" ? input.erpMapping.taxCode : record.erpMapping?.taxCode,
      costCentre: typeof input.erpMapping.costCentre === "string" ? input.erpMapping.costCentre : record.erpMapping?.costCentre,
      lhdnClassificationCode:
        typeof input.erpMapping.lhdnClassificationCode === "string"
          ? input.erpMapping.lhdnClassificationCode
          : record.erpMapping?.lhdnClassificationCode,
    };
  }
  record.auditTrail.push({
    id: confirmationRef(`${record.id}|patch`),
    at: new Date().toISOString(),
    actor: state.currentUserId,
    action: "ocr.extracted",
    detail: typeof input.note === "string" ? input.note : "Bill record fields updated.",
  });
  appendAudit({
    actor: state.currentUserId,
    action: "close_book.bill.update",
    target: record.id,
    detail: typeof input.note === "string" ? input.note : "Bill record updated.",
    tier: 2,
  });
  return getCloseBookBill(id);
}

export function resolveCloseBookException(id: string, input: unknown) {
  if (!isRecord(input)) throw new ApiError(400, "INVALID_BODY", "Exception resolution payload must be an object.");
  const type = stringField(input.type, "type") as CloseBookExceptionType;
  const record = getCloseBookRecordOrThrow(id);
  const exception = record.exceptions.find((item) => item.type === type);
  if (!exception) throw new ApiError(404, "EXCEPTION_NOT_FOUND", `Exception ${type} was not found on ${id}.`);
  exception.resolved = true;
  record.auditTrail.push({
    id: confirmationRef(`${record.id}|${type}`),
    at: new Date().toISOString(),
    actor: state.currentUserId,
    action: "exception.resolved",
    detail: typeof input.note === "string" ? input.note : exception.message,
  });
  if (record.exceptions.every((item) => item.resolved) && record.status === "needs_review") {
    record.status = "ready";
  }
  appendAudit({
    actor: state.currentUserId,
    action: "close_book.exception.resolve",
    target: record.id,
    detail: `${type} resolved.`,
    tier: 2,
  });
  return getCloseBookBill(id);
}

export function exportEvidencePack(input: unknown = {}) {
  const recordIds =
    isRecord(input) && Array.isArray(input.recordIds)
      ? input.recordIds.filter((id): id is string => typeof id === "string")
      : state.closeBookRecords.map((record) => record.id);
  const batch = {
    id: nextId("exp", state.exportBatches),
    createdAt: new Date().toISOString(),
    destination: "evidence-pack",
    recordIds,
    exportedRecords: [],
    blockedRecords: [],
    fileRef: `local://exports/evidence-pack-${Date.now()}.zip`,
  };
  state.exportBatches.unshift(batch);
  appendAudit({
    actor: state.currentUserId,
    action: "close_book.evidence_pack",
    target: batch.id,
    detail: `Prepared local evidence pack for ${recordIds.length} bill record${recordIds.length === 1 ? "" : "s"}.`,
    tier: 1,
  });
  return { exportId: batch.id, status: "ready", fileRef: batch.fileRef, recordIds };
}

export function exportReadyBills(input: unknown) {
  if (!isRecord(input)) throw new ApiError(400, "INVALID_BODY", "Export payload must be an object.");
  const destination = stringField(input.destination ?? state.closeBookClients[0]?.erp ?? "AutoCount", "destination") as ExportDestination;
  const ids =
    Array.isArray(input.recordIds) && input.recordIds.length > 0
      ? input.recordIds.filter((id): id is string => typeof id === "string")
      : state.closeBookRecords.map((record) => record.id);
  const selected = state.closeBookRecords.filter((record) => ids.includes(record.id));
  const exportedRecords: string[] = [];
  const blockedRecords: string[] = [];
  for (const record of selected) {
    if (canExportRecord(record)) {
      record.status = "exported";
      record.auditTrail.push({
        id: confirmationRef(`${record.id}|export`),
        at: new Date().toISOString(),
        actor: state.currentUserId,
        action: "export.completed",
        detail: `Exported offline package to ${destination}. No settlement or payment occurred.`,
      });
      exportedRecords.push(record.id);
    } else {
      blockedRecords.push(record.id);
      record.auditTrail.push({
        id: confirmationRef(`${record.id}|blocked`),
        at: new Date().toISOString(),
        actor: "ERP Export Gate",
        action: "export.blocked",
        detail: getExportBlockers(record).map((blocker) => blocker.message).join(" "),
      });
    }
  }
  const batch = {
    id: nextId("exp", state.exportBatches),
    createdAt: new Date().toISOString(),
    destination,
    recordIds: ids,
    exportedRecords,
    blockedRecords,
  };
  state.exportBatches.unshift(batch);
  appendAudit({
    actor: state.currentUserId,
    action: "close_book.export",
    target: batch.id,
    detail: `Exported ${exportedRecords.length}; blocked ${blockedRecords.length}. Record-keeping export only, no money movement.`,
    tier: 3,
  });
  return { batchId: batch.id, exportedRecords, blockedRecords };
}

export function operatingFunctions(id?: string) {
  return {
    loop: KIRA_LOOP,
    functions: OPERATING_FUNCTIONS,
    selected: id ? getOperatingFunction(id as Parameters<typeof getOperatingFunction>[0]) : undefined,
  };
}

export function startOperatingWorkflow(id: string, input: unknown) {
  if (!isRecord(input)) throw new ApiError(400, "INVALID_BODY", "Workflow payload must be an object.");
  const fn = getOperatingFunction(id as Parameters<typeof getOperatingFunction>[0]);
  if (fn.id !== id) throw new ApiError(404, "OPERATING_FUNCTION_NOT_FOUND", `Function ${id} was not found.`);
  const action = stringField(input.action ?? fn.recommendedActions[0], "action");
  const requireApproval = input.requireApproval === true || fn.approvalsRequired > 0;
  const approval = requireApproval
    ? createApproval({
        title: `Approve workflow: ${action}`,
        subject: `${fn.function} · ${fn.impactEstimate}`,
        tier: 3,
        reversible: true,
        raisedBy: "Orchestrator",
        confidence: 82,
        evidence: [fn.benchmarkGap, fn.financialImpact, "Workflow is approval-gated before any external system update"],
        linkedKind: "suggestion",
        linkedId: fn.id,
      })
    : undefined;
  const run = {
    id: nextId("wf", state.workflowRuns),
    functionId: fn.id,
    action,
    status: approval ? "approval_required" : "queued",
    createdAt: new Date().toISOString(),
    approvalId: approval?.id,
  } as const;
  state.workflowRuns.unshift(run);
  appendAudit({
    actor: "Orchestrator",
    action: "operating.workflow.start",
    target: run.id,
    detail: `${fn.function}: ${action}. ${approval ? `Approval ${approval.id} required.` : "Queued for offline execution."}`,
    tier: approval ? 3 : 1,
  });
  return { workflowId: run.id, status: run.status, approval };
}

export function resetBackend() {
  resetState();
  return health();
}

export const FX_TO_MYR: Record<CurrencyCode, number> = {
  MYR: 1,
  SGD: 3.3,
  USD: 4.45,
};

export function toBase(minor: number, currency: CurrencyCode): number {
  return Math.round(minor * FX_TO_MYR[currency]);
}

export function account(code?: string) {
  return state.accounts.find((a) => a.code === code);
}
export function taxCode(code?: string) {
  return state.taxCodes.find((t) => t.code === code);
}
export function costCentre(code?: string) {
  return state.costCentres.find((c) => c.code === code);
}
export function user(id?: string) {
  return state.users.find((u) => u.id === id);
}
export function currentUser() {
  return user(state.currentUserId)!;
}
export function receipt(id?: string) {
  return state.receipts.find((r) => r.id === id);
}
export function transaction(id?: string) {
  return state.transactions.find((t) => t.id === id);
}
export function matchForTransaction(txnId: string) {
  return state.matches.find((m) => m.transactionId === txnId);
}
export function matchForReceipt(rcpId: string) {
  return state.matches.find((m) => m.receiptId === rcpId);
}

export function spendByAccount() {
  const map = new Map<string, { key: string; label: string; amountBaseMinor: number; count: number }>();
  for (const r of state.records) {
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

export function spendByCostCentre() {
  const map = new Map<string, { key: string; label: string; amountBaseMinor: number; count: number }>();
  for (const r of state.records) {
    const cc = costCentre(r.costCentre);
    const k = r.costCentre ?? "-";
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
  return state.records.reduce((s, r) => s + toBase(r.amountMinor, r.currency), 0);
}

export function matchStats() {
  const total = state.transactions.length;
  const matched = state.transactions.filter((t) => t.status === "matched").length;
  const review = state.transactions.filter((t) => t.status === "needs_review").length;
  const unmatched = state.transactions.filter((t) => t.status === "unmatched").length;
  return {
    total,
    matched,
    review,
    unmatched,
    matchedPct: total > 0 ? Math.round((matched / total) * 100) : 0,
  };
}

export function receiptStats() {
  const total = state.receipts.length;
  const confirmed = state.receipts.filter((r) => r.status === "confirmed").length;
  const review = state.receipts.filter((r) => r.status === "needs_review").length;
  return { total, confirmed, review };
}

export function einvoiceStats() {
  const by = (s: string) => state.einvoices.filter((e) => e.state === s).length;
  return {
    total: state.einvoices.length,
    validated: by("validated"),
    submitted: by("submitted"),
    queued: by("queued"),
    draft: by("draft"),
    rejected: by("rejected"),
  };
}

export function openApprovals() {
  return state.approvals.filter((a) => a.state === "open").sort((a, b) => b.tier - a.tier);
}

export function closeReadiness() {
  const m = matchStats();
  const matchScore = m.matchedPct;
  const coded = state.records.length;
  const reconciled = state.records.filter((r) => r.reconciled).length;
  const codingScore = Math.round((reconciled / Math.max(coded, 1)) * 100);
  const ei = einvoiceStats();
  const eiHealthy = ei.validated + ei.submitted;
  const eiScore = Math.round((eiHealthy / Math.max(ei.total, 1)) * 100);
  const score = Math.round(matchScore * 0.45 + codingScore * 0.3 + eiScore * 0.25);
  const blockers: string[] = [];
  if (m.unmatched + m.review > 0) blockers.push(`${m.unmatched + m.review} transactions unmatched / in review`);
  if (ei.rejected > 0) blockers.push(`${ei.rejected} e-invoice rejected (action needed)`);
  if (ei.queued + ei.draft > 0) blockers.push(`${ei.queued + ei.draft} e-invoices not yet submitted`);
  if (reconciled < coded) blockers.push(`${coded - reconciled} record entries not reconciled`);
  return { score, blockers };
}

export function portfolioStats() {
  let costBase = 0;
  let valueBase = 0;
  for (const p of state.positions) {
    const c = toBase(p.avgCostMinor * p.units, p.instrument.currency);
    const v = toBase(p.lastMinor * p.units, p.instrument.currency);
    costBase += c;
    valueBase += v;
  }
  const pnl = valueBase - costBase;
  const pnlPct = costBase > 0 ? (pnl / costBase) * 100 : 0;
  const shares = state.positions
    .map((p) => ({
      name: p.instrument.name,
      symbol: p.instrument.symbol,
      valueBase: toBase(p.lastMinor * p.units, p.instrument.currency),
    }))
    .sort((a, b) => b.valueBase - a.valueBase);
  const topShare = valueBase > 0 && shares[0] ? Math.round((shares[0].valueBase / valueBase) * 100) : 0;
  return { costBase, valueBase, pnl, pnlPct, topShare, shares };
}

function submitEInvoiceFromApproval(approval: ApprovalRequest) {
  const invoice = state.einvoices.find((item) => item.id === approval.linkedId);
  if (!invoice || (invoice.state !== "draft" && invoice.state !== "queued")) return;
  invoice.state = "submitted";
  invoice.submittedAt = new Date().toISOString();
  invoice.uuid = invoice.uuid ?? confirmationRef(invoice.id);
  invoice.validationResponse = "SUBMITTED · awaiting regulator validation · explicit approval captured";
}

function captureFields(): CaptureField[] {
  return [
    { key: "account", label: "Account", value: "5010 · COGS - Coffee & Raw Materials", confidence: 96 },
    { key: "taxCode", label: "Tax code", value: "OUT · Out of scope (goods)", confidence: 88 },
    { key: "costCentre", label: "Cost centre", value: "CC-TTDI · TTDI Roastery", confidence: 84 },
  ];
}

function captureDraft(receipt: Receipt): CaptureDraft {
  const fields = captureFields();
  return {
    receipt,
    fields,
    reviewThreshold: 85,
    needsReview: receipt.status === "needs_review" || fields.some((field) => field.confidence < 85),
  };
}

function createApproval(input: {
  title: string;
  subject: string;
  amountMinor?: number;
  currency?: CurrencyCode;
  tier: ApprovalTier;
  reversible: boolean;
  raisedBy: string;
  confidence: number;
  evidence: string[];
  linkedKind?: ApprovalRequest["linkedKind"];
  linkedId?: string;
}) {
  const approval: ApprovalRequest = {
    id: nextId("apr", state.approvals),
    title: input.title,
    subject: input.subject,
    amountMinor: input.amountMinor,
    currency: input.currency,
    tier: input.tier,
    reversible: input.reversible,
    raisedBy: input.raisedBy,
    raisedAt: new Date().toISOString(),
    confidence: input.confidence,
    evidence: input.evidence,
    steps: [
      {
        order: 1,
        role: input.tier >= 4 ? "approver" : "finance_admin",
        approverName: input.tier >= 4 ? "Siti Nuraini" : currentUser().name,
        state: "pending",
      },
    ],
    state: "open",
    linkedKind: input.linkedKind,
    linkedId: input.linkedId,
  };
  state.approvals.unshift(approval);
  return approval;
}

function getReceiptOrThrow(id: string) {
  const receipt = state.receipts.find((item) => item.id === id);
  if (!receipt) throw new ApiError(404, "RECEIPT_NOT_FOUND", `Receipt ${id} was not found.`);
  return receipt;
}

function getEInvoiceOrThrow(id: string) {
  const invoice = state.einvoices.find((item) => item.id === id);
  if (!invoice) throw new ApiError(404, "EINVOICE_NOT_FOUND", `E-invoice ${id} was not found.`);
  return invoice;
}

function getCloseBookRecordOrThrow(id: string): VerifiedBillRecord {
  const record = state.closeBookRecords.find((item) => item.id === id);
  if (!record) throw new ApiError(404, "BILL_RECORD_NOT_FOUND", `Bill record ${id} was not found.`);
  return record;
}

function ensureAccount(code?: string) {
  if (!code || !account(code)) throw new ApiError(400, "INVALID_ACCOUNT", "Suggested account does not exist.");
}
function ensureTaxCode(code?: string) {
  if (!code || !taxCode(code)) throw new ApiError(400, "INVALID_TAX_CODE", "Suggested tax code does not exist.");
}
function ensureCostCentre(code?: string) {
  if (!code || !costCentre(code)) throw new ApiError(400, "INVALID_COST_CENTRE", "Suggested cost centre does not exist.");
}

function ensureOptionNotExpired(option: BookingQuoteOption) {
  if (option.expiresAt && new Date(option.expiresAt).getTime() < new Date(NOW).getTime()) {
    throw new ApiError(409, "QUOTE_EXPIRED", "This booking option is expired; request fresh quotes before approving.");
  }
}

function numberField(value: unknown, field: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ApiError(400, "INVALID_NUMBER", `${field} must be a finite number.`);
  }
  return Math.round(value);
}

function currencyField(value: unknown, field: string): CurrencyCode {
  if (value === "MYR" || value === "SGD" || value === "USD") return value;
  throw new ApiError(400, "INVALID_CURRENCY", `${field} must be MYR, SGD, or USD.`);
}

function bookingTypeField(value: unknown): BookingType {
  if (value === "flight" || value === "hotel" || value === "rail" || value === "car" || value === "product") return value;
  throw new ApiError(400, "INVALID_BOOKING_TYPE", "Booking type must be flight, hotel, rail, car, or product.");
}

function ensureMaskedSourceRef(value: string) {
  if (/\d{8,}/.test(value.replace(/\s+/g, ""))) {
    throw new ApiError(400, "PAN_REJECTED", "Transaction imports must use masked account/card references only.");
  }
}

function verifyAuditChain() {
  let prev = "genesis0000000000";
  for (const entry of state.audit) {
    const payload = `${entry.at}|${entry.actor}|${entry.action}|${entry.target ?? ""}|${entry.detail}|tier:${entry.tier ?? ""}`;
    const expected = chainHash(prev, payload);
    if (expected !== entry.hash || entry.prevHash !== prev) return false;
    prev = entry.hash;
  }
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length < 2) {
    throw new ApiError(400, "INVALID_FIELD", `${field} is required.`);
  }
  return value.trim();
}
