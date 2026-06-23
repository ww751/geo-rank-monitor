import assert from "node:assert/strict";
import { priorityForScore, recommendationForKeyword } from "@/lib/optimization-task-generator";

const rankingRecommendation = recommendationForKeyword("章丘装修公司排名");
assert.match(rankingRecommendation, /推荐\/对比页/);
assert.match(rankingRecommendation, /第三方引用来源/);

const priceRecommendation = recommendationForKeyword("章丘装修公司价格");
assert.match(priceRecommendation, /价格说明页/);
assert.match(priceRecommendation, /报价区间/);

const caseRecommendation = recommendationForKeyword("章丘旧房翻新案例");
assert.match(caseRecommendation, /案例型内容/);
assert.match(caseRecommendation, /客户评价/);

assert.equal(priorityForScore(65, 20), "HIGH");
assert.equal(priorityForScore(78, 20), "MEDIUM");
assert.equal(priorityForScore(90, 50), "LOW");

console.log("Optimization task generator tests passed.");
