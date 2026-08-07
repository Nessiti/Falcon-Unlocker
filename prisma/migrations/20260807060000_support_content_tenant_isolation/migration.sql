-- Tenant isolation (Chapter 31): support tickets, FAQ, and Help articles
-- become per-tenant — same backfill/drop-default pattern as the earlier
-- tenant-isolation migrations.

-- SupportTicket
ALTER TABLE "SupportTicket" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'falcon-unlocker';
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ALTER COLUMN "tenantId" DROP DEFAULT;

-- FaqItem
ALTER TABLE "FaqItem" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'falcon-unlocker';
ALTER TABLE "FaqItem" ADD CONSTRAINT "FaqItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FaqItem" ALTER COLUMN "tenantId" DROP DEFAULT;

-- HelpArticle
ALTER TABLE "HelpArticle" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'falcon-unlocker';
ALTER TABLE "HelpArticle" ADD CONSTRAINT "HelpArticle_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HelpArticle" ALTER COLUMN "tenantId" DROP DEFAULT;

-- AboutPage: was a fixed-id singleton ("about"), becomes one row per tenant
-- keyed directly by tenantId. At most one row exists today.
ALTER TABLE "AboutPage" ADD COLUMN "tenantId" TEXT;
UPDATE "AboutPage" SET "tenantId" = 'falcon-unlocker' WHERE "id" = 'about';
ALTER TABLE "AboutPage" DROP CONSTRAINT "AboutPage_pkey";
ALTER TABLE "AboutPage" DROP COLUMN "id";
ALTER TABLE "AboutPage" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "AboutPage" ADD CONSTRAINT "AboutPage_pkey" PRIMARY KEY ("tenantId");
ALTER TABLE "AboutPage" ADD CONSTRAINT "AboutPage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
