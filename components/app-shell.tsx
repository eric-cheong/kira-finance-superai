"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "./ui/cn";
import { Icon, type IconName } from "./ui/icons";
import { Avatar } from "./ui/primitives";

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

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Operate",
    items: [
      { href: "/onboarding", label: "Get Started", icon: "bank" },
      { href: "/", label: "Daily Briefing", icon: "briefing" },
      { href: "/operating-functions", label: "Operating Functions", icon: "workflow" },
      { href: "/capture", label: "Capture", icon: "capture" },
      { href: "/approvals", label: "Approvals", icon: "approvals" },
      { href: "/transactions", label: "Transactions", icon: "transactions" },
      { href: "/bookings", label: "Bookings", icon: "flight" },
      { href: "/erp-close", label: "ERP Close", icon: "closeBooks" },
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

const SEARCH_ITEMS = NAV.flatMap((group) =>
  group.items.map((item) => ({
    ...item,
    group: group.group,
    haystack: `${item.label} ${group.group}`.toLowerCase(),
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
          "group min-h-11 rounded-lg border-l-2 px-2.5 py-2 text-[13.5px] font-medium text-ink lg:min-h-9",
          active ? "menu-active border-brand bg-base-200 text-ink" : "border-transparent hover:bg-base-200",
        )}
      >
        <Icon name={item.icon} size={17} className={active ? "text-ink" : "text-muted"} />
        <span className="flex-1">{item.label}</span>
        {item.phase === 2 && (
          <span className="badge badge-outline badge-xs border-base-300 text-ink">P2</span>
        )}
        {badge && (
          <span className="badge badge-outline badge-xs min-w-[18px] border-base-300 text-ink">
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
      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-base-300 bg-base-100 text-brand">
        <Icon name="spark" size={18} />
      </span>
      <div className="leading-tight">
        <div className="text-[15px] font-semibold text-ink">Kira</div>
        <div className="text-[10.5px] font-medium uppercase tracking-wide text-faint">Finance · SuperAI</div>
      </div>
    </Link>
  );
}

function CommandSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const cleanQuery = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!cleanQuery) return SEARCH_ITEMS.slice(0, 5);
    return SEARCH_ITEMS.filter((item) => item.haystack.includes(cleanQuery)).slice(0, 6);
  }, [cleanQuery]);
  const showPanel = focused && query.trim().length > 0;
  const activeId = showPanel && matches[activeIndex] ? `global-command-option-${activeIndex}` : undefined;

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function navigateTo(href: string) {
    setQuery("");
    setFocused(false);
    router.push(href);
  }

  return (
    <div className="relative hidden w-full max-w-[390px] sm:block">
      <label className="sr-only" htmlFor="global-command-search">
        Search app routes
      </label>
      <div className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg border border-base-300 bg-base-100 px-2.5 py-1.5 text-[13px] text-ink focus-within:border-border-strong focus-within:shadow-card sm:min-h-9">
        <Icon name="search" size={15} className="text-muted" />
        <input
          id="global-command-search"
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls="global-command-search-results"
          aria-activedescendant={activeId}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) => Math.min(matches.length - 1, index + 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(0, index - 1));
            }
            if (event.key === "Enter" && matches[activeIndex]) {
              event.preventDefault();
              navigateTo(matches[activeIndex].href);
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-faint"
          placeholder="Search pages, approvals, invoices..."
        />
      </div>
      {showPanel && (
        <div
          id="global-command-search-results"
          role="listbox"
          className="absolute left-0 top-[calc(100%+8px)] z-30 w-full overflow-hidden rounded-lg border border-base-300 bg-base-100 shadow-pop"
        >
          {matches.length > 0 ? (
            <ul className="menu menu-sm p-1">
              {matches.map((item, index) => (
                <li key={item.href}>
                  <button
                    id={`global-command-option-${index}`}
                    role="option"
                    aria-selected={activeIndex === index}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => navigateTo(item.href)}
                    className={cn(
                      "grid min-h-11 grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md px-2.5 py-2 text-left sm:min-h-9",
                      activeIndex === index && "bg-base-200",
                    )}
                  >
                    <Icon name={item.icon} size={15} className="text-muted" />
                    <span className="text-[13px] font-medium text-ink">{item.label}</span>
                    <span className="text-[10.5px] uppercase tracking-wide text-faint">{item.group}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-3 text-[12.5px] text-muted">No matching page</div>
          )}
        </div>
      )}
    </div>
  );
}

function SidebarBody({
  pathname,
  session,
  onNavigate,
}: {
  pathname: string;
  session: ShellSession | null;
  onNavigate?: () => void;
}) {
  const approvalBadge = session?.navigationBadges.approvals ? String(session.navigationBadges.approvals) : undefined;
  const userName = session?.user.name ?? "Amir Hafiz";
  const userTitle = session?.user.title ?? "Finance Lead";
  const orgName = session?.org.brandName ?? "Kira Roasters";
  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pb-4 pt-5">
        <Brand />
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV.map((g) => (
          <div key={g.group}>
            <ul className="menu menu-sm w-full gap-0.5 p-0">
              <li className="menu-title px-2.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink">
                <span>{g.group}</span>
              </li>
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
            <div className="truncate text-[11.5px] text-muted">{userTitle} · {orgName}</div>
          </div>
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

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/session")
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled && payload.ok) setSession(payload.data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const navHidden = !open && !isDesktop;

  return (
    <div className="drawer min-h-screen bg-bg lg:drawer-open">
      <input
        id="app-shell-drawer"
        type="checkbox"
        className="drawer-toggle"
        checked={open}
        onChange={(event) => setOpen(event.target.checked)}
        suppressHydrationWarning
      />

      <div className="drawer-content flex min-h-screen flex-col">
        <header className="navbar sticky top-0 z-20 min-h-14 border-b border-border bg-base-100 px-4 sm:px-6">
          <div className="navbar-start min-w-0 flex-1 gap-3">
            <label
              htmlFor="app-shell-drawer"
              className="btn btn-square btn-ghost -ml-1 h-11 min-h-11 w-11 lg:hidden"
              aria-label="Open navigation"
            >
              <Icon name="briefing" size={18} />
            </label>
            <CommandSearch />
          </div>
          <div className="navbar-end gap-2">
            <div className="badge badge-outline hidden gap-1.5 border-base-300 px-2.5 py-3 text-2xs font-medium text-ink sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Orchestrate
            </div>
            <Link className="btn btn-square btn-ghost h-11 min-h-11 w-11 text-ink sm:h-9 sm:min-h-9 sm:w-9" aria-label="Open approvals" href="/approvals">
              <Icon name="bell" size={18} />
            </Link>
            <div className="lg:hidden">
              <Avatar name={session?.user.name ?? "Amir Hafiz"} size={28} />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-content px-4 py-6 sm:px-6 lg:px-8 2xl:max-w-content">{children}</main>
      </div>

      <div className="drawer-side z-40 lg:z-30">
        <label
          htmlFor="app-shell-drawer"
          aria-label="Close navigation"
          className="drawer-overlay"
          onClick={() => setOpen(false)}
        />
        <aside
          className={cn(
            "min-h-full w-[min(280px,calc(100vw-48px))] border-r border-border bg-base-100 lg:w-[248px]",
            navHidden && "max-lg:invisible",
          )}
          aria-hidden={navHidden}
        >
          <SidebarBody pathname={pathname} session={session} onNavigate={() => setOpen(false)} />
        </aside>
      </div>
    </div>
  );
}
