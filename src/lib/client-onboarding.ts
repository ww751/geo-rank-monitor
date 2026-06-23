import { randomBytes } from "node:crypto";
import { generateKeywordGroups } from "@/lib/keyword-expansion";
import { prisma } from "@/lib/prisma";

export type ClientOnboardingInput = {
  clientName?: string;
  brandName?: string;
  city?: string;
  industry?: string;
  website?: string;
  category?: string;
  description?: string;
  geoGoal?: string;
  contactName?: string;
  contactEmail?: string;
  competitorNames?: string[] | string;
  createMonitoringJobs?: boolean;
  monitoringKeywordLimit?: number;
};

function requiredText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: unknown) {
  const text = requiredText(value);
  return text.length > 0 ? text : null;
}

function splitNames(value: string[] | string | undefined) {
  const values = Array.isArray(value) ? value : String(value ?? "").split(/[\n,，、;]/);
  const seen = new Set<string>();
  return values
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function limitFor(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 12;
  return Math.min(120, Math.max(1, Math.round(number)));
}

export async function onboardClient(input: ClientOnboardingInput) {
  const clientName = requiredText(input.clientName);
  const brandName = requiredText(input.brandName);
  const city = requiredText(input.city);
  const industry = requiredText(input.industry);

  if (!clientName || !brandName || !city || !industry) {
    throw new Error("客户名称、品牌名称、城市和行业不能为空");
  }

  const groups = generateKeywordGroups(city, industry);
  if (groups.length === 0) {
    throw new Error("关键词生成失败，请检查城市和行业");
  }

  const competitors = splitNames(input.competitorNames);
  const shouldCreateJobs = Boolean(input.createMonitoringJobs);
  const monitoringKeywordLimit = limitFor(input.monitoringKeywordLimit);

  return prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: {
        name: clientName,
        industry,
        contactName: optionalText(input.contactName),
        contactEmail: optionalText(input.contactEmail),
        status: "ACTIVE",
        notes: `通过客户自动建档创建。城市：${city}；行业：${industry}。`,
      },
    });

    const brand = await tx.brand.create({
      data: {
        clientId: client.id,
        name: brandName,
        website: optionalText(input.website),
        category: optionalText(input.category) ?? `${city}${industry}`,
        description: optionalText(input.description),
        geoGoal:
          optionalText(input.geoGoal) ??
          `提升 ${brandName} 在 Doubao、Kimi、Tongyi、Yuanbao 中关于「${city}${industry}」问题的品牌出现率、TOP3 占比和引用来源覆盖。`,
      },
    });

    if (competitors.length > 0) {
      await tx.competitor.createMany({
        data: competitors.map((name) => ({
          brandId: brand.id,
          name,
          notes: "通过客户自动建档创建。",
        })),
      });
    }

    const clusters = [];
    for (const group of groups) {
      const cluster = await tx.keywordCluster.create({
        data: {
          name: `${brandName}-${group.name}`,
          city: group.city,
          industry: group.industry,
          category: group.category,
          description: group.description,
          keywords: {
            create: group.keywords.map((text) => ({
              brandId: brand.id,
              text,
              intent: group.intent,
              priority: group.priority,
              active: true,
            })),
          },
        },
        include: {
          keywords: {
            orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
          },
        },
      });
      clusters.push(cluster);
    }

    let monitoringJobCount = 0;
    if (shouldCreateJobs) {
      const [platforms, keywords] = await Promise.all([
        tx.aiPlatform.findMany({ where: { enabled: true }, orderBy: { name: "asc" } }),
        tx.keyword.findMany({
          where: { brandId: brand.id, active: true },
          orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
          take: monitoringKeywordLimit,
        }),
      ]);

      if (platforms.length > 0 && keywords.length > 0) {
        const jobs = platforms.flatMap((platform) =>
          keywords.map((keyword) => ({
            brandId: brand.id,
            keywordId: keyword.id,
            platformId: platform.id,
            status: "PENDING" as const,
            scheduledAt: new Date(),
          })),
        );
        await tx.monitoringJob.createMany({ data: jobs });
        monitoringJobCount = jobs.length;
      }
    }

    const shareLink = await tx.clientShareLink.create({
      data: {
        clientId: client.id,
        token: `share-${randomBytes(8).toString("hex")}`,
        status: "ACTIVE",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
        notes: "通过客户自动建档创建。",
      },
    });

    const keywordCount = clusters.reduce((sum, cluster) => sum + cluster.keywords.length, 0);

    return {
      client,
      brand,
      city,
      industry,
      clusters,
      competitorCount: competitors.length,
      keywordCount,
      monitoringJobCount,
      shareLink,
    };
  });
}
