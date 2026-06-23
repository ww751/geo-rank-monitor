"use client";

import { FormEvent, useState } from "react";

type RankedBrand = {
  id: string;
  brand: string;
  rank: number;
};

type RankingTrace = {
  rank: number;
  brand: string;
  sourceText: string;
  reason: string;
};

type ExtractionTrace = {
  ruleVersion: string;
  brandRules: Array<{ brand: string; reason: string }>;
  filteredRules: Array<{ candidate: string; reason: string }>;
  urlRules: Array<{ url: string; reason: string }>;
  rankRules: Array<{ brand: string; position: number; reason: string }>;
};

type AnalysisResult = {
  id: string;
  platform: string;
  keyword: string;
  brandsFound: string[];
  filteredBrands: string[];
  rawCandidates: string[];
  clientFound: boolean;
  clientRank: number | null;
  competitors: string[];
  citationUrls: string[];
  ruleVersion: string;
  confidenceScore: number;
  extractionTrace: ExtractionTrace;
  rankedBrands: RankedBrand[];
  rankingTrace: RankingTrace[];
};

const defaultAnswer =
  "济南装修公司排名 TOP10 推荐名单如下：\n1. 万泰装饰，本地老牌装修公司。\n2. 业之峰，全国连锁品牌。\n3. 圣都整装，整装交付能力较强。\n4. 城市人家装饰，本地案例较多。\n选择时还要看高端设计、空间设计、施工工艺和设计理念。\n参考：https://example.com/jinan-ranking";

function TagList({
  values,
  emptyText,
  tone = "slate",
}: {
  values: string[];
  emptyText: string;
  tone?: "slate" | "cyan" | "amber";
}) {
  if (values.length === 0) {
    return <p className="text-sm text-slate-500">{emptyText}</p>;
  }

  const colorClass =
    tone === "cyan"
      ? "bg-cyan-50 text-cyan-800"
      : tone === "amber"
        ? "bg-amber-50 text-amber-800"
        : "bg-slate-100 text-slate-700";

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span key={value} className={`rounded px-2.5 py-1 text-sm font-medium ${colorClass}`}>
          {value}
        </span>
      ))}
    </div>
  );
}

