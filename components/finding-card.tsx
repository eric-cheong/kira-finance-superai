import Link from "next/link";
import { Icon, type IconName } from "./ui/icons";
import { ActionBadge, Badge, ConfidenceChip, TierBadge } from "./ui/primitives";
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

function SourceLink({ href, label }: { href?: string; label: string }) {
  if (href && href.startsWith("http")) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted underline-offset-2 hover:text-ink-2 hover:underline">
        {label}
        <Icon name="arrowUpRight" size={11} />
      </a>
    );
  }
  return <span className="text-muted">{label}</span>;
}

export function FindingCard({ finding: f }: { finding: Finding }) {
  const internalHref = f.relatedHref && !f.relatedHref.startsWith("http") ? f.relatedHref : undefined;
  const className = cn(
    "block rounded-xl border border-border bg-surface p-4 shadow-card transition-colors",
    internalHref && "hover:border-border-strong",
  );

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className={cn("mt-0.5 shrink-0", f.escalate ? "text-warn-fg" : "text-muted")}>
            <Icon name={KIND_ICON[f.kind]} size={17} />
          </span>
          <div>
            <h4 className="text-[14px] font-semibold leading-snug text-ink">{f.title}</h4>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{f.detail}</p>
          </div>
        </div>
        <ConfidenceChip value={f.confidence} showWord={false} />
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

      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
        <span className="font-medium text-faint">Source:</span>
        {f.sources.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-2">
            <SourceLink href={i === 0 ? f.relatedHref : undefined} label={s} />
            {i < f.sources.length - 1 && <span className="text-border-strong">·</span>}
          </span>
        ))}
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
