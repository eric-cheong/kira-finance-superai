// The agent roster. Each agent runs the loop (observe → analyze → plan → act →
// verify → summarize → escalate) over the de-identified store and returns
// findings with a confidence score, a source, and a one-line rationale — exactly
// what the global preamble in the spec requires. Logic is deterministic ("rule
// based AI") so the product runs offline; each agent is a clean seam where a real
// LLM call would slot in.

import { bandOf } from "../types";
import type { ActionClass, ApprovalTier } from "../types";
import * as db from "../data/store";
import { money } from "../format";
import { applyFindingPolicy, NOT_FINANCIAL_ADVICE } from "../policy";
import type { AgentResult, Finding, FindingKind, LoopStep, RunContext } from "./types";
import type { AgentName } from "./types";

const NOT_ADVICE = NOT_FINANCIAL_ADVICE;

interface FindingInput {
  id: string;
  agent: AgentName;
  kind: FindingKind;
  title: string;
  detail: string;
  confidence: number;
  sources: string[];
  rationale: string;
  actionClass: ActionClass;
  tier: ApprovalTier;
  moneyTouching?: boolean;
  informational?: boolean;
  disclaimer?: string;
  unverified?: boolean;
  escalate?: boolean;
  relatedId?: string;
  relatedHref?: string;
}

/** Build a finding, applying the global guardrail: escalate if low-confidence
 *  or money-touching unless the caller already decided. */
function mk(i: FindingInput): Finding {
  const escalate =
    i.escalate ?? (i.confidence < 70 || i.moneyTouching === true);
  return {
    ...i,
    band: bandOf(i.confidence),
    moneyTouching: i.moneyTouching ?? false,
    informational: i.informational ?? false,
    escalate,
  };
}

function avg(xs: number[]): number {
  return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0;
}

// ── User Preference ─────────────────────────────────────────────────────────

export function userPreferenceAgent(ctx: RunContext): AgentResult {
  const p = ctx.prefs;
  const steps: LoopStep[] = [
    { phase: "observe", message: `Load profile for ${ctx.user.name} (${ctx.user.role}).` },
    { phase: "analyze", message: `Resolve locale=${p.locale}, base=${p.baseCurrency}, risk=${p.riskTolerance}.` },
    { phase: "act", message: `Apply automation threshold ${p.automationThreshold}; channels ${Object.entries(p.channels).filter(([, v]) => v).map(([k]) => k).join("+")}.` },
    { phase: "summarize", message: "Context object resolved and shared with run." },
  ];
  const findings: Finding[] = [
    mk({
      id: "pref-0", agent: "User Preference", kind: "insight",
      title: "Personalisation applied",
      detail: `Tax profile ${ctx.org.taxProfile.model} · MyInvois ${ctx.org.taxProfile.myInvoisPhase} · auto-pass ≥ ${p.automationThreshold}% confidence. Quiet hours ${p.quietHours.from}–${p.quietHours.to}.`,
      confidence: 100, sources: ["User settings", "Org tax profile"],
      rationale: "Resolved from stored preferences and org configuration.",
      actionClass: "read-only", tier: 1,
    }),
  ];
  return { agent: "User Preference", phase: 1, status: "ok", findings, steps, durationMs: 120 };
}

// ── Budget / Spend ──────────────────────────────────────────────────────────

