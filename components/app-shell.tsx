"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cn } from "./ui/cn";
import { Icon, type IconName } from "./ui/icons";
import { Avatar } from "./ui/primitives";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  phase?: 2;
  badge?: string;
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Operate",
    items: [
      { href: "/onboarding", label: "Get Started", icon: "bank" },
      { href: "/", label: "Daily Briefing", icon: "briefing" },
      { href: "/operating-functions", label: "Operating Functions", icon: "workflow" },
      { href: "/capture", label: "Capture", icon: "capture" },
      { href: "/approvals", label: "Approvals", icon: "approvals", badge: "4" },
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

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  return (
    <li>
      <Link
        href={item.href}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group rounded-lg border-l-2 px-2.5 py-2 text-[13.5px] font-medium text-ink",
          active ? "menu-active border-brand bg-brand-soft text-ink" : "border-transparent hover:bg-base-200",
        )}
      >
        <Icon name={item.icon} size={17} className={active ? "text-brand" : "text-ink"} />
        <span className="flex-1">{item.label}</span>
        {item.phase === 2 && (
          <span className="badge badge-outline badge-xs border-base-300 text-ink">P2</span>
        )}
        {item.badge && (
          <span className="badge badge-primary badge-xs min-w-[18px] text-primary-content">
            {item.badge}
          </span>
        )}
      </Link>
    </li>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-1">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
        <Icon name="spark" size={18} />
      </span>
      <div className="leading-tight">
        <div className="text-[15px] font-semibold tracking-[-0.02em] text-ink">Kira</div>
        <div className="text-[10.5px] font-medium uppercase tracking-wide text-faint">Finance · SuperAI</div>
      </div>
    </Link>
  );
}

function SidebarBody({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
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
                  onClick={onNavigate}
                />
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
          <Avatar name="Amir Hafiz" />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13px] font-medium text-ink">Amir Hafiz</div>
            <div className="truncate text-[11.5px] text-muted">Finance Lead · Kira Roasters</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);

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
              className="btn btn-square btn-ghost btn-sm -ml-1 lg:hidden"
              aria-label="Open navigation"
            >
              <Icon name="briefing" size={18} />
            </label>
            <div className="hidden min-w-0 items-center gap-2 rounded-lg border border-base-300 bg-base-100 px-2.5 py-1.5 text-[13px] text-ink sm:flex">
              <Icon name="search" size={15} />
              <span>Search transactions, invoices, agents…</span>
            </div>
          </div>
          <div className="navbar-end gap-2">
            <div className="badge badge-primary badge-outline hidden gap-1.5 px-2.5 py-3 text-2xs font-medium text-ink sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Orchestrate · never settle
            </div>
            <button className="btn btn-square btn-ghost btn-sm text-ink" aria-label="Notifications">
              <Icon name="bell" size={18} />
            </button>
            <div className="lg:hidden">
              <Avatar name="Amir Hafiz" size={28} />
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
        <aside className="overlay-surface min-h-full w-[min(280px,calc(100vw-48px))] border-r border-border lg:w-[248px]">
          <SidebarBody pathname={pathname} onNavigate={() => setOpen(false)} />
        </aside>
      </div>
    </div>
  );
}
