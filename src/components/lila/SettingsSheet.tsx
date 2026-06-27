import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Palette, Volume2, VolumeX, NotebookPen, NotebookText, Ruler, BookOpen, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { BoardTheme } from "@/lib/board-themes";
import type { PlayerToken } from "@/lib/player-tokens";

interface Props {
  open: boolean;
  onClose: () => void;
  themeName: BoardTheme["name"];
  onCycleTheme: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  notesEnabled: boolean;
  onToggleNotes: () => void;
  token: PlayerToken;
  onCycleToken: () => void;
  debug: boolean;
  onToggleDebug: () => void;
}

function Row({
  icon, label, hint, onClick, active, asLink, to,
}: {
  icon: React.ReactNode; label: string; hint?: string;
  onClick?: () => void; active?: boolean;
  asLink?: boolean; to?: string;
}) {
  const cls = `w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition ${active ? "bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/30" : "bg-white/5 hover:bg-white/10"}`;
  const content = (
    <>
      <span className="h-9 w-9 grid place-items-center rounded-lg bg-white/10 shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium truncate">{label}</span>
        {hint && <span className="block text-[11px] opacity-60 truncate">{hint}</span>}
      </span>
    </>
  );
  if (asLink && to) {
    return (
      <Link to={to} className={cls} onClick={onClick}>{content}</Link>
    );
  }
  return <button type="button" onClick={onClick} className={cls}>{content}</button>;
}

export function SettingsSheet(props: Props) {
  const {
    open, onClose, themeName, onCycleTheme,
    soundEnabled, onToggleSound, notesEnabled, onToggleNotes,
    token, onCycleToken, debug, onToggleDebug,
  } = props;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="bottom"
        className="bg-[var(--lila-surface,#15131e)] text-white border-t border-white/10 rounded-t-3xl max-h-[85vh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="text-white">Меню игры</SheetTitle>
          <SheetDescription className="text-white/60">Настройки и навигация</SheetDescription>
        </SheetHeader>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Row icon={<Palette size={18} />} label="Тема доски" hint={themeName} onClick={onCycleTheme} />
          <Row
            icon={soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            label="Звук"
            hint={soundEnabled ? "Включён" : "Выключен"}
            onClick={onToggleSound}
            active={soundEnabled}
          />
          <Row
            icon={notesEnabled ? <NotebookText size={18} /> : <NotebookPen size={18} />}
            label="Заметки рефлексии"
            hint={notesEnabled ? "Включены" : "Выключены"}
            onClick={onToggleNotes}
            active={notesEnabled}
          />
          <Row
            icon={
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[13px]"
                style={{ background: token.bg, boxShadow: `0 0 0 1.5px ${token.ring}` }}
                aria-hidden
              >
                {token.glyph}
              </span>
            }
            label="Фигурка"
            hint={token.name}
            onClick={onCycleToken}
          />
          <Row
            icon={<Ruler size={18} />}
            label="Отладка сетки"
            hint={debug ? "Включена" : "Выключена"}
            onClick={onToggleDebug}
            active={debug}
          />
          <Row icon={<BookOpen size={18} />} label="Дневник" hint="История пути" asLink to="/journal" onClick={onClose} />
          <Row icon={<Sparkles size={18} />} label="Недельный план" hint="Рекомендации Гуру" asLink to="/insights" onClick={onClose} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
