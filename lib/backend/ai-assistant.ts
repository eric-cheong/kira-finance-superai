import { Agent, run, tool } from "@openai/agents";
import { createHash } from "crypto";
import { z } from "zod";
import { ApiError } from "./http";
import { assistantKnowledge, assistantNextItems, assistantWorkspaceContext, KIRA_KNOWLEDGE_BASE, type AssistantNextItem } from "./kira-knowledge";
import {
  configureOpenAIAgentsProvider,
  createOpenAIClient,
  hasOpenAIProvider,
  openaiModel,
  openaiProviderReadiness,
  openaiRealtimeConnectionURL,
  openaiRealtimeModel,
  providerStatus,
} from "./provider-config";

export const assistantRequestSchema = z.object({
  message: z.string().min(1).max(1200),
  mode: z.enum(["text", "voice"]).default("text"),
  transcript: z.string().optional(),
  route: z.string().optional(),
});

const assistantIntentSchema = z.enum([
  "navigate",
  "explain",
  "research",
  "approval",
  "reconcile",
  "settings",
  "unknown",
]);

const assistantOutputSchema = z.object({
  understoodRequest: z.string(),
  intent: assistantIntentSchema,
  answer: z.string(),
  nextItem: z.object({
    id: z.string(),
    kind: z.enum(["approval", "receipt_review", "booking_quote"]),
    label: z.string(),
    href: z.string(),
    actionClass: z.enum(["read-only", "suggestion", "notification", "human-approved", "prohibited"]),
    approvalTier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    reason: z.string(),
    detail: z.string(),
    amount: z.string().optional(),
  }).nullable().default(null),
  routeSuggestion: z.object({
    label: z.string(),
    href: z.string(),
    reason: z.string(),
  }).nullable(),
  actionClass: z.enum(["read-only", "suggestion", "notification", "human-approved", "prohibited"]),
  approvalTier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  confidence: z.number().min(0).max(100),
  sources: z.array(z.object({
    title: z.string(),
    route: z.string(),
  })).max(6),
  trace: z.array(z.string()).max(8),
  followUps: z.array(z.string()).max(4),
});

export type AssistantOutput = z.infer<typeof assistantOutputSchema>;
export type AssistantRequest = z.infer<typeof assistantRequestSchema>;

const ASSISTANT_PROVIDER_TIMEOUT_MS = Number(process.env.KIRA_ASSISTANT_PROVIDER_TIMEOUT_MS ?? 12_000);

const queryKiraKnowledge = tool({
  name: "query_kira_knowledge",
  description: "Search Kira's local product knowledge base. Use this before answering product, route, policy, or workflow questions.",
  parameters: z.object({
    query: z.string().min(1),
    limit: z.number().int().min(1).max(8).default(5),
  }),
  async execute({ query, limit }) {
    return JSON.stringify(assistantKnowledge(query, limit));
  },
});

const getWorkspaceContext = tool({
  name: "get_workspace_context",
  description: "Read current local workspace context: org, provider status, counts, approvals, and safety boundaries. Read-only.",
  parameters: z.object({}),
  async execute() {
    return JSON.stringify(assistantWorkspaceContext());
  },
});

function assistantAgent() {
  return new Agent({
    name: "Kira Request Understanding Agent",
    model: openaiModel(),
    instructions: [
      "You are Kira's in-app AI assistant for an APAC SME finance workspace.",
      "First infer what the user is asking for. Ground every answer in the Kira knowledge base or current workspace context.",
      "When the user asks what to do next, pick exactly one item from workspace.recommendedNextItem or workspace.nextItems; name the concrete approval, receipt, or booking quote; include why it was picked; and deep-link to that exact item.",
      "Recommend the most relevant route when useful.",
      "Never claim Kira moved money, paid, submitted to a regulator, booked travel, contacted a supplier, issued cards, stored PAN, executed FX, or placed trades.",
      "If the request is consequential, classify it as human-approved or prohibited and explain the approval boundary.",
      "Return concise structured output only.",
    ].join(" "),
    tools: [queryKiraKnowledge, getWorkspaceContext],
    outputType: assistantOutputSchema,
  });
}

