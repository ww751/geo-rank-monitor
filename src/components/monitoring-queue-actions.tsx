"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Action = "retry-one" | "retry-all" | "run-next";

export function MonitoringQueueActions({ jobId }: { jobId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<Action | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function post(action: Action) {
    setLoading(action);
    setMessage(null);
    try {
      const endpoint = action === "run-next" ? "/api/monitoring-jobs/run-next" : "/api/monitoring-jobs/retry";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "retry-one" ? { monitoringJobId: jobId } : {}),
      });
      const body = (await response.json()) as { success?: boolean; data?: { message?: string }; error?: string };
      if (!response.ok || body.success === false) throw new Error(body.error ?? "操作失败");
      setMessage(body.data?.message ?? "操作完成");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败");
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  if (jobId) {
    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => void post("retry-one")}
          disabled={loading !== null}
          className="rounded border border-cyan-700 px-3 py-1.5 text-xs font-semibold text-cyan-800 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "retry-one" ? "处理中..." : "重新入队"}
        </button>
        {message ? <p className="max-w-xs text-xs text-slate-500">{message}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void post("run-next")}
        disabled={loading !== null}
        className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading === "run-next" ? "运行中..." : "只跑 1 条队列任务"}
      </button>
      <button
        type="button"
        onClick={() => void post("retry-all")}
        disabled={loading !== null}
        className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading === "retry-all" ? "处理中..." : "失败任务全部重新入队"}
      </button>
      {message ? <span className="text-sm text-slate-600">{message}</span> : null}
    </div>
  );
}
