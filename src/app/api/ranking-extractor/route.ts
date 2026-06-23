import { NextResponse } from "next/server";
import { analyzeAnswer } from "@/lib/answer-analyzer";
import { withDisplayNames } from "@/lib/field-labels";
import { extractRankedBrandsWithTrace } from "@/lib/ranking-extractor";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const input = (await request.json()) as {
    answerAnalysisId?: string;
    platform?: string;
    keyword?: string;
    answer?: string;
  };

  let answerAnalysisId = input.answerAnalysisId?.trim();
  let answer = input.answer?.trim();

  if (answerAnalysisId) {
    const existing = await prisma.answerAnalysis.findUnique({
      where: { id: answerAnalysisId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "回答分析记录不存在", displayNames: { error: "错误信息" } },
        { status: 404 },
      );
    }
    answer = existing.answer;
  } else {
    const platform = input.platform?.trim();
    const keyword = input.keyword?.trim();
    if (!platform || !keyword || !answer) {
      return NextResponse.json(
        { error: "AI 平台、关键词和 AI 回答不能为空", displayNames: { error: "错误信息" } },
        { status: 400 },
      );
    }

    const [brands, competitors] = await Promise.all([
      prisma.brand.findMany({ select: { name: true } }),
      prisma.competitor.findMany({ select: { name: true } }),
    ]);
    const analysis = analyzeAnswer({
      answer,
      clientBrands: brands.map((brand) => brand.name),
      competitorBrands: competitors.map((competitor) => competitor.name),
    });

    const savedAnalysis = await prisma.answerAnalysis.create({
      data: {
        platform,
        keyword,
        answer,
        brandsFound: analysis.brandsFound,
        filteredBrands: analysis.filteredBrands,
        rawCandidates: analysis.rawCandidates,
        clientFound: analysis.clientFound,
        clientRank: analysis.clientRank,
        competitors: analysis.competitors,
        citationUrls: analysis.citationUrls,
        ruleVersion: analysis.ruleVersion,
        confidenceScore: analysis.confidenceScore,
        extractionTrace: analysis.extractionTrace,
      },
    });
    answerAnalysisId = savedAnalysis.id;
  }

  const rankedBrandTrace = extractRankedBrandsWithTrace(answer ?? "");

  await prisma.$transaction([
    prisma.rankedBrand.deleteMany({ where: { answerAnalysisId } }),
    ...(rankedBrandTrace.length > 0
      ? [
          prisma.rankedBrand.createMany({
            data: rankedBrandTrace.map((item) => ({
              answerAnalysisId,
              brand: item.brand,
              rank: item.rank,
            })),
          }),
        ]
      : []),
  ]);

  const savedRankedBrands = await prisma.rankedBrand.findMany({
    where: { answerAnalysisId },
    orderBy: { rank: "asc" },
  });

  return NextResponse.json(
    withDisplayNames({
      answerAnalysisId,
      rankedBrands: savedRankedBrands,
      rankingTrace: rankedBrandTrace,
    }),
  );
}
