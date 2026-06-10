import { fail, ok, readJson } from "@/lib/backend/http";
import { runAssistant } from "@/lib/backend/ai-assistant";
import { assistantKnowledge, assistantWorkspaceContext } from "@/lib/backend/kira-knowledge";
import { guardProviderRequest } from "@/lib/backend/provider-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    guardProviderRequest(request, { route: "assistant_knowledge" });
    return ok({
      knowledgeBase: assistantKnowledge("", 20),
      workspace: assistantWorkspaceContext(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    guardProviderRequest(request, body);
    return ok(await runAssistant(body), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fail(error);
  }
}
