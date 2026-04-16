/**
 * MAZE GENERATION MODULE
 * 
 * Creates a 5x5 maze with walls and defines the exit position.
 * Uses a simple grid layout where 1 = wall, 0 = path
 */

import * as THREE from 'three';

// ============================================================================
// MAZE CONFIGURATION
// ============================================================================

// Cell size in meters (10cm per cell)
const CELL_SIZE = 0.1;

// Maze layout: 1 = wall, 0 = path, 2 = exit
// This is a simple maze design - you can modify this!
const MAZE_LAYOUT = [
  [1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 1, 0, 1],
  [1, 0, 0, 0, 2], // 2 = exit position
  [1, 1, 1, 1, 1]
];

// Player start position
export const PLAYER_START = {
  x: 1,
  z: 1
};

// ============================================================================
// MAZE CREATION
// ============================================================================

export function createMaze() {
  const walls: THREE.Mesh[] = [];
  let exitPosition = { x: 0, z: 0 };
  
  // Wall geometry (10cm cube)
  const wallGeometry = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE * 1.5, CELL_SIZE);
  
  // Wall material (yellow-gold color, like classic maze)
  const wallMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xFFD700,
    metalness: 0.3,
    roughness: 0.7
  });
  
  // Exit marker material (green)
  const exitMaterial = new THREE.MeshStandardMaterial({
    color: 0x00FF00,
    metalness: 0.2,
    roughness: 0.8,
    emissive: 0x00FF00,
    emissiveIntensity: 0.3
  });
  
  // Generate maze from layout
  MAZE_LAYOUT.forEach((row, x) => {
    row.forEach((cell, z) => {
      // Calculate world position (centered on card)
      const worldX = (x - 2) * CELL_SIZE;
      const worldZ = (z - 2) * CELL_SIZE;
      
      if (cell === 1) {
        // Create wall
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(worldX, CELL_SIZE * 0.75, worldZ);
        
        // Store grid position for collision detection
        (wall as any).gridX = x;
        (wall as any).gridZ = z;
        
        walls.push(wall);
      } else if (cell === 2) {
        // Create exit marker (glowing green pad)
        const exitGeometry = new THREE.CylinderGeometry(CELL_SIZE * 0.4, CELL_SIZE * 0.4, 0.01, 16);
        const exit = new THREE.Mesh(exitGeometry, exitMaterial);
        exit.position.set(worldX, 0.005, worldZ);
        exit.rotation.x = 0; // Already horizontal
        
        walls.push(exit); // Add to scene (but won't block player)
        exitPosition = { x, z };
      }
    });
  });
  
  // Add a base plane (floor of the maze)
  const floorGeometry = new THREE.PlaneGeometry(CELL_SIZE * 5, CELL_SIZE * 5);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2; // Lay flat
  floor.position.y = 0;
  walls.push(floor);
  
  return { walls, exitPosition };
}

// ============================================================================
// COLLISION DETECTION HELPERS
// ============================================================================

/**
 * Check if a grid position is walkable (not a wall)
 */
export function isWalkable(gridX: number, gridZ: number): boolean {
  // Out of bounds = not walkable
  if (gridX < 0 || gridX >= MAZE_LAYOUT.length) return false;
  if (gridZ < 0 || gridZ >= MAZE_LAYOUT[0].length) return false;
  
  // Check if cell is not a wall (0 or 2 are walkable)
  return MAZE_LAYOUT[gridX][gridZ] !== 1;
}

/**
 * Convert grid coordinates to world position
 */
export function gridToWorld(gridX: number, gridZ: number) {
  return {
    x: (gridX - 2) * CELL_SIZE,
    z: (gridZ - 2) * CELL_SIZE
  };
}

/**
 * Get the maze layout (for external use)
 */
export function getMazeLayout() {
  return MAZE_LAYOUT;
}

export { CELL_SIZE };