function classifyLocal(message: string): Pick<AssistantOutput, "intent" | "actionClass" | "approvalTier"> {
  const clean = message.toLowerCase();
  if (/(pay|transfer|settle|move money|card|trade|fx execute|book now|reserve)/.test(clean)) {
    return { intent: "approval", actionClass: "prohibited", approvalTier: 4 };
  }
  if (/(approve|submit|export|post|confirm|decision)/.test(clean)) {
    return { intent: "approval", actionClass: "human-approved", approvalTier: 3 };
  }
  if (/(transaction|match|reconcile|duplicate)/.test(clean)) {
    return { intent: "reconcile", actionClass: "suggestion", approvalTier: 2 };
  }
  if (/(setting|connector|team|role|threshold|automation)/.test(clean)) {
    return { intent: "settings", actionClass: "notification", approvalTier: 2 };
  }
  if (/(flight|hotel|booking|trip|review|vendor|supplier|search)/.test(clean)) {
    return { intent: "research", actionClass: "suggestion", approvalTier: 2 };
  }
  if (/(where|open|go to|navigate|page|screen)/.test(clean)) {
    return { intent: "navigate", actionClass: "read-only", approvalTier: 1 };
  }
  return { intent: "explain", actionClass: "read-only", approvalTier: 1 };
}

function isNextItemRequest(message: string) {
  return /\b(what|where|which).*\b(next|now)\b|\b(next item|next task|do next|look at next|inspect next|review next)\b/i.test(message);
}

function nextItemSource(nextItem: AssistantNextItem) {
  if (nextItem.kind === "approval") return { title: "Approvals", route: "/approvals" };
  if (nextItem.kind === "receipt_review") return { title: "Capture Inbox", route: "/capture" };
  return { title: "Bookings Research", route: "/bookings" };
}

function nextItemAnswer(nextItem: AssistantNextItem) {
  const amount = nextItem.amount ? ` (${nextItem.amount})` : "";
  return `Look at ${nextItem.label}${amount}. ${nextItem.reason} ${nextItem.detail}`;
}

function applyNextItemRecommendation(output: AssistantOutput, request: AssistantRequest): AssistantOutput {
  if (!isNextItemRequest(`${request.message} ${request.transcript ?? ""}`)) return output;
  const nextItem = assistantNextItems(1)[0];
  if (!nextItem) {
    return {
      ...output,
      answer: "There is no open approval, receipt review, or booking quote waiting right now. The workspace queue is clear.",
      nextItem: null,
      routeSuggestion: {
        label: "Daily Briefing",
        href: "/",
        reason: "The briefing is the fastest place to verify there are no queued items.",
      },
      actionClass: "read-only",
      approvalTier: 1,
      confidence: Math.max(output.confidence, 92),
      trace: [...output.trace, "Checked live workspace next-item queue"].slice(0, 8),
    };
  }
  const source = nextItemSource(nextItem);
  return {
    ...output,
    understoodRequest: request.transcript || request.message,
    intent: nextItem.kind === "approval" ? "approval" : nextItem.kind === "receipt_review" ? "reconcile" : "research",
    answer: nextItemAnswer(nextItem),
    nextItem: {
      id: nextItem.id,
      kind: nextItem.kind,
      label: nextItem.label,
      href: nextItem.href,
      actionClass: nextItem.actionClass,
      approvalTier: nextItem.approvalTier,
      reason: nextItem.reason,
      detail: nextItem.detail,
      amount: nextItem.amount,
    },
    routeSuggestion: {
      label: `Open ${nextItem.label}`,
      href: nextItem.href,
      reason: nextItem.reason,
    },
    actionClass: nextItem.actionClass,
    approvalTier: nextItem.approvalTier,
    confidence: Math.max(output.confidence, 94),
    sources: [source, ...output.sources.filter((item) => item.route !== source.route)].slice(0, 6),
    trace: [...output.trace.filter((step) => step !== "Selected live next item"), "Selected live next item"].slice(0, 8),
    followUps: ["Open the linked item", "Show the other queued items", "Explain the approval boundary"],
  };
}

