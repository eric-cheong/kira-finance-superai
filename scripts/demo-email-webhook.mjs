#!/usr/bin/env node
import { randomUUID } from "node:crypto";

const baseUrl = process.env.KIRA_DEMO_BASE_URL ?? process.argv[2] ?? "http://localhost:3000";
const nonce = randomUUID();
const invoiceText = [
  "Kira Compliance Sdn. Bhd.",
  "Tax Invoice INV-DEMO-" + nonce.slice(0, 8),
  "Date: 2026-06-24",
  "Subtotal: MYR 4,500.00",
  "SST 8%: MYR 360.00",
  "Total: MYR 4,860.00",
].join("\n");

const payload = {
  provider: "postmark",
  providerEventId: `demo-email-${nonce}`,
  messageId: `<demo-${nonce}@supplier.test>`,
  from: "billing@kira-compliance.test",
  to: "inbox+client_laman@kira.local",
  subject: `Invoice INV-DEMO-${nonce.slice(0, 8)}`,
  textBody: "Demo invoice for the 5-minute Kira workflow walkthrough.",
  attachments: [
    {
      filename: `INV-DEMO-${nonce.slice(0, 8)}.txt`,
      contentType: "text/plain",
      contentBase64: Buffer.from(invoiceText).toString("base64"),
    },
  ],
};

const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/webhooks/email`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

const body = await response.json();
if (!response.ok || !body.ok) {
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: body.ok,
  billId: body.data.bill?.id,
  status: body.data.bill?.status,
  sourceDocumentId: body.data.sourceDocument?.id,
  subject: payload.subject,
  next: `${baseUrl.replace(/\/$/, "")}/inbox`,
}, null, 2));
