"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "./ui/cn";
import { Icon, type IconName } from "./ui/icons";
import { Avatar } from "./ui/primitives";
import { AssistantClient } from "./assistant-client";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  phase?: 2;
}

interface ShellSession {
  user: { name: string; title: string };
  org: { brandName: string };
  navigationBadges: { approvals: number };
}

type SessionStatus = "loading" | "live" | "fallback";

function applyLightTheme() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = "kira";
  root.classList.remove("dark");
  root.style.colorScheme = "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#fbfaf7");
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Operate",
    items: [
      { href: "/onboarding", label: "Get Started", icon: "bank" },
      { href: "/", label: "Daily Briefing", icon: "briefing" },
      { href: "/erp-foundation", label: "ERP Foundation", icon: "database" },
      { href: "/capture", label: "Capture", icon: "capture" },
      { href: "/inbox", label: "Invoice Inbox", icon: "doc" },
      { href: "/approvals", label: "Approvals", icon: "approvals" },
      { href: "/transactions", label: "Transactions", icon: "transactions" },
      { href: "/erp-close", label: "AP Close", icon: "closeBooks" },
      { href: "/operating-functions", label: "Operating Functions", icon: "workflow" },
    ],
  },
  {
    group: "Finance",
    items: [
      { href: "/forecast", label: "Cashflow Forecast", icon: "forecast" },
      { href: "/analytics", label: "Spend Analytics", icon: "analytics" },
      { href: "/compliance", label: "E-invoicing", icon: "compliance" },
    ],
  },
  {
    group: "Intelligence",
    items: [
      { href: "/vendors", label: "Vendors", icon: "vendor" },
      { href: "/portfolio", label: "Portfolio", icon: "portfolio", phase: 2 },
    ],
  },
  {
    group: "Govern",
    items: [
      { href: "/audit", label: "Audit & Agents", icon: "audit" },
      { href: "/roadmap", label: "Build Plan", icon: "doc" },
      { href: "/settings", label: "Settings", icon: "settings" },
    ],
  },
];

const SEARCH_ALIASES: Record<string, string[]> = {
  "/": ["home", "morning", "brief", "summary", "agent run", "decision trace"],
  "/approvals": ["approval", "approve", "reject", "tier", "human gate", "pending", "queue"],
  "/capture": ["invoice", "receipt", "ocr", "document", "upload", "snap", "email"],
  "/transactions": ["bank", "feed", "match", "reconcile", "merchant", "line item"],
  "/erp-close": ["close", "bills", "export", "blocker", "month end", "evidence pack"],
  "/forecast": ["cash", "runway", "forecast", "outflow", "inflow"],
  "/analytics": ["spend", "category", "vendor", "chart", "breakdown"],
  "/compliance": ["einvoice", "e-invoice", "lhdn", "peppol", "invoicenow", "tax"],
  "/vendors": ["supplier", "enrichment", "risk", "review"],
  "/audit": ["audit", "hash", "trace", "reasoning", "agent", "tool call", "receipt"],
  "/settings": ["connector", "credentials", "profile", "preference", "org"],
};

const SEARCH_ITEMS = NAV.flatMap((group) =>
  group.items.map((item) => ({
    ...item,
    group: group.group,
    keywords: SEARCH_ALIASES[item.href] ?? [],
    haystack: `${item.label} ${group.group} ${(SEARCH_ALIASES[item.href] ?? []).join(" ")}`.toLowerCase(),
  })),
);

function NavLink({
  item,
  active,
  approvalBadge,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  approvalBadge?: string;
  onClick?: () => void;
}) {
  const badge = item.href === "/approvals" ? approvalBadge : undefined;
  return (
    <li>
      <Link
        href={item.href}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex min-h-11 items-center gap-2.5 rounded-lg border-l-2 px-3 py-2 text-[13.5px] xl:min-h-10",
          active
            ? "border-brand bg-brand-soft font-semibold text-brand"
            : "border-transparent font-medium text-ink hover:bg-surface-2/70 hover:text-ink",
        )}
      >
        <Icon name={item.icon} size={17} className={active ? "text-brand" : "text-muted group-hover:text-ink"} />
        <span className="flex-1">{item.label}</span>
        {item.phase === 2 && (
          <span className="inline-flex h-auto min-h-0 rounded-full border border-border bg-surface/70 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">P2</span>
        )}
        {badge && (
          <span className="tnum inline-flex h-auto min-h-0 min-w-[18px] items-center justify-center rounded-full border border-brand/20 bg-brand-soft px-1.5 py-0.5 text-[11px] font-semibold text-ink">
            {badge}
          </span>
        )}
      </Link>
    </li>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-1">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
        <Icon name="spark" size={18} />
      </span>
      <div className="leading-tight">
        <div className="text-[15px] font-semibold text-ink">Kira</div>
        <div className="text-[11px] font-medium uppercase tracking-wide text-faint">Finance · SuperAI</div>
      </div>
    </Link>
  );
}

