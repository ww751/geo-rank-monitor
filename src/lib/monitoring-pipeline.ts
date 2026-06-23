import { analyzeAnswer } from "@/lib/answer-analyzer";
import { authorityScoreForCitation, classifyCitationType, domainFromUrl } from "@/lib/citation-quality";
import { calculateAndPersistGeoScores } from "@/lib/geo-score-engine";
import { generateOptimizationTasks } from "@/lib/optimization-task-generator";
import { collectPlatformAnswer } from "@/lib/platform-collector";
import { prisma } from "@/lib/prisma";
import { extractRankedBrandsWithTrace } from "@/lib/ranking-extractor";

type PipelineStep = {
  step: string;
  status: "COMPLETED" | "FAILED";
  detail: string;
  at: string;
};

export type PipelineCollectionMode = "mock" | "real";

type RunMonitoringPipelineOptions = {
  collectionMode?: PipelineCollectionMode;
};

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function isSameBrand(candidate: string, brandName: string) {
  const left = normalize(candidate);
  const right = normalize(brandName);
  return left === right || left.includes(right) || right.includes(left);
}

function findRankForBrand(items: Array<{ brand: string; rank: number }>, brandName: string) {
  return items.find((item) => isSameBrand(item.brand, brandName))?.rank ?? null;
}

function visibilityFor(brandMentioned: boolean, rankPosition: number | null) {
  if (!brandMentioned) return 0;
  if (!rankPosition) return 70;
  if (rankPosition === 1) return 95;
  if (rankPosition <= 3) return 88;
  if (rankPosition <= 10) return 76;
  return 65;
}

