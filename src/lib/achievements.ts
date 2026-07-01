import { safeGet, safeSet } from "@/lib/safe-storage";

export interface Achievement {
  id: string;
  emoji: string;
  title: string;
  description: string;
  /** возвращает true, если достижение разблокировано данным набором сессий */
  check: (input: AchievementsInput) => boolean;
}

export interface SessionSummary {
  id: string;
  result: "moksha" | "abandoned" | "in_progress";
  moves_count: number;
  started_at: string;
  finished_at: string | null;
  sankalpa: string | null;
  path: Array<{ cell: number; kind: string; to?: number }>;
}

export interface AchievementsInput {
  sessions: SessionSummary[];
}

const MS_WEEK = 7 * 24 * 60 * 60 * 1000;

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_moksha",
    emoji: "🪷",
    title: "Первая Мокша",
    description: "Достигни Кайласа (клетка 68) впервые.",
    check: ({ sessions }) => sessions.some((s) => s.result === "moksha"),
  },
  {
    id: "no_snakes",
    emoji: "🛡",
    title: "Путь без змей",
    description: "Заверши партию, не попав ни на одну змею.",
    check: ({ sessions }) =>
      sessions.some(
        (s) => s.result === "moksha" && !s.path.some((p) => p.kind === "snake")
      ),
  },
  {
    id: "three_in_week",
    emoji: "🔥",
    title: "Три партии за неделю",
    description: "Сыграй 3 партии за 7 дней.",
    check: ({ sessions }) => {
      if (sessions.length < 3) return false;
      const recent = sessions
        .map((s) => new Date(s.started_at).getTime())
        .filter((t) => Date.now() - t < MS_WEEK);
      return recent.length >= 3;
    },
  },
  {
    id: "ladder_master",
    emoji: "🪜",
    title: "Восходящий",
    description: "За одну партию поднимись по 3 стрелам.",
    check: ({ sessions }) =>
      sessions.some(
        (s) => s.path.filter((p) => p.kind === "ladder").length >= 3
      ),
  },
  {
    id: "swift_moksha",
    emoji: "⚡",
    title: "Стремительная Мокша",
    description: "Дойди до 68 менее чем за 25 бросков.",
    check: ({ sessions }) =>
      sessions.some((s) => s.result === "moksha" && s.moves_count > 0 && s.moves_count < 25),
  },
  {
    id: "with_sankalpa",
    emoji: "🕉",
    title: "С намерением",
    description: "Заверши партию с заданной Санкальпой.",
    check: ({ sessions }) =>
      sessions.some((s) => s.result === "moksha" && !!s.sankalpa && s.sankalpa.length > 0),
  },
];

export function computeUnlocked(input: AchievementsInput): Set<string> {
  return new Set(ACHIEVEMENTS.filter((a) => a.check(input)).map((a) => a.id));
}

const STORAGE_KEY = "lila.achievements.seen";

export function loadSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = safeGet(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function saveSeen(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    safeSet(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

export function diffNewUnlocks(unlocked: Set<string>): string[] {
  const seen = loadSeen();
  return [...unlocked].filter((id) => !seen.has(id));
}
