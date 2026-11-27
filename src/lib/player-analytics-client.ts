"use client";

import {
  playerEventName,
  type PlayerAnalyticsAction,
} from "./player-analytics";

export function trackPlayerEvent(
  action: PlayerAnalyticsAction,
  sport: string,
  enabled: boolean,
) {
  try {
    if (!enabled || typeof window === "undefined") return false;
    const hostname = window.location.hostname;
    if (
      hostname !== "racketthailand.com" &&
      !/^(badminton|padel|pickleball|tennis|tabletennis)\.racketthailand\.com$/.test(
        hostname,
      )
    )
      return false;
    if (
      window.localStorage.getItem("rt-google-analytics-consent-v1") !==
      "accepted"
    )
      return false;
    const event = playerEventName(action, sport);
    const measurementId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID ?? "";
    if (!event || !/^G-[A-Z0-9]+$/i.test(measurementId)) return false;
    const target = window as typeof window & { dataLayer?: unknown[] };
    target.dataLayer ??= [];
    // Same queued argument shape as gtag; safe before the consented GA script loads.
    function enqueue(
      command: string,
      eventName: string,
      destination: { send_to: string },
    ) {
      if (command !== "event" || !eventName || !destination.send_to) return;
      // eslint-disable-next-line prefer-rest-params -- Match Google's gtag queue contract.
      target.dataLayer!.push(arguments);
    }
    enqueue("event", event, { send_to: measurementId });
    return true;
  } catch {
    // Analytics must never prevent navigation or sending a request.
    return false;
  }
}
