import { money } from "@/lib/format";
import type { IntakeEvent, SourceDocument, WebhookEventReceipt } from "@/lib/types";
import type { VerifiedBillRecord } from "@/lib/erp-close";
import { appendAudit, nextId, persistState, state } from "./state";
import { putDocument } from "./document-storage";

export type EmailWebhookPayload = {
  provider: "postmark" | "sendgrid" | "mailgun" | "generic-email";
  providerEventId?: string;
  messageId?: string;
  from: string;
  to?: string;
  subject?: string;
  textBody?: string;
  attachments: Array<{
    filename?: string;
    contentType?: string;
    contentBase64: string;
  }>;
};

export type WhatsAppWebhookPayload = {
  provider: "meta-cloud" | "twilio" | "360dialog" | "generic-whatsapp";
  messageId: string;
  from: string;
  businessPhoneNumberId?: string;
  receivedAt?: string;
  text?: string;
  media: {
    id: string;
    filename?: string;
    contentType?: string;
    contentBase64: string;
  };
};

export interface IntakeResult {
  idempotentReplay: boolean;
  sourceDocument: SourceDocument;
  intakeEvent: IntakeEvent;
  bill?: VerifiedBillRecord;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export function normalizeEmailWebhookPayload(payload: unknown): EmailWebhookPayload {
  const body = isRecord(payload) ? payload : {};
  if (typeof body.provider === "string" && Array.isArray(body.attachments)) {
    return body as EmailWebhookPayload;
  }
  if (Array.isArray(body.Attachments)) {
    return {
      provider: "postmark",
      providerEventId: stringValue(body.MessageID) ?? stringValue(body.MessageId) ?? stringValue(body.MessageIDHash),
      messageId: stringValue(body.MessageID) ?? stringValue(body.MessageId),
      from: stringValue(body.From) ?? "unknown-email-sender",
      to: stringValue(body.To),
      subject: stringValue(body.Subject),
      textBody: stringValue(body.TextBody) ?? stringValue(body.HtmlBody),
      attachments: body.Attachments.map((raw): EmailWebhookPayload["attachments"][number] => {
        const attachment = isRecord(raw) ? raw : {};
        return {
          filename: stringValue(attachment.Name) ?? stringValue(attachment.filename),
          contentType: stringValue(attachment.ContentType) ?? stringValue(attachment.contentType),
          contentBase64: stringValue(attachment.Content) ?? stringValue(attachment.contentBase64) ?? "",
        };
      }),
    };
  }
  throw new Error("Unsupported email webhook payload. Send normalized JSON or Postmark inbound JSON.");
}

async function fetchMetaMedia(mediaId: string, contentType: string, filename?: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) {
    return {
      filename: filename ?? `${mediaId}.txt`,
      contentType: "text/plain",
      contentBase64: Buffer.from(`Meta media ${mediaId} received. Configure WHATSAPP_ACCESS_TOKEN to download the real media bytes.`).toString("base64"),
    };
  }
  const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION ?? "v21.0";
  const meta = await fetch(`https://graph.facebook.com/${apiVersion}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!meta.ok) throw new Error(`Meta media metadata fetch failed: ${meta.status}`);
  const metadata = (await meta.json()) as { url?: string; mime_type?: string };
  if (!metadata.url) throw new Error("Meta media metadata did not include a download URL.");
  const media = await fetch(metadata.url, { headers: { Authorization: `Bearer ${token}` } });
  if (!media.ok) throw new Error(`Meta media download failed: ${media.status}`);
  const bytes = Buffer.from(await media.arrayBuffer());
  return {
    filename: filename ?? `${mediaId}`,
    contentType: metadata.mime_type ?? contentType,
    contentBase64: bytes.toString("base64"),
  };
}

export async function normalizeWhatsAppWebhookPayload(payload: unknown): Promise<WhatsAppWebhookPayload> {
  const body = isRecord(payload) ? payload : {};
  if (typeof body.provider === "string" && isRecord(body.media)) {
    return body as WhatsAppWebhookPayload;
  }
  const entry = isRecord(arrayValue(body.entry)[0]) ? (arrayValue(body.entry)[0] as Record<string, unknown>) : {};
  const change = isRecord(arrayValue(entry.changes)[0]) ? (arrayValue(entry.changes)[0] as Record<string, unknown>) : {};
  const value = isRecord(change.value) ? change.value : {};
  const message = isRecord(arrayValue(value.messages)[0]) ? (arrayValue(value.messages)[0] as Record<string, unknown>) : undefined;
  if (!message) throw new Error("Meta WhatsApp webhook contained no inbound message.");
  const metadata = isRecord(value.metadata) ? value.metadata : {};
  const type = stringValue(message.type) ?? "text";
  const mediaNode = isRecord(message.document)
    ? message.document
    : isRecord(message.image)
      ? message.image
      : isRecord(message.audio)
        ? message.audio
        : isRecord(message.video)
          ? message.video
          : undefined;
  const mediaId = stringValue(mediaNode?.id) ?? stringValue(message.id) ?? "text-message";
  const filename = stringValue(mediaNode?.filename) ?? `${type}-${mediaId}.txt`;
  const contentType = stringValue(mediaNode?.mime_type) ?? (type === "image" ? "image/jpeg" : "application/octet-stream");
  const media = await fetchMetaMedia(mediaId, contentType, filename);
  const timestamp = stringValue(message.timestamp);
  return {
    provider: "meta-cloud",
    messageId: stringValue(message.id) ?? mediaId,
    from: stringValue(message.from) ?? "unknown-whatsapp-sender",
    businessPhoneNumberId: stringValue(metadata.phone_number_id),
    receivedAt: timestamp ? new Date(Number(timestamp) * 1000).toISOString() : new Date().toISOString(),
    text: stringValue(isRecord(message.text) ? message.text.body : undefined),
    media: {
      id: mediaId,
      filename: media.filename,
      contentType: media.contentType,
      contentBase64: media.contentBase64,
    },
  };
}

function decodeAttachment(contentBase64: string) {
  const buffer = Buffer.from(contentBase64, "base64");
  if (buffer.length === 0) throw new Error("Attachment content is empty or invalid base64.");
  if (buffer.length > 15_000_000) throw new Error("Attachment exceeds the 15MB intake limit.");
  return buffer;
}

function clientIdFromEmail(to?: string) {
  const match = to?.match(/\+([a-zA-Z0-9_-]+)@/);
  const candidate = match?.[1];
  return state.closeBookClients.some((client) => client.id === candidate)
    ? candidate!
    : state.closeBookClients[0]?.id ?? state.org.id;
}

function clientIdFromWhatsApp(_payload: WhatsAppWebhookPayload) {
  // MVP default: all inbound WhatsApp docs land in the active accounting-firm client.
  // Next step is a tenant routing table keyed by businessPhoneNumberId + sender phone.
  return state.closeBookClients[0]?.id ?? state.org.id;
}

function existingReplay(idempotencyKey: string): IntakeResult | null {
  const receipt = state.webhookEvents.find((event) => event.idempotencyKey === idempotencyKey);
  if (!receipt) return null;
  receipt.replayCount += 1;
  receipt.lastSeenAt = new Date().toISOString();
  const sourceDocument = state.sourceDocuments.find((doc) => doc.id === receipt.sourceDocumentId);
  const intakeEvent = state.intakeEvents.find((event) => event.id === receipt.intakeEventId);
  if (!sourceDocument || !intakeEvent) return null;
  persistState();
  return {
    idempotentReplay: true,
    sourceDocument,
    intakeEvent,
    bill: sourceDocument.linkedBillId
      ? state.closeBookRecords.find((record) => record.id === sourceDocument.linkedBillId)
      : undefined,
  };
}

function classifyKind(filename?: string, contentType?: string): SourceDocument["kind"] {
  const name = `${filename ?? ""} ${contentType ?? ""}`.toLowerCase();
  if (name.includes("statement")) return "supplier_statement";
  if (name.includes("receipt")) return "receipt";
  if (name.includes("pdf") || name.includes("invoice") || name.includes("image/")) return "invoice";
  return "unknown";
}

function createBillFromSourceDocument(doc: SourceDocument): VerifiedBillRecord {
  const bill: VerifiedBillRecord = {
    id: nextId("bill_live", state.closeBookRecords),
    clientId: doc.clientId,
    status: "received",
    intake: {
      id: doc.id,
      channel: doc.channel,
      kind: doc.kind === "unknown" ? "invoice" : doc.kind,
      receivedAt: doc.receivedAt,
      from: doc.from,
      filename: doc.filename,
      subject: doc.subject,
      message: doc.message,
      storageRef: doc.storageRef,
    },
    supplierName: "Pending extraction",
    duplicateResolved: false,
    lines: [],
    confidence: {
      supplier: 0,
      invoiceNumber: 0,
      invoiceDate: 0,
      total: 0,
      currency: 0,
      taxTreatment: 0,
      bankMatch: 0,
    },
    exceptions: [],
    approval: { state: "pending", requestedBy: "Kira Intake Orchestrator", requestedAt: new Date().toISOString() },
    auditTrail: [
      {
        id: `evt_${doc.id}`,
        at: doc.receivedAt,
        actor: `${doc.provider} webhook`,
        action: "intake.received",
        detail: `Received ${doc.channel} ${doc.kind} from ${doc.from}; stored as ${doc.storageRef}.`,
      },
    ],
  };
  state.closeBookRecords.unshift(bill);
  doc.status = "workflow_created";
  doc.linkedBillId = bill.id;
  appendAudit({
    actor: "Kira Intake Orchestrator",
    action: "intake.received",
    target: bill.id,
    detail: `Created close-book workflow from ${doc.channel} document ${doc.id}.`,
    tier: 1,
  });
  return bill;
}

async function persistInboundDocument(input: {
  clientId: string;
  channel: SourceDocument["channel"];
  provider: string;
  providerEventId: string;
  idempotencyKey: string;
  receivedAt: string;
  from: string;
  subject?: string;
  message?: string;
  filename?: string;
  contentType: string;
  buffer: Buffer;
}): Promise<IntakeResult> {
  const stored = await putDocument(input.buffer, {
    clientId: input.clientId,
    source: input.channel,
    filename: input.filename,
    contentType: input.contentType,
    receivedAt: input.receivedAt,
  });

  const duplicateByHash = state.sourceDocuments.find(
    (doc) => doc.clientId === input.clientId && doc.sha256 === stored.sha256,
  );
  if (duplicateByHash) {
    const replay = existingReplay(duplicateByHash.idempotencyKey);
    if (replay) return { ...replay, idempotentReplay: true };
  }

  const sourceDocument: SourceDocument = {
    id: nextId("srcdoc", state.sourceDocuments),
    clientId: input.clientId,
    channel: input.channel,
    kind: classifyKind(input.filename, input.contentType),
    receivedAt: input.receivedAt,
    from: input.from,
    subject: input.subject,
    message: input.message,
    filename: input.filename,
    contentType: input.contentType,
    sizeBytes: stored.sizeBytes,
    sha256: stored.sha256,
    storageRef: stored.storageRef,
    status: "stored",
    provider: input.provider,
    providerEventId: input.providerEventId,
    idempotencyKey: input.idempotencyKey,
  };
  state.sourceDocuments.unshift(sourceDocument);

  const intakeEvent: IntakeEvent = {
    id: nextId("intake", state.intakeEvents),
    sourceDocumentId: sourceDocument.id,
    clientId: input.clientId,
    channel: input.channel,
    provider: input.provider,
    providerEventId: input.providerEventId,
    idempotencyKey: input.idempotencyKey,
    receivedAt: input.receivedAt,
    from: input.from,
    summary: input.subject || input.message || `${input.channel} document ${input.filename ?? stored.sha256.slice(0, 8)}`,
  };
  state.intakeEvents.unshift(intakeEvent);

  const receipt: WebhookEventReceipt = {
    id: nextId("wh", state.webhookEvents),
    provider: input.provider,
    providerEventId: input.providerEventId,
    idempotencyKey: input.idempotencyKey,
    firstSeenAt: input.receivedAt,
    lastSeenAt: input.receivedAt,
    sourceDocumentId: sourceDocument.id,
    intakeEventId: intakeEvent.id,
    replayCount: 0,
  };
  state.webhookEvents.unshift(receipt);

  const bill = createBillFromSourceDocument(sourceDocument);
  persistState();
  return { idempotentReplay: false, sourceDocument, intakeEvent, bill };
}

export async function ingestEmailWebhook(payload: EmailWebhookPayload): Promise<IntakeResult> {
  payload = normalizeEmailWebhookPayload(payload);
  if (!payload.attachments?.length) throw new Error("Email webhook must include at least one attachment.");
  const attachment = payload.attachments[0];
  const providerEventId = payload.providerEventId || payload.messageId || `${payload.from}|${payload.subject ?? ""}`;
  const idempotencyKey = `email:${payload.provider}:${providerEventId}:${attachment.filename ?? "attachment"}`;
  const replay = existingReplay(idempotencyKey);
  if (replay) return replay;
  return persistInboundDocument({
    clientId: clientIdFromEmail(payload.to),
    channel: "email",
    provider: payload.provider,
    providerEventId,
    idempotencyKey,
    receivedAt: new Date().toISOString(),
    from: payload.from,
    subject: payload.subject,
    message: payload.textBody,
    filename: attachment.filename,
    contentType: attachment.contentType ?? "application/octet-stream",
    buffer: decodeAttachment(attachment.contentBase64),
  });
}

export async function ingestWhatsAppWebhook(payload: WhatsAppWebhookPayload): Promise<IntakeResult> {
  payload = await normalizeWhatsAppWebhookPayload(payload);
  const providerEventId = payload.messageId;
  const idempotencyKey = `whatsapp:${payload.provider}:${payload.messageId}:${payload.media.id}`;
  const replay = existingReplay(idempotencyKey);
  if (replay) return replay;
  return persistInboundDocument({
    clientId: clientIdFromWhatsApp(payload),
    channel: "whatsapp",
    provider: payload.provider,
    providerEventId,
    idempotencyKey,
    receivedAt: payload.receivedAt ?? new Date().toISOString(),
    from: payload.from,
    message: payload.text,
    filename: payload.media.filename,
    contentType: payload.media.contentType ?? "application/octet-stream",
    buffer: decodeAttachment(payload.media.contentBase64),
  });
}