function localAssistantAnswer(request: AssistantRequest, reason: string): AssistantOutput {
  const entries = assistantKnowledge(`${request.message} ${request.transcript ?? ""}`, 4);
  const primary = entries[0] ?? KIRA_KNOWLEDGE_BASE[0];
  const classification = classifyLocal(request.message);
  const boundary = classification.actionClass === "prohibited"
    ? "I cannot do that directly because Kira orchestrates and records but never moves money, books suppliers, issues cards, executes FX, or places trades."
    : classification.actionClass === "human-approved"
      ? "That path needs explicit human approval before any state-changing record is created."
      : "This is safe as read-only guidance or navigation.";

  const output: AssistantOutput = {
    understoodRequest: request.transcript || request.message,
    intent: classification.intent,
    answer: `${boundary} The closest Kira area is ${primary.title}: ${primary.summary}`,
    nextItem: null,
    routeSuggestion: {
      label: primary.title,
      href: primary.route,
      reason: primary.facts[0] ?? "Relevant Kira knowledge base entry.",
    },
    actionClass: classification.actionClass,
    approvalTier: classification.approvalTier,
    confidence: reason === "missing_openai_key" ? 68 : 58,
    sources: entries.map((entry) => ({ title: entry.title, route: entry.route })),
    trace: [
      `Local fallback: ${reason}`,
      `Matched ${entries.length} knowledge entries`,
      `Classified as ${classification.intent}`,
    ],
    followUps: ["Open the suggested route", "Ask for the evidence behind this", "Ask what action is safely allowed next"],
  };
  return applyNextItemRecommendation(output, request);
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(label)), ms);
    }),
  ]);
}

function assistantProviderFailureCode(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/(401|authentication|api key|invalid_api_key|unauthorized)/i.test(message)) {
    return "openai_auth_failed";
  }
  if (/(rate limit|429)/i.test(message)) {
    return "openai_rate_limited";
  }
  if (/(timeout|timed out|aborted)/i.test(message)) {
    return "openai_timeout";
  }
  return "openai_provider_unavailable";
}

function safetyClassification(input: string) {
  const clean = input.toLowerCase();
  if (/(move money|transfer|settle|pay\b|book now|reserve|purchase|issue card|execute fx|place trade|submit .*regulator|submit .*lhdn|contact supplier)/.test(clean)) {
    return { actionClass: "prohibited" as const, approvalTier: 4 as const };
  }
  if (/(approve|submit|export|post|confirm|cancel|resolve exception)/.test(clean)) {
    return { actionClass: "human-approved" as const, approvalTier: 3 as const };
  }
  return null;
}

function enforceAssistantSafety(request: AssistantRequest, output: AssistantOutput): AssistantOutput {
  const safety = safetyClassification([
    request.message,
    request.transcript ?? "",
    output.understoodRequest,
    output.answer,
  ].join(" "));
  if (!safety) return output;

  const boundary = safety.actionClass === "prohibited"
    ? "I cannot do that directly because Kira orchestrates and records but never moves money, books suppliers, submits live regulator data, contacts suppliers, issues cards, executes FX, or places trades."
    : "That request needs explicit human approval before Kira creates or changes any consequential record.";
  const answer = output.answer.toLowerCase().includes("cannot do that directly") || output.answer.toLowerCase().includes("needs explicit human approval")
    ? output.answer
    : `${boundary} ${output.answer}`;

  return {
    ...output,
    intent: output.intent === "unknown" ? "approval" : output.intent,
    answer,
    actionClass: safety.actionClass,
    approvalTier: safety.approvalTier,
    trace: [...output.trace.filter((step) => step !== "Safety boundary enforced"), "Safety boundary enforced"].slice(0, 8),
  };
}

function normalizeAssistantOutput(output: AssistantOutput): AssistantOutput {
  const confidence = output.confidence <= 1
    ? Math.round(output.confidence * 100)
    : Math.round(output.confidence);
  return {
    ...output,
    nextItem: output.nextItem ?? null,
    confidence: Math.max(0, Math.min(100, confidence)),
  };
}

function realtimeKnowledgePrompt() {
  return KIRA_KNOWLEDGE_BASE.map((entry) => (
    `- ${entry.title} (${entry.route}): ${entry.summary} Facts: ${entry.facts.join(" ")}`
  )).join("\n");
}

function safetyIdentifier(request?: Request) {
  const client = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request?.headers.get("x-real-ip")
    || request?.headers.get("user-agent")
    || "local";
  return createHash("sha256").update(`kira:${client}`).digest("hex").slice(0, 64);
}

