"use client";

import { ImeiServiceManager } from "@/components/imei/imei-service-manager";
import { ImeiServiceForm } from "@/components/imei/imei-service-form";

export default function AdminImeiPage() {
  return (
    <div className="flex flex-col gap-4">
      <ImeiServiceManager />
      <ImeiServiceForm />
    </div>
  );
}
