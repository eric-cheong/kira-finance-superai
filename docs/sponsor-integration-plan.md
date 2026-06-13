# Sponsored Close Intelligence

Kira's hackathon sponsor story is a single workflow: the ERP close screen uses sponsored providers to gather evidence, reason over blockers, validate exports, search video context, run heavy scans, and verify agent authority before close actions.

## Providers

| Sponsor | Kira use |
|---|---|
| Bright Data | Live supplier web evidence and regulatory/vendor research. |
| Kimi AI | Long-context reasoning over close blockers and audit history. |
| TokenRouter | Routed model calls and cache-aware model selection. |
| VideoDB | Searchable receiving, walkthrough, and approval video evidence. |
| Daytona | Isolated sandbox validation for ERP export packages. |
| Nosana | GPU-style duplicate, anomaly, and extraction workload scans. |
| Terminal 3 | Verifiable agent identity before approval-gated close actions. |

Every integration has a live-call seam and deterministic fallback. The fallback keeps the demo reliable, but judging should focus on runs that show `Live`.

## Environment Variables

```bash
BRIGHT_DATA_API_KEY=
BRIGHT_DATA_ENDPOINT=https://api.brightdata.com/request
BRIGHT_DATA_ZONE=your_web_unlocker_zone_name
BRIGHT_DATA_TARGET_URL=https://www.hasil.gov.my/en/e-invoice/

KIMI_API_KEY=
KIMI_BASE_URL=https://api.moonshot.ai/v1
KIMI_MODEL=kimi-k2.6

TOKENROUTER_API_KEY=
TOKENROUTER_BASE_URL=https://api.tokenrouter.ai/v1
TOKENROUTER_MODEL=openai/gpt-5.4-nano

VIDEODB_API_KEY=
VIDEODB_BASE_URL=https://api.videodb.io

DAYTONA_API_KEY=
DAYTONA_BASE_URL=https://app.daytona.io/api

NOSANA_API_KEY=
NOSANA_BASE_URL=https://api.nosana.io

TERMINAL3_API_KEY=
TERMINAL3_BASE_URL=https://api.terminal3.io
```

If a sponsor gives a different endpoint in their dashboard, use that value. Bright Data also needs an active Web Unlocker zone; set `BRIGHT_DATA_ZONE` to the exact zone name from the Bright Data dashboard. Do not commit `.env.local`.

## Demo Flow

1. Open `/erp-close`.
2. Use **Close Memory** first to show Mem0 recall and ERP mapping apply.
3. Use **Close Intelligence** next:
   - Run Bright Data for vendor web evidence.
   - Run Kimi AI for blocker explanation.
   - Run TokenRouter for model routing.
   - Run VideoDB for receiving evidence.
   - Run Daytona for ERP export validation.
   - Run Nosana for anomaly scanning.
   - Run Terminal 3 for agent identity proof.
4. Point out each provider badge: `Live` means a sponsor API path was used; `Fallback` means the local deterministic demo path protected the flow.

## Judge Line

Kira is not a chat wrapper. It is an accounting close command center where sponsored agent infrastructure gathers evidence, reasons over exceptions, validates export safety, searches video proof, runs heavy analysis, verifies agent identity, and remembers prior close decisions.
