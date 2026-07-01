import { useEffect, useState } from "react";

/**
 * Возвращает высоту экранной клавиатуры (в px) через VisualViewport API.
 * Используй как `paddingBottom` у sticky-панелей внутри модалок,
 * чтобы кнопки не скрывались клавиатурой в Telegram/iOS Safari.
 */
export function useKeyboardInset(active: boolean = true): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // Разница между layout viewport и visual viewport ≈ высота клавиатуры.
      const diff = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setInset(diff > 80 ? diff : 0);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [active]);

  return inset;
}