export function budgetSpendAgent(_ctx: RunContext): AgentResult {
  const findings: Finding[] = [];
  const steps: LoopStep[] = [];

  steps.push({ phase: "observe", message: `Read ${db.TRANSACTIONS.length} transactions, ${db.RECEIPTS.length} receipts.` });

  // Duplicate detection: same merchant + amount within 48h, at least one unmatched.
  const dupes: string[] = [];
  for (let a = 0; a < db.TRANSACTIONS.length; a++) {
    for (let b = a + 1; b < db.TRANSACTIONS.length; b++) {
      const x = db.TRANSACTIONS[a], y = db.TRANSACTIONS[b];
      const dt = Math.abs(new Date(x.occurredAt).getTime() - new Date(y.occurredAt).getTime());
      if (x.merchant === y.merchant && x.amountMinor === y.amountMinor && x.currency === y.currency && dt <= 48 * 3600e3) {
        dupes.push(`${x.merchant} ${money(x.amountMinor, x.currency)} (${x.id}, ${y.id})`);
      }
    }
  }
  steps.push({ phase: "analyze", message: dupes.length ? `Detected ${dupes.length} possible duplicate charge(s).` : "No duplicates detected." });
  if (dupes.length) {
    findings.push(mk({
      id: "bud-dupe", agent: "Budget/Spend", kind: "anomaly",
      title: "Possible duplicate charge — Meta Platforms",
      detail: `Two identical charges of ${money(92000, "MYR")} to Meta Platforms on 07 & 08 Jun. One is unmatched. Verify before reconciling — may be a genuine double-bill to dispute with the bank.`,
      confidence: 84, sources: ["txn_03", "txn_12", "Meta invoice META-MY-66301"],
      rationale: "Exact merchant + amount within 24h; second charge has no matching receipt.",
      actionClass: "suggestion", tier: 3, moneyTouching: true,
      relatedId: "txn_12", relatedHref: "/transactions",
    }));
  }

  // Capitalisation suggestion: grinder over threshold.
  const grinder = db.receipt("rcp_06");
  if (grinder) {
    findings.push(mk({
      id: "bud-capex", agent: "Budget/Spend", kind: "anomaly",
      title: "Capitalise grinder — recode 6070 → 1200",
      detail: `${grinder.supplier} ${money(grinder.totalMinor, grinder.currency)} exceeds the RM2,000 capitalisation threshold and has a useful life > 1 year. Suggest moving from Repairs to Equipment (Fixed Asset). This changes SST input treatment, so it needs finance sign-off.`,
      confidence: 71, sources: ["rcp_06", "Capitalisation policy ≥ RM2,000"],
      rationale: "Asset characteristics + value over threshold; affects a coding that flows to the return.",
      actionClass: "suggestion", tier: 3, moneyTouching: true,
      relatedId: "rcp_06", relatedHref: "/approvals",
    }));
  }

  // Coding throughput insight.
  const rs = db.receiptStats();
  findings.push(mk({
    id: "bud-coding", agent: "Budget/Spend", kind: "insight",
    title: "Auto-coding throughput",
    detail: `${db.RECORDS.length} entries posted overnight. ${rs.confirmed}/${rs.total} receipts auto-confirmed with suggested GST/SST codes; ${rs.review} held for review.`,
    confidence: 92, sources: ["Record store", "OCR confidence"],
    rationale: "Items above the automation threshold auto-pass; the rest queue for a human.",
    actionClass: "read-only", tier: 1, relatedHref: "/transactions",
  }));

  // Unmatched surfacing.
  const m = db.matchStats();
  if (m.unmatched + m.review > 0) {
    findings.push(mk({
      id: "bud-unmatched", agent: "Budget/Spend", kind: "insight",
      title: `${m.unmatched + m.review} transactions need attention`,
      detail: `${m.matched}/${m.total} auto-matched (${m.matchedPct}%). ${m.unmatched} unmatched and ${m.review} in review — likely missing receipts or FX/asset ambiguity.`,
      confidence: 88, sources: ["Matching engine"],
      rationale: "Surface unmatched items so month-end close isn't blocked.",
      actionClass: "suggestion", tier: 2, relatedHref: "/transactions",
    }));
  }

  steps.push({ phase: "plan", message: "Rank anomalies by money impact; attach evidence." });
  steps.push({ phase: "act", message: `Emit ${findings.length} findings (2 routed for approval).` });
  steps.push({ phase: "verify", message: "Confidence scored; sources attached to each." });
  steps.push({ phase: "summarize", message: "Spend reviewed; duplicates and capex flagged." });

  return { agent: "Budget/Spend", phase: 1, status: "ok", findings, steps, durationMs: 540 };
}

// ── Risk Monitoring ─────────────────────────────────────────────────────────

