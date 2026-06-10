export const DEFAULT_OPENAI_MODEL = "gpt-5.5";

export function openaiModel() {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

export function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function hasExaKey() {
  return Boolean(process.env.EXA_API_KEY?.trim());
}

export function providerStatus() {
  const openaiConfigured = hasOpenAIKey();
  return {
    openai: {
      configured: openaiConfigured,
      model: openaiModel(),
      sdk: "openai + @openai/agents",
    },
    exa: {
      configured: hasExaKey(),
      sdk: "exa-js",
    },
    assistant: {
      configured: true,
      provider: openaiConfigured ? "openai-agents" : "local-fallback",
      textRoute: "/api/assistant",
      knowledgeBase: "local-kira-knowledge",
    },
    voice: {
      configured: openaiConfigured,
      mode: "browser speech + optional realtime client secret",
      realtimeModel: process.env.OPENAI_REALTIME_MODEL?.trim() || "gpt-realtime-2",
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
