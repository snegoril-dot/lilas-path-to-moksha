export type BoardThemeId = "classic" | "cosmic" | "aqua";

export interface BoardTheme {
  id: BoardThemeId;
  name: string;
  emoji: string;
  /** CSS background (gradient или url) для доски */
  bg: string;
  labelClass: string;
  numberClass: string;
  frameRing: string;
  gridInset: { top: number; right: number; bottom: number; left: number };
  gridGap: number;
}

export const DEFAULT_INSET = { top: 4, right: 4, bottom: 4, left: 4 };

// Все живописные фоны удалены — используем чистые CSS-градиенты,
// пока не будет финального арта.
const CLASSIC_BG =
  "linear-gradient(180deg, #2a1810 0%, #4a2818 40%, #6b3a1f 70%, #2a1810 100%)";
const COSMIC_BG =
  "radial-gradient(ellipse at 50% 30%, #1e1b4b 0%, #0f0a2e 50%, #000010 100%)";
const AQUA_BG =
  "linear-gradient(180deg, #e0f2fe 0%, #bae6fd 50%, #7dd3fc 100%)";

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: "classic",
    name: "Раджпут",
    emoji: "🕉",
    bg: CLASSIC_BG,
    labelClass: "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]",
    numberClass: "text-amber-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]",
    frameRing: "ring-amber-200/30",
    gridInset: { top: 4, right: 4, bottom: 4, left: 4 },
    gridGap: 0.4,
  },
  {
    id: "cosmic",
    name: "Космос",
    emoji: "🌌",
    bg: COSMIC_BG,
    labelClass: "text-fuchsia-50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]",
    numberClass: "text-amber-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]",
    frameRing: "ring-fuchsia-300/30",
    gridInset: { top: 4, right: 4, bottom: 4, left: 4 },
    gridGap: 0.4,
  },
  {
    id: "aqua",
    name: "Акварель",
    emoji: "🪷",
    bg: AQUA_BG,
    labelClass: "text-sky-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]",
    numberClass: "text-amber-700 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]",
    frameRing: "ring-sky-300/40",
    gridInset: { top: 4, right: 4, bottom: 4, left: 4 },
    gridGap: 0.4,
  },
];

export function getTheme(id: BoardThemeId): BoardTheme {
  return BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0];
}
