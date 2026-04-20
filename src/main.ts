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
const step = 30;
let px = window.innerWidth / 2;
let py = window.innerHeight / 2;

function movePlayer(dx: number, dy: number) {
  px = Math.max(25, Math.min(window.innerWidth - 25, px + dx));
  py = Math.max(25, Math.min(window.innerHeight - 25, py + dy));
  player.style.left = px + 'px';
  player.style.top = py + 'px';
}

// Set initial position
player.style.left = px + 'px';
player.style.top = py + 'px';

document.getElementById('btn-up')?.addEventListener('click', () => movePlayer(0, -step));
document.getElementById('btn-down')?.addEventListener('click', () => movePlayer(0, step));
document.getElementById('btn-left')?.addEventListener('click', () => movePlayer(-step, 0));
document.getElementById('btn-right')?.addEventListener('click', () => movePlayer(step, 0));
