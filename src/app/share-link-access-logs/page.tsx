import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function dateText(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function shortAgent(value: string | null) {
  if (!value) return "-";
  return value.length > 90 ? `${value.slice(0, 90)}...` : value;
}

function dateRange(dateFrom?: string, dateTo?: string) {
  const gte = dateFrom ? new Date(`${dateFrom}T00:00:00.000+08:00`) : undefined;
  const lte = dateTo ? new Date(`${dateTo}T23:59:59.999+08:00`) : undefined;
  return gte || lte ? { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } : undefined;
}

export default async function ShareLinkAccessLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; shareLinkId?: string; dateFrom?: string; dateTo?: string }>;
}) {
  const params = await searchParams;
  const createdAt = dateRange(params.dateFrom, params.dateTo);
  const [logs, clients, shareLinks] = await Promise.all([
    prisma.shareLinkAccessLog.findMany({
      where: {
        ...(params.shareLinkId ? { shareLinkId: params.shareLinkId } : {}),
        ...(createdAt ? { createdAt } : {}),
        ...(params.clientId ? { shareLink: { clientId: params.clientId } } : {}),
      },
    include: {
      shareLink: {
        include: {
          client: { select: { name: true, industry: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    }),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "desc" } }),
    prisma.clientShareLink.findMany({
      select: { id: true, token: true, client: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-sm font-semibold text-cyan-700">客户分享</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">分享链接访问日志</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          记录客户只读链接的访问时间、来源 IP 和浏览器信息，用于客户交付留痕和后续权限审计。
        </p>
      </header>

      <form className="grid gap-3 rounded border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-5">
        <label>
          <span className="text-sm font-medium text-slate-700">客户</span>
          <select name="clientId" defaultValue={params.clientId ?? ""} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">全部客户</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">分享链接</span>
          <select name="shareLinkId" defaultValue={params.shareLinkId ?? ""} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">全部链接</option>
            {shareLinks.map((link) => (
              <option key={link.id} value={link.id}>
                {link.client.name} / {link.token}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">开始日期</span>
          <input name="dateFrom" type="date" defaultValue={params.dateFrom ?? ""} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">结束日期</span>
          <input name="dateTo" type="date" defaultValue={params.dateTo ?? ""} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            应用筛选
          </button>
          <Link href="/share-link-access-logs" className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            重置
          </Link>
        </div>
      </form>

      <section className="rounded border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">最近 100 次访问</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">客户</th>
                <th className="px-5 py-3 font-semibold">行业</th>
                <th className="px-5 py-3 font-semibold">Token</th>
                <th className="px-5 py-3 font-semibold">路径</th>
                <th className="px-5 py-3 font-semibold">IP</th>
                <th className="px-5 py-3 font-semibold">浏览器</th>
                <th className="px-5 py-3 font-semibold">访问时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                    暂无访问记录。客户打开分享链接后会自动记录。
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-5 py-4 font-medium text-slate-950">{log.shareLink.client.name}</td>
                    <td className="px-5 py-4 text-slate-600">{log.shareLink.client.industry}</td>
                    <td className="px-5 py-4 text-slate-600">
                      <Link href={`/share/${log.shareLink.token}`} className="font-semibold text-cyan-700 underline">
                        {log.shareLink.token}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{log.path}</td>
                    <td className="px-5 py-4 text-slate-600">{log.ipAddress ?? "-"}</td>
                    <td className="max-w-sm px-5 py-4 text-slate-500">{shortAgent(log.userAgent)}</td>
                    <td className="px-5 py-4 text-slate-500">{dateText(log.createdAt)}</td>
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
