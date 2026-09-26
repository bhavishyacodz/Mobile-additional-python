import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Briefcase,
  BookOpen,
  ChevronRight,
  FolderKanban,
  Lock,
  MessageSquare,
  Settings,
  Smartphone,
  Star,
  Wallet,
} from "lucide-react";
import { StarRow } from "@/components/game/stars";
import { PortfolioApp } from "@/components/game/portfolio";
import { AccountCard } from "@/components/game/account";
import {
  GIG_LANES,
  SIM_DISCLAIMER,
  categoryLabel,
  featuredGig,
  gigById,
  unlockedGigs,
} from "@/lib/game/freelance";
import { careerById, nextLevelId } from "@/lib/game/data";
import { phoneBadgeCount, useGame } from "@/lib/game/store";
import type { FreelanceJob, PhoneAppId } from "@/lib/game/types";

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(t);
  }, []);
  return now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function PhoneHost() {
  const open = useGame((s) => s.phoneOpen);
  const closePhone = useGame((s) => s.closePhone);
  const screen = useGame((s) => s.screen);
  const hasStarted = useGame((s) => s.hasStarted);
  const hidden =
    !hasStarted ||
    screen.id === "welcome" ||
    screen.id === "boot" ||
    screen.id === "play" ||
    screen.id === "gig-play";

  if (hidden || !open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Close phone" className="absolute inset-0 bg-bg/85" onClick={closePhone} />
      <div className="phone-rise relative z-[1] mb-[max(0.5rem,env(safe-area-inset-bottom))] w-[min(24.5rem,calc(100vw-1.25rem))] sm:mb-0">
        <PhoneDevice />
      </div>
    </div>
  );
}

function PhoneDevice() {
  const app = useGame((s) => s.phoneApp);
  const closePhone = useGame((s) => s.closePhone);
  const setPhoneApp = useGame((s) => s.setPhoneApp);
  const time = useClock();

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-border bg-bg-elevated shadow-[var(--shadow-phone)]">
      <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-bg" />
      <div className="flex h-[min(44rem,calc(100dvh-2.5rem))] flex-col">
        <div className="flex items-center justify-between px-6 pb-1 pt-8 text-[11px] font-medium text-muted">
          <span className="tabular">{time}</span>
          <span className="tracking-[0.14em] text-subtle">JARVISNET</span>
          <span className="tabular">84%</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2 pt-1">
          {app === "home" ? <HomeGrid /> : <AppFrame />}
        </div>
        <div className="flex flex-col items-center gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1">
          {app !== "home" && (
            <button
              type="button"
              onClick={() => setPhoneApp("home")}
              className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle"
            >
              Home
            </button>
          )}
          <button
            type="button"
            aria-label="Put phone away"
            onClick={closePhone}
            className="h-1.5 w-28 rounded-full bg-subtle/80"
          />
        </div>
      </div>
    </div>
  );
}

const APPS: { id: PhoneAppId; label: string; icon: typeof Smartphone; dock?: boolean }[] = [
  { id: "messages", label: "Inbox", icon: MessageSquare },
  { id: "freelance", label: "Gigs", icon: Briefcase, dock: true },
  { id: "portfolio", label: "Portfolio", icon: FolderKanban, dock: true },
  { id: "wallet", label: "Wallet", icon: Wallet, dock: true },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "learn", label: "Learn", icon: BookOpen, dock: true },
  { id: "settings", label: "Settings", icon: Settings },
];

