"use client";

import Link from "next/link";
import { useState } from "react";

type ReportPayload = {
  data?: {
    report?: { id: string; title: string };
    pdfUrl?: string;
    pptxUrl?: string;
    reportExportsUrl?: string;
  };
  error?: string;
};

export function GenerateImprovementReportButton({ experimentId }: { experimentId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [links, setLinks] = useState<{ pdfUrl: string; pptxUrl: string; reportExportsUrl: string } | null>(null);

  async function generateReport() {
    setLoading(true);
    setMessage(null);
    setLinks(null);
    try {
      const response = await fetch(`/api/improvement-experiments/${experimentId}/report`, {
        method: "POST",
      });
      const payload = (await response.json()) as ReportPayload;
      if (!response.ok) throw new Error(payload.error ?? "生成报告失败");
      if (!payload.data?.pdfUrl || !payload.data.pptxUrl || !payload.data.reportExportsUrl) {
        throw new Error("生成报告成功，但缺少导出链接");
      }
      setLinks({
        pdfUrl: payload.data.pdfUrl,
        pptxUrl: payload.data.pptxUrl,
        reportExportsUrl: payload.data.reportExportsUrl,
      });
      setMessage(`已生成：${payload.data.report?.title ?? "提升实验报告"}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "生成报告失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void generateReport()}
        disabled={loading}
        className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "生成中..." : "生成提升报告"}
      </button>
      {message ? <p className="max-w-xs text-xs leading-5 text-slate-500">{message}</p> : null}
      {links ? (
        <div className="flex flex-wrap gap-2 text-xs">
          <Link href={links.pdfUrl} className="font-semibold text-slate-900 underline">
            下载 PDF
          </Link>
          <Link href={links.pptxUrl} className="font-semibold text-slate-900 underline">
            下载 PPTX
          </Link>
          <Link href={links.reportExportsUrl} className="font-semibold text-cyan-700 underline">
            报告列表
          </Link>
        </div>
      ) : null}
    </div>
  );
}
