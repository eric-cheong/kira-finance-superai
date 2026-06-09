import * as db from "@/lib/data/store";
import { fmtDate, money } from "@/lib/format";
import type { Booking, BookingQuote, BookingQuoteOption, BookingStatus } from "@/lib/types";
import { providerStatus } from "@/lib/backend/provider-config";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Icon,
  KeyValue,
  PageHeader,
  StatTile,
  Table,
  Td,
  Th,
  Notice,
} from "@/components/ui";
import { BookingApproval } from "@/components/bookings-client";

export const metadata = { title: "Bookings · Kira" };

const STATUS: Record<BookingStatus, { label: string; variant: "pos" | "info" | "warn" | "neutral" | "crit" }> = {
  quoted: { label: "quoted", variant: "neutral" },
  pending_approval: { label: "pending approval", variant: "warn" },
  approved: { label: "approved", variant: "pos" },
  booked: { label: "booked", variant: "pos" },
  cancelled: { label: "cancelled", variant: "crit" },
};

const TYPE_ICON: Record<string, "flight" | "hotel" | "vendor" | "transactions"> = {
  flight: "flight",
  hotel: "hotel",
  product: "vendor",
  rail: "transactions",
  car: "transactions",
};

function ProviderTrustPanel() {
  const providers = providerStatus();
  const liveOpenAI = providers.openai.configured;
  const liveExa = providers.exa.configured;
  return (
    <Card>
      <CardHeader
        title="Research agent"
        subtitle="Live providers are optional; approval remains mandatory."
        icon="spark"
        right={<Badge variant={liveOpenAI || liveExa ? "brand" : "neutral"} dot>{liveOpenAI || liveExa ? "live-ready" : "offline"}</Badge>}
      />
      <div className="grid gap-2 text-[12.5px] sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface-2/45 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-ink">OpenAI Agents</span>
            <Badge variant={liveOpenAI ? "pos" : "neutral"}>{liveOpenAI ? providers.openai.model : "fallback"}</Badge>
          </div>
          <p className="mt-1 text-muted">Compares options and synthesizes risk notes.</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-2/45 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-ink">Exa search</span>
            <Badge variant={liveExa ? "pos" : "neutral"}>{liveExa ? "connected" : "not set"}</Badge>
          </div>
          <p className="mt-1 text-muted">Finds fares, policies, hidden fees, and reviews.</p>
        </div>
      </div>
      <Notice icon="lock" variant="info" className="mt-3">
        Research can create quote records only. Booking still requires your explicit confirmation; Kira never charges,
        reserves, settles, or moves money directly.
      </Notice>
    </Card>
  );
}

function SourceItem({ source }: { source: string }) {
  const isUrl = /^https?:\/\//i.test(source);
  return (
    <li className="flex min-w-0 items-start gap-1.5 text-[12px] text-muted">
      <Icon name={isUrl ? "arrowUpRight" : "search"} size={12} className="mt-0.5 shrink-0 text-faint" />
      {isUrl ? (
        <a href={source} target="_blank" rel="noreferrer" className="min-w-0 truncate text-brand hover:underline">
          {source}
        </a>
      ) : (
        <span className="min-w-0 truncate">{source}</span>
      )}
    </li>
  );
}

