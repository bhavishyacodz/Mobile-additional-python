import { createServerFn } from "@tanstack/react-start";
import type { SaveState } from "@/lib/game/types";

function asPayload(raw: unknown): SaveState | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as SaveState;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") return raw as SaveState;
}

/**
 * Client-safe server functions for cloud saves.
 *
 * Keep auth/database imports inside handlers. This module is imported by the
 * browser-side game UI, so static server-only imports would pull Node/server
 * code into the client bundle and can cause a blank screen.
 */
export const loadCareerSave = createServerFn({ method: "GET" }).handler(async () => {
  const { requireUserId } = await import("@/lib/auth/verify.server");
  const { getSql } = await import("@/lib/db");

  const userId = await requireUserId();
  const sql = await getSql();
  const rows = await sql<{ payload: unknown }>`
    select payload from career_saves where user_id = ${userId} limit 1
  `;
  return asPayload(rows[0]?.payload);
});

export const saveCareerSave = createServerFn({ method: "POST" })
  .validator((data: SaveState) => data)
  .handler(async ({ data }) => {
    const { requireUserId } = await import("@/lib/auth/verify.server");
    const { getSql } = await import("@/lib/db");

    const userId = await requireUserId();
    const sql = await getSql();
    const payload = JSON.stringify(data);

    await sql.query(
      `insert into career_saves (user_id, payload, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (user_id) do update set payload = excluded.payload, updated_at = now()`,
      [userId, payload],
    );

    return { ok: true as const };
  });
