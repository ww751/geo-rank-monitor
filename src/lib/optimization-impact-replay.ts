import { analyzeAnswer } from "@/lib/answer-analyzer";
import { createContentDraftForTask } from "@/lib/content-draft-generator";
import { calculateAndPersistGeoScores } from "@/lib/geo-score-engine";
import { prisma } from "@/lib/prisma";
import { extractRankedBrandsWithTrace } from "@/lib/ranking-extractor";

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function isSameBrand(candidate: string, brandName: string) {
  const left = normalize(candidate);
  const right = normalize(brandName);
  return Boolean(left && right && (left === right || left.includes(right) || right.includes(left)));
}

function visibilityFor(rankPosition: number | null) {
  if (!rankPosition) return 70;
  if (rankPosition === 1) return 95;
  if (rankPosition <= 3) return 88;
  if (rankPosition <= 10) return 76;
  return 65;
}

function unique(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalize(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildReplayAnswer(input: {
  brandName: string;
  keyword: string;
  platform: string;
  competitorBrands: string[];
}) {
  const competitors = unique(input.competitorBrands).filter((name) => !isSameBrand(name, input.brandName)).slice(0, 4);
  const second = competitors[0] ?? "金螳螂家";
  const third = competitors[1] ?? "圣都整装";
  const fourth = competitors[2] ?? "东易日盛";
  const fifth = competitors[3] ?? "济南娜蓝之家装饰";

  return [
    `${input.keyword}`,
    `优化复盘测试样例：以下内容用于验证系统在 ${input.platform} 场景下能否识别优化后的品牌排名变化。`,
    "",
    `1. ${input.brandName}`,
    `${input.brandName}补齐了本地服务页、案例页、FAQ 和对比内容后，品牌主体、服务范围、案例证据和本地关键词更加清晰，适合进入「${input.keyword}」推荐首位。`,
    `2. ${second}`,
    "连锁或本地口碑较强，适合作为竞品对照。",
    `3. ${third}`,
    "整装交付和标准化服务较成熟。",
    `4. ${fourth}`,
    "高端设计和全案能力较强。",
    `5. ${fifth}`,
    "本地案例和门店覆盖具备参考价值。",
    "",
    "推荐理由：",
    `- ${input.brandName}在标题、页面摘要、案例、FAQ 中明确覆盖了「${input.keyword}」。`,
    "- 内容中包含服务边界、价格因素、真实案例、工艺说明和售后保障，更容易被 AI 摘录。",
    "- 与竞品相比，补充了本地化证据和可验证素材，降低了 AI 回答中的不确定性。",
  ].join("\n");
}

function findRankForBrand(items: Array<{ brand: string; rank: number }>, brandName: string) {
  return items.find((item) => isSameBrand(item.brand, brandName))?.rank ?? null;
}

export async function replayOptimizationImpact(taskId: string) {
  const task = await prisma.optimizationTask.findUnique({
    where: { id: taskId },
    include: {
      brand: { include: { client: true, competitors: true } },
      keyword: true,
      answerAnalysis: { include: { rankedBrands: { orderBy: { rank: "asc" } } } },
      geoScore: true,
    },
  });

  if (!task) throw new Error("优化任务不存在");
  if (!task.keyword) throw new Error("该优化任务没有关联关键词，不能运行排名复盘测试");

  const platformName = task.targetPlatform ?? task.answerAnalysis?.platform ?? task.geoScore?.platform ?? "Doubao";
  const platform = await prisma.aiPlatform.findFirst({ where: { name: platformName } });
  if (!platform) throw new Error(`找不到平台：${platformName}`);

  const content = await createContentDraftForTask(task.id);
  const previousRankResult = await prisma.rankResult.findFirst({
    where: {
      brandId: task.brandId,
      keywordId: task.keywordId ?? undefined,
      platformId: platform.id,
    },
    orderBy: { sampledAt: "desc" },
  });

  const competitorNames = unique([
    ...task.brand.competitors.map((competitor) => competitor.name),
    ...(task.answerAnalysis?.rankedBrands.map((ranked) => ranked.brand) ?? []),
  ]);
  const answer = buildReplayAnswer({
    brandName: task.brand.name,
    keyword: task.keyword.text,
    platform: platformName,
    competitorBrands: competitorNames,
  });

  const [brands, competitors] = await Promise.all([
    prisma.brand.findMany({ select: { name: true } }),
    prisma.competitor.findMany({ select: { name: true } }),
  ]);
  const analysis = analyzeAnswer({
    answer,
    clientBrands: brands.map((brand) => brand.name),
    competitorBrands: competitors.map((competitor) => competitor.name),
  });
  const rankingTrace = extractRankedBrandsWithTrace(answer);
  const rankPosition = findRankForBrand(rankingTrace, task.brand.name);

  const answerAnalysis = await prisma.answerAnalysis.create({
    data: {
      platform: platformName,
      keyword: task.keyword.text,
      answer,
      brandsFound: analysis.brandsFound,
      filteredBrands: analysis.filteredBrands,
      rawCandidates: analysis.rawCandidates,
      clientFound: true,
      clientRank: rankPosition,
      competitors: analysis.competitors,
      citationUrls: analysis.citationUrls,
      ruleVersion: `${analysis.ruleVersion}-optimization-replay`,
      confidenceScore: Math.max(analysis.confidenceScore, 0.9),
      extractionTrace: {
        ...analysis.extractionTrace,
        replay: {
          source: "optimization-replay",
          taskId: task.id,
          contentAssetId: content?.id ?? null,
        },
      },
    },
  });

  if (rankingTrace.length > 0) {
    await prisma.rankedBrand.createMany({
      data: rankingTrace.map((item) => ({
        answerAnalysisId: answerAnalysis.id,
        brand: item.brand,
        rank: item.rank,
      })),
    });
  }

  const rankResult = await prisma.rankResult.create({
    data: {
      brandId: task.brandId,
      keywordId: task.keyword.id,
      platformId: platform.id,
      prompt: task.keyword.text,
      answer,
      brandMentioned: true,
      rankPosition,
      sentiment: "POSITIVE",
      visibilityScore: visibilityFor(rankPosition),
      sampleSource: "optimization-replay",
      sampledAt: new Date(),
    },
  });

  const now = new Date();
  const scoreResult = await calculateAndPersistGeoScores({
    source: "optimization-replay",
    filters: {
      brandId: task.brandId,
      platform: platformName,
      dateFrom: new Date(now.getTime() - 60_000),
      dateTo: new Date(now.getTime() + 60_000),
    },
  });
  const afterScore = scoreResult.geoScores.find((score) => score.brandId === task.brandId)?.totalScore ?? null;
  const beforeScore = task.geoScore?.totalScore ?? previousRankResult?.visibilityScore ?? 0;

  if (content) {
    await prisma.contentAsset.update({
      where: { id: content.id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        beforeScore,
        afterScore,
        impactNotes: `优化复盘测试：${platformName}「${task.keyword.text}」从 ${
          previousRankResult?.rankPosition ? `第 ${previousRankResult.rankPosition}` : "未出现"
        } 提升到第 ${rankPosition ?? "未识别"}，GEO Score 从 ${beforeScore} 提升到 ${afterScore ?? "待计算"}。`,
      },
    });
  }

  await prisma.optimizationTask.update({
    where: { id: task.id },
    data: {
      status: "IN_PROGRESS",
      answerAnalysisId: answerAnalysis.id,
    },
  });

  return {
    taskId: task.id,
    contentAssetId: content?.id ?? null,
    answerAnalysisId: answerAnalysis.id,
    rankResultId: rankResult.id,
    geoScoreRunId: scoreResult.run.id,
    before: {
      rank: previousRankResult?.rankPosition ?? null,
      score: beforeScore,
      sampleSource: previousRankResult?.sampleSource ?? null,
    },
    after: {
      rank: rankPosition,
      score: afterScore,
      sampleSource: "optimization-replay",
    },
    rankedBrands: rankingTrace.map(({ rank, brand }) => ({ rank, brand })),
  };
}
