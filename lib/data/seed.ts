// ─────────────────────────────────────────────────────────────────────────────
// Seed data — a realistic Malaysia + Singapore SME.
//
// "Kira Roasters Sdn Bhd": a specialty-coffee roaster & café group, HQ in Kuala
// Lumpur (TTDI roastery + Bangsar café), with a Singapore outlet at Telok Ayer.
// SST-registered in MY (MyInvois Phase 2), GST-registered for the SG entity.
//
// All money is integer minor units (cents). NOW is fixed so every run is
// deterministic — no Date.now() anywhere in the product.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AccountingSyncRef,
  ApprovalRequest,
  ChartOfAccount,
  CostCentre,
  CountryConfig,
  EInvoice,
  Match,
  NewsItem,
  Organization,
  Position,
  Receipt,
  RecordEntry,
  TaxCode,
  TransactionEvent,
  User,
  UserPreference,
} from "../types";

/** Fixed "current moment" — the 07:30 MYT daily briefing on 09 Jun 2026. */
export const NOW = "2026-06-09T07:30:00+08:00";
export const TODAY = "2026-06-09";

// ── Organization ────────────────────────────────────────────────────────────

export const ORG: Organization = {
  id: "org_kira",
  legalName: "Kira Roasters Sdn Bhd",
  brandName: "Kira Roasters",
  country: "MY",
  ssmNo: "201901001234 (1318472-K)",
  industry: "F&B · Specialty Coffee",
  fiscalYearEnd: "12-31",
  taxProfile: {
    model: "MY_SST",
    registered: true,
    registrationNo: "W10-1808-32000123",
    myInvoisPhase: "phase2",
    sstRate: 8,
    baseCurrency: "MYR",
  },
};

// ── People & roles ──────────────────────────────────────────────────────────

export const USERS: User[] = [
  { id: "u_amir", name: "Amir Hafiz", email: "amir@kiraroasters.my", role: "finance_admin", title: "Finance Lead" },
  { id: "u_meiling", name: "Lim Mei Ling", email: "meiling@kiraroasters.my", role: "approver", title: "Managing Director" },
  { id: "u_siti", name: "Siti Nuraini", email: "siti@kiraroasters.my", role: "approver", title: "Operations Director" },
  { id: "u_wei", name: "Wei Jian", email: "weijian@kiraroasters.my", role: "employee", title: "Café Manager · Bangsar" },
  { id: "u_devi", name: "Devi Menon", email: "devi.menon@crowe.my", role: "auditor", title: "External Auditor · Crowe" },
];

export const CURRENT_USER_ID = "u_amir";

// ── Coding dimensions ───────────────────────────────────────────────────────

export const ACCOUNTS: ChartOfAccount[] = [
  { code: "5010", name: "COGS — Coffee & Raw Materials", type: "expense" },
  { code: "5020", name: "Packaging & Supplies", type: "expense" },
  { code: "6010", name: "Rent", type: "expense" },
  { code: "6020", name: "Utilities", type: "expense" },
  { code: "6030", name: "Marketing & Advertising", type: "expense" },
  { code: "6040", name: "Software & Subscriptions", type: "expense" },
  { code: "6050", name: "Travel & Transport", type: "expense" },
  { code: "6060", name: "Staff Welfare & Meals", type: "expense" },
  { code: "6070", name: "Repairs & Maintenance", type: "expense" },
  { code: "1200", name: "Equipment (Fixed Asset)", type: "asset" },
];

export const TAX_CODES: TaxCode[] = [
  { code: "SST-S8", label: "Service Tax 8%", rate: 8, model: "MY_SST" },
  { code: "SST-S6", label: "Service Tax 6%", rate: 6, model: "MY_SST" },
  { code: "SST-IMP", label: "Imported Taxable Service (self-account 8%)", rate: 8, model: "MY_SST" },
  { code: "SST-EX", label: "SST Exempt / Not Subject", rate: 0, model: "MY_SST" },
  { code: "OUT", label: "Out of Scope", rate: 0, model: "MY_SST" },
  { code: "GST-SR9", label: "GST Standard-Rated 9%", rate: 9, model: "SG_GST" },
  { code: "GST-ZR", label: "GST Zero-Rated", rate: 0, model: "SG_GST" },
];