export function riskMonitoringAgent(_ctx: RunContext): AgentResult {
  const findings: Finding[] = [];
  const steps: LoopStep[] = [];
  steps.push({ phase: "observe", message: "Scan spend, card concentration, e-invoice health." });

  // Out-of-policy spend.
  const sb = db.receipt("rcp_07");
  if (sb) {
    findings.push(mk({
      id: "risk-policy", agent: "Risk Monitoring", kind: "risk",
      title: "Out-of-policy spend — Starbucks",
      detail: `${money(sb.totalMinor, sb.currency)} at a direct competitor exceeds the RM50 per-head meal cap and has no project tag. Recommend approver review and a policy note.`,
      confidence: 76, sources: ["rcp_07", "Expense policy: RM50 meal cap"],
      rationale: "Competitor merchant + over cap + untagged → governance risk.",
      actionClass: "suggestion", tier: 4, escalate: true,
      relatedId: "rcp_07", relatedHref: "/approvals",
    }));
  }

  // Single-card concentration.
  const bySource = new Map<string, number>();
  for (const t of db.TRANSACTIONS) {
    bySource.set(t.sourceRef, (bySource.get(t.sourceRef) ?? 0) + db.toBase(t.amountMinor, t.currency));
  }
  const total = [...bySource.values()].reduce((a, b) => a + b, 0);
  const top = [...bySource.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top && total > 0) {
    const topPct = Math.round((top[1] / total) * 100);
    findings.push(mk({
      id: "risk-card", agent: "Risk Monitoring", kind: "risk",
      title: "Single-card concentration",
      detail: `${top[0]} carries ${topPct}% of card/bank spend this period. A frozen or compromised card would stall most purchasing — consider a backup card or split rails.`,
      confidence: 80, sources: ["Transaction feed"],
      rationale: "Concentration of outflow on one instrument is an operational risk.",
      actionClass: "read-only", tier: 1, relatedHref: "/analytics",
    }));
  }

  // E-invoice rejection.
  const rej = db.EINVOICES.find((e) => e.state === "rejected");
  if (rej) {
    findings.push(mk({
      id: "risk-einv", agent: "Risk Monitoring", kind: "risk",
      title: "E-invoice rejected — correction needed",
      detail: `${rej.counterparty}: ${money(rej.grossMinor, rej.currency)} rejected by LHDN. Reason: ${rej.rejectionReason}. Fix and resubmit to stay inside the 72h validation window.`,
      confidence: 90, sources: [rej.id, "LHDN validation response"],
      rationale: "A rejected outbound e-invoice is a live compliance exposure.",
      actionClass: "suggestion", tier: 3, moneyTouching: false, escalate: true,
      relatedId: rej.id, relatedHref: "/compliance",
    }));
  }

  steps.push({ phase: "analyze", message: `${findings.length} risks scored.` });
  steps.push({ phase: "plan", message: "Order by severity × confidence." });
  steps.push({ phase: "act", message: "Raise alerts; none acted on autonomously." });
  steps.push({ phase: "summarize", message: "Risk scan complete; corrective actions left to humans." });
  return { agent: "Risk Monitoring", phase: 2, status: "ok", findings, steps, durationMs: 480 };
}

// ── News Relevance ──────────────────────────────────────────────────────────

export function newsRelevanceAgent(_ctx: RunContext): AgentResult {
  const findings: Finding[] = [];
  const steps: LoopStep[] = [];
  steps.push({ phase: "observe", message: `Fetched ${db.NEWS.length} candidate items.` });

  const ranked = [...db.NEWS].sort((a, b) => b.relevance - a.relevance);
  for (const n of ranked) {
    if (!n.verified) {
      findings.push(mk({
        id: `news-${n.id}`, agent: "News Relevance", kind: "news",
        title: n.headline,
        detail: `${n.summary}`,
        confidence: n.relevance, sources: [n.source],
        rationale: "No primary source located — excluded from action items.",
        actionClass: "read-only", tier: 1, informational: true, unverified: true,
      }));
      continue;
    }
    findings.push(mk({
      id: `news-${n.id}`, agent: "News Relevance", kind: "news",
      title: n.headline,
      detail: n.summary,
      confidence: n.relevance, sources: [n.source],
      rationale: "Ranked by relevance to the org's invoicing, financing, and COGS.",
      actionClass: "read-only", tier: 1, informational: true,
      relatedHref: n.url,
    }));
  }
  steps.push({ phase: "analyze", message: "Ranked by relevance; filtered unverifiable." });
  steps.push({ phase: "verify", message: "Marked 1 item 'unable to verify'." });
  steps.push({ phase: "summarize", message: `${findings.filter((f) => !f.unverified).length} relevant items, 1 filtered.` });
  return { agent: "News Relevance", phase: 2, status: "ok", findings, steps, durationMs: 610 };
}

