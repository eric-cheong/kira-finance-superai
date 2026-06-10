import Link from "next/link";
import { runDailyBriefing } from "@/lib/agents";
import type { AgentResult, LoopPhase } from "@/lib/agents/types";
import * as db from "@/lib/data/store";
import { fmtDate, fmtTime } from "@/lib/format";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { FindingCard } from "@/components/finding-card";
import { OperatingFunctionsLandingSection } from "@/components/operating-functions";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  StatTile,
  Bar,
  Icon,
} from "@/components/ui";

const LOOP_ORDER: LoopPhase[] = ["observe", "analyze", "plan", "act", "verify", "summarize", "escalate"];

const PLAN_STEPS = [
  "Resolve preferences",
  "Scan finance data",
  "Apply policy gate",
  "Queue approvals",
];

const TOOL_ACTIVITY = [
  { label: "ledger.scan", detail: "transactions + receipts", state: "complete" },
  { label: "forecast.project", detail: "cash range", state: "complete" },
  { label: "policy.evaluate", detail: "approval gates", state: "complete" },
];

function progressForStep(phase: LoopPhase) {
  const index = LOOP_ORDER.indexOf(phase);
  return Math.round(((index + 1) / LOOP_ORDER.length) * 100);
}

function AgentRow({ a }: { a: AgentResult }) {
  const last = a.steps[a.steps.length - 1];
  const statusTone = a.status === "ok" ? "bg-brand/45" : a.status === "degraded" ? "bg-brand/30" : "bg-crit-fg/80";
  const progress = last ? progressForStep(last.phase) : 0;
  const barTone = a.status === "ok" ? "pos" : a.status === "degraded" ? "warn" : "crit";
  return (
    <div className="flex items-start gap-2.5 py-2.5">
      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${statusTone}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-medium text-ink">{a.agent}</span>
          <span className="shrink-0 tnum text-[11px] text-faint">{a.durationMs}ms</span>
        </div>
        {last && <p className="mt-0.5 truncate text-[11.5px] text-muted">{last.message}</p>}
        <div className="mt-2 flex items-center gap-2">
          <Bar value={progress} tone={barTone} />
          <span className="tnum shrink-0 text-[10.5px] text-faint">{progress}%</span>
        </div>
      </div>
      {a.phase === 2 && (
        <span className="mt-0.5 rounded border border-border px-1 text-[9.5px] font-semibold text-faint">P2</span>
      )}
    </div>
  );
}

