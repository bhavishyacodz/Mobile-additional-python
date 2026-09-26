import { useEffect, useState, type ReactNode } from "react";
import {
  Award,
  Briefcase,
  Check,
  ChevronRight,
  Lock,
  Play,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneTeaser } from "@/components/game/phone";
import { SignInGate } from "@/lib/auth/gates";
import { Link } from "@tanstack/react-router";
import { PortfolioTeaser } from "@/components/game/portfolio";
import { AccountCard } from "@/components/game/account";
import { Shell, XpBar } from "@/components/game/chrome";
import { CarMark } from "@/components/game/car-mark";
import {
  CAREERS,
  CHAPTERS,
  LEVELS,
  REWARDS,
  careerById,
  isLevelUnlocked,
  nextCareer,
  nextLevelId,
  rewardById,
  xpProgress,
} from "@/lib/game/data";
import { audio } from "@/lib/game/audio";
import { useGame } from "@/lib/game/store";
import type { LevelDef } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export function HomeScreen() {
  const career = useGame((s) => s.career);
  const completed = useGame((s) => s.completedLevels);
  const tryPlay = useGame((s) => s.tryPlay);
  const openLevel = useGame((s) => s.openLevel);
  const cur = careerById(career);
  const nxt = nextCareer(career);
  const nextId = nextLevelId(completed);
  const nextLv = LEVELS.find((l) => l.id === nextId)!;
  const allDone = completed.length >= LEVELS.length;
  const reward = nextLv.unlockReward;

  return (
    <Shell>
      <section className="animate-rise rounded-3xl bg-surface p-5 shadow-[var(--shadow-card)]">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-subtle">Current career</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{cur.title}</h1>
        <p className="mt-1 text-sm text-muted">{nxt ? `Next job · ${nxt.title}` : "Peak rank reached"}</p>
        <div className="mt-5">
          <XpBar />
        </div>
      </section>

      <Button size="lg" className="mt-5 h-14 w-full text-lg" onClick={tryPlay}>
        <Play className="size-5 translate-x-px" />
        {allDone ? "Replay last mission" : "Play"}
      </Button>

      <PhoneTeaser />
      <PortfolioTeaser />

      <button
        type="button"
        onClick={() => openLevel(nextLv.id)}
        className="mt-4 flex w-full items-center justify-between rounded-xl bg-surface px-4 py-3 text-left shadow-[var(--shadow-card)] active:scale-[0.99]"
      >
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">
            {allDone ? "Last reward" : "Next reward"}
          </p>
          <p className="mt-0.5 font-semibold">{reward}</p>
          <p className="text-sm text-muted">
            {allDone ? "Championship cleared" : `${nextLv.title} · +${nextLv.rewardCoins.toLocaleString()} coins`}
          </p>
        </div>
        <ChevronRight className="size-5 text-subtle" />
      </button>

      <div className="mt-6 flex flex-col gap-6">
        {CHAPTERS.map((ch) => {
          const rows = LEVELS.filter((lv) => lv.chapter === ch.id);
          return (
            <div key={ch.id}>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">{ch.title}</p>
              <p className="mb-2 text-xs text-muted">{ch.blurb}</p>
              <ul className="flex flex-col gap-2">
                {rows.map((lv) => (
                  <MissionRow
                    key={lv.id}
                    level={lv}
                    locked={!isLevelUnlocked(lv.id, completed)}
                    done={completed.includes(lv.id)}
                    current={!completed.includes(lv.id) && isLevelUnlocked(lv.id, completed)}
                    onOpen={() => openLevel(lv.id)}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

function MissionRow({
  level,
  locked,
  done,
  current,
  onOpen,
}: {
  level: LevelDef;
  locked: boolean;
  done: boolean;
  current: boolean;
  onOpen: () => void;
}) {
  const shakeLock = useGame((s) => s.shakeLock);
  const [shake, setShake] = useState(false);
  useEffect(() => {
    if (locked && shakeLock) {
      setShake(true);
      const t = window.setTimeout(() => setShake(false), 320);
      return () => window.clearTimeout(t);
    }
  }, [shakeLock, locked]);

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left shadow-[var(--shadow-card)] active:scale-[0.99]",
          current ? "bg-surface-2" : "bg-surface",
          locked && "opacity-70",
          shake && "animate-shake",
        )}
      >
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-md font-mono text-sm",
            done && "bg-success/15 text-success",
            current && "bg-accent/15 text-accent",
            locked && "bg-bg-elevated text-subtle",
            !done && !current && !locked && "bg-bg-elevated text-muted",
          )}
        >
          {locked ? <Lock className="size-4" /> : done ? <Check className="size-4" /> : String(level.id).padStart(2, "0")}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{level.title}</span>
          <span className="block text-xs text-muted">
            {locked ? `Complete Level ${level.id - 1} to unlock` : `${level.difficulty} · ${level.job}`}
          </span>
        </span>
        {current && <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-accent">Next</span>}
      </button>
    </li>
  );
}

export function CareerScreen() {
  const career = useGame((s) => s.career);
  const openLevel = useGame((s) => s.openLevel);
  const cur = careerById(career);
  return (
    <Shell>
      <h1 className="text-2xl font-semibold tracking-tight">Career path</h1>
      <p className="mt-1 text-sm text-muted">Complete missions to get hired and promoted.</p>
      <ol className="mt-6">
        {CAREERS.map((c, i) => {
          const state = c.rank < cur.rank ? "done" : c.rank === cur.rank ? "now" : "lock";
          const linked = LEVELS.find((l) => l.careerUnlock === c.id);
          return (
            <li key={c.id} className="relative flex gap-4 pb-6 last:pb-0">
              {i < CAREERS.length - 1 && (
                <span
                  className={cn(
                    "absolute left-[15px] top-8 h-[calc(100%-12px)] w-px",
                    state === "done" ? "bg-accent" : "bg-border",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-[1] mt-0.5 flex size-8 items-center justify-center rounded-full",
                  state === "done" && "bg-accent text-accent-fg",
                  state === "now" && "bg-accent/20 text-accent ring-2 ring-accent",
                  state === "lock" && "bg-surface text-subtle",
                )}
              >
                {state === "done" ? (
                  <Check className="size-4" />
                ) : state === "lock" ? (
                  <Lock className="size-3.5" />
                ) : (
                  <Briefcase className="size-3.5" />
                )}
              </span>
              <button
                type="button"
                disabled={state === "lock" || c.id === "rookie"}
                onClick={() => linked && openLevel(linked.id)}
                className="min-w-0 flex-1 rounded-xl bg-surface px-4 py-3 text-left shadow-[var(--shadow-card)] disabled:opacity-60"
              >
                <p className="font-semibold">{c.title}</p>
                <p className="mt-0.5 text-sm text-muted">{c.blurb}</p>
                {state === "now" && (
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-accent">Current</p>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </Shell>
  );
}

export function RewardsScreen() {
  const unlocked = useGame((s) => s.unlockedRewards);
  const openLevel = useGame((s) => s.openLevel);
  return (
    <Shell>
      <h1 className="text-2xl font-semibold tracking-tight">Rewards</h1>
      <p className="mt-1 text-sm text-muted">Milestones unlock as you clear missions.</p>
      <ul className="mt-6 flex flex-col gap-3">
        {REWARDS.map((r) => {
          const on = unlocked.includes(r.id);
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => openLevel(r.levelId)}
                className={cn(
                  "flex w-full items-center gap-4 rounded-xl px-4 py-4 text-left shadow-[var(--shadow-card)]",
                  r.featured ? "bg-surface-2" : "bg-surface",
                  !on && "opacity-75",
                )}
              >
                <span
                  className={cn(
                    "flex size-12 items-center justify-center rounded-md",
                    on ? "bg-accent/15 text-accent" : "bg-bg-elevated text-subtle",
                  )}
                >
                  {r.featured ? (
                    <CarMark className="size-7" />
                  ) : on ? (
                    <Award className="size-6" />
                  ) : (
                    <Lock className="size-5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{r.name}</span>
                  <span className="block text-xs text-muted">
                    Level {r.levelId} · {r.blurb}
                  </span>
                  <span
                    className={cn(
                      "mt-1 block text-[11px] font-medium uppercase tracking-[0.12em]",
                      on ? "text-success" : "text-subtle",
                    )}
                  >
                    {on ? "Unlocked" : "Locked"}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}

export function ProfileScreen() {
  const name = useGame((s) => s.playerName);
  const setName = useGame((s) => s.setName);
  const career = useGame((s) => s.career);
  const xp = useGame((s) => s.xp);
  const coins = useGame((s) => s.coins);
  const completed = useGame((s) => s.completedLevels);
  const rewards = useGame((s) => s.unlockedRewards);
  const highest = useGame((s) => s.highestLevel);
  const gigs = useGame((s) => s.gigCompletions);
  const gigCount = gigs.filter((g) => !g.practice).length;
  const resetProgress = useGame((s) => s.resetProgress);
  const [confirm, setConfirm] = useState(false);
  const [draft, setDraft] = useState(name);
  const prog = xpProgress(xp);

  return (
    <Shell>
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      <div className="mt-5">
        <AccountCard />
      </div>
      <label className="mt-5 block text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">
        Player
        <input
          value={draft}
          maxLength={24}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => setName(draft)}
          className="mt-1 h-12 w-full rounded-md bg-surface px-3 text-base text-fg shadow-[var(--shadow-card)] outline-none focus:shadow-[var(--shadow-card-hover)]"
        />
      </label>

      <dl className="mt-6 divide-y divide-border rounded-xl bg-surface px-4 shadow-[var(--shadow-card)]">
        <Stat k="Career" v={careerById(career).title} />
        <Stat k="Level" v={String(prog.level).padStart(2, "0")} />
        <Stat k="XP" v={`${prog.current} / ${prog.needed}`} />
        <Stat k="Coins" v={coins.toLocaleString()} />
        <Stat k="Completed" v={`${completed.length} / ${LEVELS.length}`} />
        <Stat k="Highest level" v={String(highest)} />
        <Stat k="Freelance gigs" v={String(gigCount)} />
        <Stat k="Rewards" v={`${rewards.length} / ${REWARDS.length}`} />
      </dl>

      <div className="mt-8 rounded-xl bg-surface p-4 shadow-[var(--shadow-card)]">
        <p className="font-semibold">Reset test progress</p>
        <p className="mt-1 text-sm text-muted">This erases local prototype progress on this device.</p>
        {!confirm ? (
          <Button variant="outline" className="mt-4 w-full" onClick={() => setConfirm(true)}>
            <RotateCcw className="size-4" />
            Reset test progress
          </Button>
        ) : (
          <div className="mt-4">
            <p className="text-sm font-medium">Reset all progress?</p>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => {
                  setConfirm(false);
                  resetProgress();
                  audio.fail();
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <dt className="text-sm text-muted">{k}</dt>
      <dd className="font-mono text-sm tabular">{v}</dd>
    </div>
  );
}

export function WelcomeScreen() {
  const startCareer = useGame((s) => s.startCareer);
  return (
    <div className="flex min-h-dvh flex-col bg-bg px-6 pb-10 pt-[max(3rem,env(safe-area-inset-top))] text-fg">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-accent">Python career</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Jarvis Career</h1>
        <p className="mt-4 max-w-[28ch] text-lg leading-relaxed text-muted">
          Build your career. Complete missions. Earn rewards. Rise to Immortal.
        </p>
        <ul className="mt-8 space-y-3 text-sm text-muted">
          <li className="flex gap-3">
            <Check className="mt-0.5 size-4 text-accent" />
            100 playable Python missions
          </li>
          <li className="flex gap-3">
            <Check className="mt-0.5 size-4 text-accent" />
            Mistakes explained, with the fix
          </li>
          <li className="flex gap-3">
            <Check className="mt-0.5 size-4 text-accent" />
            XP, coins, promotions, local save
          </li>
          <li className="flex gap-3">
            <Check className="mt-0.5 size-4 text-accent" />
            In-game phone with simulated freelance gigs
          </li>
        </ul>
        <Button size="lg" className="mt-10 h-14 w-full text-lg" onClick={startCareer}>
          Start career
        </Button>
        <SignInGate
          fallback={
            <Link
              to="/login"
              className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-md bg-surface text-sm font-medium text-fg shadow-[var(--shadow-card)]"
            >
              Sign in with Google
            </Link>
          }
        >
          <p className="mt-4 text-center text-xs text-subtle">Signed in. Progress saves to your account.</p>
        </SignInGate>
      </div>
    </div>
  );
}

export function CompleteScreen() {
  const screen = useGame((s) => s.screen);
  const continueFrom = useGame((s) => s.continueFrom);
  const career = useGame((s) => s.career);
  if (screen.id !== "complete") return null;
  const level = LEVELS.find((l) => l.id === screen.levelId);
  if (!level) return null;
  const champ = level.championship;
  const finale = Boolean(level.finale);

  return (
    <Overlay>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
        {champ ? (finale ? "Mastery complete" : "Championship complete") : "Level complete"}
      </p>
      <div className="mx-auto mt-5 flex size-16 items-center justify-center rounded-full bg-success/15 text-success">
        {champ ? <Trophy className="size-8" /> : <Check className="size-8" />}
      </div>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{level.title}</h1>
      <p className="mt-1 text-sm text-muted">Level {String(level.id).padStart(2, "0")}</p>

      {screen.score !== undefined && (
        <p className="mt-4 font-mono text-2xl tabular text-accent">{screen.score} pts</p>
      )}

      <div className="mt-8 rounded-xl bg-surface p-4 text-left">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">Rewards</p>
        {screen.firstClear ? (
          <>
            <p className="mt-2 font-mono text-lg tabular text-accent">+{screen.coins.toLocaleString()} coins</p>
            <p className="font-mono text-lg tabular text-accent">+{screen.xp} XP</p>
            <p className="mt-3 text-sm text-muted">Unlocked · {level.unlockReward}</p>
            <p className="mt-1 text-sm text-muted">Career · {careerById(career).title}</p>
            <p className="mt-3 text-sm text-muted">New simulated gigs may be waiting on your phone.</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">Practice run. Rewards were already claimed.</p>
        )}
      </div>

      <Button size="lg" className="mt-8 w-full" onClick={continueFrom}>
        Continue
      </Button>
    </Overlay>
  );
}

export function LevelUpScreen() {
  const screen = useGame((s) => s.screen);
  const continueFrom = useGame((s) => s.continueFrom);
  if (screen.id !== "levelup") return null;
  return (
    <Overlay>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">Level up</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight">
        LV {String(screen.from).padStart(2, "0")} → LV {String(screen.to).padStart(2, "0")}
      </h1>
      <p className="mt-3 text-muted">Your player level increased. XP carries into the next bar.</p>
      <Button size="lg" className="mt-10 w-full" onClick={continueFrom}>
        Continue
      </Button>
    </Overlay>
  );
}

export function HiredScreen() {
  const screen = useGame((s) => s.screen);
  const continueFrom = useGame((s) => s.continueFrom);
  if (screen.id !== "hired") return null;
  const c = careerById(screen.career);
  const hired = screen.career === "trainee";
  return (
    <Overlay>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
        {hired ? "Congratulations" : "Promotion unlocked"}
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{hired ? "You've been hired" : c.title}</h1>
      <p className="mt-3 text-2xl font-medium text-accent">{hired ? c.title : "New title confirmed"}</p>
      <p className="mt-3 text-muted">{hired ? "Your career has officially started." : c.blurb}</p>
      <Button size="lg" className="mt-10 w-full" onClick={continueFrom}>
        Continue
      </Button>
    </Overlay>
  );
}

export function ClaimScreen() {
  const screen = useGame((s) => s.screen);
  const claimFinal = useGame((s) => s.claimFinal);
  const levelId = screen.id === "claim" ? screen.levelId : 5;
  const level = LEVELS.find((l) => l.id === levelId);
  const reward = level ? rewardById(level.unlockRewardId) : undefined;
  const isCar = reward?.id === "m8-apex";
  const finale = Boolean(level?.finale);

  return (
    <Overlay>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
        {finale ? "Python mastery complete" : "Elite championship complete"}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">You did it</h1>
      <p className="mt-2 text-muted">Career · {level ? careerById(level.careerUnlock).title : "Elite Professional"}</p>
      <div className="mx-auto mt-8 w-full max-w-xs rounded-xl bg-surface-2 p-6">
        {isCar ? (
          <CarMark className="mx-auto h-16 w-full text-accent" />
        ) : (
          <Trophy className="mx-auto size-16 text-accent" />
        )}
        <p className="mt-4 text-lg font-semibold">{reward?.name ?? level?.unlockReward}</p>
        <p className="text-sm text-muted">{reward?.blurb ?? "In-game bonus. Not a real-world prize."}</p>
      </div>
      <p className="mt-6 text-[11px] uppercase tracking-[0.14em] text-subtle">Milestone reward</p>
      <Button size="lg" className="mt-6 w-full" onClick={claimFinal}>
        Claim reward
      </Button>
    </Overlay>
  );
}

export function ClaimedScreen() {
  const continueFrom = useGame((s) => s.continueFrom);
  const pending = useGame((s) => s.pending);
  const level = pending ? LEVELS.find((l) => l.id === pending.levelId) : undefined;
  const reward = level ? rewardById(level.unlockRewardId) : rewardById("m8-apex");
  return (
    <Overlay>
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/15 text-success">
        <Check className="size-8" />
      </div>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{reward?.name ?? "Reward"}</h1>
      <p className="mt-2 text-success">Unlocked</p>
      <p className="mt-3 text-sm text-muted">
        Added to your in-game collection. {reward?.id === "m8-apex" ? "A garage can show it in a later update — no driving sim in this prototype." : "Wear it on the Rewards tab. It is an in-game unlock, not a real-world prize."}
      </p>
      <Button size="lg" className="mt-10 w-full" onClick={continueFrom}>
        Continue
      </Button>
    </Overlay>
  );
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 py-10 text-center text-fg">
      <div className="animate-rise w-full max-w-md">{children}</div>
    </div>
  );
}

export function BootScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg text-muted">
      <p className="text-sm uppercase tracking-[0.18em]">Jarvis Career</p>
    </div>
  );
}
