"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, CardHeader, Notice } from "@/components/ui";

type Source = "live" | "fallback";

type RowKey = "text" | "vision" | "image" | "video";

interface RowResult {
  source: Source;
  headline: string;
  detail?: string;
  imageUrl?: string;
  videoUrl?: string;
  storyboard?: { scene: number; caption: string }[];
  fallbackReason?: string;
}

type PanelState =
  | { status: "idle" }
  | { status: "loading"; key: RowKey }
  | { status: "ok"; message: string }
  | { status: "error"; message: string };

const ROWS: { key: RowKey; label: string; modality: string; detail: string }[] = [
  { key: "text", label: "Agnes Text", modality: "agnes-2.0-flash", detail: "Reason over the close and recommend the safest next action." },
  { key: "vision", label: "Agnes Vision", modality: "agnes-2.0-flash", detail: "Read a receipt image and extract supplier, totals, and tax." },
  { key: "image", label: "Agnes Image", modality: "agnes-image-2.0-flash", detail: "Generate a branded month-end close report cover." },
  { key: "video", label: "Agnes Video", modality: "agnes-video-v2.0", detail: "Render a short CFO close briefing clip." },
];

async function postJson(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => undefined);
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error?.message ?? "Agnes request failed.");
  }
  return payload?.data ?? payload;
}

async function getJson(path: string) {
  const response = await fetch(path, { cache: "no-store" });
  const payload = await response.json().catch(() => undefined);
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error?.message ?? "Agnes request failed.");
  }
  return payload?.data ?? payload;
}

/** Render a small, readable receipt to a canvas so Agnes Vision has a real image to OCR. */
function sampleReceiptDataUrl(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 520;
  canvas.height = 640;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111111";
  ctx.textBaseline = "top";
  const line = (text: string, x: number, y: number, size = 22, bold = false) => {
    ctx.font = `${bold ? "bold " : ""}${size}px Arial, sans-serif`;
    ctx.fillText(text, x, y);
  };
  line("BERAS MURNI TRADING SDN BHD", 40, 36, 24, true);
  line("No. 12 Jalan Pasar, 50000 Kuala Lumpur", 40, 70, 16);
  line("SST Reg: W10-1808-31000123", 40, 92, 16);
  line("TAX INVOICE", 40, 140, 20, true);
  line("Invoice No : BMT-2026-0337", 40, 176, 18);
  line("Date       : 2026-06-11", 40, 202, 18);
  ctx.strokeStyle = "#999999";
  ctx.beginPath(); ctx.moveTo(40, 240); ctx.lineTo(480, 240); ctx.stroke();
  line("Jasmine rice 5% broken x 40 sack", 40, 256, 18);
  line("RM 2,640.00", 320, 256, 18);
  line("Delivery surcharge", 40, 286, 18);
  line("RM 60.00", 320, 286, 18);
  ctx.beginPath(); ctx.moveTo(40, 326); ctx.lineTo(480, 326); ctx.stroke();
  line("Subtotal", 40, 342, 18);
  line("RM 2,700.00", 320, 342, 18);
  line("SST 0%", 40, 372, 18);
  line("RM 0.00", 320, 372, 18);
  line("TOTAL", 40, 410, 22, true);
  line("RM 2,700.00", 300, 410, 22, true);
  line("Thank you for your business", 40, 470, 16);
  return canvas.toDataURL("image/png");
}

