import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeAnswer } from "@/lib/answer-analyzer";
import { withDisplayNames } from "@/lib/field-labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const answerAnalyzerSchema = z.object({
  platform: z.string().trim().min(1, "AI 平台不能为空").max(80, "AI 平台名称过长"),
  keyword: z.string().trim().min(1, "关键词不能为空").max(200, "关键词过长"),
  answer: z.string().trim().min(1, "AI 回答不能为空").max(20000, "AI 回答过长"),
});

export async function POST(request: Request) {
  const parsed = answerAnalyzerSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "请求参数不合法", displayNames: { error: "错误信息" } },
      { status: 400 },
    );
  }

  const { platform, keyword, answer } = parsed.data;
  const [brands, competitors] = await Promise.all([
    prisma.brand.findMany({ select: { name: true } }),
    prisma.competitor.findMany({ select: { name: true } }),
  ]);

  const analysis = analyzeAnswer({
    answer,
    clientBrands: brands.map((brand) => brand.name),
    competitorBrands: competitors.map((competitor) => competitor.name),
  });

  const saved = await prisma.answerAnalysis.create({
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

  return NextResponse.json(withDisplayNames(saved));
}
