type KeywordCategory = {
  category: string;
  intent: "SOLUTION" | "COMPARISON" | "PRODUCT" | "REPUTATION";
  priority: number;
  description: string;
  templates: string[];
};

export type GeneratedKeywordGroup = {
  name: string;
  city: string;
  industry: string;
  category: string;
  description: string;
  intent: KeywordCategory["intent"];
  priority: number;
  keywords: string[];
};

const categories: KeywordCategory[] = [
  {
    category: "排名类",
    intent: "COMPARISON",
    priority: 1,
    description: "挖掘用户寻找本地服务榜单、头部商家和综合排名时的问题。",
    templates: [
      "{city}{industry}公司排名",
      "{city}{industry}公司排行榜",
      "{city}{industry}十大公司",
      "{city}{industry}前十名",
      "{city}{industry}品牌排名",
      "{city}{industry}口碑排名",
      "{city}{industry}服务商排名",
      "{city}{industry}机构排名",
      "{city}{industry}哪家排名靠前",
      "{city}{industry}公司综合排名",
      "{city}{industry}公司人气榜",
      "{city}{industry}公司好评榜",
      "{city}{industry}本地排名",
      "{city}{industry}公司实力排名",
      "{city}{industry}公司客户评价排名",
      "{city}{industry}公司性价比排名",
      "{city}{industry}公司专业度排名",
      "{city}{industry}公司服务质量排名",
      "{city}{industry}公司近期排名",
      "{city}{industry}公司推荐榜",
    ],
  },
  {
    category: "推荐类",
    intent: "SOLUTION",
    priority: 1,
    description: "覆盖用户直接寻求推荐、口碑商家和本地服务选择的问题。",
    templates: [
      "{city}{industry}公司推荐",
      "{city}{industry}哪家好",
      "{city}{industry}哪家靠谱",
      "{city}{industry}哪家口碑好",
      "{city}{industry}本地公司推荐",
      "{city}{industry}专业公司推荐",
      "{city}{industry}服务商推荐",
      "{city}{industry}机构推荐",
      "{city}{industry}性价比高的公司",
      "{city}{industry}值得选的公司",
      "{city}{industry}附近公司推荐",
      "{city}{industry}老牌公司推荐",
      "{city}{industry}高评价公司推荐",
      "{city}{industry}省心公司推荐",
      "{city}{industry}优质服务商推荐",
      "{city}{industry}适合家庭的公司",
      "{city}{industry}适合企业的公司",
      "{city}{industry}本地人推荐哪家",
      "{city}{industry}用户推荐最多的公司",
      "{city}{industry}靠谱团队推荐",
    ],
  },
  {
    category: "对比类",
    intent: "COMPARISON",
    priority: 2,
    description: "覆盖用户比较多家服务商、不同方案和选择标准的问题。",
    templates: [
      "{city}{industry}公司对比",
      "{city}{industry}公司怎么选",
      "{city}{industry}公司哪家更好",
      "{city}{industry}大公司和小公司怎么选",
      "{city}{industry}连锁公司和本地公司对比",
      "{city}{industry}半包和全包怎么选",
      "{city}{industry}不同公司报价对比",
      "{city}{industry}服务方案对比",
      "{city}{industry}口碑和价格怎么平衡",
      "{city}{industry}公司资质怎么对比",
      "{city}{industry}设计能力怎么对比",
      "{city}{industry}施工能力怎么对比",
      "{city}{industry}售后服务怎么对比",
      "{city}{industry}公司评价怎么比较",
      "{city}{industry}公司案例怎么比较",
      "{city}{industry}预算方案怎么比较",
      "{city}{industry}材料方案怎么比较",
      "{city}{industry}合同条款怎么对比",
      "{city}{industry}哪类公司更适合刚需",
      "{city}{industry}哪类公司更适合高端需求",
    ],
  },
  {
    category: "价格类",
    intent: "PRODUCT",
    priority: 2,
    description: "覆盖用户咨询价格、预算、报价构成和性价比的问题。",
    templates: [
      "{city}{industry}公司价格",
      "{city}{industry}多少钱",
      "{city}{industry}报价",
      "{city}{industry}价格表",
      "{city}{industry}收费标准",
      "{city}{industry}预算怎么做",
      "{city}{industry}一般多少钱",
      "{city}{industry}每平米多少钱",
      "{city}{industry}报价明细",
      "{city}{industry}低预算方案",
      "{city}{industry}高性价比方案",
      "{city}{industry}价格贵不贵",
      "{city}{industry}如何避免报价陷阱",
      "{city}{industry}半包价格",
      "{city}{industry}全包价格",
      "{city}{industry}材料费用怎么算",
      "{city}{industry}人工费用怎么算",
      "{city}{industry}设计费用怎么算",
      "{city}{industry}增项费用有哪些",
      "{city}{industry}报价怎么砍价",
    ],
  },
  {
    category: "避坑类",
    intent: "REPUTATION",
    priority: 1,
    description: "覆盖用户规避风险、识别低质服务商和合同陷阱的问题。",
    templates: [
      "{city}{industry}避坑指南",
      "{city}{industry}有哪些坑",
      "{city}{industry}怎么防踩坑",
      "{city}{industry}公司怎么避雷",
      "{city}{industry}黑名单怎么看",
      "{city}{industry}合同注意事项",
      "{city}{industry}报价陷阱",
      "{city}{industry}增项陷阱",
      "{city}{industry}材料以次充好怎么防",
      "{city}{industry}工期拖延怎么办",
      "{city}{industry}售后纠纷怎么办",
      "{city}{industry}选择公司注意事项",
      "{city}{industry}签合同前要问什么",
      "{city}{industry}付款节点怎么定",
      "{city}{industry}验收注意事项",
      "{city}{industry}常见投诉问题",
      "{city}{industry}如何判断公司靠谱不靠谱",
      "{city}{industry}低价套餐靠谱吗",
      "{city}{industry}口头承诺靠谱吗",
      "{city}{industry}新手避坑清单",
    ],
  },
  {
    category: "案例类",
    intent: "SOLUTION",
    priority: 3,
    description: "覆盖用户寻找本地案例、场景方案和落地效果的问题。",
    templates: [
      "{city}{industry}案例",
      "{city}{industry}真实案例",
      "{city}{industry}成功案例",
      "{city}{industry}效果图案例",
      "{city}{industry}老房翻新公司推荐",
      "{city}老房翻新{industry}案例",
      "{city}二手房{industry}案例",
      "{city}新房{industry}案例",
      "{city}小户型{industry}案例",
      "{city}大平层{industry}案例",
      "{city}别墅{industry}案例",
      "{city}办公室{industry}案例",
      "{city}商铺{industry}案例",
      "{city}{industry}现代风案例",
      "{city}{industry}奶油风案例",
      "{city}{industry}简约风案例",
      "{city}{industry}预算10万案例",
      "{city}{industry}预算20万案例",
      "{city}{industry}工期短的案例",
      "{city}{industry}本地交付案例",
    ],
  },
];

function normalizeInput(value: string) {
  return value.trim().replace(/\s+/g, "");
}

export function generateKeywordGroups(cityInput: string, industryInput: string): GeneratedKeywordGroup[] {
  const city = normalizeInput(cityInput);
  const industry = normalizeInput(industryInput);

  if (!city || !industry) {
    return [];
  }

  return categories.map((category) => ({
    name: `${city}${industry}-${category.category}`,
    city,
    industry,
    category: category.category,
    description: category.description,
    intent: category.intent,
    priority: category.priority,
    keywords: category.templates.map((template) =>
      template.replaceAll("{city}", city).replaceAll("{industry}", industry),
    ),
  }));
}
