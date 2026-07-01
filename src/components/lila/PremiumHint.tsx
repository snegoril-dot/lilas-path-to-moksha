import { Lock } from "lucide-react";
import { getComingSoonLabel, type FeatureId } from "@/lib/entitlements";

interface Props {
  feature: FeatureId;
  /** Переопределить подпись, если нужно. */
  label?: string;
  className?: string;
}

/**
 * Мягкий плейсхолдер будущей премиум-функции.
 * Без агрессивных призывов к покупке — спокойная подпись «скоро».
 */
export function PremiumHint({ feature, label, className }: Props) {
  const text = label ?? getComingSoonLabel(feature);
  if (!text) return null;
  return (
    <div
      className={
        "flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] opacity-70 " +
        (className ?? "")
      }
      aria-label={text}
    >
      <Lock size={13} className="shrink-0 opacity-70" />
      <span className="truncate">{text}</span>
    </div>
  );
}
