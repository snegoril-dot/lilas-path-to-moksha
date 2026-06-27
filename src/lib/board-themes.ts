export type BoardThemeId = "classic" | "cosmic" | "aqua";

export interface BoardTheme {
  id: BoardThemeId;
  name: string;
  emoji: string;
  bg: string;
  imageUrl: string | null;
  imageOverlay: string;
  labelClass: string;
  numberClass: string;
  frameRing: string;
  gridInset: { top: number; right: number; bottom: number; left: number };
  gridGap: number;
}

export const DEFAULT_INSET = { top: 4, right: 4, bottom: 4, left: 4 };

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: "classic",
    name: "Раджпут",
    emoji: "🕉",
    bg: "linear-gradient(135deg, #2a1810 0%, #4a2818 50%, #2a1810 100%)",
    imageUrl: null,
    imageOverlay: "transparent",
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
    bg: "radial-gradient(ellipse at top, #1a0b3d 0%, #09051f 60%, #000010 100%)",
    imageUrl: null,
    imageOverlay: "transparent",
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
    bg: "linear-gradient(135deg, #dff7ff 0%, #b6e6f8 50%, #7dd3fc 100%)",
    imageUrl: null,
    imageOverlay: "transparent",
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
