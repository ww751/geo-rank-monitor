import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { COOKIE_NAME, generateSessionToken } from "@/lib/auth";

const schema = z.object({
  password: z.string().min(1, "请输入后台访问密码").max(128, "密码过长"),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "请求参数错误", displayName: "后台登录" },
      { status: 400 },
    );
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json({ success: false, error: "ADMIN_PASSWORD 未配置", displayName: "后台登录" }, { status: 500 });
  }

  // 使用常量时间比较，防止时序攻击
  const inputHash = createHash("sha256").update(parsed.data.password).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  if (inputHash.length !== expectedHash.length || !timingSafeEqual(inputHash, expectedHash)) {
    return NextResponse.json({ success: false, error: "后台访问密码不正确", displayName: "后台登录" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, generateSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 小时
  });

  return NextResponse.json({ success: true, data: { message: "登录成功" }, displayName: "后台登录" });
}
