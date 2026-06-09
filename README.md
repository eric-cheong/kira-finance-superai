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
multi-agent orchestration engine. It runs **fully offline** — the agent logic is
deterministic ("rule-based AI") so there are no API keys to set, with clean seams
where a real LLM slots in.

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts: `npm run build`, `npm start`, `npm run typecheck`.

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
| `/operating-functions` | Operating Functions — benchmark gaps, financial impact, workflow execution, approvals, and audit trails across AR, FP&A, sales, lead gen, service, onboarding, and ops |
| `/capture` | Capture / Inbox — OCR receipt capture + suggested coding |
| `/approvals` | Approvals queue — tier-3/4 human-in-the-loop sign-off |
| `/transactions` | Transactions & reconciliation — read-only matching |
| `/erp-close` | ERP Close — close-book workflow hub, supplier/bank reconciliation, export gates, and close audit trail |
| `/compliance` | E-invoicing console — MyInvois + Peppol/InvoiceNow |
| `/analytics` | Spend analytics — FX-normalised dashboards |
| `/portfolio` | Portfolio (Phase 2) — read-only, advice-separated |
| `/audit` | Audit & agents — reasoning + immutable hash-chained log |
| `/settings` | Settings — automation thresholds, connectors, RBAC |

**Data model** (`lib/types.ts`, `lib/data/`): the record store is a *system of
record-keeping, not a money ledger*. Seed data models "Kira Roasters Sdn Bhd," a
KL coffee roaster with a Singapore outlet (SST-registered, MyInvois Phase 2).

## Architecture

- **Next.js 14 (App Router) + TypeScript + Tailwind** — minimalist, consistent UI
  driven by design tokens in `app/globals.css` and `components/ui/`.
- **No database required** — `lib/data/store.ts` is a pure query layer over
  deterministic seed data; swap it for Postgres without touching the UI.
- **Orchestrate, never settle** — every feature is designed to stay above the
  regulated perimeter (Singapore PSA, Malaysia FSA/BNM).

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

- The agent layer is deterministic for reproducibility; `lib/agents/agents.ts`
  marks where real model calls (extraction, summarisation, ranking) would slot in.
  De-identify before any external LLM call — a hard rule in the spec.
- `next@14.2.18` carries a published security advisory; bump to the latest patched
  14.2.x before any non-local deployment.