export const COST_CENTRES: CostCentre[] = [
  { code: "CC-BGS", name: "Bangsar Café" },
  { code: "CC-TTDI", name: "TTDI Roastery" },
  { code: "CC-SG01", name: "Singapore · Telok Ayer" },
  { code: "CC-HQ", name: "Head Office" },
];

// ── Imported transactions (read-only — money we never moved) ────────────────

export const TRANSACTIONS: TransactionEvent[] = [
  { id: "txn_01", occurredAt: "2026-06-08T03:12:00+08:00", importedAt: "2026-06-09T01:05:00+08:00", description: "YNING COFFEE SUPPLY", merchant: "Yning Coffee Supply", amountMinor: 425000, currency: "MYR", source: "card", sourceRef: "Maybank Biz •• 4417", cardLast4: "4417", status: "matched" },
  { id: "txn_02", occurredAt: "2026-06-08T09:40:00+08:00", importedAt: "2026-06-09T01:05:00+08:00", description: "TENAGA NASIONAL BHD", merchant: "Tenaga Nasional", amountMinor: 118040, currency: "MYR", source: "bank", sourceRef: "CIMB Biz •• 9920", status: "matched" },
  { id: "txn_03", occurredAt: "2026-06-07T22:18:00+08:00", importedAt: "2026-06-09T01:05:00+08:00", description: "META PLATFORMS ADS", merchant: "Meta Platforms", amountMinor: 92000, currency: "MYR", source: "card", sourceRef: "Maybank Biz •• 4417", cardLast4: "4417", status: "matched" },
  { id: "txn_04", occurredAt: "2026-06-07T13:02:00+08:00", importedAt: "2026-06-09T01:05:00+08:00", description: "GRAB *TRANSPORT", merchant: "Grab", amountMinor: 3850, currency: "MYR", source: "card", sourceRef: "CIMB Biz •• 9920", status: "matched" },
  { id: "txn_05", occurredAt: "2026-06-06T16:33:00+08:00", importedAt: "2026-06-09T01:05:00+08:00", description: "FIGMA INC SUBSCRIPTION", merchant: "Figma Inc", amountMinor: 4500, currency: "USD", source: "card", sourceRef: "Maybank Biz •• 4417", cardLast4: "4417", status: "needs_review" },
  { id: "txn_06", occurredAt: "2026-06-06T11:20:00+08:00", importedAt: "2026-06-09T01:05:00+08:00", description: "ECOPACK SDN BHD", merchant: "EcoPack Sdn Bhd", amountMinor: 156000, currency: "MYR", source: "card", sourceRef: "Maybank Biz •• 4417", cardLast4: "4417", status: "unmatched" },
  { id: "txn_07", occurredAt: "2026-06-05T18:47:00+08:00", importedAt: "2026-06-09T01:05:00+08:00", description: "SENHENG ELECTRIC", merchant: "Senheng", amountMinor: 329900, currency: "MYR", source: "card", sourceRef: "CIMB Biz •• 9920", status: "needs_review" },
  { id: "txn_08", occurredAt: "2026-06-05T15:09:00+08:00", importedAt: "2026-06-09T01:05:00+08:00", description: "STARBUCKS RESERVE KLCC", merchant: "Starbucks", amountMinor: 6480, currency: "MYR", source: "card", sourceRef: "Maybank Biz •• 4417", cardLast4: "4417", status: "unmatched" },
  { id: "txn_09", occurredAt: "2026-06-04T10:00:00+08:00", importedAt: "2026-06-09T01:05:00+08:00", description: "TELOK AYER UNIT — RENT JUN", merchant: "CapitaLand (Telok Ayer)", amountMinor: 320000, currency: "SGD", source: "bank", sourceRef: "DBS Biz •• 8821", status: "matched" },
  { id: "txn_10", occurredAt: "2026-06-04T08:21:00+08:00", importedAt: "2026-06-09T01:05:00+08:00", description: "GOOGLE WORKSPACE", merchant: "Google", amountMinor: 21800, currency: "MYR", source: "card", sourceRef: "Maybank Biz •• 4417", cardLast4: "4417", status: "matched" },
  { id: "txn_11", occurredAt: "2026-06-03T19:55:00+08:00", importedAt: "2026-06-09T01:05:00+08:00", description: "GRAB *TRANSPORT", merchant: "Grab", amountMinor: 4100, currency: "MYR", source: "card", sourceRef: "CIMB Biz •• 9920", status: "matched" },
  { id: "txn_12", occurredAt: "2026-06-08T22:41:00+08:00", importedAt: "2026-06-09T01:05:00+08:00", description: "META PLATFORMS ADS", merchant: "Meta Platforms", amountMinor: 92000, currency: "MYR", source: "card", sourceRef: "Maybank Biz •• 4417", cardLast4: "4417", status: "unmatched" },
];

