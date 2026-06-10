import { runDailyBriefing } from "@/lib/agents";
import { updateBriefingRunState } from "@/lib/backend/services";
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

export async function PATCH(request: Request) {
  try {
    const body = await readJson(request);
    const runId =
      typeof body === "object" && body !== null && "runId" in body && typeof body.runId === "string"
        ? body.runId
        : runDailyBriefing().runId;
    return ok(updateBriefingRunState(runId, body), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return fail(error);
  }
}
