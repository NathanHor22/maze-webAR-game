import * as THREE from 'three';
import * as ZapparThree from '@zappar/zappar-threejs';

// ── Renderer ──────────────────────────────────────────────────────────────────
const canvas = document.getElementById('ar-canvas') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
ZapparThree.glContextSet(renderer.getContext());

// ── Scene & Camera ────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
const camera = new ZapparThree.Camera();
scene.background = camera.backgroundTexture;
scene.add(camera);

const ambient = new THREE.AmbientLight(0xffffff, 0.8);
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(1, 3, 2);
scene.add(ambient, sun);

// ── Image Tracker ─────────────────────────────────────────────────────────────
const imageTracker = new ZapparThree.ImageTrackerLoader().load('/assets/targets/synapze-card.zpt');

const trackerGroup = new ZapparThree.ImageAnchorGroup(camera, imageTracker);
scene.add(trackerGroup);

const scanPrompt = document.getElementById('scan-prompt') as HTMLElement;
imageTracker.onVisible.bind(() => { scanPrompt.style.display = 'none'; });
imageTracker.onNotVisible.bind(() => { scanPrompt.style.display = 'flex'; });

// ── Game Board — landscape to match Synapze business card (85mm x 55mm) ──────
const CARD_W = 3.0;
const CARD_H = 1.95;

// No board mesh — game floats transparently over the real card

// ── Player ────────────────────────────────────────────────────────────────────
const PLAYER_R = 0.33;
const playerMesh = new THREE.Mesh(
  new THREE.SphereGeometry(PLAYER_R, 20, 20),
  new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0x991111 })
);
playerMesh.position.set(0, 0, PLAYER_R);
trackerGroup.add(playerMesh);

let playerX = 0;
let playerY = 0;

// ── Coins ─────────────────────────────────────────────────────────────────────
const COIN_R = 0.24;
const COIN_COUNT = 8;
const COLLECT_DIST = PLAYER_R + COIN_R;
const FLEE_TRIGGER = 4; // coins remaining when fleeing starts

let score = 0;
const scoreEl = document.getElementById('score-counter') as HTMLElement;

type Coin = { mesh: THREE.Mesh; x: number; y: number; vx: number; vy: number; collected: boolean };
const coins: Coin[] = [];

// Fleeing state
let coinsMoving = false;
let coinMoveStartTime = 0;
const FLEE_BASE_SPEED = 0.003;
const FLEE_ACCEL = 0.0025;
const FLEE_MAX_SPEED = 0.022;

function spawnCoins() {
  const marginX = CARD_W / 2 - 0.42;
  const marginY = CARD_H / 2 - 0.42;
  for (let i = 0; i < COIN_COUNT; i++) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(COIN_R, 14, 14),
      new THREE.MeshStandardMaterial({ color: 0xFFD700, emissive: 0x886600 })
    );
    const x = (Math.random() * 2 - 1) * marginX;
    const y = (Math.random() * 2 - 1) * marginY;
    mesh.position.set(x, y, COIN_R);
    trackerGroup.add(mesh);
    coins.push({ mesh, x, y, vx: 0, vy: 0, collected: false });
  }
}

spawnCoins();

function initCoinVelocities() {
  for (const coin of coins) {
    if (coin.collected) continue;
    const dx = coin.x - playerX;
    const dy = coin.y - playerY;
    const dist = Math.hypot(dx, dy) || 1;
    coin.vx = (dx / dist) * FLEE_BASE_SPEED;
    coin.vy = (dy / dist) * FLEE_BASE_SPEED;
  }
}

function updateMovingCoins() {
  if (!coinsMoving || gameOver) return;

  const elapsed = (Date.now() - coinMoveStartTime) / 1000;
  const speed = Math.min(FLEE_BASE_SPEED + elapsed * FLEE_ACCEL, FLEE_MAX_SPEED);
  const boundX = CARD_W / 2 - COIN_R;
  const boundY = CARD_H / 2 - COIN_R;

  for (const coin of coins) {
    if (coin.collected) continue;

    // Scale velocity to current speed while preserving direction
    const mag = Math.hypot(coin.vx, coin.vy) || 1;
    coin.vx = (coin.vx / mag) * speed;
    coin.vy = (coin.vy / mag) * speed;

    coin.x += coin.vx;
    coin.y += coin.vy;

    // Bounce off walls (DVD screensaver style)
    if (coin.x > boundX)  { coin.x = boundX;  coin.vx *= -1; }
    if (coin.x < -boundX) { coin.x = -boundX; coin.vx *= -1; }
    if (coin.y > boundY)  { coin.y = boundY;   coin.vy *= -1; }
    if (coin.y < -boundY) { coin.y = -boundY;  coin.vy *= -1; }

    coin.mesh.position.set(coin.x, coin.y, COIN_R);
  }
}

