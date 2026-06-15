# Kira · AI Close-Book Operator

Kira is an **agentic accounting platform for Malaysia + Singapore SMEs**. It
helps accountants close the books by capturing invoices, enforcing human review
on risky fields, reconciling bank evidence, preparing LHDN MyInvois / Peppol
submissions, exporting ERP-ready records, and preserving an audit trail.

For finance workflows, Kira **orchestrates and records — it never settles.** It
stays above the regulated financial perimeter: no holding, moving, or storing
customer money, no e-money or card issuing, and no placing trades.

This repository is a runnable Next.js MVP with realistic SG/MY SME seed data,
offline-first state in `.kira-data/`, a working multi-agent orchestration
engine, Mem0-powered close memory, and — for the **Agnes AI Hackathon @ SMU** —
the entire AI layer runs on **Agnes AI's omni-modal API**: text, vision, image,
and video, all from one OpenAI-compatible provider.

## Hackathon build

This build focuses on one judge-friendly workflow: **month-end ERP close**.
Kira shows why memory and agent infrastructure matter in a real accounting pain:
the same suppliers, exceptions, coding choices, and approvers repeat every
month.

**Close Memory, powered by Mem0:** Kira remembers how each client closes each
supplier: expense account, tax code, cost centre, LHDN classification, resolved
exceptions, and approval history. On the next close, the accountant clicks
**Recall context**, sees the remembered decisions with confidence scores, and
applies the suggested ERP mapping instead of re-keying the same fields.

**Powered by Agnes AI — one omni-modal provider runs the whole close.** Agnes is
OpenAI-compatible (`https://apihub.agnes-ai.com/v1`), so a single provider serves
every modality Kira needs. Each modality has a deterministic fallback so the MVP
is complete and demoable even when the key is missing.

| Agnes modality | Model | Kira use in this build |
|---|---|---|
| Text | `agnes-2.0-flash` | The agent brain — reasons over the close, classifies safety/approval tiers, recommends the next action. |
| Vision | `agnes-2.0-flash` | Real invoice OCR — reads an uploaded receipt image and extracts supplier, date, totals, tax, and line items. |
| Image | `agnes-image-2.0-flash` | Generates a branded month-end close report cover/infographic for the export pack. |
| Video | `agnes-video-v2.0` | Renders a short CFO close-briefing clip from the live close numbers. |

Mem0 remains the **Close Memory** layer (month-over-month supplier coding,
exception resolution, and approver history). See the omni-modal panel live on
`/erp-close` ("Powered by Agnes AI — Omni-modal"), and Agnes Vision OCR on
`/capture`.

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts: `npm run build`, `npm start`, `npm run typecheck`.

Seed Mem0 close memories before the Mem0 demo:

```bash
npm run seed:mem0
```

Core demo login:

```text
username: 123
password: 123
```

Providers in `.env.local`:

```bash
# Agnes AI — the omni-modal provider that powers the whole app.
# Get a free key (no top-up) at https://platform.agnes-ai.com
AGNES_API_KEY=sk-...
AGNES_BASE_URL=https://apihub.agnes-ai.com/v1   # optional (default)
AGNES_TEXT_MODEL=agnes-2.0-flash                # optional
AGNES_IMAGE_MODEL=agnes-image-2.0-flash         # optional
AGNES_VIDEO_MODEL=agnes-video-v2.0              # optional

# Mem0 — Close Memory (optional; local store fallback otherwise)
MEM0_API_KEY=...
MEM0_ORG_ID=...
MEM0_PROJECT_ID=...

# OpenAI — optional secondary fallback for the agent brain + realtime voice
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.5
OPENAI_REALTIME_MODEL=gpt-realtime-2
```

Do not commit `.env.local`. If the Agnes key is missing, Kira uses a deterministic
fallback for every modality and labels the result as **Fallback** in the UI.

## Two-minute demo path

1. Sign in at `/login` with `123` / `123`.
2. Go to `/capture`, click **Snap receipt**, and upload a real invoice photo —
   **Agnes Vision** (`agnes-2.0-flash`) reads it and extracts supplier, totals,
   tax, and line items. Review and post.
