"use client";

import { useRawInitData } from "@telegram-apps/sdk-react";
import { MonitoringDashboard } from "@/components/admin/monitoring-dashboard";

export default function AdminMonitoringPage() {
  const initData = useRawInitData();

  if (!initData) return null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-hint">
        A live view of every provider integration - status, success rate, response time, and
        order volume, built from the API and queue logs the app already keeps.
      </p>
      <MonitoringDashboard initData={initData} />
    </div>
  );
}
