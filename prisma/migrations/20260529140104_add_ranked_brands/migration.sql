-- CreateTable
CREATE TABLE "ranked_brands" (
    "id" TEXT NOT NULL,
    "answerAnalysisId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ranked_brands_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ranked_brands_answerAnalysisId_idx" ON "ranked_brands"("answerAnalysisId");

-- CreateIndex
CREATE INDEX "ranked_brands_rank_idx" ON "ranked_brands"("rank");

-- AddForeignKey
ALTER TABLE "ranked_brands" ADD CONSTRAINT "ranked_brands_answerAnalysisId_fkey" FOREIGN KEY ("answerAnalysisId") REFERENCES "answer_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
