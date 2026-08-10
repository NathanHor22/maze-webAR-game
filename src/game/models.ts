import * as THREE from 'three';

export interface RobotRig {
  readonly group: THREE.Group;
  update(timeSeconds: number, moving: boolean, invulnerable: boolean, celebrating: boolean): void;
}

export interface DroneRig {
  readonly group: THREE.Group;
  update(timeSeconds: number, intensity?: number): void;
}

export interface EnergyCellRig {
  readonly group: THREE.Group;
  update(timeSeconds: number, offset: number): void;
}

export interface PortalRig {
  readonly group: THREE.Group;
  readonly unlocked: boolean;
  setUnlocked(unlocked: boolean): void;
  update(timeSeconds: number): void;
}

export interface TrapRig {
  readonly group: THREE.Group;
  update(timeSeconds: number, active: boolean): void;
}

function standardMaterial(
  color: THREE.ColorRepresentation,
  emissive: THREE.ColorRepresentation = 0x000000,
  emissiveIntensity = 0,
  metalness = 0.35,
  roughness = 0.55,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity,
    metalness,
    roughness,
  });
}

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  castShadow = true,
): THREE.Mesh {
  const result = new THREE.Mesh(geometry, material);
  result.castShadow = castShadow;
  result.receiveShadow = true;
  return result;
}

export function createRobot(size: number, accentColor: number): RobotRig {
  const group = new THREE.Group();
  group.name = 'Synapze robot';
  const visual = new THREE.Group();
  group.add(visual);

  const shell = standardMaterial(0xdce9f0, 0x173647, 0.12, 0.7, 0.28);
  const dark = standardMaterial(0x162431, 0x071018, 0.08, 0.65, 0.35);
  const accent = standardMaterial(accentColor, accentColor, 1.2, 0.28, 0.3);

  const body = mesh(new THREE.BoxGeometry(size * 0.42, size * 0.34, size * 0.28), shell);
  body.position.y = size * 0.46;
  visual.add(body);

  const chest = mesh(new THREE.BoxGeometry(size * 0.24, size * 0.12, size * 0.025), accent);
  chest.position.set(0, size * 0.47, size * 0.153);
  visual.add(chest);

  const head = mesh(new THREE.BoxGeometry(size * 0.38, size * 0.28, size * 0.32), shell);
  head.position.y = size * 0.77;
  visual.add(head);

  const visor = mesh(new THREE.BoxGeometry(size * 0.29, size * 0.095, size * 0.026), accent, false);
  visor.position.set(0, size * 0.79, size * 0.173);
  visual.add(visor);

  const antennaStem = mesh(new THREE.CylinderGeometry(size * 0.018, size * 0.018, size * 0.16, 6), dark);
  antennaStem.position.set(size * 0.09, size * 0.98, 0);
  const antennaTip = mesh(new THREE.OctahedronGeometry(size * 0.048, 0), accent);
  antennaTip.position.set(size * 0.09, size * 1.08, 0);
  visual.add(antennaStem, antennaTip);

  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  leftArm.position.set(-size * 0.28, size * 0.61, 0);
  rightArm.position.set(size * 0.28, size * 0.61, 0);
  const leftArmMesh = mesh(new THREE.CapsuleGeometry(size * 0.065, size * 0.22, 2, 6), shell);
  const rightArmMesh = mesh(new THREE.CapsuleGeometry(size * 0.065, size * 0.22, 2, 6), shell);
  leftArmMesh.position.y = -size * 0.13;
  rightArmMesh.position.y = -size * 0.13;
  leftArm.add(leftArmMesh);
  rightArm.add(rightArmMesh);
  visual.add(leftArm, rightArm);

  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();
  leftLeg.position.set(-size * 0.115, size * 0.31, 0);
  rightLeg.position.set(size * 0.115, size * 0.31, 0);
  const leftShin = mesh(new THREE.BoxGeometry(size * 0.13, size * 0.26, size * 0.14), dark);
  const rightShin = mesh(new THREE.BoxGeometry(size * 0.13, size * 0.26, size * 0.14), dark);
  leftShin.position.y = -size * 0.13;
  rightShin.position.y = -size * 0.13;
  const leftFoot = mesh(new THREE.BoxGeometry(size * 0.16, size * 0.08, size * 0.23), shell);
  const rightFoot = mesh(new THREE.BoxGeometry(size * 0.16, size * 0.08, size * 0.23), shell);
  leftFoot.position.set(0, -size * 0.285, size * 0.035);
  rightFoot.position.set(0, -size * 0.285, size * 0.035);
  leftLeg.add(leftShin, leftFoot);
  rightLeg.add(rightShin, rightFoot);
  visual.add(leftLeg, rightLeg);

  return {
    group,
    update(timeSeconds, moving, invulnerable, celebrating) {
      const stride = moving ? Math.sin(timeSeconds * 13) * 0.52 : 0;
      leftArm.rotation.x = stride;
      rightArm.rotation.x = -stride;
      leftLeg.rotation.x = -stride * 0.68;
      rightLeg.rotation.x = stride * 0.68;
      visual.position.y = moving
        ? Math.abs(Math.sin(timeSeconds * 13)) * size * 0.035
        : Math.sin(timeSeconds * 2.8) * size * 0.018;
      visual.rotation.y = celebrating ? timeSeconds * 5.5 : 0;
      leftArm.rotation.z = celebrating ? -1.75 : 0;
      rightArm.rotation.z = celebrating ? 1.75 : 0;
      group.visible = !invulnerable || Math.floor(timeSeconds * 14) % 2 === 0;
      antennaTip.scale.setScalar(1 + Math.sin(timeSeconds * 5) * 0.14);
    },
  };
}

