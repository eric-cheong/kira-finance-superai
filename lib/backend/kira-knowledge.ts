import { providerStatus } from "./provider-config";
import { state } from "./state";
import { money } from "@/lib/format";
import type { ActionClass, ApprovalTier } from "@/lib/types";

export type KnowledgeEntry = {
  id: string;
  title: string;
  route: string;
  category: "workflow" | "policy" | "data" | "ai" | "settings";
  summary: string;
  facts: string[];
  keywords: string[];
};

export type AssistantNextItem = {
  id: string;
  kind: "approval" | "receipt_review" | "booking_quote";
  label: string;
  href: string;
  priority: number;
  actionClass: ActionClass;
  approvalTier: ApprovalTier;
  reason: string;
  detail: string;
  amount?: string;
};

export const KIRA_KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    id: "daily-briefing",
    title: "Daily Briefing",
    route: "/",
    category: "ai",
    summary: "Runs the deterministic agent loop and shows the current plan, tool activity, confidence, and approval queue.",
    facts: [
      "Loop: Observe, Analyze, Plan, Act, Verify, Summarize, Escalate.",
      "Outputs are informational unless an approval route is explicitly used.",
      "Findings expose sources, confidence, rationale, and escalation state.",
    ],
    keywords: ["briefing", "today", "summary", "agent", "run", "trace", "approval"],
  },
  {
    id: "bookings",
    title: "Bookings Research",
    route: "/bookings",
    category: "workflow",
    summary: "Researches trip/procurement options with OpenAI Agents and Exa, then creates quote records for explicit approval.",
    facts: [
      "Kira can research options and create quote records.",
      "Kira cannot reserve inventory, charge a card, contact a supplier, cancel, or place a booking by itself.",
      "Approval happens through /api/bookings/:quoteId/decision with confirm=true.",
    ],
    keywords: ["flight", "hotel", "trip", "booking", "quote", "reviews", "exa", "travel"],
  },
  {
    id: "transactions",
    title: "Transactions & Reconciliation",
    route: "/transactions",
    category: "data",
    summary: "Shows read-only transaction lines, receipt matching, duplicate risk, and local persistent table controls.",
    facts: [
      "Imported bank/card rows are read-only evidence, not a money ledger.",
      "Matches can be confirmed only through explicit match routes.",
      "Tables support search, filters, sorting, reset, and visible-count state.",
    ],
    keywords: ["transaction", "ledger", "match", "receipt", "duplicate", "reconcile"],
  },
  {
    id: "erp-close",
    title: "ERP Close",
    route: "/erp-close",
    category: "workflow",
    summary: "Close-book AP workspace for verified bills, supplier/bank reconciliation, blockers, and export evidence.",
    facts: [
      "Blocked records stay held until exceptions are resolved.",
      "Ready-bill export creates local evidence refs only; it does not submit to a live regulator or ERP.",
      "Bill approval requires explicit confirmation.",
    ],
    keywords: ["ap", "close", "erp", "bill", "invoice", "supplier", "export", "lhdn"],
  },
  {
    id: "capture",
    title: "Capture Inbox",
    route: "/capture",
    category: "workflow",
    summary: "OCR receipt and invoice capture with suggested account, tax code, cost centre, and review thresholds.",
    facts: [
      "Low-confidence capture stays in review.",
      "Posting creates local record-keeping evidence only.",
      "No full PANs or secrets are accepted.",
    ],
    keywords: ["capture", "ocr", "receipt", "invoice", "tax", "account", "cost centre"],
  },
  {
    id: "compliance",
    title: "E-invoicing Compliance",
    route: "/compliance",
    category: "policy",
    summary: "MyInvois and Peppol/InvoiceNow console with approval-gated submission requests and retained validation evidence.",
    facts: [
      "E-invoice submission is a tier-3 action requiring explicit approval.",
      "Kira stores UUIDs and validation responses as audit evidence.",
      "Kira is software, not a tax agent or taxpayer of record.",
    ],
    keywords: ["einvoice", "e-invoice", "myinvois", "peppol", "invoicenow", "tax", "lhdn", "iras"],
  },
  {
    id: "vendors",
    title: "Vendor Intelligence",
    route: "/vendors",
    category: "data",
    summary: "Vendor enrichment, risk notes, concentration cues, and supplier review metadata.",
    facts: [
      "Vendor enrichment is read-only or suggestion-only.",
      "Risk notes require human review before policy changes.",
      "Consumer review search can use Exa when configured.",
    ],
    keywords: ["vendor", "supplier", "risk", "reviews", "enrichment"],
  },
  {
    id: "policy-boundary",
    title: "Safety Boundary",
    route: "/roadmap",
    category: "policy",
    summary: "Kira orchestrates and records; it never settles, pays, issues e-money/cards, stores PAN, executes FX, or places trades.",
    facts: [
      "Money movement stays on licensed partner rails only.",
      "Tier-3 actions need explicit approval; tier-4 actions need mandatory review.",
      "Timeouts and ambiguity default to no action.",
    ],
    keywords: ["policy", "boundary", "approval", "money", "regulated", "card", "trade", "risk"],
  },
  {
    id: "settings",
    title: "Settings & Automation Controls",
    route: "/settings",
    category: "settings",
    summary: "Organisation, tax profile, connectors, RBAC, residency, and automation threshold controls.",
    facts: [
      "Automation threshold controls how much agents do before asking.",
      "Connectors simulate local status and do not store secrets.",
      "RBAC separates finance admin, approver, employee, and auditor roles.",
    ],
    keywords: ["settings", "connectors", "rbac", "team", "automation", "threshold"],
  },
];

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "can",
  "do",
  "for",
  "go",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "the",
  "to",
  "what",
  "where",
  "with",
]);

