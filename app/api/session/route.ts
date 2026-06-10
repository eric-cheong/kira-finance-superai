import { cookies } from "next/headers";
import { ApiError, fail, ok } from "@/lib/backend/http";
import { readSessionUserId } from "@/lib/backend/session-cookie";
import { session } from "@/lib/backend/services";
import { state } from "@/lib/backend/state";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = cookies();
    const userId = await readSessionUserId(cookieStore.get("kira_session")?.value);
    if (!userId || !state.users.some((user) => user.id === userId)) {
      cookieStore.delete("kira_session");
      throw new ApiError(401, "UNAUTHENTICATED", "Sign in to continue.");
    }
    return ok(session(userId), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fail(error);
  }
}
