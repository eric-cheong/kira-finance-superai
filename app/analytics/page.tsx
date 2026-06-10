import * as db from "@/lib/data/store";
import { money } from "@/lib/format";
import type { CurrencyCode } from "@/lib/types";
import { Bar, Card, CardHeader, PageHeader, StatTile } from "@/components/ui";
import { cn } from "@/components/ui/cn";

export const metadata = { title: "Spend Analytics · Kira" };

interface Row {
  label: string;
  sub?: string;
  amount: number;
}

function BarList({ rows, tone = "brand" }: { rows: Row[]; tone?: "brand" | "info" | "neutral" }) {
  const max = Math.max(1, ...rows.map((r) => r.amount));
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return (
    <div className="space-y-3.5">
      {rows.map((r) => {
        const share = total > 0 ? Math.round((r.amount / total) * 100) : 0;
        return (
          <div key={r.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="truncate text-[13px] text-ink">{r.label}</span>
              <span className="shrink-0 tnum text-[12.5px] font-medium text-ink-2">
                {money(r.amount, "MYR")} <span className="text-faint">· {share}%</span>
              </span>
            </div>
            <Bar value={(r.amount / max) * 100} tone={tone} />
            {r.sub && <p className="mt-0.5 text-[11px] text-faint">{r.sub}</p>}
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const byAccount = db.spendByAccount();
  const byCC = db.spendByCostCentre();
  const total = db.totalSpendBaseMinor();

  // By source (card/bank) concentration.
  const sourceMap = new Map<string, number>();
  for (const t of db.TRANSACTIONS) {
    sourceMap.set(t.sourceRef, (sourceMap.get(t.sourceRef) ?? 0) + db.toBase(t.amountMinor, t.currency));
  }
  const bySource: Row[] = [...sourceMap.entries()]
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount);

  // By currency.
  const curMap = new Map<CurrencyCode, number>();
  for (const t of db.TRANSACTIONS) {
    curMap.set(t.currency, (curMap.get(t.currency) ?? 0) + db.toBase(t.amountMinor, t.currency));
  }
  const byCurrency: Row[] = [...curMap.entries()]
    .map(([label, amount]) => ({ label: `${label} (base equiv)`, amount }))
    .sort((a, b) => b.amount - a.amount);

  const topAcc = byAccount[0];
  const topCC = byCC[0];

  return (
    <div className="animate-in space-y-6">
      <PageHeader
        title="Spend analytics"
        description="Real-time spend across categories, cost centres, cards, and currencies — normalised to base currency (MYR). Figures derive from the system-of-record entries posted overnight."
      />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatTile label="Total spend" value={money(total, "MYR", { compact: true })} sub="base currency · MoM" icon="analytics" />
        <StatTile label="Entries" value={db.RECORDS.length} sub="posted this period" icon="transactions" />
        <StatTile
          label="Top category"
          value={topAcc ? topAcc.label.split(" — ")[0] : "No records"}
          sub={topAcc ? money(topAcc.amountBaseMinor, "MYR") : "waiting for sync"}
          icon="spark"
          tone="brand"
        />
        <StatTile
          label="Top cost centre"
          value={topCC ? topCC.label : "No records"}
          sub={topCC ? money(topCC.amountBaseMinor, "MYR") : "waiting for coding"}
          icon="bank"
          tone="neutral"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Spend by category" subtitle="Chart of accounts" icon="analytics" />
          <BarList rows={byAccount.map((b) => ({ label: b.label, amount: b.amountBaseMinor, sub: `${b.count} entr${b.count === 1 ? "y" : "ies"}` }))} tone="brand" />
        </Card>

        <Card>
          <CardHeader title="Spend by cost centre" subtitle="Outlet / entity" icon="bank" />
          <BarList rows={byCC.map((b) => ({ label: b.label, amount: b.amountBaseMinor }))} tone="info" />
        </Card>

        <Card>
          <CardHeader title="Spend by card / rail" subtitle="Concentration risk surfaced to Risk agent" icon="transactions" />
          <BarList rows={bySource} tone="neutral" />
        </Card>

        <Card>
          <CardHeader title="Spend by currency" subtitle="Multi-currency · FX-normalised" icon="spark" />
          <BarList rows={byCurrency} tone="brand" />
          <p className={cn("mt-4 border-t border-border pt-3 text-[11.5px] text-faint")}>
            Illustrative FX to MYR: SGD {db.FX_TO_MYR.SGD.toFixed(2)} · USD {db.FX_TO_MYR.USD.toFixed(2)}. Phase 3 adds live FX revaluation and multi-book consolidation.
          </p>
        </Card>
      </div>
    </div>
  );
}
