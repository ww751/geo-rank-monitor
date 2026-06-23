import Link from "next/link";
import { ExportClientViewButton } from "@/components/export-client-view-button";
import { GenerateOptimizationTasksButton } from "@/components/generate-optimization-tasks-button";
import { GenerateReportSummaryButton } from "@/components/generate-report-summary-button";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type FilterState = {
  clientId: string;
  brandId: string;
  dateFrom: string;
  dateTo: string;
};

type BrandCard = {
  id: string;
  clientId: string;
  name: string;
  clientName: string;
  category: string;
  geoGoal: string | null;
  geoScore: number;
  top3Rate: number;
  competitors: string[];
  suggestions: string[];
  optimizationTasks: Array<{
    id: string;
    title: string;
    type: string;
    priority: string;
    status: string;
    targetPlatform: string | null;
    dueDate: Date | null;
  }>;
  recentResults: Array<{
    id: string;
    keyword: string;
    platform: string;
    rankPosition: number | null;
    brandMentioned: boolean;
    visibilityScore: number;
    sampledAt: Date;
  }>;
};

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function parseFilters(raw: Record<string, string | string[] | undefined>): FilterState {
  return {
    clientId: param(raw.clientId),
    brandId: param(raw.brandId),
    dateFrom: param(raw.dateFrom),
    dateTo: param(raw.dateTo),
  };
}

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

