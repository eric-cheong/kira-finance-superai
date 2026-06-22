import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readSessionUserId } from "@/lib/backend/session-cookie";
import { safeRedirectPath } from "@/lib/safe-redirect";

const SESSION_COOKIE = "kira_session";
const PUBLIC_API_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/logout",
  "/api/health",
  "/api/webhooks/email",
  "/api/webhooks/whatsapp",
]);

function requestOrigin(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host")
    ?? request.headers.get("host")
    ?? request.nextUrl.host;
  const protocol = request.headers.get("x-forwarded-proto")
    ?? request.nextUrl.protocol.replace(/:$/, "")
    ?? "http";
  return `${protocol}://${host}`;
}

export async function middleware(request: NextRequest) {
  const userId = await readSessionUserId(request.cookies.get(SESSION_COOKIE)?.value);
  const hasSession = Boolean(userId);
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (pathname === "/login") {
    if (hasSession) {
      return NextResponse.redirect(new URL("/", requestOrigin(request)));
    }
    return NextResponse.next();
  }

  if (PUBLIC_API_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (!hasSession && isApi) {
    const response = NextResponse.json(
      { ok: false, error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } },
      { status: 401 },
    );
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (!hasSession) {
    const loginUrl = new URL("/login", requestOrigin(request));
    if (pathname !== "/") loginUrl.searchParams.set("from", safeRedirectPath(`${pathname}${request.nextUrl.search}`));
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml)).*)"],
};
