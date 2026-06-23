"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ContentPublicationActions({ publicationId }: { publicationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"schedule" | "run" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function post(mode: "schedule" | "run") {
    setLoading(mode);
    setMessage(null);
    try {
      const response = await fetch(`/api/content-publications/${publicationId}/retest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, days: 7, collectionMode: "mock" }),
      });
      const body = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || body.success === false) throw new Error(body.error ?? "操作失败");
      setMessage(mode === "schedule" ? "已安排 7 天后复测" : "已完成立即复测");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败");
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void post("schedule")}
          disabled={loading !== null}
          className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "schedule" ? "安排中..." : "安排 7 天复测"}
        </button>
        <button
          type="button"
          onClick={() => void post("run")}
          disabled={loading !== null}
          className="rounded border border-cyan-700 px-3 py-1.5 text-xs font-semibold text-cyan-800 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "run" ? "复测中..." : "立即复测"}
        </button>
      </div>
      {message ? <p className="text-xs text-slate-500">{message}</p> : null}
    </div>
  );
}
