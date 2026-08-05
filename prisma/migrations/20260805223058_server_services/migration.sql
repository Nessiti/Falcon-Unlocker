-- CreateEnum
CREATE TYPE "ServerServiceType" AS ENUM ('LICENSE', 'ACTIVATION', 'CREDITS', 'SUBSCRIPTION', 'UNLOCK', 'FRP', 'FLASH', 'REPAIR');

-- CreateEnum
CREATE TYPE "ServerFieldType" AS ENUM ('USERNAME', 'PASSWORD', 'TOKEN', 'IP', 'SERIAL', 'CUSTOM_TEXTBOX');

-- CreateTable
CREATE TABLE "ServerService" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "estimatedTime" TEXT NOT NULL,
    "status" "ServiceStatus" NOT NULL DEFAULT 'ONLINE',
    "badge" "ServiceBadge",
    "imageUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "type" "ServerServiceType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categoryId" TEXT,

    CONSTRAINT "ServerService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerServiceField" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "ServerFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "ServerServiceField_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ServerService" ADD CONSTRAINT "ServerService_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerServiceField" ADD CONSTRAINT "ServerServiceField_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServerService"("id") ON DELETE CASCADE ON UPDATE CASCADE;
