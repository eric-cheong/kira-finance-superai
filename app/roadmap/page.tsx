import {
  ActionBadge,
  Badge,
  Card,
  CardHeader,
  Icon,
  PageHeader,
  Table,
  Td,
  Th,
  TierBadge,
} from "@/components/ui";
import type { ActionClass, ApprovalTier } from "@/lib/types";

export const metadata = { title: "Build Plan · Kira" };

const PHASES = [
  {
    phase: 1,
    title: "License-free MVP",
    theme: "SME spend, expense, AP orchestration, GST/SST, and e-invoicing",
    money: "Read-only money. No balances, transfers, cards, FX execution, or trades.",
    agents: "Orchestrator, User Preference, Budget/Spend, Compliance/Safety, Notification",
    rails: "CSV feeds, OCR, accounting write-back, MyInvois, Peppol/InvoiceNow",
    gate: "Onboard < 1 day; high auto-match and first-pass e-invoice acceptance; validate AutoCount/SQL Account and grant eligibility.",
  },
  {
    phase: 2,
    title: "Intelligence + Partnered Rails",
    theme: "Portfolio, market, news, risk, bill-pay orchestration, partner-issued cards",
    money: "Money moves only through a licensed bank/BaaS partner; Kira remains an orchestrator.",
    agents: "Add Market Research, Portfolio Analysis, News Relevance, Risk Monitoring, Human Approval",
    rails: "Open banking, market/news data, read-only brokerage APIs, Airwallex/Nium-style partner abstraction",
    gate: "Partner payments reconcile cleanly; provider-managed reversal/refund tracking proven; KYC/AML process audited; no PAN touches Kira.",
  },
  {
    phase: 3,
    title: "Full ERP + Prediction",
    theme: "Multi-entity, multi-book, multi-currency, revenue, inventory, project accounting, forecasting",
    money: "Same licensed-partner rule at enterprise scale.",
    agents: "Full roster plus forecasting capability behind Compliance/Safety",
    rails: "Kafka, multi-region clusters, payroll provider integrations, marketplace SDK, analytics warehouse",
    gate: "Multi-book close runs cleanly; certifications live; marketplace ships third-party connectors.",
  },
] as const;

const FEATURES = [
  ["Receipt / invoice OCR", 1, "Document AI extracts supplier, totals, tax, line items, and coding suggestions."],
  ["Receipt-to-transaction matching", 1, "Amount, date, merchant similarity, confidence thresholds, human review below threshold."],
  ["Multi-layer approvals", 1, "Tiered routing with reversible / irreversible labels and no-action timeout default."],
  ["Accounting write-back", 1, "Codat/Rutter/Merge plus local AutoCount and SQL Account validation target."],
  ["MyInvois + Peppol/InvoiceNow", 1, "Explicit approval before submission; UUID, QR, and validation response retained."],
  ["Read-only daily briefing", 1, "Spend insight, anomalies, bills due, close readiness, sources, and confidence."],
  ["Portfolio and market intelligence", 2, "Read-only holdings, watchlist moves, concentration and news relevance."],
  ["Partner-executed bill pay", 2, "Kira records approval and hands off; bank or licensed partner executes after explicit approval."],
  ["Partner-issued cards", 2, "Tokenized partner program; no PAN storage inside Kira."],
  ["Perpetual ledger core", 3, "Append-only event-sourced GL for the customer's own books; corrections are new entries, never edits."],
  ["Multi-book ERP", 3, "Entity, subsidiary, ledger, book, journal, FX revaluation entries, consolidation, revenue, inventory, and projects."],
  ["AI forecasting", 3, "Cash-flow, revenue, accrual, and scenario forecasts with confidence, assumptions, and lineage."],
  ["Enterprise compliance", 3, "SOC 2 Type II, SOC 1, SOX controls, ISO 27001, residency enforcement, and auditor-grade lineage."],
] as const;

