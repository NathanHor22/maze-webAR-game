import {
  Group,
  Quaternion,
  Vector3,
  type Matrix4,
  type PerspectiveCamera,
  type Scene,
  type WebGLRenderer,
} from 'three';
import { MindARThree as MindARThreeExport } from 'mind-ar/src/image-target/three.js';

type TargetListener = (event: MindARTargetEvent) => void;
type Unsubscribe = () => void;
type MindARUiFlag = 'yes' | 'no';

const POSITION_DAMPING = 11;
const ROTATION_DAMPING = 14;
const SCALE_DAMPING = 11;

interface RawMindARAnchor {
  group: Group;
  onTargetFound: (() => void) | null;
  onTargetLost: (() => void) | null;
}

interface RawMindARController {
  stopProcessVideo?: () => void;
  dispose?: () => void;
}

interface RawCssRenderer {
  domElement: HTMLElement;
}

interface RawMindARThree {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  cssRenderer?: RawCssRenderer;
  video?: HTMLVideoElement;
  controller?: RawMindARController;
  addAnchor(targetIndex: number): RawMindARAnchor;
  start(): Promise<void>;
  stop(): void;
}

interface RawMindARThreeOptions {
  container: HTMLElement;
  imageTargetSrc: string;
  maxTrack: number;
  uiLoading?: MindARUiFlag;
  uiScanning?: MindARUiFlag;
  uiError?: MindARUiFlag;
  filterMinCF?: number;
  filterBeta?: number;
  warmupTolerance?: number;
  missTolerance?: number;
}

type RawMindARThreeConstructor = new (
  options: RawMindARThreeOptions,
) => RawMindARThree;

export interface MindARSessionUiOptions {
  loading?: boolean;
  scanning?: boolean;
  error?: boolean;
}

export interface MindARTrackingOptions {
  filterMinCF?: number;
  filterBeta?: number;
  warmupTolerance?: number;
  missTolerance?: number;
}

export interface MindARSessionOptions {
  container: HTMLElement;
  imageTargetSrc: string;
  targetIndex?: number;
  maxTrack?: number;
  ui?: MindARSessionUiOptions;
  tracking?: MindARTrackingOptions;
}

export interface MindARTargetEvent {
  readonly session: MindARSession;
  readonly targetIndex: number;
  readonly group: Group;
}

/**
 * Typed lifecycle boundary around MindAR's untyped Three.js image tracker.
 *
 * MindAR owns the camera, renderer, scene, and raw target transform. Game
 * content attaches to the presentation-smoothed `anchorGroup`; screen-space UI
 * stays outside the group in regular DOM elements.
 */
export class MindARSession {
  public readonly scene: Scene;
  public readonly camera: PerspectiveCamera;
  public readonly renderer: WebGLRenderer;
  public readonly anchorGroup: Group;
  public readonly targetIndex: number;

  private readonly raw: RawMindARThree;
  private readonly anchor: RawMindARAnchor;
  private readonly targetFoundListeners = new Set<TargetListener>();
  private readonly targetLostListeners = new Set<TargetListener>();
  private readonly targetPosition = new Vector3();
  private readonly targetRotation = new Quaternion();
  private readonly targetScale = new Vector3(1, 1, 1);

  private startPromise: Promise<void> | null = null;
  private rawMayBeRunning = false;
  private stopRequested = false;
  private disposed = false;

  public constructor(options: MindARSessionOptions) {
    this.validateOptions(options);

    this.targetIndex = options.targetIndex ?? 0;

    const MindARThree = getMindARThreeConstructor();
    this.raw = new MindARThree(createRawOptions(options));
    this.scene = this.raw.scene;
    this.camera = this.raw.camera;
    this.renderer = this.raw.renderer;

    this.anchor = this.raw.addAnchor(this.targetIndex);
    this.anchorGroup = new Group();
    this.anchorGroup.name = `Smoothed MindAR target ${this.targetIndex}`;
    this.anchorGroup.visible = false;
    this.scene.add(this.anchorGroup);
    this.anchor.onTargetFound = () => {
      this.syncPresentationPose(this.anchor.group.matrix, true, 0);
      this.anchorGroup.visible = true;
      this.emit(this.targetFoundListeners);
    };
    this.anchor.onTargetLost = () => {
      this.anchorGroup.visible = false;
      this.emit(this.targetLostListeners);
    };
  }

