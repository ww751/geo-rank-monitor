-- CreateEnum
CREATE TYPE "ImprovementExperimentStatus" AS ENUM ('PLANNED', 'BASELINE_COLLECTED', 'OPTIMIZATION_REPLAYED', 'REAL_VALIDATED', 'COMPLETED');

-- CreateTable
CREATE TABLE "improvement_experiments" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "optimizationTaskId" TEXT,
    "baselineRankResultId" TEXT,
    "replayRankResultId" TEXT,
    "validationRankResultId" TEXT,
    "status" "ImprovementExperimentStatus" NOT NULL DEFAULT 'PLANNED',
    "hypothesis" TEXT,
    "actionSummary" TEXT,
    "nextStep" TEXT,
    "baselineRank" INTEGER,
    "replayRank" INTEGER,
    "validationRank" INTEGER,
    "baselineScore" INTEGER NOT NULL DEFAULT 0,
    "replayScore" INTEGER,
    "validationScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "improvement_experiments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "improvement_experiments_optimizationTaskId_key" ON "improvement_experiments"("optimizationTaskId");

-- CreateIndex
CREATE INDEX "improvement_experiments_brandId_idx" ON "improvement_experiments"("brandId");

-- CreateIndex
CREATE INDEX "improvement_experiments_keywordId_idx" ON "improvement_experiments"("keywordId");

-- CreateIndex
CREATE INDEX "improvement_experiments_platformId_idx" ON "improvement_experiments"("platformId");

-- CreateIndex
CREATE INDEX "improvement_experiments_status_idx" ON "improvement_experiments"("status");

-- CreateIndex
CREATE INDEX "improvement_experiments_createdAt_idx" ON "improvement_experiments"("createdAt");

-- AddForeignKey
ALTER TABLE "improvement_experiments" ADD CONSTRAINT "improvement_experiments_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "improvement_experiments" ADD CONSTRAINT "improvement_experiments_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "improvement_experiments" ADD CONSTRAINT "improvement_experiments_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "ai_platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "improvement_experiments" ADD CONSTRAINT "improvement_experiments_optimizationTaskId_fkey" FOREIGN KEY ("optimizationTaskId") REFERENCES "optimization_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "improvement_experiments" ADD CONSTRAINT "improvement_experiments_baselineRankResultId_fkey" FOREIGN KEY ("baselineRankResultId") REFERENCES "rank_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "improvement_experiments" ADD CONSTRAINT "improvement_experiments_replayRankResultId_fkey" FOREIGN KEY ("replayRankResultId") REFERENCES "rank_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "improvement_experiments" ADD CONSTRAINT "improvement_experiments_validationRankResultId_fkey" FOREIGN KEY ("validationRankResultId") REFERENCES "rank_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;
