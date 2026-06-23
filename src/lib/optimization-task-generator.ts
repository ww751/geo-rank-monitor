import { prisma } from "@/lib/prisma";

type GenerateOptimizationTaskInput = {
  runId?: string;
  clientId?: string;
  brandId?: string;
  platform?: string;
  dateFrom?: string;
  dateTo?: string;
  source?: string;
};

type TaskType = "CONTENT_ASSET" | "TOP3_BOOST" | "CITATION_BUILDING" | "KEYWORD_COVERAGE" | "COMPETITOR_GAP";
type Priority = "HIGH" | "MEDIUM" | "LOW";

type TaskCandidate = {
  brandId: string;
  keywordId: string | null;
  geoScoreId: string | null;
  answerAnalysisId?: string | null;
  type: TaskType;
  priority: Priority;
  status: "OPEN";
  title: string;
  recommendation: string;
  rationale: string;
  targetPlatform: string | null;
  targetScoreImpact: number;
  dueDate: Date;
};

type EffectiveFilters = {
  clientId?: string;
  brandId?: string;
  platform?: string;
  dateFrom?: string;
  dateTo?: string;
};

type RunFilterJson = {
  clientId?: unknown;
  brandId?: unknown;
  industry?: unknown;
  platform?: unknown;
  dateFrom?: unknown;
  dateTo?: unknown;
};

