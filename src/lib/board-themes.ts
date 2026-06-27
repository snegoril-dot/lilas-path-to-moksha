import boardCosmos from "@/assets/lila-board-cosmos.jpg";

export type BoardThemeId = "cosmic";

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
    id: "cosmic",
    name: "Лила",
    emoji: "🌌",
    bg: "radial-gradient(ellipse at top, #1a0b3d 0%, #09051f 60%, #000010 100%)",
    imageUrl: boardCosmos,
    imageOverlay: "linear-gradient(rgba(10,5,30,0.10), rgba(10,5,30,0.20))",
    labelClass: "text-fuchsia-50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]",
    numberClass: "text-amber-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]",
    frameRing: "ring-fuchsia-300/30",
    gridInset: { top: 4, right: 4, bottom: 4, left: 4 },
    gridGap: 0.4,
  },
];

export function getTheme(_id?: BoardThemeId): BoardTheme {
  return BOARD_THEMES[0];
}

