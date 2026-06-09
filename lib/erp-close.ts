import { money } from "./format";
import type { CurrencyCode } from "./format";

export type CloseBookStatus =
  | "received"
  | "extracted"
  | "needs_review"
  | "ready"
  | "approved"
  | "exported";

export const CLOSE_BOOK_STATUSES: CloseBookStatus[] = [
  "received",
  "extracted",
  "needs_review",
  "ready",
  "approved",
  "exported",
];

export type CloseBookExceptionType =
  | "missing_tax_id"
  | "duplicate_risk"
  | "math_mismatch"
  | "new_supplier"
  | "low_confidence"
  | "unreadable_scan";

export const CLOSE_BOOK_EXCEPTION_TYPES: CloseBookExceptionType[] = [
  "missing_tax_id",
  "duplicate_risk",
  "math_mismatch",
  "new_supplier",
  "low_confidence",
  "unreadable_scan",
];

export type IntakeChannel = "whatsapp" | "email" | "upload";
export type IntakeDocumentKind = "invoice" | "receipt" | "supplier_statement" | "bank_evidence";
export type SupplierStatementState = "matched" | "variance" | "not_found";
export type BankMatchState = "matched" | "suggested" | "unmatched";
export type ApprovalState = "not_required" | "pending" | "approved" | "rejected";
export type ExportDestination = "AutoCount" | "SQL Account" | "Xero" | "LHDN MyInvois";

export type ExportBlockReasonCode =
  | "math_failed"
  | "duplicate_unresolved"
  | "missing_required_field"
  | "critical_confidence_low"
  | "tax_treatment_unresolved"
  | "erp_mapping_missing"
  | "approval_required"
  | "already_exported";

export interface CloseBookClient {
  id: string;
  legalName: string;
  tradingName: string;
  ssmNo: string;
  tin: string;
  msic: string;
  msicDescription: string;
  sstRegistrationNo?: string;
  fiscalYearEnd: string;
  baseCurrency: CurrencyCode;
  closePeriod: string;
  accountingFirm: string;
  erp: Extract<ExportDestination, "AutoCount" | "SQL Account" | "Xero">;
}

export interface CloseBookSupplier {
  id: string;
  legalName: string;
  tradingName?: string;
  ssmNo?: string;
  tin?: string;
  msic?: string;
  sstRegistrationNo?: string;
  defaultAccountCode?: string;
  defaultTaxCode?: string;
  erpVendorId?: string;
  onboardingState: "known" | "pending_review" | "blocked";
}

export interface IntakeEvidence {
  id: string;
  channel: IntakeChannel;
  kind: IntakeDocumentKind;
  receivedAt: string;
  from: string;
  filename?: string;
  subject?: string;
  message?: string;
  storageRef: string;
}

export interface BillLineItem {
  description: string;
  quantity: number;
  unitAmountMinor: number;
  netAmountMinor: number;
  taxAmountMinor: number;
  accountCode?: string;
  costCentre?: string;
  taxCode?: string;
}

export interface ConfidenceBreakdown {
  supplier: number;
  invoiceNumber: number;
  invoiceDate: number;
  total: number;
  currency: number;
  taxTreatment: number;
  bankMatch: number;
}

export interface CloseBookException {
  type: CloseBookExceptionType;
  message: string;
  resolved: boolean;
  severity: "info" | "warning" | "critical";
}

export interface BankMatch {
  state: BankMatchState;
  bank: "Maybank" | "CIMB" | "Public Bank" | "RHB" | "OCBC";
  accountRef: string;
  transactionRef?: string;
  paidAt?: string;
  amountMinor?: number;
  currency?: CurrencyCode;
  score: number;
  basis: string[];
}

export interface SupplierStatementMatch {
  statementId: string;
  supplierId: string;
  state: SupplierStatementState;
  statementDate: string;
  statementBalanceMinor: number;
  matchedInvoiceRefs: string[];
  varianceMinor: number;
  note: string;
}

export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action:
    | "intake.received"
    | "ocr.extracted"
    | "exception.raised"
    | "exception.resolved"
    | "bank.match"
    | "statement.match"
    | "approval.requested"
    | "approval.approved"
    | "export.blocked"
    | "export.completed";
  detail: string;
}

export interface ApprovalGate {
  state: ApprovalState;
  requestedBy?: string;
  approver?: string;
  requestedAt?: string;
  approvedAt?: string;
  note?: string;
}

export interface ErpMapping {
  destination: ExportDestination;
  vendorId?: string;
  apAccountCode?: string;
  expenseAccountCode?: string;
  taxCode?: string;
  costCentre?: string;
  lhdnClassificationCode?: string;
}

