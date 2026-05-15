"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { buildLocalizedPath, type Locale } from "@/lib/i18n";
import { BaseCard } from "@/components/base-card";

type NotificationMetadata = Record<string, string | null | undefined>;

type NotificationRecord = {
  id: string;
  type: string;
  message: string | null;
  metadata: NotificationMetadata | null;
  created_at: string;
  read_at: string | null;
};

type NotificationApiResponse = {
  notifications?: NotificationRecord[];
  pagination?: {
    limit: number;
    offset: number;
    nextOffset: number;
    hasMore: boolean;
  };
  error?: string;
};

export type NotificationsPageCopy = {
  title: string;
  subtitle: string;
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
  loading: string;
  loadMore: string;
  loginPrompt: string;
  fetchError: string;
  retry: string;
  statusUnread: string;
  statusRead: string;
};

type NotificationsPageContentProps = {
  locale: Locale;
  copy: NotificationsPageCopy;
};

const PAGE_LIMIT = 20;

function getMetaString(
  metadata: NotificationMetadata | null,
  key: string,
): string | null {
  if (!metadata) return null;
  const value = metadata[key];
  return typeof value === "string" ? value : null;
}

function mergeById(
  current: NotificationRecord[],
  incoming: NotificationRecord[],
) {
  const map = new Map<string, NotificationRecord>();
  current.forEach((item) => map.set(item.id, item));
  incoming.forEach((item) => map.set(item.id, item));
  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function NotificationsPageContent({
  locale,
  copy,
}: NotificationsPageContentProps) {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read_at).length,
    [notifications],
  );

  const loadNotifications = useCallback(
    async (offset: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_LIMIT),
          offset: String(offset),
        });
        const response = await fetch(`/api/notifications?${params}`, {
          cache: "no-store",
        });
        const data = (await response.json().catch(() => null)) as
          | NotificationApiResponse
          | null;
        if (!response.ok || !data) {
          throw new Error(data?.error ?? "fetch_failed");
        }
        const incoming = data.notifications ?? [];
        setNotifications((prev) =>
          append ? mergeById(prev, incoming) : incoming,
        );
        const fallbackNextOffset = offset + incoming.length;
        setNextOffset(data.pagination?.nextOffset ?? fallbackNextOffset);
        setHasMore(Boolean(data.pagination?.hasMore));
      } catch {
        setError(copy.fetchError);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [copy.fetchError],
  );

  useEffect(() => {
    void loadNotifications(0, false);
  }, [loadNotifications]);

  const markNotificationRead = async (id: string) => {
    const response = await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
    });
    if (!response.ok) {
      setError(copy.fetchError);
      return;
    }
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, read_at: new Date().toISOString() } : item,
      ),
    );
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    setError(null);
    const response = await fetch("/api/notifications/mark-all", {
      method: "POST",
    });
    if (!response.ok) {
      setMarkingAll(false);
      setError(copy.fetchError);
      return;
    }
    setNotifications((prev) =>
      prev.map((item) => ({
        ...item,
        read_at: new Date().toISOString(),
      })),
    );
    setMarkingAll(false);
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
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">
            {copy.title}
          </h1>
          <p className="mt-1 text-sm text-[rgb(var(--foreground-rgb)/0.72)]">
            {copy.subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={markingAll || unreadCount === 0 || loading}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:border-slate-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
        >
          {copy.markAll}
        </button>
      </div>

      <BaseCard as="div" className="rounded-[28px] border border-slate-200 bg-white p-4 md:p-6">
        {loading ? (
          <p className="py-12 text-center text-sm text-[rgb(var(--foreground-rgb)/0.65)]">
            {copy.loading}
          </p>
        ) : notifications.length === 0 ? (
          <p className="py-12 text-center text-sm text-[rgb(var(--foreground-rgb)/0.65)]">
            {copy.empty}
          </p>
        ) : (
          <ul className="space-y-3">
            {notifications.map((notification) => {
              const notificationLink = buildNotificationHref(notification);
              const isUnread = !notification.read_at;
              return (
                <li
                  key={notification.id}
                  className={`rounded-2xl border px-4 py-3 ${
                    isUnread
                      ? "border-slate-200 bg-[rgb(var(--rt-primary-rgb)/0.05)]"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="text-sm text-[var(--foreground)]">
                      {formatMessage(notification)}
                    </p>
                    <span
                      className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase ${
                        isUnread
                          ? "border-[rgb(var(--rt-primary-rgb)/0.35)] text-[var(--rt-primary)]"
                          : "border-slate-300 text-slate-500"
                      }`}
                    >
                      {isUnread ? copy.statusUnread : copy.statusRead}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[rgb(var(--foreground-rgb)/0.55)]">
                    {new Date(notification.created_at).toLocaleString(
                      locale === "th" ? "th-TH" : "en-US",
                    )}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {notificationLink && (
                      <Link
                        href={notificationLink.href}
                        className="rounded-full border border-slate-300 px-3 py-1 font-semibold text-slate-700 hover:border-slate-500"
                        onClick={() => {
                          if (isUnread) {
                            void markNotificationRead(notification.id);
                          }
                        }}
                      >
                        {notificationLink.label}
                      </Link>
                    )}
                    {isUnread && (
                      <button
                        type="button"
                        className="rounded-full border border-slate-300 px-3 py-1 font-semibold text-slate-600 hover:border-slate-500"
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
        {error && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span className="inline-flex items-center gap-2">
              <AlertCircle
                className="h-4 w-4"
                strokeWidth={1.8}
                aria-hidden
              />
              {error}
            </span>
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => loadNotifications(0, false)}
            >
              {copy.retry}
            </button>
          </div>
        )}
        {!loading && hasMore && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => loadNotifications(nextOffset, true)}
              disabled={loadingMore}
              className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-[var(--foreground)] hover:border-slate-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
            >
              {loadingMore ? `${copy.loadMore}...` : copy.loadMore}
            </button>
          </div>
        )}
      </BaseCard>
    </section>
  );
}
