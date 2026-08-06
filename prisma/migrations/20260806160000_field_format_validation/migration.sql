-- AlterEnum
ALTER TYPE "ServiceFieldType" ADD VALUE 'UDID';
ALTER TYPE "ServiceFieldType" ADD VALUE 'MEID';
ALTER TYPE "ServiceFieldType" ADD VALUE 'ICCID';

-- AlterTable
ALTER TABLE "ImeiServiceField" ADD COLUMN     "minLength" INTEGER,
ADD COLUMN     "maxLength" INTEGER;

-- AlterTable
ALTER TABLE "ServerServiceField" ADD COLUMN     "placeholder" TEXT,
ADD COLUMN     "minLength" INTEGER,
ADD COLUMN     "maxLength" INTEGER;