function HomeGrid() {
  const setPhoneApp = useGame((s) => s.setPhoneApp);
  const name = useGame((s) => s.playerName);
  const career = useGame((s) => s.career);
  const unreadGigs = useGame((s) => s.unreadGigIds.length);
  const unreadMail = useGame((s) => s.phoneMessages.filter((m) => !m.read).length);
  const completed = useGame((s) => s.completedLevels);
  const gigDone = useGame((s) => s.gigCompletions);
  const nextLearn = nextLevelId(completed);
  const doneIds = useMemo(() => new Set(gigDone.filter((g) => !g.practice).map((g) => g.jobId)), [gigDone]);
  const featured = featuredGig(completed, doneIds);

  return (
    <div className="flex h-full flex-col px-1 pt-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-subtle">{name}</p>
      <h2 className="mt-0.5 text-2xl font-semibold tracking-tight">{careerById(career).title}</h2>
      <p className="mt-1 text-xs text-muted">
        {featured
          ? `Open gig · ${featured.title}`
          : completed.length
            ? "All unlocked gigs delivered. Keep learning."
            : "Clear Level 01 to open the freelance desk."}
      </p>

      <ul className="mt-5 grid grid-cols-4 gap-x-2 gap-y-4">
        {APPS.filter((a) => !a.dock).map((a) => (
          <li key={a.id}>
            <AppIcon
              label={a.label}
              icon={a.icon}
              badge={a.id === "messages" ? unreadMail : 0}
              onClick={() => setPhoneApp(a.id)}
            />
          </li>
        ))}
      </ul>

      <div className="mt-auto rounded-[1.4rem] bg-surface p-2 shadow-[var(--shadow-card)]">
        <ul className="grid grid-cols-4">
          {APPS.filter((a) => a.dock).map((a) => (
            <li key={a.id}>
              <AppIcon
                label={a.label}
                icon={a.icon}
                badge={a.id === "freelance" ? unreadGigs : 0}
                onClick={() => setPhoneApp(a.id)}
              />
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-3 text-center text-[10px] text-subtle">Next lesson · Level {String(nextLearn).padStart(2, "0")}</p>
    </div>
  );
}

function AppIcon({
  label,
  icon: Icon,
  badge,
  onClick,
}: {
  label: string;
  icon: typeof Smartphone;
  badge: number;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex w-full flex-col items-center gap-1.5 active:scale-[0.96]">
      <span className="relative flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-fg shadow-[var(--shadow-card)]">
        <Icon className="size-5" />
        {badge > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 font-mono text-[10px] text-fg">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span className="text-[10px] font-medium text-muted">{label}</span>
    </button>
  );
}

function AppFrame() {
  const app = useGame((s) => s.phoneApp);
  const setPhoneApp = useGame((s) => s.setPhoneApp);
  const title =
    app === "messages"
      ? "Inbox"
      : app === "freelance"
        ? "Freelance"
        : app === "portfolio"
          ? "Portfolio"
          : app === "wallet"
            ? "Wallet"
            : app === "reviews"
              ? "Reviews"
              : app === "settings"
                ? "Settings"
                : app === "learn"
                  ? "Learn"
                  : "Phone";

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setPhoneApp("home")}
          className="flex size-10 items-center justify-center rounded-md text-muted"
          aria-label="Back to home"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="pb-2">
        {app === "messages" && <MessagesApp />}
        {app === "freelance" && <FreelanceApp />}
        {app === "portfolio" && <PortfolioApp />}
        {app === "wallet" && <WalletApp />}
        {app === "reviews" && <ReviewsApp />}
        {app === "learn" && <LearnApp />}
        {app === "settings" && <SettingsApp />}
      </div>
    </div>
  );
}

function MessagesApp() {
  const messages = useGame((s) => s.phoneMessages);
  const openGig = useGame((s) => s.openGig);
  if (!messages.length) {
    return (
      <Empty title="No messages yet" body="Finish a learning level to get simulated client pings when gigs unlock." />
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {messages.map((m) => (
        <li key={m.id}>
          <button
            type="button"
            onClick={() => m.jobId && openGig(m.jobId)}
            className="w-full rounded-xl bg-surface px-3 py-3 text-left shadow-[var(--shadow-card)]"
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-sm font-semibold">{m.from}</p>
              <p className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-subtle">
                {m.kind === "offer" ? "Offer" : m.kind === "thanks" ? "Review" : "Note"}
              </p>
            </div>
            <p className="text-[11px] text-muted">{m.company}</p>
            <p className="mt-1 text-sm leading-snug text-muted">{m.body}</p>
          </button>
        </li>
      ))}
    </ul>
  );
}

function FreelanceApp() {
  const completed = useGame((s) => s.completedLevels);
  const done = useGame((s) => s.gigCompletions);
  const openGig = useGame((s) => s.openGig);
  const doneIds = useMemo(() => new Set(done.filter((g) => !g.practice).map((g) => g.jobId)), [done]);
  const openCount = unlockedGigs(completed).filter((g) => !doneIds.has(g.id)).length;
  const max = completed.length ? Math.max(...completed) : 0;

  if (max < 1) {
    return <Empty title="Desk is closed" body="Complete Level 01 in Learn. Freelance gigs unlock with each skill." />;
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-muted">
        {openCount} open · {doneIds.size} delivered. {SIM_DISCLAIMER}
      </p>
      {GIG_LANES.map((lane) => {
        const locked = max < lane.unlockAfter;
        const jobs = locked ? [] : unlockedGigs(completed).filter((g) => g.lane === lane.id);
        return (
          <section key={lane.id}>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">{lane.title}</p>
            <p className="mb-2 text-xs text-muted">{lane.blurb}</p>
            {locked ? (
              <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-3 text-sm text-subtle shadow-[var(--shadow-card)]">
                <Lock className="size-4" />
                Clear Level {String(lane.unlockAfter).padStart(2, "0")} to open this desk.
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {jobs.map((job) => (
                  <GigRow key={job.id} job={job} done={doneIds.has(job.id)} onOpen={() => openGig(job.id)} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function LearnApp() {
  return <Empty title="Opening a mission" body="Learn jumps into your next unlocked Python level." />;
}

function GigRow({ job, done, onOpen }: { job: FreelanceJob; done: boolean; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-xl bg-surface px-3 py-3 text-left shadow-[var(--shadow-card)] active:scale-[0.99]"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{job.title}</span>
          <span className="block text-xs text-muted">
            {job.company} · {categoryLabel(job.category)} · {job.difficulty}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-mono text-xs tabular text-accent">+{job.pay.toLocaleString()}</span>
          <span className="block text-[10px] uppercase tracking-[0.12em] text-subtle">{done ? "Replay" : "Open"}</span>
        </span>
      </button>
    </li>
  );
}

function WalletApp() {
  const coins = useGame((s) => s.coins);
  const ledger = useGame((s) => s.walletLedger);
  const earned = ledger.reduce((n, e) => n + e.amount, 0);
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-card)]">
        <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Balance</p>
        <p className="mt-1 font-mono text-3xl tabular text-accent">{coins.toLocaleString()}</p>
        <p className="mt-1 text-xs text-muted">Virtual coins. Freelance earned {earned.toLocaleString()}.</p>
      </div>
      {ledger.length ? (
        <ul className="divide-y divide-border overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-card)]">
          {ledger.slice(0, 20).map((e) => (
            <li key={e.id} className="flex items-center justify-between px-3 py-2.5">
              <span className="min-w-0">
                <span className="block truncate text-sm">{e.label}</span>
                <span className="text-[10px] uppercase tracking-[0.12em] text-subtle">{e.kind === "bonus" ? "Bonus" : "Gig"}</span>
              </span>
              <span className="font-mono text-sm tabular text-accent">+{e.amount.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty title="No gig payouts yet" body="Deliver a contract from Freelance. Mission coins still sit in this balance." />
      )}
      <p className="text-[10px] leading-relaxed text-subtle">{SIM_DISCLAIMER}</p>
    </div>
  );
}

function ReviewsApp() {
  const gigCompletions = useGame((s) => s.gigCompletions);
  const records = gigCompletions.filter((g) => !g.practice);
  if (!records.length) {
    return <Empty title="No reviews yet" body="Clients write a simulated review after you ship a gig." />;
  }
  return (
    <ul className="flex flex-col gap-2">
      {records.map((r) => {
        const job = gigById(r.jobId);
        return (
          <li key={r.jobId + r.completedAt} className="rounded-xl bg-surface px-3 py-3 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-semibold">{job?.client ?? "Client"}</p>
              <StarRow value={r.stars} />
            </div>
            <p className="text-xs text-muted">{job?.title}</p>
            <p className="mt-2 text-sm leading-snug">{r.review}</p>
            <p className="mt-2 text-[11px] text-subtle">
              {r.difficulty} · {r.showedSolution ? "Used working code" : `${r.attempts} attempt${r.attempts === 1 ? "" : "s"}`}
            </p>
          </li>
        );
      })}
      <p className="text-[10px] leading-relaxed text-subtle">{SIM_DISCLAIMER}</p>
    </ul>
  );
}

function SettingsApp() {
  const muted = useGame((s) => s.muted);
  const toggleMute = useGame((s) => s.toggleMute);
  const name = useGame((s) => s.playerName);
  const setName = useGame((s) => s.setName);
  const [draft, setDraft] = useState(name);
  return (
    <div className="flex flex-col gap-3">
      <AccountCard compact />
      <label className="block rounded-xl bg-surface px-3 py-3 text-[11px] font-medium uppercase tracking-[0.14em] text-subtle shadow-[var(--shadow-card)]">
        Player
        <input
          value={draft}
          maxLength={24}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => setName(draft)}
          className="mt-1 h-11 w-full rounded-md bg-bg-elevated px-3 text-base font-normal normal-case tracking-normal text-fg outline-none"
        />
      </label>
      <button
        type="button"
        onClick={toggleMute}
        className="flex h-12 items-center justify-between rounded-xl bg-surface px-3 text-left shadow-[var(--shadow-card)]"
      >
        <span className="text-sm">Sound</span>
        <span className="text-sm text-muted">{muted ? "Muted" : "On"}</span>
      </button>
      <p className="rounded-xl bg-surface px-3 py-3 text-xs leading-relaxed text-muted shadow-[var(--shadow-card)]">
        The phone, freelance board, coins, and reviews are a game simulation. Learning missions are real Python practice
        in a safe in-browser interpreter. {SIM_DISCLAIMER}
      </p>
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-surface px-4 py-6 text-center shadow-[var(--shadow-card)]">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}

export function PhoneFab() {
  const openPhone = useGame((s) => s.openPhone);
  const phoneOpen = useGame((s) => s.phoneOpen);
  const screen = useGame((s) => s.screen);
  const hasStarted = useGame((s) => s.hasStarted);
  const unreadGigs = useGame((s) => s.unreadGigIds);
  const messages = useGame((s) => s.phoneMessages);
  const badge = phoneBadgeCount({ unreadGigIds: unreadGigs, phoneMessages: messages });
  const hidden =
    !hasStarted ||
    phoneOpen ||
    screen.id === "welcome" ||
    screen.id === "boot" ||
    screen.id === "play" ||
    screen.id === "gig-play" ||
    screen.id === "intro" ||
    screen.id === "gig-intro";
  if (hidden) return null;
  return (
    <button
      type="button"
      onClick={() => openPhone("home")}
      aria-label={badge ? `Open phone, ${badge} new` : "Open phone"}
      className="fixed bottom-[5.5rem] right-4 z-30 flex size-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-[var(--shadow-play)] active:scale-[0.96] sm:bottom-24"
    >
      <Smartphone className="size-6" />
      {badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 font-mono text-[11px] text-fg">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

export function PhoneHeaderButton() {
  const openPhone = useGame((s) => s.openPhone);
  const unreadGigs = useGame((s) => s.unreadGigIds);
  const messages = useGame((s) => s.phoneMessages);
  const badge = phoneBadgeCount({ unreadGigIds: unreadGigs, phoneMessages: messages });
  return (
    <button
      type="button"
      onClick={() => openPhone("home")}
      aria-label={badge ? `Open phone, ${badge} new` : "Open phone"}
      className="relative flex size-11 items-center justify-center rounded-md text-muted hover:text-fg"
    >
      <Smartphone className="size-5" />
      {badge > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-danger" />}
    </button>
  );
}

export function PhoneTeaser() {
  const openPhone = useGame((s) => s.openPhone);
  const completed = useGame((s) => s.completedLevels);
  const unread = useGame((s) => s.unreadGigIds.length);
  const max = completed.length ? Math.max(...completed) : 0;
  const open = unlockedGigs(completed).length;
  return (
    <button
      type="button"
      onClick={() => openPhone(max < 1 ? "home" : "freelance")}
      className="mt-4 flex w-full items-center justify-between rounded-xl bg-surface px-4 py-3 text-left shadow-[var(--shadow-card)] active:scale-[0.99]"
    >
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">In-game phone</p>
        <p className="mt-0.5 font-semibold">{max < 1 ? "Unlock freelance after Level 01" : "Freelance desk"}</p>
        <p className="text-sm text-muted">
          {max < 1
            ? "Learn first, then take simulated client gigs."
            : unread
              ? `${unread} new listing${unread === 1 ? "" : "s"} · ${open} unlocked`
              : `${open} gigs unlocked · simulated clients`}
        </p>
      </div>
      <ChevronRight className="size-5 text-subtle" />
    </button>
  );
}
