import { ApiError, created, fail, ok, readJson } from "@/lib/backend/http";
import { ingestEmailWebhook } from "@/lib/backend/intake";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // Provider-specific signature verification belongs here. For the local MVP we
    // accept normalized Postmark/SendGrid/Mailgun-shaped JSON and keep idempotency
    // in the service layer.
    const body = await readJson(request);
    return created(await ingestEmailWebhook(body as Parameters<typeof ingestEmailWebhook>[0]));
  } catch (error) {
    return fail(error);
  }
}

export async function GET() {
  return ok({
    route: "/api/webhooks/email",
    supportedProviders: ["postmark", "sendgrid", "mailgun", "generic-email"],
    requiredShape: {
      provider: "postmark",
      providerEventId: "evt_123",
      from: "billing@supplier.my",
      to: "inbox+client_laman@kira.my",
      subject: "Invoice INV-100",
      attachments: [{ filename: "INV-100.pdf", contentType: "application/pdf", contentBase64: "..." }],
    },
  });
}
