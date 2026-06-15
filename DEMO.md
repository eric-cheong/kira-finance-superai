# Kira — Live Demo Script

**One invoice captured live → its trail across workflows → bank-statement reconciliation → prepared submission to ERP + LHDN.**

Runs fully offline on seeded mock data. For the Mem0 prize moment, set `MEM0_API_KEY` so Close Memory shows real hosted Mem0 recall; without it, the same flow runs on the local fallback.

- **URL:** http://localhost:3000
- **Login:** username `123` / password `123`
- **Workspace:** Kira Roasters Sdn Bhd (Malaysia, SST-registered, MyInvois Phase 2)

> Two-invoice story: you **capture "Common Roots Roastery" live** (intake + human-in-the-loop), then pivot to the fully-traced seeded **Yning Coffee** invoice for reconciliation and the **Brew Lab** e-invoice for LHDN. This is intentional — the live capture has no matching bank line yet, the seeded ones are fully reconciled.

---

## Before you start (already done, but to re-prime — see "Reset" at bottom)
The dev server is running and state is primed: bill `bill_1003` is pre-approved so two bills are export-ready. The one-shot live actions below (capture, the apr_01 approval) are fresh.

For the **Mem0 Prize** version, also make sure `.env.local` has:

```bash
MEM0_API_KEY=your_mem0_platform_api_key
```

Then seed close memory:

```bash
npm run seed:mem0
```

Expected hosted output:

```json
{
  "written": 7,
  "source": "mem0"
}
```

If the output says `"source": "local"`, the live app still works, but do not pitch it as the Mem0-hosted path.

**Agnes AI powers the whole app.** Add your free Agnes key to `.env.local` as `AGNES_API_KEY=sk-...` (get one at https://platform.agnes-ai.com — no top-up). With it set, all four Agnes modalities (text, vision, image, video) run **Live**; without it, every modality shows a deterministic **Fallback** so the demo still runs end-to-end.

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

## Act 7 — ERP close, Close Memory & prepared submission (FINALE)
1. Go to **`/erp-close`** (this is for the accounting-firm close-book view; active client **Laman Grocer**, period **2026-05**).
2. Tour the workflow:
   - **Exception-first queue** — blocked bills with exact blockers: FreshCrate (new supplier + missing tax ID), CoolTech (duplicate risk), Unknown Supplier (unreadable scan). These are the **never-export guard**.
   - **Bank reconciliation** cards — match scores + basis.
   - **Supplier statement tie-out** — Meta ads variance RM0.
   - **Submission gate** — ERP batch `AP-2026-05`, LHDN package status, "2 ready".
3. In **Close Memory**, select **Beras Murni Trading · bill_1001** and click **Recall context**.
4. Point out the source badge:
   - **Powered by Mem0** = hosted Mem0 is being used.
   - **Local memory** = fallback mode; useful for safety, not the prize proof.
5. Point out the recalled close decision:
   - Expense account `5010`
   - Tax code `SST-EX`
   - Cost centre `LG-KL`
   - Approver history
   - Confidence score
6. Click **Apply suggested coding** and explain what changed: Kira PATCHes the Bill Record with the remembered ERP mapping, so the accountant does not re-key vendor, AP, expense, tax, cost centre, or LHDN classification fields.
7. Say the product line: **"Kira is not just extracting this invoice. It remembers how this client closes this supplier month after month."**
8. In **Powered by Agnes AI — Omni-modal**, run all four rows. Call out the **Live** badge on each (or **Fallback** if the key is missing — the demo still works).
9. Agnes omni-modal narration — one provider, every modality:
   - **Agnes Text** (`agnes-2.0-flash`) reasons over the close and recommends the safest next action.
   - **Agnes Vision** (`agnes-2.0-flash`) reads the receipt image and extracts supplier, totals, and tax (also live on `/capture` → **Snap receipt**).
   - **Agnes Image** (`agnes-image-2.0-flash`) generates the branded close report cover.
   - **Agnes Video** (`agnes-video-v2.0`) renders a short CFO close briefing (storyboard while it processes).
10. Click **Evidence pack** → returns a file ref (the LHDN support bundle).
11. Click **Export Ready Bills** → **"Exported 2; blocked 0."**
12. For write-back proof, approve or export a ready bill, then recall that same supplier again and point out the new approval/export memory. If running short on time, say this is the second half of the loop and keep the live demo focused on recall + apply.
13. (Optional) Back to **`/audit`** → see `close_book.evidence_pack` and `export.completed` entries.

*Line: "Month one teaches Kira. Month two closes faster because Kira remembers the supplier coding, exception resolution, and approval history."*

---

## Reset (between runs / if something goes sideways)
The live actions (Act 2 capture, Act 6 approval) are one-shot per state. To get a pristine workspace back in under a minute:

```bash
# from repo root
rm -f .kira-data/state.json
rm -f .kira-data/close-memory.json
# restart the dev server (Ctrl-C the running one, then:)
npm run dev
# seed Close Memory; source should be "mem0" when MEM0_API_KEY is configured
npm run seed:mem0
# wait for http://localhost:3000/api/health to return 200, then re-prime:
curl -s -c /tmp/kira.txt -X POST localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' -d '{"login":"123","password":"123"}'
curl -s -b /tmp/kira.txt -X POST localhost:3000/api/erp-close/bills/bill_1003/approve \
  -H 'Content-Type: application/json' -d '{"confirm":true,"note":"Imported-service SST treatment reviewed."}'
```

That re-approves `bill_1003` so Act 7 shows two export-ready bills again. (`bill_1002` is approved in the seed; `bill_1003` needs this one approval.)

If Next starts on another port, replace `localhost:3000` in the curl commands with the port printed by `npm run dev`.

## Cheat sheet
| Act | URL | You click |
|-----|-----|-----------|
| 1 Sign in | `/login` | 123 / 123 |
| 2 Capture | `/capture` | Snap receipt (Agnes Vision OCR) → Mark coding reviewed → Confirm & post |
| 3 Audit | `/audit` | (read) |
| 4 Reconcile | `/transactions` | (read) |
| 5 E-invoice | `/compliance` | (read) |
| 6 LHDN submit | `/approvals` | Approve apr_01 |
| 7 ERP + Agnes finale | `/erp-close` | Recall context → Apply suggested coding → Run all 4 Agnes omni-modal rows → Evidence pack → Export Ready Bills |
