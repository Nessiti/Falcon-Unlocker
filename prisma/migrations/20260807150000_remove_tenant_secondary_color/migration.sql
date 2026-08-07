-- Remove the unused secondary color field from Tenant. Brand button color
-- is configured via `primaryColor` alone; no tenant UI ever exposed a
-- secondary color.
ALTER TABLE "Tenant" DROP COLUMN "secondaryColor";