  public get isRunning(): boolean {
    return this.rawMayBeRunning && !this.stopRequested && !this.disposed;
  }

  public get isDisposed(): boolean {
    return this.disposed;
  }

  /** Smooth the tracked pose once per render frame before drawing the scene. */
  public update(deltaSeconds: number): void {
    if (this.disposed || !this.anchor.group.visible) return;
    this.syncPresentationPose(this.anchor.group.matrix, false, deltaSeconds);
  }

  /** Starts camera capture and image tracking. Concurrent calls share one start. */
  public start(): Promise<void> {
    this.assertUsable();

    if (this.isRunning) {
      return Promise.resolve();
    }

    if (this.startPromise !== null) {
      return this.startPromise;
    }

    this.stopRequested = false;

    let pendingStart: Promise<void>;
    pendingStart = this.raw.start()
      .then(() => {
        this.rawMayBeRunning = true;

        if (this.stopRequested || this.disposed) {
          this.stopRawSafely();
        }
      })
      .catch((error: unknown) => {
        this.rawMayBeRunning = false;
        this.cleanUpCameraElement();
        throw normalizeError(error, 'MindAR failed to start');
      })
      .finally(() => {
        if (this.startPromise === pendingStart) {
          this.startPromise = null;
        }
      });

    this.startPromise = pendingStart;
    return pendingStart;
  }

  /** Stops tracking and every camera media track. The session can be started again. */
  public async stop(): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.stopRequested = true;

    if (this.startPromise !== null) {
      try {
        await this.startPromise;
      } catch {
        // A failed start has no active tracking loop, but may have left a video.
      }
    }

    this.stopRawSafely();
  }

  public onTargetFound(listener: TargetListener): Unsubscribe {
    return this.subscribe(this.targetFoundListeners, listener);
  }

  public onTargetLost(listener: TargetListener): Unsubscribe {
    return this.subscribe(this.targetLostListeners, listener);
  }

  /** Permanently releases camera, renderer, DOM, anchor, and callback resources. */
  public async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.stopRequested = true;

    if (this.startPromise !== null) {
      try {
        await this.startPromise;
      } catch {
        // Cleanup below is still required after a partially failed start.
      }
    }

    this.stopRawSafely();
    try {
      this.raw.controller?.dispose?.();
    } catch (error: unknown) {
      console.warn('MindAR worker cleanup failed', error);
    }
    this.anchor.onTargetFound = null;
    this.anchor.onTargetLost = null;
    this.targetFoundListeners.clear();
    this.targetLostListeners.clear();

    this.anchorGroup.removeFromParent();
    this.anchorGroup.clear();
    this.anchor.group.removeFromParent();
    this.anchor.group.clear();

    this.renderer.setAnimationLoop(null);
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.raw.cssRenderer?.domElement.remove();
  }

  private subscribe(listeners: Set<TargetListener>, listener: TargetListener): Unsubscribe {
    this.assertUsable();
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  private emit(listeners: Set<TargetListener>): void {
    if (this.disposed) {
      return;
    }

    const event: MindARTargetEvent = {
      session: this,
      targetIndex: this.targetIndex,
      group: this.anchorGroup,
    };

    for (const listener of [...listeners]) {
      try {
        listener(event);
      } catch (error: unknown) {
        console.error('MindAR target listener failed', error);
      }
    }
  }

  private stopRawSafely(): void {
    if (this.rawMayBeRunning) {
      try {
        this.raw.stop();
      } catch (error: unknown) {
        console.warn('MindAR stop failed; forcing media cleanup', error);
      }
    } else {
      try {
        this.raw.controller?.stopProcessVideo?.();
      } catch (error: unknown) {
        console.warn('MindAR processing-loop cleanup failed', error);
      }
    }

    this.rawMayBeRunning = false;
    this.anchorGroup.visible = false;
    this.cleanUpCameraElement();
  }

  private syncPresentationPose(matrix: Matrix4, snap: boolean, deltaSeconds: number): void {
    matrix.decompose(this.targetPosition, this.targetRotation, this.targetScale);
    if (snap) {
      this.anchorGroup.position.copy(this.targetPosition);
      this.anchorGroup.quaternion.copy(this.targetRotation);
      this.anchorGroup.scale.copy(this.targetScale);
      return;
    }

    const delta = Math.min(Math.max(Number.isFinite(deltaSeconds) ? deltaSeconds : 0, 0), 0.1);
    const positionAlpha = 1 - Math.exp(-POSITION_DAMPING * delta);
    const rotationAlpha = 1 - Math.exp(-ROTATION_DAMPING * delta);
    const scaleAlpha = 1 - Math.exp(-SCALE_DAMPING * delta);
    this.anchorGroup.position.lerp(this.targetPosition, positionAlpha);
    this.anchorGroup.quaternion.slerp(this.targetRotation, rotationAlpha);
    this.anchorGroup.scale.lerp(this.targetScale, scaleAlpha);
  }

  private cleanUpCameraElement(): void {
    const video = this.raw.video;
    const stream = video?.srcObject;

    if (video !== undefined && stream instanceof MediaStream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
      video.srcObject = null;
    }

    video?.remove();
  }

  private assertUsable(): void {
    if (this.disposed) {
      throw new Error('MindARSession has been disposed');
    }
  }

  private validateOptions(options: MindARSessionOptions): void {
    if (!(options.container instanceof HTMLElement)) {
      throw new TypeError('MindARSession requires an HTMLElement container');
    }

    if (options.imageTargetSrc.trim().length === 0) {
      throw new TypeError('MindARSession requires a non-empty imageTargetSrc');
    }

    const targetIndex = options.targetIndex ?? 0;
    if (!Number.isInteger(targetIndex) || targetIndex < 0) {
      throw new RangeError('targetIndex must be a non-negative integer');
    }

    const maxTrack = options.maxTrack ?? 1;
    if (!Number.isInteger(maxTrack) || maxTrack < 1) {
      throw new RangeError('maxTrack must be a positive integer');
    }
  }
}

