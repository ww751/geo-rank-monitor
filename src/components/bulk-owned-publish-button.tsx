"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BulkOwnedPublishButton({
  brandId,
  keywordId,
  platform,
}: {
  brandId?: string;
  keywordId?: string;
  platform?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function publish() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/content-publications/publish-owned/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, keywordId, platform, limit: 100 }),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        data?: { message?: string; isLocalOnly?: boolean };
        error?: string;
      };
      if (!response.ok || payload.success === false) throw new Error(payload.error ?? "批量发布失败");
      setMessage(
        payload.data?.isLocalOnly
          ? `${payload.data?.message ?? "发布完成"}。当前仍是 localhost，部署公网后才会影响真实 AI 排名。`
          : payload.data?.message ?? "发布完成",
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "批量发布失败");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void publish()}
        disabled={loading}
        className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "批量发布中..." : "批量一键发布"}
      </button>
      {message ? <p className="max-w-2xl text-xs leading-5 text-slate-600">{message}</p> : null}
    </div>
  );
}
