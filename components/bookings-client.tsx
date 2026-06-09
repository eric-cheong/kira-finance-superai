"use client";

import { useState } from "react";
import { money } from "@/lib/format";
import type { BookingQuoteOption } from "@/lib/types";
import { Badge, Button, Icon } from "@/components/ui";
import { cn } from "@/components/ui/cn";

export function BookingApproval({
  quoteId,
  options,
}: {
  quoteId: string;
  options: BookingQuoteOption[];
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [state, setState] = useState<"idle" | "confirmed" | "rejected">("idle");

  if (state === "confirmed" && selected !== null) {
    const opt = options[selected];
    return (
      <div className="mt-4 flex flex-col gap-2 rounded-lg border border-pos-fg/20 bg-pos-bg p-4">
        <div className="flex items-center gap-2 text-[13.5px] font-semibold text-pos-fg">
          <Icon name="check" size={16} />
          Booking approved — {opt.label}
        </div>
        <p className="text-[12.5px] text-muted">
          {money(opt.amountMinor, opt.currency)} · {opt.supplier}. The Booking Agent will confirm the reservation via the
          supplier API. Finance tracker has been updated with committed spend.
        </p>
        <p className="text-[11.5px] text-faint">
          Ref: {quoteId}-opt{selected} · Audit log entry created.
        </p>
      </div>
    );
  }

  if (state === "rejected") {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-lg border border-crit-fg/20 bg-crit-bg px-3 py-2.5 text-[13px] text-crit-fg">
        <Icon name="alert" size={15} />
        Quote declined — no booking placed.
        <button
          className="ml-auto text-[12px] text-crit-fg/70 underline-offset-2 hover:underline"
          onClick={() => setState("idle")}
        >
          undo
        </button>
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
            className={cn(
              "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors",
              selected === opt.index
                ? "border-brand bg-brand-soft"
                : "border-border bg-surface hover:border-border-strong",
            )}
          >
            <span className="text-[13px] font-medium text-ink">{opt.label}</span>
            <div className="flex items-center gap-2">
              <span className="tnum text-[13px] font-semibold text-ink">{money(opt.amountMinor, opt.currency)}</span>
              {selected === opt.index && <Icon name="check" size={15} className="text-brand" />}
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="primary"
          icon="check"
          disabled={selected === null}
          onClick={() => setState("confirmed")}
        >
          Confirm booking
        </Button>
        <Button variant="danger" onClick={() => setState("rejected")}>
          Decline all
        </Button>
        {selected === null && (
          <span className="ml-2 text-[12px] text-faint">Select an option first</span>
        )}
      </div>
    </div>
  );
}