function RunCockpit({ approvalsCount }: { approvalsCount: number }) {
  return (
    <Card>
      <CardHeader
        title="Agent run cockpit"
        subtitle="Plan, tool activity, and review controls are visible here; pause/edit/resume are static placeholders."
        icon="workflow"
        right={<Badge variant="warn">{approvalsCount} waiting</Badge>}
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_0.9fr]">
        <div>
          <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-faint">Plan</p>
          <ol className="space-y-2">
            {PLAN_STEPS.map((step, index) => (
              <li key={step} className="flex items-center gap-2 rounded-lg border border-border bg-surface-2/45 px-3 py-2">
                <span className="tnum flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-[10px] text-faint">
                  {index + 1}
                </span>
                <span className="min-w-0 truncate text-[12.5px] font-medium text-ink">{step}</span>
                <Badge variant={index < 3 ? "pos" : "warn"} className="ml-auto">
                  {index < 3 ? "done" : "review"}
                </Badge>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-faint">Tool calls</p>
          <div className="space-y-2">
            {TOOL_ACTIVITY.map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-surface-2/45 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="tnum truncate text-[12px] font-medium text-info-fg">{item.label}</span>
                  <Badge variant="neutral">{item.state}</Badge>
                </div>
                <p className="mt-0.5 truncate text-[11.5px] text-muted">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-faint">Human controls</p>
          <div className="grid grid-cols-3 gap-2 xl:grid-cols-1">
            <Button disabled variant="outline" size="sm" icon="clock">
              Pause
            </Button>
            <Button disabled variant="outline" size="sm" icon="doc">
              Edit plan
            </Button>
            <Button disabled variant="outline" size="sm" icon="arrowRight">
              Resume
            </Button>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-muted">
            Placeholder controls show the intended reviewer loop without mutating run state.
          </p>
        </div>
      </div>
    </Card>
  );
}

export default function BriefingPage() {
  const run = runDailyBriefing();
  const m = db.matchStats();
  const cr = db.closeReadiness();
  const ei = db.einvoiceStats();
  const runDate = `${fmtDate(db.NOW)} · ${fmtTime(db.NOW)} MYT`;
  const runShortId = run.runId.replace(/^run_/, "");

  return (
    <div className="animate-in space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[22px] font-semibold text-ink">Good morning, Amir</h1>
            <Badge variant="neutral" dot>
              generated briefing
            </Badge>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13.5px] text-muted">
            <span>{runDate}</span>
            <span>{run.context.orgName}</span>
            <span className="hidden min-w-0 max-w-full truncate sm:inline">
              Run <span className="tnum">{runShortId}</span>
            </span>
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button className="flex-1 sm:flex-none" variant="primary" icon="approvals" size="sm" href="/approvals">
            {run.topline.approvalsCount} approvals
          </Button>
          <Button className="flex-1 sm:flex-none" variant="outline" icon="audit" size="sm" href="/audit">
            View run trace
          </Button>
        </div>
      </div>

      {/* Topline */}
      <div className="rounded-lg border border-brand/10 bg-brand-soft/55 px-3.5 py-3 sm:p-4">
        <p className="text-[14px] leading-relaxed text-ink-2">
          <Icon name="spark" size={15} className="mr-1.5 inline -translate-y-px text-brand/70" />
          {run.topline.headline}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatTile label="Imported" value={m.total} sub="transactions overnight" icon="transactions" />
        <StatTile label="Auto-matched" value={`${m.matchedPct}%`} sub={`${m.matched} of ${m.total} lines`} icon="check" tone="pos" />
        <StatTile label="Need approval" value={run.topline.approvalsCount} sub={`${run.topline.escalationsCount} escalations`} icon="approvals" tone="warn" />
        <StatTile label="Close-readiness" value={`${cr.score}%`} sub={`${ei.validated + ei.submitted}/${ei.total} e-invoices healthy`} icon="spark" tone="brand" />
      </div>

      <DisclaimerBanner />

      <RunCockpit approvalsCount={run.topline.approvalsCount} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-6">
          {/* Approvals tray */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                <Icon name="approvals" size={17} className="text-brand/60" />
                Needs your approval
                <span className="rounded-full bg-brand-soft px-1.5 py-0.5 text-2xs font-semibold text-ink">
                  {run.approvals.length}
                </span>
              </h2>
              <Link href="/approvals" className="text-[12.5px] font-medium text-brand hover:underline">
                Open queue →
              </Link>
            </div>
            <div className="space-y-3">
              {run.approvals.map((f) => (
                <FindingCard key={f.id} finding={f} />
              ))}
            </div>
          </section>

          {/* Briefing sections */}
          {run.sections.map((s) => (
            <section key={s.key}>
              <div className="mb-3">
                <h2 className="text-[15px] font-semibold text-ink">{s.title}</h2>
                {s.subtitle && <p className="text-[12.5px] text-muted">{s.subtitle}</p>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {s.findings.map((f) => (
                  <FindingCard key={f.id} finding={f} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Right rail */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader title="This run" subtitle={`${run.agentResults.length} agents · ${run.durationMs}ms`} icon="spark" />
            <div className="-my-1 divide-y divide-border">
              {run.agentResults.map((a) => (
                <AgentRow key={a.agent} a={a} />
              ))}
            </div>
            <Link href="/audit" className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-brand hover:underline">
              Full trace & audit chain
              <Icon name="arrowRight" size={13} />
            </Link>
          </Card>

          <Card>
            <CardHeader title="Close-readiness" icon="check" />
            <div className="mb-2 flex items-end justify-between">
              <span className="tnum text-2xl font-semibold text-ink">{cr.score}%</span>
              <span className="text-[12px] text-muted">month-end</span>
            </div>
            <Bar value={cr.score} tone={cr.score >= 80 ? "pos" : cr.score >= 60 ? "warn" : "crit"} />
            <ul className="mt-3 space-y-1.5">
              {cr.blockers.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] text-muted">
                  <Icon name="dot" size={10} className="mt-1 shrink-0 text-faint" />
                  {b}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Delivery" icon="bell" />
            <p className="text-[12.5px] leading-relaxed text-muted">{run.notificationNote}</p>
          </Card>
        </aside>
      </div>

      <div className="hidden lg:block">
        <OperatingFunctionsLandingSection />
      </div>
    </div>
  );
}
