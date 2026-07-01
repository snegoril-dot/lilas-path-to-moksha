import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const EMPTY_SUMMARY = {
  totalStarted: 0,
  totalCompleted: 0,
  lastActiveAt: null as string | null,
  lastCurrentCell: null as number | null,
  hasActiveSession: false,
  hasPreviousSessions: false,
  insightsCount: 0,
  guruUses: 0,
  topCells: [] as Array<{ cell: number; count: number }>,
};

/**
 * Сводка профиля пути. Публичный server fn: если запрос без Supabase-сессии
 * (анонимный вход отключён), возвращаем пустую сводку, чтобы главная
 * страница «/» не падала в error boundary. С сессией — обычная агрегация.
 */
export const getProfileSummary = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({}).default({}).parse(d ?? {}),
  )
  .handler(async () => {
    const auth = getRequestHeader("authorization");
    const token = auth?.toLowerCase().startsWith("bearer ")
      ? auth.slice(7).trim()
      : null;
    if (!token) return EMPTY_SUMMARY;

    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      },
    );
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return EMPTY_SUMMARY;

    // Игровые сессии — берём последние 100 для агрегатов по клеткам.
    const { data: sessions } = await supabase
      .from("game_sessions")
      .select("id, result, current_cell, updated_at, finished_at, path")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(100);

    const rows = sessions ?? [];
    const totalStarted = rows.length;
    const totalCompleted = rows.filter((r) => r.result === "moksha").length;
    const inProgress = rows.find(
      (r) => r.result === "in_progress" && (r.current_cell ?? 0) > 0,
    );
    const lastActiveAt =
      rows[0]?.updated_at ?? rows[0]?.finished_at ?? null;

    // Топ посещённых клеток (без содержимого заметок).
    const visits = new Map<number, number>();
    for (const r of rows) {
      const path = Array.isArray(r.path) ? r.path : [];
      for (const step of path as Array<{ cell?: number }>) {
        const c = typeof step?.cell === "number" ? step.cell : null;
        if (c && c >= 1 && c <= 72) visits.set(c, (visits.get(c) ?? 0) + 1);
      }
    }
    const topCells = [...visits.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cell, count]) => ({ cell, count }));

    // Счётчик инсайтов.
    const { count: insightsCount } = await supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    // Использование Гуру (сумма по дням).
    const { data: guruDays } = await supabase
      .from("guru_usage")
      .select("count")
      .eq("user_id", userId);
    const guruUses = (guruDays ?? []).reduce(
      (s, r) => s + (r.count ?? 0),
      0,
    );

    return {
      totalStarted,
      totalCompleted,
      lastActiveAt,
      lastCurrentCell: inProgress?.current_cell ?? null,
      hasActiveSession: Boolean(inProgress),
      hasPreviousSessions: totalStarted > 0,
      insightsCount: insightsCount ?? 0,
      guruUses,
      topCells,
    };
  });
