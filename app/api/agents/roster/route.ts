import { AGENT_ROSTER } from "@/lib/agents";
import { fail, ok } from "@/lib/backend/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok({ agents: AGENT_ROSTER }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fail(error);
  }
}
