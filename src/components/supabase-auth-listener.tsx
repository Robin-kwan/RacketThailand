"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  PENDING_AUTH_REDIRECT_STORAGE_KEY,
  sanitizeAuthRedirectPath,
} from "@/lib/auth-redirect";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { Session } from "@supabase/supabase-js";
import { showToast } from "@/components/toaster";

const EVENTS_TO_HANDLE = new Set([
  "SIGNED_IN",
  "SIGNED_OUT",
  "TOKEN_REFRESHED",
  "USER_UPDATED",
]);

const SESSION_EVENTS_WITH_REDIRECT = new Set([
  "INITIAL_SESSION",
  "SIGNED_IN",
]);

type SessionWithAmr = Session & {
  amr?: Array<{ method: string }>;
};

function isRecoverySession(session: Session | null) {
  const amr = (session as SessionWithAmr | null)?.amr;
  if (!amr) return false;
  return amr.some((entry) => entry.method === "recovery");
}

function buildRecoverySearch() {
  if (typeof window === "undefined") return "?flow=recovery";
  const params = new URLSearchParams(window.location.search);
  if (!params.get("flow")) {
    params.set("flow", "recovery");
  }
  const search = params.toString();
  return search ? `?${search}` : "?flow=recovery";
}

function cleanAuthQueryParams() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("code")) return;
  const type = url.searchParams.get("type");
  if (type === "recovery" || url.searchParams.get("flow") === "recovery") {
    return;
  }
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  url.searchParams.delete("provider");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function getCurrentRelativePath() {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function consumePendingAuthRedirect() {
  if (typeof window === "undefined") return null;
  const pending = window.sessionStorage.getItem(
    PENDING_AUTH_REDIRECT_STORAGE_KEY,
  );
  if (!pending) return null;

  const safePending = sanitizeAuthRedirectPath(pending);
  window.sessionStorage.removeItem(PENDING_AUTH_REDIRECT_STORAGE_KEY);
  if (safePending === "/" || safePending === getCurrentRelativePath()) {
    return null;
  }
  return safePending;
}

export function SupabaseAuthListener() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(event)
      const recovery =
        event === "PASSWORD_RECOVERY" || isRecoverySession(session);
      if (recovery) {
        const hash = typeof window !== "undefined" ? window.location.hash : "";
        const search = buildRecoverySearch();
        router.replace(`/auth/reset${search}${hash}`);
        showToast({
          variant: "info",
          message: "Reset link verified. Please set a new password.",
        });
        return;
      }

      if (SESSION_EVENTS_WITH_REDIRECT.has(event) && session) {
        const pendingRedirect = consumePendingAuthRedirect();
        if (pendingRedirect) {
          router.replace(pendingRedirect);
          return;
        }
      }

      if (event === "SIGNED_IN") {
        cleanAuthQueryParams();
      }

      if (EVENTS_TO_HANDLE.has(event)) {
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
