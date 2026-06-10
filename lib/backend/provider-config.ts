import OpenAI from "openai";
import { OpenAIProvider, setDefaultModelProvider } from "@openai/agents";

export const DEFAULT_OPENAI_MODEL = "gpt-5.5";
export const DEFAULT_OPENAI_REALTIME_MODEL = "gpt-realtime-2";
export const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
export const DEFAULT_OPENAI_REALTIME_URL = `${DEFAULT_OPENAI_BASE_URL}/realtime/calls`;

let configuredAgentsProviderSignature: string | null = null;

export function openaiModel() {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

export function openaiRealtimeModel() {
  return process.env.OPENAI_REALTIME_MODEL?.trim() || DEFAULT_OPENAI_REALTIME_MODEL;
}

export function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function configuredOpenAIBaseURL() {
  return DEFAULT_OPENAI_BASE_URL;
}

function validateOpenAIBaseURL(baseURL: string | undefined) {
  if (!baseURL) return { valid: true as const, value: undefined };
  try {
    const url = new URL(baseURL);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { valid: false as const, value: baseURL, reason: "invalid_openai_base_url_protocol" };
    }
    return { valid: true as const, value: baseURL };
  } catch {
    return { valid: false as const, value: baseURL, reason: "invalid_openai_base_url" };
  }
}

export function openaiProviderReadiness() {
  const apiKeyConfigured = hasOpenAIKey();
  const baseURL = validateOpenAIBaseURL(configuredOpenAIBaseURL());
  const fallbackReason = !apiKeyConfigured
    ? "missing_openai_key"
    : !baseURL.valid
      ? baseURL.reason
      : null;

  return {
    configured: apiKeyConfigured && baseURL.valid,
    apiKeyConfigured,
    baseURL: baseURL.value,
    baseURLConfigured: Boolean(baseURL.value),
    baseURLValid: baseURL.valid,
    fallbackReason,
  };
}

export function hasOpenAIProvider() {
  return openaiProviderReadiness().configured;
}

export function createOpenAIClient(options: Omit<ConstructorParameters<typeof OpenAI>[0], "apiKey" | "baseURL"> = {}) {
  const readiness = openaiProviderReadiness();
  if (!readiness.configured) {
    throw new Error(readiness.fallbackReason ?? "openai_provider_unavailable");
  }
  return new OpenAI({
    ...options,
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: readiness.baseURL,
  });
}

export function configureOpenAIAgentsProvider() {
  const readiness = openaiProviderReadiness();
  if (!readiness.configured) return readiness;

  const signature = `${process.env.OPENAI_API_KEY}\n${readiness.baseURL ?? ""}`;
  if (configuredAgentsProviderSignature !== signature) {
    setDefaultModelProvider(new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: readiness.baseURL,
      cacheResponsesWebSocketModels: false,
    }));
    configuredAgentsProviderSignature = signature;
  }
  return readiness;
}

export function openaiRealtimeConnectionURL() {
  const readiness = openaiProviderReadiness();
  if (!readiness.configured || !readiness.baseURL) return undefined;
  const url = new URL(readiness.baseURL);
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/realtime/calls`;
  return url.toString();
}

export function hasExaKey() {
  return Boolean(process.env.EXA_API_KEY?.trim());
}

export function providerStatus() {
  const openai = openaiProviderReadiness();
  const exaConfigured = hasExaKey();
  return {
    openai: {
      configured: openai.configured,
      apiKeyConfigured: openai.apiKeyConfigured,
      model: openaiModel(),
      baseURL: openai.baseURL ?? DEFAULT_OPENAI_BASE_URL,
      baseURLConfigured: openai.baseURLConfigured,
      baseURLValid: openai.baseURLValid,
      fallbackReason: openai.fallbackReason,
      sdk: "openai + @openai/agents",
    },
    exa: {
      configured: exaConfigured,
      fallbackReason: exaConfigured ? null : "missing_exa_key",
      sdk: "exa-js",
    },
    assistant: {
      configured: true,
      provider: openai.configured ? "openai-agents" : "local-fallback",
      fallbackReason: openai.fallbackReason,
      textRoute: "/api/assistant",
      knowledgeBase: "local-kira-knowledge",
    },
    voice: {
      configured: openai.configured,
      fallbackReason: openai.fallbackReason,
      mode: "browser speech + optional realtime client secret",
      realtimeModel: openaiRealtimeModel(),
      realtimeURL: openaiRealtimeConnectionURL() ?? DEFAULT_OPENAI_REALTIME_URL,
      sessionRoute: "/api/assistant/voice-session",
    },
    bookingBoundary: {
      canResearch: true,
      canCreateQuoteRecords: true,
      canPlaceBooking: false,
      approvalRoute: "/api/bookings/:quoteId/decision",
    },
  };
}
