export * from "./types";
export * from "./agents";
export { runDailyBriefing } from "./orchestrator";

// Static roster metadata for the architecture / settings surfaces.
import type { AgentName, Phase } from "./types";

export interface AgentSpec {
  name: AgentName;
  phase: Phase;
  job: string;
  autonomous: string;
  neverWithoutHuman: string;
}

export const AGENT_ROSTER: AgentSpec[] = [
  { name: "Orchestrator", phase: 1, job: "Plan, delegate, merge, escalate", autonomous: "Sequence agents, dedupe, compose briefing", neverWithoutHuman: "Approve any action; bypass the Compliance gate" },
  { name: "User Preference", phase: 1, job: "Load profile, thresholds, locale", autonomous: "Read prefs, apply settings", neverWithoutHuman: "Change risk tolerance silently" },
  { name: "Budget/Spend", phase: 1, job: "Categorise spend, detect anomalies, tax coding", autonomous: "Classify, suggest GST/SST code, flag anomalies", neverWithoutHuman: "Move money; change a code that affects a filed return" },
  { name: "Compliance/Safety", phase: 1, job: "Gate every output before delivery", autonomous: "Block, relabel, attach disclaimers", neverWithoutHuman: "Approve a money action" },
  { name: "Notification", phase: 1, job: "Deliver the briefing & alerts", autonomous: "Send per channel prefs", neverWithoutHuman: "Change notification policy without soft approval" },
  { name: "Human Approval", phase: 1, job: "Collect explicit sign-off (tier 3/4)", autonomous: "Render an approval request + context", neverWithoutHuman: "Proceed on timeout (default = no-action)" },
  { name: "Risk Monitoring", phase: 2, job: "Spend, cash, e-invoice & concentration risk", autonomous: "Flag + score risks", neverWithoutHuman: "Take corrective action" },
  { name: "News Relevance", phase: 2, job: "Pull + rank relevant news", autonomous: "Fetch, filter, summarise with sources", neverWithoutHuman: "Present unverified claims as fact" },
  { name: "Market Research", phase: 2, job: "Overnight market & watchlist moves", autonomous: "Fetch + summarise prices", neverWithoutHuman: "Recommend a trade as advice" },
  { name: "Portfolio Analysis", phase: 2, job: "Holdings, performance, concentration", autonomous: "Read positions, draft rebalance suggestion", neverWithoutHuman: "Place or rebalance trades" },
  { name: "Vendor Intelligence", phase: 2, job: "Supplier risk, price benchmarking, alternatives", autonomous: "Enrich vendor data, flag risks, surface price signals", neverWithoutHuman: "Change vendor, cancel contract, move spend" },
  { name: "Cashflow Forecast", phase: 1, job: "30/60/90-day projection, committed vs pending", autonomous: "Build forecast from feed + recurring patterns", neverWithoutHuman: "Execute any disbursement or payment" },
];
