// Safe Telegram-friendly sharing helpers for Lila session summaries.
// Default share text NEVER contains Sankalpa or personal notes.

const APP_NAME = "Lila's Path to Moksha";
const CTA = `Попробуй пройти свой путь в ${APP_NAME}.`;

const POETIC_LINES: Record<ShareResult, string> = {
  moksha: "Путь показал: тот, кто играл, растворился в Игре.",
  paused: "Путь показал: каждый шаг становится зеркалом, если смотреть внимательно.",
  in_progress: "Каждый шаг здесь — тихое зеркало.",
};

export type ShareResult = "moksha" | "paused" | "in_progress";

export interface BuildShareTextInput {
  result: ShareResult;
  cellId: number | null; // null if not born yet
  cellName: string | null;
  /** Include Sankalpa only if the user explicitly opts in. */
  includeSankalpa?: boolean;
  sankalpa?: string | null;
  /** Include short note excerpts only if the user explicitly opts in. */
  includeNotes?: boolean;
  notes?: Array<{ kind: "snake" | "ladder"; name: string; note: string }>;
}

/**
 * Generates the share text. Private fields are excluded by default.
 */
export function buildShareText(input: BuildShareTextInput): string {
  const { result, cellId, cellName, includeSankalpa, sankalpa, includeNotes, notes } = input;

  const cellLine =
    cellId && cellName
      ? result === "moksha"
        ? `Я прошёл путь в Лиле и дошёл до клетки ${cellId} — ${cellName}.`
        : result === "paused"
          ? `Я остановился на клетке ${cellId} — ${cellName}.`
          : `Сейчас я на клетке ${cellId} — ${cellName}.`
      : "Моя душа ещё ждёт воплощения на игровом поле.";

  const parts: string[] = [cellLine, POETIC_LINES[result]];

  if (includeSankalpa && sankalpa && sankalpa.trim()) {
    parts.push(`Санкальпа: «${sankalpa.trim()}»`);
  }
  if (includeNotes && notes && notes.length > 0) {
    const excerpts = notes
      .slice(-2)
      .map((n) => `${n.kind === "snake" ? "🐍" : "🪜"} ${n.name}: «${n.note}»`)
      .join("\n");
    parts.push(excerpts);
  }

  parts.push(CTA);
  return parts.join("\n");
}

export type ShareOutcome = "shared" | "clipboard" | "failed";

type TgWebApp = {
  switchInlineQuery?: (q: string, types?: string[]) => void;
  openTelegramLink?: (url: string) => void;
  shareMessage?: (msg_id: number) => void;
};

function getTg(): TgWebApp | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp ?? null;
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through */
    }
  }
  if (typeof document === "undefined") return false;
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Attempt native Telegram sharing; fall back to clipboard for non-Telegram or unsupported clients.
 */
export async function shareToTelegram(text: string): Promise<ShareOutcome> {
  const tg = getTg();
  if (tg?.switchInlineQuery) {
    try {
      tg.switchInlineQuery(text, ["users", "groups"]);
      return "shared";
    } catch {
      /* fall through */
    }
  }
  if (tg?.openTelegramLink) {
    try {
      const url = `https://t.me/share/url?url=${encodeURIComponent(
        typeof window !== "undefined" ? window.location.href : "https://t.me"
      )}&text=${encodeURIComponent(text)}`;
      tg.openTelegramLink(url);
      return "shared";
    } catch {
      /* fall through */
    }
  }
  const copied = await copyToClipboard(text);
  return copied ? "clipboard" : "failed";
}
