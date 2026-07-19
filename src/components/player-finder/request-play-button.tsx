"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { BaseTextArea } from "@/components/base-text-area";
import { showToast } from "@/components/toaster";

type Copy = {
  requestToPlay: string;
  requestMessage: string;
  sendRequest: string;
  sending: string;
  requestSent: string;
  signInToRequest: string;
  profileRequired: string;
  cancel: string;
  genericError: string;
};

type Props = {
  recipientId: string;
  sportId: string;
  loginHref: string;
  profileHref: string;
  isAuthenticated: boolean;
  hasOwnProfile: boolean;
  copy: Copy;
};

export function RequestPlayButton({
  recipientId,
  sportId,
  loginHref,
  profileHref,
  isAuthenticated,
  hasOwnProfile,
  copy,
}: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isAuthenticated) {
    return (
      <Link
        href={loginHref}
        className="rt-btn-primary inline-flex min-h-10 items-center justify-center gap-2 px-4 py-2 text-xs"
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
        {copy.signInToRequest}
      </Link>
    );
  }

  if (!hasOwnProfile) {
    return (
      <Link
        href={profileHref}
        className="rt-btn-primary inline-flex min-h-10 items-center justify-center gap-2 px-4 py-2 text-xs"
      >
        {copy.profileRequired}
      </Link>
    );
  }

  if (sent) {
    return <p className="text-xs font-semibold text-emerald-700">{copy.requestSent}</p>;
  }

  return (
    <div className="w-full">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rt-btn-primary inline-flex min-h-10 items-center justify-center gap-2 px-4 py-2 text-xs"
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          {copy.requestToPlay}
        </button>
      ) : (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <BaseTextArea
            aria-label={copy.requestMessage}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={copy.requestMessage}
            maxLength={500}
            rows={3}
            className="resize-y border-slate-300 focus-visible:border-[var(--rt-primary)] focus-visible:ring-[rgb(var(--rt-primary-rgb)/0.12)]"
            variant="light"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={sending}
              onClick={async () => {
                setSending(true);
                const response = await fetch("/api/play-requests", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ recipientId, sportId, message }),
                });
                const payload = await response.json().catch(() => ({}));
                setSending(false);
                if (!response.ok) {
                  showToast({
                    variant: "error",
                    message: payload?.error || copy.genericError,
                  });
                  return;
                }
                setSent(true);
                showToast({ variant: "success", message: copy.requestSent });
              }}
              className="rt-btn-primary inline-flex min-h-10 items-center justify-center px-4 py-2 text-xs disabled:opacity-60"
            >
              {sending ? copy.sending : copy.sendRequest}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
            >
              {copy.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
