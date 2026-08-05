-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'MODERATOR';

-- AlterEnum
ALTER TYPE "ServiceFieldType" ADD VALUE 'DATE';
ALTER TYPE "ServiceFieldType" ADD VALUE 'PASSWORD';
ALTER TYPE "ServiceFieldType" ADD VALUE 'EMAIL';
ALTER TYPE "ServiceFieldType" ADD VALUE 'IP';
ALTER TYPE "ServiceFieldType" ADD VALUE 'IMEI';
ALTER TYPE "ServiceFieldType" ADD VALUE 'SN';
ALTER TYPE "ServiceFieldType" ADD VALUE 'ECID';
ALTER TYPE "ServiceFieldType" ADD VALUE 'JSON';

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BLOCKED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "ImeiServiceField" ADD COLUMN "regex" TEXT,
ADD COLUMN     "placeholder" TEXT,
ADD COLUMN     "defaultValue" TEXT;

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImeiOrderStatusEvent" (
    "id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,

    CONSTRAINT "ImeiOrderStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerOrderStatusEvent" (
    "id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,

    CONSTRAINT "ServerOrderStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "publishAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Popup" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "color" TEXT,
    "imageUrl" TEXT,
    "animation" TEXT,
    "buttonText" TEXT,
    "buttonUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Popup_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImeiOrderStatusEvent" ADD CONSTRAINT "ImeiOrderStatusEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ImeiOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImeiOrderStatusEvent" ADD CONSTRAINT "ImeiOrderStatusEvent_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerOrderStatusEvent" ADD CONSTRAINT "ServerOrderStatusEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ServerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerOrderStatusEvent" ADD CONSTRAINT "ServerOrderStatusEvent_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
