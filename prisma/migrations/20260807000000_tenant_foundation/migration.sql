-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE');

-- AlterEnum
-- Only adding the value here — using it happens in a separate migration
-- (Postgres forbids using a newly added enum value within the same
-- transaction it was added in).
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "telegramBotUsername" TEXT,
    "telegramBotToken" TEXT,
    "ownerTelegramId" BIGINT,
    "email" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "country" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'STARTER',
    "subscriptionExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- Seed: Falcon Unlocker becomes tenant #1 — the already-running app's data
-- (bot token stays in env vars for now; that wiring is a later chapter)
-- gets a home without moving anything.
INSERT INTO "Tenant" ("id", "name", "currency", "language", "status", "subscriptionPlan", "updatedAt")
VALUES ('falcon-unlocker', 'Falcon Unlocker', 'USD', 'en', 'ACTIVE', 'ENTERPRISE', CURRENT_TIMESTAMP);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "tenantId" TEXT;

-- Backfill: every existing user belongs to the Falcon Unlocker tenant.
UPDATE "User" SET "tenantId" = 'falcon-unlocker';

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