export interface VerifiedBillRecord {
  id: string;
  clientId: string;
  supplierId?: string;
  status: CloseBookStatus;
  intake: IntakeEvidence;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  supplierName?: string;
  supplierTin?: string;
  supplierSstRegistrationNo?: string;
  subtotalMinor?: number;
  taxMinor?: number;
  totalMinor?: number;
  currency?: CurrencyCode;
  taxTreatment?: "sst_8_service" | "sst_exempt" | "imported_taxable_service" | "out_of_scope";
  duplicateOf?: string;
  duplicateResolved: boolean;
  lines: BillLineItem[];
  confidence: ConfidenceBreakdown;
  exceptions: CloseBookException[];
  bankMatch?: BankMatch;
  supplierStatementMatch?: SupplierStatementMatch;
  approval: ApprovalGate;
  erpMapping?: ErpMapping;
  auditTrail: AuditEvent[];
}

export interface ExportBlockReason {
  recordId: string;
  code: ExportBlockReasonCode;
  message: string;
  field?: keyof VerifiedBillRecord | "lines" | "erpMapping";
}

export interface CloseReadiness {
  score: number;
  totalRecords: number;
  exportableRecords: number;
  blockedRecords: number;
  unresolvedCriticalExceptions: number;
  approvedValueMinor: number;
  exportedValueMinor: number;
  currency: CurrencyCode;
  blockers: ExportBlockReason[];
}

export interface WorkflowDashboard {
  statusCounts: Record<CloseBookStatus, number>;
  exceptionCounts: Record<CloseBookExceptionType, number>;
  channelCounts: Record<IntakeChannel, number>;
  closeReadiness: CloseReadiness;
  approvalQueue: VerifiedBillRecord[];
  readyForExport: VerifiedBillRecord[];
  blockedRecords: { record: VerifiedBillRecord; reasons: ExportBlockReason[] }[];
}

export const CRITICAL_CONFIDENCE_THRESHOLD = 85;

export const CLOSE_BOOK_CLIENTS: CloseBookClient[] = [
  {
    id: "client_laman",
    legalName: "Laman Grocer Sdn Bhd",
    tradingName: "Laman Grocer",
    ssmNo: "202001018812 (1375132-H)",
    tin: "C25880044120",
    msic: "47111",
    msicDescription: "Retail sale in non-specialised stores with food predominating",
    sstRegistrationNo: "B16-2107-32000411",
    fiscalYearEnd: "12-31",
    baseCurrency: "MYR",
    closePeriod: "2026-05",
    accountingFirm: "Awan & Partners PLT",
    erp: "AutoCount",
  },
  {
    id: "client_batik",
    legalName: "Batik Atelier KL Sdn Bhd",
    tradingName: "Batik Atelier",
    ssmNo: "201701009905 (1224070-X)",
    tin: "C22910088331",
    msic: "14101",
    msicDescription: "Manufacture of wearing apparel",
    fiscalYearEnd: "06-30",
    baseCurrency: "MYR",
    closePeriod: "2026-05",
    accountingFirm: "Awan & Partners PLT",
    erp: "SQL Account",
  },
];

export const CLOSE_BOOK_SUPPLIERS: CloseBookSupplier[] = [
  {
    id: "sup_beras",
    legalName: "Beras Murni Trading Sdn Bhd",
    ssmNo: "201401022219 (1098305-A)",
    tin: "C20477100991",
    msic: "46312",
    defaultAccountCode: "5010",
    defaultTaxCode: "SST-EX",
    erpVendorId: "AC-V000219",
    onboardingState: "known",
  },
  {
    id: "sup_cooltech",
    legalName: "CoolTech Services Sdn Bhd",
    ssmNo: "201201008818 (982338-M)",
    tin: "C21655412008",
    msic: "33140",
    sstRegistrationNo: "W10-1905-32000882",
    defaultAccountCode: "6070",
    defaultTaxCode: "SST-S8",
    erpVendorId: "AC-V000104",
    onboardingState: "known",
  },
  {
    id: "sup_meta",
    legalName: "Meta Platforms Ireland Limited",
    tin: "EI00000000010",
    msic: "73100",
    defaultAccountCode: "6030",
    defaultTaxCode: "SST-IMP",
    erpVendorId: "AC-V000331",
    onboardingState: "known",
  },
  {
    id: "sup_freshcrate",
    legalName: "FreshCrate Ventures",
    msic: "46301",
    defaultAccountCode: "5010",
    onboardingState: "pending_review",
  },
  {
    id: "sup_scan",
    legalName: "Unknown Supplier",
    onboardingState: "blocked",
  },
];

