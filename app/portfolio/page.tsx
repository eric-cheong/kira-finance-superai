import * as db from "@/lib/data/store";
import { money, num } from "@/lib/format";
import {
  Badge,
  Bar,
  Card,
  CardHeader,
  Icon,
  PageHeader,
  StatTile,
  Table,
  TierBadge,
  Td,
  Th,
} from "@/components/ui";
import { DisclaimerBanner } from "@/components/disclaimer-banner";

export const metadata = { title: "Portfolio · Kira" };

export default function PortfolioPage() {
  const ps = db.portfolioStats();
  const topHolding = ps.shares[0];

  return (
    <div className="animate-in space-y-6">
      <PageHeader
        title="Portfolio"
        description="A read-only view of linked personal holdings for the daily briefing. Kira reads positions and may draft a suggestion — it never places or rebalances trades. Everything here is informational."
        badge={<Badge variant="neutral">Phase 2</Badge>}
      />

      <DisclaimerBanner />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Portfolio value" value={money(ps.valueBase, "MYR", { compact: true })} sub="base currency" icon="portfolio" />
        <StatTile
          label="Unrealised P&L"
          value={`${ps.pnl >= 0 ? "+" : ""}${money(ps.pnl, "MYR", { compact: true })}`}
          sub={`${ps.pnlPct >= 0 ? "+" : ""}${ps.pnlPct.toFixed(1)}%`}
          icon="analytics"
          tone={ps.pnl >= 0 ? "pos" : "crit"}
        />
        <StatTile label="Holdings" value={db.POSITIONS.length} sub="across 3 currencies" icon="bank" />
        <StatTile
          label="Top concentration"
          value={topHolding ? `${ps.topShare}%` : "—"}
          sub={topHolding ? topHolding.name : "no linked holdings"}
          icon="alert"
          tone={ps.topShare >= 30 ? "warn" : "neutral"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card pad={false}>
          <div className="px-5 pt-5">
            <CardHeader title="Holdings" subtitle="Read-only via brokerage connector" icon="portfolio" />
          </div>
          <Table>
            <thead>
              <tr>
                <Th>Instrument</Th>
                <Th className="text-right">Units</Th>
                <Th className="text-right">Last</Th>
                <Th className="text-right">Day</Th>
                <Th className="text-right">Value (base)</Th>
                <Th className="text-right">P&L</Th>
              </tr>
            </thead>
            <tbody>
              {db.POSITIONS.map((p) => {
                const valBase = db.toBase(p.lastMinor * p.units, p.instrument.currency);
                const pnl = db.toBase((p.lastMinor - p.avgCostMinor) * p.units, p.instrument.currency);
                return (
                  <tr key={p.instrument.symbol} className="hover:bg-surface-2/40">
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink">{p.instrument.symbol}</span>
                        <Badge variant="neutral">{p.instrument.kind}</Badge>
                      </div>
                      <span className="text-[11.5px] text-faint">{p.instrument.name}</span>
                    </Td>
                    <Td className="whitespace-nowrap text-right tnum text-[12.5px]">{num(p.units, p.units < 1 ? 2 : 0)}</Td>
                    <Td className="whitespace-nowrap text-right tnum text-[12.5px]">{money(p.lastMinor, p.instrument.currency)}</Td>
                    <Td className="whitespace-nowrap text-right">
                      <span className={`tnum text-[12.5px] font-medium ${p.dayChangePct >= 0 ? "text-pos-fg" : "text-crit-fg"}`}>
                        {p.dayChangePct >= 0 ? "+" : ""}
                        {p.dayChangePct.toFixed(1)}%
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap text-right tnum text-[12.5px] font-semibold text-ink">{money(valBase, "MYR")}</Td>
                    <Td className="whitespace-nowrap text-right">
                      <span className={`tnum text-[12.5px] font-medium ${pnl >= 0 ? "text-pos-fg" : "text-crit-fg"}`}>
                        {pnl >= 0 ? "+" : ""}
                        {money(pnl, "MYR", { compact: true })}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader title="Concentration" subtitle="Share of portfolio value" icon="alert" />
            {ps.shares.length > 0 ? (
            <div className="space-y-3">
              {ps.shares.map((s) => {
                const share = ps.valueBase > 0 ? Math.round((s.valueBase / ps.valueBase) * 100) : 0;
                return (
                  <div key={s.symbol}>
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="text-[12.5px] text-ink">{s.name}</span>
                      <span className="tnum text-[12px] font-medium text-ink-2">{share}%</span>
                    </div>
                    <Bar value={share} tone={share >= 30 ? "warn" : "brand"} />
                  </div>
                );
              })}
            </div>
            ) : (
              <p className="text-[12.5px] leading-relaxed text-muted">
                No read-only brokerage positions are linked yet.
              </p>
            )}
          </Card>

          {topHolding && ps.topShare >= 30 && (
            <Card>
              <CardHeader title="Suggestion (draft)" icon="spark" right={<TierBadge tier={3} />} />
              <p className="text-[12.5px] leading-relaxed text-ink-2">
                {topHolding.name} is {ps.topShare}% of the portfolio — above a balanced single-name target. A rebalance toward target weights is drafted.
              </p>
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-warn-fg/20 bg-warn-bg px-3 py-2 text-[12px] text-warn-fg">
                <Icon name="lock" size={14} />
                Requires your explicit approval. Kira never places trades.
              </div>
              <p className="mt-2 text-[11px] italic text-faint">Educational / informational only — not financial advice.</p>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
