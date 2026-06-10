import { AGENT_ROSTER, runDailyBriefing } from "@/lib/agents";
import type { LoopPhase } from "@/lib/agents/types";
import * as db from "@/lib/data/store";
import { fmtDateTime, shortId } from "@/lib/format";
import {
  Bar,
  Badge,
  Button,
  Card,
  CardHeader,
  Icon,
  PageHeader,
  Table,
  TierBadge,
  Td,
  Th,
} from "@/components/ui";
import type { ApprovalTier } from "@/lib/types";

export const metadata = { title: "Audit & Agents · Kira" };

const PHASE_LABEL: Record<LoopPhase, string> = {
  observe: "OBSERVE",
  analyze: "ANALYZE",
  plan: "PLAN",
  act: "ACT",
  verify: "VERIFY",
  summarize: "SUMMARIZE",
  escalate: "ESCALATE",
};

const LOOP_ORDER: LoopPhase[] = ["observe", "analyze", "plan", "act", "verify", "summarize", "escalate"];

const RUN_PLAN = [
  {
    title: "Resolve context",
    detail: "Load user preference, org profile, thresholds, and recent run memory.",
    status: "complete",
  },
  {
    title: "Fan out analysts",
    detail: "Budget, booking, and forecast agents inspect their own bounded data sets.",
    status: "complete",
  },
  {
    title: "Gate actions",
    detail: "Compliance/Safety labels money-touching items and blocks autonomous execution.",
    status: "complete",
  },
  {
    title: "Prepare human queue",
    detail: "Approvals are split from read-only briefing items for reviewer control.",
    status: "waiting",
  },
];

const TOOL_CALLS = [
  { agent: "User Preference", tool: "settings.read", input: "profile, locale, thresholds", result: "context locked", policy: "read-only" },
  { agent: "Budget/Spend", tool: "ledger.scan", input: "transactions + receipts", result: "4 findings emitted", policy: "suggest only" },
  { agent: "Booking", tool: "booking.options.search", input: "partner inventory snapshot", result: "approval candidate", policy: "no booking" },
  { agent: "Cashflow Forecast", tool: "forecast.project", input: "bank, AR, AP schedule", result: "cash range", policy: "read-only" },
  { agent: "Compliance/Safety", tool: "policy.evaluate", input: "ranked findings", result: "approval gates attached", policy: "human gate" },
  { agent: "Notification", tool: "notification.compose", input: "briefing + approvals count", result: "draft only", policy: "queued" },
];

function progressForStep(phase: LoopPhase) {
  const index = LOOP_ORDER.indexOf(phase);
  return Math.round(((index + 1) / LOOP_ORDER.length) * 100);
}