function RankingTable({ rankedBrands }: { rankedBrands: RankedBrand[] }) {
  if (rankedBrands.length === 0) {
    return <p className="text-sm text-slate-500">未识别到明确推荐排名。</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[360px] text-left text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">排名</th>
            <th className="px-4 py-3 font-semibold">品牌</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rankedBrands.map((item) => (
            <tr key={item.id}>
              <td className="px-4 py-3 font-semibold text-slate-950">第 {item.rank} 名</td>
              <td className="px-4 py-3 text-slate-700">{item.brand}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AnswerAnalyzerClient() {
  const [platform, setPlatform] = useState("Kimi");
  const [keyword, setKeyword] = useState("济南装修公司排名");
  const [answer, setAnswer] = useState(defaultAnswer);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const analysisResponse = await fetch("/api/answer-analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, keyword, answer }),
      });
      const analysisPayload = (await analysisResponse.json()) as { data?: Omit<AnalysisResult, "rankedBrands">; error?: string };

      if (!analysisResponse.ok || !analysisPayload.data) {
        throw new Error(analysisPayload.error ?? "分析失败");
      }

      const rankingResponse = await fetch("/api/ranking-extractor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answerAnalysisId: analysisPayload.data.id }),
      });
      const rankingPayload = (await rankingResponse.json()) as {
        data?: { rankedBrands: RankedBrand[]; rankingTrace: RankingTrace[] };
        error?: string;
      };

      if (!rankingResponse.ok || !rankingPayload.data) {
        throw new Error(rankingPayload.error ?? "排名提取失败");
      }

      setResult({
        ...analysisPayload.data,
        rankedBrands: rankingPayload.data.rankedBrands,
        rankingTrace: rankingPayload.data.rankingTrace,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-sm font-semibold text-cyan-700">AI 回答分析器</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">GEO AI 搜索可见度监测平台</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          粘贴 AI 平台回答，系统会识别品牌、客户品牌是否出现、客户排名、竞品、引用来源，并提取真实推荐排名。
        </p>
      </header>

      <section className="rounded border border-slate-200 bg-white shadow-sm">
        <form onSubmit={submit} className="grid gap-4 p-5 md:grid-cols-2">
          <label>
            <span className="text-sm font-medium text-slate-700">
              AI 平台（请使用英文，例如 Doubao、Kimi、Tongyi、Yuanbao）
            </span>
            <input
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
              required
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              placeholder="例如：Kimi"
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">监测关键词</span>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              required
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              placeholder="例如：济南装修公司排名"
            />
          </label>
          <label className="md:col-span-2">
            <span className="text-sm font-medium text-slate-700">AI 回答原文</span>
            <textarea
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              required
              className="mt-1 min-h-52 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              placeholder="例如：1. 万泰装饰... 2. 业之峰... 参考：https://example.com"
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "分析中..." : "分析并保存"}
            </button>
          </div>
        </form>
      </section>

      {error ? <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

      {result ? (
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">客户品牌是否出现</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{result.clientFound ? "是" : "否"}</p>
            <p className="mt-2 text-sm text-slate-500">
              客户排名：{result.clientRank ? `第 ${result.clientRank} 位` : "未识别"}
            </p>
            <p className="mt-2 text-sm text-slate-500">置信度：{Math.round(result.confidenceScore * 100)}%</p>
            <p className="mt-1 text-xs text-slate-400">规则版本：{result.ruleVersion}</p>
          </div>
          <div className="rounded border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <p className="text-sm font-medium text-slate-500">排名提取结果</p>
            <div className="mt-3">
              <RankingTable rankedBrands={result.rankedBrands} />
            </div>
          </div>
          <div className="rounded border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <p className="text-sm font-medium text-slate-500">识别到的品牌</p>
            <div className="mt-3">
              <TagList values={result.brandsFound} emptyText="未识别到品牌" tone="cyan" />
            </div>
          </div>
          <div className="rounded border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">识别到的竞品</p>
            <div className="mt-3">
              <TagList values={result.competitors} emptyText="未识别到竞品" />
            </div>
          </div>
          <div className="rounded border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">引用来源</p>
            <div className="mt-3">
              <TagList values={result.citationUrls} emptyText="未识别到 URL" />
            </div>
          </div>
          <div className="rounded border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <p className="text-sm font-medium text-slate-500">原始候选词</p>
            <div className="mt-3">
              <TagList values={result.rawCandidates} emptyText="暂无候选词" />
            </div>
          </div>
          <div className="rounded border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">已过滤的非品牌候选</p>
            <div className="mt-3">
              <TagList values={result.filteredBrands} emptyText="暂无过滤项" tone="amber" />
            </div>
          </div>
          <div className="rounded border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
            <p className="text-sm font-medium text-slate-500">规则解释</p>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">品牌识别原因</h3>
                <ul className="mt-2 space-y-2 text-sm text-slate-600">
                  {result.extractionTrace.brandRules.map((item) => (
                    <li key={`${item.brand}-${item.reason}`} className="rounded bg-cyan-50 px-3 py-2">
                      {item.brand}：{item.reason}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-950">过滤原因</h3>
                <ul className="mt-2 space-y-2 text-sm text-slate-600">
                  {result.extractionTrace.filteredRules.length === 0 ? (
                    <li className="rounded bg-slate-50 px-3 py-2">暂无过滤项</li>
                  ) : (
                    result.extractionTrace.filteredRules.map((item) => (
                      <li key={`${item.candidate}-${item.reason}`} className="rounded bg-amber-50 px-3 py-2">
                        {item.candidate}：{item.reason}
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-950">排名来源片段</h3>
                <ul className="mt-2 space-y-2 text-sm text-slate-600">
                  {result.rankingTrace.length === 0 ? (
                    <li className="rounded bg-slate-50 px-3 py-2">暂无明确排名片段</li>
                  ) : (
                    result.rankingTrace.map((item) => (
                      <li key={`${item.rank}-${item.brand}`} className="rounded bg-slate-50 px-3 py-2">
                        第 {item.rank} 名 {item.brand}：{item.sourceText}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
