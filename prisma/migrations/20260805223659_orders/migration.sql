-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CHECKING', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ImeiOrder" (
    "id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "priceCents" INTEGER NOT NULL,
    "fieldValues" JSONB NOT NULL,
    "tracking" TEXT,
    "notes" TEXT,
    "downloadUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "ImeiOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerOrder" (
    "id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "priceCents" INTEGER NOT NULL,
    "fieldValues" JSONB NOT NULL,
    "tracking" TEXT,
    "notes" TEXT,
    "downloadUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "ServerOrder_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ImeiOrder" ADD CONSTRAINT "ImeiOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImeiOrder" ADD CONSTRAINT "ImeiOrder_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ImeiService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerOrder" ADD CONSTRAINT "ServerOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerOrder" ADD CONSTRAINT "ServerOrder_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServerService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
