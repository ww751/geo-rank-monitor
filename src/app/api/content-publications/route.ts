import { NextResponse } from "next/server";
import { z } from "zod";
import { createContentPublication, runPublicationRetest } from "@/lib/content-publication-service";
import { withDisplayNames } from "@/lib/field-labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  contentId: z.string().min(1).optional(),
  optimizationTaskId: z.string().min(1).optional(),
  keywordId: z.string().min(1).optional(),
  platform: z.string().min(1).optional(),
  publishedUrl: z.string().url().optional(),
  notes: z.string().optional(),
  scheduleRetestDays: z.number().int().positive().optional(),
  immediateRetest: z.boolean().optional(),
  collectionMode: z.enum(["mock", "real"]).optional(),
});

export async function GET() {
  const items = await prisma.contentPublication.findMany({
    include: {
      content: true,
      brand: { include: { client: true } },
      keyword: true,
      retests: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ success: true, ...withDisplayNames(items) });
}

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "请求参数错误", displayNames: { error: "错误信息" } },
        { status: 400 },
      );
    }

    const result = await createContentPublication(parsed.data);
    const retestResult = parsed.data.immediateRetest
      ? await runPublicationRetest({
          publicationId: result.publication.id,
          collectionMode: parsed.data.collectionMode ?? "mock",
        })
      : null;

    return NextResponse.json({
      success: true,
      ...withDisplayNames(
        {
          ...result,
          immediateRetest: retestResult,
          message: parsed.data.immediateRetest ? "已标记发布并完成立即复测" : "已标记发布",
        },
        {
          publication: "内容发布记录",
          retest: "发布后复测",
          immediateRetest: "立即复测结果",
        },
      ),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "标记发布失败", displayNames: { error: "错误信息" } },
      { status: 500 },
    );
  }
}
