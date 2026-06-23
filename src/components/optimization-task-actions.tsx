"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ReplayResult = {
  before?: { rank: number | null; score: number | null };
  after?: { rank: number | null; score: number | null };
};

export function OptimizationTaskActions({ taskId, canReplay }: { taskId: string; canReplay: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"draft" | "replay" | "publish" | "validate" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function callApi(action: "draft" | "replay" | "publish" | "validate") {
    setLoading(action);
    setMessage(null);
    try {
      const endpoint =
        action === "draft"
          ? `/api/optimization-tasks/${taskId}/draft`
          : action === "replay"
            ? `/api/optimization-tasks/${taskId}/replay-impact`
            : action === "publish"
              ? "/api/content-publications/publish-owned"
              : "/api/content-publications";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:
          action === "publish"
            ? JSON.stringify({ optimizationTaskId: taskId, scheduleRetestDays: canReplay ? 7 : 30 })
            : action === "validate"
              ? JSON.stringify({ optimizationTaskId: taskId, immediateRetest: true, collectionMode: "mock" })
              : undefined,
      });
      const payload = (await response.json()) as { data?: ReplayResult; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "操作失败");

      if (action === "draft") {
        setMessage("内容草稿已生成");
      } else if (action === "replay") {
        const beforeRank = payload.data?.before?.rank ? `第 ${payload.data.before.rank}` : "未出现";
        const afterRank = payload.data?.after?.rank ? `第 ${payload.data.after.rank}` : "未识别";
        const beforeScore = payload.data?.before?.score ?? 0;
        const afterScore = payload.data?.after?.score ?? 0;
        setMessage(`复盘完成：${beforeRank} -> ${afterRank}，GEO Score ${beforeScore} -> ${afterScore}`);
      } else if (action === "publish") {
        setMessage("已发布到自有内容站，并安排复测");
      } else {
        setMessage("已标记发布并完成立即复测");
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void callApi("draft")}
          disabled={loading !== null}
          className="rounded bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "draft" ? "生成中..." : "生成内容草稿"}
        </button>
        <button
          type="button"
          onClick={() => void callApi("replay")}
          disabled={!canReplay || loading !== null}
          className="rounded border border-cyan-700 px-3 py-2 text-xs font-semibold text-cyan-800 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-50"
          title={canReplay ? "运行优化后复盘测试" : "该任务没有关联关键词，不能运行排名复盘"}
        >
          {loading === "replay" ? "复盘中..." : "运行复盘测试"}
        </button>
        <button
          type="button"
          onClick={() => void callApi("publish")}
          disabled={loading !== null}
          className="rounded border border-emerald-700 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "publish" ? "发布中..." : "一键发布"}
        </button>
        <button
          type="button"
          onClick={() => void callApi("validate")}
          disabled={!canReplay || loading !== null}
          className="rounded border border-amber-700 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
          title={canReplay ? "立即运行发布后复测" : "该任务没有关联关键词，不能立即复测"}
        >
          {loading === "validate" ? "复测中..." : "立即复测"}
        </button>
      </div>
      {message ? <p className="text-xs leading-5 text-slate-600">{message}</p> : null}
    </div>
  );
}
