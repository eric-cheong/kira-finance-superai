// Minimalist line icons — a single consistent stroke family (1.6px, round caps).
// No icon library dependency; everything is one <Icon name=…/> for consistency.

import type { SVGProps } from "react";

export type IconName =
  | "briefing"
  | "capture"
  | "approvals"
  | "transactions"
  | "compliance"
  | "closeBooks"
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
  | "dot"
  | "flight"
  | "hotel"
  | "vendor"
  | "forecast"
  | "globe"
  | "calendar"
  | "workflow"
  | "benchmark"
  | "module"
  | "route"
  | "timeline"
  | "hash"
  | "database"
  | "menu"
  | "close"
  | "sun"
  | "moon"
  | "home"
  | "bot"
  | "mic"
  | "volume"
  | "send"
  | "bookOpen";

const PATHS: Record<IconName, JSX.Element> = {
  briefing: <><path d="M4 5h16M4 12h16M4 19h10" /></>,
  capture: <><rect x="3" y="6" width="18" height="13" rx="2" /><circle cx="12" cy="12.5" r="3.2" /><path d="M8 6l1.4-2h5.2L16 6" /></>,
  approvals: <><path d="M5 12.5l4 4 10-10" /><path d="M3 19h18" /></>,
  transactions: <><path d="M4 8h13l-3-3M20 16H7l3 3" /></>,
  compliance: <><path d="M6 3h9l3 3v15H6z" /><path d="M9 11l2 2 4-4" /></>,
  closeBooks: <><path d="M6 4h12v16H6z" /><path d="M9 8h6M9 12h3" /><path d="M12.5 16l2 2 4-4" /></>,
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
  flight: <><path d="M3 18l4-8 3 2 4-6 4 2M3 21h18" /></>,
  hotel: <><rect x="3" y="8" width="18" height="13" rx="1" /><path d="M8 8V6a4 4 0 018 0v2" /><circle cx="12" cy="14" r="2" /></>,
  vendor: <><path d="M3 9l9-5 9 5v11a1 1 0 01-1 1H4a1 1 0 01-1-1z" /><path d="M9 21V12h6v9" /></>,
  forecast: <><path d="M4 19V5M4 19h16" /><path d="M8 14l3-5 3 3 4-6" /><path d="M15 7l3 3" strokeDasharray="2 2" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M2 12h20M12 3a15 15 0 010 18M12 3a15 15 0 000 18" /></>,
  calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v3M16 2v3M3 10h18" /></>,
  workflow: <><rect x="3" y="4" width="6" height="6" rx="1.5" /><rect x="15" y="4" width="6" height="6" rx="1.5" /><rect x="9" y="15" width="6" height="6" rx="1.5" /><path d="M9 7h6M18 10v2a3 3 0 01-3 3h-3M6 10v2a3 3 0 003 3h3" /></>,
  benchmark: <><path d="M4 19V5M4 19h16" /><path d="M7 16v-4M11 16V8M15 16v-6M19 16V6" /><path d="M6 7h14" strokeDasharray="2 2" /></>,
  module: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
  route: <><path d="M6 18a3 3 0 100-6 3 3 0 000 6zM18 12a3 3 0 100-6 3 3 0 000 6z" /><path d="M8.5 13.5l7-3M6 12V7a2 2 0 012-2h3" /><path d="M18 12v5a2 2 0 01-2 2h-3" /></>,
  timeline: <><path d="M5 4v16" /><path d="M8 6h11M8 12h8M8 18h11" /><circle cx="5" cy="6" r="1.5" /><circle cx="5" cy="12" r="1.5" /><circle cx="5" cy="18" r="1.5" /></>,
  hash: <><path d="M9 3L7 21M17 3l-2 18M4 8h17M3 16h17" /></>,
  database: <><ellipse cx="12" cy="5" rx="7" ry="3" /><path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5" /><path d="M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  close: <><path d="M6 6l12 12M18 6L6 18" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5 5l1.6 1.6M17.4 17.4L19 19M19 5l-1.6 1.6M6.6 17.4L5 19" /></>,
  moon: <><path d="M20 13.5A8.5 8.5 0 1110.5 4a7 7 0 009.5 9.5z" /></>,
  home: <><path d="M4 11l8-7 8 7" /><path d="M6 9.5V20h12V9.5" /><path d="M10 20v-6h4v6" /></>,
  bot: <><rect x="5" y="8" width="14" height="11" rx="3" /><path d="M12 4v4M9 13h.01M15 13h.01M9 17h6" /><path d="M4 13H2M22 13h-2" /></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3M8 21h8" /></>,
  volume: <><path d="M4 10v4h4l5 4V6l-5 4z" /><path d="M16 9.5a4 4 0 010 5M18.5 7a7.5 7.5 0 010 10" /></>,
  send: <><path d="M21 3L10 14" /><path d="M21 3l-7 18-4-7-7-4z" /></>,
  bookOpen: <><path d="M4 5.5A3.5 3.5 0 017.5 2H20v18H7.5A3.5 3.5 0 004 23z" /><path d="M4 5.5V23M8 6h8M8 10h7" /></>,
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
