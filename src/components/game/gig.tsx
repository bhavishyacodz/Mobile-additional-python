import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/game/editor";
import { StarRow } from "@/components/game/stars";
import { categoryLabel, gigById, SIM_DISCLAIMER } from "@/lib/game/freelance";
import { useGame } from "@/lib/game/store";

export function GigIntro({ jobId }: { jobId: string }) {
  const job = gigById(jobId);
  const beginGig = useGame((s) => s.beginGig);
  const abortGig = useGame((s) => s.abortGig);
  const done = useGame((s) => s.gigCompletions.some((g) => g.jobId === jobId && !g.practice));
  if (!job) return null;

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <header className="flex items-center gap-3 px-4 py-3">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={abortGig}>
          <ArrowLeft className="size-5" />
        </Button>
      </header>
      <div className="mx-auto w-full max-w-xl flex-1 px-5 pb-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
          Simulated gig · {categoryLabel(job.category)}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{job.title}</h1>
        <p className="mt-2 text-muted">
          {job.client} · {job.company}
        </p>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">{job.brief}</p>

        <dl className="mt-8 space-y-3 rounded-xl bg-surface p-5 shadow-[var(--shadow-card)]">
          <Row k="Difficulty" v={job.difficulty} />
          <Row k="Skills" v={job.skills.join(" · ")} />
          <Row k="Pay" v={done ? "Practice — pay already sent" : `+${job.pay.toLocaleString()} coins  ·  +${job.xp} XP`} />
          <Row k="Bonus" v="Up to 20% for a 5-star first delivery" />
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-subtle">{SIM_DISCLAIMER}</p>

        <Button size="lg" className="mt-8 w-full" onClick={() => beginGig(job.id)}>
          {done ? "Practice the contract" : "Accept contract"}
        </Button>
      </div>
    </div>
  );
}

export function GigPlay({ jobId }: { jobId: string }) {
  const job = gigById(jobId);
  const abortGig = useGame((s) => s.abortGig);
  const finishGig = useGame((s) => s.finishGig);

  if (!job) {
    return (
      <div className="p-6">
        <p>Unknown gig.</p>
        <Button className="mt-4" onClick={abortGig}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur-sm">
        <Button variant="ghost" size="icon" aria-label="Abort gig" onClick={abortGig}>
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">{job.company}</p>
          <p className="truncate text-sm font-semibold">{job.title}</p>
        </div>
        <p className="font-mono text-xs tabular text-accent">+{job.pay.toLocaleString()}</p>
      </header>
      <div className="mx-auto w-full max-w-xl flex-1 px-4 py-4 pb-10">
        <p className="mb-4 text-sm leading-relaxed text-muted">{job.brief}</p>
        <CodeEditor
          challenge={job.challenge}
          fileName="contract.py"
          onPass={(stats) => finishGig(job.id, stats)}
        />
      </div>
    </div>
  );
}

export function GigCompleteScreen() {
  const screen = useGame((s) => s.screen);
  const continueFrom = useGame((s) => s.continueFrom);
  if (screen.id !== "gig-complete") return null;
  const job = gigById(screen.jobId);
  if (!job) return null;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 py-10 text-center text-fg">
      <div className="animate-rise w-full max-w-md">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
          {screen.firstClear ? "Payment received" : "Practice run"}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{job.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {job.client} · {job.company}
        </p>
        <div className="mt-5 flex justify-center">
          <StarRow value={screen.stars} size="md" />
        </div>
        <div className="mt-6 rounded-xl bg-surface p-4 text-left shadow-[var(--shadow-card)]">
          {screen.firstClear ? (
            <>
              <p className="font-mono text-lg tabular text-accent">+{screen.pay.toLocaleString()} coins</p>
              {screen.bonus > 0 && (
                <p className="font-mono text-sm tabular text-accent">+{screen.bonus.toLocaleString()} quality bonus</p>
              )}
              <p className="font-mono text-lg tabular text-accent">+{screen.xp} XP</p>
            </>
          ) : (
            <p className="text-sm text-muted">Practice run. Pay and XP were already claimed.</p>
          )}
          <p className="mt-3 text-sm leading-relaxed">{screen.review}</p>
          <p className="mt-3 text-xs text-subtle">{SIM_DISCLAIMER}</p>
        </div>
        <Button size="lg" className="mt-8 w-full" onClick={continueFrom}>
          Add to portfolio
        </Button>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-xs uppercase tracking-[0.12em] text-subtle">{k}</dt>
      <dd className="max-w-[62%] text-right text-sm font-medium">{v}</dd>
    </div>
  );
}