export function createDrone(size: number, accentColor: number): DroneRig {
  const group = new THREE.Group();
  group.name = 'Patrol drone';
  const visual = new THREE.Group();
  group.add(visual);
  const bodyMaterial = standardMaterial(0x273240, 0x121820, 0.2, 0.75, 0.24);
  const accent = standardMaterial(accentColor, accentColor, 1.5, 0.25, 0.25);

  const body = mesh(new THREE.OctahedronGeometry(size * 0.31, 1), bodyMaterial);
  body.scale.set(1.25, 0.55, 1);
  visual.add(body);

  const eye = mesh(new THREE.SphereGeometry(size * 0.095, 8, 6), accent, false);
  eye.position.set(0, 0, size * 0.29);
  eye.scale.y = 0.55;
  visual.add(eye);

  const rotorMaterial = standardMaterial(0x8998a6, 0x111111, 0.05, 0.8, 0.25);
  const rotors: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const arm = mesh(new THREE.BoxGeometry(size * 0.42, size * 0.035, size * 0.045), bodyMaterial);
    arm.position.x = side * size * 0.33;
    visual.add(arm);
    const rotor = new THREE.Group();
    rotor.position.x = side * size * 0.56;
    const bladeA = mesh(new THREE.BoxGeometry(size * 0.38, size * 0.018, size * 0.04), rotorMaterial, false);
    const bladeB = bladeA.clone();
    bladeB.rotation.y = Math.PI / 2;
    rotor.add(bladeA, bladeB);
    visual.add(rotor);
    rotors.push(rotor);
  }

  return {
    group,
    update(timeSeconds, intensity = 1) {
      visual.position.y = Math.sin(timeSeconds * 4.2 + group.id) * size * 0.045;
      body.rotation.y = Math.sin(timeSeconds * 1.7) * 0.14;
      eye.scale.setScalar(0.9 + Math.sin(timeSeconds * 8) * 0.1);
      for (const rotor of rotors) rotor.rotation.y = timeSeconds * 28 * intensity;
    },
  };
}

export function createEnergyCell(size: number, accentColor: number): EnergyCellRig {
  const group = new THREE.Group();
  group.name = 'Energy cell';
  const crystalMaterial = standardMaterial(accentColor, accentColor, 1.8, 0.15, 0.18);
  const ringMaterial = standardMaterial(0xeaffff, accentColor, 0.7, 0.65, 0.22);
  const crystal = mesh(new THREE.OctahedronGeometry(size * 0.25, 0), crystalMaterial, false);
  crystal.scale.y = 1.35;
  crystal.position.y = size * 0.42;
  const ring = mesh(new THREE.TorusGeometry(size * 0.34, size * 0.028, 5, 14), ringMaterial, false);
  ring.position.y = size * 0.4;
  ring.rotation.x = Math.PI / 2;
  group.add(crystal, ring);

  return {
    group,
    update(timeSeconds, offset) {
      const phase = timeSeconds * 3 + offset;
      crystal.rotation.y = phase;
      crystal.position.y = size * (0.42 + Math.sin(phase * 1.3) * 0.055);
      ring.rotation.z = phase * 0.7;
      ring.scale.setScalar(1 + Math.sin(phase * 1.7) * 0.08);
    },
  };
}

