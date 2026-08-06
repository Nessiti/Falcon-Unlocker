-- CreateEnum
CREATE TYPE "SyncFrequency" AS ENUM ('MANUAL', 'HOURLY', 'EVERY_6_HOURS', 'DAILY');

-- AlterTable
ALTER TABLE "Provider" DROP COLUMN "autoSyncEnabled",
ADD COLUMN     "lastSyncAt" TIMESTAMP(3),
ADD COLUMN     "syncFrequency" "SyncFrequency" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "ImeiServiceMapping" ADD COLUMN     "providerCategory" TEXT,
ADD COLUMN     "providerEstimatedTime" TEXT;

-- AlterTable
ALTER TABLE "ServerServiceMapping" ADD COLUMN     "providerCategory" TEXT,
ADD COLUMN     "providerEstimatedTime" TEXT;

