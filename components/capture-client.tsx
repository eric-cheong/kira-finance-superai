"use client";

import { useState } from "react";
import { money } from "@/lib/format";
import { Button, Card, ConfidenceChip, Icon } from "@/components/ui";
import { Thumb } from "@/components/thumb";

type Stage = "idle" | "scanning" | "extracted" | "confirmed";

// A deterministic mock of the capture → OCR → suggest → confirm loop.
const MOCK = {
  supplier: "Common Roots Roastery",
  docNo: "CRR-2026-0612",
  docDate: "2026-06-09",
  totalMinor: 128400,
  currency: "MYR" as const,
  fields: [
    { k: "Account", v: "5010 · COGS — Coffee & Raw Materials", c: 96 },
    { k: "Tax code", v: "OUT · Out of scope (goods)", c: 88 },
    { k: "Cost centre", v: "CC-TTDI · TTDI Roastery", c: 84 },
  ],
};

export function CaptureBox() {
  const [stage, setStage] = useState<Stage>("idle");
  const [reviewed, setReviewed] = useState(false);
  const reviewThreshold = 85;
  const needsReview = MOCK.fields.some((field) => field.c < reviewThreshold);
  const canPost = !needsReview || reviewed;

  function snap() {
    setReviewed(false);
    setStage("scanning");
    setTimeout(() => setStage("extracted"), 900);
  }

  function reset() {
    setReviewed(false);
    setStage("idle");
  }

  return (
    <Card className="overflow-hidden">
      {stage === "idle" && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border-strong bg-surface-2/40 px-6 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Icon name="capture" size={24} />
          </span>
          <div>
            <p className="text-[14px] font-medium text-ink">Capture a receipt or invoice</p>
            <p className="mt-0.5 text-[12.5px] text-muted">Snap a photo, or forward to inbox@kiraroasters.kira.my</p>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" icon="capture" onClick={snap}>
              Snap receipt
            </Button>
            <Button variant="outline" icon="doc" onClick={snap}>
              Forward invoice
            </Button>
          </div>
        </div>
      )}

      {stage === "scanning" && (
        <div className="flex items-center gap-3 px-2 py-10">
          <Thumb hint="beans" size={48} />
          <div className="flex-1">
            <p className="text-[14px] font-medium text-ink">Extracting fields…</p>
            <p className="text-[12.5px] text-muted">Document AI · reading supplier, totals, tax, line items</p>
            <div className="mt-2 h-1 w-40 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-brand" />
            </div>
          </div>
        </div>
      )}

      {(stage === "extracted" || stage === "confirmed") && (
        <div>
          <div className="flex items-start gap-3">
            <Thumb hint="beans" size={48} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[15px] font-semibold text-ink">{MOCK.supplier}</h3>
                <span className="tnum text-[15px] font-semibold text-ink">{money(MOCK.totalMinor, MOCK.currency)}</span>
              </div>
              <p className="text-[12.5px] text-muted">
                {MOCK.docNo} · {MOCK.docDate} · captured via mobile
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {MOCK.fields.map((f) => (
              <div key={f.k} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/40 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-faint">{f.k}</div>
                  <div className="truncate text-[13px] text-ink">{f.v}</div>
                </div>
                <ConfidenceChip value={f.c} showWord={false} />
              </div>
            ))}
          </div>

          {stage === "extracted" && needsReview && (
            <div className="mt-3 rounded-lg border border-brand/20 bg-brand-soft px-3 py-2 text-[12.5px] text-muted">
              <span className="font-medium text-ink">Review required.</span> One field is below {reviewThreshold}% confidence.
              Confirming is locked until coding is reviewed.
            </div>
          )}

          {stage === "extracted" ? (
            <div className="mt-4 flex items-center gap-2">
              <Button variant="primary" icon="check" disabled={!canPost} onClick={() => setStage("confirmed")}>
                Confirm & post
              </Button>
              <Button variant={reviewed ? "outline" : "ghost"} onClick={() => setReviewed(true)}>
                {reviewed ? "Coding reviewed" : "Adjust coding"}
              </Button>
              <button onClick={reset} className="ml-auto text-[12px] text-muted hover:underline">
                discard
              </button>
            </div>
          ) : (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-pos-fg/20 bg-pos-bg px-3 py-2.5">
              <span className="flex items-center gap-2 text-[13px] font-medium text-pos-fg">
                <Icon name="check" size={16} /> Posted to record store · queued for auto-match
              </span>
              <button onClick={reset} className="text-[12px] text-pos-fg/80 hover:underline">
                capture another
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
