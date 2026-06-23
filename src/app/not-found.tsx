import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-5xl text-slate-300">404</p>
        <h2 className="mt-4 text-xl font-semibold text-slate-950">页面不存在</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          你访问的页面可能已被移除、地址有误或暂未开放。
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center rounded bg-cyan-700 px-5 py-2 text-sm font-semibold text-white hover:bg-cyan-800"
        >
          返回首页
        </Link>
      </div>
    </main>
  );
}