const targetScore = 85;

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function stringFromJson(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function runFilters(value: unknown): EffectiveFilters {
  if (!value || typeof value !== "object") return {};
  const filters = value as RunFilterJson;
  return {
    clientId: stringFromJson(filters.clientId),
    brandId: stringFromJson(filters.brandId),
    platform: stringFromJson(filters.platform),
    dateFrom: stringFromJson(filters.dateFrom),
    dateTo: stringFromJson(filters.dateTo),
  };
}

function mergeFilters(input: GenerateOptimizationTaskInput, fromRun: EffectiveFilters): EffectiveFilters {
  return {
    clientId: optionalString(input.clientId) ?? fromRun.clientId,
    brandId: optionalString(input.brandId) ?? fromRun.brandId,
    platform: optionalString(input.platform) ?? fromRun.platform,
    dateFrom: optionalString(input.dateFrom) ?? fromRun.dateFrom,
    dateTo: optionalString(input.dateTo) ?? fromRun.dateTo,
  };
}

function parseDate(value: string | undefined, endOfDay = false) {
  if (!value) return undefined;
  const date = value.includes("T")
    ? new Date(value)
    : new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+08:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function dateRange(filters: EffectiveFilters) {
  const gte = parseDate(filters.dateFrom);
  const lte = parseDate(filters.dateTo, true);
  return gte || lte ? { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } : undefined;
}

function dueDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function isSameBrand(candidate: string, brandName: string) {
  const left = normalize(candidate);
  const right = normalize(brandName);
  return Boolean(left && right && (left === right || left.includes(right) || right.includes(left)));
}

function uniqueKey(task: Pick<TaskCandidate, "brandId" | "keywordId" | "type" | "targetPlatform">) {
  return [task.brandId, task.keywordId ?? "none", task.type, task.targetPlatform ?? "all"].join("|");
}

function analysisKey(platform: string, keyword: string) {
  return `${normalize(platform)}|${normalize(keyword)}`;
}

export function recommendationForKeyword(keyword: string) {
  if (/价格|报价|费用|收费/.test(keyword)) {
    return "新增价格说明页，覆盖报价区间、影响因素、常见增项、服务边界和真实案例，让 AI 回答有可引用的价格依据。";
  }
  if (/避坑|注意|风险|怎么选/.test(keyword)) {
    return "新增避坑指南，覆盖风险清单、合同注意事项、验收节点、常见误区和案例证据，建立可信的决策参考。";
  }
  if (/推荐|排名|哪家好|排行榜|TOP|十大/.test(keyword)) {
    return "新增推荐/对比页，覆盖品牌优势、服务范围、代表案例、口碑证据、第三方引用来源和竞品差异。";
  }
  if (/案例|成功|客户|工地/.test(keyword)) {
    return "补充案例型内容，包含项目背景、户型/预算、解决方案、交付结果、客户评价和可验证素材。";
  }
  return "围绕该关键词补充 FAQ、案例、服务说明和结构化摘要，让 AI 更容易识别品牌主体并引用内容。";
}

export function priorityForScore(totalScore: number, rankingScore: number): Priority {
  if (totalScore < 70 || rankingScore === 0) return "HIGH";
  if (totalScore < 85 || rankingScore < 30) return "MEDIUM";
  return "LOW";
}

function scoreImpactFor(score: { totalScore: number; rankingScore: number; citationScore: number }) {
  const scoreGap = Math.max(0, targetScore - score.totalScore);
  const rankingGap = Math.max(0, 30 - score.rankingScore);
  const citationGap = score.citationScore === 0 ? 5 : 0;
  return Math.min(30, Math.max(8, scoreGap + rankingGap + citationGap));
}

function missingBrandRecommendation(brandName: string, keyword: string) {
  return [
    `为「${brandName}」建立面向「${keyword}」的品牌实体内容页。`,
    "页面需要明确城市、行业、服务项目、门店/服务范围、案例、资质、口碑证据和常见问题。",
    "标题、H1、FAQ 和案例摘要中要自然出现目标关键词，并提供可被 AI 摘录的短段落。",
  ].join("");
}

function top3Recommendation(keyword: string) {
  return [
    `补强「${keyword}」的推荐/对比内容。`,
    "用清晰的对比维度说明为什么该品牌值得进入 TOP3：服务能力、案例密度、价格透明度、交付保障、售后和本地经验。",
    "同时准备一段 80-120 字的品牌推荐摘要，方便 AI 直接引用。",
  ].join("");
}

function citationRecommendation(keyword: string) {
  return [
    `为「${keyword}」补充可访问引用来源。`,
    "优先建设官网案例页、服务页、FAQ 页、媒体稿、行业目录或本地平台资料页。",
    "每个 URL 都要有明确标题、品牌主体、城市行业词和事实证据，避免只有营销口号。",
  ].join("");
}

function competitorRecommendation(input: { brandName: string; keyword: string; competitors: string[] }) {
  const competitorText = input.competitors.length > 0 ? input.competitors.join("、") : "当前回答中的竞品";
  return [
    `围绕「${input.keyword}」制作「${input.brandName} vs ${competitorText}」差异化内容。`,
    "重点补齐竞品已经占位的维度：案例数量、本地工地、价格透明、材料工艺、售后保障和业主评价。",
    "内容不要贬低竞品，要用可验证事实说明自身适合什么客户。",
  ].join("");
}

function keywordCoverageRecommendation(brandName: string) {
  return [
    `补齐「${brandName}」的 GEO 监测关键词覆盖。`,
    "至少覆盖排名类、推荐类、对比类、价格类、避坑类、案例类六类问题。",
    "每类先选择 3-5 个高价值问题，配套建设 FAQ、案例和对比内容，后续再扩展到全量词库。",
  ].join("");
}

async function getRun(runId?: string) {
  if (runId) return prisma.geoScoreRun.findUnique({ where: { id: runId } });
  return prisma.geoScoreRun.findFirst({ where: { status: "COMPLETED" }, orderBy: { startedAt: "desc" } });
}

export async function generateOptimizationTasks(rawInput: GenerateOptimizationTaskInput = {}) {
  const input = {
    runId: optionalString(rawInput.runId),
    clientId: optionalString(rawInput.clientId),
    brandId: optionalString(rawInput.brandId),
    platform: optionalString(rawInput.platform),
    dateFrom: optionalString(rawInput.dateFrom),
    dateTo: optionalString(rawInput.dateTo),
    source: optionalString(rawInput.source) ?? "manual",
  };

  const run = await getRun(input.runId);
  if (!run) return { run: null, created: 0, skipped: 0, tasks: [] };

  const filters = mergeFilters(input, runFilters(run.filters));
  const createdAt = dateRange(filters);
  const sampledAt = dateRange(filters);

  const [scores, rankResults] = await Promise.all([
    prisma.geoScore.findMany({
      where: {
        runId: run.id,
        ...(filters.brandId ? { brandId: filters.brandId } : {}),
        ...(filters.platform ? { platform: filters.platform } : {}),
        ...(createdAt ? { createdAt } : {}),
        ...(filters.clientId ? { brand: { clientId: filters.clientId } } : {}),
      },
      include: {
        brand: { include: { client: true } },
        keyword: true,
        answerAnalysis: true,
      },
      orderBy: { totalScore: "asc" },
    }),
    prisma.rankResult.findMany({
      where: {
        ...(filters.brandId ? { brandId: filters.brandId } : {}),
        ...(filters.platform ? { platform: { name: filters.platform } } : {}),
        ...(sampledAt ? { sampledAt } : {}),
        ...(filters.clientId ? { brand: { clientId: filters.clientId } } : {}),
      },
      include: {
        brand: { include: { client: true } },
        keyword: true,
        platform: true,
        citations: true,
      },
      orderBy: { sampledAt: "desc" },
    }),
  ]);

  const analysisKeywords = Array.from(
    new Set([
      ...scores.map((score) => analysisKey(score.platform, score.keyword.text)),
      ...rankResults.map((result) => analysisKey(result.platform.name, result.keyword.text)),
    ]),
  );
  const analyses = await prisma.answerAnalysis.findMany({
    where: {
      ...(filters.platform ? { platform: filters.platform } : {}),
      ...(createdAt ? { createdAt } : {}),
    },
    include: {
      rankedBrands: { orderBy: { rank: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });
  const latestAnalysisByKey = new Map(
    analyses
      .filter((analysis) => analysisKeywords.includes(analysisKey(analysis.platform, analysis.keyword)))
      .map((analysis) => [analysisKey(analysis.platform, analysis.keyword), analysis]),
  );

  const candidates: TaskCandidate[] = [];
  const keywordIdsByBrand = new Map<string, Set<string>>();

  function rememberCoverage(brandId: string, keywordId: string) {
    keywordIdsByBrand.set(brandId, keywordIdsByBrand.get(brandId) ?? new Set<string>());
    keywordIdsByBrand.get(brandId)?.add(keywordId);
  }

  for (const score of scores) {
    const keywordText = score.keyword.text;
    rememberCoverage(score.brandId, score.keywordId);

    if (score.totalScore < 75) {
      candidates.push({
        brandId: score.brandId,
        keywordId: score.keywordId,
        geoScoreId: score.id,
        answerAnalysisId: score.answerAnalysisId,
        type: "CONTENT_ASSET",
        priority: priorityForScore(score.totalScore, score.rankingScore),
        status: "OPEN",
        title: `补强「${keywordText}」内容资产`,
        recommendation: recommendationForKeyword(keywordText),
        rationale: `${score.brand.name} 在 ${score.platform} 的「${keywordText}」GEO Score 为 ${score.totalScore}，低于演示阈值 75。`,
        targetPlatform: score.platform,
        targetScoreImpact: scoreImpactFor(score),
        dueDate: dueDate(14),
      });
    }

    if (score.rankingScore < 30) {
      candidates.push({
        brandId: score.brandId,
        keywordId: score.keywordId,
        geoScoreId: score.id,
        answerAnalysisId: score.answerAnalysisId,
        type: "TOP3_BOOST",
        priority: priorityForScore(score.totalScore, score.rankingScore),
        status: "OPEN",
        title: `提升 ${score.platform}「${keywordText}」TOP3 排名`,
        recommendation: top3Recommendation(keywordText),
        rationale: `当前排名评分为 ${score.rankingScore}，说明品牌未稳定进入 TOP3 或未获得明确推荐排名。`,
        targetPlatform: score.platform,
        targetScoreImpact: Math.max(10, 30 - score.rankingScore),
        dueDate: dueDate(21),
      });
    }

    if (score.citationScore === 0 || (score.answerAnalysis?.citationUrls.length ?? 0) === 0) {
      candidates.push({
        brandId: score.brandId,
        keywordId: score.keywordId,
        geoScoreId: score.id,
        answerAnalysisId: score.answerAnalysisId,
        type: "CITATION_BUILDING",
        priority: "HIGH",
        status: "OPEN",
        title: `补充「${keywordText}」引用来源`,
        recommendation: citationRecommendation(keywordText),
        rationale: `${score.platform} 对该关键词没有识别到有效引用 URL，引用评分为 ${score.citationScore}。`,
        targetPlatform: score.platform,
        targetScoreImpact: 8,
        dueDate: dueDate(14),
      });
    }
  }

  for (const result of rankResults) {
    const keywordText = result.keyword.text;
    const platformName = result.platform.name;
    const analysis = latestAnalysisByKey.get(analysisKey(platformName, keywordText));
    const topCompetitors =
      analysis?.rankedBrands
        .filter((item) => !isSameBrand(item.brand, result.brand.name))
        .slice(0, 5)
        .map((item) => item.brand) ?? [];

    rememberCoverage(result.brandId, result.keywordId);

    if (!result.brandMentioned) {
      candidates.push({
        brandId: result.brandId,
        keywordId: result.keywordId,
        geoScoreId: null,
        answerAnalysisId: analysis?.id,
        type: "CONTENT_ASSET",
        priority: "HIGH",
        status: "OPEN",
        title: `建立「${result.brand.name}」在「${keywordText}」中的品牌实体信号`,
        recommendation: missingBrandRecommendation(result.brand.name, keywordText),
        rationale: `${platformName} 的真实回答没有提到 ${result.brand.name}，该关键词当前可见度为 0。`,
        targetPlatform: platformName,
        targetScoreImpact: 30,
        dueDate: dueDate(10),
      });
    }

    if (!result.rankPosition || result.rankPosition > 3) {
      candidates.push({
        brandId: result.brandId,
        keywordId: result.keywordId,
        geoScoreId: null,
        answerAnalysisId: analysis?.id,
        type: "TOP3_BOOST",
        priority: result.brandMentioned ? "MEDIUM" : "HIGH",
        status: "OPEN",
        title: `争取 ${platformName}「${keywordText}」进入 TOP3`,
        recommendation: top3Recommendation(keywordText),
        rationale: result.rankPosition
          ? `当前客户品牌排名为第 ${result.rankPosition}，尚未进入 TOP3。`
          : `当前回答没有给 ${result.brand.name} 明确推荐排名。`,
        targetPlatform: platformName,
        targetScoreImpact: result.rankPosition ? 12 : 25,
        dueDate: dueDate(21),
      });
    }

    if (result.citations.length === 0) {
      candidates.push({
        brandId: result.brandId,
        keywordId: result.keywordId,
        geoScoreId: null,
        answerAnalysisId: analysis?.id,
        type: "CITATION_BUILDING",
        priority: "HIGH",
        status: "OPEN",
        title: `为「${keywordText}」建设可引用来源`,
        recommendation: citationRecommendation(keywordText),
        rationale: `${platformName} 回答中没有可记录的引用 URL，后续很难证明品牌和服务事实。`,
        targetPlatform: platformName,
        targetScoreImpact: 8,
        dueDate: dueDate(14),
      });
    }

    if (topCompetitors.length > 0 && (!result.brandMentioned || !result.rankPosition || result.rankPosition > 3)) {
      candidates.push({
        brandId: result.brandId,
        keywordId: result.keywordId,
        geoScoreId: null,
        answerAnalysisId: analysis?.id,
        type: "COMPETITOR_GAP",
        priority: "HIGH",
        status: "OPEN",
        title: `分析「${keywordText}」竞品占位差距`,
        recommendation: competitorRecommendation({
          brandName: result.brand.name,
          keyword: keywordText,
          competitors: topCompetitors,
        }),
        rationale: `${platformName} 回答中优先推荐了 ${topCompetitors.join("、")}，但没有形成 ${result.brand.name} 的有效占位。`,
        targetPlatform: platformName,
        targetScoreImpact: 15,
        dueDate: dueDate(14),
      });
    }
  }

  const coverageBrandIds = new Set([...scores.map((score) => score.brandId), ...rankResults.map((result) => result.brandId)]);
  for (const brandId of coverageBrandIds) {
    const keywordIds = keywordIdsByBrand.get(brandId) ?? new Set<string>();
    if (keywordIds.size >= 3) continue;
    const brand = scores.find((score) => score.brandId === brandId)?.brand ?? rankResults.find((result) => result.brandId === brandId)?.brand;
    if (!brand) continue;
    candidates.push({
      brandId,
      keywordId: null,
      geoScoreId: null,
      type: "KEYWORD_COVERAGE",
      priority: "MEDIUM",
      status: "OPEN",
      title: `补齐 ${brand.name} 关键词覆盖`,
      recommendation: keywordCoverageRecommendation(brand.name),
      rationale: `当前筛选范围只覆盖 ${keywordIds.size} 个关键词，演示阈值为至少 3 个关键词。`,
      targetPlatform: filters.platform ?? null,
      targetScoreImpact: 10,
      dueDate: dueDate(30),
    });
  }

  const deduped = Array.from(new Map(candidates.map((task) => [uniqueKey(task), task])).values());
  if (deduped.length === 0) return { run, created: 0, skipped: 0, tasks: [] };

  const existing = await prisma.optimizationTask.findMany({
    where: {
      brandId: { in: Array.from(new Set(deduped.map((task) => task.brandId))) },
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
    select: { brandId: true, keywordId: true, type: true, targetPlatform: true },
  });
  const existingKeys = new Set(existing.map(uniqueKey));
  const toCreate = deduped.filter((task) => !existingKeys.has(uniqueKey(task)));

  const tasks =
    toCreate.length === 0
      ? []
      : await prisma.$transaction(
          toCreate.map((task) =>
            prisma.optimizationTask.create({
              data: task,
              include: { brand: true, keyword: true, answerAnalysis: true },
            }),
          ),
        );

  return {
    run,
    created: tasks.length,
    skipped: deduped.length - tasks.length,
    tasks,
  };
}
