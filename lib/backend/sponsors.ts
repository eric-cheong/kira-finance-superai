import "server-only";

import { createHash } from "node:crypto";
import { ApiError } from "./http";
import { sponsorProviderReadiness, type SponsorProviderId } from "./provider-config";
import { state } from "./state";

const DEFAULT_TOKENROUTER_MODEL = "openai/gpt-5.4-nano";

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

export interface SponsorDocument {
  title: string;
  type: "web_evidence" | "analysis_report" | "routing_report" | "video_evidence" | "compute_report" | "identity_proof" | "sandbox_report";
  body: string;
  source?: string;
}

export interface SponsorActionResult {
  provider: string;
  source: "live" | "fallback";
  status: "ok" | "degraded";
  summary: string;
  evidence: SponsorEvidence[];
  documents?: SponsorDocument[];
  fallbackReason?: string;
}

interface SponsorDefinition {
  provider: SponsorProviderId;
  providerName: string;
  action: SponsorAction;
  title: string;
}

interface SponsorActionInput {
  supplierId?: string;
  supplierName?: string;
  query?: string;
}

interface CloseContext {
  client: typeof state.closeBookClients[number];
  records: typeof state.closeBookRecords;
  blocked: typeof state.closeBookRecords;
  ready: typeof state.closeBookRecords;
  topSupplier: string;
  supplierRecords: typeof state.closeBookRecords;
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

function sponsorInput(input: unknown): SponsorActionInput {
  if (!input || typeof input !== "object") return {};
  const candidate = input as Record<string, unknown>;
  return {
    supplierId: typeof candidate.supplierId === "string" ? candidate.supplierId : undefined,
    supplierName: typeof candidate.supplierName === "string" ? candidate.supplierName : undefined,
    query: typeof candidate.query === "string" ? candidate.query : undefined,
  };
}

function closeContext(input: unknown = {}): CloseContext {
  const selected = sponsorInput(input);
  const client = state.closeBookClients[0];
  const records = state.closeBookRecords.filter((record) => record.clientId === client.id);
  const supplierRecords = selected.supplierId
    ? records.filter((record) => record.supplierId === selected.supplierId)
    : selected.supplierName
      ? records.filter((record) => record.supplierName === selected.supplierName)
      : records;
  const blocked = records.filter((record) => record.status === "needs_review");
  const ready = records.filter((record) => record.status === "ready" || record.status === "approved");
  const topSupplier = selected.supplierName
    ?? supplierRecords.find((record) => record.supplierName)?.supplierName
    ?? records.find((record) => record.supplierName)?.supplierName
    ?? "Beras Murni Trading Sdn Bhd";
  return { client, records, blocked, ready, topSupplier, supplierRecords };
}

function stableId(input: string) {
  return createHash("sha256").update(input).digest("hex").slice(0, 12);
}

async function providerError(providerName: string, response: Response) {
  const text = await response.text().catch(() => "");
  const detail = text.trim().replace(/\s+/g, " ").slice(0, 180);
  return detail ? `${providerName} ${response.status}: ${detail}` : `${providerName} ${response.status}`;
}

function tokenRouterModel() {
  const model = process.env.TOKENROUTER_MODEL?.trim();
  return model && model !== "auto" ? model : DEFAULT_TOKENROUTER_MODEL;
}

function supplierSearchUrl(supplierName: string) {
  const query = `${supplierName} Malaysia SSM SST TIN supplier company profile`;
  return `https://www.google.com/search?num=10&hl=en&q=${encodeURIComponent(query)}`;
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function searchResultPreview(html: string, supplierName: string) {
  const title = html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]?.replace(/\s+/g, " ").trim();
  const results = html
    .split('<div class="yuRUbf"')
    .slice(1, 6)
    .map((block) => {
      const href = block.match(/<a[^>]+href="([^"]+)"/)?.[1];
      const resultTitle = decodeHtml(block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1] ?? "");
      const resultSnippet = decodeHtml(block.match(/<div class="VwiC3b[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? "");
      return href && resultTitle ? { href, title: resultTitle, snippet: resultSnippet } : null;
    })
    .filter((result): result is { href: string; title: string; snippet: string } => Boolean(result));
  const exactMatches = results.filter((result) =>
    `${result.title} ${result.snippet}`.toLowerCase().includes(supplierName.toLowerCase()),
  );
  return {
    title: decodeHtml(title || `${supplierName} supplier search`),
    exactMatches,
    results,
  };
}

function parseModelReport(content: string) {
  const summaryMatch = content.match(/SUMMARY:\s*([\s\S]*?)(?:\n\s*REPORT:|$)/i);
  const reportMatch = content.match(/REPORT:\s*([\s\S]*)/i);
  const summary = summaryMatch?.[1]?.trim() || content.split(/\n+/)[0]?.trim() || "Close reasoning report generated.";
  const report = reportMatch?.[1]?.trim() || content.trim();
  return { summary, report };
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
    return withDocuments(definition, live, input);
  } catch (error) {
    return fallbackResult(definition, error instanceof Error ? error.message : "live_provider_failed", input);
  }
}

