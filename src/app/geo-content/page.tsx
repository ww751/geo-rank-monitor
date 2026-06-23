import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "GEO 内容资产库",
  description: "已发布的品牌实体、关键词覆盖、竞品对比和引用来源内容资产。",
};

export default async function GeoContentIndexPage() {
  const contents = await prisma.contentAsset.findMany({
    where: { status: "PUBLISHED" },
    include: {
      brand: { include: { client: true } },
      optimizationTask: { include: { keyword: true } },
    },
    orderBy: { publishedAt: "desc" },
    take: 200,
  });

  const industries = Array.from(new Set(contents.map((content) => content.brand.client.industry))).filter(Boolean);

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="border-b border-slate-200 pb-8">
          <p className="text-sm font-semibold text-cyan-700">GEO 内容资产库</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">AI 搜索可见度内容中心</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            汇总已发布的品牌实体页、关键词覆盖页、竞品对比页和引用来源资料页，帮助 AI 搜索回答识别品牌、服务范围和可验证证据。
          </p>
          {industries.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {industries.map((industry) => (
                <span key={industry} className="rounded border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700">
                  {industry}
                </span>
              ))}
            </div>
          ) : null}
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {contents.length === 0 ? (
            <div className="rounded border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              暂无已发布内容。请先在 GEO Monitor 后台的一键发布中生成公开内容页。
            </div>
          ) : (
            contents.map((content) => (
              <article key={content.id} className="rounded border border-slate-200 p-5">
                <p className="text-sm font-semibold text-cyan-700">
                  {content.brand.client.industry} / {content.brand.name}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">
                  <Link href={`/geo-content/${content.id}`} className="hover:text-cyan-700">
                    {content.title}
                  </Link>
                </h2>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                  {content.notes ?? `${content.brand.name}围绕${content.targetKeyword ?? content.brand.category}的 GEO 内容资产。`}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded bg-slate-100 px-2 py-1">{content.contentType}</span>
                  {content.targetKeyword ? <span className="rounded bg-slate-100 px-2 py-1">{content.targetKeyword}</span> : null}
                  {content.optimizationTask?.type ? <span className="rounded bg-slate-100 px-2 py-1">{content.optimizationTask.type}</span> : null}
                </div>
              </article>
            ))
          )}
        </section>
      </section>
    </main>
  );
}
