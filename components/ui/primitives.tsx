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
        "min-w-0 rounded-xl border border-border bg-surface shadow-card",
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
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
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
  neutral: "bg-surface-2 text-ink-2 border-border",
  pos: "bg-pos-bg text-pos-fg border-pos-fg/15",
  warn: "bg-warn-bg text-warn-fg border-warn-fg/15",
  crit: "bg-crit-bg text-crit-fg border-crit-fg/15",
  info: "bg-info-bg text-info-fg border-info-fg/15",
  brand: "bg-brand-soft text-brand border-brand/15",
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
    pos: "text-pos-fg",
    warn: "text-warn-fg",
    crit: "text-crit-fg",
    info: "text-info-fg",
    brand: "text-brand",
  };
  return (
    <Card className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium uppercase tracking-wide text-faint">{label}</span>
        {icon && <Icon name={icon} size={16} className="text-faint" />}
      </div>
      <div className={cn("mt-1 text-2xl font-semibold tracking-[-0.02em] tnum", toneText[tone])}>
        {value}
      </div>
      {sub && <div className="text-[12.5px] text-muted">{sub}</div>}
    </Card>
  );
}

// ── Misc layout primitives ──────────────────────────────────────────────────

export function Amount({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("tnum", className)}>{children}</span>;
}

export function Bar({ value, tone = "brand" }: { value: number; tone?: Variant }) {
  const bg: Record<Variant, string> = {
    neutral: "bg-faint",
    pos: "bg-pos-fg",
    warn: "bg-warn-fg",
    crit: "bg-crit-fg",
    info: "bg-info-fg",
    brand: "bg-brand",
  };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div className={cn("h-full rounded-full", bg[tone])} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </div>
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
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {inits}
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
      {actions && <div className="flex items-center gap-2">{actions}</div>}
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
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";
  const sizes = { sm: "h-8 px-2.5 text-[12.5px]", md: "h-9 px-3.5 text-[13.5px]" };
  const variants = {
    primary: "bg-ink text-white hover:bg-ink-2",
    ghost: "text-ink-2 hover:bg-surface-2",
    outline: "border border-border-strong text-ink hover:bg-surface-2",
    danger: "bg-crit-bg text-crit-fg hover:bg-crit-bg/70 border border-crit-fg/20",
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
      <table className="w-full border-collapse text-left text-[13px]">{children}</table>
    </div>
  );
}

export function Th({ children, className, ...props }: { children?: ReactNode; className?: string } & ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn("border-b border-border px-3 py-2.5 text-2xs font-semibold uppercase tracking-wide text-faint", className)} {...props}>
      {children}
    </th>
  );
}

export function Td({ children, className, ...props }: { children?: ReactNode; className?: string } & TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-b border-border px-3 py-3 align-middle text-ink-2", className)} {...props}>{children}</td>;
}
