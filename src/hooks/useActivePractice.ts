import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getActivePractice } from "@/lib/practices.functions";

export interface ActivePracticeRow {
  id: string;
  cell_id: number;
  practice_id: string;
  duration: string;
  started_at: string;
  due_at: string | null;
  sankalpa_bridge: string | null;
  steps_checked: number[];
  status: string;
}

/**
 * Загружает активную практику текущего игрока и предоставляет
 * ручной `refresh()`. Не поллит слишком часто — только при mount
 * и по явному запросу (после старта/завершения).
 */
export function useActivePractice() {
  const load = useServerFn(getActivePractice);
  const [session, setSession] = useState<ActivePracticeRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await load({ data: {} });
      setSession((res?.session as ActivePracticeRow | null) ?? null);
    } catch {
      // тихо игнорим — не блокируем игру
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { session, loading, refresh, setSession };
}