// ── Captured receipts / supplier invoices ───────────────────────────────────

export const RECEIPTS: Receipt[] = [
  { id: "rcp_01", kind: "invoice", capturedAt: "2026-06-08T08:05:00+08:00", capturedVia: "email", supplier: "Yning Coffee Supply", totalMinor: 425000, taxMinor: 0, currency: "MYR", docDate: "2026-06-08", docNo: "YCS-2026-3391", ocrConfidence: 97, suggestedAccount: "5010", suggestedTaxCode: "OUT", suggestedCostCentre: "CC-TTDI", status: "confirmed", thumbHint: "beans", lineItems: [{ label: "Ethiopia Guji washed · 60kg", amountMinor: 312000 }, { label: "Brazil Cerrado · 40kg", amountMinor: 113000 }] },
  { id: "rcp_02", kind: "invoice", capturedAt: "2026-06-08T10:11:00+08:00", capturedVia: "email", supplier: "Tenaga Nasional", totalMinor: 118040, taxMinor: 0, currency: "MYR", docDate: "2026-06-07", docNo: "TNB-558210", ocrConfidence: 95, suggestedAccount: "6020", suggestedTaxCode: "OUT", suggestedCostCentre: "CC-TTDI", status: "confirmed", thumbHint: "bolt", lineItems: [{ label: "Electricity — May 2026", amountMinor: 118040 }] },
  { id: "rcp_03", kind: "receipt", capturedAt: "2026-06-07T13:05:00+08:00", capturedVia: "mobile", supplier: "Grab", totalMinor: 3850, taxMinor: 285, currency: "MYR", docDate: "2026-06-07", docNo: "GRB-7741200", ocrConfidence: 90, suggestedAccount: "6050", suggestedTaxCode: "SST-S8", suggestedCostCentre: "CC-HQ", status: "confirmed", thumbHint: "car", lineItems: [{ label: "Ride — TTDI to KL Sentral", amountMinor: 3850 }] },
  { id: "rcp_04", kind: "invoice", capturedAt: "2026-06-06T11:40:00+08:00", capturedVia: "email", supplier: "EcoPack Sdn Bhd", totalMinor: 156000, taxMinor: 0, currency: "MYR", docDate: "2026-06-06", docNo: "EP-20260606-12", ocrConfidence: 93, suggestedAccount: "5020", suggestedTaxCode: "OUT", suggestedCostCentre: "CC-TTDI", status: "needs_review", thumbHint: "box", lineItems: [{ label: "Kraft bags 250g · 2,000 units", amountMinor: 96000 }, { label: "Compostable lids · 3,000 units", amountMinor: 60000 }] },
  { id: "rcp_05", kind: "invoice", capturedAt: "2026-06-06T16:35:00+08:00", capturedVia: "email", supplier: "Figma Inc", totalMinor: 4500, taxMinor: 0, currency: "USD", docDate: "2026-06-06", docNo: "FIG-INV-99213", ocrConfidence: 88, suggestedAccount: "6040", suggestedTaxCode: "SST-IMP", suggestedCostCentre: "CC-HQ", status: "needs_review", thumbHint: "design", lineItems: [{ label: "Figma Organization · 3 editors", amountMinor: 4500 }] },
  { id: "rcp_06", kind: "receipt", capturedAt: "2026-06-05T19:02:00+08:00", capturedVia: "mobile", supplier: "Senheng", totalMinor: 329900, taxMinor: 24437, currency: "MYR", docDate: "2026-06-05", docNo: "SEN-KL-88123", ocrConfidence: 82, suggestedAccount: "6070", suggestedTaxCode: "SST-S8", suggestedCostCentre: "CC-BGS", status: "needs_review", thumbHint: "grinder", lineItems: [{ label: "Mahlkönig E65S GbW grinder", amountMinor: 329900 }] },
  { id: "rcp_07", kind: "receipt", capturedAt: "2026-06-05T15:12:00+08:00", capturedVia: "mobile", supplier: "Starbucks", totalMinor: 6480, taxMinor: 480, currency: "MYR", docDate: "2026-06-05", docNo: "SB-KLCC-2241", ocrConfidence: 91, suggestedAccount: "6060", suggestedTaxCode: "SST-S8", suggestedCostCentre: "CC-HQ", status: "needs_review", thumbHint: "cup", lineItems: [{ label: "Coffee & pastries (competitor visit?)", amountMinor: 6480 }] },
  { id: "rcp_08", kind: "invoice", capturedAt: "2026-06-04T10:20:00+08:00", capturedVia: "email", supplier: "CapitaLand (Telok Ayer)", totalMinor: 320000, taxMinor: 26422, currency: "SGD", docDate: "2026-06-01", docNo: "CL-TA-2026-06", ocrConfidence: 96, suggestedAccount: "6010", suggestedTaxCode: "GST-SR9", suggestedCostCentre: "CC-SG01", status: "confirmed", thumbHint: "building", lineItems: [{ label: "Unit rental — Jun 2026", amountMinor: 293578 }, { label: "GST 9%", amountMinor: 26422 }] },
  { id: "rcp_09", kind: "invoice", capturedAt: "2026-06-07T22:25:00+08:00", capturedVia: "email", supplier: "Meta Platforms", totalMinor: 92000, taxMinor: 0, currency: "MYR", docDate: "2026-06-07", docNo: "META-MY-66301", ocrConfidence: 94, suggestedAccount: "6030", suggestedTaxCode: "SST-IMP", suggestedCostCentre: "CC-BGS", status: "confirmed", thumbHint: "ads", lineItems: [{ label: "Campaign — Bangsar launch · Jun", amountMinor: 92000 }] },
];

