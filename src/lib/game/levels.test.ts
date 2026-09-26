import assert from "node:assert/strict";
import { test } from "node:test";
import { LEVELS } from "./levels.ts";
import { CAREERS, CHAPTERS, REWARDS, isLevelUnlocked, nextLevelId } from "./data.ts";
import { outputsMatch, runPython } from "./python.ts";

test("one hundred sequential levels", () => {
  assert.equal(LEVELS.length, 100);
  LEVELS.forEach((l, i) => {
    assert.equal(l.id, i + 1);
    assert.ok(l.steps.length > 0, `level ${l.id} has steps`);
    assert.ok(l.steps.some((s) => s.type === "code"), `level ${l.id} has a code challenge`);
    assert.ok(CHAPTERS.some((c) => c.id === l.chapter), `level ${l.id} chapter`);
    assert.ok(CAREERS.some((c) => c.id === l.careerUnlock), `level ${l.id} career`);
    assert.ok(REWARDS.some((r) => r.id === l.unlockRewardId && r.levelId === l.id), `level ${l.id} reward`);
  });
});

test("locking is sequential", () => {
  assert.equal(isLevelUnlocked(1, []), true);
  assert.equal(isLevelUnlocked(2, []), false);
  assert.equal(isLevelUnlocked(2, [1]), true);
  assert.equal(isLevelUnlocked(100, [1, 2, 3]), false);
  assert.equal(nextLevelId([]), 1);
  assert.equal(nextLevelId([1, 2, 3, 4, 5]), 6);
  assert.equal(nextLevelId([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]), 26);
});

test("every official solution prints the expected output", () => {
  const failures: string[] = [];
  for (const level of LEVELS) {
    for (const step of level.steps) {
      if (step.type !== "code") continue;
      const { challenge } = step;
      const result = runPython(challenge.solution);
      if (!result.ok) {
        failures.push(`L${level.id} ${challenge.id}: ${result.error?.kind} ${result.error?.message}`);
        continue;
      }
      if (!outputsMatch(result.stdout, challenge.expected)) {
        failures.push(
          `L${level.id} ${challenge.id}: got ${JSON.stringify(result.stdout)} expected ${JSON.stringify(challenge.expected)}`,
        );
      }
    }
  }
  assert.deepEqual(failures, []);
});

test("championships are mid and finale", () => {
  const champs = LEVELS.filter((l) => l.championship).map((l) => l.id);
  assert.deepEqual(champs, [5, 25, 50, 75, 100]);
  assert.equal(LEVELS[24].finale, undefined);
  assert.equal(LEVELS[49].finale, undefined);
  assert.equal(LEVELS[74].finale, undefined);
  assert.equal(LEVELS[99].finale, true);
});
