import { motion, useReducedMotion } from "framer-motion";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BOARD } from "@/lib/lila-board";
import boardBgAsset from "@/assets/lila-board-cosmos.png.asset.json";
const boardBg = boardBgAsset.url;
import { getPublishedBoardLayout, savePublishedBoardLayout } from "@/lib/board-layout.functions";
import { getTattvaForCell } from "@/lib/lila-wisdom-full";
import {
  COLS,
  ROWS,
  idForRowCol,
  rowColForId,
  verifyBoardMapping,
} from "@/lib/board-layout";
import { safeGet, safeKeys, safeRemove, safeSet } from "@/lib/safe-storage";

import type { PlayerToken } from "@/lib/player-tokens";

interface Props {
  playerPos: number;
  onSelectCell?: (id: number) => void;
  debug?: boolean;
  token?: PlayerToken;
  /** ids the player has already touched — rendered as subtle path trail. */
  visited?: Set<number> | number[];
}

const BOARD_BG =
  "linear-gradient(180deg, var(--lila-board-bg, rgba(15,23,42,0.65)), rgba(15,23,42,0.35))";
const FRAME_RING = "ring-white/10";
const NUMBER_CLASS =
  "text-amber-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]";
const BOARD_LAYOUT_KEY = "lila:debug:board";
const CELL_OFFSETS_KEY = "lila:debug:cell-offsets";
const CELL_SIZES_KEY = "lila:debug:cell-sizes";
const CELL_RECTS_KEY = "lila:debug:cell-layout-v2";
const PUBLISHED_LAYOUT_CACHE_KEY = "lila:board:published-layout-cache-v2";
const DEFAULT_GAP_PCT = 0;
const DEFAULT_PAD_PCT = 0;
const IMAGE_ASPECT_W = 1330;
const IMAGE_ASPECT_H = 1182;

type CellOffsetPct = { xPct: number; yPct: number; _legacyPx?: boolean };
type CellSizePct = { wPct: number; hPct: number; _legacyPx?: boolean };
type CellRectPct = { xPct: number; yPct: number; wPct: number; hPct: number };

function normalizeCellRects(input: unknown, fallback: Record<number, CellRectPct>): Record<number, CellRectPct> {
  const next: Record<number, CellRectPct> = { ...fallback };
  if (!input || typeof input !== "object") return next;
  Object.entries(input as Record<string, any>).forEach(([key, value]) => {
    const id = Number(key);
    if (!Number.isFinite(id) || id < 1 || id > 72) return;
    if (
      typeof value?.xPct === "number" &&
      typeof value?.yPct === "number" &&
      typeof value?.wPct === "number" &&
      typeof value?.hPct === "number"
    ) {
      next[id] = {
        xPct: value.xPct,
        yPct: value.yPct,
        wPct: value.wPct,
        hPct: value.hPct,
      };
    }
  });
  return next;
}

function parsePublishedLayoutCache(): {
  version: number;
  aspectW: number;
  aspectH: number;
  gapPct: number;
  padPct: number;
  sizePct?: number;
  cellRects: Record<string, CellRectPct>;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = safeGet(PUBLISHED_LAYOUT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.aspectW !== "number" ||
      typeof parsed?.aspectH !== "number" ||
      typeof parsed?.gapPct !== "number" ||
      typeof parsed?.padPct !== "number" ||
      !parsed?.cellRects ||
      typeof parsed.cellRects !== "object"
    ) return null;
    return parsed;
  } catch {
    return null;
  }
}

// Единовременная миграция: убираем самые старые сохранённые layout'ы (v1..v7),
// чтобы они не конфликтовали с актуальной процентной разметкой клеток.
function purgeLegacyLayoutStorage() {
  if (typeof window === "undefined") return;
  safeRemove("lila.boardTheme");
  safeKeys("lila.layout.").forEach((key) => safeRemove(key));
  safeRemove("lila:debug-zoom");
  safeRemove("lila:debug-pan");
}

function baseCellRectPct(id: number, padPct: number, gapPct: number): CellRectPct {
  const { row, col } = rowColForId(id);
  const visualRow = ROWS - 1 - row;
  const safePad = Number.isFinite(padPct) ? padPct : DEFAULT_PAD_PCT;
  const safeGap = Number.isFinite(gapPct) ? gapPct : DEFAULT_GAP_PCT;
  const cellW = (100 - safePad * 2 - safeGap * (COLS - 1)) / COLS;
  const cellH = (100 - safePad * 2 - safeGap * (ROWS - 1)) / ROWS;
  return {
    xPct: safePad + col * (cellW + safeGap),
    yPct: safePad + visualRow * (cellH + safeGap),
    wPct: cellW,
    hPct: cellH,
  };
}

function createBaseCellRects(padPct: number, gapPct: number): Record<number, CellRectPct> {
  const base: Record<number, CellRectPct> = {};
  for (let id = 1; id <= 72; id += 1) base[id] = baseCellRectPct(id, padPct, gapPct);
  return base;
}

function mergeLegacyLayoutIntoRects(
  offsets: Record<string, any> = {},
  sizes: Record<string, any> = {},
  padPct: number,
  gapPct: number,
): Record<number, CellRectPct> {
  const base = createBaseCellRects(padPct, gapPct);
  Object.keys({ ...offsets, ...sizes }).forEach((key) => {
    const id = Number(key);
    if (!Number.isFinite(id) || id < 1 || id > 72) return;
    const off = offsets[key] ?? {};
    const size = sizes[key] ?? {};
    const cur = base[id];
    base[id] = {
      xPct: cur.xPct + (typeof off.xPct === "number" ? off.xPct : 0),
      yPct: cur.yPct + (typeof off.yPct === "number" ? off.yPct : 0),
      wPct: cur.wPct + (typeof size.wPct === "number" ? size.wPct : 0),
      hPct: cur.hPct + (typeof size.hPct === "number" ? size.hPct : 0),
    };
  });
  return base;
}

