export type BrandEntityResolverInput = {
  answer: string;
  databaseBrands: string[];
  competitorBrands: string[];
};

export type BrandEntityResolverResult = {
  brandsFound: string[];
  filteredBrands: string[];
  rawCandidates: string[];
  matchedDatabaseBrands: string[];
  matchedCompetitors: string[];
};

const companySuffixes = ["装饰", "装修", "家装", "设计", "工程", "装潢", "建筑", "整装"];
const blockedGenericTerms = [
  "高端设计",
  "空间设计",
  "环保家装",
  "基础设计",
  "全案设计",
  "主创设计",
  "施工工艺",
  "设计理念",
  "看重设计",
  "装修公司",
  "装修设计",
  "家装设计",
  "设计方案",
  "施工团队",
  "施工质量",
  "建筑材料",
  "装修工程",
];
const blockedGenericFragments = [
  "本地",
  "老牌",
  "排名",
  "推荐",
  "报价",
  "价格",
  "案例",
  "注意",
  "选择",
  "适合",
  "关注",
  "高端",
  "空间",
  "环保",
  "基础",
  "全案",
  "主创",
  "看重",
  "工艺",
  "理念",
];

const companyEntityPattern = new RegExp(
  `[\\u4e00-\\u9fa5A-Za-z0-9·]{2,18}(?:${companySuffixes.join("|")})`,
  "g",
);
const listItemPattern =
  /(?:^|[\n\r])\s*(?:\d{1,2}|[一二三四五六七八九十]{1,3})[\.、．)]\s*([^\n\r，,。；;:：\-—]{2,40})/g;

function unique(values: string[]) {
  const seen = new Set<string>();
  return values
    .map((value) => normalizeCandidate(value))
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeCandidate(value: string) {
  return value
    .replace(/^[\s"'“”‘’（(【\[]+/, "")
    .replace(/[\s"'“”‘’）)】\]。；;:：，,、]+$/g, "")
    .replace(/^(?:推荐|首选|优先考虑|例如|比如|可选|包括|选择)/, "")
    .split(/(?:是|为|属于|主打|专注|提供|适合|拥有|口碑|价格|案例|优势)/)[0]
    .split(/\s+(?:is|are|was|were|has|have|offers?|provides?|focus(?:es|ed)?|strong|widely)\b/i)[0]
    .trim();
}

function includesName(answer: string, name: string) {
  return answer.toLowerCase().includes(name.toLowerCase());
}

function positionOf(answer: string, name: string) {
  return answer.toLowerCase().indexOf(name.toLowerCase());
}

function endsWithCompanySuffix(value: string) {
  return companySuffixes.some((suffix) => value.endsWith(suffix));
}

function isBlocked(value: string) {
  if (blockedGenericTerms.some((term) => value.includes(term))) return true;
  if (blockedGenericFragments.some((fragment) => value.includes(fragment))) return true;
  if (value.endsWith("装修") && value.length <= 4) return true;
  return false;
}

function blockedLabels(value: string) {
  const labels = blockedGenericTerms.filter((term) => value.includes(term));
  return labels.length > 0 ? labels : [value];
}

function extractListCandidates(answer: string) {
  const candidates: string[] = [];
  for (const match of answer.matchAll(listItemPattern)) {
    const firstPart = match[1].split(/[、,，;；/|]/)[0];
    candidates.push(firstPart);
  }
  return candidates;
}

function extractCompanyCandidates(answer: string) {
  return Array.from(answer.matchAll(companyEntityPattern), (match) => match[0]);
}

function extractBlockedTerms(answer: string) {
  return blockedGenericTerms.filter((term) => answer.includes(term));
}

export function resolveBrandEntities({
  answer,
  databaseBrands,
  competitorBrands,
}: BrandEntityResolverInput): BrandEntityResolverResult {
  const matchedDatabaseBrands = unique(databaseBrands.filter((name) => includesName(answer, name)));
  const matchedCompetitors = unique(competitorBrands.filter((name) => includesName(answer, name)));
  const heuristicCandidates = unique([...extractListCandidates(answer), ...extractCompanyCandidates(answer)]);
  const rawCandidates = unique([...matchedDatabaseBrands, ...matchedCompetitors, ...heuristicCandidates, ...extractBlockedTerms(answer)]);
  const knownNames = new Set([...matchedDatabaseBrands, ...matchedCompetitors].map((name) => name.toLowerCase()));

  const filteredBrands: string[] = [];
  const acceptedHeuristicBrands = heuristicCandidates.filter((candidate) => {
    const normalized = normalizeCandidate(candidate);
    if (!normalized) return false;
    if (knownNames.has(normalized.toLowerCase())) return false;
    if (isBlocked(normalized)) {
      filteredBrands.push(...blockedLabels(normalized));
      return false;
    }
    if (!endsWithCompanySuffix(normalized)) {
      filteredBrands.push(normalized);
      return false;
    }
    return true;
  });

  const brandsFound = unique([...matchedDatabaseBrands, ...matchedCompetitors, ...acceptedHeuristicBrands]).sort(
    (left, right) => positionOf(answer, left) - positionOf(answer, right),
  );

  return {
    brandsFound,
    filteredBrands: unique(filteredBrands),
    rawCandidates,
    matchedDatabaseBrands,
    matchedCompetitors,
  };
}
