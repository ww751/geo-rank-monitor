import { NextResponse } from "next/server";
import { z } from "zod";
import { runPublicationRetest, schedulePublicationRetest } from "@/lib/content-publication-service";
import { withDisplayNames } from "@/lib/field-labels";

export const dynamic = "force-dynamic";

const schema = z.object({
  mode: z.enum(["schedule", "run"]).default("run"),
  days: z.number().int().positive().default(7),
  collectionMode: z.enum(["mock", "real"]).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "请求参数错误", displayName: "内容发布复测" }, { status: 400 });
    }

    const result =
      parsed.data.mode === "schedule"
        ? await schedulePublicationRetest(id, parsed.data.days)
        : await runPublicationRetest({ publicationId: id, collectionMode: parsed.data.collectionMode ?? "mock" });

    return NextResponse.json({
      success: true,
      ...withDisplayNames(result, {
        publication: "内容发布记录",
        retest: "发布后复测",
        pipeline: "复测流水线",
      }),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "内容发布复测失败", displayName: "内容发布复测" },
      { status: 500 },
    );
  }
}
