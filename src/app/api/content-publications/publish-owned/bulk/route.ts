import { NextResponse } from "next/server";
import { z } from "zod";
import { withDisplayNames } from "@/lib/field-labels";
import { publishOwnedTasks } from "@/lib/owned-content-publisher";

export const dynamic = "force-dynamic";

const schema = z.object({
  brandId: z.string().min(1).optional(),
  keywordId: z.string().min(1).optional(),
  platform: z.string().min(1).optional(),
  limit: z.number().int().positive().max(100).default(50),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "请求参数错误", displayNames: { error: "错误信息" } },
        { status: 400 },
      );
    }

    const result = await publishOwnedTasks(parsed.data);
    return NextResponse.json({
      success: true,
      ...withDisplayNames(
        {
          ...result,
          message: `已处理 ${result.totalTasks} 条任务，成功发布 ${result.published.length} 条，失败 ${result.failed.length} 条`,
        },
        {
          totalTasks: "处理任务数",
          published: "已发布内容",
          failed: "发布失败任务",
          isLocalOnly: "是否仅本地可访问",
        },
      ),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "批量发布失败", displayNames: { error: "错误信息" } },
      { status: 500 },
    );
  }
}
