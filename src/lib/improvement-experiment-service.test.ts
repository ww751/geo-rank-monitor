import assert from "node:assert/strict";
import {
  classifyExperimentStatus,
  formatRank,
  rankLiftLabel,
  scoreLiftLabel,
} from "@/lib/improvement-experiment-service";

assert.equal(formatRank(null), "未出现");
assert.equal(formatRank(1), "第 1");
assert.equal(rankLiftLabel(null, 1), "未出现 -> 第 1");
assert.equal(rankLiftLabel(8, 3), "第 8 -> 第 3");
assert.equal(scoreLiftLabel(0, 80), "0 -> 80");
assert.equal(scoreLiftLabel(30, null), "30 -> 待验证");

assert.equal(classifyExperimentStatus({}), "PLANNED");
assert.equal(classifyExperimentStatus({ baselineRankResultId: "baseline" }), "BASELINE_COLLECTED");
assert.equal(
  classifyExperimentStatus({ baselineRankResultId: "baseline", replayRankResultId: "replay" }),
  "OPTIMIZATION_REPLAYED",
);
assert.equal(
  classifyExperimentStatus({
    baselineRankResultId: "baseline",
    replayRankResultId: "replay",
    validationRankResultId: "validation",
  }),
  "REAL_VALIDATED",
);

console.log("Improvement experiment service tests passed.");
