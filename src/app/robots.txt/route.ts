function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function GET() {
  return new Response(
    [
      "User-agent: *",
      "Allow: /geo-content/",
      "Disallow: /api/",
      "Disallow: /login",
      `Sitemap: ${siteUrl()}/sitemap.xml`,
      "",
    ].join("\n"),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    },
  );
}
