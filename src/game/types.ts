import type * as THREE from 'three';

export type Direction = 'up' | 'down' | 'left' | 'right';

export type GameState = 'ready' | 'running' | 'paused' | 'won' | 'lost';

export type PauseReason = 'manual' | 'tracking' | null;

export interface GridPoint {
  readonly col: number;
  readonly row: number;
}

export interface PatrolDefinition {
  /** Waypoints must be joined by unobstructed horizontal or vertical corridors. */
  readonly path: readonly GridPoint[];
  /** Movement speed expressed in grid cells per second. */
  readonly speed: number;
  /** When true the drone reverses at the ends. Otherwise it loops to waypoint zero. */
  readonly pingPong?: boolean;
  readonly phase?: number;
}

export interface TrapDefinition extends GridPoint {
  readonly period: number;
  readonly activeDuration: number;
  readonly phase?: number;
}

export interface LevelDefinition {
  readonly id: string;
  readonly name: string;
  readonly subtitle: string;
  /**
   * # wall, . floor, S start, E exit, C energy cell, K checkpoint.
   * Every row must have the same width.
   */
  readonly map: readonly string[];
  readonly timeLimit: number;
  readonly parTime: number;
  readonly patrols: readonly PatrolDefinition[];
  readonly traps: readonly TrapDefinition[];
  readonly palette: Readonly<{
    floor: number;
    floorAccent: number;
    wall: number;
    wallTop: number;
    glow: number;
    sky: number;
  }>;
}

export interface GameSnapshot {
  readonly state: GameState;
  readonly pauseReason: PauseReason;
  readonly levelIndex: number;
  readonly levelCount: number;
  readonly levelId: string;
  readonly levelName: string;
  readonly levelSubtitle: string;
  readonly elapsedSeconds: number;
  readonly remainingSeconds: number;
  readonly score: number;
  readonly lives: number;
  readonly maxLives: number;
  readonly cellsCollected: number;
  readonly totalCells: number;
  readonly exitUnlocked: boolean;
  /** Remaining simulation time before Dash is available again. */
  readonly dashCooldownSeconds: number;
  /** Zero until the level is won, then 1-3. */
  readonly stars: number;
  readonly isTracking: boolean;
  readonly canAdvance: boolean;
}

export type GameEvent =
  | Readonly<{ type: 'started'; levelIndex: number }>
  | Readonly<{ type: 'collect'; collected: number; total: number; score: number }>
  | Readonly<{ type: 'portal-unlocked' }>
  | Readonly<{ type: 'checkpoint'; col: number; row: number }>
  | Readonly<{ type: 'hit'; lives: number; source: 'drone' | 'trap' }>
  | Readonly<{ type: 'level-won'; levelIndex: number; score: number; stars: number; elapsedSeconds: number }>
  | Readonly<{ type: 'game-over'; levelIndex: number; score: number; reason: 'time' | 'lives' }>
  | Readonly<{ type: 'level-loaded'; levelIndex: number; levelId: string }>;

/**
 * UI contract for SynapzeGame. All callbacks are optional.
 *
 * - onSnapshot receives an immutable HUD-ready value after important changes and
 *   approximately ten times per second while the game is running.
 * - onEvent receives one-shot gameplay events suitable for overlays/analytics.
 * - onStateChange fires only when ready/running/paused/won/lost changes.
 *
 * Callbacks must not call update() recursively. They are intended to update UI;
 * lifecycle changes such as restart()/nextLevel() should come from the user's
 * subsequent button gesture (or be queued with queueMicrotask()).
 */
export interface GameCallbacks {
  readonly onSnapshot?: (snapshot: GameSnapshot) => void;
  readonly onEvent?: (event: GameEvent) => void;
  readonly onStateChange?: (state: GameState, snapshot: GameSnapshot) => void;
}

export interface SynapzeGameOptions {
  /** MindAR/Three anchor group that owns the complete tabletop experience. */
  readonly anchor: THREE.Group;
  readonly callbacks?: GameCallbacks;
  readonly initialLevel?: number;
  /** Width in anchor-local units. MindAR image anchors are normally one unit wide. */
  readonly boardWidth?: number;
  readonly maxLives?: number;
  /** WebAudio starts lazily on the first game interaction. */
  readonly audio?: boolean;
}
