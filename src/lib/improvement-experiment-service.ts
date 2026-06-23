import { prisma } from "@/lib/prisma";
import { runMonitoringPipeline } from "@/lib/monitoring-pipeline";

const REPLAY_SAMPLE_SOURCE = "optimization-replay";

type RankLike = {
  id: string;
  rankPosition: number | null;
  visibilityScore: number;
  sampledAt: Date;
  sampleSource: string;
};

type ExperimentStatusInput = {
  baselineRankResultId?: string | null;
  replayRankResultId?: string | null;
  validationRankResultId?: string | null;
};

export function formatRank(rank: number | null | undefined) {
  return rank ? `第 ${rank}` : "未出现";
}

export function rankLiftLabel(before: number | null | undefined, after: number | null | undefined) {
  if (!after) return "暂无提升结果";
  if (!before) return `未出现 -> 第 ${after}`;
  return `第 ${before} -> 第 ${after}`;
}

export function scoreLiftLabel(before: number | null | undefined, after: number | null | undefined) {
  if (after === null || after === undefined) return `${before ?? 0} -> 待验证`;
  return `${before ?? 0} -> ${after}`;
}

export function improvementOutcome(input: {
  baselineRank?: number | null;
  replayRank?: number | null;
  validationRank?: number | null;
  baselineScore?: number | null;
  replayScore?: number | null;
  validationScore?: number | null;
}) {
  const afterRank = input.validationRank ?? input.replayRank ?? null;
  const afterScore = input.validationScore ?? input.replayScore ?? null;
  const beforeRank = input.baselineRank ?? null;
  const beforeScore = input.baselineScore ?? 0;

  if (afterScore !== null && afterScore > beforeScore) {
    return { improved: true, label: `GEO Score 提升 ${afterScore - beforeScore} 分` };
  }
  if (!beforeRank && afterRank) {
    return { improved: true, label: `品牌从未出现变为第 ${afterRank}` };
  }
  if (beforeRank && afterRank && beforeRank > 10 && afterRank <= 10) {
    return { improved: true, label: `排名进入 TOP10：第 ${beforeRank} -> 第 ${afterRank}` };
  }
  if (beforeRank && afterRank && beforeRank > 3 && afterRank <= 3) {
    return { improved: true, label: `排名进入 TOP3：第 ${beforeRank} -> 第 ${afterRank}` };
  }
  if (beforeRank && afterRank && afterRank < beforeRank) {
    return { improved: true, label: `排名提升：第 ${beforeRank} -> 第 ${afterRank}` };
  }

  return { improved: false, label: "暂未形成实质提升，继续补内容和引用来源" };
}

export function classifyExperimentStatus(input: ExperimentStatusInput) {
  if (input.validationRankResultId) return "REAL_VALIDATED" as const;
  if (input.replayRankResultId) return "OPTIMIZATION_REPLAYED" as const;
  if (input.baselineRankResultId) return "BASELINE_COLLECTED" as const;
  return "PLANNED" as const;
}

function statusNextStep(status: ReturnType<typeof classifyExperimentStatus>) {
  if (status === "PLANNED") return "先运行一次真实采集，拿到优化前排名基线。";
  if (status === "BASELINE_COLLECTED") return "生成内容草稿，并运行优化复盘测试，确认理论提升路径。";
  if (status === "OPTIMIZATION_REPLAYED") return "把内容和引用建设动作落地后，再运行 Doubao 真实复测。";
  if (status === "REAL_VALIDATED") return "对比真实复测结果，整理为客户可交付报告。";
  return "实验已完成，可沉淀为行业案例。";
}

async function latestRankResult(input: {
  brandId: string;
  keywordId: string;
  platformId: string;
  replay: boolean;
  after?: Date;
}): Promise<RankLike | null> {
  return prisma.rankResult.findFirst({
    where: {
      brandId: input.brandId,
      keywordId: input.keywordId,
      platformId: input.platformId,
      sampleSource: input.replay ? REPLAY_SAMPLE_SOURCE : { not: REPLAY_SAMPLE_SOURCE },
      ...(input.after ? { sampledAt: { gt: input.after } } : {}),
    },
    orderBy: { sampledAt: "desc" },
    select: {
      id: true,
      rankPosition: true,
      visibilityScore: true,
      sampledAt: true,
      sampleSource: true,
    },
  });
}

async function platformForTask(task: {
  targetPlatform: string | null;
  answerAnalysis?: { platform: string } | null;
  geoScore?: { platform: string } | null;
}) {
  const platformName = task.targetPlatform ?? task.answerAnalysis?.platform ?? task.geoScore?.platform ?? "Doubao";
  const platform = await prisma.aiPlatform.findFirst({ where: { name: platformName } });
  if (!platform) throw new Error(`找不到平台：${platformName}`);
  return platform;
}