function objectConfig(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function mockAnswerTemplateFor(brandName: string) {
  return [
    "{{platform}} 模拟回答：针对「{{keyword}}」，推荐名单如下：",
    "1. {{brand}}",
    "2. 业之峰装饰",
    "3. 圣都整装",
    "4. 城市人家装饰",
    "",
    "{{brand}} 在本地案例、价格透明、施工交付和售后保障方面表现稳定。",
    `参考：https://demo.example.com/geo/${encodeURIComponent(brandName)}`,
  ].join("\n");
}

function withoutMockConfig(config: Record<string, unknown>) {
  const next = { ...config };
  delete next.mockAnswer;
  delete next.mockAnswerTemplate;
  return next;
}

function failureTypeFor(message: string) {
  if (/验证|验证码|风控|安全检查|访问受限/.test(message)) return "captcha_or_risk_control";
  if (/登录|登录态|storageState|未就绪|未配置/.test(message)) return "login_or_session";
  if (/选择器|selector|输入框|回答文本|提取/.test(message)) return "selector_or_extraction";
  if (/超时|timeout|未检测/.test(message)) return "timeout";
  return "pipeline_error";
}

export async function runMonitoringPipeline(monitoringJobId: string, options: RunMonitoringPipelineOptions = {}) {
  const job = await prisma.monitoringJob.findUnique({
    where: { id: monitoringJobId },
    include: {
      brand: { include: { client: true } },
      keyword: true,
      platform: { include: { session: true } },
    },
  });

  if (!job) {
    throw new Error("采集任务不存在");
  }

  const steps: PipelineStep[] = [];
  let savedArtifactId: string | null = null;
  const pipelineRun = await prisma.pipelineRun.create({
    data: {
      monitoringJobId,
      status: "RUNNING",
      steps,
      startedAt: new Date(),
    },
  });

  async function record(step: string, status: PipelineStep["status"], detail: string) {
    steps.push({ step, status, detail, at: new Date().toISOString() });
    await prisma.pipelineRun.update({
      where: { id: pipelineRun.id },
      data: { steps },
    });
  }

  try {
    await prisma.monitoringJob.update({
      where: { id: monitoringJobId },
      data: {
        status: "RUNNING",
        startedAt: new Date(),
        completedAt: null,
        failureReason: null,
      },
    });

    const sessionConfig = objectConfig(job.platform.session?.collectorConfig);
    const collectionMode =
      options.collectionMode ??
      (typeof sessionConfig.mockAnswer === "string" || typeof sessionConfig.mockAnswerTemplate === "string" ? "mock" : "real");

    if (collectionMode === "real" && (!job.platform.session || job.platform.session.status !== "READY")) {
      throw new Error(`${job.platform.name} 平台登录态未就绪，请先在“平台登录态”中配置为可采集。`);
    }

    const prompt = job.keyword.text;
    const collectorConfig =
      collectionMode === "mock"
        ? {
            ...sessionConfig,
            mockAnswerTemplate: mockAnswerTemplateFor(job.brand.name),
          }
        : withoutMockConfig(sessionConfig);

    const collected = await collectPlatformAnswer({
      homepageUrl: job.platform.homepageUrl,
      platformName: job.platform.name,
      prompt,
      brandName: job.brand.name,
      storageStatePath: job.platform.session?.storageStatePath,
      collectorConfig,
    });
    await record(
      "collect",
      "COMPLETED",
      `${job.platform.name} 已完成${collected.mode === "mock" ? "模拟" : "Playwright"}采集`,
    );

    const artifact = await prisma.collectionArtifact.create({
      data: {
        monitoringJobId,
        rawAnswer: collected.rawAnswer,
        htmlSummary: collected.htmlSummary,
        durationMs: collected.durationMs,
        metadata: {
          mode: collected.mode,
          requestedMode: collectionMode,
          platform: job.platform.name,
          prompt,
        },
      },
    });
    savedArtifactId = artifact.id;
    await record("artifact", "COMPLETED", "已保存采集产物");

    const [brands, competitors] = await Promise.all([
      prisma.brand.findMany({ select: { name: true } }),
      prisma.competitor.findMany({ select: { name: true } }),
    ]);
    const analysis = analyzeAnswer({
      answer: collected.answer,
      clientBrands: brands.map((brand) => brand.name),
      competitorBrands: competitors.map((competitor) => competitor.name),
    });

    const answerAnalysis = await prisma.answerAnalysis.create({
      data: {
        platform: job.platform.name,
        keyword: prompt,
        answer: collected.answer,
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
    await prisma.collectionArtifact.update({
      where: { id: artifact.id },
      data: { answerAnalysisId: answerAnalysis.id },
    });
    await record("analyze", "COMPLETED", `识别到 ${analysis.brandsFound.length} 个品牌，置信度 ${Math.round(analysis.confidenceScore * 100)}%`);

    const rankingTrace = extractRankedBrandsWithTrace(collected.answer);
    if (rankingTrace.length > 0) {
      await prisma.rankedBrand.createMany({
        data: rankingTrace.map((item) => ({
          answerAnalysisId: answerAnalysis.id,
          brand: item.brand,
          rank: item.rank,
        })),
      });
    }
    await record("ranking", "COMPLETED", `提取到 ${rankingTrace.length} 个推荐排名`);

    const rankPosition = findRankForBrand(rankingTrace, job.brand.name);
    const brandMentioned = analysis.brandsFound.some((brand) => isSameBrand(brand, job.brand.name));
    const rankResult = await prisma.rankResult.create({
      data: {
        brandId: job.brandId,
        keywordId: job.keywordId,
        platformId: job.platformId,
        prompt,
        answer: collected.answer,
        brandMentioned,
        rankPosition,
        sentiment: brandMentioned ? "POSITIVE" : "UNKNOWN",
        visibilityScore: visibilityFor(brandMentioned, rankPosition),
        sampleSource: collected.mode,
        sampledAt: new Date(),
      },
    });

    if (analysis.citationUrls.length > 0) {
      await prisma.citation.createMany({
        data: analysis.citationUrls.map((url, index) => {
          const type = classifyCitationType(url, job.brand.website);
          return {
            rankResultId: rankResult.id,
            title: `${job.platform.name} 引用来源 ${index + 1}`,
            url,
            domain: domainFromUrl(url) || "unknown",
            type,
            position: index + 1,
            isValid: true,
            authorityScore: authorityScoreForCitation({ type, isValid: true, url }),
            lastCheckedAt: new Date(),
          };
        }),
      });
    }
    await record("rank-result", "COMPLETED", "已写入监测结果和引用来源");

    const scoreResult = await calculateAndPersistGeoScores({
      source: "pipeline",
      filters: {
        brandId: job.brandId,
        platform: job.platform.name,
        dateFrom: pipelineRun.startedAt,
        dateTo: new Date(),
      },
    });
    await record("geo-score", "COMPLETED", `已生成 ${scoreResult.totalCreated} 条 GEO Score`);

    const taskResult = await generateOptimizationTasks({
      runId: scoreResult.run.id,
      brandId: job.brandId,
      platform: job.platform.name,
      source: "pipeline",
    });
    await record("optimization-tasks", "COMPLETED", `已生成 ${taskResult.created} 条优化任务，跳过 ${taskResult.skipped} 条`);

    await prisma.monitoringJob.update({
      where: { id: monitoringJobId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    const completedRun = await prisma.pipelineRun.update({
      where: { id: pipelineRun.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        steps,
      },
      include: {
        monitoringJob: { include: { brand: true, keyword: true, platform: true } },
      },
    });

    return {
      pipelineRun: completedRun,
      artifact,
      answerAnalysis,
      rankedBrands: rankingTrace,
      rankResult,
      geoScoreRun: scoreResult.run,
      optimizationTasks: taskResult,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "流水线执行失败";
    if (!savedArtifactId) {
      await prisma.collectionArtifact
        .create({
          data: {
            monitoringJobId,
            rawAnswer: "",
            htmlSummary: `采集或流水线执行失败：${message}`,
            durationMs: null,
            metadata: {
              failure: true,
              failureType: failureTypeFor(message),
              message,
              platform: job.platform.name,
              keyword: job.keyword.text,
              collectionMode: options.collectionMode ?? "real",
            },
          },
        })
        .catch(() => undefined);
    }

    await record("pipeline", "FAILED", message).catch(() => undefined);
    await Promise.all([
      prisma.monitoringJob.update({
        where: { id: monitoringJobId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          failureReason: message,
          retryCount: { increment: 1 },
        },
      }),
      prisma.pipelineRun.update({
        where: { id: pipelineRun.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorMessage: message,
          steps,
        },
      }),
    ]);
    throw error;
  }
}
