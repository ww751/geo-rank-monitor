import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
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

type DemoAnalysis = {
  platform: "Doubao" | "Kimi" | "Tongyi" | "Yuanbao";
  keywordIndex: number;
  answer: string;
  brandsFound: string[];
  competitors: string[];
  rankedBrands: Array<{ brand: string; rank: number }>;
  clientRank: number | null;
  citationUrls: string[];
  visibilityScore: number;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED" | "UNKNOWN";
  sampledAt: Date;
};

type DemoScenario = {
  client: {
    name: string;
    industry: string;
    contactName: string;
    contactEmail: string;
    notes: string;
  };
  brand: {
    name: string;
    website: string;
    category: string;
    description: string;
    geoGoal: string;
  };
  cluster: {
    name: string;
    city: string;
    industry: string;
    category: string;
    description: string;
  };
  keywords: string[];
  competitors: Array<{ name: string; website: string; notes: string }>;
  contents: Array<{ title: string; url: string; targetKeyword: string; notes: string }>;
  analyses: DemoAnalysis[];
  reportSummary: string;
};

type GeoScoreDraft = {
  answerAnalysisId: string;
  brandId: string;
  keywordId: string;
  platform: string;
  rank: number | null;
  citationUrls: string[];
  createdAt: Date;
};

function rankingScore(rank: number | null) {
  if (!rank) return 0;
  if (rank === 1) return 50;
  if (rank === 2) return 40;
  if (rank === 3) return 30;
  if (rank <= 10) return 20;
  return 0;
}

function validUrlCount(urls: string[]) {
  return urls.filter((url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }).length;
}

function domainFrom(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "example.com";
  }
}

function date(value: string) {
  return new Date(`${value}T10:00:00.000+08:00`);
}

function traceForAnalysis(analysis: DemoAnalysis, brandName: string) {
  return {
    ruleVersion: "answer-analyzer-rules-v2",
    brandRules: analysis.brandsFound.map((brand) => ({
      brand,
      reason: brand === brandName ? "命中数据库品牌表" : "命中竞品库或公司实体规则",
    })),
    filteredRules: [
      { candidate: "高端设计", reason: "命中行业通用词过滤规则" },
      { candidate: "施工工艺", reason: "命中行业通用词过滤规则" },
    ],
    urlRules: analysis.citationUrls.map((url) => ({ url, reason: "命中 http/https URL 规则" })),
    rankRules: analysis.rankedBrands.map((item) => ({
      brand: item.brand,
      position: item.rank,
      reason: "命中序号/推荐名单排名格式",
    })),
  };
}

