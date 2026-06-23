import type { ResourceColumn, ResourceField } from "@/components/resource-manager";

export type PageConfig = {
  title: string;
  description: string;
  apiPath: string;
  fields: ResourceField[];
  columns: ResourceColumn[];
};

const clientStatus = [
  { label: "正常服务", value: "ACTIVE" },
  { label: "暂停监测", value: "PAUSED" },
  { label: "已归档", value: "ARCHIVED" },
];

const keywordIntent = [
  { label: "品牌词", value: "BRAND" },
  { label: "产品词", value: "PRODUCT" },
  { label: "解决方案词", value: "SOLUTION" },
  { label: "对比词", value: "COMPARISON" },
  { label: "口碑词", value: "REPUTATION" },
];

const sentiment = [
  { label: "正向", value: "POSITIVE" },
  { label: "中性", value: "NEUTRAL" },
  { label: "负向", value: "NEGATIVE" },
  { label: "混合", value: "MIXED" },
  { label: "未知", value: "UNKNOWN" },
];

const citationType = [
  { label: "官方来源", value: "OFFICIAL" },
  { label: "媒体文章", value: "MEDIA" },
  { label: "问答平台", value: "QA" },
  { label: "论坛社区", value: "FORUM" },
  { label: "百科资料", value: "WIKI" },
  { label: "地图来源", value: "MAP" },
  { label: "本地生活", value: "LOCAL_LIFE" },
  { label: "社交媒体", value: "SOCIAL" },
  { label: "未知来源", value: "UNKNOWN" },
  { label: "其他来源", value: "OTHER" },
];

const contentType = [
  { label: "文章", value: "ARTICLE" },
  { label: "落地页", value: "LANDING_PAGE" },
  { label: "案例", value: "CASE_STUDY" },
  { label: "文档", value: "DOC" },
  { label: "问答", value: "FAQ" },
  { label: "视频", value: "VIDEO" },
];

const contentStatus = [
  { label: "计划中", value: "PLANNED" },
  { label: "草稿", value: "DRAFT" },
  { label: "已发布", value: "PUBLISHED" },
  { label: "待更新", value: "NEEDS_UPDATE" },
];

const reportStatus = [
  { label: "草稿", value: "DRAFT" },
  { label: "已完成", value: "READY" },
  { label: "已发送", value: "SENT" },
];

const monitoringJobStatus = [
  { label: "待采集", value: "PENDING" },
  { label: "采集中", value: "RUNNING" },
  { label: "已完成", value: "COMPLETED" },
  { label: "失败", value: "FAILED" },
  { label: "已取消", value: "CANCELED" },
];

const optimizationTaskType = [
  { label: "内容资产补强", value: "CONTENT_ASSET" },
  { label: "TOP3 排名提升", value: "TOP3_BOOST" },
  { label: "引用来源建设", value: "CITATION_BUILDING" },
  { label: "关键词覆盖补齐", value: "KEYWORD_COVERAGE" },
  { label: "竞品差距修复", value: "COMPETITOR_GAP" },
];

const optimizationTaskPriority = [
  { label: "高", value: "HIGH" },
  { label: "中", value: "MEDIUM" },
  { label: "低", value: "LOW" },
];

const optimizationTaskStatus = [
  { label: "待处理", value: "OPEN" },
  { label: "处理中", value: "IN_PROGRESS" },
  { label: "已完成", value: "DONE" },
  { label: "已忽略", value: "DISMISSED" },
];

const platformSessionStatus = [
  { label: "未配置", value: "NOT_CONFIGURED" },
  { label: "可采集", value: "READY" },
  { label: "需要登录", value: "NEEDS_LOGIN" },
  { label: "已过期", value: "EXPIRED" },
];

const pipelineRunStatus = [
  { label: "运行中", value: "RUNNING" },
  { label: "已完成", value: "COMPLETED" },
  { label: "失败", value: "FAILED" },
];

const shareLinkStatus = [
  { label: "启用", value: "ACTIVE" },
  { label: "停用", value: "DISABLED" },
  { label: "已过期", value: "EXPIRED" },
];

