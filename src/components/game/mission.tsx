import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Lock, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/game/editor";
import { codeStepCount, levelById } from "@/lib/game/data";
import { audio } from "@/lib/game/audio";
import { useGame } from "@/lib/game/store";
import type { ChoiceOption, LevelDef, Step } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export function MissionView({ levelId }: { levelId: number }) {
  const level = levelById(levelId);
  const abortMission = useGame((s) => s.abortMission);

  if (!level) {
    return (
      <div className="p-6">
        <p>Unknown mission.</p>
        <Button className="mt-4" onClick={abortMission}>
          Back
        </Button>
      </div>
    );
  }

  return <MissionPlay level={level} />;
}

function MissionPlay({ level }: { level: LevelDef }) {
  const finishMission = useGame((s) => s.finishMission);
  const abortMission = useGame((s) => s.abortMission);
  const [step, setStep] = useState(0);
  const [failed, setFailed] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [codeDone, setCodeDone] = useState(0);
  const [runId, setRunId] = useState(0);
  const startedAt = useRef(Date.now());

  const totalCode = codeStepCount(level);
  const current = level.steps[step];
  const timed = Boolean(level.timeLimitSec) && current?.type === "code";

  function next() {
    if (step + 1 >= level.steps.length) {
      const elapsed = (Date.now() - startedAt.current) / 1000;
      const timeBonus = level.championship ? Math.max(0, 10 - Math.floor(elapsed / 12)) : 0;
      const score = level.championship
        ? Math.max(0, Math.min(100, codeDone * 30 + timeBonus - mistakes * 5))
        : undefined;
      finishMission(level.id, score);
      return;
    }
    setStep((s) => s + 1);
  }

  function failTime() {
    audio.fail();
    setFailed(true);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur-sm">
        <Button variant="ghost" size="icon" aria-label="Abort mission" onClick={abortMission}>
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">
            Level {String(level.id).padStart(2, "0")}
          </p>
          <p className="truncate text-sm font-semibold">{level.title}</p>
        </div>
        {level.timeLimitSec ? (
          <MissionTimer
            key={runId}
            seconds={level.timeLimitSec}
            running={timed && !failed}
            onExpire={failTime}
            freeze={failed}
          />
        ) : null}
      </header>

      {totalCode > 1 && (
        <ol className="flex gap-2 overflow-x-auto px-4 py-3">
          {level.steps
            .filter((s): s is Extract<Step, { type: "code" }> => s.type === "code")
            .map((s, i) => (
              <li
                key={s.challenge.id}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1 text-xs",
                  i < codeDone ? "bg-success/15 text-success" : "bg-surface text-muted",
                )}
              >
                {i < codeDone ? <Check className="size-3.5" /> : <Lock className="size-3.5" />}
                {s.challenge.title.split("—")[0]}
              </li>
            ))}
        </ol>
      )}

      <div className="mx-auto w-full max-w-xl flex-1 px-4 py-4 pb-10">
        {failed ? (
          <FailCard
            championship={Boolean(level.championship)}
            onRetry={() => {
              setFailed(false);
              setStep(level.steps.findIndex((s) => s.type === "code"));
              setCodeDone(0);
              setRunId((n) => n + 1);
              startedAt.current = Date.now();
            }}
            onQuit={abortMission}
          />
        ) : (
          <StepView
            key={step}
            step={current}
            onNext={next}
            onCodePass={() => {
              setCodeDone((n) => n + 1);
              next();
            }}
            onMistake={() => setMistakes((n) => n + 1)}
          />
        )}
      </div>
    </div>
  );
}

function StepView({
  step,
  onNext,
  onCodePass,
  onMistake,
}: {
  step: Step;
  onNext: () => void;
  onCodePass: () => void;
  onMistake: () => void;
}) {
  if (step.type === "brief") {
    return (
      <div className="animate-rise">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">Briefing</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">{step.title}</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">{step.body}</p>
        {step.example && (
          <pre className="mt-4 overflow-x-auto rounded-xl bg-surface-2 p-4 font-mono text-sm text-accent">
            {step.example}
          </pre>
        )}
        <Button className="mt-8 w-full" size="lg" onClick={onNext}>
          Continue
        </Button>
      </div>
    );
  }
  if (step.type === "reaction") {
    return <ReactionStep title={step.title} body={step.body} onPass={onNext} />;
  }
  if (step.type === "choice") {
    return <ChoiceStep step={step} onPass={onNext} />;
  }
  return <CodeEditor challenge={step.challenge} onPass={onCodePass} onFail={onMistake} />;
}

