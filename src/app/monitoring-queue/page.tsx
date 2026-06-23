import Link from "next/link";
import { MonitoringQueueActions } from "@/components/monitoring-queue-actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  PENDING: "待执行",
  RUNNING: "执行中",
  COMPLETED: "已完成",
  FAILED: "失败",
  CANCELED: "已取消",
};

function dateText(value: Date | null) {
  return value ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "short" }).format(value) : "-";
}

export default async function MonitoringQueuePage() {
  const [jobs, counts] = await Promise.all([
    prisma.monitoringJob.findMany({
      include: {
        brand: { select: { name: true } },
        keyword: { select: { text: true } },
        platform: { select: { name: true } },
        pipelineRuns: { orderBy: { startedAt: "desc" }, take: 1 },
      },
      orderBy: [{ status: "asc" }, { scheduledAt: "asc" }],
      take: 80,
    }),
    prisma.monitoringJob.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const countByStatus = new Map(counts.map((item) => [item.status, item._count._all]));

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-700">后台采集队列</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">采集队列控制台</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            当前版本使用 PostgreSQL 轮询任务队列。真实采集请小批量执行，遇到验证码或登录态失效时先处理平台页面，再重新入队。
          </p>
        </div>
        <Link href="/pipeline-runner" className="rounded border border-cyan-700 px-4 py-2 text-sm font-semibold text-cyan-800 hover:bg-cyan-50">
          去单条测试
        </Link>
      </header>

      <section className="grid gap-3 md:grid-cols-5">
        {(["PENDING", "RUNNING", "FAILED", "COMPLETED", "CANCELED"] as const).map((status) => (
          <div key={status} className="rounded border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{statusLabels[status]}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{countByStatus.get(status) ?? 0}</p>
          </div>
        ))}
      </section>

      <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
        <MonitoringQueueActions />
        <p className="mt-3 text-sm text-slate-500">
          命令行也可以运行：`npm run worker:monitoring -- --limit=1` 或 `npm run worker:monitoring -- --include-failed --limit=1`
        </p>
      </section>

      <section className="rounded border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">队列任务</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">状态</th>
                <th className="px-5 py-3 font-semibold">品牌</th>
                <th className="px-5 py-3 font-semibold">关键词</th>
                <th className="px-5 py-3 font-semibold">平台</th>
                <th className="px-5 py-3 font-semibold">计划时间</th>
                <th className="px-5 py-3 font-semibold">重试</th>
                <th className="px-5 py-3 font-semibold">最近流水线</th>
                <th className="px-5 py-3 font-semibold">失败原因</th>
                <th className="px-5 py-3 font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-slate-500">
                    暂无队列任务。
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="px-5 py-4 text-slate-700">{statusLabels[job.status] ?? job.status}</td>
                    <td className="px-5 py-4 text-slate-900">{job.brand.name}</td>
                    <td className="px-5 py-4 text-slate-600">{job.keyword.text}</td>
                    <td className="px-5 py-4 text-slate-600">{job.platform.name}</td>
                    <td className="px-5 py-4 text-slate-600">{dateText(job.scheduledAt)}</td>
                    <td className="px-5 py-4 text-slate-600">{job.retryCount}</td>
                    <td className="px-5 py-4 text-slate-600">{job.pipelineRuns[0]?.status ?? "-"}</td>
                    <td className="max-w-sm px-5 py-4 text-slate-600">
                      <span className="line-clamp-2">{job.failureReason ?? "-"}</span>
                    </td>
                    <td className="px-5 py-4">
                      {job.status === "FAILED" || job.status === "CANCELED" ? <MonitoringQueueActions jobId={job.id} /> : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
