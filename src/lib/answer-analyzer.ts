import { resolveBrandEntities } from "@/lib/brand-entity-resolver";

export type AnswerAnalyzerInput = {
  answer: string;
  clientBrands: string[];
  competitorBrands: string[];
};

export type AnswerAnalyzerResult = {
  brandsFound: string[];
  filteredBrands: string[];
  rawCandidates: string[];
  clientFound: boolean;
  clientRank: number | null;
  competitors: string[];
  citationUrls: string[];
  ruleVersion: string;
  confidenceScore: number;
  extractionTrace: AnswerExtractionTrace;
};

export type AnswerExtractionTrace = {
  ruleVersion: string;
  brandRules: Array<{ brand: string; reason: string }>;
  filteredRules: Array<{ candidate: string; reason: string }>;
  urlRules: Array<{ url: string; reason: string }>;
  rankRules: Array<{ brand: string; position: number; reason: string }>;
};

export const ANSWER_ANALYZER_RULE_VERSION = "answer-analyzer-rules-v2";

const urlPattern = /https?:\/\/[^\s"'<>()[\]{}，。；、“”‘’]+/gi;

function unique(values: string[]) {
  const seen = new Set<string>();
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function positionOf(answer: string, name: string) {
  return answer.toLowerCase().indexOf(name.toLowerCase());
}

function extractUrls(answer: string) {
  return unique(
    Array.from(answer.matchAll(urlPattern), (match) =>
      match[0].replace(/[)\]}>，。；、“”‘’]+$/g, ""),
    ),
  );
}

function confidenceFor(input: {
  brandsFound: string[];
  matchedDatabaseBrands: string[];
  matchedCompetitors: string[];
  citationUrls: string[];
  clientFound: boolean;
}) {
  let score = 0.35;
  if (input.brandsFound.length > 0) score += 0.2;
  if (input.matchedDatabaseBrands.length > 0) score += 0.2;
  if (input.matchedCompetitors.length > 0) score += 0.1;
  if (input.citationUrls.length > 0) score += 0.1;
  if (input.clientFound) score += 0.05;
  return Math.min(0.98, Number(score.toFixed(2)));
}

export function analyzeAnswer({ answer, clientBrands, competitorBrands }: AnswerAnalyzerInput): AnswerAnalyzerResult {
  const resolved = resolveBrandEntities({
    answer,
    databaseBrands: clientBrands,
    competitorBrands,
  });
  const clientBrandSet = new Set(clientBrands.map((name) => name.toLowerCase()));
  const competitorBrandSet = new Set(competitorBrands.map((name) => name.toLowerCase()));
  const matchedClientBrands = resolved.brandsFound.filter((name) => clientBrandSet.has(name.toLowerCase()));

  const rankedBrands = resolved.brandsFound
    .map((name) => ({ name, index: positionOf(answer, name), isClient: clientBrandSet.has(name.toLowerCase()) }))
    .filter((item) => item.index >= 0)
    .sort((left, right) => left.index - right.index);
  const clientIndex = rankedBrands.findIndex((item) => item.isClient);
  const citationUrls = extractUrls(answer);
  const competitors = resolved.brandsFound.filter(
    (name) => !clientBrandSet.has(name.toLowerCase()) || competitorBrandSet.has(name.toLowerCase()),
  );
  const brandRules = resolved.brandsFound.map((brand) => {
    if (resolved.matchedDatabaseBrands.some((name) => name.toLowerCase() === brand.toLowerCase())) {
      return { brand, reason: "命中数据库品牌表" };
    }
    if (resolved.matchedCompetitors.some((name) => name.toLowerCase() === brand.toLowerCase())) {
      return { brand, reason: "命中竞品库" };
    }
    return { brand, reason: "命中公司实体后缀规则" };
  });
  const filteredRules = resolved.filteredBrands.map((candidate) => ({
    candidate,
    reason: "命中行业通用词或非公司实体过滤规则",
  }));
  const rankRules = rankedBrands.map((item, index) => ({
    brand: item.name,
    position: index + 1,
    reason: "按品牌在回答正文中的首次出现顺序推断",
  }));
  const extractionTrace: AnswerExtractionTrace = {
    ruleVersion: ANSWER_ANALYZER_RULE_VERSION,
    brandRules,
    filteredRules,
    urlRules: citationUrls.map((url) => ({ url, reason: "命中 http/https URL 规则" })),
    rankRules,
  };

  return {
    brandsFound: resolved.brandsFound,
    filteredBrands: resolved.filteredBrands,
    rawCandidates: resolved.rawCandidates,
    clientFound: matchedClientBrands.length > 0,
    clientRank: clientIndex >= 0 ? clientIndex + 1 : null,
    competitors,
    citationUrls,
    ruleVersion: ANSWER_ANALYZER_RULE_VERSION,
    confidenceScore: confidenceFor({
      brandsFound: resolved.brandsFound,
      matchedDatabaseBrands: resolved.matchedDatabaseBrands,
      matchedCompetitors: resolved.matchedCompetitors,
      citationUrls,
      clientFound: matchedClientBrands.length > 0,
    }),
    extractionTrace,
  };
}
