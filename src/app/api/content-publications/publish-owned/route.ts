import { NextResponse } from "next/server";
import { z } from "zod";
import { withDisplayNames } from "@/lib/field-labels";
import { publishOwnedContent } from "@/lib/owned-content-publisher";

export const dynamic = "force-dynamic";

const schema = z.object({
  optimizationTaskId: z.string().min(1).optional(),
  contentId: z.string().min(1).optional(),
  scheduleRetestDays: z.number().int().positive().default(7),
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

    const result = await publishOwnedContent(parsed.data);

    return NextResponse.json({
      success: true,
      ...withDisplayNames(
        {
          ...result,
          message: result.isLocalOnly
            ? "已发布到本地自有内容站；部署公网后才能影响真实 AI 排名"
            : "已发布到公网自有内容站",
        },
        {
          publicUrl: "公开内容URL",
          publication: "内容发布记录",
          retest: "发布后复测",
          isLocalOnly: "是否仅本地可访问",
        },
      ),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "一键发布失败", displayNames: { error: "错误信息" } },
      { status: 500 },
    );
  }
}