function checkCollisions() {
  for (const coin of coins) {
    if (coin.collected) continue;
    if (Math.hypot(playerX - coin.x, playerY - coin.y) < COLLECT_DIST) {
      coin.collected = true;
      trackerGroup.remove(coin.mesh);
      score++;
      scoreEl.textContent = String(score);

      const remaining = COIN_COUNT - score;
      if (remaining === 0) { triggerWin(); return; }

      // Start fleeing when 4 coins remain
      if (remaining <= FLEE_TRIGGER && !coinsMoving) {
        coinsMoving = true;
        coinMoveStartTime = Date.now();
        initCoinVelocities();
      }
    }
  }
}

// ── Timer ─────────────────────────────────────────────────────────────────────
const TIMER_SECONDS = 15;
let timeLeft = TIMER_SECONDS;
let timerInterval: ReturnType<typeof setInterval> | null = null;
const timerEl = document.getElementById('timer') as HTMLElement;
let gameOver = false;

function startTimer() {
  timerEl.textContent = String(timeLeft);
  timerInterval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = String(timeLeft);
    if (timeLeft <= 5) timerEl.style.color = '#ff4444';
    if (timeLeft <= 0) triggerLose();
  }, 1000);
}

function stopTimer() {
  if (timerInterval !== null) { clearInterval(timerInterval); timerInterval = null; }
}

// ── Win / Lose ────────────────────────────────────────────────────────────────
const winScreen  = document.getElementById('win-screen')  as HTMLElement;
const loseScreen = document.getElementById('lose-screen') as HTMLElement;

function triggerWin() {
  if (gameOver) return;
  gameOver = true;
  stopTimer();
  stopMoving();
  winScreen.style.display = 'flex';
}

function triggerLose() {
  if (gameOver) return;
  gameOver = true;
  stopTimer();
  stopMoving();
  loseScreen.style.display = 'flex';
}

function restartGame() {
  coins.forEach(c => { if (!c.collected) trackerGroup.remove(c.mesh); });
  coins.length = 0;
  score = 0;
  scoreEl.textContent = '0';
  timeLeft = TIMER_SECONDS;
  timerEl.style.color = '#4ECDC4';
  timerEl.textContent = String(timeLeft);
  playerX = 0; playerY = 0;
  playerMesh.position.set(0, 0, PLAYER_R);
  coinsMoving = false;
  gameOver = false;
  timerStarted = false;
  winScreen.style.display  = 'none';
  loseScreen.style.display = 'none';
  spawnCoins();
  startTimer();
}

document.getElementById('btn-play-again-win')!.addEventListener('click', restartGame);
document.getElementById('btn-play-again-lose')!.addEventListener('click', restartGame);

// ── Movement ──────────────────────────────────────────────────────────────────
const STEP = 0.042;
let moveInterval: ReturnType<typeof setInterval> | null = null;

let timerStarted = false;

function startMoving(dx: number, dy: number) {
  if (gameOver) return;
  if (!timerStarted) { timerStarted = true; startTimer(); }
  stopMoving();
  moveInterval = setInterval(() => {
    playerX = Math.max(-(CARD_W / 2 - PLAYER_R), Math.min(CARD_W / 2 - PLAYER_R, playerX + dx));
    playerY = Math.max(-(CARD_H / 2 - PLAYER_R), Math.min(CARD_H / 2 - PLAYER_R, playerY + dy));
    playerMesh.position.set(playerX, playerY, PLAYER_R);
    checkCollisions();
  }, 16);
}

function stopMoving() {
  if (moveInterval !== null) { clearInterval(moveInterval); moveInterval = null; }
}

function bindButton(id: string, dx: number, dy: number) {
  const btn = document.getElementById(id)!;
  btn.addEventListener('pointerdown', () => startMoving(dx, dy));
  btn.addEventListener('pointerup', stopMoving);
  btn.addEventListener('pointercancel', stopMoving);
  btn.addEventListener('pointerleave', stopMoving);
}

bindButton('btn-up',    0,      STEP);
bindButton('btn-down',  0,     -STEP);
bindButton('btn-left', -STEP,   0);
bindButton('btn-right', STEP,   0);

// ── Camera & loop ─────────────────────────────────────────────────────────────
ZapparThree.permissionRequestUI().then(granted => {
  if (granted) camera.start();
  else ZapparThree.permissionDeniedUI();
});

function animate() {
  requestAnimationFrame(animate);
  updateMovingCoins();
  camera.updateFrame(renderer);
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => renderer.setSize(window.innerWidth, window.innerHeight));
