import { useCallback, useEffect, useState } from "react";
import { playGong } from "@/lib/sound";

const KEY = "lila.sound";

export function useSound() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(KEY) !== "0";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, enabled ? "1" : "0");
  }, [enabled]);

  const toggle = useCallback(() => setEnabled((v) => !v), []);
  const play = useCallback(
    (kind: Parameters<typeof playGong>[0]) => playGong(kind, enabled),
    [enabled]
  );

  return { enabled, toggle, play };
}
