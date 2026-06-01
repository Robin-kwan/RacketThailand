"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { buildLocalizedAuthRedirectPath } from "@/lib/auth-redirect";

type VerificationWatcherProps = {
  userId?: string;
  locale: Locale;
  redirectPath?: string;
};

export function VerificationWatcher({
  userId,
  locale,
  redirectPath = "/",
}: VerificationWatcherProps) {
  const router = useRouter();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!userId || redirectedRef.current) return;
    let isActive = true;

    const checkStatus = async () => {
      try {
        const response = await fetch(
          `/api/auth/verification-status?userId=${userId}`,
          { cache: "no-store" },
        );
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const payload = (await response.json()) as { verified: boolean };
        if (!isActive || redirectedRef.current) return;
        if (payload.verified) {
          redirectedRef.current = true;
          router.replace(buildLocalizedAuthRedirectPath(redirectPath, locale));
        }
      } catch (error) {
        console.error("Verification check failed:", error);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [userId, redirectPath, router, locale]);

  return null;
}
