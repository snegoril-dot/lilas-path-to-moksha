// Фигурки игрока в стилистике Лилы (таттвы и сакральные символы).
export interface PlayerToken {
  id: string;
  name: string;
  glyph: string;
  // Кольцо/подсветка фишки. Hex/rgb значения, чтобы не зависеть от Tailwind.
  ring: string;
  bg: string;
}

export const PLAYER_TOKENS: PlayerToken[] = [
  { id: "lotus",    name: "Лотос",      glyph: "🪷", ring: "#6ee7b7", bg: "rgba(52,211,153,0.30)" },
  { id: "om",       name: "ОМ",         glyph: "🕉", ring: "#fcd34d", bg: "rgba(251,191,36,0.30)" },
  { id: "chakra",   name: "Чакра",      glyph: "☸", ring: "#93c5fd", bg: "rgba(96,165,250,0.30)" },
  { id: "mandala",  name: "Мандала",    glyph: "❂", ring: "#f0abfc", bg: "rgba(232,121,249,0.28)" },
  { id: "trishula", name: "Тришула",    glyph: "🔱", ring: "#fda4af", bg: "rgba(244,114,182,0.28)" },
  { id: "conch",    name: "Шанкха",     glyph: "🐚", ring: "#fde68a", bg: "rgba(253,224,71,0.25)" },
  { id: "diya",     name: "Дия",        glyph: "🪔", ring: "#fdba74", bg: "rgba(251,146,60,0.30)" },
  { id: "star",     name: "Звезда",     glyph: "✨", ring: "#a5f3fc", bg: "rgba(103,232,249,0.28)" },
];

export const DEFAULT_TOKEN_ID = "lotus";

export function getToken(id: string | null | undefined): PlayerToken {
  return PLAYER_TOKENS.find((t) => t.id === id) ?? PLAYER_TOKENS[0];
}