export const VERIFIED_BILL_RECORDS: VerifiedBillRecord[] = [
  {
    id: "bill_1001",
    clientId: "client_laman",
    supplierId: "sup_beras",
    status: "exported",
    intake: {
      id: "intake_wa_001",
      channel: "whatsapp",
      kind: "invoice",
      receivedAt: "2026-06-01T09:12:00+08:00",
      from: "+60 12-401 8821",
      message: "May rice invoice attached, paid from Maybank.",
      storageRef: "s3://kira-fixtures/client_laman/whatsapp/beras-murni-5221.pdf",
    },
    invoiceNumber: "BM-2026-5221",
    invoiceDate: "2026-05-29",
    dueDate: "2026-06-12",
    supplierName: "Beras Murni Trading Sdn Bhd",
    supplierTin: "C20477100991",
    subtotalMinor: 1280000,
    taxMinor: 0,
    totalMinor: 1280000,
    currency: "MYR",
    taxTreatment: "sst_exempt",
    duplicateResolved: true,
    lines: [
      {
        description: "Jasmine rice 10kg bags",
        quantity: 160,
        unitAmountMinor: 8000,
        netAmountMinor: 1280000,
        taxAmountMinor: 0,
        accountCode: "5010",
        costCentre: "LG-KL",
        taxCode: "SST-EX",
      },
    ],
    confidence: {
      supplier: 98,
      invoiceNumber: 97,
      invoiceDate: 96,
      total: 99,
      currency: 99,
      taxTreatment: 96,
      bankMatch: 98,
    },
    exceptions: [],
    bankMatch: {
      state: "matched",
      bank: "Maybank",
      accountRef: "Maybank Current •• 1188",
      transactionRef: "MBB-20260530-009812",
      paidAt: "2026-05-30T14:08:00+08:00",
      amountMinor: 1280000,
      currency: "MYR",
      score: 98,
      basis: ["amount=exact", "supplier name exact", "paid 1 day after invoice"],
    },
    supplierStatementMatch: {
      statementId: "stmt_beras_2026_05",
      supplierId: "sup_beras",
      state: "matched",
      statementDate: "2026-05-31",
      statementBalanceMinor: 0,
      matchedInvoiceRefs: ["BM-2026-5221"],
      varianceMinor: 0,
      note: "Supplier statement shows invoice paid in full.",
    },
    approval: {
      state: "approved",
      requestedBy: "Kira Close Agent",
      approver: "Nur Aisyah",
      requestedAt: "2026-06-01T09:20:00+08:00",
      approvedAt: "2026-06-01T09:41:00+08:00",
      note: "Recurring supplier and bank evidence matched.",
    },
    erpMapping: {
      destination: "AutoCount",
      vendorId: "AC-V000219",
      apAccountCode: "2100",
      expenseAccountCode: "5010",
      taxCode: "SST-EX",
      costCentre: "LG-KL",
      lhdnClassificationCode: "022",
    },
    auditTrail: [
      {
        id: "audit_1001_1",
        at: "2026-06-01T09:12:00+08:00",
        actor: "WhatsApp Intake",
        action: "intake.received",
        detail: "Invoice received from supplier WhatsApp thread.",
      },
      {
        id: "audit_1001_2",
        at: "2026-06-01T09:13:16+08:00",
        actor: "Extraction Agent",
        action: "ocr.extracted",
        detail: "Supplier, invoice number, totals and SST exemption extracted.",
      },
      {
        id: "audit_1001_3",
        at: "2026-06-01T09:18:44+08:00",
        actor: "Bank Match Agent",
        action: "bank.match",
        detail: "Matched Maybank payment MBB-20260530-009812.",
      },
      {
        id: "audit_1001_4",
        at: "2026-06-01T09:41:00+08:00",
        actor: "Nur Aisyah",
        action: "approval.approved",
        detail: "Approved for ERP and LHDN export.",
      },
      {
        id: "audit_1001_5",
        at: "2026-06-01T09:43:10+08:00",
        actor: "ERP Export Agent",
        action: "export.completed",
        detail: "Exported to AutoCount purchase bill AP-2026-05122 and LHDN archive pack.",
      },
    ],
  },
  {
    id: "bill_1002",
    clientId: "client_laman",
    supplierId: "sup_cooltech",
    status: "approved",
    intake: {
      id: "intake_email_014",
      channel: "email",
      kind: "invoice",
      receivedAt: "2026-06-03T16:25:00+08:00",
      from: "billing@cooltech.my",
      subject: "Invoice CT-88410 - chiller maintenance",
      filename: "CT-88410.pdf",
      storageRef: "s3://kira-fixtures/client_laman/email/CT-88410.pdf",
    },
    invoiceNumber: "CT-88410",
    invoiceDate: "2026-05-31",
    dueDate: "2026-06-14",
    supplierName: "CoolTech Services Sdn Bhd",
    supplierTin: "C21655412008",
    supplierSstRegistrationNo: "W10-1905-32000882",
    subtotalMinor: 240000,
    taxMinor: 19200,
    totalMinor: 259200,
    currency: "MYR",
    taxTreatment: "sst_8_service",
    duplicateResolved: true,
    lines: [
      {
        description: "Preventive maintenance for cold room compressor",
        quantity: 1,
        unitAmountMinor: 240000,
        netAmountMinor: 240000,
        taxAmountMinor: 19200,
        accountCode: "6070",
        costCentre: "LG-KL",
        taxCode: "SST-S8",
      },
    ],
    confidence: {
      supplier: 97,
      invoiceNumber: 96,
      invoiceDate: 95,
      total: 98,
      currency: 99,
      taxTreatment: 94,
      bankMatch: 91,
    },
    exceptions: [],
    bankMatch: {
      state: "suggested",
      bank: "CIMB",
      accountRef: "CIMB Business •• 7712",
      transactionRef: "CIMB-20260604-114002",
      paidAt: "2026-06-04T11:40:00+08:00",
      amountMinor: 259200,
      currency: "MYR",
      score: 91,
      basis: ["amount=exact", "supplier token match", "paid 4 days after invoice"],
    },
    supplierStatementMatch: {
      statementId: "stmt_cooltech_2026_05",
      supplierId: "sup_cooltech",
      state: "matched",
      statementDate: "2026-05-31",
      statementBalanceMinor: 259200,
      matchedInvoiceRefs: ["CT-88410"],
      varianceMinor: 0,
      note: "May statement contains the same invoice and no credit notes.",
    },
    approval: {
      state: "approved",
      requestedBy: "Kira Close Agent",
      approver: "Daniel Tan",
      requestedAt: "2026-06-04T08:15:00+08:00",
      approvedAt: "2026-06-04T09:02:00+08:00",
    },
    erpMapping: {
      destination: "AutoCount",
      vendorId: "AC-V000104",
      apAccountCode: "2100",
      expenseAccountCode: "6070",
      taxCode: "SST-S8",
      costCentre: "LG-KL",
      lhdnClassificationCode: "036",
    },
    auditTrail: [
      {
        id: "audit_1002_1",
        at: "2026-06-03T16:25:00+08:00",
        actor: "Email Intake",
        action: "intake.received",
        detail: "Supplier invoice received via AP inbox.",
      },
      {
        id: "audit_1002_2",
        at: "2026-06-03T16:26:10+08:00",
        actor: "Extraction Agent",
        action: "ocr.extracted",
        detail: "SST registration and 8% service tax extracted.",
      },
      {
        id: "audit_1002_3",
        at: "2026-06-04T09:02:00+08:00",
        actor: "Daniel Tan",
        action: "approval.approved",
        detail: "Approved chiller maintenance bill for export.",
      },
    ],
  },
  {
    id: "bill_1003",
    clientId: "client_laman",
    supplierId: "sup_meta",
    status: "ready",
    intake: {
      id: "intake_upload_021",
      channel: "upload",
      kind: "invoice",
      receivedAt: "2026-06-05T10:04:00+08:00",
      from: "client portal upload",
      filename: "Meta-Ads-MY-2026-05.pdf",
      storageRef: "s3://kira-fixtures/client_laman/upload/meta-ads-may.pdf",
    },
    invoiceNumber: "META-MY-771200",
    invoiceDate: "2026-05-31",
    dueDate: "2026-06-07",
    supplierName: "Meta Platforms Ireland Limited",
    supplierTin: "EI00000000010",
    subtotalMinor: 385000,
    taxMinor: 30800,
    totalMinor: 415800,
    currency: "MYR",
    taxTreatment: "imported_taxable_service",
    duplicateResolved: true,
    lines: [
      {
        description: "Instagram and Facebook ads - Ramadan hamper campaign",
        quantity: 1,
        unitAmountMinor: 385000,
        netAmountMinor: 385000,
        taxAmountMinor: 30800,
        accountCode: "6030",
        costCentre: "LG-MKT",
        taxCode: "SST-IMP",
      },
    ],
    confidence: {
      supplier: 96,
      invoiceNumber: 95,
      invoiceDate: 94,
      total: 95,
      currency: 96,
      taxTreatment: 89,
      bankMatch: 90,
    },
    exceptions: [],
    bankMatch: {
      state: "matched",
      bank: "Public Bank",
      accountRef: "Public Bank Visa •• 5109",
      transactionRef: "PBB-20260531-884120",
      paidAt: "2026-05-31T23:12:00+08:00",
      amountMinor: 385000,
      currency: "MYR",
      score: 90,
      basis: ["card merchant exact", "net amount matched", "imported SST self-accounted separately"],
    },
    supplierStatementMatch: {
      statementId: "stmt_meta_2026_05",
      supplierId: "sup_meta",
      state: "matched",
      statementDate: "2026-05-31",
      statementBalanceMinor: 0,
      matchedInvoiceRefs: ["META-MY-771200"],
      varianceMinor: 0,
      note: "Monthly ads invoice reconciles to card evidence.",
    },
    approval: {
      state: "pending",
      requestedBy: "Kira Close Agent",
      requestedAt: "2026-06-05T10:17:00+08:00",
      note: "Imported service tax treatment needs finance approval before export.",
    },
    erpMapping: {
      destination: "AutoCount",
      vendorId: "AC-V000331",
      apAccountCode: "2100",
      expenseAccountCode: "6030",
      taxCode: "SST-IMP",
      costCentre: "LG-MKT",
      lhdnClassificationCode: "037",
    },
    auditTrail: [
      {
        id: "audit_1003_1",
        at: "2026-06-05T10:04:00+08:00",
        actor: "Upload Intake",
        action: "intake.received",
        detail: "Client uploaded Meta invoice and card screenshot.",
      },
      {
        id: "audit_1003_2",
        at: "2026-06-05T10:12:22+08:00",
        actor: "Tax Agent",
        action: "approval.requested",
        detail: "Approval requested for imported taxable service self-accounting.",
      },
    ],
  },
  {
    id: "bill_1004",
    clientId: "client_laman",
    supplierId: "sup_freshcrate",
    status: "needs_review",
    intake: {
      id: "intake_wa_019",
      channel: "whatsapp",
      kind: "invoice",
      receivedAt: "2026-06-06T12:40:00+08:00",
      from: "+60 17-902 1130",
      message: "Fresh vegetables invoice, supplier said TIN coming later.",
      storageRef: "s3://kira-fixtures/client_laman/whatsapp/freshcrate-1107.jpg",
    },
    invoiceNumber: "FC-1107",
    invoiceDate: "2026-05-30",
    supplierName: "FreshCrate Ventures",
    subtotalMinor: 92000,
    taxMinor: 0,
    totalMinor: 92000,
    currency: "MYR",
    taxTreatment: "out_of_scope",
    duplicateResolved: true,
    lines: [
      {
        description: "Vegetable produce for prepared meals",
        quantity: 1,
        unitAmountMinor: 92000,
        netAmountMinor: 92000,
        taxAmountMinor: 0,
        accountCode: "5010",
        costCentre: "LG-KL",
        taxCode: "OUT",
      },
    ],
    confidence: {
      supplier: 87,
      invoiceNumber: 91,
      invoiceDate: 86,
      total: 93,
      currency: 95,
      taxTreatment: 82,
      bankMatch: 72,
    },
    exceptions: [
      {
        type: "new_supplier",
        message: "FreshCrate is not yet approved in the client supplier master.",
        resolved: false,
        severity: "critical",
      },
      {
        type: "missing_tax_id",
        message: "Supplier TIN is missing; LHDN export pack cannot be completed.",
        resolved: false,
        severity: "critical",
      },
      {
        type: "low_confidence",
        message: "Bank match confidence is below the close threshold.",
        resolved: false,
        severity: "warning",
      },
    ],
    bankMatch: {
      state: "suggested",
      bank: "RHB",
      accountRef: "RHB Business •• 4430",
      transactionRef: "RHB-20260602-771904",
      paidAt: "2026-06-02T17:35:00+08:00",
      amountMinor: 92000,
      currency: "MYR",
      score: 72,
      basis: ["amount=exact", "supplier nickname only", "paid 3 days after invoice"],
    },
    supplierStatementMatch: {
      statementId: "stmt_freshcrate_2026_05",
      supplierId: "sup_freshcrate",
      state: "not_found",
      statementDate: "2026-05-31",
      statementBalanceMinor: 0,
      matchedInvoiceRefs: [],
      varianceMinor: 92000,
      note: "No supplier statement has been collected for this new supplier.",
    },
    approval: {
      state: "pending",
      requestedBy: "Kira Close Agent",
      requestedAt: "2026-06-06T12:54:00+08:00",
      note: "Supplier onboarding and TIN required before approval.",
    },
    erpMapping: {
      destination: "AutoCount",
      expenseAccountCode: "5010",
      taxCode: "OUT",
      costCentre: "LG-KL",
      lhdnClassificationCode: "022",
    },
    auditTrail: [
      {
        id: "audit_1004_1",
        at: "2026-06-06T12:40:00+08:00",
        actor: "WhatsApp Intake",
        action: "intake.received",
        detail: "Invoice image received without supplier TIN.",
      },
      {
        id: "audit_1004_2",
        at: "2026-06-06T12:42:55+08:00",
        actor: "Supplier Agent",
        action: "exception.raised",
        detail: "New supplier and missing tax ID exceptions raised.",
      },
    ],
  },
  {
    id: "bill_1005",
    clientId: "client_batik",
    supplierId: "sup_cooltech",
    status: "needs_review",
    intake: {
      id: "intake_email_020",
      channel: "email",
      kind: "invoice",
      receivedAt: "2026-06-07T08:31:00+08:00",
      from: "billing@cooltech.my",
      subject: "Invoice CT-88410 reminder",
      filename: "CT-88410-copy.pdf",
      storageRef: "s3://kira-fixtures/client_batik/email/CT-88410-copy.pdf",
    },
    invoiceNumber: "CT-88410",
    invoiceDate: "2026-05-31",
    supplierName: "CoolTech Services Sdn Bhd",
    supplierTin: "C21655412008",
    supplierSstRegistrationNo: "W10-1905-32000882",
    subtotalMinor: 240000,
    taxMinor: 19200,
    totalMinor: 259200,
    currency: "MYR",
    taxTreatment: "sst_8_service",
    duplicateOf: "bill_1002",
    duplicateResolved: false,
    lines: [
      {
        description: "Preventive maintenance for cold room compressor",
        quantity: 1,
        unitAmountMinor: 240000,
        netAmountMinor: 240000,
        taxAmountMinor: 19200,
        accountCode: "6070",
        taxCode: "SST-S8",
      },
    ],
    confidence: {
      supplier: 98,
      invoiceNumber: 99,
      invoiceDate: 95,
      total: 98,
      currency: 99,
      taxTreatment: 95,
      bankMatch: 64,
    },
    exceptions: [
      {
        type: "duplicate_risk",
        message: "Same supplier, invoice number and amount as bill_1002.",
        resolved: false,
        severity: "critical",
      },
    ],
    bankMatch: {
      state: "unmatched",
      bank: "CIMB",
      accountRef: "CIMB Business •• 7712",
      score: 64,
      basis: ["invoice fields duplicate another client record", "no distinct bank evidence"],
    },
    supplierStatementMatch: {
      statementId: "stmt_cooltech_2026_05",
      supplierId: "sup_cooltech",
      state: "variance",
      statementDate: "2026-05-31",
      statementBalanceMinor: 259200,
      matchedInvoiceRefs: ["CT-88410"],
      varianceMinor: 259200,
      note: "Possible copy routed to the wrong client workspace.",
    },
    approval: {
      state: "pending",
      requestedBy: "Kira Close Agent",
      requestedAt: "2026-06-07T08:40:00+08:00",
    },
    erpMapping: {
      destination: "SQL Account",
      vendorId: "SQL-V000078",
      apAccountCode: "2100",
      expenseAccountCode: "6070",
      taxCode: "SST-S8",
    },
    auditTrail: [
      {
        id: "audit_1005_1",
        at: "2026-06-07T08:31:00+08:00",
        actor: "Email Intake",
        action: "intake.received",
        detail: "Reminder invoice received in Batik Atelier workspace.",
      },
      {
        id: "audit_1005_2",
        at: "2026-06-07T08:35:20+08:00",
        actor: "Duplicate Agent",
        action: "exception.raised",
        detail: "Duplicate risk raised against Laman Grocer bill_1002.",
      },
    ],
  },
  {
    id: "bill_1006",
    clientId: "client_batik",
    status: "received",
    intake: {
      id: "intake_upload_031",
      channel: "upload",
      kind: "invoice",
      receivedAt: "2026-06-08T18:22:00+08:00",
      from: "client portal upload",
      filename: "faded-tailor-receipt.jpg",
      storageRef: "s3://kira-fixtures/client_batik/upload/faded-tailor-receipt.jpg",
    },
    supplierName: "Unknown Supplier",
    duplicateResolved: true,
    lines: [],
    confidence: {
      supplier: 41,
      invoiceNumber: 28,
      invoiceDate: 44,
      total: 37,
      currency: 52,
      taxTreatment: 31,
      bankMatch: 0,
    },
    exceptions: [
      {
        type: "unreadable_scan",
        message: "Image is too faded to extract supplier, invoice number and totals.",
        resolved: false,
        severity: "critical",
      },
      {
        type: "low_confidence",
        message: "Critical extraction fields are below the close threshold.",
        resolved: false,
        severity: "critical",
      },
    ],
    approval: {
      state: "pending",
      requestedBy: "Kira Close Agent",
      requestedAt: "2026-06-08T18:25:00+08:00",
      note: "Client must re-upload a readable scan.",
    },
    auditTrail: [
      {
        id: "audit_1006_1",
        at: "2026-06-08T18:22:00+08:00",
        actor: "Upload Intake",
        action: "intake.received",
        detail: "Faded receipt image uploaded.",
      },
      {
        id: "audit_1006_2",
        at: "2026-06-08T18:24:10+08:00",
        actor: "Extraction Agent",
        action: "exception.raised",
        detail: "Unreadable scan and low confidence exceptions raised.",
      },
    ],
  },
  {
    id: "bill_1007",
    clientId: "client_batik",
    supplierId: "sup_beras",
    status: "extracted",
    intake: {
      id: "intake_email_027",
      channel: "email",
      kind: "invoice",
      receivedAt: "2026-06-08T09:19:00+08:00",
      from: "ar@berasmurni.my",
      subject: "BM-2026-5304",
      filename: "BM-2026-5304.pdf",
      storageRef: "s3://kira-fixtures/client_batik/email/BM-2026-5304.pdf",
    },
    invoiceNumber: "BM-2026-5304",
    invoiceDate: "2026-05-31",
    supplierName: "Beras Murni Trading Sdn Bhd",
    supplierTin: "C20477100991",
    subtotalMinor: 740000,
    taxMinor: 0,
    totalMinor: 742000,
    currency: "MYR",
    taxTreatment: "sst_exempt",
    duplicateResolved: true,
    lines: [
      {
        description: "Cotton fabric rolls",
        quantity: 20,
        unitAmountMinor: 37000,
        netAmountMinor: 740000,
        taxAmountMinor: 0,
        accountCode: "5020",
        taxCode: "SST-EX",
      },
    ],
    confidence: {
      supplier: 91,
      invoiceNumber: 92,
      invoiceDate: 88,
      total: 90,
      currency: 98,
      taxTreatment: 86,
      bankMatch: 87,
    },
    exceptions: [
      {
        type: "math_mismatch",
        message: "Line total RM7,400.00 does not match invoice total RM7,420.00.",
        resolved: false,
        severity: "critical",
      },
    ],
    bankMatch: {
      state: "matched",
      bank: "OCBC",
      accountRef: "OCBC Business •• 2081",
      transactionRef: "OCBC-20260601-110093",
      paidAt: "2026-06-01T10:00:00+08:00",
      amountMinor: 742000,
      currency: "MYR",
      score: 87,
      basis: ["amount matches invoice header", "supplier exact", "statement has different balance"],
    },
    supplierStatementMatch: {
      statementId: "stmt_beras_2026_05_batik",
      supplierId: "sup_beras",
      state: "variance",
      statementDate: "2026-05-31",
      statementBalanceMinor: 740000,
      matchedInvoiceRefs: ["BM-2026-5304"],
      varianceMinor: -2000,
      note: "Supplier statement supports RM7,400.00, not the invoice header total.",
    },
    approval: {
      state: "pending",
      requestedBy: "Kira Close Agent",
      requestedAt: "2026-06-08T09:30:00+08:00",
    },
    erpMapping: {
      destination: "SQL Account",
      vendorId: "SQL-V000044",
      apAccountCode: "2100",
      expenseAccountCode: "5020",
      taxCode: "SST-EX",
      costCentre: "BA-PROD",
      lhdnClassificationCode: "022",
    },
    auditTrail: [
      {
        id: "audit_1007_1",
        at: "2026-06-08T09:19:00+08:00",
        actor: "Email Intake",
        action: "intake.received",
        detail: "Invoice received from supplier email.",
      },
      {
        id: "audit_1007_2",
        at: "2026-06-08T09:22:33+08:00",
        actor: "Extraction Agent",
        action: "exception.raised",
        detail: "Math mismatch raised after line sum validation.",
      },
    ],
  },
];

