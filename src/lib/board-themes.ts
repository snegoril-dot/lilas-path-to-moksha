import boardBg from "@/assets/lila-board-bg.jpg";

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

const BOARD_IMAGE_BG = `url("${boardBg}")`;
const CLASSIC_BG = `#2a1810 ${BOARD_IMAGE_BG} center center / 100% 100% no-repeat`;
const COSMIC_BG =
  `linear-gradient(rgba(15, 10, 46, 0.08), rgba(0, 0, 16, 0.12)), ${BOARD_IMAGE_BG} center center / 100% 100% no-repeat`;
const AQUA_BG =
  `linear-gradient(rgba(224, 242, 254, 0.1), rgba(125, 211, 252, 0.12)), ${BOARD_IMAGE_BG} center center / 100% 100% no-repeat`;

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
