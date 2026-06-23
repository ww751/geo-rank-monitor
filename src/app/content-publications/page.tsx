import Link from "next/link";
import { ContentPublicationActions } from "@/components/content-publication-actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  PUBLISHED: "已发布",
  WAITING_RETEST: "等待复测",
  RETESTING: "复测中",
  REVIEWED: "已复盘",
};

const retestStatusLabels: Record<string, string> = {
  PENDING: "待复测",
  RUNNING: "复测中",
  COMPLETED: "已完成",
  FAILED: "失败",
};

function dateText(value: Date | null) {
  return value ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "short" }).format(value) : "-";
}

export default async function ContentPublicationsPage() {
  const publications = await prisma.contentPublication.findMany({
    include: {
      content: true,
      brand: { include: { client: true } },
      keyword: true,
      retests: { orderBy: { createdAt: "desc" }, take: 3 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-700">内容发布复盘</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">内容发布与复测</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            把优化任务生成的内容草稿标记为已发布后，在这里安排复测或立即跑一次模拟复测。真实效果仍建议用 Doubao 真实采集确认。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/optimization-tasks" className="rounded border border-cyan-700 px-4 py-2 text-sm font-semibold text-cyan-800 hover:bg-cyan-50">
            去优化任务
          </Link>
          <Link href="/improvement-experiments" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            查看提升实验
          </Link>
          <Link href="/publication-readiness" className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            发布准备度
          </Link>
        </div>
      </header>

      <section className="rounded border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">发布记录</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">内容</th>
                <th className="px-5 py-3 font-semibold">客户/品牌</th>
                <th className="px-5 py-3 font-semibold">关键词</th>
                <th className="px-5 py-3 font-semibold">平台</th>
                <th className="px-5 py-3 font-semibold">状态</th>
                <th className="px-5 py-3 font-semibold">发布时间</th>
                <th className="px-5 py-3 font-semibold">最近复测</th>
                <th className="px-5 py-3 font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {publications.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                    暂无发布记录。请先在优化任务页生成草稿并标记发布。
                  </td>
                </tr>
              ) : (
                publications.map((publication) => {
                  const latestRetest = publication.retests[0];
                  return (
                    <tr key={publication.id}>
                      <td className="max-w-sm px-5 py-4 text-slate-900">
                        <p className="font-medium">{publication.content?.title ?? publication.publishedUrl ?? "未命名内容"}</p>
                        {publication.publishedUrl ? (
                          <a href={publication.publishedUrl} target="_blank" className="mt-1 block truncate text-xs text-cyan-700 underline">
                            {publication.publishedUrl}
                          </a>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {publication.brand.client.name} / {publication.brand.name}
                      </td>
                      <td className="px-5 py-4 text-slate-600">{publication.keyword?.text ?? publication.content?.targetKeyword ?? "-"}</td>
                      <td className="px-5 py-4 text-slate-600">{publication.platform}</td>
                      <td className="px-5 py-4 text-slate-600">{statusLabels[publication.status]}</td>
                      <td className="px-5 py-4 text-slate-600">{dateText(publication.publishedAt)}</td>
                      <td className="max-w-xs px-5 py-4 text-slate-600">
                        {latestRetest ? (
                          <div>
                            <p>{retestStatusLabels[latestRetest.status]} · {dateText(latestRetest.completedAt ?? latestRetest.scheduledAt)}</p>
                            <p className="mt-1 line-clamp-2 text-xs">{latestRetest.resultSummary ?? latestRetest.failureReason ?? "-"}</p>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <ContentPublicationActions publicationId={publication.id} />
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
