import { prisma } from "@/lib/prisma";
import { ServiceStatus } from "@/generated/prisma/client";
import { ImeiServiceCard } from "@/components/imei/imei-service-card";
import { ImeiServiceForm } from "@/components/imei/imei-service-form";

// The catalog reflects live admin changes (new/updated services), so it's
// rendered per request instead of frozen at build time.
export const dynamic = "force-dynamic";

export default async function ImeiPage() {
  const services = await prisma.imeiService.findMany({
    where: { status: ServiceStatus.ONLINE },
    orderBy: { displayOrder: "asc" },
    include: { category: true, fields: { orderBy: { displayOrder: "asc" } } },
  });

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">IMEI Services</h1>
        <p className="text-sm text-hint">Unlock, FRP, and IMEI-based services.</p>
      </div>

      {services.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ImeiServiceCard key={service.id} service={service} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-hint">No services available yet.</p>
      )}

      <ImeiServiceForm />
    </main>
  );
}
