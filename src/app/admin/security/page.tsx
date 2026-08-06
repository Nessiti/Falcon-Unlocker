"use client";

import { useRawInitData } from "@telegram-apps/sdk-react";
import { SecurityCenter } from "@/components/admin/security-center";

export default function AdminSecurityPage() {
  const initData = useRawInitData();

  if (!initData) return null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-hint">
        Sensitive credentials are never sent to the frontend — only masked previews cross the
        network. This page surfaces the state of every protection covering provider integrations.
      </p>
      <SecurityCenter initData={initData} />
    </div>
  );
}
