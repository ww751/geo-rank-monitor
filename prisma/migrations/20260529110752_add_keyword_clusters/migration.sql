-- DropForeignKey
ALTER TABLE "keywords" DROP CONSTRAINT "keywords_brandId_fkey";

-- AlterTable
ALTER TABLE "keywords" ADD COLUMN     "clusterId" TEXT,
ALTER COLUMN "brandId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "keyword_clusters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "keyword_clusters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "keyword_clusters_city_industry_idx" ON "keyword_clusters"("city", "industry");

-- CreateIndex
CREATE INDEX "keyword_clusters_category_idx" ON "keyword_clusters"("category");

-- CreateIndex
CREATE INDEX "keywords_clusterId_idx" ON "keywords"("clusterId");

-- AddForeignKey
ALTER TABLE "keywords" ADD CONSTRAINT "keywords_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keywords" ADD CONSTRAINT "keywords_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "keyword_clusters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
