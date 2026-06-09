import { runDailyBriefing } from "@/lib/agents";
import { fail, ok } from "@/lib/backend/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const phase = Number(new URL(request.url).searchParams.get("phase") ?? 1);
    return ok(runDailyBriefing({ maxPhase: phase >= 2 ? 2 : 1 }), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return fail(error);
  }
}
