"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CheckCitationsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function check() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/citations/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 50 }),
      });
      const body = (await response.json()) as { success?: boolean; data?: { message?: string }; error?: string };
      if (!response.ok || body.success === false) throw new Error(body.error ?? "检测失败");
      setMessage(body.data?.message ?? "检测完成");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "检测失败");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded border border-slate-200 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={() => void check()}
        disabled={loading}
        className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "检测中..." : "检测引用质量"}
      </button>
      <span className="text-sm text-slate-500">自动更新 URL 有效性、来源类型和权威分。</span>
      {message ? <span className="text-sm font-medium text-cyan-700">{message}</span> : null}
    </div>
  );
}
