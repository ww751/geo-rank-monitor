"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("页面渲染错误:", error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <p className="text-5xl">⚠</p>
        <h2 className="mt-4 text-xl font-semibold text-slate-950">页面加载异常</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          当前页面发生了意外错误，请稍后重试。
        </p>
        {error.digest ? (
          <p className="mt-1 text-xs text-slate-400">错误 ID: {error.digest}</p>
        ) : null}
        <button
          onClick={reset}
          className="mt-6 rounded bg-cyan-700 px-5 py-2 text-sm font-semibold text-white hover:bg-cyan-800"
        >
          重试
        </button>
      </div>
    </main>
  );
}
