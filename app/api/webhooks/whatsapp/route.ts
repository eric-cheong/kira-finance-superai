import { created, fail, ok, readJson } from "@/lib/backend/http";
import { ingestWhatsAppWebhook } from "@/lib/backend/intake";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (mode === "subscribe" && challenge && expected && token === expected) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return ok({
    route: "/api/webhooks/whatsapp",
    verification: expected ? "configured" : "set WHATSAPP_WEBHOOK_VERIFY_TOKEN for Meta challenge verification",
    supportedProviders: ["meta-cloud", "twilio", "360dialog", "generic-whatsapp"],
  });
}

export async function POST(request: Request) {
  try {
    // Local MVP accepts normalized WhatsApp media JSON. Production Meta signature
    // verification should validate X-Hub-Signature-256 before calling service code.
    const body = await readJson(request);
    return created(await ingestWhatsAppWebhook(body as Parameters<typeof ingestWhatsAppWebhook>[0]));
  } catch (error) {
    return fail(error);
  }
}
