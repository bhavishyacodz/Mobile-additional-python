import { CAREERS } from "./data.ts";
import type { CareerId, GigRecord, LedgerEntry, PhoneMessage, SaveState } from "./types.ts";
import { SAVE_VERSION } from "./types.ts";

export function deliveredGigs(records: GigRecord[]): GigRecord[] {
  return records.filter((g) => !g.practice);
}

export function gigEarnings(records: GigRecord[]): number {
  return deliveredGigs(records).reduce((n, r) => n + r.pay + r.bonus, 0);
}

export function skillCounts(records: GigRecord[]): { skill: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of deliveredGigs(records)) {
    for (const skill of r.skills) {
      map.set(skill, (map.get(skill) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill));
}

function pickCareer(a: CareerId, b: CareerId): CareerId {
  const ra = CAREERS.find((c) => c.id === a)?.rank ?? 0;
  const rb = CAREERS.find((c) => c.id === b)?.rank ?? 0;
  return rb > ra ? b : a;
}

function mergeGigs(a: GigRecord[], b: GigRecord[]): GigRecord[] {
  const byKey = new Map<string, GigRecord>();
  const put = (r: GigRecord) => {
    const key = r.practice ? `p:${r.jobId}:${r.completedAt}` : r.jobId;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, r);
      return;
    }
    if (r.stars > prev.stars || (r.stars === prev.stars && r.completedAt > prev.completedAt)) {
      byKey.set(key, r);
    }
  };
  for (const r of a) put(r);
  for (const r of b) put(r);
  return [...byKey.values()].sort((x, y) => y.completedAt - x.completedAt);
}

function mergeById<T extends { id: string }>(a: T[], b: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of [...b, ...a]) map.set(item.id, item);
  return [...map.values()].sort((x, y) => {
    const ax = "at" in x ? Number((x as { at?: number }).at) : 0;
    const ay = "at" in y ? Number((y as { at?: number }).at) : 0;
    return ay - ax;
  });
}

function nicerName(a: string, b: string): string {
  const an = a.trim();
  const bn = b.trim();
  if (an && an !== "Player") return an.slice(0, 24);
  if (bn && bn !== "Player") return bn.slice(0, 24);
  return an || bn || "Player";
}

export function snapshotSave(s: SaveState): SaveState {
  return {
    version: SAVE_VERSION,
    playerName: s.playerName,
    hasStarted: s.hasStarted,
    coins: s.coins,
    xp: s.xp,
    completedLevels: [...s.completedLevels],
    unlockedRewards: [...s.unlockedRewards],
    career: s.career,
    highestLevel: s.highestLevel,
    muted: s.muted,
    gigCompletions: [...s.gigCompletions],
    walletLedger: [...s.walletLedger],
    phoneMessages: [...s.phoneMessages],
    unreadGigIds: [...s.unreadGigIds],
  };
}

export function mergeSaves(local: SaveState, remote: SaveState): SaveState {
  const completedLevels = [...new Set([...local.completedLevels, ...remote.completedLevels])].sort((a, b) => a - b);
  const gigCompletions = mergeGigs(local.gigCompletions, remote.gigCompletions);
  const walletLedger = mergeById<LedgerEntry>(local.walletLedger, remote.walletLedger);
  const phoneMessages = mergeById<PhoneMessage>(local.phoneMessages, remote.phoneMessages);
  return {
    version: SAVE_VERSION,
    playerName: nicerName(local.playerName, remote.playerName),
    hasStarted: local.hasStarted || remote.hasStarted,
    coins: Math.max(local.coins, remote.coins),
    xp: Math.max(local.xp, remote.xp),
    completedLevels,
    unlockedRewards: [...new Set([...local.unlockedRewards, ...remote.unlockedRewards])],
    career: pickCareer(local.career, remote.career),
    highestLevel: Math.max(local.highestLevel, remote.highestLevel, ...completedLevels, 0),
    muted: local.muted,
    gigCompletions,
    walletLedger,
    phoneMessages,
    unreadGigIds: [...new Set([...local.unreadGigIds, ...remote.unreadGigIds])],
  };
}

export function portfolioSummaryText(opts: {
  name: string;
  career: string;
  records: GigRecord[];
  titles: Record<string, string>;
}): string {
  const delivered = deliveredGigs(opts.records);
  const earned = gigEarnings(delivered);
  const lines = [
    `${opts.name} · ${opts.career}`,
    `${delivered.length} simulated freelance project${delivered.length === 1 ? "" : "s"} · ${earned.toLocaleString()} virtual coins`,
    ...delivered.slice(0, 12).map((r) => {
      const title = opts.titles[r.jobId] ?? r.jobId;
      return `• ${title} — ${r.stars}/5`;
    }),
    "Simulated clients and pay. Python practice only — not real employment.",
  ];
  return lines.join("\n");
}
