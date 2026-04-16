/**
 * PLAYER MODULE
 * 
 * Manages the player character (ball) including:
 * - Movement in 4 directions
 * - Collision detection with walls
 * - Win condition detection
 * - Visual animations
 */

import * as THREE from 'three';
import { isWalkable, gridToWorld, PLAYER_START, CELL_SIZE } from './maze';

export class Player {
  public mesh: THREE.Mesh;
  private gridX: number;
  private gridZ: number;
  private exitX: number;
  private exitZ: number;
  private moveSpeed = 0.3; // Animation speed
  private targetPosition: THREE.Vector3;
  private isAnimating = false;
  
  constructor(exitPosition: { x: number; z: number }) {
    // Store exit position
    this.exitX = exitPosition.x;
    this.exitZ = exitPosition.z;
    
    // Set starting position
    this.gridX = PLAYER_START.x;
    this.gridZ = PLAYER_START.z;
    
    // Create ball geometry (5cm diameter)
    const geometry = new THREE.SphereGeometry(CELL_SIZE * 0.4, 16, 16);
    
    // Ball material (bright red so it stands out)
    const material = new THREE.MeshStandardMaterial({
      color: 0xff3333,
      metalness: 0.4,
      roughness: 0.6,
      emissive: 0xff0000,
      emissiveIntensity: 0.2
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    
    // Set initial position
    const worldPos = gridToWorld(this.gridX, this.gridZ);
    this.mesh.position.set(worldPos.x, CELL_SIZE * 0.4, worldPos.z);
    
    this.targetPosition = this.mesh.position.clone();
  }
  
  /**
   * Check if player can move in a direction (collision detection)
   */
  canMove(direction: 'up' | 'down' | 'left' | 'right', walls: THREE.Mesh[]): boolean {
    // Don't allow movement while animating
    if (this.isAnimating) return false;
    
    // Calculate next grid position
    let nextX = this.gridX;
    let nextZ = this.gridZ;
    
    switch (direction) {
      case 'up':
        nextZ -= 1; // Move forward (negative Z in our coordinate system)
        break;
      case 'down':
        nextZ += 1; // Move backward
        break;
      case 'left':
        nextX -= 1; // Move left
        break;
      case 'right':
        nextX += 1; // Move right
        break;
    }
    
    // Check if next position is walkable
    return isWalkable(nextX, nextZ);
  }
  
  /**
   * Move player in a direction
   */
  move(direction: 'up' | 'down' | 'left' | 'right') {
    // Update grid position
    switch (direction) {
      case 'up':
        this.gridZ -= 1;
        break;
      case 'down':
        this.gridZ += 1;
        break;
      case 'left':
        this.gridX -= 1;
        break;
      case 'right':
        this.gridX += 1;
        break;
    }
    
    // Calculate world position
    const worldPos = gridToWorld(this.gridX, this.gridZ);
    
    // Set target for smooth animation
    this.targetPosition.set(worldPos.x, CELL_SIZE * 0.4, worldPos.z);
    this.isAnimating = true;
  }
  
  /**
   * Update player (called every frame)
   */
  update() {
    // Smooth movement animation
    if (this.isAnimating) {
      this.mesh.position.lerp(this.targetPosition, this.moveSpeed);
      
      // Check if reached target
      const distance = this.mesh.position.distanceTo(this.targetPosition);
      if (distance < 0.001) {
        this.mesh.position.copy(this.targetPosition);
        this.isAnimating = false;
      }
    }
    
    // Idle animation (gentle floating)
    if (!this.isAnimating) {
      const floatAmount = Math.sin(Date.now() * 0.002) * 0.005;
      this.mesh.position.y = CELL_SIZE * 0.4 + floatAmount;
    }
    
    // Rotation animation (always spinning)
    this.mesh.rotation.y += 0.02;
  }
  
  /**
   * Check if player has reached the exit
   */
  hasReachedExit(): boolean {
    return this.gridX === this.exitX && this.gridZ === this.exitZ;
  }
  
  /**
   * Reset player to start position
   */
  reset() {
    this.gridX = PLAYER_START.x;
    this.gridZ = PLAYER_START.z;
    
    const worldPos = gridToWorld(this.gridX, this.gridZ);
    this.mesh.position.set(worldPos.x, CELL_SIZE * 0.4, worldPos.z);
    this.targetPosition.copy(this.mesh.position);
    this.isAnimating = false;
  }
}
