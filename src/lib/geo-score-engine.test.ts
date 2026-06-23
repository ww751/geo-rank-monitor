import { strict as assert } from "node:assert";
import { buildGeoScoreBreakdown, countValidUrls, getRankingScore } from "@/lib/geo-score-engine";

assert.equal(getRankingScore(1), 50);
assert.equal(getRankingScore(2), 40);
assert.equal(getRankingScore(3), 30);
assert.equal(getRankingScore(10), 20);
assert.equal(getRankingScore(11), 0);

assert.equal(countValidUrls(["https://example.com", "http://example.com/a", "not-a-url"]), 2);

assert.deepEqual(
  buildGeoScoreBreakdown({
    brandVisible: true,
    rank: 2,
    citationUrls: ["https://example.com", "invalid"],
    coveredKeywordCount: 3,
  }),
  {
    visibilityScore: 30,
    rankingScore: 40,
    citationScore: 5,
    coverageScore: 10,
    totalScore: 85,
  },
);

assert.deepEqual(
  buildGeoScoreBreakdown({
    brandVisible: false,
    rank: 1,
    citationUrls: ["https://example.com"],
    coveredKeywordCount: 5,
  }),
  {
    visibilityScore: 0,
    rankingScore: 0,
    citationScore: 0,
    coverageScore: 0,
    totalScore: 0,
  },
);

assert.equal(
  buildGeoScoreBreakdown({
    brandVisible: true,
    rank: 1,
    citationUrls: ["https://a.com", "https://b.com", "https://c.com", "https://d.com", "https://e.com"],
    coveredKeywordCount: 8,
  }).totalScore,
  100,
);

console.log("GEO score engine tests passed.");
