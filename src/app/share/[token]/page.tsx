import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const revalidate = 60; // ISR: 每 60 秒刷新缓存

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function percentage(part: number, total: number) {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

function dateText(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(date);
}

export default async function SharedClientViewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const requestHeaders = await headers();
  const shareLink = await prisma.clientShareLink.findUnique({
    where: { token },
    include: {
      client: {
        include: {
          brands: {
            include: {
              competitors: { select: { name: true }, take: 5 },
              geoScores: {
                include: { keyword: { select: { text: true } } },
                orderBy: { createdAt: "desc" },
                take: 20,
              },
              optimizationTasks: {
                where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
                select: { title: true, priority: true, status: true },
                orderBy: { createdAt: "desc" },
                take: 5,
              },
              rankResults: {
                include: {
                  keyword: { select: { text: true } },
                  platform: { select: { name: true } },
                },
                orderBy: { sampledAt: "desc" },
                take: 5,
              },
            },
          },
        },
      },
    },
  });

  if (!shareLink || shareLink.status !== "ACTIVE") notFound();
  if (shareLink.expiresAt && shareLink.expiresAt < new Date()) notFound();

  await prisma.shareLinkAccessLog
    .create({
      data: {
        shareLinkId: shareLink.id,
        path: `/share/${token}`,
        ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? requestHeaders.get("x-real-ip"),
        userAgent: requestHeaders.get("user-agent"),
      },
    })
    .catch(() => undefined);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="border-b border-slate-200 pb-5">
          <p className="text-sm font-semibold text-cyan-700">客户只读视图</p>
          <h1 className="mt-1 text-3xl font-semibold">GEO AI 搜索可见度监测平台</h1>
          <p className="mt-2 text-sm text-slate-600">
            {shareLink.client.name} · {shareLink.client.industry}
          </p>
        </header>

        <section className="grid gap-5">
          {shareLink.client.brands.map((brand) => {
            const score = average(brand.geoScores.map((item) => item.totalScore));
            const top3Rate = percentage(brand.geoScores.filter((item) => item.rankingScore >= 30).length, brand.geoScores.length);
            return (
              <article key={brand.id} className="rounded border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{brand.category}</p>
                    <h2 className="mt-1 text-2xl font-semibold">{brand.name}</h2>
                    {brand.geoGoal ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{brand.geoGoal}</p> : null}
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
                    <div className="rounded border border-violet-100 bg-violet-50 p-4">
                      <p className="text-sm font-medium text-violet-700">GEO Score</p>
                      <p className="mt-2 text-3xl font-semibold text-violet-900">{score}</p>
                    </div>
                    <div className="rounded border border-cyan-100 bg-cyan-50 p-4">
                      <p className="text-sm font-medium text-cyan-700">TOP3 占比</p>
                      <p className="mt-2 text-3xl font-semibold text-cyan-900">{top3Rate}%</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-5 lg:grid-cols-3">
                  <section>
                    <h3 className="text-sm font-semibold">竞品</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {brand.competitors.length === 0 ? (
                        <span className="text-sm text-slate-500">暂无竞品数据</span>
                      ) : (
                        brand.competitors.map((competitor) => (
                          <span key={competitor.name} className="rounded bg-slate-100 px-2.5 py-1 text-sm text-slate-700">
                            {competitor.name}
                          </span>
                        ))
                      )}
                    </div>
                  </section>
                  <section>
                    <h3 className="text-sm font-semibold">待办任务</h3>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                      {brand.optimizationTasks.length === 0 ? (
                        <li className="rounded bg-slate-50 px-3 py-2">暂无未完成任务</li>
                      ) : (
                        brand.optimizationTasks.map((task) => (
                          <li key={task.title} className="rounded bg-slate-50 px-3 py-2">
                            {task.title} · {task.priority}
                          </li>
                        ))
                      )}
                    </ul>
                  </section>
                  <section>
                    <h3 className="text-sm font-semibold">最近监测</h3>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                      {brand.rankResults.length === 0 ? (
                        <li className="rounded bg-slate-50 px-3 py-2">暂无监测结果</li>
                      ) : (
                        brand.rankResults.map((result) => (
                          <li key={result.id} className="rounded bg-slate-50 px-3 py-2">
                            {result.platform.name} · {result.keyword.text} ·{" "}
                            {result.rankPosition ? `第 ${result.rankPosition} 名` : "未进入推荐"} · {dateText(result.sampledAt)}
                          </li>
                        ))
                      )}
                    </ul>
                  </section>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
