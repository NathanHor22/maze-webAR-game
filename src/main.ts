import * as THREE from 'three';
import * as ZapparThree from '@zappar/zappar-threejs';

// ── Renderer ─────────────────────────────────────────────────────────────────
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

// Lighting
const ambient = new THREE.AmbientLight(0xffffff, 0.8);
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(1, 3, 2);
scene.add(ambient, sun);

// ── Image Tracker ─────────────────────────────────────────────────────────────
const imageTracker = new ZapparThree.ImageTrackerLoader().load('/assets/targets/car-tracking.zpt');
const trackerGroup = new ZapparThree.ImageAnchorGroup(camera, imageTracker);
scene.add(trackerGroup);

// ── Scan prompt UI ────────────────────────────────────────────────────────────
const scanPrompt = document.getElementById('scan-prompt') as HTMLElement;

imageTracker.onVisible.bind(() => { scanPrompt.style.display = 'none'; });
imageTracker.onNotVisible.bind(() => { scanPrompt.style.display = 'flex'; });

// ── Game Board (sized to a business card: 85mm x 55mm → 0.85 x 0.55 units) ──
const CARD_W = 1.275;
const CARD_H = 0.825;

// Board faces the camera (default PlaneGeometry is in XY plane, facing +Z)
// No rotation needed — this makes it parallel to the card face
const boardGeo = new THREE.PlaneGeometry(CARD_W, CARD_H);
const boardMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
const board = new THREE.Mesh(boardGeo, boardMat);
trackerGroup.add(board);


// ── Player (red sphere) ───────────────────────────────────────────────────────
const PLAYER_R = 0.04;
const playerMesh = new THREE.Mesh(
  new THREE.SphereGeometry(PLAYER_R, 16, 16),
  new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0x880000 })
);
// Start at center, popped out in Z toward camera
playerMesh.position.set(0, 0, PLAYER_R);
trackerGroup.add(playerMesh);

let playerX = 0;
let playerY = 0;

// ── Coins (yellow spheres) ────────────────────────────────────────────────────
const COIN_R = 0.025;
const COIN_COUNT = 8;
const COLLECT_DIST = PLAYER_R + COIN_R;
let score = 0;
const scoreEl = document.getElementById('score-counter') as HTMLElement;

type Coin = { mesh: THREE.Mesh; x: number; y: number; collected: boolean };
const coins: Coin[] = [];

function spawnCoins() {
  const marginX = CARD_W / 2 - 0.08;
  const marginY = CARD_H / 2 - 0.06;
  for (let i = 0; i < COIN_COUNT; i++) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(COIN_R, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xFFD700, emissive: 0x886600 })
    );
    const x = (Math.random() * 2 - 1) * marginX;
    const y = (Math.random() * 2 - 1) * marginY;
    mesh.position.set(x, y, COIN_R);
    trackerGroup.add(mesh);
    coins.push({ mesh, x, y, collected: false });
  }
}

spawnCoins();

function checkCollisions() {
  for (const coin of coins) {
    if (coin.collected) continue;
    const dist = Math.hypot(playerX - coin.x, playerY - coin.y);
    if (dist < COLLECT_DIST) {
      coin.collected = true;
      trackerGroup.remove(coin.mesh);
      score++;
      scoreEl.textContent = String(score);
    }
  }
}

// ── Movement (X = left/right, Y = up/down on the vertical board) ─────────────
const STEP = 0.008;
let moveInterval: ReturnType<typeof setInterval> | null = null;

function startMoving(dx: number, dy: number) {
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

// ── Camera permission & animation loop ───────────────────────────────────────
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
