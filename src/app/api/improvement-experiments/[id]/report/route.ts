import { NextResponse } from "next/server";
import { withDisplayNames } from "@/lib/field-labels";
import { createImprovementReport } from "@/lib/improvement-report-service";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const report = await createImprovementReport(id);

    return NextResponse.json(
      withDisplayNames(
        {
          report,
          pdfUrl: `/api/reports/${report.id}/export?format=pdf`,
          pptxUrl: `/api/reports/${report.id}/export?format=pptx`,
          reportExportsUrl: "/report-exports",
        },
        {
          report: "提升实验报告",
          pdfUrl: "PDF下载链接",
          pptxUrl: "PPTX下载链接",
          reportExportsUrl: "报告导出页",
        },
      ),
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "生成提升实验报告失败",
        displayNames: { error: "错误信息" },
      },
      { status: 500 },
    );
  }
}
