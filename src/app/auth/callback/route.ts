import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function sanitizeRedirectPath(
  candidate: string | null,
): string {
  if (!candidate) return "/";
  return candidate.startsWith("/") ? candidate : "/";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const nextParam = sanitizeRedirectPath(
    requestUrl.searchParams.get("next"),
  );
  const code = requestUrl.searchParams.get("code");
  const errorDescription = requestUrl.searchParams.get("error_description");

  if (!code) {
    const fallbackPath = errorDescription ? "/login?error=oauth" : nextParam;
    return NextResponse.redirect(
      new URL(fallbackPath, requestUrl.origin),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth exchange failed", error);
    return NextResponse.redirect(
      new URL("/login?error=oauth", requestUrl.origin),
    );
  }

  return NextResponse.redirect(
    new URL(nextParam, requestUrl.origin),
  );
}
