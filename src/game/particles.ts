import * as THREE from 'three';

/** Fixed-size, allocation-free particle burst system for mobile AR. */
export class ParticleSystem {
  public readonly points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;

  private readonly capacity: number;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly velocities: Float32Array;
  private readonly lives: Float32Array;
  private readonly maximumLives: Float32Array;
  private cursor = 0;
  private readonly color = new THREE.Color();

  public constructor(capacity = 96, size = 0.012) {
    this.capacity = capacity;
    this.positions = new Float32Array(capacity * 3);
    this.colors = new Float32Array(capacity * 3);
    this.velocities = new Float32Array(capacity * 3);
    this.lives = new Float32Array(capacity);
    this.maximumLives = new Float32Array(capacity);

    for (let index = 0; index < capacity; index += 1) {
      this.positions[index * 3 + 1] = -100;
    }

    const geometry = new THREE.BufferGeometry();
    const positionAttribute = new THREE.BufferAttribute(this.positions, 3);
    const colorAttribute = new THREE.BufferAttribute(this.colors, 3);
    positionAttribute.setUsage(THREE.DynamicDrawUsage);
    colorAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', positionAttribute);
    geometry.setAttribute('color', colorAttribute);

    const material = new THREE.PointsMaterial({
      size,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 8;
  }

  public emit(
    position: THREE.Vector3,
    color: THREE.ColorRepresentation,
    count = 12,
    speed = 0.2,
    lifetime = 0.7,
  ): void {
    this.color.set(color);
    for (let emitted = 0; emitted < count; emitted += 1) {
      const index = this.cursor;
      const offset = index * 3;
      const angle = Math.random() * Math.PI * 2;
      const vertical = 0.3 + Math.random() * 0.7;
      const radial = speed * (0.35 + Math.random() * 0.65);

      this.positions[offset] = position.x;
      this.positions[offset + 1] = position.y;
      this.positions[offset + 2] = position.z;
      this.velocities[offset] = Math.cos(angle) * radial;
      this.velocities[offset + 1] = vertical * speed;
      this.velocities[offset + 2] = Math.sin(angle) * radial;
      this.colors[offset] = this.color.r;
      this.colors[offset + 1] = this.color.g;
      this.colors[offset + 2] = this.color.b;
      const actualLifetime = lifetime * (0.65 + Math.random() * 0.5);
      this.lives[index] = actualLifetime;
      this.maximumLives[index] = actualLifetime;
      this.cursor = (this.cursor + 1) % this.capacity;
    }
    this.markAttributesDirty();
  }

  public update(deltaSeconds: number): void {
    let changed = false;
    for (let index = 0; index < this.capacity; index += 1) {
      if (this.lives[index] <= 0) continue;
      changed = true;
      const offset = index * 3;
      this.lives[index] -= deltaSeconds;
      if (this.lives[index] <= 0) {
        this.positions[offset + 1] = -100;
        continue;
      }
      this.velocities[offset + 1] -= deltaSeconds * 0.28;
      this.positions[offset] += this.velocities[offset] * deltaSeconds;
      this.positions[offset + 1] += this.velocities[offset + 1] * deltaSeconds;
      this.positions[offset + 2] += this.velocities[offset + 2] * deltaSeconds;

      const lifeRatio = this.lives[index] / this.maximumLives[index];
      this.colors[offset] *= 0.96 + lifeRatio * 0.04;
      this.colors[offset + 1] *= 0.96 + lifeRatio * 0.04;
      this.colors[offset + 2] *= 0.96 + lifeRatio * 0.04;
    }
    if (changed) this.markAttributesDirty();
  }

  public clear(): void {
    this.lives.fill(0);
    for (let index = 0; index < this.capacity; index += 1) {
      this.positions[index * 3 + 1] = -100;
    }
    this.markAttributesDirty();
  }

  public dispose(): void {
    this.points.geometry.dispose();
    this.points.material.dispose();
  }

  private markAttributesDirty(): void {
    const position = this.points.geometry.getAttribute('position');
    const color = this.points.geometry.getAttribute('color');
    position.needsUpdate = true;
    color.needsUpdate = true;
  }
}
