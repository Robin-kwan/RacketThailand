"use client";

import Link from "next/link";
import { GoogleAnalytics } from "@next/third-parties/google";
import { useSyncExternalStore } from "react";

const CONSENT_KEY = "rt-google-analytics-consent-v1";

type ConsentState = "accepted" | "declined" | "unknown" | "loading";

function subscribeToConsent(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("rt-google-analytics-consent", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("rt-google-analytics-consent", onStoreChange);
  };
}

function getConsentSnapshot(): ConsentState {
  const stored = window.localStorage.getItem(CONSENT_KEY);
  return stored === "accepted" || stored === "declined" ? stored : "unknown";
}

function getServerConsentSnapshot(): ConsentState {
  return "loading";
}

function subscribeToLocation() {
  return () => undefined;
}

function getLocaleSnapshot(): "th" | "en" {
  return new URLSearchParams(window.location.search).get("lang") === "en"
    ? "en"
    : "th";
}

function getServerLocaleSnapshot(): "th" | "en" {
  return "th";
}

export function GoogleAnalyticsConsent({ gaId }: { gaId: string }) {
  const consent = useSyncExternalStore(
    subscribeToConsent,
    getConsentSnapshot,
    getServerConsentSnapshot,
  );
  const locale = useSyncExternalStore(
    subscribeToLocation,
    getLocaleSnapshot,
    getServerLocaleSnapshot,
  );

  const choose = (value: "accepted" | "declined") => {
    window.localStorage.setItem(CONSENT_KEY, value);
    window.dispatchEvent(new Event("rt-google-analytics-consent"));
  };

  if (consent === "loading") {
    return null;
  }

  if (consent === "accepted") {
    return <GoogleAnalytics gaId={gaId} />;
  }

  if (consent === "declined") {
    return null;
  }

  const copy =
    locale === "th"
      ? {
          title: "ช่วยเราพัฒนา RacketThailand",
          body: "เราใช้ Google Analytics เพื่อดูภาพรวมการใช้งานและปรับปรุงเว็บไซต์ ข้อมูลนี้ไม่ใช้เพื่อขายข้อมูลส่วนบุคคลของคุณ",
          accept: "อนุญาตการวิเคราะห์",
          decline: "ไม่อนุญาต",
          learnMore: "ดูรายละเอียด",
        }
      : {
          title: "Help improve RacketThailand",
          body: "We use Google Analytics to understand overall usage and improve the site. We do not use it to sell your personal information.",
          accept: "Allow analytics",
          decline: "Not now",
          learnMore: "Learn more",
        };

  return (
    <div className="fixed inset-x-4 bottom-4 z-[9996] mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-4 shadow-[0_18px_60px_rgb(15_23_42/0.2)] sm:p-5">
      <p className="font-semibold text-slate-950">{copy.title}</p>
      <p className="mt-1.5 text-sm leading-6 text-slate-600">{copy.body}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => choose("accepted")}
          className="rt-btn-primary px-4 py-2 text-sm"
        >
          {copy.accept}
        </button>
        <button
          type="button"
          onClick={() => choose("declined")}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {copy.decline}
        </button>
        <Link
          href={locale === "en" ? "/terms?lang=en" : "/terms"}
          className="px-2 py-2 text-sm font-semibold text-slate-600 underline-offset-4 hover:underline"
        >
          {copy.learnMore}
        </Link>
      </div>
    </div>
  );
}
