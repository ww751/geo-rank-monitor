import { NextResponse } from "next/server";
import { createContentDraftForTask } from "@/lib/content-draft-generator";
import { withDisplayNames } from "@/lib/field-labels";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const content = await createContentDraftForTask(id);
    return NextResponse.json(
      withDisplayNames({
        content,
        message: "已生成内容草稿",
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "生成内容草稿失败",
        displayNames: { error: "错误信息" },
      },
      { status: 500 },
    );
  }
}
