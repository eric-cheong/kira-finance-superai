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

export function hasMem0Key() {
  return Boolean(process.env.MEM0_API_KEY?.trim());
}

export function mem0OrgId() {
  return process.env.MEM0_ORG_ID?.trim() || undefined;
}

export function mem0ProjectId() {
  return process.env.MEM0_PROJECT_ID?.trim() || undefined;
}

export function memoryProviderReadiness() {
  const configured = hasMem0Key();
  return {
    configured,
    mode: configured ? "mem0-platform" : "local-store",
    orgId: mem0OrgId(),
    projectId: mem0ProjectId(),
    fallbackReason: configured ? null : "missing_mem0_key",
  };
}

const SPONSOR_ENV = {
  brightData: {
    key: "BRIGHT_DATA_API_KEY",
    endpoint: "BRIGHT_DATA_ENDPOINT",
    fallbackEndpoint: "https://api.brightdata.com/request",
    sdk: "Bright Data Web Unlocker API",
  },
  kimi: {
    key: "KIMI_API_KEY",
    endpoint: "KIMI_BASE_URL",
    fallbackEndpoint: "https://api.moonshot.ai/v1",
    sdk: "Kimi OpenAI-compatible API",
  },
  tokenRouter: {
    key: "TOKENROUTER_API_KEY",
    endpoint: "TOKENROUTER_BASE_URL",
    fallbackEndpoint: "https://api.tokenrouter.ai/v1",
    sdk: "TokenRouter OpenAI-compatible API",
  },
  videoDb: {
    key: "VIDEODB_API_KEY",
    endpoint: "VIDEODB_BASE_URL",
    fallbackEndpoint: "https://api.videodb.io",
    sdk: "VideoDB API",
  },
  daytona: {
    key: "DAYTONA_API_KEY",
    endpoint: "DAYTONA_BASE_URL",
    fallbackEndpoint: "https://app.daytona.io/api",
    sdk: "Daytona sandbox API",
  },
  nosana: {
    key: "NOSANA_API_KEY",
    endpoint: "NOSANA_BASE_URL",
    fallbackEndpoint: "https://api.nosana.io",
    sdk: "Nosana job API",
  },
  terminal3: {
    key: "TERMINAL3_API_KEY",
    endpoint: "TERMINAL3_BASE_URL",
    fallbackEndpoint: "https://api.terminal3.io",
    sdk: "Terminal 3 Agent Dev Kit",
  },
} as const;

export type SponsorProviderId = keyof typeof SPONSOR_ENV;

export function sponsorProviderReadiness() {
  return Object.fromEntries(
    Object.entries(SPONSOR_ENV).map(([id, config]) => {
      const apiKeyConfigured = Boolean(process.env[config.key]?.trim());
      const endpoint = process.env[config.endpoint]?.trim() || config.fallbackEndpoint;
      return [id, {
        configured: apiKeyConfigured,
        apiKeyConfigured,
        endpoint,
        endpointConfigured: Boolean(process.env[config.endpoint]?.trim()),
        fallbackReason: apiKeyConfigured ? null : `missing_${config.key.toLowerCase()}`,
        sdk: config.sdk,
      }];
    }),
  ) as Record<SponsorProviderId, {
    configured: boolean;
    apiKeyConfigured: boolean;
    endpoint: string;
    endpointConfigured: boolean;
    fallbackReason: string | null;
    sdk: string;
  }>;
}

export function providerStatus() {
  const openai = openaiProviderReadiness();
  const exaConfigured = hasExaKey();
  const memory = memoryProviderReadiness();
  const sponsors = sponsorProviderReadiness();
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
    memory: {
      configured: memory.configured,
      provider: memory.mode,
      orgId: memory.orgId,
      projectId: memory.projectId,
      fallbackReason: memory.fallbackReason,
      sdk: "mem0ai",
    },
    sponsors,
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
  };
}
