-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('DHRU_FUSION', 'PHP_API', 'REST_API', 'JSON_API', 'XML_API', 'CUSTOM_API');

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProviderType" NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "username" TEXT,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "token" TEXT,
    "timeoutMs" INTEGER NOT NULL DEFAULT 30000,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "autoSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastBalanceCents" INTEGER,
    "lastBalanceAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderConnectionLog" (
    "id" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "responseTimeMs" INTEGER,
    "statusCode" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "providerId" TEXT NOT NULL,

    CONSTRAINT "ProviderConnectionLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProviderConnectionLog" ADD CONSTRAINT "ProviderConnectionLog_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
