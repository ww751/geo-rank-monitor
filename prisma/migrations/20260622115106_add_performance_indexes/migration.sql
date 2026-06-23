-- CreateIndex
CREATE INDEX "answer_analyses_createdAt_idx" ON "answer_analyses"("createdAt");

-- CreateIndex
CREATE INDEX "answer_analyses_platform_createdAt_idx" ON "answer_analyses"("platform", "createdAt");

-- CreateIndex
CREATE INDEX "geo_scores_keywordId_platform_idx" ON "geo_scores"("keywordId", "platform");

-- CreateIndex
CREATE INDEX "geo_scores_runId_brandId_keywordId_platform_idx" ON "geo_scores"("runId", "brandId", "keywordId", "platform");

-- CreateIndex
CREATE INDEX "optimization_tasks_brandId_status_idx" ON "optimization_tasks"("brandId", "status");

-- CreateIndex
CREATE INDEX "rank_results_sampledAt_idx" ON "rank_results"("sampledAt");
