"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/format";
import type { Booking, BookingQuote, BookingQuoteOption, BookingType, CurrencyCode } from "@/lib/types";
import { Button, Card, Icon, Notice } from "@/components/ui";
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
  "h-12 w-full border-0 border-b-2 border-black bg-white px-0 text-[14px] text-black outline-none transition-none placeholder:text-neutral-500 placeholder:italic focus:border-b-4 focus:ring-0";
const textareaCls =
  "min-h-[96px] w-full resize-y border-2 border-black bg-white px-3 py-2.5 text-[14px] leading-relaxed text-black outline-none transition-none placeholder:text-neutral-500 placeholder:italic focus:border-4 focus:ring-0";
const selectCls =
  "h-12 w-full border-2 border-black bg-white px-3 text-[13px] uppercase tracking-widest text-black outline-none transition-none focus:border-4 focus:ring-0";
const searchBlockCls =
  "min-w-0 border border-black bg-white px-3 py-2 transition-none focus-within:border-2";
const searchLabelCls = "editorial-mono mb-1 block text-[10px] font-semibold uppercase text-neutral-500";
const searchInputCls =
  "h-9 w-full min-w-0 bg-transparent text-[14px] font-semibold text-black outline-none placeholder:text-neutral-500 placeholder:italic";
const exaSnippet = "const exa = new Exa(process.env.EXA_API_KEY); await exa.search(query, { type: 'auto', numResults, userLocation });";

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block min-w-0">
      <span className="editorial-mono mb-1.5 block text-[10px] font-semibold uppercase text-neutral-500">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] leading-relaxed text-faint">{hint}</span>}
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
    <li className="flex min-w-0 items-start gap-1.5 text-[12px] text-neutral-700">
      <Icon name={isExternalUrl(value) ? "arrowUpRight" : "search"} size={12} className="mt-0.5 shrink-0 text-black" />
      {isExternalUrl(value) ? (
        <a href={value} target="_blank" rel="noreferrer" className="min-w-0 truncate text-black underline-offset-2 hover:underline">
          {value}
        </a>
      ) : (
        <span className="min-w-0 truncate">{value}</span>
      )}
    </li>
  );
}

function statusBadge(status: ReviewSearchResult["search"]["status"]) {
  if (status === "live") return <MonoChip>live sources</MonoChip>;
  if (status === "missing_exa_key") return <MonoChip>fallback</MonoChip>;
  return <MonoChip>provider fallback</MonoChip>;
}

