import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { LifeBuoy, MessageCircle, ChevronDown } from "lucide-react";
import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

// Реальный @username поддержки задаётся через `VITE_SUPPORT_TG_USERNAME` в .env.
// Плейсхолдер `lila_support` — замени на продовый до открытия беты.
const SUPPORT_USERNAME =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPPORT_TG_USERNAME ??
  "lila_support";
const SUPPORT_URL = `https://t.me/${SUPPORT_USERNAME}`;

const FAQ: { q: string; a: string }[] = [
  {
    q: "Как работают Telegram Stars?",
    a: "Stars — внутренняя валюта Telegram. Оплата проходит внутри мессенджера, чек приходит от Telegram. Мы не видим твоих платёжных данных, только факт успешной оплаты и её ID.",
  },
  {
    q: "Можно ли вернуть Stars?",
    a: "Да, в течение 21 дня после покупки, если функция не использовалась злоупотребительно. Напиши в поддержку с ID платежа (его видно в «Мои покупки») — вернём и отзовём доступ.",
  },
  {
    q: "Что вы храните обо мне?",
    a: "Только то, что нужно для игры: анонимный ID, текущая клетка, Санкальпа, твои заметки и купленные права. Заметки видны только тебе. Мы не передаём данные третьим лицам.",
  },
  {
    q: "Куда пропала покупка?",
    a: "Открой «Настройки → Мои покупки» и нажми «Восстановить». Если после этого доступа нет — напиши в поддержку с ID платежа.",
  },
  {
    q: "Можно удалить свои данные?",
    a: "Да. Напиши в поддержку — удалим профиль, заметки и историю в течение 7 дней.",
  },
  {
    q: "Приложение зависло / не грузится",
    a: "Закрой Mini App полностью и открой заново из чата с ботом. Если не помогло — обнови Telegram и напиши в поддержку с описанием шагов.",
  },
];

export function SupportFAQSheet({ open, onClose }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <LifeBuoy size={16} /> Поддержка
          </SheetTitle>
          <SheetDescription>
            Мы рядом. Ответим в течение 24 часов в будние дни.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 ring-1 ring-amber-400/30 px-4 py-3 text-amber-100"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <MessageCircle size={16} /> Написать в поддержку
            </span>
            <span className="text-xs opacity-70">@support_bot</span>
          </a>

          <div>
            <h3 className="text-xs uppercase tracking-wider opacity-60 mb-2 px-1">Частые вопросы</h3>
            <ul className="space-y-2">
              {FAQ.map((item, i) => {
                const isOpen = openIdx === i;
                return (
                  <li key={i} className="rounded-xl bg-white/5 ring-1 ring-white/10 overflow-hidden">
                    <button
                      onClick={() => setOpenIdx(isOpen ? null : i)}
                      className="w-full flex items-center justify-between gap-2 text-left px-3 py-2.5"
                      aria-expanded={isOpen}
                    >
                      <span className="text-sm">{item.q}</span>
                      <ChevronDown
                        size={16}
                        className={`opacity-60 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isOpen && (
                      <p className="px-3 pb-3 text-[13px] leading-relaxed opacity-80">{item.a}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="text-[11px] opacity-50 text-center px-4">
            Игра носит рефлексивный характер и не является медицинской, юридической или финансовой консультацией.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
