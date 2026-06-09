import { fail, ok } from "@/lib/backend/http";
import { listApprovals } from "@/lib/backend/services";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const state = url.searchParams.get("state");
    const approvals = listApprovals().filter((approval) => !state || approval.state === state);
    return ok({ approvals }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fail(error);
  }
}
