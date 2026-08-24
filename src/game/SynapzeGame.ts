import * as THREE from 'three';
import { GameAudio } from './audio';
import { findMapTiles, getLevelDefinition, LEVELS } from './levels';
import {
  createCheckpoint,
  createDrone,
  createEnergyCell,
  createPortal,
  createRobot,
  createSpikeTrap,
  disposeObject,
  type DroneRig,
  type EnergyCellRig,
  type PortalRig,
  type RobotRig,
  type TrapRig,
} from './models';
import { ParticleSystem } from './particles';
import type {
  Direction,
  GameCallbacks,
  GameEvent,
  GameSnapshot,
  GameState,
  GridPoint,
  LevelDefinition,
  PatrolDefinition,
  PauseReason,
  SynapzeGameOptions,
  TrapDefinition,
} from './types';

const FIXED_STEP = 1 / 90;
const MAX_FRAME_DELTA = 0.1;
const SNAPSHOT_INTERVAL = 0.1;
const PLAYER_VISUAL_SCALE = 1.72;
const DRONE_VISUAL_SCALE = 1.35;
const GRID_CENTER_EPSILON = 1e-5;

const DIRECTION_VECTORS: Readonly<Record<Direction, Readonly<{ x: number; z: number }>>> = {
  up: { x: 0, z: -1 },
  down: { x: 0, z: 1 },
  left: { x: -1, z: 0 },
  right: { x: 1, z: 0 },
};

const INITIAL_DIRECTION_ORDER: readonly Direction[] = ['right', 'down', 'left', 'up'];

interface CollectibleRuntime {
  readonly point: GridPoint;
  readonly rig: EnergyCellRig;
  collected: boolean;
}

interface PatrolRuntime {
  readonly definition: PatrolDefinition;
  readonly rig: DroneRig;
  targetIndex: number;
  direction: 1 | -1;
}

interface TrapRuntime {
  readonly definition: TrapDefinition;
  readonly rig: TrapRig;
  active: boolean;
}

/**
 * Self-contained game simulation and procedural Three.js presentation.
 *
 * The supplied anchor is assumed to use MindAR image coordinates (XY is the
 * target plane and +Z comes out of the image). This class rotates its internal
 * conventional XZ tabletop automatically, so callers should not rotate it.
 *
 * Typical host loop:
 *
 *   const game = new SynapzeGame({ anchor: mindarAnchor.group, callbacks });
 *   renderer.setAnimationLoop(() => {
 *     game.update(clock.getDelta());
 *     renderer.render(scene, camera);
 *   });
 *
 * Bind each steering control to steer('up') (or another direction) on a tap.
 * Movement follows the current heading until another direction is requested.
 * Call setTrackingVisible from MindAR targetFound/targetLost events.
 */
export class SynapzeGame {
  public readonly root = new THREE.Group();

  private readonly tabletopRoot = new THREE.Group();
  private readonly callbacks: GameCallbacks;
  private readonly boardWidth: number;
  private readonly maxLives: number;
  private readonly audio: GameAudio;
  private readonly tempVector = new THREE.Vector3();

  private levelContent: THREE.Group | null = null;
  private level: LevelDefinition;
  private levelIndex: number;
  private cellSize = 0.07;
  private mapWidth = 0;
  private mapHeight = 0;
  private playerRadius = 0.018;
  private playerSpeed = 0.22;
  private robot: RobotRig | null = null;
  private portal: PortalRig | null = null;
  private portalPoint: GridPoint = { col: 0, row: 0 };
  private collectibles: CollectibleRuntime[] = [];
  private patrols: PatrolRuntime[] = [];
  private traps: TrapRuntime[] = [];
  private checkpointObject: THREE.Group | null = null;
  private checkpointPoint: GridPoint;
  private checkpointReached = false;
  private particles: ParticleSystem | null = null;

  private state: GameState = 'ready';
  private pauseReason: PauseReason = null;
  private isTracking = true;
  private resumeAfterTracking = false;
  private elapsedSeconds = 0;
  private simulationTime = 0;
  private visualTime = 0;
  private accumulator = 0;
  private snapshotClock = 0;
  private score = 0;
  private levelStartScore = 0;
  private lives: number;
  private invulnerabilitySeconds = 0;
  private stars = 0;
  private disposed = false;
  private currentDirection: Direction | null = null;
  private queuedDirection: Direction | null = null;
  private playerIsMoving = false;

