import { NextResponse } from "next/server";
import { z } from "zod";
import { generateKeywordGroups } from "@/lib/keyword-expansion";
import { withDisplayNames } from "@/lib/field-labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const keywordGeneratorSchema = z.object({
  city: z.string().trim().min(1, "城市不能为空").max(40, "城市名称过长"),
  industry: z.string().trim().min(1, "行业不能为空").max(40, "行业名称过长"),
});

export async function POST(request: Request) {
  const parsed = keywordGeneratorSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "请求参数不合法", displayNames: { error: "错误信息" } },
      { status: 400 },
    );
  }

  const groups = generateKeywordGroups(parsed.data.city, parsed.data.industry);

  if (groups.length === 0) {
    return NextResponse.json({ error: "城市和行业不能为空", displayNames: { error: "错误信息" } }, { status: 400 });
  }

  const clusters = await prisma.$transaction(
    groups.map((group) =>
      prisma.keywordCluster.create({
        data: {
          name: group.name,
          city: group.city,
          industry: group.industry,
          category: group.category,
          description: group.description,
          keywords: {
            create: group.keywords.map((text) => ({
              text,
              intent: group.intent,
              priority: group.priority,
              active: true,
            })),
          },
        },
        include: {
          keywords: {
            orderBy: { createdAt: "asc" },
          },
        },
      }),
    ),
  );

  return NextResponse.json(
    withDisplayNames({
      city: groups[0].city,
      industry: groups[0].industry,
      total: clusters.reduce((sum, cluster) => sum + cluster.keywords.length, 0),
      clusters,
    }),
  );
}
