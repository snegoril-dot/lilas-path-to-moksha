import classicBg from "@/assets/lila-board-bg.jpg";
import cosmicBg from "@/assets/lila-board-cosmic.jpg";
import aquaBg from "@/assets/lila-board-aqua.jpg";

export type BoardThemeId = "classic" | "cosmic" | "aqua";

export interface BoardTheme {
  id: BoardThemeId;
  name: string;
  emoji: string;
  bg: string;
  /** tailwind class for cell label text */
  labelClass: string;
  /** tailwind class for cell number */
  numberClass: string;
  /** tailwind ring class for the board frame */
  frameRing: string;
  /** inset (% of board) where the painted 8x9 grid actually lives — top, right, bottom, left */
  gridInset: { top: number; right: number; bottom: number; left: number };
  /** gap between cells as % of board width */
  gridGap: number;
}

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: "classic",
    name: "Раджпут",
    emoji: "🕉",
    bg: classicBg,
    labelClass: "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]",
    numberClass: "text-amber-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]",
    frameRing: "ring-amber-200/30",
  },
  {
    id: "cosmic",
    name: "Космос",
    emoji: "🌌",
    bg: cosmicBg,
    labelClass: "text-fuchsia-50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]",
    numberClass: "text-amber-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]",
    frameRing: "ring-fuchsia-300/30",
  },
  {
    id: "aqua",
    name: "Акварель",
    emoji: "🪷",
    bg: aquaBg,
    labelClass: "text-sky-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]",
    numberClass: "text-amber-700 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]",
    frameRing: "ring-sky-300/40",
  },
];

export function getTheme(id: BoardThemeId): BoardTheme {
  return BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0];
}
