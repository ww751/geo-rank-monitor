-- AlterTable
ALTER TABLE "answer_analyses" ADD COLUMN     "filteredBrands" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "rawCandidates" TEXT[] DEFAULT ARRAY[]::TEXT[];
