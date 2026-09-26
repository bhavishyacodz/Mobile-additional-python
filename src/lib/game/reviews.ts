import type { CodeRunStats, FreelanceJob } from "./types.ts";

export type GigScore = {
  stars: number;
  bonus: number;
  title: string;
  review: string;
};

const FIVE = [
  "Clean, readable, and exactly on brief. Would hire again for the next sprint.",
  "Shipped on the first pass. The script does one job and does it well.",
  "Precise output, no extra noise. This is how a tiny tool should look.",
  "Solid craft. We dropped this straight into the practice sandbox.",
];

const FOUR = [
  "Works as specified. A couple of extra tries, but the result is trustworthy.",
  "Good delivery. Next time, aim to land it with fewer hints.",
  "Correct and tidy. Close to a five — just a little slower to land.",
  "We can use this. Small wobble on the way, then a clean finish.",
];

const THREE = [
  "It passes. The path was bumpier than we'd like, but the output matches.",
  "Acceptable. Consider solving without opening the working code next time.",
  "Done. Functional, not elegant — still meets the contract.",
  "Thanks for pushing through. Review the briefing once more on similar gigs.",
];

const TWO = [
  "Output is correct, process was rough. Revisit the concept before the next client job.",
  "We accepted it, with notes. Try the hints one at a time instead of the full solution.",
  "It works. Let's tighten the first attempt on the next one.",
];

const ONE = [
  "Barely cleared. Replay a learning mission on this topic before more client work.",
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function pick(id: string, stars: number, list: string[]): string {
  return list[(hash(id) + stars) % list.length];
}

export function scoreGig(job: FreelanceJob, stats: CodeRunStats): GigScore {
  let stars: number;
  if (stats.attempts === 1 && stats.hintsUsed === 0 && !stats.showedSolution) {
    stars = 5;
  } else if (stats.showedSolution) {
    stars = stats.attempts >= 8 ? 1 : stats.attempts >= 5 ? 2 : 3;
  } else if (stats.attempts <= 2 && stats.hintsUsed <= 1) {
    stars = 4;
  } else if (stats.attempts <= 4 && stats.hintsUsed <= 2) {
    stars = 4;
  } else if (stats.attempts <= 6) {
    stars = 3;
  } else {
    stars = 2;
  }
  stars = Math.max(1, Math.min(5, stars));

  const bonusPct = stars === 5 ? 0.2 : stars === 4 ? 0.1 : 0;
  const bonus = Math.round(job.pay * bonusPct);
  const pool = stars >= 5 ? FIVE : stars === 4 ? FOUR : stars === 3 ? THREE : stars === 2 ? TWO : ONE;
  const title =
    stars >= 5 ? "Excellent" : stars === 4 ? "Great work" : stars === 3 ? "Accepted" : stars === 2 ? "Needs polish" : "Barely cleared";
  return {
    stars,
    bonus,
    title,
    review: pick(job.id, stars, pool),
  };
}

export function reliabilityFromStars(stars: number[]): number {
  if (!stars.length) return 0;
  const avg = stars.reduce((a, b) => a + b, 0) / stars.length;
  return Math.round(avg * 10) / 10;
}
