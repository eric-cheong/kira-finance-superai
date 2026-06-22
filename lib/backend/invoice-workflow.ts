import type { AuditEvent, VerifiedBillRecord } from "@/lib/erp-close";
import { verifyInvoiceForLhdnAndStatement } from "./invoice-verification";
import { appendAudit, confirmationRef, persistState, state } from "./state";

export interface InvoiceWorkflowStepResult {
  record: VerifiedBillRecord;
  event: AuditEvent;
  blocked: boolean;
  nextAction: string;
}

function getRecord(id: string) {
  const record = state.closeBookRecords.find((item) => item.id === id);
  if (!record) throw new Error(`Close-book bill ${id} was not found.`);
  return record;
}

function addRecordEvent(record: VerifiedBillRecord, action: AuditEvent["action"], detail: string, actor = "Kira Invoice Workflow") {
  const event: AuditEvent = {
    id: confirmationRef(`${record.id}|${action}|${record.auditTrail.length}`),
    at: new Date().toISOString(),
    actor,
    action,
    detail,
  };
  record.auditTrail.push(event);
  return event;
}

function extractPendingBill(record: VerifiedBillRecord): InvoiceWorkflowStepResult {
  const filename = record.intake.filename ?? record.intake.subject ?? "Inbound invoice";
  const supplierGuess = record.supplierName && record.supplierName !== "Pending extraction"
    ? record.supplierName
    : filename.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]/g, " ").slice(0, 80) || "Unknown Supplier";
  record.status = "extracted";
  record.supplierName = supplierGuess;
  record.invoiceNumber = record.invoiceNumber ?? filename.match(/[A-Z]{2,}-?\d{2,}/i)?.[0]?.toUpperCase();
  record.invoiceDate = record.invoiceDate ?? new Date().toISOString().slice(0, 10);
  record.currency = record.currency ?? "MYR";
  record.totalMinor = record.totalMinor ?? 0;
  record.taxMinor = record.taxMinor ?? 0;
  record.subtotalMinor = record.subtotalMinor ?? Math.max(0, record.totalMinor - record.taxMinor);
  record.confidence = {
    ...record.confidence,
    supplier: Math.max(record.confidence.supplier, supplierGuess === "Unknown Supplier" ? 62 : 82),
    invoiceNumber: Math.max(record.confidence.invoiceNumber, record.invoiceNumber ? 80 : 45),
    invoiceDate: Math.max(record.confidence.invoiceDate, 75),
    total: Math.max(record.confidence.total, record.totalMinor > 0 ? 84 : 50),
    currency: Math.max(record.confidence.currency, 90),
  };
  if (record.lines.length === 0) {
    record.lines.push({
      description: "Pending line-item extraction",
      quantity: 1,
      unitAmountMinor: record.totalMinor ?? 0,
      netAmountMinor: record.subtotalMinor ?? 0,
      taxAmountMinor: record.taxMinor ?? 0,
    });
  }
  const event = addRecordEvent(record, "ocr.extracted", `Extracted ${supplierGuess} from ${record.intake.channel} document ${record.intake.id}.`);
  appendAudit({
    actor: "Kira Invoice Workflow",
    action: "ocr.extracted",
    target: record.id,
    detail: event.detail,
    tier: 2,
  });
  return { record, event, blocked: false, nextAction: "validate_invoice" };
}

