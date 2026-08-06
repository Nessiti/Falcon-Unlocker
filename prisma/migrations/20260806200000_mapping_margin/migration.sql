-- AlterTable
ALTER TABLE "ImeiServiceMapping" ADD COLUMN     "marginPercent" INTEGER,
ADD COLUMN     "marginCents" INTEGER;

-- AlterTable
ALTER TABLE "ServerServiceMapping" ADD COLUMN     "marginPercent" INTEGER,
ADD COLUMN     "marginCents" INTEGER;