function getMindARThreeConstructor(): RawMindARThreeConstructor {
  if (typeof MindARThreeExport !== 'function') {
    throw new TypeError('MindAR did not export a MindARThree constructor');
  }

  return MindARThreeExport as RawMindARThreeConstructor;
}

function createRawOptions(options: MindARSessionOptions): RawMindARThreeOptions {
  const rawOptions: RawMindARThreeOptions = {
    container: options.container,
    imageTargetSrc: options.imageTargetSrc,
    maxTrack: options.maxTrack ?? 1,
  };

  applyUiOptions(rawOptions, options.ui);
  applyTrackingOptions(rawOptions, options.tracking);
  return rawOptions;
}

function applyUiOptions(
  rawOptions: RawMindARThreeOptions,
  ui: MindARSessionUiOptions | undefined,
): void {
  if (ui?.loading !== undefined) rawOptions.uiLoading = toUiFlag(ui.loading);
  if (ui?.scanning !== undefined) rawOptions.uiScanning = toUiFlag(ui.scanning);
  if (ui?.error !== undefined) rawOptions.uiError = toUiFlag(ui.error);
}

function applyTrackingOptions(
  rawOptions: RawMindARThreeOptions,
  tracking: MindARTrackingOptions | undefined,
): void {
  if (tracking?.filterMinCF !== undefined) rawOptions.filterMinCF = tracking.filterMinCF;
  if (tracking?.filterBeta !== undefined) rawOptions.filterBeta = tracking.filterBeta;
  if (tracking?.warmupTolerance !== undefined) {
    rawOptions.warmupTolerance = tracking.warmupTolerance;
  }
  if (tracking?.missTolerance !== undefined) {
    rawOptions.missTolerance = tracking.missTolerance;
  }
}

function toUiFlag(enabled: boolean): MindARUiFlag {
  return enabled ? 'yes' : 'no';
}

function normalizeError(error: unknown, fallbackMessage: string): Error {
  return error instanceof Error
    ? error
    : new Error(`${fallbackMessage}: ${String(error)}`);
}
