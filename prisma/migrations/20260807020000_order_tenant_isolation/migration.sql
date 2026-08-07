-- Tenant isolation (Chapter 26): orders become per-tenant too, snapshotted
-- from the ordered service's tenant at creation time — same backfill/drop-
-- default pattern as Chapter 25's catalog migration.

-- ImeiOrder
ALTER TABLE "ImeiOrder" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'falcon-unlocker';
ALTER TABLE "ImeiOrder" ADD CONSTRAINT "ImeiOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImeiOrder" ALTER COLUMN "tenantId" DROP DEFAULT;

-- ServerOrder
ALTER TABLE "ServerOrder" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'falcon-unlocker';
ALTER TABLE "ServerOrder" ADD CONSTRAINT "ServerOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServerOrder" ALTER COLUMN "tenantId" DROP DEFAULT;
