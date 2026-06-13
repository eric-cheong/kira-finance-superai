// Pure formatting helpers. Money is stored as integer minor units (cents) to
// avoid float drift; rendering happens here so every surface is consistent.

export type CurrencyCode = "MYR" | "SGD" | "USD";

const CURRENCY_LOCALE: Record<CurrencyCode, string> = {
  MYR: "en-MY",
  SGD: "en-SG",
  USD: "en-US",
};
const DISPLAY_TIME_ZONE = "Asia/Kuala_Lumpur";

/** Format integer minor units as a currency string, e.g. 125050 -> "RM 1,250.50". */
export function money(
  minor: number,
  currency: CurrencyCode = "MYR",
  opts: { sign?: boolean; compact?: boolean } = {},
): string {
  const major = minor / 100;
  const nf = new Intl.NumberFormat(CURRENCY_LOCALE[currency], {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: opts.compact ? 0 : 2,
    maximumFractionDigits: opts.compact ? 0 : 2,
    notation: opts.compact ? "compact" : "standard",
  });
  const out = nf.format(major);
  if (opts.sign && minor > 0) return `+${out}`;
  return out;
}

/** Bare number with thousands separators and fixed decimals. */
export function num(value: number, decimals = 0): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function percent(value: number, decimals = 1): string {
  return `${value >= 0 ? "" : ""}${value.toFixed(decimals)}%`;
}

/** Deterministic date formatting (no Date.now usage in render). */
export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: DISPLAY_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function fmtDateShort(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: DISPLAY_TIME_ZONE,
    day: "2-digit",
    month: "short",
  }).format(d);
}

export function fmtTime(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: DISPLAY_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export function fmtDateTime(iso: string): string {
  return `${fmtDate(iso)} · ${fmtTime(iso)}`;
}

/** Human relative time vs a fixed reference (kept deterministic). */
export function relativeTo(iso: string, refIso: string): string {
  const ms = new Date(refIso).getTime() - new Date(iso).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

/** Short hash-style id renderer for audit/log surfaces. */
export function shortId(id: string, len = 7): string {
  return id.length <= len ? id : id.slice(0, len);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