function MonoChip({ children, inverted = false }: { children: ReactNode; inverted?: boolean }) {
  return (
    <span
      className={cn(
        "editorial-mono inline-flex min-h-7 max-w-full shrink-0 items-center border px-2 py-0.5 text-[10px] font-semibold uppercase",
        inverted ? "border-black bg-black text-white" : "border-black bg-white text-black",
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

function ExaSnippetBar() {
  return (
    <div className="flex min-w-0 flex-col gap-2 border-2 border-black bg-white px-3 py-2 sm:flex-row sm:items-center">
      <span className="editorial-mono shrink-0 text-[10px] font-semibold uppercase text-black">Exa code demo</span>
      <code className="min-w-0 overflow-x-auto whitespace-nowrap border border-black bg-white px-2 py-1 font-mono text-[11px] text-black">
        {exaSnippet}
      </code>
    </div>
  );
}

function locationCode(value: string) {
  const normal = value.toLowerCase();
  if (/\b(kul|kl|kuala lumpur)\b/.test(normal)) return "KUL";
  if (/\b(sin|singapore)\b/.test(normal)) return "SIN";
  if (/\b(jhb|johor bahru)\b/.test(normal)) return "JHB";
  return "";
}

export function BookingsResearchWorkspace() {
  const router = useRouter();
  const [researchMode, setResearchMode] = useState<"quote" | "reviews">("quote");
  const [advancedOpen, setAdvancedOpen] = useState(false);
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
      const travellers = Number.parseInt(quoteForm.travellers, 10);
      if (!Number.isFinite(travellers) || travellers < 1) throw new Error("Enter at least one traveller.");
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
          travellers,
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
      const numResults = Number.parseInt(reviewForm.numResults, 10);
      if (!Number.isFinite(numResults) || numResults < 1 || numResults > 10) throw new Error("Choose 1 to 10 results.");
      const data = await parsePayload(await fetch("/api/consumer/reviews/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: reviewForm.subject.trim(),
          query: reviewForm.query.trim() || undefined,
          userLocation: reviewForm.userLocation.trim() || undefined,
          numResults,
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
  const activeState = researchMode === "quote" ? quoteState : reviewState;
  const isBusy = activeState === "loading";
  const quickValue = researchMode === "quote" ? quoteForm.description : reviewForm.subject;
  const quickPlaceholder =
    researchMode === "quote"
      ? "Search a trip or item, e.g. KL to Singapore return for 2 travellers, 12-14 Jun"
      : "Search reviews, caveats, refunds, baggage issues, or hidden fees";

  function quoteFieldsFromText(value: string, current = quoteForm) {
    const lower = value.toLowerCase();
    const inferred = { ...current, description: value };
    const routeMatch = value.match(/\b(.+?)\s+to\s+(.+?)(?:\s+(?:return|for|under|from|on|,)|$)/i);
    const budgetMatch =
      value.match(/\b(MYR|SGD|USD)\s*([0-9]+(?:\.[0-9]+)?)/i) ??
      value.match(/\b(?:under|below|max|budget)\s*(MYR|SGD|USD)?\s*([0-9]+(?:\.[0-9]+)?)/i);
    const travellerMatch = value.match(/\b([1-9])\s*(?:travellers|travelers|people|pax)\b/i);

    if (/\b(hotel|stay|nights?|near)\b/i.test(value)) {
      inferred.type = "hotel";
      inferred.origin = "";
      inferred.destination = /\bklcc\b/i.test(value) ? "KLCC" : inferred.destination;
    } else if (routeMatch || /\b(flight|return|depart|airport)\b/i.test(value)) {
      inferred.type = "flight";
    }

    if (routeMatch) {
      const origin = locationCode(routeMatch[1]);
      const destination = locationCode(routeMatch[2]);
      if (origin) inferred.origin = origin;
      if (destination) inferred.destination = destination;
    }

    if (budgetMatch) {
      const currency = (budgetMatch[1] || inferred.currency).toUpperCase();
      if (currency === "MYR" || currency === "SGD" || currency === "USD") inferred.currency = currency;
      inferred.budget = budgetMatch[2];
    }

    if (travellerMatch) inferred.travellers = travellerMatch[1];
    if (/\b12\s*[-–]\s*14\s+jun\b/i.test(value)) {
      inferred.departDate = "2026-06-12";
      inferred.returnDate = "2026-06-14";
    }
    if (lower.includes("hotel near klcc")) {
      inferred.origin = "";
      inferred.destination = "KLCC";
      inferred.budget = inferred.budget || "900";
      inferred.currency = "MYR";
    }

    return inferred;
  }

  function updateQuickValue(value: string) {
    if (researchMode === "quote") {
      setQuoteForm((current) => quoteFieldsFromText(value, current));
      return;
    }
    setReviewForm((current) => ({ ...current, subject: value }));
  }

  function applySuggestion(mode: "quote" | "reviews", value: string) {
    setResearchMode(mode);
    if (mode === "quote") {
      setQuoteForm((current) => quoteFieldsFromText(value, current));
      return;
    }
    setReviewForm((current) => ({ ...current, subject: value }));
  }

  return (
    <Card pad={false} className="kira-editorial overflow-hidden !border-black !bg-white !text-black">
      <div className="border-b-4 border-black px-4 py-5 sm:px-6 sm:py-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="editorial-mono text-[10px] font-semibold uppercase text-neutral-500">Kira provider research</p>
            <h2 className="editorial-display mt-1 text-[52px] font-semibold leading-none text-black sm:text-[72px] lg:text-[96px]">
              Research
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-neutral-700">
              Search once. Kira turns it into quote candidates or review evidence. Approval remains human.
            </p>
          </div>
          <MonoChip inverted>human approval required</MonoChip>
        </div>
        <div className="mt-5 flex items-center gap-2">
          <div className="editorial-rule w-24" />
          <div className="h-4 w-4 border-2 border-black bg-white" />
        </div>
      </div>

      <form
        onSubmit={researchMode === "quote" ? submitQuote : submitReviews}
        className="space-y-4 bg-white p-4 sm:p-6"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex w-full border-2 border-black bg-white md:w-auto">
            {[
              { key: "quote" as const, label: "Quote research", icon: "flight" as const },
              { key: "reviews" as const, label: "Reviews", icon: "search" as const },
            ].map((mode) => (
              <button
                key={mode.key}
                type="button"
                onClick={() => setResearchMode(mode.key)}
                aria-pressed={researchMode === mode.key}
                className={cn(
                  "editorial-mono inline-flex min-h-11 flex-1 items-center justify-center gap-2 border-r border-black px-3 text-[10px] font-semibold uppercase transition-none last:border-r-0 md:flex-none",
                  researchMode === mode.key
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-black hover:text-white",
                )}
              >
                <Icon name={mode.icon} size={14} />
                {mode.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {researchMode === "quote" ? (
              <>
                <MonoChip>{quoteForm.type}</MonoChip>
                <MonoChip>{quoteForm.currency} {quoteForm.budget}</MonoChip>
                <MonoChip>{quoteForm.travellers} traveller{quoteForm.travellers === "1" ? "" : "s"}</MonoChip>
              </>
            ) : (
              <>
                <MonoChip>{reviewForm.userLocation || "global"}</MonoChip>
                <MonoChip>{reviewForm.numResults} results</MonoChip>
                {reviewResult && statusBadge(reviewResult.search.status)}
              </>
            )}
          </div>
        </div>

        <div className="border-2 border-black bg-white p-2">
          {researchMode === "quote" ? (
            <div className="grid gap-1.5 md:grid-cols-2 lg:grid-cols-[minmax(0,1.35fr)_minmax(4.5rem,.42fr)_minmax(4.5rem,.42fr)_minmax(7.5rem,.7fr)_minmax(7.5rem,.7fr)_minmax(8rem,.78fr)_8.25rem] lg:items-stretch">
              <label className={searchBlockCls}>
                <span className={searchLabelCls}>Request</span>
                <input
                  className={searchInputCls}
                  value={quickValue}
                  onChange={(event) => updateQuickValue(event.target.value)}
                  placeholder={quickPlaceholder}
                  required
                />
              </label>
              <label className={searchBlockCls}>
                <span className={searchLabelCls}>From</span>
                <input className={searchInputCls} value={quoteForm.origin} onChange={(event) => setQuoteForm((current) => ({ ...current, origin: event.target.value.toUpperCase() }))} placeholder="KUL" />
              </label>
              <label className={searchBlockCls}>
                <span className={searchLabelCls}>To</span>
                <input className={searchInputCls} value={quoteForm.destination} onChange={(event) => setQuoteForm((current) => ({ ...current, destination: event.target.value.toUpperCase() }))} placeholder="SIN" />
              </label>
              <label className={searchBlockCls}>
                <span className={searchLabelCls}>Depart</span>
                <input aria-label="Depart date" type="date" className={cn(searchInputCls, "min-h-10 text-[12px]")} value={quoteForm.departDate} onChange={(event) => setQuoteForm((current) => ({ ...current, departDate: event.target.value }))} />
              </label>
              <label className={searchBlockCls}>
                <span className={searchLabelCls}>Return</span>
                <input aria-label="Return date" type="date" min={quoteForm.departDate || undefined} className={cn(searchInputCls, "min-h-10 text-[12px]")} value={quoteForm.returnDate} onChange={(event) => setQuoteForm((current) => ({ ...current, returnDate: event.target.value }))} />
              </label>
              <label className={searchBlockCls}>
                <span className={searchLabelCls}>Budget</span>
                <span className="flex items-center gap-1.5">
                  <select className="h-8 bg-transparent text-[13px] font-semibold uppercase tracking-widest text-black outline-none" value={quoteForm.currency} onChange={(event) => setQuoteForm((current) => ({ ...current, currency: event.target.value as CurrencyCode }))}>
                    <option value="MYR">MYR</option>
                    <option value="SGD">SGD</option>
                    <option value="USD">USD</option>
                  </select>
                  <input className={searchInputCls} inputMode="decimal" value={quoteForm.budget} onChange={(event) => setQuoteForm((current) => ({ ...current, budget: event.target.value }))} required />
                </span>
              </label>
              <Button type="submit" variant="primary" icon="search" disabled={isBusy} className="!border-2 !border-black !bg-black !bg-none !text-white hover:!bg-white hover:!text-black min-h-[58px] w-full !rounded-none !shadow-none lg:w-auto">
                {isBusy ? "Researching" : "Research"}
              </Button>
            </div>
          ) : (
            <div className="grid gap-1.5 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_.45fr_.45fr_auto] lg:items-stretch">
              <label className={searchBlockCls}>
                <span className={searchLabelCls}>Subject</span>
                <input
                  className={searchInputCls}
                  value={quickValue}
                  onChange={(event) => updateQuickValue(event.target.value)}
                  placeholder={quickPlaceholder}
                  required
                />
              </label>
              <label className={searchBlockCls}>
                <span className={searchLabelCls}>Focus</span>
                <input className={searchInputCls} value={reviewForm.query} onChange={(event) => setReviewForm((current) => ({ ...current, query: event.target.value }))} placeholder="refunds, fees, complaints" />
              </label>
              <label className={searchBlockCls}>
                <span className={searchLabelCls}>Region</span>
                <input className={searchInputCls} value={reviewForm.userLocation} onChange={(event) => setReviewForm((current) => ({ ...current, userLocation: event.target.value.toUpperCase() }))} placeholder="MY" />
              </label>
              <label className={searchBlockCls}>
                <span className={searchLabelCls}>Results</span>
                <input type="number" min={1} max={10} className={searchInputCls} value={reviewForm.numResults} onChange={(event) => setReviewForm((current) => ({ ...current, numResults: event.target.value }))} />
              </label>
              <Button type="submit" variant="primary" icon="search" disabled={isBusy} className="!border-2 !border-black !bg-black !bg-none !text-white hover:!bg-white hover:!text-black min-h-[58px] w-full !rounded-none !shadow-none lg:w-auto">
                {isBusy ? "Searching" : "Search"}
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applySuggestion("quote", "KL to Singapore return for 2 travellers, 12-14 Jun")}
            className="border border-black bg-white px-3 py-1.5 text-[12px] text-black transition-none hover:bg-black hover:text-white"
          >
            KL to Singapore return
          </button>
          <button
            type="button"
            onClick={() => applySuggestion("reviews", "AirAsia KL to Singapore baggage and refund experience")}
            className="border border-black bg-white px-3 py-1.5 text-[12px] text-black transition-none hover:bg-black hover:text-white"
          >
            AirAsia baggage reviews
          </button>
          <button
            type="button"
            onClick={() => applySuggestion("quote", "Hotel near KLCC for 3 nights under MYR 900")}
            className="border border-black bg-white px-3 py-1.5 text-[12px] text-black transition-none hover:bg-black hover:text-white"
          >
            Hotel near KLCC
          </button>
        </div>

        <p className="flex items-start gap-1.5 border-l-4 border-black pl-3 text-[12.5px] leading-relaxed text-neutral-700">
          <Icon name="lock" size={13} className="mt-0.5 shrink-0" />
          {researchMode === "quote"
            ? "Creates quote options only. No reservation, payment, supplier contact, or booking is made."
            : "Searches public review evidence only. No quote, booking, payment, or supplier action is created."}
        </p>

        {researchMode === "reviews" && <ExaSnippetBar />}

        <details open={advancedOpen} onToggle={(event) => setAdvancedOpen(event.currentTarget.open)} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-2 border-black bg-white px-3 py-2.5 text-[12.5px] font-medium text-black transition-none hover:bg-black hover:text-white">
            <span>Advanced details</span>
            <span className="flex items-center gap-2">
              {researchMode === "quote" ? "Dates, budget, route" : "Query, location, count"}
              <Icon name="chevronRight" size={14} className="transition group-open:rotate-90" />
            </span>
          </summary>

          <div className="mt-3 border border-black bg-white p-3">
            {researchMode === "quote" ? (
              <div className="space-y-3">
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
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
              </div>
            ) : (
              <div className="space-y-3">
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
              </div>
            )}
          </div>
        </details>

        {quoteState === "loading" && researchMode === "quote" && <Notice icon="clock" variant="neutral" className="!border-black !bg-white [&_div]:!text-neutral-700">Researching options, policies, and source citations. No supplier action is being taken.</Notice>}
        {reviewState === "loading" && researchMode === "reviews" && <Notice icon="clock" variant="neutral" className="!border-black !bg-white [&_div]:!text-neutral-700">Searching evidence only. No quote or booking is created.</Notice>}
        {quoteState === "error" && researchMode === "quote" && <Notice icon="alert" variant="neutral" className="!border-2 !border-black !bg-white [&_div]:!text-black">{quoteError}</Notice>}
        {reviewState === "error" && researchMode === "reviews" && <Notice icon="alert" variant="neutral" className="!border-2 !border-black !bg-white [&_div]:!text-black">{reviewError}</Notice>}
      </form>

      <div className="border-t-4 border-black bg-white p-4 sm:p-6">
        {researchMode === "quote" && quoteResult && (
            <div className="space-y-4 border-2 border-black bg-white px-3 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="editorial-display text-[24px] font-semibold leading-tight text-black">{quoteResult.quote.description}</p>
                  <p className="editorial-mono mt-1 text-[10px] font-semibold uppercase text-neutral-500">{quoteResult.quote.options.length} options created · approval only · booking is outside Kira</p>
                </div>
                <MonoChip>{quoteFallback ? "local fallback" : quoteResult.research?.provider ?? "researched"}</MonoChip>
              </div>
              {quoteResult.research?.summary && <p className="border-l-4 border-black pl-3 text-[13px] leading-relaxed text-neutral-700">{quoteResult.research.summary}</p>}
              <div className="grid gap-2 sm:grid-cols-2">
                {quoteResult.quote.options.slice(0, 4).map((option) => (
                  <div key={`${quoteResult.quote.id}-${option.index}`} className="border border-black bg-white px-3 py-2 transition-none hover:bg-black hover:text-white">
                    <p className="text-[13px] font-semibold">{option.label}</p>
                    <p className="tnum mt-0.5 text-[12px]">{option.supplier} · {money(option.amountMinor, option.currency)}</p>
                  </div>
                ))}
              </div>
              {quoteResult.research?.riskNotes && quoteResult.research.riskNotes.length > 0 && (
                <ul className="space-y-1">
                  {quoteResult.research.riskNotes.map((note, index) => (
                    <li key={`${note}-${index}`} className="flex items-start gap-1.5 text-[12px] text-neutral-700">
                      <Icon name="alert" size={12} className="mt-0.5 shrink-0 text-black" />
                      {note}
                    </li>
                  ))}
                </ul>
              )}
              <ul className="space-y-1">
                {quoteResult.quote.researchSources.length > 0 ? quoteResult.quote.researchSources.map((source, index) => <SourceLink key={`${source}-${index}`} value={source} />) : <li className="text-[12px] text-neutral-700">No sources returned by the provider.</li>}
              </ul>
            </div>
        )}

        {researchMode === "reviews" && reviewResult && (
            <div className="space-y-4 border-2 border-black bg-white px-3 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="editorial-display text-[24px] font-semibold leading-tight text-black">{reviewResult.summary?.subject ?? reviewForm.subject}</p>
                  <p className="editorial-mono mt-1 min-w-0 break-words text-[10px] font-semibold uppercase text-neutral-500 [overflow-wrap:anywhere]">Query: <span className="text-black">{reviewResult.search.query}</span></p>
                </div>
                <MonoChip>{reviewResult.search.provider}</MonoChip>
              </div>
              {reviewFallback && <Notice icon="alert" variant="neutral" className="!border-black !bg-white [&_div]:!text-neutral-700">Live review search is unavailable ({reviewResult.search.status}). Configure Exa for live results.</Notice>}
              {reviewResult.summary?.summary && <p className="border-l-4 border-black pl-3 text-[13px] leading-relaxed text-neutral-700">{reviewResult.summary.summary}</p>}
              {reviewResult.summary?.themes && reviewResult.summary.themes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {reviewResult.summary.themes.slice(0, 6).map((theme, index) => (
                    <span key={`${theme.theme}-${index}`} className="border border-black bg-white px-2 py-1 text-[11.5px] text-black">{theme.theme} · {theme.sentiment}</span>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                {reviewResult.search.results.length > 0 ? reviewResult.search.results.map((item, index) => (
                  <article key={`${item.url}-${index}`} className="min-w-0 border border-black bg-white px-3 py-2.5 transition-none [overflow-wrap:anywhere] hover:bg-black hover:text-white">
                    {isExternalUrl(item.url) ? (
                      <a href={item.url} target="_blank" rel="noreferrer" className="break-words text-[12.5px] font-semibold text-current underline-offset-2 hover:underline">
                        {item.title}
                      </a>
                    ) : (
                      <span className="break-words text-[12.5px] font-semibold">{item.title}</span>
                    )}
                    {item.summary && <p className="mt-1 break-words text-[12px] leading-relaxed text-current opacity-80">{item.summary}</p>}
                    {item.highlights && item.highlights.length > 0 && <p className="mt-1 break-words text-[11.5px] leading-relaxed text-current opacity-65">{item.highlights[0]}</p>}
                  </article>
                )) : <div className="border border-black bg-white px-3 py-6 text-center text-[12.5px] text-neutral-700">No review sources returned.</div>}
              </div>
              {reviewResult.summary?.sources && reviewResult.summary.sources.length > 0 && (
                <ul className="space-y-1">
                  {reviewResult.summary.sources.map((source, index) => <SourceLink key={`${source}-${index}`} value={source} />)}
                </ul>
              )}
            </div>
        )}
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
          Spend approved — {opt.label}
        </div>
        <p className="text-[12.5px] text-muted">
          {money(opt.amountMinor, opt.currency)} · {opt.supplier}. Finance tracker has been updated with approved
          committed spend. A supplier reservation still requires a separate licensed execution path.
        </p>
        <p className="text-[12px] text-faint">
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
              "btn-lift flex min-h-11 w-full transform-gpu flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition sm:flex-row sm:items-center sm:justify-between",
              selected === opt.index
                ? "border-brand bg-brand-soft shadow-card"
                : "border-border bg-surface hover:border-border-strong hover:bg-surface-2/60",
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
