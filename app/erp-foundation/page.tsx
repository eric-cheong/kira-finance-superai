import Link from "next/link";
import { erpFoundation, type FoundationActionContract, type FoundationTone } from "@/lib/erp-foundation";
import {
  ActionBadge,
  Badge,
  Bar,
  Button,
  Card,
  CardHeader,
  Icon,
  PageHeader,
  StatTile,
  Table,
  Td,
  Th,
  TierBadge,
} from "@/components/ui";

export const metadata = { title: "ERP Foundation · Kira" };

const STATUS_VARIANT: Record<FoundationActionContract["status"], FoundationTone> = {
  runs_now: "pos",
  approval_required: "warn",
  blocked: "crit",
};

function statusLabel(status: FoundationActionContract["status"]) {
  if (status === "runs_now") return "runs now";
  if (status === "approval_required") return "approval required";
  return "blocked";
}

function toneLabel(tone: FoundationTone) {
  if (tone === "pos") return "ready";
  if (tone === "warn") return "gated";
  if (tone === "crit") return "blocked";
  if (tone === "info") return "live";
  if (tone === "brand") return "wired";
  return "tracked";
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-3">
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      {subtitle && <p className="mt-1 text-[13px] leading-relaxed text-muted">{subtitle}</p>}
    </div>
  );
}

