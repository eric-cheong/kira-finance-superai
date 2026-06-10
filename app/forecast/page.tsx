import * as db from "@/lib/data/store";
import { fmtDate, money } from "@/lib/format";
import type { ForecastBucket, ForecastItem, ForecastItemKind } from "@/lib/types";
import {
  Badge,
  Bar,
  Card,
  CardHeader,
  ConfidenceChip,
  Icon,
  PageHeader,
  StatTile,
} from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { DisclaimerBanner } from "@/components/disclaimer-banner";

export const metadata = { title: "Cashflow Forecast · Kira" };

const KIND_STYLE: Record<ForecastItemKind, { icon: "arrowUpRight" | "arrowRight" | "clock" | "alert"; label: string; cls: string }> = {
  income: { icon: "arrowUpRight", label: "inflow", cls: "text-brand/60" },
  expense: { icon: "arrowRight", label: "outflow", cls: "text-muted" },
  committed: { icon: "clock", label: "committed", cls: "text-muted" },
  pending: { icon: "alert", label: "pending approval", cls: "text-brand/60" },
};

function ForecastItemRow({ item }: { item: ForecastItem }) {
  const k = KIND_STYLE[item.kind];
  return (
    <div className="flex items-start gap-3 border-b border-border py-2.5 last:border-0">
      <Icon name={k.icon} size={14} className={cn("mt-0.5 shrink-0", k.cls)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[13px] font-medium text-ink">{item.label}</span>
          <span className="tnum shrink-0 text-[13px] font-semibold text-ink">
            {item.kind === "income" ? "+" : "−"}{money(item.amountMinor, item.currency)}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11.5px] text-muted">
          <span>Due {fmtDate(item.dueDate)}</span>
          <span className="text-faint">·</span>
          <span>{item.source}</span>
          <ConfidenceChip value={item.confidence} showWord={false} />
        </div>
      </div>
    </div>
  );
}

