"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";

type ViewTrackerProps = {
  event: string;
  payload?: Record<string, string | number | boolean | null | undefined>;
};

export function ViewTracker({ event, payload }: ViewTrackerProps) {
  const serializedPayload = JSON.stringify(payload ?? {});
  useEffect(() => {
    track(event, payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, serializedPayload]);

  return null;
}
