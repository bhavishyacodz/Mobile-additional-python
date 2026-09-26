import { useEffect, useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { GameApp } from "@/components/game/app";
import { GUEST_PLAY_KEY } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { loadOnboardingStatus } from "@/lib/game/profile";

export const Route = createFileRoute("/")({
  loader: () => loadOnboardingStatus(),
  component: Home,
});

function Home() {
  const status = Route.useLoaderData();
  const { user, isPending } = useCurrentUserState();
  const [guest, setGuest] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setGuest(window.sessionStorage.getItem(GUEST_PLAY_KEY) === "1");
    } catch {
      setGuest(false);
    }
  }, []);

  if (isPending || guest === null) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg text-fg">
        <p className="text-sm text-muted">Loading Jarvis Career…</p>
      </main>
    );
  }

  if (user) {
    if (!status.onboarded) return <Navigate to="/onboarding" />;
    return <GameApp />;
  }

  if (guest) return <GameApp />;
  return <Navigate to="/login" />;
}