export const MATCHES: Match[] = [
  { id: "mat_01", transactionId: "txn_01", receiptId: "rcp_01", score: 99, basis: ["amount=exact", "date=0d", "merchant~0.98"], state: "confirmed" },
  { id: "mat_02", transactionId: "txn_02", receiptId: "rcp_02", score: 97, basis: ["amount=exact", "date+1d", "merchant~0.97"], state: "confirmed" },
  { id: "mat_03", transactionId: "txn_03", receiptId: "rcp_09", score: 95, basis: ["amount=exact", "date=0d", "merchant~0.99"], state: "confirmed" },
  { id: "mat_04", transactionId: "txn_04", receiptId: "rcp_03", score: 96, basis: ["amount=exact", "date=0d", "merchant~1.0"], state: "auto" },
  { id: "mat_05", transactionId: "txn_09", receiptId: "rcp_08", score: 94, basis: ["amount=exact", "date+3d", "merchant~0.91"], state: "confirmed" },
  { id: "mat_06", transactionId: "txn_06", receiptId: "rcp_04", score: 88, basis: ["amount=exact", "date=0d", "merchant~0.89"], state: "suggested" },
  { id: "mat_07", transactionId: "txn_07", receiptId: "rcp_06", score: 86, basis: ["amount=exact", "date=0d", "merchant~0.84"], state: "suggested" },
];

// ── E-invoicing (MyInvois + Peppol/InvoiceNow) ──────────────────────────────