function CommandSearch({
  className,
  idBase = "desktop",
  onNavigate,
}: {
  className?: string;
  idBase?: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputId = `global-command-search-${idBase}`;
  const resultsId = `global-command-search-results-${idBase}`;
  const cleanQuery = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!cleanQuery) return SEARCH_ITEMS.slice(0, 5);
    return SEARCH_ITEMS.filter((item) => item.haystack.includes(cleanQuery)).slice(0, 6);
  }, [cleanQuery]);
  const showPanel = focused;
  const activeId = showPanel && matches[activeIndex] ? `global-command-option-${idBase}-${activeIndex}` : undefined;

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (idBase !== "desktop") return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "Escape" && document.activeElement === inputRef.current) {
        setQuery("");
        setFocused(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [idBase]);

  function navigateTo(href: string) {
    setQuery("");
    setFocused(false);
    onNavigate?.();
    router.push(href);
  }

  return (
    <div className={cn("relative w-full max-w-[390px]", className)}>
      <label className="sr-only" htmlFor={inputId}>
        Search app routes
      </label>
      <div className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg border border-border/80 bg-surface/90 px-2.5 py-1.5 text-[13px] text-ink focus-within:border-brand/30 focus-within:shadow-card focus-within:ring-4 focus-within:ring-brand/10 sm:min-h-9">
        <Icon name="search" size={15} className="text-muted" />
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls={resultsId}
          aria-activedescendant={activeId}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setQuery("");
              setFocused(false);
              event.currentTarget.blur();
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              if (matches.length === 0) return;
              setActiveIndex((index) => Math.min(matches.length - 1, index + 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              if (matches.length === 0) return;
              setActiveIndex((index) => Math.max(0, index - 1));
            }
            if (event.key === "Enter" && matches[activeIndex]) {
              event.preventDefault();
              navigateTo(matches[activeIndex].href);
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-faint"
          placeholder="Search routes, approvals, invoices..."
        />
        <span className="hidden shrink-0 rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-faint sm:inline">
          Cmd K
        </span>
      </div>
      {showPanel && (
        <div
          id={resultsId}
          role="listbox"
          className="absolute left-0 top-[calc(100%+8px)] z-30 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-pop"
        >
          {matches.length > 0 ? (
            <ul className="space-y-0.5 p-1">
              {matches.map((item, index) => (
                <li key={item.href}>
                  <button
                    id={`global-command-option-${idBase}-${index}`}
                    role="option"
                    aria-selected={activeIndex === index}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => navigateTo(item.href)}
                    className={cn(
                      "grid min-h-11 w-full grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md px-2.5 py-2 text-left transition hover:bg-surface-2/70 sm:min-h-10",
                      activeIndex === index && "bg-surface-2",
                    )}
                  >
                    <Icon name={item.icon} size={15} className="text-muted" />
                    <span className="text-[13px] font-medium text-ink">{item.label}</span>
                    <span className="text-[11px] uppercase tracking-wide text-faint">{item.group}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-3 text-[12.5px] text-muted">No matching route</div>
          )}
        </div>
      )}
    </div>
  );
}

function SidebarBody({
  pathname,
  session,
  sessionStatus,
  onNavigate,
  onClose,
}: {
  pathname: string;
  session: ShellSession | null;
  sessionStatus: SessionStatus;
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const approvalBadge = session?.navigationBadges.approvals ? String(session.navigationBadges.approvals) : undefined;
  const userName = session?.user.name ?? "Amir Hafiz";
  const userTitle = session?.user.title ?? "Finance Lead";
  const orgName = session?.org.brandName ?? "Kira Roasters";
  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pb-4 pt-5">
        <div className="flex items-center justify-between gap-2">
          <Brand />
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation"
              className="btn-lift inline-flex h-11 min-h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-transparent text-muted transition hover:bg-surface-2/70 hover:text-ink xl:hidden"
            >
              <Icon name="close" size={18} />
            </button>
          )}
        </div>
        <CommandSearch className="mt-4 block max-w-none sm:hidden" idBase="drawer" onNavigate={onNavigate} />
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV.map((g) => (
          <div key={g.group}>
            <ul className="w-full space-y-0.5 p-0">
              <li className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">{g.group}</li>
              {g.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)}
                  approvalBadge={approvalBadge}
                  onClick={onNavigate}
                />
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
          <Avatar name={userName} />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13px] font-medium text-ink">{userName}</div>
            <div className="truncate text-[12px] text-muted">{userTitle} · {orgName}</div>
          </div>
          <span className={cn(
            "shrink-0 rounded-full border px-1.5 py-0.5 text-[11px] font-semibold",
            sessionStatus === "live" ? "border-pos-fg/20 bg-pos-bg text-ink" : "border-border bg-surface-2 text-muted",
          )}>
            {sessionStatus === "live" ? "live" : sessionStatus === "loading" ? "sync" : "offline"}
          </span>
          <button
            type="button"
            onClick={() => {
              fetch("/api/auth/logout", { method: "POST" }).finally(() => {
                window.location.assign("/login");
              });
            }}
            aria-label="Sign out"
            title="Sign out"
            className="btn-lift inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-muted transition hover:bg-surface-2/70 hover:text-ink"
          >
            <Icon name="arrowRight" size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [session, setSession] = useState<ShellSession | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("loading");

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1280px)");
    const sync = () => setIsDesktop(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Close the mobile drawer on route change so navigation always reveals the page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock background scroll while the mobile drawer is open and allow Escape to close it.
  useEffect(() => {
    if (!open || isDesktop) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, isDesktop]);

  useEffect(() => {
    applyLightTheme();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/session")
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled && payload.ok) {
          setSession(payload.data);
          setSessionStatus("live");
        } else if (!cancelled) {
          setSessionStatus("fallback");
        }
      })
      .catch(() => {
        if (!cancelled) setSessionStatus("fallback");
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const navHidden = !open && !isDesktop;
  const approvalCount = session?.navigationBadges.approvals ?? 0;

  // The login screen renders its own full-bleed layout without workspace chrome.
  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="drawer app-wash min-h-screen xl:drawer-open">
      <input
        id="app-shell-drawer"
        type="checkbox"
        className="drawer-toggle"
        checked={open}
        onChange={(event) => setOpen(event.target.checked)}
        suppressHydrationWarning
      />

      <div className="drawer-content flex min-h-screen flex-col">
        <header className="navbar overlay-surface sticky top-0 z-20 min-h-14 border-b border-border px-4 sm:px-6">
          <div className="navbar-start min-w-0 flex-1 gap-3">
            <button
              type="button"
              onClick={() => setOpen((current) => !current)}
              className="-ml-1 inline-flex h-11 min-h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-transparent text-ink hover:bg-surface-2/70 xl:hidden"
              aria-label="Open navigation"
              aria-controls="app-shell-drawer"
            >
              <Icon name="menu" size={19} />
            </button>
            <Link href="/" className="flex min-w-0 items-center gap-2 sm:hidden">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <Icon name="spark" size={15} />
              </span>
              <span className="truncate text-[15px] font-semibold text-ink">Kira</span>
            </Link>
            <CommandSearch className="hidden sm:block" />
          </div>
          <div className="navbar-end gap-2">
            <div className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1.5 text-[12px] font-medium text-ink md:inline-flex">
              <span className={cn("h-1.5 w-1.5 rounded-full", sessionStatus === "live" ? "bg-pos-fg" : "bg-faint")} />
              {sessionStatus === "live" ? "System live" : sessionStatus === "loading" ? "Syncing" : "Offline fallback"}
            </div>
            <Link className="btn-lift relative inline-flex h-11 min-h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-transparent text-ink transition hover:bg-surface-2/70 sm:h-10 sm:min-h-10 sm:w-10" aria-label="Open approvals" href="/approvals">
              <Icon name="bell" size={18} />
              {approvalCount > 0 && (
                <span className="absolute right-1.5 top-1.5 inline-flex min-w-4 items-center justify-center rounded-full border border-brand/20 bg-brand-soft px-1 text-[9.5px] font-semibold text-ink">
                  {approvalCount}
                </span>
              )}
            </Link>
            <div className="xl:hidden">
              <Avatar name={session?.user.name ?? "Amir Hafiz"} size={28} />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-content px-4 py-6 sm:px-6 lg:px-8 2xl:max-w-content">{children}</main>
        <AssistantClient />
      </div>

      <div className="drawer-side z-40 xl:z-30">
        <label
          htmlFor="app-shell-drawer"
          aria-label="Close navigation"
          className={cn(
            "drawer-overlay bg-ink/30 backdrop-blur-[2px]",
            navHidden && "max-xl:pointer-events-none max-xl:opacity-0",
          )}
          onClick={() => setOpen(false)}
        />
        <aside
          className={cn(
            "h-[100dvh] max-h-[100dvh] w-[min(300px,calc(100vw-48px))] border-r border-border bg-surface backdrop-blur-xl xl:w-[248px] xl:bg-surface/90",
            navHidden && "max-xl:invisible",
          )}
          aria-hidden={navHidden}
        >
          <SidebarBody
            pathname={pathname}
            session={session}
            sessionStatus={sessionStatus}
            onNavigate={() => setOpen(false)}
            onClose={isDesktop ? undefined : () => setOpen(false)}
          />
        </aside>
      </div>
    </div>
  );
}
