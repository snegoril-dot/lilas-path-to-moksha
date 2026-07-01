import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Сводка профиля пути — агрегация из существующих таблиц
 * (`game_sessions`, `journal_entries`, `guru_usage`).
 *
 * Никаких «психологических ярлыков» и выводов о личности:
 * только счётчики и id клеток. Тексты Санкальпы и заметок не возвращаются.
 */
export const getProfileSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({}).default({}).parse(d ?? {}),
  )
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

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
