import { useState, useEffect, type FormEvent } from "react";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { loadOnboardingStatus, saveOnboarding } from "@/lib/game/profile";
import { useGame } from "@/lib/game/store";

export const Route = createFileRoute("/onboarding")({
  loader: () => loadOnboardingStatus(),
  component: Onboarding,
});

function Onboarding() {
  const status = Route.useLoaderData();
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const setName = useGame((s) => s.setName);
  const startCareer = useGame((s) => s.startCareer);
  const [name, setNameDraft] = useState(
    () => status.displayName || user?.displayName || "",
  );
  const [age, setAge] = useState(status.age ? String(status.age) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!name && user?.displayName) setNameDraft(user.displayName);
  }, [name, user]);

  if (isPending) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg px-6 text-fg">
        <div className="h-12 w-48 animate-pulse rounded-md bg-surface" />
      </main>
    );
  }

  if (!user) return <Navigate to="/login" />;
  if (status.onboarded) return <Navigate to="/" />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const trimmed = name.trim().slice(0, 24);
    const parsedAge = Number.parseInt(age, 10);
    if (!trimmed) {
      setError("Tell us what to call you.");
      return;
    }
    if (!Number.isFinite(parsedAge) || parsedAge < 13 || parsedAge > 120) {
      setError("You must be 13 or older to play with a saved account.");
      return;
    }
    setBusy(true);
    try {
      await saveOnboarding({ data: { displayName: trimmed, age: parsedAge } });
      setName(trimmed);
      startCareer();
      await navigate({ to: "/" });
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Could not save your profile.");
    }
  }

  return (
    <main className="flex min-h-dvh flex-col bg-bg px-6 py-10 text-fg">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center"
      >
        <p className="text-xs font-medium uppercase tracking-widest text-accent">Jarvis Career</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Set up your profile</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Signed in as {user.primaryEmail ?? user.displayName ?? "Google"}. One quick step, then the
          missions open.
        </p>

        {user.profileImageUrl ? (
          <img
            src={user.profileImageUrl}
            alt=""
            className="mt-6 size-16 rounded-full object-cover"
          />
        ) : null}

        {error ? (
          <div role="alert" className="mt-6 rounded-md bg-danger/15 px-3 py-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <label className="mt-6 block text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">
          Display name
          <input
            value={name}
            maxLength={24}
            required
            autoComplete="nickname"
            onChange={(e) => setNameDraft(e.target.value)}
            className="mt-1 h-12 w-full rounded-md bg-surface px-3 text-base text-fg shadow-[var(--shadow-card)] outline-none focus:shadow-[var(--shadow-card-hover)]"
          />
        </label>

        <label className="mt-4 block text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">
          Age
          <input
            value={age}
            inputMode="numeric"
            required
            min={13}
            max={120}
            onChange={(e) => setAge(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
            className="mt-1 h-12 w-full rounded-md bg-surface px-3 text-base text-fg shadow-[var(--shadow-card)] outline-none focus:shadow-[var(--shadow-card-hover)]"
          />
        </label>
        <p className="mt-2 text-xs text-muted">Required. You must be 13 or older.</p>

        <Button type="submit" size="lg" className="mt-8 w-full" disabled={busy}>
          {busy ? "Saving…" : "Enter Jarvis Career"}
        </Button>
      </form>
    </main>
  );
}
