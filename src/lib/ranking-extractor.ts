export type RankedBrandResult = {
  rank: number;
  brand: string;
};

export type RankedBrandTrace = RankedBrandResult & {
  sourceText: string;
  reason: string;
};

type RankedBrandCandidate = RankedBrandTrace & {
  order: number;
};

const chineseNumberMap: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
};

const companySuffixes = [
  "装饰",
  "装修",
  "家装",
  "设计",
  "工程",
  "装潢",
  "建筑",
  "整装",
  "工装",
  "工作室",
  "精工",
  "集团",
];

const blockedExactTerms = [
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
  "装修预算",
  "装修报价",
];

const knownShortBrands = [
  "业之峰",
  "东易日盛",
  "圣都",
  "今朝",
  "龙发",
  "生活家",
  "金螳螂家",
  "城市人家",
];

const blockedFragments = [
  "排名",
  "排行",
  "榜单",
  "名单",
  "推荐",
  "参考",
  "关键词",
  "资料",
  "搜索",
  "内容由",
  "豆包",
  "生成",
  "预算",
  "价格",
  "报价",
  "费用",
  "案例",
  "避坑",
  "注意",
  "选择",
  "建议",
  "理由",
  "适合",
  "优势",
  "劣势",
  "优点",
  "缺点",
  "特点",
  "主打",
  "提供",
  "关注",
  "对比",
  "全国连锁",
  "本土头部",
  "高性价比",
  "标准化",
  "婴幼儿",
  "友好",
  "低价",
  "全屋",
  "小店",
  "大厂",
  "梯队",
  "分级",
];

const sectionTitlePattern =
  /(TOP\s*(?:3|5|10|20)|推荐名单|排行榜|排名榜|榜单|排名如下|推荐如下|头部装修|本土装修|全国连锁|高性价比)/i;

const numberedPattern =
  /^(?:[-*•]\s*)?(?:第\s*)?(\d{1,2}|[一二三四五六七八九十]{1,3})\s*(?:名|位)?\s*[\.\、\)\）\]：:\-\s]+(.+)$/;
const rankFirstPattern =
  /^(?:[-*•]\s*)?第\s*(\d{1,2}|[一二三四五六七八九十]{1,3})\s*(?:名|位)\s*[：:\-\s]*(.+)$/;
const topPattern = /^(?:[-*•]\s*)?TOP\s*(\d{1,2})\s*[：:、\.\-\s]+(.+)$/i;
const brandThenRankPattern =
  /^(.{2,60}?)[｜|：:，,\s]+(?:综合|本地|本土|全国|推荐|口碑|装修)?\s*第\s*(\d{1,2}|[一二三四五六七八九十]{1,3})\s*(?:名|位)?(?:\b|$)/;
const brandThenFirstPattern = /^(.{2,60}?)[｜|：:，,\s]+(?:综合|本地|本土|全国|推荐|口碑|装修)?\s*(?:榜首|第一|首位|TOP\s*1)(?:\b|$)/i;

function parseChineseNumber(value: string) {
  if (value === "十") return 10;
  if (value.startsWith("十")) {
    return 10 + (chineseNumberMap[value.slice(1)] ?? 0);
  }
  if (value.endsWith("十")) {
    return (chineseNumberMap[value[0]] ?? 1) * 10;
  }
  if (value.includes("十")) {
    const [left, right] = value.split("十");
    return (chineseNumberMap[left] ?? 1) * 10 + (chineseNumberMap[right] ?? 0);
  }
  return chineseNumberMap[value] ?? null;
}

function parseRank(value: string) {
  const normalized = value.trim();
  if (/^\d+$/.test(normalized)) return Number(normalized);
  return parseChineseNumber(normalized);
}

