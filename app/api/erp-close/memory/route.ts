import { ApiError, fail, ok } from "@/lib/backend/http";
import { listClientMemories } from "@/lib/backend/memory";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId")?.trim();
    if (!clientId) throw new ApiError(400, "CLIENT_ID_REQUIRED", "clientId is required.");
    const result = await listClientMemories(clientId);
    return ok(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fail(error);
  }
}
