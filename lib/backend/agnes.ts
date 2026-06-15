import OpenAI from "openai";
import { OpenAIProvider, setDefaultModelProvider } from "@openai/agents";

/**
 * Agnes AI — the omni-modal provider that powers Kira Finance.
 *
 * Agnes is OpenAI-compatible: same `/v1/chat/completions` + `/v1/images/generations`
 * wire format, so we reuse the `openai` SDK and `@openai/agents` provider by pointing
 * them at the Agnes gateway. One provider serves all modalities:
 *   - Text   : agnes-2.0-flash        (chat + multimodal text+image input)
 *   - Image  : agnes-image-2.0-flash  (text-to-image / image-to-image)
 *   - Video  : agnes-video-v2.0       (text-to-video / image-to-video)
 *
 * Mirrors the readiness / client / source-tagging patterns in `provider-config.ts`.
 */

export const DEFAULT_AGNES_BASE_URL = "https://apihub.agnes-ai.com/v1";
export const DEFAULT_AGNES_TEXT_MODEL = "agnes-2.0-flash";
export const DEFAULT_AGNES_IMAGE_MODEL = "agnes-image-2.0-flash";
export const DEFAULT_AGNES_VIDEO_MODEL = "agnes-video-v2.0";

let configuredAgnesAgentsSignature: string | null = null;

export function hasAgnesKey() {
  return Boolean(process.env.AGNES_API_KEY?.trim());
}

export function agnesBaseURL() {
  return process.env.AGNES_BASE_URL?.trim() || DEFAULT_AGNES_BASE_URL;
}

export function agnesTextModel() {
  return process.env.AGNES_TEXT_MODEL?.trim() || DEFAULT_AGNES_TEXT_MODEL;
}

export function agnesImageModel() {
  return process.env.AGNES_IMAGE_MODEL?.trim() || DEFAULT_AGNES_IMAGE_MODEL;
}

export function agnesVideoModel() {
  return process.env.AGNES_VIDEO_MODEL?.trim() || DEFAULT_AGNES_VIDEO_MODEL;
}

function validateAgnesBaseURL(baseURL: string) {
  try {
    const url = new URL(baseURL);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { valid: false as const, value: baseURL, reason: "invalid_agnes_base_url_protocol" };
    }
    return { valid: true as const, value: baseURL };
  } catch {
    return { valid: false as const, value: baseURL, reason: "invalid_agnes_base_url" };
  }
}

export function agnesProviderReadiness() {
  const apiKeyConfigured = hasAgnesKey();
  const baseURL = validateAgnesBaseURL(agnesBaseURL());
  const fallbackReason = !apiKeyConfigured
    ? "missing_agnes_key"
    : !baseURL.valid
      ? baseURL.reason
      : null;

  return {
    configured: apiKeyConfigured && baseURL.valid,
    apiKeyConfigured,
    baseURL: baseURL.value,
    baseURLValid: baseURL.valid,
    fallbackReason,
  };
}

export function hasAgnesProvider() {
  return agnesProviderReadiness().configured;
}

export function agnesClient(
  options: Omit<ConstructorParameters<typeof OpenAI>[0], "apiKey" | "baseURL"> = {},
) {
  const readiness = agnesProviderReadiness();
  if (!readiness.configured) {
    throw new Error(readiness.fallbackReason ?? "agnes_provider_unavailable");
  }
  return new OpenAI({
    ...options,
    apiKey: process.env.AGNES_API_KEY,
    baseURL: readiness.baseURL,
  });
}

type AgnesChatMessages = Parameters<OpenAI["chat"]["completions"]["create"]>[0]["messages"];

/**
 * Thin chat helper. Accepts multimodal content arrays (text + image_url data URLs)
 * so the Vision OCR path reuses it directly.
 */
export async function agnesChat(
  messages: AgnesChatMessages,
  options: { model?: string; temperature?: number; maxTokens?: number } = {},
) {
  const client = agnesClient();
  const completion = await client.chat.completions.create({
    model: options.model ?? agnesTextModel(),
    messages,
    temperature: options.temperature,
    max_tokens: options.maxTokens,
  });
  return completion;
}

/** Configure the @openai/agents default provider to route through Agnes. */
export function configureAgnesAgentsProvider() {
  const readiness = agnesProviderReadiness();
  if (!readiness.configured) return readiness;

  const signature = `${process.env.AGNES_API_KEY}\n${readiness.baseURL}`;
  if (configuredAgnesAgentsSignature !== signature) {
    setDefaultModelProvider(new OpenAIProvider({
      apiKey: process.env.AGNES_API_KEY,
      baseURL: readiness.baseURL,
      cacheResponsesWebSocketModels: false,
    }));
    configuredAgnesAgentsSignature = signature;
  }
  return readiness;
}