export const EINVOICES: EInvoice[] = [
  { id: "einv_01", channel: "MyInvois", direction: "outbound", counterparty: "Artisan Cafe KL Sdn Bhd", counterpartyId: "C20880011220", issueDate: "2026-06-07", currency: "MYR", netMinor: 280000, taxMinor: 0, grossMinor: 280000, state: "validated", uuid: "MYS26060700A1F3C9D2E8", qrHint: "valid", validationResponse: "ACCEPTED · digital signature OK · validated 2026-06-07T18:22:08Z", submittedAt: "2026-06-07T18:21:40+08:00" },
  { id: "einv_02", channel: "MyInvois", direction: "outbound", counterparty: "The Daily Grind Sdn Bhd", counterpartyId: "C13044559881", issueDate: "2026-06-08", currency: "MYR", netMinor: 154000, taxMinor: 0, grossMinor: 154000, state: "submitted", uuid: "MYS26060800B7E1A4F0C6", submittedAt: "2026-06-08T20:04:11+08:00" },
  { id: "einv_03", channel: "MyInvois", direction: "outbound", counterparty: "Brew Lab Coffee Co", counterpartyId: "C99220114788", issueDate: "2026-06-09", currency: "MYR", netMinor: 96000, taxMinor: 0, grossMinor: 96000, state: "queued" },
  { id: "einv_04", channel: "MyInvois", direction: "inbound", counterparty: "Yning Coffee Supply", counterpartyId: "C77120093311", issueDate: "2026-06-08", currency: "MYR", netMinor: 425000, taxMinor: 0, grossMinor: 425000, state: "validated", uuid: "MYS26060800C2D9B1E7F4", validationResponse: "ACCEPTED · self-billed reference linked", submittedAt: "2026-06-08T08:02:55+08:00" },
  { id: "einv_05", channel: "Peppol-InvoiceNow", direction: "outbound", counterparty: "Common Man Coffee Roasters (SG)", counterpartyId: "201431826K", issueDate: "2026-06-08", currency: "SGD", netMinor: 385321, taxMinor: 34679, grossMinor: 420000, state: "submitted", uuid: "9924c1b2-peppol-sg-0608", submittedAt: "2026-06-08T17:30:00+08:00" },
  { id: "einv_06", channel: "MyInvois", direction: "outbound", counterparty: "Kopitiam Group Bhd", counterpartyId: "C10010102929", issueDate: "2026-06-08", currency: "MYR", netMinor: 510000, taxMinor: 0, grossMinor: 510000, state: "rejected", rejectionReason: "Buyer TIN format invalid (field: BuyerTIN — expected C########### )", submittedAt: "2026-06-08T14:18:30+08:00" },
  { id: "einv_07", channel: "MyInvois", direction: "outbound", counterparty: "Third Wave Cafe Sdn Bhd", counterpartyId: "C44551200390", issueDate: "2026-06-09", currency: "MYR", netMinor: 132000, taxMinor: 0, grossMinor: 132000, state: "draft" },
];

// ── System-of-record entries (NOT a money ledger) ───────────────────────────

export const RECORDS: RecordEntry[] = [
  { id: "rec_01", postedAt: "2026-06-09T01:10:00+08:00", memo: "Coffee beans — Yning", account: "5010", taxCode: "OUT", costCentre: "CC-TTDI", amountMinor: 425000, taxAmountMinor: 0, currency: "MYR", sourceTransactionId: "txn_01", sourceReceiptId: "rcp_01", reconciled: true },
  { id: "rec_02", postedAt: "2026-06-09T01:10:00+08:00", memo: "Electricity — May", account: "6020", taxCode: "OUT", costCentre: "CC-TTDI", amountMinor: 118040, taxAmountMinor: 0, currency: "MYR", sourceTransactionId: "txn_02", sourceReceiptId: "rcp_02", reconciled: true },
  { id: "rec_03", postedAt: "2026-06-09T01:10:00+08:00", memo: "Meta Ads — Bangsar launch", account: "6030", taxCode: "SST-IMP", costCentre: "CC-BGS", amountMinor: 92000, taxAmountMinor: 7360, currency: "MYR", sourceTransactionId: "txn_03", sourceReceiptId: "rcp_09", reconciled: true },
  { id: "rec_04", postedAt: "2026-06-09T01:10:00+08:00", memo: "Grab — TTDI to KL Sentral", account: "6050", taxCode: "SST-S8", costCentre: "CC-HQ", amountMinor: 3850, taxAmountMinor: 285, currency: "MYR", sourceTransactionId: "txn_04", sourceReceiptId: "rcp_03", reconciled: true },
  { id: "rec_05", postedAt: "2026-06-09T01:10:00+08:00", memo: "Telok Ayer rent — Jun", account: "6010", taxCode: "GST-SR9", costCentre: "CC-SG01", amountMinor: 320000, taxAmountMinor: 26422, currency: "SGD", sourceTransactionId: "txn_09", sourceReceiptId: "rcp_08", reconciled: true },
  { id: "rec_06", postedAt: "2026-06-09T01:10:00+08:00", memo: "Google Workspace", account: "6040", taxCode: "SST-IMP", costCentre: "CC-HQ", amountMinor: 21800, taxAmountMinor: 1744, currency: "MYR", sourceTransactionId: "txn_10", sourceReceiptId: undefined, reconciled: false },
];