function rebaseCellRects(
  rects: Record<number, CellRectPct>,
  fromPad: number,
  fromGap: number,
  toPad: number,
  toGap: number,
): Record<number, CellRectPct> {
  const next: Record<number, CellRectPct> = {};
  for (let id = 1; id <= 72; id += 1) {
    const current = rects[id] ?? baseCellRectPct(id, fromPad, fromGap);
    const oldBase = baseCellRectPct(id, fromPad, fromGap);
    const newBase = baseCellRectPct(id, toPad, toGap);
    next[id] = {
      xPct: newBase.xPct + (current.xPct - oldBase.xPct),
      yPct: newBase.yPct + (current.yPct - oldBase.yPct),
      wPct: newBase.wPct + (current.wPct - oldBase.wPct),
      hPct: newBase.hPct + (current.hPct - oldBase.hPct),
    };
  }
  return next;
}

function hasCustomizedRects(rects: Record<number, CellRectPct>, padPct: number, gapPct: number): boolean {
  for (let id = 1; id <= 72; id += 1) {
    const rect = rects[id];
    if (!rect) continue;
    const base = baseCellRectPct(id, padPct, gapPct);
    if (
      Math.abs(rect.xPct - base.xPct) > 0.001 ||
      Math.abs(rect.yPct - base.yPct) > 0.001 ||
      Math.abs(rect.wPct - base.wPct) > 0.001 ||
      Math.abs(rect.hPct - base.hPct) > 0.001
    ) return true;
  }
  return false;
}

const MAPPING_ISSUES: string[] = verifyBoardMapping();
if (MAPPING_ISSUES.length > 0) {
  // eslint-disable-next-line no-console
  console.error("[Lila board] mapping mismatch:", MAPPING_ISSUES);
}

const PLANE_TINTS = [
  "bg-stone-900/35",
  "bg-orange-900/30",
  "bg-amber-800/25",
  "bg-emerald-900/30",
  "bg-sky-900/30",
  "bg-indigo-900/30",
  "bg-violet-900/30",
  "bg-fuchsia-900/25",
  "bg-amber-700/30",
];

