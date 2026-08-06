-- CreateTable
CREATE TABLE "ApiLog" (
    "id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "requestBody" TEXT,
    "responseBody" TEXT,
    "statusCode" INTEGER,
    "responseTimeMs" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "providerId" TEXT NOT NULL,

    CONSTRAINT "ApiLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApiLog_providerId_createdAt_idx" ON "ApiLog"("providerId", "createdAt");

-- AddForeignKey
ALTER TABLE "ApiLog" ADD CONSTRAINT "ApiLog_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

