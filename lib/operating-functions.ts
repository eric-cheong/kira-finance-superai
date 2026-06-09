export type OperatingFunctionId =
  | "accounts-receivable"
  | "finance-fpa"
  | "sales"
  | "lead-generation"
  | "customer-service"
  | "customer-onboarding"
  | "operations";

export interface OperatingFunction {
  id: OperatingFunctionId;
  function: string;
  shortName: string;
  financialImpact: string;
  impactMetric: string;
  detects: string[];
  runs: string[];
  inputs: string[];
  signalsDetected: string[];
  benchmarksUsed: string[];
  recommendedActions: string[];
  workflowsAvailable: string[];
  escalationRules: string[];
  auditTrail: string[];
  workflowLogic: string[];
  riskCount: number;
  benchmarkGap: string;
  impactEstimate: string;
  workflowStatus: "running" | "approval" | "queued";
  approvalsRequired: number;
}

export const KIRA_LOOP = [
  "Aggregate",
  "Normalize",
  "Model",
  "Benchmark",
  "Recommend",
  "Execute",
] as const;

export const OPERATING_FUNCTIONS: OperatingFunction[] = [
  {
    id: "accounts-receivable",
    function: "Accounts Receivable",
    shortName: "AR",
    financialImpact: "Cash recovered",
    impactMetric: "RM 184k at risk",
    detects: ["Recovery gaps", "Aging risk", "Dispute patterns", "Bad-debt exposure"],
    runs: ["Collection workflows", "Payment reminders", "Dispute follow-ups", "Escalation paths"],
    inputs: ["Invoices", "Payment history", "Customer records", "Dispute notes", "Aging reports"],
    signalsDetected: ["Increasing days sales outstanding", "Repeated promise-to-pay misses", "Unresolved dispute clusters", "Customer-level bad-debt exposure"],
    benchmarksUsed: ["Recovery speed by cohort", "Historical collection curve", "Dispute resolution cycle", "Write-off rate"],
    recommendedActions: ["Send reminder", "Open payment-plan task", "Escalate dispute owner", "Prepare bad-debt review"],
    workflowsAvailable: ["Email reminder sequence", "CRM collection task", "ERP note update", "Manager escalation route"],
    escalationRules: ["Approval required before aggressive escalation", "Dispute cases route to account owner", "High-value balances require finance lead sign-off"],
    auditTrail: ["Invoice source", "Risk score change", "Message draft", "Approval decision", "External system update"],
    workflowLogic: [
      "Pull invoices, payment history, customer records, dispute notes, and aging reports.",
      "Detect accounts with increasing aging risk, slow recovery, or repeated dispute patterns.",
      "Benchmark recovery speed against peer cohorts and the company's own collection history.",
      "Recommend reminder, escalation, payment plan, or dispute follow-up.",
      "Run approved workflow through email, CRM, ERP, or task manager.",
      "Log every action and require approval before aggressive escalation.",
    ],
    riskCount: 18,
    benchmarkGap: "12 days slower than best-in-class recovery",
    impactEstimate: "RM 184k cash recoverable this cycle",
    workflowStatus: "approval",
    approvalsRequired: 6,
  },
  {
    id: "finance-fpa",
    function: "Finance & FP&A",
    shortName: "FP&A",
    financialImpact: "Margin protected",
    impactMetric: "3.8 pts pressure",
    detects: ["Close delays", "Budget variance", "Margin pressure", "Forecast drift"],
    runs: ["Close checklists", "Variance investigations", "Commentary drafts", "Payables prioritization"],
    inputs: ["Close tasks", "GL data", "Budgets", "Forecasts", "Payables", "Variance reports"],
    signalsDetected: ["Delayed close owners", "Unusual variance", "Margin compression", "Forecast drift"],
    benchmarksUsed: ["Close speed", "Forecast accuracy", "Gross margin trend", "Budget variance tolerance"],
    recommendedActions: ["Draft variance commentary", "Prioritize payables", "Create investigation task", "Update forecast assumptions"],
    workflowsAvailable: ["Close checklist routing", "Variance investigation queue", "Commentary draft pack", "Payables priority view"],
    escalationRules: ["Approval required before posting", "Approval required before payment", "Controller review before statements are finalized"],
    auditTrail: ["Source ledger line", "Variance reason", "Commentary draft", "Reviewer decision", "Close checklist state"],
    workflowLogic: [
      "Pull close tasks, GL data, budgets, forecasts, payables, and variance reports.",
      "Detect delayed close tasks, unusual variance, margin pressure, and forecast drift.",
      "Benchmark close speed, forecast accuracy, and margin performance.",
      "Draft variance commentary, prioritize payables, and generate investigation tasks.",
      "Require human approval before posting, paying, or finalizing financial statements.",
    ],
    riskCount: 11,
    benchmarkGap: "Close running 1.7 days behind target",
    impactEstimate: "RM 92k margin exposure flagged",
    workflowStatus: "running",
    approvalsRequired: 4,
  },
  {
    id: "sales",
    function: "Sales",
    shortName: "Sales",
    financialImpact: "Revenue accelerated",
    impactMetric: "RM 410k pipeline",
    detects: ["Leaky pipeline", "Stalled deals", "Weak follow-up", "Low conversion"],
    runs: ["Deal nudges", "Follow-up sequences", "Lead scoring", "Next-best-action workflows"],
    inputs: ["CRM stages", "Lead activity", "Emails", "Call notes", "Win/loss data", "Conversion metrics"],
    signalsDetected: ["Stage velocity drop", "No-touch opportunities", "Follow-up gap", "Conversion weakness by segment"],
    benchmarksUsed: ["Response speed", "Stage conversion", "Stage velocity", "Win/loss by cohort"],
    recommendedActions: ["Nudge owner", "Draft follow-up", "Score next lead", "Route deal review"],
    workflowsAvailable: ["Deal nudge", "Follow-up sequence", "Lead scoring run", "Next-best-action queue"],
    escalationRules: ["External messages can require approval", "Strategic accounts route to sales lead", "Discount language requires manager review"],
    auditTrail: ["CRM record", "Activity history", "Suggested action", "Message approval", "Sequence status"],
    workflowLogic: [
      "Pull CRM stages, lead activity, emails, call notes, win/loss data, and conversion metrics.",
      "Detect stalled deals, weak follow-up, pipeline leakage, and low conversion areas.",
      "Benchmark conversion rates, response speed, and stage velocity.",
      "Generate deal nudges, follow-up sequences, lead scores, and next-best actions.",
      "Require human approval before sending external messages when policy requires it.",
    ],
    riskCount: 24,
    benchmarkGap: "18% lower conversion in proposal stage",
    impactEstimate: "RM 410k pipeline acceleration opportunity",
    workflowStatus: "queued",
    approvalsRequired: 8,
  },
  {
    id: "lead-generation",
    function: "Lead Generation",
    shortName: "Leads",
    financialImpact: "Pipeline generated",
    impactMetric: "31% reply gap",
    detects: ["Low outbound volume", "Poor targeting", "Weak personalization", "Bad-fit leads"],
    runs: ["Prospect research", "Enrichment", "Personalized outreach", "Campaign workflows"],
    inputs: ["ICP definitions", "Outbound history", "Campaign data", "Public company data", "Enrichment APIs"],
    signalsDetected: ["ICP mismatch", "Low send volume", "Weak personalization depth", "Bad-fit lead concentration"],
    benchmarksUsed: ["Reply rate", "Meeting conversion", "Pipeline generated", "Source quality"],
    recommendedActions: ["Refresh ICP segment", "Research target account", "Enrich prospect", "Draft personalized outreach"],
    workflowsAvailable: ["Prospect research", "Firmographic enrichment", "Campaign workflow", "Source-cited outreach draft"],
    escalationRules: ["Cite public sources used", "Block unsupported claims", "Human review before high-volume campaign launch"],
    auditTrail: ["ICP rule", "Source citation", "Enrichment change", "Draft version", "Campaign approval"],
    workflowLogic: [
      "Pull ICP definitions, outbound history, campaign data, public company data, and enrichment APIs.",
      "Detect weak targeting, low outbound volume, poor personalization, and bad-fit leads.",
      "Benchmark campaign conversion, reply rates, and pipeline generated.",
      "Run prospect research, enrichment, personalized outreach, and campaign workflows.",
      "Track every source and cite public information used.",
    ],
    riskCount: 15,
    benchmarkGap: "31% below target reply rate",
    impactEstimate: "RM 260k pipeline gap in current campaign",
    workflowStatus: "running",
    approvalsRequired: 3,
  },
  {
    id: "customer-service",
    function: "Customer Service",
    shortName: "Service",
    financialImpact: "SLA risk reduced",
    impactMetric: "42 SLA cases",
    detects: ["Ticket spikes", "SLA risk", "Sentiment shifts", "Repeat issues"],
    runs: ["Triage", "Suggested replies", "Escalation routing", "24/7 chat and voice flows"],
    inputs: ["Tickets", "Chats", "Call transcripts", "Sentiment", "SLA data", "Customer history"],
    signalsDetected: ["Backlog spike", "SLA breach risk", "Negative sentiment shift", "Repeat issue cluster"],
    benchmarksUsed: ["Resolution time", "Backlog", "CSAT", "Escalation rate"],
    recommendedActions: ["Triage queue", "Draft reply", "Route escalation", "Open incident review"],
    workflowsAvailable: ["Ticket triage", "Suggested response", "Escalation routing", "Chat or voice flow"],
    escalationRules: ["Approval required for refunds", "Sensitive cases route to human", "High-risk responses require manager review"],
    auditTrail: ["Ticket history", "Sentiment signal", "Reply draft", "Approval state", "Resolution outcome"],
    workflowLogic: [
      "Pull tickets, chats, call transcripts, sentiment, SLA data, and customer history.",
      "Detect ticket spikes, SLA risk, sentiment shifts, and repeat issues.",
      "Benchmark support resolution time, backlog, CSAT, and escalation rates.",
      "Run triage, suggested replies, escalation routing, and 24/7 chat or voice flows.",
      "Require approval for refunds, sensitive cases, or high-risk customer responses.",
    ],
    riskCount: 42,
    benchmarkGap: "9 hours slower than target resolution",
    impactEstimate: "42 SLA-risk cases can be reduced",
    workflowStatus: "approval",
    approvalsRequired: 9,
  },
  {
    id: "customer-onboarding",
    function: "Customer Onboarding",
    shortName: "Onboarding",
    financialImpact: "Manual hours saved",
    impactMetric: "86 hrs saved",
    detects: ["Manual reviews", "Activation delays", "Incomplete handoffs", "Missing documents"],
    runs: ["Document checks", "Approval routing", "Exception handling", "Activation workflows"],
    inputs: ["Forms", "Documents", "Approvals", "KYC/KYB checks", "CRM handoffs", "Activation data"],
    signalsDetected: ["Manual review delay", "Missing document", "Incomplete owner handoff", "Activation risk"],
    benchmarksUsed: ["Time-to-activation", "Completion rate", "Approval cycle time", "Exception rate"],
    recommendedActions: ["Request missing document", "Route approval", "Resolve exception", "Launch activation checklist"],
    workflowsAvailable: ["Document check", "Approval routing", "Exception handling", "Activation workflow"],
    escalationRules: ["Compliance exceptions require human review", "Missing KYB evidence blocks activation", "Audit trail retained for every check"],
    auditTrail: ["Document source", "Check result", "Exception reason", "Approver action", "Activation event"],
    workflowLogic: [
      "Pull forms, documents, approvals, KYC/KYB checks, CRM handoffs, and activation data.",
      "Detect manual review delays, incomplete handoffs, missing documents, and activation risk.",
      "Benchmark time-to-activation, completion rate, and approval cycle time.",
      "Run document checks, approval routing, exception handling, and activation workflows.",
      "Keep audit trails for compliance.",
    ],
    riskCount: 21,
    benchmarkGap: "2.4 days longer than target activation",
    impactEstimate: "86 manual hours can be removed",
    workflowStatus: "running",
    approvalsRequired: 7,
  },
  {
    id: "operations",
    function: "Operations",
    shortName: "Ops",
    financialImpact: "Manual hours saved",
    impactMetric: "128 hrs saved",
    detects: ["Bottlenecks", "Handoff failures", "Process drift", "Compliance gaps"],
    runs: ["SOP execution", "Alerts", "Task routing", "Recurring workflow automation"],
    inputs: ["SOPs", "Tasks", "Process logs", "Handoffs", "Compliance checks", "Recurring workflows"],
    signalsDetected: ["Bottleneck", "Failed handoff", "Process drift", "Compliance exception"],
    benchmarksUsed: ["Completion time", "Error rate", "SLA adherence", "Throughput"],
    recommendedActions: ["Execute SOP step", "Alert owner", "Route task", "Escalate exception"],
    workflowsAvailable: ["SOP execution", "Alerting", "Task routing", "Recurring workflow automation"],
    escalationRules: ["Exceptions route to named owner", "Compliance gaps require review", "Recurring workflow changes require admin approval"],
    auditTrail: ["Process source", "SOP version", "Task state", "Owner decision", "Exception closure"],
    workflowLogic: [
      "Pull SOPs, tasks, process logs, handoffs, compliance checks, and recurring workflows.",
      "Detect bottlenecks, handoff failures, process drift, and compliance gaps.",
      "Benchmark process completion time, error rates, SLA adherence, and throughput.",
      "Run SOP execution, alerts, task routing, and recurring workflow automation.",
      "Escalate exceptions to the right owner.",
    ],
    riskCount: 30,
    benchmarkGap: "22% throughput gap in recurring workflows",
    impactEstimate: "128 manual hours saved per month",
    workflowStatus: "queued",
    approvalsRequired: 5,
  },
];

export function getOperatingFunction(id: OperatingFunctionId) {
  return OPERATING_FUNCTIONS.find((fn) => fn.id === id) ?? OPERATING_FUNCTIONS[0];
}
