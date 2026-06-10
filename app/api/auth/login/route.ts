import { cookies } from "next/headers";
import { ApiError, fail, ok, readJson } from "@/lib/backend/http";
import { session } from "@/lib/backend/services";
import { appendAudit, state } from "@/lib/backend/state";

export const dynamic = "force-dynamic";

const SESSION_COOKIE = "kira_session";

// Demo workspace: "123"/"123" signs in as the default finance admin, and any
// seeded workspace email signs in with any non-empty password. No real
// credential store exists by design.
export async function POST(request: Request) {
  try {
    const body = (await readJson(request)) as { login?: unknown; password?: unknown };
    const login = typeof body.login === "string" ? body.login.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!login) {
      throw new ApiError(400, "MISSING_LOGIN", "Enter your email or username to continue.");
    }
    if (!password) {
      throw new ApiError(400, "MISSING_PASSWORD", "Enter your password to continue.");
    }

    let user = null;
    if (login === "123" && password === "123") {
      user = state.users.find((candidate) => candidate.id === state.currentUserId) ?? state.users[0];
    } else {
      user = state.users.find((candidate) => candidate.email.toLowerCase() === login) ?? null;
    }

    if (!user) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Login not found. Try 123 for username and 123 for password.");
    }

    state.currentUserId = user.id;
    appendAudit({
      actor: user.id,
      action: "auth.login",
      target: user.email,
      detail: "Signed in to the workspace (demo session).",
      tier: 1,
    });

    cookies().set(SESSION_COOKIE, user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return ok(session());
  } catch (error) {
    return fail(error);
  }
}
