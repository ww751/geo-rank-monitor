-- CreateTable
CREATE TABLE "answer_analyses" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "brandsFound" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "clientFound" BOOLEAN NOT NULL DEFAULT false,
    "clientRank" INTEGER,
    "competitors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "citationUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "answer_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "answer_analyses_platform_idx" ON "answer_analyses"("platform");

-- CreateIndex
CREATE INDEX "answer_analyses_keyword_idx" ON "answer_analyses"("keyword");
