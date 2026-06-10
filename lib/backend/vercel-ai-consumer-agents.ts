import { generateText, Output, stepCountIs, tool } from "ai";
import { z } from "zod";
import { searchConsumerSources } from "./consumer-search";
import { ensureAIGatewayEnv, vercelAiModel } from "./provider-config";
import { tripResearchOutputSchema, type TripResearchInput } from "./openai-consumer-agents";

const searchConsumerWeb = tool({
  description:
    "Read-only search for consumer travel/procurement sources, policies, quote options, and reviews. Never book, reserve, charge, cancel, or contact suppliers.",
  inputSchema: z.object({
    query: z.string().min(4),
    kind: z.enum(["flight", "hotel", "rail", "car", "product", "trip", "review"]),
    userLocation: z.string().nullable(),
    numResults: z.number().int().min(1).max(10),
  }),
  async execute({ query, kind, userLocation, numResults }) {
    return searchConsumerSources({
      query,
      kind,
      userLocation: userLocation ?? undefined,
      numResults,
    });
  },
});

function inputPrompt(input: TripResearchInput) {
  return JSON.stringify({
    task: "Research consumer travel/procurement options and produce quote candidates for human approval.",
    constraints: [
      "Return only research and quote candidates.",
      "Do not place a booking, contact a supplier, reserve inventory, charge a card, cancel anything, or move money.",
      "Prefer sources that reveal prices, baggage/change/cancellation policy, hidden fees, and consumer reviews.",
      "Use the search tool before finalizing when live or fallback consumer sources are useful.",
      "Every final output must set approvalRequired and noSupplierActionTaken to true.",
    ],
    request: input,
  });
}

export async function researchTripWithVercelAI(input: TripResearchInput) {
  if (!ensureAIGatewayEnv()) {
    throw new Error("AI_GATEWAY_API_KEY is not configured.");
  }

  const model = vercelAiModel();
  const result = await generateText({
    model,
    system: [
      "You are Kira's read-only booking research agent for APAC SME finance users.",
      "Compare options and produce quote records that a human can review.",
      "Never claim a supplier was contacted, a booking was placed, inventory was reserved, a card was charged, a cancellation happened, or money moved.",
      "Use concise, specific notes and cite sources when available.",
    ].join(" "),
    prompt: inputPrompt(input),
    tools: { searchConsumerWeb },
    stopWhen: stepCountIs(6),
    output: Output.object({
      name: "trip_research",
      description: "Read-only booking quote research output.",
      schema: tripResearchOutputSchema,
    }),
  });

  const parsed = tripResearchOutputSchema.parse(result.output);
  return {
    provider: "vercel-ai-sdk" as const,
    model,
    output: {
      ...parsed,
      approvalRequired: true,
      noSupplierActionTaken: true,
    },
    interruptions: 0,
    steps: result.steps.length,
  };
}
