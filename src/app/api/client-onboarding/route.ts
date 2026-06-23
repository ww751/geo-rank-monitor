import { NextResponse } from "next/server";
import { onboardClient } from "@/lib/client-onboarding";
import { withDisplayNames } from "@/lib/field-labels";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const result = await onboardClient(input);

    return NextResponse.json(
      withDisplayNames(result, {
        client: "客户",
        brand: "品牌",
        keywordCount: "关键词数量",
        competitorCount: "竞品数量",
        monitoringJobCount: "采集任务数量",
        shareLink: "客户分享链接",
      }),
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "客户自动建档失败",
        displayNames: { error: "错误信息" },
      },
      { status: 400 },
    );
  }
}
