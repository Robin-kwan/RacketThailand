"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";
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

export type NotificationCopy = {
  title: string;
  empty: string;
  markAll: string;
  markRead: string;
  reviewCourt: string;
  reviewCasualPlay: string;
  genericMessage: string;
  courtGroupRequest: string;
  casualPlayJoinRequest: string;
  casualPlayJoinAccepted: string;
  casualPlayJoinRejected: string;
  deleteNotification: string;
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(() => new Set());
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

  const deleteNotification = async (id: string) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    const previousNotifications = notifications;
    setNotifications((prev) => prev.filter((item) => item.id !== id));

    const response = await fetch(`/api/notifications/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setNotifications(previousNotifications);
    }
    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const markAllRead = async () => {
    const response = await fetch("/api/notifications/mark-all", { method: "POST" });
    if (!response.ok) return;
    setNotifications((prev) =>
      prev.map((item) => ({
        ...item,
        read_at: new Date().toISOString(),
      })),
    );
  };

  const handleReadAllClick = async () => {
    await markAllRead();
    setOpen(false);
    router.push(buildLocalizedPath("/notifications", locale));
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
    if (notification.type === "casual-play-join-request") {
      const requesterName = getMetaString(notification.metadata, "requesterName");
      const playTitle = getMetaString(notification.metadata, "playTitle");
      if (requesterName && playTitle) {
        return copy.casualPlayJoinRequest
          .replace("{requester}", requesterName)
          .replace("{play}", playTitle);
      }
    }
    if (notification.type === "casual-play-join-accepted") {
      const playTitle = getMetaString(notification.metadata, "playTitle");
      if (playTitle) {
        return copy.casualPlayJoinAccepted.replace("{play}", playTitle);
      }
    }
    if (notification.type === "casual-play-join-rejected") {
      const playTitle = getMetaString(notification.metadata, "playTitle");
      if (playTitle) {
        return copy.casualPlayJoinRejected.replace("{play}", playTitle);
      }
    }
    return notification.message ?? copy.genericMessage;
  };

  const buildNotificationHref = (notification: NotificationRecord) => {
    const playId = getMetaString(notification.metadata, "playId");
    if (playId) {
      return {
        href: buildLocalizedPath(`/casual-plays/${playId}`, locale),
        label: copy.reviewCasualPlay,
      };
    }
    const courtId = getMetaString(notification.metadata, "courtId");
    if (courtId) {
      return {
        href: buildLocalizedPath(`/courts/${courtId}`, locale),
        label: copy.reviewCourt,
      };
    }
    return null;
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[rgb(var(--foreground-rgb)/0.25)] bg-white text-[var(--foreground)] transition hover:border-[rgb(var(--foreground-rgb)/0.5)]"
        aria-label={copy.title}
      >
        <Bell
          className="h-[18px] w-[18px]"
          strokeWidth={1.8}
          aria-hidden
        />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed inset-x-3 top-20 z-50 max-h-[min(400px,calc(100dvh-6rem))] overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 text-sm sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:w-80">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">
              {copy.title}
            </p>
            <button
              type="button"
              className="text-xs font-semibold uppercase text-slate-500 hover:text-slate-700"
              onClick={handleReadAllClick}
            >
              {copy.markAll}
            </button>
          </div>
          {loading ? (
            <p className="py-6 text-center text-slate-500">Loading...</p>
          ) : notifications.length === 0 ? (
            <p className="py-6 text-center text-slate-500">{copy.empty}</p>
          ) : (
            <ul className="flex max-h-[min(312px,calc(100dvh-12rem))] flex-col gap-3 overflow-y-auto pr-1 sm:max-h-72">
              {notifications.map((notification) => {
                const notificationLink = buildNotificationHref(notification);
                return (
                  <li
                    key={notification.id}
                    className={`rounded-2xl border px-3 py-2 ${
                      notification.read_at
                        ? "border-slate-100 bg-white"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <p className="min-w-0 flex-1 text-sm text-slate-900">
                        {formatMessage(notification)}
                      </p>
                      <button
                        type="button"
                        onClick={() => deleteNotification(notification.id)}
                        disabled={deletingIds.has(notification.id)}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-wait disabled:opacity-50"
                        aria-label={copy.deleteNotification}
                        title={copy.deleteNotification}
                      >
                        <X
                          className="h-3.5 w-3.5"
                          strokeWidth={2}
                          aria-hidden
                        />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {notificationLink && (
                        <Link
                          href={notificationLink.href}
                          className="rounded-full border border-slate-300 px-3 py-1 font-semibold text-slate-700 hover:border-slate-500"
                          onClick={() => markNotificationRead(notification.id)}
                        >
                          {notificationLink.label}
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
