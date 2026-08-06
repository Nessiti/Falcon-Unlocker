-- CreateTable
CREATE TABLE "CronRunLog" (
    "id" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "detail" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CronRunLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CronRunLog_task_createdAt_idx" ON "CronRunLog"("task", "createdAt");

