import { createContentDraftForTask } from "@/lib/content-draft-generator";
import { schedulePublicationRetest } from "@/lib/content-publication-service";
import { prisma } from "@/lib/prisma";

export function configuredSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function isLocalSiteUrl(url = configuredSiteUrl()) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i.test(url);
}

export function publicContentUrl(contentId: string) {
  return `${configuredSiteUrl()}/geo-content/${contentId}`;
}

async function resolveContent(input: { contentId?: string; optimizationTaskId?: string }) {
  if (input.contentId) {
    return prisma.contentAsset.findUniqueOrThrow({
      where: { id: input.contentId },
      include: { optimizationTask: true, brand: true },
    });
  }
  if (!input.optimizationTaskId) throw new Error("optimizationTaskId 或 contentId 至少需要一个");

  const draft = await createContentDraftForTask(input.optimizationTaskId);
  if (!draft) throw new Error("内容草稿生成失败");

  return prisma.contentAsset.findUniqueOrThrow({
    where: { id: draft.id },
    include: { optimizationTask: true, brand: true },
  });
}

export async function publishOwnedContent(input: {
  contentId?: string;
  optimizationTaskId?: string;
  scheduleRetestDays?: number;
}) {
  const content = await resolveContent(input);
  const publicUrl = publicContentUrl(content.id);
  const keywordId = content.optimizationTask?.keywordId ?? null;
  const platform = content.optimizationTask?.targetPlatform ?? "Doubao";

  const updatedContent = await prisma.contentAsset.update({
    where: { id: content.id },
    data: {
      status: "PUBLISHED",
      url: publicUrl,
      publishedAt: new Date(),
    },
    include: { brand: true, optimizationTask: true },
  });

  const existingPublication = await prisma.contentPublication.findFirst({
    where: { contentId: updatedContent.id, publishedUrl: publicUrl },
    include: { content: true, brand: true, keyword: true, retests: { orderBy: { createdAt: "desc" } } },
  });

  const publication =
    existingPublication ??
    (await prisma.contentPublication.create({
      data: {
        contentId: updatedContent.id,
        brandId: updatedContent.brandId,
        keywordId,
        platform,
        publishedUrl: publicUrl,
        publishedAt: updatedContent.publishedAt ?? new Date(),
        status: "WAITING_RETEST",
        notes: isLocalSiteUrl()
          ? "已发布到自有 GEO 内容站。当前 localhost 仅用于本地测试；部署到公网域名后，AI 平台才可能访问和引用。"
          : "已发布到自有 GEO 内容站，可进入真实 AI 平台复测流程。",
      },
      include: { content: true, brand: true, keyword: true, retests: { orderBy: { createdAt: "desc" } } },
    }));

  const hasPendingRetest = publication.retests.some((retest) => retest.status === "PENDING");
  const retest = hasPendingRetest ? null : await schedulePublicationRetest(publication.id, input.scheduleRetestDays ?? 7);

  return {
    content: updatedContent,
    publication,
    retest,
    publicUrl,
    isLocalOnly: isLocalSiteUrl(),
  };
}

export async function publishOwnedTasks(input: {
  brandId?: string;
  keywordId?: string;
  platform?: string;
  status?: Array<"OPEN" | "IN_PROGRESS" | "DONE" | "DISMISSED">;
  limit?: number;
}) {
  const tasks = await prisma.optimizationTask.findMany({
    where: {
      ...(input.brandId ? { brandId: input.brandId } : {}),
      ...(input.keywordId ? { keywordId: input.keywordId } : {}),
      ...(input.platform ? { targetPlatform: input.platform } : {}),
      status: { in: input.status ?? ["OPEN", "IN_PROGRESS"] },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    take: input.limit ?? 50,
  });

  const published = [];
  const failed = [];
  for (const task of tasks) {
    try {
      published.push({
        taskId: task.id,
        taskTitle: task.title,
        ...(await publishOwnedContent({ optimizationTaskId: task.id, scheduleRetestDays: task.keywordId ? 7 : 30 })),
      });
    } catch (error) {
      failed.push({
        taskId: task.id,
        taskTitle: task.title,
        error: error instanceof Error ? error.message : "发布失败",
      });
    }
  }

  return {
    totalTasks: tasks.length,
    published,
    failed,
    isLocalOnly: isLocalSiteUrl(),
  };
}

export function evaluateContentReadiness(input: {
  title: string;
  notes: string | null;
  brandName: string;
  keyword: string | null;
  publicUrl: string | null;
}) {
  const text = `${input.title}\n${input.notes ?? ""}`;
  const checks = [
    { label: "有公开 URL", passed: Boolean(input.publicUrl), points: 15 },
    { label: "URL 不是 localhost", passed: Boolean(input.publicUrl && !isLocalSiteUrl(input.publicUrl)), points: 25 },
    { label: "标题或正文包含品牌名", passed: text.includes(input.brandName), points: 15 },
    { label: "标题或正文包含目标关键词", passed: input.keyword ? text.includes(input.keyword) : true, points: 15 },
    { label: "内容长度超过 800 字", passed: text.length >= 800, points: 15 },
    { label: "包含 FAQ 或常见问题结构", passed: /FAQ|常见问题|推荐 FAQ/i.test(text), points: 15 },
  ];
  const score = checks.reduce((sum, check) => sum + (check.passed ? check.points : 0), 0);

  return {
    score,
    checks,
    issues: checks.filter((check) => !check.passed).map((check) => check.label),
  };
}
