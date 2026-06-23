import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";

const PUBLIC_PREFIXES = ["/login", "/share/", "/geo-content", "/_next/", "/favicon.ico"];
const PUBLIC_API_PREFIXES = ["/api/auth/"];

function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

function isPublicApi(pathname: string) {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** 简单的内存速率限制，防止暴力破解。每个 IP 每分钟最多 N 次登录尝试。 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const LOGIN_LIMIT_WINDOW = 60_000; // 1 分钟
const LOGIN_LIMIT_MAX = 10; // 每分钟最多 10 次

function isRateLimited(request: NextRequest): boolean {
  if (!request.nextUrl.pathname.startsWith("/api/auth/admin-login")) return false;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + LOGIN_LIMIT_WINDOW });
    return false;
  }
  if (entry.count >= LOGIN_LIMIT_MAX) return true;
  entry.count += 1;
  return false;
}

export function middleware(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  // ADMIN_PASSWORD 未配置时拒绝所有非公开请求，防止裸奔
  if (!adminPassword) {
    const { pathname } = request.nextUrl;
    if (isPublicPath(pathname) || isPublicApi(pathname)) return NextResponse.next();
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "ADMIN_PASSWORD 未配置，无法启用后台", displayName: "后台访问保护" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "服务不可用" }, { status: 503 });
  }

  const { pathname } = request.nextUrl;

  // 速率限制
  if (isRateLimited(request)) {
    return NextResponse.json(
      { success: false, error: "登录尝试过于频繁，请稍后再试", displayName: "后台登录" },
      { status: 429 },
    );
  }

  if (isPublicPath(pathname) || isPublicApi(pathname)) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value ?? "";
  if (verifySessionToken(token)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { success: false, error: "请先登录后台", displayName: "后台访问保护" },
      { status: 401 },
    );
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
