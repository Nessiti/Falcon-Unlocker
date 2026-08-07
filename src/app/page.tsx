"use client";

import { useEffect, useMemo, useState } from "react";
import { useRawInitData } from "@telegram-apps/sdk-react";
import { useTelegramUser } from "@/components/telegram-user-provider";
import {
  getDashboardSummaryAction,
  getDashboardCategoriesAction,
  type DashboardSummary,
  type DashboardCategory,
} from "@/lib/actions/dashboard";
import { listNewsAction, type NewsPostSummary } from "@/lib/actions/admin-news";
import { getActivePopupAction, type PopupSummary } from "@/lib/actions/admin-popups";
import { listMyOrdersAction, type OrderSummary } from "@/lib/actions/orders";
import { HomeCard } from "@/components/dashboard/home-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { PopupDisplay } from "@/components/dashboard/popup-display";
import { WelcomeCard } from "@/components/dashboard/welcome-card";
import { PlaceOrderBanner } from "@/components/dashboard/place-order-banner";
import { PlaceOrderChooser } from "@/components/dashboard/place-order-chooser";
import { CategoryShortcuts } from "@/components/dashboard/category-shortcuts";
import { RecentOrderPreview } from "@/components/dashboard/recent-order-preview";
import { MobileQuickActions } from "@/components/dashboard/mobile-quick-actions";
import { NewsModal } from "@/components/dashboard/news-modal";
import { OrderDetailModal } from "@/components/orders/order-detail-modal";
import { formatUsd } from "@/lib/ui";

export default function Home() {
  const auth = useTelegramUser();
  const initData = useRawInitData();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [news, setNews] = useState<NewsPostSummary[] | null>(null);
  const [promotion, setPromotion] = useState<PopupSummary | null>(null);
  const [categories, setCategories] = useState<DashboardCategory[]>([]);
  const [orders, setOrders] = useState<{ imei: OrderSummary[]; server: OrderSummary[] } | null>(null);
  const [showOrderChooser, setShowOrderChooser] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null);

  useEffect(() => {
    if (auth.status !== "authenticated" || !initData) return;

    let cancelled = false;
    getDashboardSummaryAction(initData).then((result) => {
      if (!cancelled && result.ok) setSummary(result.summary);
    });
    getDashboardCategoriesAction(initData).then((result) => {
      if (!cancelled && result.ok) setCategories(result.categories);
    });
    listMyOrdersAction(initData).then((result) => {
      if (!cancelled && result.ok) setOrders({ imei: result.imei, server: result.server });
    });
    listNewsAction(initData).then((result) => {
      if (!cancelled) setNews(result);
    });
    getActivePopupAction(initData).then((result) => {
      if (!cancelled) setPromotion(result);
    });

    return () => {
      cancelled = true;
    };
  }, [auth.status, initData]);

  const recentOrder = useMemo(() => {
    if (!orders) return null;
    return (
      [...orders.imei, ...orders.server].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0] ?? null
    );
  }, [orders]);

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
    <>
      <main className="flex w-full min-w-0 flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
        <PopupDisplay initData={initData ?? null} />

        {/* Phones: card-based dashboard. */}
        <div className="flex w-full min-w-0 flex-col gap-6 lg:hidden">
          <WelcomeCard
            firstName={user.firstName}
            balanceCents={user.balanceCents}
            avatarUrl={user.avatarUrl}
          />
          <PlaceOrderBanner onClick={() => setShowOrderChooser(true)} />
          <CategoryShortcuts categories={categories} />
          <RecentOrderPreview
            order={recentOrder}
            onSelect={() => recentOrder && setSelectedOrder(recentOrder)}
          />
          <MobileQuickActions onNewsClick={() => setShowNews(true)} />
        </div>

        {/* Desktop dashboard - unchanged. */}
        <div className="hidden lg:flex lg:flex-col lg:gap-6">
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
        </div>
      </main>

      {showOrderChooser ? <PlaceOrderChooser onClose={() => setShowOrderChooser(false)} /> : null}
      {showNews ? <NewsModal posts={news ?? []} onClose={() => setShowNews(false)} /> : null}
      {selectedOrder ? (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      ) : null}
    </>
  );
}
