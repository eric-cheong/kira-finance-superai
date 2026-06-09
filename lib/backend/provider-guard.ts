import { ApiError } from "./http";

const WINDOW_MS = 60_000;
const MAX_CALLS = Number(process.env.KIRA_PROVIDER_RATE_LIMIT_PER_MINUTE ?? 20);
const MAX_PAYLOAD_BYTES = Number(process.env.KIRA_PROVIDER_MAX_PAYLOAD_BYTES ?? 16_384);
const MAX_STRING_LENGTH = Number(process.env.KIRA_PROVIDER_MAX_STRING_LENGTH ?? 2_000);
const MAX_COLLECTION_ITEMS = Number(process.env.KIRA_PROVIDER_MAX_COLLECTION_ITEMS ?? 60);
const buckets = new Map<string, { count: number; resetAt: number }>();

export function guardProviderRequest(request: Request, payload: unknown) {
  assertSameOrigin(request);
  assertPayloadSize(request, payload);
  assertPayloadShape(payload);
  rateLimit(request);
}

function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  try {
    const requestHost = new URL(request.url).host;
    const originHost = new URL(origin).host;
    if (requestHost !== originHost) {
      throw new ApiError(403, "BAD_ORIGIN", "Provider-backed requests must come from the same app origin.");
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "BAD_ORIGIN", "Provider-backed request origin is invalid.");
  }
}

function assertPayloadSize(request: Request, payload: unknown) {
  const headerBytes = Number(request.headers.get("content-length") ?? 0);
  if (headerBytes > MAX_PAYLOAD_BYTES) {
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Provider-backed request is too large.");
  }
  const estimatedBytes = new TextEncoder().encode(JSON.stringify(payload ?? {})).length;
  if (estimatedBytes > MAX_PAYLOAD_BYTES) {
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Provider-backed request is too large.");
  }
}

function assertPayloadShape(value: unknown, path = "body", depth = 0) {
  if (depth > 8) throw new ApiError(400, "PAYLOAD_TOO_DEEP", "Provider-backed request is too deeply nested.");
  if (typeof value === "string" && value.length > MAX_STRING_LENGTH) {
    throw new ApiError(400, "FIELD_TOO_LONG", `${path} is too long for provider-backed research.`);
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_COLLECTION_ITEMS) throw new ApiError(400, "PAYLOAD_TOO_LARGE", `${path} has too many items.`);
    value.forEach((item, index) => assertPayloadShape(item, `${path}[${index}]`, depth + 1));
    return;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > MAX_COLLECTION_ITEMS) throw new ApiError(400, "PAYLOAD_TOO_LARGE", `${path} has too many fields.`);
    entries.forEach(([key, item]) => assertPayloadShape(item, `${path}.${key}`, depth + 1));
  }
}

function rateLimit(request: Request) {
  const now = Date.now();
  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "local";
  const key = `${client}:${new URL(request.url).pathname}`;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  current.count += 1;
  if (current.count > MAX_CALLS) {
    throw new ApiError(429, "PROVIDER_RATE_LIMITED", "Provider-backed research is temporarily rate limited.");
  }
}
