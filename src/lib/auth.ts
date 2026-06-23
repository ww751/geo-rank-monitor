import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "geo_admin_session";

function signingKey(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD 未配置");
  return password;
}

export function generateSessionToken(): string {
  const payload = `${Date.now()}.${Math.random().toString(36).slice(2)}`;
  const hmac = createHmac("sha256", signingKey()).update(payload).digest("hex");
  return `${payload}.${hmac}`;
}

export function verifySessionToken(token: string): boolean {
  try {
    const lastDot = token.lastIndexOf(".");
    if (lastDot < 0) return false;
    const payload = token.slice(0, lastDot);
    const expectedHmac = createHmac("sha256", signingKey()).update(payload).digest("hex");
    const receivedHmac = token.slice(lastDot + 1);
    if (expectedHmac.length !== receivedHmac.length) return false;
    return timingSafeEqual(Buffer.from(expectedHmac), Buffer.from(receivedHmac));
  } catch {
    return false;
  }
}

export { COOKIE_NAME };
