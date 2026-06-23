import "dotenv/config";
import { runMonitoringPipeline } from "@/lib/monitoring-pipeline";
import { prisma } from "@/lib/prisma";

const limitArg = Number(process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1] ?? "5");
const limit = Number.isFinite(limitArg) && limitArg > 0 ? Math.floor(limitArg) : 5;
const includeFailed = process.argv.includes("--include-failed");

async function main() {
  const jobs = await prisma.monitoringJob.findMany({
    where: {
      status: includeFailed ? { in: ["PENDING", "FAILED"] } : "PENDING",
      retryCount: { lt: 3 },
      scheduledAt: { lte: new Date() },
    },
    include: {
      brand: { select: { name: true } },
      keyword: { select: { text: true } },
      platform: { select: { name: true } },
    },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    take: limit,
  });

  if (jobs.length === 0) {
    console.log("No pending monitoring jobs.");
    return;
  }

  for (const job of jobs) {
    console.log(`Running job ${job.id}: ${job.platform.name} / ${job.brand.name} / ${job.keyword.text}`);
    try {
      const result = await runMonitoringPipeline(job.id);
      console.log(`Completed job ${job.id}: pipelineRun=${result.pipelineRun.id}`);
    } catch (error) {
      console.error(`Failed job ${job.id}:`, error instanceof Error ? error.message : error);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
