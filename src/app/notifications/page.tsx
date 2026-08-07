"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRawInitData } from "@telegram-apps/sdk-react";
import {
  listMyNotificationsAction,
  markAllNotificationsReadAction,
  type UserNotificationSummary,
} from "@/lib/actions/user-notifications";

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const initData = useRawInitData();
  const router = useRouter();
  const [notifications, setNotifications] = useState<UserNotificationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initData) return;
    listMyNotificationsAction(initData).then((result) => {
      if (result.ok) {
        setNotifications(result.notifications);
        if (result.unreadCount > 0) markAllNotificationsReadAction(initData);
      } else {
        setError(result.error);
      }
    });
  }, [initData]);

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Notifications</h1>
        <p className="text-sm text-hint">Updates about your orders, wallet, and account.</p>
      </div>

      {error ? <p className="text-sm text-accent">{error}</p> : null}

      {!notifications ? (
        <p className="text-sm text-hint">Loading…</p>
      ) : notifications.length === 0 ? (
        <p className="text-sm text-hint">No notifications yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => notification.link && router.push(notification.link)}
              disabled={!notification.link}
              className="flex items-start gap-2 rounded-2xl border border-border bg-surface p-3 text-left text-sm disabled:cursor-default"
            >
              {!notification.read ? (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
              ) : (
                <span className="mt-1.5 h-2 w-2 shrink-0" aria-hidden />
              )}
              <div className="flex-1">
                <p className="text-foreground">{notification.message}</p>
                <p className="mt-1 text-xs text-hint">{timeAgo(notification.createdAt)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
