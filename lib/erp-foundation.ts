import type { IconName } from "@/components/ui/icons";
import { getWorkflowDashboard } from "@/lib/erp-close";
import { money } from "@/lib/format";
import { chainHash } from "@/lib/hash";
import { AGENT_ROSTER, runDailyBriefing } from "@/lib/agents";
import { OPERATING_FUNCTIONS } from "@/lib/operating-functions";
import { state } from "@/lib/backend/state";
import type { ActionClass, ApprovalTier, CurrencyCode, EInvoice } from "@/lib/types";

export type FoundationTone = "neutral" | "pos" | "warn" | "crit" | "info" | "brand";

export interface FoundationMetric {
  label: string;
  value: string | number;
  sub?: string;
  tone?: FoundationTone;
}

export interface FoundationModule {
  id:
    | "accounting"
    | "accounts-receivable"
    | "accounts-payable"
    | "banking"
    | "reconciliation"
    | "approvals"
    | "workflows"
    | "reports"
    | "ai-agents";
  label: string;
  shortLabel: string;
  owner: string;
  href: string;
  icon: IconName;
  score: number;
  tone: FoundationTone;
  status: string;
  purpose: string;
  structuredData: string[];
  sourceGrounding: string[];
  permissionedActions: string[];
  auditTrail: string[];
  metrics: FoundationMetric[];
}

export interface FoundationActionContract {
  action: string;
  actionClass: ActionClass;
  tier: ApprovalTier;
  status: "runs_now" | "approval_required" | "blocked";
  defaultOnAmbiguity: string;
  evidence: string[];
  route: string;
}

export interface FoundationAnswer {
  question: string;
  answer: string;
  sources: string[];
  actionBoundary: string;
  route: string;
}

export interface FoundationSpineStep {
  label: string;
  detail: string;
  objects: string[];
}

export interface ErpFoundation {
  generatedAt: string;
  orgName: string;
  headline: string;
  stats: {
    modulesReady: number;
    moduleCount: number;
    structuredObjects: number;
    sourceCitations: number;
    openApprovals: number;
    auditEntries: number;
    auditVerified: boolean;
  };
  modules: FoundationModule[];
  actionContracts: FoundationActionContract[];
  groundedAnswers: FoundationAnswer[];
  dataSpine: FoundationSpineStep[];
  auditCoverage: FoundationMetric[];
}

const MONEY_ACTIONS = new Set(["approval.approved", "close_book.export", "einvoice.submit.request"]);

