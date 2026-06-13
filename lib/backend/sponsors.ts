import "server-only";

import { createHash } from "node:crypto";
import { ApiError } from "./http";
import { sponsorProviderReadiness, type SponsorProviderId } from "./provider-config";
import { state } from "./state";

export type SponsorAction =
  | "vendor-intel"
  | "close-reasoning"
  | "route-model"
  | "analyze-close-pack"
  | "search-evidence"
  | "validate-export"
  | "anomaly-scan"
  | "verify-agent";

export interface SponsorEvidence {
  label: string;
  value: string;
  url?: string;
  score?: number;
}

export interface SponsorActionResult {
  provider: string;
  source: "live" | "fallback";
  status: "ok" | "degraded";
  summary: string;
  evidence: SponsorEvidence[];
  fallbackReason?: string;
}

interface SponsorDefinition {
  provider: SponsorProviderId;
  providerName: string;
  action: SponsorAction;
  title: string;
}

const SPONSOR_ACTIONS: Record<string, SponsorDefinition> = {
  "bright-data/vendor-intel": {
    provider: "brightData",
    providerName: "Bright Data",
    action: "vendor-intel",
    title: "Supplier web intelligence refreshed",
  },
  "kimi/close-reasoning": {
    provider: "kimi",
    providerName: "Kimi AI",
    action: "close-reasoning",
    title: "Close blockers reasoned over long context",
  },
  "tokenrouter/route-model": {
    provider: "tokenRouter",
    providerName: "TokenRouter",
    action: "route-model",
    title: "Model route selected with cache-aware routing",
  },
  "videodb/search-evidence": {
    provider: "videoDb",
    providerName: "VideoDB",
    action: "search-evidence",
    title: "Receiving video evidence searched",
  },
  "daytona/validate-export": {
    provider: "daytona",
    providerName: "Daytona",
    action: "validate-export",
    title: "ERP export validated in sandbox",
  },
  "nosana/anomaly-scan": {
    provider: "nosana",
    providerName: "Nosana",
    action: "anomaly-scan",
    title: "GPU anomaly scan completed",
  },
  "terminal3/verify-agent": {
    provider: "terminal3",
    providerName: "Terminal 3",
    action: "verify-agent",
    title: "Agent identity verified",
  },
};

function sponsorApiKey(provider: SponsorProviderId) {
  const envName: Record<SponsorProviderId, string> = {
    brightData: "BRIGHT_DATA_API_KEY",
    kimi: "KIMI_API_KEY",
    tokenRouter: "TOKENROUTER_API_KEY",
    videoDb: "VIDEODB_API_KEY",
    daytona: "DAYTONA_API_KEY",
    nosana: "NOSANA_API_KEY",
    terminal3: "TERMINAL3_API_KEY",
  };
  return process.env[envName[provider]]?.trim();
}

function sponsorActionKey(provider: string, action: string) {
  return `${provider}/${action}`;
}

function closeContext() {
  const client = state.closeBookClients[0];
  const records = state.closeBookRecords.filter((record) => record.clientId === client.id);
  const blocked = records.filter((record) => record.status === "needs_review");
  const ready = records.filter((record) => record.status === "ready" || record.status === "approved");
  const topSupplier = records.find((record) => record.supplierName)?.supplierName ?? "Beras Murni Trading Sdn Bhd";
  return { client, records, blocked, ready, topSupplier };
}

function stableId(input: string) {
  return createHash("sha256").update(input).digest("hex").slice(0, 12);
}

export async function runSponsorAction(provider: string, action: string, input: unknown = {}): Promise<SponsorActionResult> {
  const definition = SPONSOR_ACTIONS[sponsorActionKey(provider, action)];
  if (!definition) {
    throw new ApiError(404, "SPONSOR_ACTION_NOT_FOUND", `Sponsor action ${provider}/${action} was not found.`);
  }

  const readiness = sponsorProviderReadiness()[definition.provider];
  const apiKey = sponsorApiKey(definition.provider);
  if (!readiness.configured || !apiKey) {
    return fallbackResult(definition, readiness.fallbackReason ?? "provider_not_configured");
  }

  try {
    const live = await liveSponsorCall(definition, readiness.endpoint, apiKey, input);
    return live;
  } catch (error) {
    return fallbackResult(definition, error instanceof Error ? error.message : "live_provider_failed");
  }
}

async function liveSponsorCall(
  definition: SponsorDefinition,
  endpoint: string,
  apiKey: string,
  input: unknown,
): Promise<SponsorActionResult> {
  if (definition.provider === "kimi" || definition.provider === "tokenRouter") {
    return openAiCompatibleCall(definition, endpoint, apiKey);
  }
  if (definition.provider === "brightData") {
    return brightDataCall(definition, endpoint, apiKey);
  }
  return genericSponsorCall(definition, endpoint, apiKey, input);
}

