-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pinHash" TEXT,
ADD COLUMN     "biometricEnabled" BOOLEAN NOT NULL DEFAULT false;