export const pageConfigs: Record<string, PageConfig> = {
  clients: {
    title: "客户管理",
    description: "管理需要进行 AI 搜索可见度监测的客户主体、行业、联系人和服务状态。",
    apiPath: "/api/clients",
    fields: [
      { name: "name", label: "客户名称", type: "text", required: true, placeholder: "例如：济南某装修集团" },
      { name: "industry", label: "所属行业", type: "text", required: true, placeholder: "例如：装修、律师、房产、口腔" },
      { name: "contactName", label: "联系人", type: "text", placeholder: "例如：王经理" },
      { name: "contactEmail", label: "联系邮箱", type: "email", placeholder: "例如：wang@example.com" },
      { name: "status", label: "客户状态", type: "select", options: clientStatus },
      { name: "notes", label: "客户备注", type: "textarea", placeholder: "例如：重点监测济南本地装修公司推荐类问题" },
    ],
    columns: [
      { label: "客户名称", path: "name" },
      { label: "行业", path: "industry" },
      { label: "联系人", path: "contactName" },
      { label: "邮箱", path: "contactEmail" },
      { label: "状态", path: "status" },
      { label: "创建时间", path: "createdAt", type: "date" },
    ],
  },
  brands: {
    title: "品牌资料",
    description: "维护客户旗下品牌、官网、品类、业务描述和 GEO 优化目标。",
    apiPath: "/api/brands",
    fields: [
      { name: "clientId", label: "所属客户", type: "select", required: true, optionSource: { endpoint: "/api/clients", labelKey: "name" } },
      { name: "name", label: "品牌名称", type: "text", required: true, placeholder: "例如：万泰装饰" },
      { name: "website", label: "品牌官网", type: "url", placeholder: "例如：https://example.com" },
      { name: "category", label: "业务品类", type: "text", required: true, placeholder: "例如：家装设计、旧房翻新" },
      { name: "description", label: "品牌描述", type: "textarea", placeholder: "例如：专注济南本地家装设计与施工交付" },
      { name: "geoGoal", label: "GEO 优化目标", type: "textarea", placeholder: "例如：提升在 Doubao、Kimi、Tongyi、Yuanbao 中的本地推荐出现率" },
    ],
    columns: [
      { label: "品牌名称", path: "name" },
      { label: "所属客户", path: "client.name" },
      { label: "业务品类", path: "category" },
      { label: "官网", path: "website" },
      { label: "GEO 目标", path: "geoGoal", type: "longText" },
      { label: "创建时间", path: "createdAt", type: "date" },
    ],
  },
  keywords: {
    title: "关键词库",
    description: "维护品牌词和城市行业问题词，支撑 AI 平台监测、分析和月报。",
    apiPath: "/api/keywords",
    fields: [
      { name: "brandId", label: "关联品牌", type: "select", optionSource: { endpoint: "/api/brands", labelKey: "name" } },
      { name: "clusterId", label: "关键词簇", type: "select", optionSource: { endpoint: "/api/keyword-clusters", labelKey: "name" } },
      { name: "text", label: "关键词/问题", type: "text", required: true, placeholder: "例如：济南装修公司哪家好" },
      { name: "intent", label: "搜索意图", type: "select", options: keywordIntent },
      { name: "priority", label: "优先级", type: "number", min: 1, max: 5, placeholder: "例如：1" },
      { name: "active", label: "是否启用", type: "checkbox" },
    ],
    columns: [
      { label: "关键词/问题", path: "text" },
      { label: "关联品牌", path: "brand.name" },
      { label: "关键词簇", path: "cluster.name" },
      { label: "意图", path: "intent" },
      { label: "优先级", path: "priority" },
      { label: "启用", path: "active", type: "boolean" },
      { label: "创建时间", path: "createdAt", type: "date" },
    ],
  },
  "keyword-clusters": {
    title: "关键词簇",
    description: "管理由城市和行业生成的关键词分类，便于批量扩展和归档。",
    apiPath: "/api/keyword-clusters",
    fields: [
      { name: "name", label: "关键词簇名称", type: "text", required: true, placeholder: "例如：济南装修排名类问题" },
      { name: "city", label: "城市", type: "text", required: true, placeholder: "例如：济南" },
      { name: "industry", label: "行业", type: "text", required: true, placeholder: "例如：装修" },
      { name: "category", label: "分类", type: "text", required: true, placeholder: "例如：排名类、推荐类、价格类" },
      { name: "description", label: "说明", type: "textarea", placeholder: "例如：用于 Doubao/Kimi 平台本地推荐监测" },
    ],
    columns: [
      { label: "名称", path: "name" },
      { label: "城市", path: "city" },
      { label: "行业", path: "industry" },
      { label: "分类", path: "category" },
      { label: "说明", path: "description", type: "longText" },
      { label: "创建时间", path: "createdAt", type: "date" },
    ],
  },
  platforms: {
    title: "AI 平台管理",
    description: "维护用于监测的 AI 搜索/问答平台，后续可接入 Playwright 自动采集。",
    apiPath: "/api/ai-platforms",
    fields: [
      { name: "name", label: "平台名称（请使用英文）", type: "text", required: true, placeholder: "例如：Doubao、Kimi、Tongyi、Yuanbao" },
      { name: "slug", label: "平台标识（请使用英文）", type: "text", required: true, placeholder: "例如：doubao、kimi、tongyi、yuanbao" },
      { name: "homepageUrl", label: "平台官网", type: "url", placeholder: "例如：https://www.doubao.com" },
      { name: "enabled", label: "是否启用", type: "checkbox" },
    ],
    columns: [
      { label: "平台名称", path: "name" },
      { label: "英文标识", path: "slug" },
      { label: "平台官网", path: "homepageUrl" },
      { label: "启用", path: "enabled", type: "boolean" },
      { label: "创建时间", path: "createdAt", type: "date" },
    ],
  },
  "rank-results": {
    title: "监测结果",
    description: "录入或查看 AI 回答采样结果，记录品牌是否出现、排名、情绪和可见度评分。",
    apiPath: "/api/rank-results",
    fields: [
      { name: "brandId", label: "监测品牌", type: "select", required: true, optionSource: { endpoint: "/api/brands", labelKey: "name" } },
      { name: "keywordId", label: "监测关键词", type: "select", required: true, optionSource: { endpoint: "/api/keywords", labelKey: "text" } },
      { name: "platformId", label: "AI 平台", type: "select", required: true, optionSource: { endpoint: "/api/ai-platforms", labelKey: "name" } },
      { name: "sampledAt", label: "采样日期", type: "date", placeholder: "例如：2026-06-05" },
      { name: "rankPosition", label: "出现排名", type: "number", min: 1, placeholder: "例如：3" },
      { name: "visibilityScore", label: "可见度评分", type: "number", min: 0, max: 100, placeholder: "例如：72" },
      { name: "sentiment", label: "情绪倾向", type: "select", options: sentiment },
      { name: "sampleSource", label: "数据来源（请使用英文）", type: "text", placeholder: "例如：manual、mock、playwright" },
      { name: "brandMentioned", label: "品牌被提及", type: "checkbox" },
      { name: "prompt", label: "提问词", type: "textarea", required: true, placeholder: "例如：济南装修公司排名前十有哪些？" },
      { name: "answer", label: "AI 回答", type: "textarea", required: true, placeholder: "例如：AI 平台返回的完整回答内容" },
    ],
    columns: [
      { label: "关键词", path: "keyword.text" },
      { label: "平台", path: "platform.name" },
      { label: "品牌", path: "brand.name" },
      { label: "排名", path: "rankPosition" },
      { label: "提及", path: "brandMentioned", type: "boolean" },
      { label: "可见度", path: "visibilityScore" },
      { label: "情绪", path: "sentiment" },
      { label: "采样时间", path: "sampledAt", type: "date" },
    ],
  },
  competitors: {
    title: "竞品管理",
    description: "维护每个品牌的竞品池，便于分析 AI 回答中的竞争格局。",
    apiPath: "/api/competitors",
    fields: [
      { name: "brandId", label: "所属品牌", type: "select", required: true, optionSource: { endpoint: "/api/brands", labelKey: "name" } },
      { name: "name", label: "竞品名称", type: "text", required: true, placeholder: "例如：业之峰装饰、圣都整装" },
      { name: "website", label: "竞品官网", type: "url", placeholder: "例如：https://example.com" },
      { name: "notes", label: "竞品备注", type: "textarea", placeholder: "例如：本地装修高频被提及竞品" },
    ],
    columns: [
      { label: "竞品名称", path: "name" },
      { label: "所属品牌", path: "brand.name" },
      { label: "官网", path: "website" },
      { label: "备注", path: "notes", type: "longText" },
      { label: "创建时间", path: "createdAt", type: "date" },
    ],
  },
  citations: {
    title: "引用来源",
    description: "记录 AI 回答引用的网页来源，用于评估来源覆盖率和内容资产质量。",
    apiPath: "/api/citations",
    fields: [
      { name: "rankResultId", label: "关联监测结果", type: "select", required: true, optionSource: { endpoint: "/api/rank-results", labelKey: "keyword.text" } },
      { name: "title", label: "来源标题", type: "text", required: true, placeholder: "例如：济南装修公司口碑榜" },
      { name: "url", label: "来源链接", type: "url", required: true, placeholder: "例如：https://example.com/ranking" },
      { name: "domain", label: "来源域名", type: "text", required: true, placeholder: "例如：example.com" },
      { name: "type", label: "来源类型", type: "select", options: citationType },
      { name: "position", label: "引用位置", type: "number", min: 1, placeholder: "例如：1" },
      { name: "isValid", label: "URL 是否有效", type: "checkbox" },
      { name: "authorityScore", label: "来源权威分", type: "number", min: 0, max: 100, placeholder: "例如：65" },
      { name: "lastCheckedAt", label: "最后检测日期", type: "date", placeholder: "例如：2026-06-20" },
    ],
    columns: [
      { label: "来源标题", path: "title" },
      { label: "关键词", path: "rankResult.keyword.text" },
      { label: "平台", path: "rankResult.platform.name" },
      { label: "域名", path: "domain" },
      { label: "类型", path: "type" },
      { label: "有效", path: "isValid", type: "boolean" },
      { label: "权威分", path: "authorityScore" },
      { label: "最后检测", path: "lastCheckedAt", type: "date" },
      { label: "位置", path: "position" },
    ],
  },
  contents: {
    title: "内容资产",
    description: "管理可被 AI 引用的官网文章、案例、FAQ 和落地页，支撑 GEO 优化。",
    apiPath: "/api/contents",
    fields: [
      { name: "brandId", label: "所属品牌", type: "select", required: true, optionSource: { endpoint: "/api/brands", labelKey: "name" } },
      { name: "title", label: "内容标题", type: "text", required: true, placeholder: "例如：济南老房翻新避坑指南" },
      { name: "url", label: "内容链接", type: "url", placeholder: "例如：https://example.com/blog/jinan-renovation" },
      { name: "contentType", label: "内容类型", type: "select", options: contentType },
      { name: "status", label: "内容状态", type: "select", options: contentStatus },
      { name: "targetKeyword", label: "目标关键词", type: "text", placeholder: "例如：济南老房翻新公司推荐" },
      { name: "optimizationTaskId", label: "关联优化任务", type: "select", optionSource: { endpoint: "/api/optimization-tasks", labelKey: "title" } },
      { name: "ownerName", label: "负责人", type: "text", placeholder: "例如：内容运营小王" },
      { name: "beforeScore", label: "发布前 GEO 分数", type: "number", min: 0, placeholder: "例如：65" },
      { name: "afterScore", label: "发布后 GEO 分数", type: "number", min: 0, placeholder: "例如：82" },
      { name: "publishedAt", label: "发布时间", type: "date", placeholder: "例如：2026-05-29" },
      { name: "reviewedAt", label: "复盘日期", type: "date", placeholder: "例如：2026-06-30" },
      { name: "notes", label: "内容备注", type: "textarea", placeholder: "例如：补充本地案例和价格说明，提高 AI 引用概率" },
      { name: "impactNotes", label: "效果复盘", type: "textarea", placeholder: "例如：发布后在 Kimi 的推荐排名从第 4 提升到第 2" },
    ],
    columns: [
      { label: "内容标题", path: "title" },
      { label: "所属品牌", path: "brand.name" },
      { label: "类型", path: "contentType" },
      { label: "状态", path: "status" },
      { label: "目标关键词", path: "targetKeyword" },
      { label: "关联任务", path: "optimizationTask.title", type: "longText" },
      { label: "负责人", path: "ownerName" },
      { label: "发布后分数", path: "afterScore" },
      { label: "发布时间", path: "publishedAt", type: "date" },
    ],
  },
  reports: {
    title: "月报管理",
    description: "维护客户月度 GEO 监测报告，记录周期、摘要和交付状态。",
    apiPath: "/api/reports",
    fields: [
      { name: "clientId", label: "报告客户", type: "select", required: true, optionSource: { endpoint: "/api/clients", labelKey: "name" } },
      { name: "title", label: "报告标题", type: "text", required: true, placeholder: "例如：2026 年 5 月 GEO 搜索可见度月报" },
      { name: "periodStart", label: "周期开始", type: "date", required: true, placeholder: "例如：2026-05-01" },
      { name: "periodEnd", label: "周期结束", type: "date", required: true, placeholder: "例如：2026-05-31" },
      { name: "status", label: "报告状态", type: "select", options: reportStatus },
      { name: "summary", label: "报告摘要", type: "textarea", required: true, placeholder: "例如：本月品牌提及率提升 12%，建议补充竞品对比内容。" },
    ],
    columns: [
      { label: "报告标题", path: "title" },
      { label: "客户", path: "client.name" },
      { label: "开始", path: "periodStart", type: "date" },
      { label: "结束", path: "periodEnd", type: "date" },
      { label: "状态", path: "status" },
      { label: "摘要", path: "summary", type: "longText" },
    ],
  },
  "monitoring-jobs": {
    title: "采集任务",
    description: "为后续接入 Playwright/Crawlee 自动采集预留任务队列，记录品牌、关键词、平台、状态和重试信息。",
    apiPath: "/api/monitoring-jobs",
    fields: [
      { name: "brandId", label: "采集品牌", type: "select", required: true, optionSource: { endpoint: "/api/brands", labelKey: "name" } },
      { name: "keywordId", label: "采集关键词", type: "select", required: true, optionSource: { endpoint: "/api/keywords", labelKey: "text" } },
      { name: "platformId", label: "AI 平台", type: "select", required: true, optionSource: { endpoint: "/api/ai-platforms", labelKey: "name" } },
      { name: "status", label: "任务状态", type: "select", options: monitoringJobStatus },
      { name: "scheduledAt", label: "计划采集日期", type: "date", placeholder: "例如：2026-06-05" },
      { name: "startedAt", label: "开始日期", type: "date", placeholder: "例如：2026-06-05" },
      { name: "completedAt", label: "完成日期", type: "date", placeholder: "例如：2026-06-05" },
      { name: "retryCount", label: "重试次数", type: "number", min: 0, placeholder: "例如：0" },
      { name: "failureReason", label: "失败原因", type: "textarea", placeholder: "例如：页面登录态失效或平台限流" },
    ],
    columns: [
      { label: "品牌", path: "brand.name" },
      { label: "关键词", path: "keyword.text" },
      { label: "平台", path: "platform.name" },
      { label: "状态", path: "status" },
      { label: "计划时间", path: "scheduledAt", type: "date" },
      { label: "重试", path: "retryCount" },
      { label: "失败原因", path: "failureReason", type: "longText" },
    ],
  },
  "collection-artifacts": {
    title: "采集产物",
    description: "保存自动采集产生的回答原文、截图路径、HTML 摘要和耗时，用于审计和复盘。",
    apiPath: "/api/collection-artifacts",
    fields: [
      { name: "monitoringJobId", label: "采集任务", type: "select", required: true, optionSource: { endpoint: "/api/monitoring-jobs", labelKey: "keyword.text" } },
      { name: "answerAnalysisId", label: "回答分析记录", type: "text", placeholder: "例如：可选，关联 answer_analyses ID" },
      { name: "rawAnswer", label: "回答原文", type: "textarea", required: true, placeholder: "例如：AI 平台返回的完整回答" },
      { name: "screenshotPath", label: "截图路径", type: "text", placeholder: "例如：artifacts/doubao-jinan-ranking.png" },
      { name: "htmlSummary", label: "HTML 摘要", type: "textarea", placeholder: "例如：页面标题、回答区域和引用区域摘要" },
      { name: "durationMs", label: "采集耗时毫秒", type: "number", min: 0, placeholder: "例如：18000" },
      { name: "metadata", label: "采集元数据 JSON", type: "textarea", placeholder: "例如：{\"mode\":\"playwright\",\"failureType\":\"captcha\"}" },
    ],
    columns: [
      { label: "品牌", path: "monitoringJob.brand.name" },
      { label: "关键词", path: "monitoringJob.keyword.text" },
      { label: "平台", path: "monitoringJob.platform.name" },
      { label: "回答原文", path: "rawAnswer", type: "longText" },
      { label: "截图", path: "screenshotPath" },
      { label: "耗时", path: "durationMs" },
      { label: "元数据", path: "metadata", type: "longText" },
      { label: "创建时间", path: "createdAt", type: "date" },
    ],
  },
  "optimization-tasks": {
    title: "优化任务",
    description: "把低分关键词、未进入 TOP3、缺少引用来源和覆盖不足的问题转成可执行的内容、引用和排名优化待办。",
    apiPath: "/api/optimization-tasks",
    fields: [
      { name: "brandId", label: "关联品牌", type: "select", required: true, optionSource: { endpoint: "/api/brands", labelKey: "name" } },
      { name: "keywordId", label: "关联关键词", type: "select", optionSource: { endpoint: "/api/keywords", labelKey: "text" } },
      { name: "type", label: "任务类型", type: "select", options: optimizationTaskType },
      { name: "priority", label: "优先级", type: "select", options: optimizationTaskPriority },
      { name: "status", label: "任务状态", type: "select", options: optimizationTaskStatus },
      { name: "targetPlatform", label: "目标平台（请使用英文）", type: "text", placeholder: "例如：Doubao、Kimi、Tongyi、Yuanbao" },
      { name: "targetScoreImpact", label: "预计提分", type: "number", min: 0, placeholder: "例如：15" },
      { name: "dueDate", label: "计划完成日期", type: "date", placeholder: "例如：2026-06-30" },
      { name: "title", label: "任务标题", type: "text", required: true, placeholder: "例如：补强“济南装修公司排名”内容资产" },
      { name: "recommendation", label: "优化建议", type: "textarea", required: true, placeholder: "例如：新增推荐/对比页，覆盖品牌优势、服务范围、案例和第三方引用。" },
      { name: "rationale", label: "生成依据", type: "textarea", required: true, placeholder: "例如：当前 GEO Score 低于 75，且 Doubao 平台排名未进入 TOP3。" },
    ],
    columns: [
      { label: "任务标题", path: "title", type: "longText" },
      { label: "品牌", path: "brand.name" },
      { label: "关键词", path: "keyword.text" },
      { label: "类型", path: "type" },
      { label: "优先级", path: "priority" },
      { label: "状态", path: "status" },
      { label: "目标平台", path: "targetPlatform" },
      { label: "预计提分", path: "targetScoreImpact" },
      { label: "计划日期", path: "dueDate", type: "date" },
    ],
  },
  "platform-sessions": {
    title: "平台登录态",
    description: "配置 Doubao、Kimi、Tongyi、Yuanbao 的本地登录态文件和采集选择器。不要在系统中保存账号密码。",
    apiPath: "/api/platform-sessions",
    fields: [
      { name: "platformId", label: "AI 平台", type: "select", required: true, optionSource: { endpoint: "/api/ai-platforms", labelKey: "name" } },
      { name: "status", label: "登录态状态", type: "select", options: platformSessionStatus },
      { name: "storageStatePath", label: "登录态文件路径", type: "text", placeholder: "例如：.auth/doubao.json" },
      { name: "lastCheckedAt", label: "最后检查日期", type: "date", placeholder: "例如：2026-06-05" },
      {
        name: "collectorConfig",
        label: "采集配置 JSON",
        type: "textarea",
        placeholder:
          "例如：{\"promptSelectors\":[\"textarea\"],\"answerSelectors\":[\"main\"],\"waitAfterSubmitMs\":15000,\"headless\":false}",
      },
      { name: "notes", label: "备注", type: "textarea", placeholder: "例如：使用本机 Chrome 登录态导出的 storageState，不保存账号密码。" },
    ],
    columns: [
      { label: "平台", path: "platform.name" },
      { label: "状态", path: "status" },
      { label: "登录态文件", path: "storageStatePath" },
      { label: "采集配置", path: "collectorConfig", type: "longText" },
      { label: "最后检查", path: "lastCheckedAt", type: "date" },
      { label: "更新时间", path: "updatedAt", type: "date" },
    ],
  },
  "pipeline-runs": {
    title: "流水线运行",
    description: "查看采集、分析、排名、评分和优化任务生成的自动流水线执行记录。",
    apiPath: "/api/pipeline-runs",
    fields: [
      { name: "monitoringJobId", label: "采集任务", type: "select", required: true, optionSource: { endpoint: "/api/monitoring-jobs", labelKey: "keyword.text" } },
      { name: "status", label: "运行状态", type: "select", options: pipelineRunStatus },
      { name: "startedAt", label: "开始日期", type: "date", placeholder: "例如：2026-06-05" },
      { name: "completedAt", label: "完成日期", type: "date", placeholder: "例如：2026-06-05" },
      { name: "steps", label: "执行步骤 JSON", type: "textarea", placeholder: "例如：[{\"step\":\"collect\",\"status\":\"COMPLETED\"}]" },
      { name: "errorMessage", label: "错误信息", type: "textarea", placeholder: "例如：平台登录态过期，需要重新登录。" },
    ],
    columns: [
      { label: "品牌", path: "monitoringJob.brand.name" },
      { label: "关键词", path: "monitoringJob.keyword.text" },
      { label: "平台", path: "monitoringJob.platform.name" },
      { label: "状态", path: "status" },
      { label: "步骤", path: "steps", type: "longText" },
      { label: "错误", path: "errorMessage", type: "longText" },
      { label: "开始", path: "startedAt", type: "date" },
    ],
  },
  "client-share-links": {
    title: "客户分享链接",
    description: "为客户生成只读视图链接，可设置过期时间和启停状态，用于外部演示。",
    apiPath: "/api/client-share-links",
    fields: [
      { name: "clientId", label: "客户", type: "select", required: true, optionSource: { endpoint: "/api/clients", labelKey: "name" } },
      { name: "token", label: "分享令牌", type: "text", placeholder: "留空自动生成，例如：b7f1..." },
      { name: "status", label: "链接状态", type: "select", options: shareLinkStatus },
      { name: "expiresAt", label: "过期日期", type: "date", placeholder: "例如：2026-12-31" },
      { name: "notes", label: "备注", type: "textarea", placeholder: "例如：发给客户演示，只读访问。" },
    ],
    columns: [
      { label: "客户", path: "client.name" },
      { label: "令牌", path: "token" },
      { label: "状态", path: "status" },
      { label: "过期时间", path: "expiresAt", type: "date" },
      { label: "备注", path: "notes", type: "longText" },
      { label: "创建时间", path: "createdAt", type: "date" },
    ],
  },
};
