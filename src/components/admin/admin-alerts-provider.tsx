"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useRawInitData, hapticFeedbackNotificationOccurred } from "@telegram-apps/sdk-react";
import { useTelegramUser } from "@/components/telegram-user-provider";
import { getAdminAlertsAction, type AdminAlertCounts } from "@/lib/actions/admin-alerts";
import { Role } from "@/generated/prisma/browser";

const POLL_INTERVAL_MS = 20000;

const AdminAlertsContext = createContext<AdminAlertCounts | null>(null);

function notifyHaptic(type: "warning") {
  if (hapticFeedbackNotificationOccurred.isAvailable()) {
    hapticFeedbackNotificationOccurred(type);
  }
}

/**
 * Polls for new admin-relevant requests (pending orders, unanswered support
 * tickets, submitted recharge proofs) so the webapp reflects them live
 * instead of only the admin's Telegram chat (Chapter 9's bot notifications).
 * On an increase, refreshes the current page's server data and gives a
 * haptic nudge. No-ops entirely for non-staff.
 */
export function AdminAlertsProvider({ children }: { children: ReactNode }) {
  const auth = useTelegramUser();
  const initData = useRawInitData();
  const router = useRouter();
  const [alerts, setAlerts] = useState<AdminAlertCounts | null>(null);
  const previousTotal = useRef<number | null>(null);

  const isStaff =
    auth.status === "authenticated" &&
    (auth.user.role === Role.ADMIN || auth.user.role === Role.MODERATOR);

  useEffect(() => {
    if (!isStaff || !initData) return;

    let cancelled = false;

    async function poll() {
      const result = await getAdminAlertsAction(initData!);
      if (cancelled || !result.ok) return;

      if (previousTotal.current != null && result.alerts.total > previousTotal.current) {
        notifyHaptic("warning");
        router.refresh();
      }
      previousTotal.current = result.alerts.total;
      setAlerts(result.alerts);
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isStaff, initData, router]);

  return <AdminAlertsContext.Provider value={alerts}>{children}</AdminAlertsContext.Provider>;
}

/** Current admin alert counts, or null if not staff / not loaded yet. */
export function useAdminAlerts(): AdminAlertCounts | null {
  return useContext(AdminAlertsContext);
}
