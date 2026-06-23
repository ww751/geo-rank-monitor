import { NextResponse } from "next/server";
import { syncImprovementExperiments } from "@/lib/improvement-experiment-service";
import { withDisplayNames } from "@/lib/field-labels";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = (await request.json().catch(() => ({}))) as { taskId?: unknown };
    const taskId = typeof input.taskId === "string" && input.taskId.trim() ? input.taskId.trim() : undefined;
    const result = await syncImprovementExperiments({ taskId });

    return NextResponse.json(
      withDisplayNames(result, {
        synced: "已同步实验数",
        experiments: "真实提升实验",
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "同步真实提升实验失败",
        displayNames: { error: "错误信息" },
      },
      { status: 500 },
    );
  }
}
