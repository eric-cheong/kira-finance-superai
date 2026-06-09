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
- No full PANs, API keys, or secrets are required or stored.

## Core Routes

| Route | Method | Purpose |
|---|---:|---|
| `/api/health` | `GET` | Backend status, persistence mode, entity counts. |
| `/api/session` | `GET` | Current user, org, preferences, nav badges. |
| `/api/reference` | `GET` | Accounts, tax codes, cost centres, country configs, FX rates. |
| `/api/connectors` | `GET` | Connector catalogue and local statuses. |
| `/api/connectors/:name/connect` | `POST` | Simulate connector connection without storing secrets. |
| `/api/users` | `GET` | Team users and roles. |
| `/api/summary` | `GET` | Backend stats plus latest deterministic briefing. |
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
| `/api/bookings` | `GET` | Quotes and booking history. |
| `/api/booking-quotes` | `POST` | Generate offline quote options for approval. |
| `/api/bookings/:quoteId/decision` | `POST` | `{ decision, selectedIndex?, confirm? }`; approve or reject a quote. |
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
- Backend actions simulate orchestration only. Booking approval, ERP/LHDN export,
  e-invoice submission, and operating workflows create records, approvals, audit
  evidence, or local export refs. They do not charge, settle, pay, submit to a
  live regulator, or touch external systems.

## Dev Utility

`POST /api/admin/reset` resets local state from `lib/data/seed.ts`.

Use only in local development.
