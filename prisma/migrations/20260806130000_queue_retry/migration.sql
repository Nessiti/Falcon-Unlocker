-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "ImeiOrderStatusEvent" DROP CONSTRAINT "ImeiOrderStatusEvent_adminId_fkey";

-- DropForeignKey
ALTER TABLE "ServerOrderStatusEvent" DROP CONSTRAINT "ServerOrderStatusEvent_adminId_fkey";

-- AlterTable
ALTER TABLE "ImeiOrderStatusEvent" ALTER COLUMN "adminId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ServerOrderStatusEvent" ALTER COLUMN "adminId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "OrderQueueEntry" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "QueueStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL,
    "retryDelaySeconds" INTEGER NOT NULL,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triedProviderIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastError" TEXT,
    "providerOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "currentProviderId" TEXT,

    CONSTRAINT "OrderQueueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueAttemptLog" (
    "id" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "queueEntryId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,

    CONSTRAINT "QueueAttemptLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "retryDelaySeconds" INTEGER NOT NULL DEFAULT 60,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QueueSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderQueueEntry_status_nextAttemptAt_idx" ON "OrderQueueEntry"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderQueueEntry_kind_orderId_key" ON "OrderQueueEntry"("kind", "orderId");

-- AddForeignKey
ALTER TABLE "ImeiOrderStatusEvent" ADD CONSTRAINT "ImeiOrderStatusEvent_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerOrderStatusEvent" ADD CONSTRAINT "ServerOrderStatusEvent_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderQueueEntry" ADD CONSTRAINT "OrderQueueEntry_currentProviderId_fkey" FOREIGN KEY ("currentProviderId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueAttemptLog" ADD CONSTRAINT "QueueAttemptLog_queueEntryId_fkey" FOREIGN KEY ("queueEntryId") REFERENCES "OrderQueueEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueAttemptLog" ADD CONSTRAINT "QueueAttemptLog_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

