-- CreateEnum
CREATE TYPE "RoutingStrategy" AS ENUM ('CHEAPEST', 'FASTEST', 'HIGHEST_SUCCESS_RATE', 'PREFERRED', 'MANUAL');

-- AlterTable
ALTER TABLE "ImeiService" ADD COLUMN     "routingStrategy" "RoutingStrategy" NOT NULL DEFAULT 'PREFERRED';

-- AlterTable
ALTER TABLE "ServerService" ADD COLUMN     "routingStrategy" "RoutingStrategy" NOT NULL DEFAULT 'PREFERRED';

-- AlterTable
ALTER TABLE "ImeiServiceMapping" ADD COLUMN     "providerPriceCents" INTEGER;

-- AlterTable
ALTER TABLE "ServerServiceMapping" ADD COLUMN     "providerPriceCents" INTEGER;

