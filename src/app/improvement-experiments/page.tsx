import Link from "next/link";
import { GenerateImprovementReportButton } from "@/components/generate-improvement-report-button";
import { RealValidationButton } from "@/components/real-validation-button";
import { SyncImprovementExperimentsButton } from "@/components/sync-improvement-experiments-button";
import { formatRank, improvementOutcome, rankLiftLabel, scoreLiftLabel } from "@/lib/improvement-experiment-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  PLANNED: "计划中",
  BASELINE_COLLECTED: "已采集优化前",
  OPTIMIZATION_REPLAYED: "已完成复盘测试",
  REAL_VALIDATED: "已真实复测",
  COMPLETED: "已完成",
};

function statusClass(status: string) {
  if (status === "REAL_VALIDATED" || status === "COMPLETED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "OPTIMIZATION_REPLAYED") return "border-cyan-200 bg-cyan-50 text-cyan-700";
  if (status === "BASELINE_COLLECTED") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function formatDate(value: Date | null | undefined) {
  return value ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "short" }).format(value) : "-";
}

function signed(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

export default async function ImprovementExperimentsPage() {
  const [experiments, taskCount] = await Promise.all([
    prisma.improvementExperiment.findMany({
      include: {
        brand: { include: { client: true } },
        keyword: true,
        platform: true,
        optimizationTask: {
          include: {
            contentAssets: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
        baselineRankResult: true,
        replayRankResult: true,
        validationRankResult: true,
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.optimizationTask.count({ where: { keywordId: { not: null } } }),
  ]);

  const replayed = experiments.filter((experiment) => experiment.replayScore !== null);
  const realValidated = experiments.filter((experiment) => experiment.validationRankResultId);
  const averageReplayLift =
    replayed.length > 0
      ? Math.round(
          replayed.reduce((sum, experiment) => sum + ((experiment.replayScore ?? 0) - experiment.baselineScore), 0) /
            replayed.length,
        )
      : 0;
  const topReplay = replayed
    .map((experiment) => ({
      experiment,
      lift: (experiment.replayScore ?? 0) - experiment.baselineScore,
    }))
    .sort((left, right) => right.lift - left.lift)[0];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-700">GEO 提升验证</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">真实提升实验</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            把“真实采集基线、优化动作、复盘测试、后续真实复测”串成一个可演示闭环。复盘测试只验证系统推演效果，
            真实排名提升需要内容和引用建设落地后再采集确认。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SyncImprovementExperimentsButton />
          <Link
            href="/pipeline-runner"
            className="rounded border border-cyan-700 px-4 py-2 text-sm font-semibold text-cyan-800 hover:bg-cyan-50"
          >
            去真实复测
          </Link>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          ["可同步优化任务", taskCount],
          ["实验总数", experiments.length],
          ["已完成复盘测试", replayed.length],
          ["真实复测完成", realValidated.length],
        ].map(([label, value]) => (
          <div key={label} className="rounded border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">平均复盘提分</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{signed(averageReplayLift)}</p>
          <p className="mt-2 text-sm text-slate-500">基于已运行 `optimization-replay` 的实验样本。</p>
        </div>
        <div className="rounded border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <p className="text-sm font-semibold text-slate-500">当前最明显提升样本</p>
          {topReplay ? (
            <div className="mt-3">
              <p className="text-lg font-semibold text-slate-950">
                {topReplay.experiment.brand.name} / {topReplay.experiment.keyword.text}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                排名：{rankLiftLabel(topReplay.experiment.baselineRank, topReplay.experiment.replayRank)}，GEO Score：
                {scoreLiftLabel(topReplay.experiment.baselineScore, topReplay.experiment.replayScore)}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">还没有复盘测试结果。请先在优化任务页运行一次复盘测试。</p>
          )}
        </div>
      </section>

      <section className="rounded border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <p className="font-semibold">实验判断标准</p>
        <p>
          “复盘测试提升”用于证明系统能给出可执行优化路径；“真实复测提升”才代表 Doubao/Kimi/Tongyi/Yuanbao
          的自然回答发生变化。客户交付时建议同时展示两列，避免把推演结果包装成真实排名结果。
        </p>
      </section>

      <section className="space-y-4">
        {experiments.length === 0 ? (
          <div className="rounded border border-slate-200 bg-white p-8 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">还没有真实提升实验。</p>
            <p className="mt-2">
              点击“同步提升实验”，系统会把已有优化任务、内容草稿、复盘测试结果整理成实验记录。
            </p>
          </div>
        ) : (
          experiments.map((experiment) => {
            const content = experiment.optimizationTask?.contentAssets[0];
            const validatedScore = experiment.validationScore ?? experiment.validationRankResult?.visibilityScore ?? null;
            const outcome = improvementOutcome(experiment);
            return (
              <article key={experiment.id} className="rounded border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded border px-2 py-1 text-xs font-semibold ${statusClass(experiment.status)}`}>
                        {statusLabels[experiment.status]}
                      </span>
                      <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
                        {experiment.platform.name}
                      </span>
                    </div>
                    <h2 className="mt-3 text-lg font-semibold text-slate-950">
                      {experiment.brand.name} / {experiment.keyword.text}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">{experiment.brand.client.name}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {experiment.optimizationTaskId ? (
                      <SyncImprovementExperimentsButton taskId={experiment.optimizationTaskId} />
                    ) : null}
                    <RealValidationButton experimentId={experiment.id} />
                    <GenerateImprovementReportButton experimentId={experiment.id} />
                  </div>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-3">
                  <div className="rounded border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-500">1. 优化前真实采集</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{formatRank(experiment.baselineRank)}</p>
                    <p className="mt-1 text-sm text-slate-500">GEO Score：{experiment.baselineScore}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDate(experiment.baselineRankResult?.sampledAt)}
                    </p>
                  </div>
                  <div className="rounded border border-cyan-200 bg-cyan-50 p-4">
                    <p className="text-xs font-semibold text-cyan-700">2. 优化复盘测试</p>
                    <p className="mt-2 text-2xl font-semibold text-cyan-950">{formatRank(experiment.replayRank)}</p>
                    <p className="mt-1 text-sm text-cyan-800">
                      GEO Score：{experiment.replayScore ?? "待测试"}
                    </p>
                    <p className="mt-1 text-xs text-cyan-700">
                      {formatDate(experiment.replayRankResult?.sampledAt)}
                    </p>
                  </div>
                  <div className="rounded border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold text-emerald-700">3. 后续真实复测</p>
                    <p className="mt-2 text-2xl font-semibold text-emerald-950">
                      {formatRank(experiment.validationRank)}
                    </p>
                    <p className="mt-1 text-sm text-emerald-800">
                      GEO Score：{validatedScore ?? "待真实复测"}
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">
                      {formatDate(experiment.validationRankResult?.sampledAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded border border-slate-200 p-4">
                    <p className="text-xs font-semibold text-slate-500">提升假设</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{experiment.hypothesis}</p>
                  </div>
                  <div className="rounded border border-slate-200 p-4">
                    <p className="text-xs font-semibold text-slate-500">实质提升判定</p>
                    <p className={`mt-2 text-sm font-semibold ${outcome.improved ? "text-emerald-700" : "text-amber-700"}`}>
                      {outcome.label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{experiment.nextStep}</p>
                  </div>
                </div>

                {content ? (
                  <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-semibold text-emerald-900">关联内容资产：{content.title}</p>
                    {content.impactNotes ? (
                      <p className="mt-2 text-sm leading-6 text-emerald-800">{content.impactNotes}</p>
                    ) : null}
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
