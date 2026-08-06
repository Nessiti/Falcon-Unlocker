"use client";

import { useRawInitData } from "@telegram-apps/sdk-react";
import { ProviderManager } from "@/components/admin/provider-manager";
import { ProviderForm } from "@/components/admin/provider-form";

export default function AdminProvidersPage() {
  const initData = useRawInitData();

  if (!initData) return null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-hint">
        Every provider is isolated behind a generic record — the core app never depends on a
        specific provider&apos;s API shape. Connector logic (getServices, submitOrder, getBalance,
        etc.) is wired up per provider in Chapter 13.
      </p>
      <ProviderManager initData={initData} />
      <ProviderForm initData={initData} />
    </div>
  );
}
