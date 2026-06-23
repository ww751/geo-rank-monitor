import Link from "next/link";
import { BulkOwnedPublishButton } from "@/components/bulk-owned-publish-button";
import { OptimizationTaskActions } from "@/components/optimization-task-actions";
import { isLocalSiteUrl } from "@/lib/owned-content-publisher";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const typeLabels: Record<string, string> = {
  CONTENT_ASSET: "内容资产",
  TOP3_BOOST: "TOP3 提升",
  CITATION_BUILDING: "引用建设",
  KEYWORD_COVERAGE: "关键词覆盖",
  COMPETITOR_GAP: "竞品差距",
};

const priorityLabels: Record<string, string> = {
  HIGH: "高优先级",
  MEDIUM: "中优先级",
  LOW: "低优先级",
};

const statusLabels: Record<string, string> = {
  OPEN: "待处理",
  IN_PROGRESS: "进行中",
  DONE: "已完成",
  DISMISSED: "已忽略",
};

function priorityClass(priority: string) {
  if (priority === "HIGH") return "border-red-200 bg-red-50 text-red-700";
  if (priority === "MEDIUM") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function statusClass(status: string) {
  if (status === "DONE") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "IN_PROGRESS") return "border-cyan-200 bg-cyan-50 text-cyan-700";
  if (status === "DISMISSED") return "border-slate-200 bg-slate-50 text-slate-500";
  return "border-slate-200 bg-white text-slate-700";
}

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("zh-CN").format(value) : "-";
}

export default async function OptimizationTasksPage() {
  const tasks = await prisma.optimizationTask.findMany({
    include: {
      brand: { include: { client: true } },
      keyword: true,
      geoScore: true,
      answerAnalysis: true,
      contentAssets: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });

  const highCount = tasks.filter((task) => task.priority === "HIGH").length;
  const draftCount = tasks.filter((task) => task.contentAssets.length > 0).length;
  const replayCount = tasks.filter((task) => task.answerAnalysis?.ruleVersion.includes("optimization-replay")).length;
  const openCount = tasks.filter((task) => task.status === "OPEN" || task.status === "IN_PROGRESS").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-700">GEO 提升闭环</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">GEO 优化任务</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            把“品牌未出现、未进 TOP3、缺引用来源、竞品占位、关键词覆盖不足”转成可执行内容任务，并支持生成草稿、发布到自有内容站和复盘测试。
            复盘测试用于验证系统闭环，不冒充真实平台自然排名。
          </p>
        </div>
        <BulkOwnedPublishButton />
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          ["待推进任务", openCount],
          ["高优先级", highCount],
          ["已生成草稿", draftCount],
          ["已复盘测试", replayCount],
        ].map(([label, value]) => (
          <div key={label} className="rounded border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded border border-cyan-200 bg-cyan-50 p-4 text-sm leading-6 text-cyan-950">
        <p className="font-semibold">推荐操作顺序</p>
        <p>
          先批量一键发布到自有内容站，再到发布准备度页面检查公开 URL、sitemap、robots 和内容质量。真实提升需要这些页面部署到公网域名后，再用 Doubao 真实采集复测。
        </p>
      </section>

      {isLocalSiteUrl() ? (
        <section className="rounded border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <p className="font-semibold">当前仍是本地发布</p>
          <p>
            `NEXT_PUBLIC_SITE_URL` 当前是 localhost，系统可以一键发布和自检，但 Doubao 无法访问你的本机页面。部署到公网域名后，发布 URL 才会进入真实复测条件。
          </p>
          <Link href="/publication-readiness" className="mt-2 inline-block font-semibold underline">
            查看发布准备度
          </Link>
        </section>
      ) : null}

      <section className="space-y-4">
        {tasks.length === 0 ? (
          <div className="rounded border border-slate-200 bg-white p-8 text-sm text-slate-500">
            暂无优化任务。请先在 Dashboard 或客户视图点击“生成优化任务”，或运行一次采集流水线。
          </div>
        ) : (
          tasks.map((task) => {
            const content = task.contentAssets[0];
            const beforeScore = content?.beforeScore ?? task.geoScore?.totalScore ?? 0;
            const afterScore = content?.afterScore ?? null;
            return (
              <article key={task.id} className="rounded border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded border px-2 py-1 text-xs font-semibold ${priorityClass(task.priority)}`}>
                        {priorityLabels[task.priority]}
                      </span>
                      <span className={`rounded border px-2 py-1 text-xs font-semibold ${statusClass(task.status)}`}>
                        {statusLabels[task.status]}
                      </span>
                      <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
                        {typeLabels[task.type]}
                      </span>
                      {task.targetPlatform ? (
                        <span className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
                          {task.targetPlatform}
                        </span>
                      ) : null}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-950">{task.title}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {task.brand.client.name} / {task.brand.name}
                        {task.keyword ? ` / ${task.keyword.text}` : ""}
                      </p>
                    </div>
                  </div>
                  <OptimizationTaskActions taskId={task.id} canReplay={Boolean(task.keywordId)} />
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  <div className="rounded border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-500">为什么生成</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{task.rationale}</p>
                  </div>
                  <div className="rounded border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
                    <p className="text-xs font-semibold text-slate-500">建议动作</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{task.recommendation}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                  <div className="rounded border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">预期提分</p>
                    <p className="mt-1 font-semibold text-slate-950">+{task.targetScoreImpact}</p>
                  </div>
                  <div className="rounded border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">复盘分数</p>
                    <p className="mt-1 font-semibold text-slate-950">
                      {beforeScore}
                      {afterScore !== null ? ` -> ${afterScore}` : ""}
                    </p>
                  </div>
                  <div className="rounded border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">计划日期</p>
                    <p className="mt-1 font-semibold text-slate-950">{formatDate(task.dueDate)}</p>
                  </div>
                  <div className="rounded border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">内容草稿</p>
                    <p className="mt-1 font-semibold text-slate-950">{content ? content.status : "未生成"}</p>
                  </div>
                </div>

                {content ? (
                  <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-semibold text-emerald-900">已生成草稿：{content.title}</p>
                    {content.impactNotes ? (
                      <p className="mt-2 text-sm leading-6 text-emerald-800">{content.impactNotes}</p>
                    ) : (
                      <p className="mt-2 text-sm text-emerald-800">可到内容资产页查看完整草稿大纲。</p>
                    )}
                    <Link href="/contents" className="mt-2 inline-block text-sm font-semibold text-emerald-900 underline">
                      查看内容资产
                    </Link>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