function dateRangeWhere(filters: FilterState) {
  const range: { gte?: Date; lte?: Date } = {};
  if (filters.dateFrom) range.gte = new Date(`${filters.dateFrom}T00:00:00.000+08:00`);
  if (filters.dateTo) range.lte = new Date(`${filters.dateTo}T23:59:59.999+08:00`);
  return Object.keys(range).length > 0 ? range : undefined;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function suggestionsFor(
  scores: Array<{
    totalScore: number;
    rankingScore: number;
    platform: string;
    keyword: { text: string };
    answerAnalysis: { citationUrls: string[] } | null;
  }>,
) {
  const lowKeywords = unique(scores.filter((score) => score.totalScore < 75).map((score) => score.keyword.text)).slice(0, 3);
  const nonTop3Platforms = unique(scores.filter((score) => score.rankingScore < 30).map((score) => score.platform)).slice(0, 3);
  const missingCitationKeywords = unique(
    scores.filter((score) => (score.answerAnalysis?.citationUrls.length ?? 0) === 0).map((score) => score.keyword.text),
  ).slice(0, 3);
  const suggestions: string[] = [];

  if (lowKeywords.length > 0) suggestions.push(`优先优化低分关键词：${lowKeywords.join("、")}。`);
  if (nonTop3Platforms.length > 0) suggestions.push(`重点提升这些平台的 TOP3 排名：${nonTop3Platforms.join("、")}。`);
  if (missingCitationKeywords.length > 0) suggestions.push(`补充可被引用的内容资产：${missingCitationKeywords.join("、")}。`);
  if (suggestions.length === 0) suggestions.push("当前品牌表现稳定，建议继续补充案例、价格、避坑和对比类内容。");

  return suggestions;
}

async function loadClientView(filters: FilterState) {
  const latestRun = await prisma.geoScoreRun.findFirst({
    where: { status: "COMPLETED" },
    orderBy: { startedAt: "desc" },
  });
  const dateWhere = dateRangeWhere(filters);
  const [clients, brands, rawBrands] = await Promise.all([
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.brand.findMany({ select: { id: true, name: true, clientId: true }, orderBy: { name: "asc" } }),
    prisma.brand.findMany({
      where: {
        ...(filters.clientId ? { clientId: filters.clientId } : {}),
        ...(filters.brandId ? { id: filters.brandId } : {}),
      },
      include: {
        client: { select: { id: true, name: true } },
        competitors: { select: { name: true }, orderBy: { createdAt: "asc" } },
        geoScores: {
          where: {
            ...(latestRun ? { runId: latestRun.id } : {}),
            ...(dateWhere ? { createdAt: dateWhere } : {}),
          },
          include: {
            keyword: { select: { text: true } },
            answerAnalysis: { select: { citationUrls: true } },
          },
        },
        rankResults: {
          where: {
            ...(dateWhere ? { sampledAt: dateWhere } : {}),
          },
          include: {
            keyword: { select: { text: true } },
            platform: { select: { name: true } },
          },
          orderBy: { sampledAt: "desc" },
          take: 5,
        },
        optimizationTasks: {
          where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
          select: {
            id: true,
            title: true,
            type: true,
            priority: true,
            status: true,
            targetPlatform: true,
            dueDate: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const cards: BrandCard[] = rawBrands.map((brand) => ({
    id: brand.id,
    clientId: brand.client.id,
    name: brand.name,
    clientName: brand.client.name,
    category: brand.category,
    geoGoal: brand.geoGoal,
    geoScore: average(brand.geoScores.map((score) => score.totalScore)),
    top3Rate: percentage(
      brand.geoScores.filter((score) => score.rankingScore >= 30).length,
      brand.geoScores.length,
    ),
    competitors: brand.competitors.map((competitor) => competitor.name),
    suggestions: suggestionsFor(brand.geoScores),
    optimizationTasks: brand.optimizationTasks,
    recentResults: brand.rankResults.map((result) => ({
      id: result.id,
      keyword: result.keyword.text,
      platform: result.platform.name,
      rankPosition: result.rankPosition,
      brandMentioned: result.brandMentioned,
      visibilityScore: result.visibilityScore,
      sampledAt: result.sampledAt,
    })),
  }));

  return { clients, brands, latestRun, cards };
}

function FilterForm({
  filters,
  clients,
  brands,
}: {
  filters: FilterState;
  clients: Array<{ id: string; name: string }>;
  brands: Array<{ id: string; name: string; clientId: string }>;
}) {
  return (
    <form className="rounded border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-4">
        <label>
          <span className="text-sm font-medium text-slate-700">客户</span>
          <select name="clientId" defaultValue={filters.clientId} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">全部客户</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">品牌</span>
          <select name="brandId" defaultValue={filters.brandId} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">全部品牌</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">开始日期</span>
          <input name="dateFrom" type="date" defaultValue={filters.dateFrom} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">结束日期</span>
          <input name="dateTo" type="date" defaultValue={filters.dateTo} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <div className="flex items-end gap-3 md:col-span-4">
          <button type="submit" className="rounded bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800">
            应用筛选
          </button>
          <Link href="/client-view" className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            重置
          </Link>
        </div>
      </div>
    </form>
  );
}

function CompetitorList({ competitors }: { competitors: string[] }) {
  if (competitors.length === 0) return <p className="text-sm text-slate-500">暂无竞品数据。</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {competitors.map((competitor) => (
        <span key={competitor} className="rounded bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-700">
          {competitor}
        </span>
      ))}
    </div>
  );
}

const taskTypeLabels: Record<string, string> = {
  CONTENT_ASSET: "内容资产",
  TOP3_BOOST: "TOP3 提升",
  CITATION_BUILDING: "引用建设",
  KEYWORD_COVERAGE: "覆盖补齐",
  COMPETITOR_GAP: "竞品差距",
};

const priorityLabels: Record<string, string> = {
  HIGH: "高",
  MEDIUM: "中",
  LOW: "低",
};

const statusLabels: Record<string, string> = {
  OPEN: "待处理",
  IN_PROGRESS: "处理中",
  DONE: "已完成",
  DISMISSED: "已忽略",
};

export default async function ClientViewPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseFilters(await searchParams);
  const data = await loadClientView(filters);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-700">客户视图</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-950">GEO AI 搜索可见度监测平台</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            按客户、品牌和时间范围查看 GEO Score、TOP3 占比、竞品、最近监测结果和优化建议。
          </p>
          <p className="mt-2 text-xs text-slate-500">
            当前评分批次：{data.latestRun ? `${dateText(data.latestRun.completedAt ?? data.latestRun.startedAt)} · ${data.latestRun.source}` : "暂无评分批次"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportClientViewButton />
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            返回数据看板
          </Link>
        </div>
      </header>

      <FilterForm filters={filters} clients={data.clients} brands={data.brands} />

      <section className="grid gap-5">
        {data.cards.length === 0 ? (
          <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            当前筛选条件下暂无品牌数据。
          </div>
        ) : (
          data.cards.map((brand) => (
            <article key={brand.id} className="rounded border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm text-slate-500">
                      {brand.clientName} · {brand.category}
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold text-slate-950">{brand.name}</h2>
                    {brand.geoGoal ? <p className="mt-2 text-sm leading-6 text-slate-600">{brand.geoGoal}</p> : null}
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
                    <div className="rounded border border-violet-100 bg-violet-50 p-4">
                      <p className="text-sm font-medium text-violet-700">GEO Score</p>
                      <p className="mt-2 text-3xl font-semibold text-violet-900">{brand.geoScore}</p>
                    </div>
                    <div className="rounded border border-cyan-100 bg-cyan-50 p-4">
                      <p className="text-sm font-medium text-cyan-700">TOP3 占比</p>
                      <p className="mt-2 text-3xl font-semibold text-cyan-900">{brand.top3Rate}%</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 p-5 xl:grid-cols-[320px_minmax(0,1fr)]">
                <div className="space-y-5">
                  <section>
                    <h3 className="text-sm font-semibold text-slate-950">竞品列表</h3>
                    <div className="mt-3">
                      <CompetitorList competitors={brand.competitors} />
                    </div>
                  </section>
                  <section>
                    <h3 className="text-sm font-semibold text-slate-950">优化建议</h3>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                      {brand.suggestions.map((suggestion) => (
                        <li key={suggestion} className="rounded bg-slate-50 px-3 py-2">
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-slate-950">待办任务</h3>
                      <Link href="/optimization-tasks" className="text-xs font-semibold text-cyan-700 hover:text-cyan-900">
                        查看全部
                      </Link>
                    </div>
                    <div className="mt-3 space-y-2">
                      {brand.optimizationTasks.length === 0 ? (
                        <p className="rounded bg-slate-50 px-3 py-2 text-sm text-slate-500">暂无未完成任务，可点击下方生成。</p>
                      ) : (
                        brand.optimizationTasks.map((task) => (
                          <div key={task.id} className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
                            <p className="text-sm font-semibold leading-6 text-slate-900">{task.title}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              {taskTypeLabels[task.type] ?? task.type} · 优先级 {priorityLabels[task.priority] ?? task.priority} ·{" "}
                              {statusLabels[task.status] ?? task.status}
                              {task.targetPlatform ? ` · ${task.targetPlatform}` : ""}
                              {task.dueDate ? ` · ${dateText(task.dueDate)} 前` : ""}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                  <div className="flex flex-wrap gap-2">
                    <GenerateOptimizationTasksButton clientId={brand.clientId} brandId={brand.id} />
                    <GenerateReportSummaryButton clientId={brand.clientId} brandId={brand.id} />
                  </div>
                </div>

                <section>
                  <h3 className="text-sm font-semibold text-slate-950">最近监测结果</h3>
                  <div className="mt-3 overflow-x-auto rounded border border-slate-200">
                    <table className="w-full min-w-[680px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-semibold">关键词</th>
                          <th className="px-4 py-3 font-semibold">平台</th>
                          <th className="px-4 py-3 font-semibold">品牌出现</th>
                          <th className="px-4 py-3 font-semibold">排名</th>
                          <th className="px-4 py-3 font-semibold">可见度</th>
                          <th className="px-4 py-3 font-semibold">采样时间</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {brand.recentResults.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                              暂无监测结果。
                            </td>
                          </tr>
                        ) : (
                          brand.recentResults.map((result) => (
                            <tr key={result.id}>
                              <td className="px-4 py-3 text-slate-900">{result.keyword}</td>
                              <td className="px-4 py-3 text-slate-600">{result.platform}</td>
                              <td className="px-4 py-3 text-slate-600">{result.brandMentioned ? "是" : "否"}</td>
                              <td className="px-4 py-3 text-slate-600">
                                {result.rankPosition ? `第 ${result.rankPosition} 名` : "未进入推荐"}
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-950">{result.visibilityScore}</td>
                              <td className="px-4 py-3 text-slate-500">{dateText(result.sampledAt)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
