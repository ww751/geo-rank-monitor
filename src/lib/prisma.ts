import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createRealClient(): PrismaClient {
  let connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL 未设置");
  }

  // Railway PostgreSQL 使用自签名证书，需要 sslmode=no-verify
  if (!connectionString.includes("sslmode")) {
    connectionString += connectionString.includes("?") ? "&sslmode=no-verify" : "?sslmode=no-verify";
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
            if (String(method).startsWith("find")) {
              if (String(method) === "findMany" || String(method) === "findRaw" || String(method) === "aggregate" || String(method) === "groupBy") {
                return Promise.resolve([]);
              }
              if (String(method) === "count") return Promise.resolve(0);
              return Promise.resolve(null);
            }
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prisma: PrismaClient = new Proxy({} as any, {
  get(_, prop: string | symbol) {
    const hasDbUrl = !!process.env.DATABASE_URL;
    if (!hasDbUrl && !globalForPrisma.prisma) {
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
