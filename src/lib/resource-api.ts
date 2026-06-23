import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { withDisplayNames } from "@/lib/field-labels";
import { prisma } from "@/lib/prisma";

type ResourceKey =
  | "clients"
  | "brands"
  | "keywords"
  | "keyword-clusters"
  | "ai-platforms"
  | "rank-results"
  | "competitors"
  | "citations"
  | "contents"
  | "reports"
  | "monitoring-jobs"
  | "collection-artifacts"
  | "optimization-tasks"
  | "platform-sessions"
  | "pipeline-runs"
  | "client-share-links";

type ResourceConfig = {
  model: string;
  include?: Record<string, unknown>;
  orderBy?: Record<string, string>;
  schema?: z.ZodType<Record<string, unknown>>;
  toData: (input: Record<string, unknown>, mode: "create" | "update") => Record<string, unknown>;
};

const asString = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const optionalString = (value: unknown) => {
  const text = asString(value);
  return text.length > 0 ? text : null;
};
const requiredString = (value: unknown) => asString(value);
const optionalInt = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const intWithDefault = (value: unknown, fallback: number) => optionalInt(value) ?? fallback;
const booleanWithDefault = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : value === "true" ? true : value === "false" ? false : fallback;
const optionalDate = (value: unknown) => {
  const text = optionalString(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
};
const dateWithDefault = (value: unknown) => optionalDate(value) ?? new Date();
const jsonWithDefault = (value: unknown, fallback: unknown) => {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string" || value.trim() === "") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};
const tokenWithDefault = (value: unknown) => optionalString(value) ?? randomBytes(16).toString("hex");

/** 输入验证 — 对所有 POST/PATCH 请求的 body 做 Zod 校验 */
function validateBody(raw: unknown, schema: z.ZodType<Record<string, unknown>> | undefined): Record<string, unknown> {
  if (!schema) return raw as Record<string, unknown>;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new ValidationError(messages);
  }
  return parsed.data as Record<string, unknown>;
}

function handleApiError(error: unknown): NextResponse {
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: error.message, displayNames: { error: "参数验证失败" } },
      { status: 400 },
    );
  }
  const message = error instanceof Error ? error.message : "服务器内部错误";
  console.error("API 错误:", error);
  return NextResponse.json(
    { error: message, displayNames: { error: "错误信息" } },
    { status: 500 },
  );
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export const resourceConfigs: Record<ResourceKey, ResourceConfig> = {
  clients: {
    model: "client",
    include: { brands: true, reports: true },
    orderBy: { createdAt: "desc" },
    schema: z.object({
      name: z.string().min(1, "客户名称不能为空").max(200),
      industry: z.string().min(1, "行业不能为空").max(100),
      contactName: z.string().max(100).optional().nullable(),
      contactEmail: z.string().email("邮箱格式不正确").max(200).optional().nullable().or(z.literal("")),
      status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
      notes: z.string().max(2000).optional().nullable(),
    }),
    toData: (input) => ({
      name: requiredString(input.name),
      industry: requiredString(input.industry),
      contactName: optionalString(input.contactName),
      contactEmail: optionalString(input.contactEmail),
      status: optionalString(input.status) ?? "ACTIVE",
      notes: optionalString(input.notes),
    }),
  },
  brands: {
    model: "brand",
    include: { client: true },
    orderBy: { createdAt: "desc" },
    schema: z.object({
      clientId: z.string().min(1, "客户不能为空"),
      name: z.string().min(1, "品牌名称不能为空").max(200),
      website: z.string().url("网址格式不正确").max(500).optional().nullable().or(z.literal("")),
      category: z.string().min(1, "分类不能为空").max(100),
      description: z.string().max(2000).optional().nullable(),
      geoGoal: z.string().max(500).optional().nullable(),
    }),
    toData: (input) => ({
      clientId: requiredString(input.clientId),
      name: requiredString(input.name),
      website: optionalString(input.website),
      category: requiredString(input.category),
      description: optionalString(input.description),
      geoGoal: optionalString(input.geoGoal),
    }),
  },
  keywords: {
    model: "keyword",
    include: { brand: true, cluster: true },
    orderBy: { priority: "asc" },
    schema: z.object({
      brandId: z.string().optional().nullable(),
      clusterId: z.string().optional().nullable(),
      text: z.string().min(1, "关键词不能为空").max(500),
      intent: z.enum(["BRAND", "PRODUCT", "SOLUTION", "COMPARISON", "REPUTATION"]).optional(),
      priority: z.number().int().min(1).max(99).optional(),
      active: z.boolean().optional(),
    }),
    toData: (input) => ({
      brandId: optionalString(input.brandId),
      clusterId: optionalString(input.clusterId),
      text: requiredString(input.text),
      intent: optionalString(input.intent) ?? "SOLUTION",
      priority: intWithDefault(input.priority, 3),
      active: booleanWithDefault(input.active, true),
    }),
  },
  "keyword-clusters": {
    model: "keywordCluster",
    include: { keywords: true },
    orderBy: { createdAt: "desc" },
    schema: z.object({
      name: z.string().min(1, "簇名称不能为空").max(200),
      city: z.string().min(1, "城市不能为空").max(100),
      industry: z.string().min(1, "行业不能为空").max(100),
      category: z.string().min(1, "分类不能为空").max(100),
      description: z.string().max(2000).optional().nullable(),
    }),
    toData: (input) => ({
      name: requiredString(input.name),
      city: requiredString(input.city),
      industry: requiredString(input.industry),
      category: requiredString(input.category),
      description: optionalString(input.description),
    }),
  },
  "ai-platforms": {
    model: "aiPlatform",
    orderBy: { createdAt: "asc" },
    schema: z.object({
      name: z.string().min(1, "平台名称不能为空").max(100),
      slug: z.string().min(1, "平台标识不能为空").max(50).regex(/^[a-z0-9-]+$/, "标识仅允许小写字母、数字和连字符"),
      homepageUrl: z.string().url("网址格式不正确").max(500).optional().nullable().or(z.literal("")),
      enabled: z.boolean().optional(),
    }),
    toData: (input) => ({
      name: requiredString(input.name),
      slug: requiredString(input.slug),
      homepageUrl: optionalString(input.homepageUrl),
      enabled: booleanWithDefault(input.enabled, true),
    }),
  },
  "rank-results": {
    model: "rankResult",
    include: { brand: true, keyword: true, platform: true, citations: true },
    orderBy: { sampledAt: "desc" },
    schema: z.object({
      brandId: z.string().min(1, "品牌不能为空"),
      keywordId: z.string().min(1, "关键词不能为空"),
      platformId: z.string().min(1, "平台不能为空"),
      prompt: z.string().min(1, "提问不能为空").max(2000),
      answer: z.string().min(1, "回答不能为空").max(20000),
      brandMentioned: z.boolean().optional(),
      rankPosition: z.number().int().min(1).optional().nullable(),
      sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE", "MIXED", "UNKNOWN"]).optional(),
      visibilityScore: z.number().int().min(0).max(100).optional(),
      sampleSource: z.string().max(50).optional(),
      sampledAt: z.string().datetime().optional(),
    }),
    toData: (input) => ({
      brandId: requiredString(input.brandId),
      keywordId: requiredString(input.keywordId),
      platformId: requiredString(input.platformId),
      prompt: requiredString(input.prompt),
      answer: requiredString(input.answer),
      brandMentioned: booleanWithDefault(input.brandMentioned, false),
      rankPosition: optionalInt(input.rankPosition),
      sentiment: optionalString(input.sentiment) ?? "UNKNOWN",
      visibilityScore: intWithDefault(input.visibilityScore, 0),
      sampleSource: optionalString(input.sampleSource) ?? "manual",
      sampledAt: dateWithDefault(input.sampledAt),
    }),
  },
  competitors: {
    model: "competitor",
    include: { brand: true },
    orderBy: { createdAt: "desc" },
    schema: z.object({
      brandId: z.string().min(1, "品牌不能为空"),
      name: z.string().min(1, "竞品名称不能为空").max(200),
      website: z.string().url("网址格式不正确").max(500).optional().nullable().or(z.literal("")),
      notes: z.string().max(2000).optional().nullable(),
    }),
    toData: (input) => ({
      brandId: requiredString(input.brandId),
      name: requiredString(input.name),
      website: optionalString(input.website),
      notes: optionalString(input.notes),
    }),
  },
  citations: {
    model: "citation",
    include: { rankResult: { include: { keyword: true, platform: true } } },
    orderBy: { createdAt: "desc" },
    schema: z.object({
      rankResultId: z.string().min(1, "排名结果不能为空"),
      title: z.string().min(1, "标题不能为空").max(500),
      url: z.string().min(1, "URL 不能为空").max(2000),
      domain: z.string().min(1, "域名不能为空").max(200),
      type: z.enum(["OFFICIAL", "MEDIA", "QA", "FORUM", "WIKI", "MAP", "LOCAL_LIFE", "SOCIAL", "UNKNOWN", "OTHER"]).optional(),
      position: z.number().int().min(1).optional().nullable(),
      isValid: z.boolean().optional(),
      authorityScore: z.number().int().min(0).max(100).optional(),
      lastCheckedAt: z.string().datetime().optional().nullable(),
    }),
    toData: (input) => ({
      rankResultId: requiredString(input.rankResultId),
      title: requiredString(input.title),
      url: requiredString(input.url),
      domain: requiredString(input.domain),
      type: optionalString(input.type) ?? "OTHER",
      position: optionalInt(input.position),
      isValid: booleanWithDefault(input.isValid, true),
      authorityScore: intWithDefault(input.authorityScore, 0),
      lastCheckedAt: optionalDate(input.lastCheckedAt),
    }),
  },
  contents: {
    model: "contentAsset",
    include: { brand: true, optimizationTask: true },
    orderBy: { createdAt: "desc" },
    schema: z.object({
      brandId: z.string().min(1, "品牌不能为空"),
      title: z.string().min(1, "标题不能为空").max(500),
      url: z.string().url("网址格式不正确").max(2000).optional().nullable().or(z.literal("")),
      contentType: z.enum(["ARTICLE", "LANDING_PAGE", "CASE_STUDY", "DOC", "FAQ", "VIDEO"]).optional(),
      status: z.enum(["PLANNED", "DRAFT", "PUBLISHED", "NEEDS_UPDATE"]).optional(),
      targetKeyword: z.string().max(500).optional().nullable(),
      optimizationTaskId: z.string().optional().nullable(),
      ownerName: z.string().max(100).optional().nullable(),
      reviewedAt: z.string().datetime().optional().nullable(),
      beforeScore: z.number().int().min(0).max(100).optional().nullable(),
      afterScore: z.number().int().min(0).max(100).optional().nullable(),
      impactNotes: z.string().max(2000).optional().nullable(),
      notes: z.string().max(2000).optional().nullable(),
      publishedAt: z.string().datetime().optional().nullable(),
    }),
    toData: (input) => ({
      brandId: requiredString(input.brandId),
      title: requiredString(input.title),
      url: optionalString(input.url),
      contentType: optionalString(input.contentType) ?? "ARTICLE",
      status: optionalString(input.status) ?? "PLANNED",
      targetKeyword: optionalString(input.targetKeyword),
      optimizationTaskId: optionalString(input.optimizationTaskId),
      ownerName: optionalString(input.ownerName),
      reviewedAt: optionalDate(input.reviewedAt),
      beforeScore: optionalInt(input.beforeScore),
      afterScore: optionalInt(input.afterScore),
      impactNotes: optionalString(input.impactNotes),
      notes: optionalString(input.notes),
      publishedAt: optionalDate(input.publishedAt),
    }),
  },
  reports: {
    model: "report",
    include: { client: true },
    orderBy: { periodStart: "desc" },
    schema: z.object({
      clientId: z.string().min(1, "客户不能为空"),
      title: z.string().min(1, "标题不能为空").max(500),
      periodStart: z.string().datetime().optional(),
      periodEnd: z.string().datetime().optional(),
      summary: z.string().min(1, "摘要不能为空").max(10000),
      status: z.enum(["DRAFT", "READY", "SENT"]).optional(),
    }),
    toData: (input) => ({
      clientId: requiredString(input.clientId),
      title: requiredString(input.title),
      periodStart: dateWithDefault(input.periodStart),
      periodEnd: dateWithDefault(input.periodEnd),
      summary: requiredString(input.summary),
      status: optionalString(input.status) ?? "DRAFT",
    }),
  },
  "monitoring-jobs": {
    model: "monitoringJob",
    include: { brand: true, keyword: true, platform: true, artifacts: true },
    orderBy: { scheduledAt: "desc" },
    schema: z.object({
      brandId: z.string().min(1, "品牌不能为空"),
      keywordId: z.string().min(1, "关键词不能为空"),
      platformId: z.string().min(1, "平台不能为空"),
      status: z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELED"]).optional(),
      scheduledAt: z.string().datetime().optional(),
      startedAt: z.string().datetime().optional().nullable(),
      completedAt: z.string().datetime().optional().nullable(),
      failureReason: z.string().max(2000).optional().nullable(),
      retryCount: z.number().int().min(0).max(99).optional(),
    }),
    toData: (input) => ({
      brandId: requiredString(input.brandId),
      keywordId: requiredString(input.keywordId),
      platformId: requiredString(input.platformId),
      status: optionalString(input.status) ?? "PENDING",
      scheduledAt: dateWithDefault(input.scheduledAt),
      startedAt: optionalDate(input.startedAt),
      completedAt: optionalDate(input.completedAt),
      failureReason: optionalString(input.failureReason),
      retryCount: intWithDefault(input.retryCount, 0),
    }),
  },
  "collection-artifacts": {
    model: "collectionArtifact",
    include: { monitoringJob: { include: { brand: true, keyword: true, platform: true } }, answerAnalysis: true },
    orderBy: { createdAt: "desc" },
    schema: z.object({
      monitoringJobId: z.string().min(1, "采集任务不能为空"),
      answerAnalysisId: z.string().optional().nullable(),
      rawAnswer: z.string().min(1, "原始回答不能为空").max(50000),
      screenshotPath: z.string().max(500).optional().nullable(),
      htmlSummary: z.string().max(20000).optional().nullable(),
      durationMs: z.number().int().min(0).optional().nullable(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
    toData: (input) => ({
      monitoringJobId: requiredString(input.monitoringJobId),
      answerAnalysisId: optionalString(input.answerAnalysisId),
      rawAnswer: requiredString(input.rawAnswer),
      screenshotPath: optionalString(input.screenshotPath),
      htmlSummary: optionalString(input.htmlSummary),
      durationMs: optionalInt(input.durationMs),
      metadata: jsonWithDefault(input.metadata, {}),
    }),
  },
  "optimization-tasks": {
    model: "optimizationTask",
    include: {
      brand: true,
      keyword: true,
      geoScore: { include: { keyword: true } },
      answerAnalysis: true,
    },
    orderBy: { createdAt: "desc" },
    schema: z.object({
      brandId: z.string().min(1, "品牌不能为空"),
      keywordId: z.string().optional().nullable(),
      geoScoreId: z.string().optional().nullable(),
      answerAnalysisId: z.string().optional().nullable(),
      type: z.enum(["CONTENT_ASSET", "TOP3_BOOST", "CITATION_BUILDING", "KEYWORD_COVERAGE", "COMPETITOR_GAP"]).optional(),
      priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
      status: z.enum(["OPEN", "IN_PROGRESS", "DONE", "DISMISSED"]).optional(),
      title: z.string().min(1, "标题不能为空").max(500),
      recommendation: z.string().min(1, "推荐方案不能为空").max(5000),
      rationale: z.string().min(1, "理由不能为空").max(5000),
      targetPlatform: z.string().max(100).optional().nullable(),
      targetScoreImpact: z.number().int().min(0).max(100).optional(),
      dueDate: z.string().datetime().optional().nullable(),
    }),
    toData: (input) => ({
      brandId: requiredString(input.brandId),
      keywordId: optionalString(input.keywordId),
      geoScoreId: optionalString(input.geoScoreId),
      answerAnalysisId: optionalString(input.answerAnalysisId),
      type: optionalString(input.type) ?? "CONTENT_ASSET",
      priority: optionalString(input.priority) ?? "MEDIUM",
      status: optionalString(input.status) ?? "OPEN",
      title: requiredString(input.title),
      recommendation: requiredString(input.recommendation),
      rationale: requiredString(input.rationale),
      targetPlatform: optionalString(input.targetPlatform),
      targetScoreImpact: intWithDefault(input.targetScoreImpact, 0),
      dueDate: optionalDate(input.dueDate),
    }),
  },
  "platform-sessions": {
    model: "platformSession",
    include: { platform: true },
    orderBy: { updatedAt: "desc" },
    schema: z.object({
      platformId: z.string().min(1, "平台不能为空"),
      storageStatePath: z.string().max(500).optional().nullable(),
      collectorConfig: z.record(z.string(), z.unknown()).optional(),
      status: z.enum(["NOT_CONFIGURED", "READY", "NEEDS_LOGIN", "EXPIRED"]).optional(),
      lastCheckedAt: z.string().datetime().optional().nullable(),
      notes: z.string().max(2000).optional().nullable(),
    }),
    toData: (input) => ({
      platformId: requiredString(input.platformId),
      storageStatePath: optionalString(input.storageStatePath),
      collectorConfig: jsonWithDefault(input.collectorConfig, {}),
      status: optionalString(input.status) ?? "NOT_CONFIGURED",
      lastCheckedAt: optionalDate(input.lastCheckedAt),
      notes: optionalString(input.notes),
    }),
  },
  "pipeline-runs": {
    model: "pipelineRun",
    include: { monitoringJob: { include: { brand: true, keyword: true, platform: true } } },
    orderBy: { startedAt: "desc" },
    schema: z.object({
      monitoringJobId: z.string().min(1, "采集任务不能为空"),
      status: z.enum(["RUNNING", "COMPLETED", "FAILED"]).optional(),
      steps: z.array(z.unknown()).optional(),
      startedAt: z.string().datetime().optional(),
      completedAt: z.string().datetime().optional().nullable(),
      errorMessage: z.string().max(5000).optional().nullable(),
    }),
    toData: (input) => ({
      monitoringJobId: requiredString(input.monitoringJobId),
      status: optionalString(input.status) ?? "RUNNING",
      steps: jsonWithDefault(input.steps, []),
      startedAt: dateWithDefault(input.startedAt),
      completedAt: optionalDate(input.completedAt),
      errorMessage: optionalString(input.errorMessage),
    }),
  },
  "client-share-links": {
    model: "clientShareLink",
    include: { client: true },
    orderBy: { createdAt: "desc" },
    schema: z.object({
      clientId: z.string().min(1, "客户不能为空"),
      token: z.string().max(100).optional(),
      status: z.enum(["ACTIVE", "DISABLED", "EXPIRED"]).optional(),
      expiresAt: z.string().datetime().optional().nullable(),
      notes: z.string().max(2000).optional().nullable(),
    }),
    toData: (input) => ({
      clientId: requiredString(input.clientId),
      token: tokenWithDefault(input.token),
      status: optionalString(input.status) ?? "ACTIVE",
      expiresAt: optionalDate(input.expiresAt),
      notes: optionalString(input.notes),
    }),
  },
};

function modelClient(resource: ResourceKey) {
  const model = resourceConfigs[resource].model;
  return (prisma as unknown as Record<string, unknown>)[model] as {
    findMany: (args?: Record<string, unknown>) => Promise<unknown>;
    findUnique: (args: Record<string, unknown>) => Promise<unknown>;
    create: (args: Record<string, unknown>) => Promise<unknown>;
    update: (args: Record<string, unknown>) => Promise<unknown>;
    delete: (args: Record<string, unknown>) => Promise<unknown>;
  };
}

function listArgs(config: ResourceConfig) {
  return {
    ...(config.include ? { include: config.include } : {}),
    ...(config.orderBy ? { orderBy: config.orderBy } : {}),
  };
}

export function createCollectionHandlers(resource: ResourceKey) {
  const config = resourceConfigs[resource];
  const model = modelClient(resource);

  return {
    async GET() {
      const items = await model.findMany(listArgs(config));
      return NextResponse.json(withDisplayNames(items));
    },
    async POST(request: Request) {
      try {
        const raw = await request.json();
        const input = validateBody(raw, config.schema);
        const item = await model.create({
          data: config.toData(input, "create"),
          ...(config.include ? { include: config.include } : {}),
        });
        return NextResponse.json(withDisplayNames(item), { status: 201 });
      } catch (error) {
        return handleApiError(error);
      }
    },
  };
}

export function createItemHandlers(resource: ResourceKey) {
  const config = resourceConfigs[resource];
  const model = modelClient(resource);

  return {
    async GET(_request: Request, context: { params: Promise<{ id: string }> }) {
      const { id } = await context.params;
      const item = await model.findUnique({
        where: { id },
        ...(config.include ? { include: config.include } : {}),
      });
      if (!item) return NextResponse.json({ error: "记录不存在", displayNames: { error: "错误信息" } }, { status: 404 });
      return NextResponse.json(withDisplayNames(item));
    },
    async PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
      try {
        const { id } = await context.params;
        const raw = await request.json();
        const input = validateBody(raw, config.schema);
        const item = await model.update({
          where: { id },
          data: config.toData(input, "update"),
          ...(config.include ? { include: config.include } : {}),
        });
        return NextResponse.json(withDisplayNames(item));
      } catch (error) {
        return handleApiError(error);
      }
    },
    async DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
      const { id } = await context.params;
      await model.delete({ where: { id } });
      return NextResponse.json({ ok: true, displayNames: { ok: "是否成功" } });
    },
  };
}
