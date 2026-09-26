import assert from "node:assert/strict";
import { test } from "node:test";
import { GIGS, GIG_LANES, gigsNewlyUnlocked, isGigUnlocked, unlockedGigs } from "./freelance.ts";
import { outputsMatch, runPython } from "./python.ts";
import { scoreGig } from "./reviews.ts";

test("fifty freelance gigs across ten lanes", () => {
  assert.equal(GIGS.length, 50);
  assert.equal(GIG_LANES.length, 10);
  const ids = new Set(GIGS.map((g) => g.id));
  assert.equal(ids.size, 50);
  for (const g of GIGS) {
    assert.ok(GIG_LANES.some((l) => l.id === g.lane), g.id);
    assert.equal(g.challenge.id, g.id);
    assert.ok(g.pay > 0 && g.xp > 0, g.id);
    assert.ok(g.skills.length > 0, g.id);
    assert.ok(g.unlockAfter >= 1, g.id);
  }
  for (const lane of GIG_LANES) {
    const n = GIGS.filter((g) => g.lane === lane.id).length;
    assert.equal(n, 5, lane.id);
  }
});

test("every gig solution prints the expected output", () => {
  const failures: string[] = [];
  for (const g of GIGS) {
    const result = runPython(g.challenge.solution);
    if (!result.ok) {
      failures.push(`${g.id}: ${result.error?.kind} ${result.error?.message}`);
      continue;
    }
    if (!outputsMatch(result.stdout, g.challenge.expected)) {
      failures.push(`${g.id}: got ${JSON.stringify(result.stdout)} expected ${JSON.stringify(g.challenge.expected)}`);
    }
  }
  assert.deepEqual(failures, []);
});

test("gigs unlock by highest completed learning level", () => {
  assert.equal(unlockedGigs([]).length, 0);
  assert.equal(isGigUnlocked(GIGS[0], []), false);
  assert.ok(unlockedGigs([1]).length >= 5);
  const afterFive = unlockedGigs([1, 2, 3, 4, 5]);
  assert.ok(afterFive.every((g) => g.unlockAfter <= 5));
  const newly = gigsNewlyUnlocked(1, 5);
  assert.ok(newly.every((g) => g.unlockAfter > 1 && g.unlockAfter <= 5));
});

test("review score rewards clean first-try work", () => {
  const job = GIGS[0];
  const clean = scoreGig(job, { attempts: 1, hintsUsed: 0, showedSolution: false, elapsedMs: 4000 });
  assert.equal(clean.stars, 5);
  assert.ok(clean.bonus > 0);
  const peeked = scoreGig(job, { attempts: 4, hintsUsed: 2, showedSolution: true, elapsedMs: 40000 });
  assert.ok(peeked.stars <= 3);
  assert.equal(peeked.bonus, 0);
});
