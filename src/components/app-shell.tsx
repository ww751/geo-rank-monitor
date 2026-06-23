"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "数据看板" },
  { href: "/client-view", label: "客户视图" },
  { href: "/optimization-tasks", label: "优化任务" },
  { href: "/improvement-experiments", label: "真实提升实验" },
  { href: "/client-onboarding", label: "客户自动建档" },
  { href: "/clients", label: "客户管理" },
  { href: "/brands", label: "品牌资料" },
  { href: "/keywords", label: "关键词库" },
  { href: "/keyword-generator", label: "关键词生成器" },
  { href: "/answer-analyzer", label: "AI 回答分析器" },
  { href: "/platforms", label: "AI 平台管理" },
  { href: "/platform-sessions", label: "平台登录态" },
  { href: "/rank-results", label: "监测结果" },
  { href: "/monitoring-jobs", label: "采集任务" },
  { href: "/monitoring-queue", label: "采集队列" },
  { href: "/pipeline-runner", label: "流水线执行器" },
  { href: "/pipeline-runs", label: "流水线运行" },
  { href: "/collection-artifacts", label: "采集产物" },
  { href: "/client-share-links", label: "客户分享链接" },
  { href: "/share-link-access-logs", label: "分享访问日志" },
  { href: "/competitors", label: "竞品管理" },
  { href: "/citations", label: "引用来源" },
  { href: "/contents", label: "内容资产" },
  { href: "/content-publications", label: "发布复测" },
  { href: "/publication-readiness", label: "发布准备度" },
  { href: "/reports", label: "月报管理" },
  { href: "/report-exports", label: "报告导出" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/share/") || pathname.startsWith("/geo-content") || pathname === "/login") {
    return <>{children}</>;
  }

  async function logout() {
    await fetch("/api/auth/admin-logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen lg:flex">
      <aside className="border-b border-slate-200 bg-slate-950 text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-b-0 lg:border-r lg:border-slate-800">
        <div className="flex items-center justify-between px-5 py-4 lg:block lg:px-6 lg:py-6">
          <Link href="/" className="block">
            <span className="block text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">GEO AI</span>
            <span className="mt-1 block text-xl font-semibold">搜索可见度监测平台</span>
          </Link>
          <span className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 lg:mt-4 lg:inline-block">
            演示版
          </span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-4 lg:block lg:space-y-1 lg:px-3">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded px-3 py-2 text-sm font-medium lg:block ${
                  active ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-900 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden border-t border-slate-800 px-6 py-4 lg:block">
          <button
            type="button"
            onClick={() => void logout()}
            className="text-sm font-medium text-slate-300 hover:text-white"
          >
            退出后台
          </button>
        </div>
      </aside>
      <main className="min-h-screen flex-1 lg:pl-64">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
