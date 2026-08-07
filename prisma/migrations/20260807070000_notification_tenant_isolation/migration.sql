-- Tenant isolation (Chapter 33): broadcast notification history becomes
-- per-tenant — same backfill/drop-default pattern as the earlier
-- tenant-isolation migrations.

ALTER TABLE "Notification" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'falcon-unlocker';
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ALTER COLUMN "tenantId" DROP DEFAULT;
