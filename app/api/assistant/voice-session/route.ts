import { createAssistantRealtimeSession } from "@/lib/backend/ai-assistant";
import { fail, ok, readOptionalJson } from "@/lib/backend/http";
import { guardProviderRequest } from "@/lib/backend/provider-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readOptionalJson(request);
    guardProviderRequest(request, body);
    return ok(await createAssistantRealtimeSession(request), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fail(error);
  }
}
