import * as db from "@/lib/data/store";
import { fmtDateShort, money } from "@/lib/format";
import type { TransactionEvent } from "@/lib/types";
import {
  Badge,
  Bar,
  Card,
  CardHeader,
  FinanceTableControlsScript,
  Icon,
  PageHeader,
  StatTile,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { Thumb } from "@/components/thumb";

export const metadata = { title: "Transactions · Kira" };

const STATUS_DOT: Record<TransactionEvent["status"], string> = {
  matched: "bg-brand/55",
  unmatched: "bg-faint/45",
  needs_review: "bg-brand/35",
};
const STATUS_LABEL: Record<TransactionEvent["status"], string> = {
  matched: "Matched",
  unmatched: "Unmatched",
  needs_review: "Review",
};

const tableControlClass =
  "h-11 w-full rounded-lg border border-border bg-surface-2/65 px-3 text-[13px] text-ink outline-none transition placeholder:text-faint hover:border-border-strong focus:border-brand/50 sm:h-9";

function duplicateIds(): Set<string> {
  const set = new Set<string>();
  const txns = db.TRANSACTIONS;
  for (let a = 0; a < txns.length; a++) {
    for (let b = a + 1; b < txns.length; b++) {
      const x = txns[a], y = txns[b];
      const dt = Math.abs(new Date(x.occurredAt).getTime() - new Date(y.occurredAt).getTime());
      if (x.merchant === y.merchant && x.amountMinor === y.amountMinor && x.currency === y.currency && dt <= 48 * 3600e3) {
        set.add(x.id);
        set.add(y.id);
      }
    }
  }
  return set;
}

function TransactionMobileCard({ t, duplicate }: { t: TransactionEvent; duplicate: boolean }) {
  const match = db.matchForTransaction(t.id);
  const rcp = match ? db.receipt(match.receiptId) : undefined;

  return (
    <article className="px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[t.status]}`} />
            <span className="text-[12px] font-medium text-muted">{STATUS_LABEL[t.status]}</span>
            {duplicate && t.status !== "matched" && (
              <Badge variant="crit" dot>
                Possible duplicate
              </Badge>
            )}
          </div>
          <h3 className="mt-1 truncate text-[14px] font-semibold text-ink">{t.merchant}</h3>
          <p className="mt-0.5 text-[12px] leading-snug text-muted">{t.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-faint">
            <span className="tnum">{fmtDateShort(t.occurredAt)}</span>
            <span aria-hidden>·</span>
            <span className="truncate">{t.sourceRef}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="tnum text-[14px] font-semibold text-ink">{money(t.amountMinor, t.currency)}</div>
          {t.currency !== "MYR" && (
            <div className="tnum text-[11px] text-faint">≈ {money(db.toBase(t.amountMinor, t.currency), "MYR")}</div>
          )}
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-border bg-surface-2/45 px-3 py-2">
        {rcp ? (
          <div className="flex items-center gap-2">
            <Thumb hint={rcp.thumbHint} size={28} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-medium text-ink">{rcp.supplier}</div>
              <div className="text-[11.5px] text-muted">Receipt match</div>
            </div>
            <Badge variant={match!.score >= 90 ? "pos" : "warn"}>{match!.score}%</Badge>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[12px] text-muted">
            <Icon name="doc" size={14} className="shrink-0 text-faint" />
            No receipt matched yet
          </div>
        )}
      </div>
    </article>
  );
}

export default function TransactionsPage() {
  const m = db.matchStats();
  const cr = db.closeReadiness();
  const dupes = duplicateIds();
  const rows = [...db.TRANSACTIONS].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  return (
    <div className="animate-in space-y-6">
      <PageHeader
        title="Transactions & reconciliation"
        description="Bank and card lines imported read-only — Kira never originates or moves this money. The matching engine pairs each line to a receipt; unmatched and ambiguous items are surfaced for close."
      />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatTile label="Imported" value={m.total} sub="this period" icon="transactions" />
        <StatTile label="Matched" value={m.matched} sub={`${m.matchedPct}% auto`} icon="check" tone="pos" />
        <StatTile label="In review" value={m.review} sub="FX / asset ambiguity" icon="alert" tone="warn" />
        <StatTile label="Unmatched" value={m.unmatched} sub="missing receipts" icon="search" tone="neutral" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card pad={false} data-finance-table data-storage-key="transactions-ledger" data-default-sort="date:desc">
          <FinanceTableControlsScript />
          <div className="px-5 pt-5">
            <CardHeader title="Ledger lines" subtitle="Read-only · system of record-keeping, not a money ledger" icon="transactions" />
          </div>
          <div className="grid gap-2 border-y border-border bg-surface-2/25 px-4 py-3 lg:grid-cols-[minmax(220px,1fr)_160px_170px_170px_auto]">
            <label className="relative min-w-0">
              <span className="sr-only">Search ledger lines</span>
              <Icon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input
                data-finance-search
                className={`${tableControlClass} pl-9`}
                placeholder="Search merchant, description, source"
                type="search"
              />
            </label>
            <label className="min-w-0">
              <span className="sr-only">Filter by status</span>
              <select data-finance-filter="status" className={tableControlClass} defaultValue="all">
                <option value="all">All statuses</option>
                <option value="matched">Matched</option>
                <option value="needs_review">Review</option>
                <option value="unmatched">Unmatched</option>
              </select>
            </label>
            <label className="min-w-0">
              <span className="sr-only">Filter by match state</span>
              <select data-finance-filter="match" className={tableControlClass} defaultValue="all">
                <option value="all">All match states</option>
                <option value="with_receipt">With receipt</option>
                <option value="missing_receipt">Missing receipt</option>
                <option value="duplicate_risk">Duplicate risk</option>
              </select>
            </label>
            <label className="min-w-0">
              <span className="sr-only">Sort ledger lines</span>
              <select data-finance-sort className={tableControlClass} defaultValue="date:desc">
                <option value="date:desc">Newest first</option>
                <option value="date:asc">Oldest first</option>
                <option value="amount:desc">Amount high</option>
                <option value="amount:asc">Amount low</option>
                <option value="merchant:asc">Merchant A-Z</option>
                <option value="status:asc">Status</option>
              </select>
            </label>
            <button
              type="button"
              data-finance-reset
              className="h-11 rounded-lg border border-border bg-surface px-3 text-[13px] font-medium text-ink transition hover:border-border-strong hover:bg-surface-2 sm:h-9"
            >
              Reset
            </button>
            <div className="lg:col-span-5 flex items-center gap-2 text-[12px] text-muted">
              <span className="tnum font-semibold text-ink" data-finance-visible-count>{rows.length}</span>
              <span>of</span>
              <span className="tnum">{rows.length}</span>
              <span>ledger lines shown</span>
            </div>
          </div>
          <div className="divide-y divide-border md:hidden" data-finance-row-list>
            {rows.map((t) => {
              const match = db.matchForTransaction(t.id);
              const matchState = dupes.has(t.id) && t.status !== "matched" ? "duplicate_risk" : match ? "with_receipt" : "missing_receipt";
              const search = [t.merchant, t.description, t.sourceRef, t.source, t.currency, STATUS_LABEL[t.status]].join(" ");
              return (
                <div
                  key={t.id}
                  data-finance-row
                  data-row-id={t.id}
                  data-search={search}
                  data-status={t.status}
                  data-match={matchState}
                  data-date={t.occurredAt}
                  data-amount={db.toBase(t.amountMinor, t.currency)}
                  data-merchant={t.merchant}
                >
                  <TransactionMobileCard t={t} duplicate={dupes.has(t.id)} />
                </div>
              );
            })}
          </div>
          <Table className="hidden md:block">
            <thead>
              <tr>
                <Th>Status</Th>
                <Th>Date</Th>
                <Th>Description</Th>
                <Th>Source</Th>
                <Th className="text-right">Amount</Th>
                <Th>Match</Th>
              </tr>
            </thead>
            <tbody data-finance-row-list>
              {rows.map((t) => {
                const match = db.matchForTransaction(t.id);
                const rcp = match ? db.receipt(match.receiptId) : undefined;
                const matchState = dupes.has(t.id) && t.status !== "matched" ? "duplicate_risk" : match ? "with_receipt" : "missing_receipt";
                const search = [t.merchant, t.description, t.sourceRef, t.source, t.currency, STATUS_LABEL[t.status], rcp?.supplier ?? ""].join(" ");
                return (
                  <tr
                    key={t.id}
                    className="hover:bg-surface-2/40"
                    data-finance-row
                    data-row-id={t.id}
                    data-search={search}
                    data-status={t.status}
                    data-match={matchState}
                    data-date={t.occurredAt}
                    data-amount={db.toBase(t.amountMinor, t.currency)}
                    data-merchant={t.merchant}
                  >
                    <Td>
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[t.status]}`} />
                        <span className="text-[12.5px]">{STATUS_LABEL[t.status]}</span>
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap tnum text-[12.5px] text-muted">{fmtDateShort(t.occurredAt)}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink">{t.merchant}</span>
                        {dupes.has(t.id) && t.status !== "matched" && (
                          <Badge variant="crit" dot>
                            dup?
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11.5px] text-faint">{t.description}</span>
                    </Td>
                    <Td className="whitespace-nowrap text-[12px] text-muted">{t.sourceRef}</Td>
                    <Td className="whitespace-nowrap text-right">
                      <span className="tnum font-semibold text-ink">{money(t.amountMinor, t.currency)}</span>
                      {t.currency !== "MYR" && (
                        <div className="tnum text-[11px] text-faint">≈ {money(db.toBase(t.amountMinor, t.currency), "MYR")}</div>
                      )}
                    </Td>
                    <Td>
                      {rcp ? (
                        <span className="inline-flex items-center gap-2">
                          <Thumb hint={rcp.thumbHint} size={26} />
                          <span className="text-[12px] text-ink-2">{rcp.supplier.split(" ")[0]}</span>
                          <Badge variant={match!.score >= 90 ? "pos" : "warn"}>{match!.score}%</Badge>
                        </span>
                      ) : (
                        <span className="text-[12px] text-faint">— no receipt</span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          <div data-finance-empty hidden className="px-5 py-8 text-center text-[13px] text-muted">
            No ledger lines match the current controls.
          </div>
        </Card>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader title="Close-readiness" icon="check" />
            <div className="mb-2 flex items-end justify-between">
              <span className="tnum text-2xl font-semibold text-ink">{cr.score}%</span>
              <Badge variant={cr.score >= 80 ? "pos" : cr.score >= 60 ? "warn" : "crit"}>
                {cr.score >= 80 ? "on track" : "blockers"}
              </Badge>
            </div>
            <Bar value={cr.score} tone={cr.score >= 80 ? "pos" : cr.score >= 60 ? "warn" : "crit"} />
            <ul className="mt-3 space-y-1.5">
              {cr.blockers.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] text-muted">
                  <Icon name="dot" size={10} className="mt-1 shrink-0 text-faint" />
                  {b}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Matching basis" subtitle="How auto-matches are scored" icon="spark" />
            <ul className="space-y-2 text-[12.5px] text-muted">
              <li className="flex items-center gap-2"><Badge variant="pos">amount</Badge> exact minor-unit equality</li>
              <li className="flex items-center gap-2"><Badge variant="info">date ±1d</Badge> settlement vs document date</li>
              <li className="flex items-center gap-2"><Badge variant="neutral">merchant~</Badge> fuzzy name similarity</li>
            </ul>
            <p className="mt-3 text-[11.5px] text-faint">Matches ≥ 90% auto-confirm; 80–90% are suggested for a human; below 80% stay unmatched.</p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
