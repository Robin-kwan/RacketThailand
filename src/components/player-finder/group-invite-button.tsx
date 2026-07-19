"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { BaseTextArea } from "@/components/base-text-area";
import { showToast } from "@/components/toaster";

type Props = {
  groupId: string;
  recipientId: string;
  alreadySent: boolean;
  copy: {
    message: string;
    send: string;
    sending: string;
    sent: string;
    alreadySent: string;
    genericError: string;
  };
};

export function GroupInviteButton({
  groupId,
  recipientId,
  alreadySent,
  copy,
}: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(alreadySent);

  if (sent) {
    return <p className="text-xs font-semibold text-blue-700">{copy.alreadySent}</p>;
  }

  return (
    <div className="w-full">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rt-btn-group inline-flex min-h-10 items-center justify-center gap-2 px-4 py-2 text-xs"
        >
          <Send className="h-4 w-4" aria-hidden />
          {copy.send}
        </button>
      ) : (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <BaseTextArea
            aria-label={copy.message}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={copy.message}
            maxLength={500}
            rows={3}
            className="resize-y border-slate-300 focus-visible:border-blue-500 focus-visible:ring-blue-100"
            variant="light"
          />
          <button
            type="button"
            disabled={sending}
            onClick={async () => {
              setSending(true);
              const response = await fetch(
                `/api/groups/${groupId}/player-invitations`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ recipientId, message }),
                },
              );
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
              showToast({ variant: "success", message: copy.sent });
            }}
            className="rt-btn-group inline-flex min-h-10 items-center justify-center px-4 py-2 text-xs disabled:opacity-60"
          >
            {sending ? copy.sending : copy.send}
          </button>
        </div>
      )}
    </div>
  );
}
