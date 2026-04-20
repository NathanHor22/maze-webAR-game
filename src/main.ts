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
const CARD_W = 0.85;
const CARD_H = 0.55;

const boardGeo = new THREE.PlaneGeometry(CARD_W, CARD_H);
const boardMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, transparent: true, opacity: 0.5 });
const board = new THREE.Mesh(boardGeo, boardMat);
board.rotation.x = -Math.PI / 2;
trackerGroup.add(board);

// Card border
const edgesGeo = new THREE.EdgesGeometry(boardGeo);
const edgesMat = new THREE.LineBasicMaterial({ color: 0x4ECDC4 });
const edges = new THREE.LineSegments(edgesGeo, edgesMat);
edges.rotation.x = -Math.PI / 2;
edges.position.y = 0.001;
trackerGroup.add(edges);

// ── Player (red sphere) ───────────────────────────────────────────────────────
const PLAYER_R = 0.04;
const playerMesh = new THREE.Mesh(
  new THREE.SphereGeometry(PLAYER_R, 16, 16),
  new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0x880000 })
);
playerMesh.position.set(0, PLAYER_R, 0);
trackerGroup.add(playerMesh);

let playerX = 0;
let playerZ = 0;

// ── Coins (yellow spheres) ────────────────────────────────────────────────────
const COIN_R = 0.025;
const COIN_COUNT = 8;
const COLLECT_DIST = PLAYER_R + COIN_R;
let score = 0;
const scoreEl = document.getElementById('score-counter') as HTMLElement;

type Coin = { mesh: THREE.Mesh; x: number; z: number; collected: boolean };
const coins: Coin[] = [];

function spawnCoins() {
  const marginX = CARD_W / 2 - 0.08;
  const marginZ = CARD_H / 2 - 0.06;
  for (let i = 0; i < COIN_COUNT; i++) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(COIN_R, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xFFD700, emissive: 0x886600 })
    );
    const x = (Math.random() * 2 - 1) * marginX;
    const z = (Math.random() * 2 - 1) * marginZ;
    mesh.position.set(x, COIN_R, z);
    trackerGroup.add(mesh);
    coins.push({ mesh, x, z, collected: false });
  }
}

spawnCoins();

function checkCollisions() {
  for (const coin of coins) {
    if (coin.collected) continue;
    const dist = Math.hypot(playerX - coin.x, playerZ - coin.z);
    if (dist < COLLECT_DIST) {
      coin.collected = true;
      trackerGroup.remove(coin.mesh);
      score++;
      scoreEl.textContent = String(score);
    }
  }
}

// ── Movement ──────────────────────────────────────────────────────────────────
const STEP = 0.008;
let moveInterval: ReturnType<typeof setInterval> | null = null;

function startMoving(dx: number, dz: number) {
  stopMoving();
  moveInterval = setInterval(() => {
    playerX = Math.max(-(CARD_W / 2 - PLAYER_R), Math.min(CARD_W / 2 - PLAYER_R, playerX + dx));
    playerZ = Math.max(-(CARD_H / 2 - PLAYER_R), Math.min(CARD_H / 2 - PLAYER_R, playerZ + dz));
    playerMesh.position.set(playerX, PLAYER_R, playerZ);
    checkCollisions();
  }, 16);
}

function stopMoving() {
  if (moveInterval !== null) { clearInterval(moveInterval); moveInterval = null; }
}

function bindButton(id: string, dx: number, dz: number) {
  const btn = document.getElementById(id)!;
  btn.addEventListener('pointerdown', () => startMoving(dx, dz));
  btn.addEventListener('pointerup', stopMoving);
  btn.addEventListener('pointercancel', stopMoving);
  btn.addEventListener('pointerleave', stopMoving);
}

bindButton('btn-up',    0,     -STEP);
bindButton('btn-down',  0,      STEP);
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
