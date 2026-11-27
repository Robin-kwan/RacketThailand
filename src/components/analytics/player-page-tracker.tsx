"use client";

import { useEffect, useRef } from "react";
import { trackPlayerEvent } from "@/lib/player-analytics-client";

export function PlayerPageTracker({
  sport,
  enabled,
}: {
  sport: string;
  enabled: boolean;
}) {
  const recorded = useRef<string | null>(null);
  useEffect(() => {
    const record = () => {
      if (
        recorded.current !== sport &&
        trackPlayerEvent("view", sport, enabled)
      )
        recorded.current = sport;
    };
    record();
    window.addEventListener("rt-google-analytics-consent", record);
    window.addEventListener("storage", record);
    return () => {
      window.removeEventListener("rt-google-analytics-consent", record);
      window.removeEventListener("storage", record);
    };
  }, [sport, enabled]);
  return null;
}