const ACTIONS: { action: string; cls: ActionClass; tier: ApprovalTier; boundary: string }[] = [
  { action: "Generate daily summaries", cls: "read-only", tier: 1, boundary: "No approval; labelled informational with sources." },
  { action: "Change notification or quiet-hour preference", cls: "notification", tier: 2, boundary: "Soft approval; reversible user preference update." },
  { action: "Suggest GST/SST coding or recode", cls: "suggestion", tier: 3, boundary: "Explicit approval when it affects filed records or tax treatment." },
  { action: "Submit e-invoice", cls: "human-approved", tier: 3, boundary: "Explicit human sign-off; store validation response and UUID." },
  { action: "Record bill-payment approval for partner handoff", cls: "human-approved", tier: 3, boundary: "Partner executes; timeout means no action." },
  { action: "Flag abnormal activity or regulated-advice request", cls: "suggestion", tier: 4, boundary: "Mandatory human review; output cannot be framed as advice." },
  { action: "Move money, issue e-money/card, place trade directly", cls: "prohibited", tier: 4, boundary: "Forbidden for Kira; only licensed partners may execute permitted rails." },
];

const ARCH = [
  {
    option: "LangGraph",
    fit: "Best MVP fit",
    why: "Explicit graph state, human-in-loop interrupts, inspectable agent steps, and compliance-gate nodes.",
  },
  {
    option: "Temporal",
    fit: "Add in Phase 2",
    why: "Durable long-running workflows for idempotent partner handoffs, status callbacks, reconciliation, and provider-managed reversal/refund tracking.",
  },
  {
    option: "CrewAI / AutoGen",
    fit: "Prototype only",
    why: "Useful for agent demos, but less direct control over auditability and deterministic approval gates.",
  },
  {
    option: "Custom event bus",
    fit: "Phase 3 scale layer",
    why: "Kafka-style event backbone helps multi-region ERP, marketplace connectors, and analytics fan-out.",
  },
  {
    option: "CockroachDB",
    fit: "Phase 3 scale layer",
    why: "Optional distributed APAC deployment layer for regional clusters, residency boundaries, and multi-entity ERP scale.",
  },
] as const;

const FAILURES = [
  ["OCR low confidence", "Hold in Capture review; require field-level confirmation before posting."],
  ["Accounting sync failure", "Retry with idempotent external IDs; display provider state and keep record store canonical."],
  ["E-invoice rejection", "Store validation response, open correction workflow, require explicit resubmission approval."],
  ["Agent disagreement", "Downgrade confidence, show both rationales in Audit, no-action default."],
  ["LLM hallucination risk", "Require source citations, de-identify prompts, Compliance/Safety gate before user output."],
  ["Partner/payment failure", "Phase 2 only: track provider-managed reversal/refund state, alert human, and reconcile callback state."],
] as const;

const SOURCES = [
  {
    label: "LHDN e-Invoice FAQs",
    href: "https://www.hasil.gov.my/media/0xqitc2t/lhdnm-e-invoice-general-faqs.pdf?brid=zGhfLDwKZe0Z6vdIsP14qA",
  },
  {
    label: "IRAS GST InvoiceNow Requirement",
    href: "https://www.iras.gov.sg/taxes/goods-services-tax-%28gst%29/gst-invoicenow-requirement",
  },
  {
    label: "IMDA InvoiceNow / Peppol technical playbook",
    href: "https://www.imda.gov.sg/how-we-can-help/nationwide-e-invoicing-framework/peppol-technical-playbook",
  },
  {
    label: "MAS financial institutions directory: e-money issuance",
    href: "https://eservices.mas.gov.sg/fid/institution?activity=E-money+Issuance+Service&category=Major+Payment+Institution&sector=Payments",
  },
] as const;

const PHASE3_SCOPE = [
  {
    title: "Ledger core",
    body: "Immutable journal entries, atomic transaction events, multi-entity hierarchy, GAAP/IFRS/Tax/Management books, policy-as-code divergence rules, auto-adjustments, and corrections posted as new entries.",
  },
  {
    title: "Currency and consolidation",
    body: "Functional, transaction, and reporting currencies; daily FX revaluation entries for unrealized gain/loss, not FX conversion; translation at consolidation; intercompany eliminations with source-entry traceability.",
  },
  {
    title: "ERP modules",
    body: "Revenue schedules, deferred and accrued revenue, AR/AP invoice lifecycle, inventory, stock movements, valuation, projects, tasks, costs, and profitability.",
  },
  {
    title: "Prediction layer",
    body: "Cash-flow, revenue, accrual, and scenario forecasts that remain informational and never trigger settlement, FX execution, disbursement, or card actions.",
  },
] as const;