3. Go to `/audit` and show the hash-chained trail (note the `Agnes Vision OCR`
   actor on the extraction entry).
4. Go to `/transactions` and show read-only bank reconciliation evidence.
5. Go to `/compliance` and show the LHDN MyInvois queue plus approval-gated
   submission.
6. Go to `/erp-close`, select a supplier in **Close Memory**, click **Recall
   context**, then **Apply suggested coding** to fill the ERP mapping.
7. In **Powered by Agnes AI — Omni-modal**, run all four rows — Text reasoning,
   Vision OCR, Image close report, and Video CFO briefing — and call out the
   `Live` badges.
8. Export ready bills and end on the product line: one omni-modal provider
   (Agnes AI) powers the whole close, and month two closes faster because Kira
   remembers.

See [DEMO.md](DEMO.md) for the full runbook and reset commands.

## What's in here

**The multi-agent engine** (`lib/agents/`) runs one daily-briefing pass through
the loop **Observe → Analyze → Plan → Act → Verify → Summarize → Escalate**:

- **Orchestrator** (leader) → **User Preference** → **Budget/Spend** →
  **Compliance/Safety gate** → merge & rank → **Notification**, with a
  **Human Approval** tray for anything money-touching.
- Phase 2 intelligence agents (**Risk Monitoring · News Relevance · Market
  Research · Portfolio Analysis**) are capability-gated and only join the run
  when `runDailyBriefing({ maxPhase: 2 })` is requested.
- Every finding carries a **confidence score, a source, and a rationale**.
- Four **approval tiers**: (1) no approval · (2) soft · (3) explicit
  (money/e-invoice/investment) · (4) mandatory review (regulated/abnormal).
- A central policy classifier plus the Compliance gate enforce phase availability,
  info-vs-advice separation, disclaimers, low-confidence escalation, prohibited
  actions, and approval routing.

**The screens** (`app/`):

| Route | Screen |
|---|---|
| `/onboarding` | Onboarding wizard — org, tax, connectors, feeds, policy, team |
| `/` | Daily Briefing — runs the live agent orchestration |
| `/erp-foundation` | ERP Foundation — canonical MVP map across accounting, AR, AP, banking, reconciliation, approvals, workflows, reports, agents, and audit evidence |
| `/operating-functions` | Operating Functions — benchmark gaps, financial impact, workflow execution, approvals, and audit trails across AR, FP&A, sales, lead gen, service, onboarding, and ops |
| `/capture` | Capture / Inbox — OCR receipt capture + suggested coding |
| `/approvals` | Approvals queue — tier-3/4 human-in-the-loop sign-off |
| `/transactions` | Transactions & reconciliation — read-only matching |
| `/bookings` | Bookings — read-only trip research, quote comparison, and approval-gated booking records |
| `/erp-close` | ERP Close — close-book workflow hub, supplier/bank reconciliation, export gates, and close audit trail |
| `/compliance` | E-invoicing console — MyInvois + Peppol/InvoiceNow |
| `/analytics` | Spend analytics — FX-normalised dashboards |
| `/vendors` | Vendor intelligence — enrichment runs, risk notes, and supplier review metadata |
| `/forecast` | Cashflow forecast — informational runway buckets and pending approval effects |
| `/portfolio` | Portfolio (Phase 2) — read-only, advice-separated |
| `/audit` | Audit & agents — decision traces + immutable hash-chained log |
| `/settings` | Settings — automation thresholds, connectors, RBAC |
| `/roadmap` | Roadmap — phase boundaries, action matrix, architecture choices, and failure handling |

The floating **Kira AI bot** is available globally. It uses the OpenAI Agents
SDK when a valid `OPENAI_API_KEY` and model are available, falls back to local
request understanding when provider calls fail, and exposes a visible
knowledge-base panel covering workflows, policy boundaries, data surfaces, AI
traces, and settings. Voice mode has two layers: browser dictation/readback for
the approval-friendly chained path, plus an OpenAI Realtime Agents SDK live
voice session when `/api/assistant/voice-session` can mint an ephemeral client
secret.

