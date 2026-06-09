// The Orchestrator (run leader). Topology is hybrid: hierarchical (it leads) +
// event-driven (the scheduler triggers this run) with parallel fan-out across the
// independent analyst agents, a Compliance/Safety gate before anything reaches the
// user, then Notification. It plans, shares one run-context, merges, ranks, and
// splits money-touching items into an Approvals tray. It never approves itself.

import * as db from "../data/store";
import type { RunMemory } from "../types";
import {
  budgetSpendAgent,
  complianceGate,
  marketResearchAgent,
  newsRelevanceAgent,
  notificationAgent,
  portfolioAnalysisAgent,
  riskMonitoringAgent,
  userPreferenceAgent,
  META,
} from "./agents";
import type {
  AgentResult,
  BriefingRun,
  BriefingSection,
  Finding,
  FindingKind,
  LoopStep,
  RunContext,
} from "./types";

const KIND_WEIGHT: Record<FindingKind, number> = {
  anomaly: 1.2,
  approval: 1.2,
  risk: 1.15,
  compliance: 1.1,
  insight: 1.0,
  news: 0.9,
  portfolio: 0.9,
  market: 0.85,
};

function score(f: Finding): number {
  return f.confidence * KIND_WEIGHT[f.kind];
}

function buildContext(): RunContext {
  const memory: RunMemory = {
    lastRunAt: "2026-06-08T07:30:00+08:00",
    recentThemes: ["e-invoicing", "Bangsar launch spend", "FX on imported services"],
    acknowledgedAlertIds: [],
  };
  return {
    runId: "run_20260609_0730",
    at: db.NOW,
    user: db.currentUser(),
    org: db.ORG,
    prefs: db.PREFERENCES,
    memory,
    automationThreshold: db.PREFERENCES.automationThreshold,
  };
}

export function runDailyBriefing(): BriefingRun {
  const ctx = buildContext();
  const orchestratorLog: string[] = [];

  orchestratorLog.push(`Run ${ctx.runId} started at ${ctx.at} for ${ctx.user.name}.`);
  orchestratorLog.push("Plan: Preference → parallel(Budget, Risk, News, Market, Portfolio) → Compliance gate → merge → Notification.");

  // 1) Preference resolves the shared context.
  const pref = userPreferenceAgent(ctx);

  // 2) Independent analysts (modelled as a parallel fan-out).
  const budget = budgetSpendAgent(ctx);
  const risk = riskMonitoringAgent(ctx);
  const news = newsRelevanceAgent(ctx);
  const market = marketResearchAgent(ctx);
  const portfolio = portfolioAnalysisAgent(ctx);
  orchestratorLog.push(`Collected findings: Budget ${budget.findings.length}, Risk ${risk.findings.length}, News ${news.findings.length}, Market ${market.findings.length}, Portfolio ${portfolio.findings.length}.`);

  const incoming: Finding[] = [
    ...budget.findings,
    ...risk.findings,
    ...news.findings,
    ...market.findings,
    ...portfolio.findings,
  ];

  // 3) Compliance/Safety gate (always before composing output).
  const gate = complianceGate(incoming, ctx);
  const all = gate.transformed;
  orchestratorLog.push(`Compliance gate produced ${all.length} compliant findings (incl. ${gate.result.findings.length} gate-raised approvals).`);

  // 4) Merge + rank, then split approvals from the read-only briefing.
  const ranked = [...all].sort((a, b) => score(b) - score(a));
  const approvals = ranked
    .filter((f) => f.tier >= 3)
    .sort((a, b) => b.tier - a.tier || score(b) - score(a));
  const sectionable = ranked.filter((f) => f.tier <= 2);
  const escalations = ranked.filter((f) => f.escalate);

  const sectionDefs: { key: string; title: string; subtitle: string; kinds: FindingKind[] }[] = [
    { key: "spend", title: "Spend & coding", subtitle: "What moved through the books overnight", kinds: ["insight", "anomaly"] },
    { key: "risk", title: "Risks & alerts", subtitle: "Flagged, scored, none acted on autonomously", kinds: ["risk"] },
    { key: "markets", title: "Markets & portfolio", subtitle: "Informational — not financial advice", kinds: ["market", "portfolio"] },
    { key: "news", title: "News that matters", subtitle: "Ranked by relevance to your business", kinds: ["news"] },
  ];
  const sections: BriefingSection[] = sectionDefs
    .map((d) => ({
      key: d.key,
      title: d.title,
      subtitle: d.subtitle,
      findings: sectionable.filter((f) => d.kinds.includes(f.kind)),
    }))
    .filter((s) => s.findings.length > 0);

  // 5) Notify.
  const notif = notificationAgent(ctx, approvals.length);

  // Synthesise an Orchestrator agent-result for the auditor view.
  const orchSteps: LoopStep[] = [
    { phase: "observe", message: "Receive run-context + scheduler trigger." },
    { phase: "plan", message: "Assign agents; fan out the independent analysts in parallel." },
    { phase: "act", message: `Merge ${all.length} findings; dedupe; rank by relevance × confidence.` },
    { phase: "verify", message: `Split ${approvals.length} money-touching items into Approvals; ${escalations.length} escalations.` },
    { phase: "summarize", message: "Compose single briefing; hand to Notification." },
  ];
  const orchestrator: AgentResult = {
    agent: "Orchestrator", phase: 1, status: "ok", findings: [], steps: orchSteps, durationMs: 210,
  };

  const m = db.matchStats();
  const cr = db.closeReadiness();
  const headline = `${m.total} transactions imported · ${m.matched} auto-matched (${m.matchedPct}%) · ${approvals.length} need approval · close-readiness ${cr.score}%.`;

  const agentResults: AgentResult[] = [
    orchestrator, pref, budget, risk, news, market, portfolio, gate.result, notif.result,
  ];

  return {
    runId: ctx.runId,
    startedAt: ctx.at,
    durationMs: agentResults.reduce((s, a) => s + a.durationMs, 0),
    context: {
      userName: ctx.user.name,
      orgName: ctx.org.brandName,
      locale: ctx.prefs.locale,
      automationThreshold: ctx.automationThreshold,
      riskTolerance: ctx.prefs.riskTolerance,
    },
    agentResults,
    sections,
    approvals,
    escalations,
    topline: {
      headline,
      findingCount: all.length,
      avgConfidence: META.avgConfidence(all),
      approvalsCount: approvals.length,
      escalationsCount: escalations.length,
    },
    orchestratorLog,
    notificationNote: notif.note,
  };
}
