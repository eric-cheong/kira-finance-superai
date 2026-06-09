import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "./cn";
import { Icon, type IconName } from "./icons";
import { bandOf, TIER_LABEL, type ApprovalTier, type ActionClass } from "@/lib/types";

// ── Card ────────────────────────────────────────────────────────────────────

export function Card({
  children,
  className,
  pad = true,
}: {
  children: ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <div
      className={cn(
        "card overlay-surface min-w-0 border border-base-300 bg-base-100/80 text-base-content shadow-sm",
        pad && "p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon,
  right,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: IconName;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && (
          <span className="mt-0.5 text-muted">
            <Icon name={icon} size={18} />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="card-title text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

// ── Badge family ────────────────────────────────────────────────────────────

type Variant = "neutral" | "pos" | "warn" | "crit" | "info" | "brand";

const VARIANT: Record<Variant, string> = {
  neutral: "badge-outline border-base-300 bg-base-100 text-ink",
  pos: "badge-outline border-primary/20 bg-primary/5 text-ink",
  warn: "badge-outline border-primary/20 bg-primary/5 text-ink",
  crit: "badge-error text-error-content",
  info: "badge-outline border-primary/20 bg-primary/5 text-ink",
  brand: "badge-primary text-primary-content",
};

export function Badge({
  children,
  variant = "neutral",
  className,
  dot = false,
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-2xs font-medium",
        "badge badge-sm min-h-0 h-auto",
        VARIANT[variant],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

export function ConfidenceChip({ value, showWord = true }: { value: number; showWord?: boolean }) {
  const band = bandOf(value);
  const variant: Variant = band === "high" ? "pos" : band === "medium" ? "warn" : "crit";
  const word = band === "high" ? "high" : band === "medium" ? "medium" : "low";
  return (
    <Badge variant={variant} className="tnum">
      {value}%{showWord && <span className="font-normal opacity-70">· {word}</span>}
    </Badge>
  );
}

const TIER_VARIANT: Record<ApprovalTier, Variant> = { 1: "neutral", 2: "info", 3: "warn", 4: "crit" };

export function TierBadge({ tier }: { tier: ApprovalTier }) {
  return (
    <Badge variant={TIER_VARIANT[tier]}>
      T{tier} · {TIER_LABEL[tier]}
    </Badge>
  );
}

const ACTION_VARIANT: Record<ActionClass, Variant> = {
  "read-only": "neutral",
  suggestion: "info",
  notification: "info",
  "human-approved": "warn",
  prohibited: "crit",
};

export function ActionBadge({ value }: { value: ActionClass }) {
  return <Badge variant={ACTION_VARIANT[value]}>{value}</Badge>;
}

// ── Stat tile ───────────────────────────────────────────────────────────────

export function StatTile({
  label,
  value,
  sub,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: IconName;
  tone?: Variant;
}) {
  const toneText: Record<Variant, string> = {
    neutral: "text-ink",
    pos: "text-ink",
    warn: "text-ink",
    crit: "text-crit-fg",
    info: "text-ink",
    brand: "text-ink",
  };
  return (
    <div className="stats min-w-0 border border-base-300 bg-base-100/80 shadow-sm">
      <div className="stat min-w-0 p-4">
        <div className="stat-figure text-ink">
          {icon && <Icon name={icon} size={16} />}
        </div>
        <div className="stat-title text-[12px] font-medium uppercase tracking-wide text-ink">{label}</div>
        <div className={cn("stat-value mt-1 text-2xl font-semibold tracking-[-0.02em] tnum", toneText[tone])}>
          {value}
        </div>
        {sub && <div className="stat-desc text-[12.5px] text-ink">{sub}</div>}
      </div>
    </div>
  );
}

// ── Misc layout primitives ──────────────────────────────────────────────────

export function Amount({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("tnum", className)}>{children}</span>;
}

export function Bar({ value, tone = "brand" }: { value: number; tone?: Variant }) {
  const bg: Record<Variant, string> = {
    neutral: "progress-neutral",
    pos: "progress-primary",
    warn: "progress-primary",
    crit: "progress-error",
    info: "progress-info",
    brand: "progress-primary",
  };
  const clamped = Math.max(2, Math.min(100, value));
  return (
    <progress className={cn("progress h-1.5 w-full bg-base-200", bg[tone])} value={clamped} max={100} />
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-border", className)} />;
}

export function KeyValue({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-[13px] text-muted">{k}</span>
      <span className="text-[13px] font-medium text-ink">{v}</span>
    </div>
  );
}

export function Avatar({ name, size = 30 }: { name: string; size?: number }) {
  const inits = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span className="avatar placeholder inline-flex shrink-0">
      <span
        className="inline-flex items-center justify-center rounded-full bg-primary/10 font-semibold text-primary"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {inits}
      </span>
    </span>
  );
}

export function EmptyState({ icon = "check", title, sub }: { icon?: IconName; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-muted">
        <Icon name={icon} size={20} />
      </span>
      <p className="text-[14px] font-medium text-ink">{title}</p>
      {sub && <p className="max-w-xs text-[13px] text-muted">{sub}</p>}
    </div>
  );
}

// ── Page scaffold ───────────────────────────────────────────────────────────

export function PageHeader({
  title,
  description,
  badge,
  actions,
}: {
  title: string;
  description?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">{title}</h1>
          {badge}
        </div>
        {description && <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">{actions}</div>}
    </div>
  );
}

export function Button({
  children,
  variant = "ghost",
  size = "md",
  icon,
  iconRight,
  className,
  type = "button",
  disabled,
  href,
  onClick,
}: {
  children: ReactNode;
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md";
  icon?: IconName;
  iconRight?: IconName;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const base =
    "btn inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";
  const sizes = { sm: "btn-sm h-8 min-h-8 px-2.5 text-[12.5px]", md: "btn-sm h-9 min-h-9 px-3.5 text-[13.5px]" };
  const variants = {
    primary: "btn-primary",
    ghost: "btn-ghost text-ink",
    outline: "btn-outline border-base-300 bg-base-100 text-ink hover:bg-base-200 hover:text-ink",
    danger: "btn-error",
  };
  const classes = cn(base, sizes[size], variants[variant], className);
  const inner = (
    <>
      {icon && <Icon name={icon} size={size === "sm" ? 14 : 16} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === "sm" ? 14 : 16} />}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={classes}>
        {inner}
      </Link>
    );
  }
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={classes}>
      {inner}
    </button>
  );
}

// ── Simple table primitives (consistent across data screens) ────────────────

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="table table-sm w-full text-left text-[13px] text-ink">{children}</table>
    </div>
  );
}

export function Th({ children, className, ...props }: { children?: ReactNode; className?: string } & ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn("border-b border-base-300 px-3 py-2.5 text-2xs font-semibold uppercase tracking-wide text-ink", className)} {...props}>
      {children}
    </th>
  );
}

export function Td({ children, className, ...props }: { children?: ReactNode; className?: string } & TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-b border-base-300 px-3 py-3 align-middle text-ink", className)} {...props}>{children}</td>;
}
