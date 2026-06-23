import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function dateText(date: Date) {
  return new Intl.DateTimeFormat("zh-CN").format(date);
}

const statusLabels: Record<string, string> = {
  DRAFT: "草稿",
  READY: "已完成",
  SENT: "已发送",
};

export default async function ReportExportsPage() {
  const reports = await prisma.report.findMany({
    include: { client: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-sm font-semibold text-cyan-700">报告导出</p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-950">GEO AI 搜索可见度监测平台</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          导出月报或提升实验报告，用于客户汇报、内部复盘和演示交付。PDF 已优先使用本机中文字体。
        </p>
      </header>

      <section className="rounded border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">报告列表</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">标题</th>
                <th className="px-5 py-3 font-semibold">客户</th>
                <th className="px-5 py-3 font-semibold">周期</th>
                <th className="px-5 py-3 font-semibold">状态</th>
                <th className="px-5 py-3 font-semibold">摘要</th>
                <th className="px-5 py-3 font-semibold">导出</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    暂无报告。请先在“真实提升实验”或“月报管理”中生成报告。
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id}>
                    <td className="px-5 py-4 font-medium text-slate-950">{report.title}</td>
                    <td className="px-5 py-4 text-slate-600">{report.client.name}</td>
                    <td className="px-5 py-4 text-slate-600">
                      {dateText(report.periodStart)} - {dateText(report.periodEnd)}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{statusLabels[report.status] ?? report.status}</td>
                    <td className="max-w-md px-5 py-4 text-slate-600">
                      <p className="line-clamp-3 whitespace-pre-wrap">{report.summary}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <Link
                          href={`/api/reports/${report.id}/export?format=pdf`}
                          className="rounded bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                        >
                          下载 PDF
                        </Link>
                        <Link
                          href={`/api/reports/${report.id}/export?format=pptx`}
                          className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          下载 PPTX
                        </Link>
                      </div>
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
