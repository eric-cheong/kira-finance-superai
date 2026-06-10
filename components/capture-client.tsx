"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Receipt } from "@/lib/types";
import { money } from "@/lib/format";
import { Button, Card, ConfidenceChip, Icon, Notice } from "@/components/ui";
import { Thumb } from "@/components/thumb";

type Stage = "idle" | "scanning" | "extracted" | "confirmed";
type CaptureSource = "mobile" | "email" | "upload";

interface CaptureField {
  label: string;
  value: string;
  confidence: number;
}

interface CaptureDraft {
  receipt: Receipt;
  fields: CaptureField[];
  reviewThreshold: number;
  needsReview: boolean;
}

export function CaptureBox() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [draft, setDraft] = useState<CaptureDraft | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const reviewThreshold = draft?.reviewThreshold ?? 85;
  const needsReview = draft?.needsReview ?? false;
  const canPost = Boolean(draft) && (!needsReview || reviewed);

  async function snap(source: CaptureSource) {
    setBusy(true);
    setError("");
    setDraft(null);
    setReviewed(false);
    setStage("scanning");
    try {
      const [response] = await Promise.all([
        fetch("/api/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source }),
        }),
        new Promise((resolve) => window.setTimeout(resolve, 500)),
      ]);
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message ?? "Capture failed.");
      }
      setDraft(payload.data);
      setReviewed(!payload.data.needsReview);
      setStage("extracted");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Capture failed.");
      setStage("idle");
    } finally {
      setBusy(false);
    }
  }

  async function reviewCoding() {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/capture/${draft.receipt.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message ?? "Review failed.");
      }
      setDraft(payload.data);
      setReviewed(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmPost() {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/capture/${draft.receipt.id}/post`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message ?? "Post failed.");
      }
      setDraft((current) => (current ? { ...current, receipt: payload.data.receipt, needsReview: false } : current));
      setStage("confirmed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Post failed.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setReviewed(false);
    setDraft(null);
    setError("");
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
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button className="w-full sm:w-auto" variant="primary" icon="capture" disabled={busy} onClick={() => snap("mobile")}>
              {busy ? "Capturing" : "Snap receipt"}
            </Button>
            <Button className="w-full sm:w-auto" variant="outline" icon="doc" disabled={busy} onClick={() => snap("email")}>
              Forward invoice
            </Button>
          </div>
          {error && <p className="text-[12.5px] text-crit-fg">{error}</p>}
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

      {(stage === "extracted" || stage === "confirmed") && draft && (
        <div>
          <div className="flex items-start gap-3">
            <Thumb hint="beans" size={48} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="min-w-0 text-[15px] font-semibold text-ink">{draft.receipt.supplier}</h3>
                <span className="tnum text-[15px] font-semibold text-ink">{money(draft.receipt.totalMinor, draft.receipt.currency)}</span>
              </div>
              <p className="text-[12.5px] text-muted">
                {draft.receipt.docNo} · {draft.receipt.docDate} · captured via {draft.receipt.capturedVia}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            {draft.fields.map((f) => (
              <div key={f.label} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/40 px-3.5 py-2.5">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-faint">{f.label}</div>
                  <div className="truncate text-[13px] text-ink">{f.value}</div>
                </div>
                <ConfidenceChip value={f.confidence} showWord={false} />
              </div>
            ))}
          </div>

          {stage === "extracted" && needsReview && (
            <Notice variant="warn" icon="alert" className="mt-3">
              <span className="font-medium text-ink">Review required.</span> One field is below {reviewThreshold}% confidence.
              Confirming is locked until coding is reviewed.
            </Notice>
          )}

          {stage === "extracted" ? (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button className="w-full sm:w-auto" variant="primary" icon="check" disabled={!canPost || busy} onClick={confirmPost}>
                {busy ? "Posting" : "Confirm & post"}
              </Button>
              <Button className="w-full sm:w-auto" variant={reviewed ? "outline" : "ghost"} disabled={busy} onClick={reviewCoding}>
                {reviewed ? "Coding reviewed" : "Mark coding reviewed"}
              </Button>
              <Button className="w-full sm:ml-auto sm:w-auto" variant="ghost" size="sm" onClick={reset}>
                close draft
              </Button>
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-start gap-2 rounded-lg border border-pos-fg/20 bg-pos-bg px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-2 text-[13px] font-medium text-ink">
                <Icon name="check" size={16} className="shrink-0 text-pos-fg" /> Posted to record store · queued for auto-match
              </span>
              <Button className="w-full sm:w-auto" variant="ghost" size="sm" onClick={reset}>
                capture another
              </Button>
            </div>
          )}
          {error && (
            <p className="mt-3 rounded-lg border border-crit-fg/20 bg-crit-bg px-3.5 py-2.5 text-[12.5px] leading-relaxed text-crit-fg">
              {error}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
