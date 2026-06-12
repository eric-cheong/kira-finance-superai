# Kira — Live Demo Script

**One invoice captured live → its trail across workflows → bank-statement reconciliation → prepared submission to ERP + LHDN.**

Runs fully offline on seeded mock data. No API keys needed.

- **URL:** http://localhost:3000
- **Login:** username `123` / password `123`
- **Workspace:** Kira Roasters Sdn Bhd (Malaysia, SST-registered, MyInvois Phase 2)

> Two-invoice story: you **capture "Common Roots Roastery" live** (intake + human-in-the-loop), then pivot to the fully-traced seeded **Yning Coffee** invoice for reconciliation and the **Brew Lab** e-invoice for LHDN. This is intentional — the live capture has no matching bank line yet, the seeded ones are fully reconciled.

---

## Before you start (already done, but to re-prime — see "Reset" at bottom)
The dev server is running and state is primed: bill `bill_1003` is pre-approved so two bills are export-ready. The one-shot live actions below (capture, the apr_01 approval) are fresh.

---

## Act 1 — Sign in
1. Go to **http://localhost:3000** → redirected to `/login`.
2. Enter `123` / `123` → land on the dashboard for **Kira Roasters Sdn Bhd**.

*Line: "Everything you'll see is recorded and reconciled — Kira orchestrates and records, it never moves money or settles."*

## Act 2 — Capture an invoice (LIVE)
1. Go to **`/capture`**.
2. Click **Forward invoice** (simulates an invoice arriving by email).
3. Document AI extracts **Common Roots Roastery · MYR 1,284**, with confidence chips on Account (96%), Tax code (88%), **Cost centre (84%)**.
4. A **"Review required"** notice appears — one field is below the 85% threshold, so posting is locked.
5. Click **Mark coding reviewed** → button flips to "Coding reviewed".
6. Click **Confirm & post** → **"Posted to record store · queued for auto-match."**

*Line: "Low-confidence fields force a human gate. Once reviewed, it's posted to the system of record — books only, no payment."*

## Act 3 — The audit trail
1. Go to **`/audit`**.
2. Newest entries at the top show the trail you just created:
   - `capture.extracted` (Document AI, tier 3 — low confidence flagged)
   - `capture.reviewed` (you, tier 3)
   - `record.post` (you, tier 1)
3. Point out the **SHA hash + previous-hash** chain on each entry.

*Line: "Every action is immutable and hash-chained, tagged with an approval tier. This is the auditor's view."*

## Act 4 — Bank-statement reconciliation
1. Go to **`/transactions`** (read-only bank/card imports).
2. **txn_01 · Yning Coffee Supply · MYR 4,250** shows **matched 99%** to receipt rcp_01 — basis: amount exact, date 0 days, merchant ~0.98.
3. Contrast with an **unmatched** line (EcoPack) still awaiting its receipt.

*Line: "Bank lines are imported, never originated by Kira. It matches evidence to statements — high-confidence auto-confirms, the rest queue for review."*

## Act 5 — E-invoicing status (LHDN MyInvois)
1. Go to **`/compliance`**.
2. Walk the queue:
   - **einv_04** — inbound from Yning, **validated** on MyInvois (UUID + QR + "ACCEPTED · digital signature OK").
   - **einv_06** — **rejected** (buyer TIN format invalid) — shows the rejection reason.
   - **einv_03** — Brew Lab Coffee, **queued**, "Submit · needs approval".

*Line: "This is the LHDN MyInvois compliance layer — Malaysia outbound/inbound, plus Peppol for Singapore."*

## Act 6 — Submit to LHDN via approval gate (LIVE)
1. Go to **`/approvals`**.
2. Find **apr_01 · "Submit e-invoice to Brew Lab Coffee Co"** (tier 3, 88% confidence). Evidence: buyer TIN validated against LHDN, net matches sales order, no SST on goods.
3. Click **Approve**.
4. Go back to **`/compliance`** → **einv_03 is now submitted** with a fresh UUID and "SUBMITTED · awaiting regulator validation · explicit approval captured."

*Line: "Money-touching and regulator submissions require an explicit human tier-3 approval. That approval is captured in the audit chain."*

## Act 7 — ERP close & prepared submission (FINALE)
1. Go to **`/erp-close`** (this is for the accounting-firm close-book view; active client **Laman Grocer**, period **2026-05**).
2. Tour the workflow:
   - **Exception-first queue** — blocked bills with exact blockers: FreshCrate (new supplier + missing tax ID), CoolTech (duplicate risk), Unknown Supplier (unreadable scan). These are the **never-export guard**.
   - **Bank reconciliation** cards — match scores + basis.
   - **Supplier statement tie-out** — Meta ads variance RM0.
   - **Submission gate** — ERP batch `AP-2026-05`, LHDN package status, "2 ready".
3. Click **Evidence pack** → returns a file ref (the LHDN support bundle).
4. Click **Export Ready Bills** → **"Exported 2; blocked 0."**
5. (Optional) Back to **`/audit`** → see `close_book.evidence_pack` and `export.completed` entries.

*Line: "Clean bills export to the ERP — AutoCount here — and the LHDN package is prepared. Blocked bills physically cannot leave until their exceptions are resolved. That's the compliance guarantee."*

---

## Reset (between runs / if something goes sideways)
The live actions (Act 2 capture, Act 6 approval) are one-shot per state. To get a pristine workspace back in under a minute:

```bash
# from repo root
rm -f .kira-data/state.json
# restart the dev server (Ctrl-C the running one, then:)
npm run dev
# wait for http://localhost:3000/api/health to return 200, then re-prime:
curl -s -c /tmp/kira.txt -X POST localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' -d '{"login":"123","password":"123"}'
curl -s -b /tmp/kira.txt -X POST localhost:3000/api/erp-close/bills/bill_1003/approve \
  -H 'Content-Type: application/json' -d '{"confirm":true,"note":"Imported-service SST treatment reviewed."}'
```

That re-approves `bill_1003` so Act 7 shows two export-ready bills again. (`bill_1002` is approved in the seed; `bill_1003` needs this one approval.)

## Cheat sheet
| Act | URL | You click |
|-----|-----|-----------|
| 1 Sign in | `/login` | 123 / 123 |
| 2 Capture | `/capture` | Forward invoice → Mark coding reviewed → Confirm & post |
| 3 Audit | `/audit` | (read) |
| 4 Reconcile | `/transactions` | (read) |
| 5 E-invoice | `/compliance` | (read) |
| 6 LHDN submit | `/approvals` | Approve apr_01 |
| 7 ERP finale | `/erp-close` | Evidence pack → Export Ready Bills |
