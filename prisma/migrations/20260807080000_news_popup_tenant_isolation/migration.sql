-- Tenant isolation (Chapter 34): news posts and popups become per-tenant —
-- same backfill/drop-default pattern as the earlier tenant-isolation
-- migrations.

-- NewsPost
ALTER TABLE "NewsPost" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'falcon-unlocker';
ALTER TABLE "NewsPost" ADD CONSTRAINT "NewsPost_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NewsPost" ALTER COLUMN "tenantId" DROP DEFAULT;

-- Popup
ALTER TABLE "Popup" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'falcon-unlocker';
ALTER TABLE "Popup" ADD CONSTRAINT "Popup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Popup" ALTER COLUMN "tenantId" DROP DEFAULT;
