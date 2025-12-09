"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { buildLocalizedPath, type Locale } from "@/lib/i18n";

type NotificationMetadata = Record<string, string | null | undefined>;

type NotificationRecord = {
  id: string;
  type: string;
  message: string | null;
  metadata: NotificationMetadata | null;
  created_at: string;
  read_at: string | null;
};

type NotificationCopy = {
  title: string;
  empty: string;
  markAll: string;
  markRead: string;
  reviewCourt: string;
  genericMessage: string;
  courtGroupRequest: string;
};

type NotificationsMenuProps = {
  locale: Locale;
  copy: NotificationCopy;
};

function getMetaString(
  metadata: NotificationMetadata | null,
  key: string,
): string | null {
  if (!metadata) return null;
  const value = metadata[key];
  return typeof value === "string" ? value : null;
}

export function NotificationsMenu({
  locale,
  copy,
}: NotificationsMenuProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read_at).length,
    [notifications],
  );

  useEffect(() => {
    let active = true;
    (async () => {
      const response = await fetch("/api/notifications", {
        cache: "no-store",
      });
      if (!active) return;
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications ?? []);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        menuRef.current &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, []);

  const markNotificationRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
    });
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, read_at: new Date().toISOString() } : item,
      ),
    );
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/mark-all", { method: "POST" });
    setNotifications((prev) =>
      prev.map((item) => ({
        ...item,
        read_at: new Date().toISOString(),
      })),
    );
  };

  const formatMessage = (notification: NotificationRecord) => {
    if (notification.type === "court-group-request") {
      const groupName = getMetaString(notification.metadata, "groupName");
      const courtName = getMetaString(notification.metadata, "courtName");
      if (groupName && courtName) {
        return copy.courtGroupRequest
          .replace("{group}", groupName)
          .replace("{court}", courtName);
      }
    }
    return notification.message ?? copy.genericMessage;
  };

  const buildCourtHref = (notification: NotificationRecord) => {
    const courtId = getMetaString(notification.metadata, "courtId");
    if (!courtId) return null;
    return buildLocalizedPath(`/courts/${courtId}`, locale);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:border-slate-500"
        aria-label={copy.title}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3a6 6 0 00-6 6v2.764c0 .47-.195.922-.54 1.244L4.293 14.1c-.88.82-.264 2.311.94 2.311H18.77c1.205 0 1.82-1.49.94-2.31l-1.167-1.095a1.75 1.75 0 01-.543-1.247V9a6 6 0 00-6-6z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M9.75 19a2.25 2.25 0 004.5 0"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 w-80 rounded-3xl border border-slate-200 bg-white p-4 text-sm shadow-2xl shadow-slate-200/80">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">
              {copy.title}
            </p>
            <button
              type="button"
              className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500 hover:text-slate-700"
              onClick={markAllRead}
            >
              {copy.markAll}
            </button>
          </div>
          {loading ? (
            <p className="py-6 text-center text-slate-500">Loading...</p>
          ) : notifications.length === 0 ? (
            <p className="py-6 text-center text-slate-500">{copy.empty}</p>
          ) : (
            <ul className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
              {notifications.map((notification) => {
                const courtHref = buildCourtHref(notification);
                return (
                  <li
                    key={notification.id}
                    className={`rounded-2xl border px-3 py-2 ${
                      notification.read_at
                        ? "border-slate-100 bg-white"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <p className="text-sm text-slate-900">
                      {formatMessage(notification)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {courtHref && (
                        <Link
                          href={courtHref}
                          className="rounded-full border border-slate-300 px-3 py-1 font-semibold text-slate-700 hover:border-slate-500"
                          onClick={() => markNotificationRead(notification.id)}
                        >
                          {copy.reviewCourt}
                        </Link>
                      )}
                      {!notification.read_at && (
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-500 hover:border-slate-400"
                          onClick={() => markNotificationRead(notification.id)}
                        >
                          {copy.markRead}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
