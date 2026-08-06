"use client";

import { useRawInitData } from "@telegram-apps/sdk-react";
import { ApiLogManager } from "@/components/admin/api-log-manager";

export default function AdminApiLogsPage() {
  const initData = useRawInitData();

  if (!initData) return null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-hint">
        Every outbound call any provider connector makes — connection tests, syncs, balance
        checks, orders — logged automatically at the shared HTTP layer (Chapter 13), regardless of
        provider type.
      </p>
      <ApiLogManager initData={initData} />
    </div>
  );
}
