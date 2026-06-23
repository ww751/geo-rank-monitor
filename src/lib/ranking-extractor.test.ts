import assert from "node:assert/strict";
import { extractRankedBrands } from "./ranking-extractor";

const standardAnswer = `
济南装修公司排名 TOP10 推荐名单如下：
1. 万泰装饰，本地老牌装修公司。
2. 业之峰，全国连锁品牌。
3. 圣都整装，整装交付能力较强。
4. 城市人家装饰，本地案例较多。
选择时还要看高端设计、空间设计、施工工艺和设计理念。
`;

const standardResult = extractRankedBrands(standardAnswer);

assert.deepEqual(standardResult.slice(0, 4), [
  { rank: 1, brand: "万泰装饰" },
  { rank: 2, brand: "业之峰" },
  { rank: 3, brand: "圣都整装" },
  { rank: 4, brand: "城市人家装饰" },
]);
assert.equal(standardResult.some((item) => item.brand === "高端设计"), false);
assert.equal(standardResult.some((item) => item.brand === "空间设计"), false);
assert.equal(standardResult.some((item) => item.brand === "施工工艺"), false);

const doubaoAnswer = `
2026 章丘装修公司分级排名（分全国连锁大牌 + 章丘本土大厂 + 高性价比小店，按预算筛选）

一、全国连锁整装 TOP5
金螳螂家（章丘店）｜综合第 1
圣都整装
东易日盛
业之峰
城市人家

二、章丘本土头部装修 TOP5
娜蓝之家装饰｜本土榜首
煜诚装饰
盛境装饰
绿港装饰
南国鼎峰装饰
`;

const doubaoResult = extractRankedBrands(doubaoAnswer);

assert.deepEqual(doubaoResult.slice(0, 10), [
  { rank: 1, brand: "金螳螂家" },
  { rank: 2, brand: "圣都整装" },
  { rank: 3, brand: "东易日盛" },
  { rank: 4, brand: "业之峰" },
  { rank: 5, brand: "城市人家" },
  { rank: 6, brand: "娜蓝之家装饰" },
  { rank: 7, brand: "煜诚装饰" },
  { rank: 8, brand: "盛境装饰" },
  { rank: 9, brand: "绿港装饰" },
  { rank: 10, brand: "南国鼎峰装饰" },
]);

console.log("Ranking Extractor test passed.");
