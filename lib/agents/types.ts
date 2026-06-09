// Types for the agentic run layer. A "run" is one pass of the daily orchestration:
// Observe → Analyze → Plan → Act → Verify → Summarize → Escalate-if-needed.

import type {
  ActionClass,
  ApprovalTier,
  ConfidenceBand,
  Organization,
  ProductPhase,
  RunMemory,
  User,
  UserPreference,
} from "../types";

export type AgentName =
  | "Orchestrator"
  | "User Preference"
  | "Budget/Spend"
  | "Market Research"
  | "Portfolio Analysis"
  | "News Relevance"
  | "Risk Monitoring"
  | "Compliance/Safety"
  | "Notification"
  | "Human Approval"
  | "Booking"
  | "Vendor Intelligence"
  | "Cashflow Forecast";

export type Phase = 1 | 2 | 3;

export type LoopPhase =
  | "observe"
  | "analyze"
  | "plan"
  | "act"
  | "verify"
  | "summarize"
  | "escalate";

export interface LoopStep {
  phase: LoopPhase;
  message: string;
}

export type FindingKind =
  | "insight"
  | "anomaly"
  | "risk"
  | "news"
  | "market"
  | "portfolio"
  | "compliance"
  | "approval";

export interface Finding {
  id: string;
  agent: AgentName;
  kind: FindingKind;
  title: string;
  detail: string;
  confidence: number; // 0-100
  band: ConfidenceBand;
  sources: string[];
  rationale: string;
  actionClass: ActionClass;
  tier: ApprovalTier;
  escalate: boolean;
  moneyTouching: boolean;
  /** Market/portfolio/news content is labelled educational/informational. */
  informational: boolean;
  disclaimer?: string;
  /** "unable to verify" marker for shaky data. */
  unverified?: boolean;
  relatedId?: string;
  relatedHref?: string;
}

export interface AgentResult {
  agent: AgentName;
  phase: Phase;
  status: "ok" | "degraded" | "failed";
  findings: Finding[];
  steps: LoopStep[];
  durationMs: number;
  note?: string;
}

export interface RunContext {
  runId: string;
  at: string;
  productPhase: ProductPhase;
  user: User;
  org: Organization;
  prefs: UserPreference;
  memory: RunMemory;
  automationThreshold: number;
}

export interface BriefingSection {
  key: string;
  title: string;
  subtitle?: string;
  findings: Finding[];
}

export interface BriefingRun {
  runId: string;
  startedAt: string;
  durationMs: number;
  context: {
    userName: string;
    orgName: string;
    locale: string;
    automationThreshold: number;
    riskTolerance: string;
    productPhase: ProductPhase;
  };
  agentResults: AgentResult[];
  sections: BriefingSection[];
  approvals: Finding[];
  escalations: Finding[];
  topline: {
    headline: string;
    findingCount: number;
    avgConfidence: number;
    approvalsCount: number;
    escalationsCount: number;
  };
  orchestratorLog: string[];
  notificationNote: string;
}
