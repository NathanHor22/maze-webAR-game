import * as THREE from 'three';
import * as ZapparThree from '@zappar/zappar-threejs';

const canvas = document.getElementById('ar-canvas') as HTMLCanvasElement;

const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

ZapparThree.glContextSet(renderer.getContext());

const scene = new THREE.Scene();
const camera = new ZapparThree.Camera();
scene.background = camera.backgroundTexture;
scene.add(camera);

ZapparThree.permissionRequestUI().then(granted => {
  if (granted) camera.start();
  else ZapparThree.permissionDeniedUI();
});

function animate() {
  requestAnimationFrame(animate);
  camera.updateFrame(renderer);
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => renderer.setSize(window.innerWidth, window.innerHeight));

// ── Player ──────────────────────────────────────────────────────────────────
const player = document.getElementById('player') as HTMLElement;
const PLAYER_R = 25;
const COIN_R = 18;
const STEP = 8;
const INTERVAL_MS = 16;

let px = window.innerWidth / 2;
let py = window.innerHeight / 2;
let moveInterval: ReturnType<typeof setInterval> | null = null;

player.style.left = px + 'px';
player.style.top = py + 'px';

// ── Coins ───────────────────────────────────────────────────────────────────
const COIN_COUNT = 8;
let score = 0;
const counterEl = document.getElementById('score-counter') as HTMLElement;

type Coin = { el: HTMLElement; x: number; y: number; collected: boolean };
const coins: Coin[] = [];

function spawnCoins() {
  const margin = 60;
  for (let i = 0; i < COIN_COUNT; i++) {
    const el = document.createElement('div');
    el.className = 'coin';
    document.body.appendChild(el);

    const x = margin + Math.random() * (window.innerWidth - margin * 2);
    const y = margin + Math.random() * (window.innerHeight - margin * 2);
    el.style.left = x + 'px';
    el.style.top = y + 'px';

    coins.push({ el, x, y, collected: false });
  }
}

function checkCollisions() {
  for (const coin of coins) {
    if (coin.collected) continue;
    const dist = Math.hypot(px - coin.x, py - coin.y);
    if (dist < PLAYER_R + COIN_R) {
      coin.collected = true;
      coin.el.remove();
      score++;
      counterEl.textContent = String(score);
    }
  }
}

spawnCoins();

// ── Movement ─────────────────────────────────────────────────────────────────
function startMoving(dx: number, dy: number) {
  stopMoving();
  moveInterval = setInterval(() => {
    px = Math.max(PLAYER_R, Math.min(window.innerWidth - PLAYER_R, px + dx));
    py = Math.max(PLAYER_R, Math.min(window.innerHeight - PLAYER_R, py + dy));
    player.style.left = px + 'px';
    player.style.top = py + 'px';
    checkCollisions();
  }, INTERVAL_MS);
}

function stopMoving() {
  if (moveInterval !== null) {
    clearInterval(moveInterval);
    moveInterval = null;
  }
}

function bindButton(id: string, dx: number, dy: number) {
  const btn = document.getElementById(id)!;
  btn.addEventListener('pointerdown', () => startMoving(dx, dy));
  btn.addEventListener('pointerup', stopMoving);
  btn.addEventListener('pointercancel', stopMoving);
  btn.addEventListener('pointerleave', stopMoving);
}

bindButton('btn-up',    0, -STEP);
bindButton('btn-down',  0,  STEP);
bindButton('btn-left', -STEP, 0);
bindButton('btn-right', STEP, 0);