async function main() {
  await prisma.pipelineRun.deleteMany();
  await prisma.publicationRetest.deleteMany();
  await prisma.contentPublication.deleteMany();
  await prisma.shareLinkAccessLog.deleteMany();
  await prisma.clientShareLink.deleteMany();
  await prisma.optimizationTask.deleteMany();
  await prisma.collectionArtifact.deleteMany();
  await prisma.geoScore.deleteMany();
  await prisma.geoScoreRun.deleteMany();
  await prisma.monitoringJob.deleteMany();
  await prisma.platformSession.deleteMany();
  await prisma.rankedBrand.deleteMany();
  await prisma.answerAnalysis.deleteMany();
  await prisma.citation.deleteMany();
  await prisma.rankResult.deleteMany();
  await prisma.report.deleteMany();
  await prisma.contentAsset.deleteMany();
  await prisma.competitor.deleteMany();
  await prisma.keyword.deleteMany();
  await prisma.keywordCluster.deleteMany();
  await prisma.aiPlatform.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.client.deleteMany();

  const platforms = await Promise.all([
    prisma.aiPlatform.create({
      data: { name: "Doubao", slug: "doubao", homepageUrl: "https://www.doubao.com" },
    }),
    prisma.aiPlatform.create({
      data: { name: "Kimi", slug: "kimi", homepageUrl: "https://kimi.moonshot.cn" },
    }),
    prisma.aiPlatform.create({
      data: { name: "Tongyi", slug: "tongyi", homepageUrl: "https://tongyi.aliyun.com" },
    }),
    prisma.aiPlatform.create({
      data: { name: "Yuanbao", slug: "yuanbao", homepageUrl: "https://yuanbao.tencent.com" },
    }),
  ]);
  const platformByName = new Map(platforms.map((platform) => [platform.name, platform]));

  await prisma.platformSession.createMany({
    data: platforms.map((platform) => ({
      platformId: platform.id,
      status: defaultCollectorConfigForPlatform(platform.slug) ? "NEEDS_LOGIN" : "READY",
      storageStatePath: `.auth/${platform.slug}.json`,
      collectorConfig: defaultCollectorConfigForPlatform(platform.slug) ?? {
        mockAnswerTemplate:
          "{{platform}} 模拟回答：针对「{{keyword}}」，推荐名单如下：\n1. {{brand}}\n2. 业之峰装饰\n3. 圣都整装\n{{brand}} 在本地案例、服务响应和交付口碑方面表现稳定。参考：https://demo.example.com/geo/{{brand}}",
      },
      lastCheckedAt: date("2026-05-29"),
      notes: defaultCollectorConfigForPlatform(platform.slug)
        ? realCollectorNotesForPlatform(platform.name)
        : "演示环境使用 mockAnswerTemplate；真实采集时请改为 Playwright 选择器和 storageState。",
    })),
  });

  const scenarios: DemoScenario[] = [
    {
      client: {
        name: "济南万泰装饰集团",
        industry: "装修",
        contactName: "王经理",
        contactEmail: "wang@wantai.example",
        notes: "重点监测济南装修公司排名、推荐、避坑和老房翻新问题。",
      },
      brand: {
        name: "万泰装饰",
        website: "https://demo.example.com/wantai",
        category: "济南家装设计与施工",
        description: "济南本地家装品牌，覆盖新房装修、老房翻新和整装交付。",
        geoGoal: "提升在 Doubao、Kimi、Tongyi、Yuanbao 中的本地装修推荐出现率和 TOP3 占比。",
      },
      cluster: {
        name: "济南装修演示关键词",
        city: "济南",
        industry: "装修",
        category: "本地服务",
        description: "面向装修行业演示的排名、推荐和避坑类 GEO 问题。",
      },
      keywords: ["济南装修公司排名", "济南装修公司推荐", "济南老房翻新公司哪家好"],
      competitors: [
        { name: "业之峰装饰", website: "https://demo.example.com/yizhifeng", notes: "全国连锁装修品牌" },
        { name: "圣都整装", website: "https://demo.example.com/shengdu", notes: "整装交付型竞品" },
        { name: "城市人家装饰", website: "https://demo.example.com/city-home", notes: "济南本地装修竞品" },
      ],
      contents: [
        {
          title: "济南老房翻新避坑指南",
          url: "https://demo.example.com/wantai/old-house-guide",
          targetKeyword: "济南老房翻新公司哪家好",
          notes: "补充真实案例、报价区间和施工节点。",
        },
        {
          title: "济南装修公司选择清单",
          url: "https://demo.example.com/wantai/ranking-guide",
          targetKeyword: "济南装修公司排名",
          notes: "增强品牌官网在推荐类回答中的引用机会。",
        },
      ],
      analyses: [
        {
          platform: "Kimi",
          keywordIndex: 0,
          answer:
            "济南装修公司排名 TOP5 推荐名单：\n1. 万泰装饰，本地案例多，交付稳定。\n2. 业之峰装饰，全国连锁。\n3. 圣都整装，整装套餐丰富。\n参考：https://demo.example.com/wantai/ranking-guide",
          brandsFound: ["万泰装饰", "业之峰装饰", "圣都整装"],
          competitors: ["业之峰装饰", "圣都整装"],
          rankedBrands: [
            { brand: "万泰装饰", rank: 1 },
            { brand: "业之峰装饰", rank: 2 },
            { brand: "圣都整装", rank: 3 },
          ],
          clientRank: 1,
          citationUrls: ["https://demo.example.com/wantai/ranking-guide"],
          visibilityScore: 92,
          sentiment: "POSITIVE",
          sampledAt: date("2026-05-26"),
        },
        {
          platform: "Doubao",
          keywordIndex: 1,
          answer:
            "济南装修公司推荐可以优先看业之峰装饰、万泰装饰、城市人家装饰。万泰装饰适合看重本地案例和施工交付的业主。来源：https://demo.example.com/wantai/cases",
          brandsFound: ["业之峰装饰", "万泰装饰", "城市人家装饰"],
          competitors: ["业之峰装饰", "城市人家装饰"],
          rankedBrands: [
            { brand: "业之峰装饰", rank: 1 },
            { brand: "万泰装饰", rank: 2 },
            { brand: "城市人家装饰", rank: 3 },
          ],
          clientRank: 2,
          citationUrls: ["https://demo.example.com/wantai/cases"],
          visibilityScore: 86,
          sentiment: "POSITIVE",
          sampledAt: date("2026-05-18"),
        },
        {
          platform: "Tongyi",
          keywordIndex: 2,
          answer:
            "济南老房翻新公司推荐名单包括城市人家装饰、万泰装饰、圣都整装。老房翻新要重点核对拆改、报价和水电隐蔽工程。参考：https://demo.example.com/wantai/old-house-guide",
          brandsFound: ["城市人家装饰", "万泰装饰", "圣都整装"],
          competitors: ["城市人家装饰", "圣都整装"],
          rankedBrands: [
            { brand: "城市人家装饰", rank: 1 },
            { brand: "万泰装饰", rank: 2 },
            { brand: "圣都整装", rank: 3 },
          ],
          clientRank: 2,
          citationUrls: ["https://demo.example.com/wantai/old-house-guide"],
          visibilityScore: 84,
          sentiment: "POSITIVE",
          sampledAt: date("2026-04-24"),
        },
      ],
      reportSummary: "装修行业样例中，万泰装饰在三个核心问题均被提及，当前 TOP3 占比较高，建议继续补充价格和避坑内容。",
    },
    {
      client: {
        name: "上海正衡律师事务所",
        industry: "律师",
        contactName: "陈律师",
        contactEmail: "chen@law.example",
        notes: "监测婚姻家事、劳动仲裁和律所推荐类问题。",
      },
      brand: {
        name: "正衡律师",
        website: "https://demo.example.com/zhengheng-law",
        category: "上海民商事律师服务",
        description: "上海本地律师服务品牌，覆盖婚姻家事、劳动争议和合同纠纷。",
        geoGoal: "提升律师推荐类 AI 回答中的品牌出现率和引用来源可信度。",
      },
      cluster: {
        name: "上海律师演示关键词",
        city: "上海",
        industry: "律师",
        category: "专业服务",
        description: "面向律师行业演示的推荐、排名和选择类 GEO 问题。",
      },
      keywords: ["上海婚姻律师推荐", "上海劳动仲裁律师排名", "上海律师事务所哪家好"],
      competitors: [
        { name: "盈科律师事务所", website: "https://demo.example.com/yingke", notes: "全国大型律所" },
        { name: "大成律师事务所", website: "https://demo.example.com/dacheng", notes: "综合型律所" },
        { name: "锦天城律师事务所", website: "https://demo.example.com/allbright", notes: "上海本地高频竞品" },
      ],
      contents: [
        {
          title: "上海婚姻律师咨询指南",
          url: "https://demo.example.com/zhengheng-law/marriage",
          targetKeyword: "上海婚姻律师推荐",
          notes: "补充常见问题、收费方式和案例说明。",
        },
        {
          title: "劳动仲裁流程与证据清单",
          url: "https://demo.example.com/zhengheng-law/labor",
          targetKeyword: "上海劳动仲裁律师排名",
          notes: "提升劳动争议问题中的专业内容覆盖。",
        },
      ],
      analyses: [
        {
          platform: "Kimi",
          keywordIndex: 0,
          answer:
            "上海婚姻律师推荐名单：\n1. 盈科律师事务所\n2. 正衡律师\n3. 大成律师事务所\n正衡律师适合需要婚姻家事细分服务的用户。来源：https://demo.example.com/zhengheng-law/marriage",
          brandsFound: ["盈科律师事务所", "正衡律师", "大成律师事务所"],
          competitors: ["盈科律师事务所", "大成律师事务所"],
          rankedBrands: [
            { brand: "盈科律师事务所", rank: 1 },
            { brand: "正衡律师", rank: 2 },
            { brand: "大成律师事务所", rank: 3 },
          ],
          clientRank: 2,
          citationUrls: ["https://demo.example.com/zhengheng-law/marriage"],
          visibilityScore: 80,
          sentiment: "POSITIVE",
          sampledAt: date("2026-05-22"),
        },
        {
          platform: "Yuanbao",
          keywordIndex: 1,
          answer:
            "上海劳动仲裁律师排名可参考：1. 大成律师事务所 2. 盈科律师事务所 3. 正衡律师。选择时要看劳动争议案例经验。参考：https://demo.example.com/zhengheng-law/labor",
          brandsFound: ["大成律师事务所", "盈科律师事务所", "正衡律师"],
          competitors: ["大成律师事务所", "盈科律师事务所"],
          rankedBrands: [
            { brand: "大成律师事务所", rank: 1 },
            { brand: "盈科律师事务所", rank: 2 },
            { brand: "正衡律师", rank: 3 },
          ],
          clientRank: 3,
          citationUrls: ["https://demo.example.com/zhengheng-law/labor"],
          visibilityScore: 74,
          sentiment: "NEUTRAL",
          sampledAt: date("2026-05-12"),
        },
        {
          platform: "Tongyi",
          keywordIndex: 2,
          answer:
            "上海律师事务所哪家好需要结合案件类型。综合名单包括盈科律师事务所、大成律师事务所、锦天城律师事务所、正衡律师。来源：https://demo.example.com/zhengheng-law/profile",
          brandsFound: ["盈科律师事务所", "大成律师事务所", "锦天城律师事务所", "正衡律师"],
          competitors: ["盈科律师事务所", "大成律师事务所", "锦天城律师事务所"],
          rankedBrands: [
            { brand: "盈科律师事务所", rank: 1 },
            { brand: "大成律师事务所", rank: 2 },
            { brand: "锦天城律师事务所", rank: 3 },
            { brand: "正衡律师", rank: 4 },
          ],
          clientRank: 4,
          citationUrls: ["https://demo.example.com/zhengheng-law/profile"],
          visibilityScore: 68,
          sentiment: "NEUTRAL",
          sampledAt: date("2026-04-18"),
        },
      ],
      reportSummary: "律师行业样例中，正衡律师在婚姻和劳动仲裁问题进入 TOP3，综合律所推荐问题仍需提升排名。",
    },
    {
      client: {
        name: "杭州安居房产咨询",
        industry: "房产",
        contactName: "李顾问",
        contactEmail: "li@housing.example",
        notes: "监测买房咨询、二手房平台和房产顾问推荐问题。",
      },
      brand: {
        name: "安居房产",
        website: "https://demo.example.com/anju",
        category: "杭州房产咨询",
        description: "杭州本地房产咨询品牌，覆盖买房规划、二手房交易和区域分析。",
        geoGoal: "提升房产咨询类问题中的品牌推荐排名和平台覆盖率。",
      },
      cluster: {
        name: "杭州房产演示关键词",
        city: "杭州",
        industry: "房产",
        category: "本地生活",
        description: "面向房产行业演示的推荐、平台和咨询类 GEO 问题。",
      },
      keywords: ["杭州买房中介推荐", "杭州二手房平台排名", "杭州房产咨询公司哪家好"],
      competitors: [
        { name: "链家", website: "https://demo.example.com/lianjia", notes: "房产交易平台竞品" },
        { name: "贝壳找房", website: "https://demo.example.com/beike", notes: "线上房产平台竞品" },
        { name: "我爱我家", website: "https://demo.example.com/5i5j", notes: "线下门店竞品" },
      ],
      contents: [
        {
          title: "杭州买房区域选择指南",
          url: "https://demo.example.com/anju/buying-guide",
          targetKeyword: "杭州买房中介推荐",
          notes: "补充区域预算、学区和通勤信息。",
        },
        {
          title: "杭州二手房交易流程说明",
          url: "https://demo.example.com/anju/second-hand",
          targetKeyword: "杭州二手房平台排名",
          notes: "提高二手房平台对比类回答中的引用概率。",
        },
      ],
      analyses: [
        {
          platform: "Doubao",
          keywordIndex: 0,
          answer:
            "杭州买房中介推荐：1. 链家 2. 贝壳找房 3. 安居房产。安居房产适合需要区域分析和预算规划的购房者。来源：https://demo.example.com/anju/buying-guide",
          brandsFound: ["链家", "贝壳找房", "安居房产"],
          competitors: ["链家", "贝壳找房"],
          rankedBrands: [
            { brand: "链家", rank: 1 },
            { brand: "贝壳找房", rank: 2 },
            { brand: "安居房产", rank: 3 },
          ],
          clientRank: 3,
          citationUrls: ["https://demo.example.com/anju/buying-guide"],
          visibilityScore: 76,
          sentiment: "POSITIVE",
          sampledAt: date("2026-05-24"),
        },
        {
          platform: "Kimi",
          keywordIndex: 1,
          answer:
            "杭州二手房平台排名通常会提到链家、贝壳找房、我爱我家、安居房产。安居房产更偏咨询和陪跑服务。参考：https://demo.example.com/anju/second-hand",
          brandsFound: ["链家", "贝壳找房", "我爱我家", "安居房产"],
          competitors: ["链家", "贝壳找房", "我爱我家"],
          rankedBrands: [
            { brand: "链家", rank: 1 },
            { brand: "贝壳找房", rank: 2 },
            { brand: "我爱我家", rank: 3 },
            { brand: "安居房产", rank: 4 },
          ],
          clientRank: 4,
          citationUrls: ["https://demo.example.com/anju/second-hand"],
          visibilityScore: 66,
          sentiment: "NEUTRAL",
          sampledAt: date("2026-05-15"),
        },
        {
          platform: "Tongyi",
          keywordIndex: 2,
          answer:
            "杭州房产咨询公司可关注贝壳找房、安居房产、链家。若需要独立预算规划，安居房产的咨询属性更明显。来源：https://demo.example.com/anju/consulting",
          brandsFound: ["贝壳找房", "安居房产", "链家"],
          competitors: ["贝壳找房", "链家"],
          rankedBrands: [
            { brand: "贝壳找房", rank: 1 },
            { brand: "安居房产", rank: 2 },
            { brand: "链家", rank: 3 },
          ],
          clientRank: 2,
          citationUrls: ["https://demo.example.com/anju/consulting"],
          visibilityScore: 82,
          sentiment: "POSITIVE",
          sampledAt: date("2026-04-21"),
        },
      ],
      reportSummary: "房产行业样例中，安居房产在咨询类问题表现较好，二手房平台排名仍被大平台压制。",
    },
  ];

  const scoreDrafts: GeoScoreDraft[] = [];

  for (const [scenarioIndex, scenario] of scenarios.entries()) {
    const client = await prisma.client.create({
      data: {
        ...scenario.client,
        status: "ACTIVE",
      },
    });
    await prisma.clientShareLink.create({
      data: {
        clientId: client.id,
        token: `demo-share-${scenarioIndex + 1}`,
        status: "ACTIVE",
        expiresAt: new Date("2026-12-31T23:59:59.000+08:00"),
        notes: "演示用客户只读链接。",
      },
    });
    const brand = await prisma.brand.create({
      data: {
        clientId: client.id,
        ...scenario.brand,
      },
    });
    const cluster = await prisma.keywordCluster.create({ data: scenario.cluster });
    const keywords = await Promise.all(
      scenario.keywords.map((text, index) =>
        prisma.keyword.create({
          data: {
            brandId: brand.id,
            clusterId: cluster.id,
            text,
            intent: index === 0 ? "REPUTATION" : index === 1 ? "SOLUTION" : "COMPARISON",
            priority: index + 1,
          },
        }),
      ),
    );

    await prisma.competitor.createMany({
      data: scenario.competitors.map((competitor) => ({
        brandId: brand.id,
        ...competitor,
      })),
    });

    await prisma.contentAsset.createMany({
      data: scenario.contents.map((content, contentIndex) => ({
        brandId: brand.id,
        contentType: "ARTICLE",
        status: "PUBLISHED",
        ownerName: contentIndex === 0 ? "内容运营小王" : "GEO 顾问小李",
        beforeScore: contentIndex === 0 ? 68 : 72,
        afterScore: contentIndex === 0 ? 82 : 84,
        reviewedAt: date("2026-05-28"),
        impactNotes: "演示复盘：发布后品牌提及和引用概率提升，后续需要观察真实采集批次变化。",
        publishedAt: date("2026-05-01"),
        ...content,
      })),
    });

    const firstPublishedContent = await prisma.contentAsset.findFirst({
      where: { brandId: brand.id, status: "PUBLISHED" },
      orderBy: { publishedAt: "asc" },
    });
    const firstPublishedKeyword = firstPublishedContent?.targetKeyword
      ? keywords.find((keyword) => keyword.text === firstPublishedContent.targetKeyword)
      : keywords[0];

    if (firstPublishedContent) {
      const publication = await prisma.contentPublication.create({
        data: {
          contentId: firstPublishedContent.id,
          brandId: brand.id,
          keywordId: firstPublishedKeyword?.id,
          platform: scenario.analyses[0]?.platform ?? "Doubao",
          publishedUrl: firstPublishedContent.url,
          publishedAt: firstPublishedContent.publishedAt ?? date("2026-05-01"),
          status: "REVIEWED",
          notes: "演示数据：内容发布后已完成一次复测。",
        },
      });
      await prisma.publicationRetest.create({
        data: {
          publicationId: publication.id,
          scheduledAt: date("2026-05-08"),
          startedAt: date("2026-05-08"),
          completedAt: date("2026-05-08"),
          beforeScore: firstPublishedContent.beforeScore ?? 68,
          afterScore: firstPublishedContent.afterScore ?? 82,
          deltaScore: (firstPublishedContent.afterScore ?? 82) - (firstPublishedContent.beforeScore ?? 68),
          status: "COMPLETED",
          resultSummary: "演示复测：发布后品牌提及和引用概率提升，建议继续用真实平台采集验证。",
        },
      });
    }

    for (const analysis of scenario.analyses) {
      const platform = platformByName.get(analysis.platform);
      const keyword = keywords[analysis.keywordIndex];
      if (!platform || !keyword) throw new Error(`Invalid demo analysis for ${scenario.brand.name}`);

      const monitoringJob = await prisma.monitoringJob.create({
        data: {
          brandId: brand.id,
          keywordId: keyword.id,
          platformId: platform.id,
          status: "COMPLETED",
          scheduledAt: analysis.sampledAt,
          startedAt: analysis.sampledAt,
          completedAt: new Date(analysis.sampledAt.getTime() + 18_000),
          retryCount: 0,
        },
      });

      const rankResult = await prisma.rankResult.create({
        data: {
          brandId: brand.id,
          keywordId: keyword.id,
          platformId: platform.id,
          prompt: keyword.text,
          answer: analysis.answer,
          brandMentioned: analysis.clientRank !== null,
          rankPosition: analysis.clientRank,
          sentiment: analysis.sentiment,
          visibilityScore: analysis.visibilityScore,
          sampleSource: "mock",
          sampledAt: analysis.sampledAt,
          createdAt: analysis.sampledAt,
        },
      });

      await prisma.citation.createMany({
        data: analysis.citationUrls.map((url, index) => ({
          rankResultId: rankResult.id,
          title: `${scenario.brand.name} 演示引用来源 ${index + 1}`,
          url,
          domain: domainFrom(url),
          type: index === 0 ? "OFFICIAL" : "MEDIA",
          position: index + 1,
          isValid: true,
          authorityScore: index === 0 ? 30 : 20,
          lastCheckedAt: analysis.sampledAt,
          createdAt: analysis.sampledAt,
        })),
      });

      const savedAnalysis = await prisma.answerAnalysis.create({
        data: {
          platform: analysis.platform,
          keyword: keyword.text,
          answer: analysis.answer,
          brandsFound: analysis.brandsFound,
          filteredBrands: ["高端设计", "施工工艺"],
          rawCandidates: [...analysis.brandsFound, "高端设计", "施工工艺"],
          clientFound: analysis.clientRank !== null,
          clientRank: analysis.clientRank,
          competitors: analysis.competitors,
          citationUrls: analysis.citationUrls,
          ruleVersion: "answer-analyzer-rules-v2",
          confidenceScore: analysis.clientRank && analysis.clientRank <= 3 ? 0.92 : 0.82,
          extractionTrace: traceForAnalysis(analysis, scenario.brand.name),
          createdAt: analysis.sampledAt,
        },
      });

      await prisma.collectionArtifact.create({
        data: {
          monitoringJobId: monitoringJob.id,
          answerAnalysisId: savedAnalysis.id,
          rawAnswer: analysis.answer,
          screenshotPath: `/demo-artifacts/${scenario.brand.name}-${analysis.platform}-${analysis.keywordIndex + 1}.png`,
          htmlSummary: `${analysis.platform} 对「${keyword.text}」的模拟采集产物，已完成回答分析和排名提取。`,
          durationMs: 18000,
          metadata: {
            mode: "mock",
            demo: true,
            platform: analysis.platform,
            prompt: keyword.text,
          },
          createdAt: analysis.sampledAt,
        },
      });

      await prisma.rankedBrand.createMany({
        data: analysis.rankedBrands.map((item) => ({
          answerAnalysisId: savedAnalysis.id,
          brand: item.brand,
          rank: item.rank,
          createdAt: analysis.sampledAt,
        })),
      });

      scoreDrafts.push({
        answerAnalysisId: savedAnalysis.id,
        brandId: brand.id,
        keywordId: keyword.id,
        platform: analysis.platform,
        rank: analysis.clientRank,
        citationUrls: analysis.citationUrls,
        createdAt: analysis.sampledAt,
      });
    }

    await prisma.report.create({
      data: {
        clientId: client.id,
        title: `2026 年 5 月 ${scenario.brand.name} GEO 搜索可见度月报`,
        periodStart: new Date("2026-05-01T00:00:00.000+08:00"),
        periodEnd: new Date("2026-05-31T23:59:59.000+08:00"),
        summary: scenario.reportSummary,
        status: "READY",
      },
    });
  }

  const coveredKeywordsByBrand = new Map<string, Set<string>>();
  for (const draft of scoreDrafts) {
    coveredKeywordsByBrand.set(draft.brandId, coveredKeywordsByBrand.get(draft.brandId) ?? new Set<string>());
    coveredKeywordsByBrand.get(draft.brandId)?.add(draft.keywordId);
  }

  const demoRun = await prisma.geoScoreRun.create({
    data: {
      status: "COMPLETED",
      source: "seed",
      filters: { demo: true, industries: ["装修", "律师", "房产"] },
      startedAt: date("2026-05-29"),
      completedAt: new Date("2026-05-29T10:05:00.000+08:00"),
    },
  });

  await prisma.geoScore.createMany({
    data: scoreDrafts.map((draft) => {
      const visibilityScore = 30;
      const rankScore = rankingScore(draft.rank);
      const citationScore = validUrlCount(draft.citationUrls) * 5;
      const coverageScore = Math.max(0, (coveredKeywordsByBrand.get(draft.brandId)?.size ?? 1) - 1) * 5;

      return {
        runId: demoRun.id,
        answerAnalysisId: draft.answerAnalysisId,
        brandId: draft.brandId,
        keywordId: draft.keywordId,
        platform: draft.platform,
        visibilityScore,
        rankingScore: rankScore,
        citationScore,
        coverageScore,
        totalScore: visibilityScore + rankScore + citationScore + coverageScore,
        createdAt: draft.createdAt,
      };
    }),
  });

  const lowScores = await prisma.geoScore.findMany({
    where: {
      runId: demoRun.id,
      OR: [{ totalScore: { lt: 75 } }, { rankingScore: { lt: 30 } }, { citationScore: 0 }],
    },
    include: {
      brand: true,
      keyword: true,
      answerAnalysis: true,
    },
    orderBy: { totalScore: "asc" },
  });

  await prisma.optimizationTask.createMany({
    data: lowScores.flatMap((score) => {
      const base = {
        brandId: score.brandId,
        keywordId: score.keywordId,
        geoScoreId: score.id,
        status: "OPEN" as const,
        priority: score.totalScore < 70 || score.rankingScore === 0 ? ("HIGH" as const) : ("MEDIUM" as const),
        targetPlatform: score.platform,
        dueDate: new Date("2026-06-30T10:00:00.000+08:00"),
      };

      return [
        {
          ...base,
          type: "CONTENT_ASSET" as const,
          title: `补强「${score.keyword.text}」内容资产`,
          recommendation: "新增推荐/对比页，覆盖品牌优势、服务范围、案例成果、口碑证据和第三方引用来源。",
          rationale: `${score.brand.name} 在 ${score.platform} 的「${score.keyword.text}」GEO Score 为 ${score.totalScore}，低于演示阈值 75。`,
          targetScoreImpact: Math.max(10, 85 - score.totalScore),
        },
        ...(score.rankingScore < 30
          ? [
              {
                ...base,
                type: "TOP3_BOOST" as const,
                title: `提升 ${score.platform}「${score.keyword.text}」TOP3 排名`,
                recommendation: "补充该平台回答更容易引用的结构化内容、第三方来源和品牌差异化证据。",
                rationale: `当前排名评分为 ${score.rankingScore}，说明品牌未稳定进入 TOP3。`,
                targetScoreImpact: Math.max(10, 30 - score.rankingScore),
              },
            ]
          : []),
      ];
    }),
  });

  console.log("Seeded demo data for 装修、律师、房产 industries.");
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
