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
  return {
    openai: {
      configured: hasOpenAIKey(),
      model: openaiModel(),
      sdk: "openai + @openai/agents",
    },
    exa: {
      configured: hasExaKey(),
      sdk: "exa-js",
    },
    bookingBoundary: {
      canResearch: true,
      canCreateQuoteRecords: true,
      canPlaceBooking: false,
      approvalRoute: "/api/bookings/:quoteId/decision",
    },
  };
}
