import Link from "next/link";
import { runDailyBriefing } from "@/lib/agents";
import type { AgentResult } from "@/lib/agents/types";
import * as db from "@/lib/data/store";
import { fmtDate, fmtTime } from "@/lib/format";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { FindingCard } from "@/components/finding-card";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  StatTile,
  Bar,
  Icon,
} from "@/components/ui";

function AgentRow({ a }: { a: AgentResult }) {
  const last = a.steps[a.steps.length - 1];
  const statusTone = a.status === "ok" ? "bg-pos-fg" : a.status === "degraded" ? "bg-warn-fg" : "bg-crit-fg";
  return (
    <div className="flex items-start gap-2.5 py-2">
      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${statusTone}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-medium text-ink">{a.agent}</span>
          <span className="shrink-0 tnum text-[11px] text-faint">{a.durationMs}ms</span>
        </div>
        {last && <p className="mt-0.5 truncate text-[11.5px] text-muted">{last.message}</p>}
      </div>
      {a.phase === 2 && (
        <span className="mt-0.5 rounded border border-border px-1 text-[9.5px] font-semibold text-faint">P2</span>
      )}
    </div>
  );
}

export default function BriefingPage() {
  const run = runDailyBriefing();
  const m = db.matchStats();
  const cr = db.closeReadiness();
  const ei = db.einvoiceStats();

  return (
    <div className="animate-in space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">Good morning, Amir</h1>
            <Badge variant="brand" dot>
              live run
            </Badge>
          </div>
          <p className="mt-1 text-[13.5px] text-muted">
            {fmtDate(db.NOW)} · {fmtTime(db.NOW)} MYT · {run.context.orgName} ·{" "}
            <span className="tnum">{run.runId}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" icon="audit" size="sm" href="/audit">
            View agent reasoning
          </Button>
          <Button variant="primary" icon="approvals" size="sm" href="/approvals">
            {run.topline.approvalsCount} approvals
          </Button>
        </div>
      </div>

      {/* Topline */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
        <p className="text-[14px] leading-relaxed text-ink-2">
          <Icon name="spark" size={15} className="mr-1.5 inline -translate-y-px text-brand" />
          {run.topline.headline}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Imported" value={m.total} sub="transactions overnight" icon="transactions" />
        <StatTile label="Auto-matched" value={`${m.matchedPct}%`} sub={`${m.matched} of ${m.total} lines`} icon="check" tone="pos" />
        <StatTile label="Need approval" value={run.topline.approvalsCount} sub={`${run.topline.escalationsCount} escalations`} icon="approvals" tone="warn" />
        <StatTile label="Close-readiness" value={`${cr.score}%`} sub={`${ei.validated + ei.submitted}/${ei.total} e-invoices healthy`} icon="spark" tone="brand" />
      </div>

      <DisclaimerBanner />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-6">
          {/* Approvals tray */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                <Icon name="approvals" size={17} className="text-warn-fg" />
                Needs your approval
                <span className="rounded-full bg-warn-bg px-1.5 py-0.5 text-2xs font-semibold text-warn-fg">
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
              Full reasoning & audit chain
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
    </div>
  );
}