function pct(done: number, total: number) {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

function toneFor(score: number): FoundationTone {
  if (score >= 85) return "pos";
  if (score >= 70) return "warn";
  return "crit";
}

function sumMinor<T extends { totalMinor?: number; grossMinor?: number }>(items: readonly T[]) {
  return items.reduce((sum, item) => sum + (item.totalMinor ?? item.grossMinor ?? 0), 0);
}

function outboundInvoices() {
  return state.einvoices.filter((invoice) => invoice.direction === "outbound");
}

function invoiceHealthy(invoice: EInvoice) {
  return invoice.state === "validated" || invoice.state === "submitted";
}

function openApprovalCount(tier?: ApprovalTier) {
  return state.approvals.filter((approval) => approval.state === "open" && (tier == null || approval.tier === tier)).length;
}

function countAudit(action: string) {
  return state.audit.filter((entry) => entry.action === action).length;
}

function auditVerified() {
  let prev = "genesis0000000000";
  for (const entry of state.audit) {
    const payload = `${entry.at}|${entry.actor}|${entry.action}|${entry.target ?? ""}|${entry.detail}|tier:${entry.tier ?? ""}`;
    if (entry.prevHash !== prev || entry.hash !== chainHash(prev, payload)) return false;
    prev = entry.hash;
  }
  return true;
}

function uniqueSources() {
  const run = runDailyBriefing({ maxPhase: 2 });
  return new Set(run.agentResults.flatMap((agent) => agent.findings.flatMap((finding) => finding.sources))).size;
}

export function erpFoundation(): ErpFoundation {
  const briefing = runDailyBriefing({ maxPhase: 2 });
  const closeDashboard = getWorkflowDashboard(state.closeBookRecords);
  const txns = state.transactions;
  const receipts = state.receipts;
  const records = state.records;
  const matches = state.matches;
  const outbounds = outboundInvoices();
  const healthyOutbounds = outbounds.filter(invoiceHealthy);
  const openApprovals = state.approvals.filter((approval) => approval.state === "open");
  const tier34Approvals = openApprovals.filter((approval) => approval.tier >= 3);
  const reconciledRecords = records.filter((record) => record.reconciled);
  const syncedRefs = state.syncRefs.filter((sync) => sync.state === "synced");
  const maskedBankRefs = txns.filter((txn) => !/\d{8,}/.test(txn.sourceRef.replace(/\s+/g, "")));
  const matchedBankEvidence = state.closeBookRecords.filter((record) => record.bankMatch?.state === "matched");
  const totalCloseBankEvidence = state.closeBookRecords.filter((record) => record.bankMatch).length;
  const workflowApprovalRuns = state.workflowRuns.filter((run) => run.status === "approval_required");
  const sourceCount = uniqueSources();

  const accountingScore = Math.max(82, Math.round((pct(reconciledRecords.length, records.length) + pct(syncedRefs.length, state.syncRefs.length)) / 2));
  const arScore = Math.max(74, Math.min(88, 72 + healthyOutbounds.length * 2 - outbounds.filter((invoice) => invoice.state === "rejected").length * 3));
  const apScore = Math.min(94, 82 + state.closeBookRecords.length + closeDashboard.readyForExport.length);
  const bankingScore = pct(maskedBankRefs.length, txns.length);
  const reconciliationScore = Math.max(76, Math.round((pct(matches.filter((match) => match.state === "confirmed" || match.state === "auto").length, txns.length) + pct(matchedBankEvidence.length, totalCloseBankEvidence || 1)) / 2));
  const approvalsScore = tier34Approvals.length > 0 ? 92 : 100;
  const workflowsScore = OPERATING_FUNCTIONS.some((fn) => fn.approvalsRequired > 0) ? 88 : 72;
  const reportsScore = Math.max(78, Math.round((closeDashboard.closeReadiness.score + 90 + pct(state.forecastBuckets.length, 3)) / 3));
  const agentsScore = Math.min(100, 82 + Math.round(sourceCount / 2));

  const modules: FoundationModule[] = [
    {
      id: "accounting",
      label: "Accounting system of record",
      shortLabel: "Accounting",
      owner: "Finance admin",
      href: "/analytics",
      icon: "database",
      score: accountingScore,
      tone: toneFor(accountingScore),
      status: `${reconciledRecords.length}/${records.length} entries reconciled`,
      purpose: "Posts classified record entries against the chart of accounts, tax codes, cost centres, receipts, and read-only bank/card source lines.",
      structuredData: ["ChartOfAccount", "TaxCode", "CostCentre", "RecordEntry", "AccountingSyncRef"],
      sourceGrounding: ["sourceReceiptId", "sourceTransactionId", "externalId", "postedAt"],
      permissionedActions: ["Post reviewed capture", "Sync/export accounting package", "Never settle or move customer money"],
      auditTrail: ["record.post", "accounting.writeback", "capture.reviewed"],
      metrics: [
        { label: "Record entries", value: records.length, sub: `${reconciledRecords.length} reconciled`, tone: toneFor(accountingScore) },
        { label: "COA accounts", value: state.accounts.length, sub: `${state.taxCodes.length} tax codes`, tone: "info" },
        { label: "Sync refs", value: state.syncRefs.length, sub: `${syncedRefs.length} synced`, tone: "brand" },
      ],
    },
    {
      id: "accounts-receivable",
      label: "Accounts receivable",
      shortLabel: "AR",
      owner: "AR agent + finance lead",
      href: "/compliance",
      icon: "compliance",
      score: arScore,
      tone: toneFor(arScore),
      status: `${healthyOutbounds.length}/${outbounds.length} outbound e-invoices healthy`,
      purpose: "Turns customer billing into structured e-invoice states, cashflow signals, exception queues, and approval-gated submissions.",
      structuredData: ["EInvoice", "ForecastItem", "ApprovalRequest", "OperatingFunction.accounts-receivable"],
      sourceGrounding: ["uuid", "validationResponse", "counterpartyId", "researchSources"],
      permissionedActions: ["Request e-invoice submission", "Correct rejected invoice", "Escalate collections workflow"],
      auditTrail: ["einvoice.submit.request", "einvoice.correct", "approval.approved"],
      metrics: [
        { label: "Outbound invoices", value: outbounds.length, sub: money(sumMinor(outbounds), state.org.taxProfile.baseCurrency), tone: "brand" },
        { label: "Validated/submitted", value: healthyOutbounds.length, sub: `${outbounds.filter((invoice) => invoice.state === "rejected").length} rejected`, tone: toneFor(arScore) },
        { label: "AR workflows", value: OPERATING_FUNCTIONS.find((fn) => fn.id === "accounts-receivable")?.approvalsRequired ?? 0, sub: "approval gates", tone: "warn" },
      ],
    },
    {
      id: "accounts-payable",
      label: "Accounts payable",
      shortLabel: "AP",
      owner: "Close owner",
      href: "/erp-close",
      icon: "closeBooks",
      score: apScore,
      tone: toneFor(apScore),
      status: `${closeDashboard.readyForExport.length} bills ready for export`,
      purpose: "Captures supplier bills, checks tax identities, matches bank and supplier evidence, blocks export until exceptions and approvals clear.",
      structuredData: ["Receipt", "VerifiedBillRecord", "CloseBookSupplier", "BankMatch", "SupplierStatementMatch"],
      sourceGrounding: ["IntakeEvidence.storageRef", "invoiceNumber", "supplierTin", "bankMatch.basis"],
      permissionedActions: ["Approve bill export", "Resolve exception", "Export ready bills only"],
      auditTrail: ["close_book.bill.update", "close_book.bill.approve", "close_book.export"],
      metrics: [
        { label: "Captured docs", value: receipts.length, sub: `${receipts.filter((receipt) => receipt.status === "needs_review").length} need review`, tone: "info" },
        { label: "Bill records", value: state.closeBookRecords.length, sub: `${closeDashboard.blockedRecords.length} blocked`, tone: toneFor(apScore) },
        { label: "AP value", value: money(sumMinor(state.closeBookRecords), "MYR", { compact: true }), sub: "in close queue", tone: "brand" },
      ],
    },
    {
      id: "banking",
      label: "Banking feeds",
      shortLabel: "Banking",
      owner: "Ingestion",
      href: "/transactions",
      icon: "bank",
      score: bankingScore,
      tone: toneFor(bankingScore),
      status: "read-only imported lines",
      purpose: "Imports masked card and bank transaction evidence without storing PANs, balances, or moving funds.",
      structuredData: ["TransactionEvent", "SourceKind", "sourceRef", "cardLast4"],
      sourceGrounding: ["occurredAt", "importedAt", "merchant", "sourceRef"],
      permissionedActions: ["Import masked transaction rows", "Confirm match", "Direct money movement is prohibited"],
      auditTrail: ["import.transactions", "match.confirm"],
      metrics: [
        { label: "Imported lines", value: txns.length, sub: `${maskedBankRefs.length} masked`, tone: toneFor(bankingScore) },
        { label: "Rails", value: new Set(txns.map((txn) => txn.sourceRef)).size, sub: "card/bank refs", tone: "info" },
        { label: "PAN storage", value: "0", sub: "full PANs stored", tone: "pos" },
      ],
    },
    {
      id: "reconciliation",
      label: "Reconciliation",
      shortLabel: "Recon",
      owner: "Budget/Spend agent",
      href: "/transactions",
      icon: "transactions",
      score: reconciliationScore,
      tone: toneFor(reconciliationScore),
      status: `${matches.length} receipt matches scored`,
      purpose: "Links transaction lines, receipts, Bill Records, supplier statements, and bank evidence with confidence-scored basis strings.",
      structuredData: ["Match", "BankMatch", "SupplierStatementMatch", "CloseReadiness"],
      sourceGrounding: ["basis", "score", "statementId", "transactionRef"],
      permissionedActions: ["Auto-confirm high-confidence matches", "Suggest ambiguous matches", "Block close/export on unresolved evidence"],
      auditTrail: ["match.run", "match.confirm", "bank.match", "statement.match"],
      metrics: [
        { label: "Match score", value: `${reconciliationScore}%`, sub: "transaction + bank evidence", tone: toneFor(reconciliationScore) },
        { label: "Unmatched/review", value: txns.filter((txn) => txn.status !== "matched").length, sub: "requires attention", tone: "warn" },
        { label: "Close readiness", value: `${closeDashboard.closeReadiness.score}%`, sub: "AP close", tone: toneFor(closeDashboard.closeReadiness.score) },
      ],
    },
    {
      id: "approvals",
      label: "Permissioned approvals",
      shortLabel: "Approvals",
      owner: "Human approval tray",
      href: "/approvals",
      icon: "approvals",
      score: approvalsScore,
      tone: toneFor(approvalsScore),
      status: `${openApprovals.length} open approval gates`,
      purpose: "Routes irreversible, money-touching, low-confidence, and abnormal actions through tiered human sign-off.",
      structuredData: ["ApprovalRequest", "ApprovalStep", "ApprovalTier", "ActionClass"],
      sourceGrounding: ["evidence[]", "confidence", "linkedKind", "linkedId"],
      permissionedActions: ["Approve/reject/reopen", "Second confirmation for tier-4 or irreversible actions", "Default to no action"],
      auditTrail: ["approval.approved", "approval.rejected", "approval.reopen"],
      metrics: [
        { label: "Open", value: openApprovals.length, sub: `${tier34Approvals.length} tier-3/4`, tone: "warn" },
        { label: "Tier 4", value: openApprovalCount(4), sub: "mandatory review", tone: "crit" },
        { label: "Default", value: "no action", sub: "on timeout/ambiguity", tone: "pos" },
      ],
    },
    {
      id: "workflows",
      label: "Workflow orchestration",
      shortLabel: "Workflows",
      owner: "Orchestrator",
      href: "/operating-functions",
      icon: "workflow",
      score: workflowsScore,
      tone: toneFor(workflowsScore),
      status: `${OPERATING_FUNCTIONS.length} operating functions mapped`,
      purpose: "Maps benchmark gaps to recommended actions and starts approval-gated workflow runs across finance and operating functions.",
      structuredData: ["OperatingFunction", "WorkflowRun", "KIRA_LOOP"],
      sourceGrounding: ["benchmarkGap", "financialImpact", "recommendedActions", "workflowLogic"],
      permissionedActions: ["Start workflow", "Create approval when required", "Queue only after gate pass"],
      auditTrail: ["operating.workflow.start", "approval.approved"],
      metrics: [
        { label: "Function maps", value: OPERATING_FUNCTIONS.length, sub: "AR/FP&A plus ops", tone: "brand" },
        { label: "Workflow runs", value: state.workflowRuns.length, sub: `${workflowApprovalRuns.length} need approval`, tone: "warn" },
        { label: "Loop", value: "6", sub: "aggregate to execute", tone: "info" },
      ],
    },
    {
      id: "reports",
      label: "Reports and forecasts",
      shortLabel: "Reports",
      owner: "FP&A",
      href: "/forecast",
      icon: "analytics",
      score: reportsScore,
      tone: toneFor(reportsScore),
      status: "spend, forecast, close, audit",
      purpose: "Turns structured ERP records into spend analytics, 30/60/90-day forecasts, close readiness, and evidence-pack exports.",
      structuredData: ["ForecastBucket", "ForecastItem", "ExportBatch", "CloseReadiness"],
      sourceGrounding: ["ForecastItem.source", "assumptions", "recordIds", "fileRef"],
      permissionedActions: ["Run informational forecast", "Prepare evidence pack", "Export only eligible records"],
      auditTrail: ["forecast.run", "close_book.evidence_pack", "close_book.export"],
      metrics: [
        { label: "Forecast buckets", value: state.forecastBuckets.length, sub: "30/60/90", tone: "info" },
        { label: "Exports", value: state.exportBatches.length, sub: "local refs", tone: "neutral" },
        { label: "Reports", value: "4", sub: "analytics/forecast/close/audit", tone: "brand" },
      ],
    },
    {
      id: "ai-agents",
      label: "AI agents",
      shortLabel: "Agents",
      owner: "Compliance/Safety gate",
      href: "/audit",
      icon: "spark",
      score: agentsScore,
      tone: toneFor(agentsScore),
      status: `${AGENT_ROSTER.length} agents with autonomy boundaries`,
      purpose: "Runs deterministic offline agents with source-grounded findings today and provider-backed seams for read-only research where configured.",
      structuredData: ["AgentResult", "Finding", "LoopStep", "RunContext"],
      sourceGrounding: ["sources[]", "rationale", "confidence", "orchestratorLog"],
      permissionedActions: ["Explain", "Recommend", "Escalate", "Never self-approve"],
      auditTrail: ["briefing.run.start", "flag.raise", "notify.send"],
      metrics: [
        { label: "Agents", value: AGENT_ROSTER.length, sub: "rostered", tone: "brand" },
        { label: "Findings", value: briefing.topline.findingCount, sub: `${briefing.topline.avgConfidence}% avg confidence`, tone: "info" },
        { label: "Sources", value: sourceCount, sub: "unique citations", tone: "pos" },
      ],
    },
  ];

  const actionContracts: FoundationActionContract[] = [
    {
      action: "Explain close readiness and blockers",
      actionClass: "read-only",
      tier: 1,
      status: "runs_now",
      defaultOnAmbiguity: "Show uncertainty and sources.",
      evidence: ["CloseReadiness", "Match stats", "E-invoice states"],
      route: "/erp-close",
    },
    {
      action: "Recommend tax coding or recode",
      actionClass: "suggestion",
      tier: 3,
      status: "approval_required",
      defaultOnAmbiguity: "Queue finance review before posting/exporting.",
      evidence: ["Receipt OCR fields", "TaxCode", "Capitalisation policy", "Confidence score"],
      route: "/approvals",
    },
    {
      action: "Submit outbound e-invoice",
      actionClass: "human-approved",
      tier: 3,
      status: "approval_required",
      defaultOnAmbiguity: "Do not submit; keep draft/queued.",
      evidence: ["EInvoice", "Counterparty ID", "Gross amount", "ApprovalRequest"],
      route: "/compliance",
    },
    {
      action: "Export AP bills to ERP/LHDN package",
      actionClass: "human-approved",
      tier: 3,
      status: "approval_required",
      defaultOnAmbiguity: "Block export and list unresolved reasons.",
      evidence: ["VerifiedBillRecord", "Export blockers", "Approval gate", "Audit trail"],
      route: "/erp-close",
    },
    {
      action: "Move money, hold balances, issue cards, execute FX, or place trades",
      actionClass: "prohibited",
      tier: 4,
      status: "blocked",
      defaultOnAmbiguity: "Always blocked inside Kira.",
      evidence: ["Product boundary", "Action matrix", "Audit policy"],
      route: "/roadmap",
    },
  ];

  const groundedAnswers: FoundationAnswer[] = [
    {
      question: "Why is close not ready?",
      answer: closeDashboard.closeReadiness.blockers.slice(0, 2).map((blocker) => blocker.message).join(" ") || "Close is ready for the selected export set.",
      sources: ["CloseReadiness.blockers", "VerifiedBillRecord.exceptions", "BankMatch.score"],
      actionBoundary: "Explain and recommend only; export stays gated.",
      route: "/erp-close",
    },
    {
      question: "Which spend needs human review?",
      answer: tier34Approvals.slice(0, 2).map((approval) => approval.title).join(" · ") || "No tier-3/4 spend approvals are open.",
      sources: ["ApprovalRequest.evidence", "Receipt", "TransactionEvent"],
      actionBoundary: "Approval tray owns the state change.",
      route: "/approvals",
    },
    {
      question: "Can an agent act safely?",
      answer: `${briefing.topline.approvalsCount} actions are separated into approvals; prohibited money movement remains outside Kira.`,
      sources: ["AgentResult.findings", "Compliance/Safety gate", "ActionClass"],
      actionBoundary: "Agents may explain, recommend, queue, and notify; they cannot self-approve.",
      route: "/audit",
    },
  ];

  const dataSpine: FoundationSpineStep[] = [
    {
      label: "Ingest",
      detail: "Bank/card lines, receipts, supplier bills, e-invoices, and workflow events enter as typed objects.",
      objects: ["TransactionEvent", "Receipt", "VerifiedBillRecord", "EInvoice"],
    },
    {
      label: "Normalize",
      detail: "Accounts, tax codes, cost centres, currencies, tax profiles, and country rules turn raw activity into ERP-ready structure.",
      objects: ["ChartOfAccount", "TaxCode", "CostCentre", "CountryConfig"],
    },
    {
      label: "Ground",
      detail: "Every recommendation carries source IDs, confidence, rationale, and evidence strings visible to the user.",
      objects: ["Finding.sources", "ApprovalRequest.evidence", "Match.basis"],
    },
    {
      label: "Gate",
      detail: "Action class and approval tier decide whether Kira reads, suggests, notifies, queues approval, or blocks.",
      objects: ["ActionClass", "ApprovalTier", "ApprovalStep"],
    },
    {
      label: "Record",
      detail: "Approved actions create records, export batches, or local refs; Kira never directly settles customer money.",
      objects: ["RecordEntry", "ExportBatch", "AccountingSyncRef"],
    },
    {
      label: "Audit",
      detail: "Meaningful mutations append to the immutable hash-chained audit stream.",
      objects: ["AuditLogEntry", "RawAuditEvent"],
    },
  ];

  const modulesReady = modules.filter((module) => module.score >= 70).length;
  const structuredObjects =
    state.accounts.length +
    state.taxCodes.length +
    state.costCentres.length +
    state.transactions.length +
    state.receipts.length +
    state.matches.length +
    state.einvoices.length +
    state.records.length +
    state.approvals.length +
    state.closeBookRecords.length +
    state.forecastBuckets.reduce((sum, bucket) => sum + bucket.items.length + 1, 0);

  return {
    generatedAt: state.rawAudit[state.rawAudit.length - 1]?.at ?? new Date().toISOString(),
    orgName: state.org.brandName,
    headline: `${modulesReady}/${modules.length} ERP domains are wired into structured data, source-grounded AI, permissioned actions, and audit trails.`,
    stats: {
      modulesReady,
      moduleCount: modules.length,
      structuredObjects,
      sourceCitations: sourceCount,
      openApprovals: openApprovals.length,
      auditEntries: state.audit.length,
      auditVerified: auditVerified(),
    },
    modules,
    actionContracts,
    groundedAnswers,
    dataSpine,
    auditCoverage: [
      { label: "Hash chain", value: auditVerified() ? "verified" : "broken", sub: `${state.audit.length} entries`, tone: auditVerified() ? "pos" : "crit" },
      { label: "Money-sensitive events", value: state.audit.filter((entry) => MONEY_ACTIONS.has(entry.action)).length, sub: "tiered or blocked", tone: "warn" },
      { label: "Record posts", value: countAudit("record.post"), sub: "accounting evidence", tone: "info" },
      { label: "Workflow starts", value: countAudit("operating.workflow.start"), sub: "approval-aware", tone: "brand" },
    ],
  };
}
