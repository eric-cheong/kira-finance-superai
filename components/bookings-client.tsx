"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/format";
import type { Booking, BookingQuoteOption } from "@/lib/types";
import { Badge, Button, Icon } from "@/components/ui";
import { cn } from "@/components/ui/cn";

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
