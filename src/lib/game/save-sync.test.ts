import assert from "node:assert/strict";
import { test } from "node:test";
import { deliveredGigs, gigEarnings, mergeSaves, portfolioSummaryText, skillCounts, snapshotSave } from "./save-sync.ts";
import { SAVE_VERSION, type GigRecord, type SaveState } from "./types.ts";

function rec(partial: Partial<GigRecord> & Pick<GigRecord, "jobId">): GigRecord {
  return {
    completedAt: 1,
    stars: 5,
    review: "Clean work.",
    skills: ["print()"],
    difficulty: "Easy",
    pay: 200,
    bonus: 40,
    xp: 40,
    attempts: 1,
    hintsUsed: 0,
    showedSolution: false,
    durationSec: 12,
    practice: false,
    ...partial,
  };
}

function base(partial: Partial<SaveState> = {}): SaveState {
  return {
    version: SAVE_VERSION,
    playerName: "Player",
    hasStarted: false,
    coins: 500,
    xp: 0,
    completedLevels: [],
    unlockedRewards: [],
    career: "rookie",
    highestLevel: 0,
    muted: false,
    gigCompletions: [],
    walletLedger: [],
    phoneMessages: [],
    unreadGigIds: [],
    ...partial,
  };
}

test("delivered gigs skip practice runs", () => {
  const rows = [rec({ jobId: "a" }), rec({ jobId: "a", practice: true, pay: 0 })];
  assert.equal(deliveredGigs(rows).length, 1);
  assert.equal(gigEarnings(rows), 240);
  assert.deepEqual(
    skillCounts(rows).map((s) => s.skill),
    ["print()"],
  );
});

test("merge keeps union of progress and the better gig rating", () => {
  const local = base({
    playerName: "Ada",
    hasStarted: true,
    coins: 800,
    xp: 120,
    completedLevels: [1],
    career: "trainee",
    highestLevel: 1,
    gigCompletions: [rec({ jobId: "gig-cafe-open", stars: 4, pay: 220, bonus: 0 })],
  });
  const remote = base({
    playerName: "Player",
    hasStarted: true,
    coins: 1200,
    xp: 90,
    completedLevels: [1, 2],
    career: "junior",
    highestLevel: 2,
    gigCompletions: [rec({ jobId: "gig-cafe-open", stars: 5, pay: 220, bonus: 44, completedAt: 9 })],
  });
  const merged = mergeSaves(local, remote);
  assert.equal(merged.playerName, "Ada");
  assert.equal(merged.coins, 1200);
  assert.equal(merged.xp, 120);
  assert.deepEqual(merged.completedLevels, [1, 2]);
  assert.equal(merged.career, "junior");
  assert.equal(merged.gigCompletions[0].stars, 5);
  assert.equal(merged.gigCompletions[0].bonus, 44);
});

test("snapshot copies persistable fields", () => {
  const s = snapshotSave(base({ playerName: "Sam", coins: 9 }));
  assert.equal(s.playerName, "Sam");
  assert.equal(s.coins, 9);
  assert.equal(s.version, SAVE_VERSION);
});

test("portfolio summary is plain text a player can copy", () => {
  const text = portfolioSummaryText({
    name: "Sam",
    career: "Trainee",
    records: [rec({ jobId: "gig-cafe-open" })],
    titles: { "gig-cafe-open": "Cafe chalkboard" },
  });
  assert.match(text, /Sam/);
  assert.match(text, /Cafe chalkboard — 5\/5/);
  assert.match(text, /not real employment/i);
});
