"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { showToast } from "@/components/toaster";

const EVENTS_TO_HANDLE = new Set([
  "SIGNED_IN",
  "SIGNED_OUT",
  "TOKEN_REFRESHED",
  "USER_UPDATED",
]);

type SessionPayload = Parameters<
  ReturnType<typeof createSupabaseBrowserClient>["auth"]["onAuthStateChange"]
>[0][1];

function isRecoverySession(session: SessionPayload) {
  if (!session?.amr) return false;
  return session.amr.some((entry) => entry.method === "recovery");
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
