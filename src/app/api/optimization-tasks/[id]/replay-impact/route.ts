import { NextResponse } from "next/server";
import { withDisplayNames } from "@/lib/field-labels";
import { replayOptimizationImpact } from "@/lib/optimization-impact-replay";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const result = await replayOptimizationImpact(id);
    return NextResponse.json(
      withDisplayNames({
        ...result,
        message: "已完成优化复盘测试",
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "运行优化复盘测试失败",
        displayNames: { error: "错误信息" },
      },
      { status: 500 },
    );
  }
}
