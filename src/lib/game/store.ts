import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CAREERS, LEVELS, STARTING_COINS, isLevelUnlocked, levelById, playerLevelFromXp } from "./data.ts";
import { gigById, gigsNewlyUnlocked, unlockedGigs } from "./freelance.ts";
import { scoreGig } from "./reviews.ts";
import type {
  CareerId,
  CodeRunStats,
  GigRecord,
  LedgerEntry,
  PhoneAppId,
  PhoneMessage,
  SaveState,
  Screen,
  TabId,
} from "./types.ts";
import { SAVE_VERSION } from "./types.ts";
import { snapshotSave, mergeSaves } from "./save-sync.ts";
import { audio } from "./audio.ts";

const KEY = "jarvis_career_save";

const defaults = (): SaveState => ({
  version: SAVE_VERSION,
  playerName: "Player",
  hasStarted: false,
  coins: STARTING_COINS,
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
});

function asGigRecords(raw: unknown): GigRecord[] {
  if (!Array.isArray(raw)) return [];
  const out: GigRecord[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Partial<GigRecord>;
    if (typeof r.jobId !== "string") continue;
    out.push({
      jobId: r.jobId,
      completedAt: Number(r.completedAt) || Date.now(),
      stars: Math.max(1, Math.min(5, Math.floor(Number(r.stars) || 3))),
      review: typeof r.review === "string" ? r.review : "",
      skills: Array.isArray(r.skills) ? r.skills.filter((x) => typeof x === "string") : [],
      difficulty: r.difficulty ?? "Easy",
      pay: Math.max(0, Math.floor(Number(r.pay) || 0)),
      bonus: Math.max(0, Math.floor(Number(r.bonus) || 0)),
      xp: Math.max(0, Math.floor(Number(r.xp) || 0)),
      attempts: Math.max(1, Math.floor(Number(r.attempts) || 1)),
      hintsUsed: Math.max(0, Math.floor(Number(r.hintsUsed) || 0)),
      showedSolution: Boolean(r.showedSolution),
      durationSec: Math.max(0, Math.floor(Number(r.durationSec) || 0)),
      practice: Boolean(r.practice),
    });
  }
  return out;
}

function asLedger(raw: unknown): LedgerEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object" && typeof (x as LedgerEntry).id === "string")
    .map((x) => {
      const e = x as Partial<LedgerEntry>;
      return {
        id: String(e.id),
        at: Number(e.at) || Date.now(),
        amount: Math.floor(Number(e.amount) || 0),
        label: typeof e.label === "string" ? e.label : "Payment",
        kind: e.kind === "bonus" ? "bonus" : "gig",
      };
    });
}

function asMessages(raw: unknown): PhoneMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object" && typeof (x as PhoneMessage).id === "string")
    .map((x) => {
      const m = x as Partial<PhoneMessage>;
      return {
        id: String(m.id),
        from: typeof m.from === "string" ? m.from : "Client",
        company: typeof m.company === "string" ? m.company : "",
        body: typeof m.body === "string" ? m.body : "",
        at: Number(m.at) || Date.now(),
        kind: m.kind === "thanks" || m.kind === "system" ? m.kind : "offer",
        jobId: typeof m.jobId === "string" ? m.jobId : undefined,
        read: Boolean(m.read),
      };
    });
}

