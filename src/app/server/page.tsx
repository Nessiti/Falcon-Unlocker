"use client";

import { useEffect, useState } from "react";
import { useRawInitData } from "@telegram-apps/sdk-react";
import { ServerCatalog } from "@/components/server/server-catalog";
import { CatalogSkeleton } from "@/components/ui/catalog-skeleton";
import { listPublicServerServicesAction, type PublicServerService } from "@/lib/actions/server-services";

export default function ServerPage() {
  const initData = useRawInitData();
  const [services, setServices] = useState<PublicServerService[] | null>(null);
  const [initialCategoryId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("category"),
  );

  useEffect(() => {
    listPublicServerServicesAction(initData).then((result) => {
      if (result.ok) setServices(result.services);
    });
  }, [initData]);

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Server Services</h1>
        <p className="text-sm text-hint">
          License, activation, credits, and other server-based services.
        </p>
      </div>

      {services === null ? (
        <CatalogSkeleton />
      ) : (
        <ServerCatalog services={services} initialCategoryId={initialCategoryId} />
      )}
    </main>
  );
}
