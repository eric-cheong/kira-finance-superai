import assert from "node:assert/strict";
import crypto from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { putDocumentLocal } from "../lib/backend/document-storage";
import { ingestEmailWebhook, ingestWhatsAppWebhook, normalizeEmailWebhookPayload, normalizeWhatsAppWebhookPayload } from "../lib/backend/intake";
import { createInitialStateForMode, state } from "../lib/backend/state";
import { linkReceiptToInvoiceInbox } from "../lib/backend/capture-to-inbox";
import { runNextInvoiceStep } from "../lib/backend/invoice-workflow";

test("local document storage hashes content and writes under the tenant-safe document root", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "kira-docs-"));
  try {
    const stored = await putDocumentLocal(Buffer.from("invoice-pdf"), {
      rootDir: root,
      clientId: "client_laman",
      source: "email",
      filename: "Invoice 001.pdf",
      contentType: "application/pdf",
    });

    assert.equal(stored.sha256, "fe2ddf5af6ca0974ba560124666bcc78e9a8547ca0cb780a717e3d069f8aeb49");
    assert.equal(stored.storageRef.startsWith("file://"), true);
    assert.equal(stored.storageRef.includes("Invoice 001.pdf"), false, "storage key must be sanitized/hash-based, not raw filename-based");
    assert.equal(stored.sizeBytes, 11);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("email webhook ingestion is idempotent and creates a close-book received bill", async () => {
  const nonce = crypto.randomUUID();
  const beforeDocs = state.sourceDocuments.length;
  const beforeBills = state.closeBookRecords.length;
  const payload = {
    provider: "postmark" as const,
    providerEventId: `evt_test_email_${nonce}`,
    messageId: `<invoice-${nonce}@supplier.test>`,
    from: "billing@supplier.test",
    to: "inbox+client_laman@kira.test",
    subject: "Invoice INV-100",
    textBody: "Attached invoice",
    attachments: [
      {
        filename: "INV-100.pdf",
        contentType: "application/pdf",
        contentBase64: Buffer.from(`invoice-100-${nonce}`).toString("base64"),
      },
    ],
  };

  const first = await ingestEmailWebhook(payload);
  const second = await ingestEmailWebhook(payload);

  assert.equal(first.idempotentReplay, false);
  assert.equal(second.idempotentReplay, true);
  assert.equal(second.intakeEvent.id, first.intakeEvent.id);
  assert.equal(state.sourceDocuments.length, beforeDocs + 1);
  assert.equal(state.closeBookRecords.length, beforeBills + 1);
  assert.equal(first.bill?.status, "received");
  assert.equal(first.bill?.intake.channel, "email");
});

test("whatsapp ingestion verifies idempotency by message id and records media evidence", async () => {
  const nonce = crypto.randomUUID();
  const payload = {
    provider: "meta-cloud" as const,
    messageId: `wamid.${nonce}`,
    from: "+60124018821",
    businessPhoneNumberId: "123456",
    receivedAt: new Date().toISOString(),
    text: "Invoice attached",
    media: {
      id: `media_${nonce}`,
      filename: "freshcrate.jpg",
      contentType: "image/jpeg",
      contentBase64: Buffer.from(`jpg-bytes-${nonce}`).toString("base64"),
    },
  };

  const first = await ingestWhatsAppWebhook(payload);
  const second = await ingestWhatsAppWebhook(payload);

  assert.equal(first.idempotentReplay, false);
  assert.equal(second.idempotentReplay, true);
  assert.equal(first.bill?.intake.channel, "whatsapp");
  assert.equal(first.sourceDocument.channel, "whatsapp");
});

test("invoice workflow advances received bills to extracted then review/ready without exporting", async () => {
  const nonce = crypto.randomUUID();
  const payload = {
    provider: "postmark" as const,
    providerEventId: `evt_workflow_${nonce}`,
    messageId: `<workflow-${nonce}@supplier.test>`,
    from: "billing@supplier.test",
    to: "inbox+client_laman@kira.test",
    subject: "Invoice WF-100",
    attachments: [
      {
        filename: "WF-100.pdf",
        contentType: "application/pdf",
        contentBase64: Buffer.from(`wf-100-${nonce}`).toString("base64"),
      },
    ],
  };
  const intake = await ingestEmailWebhook(payload);
  assert.ok(intake.bill);

  const extracted = runNextInvoiceStep(intake.bill.id);
  assert.equal(extracted.record.status, "extracted");
  assert.equal(extracted.event.action, "ocr.extracted");

  const gated = runNextInvoiceStep(intake.bill.id);
  assert.match(["needs_review", "ready"].join("|"), new RegExp(gated.record.status));
  assert.notEqual(gated.record.status, "exported");
});

test("no-seed local demo mode keeps reference masters but starts with empty workflow data", () => {
  const seeded = createInitialStateForMode({ demoSeed: true });
  const clean = createInitialStateForMode({ demoSeed: false });

  assert.ok(seeded.closeBookRecords.length > 0);
  assert.equal(clean.closeBookRecords.length, 0);
  assert.equal(clean.receipts.length, 0);
  assert.equal(clean.transactions.length, 0);
  assert.equal(clean.einvoices.length, 0);
  assert.equal(clean.approvals.length, 0);
  assert.ok(clean.closeBookClients.length > 0, "client reference data remains available for local webhook routing");
  assert.ok(clean.accounts.length > 0, "account reference data remains available for coding");
});

test("provider-native Postmark payload normalizes into email intake payload", () => {
  const normalized = normalizeEmailWebhookPayload({
    MessageID: "postmark-message-1",
    From: "billing@supplier.test",
    To: "inbox+client_laman@kira.test",
    Subject: "Invoice PM-1",
    TextBody: "Attached",
    Attachments: [
      {
        Name: "PM-1.pdf",
        ContentType: "application/pdf",
        Content: Buffer.from("pm-1").toString("base64"),
      },
    ],
  });

  assert.equal(normalized.provider, "postmark");
  assert.equal(normalized.providerEventId, "postmark-message-1");
  assert.equal(normalized.attachments[0].filename, "PM-1.pdf");
});

test("Meta Cloud API webhook payload normalizes into whatsapp intake payload with local media placeholder", async () => {
  const normalized = await normalizeWhatsAppWebhookPayload({
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { phone_number_id: "phone_123" },
              messages: [
                {
                  id: "wamid.test1",
                  from: "60123456789",
                  timestamp: "1760000000",
                  type: "document",
                  document: { id: "media_123", filename: "invoice.pdf", mime_type: "application/pdf" },
                },
              ],
            },
          },
        ],
      },
    ],
  });

  assert.equal(normalized.provider, "meta-cloud");
  assert.equal(normalized.messageId, "wamid.test1");
  assert.equal(normalized.media.id, "media_123");
  assert.equal(normalized.media.filename, "invoice.pdf");
  assert.ok(normalized.media.contentBase64.length > 0);
});

