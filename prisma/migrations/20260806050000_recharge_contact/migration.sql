-- CreateEnum
CREATE TYPE "RechargeContactType" AS ENUM ('WHATSAPP', 'TELEGRAM');

-- AlterTable
ALTER TABLE "RechargeMethod" ADD COLUMN "contactType" "RechargeContactType",
ADD COLUMN     "contactValue" TEXT;
