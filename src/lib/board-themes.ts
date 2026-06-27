import boardBg from "@/assets/lila-board-bg.jpg";

export type BoardThemeId = "classic" | "cosmic" | "aqua";

export interface BoardTheme {
  id: BoardThemeId;
  name: string;
  emoji: string;
  /** CSS background (gradient или url) для доски */
  bg: string;
  imageUrl: string;
  imageOverlay: string;
  labelClass: string;
  numberClass: string;
  frameRing: string;
  gridInset: { top: number; right: number; bottom: number; left: number };
  gridGap: number;
}

export const DEFAULT_INSET = { top: 4, right: 4, bottom: 4, left: 4 };

export const BOARD_IMAGE_URL = boardBg;

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: "classic",
    name: "Раджпут",
    emoji: "🕉",
    bg: "#2a1810",
    imageUrl: BOARD_IMAGE_URL,
    imageOverlay: "linear-gradient(rgba(42, 24, 16, 0.02), rgba(42, 24, 16, 0.04))",
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
    bg: "#09051f",
    imageUrl: BOARD_IMAGE_URL,
    imageOverlay: "linear-gradient(rgba(15, 10, 46, 0.12), rgba(0, 0, 16, 0.18))",
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
    bg: "#dff7ff",
    imageUrl: BOARD_IMAGE_URL,
    imageOverlay: "linear-gradient(rgba(224, 242, 254, 0.14), rgba(125, 211, 252, 0.18))",
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
