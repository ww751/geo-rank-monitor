"use client";

import { FormEvent, useState } from "react";

type Keyword = {
  id: string;
  text: string;
};

type Cluster = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  keywords: Keyword[];
};

type GeneratorResult = {
  city: string;
  industry: string;
  total: number;
  clusters: Cluster[];
};

export function KeywordGeneratorClient() {
  const [city, setCity] = useState("济南");
  const [industry, setIndustry] = useState("装修");
  const [result, setResult] = useState<GeneratorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/keyword-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, industry }),
      });

      const payload = (await response.json()) as { data?: GeneratorResult; error?: string };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "生成失败");
      }
      setResult(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-sm font-semibold text-cyan-700">关键词生成器</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">GEO AI 搜索可见度监测平台</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          输入城市和行业，系统会按排名类、推荐类、对比类、价格类、避坑类、案例类自动生成 GEO 监测问题，并保存到关键词库。
        </p>
      </header>

      <section className="rounded border border-slate-200 bg-white shadow-sm">
        <form onSubmit={submit} className="grid gap-4 p-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label>
            <span className="text-sm font-medium text-slate-700">城市</span>
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              required
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              placeholder="例如：济南"
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">行业</span>
            <input
              value={industry}
              onChange={(event) => setIndustry(event.target.value)}
              required
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              placeholder="例如：装修"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "生成中..." : "生成关键词"}
          </button>
        </form>
      </section>

      {error ? <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

      {result ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">
                {result.city} · {result.industry}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                已生成并保存 {result.clusters.length} 个关键词簇，共 {result.total} 条监测问题。
              </p>
            </div>
            <a
              href="/keywords"
              className="inline-flex items-center justify-center rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
            >
              查看关键词库
            </a>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {result.clusters.map((cluster) => (
              <article key={cluster.id} className="rounded border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-slate-950">{cluster.category}</h3>
                    <span className="rounded bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-800">
                      {cluster.keywords.length} 条
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{cluster.description}</p>
                </div>
                <ol className="grid gap-x-5 gap-y-2 p-5 text-sm text-slate-700 sm:grid-cols-2">
                  {cluster.keywords.map((keyword, index) => (
                    <li key={keyword.id} className="flex gap-2">
                      <span className="w-6 shrink-0 text-right text-slate-400">{index + 1}.</span>
                      <span>{keyword.text}</span>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