function BucketCard({ bucket }: { bucket: ForecastBucket }) {
  const isPositive = bucket.net >= 0;
  const maxFlow = Math.max(bucket.inflow, bucket.outflow, 1);
  return (
    <Card>
      <CardHeader
        title={bucket.label}
        subtitle={`${fmtDate(bucket.periodStart)} – ${fmtDate(bucket.periodEnd)}`}
        icon="forecast"
        right={
          <Badge variant={isPositive ? "pos" : "crit"}>
            {isPositive ? "+" : ""}{money(bucket.net, "MYR", { compact: true })} net
          </Badge>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border px-3 py-2.5">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-faint">Inflow</div>
          <div className="tnum text-[17px] font-semibold text-ink">{money(bucket.inflow, "MYR", { compact: true })}</div>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-brand/55" style={{ width: `${(bucket.inflow / maxFlow) * 100}%` }} />
          </div>
        </div>
        <div className="rounded-lg border border-border px-3 py-2.5">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-faint">Outflow</div>
          <div className="tnum text-[17px] font-semibold text-ink">{money(bucket.outflow, "MYR", { compact: true })}</div>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-faint/70" style={{ width: `${(bucket.outflow / maxFlow) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="space-y-0">
        {bucket.items.map((item) => (
          <ForecastItemRow key={item.id} item={item} />
        ))}
      </div>
    </Card>
  );
}

export default function ForecastPage() {
  const buckets = db.FORECAST_BUCKETS;
  const totalInflow = buckets.reduce((s, b) => s + b.inflow, 0);
  const totalOutflow = buckets.reduce((s, b) => s + b.outflow, 0);
  const totalNet = totalInflow - totalOutflow;
  const avgConfidence = Math.round(
    buckets.flatMap((b) => b.items).reduce((s, i) => s + i.confidence, 0) /
      Math.max(buckets.flatMap((b) => b.items).length, 1),
  );

  const pendingItems = buckets.flatMap((b) => b.items).filter((i) => i.kind === "pending");

  return (
    <div className="animate-in space-y-6">
      <PageHeader
        title="Cashflow forecast"
        description="A 90-day projection built from confirmed commitments, recurring patterns, open invoices, and pending bookings. Figures are informational — the agent never initiates or executes payments."
        badge={<Badge variant="neutral">informational · not financial advice</Badge>}
      />

      <DisclaimerBanner />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatTile
          label="90-day inflow"
          value={money(totalInflow, "MYR", { compact: true })}
          sub="projected · all buckets"
          icon="arrowUpRight"
          tone="pos"
        />
        <StatTile
          label="90-day outflow"
          value={money(totalOutflow, "MYR", { compact: true })}
          sub="projected · all buckets"
          icon="arrowRight"
          tone="neutral"
        />
        <StatTile
          label="Net position"
          value={`${totalNet >= 0 ? "+" : ""}${money(totalNet, "MYR", { compact: true })}`}
          sub="3-month rolling"
          icon="forecast"
          tone={totalNet >= 0 ? "pos" : "crit"}
        />
        <StatTile
          label="Avg confidence"
          value={`${avgConfidence}%`}
          sub="across all forecast items"
          icon="spark"
          tone="brand"
        />
      </div>

      {pendingItems.length > 0 && (
        <Card>
          <CardHeader title="Pending approval items affect the forecast" icon="alert" />
          <div className="space-y-2">
            {pendingItems.map((p) => (
              <div key={p.id} className="flex flex-col items-start gap-2 rounded-lg border border-info-fg/20 bg-info-bg px-3 py-2.5 sm:flex-row sm:justify-between">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-ink">{p.label}</div>
                  <div className="mt-0.5 text-[12px] text-muted">Due {fmtDate(p.dueDate)} · {p.source}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="tnum text-[13px] font-semibold text-ink">{money(p.amountMinor, p.currency)}</span>
                  <Badge variant="info">pending</Badge>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-muted">
            These items are in the forecast but not yet committed. Approve or reject them in{" "}
            <a href="/bookings" className="font-medium text-brand hover:underline">Bookings</a> or{" "}
            <a href="/approvals" className="font-medium text-brand hover:underline">Approvals</a>.
          </p>
        </Card>
      )}

      {/* 90-day bar overview */}
      <Card>
        <CardHeader title="3-month overview" subtitle="Inflow vs outflow per period" icon="analytics" />
        <div className="space-y-4">
          {buckets.map((b) => {
            const maxFlow = Math.max(b.inflow, b.outflow, 1);
            return (
              <div key={b.label}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="text-[13px] font-medium text-ink">{b.label}</span>
                  <span className="tnum text-[12.5px] font-semibold text-ink">
                    {b.net >= 0 ? "+" : ""}{money(b.net, "MYR", { compact: true })} net
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-14 shrink-0 text-right text-[11px] text-faint">in</span>
                    <div className="flex-1 overflow-hidden rounded-full bg-surface-2" style={{ height: 8 }}>
                      <div className="h-full rounded-full bg-brand/55" style={{ width: `${(b.inflow / maxFlow) * 100}%` }} />
                    </div>
                    <span className="tnum w-20 shrink-0 text-right text-[11.5px] text-ink">{money(b.inflow, "MYR", { compact: true })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-14 shrink-0 text-right text-[11px] text-faint">out</span>
                    <div className="flex-1 overflow-hidden rounded-full bg-surface-2" style={{ height: 8 }}>
                      <div className="h-full rounded-full bg-faint/70" style={{ width: `${(b.outflow / maxFlow) * 100}%` }} />
                    </div>
                    <span className="tnum w-20 shrink-0 text-right text-[11.5px] text-ink">{money(b.outflow, "MYR", { compact: true })}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="space-y-4">
        <h2 className="text-[15px] font-semibold text-ink">Detailed breakdown</h2>
        {buckets.map((b) => (
          <BucketCard key={b.label} bucket={b} />
        ))}
      </div>

      <Card>
        <CardHeader title="Forecast methodology" icon="doc" />
        <div className="grid gap-3 text-[12.5px] leading-relaxed text-ink-2 sm:grid-cols-2">
          {[
            { title: "Committed items", body: "Bookings, signed leases, and open e-invoices with high confidence (>85%)." },
            { title: "Recurring patterns", body: "Payroll schedules, supplier reorder cycles, and subscription fees inferred from transaction history." },
            { title: "Income estimates", body: "Wholesale pipeline and retail revenue estimated from trailing 3-month averages. Lower confidence." },
            { title: "Pending items", body: "Booking quotes and unapproved expenses are included but flagged separately so their impact is visible before you decide." },
          ].map((s) => (
            <div key={s.title} className="rounded-lg border border-border px-4 py-3">
              <div className="mb-1 font-semibold text-ink">{s.title}</div>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 border-t border-border pt-3 text-[11.5px] italic text-faint">
          This forecast is informational only. Kira never initiates, schedules, or executes any payment, disbursement, or
          money movement based on forecast data.
        </p>
      </Card>
    </div>
  );
}
