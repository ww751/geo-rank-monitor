import { prisma } from "@/lib/prisma";

function rankText(rank: number | null | undefined) {
  return rank ? `第 ${rank}` : "未出现";
}

function scoreText(score: number | null | undefined) {
  return score === null || score === undefined ? "待验证" : `${score}`;
}

function dateRangeStart(...dates: Array<Date | null | undefined>) {
  return dates.find(Boolean) ?? new Date();
}

function reportConclusion(input: {
  validationRank: number | null;
  replayRank: number | null;
  baselineRank: number | null;
}) {
  if (input.validationRank) {
    return `真实复测已完成，品牌当前真实排名为${rankText(input.validationRank)}。`;
  }
  if (input.replayRank) {
    return `当前已完成优化复盘测试，系统推演排名可从${rankText(input.baselineRank)}提升到${rankText(
      input.replayRank,
    )}；真实效果仍需发布内容和建设引用后再次采集验证。`;
  }
  return "当前仍处于基线采集阶段，需要先完成真实采集和优化复盘测试。";
}

export async function createImprovementReport(experimentId: string) {
  const experiment = await prisma.improvementExperiment.findUnique({
    where: { id: experimentId },
    include: {
      brand: { include: { client: true, competitors: true } },
      keyword: true,
      platform: true,
      optimizationTask: {
        include: {
          contentAssets: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
      baselineRankResult: true,
      replayRankResult: true,
      validationRankResult: true,
    },
  });

  if (!experiment) throw new Error("真实提升实验不存在");

  const content = experiment.optimizationTask?.contentAssets[0];
  const competitors = experiment.brand.competitors.map((competitor) => competitor.name).slice(0, 5);
  const title = `${experiment.brand.name}「${experiment.keyword.text}」GEO 提升实验报告`;
  const periodStart = dateRangeStart(experiment.baselineRankResult?.sampledAt, experiment.createdAt);
  const periodEnd =
    experiment.validationRankResult?.sampledAt ??
    experiment.replayRankResult?.sampledAt ??
    experiment.updatedAt ??
    new Date();

  const summary = [
    `客户：${experiment.brand.client.name}`,
    `品牌：${experiment.brand.name}`,
    `平台：${experiment.platform.name}`,
    `关键词：${experiment.keyword.text}`,
    "",
    "一、实验结论",
    reportConclusion({
      baselineRank: experiment.baselineRank,
      replayRank: experiment.replayRank,
      validationRank: experiment.validationRank,
    }),
    "",
    "二、排名与分数变化",
    `优化前真实采集：${rankText(experiment.baselineRank)}，GEO Score ${scoreText(experiment.baselineScore)}。`,
    `优化复盘测试：${rankText(experiment.replayRank)}，GEO Score ${scoreText(experiment.replayScore)}。`,
    `后续真实复测：${rankText(experiment.validationRank)}，GEO Score ${scoreText(experiment.validationScore)}。`,
    "",
    "三、优化动作",
    experiment.actionSummary ?? "尚未记录优化动作。",
    content ? `关联内容资产：${content.title}，状态：${content.status}。` : "尚未生成内容资产。",
    experiment.optimizationTask ? `任务建议：${experiment.optimizationTask.recommendation}` : "",
    "",
    "四、竞品参考",
    competitors.length > 0 ? `当前重点竞品：${competitors.join("、")}。` : "当前未维护竞品列表。",
    "",
    "五、下一步建议",
    experiment.nextStep ?? "建议继续补齐内容资产、案例页、FAQ 和可引用来源，然后进行真实复测。",
  ]
    .filter((line) => line !== "")
    .join("\n");

  return prisma.report.create({
    data: {
      clientId: experiment.brand.clientId,
      title,
      periodStart,
      periodEnd,
      summary,
      status: experiment.validationRankResultId ? "READY" : "DRAFT",
    },
    include: { client: true },
  });
}
