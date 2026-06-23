-- CreateEnum
CREATE TYPE "ContentPublicationStatus" AS ENUM ('PUBLISHED', 'WAITING_RETEST', 'RETESTING', 'REVIEWED');

-- CreateEnum
CREATE TYPE "PublicationRetestStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CitationType" ADD VALUE 'QA';
ALTER TYPE "CitationType" ADD VALUE 'MAP';
ALTER TYPE "CitationType" ADD VALUE 'LOCAL_LIFE';
ALTER TYPE "CitationType" ADD VALUE 'UNKNOWN';

-- AlterTable
ALTER TABLE "citations" ADD COLUMN     "authorityScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isValid" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastCheckedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "collection_artifacts" ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "content_publications" (
    "id" TEXT NOT NULL,
    "contentId" TEXT,
    "brandId" TEXT NOT NULL,
    "keywordId" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'Doubao',
    "publishedUrl" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ContentPublicationStatus" NOT NULL DEFAULT 'PUBLISHED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_retests" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "monitoringJobId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "beforeScore" INTEGER,
    "afterScore" INTEGER,
    "deltaScore" INTEGER,
    "resultSummary" TEXT,
    "status" "PublicationRetestStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publication_retests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_publications_contentId_idx" ON "content_publications"("contentId");

-- CreateIndex
CREATE INDEX "content_publications_brandId_idx" ON "content_publications"("brandId");

-- CreateIndex
CREATE INDEX "content_publications_keywordId_idx" ON "content_publications"("keywordId");

-- CreateIndex
CREATE INDEX "content_publications_platform_idx" ON "content_publications"("platform");

-- CreateIndex
CREATE INDEX "content_publications_status_idx" ON "content_publications"("status");

-- CreateIndex
CREATE INDEX "publication_retests_publicationId_idx" ON "publication_retests"("publicationId");

-- CreateIndex
CREATE INDEX "publication_retests_monitoringJobId_idx" ON "publication_retests"("monitoringJobId");

-- CreateIndex
CREATE INDEX "publication_retests_status_scheduledAt_idx" ON "publication_retests"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "citations_domain_idx" ON "citations"("domain");

-- CreateIndex
CREATE INDEX "citations_type_idx" ON "citations"("type");

-- AddForeignKey
ALTER TABLE "content_publications" ADD CONSTRAINT "content_publications_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "contents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_publications" ADD CONSTRAINT "content_publications_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_publications" ADD CONSTRAINT "content_publications_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "keywords"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_retests" ADD CONSTRAINT "publication_retests_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "content_publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_retests" ADD CONSTRAINT "publication_retests_monitoringJobId_fkey" FOREIGN KEY ("monitoringJobId") REFERENCES "monitoring_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
