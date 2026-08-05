"use client";

import { useEffect, useState } from "react";
import { useRawInitData } from "@telegram-apps/sdk-react";
import { useTelegramStatus } from "@/components/telegram-root";
import { pingAction, type PingResult } from "@/lib/actions/ping";

function ConnectionStatusReady() {
  const initData = useRawInitData();
  const [result, setResult] = useState<PingResult | null>(null);

  useEffect(() => {
    if (!initData) return;
    pingAction(initData).then(setResult);
  }, [initData]);

  if (!initData) {
    return <p className="text-sm text-accent">Missing Telegram init data.</p>;
  }

  if (!result) {
    return <p className="text-sm text-hint">Checking connection…</p>;
  }

  if (!result.ok) {
    return <p className="text-sm text-accent">Connection error: {result.error}</p>;
  }

  return (
    <p className="text-sm text-hint">
      Connected as Telegram user #{result.telegramUserId} · server time {result.serverTime}
    </p>
  );
}

export function ConnectionStatus() {
  const status = useTelegramStatus();

  if (status === "not-telegram") {
    return (
      <p className="text-sm text-hint">Open this app from Telegram to check connectivity.</p>
    );
  }

  if (status === "error") {
    return <p className="text-sm text-accent">Failed to initialize the Telegram SDK.</p>;
  }

  if (status === "booting") {
    return <p className="text-sm text-hint">Connecting to Telegram…</p>;
  }

  return <ConnectionStatusReady />;
}
