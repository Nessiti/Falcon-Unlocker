-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "rateLimitPerMinute" INTEGER,
ADD COLUMN     "secretsRotatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SecuritySettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "adminIpAllowlist" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecuritySettings_pkey" PRIMARY KEY ("id")
);

