-- Tenant isolation (Chapter 25): the catalog (Category, ImeiService,
-- ServerService) becomes per-tenant. Every existing row backfills to the
-- Falcon Unlocker tenant via the DEFAULT below, then the DEFAULT is dropped
-- so any future INSERT that forgets to set tenantId fails loudly (NOT NULL
-- violation) instead of silently landing on Falcon's tenant.

-- Category: name was globally unique, becomes unique per tenant instead —
-- two different brands can both have an "Unlock" category.
DROP INDEX "Category_name_key";

ALTER TABLE "Category" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'falcon-unlocker';
ALTER TABLE "Category" ADD CONSTRAINT "Category_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Category_tenantId_name_key" ON "Category"("tenantId", "name");
ALTER TABLE "Category" ALTER COLUMN "tenantId" DROP DEFAULT;

-- ImeiService
ALTER TABLE "ImeiService" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'falcon-unlocker';
ALTER TABLE "ImeiService" ADD CONSTRAINT "ImeiService_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImeiService" ALTER COLUMN "tenantId" DROP DEFAULT;

-- ServerService
ALTER TABLE "ServerService" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'falcon-unlocker';
ALTER TABLE "ServerService" ADD CONSTRAINT "ServerService_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServerService" ALTER COLUMN "tenantId" DROP DEFAULT;
