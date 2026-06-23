import Link from "next/link";
import { PipelineRunnerForm } from "@/components/pipeline-runner-form";
import { RunPipelineButton } from "@/components/run-pipeline-button";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function dateText(date: Date | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const statusLabels: Record<string, string> = {
  PENDING: "待采集",
  RUNNING: "采集中",
  COMPLETED: "已完成",
  FAILED: "失败",
  CANCELED: "已取消",
};

export default async function PipelineRunnerPage() {
  const [clients, brands, keywords, platforms, jobs] = await Promise.all([
    prisma.client.findMany({ select: { id: true, name: true, industry: true }, orderBy: { createdAt: "desc" } }),
    prisma.brand.findMany({ select: { id: true, name: true, clientId: true }, orderBy: { createdAt: "desc" } }),
    prisma.keyword.findMany({ select: { id: true, text: true, brandId: true }, where: { active: true }, orderBy: { priority: "asc" } }),
    prisma.aiPlatform.findMany({ select: { id: true, name: true }, where: { enabled: true }, orderBy: { createdAt: "asc" } }),
    prisma.monitoringJob.findMany({
      include: {
        brand: { select: { name: true } },
        keyword: { select: { text: true } },
        platform: { select: { name: true, session: { select: { status: true } } } },
        pipelineRuns: { orderBy: { startedAt: "desc" }, take: 1 },
      },
      orderBy: { scheduledAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-sm font-semibold text-cyan-700">流水线执行器</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">GEO AI 搜索可见度监测平台</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
          用一个入口跑通采集、AI 回答分析、排名提取、GEO Score、优化任务和复测建议。建议先跑模拟采集，确认链路正常后再切换 Doubao 真实采集。
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/platform-sessions" className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            配置平台登录态
          </Link>
          <Link href="/collection-artifacts" className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            查看采集产物
          </Link>
          <Link href="/pipeline-runs" className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            查看运行记录
          </Link>
        </div>
      </header>

      <PipelineRunnerForm clients={clients} brands={brands} keywords={keywords} platforms={platforms} />

      <section className="rounded border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">最近采集任务</h2>
            <p className="mt-1 text-sm text-slate-500">可以对历史任务重新运行模拟采集，用于排查链路。</p>
          </div>
          <Link href="/monitoring-queue" className="text-sm font-semibold text-cyan-700 underline">
            打开采集队列
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">品牌</th>
                <th className="px-5 py-3 font-semibold">关键词</th>
                <th className="px-5 py-3 font-semibold">平台</th>
                <th className="px-5 py-3 font-semibold">登录态</th>
                <th className="px-5 py-3 font-semibold">任务状态</th>
                <th className="px-5 py-3 font-semibold">最近运行</th>
                <th className="px-5 py-3 font-semibold">失败原因</th>
                <th className="px-5 py-3 font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                    暂无采集任务，请先使用上方表单创建一次测试。
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const latestRun = job.pipelineRuns[0];
                  return (
                    <tr key={job.id}>
                      <td className="px-5 py-4 text-slate-900">{job.brand.name}</td>
                      <td className="px-5 py-4 text-slate-600">{job.keyword.text}</td>
                      <td className="px-5 py-4 text-slate-600">{job.platform.name}</td>
                      <td className="px-5 py-4 text-slate-600">{job.platform.session?.status ?? "未配置"}</td>
                      <td className="px-5 py-4 text-slate-600">{statusLabels[job.status] ?? job.status}</td>
                      <td className="px-5 py-4 text-slate-600">
                        {latestRun ? `${latestRun.status} · ${dateText(latestRun.completedAt ?? latestRun.startedAt)}` : "-"}
                      </td>
                      <td className="max-w-xs px-5 py-4 text-slate-600">
                        <span className="line-clamp-2">{job.failureReason ?? "-"}</span>
                      </td>
                      <td className="px-5 py-4">
                        <RunPipelineButton monitoringJobId={job.id} collectionMode="mock" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
