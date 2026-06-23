"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SyncImprovementExperimentsButton({ taskId }: { taskId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function syncExperiments() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/improvement-experiments/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskId ? { taskId } : {}),
      });
      const payload = (await response.json()) as { synced?: number; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "同步失败");
      setMessage(`已同步 ${payload.synced ?? 0} 个实验`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "同步失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void syncExperiments()}
        disabled={loading}
        className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "同步中..." : taskId ? "同步该实验" : "同步提升实验"}
      </button>
      {message ? <p className="text-xs text-slate-500">{message}</p> : null}
    </div>
  );
}
