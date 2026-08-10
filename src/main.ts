import * as THREE from 'three';
import { MindARSession } from './ar';
import {
  SynapzeGame,
  type Direction,
  type GameSnapshot,
  type GameState,
} from './game';

const TARGET_SRC = `${import.meta.env.BASE_URL}assets/targets/mind-the-gap-target.mind`;
const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right'];

function element<T extends HTMLElement>(id: string): T {
  const value = document.getElementById(id);
  if (value === null) throw new Error(`Missing required UI element #${id}`);
  return value as T;
}

const ui = {
  arContainer: element<HTMLDivElement>('ar-container'),
  startScreen: element<HTMLElement>('start-screen'),
  startButton: element<HTMLButtonElement>('btn-start-ar'),
  startStatus: element<HTMLElement>('start-status-text'),
  loading: element<HTMLElement>('loading-indicator'),
  loadingLabel: element<HTMLElement>('loading-label'),
  cameraError: element<HTMLElement>('camera-error'),
  errorTitle: element<HTMLElement>('error-title'),
  errorMessage: element<HTMLElement>('error-message'),
  retryCamera: element<HTMLButtonElement>('btn-retry-camera'),
  scanPrompt: element<HTMLElement>('scan-prompt'),
  scanStatus: element<HTMLElement>('scan-status'),
  hud: element<HTMLElement>('hud'),
  level: element<HTMLElement>('level-counter'),
  collected: element<HTMLElement>('score-counter'),
  coreTotal: element<HTMLElement>('core-total'),
  timer: element<HTMLElement>('timer'),
  health: element<HTMLElement>('health-status'),
  countdown: element<HTMLElement>('countdown'),
  countdownLabel: element<HTMLElement>('countdown-label'),
  countdownValue: element<HTMLElement>('countdown-value'),
  targetLost: element<HTMLElement>('target-lost-overlay'),
  controls: element<HTMLElement>('game-controls'),
  up: element<HTMLButtonElement>('btn-up'),
  down: element<HTMLButtonElement>('btn-down'),
  left: element<HTMLButtonElement>('btn-left'),
  right: element<HTMLButtonElement>('btn-right'),
  dash: element<HTMLButtonElement>('btn-dash'),
  soundToggle: element<HTMLButtonElement>('sound-toggle'),
  soundLabel: document.querySelector<HTMLElement>('#sound-toggle .sound-label'),
  winScreen: element<HTMLElement>('win-screen'),
  loseScreen: element<HTMLElement>('lose-screen'),
  resultStars: element<HTMLElement>('result-stars'),
  resultTime: element<HTMLElement>('result-time'),
  resultCores: element<HTMLElement>('result-cores'),
  resultLevel: element<HTMLElement>('result-level'),
  loseResultCores: element<HTMLElement>('lose-result-cores'),
  bestTime: element<HTMLElement>('best-time'),
  nextLevel: element<HTMLButtonElement>('btn-next-level'),
  replayWin: element<HTMLButtonElement>('btn-play-again-win'),
  replayLose: element<HTMLButtonElement>('btn-play-again-lose'),
  returnToScan: element<HTMLButtonElement>('btn-return-to-scan'),
};

let session: MindARSession | null = null;
let game: SynapzeGame | null = null;
let starting = false;
let arStarted = false;
let hasTrackedTarget = false;
let countdownToken = 0;
let soundEnabled = readPreference('mind-the-gap-sound') !== 'off';
let targetPreflightPromise: Promise<void> | null = null;
const clock = new THREE.Clock(false);

function readPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writePreference(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private browsing and embedded browsers may disable localStorage.
  }
}

