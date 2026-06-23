-- CreateTable
CREATE TABLE "geo_scores" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,
    "visibilityScore" INTEGER NOT NULL DEFAULT 0,
    "rankingScore" INTEGER NOT NULL DEFAULT 0,
    "citationScore" INTEGER NOT NULL DEFAULT 0,
    "coverageScore" INTEGER NOT NULL DEFAULT 0,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "geo_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "geo_scores_brandId_createdAt_idx" ON "geo_scores"("brandId", "createdAt");

-- CreateIndex
CREATE INDEX "geo_scores_keywordId_idx" ON "geo_scores"("keywordId");

-- CreateIndex
CREATE INDEX "geo_scores_platform_idx" ON "geo_scores"("platform");

-- AddForeignKey
ALTER TABLE "geo_scores" ADD CONSTRAINT "geo_scores_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geo_scores" ADD CONSTRAINT "geo_scores_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;
