import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const syncSchema = z.object({
  token: z.string().min(1),
  clients: z.array(z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })).optional(),
  brands: z.array(z.object({
    id: z.string(),
    name: z.string(),
    category: z.string().optional(),
    clientId: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })).optional(),
  keywords: z.array(z.object({
    id: z.string(),
    text: z.string(),
    intent: z.string().optional(),
    brandId: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })).optional(),
  contents: z.array(z.object({
    id: z.string(),
    title: z.string(),
    contentType: z.string().optional(),
    status: z.string().optional(),
    targetKeyword: z.string().optional(),
    optimizationTaskId: z.string().optional(),
    brandId: z.string(),
    notes: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })).optional(),
  optimizationTasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    type: z.string().optional(),
    priority: z.string().optional(),
    status: z.string().optional(),
    targetPlatform: z.string().optional(),
    targetScoreImpact: z.number().optional(),
    brandId: z.string(),
    insight: z.string().optional(),
    suggestion: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })).optional(),
  publications: z.array(z.object({
    id: z.string(),
    contentId: z.string(),
    brandId: z.string(),
    platform: z.string().optional(),
    status: z.string().optional(),
    publishedUrl: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })).optional(),
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://geo-rank-monitor-production.up.railway.app";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = syncSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({
        ok: false,
        error: "Invalid data",
        details: parsed.error.issues.slice(0, 5),
      }, { status: 400 });
    }

    // Simple shared token auth
    const expectedToken = process.env.SYNC_TOKEN || process.env.ADMIN_PASSWORD;
    if (!expectedToken || parsed.data.token !== expectedToken) {
      return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });
    }

    const results: Record<string, number> = {};

    // Upsert clients
    if (parsed.data.clients?.length) {
      let count = 0;
      for (const c of parsed.data.clients) {
        await prisma.client.upsert({
          where: { id: c.id },
          update: { name: c.name },
          create: { id: c.id, name: c.name },
        });
        count++;
      }
      results.clients = count;
    }

    // Upsert brands
    if (parsed.data.brands?.length) {
      let count = 0;
      for (const b of parsed.data.brands) {
        await prisma.brand.upsert({
          where: { id: b.id },
          update: { name: b.name, category: b.category },
          create: { id: b.id, name: b.name, category: b.category, clientId: b.clientId },
        });
        count++;
      }
      results.brands = count;
    }

    // Upsert keywords
    if (parsed.data.keywords?.length) {
      let count = 0;
      for (const k of parsed.data.keywords) {
        await prisma.keyword.upsert({
          where: { id: k.id },
          update: { text: k.text, intent: k.intent as any },
          create: { id: k.id, text: k.text, intent: k.intent as any, brandId: k.brandId },
        });
        count++;
      }
      results.keywords = count;
    }

    // Upsert contents
    if (parsed.data.contents?.length) {
      let count = 0;
      for (const c of parsed.data.contents) {
        await prisma.contentAsset.upsert({
          where: { id: c.id },
          update: {
            title: c.title,
            contentType: c.contentType as any,
            status: c.status as any,
            targetKeyword: c.targetKeyword,
            notes: c.notes,
          },
          create: {
            id: c.id,
            title: c.title,
            contentType: (c.contentType || "LANDING_PAGE") as any,
            status: (c.status || "DRAFT") as any,
            targetKeyword: c.targetKeyword || "",
            optimizationTaskId: c.optimizationTaskId,
            brandId: c.brandId,
            notes: c.notes || "",
          },
        });
        count++;
      }
      results.contents = count;
    }

    // Upsert optimization tasks
    if (parsed.data.optimizationTasks?.length) {
      let count = 0;
      for (const t of parsed.data.optimizationTasks) {
        await prisma.optimizationTask.upsert({
          where: { id: t.id },
          update: {
            title: t.title,
            type: t.type as any,
            priority: t.priority as any,
            status: t.status as any,
            targetPlatform: t.targetPlatform,
            targetScoreImpact: t.targetScoreImpact,
            insight: t.insight,
            suggestion: t.suggestion,
          },
          create: {
            id: t.id,
            title: t.title,
            type: (t.type || "CONTENT_ASSET") as any,
            priority: (t.priority || "MEDIUM") as any,
            status: (t.status || "OPEN") as any,
            targetPlatform: t.targetPlatform || "Doubao",
            targetScoreImpact: t.targetScoreImpact || 0,
            brandId: t.brandId,
            insight: t.insight || "",
            suggestion: t.suggestion || "",
          },
        });
        count++;
      }
      results.optimizationTasks = count;
    }

    // Upsert publications with corrected URLs
    if (parsed.data.publications?.length) {
      let count = 0;
      for (const p of parsed.data.publications) {
        // Rewrite URLs to use the production domain
        let url = p.publishedUrl || "";
        url = url.replace(/http:\/\/localhost:\d+/, SITE_URL);
        await prisma.contentPublication.upsert({
          where: { id: p.id },
          update: {
            platform: p.platform as any,
            status: p.status as any,
            publishedUrl: url,
          },
          create: {
            id: p.id,
            contentId: p.contentId,
            brandId: p.brandId,
            platform: (p.platform || "Doubao") as any,
            status: (p.status || "WAITING_RETEST") as any,
            publishedUrl: url,
          },
        });
        count++;
      }
      results.publications = count;
    }

    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: String(e),
    }, { status: 500 });
  }
}
