# Kira Local Backend API

Kira runs as an offline-first Next.js backend. The API is local, deterministic,
and file-backed for development. It persists mutable demo state to
`.kira-data/state.json`, which is ignored by git.

## Principles

- Kira orchestrates and records; it never holds, moves, settles, stores customer
  money, issues cards, executes FX, or places trades.
- Imported transactions are read-only. `RecordEntry` is accounting evidence, not
  a money ledger.
- Tier-3 actions require explicit approval. Tier-4 actions require mandatory
  human review and a second confirmation when approved.
- E-invoice submission is approval-gated and stores UUID / validation response
  evidence.
- All meaningful mutations append to the hash-chained audit stream.
- No full PANs, API keys, or secrets are stored in app state. OpenAI/Exa keys are
  read from environment variables only.

## Core Routes

| Route | Method | Purpose |
|---|---:|---|
| `/api/health` | `GET` | Backend status, persistence mode, entity counts. |
| `/api/ai/status` | `GET` | OpenAI/Exa provider configuration status. |
| `/api/assistant` | `GET` | Kira AI bot knowledge base and workspace context, including counts, providers, `nextItems`, and `recommendedNextItem`. |
| `/api/assistant` | `POST` | Guarded Agent SDK request understanding over the local Kira knowledge base; falls back locally without working OpenAI access. "What next?" requests are post-processed against live workspace state. |
| `/api/assistant/voice-session` | `POST` | Guarded ephemeral OpenAI Realtime client-secret minting for browser live voice when OpenAI credentials are valid. |
| `/api/session` | `GET` | Current user, org, preferences, nav badges. |
| `/api/reference` | `GET` | Accounts, tax codes, cost centres, country configs, FX rates. |
| `/api/connectors` | `GET` | Connector catalogue and local statuses. |
| `/api/connectors/:name/connect` | `POST` | Simulate connector connection without storing secrets. |
| `/api/users` | `GET` | Team users and roles. |
| `/api/summary` | `GET` | Backend stats plus latest deterministic briefing. |
| `/api/erp-foundation` | `GET` | Canonical ERP MVP coverage map: modules, data spine, permissioned action contracts, grounded answers, and audit coverage. |
| `/api/briefing/latest?phase=1` | `GET` | Latest briefing run. |
| `/api/briefing/runs` | `POST` | Run a deterministic briefing pass. |
| `/api/agents/roster` | `GET` | Agent autonomy boundaries. |
| `/api/audit` | `GET` | Hash-chained audit entries; optional `targetId`. |

## Workflow Routes

| Route | Method | Purpose |
|---|---:|---|
| `/api/approvals?state=open` | `GET` | Approval queue. |
| `/api/approvals/:id/decision` | `POST` | `{ decision, confirm?, note? }`; approve, reject, or reopen. |
| `/api/capture` | `GET` | Receipt inbox and stats. |
| `/api/capture` | `POST` | Create a deterministic OCR extraction. |
| `/api/capture/:id/review` | `POST` | Review/update coding before posting. |
| `/api/capture/:id/post` | `POST` | Post reviewed receipt to record store. |
| `/api/transactions/import` | `POST` | Import masked read-only transaction rows. Rejects unmasked PAN-like refs. |
| `/api/matches/:id/confirm` | `POST` | Confirm a suggested transaction/receipt match. |
| `/api/einvoices/:id` | `PATCH` | Correct draft/queued/rejected e-invoice metadata. |
| `/api/einvoices/:id/submit-request` | `POST` | Create or return an approval for submission. |
| `/api/einvoices/:id/cancel` | `POST` | Cancel with reason; submitted/validated states require confirmation. |
| `/api/settings` | `GET` | Org, tax profile, preferences, connectors, team, residency. |
| `/api/settings/preferences` | `GET/PATCH` | Read/update automation preferences. |
| `/api/onboarding` | `POST` | Complete org provisioning. |
| `/api/vendors/enrichment-runs` | `POST` | Run offline vendor enrichment. |
| `/api/vendors/:id/risk` | `PATCH` | Update vendor risk level and notes. |
| `/api/forecast/runs` | `POST` | Run an informational forecast pass. |
| `/api/operating-functions/:id/workflows` | `POST` | Start an approval-gated operating workflow. |
| `/api/erp-close/bills/:id` | `GET/PATCH` | Read or update a Bill Record and blockers. |
| `/api/erp-close/bills/:id/approve` | `POST` | Approve a Bill Record for local ERP/LHDN export after `{ confirm: true }`. |
| `/api/erp-close/bills/:id/resolve-exception` | `POST` | Resolve a close-book exception with audit trail. |
| `/api/erp-close/export/evidence-pack` | `POST` | Create a local evidence-pack export reference. |
| `/api/erp-close/export/ready-bills` | `POST` | Export eligible bill records; blocked records stay blocked. |

## Read Models