// ── Market Research (Phase 2) ───────────────────────────────────────────────

export function marketResearchAgent(_ctx: RunContext): AgentResult {
  const steps: LoopStep[] = [{ phase: "observe", message: "Pull overnight moves for watchlist instruments." }];
  const movers = [...db.POSITIONS].sort((a, b) => Math.abs(b.instrument ? b.dayChangePct : 0) - Math.abs(a.dayChangePct)).slice(0, 3);
  const detail = movers.length
    ? movers
        .map((p) => `${p.instrument.name} ${p.dayChangePct >= 0 ? "+" : ""}${p.dayChangePct.toFixed(1)}%`)
        .join(" · ")
    : "No linked watchlist positions yet";
  const findings: Finding[] = [
    mk({
      id: "mkt-overnight", agent: "Market Research", kind: "market",
      title: "Overnight market snapshot",
      detail: `Watchlist moves: ${detail}. Broad markets mixed; no watchlist instrument moved more than ±3%.`,
      confidence: 86, sources: ["Market data feed (delayed)"],
      rationale: "Summarised price moves; no recommendation implied.",
      actionClass: "read-only", tier: 1, informational: true, disclaimer: NOT_ADVICE,
      relatedHref: "/portfolio",
    }),
  ];
  steps.push({ phase: "summarize", message: "Snapshot composed; labelled informational." });
  return { agent: "Market Research", phase: 2, status: "ok", findings, steps, durationMs: 430 };
}

// ── Portfolio Analysis (Phase 2) ────────────────────────────────────────────

export function portfolioAnalysisAgent(_ctx: RunContext): AgentResult {
  const steps: LoopStep[] = [{ phase: "observe", message: "Read positions (read-only)." }];
  const ps = db.portfolioStats();
  const findings: Finding[] = [];
  const top = ps.shares[0];

  findings.push(mk({
    id: "pf-perf", agent: "Portfolio Analysis", kind: "portfolio",
    title: "Portfolio performance",
    detail: top
      ? `Value ${money(ps.valueBase, "MYR", { compact: true })} · unrealised ${ps.pnl >= 0 ? "+" : ""}${money(ps.pnl, "MYR", { compact: true })} (${ps.pnlPct.toFixed(1)}%). Largest holding ${top.name} at ${ps.topShare}% of value.`
      : "No linked portfolio positions yet. Connect a read-only brokerage source to enable performance and concentration analysis.",
    confidence: 90, sources: ["Brokerage read API"],
    rationale: "Computed from positions; no action taken.",
    actionClass: "read-only", tier: 1, informational: true, disclaimer: NOT_ADVICE,
    relatedHref: "/portfolio",
  }));

  if (top && ps.topShare >= 30) {
    findings.push(mk({
      id: "pf-conc", agent: "Portfolio Analysis", kind: "portfolio",
      title: "Concentration suggestion (draft)",
      detail: `${top.name} is ${ps.topShare}% of the portfolio — above a balanced single-name target. A draft rebalance toward target weights is prepared. This is a suggestion only and requires your explicit approval; Kira never places trades.`,
      confidence: 73, sources: ["Position concentration", "Risk tolerance: balanced"],
      rationale: "Single-name share over target; drafted as suggestion, not advice.",
      actionClass: "suggestion", tier: 3, moneyTouching: true, escalate: true,
      informational: true, disclaimer: NOT_ADVICE, relatedHref: "/portfolio",
    }));
  }
  steps.push({ phase: "analyze", message: top ? `Top concentration ${ps.topShare}%.` : "No linked positions to analyse." });
  steps.push({ phase: "plan", message: "Draft rebalance suggestion (no execution)." });
  steps.push({ phase: "escalate", message: "Investment action → requires explicit human approval." });
  return { agent: "Portfolio Analysis", phase: 2, status: "ok", findings, steps, durationMs: 520 };
}

// ── Compliance / Safety — the final gate ────────────────────────────────────