  public constructor(options: SynapzeGameOptions) {
    this.callbacks = options.callbacks ?? {};
    this.boardWidth = Math.max(0.3, options.boardWidth ?? 0.94);
    this.maxLives = Math.max(1, Math.floor(options.maxLives ?? 3));
    this.lives = this.maxLives;
    this.levelIndex = THREE.MathUtils.clamp(
      Math.floor(options.initialLevel ?? 0),
      0,
      LEVELS.length - 1,
    );
    this.level = getLevelDefinition(this.levelIndex);
    this.checkpointPoint = findMapTiles(this.level, 'S')[0];
    this.audio = new GameAudio(options.audio ?? true);

    this.root.name = 'Synapze: Mind the Gap';
    this.tabletopRoot.name = 'MindAR tabletop transform';
    this.tabletopRoot.rotation.x = Math.PI / 2;
    this.root.add(this.tabletopRoot);
    options.anchor.add(this.root);

    const hemisphere = new THREE.HemisphereLight(0xe6fbff, 0x06101f, 1.25);
    const key = new THREE.DirectionalLight(0xffffff, 1.65);
    key.position.set(-0.45, 1.2, 0.65);
    this.tabletopRoot.add(hemisphere, key);

    this.loadLevel(this.levelIndex, false, false);
  }

  /** Latest immutable HUD/state view. */
  public get snapshot(): GameSnapshot {
    const totalCells = this.collectibles.length;
    const cellsCollected = this.collectibles.reduce(
      (total, collectible) => total + (collectible.collected ? 1 : 0),
      0,
    );
    return Object.freeze({
      state: this.state,
      pauseReason: this.pauseReason,
      steeringDirection: this.queuedDirection ?? this.currentDirection,
      levelIndex: this.levelIndex,
      levelCount: LEVELS.length,
      levelId: this.level.id,
      levelName: this.level.name,
      levelSubtitle: this.level.subtitle,
      elapsedSeconds: this.elapsedSeconds,
      remainingSeconds: Math.max(0, this.level.timeLimit - this.elapsedSeconds),
      score: this.score,
      lives: this.lives,
      maxLives: this.maxLives,
      cellsCollected,
      totalCells,
      exitUnlocked: cellsCollected === totalCells,
      stars: this.stars,
      isTracking: this.isTracking,
      canAdvance: this.state === 'won' && this.levelIndex < LEVELS.length - 1,
    });
  }

  /** Begins the timer and automatic movement. Steering can also start a ready level. */
  public start(): void {
    if (this.disposed || (this.state !== 'ready' && this.state !== 'paused')) return;
    if (!this.isTracking) {
      this.resumeAfterTracking = true;
      this.changeState('paused', 'tracking');
      return;
    }
    if (this.state === 'paused' && this.pauseReason === 'manual') return;
    this.audio.play('start');
    this.changeState('running', null);
    this.emitEvent({ type: 'started', levelIndex: this.levelIndex });
  }

