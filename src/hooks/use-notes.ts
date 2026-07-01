import { useCallback, useEffect, useState } from "react";
import { safeGet, safeSet } from "@/lib/safe-storage";

const KEY = "lila.notes";

// Заметки-рефлексии после змей/стрел. По умолчанию выключены.
export function useNotes() {
  const [enabled, setEnabled] = useState<boolean>(() => safeGet(KEY) === "1");

  useEffect(() => {
    safeSet(KEY, enabled ? "1" : "0");
  }, [enabled]);

  const toggle = useCallback(() => setEnabled((v) => !v), []);
  return { enabled, toggle };
}
