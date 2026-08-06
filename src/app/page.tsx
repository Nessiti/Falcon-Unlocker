"use client";

import { useEffect, useState } from "react";
import { useRawInitData } from "@telegram-apps/sdk-react";
import { useTelegramUser } from "@/components/telegram-user-provider";
import { getDashboardSummaryAction, type DashboardSummary } from "@/lib/actions/dashboard";
import { listNewsAction, type NewsPostSummary } from "@/lib/actions/admin-news";
import { getActivePopupAction, type PopupSummary } from "@/lib/actions/admin-popups";
import { HomeCard } from "@/components/dashboard/home-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { PopupDisplay } from "@/components/dashboard/popup-display";
import { formatUsd } from "@/lib/ui";

export default function Home() {
  const auth = useTelegramUser();
  const initData = useRawInitData();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [news, setNews] = useState<NewsPostSummary[] | null>(null);
  const [promotion, setPromotion] = useState<PopupSummary | null>(null);

  useEffect(() => {
    if (auth.status !== "authenticated" || !initData) return;

    let cancelled = false;
    getDashboardSummaryAction(initData).then((result) => {
      if (!cancelled && result.ok) setSummary(result.summary);
    });
    listNewsAction().then((result) => {
      if (!cancelled) setNews(result);
    });
    getActivePopupAction(initData).then((result) => {
      if (!cancelled) setPromotion(result);
    });

    return () => {
      cancelled = true;
    };
  }, [auth.status, initData]);

  if (auth.status !== "authenticated") return null;
  const { user } = auth;

  const cards = [
    { label: "Balance", value: formatUsd(user.balanceCents) },
    { label: "Pending Orders", value: summary ? String(summary.pendingOrders) : "…" },
    { label: "Completed", value: summary ? String(summary.completedOrders) : "…" },
    { label: "Rejected", value: summary ? String(summary.rejectedOrders) : "…" },
    { label: "News", value: news && news.length > 0 ? news[0].title : "No news" },
    { label: "Promotion", value: promotion ? promotion.title : "None" },
  ];

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <PopupDisplay initData={initData ?? null} />
      <div>
        <h1 className="text-lg font-semibold text-foreground">
          Welcome, {user.firstName}
        </h1>
        <p className="text-sm text-hint">Here&apos;s what&apos;s happening with your account.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => (
          <HomeCard key={card.label} label={card.label} value={card.value} />
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Quick Actions</h2>
        <QuickActions />
      </div>
    </main>
  );
}
