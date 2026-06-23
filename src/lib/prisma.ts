import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createRealClient(): PrismaClient {
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

/**
 * 构建时 DATABASE_URL 缺失时返回一个安全的 mock，
 * 所有模型方法返回空结果，让 next build 能正常通过。
 * 运行时 Railway 注入真实的 DATABASE_URL 后，首次查询会创建真正的 PrismaClient。
 */
function buildSafeClient(): PrismaClient {
  const models = [
    "client", "keyword", "aiPlatform", "run", "answerAnalysis",
    "rankResult", "geoScore", "optimizationTask", "improvementExperiment",
    "contentPublish", "report", "shareLink",
  ];

  const modelProxy = new Proxy({}, {
    get() {
      const methods = new Proxy({}, {
        get(_t: unknown, method: string | symbol) {
          if (method === "then") return undefined;
          return (...args: unknown[]) => {
            // findMany / findUnique / findFirst 返回空数组或 null
            if (String(method).startsWith("find")) {
              if (String(method) === "findMany" || String(method) === "findRaw" || String(method) === "aggregate" || String(method) === "groupBy") {
                return Promise.resolve([]);
              }
              if (String(method) === "count") return Promise.resolve(0);
              return Promise.resolve(null);
            }
            // create / update / upsert / delete 返回空对象
            return Promise.resolve({});
          };
        },
      });
      return methods;
    },
  });

  const modelsObj: Record<string, unknown> = {};
  for (const model of models) {
    modelsObj[model] = modelProxy;
  }

  // 提供基本方法
  modelsObj.$connect = () => Promise.resolve();
  modelsObj.$disconnect = () => Promise.resolve();
  modelsObj.$transaction = (fn: unknown) => {
    if (typeof fn === "function") {
      return (fn as (client: PrismaClient) => unknown)(modelsObj as unknown as PrismaClient);
    }
    return Promise.resolve([]);
  };
  modelsObj.$queryRaw = () => Promise.resolve([]);
  modelsObj.$executeRaw = () => Promise.resolve(0);

  return modelsObj as unknown as PrismaClient;
}

// 懒加载 Proxy：构建阶段返回 mock，运行时有 DB 连接后才创建真实客户端
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prisma: PrismaClient = new Proxy({} as any, {
  get(_, prop: string | symbol) {
    const hasDbUrl = !!process.env.DATABASE_URL;
    if (!hasDbUrl && !globalForPrisma.prisma) {
      // 构建阶段：返回安全的 mock
      const mock = buildSafeClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const value = (mock as any)[prop];
      if (typeof value === "function") return value.bind(mock);
      return value;
    }

    const client = globalForPrisma.prisma ?? createRealClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (client as any)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
