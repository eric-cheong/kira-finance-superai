import { runDailyBriefing } from "@/lib/agents";
import { fail, ok } from "@/lib/backend/http";
import { summary } from "@/lib/backend/services";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok({ ...summary(), briefing: runDailyBriefing() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fail(error);
  }
}
