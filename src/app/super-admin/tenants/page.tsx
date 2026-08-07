"use client";

import { useRawInitData } from "@telegram-apps/sdk-react";
import { TenantManager } from "@/components/super-admin/tenant-manager";

export default function SuperAdminTenantsPage() {
  const initData = useRawInitData();

  if (!initData) return null;

  return <TenantManager initData={initData} />;
}
