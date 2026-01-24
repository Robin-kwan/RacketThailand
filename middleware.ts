import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SUPPORTED_SPORTS = [
  "badminton",
  "padel",
  "pickleball",
  "tennis",
  "tabletennis",
];

const AUTH_BLOCKED_PATHS = new Set(["/login", "/signup", "/auth/forgot"]);
const SUPABASE_SESSION_COOKIES = [
  "sb:token",
  "sb:refresh-token",
  "sb-access-token",
  "supabase-auth-token",
];
const RECOVERY_REDIRECT_BASE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
  null;

export function middleware(request: NextRequest) {
  const path = normalizePathname(request.nextUrl.pathname);
  const query = request.nextUrl.searchParams;
  const recoveryType = query.get("type");
  const recoveryFlow = query.get("flow");
  if (recoveryType === "recovery" || recoveryFlow === "recovery") {
    const response =
      path !== "/auth/reset"
        ? NextResponse.redirect(buildRecoveryRedirectUrl(request))
        : NextResponse.next();
    response.cookies.set("rt-recovery", "1", {
      path: "/",
      maxAge: 10 * 60,
      httpOnly: false,
      sameSite: "lax",
    });
    return response;
  }

  const host = request.headers.get("host") ?? "";
  const subdomain = host.split(".")[0]?.toLowerCase();

  if (SUPPORTED_SPORTS.includes(subdomain)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${subdomain}`;
    return NextResponse.rewrite(url);
  }

  if (AUTH_BLOCKED_PATHS.has(path) && hasSupabaseSession(request)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

function hasSupabaseSession(request: NextRequest) {
  return SUPABASE_SESSION_COOKIES.some(
    (cookieName) => request.cookies.get(cookieName)?.value,
  );
}

function normalizePathname(pathname: string) {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "") || "/";
}

function buildRecoveryRedirectUrl(request: NextRequest) {
  if (RECOVERY_REDIRECT_BASE) {
    const url = new URL(request.nextUrl.href);
    const params = url.search;
    return new URL(`/auth/reset${params}`, RECOVERY_REDIRECT_BASE);
  }
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/auth/reset";
  return redirectUrl;
}