test("confirmed capture appears in invoice inbox as a live close-book bill", () => {
  const beforeBills = state.closeBookRecords.length;
  const nonce = crypto.randomUUID();
  const receipt = {
    id: `rcp_test_${nonce}`,
    kind: "invoice" as const,
    capturedAt: new Date().toISOString(),
    capturedVia: "upload" as const,
    supplier: "Kira Compliance Sdn. Bhd.",
    totalMinor: 486000,
    taxMinor: 36000,
    currency: "MYR" as const,
    docDate: "2026-06-06",
    docNo: `INV-2026-${nonce.slice(0, 6)}`,
    ocrConfidence: 94,
    suggestedAccount: "5010",
    suggestedTaxCode: "SST-S8",
    suggestedCostCentre: "CC-TTDI",
    status: "confirmed" as const,
    thumbHint: "invoice",
    lineItems: [{ label: "MyInvois integration and compliance setup", amountMinor: 250000 }],
  };

  const bill = linkReceiptToInvoiceInbox(receipt);

  assert.equal(state.closeBookRecords.length, beforeBills + 1);
  assert.equal(bill.intake.channel, "upload");
  assert.equal(bill.status, "received");
  assert.equal(bill.invoiceNumber, receipt.docNo);
  assert.equal(bill.totalMinor, 486000);
});

test("workflow verifies LHDN required fields and blocks supplier-statement reconciliation when missing", () => {
  const nonce = crypto.randomUUID();
  const receipt = {
    id: `rcp_verify_${nonce}`,
    kind: "invoice" as const,
    capturedAt: new Date().toISOString(),
    capturedVia: "upload" as const,
    supplier: "Kira Compliance Sdn. Bhd.",
    totalMinor: 486000,
    taxMinor: 36000,
    currency: "MYR" as const,
    docDate: "2026-06-06",
    docNo: `INV-2026-${nonce.slice(0, 6)}`,
    ocrConfidence: 94,
    suggestedAccount: "5010",
    suggestedTaxCode: "SST-S8",
    suggestedCostCentre: "CC-TTDI",
    status: "confirmed" as const,
    thumbHint: "invoice",
    lineItems: [{ label: "MyInvois integration and compliance setup", amountMinor: 250000 }],
  };
  const bill = linkReceiptToInvoiceInbox(receipt);

  const extracted = runNextInvoiceStep(bill.id);
  assert.equal(extracted.record.status, "extracted");
  const verified = runNextInvoiceStep(bill.id);

  assert.equal(verified.record.status, "needs_review");
  assert.equal(verified.record.exceptions.some((exception) => exception.type === "missing_tax_id"), false);
  assert.equal(verified.record.supplierStatementMatch?.state, "not_found");
  assert.ok(verified.record.exceptions.some((exception) => exception.message.includes("Supplier statement")));
});