export function assistantKnowledge(query = "", limit = 5) {
  const clean = query.toLowerCase().trim();
  const terms = clean
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term));
  const scored = KIRA_KNOWLEDGE_BASE.map((entry) => {
    const haystack = [
      entry.title,
      entry.category,
      entry.summary,
      entry.route,
      ...entry.facts,
      ...entry.keywords,
    ].join(" ").toLowerCase();
    if (terms.length === 0) return { entry, score: 1 };
    const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
    return { entry, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .slice(0, limit)
    .map((item) => item.entry);

  return scored.length > 0 ? scored : KIRA_KNOWLEDGE_BASE.slice(0, limit);
}

function hasLiveBookingOption(options: { expiresAt?: string }[], nowMs: number) {
  return options.some((option) => !option.expiresAt || Date.parse(option.expiresAt) > nowMs);
}

export function assistantNextItems(limit = 5): AssistantNextItem[] {
  const nowMs = Date.now();
  const approvals = state.approvals
    .filter((item) => item.state === "open")
    .map((item): AssistantNextItem => ({
      id: item.id,
      kind: "approval",
      label: item.title,
      href: `/approvals?item=${encodeURIComponent(item.id)}#${encodeURIComponent(item.id)}`,
      priority: item.tier * 100 + (100 - item.confidence),
      actionClass: "human-approved",
      approvalTier: item.tier,
      reason: `It is an open tier-${item.tier} approval with ${item.confidence}% confidence, so Kira is blocked until a human decides.`,
      detail: item.subject,
      amount: item.amountMinor != null && item.currency ? money(item.amountMinor, item.currency) : undefined,
    }));

  const receipts = state.receipts
    .filter((item) => item.status === "needs_review")
    .map((item): AssistantNextItem => ({
      id: item.id,
      kind: "receipt_review",
      label: `${item.supplier} ${item.kind} needs review`,
      href: `/capture?item=${encodeURIComponent(item.id)}#${encodeURIComponent(item.id)}`,
      priority: 250 + (100 - item.ocrConfidence),
      actionClass: "suggestion",
      approvalTier: 2,
      reason: `Its OCR confidence is ${item.ocrConfidence}%, below the review threshold, so posting stays locked until coding is reviewed.`,
      detail: `${item.docNo ?? item.id} · ${item.docDate} · suggested ${item.suggestedAccount ?? "account"} / ${item.suggestedTaxCode ?? "tax code"}`,
      amount: money(item.totalMinor, item.currency),
    }));

  const quotes = state.bookingQuotes
    .filter((item) => item.status === "open")
    .filter((item) => hasLiveBookingOption(item.options, nowMs))
    .map((item): AssistantNextItem => {
      const liveOptions = item.options.filter((option) => !option.expiresAt || Date.parse(option.expiresAt) > nowMs);
      const cheapest = [...liveOptions].sort((a, b) => a.amountMinor - b.amountMinor)[0];
      return {
        id: item.id,
        kind: "booking_quote",
        label: item.description,
        href: `/bookings?item=${encodeURIComponent(item.id)}#${encodeURIComponent(item.id)}`,
        priority: 200 + item.options.length,
        actionClass: "human-approved",
        approvalTier: 3,
        reason: "It is an open booking quote with researched options, and no supplier reservation can happen until you inspect and approve one.",
        detail: cheapest ? `Cheapest live option: ${cheapest.label} from ${cheapest.supplier}` : `${item.options.length} researched options`,
        amount: cheapest ? money(cheapest.amountMinor, cheapest.currency) : undefined,
      };
    });

  return [...approvals, ...receipts, ...quotes]
    .sort((a, b) => b.priority - a.priority || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export function assistantWorkspaceContext() {
  const providers = providerStatus();
  const nowMs = Date.now();
  const nextItems = assistantNextItems(6);
  return {
    org: {
      name: state.org.legalName,
      country: state.org.country,
      taxModel: state.org.taxProfile.model,
      baseCurrency: state.org.taxProfile.baseCurrency,
    },
    counts: {
      openApprovals: state.approvals.filter((item) => item.state === "open").length,
      transactions: state.transactions.length,
      receiptsInReview: state.receipts.filter((item) => item.status === "needs_review").length,
      openBookingQuotes: state.bookingQuotes.filter((item) => item.status === "open" && hasLiveBookingOption(item.options, nowMs)).length,
      vendors: state.vendors.length,
      auditEntries: state.audit.length,
    },
    nextItems,
    recommendedNextItem: nextItems[0] ?? null,
    providers,
  };
}
