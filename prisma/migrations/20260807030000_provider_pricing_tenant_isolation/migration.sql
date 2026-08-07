-- Tenant isolation (Chapter 28): providers, their service mappings, and
-- pricing settings become per-tenant.

-- Provider
ALTER TABLE "Provider" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'falcon-unlocker';
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Provider" ALTER COLUMN "tenantId" DROP DEFAULT;

-- ImeiServiceMapping
ALTER TABLE "ImeiServiceMapping" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'falcon-unlocker';
ALTER TABLE "ImeiServiceMapping" ADD CONSTRAINT "ImeiServiceMapping_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImeiServiceMapping" ALTER COLUMN "tenantId" DROP DEFAULT;

-- ServerServiceMapping
ALTER TABLE "ServerServiceMapping" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'falcon-unlocker';
ALTER TABLE "ServerServiceMapping" ADD CONSTRAINT "ServerServiceMapping_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServerServiceMapping" ALTER COLUMN "tenantId" DROP DEFAULT;

-- PricingSettings: was a fixed-id singleton ("singleton"), becomes one row
-- per tenant keyed directly by tenantId. At most one row exists today.
ALTER TABLE "PricingSettings" ADD COLUMN "tenantId" TEXT;
UPDATE "PricingSettings" SET "tenantId" = 'falcon-unlocker' WHERE "id" = 'singleton';
ALTER TABLE "PricingSettings" DROP CONSTRAINT "PricingSettings_pkey";
ALTER TABLE "PricingSettings" DROP COLUMN "id";
ALTER TABLE "PricingSettings" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "PricingSettings" ADD CONSTRAINT "PricingSettings_pkey" PRIMARY KEY ("tenantId");
ALTER TABLE "PricingSettings" ADD CONSTRAINT "PricingSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
