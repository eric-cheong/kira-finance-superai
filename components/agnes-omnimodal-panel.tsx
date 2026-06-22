"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, CardHeader, Notice } from "@/components/ui";

type Source = "live" | "fallback";

type RowKey = "text" | "image" | "video";

interface RowResult {
  source: Source;
  headline: string;
  detail?: string;
  summary?: {
    legalName?: string;
    tradingName: string;
    closePeriod: string;
    erp?: string;
    tin?: string;
    msic?: string;
    msicDescription?: string;
    total: number;
    exportable?: number;
    ready: number;
    blocked: number;
    approved?: number;
    exported?: number;
    topSupplier: string;
    blockedSuppliers?: string[];
    blockerMessages?: string[];
  };
  imageUrl?: string;
  videoUrl?: string;
  storyboard?: { scene: number; caption: string }[];
  fallbackReason?: string;
}

interface AgnesCompanyOption {
  id: string;
  tradingName: string;
  closePeriod: string;
  erp: string;
}

type PanelState =
  | { status: "idle" }
  | { status: "loading"; key: RowKey }
  | { status: "ok"; message: string }
  | { status: "error"; message: string };

const ROWS: { key: RowKey; label: string; modality: string; detail: string }[] = [
  { key: "text", label: "Agnes Text", modality: "agnes-2.0-flash", detail: "Reason over the blocked close and recommend the safest next action." },
  { key: "image", label: "Agnes Image", modality: "agnes-image-2.0-flash", detail: "Generate a visual close-report cover; exact text is rendered by Kira." },
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

export function AgnesOmnimodalPanel({
  clientId,
  companies,
}: {
  clientId: string;
  companies: AgnesCompanyOption[];
}) {
  const [state, setState] = useState<PanelState>({ status: "idle" });
  const [results, setResults] = useState<Partial<Record<RowKey, RowResult>>>({});
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [selectedClientId, setSelectedClientId] = useState(clientId);

  useEffect(() => {
    getJson("/api/ai/status")
      .then((data) => setConfigured(Boolean(data?.agnes?.configured)))
      .catch(() => setConfigured(null));
  }, []);

  useEffect(() => {
    setSelectedClientId(clientId);
    setResults({});
    setState({ status: "idle" });
  }, [clientId]);

  const liveCount = useMemo(
    () => Object.values(results).filter((result) => result?.source === "live").length,
    [results],
  );
  const busyKey = state.status === "loading" ? state.key : null;
  const selectedCompany = companies.find((company) => company.id === selectedClientId) ?? companies[0];
  const activeClientId = selectedCompany?.id ?? selectedClientId;

  function record(key: RowKey, result: RowResult) {
    setResults((current) => ({ ...current, [key]: result }));
    setState({ status: "ok", message: `${key} returned ${result.source} output.` });
  }

  async function runText() {
    const data = await postJson("/api/agnes/text", { clientId: activeClientId });
    record("text", {
      source: data?.source ?? "fallback",
      headline: data?.source === "live" ? `Agnes reasoned via ${data.model}` : "Deterministic close reasoning",
      detail: data?.answer,
      fallbackReason: data?.fallbackReason,
    });
  }

  async function runImage() {
    const data = await postJson("/api/agnes/image", { clientId: activeClientId });
    record("image", {
      source: data?.source ?? "fallback",
      headline: data?.source === "live" ? "Generated visual by agnes-image-2.0-flash" : "Deterministic SVG fallback",
      detail: data?.summary
        ? `${data.summary.tradingName} · ${data.summary.closePeriod} · ${data.summary.exportable ?? data.summary.ready} exportable / ${data.summary.blocked} held`
        : undefined,
      summary: data?.summary,
      imageUrl: data?.imageUrl,
      fallbackReason: data?.fallbackReason,
    });
  }

  async function runVideo() {
    let data = await postJson("/api/agnes/video", { clientId: activeClientId });
    // Poll up to ~60s for an async render before falling back to the storyboard.
    let attempts = 0;
    while (data?.source === "live" && data?.status === "processing" && !data?.videoUrl && attempts < 15) {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      data = await getJson(`/api/agnes/video/${data.taskId}?clientId=${encodeURIComponent(activeClientId)}`);
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
        subtitle="One provider runs close reasoning, visual report generation, and video briefing. Vision OCR lives in Capture."
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

      <label className="mb-3 block">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-faint">Company</span>
        <select
          className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] font-medium text-ink outline-none transition focus:border-brand"
          value={activeClientId}
          disabled={state.status === "loading"}
          onChange={(event) => {
            setSelectedClientId(event.target.value);
            setResults({});
            setState({ status: "idle" });
          }}
        >
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.tradingName} · {company.closePeriod} · {company.erp}
            </option>
          ))}
        </select>
      </label>

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
                    <div className="space-y-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={result.imageUrl}
                        alt="Agnes close report"
                        className="w-full rounded-md border border-border"
                      />
                      {result.summary && (
                        <div className="rounded-md border border-border bg-surface px-3 py-2.5">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-faint">Exact company data rendered by Kira</div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                            <div>
                              <div className="text-faint">Company</div>
                              <div className="font-medium text-ink">{result.summary.tradingName}</div>
                            </div>
                            <div>
                              <div className="text-faint">Period / ERP</div>
                              <div className="font-medium text-ink">{result.summary.closePeriod} · {result.summary.erp ?? "ERP"}</div>
                            </div>
                            <div>
                              <div className="text-faint">TIN / MSIC</div>
                              <div className="font-medium text-ink">{result.summary.tin ?? "—"} · {result.summary.msic ?? "—"}</div>
                            </div>
                            <div>
                              <div className="text-faint">Bills</div>
                              <div className="font-medium text-ink">{result.summary.exportable ?? result.summary.ready} exportable · {result.summary.blocked} held</div>
                            </div>
                            <div className="col-span-2">
                              <div className="text-faint">Top supplier</div>
                              <div className="font-medium text-ink">{result.summary.topSupplier}</div>
                            </div>
                            {result.summary.blockerMessages && result.summary.blockerMessages.length > 0 && (
                              <div className="col-span-2">
                                <div className="text-faint">Current blockers</div>
                                <div className="mt-1 space-y-1">
                                  {result.summary.blockerMessages.slice(0, 2).map((message) => (
                                    <div key={message} className="rounded border border-border bg-surface-2/60 px-2 py-1 text-muted">
                                      {message}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
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
