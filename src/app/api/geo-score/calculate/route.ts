import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateAndPersistGeoScores } from "@/lib/geo-score-engine";
import { withDisplayNames } from "@/lib/field-labels";

export const dynamic = "force-dynamic";

function optionalDate(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

const calculateGeoScoreSchema = z.object({
  source: z.string().trim().min(1).max(80).optional(),
  clientId: z.string().trim().min(1).optional(),
  brandId: z.string().trim().min(1).optional(),
  industry: z.string().trim().min(1).optional(),
  platform: z.string().trim().min(1).optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = calculateGeoScoreSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "请求参数不合法", displayNames: { error: "错误信息" } },
        { status: 400 },
      );
    }
    const input = parsed.data;
    const result = await calculateAndPersistGeoScores({
      source: optionalString(input.source) ?? "manual",
      filters: {
        clientId: optionalString(input.clientId),
        brandId: optionalString(input.brandId),
        industry: optionalString(input.industry),
        platform: optionalString(input.platform),
        dateFrom: optionalDate(input.dateFrom),
        dateTo: optionalDate(input.dateTo),
      },
    });

    return NextResponse.json(
      withDisplayNames(result, {
        run: "评分批次",
        totalCreated: "生成评分数量",
        analyzedAnswers: "参与计算的回答数量",
        matchedBrandCount: "匹配到的品牌数量",
        unmatchedBrands: "未匹配到数据库品牌的候选词",
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "GEO Score 计算失败",
        displayNames: { error: "错误信息" },
      },
      { status: 500 },
    );
  }
}
