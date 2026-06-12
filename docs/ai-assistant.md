# Kira AI Bot

The Kira AI bot is a global in-app assistant for request understanding,
navigation, workflow explanation, and policy-boundary checks. It is deliberately
grounded in local product knowledge before it answers.

## Architecture

- `components/assistant-client.tsx` renders the floating assistant, prompt input,
  browser voice controls, live Realtime voice controls, answer panel,
  understood-request summary, confidence, next-item recommendation card, route
  suggestion, source chips, agent trace, and visible knowledge-base cards.
- `app/api/assistant` exposes:
  - `GET` for the local knowledge base and workspace context.
  - `POST` for request understanding.
- `lib/backend/ai-assistant.ts` runs an OpenAI Agents SDK agent when
  provider credentials are valid. Without a working key/model, it uses
  deterministic local matching so the UI remains useful offline.
- `lib/backend/kira-knowledge.ts` is the local knowledge base for routes,
  workflows, data surfaces, settings, AI surfaces, safety policy, and the
  ranked live workspace queue.
- Assistant routes use the same same-origin, payload-shape, and rate-limit guard
  as other provider-backed research routes.

## Next-Item Behavior

Questions such as "what should I do next?" are intentionally hard-coded to live
workspace state. After either the OpenAI agent or local fallback produces an
answer, Kira checks the current queue and overrides the answer with one concrete
item when available:

- Open approvals from `state.approvals`.
- Receipts or invoices with `status: "needs_review"`.

The response includes `output.nextItem`, a deep link to the exact card or row,
and the reason Kira picked it. If the queue is empty, Kira returns
`nextItem: null`, keeps the action read-only / tier 1, and links to the Daily
Briefing for confirmation.

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
   - Server and browser realtime connections use the shared hard-coded OpenAI
     base URL.
   - The server keeps the long-lived `OPENAI_API_KEY`; only the short-lived
     client secret is returned to the browser.
   - If the key, project, or model is invalid, the route returns
     `REALTIME_SESSION_FAILED` and the browser dictation path remains available.

## Knowledge Base Contract

Every answer should expose:

- `understoodRequest`
- `intent`
- `answer`
- `nextItem`
- `routeSuggestion`
- `actionClass`
- `approvalTier`
- `confidence`
- `sources`
- `trace`
- `followUps`

The workspace context returned by `GET /api/assistant` and included during
`POST /api/assistant` contains `counts`, `providers`, `nextItems`, and
`recommendedNextItem`. Next items have this shape:

```ts
{
  id: string;
  kind: "approval" | "receipt_review";
  label: string;
  href: string;
  actionClass: "read-only" | "suggestion" | "notification" | "human-approved" | "prohibited";
  approvalTier: 1 | 2 | 3 | 4;
  reason: string;
  detail: string;
  amount?: string;
}
```

The bot may recommend routes and explain actions, but it must not claim it can
move money, book suppliers, submit regulator data, issue cards, execute FX, or
place trades directly.

## Safety Boundary

The assistant inherits Kira's main rule: orchestrate and record, never settle.
Tier-3 actions require explicit approval, tier-4 actions require mandatory human
review, and prohibited regulated actions are refused or redirected to a licensed
partner/approval path.
