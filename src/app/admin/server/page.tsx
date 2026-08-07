"use client";

import { ServerServiceManager } from "@/components/server/server-service-manager";
import { ServerServiceForm } from "@/components/server/server-service-form";

export default function AdminServerPage() {
  return (
    <div className="flex flex-col gap-4">
      <ServerServiceManager />
      <ServerServiceForm />
    </div>
  );
}
