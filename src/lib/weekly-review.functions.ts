import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type WeeklyReviewCell = {
  cell: number;
  lastVisitedAt: string;
  notes: Array<{
    id: string;
    kind: string;
    user_text: string | null;
    prompt: string | null;
    created_at: string;
  }>;
};

// Обзор недели: последние 3 уникальные клетки из journal_entries за 7 дней + заметки к ним.
export const getWeeklyReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: rows, error } = await context.supabase
      .from("journal_entries")
      .select("id, cell, kind, user_text, prompt, created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const byCell = new Map<number, WeeklyReviewCell>();
    for (const r of rows ?? []) {
      if (!r.cell) continue;
      const existing = byCell.get(r.cell);
      if (existing) {
        existing.notes.push({
          id: r.id,
          kind: r.kind,
          user_text: r.user_text,
          prompt: r.prompt,
          created_at: r.created_at,
        });
      } else {
        byCell.set(r.cell, {
          cell: r.cell,
          lastVisitedAt: r.created_at,
          notes: [
            {
              id: r.id,
              kind: r.kind,
              user_text: r.user_text,
              prompt: r.prompt,
              created_at: r.created_at,
            },
          ],
        });
      }
      if (byCell.size >= 3 && !existing) {
        // продолжаем собирать заметки только для уже добавленных клеток
      }
    }
    // Берём первые 3 (самые недавние по порядку появления)
    const cells = Array.from(byCell.values()).slice(0, 3);
    return {
      weekStart: sinceIso,
      cells,
      totalNotes: (rows ?? []).length,
    };
  });
