import { useMemo, useState } from "react";
import { Briefcase, ChevronDown, Copy, FolderKanban } from "lucide-react";
import { StarRow } from "@/components/game/stars";
import { Button } from "@/components/ui/button";
import { careerById, xpProgress } from "@/lib/game/data";
import { categoryLabel, gigById, SIM_DISCLAIMER } from "@/lib/game/freelance";
import { reliabilityFromStars } from "@/lib/game/reviews";
import { deliveredGigs, gigEarnings, portfolioSummaryText, skillCounts } from "@/lib/game/save-sync";
import { useGame } from "@/lib/game/store";
import type { GigRecord } from "@/lib/game/types";
import { cn } from "@/lib/utils";

type SortKey = "recent" | "stars" | "pay";

export function PortfolioApp() {
  const gigCompletions = useGame((s) => s.gigCompletions);
  const xp = useGame((s) => s.xp);
  const name = useGame((s) => s.playerName);
  const career = useGame((s) => s.career);
  const setPhoneApp = useGame((s) => s.setPhoneApp);
  const flash = useGame((s) => s.flash);
  const [sort, setSort] = useState<SortKey>("recent");
  const [openId, setOpenId] = useState<string | null>(null);

  const delivered = useMemo(() => deliveredGigs(gigCompletions), [gigCompletions]);
  const prog = xpProgress(xp);
  const avg = reliabilityFromStars(delivered.map((r) => r.stars));
  const earned = gigEarnings(delivered);
  const skills = useMemo(() => skillCounts(gigCompletions).slice(0, 6), [gigCompletions]);

  const sorted = useMemo(() => {
    const rows = [...delivered];
    if (sort === "stars") rows.sort((a, b) => b.stars - a.stars || b.completedAt - a.completedAt);
    else if (sort === "pay") rows.sort((a, b) => b.pay + b.bonus - (a.pay + a.bonus) || b.completedAt - a.completedAt);
    else rows.sort((a, b) => b.completedAt - a.completedAt);
    return rows;
  }, [delivered, sort]);

  if (!delivered.length) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-xl bg-surface px-4 py-6 text-center shadow-[var(--shadow-card)]">
          <span className="mx-auto flex size-12 items-center justify-center rounded-md bg-accent/15 text-accent">
            <FolderKanban className="size-6" />
          </span>
          <p className="mt-3 font-semibold">No projects yet</p>
          <p className="mt-1 text-sm text-muted">
            Finish a learning mission, take a freelance gig, and the client review lands here.
          </p>
          <Button className="mt-4 w-full" onClick={() => setPhoneApp("freelance")}>
            Open freelance desk
          </Button>
        </div>
        <p className="text-[10px] leading-relaxed text-subtle">{SIM_DISCLAIMER}</p>
      </div>
    );
  }

  const copy = async () => {
    const titles: Record<string, string> = {};
    for (const r of delivered) {
      const job = gigById(r.jobId);
      if (job) titles[r.jobId] = job.title;
    }
    const text = portfolioSummaryText({
      name,
      career: careerById(career).title,
      records: delivered,
      titles,
    });
    try {
      await navigator.clipboard.writeText(text);
      flash("Portfolio copied.");
    } catch {
      flash("Could not copy.");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl bg-surface px-3 py-3 shadow-[var(--shadow-card)]">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">Career experience</p>
        <p className="mt-1 text-lg font-semibold tracking-tight">
          {name} · {careerById(career).title}
        </p>
        <p className="font-mono text-sm tabular text-muted">
          {delivered.length} project{delivered.length === 1 ? "" : "s"} · LV {String(prog.level).padStart(2, "0")}
        </p>
        <dl className="mt-3 grid grid-cols-3 gap-2">
          <Stat k="Reliability" v={avg ? `${avg}` : "—"} />
          <Stat k="Earned" v={earned.toLocaleString()} />
          <Stat k="Stars" v={avg ? `${avg}/5` : "—"} />
        </dl>
        {skills.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <li
                key={s.skill}
                className="rounded-full bg-bg-elevated px-2.5 py-1 text-[11px] font-medium text-muted"
              >
                {s.skill}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-1">
        {(["recent", "stars", "pay"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setSort(key)}
            className={cn(
              "h-9 rounded-full px-3 text-[11px] font-medium uppercase tracking-[0.12em]",
              sort === key ? "bg-surface-2 text-accent" : "bg-surface text-subtle",
            )}
          >
            {key === "recent" ? "Recent" : key === "stars" ? "Stars" : "Pay"}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void copy()}
          className="ml-auto flex size-9 items-center justify-center rounded-md text-muted"
          aria-label="Copy portfolio"
        >
          <Copy className="size-4" />
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {sorted.map((r, i) => (
          <PortfolioCard
            key={`${r.jobId}-${r.completedAt}`}
            record={r}
            latest={i === 0 && sort === "recent"}
            open={openId === `${r.jobId}-${r.completedAt}`}
            onToggle={() =>
              setOpenId((cur) => (cur === `${r.jobId}-${r.completedAt}` ? null : `${r.jobId}-${r.completedAt}`))
            }
          />
        ))}
      </ul>
      <p className="text-[10px] leading-relaxed text-subtle">{SIM_DISCLAIMER}</p>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md bg-bg-elevated px-2 py-2">
      <dt className="text-[10px] uppercase tracking-[0.12em] text-subtle">{k}</dt>
      <dd className="mt-0.5 font-mono text-sm tabular">{v}</dd>
    </div>
  );
}

function PortfolioCard({
  record,
  latest,
  open,
  onToggle,
}: {
  record: GigRecord;
  latest: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const job = gigById(record.jobId);
  const title = job?.title ?? "Retired listing";
  const client = job?.client ?? "Client";
  const company = job?.company ?? "Studio";
  const when = new Date(record.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const initial = company.slice(0, 1).toUpperCase();

  return (
    <li className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-card)]">
      <button type="button" onClick={onToggle} className="w-full px-3 py-3 text-left">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-md bg-accent/15 font-semibold text-accent">
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate font-semibold">{title}</span>
              {latest && (
                <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.12em] text-accent">Latest</span>
              )}
            </span>
            <span className="block truncate text-xs text-muted">
              {client} · {company}
            </span>
            <span className="mt-1 flex items-center gap-2">
              <StarRow value={record.stars} />
              <span className="font-mono text-[11px] tabular text-accent">
                +{(record.pay + record.bonus).toLocaleString()}
              </span>
            </span>
          </span>
          <ChevronDown className={cn("mt-1 size-4 shrink-0 text-subtle transition-transform", open && "rotate-180")} />
        </div>
        <p className="mt-2 text-sm leading-snug text-fg">{record.review}</p>
        <p className="mt-2 text-[11px] text-subtle">
          {(record.skills.length ? record.skills : job?.skills ?? []).join(" · ")} · {record.difficulty} · {when}
        </p>
      </button>
      {open && (
        <div className="border-t border-border px-3 py-3">
          <p className="text-sm leading-relaxed text-muted">{job?.brief ?? job?.summary ?? "Listing retired from the desk."}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="uppercase tracking-[0.12em] text-subtle">Category</dt>
              <dd className="mt-0.5">{job ? categoryLabel(job.category) : "—"}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-[0.12em] text-subtle">Time</dt>
              <dd className="mt-0.5 font-mono tabular">{record.durationSec}s</dd>
            </div>
            <div>
              <dt className="uppercase tracking-[0.12em] text-subtle">Attempts</dt>
              <dd className="mt-0.5 font-mono tabular">{record.attempts}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-[0.12em] text-subtle">Hints</dt>
              <dd className="mt-0.5">{record.showedSolution ? "Used working code" : `${record.hintsUsed} used`}</dd>
            </div>
          </dl>
        </div>
      )}
    </li>
  );
}

export function PortfolioTeaser() {
  const openPhone = useGame((s) => s.openPhone);
  const gigCompletions = useGame((s) => s.gigCompletions);
  const n = deliveredGigs(gigCompletions).length;
  return (
    <button
      type="button"
      onClick={() => openPhone("portfolio")}
      className="mt-4 flex w-full items-center justify-between rounded-xl bg-surface px-4 py-3 text-left shadow-[var(--shadow-card)] active:scale-[0.99]"
    >
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">Portfolio</p>
        <p className="mt-0.5 font-semibold">{n ? `${n} shipped project${n === 1 ? "" : "s"}` : "Build a client book"}</p>
        <p className="text-sm text-muted">
          {n ? "Reviews, pay, and skills from simulated gigs." : "Deliver a freelance gig to pin it here."}
        </p>
      </div>
      <Briefcase className="size-5 text-subtle" />
    </button>
  );
}
