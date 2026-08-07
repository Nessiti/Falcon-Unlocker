"use client";

import { useCallback, useEffect, useState } from "react";
import { useRawInitData } from "@telegram-apps/sdk-react";
import { ImeiCatalog } from "@/components/imei/imei-catalog";
import { ImeiServiceForm } from "@/components/imei/imei-service-form";
import { ImeiServiceManager } from "@/components/imei/imei-service-manager";
import { CatalogSkeleton } from "@/components/ui/catalog-skeleton";
import { listPublicImeiServicesAction, type PublicImeiService } from "@/lib/actions/imei-services";

export default function ImeiPage() {
  const initData = useRawInitData();
  const [services, setServices] = useState<PublicImeiService[] | null>(null);

  const refresh = useCallback(() => {
    listPublicImeiServicesAction(initData).then((result) => {
      if (result.ok) setServices(result.services);
    });
  }, [initData]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">IMEI Services</h1>
        <p className="text-sm text-hint">Unlock, FRP, and IMEI-based services.</p>
      </div>

      {services === null ? <CatalogSkeleton /> : <ImeiCatalog services={services} />}

      <ImeiServiceManager onChanged={refresh} />
      <ImeiServiceForm onChanged={refresh} />
    </main>
  );
}
