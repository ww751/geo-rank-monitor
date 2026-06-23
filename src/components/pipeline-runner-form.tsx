"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ClientOption = { id: string; name: string; industry: string };
type BrandOption = { id: string; name: string; clientId: string };
type KeywordOption = { id: string; text: string; brandId: string | null };
type PlatformOption = { id: string; name: string };

type PipelineStep = {
  step: string;
  status: string;
  detail: string;
  at: string;
};

type RunResponse = {
  success?: boolean;
  data?: {
    pipelineRun?: { id: string; steps?: PipelineStep[] };
    rankResult?: { rankPosition: number | null; brandMentioned: boolean; visibilityScore: number };
    optimizationTasks?: { created: number; skipped: number };
  };
  error?: string;
};

export function PipelineRunnerForm({
  clients,
  brands,
  keywords,
  platforms,
}: {
  clients: ClientOption[];
  brands: BrandOption[];
  keywords: KeywordOption[];
  platforms: PlatformOption[];
}) {
  const router = useRouter();
  const doubao = platforms.find((platform) => platform.name === "Doubao") ?? platforms[0];
  const firstClient = clients[0];
  const [clientId, setClientId] = useState(firstClient?.id ?? "");
  const [brandId, setBrandId] = useState(brands.find((brand) => brand.clientId === firstClient?.id)?.id ?? brands[0]?.id ?? "");
  const [keywordId, setKeywordId] = useState(keywords.find((keyword) => keyword.brandId === brandId)?.id ?? keywords[0]?.id ?? "");
  const [platformId, setPlatformId] = useState(doubao?.id ?? "");
  const [collectionMode, setCollectionMode] = useState<"mock" | "real">("mock");
  const [loading, setLoading] = useState<"normal" | "quick" | null>(null);
  const [result, setResult] = useState<RunResponse | null>(null);

  const visibleBrands = useMemo(
    () => (clientId ? brands.filter((brand) => brand.clientId === clientId) : brands),
    [brands, clientId],
  );
  const visibleKeywords = useMemo(
    () => (brandId ? keywords.filter((keyword) => !keyword.brandId || keyword.brandId === brandId) : keywords),
    [keywords, brandId],
  );

  function updateClient(nextClientId: string) {
    setClientId(nextClientId);
    const nextBrand = brands.find((brand) => brand.clientId === nextClientId) ?? brands[0];
    setBrandId(nextBrand?.id ?? "");
    const nextKeyword = keywords.find((keyword) => keyword.brandId === nextBrand?.id) ?? keywords[0];
    setKeywordId(nextKeyword?.id ?? "");
  }

  async function run(quickTest = false) {
    setLoading(quickTest ? "quick" : "normal");
    setResult(null);
    try {
      const response = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          quickTest
            ? { quickTest: true, collectionMode }
            : { clientId, brandId, keywordId, platformId, collectionMode },
        ),
      });
      const body = (await response.json()) as RunResponse;
      if (!response.ok || body.success === false) throw new Error(body.error ?? "流水线执行失败");
      setResult(body);
      router.refresh();
    } catch (error) {
      setResult({ success: false, error: error instanceof Error ? error.message : "流水线执行失败" });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">单条实操测试</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            先用模拟采集确认完整链路，再切换到 Doubao 真实采集。真实采集遇到验证码时，系统会记录失败原因，不会绕过验证。
          </p>
        </div>
        <button
          type="button"
          onClick={() => void run(true)}
          disabled={loading !== null}
          className="rounded bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "quick" ? "测试中..." : "一键跑章丘测试"}
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label>
          <span className="text-sm font-medium text-slate-700">客户</span>
          <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" value={clientId} onChange={(event) => updateClient(event.target.value)}>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} / {client.industry}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">品牌</span>
          <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" value={brandId} onChange={(event) => setBrandId(event.target.value)}>
            {visibleBrands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">关键词</span>
          <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" value={keywordId} onChange={(event) => setKeywordId(event.target.value)}>
            {visibleKeywords.map((keyword) => (
              <option key={keyword.id} value={keyword.id}>
                {keyword.text}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">平台</span>
          <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" value={platformId} onChange={(event) => setPlatformId(event.target.value)}>
            {platforms.map((platform) => (
              <option key={platform.id} value={platform.id}>
                {platform.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">采集模式</span>
          <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" value={collectionMode} onChange={(event) => setCollectionMode(event.target.value as "mock" | "real")}>
            <option value="mock">模拟采集</option>
            <option value="real">Doubao 真实采集</option>
          </select>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void run(false)}
          disabled={loading !== null || !brandId || !keywordId || !platformId}
          className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "normal" ? "运行中..." : "运行所选链路"}
        </button>
        <span className="self-center text-sm text-slate-500">
          模拟模式用于演示闭环；真实模式会打开/控制平台页面，可能需要人工处理验证码。
        </span>
      </div>

      {result ? (
        <div className={`mt-5 rounded border p-4 text-sm ${result.success === false ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
          {result.success === false ? (
            <p>{result.error}</p>
          ) : (
            <div className="space-y-2">
              <p className="font-semibold">流水线已完成：{result.data?.pipelineRun?.id}</p>
              <p>
                监测结果：
                {result.data?.rankResult?.brandMentioned ? `品牌出现，排名 ${result.data.rankResult.rankPosition ?? "未明确"}` : "品牌未出现"}，
                可见度 {result.data?.rankResult?.visibilityScore ?? 0}
              </p>
              <p>
                优化任务：新建 {result.data?.optimizationTasks?.created ?? 0} 条，跳过 {result.data?.optimizationTasks?.skipped ?? 0} 条
              </p>
              <ol className="mt-2 space-y-1">
                {result.data?.pipelineRun?.steps?.map((step) => (
                  <li key={`${step.step}-${step.at}`}>
                    {step.step}：{step.detail}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
