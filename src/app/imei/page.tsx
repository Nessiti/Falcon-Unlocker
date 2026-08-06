import { prisma } from "@/lib/prisma";
import { ServiceStatus } from "@/generated/prisma/client";
import { ImeiCatalog } from "@/components/imei/imei-catalog";
import { ImeiServiceForm } from "@/components/imei/imei-service-form";
import { ImeiServiceManager } from "@/components/imei/imei-service-manager";

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

      <ImeiCatalog services={services} />

      <ImeiServiceManager />
      <ImeiServiceForm />
    </main>
  );
}