function QuoteCard({ q }: { q: BookingQuote }) {
  const sorted = [...q.options].sort((a, b) => a.amountMinor - b.amountMinor);
  const cheapest = sorted[0];
  const icon = TYPE_ICON[q.type] ?? "transactions";
  return (
    <Card>
      <CardHeader
        title={q.description}
        subtitle={`Requested by ${db.user(q.requestedBy)?.name ?? q.requestedBy} · ${fmtDate(q.createdAt)}`}
        icon={icon}
        right={
          <Badge variant="warn" dot>
            awaiting approval
          </Badge>
        }
      />

      <div className="space-y-2">
        {sorted.map((opt: BookingQuoteOption) => {
          const isCheapest = opt.index === cheapest.index;
          return (
            <div
              key={opt.index}
              className="rounded-lg border border-border bg-surface-2/40 px-4 py-3"
            >
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-semibold text-ink">{opt.label}</span>
                    {isCheapest && <Badge variant="pos">cheapest</Badge>}
                  </div>
                  <p className="mt-0.5 text-[12px] text-muted">{opt.supplier}</p>
                  <ul className="mt-1.5 space-y-0.5">
                    {opt.notes.map((n, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[12px] text-ink-2">
                        <Icon name="dot" size={10} className="mt-1 shrink-0 text-faint" />
                        {n}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {opt.breakdown.map((b, i) => (
                      <span key={i} className="tnum rounded border border-border px-2 py-0.5 text-[11.5px] text-muted">
                        {b.item}: {b.amountMinor === 0 ? "incl." : money(b.amountMinor, opt.currency)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="w-full shrink-0 text-left sm:w-auto sm:text-right">
                  <div className="tnum text-[17px] font-semibold text-ink">{money(opt.amountMinor, opt.currency)}</div>
                  {opt.expiresAt && (
                    <div className="mt-0.5 text-[11px] text-faint">expires {fmtDate(opt.expiresAt)}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 space-y-2 border-t border-border pt-3">
        <p className="text-[12px] font-medium text-faint">Research sources</p>
        <ul className="space-y-1">
          {q.researchSources.map((s, i) => (
            <SourceItem key={`${s}-${i}`} source={s} />
          ))}
        </ul>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-warn-fg/20 bg-warn-bg px-3 py-2.5 text-[12px] text-ink">
        <Icon name="lock" size={14} className="mt-0.5 shrink-0" />
        <span>
          No booking has been placed. Selecting an option below records approved committed spend only; supplier
          reservation requires a separate licensed execution path.
        </span>
      </div>

      <BookingApproval quoteId={q.id} options={sorted} />
    </Card>
  );
}

function BookingRow({ b }: { b: Booking }) {
  const st = STATUS[b.status];
  const icon = TYPE_ICON[b.type] ?? "transactions";
  return (
    <tr className="hover:bg-surface-2/40">
      <Td>
        <div className="flex items-center gap-2">
          <Icon name={icon} size={15} className="shrink-0 text-faint" />
          <span className="font-medium text-ink">{b.description}</span>
        </div>
      </Td>
      <Td className="whitespace-nowrap tnum text-[12.5px] text-muted">{fmtDate(b.startDate)}</Td>
      <Td className="whitespace-nowrap text-[12.5px]">{b.supplier}</Td>
      <Td className="whitespace-nowrap tnum font-semibold text-ink">{money(b.amountMinor, b.currency)}</Td>
      <Td>
        <Badge variant={st.variant} dot>
          {st.label}
        </Badge>
      </Td>
      <Td className="whitespace-nowrap tnum text-[11.5px] text-faint">{b.confirmationRef ?? "—"}</Td>
    </tr>
  );
}

function BookingMobileCard({ b }: { b: Booking }) {
  const st = STATUS[b.status];
  const icon = TYPE_ICON[b.type] ?? "transactions";
  return (
    <article className="px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon name={icon} size={15} className="shrink-0 text-faint" />
            <h3 className="truncate text-[14px] font-semibold text-ink">{b.description}</h3>
          </div>
          <p className="mt-1 text-[12px] text-muted">{fmtDate(b.startDate)} · {b.supplier}</p>
          <p className="tnum mt-1 text-[11.5px] text-faint">{b.confirmationRef ?? "No reference yet"}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="tnum text-[13.5px] font-semibold text-ink">{money(b.amountMinor, b.currency)}</div>
          <Badge variant={st.variant} dot>{st.label}</Badge>
        </div>
      </div>
    </article>
  );
}

export default function BookingsPage() {
  const quotes = db.BOOKING_QUOTES;
  const bookings = db.BOOKINGS;
  const openQuotes = quotes.filter((q) => q.status === "open");
  const confirmed = bookings.filter((b) => b.status === "booked" || b.status === "approved");

  return (
    <div className="animate-in space-y-6">
      <PageHeader
        title="Bookings"
        description="Travel and procurement quotes ready for your approval, plus a record of approved or confirmed commitments. The agent researches and compares; supplier execution stays outside Kira."
        badge={
          openQuotes.length > 0 ? (
            <Badge variant="warn" dot>
              {openQuotes.length} awaiting approval
            </Badge>
          ) : (
            <Badge variant="pos">all clear</Badge>
          )
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Open quotes" value={openQuotes.length} sub="need your selection" icon="flight" tone="warn" />
        <StatTile label="Approved" value={confirmed.length} sub="commitments on record" icon="check" tone="pos" />
        <StatTile label="Committed" value={money(bookings.reduce((s, b) => s + b.amountMinor, 0), "MYR", { compact: true })} sub="this period" icon="transactions" />
        <StatTile label="Unlinked" value={bookings.filter((b) => !b.linkedTransactionId).length} sub="awaiting transaction match" icon="alert" tone="neutral" />
      </div>

      <ProviderTrustPanel />

      {openQuotes.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-[15px] font-semibold text-ink">Quotes awaiting approval</h2>
          {openQuotes.map((q) => (
            <QuoteCard key={q.id} q={q} />
          ))}
        </section>
      )}

      <section>
        <h2 className="mb-3 text-[15px] font-semibold text-ink">Commitment history</h2>
        <Card pad={false}>
          <div className="divide-y divide-border md:hidden">
            {bookings.map((b) => (
              <BookingMobileCard key={b.id} b={b} />
            ))}
            {bookings.length === 0 && (
              <div className="px-4 py-8 text-center text-[13px] text-muted">No bookings yet</div>
            )}
          </div>
          <Table className="hidden md:block">
            <thead>
              <tr>
                <Th>Trip / item</Th>
                <Th>Date</Th>
                <Th>Supplier</Th>
                <Th className="text-right">Amount</Th>
                <Th>Status</Th>
                <Th>Ref</Th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <BookingRow key={b.id} b={b} />
              ))}
              {bookings.length === 0 && (
                <tr>
                  <Td className="text-center text-muted" colSpan={6}>
                    No bookings yet
                  </Td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card>
      </section>

      <Card>
        <CardHeader title="How booking works" icon="shield" />
        <div className="grid gap-3 text-[12.5px] leading-relaxed text-ink-2 sm:grid-cols-3">
          {[
            { step: "1. Research", body: "The agent searches live fares and public sources using Exa for policy, baggage rules, and hidden fees. No booking yet." },
            { step: "2. Compare", body: "Three options are presented with total cost breakdowns and source citations. You select the option that fits." },
            { step: "3. Approve", body: "Your explicit confirmation records committed spend for finance tracking. Supplier booking requires a separate licensed execution path." },
          ].map((s) => (
            <div key={s.step} className="rounded-lg border border-border px-4 py-3">
              <div className="mb-1.5 font-semibold text-ink">{s.step}</div>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
