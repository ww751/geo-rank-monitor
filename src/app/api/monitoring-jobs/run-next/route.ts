import { NextResponse } from "next/server";
import { z } from "zod";
import { withDisplayNames } from "@/lib/field-labels";
import { runMonitoringPipeline } from "@/lib/monitoring-pipeline";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  collectionMode: z.enum(["mock", "real"]).optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "请求参数错误", displayName: "运行队列任务" }, { status: 400 });
    }

    const job = await prisma.monitoringJob.findFirst({
      where: {
        status: "PENDING",
        scheduledAt: { lte: new Date() },
        retryCount: { lt: 3 },
      },
      orderBy: { scheduledAt: "asc" },
    });

    if (!job) {
      return NextResponse.json({
        success: true,
        data: { message: "没有可执行的待采集任务" },
        displayName: "运行队列任务",
      });
    }

    const result = await runMonitoringPipeline(job.id, { collectionMode: parsed.data.collectionMode });
    return NextResponse.json({
      success: true,
      ...withDisplayNames({
        message: `已执行 1 条任务：${job.id}`,
        ...result,
      }),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "运行队列任务失败", displayName: "运行队列任务" },
      { status: 500 },
    );
  }
}
