"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function RecalculateGeoScoreButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function recalculate() {
    setLoading(true);
    setMessage(null);
    const payload = {
      clientId: searchParams.get("clientId") || undefined,
      brandId: searchParams.get("brandId") || undefined,
      industry: searchParams.get("industry") || undefined,
      platform: searchParams.get("platform") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      source: "dashboard",
    };

    try {
      const response = await fetch("/api/geo-score/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { data?: { totalCreated?: number; run?: { id: string } }; error?: string };
      if (!response.ok || !body.data?.run?.id) {
        throw new Error(body.error ?? "重算失败");
      }
      const next = new URLSearchParams(searchParams.toString());
      next.set("runId", body.data.run.id);
      setMessage(`已生成 ${body.data.totalCreated ?? 0} 条评分`);
      router.push(`/?${next.toString()}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "重算失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={recalculate}
        disabled={loading}
        className="inline-flex items-center justify-center rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "正在重算..." : "一键重算 GEO Score"}
      </button>
      {message ? <p className="text-xs text-slate-500">{message}</p> : null}
    </div>
  );
}
