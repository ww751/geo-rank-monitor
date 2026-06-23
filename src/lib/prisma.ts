import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required in runtime.");
  }

  const pool =
    globalForPrisma.pgPool ??
    new Pool({
      connectionString,
    });

  const client = new PrismaClient({
    adapter: new PrismaPg(pool),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
    globalForPrisma.pgPool = pool;
  }

  return client;
}

// 构建阶段（DATABASE_URL 不存在）：返回 Mock Proxy 以保证 next build 通过
// 运行时（DATABASE_URL 存在）：返回真实 PrismaClient
function getPrisma(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    // 构建阶段，所有方法返回空 Promise 以避免报错
    return new Proxy(
      {},
      {
        get() {
          return () => Promise.resolve([]);
        },
      }
    ) as unknown as PrismaClient;
  }

  if (process.env.NODE_ENV !== "production") {
    return globalForPrisma.prisma ?? createPrismaClient();
  }

  return createPrismaClient();
}

export const prisma: PrismaClient = getPrisma();
