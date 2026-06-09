import * as db from "@/lib/data/store";
import { fmtDate, money } from "@/lib/format";
import type { Vendor, VendorRisk } from "@/lib/types";
import {
  Badge,
  Bar,
  Card,
  CardHeader,
  Icon,
  PageHeader,
  StatTile,
  Table,
  Td,
  Th,
} from "@/components/ui";

export const metadata = { title: "Vendors · Kira" };

const RISK: Record<VendorRisk, { label: string; variant: "pos" | "warn" | "crit" }> = {
  low: { label: "low risk", variant: "pos" },
  medium: { label: "medium risk", variant: "warn" },
  high: { label: "high risk", variant: "crit" },
};

function VendorRow({ v, maxSpend }: { v: Vendor; maxSpend: number }) {
  const st = RISK[v.riskLevel];
  const share = maxSpend > 0 ? Math.round((v.totalSpendMinor / maxSpend) * 100) : 0;
  return (
    <tr className="hover:bg-surface-2/40 align-top">
      <Td>
        <div className="font-medium text-ink">{v.name}</div>
        <div className="text-[11.5px] text-faint">{v.category}</div>
      </Td>
      <Td className="whitespace-nowrap text-[12px] text-muted">{v.country}</Td>
      <Td>
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="tnum text-[12.5px] font-semibold text-ink">{money(v.totalSpendMinor, v.currency, { compact: true })}</span>
          <span className="tnum text-[11px] text-faint">{share}%</span>
        </div>
        <Bar value={share} tone="brand" />
      </Td>
      <Td className="whitespace-nowrap tnum text-[12px] text-muted">{v.transactionCount}</Td>
      <Td className="whitespace-nowrap tnum text-[12px] text-muted">{fmtDate(v.lastTransactionAt)}</Td>
      <Td>
        <Badge variant={st.variant} dot>
          {st.label}
        </Badge>
        {v.riskNotes && (
          <p className="mt-1 text-[11.5px] text-muted">{v.riskNotes}</p>
        )}
      </Td>
      <Td>
        {v.priceIntelligence && (
          <p className="text-[12px] text-ink-2">{v.priceIntelligence}</p>
        )}
        {v.alternativeSuggestions && v.alternativeSuggestions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {v.alternativeSuggestions.map((a, i) => (
              <Badge key={i} variant="neutral">{a}</Badge>
            ))}
          </div>
        )}
        {!v.priceIntelligence && !v.alternativeSuggestions && (
          <span className="text-[12px] text-faint">—</span>
        )}
      </Td>
    </tr>
  );
}

export default function VendorsPage() {
  const vendors = [...db.VENDORS].sort((a, b) => {
    const aBase = db.toBase(a.totalSpendMinor, a.currency);
    const bBase = db.toBase(b.totalSpendMinor, b.currency);
    return bBase - aBase;
  });

  const maxSpend = vendors.reduce((m, v) => Math.max(m, db.toBase(v.totalSpendMinor, v.currency)), 0);
  const totalSpend = vendors.reduce((s, v) => s + db.toBase(v.totalSpendMinor, v.currency), 0);
  const risky = vendors.filter((v) => v.riskLevel !== "low");
  const top = vendors[0];

  return (
    <div className="animate-in space-y-6">
      <PageHeader
        title="Vendor intelligence"
        description="Spend concentration, risk flags, price intelligence, and alternative suggestions — enriched by the Vendor Intelligence agent using public data sources. No purchasing actions are taken automatically."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Vendors tracked" value={vendors.length} sub="active suppliers" icon="vendor" />
        <StatTile
          label="Total spend"
          value={money(totalSpend, "MYR", { compact: true })}
          sub="base currency · all time"
          icon="analytics"
        />
        <StatTile
          label="Risk flags"
          value={risky.length}
          sub="medium or high risk"
          icon="alert"
          tone={risky.length > 0 ? "warn" : "pos"}
        />
        <StatTile
          label="Top vendor"
          value={top?.name.split(" ")[0] ?? "—"}
          sub={top ? money(db.toBase(top.totalSpendMinor, top.currency), "MYR", { compact: true }) : ""}
          icon="spark"
          tone="brand"
        />
      </div>

      {risky.length > 0 && (
        <section>
          <h2 className="mb-3 text-[15px] font-semibold text-ink">Risk flags</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {risky.map((v) => (
              <Card key={v.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon name="alert" size={16} className="text-warn-fg" />
                      <span className="text-[14px] font-semibold text-ink">{v.name}</span>
                    </div>
                    <p className="mt-1 text-[12.5px] text-muted">{v.riskNotes}</p>
                    <p className="mt-1 text-[12px] text-faint">
                      {v.transactionCount} transactions · last {fmtDate(v.lastTransactionAt)}
                    </p>
                  </div>
                  <Badge variant={RISK[v.riskLevel].variant} dot>
                    {RISK[v.riskLevel].label}
                  </Badge>
                </div>
                {v.lastEnrichedAt && (
                  <p className="mt-2 text-[11px] text-faint">
                    Enriched {fmtDate(v.lastEnrichedAt)} · source: Vendor Intelligence Agent (Exa)
                  </p>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      <Card pad={false}>
        <div className="px-5 pt-5">
          <CardHeader
            title="All vendors"
            subtitle="Sorted by spend · base currency (MYR)"
            icon="vendor"
          />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th>Vendor</Th>
                <Th>Country</Th>
                <Th>Total spend</Th>
                <Th>Txns</Th>
                <Th>Last activity</Th>
                <Th>Risk</Th>
                <Th>Intelligence</Th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <VendorRow key={v.id} v={v} maxSpend={maxSpend} />
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Enrichment source" icon="search" />
        <p className="text-[12.5px] leading-relaxed text-muted">
          Vendor risk signals, price intelligence, and alternative suggestions are sourced by the Vendor Intelligence Agent
          using Exa search and public web data. All enrichment is informational — the agent never switches suppliers or
          commits spend without explicit human approval.
        </p>
        <p className="mt-2 text-[11.5px] text-faint">
          Last enrichment run: {fmtDate(db.NOW)} · 07:31 MYT.
        </p>
      </Card>
    </div>
  );
}