function migrate(raw: unknown): SaveState {
  const base = defaults();
  if (!raw || typeof raw !== "object") return base;
  const s = raw as Partial<SaveState>;
  const completed = Array.isArray(s.completedLevels)
    ? s.completedLevels.filter((n) => typeof n === "number" && n >= 1 && n <= LEVELS.length)
    : [];
  const rewards = Array.isArray(s.unlockedRewards) ? s.unlockedRewards.filter((x) => typeof x === "string") : [];
  const career = CAREERS.some((c) => c.id === s.career) ? (s.career as CareerId) : "rookie";
  const next: SaveState = {
    ...base,
    version: SAVE_VERSION,
    playerName: typeof s.playerName === "string" && s.playerName.trim() ? s.playerName.trim().slice(0, 24) : "Player",
    hasStarted: Boolean(s.hasStarted),
    coins: Math.max(0, Math.floor(Number(s.coins) || 0)),
    xp: Math.max(0, Math.floor(Number(s.xp) || 0)),
    completedLevels: [...new Set(completed)],
    unlockedRewards: [...new Set(rewards)],
    career,
    highestLevel: Math.max(0, ...completed, Number(s.highestLevel) || 0),
    muted: Boolean(s.muted),
    gigCompletions: asGigRecords(s.gigCompletions),
    walletLedger: asLedger(s.walletLedger),
    phoneMessages: asMessages(s.phoneMessages),
    unreadGigIds: Array.isArray(s.unreadGigIds) ? s.unreadGigIds.filter((x) => typeof x === "string") : [],
  };
  if (!next.unreadGigIds.length && !next.phoneMessages.length && next.highestLevel > 0) {
    const done = new Set(next.gigCompletions.filter((g) => !g.practice).map((g) => g.jobId));
    next.unreadGigIds = unlockedGigs(next.completedLevels)
      .map((g) => g.id)
      .filter((id) => !done.has(id));
  }
  return next;
}

export type PendingFlow = {
  firstClear: boolean;
  levelId: number;
  prevLevel: number;
  nextLevel: number;
  prevCareer: CareerId;
  nextCareer: CareerId;
};

type GameStore = SaveState & {
  screen: Screen;
  tab: TabId;
  toast: string | null;
  hydrated: boolean;
  shakeLock: number;
  pending: PendingFlow | null;
  phoneOpen: boolean;
  phoneApp: PhoneAppId;
  setHydrated: () => void;
  startCareer: () => void;
  setTab: (tab: TabId) => void;
  setName: (name: string) => void;
  toggleMute: () => void;
  tryPlay: () => void;
  openLevel: (id: number) => void;
  beginMission: (id: number) => void;
  abortMission: () => void;
  finishMission: (id: number, score?: number) => void;
  continueFrom: () => void;
  claimFinal: () => void;
  resetProgress: () => void;
  flash: (msg: string) => void;
  openPhone: (app?: PhoneAppId) => void;
  closePhone: () => void;
  setPhoneApp: (app: PhoneAppId) => void;
  markMessagesRead: () => void;
  openGig: (jobId: string) => void;
  beginGig: (jobId: string) => void;
  abortGig: () => void;
  finishGig: (jobId: string, stats: CodeRunStats) => void;
  applyRemoteSave: (remote: SaveState | null, displayName?: string | null) => void;
};

let toastTimer: ReturnType<typeof setTimeout> | undefined;

function champClaim(p: PendingFlow): Screen | null {
  if (!p.firstClear) return null;
  const lv = levelById(p.levelId);
  if (lv?.championship) return { id: "claim", levelId: p.levelId };
  return null;
}

function nextAfterComplete(p: PendingFlow): Screen {
  if (p.nextLevel > p.prevLevel) {
    return { id: "levelup", from: p.prevLevel, to: p.nextLevel };
  }
  if (p.firstClear && p.nextCareer !== p.prevCareer) {
    return { id: "hired", career: p.nextCareer };
  }
  return champClaim(p) ?? { id: "home" };
}

function nextAfterLevelUp(p: PendingFlow): Screen {
  if (p.firstClear && p.nextCareer !== p.prevCareer) {
    return { id: "hired", career: p.nextCareer };
  }
  return champClaim(p) ?? { id: "home" };
}

function nextAfterHired(p: PendingFlow): Screen {
  return champClaim(p) ?? { id: "home" };
}