function AgentProgressPanel({ run }: { run: ReturnType<typeof runDailyBriefing> }) {
  return (
    <Card>
      <CardHeader
        title="Run progress"
        subtitle="Server-rendered trace of the current briefing pass; controls below are placeholders only."
        icon="timeline"
        right={<Badge variant="warn">awaiting human review</Badge>}
      />
      <div className="grid gap-3 md:grid-cols-2">
        {run.agentResults.map((agent) => {
          const last = agent.steps[agent.steps.length - 1];
          const value = last ? progressForStep(last.phase) : 0;
          const tone = agent.status === "ok" ? "pos" : agent.status === "degraded" ? "warn" : "crit";
          return (
            <div key={agent.agent} className="rounded-lg border border-border bg-surface-2/45 p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold text-ink">{agent.agent}</p>
                  <p className="mt-0.5 truncate text-[11.5px] text-muted">{last?.message ?? "No steps recorded."}</p>
                </div>
                <span className="tnum shrink-0 text-[11px] text-faint">{value}%</span>
              </div>
              <Bar value={value} tone={tone} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function HumanControlPanel() {
  return (
    <Card>
      <CardHeader
        title="Human control points"
        subtitle="Visible affordances for pause, edit, and resume; intentionally inert in this static audit view."
        icon="shield"
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface-2/45 p-3">
          <Button disabled variant="outline" size="sm" icon="clock" className="w-full">
            Pause
          </Button>
          <p className="mt-2 text-[12px] leading-relaxed text-muted">Would suspend queued tool work before any external action.</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-2/45 p-3">
          <Button disabled variant="outline" size="sm" icon="doc" className="w-full">
            Edit plan
          </Button>
          <p className="mt-2 text-[12px] leading-relaxed text-muted">Would let a reviewer adjust scope, evidence, or approval tier.</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-2/45 p-3">
          <Button disabled variant="outline" size="sm" icon="arrowRight" className="w-full">
            Resume
          </Button>
          <p className="mt-2 text-[12px] leading-relaxed text-muted">Would continue only after a reviewed plan is accepted.</p>
        </div>
      </div>
    </Card>
  );
}

export default function AuditPage() {
  const run = runDailyBriefing();

  return (
    <div className="animate-in space-y-8">
      <PageHeader
        title="Audit & agents"
        description="The transparency layer: every agent plan, tool call, policy check, autonomy boundary, and immutable hash-chained record of what happened. This is what an auditor or admin sees."
        badge={<Badge variant="pos" dot>chain verified</Badge>}
      />

      {/* Agent roster / autonomy boundaries */}
      <section>
        <h2 className="mb-3 text-[15px] font-semibold text-ink">Agent roster & autonomy boundaries</h2>
        <Card pad={false}>
          <Table>
            <thead>
              <tr>
                <Th>Agent</Th>
                <Th>Job</Th>
                <Th>Allowed autonomously</Th>
                <Th>Never without a human</Th>
                <Th>Phase</Th>
              </tr>
            </thead>
            <tbody>
              {AGENT_ROSTER.map((a) => (
                <tr key={a.name} className="hover:bg-surface-2/40">
                  <Td className="whitespace-nowrap font-medium text-ink">{a.name}</Td>
                  <Td className="text-[12.5px]">{a.job}</Td>
                  <Td className="text-[12.5px] text-ink">{a.autonomous}</Td>
                  <Td className="text-[12.5px] text-ink">{a.neverWithoutHuman}</Td>
                  <Td>{a.phase === 2 ? <Badge variant="neutral">P2</Badge> : <Badge variant="brand">P1</Badge>}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </section>

      {/* Latest run trace */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink">Latest run — decision trace</h2>
          <span className="tnum text-[12px] text-faint">
            {run.runId} · {run.durationMs}ms · {fmtDateTime(run.startedAt)}
          </span>
        </div>

        <div className="mb-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <AgentProgressPanel run={run} />
          <HumanControlPanel />
        </div>

        <Card className="mb-4">
          <CardHeader title="Execution plan" subtitle="Each stage is visible before any human approval decision." icon="route" />
          <ol className="grid gap-3 md:grid-cols-4">
            {RUN_PLAN.map((item, i) => (
              <li key={item.title} className="rounded-lg border border-border bg-surface-2/45 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="tnum text-[11px] font-semibold text-faint">0{i + 1}</span>
                  <Badge variant={item.status === "complete" ? "pos" : "warn"}>{item.status}</Badge>
                </div>
                <p className="mt-2 text-[12.5px] font-semibold text-ink">{item.title}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted">{item.detail}</p>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="mb-4" pad={false}>
          <div className="flex items-center gap-2 border-b border-border px-5 py-3 text-[12px] text-muted">
            <Icon name="database" size={14} className="text-info-fg" />
            Tool-call ledger · read-only and suggestion tools are shown here; no tool row performs work from this page.
          </div>
          <Table>
            <thead>
              <tr>
                <Th>Agent</Th>
                <Th>Tool call</Th>
                <Th>Input scope</Th>
                <Th>Result</Th>
                <Th>Control</Th>
              </tr>
            </thead>
            <tbody>
              {TOOL_CALLS.map((call) => (
                <tr key={`${call.agent}-${call.tool}`} className="hover:bg-surface-2/40">
                  <Td className="whitespace-nowrap font-medium text-ink">{call.agent}</Td>
                  <Td className="tnum whitespace-nowrap text-[11.5px] text-info-fg">{call.tool}</Td>
                  <Td className="text-[12px] text-ink-2">{call.input}</Td>
                  <Td className="text-[12px] text-ink-2">{call.result}</Td>
                  <Td><Badge variant={call.policy === "human gate" ? "warn" : "neutral"}>{call.policy}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card className="mb-4">
          <CardHeader title="Orchestrator log" icon="spark" />
          <ol className="space-y-1.5">
            {run.orchestratorLog.map((l, i) => (
              <li key={i} className="flex items-start gap-2 text-[12.5px] text-ink-2">
                <span className="tnum mt-0.5 text-faint">{i + 1}.</span>
                {l}
              </li>
            ))}
          </ol>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {run.agentResults.map((a) => (
            <Card key={a.agent}>
              <CardHeader
                title={a.agent}
                subtitle={`${a.findings.length} finding${a.findings.length === 1 ? "" : "s"} · ${a.durationMs}ms`}
                right={
                  <Badge variant={a.status === "ok" ? "pos" : a.status === "degraded" ? "warn" : "crit"} dot>
                    {a.status}
                  </Badge>
                }
              />
              <ol className="space-y-2">
                {a.steps.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 w-[68px] shrink-0 text-right text-[9.5px] font-semibold tracking-wide text-faint">
                      {PHASE_LABEL[s.phase]}
                    </span>
                    <span className="mt-0.5 h-3 w-px shrink-0 bg-border" />
                    <span className="text-[12px] leading-relaxed text-ink-2">{s.message}</span>
                  </li>
                ))}
              </ol>
            </Card>
          ))}
        </div>
      </section>

      {/* Immutable audit chain */}
      <section>
        <h2 className="mb-3 text-[15px] font-semibold text-ink">Immutable audit log</h2>
        <Card pad={false}>
          <div className="flex items-center gap-2 border-b border-border px-5 py-3 text-[12px] text-muted">
            <Icon name="lock" size={14} className="text-pos-fg" />
            Hash-chained · {db.AUDIT.length} entries · each hash binds the previous, so any edit breaks the chain.
          </div>
          <Table>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>Time</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Detail</Th>
                <Th>Tier</Th>
                <Th>Hash</Th>
              </tr>
            </thead>
            <tbody>
              {db.AUDIT.map((e) => (
                <tr key={e.seq} className="hover:bg-surface-2/40">
                  <Td className="tnum text-faint">{e.seq}</Td>
                  <Td className="whitespace-nowrap tnum text-[11.5px] text-muted">{fmtDateTime(e.at)}</Td>
                  <Td className="whitespace-nowrap text-[12px] font-medium text-ink">{e.actor}</Td>
                  <Td className="whitespace-nowrap tnum text-[11.5px] text-info-fg">{e.action}</Td>
                  <Td className="max-w-[320px] text-[12px]">{e.detail}</Td>
                  <Td>{e.tier ? <TierBadge tier={e.tier as ApprovalTier} /> : <span className="text-faint">—</span>}</Td>
                  <Td className="whitespace-nowrap">
                    <span className="tnum text-[11px] text-faint" title={`prev ${e.prevHash}`}>
                      {shortId(e.hash, 10)}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </section>
    </div>
  );
}
