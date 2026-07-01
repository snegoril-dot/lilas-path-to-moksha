import { useCallback, useEffect, useState } from "react";
import { playGong } from "@/lib/sound";
import { safeGet, safeSet } from "@/lib/safe-storage";

const KEY = "lila.sound";

export function useSound() {
  const [enabled, setEnabled] = useState<boolean>(() => safeGet(KEY) !== "0");

  useEffect(() => {
    safeSet(KEY, enabled ? "1" : "0");
  }, [enabled]);

  const toggle = useCallback(() => setEnabled((v) => !v), []);
  const play = useCallback(
    (kind: Parameters<typeof playGong>[0]) => playGong(kind, enabled),
    [enabled]
  );

  return { enabled, toggle, play };
}
