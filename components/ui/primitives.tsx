import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "./cn";
import { Icon, type IconName } from "./icons";
import { bandOf, TIER_LABEL, type ApprovalTier, type ActionClass } from "@/lib/types";

// ── Card ────────────────────────────────────────────────────────────────────

export function Card({
  children,
  className,
  pad = true,
  ...props
}: {
  children: ReactNode;
  className?: string;
  pad?: boolean;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border border-border bg-surface text-ink shadow-card",
        pad && "p-4 sm:p-5",
        className,
      )}
      {...props}
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
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Icon name={icon} size={17} />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="min-w-0 text-[15px] font-semibold leading-snug text-ink">{title}</h3>
          {subtitle && <p className="mt-1 min-w-0 text-[13px] leading-relaxed text-muted">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

// ── Badge family ────────────────────────────────────────────────────────────

type Variant = "neutral" | "pos" | "warn" | "crit" | "info" | "brand";

const VARIANT: Record<Variant, string> = {
  neutral: "border-border bg-surface text-ink",
  pos: "border-pos-fg/20 bg-pos-bg text-ink",
  warn: "border-warn-fg/20 bg-warn-bg text-ink",
  crit: "border-crit-fg/20 bg-crit-bg text-ink",
  info: "border-info-fg/20 bg-info-bg text-ink",
  brand: "border-brand/20 bg-brand-soft text-ink",
};

/* Colored icon treatment for soft chips (StatTile, EmptyState). Overrides the
   text-ink coming from VARIANT so the icon reads in the status hue. */
const CHIP_ICON: Record<Variant, string> = {
  neutral: "!text-muted",
  pos: "!text-pos-fg",
  warn: "!text-warn-fg",
  crit: "!text-crit-fg",
  info: "!text-info-fg",
  brand: "!text-brand",
};

const DOT_VARIANT: Record<Variant, string> = {
  neutral: "bg-faint",
  pos: "bg-pos-fg",
  warn: "bg-warn-fg",
  crit: "bg-crit-fg",
  info: "bg-info-fg",
  brand: "bg-brand",
};

export function Badge({
  children,
  variant = "neutral",
  className,
  dot = false,
  mobileLabel,
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  dot?: boolean;
  mobileLabel?: ReactNode;
}) {
  const hasMobileLabel = mobileLabel != null;
  return (
    <span
      className={cn(
        "inline-flex h-auto min-h-0 max-w-full shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] font-medium leading-5",
        VARIANT[variant],
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", DOT_VARIANT[variant])} />}
      {hasMobileLabel ? (
        <>
          <span className="truncate sm:hidden">{mobileLabel}</span>
          <span className="hidden truncate sm:inline">{children}</span>
        </>
      ) : (
        <span className="truncate">{children}</span>
      )}
    </span>
  );
}

export function ConfidenceChip({ value, showWord = true }: { value: number; showWord?: boolean }) {
  const band = bandOf(value);
  const variant: Variant = band === "high" ? "pos" : band === "medium" ? "warn" : "crit";
  const word = band === "high" ? "high" : band === "medium" ? "medium" : "low";
  return (
    <Badge variant={variant} className="tnum">
      {value}%{showWord && <span className="hidden font-normal opacity-70 sm:inline"> · {word}</span>}
    </Badge>
  );
}

const TIER_VARIANT: Record<ApprovalTier, Variant> = { 1: "neutral", 2: "info", 3: "warn", 4: "crit" };

export function TierBadge({ tier }: { tier: ApprovalTier }) {
  return (
    <Badge variant={TIER_VARIANT[tier]} mobileLabel={`T${tier}`}>
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

const ACTION_SHORT: Record<ActionClass, string> = {
  "read-only": "read",
  suggestion: "suggest",
  notification: "notify",
  "human-approved": "approval",
  prohibited: "blocked",
};

export function ActionBadge({ value }: { value: ActionClass }) {
  return <Badge variant={ACTION_VARIANT[value]} mobileLabel={ACTION_SHORT[value]}>{value}</Badge>;
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
  return (
    <div className="min-w-0 rounded-xl border border-border bg-surface px-3.5 py-3.5 shadow-card sm:p-4">
      <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <div className="min-w-0 truncate text-[12px] font-medium leading-5 text-muted sm:text-[12.5px]">{label}</div>
          <div className="tnum mt-1.5 min-w-0 truncate text-xl font-semibold leading-none text-ink sm:text-[26px]">
            {value}
          </div>
          {sub && <div className="mt-1.5 min-w-0 truncate text-[12px] leading-5 text-muted sm:text-[12.5px]">{sub}</div>}
        </div>
        {icon && (
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", VARIANT[tone], CHIP_ICON[tone])}>
            <Icon name={icon} size={16} />
          </span>
        )}
      </div>
    </div>
  );
}

// ── Misc layout primitives ──────────────────────────────────────────────────

export function Amount({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("tnum", className)}>{children}</span>;
}

export function Bar({ value, tone = "brand" }: { value: number; tone?: Variant }) {
  const fill: Record<Variant, string> = {
    neutral: "bg-faint/50",
    pos: "bg-pos-fg/75",
    warn: "bg-warn-fg/75",
    crit: "bg-crit-fg/70",
    info: "bg-info-fg/75",
    brand: "bg-brand/75",
  };
  const clamped = Math.max(2, Math.min(100, value));
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
    >
      <div className={cn("h-full rounded-full", fill[tone])} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-border", className)} />;
}

export function KeyValue({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <span className="text-[13px] leading-relaxed text-muted">{k}</span>
      <span className="min-w-0 text-[13px] font-medium leading-relaxed text-ink sm:text-right">{v}</span>
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
        className="inline-flex items-center justify-center rounded-lg border border-border bg-surface-2 font-semibold text-ink"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {inits}
      </span>
    </span>
  );
}

export function EmptyState({ icon = "check", title, sub }: { icon?: IconName; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-brand/15 bg-brand-soft text-brand">
        <Icon name={icon} size={22} />
      </span>
      <p className="text-[14.5px] font-semibold text-ink">{title}</p>
      {sub && <p className="max-w-xs text-[13px] leading-relaxed text-muted">{sub}</p>}
    </div>
  );
}

export function PageSkeleton({ title = "Loading workspace" }: { title?: string }) {
  return (
    <div className="animate-in space-y-5">
      <div className="border-b border-border pb-5">
        <div className="h-7 w-48 rounded-md bg-surface-2" aria-label={title} />
        <div className="mt-2 h-4 w-full max-w-xl rounded-md bg-surface-2" />
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 rounded-lg border border-border bg-surface">
            <div className="h-full animate-pulse rounded-lg bg-surface-2/55" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="h-5 w-36 rounded-md bg-surface-2" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-10 rounded-md bg-surface-2/70" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function InlineError({
  title = "Something needs attention",
  message = "The page could not finish loading. Try again, or inspect the audit trail if this keeps happening.",
  action,
}: {
  title?: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="max-w-2xl">
      <CardHeader title={title} subtitle={message} icon="alert" />
      {action && <ActionBar>{action}</ActionBar>}
    </Card>
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
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="min-w-0 text-[24px] font-semibold leading-tight tracking-[-0.01em] text-ink">{title}</h1>
          {badge}
        </div>
        {description && <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <ActionBar>{actions}</ActionBar>}
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
  size?: "sm" | "md" | "lg";
  icon?: IconName;
  iconRight?: IconName;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const base =
    "btn-lift inline-flex min-w-0 transform-gpu items-center justify-center gap-2 rounded-lg border font-medium transition disabled:pointer-events-none disabled:opacity-50";
  const sizes = {
    sm: "h-11 min-h-11 px-3.5 text-[13px] sm:h-9 sm:min-h-9 sm:px-3",
    md: "h-11 min-h-11 px-4 text-[13.5px] sm:h-10 sm:min-h-10",
    lg: "h-12 min-h-12 px-5 text-[14.5px]",
  };
  const variants = {
    primary:
      "border-transparent bg-brand-strong text-on-brand shadow-btn hover:bg-brand-strong-hover hover:shadow-btn-hover",
    ghost: "border-transparent bg-transparent text-ink hover:bg-surface-2/70",
    outline: "border-border bg-surface text-ink shadow-card hover:border-border-strong hover:bg-surface-2/60",
    danger: "border-crit-fg/25 bg-crit-bg text-crit-fg hover:border-crit-fg/45 hover:bg-crit-bg/80",
  };
  const classes = cn(base, sizes[size], variants[variant], className);
  const iconSize = size === "sm" ? 15 : size === "lg" ? 18 : 16;
  const inner = (
    <>
      {icon && <Icon name={icon} size={iconSize} className="shrink-0" />}
      <span className="truncate">{children}</span>
      {iconRight && <Icon name={iconRight} size={iconSize} className="shrink-0" />}
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

export function Notice({
  children,
  icon,
  variant = "neutral",
  className,
}: {
  children: ReactNode;
  icon?: IconName;
  variant?: Variant;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-start gap-2.5 rounded-lg border px-3.5 py-3", VARIANT[variant], className)}>
      {icon && (
        <Icon name={icon} size={16} className={cn("mt-0.5 shrink-0", CHIP_ICON[variant])} />
      )}
      <div className="min-w-0 text-[13px] leading-relaxed text-muted">{children}</div>
    </div>
  );
}

export function ActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex w-full min-w-0 flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end [&>a]:w-full [&>button]:w-full sm:[&>a]:w-auto sm:[&>button]:w-auto", className)}>
      {children}
    </div>
  );
}

export function Table({
  children,
  className,
  tableClassName,
}: {
  children: ReactNode;
  className?: string;
  tableClassName?: string;
}) {
  return (
    <div className={cn("w-full overflow-x-auto overscroll-x-contain", className)}>
      <table className={cn("w-full min-w-[720px] border-collapse text-left text-[13px] leading-normal text-ink md:min-w-full md:text-[13.5px]", tableClassName)}>{children}</table>
    </div>
  );
}

export function Th({ children, className, ...props }: { children?: ReactNode; className?: string } & ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn("border-b border-border bg-surface-2/60 px-3.5 py-3 text-[11.5px] font-semibold uppercase tracking-wide text-muted first:rounded-tl-lg last:rounded-tr-lg", className)} {...props}>
      {children}
    </th>
  );
}

export function Td({ children, className, ...props }: { children?: ReactNode; className?: string } & TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-b border-border/80 px-3.5 py-3.5 align-middle text-ink", className)} {...props}>{children}</td>;
}

export function FinanceTableControlsScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(() => {
  const ROOT_SELECTOR = "[data-finance-table]";

  function getStoredState(key, defaults) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
    } catch {
      return defaults;
    }
  }

  function storeState(key, state) {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Ignore storage failures; table controls should still work for the session.
    }
  }

  function compareValues(a, b, field) {
    const left = a.dataset[field] ?? "";
    const right = b.dataset[field] ?? "";
    if (field === "amount" || field === "confidence") {
      return Number(left || 0) - Number(right || 0);
    }
    return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
  }

  function applyTable(root, state) {
    const lists = Array.from(root.querySelectorAll("[data-finance-row-list]"));
    const firstListRows = lists[0] ? Array.from(lists[0].querySelectorAll("[data-finance-row]")) : [];
    const search = state.search.trim().toLowerCase();
    const filters = state.filters || {};
    const [sortField, sortDir] = state.sort.split(":");
    const direction = sortDir === "asc" ? 1 : -1;

    lists.forEach((list) => {
      const rows = Array.from(list.querySelectorAll("[data-finance-row]"));
      rows
        .sort((a, b) => compareValues(a, b, sortField) * direction)
        .forEach((row) => list.appendChild(row));
    });

    let visible = 0;
    firstListRows.forEach((referenceRow) => {
      const id = referenceRow.dataset.rowId;
      const matchesSearch = !search || (referenceRow.dataset.search || "").toLowerCase().includes(search);
      const matchesFilters = Object.entries(filters).every(([name, value]) => {
        return value === "all" || referenceRow.dataset[name] === value;
      });
      const shouldShow = matchesSearch && matchesFilters;
      if (shouldShow) visible += 1;
      root.querySelectorAll("[data-row-id='" + id + "']").forEach((row) => {
        row.style.display = shouldShow ? "" : "none";
      });
    });

    root.querySelectorAll("[data-finance-visible-count]").forEach((node) => {
      node.textContent = String(visible);
    });
    root.querySelectorAll("[data-finance-empty]").forEach((node) => {
      node.hidden = visible !== 0;
    });
  }

  function initRoot(root) {
    // Guard against double-init without mutating the DOM: writing a data
    // attribute here races React hydration and triggers mismatch warnings.
    const seen = (window.__kiraFinanceTableInit ||= new WeakSet());
    if (seen.has(root)) return;
    seen.add(root);

    const storageKey = "kira:" + (root.dataset.storageKey || "finance-table");
    const filterControls = Array.from(root.querySelectorAll("[data-finance-filter]"));
    const defaults = {
      search: "",
      sort: root.dataset.defaultSort || "date:desc",
      filters: Object.fromEntries(filterControls.map((control) => [control.dataset.financeFilter, "all"])),
    };
    const state = getStoredState(storageKey, defaults);
    state.filters = { ...defaults.filters, ...(state.filters || {}) };

    const searchInput = root.querySelector("[data-finance-search]");
    const sortControl = root.querySelector("[data-finance-sort]");
    const resetControl = root.querySelector("[data-finance-reset]");

    if (searchInput) searchInput.value = state.search;
    if (sortControl) sortControl.value = state.sort;
    filterControls.forEach((control) => {
      control.value = state.filters[control.dataset.financeFilter] || "all";
    });

    const persistAndApply = () => {
      storeState(storageKey, state);
      applyTable(root, state);
    };

    searchInput?.addEventListener("input", (event) => {
      state.search = event.target.value;
      persistAndApply();
    });
    sortControl?.addEventListener("change", (event) => {
      state.sort = event.target.value;
      persistAndApply();
    });
    filterControls.forEach((control) => {
      control.addEventListener("change", (event) => {
        state.filters[event.target.dataset.financeFilter] = event.target.value;
        persistAndApply();
      });
    });
    resetControl?.addEventListener("click", () => {
      state.search = defaults.search;
      state.sort = defaults.sort;
      state.filters = { ...defaults.filters };
      if (searchInput) searchInput.value = state.search;
      if (sortControl) sortControl.value = state.sort;
      filterControls.forEach((control) => {
        control.value = state.filters[control.dataset.financeFilter] || "all";
      });
      persistAndApply();
    });

    applyTable(root, state);
  }

  function init() {
    document.querySelectorAll(ROOT_SELECTOR).forEach(initRoot);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
        `,
      }}
    />
  );
}
