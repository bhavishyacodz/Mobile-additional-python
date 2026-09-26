import { createServerFn } from "@tanstack/react-start";

export type OnboardingStatus = {
  user: { id: string; email: string | null } | null;
  onboarded: boolean;
  age: number | null;
  displayName: string | null;
};

/**
 * Client-safe server functions.
 *
 * IMPORTANT: do not statically import auth middleware, database modules, or
 * *.server files from this module. This file is imported by client routes.
 * TanStack Start moves the handler body to the server, so server-only
 * dependencies belong inside the handler.
 */
export const loadOnboardingStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<OnboardingStatus> => {
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const { getSql } = await import("@/lib/db");

    const user = await getSessionUser();
    if (!user) {
      return { user: null, onboarded: false, age: null, displayName: null };
    }

    const sql = await getSql();
    const rows = await sql<{ age: number; display_name: string | null }>`
      select age, display_name from user_profiles where user_id = ${user.id} limit 1
    `;
    const row = rows[0];

    return {
      user: { id: user.id, email: user.email },
      onboarded: Boolean(row),
      age: row?.age ?? null,
      displayName: row?.display_name ?? null,
    };
  },
);

export const saveOnboarding = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const input = data as { displayName?: unknown; age?: unknown };
    const displayName =
      typeof input.displayName === "string" ? input.displayName.trim().slice(0, 24) : "";
    const age = typeof input.age === "number" ? Math.floor(input.age) : Number(input.age);

    if (!displayName) throw new Error("Display name is required");
    if (!Number.isFinite(age) || age < 13 || age > 120) {
      throw new Error("Enter your age (13 or older)");
    }

    return { displayName, age };
  })
  .handler(async ({ data }) => {
    // Server-only dependencies stay inside the server handler so this module
    // remains safe to import from the browser.
    const { requireUserId } = await import("@/lib/auth/verify.server");
    const { getSql } = await import("@/lib/db");

    const userId = await requireUserId();
    const sql = await getSql();

    await sql.query(
      `insert into user_profiles (user_id, display_name, age, onboarded_at)
       values ($1, $2, $3, now())
       on conflict (user_id) do update
         set display_name = excluded.display_name,
             age = excluded.age,
             onboarded_at = now()`,
      [userId, data.displayName, data.age],
    );

    return { ok: true as const };
  });