function gateExtractedBill(record: VerifiedBillRecord): InvoiceWorkflowStepResult {
  const criticalConfidence = Math.min(
    record.confidence.supplier,
    record.confidence.invoiceNumber,
    record.confidence.invoiceDate,
    record.confidence.total,
    record.confidence.currency,
  );
  const missingInvoiceNumber = !record.invoiceNumber;
  const lowConfidence = criticalConfidence < 85;
  record.exceptions = record.exceptions.filter((exception) => exception.type !== "low_confidence");
  if (missingInvoiceNumber || lowConfidence) {
    record.status = "needs_review";
    record.exceptions.push({
      type: "low_confidence",
      severity: criticalConfidence < 70 ? "critical" : "warning",
      resolved: false,
      message: missingInvoiceNumber
        ? "Invoice number is missing after OCR; human review required."
        : `Critical extraction confidence ${criticalConfidence}% is below the 85% auto-close threshold.`,
    });
    const event = addRecordEvent(record, "exception.raised", record.exceptions[record.exceptions.length - 1].message);
    appendAudit({
      actor: "Kira Invoice Workflow",
      action: "exception.raised",
      target: record.id,
      detail: event.detail,
      tier: criticalConfidence < 70 ? 4 : 3,
    });
    return { record, event, blocked: true, nextAction: "human_review_required" };
  }

  const verification = verifyInvoiceForLhdnAndStatement(record);
  record.exceptions = record.exceptions.filter(
    (exception) => !["missing_tax_id", "math_mismatch", "new_supplier"].includes(exception.type),
  );
  if (verification.lhdnMissingFields.length > 0) {
    record.exceptions.push({
      type: "missing_tax_id",
      severity: verification.lhdnMissingFields.includes("supplierTin") ? "critical" : "warning",
      resolved: false,
      message: `LHDN/MyInvois required fields missing: ${verification.lhdnMissingFields.join(", ")}.`,
    });
  }
  if (!verification.mathOk) {
    record.exceptions.push({
      type: "math_mismatch",
      severity: "critical",
      resolved: false,
      message: "Invoice subtotal, tax, total, or line amounts do not reconcile for LHDN validation.",
    });
  }
  if (!verification.statementFound) {
    record.supplierStatementMatch = record.supplierStatementMatch ?? {
      statementId: "missing_supplier_statement",
      supplierId: record.supplierId ?? record.supplierName ?? "unknown_supplier",
      state: "not_found",
      statementDate: new Date().toISOString().slice(0, 10),
      statementBalanceMinor: 0,
      matchedInvoiceRefs: record.invoiceNumber ? [record.invoiceNumber] : [],
      varianceMinor: record.totalMinor ?? 0,
      note: "Supplier statement not attached or imported yet; reconciliation is blocked.",
    };
    record.exceptions.push({
      type: "new_supplier",
      severity: "warning",
      resolved: false,
      message: "Supplier statement missing; upload/import statement before close-book reconciliation.",
    });
  }
  if (record.exceptions.some((exception) => !exception.resolved)) {
    record.status = "needs_review";
    const event = addRecordEvent(record, "exception.raised", record.exceptions[record.exceptions.length - 1].message);
    appendAudit({
      actor: "Kira Invoice Workflow",
      action: "exception.raised",
      target: record.id,
      detail: `Verification blocked: ${record.exceptions.filter((exception) => !exception.resolved).map((exception) => exception.message).join(" ")}`,
      tier: record.exceptions.some((exception) => exception.severity === "critical") ? 4 : 3,
    });
    return { record, event, blocked: true, nextAction: "resolve_lhdn_or_statement_reconciliation" };
  }

  record.status = "ready";
  const event = addRecordEvent(record, "approval.requested", "Invoice passed extraction gates and is ready for approval/export checks.");
  appendAudit({
    actor: "Kira Invoice Workflow",
    action: "approval.requested",
    target: record.id,
    detail: event.detail,
    tier: 3,
  });
  return { record, event, blocked: false, nextAction: "approval_required" };
}

export function runNextInvoiceStep(id: string): InvoiceWorkflowStepResult {
  const record = getRecord(id);
  let result: InvoiceWorkflowStepResult;
  if (record.status === "received") {
    result = extractPendingBill(record);
  } else if (record.status === "extracted" || record.status === "needs_review") {
    result = gateExtractedBill(record);
  } else {
    const event = addRecordEvent(record, "export.blocked", `No automatic transition for status ${record.status}.`);
    result = { record, event, blocked: true, nextAction: "no_safe_automatic_transition" };
  }
  persistState();
  return result;
}

export function runInvoiceWorkflowUntilBlocked(id: string, maxSteps = 8) {
  const results: InvoiceWorkflowStepResult[] = [];
  for (let i = 0; i < maxSteps; i += 1) {
    const result = runNextInvoiceStep(id);
    results.push(result);
    if (result.blocked || result.record.status === "ready" || result.record.status === "approved" || result.record.status === "exported") break;
  }
  return results;
}
