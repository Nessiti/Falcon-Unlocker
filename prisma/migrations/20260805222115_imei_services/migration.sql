-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "ServiceBadge" AS ENUM ('POPULAR', 'NEW', 'FEATURED');

-- CreateEnum
CREATE TYPE "ServiceFieldType" AS ENUM ('TEXT', 'TEXTAREA', 'NUMBER', 'SELECT', 'CHECKBOX');

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImeiService" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "estimatedTime" TEXT NOT NULL,
    "status" "ServiceStatus" NOT NULL DEFAULT 'ONLINE',
    "badge" "ServiceBadge",
    "imageUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categoryId" TEXT,

    CONSTRAINT "ImeiService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImeiServiceField" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "ServiceFieldType" NOT NULL,
    "options" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "ImeiServiceField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- AddForeignKey
ALTER TABLE "ImeiService" ADD CONSTRAINT "ImeiService_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImeiServiceField" ADD CONSTRAINT "ImeiServiceField_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ImeiService"("id") ON DELETE CASCADE ON UPDATE CASCADE;