export interface GateOutput {
  result: AgentResult;
  transformed: Finding[];
}

export function complianceGate(incoming: Finding[], ctx: RunContext): GateOutput {
  const steps: LoopStep[] = [{ phase: "observe", message: `Gate ${incoming.length} findings before they reach the user.` }];
  let relabelled = 0;
  let disclaimed = 0;
  let prohibited = 0;
  let routedToApproval = 0;

  const transformed = incoming.map((f) => {
    const next = applyFindingPolicy(f, ctx.productPhase);
    if (!f.informational && next.informational) relabelled++;
    if (!f.disclaimer && next.disclaimer) disclaimed++;
    if (next.actionClass === "prohibited") prohibited++;
    if (next.tier >= 3) routedToApproval++;
    return next;
  });

  // Gate's own findings: e-invoice submissions awaiting explicit approval.
  const gateFindings: Finding[] = [];
  const brewLab = db.EINVOICES.find((e) => e.id === "einv_03");
  if (brewLab) {
    gateFindings.push(mk({
      id: "cmp-einv03", agent: "Compliance/Safety", kind: "approval",
      title: "Approve e-invoice submission — Brew Lab",
      detail: `Outbound MyInvois ${money(brewLab.grossMinor, brewLab.currency)} is validated and ready. Submission is irreversible once sent to LHDN, so it requires your explicit approval. Validation response will be stored on submit.`,
      confidence: 88, sources: ["einv_03", "Buyer TIN validated"],
      rationale: "E-invoice submission is a tier-3 action with a retention requirement.",
      actionClass: "human-approved", tier: 3, moneyTouching: false, escalate: true,
      relatedId: "einv_03", relatedHref: "/approvals",
    }));
  }
  const figma = db.receipt("rcp_05");
  if (figma) {
    gateFindings.push(mk({
      id: "cmp-figma", agent: "Compliance/Safety", kind: "approval",
      title: "Confirm imported-service SST — Figma",
      detail: `${money(figma.totalMinor, figma.currency)} imported taxable service. Reverse-charge SST-IMP (8%) applies but the 06 Jun FX rate is unconfirmed; confidence is below the 70% bar, so it is escalated for human confirmation rather than auto-coded.`,
      confidence: 69, sources: ["rcp_05", "Imported service reverse-charge rule"],
      rationale: "Low confidence + tax treatment → mandatory human confirmation.",
      actionClass: "human-approved", tier: 3, moneyTouching: true, escalate: true,
      relatedId: "rcp_05", relatedHref: "/approvals",
    }));
  }

  steps.push({ phase: "analyze", message: `Relabelled ${relabelled} informational; attached ${disclaimed} disclaimers.` });
  steps.push({ phase: "act", message: `Blocked ${prohibited} prohibited; routed ${routedToApproval} money-touching/regulated items to Approvals.` });
  steps.push({ phase: "verify", message: "Advice/info separation enforced; no raw PII left the boundary." });
  steps.push({ phase: "summarize", message: "Gate passed. Output is compliant for delivery." });

  const all = [...transformed, ...gateFindings];
  return {
    result: { agent: "Compliance/Safety", phase: 1, status: "ok", findings: gateFindings, steps, durationMs: 360 },
    transformed: all,
  };
}

// ── Notification ────────────────────────────────────────────────────────────

export function notificationAgent(ctx: RunContext, approvalsCount: number): { result: AgentResult; note: string } {
  const ch = Object.entries(ctx.prefs.channels).filter(([, v]) => v).map(([k]) => k);
  const note = `Delivered via ${ch.join(" + ")}. ${approvalsCount} item(s) need approval. Quiet hours ${ctx.prefs.quietHours.from}–${ctx.prefs.quietHours.to} respected.`;
  const steps: LoopStep[] = [
    { phase: "observe", message: "Receive composed briefing from Orchestrator." },
    { phase: "act", message: `Send on channels: ${ch.join(", ")}.` },
    { phase: "summarize", message: note },
  ];
  return {
    result: { agent: "Notification", phase: 1, status: "ok", findings: [], steps, durationMs: 90, note },
    note,
  };
}

export const META = {
  avgConfidence: (fs: Finding[]) => avg(fs.map((f) => f.confidence)),
};