const PHASE3_OBJECTS = [
  "Entity / Subsidiary / Ledger / Book",
  "JournalEntry / JournalLine",
  "TransactionEvent / FXRate",
  "RevenueSchedule / TaxRule / Invoice",
  "InventoryItem / StockMovement / Valuation",
  "Project / ProjectTask / ProjectCost",
  "EliminationRule / IntercompanyEntry / ConsolidationRun",
  "ForecastModel / ForecastRun / Scenario",
] as const;

const PHASE3_MODULES = [
  "Multi-entity console",
  "Multi-book balances",
  "Continuous close",
  "Consolidation and eliminations",
  "Revenue automation",
  "Inventory",
  "Project accounting",
  "Forecasting dashboard",
  "Enterprise compliance and SoD",
  "Connector marketplace",
  "Payroll provider integrations",
  "Optional CRM and manufacturing",
] as const;

const PHASE3_SPECIALISTS = [
  ["Close / Reconciliation", "Matches open items, proposes adjusting entries, and keeps close readiness current daily."],
  ["Revenue", "Builds recognition schedules and proposes deferred or accrued revenue entries."],
  ["Consolidation", "Generates intercompany eliminations and currency translation for group roll-ups."],
  ["Forecasting", "Produces cash-flow, revenue, accrual, and scenario forecasts with confidence and assumptions."],
  ["Accrual prediction", "Predicts accruals from patterns, with Human Approval required before any posting."],
] as const;

const PHASE3_WAVES = [
  {
    wave: "3a",
    title: "Ledger core + multi-entity backbone",
    scope: "Event-sourced ledger, entity hierarchy, multi-book posting, multi-currency, FX revaluation entries for unrealized gain/loss, consolidation, eliminations, continuous close.",
    gate: "Multi-entity close runs cleanly across books and currencies; every consolidated figure is traceable.",
  },
  {
    wave: "3b",
    title: "Operational modules + forecasting",
    scope: "Revenue automation, inventory, project accounting, cash-flow/revenue/accrual/scenario forecasts, explainability, adaptive entity-specific tuning.",
    gate: "Forecasts are trusted and clearly informational; every module reconciles into the ledger core.",
  },
  {
    wave: "3c",
    title: "Enterprise compliance + marketplace",
    scope: "SOC 2 Type II, SOC 1, SOX, ISO 27001, residency enforcement, cryptographic ledger hashing option, partner SDK, revenue share, payroll provider integrations, optional CRM and manufacturing.",
    gate: "Certifications achieved, marketplace ships third-party connectors with active revenue share, and regional residency is enforced.",
  },
] as const;

const PHASE3_RISKS = [
  ["Scope explosion", "Ship the 3a/3b/3c waves with hard gates; ledger core before modules."],
  ["Regulatory creep", "Keep settlement, FX execution, disbursement, cards, and e-money on licensed partners; legal review before money-touching features."],
  ["Incumbents add APAC depth", "Lead with continuous close, AI-native UX, and sticky local connectors like AutoCount, SQL Account, MyInvois, and Peppol."],
  ["Multi-region data law", "Build residency enforcement into the cluster model; PIPL/DPDP readiness before China or India expansion."],
  ["Model trust", "Use de-identification, explainability, confidence calibration, and human-in-loop posting."],
  ["Operational complexity", "Keep settlement out of Kira, preserve append-only lineage, and make every consolidated figure auditor-traceable."],
] as const;

const PHASE3_TECH = [
  ["Data core", "PostgreSQL with logical replication; CockroachDB option for distributed APAC clusters; Kafka event backbone."],
  ["Analytics and documents", "Snowflake or BigQuery analytics layer, S3 document store, and vector DB for document embeddings/RAG."],
  ["AI orchestration", "Internal fine-tuned accounting model, de-identification pipeline, LangGraph agent graph, and Temporal workflows."],
  ["Observability", "OpenTelemetry, Datadog, Grafana, and Sentry across regional deployments."],
] as const;

const PHASE3_GOVERNANCE = [
  "SOC 2 Type II",
  "SOC 1",
  "SOX controls",
  "ISO 27001",
  "Singapore PDPA",
  "Malaysia PDPA",
  "China PIPL readiness",
  "India DPDP readiness",
  "Data masking",
  "Approval-gate configuration",
  "AES-256 at rest",
  "TLS 1.2+ in transit",
] as const;

