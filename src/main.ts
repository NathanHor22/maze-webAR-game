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

// Nav button listeners (wired up, ready for game logic)
document.getElementById('btn-up')?.addEventListener('click', () => console.log('up'));
document.getElementById('btn-down')?.addEventListener('click', () => console.log('down'));
document.getElementById('btn-left')?.addEventListener('click', () => console.log('left'));
document.getElementById('btn-right')?.addEventListener('click', () => console.log('right'));
