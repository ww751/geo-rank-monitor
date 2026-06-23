import "dotenv/config";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { chromium } from "playwright";
import { defaultCollectorConfigForPlatform, realCollectorNotesForPlatform } from "../src/lib/platform-default-configs";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required. Set it in .env.");
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

function hasMockConfig(value: unknown) {
  if (!value || typeof value !== "object") return false;
  return "mockAnswer" in value || "mockAnswerTemplate" in value;
}

function isEmptyObject(value: unknown) {
  return Boolean(value && typeof value === "object" && Object.keys(value).length === 0);
}

function collectorConfigForSession(slug: string, existing: unknown) {
  const defaultConfig = defaultCollectorConfigForPlatform(slug);
  if (!defaultConfig) return existing && typeof existing === "object" ? existing : {};
  if (!existing || isEmptyObject(existing) || hasMockConfig(existing)) return defaultConfig;
  return existing;
}

async function main() {
  const slug = process.argv[2]?.trim();
  if (!slug) {
    throw new Error("请传入平台 slug，例如：npm run auth:save-state -- doubao");
  }

  const platform = await prisma.aiPlatform.findFirst({
    where: {
      OR: [{ slug }, { name: { equals: slug, mode: "insensitive" } }],
    },
    include: {
      session: true,
    },
  });

  if (!platform?.homepageUrl) {
    throw new Error(`未找到平台或平台未配置 homepageUrl：${slug}`);
  }

  const storageStatePath = join(".auth", `${platform.slug}.json`);
  mkdirSync(dirname(storageStatePath), { recursive: true });

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(platform.homepageUrl, { waitUntil: "domcontentloaded" });

  const rl = createInterface({ input, output });
  await rl.question(`请在打开的浏览器中完成 ${platform.name} 登录，完成后回到这个终端按 Enter 保存登录态。`);
  rl.close();

  await context.storageState({ path: storageStatePath });
  await browser.close();

  const collectorConfig = collectorConfigForSession(platform.slug, platform.session?.collectorConfig);
  const notes =
    defaultCollectorConfigForPlatform(platform.slug) !== null
      ? realCollectorNotesForPlatform(platform.name)
      : "通过 npm run auth:save-state 保存的本地 Playwright 登录态。";

  await prisma.platformSession.upsert({
    where: { platformId: platform.id },
    create: {
      platformId: platform.id,
      storageStatePath,
      status: "READY",
      lastCheckedAt: new Date(),
      collectorConfig,
      notes,
    },
    update: {
      storageStatePath,
      status: "READY",
      lastCheckedAt: new Date(),
      collectorConfig,
      notes,
    },
  });

  console.log(`已保存 ${platform.name} 登录态：${storageStatePath}`);
  console.log(`已更新 ${platform.name} 真实采集配置，当前模式：Playwright`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
