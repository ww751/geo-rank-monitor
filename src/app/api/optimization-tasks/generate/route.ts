import { NextResponse } from "next/server";
import { withDisplayNames } from "@/lib/field-labels";
import { generateOptimizationTasks } from "@/lib/optimization-task-generator";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = await request.json().catch(() => ({}));
    const result = await generateOptimizationTasks(input);

    return NextResponse.json(
      withDisplayNames(result, {
        created: "新生成任务数",
        skipped: "已存在跳过数",
        tasks: "优化任务",
        run: "评分批次",
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "生成优化任务失败",
        displayNames: { error: "错误信息" },
      },
      { status: 500 },
    );
  }
}
