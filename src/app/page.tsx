import Link from "next/link";
import { GenerateOptimizationTasksButton } from "@/components/generate-optimization-tasks-button";
import { RecalculateGeoScoreButton } from "@/components/recalculate-geo-score-button";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type GeoScoreItem = {
  id: string;
  runId: string | null;
  platform: string;
  visibilityScore: number;
  rankingScore: number;
  totalScore: number;
  createdAt: Date;
  brand: { id: string; name: string; client: { id: string; name: string; industry: string } };
  keyword: { id: string; text: string; intent: string };
  answerAnalysis: { id: string; citationUrls: string[]; confidenceScore: number } | null;
};

type FilterState = {
  clientId: string;
  brandId: string;
  industry: string;
  platform: string;
  dateFrom: string;
  dateTo: string;
  runId: string;
};

type TrendPoint = {
  label: string;
  value: number;
};

type CoverageBar = {
  label: string;
  value: number;
  helper: string;
};

type ShareOfVoiceItem = {
  label: string;
  type: "客户品牌" | "竞品";
  count: number;
  value: number;
};

type IntentPerformanceItem = {
  label: string;
  score: number;
  appearanceRate: number;
  sampleCount: number;
};

type OptionData = {
  clients: Array<{ id: string; name: string; industry: string }>;
  brands: Array<{ id: string; name: string; clientId: string }>;
  industries: string[];
  platforms: Array<{ id: string; name: string }>;
  runs: Array<{ id: string; source: string; status: string; startedAt: Date; completedAt: Date | null }>;
};

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function percentage(part: number, total: number) {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

function uniqueCount(values: string[]) {
  return new Set(values.filter(Boolean)).size;
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function isNameMatch(candidate: string, entityName: string) {
  const left = normalizeName(candidate);
  const right = normalizeName(entityName);
  if (!left || !right) return false;
  if (left === right) return true;
  const minLength = Math.min(left.length, right.length);
  return minLength >= 3 && (left.includes(right) || right.includes(left));
}

function signed(value: number, suffix = "") {
  if (value > 0) return `+${value}${suffix}`;
  return `${value}${suffix}`;
}

const intentLabels: Record<string, string> = {
  BRAND: "品牌词",
  PRODUCT: "产品服务",
  SOLUTION: "解决方案",
  COMPARISON: "对比决策",
  REPUTATION: "口碑评价",
};

function dateText(date: Date | null | undefined) {
  if (!date) return "未完成";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function parseFilters(raw: Record<string, string | string[] | undefined>): FilterState {
  return {
    clientId: param(raw.clientId),
    brandId: param(raw.brandId),
    industry: param(raw.industry),
    platform: param(raw.platform),
    dateFrom: param(raw.dateFrom),
    dateTo: param(raw.dateTo),
    runId: param(raw.runId),
  };
}

function dateRangeWhere(filters: FilterState) {
  const range: { gte?: Date; lte?: Date } = {};
  if (filters.dateFrom) range.gte = new Date(`${filters.dateFrom}T00:00:00.000+08:00`);
  if (filters.dateTo) range.lte = new Date(`${filters.dateTo}T23:59:59.999+08:00`);
  return Object.keys(range).length > 0 ? range : undefined;
}

function filterScores(scores: GeoScoreItem[], filters: FilterState) {
  return scores.filter((score) => {
    if (filters.clientId && score.brand.client.id !== filters.clientId) return false;
    if (filters.brandId && score.brand.id !== filters.brandId) return false;
    if (filters.industry && score.brand.client.industry !== filters.industry) return false;
    return true;
  });
}

function buildMetricCards(scores: GeoScoreItem[], previousScores: GeoScoreItem[], keywordTotal: number) {
  const currentScore = average(scores.map((score) => score.totalScore));
  const previousScore = average(previousScores.map((score) => score.totalScore));
  const brandAppearanceRate = percentage(scores.filter((score) => score.visibilityScore > 0).length, scores.length);
  const previousAppearanceRate = percentage(previousScores.filter((score) => score.visibilityScore > 0).length, previousScores.length);
  const top3Rate = percentage(scores.filter((score) => score.rankingScore >= 30).length, scores.length);
  const previousTop3Rate = percentage(previousScores.filter((score) => score.rankingScore >= 30).length, previousScores.length);
  const citationCount = uniqueCount(scores.flatMap((score) => score.answerAnalysis?.citationUrls ?? []));
  const previousCitationCount = uniqueCount(previousScores.flatMap((score) => score.answerAnalysis?.citationUrls ?? []));

  return [
    {
      label: "GEO Score 总分",
      value: String(currentScore),
      trend: previousScores.length === 0 ? "暂无上期对比" : signed(currentScore - previousScore),
      helper: "当前筛选条件下的评分批次均分",
      tone: "violet",
    },
    {
      label: "品牌出现率",
      value: `${brandAppearanceRate}%`,
      trend: previousScores.length === 0 ? "暂无上期对比" : signed(brandAppearanceRate - previousAppearanceRate, "%"),
      helper: "当前批次中命中客户品牌的回答比例",
      tone: "emerald",
    },
    {
      label: "TOP3 出现率",
      value: `${top3Rate}%`,
      trend: previousScores.length === 0 ? "暂无上期对比" : signed(top3Rate - previousTop3Rate, "%"),
      helper: "客户品牌进入推荐前三的比例",
      tone: "cyan",
    },
    {
      label: "引用来源数",
      value: String(citationCount),
      trend: previousScores.length === 0 ? "暂无上期对比" : signed(citationCount - previousCitationCount),
      helper: "有效 URL 去重后的引用来源",
      tone: "amber",
    },
    {
      label: "监测关键词数",
      value: String(uniqueCount(scores.map((score) => score.keyword.id)) || keywordTotal),
      trend: `${uniqueCount(scores.map((score) => score.platform))} 个平台`,
      helper: "当前筛选条件覆盖的关键词",
      tone: "slate",
    },
  ] as const;
}

function topByScore(scores: GeoScoreItem[], keyFor: (score: GeoScoreItem) => string) {
  const grouped = new Map<string, number[]>();

  for (const score of scores) {
    const key = keyFor(score);
    grouped.set(key, [...(grouped.get(key) ?? []), score.totalScore]);
  }

  return Array.from(grouped.entries())
    .map(([label, values]) => ({ label, score: average(values), count: values.length }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
}

function buildCoverage(scores: GeoScoreItem[], labelFor: (score: GeoScoreItem) => string, valueFor: (score: GeoScoreItem) => string, total: number) {
  const grouped = new Map<string, Set<string>>();
  const scoreMap = new Map<string, number[]>();

  for (const score of scores) {
    const label = labelFor(score);
    grouped.set(label, grouped.get(label) ?? new Set<string>());
    grouped.get(label)?.add(valueFor(score));
    scoreMap.set(label, [...(scoreMap.get(label) ?? []), score.totalScore]);
  }

  return Array.from(grouped.entries())
    .map(([label, values]) => ({
      label,
      value: percentage(values.size, Math.max(total, 1)),
      helper: `${values.size}/${Math.max(total, 1)} · 均分 ${average(scoreMap.get(label) ?? [])}`,
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 8);
}

function buildIntentPerformance(scores: GeoScoreItem[]): IntentPerformanceItem[] {
  const grouped = new Map<string, GeoScoreItem[]>();

  for (const score of scores) {
    const label = intentLabels[score.keyword.intent] ?? score.keyword.intent;
    grouped.set(label, [...(grouped.get(label) ?? []), score]);
  }

  return Array.from(grouped.entries())
    .map(([label, items]) => ({
      label,
      score: average(items.map((item) => item.totalScore)),
      appearanceRate: percentage(items.filter((item) => item.visibilityScore > 0).length, items.length),
      sampleCount: items.length,
    }))
    .sort((left, right) => right.score - left.score);
}

async function loadShareOfVoice(filters: FilterState, dateWhere: { gte?: Date; lte?: Date } | undefined): Promise<ShareOfVoiceItem[]> {
  const scopedBrands = await prisma.brand.findMany({
    where: {
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.brandId ? { id: filters.brandId } : {}),
      ...(filters.industry ? { client: { industry: filters.industry } } : {}),
    },
    include: {
      competitors: { select: { name: true } },
    },
  });

  const entities = scopedBrands.flatMap((brand) => [
    { label: brand.name, type: "客户品牌" as const },
    ...brand.competitors.map((competitor) => ({ label: competitor.name, type: "竞品" as const })),
  ]);
  const uniqueEntities = entities.filter(
    (entity, index) => entities.findIndex((item) => normalizeName(item.label) === normalizeName(entity.label)) === index,
  );
  if (uniqueEntities.length === 0) return [];

  const analyses = await prisma.answerAnalysis.findMany({
    where: {
      ...(filters.platform ? { platform: filters.platform } : {}),
      ...(dateWhere ? { createdAt: dateWhere } : {}),
    },
    include: {
      rankedBrands: { select: { brand: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const counts = new Map<string, number>();
  for (const analysis of analyses) {
    const candidates = Array.from(
      new Set([
        ...analysis.brandsFound,
        ...analysis.competitors,
        ...analysis.rankedBrands.map((ranked) => ranked.brand),
      ]),
    );
    const matchedThisAnswer = new Set<string>();

    for (const candidate of candidates) {
      const entity = uniqueEntities.find((item) => isNameMatch(candidate, item.label));
      if (entity) matchedThisAnswer.add(entity.label);
    }

    for (const label of matchedThisAnswer) {
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }

  const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
  return uniqueEntities
    .map((entity) => {
      const count = counts.get(entity.label) ?? 0;
      return {
        ...entity,
        count,
        value: percentage(count, total),
      };
    })
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);
}

function buildRunTrend(
  runScores: GeoScoreItem[],
  runs: Array<{ id: string; startedAt: Date }>,
  filters: FilterState,
) {
  return runs
    .slice()
    .reverse()
    .map((run) => {
      const scores = filterScores(
        runScores.filter((score) => score.runId === run.id),
        filters,
      );
      return {
        label: new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(run.startedAt),
        value: average(scores.map((score) => score.totalScore)),
      };
    });
}

async function loadDashboard(filters: FilterState) {
  const selectedRun = filters.runId
    ? await prisma.geoScoreRun.findUnique({ where: { id: filters.runId } })
    : await prisma.geoScoreRun.findFirst({
        where: { status: "COMPLETED" },
        orderBy: { startedAt: "desc" },
      });
  const previousRun = selectedRun
    ? await prisma.geoScoreRun.findFirst({
        where: {
          status: "COMPLETED",
          startedAt: { lt: selectedRun.startedAt },
        },
        orderBy: { startedAt: "desc" },
      })
    : null;
  const latestRuns = await prisma.geoScoreRun.findMany({
    where: { status: "COMPLETED" },
    orderBy: { startedAt: "desc" },
    take: 8,
  });
  const dateWhere = dateRangeWhere(filters);
  const scoreWhere = {
    ...(selectedRun ? { runId: selectedRun.id } : {}),
    ...(filters.platform ? { platform: filters.platform } : {}),
    ...(dateWhere ? { createdAt: dateWhere } : {}),
  };
  const previousScoreWhere = {
    ...(previousRun ? { runId: previousRun.id } : { runId: "__none__" }),
    ...(filters.platform ? { platform: filters.platform } : {}),
    ...(dateWhere ? { createdAt: dateWhere } : {}),
  };
  const trendRunIds = latestRuns.map((run) => run.id);

  const [options, rawScores, rawPreviousScores, trendScores, keywordTotal] = await Promise.all([
    loadOptions(),
    prisma.geoScore.findMany({
      where: scoreWhere,
      include: {
        brand: { select: { id: true, name: true, client: { select: { id: true, name: true, industry: true } } } },
        keyword: { select: { id: true, text: true, intent: true } },
        answerAnalysis: { select: { id: true, citationUrls: true, confidenceScore: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.geoScore.findMany({
      where: previousScoreWhere,
      include: {
        brand: { select: { id: true, name: true, client: { select: { id: true, name: true, industry: true } } } },
        keyword: { select: { id: true, text: true, intent: true } },
        answerAnalysis: { select: { id: true, citationUrls: true, confidenceScore: true } },
      },
    }),
    trendRunIds.length === 0
      ? Promise.resolve([])
      : prisma.geoScore.findMany({
          where: {
            runId: { in: trendRunIds },
            ...(filters.platform ? { platform: filters.platform } : {}),
            ...(dateWhere ? { createdAt: dateWhere } : {}),
          },
          include: {
            brand: { select: { id: true, name: true, client: { select: { id: true, name: true, industry: true } } } },
            keyword: { select: { id: true, text: true, intent: true } },
            answerAnalysis: { select: { id: true, citationUrls: true, confidenceScore: true } },
          },
        }),
    prisma.keyword.count({ where: { active: true } }),
  ]);

  const scores = filterScores(rawScores, filters);
  const previousScores = filterScores(rawPreviousScores, filters);
  const trend = buildRunTrend(trendScores, latestRuns, filters);
  const shareOfVoice = await loadShareOfVoice(filters, dateWhere);
  const platformTotal = Math.max(uniqueCount(options.platforms.map((platform) => platform.name)), 1);
  const visibleKeywordTotal = Math.max(keywordTotal, uniqueCount(scores.map((score) => score.keyword.id)), 1);

  return {
    selectedRun,
    previousRun,
    options,
    scores,
    metrics: buildMetricCards(scores, previousScores, keywordTotal),
    trend,
    keywordCoverage: buildCoverage(scores, (score) => score.keyword.text, (score) => score.platform, platformTotal),
    platformCoverage: buildCoverage(scores, (score) => score.platform, (score) => score.keyword.id, visibleKeywordTotal),
    topKeywords: topByScore(scores, (score) => score.keyword.text),
    topPlatforms: topByScore(scores, (score) => score.platform),
    shareOfVoice,
    intentPerformance: buildIntentPerformance(scores),
  };
}

async function loadOptions(): Promise<OptionData> {
  const [clients, brands, platforms, runs] = await Promise.all([
    prisma.client.findMany({ select: { id: true, name: true, industry: true }, orderBy: { name: "asc" } }),
    prisma.brand.findMany({ select: { id: true, name: true, clientId: true }, orderBy: { name: "asc" } }),
    prisma.aiPlatform.findMany({ select: { id: true, name: true }, where: { enabled: true }, orderBy: { name: "asc" } }),
    prisma.geoScoreRun.findMany({
      select: { id: true, source: true, status: true, startedAt: true, completedAt: true },
      orderBy: { startedAt: "desc" },
      take: 20,
    }),
  ]);
  return {
    clients,
    brands,
    platforms,
    runs,
    industries: Array.from(new Set(clients.map((client) => client.industry))).sort(),
  };
}

function MetricCard({
  metric,
}: {
  metric: { label: string; value: string; trend: string; helper: string; tone: "violet" | "emerald" | "cyan" | "amber" | "slate" };
}) {
  const toneClass = {
    violet: "text-violet-700 bg-violet-50",
    emerald: "text-emerald-700 bg-emerald-50",
    cyan: "text-cyan-700 bg-cyan-50",
    amber: "text-amber-700 bg-amber-50",
    slate: "text-slate-700 bg-slate-100",
  }[metric.tone];

  return (
    <div className="rounded border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{metric.label}</p>
        <span className={`rounded px-2 py-1 text-xs font-semibold ${toneClass}`}>{metric.trend}</span>
      </div>
      <p className="mt-3 text-4xl font-semibold text-slate-950">{metric.value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{metric.helper}</p>
    </div>
  );
}

function FilterForm({ filters, options }: { filters: FilterState; options: OptionData }) {
  return (
    <form className="rounded border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <label>
          <span className="text-sm font-medium text-slate-700">客户</span>
          <select name="clientId" defaultValue={filters.clientId} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">全部客户</option>
            {options.clients.map((client) => (
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
            {options.brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">行业</span>
          <select name="industry" defaultValue={filters.industry} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">全部行业</option>
            {options.industries.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">平台</span>
          <select name="platform" defaultValue={filters.platform} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">全部平台</option>
            {options.platforms.map((platform) => (
              <option key={platform.id} value={platform.name}>
                {platform.name}
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
        <label className="md:col-span-2 xl:col-span-3">
          <span className="text-sm font-medium text-slate-700">评分批次</span>
          <select name="runId" defaultValue={filters.runId} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">最新完成批次</option>
            {options.runs.map((run) => (
              <option key={run.id} value={run.id}>
                {dateText(run.completedAt ?? run.startedAt)} · {run.source} · {run.status}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-3 md:col-span-3">
          <button type="submit" className="rounded bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800">
            应用筛选
          </button>
          <Link href="/" className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            重置
          </Link>
        </div>
      </div>
    </form>
  );
}

function LineChart({ points }: { points: TrendPoint[] }) {
  const width = 640;
  const height = 220;
  const padding = 28;
  const max = Math.max(100, ...points.map((point) => point.value));
  const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
  const coordinates = points.map((point, index) => {
    const x = padding + index * stepX;
    const y = height - padding - (point.value / max) * (height - padding * 2);
    return { ...point, x, y };
  });
  const polyline = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${padding},${height - padding} ${polyline} ${width - padding},${height - padding}`;

  return (
    <div className="overflow-hidden rounded border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">GEO Score 趋势图</h2>
      <p className="mt-1 text-sm text-slate-500">按最近评分批次展示平均分走势</p>
      {points.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">暂无评分批次。</p>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="GEO Score 趋势图" className="mt-4 h-64 w-full">
          <polygon points={area} fill="#ecfeff" />
          <polyline points={polyline} fill="none" stroke="#0891b2" strokeWidth="3" strokeLinecap="round" />
          {coordinates.map((point, index) => (
            <g key={`${point.label}-${index}-${point.x}`}>
              <circle cx={point.x} cy={point.y} r="4" fill="#0f172a" />
              <text x={point.x} y={height - 8} textAnchor="middle" className="fill-slate-500 text-[11px]">
                {point.label}
              </text>
              <text x={point.x} y={Math.max(16, point.y - 10)} textAnchor="middle" className="fill-slate-700 text-[11px]">
                {point.value}
              </text>
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

function CoverageChart({ title, description, bars }: { title: string; description: string; bars: CoverageBar[] }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-5 space-y-4">
        {bars.length === 0 ? (
          <p className="text-sm text-slate-500">暂无可视化数据，请调整筛选或重算 GEO Score。</p>
        ) : (
          bars.map((bar) => (
            <div key={bar.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium text-slate-800">{bar.label}</span>
                <span className="font-semibold text-slate-950">{bar.value}%</span>
              </div>
              <div className="h-2 rounded bg-slate-100">
                <div className="h-2 rounded bg-cyan-600" style={{ width: `${Math.min(100, bar.value)}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-500">{bar.helper}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ShareOfVoiceChart({ items }: { items: ShareOfVoiceItem[] }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">竞品 Share of Voice</h2>
      <p className="mt-1 text-sm text-slate-500">统计客户品牌与竞品在 AI 回答推荐名单中的出现份额</p>
      <div className="mt-5 space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">暂无可计算的品牌/竞品声量数据。</p>
        ) : (
          items.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium text-slate-800">
                  {item.label}
                  <span className="ml-2 text-xs text-slate-400">{item.type}</span>
                </span>
                <span className="font-semibold text-slate-950">{item.value}%</span>
              </div>
              <div className="h-2 rounded bg-slate-100">
                <div
                  className={`h-2 rounded ${item.type === "客户品牌" ? "bg-emerald-600" : "bg-slate-500"}`}
                  style={{ width: `${Math.min(100, item.value)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">出现 {item.count} 次</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function IntentPerformanceChart({ items }: { items: IntentPerformanceItem[] }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">意图分类表现</h2>
      <p className="mt-1 text-sm text-slate-500">按关键词意图聚合 GEO Score 和品牌出现率</p>
      <div className="mt-5 space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">暂无意图分类数据。</p>
        ) : (
          items.map((item) => (
            <div key={item.label} className="rounded border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-slate-900">{item.label}</p>
                <span className="rounded bg-white px-2 py-1 text-sm font-semibold text-slate-800">{item.score}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                品牌出现率 {item.appearanceRate}% · {item.sampleCount} 条样本
              </p>
              <div className="mt-2 h-2 rounded bg-white">
                <div className="h-2 rounded bg-cyan-600" style={{ width: `${Math.min(100, item.appearanceRate)}%` }} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ScoreList({ title, items }: { title: string; items: Array<{ label: string; score: number; count: number }> }) {
  return (
    <div className="rounded border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      </div>
      <div className="divide-y divide-slate-100">
        {items.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">暂无数据。</p>
        ) : (
          items.map((item) => (
            <div key={item.label} className="px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <p className="min-w-0 truncate font-medium text-slate-950">{item.label}</p>
                <span className="rounded bg-slate-100 px-2 py-1 text-sm font-semibold text-slate-800">{item.score}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{item.count} 条评分记录</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default async function Dashboard({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseFilters(await searchParams);
  const data = await loadDashboard(filters);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-700">数据看板</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-950">GEO AI 搜索可见度监测平台</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            支持客户、品牌、行业、平台和时间范围筛选，默认展示最新完成的 GEO Score 评分批次。
          </p>
          <p className="mt-2 text-xs text-slate-500">
            当前批次：{data.selectedRun ? `${dateText(data.selectedRun.completedAt ?? data.selectedRun.startedAt)} · ${data.selectedRun.source}` : "暂无评分批次"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RecalculateGeoScoreButton />
          <GenerateOptimizationTasksButton />
          <Link
            href="/optimization-tasks"
            className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            查看优化任务
          </Link>
          <Link
            href="/client-view"
            className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            查看客户视图
          </Link>
        </div>
      </header>

      <FilterForm filters={filters} options={data.options} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {data.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
        <LineChart points={data.trend} />
        <CoverageChart title="平台覆盖率图" description="各 AI 平台覆盖的监测关键词比例" bars={data.platformCoverage} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ShareOfVoiceChart items={data.shareOfVoice} />
        <IntentPerformanceChart items={data.intentPerformance} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <CoverageChart title="关键词覆盖率图" description="每个关键词被不同 AI 平台覆盖的比例" bars={data.keywordCoverage} />
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-1">
          <ScoreList title="高分关键词" items={data.topKeywords} />
          <ScoreList title="高分平台" items={data.topPlatforms} />
        </div>
      </section>

      <section className="rounded border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">最近 GEO Score 明细</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">客户</th>
                <th className="px-5 py-3 font-semibold">品牌</th>
                <th className="px-5 py-3 font-semibold">关键词</th>
                <th className="px-5 py-3 font-semibold">平台</th>
                <th className="px-5 py-3 font-semibold">置信度</th>
                <th className="px-5 py-3 font-semibold">GEO Score</th>
                <th className="px-5 py-3 font-semibold">计算时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.scores.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-500">
                    当前筛选条件下暂无评分记录。可以调整筛选条件，或点击“一键重算 GEO Score”。
                  </td>
                </tr>
              ) : (
                data.scores.slice(0, 12).map((score) => (
                  <tr key={score.id}>
                    <td className="px-5 py-4 text-slate-600">{score.brand.client.name}</td>
                    <td className="px-5 py-4 text-slate-900">{score.brand.name}</td>
                    <td className="px-5 py-4 text-slate-600">{score.keyword.text}</td>
                    <td className="px-5 py-4 text-slate-600">{score.platform}</td>
                    <td className="px-5 py-4 text-slate-600">{Math.round((score.answerAnalysis?.confidenceScore ?? 0) * 100)}%</td>
                    <td className="px-5 py-4 font-semibold text-slate-950">{score.totalScore}</td>
                    <td className="px-5 py-4 text-slate-500">{dateText(score.createdAt)}</td>
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
