import assert from "node:assert/strict";
import { resolveBrandEntities } from "./brand-entity-resolver";

const answer = `
济南装修公司排名可以重点参考：
1. 万泰装饰，济南本地老牌装修公司。
2. 业之峰装饰，全国连锁，设计和施工体系成熟。
3. 圣都整装，整装交付能力较强。
4. 城市人家装饰，本地案例较多。
5. 生活家装饰，适合关注环保家装的业主。
另外，选择时要看高端设计、空间设计、基础设计、全案设计、主创设计、施工工艺和设计理念，不要只看报价。
`;

const result = resolveBrandEntities({
  answer,
  databaseBrands: ["万泰装饰"],
  competitorBrands: ["业之峰装饰", "圣都整装", "城市人家装饰"],
});

assert.deepEqual(result.brandsFound, ["万泰装饰", "业之峰装饰", "圣都整装", "城市人家装饰", "生活家装饰"]);
assert.equal(result.brandsFound.length, 5);
for (const genericTerm of ["高端设计", "空间设计", "环保家装", "基础设计", "全案设计", "主创设计", "施工工艺", "设计理念"]) {
  assert.equal(result.brandsFound.includes(genericTerm), false, `${genericTerm} should not be a brand`);
}
assert.equal(result.filteredBrands.includes("高端设计"), true);
assert.equal(result.rawCandidates.includes("高端设计"), true);

console.log("Brand Entity Resolver test passed.");