function offerMessages(jobs: ReturnType<typeof gigsNewlyUnlocked>, at: number): PhoneMessage[] {
  return jobs.map((job) => ({
    id: `offer-${job.id}-${at}`,
    from: job.client,
    company: job.company,
    body: `Posted a gig: ${job.title}. ${job.summary} Simulated listing — not a real job.`,
    at,
    kind: "offer" as const,
    jobId: job.id,
    read: false,
  }));
}

export const useGame = create<GameStore>()(
  persist(
    (set, get) => ({
      ...defaults(),
      screen: { id: "welcome" },
      tab: "home",
      toast: null,
      hydrated: false,
      shakeLock: 0,
      pending: null,
      phoneOpen: false,
      phoneApp: "home",

      setHydrated: () => {
        const s = get();
        const onGate = s.screen.id === "boot" || s.screen.id === "welcome" || s.screen.id === "home";
        set({
          hydrated: true,
          screen: s.hasStarted ? (onGate ? { id: "home" } : s.screen) : { id: "welcome" },
          tab: onGate ? "home" : s.tab,
        });
        audio.setMuted(s.muted);
      },

      startCareer: () => {
        audio.unlock();
        audio.success();
        set({ hasStarted: true, screen: { id: "home" }, tab: "home" });
      },

      setTab: (tab) => {
        audio.click();
        set({ tab, screen: { id: tab }, phoneOpen: false });
      },

      setName: (name) => {
        const playerName = name.trim().slice(0, 24) || "Player";
        set({ playerName });
      },

      toggleMute: () => {
        const muted = !get().muted;
        audio.setMuted(muted);
        if (!muted) audio.click();
        set({ muted });
      },

      tryPlay: () => {
        const { completedLevels } = get();
        const next = LEVELS.find((l) => !completedLevels.includes(l.id)) ?? LEVELS[LEVELS.length - 1];
        get().openLevel(next.id);
      },

      openLevel: (id) => {
        audio.unlock();
        const { completedLevels } = get();
        if (!isLevelUnlocked(id, completedLevels)) {
          audio.fail();
          set({ shakeLock: Date.now() });
          get().flash(`Complete Level ${id - 1} to unlock.`);
          return;
        }
        audio.click();
        set({ screen: { id: "intro", levelId: id }, tab: "home", phoneOpen: false });
      },

      beginMission: (id) => {
        audio.click();
        const { completedLevels } = get();
        if (!isLevelUnlocked(id, completedLevels)) {
          get().flash("That level is locked.");
          return;
        }
        set({ screen: { id: "play", levelId: id }, phoneOpen: false });
      },

      abortMission: () => {
        audio.click();
        set({ screen: { id: "home" }, tab: "home" });
      },

      finishMission: (id, score) => {
        const level = levelById(id);
        if (!level) return;
        const s = get();
        const firstClear = !s.completedLevels.includes(id);
        const prevLevel = playerLevelFromXp(s.xp);
        const prevCareer = s.career;
        const prevMax = s.highestLevel;

        let coins = 0;
        let xp = 0;
        let career = s.career;
        let completedLevels = s.completedLevels;
        let unlockedRewards = s.unlockedRewards;
        let newXp = s.xp;
        let newCoins = s.coins;

        if (firstClear) {
          coins = level.rewardCoins;
          xp = level.rewardXp;
          newXp = s.xp + xp;
          newCoins = s.coins + coins;
          completedLevels = [...s.completedLevels, id];
          if (!unlockedRewards.includes(level.unlockRewardId)) {
            unlockedRewards = [...unlockedRewards, level.unlockRewardId];
          }
          career = level.careerUnlock;
        }

        const nextLevel = playerLevelFromXp(newXp);
        const pending: PendingFlow = {
          firstClear,
          levelId: id,
          prevLevel,
          nextLevel,
          prevCareer,
          nextCareer: career,
        };

        const nextMax = Math.max(s.highestLevel, id);
        const fresh = firstClear ? gigsNewlyUnlocked(prevMax, nextMax) : [];
        const at = Date.now();
        const phoneMessages = fresh.length ? [...offerMessages(fresh, at), ...s.phoneMessages] : s.phoneMessages;
        const unreadGigIds = fresh.length ? [...new Set([...fresh.map((g) => g.id), ...s.unreadGigIds])] : s.unreadGigIds;

        audio.complete();
        set({
          coins: newCoins,
          xp: newXp,
          completedLevels,
          unlockedRewards,
          career,
          highestLevel: nextMax,
          pending,
          phoneMessages,
          unreadGigIds,
          screen: {
            id: "complete",
            levelId: id,
            firstClear,
            coins,
            xp,
            score,
          },
        });
        if (fresh.length) {
          get().flash(`${fresh.length} new gig${fresh.length === 1 ? "" : "s"} on your phone.`);
        }
      },

      continueFrom: () => {
        audio.click();
        const { screen, pending } = get();

        if (screen.id === "complete") {
          if (pending) {
            const next = nextAfterComplete(pending);
            if (next.id === "levelup") audio.levelup();
            if (next.id === "hired") audio.unlockReward();
            set({ screen: next, tab: next.id === "home" ? "home" : get().tab });
            return;
          }
          set({ screen: { id: "home" }, tab: "home" });
          return;
        }

        if (screen.id === "levelup") {
          const next = pending ? nextAfterLevelUp(pending) : { id: "home" as const };
          if (next.id === "hired") audio.unlockReward();
          set({ screen: next, tab: next.id === "home" ? "home" : get().tab });
          return;
        }

        if (screen.id === "hired") {
          const next = pending ? nextAfterHired(pending) : { id: "home" as const };
          set({ screen: next, tab: next.id === "home" ? "home" : get().tab });
          return;
        }

        if (screen.id === "claimed") {
          set({ screen: { id: "home" }, tab: "home" });
          return;
        }

        if (screen.id === "gig-complete") {
          set({ screen: { id: "home" }, tab: "home", phoneOpen: true, phoneApp: "portfolio" });
          return;
        }

        set({ screen: { id: "home" }, tab: "home" });
      },

      claimFinal: () => {
        audio.unlockReward();
        set({ screen: { id: "claimed" } });
      },

      resetProgress: () => {
        const muted = get().muted;
        const playerName = get().playerName;
        set({
          ...defaults(),
          muted,
          playerName,
          hasStarted: true,
          screen: { id: "home" },
          tab: "home",
          hydrated: true,
          pending: null,
          phoneOpen: false,
          phoneApp: "home",
        });
        get().flash("Progress reset.");
      },

      flash: (msg) => {
        set({ toast: msg });
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => set({ toast: null }), 2200);
      },

      openPhone: (app) => {
        audio.unlock();
        audio.click();
        const nextApp = app ?? "home";
        const patch: Partial<GameStore> = { phoneOpen: true, phoneApp: nextApp };
        if (nextApp === "freelance") patch.unreadGigIds = [];
        if (nextApp === "messages") {
          patch.phoneMessages = get().phoneMessages.map((m) => ({ ...m, read: true }));
        }
        set(patch);
      },

      closePhone: () => {
        audio.click();
        set({ phoneOpen: false, phoneApp: "home" });
      },

      setPhoneApp: (app) => {
        audio.click();
        const patch: Partial<GameStore> = { phoneApp: app };
        if (app === "freelance") patch.unreadGigIds = [];
        if (app === "messages") {
          patch.phoneMessages = get().phoneMessages.map((m) => ({ ...m, read: true }));
        }
        if (app === "learn") {
          set({ phoneOpen: false, phoneApp: "home" });
          get().tryPlay();
          return;
        }
        set(patch);
      },

      markMessagesRead: () => {
        set({ phoneMessages: get().phoneMessages.map((m) => ({ ...m, read: true })) });
      },

      openGig: (jobId) => {
        const job = gigById(jobId);
        if (!job) return;
        const { completedLevels } = get();
        const max = completedLevels.length ? Math.max(...completedLevels) : 0;
        if (max < job.unlockAfter) {
          audio.fail();
          get().flash(`Clear Level ${job.unlockAfter} to unlock this gig.`);
          return;
        }
        audio.click();
        set({ phoneOpen: false, screen: { id: "gig-intro", jobId }, tab: "home" });
      },

      beginGig: (jobId) => {
        audio.click();
        set({ screen: { id: "gig-play", jobId }, phoneOpen: false });
      },

      abortGig: () => {
        audio.click();
        set({ screen: { id: "home" }, tab: "home", phoneOpen: true, phoneApp: "freelance" });
      },

      finishGig: (jobId, stats) => {
        const job = gigById(jobId);
        if (!job) return;
        const s = get();
        const firstClear = !s.gigCompletions.some((g) => g.jobId === jobId && !g.practice);
        const scored = scoreGig(job, stats);
        const pay = firstClear ? job.pay : 0;
        const bonus = firstClear ? scored.bonus : 0;
        const xp = firstClear ? job.xp : 0;
        const at = Date.now();
        const record: GigRecord = {
          jobId,
          completedAt: at,
          stars: scored.stars,
          review: scored.review,
          skills: job.skills,
          difficulty: job.difficulty,
          pay,
          bonus,
          xp,
          attempts: stats.attempts,
          hintsUsed: stats.hintsUsed,
          showedSolution: stats.showedSolution,
          durationSec: Math.max(1, Math.round(stats.elapsedMs / 1000)),
          practice: !firstClear,
        };
        const ledger: LedgerEntry[] = firstClear
          ? [
              { id: `pay-${jobId}-${at}`, at, amount: pay, label: job.title, kind: "gig" },
              ...(bonus
                ? [{ id: `bonus-${jobId}-${at}`, at, amount: bonus, label: `${scored.stars}-star bonus`, kind: "bonus" as const }]
                : []),
              ...s.walletLedger,
            ]
          : s.walletLedger;
        const thanks: PhoneMessage = {
          id: `thanks-${jobId}-${at}`,
          from: job.client,
          company: job.company,
          body: firstClear
            ? `${scored.review} ${scored.stars} of 5. Simulated review.`
            : "Practice run received. Pay was already sent on the first delivery.",
          at,
          kind: "thanks",
          jobId,
          read: false,
        };
        audio.complete();
        set({
          coins: s.coins + pay + bonus,
          xp: s.xp + xp,
          gigCompletions: [record, ...s.gigCompletions],
          walletLedger: ledger,
          phoneMessages: [thanks, ...s.phoneMessages],
          unreadGigIds: s.unreadGigIds.filter((id) => id !== jobId),
          screen: {
            id: "gig-complete",
            jobId,
            firstClear,
            stars: scored.stars,
            pay,
            bonus,
            xp,
            review: scored.review,
          },
        });
      },

      applyRemoteSave: (remote, displayName) => {
        const local = snapshotSave(get());
        const named =
          displayName && local.playerName === "Player"
            ? { ...local, playerName: displayName.trim().slice(0, 24) || local.playerName }
            : local;
        const next = remote ? mergeSaves(named, migrate(remote)) : named;
        const screen = get().screen;
        const jumpHome = next.hasStarted && (screen.id === "welcome" || screen.id === "boot");
        set({
          ...next,
          screen: jumpHome ? { id: "home" } : screen,
          tab: jumpHome ? "home" : get().tab,
        });
      },
    }),
    {
      name: KEY,
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      version: SAVE_VERSION,
      partialize: (s) => snapshotSave(s),
      merge: (persisted, current) => ({
        ...current,
        ...migrate(persisted),
      }),
      skipHydration: true,
    },
  ),
);

export function phoneBadgeCount(s: Pick<SaveState, "unreadGigIds" | "phoneMessages">): number {
  const unreadMail = s.phoneMessages.filter((m) => !m.read).length;
  return unreadMail + s.unreadGigIds.length;
}
