import { NextResponse } from "next/server";
import { withDisplayNames } from "@/lib/field-labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function percentage(part: number, total: number) {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

export async function POST(request: Request) {
  const input = (await request.json()) as {
    clientId?: string;
    brandId?: string;
  };
  const clientId = input.clientId?.trim();
  const brandId = input.brandId?.trim();

  if (!clientId) {
    return NextResponse.json({ error: "客户不能为空", displayNames: { error: "错误信息" } }, { status: 400 });
  }

  const latestRun = await prisma.geoScoreRun.findFirst({
    where: { status: "COMPLETED" },
    orderBy: { startedAt: "desc" },
  });
  const brand = brandId
    ? await prisma.brand.findUnique({ where: { id: brandId }, include: { client: true } })
    : null;
  const client = await prisma.client.findUnique({ where: { id: clientId } });

  if (!client) {
    return NextResponse.json({ error: "客户不存在", displayNames: { error: "错误信息" } }, { status: 404 });
  }

  const scores = await prisma.geoScore.findMany({
    where: {
      ...(latestRun ? { runId: latestRun.id } : {}),
      brand: {
        clientId,
        ...(brandId ? { id: brandId } : {}),
      },
    },
    include: {
      brand: { select: { name: true } },
      keyword: { select: { text: true } },
    },
  });

  const geoScore = average(scores.map((score) => score.totalScore));
  const top3Rate = percentage(scores.filter((score) => score.rankingScore >= 30).length, scores.length);
  const lowKeywords = scores
    .filter((score) => score.totalScore < 75)
    .map((score) => score.keyword.text)
    .slice(0, 3);
  const titleSubject = brand?.name ?? client.name;
  const summary = [
    `${titleSubject} 当前 GEO Score 为 ${geoScore}，TOP3 占比为 ${top3Rate}%。`,
    lowKeywords.length > 0
      ? `建议优先优化低分关键词：${Array.from(new Set(lowKeywords)).join("、")}。`
      : "核心关键词整体表现稳定，可继续补充高质量引用来源和案例内容。",
    latestRun ? `本摘要基于 ${latestRun.source} 批次生成。` : "当前暂无评分批次，本摘要基于现有记录生成。",
  ].join("");

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const report = await prisma.report.create({
    data: {
      clientId,
      title: `${titleSubject} GEO 搜索可见度自动摘要`,
      periodStart,
      periodEnd,
      summary,
      status: "DRAFT",
    },
  });

  return NextResponse.json(withDisplayNames(report), { status: 201 });
}
