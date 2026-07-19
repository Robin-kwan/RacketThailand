"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { showToast } from "@/components/toaster";

type Props = {
  endpoint: string;
  mode: "incoming" | "outgoing";
  copy: {
    accept: string;
    decline: string;
    cancel: string;
    working: string;
    updated: string;
    genericError: string;
  };
};

export function ConnectionActions({ endpoint, mode, copy }: Props) {
  const router = useRouter();
  const [working, setWorking] = useState(false);

  const update = async (action: "accept" | "decline" | "cancel") => {
    setWorking(true);
    const response = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const payload = await response.json().catch(() => ({}));
    setWorking(false);
    if (!response.ok) {
      showToast({
        variant: "error",
        message: payload?.error || copy.genericError,
      });
      return;
    }
    showToast({ variant: "success", message: copy.updated });
    router.refresh();
  };

  if (mode === "outgoing") {
    return (
      <button
        type="button"
        disabled={working}
        onClick={() => update("cancel")}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
      >
        {working ? copy.working : copy.cancel}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={working}
        onClick={() => update("accept")}
        className="rt-btn-primary inline-flex min-h-9 items-center justify-center px-3 py-2 text-xs disabled:opacity-60"
      >
        {working ? copy.working : copy.accept}
      </button>
      <button
        type="button"
        disabled={working}
        onClick={() => update("decline")}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
      >
        {copy.decline}
      </button>
    </div>
  );
}

