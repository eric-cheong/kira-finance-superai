# Kira · AI Operating Intelligence

An **AI operating intelligence platform** for Malaysia + Singapore SMEs. Kira
benchmarks the workflows that decide cash, margin, growth, and customer
experience, then runs approval-gated workflows across existing systems. For
finance workflows, Kira **orchestrates and records — it never settles.** It sits
entirely above the regulated financial perimeter: no holding, moving, or storing
customer money, no e-money or card issuing, no placing trades. The license-free
wedge is native **GST/SST automation + e-invoicing compliance** (LHDN MyInvois +
Peppol/InvoiceNow) with an embedded **multi-agent intelligence layer**.

This repository is a runnable Next.js reference implementation of that product:
the screens, the data model, realistic SG/MY SME seed data, and a working
multi-agent orchestration engine. It is **offline-first** with optional live
OpenAI + Exa provider seams: without keys it stays deterministic, and with keys
it can run read-only OpenAI Agents / Exa consumer research for trip quotes and
reviews, and an in-app Kira AI bot can understand user requests against the
local knowledge base.

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts: `npm run build`, `npm start`, `npm run typecheck`.

Optional live providers:

```bash
AI_GATEWAY_API_KEY=...        # enables Vercel AI SDK / AI Gateway booking research
VERCEL_AI_MODEL=alibaba/qwen3.7-plus  # optional override
OPENAI_API_KEY=...      # enables OpenAI Responses + Agents SDK flows
OPENAI_MODEL=gpt-5.5   # optional override
EXA_API_KEY=...         # enables live Exa consumer search for trips/reviews
OPENAI_REALTIME_MODEL=gpt-realtime-2  # optional voice-session override
```

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
