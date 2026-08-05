-- CreateEnum
CREATE TYPE "RechargeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateTable
CREATE TABLE "RechargeMethod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "accountDetails" TEXT,
    "customText" TEXT,
    "imageUrl" TEXT,
    "qrCodeUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RechargeMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RechargeOrder" (
    "id" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "proofUrl" TEXT,
    "proofNote" TEXT,
    "status" "RechargeStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,
    "reviewedById" TEXT,

    CONSTRAINT "RechargeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "rechargeOrderId" TEXT,
    "imeiOrderId" TEXT,
    "serverOrderId" TEXT,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RechargeOrder" ADD CONSTRAINT "RechargeOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RechargeOrder" ADD CONSTRAINT "RechargeOrder_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "RechargeMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RechargeOrder" ADD CONSTRAINT "RechargeOrder_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_rechargeOrderId_fkey" FOREIGN KEY ("rechargeOrderId") REFERENCES "RechargeOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_imeiOrderId_fkey" FOREIGN KEY ("imeiOrderId") REFERENCES "ImeiOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_serverOrderId_fkey" FOREIGN KEY ("serverOrderId") REFERENCES "ServerOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
