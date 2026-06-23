import { prisma } from "../src/lib/prisma";

const jobs = await prisma.monitoringJob.findMany({
  where: {
    platform: {
      name: "Doubao",
    },
  },
  orderBy: {
    createdAt: "desc",
  },
  take: 5,
  include: {
    brand: true,
    keyword: true,
    platform: true,
  },
});

console.log(
  JSON.stringify(
    jobs.map((job) => ({
      id: job.id,
      status: job.status,
      brand: job.brand.name,
      keyword: job.keyword.text,
      platform: job.platform.name,
      retryCount: job.retryCount,
      failureReason: job.failureReason,
    })),
    null,
    2,
  ),
);

await prisma.$disconnect();
