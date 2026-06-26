// Фигурки игрока в стилистике Лилы (таттвы и сакральные символы).
export interface TokenMotion {
  // Плавное "дыхание" фишки в покое + характер при перемещении.
  idle: { rotate?: number[]; scale?: number[]; y?: number[]; duration: number };
  // Параметры spring-перелёта между клетками (Framer Motion).
  travel: { stiffness: number; damping: number; mass?: number };
}

export interface PlayerToken {
  id: string;
  name: string;
  glyph: string;
  // Кольцо/подсветка фишки. Hex/rgb значения, чтобы не зависеть от Tailwind.
  ring: string;
  bg: string;
  motion: TokenMotion;
}

// Базовые пресеты движения, подобранные под форму глифа.
const SPIN: TokenMotion = {
  idle: { rotate: [0, 360], duration: 8 },
  travel: { stiffness: 200, damping: 22 },
};
const FLOAT: TokenMotion = {
  idle: { y: [0, -2, 0], scale: [1, 1.04, 1], duration: 3.2 },
  travel: { stiffness: 240, damping: 26 },
};
const PULSE: TokenMotion = {
  idle: { scale: [1, 1.08, 1], duration: 2.4 },
  travel: { stiffness: 260, damping: 24 },
};
const SWAY: TokenMotion = {
  idle: { rotate: [-6, 6, -6], duration: 3.6 },
  travel: { stiffness: 220, damping: 20 },
};
const FLICKER: TokenMotion = {
  idle: { scale: [1, 1.1, 0.96, 1], duration: 1.8 },
  travel: { stiffness: 280, damping: 22 },
};

export const PLAYER_TOKENS: PlayerToken[] = [
  { id: "lotus",    name: "Лотос",   glyph: "🪷", ring: "#6ee7b7", bg: "rgba(52,211,153,0.30)",  motion: FLOAT },
  { id: "om",       name: "ОМ",      glyph: "🕉", ring: "#fcd34d", bg: "rgba(251,191,36,0.30)",  motion: PULSE },
  { id: "chakra",   name: "Чакра",   glyph: "☸", ring: "#93c5fd", bg: "rgba(96,165,250,0.30)",  motion: SPIN },
  { id: "mandala",  name: "Мандала", glyph: "❂", ring: "#f0abfc", bg: "rgba(232,121,249,0.28)", motion: { ...SPIN, idle: { rotate: [0, -360], duration: 12 } } },
  { id: "trishula", name: "Тришула", glyph: "🔱", ring: "#fda4af", bg: "rgba(244,114,182,0.28)", motion: SWAY },
  { id: "conch",    name: "Шанкха",  glyph: "🐚", ring: "#fde68a", bg: "rgba(253,224,71,0.25)",  motion: SWAY },
  { id: "diya",     name: "Дия",     glyph: "🪔", ring: "#fdba74", bg: "rgba(251,146,60,0.30)",  motion: FLICKER },
  { id: "star",     name: "Звезда",  glyph: "✨", ring: "#a5f3fc", bg: "rgba(103,232,249,0.28)", motion: FLICKER },
];

export const DEFAULT_TOKEN_ID = "lotus";

export function getToken(id: string | null | undefined): PlayerToken {
  return PLAYER_TOKENS.find((t) => t.id === id) ?? PLAYER_TOKENS[0];
}
