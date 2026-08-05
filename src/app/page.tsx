"use client";

import { useTelegramUser } from "@/components/telegram-user-provider";
import { HomeCard } from "@/components/dashboard/home-card";
import { QuickActions } from "@/components/dashboard/quick-actions";

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
}

export default function Home() {
  const auth = useTelegramUser();

  if (auth.status !== "authenticated") return null;
  const { user } = auth;

  const cards = [
    { label: "Balance", value: formatUsd(user.balanceCents) },
    { label: "Pending Orders", value: "0" },
    { label: "Completed", value: "0" },
    { label: "Rejected", value: "0" },
    { label: "News", value: "No news" },
    { label: "Promotion", value: "None" },
  ];

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">
          Welcome, {user.firstName}
        </h1>
        <p className="text-sm text-hint">Here&apos;s what&apos;s happening with your account.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
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
