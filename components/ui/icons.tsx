// Minimalist line icons — a single consistent stroke family (1.6px, round caps).
// No icon library dependency; everything is one <Icon name=…/> for consistency.

import type { SVGProps } from "react";

export type IconName =
  | "briefing"
  | "capture"
  | "approvals"
  | "transactions"
  | "compliance"
  | "portfolio"
  | "analytics"
  | "settings"
  | "audit"
  | "spark"
  | "check"
  | "alert"
  | "shield"
  | "clock"
  | "arrowRight"
  | "arrowUpRight"
  | "bell"
  | "lock"
  | "search"
  | "plus"
  | "doc"
  | "bank"
  | "chevronRight"
  | "dot";

const PATHS: Record<IconName, JSX.Element> = {
  briefing: <><path d="M4 5h16M4 12h16M4 19h10" /></>,
  capture: <><rect x="3" y="6" width="18" height="13" rx="2" /><circle cx="12" cy="12.5" r="3.2" /><path d="M8 6l1.4-2h5.2L16 6" /></>,
  approvals: <><path d="M5 12.5l4 4 10-10" /><path d="M3 19h18" /></>,
  transactions: <><path d="M4 8h13l-3-3M20 16H7l3 3" /></>,
  compliance: <><path d="M6 3h9l3 3v15H6z" /><path d="M9 11l2 2 4-4" /></>,
  portfolio: <><path d="M4 19V5M4 19h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></>,
  analytics: <><path d="M4 19V5M4 19h16" /><path d="M7 15l3-4 3 2 4-6" /></>,
  settings: <><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>,
  audit: <><path d="M5 3h14v18l-7-3-7 3z" /><path d="M9 8h6M9 12h6" /></>,
  spark: <><path d="M12 3l2.2 5.6L20 11l-5.8 2.4L12 19l-2.2-5.6L4 11l5.8-2.4z" /></>,
  check: <><path d="M5 12.5l4 4 10-10" /></>,
  alert: <><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17h.01" /></>,
  shield: <><path d="M12 3l8 3v6c0 4.5-3.4 7.6-8 9-4.6-1.4-8-4.5-8-9V6z" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></>,
  arrowRight: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  arrowUpRight: <><path d="M7 17L17 7M9 7h8v8" /></>,
  bell: <><path d="M6 16V11a6 6 0 1112 0v5l2 2H4z" /><path d="M10 20a2 2 0 004 0" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 118 0v3" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  doc: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></>,
  bank: <><path d="M3 9l9-5 9 5M5 9v9M19 9v9M9 9v9M15 9v9M3 21h18" /></>,
  chevronRight: <><path d="M9 6l6 6-6 6" /></>,
  dot: <><circle cx="12" cy="12" r="3.5" /></>,
};

export function Icon({
  name,
  size = 18,
  className,
  ...rest
}: { name: IconName; size?: number; className?: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
