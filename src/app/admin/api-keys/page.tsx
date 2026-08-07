"use client";

import { useRawInitData } from "@telegram-apps/sdk-react";
import { ApiKeyManager } from "@/components/admin/api-key-manager";

export default function AdminApiKeysPage() {
  const initData = useRawInitData();

  if (!initData) return null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-hint">
        Reseller API access for your own customers, compatible with the DHRU / GSM Theme public
        API standard: accountinfo, imeiservicelist, getimeiorder, getimeiorderbulk,
        placeimeiorder, placebulkorder. Send requests to /api/reseller with apikey/apisecret.
      </p>
      <ApiKeyManager initData={initData} />
    </div>
  );
}
