import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Серверные функции системы «Практик клетки».
 * Тексты Санкальпы и рефлексий хранятся приватно (RLS по auth.uid()).
 * Функции возвращают только необходимое клиенту — без чужих записей.
 */

const durationSchema = z.enum(["1h", "1d", "3d", "7d"]);

const DURATION_MS: Record<z.infer<typeof durationSchema>, number> = {
  "1h": 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "3d": 3 * 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

export const startPractice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cellId: z.number().int().min(1).max(72),
        practiceId: z.string().min(1).max(80),
        duration: durationSchema,
        sankalpaBridge: z.string().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Есть ли уже активная — вернём её вместо создания второй.
    const { data: existing } = await supabase
      .from("practice_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (existing) return { session: existing, reused: true };

    const dueAt = new Date(Date.now() + DURATION_MS[data.duration]).toISOString();
    const { data: row, error } = await supabase
      .from("practice_sessions")
      .insert({
        user_id: userId,
        cell_id: data.cellId,
        practice_id: data.practiceId,
        duration: data.duration,
        sankalpa_bridge: data.sankalpaBridge ?? null,
        due_at: dueAt,
        status: "active",
      })
      .select()
      .single();
    if (error) throw error;
    return { session: row, reused: false };
  });

export const getActivePractice = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).default({}).parse(d ?? {}))
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("practice_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { session: data ?? null };
  });

export const toggleStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        sessionId: z.string().uuid(),
        stepIndex: z.number().int().min(0).max(20),
        checked: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("practice_sessions")
      .select("steps_checked")
      .eq("id", data.sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    const current = new Set<number>(row?.steps_checked ?? []);
    if (data.checked) current.add(data.stepIndex);
    else current.delete(data.stepIndex);
    const { error } = await supabase
      .from("practice_sessions")
      .update({ steps_checked: [...current].sort((a, b) => a - b) })
      .eq("id", data.sessionId)
      .eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  });

export const completePractice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        sessionId: z.string().uuid(),
        reflection: z.string().max(4000).optional().nullable(),
        resonance: z.number().int().min(1).max(5).optional().nullable(),
        emotions: z.array(z.string().max(40)).max(10).default([]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("practice_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        reflection: data.reflection ?? null,
        resonance: data.resonance ?? null,
        emotions: data.emotions,
      })
      .eq("id", data.sessionId)
      .eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  });

export const abandonPractice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ sessionId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("practice_sessions")
      .update({ status: "abandoned", abandoned_at: new Date().toISOString() })
      .eq("id", data.sessionId)
      .eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  });

export const extendPractice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        sessionId: z.string().uuid(),
        extra: durationSchema,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("practice_sessions")
      .select("due_at")
      .eq("id", data.sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    const base = row?.due_at ? new Date(row.due_at).getTime() : Date.now();
    const nextDue = new Date(
      Math.max(base, Date.now()) + DURATION_MS[data.extra],
    ).toISOString();
    const { error } = await supabase
      .from("practice_sessions")
      .update({ due_at: nextDue })
      .eq("id", data.sessionId)
      .eq("user_id", userId);
    if (error) throw error;
    return { ok: true, dueAt: nextDue };
  });

export const addJournalEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        sessionId: z.string().uuid().optional().nullable(),
        cellId: z.number().int().min(1).max(72).optional().nullable(),
        text: z.string().min(1).max(4000),
        tags: z.array(z.string().max(40)).max(10).default([]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("practice_journal_entries")
      .insert({
        user_id: userId,
        session_id: data.sessionId ?? null,
        cell_id: data.cellId ?? null,
        text: data.text,
        tags: data.tags,
      })
      .select()
      .single();
    if (error) throw error;
    return { entry: row };
  });

export const listJournalEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        limit: z.number().int().min(1).max(100).default(30),
      })
      .default({})
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows } = await supabase
      .from("practice_journal_entries")
      .select("id, session_id, cell_id, text, tags, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    return { entries: rows ?? [] };
  });

export const getPracticeStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).default({}).parse(d ?? {}))
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: sessions } = await supabase
      .from("practice_sessions")
      .select("cell_id, status, started_at, completed_at, duration")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(200);
    const rows = sessions ?? [];
    const completed = rows.filter((r) => r.status === "completed");
    const visits = new Map<number, number>();
    for (const r of rows) {
      if (r.status === "completed") {
        visits.set(r.cell_id, (visits.get(r.cell_id) ?? 0) + 1);
      }
    }
    const topCells = [...visits.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cell, count]) => ({ cell, count }));
    const { count: entriesCount } = await supabase
      .from("practice_journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    return {
      livedCells: completed.length,
      totalStarted: rows.length,
      journalEntries: entriesCount ?? 0,
      topCells,
    };
  });