**ERP foundation coverage** (`/erp-foundation`) is the canonical MVP boundary:
Kira has a structured finance control plane for source documents, record
entries, e-invoices, AP close, read-only banking, reconciliation, approvals,
workflows, reports, agents, and audit evidence. It proves AI can explain,
recommend, and execute permissioned finance operations safely. A full
double-entry GL, AR aging/cash application, statutory financial statements, and
multi-entity consolidation remain Phase 3.

**Data model** (`lib/types.ts`, `lib/data/`): the record store is a *system of
record-keeping, not a money ledger*. Seed data models "Kira Roasters Sdn Bhd," a
KL coffee roaster with a Singapore outlet (SST-registered, MyInvois Phase 2).

## Architecture

- **Next.js 14 (App Router) + TypeScript + Tailwind** — minimalist, consistent UI
  driven by design tokens in `app/globals.css` and `components/ui/`.
- **Local backend included** — `app/api/**` exposes the product workflows over
  HTTP, backed by a deterministic runtime state store seeded from
  `lib/data/seed.ts`. Local mutations persist to `.kira-data/state.json`.
- **AI Gateway + OpenAI + Exa provider layer** —
  `lib/backend/vercel-ai-consumer-agents.ts` uses the Vercel AI SDK + AI
  Gateway as the primary booking-research path, defaulting to
  `alibaba/qwen3.7-plus`. `lib/backend/openai-consumer-agents.ts` uses the
  OpenAI Agents SDK for fallback read-only trip research and direct OpenAI
  Responses calls for review synthesis through the shared OpenAI base URL.
  `lib/backend/consumer-search.ts` uses Exa when `EXA_API_KEY` is present and
  falls back cleanly when it is not.
  `lib/backend/ai-assistant.ts` adds the in-app request-understanding agent,
  grounded by `lib/backend/kira-knowledge.ts`, plus guarded realtime voice
  session creation.
  Candidate UI/chart/motion libraries from the design notes are not installed
  until a screen actually imports them.
- **Orchestrate, never settle** — every feature is designed to stay above the
  regulated perimeter (Singapore PSA, Malaysia FSA/BNM).

## Local backend

The backend is offline-first and needs no API keys or external services for the
core demo. Optional OpenAI/Exa keys enable live read-only intelligence.

- `lib/backend/state.ts` owns the local runtime store and hash-chained audit
  materialization.
- `lib/backend/services.ts` owns validation and workflow rules for approvals,
  capture/posting, booking decisions, onboarding, preferences, and read models.
- `app/api/**/route.ts` contains thin Next route handlers over those services.
- `lib/data/store.ts` remains the server-page query facade so the UI can move to
  Postgres or SQLite later without rewriting screens.

See [docs/backend-api.md](docs/backend-api.md) for route contracts and safety
constraints.

See [docs/ai-assistant.md](docs/ai-assistant.md) for the Kira AI bot,
knowledge-base, Agent SDK, and voice-mode architecture.

See [docs/agentic-saas-design.md](docs/agentic-saas-design.md) for the durable
UI/product guidance added from the latest design note.

## Roadmap (per the build spec)

- **Phase 1** (this MVP): capture, matching, approvals, reconciliation, e-invoicing,
  spend analytics, read-only briefing. No money movement, no trading.
- **Phase 2**: portfolio/market/news/risk for personal finance; bill-pay
  orchestration + partner-issued cards via a licensed BaaS; open-banking feeds.
- **Phase 3**: full-stack APAC AI-native ERP — append-only customer-owned GL,
  multi-entity/book/currency, FX revaluation, consolidation, revenue automation,
  inventory, project accounting, continuous close, forecasting, enterprise
  compliance, payroll provider integrations, connector marketplace with revenue
  sharing, optional CRM and manufacturing modules, and multi-region residency
  enforcement. Settlement, FX execution, disbursement, cards, and e-money still
  stay on licensed partners.

## Notes

- The daily briefing agent layer remains deterministic for reproducibility;
  provider-backed trip/review intelligence lives behind explicit backend seams.
  De-identify before external model calls whenever financial/customer data is
  introduced.
- `next` is pinned to the patched `14.2.35` line.
