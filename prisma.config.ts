import "dotenv/config";
import { defineConfig } from "prisma/config";

// prisma generate 不需要真实数据库连接，构建时允许 fallback
const databaseUrl = process.env.DATABASE_URL ?? "postgresql://localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