export function emptyStatusCounts(): Record<CloseBookStatus, number> {
  return {
    received: 0,
    extracted: 0,
    needs_review: 0,
    ready: 0,
    approved: 0,
    exported: 0,
  };
}

export function getStatusCounts(records: readonly VerifiedBillRecord[]): Record<CloseBookStatus, number> {
  return records.reduce((counts, record) => {
    counts[record.status] += 1;
    return counts;
  }, emptyStatusCounts());
}

export function emptyExceptionCounts(): Record<CloseBookExceptionType, number> {
  return {
    missing_tax_id: 0,
    duplicate_risk: 0,
    math_mismatch: 0,
    new_supplier: 0,
    low_confidence: 0,
    unreadable_scan: 0,
  };
}

export function getExceptionCounts(records: readonly VerifiedBillRecord[]): Record<CloseBookExceptionType, number> {
  return records.reduce((counts, record) => {
    for (const exception of record.exceptions) {
      counts[exception.type] += 1;
    }
    return counts;
  }, emptyExceptionCounts());
}

export function getIntakeChannelCounts(records: readonly VerifiedBillRecord[]): Record<IntakeChannel, number> {
  return records.reduce(
    (counts, record) => {
      counts[record.intake.channel] += 1;
      return counts;
    },
    { whatsapp: 0, email: 0, upload: 0 },
  );
}

