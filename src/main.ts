import * as THREE from 'three';
import * as ZapparThree from '@zappar/zappar-threejs';

const canvas = document.getElementById('ar-canvas') as HTMLCanvasElement;

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: false,
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

ZapparThree.glContextSet(renderer.getContext());

const scene = new THREE.Scene();
const camera = new ZapparThree.Camera();
scene.background = camera.backgroundTexture;
scene.add(camera);

ZapparThree.permissionRequestUI().then(granted => {
  if (granted) {
    camera.start();
  } else {
    ZapparThree.permissionDeniedUI();
  }
});

function animate() {
  requestAnimationFrame(animate);
  camera.updateFrame(renderer);
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Player movement
const player = document.getElementById('player') as HTMLElement;
const STEP = 8;
const INTERVAL_MS = 16; // ~60fps
let px = window.innerWidth / 2;
let py = window.innerHeight / 2;
let moveInterval: ReturnType<typeof setInterval> | null = null;

player.style.left = px + 'px';
player.style.top = py + 'px';

function startMoving(dx: number, dy: number) {
  stopMoving();
  moveInterval = setInterval(() => {
    px = Math.max(25, Math.min(window.innerWidth - 25, px + dx));
    py = Math.max(25, Math.min(window.innerHeight - 25, py + dy));
    player.style.left = px + 'px';
    player.style.top = py + 'px';
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