const PHASE3_ORG = [
  ["Engineering pods", "Ledger Core, AI & ML, Integration, Localization & Compliance, Frontend, DevOps/Platform."],
  ["Compliance team", "Tax specialists for India, China, and SEA; regulatory analyst; internal-audit specialist."],
  ["Partner ecosystem", "Regional system integrators, tax advisors, audit firms, PSP and banking alliances, marketplace connector partners."],
] as const;

const PHASE3_SUCCESS = [
  "Days-to-close trends toward near-zero",
  "Multi-entity consolidation is clean and traceable",
  "Forecasting accuracy and adoption are trusted",
  "SOC 2 Type II, SOC 1, SOX, ISO 27001 achieved",
  "Marketplace has external connectors and active revenue share",
  "Residency enforced per jurisdiction",
] as const;

function PhaseBadge({ phase }: { phase: 1 | 2 | 3 }) {
  return <Badge variant={phase === 1 ? "brand" : phase === 2 ? "info" : "neutral"}>P{phase}</Badge>;
}

export default function RoadmapPage() {
  return (
    <div className="animate-in space-y-8">
      <PageHeader
        title="Build Plan"
        description="The master product brief translated into a phased implementation map: what ships, what stays outside the regulated perimeter, which agent actions are allowed, and what must be true before the next phase starts."
        badge={<Badge variant="pos" dot>orchestrate · never settle</Badge>}
      />

      <section>
        <h2 className="mb-3 text-[15px] font-semibold text-ink">Phase plan</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {PHASES.map((p) => (
            <Card key={p.phase} className="flex flex-col">
              <CardHeader
                title={p.title}
                subtitle={p.theme}
                right={<PhaseBadge phase={p.phase} />}
                icon={p.phase === 1 ? "shield" : p.phase === 2 ? "portfolio" : "analytics"}
              />
              <div className="space-y-3 text-[12.5px] leading-relaxed text-muted">
                <p><span className="font-medium text-ink-2">Money boundary:</span> {p.money}</p>
                <p><span className="font-medium text-ink-2">Agents:</span> {p.agents}</p>
                <p><span className="font-medium text-ink-2">Integrations:</span> {p.rails}</p>
                <p className="rounded-lg border border-border bg-surface-2/45 px-3 py-2">
                  <span className="font-medium text-ink-2">Exit gate:</span> {p.gate}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[15px] font-semibold text-ink">Feature scope by phase</h2>
        <Card pad={false}>
          <Table>
            <thead>
              <tr>
                <Th>Feature</Th>
                <Th>Phase</Th>
                <Th>Build note</Th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map(([feature, phase, note]) => (
                <tr key={feature} className="hover:bg-surface-2/40">
                  <Td className="font-medium text-ink">{feature}</Td>
                  <Td><PhaseBadge phase={phase} /></Td>
                  <Td className="text-[12.5px]">{note}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="mb-1 text-[15px] font-semibold text-ink">Phase 3 detailed specification</h2>
          <p className="max-w-3xl text-[13px] leading-relaxed text-muted">
            Full-stack APAC AI-native ERP: a customer-owned accounting record system with continuous close,
            forecasting, enterprise compliance, and multi-region deployment. The regulated line still holds:
            the ERP records, schedules, reconciles, and forecasts; licensed partners execute settlement, FX
            conversion, disbursement, and cards.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PHASE3_SCOPE.map((item) => (
            <Card key={item.title}>
              <CardHeader title={item.title} icon="doc" />
              <p className="text-[12.5px] leading-relaxed text-muted">{item.body}</p>
            </Card>
          ))}
        </div>

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card pad={false}>
            <div className="px-5 pt-5">
              <CardHeader
                title="Phase 3 data model additions"
                subtitle="Append-only ERP objects layered on the existing record core"
                icon="transactions"
              />
            </div>
            <div className="grid gap-x-4 gap-y-2 px-5 pb-5 md:grid-cols-2">
              {PHASE3_OBJECTS.map((object) => (
                <div key={object} className="flex min-w-0 items-center gap-2 break-words rounded-lg border border-border px-3 py-2 text-[12.5px] font-medium text-ink-2">
                  <Icon name="dot" size={12} className="shrink-0 text-brand" />
                  <span className="min-w-0">{object}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Screens and modules" subtitle="Enterprise surfaces added in Phase 3" icon="analytics" />
            <div className="flex flex-wrap gap-2">
              {PHASE3_MODULES.map((module) => (
                <Badge key={module} variant="neutral">{module}</Badge>
              ))}
            </div>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card pad={false}>
            <div className="px-5 pt-5">
              <CardHeader
                title="ERP specialist agents"
                subtitle="All proposed postings stay behind Human Approval and Compliance/Safety"
                icon="spark"
              />
            </div>
            <Table>
              <thead>
                <tr>
                  <Th>Specialist</Th>
                  <Th>Capability</Th>
                </tr>
              </thead>
              <tbody>
                {PHASE3_SPECIALISTS.map(([specialist, capability]) => (
                  <tr key={specialist} className="hover:bg-surface-2/40">
                    <Td className="font-medium text-ink">{specialist}</Td>
                    <Td className="text-[12.5px]">{capability}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>

          <Card>
            <CardHeader title="Model maturity path" icon="portfolio" />
            <div className="space-y-3 text-[12.5px] leading-relaxed text-muted">
              <p>
                Early classification starts with rules and supervised labels; the middle stage is a fine-tuned
                accounting foundation model for classification, reconciliation, revenue recognition, and accrual
                prediction; Phase 3 matures into adaptive, entity-specific tuning from each customer&apos;s chart of
                accounts, close patterns, and user corrections.
              </p>
              <p className="rounded-lg border border-border bg-surface-2/45 px-3 py-2">
                Hard rule: raw financial data never goes to external LLMs. Generative summaries may use external
                models only after de-identification, with internal accounting models preferred for sensitive tasks.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {["De-identification", "Label generation", "Feature engineering", "Explainability", "Confidence calibration", "Lineage trail"].map((step) => (
                  <div key={step} className="rounded-lg border border-border px-3 py-2 font-medium text-ink-2">
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card pad={false}>
            <div className="px-5 pt-5">
              <CardHeader title="Tech stack additions" subtitle="The Phase 3 scale layer behind multi-region ERP" icon="transactions" />
            </div>
            <Table>
              <thead>
                <tr>
                  <Th>Layer</Th>
                  <Th>Build note</Th>
                </tr>
              </thead>
              <tbody>
                {PHASE3_TECH.map(([layer, note]) => (
                  <tr key={layer} className="hover:bg-surface-2/40">
                    <Td className="font-medium text-ink">{layer}</Td>
                    <Td className="text-[12.5px]">{note}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>

          <Card>
            <CardHeader title="Governance controls" subtitle="Certifications, regional law, and operating controls" icon="shield" />
            <div className="flex flex-wrap gap-2">
              {PHASE3_GOVERNANCE.map((control) => (
                <Badge key={control} variant="neutral">{control}</Badge>
              ))}
            </div>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card pad={false}>
            <div className="px-5 pt-5">
              <CardHeader title="Execution model" subtitle="Pods and partners required to deliver Phase 3" icon="bank" />
            </div>
            <Table>
              <thead>
                <tr>
                  <Th>Workstream</Th>
                  <Th>Owner shape</Th>
                </tr>
              </thead>
              <tbody>
                {PHASE3_ORG.map(([workstream, owners]) => (
                  <tr key={workstream} className="hover:bg-surface-2/40">
                    <Td className="font-medium text-ink">{workstream}</Td>
                    <Td className="text-[12.5px]">{owners}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>

          <Card>
            <CardHeader title="Definition of done" subtitle="Success metrics for enterprise readiness" icon="check" />
            <ul className="space-y-2">
              {PHASE3_SUCCESS.map((metric) => (
                <li key={metric} className="flex gap-2 text-[12.5px] leading-relaxed text-ink-2">
                  <Icon name="check" size={14} className="mt-0.5 shrink-0 text-pos-fg" />
                  <span>{metric}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card pad={false}>
            <div className="px-5 pt-5">
              <CardHeader title="Phase 3 build sequence" subtitle="Three waves so the ERP does not explode in scope" icon="clock" />
            </div>
            <Table>
              <thead>
                <tr>
                  <Th>Wave</Th>
                  <Th>Scope</Th>
                  <Th>Gate</Th>
                </tr>
              </thead>
              <tbody>
                {PHASE3_WAVES.map((wave) => (
                  <tr key={wave.wave} className="hover:bg-surface-2/40">
                    <Td>
                      <div className="space-y-1">
                        <Badge variant="brand">Phase {wave.wave}</Badge>
                        <div className="text-[12.5px] font-medium text-ink">{wave.title}</div>
                      </div>
                    </Td>
                    <Td className="text-[12.5px]">{wave.scope}</Td>
                    <Td className="text-[12.5px]">{wave.gate}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>

          <Card>
            <CardHeader title="Key risks" subtitle="Mitigations baked into the build order" icon="alert" />
            <div className="space-y-2">
              {PHASE3_RISKS.map(([risk, mitigation]) => (
                <div key={risk} className="rounded-lg border border-border px-3 py-2.5">
                  <div className="text-[13px] font-medium text-ink">{risk}</div>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted">{mitigation}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card pad={false}>
          <div className="px-5 pt-5">
            <CardHeader title="Action and approval matrix" subtitle="Every agent action falls into one class and one human-in-loop tier." icon="approvals" />
          </div>
          <Table>
            <thead>
              <tr>
                <Th>Action</Th>
                <Th>Class</Th>
                <Th>Tier</Th>
                <Th>Boundary</Th>
              </tr>
            </thead>
            <tbody>
              {ACTIONS.map((a) => (
                <tr key={a.action} className="hover:bg-surface-2/40">
                  <Td className="font-medium text-ink">{a.action}</Td>
                  <Td><ActionBadge value={a.cls} /></Td>
                  <Td><TierBadge tier={a.tier} /></Td>
                  <Td className="text-[12.5px]">{a.boundary}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader title="Agent loop" icon="spark" />
          <ol className="space-y-2">
            {["Observe", "Analyze", "Plan", "Act", "Verify", "Summarize", "Escalate if needed"].map((step, i) => (
              <li key={step} className="flex items-center gap-2 text-[12.5px] text-ink-2">
                <span className="tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-[11px] text-faint">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded-lg border border-border bg-surface-2/45 px-3 py-2 text-[12px] leading-relaxed text-muted">
            Orchestration is hybrid: scheduled daily runs, event-driven capture/e-invoice events, parallel specialist agents, and a final hierarchical Compliance/Safety gate.
          </p>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card pad={false}>
          <div className="px-5 pt-5">
            <CardHeader title="Architecture choice" subtitle="MVP recommendation and phase upgrades" icon="transactions" />
          </div>
          <Table>
            <thead>
              <tr>
                <Th>Tooling</Th>
                <Th>Fit</Th>
                <Th>Why</Th>
              </tr>
            </thead>
            <tbody>
              {ARCH.map((a) => (
                <tr key={a.option} className="hover:bg-surface-2/40">
                  <Td className="whitespace-nowrap font-medium text-ink">{a.option}</Td>
                  <Td><Badge variant={a.fit.includes("Best") ? "pos" : a.fit.includes("Add") ? "info" : "neutral"}>{a.fit}</Badge></Td>
                  <Td className="text-[12.5px]">{a.why}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader title="Failure handling" subtitle="Safe default: no action" icon="alert" />
          <div className="space-y-2">
            {FAILURES.map(([failure, response]) => (
              <div key={failure} className="rounded-lg border border-border px-3 py-2.5">
                <div className="flex items-center gap-2 text-[13px] font-medium text-ink">
                  <Icon name="shield" size={14} className="text-brand" />
                  {failure}
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-muted">{response}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader title="License-free thesis" icon="lock" />
          <div className="space-y-2 text-[12.5px] leading-relaxed text-ink-2">
            <p>Kira is a system of record-keeping, orchestration, approval, and intelligence. It never holds customer funds, stored value, payment account balances, or custody balances; it does not settle payments, issue e-money, issue cards, or place trades.</p>
            <p>Phase 2 rails sit behind a partner abstraction so licensed providers execute regulated actions while Kira stores approvals, callbacks, reconciliation evidence, and audit lineage.</p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Current source links" subtitle="Official references to verify before capital commitment" icon="doc" />
          <ul className="space-y-2">
            {SOURCES.map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-start gap-2 text-[12.5px] font-medium text-brand hover:underline"
                >
                  <Icon name="arrowUpRight" size={13} className="mt-0.5 shrink-0" />
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
