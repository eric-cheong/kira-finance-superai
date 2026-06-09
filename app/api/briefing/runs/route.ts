import { runDailyBriefing } from "@/lib/agents";
import { fail, ok, readJson } from "@/lib/backend/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const phase = typeof body === "object" && body !== null && "phase" in body ? Number(body.phase) : 1;
    return ok(runDailyBriefing({ maxPhase: phase >= 2 ? 2 : 1 }));
  } catch (error) {
    return fail(error);
  }
}
