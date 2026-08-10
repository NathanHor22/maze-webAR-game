import type { GridPoint, LevelDefinition } from './types';

export const LEVELS = [
  {
    id: 'signal-garden',
    name: 'Signal Garden',
    subtitle: 'Wake the network',
    map: [
      '#############',
      '#S..#...C...#',
      '#.#.#.#####.#',
      '#.#...#.....#',
      '#.#####.###.#',
      '#.....#...#C#',
      '###.#.###.#.#',
      '#C.K#......E#',
      '#############',
    ],
    timeLimit: 90,
    parTime: 44,
    patrols: [
      {
        path: [
          { col: 7, row: 3 },
          { col: 11, row: 3 },
          { col: 11, row: 5 },
        ],
        speed: 1.05,
        pingPong: true,
        phase: 0.2,
      },
    ],
    traps: [
      { col: 5, row: 7, period: 2.8, activeDuration: 1.25, phase: 0.3 },
    ],
    palette: {
      floor: 0x071b2d,
      floorAccent: 0x0c3044,
      wall: 0x174c65,
      wallTop: 0x32c9cf,
      glow: 0x63fff4,
      sky: 0x102944,
    },
  },
  {
    id: 'crossed-circuits',
    name: 'Crossed Circuits',
    subtitle: 'Thread the patrol grid',
    map: [
      '#############',
      '#S#..C......#',
      '#.#.#####.#.#',
      '#...#.C...#.#',
      '###.#.###.#.#',
      '#...#K#.#C..#',
      '#.###.#.###.#',
      '#C....#....E#',
      '#############',
    ],
    timeLimit: 105,
    parTime: 58,
    patrols: [
      {
        path: [
          { col: 1, row: 3 },
          { col: 3, row: 3 },
          { col: 3, row: 5 },
          { col: 1, row: 5 },
        ],
        speed: 1.2,
        pingPong: true,
        phase: 0.65,
      },
      {
        path: [
          { col: 5, row: 3 },
          { col: 9, row: 3 },
          { col: 9, row: 5 },
          { col: 11, row: 5 },
          { col: 11, row: 7 },
        ],
        speed: 0.95,
        pingPong: true,
        phase: 0.1,
      },
    ],
    traps: [
      { col: 3, row: 1, period: 2.35, activeDuration: 1.05, phase: 0.75 },
      { col: 7, row: 7, period: 3.1, activeDuration: 1.35, phase: 0.15 },
    ],
    palette: {
      floor: 0x160e2b,
      floorAccent: 0x2b1751,
      wall: 0x493174,
      wallTop: 0xf16ee4,
      glow: 0xff77e9,
      sky: 0x25143f,
    },
  },
  {
    id: 'the-mind-gap',
    name: 'The Mind Gap',
    subtitle: 'Outrun the collapsing signal',
    map: [
      '#############',
      '#S..#..C#...#',
      '###.#.#.#.#.#',
      '#...#.#.C.#.#',
      '#.###.#####.#',
      '#C...K#..C..#',
      '#.#####.###.#',
      '#....C....#E#',
      '#############',
    ],
    timeLimit: 120,
    parTime: 72,
    patrols: [
      {
        path: [
          { col: 1, row: 3 },
          { col: 3, row: 3 },
        ],
        speed: 1.55,
        pingPong: true,
        phase: 0.4,
      },
      {
        path: [
          { col: 7, row: 3 },
          { col: 9, row: 3 },
          { col: 9, row: 1 },
          { col: 11, row: 1 },
          { col: 11, row: 5 },
          { col: 7, row: 5 },
        ],
        speed: 1.25,
        pingPong: true,
        phase: 0.8,
      },
      {
        path: [
          { col: 1, row: 7 },
          { col: 9, row: 7 },
        ],
        speed: 1.4,
        pingPong: true,
        phase: 0.25,
      },
    ],
    traps: [
      { col: 5, row: 1, period: 2.1, activeDuration: 1.0, phase: 0.0 },
      { col: 5, row: 3, period: 2.1, activeDuration: 1.0, phase: 0.5 },
      { col: 7, row: 7, period: 2.55, activeDuration: 1.3, phase: 0.25 },
    ],
    palette: {
      floor: 0x201006,
      floorAccent: 0x3d210b,
      wall: 0x69400e,
      wallTop: 0xffb327,
      glow: 0xffd35a,
      sky: 0x39200a,
    },
  },
] as const satisfies readonly LevelDefinition[];

