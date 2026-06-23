import { configuredSiteUrl } from "@/lib/owned-content-publisher";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function xmlEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET() {
  const contents = await prisma.contentAsset.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  const baseUrl = configuredSiteUrl();
  const urls = [
    { loc: `${baseUrl}/`, lastmod: new Date() },
    { loc: `${baseUrl}/geo-content`, lastmod: contents[0]?.updatedAt ?? new Date() },
    ...contents.map((content) => ({ loc: `${baseUrl}/geo-content/${content.id}`, lastmod: content.updatedAt })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${xmlEscape(url.loc)}</loc>
    <lastmod>${url.lastmod.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${url.loc.includes("/geo-content/") ? "0.8" : url.loc.endsWith("/geo-content") ? "0.7" : "0.6"}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
