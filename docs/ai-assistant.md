# Kira AI Bot

The Kira AI bot is a global in-app assistant for request understanding,
navigation, workflow explanation, and policy-boundary checks. It is deliberately
grounded in local product knowledge before it answers.

## Architecture

- `components/assistant-client.tsx` renders the floating assistant, prompt input,
  browser voice controls, live Realtime voice controls, answer panel,
  understood-request summary, confidence, route suggestion, source chips, agent
  trace, and visible knowledge-base cards.
- `app/api/assistant` exposes:
  - `GET` for the local knowledge base and workspace context.
  - `POST` for request understanding.
- `lib/backend/ai-assistant.ts` runs an OpenAI Agents SDK agent when
  provider credentials are valid. Without a working key/model, it uses
  deterministic local matching so the UI remains useful offline.
- `lib/backend/kira-knowledge.ts` is the local knowledge base for routes,
  workflows, data surfaces, settings, AI surfaces, and safety policy.
- Assistant routes use the same same-origin, payload-shape, and rate-limit guard
  as other provider-backed research routes.

## Voice Mode

Kira supports two voice layers:

1. Browser voice mode in the assistant UI:
   - Speech capture uses `SpeechRecognition` / `webkitSpeechRecognition` when the
     browser supports it.
   - Read-aloud uses `speechSynthesis`.
   - Captured transcripts are sent to `/api/assistant` with `mode: "voice"` so
     the same request-understanding agent and policy checks apply.
2. Realtime voice session preparation:
   - `POST /api/assistant/voice-session` creates an ephemeral OpenAI Realtime
     client secret using `client.realtime.clientSecrets.create`.
   - The browser creates a `RealtimeAgent` / `RealtimeSession`, attaches a
     read-only `query_kira_knowledge` tool, and connects with the ephemeral key.
   - Default realtime model: `gpt-realtime-2`.
   - Override with `OPENAI_REALTIME_MODEL`.
   - The server keeps the long-lived `OPENAI_API_KEY`; only the short-lived
     client secret is returned to the browser.
   - If the key, project, or model is invalid, the route returns
     `REALTIME_SESSION_FAILED` and the browser dictation path remains available.

## Knowledge Base Contract

Every answer should expose:

- `understoodRequest`
- `intent`
- `answer`
- `routeSuggestion`
- `actionClass`
- `approvalTier`
- `confidence`
- `sources`
- `trace`

The bot may recommend routes and explain actions, but it must not claim it can
move money, book suppliers, submit regulator data, issue cards, execute FX, or
place trades directly.

## Safety Boundary

The assistant inherits Kira's main rule: orchestrate and record, never settle.
Tier-3 actions require explicit approval, tier-4 actions require mandatory human
review, and prohibited regulated actions are refused or redirected to a licensed
partner/approval path.