export function lineNetTotal(record: VerifiedBillRecord): number {
  return record.lines.reduce((sum, line) => sum + line.netAmountMinor, 0);
}

export function lineTaxTotal(record: VerifiedBillRecord): number {
  return record.lines.reduce((sum, line) => sum + line.taxAmountMinor, 0);
}

export function hasMathMismatch(record: VerifiedBillRecord): boolean {
  if (
    record.subtotalMinor === undefined ||
    record.taxMinor === undefined ||
    record.totalMinor === undefined ||
    record.lines.length === 0
  ) {
    return true;
  }

  return (
    lineNetTotal(record) !== record.subtotalMinor ||
    lineTaxTotal(record) !== record.taxMinor ||
    record.subtotalMinor + record.taxMinor !== record.totalMinor
  );
}

export function criticalConfidence(record: VerifiedBillRecord): number {
  return Math.min(
    record.confidence.supplier,
    record.confidence.invoiceNumber,
    record.confidence.total,
    record.confidence.currency,
    record.confidence.taxTreatment,
  );
}

export function getUnresolvedExceptions(record: VerifiedBillRecord): CloseBookException[] {
  return record.exceptions.filter((exception) => !exception.resolved);
}

export function getExportBlockers(
  record: VerifiedBillRecord,
  threshold = CRITICAL_CONFIDENCE_THRESHOLD,
): ExportBlockReason[] {
  const reasons: ExportBlockReason[] = [];

  if (record.status === "exported") {
    reasons.push({
      recordId: record.id,
      code: "already_exported",
      message: "Record has already been exported.",
    });
  }

  if (hasMathMismatch(record)) {
    reasons.push({
      recordId: record.id,
      code: "math_failed",
      field: "lines",
      message: "Invoice line totals, tax and header total do not reconcile.",
    });
  }

  if (record.duplicateOf && !record.duplicateResolved) {
    reasons.push({
      recordId: record.id,
      code: "duplicate_unresolved",
      field: "duplicateOf",
      message: `Potential duplicate of ${record.duplicateOf} is not resolved.`,
    });
  }

  const missingFields: string[] = [];
  if (!record.supplierId && !record.supplierName) missingFields.push("supplier");
  if (!record.invoiceNumber) missingFields.push("invoice number");
  if (record.totalMinor === undefined) missingFields.push("total");
  if (!record.currency) missingFields.push("currency");

  if (missingFields.length > 0) {
    reasons.push({
      recordId: record.id,
      code: "missing_required_field",
      message: `Missing required export field(s): ${missingFields.join(", ")}.`,
    });
  }

  if (criticalConfidence(record) < threshold) {
    reasons.push({
      recordId: record.id,
      code: "critical_confidence_low",
      message: `Critical confidence ${criticalConfidence(record)} is below threshold ${threshold}.`,
    });
  }

  if (!record.taxTreatment || getUnresolvedExceptions(record).some((exception) => exception.type === "missing_tax_id")) {
    reasons.push({
      recordId: record.id,
      code: "tax_treatment_unresolved",
      field: "taxTreatment",
      message: "Tax treatment or supplier tax identity is unresolved.",
    });
  }

  const mapping = record.erpMapping;
  if (
    !mapping?.vendorId ||
    !mapping.apAccountCode ||
    !mapping.expenseAccountCode ||
    !mapping.taxCode ||
    !mapping.lhdnClassificationCode
  ) {
    reasons.push({
      recordId: record.id,
      code: "erp_mapping_missing",
      field: "erpMapping",
      message: "ERP vendor, AP, expense, tax or LHDN classification mapping is incomplete.",
    });
  }

  if (record.approval.state !== "approved") {
    reasons.push({
      recordId: record.id,
      code: "approval_required",
      message: "Human approval is required before ERP or LHDN export.",
    });
  }

  return reasons;
}

