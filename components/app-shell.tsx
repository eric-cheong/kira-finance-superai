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
      { href: "/", label: "Daily Briefing", icon: "briefing" },
      { href: "/capture", label: "Capture", icon: "capture" },
      { href: "/approvals", label: "Approvals", icon: "approvals", badge: "4" },
      { href: "/transactions", label: "Transactions", icon: "transactions" },
    ],
  },
  {
    group: "Comply",
    items: [
      { href: "/compliance", label: "E-invoicing", icon: "compliance" },
      { href: "/analytics", label: "Spend Analytics", icon: "analytics" },
    ],
  },
  {
    group: "Intelligence",
    items: [{ href: "/portfolio", label: "Portfolio", icon: "portfolio", phase: 2 }],
  },
  {
    group: "Govern",
    items: [
      { href: "/audit", label: "Audit & Agents", icon: "audit" },
      { href: "/settings", label: "Settings", icon: "settings" },
    ],
  },
];

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors",
        active ? "bg-surface-2 text-ink" : "text-muted hover:bg-surface-2/60 hover:text-ink-2",
      )}
    >
      <Icon name={item.icon} size={17} className={active ? "text-brand" : "text-faint group-hover:text-muted"} />
      <span className="flex-1">{item.label}</span>
      {item.phase === 2 && (
        <span className="rounded border border-border px-1 py-px text-[10px] font-semibold text-faint">P2</span>
      )}
      {item.badge && (
        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-warn-bg px-1 text-[10px] font-semibold text-warn-fg">
          {item.badge}
        </span>
      )}
    </Link>
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
            <div className="mb-1.5 px-2.5 text-[10.5px] font-semibold uppercase tracking-wider text-faint">{g.group}</div>
            <div className="space-y-0.5">
              {g.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)}
                  onClick={onNavigate}
                />
              ))}
            </div>
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
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-border bg-surface lg:block">
        <SidebarBody pathname={pathname} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/20" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[260px] border-r border-border bg-surface">
            <SidebarBody pathname={pathname} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-[248px]">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setOpen(true)}
            className="-ml-1 rounded-lg p-2 text-ink-2 hover:bg-surface-2 lg:hidden"
            aria-label="Open navigation"
          >
            <Icon name="briefing" size={18} />
          </button>
          <div className="hidden items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[13px] text-faint sm:flex">
            <Icon name="search" size={15} />
            <span>Search transactions, invoices, agents…</span>
          </div>
          <div className="flex-1" />
          <div className="hidden items-center gap-1.5 rounded-full border border-pos-fg/15 bg-pos-bg px-2.5 py-1 text-2xs font-medium text-pos-fg sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-pos-fg" />
            Orchestrate · never settle
          </div>
          <button className="rounded-lg p-2 text-ink-2 hover:bg-surface-2" aria-label="Notifications">
            <Icon name="bell" size={18} />
          </button>
          <div className="lg:hidden">
            <Avatar name="Amir Hafiz" size={28} />
          </div>
        </header>

        <main className="mx-auto w-full max-w-content px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
