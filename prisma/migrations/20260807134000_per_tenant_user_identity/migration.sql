-- Per-tenant user identity (Chapter 37): the same Telegram person can now
-- hold a separate, independent account in every tenant/brand they use,
-- instead of being permanently locked to whichever tenant they first
-- touched on the whole platform.

-- Safety-net backfill: self-heals any account that predates Chapter 32's
-- fix and hasn't logged in since (tenantId still null). Falcon Unlocker is
-- the only tenant that existed before multi-tenancy, so it's the correct
-- default for any stray row.
UPDATE "User" SET "tenantId" = 'falcon-unlocker' WHERE "tenantId" IS NULL;

-- DropForeignKey (recreated below without ON DELETE SET NULL, which can no
-- longer apply now that tenantId is required)
ALTER TABLE "User" DROP CONSTRAINT "User_tenantId_fkey";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "tenantId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropIndex: telegramId is no longer unique on its own
DROP INDEX "User_telegramId_key";

-- CreateIndex: unique per (telegramId, tenantId) instead
CREATE UNIQUE INDEX "User_telegramId_tenantId_key" ON "User"("telegramId", "tenantId");
