import { NextResponse } from "next/server";
import { withDisplayNames } from "@/lib/field-labels";
import { runRealValidationForExperiment } from "@/lib/improvement-experiment-service";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await runRealValidationForExperiment(id);

    return NextResponse.json(
      withDisplayNames(result, {
        monitoringJob: "真实复测采集任务",
        pipelineRun: "真实复测流水线",
        rankResult: "真实复测排名结果",
        experiment: "真实提升实验",
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "真实复测失败",
        displayNames: { error: "错误信息" },
      },
      { status: 500 },
    );
  }
}
