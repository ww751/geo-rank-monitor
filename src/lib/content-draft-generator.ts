import { prisma } from "@/lib/prisma";

type DraftTask = {
  id: string;
  type: string;
  title: string;
  recommendation: string;
  rationale: string;
  targetPlatform: string | null;
  brand: {
    id: string;
    name: string;
    category: string;
    description: string | null;
  };
  keyword: {
    id: string;
    text: string;
  } | null;
  contentAssets: Array<{ id: string }>;
};

function contentTypeFor(taskType: string) {
  if (taskType === "CONTENT_ASSET") return "LANDING_PAGE";
  if (taskType === "TOP3_BOOST") return "ARTICLE";
  if (taskType === "CITATION_BUILDING") return "FAQ";
  if (taskType === "COMPETITOR_GAP") return "ARTICLE";
  return "DOC";
}

function titleFor(task: DraftTask) {
  const keyword = task.keyword?.text ?? "GEO 关键词覆盖";
  if (task.type === "CONTENT_ASSET") return `${keyword}：${task.brand.name}本地服务与案例介绍`;
  if (task.type === "TOP3_BOOST") return `${keyword}：${task.brand.name}进入推荐榜单的对比说明`;
  if (task.type === "CITATION_BUILDING") return `${task.brand.name}「${keyword}」引用来源资料页`;
  if (task.type === "COMPETITOR_GAP") return `${task.brand.name}与主流竞品的差异化对比`;
  return `${task.brand.name} GEO 关键词内容矩阵规划`;
}

function draftNotesFor(task: DraftTask) {
  const keyword = task.keyword?.text ?? "核心 GEO 关键词";
  const platform = task.targetPlatform ?? "Doubao/Kimi/Tongyi/Yuanbao";
  const brandDescription = task.brand.description ? `\n品牌定位：${task.brand.description}` : "";

  return [
    `目标平台：${platform}`,
    `目标关键词：${keyword}`,
    `页面类型：${contentTypeFor(task.type)}`,
    `H1：${titleFor(task)}`,
    brandDescription,
    "",
    "内容大纲：",
    `1. ${task.brand.name} 是谁：城市、行业、服务范围、适合客户`,
    "2. 为什么值得被 AI 推荐：交付能力、案例密度、价格透明、售后保障",
    "3. 本地案例/工地：至少补充 3 个真实案例，写清户型、预算、周期和结果",
    "4. 与竞品对比：用事实维度对比，不贬低竞品",
    "5. FAQ：覆盖价格、避坑、工期、材料、售后、老房翻新等问题",
    "6. 引用证据：官网 URL、案例页、资质、媒体/平台资料、客户评价",
    "",
    "推荐 FAQ：",
    `- ${task.brand.name}适合做${keyword}相关服务吗？`,
    `- ${task.brand.name}在本地有哪些案例？`,
    `- ${task.brand.name}的价格和服务边界是什么？`,
    `- 选择${keyword}相关服务时要注意什么？`,
    "",
    "生成依据：",
    task.rationale,
    "",
    "执行建议：",
    task.recommendation,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function createContentDraftForTask(taskId: string) {
  const task = await prisma.optimizationTask.findUnique({
    where: { id: taskId },
    include: {
      brand: true,
      keyword: true,
      contentAssets: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!task) throw new Error("优化任务不存在");

  const existing = task.contentAssets[0];
  if (existing) {
    return prisma.contentAsset.findUnique({
      where: { id: existing.id },
      include: { brand: true, optimizationTask: true },
    });
  }

  const content = await prisma.contentAsset.create({
    data: {
      brandId: task.brandId,
      optimizationTaskId: task.id,
      title: titleFor(task),
      contentType: contentTypeFor(task.type),
      status: "DRAFT",
      targetKeyword: task.keyword?.text ?? null,
      notes: draftNotesFor(task),
      beforeScore: task.geoScoreId ? undefined : 0,
    },
    include: { brand: true, optimizationTask: true },
  });

  await prisma.optimizationTask.update({
    where: { id: task.id },
    data: { status: task.status === "OPEN" ? "IN_PROGRESS" : task.status },
  });

  return content;
}

export function buildDraftPreviewForTask(task: DraftTask) {
  return {
    title: titleFor(task),
    contentType: contentTypeFor(task.type),
    notes: draftNotesFor(task),
  };
}
