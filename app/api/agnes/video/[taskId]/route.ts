import { fail, ok } from "@/lib/backend/http";
import { pollCfoBriefingVideo } from "@/lib/backend/agnes-video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { taskId: string } }) {
  try {
    const clientId = new URL(request.url).searchParams.get("clientId") ?? undefined;
    const result = await pollCfoBriefingVideo(params.taskId, clientId);
    return ok(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fail(error);
  }
}