export const SYNC_REFS: AccountingSyncRef[] = [
  { id: "syn_01", provider: "AutoCount", internalEntryId: "rec_01", externalId: "AC-PV-009123", syncedAt: "2026-06-09T01:12:00+08:00", state: "synced" },
  { id: "syn_02", provider: "AutoCount", internalEntryId: "rec_02", externalId: "AC-PV-009124", syncedAt: "2026-06-09T01:12:00+08:00", state: "synced" },
  { id: "syn_03", provider: "AutoCount", internalEntryId: "rec_03", externalId: "AC-PV-009125", syncedAt: "2026-06-09T01:12:00+08:00", state: "synced" },
  { id: "syn_04", provider: "Xero", internalEntryId: "rec_05", externalId: "XRO-IV-55210", syncedAt: "2026-06-09T01:13:00+08:00", state: "synced" },
  { id: "syn_05", provider: "AutoCount", internalEntryId: "rec_06", externalId: "", syncedAt: "2026-06-09T01:13:00+08:00", state: "pending" },
];

// ── Persistent approval queue (tier-3 / tier-4 items) ───────────────────────

export const APPROVALS: ApprovalRequest[] = [
  {
    id: "apr_01", title: "Submit e-invoice to Brew Lab Coffee Co", subject: "MyInvois outbound · INV draft einv_03", amountMinor: 96000, currency: "MYR", tier: 3, reversible: false, raisedBy: "Compliance/Safety Agent", raisedAt: "2026-06-09T07:30:12+08:00", confidence: 88,
    evidence: ["Buyer TIN C99220114788 validated against LHDN directory", "Net RM960.00 matches sales order SO-2261", "No SST on wholesale beans (goods)"],
    steps: [{ order: 1, role: "finance_admin", approverName: "Amir Hafiz", state: "pending" }],
    state: "open", linkedKind: "einvoice", linkedId: "einv_03",
  },
  {
    id: "apr_02", title: "Recode Mahlkönig grinder as Fixed Asset", subject: "Senheng RM3,299 — reclassify 6070 → 1200 (capitalise)", amountMinor: 329900, currency: "MYR", tier: 3, reversible: true, raisedBy: "Budget/Spend Agent", raisedAt: "2026-06-09T07:30:09+08:00", confidence: 71,
    evidence: ["Unit price > RM2,000 capitalisation threshold", "Useful life > 1 year (espresso grinder)", "Affects SST input treatment — finance sign-off required"],
    steps: [{ order: 1, role: "finance_admin", approverName: "Amir Hafiz", state: "pending" }],
    state: "open", linkedKind: "expense", linkedId: "rcp_06",
  },
  {
    id: "apr_03", title: "Review out-of-policy spend — Starbucks RM64.80", subject: "Staff/competitor visit · exceeds RM50 meal policy", amountMinor: 6480, currency: "MYR", tier: 4, reversible: true, raisedBy: "Risk Monitoring Agent", raisedAt: "2026-06-09T07:30:07+08:00", confidence: 76,
    evidence: ["Merchant = direct competitor", "RM64.80 > RM50 per-head meal cap", "No project/cost-centre tag on capture"],
    steps: [{ order: 1, role: "approver", approverName: "Siti Nuraini", state: "pending" }],
    state: "open", linkedKind: "expense", linkedId: "rcp_07",
  },
  {
    id: "apr_04", title: "Confirm imported-service SST self-accounting — Figma", subject: "USD 45.00 software · self-account SST-IMP 8%", amountMinor: 4500, currency: "USD", tier: 3, reversible: true, raisedBy: "Compliance/Safety Agent", raisedAt: "2026-06-09T07:30:05+08:00", confidence: 69,
    evidence: ["Imported taxable service — reverse-charge SST applies", "FX rate on 06 Jun pending confirmation", "Low confidence (<70): escalated for human review"],
    steps: [{ order: 1, role: "finance_admin", approverName: "Amir Hafiz", state: "pending" }],
    state: "open", linkedKind: "expense", linkedId: "rcp_05",
  },
];

