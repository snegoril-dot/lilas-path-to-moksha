// Shared gameplay types for the main game screen and its extracted
// components/hooks. Kept intentionally small — no behavior lives here.

import type { Cell } from "./lila-board";
import type { GameMode } from "./game-mode";
import type { KeyCell } from "@/components/lila/WinOverlay";

export type { Cell, GameMode, KeyCell };

/** High-level screen state of the game. */
export type GamePhase = "loading" | "welcome" | "playing" | "won";

/** Kind of an event recorded in the path log. */
export type PathEventKind = "land" | "snake" | "ladder" | "moksha";

/** One entry appended to the path log per meaningful move outcome. */
export interface PathLogItem {
  cell: number;
  kind: string; // keep string for backward-compat with persisted rows
  to?: number;
}

/** Latest move that produced a "landed" experience card. */
export interface MoveEvent {
  cell: number;
  from?: number;
  kind?: "snake" | "ladder";
}

/** Session lifecycle status persisted to backend. */
export type SessionStatus = "in_progress" | "moksha" | "abandoned";

/** Payload used by the reflection modal after snake/ladder events. */
export interface ReflectionEntry {
  fromId: number;
  fromName: string;
  toId: number;
  toName: string;
  kind: "snake" | "ladder";
  note?: string | null;
}

/** Context passed to the AI-Guru sheet. */
export interface GuruContext {
  cell: number;
  cellName: string;
  sankalpa: string;
  sessionId: string | null;
  eventKind: "waiting" | "normal" | "snake" | "ladder" | "moksha";
  initialPrompt?: string;
  recentPath: PathLogItem[];
}

/** Snapshot returned by getActiveSession, normalised for the resume dialog. */
export interface ResumeSnapshot {
  id: string;
  currentCell: number;
  sankalpa: string | null;
  mode: GameMode;
  movesCount: number;
  updatedAt: string | null;
  startedAt: string | null;
  entryMisses: number;
  sixStreak: number;
  path: PathLogItem[];
  diceHistory: number[];
  keyCells: KeyCell[];
  cellVisits: Record<number, number>;
}