function BoardImpl({ playerPos, onSelectCell, debug, token, visited }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const loadPublishedLayout = useServerFn(getPublishedBoardLayout);
  const publishLayout = useServerFn(savePublishedBoardLayout);
  const [layoutSyncState, setLayoutSyncState] = useState<"idle" | "loading" | "published" | "saving" | "saved" | "error">("idle");
  const [zoom, setZoom] = useState(1);
  // Параметры разметки применяются и в обычном режиме: иначе выровненная
  // на ПК карта снова «разъезжается» на телефоне.
  const publishedCache = parsePublishedLayoutCache();
  const debugInit = (() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = safeGet(BOARD_LAYOUT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();
  // Aspect ratio жёстко привязан к натуральному размеру фонового PNG,
  // чтобы координаты клеток в % совпадали на ПК и мобильном. Старые
  // сохранённые значения (например, из слайдеров 4..16) игнорируются.
  const savedAspectW = typeof publishedCache?.aspectW === "number"
    ? publishedCache.aspectW
    : typeof debugInit?.aspectW === "number" && debugInit.aspectW > 100 ? debugInit.aspectW : IMAGE_ASPECT_W;
  const savedAspectH = typeof publishedCache?.aspectH === "number"
    ? publishedCache.aspectH
    : typeof debugInit?.aspectH === "number" && debugInit.aspectH > 100 ? debugInit.aspectH : IMAGE_ASPECT_H;
  const [aspectW, setAspectW] = useState<number>(savedAspectW);
  const [aspectH, setAspectH] = useState<number>(savedAspectH);
  const [gapPct, setGapPct] = useState<number>(publishedCache?.gapPct ?? debugInit?.gapPct ?? DEFAULT_GAP_PCT);
  const [padPct, setPadPct] = useState<number>(publishedCache?.padPct ?? debugInit?.padPct ?? DEFAULT_PAD_PCT);
  const [offset, setOffset] = useState<{ x: number; y: number }>(debugInit?.offset ?? { x: 0, y: 0 });
  const [sizePct, setSizePct] = useState<number>(publishedCache?.sizePct ?? debugInit?.sizePct ?? 100);
  const [dragging, setDragging] = useState(false);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [nudgeStep, setNudgeStep] = useState<number>(0.2);

  const [cellOffsets, setCellOffsets] = useState<Record<number, CellOffsetPct>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = safeGet(CELL_OFFSETS_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      const out: Record<number, CellOffsetPct> = {};
      Object.entries(parsed).forEach(([k, v]: [string, any]) => {
        if (typeof v?.xPct === "number") out[+k] = { xPct: v.xPct, yPct: v.yPct ?? 0 };
        else if (typeof v?.x === "number") out[+k] = { xPct: v.x, yPct: v.y ?? 0, _legacyPx: true };
      });
      return out;
    } catch { return {}; }
  });
  const [cellSizes, setCellSizes] = useState<Record<number, CellSizePct>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = safeGet(CELL_SIZES_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      const out: Record<number, CellSizePct> = {};
      Object.entries(parsed).forEach(([k, v]: [string, any]) => {
        if (typeof v?.wPct === "number") out[+k] = { wPct: v.wPct, hPct: v.hPct ?? 0 };
        else if (typeof v?.w === "number") out[+k] = { wPct: v.w, hPct: v.h ?? 0, _legacyPx: true };
      });
      return out;
    } catch { return {}; }
  });
  const [cellRects, setCellRects] = useState<Record<number, CellRectPct>>(() => {
    const initPad = publishedCache?.padPct ?? debugInit?.padPct ?? DEFAULT_PAD_PCT;
    const initGap = publishedCache?.gapPct ?? debugInit?.gapPct ?? DEFAULT_GAP_PCT;
    const base = createBaseCellRects(initPad, initGap);
    if (publishedCache?.cellRects) {
      return normalizeCellRects(publishedCache.cellRects, base);
    }
    if (typeof window === "undefined") return base;
    try {
      const rawRects = safeGet(CELL_RECTS_KEY);
      if (rawRects) {
        const parsed = JSON.parse(rawRects);
        return normalizeCellRects(parsed, base);
      }

      // Миграция старого формата: CSS-grid база + смещение/растяжка в процентах.
      const rawOffsets = safeGet(CELL_OFFSETS_KEY);
      const rawSizes = safeGet(CELL_SIZES_KEY);
      return mergeLegacyLayoutIntoRects(
        rawOffsets ? JSON.parse(rawOffsets) : {},
        rawSizes ? JSON.parse(rawSizes) : {},
        initPad,
        initGap,
      );
    } catch { return base; }
  });
  const hadSavedRectsRef = useRef(
    typeof window !== "undefined" ? !!safeGet(CELL_RECTS_KEY) : false,
  );
  const hasPublishedCacheRef = useRef(!!publishedCache?.cellRects);
  const publishedLayoutLoadedRef = useRef(false);

  // Живой размер доски — нужен, чтобы конвертировать px-жесты в проценты
  // и рендерить сохранённые проценты обратно в px.
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [boardSize, setBoardSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  useEffect(() => {
    const el = boardRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const update = () => {
      // offsetWidth/Height не включают CSS transform(scale), поэтому проценты
      // не «плывут» при debug-зуме и одинаково переносятся на телефон.
      setBoardSize({ w: el.offsetWidth, h: el.offsetHeight });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Однократная миграция legacy px → %, как только известен размер доски.
  useEffect(() => {
    if (!boardSize.w || !boardSize.h) return;
    setCellOffsets((prev) => {
      let changed = false;
      const next: Record<number, CellOffsetPct> = {};
      Object.entries(prev).forEach(([k, v]: [string, any]) => {
        if (v?._legacyPx) {
          changed = true;
          next[+k] = { xPct: (v.xPct / boardSize.w) * 100, yPct: (v.yPct / boardSize.h) * 100 };
        } else next[+k] = v;
      });
      return changed ? next : prev;
    });
    setCellSizes((prev) => {
      let changed = false;
      const next: Record<number, CellSizePct> = {};
      Object.entries(prev).forEach(([k, v]: [string, any]) => {
        if (v?._legacyPx) {
          changed = true;
          next[+k] = { wPct: (v.wPct / boardSize.w) * 100, hPct: (v.hPct / boardSize.h) * 100 };
        } else next[+k] = v;
      });
      return changed ? next : prev;
    });
    // one-shot
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardSize.w > 0 && boardSize.h > 0]);

  // Если на устройстве ещё лежал старый формат разметки, после миграции px→%
  // переносим его в новый абсолютный формат rects. Это позволяет старой ПК-
  // разметке стать одинаковой на мобильном без повторной ручной настройки.
  useEffect(() => {
    if (hadSavedRectsRef.current) return;
    if (!Object.keys(cellOffsets).length && !Object.keys(cellSizes).length) return;
    const hasLegacyPx = [...Object.values(cellOffsets), ...Object.values(cellSizes)].some((v) => v?._legacyPx);
    if (hasLegacyPx) return;
    setCellRects(
      mergeLegacyLayoutIntoRects(
        cellOffsets as Record<string, any>,
        cellSizes as Record<string, any>,
        padPct,
        gapPct,
      ),
    );
    hadSavedRectsRef.current = true;
  }, [cellOffsets, cellSizes, gapPct, padPct]);

  // ref для подавления клика по клетке сразу после её перетаскивания
  const suppressClickRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { safeSet(CELL_OFFSETS_KEY, JSON.stringify(cellOffsets)); } catch {}
  }, [cellOffsets]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { safeSet(CELL_SIZES_KEY, JSON.stringify(cellSizes)); } catch {}
  }, [cellSizes]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!debug && !hasPublishedCacheRef.current && !publishedLayoutLoadedRef.current) return;
    try { safeSet(CELL_RECTS_KEY, JSON.stringify(cellRects)); } catch {}
  }, [cellRects, debug]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      safeSet(
        BOARD_LAYOUT_KEY,
        JSON.stringify({ aspectW, aspectH, gapPct, padPct, offset, sizePct }),
      );
    } catch {}
  }, [aspectW, aspectH, gapPct, padPct, offset, sizePct]);

  useEffect(() => {
    if (publishedLayoutLoadedRef.current) return;
    publishedLayoutLoadedRef.current = true;
    let cancelled = false;
    setLayoutSyncState("loading");
    loadPublishedLayout()
      .then((layout) => {
        if (cancelled) return;
        if (!layout) {
          setLayoutSyncState("idle");
          return;
        }
        // Published layout is the single source of truth across devices.
        // Do not let stale per-device localStorage on Telegram override it,
        // especially in debug mode where old phone drafts caused cells to
        // jump back to the pre-manual placement.
        const nextPad = typeof layout.padPct === "number" ? layout.padPct : DEFAULT_PAD_PCT;
        const nextGap = typeof layout.gapPct === "number" ? layout.gapPct : DEFAULT_GAP_PCT;
        setAspectW(layout.aspectW);
        setAspectH(layout.aspectH);
        setGapPct(nextGap);
        setPadPct(nextPad);
        if (typeof layout.sizePct === "number") setSizePct(layout.sizePct);
        setCellRects(normalizeCellRects(layout.cellRects, createBaseCellRects(nextPad, nextGap)));
        hasPublishedCacheRef.current = true;
        try { safeSet(PUBLISHED_LAYOUT_CACHE_KEY, JSON.stringify(layout)); } catch {}
        setLayoutSyncState("published");
      })
      .catch(() => {
        if (!cancelled) setLayoutSyncState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [loadPublishedLayout]);

  const currentLayoutPayload = () => ({
    version: 2,
    aspectW,
    aspectH,
    gapPct,
    padPct,
    sizePct,
    cellRects,
  });


  function onCellResizeStart(e: React.PointerEvent, id: number) {
    if (!debug) return;
    e.stopPropagation();
    e.preventDefault();
    const cur = cellRects[id] ?? baseCellRectPct(id, padPct, gapPct);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    (e.currentTarget as any)._resize = { id, startX: e.clientX, startY: e.clientY, wPct: cur.wPct, hPct: cur.hPct };
  }
  function onCellResizeMove(e: React.PointerEvent) {
    const r = (e.currentTarget as any)._resize;
    if (!r) return;
    const bw = boardSize.w || 1;
    const bh = boardSize.h || 1;
    const dxPct = ((e.clientX - r.startX) / (bw * zoom)) * 100;
    const dyPct = ((e.clientY - r.startY) / (bh * zoom)) * 100;
    setCellRects((prev) => {
      const cur = prev[r.id] ?? baseCellRectPct(r.id, padPct, gapPct);
      return {
        ...prev,
        [r.id]: {
          ...cur,
          wPct: Math.max(1, r.wPct + dxPct),
          hPct: Math.max(1, r.hPct + dyPct),
        },
      };
    });
  }
  function onCellResizeEnd(e: React.PointerEvent) {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    delete (e.currentTarget as any)._resize;
  }

  function onDragStart(e: React.PointerEvent) {
    if (!debug) return;
    const cellEl = (e.target as HTMLElement).closest("[data-cell-id]") as HTMLElement | null;
    if (cellEl) {
      e.stopPropagation();
      e.preventDefault();
      const id = Number(cellEl.dataset.cellId);
      const cur = cellRects[id] ?? baseCellRectPct(id, padPct, gapPct);
      cellEl.setPointerCapture(e.pointerId);
      (cellEl as any)._cellDrag = { id, startX: e.clientX, startY: e.clientY, xPct: cur.xPct, yPct: cur.yPct, moved: false };
      return;
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    (e.currentTarget as any)._drag = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onDragMove(e: React.PointerEvent) {
    if (!debug) return;
    const cellEl = (e.target as HTMLElement).closest("[data-cell-id]") as HTMLElement | null;
    const cd = cellEl && (cellEl as any)._cellDrag;
    if (cd) {
      const bw = boardSize.w || 1;
      const bh = boardSize.h || 1;
      const nxPct = cd.xPct + ((e.clientX - cd.startX) / (bw * zoom)) * 100;
      const nyPct = cd.yPct + ((e.clientY - cd.startY) / (bh * zoom)) * 100;
      if (Math.abs(nxPct - cd.xPct) + Math.abs(nyPct - cd.yPct) > 0.5) cd.moved = true;
      setCellRects((prev) => {
        const cur = prev[cd.id] ?? baseCellRectPct(cd.id, padPct, gapPct);
        return { ...prev, [cd.id]: { ...cur, xPct: nxPct, yPct: nyPct } };
      });
      return;
    }
    if (!dragging) return;
    const d = (e.currentTarget as any)._drag;
    if (!d) return;
    setOffset({ x: d.ox + (e.clientX - d.startX), y: d.oy + (e.clientY - d.startY) });
  }
  function onDragEnd(e: React.PointerEvent) {
    const cellEl = (e.target as HTMLElement).closest("[data-cell-id]") as HTMLElement | null;
    const cd = cellEl && (cellEl as any)._cellDrag;
    if (cd) {
      try { cellEl!.releasePointerCapture(e.pointerId); } catch {}
      if (cd.moved) {
        e.stopPropagation();
        e.preventDefault();
        // подавляем ближайший click по этой клетке, чтобы модалка не открывалась
        suppressClickRef.current = cd.id;
        window.setTimeout(() => {
          if (suppressClickRef.current === cd.id) suppressClickRef.current = null;
        }, 300);
      }
      delete (cellEl as any)._cellDrag;
      return;
    }
    setDragging(false);
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  }

  /** Shift+двойной клик по клетке в debug — выровнять весь её ряд по этой клетке. */
  function alignRowTo(id: number) {
    const { row } = rowColForId(id);
    const rect = cellRects[id] ?? baseCellRectPct(id, padPct, gapPct);
    const rowIds: number[] = [];
    for (let c = 0; c < COLS; c++) rowIds.push(idForRowCol(row, c));
    setCellRects((prev) => {
      const next = { ...prev };
      rowIds.forEach((cid) => {
        const base = baseCellRectPct(cid, padPct, gapPct);
        next[cid] = { xPct: base.xPct, yPct: rect.yPct, wPct: rect.wPct, hPct: rect.hPct };
      });
      return next;
    });
  }


  useEffect(() => {
    purgeLegacyLayoutStorage();
  }, []);

  const visitedSet = useMemo(() => {
    if (!visited) return new Set<number>();
    return visited instanceof Set ? visited : new Set(visited);
  }, [visited]);

  const ids = useMemo(() => Array.from({ length: 72 }, (_, i) => i + 1), []);
  const jumpCells = useMemo(
    () => BOARD.filter((c) => c.jumpTo !== undefined),
    []
  );

  /** Центр клетки в координатах SVG-оверлея 100×100 с учётом ручной разметки. */
  const cellCenterPct = (id: number): { x: number; y: number } => {
    const rect = cellRects[id] ?? baseCellRectPct(id, padPct, gapPct);
    return { x: rect.xPct + rect.wPct / 2, y: rect.yPct + rect.hPct / 2 };
  };

  return (
    <div className="relative">
      {MAPPING_ISSUES.length > 0 && (
        <div
          role="alert"
          className="mb-2 rounded-lg bg-rose-600/90 text-rose-50 px-3 py-2 text-xs font-medium ring-1 ring-rose-300/60"
        >
          ⚠️ Сбой маппинга клеток (1→72): {MAPPING_ISSUES[0]}
        </div>
      )}

      <div className={debug ? "overflow-auto max-h-[80dvh] rounded-2xl" : (zoom > 1 ? "overflow-auto max-h-[80dvh] rounded-2xl" : "")}>
        <div
          ref={boardRef}
          data-lila-board
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
            className={`relative w-full rounded-2xl shadow-2xl ring-1 overflow-hidden ${FRAME_RING} ${debug ? (dragging ? "cursor-grabbing" : "cursor-grab") : ""}`}
          style={{
            width: debug ? `${sizePct}%` : undefined,
              aspectRatio: `${aspectW} / ${aspectH}`,
            background: BOARD_BG,
            transform: debug ? `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` : undefined,
            transformOrigin: "top left",
            transition: debug && !dragging ? "transform 120ms ease-out" : undefined,
            touchAction: debug ? "none" : undefined,
          }}
        >
          {/* Космический фон */}
          <img
            src={boardBg}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className="absolute inset-0 h-full w-full object-contain pointer-events-none select-none opacity-70"
            draggable={false}
          />

          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 50% 30%, rgba(129,140,248,0.18), transparent 60%), linear-gradient(rgba(255,255,255,0.02), rgba(0,0,0,0.25))",
            }}
          />

          {/* Абсолютная сетка 9×8 в процентах: одна разметка работает на ПК и телефоне */}
          <div
            className="absolute inset-0"
          >

            {ids.map((id) => {
              const cell = BOARD[id - 1];
              const { row, col } = rowColForId(id);
              const isPlayer = id === playerPos;
              const isMoksha = id === 68;
              const isTrap = id === 8 || id === 71;
              const tint = PLANE_TINTS[cell.plane] ?? "bg-black/30";
              const isVisited = !isPlayer && visitedSet.has(id);
              const stateLabel = isPlayer
                ? "текущая клетка"
                : cell.type === "snake"
                ? "змея — спуск"
                : cell.type === "ladder"
                ? "стрела — подъём"
                : isMoksha
                ? "Мокша"
                : isVisited
                ? "пройдено"
                : "";
              const fullLabel = `Клетка ${id}${
                stateLabel ? `, ${stateLabel}` : ""
              }: ${cell.name}`;

              const stateRing = isPlayer
                ? "ring-2 ring-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.75)]"
                : isMoksha
                ? "ring-2 ring-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.7)]"
                : cell.type === "snake"
                ? "ring-1 ring-rose-300/70 shadow-[inset_0_0_8px_rgba(244,63,94,0.25)]"
                : cell.type === "ladder"
                ? "ring-1 ring-amber-200/80 shadow-[inset_0_0_8px_rgba(252,211,77,0.3)]"
                : isTrap
                ? "ring-1 ring-purple-300/60"
                : "ring-1 ring-white/10";

              const baseRect = baseCellRectPct(id, padPct, gapPct);
              const rect = cellRects[id] ?? baseRect;
              const isCustomized =
                Math.abs(rect.xPct - baseRect.xPct) > 0.001 ||
                Math.abs(rect.yPct - baseRect.yPct) > 0.001 ||
                Math.abs(rect.wPct - baseRect.wPct) > 0.001 ||
                Math.abs(rect.hPct - baseRect.hPct) > 0.001;
              return (
                <button
                  key={id}
                  type="button"
                  data-cell-id={id}
                  aria-label={fullLabel}
                  aria-current={isPlayer ? "location" : undefined}
                  onClick={(e) => {
                    if (debug) {
                      if (suppressClickRef.current === id) {
                        suppressClickRef.current = null;
                      }
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedCell(id);
                      return;
                    }
                    onSelectCell?.(id);
                  }}
                  onDoubleClick={(e) => {
                    if (debug && e.shiftKey) {
                      e.preventDefault();
                      e.stopPropagation();
                      alignRowTo(id);
                    }
                  }}
                  style={{
                    left: `${rect.xPct}%`,
                    top: `${rect.yPct}%`,
                    width: `${rect.wPct}%`,
                    height: `${rect.hPct}%`,
                    touchAction: debug ? "none" : undefined,
                    zIndex: isCustomized ? 15 : undefined,
                  }}
                  className={`absolute flex items-end justify-center rounded-[6px] p-0.5 text-center select-none transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:z-20 cursor-pointer hover:brightness-125 ${tint} ${stateRing} ${
                    isVisited ? "brightness-110" : ""
                  }`}
                >
                  {debug && (
                    <span
                      role="presentation"
                      onPointerDown={(e) => onCellResizeStart(e, id)}
                      onPointerMove={onCellResizeMove}
                      onPointerUp={onCellResizeEnd}
                      onPointerCancel={onCellResizeEnd}
                      onClick={(e) => { e.stopPropagation(); }}
                      className={`absolute -right-1 -bottom-1 rounded-full ring-2 ring-white/80 cursor-nwse-resize z-40 ${
                        selectedCell === id ? "h-6 w-6 bg-fuchsia-400" : "h-5 w-5 bg-fuchsia-400/80"
                      }`}
                      style={{ touchAction: "none" }}
                      aria-hidden
                    />
                  )}
                  {debug && selectedCell === id && (
                    <span
                      aria-hidden
                      className="absolute inset-0 rounded-[6px] ring-2 ring-fuchsia-300 shadow-[0_0_12px_rgba(232,121,249,0.7)] pointer-events-none z-30"
                    />
                  )}
                  {debug && (
                    <span
                      className={`absolute inset-0 flex items-center justify-center text-[13px] sm:text-[15px] font-extrabold ${NUMBER_CLASS}`}
                      aria-hidden
                      title={cell.name}
                    >
                      {id}
                    </span>
                  )}
                  <span
                    className="absolute right-1 top-1 text-[9px] opacity-70 leading-none"
                    aria-hidden
                  >
                    {isMoksha ? "🕉" : getTattvaForCell(id)?.glyph ?? "·"}
                  </span>
                  {(cell.type === "snake" || cell.type === "ladder") && (
                    <span
                      aria-hidden
                      className={`absolute left-1 top-1 text-[10px] font-bold leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] ${
                        cell.type === "snake" ? "text-rose-200" : "text-amber-200"
                      }`}
                    >
                      {cell.type === "snake" ? "↓" : "↑"}
                    </span>
                  )}
                  {isVisited && (
                    <span
                      aria-hidden
                      className="absolute left-1 bottom-1 h-1.5 w-1.5 rounded-full bg-amber-200/70 shadow-[0_0_4px_rgba(251,191,36,0.7)]"
                    />
                  )}
                  {debug && (
                    <span
                      aria-hidden
                      className="absolute left-1 bottom-1 text-[8px] font-mono text-fuchsia-100/90"
                    >
                      {row},{col}
                    </span>
                  )}
                  {isPlayer && (
                    <motion.div
                      layoutId="player-token"
                      transition={{
                        type: "spring",
                        stiffness: token?.motion.travel.stiffness ?? 260,
                        damping: token?.motion.travel.damping ?? 24,
                        mass: token?.motion.travel.mass ?? 0.9,
                      }}
                      className="absolute inset-1 rounded-md ring-2 backdrop-blur-[2px] flex items-center justify-center z-30"
                      style={{
                        boxShadow: `0 0 0 2px ${
                          token?.ring ?? "#6ee7b7"
                        }, 0 4px 12px -2px ${token?.ring ?? "#6ee7b7"}66`,
                        background: token?.bg ?? "rgba(52,211,153,0.30)",
                        borderColor: token?.ring ?? "#6ee7b7",
                      }}
                    >
                      <motion.span
                        className="block w-full h-full"
                        animate={
                          prefersReducedMotion
                            ? undefined
                            : {
                                rotate: token?.motion.idle.rotate,
                                scale: token?.motion.idle.scale,
                                y: token?.motion.idle.y,
                              }
                        }
                        transition={{
                          duration: token?.motion.idle.duration ?? 3,
                          repeat: prefersReducedMotion ? 0 : Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        {token?.image ? (
                          <img
                            src={token.image}
                            alt={token.glyph}
                            className="w-full h-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
                            draggable={false}
                          />
                        ) : (
                          <span className="text-base drop-shadow">
                            {token?.glyph ?? "🪷"}
                          </span>
                        )}
                      </motion.span>
                    </motion.div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Декоративный overlay: змеи и стрелы поверх сетки */}
          <svg
            className="absolute inset-0 z-10 h-full w-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <marker
                id="lila-arrow-head"
                markerWidth="4"
                markerHeight="4"
                refX="3"
                refY="2"
                orient="auto"
              >
                <path d="M0,0 L4,2 L0,4 Z" fill="rgba(251, 191, 36, 0.95)" />
              </marker>
            </defs>
            {jumpCells.map((cell) => {
              if (!cell.jumpTo) return null;
              const a = cellCenterPct(cell.id);
              const b = cellCenterPct(cell.jumpTo);
              const isSnake = cell.type === "snake";
              return (
                <line
                  key={`${cell.id}-${cell.jumpTo}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={
                    isSnake
                      ? "rgba(244, 63, 94, 0.75)"
                      : "rgba(251, 191, 36, 0.9)"
                  }
                  strokeWidth={isSnake ? 0.5 : 0.55}
                  strokeLinecap="round"
                  strokeDasharray={isSnake ? "1.2 0.9" : undefined}
                  markerEnd={isSnake ? undefined : "url(#lila-arrow-head)"}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>
        </div>
      </div>

      {debug && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 ring-1 ring-white/20">
            <button
              onClick={() =>
                setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))
              }
              className="h-6 w-6 rounded hover:bg-white/10"
              aria-label="Уменьшить"
            >
              −
            </button>
            <span className="min-w-[3ch] text-center tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(4, +(z + 0.1).toFixed(2)))}
              className="h-6 w-6 rounded hover:bg-white/10"
              aria-label="Увеличить"
            >
              +
            </button>
            <button
              onClick={() => setZoom(1)}
              className="ml-1 px-2 h-6 rounded hover:bg-white/10"
            >
              1:1
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setAspectW(IMAGE_ASPECT_W);
              setAspectH(IMAGE_ASPECT_H);
            }}
            className="px-2 py-1 rounded-lg bg-white/10 ring-1 ring-white/20 hover:bg-white/20"
            title={`Сброс aspect-ratio к натуральному PNG (${IMAGE_ASPECT_W}×${IMAGE_ASPECT_H})`}
          >
            aspect {aspectW.toFixed(0)}×{aspectH.toFixed(0)} ⟲
          </button>
          <label className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 ring-1 ring-white/20">
            <span className="opacity-70">gap</span>
            <input type="range" min={0} max={3} step={0.1} value={gapPct}
              onChange={(e) => {
                const nextGap = parseFloat(e.target.value);
                setCellRects((prev) => rebaseCellRects(prev, padPct, gapPct, padPct, nextGap));
                setGapPct(nextGap);
              }}
              className="w-16" />
            <span className="tabular-nums w-8 text-right">{gapPct.toFixed(1)}%</span>
          </label>
          <label className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 ring-1 ring-white/20">
            <span className="opacity-70">pad</span>
            <input type="range" min={0} max={3} step={0.1} value={padPct}
              onChange={(e) => {
                const nextPad = parseFloat(e.target.value);
                setCellRects((prev) => rebaseCellRects(prev, padPct, gapPct, nextPad, gapPct));
                setPadPct(nextPad);
              }}
              className="w-16" />
            <span className="tabular-nums w-8 text-right">{padPct.toFixed(1)}%</span>
          </label>
          <label className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 ring-1 ring-white/20">
            <span className="opacity-70">size</span>
            <input type="range" min={40} max={200} step={1} value={sizePct}
              onChange={(e) => setSizePct(parseFloat(e.target.value))}
              className="w-24" />
            <span className="tabular-nums w-10 text-right">{sizePct}%</span>
          </label>
          <span className="px-2 py-1 rounded-lg bg-white/10 ring-1 ring-white/20 opacity-70">
            drag: {offset.x | 0},{offset.y | 0} · custom: {hasCustomizedRects(cellRects, padPct, gapPct) ? "yes" : "no"}
          </span>
          <button
            onClick={() => {
              setCellOffsets({});
              setCellSizes({});
              setCellRects(createBaseCellRects(padPct, gapPct));
              safeRemove(CELL_RECTS_KEY);
            }}
            className="px-2 h-7 rounded-lg bg-white/10 ring-1 ring-white/20 hover:bg-white/20"
            title="Сбросить позиции и размеры клеток"
          >
            Сброс клеток
          </button>
          <button
            onClick={() => {
              setAspectW(IMAGE_ASPECT_W);
              setAspectH(IMAGE_ASPECT_H);
              setGapPct(DEFAULT_GAP_PCT);
              setPadPct(DEFAULT_PAD_PCT);
              setOffset({x:0,y:0});
              setSizePct(100);
              setZoom(1);
              setCellOffsets({});
              setCellSizes({});
              setCellRects(createBaseCellRects(DEFAULT_PAD_PCT, DEFAULT_GAP_PCT));
              safeRemove(CELL_RECTS_KEY);
            }}
            className="px-2 h-7 rounded-lg bg-white/10 ring-1 ring-white/20 hover:bg-white/20"
          >
            Сброс
          </button>
          <button
            onClick={async () => {
              const payload = JSON.stringify({
                ...currentLayoutPayload(),
                offset,
                cellOffsets,
                cellSizes,
              }, null, 2);
              try { await navigator.clipboard.writeText(payload); alert("Layout скопирован в буфер обмена. Пришлите его мне — сохраню как дефолт."); }
              catch { window.prompt("Скопируйте JSON вручную:", payload); }
            }}
            className="px-2 h-7 rounded-lg bg-emerald-500/20 ring-1 ring-emerald-400/40 hover:bg-emerald-500/30"
            title="Скопировать текущую разметку в буфер обмена"
          >
            Export
          </button>
          <button
            onClick={async () => {
              try {
                setLayoutSyncState("saving");
                await publishLayout({ data: { layout: currentLayoutPayload() } });
                hasPublishedCacheRef.current = true;
                try { safeSet(PUBLISHED_LAYOUT_CACHE_KEY, JSON.stringify(currentLayoutPayload())); } catch {}
                setLayoutSyncState("saved");
                alert("Разметка опубликована. Теперь телефон и ПК будут брать эту сетку автоматически.");
              } catch (error) {
                setLayoutSyncState("error");
                alert(`Не удалось опубликовать layout: ${error instanceof Error ? error.message : String(error)}`);
              }
            }}
            className="px-2 h-7 rounded-lg bg-fuchsia-500/20 ring-1 ring-fuchsia-400/40 hover:bg-fuchsia-500/30"
            title="Сохранить текущую разметку как общую для всех устройств"
          >
            Publish default
          </button>
          <button
            onClick={() => {
              const raw = window.prompt("Вставьте ранее экспортированный layout (JSON):");
              if (!raw) return;
              try {
                const p = JSON.parse(raw);
                if (typeof p.aspectW === "number") setAspectW(p.aspectW);
                if (typeof p.aspectH === "number") setAspectH(p.aspectH);
                if (typeof p.gapPct === "number") setGapPct(p.gapPct);
                if (typeof p.padPct === "number") setPadPct(p.padPct);
                if (typeof p.sizePct === "number") setSizePct(p.sizePct);
                if (p.offset) setOffset(p.offset);
                if (p.cellRects) setCellRects(p.cellRects);
                else if (p.cellOffsets || p.cellSizes) {
                  const nextPad = typeof p.padPct === "number" ? p.padPct : padPct;
                  const nextGap = typeof p.gapPct === "number" ? p.gapPct : gapPct;
                  setCellRects(mergeLegacyLayoutIntoRects(p.cellOffsets ?? {}, p.cellSizes ?? {}, nextPad, nextGap));
                }
                if (p.cellOffsets) setCellOffsets(p.cellOffsets);
                if (p.cellSizes) setCellSizes(p.cellSizes);
              } catch { alert("Не удалось распарсить JSON."); }
            }}
            className="px-2 h-7 rounded-lg bg-sky-500/20 ring-1 ring-sky-400/40 hover:bg-sky-500/30"
            title="Загрузить разметку из JSON"
          >
            Import
          </button>
          <span className="px-2 py-1 rounded-lg bg-white/10 ring-1 ring-white/20 opacity-70">
            sync: {layoutSyncState}
          </span>
        </div>
      )}

      {debug && selectedCell !== null && (() => {
        const id = selectedCell;
        const rect = cellRects[id] ?? baseCellRectPct(id, padPct, gapPct);
        const step = nudgeStep;
        const patch = (dx: number, dy: number, dw: number, dh: number) => {
          setCellRects((prev) => {
            const cur = prev[id] ?? baseCellRectPct(id, padPct, gapPct);
            return {
              ...prev,
              [id]: {
                xPct: +(cur.xPct + dx).toFixed(3),
                yPct: +(cur.yPct + dy).toFixed(3),
                wPct: Math.max(1, +(cur.wPct + dw).toFixed(3)),
                hPct: Math.max(1, +(cur.hPct + dh).toFixed(3)),
              },
            };
          });
        };
        const btn = "h-11 min-w-11 px-3 rounded-lg bg-white/15 ring-1 ring-white/25 active:bg-white/30 text-base font-semibold tabular-nums touch-manipulation";
        return (
          <div
            className="fixed left-2 right-2 bottom-2 z-50 rounded-2xl bg-slate-900/95 backdrop-blur ring-1 ring-white/20 shadow-2xl p-3 text-white sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-md"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
            role="dialog"
            aria-label={`Настройка клетки ${id}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">
                Клетка <span className="text-fuchsia-300">#{id}</span>
                <span className="ml-2 opacity-60 text-xs tabular-nums">
                  x{rect.xPct.toFixed(1)} y{rect.yPct.toFixed(1)} · {rect.wPct.toFixed(1)}×{rect.hPct.toFixed(1)}
                </span>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="h-8 w-8 rounded-lg bg-white/10 ring-1 ring-white/20 active:bg-white/20"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-1 mb-2 text-xs">
              <span className="opacity-70 mr-1">шаг</span>
              {[0.1, 0.2, 0.5, 1].map((s) => (
                <button
                  key={s}
                  onClick={() => setNudgeStep(s)}
                  className={`h-8 px-2 rounded-lg ring-1 ring-white/20 tabular-nums ${
                    nudgeStep === s ? "bg-fuchsia-500/40 ring-fuchsia-300" : "bg-white/10"
                  }`}
                >
                  {s}%
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] opacity-70 mb-1">Позиция</div>
                <div className="grid grid-cols-3 gap-1">
                  <div />
                  <button className={btn} onClick={() => patch(0, -step, 0, 0)} aria-label="Вверх">↑</button>
                  <div />
                  <button className={btn} onClick={() => patch(-step, 0, 0, 0)} aria-label="Влево">←</button>
                  <button className={btn + " opacity-60"} disabled aria-hidden>·</button>
                  <button className={btn} onClick={() => patch(step, 0, 0, 0)} aria-label="Вправо">→</button>
                  <div />
                  <button className={btn} onClick={() => patch(0, step, 0, 0)} aria-label="Вниз">↓</button>
                  <div />
                </div>
              </div>
              <div>
                <div className="text-[11px] opacity-70 mb-1">Размер</div>
                <div className="grid grid-cols-2 gap-1">
                  <button className={btn} onClick={() => patch(0, 0, -step, 0)} aria-label="Уже">W −</button>
                  <button className={btn} onClick={() => patch(0, 0, step, 0)} aria-label="Шире">W +</button>
                  <button className={btn} onClick={() => patch(0, 0, 0, -step)} aria-label="Ниже">H −</button>
                  <button className={btn} onClick={() => patch(0, 0, 0, step)} aria-label="Выше">H +</button>
                </div>
                <button
                  className="mt-1 w-full h-9 rounded-lg bg-white/10 ring-1 ring-white/20 active:bg-white/20 text-xs"
                  onClick={() => {
                    const base = baseCellRectPct(id, padPct, gapPct);
                    setCellRects((prev) => ({ ...prev, [id]: base }));
                  }}
                >
                  Сброс клетки
                </button>
              </div>
            </div>

            <div className="mt-2 flex gap-1">
              <button
                className="flex-1 h-9 rounded-lg bg-sky-500/25 ring-1 ring-sky-400/40 active:bg-sky-500/40 text-xs font-medium"
                onClick={() => alignRowTo(id)}
                title="Выровнять весь ряд по этой клетке"
              >
                Выровнять ряд
              </button>
              <button
                className="h-9 px-3 rounded-lg bg-white/10 ring-1 ring-white/20 active:bg-white/20 text-xs"
                onClick={() => {
                  const prev = id > 1 ? id - 1 : 72;
                  setSelectedCell(prev);
                }}
                aria-label="Предыдущая"
              >
                ◀ {id > 1 ? id - 1 : 72}
              </button>
              <button
                className="h-9 px-3 rounded-lg bg-white/10 ring-1 ring-white/20 active:bg-white/20 text-xs"
                onClick={() => {
                  const nxt = id < 72 ? id + 1 : 1;
                  setSelectedCell(nxt);
                }}
                aria-label="Следующая"
              >
                {id < 72 ? id + 1 : 1} ▶
              </button>
            </div>
          </div>
        );
      })()}

    </div>
  );
}

export const Board = memo(BoardImpl);
export default Board;