function formatTime(seconds: number, showTenths = false): string {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const wholeSeconds = Math.floor(safeSeconds % 60);
  const base = `${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}`;
  return showTenths ? `${base}.${Math.floor((safeSeconds % 1) * 10)}` : base;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function preflightTargetAsset(): Promise<void> {
  if (targetPreflightPromise === null) {
    targetPreflightPromise = fetch(TARGET_SRC, { cache: 'force-cache' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Tracking target could not be loaded (${response.status})`);
        }
        const payload = await response.arrayBuffer();
        if (payload.byteLength < 1024) {
          throw new Error('Tracking target data is incomplete');
        }
      });
  }

  try {
    await targetPreflightPromise;
  } catch (error: unknown) {
    targetPreflightPromise = null;
    throw error;
  }
}

function setGameState(state: string): void {
  document.body.dataset.gameState = state;
}

function hideResults(): void {
  ui.winScreen.hidden = true;
  ui.loseScreen.hidden = true;
}

function cancelCountdown(): void {
  countdownToken += 1;
  ui.countdown.hidden = true;
}

function releaseDirections(): void {
  if (game === null) return;
  for (const direction of DIRECTIONS) game.setDirection(direction, false);
}

function renderSnapshot(snapshot: GameSnapshot): void {
  ui.level.textContent = String(snapshot.levelIndex + 1).padStart(2, '0');
  ui.collected.textContent = String(snapshot.cellsCollected);
  ui.coreTotal.textContent = String(snapshot.totalCells);
  ui.timer.textContent = formatTime(Math.ceil(snapshot.remainingSeconds));
  ui.timer.classList.toggle('is-critical', snapshot.remainingSeconds <= 10);
  ui.dash.disabled = snapshot.state !== 'running'
    || !snapshot.isTracking
    || snapshot.dashCooldownSeconds > 0;

  const fullHearts = '\u2665'.repeat(snapshot.lives);
  const emptyHearts = '\u2661'.repeat(snapshot.maxLives - snapshot.lives);
  ui.health.textContent = `${fullHearts}${emptyHearts}`;
  ui.health.setAttribute(
    'aria-label',
    `${snapshot.lives} ${snapshot.lives === 1 ? 'life' : 'lives'} remaining`,
  );
}

function bestTimeKey(levelIndex: number): string {
  return `mind-the-gap-best-${levelIndex}`;
}

function readBestTime(levelIndex: number): number | null {
  const stored = readPreference(bestTimeKey(levelIndex));
  if (stored === null) return null;
  const parsed = Number(stored);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function saveBestTime(snapshot: GameSnapshot): void {
  const previous = readBestTime(snapshot.levelIndex);
  if (previous === null || snapshot.elapsedSeconds < previous) {
    writePreference(bestTimeKey(snapshot.levelIndex), String(snapshot.elapsedSeconds));
  }
}

function renderStars(stars: number): void {
  ui.resultStars.replaceChildren();
  for (let index = 0; index < 3; index += 1) {
    const star = document.createElement('span');
    star.textContent = index < stars ? '\u2605' : '\u2606';
    star.setAttribute('aria-hidden', 'true');
    ui.resultStars.append(star);
  }
  ui.resultStars.setAttribute('aria-label', `${stars} out of 3 stars`);
}

function showWin(snapshot: GameSnapshot): void {
  saveBestTime(snapshot);
  renderStars(snapshot.stars);
  ui.resultTime.textContent = formatTime(snapshot.elapsedSeconds, true);
  ui.resultCores.textContent = `${snapshot.cellsCollected} / ${snapshot.totalCells}`;
  ui.resultLevel.textContent = String(snapshot.levelIndex + 1).padStart(2, '0');
  ui.nextLevel.hidden = !snapshot.canAdvance;
  ui.loseScreen.hidden = true;
  ui.winScreen.hidden = false;
}

function showLoss(snapshot: GameSnapshot): void {
  const previousBest = readBestTime(snapshot.levelIndex);
  ui.loseResultCores.textContent = `${snapshot.cellsCollected} / ${snapshot.totalCells}`;
  ui.bestTime.textContent = previousBest === null ? '\u2014' : formatTime(previousBest, true);
  ui.winScreen.hidden = true;
  ui.loseScreen.hidden = false;
}

function handleGameState(state: GameState, snapshot: GameSnapshot): void {
  renderSnapshot(snapshot);
  if (!arStarted) return;

  setGameState(state);
  if (state === 'ready') {
    hideResults();
    ui.targetLost.hidden = true;
    ui.hud.hidden = !snapshot.isTracking;
    ui.controls.hidden = true;
    return;
  }

  if (state === 'running') {
    hideResults();
    ui.scanPrompt.hidden = true;
    ui.targetLost.hidden = true;
    ui.hud.hidden = false;
    ui.controls.hidden = !snapshot.isTracking;
    return;
  }

  releaseDirections();
  ui.controls.hidden = true;
  if (state === 'paused') {
    ui.targetLost.hidden = snapshot.pauseReason !== 'tracking';
    return;
  }

  ui.targetLost.hidden = true;
  ui.scanPrompt.hidden = true;
  if (state === 'won') showWin(snapshot);
  else showLoss(snapshot);
}

async function beginCountdown(): Promise<void> {
  const activeGame = game;
  if (
    activeGame === null
    || activeGame.snapshot.state !== 'ready'
    || !activeGame.snapshot.isTracking
  ) {
    return;
  }

  const token = ++countdownToken;
  hideResults();
  ui.scanPrompt.hidden = true;
  ui.targetLost.hidden = true;
  ui.hud.hidden = false;
  ui.controls.hidden = true;
  ui.countdown.hidden = false;
  ui.countdownLabel.textContent = 'Mission starts in';
  setGameState('countdown');

  for (const count of [3, 2, 1]) {
    if (token !== countdownToken || !activeGame.snapshot.isTracking) return;
    ui.countdownValue.textContent = String(count);
    await delay(700);
  }

  if (token !== countdownToken || !activeGame.snapshot.isTracking) return;
  ui.countdownLabel.textContent = 'Route locked';
  ui.countdownValue.textContent = 'GO';
  await delay(360);
  if (token !== countdownToken || !activeGame.snapshot.isTracking) return;

  ui.countdown.hidden = true;
  activeGame.start();
}

function continueReadyLevel(): void {
  hideResults();
  const snapshot = game?.snapshot;
  if (snapshot?.isTracking === true) {
    void beginCountdown();
    return;
  }

  ui.hud.hidden = true;
  ui.controls.hidden = true;
  ui.targetLost.hidden = true;
  ui.scanPrompt.hidden = false;
  ui.scanStatus.textContent = 'Reacquire the target to continue';
  setGameState('scanning');
}

function handleTargetFound(): void {
  if (game === null) return;
  hasTrackedTarget = true;
  ui.scanPrompt.hidden = true;
  ui.scanStatus.textContent = 'Target locked';
  ui.targetLost.hidden = true;
  game.setTrackingVisible(true);

  const snapshot = game.snapshot;
  if (snapshot.state === 'ready') void beginCountdown();
  else if (snapshot.state === 'running') ui.controls.hidden = false;
}

function handleTargetLost(): void {
  if (game === null) return;
  cancelCountdown();
  releaseDirections();
  game.setTrackingVisible(false);
  ui.controls.hidden = true;

  const state = game.snapshot.state;
  if (state === 'won' || state === 'lost') return;
  if (state === 'paused' && hasTrackedTarget) {
    ui.targetLost.hidden = false;
    ui.scanPrompt.hidden = true;
  } else {
    ui.targetLost.hidden = true;
    ui.scanPrompt.hidden = false;
    setGameState('scanning');
  }
}

function createRuntime(): void {
  session = new MindARSession({
    container: ui.arContainer,
    imageTargetSrc: TARGET_SRC,
    maxTrack: 1,
    ui: { loading: false, scanning: false, error: false },
    tracking: { warmupTolerance: 3, missTolerance: 6 },
  });

  session.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  session.renderer.outputColorSpace = THREE.SRGBColorSpace;
  session.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  session.renderer.toneMappingExposure = 1.08;

  game = new SynapzeGame({
    anchor: session.anchorGroup,
    boardWidth: 0.92,
    audio: soundEnabled,
    callbacks: {
      onSnapshot: renderSnapshot,
      onStateChange: handleGameState,
    },
  });
  game.setTrackingVisible(false);
  session.onTargetFound(handleTargetFound);
  session.onTargetLost(handleTargetLost);
}

function cameraErrorCopy(error: unknown): { title: string; message: string } {
  if (!window.isSecureContext) {
    return {
      title: 'A secure connection is required',
      message: 'Open this game over HTTPS, then retry the camera.',
    };
  }

  const errorName = error instanceof DOMException ? error.name : '';
  if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
    return {
      title: 'Camera permission was blocked',
      message: 'Allow camera access for this site in your browser settings, then tap Retry camera.',
    };
  }
  if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
    return {
      title: 'No camera was found',
      message: 'Connect or enable a rear-facing camera, then retry the mission.',
    };
  }
  return {
    title: 'AR could not start',
    message: error instanceof Error
      ? error.message
      : 'Close other camera apps, reload this page, and try again.',
  };
}

async function startAr(): Promise<void> {
  if (starting || arStarted) return;
  starting = true;
  ui.startButton.disabled = true;
  ui.retryCamera.disabled = true;
  ui.loading.hidden = false;
  ui.loadingLabel.textContent = 'Loading tracker and mission grid...';
  ui.startStatus.textContent = 'Preparing camera access';
  ui.cameraError.hidden = true;

  try {
    const targetReady = preflightTargetAsset();
    if (session === null || game === null) createRuntime();
    const activeSession = session;
    const activeGame = game;
    if (activeSession === null || activeGame === null) {
      throw new Error('AR runtime could not be created');
    }
    void activeGame.unlockAudio();
    await targetReady;
    await activeSession.start();
    arStarted = true;
    hasTrackedTarget = false;
    clock.start();
    activeSession.renderer.setAnimationLoop(() => {
      activeGame.update(clock.getDelta());
      activeSession.renderer.render(activeSession.scene, activeSession.camera);
    });

    ui.startScreen.hidden = true;
    ui.cameraError.hidden = true;
    ui.scanPrompt.hidden = false;
    ui.scanStatus.textContent = 'Waiting for target...';
    ui.loading.hidden = true;
    setGameState('scanning');
  } catch (error: unknown) {
    const copy = cameraErrorCopy(error);
    ui.errorTitle.textContent = copy.title;
    ui.errorMessage.textContent = copy.message;
    ui.startScreen.hidden = true;
    ui.cameraError.hidden = false;
    ui.scanPrompt.hidden = true;
    ui.loading.hidden = true;
    setGameState('error');
    console.error('Unable to start MindAR', error);
  } finally {
    starting = false;
    ui.startButton.disabled = false;
    ui.retryCamera.disabled = false;
  }
}

function bindDirection(button: HTMLButtonElement, direction: Direction): void {
  const press = (event: PointerEvent): void => {
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    void game?.unlockAudio();
    game?.setDirection(direction, true);
  };
  const release = (event: PointerEvent): void => {
    event.preventDefault();
    game?.setDirection(direction, false);
  };
  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('pointerleave', release);
}

function triggerDash(): void {
  game?.dash();
}

function directionForKey(key: string): Direction | null {
  const normalized = key.toLowerCase();
  if (normalized === 'arrowup' || normalized === 'w') return 'up';
  if (normalized === 'arrowdown' || normalized === 's') return 'down';
  if (normalized === 'arrowleft' || normalized === 'a') return 'left';
  if (normalized === 'arrowright' || normalized === 'd') return 'right';
  return null;
}

function applySoundPreference(): void {
  game?.setAudioEnabled(soundEnabled);
  ui.soundToggle.classList.toggle('is-muted', !soundEnabled);
  ui.soundToggle.setAttribute('aria-pressed', String(!soundEnabled));
  ui.soundToggle.setAttribute('aria-label', soundEnabled ? 'Mute sound' : 'Unmute sound');
  if (ui.soundLabel !== null) ui.soundLabel.textContent = soundEnabled ? 'Sound' : 'Muted';
}

bindDirection(ui.up, 'up');
bindDirection(ui.down, 'down');
bindDirection(ui.left, 'left');
bindDirection(ui.right, 'right');

ui.startButton.addEventListener('click', () => void startAr());
ui.retryCamera.addEventListener('click', () => void startAr());
ui.dash.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  void game?.unlockAudio();
  triggerDash();
});

ui.soundToggle.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  writePreference('mind-the-gap-sound', soundEnabled ? 'on' : 'off');
  applySoundPreference();
  if (soundEnabled) void game?.unlockAudio();
});

ui.nextLevel.addEventListener('click', () => {
  if (game?.nextLevel(false) !== true) return;
  continueReadyLevel();
});

ui.replayWin.addEventListener('click', () => {
  game?.restart(false);
  continueReadyLevel();
});

ui.replayLose.addEventListener('click', () => {
  game?.restart(false);
  continueReadyLevel();
});

ui.returnToScan.addEventListener('click', () => {
  cancelCountdown();
  game?.restart(false);
  game?.setTrackingVisible(false);
  hideResults();
  ui.hud.hidden = true;
  ui.controls.hidden = true;
  ui.scanPrompt.hidden = false;
  ui.scanStatus.textContent = 'Move away, then scan the target again';
  setGameState('scanning');
});

window.addEventListener('keydown', (event) => {
  if (!arStarted || game?.snapshot.state !== 'running' || !game.snapshot.isTracking) return;
  const direction = directionForKey(event.key);
  if (direction !== null) {
    event.preventDefault();
    game?.setDirection(direction, true);
  } else if (event.code === 'Space' && !event.repeat) {
    event.preventDefault();
    triggerDash();
  }
});

window.addEventListener('keyup', (event) => {
  const direction = directionForKey(event.key);
  if (direction === null) return;
  event.preventDefault();
  game?.setDirection(direction, false);
});

window.addEventListener('blur', releaseDirections);
window.addEventListener('pagehide', (event) => {
  cancelCountdown();
  releaseDirections();
  if (event.persisted) return;
  game?.dispose();
  game = null;
  if (session !== null) void session.dispose();
  session = null;
});

window.addEventListener('pageshow', (event) => {
  if (event.persisted && arStarted) clock.start();
});

applySoundPreference();
if (!window.isSecureContext) {
  ui.startStatus.textContent = 'HTTPS is required for camera access';
}
