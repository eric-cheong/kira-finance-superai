import Exa from "exa-js";
import type { BookingType } from "@/lib/types";
import { hasExaKey } from "./provider-config";

export type ConsumerSearchKind = BookingType | "trip" | "review";

export interface ConsumerSearchInput {
  query: string;
  kind: ConsumerSearchKind;
  userLocation?: string;
  numResults?: number;
}

export interface ConsumerSearchResult {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  score?: number;
  highlights: string[];
  summary?: string;
}

export interface ConsumerSearchBundle {
  provider: "exa" | "fallback";
  status: "live" | "missing_exa_key" | "provider_error";
  query: string;
  results: ConsumerSearchResult[];
  requestId?: string;
  error?: string;
}

function normalizedLocation(value?: string) {
  const clean = value?.trim().toUpperCase();
  return clean && /^[A-Z]{2}$/.test(clean) ? clean : undefined;
}

function fallbackResults(input: ConsumerSearchInput, status: ConsumerSearchBundle["status"], error?: string): ConsumerSearchBundle {
  return {
    provider: "fallback",
    status,
    query: input.query,
    error,
    results: [
      {
        title: "Offline travel research fallback",
        url: "kira://offline/consumer-search",
        highlights: [
          "Live Exa search is unavailable, so Kira generated conservative quote scaffolding from local policy.",
          "No supplier action, reservation, payment, cancellation, or card charge was attempted.",
        ],
        summary: "Set EXA_API_KEY to enable live consumer search for fares, policies, and review sources.",
      },
    ],
  };
}

export async function searchConsumerSources(input: ConsumerSearchInput): Promise<ConsumerSearchBundle> {
  const query = input.query.trim();
  if (!query) return fallbackResults({ ...input, query: "consumer travel research" }, "provider_error", "invalid_query");
  if (!hasExaKey()) return fallbackResults({ ...input, query }, "missing_exa_key");

  try {
    const exa = new Exa(process.env.EXA_API_KEY);
    const response = await exa.search(query, {
      type: "auto",
      numResults: Math.min(Math.max(input.numResults ?? 6, 1), 10),
      userLocation: normalizedLocation(input.userLocation),
      moderation: true,
      contents: {
        highlights: {
          query,
          maxCharacters: input.kind === "review" ? 600 : 420,
        },
        summary: {
          query: input.kind === "review"
            ? "Summarize review sentiment, recurring complaints, hidden fees, refund friction, baggage or service issues."
            : "Summarize price, schedule, policy, baggage, change terms, cancellation, and booking caveats.",
        },
      },
    });

    return {
      provider: "exa",
      status: "live",
      query,
      requestId: response.requestId,
      results: response.results.map((item) => ({
        title: item.title ?? item.url ?? "Untitled result",
        url: item.url,
        publishedDate: item.publishedDate ?? undefined,
        author: item.author ?? undefined,
        score: typeof item.score === "number" ? item.score : undefined,
        highlights: Array.isArray(item.highlights) ? item.highlights.filter((value): value is string => typeof value === "string") : [],
        summary: typeof item.summary === "string" ? item.summary : undefined,
      })),
    };
  } catch (error) {
    console.warn("Exa search failed", error);
    return fallbackResults({ ...input, query }, "provider_error", "provider_unavailable");
  }
}
