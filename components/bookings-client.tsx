"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/format";
import type { Booking, BookingQuote, BookingQuoteOption, BookingType, CurrencyCode } from "@/lib/types";
import { Badge, Button, Card, CardHeader, Icon, Notice } from "@/components/ui";
import { cn } from "@/components/ui/cn";

type QuoteResearchResult = {
  quote: BookingQuote;
  research?: {
    provider?: string;
    model?: string | null;
    summary?: string;
    riskNotes?: string[];
  };
};

type ConsumerSearchResult = {
  title: string;
  url: string;
  highlights?: string[];
  summary?: string;
};

type ReviewSearchResult = {
  search: {
    provider: "exa" | "fallback";
    status: "live" | "missing_exa_key" | "provider_error";
    query: string;
    results: ConsumerSearchResult[];
  };
  summary?: {
    subject: string;
    summary: string;
    themes: { theme: string; sentiment: string }[];
    sources?: string[];
  };
};

const inputCls =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-[13px] text-ink outline-none transition placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand/10";
const textareaCls =
  "min-h-[88px] w-full resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-[13px] leading-relaxed text-ink outline-none transition placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand/10";
const selectCls =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-[13px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10";

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[12.5px] font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] leading-relaxed text-faint">{hint}</span>}
    </label>
  );
}

async function parsePayload(response: Response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error?.message ?? "Request failed.");
  }
  return payload.data as unknown;
}

function isExternalUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function SourceLink({ value }: { value: string }) {
  return (
    <li className="flex min-w-0 items-start gap-1.5 text-[12px] text-muted">
      <Icon name={isExternalUrl(value) ? "arrowUpRight" : "search"} size={12} className="mt-0.5 shrink-0 text-faint" />
      {isExternalUrl(value) ? (
        <a href={value} target="_blank" rel="noreferrer" className="min-w-0 truncate text-brand hover:underline">
          {value}
        </a>
      ) : (
        <span className="min-w-0 truncate">{value}</span>
      )}
    </li>
  );
}

function statusBadge(status: ReviewSearchResult["search"]["status"]) {
  if (status === "live") return <Badge variant="pos" dot>live sources</Badge>;
  if (status === "missing_exa_key") return <Badge variant="neutral" dot>fallback</Badge>;
  return <Badge variant="warn" dot>provider fallback</Badge>;
}