export function canExportRecord(record: VerifiedBillRecord): boolean {
  return getExportBlockers(record).length === 0;
}

export function getPerRecordExportBlockers(
  records: readonly VerifiedBillRecord[],
): { record: VerifiedBillRecord; reasons: ExportBlockReason[] }[] {
  return records
    .map((record) => ({ record, reasons: getExportBlockers(record) }))
    .filter((item) => item.reasons.length > 0);
}

export function getReadyForExport(records: readonly VerifiedBillRecord[]): VerifiedBillRecord[] {
  return records.filter(canExportRecord);
}

export function getCloseReadiness(
  records: readonly VerifiedBillRecord[],
  currency: CurrencyCode = "MYR",
): CloseReadiness {
  const blockers = records
    .flatMap((record) => getExportBlockers(record))
    .filter((blocker) => blocker.code !== "already_exported");
  const blockedRecordIds = new Set(blockers.map((blocker) => blocker.recordId));
  const completeOrExportableRecords = records.filter(
    (record) => record.status === "exported" || canExportRecord(record),
  );
  const unresolvedCriticalExceptions = records.reduce(
    (sum, record) =>
      sum +
      record.exceptions.filter((exception) => !exception.resolved && exception.severity === "critical").length,
    0,
  );
  const approvedValueMinor = records
    .filter((record) => record.approval.state === "approved")
    .reduce((sum, record) => sum + (record.totalMinor ?? 0), 0);
  const exportedValueMinor = records
    .filter((record) => record.status === "exported")
    .reduce((sum, record) => sum + (record.totalMinor ?? 0), 0);

  const exportabilityScore = records.length === 0 ? 100 : (completeOrExportableRecords.length / records.length) * 100;
  const exceptionPenalty = Math.min(unresolvedCriticalExceptions * 7, 35);
  const score = Math.max(0, Math.round(exportabilityScore - exceptionPenalty));

  return {
    score,
    totalRecords: records.length,
    exportableRecords: records.filter(canExportRecord).length,
    blockedRecords: blockedRecordIds.size,
    unresolvedCriticalExceptions,
    approvedValueMinor,
    exportedValueMinor,
    currency,
    blockers,
  };
}

export function getWorkflowDashboard(records: readonly VerifiedBillRecord[] = VERIFIED_BILL_RECORDS): WorkflowDashboard {
  return {
    statusCounts: getStatusCounts(records),
    exceptionCounts: getExceptionCounts(records),
    channelCounts: getIntakeChannelCounts(records),
    closeReadiness: getCloseReadiness(records),
    approvalQueue: records.filter((record) => record.approval.state === "pending"),
    readyForExport: getReadyForExport(records),
    blockedRecords: getPerRecordExportBlockers(records),
  };
}

export function formatCloseBookStatus(status: CloseBookStatus): string {
  return status
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatExceptionType(type: CloseBookExceptionType): string {
  return type
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatBillAmount(record: VerifiedBillRecord): string {
  if (record.totalMinor === undefined || !record.currency) return "Missing total";
  return money(record.totalMinor, record.currency);
}

export function describeExportBlockers(record: VerifiedBillRecord): string[] {
  return getExportBlockers(record).map((reason) => reason.message);
}
