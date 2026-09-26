import { useEffect, useRef } from "react";
import { authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { loadCareerSave, saveCareerSave } from "@/lib/game/cloud";
import { snapshotSave } from "@/lib/game/save-sync";
import { useGame } from "@/lib/game/store";

function isUnauthorized(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { status?: number; message?: string };
  return e.status === 401 || e.message === "Unauthorized";
}

export function CloudSaveSync() {
  const { user, isPending } = useCurrentUserState();
  const hydrated = useGame((s) => s.hydrated);
  const applyRemoteSave = useGame((s) => s.applyRemoteSave);
  const userId = user && !user.isDevFallback ? user.id : null;
  const displayName = user?.displayName ?? null;
  const pulling = useRef(false);
  const lastJson = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!authEnabled || isPending || !hydrated || !userId) return;
    let alive = true;
    pulling.current = true;
    void loadCareerSave()
      .then((remote) => {
        if (!alive) return;
        applyRemoteSave(remote, displayName);
        const snap = snapshotSave(useGame.getState());
        lastJson.current = JSON.stringify(snap);
        return saveCareerSave({ data: snap });
      })
      .catch((err) => {
        if (!isUnauthorized(err)) console.warn("career save load failed", err);
      })
      .finally(() => {
        pulling.current = false;
      });
    return () => {
      alive = false;
    };
  }, [applyRemoteSave, displayName, hydrated, isPending, userId]);

  useEffect(() => {
    if (!authEnabled || !userId) return;
    const unsub = useGame.subscribe((state) => {
      if (!state.hydrated || pulling.current) return;
      const snap = snapshotSave(state);
      const json = JSON.stringify(snap);
      if (json === lastJson.current) return;
      lastJson.current = json;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void saveCareerSave({ data: snap }).catch((err) => {
          if (!isUnauthorized(err)) console.warn("career save write failed", err);
        });
      }, 700);
    });
    return () => {
      unsub();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [userId]);

  return null;
}
