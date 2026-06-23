import { prisma } from "@/lib/prisma";
import { citationScoreForRows } from "@/lib/citation-quality";

export type GeoScoreBreakdown = {
  visibilityScore: number;
  rankingScore: number;
  citationScore: number;
  coverageScore: number;
  totalScore: number;
};

export type GeoScoreCalculationFilters = {
  clientId?: string;
  brandId?: string;
  industry?: string;
  platform?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

type BrandRecord = {
  id: string;
  name: string;
  client: {
    id: string;
    industry: string;
  };
};

type KeywordRecord = {
  id: string;
  text: string;
};

type RankResultScoreSample = {
  id: string;
  brandId: string;
  keywordId: string;
  brandMentioned: boolean;
  rankPosition: number | null;
  sampledAt: Date;
  brand: BrandRecord;
  keyword: KeywordRecord;
  platform: { name: string };
  citations: Array<{ url: string; type: string; isValid: boolean; authorityScore: number }>;
};

type ScoreOccurrence = {
  answerAnalysisId: string;
  brand: BrandRecord;
  keywordText: string;
  platform: string;
  rank: number | null;
  citationUrls: string[];
  createdAt: Date;
};

const companyNoisePattern =
  /(有限公司|有限责任公司|股份有限公司|集团|品牌|公司|装饰工程|装饰设计|建筑装饰|装修公司|装饰公司)$/g;

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function normalizeBrandName(value: string) {
  return normalizeText(value).replace(companyNoisePattern, "");
}

function unique<T>(items: T[], keyFor: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyFor(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isBrandMatch(candidate: string, brandName: string) {
  const candidateName = normalizeBrandName(candidate);
  const brand = normalizeBrandName(brandName);

  if (!candidateName || !brand) return false;
  if (candidateName === brand) return true;

  const minLength = Math.min(candidateName.length, brand.length);
  if (minLength < 3) return false;

  return candidateName.includes(brand) || brand.includes(candidateName);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getRankingScore(rank: number | null | undefined) {
  if (!rank) return 0;
  if (rank === 1) return 50;
  if (rank === 2) return 40;
  if (rank === 3) return 30;
  if (rank <= 10) return 20;
  return 0;
}

export function countValidUrls(urls: string[]) {
  return urls.filter((url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }).length;
}

export function buildGeoScoreBreakdown(input: {
  brandVisible: boolean;
  rank: number | null;
  citationUrls: string[];
  citationRows?: Array<{ url: string; type?: string; isValid?: boolean | null; authorityScore?: number | null }>;
  coveredKeywordCount: number;
}): GeoScoreBreakdown {
  const visibilityScore = input.brandVisible ? 30 : 0;
  const rankingScore = input.brandVisible ? getRankingScore(input.rank) : 0;
  const citationScore = input.brandVisible
    ? input.citationRows && input.citationRows.length > 0
      ? Math.round(citationScoreForRows(input.citationRows))
      : countValidUrls(input.citationUrls) * 5
    : 0;
  const coverageScore = input.brandVisible ? Math.max(0, input.coveredKeywordCount - 1) * 5 : 0;
  const totalScore = clampScore(visibilityScore + rankingScore + citationScore + coverageScore);

  return {
    visibilityScore,
    rankingScore,
    citationScore,
    coverageScore,
    totalScore,
  };
}

function dateFilter(filters: GeoScoreCalculationFilters) {
  if (!filters.dateFrom && !filters.dateTo) return undefined;
  return {
    ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
    ...(filters.dateTo ? { lte: filters.dateTo } : {}),
  };
}

function brandMatchesFilters(brand: BrandRecord, filters: GeoScoreCalculationFilters) {
  if (filters.brandId && brand.id !== filters.brandId) return false;
  if (filters.clientId && brand.client.id !== filters.clientId) return false;
  if (filters.industry && normalizeText(brand.client.industry) !== normalizeText(filters.industry)) return false;
  return true;
}

function matchBrands(candidates: string[], brands: BrandRecord[], filters: GeoScoreCalculationFilters) {
  return unique(
    brands.filter(
      (brand) =>
        brandMatchesFilters(brand, filters) && candidates.some((candidate) => isBrandMatch(candidate, brand.name)),
    ),
    (brand) => brand.id,
  );
}

function findRankForBrand(
  rankedBrands: Array<{ brand: string; rank: number }>,
  brandName: string,
) {
  const ranked = rankedBrands.find((item) => isBrandMatch(item.brand, brandName));
  return ranked?.rank ?? null;
}

async function getKeywordByText(keywordText: string, keywordsByText: Map<string, KeywordRecord>) {
  const key = normalizeText(keywordText);
  const existing = keywordsByText.get(key);
  if (existing) return existing;

  const created = await prisma.keyword.create({
    data: {
      text: keywordText,
      intent: "SOLUTION",
      priority: 3,
    },
    select: {
      id: true,
      text: true,
    },
  });
  keywordsByText.set(key, created);
  return created;
}

function serializeFilters(filters: GeoScoreCalculationFilters) {
  return {
    ...filters,
    dateFrom: filters.dateFrom?.toISOString(),
    dateTo: filters.dateTo?.toISOString(),
  };
}

export async function calculateAndPersistGeoScores(input?: {
  filters?: GeoScoreCalculationFilters;
  source?: string;
}) {
  const filters = input?.filters ?? {};
  const run = await prisma.geoScoreRun.create({
    data: {
      status: "RUNNING",
      source: input?.source ?? "manual",
      filters: serializeFilters(filters),
    },
  });

  try {
    const rankSamples = await prisma.rankResult.findMany({
      where: {
        ...(dateFilter(filters) ? { sampledAt: dateFilter(filters) } : {}),
        ...(filters.platform ? { platform: { name: filters.platform } } : {}),
        brand: {
          ...(filters.brandId ? { id: filters.brandId } : {}),
          ...(filters.clientId ? { clientId: filters.clientId } : {}),
          ...(filters.industry ? { client: { industry: filters.industry } } : {}),
        },
      },
      include: {
        brand: {
          include: {
            client: {
              select: {
                id: true,
                industry: true,
              },
            },
          },
        },
        keyword: {
          select: {
            id: true,
            text: true,
          },
        },
        platform: {
          select: {
            name: true,
          },
        },
        citations: {
          select: {
            url: true,
            type: true,
            isValid: true,
            authorityScore: true,
          },
        },
      },
      orderBy: {
        sampledAt: "asc",
      },
    });

    const scoreRows = [];
    const unmatchedBrands = new Set<string>();
    let analyzedAnswers = rankSamples.length;

    if (rankSamples.length > 0) {
      const visibleKeywordsByBrand = new Map<string, Set<string>>();

      for (const sample of rankSamples) {
        if (!visibleKeywordsByBrand.has(sample.brandId)) {
          visibleKeywordsByBrand.set(sample.brandId, new Set<string>());
        }
        if (sample.brandMentioned) {
          visibleKeywordsByBrand.get(sample.brandId)?.add(sample.keywordId);
        }
      }

      for (const sample of rankSamples as RankResultScoreSample[]) {
        const coveredKeywordCount = sample.brandMentioned ? visibleKeywordsByBrand.get(sample.brandId)?.size ?? 0 : 0;
        const scores = buildGeoScoreBreakdown({
          brandVisible: sample.brandMentioned,
          rank: sample.rankPosition,
          citationUrls: sample.brandMentioned ? sample.citations.map((citation) => citation.url) : [],
          citationRows: sample.brandMentioned ? sample.citations : [],
          coveredKeywordCount,
        });

        scoreRows.push({
          runId: run.id,
          answerAnalysisId: null,
          brandId: sample.brandId,
          platform: sample.platform.name,
          keywordId: sample.keywordId,
          ...scores,
          createdAt: sample.sampledAt,
        });
      }
    } else {
      const [brands, keywords, analyses] = await Promise.all([
        prisma.brand.findMany({
          include: {
            client: {
              select: {
                id: true,
                industry: true,
              },
            },
          },
        }),
        prisma.keyword.findMany({
          select: {
            id: true,
            text: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        }),
        prisma.answerAnalysis.findMany({
          where: {
            ...(filters.platform ? { platform: filters.platform } : {}),
            ...(dateFilter(filters) ? { createdAt: dateFilter(filters) } : {}),
          },
          include: {
            rankedBrands: {
              orderBy: {
                rank: "asc",
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        }),
      ]);
      analyzedAnswers = analyses.length;

      const keywordsByText = new Map<string, KeywordRecord>();
      for (const keyword of keywords) {
        const key = normalizeText(keyword.text);
        if (!keywordsByText.has(key)) {
          keywordsByText.set(key, keyword);
        }
      }

      const occurrences: ScoreOccurrence[] = [];
      const coveredKeywordsByBrand = new Map<string, Set<string>>();

      for (const analysis of analyses) {
        const candidates = unique(
          [...analysis.brandsFound, ...analysis.rankedBrands.map((item) => item.brand)],
          (value) => normalizeBrandName(value),
        );
        const matchedBrands = matchBrands(candidates, brands, filters);

        for (const candidate of candidates) {
          if (!matchedBrands.some((brand) => isBrandMatch(candidate, brand.name))) {
            unmatchedBrands.add(candidate);
          }
        }

        for (const brand of matchedBrands) {
          const keywordText = analysis.keyword.trim();
          const keywordKey = normalizeText(keywordText);
          if (!coveredKeywordsByBrand.has(brand.id)) {
            coveredKeywordsByBrand.set(brand.id, new Set<string>());
          }
          coveredKeywordsByBrand.get(brand.id)?.add(keywordKey);

          occurrences.push({
            answerAnalysisId: analysis.id,
            brand,
            keywordText,
            platform: analysis.platform,
            rank: findRankForBrand(analysis.rankedBrands, brand.name),
            citationUrls: analysis.citationUrls,
            createdAt: analysis.createdAt,
          });
        }
      }

      for (const occurrence of occurrences) {
        const keyword = await getKeywordByText(occurrence.keywordText, keywordsByText);
        const coveredKeywordCount = coveredKeywordsByBrand.get(occurrence.brand.id)?.size ?? 1;
        const scores = buildGeoScoreBreakdown({
          brandVisible: true,
          rank: occurrence.rank,
          citationUrls: occurrence.citationUrls,
          coveredKeywordCount,
        });

        scoreRows.push({
          runId: run.id,
          answerAnalysisId: occurrence.answerAnalysisId,
          brandId: occurrence.brand.id,
          platform: occurrence.platform,
          keywordId: keyword.id,
          ...scores,
          createdAt: occurrence.createdAt,
        });
      }
    }

    if (scoreRows.length > 0) {
      await prisma.geoScore.createMany({
        data: scoreRows,
      });
    }

    const completedRun = await prisma.geoScoreRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    const geoScores = await prisma.geoScore.findMany({
      where: {
        runId: run.id,
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            client: {
              select: {
                id: true,
                name: true,
                industry: true,
              },
            },
          },
        },
        keyword: {
          select: {
            id: true,
            text: true,
          },
        },
        answerAnalysis: {
          select: {
            id: true,
            platform: true,
            keyword: true,
            confidenceScore: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      run: completedRun,
      totalCreated: geoScores.length,
      analyzedAnswers,
      matchedBrandCount: new Set(geoScores.filter((score) => score.visibilityScore > 0).map((score) => score.brandId)).size,
      unmatchedBrands: Array.from(unmatchedBrands).sort(),
      geoScores,
    };
  } catch (error) {
    await prisma.geoScoreRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "GEO Score 计算失败",
      },
    });
    throw error;
  }
}
