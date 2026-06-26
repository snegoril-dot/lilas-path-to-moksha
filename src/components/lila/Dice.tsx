import { motion, useAnimation } from "framer-motion";
import { useEffect, useRef } from "react";

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

// Rotations that bring each face to the front (camera looks down -Z)
const FACE_ROTATION: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: -90 },
  3: { x: -90, y: 0 },
  4: { x: 90, y: 0 },
  5: { x: 0, y: 90 },
  6: { x: 0, y: 180 },
};

const SIZE = 72; // px
const HALF = SIZE / 2;

function Face({
  value,
  transform,
}: {
  value: number;
  transform: string;
}) {
  return (
    <div
      className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-1 p-2 rounded-2xl bg-gradient-to-br from-white via-amber-50 to-stone-200 ring-1 ring-stone-300/80 shadow-inner"
      style={{
        transform,
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      }}
    >
      {Array.from({ length: 9 }).map((_, i) => {
        const r = Math.floor(i / 3);
        const c = i % 3;
        const has = PIPS[value]?.some(([pr, pc]) => pr === r && pc === c);
        return (
          <div
            key={i}
            className={`rounded-full ${
              has
                ? "bg-gradient-to-br from-stone-800 to-stone-950 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25)]"
                : "bg-transparent"
            }`}
          />
        );
      })}
    </div>
  );
}

export function Dice({ value, rolling }: { value: number; rolling: boolean }) {
  const controls = useAnimation();
  const spinRef = useRef(0);

  useEffect(() => {
    const target = FACE_ROTATION[value] ?? { x: 0, y: 0 };
    if (rolling) {
      spinRef.current += 1;
      // Vary spin axis a bit each throw so it feels alive
      const turnsX = 2 + (spinRef.current % 2);
      const turnsY = 3 + ((spinRef.current + 1) % 2);
      const endX = 360 * turnsX + target.x;
      const endY = 360 * turnsY + target.y;
      controls.start({
        // Overshoot then settle — physical landing
        rotateX: [0, endX * 0.55, endX + 14, endX - 6, endX],
        rotateY: [0, endY * 0.55, endY - 12, endY + 5, endY],
        y: [0, -28, -10, -2, 0],
        transition: {
          duration: 1.1,
          times: [0, 0.45, 0.75, 0.9, 1],
          ease: [0.16, 0.84, 0.3, 1],
        },
      });
    } else {
      controls.start({
        rotateX: target.x,
        rotateY: target.y,
        y: 0,
        transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
      });
    }
  }, [value, rolling, controls]);

  return (
    <div
      className="relative"
      style={{
        width: SIZE,
        height: SIZE,
        perspective: 600,
      }}
    >
      {/* Soft shadow under the cube */}
      <motion.div
        animate={{
          scale: rolling ? [1, 0.7, 1.05, 0.85, 1] : 1,
          opacity: rolling ? [0.45, 0.25, 0.5, 0.3, 0.45] : 0.45,
        }}
        transition={{ duration: 0.95, ease: "easeOut" }}
        className="absolute left-1/2 -translate-x-1/2 rounded-full bg-black/60 blur-md"
        style={{
          width: SIZE * 0.85,
          height: 8,
          bottom: -6,
        }}
      />
      <motion.div
        animate={controls}
        className="relative"
        style={{
          width: SIZE,
          height: SIZE,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        <Face value={1} transform={`translateZ(${HALF}px)`} />
        <Face value={6} transform={`rotateY(180deg) translateZ(${HALF}px)`} />
        <Face value={5} transform={`rotateY(-90deg) translateZ(${HALF}px)`} />
        <Face value={2} transform={`rotateY(90deg) translateZ(${HALF}px)`} />
        <Face value={3} transform={`rotateX(90deg) translateZ(${HALF}px)`} />
        <Face value={4} transform={`rotateX(-90deg) translateZ(${HALF}px)`} />
      </motion.div>
    </div>
  );
}
