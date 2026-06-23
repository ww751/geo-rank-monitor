import { createContentDraftForTask } from "@/lib/content-draft-generator";
import { prisma } from "@/lib/prisma";
import { runMonitoringPipeline, type PipelineCollectionMode } from "@/lib/monitoring-pipeline";

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

async function latestScore(input: { brandId: string; keywordId?: string | null; platform: string }) {
  const score = await prisma.geoScore.findFirst({
    where: {
      brandId: input.brandId,
      ...(input.keywordId ? { keywordId: input.keywordId } : {}),
      platform: input.platform,
    },
    orderBy: { createdAt: "desc" },
  });
  return score?.totalScore ?? 0;
}

async function contentForInput(input: { contentId?: string; optimizationTaskId?: string }) {
  if (input.contentId) {
    const content = await prisma.contentAsset.findUnique({
      where: { id: input.contentId },
      include: { optimizationTask: true },
    });
    if (!content) throw new Error("内容资产不存在");
    return content;
  }

  if (!input.optimizationTaskId) throw new Error("contentId 或 optimizationTaskId 至少需要一个");
  const content = await createContentDraftForTask(input.optimizationTaskId);
  if (!content) throw new Error("内容草稿生成失败");

  return prisma.contentAsset.findUniqueOrThrow({
    where: { id: content.id },
    include: { optimizationTask: true },
  });
}

async function keywordIdForContent(content: Awaited<ReturnType<typeof contentForInput>>, explicitKeywordId?: string) {
  if (explicitKeywordId) return explicitKeywordId;
  if (content.optimizationTask?.keywordId) return content.optimizationTask.keywordId;
  if (!content.targetKeyword) return null;

  const keyword = await prisma.keyword.findFirst({
    where: {
      brandId: content.brandId,
      text: content.targetKeyword,
    },
  });
  return keyword?.id ?? null;
}

export async function createContentPublication(input: {
  contentId?: string;
  optimizationTaskId?: string;
  keywordId?: string;
  platform?: string;
  publishedUrl?: string;
  notes?: string;
  scheduleRetestDays?: number;
}) {
  const content = await contentForInput(input);
  const keywordId = await keywordIdForContent(content, input.keywordId);
  const platform = input.platform ?? content.optimizationTask?.targetPlatform ?? "Doubao";
  const publishedAt = new Date();

  const updatedContent = await prisma.contentAsset.update({
    where: { id: content.id },
    data: {
      status: "PUBLISHED",
      url: input.publishedUrl ?? content.url,
      publishedAt,
    },
  });

  const publication = await prisma.contentPublication.create({
    data: {
      contentId: updatedContent.id,
      brandId: updatedContent.brandId,
      keywordId,
      platform,
      publishedUrl: input.publishedUrl ?? updatedContent.url,
      publishedAt,
      status: input.scheduleRetestDays ? "WAITING_RETEST" : "PUBLISHED",
      notes: input.notes ?? "由优化任务标记发布。",
    },
    include: {
      content: true,
      brand: true,
      keyword: true,
      retests: true,
    },
  });

  const retest = input.scheduleRetestDays
    ? await schedulePublicationRetest(publication.id, input.scheduleRetestDays)
    : null;

  return { publication, retest };
}

export async function schedulePublicationRetest(publicationId: string, days = 7) {
  const publication = await prisma.contentPublication.findUnique({ where: { id: publicationId } });
  if (!publication) throw new Error("内容发布记录不存在");

  const beforeScore = await latestScore({
    brandId: publication.brandId,
    keywordId: publication.keywordId,
    platform: publication.platform,
  });

  return prisma.publicationRetest.create({
    data: {
      publicationId,
      scheduledAt: daysFromNow(days),
      beforeScore,
      status: "PENDING",
      resultSummary: `计划 ${days} 天后复测 ${publication.platform}。`,
    },
  });
}

export async function runPublicationRetest(input: {
  publicationId: string;
  collectionMode?: PipelineCollectionMode;
}) {
  const publication = await prisma.contentPublication.findUnique({
    where: { id: input.publicationId },
    include: { brand: true, keyword: true },
  });
  if (!publication) throw new Error("内容发布记录不存在");
  if (!publication.keywordId) throw new Error("内容发布记录没有关联关键词，无法复测");

  const platform = await prisma.aiPlatform.findFirst({ where: { name: publication.platform } });
  if (!platform) throw new Error(`找不到平台：${publication.platform}`);

  const retest = await prisma.publicationRetest.create({
    data: {
      publicationId: publication.id,
      scheduledAt: new Date(),
      startedAt: new Date(),
      beforeScore: await latestScore({
        brandId: publication.brandId,
        keywordId: publication.keywordId,
        platform: publication.platform,
      }),
      status: "RUNNING",
    },
  });

  const monitoringJob = await prisma.monitoringJob.create({
    data: {
      brandId: publication.brandId,
      keywordId: publication.keywordId,
      platformId: platform.id,
      status: "PENDING",
      scheduledAt: new Date(),
    },
  });

  await prisma.publicationRetest.update({
    where: { id: retest.id },
    data: { monitoringJobId: monitoringJob.id },
  });

  try {
    const pipeline = await runMonitoringPipeline(monitoringJob.id, { collectionMode: input.collectionMode ?? "mock" });
    const afterScore = pipeline.rankResult.visibilityScore;
    const beforeScore = retest.beforeScore ?? 0;
    const completed = await prisma.publicationRetest.update({
      where: { id: retest.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        afterScore,
        deltaScore: afterScore - beforeScore,
        resultSummary:
          afterScore > beforeScore
            ? `复测完成，分数从 ${beforeScore} 提升到 ${afterScore}。`
            : `复测完成，分数从 ${beforeScore} 变为 ${afterScore}，仍需继续优化。`,
      },
    });

    await prisma.contentPublication.update({
      where: { id: publication.id },
      data: { status: "REVIEWED" },
    });

    return { publication, retest: completed, pipeline };
  } catch (error) {
    const failed = await prisma.publicationRetest.update({
      where: { id: retest.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        failureReason: error instanceof Error ? error.message : "复测失败",
      },
    });
    throw Object.assign(error instanceof Error ? error : new Error("复测失败"), { retest: failed });
  }
}
