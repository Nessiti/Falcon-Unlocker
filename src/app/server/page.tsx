import { prisma } from "@/lib/prisma";
import { ServiceStatus } from "@/generated/prisma/client";
import { ServerServiceCard } from "@/components/server/server-service-card";
import { ServerServiceForm } from "@/components/server/server-service-form";
import { ServerServiceManager } from "@/components/server/server-service-manager";

// The catalog reflects live admin changes (new/updated services), so it's
// rendered per request instead of frozen at build time.
export const dynamic = "force-dynamic";

export default async function ServerPage() {
  const services = await prisma.serverService.findMany({
    where: { status: ServiceStatus.ONLINE },
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

      {services.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServerServiceCard key={service.id} service={service} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-hint">No services available yet.</p>
      )}

      <ServerServiceManager />
      <ServerServiceForm />
    </main>
  );
}