export function AgnesOmnimodalPanel({ clientId }: { clientId: string }) {
  const [state, setState] = useState<PanelState>({ status: "idle" });
  const [results, setResults] = useState<Partial<Record<RowKey, RowResult>>>({});
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    getJson("/api/ai/status")
      .then((data) => setConfigured(Boolean(data?.agnes?.configured)))
      .catch(() => setConfigured(null));
  }, []);

  const liveCount = useMemo(
    () => Object.values(results).filter((result) => result?.source === "live").length,
    [results],
  );
  const busyKey = state.status === "loading" ? state.key : null;

  function record(key: RowKey, result: RowResult) {
    setResults((current) => ({ ...current, [key]: result }));
    setState({ status: "ok", message: `${key} returned ${result.source} output.` });
  }

  async function runText() {
    const data = await postJson("/api/assistant", {
      message: "Explain how Kira treats SST-exempt suppliers during the month-end close.",
      mode: "text",
    });
    const live = typeof data?.provider === "string" && data.provider.startsWith("agnes");
    record("text", {
      source: live ? "live" : "fallback",
      headline: live ? `Agnes reasoned via ${data.model}` : "Local fallback reasoning",
      detail: data?.output?.answer,
      fallbackReason: live ? undefined : data?.provider,
    });
  }

  async function runVision() {
    const imageDataUrl = sampleReceiptDataUrl();
    const data = await postJson("/api/capture/ocr", { source: "upload", imageDataUrl });
    const live = data?.ocrSource === "live";
    record("vision", {
      source: live ? "live" : "fallback",
      headline: `${data?.receipt?.supplier ?? "Receipt"} · ${(data?.receipt?.totalMinor ?? 0) / 100} ${data?.receipt?.currency ?? "MYR"}`,
      detail: `Doc ${data?.receipt?.docNo || "—"} · ${data?.receipt?.docDate ?? ""} · confidence ${data?.receipt?.ocrConfidence ?? "—"}%`,
      fallbackReason: live ? undefined : "agnes_vision_fallback",
    });
  }

  async function runImage() {
    const data = await postJson("/api/agnes/image", { clientId });
    record("image", {
      source: data?.source ?? "fallback",
      headline: data?.source === "live" ? "Generated by agnes-image-2.0-flash" : "Deterministic SVG fallback",
      imageUrl: data?.imageUrl,
      fallbackReason: data?.fallbackReason,
    });
  }

  async function runVideo() {
    let data = await postJson("/api/agnes/video", { clientId });
    // Poll up to ~60s for an async render before falling back to the storyboard.
    let attempts = 0;
    while (data?.source === "live" && data?.status === "processing" && !data?.videoUrl && attempts < 15) {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      data = await getJson(`/api/agnes/video/${data.taskId}?clientId=${encodeURIComponent(clientId)}`);
      attempts += 1;
    }
    const ready = Boolean(data?.videoUrl);
    record("video", {
      source: data?.source ?? "fallback",
      headline: ready
        ? "Generated by agnes-video-v2.0"
        : data?.source === "live"
          ? "Render still processing — showing storyboard"
          : "Storyboard fallback",
      videoUrl: ready ? data.videoUrl : undefined,
      storyboard: data?.storyboard,
      fallbackReason: data?.fallbackReason,
    });
  }

  const RUNNERS: Record<RowKey, () => Promise<void>> = {
    text: runText,
    vision: runVision,
    image: runImage,
    video: runVideo,
  };

  async function run(key: RowKey) {
    setState({ status: "loading", key });
    try {
      await RUNNERS[key]();
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Agnes request failed." });
    }
  }

  return (
    <Card>
      <CardHeader
        title="Powered by Agnes AI — Omni-modal"
        subtitle="One provider runs the whole close: text reasoning, vision OCR, image report, and video briefing."
        icon="spark"
        right={
          <Badge variant={liveCount > 0 ? "brand" : "neutral"}>
            {liveCount}/{ROWS.length} live
          </Badge>
        }
      />

      {configured !== null && (
        <div className="mb-3">
          <Badge variant={configured ? "brand" : "neutral"}>
            {configured ? "Agnes API configured" : "Agnes key missing — running fallbacks"}
          </Badge>
        </div>
      )}

      <div className="space-y-2">
        {ROWS.map((row) => {
          const result = results[row.key];
          const busy = busyKey === row.key;
          return (
            <div key={row.key} className="rounded-lg border border-border bg-surface-2/45 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold leading-snug text-ink">
                    {row.label} <span className="text-faint">· {row.modality}</span>
                  </div>
                  <div className="mt-0.5 text-[12px] leading-relaxed text-muted">{row.detail}</div>
                </div>
                <Badge variant={result?.source === "live" ? "brand" : "neutral"}>
                  {result ? (result.source === "live" ? "Live" : "Fallback") : "Ready"}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                icon="spark"
                className="mt-2 w-full"
                disabled={state.status === "loading"}
                onClick={() => run(row.key)}
              >
                {busy ? "Running…" : "Run"}
              </Button>
              {result && (
                <div className="mt-3 space-y-2">
                  <p className="text-[12.5px] font-medium leading-relaxed text-ink">{result.headline}</p>
                  {result.detail && <p className="text-[12px] leading-relaxed text-muted">{result.detail}</p>}
                  {result.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={result.imageUrl}
                      alt="Agnes close report"
                      className="w-full rounded-md border border-border"
                    />
                  )}
                  {result.videoUrl && (
                    <video controls className="w-full rounded-md border border-border" src={result.videoUrl} />
                  )}
                  {!result.videoUrl && result.storyboard && (
                    <div className="space-y-1.5">
                      {result.storyboard.map((frame) => (
                        <div key={frame.scene} className="grid grid-cols-[40px_minmax(0,1fr)] gap-2 rounded-md border border-border bg-surface px-2.5 py-2 text-[12px]">
                          <span className="text-faint">#{frame.scene}</span>
                          <span className="text-ink">{frame.caption}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {result.fallbackReason && (
                    <p className="text-[11.5px] text-warn-fg">Fallback reason: {result.fallbackReason}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {state.status === "ok" && (
        <Notice variant="pos" icon="check" className="mt-3">
          {state.message}
        </Notice>
      )}
      {state.status === "error" && (
        <Notice variant="crit" icon="alert" className="mt-3">
          {state.message}
        </Notice>
      )}
    </Card>
  );
}
