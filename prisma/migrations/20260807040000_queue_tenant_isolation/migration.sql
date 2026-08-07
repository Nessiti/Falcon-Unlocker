-- Tenant isolation (Chapter 29): queue entries become per-tenant too,
-- snapshotted from the order at enqueue time — same backfill/drop-default
-- pattern as the earlier tenant-isolation migrations.

ALTER TABLE "OrderQueueEntry" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'falcon-unlocker';
ALTER TABLE "OrderQueueEntry" ADD CONSTRAINT "OrderQueueEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderQueueEntry" ALTER COLUMN "tenantId" DROP DEFAULT;