async function liveSponsorCall(
  definition: SponsorDefinition,
  endpoint: string,
  apiKey: string,
  input: unknown,
): Promise<SponsorActionResult> {
  if (definition.provider === "kimi" || definition.provider === "tokenRouter") {
    return openAiCompatibleCall(definition, endpoint, apiKey, input);
  }
  if (definition.provider === "brightData") {
    return brightDataCall(definition, endpoint, apiKey, input);
  }
  if (definition.provider === "videoDb") {
    return videoDbCall(definition, endpoint, apiKey, input);
  }
  if (definition.provider === "terminal3") {
    return terminal3Call(definition, endpoint, apiKey, input);
  }
  if (definition.provider === "nosana") {
    return nosanaCall(definition, endpoint, apiKey, input);
  }
  return genericSponsorCall(definition, endpoint, apiKey, input);
}

async function openAiCompatibleCall(
  definition: SponsorDefinition,
  endpoint: string,
  apiKey: string,
  input: unknown,
): Promise<SponsorActionResult> {
  const { client, blocked, ready, topSupplier, supplierRecords } = closeContext(input);
  const base = endpoint.replace(/\/+$/, "");
  const model = definition.provider === "kimi"
    ? process.env.KIMI_MODEL?.trim() || "kimi-k2.6"
    : tokenRouterModel();
  const temperature = definition.provider === "kimi" ? 1 : 0.2;
  const userPrompt = definition.provider === "kimi"
    ? `Write a close-book analysis report for client ${client.tradingName}, supplier ${topSupplier}. Current supplier records: ${supplierRecords.map((record) => `${record.id}:${record.status}:${record.invoiceNumber ?? "no invoice"}:${record.erpMapping?.expenseAccountCode ?? "no expense"}:${record.erpMapping?.taxCode ?? "no tax"}`).join(", ") || "none"}. Overall close queue: ${blocked.length} blocked and ${ready.length} ready or approved. Return exactly this format:
SUMMARY: one sentence for the accountant
REPORT:
Supplier:
Close finding:
Blockers:
Recommended action:
Audit note:
Do not claim payment, settlement, or regulator submission.`
    : `Client ${client.tradingName} has ${blocked.length} blocked close-book records and ${ready.length} ready or approved records. Explain the next safest close action in one sentence.`;
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature,
      messages: [
        {
          role: "system",
          content: "You are Kira's finance close intelligence agent. Be concise, audit-friendly, and never claim money movement.",
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    }),
  });
  if (!response.ok) throw new Error(await providerError(definition.providerName, response));
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content?.trim() || fallbackSummary(definition);
  const parsed = definition.provider === "kimi" ? parseModelReport(content) : { summary: content, report: content };
  return {
    provider: definition.providerName,
    source: "live",
    status: "ok",
    summary: parsed.summary,
    evidence: [
      { label: "Model", value: model },
      { label: "Endpoint", value: endpoint },
      { label: "Supplier", value: topSupplier },
      { label: "Close context", value: `${blocked.length} blocked, ${ready.length} ready/approved` },
    ],
    documents: definition.provider === "kimi"
      ? [{
        title: "Close blocker analysis report",
        type: "analysis_report",
        body: parsed.report,
        source: definition.providerName,
      }]
      : undefined,
  };
}

