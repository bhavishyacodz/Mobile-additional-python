import { useState } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { GUEST_PLAY_KEY, GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";

const getLoginStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { authConfigured, authSecretConfigured, googleOAuthConfigured } = await import(
    "@/lib/auth/server"
  );
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const { getSql } = await import("@/lib/db");
  const sessionUser = await getSessionUser();
  let onboarded = false;
  if (sessionUser) {
    const sql = await getSql();
    const rows = await sql<{ user_id: string }>`
      select user_id from user_profiles where user_id = ${sessionUser.id} limit 1
    `;
    onboarded = Boolean(rows[0]);
  }
  return {
    googleConfigured: googleOAuthConfigured,
    authConfigured,
    persistSessions: authSecretConfigured || !process.env.DATABASE_URL?.trim(),
    onboarded,
    hasSession: Boolean(sessionUser),
  };
});

type LoginSearch = {
  error?: string;
  error_description?: string;
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    error: typeof search.error === "string" ? search.error : undefined,
    error_description:
      typeof search.error_description === "string" ? search.error_description : undefined,
  }),
  loader: () => getLoginStatus(),
  component: Login,
});

function friendlyAuthError(code?: string, description?: string): string | null {
  if (!code && !description) return null;
  const key = (code ?? "").toLowerCase();
  if (key === "access_denied" || key === "user_cancelled") {
    return "Google sign-in was cancelled. Try again when you are ready.";
  }
  if (key.includes("provider") || key === "provider_not_found") {
    return "Google login is not configured on this deployment. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.";
  }
  if (key.includes("state") || key.includes("csrf") || key.includes("origin")) {
    return "Sign-in could not be verified (origin or CSRF). Check BETTER_AUTH_URL matches this site.";
  }
  if (description) return description;
  return `Google sign-in failed (${code}).`;
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.6 12.23c0-.74-.06-1.28-.2-1.84H12v3.34h5.48c-.11.9-.7 2.26-2.01 3.18l-.02.12 2.92 2.22.2.02c1.86-1.68 2.93-4.15 2.93-7.04z"
      />
      <path
        fill="currentColor"
        opacity="0.85"
        d="M12 22c2.7 0 4.96-.87 6.62-2.37l-3.15-2.4c-.85.58-1.98 1-3.47 1-2.65 0-4.9-1.73-5.7-4.13l-.12.01-3.08 2.35-.04.11C4.67 19.99 8.09 22 12 22z"
      />
      <path
        fill="currentColor"
        opacity="0.7"
        d="M6.3 13.11A6.04 6.04 0 0 1 6 12c0-.39.05-.76.08-1.11l-.01-.12-3.12-2.38-.1.05A9.99 9.99 0 0 0 2 12c0 1.61.39 3.13 1.07 4.48l3.23-2.37z"
      />
      <path
        fill="currentColor"
        opacity="0.55"
        d="M12 5.94c1.88 0 3.15.8 3.87 1.46l2.83-2.71C16.95 3.05 14.7 2 12 2 8.09 2 4.67 4.01 3.07 7.52l3.22 2.37C7.1 7.49 9.35 5.94 12 5.94z"
      />
    </svg>
  );
}

function Login() {
  const { user } = useCurrentUserState();
  const search = Route.useSearch();
  const status = Route.useLoaderData();
  const [busy, setBusy] = useState(false);
  const [clickError, setClickError] = useState<string | null>(null);

  const callbackError = friendlyAuthError(search.error, search.error_description);
  const error = clickError ?? callbackError;

  if (user) {
    return <Navigate to={status.onboarded ? "/" : "/onboarding"} />;
  }

  async function handleGoogle() {
    setClickError(null);
    if (!authEnabled) {
      setClickError("Sign-in is disabled (VITE_AUTH_ENABLED=false).");
      return;
    }
    if (!status.googleConfigured) {
      setClickError(
        "Google login is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on this deployment, then redeploy.",
      );
      return;
    }
    setBusy(true);
    try {
      await signIn("google", { callbackURL: "/", errorCallbackURL: "/login" });
    } catch (err) {
      setBusy(false);
      setClickError(err instanceof Error ? err.message : "Google sign-in failed. Please try again.");
    }
  }

  return (
    <main className="flex min-h-dvh flex-col bg-bg px-6 py-10 text-fg">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <p className="text-xs font-medium uppercase tracking-widest text-accent">Jarvis Career</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Continue with Google to keep missions, freelance gigs, and your portfolio on this account.
          You can still play as a guest on this device.
        </p>

        {!status.googleConfigured ? (
          <div
            role="status"
            className="mt-6 rounded-md bg-warn/15 px-3 py-3 text-sm leading-relaxed text-warn"
          >
            Google login is not configured on this deployment yet. Set GOOGLE_CLIENT_ID and
            GOOGLE_CLIENT_SECRET, then redeploy. Guest play still works.
          </div>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="mt-6 rounded-md bg-danger/15 px-3 py-3 text-sm leading-relaxed text-danger"
          >
            {error}
          </div>
        ) : null}

        {!status.persistSessions ? (
          <p className="mt-4 text-sm leading-relaxed text-warn">
            BETTER_AUTH_SECRET is missing, so sessions may not survive a refresh. Set it in the
            deployment environment.
          </p>
        ) : null}

        {authEnabled ? (
          <div className="mt-8 flex flex-col gap-3">
            {GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                size="lg"
                variant="primary"
                className="w-full"
                disabled={busy}
                onClick={() => void handleGoogle()}
              >
                <GoogleMark />
                {busy ? "Redirecting to Google…" : `Continue with ${p.label}`}
              </Button>
            ))}
          </div>
        ) : (
          <p className="mt-8 text-sm text-muted">Sign-in is disabled.</p>
        )}

        <Link
          to="/"
          onClick={() => {
            try {
              window.sessionStorage.setItem(GUEST_PLAY_KEY, "1");
            } catch {
              /* ignore */
            }
          }}
          className="mt-6 inline-flex h-11 items-center justify-center text-sm font-medium text-muted hover:text-fg"
        >
          Continue as guest
        </Link>
      </div>
    </main>
  );
}
