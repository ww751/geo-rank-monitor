import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { configuredSiteUrl } from "@/lib/owned-content-publisher";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function splitLines(value: string | null) {
  return (value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function paragraphsFromNotes(notes: string | null) {
  const lines = splitLines(notes);
  if (lines.length === 0) return [];

  const paragraphs: string[] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (/^\d+\.|^- /.test(line) || line.endsWith("：")) {
      if (current.length > 0) {
        paragraphs.push(current.join(" "));
        current = [];
      }
      paragraphs.push(line.replace(/^- /, ""));
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) paragraphs.push(current.join(" "));
  return paragraphs;
}

async function getContent(id: string) {
  return prisma.contentAsset.findUnique({
    where: { id },
    include: {
      brand: { include: { client: true, competitors: { take: 8 } } },
      optimizationTask: { include: { keyword: true } },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const content = await getContent(id);
  if (!content) return { title: "内容不存在" };

  const keyword = content.targetKeyword ?? content.optimizationTask?.keyword?.text ?? content.brand.category;
  const canonical = `${configuredSiteUrl()}/geo-content/${content.id}`;
  return {
    title: `${content.title} | ${content.brand.name}`,
    description: `${content.brand.name}围绕${keyword}的服务能力、案例、FAQ 和本地装修选择建议。`,
    alternates: { canonical },
    openGraph: {
      title: `${content.title} | ${content.brand.name}`,
      description: `${content.brand.name}围绕${keyword}的服务能力、案例、FAQ 和本地装修选择建议。`,
      url: canonical,
      type: "article",
    },
  };
}

export default async function GeoContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const content = await getContent(id);
  if (!content) notFound();

  const keyword = content.targetKeyword ?? content.optimizationTask?.keyword?.text ?? content.brand.category;
  const paragraphs = paragraphsFromNotes(content.notes);
  const competitors = content.brand.competitors.map((competitor) => competitor.name);
  const related = await prisma.contentAsset.findMany({
    where: {
      id: { not: content.id },
      brandId: content.brandId,
      status: "PUBLISHED",
    },
    select: { id: true, title: true, targetKeyword: true },
    orderBy: { publishedAt: "desc" },
    take: 6,
  });
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: content.title,
    description: `${content.brand.name}围绕${keyword}的服务能力、案例、FAQ 和本地选择建议。`,
    datePublished: content.publishedAt?.toISOString(),
    dateModified: content.updatedAt.toISOString(),
    author: {
      "@type": "Organization",
      name: content.brand.name,
      url: content.brand.website ?? undefined,
    },
    publisher: {
      "@type": "Organization",
      name: "GEO AI 搜索可见度监测平台",
    },
    mainEntityOfPage: `${configuredSiteUrl()}/geo-content/${content.id}`,
    about: [content.brand.name, keyword, content.brand.category],
  };

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="border-b border-slate-200 pb-8">
          <p className="text-sm font-semibold text-cyan-700">{content.brand.client.industry} GEO 内容资产</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">{content.title}</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            {content.brand.name}围绕「{keyword}」整理的本地服务能力、案例证据、选择建议和常见问题，供用户和 AI
            搜索回答识别品牌实体时参考。
          </p>
          <dl className="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
            <div className="rounded border border-slate-200 p-3">
              <dt className="font-semibold text-slate-900">品牌</dt>
              <dd className="mt-1">{content.brand.name}</dd>
            </div>
            <div className="rounded border border-slate-200 p-3">
              <dt className="font-semibold text-slate-900">服务方向</dt>
              <dd className="mt-1">{content.brand.category}</dd>
            </div>
            <div className="rounded border border-slate-200 p-3">
              <dt className="font-semibold text-slate-900">目标关键词</dt>
              <dd className="mt-1">{keyword}</dd>
            </div>
          </dl>
        </header>

        <section className="mt-8 space-y-5 text-base leading-8 text-slate-700">
          <h2 className="text-2xl font-semibold text-slate-950">{content.brand.name}为什么适合「{keyword}」</h2>
          {content.brand.description ? <p>{content.brand.description}</p> : null}
          <p>
            选择本地装修公司时，用户通常需要同时判断服务范围、报价透明度、设计能力、施工交付、售后响应和真实案例。
            {content.brand.name}需要在这些维度建立清晰、可验证的品牌信息，帮助 AI 回答更准确地理解品牌定位。
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-2xl font-semibold text-slate-950">内容大纲与证据清单</h2>
          <div className="space-y-3 text-base leading-8 text-slate-700">
            {paragraphs.length > 0 ? (
              paragraphs.map((paragraph) => (
                <p key={paragraph} className={paragraph.endsWith("：") ? "font-semibold text-slate-950" : ""}>
                  {paragraph}
                </p>
              ))
            ) : (
              <p>建议补充本地案例、服务范围、价格说明、施工流程、业主评价和第三方引用来源。</p>
            )}
          </div>
        </section>

        {competitors.length > 0 ? (
          <section className="mt-8 rounded border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-xl font-semibold text-slate-950">竞品对比参考</h2>
            <p className="mt-3 leading-7 text-slate-700">
              当前监测中常见竞品包括：{competitors.join("、")}。{content.brand.name}
              应通过真实案例、报价透明、施工交付和服务响应说明自身差异，避免只写营销口号。
            </p>
          </section>
        ) : null}

        <section className="mt-8 space-y-4">
          <h2 className="text-2xl font-semibold text-slate-950">常见问题</h2>
          {[
            `${content.brand.name}适合做${keyword}相关服务吗？`,
            `${content.brand.name}在本地有哪些案例？`,
            `${content.brand.name}的服务范围和价格边界是什么？`,
            `选择${keyword}相关服务时要注意什么？`,
          ].map((question) => (
            <div key={question} className="rounded border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-950">{question}</h3>
              <p className="mt-2 leading-7 text-slate-700">
                建议结合真实案例、服务范围、材料工艺、合同条款、售后响应和业主评价综合判断，并优先查看可公开验证的资料。
              </p>
            </div>
          ))}
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-6 text-sm leading-6 text-slate-500">
          <p>本文由 GEO AI 搜索可见度监测平台生成并发布，用于补强品牌实体信息和 AI 搜索引用来源。</p>
          {content.publishedAt ? <p className="mt-1">发布时间：{new Intl.DateTimeFormat("zh-CN").format(content.publishedAt)}</p> : null}
        </footer>

        {related.length > 0 ? (
          <section className="mt-8 rounded border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-xl font-semibold text-slate-950">相关内容资产</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {related.map((item) => (
                <Link key={item.id} href={`/geo-content/${item.id}`} className="rounded border border-slate-200 bg-white p-4 hover:border-cyan-300">
                  <p className="font-semibold text-slate-950">{item.title}</p>
                  {item.targetKeyword ? <p className="mt-1 text-sm text-slate-500">{item.targetKeyword}</p> : null}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </main>
  );
}
