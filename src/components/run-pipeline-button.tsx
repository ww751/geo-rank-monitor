"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RunPipelineButton({
  monitoringJobId,
  collectionMode,
}: {
  monitoringJobId: string;
  collectionMode?: "mock" | "real";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monitoringJobId, collectionMode }),
      });
      const body = (await response.json()) as { data?: { pipelineRun?: { id: string } }; error?: string };
      if (!response.ok || !body.data?.pipelineRun?.id) throw new Error(body.error ?? "流水线执行失败");
      setMessage(`已完成：${body.data.pipelineRun.id}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "流水线执行失败");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="rounded bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "执行中..." : "执行流水线"}
      </button>
      {message ? <p className="max-w-sm text-xs text-slate-500">{message}</p> : null}
    </div>
  );
}