// ── Phase-2 personal-finance side (read-only, informational only) ───────────

export const POSITIONS: Position[] = [
  { instrument: { symbol: "1155.KL", name: "Malayan Banking Bhd", kind: "equity", currency: "MYR" }, units: 4000, avgCostMinor: 920, lastMinor: 1058, dayChangePct: 0.8 },
  { instrument: { symbol: "VOO", name: "Vanguard S&P 500 ETF", kind: "etf", currency: "USD" }, units: 30, avgCostMinor: 41500, lastMinor: 53120, dayChangePct: -0.4 },
  { instrument: { symbol: "Z74.SI", name: "Singtel", kind: "equity", currency: "SGD" }, units: 2500, avgCostMinor: 248, lastMinor: 391, dayChangePct: 1.2 },
  { instrument: { symbol: "BTC", name: "Bitcoin", kind: "crypto", currency: "USD" }, units: 0.35, avgCostMinor: 4200000, lastMinor: 6815000, dayChangePct: -2.1 },
  { instrument: { symbol: "CLR.SI", name: "CapitaLand Ascendas REIT", kind: "reit", currency: "SGD" }, units: 3000, avgCostMinor: 268, lastMinor: 281, dayChangePct: 0.3 },
];

export const NEWS: NewsItem[] = [
  { id: "nws_01", headline: "Bank Negara holds OPR at 3.00% in latest MPC decision", source: "Bank Negara Malaysia (press release)", url: "https://www.bnm.gov.my/-/monetary-policy-statement", publishedAt: "2026-06-05T15:00:00+08:00", relevance: 78, verified: true, summary: "BNM kept the Overnight Policy Rate unchanged at 3.00%, citing stable inflation and steady domestic demand. Financing costs for SME term loans likely steady near-term." },
  { id: "nws_02", headline: "LHDN: MyInvois Phase 2 enforcement covers businesses above RM25m turnover", source: "Lembaga Hasil Dalam Negeri", url: "https://www.hasil.gov.my/en/e-invoice/", publishedAt: "2026-06-02T09:30:00+08:00", relevance: 92, verified: true, summary: "Phase 2 e-invoicing obligations are in force; consolidated e-invoices and validation within 72 hours remain required. Relevant to Kira's wholesale invoicing." },
  { id: "nws_03", headline: "Arabica futures ease ~3% w/w on improved Brazil harvest outlook", source: "Reuters Commodities", url: "https://www.reuters.com/markets/commodities/", publishedAt: "2026-06-06T21:10:00+08:00", relevance: 71, verified: true, summary: "ICE arabica softened on favourable Brazilian weather. A sustained pullback could ease green-bean COGS over the next purchasing cycle — monitor before next Yning order." },
  { id: "nws_04", headline: "Unverified: rumoured GrabFood commission change for F&B merchants", source: "Social media (unconfirmed)", url: "https://example.com/unverified", publishedAt: "2026-06-08T12:00:00+08:00", relevance: 44, verified: false, summary: "Circulating claim of a commission adjustment. No primary source located — flagged 'unable to verify' and excluded from the briefing's action items." },
];

// ── Preferences ─────────────────────────────────────────────────────────────

