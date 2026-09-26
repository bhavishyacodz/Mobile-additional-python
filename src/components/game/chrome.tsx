import type { ReactNode } from "react";
import { Briefcase, Gift, Home, User, Volume2, VolumeX } from "lucide-react";
import { PhoneHeaderButton } from "@/components/game/phone";
import { careerById, xpProgress } from "@/lib/game/data";
import { useGame } from "@/lib/game/store";
import type { TabId } from "@/lib/game/types";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const playerName = useGame((s) => s.playerName);
  const user = useCurrentUser();
  const shownName = user?.displayName || playerName;
  const xp = useGame((s) => s.xp);
  const coins = useGame((s) => s.coins);
  const muted = useGame((s) => s.muted);
  const toggleMute = useGame((s) => s.toggleMute);
  const prog = xpProgress(xp);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm">
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium uppercase tracking-[0.16em] text-subtle">{shownName}</p>
          <p className="text-lg font-semibold tabular leading-tight">
            LV {String(prog.level).padStart(2, "0")}
          </p>
        </div>
        <div className="rounded-md bg-surface px-3 py-1.5 text-right shadow-[var(--shadow-card)]">
          <p className="text-[10px] uppercase tracking-[0.14em] text-subtle">Coins</p>
          <p className="font-mono text-sm tabular text-accent">{coins.toLocaleString()}</p>
        </div>
        <PhoneHeaderButton />
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          className="flex size-11 items-center justify-center rounded-md text-muted hover:text-fg"
        >
          {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
        </button>
      </div>
    </header>
  );
}

export function XpBar({ compact }: { compact?: boolean }) {
  const xp = useGame((s) => s.xp);
  const prog = xpProgress(xp);
  return (
    <div>
      {!compact && (
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">XP</span>
          <span className="font-mono text-xs tabular text-muted">
            {prog.current} / {prog.needed}
          </span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className="relative h-full rounded-full bg-accent transition-[width] duration-500 ease-[var(--ease-out)]"
          style={{ width: `${Math.max(4, prog.ratio * 100)}%` }}
        >
          <span className="absolute inset-0 overflow-hidden">
            <span className="absolute inset-y-0 w-8 bg-fg/25" style={{ animation: "bar-shine 1.8s ease-in-out infinite" }} />
          </span>
        </div>
      </div>
    </div>
  );
}

const TABS: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "career", label: "Career", icon: Briefcase },
  { id: "rewards", label: "Rewards", icon: Gift },
  { id: "profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const tab = useGame((s) => s.tab);
  const setTab = useGame((s) => s.setTab);
  return (
    <nav className="sticky bottom-0 z-20 border-t border-border bg-bg-elevated/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-sm">
      <ul className="mx-auto grid max-w-xl grid-cols-4">
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = tab === t.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  on ? "text-accent" : "text-subtle hover:text-muted",
                )}
              >
                <Icon className="size-5" strokeWidth={on ? 2.4 : 2} />
                {t.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function ToastHost() {
  const toast = useGame((s) => s.toast);
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center px-4">
      <div className="animate-rise rounded-full bg-surface-2 px-4 py-2 text-sm text-fg shadow-[var(--shadow-card)]">{toast}</div>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const career = useGame((s) => s.career);
  const title = careerById(career).title;
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <AppHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-6 pt-4">{children}</main>
      <p className="sr-only">Current career {title}</p>
      <BottomNav />
      <ToastHost />
    </div>
  );
}
