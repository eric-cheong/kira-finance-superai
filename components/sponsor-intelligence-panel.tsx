"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, CardHeader, EmptyState, Notice } from "@/components/ui";

type SponsorSource = "live" | "fallback";

interface SponsorAction {
  provider: string;
  action: string;
  label: string;
  detail: string;
}

interface SponsorEvidence {
  label: string;
  value: string;
  url?: string;
  score?: number;
}

interface SponsorDocument {
  title: string;
  type: string;
  body: string;
  source?: string;
}

interface SponsorSupplier {
  supplierId?: string;
  supplierName: string;
  query?: string;
}

interface SponsorResult {
  provider: string;
  source: SponsorSource;
  status: "ok" | "degraded";
  summary: string;
  evidence: SponsorEvidence[];
  documents?: SponsorDocument[];
  fallbackReason?: string;
}

type PanelState =
  | { status: "idle" }
  | { status: "loading"; key: string }
  | { status: "ok"; message: string }
  | { status: "error"; message: string };

const ACTIONS: SponsorAction[] = [
  {
    provider: "bright-data",
    action: "vendor-intel",
    label: "Bright Data",
    detail: "Refresh supplier web intelligence",
  },
  {
    provider: "kimi",
    action: "close-reasoning",
    label: "Kimi AI",
    detail: "Explain blockers with long-context reasoning",
  },
  {
    provider: "tokenrouter",
    action: "route-model",
    label: "TokenRouter",
    detail: "Route model work with cache-aware provider selection",
  },
  {
    provider: "videodb",
    action: "search-evidence",
    label: "VideoDB",
    detail: "Search receiving and approval video evidence",
  },
  {
    provider: "daytona",
    action: "validate-export",
    label: "Daytona",
    detail: "Validate ERP export in an isolated sandbox",
  },
  {
    provider: "nosana",
    action: "anomaly-scan",
    label: "Nosana",
    detail: "Run GPU-style duplicate and anomaly scan",
  },
  {
    provider: "terminal3",
    action: "verify-agent",
    label: "Terminal 3",
    detail: "Verify agent identity before close actions",
  },
];

async function postJson(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => undefined);
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error?.message ?? "Sponsor action failed.");
  }
  return payload?.data ?? payload;
}

export function SponsorIntelligencePanel({
  clientId,
  closePeriod,
  suppliers = [],
}: {
  clientId: string;
  closePeriod: string;
  suppliers?: SponsorSupplier[];
}) {
  const [state, setState] = useState<PanelState>({ status: "idle" });
  const [results, setResults] = useState<Record<string, SponsorResult>>({});
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.supplierId ?? suppliers[0]?.supplierName ?? "");
  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => (supplier.supplierId ?? supplier.supplierName) === selectedSupplierId) ?? suppliers[0],
    [selectedSupplierId, suppliers],
  );
  const liveCount = useMemo(
    () => Object.values(results).filter((result) => result.source === "live").length,
    [results],
  );
  const busyKey = state.status === "loading" ? state.key : null;

  async function runAction(action: SponsorAction) {
    const key = `${action.provider}/${action.action}`;
    setState({ status: "loading", key });
    try {
      const result = await postJson(`/api/sponsors/${action.provider}/${action.action}`, {
        clientId,
        closePeriod,
        supplierId: selectedSupplier?.supplierId,
        supplierName: selectedSupplier?.supplierName,
        query: selectedSupplier?.query,
      }) as SponsorResult;
      setResults((current) => ({ ...current, [key]: result }));
      setState({
        status: "ok",
        message: `${result.provider} returned ${result.source === "live" ? "live" : "fallback"} evidence.`,
      });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Sponsor action failed." });
    }
  }

  return (
    <Card>
      <CardHeader
        title="Close Intelligence"
        subtitle="Sponsored agents for live evidence, model routing, sandbox checks, video search, GPU scans, and identity."
        icon="spark"
        right={<Badge variant={liveCount > 0 ? "brand" : "neutral"}>{liveCount}/{ACTIONS.length} live</Badge>}
      />

      {suppliers.length > 0 && (
        <label className="mb-3 block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-faint">Supplier for research</span>
          <select
            value={selectedSupplierId}
            onChange={(event) => setSelectedSupplierId(event.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-[12.5px] text-ink outline-none focus:border-brand-fg"
          >
            {suppliers.map((supplier) => {
              const value = supplier.supplierId ?? supplier.supplierName;
              return (
                <option key={value} value={value}>
                  {supplier.supplierName}
                </option>
              );
            })}
          </select>
        </label>
      )}

      <div className="space-y-2">
        {ACTIONS.map((action) => {
          const key = `${action.provider}/${action.action}`;
          const result = results[key];
          const busy = busyKey === key;
          return (
            <div key={key} className="rounded-lg border border-border bg-surface-2/45 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold leading-snug text-ink">{action.label}</div>
                  <div className="mt-0.5 text-[12px] leading-relaxed text-muted">{action.detail}</div>
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
                onClick={() => runAction(action)}
              >
                {busy ? "Running" : "Run"}
              </Button>
              {result && (
                <div className="mt-3 space-y-2">
                  <p className="text-[12.5px] leading-relaxed text-muted">{result.summary}</p>
                  <div className="rounded-md border border-border bg-surface px-2.5 py-2">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-faint">Evidence returned</span>
                      <Badge variant={result.source === "live" ? "brand" : "neutral"}>
                        {result.source === "live" ? "Live provider" : "Fallback proof"}
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      {result.evidence.map((item) => (
                        <div key={`${key}-${item.label}`} className="grid grid-cols-[92px_minmax(0,1fr)] gap-2 text-[12px] leading-relaxed">
                          <span className="text-faint">{item.label}</span>
                          {item.url ? (
                            <a className="min-w-0 truncate text-right text-info-fg" href={item.url} target="_blank" rel="noreferrer">
                              {item.value}
                            </a>
                          ) : (
                            <span className="min-w-0 truncate text-right text-ink">{item.value}</span>
                          )}
                        </div>
                      ))}
                      {result.fallbackReason && (
                        <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-2 text-[12px] leading-relaxed">
                          <span className="text-faint">Reason</span>
                          <span className="min-w-0 truncate text-right text-warn-fg">{result.fallbackReason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {result.documents && result.documents.length > 0 && (
                    <div className="rounded-md border border-brand-fg/20 bg-brand-bg px-2.5 py-2">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-fg">Documents generated</span>
                        <Badge variant="brand">{result.documents.length} doc</Badge>
                      </div>
                      <div className="space-y-2">
                        {result.documents.map((doc) => (
                          <div key={`${key}-${doc.title}`} className="rounded-md border border-brand-fg/15 bg-surface px-2.5 py-2">
                            <div className="flex min-w-0 items-center justify-between gap-2">
                              <span className="min-w-0 truncate text-[12px] font-semibold text-ink">{doc.title}</span>
                              <span className="shrink-0 rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[10.5px] uppercase tracking-wide text-faint">
                                {doc.type.replace(/_/g, " ")}
                              </span>
                            </div>
                            <p className="mt-1 whitespace-pre-line text-[12px] leading-relaxed text-muted">{doc.body}</p>
                            {doc.source && (
                              <div className="mt-1 text-[11.5px] text-faint">Source: {doc.source}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {Object.keys(results).length === 0 && (
        <EmptyState
          icon="spark"
          title="No sponsor run yet"
          sub="Run each sponsor step to produce judge-visible close evidence with provider provenance."
        />
      )}
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