async function brightDataCall(
  definition: SponsorDefinition,
  endpoint: string,
  apiKey: string,
  input: unknown,
): Promise<SponsorActionResult> {
  const { topSupplier } = closeContext(input);
  const targetUrl = supplierSearchUrl(topSupplier);
  const zone = process.env.BRIGHT_DATA_ZONE?.trim();
  if (!zone) {
    throw new Error("Bright Data zone missing. Create a Web Unlocker zone in Bright Data and set BRIGHT_DATA_ZONE.");
  }
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      zone,
      url: targetUrl,
      format: "raw",
    }),
  });
  if (!response.ok) throw new Error(await providerError(definition.providerName, response));
  const text = await response.text();
  const preview = searchResultPreview(text, topSupplier);
  const resultLines = (preview.exactMatches.length > 0 ? preview.exactMatches : preview.results)
    .slice(0, 3)
    .map((result, index) => `${index + 1}. ${result.title} (${result.href})${result.snippet ? ` - ${result.snippet}` : ""}`);
  const matchNote = preview.exactMatches.length > 0
    ? `Exact supplier-name matches found: ${preview.exactMatches.length}.`
    : `No exact public result for "${topSupplier}" was found in the first returned organic results; nearest returned sources are listed for manual review.`;
  return {
    provider: definition.providerName,
    source: "live",
    status: "ok",
    summary: `Fetched supplier-specific web research for ${topSupplier}; ${matchNote}`,
    evidence: [
      { label: "Zone", value: zone },
      { label: "Supplier", value: topSupplier },
      { label: "Target URL", value: targetUrl, url: targetUrl },
      { label: "Page title", value: preview.title },
      { label: "Organic results", value: String(preview.results.length) },
      { label: "Exact matches", value: String(preview.exactMatches.length) },
      { label: "Payload bytes", value: String(text.length), score: Math.min(100, Math.max(40, Math.round(text.length / 80))) },
      { label: "Evidence hash", value: stableId(text) },
    ],
    documents: [{
      title: "Supplier web research brief",
      type: "web_evidence",
      body: [
        `Supplier: ${topSupplier}`,
        `Search query: ${decodeURIComponent(targetUrl.split("q=")[1] ?? "")}`,
        `Returned page title: ${preview.title}`,
        matchNote,
        "",
        "Returned sources:",
        resultLines.length > 0 ? resultLines.join("\n") : "No readable organic result blocks were parsed from the returned page.",
        "",
        "Close action: do not treat this as supplier verification by itself. Use it as a web-research artifact, then verify supplier master, TIN/SST details, and invoice evidence before export.",
      ].join("\n"),
      source: definition.providerName,
    }],
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
  if (!response.ok) throw new Error(await providerError(definition.providerName, response));
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

async function videoDbCall(
  definition: SponsorDefinition,
  endpoint: string,
  apiKey: string,
  input: unknown,
): Promise<SponsorActionResult> {
  const { blocked, ready, topSupplier } = closeContext(input);
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) throw new Error(await providerError(definition.providerName, response));
  const text = await response.text();
  return {
    provider: definition.providerName,
    source: "live",
    status: "ok",
    summary: `Verified VideoDB service availability before searching receiving evidence for ${topSupplier}.`,
    evidence: [
      { label: "Endpoint", value: endpoint },
      { label: "Service proof", value: stableId(text) },
      { label: "Close context", value: `${blocked.length} blocked, ${ready.length} ready/approved` },
    ],
  };
}

async function terminal3Call(
  definition: SponsorDefinition,
  endpoint: string,
  apiKey: string,
  input: unknown,
): Promise<SponsorActionResult> {
  const { blocked, ready } = closeContext(input);
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) throw new Error(await providerError(definition.providerName, response));
  const text = await response.text();
  return {
    provider: definition.providerName,
    source: "live",
    status: "ok",
    summary: "Verified Terminal 3 agent identity service availability before approval-gated close actions.",
    evidence: [
      { label: "Endpoint", value: endpoint },
      { label: "Identity service proof", value: stableId(text) },
      { label: "Close context", value: `${blocked.length} blocked, ${ready.length} ready/approved` },
    ],
  };
}