export function BookingsResearchWorkspace() {
  const router = useRouter();
  const [quoteForm, setQuoteForm] = useState({
    type: "flight" as BookingType,
    description: "KL to Singapore return for 2 travellers, 12-14 Jun",
    budget: "520",
    currency: "MYR" as CurrencyCode,
    origin: "KUL",
    destination: "SIN",
    departDate: "2026-06-12",
    returnDate: "2026-06-14",
    travellers: "2",
    userLocation: "MY",
  });
  const [quoteState, setQuoteState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [quoteError, setQuoteError] = useState("");
  const [quoteResult, setQuoteResult] = useState<QuoteResearchResult | null>(null);
  const [reviewForm, setReviewForm] = useState({
    subject: "AirAsia KL to Singapore baggage and refund experience",
    query: "",
    userLocation: "MY",
    numResults: "6",
  });
  const [reviewState, setReviewState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [reviewError, setReviewError] = useState("");
  const [reviewResult, setReviewResult] = useState<ReviewSearchResult | null>(null);

  async function submitQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuoteState("loading");
    setQuoteError("");
    setQuoteResult(null);
    try {
      const budgetMajor = Number(quoteForm.budget);
      if (!Number.isFinite(budgetMajor) || budgetMajor <= 0) throw new Error("Enter a positive budget.");
      const travellers = Number(quoteForm.travellers);
      const data = await parsePayload(await fetch("/api/booking-quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: quoteForm.type,
          description: quoteForm.description.trim(),
          budgetMinor: Math.round(budgetMajor * 100),
          currency: quoteForm.currency,
          origin: quoteForm.origin.trim() || undefined,
          destination: quoteForm.destination.trim() || undefined,
          departDate: quoteForm.departDate || undefined,
          returnDate: quoteForm.returnDate || undefined,
          travellers: Number.isFinite(travellers) ? travellers : 1,
          userLocation: quoteForm.userLocation.trim() || undefined,
        }),
      }));
      setQuoteResult(data as QuoteResearchResult);
      setQuoteState("success");
      router.refresh();
    } catch (err) {
      setQuoteError(err instanceof Error ? err.message : "Quote research failed.");
      setQuoteState("error");
    }
  }

  async function submitReviews(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReviewState("loading");
    setReviewError("");
    setReviewResult(null);
    try {
      const data = await parsePayload(await fetch("/api/consumer/reviews/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: reviewForm.subject.trim(),
          query: reviewForm.query.trim() || undefined,
          userLocation: reviewForm.userLocation.trim() || undefined,
          numResults: Number(reviewForm.numResults),
        }),
      }));
      setReviewResult(data as ReviewSearchResult);
      setReviewState("success");
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Review search failed.");
      setReviewState("error");
    }
  }

  const quoteFallback = quoteResult?.research?.provider === "local-fallback";
  const reviewFallback = reviewResult ? reviewResult.search.status !== "live" : false;

  return (
    <Card>
      <CardHeader
        title="AI research"
        subtitle="Create a quote request or search consumer review sources before approval."
        icon="spark"
        right={<Badge variant="info" dot>human approval required</Badge>}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <form onSubmit={submitQuote} className="min-w-0 space-y-4 rounded-lg border border-border bg-surface-2/35 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-[14px] font-semibold text-ink">Create quote research</h3>
              <p className="mt-0.5 text-[12px] text-muted">Posts to /api/booking-quotes and adds an approval-only quote.</p>
            </div>
            {quoteState === "success" && <Badge variant={quoteFallback ? "neutral" : "pos"}>{quoteFallback ? "fallback" : "created"}</Badge>}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Type">
              <select className={selectCls} value={quoteForm.type} onChange={(event) => setQuoteForm((current) => ({ ...current, type: event.target.value as BookingType }))}>
                <option value="flight">Flight</option>
                <option value="hotel">Hotel</option>
                <option value="rail">Rail</option>
                <option value="car">Car</option>
                <option value="product">Product</option>
              </select>
            </Field>
            <Field label="Budget">
              <input className={inputCls} inputMode="decimal" value={quoteForm.budget} onChange={(event) => setQuoteForm((current) => ({ ...current, budget: event.target.value }))} required />
            </Field>
            <Field label="Currency">
              <select className={selectCls} value={quoteForm.currency} onChange={(event) => setQuoteForm((current) => ({ ...current, currency: event.target.value as CurrencyCode }))}>
                <option value="MYR">MYR</option>
                <option value="SGD">SGD</option>
                <option value="USD">USD</option>
              </select>
            </Field>
          </div>

          <Field label="Request">
            <textarea className={textareaCls} value={quoteForm.description} onChange={(event) => setQuoteForm((current) => ({ ...current, description: event.target.value }))} required />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Origin">
              <input className={inputCls} value={quoteForm.origin} onChange={(event) => setQuoteForm((current) => ({ ...current, origin: event.target.value }))} />
            </Field>
            <Field label="Destination">
              <input className={inputCls} value={quoteForm.destination} onChange={(event) => setQuoteForm((current) => ({ ...current, destination: event.target.value }))} />
            </Field>
            <Field label="Depart date">
              <input type="date" className={inputCls} value={quoteForm.departDate} onChange={(event) => setQuoteForm((current) => ({ ...current, departDate: event.target.value }))} />
            </Field>
            <Field label="Return date">
              <input type="date" className={inputCls} value={quoteForm.returnDate} onChange={(event) => setQuoteForm((current) => ({ ...current, returnDate: event.target.value }))} />
            </Field>
            <Field label="Travellers">
              <input type="number" min={1} max={9} className={inputCls} value={quoteForm.travellers} onChange={(event) => setQuoteForm((current) => ({ ...current, travellers: event.target.value }))} />
            </Field>
            <Field label="User location" hint="Two-letter country code for provider search.">
              <input className={inputCls} value={quoteForm.userLocation} onChange={(event) => setQuoteForm((current) => ({ ...current, userLocation: event.target.value.toUpperCase() }))} />
            </Field>
          </div>

          <Button type="submit" variant="primary" icon="search" disabled={quoteState === "loading"} className="w-full sm:w-auto">
            {quoteState === "loading" ? "Researching" : "Create quote"}
          </Button>
          {quoteState === "loading" && <Notice icon="clock" variant="info">Researching options, policies, and source citations. No supplier action is being taken.</Notice>}
          {quoteState === "error" && <Notice icon="alert" variant="crit">{quoteError}</Notice>}
          {quoteResult && (
            <div className="space-y-3 rounded-lg border border-border bg-surface px-3 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink">{quoteResult.quote.description}</p>
                  <p className="mt-0.5 text-[12px] text-muted">{quoteResult.quote.options.length} options created · approval still required</p>
                </div>
                <Badge variant={quoteFallback ? "neutral" : "pos"} dot>{quoteFallback ? "local fallback" : quoteResult.research?.provider ?? "researched"}</Badge>
              </div>
              {quoteResult.research?.summary && <p className="text-[12.5px] leading-relaxed text-ink-2">{quoteResult.research.summary}</p>}
              <div className="grid gap-2 sm:grid-cols-2">
                {quoteResult.quote.options.slice(0, 4).map((option) => (
                  <div key={`${quoteResult.quote.id}-${option.index}`} className="rounded-lg border border-border bg-surface-2/45 px-3 py-2">
                    <p className="text-[12.5px] font-medium text-ink">{option.label}</p>
                    <p className="mt-0.5 text-[12px] text-muted">{option.supplier} · {money(option.amountMinor, option.currency)}</p>
                  </div>
                ))}
              </div>
              {quoteResult.research?.riskNotes && quoteResult.research.riskNotes.length > 0 && (
                <ul className="space-y-1">
                  {quoteResult.research.riskNotes.map((note, index) => (
                    <li key={`${note}-${index}`} className="flex items-start gap-1.5 text-[12px] text-muted">
                      <Icon name="alert" size={12} className="mt-0.5 shrink-0 text-faint" />
                      {note}
                    </li>
                  ))}
                </ul>
              )}
              <ul className="space-y-1">
                {quoteResult.quote.researchSources.length > 0 ? quoteResult.quote.researchSources.map((source, index) => <SourceLink key={`${source}-${index}`} value={source} />) : <li className="text-[12px] text-muted">No sources returned by the provider.</li>}
              </ul>
            </div>
          )}
        </form>

        <form onSubmit={submitReviews} className="min-w-0 space-y-4 rounded-lg border border-border bg-surface-2/35 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-[14px] font-semibold text-ink">Review search</h3>
              <p className="mt-0.5 text-[12px] text-muted">Searches /api/consumer/reviews/search for complaints, caveats, and citations.</p>
            </div>
            {reviewResult && statusBadge(reviewResult.search.status)}
          </div>
          <Field label="Subject">
            <input className={inputCls} value={reviewForm.subject} onChange={(event) => setReviewForm((current) => ({ ...current, subject: event.target.value }))} required />
          </Field>
          <Field label="Optional query">
            <textarea className={textareaCls} placeholder="Leave blank to let Kira build a complaint/refund/fee search query." value={reviewForm.query} onChange={(event) => setReviewForm((current) => ({ ...current, query: event.target.value }))} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="User location">
              <input className={inputCls} value={reviewForm.userLocation} onChange={(event) => setReviewForm((current) => ({ ...current, userLocation: event.target.value.toUpperCase() }))} />
            </Field>
            <Field label="Results">
              <input type="number" min={1} max={10} className={inputCls} value={reviewForm.numResults} onChange={(event) => setReviewForm((current) => ({ ...current, numResults: event.target.value }))} />
            </Field>
          </div>
          <Button type="submit" variant="outline" icon="search" disabled={reviewState === "loading"} className="w-full sm:w-auto">
            {reviewState === "loading" ? "Searching" : "Search reviews"}
          </Button>
          {reviewState === "loading" && <Notice icon="clock" variant="info">Searching consumer sources and preparing a concise review synthesis.</Notice>}
          {reviewState === "error" && <Notice icon="alert" variant="crit">{reviewError}</Notice>}
          {reviewResult && (
            <div className="space-y-3 rounded-lg border border-border bg-surface px-3 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink">{reviewResult.summary?.subject ?? reviewForm.subject}</p>
                  <p className="mt-0.5 text-[12px] text-muted">Query: <span className="text-ink-2">{reviewResult.search.query}</span></p>
                </div>
                <Badge variant={reviewFallback ? "neutral" : "pos"} dot>{reviewResult.search.provider}</Badge>
              </div>
              {reviewFallback && <Notice icon="alert" variant="warn">Live review search is unavailable ({reviewResult.search.status}). Configure Exa for live results.</Notice>}
              {reviewResult.summary?.summary && <p className="text-[12.5px] leading-relaxed text-ink-2">{reviewResult.summary.summary}</p>}
              {reviewResult.summary?.themes && reviewResult.summary.themes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {reviewResult.summary.themes.slice(0, 6).map((theme) => (
                    <span key={theme.theme} className="rounded border border-border bg-surface-2 px-2 py-1 text-[11.5px] text-muted">{theme.theme} · {theme.sentiment}</span>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                {reviewResult.search.results.length > 0 ? reviewResult.search.results.map((item, index) => (
                  <article key={`${item.url}-${index}`} className="rounded-lg border border-border bg-surface-2/45 px-3 py-2.5">
                    <a href={isExternalUrl(item.url) ? item.url : undefined} target="_blank" rel="noreferrer" className="text-[12.5px] font-medium text-brand hover:underline">
                      {item.title}
                    </a>
                    {item.summary && <p className="mt-1 text-[12px] leading-relaxed text-muted">{item.summary}</p>}
                    {item.highlights && item.highlights.length > 0 && <p className="mt-1 text-[11.5px] leading-relaxed text-faint">{item.highlights[0]}</p>}
                  </article>
                )) : <div className="rounded-lg border border-border bg-surface-2/45 px-3 py-6 text-center text-[12.5px] text-muted">No review sources returned.</div>}
              </div>
              {reviewResult.summary?.sources && reviewResult.summary.sources.length > 0 && (
                <ul className="space-y-1">
                  {reviewResult.summary.sources.map((source, index) => <SourceLink key={`${source}-${index}`} value={source} />)}
                </ul>
              )}
            </div>
          )}
        </form>
      </div>
    </Card>
  );
}

export function BookingApproval({
  quoteId,
  options,
}: {
  quoteId: string;
  options: BookingQuoteOption[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);
  const [state, setState] = useState<"idle" | "confirming" | "confirmed" | "rejected">("idle");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const selectedOption = selected === null ? null : options.find((option) => option.index === selected) ?? null;

  async function submitDecision(decision: "approve" | "reject") {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/bookings/${quoteId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, selectedIndex: selected, confirm: decision === "approve" }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message ?? "Booking decision failed.");
      }
      setBooking(payload.data.booking ?? null);
      setState(decision === "approve" ? "confirmed" : "rejected");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking decision failed.");
    } finally {
      setPending(false);
    }
  }

  if (state === "confirmed" && selectedOption) {
    const opt = selectedOption;
    return (
      <div className="mt-4 flex flex-col gap-2 rounded-lg border border-pos-fg/20 bg-pos-bg p-4">
        <div className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
          <Icon name="check" size={16} />
          Booking approved — {opt.label}
        </div>
        <p className="text-[12.5px] text-muted">
          {money(opt.amountMinor, opt.currency)} · {opt.supplier}. Finance tracker has been updated with approved
          committed spend. A supplier reservation still requires a separate licensed execution path.
        </p>
        <p className="text-[11.5px] text-faint">
          Internal record: {booking?.id ?? `${quoteId}-opt${selected}`} · Audit log entry created.
        </p>
      </div>
    );
  }

  if (state === "rejected") {
    return (
      <div className="mt-4 flex flex-col items-start gap-1.5 rounded-lg border border-crit-fg/20 bg-crit-bg px-3 py-2.5 text-[13px] text-ink">
        <span className="flex items-center gap-2">
          <Icon name="alert" size={15} />
          Quote declined — no booking placed and this quote is now closed.
        </span>
        <span className="text-[12px] text-muted">Create a fresh quote request if you want another comparison.</span>
      </div>
    );
  }

  if (state === "confirming" && selectedOption) {
    const opt = selectedOption;
    return (
      <div className="mt-4 rounded-lg border border-brand/20 bg-brand-soft p-4">
        <div className="flex items-start gap-2">
          <Icon name="lock" size={16} className="mt-0.5 shrink-0 text-muted" />
          <div className="min-w-0">
            <h3 className="text-[13.5px] font-semibold text-ink">Review before approving spend</h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
              {opt.label} · {opt.supplier} · <span className="tnum font-medium text-ink">{money(opt.amountMinor, opt.currency)}</span>.
              This records committed spend only; no payment, reservation, or supplier confirmation is made by Kira.
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button className="w-full sm:w-auto" variant="outline" disabled={pending} onClick={() => setState("idle")}>
            Cancel
          </Button>
          <Button className="w-full sm:w-auto" variant="primary" icon="check" disabled={pending} onClick={() => submitDecision("approve")}>
            {pending ? "Approving" : "Approve spend"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="text-[12.5px] font-medium text-ink-2">Select an option to approve:</p>
      <div className="space-y-2">
        {options.map((opt) => (
          <button
            key={opt.index}
            onClick={() => setSelected(opt.index)}
            aria-pressed={selected === opt.index}
            className={cn(
              "flex min-h-11 w-full transform-gpu flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition active:translate-y-[1px] sm:flex-row sm:items-center sm:justify-between",
              selected === opt.index
                ? "border-brand bg-brand-soft shadow-card"
                : "border-border bg-surface hover:border-border-strong",
            )}
          >
            <span className="text-[13px] font-medium text-ink">{opt.label}</span>
            <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
              <span className="tnum text-[13px] font-semibold text-ink">{money(opt.amountMinor, opt.currency)}</span>
              {selected === opt.index && <Icon name="check" size={15} className="text-brand" />}
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-col items-stretch gap-2 pt-1 sm:flex-row sm:items-center">
        <Button
          className="w-full sm:w-auto"
          variant="primary"
          icon="check"
          disabled={selectedOption === null || pending}
          onClick={() => setState("confirming")}
        >
          Review approval
        </Button>
        <Button className="w-full sm:w-auto" variant="danger" disabled={pending} onClick={() => submitDecision("reject")}>
          {pending ? "Saving" : "Decline all"}
        </Button>
        {selected === null && (
          <span className="text-[12px] text-faint sm:ml-2">Select an option first</span>
        )}
      </div>
      {error && (
        <p className="rounded-lg border border-crit-fg/20 bg-crit-bg px-3 py-2 text-[12px] text-crit-fg">
          {error}
        </p>
      )}
    </div>
  );
}