function normalizeLines(answer: string) {
  return answer
    .replace(/\r/g, "\n")
    .replace(/([：:。；;])\s*(?=(?:\d{1,2}|[一二三四五六七八九十]{1,3})\s*[\.\、\)\）])/g, "$1\n")
    .replace(/([。；;])\s*(?=第\s*(?:\d{1,2}|[一二三四五六七八九十]{1,3})\s*(?:名|位))/g, "$1\n")
    .replace(/([。；;])\s*(?=TOP\s*\d{1,2}\s*[：:、\.\-\s])/gi, "$1\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function stripMarkdown(value: string) {
  return value
    .replace(/\*\*/g, "")
    .replace(/^\s*[-*•]\s*/, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

function normalizeBrandCandidate(value: string) {
  const stripped = stripMarkdown(value)
    .replace(/^[\s"'“”‘’（(【\[]+/, "")
    .replace(/^(?:推荐|首推|优先考虑|品牌|公司|商家|机构|榜单|名单)\s*/, "")
    .trim();

  const firstChunk = stripped
    .split(/[|\uFF5C:：,\uFF0C\u3002;\uFF1B()（）【】\[\]、\-—]/)[0]
    .trim();
  const descriptorFree = firstChunk
    .split(
      /(全国连锁|本地老牌|本土|整装交付|口碑|案例|预算|价格|报价|主打|适合|优势|特点|推荐|装修公司|品牌)/,
    )[0]
    .trim();

  return descriptorFree
    .replace(/(?:有限公司|有限责任公司|股份有限公司)$/g, "")
    .replace(/(?:装饰工程|装饰设计|建筑装饰|装修公司|装饰公司)$/g, (match) => {
      if (match === "装饰工程" || match === "装饰设计" || match === "建筑装饰") return "装饰";
      return "";
    })
    .replace(/(?:公司|品牌|机构|团队)$/g, "")
    .trim();
}

function hasCompanySuffix(value: string) {
  return companySuffixes.some((suffix) => value.endsWith(suffix));
}

function isBlockedCandidate(value: string) {
  const uiOrSectionNoise = [
    "\u5FEB\u901F",
    "\u65B0",
    "\u56FE\u50CF\u751F\u6210",
    "PPT \u751F\u6210",
    "\u5E2E\u6211\u5199\u4F5C",
    "\u89C6\u9891\u751F\u6210",
    "\u7FFB\u8BD1",
    "\u66F4\u591A",
    "\u8FDE\u9501\u5934\u90E8",
    "\u8865\u5145\u672C\u5730\u9AD8",
    "\u9009\u516C\u53F8\u907F\u5751\u5C0F\u5EFA\u8BAE",
  ];
  if (uiOrSectionNoise.some((term) => value === term || value.includes(term))) return true;
  if (!value || value.length < 2 || value.length > 20) return true;
  if (/https?:\/\//i.test(value)) return true;
  if (/^\d+$/.test(value)) return true;
  if (sectionTitlePattern.test(value)) return true;
  if (blockedExactTerms.some((term) => value === term)) return true;
  if (blockedFragments.some((fragment) => value.includes(fragment))) return true;
  if (/^[一二三四五六七八九十]+$/.test(value)) return true;
  return false;
}

function isLikelyBrand(value: string) {
  if (knownShortBrands.some((brand) => value === brand || value.includes(brand))) return true;
  if (isBlockedCandidate(value)) return false;
  if (hasCompanySuffix(value)) return true;
  return /^[\u4e00-\u9fa5A-Za-z0-9]{2,12}$/.test(value);
}

function canUseStandaloneBrandLine(line: string) {
  if (/[，,。；;：:]/.test(line) && !/[｜|]/.test(line)) return false;
  if (line.length > 32) return false;
  return true;
}

function isSectionTitle(line: string) {
  return sectionTitlePattern.test(line) || /^[一二三四五六七八九十]+[、.．]\s*.+(?:TOP|榜|排名|推荐|装修)/i.test(line);
}

function isChineseOrdinalSectionTitle(line: string) {
  return /^[一二三四五六七八九十]+[、.．]\s*.+(?:TOP|榜|排名|推荐|装修|连锁|本土|高性价比)/i.test(line);
}

function pushCandidate(
  candidates: RankedBrandCandidate[],
  input: {
    rank: number;
    brand: string;
    sourceText: string;
    reason: string;
  },
) {
  if (!isLikelyBrand(input.brand)) return false;

  candidates.push({
    ...input,
    order: candidates.length,
  });
  return true;
}

function dedupeAndRenumber(items: RankedBrandCandidate[]): RankedBrandTrace[] {
  const seenBrand = new Set<string>();
  const deduped: RankedBrandTrace[] = [];

  for (const item of items.sort((left, right) => left.order - right.order)) {
    const key = item.brand.toLowerCase();
    if (seenBrand.has(key)) continue;
    seenBrand.add(key);
    deduped.push({
      rank: deduped.length + 1,
      brand: item.brand,
      sourceText: item.sourceText,
      reason: item.reason,
    });
  }

  return deduped;
}

export function extractRankedBrandsWithTrace(answer: string): RankedBrandTrace[] {
  const candidates: RankedBrandCandidate[] = [];
  const lines = normalizeLines(answer);
  let sectionActive = false;
  let nextSectionRank = 1;

  for (const rawLine of lines) {
    const line = stripMarkdown(rawLine);
    if (!line) continue;

    if (isChineseOrdinalSectionTitle(line)) {
      sectionActive = true;
      nextSectionRank = 1;
      continue;
    }

    const brandThenFirst = line.match(brandThenFirstPattern);
    if (brandThenFirst) {
      const brand = normalizeBrandCandidate(brandThenFirst[1]);
      if (
        pushCandidate(candidates, {
          rank: nextSectionRank,
          brand,
          sourceText: line,
          reason: "命中“品牌｜榜首/第一”推荐格式",
        })
      ) {
        nextSectionRank += 1;
      }
      sectionActive = true;
      continue;
    }

    const brandThenRank = line.match(brandThenRankPattern);
    if (brandThenRank) {
      const brand = normalizeBrandCandidate(brandThenRank[1]);
      const parsedRank = parseRank(brandThenRank[2]);
      if (
        parsedRank &&
        pushCandidate(candidates, {
          rank: parsedRank,
          brand,
          sourceText: line,
          reason: "命中“品牌｜第 N”推荐格式",
        })
      ) {
        nextSectionRank = Math.max(nextSectionRank, parsedRank + 1);
      }
      sectionActive = true;
      continue;
    }

    const topMatch = line.match(topPattern);
    if (topMatch) {
      const rank = parseRank(topMatch[1]);
      const brand = normalizeBrandCandidate(topMatch[2]);
      if (rank) {
        pushCandidate(candidates, {
          rank,
          brand,
          sourceText: line,
          reason: "命中 TOPN 推荐排名格式",
        });
      }
      sectionActive = true;
      continue;
    }

    const rankFirst = line.match(rankFirstPattern) ?? line.match(numberedPattern);
    if (rankFirst) {
      const rank = parseRank(rankFirst[1]);
      const brand = normalizeBrandCandidate(rankFirst[2]);
      if (
        rank &&
        pushCandidate(candidates, {
          rank,
          brand,
          sourceText: line,
          reason: "命中序号/第 N 名推荐排名格式",
        })
      ) {
        nextSectionRank = Math.max(nextSectionRank, rank + 1);
      }
      sectionActive = true;
      continue;
    }

    if (isSectionTitle(line)) {
      sectionActive = true;
      nextSectionRank = 1;
      continue;
    }

    if (sectionActive && canUseStandaloneBrandLine(line)) {
      const brand = normalizeBrandCandidate(line);
      if (
        pushCandidate(candidates, {
          rank: nextSectionRank,
          brand,
          sourceText: line,
          reason: "位于 TOP/推荐榜单小节内，按出现顺序推断排名",
        })
      ) {
        nextSectionRank += 1;
      }
    }
  }

  return dedupeAndRenumber(candidates);
}

export function extractRankedBrands(answer: string): RankedBrandResult[] {
  return extractRankedBrandsWithTrace(answer).map(({ rank, brand }) => ({ rank, brand }));
}