function ReactionStep({ title, body, onPass }: { title: string; body: string; onPass: () => void }) {
  const [phase, setPhase] = useState<"idle" | "wait" | "go" | "early" | "done">("idle");
  const [ms, setMs] = useState(0);
  const goAt = useRef(0);
  const timer = useRef<number>(0);

  useEffect(() => {
    return () => window.clearTimeout(timer.current);
  }, []);

  function arm() {
    audio.click();
    setPhase("wait");
    const delay = 800 + Math.random() * 1600;
    goAt.current = Date.now() + delay;
    timer.current = window.setTimeout(() => {
      audio.go();
      setPhase("go");
      goAt.current = Date.now();
    }, delay);
  }

  function tap() {
    if (phase === "wait") {
      window.clearTimeout(timer.current);
      audio.fail();
      setPhase("early");
      return;
    }
    if (phase === "go") {
      const t = Date.now() - goAt.current;
      setMs(t);
      setPhase("done");
      audio.success();
    }
  }

  const grade = ms < 250 ? "Perfect" : ms < 400 ? "Great" : ms < 600 ? "Good" : "Cleared";

  return (
    <div className="animate-rise text-center">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>

      <div className="mx-auto mt-10 flex size-56 items-center justify-center rounded-full bg-surface shadow-[var(--shadow-card)]">
        {phase === "idle" && <p className="text-lg font-medium text-muted">Ready</p>}
        {phase === "wait" && <p className="text-lg font-medium tracking-[0.2em] text-subtle">WAIT</p>}
        {phase === "go" && (
          <p className="text-5xl font-semibold tracking-tight text-accent" style={{ animation: "pulse-ring 0.9s ease-out" }}>
            GO
          </p>
        )}
        {phase === "early" && <p className="text-lg font-medium text-danger">Too soon</p>}
        {phase === "done" && (
          <div>
            <p className="text-3xl font-semibold tabular text-success">{ms} ms</p>
            <p className="mt-1 text-sm text-muted">{grade}</p>
          </div>
        )}
      </div>

      <div className="mt-8">
        {phase === "idle" && (
          <Button size="lg" className="w-full" onClick={arm}>
            Arm signal
          </Button>
        )}
        {(phase === "wait" || phase === "go") && (
          <Button size="lg" className="h-16 w-full text-lg" onClick={tap} variant={phase === "go" ? "primary" : "secondary"}>
            Action
          </Button>
        )}
        {phase === "early" && (
          <Button size="lg" className="w-full" onClick={arm}>
            Try again
          </Button>
        )}
        {phase === "done" && (
          <Button size="lg" className="w-full" onClick={onPass}>
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}

function ChoiceStep({
  step,
  onPass,
}: {
  step: Extract<Step, { type: "choice" }>;
  onPass: () => void;
}) {
  const [picked, setPicked] = useState<ChoiceOption | null>(null);

  return (
    <div className="animate-rise">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">{step.concept}</p>
      <h2 className="mt-2 text-xl font-semibold leading-snug">{step.question}</h2>
      <div className="mt-5 flex flex-col gap-2">
        {step.options.map((opt) => {
          const shown = picked !== null;
          const isThis = picked?.id === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={shown}
              onClick={() => {
                setPicked(opt);
                if (opt.correct) audio.success();
                else audio.fail();
              }}
              className={cn(
                "min-h-12 rounded-lg px-4 py-3 text-left font-mono text-sm shadow-[var(--shadow-card)] transition-transform active:scale-[0.98]",
                !shown && "bg-surface text-fg hover:shadow-[var(--shadow-card-hover)]",
                shown && opt.correct && "bg-success/15 text-success",
                shown && isThis && !opt.correct && "animate-shake bg-danger/15 text-danger",
                shown && !opt.correct && !isThis && "bg-surface text-subtle",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {picked && (
        <div className="mt-4 rounded-xl bg-surface p-4">
          <p className="font-semibold">{picked.correct ? "Correct" : "Try again"}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{picked.explain}</p>
          {!picked.correct && (
            <p className="mt-2 text-sm text-muted">
              The right idea: {step.options.find((o) => o.correct)?.explain}
            </p>
          )}
          <Button
            className="mt-4 w-full"
            onClick={() => {
              if (picked.correct) onPass();
              else setPicked(null);
            }}
          >
            {picked.correct ? "Continue" : "Choose again"}
          </Button>
        </div>
      )}
    </div>
  );
}

function MissionTimer({
  seconds,
  running,
  onExpire,
  freeze,
}: {
  seconds: number;
  running: boolean;
  onExpire: () => void;
  freeze: boolean;
}) {
  const [left, setLeft] = useState(seconds);
  const origin = useRef<number | null>(null);
  const expired = useRef(false);

  useEffect(() => {
    if (!running || freeze) return;
    if (origin.current === null) origin.current = Date.now();
    let raf = 0;
    const tick = () => {
      const elapsed = (Date.now() - origin.current!) / 1000;
      const remain = Math.max(0, seconds - elapsed);
      setLeft(remain);
      if (remain <= 0 && !expired.current) {
        expired.current = true;
        onExpire();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, freeze, seconds, onExpire]);

  useEffect(() => {
    origin.current = Date.now();
    expired.current = false;
    setLeft(seconds);
  }, [seconds]);

  const danger = left <= 10;
  return (
    <div className={cn("flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 font-mono text-sm tabular", danger && "text-danger")}>
      <Timer className="size-4" />
      {Math.ceil(left)}
    </div>
  );
}

function FailCard({
  championship,
  onRetry,
  onQuit,
}: {
  championship: boolean;
  onRetry: () => void;
  onQuit: () => void;
}) {
  return (
    <div className="animate-rise rounded-xl bg-surface p-6 text-center shadow-[var(--shadow-card)]">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-danger">Time</p>
      <h2 className="mt-2 text-2xl font-semibold">{championship ? "Championship timed out" : "Mission failed"}</h2>
      <p className="mt-3 text-sm text-muted">The clock hit zero. Progress in this attempt is not saved. Retry the timed tasks.</p>
      <div className="mt-6 flex flex-col gap-2">
        <Button size="lg" onClick={onRetry}>
          Retry
        </Button>
        <Button variant="ghost" onClick={onQuit}>
          Return home
        </Button>
      </div>
    </div>
  );
}

export function LevelIntro({ levelId }: { levelId: number }) {
  const level = levelById(levelId);
  const beginMission = useGame((s) => s.beginMission);
  const abortMission = useGame((s) => s.abortMission);
  const completed = useGame((s) => s.completedLevels);
  if (!level) return null;
  const practice = completed.includes(level.id);

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <header className="flex items-center gap-3 px-4 py-3">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={abortMission}>
          <ArrowLeft className="size-5" />
        </Button>
      </header>
      <div className="mx-auto w-full max-w-xl flex-1 px-5 pb-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">Level {String(level.id).padStart(2, "0")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{level.title}</h1>
        <p className="mt-2 text-muted">{level.description}</p>

        <dl className="mt-8 space-y-3 rounded-xl bg-surface p-5 shadow-[var(--shadow-card)]">
          <Row k="Difficulty" v={level.difficulty} />
          <Row k="Objective" v={level.objective} />
          <Row k="Reward" v={`+${level.rewardCoins.toLocaleString()} coins  ·  +${level.rewardXp} XP`} />
          <Row k="Unlock" v={level.unlockReward} />
          {practice && <Row k="Status" v="Practice — rewards already claimed" />}
        </dl>

        <Button size="lg" className="mt-8 w-full" onClick={() => beginMission(level.id)}>
          Start mission
        </Button>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-xs uppercase tracking-[0.12em] text-subtle">{k}</dt>
      <dd className="max-w-[60%] text-right text-sm font-medium">{v}</dd>
    </div>
  );
}
