import { motion, AnimatePresence } from "framer-motion";

export function WinOverlay({ open, onRestart }: { open: boolean; onRestart: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-amber-900 via-stone-900 to-indigo-950"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring" }}
            className="text-7xl mb-4"
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
            transition={{ delay: 0.5 }}
            className="mt-3 max-w-sm text-amber-100/90 leading-relaxed"
          >
            Ты достиг Кайласа. Игра окончена — ибо тот, кто играл, растворился
            в Том, кто всегда был.
          </motion.p>
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            onClick={onRestart}
            className="mt-8 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 text-stone-900 font-semibold shadow-xl hover:brightness-110 active:scale-95 transition"
          >
            🪷 Играть снова
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
