"use client";

import { useRawInitData } from "@telegram-apps/sdk-react";
import { CronLogManager } from "@/components/admin/cron-log-manager";

export default function AdminCronPage() {
  const initData = useRawInitData();

  if (!initData) return null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-hint">
        Every scheduled task runs behind one endpoint, GET/POST /api/cron, authenticated via
        Authorization: Bearer &lt;CRON_SECRET&gt; - hosting-independent, meant to be called by an
        external scheduler like cron-job.org instead of a platform&apos;s native cron.
      </p>
      <CronLogManager initData={initData} />
    </div>
  );
}
