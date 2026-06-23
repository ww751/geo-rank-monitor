import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL 未设置");
  }

  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: ["error"],
  });

  globalForPrisma.prisma = client;
  return client;
}

// 懒加载 Proxy：构建阶段不创建客户端，首次查询时才初始化
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prisma: PrismaClient = new Proxy({} as any, {
  get(_, prop: string | symbol) {
    const client = globalForPrisma.prisma ?? createPrismaClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (client as any)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