export const PREFERENCES: UserPreference = {
  userId: "u_amir",
  baseCurrency: "MYR",
  locale: "en-MY",
  language: "en",
  automationThreshold: 85,
  riskTolerance: "balanced",
  channels: { push: true, email: true, slack: true, whatsapp: false },
  quietHours: { from: "22:00", to: "07:00" },
  briefingTime: "07:30",
};

// ── Country configuration (metadata, not code forks) ────────────────────────

export const COUNTRY_CONFIGS: CountryConfig[] = [
  { country: "MY", taxModel: "MY_SST", eInvoiceChannel: "MyInvois", eInvoiceSchema: "MyInvois UBL 2.1 (v1.1)", regulator: "LHDN / BNM", paymentMethods: ["DuitNow", "FPX", "Card", "Cheque"], languagePack: ["en", "ms", "zh"] },
  { country: "SG", taxModel: "SG_GST", eInvoiceChannel: "Peppol-InvoiceNow", eInvoiceSchema: "PINT-SG (Peppol BIS)", regulator: "IRAS / MAS", paymentMethods: ["PayNow", "GIRO", "Card"], languagePack: ["en", "zh"] },
];

// ── Raw audit events (the chain is computed in the store) ────────────────────

export interface RawAuditEvent {
  at: string;
  actor: string;
  action: string;
  target?: string;
  detail: string;
  tier?: 1 | 2 | 3 | 4;
}

export const RAW_AUDIT: RawAuditEvent[] = [
  { at: "2026-06-09T01:05:00+08:00", actor: "Ingestion", action: "import.transactions", target: "Maybank/CIMB/DBS feed", detail: "Imported 12 transactions (read-only). No PAN stored.", tier: 1 },
  { at: "2026-06-09T01:08:00+08:00", actor: "Budget/Spend Agent", action: "match.run", detail: "Auto-matched 5 receipts to transactions; 2 suggested; 3 unmatched.", tier: 1 },
  { at: "2026-06-09T01:10:00+08:00", actor: "Budget/Spend Agent", action: "record.post", target: "rec_01..rec_06", detail: "Posted 6 record entries with suggested tax codes.", tier: 1 },
  { at: "2026-06-09T01:12:00+08:00", actor: "Integration", action: "accounting.writeback", target: "AutoCount", detail: "Synced 3 entries to AutoCount; 1 to Xero (SG).", tier: 1 },
  { at: "2026-06-09T07:30:00+08:00", actor: "Orchestrator", action: "briefing.run.start", target: "run_20260609_0730", detail: "Daily briefing run started. Agents: Preference, Budget/Spend, Risk, News, Market, Portfolio, Compliance, Notification.", tier: 1 },
  { at: "2026-06-09T07:30:06+08:00", actor: "Risk Monitoring Agent", action: "flag.raise", target: "rcp_07", detail: "Out-of-policy spend flagged (Starbucks, competitor, > RM50 cap). Escalated tier-4.", tier: 4 },
  { at: "2026-06-09T07:30:09+08:00", actor: "Budget/Spend Agent", action: "suggest.recode", target: "rcp_06", detail: "Suggested capitalising grinder (6070 → 1200). Affects filed treatment → tier-3.", tier: 3 },
  { at: "2026-06-09T07:30:12+08:00", actor: "Compliance/Safety Agent", action: "gate.pass", target: "run_20260609_0730", detail: "Relabelled 3 items informational; attached disclaimers; split 4 money-touching items to Approvals.", tier: 1 },
  { at: "2026-06-09T07:30:14+08:00", actor: "Compliance/Safety Agent", action: "einvoice.queue", target: "einv_03", detail: "Brew Lab e-invoice prepared; requires explicit approval before submission.", tier: 3 },
  { at: "2026-06-09T07:30:15+08:00", actor: "Notification Agent", action: "notify.send", target: "u_amir", detail: "Daily briefing delivered via push + email + Slack. Quiet hours respected.", tier: 2 },
  { at: "2026-06-08T14:18:30+08:00", actor: "Compliance/Safety Agent", action: "einvoice.reject.record", target: "einv_06", detail: "Kopitiam Group submission rejected by LHDN (BuyerTIN format). Validation response stored.", tier: 1 },
];
