import { NextResponse } from "next/server";
import { z } from "zod";
import { withDisplayNames } from "@/lib/field-labels";
import { runMonitoringPipeline } from "@/lib/monitoring-pipeline";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  monitoringJobId: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
  brandId: z.string().min(1).optional(),
  keywordId: z.string().min(1).optional(),
  platformId: z.string().min(1).optional(),
  collectionMode: z.enum(["mock", "real"]).optional(),
  quickTest: z.boolean().optional(),
});

async function resolveQuickTestJob() {
  const existingClient = await prisma.client.findFirst({ where: { name: "章丘上川装饰测试客户" } });
  const client = existingClient
    ? await prisma.client.update({
        where: { id: existingClient.id },
        data: { industry: "装修", status: "ACTIVE" },
      })
    : await prisma.client.create({
        data: {
      name: "章丘上川装饰测试客户",
      industry: "装修",
      contactName: "演示负责人",
      contactEmail: "demo@example.com",
      status: "ACTIVE",
      notes: "用于 Doubao 单条实操测试。",
        },
      });

  const existingBrand = await prisma.brand.findFirst({ where: { clientId: client.id, name: "上川装饰" } });
  const brand = existingBrand
    ? await prisma.brand.update({
        where: { id: existingBrand.id },
        data: {
          category: "章丘装修设计与施工",
          geoGoal: "提升章丘装修公司排名、推荐、避坑类问题中的 AI 可见度。",
        },
      })
    : await prisma.brand.create({
        data: {
      clientId: client.id,
      name: "上川装饰",
      website: "https://demo.example.com/shangchuan",
      category: "章丘装修设计与施工",
      description: "章丘本地装修服务品牌，覆盖新房装修、旧房翻新和整装交付。",
      geoGoal: "提升章丘装修公司排名、推荐、避坑类问题中的 AI 可见度。",
        },
      });

  const existingKeyword = await prisma.keyword.findFirst({ where: { brandId: brand.id, text: "章丘装修公司排名" } });
  const keyword = existingKeyword
    ? await prisma.keyword.update({
        where: { id: existingKeyword.id },
        data: { active: true, priority: 1, intent: "REPUTATION" },
      })
    : await prisma.keyword.create({
        data: {
      brandId: brand.id,
      text: "章丘装修公司排名",
      intent: "REPUTATION",
      priority: 1,
      active: true,
        },
      });

  const platform = await prisma.aiPlatform.upsert({
    where: { slug: "doubao" },
    update: { name: "Doubao", homepageUrl: "https://www.doubao.com", enabled: true },
    create: { name: "Doubao", slug: "doubao", homepageUrl: "https://www.doubao.com", enabled: true },
  });

  return prisma.monitoringJob.create({
    data: {
      brandId: brand.id,
      keywordId: keyword.id,
      platformId: platform.id,
      status: "PENDING",
      scheduledAt: new Date(),
    },
  });
}

async function resolveJob(input: z.infer<typeof schema>) {
  if (input.quickTest) return resolveQuickTestJob();
  if (input.monitoringJobId) {
    const existing = await prisma.monitoringJob.findUnique({ where: { id: input.monitoringJobId } });
    if (!existing) throw new Error("采集任务不存在");
    return existing;
  }

  if (!input.brandId || !input.keywordId || !input.platformId) {
    throw new Error("请选择品牌、关键词和平台，或传入 monitoringJobId。");
  }

  return prisma.monitoringJob.create({
    data: {
      brandId: input.brandId,
      keywordId: input.keywordId,
      platformId: input.platformId,
      status: "PENDING",
      scheduledAt: new Date(),
    },
  });
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

    const job = await resolveJob(parsed.data);
    const result = await runMonitoringPipeline(job.id, {
      collectionMode: parsed.data.collectionMode ?? (parsed.data.quickTest ? "mock" : undefined),
    });

    return NextResponse.json({
      success: true,
      ...withDisplayNames(result, {
        pipelineRun: "流水线运行",
        artifact: "采集产物",
        answerAnalysis: "回答分析",
        rankedBrands: "真实推荐排名",
        rankResult: "监测结果",
        geoScoreRun: "评分批次",
        optimizationTasks: "优化任务",
      }),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "流水线执行失败",
        displayNames: { error: "错误信息" },
      },
      { status: 500 },
    );
  }
}
