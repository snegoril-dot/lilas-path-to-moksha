import guru from "@/assets/icons/guru.png";
import dharmaWheel from "@/assets/icons/dharma-wheel.png";
import lotus from "@/assets/icons/lotus.png";
import diya from "@/assets/icons/diya.png";
import ladder from "@/assets/icons/ladder.png";
import snake from "@/assets/icons/snake.png";
import feather from "@/assets/icons/feather.png";
import egg from "@/assets/icons/egg.png";
import trident from "@/assets/icons/trident.png";
import shield from "@/assets/icons/shield.png";
import flame from "@/assets/icons/flame.png";
import sparkle from "@/assets/icons/sparkle.png";
import warning from "@/assets/icons/warning.png";
import sunMark from "@/assets/icons/sun-mark.png";
import triangle from "@/assets/icons/triangle.png";

export type GlyphName =
  | "om"
  | "dharma"
  | "lotus"
  | "diya"
  | "ladder"
  | "snake"
  | "feather"
  | "egg"
  | "trident"
  | "shield"
  | "flame"
  | "sparkle"
  | "warning"
  | "sun"
  | "triangle";

const MAP: Record<GlyphName, string> = {
  om: guru,
  dharma: dharmaWheel,
  lotus,
  diya,
  ladder,
  snake,
  feather,
  egg,
  trident,
  shield,
  flame,
  sparkle,
  warning,
  sun: sunMark,
  triangle,
};

const LABELS: Record<GlyphName, string> = {
  om: "Ом",
  dharma: "Дхармачакра",
  lotus: "Лотос",
  diya: "Дия",
  ladder: "Стрела",
  snake: "Змея",
  feather: "Перо",
  egg: "Космическое яйцо",
  trident: "Тришула",
  shield: "Щит",
  flame: "Пламя",
  sparkle: "Свет",
  warning: "Внимание",
  sun: "Солнце",
  triangle: "Янтра",
};

/** Map legacy emoji strings to Glyph names so we can migrate incrementally. */
export function emojiToGlyph(emoji: string): GlyphName | null {
  const s = emoji.trim();
  if (s.startsWith("🕉") || s === "ॐ") return "om";
  if (s.startsWith("☸")) return "dharma";
  if (s.startsWith("🪷")) return "lotus";
  if (s.startsWith("🪔")) return "diya";
  if (s.startsWith("🪜")) return "ladder";
  if (s.startsWith("🐍")) return "snake";
  if (s.startsWith("🪶")) return "feather";
  if (s.startsWith("🥚")) return "egg";
  if (s.startsWith("🔱")) return "trident";
  if (s.startsWith("🛡")) return "shield";
  if (s.startsWith("🔥")) return "flame";
  if (s.startsWith("✨") || s.startsWith("✦") || s.startsWith("❂")) return "sparkle";
  if (s.startsWith("⚠")) return "warning";
  if (s.startsWith("🔺")) return "triangle";
  return null;
}

interface GlyphProps {
  name: GlyphName;
  size?: number;
  className?: string;
  alt?: string;
}

export function Glyph({ name, size = 24, className, alt }: GlyphProps) {
  return (
    <img
      src={MAP[name]}
      alt={alt ?? LABELS[name]}
      width={size}
      height={size}
      loading="lazy"
      draggable={false}
      className={`inline-block select-none object-contain ${className ?? ""}`}
      style={{ width: size, height: size }}
    />
  );
}
