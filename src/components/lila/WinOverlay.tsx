import { motion, AnimatePresence } from "framer-motion";

export interface KeyCell {
  id: number;
  name: string;
  kind: "ladder" | "snake";
}

export function WinOverlay({
  open,
  onRestart,
  sankalpa,
  keyCells = [],
  totalRolls,
}: {
  open: boolean;
  onRestart: () => void;
  sankalpa?: string;
  keyCells?: KeyCell[];
  totalRolls?: number;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-start overflow-y-auto p-6 text-center bg-gradient-to-br from-amber-900 via-stone-900 to-indigo-950"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring" }}
            className="text-6xl mt-6 mb-2"
          >
            🕉
          </motion.div>
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent"
          >
            Мокша
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mt-3 max-w-sm text-amber-100/90 leading-relaxed"
          >
            Ты достиг Кайласа. Игра окончена — ибо тот, кто играл, растворился
            в Том, кто всегда был.
          </motion.p>

          {sankalpa && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-6 max-w-sm w-full rounded-2xl bg-white/5 ring-1 ring-amber-200/20 p-4 text-left"
            >
              <div className="text-[11px] uppercase tracking-wider text-amber-300/80">
                Твоя Санкальпа
              </div>
              <div className="mt-1 text-amber-50 italic">«{sankalpa}»</div>
              <div className="mt-3 text-sm text-amber-100/80 leading-relaxed">
                Ответ записан в самом пути. Перечитай ключевые состояния, через
                которые провела тебя карма — в них Гуру и говорит с тобой.
              </div>
            </motion.div>
          )}

          {keyCells.length > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.75 }}
              className="mt-4 max-w-sm w-full rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 text-left"
            >
              <div className="text-[11px] uppercase tracking-wider text-amber-300/80 mb-2">
                Путь души · ключевые узлы
              </div>
              <ol className="space-y-1.5 text-sm text-amber-50/90">
                {keyCells.map((c, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="opacity-60 w-6 shrink-0">{c.id}.</span>
                    <span className="shrink-0">
                      {c.kind === "ladder" ? "🪜" : "🐍"}
                    </span>
                    <span>{c.name}</span>
                  </li>
                ))}
              </ol>
              {typeof totalRolls === "number" && (
                <div className="mt-3 text-[11px] opacity-50">
                  Всего бросков: {totalRolls}
                </div>
              )}
            </motion.div>
          )}

          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
            onClick={onRestart}
            className="my-8 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 text-stone-900 font-semibold shadow-xl hover:brightness-110 active:scale-95 transition"
          >
            🪷 Играть снова
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
