-- Tenant isolation (Chapter 30): recharge methods and recharge orders
-- become per-tenant — same backfill/drop-default pattern as the earlier
-- tenant-isolation migrations.

-- RechargeMethod
ALTER TABLE "RechargeMethod" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'falcon-unlocker';
ALTER TABLE "RechargeMethod" ADD CONSTRAINT "RechargeMethod_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RechargeMethod" ALTER COLUMN "tenantId" DROP DEFAULT;

-- RechargeOrder
ALTER TABLE "RechargeOrder" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'falcon-unlocker';
ALTER TABLE "RechargeOrder" ADD CONSTRAINT "RechargeOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RechargeOrder" ALTER COLUMN "tenantId" DROP DEFAULT;
