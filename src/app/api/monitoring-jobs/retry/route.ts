import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  monitoringJobId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "请求参数错误", displayName: "采集任务重试" }, { status: 400 });
    }

    const where = parsed.data.monitoringJobId
      ? { id: parsed.data.monitoringJobId }
      : { status: "FAILED" as const };

    const result = await prisma.monitoringJob.updateMany({
      where,
      data: {
        status: "PENDING",
        scheduledAt: new Date(),
        startedAt: null,
        completedAt: null,
        failureReason: null,
      },
    });

    return NextResponse.json({
      success: true,
      data: { updated: result.count, message: `已重新入队 ${result.count} 条任务` },
      displayName: "采集任务重试",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "重新入队失败", displayName: "采集任务重试" },
      { status: 500 },
    );
  }
}
