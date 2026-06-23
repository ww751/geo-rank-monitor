"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type GenerateOptimizationTasksButtonProps = {
  clientId?: string;
  brandId?: string;
  platform?: string;
};

export function GenerateOptimizationTasksButton({ clientId, brandId, platform }: GenerateOptimizationTasksButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/optimization-tasks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, brandId, platform, source: "client-view" }),
      });
      const body = (await response.json()) as { data?: { created?: number; skipped?: number }; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? "生成失败");
      setMessage(`已生成 ${body.data.created ?? 0} 条，跳过 ${body.data.skipped ?? 0} 条`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "生成失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="rounded bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "生成中..." : "生成优化任务"}
      </button>
      {message ? <p className="max-w-xs text-xs text-slate-500">{message}</p> : null}
    </div>
  );
}
