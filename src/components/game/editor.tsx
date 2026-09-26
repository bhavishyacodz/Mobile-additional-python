import { useEffect, useRef, useState } from "react";
import { Check, CircleAlert, Lightbulb, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CodeChallenge, CodeRunStats } from "@/lib/game/types";
import { analyzeRun, formatOutput, type TutorFeedback } from "@/lib/game/tutor";
import { audio } from "@/lib/game/audio";
import { cn } from "@/lib/utils";

type Props = {
  challenge: CodeChallenge;
  onPass: (stats: CodeRunStats) => void;
  onFail?: () => void;
  disabled?: boolean;
  fileName?: string;
};

export function CodeEditor({ challenge, onPass, onFail, disabled, fileName = "mission.py" }: Props) {
  const [code, setCode] = useState(challenge.starter);
  const [feedback, setFeedback] = useState<TutorFeedback | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [hintN, setHintN] = useState(0);
  const [showSol, setShowSol] = useState(false);
  const [passed, setPassed] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    setCode(challenge.starter);
    setFeedback(null);
    setAttempts(0);
    setHintN(0);
    setShowSol(false);
    setPassed(false);
    startedAt.current = Date.now();
  }, [challenge.id, challenge.starter]);

  function run() {
    if (disabled || passed) return;
    const { feedback: fb } = analyzeRun(code, challenge.expected);
    setFeedback(fb);
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    if (fb.status === "success") {
      audio.success();
      setPassed(true);
      const stats: CodeRunStats = {
        attempts: nextAttempts,
        hintsUsed: hintN,
        showedSolution: showSol,
        elapsedMs: Date.now() - startedAt.current,
      };
      window.setTimeout(() => onPass(stats), 550);
    } else {
      audio.fail();
      onFail?.();
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      run();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = code.slice(0, start) + "    " + code.slice(end);
      setCode(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 4;
      });
    }
  }

  const lines = Math.max(6, code.split("\n").length);
  const nums = Array.from({ length: lines }, (_, i) => i + 1);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-card)]">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">{challenge.concept}</p>
        <h3 className="mt-1 text-lg font-semibold leading-snug text-fg">{challenge.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{challenge.prompt}</p>
        <details className="mt-3 rounded-md bg-bg-elevated px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-fg">Python briefing</summary>
          <p className="mt-2 text-sm leading-relaxed text-muted">{challenge.briefing}</p>
          <pre className="mt-2 overflow-x-auto font-mono text-xs leading-relaxed text-accent">
            {challenge.example}
          </pre>
        </details>
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-xl bg-bg-elevated shadow-[var(--shadow-card)]",
          feedback?.line && feedback.status !== "success" && "ring-1 ring-danger/60",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-subtle">{fileName}</span>
          <span className="text-[11px] text-subtle">Tab indents · Ctrl+Enter runs</span>
        </div>
        <div className="flex min-h-36">
          <div className="select-none bg-bg py-3 pl-3 pr-2 font-mono text-xs leading-6 text-subtle tabular">
            {nums.map((n) => (
              <div key={n} className={cn("text-right", feedback?.line === n && "text-danger")}>
                {n}
              </div>
            ))}
          </div>
          <textarea
            ref={ta}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={onKey}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            disabled={disabled || passed}
            aria-label="Python editor"
            className="min-h-36 w-full resize-y bg-transparent px-3 py-3 font-mono text-[16px] leading-6 text-fg outline-none md:text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={run} disabled={disabled || passed} className="flex-1">
          <Play className="size-4 translate-x-px" />
          {passed ? "Passed" : "Run code"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            audio.click();
            setCode(challenge.starter);
            setFeedback(null);
            setPassed(false);
          }}
          disabled={disabled}
        >
          <RotateCcw className="size-4" />
          Reset
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={hintN >= challenge.hints.length}
          onClick={() => {
            audio.click();
            setHintN((n) => Math.min(challenge.hints.length, n + 1));
          }}
        >
          <Lightbulb className="size-4" />
          Hint {hintN > 0 ? `${hintN}/${challenge.hints.length}` : ""}
        </Button>
        {attempts >= 2 && !passed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              audio.click();
              setShowSol(true);
            }}
          >
            Show working code
          </Button>
        )}
      </div>

      {hintN > 0 && (
        <ul className="space-y-1 rounded-lg bg-surface px-3 py-2 text-sm text-muted">
          {challenge.hints.slice(0, hintN).map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      )}

      {showSol && (
        <pre className="overflow-x-auto rounded-lg bg-surface-2 p-3 font-mono text-xs text-accent">{challenge.solution}</pre>
      )}

      {feedback && <FeedbackCard fb={feedback} />}
    </div>
  );
}

function FeedbackCard({ fb }: { fb: TutorFeedback }) {
  const ok = fb.status === "success";
  return (
    <div
      className={cn(
        "animate-rise rounded-xl p-4 shadow-[var(--shadow-card)]",
        ok ? "bg-success/10" : "bg-surface",
      )}
    >
      <div className="flex items-center gap-2">
        {ok ? <Check className="size-5 text-success" /> : <CircleAlert className="size-5 text-warn" />}
        <p className="font-semibold text-fg">{fb.title}</p>
        {fb.line ? <span className="ml-auto font-mono text-xs text-subtle">line {fb.line}</span> : null}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-fg">{fb.what}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        <span className="font-medium text-fg">Why. </span>
        {fb.why}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        <span className="font-medium text-fg">Fix. </span>
        {fb.fix}
      </p>
      {fb.example && (
        <pre className="mt-3 overflow-x-auto rounded-md bg-bg p-3 font-mono text-xs text-accent">{fb.example}</pre>
      )}
      {(fb.got !== undefined || fb.expected !== undefined) && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <OutBlock label="Yours" value={formatOutput(fb.got ?? "")} bad />
          <OutBlock label="Expected" value={formatOutput(fb.expected ?? "")} />
        </div>
      )}
    </div>
  );
}

function OutBlock({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="rounded-md bg-bg p-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">{label}</p>
      <pre className={cn("mt-1 whitespace-pre-wrap font-mono text-xs", bad ? "text-danger" : "text-success")}>
        {value}
      </pre>
    </div>
  );
}