export function createPortal(size: number, accentColor: number): PortalRig {
  const group = new THREE.Group();
  group.name = 'Exit portal';
  const frameMaterial = standardMaterial(0x344251, 0x111822, 0.15, 0.78, 0.25);
  const ringMaterial = standardMaterial(0x6b172a, 0xff183f, 0.75, 0.4, 0.35);
  const coreMaterial = ringMaterial.clone();
  coreMaterial.transparent = true;
  coreMaterial.opacity = 0.3;

  const pedestal = mesh(new THREE.CylinderGeometry(size * 0.4, size * 0.48, size * 0.12, 12), frameMaterial);
  pedestal.position.y = size * 0.06;
  const outerRing = mesh(new THREE.TorusGeometry(size * 0.38, size * 0.075, 7, 20), frameMaterial);
  outerRing.position.y = size * 0.52;
  const innerRing = mesh(new THREE.TorusGeometry(size * 0.29, size * 0.028, 6, 20), ringMaterial, false);
  innerRing.position.y = size * 0.52;
  const core = mesh(new THREE.CircleGeometry(size * 0.25, 20), coreMaterial, false);
  core.position.set(0, size * 0.52, -size * 0.014);
  group.add(pedestal, outerRing, innerRing, core);

  let isUnlocked = false;
  return {
    group,
    get unlocked() {
      return isUnlocked;
    },
    setUnlocked(unlocked) {
      isUnlocked = unlocked;
      const color = unlocked ? accentColor : 0x6b172a;
      const emissive = unlocked ? accentColor : 0xff183f;
      ringMaterial.color.set(color);
      ringMaterial.emissive.set(emissive);
      ringMaterial.emissiveIntensity = unlocked ? 1.8 : 0.75;
      coreMaterial.color.set(color);
      coreMaterial.emissive.set(emissive);
      coreMaterial.emissiveIntensity = unlocked ? 1.8 : 0.75;
      coreMaterial.opacity = unlocked ? 0.46 : 0.3;
    },
    update(timeSeconds) {
      outerRing.rotation.z = Math.sin(timeSeconds * 0.9) * 0.08;
      innerRing.rotation.z = timeSeconds * (isUnlocked ? -2.8 : -0.35);
      const pulse = 1 + Math.sin(timeSeconds * (isUnlocked ? 6 : 2)) * (isUnlocked ? 0.08 : 0.025);
      core.scale.setScalar(pulse);
    },
  };
}

export function createSpikeTrap(size: number, accentColor: number): TrapRig {
  const group = new THREE.Group();
  group.name = 'Pulse spike trap';
  const baseMaterial = standardMaterial(0x351923, 0x16040a, 0.3, 0.7, 0.5);
  const spikeMaterial = standardMaterial(0x8d3348, accentColor, 0.8, 0.65, 0.3);
  const base = mesh(new THREE.CylinderGeometry(size * 0.34, size * 0.38, size * 0.08, 8), baseMaterial);
  base.position.y = size * 0.04;
  group.add(base);

  const spikes = new THREE.Group();
  for (let index = 0; index < 5; index += 1) {
    const angle = (index / 5) * Math.PI * 2;
    const spike = mesh(new THREE.ConeGeometry(size * 0.075, size * 0.42, 5), spikeMaterial);
    spike.position.set(Math.cos(angle) * size * 0.18, size * 0.23, Math.sin(angle) * size * 0.18);
    spikes.add(spike);
  }
  group.add(spikes);

  return {
    group,
    update(timeSeconds, active) {
      const target = active ? 1 : 0.08;
      spikes.scale.y += (target - spikes.scale.y) * 0.24;
      spikes.rotation.y = timeSeconds * (active ? 1.8 : 0.45);
      base.scale.setScalar(1 + (active ? Math.sin(timeSeconds * 10) * 0.05 : 0));
    },
  };
}

export function createCheckpoint(size: number, accentColor: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Checkpoint';
  const material = standardMaterial(accentColor, accentColor, 1.1, 0.25, 0.3);
  const pad = mesh(new THREE.CylinderGeometry(size * 0.34, size * 0.38, size * 0.055, 12), material, false);
  pad.position.y = size * 0.028;
  const beacon = mesh(new THREE.TorusGeometry(size * 0.25, size * 0.025, 5, 16), material, false);
  beacon.rotation.x = Math.PI / 2;
  beacon.position.y = size * 0.08;
  group.add(pad, beacon);
  return group;
}

export function disposeObject(root: THREE.Object3D): void {
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points)) return;
    geometries.add(object.geometry);
    const objectMaterial = object.material as THREE.Material | THREE.Material[];
    if (Array.isArray(objectMaterial)) {
      for (const material of objectMaterial) materials.add(material);
    } else {
      materials.add(objectMaterial);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}
