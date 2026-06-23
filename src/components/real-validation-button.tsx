"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ValidationPayload = {
  data?: {
    rankResult?: {
      rankPosition: number | null;
      visibilityScore: number;
      sampleSource: string;
    };
    experiment?: {
      status: string;
      validationRank: number | null;
      validationScore: number | null;
    };
  };
  error?: string;
};

function rankText(rank: number | null | undefined) {
  return rank ? `第 ${rank}` : "未出现";
}

export function RealValidationButton({ experimentId }: { experimentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function runValidation() {
    setLoading(true);
    setMessage("真实复测运行中；如果平台出现验证码，请在打开的浏览器里手动完成。");
    try {
      const response = await fetch(`/api/improvement-experiments/${experimentId}/validate`, {
        method: "POST",
      });
      const payload = (await response.json()) as ValidationPayload;
      if (!response.ok) throw new Error(payload.error ?? "真实复测失败");

      const rank = payload.data?.experiment?.validationRank ?? payload.data?.rankResult?.rankPosition ?? null;
      const score = payload.data?.experiment?.validationScore ?? payload.data?.rankResult?.visibilityScore ?? 0;
      setMessage(`真实复测完成：${rankText(rank)}，GEO Score ${score}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "真实复测失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void runValidation()}
        disabled={loading}
        className="rounded border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "真实复测中..." : "运行真实复测"}
      </button>
      {message ? <p className="max-w-xs text-xs leading-5 text-slate-500">{message}</p> : null}
    </div>
  );
}