export function getLevelDefinition(index: number): LevelDefinition {
  const level = LEVELS[index];
  if (level === undefined) {
    throw new RangeError(`Level index ${index} is outside 0-${LEVELS.length - 1}.`);
  }
  return level;
}

export function findMapTiles(level: LevelDefinition, tile: string): GridPoint[] {
  const result: GridPoint[] = [];
  level.map.forEach((row, rowIndex) => {
    for (let col = 0; col < row.length; col += 1) {
      if (row[col] === tile) result.push({ col, row: rowIndex });
    }
  });
  return result;
}

function isWalkable(level: LevelDefinition, point: GridPoint): boolean {
  return level.map[point.row]?.[point.col] !== '#'
    && level.map[point.row]?.[point.col] !== undefined;
}

function corridorIsWalkable(level: LevelDefinition, from: GridPoint, to: GridPoint): boolean {
  if (from.col !== to.col && from.row !== to.row) return false;
  const dc = Math.sign(to.col - from.col);
  const dr = Math.sign(to.row - from.row);
  let col = from.col;
  let row = from.row;
  while (col !== to.col || row !== to.row) {
    if (!isWalkable(level, { col, row })) return false;
    col += dc;
    row += dr;
  }
  return isWalkable(level, to);
}

/** Throws with a useful authoring error if a handcrafted level is invalid. */
export function validateLevelDefinitions(levels: readonly LevelDefinition[] = LEVELS): void {
  const allowedTiles = new Set(['#', '.', 'S', 'E', 'C', 'K']);

  for (const level of levels) {
    const width = level.map[0]?.length ?? 0;
    if (width < 5 || level.map.length < 5 || level.map.some((row) => row.length !== width)) {
      throw new Error(`Level "${level.id}" must be a rectangular map of at least 5x5.`);
    }
    for (const row of level.map) {
      for (const tile of row) {
        if (!allowedTiles.has(tile)) throw new Error(`Unknown tile "${tile}" in level "${level.id}".`);
      }
    }

    const starts = findMapTiles(level, 'S');
    const exits = findMapTiles(level, 'E');
    const cells = findMapTiles(level, 'C');
    if (starts.length !== 1 || exits.length !== 1 || cells.length < 1) {
      throw new Error(`Level "${level.id}" needs one S, one E, and at least one C.`);
    }

    const reachable = new Set<string>();
    const queue: GridPoint[] = [starts[0]];
    while (queue.length > 0) {
      const point = queue.shift();
      if (point === undefined) break;
      const key = `${point.col},${point.row}`;
      if (reachable.has(key) || !isWalkable(level, point)) continue;
      reachable.add(key);
      queue.push(
        { col: point.col + 1, row: point.row },
        { col: point.col - 1, row: point.row },
        { col: point.col, row: point.row + 1 },
        { col: point.col, row: point.row - 1 },
      );
    }
    for (const point of [...cells, exits[0]]) {
      if (!reachable.has(`${point.col},${point.row}`)) {
        throw new Error(`Required tile at ${point.col},${point.row} is unreachable in "${level.id}".`);
      }
    }

    for (const patrol of level.patrols) {
      if (patrol.path.length < 2) throw new Error(`A patrol in "${level.id}" has fewer than two waypoints.`);
      const segments = patrol.pingPong
        ? patrol.path.length - 1
        : patrol.path.length;
      for (let index = 0; index < segments; index += 1) {
        const from = patrol.path[index];
        const to = patrol.path[(index + 1) % patrol.path.length];
        if (!corridorIsWalkable(level, from, to)) {
          throw new Error(`A patrol crosses a wall in "${level.id}" near waypoint ${index}.`);
        }
      }
    }
    for (const trap of level.traps) {
      if (!isWalkable(level, trap) || trap.activeDuration >= trap.period) {
        throw new Error(`Invalid trap at ${trap.col},${trap.row} in "${level.id}".`);
      }
    }
  }
}

validateLevelDefinitions();
