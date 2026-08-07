-- Referral system removed (not needed). The in-app notification feed
-- (UserNotification) from the same chapter stays.

-- DropForeignKey
ALTER TABLE "PendingReferral" DROP CONSTRAINT "PendingReferral_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "PendingReferral" DROP CONSTRAINT "PendingReferral_referrerId_fkey";

-- DropTable
DROP TABLE "PendingReferral";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_referredById_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "referredById",
                    DROP COLUMN "referralRewardPaid";
