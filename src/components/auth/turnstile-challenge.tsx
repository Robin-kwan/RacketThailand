"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (container: HTMLElement, options: { sitekey: string; theme: "light" | "dark" | "auto"; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void }) => string;
  remove: (widgetId: string) => void;
};

declare global { interface Window { turnstile?: TurnstileApi; } }

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
export const isTurnstileEnabled = Boolean(siteKey);

export function TurnstileChallenge({ onTokenChange }: { onTokenChange: (token: string | null) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenChangeRef = useRef(onTokenChange);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    onTokenChangeRef.current = onTokenChange;
  }, [onTokenChange]);

  useEffect(() => {
    if (!siteKey || !scriptLoaded || !containerRef.current || !window.turnstile) return;
    const widgetId = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: "light",
      callback: (token) => onTokenChangeRef.current(token),
      "expired-callback": () => onTokenChangeRef.current(null),
      "error-callback": () => onTokenChangeRef.current(null),
    });
    widgetIdRef.current = widgetId;
    return () => {
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [scriptLoaded]);

  if (!siteKey) return null;
  return <><Script id="cloudflare-turnstile" src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={() => setScriptLoaded(true)} /><div ref={containerRef} className="min-h-[65px]" /></>;
}