export async function syncImprovementExperimentFromTask(taskId: string) {
  const task = await prisma.optimizationTask.findUnique({
    where: { id: taskId },
    include: {
      brand: { include: { client: true } },
      keyword: true,
      geoScore: true,
      answerAnalysis: true,
      contentAssets: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!task) throw new Error("优化任务不存在");
  if (!task.keywordId || !task.keyword) throw new Error("优化任务没有关联关键词，无法建立提升实验");

  const platform = await platformForTask(task);
  const baseline = await latestRankResult({
    brandId: task.brandId,
    keywordId: task.keywordId,
    platformId: platform.id,
    replay: false,
  });
  const replay = await latestRankResult({
    brandId: task.brandId,
    keywordId: task.keywordId,
    platformId: platform.id,
    replay: true,
  });
  const validation = replay
    ? await latestRankResult({
        brandId: task.brandId,
        keywordId: task.keywordId,
        platformId: platform.id,
        replay: false,
        after: replay.sampledAt,
      })
    : null;

  const content = task.contentAssets[0];
  const baselineScore = content?.beforeScore ?? task.geoScore?.totalScore ?? baseline?.visibilityScore ?? 0;
  const replayScore = content?.afterScore ?? replay?.visibilityScore ?? null;
  const validationScore = validation?.visibilityScore ?? null;
  const status = classifyExperimentStatus({
    baselineRankResultId: baseline?.id,
    replayRankResultId: replay?.id,
    validationRankResultId: validation?.id,
  });
  const actionSummary = content
    ? `已生成内容资产「${content.title}」，状态：${content.status}。`
    : "尚未生成内容草稿。";

  const data = {
    brandId: task.brandId,
    keywordId: task.keywordId,
    platformId: platform.id,
    optimizationTaskId: task.id,
    baselineRankResultId: baseline?.id ?? null,
    replayRankResultId: replay?.id ?? null,
    validationRankResultId: validation?.id ?? null,
    status,
    hypothesis: `通过补齐「${task.keyword.text}」的品牌实体、案例证据、FAQ 和引用来源，提高 ${task.brand.name} 在 ${platform.name} 回答中的出现率和排名。`,
    actionSummary,
    nextStep: statusNextStep(status),
    baselineRank: baseline?.rankPosition ?? null,
    replayRank: replay?.rankPosition ?? null,
    validationRank: validation?.rankPosition ?? null,
    baselineScore,
    replayScore,
    validationScore,
  };

  const existing = await prisma.improvementExperiment.findUnique({
    where: { optimizationTaskId: task.id },
  });

  return existing
    ? prisma.improvementExperiment.update({ where: { id: existing.id }, data })
    : prisma.improvementExperiment.create({ data });
}

export async function syncImprovementExperiments(input: { taskId?: string } = {}) {
  if (input.taskId) {
    const experiment = await syncImprovementExperimentFromTask(input.taskId);
    return { synced: 1, experiments: [experiment] };
  }

  const tasks = await prisma.optimizationTask.findMany({
    where: { keywordId: { not: null } },
    select: { id: true },
    orderBy: { updatedAt: "desc" },
  });

  const experiments = [];
  for (const task of tasks) {
    experiments.push(await syncImprovementExperimentFromTask(task.id));
  }

  return { synced: experiments.length, experiments };
}

export async function runRealValidationForExperiment(experimentId: string) {
  const experiment = await prisma.improvementExperiment.findUnique({
    where: { id: experimentId },
    include: {
      brand: true,
      keyword: true,
      platform: true,
      optimizationTask: true,
    },
  });

  if (!experiment) throw new Error("真实提升实验不存在");

  const monitoringJob = await prisma.monitoringJob.create({
    data: {
      brandId: experiment.brandId,
      keywordId: experiment.keywordId,
      platformId: experiment.platformId,
      status: "PENDING",
      scheduledAt: new Date(),
    },
  });

  const pipelineResult = await runMonitoringPipeline(monitoringJob.id);
  const syncedExperiment = experiment.optimizationTaskId
    ? await syncImprovementExperimentFromTask(experiment.optimizationTaskId)
    : await prisma.improvementExperiment.update({
        where: { id: experiment.id },
        data: {
          validationRankResultId: pipelineResult.rankResult.id,
          validationRank: pipelineResult.rankResult.rankPosition,
          validationScore: pipelineResult.rankResult.visibilityScore,
          status: "REAL_VALIDATED",
          nextStep: "已完成真实复测，可整理为客户交付报告。",
        },
      });

  return {
    monitoringJob,
    pipelineRun: pipelineResult.pipelineRun,
    rankResult: pipelineResult.rankResult,
    experiment: syncedExperiment,
  };
}
