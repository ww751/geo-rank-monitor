import Link from "next/link";
import { configuredSiteUrl, evaluateContentReadiness, isLocalSiteUrl } from "@/lib/owned-content-publisher";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function statusTone(ok: boolean) {
  return ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900";
}

export default async function PublicationReadinessPage() {
  const siteUrl = configuredSiteUrl();
  const localOnly = isLocalSiteUrl(siteUrl);
  const contents = await prisma.contentAsset.findMany({
    where: { status: "PUBLISHED" },
    include: {
      brand: { include: { client: true } },
      optimizationTask: { include: { keyword: true } },
      publications: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const readiness = contents.map((content) => {
    const keyword = content.targetKeyword ?? content.optimizationTask?.keyword?.text ?? null;
    return {
      content,
      keyword,
      publicUrl: content.url,
      readiness: evaluateContentReadiness({
        title: content.title,
        notes: content.notes,
        brandName: content.brand.name,
        keyword,
        publicUrl: content.url,
      }),
    };
  });

  const readyCount = readiness.filter((item) => item.readiness.score >= 75).length;
  const localUrlCount = readiness.filter((item) => item.publicUrl && isLocalSiteUrl(item.publicUrl)).length;
  const missingUrlCount = readiness.filter((item) => !item.publicUrl).length;
  const avgScore =
    readiness.length > 0 ? Math.round(readiness.reduce((sum, item) => sum + item.readiness.score, 0) / readiness.length) : 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-700">部署前检查</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">发布准备度</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            检查自有内容站是否已经具备给 Doubao/Kimi/Tongyi/Yuanbao 真实复测的基础条件。只有公网 URL、sitemap、robots 和内容质量都过关后，才建议跑真实平台复测。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/optimization-tasks" className="rounded border border-cyan-700 px-4 py-2 text-sm font-semibold text-cyan-800 hover:bg-cyan-50">
            去批量发布
          </Link>
          <a href="/geo-content" target="_blank" className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            打开公开内容站
          </a>
        </div>
      </header>

      <section className={`rounded border p-4 text-sm leading-6 ${statusTone(!localOnly)}`}>
        <p className="font-semibold">{localOnly ? "当前还不能影响真实 AI 排名" : "公网 URL 已配置"}</p>
        <p>
          当前 `NEXT_PUBLIC_SITE_URL`：{siteUrl}
          {localOnly
            ? "。这是本地地址，Doubao 无法访问。部署公网域名后需要改成真实 https 域名。"
            : "。可以进入真实平台复测，但仍需要等待平台抓取和更新。"}
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          ["已发布内容", contents.length],
          ["准备度达标", readyCount],
          ["平均准备度", avgScore],
          ["localhost URL", localUrlCount],
        ].map(([label, value]) => (
          <div key={label} className="rounded border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">部署前必须全部满足</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            { label: "配置公网 HTTPS 域名", ok: !localOnly },
            { label: "公开内容页可访问", ok: contents.length > 0 && missingUrlCount === 0 },
            { label: "sitemap.xml 已包含内容页", ok: contents.length > 0 },
            { label: "robots.txt 允许 /geo-content", ok: true },
            { label: "至少 3 篇目标关键词内容", ok: contents.length >= 3 },
            { label: "平均准备度不低于 75", ok: avgScore >= 75 },
          ].map((item) => (
            <div key={item.label} className={`rounded border px-4 py-3 text-sm font-medium ${statusTone(item.ok)}`}>
              {item.ok ? "已满足：" : "待处理："}
              {item.label}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">内容准备度明细</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">内容</th>
                <th className="px-5 py-3 font-semibold">品牌</th>
                <th className="px-5 py-3 font-semibold">关键词</th>
                <th className="px-5 py-3 font-semibold">准备度</th>
                <th className="px-5 py-3 font-semibold">问题</th>
                <th className="px-5 py-3 font-semibold">公开 URL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {readiness.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    暂无已发布内容。请先到优化任务页批量一键发布。
                  </td>
                </tr>
              ) : (
                readiness.map((item) => (
                  <tr key={item.content.id}>
                    <td className="max-w-sm px-5 py-4 text-slate-900">
                      <span className="line-clamp-2">{item.content.title}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{item.content.brand.name}</td>
                    <td className="px-5 py-4 text-slate-600">{item.keyword ?? "-"}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded border px-2 py-1 text-xs font-semibold ${statusTone(item.readiness.score >= 75)}`}>
                        {item.readiness.score}
                      </span>
                    </td>
                    <td className="max-w-md px-5 py-4 text-slate-600">
                      {item.readiness.issues.length === 0 ? "无明显问题" : item.readiness.issues.join("、")}
                    </td>
                    <td className="max-w-sm px-5 py-4">
                      {item.publicUrl ? (
                        <a href={item.publicUrl} target="_blank" className="line-clamp-1 text-cyan-700 underline">
                          {item.publicUrl}
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
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
