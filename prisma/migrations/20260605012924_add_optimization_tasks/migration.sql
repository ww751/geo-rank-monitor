-- CreateEnum
CREATE TYPE "OptimizationTaskType" AS ENUM ('CONTENT_ASSET', 'TOP3_BOOST', 'CITATION_BUILDING', 'KEYWORD_COVERAGE', 'COMPETITOR_GAP');

-- CreateEnum
CREATE TYPE "OptimizationTaskPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "OptimizationTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'DISMISSED');

-- CreateTable
CREATE TABLE "optimization_tasks" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "keywordId" TEXT,
    "geoScoreId" TEXT,
    "type" "OptimizationTaskType" NOT NULL,
    "priority" "OptimizationTaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "OptimizationTaskStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "targetPlatform" TEXT,
    "targetScoreImpact" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "answerAnalysisId" TEXT,

    CONSTRAINT "optimization_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "optimization_tasks_brandId_idx" ON "optimization_tasks"("brandId");

-- CreateIndex
CREATE INDEX "optimization_tasks_keywordId_idx" ON "optimization_tasks"("keywordId");

-- CreateIndex
CREATE INDEX "optimization_tasks_geoScoreId_idx" ON "optimization_tasks"("geoScoreId");

-- CreateIndex
CREATE INDEX "optimization_tasks_status_priority_idx" ON "optimization_tasks"("status", "priority");

-- CreateIndex
CREATE INDEX "optimization_tasks_type_idx" ON "optimization_tasks"("type");

-- AddForeignKey
ALTER TABLE "optimization_tasks" ADD CONSTRAINT "optimization_tasks_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optimization_tasks" ADD CONSTRAINT "optimization_tasks_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "keywords"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optimization_tasks" ADD CONSTRAINT "optimization_tasks_geoScoreId_fkey" FOREIGN KEY ("geoScoreId") REFERENCES "geo_scores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optimization_tasks" ADD CONSTRAINT "optimization_tasks_answerAnalysisId_fkey" FOREIGN KEY ("answerAnalysisId") REFERENCES "answer_analyses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
