import { useEffect, useRef } from "react";

/**
 * Минимальная dialog-доступность: Esc закрывает, фокус уходит на initialRef,
 * после закрытия возвращается на предыдущий активный элемент.
 * (Используется в наших custom-modal — для замены полноценного Radix Dialog не требуется.)
 */
export function useDialogA11y(open: boolean, onClose: () => void) {
  const initialRef = useRef<HTMLButtonElement | null>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    prevFocusRef.current = (typeof document !== "undefined" ? document.activeElement : null) as HTMLElement | null;
    // фокус на крестик/первую кнопку
    const id = requestAnimationFrame(() => initialRef.current?.focus());

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("keydown", onKey);
      prevFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  return { initialRef };
}