export async function runAssistant(requestInput: unknown) {
  const request = assistantRequestSchema.parse(requestInput);
  if (isNextItemRequest(`${request.message} ${request.transcript ?? ""}`)) {
    return {
      provider: "local-fallback" as const,
      model: null,
      output: localAssistantAnswer(request, "workspace_next_item"),
      knowledgeBase: assistantKnowledge(request.message, 6),
      workspace: assistantWorkspaceContext(),
    };
  }

  const openai = configureOpenAIAgentsProvider();
  if (!openai.configured) {
    return {
      provider: "local-fallback" as const,
      model: null,
      output: localAssistantAnswer(request, openai.fallbackReason ?? "openai_provider_unavailable"),
      knowledgeBase: assistantKnowledge(request.message, 6),
      workspace: assistantWorkspaceContext(),
    };
  }

  try {
    const result = await withTimeout(run(assistantAgent(), JSON.stringify({
      userRequest: request.message,
      transcript: request.transcript,
      mode: request.mode,
      currentRoute: request.route,
      availableKnowledge: KIRA_KNOWLEDGE_BASE.map(({ id, title, route, category, summary }) => ({ id, title, route, category, summary })),
      workspace: assistantWorkspaceContext(),
      requiredOutput: "assistantOutputSchema",
    }), { maxTurns: 5 }), ASSISTANT_PROVIDER_TIMEOUT_MS, "openai_timeout");
    const output = enforceAssistantSafety(request, applyNextItemRecommendation(normalizeAssistantOutput(assistantOutputSchema.parse(result.finalOutput)), request));
    return {
      provider: "openai-agents" as const,
      model: openaiModel(),
      output,
      knowledgeBase: assistantKnowledge(request.message, 6),
      workspace: assistantWorkspaceContext(),
      interruptions: result.interruptions?.length ?? 0,
    };
  } catch (error) {
    const reason = assistantProviderFailureCode(error);
    return {
      provider: "local-fallback" as const,
      model: openaiModel(),
      output: localAssistantAnswer(request, reason),
      knowledgeBase: assistantKnowledge(request.message, 6),
      workspace: assistantWorkspaceContext(),
    };
  }
}

export async function createAssistantRealtimeSession(request?: Request) {
  if (!hasOpenAIProvider()) {
    const readiness = openaiProviderReadiness();
    throw new ApiError(
      409,
      "OPENAI_NOT_CONFIGURED",
      readiness.fallbackReason === "missing_openai_key"
        ? "OPENAI_API_KEY is required for realtime voice sessions."
        : "OPENAI_BASE_URL must be a valid http(s) URL for realtime voice sessions.",
      { reason: readiness.fallbackReason },
    );
  }
  const client = createOpenAIClient({
    timeout: ASSISTANT_PROVIDER_TIMEOUT_MS,
    defaultHeaders: { "OpenAI-Safety-Identifier": safetyIdentifier(request) },
  });
  const realtimeModel = openaiRealtimeModel();
  try {
    const secret = await withTimeout(client.realtime.clientSecrets.create({
      expires_after: { anchor: "created_at", seconds: 600 },
      session: {
        type: "realtime",
        model: realtimeModel,
        output_modalities: ["audio"],
        instructions: [
          "You are Kira's voice assistant. Help the user understand and navigate the Kira finance workspace.",
          "Use concise spoken responses. Ask a clarifying question when the request is ambiguous.",
          "Ground answers in this local Kira knowledge base before recommending a route:",
          realtimeKnowledgePrompt(),
          "Never claim you can move money, book suppliers, issue cards, execute FX, place trades, or submit regulator data without approval.",
          "For consequential actions, route the user to the relevant approval screen.",
        ].join(" "),
        audio: {
          input: {
            transcription: { model: "gpt-4o-mini-transcribe", language: "en" },
            turn_detection: { type: "server_vad", silence_duration_ms: 650, prefix_padding_ms: 300 },
            noise_reduction: { type: "near_field" },
          },
          output: {
            voice: "marin",
            speed: 1,
          },
        },
        reasoning: { effort: "low" },
        tracing: {
          workflow_name: "Kira voice assistant",
          group_id: "kira-assistant",
          metadata: { surface: "web", boundary: "orchestrate-never-settle" },
        },
        max_output_tokens: 1200,
      },
    }), ASSISTANT_PROVIDER_TIMEOUT_MS, "openai_timeout");

    return {
      provider: providerStatus(),
      realtime: {
        model: realtimeModel,
        url: openaiRealtimeConnectionURL(),
        sessionId: secret.session.id,
        expiresAt: secret.expires_at,
        clientSecret: secret.value,
      },
    };
  } catch (error) {
    throw new ApiError(
      502,
      "REALTIME_SESSION_FAILED",
      "Realtime voice session could not be created. Check OPENAI_API_KEY and OPENAI_REALTIME_MODEL.",
      { reason: assistantProviderFailureCode(error) },
    );
  }
}