| Route | Method | Purpose |
|---|---:|---|
| `/api/transactions` | `GET` | Transactions, matches, receipts, match stats. |
| `/api/receipts` | `GET` | Receipt inbox alias. |
| `/api/einvoices` | `GET` | E-invoices, country configs, status stats. |
| `/api/analytics` | `GET` | Spend aggregates and FX rates. |
| `/api/vendors` | `GET` | Vendor intelligence data. |
| `/api/forecast` | `GET` | Cashflow forecast buckets. |
| `/api/portfolio` | `GET` | Read-only portfolio snapshot and stats. |
| `/api/erp-close` | `GET` | Close-book records, clients, suppliers, workflow dashboard. |
| `/api/operating-functions` | `GET` | Operating-function benchmark/workflow metadata. |
| `/api/roadmap` | `GET` | Product phases, feature scope, action matrix, architecture, failures, sources. |

## Mutation Guarantees

- Every mutation returns structured JSON: `{ ok: true, data }` or
  `{ ok: false, error }`.
- Unsafe state transitions return `409`; malformed payloads return `400`;
  unknown IDs return `404`.
- Backend actions simulate orchestration only. Close-book bill approval, ERP/LHDN
  export, e-invoice submission, and operating workflows create records, approvals,
  audit evidence, or local export refs. They do not charge, settle, pay, submit to
  a live regulator, or touch external systems.

## Optional Live AI Providers

- `OPENAI_API_KEY` enables the Kira AI bot's Agent SDK request understanding and
  realtime voice-session route. The key must be valid for the selected models;
  otherwise assistant text falls back locally and realtime session creation returns
  `502 REALTIME_SESSION_FAILED`.
- `OPENAI_MODEL` overrides the model; default is `gpt-5.5`.
- OpenAI clients use the shared hard-coded base URL
  `https://api.openai.com/v1` for SDK, Agents SDK, and realtime flows.
- `OPENAI_REALTIME_MODEL` overrides the realtime model; default is
  `gpt-realtime-2`.
- `EXA_API_KEY` enables live Exa search for vendor enrichment and reviews.
- The assistant remains usable without OpenAI keys via local knowledge-base
  matching. Its concrete next-item recommendation is always local/state-derived
  and works whether the OpenAI agent succeeds or falls back. Browser voice
  input/readback uses SpeechRecognition and speechSynthesis as a chained voice
  path; live speech-to-speech uses the OpenAI Realtime Agents SDK in the browser
  after the ephemeral session route returns a client secret.
- Provider-backed routes are same-origin guarded and rate-limited by
  `KIRA_PROVIDER_RATE_LIMIT_PER_MINUTE`, `KIRA_PROVIDER_MAX_PAYLOAD_BYTES`,
  `KIRA_PROVIDER_MAX_STRING_LENGTH`, and
  `KIRA_PROVIDER_MAX_COLLECTION_ITEMS`.
## Assistant Request Shape

`POST /api/assistant` accepts:

```json
{
  "message": "What should I do next?",
  "mode": "text",
  "transcript": "optional voice transcript",
  "route": "/approvals"
}
```

`message` is required and capped at 1200 characters. `mode` is `text` or
`voice`. For "what should I do next?"-style prompts, `output.nextItem` is a
hard-coded selection from open approvals or receipts needing review:

```json
{
  "ok": true,
  "data": {
    "provider": "local-fallback",
    "model": null,
    "output": {
      "understoodRequest": "What should I do next?",
      "intent": "approval",
      "answer": "Look at Review out-of-policy spend — Starbucks RM64.80 (MYR 64.80). It is an open tier-4 approval with 76% confidence, so Kira is blocked until a human decides. Staff/competitor visit · exceeds RM50 meal policy",
      "nextItem": {
        "id": "apr_03",
        "kind": "approval",
        "label": "Review out-of-policy spend — Starbucks RM64.80",
        "href": "/approvals?item=apr_03#apr_03",
        "actionClass": "human-approved",
        "approvalTier": 4,
        "reason": "It is an open tier-4 approval with 76% confidence, so Kira is blocked until a human decides.",
        "detail": "Staff/competitor visit · exceeds RM50 meal policy",
        "amount": "MYR 64.80"
      }
    },
    "knowledgeBase": [],
    "workspace": {
      "counts": {},
      "nextItems": [],
      "recommendedNextItem": null,
      "providers": {}
    }
  }
}
```

When the queue is empty, `nextItem` is `null`, `routeSuggestion` points to `/`,
and the action remains read-only / tier 1. All API responses use the shared
wrapper:

```json
{ "ok": true, "data": {} }
```

or:

```json
{ "ok": false, "error": { "code": "REALTIME_SESSION_FAILED", "message": "..." } }
```

## Dev Utility

`POST /api/admin/reset` resets local state from `lib/data/seed.ts`.

Use only in local development.
