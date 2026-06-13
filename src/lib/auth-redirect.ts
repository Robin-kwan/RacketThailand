import { buildLocalizedPath, type Locale } from "@/lib/i18n";

const AUTH_PATHS = new Set([
  "/login",
  "/signup",
  "/verify",
  "/auth/callback",
  "/auth/forgot",
  "/auth/reset",
]);

export const PENDING_AUTH_REDIRECT_STORAGE_KEY =
  "rt-pending-auth-redirect";

export function sanitizeAuthRedirectPath(candidate?: string | null) {
  if (!candidate) return "/";

  try {
    const decoded = decodeURIComponent(candidate);
    if (!decoded.startsWith("/") || decoded.startsWith("//")) {
      return "/";
    }
    const parsed = new URL(decoded, "https://racketthailand.local");
    if (AUTH_PATHS.has(parsed.pathname.replace(/\/+$/, "") || "/")) {
      return "/";
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}

export function buildAuthPagePath(
  authPath: "/login" | "/signup" | "/verify",
  locale: Locale,
  redirectTo?: string | null,
) {
  const safeRedirect = sanitizeAuthRedirectPath(redirectTo);
  const params = new URLSearchParams();
  if (safeRedirect !== "/") {
    params.set("redirectTo", safeRedirect);
  }
  const query = params.toString();
  return buildLocalizedPath(query ? `${authPath}?${query}` : authPath, locale);
}

export function buildLocalizedAuthRedirectPath(
  redirectTo: string | null | undefined,
  locale: Locale,
) {
  const safeRedirect = sanitizeAuthRedirectPath(redirectTo);
  if (locale === "th") {
    return safeRedirect;
  }

  const parsed = new URL(safeRedirect, "https://racketthailand.local");
  if (parsed.searchParams.has("lang")) {
    return safeRedirect;
  }

  return buildLocalizedPath(safeRedirect, locale);
}