  /** Advance simulation and presentation; deltaSeconds should come from THREE.Clock. */
  public update(deltaSeconds: number): void {
    if (this.disposed || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    const delta = Math.min(deltaSeconds, MAX_FRAME_DELTA);
    this.visualTime += delta;
    this.updatePresentation(delta);

    if (this.state === 'running' && this.isTracking) {
      this.accumulator = Math.min(this.accumulator + delta, MAX_FRAME_DELTA * 2);
      while (this.accumulator >= FIXED_STEP && this.state === 'running') {
        this.accumulator -= FIXED_STEP;
        this.fixedUpdate(FIXED_STEP);
      }
      this.snapshotClock += delta;
      if (this.snapshotClock >= SNAPSHOT_INTERVAL) this.emitSnapshot();
    }
  }

  /**
   * Convert analog input to a queued cardinal heading. A neutral input does not
   * stop movement, matching the tap-to-steer digital controls.
   */
  public setMoveInput(x: number, z: number): void {
    if (this.disposed) return;
    const horizontal = THREE.MathUtils.clamp(Number.isFinite(x) ? x : 0, -1, 1);
    const vertical = THREE.MathUtils.clamp(Number.isFinite(z) ? z : 0, -1, 1);
    if (Math.max(Math.abs(horizontal), Math.abs(vertical)) < 0.2) return;
    this.steer(
      Math.abs(horizontal) >= Math.abs(vertical)
        ? (horizontal < 0 ? 'left' : 'right')
        : (vertical < 0 ? 'up' : 'down'),
    );
  }

  /** Queue a cardinal turn; it is retained until a matching junction is reached. */
  public steer(direction: Direction): void {
    if (this.disposed) return;
    this.queuedDirection = direction;
    if (this.state === 'ready') this.start();
    else this.emitSnapshot(true);
  }

  /**
   * Backwards-compatible digital control adapter. Presses steer and releases
   * are intentionally ignored so the character keeps moving automatically.
   */
  public setDirection(direction: Direction, pressed: boolean): void {
    if (pressed) this.steer(direction);
  }

  public pause(): void {
    if (this.disposed || this.state !== 'running') return;
    this.resumeAfterTracking = false;
    this.changeState('paused', 'manual');
  }

  public resume(): void {
    if (this.disposed || this.state !== 'paused') return;
    if (!this.isTracking) {
      this.resumeAfterTracking = true;
      this.changeState('paused', 'tracking');
      return;
    }
    this.changeState('running', null);
  }

  /** Connect to MindAR targetFound/targetLost for automatic timer-safe pausing. */
  public setTrackingVisible(visible: boolean): void {
    if (this.disposed || visible === this.isTracking) return;
    this.isTracking = visible;
    if (!visible && this.state === 'running') {
      this.resumeAfterTracking = true;
      this.changeState('paused', 'tracking');
    } else if (visible && this.state === 'paused' && this.pauseReason === 'tracking' && this.resumeAfterTracking) {
      this.resumeAfterTracking = false;
      this.changeState('running', null);
    } else {
      this.emitSnapshot(true);
    }
  }

  /** Restart the current level. Campaign score earned before this level is kept. */
  public restart(startImmediately = true): void {
    if (this.disposed) return;
    this.score = this.levelStartScore;
    this.loadLevel(this.levelIndex, true, startImmediately);
  }

  /** Load the next level. Returns false after the final level. */
  public nextLevel(startImmediately = true): boolean {
    if (this.disposed || this.levelIndex >= LEVELS.length - 1) return false;
    this.loadLevel(this.levelIndex + 1, true, startImmediately);
    return true;
  }

  /** Jump to a level, resetting campaign score. */
  public selectLevel(index: number, startImmediately = false): void {
    if (this.disposed) return;
    if (!Number.isInteger(index) || index < 0 || index >= LEVELS.length) {
      throw new RangeError(`Level index ${index} is outside 0-${LEVELS.length - 1}.`);
    }
    this.score = 0;
    this.levelStartScore = 0;
    this.loadLevel(index, false, startImmediately);
  }

  public setAudioEnabled(enabled: boolean): void {
    this.audio.setEnabled(enabled);
  }

  /** Helpful on browsers that demand WebAudio resume directly inside a gesture. */
  public unlockAudio(): Promise<void> {
    return this.audio.unlock();
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cleanupLevel();
    this.root.removeFromParent();
    this.audio.dispose();
  }

  private loadLevel(index: number, preserveScore: boolean, startImmediately: boolean): void {
    this.cleanupLevel();
    this.levelIndex = index;
    this.level = getLevelDefinition(index);
    if (!preserveScore) this.score = 0;
    this.levelStartScore = this.score;
    this.state = 'ready';
    this.pauseReason = null;
    this.resumeAfterTracking = false;
    this.elapsedSeconds = 0;
    this.simulationTime = 0;
    this.accumulator = 0;
    this.snapshotClock = 0;
    this.lives = this.maxLives;
    this.invulnerabilitySeconds = 0;
    this.stars = 0;
    this.currentDirection = null;
    this.queuedDirection = null;
    this.playerIsMoving = false;

    this.mapHeight = this.level.map.length;
    this.mapWidth = this.level.map[0].length;
    this.cellSize = this.boardWidth / this.mapWidth;
    this.playerRadius = this.cellSize * 0.245;
    this.playerSpeed = this.cellSize * 2.7;
    this.levelContent = new THREE.Group();
    this.levelContent.name = `Level: ${this.level.name}`;
    this.tabletopRoot.add(this.levelContent);
    this.buildBoard();
    this.buildActors();
    this.chooseAutomaticHeading(this.checkpointPoint);

    this.emitEvent({ type: 'level-loaded', levelIndex: index, levelId: this.level.id });
    this.changeState('ready', null, true);
    if (startImmediately) this.start();
  }

  private cleanupLevel(): void {
    if (this.levelContent !== null) {
      disposeObject(this.levelContent);
      this.levelContent.removeFromParent();
    }
    this.levelContent = null;
    this.robot = null;
    this.portal = null;
    this.particles = null;
    this.checkpointObject = null;
    this.collectibles = [];
    this.patrols = [];
    this.traps = [];
  }

  private buildBoard(): void {
    if (this.levelContent === null) return;
    const width = this.mapWidth * this.cellSize;
    const depth = this.mapHeight * this.cellSize;
    const palette = this.level.palette;
    const baseHeight = this.cellSize * 0.15;
    const baseGeometry = new THREE.BoxGeometry(
      width + this.cellSize * 0.18,
      baseHeight,
      depth + this.cellSize * 0.18,
    );
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: palette.floor,
      emissive: palette.sky,
      emissiveIntensity: 0.13,
      metalness: 0.52,
      roughness: 0.5,
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -baseHeight * 0.5 - this.cellSize * 0.01;
    base.receiveShadow = true;
    this.levelContent.add(base);

    const edgeGeometry = new THREE.EdgesGeometry(baseGeometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: palette.glow, transparent: true, opacity: 0.68 });
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    edges.position.copy(base.position);
    this.levelContent.add(edges);

    const floorPoints: GridPoint[] = [];
    const wallPoints: GridPoint[] = [];
    for (let row = 0; row < this.mapHeight; row += 1) {
      for (let col = 0; col < this.mapWidth; col += 1) {
        const point = { col, row };
        if (this.level.map[row][col] === '#') wallPoints.push(point);
        else floorPoints.push(point);
      }
    }

    const tileGeometry = new THREE.BoxGeometry(this.cellSize * 0.88, this.cellSize * 0.025, this.cellSize * 0.88);
    const tileMaterial = new THREE.MeshStandardMaterial({
      color: palette.floorAccent,
      emissive: palette.glow,
      emissiveIntensity: 0.07,
      metalness: 0.34,
      roughness: 0.72,
    });
    const tiles = new THREE.InstancedMesh(tileGeometry, tileMaterial, floorPoints.length);
    const panelGeometry = new THREE.BoxGeometry(
      this.cellSize * 0.68,
      this.cellSize * 0.014,
      this.cellSize * 0.68,
    );
    const panelMaterial = new THREE.MeshStandardMaterial({
      color: palette.floorAccent,
      emissive: palette.glow,
      emissiveIntensity: 0.11,
      metalness: 0.38,
      roughness: 0.62,
    });
    const panels = new THREE.InstancedMesh(panelGeometry, panelMaterial, floorPoints.length);
    const matrix = new THREE.Matrix4();
    const tileColor = new THREE.Color();
    floorPoints.forEach((point, index) => {
      const position = this.gridToWorld(point, this.tempVector);
      matrix.makeTranslation(position.x, 0, position.z);
      tiles.setMatrixAt(index, matrix);
      const variation = (point.col + point.row) % 3;
      tileColor.set(palette.floorAccent).offsetHSL(0, 0, variation * 0.018);
      tiles.setColorAt(index, tileColor);
      matrix.makeTranslation(position.x, this.cellSize * 0.018, position.z);
      panels.setMatrixAt(index, matrix);
    });
    tiles.receiveShadow = true;
    panels.receiveShadow = true;
    this.levelContent.add(tiles, panels);

    const wallHeight = this.cellSize * 0.64;
    const wallGeometry = new THREE.BoxGeometry(this.cellSize * 0.95, wallHeight, this.cellSize * 0.95);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: palette.wall,
      emissive: palette.sky,
      emissiveIntensity: 0.13,
      metalness: 0.7,
      roughness: 0.3,
    });
    const walls = new THREE.InstancedMesh(wallGeometry, wallMaterial, wallPoints.length);
    const capGeometry = new THREE.BoxGeometry(
      this.cellSize * 0.84,
      this.cellSize * 0.05,
      this.cellSize * 0.84,
    );
    const capMaterial = new THREE.MeshStandardMaterial({
      color: palette.wallTop,
      emissive: palette.sky,
      emissiveIntensity: 0.22,
      metalness: 0.58,
      roughness: 0.24,
    });
    const caps = new THREE.InstancedMesh(capGeometry, capMaterial, wallPoints.length);
    const insetGeometry = new THREE.BoxGeometry(
      this.cellSize * 0.48,
      this.cellSize * 0.014,
      this.cellSize * 0.48,
    );
    const insetMaterial = new THREE.MeshStandardMaterial({
      color: palette.glow,
      emissive: palette.glow,
      emissiveIntensity: 0.85,
      metalness: 0.3,
      roughness: 0.22,
    });
    const wallInsets = new THREE.InstancedMesh(insetGeometry, insetMaterial, wallPoints.length);
    wallPoints.forEach((point, index) => {
      const position = this.gridToWorld(point, this.tempVector);
      matrix.makeTranslation(position.x, wallHeight * 0.5, position.z);
      walls.setMatrixAt(index, matrix);
      matrix.makeTranslation(position.x, wallHeight + this.cellSize * 0.016, position.z);
      caps.setMatrixAt(index, matrix);
      matrix.makeTranslation(position.x, wallHeight + this.cellSize * 0.045, position.z);
      wallInsets.setMatrixAt(index, matrix);
    });
    walls.castShadow = true;
    walls.receiveShadow = true;
    caps.castShadow = true;
    this.levelContent.add(walls, caps, wallInsets);
  }

  private buildActors(): void {
    if (this.levelContent === null) return;
    const accent = this.level.palette.glow;
    const start = findMapTiles(this.level, 'S')[0];
    this.checkpointPoint = start;
    this.checkpointReached = false;

    this.robot = createRobot(this.cellSize * 0.58 * PLAYER_VISUAL_SCALE, accent);
    this.gridToWorld(start, this.robot.group.position);
    this.levelContent.add(this.robot.group);

    this.portalPoint = findMapTiles(this.level, 'E')[0];
    this.portal = createPortal(this.cellSize * 0.96, accent);
    this.gridToWorld(this.portalPoint, this.portal.group.position);
    this.levelContent.add(this.portal.group);

    this.collectibles = findMapTiles(this.level, 'C').map((point) => {
      const rig = createEnergyCell(this.cellSize * 0.9, accent);
      this.gridToWorld(point, rig.group.position);
      this.levelContent?.add(rig.group);
      return { point, rig, collected: false };
    });

    const checkpoint = findMapTiles(this.level, 'K')[0];
    if (checkpoint !== undefined) {
      this.checkpointObject = createCheckpoint(this.cellSize * 0.84, accent);
      this.gridToWorld(checkpoint, this.checkpointObject.position);
      this.levelContent.add(this.checkpointObject);
    }

    this.patrols = this.level.patrols.map((definition) => {
      const rig = createDrone(this.cellSize * 0.72 * DRONE_VISUAL_SCALE, 0xff315d);
      const from = this.gridToWorld(definition.path[0], new THREE.Vector3());
      const to = this.gridToWorld(definition.path[1], new THREE.Vector3());
      rig.group.position.lerpVectors(from, to, THREE.MathUtils.clamp(definition.phase ?? 0, 0, 1));
      rig.group.position.y = this.cellSize * 0.47;
      this.levelContent?.add(rig.group);
      return { definition, rig, targetIndex: 1, direction: 1 as const };
    });

    this.traps = this.level.traps.map((definition) => {
      const rig = createSpikeTrap(this.cellSize * 0.82, 0xff294d);
      this.gridToWorld(definition, rig.group.position);
      this.levelContent?.add(rig.group);
      return { definition, rig, active: false };
    });

    this.particles = new ParticleSystem(112, this.cellSize * 0.115);
    this.levelContent.add(this.particles.points);
  }

  private fixedUpdate(deltaSeconds: number): void {
    this.elapsedSeconds += deltaSeconds;
    this.simulationTime += deltaSeconds;
    this.invulnerabilitySeconds = Math.max(0, this.invulnerabilitySeconds - deltaSeconds);
    if (this.elapsedSeconds >= this.level.timeLimit) {
      this.lose('time');
      return;
    }

    this.updatePlayer(deltaSeconds);
    this.updatePatrols(deltaSeconds);
    this.updateTrapStates();
    this.checkCollectibles();
    this.checkCheckpoint();
    this.checkHazards();
    if (this.state === 'running') this.checkPortal();
  }

  private updatePlayer(deltaSeconds: number): void {
    if (this.robot === null) {
      this.playerIsMoving = false;
      return;
    }
    const position = this.robot.group.position;
    const previousX = position.x;
    const previousZ = position.z;

    this.movePlayer(this.playerSpeed * deltaSeconds);
    this.playerIsMoving = Math.hypot(position.x - previousX, position.z - previousZ) > 1e-7;
    if (this.currentDirection !== null) {
      const vector = DIRECTION_VECTORS[this.currentDirection];
      this.robot.group.rotation.y = Math.atan2(vector.x, vector.z);
    }
  }

  /** Move along corridor center lines, consuming distance at each grid center. */
  private movePlayer(distance: number): void {
    if (this.robot === null || distance <= 0) return;
    const position = this.robot.group.position;
    let remaining = distance;
    let guard = 0;

    while (remaining > 1e-8 && guard < 12) {
      guard += 1;
      this.applyQueuedDirection(position);
      if (this.currentDirection === null) return;

      const centeredPoint = this.centeredGridPoint(position);
      if (centeredPoint !== null && !this.canLeaveCell(centeredPoint, this.currentDirection)) {
        return;
      }

      const targetPoint = this.nextGridCenter(position, this.currentDirection);
      if (targetPoint === null) return;
      const target = this.gridToWorld(targetPoint, this.tempVector);
      const distanceToTarget = Math.hypot(target.x - position.x, target.z - position.z);
      if (distanceToTarget <= 1e-8) {
        position.x = target.x;
        position.z = target.z;
        continue;
      }

      const step = Math.min(remaining, distanceToTarget);
      const vector = DIRECTION_VECTORS[this.currentDirection];
      const candidateX = position.x + vector.x * step;
      const candidateZ = position.z + vector.z * step;
      if (!this.canOccupy(candidateX, candidateZ)) return;
      position.x = candidateX;
      position.z = candidateZ;
      remaining -= step;

      if (distanceToTarget - step <= 1e-8) {
        position.x = target.x;
        position.z = target.z;
      }
    }
  }

  private applyQueuedDirection(position: THREE.Vector3): void {
    const requested = this.queuedDirection;
    if (requested === null) return;

    if (requested === this.currentDirection) {
      this.queuedDirection = null;
      return;
    }

    if (this.currentDirection !== null) {
      const current = DIRECTION_VECTORS[this.currentDirection];
      const next = DIRECTION_VECTORS[requested];
      if (current.x + next.x === 0 && current.z + next.z === 0) {
        this.setCurrentDirection(requested);
        this.queuedDirection = null;
        return;
      }
    }

    const point = this.centeredGridPoint(position);
    if (point !== null && this.canLeaveCell(point, requested)) {
      this.setCurrentDirection(requested);
      this.queuedDirection = null;
    }
  }

  private chooseAutomaticHeading(point: GridPoint): void {
    if (this.queuedDirection !== null && this.canLeaveCell(point, this.queuedDirection)) {
      this.setCurrentDirection(this.queuedDirection);
      this.queuedDirection = null;
      return;
    }
    if (this.currentDirection !== null && this.canLeaveCell(point, this.currentDirection)) return;
    this.setCurrentDirection(
      INITIAL_DIRECTION_ORDER.find((direction) => this.canLeaveCell(point, direction)) ?? null,
    );
  }

  private setCurrentDirection(direction: Direction | null): void {
    this.currentDirection = direction;
  }

  private centeredGridPoint(position: THREE.Vector3): GridPoint | null {
    const gridX = position.x / this.cellSize + (this.mapWidth - 1) / 2;
    const gridZ = position.z / this.cellSize + (this.mapHeight - 1) / 2;
    const col = Math.round(gridX);
    const row = Math.round(gridZ);
    if (
      Math.abs(gridX - col) > GRID_CENTER_EPSILON
      || Math.abs(gridZ - row) > GRID_CENTER_EPSILON
      || col < 0
      || col >= this.mapWidth
      || row < 0
      || row >= this.mapHeight
    ) {
      return null;
    }
    return { col, row };
  }

  private nextGridCenter(position: THREE.Vector3, direction: Direction): GridPoint | null {
    const gridX = position.x / this.cellSize + (this.mapWidth - 1) / 2;
    const gridZ = position.z / this.cellSize + (this.mapHeight - 1) / 2;
    const vector = DIRECTION_VECTORS[direction];
    const col = vector.x > 0
      ? Math.ceil(gridX + GRID_CENTER_EPSILON)
      : vector.x < 0
        ? Math.floor(gridX - GRID_CENTER_EPSILON)
        : Math.round(gridX);
    const row = vector.z > 0
      ? Math.ceil(gridZ + GRID_CENTER_EPSILON)
      : vector.z < 0
        ? Math.floor(gridZ - GRID_CENTER_EPSILON)
        : Math.round(gridZ);
    if (col < 0 || col >= this.mapWidth || row < 0 || row >= this.mapHeight) return null;
    return { col, row };
  }

  private canLeaveCell(point: GridPoint, direction: Direction): boolean {
    const vector = DIRECTION_VECTORS[direction];
    const tile = this.level.map[point.row + vector.z]?.[point.col + vector.x];
    return tile !== undefined && tile !== '#';
  }

  private canOccupy(x: number, z: number): boolean {
    const left = -(this.mapWidth * this.cellSize) / 2;
    const top = -(this.mapHeight * this.cellSize) / 2;
    const minCol = Math.floor((x - this.playerRadius - left) / this.cellSize);
    const maxCol = Math.floor((x + this.playerRadius - left) / this.cellSize);
    const minRow = Math.floor((z - this.playerRadius - top) / this.cellSize);
    const maxRow = Math.floor((z + this.playerRadius - top) / this.cellSize);

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let col = minCol; col <= maxCol; col += 1) {
        if (row < 0 || row >= this.mapHeight || col < 0 || col >= this.mapWidth) return false;
        if (this.level.map[row][col] !== '#') continue;
        const cellLeft = left + col * this.cellSize;
        const cellRight = cellLeft + this.cellSize;
        const cellTop = top + row * this.cellSize;
        const cellBottom = cellTop + this.cellSize;
        const nearestX = THREE.MathUtils.clamp(x, cellLeft, cellRight);
        const nearestZ = THREE.MathUtils.clamp(z, cellTop, cellBottom);
        const dx = x - nearestX;
        const dz = z - nearestZ;
        if (dx * dx + dz * dz < this.playerRadius * this.playerRadius) return false;
      }
    }
    return true;
  }

  private updatePatrols(deltaSeconds: number): void {
    for (const patrol of this.patrols) {
      let remaining = patrol.definition.speed * this.cellSize * deltaSeconds;
      let guard = 0;
      while (remaining > 0 && guard < 8) {
        guard += 1;
        const target = this.gridToWorld(
          patrol.definition.path[patrol.targetIndex],
          this.tempVector,
        );
        const position = patrol.rig.group.position;
        const dx = target.x - position.x;
        const dz = target.z - position.z;
        const distance = Math.hypot(dx, dz);
        if (distance <= remaining + 1e-7) {
          position.x = target.x;
          position.z = target.z;
          remaining -= distance;
          this.advancePatrolTarget(patrol);
        } else {
          position.x += (dx / distance) * remaining;
          position.z += (dz / distance) * remaining;
          patrol.rig.group.rotation.y = Math.atan2(dx, dz);
          remaining = 0;
        }
      }
    }
  }

  private advancePatrolTarget(patrol: PatrolRuntime): void {
    const last = patrol.definition.path.length - 1;
    if (patrol.definition.pingPong) {
      if (patrol.direction === 1 && patrol.targetIndex >= last) {
        patrol.direction = -1;
        patrol.targetIndex = last - 1;
      } else if (patrol.direction === -1 && patrol.targetIndex <= 0) {
        patrol.direction = 1;
        patrol.targetIndex = 1;
      } else {
        patrol.targetIndex += patrol.direction;
      }
    } else {
      patrol.targetIndex = (patrol.targetIndex + 1) % patrol.definition.path.length;
    }
  }

  private updateTrapStates(): void {
    for (const trap of this.traps) {
      const phase = (trap.definition.phase ?? 0) * trap.definition.period;
      const cycle = (this.simulationTime + phase) % trap.definition.period;
      trap.active = cycle < trap.definition.activeDuration;
    }
  }

  private checkCollectibles(): void {
    if (this.robot === null) return;
    const radiusSquared = (this.cellSize * 0.39) ** 2;
    for (const collectible of this.collectibles) {
      if (collectible.collected) continue;
      if (this.distanceSquaredXZ(this.robot.group.position, collectible.rig.group.position) > radiusSquared) continue;
      collectible.collected = true;
      collectible.rig.group.visible = false;
      this.score += 250;
      this.particles?.emit(collectible.rig.group.position, this.level.palette.glow, 16, this.cellSize * 4.5, 0.75);
      this.audio.play('collect');
      const collected = this.collectibles.reduce((total, item) => total + (item.collected ? 1 : 0), 0);
      this.emitEvent({ type: 'collect', collected, total: this.collectibles.length, score: this.score });

      if (collected === this.collectibles.length) {
        this.portal?.setUnlocked(true);
        this.score += 500;
        if (this.portal !== null) {
          this.particles?.emit(this.portal.group.position, this.level.palette.glow, 30, this.cellSize * 5.5, 1.1);
        }
        this.audio.play('unlock');
        this.emitEvent({ type: 'portal-unlocked' });
      }
      this.emitSnapshot(true);
    }
  }

  private checkCheckpoint(): void {
    if (this.robot === null || this.checkpointReached) return;
    const checkpoint = findMapTiles(this.level, 'K')[0];
    if (checkpoint === undefined) return;
    const checkpointPosition = this.gridToWorld(checkpoint, this.tempVector);
    if (this.distanceSquaredXZ(this.robot.group.position, checkpointPosition) > (this.cellSize * 0.35) ** 2) return;
    this.checkpointPoint = checkpoint;
    this.checkpointReached = true;
    this.score += 100;
    this.particles?.emit(checkpointPosition, 0x72ff9d, 18, this.cellSize * 4.2, 0.8);
    this.audio.play('checkpoint');
    this.emitEvent({ type: 'checkpoint', col: checkpoint.col, row: checkpoint.row });
    this.emitSnapshot(true);
  }

  private checkHazards(): void {
    if (this.robot === null || this.invulnerabilitySeconds > 0) return;
    const droneRadiusSquared = (this.cellSize * 0.46) ** 2;
    for (const patrol of this.patrols) {
      if (this.distanceSquaredXZ(this.robot.group.position, patrol.rig.group.position) <= droneRadiusSquared) {
        this.hit('drone');
        return;
      }
    }
    const trapRadiusSquared = (this.cellSize * 0.34) ** 2;
    for (const trap of this.traps) {
      if (trap.active && this.distanceSquaredXZ(this.robot.group.position, trap.rig.group.position) <= trapRadiusSquared) {
        this.hit('trap');
        return;
      }
    }
  }

  private checkPortal(): void {
    if (this.robot === null || this.portal === null || !this.portal.unlocked) return;
    if (this.distanceSquaredXZ(this.robot.group.position, this.portal.group.position) <= (this.cellSize * 0.38) ** 2) {
      this.win();
    }
  }

  private hit(source: 'drone' | 'trap'): void {
    if (this.robot === null) return;
    this.lives -= 1;
    this.score = Math.max(this.levelStartScore, this.score - 125);
    this.particles?.emit(this.robot.group.position, 0xff315d, 22, this.cellSize * 5.8, 0.9);
    this.audio.play('hit');
    this.emitEvent({ type: 'hit', lives: this.lives, source });
    if (this.lives <= 0) {
      this.lose('lives');
      return;
    }
    this.gridToWorld(this.checkpointPoint, this.robot.group.position);
    this.chooseAutomaticHeading(this.checkpointPoint);
    this.invulnerabilitySeconds = 1.45;
    this.emitSnapshot(true);
  }

  private win(): void {
    if (this.state !== 'running' || this.robot === null) return;
    const remaining = Math.max(0, this.level.timeLimit - this.elapsedSeconds);
    this.score += Math.floor(remaining * 10);
    this.stars = this.calculateStars();
    this.particles?.emit(this.robot.group.position, this.level.palette.glow, 42, this.cellSize * 7, 1.45);
    this.audio.play('win');
    this.changeState('won', null);
    this.emitEvent({
      type: 'level-won',
      levelIndex: this.levelIndex,
      score: this.score,
      stars: this.stars,
      elapsedSeconds: this.elapsedSeconds,
    });
  }

  private lose(reason: 'time' | 'lives'): void {
    if (this.state !== 'running') return;
    this.audio.play('lose');
    this.changeState('lost', null);
    this.emitEvent({ type: 'game-over', levelIndex: this.levelIndex, score: this.score, reason });
  }

  private calculateStars(): number {
    if (this.elapsedSeconds <= this.level.parTime && this.lives === this.maxLives) return 3;
    if (this.elapsedSeconds <= this.level.parTime * 1.4 || this.lives >= this.maxLives - 1) return 2;
    return 1;
  }

  private updatePresentation(deltaSeconds: number): void {
    const moving = this.state === 'running' && this.playerIsMoving;
    this.robot?.update(
      this.visualTime,
      moving,
      this.invulnerabilitySeconds > 0,
      this.state === 'won',
    );
    this.portal?.update(this.visualTime);
    this.collectibles.forEach((collectible, index) => {
      if (!collectible.collected) collectible.rig.update(this.visualTime, index * 1.7);
    });
    this.patrols.forEach((patrol) => patrol.rig.update(this.visualTime));
    this.traps.forEach((trap) => trap.rig.update(this.visualTime, trap.active));
    if (this.checkpointObject !== null) {
      this.checkpointObject.rotation.y = this.visualTime * (this.checkpointReached ? 3.5 : 0.9);
      const scale = this.checkpointReached ? 1 + Math.sin(this.visualTime * 5) * 0.08 : 1;
      this.checkpointObject.scale.setScalar(scale);
    }
    this.particles?.update(deltaSeconds);
  }

  private gridToWorld(point: GridPoint, target: THREE.Vector3): THREE.Vector3 {
    target.set(
      (point.col - (this.mapWidth - 1) / 2) * this.cellSize,
      0,
      (point.row - (this.mapHeight - 1) / 2) * this.cellSize,
    );
    return target;
  }

  private distanceSquaredXZ(a: THREE.Vector3, b: THREE.Vector3): number {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return dx * dx + dz * dz;
  }

  private changeState(state: GameState, pauseReason: PauseReason, force = false): void {
    const changed = state !== this.state || pauseReason !== this.pauseReason;
    this.state = state;
    this.pauseReason = pauseReason;
    this.accumulator = 0;
    if (changed || force) {
      const snapshot = this.snapshot;
      this.callbacks.onStateChange?.(state, snapshot);
      this.callbacks.onSnapshot?.(snapshot);
      this.snapshotClock = 0;
    }
  }

  private emitSnapshot(force = false): void {
    if (!force && this.snapshotClock < SNAPSHOT_INTERVAL) return;
    this.callbacks.onSnapshot?.(this.snapshot);
    this.snapshotClock = 0;
  }

  private emitEvent(event: GameEvent): void {
    this.callbacks.onEvent?.(event);
  }
}