export default function ErpFoundationPage() {
  const foundation = erpFoundation();

  return (
    <div className="animate-in space-y-6">
      <PageHeader
        title="KIRA ERP foundation"
        description="A single control plane for the MVP: structured finance data, source-grounded agent answers, permissioned actions, and a full audit trail across accounting, AR, AP, banking, reconciliation, approvals, workflows, and reports."
        badge={<Badge variant="brand" dot>MVP control plane</Badge>}
        actions={
          <>
            <Button variant="outline" icon="audit" href="/audit">
              Audit trail
            </Button>
            <Button variant="primary" icon="closeBooks" href="/erp-close">
              AP close
            </Button>
          </>
        }
      />

      <div className="rounded-lg border border-brand/15 bg-brand-soft/55 px-3.5 py-3 sm:p-4">
        <p className="text-[14px] leading-relaxed text-ink-2">
          <Icon name="spark" size={15} className="mr-1.5 inline -translate-y-px text-brand/70" />
          {foundation.headline}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatTile
          label="ERP domains"
          value={`${foundation.stats.modulesReady}/${foundation.stats.moduleCount}`}
          sub="wired into the control plane"
          icon="module"
          tone="brand"
        />
        <StatTile
          label="Structured objects"
          value={foundation.stats.structuredObjects}
          sub="typed records and evidence"
          icon="database"
          tone="info"
        />
        <StatTile
          label="Open approvals"
          value={foundation.stats.openApprovals}
          sub="default remains no action"
          icon="approvals"
          tone="warn"
        />
        <StatTile
          label="Audit chain"
          value={foundation.stats.auditVerified ? "verified" : "broken"}
          sub={`${foundation.stats.auditEntries} entries`}
          icon="hash"
          tone={foundation.stats.auditVerified ? "pos" : "crit"}
        />
      </div>

      <section>
        <SectionTitle
          title="Module coverage"
          subtitle="What is wired now. Scores reflect MVP foundation coverage; each card still shows live exceptions, blockers, and pending approvals."
        />
        <div className="grid gap-3 lg:grid-cols-3">
          {foundation.modules.map((module) => (
            <Card key={module.id} className="flex min-h-full flex-col">
              <CardHeader
                title={module.label}
                subtitle={`${module.owner} · ${module.status}`}
                icon={module.icon}
                right={<Badge variant={module.tone} dot>{toneLabel(module.tone)}</Badge>}
              />
              <p className="min-h-[72px] text-[13px] leading-relaxed text-ink-2">{module.purpose}</p>
              <div className="mt-3 flex items-center gap-3">
                <Bar value={module.score} tone={module.tone} />
                <span className="tnum shrink-0 text-[12px] font-semibold text-ink">{module.score}%</span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {module.metrics.map((metric) => (
                  <div key={`${module.id}-${metric.label}`} className="rounded-lg border border-border bg-surface-2/45 px-3 py-2.5">
                    <div className="truncate text-[12px] text-faint">{metric.label}</div>
                    <div className="tnum mt-1 truncate text-[14px] font-semibold text-ink">{metric.value}</div>
                    {metric.sub && <div className="mt-0.5 truncate text-[12px] text-muted">{metric.sub}</div>}
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2.5 text-[12.5px] leading-relaxed text-muted">
                <div>
                  <span className="font-medium text-ink">Data:</span>{" "}
                  {module.structuredData.slice(0, 4).join(" · ")}
                </div>
                <div>
                  <span className="font-medium text-ink">Evidence:</span>{" "}
                  {module.sourceGrounding.slice(0, 3).join(" · ")}
                </div>
              </div>
              <Link
                href={module.href}
                className="btn-lift -mx-2.5 mt-3 inline-flex min-h-11 items-center gap-1.5 self-start rounded-lg px-2.5 text-[13px] font-medium text-brand transition hover:bg-brand-soft/60 sm:min-h-10"
              >
                Open {module.shortLabel}
                <Icon name="arrowRight" size={14} />
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <SectionTitle
            title="Permissioned action contract"
            subtitle="The MVP proves that agents can explain, recommend, and execute only inside explicit action boundaries."
          />
          <Card pad={false}>
            <Table>
              <thead>
                <tr>
                  <Th>Action</Th>
                  <Th>Class</Th>
                  <Th>Tier</Th>
                  <Th>Status</Th>
                  <Th>Evidence</Th>
                  <Th>Default</Th>
                </tr>
              </thead>
              <tbody>
                {foundation.actionContracts.map((action) => (
                  <tr key={action.action} className="transition hover:bg-surface-2/40">
                    <Td>
                      <Link href={action.route} className="-mx-2 inline-flex min-h-9 items-center rounded-lg px-2 font-medium text-ink transition hover:bg-surface-2/70 hover:text-brand">
                        {action.action}
                      </Link>
                    </Td>
                    <Td><ActionBadge value={action.actionClass} /></Td>
                    <Td><TierBadge tier={action.tier} /></Td>
                    <Td><Badge variant={STATUS_VARIANT[action.status]} dot>{statusLabel(action.status)}</Badge></Td>
                    <Td className="max-w-[260px] text-[12.5px] leading-relaxed text-muted">{action.evidence.join(" · ")}</Td>
                    <Td className="max-w-[220px] text-[12.5px] leading-relaxed text-muted">{action.defaultOnAmbiguity}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>

        <aside className="min-w-0">
          <SectionTitle title="Audit coverage" subtitle="Mutation evidence available to admins and auditors." />
          <div className="space-y-3">
            {foundation.auditCoverage.map((metric) => (
              <Card key={metric.label}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[12.5px] text-muted">{metric.label}</div>
                    <div className="tnum mt-1.5 text-[20px] font-semibold leading-none text-ink">{metric.value}</div>
                    {metric.sub && <div className="mt-1.5 text-[12px] text-faint">{metric.sub}</div>}
                  </div>
                  <Badge variant={metric.tone ?? "neutral"}>{toneLabel(metric.tone ?? "neutral")}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </aside>
      </section>

      <section>
        <SectionTitle
          title="Source-grounded answers"
          subtitle="Representative finance questions the current ERP foundation can answer with citations and action boundaries."
        />
        <div className="grid gap-3 lg:grid-cols-3">
          {foundation.groundedAnswers.map((answer) => (
            <Card key={answer.question}>
              <CardHeader title={answer.question} icon="search" />
              <p className="text-[13px] leading-relaxed text-ink-2">{answer.answer}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {answer.sources.map((source) => (
                  <Badge key={source} variant="neutral">{source}</Badge>
                ))}
              </div>
              <p className="mt-3 border-t border-border pt-3 text-[12.5px] leading-relaxed text-muted">{answer.actionBoundary}</p>
              <Link
                href={answer.route}
                className="btn-lift -mx-2.5 mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-brand transition hover:bg-brand-soft/60 sm:min-h-10"
              >
                Inspect evidence
                <Icon name="arrowRight" size={14} />
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle
          title="Data spine"
          subtitle="The product shape the MVP proves: typed inputs become grounded recommendations, gated actions, durable records, and audit evidence."
        />
        <Card pad={false}>
          <div className="grid divide-y divide-border lg:grid-cols-6 lg:divide-x lg:divide-y-0">
            {foundation.dataSpine.map((step, index) => (
              <div key={step.label} className="p-4 sm:p-5">
                <div className="flex items-center gap-2.5">
                  <span className="tnum flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-[12px] font-semibold text-brand">
                    {index + 1}
                  </span>
                  <h3 className="text-[13px] font-semibold text-ink">{step.label}</h3>
                </div>
                <p className="mt-3 min-h-[72px] text-[12.5px] leading-relaxed text-muted">{step.detail}</p>
                <div className="mt-3 space-y-1.5">
                  {step.objects.slice(0, 3).map((object) => (
                    <div key={object} className="truncate text-[12px] text-faint">{object}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