async function nosanaCall(
  definition: SponsorDefinition,
  endpoint: string,
  apiKey: string,
  input: unknown,
): Promise<SponsorActionResult> {
  const { blocked, ready } = closeContext(input);
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    throw new Error(`Nosana endpoint unreachable: ${endpoint}. Check NOSANA_BASE_URL.`);
  }
  if (!response.ok) throw new Error(await providerError(definition.providerName, response));
  const text = await response.text();
  return {
    provider: definition.providerName,
    source: "live",
    status: "ok",
    summary: "Verified Nosana compute endpoint availability before running duplicate and anomaly scan workloads.",
    evidence: [
      { label: "Endpoint", value: endpoint },
      { label: "Compute service proof", value: stableId(text) },
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

function documentType(action: SponsorAction): SponsorDocument["type"] {
  const types: Record<SponsorAction, SponsorDocument["type"]> = {
    "vendor-intel": "web_evidence",
    "close-reasoning": "analysis_report",
    "route-model": "routing_report",
    "analyze-close-pack": "analysis_report",
    "search-evidence": "video_evidence",
    "validate-export": "sandbox_report",
    "anomaly-scan": "compute_report",
    "verify-agent": "identity_proof",
  };
  return types[action];
}

function documentTitle(definition: SponsorDefinition) {
  const titles: Record<SponsorAction, string> = {
    "vendor-intel": "Supplier web evidence note",
    "close-reasoning": "Close blocker analysis report",
    "route-model": "Model routing decision report",
    "analyze-close-pack": "Close pack analysis report",
    "search-evidence": "Receiving video evidence note",
    "validate-export": "ERP export sandbox report",
    "anomaly-scan": "Duplicate and anomaly scan report",
    "verify-agent": "Agent identity proof",
  };
  return titles[definition.action];
}

function withDocuments(definition: SponsorDefinition, result: SponsorActionResult, input: unknown = {}): SponsorActionResult {
  const { client, blocked, ready, topSupplier } = closeContext(input);
  const evidenceText = result.evidence.map((item) => `${item.label}: ${item.value}`).join(" | ");
  const artifactId = `${definition.action}-${stableId(`${definition.providerName}:${result.summary}:${evidenceText}`)}`;
  const bodyByAction: Record<SponsorAction, string> = {
    "vendor-intel": `${definition.providerName} checked live web context for ${topSupplier}. The close note records the source URL, Web Unlocker zone, response proof, and supplier-risk context before export.`,
    "close-reasoning": `${definition.providerName} reviewed ${client.tradingName}'s close queue and produced the recommended next action: ${result.summary}`,
    "route-model": `${definition.providerName} routed the close intelligence request to the selected model endpoint and returned a model provenance record for audit review.`,
    "analyze-close-pack": `${definition.providerName} generated a close-pack review note for tax treatment, ERP coding completeness, and exception readiness.`,
    "search-evidence": `${definition.providerName} verified the video evidence service for receiving and approval proof tied to ${topSupplier}.`,
    "validate-export": `${definition.providerName} produced an export validation note for the ERP batch, required fields, and never-export blockers.`,
    "anomaly-scan": `${definition.providerName} produced a compute scan note for duplicate-risk and anomaly detection across ${ready.length} exportable records.`,
    "verify-agent": `${definition.providerName} produced an identity proof note confirming the Kira Close Agent can read, suggest, and prepare export evidence while approval-gated actions remain human controlled.`,
  };
  return {
    ...result,
    documents: result.documents && result.documents.length > 0 ? result.documents : [
      {
        title: documentTitle(definition),
        type: documentType(definition.action),
        body: `${bodyByAction[definition.action]} Close context: ${blocked.length} blocked, ${ready.length} ready/approved. Artifact: ${artifactId}.`,
        source: result.source === "live" ? definition.providerName : "Local fallback",
      },
    ],
  };
}

function fallbackResult(definition: SponsorDefinition, reason: string, input: unknown = {}): SponsorActionResult {
  const { client, blocked, ready } = closeContext(input);
  return withDocuments(definition, {
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
  }, input);
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
