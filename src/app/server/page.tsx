import { prisma } from "@/lib/prisma";
import { ServiceStatus } from "@/generated/prisma/client";
import { ServerCatalog } from "@/components/server/server-catalog";
import { ServerServiceForm } from "@/components/server/server-service-form";
import { ServerServiceManager } from "@/components/server/server-service-manager";

// The catalog reflects live admin changes (new/updated services), so it's
// rendered per request instead of frozen at build time.
export const dynamic = "force-dynamic";

export default async function ServerPage() {
  // Hardcoded to the Falcon Unlocker tenant: this Server Component has no
  // request-time identity to resolve the real tenant from (Telegram auth
  // only resolves client-side via initData) — needs bot->tenant resolution
  // first. Hardcoding keeps today's behavior correct and stops a second
  // tenant's catalog from bleeding into Falcon's own customer-facing page
  // the moment one exists (Chapter 31).
  const services = await prisma.serverService.findMany({
    where: { status: ServiceStatus.ONLINE, tenantId: "falcon-unlocker" },
    orderBy: { displayOrder: "asc" },
    include: { category: true, fields: { orderBy: { displayOrder: "asc" } } },
  });

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Server Services</h1>
        <p className="text-sm text-hint">
          License, activation, credits, and other server-based services.
        </p>
      </div>

      <ServerCatalog services={services} />

      <ServerServiceManager />
      <ServerServiceForm />
    </main>
  );
}
