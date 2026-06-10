import { cookies } from "next/headers";
import { fail, ok } from "@/lib/backend/http";
import { appendAudit, state } from "@/lib/backend/state";

export const dynamic = "force-dynamic";

const SESSION_COOKIE = "kira_session";

export async function POST() {
  try {
    const userId = cookies().get(SESSION_COOKIE)?.value;
    if (userId && state.users.some((user) => user.id === userId)) {
      appendAudit({
        actor: userId,
        action: "auth.logout",
        target: userId,
        detail: "Signed out of the workspace.",
        tier: 1,
      });
    }
    cookies().delete(SESSION_COOKIE);
    return ok({ signedOut: true });
  } catch (error) {
    return fail(error);
  }
}
