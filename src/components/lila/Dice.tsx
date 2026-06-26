import { motion } from "framer-motion";

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

export function Dice({ value, rolling }: { value: number; rolling: boolean }) {
  return (
    <motion.div
      animate={
        rolling
          ? { rotate: [0, 180, 360, 540, 720], scale: [1, 1.1, 0.95, 1.05, 1] }
          : { rotate: 0, scale: 1 }
      }
      transition={{ duration: rolling ? 0.9 : 0.2, ease: "easeOut" }}
      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white to-stone-200 shadow-lg ring-1 ring-stone-300 grid grid-cols-3 grid-rows-3 gap-1 p-2"
    >
      {Array.from({ length: 9 }).map((_, i) => {
        const r = Math.floor(i / 3);
        const c = i % 3;
        const has = PIPS[value]?.some(([pr, pc]) => pr === r && pc === c);
        return (
          <div
            key={i}
            className={`rounded-full ${has ? "bg-stone-900" : "bg-transparent"}`}
          />
        );
      })}
    </motion.div>
  );
}