async function openAiCompatibleCall(
  definition: SponsorDefinition,
  endpoint: string,
  apiKey: string,
): Promise<SponsorActionResult> {
  const { client, blocked, ready } = closeContext();
  const base = endpoint.replace(/\/+$/, "");
  const model = definition.provider === "kimi"
    ? process.env.KIMI_MODEL?.trim() || "kimi-k2.6"
    : process.env.TOKENROUTER_MODEL?.trim() || "auto";
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "You are Kira's finance close intelligence agent. Be concise, audit-friendly, and never claim money movement.",
        },
        {
          role: "user",
          content: `Client ${client.tradingName} has ${blocked.length} blocked close-book records and ${ready.length} ready or approved records. Explain the next safest close action in one sentence.`,
        },
      ],
    }),
  });
  if (!response.ok) throw new Error(`${definition.providerName} ${response.status}`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const summary = payload.choices?.[0]?.message?.content?.trim() || fallbackSummary(definition);
  return {
    provider: definition.providerName,
    source: "live",
    status: "ok",
    summary,
    evidence: [
      { label: "Model", value: model },
      { label: "Endpoint", value: endpoint },
      { label: "Close context", value: `${blocked.length} blocked, ${ready.length} ready/approved` },
    ],
  };
}

async function brightDataCall(
  definition: SponsorDefinition,
  endpoint: string,
  apiKey: string,
): Promise<SponsorActionResult> {
  const { topSupplier } = closeContext();
  const targetUrl = process.env.BRIGHT_DATA_TARGET_URL?.trim() || "https://www.hasil.gov.my/en/e-invoice/";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: targetUrl,
      format: "raw",
    }),
  });
  if (!response.ok) throw new Error(`${definition.providerName} ${response.status}`);
  const text = await response.text();
  return {
    provider: definition.providerName,
    source: "live",
    status: "ok",
    summary: `Fetched live web evidence for close research related to ${topSupplier}.`,
    evidence: [
      { label: "Target URL", value: targetUrl, url: targetUrl },
      { label: "Payload bytes", value: String(text.length), score: Math.min(100, Math.max(40, Math.round(text.length / 80))) },
      { label: "Evidence hash", value: stableId(text) },
    ],
  };
}

async function genericSponsorCall(
  definition: SponsorDefinition,
  endpoint: string,
  apiKey: string,
  input: unknown,
): Promise<SponsorActionResult> {
  const { client, blocked, ready } = closeContext();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: definition.action,
      clientId: client.id,
      clientName: client.tradingName,
      closePeriod: client.closePeriod,
      blockedRecords: blocked.map((record) => record.id),
      readyRecords: ready.map((record) => record.id),
      input,
    }),
  });
  if (!response.ok) throw new Error(`${definition.providerName} ${response.status}`);
  const text = await response.text();
  return {
    provider: definition.providerName,
    source: "live",
    status: "ok",
    summary: `${definition.title} through ${definition.providerName}.`,
    evidence: [
      { label: "Endpoint", value: endpoint },
      { label: "Response hash", value: stableId(text) },
      { label: "Close context", value: `${blocked.length} blocked, ${ready.length} ready/approved` },
    ],
  };
}

function fallbackSummary(definition: SponsorDefinition) {
  const { client, blocked, ready, topSupplier } = closeContext();
  const summaries: Record<SponsorAction, string> = {
    "vendor-intel": `Fallback web intelligence: ${topSupplier} is a recurring supplier; verify public registration, tax identity, and recent supplier-risk changes before export.`,
    "close-reasoning": `Fallback close reasoning: ${client.tradingName} has ${blocked.length} blocked records; clear tax identity and duplicate-risk blockers before exporting ${ready.length} ready records.`,
    "route-model": "Fallback model routing: route long-context close reasoning to Kimi, fast UI summaries to TokenRouter cache, and deterministic blockers to local rules.",
    "analyze-close-pack": "Fallback multimodal analysis: close pack suggests tax treatment, ERP coding, and exception notes are complete for the ready queue.",
    "search-evidence": "Fallback video evidence: receiving walkthrough confirms goods received for the recurring supplier and no quantity variance was flagged.",
    "validate-export": "Fallback sandbox validation: ERP export package passes schema, required mapping, and never-export blocker checks.",
    "anomaly-scan": "Fallback GPU scan: duplicate-risk cluster found one cross-client CoolTech invoice; exported records are clean.",
    "verify-agent": "Fallback identity proof: Kira Close Agent is authorized for read, suggest, and prepare-export actions; payment and regulator submission remain human-approved.",
  };
  return summaries[definition.action];
}

function fallbackResult(definition: SponsorDefinition, reason: string): SponsorActionResult {
  const { client, blocked, ready } = closeContext();
  return {
    provider: definition.providerName,
    source: "fallback",
    status: "degraded",
    summary: fallbackSummary(definition),
    fallbackReason: reason,
    evidence: [
      { label: "Client", value: `${client.tradingName} · ${client.closePeriod}` },
      { label: "Close queue", value: `${blocked.length} blocked · ${ready.length} ready/approved` },
      { label: "Demo artifact", value: `${definition.action}-${stableId(`${definition.providerName}:${reason}`)}` },
    ],
  };
}

export function sponsorActions() {
  return Object.entries(SPONSOR_ACTIONS).map(([key, definition]) => ({
    key,
    provider: definition.provider,
    providerName: definition.providerName,
    action: definition.action,
    title: definition.title,
  }));
}
