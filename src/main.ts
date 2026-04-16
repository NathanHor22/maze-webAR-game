/**
 * AR MAZE GAME - Main Entry Point
 * 
 * This file initializes the AR experience using ZapWorks Three.js SDK
 * and coordinates all game systems (maze, player, controls)
 */

import * as THREE from 'three';
import * as ZapparThree from '@zappar/zappar-threejs';
import { createMaze } from './maze';
import { Player } from './player';
import { initControls } from './controls';

// ============================================================================
// SCENE SETUP
// ============================================================================

// Get the canvas element
const canvas = document.getElementById('ar-canvas') as HTMLCanvasElement;

// Create Three.js renderer
const renderer = new THREE.WebGLRenderer({ 
  canvas,
  alpha: true, // Transparent background (see real world)
  antialias: true 
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Create Three.js scene
const scene = new THREE.Scene();

// ============================================================================
// ZAPWORKS AR CAMERA SETUP
// ============================================================================

// Create ZapWorks camera (uses phone camera)
const camera = new ZapparThree.Camera();

// Request camera permissions and start
ZapparThree.permissionRequestUI().then(() => {
  camera.start();
});

// ============================================================================
// IMAGE TRACKING SETUP
// ============================================================================

// Create image tracker
const imageTracker = new ZapparThree.ImageTrackerLoader().load(
  '/assets/targets/tracking-card.zpt' // We'll generate this next
);

// Create anchor for tracked image (everything attaches to this)
const trackerGroup = new ZapparThree.ImageAnchorGroup(camera, imageTracker);
scene.add(trackerGroup);

// ============================================================================
// LIGHTING
// ============================================================================

// Directional light (sun-like)
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 3, 2);
camera.add(directionalLight);

// Ambient light (general illumination)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
camera.add(ambientLight);

// Add camera to scene
scene.add(camera);

// ============================================================================
// GAME CONTENT SETUP
// ============================================================================

// Create the maze (returns wall meshes)
const { walls, exitPosition } = createMaze();

// Add maze walls to tracker group (so they appear on the card)
walls.forEach(wall => trackerGroup.add(wall));

// Create player (ball character)
const player = new Player(exitPosition);
trackerGroup.add(player.mesh);

// ============================================================================
// UI ELEMENTS
// ============================================================================

const statusText = document.getElementById('status-text') as HTMLElement;
const statusBadge = document.getElementById('tracking-status') as HTMLElement;
const moveCounter = document.getElementById('move-counter') as HTMLElement;
const winMessage = document.getElementById('win-message') as HTMLElement;
const finalMoves = document.getElementById('final-moves') as HTMLElement;
const restartBtn = document.getElementById('restart-btn') as HTMLElement;

// Move counter state
let moveCount = 0;

function incrementMoves() {
  moveCount++;
  moveCounter.textContent = moveCount.toString();
}

// ============================================================================
// TRACKING STATUS EVENTS
// ============================================================================

imageTracker.onVisible.bind(() => {
  statusText.textContent = 'Tracking Active';
  statusBadge.classList.add('tracking');
});

imageTracker.onNotVisible.bind(() => {
  statusText.textContent = 'Point camera at tracking card';
  statusBadge.classList.remove('tracking');
});

// ============================================================================
// CONTROLS SETUP
// ============================================================================

// Initialize button controls
// This sets up event listeners for the 4 directional buttons
initControls((direction: 'up' | 'down' | 'left' | 'right') => {
  // Check if player can move in that direction (collision detection)
  if (player.canMove(direction, walls)) {
    player.move(direction);
    incrementMoves();
    
    // Check if player reached the exit
    if (player.hasReachedExit()) {
      showWinMessage();
    }
  }
});

// ============================================================================
// WIN STATE
// ============================================================================

function showWinMessage() {
  finalMoves.textContent = moveCount.toString();
  winMessage.style.display = 'flex';
}

function resetGame() {
  player.reset();
  moveCount = 0;
  moveCounter.textContent = '0';
  winMessage.style.display = 'none';
}

restartBtn.addEventListener('click', resetGame);

// ============================================================================
// ANIMATION LOOP
// ============================================================================

function animate() {
  requestAnimationFrame(animate);
  
  // Update player animation (idle floating)
  player.update();
  
  // Update ZapWorks camera
  camera.updateFrame(renderer);
  
  // Render the scene
  renderer.render(scene, camera);
}

// Start the animation loop
animate();

// ============================================================================
// RESPONSIVE HANDLING
// ============================================================================

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================================
// LOG STATUS
// ============================================================================

console.log('🎮 AR Maze Game Initialized!');
console.log('📱 Point camera at tracking card to begin');
