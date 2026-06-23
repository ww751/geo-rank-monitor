import { NextResponse } from "next/server";
import { z } from "zod";
import { authorityScoreForCitation, classifyCitationType, domainFromUrl } from "@/lib/citation-quality";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  citationId: z.string().min(1).optional(),
  limit: z.number().int().positive().max(100).default(50),
});

async function isReachable(url: string) {
  const domain = domainFromUrl(url);
  if (!domain) return false;
  if (domain.endsWith("example.com")) return true;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6_000);
  try {
    const head = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal });
    if (head.status >= 200 && head.status < 500) return true;
    const get = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal });
    return get.status >= 200 && get.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "请求参数错误", displayName: "引用来源检测" }, { status: 400 });
    }

    const citations = await prisma.citation.findMany({
      where: parsed.data.citationId ? { id: parsed.data.citationId } : {},
      include: {
        rankResult: {
          include: {
            brand: { select: { website: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: parsed.data.citationId ? 1 : parsed.data.limit,
    });

    const checked = [];
    for (const citation of citations) {
      const type = classifyCitationType(citation.url, citation.rankResult.brand.website);
      const isValid = await isReachable(citation.url);
      const authorityScore = authorityScoreForCitation({ type, isValid, url: citation.url });
      checked.push(
        await prisma.citation.update({
          where: { id: citation.id },
          data: {
            domain: domainFromUrl(citation.url) || citation.domain,
            type,
            isValid,
            authorityScore,
            lastCheckedAt: new Date(),
          },
        }),
      );
    }

    return NextResponse.json({
      success: true,
      data: { checked: checked.length, citations: checked, message: `已检测 ${checked.length} 条引用来源` },
      displayName: "引用来源检测",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "引用来源检测失败", displayName: "引用来源检测" },
      { status: 500 },
    );
  }
}
