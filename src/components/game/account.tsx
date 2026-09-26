import { Link } from "@tanstack/react-router";
import { SignInGate, UserButton } from "@/lib/auth/gates";
import { authEnabled } from "@/lib/auth/client";
import { useCurrentUser } from "@/lib/auth/use-current-user";

export function AccountCard({ compact = false }: { compact?: boolean }) {
  const user = useCurrentUser();
  if (!authEnabled) return null;
  return (
    <div className="rounded-xl bg-surface px-3 py-3 shadow-[var(--shadow-card)]">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">Account</p>
      <SignInGate
        fallback={
          <div className="mt-2">
            {!compact && (
              <p className="mb-3 text-sm text-muted">
                Sign in with Google to keep your missions and portfolio on this account.
              </p>
            )}
            <Link
              to="/login"
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg"
            >
              Sign in with Google
            </Link>
          </div>
        }
      >
        <div className="mt-2 flex flex-col gap-2">
          <UserButton />
          {user?.primaryEmail ? (
            <p className="text-xs leading-relaxed text-muted">{user.primaryEmail}</p>
          ) : null}
          <p className="text-xs leading-relaxed text-muted">
            Progress syncs to this Google account across devices.
          </p>
        </div>
      </SignInGate>
    </div>
  );
}
