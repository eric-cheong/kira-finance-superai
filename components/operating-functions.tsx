import Link from "next/link";
import {
  Badge,
  Bar,
  Button,
  Card,
  CardHeader,
  Icon,
  KeyValue,
  StatTile,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { cn } from "@/components/ui/cn";
import type { OperatingFunction } from "@/lib/operating-functions";
import { KIRA_LOOP, OPERATING_FUNCTIONS } from "@/lib/operating-functions";

type Tone = "neutral" | "pos" | "warn" | "crit" | "info" | "brand";

const STATUS_COPY: Record<OperatingFunction["workflowStatus"], string> = {
  running: "Running",
  approval: "Approval gate",
  queued: "Queued",
};

const STATUS_TONE: Record<OperatingFunction["workflowStatus"], Tone> = {
  running: "info",
  approval: "neutral",
  queued: "neutral",
};

function statusBadge(status: OperatingFunction["workflowStatus"]) {
  return (
    <Badge variant={STATUS_TONE[status]} dot>
      {STATUS_COPY[status]}
    </Badge>
  );
}

function ListBlock({
  title,
  items,
  icon,
}: {
  title: string;
  items: readonly string[];
  icon: "database" | "alert" | "benchmark" | "spark" | "workflow" | "route" | "timeline";
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3.5 py-3.5">
      <div className="mb-2.5 flex items-center gap-2 text-[12.5px] font-semibold text-ink">
        <Icon name={icon} size={15} className="text-faint" />
        {title}
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-muted">
            <Icon name="dot" size={9} className="mt-1.5 shrink-0 text-faint" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OperatingFunctionsLandingSection() {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface/85 shadow-card">
      <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
        <div className="p-5 sm:p-6">
          <div className="max-w-3xl">
            <h2 className="text-[26px] font-semibold text-ink sm:text-[32px]">
              One platform. Every operating function.
            </h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-2">
              KIRA benchmarks the workflows that decide cash, margin, growth, and customer experience — then runs the AI workflows to improve them.
            </p>
            <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-muted">
              Most tools show dashboards. KIRA finds the operating gap, calculates what it is worth, and launches the workflow to close it across ERP, CRM, helpdesk, email, spreadsheets, billing systems, and communication tools.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {KIRA_LOOP.map((step, index) => (
              <div key={step} className="flex items-center gap-2">
                <Badge variant={index >= 4 ? "brand" : "neutral"}>{step}</Badge>
                {index < KIRA_LOOP.length - 1 && <Icon name="arrowRight" size={13} className="text-faint" />}
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button variant="primary" icon="benchmark" href="/operating-functions" className="w-full sm:w-auto">
              Map your operating gaps
            </Button>
            <Button variant="outline" icon="workflow" href="/operating-functions" className="w-full sm:w-auto">
              See what KIRA can automate
            </Button>
          </div>
        </div>

        <div className="border-t border-border bg-surface-2/60 p-5 lg:border-l lg:border-t-0">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11.5px] font-semibold uppercase tracking-wide text-faint">Operating impact</span>
            <Badge variant="brand" dot>
              approval-gated
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {OPERATING_FUNCTIONS.slice(0, 4).map((fn) => (
              <div key={fn.id} className="rounded-lg border border-border bg-surface px-3 py-2.5 shadow-none">
                <div className="text-[12.5px] font-semibold text-ink">{fn.shortName}</div>
                <div className="mt-1 tnum text-[12px] text-brand">{fn.impactMetric}</div>
                <div className="mt-0.5 text-[12px] leading-snug text-muted">{fn.financialImpact}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-muted">
            KIRA does not overrun the operator. Permissions, approvals, escalation rules, and audit logs stay attached to every workflow.
          </p>
        </div>
      </div>

      <Table>
        <thead>
          <tr>
            <Th className="w-[22%]">Function</Th>
            <Th>Detection intelligence</Th>
            <Th>Execution workflows</Th>
          </tr>
        </thead>
        <tbody>
          {OPERATING_FUNCTIONS.map((fn) => (
            <tr key={fn.id} className="transition hover:bg-surface-2/40">
              <Td>
                <div className="font-semibold text-ink">{fn.function}</div>
                <div className="mt-0.5 text-[12px] text-muted">{fn.financialImpact}</div>
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1.5">
                  {fn.detects.map((item) => (
                    <Badge key={item} variant="neutral">
                      {item}
                    </Badge>
                  ))}
                </div>
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1.5">
                  {fn.runs.map((item) => (
                    <Badge key={item} variant="brand">
                      {item}
                    </Badge>
                  ))}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </section>
  );
}

function ModuleList({ functions }: { functions: readonly OperatingFunction[] }) {
  return (
    <Card className="lg:sticky lg:top-20 lg:self-start" pad={false}>
      <div className="border-b border-border px-4 py-4">
        <CardHeader title="Modules" subtitle="Functions KIRA can benchmark and operate" icon="module" />
      </div>
      <ul className="divide-y divide-border p-0">
        {functions.map((fn) => (
          <li key={fn.id}>
            <Link href={`#${fn.id}`} className="group flex min-h-11 px-4 py-3 transition hover:bg-surface-2/70 sm:min-h-10">
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-ink group-hover:text-brand">{fn.function}</div>
                  <div className="mt-0.5 truncate text-[12px] text-muted">{fn.financialImpact}</div>
                </div>
                <Icon name="chevronRight" size={15} className="shrink-0 text-faint" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function FunctionModule({ fn }: { fn: OperatingFunction }) {
  const progress = fn.workflowStatus === "running" ? 74 : fn.workflowStatus === "approval" ? 48 : 28;

  return (
    <section id={fn.id} className="scroll-mt-20">
      <Card pad={false}>
        <div className="border-b border-border px-5 pt-5">
          <CardHeader
            title={fn.function}
            subtitle={`${fn.financialImpact} · ${fn.impactEstimate}`}
            icon="workflow"
            right={statusBadge(fn.workflowStatus)}
          />
        </div>

        <div className="grid gap-0 divide-y divide-border border-b border-border md:grid-cols-4 md:divide-x md:divide-y-0">
          <div className="p-4">
            <div className="text-[11.5px] font-semibold uppercase tracking-wide text-faint">Detected risks</div>
            <div className="mt-2 tnum text-2xl font-semibold text-ink">{fn.riskCount}</div>
          </div>
          <div className="p-4">
            <div className="text-[11.5px] font-semibold uppercase tracking-wide text-faint">Benchmark gap</div>
            <div className="mt-2 text-[13px] font-medium leading-snug text-ink">{fn.benchmarkGap}</div>
          </div>
          <div className="p-4">
            <div className="text-[11.5px] font-semibold uppercase tracking-wide text-faint">Estimated impact</div>
            <div className="mt-2 text-[13px] font-medium leading-snug text-brand">{fn.impactEstimate}</div>
          </div>
          <div className="p-4">
            <div className="text-[11.5px] font-semibold uppercase tracking-wide text-faint">Human approvals</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="tnum text-2xl font-semibold text-ink">{fn.approvalsRequired}</span>
              <span className="text-[12px] text-muted">required</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-[1fr_270px]">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[14px] font-semibold text-ink">Recommended workflows</h3>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">Detection intelligence separated from workflow execution.</p>
              </div>
              <Badge variant="neutral">{fn.workflowStatus === "approval" ? "operator review" : "policy checked"}</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <ListBlock title="Signals detected" items={fn.signalsDetected} icon="alert" />
              <ListBlock title="AI workflows available" items={fn.workflowsAvailable} icon="workflow" />
              <ListBlock title="Benchmarks used" items={fn.benchmarksUsed} icon="benchmark" />
              <ListBlock title="Recommended actions" items={fn.recommendedActions} icon="spark" />
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-border bg-surface-2/45 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12.5px] font-semibold text-ink">Workflow status</span>
                <span className="tnum text-[12px] text-muted">{progress}%</span>
              </div>
              <Bar value={progress} tone={STATUS_TONE[fn.workflowStatus]} />
              <div className="mt-3 space-y-1.5">
                <KeyValue k="Systems" v="ERP · CRM · Email · Tasks" />
                <KeyValue k="Approval model" v={fn.approvalsRequired > 0 ? "Human-in-loop" : "No approval"} />
                <KeyValue k="Audit" v="Immutable trail" />
              </div>
            </div>

            <ListBlock title="Inputs" items={fn.inputs} icon="database" />
          </aside>
        </div>

        <div className="grid gap-4 border-t border-border bg-surface-2/35 p-5 lg:grid-cols-3">
          <ListBlock title="Escalation rules" items={fn.escalationRules} icon="route" />
          <ListBlock title="Audit trail" items={fn.auditTrail} icon="timeline" />
          <div className="rounded-lg border border-border bg-surface px-3.5 py-3.5">
            <div className="mb-2.5 flex items-center gap-2 text-[12.5px] font-semibold text-ink">
              <Icon name="hash" size={15} className="text-faint" />
              Workflow logic
            </div>
            <ol className="space-y-2">
              {fn.workflowLogic.map((step, index) => (
                <li key={step} className="flex gap-2 text-[12.5px] leading-relaxed text-muted">
                  <span className="tnum mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Card>
    </section>
  );
}

export function OperatingFunctionsModulePage() {
  const totalRisks = OPERATING_FUNCTIONS.reduce((sum, fn) => sum + fn.riskCount, 0);
  const totalApprovals = OPERATING_FUNCTIONS.reduce((sum, fn) => sum + fn.approvalsRequired, 0);
  const running = OPERATING_FUNCTIONS.filter((fn) => fn.workflowStatus === "running").length;
  const approval = OPERATING_FUNCTIONS.filter((fn) => fn.workflowStatus === "approval").length;

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatTile label="Functions" value={OPERATING_FUNCTIONS.length} sub="operating modules" icon="module" tone="brand" />
        <StatTile label="Detected risks" value={totalRisks} sub="open across functions" icon="alert" tone="neutral" />
        <StatTile label="Running workflows" value={running} sub={`${approval} approval-gated`} icon="workflow" tone="info" />
        <StatTile label="Approvals" value={totalApprovals} sub="human decisions required" icon="approvals" tone="neutral" />
      </div>

      <Card>
        <CardHeader title="KIRA operating loop" subtitle="The same control loop applies across every function." icon="benchmark" />
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {KIRA_LOOP.map((step, index) => (
            <div key={step} className={cn("rounded-lg border px-3 py-3", index >= 4 ? "border-brand/20 bg-brand-soft" : "border-border bg-surface-2/45")}>
              <div className="tnum text-[11px] font-semibold text-faint">{String(index + 1).padStart(2, "0")}</div>
              <div className="mt-1 text-[13px] font-semibold text-ink">{step}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <ModuleList functions={OPERATING_FUNCTIONS} />
        <div className="space-y-6">
          {OPERATING_FUNCTIONS.map((fn) => (
            <FunctionModule key={fn.id} fn={fn} />
          ))}
        </div>
      </div>
    </>
  );
}
