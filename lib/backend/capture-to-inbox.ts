import type { Receipt } from "@/lib/types";
import type { VerifiedBillRecord } from "@/lib/erp-close";
import { appendAudit, nextId, state } from "./state";

function classifyTaxTreatment(receipt: Receipt): VerifiedBillRecord["taxTreatment"] {
  if (receipt.taxMinor > 0) return "sst_8_service";
  return "out_of_scope";
}

function enrichKnownMalaysianDemoSupplier(bill: VerifiedBillRecord) {
  if (!/kira compliance/i.test(bill.supplierName ?? "")) return;
  bill.supplierTin = "C2584563222";
  bill.supplierSstRegistrationNo = "A01-2345-67891012";
  bill.supplierId = "sup_kira_compliance_demo";
  bill.erpMapping = {
    destination: "SQL Account",
    vendorId: "KIRA-COMPLIANCE",
    apAccountCode: "2100",
    expenseAccountCode: bill.lines[0]?.accountCode ?? "5010",
    taxCode: bill.lines[0]?.taxCode ?? "SST-S8",
    costCentre: bill.lines[0]?.costCentre,
    lhdnClassificationCode: "001",
  };
}

export function linkReceiptToInvoiceInbox(receipt: Receipt): VerifiedBillRecord {
  const existing = state.closeBookRecords.find((record) => record.intake.id === receipt.id);
  if (existing) return existing;

  const subtotalMinor = Math.max(0, receipt.totalMinor - receipt.taxMinor);
  const bill: VerifiedBillRecord = {
    id: nextId("bill_live", state.closeBookRecords),
    clientId: state.closeBookClients[0]?.id ?? state.org.id,
    status: "received",
    intake: {
      id: receipt.id,
      channel: receipt.capturedVia === "email" ? "email" : "upload",
      kind: "invoice",
      receivedAt: receipt.capturedAt,
      from: receipt.capturedVia,
      filename: `${receipt.docNo ?? receipt.id}.png`,
      subject: `Captured invoice ${receipt.docNo ?? receipt.id}`,
      storageRef: `capture://${receipt.id}`,
    },
    invoiceNumber: receipt.docNo,
    invoiceDate: receipt.docDate,
    supplierName: receipt.supplier,
    subtotalMinor,
    taxMinor: receipt.taxMinor,
    totalMinor: receipt.totalMinor,
    currency: receipt.currency,
    taxTreatment: classifyTaxTreatment(receipt),
    duplicateResolved: false,
    lines: receipt.lineItems.map((line) => ({
      description: line.label,
      quantity: 1,
      unitAmountMinor: line.amountMinor,
      netAmountMinor: line.amountMinor,
      taxAmountMinor: 0,
      accountCode: receipt.suggestedAccount,
      costCentre: receipt.suggestedCostCentre,
      taxCode: receipt.suggestedTaxCode,
    })),
    confidence: {
      supplier: receipt.ocrConfidence,
      invoiceNumber: receipt.docNo ? receipt.ocrConfidence : 45,
      invoiceDate: receipt.ocrConfidence,
      total: receipt.ocrConfidence,
      currency: 95,
      taxTreatment: receipt.taxMinor > 0 ? 90 : 78,
      bankMatch: 0,
    },
    exceptions: [],
    approval: { state: "pending", requestedBy: "Kira Capture", requestedAt: new Date().toISOString() },
    auditTrail: [
      {
        id: `evt_${receipt.id}`,
        at: receipt.capturedAt,
        actor: "Kira Capture",
        action: "intake.received",
        detail: `Capture ${receipt.id} linked into invoice inbox for close workflow.`,
      },
    ],
  };
  enrichKnownMalaysianDemoSupplier(bill);
  state.closeBookRecords.unshift(bill);
  appendAudit({
    actor: "Kira Capture",
    action: "capture.to_inbox",
    target: bill.id,
    detail: `Linked captured invoice ${receipt.id} to invoice inbox as ${bill.id}.`,
    tier: 2,
  });
  return bill;
}
