-- CreateEnum
CREATE TYPE "GeoScoreRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MonitoringJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELED');

-- AlterTable
ALTER TABLE "answer_analyses" ADD COLUMN     "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "extractionTrace" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "ruleVersion" TEXT NOT NULL DEFAULT 'rules-v1';

-- AlterTable
ALTER TABLE "geo_scores" ADD COLUMN     "answerAnalysisId" TEXT,
ADD COLUMN     "runId" TEXT;

-- CreateTable
CREATE TABLE "geo_score_runs" (
    "id" TEXT NOT NULL,
    "status" "GeoScoreRunStatus" NOT NULL DEFAULT 'RUNNING',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "filters" JSONB NOT NULL DEFAULT '{}',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "geo_score_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring_jobs" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "status" "MonitoringJobStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitoring_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_artifacts" (
    "id" TEXT NOT NULL,
    "monitoringJobId" TEXT NOT NULL,
    "answerAnalysisId" TEXT,
    "rawAnswer" TEXT NOT NULL,
    "screenshotPath" TEXT,
    "htmlSummary" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "geo_score_runs_status_startedAt_idx" ON "geo_score_runs"("status", "startedAt");

-- CreateIndex
CREATE INDEX "monitoring_jobs_brandId_idx" ON "monitoring_jobs"("brandId");

-- CreateIndex
CREATE INDEX "monitoring_jobs_keywordId_idx" ON "monitoring_jobs"("keywordId");

-- CreateIndex
CREATE INDEX "monitoring_jobs_platformId_idx" ON "monitoring_jobs"("platformId");

-- CreateIndex
CREATE INDEX "monitoring_jobs_status_scheduledAt_idx" ON "monitoring_jobs"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "collection_artifacts_monitoringJobId_idx" ON "collection_artifacts"("monitoringJobId");

-- CreateIndex
CREATE INDEX "collection_artifacts_answerAnalysisId_idx" ON "collection_artifacts"("answerAnalysisId");

-- CreateIndex
CREATE INDEX "geo_scores_runId_idx" ON "geo_scores"("runId");

-- CreateIndex
CREATE INDEX "geo_scores_answerAnalysisId_idx" ON "geo_scores"("answerAnalysisId");

-- AddForeignKey
ALTER TABLE "geo_scores" ADD CONSTRAINT "geo_scores_runId_fkey" FOREIGN KEY ("runId") REFERENCES "geo_score_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geo_scores" ADD CONSTRAINT "geo_scores_answerAnalysisId_fkey" FOREIGN KEY ("answerAnalysisId") REFERENCES "answer_analyses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_jobs" ADD CONSTRAINT "monitoring_jobs_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_jobs" ADD CONSTRAINT "monitoring_jobs_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_jobs" ADD CONSTRAINT "monitoring_jobs_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "ai_platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_artifacts" ADD CONSTRAINT "collection_artifacts_monitoringJobId_fkey" FOREIGN KEY ("monitoringJobId") REFERENCES "monitoring_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_artifacts" ADD CONSTRAINT "collection_artifacts_answerAnalysisId_fkey" FOREIGN KEY ("answerAnalysisId") REFERENCES "answer_analyses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
