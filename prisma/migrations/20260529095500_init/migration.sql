-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "KeywordIntent" AS ENUM ('BRAND', 'PRODUCT', 'SOLUTION', 'COMPARISON', 'REPUTATION');

-- CreateEnum
CREATE TYPE "Sentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CitationType" AS ENUM ('OFFICIAL', 'MEDIA', 'FORUM', 'WIKI', 'SOCIAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('ARTICLE', 'LANDING_PAGE', 'CASE_STUDY', 'DOC', 'FAQ', 'VIDEO');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('PLANNED', 'DRAFT', 'PUBLISHED', 'NEEDS_UPDATE');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'READY', 'SENT');

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "geoGoal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keywords" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "intent" "KeywordIntent" NOT NULL DEFAULT 'SOLUTION',
    "priority" INTEGER NOT NULL DEFAULT 3,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_platforms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "homepageUrl" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rank_results" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "brandMentioned" BOOLEAN NOT NULL DEFAULT false,
    "rankPosition" INTEGER,
    "sentiment" "Sentiment" NOT NULL DEFAULT 'UNKNOWN',
    "visibilityScore" INTEGER NOT NULL DEFAULT 0,
    "sampleSource" TEXT NOT NULL DEFAULT 'manual',
    "sampledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rank_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitors" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citations" (
    "id" TEXT NOT NULL,
    "rankResultId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "type" "CitationType" NOT NULL DEFAULT 'OTHER',
    "position" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "citations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contents" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "contentType" "ContentType" NOT NULL DEFAULT 'ARTICLE',
    "status" "ContentStatus" NOT NULL DEFAULT 'PLANNED',
    "targetKeyword" TEXT,
    "notes" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brands_clientId_idx" ON "brands"("clientId");

-- CreateIndex
CREATE INDEX "keywords_brandId_idx" ON "keywords"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_platforms_slug_key" ON "ai_platforms"("slug");

-- CreateIndex
CREATE INDEX "rank_results_brandId_sampledAt_idx" ON "rank_results"("brandId", "sampledAt");

-- CreateIndex
CREATE INDEX "rank_results_keywordId_idx" ON "rank_results"("keywordId");

-- CreateIndex
CREATE INDEX "rank_results_platformId_idx" ON "rank_results"("platformId");

-- CreateIndex
CREATE INDEX "competitors_brandId_idx" ON "competitors"("brandId");

-- CreateIndex
CREATE INDEX "citations_rankResultId_idx" ON "citations"("rankResultId");

-- CreateIndex
CREATE INDEX "contents_brandId_idx" ON "contents"("brandId");

-- CreateIndex
CREATE INDEX "reports_clientId_periodStart_idx" ON "reports"("clientId", "periodStart");

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keywords" ADD CONSTRAINT "keywords_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rank_results" ADD CONSTRAINT "rank_results_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rank_results" ADD CONSTRAINT "rank_results_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rank_results" ADD CONSTRAINT "rank_results_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "ai_platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citations" ADD CONSTRAINT "citations_rankResultId_fkey" FOREIGN KEY ("rankResultId") REFERENCES "rank_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
