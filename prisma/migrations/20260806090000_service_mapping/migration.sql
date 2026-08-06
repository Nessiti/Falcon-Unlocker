-- CreateTable
CREATE TABLE "ImeiServiceMapping" (
    "id" TEXT NOT NULL,
    "providerServiceId" TEXT NOT NULL,
    "providerServiceName" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imeiServiceId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,

    CONSTRAINT "ImeiServiceMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerServiceMapping" (
    "id" TEXT NOT NULL,
    "providerServiceId" TEXT NOT NULL,
    "providerServiceName" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serverServiceId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,

    CONSTRAINT "ServerServiceMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImeiServiceMapping_imeiServiceId_providerId_providerService_key" ON "ImeiServiceMapping"("imeiServiceId", "providerId", "providerServiceId");

-- CreateIndex
CREATE UNIQUE INDEX "ServerServiceMapping_serverServiceId_providerId_providerSer_key" ON "ServerServiceMapping"("serverServiceId", "providerId", "providerServiceId");

-- AddForeignKey
ALTER TABLE "ImeiServiceMapping" ADD CONSTRAINT "ImeiServiceMapping_imeiServiceId_fkey" FOREIGN KEY ("imeiServiceId") REFERENCES "ImeiService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImeiServiceMapping" ADD CONSTRAINT "ImeiServiceMapping_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerServiceMapping" ADD CONSTRAINT "ServerServiceMapping_serverServiceId_fkey" FOREIGN KEY ("serverServiceId") REFERENCES "ServerService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerServiceMapping" ADD CONSTRAINT "ServerServiceMapping_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
