import { NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ error: "DATABASE_URL 未设置", env: Object.keys(process.env).filter(k => k.includes("DATABASE")) }, { status: 500 });
  }

  // 掩码显示密码
  const maskedUrl = dbUrl.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");

  try {
    const pool = new Pool({
      connectionString: dbUrl + (dbUrl.includes("sslmode") ? "" : (dbUrl.includes("?") ? "&sslmode=no-verify" : "?sslmode=no-verify")),
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      max: 1,
    });

    const result = await pool.query("SELECT current_database(), current_user, version()");
    await pool.end();

    return NextResponse.json({
      ok: true,
      dbUrl: maskedUrl,
      db: result.rows[0],
      nodeVersion: process.version,
      env: "railway",
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      dbUrl: maskedUrl,
      error: String(e),
      env: "railway",
    }, { status: 500 });
  }
}
// force deploy 1782204634
