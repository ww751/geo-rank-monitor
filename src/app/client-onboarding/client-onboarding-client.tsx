"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type OnboardingResult = {
  client: { id: string; name: string };
  brand: { id: string; name: string };
  city: string;
  industry: string;
  keywordCount: number;
  competitorCount: number;
  monitoringJobCount: number;
  shareLink: { token: string };
  clusters: Array<{ id: string; category: string; keywords: Array<{ id: string; text: string }> }>;
};

type FormState = {
  clientName: string;
  brandName: string;
  city: string;
  industry: string;
  website: string;
  category: string;
  contactName: string;
  contactEmail: string;
  description: string;
  geoGoal: string;
  competitorNames: string;
  createMonitoringJobs: boolean;
  monitoringKeywordLimit: number;
};

const initialForm: FormState = {
  clientName: "济南示例家装客户",
  brandName: "示例装饰",
  city: "济南",
  industry: "装修",
  website: "",
  category: "济南家装设计与施工",
  contactName: "",
  contactEmail: "",
  description: "专注本地装修、老房翻新和整装交付。",
  geoGoal: "",
  competitorNames: "业之峰装饰\n圣都整装\n城市人家装饰",
  createMonitoringJobs: true,
  monitoringKeywordLimit: 12,
};

export function ClientOnboardingClient() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [result, setResult] = useState<OnboardingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/client-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = (await response.json()) as { data?: OnboardingResult; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? "自动建档失败");
      setResult(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "自动建档失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-sm font-semibold text-cyan-700">客户自动建档</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">GEO AI 搜索可见度监测平台</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          输入客户、品牌、城市和行业后，系统会自动创建客户档案、品牌资料、竞品、关键词簇、关键词，并可选生成采集任务。
        </p>
      </header>

      {error ? <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

      <section className="rounded border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">一键创建客户 GEO 项目</h2>
        </div>
        <form onSubmit={submit} className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          <label>
            <span className="text-sm font-medium text-slate-700">客户名称 *</span>
            <input
              value={form.clientName}
              onChange={(event) => update("clientName", event.target.value)}
              required
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              placeholder="例如：济南万泰装饰集团"
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">品牌名称 *</span>
            <input
              value={form.brandName}
              onChange={(event) => update("brandName", event.target.value)}
              required
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              placeholder="例如：万泰装饰"
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">城市 *</span>
            <input
              value={form.city}
              onChange={(event) => update("city", event.target.value)}
              required
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              placeholder="例如：济南"
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">行业 *</span>
            <input
              value={form.industry}
              onChange={(event) => update("industry", event.target.value)}
              required
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              placeholder="例如：装修、律师、房产、口腔"
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">品牌官网</span>
            <input
              value={form.website}
              onChange={(event) => update("website", event.target.value)}
              type="url"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              placeholder="例如：https://example.com"
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">业务品类</span>
            <input
              value={form.category}
              onChange={(event) => update("category", event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              placeholder="例如：济南家装设计与施工"
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">联系人</span>
            <input
              value={form.contactName}
              onChange={(event) => update("contactName", event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              placeholder="例如：王经理"
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">联系邮箱</span>
            <input
              value={form.contactEmail}
              onChange={(event) => update("contactEmail", event.target.value)}
              type="email"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              placeholder="例如：wang@example.com"
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">自动采集关键词数</span>
            <input
              value={form.monitoringKeywordLimit}
              onChange={(event) => update("monitoringKeywordLimit", Number(event.target.value))}
              type="number"
              min={1}
              max={120}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              placeholder="例如：12"
            />
          </label>
          <label className="md:col-span-2 xl:col-span-3">
            <span className="text-sm font-medium text-slate-700">品牌描述</span>
            <textarea
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              className="mt-1 min-h-20 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              placeholder="例如：专注济南本地家装设计与施工交付"
            />
          </label>
          <label className="md:col-span-2 xl:col-span-3">
            <span className="text-sm font-medium text-slate-700">GEO 优化目标</span>
            <textarea
              value={form.geoGoal}
              onChange={(event) => update("geoGoal", event.target.value)}
              className="mt-1 min-h-20 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              placeholder="例如：提升在 Kimi、Doubao、Tongyi、Yuanbao 中的本地推荐出现率"
            />
          </label>
          <label className="md:col-span-2 xl:col-span-3">
            <span className="text-sm font-medium text-slate-700">竞品名单</span>
            <textarea
              value={form.competitorNames}
              onChange={(event) => update("competitorNames", event.target.value)}
              className="mt-1 min-h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              placeholder="每行一个，例如：业之峰装饰"
            />
          </label>
          <label className="flex items-center gap-2 md:col-span-2 xl:col-span-3">
            <input
              type="checkbox"
              checked={form.createMonitoringJobs}
              onChange={(event) => update("createMonitoringJobs", event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-cyan-700"
            />
            <span className="text-sm text-slate-700">自动为启用 AI 平台创建采集任务</span>
          </label>
          <div className="flex flex-wrap gap-3 md:col-span-2 xl:col-span-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "自动建档中..." : "一键创建客户、品牌和关键词"}
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(initialForm);
                setResult(null);
                setError(null);
              }}
              className="rounded border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              重置示例
            </button>
          </div>
        </form>
      </section>

      {result ? (
        <section className="rounded border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="text-lg font-semibold text-emerald-950">自动建档完成</h2>
          <p className="mt-2 text-sm leading-6 text-emerald-900">
            已创建客户「{result.client.name}」、品牌「{result.brand.name}」，生成 {result.clusters.length} 个关键词簇、
            {result.keywordCount} 条关键词、{result.competitorCount} 个竞品、{result.monitoringJobCount} 条采集任务。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/client-view?clientId=${result.client.id}`} className="rounded bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
              查看客户视图
            </Link>
            <Link href={`/keywords?brandId=${result.brand.id}`} className="rounded border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
              查看关键词库
            </Link>
            <Link href="/pipeline-runner" className="rounded border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
              去执行采集流水线
            </Link>
            <Link href={`/share/${result.shareLink.token}`} className="rounded border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
              打开客户只读链接
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
