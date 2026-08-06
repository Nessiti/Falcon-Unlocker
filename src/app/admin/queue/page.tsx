"use client";

import { useRawInitData } from "@telegram-apps/sdk-react";
import { QueueManager } from "@/components/admin/queue-manager";

export default function AdminQueuePage() {
  const initData = useRawInitData();

  if (!initData) return null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-hint">
        Order → Queue → Provider → Response. Orders for services with an enabled provider mapping
        are queued automatically at checkout and submitted here, retrying the next candidate from
        the Chapter 15 routing plan on failure.
      </p>
      <QueueManager initData={initData} />
    </div>
  );
}
