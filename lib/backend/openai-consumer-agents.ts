import { Agent, run, tool } from "@openai/agents";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { searchConsumerSources, type ConsumerSearchBundle } from "./consumer-search";
import { hasOpenAIKey, openaiModel } from "./provider-config";

const bookingTypeSchema = z.enum(["flight", "hotel", "rail", "car", "product"]);
const currencySchema = z.enum(["MYR", "SGD", "USD"]);

export const tripResearchInputSchema = z.object({
  type: bookingTypeSchema.default("flight"),
  description: z.string().min(2),
  budgetMinor: z.number().int().positive().default(52000),
  currency: currencySchema.default("MYR"),
  requestedBy: z.string().optional(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  departDate: z.string().optional(),
  returnDate: z.string().optional(),
  travellers: z.number().int().min(1).max(9).default(1),
  userLocation: z.string().optional(),
});

export type TripResearchInput = z.infer<typeof tripResearchInputSchema>;

const quoteOptionSchema = z.object({
  label: z.string().min(2),
  supplier: z.string().min(2),
  amountMinor: z.number().int().positive(),
  currency: currencySchema,
  breakdown: z.array(z.object({
    item: z.string().min(2),
    amountMinor: z.number().int().nonnegative(),
  })).min(1).max(6),
  notes: z.array(z.string().min(2)).min(1).max(8),
  sourceUrls: z.array(z.string()).max(8),
  confidence: z.number().min(0).max(100),
});

const reviewThemeSchema = z.object({
  theme: z.string().min(2),
  sentiment: z.enum(["positive", "mixed", "negative", "unknown"]),
  evidence: z.array(z.string()).max(5),
  citations: z.array(z.string()).max(8),
});

export const tripResearchOutputSchema = z.object({
  summary: z.string().min(2),
  options: z.array(quoteOptionSchema).min(1).max(4),
  reviewThemes: z.array(reviewThemeSchema).max(8),
  researchSources: z.array(z.string()).max(16),
  riskNotes: z.array(z.string()).max(10),
  approvalRequired: z.boolean(),
  noSupplierActionTaken: z.boolean(),
});

export type TripResearchOutput = z.infer<typeof tripResearchOutputSchema>;

const reviewSummarySchema = z.object({
  subject: z.string().min(2),
  summary: z.string().min(2),
  sentiment: z.enum(["positive", "mixed", "negative", "unknown"]),
  themes: z.array(reviewThemeSchema).max(8),
  caveats: z.array(z.string()).max(8),
  sources: z.array(z.string()).max(16),
});

export type ReviewSummary = z.infer<typeof reviewSummarySchema>;

const searchConsumerWeb = tool({
  name: "search_consumer_web",
  description:
    "Read-only Exa search for consumer travel/procurement sources, flight or hotel options, booking policies, and reviews. This tool never books, reserves, charges, cancels, or contacts suppliers.",
  parameters: z.object({
    query: z.string().min(4),
    kind: z.enum(["flight", "hotel", "rail", "car", "product", "trip", "review"]),
    userLocation: z.string().nullable(),
    numResults: z.number().int().min(1).max(10),
  }),
  async execute({ query, kind, userLocation, numResults }) {
    const result = await searchConsumerSources({
      query,
      kind,
      userLocation: userLocation ?? undefined,
      numResults,
    });
    return JSON.stringify(result);
  },
});

function inputPrompt(input: TripResearchInput) {
  return JSON.stringify({
    task: "Research consumer travel/procurement options and produce quote options for human approval.",
    constraints: [
      "Return only research and quote candidates.",
      "Do not place a booking, contact a supplier, reserve inventory, charge a card, cancel anything, or move money.",
      "Prefer sources that reveal fares, baggage/change/cancellation policy, hidden fees, and consumer reviews.",
      "If live Exa search is unavailable, state that clearly and produce conservative fallback options.",
    ],
    request: input,
  });
}

function tripResearchAgent() {
  return new Agent({
    name: "Kira Consumer Trip Research Agent",
    model: openaiModel(),
    instructions:
      "You research travel and procurement choices for Kira. You are read-only. You may search public web/review sources, compare options, and draft quote records. You must never book, reserve, charge, cancel, contact a supplier, move money, or imply a booking has happened. Every final output must set approvalRequired and noSupplierActionTaken to true.",
    tools: [searchConsumerWeb],
    outputType: tripResearchOutputSchema,
  });
}

export async function researchTripWithOpenAIAgents(input: TripResearchInput) {
  if (!hasOpenAIKey()) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const result = await run(tripResearchAgent(), inputPrompt(input), { maxTurns: 6 });
  const parsed = tripResearchOutputSchema.parse(result.finalOutput);
  return {
    provider: "openai-agents" as const,
    model: openaiModel(),
    output: {
      ...parsed,
      approvalRequired: true,
      noSupplierActionTaken: true,
    },
    interruptions: result.interruptions?.length ?? 0,
  };
}

function fallbackReviewSummary(subject: string, bundle: ConsumerSearchBundle, reason: string): ReviewSummary {
  return {
    subject,
    summary: "Review synthesis is unavailable; inspect the returned sources directly.",
    sentiment: "unknown",
    themes: [],
    caveats: [reason],
    sources: bundle.results.map((item) => item.url).filter(Boolean).slice(0, 12),
  };
}

export async function summarizeReviewsWithOpenAI(subject: string, bundle: ConsumerSearchBundle): Promise<ReviewSummary> {
  if (!hasOpenAIKey()) return fallbackReviewSummary(subject, bundle, "missing_openai_key");

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.parse({
    model: openaiModel(),
    input: [
      {
        role: "system",
        content:
          "Summarize consumer review evidence for finance users. Be concise, cite URLs, separate sentiment from caveats, and do not invent facts.",
      },
      {
        role: "user",
        content: JSON.stringify({
          subject,
          searchStatus: bundle.status,
          results: bundle.results.slice(0, 8),
          outputFormat: "Return a structured review_summary object.",
        }),
      },
    ],
    text: { format: zodTextFormat(reviewSummarySchema, "review_summary") },
  });

  return response.output_parsed
    ? reviewSummarySchema.parse(response.output_parsed)
    : fallbackReviewSummary(subject, bundle, "provider_unavailable");
}
