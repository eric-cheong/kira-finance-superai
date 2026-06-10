import Link from "next/link";
import { Icon, type IconName } from "./ui/icons";
import { ActionBadge, Badge, Bar, ConfidenceChip, TierBadge } from "./ui/primitives";
import { cn } from "./ui/cn";
import type { Finding, FindingKind } from "@/lib/agents/types";

const KIND_ICON: Record<FindingKind, IconName> = {
  insight: "spark",
  anomaly: "alert",
  risk: "alert",
  news: "doc",
  market: "analytics",
  portfolio: "portfolio",
  compliance: "shield",
  approval: "approvals",
};

function pluralize(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function SourceLink({ href, label }: { href?: string; label: string }) {
  if (href && href.startsWith("http")) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1 text-muted underline-offset-2 hover:text-ink-2 hover:underline">
        <span className="truncate">{label}</span>
        <Icon name="arrowUpRight" size={11} />
      </a>
    );
  }
  return <span className="min-w-0 truncate text-muted">{label}</span>;
}

export function FindingCard({ finding: f }: { finding: Finding }) {
  const internalHref = f.relatedHref && !f.relatedHref.startsWith("http") ? f.relatedHref : undefined;
  const className = cn(
    "block rounded-lg border border-border bg-surface p-3.5 transition-colors sm:p-4",
    internalHref && "hover:border-border-strong",
  );

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className={cn("mt-0.5 shrink-0", f.escalate ? "text-warn-fg" : "text-muted")}>
            <Icon name={KIND_ICON[f.kind]} size={17} />
          </span>
          <div className="min-w-0">
            <h4 className="text-[14px] font-semibold leading-snug text-ink">{f.title}</h4>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{f.detail}</p>
          </div>
        </div>
        <span className="shrink-0">
          <ConfidenceChip value={f.confidence} showWord={false} />
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <ActionBadge value={f.actionClass} />
        {f.tier >= 2 && <TierBadge tier={f.tier} />}
        {f.escalate && (
          <Badge variant="warn" dot>
            escalated
          </Badge>
        )}
        {f.unverified && <Badge variant="crit">unable to verify</Badge>}
        {f.informational && <Badge variant="neutral">informational</Badge>}
      </div>

      <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
        <span className="hidden font-medium text-faint sm:inline">Source:</span>
        {f.sources.map((s, i) => (
          <span key={i} className="inline-flex min-w-0 items-center gap-2">
            <SourceLink href={i === 0 ? f.relatedHref : undefined} label={s} />
            {i < f.sources.length - 1 && <span aria-hidden className="text-faint">·</span>}
          </span>
        ))}
      </div>

      <p className="mt-2 rounded-md border border-border bg-surface-2/55 px-2.5 py-2 text-[12px] leading-relaxed text-muted">
        <span className="font-medium text-ink">Why this surfaced:</span> {f.rationale}
      </p>

      <div className="mt-2.5 rounded-lg border border-border bg-surface-2/45 p-2.5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-faint">
            <Icon name="timeline" size={13} />
            Agent trace
          </span>
          <Badge variant={f.escalate ? "warn" : "neutral"}>
            {f.escalate ? "human review" : "no action taken"}
          </Badge>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="min-w-0 rounded-md border border-border bg-surface px-2.5 py-2">
            <p className="truncate text-[11px] font-medium text-faint">Plan</p>
            <p className="mt-0.5 truncate text-[12px] text-ink">{f.agent}</p>
            <p className="mt-0.5 truncate text-[11.5px] text-muted">{f.kind} classification</p>
          </div>
          <div className="min-w-0 rounded-md border border-border bg-surface px-2.5 py-2">
            <p className="truncate text-[11px] font-medium text-faint">Tool calls</p>
            <p className="mt-0.5 truncate text-[12px] text-ink">{pluralize(f.sources.length, "source")} checked</p>
            <p className="mt-0.5 truncate text-[11.5px] text-muted">read-only evidence</p>
          </div>
          <div className="min-w-0 rounded-md border border-border bg-surface px-2.5 py-2">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="truncate text-[11px] font-medium text-faint">Progress</p>
              <span className="tnum shrink-0 text-[11px] text-muted">{f.confidence}%</span>
            </div>
            <Bar value={f.confidence} tone={f.band === "high" ? "pos" : f.band === "medium" ? "warn" : "crit"} />
          </div>
        </div>

        {f.escalate && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted">
            <span className="mr-0.5 font-medium text-ink">Placeholders:</span>
            {["Pause", "Edit plan", "Resume"].map((label) => (
              <span key={label} className="rounded-full border border-border bg-surface px-2 py-0.5 text-faint">
                {label}
              </span>
            ))}
          </div>
        )}
      </div>

      {f.disclaimer && (
        <p className="mt-2 border-t border-border pt-2 text-[11.5px] italic text-faint">{f.disclaimer}</p>
      )}
    </>
  );

  if (internalHref) {
    return (
      <Link href={internalHref} className={className}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}
