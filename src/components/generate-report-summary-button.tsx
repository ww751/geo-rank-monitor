"use client";

import { useState } from "react";

export function GenerateReportSummaryButton({ clientId, brandId }: { clientId: string; brandId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/reports/generate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, brandId }),
      });
      const body = (await response.json()) as { data?: { title?: string }; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? "生成失败");
      setMessage(`已生成：${body.data.title ?? "月报摘要"}`);
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
        className="rounded bg-cyan-700 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "生成中..." : "生成月报摘要"}
      </button>
      {message ? <p className="max-w-xs text-xs text-slate-500">{message}</p> : null}
    </div>
  );
}
