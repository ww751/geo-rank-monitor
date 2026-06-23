-- CreateEnum
CREATE TYPE "PlatformSessionStatus" AS ENUM ('NOT_CONFIGURED', 'READY', 'NEEDS_LOGIN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PipelineRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ShareLinkStatus" AS ENUM ('ACTIVE', 'DISABLED', 'EXPIRED');

-- AlterTable
ALTER TABLE "contents" ADD COLUMN     "afterScore" INTEGER,
ADD COLUMN     "beforeScore" INTEGER,
ADD COLUMN     "impactNotes" TEXT,
ADD COLUMN     "optimizationTaskId" TEXT,
ADD COLUMN     "ownerName" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "platform_sessions" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "storageStatePath" TEXT,
    "collectorConfig" JSONB NOT NULL DEFAULT '{}',
    "status" "PlatformSessionStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "lastCheckedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_runs" (
    "id" TEXT NOT NULL,
    "monitoringJobId" TEXT NOT NULL,
    "status" "PipelineRunStatus" NOT NULL DEFAULT 'RUNNING',
    "steps" JSONB NOT NULL DEFAULT '[]',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pipeline_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_share_links" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "ShareLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_share_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_sessions_platformId_key" ON "platform_sessions"("platformId");

-- CreateIndex
CREATE INDEX "platform_sessions_status_idx" ON "platform_sessions"("status");

-- CreateIndex
CREATE INDEX "pipeline_runs_monitoringJobId_idx" ON "pipeline_runs"("monitoringJobId");

-- CreateIndex
CREATE INDEX "pipeline_runs_status_startedAt_idx" ON "pipeline_runs"("status", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "client_share_links_token_key" ON "client_share_links"("token");

-- CreateIndex
CREATE INDEX "client_share_links_clientId_idx" ON "client_share_links"("clientId");

-- CreateIndex
CREATE INDEX "client_share_links_status_idx" ON "client_share_links"("status");

-- CreateIndex
CREATE INDEX "contents_optimizationTaskId_idx" ON "contents"("optimizationTaskId");

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_optimizationTaskId_fkey" FOREIGN KEY ("optimizationTaskId") REFERENCES "optimization_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_sessions" ADD CONSTRAINT "platform_sessions_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "ai_platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_runs" ADD CONSTRAINT "pipeline_runs_monitoringJobId_fkey" FOREIGN KEY ("monitoringJobId") REFERENCES "monitoring_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_share_links" ADD CONSTRAINT "client_share_links_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
