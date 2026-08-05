"use client";

import { useRawInitData, closeMiniApp } from "@telegram-apps/sdk-react";
import { useTelegramUser } from "@/components/telegram-user-provider";
import { PinSettings } from "@/components/account/pin-settings";
import { BiometricSettings } from "@/components/account/biometric-settings";
import { formatUsd } from "@/lib/ui";

export default function SettingsPage() {
  const auth = useTelegramUser();
  const initData = useRawInitData();

  if (auth.status !== "authenticated" || !initData) return null;
  const { user } = auth;
  const initial = user.firstName.charAt(0).toUpperCase();

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Account</h1>
        <p className="text-sm text-hint">Your Telegram profile and security settings.</p>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external Telegram-hosted avatar
          <img
            src={user.avatarUrl}
            alt={user.firstName}
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-lg font-semibold text-accent-foreground">
            {initial}
          </span>
        )}
        <div>
          <p className="text-sm font-semibold text-foreground">
            {user.firstName}
            {user.lastName ? ` ${user.lastName}` : ""}
          </p>
          {user.username ? <p className="text-xs text-hint">@{user.username}</p> : null}
          <p className="text-xs text-hint">Telegram ID: {user.telegramId}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs text-hint">Balance</p>
          <p className="text-lg font-semibold text-foreground">{formatUsd(user.balanceCents)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs text-hint">Language</p>
          <p className="text-lg font-semibold text-foreground">English</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs text-hint">Currency</p>
          <p className="text-lg font-semibold text-foreground">USD</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs text-hint">Member since</p>
          <p className="text-lg font-semibold text-foreground">
            {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Security</h2>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <PinSettings initData={initData} initialHasPin={user.hasPin} />
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <BiometricSettings initData={initData} initialEnabled={user.biometricEnabled} />
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-sm text-foreground">Telegram Session</p>
          <p className="text-xs text-hint">
            Signed in automatically via your Telegram account — no separate password.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (closeMiniApp.isAvailable()) closeMiniApp();
          }}
          className="self-start rounded-lg border border-border px-3 py-2 text-sm font-medium text-accent"
        >
          Logout
        </button>
      </div>
    </main>
  );
}
