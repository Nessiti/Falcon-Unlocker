"use client";

import { useEffect, useState } from "react";
import { useRawInitData } from "@telegram-apps/sdk-react";
import { getAppSettingsStatusAction, type AppSettingsStatus } from "@/lib/actions/admin-settings";

export default function AdminSettingsPage() {
  const initData = useRawInitData();
  const [status, setStatus] = useState<AppSettingsStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initData) return;
    getAppSettingsStatusAction(initData).then((result) => {
      if (result.ok) setStatus(result.status);
      else setError(result.error);
    });
  }, [initData]);

  if (!initData) return null;
  if (error) return <p className="text-sm text-accent">{error}</p>;
  if (!status) return <p className="text-sm text-hint">Loading…</p>;

  const rows = [
    {
      label: "Telegram Bot",
      value: status.botConfigured
        ? `Configured${status.botUsername ? ` (@${status.botUsername})` : ""}`
        : "Not configured",
    },
    { label: "Admin Telegram ID", value: status.adminIdConfigured ? "Configured" : "Not configured" },
    {
      label: "Public App URL",
      value: status.appUrlConfigured
        ? "Configured"
        : "Not configured (notifications send without buttons)",
    },
    {
      label: "Bot Webhook Secret",
      value: status.webhookSecretConfigured
        ? "Configured"
        : "Not configured (/start won't reply)",
    },
    { label: "Language", value: "English (fixed)" },
    { label: "Currency", value: "USD (fixed)" },
  ];

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 text-sm"
        >
          <span className="text-foreground">{row.label}</span>
          <span className="text-hint">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
