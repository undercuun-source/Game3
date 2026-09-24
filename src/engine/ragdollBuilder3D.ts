import * as THREE from 'three';
import {
  BodyPartName,
  Constraint3D,
  LimbVoxelBlock,
  LiquidBody3D,
  LiquidParticle3D,
  Particle3D,
  Ragdoll3D,
} from '../types/physics3d';
import { setupAnimeFace, updateAnimeFace } from './animeFaceRenderer';
import { setupVoxel3DFace } from './voxelFaceRenderer';
import { paintCanvasBulletWoundOnMesh } from './bulletHoleShader';

// Materials
export const skinColor = 0xefb08c; // Flesh-peach color (color pechos)
export const shirtColor = 0x38bdf8; // Celeste shirt
export const pantsColor = 0x1e3a8a; // Dark blue pants
export const shoesColor = 0x334155; // Shoes color

export const globalSkinMat = new THREE.MeshStandardMaterial({
  color: skinColor,
  roughness: 0.12,
  metalness: 0.15,
});

export const globalShirtMat = new THREE.MeshStandardMaterial({
  color: shirtColor,
  roughness: 0.1,
  metalness: 0.15,
});

export const globalPantsMat = new THREE.MeshStandardMaterial({
  color: pantsColor,
  roughness: 0.1,
  metalness: 0.15,
});

export const globalBoneMat = new THREE.MeshStandardMaterial({
  color: 0xf8fafc, // Ivory white bone
  roughness: 0.15,
  metalness: 0.2,
});

export const globalSoldierMat = new THREE.MeshStandardMaterial({
  color: 0x4d5c3e, // Military Olive
  roughness: 0.1,
  metalness: 0.15,
});

export const globalDummyMat = new THREE.MeshStandardMaterial({
  color: 0xf97316, // Naranja
  roughness: 0.1,
  metalness: 0.18,
});

export const globalSoldierPantsMat = new THREE.MeshStandardMaterial({
  color: 0x2e3a24,
  roughness: 0.12,
  metalness: 0.15,
});

// Facial features materials
const eyeHighlightMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.1,
});

/**
 * Math helper: Calculate squared distance from point p to line segment v-w
 */
export function distToSegmentSq(p: THREE.Vector3, v: THREE.Vector3, w: THREE.Vector3): number {
  const l2 = v.distanceToSquared(w);
  if (l2 === 0) return p.distanceToSquared(v);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y) + (p.z - v.z) * (w.z - v.z)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = v.x + t * (w.x - v.x);
  const projY = v.y + t * (w.y - v.y);
  const projZ = v.z + t * (w.z - v.z);
  return (p.x - projX) ** 2 + (p.y - projY) ** 2 + (p.z - projZ) ** 2;
}

export function distToSegment(p: THREE.Vector3, v: THREE.Vector3, w: THREE.Vector3): number {
  return Math.sqrt(distToSegmentSq(p, v, w));
}

/**
 * Creates a clean cubic Revolver for character to hold or pick up on floor
 */
export function createVoxelRevolverModel(scale: number = 1.0): THREE.Group {
  const group = new THREE.Group();
  group.name = 'CubicRevolver';

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.25,
    metalness: 0.85,
  });

  const gunmetalMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.4,
    metalness: 0.7,
  });

  const woodGripMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.65,
    metalness: 0.1,
  });

  const blackMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.5,
    metalness: 0.6,
  });

  const u = 0.04 * scale;

  const addBox = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material
  ) => {
    const geom = new THREE.BoxGeometry(w * u, h * u, d * u);
    const m = new THREE.Mesh(geom, mat);
    m.position.set(x * u, y * u, z * u);
    m.castShadow = false;
    m.receiveShadow = false;
    group.add(m);
    return m;
  };

  // 1. Revolver Cylinder / Drum (Central revolving chamber)
  addBox(1.8, 1.8, 2.4, 0, 0.2, 0, gunmetalMat);

  // 2. Main Frame & Receiver around the drum
  addBox(1.4, 2.2, 3.2, 0, 0.2, -0.2, chromeMat);

  // 3. Long Classic Revolver Barrel
  addBox(1.1, 1.1, 5.5, 0, 0.6, 3.8, chromeMat);
  // Front Sight Tip on Top of Barrel
  addBox(0.4, 0.6, 0.8, 0, 1.3, 6.0, blackMat);
  // Under-barrel rod
  addBox(0.8, 0.6, 4.0, 0, -0.1, 3.2, gunmetalMat);

  // 4. Ergonomic Curved Wood Grip
  addBox(1.3, 3.2, 1.8, 0, -1.8, -1.8, woodGripMat);
  addBox(1.2, 1.5, 1.4, 0, -3.2, -2.4, woodGripMat);

  // 5. Trigger Guard & Trigger
  addBox(0.5, 1.0, 1.4, 0, -0.8, 0.4, gunmetalMat);
  addBox(0.4, 0.6, 0.4, 0, -0.6, 0.4, blackMat);

  // 6. Hammer at back
  addBox(0.5, 0.8, 0.6, 0, 1.2, -1.8, gunmetalMat);

  return group;
}

/**
 * Creates a clean cubic Rifle for character to hold
 */
export function createVoxelRifleModel(scale: number = 1.0): THREE.Group {
  const group = new THREE.Group();
  group.name = 'CubicRifle';

  const blackMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.4,
    metalness: 0.7,
  });

  const gunmetalMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.3,
    metalness: 0.8,
  });

  const woodStockMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.7,
    metalness: 0.1,
  });

  const u = 0.035 * scale;

  const addBox = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material
  ) => {
    const geom = new THREE.BoxGeometry(w * u, h * u, d * u);
    const m = new THREE.Mesh(geom, mat);
    m.position.set(x * u, y * u, z * u);
    m.castShadow = false;
    m.receiveShadow = false;
    group.add(m);
    return m;
  };

  // Body / Receiver
  addBox(1.8, 2.2, 7.0, 0, 0, 0, blackMat);
  // Barrel
  addBox(0.9, 0.9, 8.0, 0, 0.4, 7.5, gunmetalMat);
  // Muzzle Tip
  addBox(1.2, 1.2, 1.5, 0, 0.4, 12.2, gunmetalMat);
  // Magazine
  addBox(1.2, 4.0, 2.2, 0, -2.5, 1.0, blackMat);
  // Stock
  addBox(1.3, 3.2, 1.6, 0, -2.2, -2.5, woodStockMat);
  addBox(1.4, 2.8, 4.5, 0, -0.6, -5.5, woodStockMat);

  return group;
}

/**
 * Creates a giant block hammer with pseudo-3D block depth and details on each of its blocks
 * ("un martillo grande de bloques con pseudos de bloque en sus bloques")
 */
export function createVoxelHammerModel(scale: number = 1.0): THREE.Group {
  const group = new THREE.Group();
  group.name = 'VoxelBlockHammer';

  const heavyIronMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.45,
    metalness: 0.82,
  });

  const hardSteelMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.35,
    metalness: 0.88,
  });

  const polishedSteelMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.25,
    metalness: 0.92,
  });

  const goldAccentMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.35,
    metalness: 0.85,
  });

  const darkWoodMat = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    roughness: 0.75,
    metalness: 0.05,
  });

  const leatherGripMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.85,
    metalness: 0.02,
  });

  const u = 0.045 * scale;

  // Helper to add a composite voxel block with integrated pseudo-3D block layers ("con pseudos de bloque en sus bloques")
  const addBlockWithPseudo = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mainMat: THREE.Material,
    accentMat?: THREE.Material,
    pseudoSubdivisions: boolean = true
  ) => {
    const blockGroup = new THREE.Group();
    blockGroup.position.set(x * u, y * u, z * u);

    // 1. Core solid block mesh
    const coreGeom = new THREE.BoxGeometry(w * u, h * u, d * u);
    const coreMesh = new THREE.Mesh(coreGeom, mainMat);
    blockGroup.add(coreMesh);

    // 2. Pseudo-3D contour/bevel envelope on this block
    const pseudoGeom = new THREE.BoxGeometry(w * u * 1.035, h * u * 1.035, d * u * 1.035);
    const pseudoWireMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const pseudoMesh = new THREE.Mesh(pseudoGeom, pseudoWireMat);
    blockGroup.add(pseudoMesh);

    // 3. Pseudo-block facets (pseudo-3D sub-blocks within the block faces)
    if (pseudoSubdivisions && w >= 2.5 && h >= 2.5) {
      const subMat = accentMat || mainMat;
      const subD = 0.35;
      const subGeomF = new THREE.BoxGeometry((w - 0.8) * u, (h - 0.8) * u, subD * u);
      const subMeshF = new THREE.Mesh(subGeomF, subMat);
      subMeshF.position.z = (d * 0.5 + subD * 0.4) * u;
      blockGroup.add(subMeshF);

      const subMeshB = new THREE.Mesh(subGeomF, subMat);
      subMeshB.position.z = -(d * 0.5 + subD * 0.4) * u;
      blockGroup.add(subMeshB);
    }

    group.add(blockGroup);
    return blockGroup;
  };

  // --- HANDLE / SHAFT ("el palo de martillo") ---
  // Extends from y = -13.5*u up to y = +11*u (~ 1.15m total height)
  // 1. Heavy Base Pommel Block
  addBlockWithPseudo(2.6, 2.2, 2.6, 0, -13.5, 0, heavyIronMat, goldAccentMat, false);
  addBlockWithPseudo(1.8, 1.2, 1.8, 0, -15.0, 0, goldAccentMat, undefined, false);

  // 2. Lower Handle Segment (Left hand grip zone)
  addBlockWithPseudo(2.0, 5.5, 2.0, 0, -10.0, 0, leatherGripMat, darkWoodMat, true);
  // Grip wrapping bands
  addBlockWithPseudo(2.2, 0.6, 2.2, 0, -12.2, 0, heavyIronMat, undefined, false);
  addBlockWithPseudo(2.2, 0.6, 2.2, 0, -7.5, 0, heavyIronMat, undefined, false);

  // 3. Middle Shaft Segment
  addBlockWithPseudo(1.9, 5.0, 1.9, 0, -5.0, 0, darkWoodMat, leatherGripMat, true);

  // 4. Upper Handle Segment (Right hand grip zone)
  addBlockWithPseudo(2.0, 5.5, 2.0, 0, 0.0, 0, leatherGripMat, darkWoodMat, true);
  // Grip ring bands
  addBlockWithPseudo(2.2, 0.6, 2.2, 0, 2.5, 0, heavyIronMat, undefined, false);
  addBlockWithPseudo(2.2, 0.6, 2.2, 0, -2.5, 0, heavyIronMat, undefined, false);

  // 5. Upper Shaft Neck Extension
  addBlockWithPseudo(2.1, 5.0, 2.1, 0, 5.0, 0, darkWoodMat, undefined, true);
  addBlockWithPseudo(2.3, 3.5, 2.3, 0, 9.0, 0, heavyIronMat, goldAccentMat, true);

  // 6. Flanged Collar Ring Block (under head)
  addBlockWithPseudo(3.6, 1.8, 3.6, 0, 11.2, 0, goldAccentMat, heavyIronMat, true);

  // --- GIANT HAMMER HEAD (Bloques masivos con pseudos de bloque) ---
  // Located around y = +17*u
  // 1. Central Core Block
  addBlockWithPseudo(7.0, 7.0, 7.0, 0, 17.0, 0, heavyIronMat, goldAccentMat, true);

  // 2. Front Strike Block (Facing +Z)
  addBlockWithPseudo(7.6, 7.6, 5.0, 0, 17.0, 5.8, hardSteelMat, heavyIronMat, true);
  // Front Impact Face Striking Plate (Heavy hardened steel anvil face)
  addBlockWithPseudo(8.0, 8.0, 1.8, 0, 17.0, 8.8, polishedSteelMat, hardSteelMat, true);

  // 3. Rear Counterweight & Spike Block (Facing -Z)
  addBlockWithPseudo(7.2, 7.2, 4.5, 0, 17.0, -5.5, hardSteelMat, heavyIronMat, true);
  // Rear Pyramid/Wedge Peen Block
  addBlockWithPseudo(5.4, 5.4, 3.2, 0, 17.0, -9.0, heavyIronMat, hardSteelMat, true);
  addBlockWithPseudo(3.2, 3.2, 2.0, 0, 17.0, -11.4, heavyIronMat, goldAccentMat, false);

  // 4. Top Crown Reinforcement Block
  addBlockWithPseudo(5.0, 2.0, 12.0, 0, 21.2, 0, hardSteelMat, goldAccentMat, true);
  // Top center spike / finial block
  addBlockWithPseudo(2.2, 2.5, 2.2, 0, 23.2, 0, goldAccentMat, undefined, false);

  // 5. Bottom Anchor Brackets
  addBlockWithPseudo(5.0, 1.8, 12.0, 0, 12.8, 0, hardSteelMat, goldAccentMat, true);

  // 6. Lateral Reinforced Flange Plates (Left & Right)
  addBlockWithPseudo(1.5, 5.5, 9.0, -4.0, 17.0, 0, hardSteelMat, heavyIronMat, true);
  addBlockWithPseudo(1.5, 5.5, 9.0, 4.0, 17.0, 0, hardSteelMat, heavyIronMat, true);

  // 7. Gold Rivet Studs on Head Sides
  const addRivet = (rx: number, ry: number, rz: number) => {
    const rivetGeom = new THREE.BoxGeometry(0.5 * u, 0.8 * u, 0.8 * u);
    const rivetMesh = new THREE.Mesh(rivetGeom, goldAccentMat);
    rivetMesh.position.set(rx * u, ry * u, rz * u);
    group.add(rivetMesh);
  };
  addRivet(-4.9, 18.5, 2.5);
  addRivet(-4.9, 15.5, 2.5);
  addRivet(-4.9, 18.5, -2.5);
  addRivet(-4.9, 15.5, -2.5);
  addRivet(4.9, 18.5, 2.5);
  addRivet(4.9, 15.5, 2.5);
  addRivet(4.9, 18.5, -2.5);
  addRivet(4.9, 15.5, -2.5);

  return group;
}

/**
 * Creates a floating giant hammer pickup with golden halo for spawning on the ground
 */
export function createHammerPickupGroup(): THREE.Group {
  const pickupGroup = new THREE.Group();
  pickupGroup.name = 'HammerPickupItem';

  // Floating Cubic Hammer on Floor
  const hammer = createVoxelHammerModel(1.15);
  hammer.rotation.z = Math.PI / 4;
  hammer.rotation.y = Math.PI / 3;
  hammer.position.y = 0.35;
  pickupGroup.add(hammer);

  // Floating glowing golden ring / beacon
  const ringGeom = new THREE.TorusGeometry(0.55, 0.035, 8, 24);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.85,
  });
  const ringMesh = new THREE.Mesh(ringGeom, ringMat);
  ringMesh.rotation.x = Math.PI / 2;
  ringMesh.position.y = 0.05;
  pickupGroup.add(ringMesh);

  const light = new THREE.PointLight(0xf59e0b, 1.4, 4.5);
  light.position.set(0, 0.4, 0);
  pickupGroup.add(light);

  return pickupGroup;
}

/**
 * Attaches hammer model directly to a character ragdoll in two-handed grip
 */
export function attachHammerToRagdoll(ragdoll: Ragdoll3D): THREE.Group {
  if (ragdoll.weaponMesh) {
    ragdoll.groupMesh.remove(ragdoll.weaponMesh);
  }

  const hammer = createVoxelHammerModel(1.0);
  ragdoll.weaponMesh = hammer;
  ragdoll.hasWeapon = true;
  (ragdoll as any).activeWeapon = 'hammer';
  ragdoll.groupMesh.add(hammer);
  return hammer;
}

/**
 * Creates a floating weapon pickup with gold halo for spawning on the ground (Revolver)
 */
export function createWeaponPickupGroup(): THREE.Group {
  const pickupGroup = new THREE.Group();
  pickupGroup.name = 'WeaponPickupItem';

  // Floating Cubic Revolver on Floor
  const revolver = createVoxelRevolverModel(1.25);
  revolver.rotation.y = Math.PI / 4;
  revolver.position.y = 0.25;
  pickupGroup.add(revolver);

  // Floating glowing golden ring / beacon
  const ringGeom = new THREE.TorusGeometry(0.45, 0.03, 8, 24);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.8,
  });
  const ringMesh = new THREE.Mesh(ringGeom, ringMat);
  ringMesh.rotation.x = Math.PI / 2;
  ringMesh.position.y = 0.05;
  pickupGroup.add(ringMesh);

  const light = new THREE.PointLight(0xf59e0b, 1.2, 4);
  light.position.set(0, 0.3, 0);
  pickupGroup.add(light);

  return pickupGroup;
}

/**
 * Attaches weapon model (defaults to Revolver) directly to a character ragdoll
 */
export function attachWeaponToRagdoll(ragdoll: Ragdoll3D, customWeapon?: THREE.Group): THREE.Group {
  if (ragdoll.weaponMesh) {
    ragdoll.groupMesh.remove(ragdoll.weaponMesh);
  }

  const weapon = customWeapon || createVoxelRevolverModel(1.0);
  ragdoll.weaponMesh = weapon;
  ragdoll.hasWeapon = true;
  (ragdoll as any).activeWeapon = 'revolver';
  ragdoll.groupMesh.add(weapon);
  return weapon;
}

/**
 * Detaches weapon from character
 */
export function detachWeaponFromRagdoll(ragdoll: Ragdoll3D) {
  if (ragdoll.weaponMesh) {
    ragdoll.groupMesh.remove(ragdoll.weaponMesh);
    ragdoll.weaponMesh = undefined;
  }
  ragdoll.hasWeapon = false;
  (ragdoll as any).activeWeapon = 'none';
  ragdoll.isAiming = false;
}

/**
 * Creates the Pseudo-3D Spherical Contour Envelope Layer covering the outer body blocks.
 * It uses a smooth 3D morphable surface that matches the exact color of each limb with no black lines,
 * and looks spherical from all 3D viewpoints. It dynamically adjusts from 0 (box envelope)
 * to 100 (smooth spherical / ellipsoid bubble envelope).
 */
export function createPseudo3DContourMesh(
  name: BodyPartName,
  w: number,
  h: number,
  d: number,
  initialLevel: number = 0,
  baseColor: number = 0x38bdf8
): THREE.Mesh {
  // Proportional envelope scale margin for small parts like nipples and genitals
  const isSmallPart = w < 0.1 || h < 0.1 || d < 0.1;
  const isToe = name ? name.startsWith('dedo_pie_') : false;
  const isDigit = name ? (name.startsWith('dedo_') || name.startsWith('mano_') || name.startsWith('pie_')) : false;
  const skinMargin = (isDigit || isToe) ? Math.min(0.004, w * 0.1) : (isSmallPart ? Math.min(0.02, Math.max(0.005, w * 0.15)) : 0.10);
  const envW = (isToe || isDigit) ? w * 1.05 + skinMargin : w * 1.35 + skinMargin;
  const envH = (isToe || isDigit) ? h * 1.05 + skinMargin : h * 1.35 + skinMargin;
  const envD = (isToe || isDigit) ? d * 1.05 + skinMargin : d * 1.35 + skinMargin;

  const segX = 16;
  const segY = 16;
  const segZ = 16;

  const geom = new THREE.BoxGeometry(envW, envH, envD, segX, segY, segZ);

  const posAttr = geom.attributes.position;
  const count = posAttr.count;
  const base3DPositions = new Float32Array(count * 3);

  // Copy initial box positions
  for (let i = 0; i < count; i++) {
    base3DPositions[i * 3] = posAttr.getX(i);
    base3DPositions[i * 3 + 1] = posAttr.getY(i);
    base3DPositions[i * 3 + 2] = posAttr.getZ(i);
  }

  // Initialize vertex colors matching base color converted to linear color space
  const colors = new Float32Array(count * 3);
  const baseColorObj = new THREE.Color(baseColor).convertSRGBToLinear();
  for (let i = 0; i < count; i++) {
    colors[i * 3] = baseColorObj.r;
    colors[i * 3 + 1] = baseColorObj.g;
    colors[i * 3 + 2] = baseColorObj.b;
  }
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // Target sphere radii sufficiently large to cover inner blocks
  const rx = envW / 2;
  const ry = envH / 2;
  const rz = envD / 2;

  // Fully solid opaque material with polygonOffset so skin renders cleanly on top of voxels
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff, // Multiplied by vertex colors
    vertexColors: true,
    roughness: 0.50,
    metalness: 0.05,
    transparent: false,
    side: THREE.FrontSide,
    depthWrite: true,
    polygonOffset: true,
    polygonOffsetFactor: -1.0,
    polygonOffsetUnits: -1.0,
  });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.name = 'Pseudo3DSphericalEnvelope';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.renderOrder = 5;

  mesh.userData = {
    isPseudo3DSpherical: true,
    base3DPositions,
    rx,
    ry,
    rz,
    baseColor,
    w,
    h,
    d,
    partName: name,
  };

  applySphericalMorph(mesh, initialLevel);
  return mesh;
}

/**
 * Creates Metaball 3 Parallel Cubic Polygon stack for an extremity/limb.
 * Slices are arranged in parallel along the limb axis with overlapping heights to completely cover the limb in height,
 * with open top and bottom apertures matching adjacent joints, morphing into a large smooth spherical profile.
 */
export function createMetaball3LimbMesh(
  name: BodyPartName,
  w: number,
  h: number,
  d: number,
  baseColor: number,
  initialLevel: number = 85
): THREE.Group {
  const group = new THREE.Group();
  group.name = `Metaball3Group_${name}`;

  // Number of parallel cubic polygon rings along the extremity height
  const numSlices = name.startsWith('dedo_') ? 3 : 6;
  const radialSegs = 12;
  const baseColorObj = new THREE.Color(baseColor);

  // We construct a SINGLE connected cylinder geometry for the entire limb.
  // This physically connects all the parallel slices so that there are no gaps or cracks,
  // making them look flat or widened but continuously joined.
  const geom = new THREE.CylinderGeometry(
    1.0, // radiusTop (scaled in morph)
    1.0, // radiusBottom (scaled in morph)
    h,   // height of the entire extremity
    radialSegs,
    numSlices, // height segments (splits the cylinder into numSlices connected segments)
    false // openEnded = false (closed top and bottom caps for a solid volume)
  );

  // Save base positions for vertex-based morphing
  const posAttr = geom.attributes.position;
  const count = posAttr.count;
  const basePositions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    basePositions[i * 3] = posAttr.getX(i);
    basePositions[i * 3 + 1] = posAttr.getY(i);
    basePositions[i * 3 + 2] = posAttr.getZ(i);
  }

  const mat = new THREE.MeshStandardMaterial({
    color: baseColorObj,
    roughness: 0.38,
    metalness: 0.12,
    side: THREE.FrontSide,
    depthWrite: true,
    polygonOffset: true,
    polygonOffsetFactor: -1.0,
    polygonOffsetUnits: -1.0,
  });

  const singleMesh = new THREE.Mesh(geom, mat);
  singleMesh.position.set(0, 0, 0); // Perfectly centered on the limb carrier
  singleMesh.castShadow = true;
  singleMesh.receiveShadow = true;
  singleMesh.renderOrder = 8;

  singleMesh.userData = {
    basePositions,
    sliceIndex: 0,
    numSlices,
    normalizedY: 0,
    w,
    h,
    d,
    sliceH: h,
    baseColor,
    partName: name,
  };

  group.add(singleMesh);

  group.userData = {
    w,
    h,
    d,
    numSlices,
    baseColor,
    partName: name,
  };

  applyMetaball3Morph(group, initialLevel);
  return group;
}

/**
 * Morphs the parallel cubic polygons of Metaball 3:
 * Level 0 = pure parallel cubic prisms with open apertures
 * Level 100 = polygons adapt into a smooth, generous spherical profile along the extremity with bulging middle and seamless connected top/bottom aperture ports
 */
export function applyMetaball3Morph(group: THREE.Group, level: number) {
  const t = Math.max(0, Math.min(100, level)) / 100.0;

  for (const child of group.children) {
    if (!(child instanceof THREE.Mesh)) continue;
    const u = child.userData;
    if (!u || !u.basePositions) continue;

    const basePos = u.basePositions as Float32Array;
    const geom = child.geometry as THREE.BufferGeometry;
    const posAttr = geom.attributes.position;
    const count = posAttr.count;

    const w = u.w as number;
    const h = u.h as number;
    const d = u.d as number;

    for (let i = 0; i < count; i++) {
      const bx = basePos[i * 3];
      const by = basePos[i * 3 + 1];
      const bz = basePos[i * 3 + 2];

      // Keep center of caps exactly at 0, 0 in local horizontal plane to prevent distortion
      if (Math.abs(bx) < 0.001 && Math.abs(bz) < 0.001) {
        posAttr.setXYZ(i, 0, by, 0);
        continue;
      }

      const angle = Math.atan2(bz, bx);

      // Pure cubic polygon contour at this angle with solid width/depth coverage
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const absCos = Math.abs(cosA) || 0.001;
      const absSin = Math.abs(sinA) || 0.001;
      const cubeDistX = (w * 0.72) / absCos;
      const cubeDistZ = (d * 0.72) / absSin;
      const cubeRadius = Math.min(cubeDistX, cubeDistZ);

      // Calculate the actual continuous vertical Y coordinate of this vertex along the limb
      const vertexLimbY = child.position.y + by;
      const vertexNormY = Math.max(-1.0, Math.min(1.0, vertexLimbY / (h / 2 || 0.001)));

      // Spherical profile factor calculated per vertex so adjacent slices match perfectly at boundaries
      const sphereProfile = Math.sqrt(Math.max(0.68, 1.0 - vertexNormY * vertexNormY * 0.32));

      // Spherical radius: slightly more compact and refined sphere while preserving height and width coverage
      const sphereRadius = Math.sqrt((w * 0.65 * cosA) ** 2 + (d * 0.65 * sinA) ** 2) * sphereProfile * 1.18;

      // Morph radius between cubic polygon and spherical profile
      const r = THREE.MathUtils.lerp(cubeRadius, sphereRadius, t);

      posAttr.setXYZ(i, Math.cos(angle) * r, by, Math.sin(angle) * r);
    }

    posAttr.needsUpdate = true;
    geom.computeVertexNormals();
  }
}

export function getPartBaseCylinderRadius(name: string, scale: number = 1.0, limbSizeMultiplier: number = 1.0): number {
  if (name === 'cabeza') return 0.20 * scale;
  if (name === 'cuello') return 0.095 * scale;
  if (name === 'pechobase') return 0.175 * scale;
  if (name === 'pecho_bajo') return 0.172 * scale;
  if (name === 'torso') return 0.170 * scale;
  if (name === 'ombligo') return 0.165 * scale;
  if (name === 'ombligo_bajo') return 0.170 * scale;
  if (name === 'pelvis') return 0.180 * scale;

  if (name.startsWith('hombro_')) return 0.120 * scale * limbSizeMultiplier; // Flaco como antebrazo
  if (name.startsWith('brazo_')) return 0.130 * scale * limbSizeMultiplier;
  if (name.startsWith('codo_')) return 0.120 * scale * limbSizeMultiplier;
  if (name.startsWith('antebrazo_')) return 0.120 * scale * limbSizeMultiplier;
  if (name.startsWith('muneca_')) return 0.100 * scale * limbSizeMultiplier;
  if (name.startsWith('mano_')) return 0.100 * scale * limbSizeMultiplier;
  if (name.startsWith('dedo_pie_')) return 0.022 * scale * limbSizeMultiplier;
  if (name.includes('dedo_') && name.includes('seg3')) return 0.016 * scale * limbSizeMultiplier;
  if (name.includes('dedo_') && name.includes('seg2')) return 0.018 * scale * limbSizeMultiplier;
  if (name.startsWith('dedo_')) return 0.022 * scale * limbSizeMultiplier;

  if (name.startsWith('cadera_')) return 0.130 * scale * limbSizeMultiplier; // Hip socket ball joint sphere aligned with thigh
  if (name.startsWith('muslo_')) return 0.132 * scale * limbSizeMultiplier;
  if (name.startsWith('rodilla_')) return 0.120 * scale * limbSizeMultiplier; // Anatomical knee joint sphere
  if (name.startsWith('antepierna_')) return 0.105 * scale * limbSizeMultiplier;
  if (name.startsWith('tobillo_')) return 0.052 * scale * limbSizeMultiplier; // Ancho corregido y proporcionado de tobillo un poco mas pequeño
  if (name.includes('talon')) return 0.050 * scale * limbSizeMultiplier; // Heel ball joint sphere
  if (name.includes('medio') && name.includes('pie')) return 0.048 * scale * limbSizeMultiplier; // Midfoot arch ball joint sphere
  if (name.startsWith('pie_') || name.includes('pie_')) return 0.046 * scale * limbSizeMultiplier; // Forefoot / metatarsal joint sphere

  if (name.startsWith('pecho_')) return 0.100 * scale;
  if (name.startsWith('tetilla_')) return 0.028 * scale;
  if (name.startsWith('gluteo_')) return 0.110 * scale;
  if (name.startsWith('male_shaft')) return 0.045 * scale;
  if (name.startsWith('male_glans')) return 0.050 * scale;
  if (name.startsWith('testicle_') || name.startsWith('male_testicle')) return 0.035 * scale;
  if (name.startsWith('female_clitoris') || name.startsWith('clitoris')) return 0.025 * scale;
  if (name.startsWith('female_labia_minora') || name.startsWith('labia_minora')) return 0.020 * scale;
  if (name.startsWith('labio_') || name.startsWith('female_labia')) return 0.038 * scale;
  if (name === 'entrada_femenina' || name === 'female_entrance') return 0.032 * scale;
  if (name.startsWith('ovary_') || name.startsWith('ovario_')) return 0.020 * scale;
  if (name === 'uterus' || name === 'utero') return 0.036 * scale;

  if (name.startsWith('tentaculo_seg')) return 0.13 * scale * limbSizeMultiplier;
  return 0.11 * scale * limbSizeMultiplier;
}

export function getConstraintCylinderRadii(
  cName: string,
  p1Name: string,
  p2Name: string,
  scale: number = 1.0,
  wMult1: number = 1.0,
  wMult2: number = 1.0,
  limbSizeMultiplier: number = 1.0
): { r1: number; r2: number; skip?: boolean } {
  const result = _getConstraintCylinderRadiiRaw(cName, p1Name, p2Name, scale, wMult1, wMult2, limbSizeMultiplier);
  
  const isLimbPart = (name: string) => {
    const n = name.toLowerCase();
    return n.startsWith('hombro_') || n.startsWith('brazo_') || n.startsWith('codo_') || n.startsWith('antebrazo_') || n.startsWith('muneca_') || n.startsWith('mano_') || n.startsWith('dedo_') ||
           n.startsWith('muslo_') || n.startsWith('rodilla_') || n.startsWith('antepierna_') || n.startsWith('tobillo_') || n.startsWith('pie_') || n.startsWith('tentaculo_');
  };

  if (isLimbPart(p1Name) || cName.includes('pelvis_muslo')) result.r1 *= limbSizeMultiplier;
  if (isLimbPart(p2Name) || cName.includes('pelvis_muslo')) result.r2 *= limbSizeMultiplier;

  return result;
}

function _getConstraintCylinderRadiiRaw(
  cName: string,
  p1Name: string,
  p2Name: string,
  scale: number = 1.0,
  wMult1: number = 1.0,
  wMult2: number = 1.0,
  limbSizeMultiplier: number = 1.0
): { r1: number; r2: number; skip?: boolean } {
  // Chest Base to Lower Chest (Pechobase to Pecho Bajo)
  if (cName.includes('pechobase_pechobajo') || (p1Name === 'pechobase' && p2Name === 'pecho_bajo')) {
    return {
      r1: 0.175 * scale * wMult1,
      r2: 0.172 * scale * wMult2,
    };
  }

  // Chest to Breast (Pechobase to Pecho)
  if (cName.includes('pechobase_pecho') || (p1Name === 'pechobase' && p2Name.startsWith('pecho_') && p2Name !== 'pecho_bajo')) {
    return {
      r1: 0.175 * scale * wMult1,
      r2: 0.130 * scale * wMult2,
    };
  }

  // Breast to Nipple (Pecho to Tetilla)
  if (cName.includes('tetilla') || p1Name.startsWith('tetilla_') || p2Name.startsWith('tetilla_')) {
    return {
      r1: 0.100 * scale * wMult1,
      r2: 0.035 * scale * wMult2,
    };
  }

  // Pelvis to Glute (Pelvis to Gluteo)
  if (cName.includes('pelvis_gluteo') || (p1Name === 'pelvis' && p2Name.startsWith('gluteo_'))) {
    return {
      r1: 0.180 * scale * wMult1,
      r2: 0.140 * scale * wMult2,
    };
  }

  // Male shaft segments ("palo")
  if (cName.includes('male_shaft') || cName.includes('shaft')) {
    if (cName.includes('glans') || p2Name.includes('glans')) {
      return {
        r1: 0.045 * scale * wMult1,
        r2: 0.050 * scale * wMult2,
      };
    }
    return {
      r1: 0.045 * scale * wMult1,
      r2: 0.045 * scale * wMult2,
    };
  }

  // Flower accessory stem and blossom
  if (cName.includes('flower') || p1Name.includes('flower') || p2Name.includes('flower')) {
    if (cName.includes('blossom') || p2Name.includes('blossom')) {
      return {
        r1: 0.032 * scale * wMult1,
        r2: 0.045 * scale * wMult2,
      };
    }
    return {
      r1: 0.030 * scale * wMult1,
      r2: 0.030 * scale * wMult2,
    };
  }

  // Pelvis to Male Testicles
  if (cName.includes('testicle') || p2Name.includes('testicle')) {
    return {
      r1: 0.050 * scale * wMult1,
      r2: 0.035 * scale * wMult2,
    };
  }

  // Female Clitoris
  if (cName.includes('clitoris') || p1Name.includes('clitoris') || p2Name.includes('clitoris')) {
    return {
      r1: 0.035 * scale * wMult1,
      r2: 0.025 * scale * wMult2,
    };
  }

  // Female Labia Minora
  if (cName.includes('minora') || p1Name.includes('minora') || p2Name.includes('minora')) {
    return {
      r1: 0.030 * scale * wMult1,
      r2: 0.020 * scale * wMult2,
    };
  }

  // Female Labia / Entrance / Organs
  if (cName.includes('labia') || cName.includes('labio') || p2Name.includes('labia') || p2Name.includes('labio')) {
    return {
      r1: 0.060 * scale * wMult1,
      r2: 0.038 * scale * wMult2,
    };
  }

  if (cName.includes('entrance') || cName.includes('entrada') || p2Name.includes('entrance') || p2Name.includes('entrada')) {
    return {
      r1: 0.050 * scale * wMult1,
      r2: 0.032 * scale * wMult2,
    };
  }

  if (cName.includes('ovary') || cName.includes('ovario') || cName.includes('uterus') || cName.includes('utero') || p2Name.includes('ovary') || p2Name.includes('uterus')) {
    return {
      r1: 0.040 * scale * wMult1,
      r2: 0.025 * scale * wMult2,
    };
  }
  // Foot segments (Talon, Medio, Frente) checked before toes to avoid name collisions
  if (
    cName.includes('pie_talon_medio') ||
    cName.includes('pie_medio_frente') ||
    (p1Name.startsWith('pie_') && p2Name.startsWith('pie_'))
  ) {
    return {
      r1: 0.052 * scale * wMult1,
      r2: 0.052 * scale * wMult2,
    };
  }

  // Toes: Connected cleanly to foot base with smooth taper
  if (
    cName.includes('pie_pulgar') ||
    cName.includes('pie_indice') ||
    cName.includes('pie_dedo_medio') ||
    cName.includes('pie_anular') ||
    cName.includes('pie_menique') ||
    cName.includes('pie_dedo') ||
    p1Name.startsWith('dedo_pie_') ||
    p2Name.startsWith('dedo_pie_')
  ) {
    return {
      r1: 0.016 * scale * wMult1,
      r2: 0.016 * scale * wMult2,
    };
  }

  // Hand to Finger Segment 1: Proportional to hand and connected smoothly
  if (
    cName.includes('mano_pulgar') ||
    cName.includes('mano_indice') ||
    cName.includes('mano_medio') ||
    cName.includes('mano_anular') ||
    cName.includes('mano_menique') ||
    (p1Name.startsWith('mano_') && p2Name.startsWith('dedo_') && !p2Name.includes('seg'))
  ) {
    return {
      r1: 0.022 * scale * wMult1,
      r2: 0.016 * scale * wMult2,
    };
  }

  // Finger Segment 1 to Segment 2 (Flexor)
  if (
    cName.includes('_seg1_seg2_') ||
    (p1Name.startsWith('dedo_') && !p1Name.includes('seg') && p2Name.includes('seg2'))
  ) {
    return {
      r1: 0.020 * scale * wMult1,
      r2: 0.017 * scale * wMult2,
    };
  }

  // Finger Segment 2 (Flexor) to Segment 3 (Distal Tip)
  if (
    cName.includes('_seg2_seg3_') ||
    (p1Name.includes('seg2') && p2Name.includes('seg3'))
  ) {
    return {
      r1: 0.017 * scale * wMult1,
      r2: 0.014 * scale * wMult2,
    };
  }

  // Fingers fallback: Proportional to hand and connected smoothly
  if (
    cName.includes('mano_dedo') ||
    p1Name.startsWith('dedo_') ||
    p2Name.startsWith('dedo_')
  ) {
    return {
      r1: 0.024 * scale * wMult1,
      r2: 0.020 * scale * wMult2,
    };
  }

  // Toe constraints (Foot to Toe)
  if (
    cName.includes('pie_pulgar') ||
    cName.includes('pie_indice') ||
    cName.includes('pie_medio') ||
    cName.includes('pie_anular') ||
    cName.includes('pie_menique') ||
    p2Name.startsWith('dedo_pie_') ||
    p1Name.startsWith('dedo_pie_')
  ) {
    return {
      r1: 0.030 * scale * wMult1,
      r2: 0.022 * scale * wMult2,
    };
  }

  // Foot segments (Talon, Medio, Frente)
  if (
    cName.includes('pie_talon_medio') ||
    cName.includes('pie_medio_frente') ||
    (p1Name.startsWith('pie_') && p2Name.startsWith('pie_'))
  ) {
    return {
      r1: 0.052 * scale * wMult1,
      r2: 0.052 * scale * wMult2,
    };
  }

  // Ankle to Foot (Smooth natural foot bridge)
  if (cName.includes('tobillo_pie') && cName.includes('talon')) {
    return {
      r1: 0.052 * scale * wMult1,
      r2: 0.050 * scale * wMult2,
    };
  }
  if (cName.includes('tobillo_pie') && cName.includes('medio')) {
    return {
      r1: 0.050 * scale * wMult1,
      r2: 0.048 * scale * wMult2,
    };
  }
  if (cName.includes('tobillo_pie') || (p1Name.startsWith('tobillo_') && p2Name.startsWith('pie_'))) {
    return {
      r1: 0.052 * scale * wMult1,
      r2: 0.046 * scale * wMult2,
    };
  }
  if (p1Name.startsWith('pie_') && p2Name.startsWith('tobillo_')) {
    return {
      r1: 0.046 * scale * wMult1,
      r2: 0.052 * scale * wMult2,
    };
  }

  // Lower leg to Ankle
  if (cName.includes('antepierna_tobillo') || (p1Name.startsWith('antepierna_') && p2Name.startsWith('tobillo_'))) {
    return {
      r1: 0.105 * scale * wMult1,
      r2: 0.054 * scale * wMult2,
    };
  }
  if (p1Name.startsWith('tobillo_') && p2Name.startsWith('antepierna_')) {
    return {
      r1: 0.054 * scale * wMult1,
      r2: 0.105 * scale * wMult2,
    };
  }

  // Knee to Lower leg
  if (cName.includes('rodilla_antepierna') || (p1Name.startsWith('rodilla_') && p2Name.startsWith('antepierna_'))) {
    return {
      r1: 0.120 * scale * wMult1,
      r2: 0.105 * scale * wMult2,
    };
  }
  if (p1Name.startsWith('antepierna_') && p2Name.startsWith('rodilla_')) {
    return {
      r1: 0.105 * scale * wMult1,
      r2: 0.120 * scale * wMult2,
    };
  }

  // Thigh to Knee
  if (cName.includes('muslo_rodilla') || (p1Name.startsWith('muslo_') && p2Name.startsWith('rodilla_'))) {
    return {
      r1: 0.132 * scale * wMult1,
      r2: 0.120 * scale * wMult2,
    };
  }
  if (p1Name.startsWith('rodilla_') && p2Name.startsWith('muslo_')) {
    return {
      r1: 0.120 * scale * wMult1,
      r2: 0.132 * scale * wMult2,
    };
  }

  // Pelvis to Thigh
  if (cName.includes('pelvis_muslo') || (p1Name === 'pelvis' && p2Name.startsWith('muslo_'))) {
    return {
      r1: 0.130 * scale * wMult1,
      r2: 0.132 * scale * wMult2,
    };
  }
  if (p1Name.startsWith('muslo_') && p2Name === 'pelvis') {
    return {
      r1: 0.132 * scale * wMult1,
      r2: 0.130 * scale * wMult2,
    };
  }

  // Chest to Shoulder
  if (cName.includes('pecho_hombro') || (p1Name === 'pechobase' && p2Name.startsWith('hombro_'))) {
    return {
      r1: 0.165 * scale * wMult1,
      r2: 0.120 * scale * wMult2,
    };
  }
  if (p1Name.startsWith('hombro_') && p2Name === 'pechobase') {
    return {
      r1: 0.120 * scale * wMult1,
      r2: 0.165 * scale * wMult2,
    };
  }

  // Shoulder to Arm
  if (cName.includes('hombro_brazo') || (p1Name.startsWith('hombro_') && p2Name.startsWith('brazo_'))) {
    return {
      r1: 0.120 * scale * wMult1,
      r2: 0.130 * scale * wMult2,
    };
  }

  // Arm to Elbow
  if (cName.includes('brazo_codo') || (p1Name.startsWith('brazo_') && p2Name.startsWith('codo_'))) {
    return {
      r1: 0.130 * scale * wMult1,
      r2: 0.120 * scale * wMult2,
    };
  }

  // Elbow to Forearm
  if (cName.includes('codo_antebrazo') || (p1Name.startsWith('codo_') && p2Name.startsWith('antebrazo_'))) {
    return {
      r1: 0.120 * scale * wMult1,
      r2: 0.120 * scale * wMult2,
    };
  }

  // Forearm to Wrist
  if (cName.includes('antebrazo_muneca') || (p1Name.startsWith('antebrazo_') && p2Name.startsWith('muneca_'))) {
    return {
      r1: 0.120 * scale * wMult1,
      r2: 0.100 * scale * wMult2,
    };
  }

  // Wrist to Hand
  if (cName.includes('muneca_mano') || (p1Name.startsWith('muneca_') && p2Name.startsWith('mano_'))) {
    return {
      r1: 0.100 * scale * wMult1,
      r2: 0.105 * scale * wMult2,
    };
  }

  // Head to Neck (Clean slender neck junction without bulging)
  if (cName.includes('cabeza_cuello') || (p1Name === 'cabeza' && p2Name === 'cuello')) {
    return {
      r1: 0.180 * scale * wMult1,
      r2: 0.095 * scale * wMult2,
    };
  }

  // Neck to Upper Chest (Slender neck clearly visible, pechobase nicely proportioned)
  if (cName.includes('cuello_pecho') || cName.includes('cuello_pechobase') || (p1Name === 'cuello' && p2Name === 'pechobase')) {
    return {
      r1: 0.095 * scale * wMult1,
      r2: 0.155 * scale * wMult2,
    };
  }

  // Upper Chest to Mid Torso
  if (cName.includes('pecho_torso') || cName.includes('pechobase_torso') || (p1Name === 'pechobase' && p2Name === 'torso')) {
    return {
      r1: 0.175 * scale * wMult1,
      r2: 0.170 * scale * wMult2,
    };
  }

  // Mid Torso to Abdomen
  if (cName.includes('torso_ombligo') || (p1Name === 'torso' && p2Name === 'ombligo')) {
    return {
      r1: 0.170 * scale * wMult1,
      r2: 0.165 * scale * wMult2,
    };
  }

  // Abdomen to Pelvis
  if (cName.includes('ombligo_pelvis') || (p1Name === 'ombligo' && p2Name === 'pelvis')) {
    return {
      r1: 0.165 * scale * wMult1,
      r2: 0.180 * scale * wMult2,
    };
  }

  const r1 = getPartBaseCylinderRadius(p1Name, scale, 1.0) * wMult1;
  const r2 = getPartBaseCylinderRadius(p2Name, scale, 1.0) * wMult2;
  return { r1, r2 };
}

/**
 * Morphs the 3D envelope vertices between a clean box wrapping (0)
 * and an organic 3D spherical / ellipsoid volume visible from all angles (100).
 * It dynamically blends neighboring active limbs together by proximity to form a single unified shape.
 */

const _vWorldPos = new THREE.Vector3();
const _vBlendPos = new THREE.Vector3();
const _vOtherCenter = new THREE.Vector3();
const _vLocalPos = new THREE.Vector3();
const _vParticlePos = new THREE.Vector3();
const _vLocalOffset = new THREE.Vector3();
const _vInverseQuat = new THREE.Quaternion();

export function applySphericalMorph(


  mesh: THREE.Mesh,
  level: number,
  particle?: Particle3D,
  ragdoll?: Ragdoll3D
) {
  if (!mesh.userData || !mesh.userData.base3DPositions) return;

  // Calculate nested hierarchy offset of this sub-mesh relative to particle carrier mesh ONCE
  _vLocalOffset.set(0, 0, 0);
  if (particle && particle.mesh) {
    mesh.updateMatrixWorld(true);
    particle.mesh.updateMatrixWorld(true);
    mesh.getWorldPosition(_vWorldPos);
    particle.mesh.worldToLocal(_vWorldPos);
    _vLocalOffset.copy(_vWorldPos);
  }

  const style = ragdoll?.contourJointStyle || 'cylinder';
  const t = Math.max(0, Math.min(100, level)) / 100.0;
  let basePos = mesh.userData.base3DPositions as Float32Array;
  if (mesh.userData.currentGeomType === 'cylinder' && mesh.userData.cylinderBase3DPositions) {
    basePos = mesh.userData.cylinderBase3DPositions;
  }
  
  // Dynamically extract the original base color of the mesh if not explicitly recorded
  const partName = (mesh.userData?.partName || mesh.name || '').toLowerCase();
  const isAnatomySkinPart = (
    partName.includes('pecho') || partName.includes('breast') ||
    partName.includes('glute') || partName.includes('gluteo') ||
    partName.includes('shaft') || partName.includes('testicle') ||
    partName.includes('labia') || partName.includes('clitoris') ||
    partName.includes('test_') || partName.includes('entrance')
  ) && !partName.includes('tetilla') && !partName.includes('nipple') && !partName.includes('glans');
  const isPinkAnatomyPart = (
    partName.includes('tetilla') || partName.includes('nipple') ||
    partName.includes('glans') || partName.includes('pink_sphere')
  );

  let finalBaseColor = mesh.userData.baseColor;
  if (isPinkAnatomyPart) {
    finalBaseColor = 0xf472b6;
    mesh.userData.baseColor = finalBaseColor;
  } else if (ragdoll) {
    if (mesh.userData.isShirt) {
      finalBaseColor = ragdoll.shirtColorHex ?? 0x38bdf8;
    } else if (mesh.userData.isPants) {
      finalBaseColor = ragdoll.pantsColorHex ?? 0x1e3a8a;
    } else {
      finalBaseColor = getRagdollSkinColor(ragdoll);
    }
    mesh.userData.baseColor = finalBaseColor;
  } else if (finalBaseColor === undefined) {
    finalBaseColor = 0xf5d0b5;
    mesh.userData.baseColor = finalBaseColor;
  }
  const baseColorObj = new THREE.Color(finalBaseColor).convertSRGBToLinear();

  const w = mesh.userData.w !== undefined ? mesh.userData.w : 0.2;
  const h = mesh.userData.h !== undefined ? mesh.userData.h : 0.2;
  const d = mesh.userData.d !== undefined ? mesh.userData.d : 0.2;

  const wMult = particle?.widthMultiplier !== undefined ? particle.widthMultiplier : 1.0;
  if (particle) {
    if (particle.voxelsGroup) {
      particle.voxelsGroup.scale.set(wMult, 1.0, wMult);
    }
    if (particle.metaball3Mesh) {
      particle.metaball3Mesh.scale.set(wMult, 1.0, wMult);
    }
  }

  // Proportional envelope scale margin for small parts like nipples and genitals
  const isSmallPart = w < 0.1 || h < 0.1 || d < 0.1;
  const pName = (mesh && mesh.userData && mesh.userData.partName) ? mesh.userData.partName : '';
  const isDigit = pName.startsWith('dedo_') || pName.startsWith('dedo_pie_') || pName.startsWith('mano_') || pName.startsWith('pie_');
  const skinMargin = isDigit ? Math.min(0.004, w * 0.1) : (isSmallPart ? Math.min(0.02, Math.max(0.005, w * 0.15)) : 0.10);
  const envW = isDigit ? w * 1.05 + skinMargin : w * 1.35 + skinMargin;
  const envH = isDigit ? h * 1.05 + skinMargin : h * 1.35 + skinMargin;
  const envD = isDigit ? d * 1.05 + skinMargin : d * 1.35 + skinMargin;

  // Target radii sufficiently large to cover inner blocks
  const rx = (envW * wMult) / 2;
  const ry = envH / 2;
  const rz = (mesh.userData.partName === 'cama_sabana' || mesh.userData.partName === 'cama_almohada') ? 0.005 : (envD * wMult) / 2;

  const geom = mesh.geometry as THREE.BufferGeometry;
  const posAttr = geom.attributes.position;
  const count = posAttr.count;

  // Dynamically prepare the mesh and material for vertex colors if not already present
  if (!geom.attributes.color) {
    const colors = new Float32Array(count * 3);
    const colLinear = baseColorObj.clone();
    for (let j = 0; j < count; j++) {
      colors[j * 3] = colLinear.r;
      colors[j * 3 + 1] = colLinear.g;
      colors[j * 3 + 2] = colLinear.b;
    }
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.vertexColors = true;
          mat.color.setHex(0xffffff); // Set base color to white so vertex colors display perfectly
          mat.needsUpdate = true;
        }
      }
    }
  }

  const colorAttr = geom.attributes.color;
  const hasColor = !!colorAttr;

  // Dynamic precomputation of nearest voxel index per vertex for extremely fast lookups
  const voxelBlocks = mesh.userData.voxelBlocks as LimbVoxelBlock[] | undefined;
  if (voxelBlocks && !mesh.userData.vertexNearestVoxelIndices) {
    const indices = new Int32Array(count);
    for (let i = 0; i < count; i++) {
      const bx = basePos[i * 3];
      const by = basePos[i * 3 + 1];
      const bz = basePos[i * 3 + 2];
      const vPos = new THREE.Vector3(bx, by, bz);

      let minDist = Infinity;
      let nearestIdx = -1;
      for (let j = 0; j < voxelBlocks.length; j++) {
        const d = voxelBlocks[j].localPos.distanceTo(vPos);
        if (d < minDist) {
          minDist = d;
          nearestIdx = j;
        }
      }
      indices[i] = nearestIdx;
    }
    mesh.userData.vertexNearestVoxelIndices = indices;
  }

  const nearestIndices = mesh.userData.vertexNearestVoxelIndices as Int32Array | undefined;

  for (let i = 0; i < count; i++) {
    const bx = basePos[i * 3];
    const by = basePos[i * 3 + 1];
    const bz = basePos[i * 3 + 2];

    const len = Math.sqrt(bx * bx + by * by + bz * bz) || 0.001;
    const nx = bx / len;
    const ny = by / len;
    const nz = bz / len;

    // 3D Spherical/ellipsoid target point with thickness-based sphericity
    const sx = nx * rx;
    const sy = ny * ry;
    const sz = nz * rz;

    // Morph interpolation to smooth organic skin
    let finalX = (1 - t) * bx + t * sx;
    let finalY = (1 - t) * by + t * sy;
    let finalZ = (1 - t) * bz + t * sz;

    let maxW = 0;

    if (voxelBlocks) {
      const vPos = new THREE.Vector3(bx, by, bz);
      for (const b of voxelBlocks) {
        if (!b.active) {
          const sizeX = b.size ? b.size[0] : (w / 2);
          const sizeY = b.size ? b.size[1] : (h / 3);
          const sizeZ = b.size ? b.size[2] : (d / 2);
          
          const blockRadius = Math.max(sizeX, sizeY, sizeZ) * 1.25;
          const dist = vPos.distanceTo(b.localPos);
          if (dist < blockRadius) {
            const weight = 1.0 - (dist / blockRadius);
            if (weight > maxW) {
              maxW = weight;
            }
          }
        }
      }
    }

    let insideDestroyedCube = false;

    if (voxelBlocks) {
      for (const b of voxelBlocks) {
        if (!b.active) {
          const halfW = (b.size ? b.size[0] : (w / 2)) * 0.5;
          const halfH = (b.size ? b.size[1] : (h / 3)) * 0.5;
          const halfD = (b.size ? b.size[2] : (d / 2)) * 0.5;

          const dx = bx - b.localPos.x;
          const dy = by - b.localPos.y;
          const dz = bz - b.localPos.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const blockRad = Math.max(halfW, halfH, halfD) * 3.2;

          // Check if vertex falls inside or near this destroyed block's physical region
          if (dist < blockRad) {
            insideDestroyedCube = true;
            const factor = Math.pow(1.0 - dist / blockRad, 1.4);
            // Sink skin surface inward directly toward destroyed block core to form a real physical cavity
            finalX = THREE.MathUtils.lerp(finalX, b.localPos.x, factor * 0.82);
            finalY = THREE.MathUtils.lerp(finalY, b.localPos.y, factor * 0.82);
            finalZ = THREE.MathUtils.lerp(finalZ, b.localPos.z, factor * 0.82);
          }
        }
      }
    }

    // Real physical 3D bullet hole cavity carving on outer skin & contour geometry
    let maxHoleStain = 0;
    if (mesh.userData.holes && mesh.userData.holes.length > 0) {
      const vCurr = _vLocalPos.set(finalX, finalY, finalZ);
      if (particle && mesh !== particle.contourMesh) {
        vCurr.add(_vLocalOffset);
      }

      const worldScale = new THREE.Vector3();
      mesh.getWorldScale(worldScale);
      const sX = Math.abs(worldScale.x) > 0.0001 ? Math.abs(worldScale.x) : 1.0;
      const sY = Math.abs(worldScale.y) > 0.0001 ? Math.abs(worldScale.y) : 1.0;
      const sZ = Math.abs(worldScale.z) > 0.0001 ? Math.abs(worldScale.z) : 1.0;

      for (const hole of mesh.userData.holes) {
        const holePos = hole.pos as THREE.Vector3;
        const holeRad = hole.radius || 0.065;

        // Metric world distance calculation for exact spherical cavity
        const dx = (vCurr.x - holePos.x) * sX;
        const dy = (vCurr.y - holePos.y) * sY;
        const dz = (vCurr.z - holePos.z) * sZ;
        const distToEntry = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distToEntry < holeRad) {
          // Mathematically exact spherical depression depth
          const depth = Math.sqrt(holeRad * holeRad - distToEntry * distToEntry);
          let inX = -vCurr.x;
          let inY = -vCurr.y;
          let inZ = -vCurr.z;
          let inLen = Math.sqrt(inX * inX + inY * inY + inZ * inZ);
          if (inLen > 0.0001) {
            finalX += (inX / inLen) * (depth / sX);
            finalY += (inY / inLen) * (depth / sY);
            finalZ += (inZ / inLen) * (depth / sZ);
          }

          const stain = 1.0 - (distToEntry / holeRad);
          if (stain > maxHoleStain) maxHoleStain = stain;
        }

        // Carve inward along chain of connected spheres
        if (hole.subSpheres && Array.isArray(hole.subSpheres)) {
          for (let sIdx = 0; sIdx < hole.subSpheres.length; sIdx++) {
            const sub = hole.subSpheres[sIdx];
            const subPos = sub.pos as THREE.Vector3;
            const subRad = (sub.radius || holeRad);
            const dsX = (vCurr.x - subPos.x) * sX;
            const dsY = (vCurr.y - subPos.y) * sY;
            const dsZ = (vCurr.z - subPos.z) * sZ;
            const distSub = Math.sqrt(dsX * dsX + dsY * dsY + dsZ * dsZ);
            if (distSub < subRad) {
              const subDepth = Math.sqrt(subRad * subRad - distSub * distSub);
              let inX = -vCurr.x;
              let inY = -vCurr.y;
              let inZ = -vCurr.z;
              let inLen = Math.sqrt(inX * inX + inY * inY + inZ * inZ);
              if (inLen > 0.0001) {
                finalX += (inX / inLen) * (subDepth / sX);
                finalY += (inY / inLen) * (subDepth / sY);
                finalZ += (inZ / inLen) * (subDepth / sZ);
              }

              const stain = 1.0 - (distSub / subRad);
              if (stain > maxHoleStain) maxHoleStain = stain;
            }
          }
        }

        // Carve exit hole crater if bullet penetrated through extremity
        if (hole.exitPos) {
          const exitPos = hole.exitPos as THREE.Vector3;
          const deX = (vCurr.x - exitPos.x) * sX;
          const deY = (vCurr.y - exitPos.y) * sY;
          const deZ = (vCurr.z - exitPos.z) * sZ;
          const distToExit = Math.sqrt(deX * deX + deY * deY + deZ * deZ);
          if (distToExit < holeRad) {
            const exitDepth = Math.sqrt(holeRad * holeRad - distToExit * distToExit);
            let inX = -vCurr.x;
            let inY = -vCurr.y * 0.15;
            let inZ = -vCurr.z;
            let inLen = Math.sqrt(inX * inX + inY * inY + inZ * inZ);
            if (inLen > 0.0001) {
              finalX += (inX / inLen) * (exitDepth / sX);
              finalY += (inY / inLen) * (exitDepth / sY);
              finalZ += (inZ / inLen) * (exitDepth / sZ);
            }

            const stain = 1.0 - (distToExit / holeRad);
            if (stain > maxHoleStain) maxHoleStain = stain;
          }
        }
      }
    }

    if (!insideDestroyedCube && particle && ragdoll && t > 0.01) {
      const pMesh = particle.mesh;
      if (pMesh) {
        // Convert vertex local position to world space, accounting for hierarchy offset!
        _vWorldPos.set(finalX, finalY, finalZ).add(_vLocalOffset);
        _vWorldPos.applyQuaternion(pMesh.quaternion);
        _vWorldPos.multiplyScalar(ragdoll.scale);
        _vParticlePos.set(particle.x, particle.y, particle.z);
        _vWorldPos.add(_vParticlePos);

        // Pseudo-3D distance-weighted smooth blending algorithm
        _vBlendPos.set(0, 0, 0);
        let totalWeight = 0;

        const isHeadOrNeck = particle.name === 'cabeza' || particle.name === 'cuello';
        const isDetail = [
          'tetilla_izq',
          'tetilla_der',
          'male_shaft',
          'male_shaft_0',
          'male_shaft_1',
          'male_shaft_2',
          'male_glans',
          'testicle_l',
          'testicle_r',
          'female_labia_l',
          'female_labia_r',
          'female_entrance',
          'labio_izq',
          'labio_der',
          'entrada_femenina'
        ].includes(mesh.userData.partName);

        if (!isDetail && style !== 'blocky') {
          for (const other of ragdoll.particles) {
            if (other.id === particle.id) continue;
            if (other.dismembered) continue; // ignore dismembered parts

            _vOtherCenter.set(other.x, other.y, other.z);
            const dist = _vWorldPos.distanceTo(_vOtherCenter);
            
            const isOtherHeadOrNeck = other.name === 'cabeza' || other.name === 'cuello';
            const influenceMult = (isHeadOrNeck || isOtherHeadOrNeck) ? 0.40 : 0.60;
            const influenceRadius = (other.radius || 0.22) * influenceMult;

            if (dist < influenceRadius) {
              const ratio = 1.0 - (dist / influenceRadius);
              const weight = Math.pow(ratio, 2.0);
              _vBlendPos.addScaledVector(_vOtherCenter, weight);
              totalWeight += weight;
            }
          }
        }

        if (totalWeight > 0) {
          const avgBlendPos = _vBlendPos.divideScalar(totalWeight);
          const blendFactor = isHeadOrNeck ? 0.005 : 0.020;
          _vWorldPos.lerp(avgBlendPos, Math.min(0.95, totalWeight * blendFactor * t));
        }

        // Convert back to local space of current limb
        _vLocalPos.copy(_vWorldPos);
        _vLocalPos.sub(_vParticlePos);
        _vLocalPos.divideScalar(ragdoll.scale);
        _vInverseQuat.copy(pMesh.quaternion).invert();
        _vLocalPos.applyQuaternion(_vInverseQuat);
        _vLocalPos.sub(_vLocalOffset);

        finalX = _vLocalPos.x;
        finalY = _vLocalPos.y;
        finalZ = _vLocalPos.z;
      }
    }

    const colLinearBase = baseColorObj.clone();
    let r = colLinearBase.r;
    let g = colLinearBase.g;
    let b = colLinearBase.b;

    // Paint dynamic crimson blood inside destroyed block cavities
    if (insideDestroyedCube) {
      r = 0.35;
      g = 0.04;
      b = 0.04;
    }

    if (maxHoleStain > 0.01) {
      const stainK = Math.min(1.0, Math.pow(maxHoleStain, 1.2) * 1.5);
      r = THREE.MathUtils.lerp(r, 0.16, stainK);
      g = THREE.MathUtils.lerp(g, 0.02, stainK);
      b = THREE.MathUtils.lerp(b, 0.02, stainK);
    }

    // Pechos y Glúteos pseudo-3D envelope morph
    if (ragdoll?.hasBustAndGlutes) {
      const partName = mesh.userData.partName;
      if (partName === 'pecho_izq' || partName === 'pecho_der') {
        const bustPeak = Math.max(0, Math.cos(finalX * 6.0)) * 0.10;
        finalZ += bustPeak;
      } else if (partName === 'tetilla_izq' || partName === 'tetilla_der') {
        // Project the nipples forward by the peak of the breast envelope plus an extra margin to stand proud
        const parentPeak = Math.cos(0.10 * 6.0) * 0.10;
        finalZ += parentPeak + 0.010;
      } else if (partName === 'pechobase' && bz > 0) {
        const chestBump = Math.max(0, Math.cos(bx * 5.0)) * 0.06 * t;
        finalZ += chestBump;
      }
    }

    // Head spherical contour
    // Removed eye and mouth socket recessions per user request ("boca y ojos no tengan huecos mejor")

    posAttr.setXYZ(i, finalX, finalY, finalZ);
    if (hasColor) {
      colorAttr.setXYZ(i, r, g, b);
    }
  }

  posAttr.needsUpdate = true;
  geom.computeBoundingBox();
  geom.computeBoundingSphere();
  if (hasColor) {
    colorAttr.needsUpdate = true;
  }

  // Compute true 3D physical surface normals
  geom.computeVertexNormals();

  const mat = mesh.material as THREE.MeshStandardMaterial;
  if (mat) {
    mat.transparent = false;
    mat.opacity = 1.0;
  }

  // --- ALSO MORPH THE ACTIVE VOXEL BLOCKS IN THIS LIMB DYNAMICALLY ---
  if (voxelBlocks) {
    for (const b of voxelBlocks) {
      if (!b.mesh) continue;
      if (!b.active) {
        b.mesh.visible = false;
        continue;
      }

      if (b.isGenitalBlock) {
        // Skip repositioning or scaling genital blocks here, they have custom physics/alignment
        continue;
      }

      // If the voxel shape is a box/cube, do not deform or scale the voxel positions/scales!
      // This keeps them in their exact, aligned grid positions so that bullets can destroy them one-by-one.
      const isSphere = b.mesh.geometry instanceof THREE.SphereGeometry;
      if (!isSphere) {
        b.mesh.position.copy(b.localPos);
        b.mesh.scale.set(1.0, 1.0, 1.0);
        continue;
      }

      const bx = b.localPos.x;
      const by = b.localPos.y;
      const bz = b.localPos.z;

      // Project the voxel's local grid position onto the ellipsoid shell
      const len = Math.sqrt(bx * bx + by * by + bz * bz) || 0.001;
      const nx = bx / len;
      const ny = by / len;
      const nz = bz / len;

      // Keep it inside the skin (sFactor ~ 0.78 for neat nesting)
      const sFactor = 0.78;
      const sx = nx * rx * sFactor;
      const sy = ny * ry * sFactor;
      const sz = nz * rz * sFactor;

      // Interpolate voxel positions
      const finalX = (1 - t) * bx + t * sx;
      const finalY = (1 - t) * by + t * sy;
      const finalZ = (1 - t) * bz + t * sz;

      b.mesh.position.set(finalX, finalY, finalZ);

      // Scale voxels outward slightly to blend and make the body look more spherical/fused
      // We scale them down instead of up to prevent corners from poking out of the contour
      const scaleS = 1.0 - t * 0.1;
      if (isSphere) {
        b.mesh.scale.set(
          b.size[0] * 1.05 * scaleS,
          b.size[1] * 1.05 * scaleS,
          b.size[2] * 1.05 * scaleS
        );
      } else {
        if (t > 0.01) {
          b.mesh.scale.set(scaleS, scaleS, scaleS);
        } else {
          b.mesh.scale.set(1.0, 1.0, 1.0);
        }
      }
    }
  }
}

/**
 * Enables material updates for bullet hole interaction
 */
export function enableHoleAlphaOnMaterial(material: THREE.Material) {
  if (!material) return;
  material.needsUpdate = true;
}

/**
 * Attaches bullet hole records to mesh and physically deforms/hollows out the geometry into an exact spherical hollow cavity
 */
export function applyHoleMorphToMesh(mesh: THREE.Mesh) {
  try {
    if (!mesh || !(mesh instanceof THREE.Mesh) || !mesh.geometry) return;

    const geom = mesh.geometry as THREE.BufferGeometry;
    if (!geom) return;

    const posAttr = geom.attributes.position;
    if (!posAttr) return;
    const count = posAttr.count;

    // 1. Store base original positions
    if (!mesh.userData.basePositions || (mesh.userData.basePositions as Float32Array).length !== count * 3) {
      const arr = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        arr[i * 3] = posAttr.getX(i);
        arr[i * 3 + 1] = posAttr.getY(i);
        arr[i * 3 + 2] = posAttr.getZ(i);
      }
      mesh.userData.basePositions = arr;
    }
    const basePos = mesh.userData.basePositions as Float32Array;

    // 2. Store base original normals
    if (!mesh.userData.baseNormals || (mesh.userData.baseNormals as Float32Array).length !== count * 3) {
      if (!geom.attributes.normal || geom.attributes.normal.count !== count) {
        geom.computeVertexNormals();
      }
      const normAttr = geom.attributes.normal;
      const nArr = new Float32Array(count * 3);
      if (normAttr) {
        for (let i = 0; i < count; i++) {
          nArr[i * 3] = normAttr.getX(i);
          nArr[i * 3 + 1] = normAttr.getY(i);
          nArr[i * 3 + 2] = normAttr.getZ(i);
        }
      }
      mesh.userData.baseNormals = nArr;
    }
    const baseNorm = mesh.userData.baseNormals as Float32Array;

    // 3. Store base original vertex colors if present, or dynamically initialize them from material color
    let colorAttr = geom.attributes.color;
    if (!colorAttr) {
      const cArr = new Float32Array(count * 3);
      let baseR = 0.95;
      let baseG = 0.82;
      let baseB = 0.72;
      if (mesh.material && (mesh.material as THREE.MeshStandardMaterial).color) {
        const matCol = (mesh.material as THREE.MeshStandardMaterial).color;
        baseR = matCol.r;
        baseG = matCol.g;
        baseB = matCol.b;
      }
      for (let i = 0; i < count; i++) {
        cArr[i * 3] = baseR;
        cArr[i * 3 + 1] = baseG;
        cArr[i * 3 + 2] = baseB;
      }
      colorAttr = new THREE.BufferAttribute(cArr, 3);
      geom.setAttribute('color', colorAttr);
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => {
            if (mat) {
              (mat as any).vertexColors = true;
              mat.needsUpdate = true;
            }
          });
        } else {
          (mesh.material as any).vertexColors = true;
          mesh.material.needsUpdate = true;
        }
      }
      mesh.userData.baseColors = cArr;
    } else if (!mesh.userData.baseColors || (mesh.userData.baseColors as Float32Array).length !== count * 3) {
      const cArr = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        cArr[i * 3] = colorAttr.getX(i);
        cArr[i * 3 + 1] = colorAttr.getY(i);
        cArr[i * 3 + 2] = colorAttr.getZ(i);
      }
      mesh.userData.baseColors = cArr;
    }
    const baseCol = mesh.userData.baseColors as Float32Array | undefined;

    // Determine parent ragdoll & mode
    const parentRagdoll = mesh.userData?.parentRagdoll || (mesh as any).parentRagdoll || (mesh.parent?.userData?.parentRagdoll);
    const isSinPielPhase = parentRagdoll && parentRagdoll.xrayMode === 1;

    // If no holes are recorded, or if in X-Ray Sin Piel mode (xrayMode === 1), restore the pristine base positions and colors
    if (!mesh.userData.holes || mesh.userData.holes.length === 0 || isSinPielPhase) {
      for (let i = 0; i < count; i++) {
        posAttr.setXYZ(i, basePos[i * 3], basePos[i * 3 + 1], basePos[i * 3 + 2]);
        if (colorAttr && baseCol) {
          colorAttr.setXYZ(i, baseCol[i * 3], baseCol[i * 3 + 1], baseCol[i * 3 + 2]);
        }
      }
      posAttr.needsUpdate = true;
      if (colorAttr) colorAttr.needsUpdate = true;
      geom.computeVertexNormals();
      return;
    }

    mesh.updateMatrixWorld(true);
    const worldScale = new THREE.Vector3();
    mesh.getWorldScale(worldScale);
    const scaleX = Math.abs(worldScale.x) > 0.0001 ? Math.abs(worldScale.x) : 1.0;
    const scaleY = Math.abs(worldScale.y) > 0.0001 ? Math.abs(worldScale.y) : 1.0;
    const scaleZ = Math.abs(worldScale.z) > 0.0001 ? Math.abs(worldScale.z) : 1.0;

    for (let i = 0; i < count; i++) {
      let vx = basePos[i * 3];
      let vy = basePos[i * 3 + 1];
      let vz = basePos[i * 3 + 2];
      const nx = baseNorm ? baseNorm[i * 3] : 0;
      const ny = baseNorm ? baseNorm[i * 3 + 1] : 0;
      const nz = baseNorm ? baseNorm[i * 3 + 2] : 0;

      let maxCavityDepth = 0;
      let carveUx = 0;
      let carveUy = 0;
      let carveUz = 0;
      let maxStain = 0;

      for (const hole of mesh.userData.holes) {
        // Evaluate primary hole sphere and any inner chain spheres
        const spheresToTest: { pos: THREE.Vector3; radius: number }[] = [
          { pos: hole.pos, radius: hole.radius || 0.065 }
        ];
        if (hole.subSpheres && Array.isArray(hole.subSpheres)) {
          for (const sub of hole.subSpheres) {
            spheresToTest.push({ pos: sub.pos, radius: sub.radius || hole.radius || 0.065 });
          }
        }

        for (const sph of spheresToTest) {
          const hx = sph.pos.x;
          const hy = sph.pos.y;
          const hz = sph.pos.z;
          const holeRad = sph.radius;

          // Metric world distance from vertex base position to hole sphere center
          const dx = (basePos[i * 3] - hx) * scaleX;
          const dy = (basePos[i * 3 + 1] - hy) * scaleY;
          const dz = (basePos[i * 3 + 2] - hz) * scaleZ;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < holeRad) {
            // Mathematically exact spherical depression depth: sqrt(R^2 - dist^2)
            const depth = Math.sqrt(holeRad * holeRad - dist * dist);

            // Calculate inward penetration vector into limb
            let inX = -nx / scaleX;
            let inY = -ny / scaleY;
            let inZ = -nz / scaleZ;
            let inLen = Math.sqrt(inX * inX + inY * inY + inZ * inZ);
            if (inLen < 0.0001) {
              if (hole.dir) {
                inX = hole.dir.x;
                inY = hole.dir.y;
                inZ = hole.dir.z;
              } else {
                inX = vx - hx;
                inY = vy - hy;
                inZ = vz - hz;
              }
              inLen = Math.sqrt(inX * inX + inY * inY + inZ * inZ);
            }

            if (inLen > 0.0001 && depth > maxCavityDepth) {
              maxCavityDepth = depth;
              carveUx = inX / inLen;
              carveUy = inY / inLen;
              carveUz = inZ / inLen;
            }

            const stain = 1.0 - (dist / holeRad);
            if (stain > maxStain) maxStain = stain;
          }
        }

        // Evaluate continuous joining between consecutive spheres in the chain
        if (spheresToTest.length > 1) {
          for (let sIdx = 0; sIdx < spheresToTest.length - 1; sIdx++) {
            const sA = spheresToTest[sIdx];
            const sB = spheresToTest[sIdx + 1];
            const pX = (basePos[i * 3] - sA.pos.x) * scaleX;
            const pY = (basePos[i * 3 + 1] - sA.pos.y) * scaleY;
            const pZ = (basePos[i * 3 + 2] - sA.pos.z) * scaleZ;
            const segX = (sB.pos.x - sA.pos.x) * scaleX;
            const segY = (sB.pos.y - sA.pos.y) * scaleY;
            const segZ = (sB.pos.z - sA.pos.z) * scaleZ;
            const segLenSq = segX * segX + segY * segY + segZ * segZ;
            if (segLenSq > 0.000001) {
              const u = THREE.MathUtils.clamp((pX * segX + pY * segY + pZ * segZ) / segLenSq, 0, 1);
              const qX = pX - segX * u;
              const qY = pY - segY * u;
              const qZ = pZ - segZ * u;
              const segDist = Math.sqrt(qX * qX + qY * qY + qZ * qZ);
              const segRad = THREE.MathUtils.lerp(sA.radius, sB.radius, u);
              if (segDist < segRad) {
                const depth = Math.sqrt(segRad * segRad - segDist * segDist);
                let inX = -nx / scaleX;
                let inY = -ny / scaleY;
                let inZ = -nz / scaleZ;
                let inLen = Math.sqrt(inX * inX + inY * inY + inZ * inZ);
                if (inLen < 0.0001) {
                  if (hole.dir) {
                    inX = hole.dir.x;
                    inY = hole.dir.y;
                    inZ = hole.dir.z;
                  }
                  inLen = Math.sqrt(inX * inX + inY * inY + inZ * inZ);
                }
                if (inLen > 0.0001 && depth > maxCavityDepth) {
                  maxCavityDepth = depth;
                  carveUx = inX / inLen;
                  carveUy = inY / inLen;
                  carveUz = inZ / inLen;
                }
                const stain = 1.0 - (segDist / segRad);
                if (stain > maxStain) maxStain = stain;
              }
            }
          }
        }
      }

      if (maxCavityDepth > 0) {
        vx += carveUx * (maxCavityDepth / scaleX);
        vy += carveUy * (maxCavityDepth / scaleY);
        vz += carveUz * (maxCavityDepth / scaleZ);
      }

      if (!isNaN(vx) && !isNaN(vy) && !isNaN(vz)) {
        posAttr.setXYZ(i, vx, vy, vz);
      }

      // Dark red wound flesh inside spherical hole
      if (colorAttr && baseCol) {
        if (maxStain > 0.01) {
          const stainK = Math.min(1.0, Math.pow(maxStain, 1.2) * 1.5);
          const r = THREE.MathUtils.lerp(baseCol[i * 3], 0.16, stainK);
          const g = THREE.MathUtils.lerp(baseCol[i * 3 + 1], 0.02, stainK);
          const b = THREE.MathUtils.lerp(baseCol[i * 3 + 2], 0.02, stainK);
          colorAttr.setXYZ(i, r, g, b);
        } else {
          colorAttr.setXYZ(i, baseCol[i * 3], baseCol[i * 3 + 1], baseCol[i * 3 + 2]);
        }
      }
    }

    posAttr.needsUpdate = true;
    if (colorAttr) colorAttr.needsUpdate = true;
    geom.computeVertexNormals();
  } catch (err) {
    console.warn('applyHoleMorphToMesh non-fatal error:', err);
  }
}

/**
 * Paints the internal cavity lining and entrance rim of anatomical tubes and organs
 * (urethra tube, vaginal canal, anus pink tube, sphincter hole, glans meatus, mouth/throat tube)
 * using vertex colors, mirroring the wound vertex-painting system.
 */
export function applyInternalAnatomyPainting(
  mesh: THREE.Mesh,
  options: {
    innerColorHex?: number;
    outerRimColorHex?: number;
    entrancePos?: THREE.Vector3;
    entranceDir?: THREE.Vector3;
    entranceRadius?: number;
    isPassThroughTube?: boolean;
    darkenDepth?: boolean;
  } = {}
) {
  if (!mesh || !(mesh instanceof THREE.Mesh) || !mesh.geometry) return;
  const geom = mesh.geometry as THREE.BufferGeometry;
  const posAttr = geom.attributes.position;
  if (!posAttr) return;

  const count = posAttr.count;
  const innerCol = new THREE.Color(options.innerColorHex ?? 0x881337);
  const outerCol = new THREE.Color(options.outerRimColorHex ?? 0xf43f5e);

  const colors = new Float32Array(count * 3);

  geom.computeBoundingBox();
  const bbox = geom.boundingBox || new THREE.Box3(new THREE.Vector3(-0.02, -0.05, -0.02), new THREE.Vector3(0.02, 0.05, 0.02));
  const minPos = bbox.min;
  const maxPos = bbox.max;
  const centerPos = new THREE.Vector3().addVectors(minPos, maxPos).multiplyScalar(0.5);

  const tubeLen = Math.max(0.001, maxPos.y - minPos.y);
  const tubeRad = Math.max(0.001, (maxPos.x - minPos.x + maxPos.z - minPos.z) * 0.25);

  for (let i = 0; i < count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);

    const distFromAxis = Math.sqrt((x - centerPos.x) ** 2 + (z - centerPos.z) ** 2);
    const normDepth = THREE.MathUtils.clamp((y - minPos.y) / tubeLen, 0, 1);
    const isInnerLining = distFromAxis < tubeRad * 0.95;

    let vertCol: THREE.Color;
    if (options.isPassThroughTube) {
      if (isInnerLining) {
        vertCol = innerCol.clone().lerp(new THREE.Color(0x450a0a), 0.35 + 0.45 * Math.sin(normDepth * Math.PI));
      } else {
        vertCol = outerCol.clone().lerp(innerCol, normDepth * 0.6);
      }
    } else if (options.entrancePos) {
      const distToEntrance = new THREE.Vector3(x, y, z).distanceTo(options.entrancePos);
      const rad = options.entranceRadius || 0.015;
      const t = THREE.MathUtils.clamp(distToEntrance / (rad * 2.0), 0, 1);
      vertCol = outerCol.clone().lerp(innerCol, t);
    } else {
      const t = THREE.MathUtils.clamp(distFromAxis / tubeRad, 0, 1);
      vertCol = innerCol.clone().lerp(outerCol, t);
    }

    colors[i * 3] = vertCol.r;
    colors[i * 3 + 1] = vertCol.g;
    colors[i * 3 + 2] = vertCol.b;
  }

  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  if (mesh.material) {
    if (Array.isArray(mesh.material)) {
      for (const m of mesh.material) {
        m.vertexColors = true;
        m.needsUpdate = true;
      }
    } else {
      mesh.material.vertexColors = true;
      mesh.material.needsUpdate = true;
    }
  }
}

/**
 * Dynamic in-place vertex spherization of cubic voxel blocks
 */
export function applyVoxelSpheriness(mesh: THREE.Mesh, level: number) {
  if (!mesh.userData || !mesh.userData.basePositions) return;

  const basePos = mesh.userData.basePositions as Float32Array;
  if (mesh.userData.voxelShape === 'cube') {
    const geom = mesh.geometry as THREE.BufferGeometry;
    const posAttr = geom.attributes.position;
    const count = posAttr.count;
    for (let i = 0; i < count; i++) {
      posAttr.setXYZ(i, basePos[i * 3], basePos[i * 3 + 1], basePos[i * 3 + 2]);
    }
    posAttr.needsUpdate = true;
    geom.computeVertexNormals();
    return;
  }

  let t = Math.max(0, Math.min(100, level)) / 100.0;
  const w = mesh.userData.w as number;
  const h = mesh.userData.h as number;
  const d = mesh.userData.d as number;

  const geom = mesh.geometry as THREE.BufferGeometry;
  const posAttr = geom.attributes.position;
  const count = posAttr.count;

  for (let i = 0; i < count; i++) {
    const bx = basePos[i * 3];
    const by = basePos[i * 3 + 1];
    const bz = basePos[i * 3 + 2];

    const nx = bx / (w / 2 || 0.001);
    const ny = by / (h / 2 || 0.001);
    const nz = bz / (d / 2 || 0.001);

    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 0.001;

    const sx = (nx / len) * (w / 2);
    const sy = (ny / len) * (h / 2);
    const sz = (nz / len) * (d / 2);

    const scaleFactor = 1.08 + 0.15 * t;

    const fx = THREE.MathUtils.lerp(bx, sx * scaleFactor, t);
    const fy = THREE.MathUtils.lerp(by, sy * scaleFactor, t);
    const fz = THREE.MathUtils.lerp(bz, sz * scaleFactor, t);

    posAttr.setXYZ(i, fx, fy, fz);
  }

  posAttr.needsUpdate = true;
  geom.computeVertexNormals();
}

/**
 * Procedurally adds or updates human/wolf ears to the head of a character.
 */
export function addEarsToHead(ragdoll: Ragdoll3D) {
  const cabeza = ragdoll.particles.find((p) => p.name === 'cabeza');
  if (!cabeza || !cabeza.voxelsGroup) return;

  const existingEars = cabeza.voxelsGroup.getObjectByName('EarsGroup');
  if (existingEars) {
    cabeza.voxelsGroup.remove(existingEars);
    existingEars.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material?.dispose();
      }
    });
  }

  const earsGroup = new THREE.Group();
  earsGroup.name = 'EarsGroup';

  const scale = ragdoll.scale ?? 1.0;
  const isWolf = !!ragdoll.isWerewolf;

  const skinMat = new THREE.MeshStandardMaterial({
    color: ragdoll.skinColorHex ?? 0xefb08c,
    roughness: 0.5,
    metalness: 0.05,
  });

  const innerEarMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6, // Pink inside ear
    roughness: 0.5,
    metalness: 0.05,
  });

  if (isWolf) {
    const furColor = ragdoll.skinColorHex ?? 0x5c4033;
    
    // 1. CUBIC wolf ears (base & pointy blocks) using multi-voxel limb grids
    // Left Ear
    const ew = 0.04 * scale;
    const eh = 0.10 * scale;
    const ed = 0.03 * scale;

    const leftEarPoint = createMultiVoxelLimb('dedo_pulgar_izq' as BodyPartName, ew, eh, ed, furColor, ragdoll.voxelShape, 0, 2).voxelsGroup;
    leftEarPoint.position.set(-0.08 * scale, 0.16 * scale, -0.02 * scale);
    leftEarPoint.rotation.z = 0.25;
    earsGroup.add(leftEarPoint);

    const leftInnerEar = createMultiVoxelLimb('dedo_pulgar_izq' as BodyPartName, 0.02 * scale, 0.07 * scale, 0.01 * scale, 0xf472b6, ragdoll.voxelShape, 0, 2).voxelsGroup;
    leftInnerEar.position.set(-0.08 * scale, 0.16 * scale, 0.005 * scale);
    leftInnerEar.rotation.z = 0.25;
    earsGroup.add(leftInnerEar);

    // Wolf Left Ear Pseudo-3D contour layer
    const leftEarContour = createPseudo3DContourMesh('cabeza', ew, eh, ed, ragdoll.sphericalContourLevel, furColor);
    leftEarContour.name = 'LeftEarPseudoContour';
    leftEarContour.position.copy(leftEarPoint.position);
    leftEarContour.rotation.z = leftEarPoint.rotation.z;
    earsGroup.add(leftEarContour);
    cabeza.leftEarContourMesh = leftEarContour;

    // Right Ear
    const rightEarPoint = createMultiVoxelLimb('dedo_pulgar_izq' as BodyPartName, ew, eh, ed, furColor, ragdoll.voxelShape, 0, 2).voxelsGroup;
    rightEarPoint.position.set(0.08 * scale, 0.16 * scale, -0.02 * scale);
    rightEarPoint.rotation.z = -0.25;
    earsGroup.add(rightEarPoint);

    const rightInnerEar = createMultiVoxelLimb('dedo_pulgar_izq' as BodyPartName, 0.02 * scale, 0.07 * scale, 0.01 * scale, 0xf472b6, ragdoll.voxelShape, 0, 2).voxelsGroup;
    rightInnerEar.position.set(0.08 * scale, 0.16 * scale, 0.005 * scale);
    rightInnerEar.rotation.z = -0.25;
    earsGroup.add(rightInnerEar);

    // Wolf Right Ear Pseudo-3D contour layer
    const rightEarContour = createPseudo3DContourMesh('cabeza', ew, eh, ed, ragdoll.sphericalContourLevel, furColor);
    rightEarContour.name = 'RightEarPseudoContour';
    rightEarContour.position.copy(rightEarPoint.position);
    rightEarContour.rotation.z = rightEarPoint.rotation.z;
    earsGroup.add(rightEarContour);
    cabeza.rightEarContourMesh = rightEarContour;

    // 2. DUAL HEARING SPHERES - One on each ear
    const sphereGeom = new THREE.SphereGeometry(0.35 * scale, 12, 12);

    const leftSphereMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.15,
      wireframe: true,
      depthWrite: false,
    });
    const leftHearingSphere = new THREE.Mesh(sphereGeom, leftSphereMat);
    leftHearingSphere.name = 'HearingSphereLeftMesh';
    leftHearingSphere.position.copy(leftEarPoint.position);
    leftHearingSphere.visible = false;
    earsGroup.add(leftHearingSphere);
    cabeza.hearingSphereLeftMesh = leftHearingSphere;

    const rightSphereMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.15,
      wireframe: true,
      depthWrite: false,
    });
    const rightHearingSphere = new THREE.Mesh(sphereGeom, rightSphereMat);
    rightHearingSphere.name = 'HearingSphereRightMesh';
    rightHearingSphere.position.copy(rightEarPoint.position);
    rightHearingSphere.visible = false;
    earsGroup.add(rightHearingSphere);
    cabeza.hearingSphereRightMesh = rightHearingSphere;

  } else {
    // 1. CUBIC human ears (normal size) using multi-voxel limb grids
    const ew = 0.02 * scale;
    const eh = 0.05 * scale;
    const ed = 0.03 * scale;

    const leftEarBlk = createMultiVoxelLimb('dedo_pulgar_izq' as BodyPartName, ew, eh, ed, ragdoll.skinColorHex ?? 0xefb08c, ragdoll.voxelShape, 0, 2).voxelsGroup;
    leftEarBlk.position.set(-0.155 * scale, 0.02 * scale, -0.01 * scale);
    earsGroup.add(leftEarBlk);

    const leftInnerEar = createMultiVoxelLimb('dedo_pulgar_izq' as BodyPartName, 0.01 * scale, 0.03 * scale, 0.015 * scale, 0xf472b6, ragdoll.voxelShape, 0, 2).voxelsGroup;
    leftInnerEar.position.set(-0.145 * scale, 0.02 * scale, -0.01 * scale);
    earsGroup.add(leftInnerEar);

    // Human Left Ear Pseudo-3D contour layer
    const leftEarContour = createPseudo3DContourMesh('cabeza', ew, eh, ed, ragdoll.sphericalContourLevel, ragdoll.skinColorHex ?? 0xefb08c);
    leftEarContour.name = 'LeftEarPseudoContour';
    leftEarContour.position.copy(leftEarBlk.position);
    earsGroup.add(leftEarContour);
    cabeza.leftEarContourMesh = leftEarContour;

    // Right Ear
    const rightEarBlk = createMultiVoxelLimb('dedo_pulgar_izq' as BodyPartName, ew, eh, ed, ragdoll.skinColorHex ?? 0xefb08c, ragdoll.voxelShape, 0, 2).voxelsGroup;
    rightEarBlk.position.set(0.155 * scale, 0.02 * scale, -0.01 * scale);
    earsGroup.add(rightEarBlk);

    const rightInnerEar = createMultiVoxelLimb('dedo_pulgar_izq' as BodyPartName, 0.01 * scale, 0.03 * scale, 0.015 * scale, 0xf472b6, ragdoll.voxelShape, 0, 2).voxelsGroup;
    rightInnerEar.position.set(0.145 * scale, 0.02 * scale, -0.01 * scale);
    earsGroup.add(rightInnerEar);

    // Human Right Ear Pseudo-3D contour layer
    const rightEarContour = createPseudo3DContourMesh('cabeza', ew, eh, ed, ragdoll.sphericalContourLevel, ragdoll.skinColorHex ?? 0xefb08c);
    rightEarContour.name = 'RightEarPseudoContour';
    rightEarContour.position.copy(rightEarBlk.position);
    earsGroup.add(rightEarContour);
    cabeza.rightEarContourMesh = rightEarContour;

    // 2. DUAL HEARING SPHERES - One on each ear
    const sphereGeom = new THREE.SphereGeometry(0.35 * scale, 12, 12);

    const leftSphereMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.15,
      wireframe: true,
      depthWrite: false,
    });
    const leftHearingSphere = new THREE.Mesh(sphereGeom, leftSphereMat);
    leftHearingSphere.name = 'HearingSphereLeftMesh';
    leftHearingSphere.position.copy(leftEarBlk.position);
    leftHearingSphere.visible = false;
    earsGroup.add(leftHearingSphere);
    cabeza.hearingSphereLeftMesh = leftHearingSphere;

    const rightSphereMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.15,
      wireframe: true,
      depthWrite: false,
    });
    const rightHearingSphere = new THREE.Mesh(sphereGeom, rightSphereMat);
    rightHearingSphere.name = 'HearingSphereRightMesh';
    rightHearingSphere.position.copy(rightEarBlk.position);
    rightHearingSphere.visible = false;
    earsGroup.add(rightHearingSphere);
    cabeza.hearingSphereRightMesh = rightHearingSphere;
  }

  cabeza.voxelsGroup.add(earsGroup);
}

/**
 * Updates the pseudo-3D spherical contour layer across all limbs on a ragdoll (0 to 100)
 */
export function updateRagdollSphericalContour(
  ragdoll: Ragdoll3D,
  level: number,
  enabled?: boolean,
  style?: 'pseudo3d' | 'blocky' | 'cylinder'
) {
  ragdoll.sphericalContourLevel = Math.max(0, Math.min(100, level));
  if (enabled !== undefined) {
    ragdoll.contourLayerEnabled = enabled;
  }
  if (style !== undefined) {
    ragdoll.contourJointStyle = style;
  }

  // Static zone / Cave Tentacle props must NEVER have joint sphere spheres ("esa pelotita") or contour overlays!
  if ((ragdoll as any).isStaticZone || ragdoll.name === 'Cave Tentacle' || ragdoll.id.startsWith('cave_tentacle')) {
    if (ragdoll.jointSpheres) {
      for (const s of ragdoll.jointSpheres) {
        if (s.parent) s.parent.remove(s);
        if (s.geometry) s.geometry.dispose();
      }
      ragdoll.jointSpheres = undefined;
    }
    if (ragdoll.jointBridges) {
      for (const b of ragdoll.jointBridges) {
        if (b.parent) b.parent.remove(b);
        if (b.geometry) b.geometry.dispose();
      }
      ragdoll.jointBridges = undefined;
    }
    return;
  }

  const currentCubicity = ragdoll.bodyCubicity !== undefined ? ragdoll.bodyCubicity : 24;
  const currentLimbMult = ragdoll.limbSizeMultiplier !== undefined ? ragdoll.limbSizeMultiplier : 1.0;
  const lastCubicity = (ragdoll as any).lastRenderedCubicity;
  const lastLimbMult = (ragdoll as any).lastRenderedLimbMult;

  if (lastCubicity !== currentCubicity || lastLimbMult !== currentLimbMult) {
    if (ragdoll.jointBridges) {
      for (const b of ragdoll.jointBridges) {
        if (b.parent) b.parent.remove(b);
        if (b.geometry) b.geometry.dispose();
        if (Array.isArray(b.material)) b.material.forEach((m: any) => m.dispose());
        else if (b.material) b.material.dispose();
      }
      ragdoll.jointBridges = undefined;
    }
    if (ragdoll.jointSpheres) {
      for (const s of ragdoll.jointSpheres) {
        if (s.parent) s.parent.remove(s);
        if (s.geometry) s.geometry.dispose();
        if (Array.isArray(s.material)) s.material.forEach((m: any) => m.dispose());
        else if (s.material) s.material.dispose();
      }
      ragdoll.jointSpheres = undefined;
    }
    (ragdoll as any).lastRenderedCubicity = currentCubicity;
    (ragdoll as any).lastRenderedLimbMult = currentLimbMult;
  }

  const radialSegs = Math.max(4, Math.min(24, Math.round(currentCubicity)));

  const currentStyle = ragdoll.contourJointStyle || 'cylinder';
  const isBlocky = currentStyle === 'blocky';
  const isCylinder = currentStyle === 'cylinder';

  // In blocky style, keep voxel shape strictly cubic without spheres or spherical smoothing
  if (isBlocky) {
    ragdoll.voxelShape = 'cube';
  }

  const isPseudo3DVisible = !isBlocky && !isCylinder && ragdoll.contourLayerEnabled;
  const isCylinderVisible = isCylinder && ragdoll.contourLayerEnabled && (!ragdoll.xrayMode || ragdoll.xrayMode === 0);
  const showIndividualContour = isPseudo3DVisible;

  const canonicalSkinColor = getRagdollSkinColor(ragdoll);
  ragdoll.skinColorHex = canonicalSkinColor;

  // Joint bridges (Cylinder connections uniting body parts across the entire body)
  if (ragdoll.jointBridges) {
    for (const b of ragdoll.jointBridges) {
      b.visible = isCylinderVisible;
      const c = b.userData.constraint;
      const strBridge = c ? (c.name + '_' + c.p1.name + '_' + c.p2.name).toLowerCase() : '';
      const isInternal = strBridge.includes('canal') || strBridge.includes('uterus') || strBridge.includes('utero') || strBridge.includes('ovary') || strBridge.includes('ovario');
      if (!isInternal && b.material instanceof THREE.MeshStandardMaterial) {
        const isShirtBridge = ragdoll.hasShirt && c && SHIRT_BODY_PARTS.has(c.p1.name) && SHIRT_BODY_PARTS.has(c.p2.name);
        const isPantsBridge = ragdoll.hasPants && c && PANTS_BODY_PARTS.has(c.p1.name) && PANTS_BODY_PARTS.has(c.p2.name);
        if (isShirtBridge) {
          b.material.color.setHex(ragdoll.shirtColorHex || 0x38bdf8);
        } else if (isPantsBridge) {
          b.material.color.setHex(ragdoll.pantsColorHex || 0x1e3a8a);
        } else {
          b.material.color.setHex(canonicalSkinColor);
        }
        b.material.roughness = 0.50;
        b.material.metalness = 0.05;
        b.material.needsUpdate = true;
      }
    }
  } else if (isCylinderVisible && ragdoll.constraints) {
    const jointBridges: THREE.Mesh[] = [];
    const bridgeMat = new THREE.MeshStandardMaterial({ 
      color: canonicalSkinColor, 
      roughness: 0.50, 
      metalness: 0.05, 
      side: THREE.DoubleSide,
      depthWrite: true,
    });
    for (const c of ragdoll.constraints) {
      if (c.name.includes('ancho') || c.name.includes('stabilizer') || c.name.includes('extension')) continue;
      const bridgeGeom = new THREE.CylinderGeometry(1, 1, 1, radialSegs, radialSegs, false);
      const mat = bridgeMat.clone();

      let c1 = new THREE.Color(canonicalSkinColor);
      const strBridge = (c.name + '_' + c.p1.name + '_' + c.p2.name).toLowerCase();
      if (
        strBridge.includes('canal') ||
        strBridge.includes('uterus') ||
        strBridge.includes('utero') ||
        strBridge.includes('ovary') ||
        strBridge.includes('ovario')
      ) {
        c1.setHex(0xf43f5e);
      } else {
        // Force all body/limb extremity cylinders to be the same skin color as pelvis
        c1.setHex(canonicalSkinColor);
      }
      mat.color.copy(c1);

      const bridge = new THREE.Mesh(bridgeGeom, mat);
      bridge.userData = { constraint: c, p1: c.p1, p2: c.p2 };
      bridge.name = 'Bridge_' + c.name;
      bridge.renderOrder = 4;
      bridge.visible = true;
      if (ragdoll.groupMesh) {
        ragdoll.groupMesh.add(bridge);
      } else if (ragdoll.particles[0] && ragdoll.particles[0].mesh && ragdoll.particles[0].mesh.parent) {
        ragdoll.particles[0].mesh.parent.add(bridge);
      }
      jointBridges.push(bridge);
    }
    ragdoll.jointBridges = jointBridges;
  }

  // Joint spheres (Seamless ball joint nodes connecting adjacent cylinders into one continuous body)
  if (ragdoll.jointSpheres) {
    for (const s of ragdoll.jointSpheres) {
      const p = s.userData?.particle;
      const pEmpty = p && p.voxelBlocks ? p.voxelBlocks.filter((bk: any) => bk.active).length === 0 : false;
      s.visible = isCylinderVisible && !pEmpty;
      if (s.material instanceof THREE.MeshStandardMaterial) {
        const strP = (p?.name || s.name).toLowerCase();
        const isInternal = strP.includes('canal') || strP.includes('uterus') || strP.includes('utero') || strP.includes('ovary') || strP.includes('ovario');
        if (!isInternal) {
          if (ragdoll.hasShirt && p && SHIRT_BODY_PARTS.has(p.name)) {
            s.material.color.setHex(ragdoll.shirtColorHex || 0x38bdf8);
          } else if (ragdoll.hasPants && p && PANTS_BODY_PARTS.has(p.name)) {
            s.material.color.setHex(ragdoll.pantsColorHex || 0x1e3a8a);
          } else {
            s.material.color.setHex(canonicalSkinColor);
          }
          s.material.roughness = 0.50;
          s.material.metalness = 0.05;
          s.material.needsUpdate = true;
        }
      }
    }
  } else if (isCylinderVisible && ragdoll.particles) {
    const jointSpheres: THREE.Mesh[] = [];
    const sphereMat = new THREE.MeshStandardMaterial({
      color: canonicalSkinColor,
      roughness: 0.50,
      metalness: 0.05,
      depthWrite: true,
    });
    const scale = ragdoll.scale || 1.0;
    for (const p of ragdoll.particles) {
      const pRadius = getPartBaseCylinderRadius(p.name, scale, currentLimbMult);
      const sphereGeom = new THREE.SphereGeometry(pRadius, radialSegs, radialSegs);
      const mat = sphereMat.clone();
      let col = new THREE.Color(canonicalSkinColor);
      const strP = p.name.toLowerCase();
      if (
        strP.includes('canal') ||
        strP.includes('uterus') ||
        strP.includes('utero') ||
        strP.includes('ovary') ||
        strP.includes('ovario')
      ) {
        col.setHex(0xf43f5e);
      } else {
        // Force all body/limb joint spheres to be the same skin color as pelvis
        col.setHex(canonicalSkinColor);
      }
      mat.color.copy(col);

      const strName = p.name.toLowerCase();
      const isMuslo = strName.includes('muslo');
      const isAntepierna = strName.includes('antepierna');
      const isElongated = (
        strName.includes('brazo') ||
        strName.includes('antebrazo') ||
        strName === 'torso'
      );

      const halfH = (p.boxDims ? p.boxDims[1] : 0.3) * 0.5 * scale;
      const offsets = (isElongated && strName === 'torso')
        ? [new THREE.Vector3(0, -halfH * 0.85, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, halfH * 0.85, 0)]
        : [new THREE.Vector3(0, 0, 0)];

      for (let sIdx = 0; sIdx < offsets.length; sIdx++) {
        const offset = offsets[sIdx];
        const sRadius = pRadius;
        const sGeom = new THREE.SphereGeometry(sRadius, radialSegs, radialSegs);
        const sphere = new THREE.Mesh(sGeom, mat.clone());
        sphere.userData = { particle: p, baseRadius: pRadius, localOffset: offset.clone(), isConnectedNode: sIdx > 0 };
        if (sIdx === 0 || offsets.length === 1) {
          (p as any).jointSphere = sphere;
        }
        sphere.name = `JointSphere_${p.name}_${sIdx}`;
        sphere.renderOrder = 4;
        sphere.position.set(p.x + offset.x, p.y + offset.y, p.z + offset.z);
        sphere.visible = true;
        if (ragdoll.groupMesh) {
          ragdoll.groupMesh.add(sphere);
        } else if (ragdoll.particles[0] && ragdoll.particles[0].mesh && ragdoll.particles[0].mesh.parent) {
          ragdoll.particles[0].mesh.parent.add(sphere);
        }
        jointSpheres.push(sphere);
      }

      // Add hip joint spheres (cadera) on lateral sides of pelvis for both legs (same as shoulders on chest)
      if (p.name === 'pelvis') {
        const hipRadius = getPartBaseCylinderRadius('cadera_izq', scale, currentLimbMult);
        const hipOffsets = [
          { name: 'cadera_izq', targetLimbName: 'muslo_izq', offset: new THREE.Vector3(-0.145 * scale, -0.04 * scale, 0) },
          { name: 'cadera_der', targetLimbName: 'muslo_der', offset: new THREE.Vector3(0.145 * scale, -0.04 * scale, 0) },
        ];
        for (const hip of hipOffsets) {
          const hGeom = new THREE.SphereGeometry(hipRadius, radialSegs, radialSegs);
          const hSphere = new THREE.Mesh(hGeom, mat.clone());
          hSphere.userData = { particle: p, baseRadius: hipRadius, localOffset: hip.offset.clone(), targetLimbName: hip.targetLimbName, isConnectedNode: true, name: hip.name };
          hSphere.name = `JointSphere_${hip.name}`;
          hSphere.renderOrder = 4;
          hSphere.position.set(p.x + hip.offset.x, p.y + hip.offset.y, p.z + hip.offset.z);
          hSphere.visible = true;
          if (ragdoll.groupMesh) {
            ragdoll.groupMesh.add(hSphere);
          } else if (ragdoll.particles[0] && ragdoll.particles[0].mesh && ragdoll.particles[0].mesh.parent) {
            ragdoll.particles[0].mesh.parent.add(hSphere);
          }
          jointSpheres.push(hSphere);
        }
      }
    }
    ragdoll.jointSpheres = jointSpheres;
  }

  // Keep skin mesh intact and continuous without joint gaps or holes
  for (const p of ragdoll.particles) {
    if (p.contourMesh && p.contourMesh instanceof THREE.Mesh) {
      const eyeHoles = p.contourMesh.userData.eyeHoles || [];
      const bulletHoles = p.contourMesh.userData.bulletHoles || [];
      p.contourMesh.userData.holes = [...eyeHoles, ...bulletHoles];
    }
  }

  const effectiveLevel = isBlocky ? 0 : ragdoll.sphericalContourLevel;

  for (const p of ragdoll.particles) {
    const activeBlocksCount = p.voxelBlocks ? p.voxelBlocks.filter((b) => b.active).length : 1;
    const hasLostAllBlocks = p.voxelBlocks ? activeBlocksCount === 0 : false;

    if (hasLostAllBlocks) {
      if (p.mesh) p.mesh.visible = false;
      if (p.contourMesh) p.contourMesh.visible = false;
      if (p.voxelsGroup) p.voxelsGroup.visible = false;
      if ((p as any).jointSphere) (p as any).jointSphere.visible = false;
      continue;
    }

    if (p.contourMesh) {
      p.contourMesh.visible = showIndividualContour;
      if (p.contourMesh instanceof THREE.Mesh) {
        p.contourMesh.userData.voxelShape = isBlocky ? 'cube' : ragdoll.voxelShape;
        applySphericalMorph(p.contourMesh, effectiveLevel, p, ragdoll);
      }
    }

    if (p.metaball3Mesh) {
      p.metaball3Mesh.visible = false;
    }

    if (p.mesh) {
      const shirtContour = p.mesh.getObjectByName('ShirtContourEnvelope');
      if (shirtContour instanceof THREE.Mesh) {
        shirtContour.visible = Boolean(ragdoll.hasShirt) && Boolean(ragdoll.contourLayerEnabled);
        shirtContour.userData.voxelShape = isBlocky ? 'cube' : ragdoll.voxelShape;
        applySphericalMorph(shirtContour, effectiveLevel, p, ragdoll);
      }
      const pantsContour = p.mesh.getObjectByName('PantsContourEnvelope');
      if (pantsContour instanceof THREE.Mesh) {
        pantsContour.visible = Boolean(ragdoll.hasPants) && Boolean(ragdoll.contourLayerEnabled);
        pantsContour.userData.voxelShape = isBlocky ? 'cube' : ragdoll.voxelShape;
        applySphericalMorph(pantsContour, effectiveLevel, p, ragdoll);
      }
    }

    if (p.voxelsGroup) {
      // In blocky mode, voxel blocks and their block division edges are distinctly visible
      p.voxelsGroup.visible = true;
      p.voxelsGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const cName = child.name || '';
          
          if (cName.includes('PubicHair') || cName.includes('PubicStrand') || cName.includes('hair_cyl')) {
            child.visible = Boolean(ragdoll.pubicHairEnabled);
            return;
          }

          // Face voxel block blocks that must be hidden under rounded pseudo/cylinder mode
          const isFaceVoxelBlock = 
            cName.includes('ojo_voxel') || 
            cName.includes('mouth_ext') || 
            cName.includes('eye_left') || 
            cName.includes('eye_right') || 
            cName.includes('boca_zombie') || 
            cName.includes('dientes_zombie');

          if (isFaceVoxelBlock) {
            child.visible = isBlocky || !ragdoll.contourLayerEnabled;
            return;
          }

          const isPseudoMesh =
            cName.includes('pseudo') ||
            cName.startsWith('female_flat_contour_') ||
            !!(child.userData && child.userData.isPseudo3DSpherical);

          if (isPseudoMesh) {
            if (cName.includes('tetilla') || cName.includes('nipple')) {
              child.visible = false;
              return;
            }
            const isFacePseudo = cName.includes('ojo_pseudo') || cName.includes('boca_pseudo');
            const isFacePseudoVisible = !isBlocky && ragdoll.contourLayerEnabled;
            child.visible = isFacePseudo ? isFacePseudoVisible : isPseudo3DVisible;
            if (child.visible && !isFacePseudo) {
              child.userData.voxelShape = isBlocky ? 'cube' : ragdoll.voxelShape;
              applySphericalMorph(child, effectiveLevel, p, ragdoll);
            }
          } else {
            child.visible = true;
            child.userData.voxelShape = isBlocky ? 'cube' : (ragdoll.voxelShape || child.userData.voxelShape || 'cube');
            applyVoxelSpheriness(child, effectiveLevel);
          }
        }
      });
    }

    if (p.name === 'cabeza') {
      if (p.leftEarContourMesh) {
        p.leftEarContourMesh.visible = isPseudo3DVisible;
        p.leftEarContourMesh.userData.voxelShape = isBlocky ? 'cube' : ragdoll.voxelShape;
        applySphericalMorph(p.leftEarContourMesh, effectiveLevel, p, ragdoll);
      }
      if (p.rightEarContourMesh) {
        p.rightEarContourMesh.visible = isPseudo3DVisible;
        p.rightEarContourMesh.userData.voxelShape = isBlocky ? 'cube' : ragdoll.voxelShape;
        applySphericalMorph(p.rightEarContourMesh, effectiveLevel, p, ragdoll);
      }
    }
  }

  addEarsToHead(ragdoll);
  addEyesToHead(ragdoll);
  addHairAndAccessoriesToHead(ragdoll);
}
/**
 * Procedurally cleans old 3D procedural eye/mouth meshes and sets up both the 3D voxel face and 2D Anime Canvas face.
 */
export function addEyesToHead(ragdoll: Ragdoll3D) {
  setupAnimeFace(ragdoll);
  setupVoxel3DFace(ragdoll);
}

export function addHairAndAccessoriesToHead(ragdoll: Ragdoll3D) {
  const cabeza = ragdoll.particles.find((p) => p.name === 'cabeza');
  if (!cabeza || !cabeza.voxelsGroup) return;

  // Clean existing flower physics particles and constraints
  cleanupAnatomyParticles(ragdoll, [
    'flower_stem_0',
    'flower_stem_1',
    'flower_blossom',
    'flower_petal_l',
    'flower_petal_r'
  ]);

  // Clean existing groups
  const existingHair = cabeza.voxelsGroup.getObjectByName('HairGroup');
  if (existingHair) cabeza.voxelsGroup.remove(existingHair);
  const existingBeard = cabeza.voxelsGroup.getObjectByName('BeardGroup');
  if (existingBeard) cabeza.voxelsGroup.remove(existingBeard);
  const existingHat = cabeza.voxelsGroup.getObjectByName('HatGroup');
  if (existingHat) cabeza.voxelsGroup.remove(existingHat);
  const existingGlasses = cabeza.voxelsGroup.getObjectByName('GlassesGroup');
  if (existingGlasses) cabeza.voxelsGroup.remove(existingGlasses);

  const scale = ragdoll.scale ?? 1.0;

  // Retrieve customized types and colors
  const hairType = (ragdoll as any).hairType || 'none';
  const hairColorHex = (ragdoll as any).hairColorHex ?? 0x1c1917;
  const beardType = (ragdoll as any).beardType || 'none';
  const beardColorHex = (ragdoll as any).beardColorHex ?? 0x1c1917;
  const hatType = (ragdoll as any).hatType || 'none';
  const hatColorHex = (ragdoll as any).hatColorHex ?? 0xdc2626;
  const glassesType = (ragdoll as any).glassesType || 'none';
  const glassesColorHex = (ragdoll as any).glassesColorHex ?? 0x0f172a;

  const hairMaterial = new THREE.MeshStandardMaterial({ color: hairColorHex, roughness: 0.8, metalness: 0.1 });
  const beardMaterial = new THREE.MeshStandardMaterial({ color: beardColorHex, roughness: 0.8, metalness: 0.1 });
  const hatMaterial = new THREE.MeshStandardMaterial({ color: hatColorHex, roughness: 0.7, metalness: 0.2 });
  const glassesMaterial = new THREE.MeshStandardMaterial({ color: glassesColorHex, roughness: 0.2, metalness: 0.8 });

  // 1. HAIR GROUP
  if (hairType !== 'none') {
    const hairGroup = new THREE.Group();
    hairGroup.name = 'HairGroup';

    if (hairType === 'short') {
      // Top cap
      const topCap = new THREE.Mesh(new THREE.BoxGeometry(0.19 * scale, 0.04 * scale, 0.19 * scale), hairMaterial);
      topCap.position.set(0, 0.09 * scale, 0);
      hairGroup.add(topCap);
      // Sides
      const leftSide = new THREE.Mesh(new THREE.BoxGeometry(0.02 * scale, 0.07 * scale, 0.19 * scale), hairMaterial);
      leftSide.position.set(0.095 * scale, 0.05 * scale, 0);
      const rightSide = new THREE.Mesh(new THREE.BoxGeometry(0.02 * scale, 0.07 * scale, 0.19 * scale), hairMaterial);
      rightSide.position.set(-0.095 * scale, 0.05 * scale, 0);
      hairGroup.add(leftSide, rightSide);
    } else if (hairType === 'long') {
      // Top cap
      const topCap = new THREE.Mesh(new THREE.BoxGeometry(0.19 * scale, 0.04 * scale, 0.19 * scale), hairMaterial);
      topCap.position.set(0, 0.09 * scale, 0);
      hairGroup.add(topCap);
      // Back flow
      const backFlow = new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 0.15 * scale, 0.03 * scale), hairMaterial);
      backFlow.position.set(0, 0.01 * scale, -0.095 * scale);
      hairGroup.add(backFlow);
      // Sides
      const leftSide = new THREE.Mesh(new THREE.BoxGeometry(0.02 * scale, 0.12 * scale, 0.17 * scale), hairMaterial);
      leftSide.position.set(0.095 * scale, 0.02 * scale, 0.01 * scale);
      const rightSide = new THREE.Mesh(new THREE.BoxGeometry(0.02 * scale, 0.12 * scale, 0.17 * scale), hairMaterial);
      rightSide.position.set(-0.095 * scale, 0.02 * scale, 0.01 * scale);
      hairGroup.add(leftSide, rightSide);
    } else if (hairType === 'mohawk') {
      // Center mohawk strip
      const mohawk = new THREE.Mesh(new THREE.BoxGeometry(0.04 * scale, 0.06 * scale, 0.22 * scale), hairMaterial);
      mohawk.position.set(0, 0.11 * scale, -0.01 * scale);
      hairGroup.add(mohawk);
    } else if (hairType === 'afro') {
      const afroBox = new THREE.Mesh(new THREE.BoxGeometry(0.23 * scale, 0.14 * scale, 0.23 * scale), hairMaterial);
      afroBox.position.set(0, 0.07 * scale, 0);
      hairGroup.add(afroBox);
    } else if (hairType === 'spiky') {
      // Base top cap
      const topCap = new THREE.Mesh(new THREE.BoxGeometry(0.19 * scale, 0.04 * scale, 0.19 * scale), hairMaterial);
      topCap.position.set(0, 0.09 * scale, 0);
      hairGroup.add(topCap);
      // Spikes
      for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.025 * scale, 0.06 * scale, 4), hairMaterial);
          spike.position.set(i * 0.04 * scale, 0.12 * scale, j * 0.04 * scale);
          spike.rotation.set(Math.random() * 0.2 - 0.1, 0, Math.random() * 0.2 - 0.1);
          hairGroup.add(spike);
        }
      }
    }
    cabeza.voxelsGroup.add(hairGroup);
  }

  // 2. BEARD GROUP
  if (beardType !== 'none') {
    const beardGroup = new THREE.Group();
    beardGroup.name = 'BeardGroup';

    if (beardType === 'stubble') {
      const chinBeard = new THREE.Mesh(new THREE.BoxGeometry(0.17 * scale, 0.04 * scale, 0.015 * scale), beardMaterial);
      chinBeard.position.set(0, -0.075 * scale, 0.088 * scale);
      beardGroup.add(chinBeard);
    } else if (beardType === 'full') {
      const mainBeard = new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 0.08 * scale, 0.03 * scale), beardMaterial);
      mainBeard.position.set(0, -0.06 * scale, 0.085 * scale);
      const jawLeft = new THREE.Mesh(new THREE.BoxGeometry(0.02 * scale, 0.08 * scale, 0.15 * scale), beardMaterial);
      jawLeft.position.set(0.091 * scale, -0.04 * scale, 0);
      const jawRight = new THREE.Mesh(new THREE.BoxGeometry(0.02 * scale, 0.08 * scale, 0.15 * scale), beardMaterial);
      jawRight.position.set(-0.091 * scale, -0.04 * scale, 0);
      beardGroup.add(mainBeard, jawLeft, jawRight);
    } else if (beardType === 'mustache') {
      const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 0.02 * scale, 0.015 * scale), beardMaterial);
      mustache.position.set(0, -0.04 * scale, 0.088 * scale);
      beardGroup.add(mustache);
    } else if (beardType === 'goatee') {
      const chinGoatee = new THREE.Mesh(new THREE.BoxGeometry(0.06 * scale, 0.05 * scale, 0.025 * scale), beardMaterial);
      chinGoatee.position.set(0, -0.075 * scale, 0.085 * scale);
      const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 0.02 * scale, 0.015 * scale), beardMaterial);
      mustache.position.set(0, -0.04 * scale, 0.088 * scale);
      beardGroup.add(chinGoatee, mustache);
    }
    cabeza.voxelsGroup.add(beardGroup);
  }

  // 3. HAT GROUP
  if (hatType !== 'none') {
    const hatGroup = new THREE.Group();
    hatGroup.name = 'HatGroup';

    if (hatType === 'cap') {
      // Dome
      const dome = new THREE.Mesh(new THREE.BoxGeometry(0.20 * scale, 0.06 * scale, 0.20 * scale), hatMaterial);
      dome.position.set(0, 0.10 * scale, -0.01 * scale);
      // Brim
      const brim = new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 0.012 * scale, 0.09 * scale), hatMaterial);
      brim.position.set(0, 0.08 * scale, 0.13 * scale);
      hatGroup.add(dome, brim);
    } else if (hatType === 'police') {
      const dome = new THREE.Mesh(new THREE.BoxGeometry(0.22 * scale, 0.05 * scale, 0.22 * scale), hatMaterial);
      dome.position.set(0, 0.10 * scale, 0);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.19 * scale, 0.01 * scale, 0.05 * scale), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 }));
      visor.position.set(0, 0.08 * scale, 0.12 * scale);
      // Badge
      const badge = new THREE.Mesh(new THREE.BoxGeometry(0.025 * scale, 0.025 * scale, 0.01 * scale), new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.9 }));
      badge.position.set(0, 0.095 * scale, 0.111 * scale);
      hatGroup.add(dome, visor, badge);
    } else if (hatType === 'military') {
      const dome = new THREE.Mesh(new THREE.BoxGeometry(0.21 * scale, 0.09 * scale, 0.21 * scale), hatMaterial);
      dome.position.set(0, 0.09 * scale, 0);
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 0.01 * scale, 0.18 * scale), new THREE.MeshStandardMaterial({ color: 0x27272a }));
      strap.position.set(0, 0.05 * scale, 0);
      hatGroup.add(dome, strap);
    } else if (hatType === 'cowboy') {
      // Crown
      const crown = new THREE.Mesh(new THREE.BoxGeometry(0.16 * scale, 0.08 * scale, 0.18 * scale), hatMaterial);
      crown.position.set(0, 0.13 * scale, 0);
      // Brim
      const brim = new THREE.Mesh(new THREE.BoxGeometry(0.30 * scale, 0.015 * scale, 0.32 * scale), hatMaterial);
      brim.position.set(0, 0.09 * scale, 0);
      hatGroup.add(crown, brim);
    } else if (hatType === 'beanie') {
      const beanie = new THREE.Mesh(new THREE.BoxGeometry(0.20 * scale, 0.10 * scale, 0.20 * scale), hatMaterial);
      beanie.position.set(0, 0.09 * scale, 0);
      const pompom = new THREE.Mesh(new THREE.BoxGeometry(0.04 * scale, 0.04 * scale, 0.04 * scale), new THREE.MeshStandardMaterial({ color: 0xffffff }));
      pompom.position.set(0, 0.15 * scale, 0);
      hatGroup.add(beanie, pompom);
    } else if (hatType === 'flower_pink' || hatType === 'flower' || hatType === 'rose' || hatType === 'flower_rose') {
      const flowerGroup = new THREE.Group();
      flowerGroup.name = 'FlowerAccessoryGroup';

      const stemMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6, metalness: 0.1 });
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5, metalness: 0.1 });
      const petalMat = new THREE.MeshStandardMaterial({ color: hatColorHex || 0xf472b6, roughness: 0.35, metalness: 0.1 });
      const coreMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.2 });

      // 1. Stem ("palo como genital M") - Stacked cubic blocks
      const stemW = 0.034 * scale;
      const stemH = 0.045 * scale;
      const stemD = 0.034 * scale;
      const numSegments = 4;
      const stemTotalHeight = numSegments * stemH;
      const stemStartY = 0.085 * scale;

      for (let s = 0; s < numSegments; s++) {
        const segMesh = new THREE.Mesh(new THREE.BoxGeometry(stemW, stemH * 0.96, stemD), stemMat);
        segMesh.position.set(0, stemStartY + (s + 0.5) * stemH, 0);
        segMesh.name = `flower_stem_block_${s}`;
        flowerGroup.add(segMesh);
      }

      // Stem Pseudo-3D cylindrical layer ("pseudos como genital palo")
      const stemPseudoGeom = new THREE.CylinderGeometry(stemW * 0.55 * 1.15, stemW * 0.55 * 1.15, stemTotalHeight, 16, 1);
      const stemPseudo = new THREE.Mesh(stemPseudoGeom, stemMat.clone());
      stemPseudo.position.set(0, stemStartY + stemTotalHeight * 0.5, 0);
      stemPseudo.name = 'flower_stem_pseudo';
      stemPseudo.renderOrder = 17;
      stemPseudo.visible = Boolean(ragdoll.contourLayerEnabled);
      flowerGroup.add(stemPseudo);

      // Leaves on the stem (small cubic leaf blocks)
      const leafL = new THREE.Mesh(new THREE.BoxGeometry(0.065 * scale, 0.014 * scale, 0.038 * scale), leafMat);
      leafL.position.set(0.042 * scale, stemStartY + stemTotalHeight * 0.45, 0);
      leafL.rotation.z = -0.28;
      const leafR = new THREE.Mesh(new THREE.BoxGeometry(0.065 * scale, 0.014 * scale, 0.038 * scale), leafMat);
      leafR.position.set(-0.042 * scale, stemStartY + stemTotalHeight * 0.65, 0);
      leafR.rotation.z = 0.28;
      flowerGroup.add(leafL, leafR);

      // 2. Rose Flower Blossom ("flor cubica de bloques tambien, muy plano y tenga pseudos esfera")
      const blossomY = stemStartY + stemTotalHeight + 0.010 * scale;
      const blossomGroup = new THREE.Group();
      blossomGroup.name = 'FlowerBlossomGroup';
      blossomGroup.position.set(0, blossomY, 0);

      // Center core block
      const coreMesh = new THREE.Mesh(new THREE.BoxGeometry(0.044 * scale, 0.020 * scale, 0.044 * scale), coreMat);
      coreMesh.position.set(0, 0, 0);
      blossomGroup.add(coreMesh);

      // Center sphere pseudo (flattened into flat disc/spherical contour)
      const corePseudoGeom = new THREE.SphereGeometry(0.026 * scale, 16, 16);
      const corePseudo = new THREE.Mesh(corePseudoGeom, coreMat.clone());
      corePseudo.scale.set(1.0, 0.32, 1.0); // muy plano
      corePseudo.name = 'flower_core_pseudo';
      corePseudo.renderOrder = 18;
      corePseudo.visible = Boolean(ragdoll.contourLayerEnabled);
      blossomGroup.add(corePseudo);

      // Rose Petal Blocks (Very flat rose blossom)
      const petalThickness = 0.018 * scale; // Muy plano
      const innerPetalSize = 0.048 * scale;
      const outerPetalSize = 0.054 * scale;

      const innerPetalPositions: [number, number, number][] = [
        [0.038 * scale, 0, 0],
        [-0.038 * scale, 0, 0],
        [0, 0, 0.038 * scale],
        [0, 0, -0.038 * scale],
      ];

      for (const [px, py, pz] of innerPetalPositions) {
        const pBlock = new THREE.Mesh(new THREE.BoxGeometry(innerPetalSize, petalThickness, innerPetalSize), petalMat);
        pBlock.position.set(px, py, pz);
        blossomGroup.add(pBlock);

        // Petal pseudo-3D sphere layer (flattened into flat spherical contour)
        const pPseudoGeom = new THREE.SphereGeometry(innerPetalSize * 0.6, 16, 16);
        const pPseudo = new THREE.Mesh(pPseudoGeom, petalMat.clone());
        pPseudo.position.set(px, py, pz);
        pPseudo.scale.set(1.0, 0.30, 1.0); // muy plano
        pPseudo.name = 'flower_petal_pseudo';
        pPseudo.renderOrder = 18;
        pPseudo.visible = Boolean(ragdoll.contourLayerEnabled);
        blossomGroup.add(pPseudo);
      }

      // Outer diagonal petal blocks
      const outerPetalPositions: [number, number, number][] = [
        [0.050 * scale, -0.002 * scale, 0.050 * scale],
        [-0.050 * scale, -0.002 * scale, 0.050 * scale],
        [0.050 * scale, -0.002 * scale, -0.050 * scale],
        [-0.050 * scale, -0.002 * scale, -0.050 * scale],
      ];

      for (const [px, py, pz] of outerPetalPositions) {
        const pBlock = new THREE.Mesh(new THREE.BoxGeometry(outerPetalSize, petalThickness, outerPetalSize), petalMat);
        pBlock.position.set(px, py, pz);
        blossomGroup.add(pBlock);

        const pPseudoGeom = new THREE.SphereGeometry(outerPetalSize * 0.65, 16, 16);
        const pPseudo = new THREE.Mesh(pPseudoGeom, petalMat.clone());
        pPseudo.position.set(px, py, pz);
        pPseudo.scale.set(1.0, 0.28, 1.0); // muy plano
        pPseudo.name = 'flower_petal_pseudo_outer';
        pPseudo.renderOrder = 18;
        pPseudo.visible = Boolean(ragdoll.contourLayerEnabled);
        blossomGroup.add(pPseudo);
      }

      flowerGroup.add(blossomGroup);
      hatGroup.add(flowerGroup);

      // 3. Dynamic Ragdoll Tendon Physics
      const pStem0 = addAnatomyParticle(ragdoll, 'flower_stem_0', cabeza.x, cabeza.y + (stemStartY + stemH) * scale, cabeza.z, 0.12);
      const pStem1 = addAnatomyParticle(ragdoll, 'flower_stem_1', cabeza.x, cabeza.y + (stemStartY + stemTotalHeight * 0.65) * scale, cabeza.z, 0.10);
      const pBlossom = addAnatomyParticle(ragdoll, 'flower_blossom', cabeza.x, cabeza.y + (blossomY + 0.02) * scale, cabeza.z, 0.08);

      addAnatomyConstraint(ragdoll, cabeza, pStem0, 0.95, 2500, 'tendon_cabeza_flower_stem_0');
      addAnatomyConstraint(ragdoll, pStem0, pStem1, 0.92, 2200, 'tendon_flower_stem_0_1');
      addAnatomyConstraint(ragdoll, pStem1, pBlossom, 0.90, 2000, 'tendon_flower_stem_1_blossom');
      addAnatomyConstraint(ragdoll, cabeza, pBlossom, 0.72, 1800, 'tendon_flower_elastic_spine');
    }
    cabeza.voxelsGroup.add(hatGroup);
  }

  // 4. GLASSES GROUP
  if (glassesType !== 'none') {
    const glassesGroup = new THREE.Group();
    glassesGroup.name = 'GlassesGroup';

    if (glassesType === 'normal' || glassesType === 'sunglasses') {
      const frameColor = glassesType === 'normal' ? 0x1e293b : 0x020617;
      const lensColor = glassesType === 'normal' ? 0xffffff : 0x111111;
      const lensOpacity = glassesType === 'normal' ? 0.4 : 0.95;

      const frameMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.3 });
      const lensMat = new THREE.MeshStandardMaterial({ color: lensColor, roughness: 0.1, transparent: true, opacity: lensOpacity });

      // Frame
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.19 * scale, 0.04 * scale, 0.015 * scale), frameMat);
      frame.position.set(0, 0.015 * scale, 0.088 * scale);
      // Left Lens
      const leftLens = new THREE.Mesh(new THREE.BoxGeometry(0.065 * scale, 0.03 * scale, 0.01 * scale), lensMat);
      leftLens.position.set(0.045 * scale, 0.015 * scale, 0.09 * scale);
      // Right Lens
      const rightLens = new THREE.Mesh(new THREE.BoxGeometry(0.065 * scale, 0.03 * scale, 0.01 * scale), lensMat);
      rightLens.position.set(-0.045 * scale, 0.015 * scale, 0.09 * scale);
      // Sides
      const templeLeft = new THREE.Mesh(new THREE.BoxGeometry(0.01 * scale, 0.01 * scale, 0.10 * scale), frameMat);
      templeLeft.position.set(0.091 * scale, 0.015 * scale, 0.04 * scale);
      const templeRight = new THREE.Mesh(new THREE.BoxGeometry(0.01 * scale, 0.01 * scale, 0.10 * scale), frameMat);
      templeRight.position.set(-0.091 * scale, 0.015 * scale, 0.04 * scale);

      glassesGroup.add(frame, leftLens, rightLens, templeLeft, templeRight);
    } else if (glassesType === 'tactical') {
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 });
      const lensMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.1, transparent: true, opacity: 0.6, metalness: 0.8 });

      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 0.035 * scale, 0.02 * scale), lensMat);
      visor.position.set(0, 0.015 * scale, 0.09 * scale);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.19 * scale, 0.045 * scale, 0.015 * scale), frameMat);
      frame.position.set(0, 0.015 * scale, 0.088 * scale);

      glassesGroup.add(frame, visor);
    } else if (glassesType === 'cyberpunk') {
      const visorMat = new THREE.MeshStandardMaterial({ color: glassesColorHex, roughness: 0.1, emissive: glassesColorHex, emissiveIntensity: 1.5 });
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.19 * scale, 0.03 * scale, 0.025 * scale), visorMat);
      visor.position.set(0, 0.015 * scale, 0.09 * scale);
      glassesGroup.add(visor);
    }
    cabeza.voxelsGroup.add(glassesGroup);
  }
}

function createMultiVoxelLimb(
  name: BodyPartName,
  w: number,
  h: number,
  d: number,
  baseColor: number,
  voxelShape: 'cube' | 'sphere' = 'cube',
  spheriness: number = 0.85,
  densityLevel: number = 2
): { voxelsGroup: THREE.Group; voxelBlocks: LimbVoxelBlock[] } {
  const voxelsGroup = new THREE.Group();
  voxelsGroup.name = `VoxelsGroup_${name}`;
  const voxelBlocks: LimbVoxelBlock[] = [];

  // Normal cubic body blocks (isometric cubes, not elongated Jenga planks):
  const scaleFactor = Math.max(0.5, densityLevel / 2);
  const targetCubeSize = 0.08 / scaleFactor;
  let nx = Math.max(1, Math.round(w / targetCubeSize));
  let ny = Math.max(1, Math.round(h / targetCubeSize));
  let nz = Math.max(1, Math.round(d / targetCubeSize));

  // Overrides for specific anatomical features and terrain blocks (3x3 block division)
  if (
    name.includes('cesped2') ||
    name.includes('cesped') ||
    (name as string) === 'block_3x3' ||
    (!name.startsWith('dedo_') &&
    !name.startsWith('cama_') &&
    !name.includes('cola_') &&
    !name.includes('pared_') &&
    !name.includes('techo') &&
    !name.includes('piso') &&
    (name as string) !== 'pupila_l' && (name as string) !== 'pupila_r' &&
    (name as string) !== 'esophagus_segment' && (name as string) !== 'esophagus_torso_segment')
  ) {
    nx = 3;
    ny = 3;
    nz = 3;
  } else if (name.startsWith('dedo_pie_')) {
    nx = 1;
    ny = 1;
    nz = Math.max(1, Math.round(d / targetCubeSize));
  } else if (name.startsWith('dedo_')) {
    nx = 1;
    ny = Math.max(1, Math.round(h / targetCubeSize));
    nz = 1;
  } else if (name === 'cama_sabana' || name === 'cama_almohada') {
    nx = Math.max(2, Math.round(4 * scaleFactor));
    ny = 1;
    nz = Math.max(2, Math.round(4 * scaleFactor));
  } else if (name.includes('cola_seg') || name.includes('_seg')) {
    nx = Math.max(1, Math.round(2 * scaleFactor));
    ny = Math.max(2, Math.round(h / targetCubeSize));
    nz = Math.max(1, Math.round(2 * scaleFactor));
  }

  const vxW = w / nx;
  const vxH = h / ny;
  const vxD = d / nz;

  for (let ix = 0; ix < nx; ix++) {
    for (let iy = 0; iy < ny; iy++) {
      for (let iz = 0; iz < nz; iz++) {
        const lx = -w / 2 + (ix + 0.5) * vxW;
        const ly = -h / 2 + (iy + 0.5) * vxH;
        const lz = -d / 2 + (iz + 0.5) * vxD;
        const localPos = new THREE.Vector3(lx, ly, lz);

        // Removed head voxel socket carving per user request ("boca y ojos no tengan huecos mejor")

        // Spherical hollow filter: only spawn voxels near the outer boundary
        // Keeps the interior completely empty (hollow) and molds the outer shell into a beautiful spherical/rounded shape
        const dx = lx / (w / 2 || 0.001);
        const dy = ly / (h / 2 || 0.001);
        const dz = lz / (d / 2 || 0.001);
        const distSq = dx * dx + dy * dy + dz * dz;

        const isFaceFeatureHead = false;

        if (!isFaceFeatureHead && voxelShape !== 'cube') {
          const maxDist = 1.35; // Allow voxels slightly more outward to better fill the spherical shape
          const isBigTorso = name === 'torso' || name === 'pechobase' || name === 'ombligo' || name === 'pecho_bajo' || name === 'ombligo_bajo' || name === 'pelvis';
          const minHollowDist = isBigTorso ? 0.20 : 0.0; // Keep limbs solid so they can adapt to the skin perfectly
          if (distSq > maxDist || distSq < minHollowDist) {
            continue;
          }
        }

        let isMouthFront = false;
        let isMouthInterior = false;
        let isEyeFront = false;
        let isEyeInterior = false;

        const isHollowBodyPart =
          name === 'torso' ||
          name === 'pechobase' ||
          name === 'pecho_bajo' ||
          name === 'ombligo' ||
          name === 'ombligo_bajo' ||
          name === 'pelvis';

        const isContour =
          ix === 0 || ix === nx - 1 || iy === 0 || iy === ny - 1 || iz === 0 || iz === nz - 1;

        // Body interior hollow directive: "y que dentro del cuerpo torso,pechobase,ombligo,pelvis este hueco por adentro tambien hablo de bloques"
        if (isHollowBodyPart && !isContour) {
          continue; // Interior is completely hollow! Organs and cylinders are placed cleanly inside the hollow cavity.
        }

        // Open vertical passage on top and bottom faces at centerX, centerZ for the continuous organ tube connecting neck to stomach
        const centerX = Math.floor(nx / 2);
        const centerZ = Math.floor(nz / 2);
        if (
          (name === 'pechobase' || name === 'pecho_bajo' || name === 'torso') &&
          ix === centerX &&
          iz === centerZ &&
          (iy === 0 || iy === ny - 1)
        ) {
          continue;
        }

        let blockColor = baseColor;
        let isFaceFeature = false;
        let featureType = '';

        // Pelvis solid voxel blocks generation (ensure no missing parts in pelvis)

        // Identify inner bone core blocks inside the body
        let isBone = false;
        if (!isFaceFeature && !name.startsWith('dedo_') && !name.startsWith('cama_') && !name.includes('cola_')) {
          // If grid has internal layers in all dimensions (nx >= 3, ny >= 3, nz >= 3), ONLY strictly interior voxels are bones.
          // Top (iy = ny-1) and bottom (iy = 0) of head / limbs stay 100% skin blocks.
          if (nx >= 3 && ny >= 3 && nz >= 3 && ix > 0 && ix < nx - 1 && iy > 0 && iy < ny - 1 && iz > 0 && iz < nz - 1) {
            isBone = true;
          }
        }

        let isOrganBlock = false;
        if (isBone) {
          if (name === 'torso') {
            // Put liver and stomach slightly lower in torso iy
            if (iz >= centerZ && iy <= Math.floor(ny / 2)) {
              isOrganBlock = true;
              isBone = false;
              if (ix <= centerX) {
                blockColor = 0x4c1d1d; // Hígado (dark reddish brown)
              } else {
                blockColor = 0xfca5a5; // Estómago (peach/pink)
              }
            }
          } else if (name === 'ombligo' || name === 'ombligo_bajo') {
            if (iz >= centerZ) {
              isOrganBlock = true;
              isBone = false;
              const isBorder = (ix === 1 || ix === nx - 2 || iy === 1 || iy === ny - 2);
              if (isBorder) {
                blockColor = 0xda4f70; // Intestino Grueso (warm pinkish/crimson)
              } else {
                blockColor = 0xf43f5e; // Intestino Delgado (fleshy pink/coral)
              }
            }
          }
        }

        if (isBone) {
          blockColor = 0xf8fafc;
        }

        // Paint background of carved head eye socket holes pitch black!
        if (name === 'cabeza' && iz === nz - 2) {
          const scaledLeftEyeX = -0.065 * (w / 0.28);
          const scaledRightEyeX = 0.065 * (w / 0.28);
          const scaledEyeY = 0.020 * (h / 0.28);

          const distToLeftEyeSq = (lx - scaledLeftEyeX) ** 2 + (ly - scaledEyeY) ** 2;
          const distToRightEyeSq = (lx - scaledRightEyeX) ** 2 + (ly - scaledEyeY) ** 2;

          const threshold = (0.055 * (w / 0.28)) ** 2;
          if (distToLeftEyeSq < threshold || distToRightEyeSq < threshold) {
            blockColor = 0x090d16;
            isBone = false;
          }
        }

        // Create discrete voxel block mesh with solid overlap for contiguous Minecraft/voxel look
        let geom;
        if (voxelShape === 'sphere') {
          geom = new THREE.SphereGeometry(0.5, 8, 8);
        } else {
          geom = new THREE.BoxGeometry(vxW * 1.015, vxH * 1.015, vxD * 1.015, 4, 4, 4);
        }

        const mat = new THREE.MeshStandardMaterial({
          color: voxelShape === 'cube' ? 0xffffff : blockColor, // use white for vertexColors if cube
          vertexColors: voxelShape === 'cube',
          roughness: (isBone || isOrganBlock) ? 0.15 : (isFaceFeature ? 0.10 : 0.50),
          metalness: (isBone || isOrganBlock) ? 0.20 : 0.05,
        });

        // Initialize vertex colors for cube voxels
        if (voxelShape === 'cube') {
          const count = geom.attributes.position.count;
          const colors = new Float32Array(count * 3);
          const baseColorObj = new THREE.Color(blockColor);
          for (let j = 0; j < count; j++) {
            colors[j * 3] = baseColorObj.r;
            colors[j * 3 + 1] = baseColorObj.g;
            colors[j * 3 + 2] = baseColorObj.b;
          }
          geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        }

        const mesh = new THREE.Mesh(geom, mat);
        const blockPos = localPos.clone();
        mesh.position.copy(blockPos);
        
        // Performance Optimization: Only outer voxels cast shadows, sub-voxels don't do expensive self-shadowing
        const isOuterVoxel = (ix === 0 || ix === nx - 1 || iy === 0 || iy === ny - 1 || iz === 0 || iz === nz - 1);
        mesh.castShadow = isOuterVoxel;
        mesh.receiveShadow = false; // Ground and body main groups receive shadows
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();

        if (voxelShape === 'sphere') {
          mesh.scale.set(vxW * 1.85, vxH * 1.85, vxD * 1.85); // Ellipsoid overlapping scaling!
          mesh.userData = { voxelShape };
        } else {
          const posAttr = geom.attributes.position;
          const count = posAttr.count;
          const basePositions = new Float32Array(count * 3);
          for (let i = 0; i < count; i++) {
            basePositions[i * 3] = posAttr.getX(i);
            basePositions[i * 3 + 1] = posAttr.getY(i);
            basePositions[i * 3 + 2] = posAttr.getZ(i);
          }
          mesh.userData = {
            basePositions,
            w: vxW * 1.015,
            h: vxH * 1.015,
            d: vxD * 1.015,
            voxelShape,
          };
        }

        voxelsGroup.add(mesh);

        // Add eye pupil white highlight on eye voxels
        if (featureType === 'eye') {
          if (voxelShape === 'sphere') {
            const hlGeom = new THREE.BoxGeometry(0.35, 0.35, 0.1);
            const hlMesh = new THREE.Mesh(hlGeom, eyeHighlightMat);
            hlMesh.position.set(0.18, 0.18, 0.48);
            mesh.add(hlMesh);
          } else {
            const hlGeom = new THREE.BoxGeometry(vxW * 0.35, vxH * 0.35, 0.005);
            const hlMesh = new THREE.Mesh(hlGeom, eyeHighlightMat);
            hlMesh.position.set(vxW * 0.18, vxH * 0.18, vxD * 0.48 + 0.003);
            mesh.add(hlMesh);
          }
        }

        const voxelBlock: LimbVoxelBlock = {
          id: `${name}_vx_${ix}_${iy}_${iz}`,
          localPos,
          size: [vxW, vxH, vxD],
          color: blockColor,
          originalColor: blockColor,
          active: true,
          mesh,
          isContour,
          isBoneBlock: isBone,
          isOrganBlock: isOrganBlock,
          layerIndex: isBone ? 3 : (isOrganBlock ? 2 : (isContour ? 0 : 1)),
          gridIndex: [ix, iy, iz],
        };

        voxelBlocks.push(voxelBlock);
      }
    }
  }

  // --- DEDICATED ANATOMICAL SKELETON BLOCK CORE FOR EVERY LIMB ---
  // Guarantees every body part contains solid bone blocks inside for X-Ray visualization and fracture mechanics
  const isHumanoidAnatomy = [
    'cabeza', 'cuello', 'pechobase', 'pecho_bajo', 'torso', 'ombligo', 'ombligo_bajo', 'pelvis',
    'hombro_izq', 'hombro_der', 'brazo_izq', 'brazo_der', 'codo_izq', 'codo_der',
    'antebrazo_izq', 'antebrazo_der', 'muneca_izq', 'muneca_der', 'mano_izq', 'mano_der',
    'muslo_izq', 'muslo_der', 'rodilla_izq', 'rodilla_der', 'antepierna_izq', 'antepierna_der',
    'tobillo_izq', 'tobillo_der', 'pie_izq', 'pie_der'
  ].includes(name);

  if (isHumanoidAnatomy) {
    const hasInternalBone = voxelBlocks.some((b) => b.isBoneBlock);
    if (!hasInternalBone) {
      // Build central anatomical bone block(s)
      const boneSegments = name.includes('brazo') || name.includes('antepierna') || name.includes('muslo') || name.includes('antebrazo') ? 2 : 1;
      const boneW = Math.max(0.024, w * 0.44);
      const boneH = (h * 0.82) / boneSegments;
      const boneD = Math.max(0.024, d * 0.44);

      for (let s = 0; s < boneSegments; s++) {
        const boneGeom = new THREE.BoxGeometry(boneW, boneH * 0.94, boneD);
        const boneMesh = new THREE.Mesh(boneGeom, globalBoneMat.clone());
        const sY = boneSegments === 1 ? 0 : -h * 0.38 + (s + 0.5) * (h * 0.76 / boneSegments);
        const boneLocalPos = new THREE.Vector3(0, sY, 0);
        boneMesh.position.copy(boneLocalPos);
        boneMesh.renderOrder = 4; // Render inside flesh

        voxelsGroup.add(boneMesh);

        voxelBlocks.push({
          id: `${name}_bone_core_${s}`,
          localPos: boneLocalPos,
          size: [boneW, boneH, boneD],
          color: 0xf8fafc,
          originalColor: 0xf8fafc,
          active: true,
          mesh: boneMesh,
          isContour: false,
          isBoneBlock: true,
          layerIndex: 3,
          gridIndex: [0, s, 0],
        });
      }
    }
  }

  return { voxelsGroup, voxelBlocks };
}

export function createEsophagus(
  name: string,
  w: number,
  h: number,
  d: number,
  voxelBlocks?: LimbVoxelBlock[],
  voxelsGroup?: THREE.Group
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'esophagus_grupo';

  const partScale = w / 0.12;

  // Single Organ Tube in neck connecting to stomach:
  // User directive: "falta cuello tubo rosa como genital con utero pero para estomago y cuello conectados que se vean en organos"
  const esophMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    roughness: 0.35,
    metalness: 0.1,
    emissive: 0xdb2777,
    emissiveIntensity: 0.35,
    side: THREE.DoubleSide,
  });
  const esophRadius = 0.024 * partScale;
  const esophInnerRad = esophRadius * 0.62;
  const esophLength = h * 0.98;
  const esophGeom = createHollowBoxGeometry(esophRadius * 2, esophRadius * 2, esophInnerRad * 2, esophInnerRad * 2, esophLength);
  const esophMesh = new THREE.Mesh(esophGeom, esophMat);
  esophMesh.name = 'cuello_estomago_tubo_rosa_segment';
  esophMesh.position.set(0, 0, 0);
  group.add(esophMesh);

  // Pseudo cylinder mesh layer for organic pseudo-3D contour
  const esophPseudoGeom = createHollowBoxGeometry(esophRadius * 2 * 1.15, esophRadius * 2 * 1.15, esophInnerRad * 2 * 1.15, esophInnerRad * 2 * 1.15, esophLength);
  const esophPseudoMesh = new THREE.Mesh(esophPseudoGeom, esophMat.clone());
  esophPseudoMesh.name = 'cuello_estomago_tubo_pseudo_segment';
  esophPseudoMesh.position.set(0, 0, 0);
  group.add(esophPseudoMesh);

  applyInternalAnatomyPainting(esophMesh, {
    innerColorHex: 0x701a2b,
    outerRimColorHex: 0xf472b6,
    isPassThroughTube: true,
  });
  applyInternalAnatomyPainting(esophPseudoMesh, {
    innerColorHex: 0x701a2b,
    outerRimColorHex: 0xf472b6,
    isPassThroughTube: true,
  });

  if (voxelBlocks) {
    voxelBlocks.push({
      id: 'cuello_estomago_tubo_block',
      localPos: new THREE.Vector3(0, 0, 0),
      size: [esophRadius * 2, esophLength, esophRadius * 2],
      color: 0xf472b6,
      originalColor: 0xf472b6,
      active: true,
      mesh: esophMesh,
      isContour: false,
      isOrganBlock: true,
      gridIndex: [2, 2, 2],
    });
  }

  return group;
}

/**
 * Creates the single hollow esophagus tube passing vertically through chest segments (pechobase and pecho_bajo).
 */
export function createChestEsophagusTube(
  w: number,
  h: number,
  d: number,
  voxelBlocks?: LimbVoxelBlock[],
  voxelsGroup?: THREE.Group
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'chest_esophagus_tube_grupo';

  const esoRadius = 0.024 * (w / 0.39);
  const esoInnerRad = esoRadius * 0.62;
  const esoLen = h * 0.98;

  const esoGeom = createHollowBoxGeometry(esoRadius * 2, esoRadius * 2, esoInnerRad * 2, esoInnerRad * 2, esoLen);
  const esoMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    roughness: 0.35,
    metalness: 0.1,
    emissive: 0xdb2777,
    emissiveIntensity: 0.35,
    side: THREE.DoubleSide,
  });
  const esoMesh = new THREE.Mesh(esoGeom, esoMat);
  esoMesh.name = 'cuello_estomago_chest_esophagus_segment';
  esoMesh.position.set(0, 0, 0);
  group.add(esoMesh);

  // Pseudo tube layer
  const esoPseudoGeom = createHollowBoxGeometry(esoRadius * 2 * 1.15, esoRadius * 2 * 1.15, esoInnerRad * 2 * 1.15, esoInnerRad * 2 * 1.15, esoLen);
  const esoPseudoMesh = new THREE.Mesh(esoPseudoGeom, esoMat.clone());
  esoPseudoMesh.name = 'cuello_estomago_chest_pseudo_segment';
  esoPseudoMesh.position.set(0, 0, 0);
  group.add(esoPseudoMesh);

  applyInternalAnatomyPainting(esoMesh, {
    innerColorHex: 0x701a2b,
    outerRimColorHex: 0xf472b6,
    isPassThroughTube: true,
  });
  applyInternalAnatomyPainting(esoPseudoMesh, {
    innerColorHex: 0x701a2b,
    outerRimColorHex: 0xf472b6,
    isPassThroughTube: true,
  });

  if (voxelBlocks) {
    voxelBlocks.push({
      id: `chest_cuello_estomago_tubo_block_${voxelBlocks.length}`,
      localPos: new THREE.Vector3(0, 0, 0),
      size: [esoRadius * 2, esoLen, esoRadius * 2],
      color: 0xf472b6,
      originalColor: 0xf472b6,
      active: true,
      mesh: esoMesh,
      isContour: false,
      isOrganBlock: true,
      gridIndex: [2, 2, 2],
    });
  }

  return group;
}

export function createTorsoOrgans(
  w: number,
  h: number,
  d: number,
  voxelBlocks?: LimbVoxelBlock[],
  voxelsGroup?: THREE.Group
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'torso_organs_grupo';

  // 1. Single Organ Tube continuing from neck/chest directly inserting into stomach top opening (cardia entrance / hueco de bloques faltantes)
  const esoRadius = 0.022 * (w / 0.39);
  const esoInnerRad = esoRadius * 0.62;
  const startY = h * 0.49;
  const endX = w * 0.10;
  const endY = -h * 0.05 + (h * 0.24) * 0.5; // Top opening / cardia entrance of the cubic stomach
  const endZ = d * 0.04;

  const tubeLen = Math.sqrt((startY - endY) ** 2 + endX ** 2 + endZ ** 2);
  const esoGeom = createHollowBoxGeometry(esoRadius * 2, esoRadius * 2, esoInnerRad * 2, esoInnerRad * 2, tubeLen);
  const esoMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    roughness: 0.35,
    metalness: 0.1,
    emissive: 0xdb2777,
    emissiveIntensity: 0.35,
    side: THREE.DoubleSide,
  });
  const esoMesh = new THREE.Mesh(esoGeom, esoMat);
  esoMesh.name = 'cuello_estomago_torso_esophagus_segment';
  esoMesh.position.set(endX * 0.5, (startY + endY) * 0.5, endZ * 0.5);
  const dir = new THREE.Vector3(endX, endY - startY, endZ).normalize();
  esoMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
  group.add(esoMesh);

  // Pseudo tube layer
  const esoPseudoGeom = createHollowBoxGeometry(esoRadius * 2 * 1.15, esoRadius * 2 * 1.15, esoInnerRad * 2 * 1.15, esoInnerRad * 2 * 1.15, tubeLen);
  const esoPseudoMesh = new THREE.Mesh(esoPseudoGeom, esoMat.clone());
  esoPseudoMesh.name = 'cuello_estomago_torso_pseudo_segment';
  esoPseudoMesh.position.copy(esoMesh.position);
  esoPseudoMesh.quaternion.copy(esoMesh.quaternion);
  group.add(esoPseudoMesh);

  applyInternalAnatomyPainting(esoMesh, {
    innerColorHex: 0x701a2b,
    outerRimColorHex: 0xf472b6,
    isPassThroughTube: true,
  });
  applyInternalAnatomyPainting(esoPseudoMesh, {
    innerColorHex: 0x701a2b,
    outerRimColorHex: 0xf472b6,
    isPassThroughTube: true,
  });

  if (voxelBlocks) {
    voxelBlocks.push({
      id: 'torso_cuello_estomago_tubo_block',
      localPos: esoMesh.position.clone(),
      size: [esoRadius * 2, tubeLen, esoRadius * 2],
      color: 0xf472b6,
      originalColor: 0xf472b6,
      active: true,
      mesh: esoMesh,
      isContour: false,
      isOrganBlock: true,
      gridIndex: [3, 3, 2],
    });
  }

  // 2. Stomach (Estómago) - Cubic hollow organ empty inside with internal cavity like uterus
  // User directive: "Intestinos y higado y estomago deben ser cubicos como utero esten vacios por adentro solo higado y estomago y estomago debe tener una salida osea hueco de bloques faltantes conectado a un tubo y ese tubo conectado a cuello"
  const stomachMat = new THREE.MeshStandardMaterial({
    color: 0xfca5a5,
    roughness: 0.35,
    metalness: 0.1,
    emissive: 0x9f1239,
    emissiveIntensity: 0.2,
    side: THREE.DoubleSide,
  });
  const stomachGroup = new THREE.Group();
  stomachGroup.name = 'stomach_segment';

  // Hollow cubic stomach body with open top aperture for esophagus tube entrance
  const stomachW = w * 0.22;
  const stomachH = h * 0.24;
  const stomachD = w * 0.18;
  const stomachBodyGeom = createHollowBoxGeometry(stomachW, stomachD, stomachW * 0.65, stomachD * 0.65, stomachH);
  const stomachBody = new THREE.Mesh(stomachBodyGeom, stomachMat);
  stomachBody.name = 'stomach_body';
  stomachBody.position.set(w * 0.10, -h * 0.05, d * 0.04);
  stomachGroup.add(stomachBody);
  applyInternalAnatomyPainting(stomachBody, {
    innerColorHex: 0x9f1239,
    outerRimColorHex: 0xfca5a5,
    isPassThroughTube: true,
  });

  // Stomach outlet pylorus (hollow cubic tube pointing to intestines)
  const pylorusGeom = createHollowBoxGeometry(esoRadius * 2.8, esoRadius * 2.8, esoRadius * 1.7, esoRadius * 1.7, h * 0.22);
  const pylorusMesh = new THREE.Mesh(pylorusGeom, stomachMat);
  pylorusMesh.name = 'stomach_pylorus';
  pylorusMesh.position.set(w * 0.04, -h * 0.18, d * 0.04);
  pylorusMesh.rotation.z = Math.PI * 0.25;
  stomachGroup.add(pylorusMesh);
  applyInternalAnatomyPainting(pylorusMesh, {
    innerColorHex: 0xbe123c,
    outerRimColorHex: 0xfca5a5,
    isPassThroughTube: true,
  });

  group.add(stomachGroup);

  // 3. Liver (Hígado) - Cubic dual-lobed organ empty inside (vacío por dentro)
  // User directive: "Intestinos y higado y estomago deben ser cubicos como utero esten vacios por adentro solo higado y estomago... y higado tiene algo verde sacalo"
  const liverMat = new THREE.MeshStandardMaterial({
    color: 0x5b1e18,
    roughness: 0.25,
    metalness: 0.15,
    side: THREE.DoubleSide,
  });
  const liverGroup = new THREE.Group();
  liverGroup.name = 'liver_segment';

  const rightLobeW = w * 0.24;
  const rightLobeH = h * 0.22;
  const rightLobeD = w * 0.22;
  const rightLobeGeom = createHollowBoxGeometry(rightLobeW, rightLobeD, rightLobeW * 0.65, rightLobeD * 0.65, rightLobeH);
  const rightLobe = new THREE.Mesh(rightLobeGeom, liverMat);
  rightLobe.name = 'liver_right_lobe';
  rightLobe.position.set(-w * 0.14, h * 0.10, d * 0.04);
  liverGroup.add(rightLobe);
  applyInternalAnatomyPainting(rightLobe, {
    innerColorHex: 0x310e0e,
    outerRimColorHex: 0x5b1e18,
    isPassThroughTube: true,
  });

  const leftLobeW = w * 0.16;
  const leftLobeH = h * 0.12;
  const leftLobeD = w * 0.14;
  const leftLobeGeom = createHollowBoxGeometry(leftLobeW, leftLobeD, leftLobeW * 0.65, leftLobeD * 0.65, leftLobeH);
  const leftLobe = new THREE.Mesh(leftLobeGeom, liverMat);
  leftLobe.name = 'liver_left_lobe';
  leftLobe.position.set(w * 0.02, h * 0.14, d * 0.06);
  liverGroup.add(leftLobe);
  applyInternalAnatomyPainting(leftLobe, {
    innerColorHex: 0x310e0e,
    outerRimColorHex: 0x5b1e18,
    isPassThroughTube: true,
  });

  group.add(liverGroup);

  // NOTE: Gallbladder (green part) has been completely removed per user instruction: "y higado tiene algo verde sacalo"

  // 5. Build hollow cubic meshes shaped according to the blocks that contain Stomach and Liver
  // User directive: "y mesh de higado y estomago tengan un mesh cubico como cilindro pseudo pero cubico"
  if (voxelBlocks && voxelsGroup) {
    const vxW = w / 5;
    const vxH = h / 5;
    const vxD = d / 5;

    // Stomach containing blocks: hollow cubic box meshes matching block dimensions
    const stomachBlockCoords = [
      [3, 1, 2],
      [3, 2, 2],
      [3, 1, 3],
      [3, 2, 3],
      [2, 1, 2],
    ];
    const sCylHeight = vxH * 0.96;

    for (let i = 0; i < stomachBlockCoords.length; i++) {
      const [ix, iy, iz] = stomachBlockCoords[i];
      const lx = -w / 2 + (ix + 0.5) * vxW;
      const ly = -h / 2 + (iy + 0.5) * vxH;
      const lz = -d / 2 + (iz + 0.5) * vxD;

      const sCylGeom = createHollowBoxGeometry(vxW * 0.88, vxD * 0.88, vxW * 0.55, vxD * 0.55, sCylHeight);
      const sCylMesh = new THREE.Mesh(sCylGeom, stomachMat);
      sCylMesh.position.set(lx, ly, lz);
      sCylMesh.name = `torso_stomach_block_cyl_${ix}_${iy}_${iz}`;
      voxelsGroup.add(sCylMesh);

      applyInternalAnatomyPainting(sCylMesh, {
        innerColorHex: 0x9f1239,
        outerRimColorHex: 0xfca5a5,
        isPassThroughTube: true,
      });

      voxelBlocks.push({
        id: `torso_stomach_block_${ix}_${iy}_${iz}`,
        localPos: new THREE.Vector3(lx, ly, lz),
        size: [vxW, vxH, vxD],
        color: 0xfca5a5,
        originalColor: 0xfca5a5,
        active: true,
        mesh: sCylMesh,
        isContour: false,
        isBoneBlock: false,
        isOrganBlock: true,
        layerIndex: 2,
        gridIndex: [ix, iy, iz],
      });
    }

    // Liver containing blocks: hollow cubic box meshes matching block dimensions
    const liverBlockCoords = [
      [1, 1, 2],
      [1, 2, 2],
      [1, 3, 2],
      [1, 2, 3],
      [1, 1, 3],
      [2, 3, 2],
    ];
    const lCylHeight = vxH * 0.96;

    for (let i = 0; i < liverBlockCoords.length; i++) {
      const [ix, iy, iz] = liverBlockCoords[i];
      const lx = -w / 2 + (ix + 0.5) * vxW;
      const ly = -h / 2 + (iy + 0.5) * vxH;
      const lz = -d / 2 + (iz + 0.5) * vxD;

      const lCylGeom = createHollowBoxGeometry(vxW * 0.88, vxD * 0.88, vxW * 0.55, vxD * 0.55, lCylHeight);
      const lCylMesh = new THREE.Mesh(lCylGeom, liverMat);
      lCylMesh.position.set(lx, ly, lz);
      lCylMesh.name = `torso_liver_block_cyl_${ix}_${iy}_${iz}`;
      voxelsGroup.add(lCylMesh);

      applyInternalAnatomyPainting(lCylMesh, {
        innerColorHex: 0x310e0e,
        outerRimColorHex: 0x5b1e18,
        isPassThroughTube: true,
      });

      voxelBlocks.push({
        id: `torso_liver_block_${ix}_${iy}_${iz}`,
        localPos: new THREE.Vector3(lx, ly, lz),
        size: [vxW, vxH, vxD],
        color: 0x5b1e18,
        originalColor: 0x5b1e18,
        active: true,
        mesh: lCylMesh,
        isContour: false,
        isBoneBlock: false,
        isOrganBlock: true,
        layerIndex: 2,
        gridIndex: [ix, iy, iz],
      });
    }
  }

  return group;
}

export function createAbdominalOrgans(
  name: string,
  w: number,
  h: number,
  d: number,
  voxelBlocks?: LimbVoxelBlock[],
  voxelsGroup?: THREE.Group
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'abdominal_organs_grupo';

  // Materials with high visual fidelity and organ emissives
  const largeIntMat = new THREE.MeshStandardMaterial({
    color: 0xda4f70,
    roughness: 0.45,
    metalness: 0.1,
    emissive: 0x9f1239,
    emissiveIntensity: 0.15,
  });

  const smallIntMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    roughness: 0.4,
    metalness: 0.1,
    emissive: 0xbe123c,
    emissiveIntensity: 0.15,
  });

  // User Directive: "Haz que intestinos grueso y delgado esten hechoa de 3 extremidades cada intestino y tengan cilindros como pseudo"
  // 1. INTESTINO GRUESO (LARGE INTESTINE) - 3 EXTREMIDADES:
  // - Extremidad 1: Colon Ascendente (Lado derecho inferior a superior)
  // - Extremidad 2: Colon Transverso (Arco horizontal superior cruzando de derecha a izquierda)
  // - Extremidad 3: Colon Descendente y Recto (Lado izquierdo descendiendo hacia el canal pélvico rectal)
  const colonGroup = new THREE.Group();
  colonGroup.name = 'intestino_grueso';

  // 2. INTESTINO DELGADO (SMALL INTESTINE) - 3 EXTREMIDADES:
  // - Extremidad 1: Duodeno & Yeyuno Proximal (Conexión superior bajo estómago)
  // - Extremidad 2: Yeyuno Medio (Convoluciones y espirales centrales)
  // - Extremidad 3: Íleon Distal (Porción inferior hacia unión cecal/pelvis)
  const smallIntGroup = new THREE.Group();
  smallIntGroup.name = 'intestino_delgado';

  const vxW = w / 5;
  const vxH = h / 5;
  const vxD = d / 5;

  // Helper to create solid cubic block + limb cylinders (core & pseudo) for an organ extremity
  // User directive: "Intestinos y higado y estomago deben ser cubicos como utero esten vacios por adentro solo higado y estomago... y intestinos tenga cilindros como una extremidad mesh"
  const createCylLimbSegment = (
    parentGroup: THREE.Group,
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    radius: number,
    material: THREE.MeshStandardMaterial,
    limbName: string,
    segIndex: number,
    colorHex: number,
    innerHex: number
  ) => {
    const dist = p1.distanceTo(p2);
    if (dist < 0.001) return;

    const dir = p2.clone().sub(p1).normalize();
    const centerPos = p1.clone().add(p2).multiplyScalar(0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

    // 1. Solid cubic block mesh (giving each extremity segment cubic anatomy like uterus blocks, solid inside)
    const cubeGeom = new THREE.BoxGeometry(radius * 1.9, dist * 0.96, radius * 1.9);
    const cubeMesh = new THREE.Mesh(cubeGeom, material.clone());
    cubeMesh.name = `${limbName}_cube_${segIndex}`;
    cubeMesh.position.copy(centerPos);
    cubeMesh.quaternion.copy(quat);
    parentGroup.add(cubeMesh);

    applyInternalAnatomyPainting(cubeMesh, {
      innerColorHex: innerHex,
      outerRimColorHex: colorHex,
    });

    // 2. Solid core cylinder (like an extremity limb mesh)
    const cylGeom = new THREE.CylinderGeometry(radius, radius, dist, 16, 1);
    const cylMesh = new THREE.Mesh(cylGeom, material.clone());
    cylMesh.name = `${limbName}_core_${segIndex}`;
    cylMesh.position.copy(centerPos);
    cylMesh.quaternion.copy(quat);
    parentGroup.add(cylMesh);

    applyInternalAnatomyPainting(cylMesh, {
      innerColorHex: innerHex,
      outerRimColorHex: colorHex,
    });

    // 3. Pseudo cylinder envelope layer (like an extremity limb mesh)
    const pseudoGeom = new THREE.CylinderGeometry(radius * 1.15, radius * 1.15, dist, 16, 1);
    const pseudoMesh = new THREE.Mesh(pseudoGeom, material.clone());
    pseudoMesh.name = `${limbName}_pseudo_${segIndex}`;
    pseudoMesh.position.copy(centerPos);
    pseudoMesh.quaternion.copy(quat);
    parentGroup.add(pseudoMesh);

    applyInternalAnatomyPainting(pseudoMesh, {
      innerColorHex: innerHex,
      outerRimColorHex: colorHex,
    });

    // 4. Articulated joint connection nodes
    const spGeom = new THREE.SphereGeometry(radius * 1.08, 12, 12);
    const spMesh = new THREE.Mesh(spGeom, material.clone());
    spMesh.name = `${limbName}_joint_node_${segIndex}`;
    spMesh.position.copy(p1);
    parentGroup.add(spMesh);

    const spPseudoGeom = new THREE.SphereGeometry(radius * 1.08 * 1.15, 12, 12);
    const spPseudoMesh = new THREE.Mesh(spPseudoGeom, material.clone());
    spPseudoMesh.name = `${limbName}_joint_pseudo_node_${segIndex}`;
    spPseudoMesh.position.copy(p1);
    parentGroup.add(spPseudoMesh);

    if (voxelBlocks) {
      voxelBlocks.push({
        id: `${limbName}_block_${segIndex}`,
        localPos: cubeMesh.position.clone(),
        size: [radius * 1.9, dist, radius * 1.9],
        color: colorHex,
        originalColor: colorHex,
        active: true,
        mesh: cubeMesh,
        isContour: false,
        isBoneBlock: false,
        isOrganBlock: true,
        layerIndex: 2,
        gridIndex: [2, 2, 2],
      });
    }
  };

  if (name === 'ombligo') {
    const colonRadius = 0.026 * (w / 0.39);
    const rightX = -w * 0.25;
    const leftX = w * 0.25;
    const topY = h * 0.34;
    const bottomY = -h * 0.38;
    const colonZ = d * 0.08;

    // --- INTESTINO GRUESO (MARCO EXTERIOR): 3 EXTREMIDADES UNIDAS SIN ESPACIOS VACÍOS ---
    // User directive: "esos intestinoa esten juntos al igual que los intestinos de afuera"
    // Extremidad 1: Colon Ascendente (Lado derecho, de inferior a ángulo hepático superior)
    const ext1Group = new THREE.Group();
    ext1Group.name = 'intestino_grueso_seg1';
    const ext1Points: THREE.Vector3[] = [
      new THREE.Vector3(rightX, bottomY, colonZ),
      new THREE.Vector3(rightX, bottomY * 0.5, colonZ),
      new THREE.Vector3(rightX, 0, colonZ),
      new THREE.Vector3(rightX, topY * 0.6, colonZ),
      new THREE.Vector3(rightX, topY, colonZ), // Ángulo hepático (unión física exacta con Colon Transverso)
    ];
    for (let i = 0; i < ext1Points.length - 1; i++) {
      createCylLimbSegment(ext1Group, ext1Points[i], ext1Points[i + 1], colonRadius, largeIntMat, 'intestino_grueso_seg1', i, 0xda4f70, 0x9f1239);
    }
    colonGroup.add(ext1Group);

    // Extremidad 2: Colon Transverso (Arco horizontal superior cruzando y tocando ambos ángulos)
    const ext2Group = new THREE.Group();
    ext2Group.name = 'intestino_grueso_seg2';
    const ext2Points: THREE.Vector3[] = [
      new THREE.Vector3(rightX, topY, colonZ), // Conectado exactamente al ángulo hepático de ext1
      new THREE.Vector3(rightX * 0.5, topY, colonZ),
      new THREE.Vector3(0, topY, colonZ),
      new THREE.Vector3(leftX * 0.5, topY, colonZ),
      new THREE.Vector3(leftX, topY, colonZ), // Ángulo esplénico (unión física exacta con Colon Descendente)
    ];
    for (let i = 0; i < ext2Points.length - 1; i++) {
      createCylLimbSegment(ext2Group, ext2Points[i], ext2Points[i + 1], colonRadius, largeIntMat, 'intestino_grueso_seg2', i, 0xda4f70, 0x9f1239);
    }
    colonGroup.add(ext2Group);

    // Extremidad 3: Colon Descendente (Lado izquierdo, de ángulo esplénico hacia base pélvica)
    const ext3Group = new THREE.Group();
    ext3Group.name = 'intestino_grueso_seg3';
    const ext3Points: THREE.Vector3[] = [
      new THREE.Vector3(leftX, topY, colonZ), // Conectado exactamente al ángulo esplénico de ext2
      new THREE.Vector3(leftX, topY * 0.6, colonZ),
      new THREE.Vector3(leftX, 0, colonZ),
      new THREE.Vector3(leftX, bottomY * 0.5, colonZ),
      new THREE.Vector3(leftX, bottomY, colonZ), // Conecta con colon sigmoide hacia pelvis
    ];
    for (let i = 0; i < ext3Points.length - 1; i++) {
      createCylLimbSegment(ext3Group, ext3Points[i], ext3Points[i + 1], colonRadius, largeIntMat, 'intestino_grueso_seg3', i, 0xda4f70, 0x9f1239);
    }
    colonGroup.add(ext3Group);

    group.add(colonGroup);

    // --- INTESTINO DELGADO (INTERIOR ANIDADO): COMO PAPEL DOBLADO CON CILINDROS UNIDOS ---
    // User directive: "Bien pero intrstino adenrro de el otro intestino esos intestinoa esten juntos al igual que los intestinos de afuera y intestino de dentro wsten como papel doblados y con sus cilindros unidos obbio"
    const smallRad = 0.013 * (w / 0.39);
    const inX_right = rightX + colonRadius * 1.55; // Borde derecho interior que toca el colon ascendente
    const inX_left = leftX - colonRadius * 1.55;   // Borde izquierdo interior que toca el colon descendente
    const inY_top = topY - colonRadius * 1.55;     // Límite superior que toca el colon transverso
    const inY_bottom = bottomY + colonRadius * 1.6; // Límite inferior
    const foldSpacing = (inY_top - inY_bottom) / 5; // 6 capas plegadas como acordeón / papel doblado

    // Tiers horizontales plegados en zig-zag continuo (Papel doblado con cilindros 100% unidos)
    // Nivel 0 (Superior, hacia la izquierda):
    const p_duo_start = new THREE.Vector3(w * 0.04, inY_top, colonZ);
    const p_t0_mid = new THREE.Vector3(inX_left * 0.4, inY_top, colonZ);
    const p_t0_end = new THREE.Vector3(inX_left, inY_top, colonZ);
    // Doblez en U 0 (Hacia abajo en borde izquierdo):
    const p_u0_turn = new THREE.Vector3(inX_left, inY_top - foldSpacing * 0.5, colonZ);
    const p_t1_start = new THREE.Vector3(inX_left, inY_top - foldSpacing, colonZ);

    // Nivel 1 (De izquierda a derecha, pegado al nivel 0 como papel doblado):
    const p_t1_mid1 = new THREE.Vector3(inX_left * 0.3, inY_top - foldSpacing, colonZ);
    const p_t1_mid2 = new THREE.Vector3(inX_right * 0.3, inY_top - foldSpacing, colonZ);
    const p_t1_end = new THREE.Vector3(inX_right, inY_top - foldSpacing, colonZ);
    // Doblez en U 1 (Hacia abajo en borde derecho):
    const p_u1_turn = new THREE.Vector3(inX_right, inY_top - foldSpacing * 1.5, colonZ);
    const p_t2_start = new THREE.Vector3(inX_right, inY_top - foldSpacing * 2.0, colonZ);

    // Nivel 2 (De derecha a izquierda, pegado al nivel 1):
    const p_t2_mid1 = new THREE.Vector3(inX_right * 0.3, inY_top - foldSpacing * 2.0, colonZ);
    const p_t2_mid2 = new THREE.Vector3(inX_left * 0.3, inY_top - foldSpacing * 2.0, colonZ);
    const p_t2_end = new THREE.Vector3(inX_left, inY_top - foldSpacing * 2.0, colonZ);
    // Doblez en U 2 (Hacia abajo en borde izquierdo):
    const p_u2_turn = new THREE.Vector3(inX_left, inY_top - foldSpacing * 2.5, colonZ);
    const p_t3_start = new THREE.Vector3(inX_left, inY_top - foldSpacing * 3.0, colonZ);

    // Nivel 3 (De izquierda a derecha, pegado al nivel 2):
    const p_t3_mid1 = new THREE.Vector3(inX_left * 0.3, inY_top - foldSpacing * 3.0, colonZ);
    const p_t3_mid2 = new THREE.Vector3(inX_right * 0.3, inY_top - foldSpacing * 3.0, colonZ);
    const p_t3_end = new THREE.Vector3(inX_right, inY_top - foldSpacing * 3.0, colonZ);
    // Doblez en U 3 (Hacia abajo en borde derecho):
    const p_u3_turn = new THREE.Vector3(inX_right, inY_top - foldSpacing * 3.5, colonZ);
    const p_t4_start = new THREE.Vector3(inX_right, inY_top - foldSpacing * 4.0, colonZ);

    // Nivel 4 (De derecha a izquierda, pegado al nivel 3):
    const p_t4_mid1 = new THREE.Vector3(inX_right * 0.3, inY_top - foldSpacing * 4.0, colonZ);
    const p_t4_mid2 = new THREE.Vector3(inX_left * 0.3, inY_top - foldSpacing * 4.0, colonZ);
    const p_t4_end = new THREE.Vector3(inX_left, inY_top - foldSpacing * 4.0, colonZ);
    // Doblez en U 4 (Hacia abajo en borde izquierdo):
    const p_u4_turn = new THREE.Vector3(inX_left, inY_top - foldSpacing * 4.5, colonZ);
    const p_t5_start = new THREE.Vector3(inX_left, inY_top - foldSpacing * 5.0, colonZ);

    // Nivel 5 (De izquierda a derecha, pegado al nivel 4 y conectando con colon en ángulo ileocecal):
    const p_t5_mid1 = new THREE.Vector3(inX_left * 0.3, inY_top - foldSpacing * 5.0, colonZ);
    const p_t5_mid2 = new THREE.Vector3(inX_right * 0.3, inY_top - foldSpacing * 5.0, colonZ);
    const p_t5_end = new THREE.Vector3(inX_right, inY_top - foldSpacing * 5.0, colonZ);
    const p_ileocecal = new THREE.Vector3(rightX, bottomY, colonZ); // Unión ileocecal unida al colon exterior

    // Extremidad 1: Duodeno y Asas Plegadas Superiores (Nivel 0 + Doblez U0 + Nivel 1 + Doblez U1)
    const smallExt1Group = new THREE.Group();
    smallExt1Group.name = 'intestino_delgado_seg1';
    const sExt1Pts = [p_duo_start, p_t0_mid, p_t0_end, p_u0_turn, p_t1_start, p_t1_mid1, p_t1_mid2, p_t1_end, p_u1_turn, p_t2_start];
    for (let i = 0; i < sExt1Pts.length - 1; i++) {
      createCylLimbSegment(smallExt1Group, sExt1Pts[i], sExt1Pts[i + 1], smallRad, smallIntMat, 'intestino_delgado_seg1', i, 0xf43f5e, 0x9f1239);
    }
    smallIntGroup.add(smallExt1Group);

    // Extremidad 2: Yeyuno Medio Plegado (Nivel 2 + Doblez U2 + Nivel 3 + Doblez U3)
    const smallExt2Group = new THREE.Group();
    smallExt2Group.name = 'intestino_delgado_seg2';
    const sExt2Pts = [p_t2_start, p_t2_mid1, p_t2_mid2, p_t2_end, p_u2_turn, p_t3_start, p_t3_mid1, p_t3_mid2, p_t3_end, p_u3_turn, p_t4_start];
    for (let i = 0; i < sExt2Pts.length - 1; i++) {
      createCylLimbSegment(smallExt2Group, sExt2Pts[i], sExt2Pts[i + 1], smallRad, smallIntMat, 'intestino_delgado_seg2', i, 0xf43f5e, 0x9f1239);
    }
    smallIntGroup.add(smallExt2Group);

    // Extremidad 3: Íleon Distal y Unión Ileocecal (Nivel 4 + Doblez U4 + Nivel 5 + Válvula Ileocecal)
    const smallExt3Group = new THREE.Group();
    smallExt3Group.name = 'intestino_delgado_seg3';
    const sExt3Pts = [p_t4_start, p_t4_mid1, p_t4_mid2, p_t4_end, p_u4_turn, p_t5_start, p_t5_mid1, p_t5_mid2, p_t5_end, p_ileocecal];
    for (let i = 0; i < sExt3Pts.length - 1; i++) {
      createCylLimbSegment(smallExt3Group, sExt3Pts[i], sExt3Pts[i + 1], smallRad, smallIntMat, 'intestino_delgado_seg3', i, 0xf43f5e, 0x9f1239);
    }
    smallIntGroup.add(smallExt3Group);

    group.add(smallIntGroup);

  } else if (name === 'ombligo_bajo') {
    const colonRadius = 0.026 * (w / 0.39);
    const rightX = -w * 0.25;
    const leftX = w * 0.25;
    const colonZ = d * 0.08;

    // --- INTESTINO GRUESO BAJO (MARCO EXTERIOR PÉLVICO): 3 EXTREMIDADES UNIDAS ---
    // Extremidad 1: Base de Colon Ascendente / Ciego en lado derecho
    const ext1Group = new THREE.Group();
    ext1Group.name = 'intestino_grueso_seg1_bajo';
    const ext1Pts = [
      new THREE.Vector3(rightX, h * 0.35, colonZ),
      new THREE.Vector3(rightX * 0.8, h * 0.10, colonZ),
      new THREE.Vector3(rightX * 0.5, -h * 0.25, colonZ),
    ];
    for (let i = 0; i < ext1Pts.length - 1; i++) {
      createCylLimbSegment(ext1Group, ext1Pts[i], ext1Pts[i + 1], colonRadius, largeIntMat, 'intestino_grueso_seg1_bajo', i, 0xda4f70, 0x9f1239);
    }
    colonGroup.add(ext1Group);

    // Extremidad 2: Colon Sigmoide en lado izquierdo curvando hacia el centro
    const ext2Group = new THREE.Group();
    ext2Group.name = 'intestino_grueso_seg2_bajo';
    const ext2Pts = [
      new THREE.Vector3(leftX, h * 0.35, colonZ),
      new THREE.Vector3(leftX * 0.6, 0, colonZ),
      new THREE.Vector3(0, -h * 0.15, colonZ),
    ];
    for (let i = 0; i < ext2Pts.length - 1; i++) {
      createCylLimbSegment(ext2Group, ext2Pts[i], ext2Pts[i + 1], colonRadius, largeIntMat, 'intestino_grueso_seg2_bajo', i, 0xda4f70, 0x9f1239);
    }
    colonGroup.add(ext2Group);

    // Extremidad 3: Recto y Canal Rectal descendente central
    const ext3Group = new THREE.Group();
    ext3Group.name = 'intestino_grueso_seg3_bajo';
    const rectumLen = h * 0.38;
    const rectumCubeGeom = new THREE.BoxGeometry(colonRadius * 2.0, rectumLen, colonRadius * 2.0);
    const rectumCubeMesh = new THREE.Mesh(rectumCubeGeom, largeIntMat);
    rectumCubeMesh.name = `rectal_cube_segment`;
    rectumCubeMesh.position.set(0, -h * 0.30, colonZ);
    ext3Group.add(rectumCubeMesh);
    applyInternalAnatomyPainting(rectumCubeMesh, {
      innerColorHex: 0x701a2b,
      outerRimColorHex: 0xf43f5e,
    });

    const rectumCylGeom = new THREE.CylinderGeometry(colonRadius, colonRadius, rectumLen, 16, 1);
    const rectumCylMesh = new THREE.Mesh(rectumCylGeom, largeIntMat);
    rectumCylMesh.name = `rectal_tube_segment`;
    rectumCylMesh.position.copy(rectumCubeMesh.position);
    ext3Group.add(rectumCylMesh);
    applyInternalAnatomyPainting(rectumCylMesh, {
      innerColorHex: 0x701a2b,
      outerRimColorHex: 0xf43f5e,
    });
    colonGroup.add(ext3Group);

    group.add(colonGroup);

    // --- INTESTINO DELGADO BAJO (INTERIOR ANIDADO): FOLDED PAPER PLIEGUES UNIDOS ---
    const smallRad = 0.013 * (w / 0.39);
    const inX_r_bajo = rightX * 0.6;
    const inX_l_bajo = leftX * 0.6;

    // Pliegue bajo 0 (Izquierda a Derecha)
    const p_b0_start = new THREE.Vector3(inX_l_bajo, h * 0.28, colonZ);
    const p_b0_mid = new THREE.Vector3(0, h * 0.28, colonZ);
    const p_b0_end = new THREE.Vector3(inX_r_bajo, h * 0.28, colonZ);
    const p_b0_turn = new THREE.Vector3(inX_r_bajo, h * 0.16, colonZ);

    // Pliegue bajo 1 (Derecha a Izquierda, pegado al pliegue 0)
    const p_b1_start = new THREE.Vector3(inX_r_bajo, h * 0.04, colonZ);
    const p_b1_mid = new THREE.Vector3(0, h * 0.04, colonZ);
    const p_b1_end = new THREE.Vector3(inX_l_bajo, h * 0.04, colonZ);
    const p_b1_turn = new THREE.Vector3(inX_l_bajo, -h * 0.08, colonZ);

    // Pliegue bajo 2 (Izquierda a Derecha, pegado al pliegue 1)
    const p_b2_start = new THREE.Vector3(inX_l_bajo, -h * 0.18, colonZ);
    const p_b2_mid = new THREE.Vector3(0, -h * 0.18, colonZ);
    const p_b2_end = new THREE.Vector3(rightX * 0.5, -h * 0.25, colonZ); // Se une al ciego derecho

    // Extremidad 1: Asas superiores bajas
    const smallExt1Group = new THREE.Group();
    smallExt1Group.name = 'intestino_delgado_seg1_bajo';
    const sExt1Pts = [p_b0_start, p_b0_mid, p_b0_end, p_b0_turn, p_b1_start];
    for (let i = 0; i < sExt1Pts.length - 1; i++) {
      createCylLimbSegment(smallExt1Group, sExt1Pts[i], sExt1Pts[i + 1], smallRad, smallIntMat, 'intestino_delgado_seg1_bajo', i, 0xf43f5e, 0x9f1239);
    }
    smallIntGroup.add(smallExt1Group);

    // Extremidad 2: Asas medias bajas
    const smallExt2Group = new THREE.Group();
    smallExt2Group.name = 'intestino_delgado_seg2_bajo';
    const sExt2Pts = [p_b1_start, p_b1_mid, p_b1_end, p_b1_turn, p_b2_start];
    for (let i = 0; i < sExt2Pts.length - 1; i++) {
      createCylLimbSegment(smallExt2Group, sExt2Pts[i], sExt2Pts[i + 1], smallRad, smallIntMat, 'intestino_delgado_seg2_bajo', i, 0xf43f5e, 0x9f1239);
    }
    smallIntGroup.add(smallExt2Group);

    // Extremidad 3: Asas terminales bajas unidas a la base cecal
    const smallExt3Group = new THREE.Group();
    smallExt3Group.name = 'intestino_delgado_seg3_bajo';
    const sExt3Pts = [p_b2_start, p_b2_mid, p_b2_end];
    for (let i = 0; i < sExt3Pts.length - 1; i++) {
      createCylLimbSegment(smallExt3Group, sExt3Pts[i], sExt3Pts[i + 1], smallRad, smallIntMat, 'intestino_delgado_seg3_bajo', i, 0xf43f5e, 0x9f1239);
    }
    smallIntGroup.add(smallExt3Group);

    group.add(smallIntGroup);
  }

  return group;
}

function isAllowedOrganMesh(child: THREE.Object3D): boolean {
  let curr: THREE.Object3D | null = child;
  while (curr) {
    const name = (curr.name || '').toLowerCase();
    if (
      name.includes('shaft') ||
      name.includes('glans') ||
      name.includes('testicle') ||
      name.includes('testiculo') ||
      name.includes('labia') ||
      name.includes('clitoris') ||
      name.includes('minora') ||
      name.includes('vulva') ||
      name.includes('entrance') ||
      name.includes('labio_') ||
      name.includes('mouth_tube') ||
      name.includes('internal_tube') ||
      name.includes('breast_internal_tube') ||
      name.includes('anus_pink_tube') ||
      name.includes('prostate') ||
      name.includes('uterus') ||
      name.includes('utero') ||
      name.includes('ovary') ||
      name.includes('ovario') ||
      name.includes('urethra') ||
      name.includes('uretra') ||
      name.includes('canal') ||
      name.includes('epididymis') ||
      name.includes('vas_deferens') ||
      name.includes('intestino') ||
      name.includes('colon') ||
      name.includes('small_int') ||
      name.includes('rectum') ||
      name.includes('recto') ||
      name.includes('bladder') ||
      name.includes('vejiga') ||
      name.includes('kidney') ||
      name.includes('rinon') ||
      name.includes('cuello_estomago') ||
      name.includes('pink_tube') ||
      name.includes('tubo_rosa') ||
      name.includes('esophagus') ||
      name.includes('esofago') ||
      name.includes('traquea') ||
      name.includes('trachea') ||
      name.includes('carotid') ||
      name.includes('carotida') ||
      name.includes('jugular') ||
      name.includes('yugular') ||
      name.includes('cervical') ||
      name.includes('cartilage') ||
      name.includes('thyroid') ||
      name.includes('tiroides') ||
      name.includes('stomach') ||
      name.includes('estomago') ||
      name.includes('liver') ||
      name.includes('higado') ||
      name.includes('organ') ||
      name.includes('organo')
    ) {
      return true;
    }
    curr = curr.parent;
  }
  return false;
}

/**
 * Applies X-Ray Layer Modes to a ragdoll:
 * 0 = Normal (Piel & Ropa completa)
 * 1 = Sin Piel (Músculos y Bloques de Cuerpo Solamente, sin cilindros ni pseudo esferas)
 * 2 = Solo Esqueleto (Huesos Internos Articulados)
 * 3 = Rayos X Holográfico Médico (Piel traslúcida azul cian + Huesos brillantes)
 * 4 = Órganos (Genitales, Útero, Estómago, Hígado, Intestinos, Esófago/Cuello y Bloques de Órganos Semitransparentes y Huecos)
 */
export function applyXRayModeToRagdoll(ragdoll: Ragdoll3D, mode: number) {
  ragdoll.xrayMode = mode;
  const isPseudo3DVisible = (mode === 0) && ragdoll.contourLayerEnabled && ragdoll.contourJointStyle !== 'cylinder' && ragdoll.contourJointStyle !== 'blocky';

  // Helper to robustly apply material properties to single Meshes or Group-nested Meshes (like hollow organs)
  const setBlockMatProps = (mesh: THREE.Object3D, props: {
    visible?: boolean;
    transparent?: boolean;
    opacity?: number;
    depthWrite?: boolean;
    side?: THREE.Side;
    color?: number | THREE.Color;
    emissive?: number | THREE.Color;
    emissiveIntensity?: number;
  }) => {
    mesh.visible = props.visible !== undefined ? props.visible : mesh.visible;
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        const mat = child.material;
        if (props.transparent !== undefined) mat.transparent = props.transparent;
        if (props.opacity !== undefined) mat.opacity = props.opacity;
        if (props.depthWrite !== undefined) mat.depthWrite = props.depthWrite;
        if (props.side !== undefined) mat.side = props.side;
        if (props.color !== undefined) {
          if (typeof props.color === 'number') mat.color.setHex(props.color);
          else mat.color.copy(props.color);
        }
        if (props.emissive !== undefined) {
          if (typeof props.emissive === 'number') mat.emissive.setHex(props.emissive);
          else mat.emissive.copy(props.emissive);
        }
        if (props.emissiveIntensity !== undefined) mat.emissiveIntensity = props.emissiveIntensity;
      }
    });
  };

  for (const p of ragdoll.particles) {
    // 1. Handle Contour Envelope Skin
    if (p.contourMesh && p.contourMesh instanceof THREE.Mesh) {
      const mat = p.contourMesh.material as THREE.MeshStandardMaterial;
      if (mode === 0) {
        // Normal mode: restore skin/clothing opacity and visibility
        p.contourMesh.visible = ragdoll.contourLayerEnabled && ragdoll.contourJointStyle !== 'blocky';
        if (mat) {
          mat.transparent = false;
          mat.opacity = 1.0;
          mat.depthWrite = true;
          mat.side = THREE.FrontSide;
          mat.emissive.set(0x000000);
          mat.emissiveIntensity = 0;
          if (p.contourMesh.userData && p.contourMesh.userData.baseColor !== undefined) {
            mat.color.set(p.contourMesh.userData.baseColor);
          }
        }
      } else if (mode === 1 || mode === 2 || mode === 4) {
        // Skin removed completely - NO pseudo sphere/cylinder contour visible
        p.contourMesh.visible = false;
      } else if (mode === 3) {
        // Holographic medical X-Ray skin
        p.contourMesh.visible = true;
        if (mat) {
          mat.transparent = true;
          mat.opacity = 0.22;
          mat.depthWrite = false;
          mat.side = THREE.FrontSide;
          if (p.contourMesh.userData && p.contourMesh.userData.baseColor !== undefined) {
            mat.color.set(p.contourMesh.userData.baseColor);
            mat.emissive.set(p.contourMesh.userData.baseColor);
          } else {
            mat.emissive.set(0x0284c7);
          }
          mat.emissiveIntensity = 0.25;
        }
      }
    }

    // 2. Handle Shirt Contour if present
    const shirtContour = p.mesh?.getObjectByName('ShirtContourEnvelope');
    if (shirtContour && shirtContour instanceof THREE.Mesh) {
      const sMat = shirtContour.material as THREE.MeshStandardMaterial;
      if (mode === 0) {
        shirtContour.visible = ragdoll.contourLayerEnabled && ragdoll.contourJointStyle !== 'blocky';
        if (sMat) {
          sMat.transparent = false;
          sMat.opacity = 1.0;
          sMat.depthWrite = true;
          sMat.side = THREE.FrontSide;
          if (ragdoll.shirtColorHex !== undefined) {
            sMat.color.set(ragdoll.shirtColorHex);
          }
        }
      } else if (mode === 1 || mode === 2 || mode === 4) {
        shirtContour.visible = false;
      } else if (mode === 3) {
        shirtContour.visible = true;
        if (sMat) {
          sMat.transparent = true;
          sMat.opacity = 0.18;
          sMat.depthWrite = false;
          sMat.side = THREE.FrontSide;
          if (ragdoll.shirtColorHex !== undefined) {
            sMat.color.set(ragdoll.shirtColorHex);
          }
        }
      }
    }

    // 3. Handle extra feature groups (Genitals, Bust, Glutes, Organs) pseudo-contour meshes & surface meshes
    const updateMeshGroupVisibility = (group: THREE.Object3D) => {
      group.traverse((child) => {
        const name = child.name || '';
        const parentName = child.parent?.name || '';
        
        if (child instanceof THREE.Mesh) {
          (child as any).parentRagdoll = ragdoll;
          if (!child.userData) child.userData = {};
          child.userData.parentRagdoll = ragdoll;

          // Re-apply hole morphs (restores base positions in mode 1, hiding hole sphere)
          if (child.userData.holes && child.userData.holes.length > 0) {
            applyHoleMorphToMesh(child);
          }

          if (mode === 4) {
            const isAllowed = isAllowedOrganMesh(child);
            child.visible = isAllowed;
            if (isAllowed) {
              const cMat = child.material as THREE.MeshStandardMaterial;
              if (cMat) {
                cMat.transparent = true;
                cMat.opacity = 0.70;
                cMat.depthWrite = false;
                cMat.side = THREE.DoubleSide;
                if (!cMat.emissive || (cMat.emissive.r === 0 && cMat.emissive.g === 0 && cMat.emissive.b === 0)) {
                  cMat.emissive = new THREE.Color(cMat.color).multiplyScalar(0.2);
                  cMat.emissiveIntensity = 0.25;
                }
              }
            }
            return;
          }

          const isPseudo = name.toLowerCase().includes('pseudo');
          const isOuterGenitalOrBustMesh = (
            name.includes('pecho_') ||
            name.includes('tetilla_') ||
            name.includes('breast_') ||
            name.includes('gluteo_') ||
            name.includes('glute_') ||
            name.includes('labia_') ||
            name.includes('labio_') ||
            name.includes('clitoris') ||
            name.includes('minora') ||
            name.includes('entrance_') ||
            name.includes('testicle_') ||
            name.includes('shaft_') ||
            name.includes('glans_') ||
            name.includes('vagina_') ||
            name.includes('penis_') ||
            name.includes('genital_') ||
            name.includes('oreja') ||
            name.includes('pseudo') ||
            parentName === 'BustExtraGroup' ||
            parentName === 'GluteExtraGroup' ||
            parentName === 'GenitalExtraGroup' ||
            parentName === 'ErectionPivotGroup'
          );
          
          if (isPseudo) {
            // Pseudo contour envelopes are strictly hidden in X-Ray mode (mode > 0)
            child.visible = mode === 0 ? isPseudo3DVisible : false;
          } else if (isOuterGenitalOrBustMesh) {
            const cMat = child.material as THREE.MeshStandardMaterial;
            if (mode === 0) {
              child.visible = true;
              if (cMat) {
                cMat.transparent = false;
                cMat.opacity = 1.0;
                cMat.depthWrite = true;
                cMat.side = THREE.FrontSide;
              }
            } else if (mode === 1) {
              // Sin Piel: Pechos, glúteos, and anatomical feature blocks ARE VISIBLE in skin/muscle color!
              child.visible = true;
              if (cMat) {
                cMat.transparent = false;
                cMat.opacity = 1.0;
                cMat.depthWrite = true;
                cMat.side = THREE.FrontSide;
                const bodySkin = ragdoll.skinColorHex !== undefined ? ragdoll.skinColorHex : 0xefb08c;
                if (!name.includes('tetilla') && !name.includes('areola') && !name.includes('glans') && !name.includes('labia')) {
                  cMat.color.setHex(bodySkin);
                }
              }
            } else {
              // In mode 2 (Esqueleto), mode 3 (Holograma), mode 4: hide outer genital/bust/glute surface meshes
              child.visible = false;
            }
          }
        } else if (child instanceof THREE.Group) {
          if (name === 'BustExtraGroup' || name === 'GluteExtraGroup' || name === 'GenitalExtraGroup' || name === 'ErectionPivotGroup') {
            if (mode === 0 || mode === 1) {
              child.visible = true;
            } else {
              child.visible = false;
            }
          }
        }
      });
    };

    if (p.voxelsGroup) updateMeshGroupVisibility(p.voxelsGroup);
    if (p.mesh && p.mesh !== p.voxelsGroup) updateMeshGroupVisibility(p.mesh);

    // 4. Handle Limb Voxel Blocks & Skeleton Bones
    if (p.voxelBlocks) {
      const bodySkin = ragdoll.skinColorHex !== undefined ? ragdoll.skinColorHex : 0xefb08c;
      for (const b of p.voxelBlocks) {
        if (!b.mesh) continue;
        if (!b.active) {
          b.mesh.visible = false;
          continue;
        }

        if (mode === 0) {
          // Normal: all active blocks visible with original colors
          setBlockMatProps(b.mesh, {
            visible: true,
            transparent: false,
            opacity: 1.0,
            depthWrite: true,
            side: THREE.FrontSide,
            color: b.originalColor,
            emissive: 0x000000,
            emissiveIntensity: 0,
          });
        } else if (mode === 1) {
          // Sin Piel: ONLY body voxel blocks visible (muscles, flesh, and skin without clothes)
          const blockColor = (b.isShirtBlock || b.isPantsBlock) ? bodySkin : b.originalColor;
          setBlockMatProps(b.mesh, {
            visible: true,
            transparent: false,
            opacity: 1.0,
            depthWrite: true,
            side: THREE.FrontSide,
            color: blockColor,
            emissive: b.isOrganBlock ? blockColor : 0x000000,
            emissiveIntensity: b.isOrganBlock ? 0.25 : 0,
          });
        } else if (mode === 2) {
          // Solo Esqueleto: ONLY bone blocks and internal organs (Uterus / Prostate / Internal tubes) visible!
          if (b.isBoneBlock || b.isOrganBlock) {
            setBlockMatProps(b.mesh, {
              visible: true,
              transparent: false,
              opacity: 1.0,
              depthWrite: true,
              side: THREE.FrontSide,
              color: b.isOrganBlock ? b.originalColor : 0xf8fafc,
              emissive: b.isOrganBlock ? b.originalColor : 0x1e293b,
              emissiveIntensity: b.isOrganBlock ? 0.5 : 0.15,
            });
          } else {
            b.mesh.visible = false; // Hide outer flesh
          }
        } else if (mode === 3) {
          // Rayos X Holográfico: outer voxels translucent cyan, bone blocks bright glowing white, internal organs glowing fluorescent
          if (b.isOrganBlock) {
            setBlockMatProps(b.mesh, {
              visible: true,
              transparent: false,
              opacity: 1.0,
              depthWrite: true,
              side: THREE.DoubleSide,
              color: b.originalColor,
              emissive: b.originalColor,
              emissiveIntensity: 0.7,
            });
          } else if (b.isBoneBlock) {
            setBlockMatProps(b.mesh, {
              visible: true,
              transparent: false,
              opacity: 1.0,
              depthWrite: true,
              side: THREE.FrontSide,
              color: 0xffffff,
              emissive: 0xe2e8f0,
              emissiveIntensity: 0.5,
            });
          } else {
            setBlockMatProps(b.mesh, {
              visible: true,
              transparent: true,
              opacity: 0.15,
              depthWrite: false,
              side: THREE.FrontSide,
              color: b.originalColor,
              emissive: b.originalColor,
              emissiveIntensity: 0.15,
            });
          }
        } else if (mode === 4) {
          // Órganos: Show organ voxel blocks with SEMI-TRANSPARENCY so internal hollows and cavities are clearly visible!
          const isOrgan = b.isOrganBlock || isAllowedOrganMesh(b.mesh);
          
          if (isOrgan) {
            setBlockMatProps(b.mesh, {
              visible: true,
              transparent: true,
              opacity: 0.65,
              depthWrite: false,
              side: THREE.DoubleSide,
              color: b.originalColor,
              emissive: b.originalColor,
              emissiveIntensity: 0.35,
            });
          } else {
            b.mesh.visible = false;
          }
        }
      }
    }
  }

  // Handle Cylinder mode joint bridges and spheres visibility across X-Ray layers
  // When mode === 1 (Sin Piel), show joint bridges as visible fibrous tendons!
  const isCylinderActive = (mode === 0) && ragdoll.contourJointStyle === 'cylinder' && ragdoll.contourLayerEnabled;
  const showTendonsInSkinless = (mode === 1 || isCylinderActive);
  if (ragdoll.jointBridges) {
    for (const bridge of ragdoll.jointBridges) {
      bridge.visible = showTendonsInSkinless;
      if (mode === 1 && bridge.material instanceof THREE.MeshStandardMaterial) {
        bridge.material.color.setHex(0xf1f5f9); // Tendon white/pearl color
        bridge.material.roughness = 0.45;
        bridge.material.metalness = 0.10;
        bridge.material.emissive.setHex(0x475569);
        bridge.material.emissiveIntensity = 0.12;
        bridge.material.needsUpdate = true;
      }
    }
  }
  if (ragdoll.jointSpheres) {
    for (const sphere of ragdoll.jointSpheres) {
      sphere.visible = isCylinderActive;
    }
  }

  // Handle neck-to-stomach pink organ tube across X-Ray / Organ layers
  if (ragdoll.neckToStomachTube) {
    const isVisibleInMode = (mode === 0 || mode === 2 || mode === 3 || mode === 4);
    ragdoll.neckToStomachTube.visible = isVisibleInMode;
    const mat = ragdoll.neckToStomachTube.material as THREE.MeshStandardMaterial;
    if (mat) {
      if (mode === 3) {
        mat.emissive.set(0xf472b6);
        mat.emissiveIntensity = 0.7;
        mat.transparent = true;
        mat.opacity = 0.85;
      } else if (mode === 4) {
        mat.emissive.set(0xdb2777);
        mat.emissiveIntensity = 0.55;
        mat.transparent = true;
        mat.opacity = 0.85;
      } else {
        mat.emissive.set(0xdb2777);
        mat.emissiveIntensity = 0.35;
        mat.transparent = false;
        mat.opacity = 1.0;
      }
    }
  }
}



/**
 * Adds an interconnected chain of 3D wound cavity spheres penetrating inward into the limb.
 * If another voxel block in that zone is lost, more spheres are added connected between each other,
 * carving the wound progressively deeper inward ("mas profundo para adentro si pierde otro bloque en esa zona").
 */
export function addConnectedWoundSpheresToLimb(
  particle: Particle3D,
  localHit: THREE.Vector3,
  localDir: THREE.Vector3,
  radius: number = 0.065
): THREE.Mesh[] {
  if (!particle) return [];
  const parentGroup = particle.voxelsGroup || particle.mesh;
  if (!parentGroup) return [];

  const normDir = localDir.lengthSq() > 0.0001 ? localDir.clone().normalize() : new THREE.Vector3(0, 0, 1);

  // Count how many blocks in this local zone are lost/inactive
  const lostInZone = (particle.voxelBlocks || []).filter(
    (b) => !b.active && b.localPos.distanceTo(localHit) < 0.28
  ).length;

  // Each lost block in this zone adds +2 connected spheres penetrating deeper inward
  const depthLevel = Math.max(1, lostInZone);
  const sphereCount = Math.min(8, 2 + (depthLevel - 1) * 2);
  const stepDist = 0.045; // Overlapping spheres to form a seamless connected tunnel

  const createdSpheres: THREE.Mesh[] = [];
  const subSphereDefs: { pos: THREE.Vector3; radius: number }[] = [];

  for (let s = 0; s < sphereCount; s++) {
    const depthOffset = s * stepDist;
    const spherePos = localHit.clone().addScaledVector(normDir, depthOffset);
    const sphereRad = Math.max(0.032, radius * (1.0 - s * 0.06));

    // Do NOT create round crimson sphere meshes or add them to the scene to satisfy "sin sangre de herida ningun tumor"
    subSphereDefs.push({
      pos: spherePos,
      radius: sphereRad,
    });
  }

  // Deeper hole cavity morph on target meshes
  const targetMeshes: THREE.Mesh[] = [];
  if (particle.contourMesh instanceof THREE.Mesh) targetMeshes.push(particle.contourMesh);
  if (particle.mesh instanceof THREE.Mesh && particle.mesh !== particle.contourMesh) targetMeshes.push(particle.mesh);
  if ((particle as any).jointSphere instanceof THREE.Mesh) targetMeshes.push((particle as any).jointSphere as THREE.Mesh);

  for (const m of targetMeshes) {
    if (!m.userData) m.userData = {};
    if (!m.userData.holes) m.userData.holes = [];

    m.updateMatrixWorld(true);
    let meshLocalHit = localHit.clone();
    let meshNormDir = normDir.clone();

    if (particle.mesh && m !== particle.mesh) {
      const worldHit = particle.mesh.localToWorld(localHit.clone());
      meshLocalHit = m.worldToLocal(worldHit);
      const worldDir = particle.mesh ? normDir.clone().applyQuaternion(particle.mesh.quaternion) : normDir.clone();
      meshNormDir = worldDir.applyQuaternion(m.quaternion.clone().invert()).normalize();
    }

    const holeDepthFactor = 1.0 + (lostInZone * 1.5);
    const holeRadius = Math.max(radius, 0.055 * Math.sqrt(holeDepthFactor));

    const meshSubSpheres = subSphereDefs.map((sd) => {
      let subPos = sd.pos.clone();
      if (particle.mesh && m !== particle.mesh) {
        const wP = particle.mesh.localToWorld(sd.pos.clone());
        subPos = m.worldToLocal(wP);
      }
      return { pos: subPos, radius: sd.radius };
    });

    let existingHole = m.userData.holes.find(
      (h: any) => (h.pos as THREE.Vector3).distanceTo(meshLocalHit) < radius * 1.6
    );

    if (existingHole) {
      existingHole.depthFactor = Math.max(existingHole.depthFactor || 1.0, holeDepthFactor);
      existingHole.radius = Math.max(existingHole.radius || 0.055, holeRadius);
      existingHole.subSpheres = meshSubSpheres;
    } else {
      m.userData.holes.push({
        pos: meshLocalHit,
        radius: holeRadius,
        dir: meshNormDir,
        depthFactor: holeDepthFactor,
        subSpheres: meshSubSpheres,
        isSphericalHole: true,
      });
    }

    m.userData.needsDeform = true;
    applyHoleMorphToMesh(m);
  }

  const parentRagdoll = (particle as any).parentRagdoll;
  if (particle.contourMesh instanceof THREE.Mesh && parentRagdoll) {
    applySphericalMorph(particle.contourMesh, parentRagdoll.sphericalContourLevel, particle, parentRagdoll);
  }

  return createdSpheres;
}

/**
 * Paints/carves a physical cavity hole matching the exact size of the clicked voxel block.
 * Unhooks that specific block from the limb's division.
 * If a block in that zone is already missing, clicking again unhooks the next deeper block in that zone/ray,
 * joining the two (or more) spheres together to form an interconnected deeper hole tunnel ("efecto de agujero más hondo y siga así").
 */
export function paintOrDigHoleOnParticle(
  particle: Particle3D,
  worldHitPos: THREE.Vector3,
  worldRayDir?: THREE.Vector3,
  customHoleRadius?: number
): { unhookedBlock: LimbVoxelBlock | null; holeRadius: number; holeCenterWorld: THREE.Vector3 } {
  if (!particle) {
    return { unhookedBlock: null, holeRadius: 0.065, holeCenterWorld: worldHitPos.clone() };
  }

  const parentRagdoll = (particle as any).parentRagdoll;
  particle.mesh?.updateMatrixWorld(true);

  // Local coordinates
  const localHit = particle.mesh
    ? particle.mesh.worldToLocal(worldHitPos.clone())
    : new THREE.Vector3(worldHitPos.x - particle.x, worldHitPos.y - particle.y, worldHitPos.z - particle.z);

  let localRayDir = worldRayDir
    ? (particle.mesh ? worldRayDir.clone().applyQuaternion(particle.mesh.quaternion.clone().invert()).normalize() : worldRayDir.clone().normalize())
    : (localHit.lengthSq() > 0.0001 ? localHit.clone().negate().normalize() : new THREE.Vector3(0, 0, 1));

  const allBlocks = particle.voxelBlocks || [];
  const activeBlocks = allBlocks.filter((b) => b.active);

  let targetBlock: LimbVoxelBlock | null = null;
  let holeRadius = customHoleRadius && customHoleRadius > 0.01 ? customHoleRadius : 0.065;
  let localHoleCenter = localHit.clone();

  // 1. Try to find the closest active block directly at the clicked surface
  let bestDirectDist = Infinity;
  for (const b of activeBlocks) {
    const d = b.localPos.distanceTo(localHit);
    if (d < bestDirectDist) {
      bestDirectDist = d;
      targetBlock = b;
    }
  }

  // If the surface block in that zone is already inactive/missing (or distance is large),
  // search deeper along the ray trajectory into the limb's division
  if (!targetBlock || bestDirectDist > 0.12) {
    let bestDeeperDist = Infinity;
    let deeperCandidate: LimbVoxelBlock | null = null;
    for (const b of activeBlocks) {
      const toB = b.localPos.clone().sub(localHit);
      const proj = toB.dot(localRayDir);
      if (proj > 0.01) {
        const perp = toB.clone().sub(localRayDir.clone().multiplyScalar(proj)).length();
        const bRad = b.size ? Math.max(b.size[0], b.size[1], b.size[2]) * 0.85 : 0.08;
        if (perp < bRad && proj < bestDeeperDist) {
          bestDeeperDist = proj;
          deeperCandidate = b;
        }
      }
    }
    if (deeperCandidate) {
      targetBlock = deeperCandidate;
    }
  }

  if (targetBlock) {
    if (!customHoleRadius || customHoleRadius <= 0.01) {
      const bSize = targetBlock.size ? Math.max(targetBlock.size[0], targetBlock.size[1], targetBlock.size[2]) : 0.08;
      holeRadius = bSize * 0.95;
    }
  } else {
    if (!customHoleRadius || customHoleRadius <= 0.01) {
      holeRadius = 0.065;
    }
  }

  // Strictly center hole on the exact mesh contact location where it was placed/pressed
  localHoleCenter = localHit.clone();

  // 2. Unhook/erase ALL blocks within holeRadius from localHoleCenter or localHit
  const eraseRadius = Math.max(holeRadius * 1.15, 0.04);
  for (const b of allBlocks) {
    if (b.active) {
      const distToHole = b.localPos.distanceTo(localHoleCenter);
      const distToHit = b.localPos.distanceTo(localHit);
      if (distToHole <= eraseRadius || distToHit <= eraseRadius) {
        b.active = false;
        if (b.mesh) {
          b.mesh.visible = false;
        }
      }
    }
  }

  // Deactivate matching clothing/shirt/pants blocks within eraseRadius
  for (const ob of allBlocks) {
    if ((ob.isShirtBlock || ob.isPantsBlock) && ob.active) {
      const distToHole = ob.localPos.distanceTo(localHoleCenter);
      const distToHit = ob.localPos.distanceTo(localHit);
      if (distToHole <= eraseRadius || distToHit <= eraseRadius) {
        ob.active = false;
        if (ob.mesh) ob.mesh.visible = false;
      }
    }
  }

  const worldHoleCenter = worldHitPos ? worldHitPos.clone() : (particle.mesh
    ? particle.mesh.localToWorld(localHoleCenter.clone())
    : new THREE.Vector3(particle.x + localHoleCenter.x, particle.y + localHoleCenter.y, particle.z + localHoleCenter.z));

  // 3. Register hole and linked sub-spheres on all target meshes of this particle
  const targetMeshes: THREE.Mesh[] = [];
  if (particle.contourMesh instanceof THREE.Mesh) targetMeshes.push(particle.contourMesh);
  if (particle.mesh instanceof THREE.Mesh && particle.mesh !== particle.contourMesh) targetMeshes.push(particle.mesh);
  if (particle.voxelsGroup) {
    particle.voxelsGroup.traverse((c) => {
      if (c instanceof THREE.Mesh && !targetMeshes.includes(c)) targetMeshes.push(c);
    });
  }
  if ((particle as any).jointSphere instanceof THREE.Mesh) targetMeshes.push((particle as any).jointSphere as THREE.Mesh);

  for (const m of targetMeshes) {
    if (!m || !m.geometry) continue;
    if (!m.userData) m.userData = {};
    if (!m.userData.holes) m.userData.holes = [];

    m.updateMatrixWorld(true);
    let meshLocalCenter = localHoleCenter.clone();
    let meshNormDir = localRayDir.clone();

    if (particle.mesh && m !== particle.mesh) {
      const wP = particle.mesh.localToWorld(localHoleCenter.clone());
      meshLocalCenter = m.worldToLocal(wP);
      const wDir = particle.mesh.localToWorld(localRayDir.clone()).sub(particle.mesh.localToWorld(new THREE.Vector3(0,0,0))).normalize();
      meshNormDir = m.worldToLocal(wDir).normalize();
    }

    // Check if an existing hole exists in this zone to link spheres together!
    let existingHole = m.userData.holes.find(
      (h: any) => h.pos && (h.pos as THREE.Vector3).distanceTo(meshLocalCenter) < holeRadius * 2.2
    );

    if (existingHole) {
      if (!existingHole.subSpheres) existingHole.subSpheres = [];
      // Add new sphere to linked chain
      existingHole.subSpheres.push({
        pos: meshLocalCenter.clone(),
        radius: holeRadius,
      });
      existingHole.radius = Math.max(existingHole.radius || holeRadius, holeRadius);
    } else {
      m.userData.holes.push({
        pos: meshLocalCenter,
        radius: holeRadius,
        dir: meshNormDir,
        subSpheres: [],
        isSphericalHole: true,
      });
    }

    applyHoleMorphToMesh(m);
  }

  // 4. Update pseudo-3D contour morphing
  if (particle.contourMesh instanceof THREE.Mesh && parentRagdoll) {
    applySphericalMorph(particle.contourMesh, parentRagdoll.sphericalContourLevel, particle, parentRagdoll);
    applyHoleMorphToMesh(particle.contourMesh);
  }

  // 5. Break and cut voxel blocks in world space around worldHoleCenter
  breakAndCutVoxelBlocksForWorldHole(particle, worldHoleCenter, holeRadius);

  // 6. Also propagate to neighboring connected joint bridges and anatomy parts
  paintWoundOnParticleAndAnatomy(particle, worldHoleCenter, false, 32, holeRadius);

  return { unhookedBlock: targetBlock, holeRadius, holeCenterWorld: worldHoleCenter };
}

/**
 * Physically breaks, destroys, and cuts/subdivides voxel blocks across the whole body
 * for a spherical hole centered at worldHoleCenter.
 * Ensures all blocks inside holeRadius are destroyed, and blocks intersecting the sphere boundary
 * are cleanly cut/subdivided into half-blocks to fit the hole.
 */
export function breakAndCutVoxelBlocksForWorldHole(
  particle: Particle3D,
  worldHoleCenter: THREE.Vector3,
  holeRadius: number
) {
  if (!particle) return;
  const parentRagdoll = (particle as any).parentRagdoll;
  const particlesToProcess: Particle3D[] = [];

  if (parentRagdoll && parentRagdoll.particles) {
    for (const p of parentRagdoll.particles) {
      const pPos = new THREE.Vector3(p.x, p.y, p.z);
      if (p === particle || pPos.distanceTo(worldHoleCenter) < holeRadius + 0.35) {
        particlesToProcess.push(p);
      }
    }
  } else {
    particlesToProcess.push(particle);
  }

  const vTempWorldPos = new THREE.Vector3();

  for (const p of particlesToProcess) {
    if (!p.voxelBlocks || p.voxelBlocks.length === 0) continue;

    const groupObj = p.voxelsGroup || p.mesh;
    if (!groupObj) continue;

    groupObj.updateMatrixWorld(true);
    const localHoleCenter = groupObj.worldToLocal(worldHoleCenter.clone());

    const activeBlocks = [...p.voxelBlocks.filter((b) => b.active)];
    for (const block of activeBlocks) {
      if (!block.active) continue;

      const sizeArr = block.size || [0.08, 0.08, 0.08];
      const maxDim = Math.max(sizeArr[0], sizeArr[1], sizeArr[2]);
      const halfDiag = Math.sqrt(sizeArr[0] * sizeArr[0] + sizeArr[1] * sizeArr[1] + sizeArr[2] * sizeArr[2]) * 0.5;

      let blockWorldPos: THREE.Vector3;
      if (block.mesh) {
        block.mesh.getWorldPosition(vTempWorldPos);
        blockWorldPos = vTempWorldPos.clone();
      } else {
        blockWorldPos = groupObj.localToWorld(block.localPos.clone());
      }

      const distWorld = blockWorldPos.distanceTo(worldHoleCenter);

      if (distWorld > holeRadius + halfDiag) {
        continue; // Outside hole sphere influence
      }

      // If block center is inside the hole sphere (or fully enclosed):
      if (distWorld <= holeRadius * 0.88 || distWorld + halfDiag <= holeRadius) {
        block.active = false;
        if (block.mesh) {
          block.mesh.visible = false;
        }

        // Also deactivate corresponding shirt/pants/clothing blocks at this location
        for (const ob of p.voxelBlocks) {
          if ((ob.isShirtBlock || ob.isPantsBlock) && ob.active) {
            if (ob.localPos.distanceTo(block.localPos) < maxDim * 0.8) {
              ob.active = false;
              if (ob.mesh) ob.mesh.visible = false;
            }
          }
        }
      } else {
        // Block straddles the hole sphere boundary: cut/subdivide into half blocks!
        subdivideOrDestroyVoxelBlock(p, block, localHoleCenter, holeRadius);
      }
    }
  }
}

/**
 * Propagates sphere paint holes across the whole body (contourMesh, joints, breasts, genitals),
 * dynamically carving a physical spherical hole based on the spherical shape without red paint.
 * Does NOT use the old canvas blood decals ("no el sistema viejo de herida de sangre").
 */
export function paintWoundOnParticleAndAnatomy(
  particle: Particle3D,
  worldHitPos: THREE.Vector3,
  isExit: boolean = false,
  radiusPx: number = 32,
  explicitHoleRadius?: number
) {
  const holeRadius = explicitHoleRadius !== undefined ? explicitHoleRadius : Math.max(0.065, radiusPx * 0.0025);
  const parentRagdoll = (particle as any).parentRagdoll;

  // 1. Physically break and cut voxel blocks across the whole body to fit the hole sphere
  breakAndCutVoxelBlocksForWorldHole(particle, worldHitPos, holeRadius);

  const applySphereHoleToMesh = (mesh: THREE.Mesh) => {
    if (!mesh || !mesh.geometry) return;
    const meshName = (mesh.name || '').toLowerCase();
    if (meshName.includes('decal') || meshName.includes('bullethole') || meshName.includes('arrow') || meshName.includes('paint') || meshName.includes('bulletpaintsphere')) {
      return;
    }

    mesh.updateMatrixWorld(true);
    const localHit = mesh.worldToLocal(worldHitPos.clone());

    // Strict bounding check: only apply hole if world hit is within geometric reach of this mesh
    if (!mesh.geometry.boundingSphere) {
      mesh.geometry.computeBoundingSphere();
    }
    const bs = mesh.geometry.boundingSphere;
    if (bs) {
      const distToBounds = localHit.distanceTo(bs.center) - bs.radius;
      if (distToBounds > holeRadius * 2.5) {
        return;
      }
    }

    const localRayDir = localHit.lengthSq() > 0.0001 ? localHit.clone().negate().normalize() : new THREE.Vector3(0, 0, 1);

    if (!mesh.userData) mesh.userData = {};
    if (!mesh.userData.holes) mesh.userData.holes = [];

    // Deduplicate / merge overlapping holes
    const existing = mesh.userData.holes.find(
      (h: any) => h.pos && (h.pos as THREE.Vector3).distanceTo(localHit) < holeRadius * 0.7
    );
    if (existing) {
      existing.radius = Math.max(existing.radius || holeRadius, holeRadius);
      existing.pos.lerp(localHit, 0.5);
    } else {
      if (mesh.userData.holes.length >= 16) {
        mesh.userData.holes.shift();
      }
      mesh.userData.holes.push({
        pos: localHit,
        radius: holeRadius,
        radiusX: holeRadius,
        radiusY: holeRadius,
        dir: localRayDir,
        isSphericalHole: true,
      });
    }

    if (mesh.name && mesh.name.includes('ContourEnvelope') && parentRagdoll) {
      applySphericalMorph(mesh, parentRagdoll.sphericalContourLevel, particle, parentRagdoll);
    }
    applyHoleMorphToMesh(mesh);
  };

  // 1. Particle contourMesh, metaball3Mesh and carrierMesh
  if (particle.contourMesh && particle.contourMesh instanceof THREE.Mesh) {
    applySphereHoleToMesh(particle.contourMesh);
    if (parentRagdoll) {
      applySphericalMorph(particle.contourMesh, parentRagdoll.sphericalContourLevel, particle, parentRagdoll);
    }
  }

  if (particle.metaball3Mesh && particle.metaball3Mesh instanceof THREE.Mesh) {
    applySphereHoleToMesh(particle.metaball3Mesh);
  }

  // 1b. Particle individual voxel blocks (apply hole deformation to active cut child meshes)
  if (particle.voxelBlocks && Array.isArray(particle.voxelBlocks)) {
    for (const vb of particle.voxelBlocks) {
      if (vb.active && vb.mesh && vb.mesh instanceof THREE.Mesh) {
        applySphereHoleToMesh(vb.mesh);
      }
    }
  }

  // 1c. Child meshes on particle.mesh (e.g. ShirtContourEnvelope, PantsContourEnvelope, attachments)
  if (particle.mesh) {
    particle.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child !== particle.contourMesh && (child as any) !== particle.metaball3Mesh) {
        applySphereHoleToMesh(child);
      }
    });
  }

  // 2. Connected joint bridges (cylinders) across the ragdoll
  if (parentRagdoll && parentRagdoll.jointBridges) {
    for (const bridge of parentRagdoll.jointBridges) {
      bridge.updateMatrixWorld(true);
      const bridgePos = new THREE.Vector3();
      bridge.getWorldPosition(bridgePos);
      const dist = bridgePos.distanceTo(worldHitPos);
      if (bridge.userData.p1 === particle || bridge.userData.p2 === particle || dist < 0.25) {
        applySphereHoleToMesh(bridge);
        bridge.userData.needsDeform = true;
      }
    }
  }

  // 2b. Joint Spheres (ball joints connecting cylinder limbs)
  if (parentRagdoll && parentRagdoll.jointSpheres) {
    for (const sphere of parentRagdoll.jointSpheres) {
      sphere.updateMatrixWorld(true);
      const spherePos = new THREE.Vector3();
      sphere.getWorldPosition(spherePos);
      const dist = spherePos.distanceTo(worldHitPos);
      if (sphere.userData.particle === particle || dist < 0.25) {
        applySphereHoleToMesh(sphere);
      }
    }
  }

  // 3. Whole body anatomy meshes (breasts, nipples, genitals, anus, glutes) and neighboring particles
  if (parentRagdoll && parentRagdoll.particles) {
    for (const p of parentRagdoll.particles) {
      const pPos = new THREE.Vector3(p.x, p.y, p.z);
      const isNearby = p === particle || pPos.distanceTo(worldHitPos) < 0.20;

      if (isNearby && p !== particle) {
        if (p.contourMesh && p.contourMesh instanceof THREE.Mesh) {
          applySphereHoleToMesh(p.contourMesh);
          applySphericalMorph(p.contourMesh, parentRagdoll.sphericalContourLevel, p, parentRagdoll);
        }
        if (p.voxelBlocks) {
          for (const vb of p.voxelBlocks) {
            if (vb.mesh && vb.mesh instanceof THREE.Mesh) {
              applySphereHoleToMesh(vb.mesh);
            }
          }
        }
      }

      if (p.voxelsGroup) {
        p.voxelsGroup.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const name = child.name || '';
            const parentName = child.parent?.name || '';
            const isAnatomy = (
              name.includes('pecho_') ||
              name.includes('tetilla_') ||
              name.includes('shaft_') ||
              name.includes('glans_') ||
              name.includes('testicle_') ||
              name.includes('labia_') ||
              name.includes('labio_') ||
              name.includes('entrance_') ||
              name.includes('clitoris') ||
              name.includes('uterus') ||
              name.includes('ovary') ||
              name.includes('prostate') ||
              name.includes('anus') ||
              name.includes('ano_') ||
              name.includes('gluteo_') ||
              name.includes('oreja_') ||
              parentName === 'BustExtraGroup' ||
              parentName === 'GenitalExtraGroup' ||
              parentName === 'AnusExtraGroup' ||
              parentName === 'GluteExtraGroup'
            );

            if (isAnatomy) {
              const childWorldPos = new THREE.Vector3();
              child.getWorldPosition(childWorldPos);
              if (p === particle || childWorldPos.distanceTo(worldHitPos) < 0.20) {
                applySphereHoleToMesh(child);
              }
            }
          }
        });
      }
    }
  }
}

/**
 * Subdivides a LimbVoxelBlock into 8 child blocks when affected by a hole/impact,
 * or deactivates it completely if fully contained within the hole sphere.
 * "al hacerlo segun tamaño de el hueco los bloques de esa zona se corten por division osea un bloque se corte a la mitad por ejemplo"
 */
export function subdivideOrDestroyVoxelBlock(
  particle: Particle3D,
  block: LimbVoxelBlock,
  localHoleCenter: THREE.Vector3,
  holeRadius: number
): boolean {
  if (!particle || !block || !block.active) return false;

  const sizeArr = block.size || [0.08, 0.08, 0.08];
  const sizeX = sizeArr[0];
  const sizeY = sizeArr[1];
  const sizeZ = sizeArr[2];
  const maxBlockDim = Math.max(sizeX, sizeY, sizeZ);
  const blockCenter = block.localPos;
  const distToCenter = blockCenter.distanceTo(localHoleCenter);

  // If distance to block center is far greater than holeRadius + half block size, it's untouched
  const halfDiag = Math.sqrt(sizeX * sizeX + sizeY * sizeY + sizeZ * sizeZ) * 0.5;
  if (distToCenter > holeRadius + halfDiag) {
    return false;
  }

  // Deactivate the parent block and hide its mesh
  block.active = false;
  if (block.mesh) {
    block.mesh.visible = false;
  }

  // If block is already very small (< 0.022m) or if hole sphere fully covers the block:
  if (maxBlockDim < 0.022 || distToCenter + halfDiag <= holeRadius) {
    return true;
  }

  // Otherwise: Subdivide the block into 8 smaller 2x2x2 child blocks ("se corten por division osea un bloque se corte a la mitad por ejemplo")
  const subSizeX = sizeX * 0.5;
  const subSizeY = sizeY * 0.5;
  const subSizeZ = sizeZ * 0.5;

  const geom = new THREE.BoxGeometry(subSizeX, subSizeY, subSizeZ);
  const mat = block.mesh && block.mesh.material ? (block.mesh.material as THREE.Material).clone() : new THREE.MeshStandardMaterial({ color: block.color, roughness: 0.65 });

  for (let sx = -1; sx <= 1; sx += 2) {
    for (let sy = -1; sy <= 1; sy += 2) {
      for (let sz = -1; sz <= 1; sz += 2) {
        const childLocalPos = new THREE.Vector3(
          blockCenter.x + sx * (subSizeX * 0.5),
          blockCenter.y + sy * (subSizeY * 0.5),
          blockCenter.z + sz * (subSizeZ * 0.5)
        );

        const childDist = childLocalPos.distanceTo(localHoleCenter);

        // Check if child block falls inside the hole cavity
        const isInsideHole = childDist <= holeRadius * 0.95;

        if (isInsideHole) {
          continue;
        }

        // Create active child voxel block
        const childMesh = new THREE.Mesh(geom, mat);
        childMesh.position.copy(childLocalPos);
        if (particle.voxelsGroup) {
          particle.voxelsGroup.add(childMesh);
        }

        const childBlock: LimbVoxelBlock = {
          id: `${block.id}_sub_${sx}_${sy}_${sz}_${Math.random().toString(36).slice(2, 6)}`,
          localPos: childLocalPos,
          size: [subSizeX, subSizeY, subSizeZ],
          color: block.color,
          originalColor: block.originalColor || block.color,
          active: true,
          mesh: childMesh,
          isContour: block.isContour,
          isShirtBlock: block.isShirtBlock,
          isPantsBlock: block.isPantsBlock,
          isBoneBlock: block.isBoneBlock,
          isOrganBlock: block.isOrganBlock,
          layerIndex: block.layerIndex,
          gridIndex: [
            block.gridIndex ? block.gridIndex[0] * 2 + (sx > 0 ? 1 : 0) : 0,
            block.gridIndex ? block.gridIndex[1] * 2 + (sy > 0 ? 1 : 0) : 0,
            block.gridIndex ? block.gridIndex[2] * 2 + (sz > 0 ? 1 : 0) : 0,
          ],
        };

        if (particle.voxelBlocks) {
          particle.voxelBlocks.push(childBlock);
        }
      }
    }
  }

  return true;
}

export function subdivideOrDestroyVoxelBlocksForHole(
  particle: Particle3D,
  localHoleCenter: THREE.Vector3,
  holeRadius: number
) {
  if (!particle || !particle.voxelBlocks || particle.voxelBlocks.length === 0) return;
  const activeBlocks = particle.voxelBlocks.filter((b) => b.active);
  for (const block of activeBlocks) {
    subdivideOrDestroyVoxelBlock(particle, block, localHoleCenter, holeRadius);
  }
}

/**
 * Generates a painted hole cavity (hueco de pintado) matching the exact physical dimensions of a missing block.
 * Works for tetillas, ano, male glans pink tip, female pink entrance, and any destroyed body block.
 */
export function paintMissingBlockWoundHole(
  particle: Particle3D,
  block: LimbVoxelBlock
) {
  if (!particle || !block) return;
  const size = block.size ? Math.max(block.size[0], block.size[1], block.size[2]) : 0.08;
  const holeRadius = size * 0.95;

  const worldHitPos = particle.mesh
    ? particle.mesh.localToWorld(block.localPos.clone())
    : new THREE.Vector3(particle.x + block.localPos.x, particle.y + block.localPos.y, particle.z + block.localPos.z);

  paintWoundOnParticleAndAnatomy(particle, worldHitPos, false, 32, holeRadius);
}

export function deformLimbVoxelWound(
  mesh: THREE.Mesh,
  localHit: THREE.Vector3,
  localRayDir: THREE.Vector3,
  size: number
) {
  if (!mesh || !mesh.geometry) return;
  const geom = mesh.geometry as THREE.BufferGeometry;
  const posAttr = geom.attributes.position;
  const colorAttr = geom.attributes.color;
  
  if (posAttr) {
    const count = posAttr.count;
    const radius = size * 0.95; // Crater influence radius
    const targetWoundColor = new THREE.Color(0x880000); // Raw deep bloody red flesh inner wound
    
    // Direction of the bullet
    const localDir = localRayDir.clone().normalize();
    
    for (let i = 0; i < count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      const v = new THREE.Vector3(vx, vy, vz);
      
      const dist = v.distanceTo(localHit);
      if (dist < radius) {
        const factor = 1.0 - dist / radius; // 1.0 at center, 0.0 at edge
        
        // 1. "generarse un hueco" -> push inward along penetration path
        const toCenter = new THREE.Vector3(0, 0, 0).sub(v).normalize();
        const carveDir = new THREE.Vector3()
          .addScaledVector(localDir, 0.72)
          .addScaledVector(toCenter, 0.28)
          .normalize();
        
        v.addScaledVector(carveDir, size * 0.42 * factor);

        // 2. "abrirse" -> push surrounding vertices outward to open/peel the lips of the wound
        const lateral = v.clone().sub(localHit);
        lateral.addScaledVector(carveDir, -lateral.dot(carveDir));
        lateral.normalize();
        
        // Push outward at entry lips
        v.addScaledVector(lateral, size * 0.24 * factor * (1.0 - factor * 0.3));

        posAttr.setXYZ(i, v.x, v.y, v.z);

        // 3. Paint wound colors inside the cavity ("deben recibir heridas")
        if (colorAttr) {
          const r = colorAttr.getX(i);
          const g = colorAttr.getY(i);
          const b = colorAttr.getZ(i);
          const curColor = new THREE.Color(r, g, b);
          
          // Interpolate toward the deep bloody red color
          curColor.lerp(targetWoundColor, factor * 0.95);
          
          colorAttr.setXYZ(i, curColor.r, curColor.g, curColor.b);
        }
      }
    }
    
    posAttr.needsUpdate = true;
    if (colorAttr) {
      colorAttr.needsUpdate = true;
    }
    
    geom.computeVertexNormals();
    geom.computeBoundingBox();
    geom.computeBoundingSphere();
  }
}

/**
 * Destroys limb voxels at bullet impact point.
 * "el cuerpo de bloques no debe recibir ningun cambio solo perder el bloque":
 * The block is removed cleanly with no added sphere meshes or block discoloration.
 */
export function destroyLimbVoxelsAtPoint(
  particle: Particle3D,
  localHit: THREE.Vector3,
  radius: number = 0.22
): LimbVoxelBlock[] {
  if (!particle.voxelBlocks || particle.voxelBlocks.length === 0) return [];

  const activeBlocks = particle.voxelBlocks.filter((b) => b.active);
  if (activeBlocks.length === 0) return [];

  const hitBlocks: { block: LimbVoxelBlock; dist: number }[] = [];

  for (const b of activeBlocks) {
    const dist = b.localPos.distanceTo(localHit);
    hitBlocks.push({ block: b, dist });
  }

  hitBlocks.sort((a, b) => a.dist - b.dist);

  const destroyed: LimbVoxelBlock[] = [];

  // When receiving bullet or point destruction, blocks in the hit radius are subdivided or destroyed according to hole size
  if (hitBlocks.length > 0) {
    const item = hitBlocks[0];
    const holeR = Math.min(radius, 0.08);
    subdivideOrDestroyVoxelBlock(particle, item.block, localHit, holeR);
    destroyed.push(item.block);

    // Also deactivate matching shirt/pants blocks at this exact position
    if (particle.voxelBlocks) {
      for (const ob of particle.voxelBlocks) {
        if ((ob.isShirtBlock || ob.isPantsBlock) && ob.active) {
          if (ob.localPos.distanceTo(item.block.localPos) < 0.05) {
            ob.active = false;
            if (ob.mesh) {
              ob.mesh.visible = false;
            }
          }
        }
      }
    }
  }

  // Calculate local direction inward towards particle center
  const normDir = localHit.lengthSq() > 0.0001 ? localHit.clone().negate().normalize() : new THREE.Vector3(0, 0, 1);

  // Propagate sphere paint hole exactly matching missing block size ("falta de bloque tenga cada falta de bloque un hueco de pintado que sea del tamaño del bloque")
  if (destroyed.length > 0) {
    for (const dBlock of destroyed) {
      paintMissingBlockWoundHole(particle, dBlock);
    }
  } else {
    const worldHit = particle.mesh ? particle.mesh.localToWorld(localHit.clone()) : new THREE.Vector3(particle.x + localHit.x, particle.y + localHit.y, particle.z + localHit.z);
    paintWoundOnParticleAndAnatomy(particle, worldHit, false, 32);
  }

  return destroyed;
}

export interface BulletPenetrationResult {
  destroyed: LimbVoxelBlock[];
  entryLocal: THREE.Vector3;
  exitLocal: THREE.Vector3 | null;
  penetratedThrough: boolean;
}

/**
 * Creates an anatomical cross-section slice with an HTML5 Canvas texture along the X-axis of the limb,
 * covering the entire X cross section with flesh/muscle/blood textures while leaving the exact hole of
 * the 1 destroyed block uncovered and hollow.
 */
export function createLimbXSliceWoundMesh(
  particle: Particle3D,
  destroyedBlock: LimbVoxelBlock,
  sliceX: number
): THREE.Mesh {
  const canvasSize = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext('2d');

  const limbRad = particle.radius || 0.16;
  const sliceHeight = limbRad * 2.2; // Y dimension
  const sliceDepth = limbRad * 2.2;  // Z dimension

  if (ctx) {
    // 1. Draw organic circular/elliptical flesh cross section
    const cx = canvasSize / 2;
    const cy = canvasSize / 2;
    const rx = canvasSize * 0.44;
    const ry = canvasSize * 0.44;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();

    // Dark crimson subcutaneous muscle gradient
    const grad = ctx.createRadialGradient(cx, cy, rx * 0.1, cx, cy, rx);
    grad.addColorStop(0, '#7f1d1d');
    grad.addColorStop(0.5, '#991b1b');
    grad.addColorStop(0.85, '#450a0a');
    grad.addColorStop(1.0, '#1c0404');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Muscle fiber striations & fibrous rings
    for (let i = 0; i < 28; i++) {
      const ringR = rx * (0.2 + (i / 28) * 0.75);
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(239, 68, 68, 0.45)' : 'rgba(185, 28, 28, 0.6)';
      ctx.lineWidth = 1.5 + Math.random() * 2.0;
      ctx.beginPath();
      ctx.ellipse(cx, cy, ringR, ringR * (0.9 + Math.random() * 0.2), 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Blood splatters & clots on the cross section
    for (let i = 0; i < 45; i++) {
      const sx = cx + (Math.random() - 0.5) * rx * 1.6;
      const sy = cy + (Math.random() - 0.5) * ry * 1.6;
      const sr = 2 + Math.random() * 6;
      ctx.fillStyle = Math.random() > 0.4 ? '#dc2626' : '#581c87';
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bone core at center
    ctx.fillStyle = '#f8fafc'; // Ivory bone cortex
    ctx.beginPath();
    ctx.arc(cx, cy, rx * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#991b1b'; // Red bone marrow
    ctx.beginPath();
    ctx.arc(cx, cy, rx * 0.14, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Outer bleeding rim border
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 2. CUT OUT the exact destroyed voxel block location on this X slice (leaving it uncovered and hollow!)
    // Convert destroyed block localPos (Y, Z) to canvas UV coordinates
    const bY = destroyedBlock.localPos.y;
    const bZ = destroyedBlock.localPos.z;
    const bSizeY = destroyedBlock.size ? destroyedBlock.size[1] : 0.08;
    const bSizeZ = destroyedBlock.size ? destroyedBlock.size[2] : 0.08;

    // Normalizing coordinates: plane X is Z-axis (-sliceDepth/2 to +sliceDepth/2), plane Y is Y-axis (-sliceHeight/2 to +sliceHeight/2)
    const normCanvasX = cx + (bZ / sliceDepth) * canvasSize;
    const normCanvasY = cy - (bY / sliceHeight) * canvasSize;
    const holePixW = Math.max(28, (bSizeZ / sliceDepth) * canvasSize * 1.05);
    const holePixH = Math.max(28, (bSizeY / sliceHeight) * canvasSize * 1.05);

    // Clear the hole area completely so the 1 destroyed block space is open & hollow
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fillRect(normCanvasX - holePixW / 2, normCanvasY - holePixH / 2, holePixW, holePixH);

    // Add ragged edge to hole
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(69, 10, 10, 0.9)';
    ctx.lineWidth = 3;
    ctx.strokeRect(normCanvasX - holePixW / 2, normCanvasY - holePixH / 2, holePixW, holePixH);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;

  const sliceGeom = new THREE.PlaneGeometry(sliceDepth, sliceHeight);
  const sliceMat = new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.02,
    side: THREE.DoubleSide,
    roughness: 0.55,
    metalness: 0.05,
    depthWrite: true,
  });

  const sliceMesh = new THREE.Mesh(sliceGeom, sliceMat);
  sliceMesh.name = 'WoundCanvasXSlice';
  // Orient plane along the X axis
  sliceMesh.rotation.y = Math.PI / 2;
  sliceMesh.position.set(sliceX, 0, 0);
  sliceMesh.castShadow = true;
  sliceMesh.receiveShadow = true;

  return sliceMesh;
}

/**
 * Destroys limb voxels along the bullet trajectory ray.
 * ONLY 1 voxel block is lost per bullet hit, and the hit area turns red.
 */
export function destroyLimbVoxelsAlongRay(
  particle: Particle3D,
  localHit: THREE.Vector3,
  localRayDir: THREE.Vector3,
  radius: number = 0.22,
  maxRayLength: number = 0.8
): BulletPenetrationResult {
  const normRay = localRayDir.lengthSq() > 0.0001 ? localRayDir.clone().normalize() : new THREE.Vector3(0, 0, 1);
  const destroyed: LimbVoxelBlock[] = [];

  let entryBlockPos: THREE.Vector3 | null = null;
  let exitBlockPos: THREE.Vector3 | null = null;

  if (particle.voxelBlocks && particle.voxelBlocks.length > 0) {
    const activeBlocks = particle.voxelBlocks.filter((b) => b.active);
    if (activeBlocks.length > 0) {
      // Find the single closest active block to the bullet impact point
      let closestBlock: LimbVoxelBlock | null = null;
      let minDistance = Infinity;

      for (const b of activeBlocks) {
        const v = b.localPos.clone().sub(localHit);
        const proj = v.dot(normRay);
        let dist: number;
        if (proj >= -0.25 && proj <= maxRayLength) {
          const projPoint = localHit.clone().addScaledVector(normRay, proj);
          const perpDist = b.localPos.distanceTo(projPoint);
          dist = Math.sqrt(perpDist * perpDist + Math.max(0, proj) * Math.max(0, proj));
        } else {
          dist = b.localPos.distanceTo(localHit);
        }

        if (dist < minDistance) {
          minDistance = dist;
          closestBlock = b;
        }
      }

      // Strictly destroy 1 voxel block, causing real missing block ("donde pierde bloque debe hacerse ese agujero de pintado y estar entre medio de cilindro de esa zona como un pintado de pintar osea")
      if (closestBlock) {
        closestBlock.active = false; // Missing block!
        if (closestBlock.mesh) {
          closestBlock.mesh.visible = false;
        }
        destroyed.push(closestBlock);
        paintMissingBlockWoundHole(particle, closestBlock);
        entryBlockPos = closestBlock.localPos.clone();
        exitBlockPos = closestBlock.localPos.clone();

        // Also deactivate matching shirt/pants blocks at this exact position
        if (particle.voxelBlocks) {
          for (const ob of particle.voxelBlocks) {
            if ((ob.isShirtBlock || ob.isPantsBlock) && ob.active) {
              if (ob.localPos.distanceTo(closestBlock.localPos) < 0.05) {
                ob.active = false;
                if (ob.mesh) {
                  ob.mesh.visible = false;
                }
              }
            }
          }
        }

        // 3D Wound Paint Sphere on the cylinder of blocks ("esfera de pintado en el cilindro adaptada en ejes X e Y")
        const lostBlocks = (particle.voxelBlocks || []).filter((b) => !b.active);
        let minLX = closestBlock.localPos.x;
        let maxLX = closestBlock.localPos.x;
        let minLY = closestBlock.localPos.y;
        let maxLY = closestBlock.localPos.y;
        let minLZ = closestBlock.localPos.z;
        let maxLZ = closestBlock.localPos.z;

        for (const lb of lostBlocks) {
          minLX = Math.min(minLX, lb.localPos.x);
          maxLX = Math.max(maxLX, lb.localPos.x);
          minLY = Math.min(minLY, lb.localPos.y);
          maxLY = Math.max(maxLY, lb.localPos.y);
          minLZ = Math.min(minLZ, lb.localPos.z);
          maxLZ = Math.max(maxLZ, lb.localPos.z);
        }

        const bSize = closestBlock.size ? closestBlock.size[0] : 0.08;
        // Calculate adaptive span along X and Y axes according to the lost blocks
        const spanX = Math.max(bSize * 1.15, (maxLX - minLX) + bSize * 0.95);
        const spanY = Math.max(bSize * 1.15, (maxLY - minLY) + bSize * 0.95);
        const spanZ = Math.max(bSize * 1.15, (maxLZ - minLZ) + bSize * 0.95);

        const woundCenterLocal = new THREE.Vector3(
          (minLX + maxLX) * 0.5,
          (minLY + maxLY) * 0.5,
          (minLZ + maxLZ) * 0.5
        );

        // If the limb lost all its blocks, make the entire zone completely empty ("hagan que este vacio la zona si perdio todos sus bloques")
        const remainingActive = (particle.voxelBlocks || []).filter((b) => b.active).length;
        if (remainingActive === 0) {
          if (particle.mesh) particle.mesh.visible = false;
          if (particle.contourMesh) particle.contourMesh.visible = false;
          if (particle.voxelsGroup) particle.voxelsGroup.visible = false;
          if ((particle as any).jointSphere) (particle as any).jointSphere.visible = false;
          particle.dismembered = true;
          particle.health = 0;
        }
      }
    }
  }

  const entryLocal = entryBlockPos ? entryBlockPos : localHit.clone();
  let exitLocal: THREE.Vector3 | null = null;
  let penetratedThrough = false;

  // Determine whether the bullet penetrated all the way through the extremity or lodged as a depth crater
  let hasBlockingBlocksBehind = false;
  if (particle.voxelBlocks && particle.voxelBlocks.length > 0) {
    for (const b of particle.voxelBlocks) {
      if (!b.active) continue;
      const toBlock = b.localPos.clone().sub(entryLocal);
      const proj = toBlock.dot(normRay);
      if (proj > 0.04) {
        // Block is situated in front along the bullet trajectory
        const perp = toBlock.clone().sub(normRay.clone().multiplyScalar(proj)).length();
        const bRad = b.size ? Math.max(b.size[0], b.size[1], b.size[2]) * 0.75 : 0.08;
        if (perp < bRad) {
          hasBlockingBlocksBehind = true;
          break;
        }
      }
    }
  }

  // Penetrated through if there are no blocking blocks behind (or thin limb / single layer)
  penetratedThrough = !hasBlockingBlocksBehind;

  if (penetratedThrough) {
    const limbThick = particle.radius ? particle.radius * 1.8 : 0.20;
    exitLocal = entryLocal.clone().addScaledVector(normRay, limbThick);
  }

  // Calculate adaptive bullet hole cavity & red blood stain matching the destroyed blocks in X and Y axes
  const allLostBlocks = (particle.voxelBlocks || []).filter((b) => !b.active);
  let spanHoleX = radius;
  let spanHoleY = radius;
  if (allLostBlocks.length > 0) {
    let minLX = Infinity, maxLX = -Infinity;
    let minLY = Infinity, maxLY = -Infinity;
    for (const lb of allLostBlocks) {
      minLX = Math.min(minLX, lb.localPos.x);
      maxLX = Math.max(maxLX, lb.localPos.x);
      minLY = Math.min(minLY, lb.localPos.y);
      maxLY = Math.max(maxLY, lb.localPos.y);
    }
    const bSize = allLostBlocks[0].size ? allLostBlocks[0].size[0] : 0.08;
    spanHoleX = Math.max(bSize * 1.15, (maxLX - minLX) + bSize * 0.95);
    spanHoleY = Math.max(bSize * 1.15, (maxLY - minLY) + bSize * 0.95);
  }
  const adaptedHoleRadiusX = spanHoleX * 0.68;
  const adaptedHoleRadiusY = spanHoleY * 0.68;
  const bulletHoleSize = Math.max(adaptedHoleRadiusX, adaptedHoleRadiusY);

  const holeEntryObj = {
    pos: entryLocal.clone(),
    radius: bulletHoleSize,
    radiusX: adaptedHoleRadiusX,
    radiusY: adaptedHoleRadiusY,
    dir: normRay.clone(),
    isSphericalHole: true,
  };
  const holeExitObj = (penetratedThrough && exitLocal) ? {
    pos: exitLocal.clone(),
    radius: bulletHoleSize * 1.1,
    radiusX: adaptedHoleRadiusX * 1.1,
    radiusY: adaptedHoleRadiusY * 1.1,
    dir: normRay.clone(),
    isSphericalHole: true,
  } : null;

  const targetMeshes: THREE.Mesh[] = [];

  if (particle.contourMesh instanceof THREE.Mesh) {
    targetMeshes.push(particle.contourMesh);
  }
  if (particle.mesh instanceof THREE.Mesh && particle.mesh !== particle.contourMesh) {
    targetMeshes.push(particle.mesh);
  }
  if ((particle as any).jointSphere instanceof THREE.Mesh) {
    targetMeshes.push((particle as any).jointSphere as THREE.Mesh);
  }

  // Collect all child meshes (like shirt contour envelopes, sleeves, accessories) to apply bullet holes & transparency morph
  if (particle.mesh) {
    particle.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && !targetMeshes.includes(child)) {
        targetMeshes.push(child);
      }
    });
  }

  for (const m of targetMeshes) {
    if (!m.userData) m.userData = {};
    if (!m.userData.holes) m.userData.holes = [];

    let localEntryPos = entryLocal.clone();
    let localExitPos = exitLocal ? exitLocal.clone() : null;

    if (particle.mesh && m !== particle.mesh) {
      particle.mesh.updateMatrixWorld(true);
      const worldEntry = particle.mesh.localToWorld(localEntryPos.clone());
      m.updateMatrixWorld(true);
      localEntryPos = m.worldToLocal(worldEntry);

      if (localExitPos) {
        const worldExit = particle.mesh.localToWorld(localExitPos.clone());
        localExitPos = m.worldToLocal(worldExit);
      }
    }

    const meshHoleEntryObj = {
      pos: localEntryPos,
      radius: bulletHoleSize,
      radiusX: adaptedHoleRadiusX,
      radiusY: adaptedHoleRadiusY,
      dir: normRay.clone(),
      isSphericalHole: true,
    };

    const meshHoleExitObj = (penetratedThrough && localExitPos) ? {
      pos: localExitPos,
      radius: bulletHoleSize * 1.1,
      radiusX: adaptedHoleRadiusX * 1.1,
      radiusY: adaptedHoleRadiusY * 1.1,
      dir: normRay.clone(),
      isSphericalHole: true,
    } : null;

    m.userData.holes.push(meshHoleEntryObj);
    if (meshHoleExitObj) m.userData.holes.push(meshHoleExitObj);
    applyHoleMorphToMesh(m);
  }

  // Also apply holes & deforms to the connected jointBridges (Cylinder mode connections)
  const parentRagdoll = (particle as any).parentRagdoll;
  if (parentRagdoll && parentRagdoll.jointBridges) {
    const worldHit = particle.mesh ? particle.mesh.localToWorld(entryLocal.clone()) : entryLocal.clone();
    const worldRayDir = particle.mesh
      ? normRay.clone().applyQuaternion(particle.mesh.quaternion)
      : normRay.clone();

    for (const bridge of parentRagdoll.jointBridges) {
      if (bridge.userData.p1 === particle || bridge.userData.p2 === particle) {
        bridge.updateMatrixWorld(true);
        const bridgeLocalHit = bridge.worldToLocal(worldHit.clone());
        const bridgeLocalRayDir = worldRayDir.clone().applyQuaternion(bridge.quaternion.clone().invert()).normalize();

        let bridgeExitLocal: THREE.Vector3 | null = null;
        if (penetratedThrough && exitLocal) {
          const worldExit = particle.mesh ? particle.mesh.localToWorld(exitLocal.clone()) : exitLocal.clone();
          bridgeExitLocal = bridge.worldToLocal(worldExit);
        }

        const bridgeHoleEntry = {
          pos: bridgeLocalHit,
          radius: bulletHoleSize,
          radiusX: adaptedHoleRadiusX,
          radiusY: adaptedHoleRadiusY,
          dir: bridgeLocalRayDir,
          isSphericalHole: true,
          exitPos: bridgeExitLocal || undefined,
        };

        if (!bridge.userData.holes) bridge.userData.holes = [];
        bridge.userData.holes.push(bridgeHoleEntry);
        bridge.userData.needsDeform = true;
        applyHoleMorphToMesh(bridge);
      }
    }
  }

  // Also propagate holes & red color to anatomy feature meshes inside voxelsGroup
  if (particle.voxelsGroup) {
    particle.voxelsGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const name = child.name || '';
        const parentName = child.parent?.name || '';
        const isAnatomyFeature = (
          name.includes('pecho') ||
          name.includes('tetilla') ||
          name.includes('gluteo') ||
          name.includes('shaft') ||
          name.includes('glans') ||
          name.includes('testicle') ||
          name.includes('labia') ||
          name.includes('labio') ||
          name.includes('entrance') ||
          name.includes('uterus') ||
          name.includes('ovary') ||
          name.includes('prostate') ||
          name.includes('anus') ||
          name.includes('ano') ||
          name.includes('sphincter') ||
          name.includes('clitoris') ||
          name.includes('minora') ||
          name.includes('breast') ||
          name.includes('glute') ||
          name.includes('penis') ||
          name.includes('erection') ||
          name.includes('genital') ||
          parentName.includes('Bust') ||
          parentName.includes('Glute') ||
          parentName.includes('Genital') ||
          parentName.includes('Anus') ||
          parentName.includes('Erection') ||
          parentName === 'BustExtraGroup' ||
          parentName === 'GluteExtraGroup' ||
          parentName === 'GenitalExtraGroup' ||
          parentName === 'AnusExtraGroup'
        );
        if (isAnatomyFeature) {
          if (!child.userData) child.userData = {};
          if (!child.userData.holes) {
            child.userData.holes = [];
          }
          child.userData.holes.push({
            pos: entryLocal.clone(),
            radius: Math.max(0.42, radius * 1.7),
            dir: normRay.clone(),
          });
          applyHoleMorphToMesh(child);
        }
      }
    });
  }

  if (destroyed.length > 0) {
    const worldEntry = particle.mesh ? particle.mesh.localToWorld(entryLocal.clone()) : entryLocal.clone();
    paintWoundOnParticleAndAnatomy(particle, worldEntry, false, 32);

    if (penetratedThrough && exitLocal) {
      const worldExit = particle.mesh ? particle.mesh.localToWorld(exitLocal.clone()) : exitLocal.clone();
      paintWoundOnParticleAndAnatomy(particle, worldExit, true, 32);
    }
  }

  return {
    destroyed,
    entryLocal,
    exitLocal,
    penetratedThrough,
  };
}

/**
 * Clear all bullet holes and restore base geometry positions on a mesh
 */
export function clearHolesOnMesh(mesh: THREE.Mesh) {
  if (!mesh || !mesh.userData) return;
  mesh.userData.holes = [];

  // Clear shader positions and radii
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const mat of mats) {
    if (mat && mat.userData) {
      mat.userData.holePositions = [];
      mat.userData.holeRadii = [];
      mat.needsUpdate = true;
    }
  }

  // Restore physical vertex coordinates from saved basePositions
  if (mesh.userData.basePositions && mesh.geometry) {
    const posAttr = mesh.geometry.attributes.position as THREE.BufferAttribute;
    if (posAttr) {
      posAttr.copyArray(mesh.userData.basePositions);
      posAttr.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
      mesh.geometry.computeBoundingBox();
      mesh.geometry.computeBoundingSphere();
    }
  }
}

/**
 * Restores all voxel blocks across all limbs of a ragdoll (for Reiniciar button)
 */
export function restoreRagdollVoxels(ragdoll: Ragdoll3D) {
  for (const p of ragdoll.particles) {
    // Reset skin layer holes
    if (p.contourMesh && p.contourMesh.userData) {
      if (p.contourMesh instanceof THREE.Mesh) {
        clearHolesOnMesh(p.contourMesh);
        applySphericalMorph(p.contourMesh, ragdoll.sphericalContourLevel, p, ragdoll);
      } else {
        p.contourMesh.userData.holes = [];
      }
    }

    if (p.mesh && p.mesh instanceof THREE.Mesh) {
      clearHolesOnMesh(p.mesh);
    }

    if ((p as any).jointSphere && (p as any).jointSphere instanceof THREE.Mesh) {
      clearHolesOnMesh((p as any).jointSphere);
    }

    if (p.voxelsGroup) {
      p.voxelsGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.userData && child.userData.holes) {
            clearHolesOnMesh(child);
          }
          const name = child.name || '';
          const parentName = child.parent?.name || '';
          const isAnatomyFeature = (
            name.includes('pecho') ||
            name.includes('tetilla') ||
            name.includes('gluteo') ||
            name.includes('shaft') ||
            name.includes('glans') ||
            name.includes('testicle') ||
            name.includes('labia') ||
            name.includes('labio') ||
            name.includes('entrance') ||
            name.includes('uterus') ||
            name.includes('ovary') ||
            name.includes('prostate') ||
            name.includes('anus') ||
            name.includes('ano') ||
            name.includes('sphincter') ||
            name.includes('clitoris') ||
            name.includes('minora') ||
            name.includes('breast') ||
            name.includes('glute') ||
            name.includes('penis') ||
            name.includes('erection') ||
            name.includes('genital') ||
            parentName.includes('Bust') ||
            parentName.includes('Glute') ||
            parentName.includes('Genital') ||
            parentName.includes('Anus') ||
            parentName.includes('Erection') ||
            parentName === 'BustExtraGroup' ||
            parentName === 'GluteExtraGroup' ||
            parentName === 'GenitalExtraGroup' ||
            parentName === 'AnusExtraGroup'
          );
          if (isAnatomyFeature && child.userData && child.userData.base3DPositions) {
            applySphericalMorph(child, ragdoll.sphericalContourLevel, p, ragdoll);
          }
        }
      });
    }

    if ((p as any).woundPaintSphere) {
      const sp = (p as any).woundPaintSphere as THREE.Mesh;
      if (sp.parent) sp.parent.remove(sp);
      if (sp.geometry) sp.geometry.dispose();
      (p as any).woundPaintSphere = undefined;
    }

    if (p.voxelBlocks && p.voxelsGroup) {
      for (const b of p.voxelBlocks) {
        b.active = true;
        if (b.mesh) {
          b.mesh.visible = true;
          if (!p.voxelsGroup.children.includes(b.mesh)) {
            p.voxelsGroup.add(b.mesh);
          }
          if (b.mesh.material) {
            const mat = b.mesh.material as THREE.MeshStandardMaterial;
            mat.color.set(b.originalColor);
            mat.emissive.set(0x000000);
            mat.emissiveIntensity = 0;
          }
        }
      }
    }
  }

  // Reset jointBridges holes
  if (ragdoll.jointBridges) {
    for (const bridge of ragdoll.jointBridges) {
      clearHolesOnMesh(bridge);
    }
  }

  ragdoll.stats.destroyedBlocks = 0;

  // IMPORTANT: Explicitly restore breasts, glutes, genitals, and skin color when ragdoll is restored!
  if (ragdoll.hasBustAndGlutes !== undefined) {
    updateRagdollBustAndGlutes(ragdoll, Boolean(ragdoll.hasBustAndGlutes));
  }
  if (ragdoll.genitalType) {
    updateRagdollGenitals(ragdoll, ragdoll.genitalType);
  }
  const sColor = getRagdollSkinColor(ragdoll);
  updateRagdollSkinColor(ragdoll, sColor);
}

/**
 * Creates a clean standard multi-voxel humanoid character composed of several cubes per limb
 */
export function createArticulatedRagdoll3D(
  spawnX: number = 0,
  spawnY: number = 0,
  spawnZ: number = 0,
  scale: number = 1.0,
  scene?: THREE.Scene,
  initialSphericalContour: number = 100,
  contourEnabled: boolean = true,
  customMat?: THREE.Material,
  nameTag?: string,
  initialVoxelShape: 'cube' | 'sphere' = 'cube'
): Ragdoll3D {
  const id = 'voxel_char_' + Math.random().toString(36).substring(2, 9);
  const particles: Particle3D[] = [];
  const constraints: Constraint3D[] = [];

  const groupMesh = new THREE.Group();
  groupMesh.name = id;

  const characterSkinColor = (customMat && (customMat as THREE.MeshStandardMaterial).color)
    ? (customMat as THREE.MeshStandardMaterial).color.getHex()
    : skinColor;

  function addVoxelLimbPart(
    name: BodyPartName,
    relX: number,
    relY: number,
    relZ: number,
    width: number,
    height: number,
    depth: number,
    mass: number,
    isVital: boolean = false,
    baseColorOverride?: number
  ): Particle3D {
    const px = spawnX + relX * scale;
    const py = spawnY + relY * scale;
    const pz = spawnZ + relZ * scale;

    const w = width * scale;
    const h = height * scale;
    const d = depth * scale;

    let baseColor = characterSkinColor;
    if (baseColorOverride !== undefined && baseColorOverride !== skinColor) {
      baseColor = baseColorOverride;
    }

    if (customMat && (customMat as THREE.MeshStandardMaterial).color) {
      baseColor = (customMat as THREE.MeshStandardMaterial).color.getHex();
    }

    // Carrier Mesh
    const carrierMesh = new THREE.Group();
    carrierMesh.name = `Carrier_${name}`;
    carrierMesh.position.set(px, py, pz);
    groupMesh.add(carrierMesh);

    // Multi-voxel grid (several cubes/spheres per limb!)
    const { voxelsGroup, voxelBlocks } = createMultiVoxelLimb(name, w, h, d, baseColor, initialVoxelShape, initialSphericalContour / 100);
    voxelsGroup.visible = true;
    carrierMesh.add(voxelsGroup);

    if (name === 'cuello') {
      const esophagus = createEsophagus(name, w, h, d, voxelBlocks, voxelsGroup);
      voxelsGroup.add(esophagus);
    } else if (name === 'pechobase' || name === 'pecho_bajo') {
      const chestEsophagus = createChestEsophagusTube(w, h, d, voxelBlocks, voxelsGroup);
      voxelsGroup.add(chestEsophagus);
    } else if (name === 'torso') {
      const torsoOrgans = createTorsoOrgans(w, h, d, voxelBlocks, voxelsGroup);
      voxelsGroup.add(torsoOrgans);
    } else if (name === 'ombligo' || name === 'ombligo_bajo') {
      const abdominalOrgans = createAbdominalOrgans(name, w, h, d, voxelBlocks, voxelsGroup);
      voxelsGroup.add(abdominalOrgans);
    }

    // Pseudo-3D / Fake 2D Spherical Contour Envelope Layer
    const contourMesh = createPseudo3DContourMesh(name, w, h, d, initialSphericalContour, baseColor);
    contourMesh.userData.voxelBlocks = voxelBlocks; // Pass the active voxel blocks to the contour mesh for hole-carving & morphing
    contourMesh.visible = contourEnabled;
    carrierMesh.add(contourMesh);

    // Metaball 3 Parallel Cubic Polygon Stack
    const metaball3Mesh = createMetaball3LimbMesh(name, w, h, d, baseColor, initialSphericalContour);
    metaball3Mesh.visible = false;
    carrierMesh.add(metaball3Mesh);

    const radius = Math.max(w, h, d) * 0.45;

    const p: Particle3D = {
      id: `${id}_${name}`,
      x: px,
      y: py,
      z: pz,
      oldX: px,
      oldY: py,
      oldZ: pz,
      vx: 0,
      vy: 0,
      vz: 0,
      mass,
      radius,
      pinned: false,
      name,
      parentRagdollId: id,
      health: 180,
      maxHealth: 180,
      fractured: false,
      dismembered: false,
      isVital,
      bleedingRate: 0,
      mesh: carrierMesh,
      boxDims: [width, height, depth],
      voxelBlocks,
      voxelsGroup,
      contourMesh,
      metaball3Mesh,
      widthMultiplier: 1.0,
    };

    particles.push(p);
    return p;
  }

  function addJoint(
    p1: Particle3D,
    p2: Particle3D,
    stiffness: number = 0.95,
    breakForce: number = 2400,
    name: string = ''
  ): Constraint3D {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;

    const c: Constraint3D = {
      id: `${p1.id}_to_${p2.id}`,
      p1,
      p2,
      length: len,
      originalLength: len,
      stiffness,
      breakForce,
      broken: false,
      name: name || `${p1.name}-${p2.name}`,
    };
    constraints.push(c);
    return c;
  }

  // 1. Central Multi-Voxel Spine (Cabeza, Cuello, Pecho, Torso, Ombligo, Pelvis)
  const cabeza = addVoxelLimbPart('cabeza', 0, 1.91, 0, 0.28, 0.28, 0.28, 4.0, true, skinColor);
  if (cabeza.contourMesh && cabeza.contourMesh instanceof THREE.Mesh) {
    cabeza.contourMesh.userData.eyeHoles = [];
    cabeza.contourMesh.userData.holes = [...(cabeza.contourMesh.userData.bulletHoles || [])];
    applyHoleMorphToMesh(cabeza.contourMesh);
  }
  const cuello = addVoxelLimbPart('cuello', 0, 1.70, 0, 0.12, 0.14, 0.12, 1.5, true, skinColor);
  const pechobase = addVoxelLimbPart('pechobase', 0, 1.55, 0, 0.39, 0.12, 0.22, 3.8, true, skinColor);
  const pechoBajo = addVoxelLimbPart('pecho_bajo' as BodyPartName, 0, 1.43, 0, 0.39, 0.12, 0.22, 3.8, true, skinColor);
  const torso = addVoxelLimbPart('torso', 0, 1.31, 0, 0.39, 0.12, 0.22, 4.0, true, skinColor);
  const ombligo = addVoxelLimbPart('ombligo', 0, 1.19, 0, 0.39, 0.12, 0.22, 3.8, false, skinColor);
  const ombligoBajo = addVoxelLimbPart('ombligo_bajo' as BodyPartName, 0, 1.07, 0, 0.39, 0.12, 0.22, 3.8, false, skinColor);
  const pelvis = addVoxelLimbPart('pelvis', 0, 0.95, 0, 0.39, 0.12, 0.22, 4.5, false, skinColor);

  addJoint(cabeza, cuello, 0.98, 3000, 'cabeza_cuello');
  addJoint(cuello, pechobase, 0.98, 3000, 'cuello_pechobase');
  addJoint(pechobase, pechoBajo, 0.98, 3500, 'pechobase_pechobajo');
  addJoint(pechoBajo, torso, 0.98, 3500, 'pechobajo_torso');
  addJoint(torso, ombligo, 0.98, 3500, 'torso_ombligo');
  addJoint(ombligo, ombligoBajo, 0.98, 3500, 'ombligo_ombligobajo');
  addJoint(ombligoBajo, pelvis, 0.98, 3500, 'ombligobajo_pelvis');
  addJoint(pechobase, pelvis, 0.90, 1200, 'pecho_pelvis_stabilizer');

  // 2. Left Arm (Hombro, Brazo, Codo, Antebrazo, Muñeca, Mano, Dedos de 3 segmentos)
  const hombroIzq = addVoxelLimbPart('hombro_izq', -0.28, 1.55, 0, 0.12, 0.18, 0.13, 1.8, false, skinColor); // Flaco como antebrazo (0.12 x 0.13)
  const brazoIzq = addVoxelLimbPart('brazo_izq', -0.28, 1.36, 0, 0.13, 0.20, 0.14, 2.0, false, skinColor);
  const codoIzq = addVoxelLimbPart('codo_izq', -0.28, 1.21, 0, 0.12, 0.10, 0.13, 1.2, false, skinColor);
  const antebrazoIzq = addVoxelLimbPart('antebrazo_izq', -0.28, 1.05, 0, 0.12, 0.22, 0.13, 1.8, false, skinColor);
  const munecaIzq = addVoxelLimbPart('muneca_izq', -0.28, 0.90, 0, 0.11, 0.08, 0.12, 1.0, false, skinColor);
  const manoIzq = addVoxelLimbPart('mano_izq', -0.28, 0.80, 0, 0.11, 0.12, 0.12, 1.0, false, skinColor);

  // Pulgar Izquierdo (3 segmentos: base, flexor seg2, punta seg3) - En el borde medial interior (+X hacia torso) y anterior (+Z)
  const dedoPulgarIzq = addVoxelLimbPart('dedo_pulgar_izq', -0.250, 0.770, 0.035, 0.026, 0.035, 0.026, 0.08, false, skinColor);
  const dedoPulgarIzqSeg2 = addVoxelLimbPart('dedo_pulgar_izq_seg2', -0.240, 0.735, 0.038, 0.024, 0.035, 0.024, 0.07, false, skinColor);
  const dedoPulgarIzqSeg3 = addVoxelLimbPart('dedo_pulgar_izq_seg3', -0.235, 0.705, 0.040, 0.022, 0.030, 0.022, 0.06, false, skinColor);

  // Índice Izquierdo (3 segmentos: base, flexor seg2, punta seg3) - En el borde anterior (+Z)
  const dedoIndiceIzq = addVoxelLimbPart('dedo_indice_izq', -0.290, 0.750, 0.035, 0.024, 0.035, 0.024, 0.08, false, skinColor);
  const dedoIndiceIzqSeg2 = addVoxelLimbPart('dedo_indice_izq_seg2', -0.290, 0.710, 0.035, 0.022, 0.035, 0.022, 0.07, false, skinColor);
  const dedoIndiceIzqSeg3 = addVoxelLimbPart('dedo_indice_izq_seg3', -0.290, 0.675, 0.035, 0.020, 0.030, 0.020, 0.06, false, skinColor);

  // Medio Izquierdo (3 segmentos: base, flexor seg2, punta seg3) - Separado del centro hacia anterior (+Z)
  const dedoMedioIzq = addVoxelLimbPart('dedo_medio_izq', -0.290, 0.745, 0.012, 0.024, 0.038, 0.024, 0.08, false, skinColor);
  const dedoMedioIzqSeg2 = addVoxelLimbPart('dedo_medio_izq_seg2', -0.290, 0.700, 0.012, 0.022, 0.036, 0.022, 0.07, false, skinColor);
  const dedoMedioIzqSeg3 = addVoxelLimbPart('dedo_medio_izq_seg3', -0.290, 0.660, 0.012, 0.020, 0.032, 0.020, 0.06, false, skinColor);

  // Anular Izquierdo (3 segmentos: base, flexor seg2, punta seg3) - Separado del centro hacia posterior (-Z)
  const dedoAnularIzq = addVoxelLimbPart('dedo_anular_izq', -0.290, 0.750, -0.012, 0.024, 0.035, 0.024, 0.08, false, skinColor);
  const dedoAnularIzqSeg2 = addVoxelLimbPart('dedo_anular_izq_seg2', -0.290, 0.710, -0.012, 0.022, 0.035, 0.022, 0.07, false, skinColor);
  const dedoAnularIzqSeg3 = addVoxelLimbPart('dedo_anular_izq_seg3', -0.290, 0.675, -0.012, 0.020, 0.030, 0.020, 0.06, false, skinColor);

  // Meñique Izquierdo (3 segmentos: base, flexor seg2, punta seg3) - En el borde posterior (-Z)
  const dedoMeniqueIzq = addVoxelLimbPart('dedo_menique_izq', -0.290, 0.755, -0.035, 0.022, 0.032, 0.022, 0.06, false, skinColor);
  const dedoMeniqueIzqSeg2 = addVoxelLimbPart('dedo_menique_izq_seg2', -0.290, 0.720, -0.035, 0.020, 0.030, 0.020, 0.05, false, skinColor);
  const dedoMeniqueIzqSeg3 = addVoxelLimbPart('dedo_menique_izq_seg3', -0.290, 0.690, -0.035, 0.018, 0.026, 0.018, 0.04, false, skinColor);

  addJoint(pechobase, hombroIzq, 0.98, 3000, 'pecho_hombro_izq');
  addJoint(hombroIzq, brazoIzq, 0.98, 2800, 'hombro_brazo_izq');
  addJoint(brazoIzq, codoIzq, 0.98, 2700, 'brazo_codo_izq');
  addJoint(codoIzq, antebrazoIzq, 0.98, 2700, 'codo_antebrazo_izq');
  addJoint(antebrazoIzq, munecaIzq, 0.98, 2500, 'antebrazo_muneca_izq');
  addJoint(munecaIzq, manoIzq, 0.98, 2400, 'muneca_mano_izq');

  // Pulgar Izq articulaciones
  addJoint(manoIzq, dedoPulgarIzq, 0.99, 999999, 'mano_pulgar_izq');
  addJoint(dedoPulgarIzq, dedoPulgarIzqSeg2, 0.99, 999999, 'pulgar_seg1_seg2_izq');
  addJoint(dedoPulgarIzqSeg2, dedoPulgarIzqSeg3, 0.99, 999999, 'pulgar_seg2_seg3_izq');

  // Índice Izq articulaciones
  addJoint(manoIzq, dedoIndiceIzq, 0.99, 999999, 'mano_indice_izq');
  addJoint(dedoIndiceIzq, dedoIndiceIzqSeg2, 0.99, 999999, 'indice_seg1_seg2_izq');
  addJoint(dedoIndiceIzqSeg2, dedoIndiceIzqSeg3, 0.99, 999999, 'indice_seg2_seg3_izq');

  // Medio Izq articulaciones
  addJoint(manoIzq, dedoMedioIzq, 0.99, 999999, 'mano_medio_izq');
  addJoint(dedoMedioIzq, dedoMedioIzqSeg2, 0.99, 999999, 'medio_seg1_seg2_izq');
  addJoint(dedoMedioIzqSeg2, dedoMedioIzqSeg3, 0.99, 999999, 'medio_seg2_seg3_izq');

  // Anular Izq articulaciones
  addJoint(manoIzq, dedoAnularIzq, 0.99, 999999, 'mano_anular_izq');
  addJoint(dedoAnularIzq, dedoAnularIzqSeg2, 0.99, 999999, 'anular_seg1_seg2_izq');
  addJoint(dedoAnularIzqSeg2, dedoAnularIzqSeg3, 0.99, 999999, 'anular_seg2_seg3_izq');

  // Meñique Izq articulaciones
  addJoint(manoIzq, dedoMeniqueIzq, 0.99, 999999, 'mano_menique_izq');
  addJoint(dedoMeniqueIzq, dedoMeniqueIzqSeg2, 0.99, 999999, 'menique_seg1_seg2_izq');
  addJoint(dedoMeniqueIzqSeg2, dedoMeniqueIzqSeg3, 0.99, 999999, 'menique_seg2_seg3_izq');

  // 3. Right Arm (Hombro, Brazo, Codo, Antebrazo, Muñeca, Mano, Dedos de 3 segmentos)
  const hombroDer = addVoxelLimbPart('hombro_der', 0.28, 1.55, 0, 0.12, 0.18, 0.13, 1.8, false, skinColor); // Flaco como antebrazo (0.12 x 0.13)
  const brazoDer = addVoxelLimbPart('brazo_der', 0.28, 1.36, 0, 0.13, 0.20, 0.14, 2.0, false, skinColor);
  const codoDer = addVoxelLimbPart('codo_der', 0.28, 1.21, 0, 0.12, 0.10, 0.13, 1.2, false, skinColor);
  const antebrazoDer = addVoxelLimbPart('antebrazo_der', 0.28, 1.05, 0, 0.12, 0.22, 0.13, 1.8, false, skinColor);
  const munecaDer = addVoxelLimbPart('muneca_der', 0.28, 0.90, 0, 0.11, 0.08, 0.12, 1.0, false, skinColor);
  const manoDer = addVoxelLimbPart('mano_der', 0.28, 0.80, 0, 0.11, 0.12, 0.12, 1.0, false, skinColor);

  // Pulgar Derecho (3 segmentos: base, flexor seg2, punta seg3) - En el borde medial interior (-X hacia torso) y anterior (+Z)
  const dedoPulgarDer = addVoxelLimbPart('dedo_pulgar_der', 0.250, 0.770, 0.035, 0.026, 0.035, 0.026, 0.08, false, skinColor);
  const dedoPulgarDerSeg2 = addVoxelLimbPart('dedo_pulgar_der_seg2', 0.240, 0.735, 0.038, 0.024, 0.035, 0.024, 0.07, false, skinColor);
  const dedoPulgarDerSeg3 = addVoxelLimbPart('dedo_pulgar_der_seg3', 0.235, 0.705, 0.040, 0.022, 0.030, 0.022, 0.06, false, skinColor);

  // Índice Derecho (3 segmentos: base, flexor seg2, punta seg3) - En el borde anterior (+Z)
  const dedoIndiceDer = addVoxelLimbPart('dedo_indice_der', 0.290, 0.750, 0.035, 0.024, 0.035, 0.024, 0.08, false, skinColor);
  const dedoIndiceDerSeg2 = addVoxelLimbPart('dedo_indice_der_seg2', 0.290, 0.710, 0.035, 0.022, 0.035, 0.022, 0.07, false, skinColor);
  const dedoIndiceDerSeg3 = addVoxelLimbPart('dedo_indice_der_seg3', 0.290, 0.675, 0.035, 0.020, 0.030, 0.020, 0.06, false, skinColor);

  // Medio Derecho (3 segmentos: base, flexor seg2, punta seg3) - Separado del centro hacia anterior (+Z)
  const dedoMedioDer = addVoxelLimbPart('dedo_medio_der', 0.290, 0.745, 0.012, 0.024, 0.038, 0.024, 0.08, false, skinColor);
  const dedoMedioDerSeg2 = addVoxelLimbPart('dedo_medio_der_seg2', 0.290, 0.700, 0.012, 0.022, 0.036, 0.022, 0.07, false, skinColor);
  const dedoMedioDerSeg3 = addVoxelLimbPart('dedo_medio_der_seg3', 0.290, 0.660, 0.012, 0.020, 0.032, 0.020, 0.06, false, skinColor);

  // Anular Derecho (3 segmentos: base, flexor seg2, punta seg3) - Separado del centro hacia posterior (-Z)
  const dedoAnularDer = addVoxelLimbPart('dedo_anular_der', 0.290, 0.750, -0.012, 0.024, 0.035, 0.024, 0.08, false, skinColor);
  const dedoAnularDerSeg2 = addVoxelLimbPart('dedo_anular_der_seg2', 0.290, 0.710, -0.012, 0.022, 0.035, 0.022, 0.07, false, skinColor);
  const dedoAnularDerSeg3 = addVoxelLimbPart('dedo_anular_der_seg3', 0.290, 0.675, -0.012, 0.020, 0.030, 0.020, 0.06, false, skinColor);

  // Meñique Derecho (3 segmentos: base, flexor seg2, punta seg3) - En el borde posterior (-Z)
  const dedoMeniqueDer = addVoxelLimbPart('dedo_menique_der', 0.290, 0.755, -0.035, 0.022, 0.032, 0.022, 0.06, false, skinColor);
  const dedoMeniqueDerSeg2 = addVoxelLimbPart('dedo_menique_der_seg2', 0.290, 0.720, -0.035, 0.020, 0.030, 0.020, 0.05, false, skinColor);
  const dedoMeniqueDerSeg3 = addVoxelLimbPart('dedo_menique_der_seg3', 0.290, 0.690, -0.035, 0.018, 0.026, 0.018, 0.04, false, skinColor);

  addJoint(pechobase, hombroDer, 0.98, 3000, 'pecho_hombro_der');
  addJoint(hombroDer, brazoDer, 0.98, 2800, 'hombro_brazo_der');
  addJoint(brazoDer, codoDer, 0.98, 2700, 'brazo_codo_der');
  addJoint(codoDer, antebrazoDer, 0.98, 2700, 'codo_antebrazo_der');
  addJoint(antebrazoDer, munecaDer, 0.98, 2500, 'antebrazo_muneca_der');
  addJoint(munecaDer, manoDer, 0.98, 2400, 'muneca_mano_der');

  // Pulgar Der articulaciones
  addJoint(manoDer, dedoPulgarDer, 0.99, 999999, 'mano_pulgar_der');
  addJoint(dedoPulgarDer, dedoPulgarDerSeg2, 0.99, 999999, 'pulgar_seg1_seg2_der');
  addJoint(dedoPulgarDerSeg2, dedoPulgarDerSeg3, 0.99, 999999, 'pulgar_seg2_seg3_der');

  // Índice Der articulaciones
  addJoint(manoDer, dedoIndiceDer, 0.99, 999999, 'mano_indice_der');
  addJoint(dedoIndiceDer, dedoIndiceDerSeg2, 0.99, 999999, 'indice_seg1_seg2_der');
  addJoint(dedoIndiceDerSeg2, dedoIndiceDerSeg3, 0.99, 999999, 'indice_seg2_seg3_der');

  // Medio Der articulaciones
  addJoint(manoDer, dedoMedioDer, 0.99, 999999, 'mano_medio_der');
  addJoint(dedoMedioDer, dedoMedioDerSeg2, 0.99, 999999, 'medio_seg1_seg2_der');
  addJoint(dedoMedioDerSeg2, dedoMedioDerSeg3, 0.99, 999999, 'medio_seg2_seg3_der');

  // Anular Der articulaciones
  addJoint(manoDer, dedoAnularDer, 0.99, 999999, 'mano_anular_der');
  addJoint(dedoAnularDer, dedoAnularDerSeg2, 0.99, 999999, 'anular_seg1_seg2_der');
  addJoint(dedoAnularDerSeg2, dedoAnularDerSeg3, 0.99, 999999, 'anular_seg2_seg3_der');

  // Meñique Der articulaciones
  addJoint(manoDer, dedoMeniqueDer, 0.99, 999999, 'mano_menique_der');
  addJoint(dedoMeniqueDer, dedoMeniqueDerSeg2, 0.99, 999999, 'menique_seg1_seg2_der');
  addJoint(dedoMeniqueDerSeg2, dedoMeniqueDerSeg3, 0.99, 999999, 'menique_seg2_seg3_der');

  // 4. Left Leg (Muslo, Rodilla, Antepierna, Tobillo, Pie de 3 partes con medio más flaco)
  const musloIzq = addVoxelLimbPart('muslo_izq', -0.145, 0.74, 0, 0.16, 0.30, 0.18, 3.2, false, skinColor);
  const rodillaIzq = addVoxelLimbPart('rodilla_izq', -0.145, 0.53, 0, 0.15, 0.12, 0.16, 1.5, false, skinColor);
  const antepiernaIzq = addVoxelLimbPart('antepierna_izq', -0.145, 0.28, 0, 0.15, 0.38, 0.16, 3.0, false, skinColor);
  const tobilloIzq = addVoxelLimbPart('tobillo_izq', -0.145, 0.065, 0.0, 0.055, 0.05, 0.055, 0.8, false, skinColor); // Extremidad tobillo menor ancho

  // Pie de 3 partes (talón, medio uniforme, frente) con dimensiones uniformes y altura exacta 0.07 (eje Y)
  const pieIzqTalon = addVoxelLimbPart('pie_izq_talon' as BodyPartName, -0.145, 0.035, -0.01, 0.14, 0.07, 0.06, 0.3, false, skinColor);
  const pieIzqMedio = addVoxelLimbPart('pie_izq_medio' as BodyPartName, -0.145, 0.035, 0.05, 0.14, 0.07, 0.06, 0.3, false, skinColor);
  const pieIzq = addVoxelLimbPart('pie_izq', -0.145, 0.035, 0.11, 0.14, 0.07, 0.06, 0.3, false, skinColor); 

  // Dedos colocados estrictamente ADELANTE (Z=0.180, profundidad 0.05) con misma altura (0.07) y Y (0.035)
  const dedoPiePulgarIzq = addVoxelLimbPart('dedo_pie_pulgar_izq', -0.095, 0.035, 0.180, 0.028, 0.07, 0.05, 0.2, false, skinColor);
  const dedoPieIndiceIzq = addVoxelLimbPart('dedo_pie_indice_izq', -0.120, 0.035, 0.180, 0.028, 0.07, 0.05, 0.2, false, skinColor);
  const dedoPieMedioIzq = addVoxelLimbPart('dedo_pie_medio_izq', -0.145, 0.035, 0.180, 0.028, 0.07, 0.05, 0.2, false, skinColor);
  const dedoPieAnularIzq = addVoxelLimbPart('dedo_pie_anular_izq', -0.170, 0.035, 0.180, 0.028, 0.07, 0.05, 0.2, false, skinColor);
  const dedoPieMeniqueIzq = addVoxelLimbPart('dedo_pie_menique_izq', -0.195, 0.035, 0.180, 0.028, 0.07, 0.05, 0.2, false, skinColor);

  addJoint(pelvis, musloIzq, 0.98, 2600, 'pelvis_muslo_izq');
  addJoint(musloIzq, rodillaIzq, 0.98, 2400, 'muslo_rodilla_izq');
  addJoint(rodillaIzq, antepiernaIzq, 0.98, 2400, 'rodilla_antepierna_izq');
  addJoint(antepiernaIzq, tobilloIzq, 0.98, 2000, 'antepierna_tobillo_izq');
  addJoint(tobilloIzq, pieIzqTalon, 0.99, 999999, 'tobillo_pie_izq_talon');
  addJoint(tobilloIzq, pieIzqMedio, 0.99, 999999, 'tobillo_pie_izq_medio'); // Secure ankle-foot alignment & render extensor tendon
  addJoint(pieIzqTalon, pieIzqMedio, 0.99, 999999, 'pie_talon_medio_izq');
  addJoint(pieIzqMedio, pieIzq, 0.99, 999999, 'pie_medio_frente_izq');
  
  addJoint(pieIzq, dedoPiePulgarIzq, 0.99, 999999, 'pie_pulgar_izq');
  addJoint(pieIzq, dedoPieIndiceIzq, 0.99, 999999, 'pie_indice_izq');
  addJoint(pieIzq, dedoPieMedioIzq, 0.99, 999999, 'pie_dedo_medio_izq');
  addJoint(pieIzq, dedoPieAnularIzq, 0.99, 999999, 'pie_anular_izq');
  addJoint(pieIzq, dedoPieMeniqueIzq, 0.99, 999999, 'pie_menique_izq');

  // 5. Right Leg (Muslo, Rodilla, Antepierna, Tobillo, Pie de 3 partes uniformes)
  const musloDer = addVoxelLimbPart('muslo_der', 0.145, 0.74, 0, 0.16, 0.30, 0.18, 3.2, false, skinColor);
  const rodillaDer = addVoxelLimbPart('rodilla_der', 0.145, 0.53, 0, 0.15, 0.12, 0.16, 1.5, false, skinColor);
  const antepiernaDer = addVoxelLimbPart('antepierna_der', 0.145, 0.28, 0, 0.15, 0.38, 0.16, 3.0, false, skinColor);
  const tobilloDer = addVoxelLimbPart('tobillo_der', 0.145, 0.065, 0.0, 0.055, 0.05, 0.055, 0.8, false, skinColor);

  // Pie de 3 partes (talón, medio uniforme, frente) con dimensiones uniformes y altura exacta 0.07 (eje Y)
  const pieDerTalon = addVoxelLimbPart('pie_der_talon' as BodyPartName, 0.145, 0.035, -0.01, 0.14, 0.07, 0.06, 0.3, false, skinColor);
  const pieDerMedio = addVoxelLimbPart('pie_der_medio' as BodyPartName, 0.145, 0.035, 0.05, 0.14, 0.07, 0.06, 0.3, false, skinColor);
  const pieDer = addVoxelLimbPart('pie_der', 0.145, 0.035, 0.11, 0.14, 0.07, 0.06, 0.3, false, skinColor); 

  // Dedos colocados strictly ADELANTE (Z=0.180, profundidad 0.05) con misma altura (0.07) y Y (0.035)
  const dedoPiePulgarDer = addVoxelLimbPart('dedo_pie_pulgar_der', 0.095, 0.035, 0.180, 0.028, 0.07, 0.05, 0.2, false, skinColor);
  const dedoPieIndiceDer = addVoxelLimbPart('dedo_pie_indice_der', 0.120, 0.035, 0.180, 0.028, 0.07, 0.05, 0.2, false, skinColor);
  const dedoPieMedioDer = addVoxelLimbPart('dedo_pie_medio_der', 0.145, 0.035, 0.180, 0.028, 0.07, 0.05, 0.2, false, skinColor);
  const dedoPieAnularDer = addVoxelLimbPart('dedo_pie_anular_der', 0.170, 0.035, 0.180, 0.028, 0.07, 0.05, 0.2, false, skinColor);
  const dedoPieMeniqueDer = addVoxelLimbPart('dedo_pie_menique_der', 0.195, 0.035, 0.180, 0.028, 0.07, 0.05, 0.2, false, skinColor);

  addJoint(pelvis, musloDer, 0.98, 2600, 'pelvis_muslo_der');
  addJoint(musloDer, rodillaDer, 0.98, 2400, 'muslo_rodilla_der');
  addJoint(rodillaDer, antepiernaDer, 0.98, 2400, 'rodilla_antepierna_der');
  addJoint(antepiernaDer, tobilloDer, 0.98, 2000, 'antepierna_tobillo_der');
  addJoint(tobilloDer, pieDerTalon, 0.99, 999999, 'tobillo_pie_der_talon');
  addJoint(tobilloDer, pieDerMedio, 0.99, 999999, 'tobillo_pie_der_medio'); // Secure ankle-foot alignment & render extensor tendon
  addJoint(pieDerTalon, pieDerMedio, 0.99, 999999, 'pie_talon_medio_der');
  addJoint(pieDerMedio, pieDer, 0.99, 999999, 'pie_medio_frente_der');

  addJoint(pieDer, dedoPiePulgarDer, 0.99, 999999, 'pie_pulgar_der');
  addJoint(pieDer, dedoPieIndiceDer, 0.99, 999999, 'pie_indice_der');
  addJoint(pieDer, dedoPieMedioDer, 0.99, 999999, 'pie_dedo_medio_der');
  addJoint(pieDer, dedoPieAnularDer, 0.99, 999999, 'pie_anular_der');
  addJoint(pieDer, dedoPieMeniqueDer, 0.99, 999999, 'pie_menique_der');

  // Stabilizers (keeps shoulders & hips naturally spaced without locking joints into bent triangles)
  addJoint(hombroIzq, hombroDer, 0.80, 3200, 'hombros_ancho');
  addJoint(musloIzq, musloDer, 0.80, 3200, 'caderas_ancho');

  // Create Metaball 2 Contoured Joint Skin Sleeves (3D organic sleeves uniting pseudo-3D spheres along their contours)
  const jointBridges: THREE.Mesh[] = [];
  const bridgeMat = new THREE.MeshStandardMaterial({ 
    color: characterSkinColor, 
    roughness: 0.50, 
    metalness: 0.05, 
    side: THREE.DoubleSide,
    depthWrite: true,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  for (const c of constraints) {
    // Skip stabilizers & extensions (hombros_ancho, caderas_ancho, pecho_pelvis_stabilizer, extension_*)
    if (c.name.includes('ancho') || c.name.includes('stabilizer') || c.name.includes('extension')) continue;

    // Smooth cylindrical sleeve connecting the outer contour perimeter between spheres
    const bridgeGeom = new THREE.CylinderGeometry(1, 1, 1, 24, 20, false);
    const bridge = new THREE.Mesh(bridgeGeom, bridgeMat.clone());
    bridge.userData = { constraint: c, p1: c.p1, p2: c.p2 };
    bridge.name = `Bridge_${c.name}`;
    bridge.renderOrder = 4;
    bridge.visible = false; // Only visible if metaball2 style is on
    groupMesh.add(bridge);
    jointBridges.push(bridge);
    
    // Set color based on parts
    let c1 = new THREE.Color(0xffffff);
    let c2 = new THREE.Color(0xffffff);
    
    if (c.p1.contourMesh && (c.p1.contourMesh as THREE.Mesh).material) {
      const mat = (c.p1.contourMesh as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (mat.color) c1.copy(mat.color);
    }
    if (c.p2.contourMesh && (c.p2.contourMesh as THREE.Mesh).material) {
      const mat = (c.p2.contourMesh as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (mat.color) c2.copy(mat.color);
    }
    
    (bridge.material as THREE.MeshStandardMaterial).color.lerpColors(c1, c2, 0.5);
  }

  // Create Joint Spheres (Seamless ball joint nodes connecting adjacent cylinders into one continuous body)
  const jointSpheres: THREE.Mesh[] = [];
  const sphereMat = new THREE.MeshStandardMaterial({
    color: characterSkinColor,
    roughness: 0.50,
    metalness: 0.05,
    side: THREE.DoubleSide,
    depthWrite: true,
  });

  for (const p of particles) {
    const pRadius = getPartBaseCylinderRadius(p.name, scale);
    const mat = sphereMat.clone();
    let col = new THREE.Color(characterSkinColor);
    if (p.contourMesh && (p.contourMesh as THREE.Mesh).material) {
      const pMat = (p.contourMesh as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (pMat.color) col.copy(pMat.color);
    }
    mat.color.copy(col);

    const strName = p.name.toLowerCase();
    const isMuslo = strName.includes('muslo');
    const isAntepierna = strName.includes('antepierna');
    const isElongated = (
      strName.includes('brazo') ||
      strName.includes('antebrazo') ||
      strName === 'torso'
    );

    const halfH = (p.boxDims ? p.boxDims[1] : 0.3) * 0.5 * scale;
    const offsets = (isElongated && strName === 'torso')
      ? [new THREE.Vector3(0, -halfH * 0.85, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, halfH * 0.85, 0)]
      : [new THREE.Vector3(0, 0, 0)];

    for (let sIdx = 0; sIdx < offsets.length; sIdx++) {
      const offset = offsets[sIdx];
      const sRadius = pRadius;
      const sGeom = new THREE.SphereGeometry(sRadius, 18, 18);
      const sphere = new THREE.Mesh(sGeom, mat.clone());
      sphere.userData = { particle: p, baseRadius: pRadius, localOffset: offset.clone(), isConnectedNode: sIdx > 0 };
      if (sIdx === 0 || offsets.length === 1) {
        (p as any).jointSphere = sphere;
      }
      sphere.name = `JointSphere_${p.name}_${sIdx}`;
      sphere.renderOrder = 4;
      sphere.position.set(p.x + offset.x, p.y + offset.y, p.z + offset.z);
      sphere.visible = false;
      groupMesh.add(sphere);
      jointSpheres.push(sphere);
    }

    // Add hip joint spheres (cadera) on lateral sides of pelvis for both legs (same as shoulders on chest)
    if (p.name === 'pelvis') {
      const hipRadius = getPartBaseCylinderRadius('cadera_izq', scale);
      const hipOffsets = [
        { name: 'cadera_izq', targetLimbName: 'muslo_izq', offset: new THREE.Vector3(-0.145 * scale, -0.04 * scale, 0) },
        { name: 'cadera_der', targetLimbName: 'muslo_der', offset: new THREE.Vector3(0.145 * scale, -0.04 * scale, 0) },
      ];
      for (const hip of hipOffsets) {
        const hGeom = new THREE.SphereGeometry(hipRadius, 18, 18);
        const hSphere = new THREE.Mesh(hGeom, mat.clone());
        hSphere.userData = { particle: p, baseRadius: hipRadius, localOffset: hip.offset.clone(), targetLimbName: hip.targetLimbName, isConnectedNode: true, name: hip.name };
        hSphere.name = `JointSphere_${hip.name}`;
        hSphere.renderOrder = 4;
        hSphere.position.set(p.x + hip.offset.x, p.y + hip.offset.y, p.z + hip.offset.z);
        hSphere.visible = false;
        groupMesh.add(hSphere);
        jointSpheres.push(hSphere);
      }
    }
  }

  // Neck-to-stomach pink connecting tube (Esophagus organ connection)
  const neckToStomachTube = createNeckToStomachTube(scale);
  if (torso && torso.voxelsGroup) {
    torso.voxelsGroup.add(neckToStomachTube);
  } else {
    groupMesh.add(neckToStomachTube);
  }

  if (scene) {
    scene.add(groupMesh);
  }

  const ragdoll: Ragdoll3D = {
    id,
    name: nameTag || 'Personaje Cúbico 3D',
    particles,
    constraints,
    isAlive: true,
    isWalkingRagdoll: false,
    isControlled: false,
    scale,
    totalHealth: 240,
    bustMorphValue: 0,
    rampsEnabled: false,
    groupMesh,
    neckToStomachTube,
    jointBridges,
    jointSpheres,
    charPos: new THREE.Vector3(spawnX, spawnY, spawnZ),
    charVel: new THREE.Vector3(0, 0, 0),
    facingAngle: 0,
    walkCycle: 0,
    isGrounded: true,
    isJumping: false,
    hasWeapon: false,
    isAiming: false,
    sphericalContourLevel: initialSphericalContour,
    contourLayerEnabled: contourEnabled,
    contourJointStyle: 'pseudo3d',
    voxelShape: initialVoxelShape,
    erectionLevel: 0,
    isErecting: false,
    hasShirt: false,
    hasPants: false,
    shirtColorHex: shirtColor,
    pantsColorHex: pantsColor,
    skinColorHex: characterSkinColor,
    faceFeatureMode: 'pseudo_cylinders',
    faceFloatDepth: 0.05,
    stats: {
      brokenBones: 0,
      dismemberedLimbs: 0,
      bloodLossPercent: 0,
      destroyedBlocks: 0,
    },
  };

  // Start with shirt and pants disabled by default
  for (const p of ragdoll.particles) {
    (p as any).parentRagdoll = ragdoll;
  }
  applyShirtToRagdoll(ragdoll, false, shirtColor);
  applyPantsToRagdoll(ragdoll, false, pantsColor);

  // Initialize pubic hair on spawn
  setupPubicHair(ragdoll);

  // Pre-morph the skin envelope and interior voxels immediately on spawn to guarantee a beautiful spherical body!
  updateRagdollSphericalContour(ragdoll, initialSphericalContour, contourEnabled);

  return ragdoll;
}

/**
 * Dynamically switches the voxel shape (sphere vs cube) for a ragdoll model on-the-fly
 */
export function updateRagdollVoxelShape(ragdoll: Ragdoll3D, shape: 'cube' | 'sphere') {
  ragdoll.voxelShape = shape;
  for (const p of ragdoll.particles) {
    if (!p.voxelBlocks) continue;
    for (const b of p.voxelBlocks) {
      if (!b.mesh) continue;

      const oldGeom = b.mesh.geometry;
      const vxW = b.size[0];
      const vxH = b.size[1];
      const vxD = b.size[2];

      if (shape === 'sphere') {
        b.mesh.geometry = new THREE.SphereGeometry(0.5, 8, 8);
        b.mesh.scale.set(vxW * 1.05, vxH * 1.05, vxD * 1.05);

        // Adjust pupil position if eye child is present
        const pupil = b.mesh.children.find(c => c instanceof THREE.Mesh) as THREE.Mesh | undefined;
        if (pupil) {
          const oldPupilGeom = pupil.geometry;
          pupil.geometry = new THREE.BoxGeometry(0.35, 0.35, 0.1);
          pupil.position.set(0.18, 0.18, 0.48);
          oldPupilGeom.dispose();
        }
      } else {
        const geom = new THREE.BoxGeometry(vxW * 1.01, vxH * 1.01, vxD * 1.01);
        const posAttr = geom.attributes.position;
        const count = posAttr.count;
        const basePositions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          basePositions[i * 3] = posAttr.getX(i);
          basePositions[i * 3 + 1] = posAttr.getY(i);
          basePositions[i * 3 + 2] = posAttr.getZ(i);
        }
        b.mesh.geometry = geom;
        b.mesh.userData = {
          basePositions,
          w: vxW * 1.01,
          h: vxH * 1.01,
          d: vxD * 1.01,
        };
        b.mesh.scale.set(1, 1, 1);

        // Adjust pupil position if eye child is present
        const pupil = b.mesh.children.find(c => c instanceof THREE.Mesh) as THREE.Mesh | undefined;
        if (pupil) {
          const oldPupilGeom = pupil.geometry;
          pupil.geometry = new THREE.BoxGeometry(vxW * 0.35, vxH * 0.35, 0.005);
          pupil.position.set(vxW * 0.18, vxH * 0.18, vxD * 0.48 + 0.003);
          oldPupilGeom.dispose();
        }
      }

      oldGeom.dispose();
    }
  }
  // Immediately apply voxel spheriness using current spherical level
  updateRagdollSphericalContour(ragdoll, ragdoll.sphericalContourLevel);
}

/**
 * Rebuilds all voxel blocks across all extremities to a new cube count/density,
 * ensuring limb dimensions are strictly preserved and cubes are visible across characters.
 */
export function rebuildRagdollVoxelDensity(ragdoll: Ragdoll3D, densityLevel: number) {
  ragdoll.voxelDensity = densityLevel;

  for (const p of ragdoll.particles) {
    if (!p.boxDims || !p.voxelsGroup) continue;

    // Clear old voxel meshes
    while (p.voxelsGroup.children.length > 0) {
      const child = p.voxelsGroup.children[0];
      p.voxelsGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      }
    }

    // Determine base color from first block or fallback
    let baseColor = 0xffffff;
    if (p.voxelBlocks && p.voxelBlocks.length > 0) {
      baseColor = p.voxelBlocks[0].originalColor || p.voxelBlocks[0].color;
    } else if (p.contourMesh && (p.contourMesh as THREE.Mesh).material) {
      const mat = (p.contourMesh as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (mat?.color) baseColor = mat.color.getHex();
    }

    const [w, h, d] = p.boxDims;
    const { voxelsGroup: newGroup, voxelBlocks: newBlocks } = createMultiVoxelLimb(
      p.name,
      w,
      h,
      d,
      baseColor,
      ragdoll.voxelShape || 'cube',
      ragdoll.sphericalContourLevel / 100,
      densityLevel
    );

    // Transfer children from newGroup into p.voxelsGroup
    while (newGroup.children.length > 0) {
      const c = newGroup.children[0];
      newGroup.remove(c);
      p.voxelsGroup.add(c);
    }

    p.voxelBlocks = newBlocks;
    p.voxelsGroup.visible = true; // Ensure cubes are clearly visible
  }

  // Update morphing and contour if present
  updateRagdollSphericalContour(ragdoll, ragdoll.sphericalContourLevel, ragdoll.contourLayerEnabled, ragdoll.contourJointStyle);
}

/**
 * Creates a Dummy NPC, orange colored with random genital
 */
export function createDummyRagdoll3D(
  spawnX: number = 0,
  spawnY: number = 0,
  spawnZ: number = 0,
  scene?: THREE.Scene,
  initialVoxelShape: 'cube' | 'sphere' = 'cube'
): Ragdoll3D {
  const dummy = createArticulatedRagdoll3D(
    spawnX,
    spawnY,
    spawnZ,
    1.0,
    scene,
    85,
    true,
    globalDummyMat,
    'Dummy',
    initialVoxelShape
  );

  dummy.isDummy = true;
  dummy.isNPC = true;
  dummy.genitalType = 'none';
  dummy.hasBustAndGlutes = false;
  dummy.skinColorHex = globalDummyMat.color.getHex();
  updateRagdollSkinColor(dummy, globalDummyMat.color.getHex());
  
  return dummy;
}

/**
 * Creates a fully functional decent normal articulated ragdoll with natural physics,
 * clean human proportions, decent casual clothing (shirt & pants), and clean anatomy.
 */
export function createFunctionalRagdoll3D(
  spawnX: number = 0,
  spawnY: number = 0,
  spawnZ: number = 0,
  scene?: THREE.Scene,
  initialVoxelShape: 'cube' | 'sphere' = 'cube',
  skinColorHex?: number
): Ragdoll3D {
  const skin = skinColorHex ?? 0xf5d0b5;
  const ragdollMat = new THREE.MeshStandardMaterial({
    color: skin,
    roughness: 0.6,
    metalness: 0.05,
  });

  const ragdoll = createArticulatedRagdoll3D(
    spawnX,
    spawnY,
    spawnZ,
    1.0,
    scene,
    0, // Clean humanoid appearance
    true,
    ragdollMat,
    'Ragdoll',
    initialVoxelShape
  );

  ragdoll.isNPC = true;
  ragdoll.isControlled = false;
  ragdoll.isAlive = false;
  ragdoll.isWalkingRagdoll = false;
  ragdoll.isCollapsed = false;
  ragdoll.hasShirt = true;
  ragdoll.shirtColorHex = 0x38bdf8;
  ragdoll.hasPants = true;
  ragdoll.pantsColorHex = 0x1e3a8a;
  ragdoll.genitalType = 'none';
  ragdoll.hasBustAndGlutes = false;

  applyShirtToRagdoll(ragdoll, true, 0x38bdf8);
  applyPantsToRagdoll(ragdoll, true, 0x1e3a8a);
  updateRagdollSkinColor(ragdoll, skin);
  return ragdoll;
}

/**
 * Fully builds a customized standalone preview or gameplay ragdoll with precise parameters
 */
export function buildFullRagdoll3D(
  id: string,
  nameTag: string,
  spawnX: number,
  spawnY: number,
  spawnZ: number,
  isFemale: boolean,
  isControlled: boolean,
  scale: number,
  hasShirt: boolean,
  shirtColorHex: number,
  pantsColorHex: number,
  skinColorHex: number,
  hasBustAndGlutes: boolean,
  contourJointStyle: any,
  contourLevel: number,
  genitalType: any,
  genitalMShaftLength: number,
  genitalMShaftThickness: number,
  genitalFSize: number,
  contourEnabled: boolean,
  voxelDensity: number,
  shape: 'cube' | 'sphere',
  hairType: string = 'none',
  hairColorHex: number = 0x1c1917,
  beardType: string = 'none',
  beardColorHex: number = 0x1c1917,
  hatType: string = 'none',
  hatColorHex: number = 0xdc2626,
  glassesType: string = 'none',
  glassesColorHex: number = 0x0f172a,
  hasPants: boolean = false,
  limbSizeMultiplier: number = 1.0,
  bodyCubicity: number = 24
): Ragdoll3D {
  // 1. Create base ragdoll
  const ragdoll = createArticulatedRagdoll3D(
    spawnX,
    spawnY,
    spawnZ,
    scale,
    undefined, // Standalone preview has no initial scene container
    contourLevel,
    contourEnabled,
    undefined, // default material
    nameTag,
    shape
  );

  ragdoll.limbSizeMultiplier = limbSizeMultiplier;
  ragdoll.bodyCubicity = bodyCubicity;

  // Force specified custom ID
  ragdoll.id = id;
  if (ragdoll.groupMesh) {
    ragdoll.groupMesh.name = id;
  }
  ragdoll.isControlled = isControlled;

  // 2. Skin and Clothing Color Overrides
  ragdoll.skinColorHex = skinColorHex;
  ragdoll.shirtColorHex = shirtColorHex;
  ragdoll.pantsColorHex = pantsColorHex;
  ragdoll.hasShirt = Boolean(hasShirt);
  ragdoll.hasPants = Boolean(hasPants);

  // Recoloring of all body particles using canonical updateRagdollSkinColor
  updateRagdollSkinColor(ragdoll, skinColorHex);

  // Apply shirt and pants logic (creates copy of contour blocks and mesh on top)
  applyShirtToRagdoll(ragdoll, hasShirt, shirtColorHex);
  applyPantsToRagdoll(ragdoll, hasPants, pantsColorHex);

  // Adjust genital scales if applicable
  (ragdoll as any).genitalMShaftLength = genitalMShaftLength;
  (ragdoll as any).genitalMShaftThickness = genitalMShaftThickness;
  (ragdoll as any).genitalFSize = genitalFSize;

  // Apply joints style
  ragdoll.contourJointStyle = contourJointStyle as any;

  // Apply contour spherical morph
  updateRagdollSphericalContour(ragdoll, contourLevel, contourEnabled, contourJointStyle as any);

  // Apply genitalia
  updateRagdollGenitals(ragdoll, genitalType);

  // Apply female/male anatomy & glutes (matching genital M skin color)
  updateRagdollBustAndGlutes(ragdoll, hasBustAndGlutes);

  // Force full deep skin recoloring across all newly spawned anatomy meshes, blocks, and contours
  updateRagdollSkinColor(ragdoll, skinColorHex);

  // Set hair and accessories properties
  (ragdoll as any).hairType = hairType;
  (ragdoll as any).hairColorHex = hairColorHex;
  (ragdoll as any).beardType = beardType;
  (ragdoll as any).beardColorHex = beardColorHex;
  (ragdoll as any).hatType = hatType;
  (ragdoll as any).hatColorHex = hatColorHex;
  (ragdoll as any).glassesType = glassesType;
  (ragdoll as any).glassesColorHex = glassesColorHex;
  addHairAndAccessoriesToHead(ragdoll);

  // Voxel density level rebuild if not default
  if (voxelDensity !== 1) {
    rebuildRagdollVoxelDensity(ragdoll, voxelDensity);
  }

  return ragdoll;
}

export function createEvilDummyRagdoll3D(
  spawnX: number = 0,
  spawnY: number = 0,
  spawnZ: number = 0,
  scene?: THREE.Scene,
  initialVoxelShape: 'cube' | 'sphere' = 'cube'
): Ragdoll3D {
  const dummy = createArticulatedRagdoll3D(
    spawnX,
    spawnY,
    spawnZ,
    1.0,
    scene,
    85,
    true,
    new THREE.MeshStandardMaterial({ color: 0xaa0000, roughness: 0.8, metalness: 0.1 }),
    'Evil Dummy',
    initialVoxelShape
  );

  dummy.isDummy = true;
  dummy.isNPC = true;
  (dummy as any).isEvilDummy = true;
  
  const genitals: ('none' | 'male' | 'female')[] = ['none', 'male', 'female'];
  const randomGenital = genitals[Math.floor(Math.random() * genitals.length)];
  
  updateRagdollGenitals(dummy, randomGenital);
  
  return dummy;
}

/**
 * Creates a Cubic Soldier NPC with olive military uniform and rifle
 */
export function createSoldierRagdoll3D(
  spawnX: number = 0,
  spawnY: number = 0,
  spawnZ: number = 0,
  scene?: THREE.Scene,
  initialVoxelShape: 'cube' | 'sphere' = 'cube'
): Ragdoll3D {
  const soldier = createArticulatedRagdoll3D(
    spawnX,
    spawnY,
    spawnZ,
    1.0,
    scene,
    85, // Use 85% spherical morph by default so they match player's smooth appearance!
    true, // Enabled by default
    globalSoldierMat,
    'Soldado Enemigo',
    initialVoxelShape
  );

  // Give soldier human anatomy (breasts if female, glutes, and genitalia)
  const isFemale = Math.random() < 0.5;
  if (isFemale) {
    updateRagdollBustAndGlutes(soldier, true);
    updateRagdollGenitals(soldier, 'female');
  } else {
    updateRagdollBustAndGlutes(soldier, true);
    updateRagdollGenitals(soldier, 'male');
  }

  // Equip rifle
  attachWeaponToRagdoll(soldier);
  return soldier;
}

/**
 * Creates a Cubic Werewolf NPC that is taller than the average human,
 * has a cubic tail with pseudo-3D, and a white tip on the tail.
 */
export function createWerewolfRagdoll3D(
  spawnX: number = 0,
  spawnY: number = 0,
  spawnZ: number = 0,
  scene?: THREE.Scene,
  initialVoxelShape: 'cube' | 'sphere' = 'cube'
): Ragdoll3D {
  // Dark charcoal werewolf fur color
  const furColor = 0x374151;
  const werewolfMat = new THREE.MeshStandardMaterial({
    color: furColor,
    roughness: 0.85,
    metalness: 0.05,
  });

  const werewolf = createArticulatedRagdoll3D(
    spawnX,
    spawnY,
    spawnZ,
    1.35, // Taller than the average human!
    scene,
    85, // Use 85% spherical morph by default
    true, // Enabled by default
    werewolfMat,
    'Hombre Lobo',
    initialVoxelShape
  );

  werewolf.isWerewolf = true;
  werewolf.skinColorHex = furColor;
  werewolf.pantsColorHex = furColor; // wild beast look
  // Remove the shirt to give it a raw fur coat!
  applyShirtToRagdoll(werewolf, false);

  // Now build the cubic tail with pseudo contour!
  const pelvis = werewolf.particles.find(p => p.name === 'pelvis');
  if (pelvis) {
    const scale = werewolf.scale;
    const groupMesh = werewolf.groupMesh;

    const addTailSegment = (
      name: BodyPartName,
      relX: number,
      relY: number,
      relZ: number,
      width: number,
      height: number,
      depth: number,
      mass: number,
      color: number
    ): Particle3D => {
      const px = spawnX + relX * scale;
      const py = spawnY + relY * scale;
      const pz = spawnZ + relZ * scale;

      const w = width * scale;
      const h = height * scale;
      const d = depth * scale;

      const carrierMesh = new THREE.Group();
      carrierMesh.name = `Carrier_${name}`;
      carrierMesh.position.set(px, py, pz);
      groupMesh.add(carrierMesh);

      // Multi-voxel grid (single sleek voxel grid for clean cubes)
      const { voxelsGroup, voxelBlocks } = createMultiVoxelLimb(
        name,
        w,
        h,
        d,
        color,
        initialVoxelShape,
        0.85
      );
      voxelsGroup.visible = true;
      carrierMesh.add(voxelsGroup);

      // Pseudo-3D contour layer
      const contourMesh = createPseudo3DContourMesh(name, w, h, d, 85, color);
      contourMesh.userData.voxelBlocks = voxelBlocks;
      contourMesh.visible = werewolf.contourLayerEnabled;
      carrierMesh.add(contourMesh);

      const radius = Math.max(w, h, d) * 0.45;

      const p: Particle3D = {
        id: `${werewolf.id}_${name}`,
        x: px,
        y: py,
        z: pz,
        oldX: px,
        oldY: py,
        oldZ: pz,
        vx: 0,
        vy: 0,
        vz: 0,
        mass,
        radius,
        pinned: false,
        name,
        parentRagdollId: werewolf.id,
        health: 120,
        maxHealth: 120,
        fractured: false,
        dismembered: false,
        isVital: false,
        bleedingRate: 0,
        mesh: carrierMesh,
        boxDims: [width, height, depth],
        voxelBlocks,
        voxelsGroup,
        contourMesh,
      };

      werewolf.particles.push(p);
      return p;
    };

    const addJoint = (
      p1: Particle3D,
      p2: Particle3D,
      stiffness: number = 0.9,
      breakForce: number = 1800,
      name: string = ''
    ): Constraint3D => {
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const dz = p1.z - p2.z;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;

      const c: Constraint3D = {
        id: `${p1.id}_to_${p2.id}`,
        p1,
        p2,
        length: len,
        stiffness,
        breakForce,
        broken: false,
        name: name || `${p1.name}-${p2.name}`,
      };
      werewolf.constraints.push(c);
      return c;
    };

    // Spawn 3 tail segments going backwards from pelvis
    const tail1 = addTailSegment('cola_seg1' as BodyPartName, 0, 0.90, -0.16, 0.10, 0.10, 0.22, 1.2, furColor);
    const tail2 = addTailSegment('cola_seg2' as BodyPartName, 0, 0.85, -0.36, 0.09, 0.09, 0.20, 1.0, furColor);
    const tail3 = addTailSegment('cola_seg3' as BodyPartName, 0, 0.80, -0.54, 0.08, 0.08, 0.18, 0.8, 0xf8fafc); // White tail tip!

    // Connect pelvis -> tail1 -> tail2 -> tail3
    addJoint(pelvis, tail1, 0.95, 2000, 'pelvis_cola1');
    addJoint(tail1, tail2, 0.95, 1800, 'cola1_cola2');
    addJoint(tail2, tail3, 0.95, 1600, 'cola2_cola3');

    // Add secondary stability joint pelvis -> tail2
    addJoint(pelvis, tail2, 0.75, 1600, 'pelvis_cola2_stab');
  }

  // Give werewolf breasts, glutes, and male genitals as requested!
  updateRagdollBustAndGlutes(werewolf, true);
  updateRagdollGenitals(werewolf, 'male');

  // Pre-morph skin envelope
  updateRagdollSphericalContour(werewolf, werewolf.sphericalContourLevel, werewolf.contourLayerEnabled);

  return werewolf;
}

// Keep compatible signatures
export function updateRagdollBustMorph(ragdoll: Ragdoll3D, value: number) {
  updateRagdollSphericalContour(ragdoll, value);
}

export function updateRagdollSkinSleeves(ragdoll: Ragdoll3D, enabled: boolean) {
  // Reverted / disabled completely
}

export function getRagdollPelvisSkinColor(ragdoll: Ragdoll3D): number {
  if (!ragdoll) return skinColor;

  // 1. Check canonical skinColorHex first to prevent any clothing or part overrides from leaking!
  if (ragdoll.skinColorHex !== undefined && ragdoll.skinColorHex !== null) {
    return ragdoll.skinColorHex;
  }

  // 2. Explicitly stored skinColor on pelvis particle
  const pelvis = ragdoll.particles?.find((p) => p.name === 'pelvis');
  if (pelvis?.userData?.skinColor !== undefined && pelvis.userData.skinColor !== null) {
    return pelvis.userData.skinColor;
  }
  if (pelvis?.contourMesh?.userData?.skinColor !== undefined && pelvis.contourMesh.userData.skinColor !== null) {
    return pelvis.contourMesh.userData.skinColor;
  }

  // 3. Pelvis contourMesh or mesh if not pants
  if (pelvis) {
    if (pelvis.contourMesh?.userData?.baseColor !== undefined && !pelvis.contourMesh.userData.isPants) {
      return pelvis.contourMesh.userData.baseColor;
    }
    if (pelvis.mesh instanceof THREE.Mesh && pelvis.mesh.material) {
      const mat = Array.isArray(pelvis.mesh.material) ? pelvis.mesh.material[0] : pelvis.mesh.material;
      if (mat instanceof THREE.MeshStandardMaterial && !pelvis.mesh.userData?.isPants && mat.color && mat.color.getHex() !== 0xffffff) {
        return mat.color.getHex();
      }
    }
    const b = pelvis.voxelBlocks?.find(
      (v) => !v.isOrganBlock && !v.isGenitalBlock && !v.isPantsBlock && !v.id.includes('anus') && !v.id.includes('internal') && !v.id.includes('glute')
    );
    if (b?.originalColor !== undefined && b.originalColor !== 0x1e3a8a && b.originalColor !== (ragdoll.pantsColorHex ?? 0x1e3a8a)) return b.originalColor;
    if (b?.color !== undefined && b.color !== 0x1e3a8a && b.color !== (ragdoll.pantsColorHex ?? 0x1e3a8a)) return b.color;
  }

  // 4. Head (cabeza)
  const cabeza = ragdoll.particles?.find((p) => p.name === 'cabeza');
  if (cabeza) {
    if (cabeza.userData?.skinColor !== undefined && cabeza.userData.skinColor !== null) {
      return cabeza.userData.skinColor;
    }
    if (cabeza.contourMesh?.userData?.baseColor !== undefined) {
      return cabeza.contourMesh.userData.baseColor;
    }
    if (cabeza.mesh instanceof THREE.Mesh && cabeza.mesh.material) {
      const mat = Array.isArray(cabeza.mesh.material) ? cabeza.mesh.material[0] : cabeza.mesh.material;
      if (mat instanceof THREE.MeshStandardMaterial && mat.color && mat.color.getHex() !== 0xffffff) {
        return mat.color.getHex();
      }
    }
    const b = cabeza.voxelBlocks?.find(
      (v) => !v.isOrganBlock && !v.id.includes('eye') && !v.id.includes('pupil')
    );
    if (b?.originalColor !== undefined) return b.originalColor;
    if (b?.color !== undefined) return b.color;
  }

  return skinColor;
}

export function getRagdollSkinColor(ragdoll: Ragdoll3D): number {
  if (!ragdoll) return skinColor;

  // 1. Check canonical skinColorHex first to prevent any clothing or part overrides from leaking and strictly match editor!
  if (ragdoll.skinColorHex !== undefined && ragdoll.skinColorHex !== null) {
    return ragdoll.skinColorHex;
  }

  // 2. Check head (cabeza) skin color as it never wears clothing
  const cabeza = ragdoll.particles?.find((p) => p.name === 'cabeza');
  if (cabeza) {
    if (cabeza.userData?.skinColor !== undefined && cabeza.userData.skinColor !== null) {
      return cabeza.userData.skinColor;
    }
    if (cabeza.contourMesh?.userData?.baseColor !== undefined) {
      return cabeza.contourMesh.userData.baseColor;
    }
    if (cabeza.mesh instanceof THREE.Mesh && cabeza.mesh.material) {
      const mat = Array.isArray(cabeza.mesh.material) ? cabeza.mesh.material[0] : cabeza.mesh.material;
      if (mat instanceof THREE.MeshStandardMaterial && mat.color && mat.color.getHex() !== 0xffffff) {
        return mat.color.getHex();
      }
    }
    if (cabeza.voxelBlocks) {
      const b = cabeza.voxelBlocks.find(
        (v) => !v.isOrganBlock && !v.id.includes('eye') && !v.id.includes('pupil')
      );
      if (b?.originalColor !== undefined) return b.originalColor;
      if (b?.color !== undefined) return b.color;
    }
  }

  // 3. Fallback to pelvis skin color
  return getRagdollPelvisSkinColor(ragdoll);
}

/**
 * Returns the skin color of genital M (default flesh-peach 0xefb08c, or from genital M shaft/testicle block/mesh).
 * Pechos (breasts) and glúteos (glutes) MUST always match this exact genital M skin color!
 */
export function getGenitalMSkinColor(ragdoll?: Ragdoll3D): number {
  if (ragdoll) {
    return getRagdollSkinColor(ragdoll);
  }
  return skinColor;
}

// Helper to force exact skin vertex color math on body & anatomy meshes
function forceAnatomySkinVertexColors(child: THREE.Object3D, skinColorHex: number) {
  if (child instanceof THREE.Mesh) {
    const name = (child.name || '').toLowerCase();
    const isInternalOrgan = (
      name.includes('internal') || name.includes('canal') || name.includes('urethra') || 
      name.includes('uterus') || name.includes('ovary') || name.includes('anus')
    );
    child.castShadow = !isInternalOrgan;
    child.receiveShadow = false;

    // Skip clothes, hair, beard, hats, glasses or explicitly marked non-skin overlay items
    if (
      child.userData?.isShirt || child.userData?.isPants || child.userData?.isUnderwear || 
      child.userData?.isBoots || child.userData?.isGloves || child.userData?.isSocks ||
      name.includes('shirt') || name.includes('pants') || name.includes('underwear') || 
      name.includes('boot') || name.includes('glove') || name.includes('sock') || 
      name.includes('hair') || name.includes('beard') || name.includes('hat') || name.includes('glasses')
    ) {
      return;
    }

    const isPinkOrgan = (
      name.includes('glans') || name.includes('pink_sphere') || name.includes('tetilla') ||
      name.includes('nipple') || name.includes('anus') || name.includes('internal') ||
      name.includes('uterus') || name.includes('canal') || name.includes('urethra') || name.includes('ovary') ||
      name.includes('eye') || name.includes('pupil')
    );

    if (!isPinkOrgan) {
      const targetColor = skinColorHex;
      const col = new THREE.Color(targetColor).convertSRGBToLinear();
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        if (mat instanceof THREE.MeshStandardMaterial) {
          if (child.geometry) {
            if (child.geometry.attributes.color) {
              const colorAttr = child.geometry.attributes.color;
              for (let ci = 0; ci < colorAttr.count; ci++) {
                colorAttr.setXYZ(ci, col.r, col.g, col.b);
              }
              colorAttr.needsUpdate = true;
            } else {
              const count = child.geometry.attributes.position.count;
              const colors = new Float32Array(count * 3);
              for (let ci = 0; ci < count; ci++) {
                colors[ci * 3] = col.r;
                colors[ci * 3 + 1] = col.g;
                colors[ci * 3 + 2] = col.b;
              }
              child.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            }
            mat.vertexColors = true;
            mat.color.setHex(0xffffff);
          } else {
            mat.vertexColors = false;
            mat.color.setHex(targetColor);
          }
          mat.roughness = 0.50;
          mat.metalness = 0.05;
          mat.needsUpdate = true;
        }
      }
      if (child.userData) {
        child.userData.baseColor = targetColor;
      }
    }
  }
}

export function updateRagdollSkinColor(ragdoll: Ragdoll3D, skinColorHex: number) {
  ragdoll.skinColorHex = skinColorHex;

  // 1. Recolor all limb particles, contour meshes, and voxel blocks first (including pelvis cylinder mesh)
  for (const p of ragdoll.particles) {
    p.userData = p.userData || {};
    p.userData.skinColor = skinColorHex;
    if (p.voxelBlocks) {
      for (const b of p.voxelBlocks) {
        if (!b.isOrganBlock && !b.id.includes('eye') && !b.id.includes('pupil') && !b.id.includes('urethra') && !b.id.includes('canal') && !b.id.includes('uterus')) {
          const blockColor = skinColorHex;
          b.originalColor = blockColor;
          if (!b.isShirtBlock && !b.isPantsBlock) {
            b.color = blockColor;
            if (b.mesh) {
              forceAnatomySkinVertexColors(b.mesh, blockColor);
            }
          }
        }
      }
    }
    if (p.contourMesh && p.contourMesh instanceof THREE.Mesh) {
      const isShirtActive = ragdoll.hasShirt && SHIRT_BODY_PARTS.has(p.name);
      const isPantsActive = ragdoll.hasPants && PANTS_BODY_PARTS.has(p.name);
      if (!isShirtActive && !isPantsActive) {
        p.contourMesh.userData.isShirt = false;
        p.contourMesh.userData.isPants = false;
        p.contourMesh.userData.baseColor = skinColorHex;
        forceAnatomySkinVertexColors(p.contourMesh, skinColorHex);
      }
    }
    if (p.mesh && p.mesh instanceof THREE.Mesh) {
      const isShirtActive = ragdoll.hasShirt && SHIRT_BODY_PARTS.has(p.name);
      const isPantsActive = ragdoll.hasPants && PANTS_BODY_PARTS.has(p.name);
      if (!isShirtActive && !isPantsActive) {
        p.mesh.userData.isShirt = false;
        p.mesh.userData.isPants = false;
        p.mesh.userData.baseColor = skinColorHex;
        forceAnatomySkinVertexColors(p.mesh, skinColorHex);
      }
    }
    if (p.metaball3Mesh && p.metaball3Mesh instanceof THREE.Mesh) {
      p.metaball3Mesh.userData.baseColor = skinColorHex;
      forceAnatomySkinVertexColors(p.metaball3Mesh, skinColorHex);
    }
    if (p.voxelsGroup) {
      p.voxelsGroup.traverse((child) => forceAnatomySkinVertexColors(child, skinColorHex));
    }
  }

  // 2. Recolor joint spheres and cylinder bridges to strictly match avatar editor skin/clothing colors
  if (ragdoll.jointSpheres) {
    for (const s of ragdoll.jointSpheres) {
      const p = s.userData?.particle;
      let targetHex = skinColorHex;
      if (ragdoll.hasShirt && p && SHIRT_BODY_PARTS.has(p.name)) {
        targetHex = ragdoll.shirtColorHex || 0x38bdf8;
      } else if (ragdoll.hasPants && p && PANTS_BODY_PARTS.has(p.name)) {
        targetHex = ragdoll.pantsColorHex || 0x1e3a8a;
      }
      const mat = Array.isArray(s.material) ? s.material[0] : s.material;
      if (mat instanceof THREE.MeshStandardMaterial) {
        mat.color.setHex(targetHex);
        mat.roughness = 0.50;
        mat.metalness = 0.05;
        mat.needsUpdate = true;
      }
      if (s.geometry && s.geometry.attributes.color) {
        const colorAttr = s.geometry.attributes.color;
        const col = new THREE.Color(targetHex).convertSRGBToLinear();
        for (let k = 0; k < colorAttr.count; k++) {
          colorAttr.setXYZ(k, col.r, col.g, col.b);
        }
        colorAttr.needsUpdate = true;
      }
      s.userData.needsDeform = true;
    }
  }
  if (ragdoll.jointBridges) {
    for (const b of ragdoll.jointBridges) {
      const c = b.userData.constraint;
      const strBridge = c ? (c.name + '_' + c.p1.name + '_' + c.p2.name).toLowerCase() : '';
      const isInternal = strBridge.includes('canal') || strBridge.includes('uterus') || strBridge.includes('utero') || strBridge.includes('ovary') || strBridge.includes('ovario');
      let targetHex = skinColorHex;
      if (isInternal) {
        targetHex = 0xf43f5e;
      } else if (ragdoll.hasShirt && c && SHIRT_BODY_PARTS.has(c.p1.name) && SHIRT_BODY_PARTS.has(c.p2.name)) {
        targetHex = ragdoll.shirtColorHex || 0x38bdf8;
      } else if (ragdoll.hasPants && c && PANTS_BODY_PARTS.has(c.p1.name) && PANTS_BODY_PARTS.has(c.p2.name)) {
        targetHex = ragdoll.pantsColorHex || 0x1e3a8a;
      }
      const mat = Array.isArray(b.material) ? b.material[0] : b.material;
      if (mat instanceof THREE.MeshStandardMaterial) {
        mat.color.setHex(targetHex);
        mat.roughness = 0.50;
        mat.metalness = 0.05;
        mat.needsUpdate = true;
      }
      if (b.geometry && b.geometry.attributes.color) {
        const colorAttr = b.geometry.attributes.color;
        const col = new THREE.Color(targetHex).convertSRGBToLinear();
        for (let k = 0; k < colorAttr.count; k++) {
          colorAttr.setXYZ(k, col.r, col.g, col.b);
        }
        colorAttr.needsUpdate = true;
      }
      b.userData.needsDeform = true;
    }
  }

  // 3. Recolor ALL groupMesh & particle voxelsGroup children (body, limbs, anatomy)
  const applySkinToAnatomyChild = (child: THREE.Object3D) => {
    forceAnatomySkinVertexColors(child, skinColorHex);
  };

  if (ragdoll.groupMesh) {
    ragdoll.groupMesh.traverse(applySkinToAnatomyChild);
  }

  // 4. Rebuild anatomy: build genitals first, then bust and glutes matching exact skin color
  updateRagdollGenitals(ragdoll, ragdoll.genitalType || 'none');
  updateRagdollBustAndGlutes(ragdoll, Boolean(ragdoll.hasBustAndGlutes));

  // 5. Sync spherical contour so all newly built pseudo meshes and contours get exact morph & skin color
  updateRagdollSphericalContour(
    ragdoll,
    ragdoll.sphericalContourLevel ?? 85,
    Boolean(ragdoll.contourLayerEnabled),
    ragdoll.contourJointStyle ?? 'cylinder'
  );
}

function cleanupAnatomyParticles(ragdoll: Ragdoll3D, names: string[]) {
  const nameSet = new Set(names);

  // Dispose and remove 3D meshes belonging to particles being cleaned up to prevent cloned ghosts
  for (const p of ragdoll.particles) {
    if (nameSet.has(p.name)) {
      if (p.mesh) {
        if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
        p.mesh.traverse((c) => {
          if (c instanceof THREE.Mesh) {
            c.geometry?.dispose();
            if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
            else c.material?.dispose();
          }
        });
        p.mesh = undefined;
      }
      if (p.contourMesh) {
        if (p.contourMesh.parent) p.contourMesh.parent.remove(p.contourMesh);
        p.contourMesh.traverse((c) => {
          if (c instanceof THREE.Mesh) {
            c.geometry?.dispose();
            if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
            else c.material?.dispose();
          }
        });
        p.contourMesh = undefined;
      }
    }
  }

  ragdoll.particles = ragdoll.particles.filter(p => !nameSet.has(p.name));
  ragdoll.constraints = ragdoll.constraints.filter(c => {
    if (nameSet.has(c.p1.name) || nameSet.has(c.p2.name)) return false;
    const cName = c.name || '';
    const cId = c.id || '';
    for (const n of names) {
      if (cName.includes(n) || cId.includes(n)) return false;
    }
    return true;
  });

  if (ragdoll.jointBridges) {
    ragdoll.jointBridges = ragdoll.jointBridges.filter(b => {
      const c = b.userData?.constraint;
      if (c && (nameSet.has(c.p1.name) || nameSet.has(c.p2.name))) {
        if (b.parent) b.parent.remove(b);
        b.geometry?.dispose();
        if (Array.isArray(b.material)) b.material.forEach((m: any) => m.dispose());
        else (b.material as any)?.dispose();
        return false;
      }
      return true;
    });
  }

  if (ragdoll.jointSpheres) {
    ragdoll.jointSpheres = ragdoll.jointSpheres.filter(s => {
      const p = s.userData?.particle;
      if (p && nameSet.has(p.name)) {
        if (s.parent) s.parent.remove(s);
        s.geometry?.dispose();
        if (Array.isArray(s.material)) s.material.forEach((m: any) => m.dispose());
        else (s.material as any)?.dispose();
        return false;
      }
      return true;
    });
  }
}

function addAnatomyParticle(ragdoll: Ragdoll3D, name: BodyPartName | string, x: number, y: number, z: number, mass: number = 0.2): Particle3D {
  const p: Particle3D = {
    id: `${ragdoll.id}_${name}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name as BodyPartName,
    parentRagdollId: ragdoll.id,
    x, y, z,
    oldX: x, oldY: y, oldZ: z,
    vx: 0, vy: 0, vz: 0,
    mass,
    radius: 0.04 * (ragdoll.scale || 1.0),
    pinned: false,
    health: 100,
    maxHealth: 100,
    fractured: false,
    dismembered: false,
    bleedingRate: 0,
  };
  ragdoll.particles.push(p);
  return p;
}

function addAnatomyConstraint(ragdoll: Ragdoll3D, p1: Particle3D, p2: Particle3D, stiffness: number = 0.95, breakForce: number = 2000, name?: string): Constraint3D {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = p1.z - p2.z;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
  const c: Constraint3D = {
    id: `${p1.id}_to_${p2.id}`,
    p1,
    p2,
    length: len,
    originalLength: len,
    stiffness,
    breakForce,
    broken: false,
    name: name || `${p1.name}-${p2.name}`,
  };
  ragdoll.constraints.push(c);
  return c;
}

export function updateRagdollBustAndGlutes(ragdoll: Ragdoll3D, enabled: boolean) {
  ragdoll.hasBustAndGlutes = enabled;

  const pechobase = ragdoll.particles.find((p) => p.name === 'pechobase');
  const pelvis = ragdoll.particles.find((p) => p.name === 'pelvis');

  cleanupAnatomyParticles(ragdoll, ['pecho_izq', 'pecho_der', 'tetilla_izq', 'tetilla_der', 'gluteo_izq', 'gluteo_der']);

  // Filter out any prior anatomy voxel blocks to eliminate cloning
  if (pechobase && pechobase.voxelBlocks) {
    pechobase.voxelBlocks = pechobase.voxelBlocks.filter(b => 
      !b.id.startsWith('anatomy_breast') && !b.id.includes('breast') && !b.id.includes('pecho')
    );
  }
  if (pelvis && pelvis.voxelBlocks) {
    pelvis.voxelBlocks = pelvis.voxelBlocks.filter(b => 
      !b.id.startsWith('anatomy_glute') && !b.id.includes('glute') && !b.id.includes('gluteo')
    );
  }

  const bodySkinColor = getRagdollSkinColor(ragdoll);

  // Pechos (breasts) and glúteos (glutes) MUST always use the exact skin color of the body!
  const bustColor = bodySkinColor;
  const nippleColor = 0xf472b6; // Soft pink areola color
  const gluteColor = bodySkinColor;

  // 1. Pechos (Breasts) on real Pechobase limb (with dedicated pseudo-3D envelope and cubic nipples!)
  if (pechobase && pechobase.voxelsGroup) {
    pechobase.voxelsGroup.children.slice().forEach((child) => {
      const name = child.name || '';
      if (name === 'BustExtraGroup' || name.startsWith('pecho_') || name.startsWith('tetilla_') || name.startsWith('breast_')) {
        pechobase.voxelsGroup.remove(child);
        child.traverse((c) => {
          if (c instanceof THREE.Mesh) {
            c.geometry?.dispose();
            if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
            else c.material?.dispose();
          }
        });
      }
    });

    if (enabled) {
      let bustGroup = new THREE.Group();
      bustGroup.name = 'BustExtraGroup';
      const reproScale = 0.2 + 2.3 * ((ragdoll as any).reproduction ?? 50) / 100;
      // Keep group scale unit, scale the children instead so positions are relative to body center
      bustGroup.scale.set(1.0, 1.0, 1.0);

      const mat = new THREE.MeshStandardMaterial({
        color: bustColor,
        roughness: 0.50,
        metalness: 0.05,
      });

      // Position flush to front of chest matching glutes architecture ("pechos sean como gluteos pero las tetillas bien")
      const breastZ = 0.095 + 0.055 * reproScale;
      const breastX_L = -0.095 * Math.max(0.6, Math.min(1.15, reproScale * 0.8));
      const breastX_R = 0.095 * Math.max(0.6, Math.min(1.15, reproScale * 0.8));
      const breastY = 0.01;
      const breastPosL = new THREE.Vector3(breastX_L, breastY, breastZ);
      const breastPosR = new THREE.Vector3(breastX_R, breastY, breastZ);

      // Nipple apex Z at the front curve of the breast sphere
      const areolaZ = breastZ + 0.118 * reproScale;
      const nippleTipZ = breastZ + 0.126 * reproScale;

      // 1. Left Breast (matching glutes geometry exactly: 0.11 * reproScale, scaled 1.05, 1.15, 1.10)
      const pseudoL = createPseudo3DContourMesh('pecho_izq', 0.20, 0.20, 0.18, ragdoll.sphericalContourLevel, bustColor);
      pseudoL.position.set(breastX_L, breastY, breastZ);
      pseudoL.scale.set(reproScale, reproScale, reproScale);
      pseudoL.name = 'pecho_pseudo_izq';
      pseudoL.renderOrder = 25;
      pseudoL.userData.isShirt = ragdoll.hasShirt;
      pseudoL.userData.baseColor = bustColor;
      if (pseudoL.material instanceof THREE.MeshStandardMaterial) {
        pseudoL.material.polygonOffset = true;
        pseudoL.material.polygonOffsetFactor = -4.0;
        pseudoL.material.polygonOffsetUnits = -4.0;
      }
      pseudoL.visible = Boolean(ragdoll.contourLayerEnabled);
      bustGroup.add(pseudoL);

      // Smooth spherical breast mesh matching glutes
      const breastGeomL = new THREE.SphereGeometry(0.11 * reproScale, 22, 22);
      breastGeomL.scale(1.05, 1.15, 1.10);
      const breastL = new THREE.Mesh(breastGeomL, mat.clone());
      breastL.position.set(breastX_L, breastY, breastZ);
      breastL.name = 'pecho_mesh_izq';
      breastL.renderOrder = 25;
      breastL.visible = true;
      bustGroup.add(breastL);

      if (!pechobase.voxelBlocks) pechobase.voxelBlocks = [];
      pechobase.voxelBlocks.push({
        id: 'anatomy_breast_l_block',
        localPos: breastL.position.clone(),
        size: [0.18 * reproScale, 0.18 * reproScale, 0.16 * reproScale],
        color: bustColor,
        originalColor: bustColor,
        active: true,
        mesh: breastL,
        isContour: false,
        isShirtBlock: ragdoll.hasShirt,
        isGenitalBlock: true,
        gridIndex: [0, 0, 0]
      });

      // Tetilla Izquierda ("las tetillas bien": Areola Disc + Protruding Nipple Bud + Dedicated Contour)
      const nippleMat = new THREE.MeshStandardMaterial({
        color: nippleColor,
        roughness: 0.45,
        metalness: 0.05,
      });

      // Tetilla Izquierda ("las tetillas bien": Areola Disc + Protruding Nipple Bud)
      const areolaGeomL = new THREE.CylinderGeometry(0.038 * reproScale, 0.040 * reproScale, 0.007 * reproScale, 20);
      const areolaL = new THREE.Mesh(areolaGeomL, nippleMat.clone());
      areolaL.rotation.x = Math.PI / 2;
      areolaL.position.set(breastX_L, breastY, areolaZ);
      areolaL.name = 'areola_mesh_izq';
      areolaL.renderOrder = 34;
      areolaL.visible = !ragdoll.hasShirt;
      bustGroup.add(areolaL);

      // Nipple bud / papilla at the center tip
      const nippleSphereGeomL = new THREE.SphereGeometry(0.020 * reproScale, 16, 16);
      const nippleL = new THREE.Mesh(nippleSphereGeomL, nippleMat.clone());
      nippleL.position.set(breastX_L, breastY, nippleTipZ);
      nippleL.name = 'tetilla_mesh_izq';
      nippleL.renderOrder = 35;
      nippleL.visible = !ragdoll.hasShirt;
      bustGroup.add(nippleL);

      pechobase.voxelBlocks.push({
        id: 'anatomy_nipple_l_block',
        localPos: nippleL.position.clone(),
        size: [0.045 * reproScale, 0.045 * reproScale, 0.025 * reproScale],
        color: nippleColor,
        originalColor: nippleColor,
        active: true,
        mesh: nippleL,
        isContour: false,
        isShirtBlock: false,
        isGenitalBlock: true,
        gridIndex: [0, 0, 0]
      });

      // 2. Right Breast (matching glutes geometry exactly: 0.11 * reproScale, scaled 1.05, 1.15, 1.10)
      const pseudoR = createPseudo3DContourMesh('pecho_der', 0.20, 0.20, 0.18, ragdoll.sphericalContourLevel, bustColor);
      pseudoR.position.set(breastX_R, breastY, breastZ);
      pseudoR.scale.set(reproScale, reproScale, reproScale);
      pseudoR.name = 'pecho_pseudo_der';
      pseudoR.renderOrder = 25;
      pseudoR.userData.isShirt = ragdoll.hasShirt;
      pseudoR.userData.baseColor = bustColor;
      if (pseudoR.material instanceof THREE.MeshStandardMaterial) {
        pseudoR.material.polygonOffset = true;
        pseudoR.material.polygonOffsetFactor = -4.0;
        pseudoR.material.polygonOffsetUnits = -4.0;
      }
      pseudoR.visible = Boolean(ragdoll.contourLayerEnabled);
      bustGroup.add(pseudoR);

      // Smooth spherical breast mesh matching glutes
      const breastGeomR = new THREE.SphereGeometry(0.11 * reproScale, 22, 22);
      breastGeomR.scale(1.05, 1.15, 1.10);
      const breastR = new THREE.Mesh(breastGeomR, mat.clone());
      breastR.position.set(breastX_R, breastY, breastZ);
      breastR.name = 'pecho_mesh_der';
      breastR.renderOrder = 25;
      breastR.visible = true;
      bustGroup.add(breastR);

      pechobase.voxelBlocks.push({
        id: 'anatomy_breast_r_block',
        localPos: breastR.position.clone(),
        size: [0.18 * reproScale, 0.18 * reproScale, 0.16 * reproScale],
        color: bustColor,
        originalColor: bustColor,
        active: true,
        mesh: breastR,
        isContour: false,
        isShirtBlock: ragdoll.hasShirt,
        isGenitalBlock: true,
        gridIndex: [0, 0, 0]
      });

      // Tetilla Derecha ("las tetillas bien": Areola Disc + Protruding Nipple Bud + Dedicated Contour)
      const areolaGeomR = new THREE.CylinderGeometry(0.038 * reproScale, 0.040 * reproScale, 0.007 * reproScale, 20);
      const areolaR = new THREE.Mesh(areolaGeomR, nippleMat.clone());
      areolaR.rotation.x = Math.PI / 2;
      areolaR.position.set(breastX_R, breastY, areolaZ);
      areolaR.name = 'areola_mesh_der';
      areolaR.renderOrder = 34;
      areolaR.visible = !ragdoll.hasShirt;
      bustGroup.add(areolaR);

      const nippleSphereGeomR = new THREE.SphereGeometry(0.020 * reproScale, 16, 16);
      const nippleR = new THREE.Mesh(nippleSphereGeomR, nippleMat.clone());
      nippleR.position.set(breastX_R, breastY, nippleTipZ);
      nippleR.name = 'tetilla_mesh_der';
      nippleR.renderOrder = 35;
      nippleR.visible = !ragdoll.hasShirt;
      bustGroup.add(nippleR);

      pechobase.voxelBlocks.push({
        id: 'anatomy_nipple_r_block',
        localPos: nippleR.position.clone(),
        size: [0.045 * reproScale, 0.045 * reproScale, 0.025 * reproScale],
        color: nippleColor,
        originalColor: nippleColor,
        active: true,
        mesh: nippleR,
        isContour: false,
        isShirtBlock: false,
        isGenitalBlock: true,
        gridIndex: [0, 0, 0]
      });

      // Connect each Breast sphere to the Pechobase chest surface with a cylinder (matching glutes architecture: 0.11 * reproScale)
      const connectBreastWithCylinder = (
        pA: THREE.Vector3,
        pB: THREE.Vector3,
        radius: number,
        material: THREE.Material,
        name: string
      ) => {
        const dir = new THREE.Vector3().subVectors(pB, pA);
        const len = dir.length();
        if (len < 0.001) return null;
        const geomCyl = new THREE.CylinderGeometry(radius, radius, len, 16, 1);
        const meshCyl = new THREE.Mesh(geomCyl, material);
        meshCyl.position.addVectors(pA, pB).multiplyScalar(0.5);
        meshCyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        meshCyl.name = name;
        meshCyl.renderOrder = 24;
        return meshCyl;
      };

      const chestBaseL = new THREE.Vector3(breastX_L, breastY, 0.02);
      const chestBaseR = new THREE.Vector3(breastX_R, breastY, 0.02);

      // 1. Left Breast connecting cylinder
      const connBreastL = connectBreastWithCylinder(
        chestBaseL,
        breastPosL,
        0.11 * reproScale,
        mat.clone(),
        'pecho_cyl_izq'
      );
      if (connBreastL) {
        bustGroup.add(connBreastL);
        pechobase.voxelBlocks.push({
          id: 'anatomy_breast_l_cylinder_block',
          localPos: connBreastL.position.clone(),
          size: [0.11 * reproScale, 0.11 * reproScale, 0.11 * reproScale],
          color: bustColor,
          originalColor: bustColor,
          active: true,
          mesh: connBreastL,
          isContour: false,
          isShirtBlock: ragdoll.hasShirt,
          isGenitalBlock: true,
          gridIndex: [0, 0, 0]
        });
      }

      // 2. Right Breast connecting cylinder
      const connBreastR = connectBreastWithCylinder(
        chestBaseR,
        breastPosR,
        0.11 * reproScale,
        mat.clone(),
        'pecho_cyl_der'
      );
      if (connBreastR) {
        bustGroup.add(connBreastR);
        pechobase.voxelBlocks.push({
          id: 'anatomy_breast_r_cylinder_block',
          localPos: connBreastR.position.clone(),
          size: [0.11 * reproScale, 0.11 * reproScale, 0.11 * reproScale],
          color: bustColor,
          originalColor: bustColor,
          active: true,
          mesh: connBreastR,
          isContour: false,
          isShirtBlock: ragdoll.hasShirt,
          isGenitalBlock: true,
          gridIndex: [0, 0, 0]
        });
      }

      bustGroup.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          if (ragdoll.hasShirt) {
            c.userData.isShirt = true;
            c.userData.baseColor = bustColor;
            if (c.name.includes('tetilla') || c.name.includes('nipple')) {
              c.visible = false;
            }
          }
          forceAnatomySkinVertexColors(c, bustColor);
        }
      });
      pechobase.voxelsGroup.add(bustGroup);
    }
  }

  // 2. Glúteos (Glutes) on real Pelvis limb (with dedicated pseudo-3D envelope and solid volume matching skin/pants!)
  if (pelvis && pelvis.voxelsGroup) {
    pelvis.voxelsGroup.children.slice().forEach((child) => {
      const name = child.name || '';
      if (name === 'GluteExtraGroup' || name.startsWith('gluteo_') || name.startsWith('glute_')) {
        pelvis.voxelsGroup.remove(child);
        child.traverse((c) => {
          if (c instanceof THREE.Mesh) {
            c.geometry?.dispose();
            if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
            else c.material?.dispose();
          }
        });
      }
    });

    if (enabled) {
      let gluteGroup = new THREE.Group();
      gluteGroup.name = 'GluteExtraGroup';
      const reproScale = 0.2 + 2.3 * ((ragdoll as any).reproduction ?? 50) / 100;
      gluteGroup.scale.set(1.0, 1.0, 1.0);

      // Glutes use pants color if pants are on, otherwise body skin color
      const gluteColorHex = ragdoll.hasPants ? ragdoll.pantsColorHex : gluteColor;
      const matGlute = new THREE.MeshStandardMaterial({
        color: gluteColorHex,
        roughness: ragdoll.hasPants ? 0.70 : 0.50,
        metalness: ragdoll.hasPants ? 0.02 : 0.05,
      });

      // Position flush to posterior/back of pelvis (negative Z)
      const gluteZ = -(0.095 + 0.055 * reproScale);
      const gluteX_L = -0.095 * Math.max(0.6, Math.min(1.15, reproScale * 0.8));
      const gluteX_R = 0.095 * Math.max(0.6, Math.min(1.15, reproScale * 0.8));
      const gluteY = -0.01;
      const glutePosL = new THREE.Vector3(gluteX_L, gluteY, gluteZ);
      const glutePosR = new THREE.Vector3(gluteX_R, gluteY, gluteZ);

      // 1. Left Glute Pseudo-3D Contour Mesh
      const pseudoGL = createPseudo3DContourMesh('gluteo_izq', 0.20, 0.20, 0.18, ragdoll.sphericalContourLevel, gluteColorHex);
      pseudoGL.position.set(gluteX_L, gluteY, gluteZ);
      pseudoGL.scale.set(reproScale, reproScale, reproScale);
      pseudoGL.name = 'gluteo_pseudo_izq';
      pseudoGL.renderOrder = 25;
      pseudoGL.userData.isPants = ragdoll.hasPants;
      pseudoGL.userData.baseColor = gluteColorHex;
      if (pseudoGL.material instanceof THREE.MeshStandardMaterial) {
        pseudoGL.material.polygonOffset = true;
        pseudoGL.material.polygonOffsetFactor = -4.0;
        pseudoGL.material.polygonOffsetUnits = -4.0;
      }
      pseudoGL.visible = Boolean(ragdoll.contourLayerEnabled);
      gluteGroup.add(pseudoGL);

      // Left Glute Solid Mesh
      const gluteGeomL = new THREE.SphereGeometry(0.11 * reproScale, 20, 20);
      gluteGeomL.scale(1.05, 1.15, 1.10);
      const gluteL = new THREE.Mesh(gluteGeomL, matGlute.clone());
      gluteL.position.set(gluteX_L, gluteY, gluteZ);
      gluteL.name = 'gluteo_mesh_izq';
      gluteL.renderOrder = 25;
      gluteL.visible = true;
      gluteGroup.add(gluteL);

      if (!pelvis.voxelBlocks) pelvis.voxelBlocks = [];
      pelvis.voxelBlocks.push({
        id: 'anatomy_glute_l_block',
        localPos: gluteL.position.clone(),
        size: [0.18 * reproScale, 0.18 * reproScale, 0.16 * reproScale],
        color: gluteColorHex,
        originalColor: gluteColorHex,
        active: true,
        mesh: gluteL,
        isContour: false,
        isPantsBlock: ragdoll.hasPants,
        isGenitalBlock: true,
        gridIndex: [0, 0, 0]
      });

      // 2. Right Glute Pseudo-3D Contour Mesh
      const pseudoGR = createPseudo3DContourMesh('gluteo_der', 0.20, 0.20, 0.18, ragdoll.sphericalContourLevel, gluteColorHex);
      pseudoGR.position.set(gluteX_R, gluteY, gluteZ);
      pseudoGR.scale.set(reproScale, reproScale, reproScale);
      pseudoGR.name = 'gluteo_pseudo_der';
      pseudoGR.renderOrder = 25;
      pseudoGR.userData.isPants = ragdoll.hasPants;
      pseudoGR.userData.baseColor = gluteColorHex;
      if (pseudoGR.material instanceof THREE.MeshStandardMaterial) {
        pseudoGR.material.polygonOffset = true;
        pseudoGR.material.polygonOffsetFactor = -4.0;
        pseudoGR.material.polygonOffsetUnits = -4.0;
      }
      pseudoGR.visible = Boolean(ragdoll.contourLayerEnabled);
      gluteGroup.add(pseudoGR);

      // Right Glute Solid Mesh
      const gluteGeomR = new THREE.SphereGeometry(0.11 * reproScale, 20, 20);
      gluteGeomR.scale(1.05, 1.15, 1.10);
      const gluteR = new THREE.Mesh(gluteGeomR, matGlute.clone());
      gluteR.position.set(gluteX_R, gluteY, gluteZ);
      gluteR.name = 'gluteo_mesh_der';
      gluteR.renderOrder = 25;
      gluteR.visible = true;
      gluteGroup.add(gluteR);

      pelvis.voxelBlocks.push({
        id: 'anatomy_glute_r_block',
        localPos: gluteR.position.clone(),
        size: [0.18 * reproScale, 0.18 * reproScale, 0.16 * reproScale],
        color: gluteColorHex,
        originalColor: gluteColorHex,
        active: true,
        mesh: gluteR,
        isContour: false,
        isPantsBlock: ragdoll.hasPants,
        isGenitalBlock: true,
        gridIndex: [0, 0, 0]
      });

      // Connecting cylinders between pelvis back and glute spheres
      const connectGluteWithCylinder = (
        pA: THREE.Vector3,
        pB: THREE.Vector3,
        radius: number,
        material: THREE.Material,
        name: string
      ) => {
        const dir = new THREE.Vector3().subVectors(pB, pA);
        const len = dir.length();
        if (len < 0.001) return null;
        const geomCyl = new THREE.CylinderGeometry(radius, radius, len, 16, 1);
        const meshCyl = new THREE.Mesh(geomCyl, material);
        meshCyl.position.addVectors(pA, pB).multiplyScalar(0.5);
        meshCyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        meshCyl.name = name;
        meshCyl.renderOrder = 24;
        return meshCyl;
      };

      const pelvisBaseL = new THREE.Vector3(gluteX_L, gluteY, -0.02);
      const pelvisBaseR = new THREE.Vector3(gluteX_R, gluteY, -0.02);

      const connGluteL = connectGluteWithCylinder(
        pelvisBaseL,
        glutePosL,
        0.11 * reproScale,
        matGlute.clone(),
        'gluteo_cyl_izq'
      );
      if (connGluteL) {
        gluteGroup.add(connGluteL);
        pelvis.voxelBlocks.push({
          id: 'anatomy_glute_l_cylinder_block',
          localPos: connGluteL.position.clone(),
          size: [0.11 * reproScale, 0.11 * reproScale, 0.11 * reproScale],
          color: gluteColorHex,
          originalColor: gluteColorHex,
          active: true,
          mesh: connGluteL,
          isContour: false,
          isPantsBlock: ragdoll.hasPants,
          isGenitalBlock: true,
          gridIndex: [0, 0, 0]
        });
      }

      const connGluteR = connectGluteWithCylinder(
        pelvisBaseR,
        glutePosR,
        0.11 * reproScale,
        matGlute.clone(),
        'gluteo_cyl_der'
      );
      if (connGluteR) {
        gluteGroup.add(connGluteR);
        pelvis.voxelBlocks.push({
          id: 'anatomy_glute_r_cylinder_block',
          localPos: connGluteR.position.clone(),
          size: [0.11 * reproScale, 0.11 * reproScale, 0.11 * reproScale],
          color: gluteColorHex,
          originalColor: gluteColorHex,
          active: true,
          mesh: connGluteR,
          isContour: false,
          isPantsBlock: ragdoll.hasPants,
          isGenitalBlock: true,
          gridIndex: [0, 0, 0]
        });
      }

      gluteGroup.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          if (ragdoll.hasPants) {
            c.userData.isPants = true;
            c.userData.baseColor = gluteColorHex;
          }
          forceAnatomySkinVertexColors(c, gluteColorHex);
        }
      });
      pelvis.voxelsGroup.add(gluteGroup);
    }

    // Add ragdoll physics particles and tendon constraints for breasts & glutes
    if (enabled) {
      const reproScale = 0.2 + 2.3 * ((ragdoll as any).reproduction ?? 50) / 100;
      const breastZ = 0.095 + 0.055 * reproScale;
      const breastX_L = -0.095 * Math.max(0.6, Math.min(1.15, reproScale * 0.8));
      const breastX_R = 0.095 * Math.max(0.6, Math.min(1.15, reproScale * 0.8));
      const breastY = 0.01;
      const nippleTipZ = breastZ + 0.126 * reproScale;

      if (pechobase) {
        const pBustL = addAnatomyParticle(ragdoll, 'pecho_izq', pechobase.x + breastX_L, pechobase.y + breastY, pechobase.z + breastZ, 0.18 * reproScale);
        const pBustR = addAnatomyParticle(ragdoll, 'pecho_der', pechobase.x + breastX_R, pechobase.y + breastY, pechobase.z + breastZ, 0.18 * reproScale);
        const pNipL = addAnatomyParticle(ragdoll, 'tetilla_izq', pechobase.x + breastX_L, pechobase.y + breastY, pechobase.z + nippleTipZ, 0.10 * reproScale);
        const pNipR = addAnatomyParticle(ragdoll, 'tetilla_der', pechobase.x + breastX_R, pechobase.y + breastY, pechobase.z + nippleTipZ, 0.10 * reproScale);

        addAnatomyConstraint(ragdoll, pechobase, pBustL, 0.95, 2500, 'tendon_pechobase_pecho_izq');
        addAnatomyConstraint(ragdoll, pechobase, pBustR, 0.95, 2500, 'tendon_pechobase_pecho_der');
        addAnatomyConstraint(ragdoll, pBustL, pBustR, 0.90, 2000, 'tendon_pecho_izq_der');
        addAnatomyConstraint(ragdoll, pBustL, pNipL, 0.98, 2500, 'tendon_pecho_tetilla_izq');
        addAnatomyConstraint(ragdoll, pBustR, pNipR, 0.98, 2500, 'tendon_pecho_tetilla_der');
      }

      if (pelvis) {
        const gluteZ = -(0.095 + 0.055 * reproScale);
        const gluteX_L = -0.095 * Math.max(0.6, Math.min(1.15, reproScale * 0.8));
        const gluteX_R = 0.095 * Math.max(0.6, Math.min(1.15, reproScale * 0.8));
        const gluteY = 0.01;

        const pGluteL = addAnatomyParticle(ragdoll, 'gluteo_izq', pelvis.x + gluteX_L, pelvis.y + gluteY, pelvis.z + gluteZ, 0.18 * reproScale);
        const pGluteR = addAnatomyParticle(ragdoll, 'gluteo_der', pelvis.x + gluteX_R, pelvis.y + gluteY, pelvis.z + gluteZ, 0.18 * reproScale);

        addAnatomyConstraint(ragdoll, pelvis, pGluteL, 0.95, 2500, 'tendon_pelvis_gluteo_izq');
        addAnatomyConstraint(ragdoll, pelvis, pGluteR, 0.95, 2500, 'tendon_pelvis_gluteo_der');
        addAnatomyConstraint(ragdoll, pGluteL, pGluteR, 0.90, 2000, 'tendon_gluteo_izq_der');
      }
    }
  }

  // Update anus position and blocks to adjust for anatomy status
  updateRagdollAnus(ragdoll);

  // Re-apply pseudo-3D contour morphing immediately
  updateRagdollSphericalContour(ragdoll, ragdoll.sphericalContourLevel);
}

/**
 * Creates a double-walled hollow sphere geometry with an outer shell and an inner cavity wall.
 */
export function createHollowSphereGeometry(outerRadius: number, innerRadius: number, widthSegments: number = 16, heightSegments: number = 14): THREE.BufferGeometry {
  const outerGeom = new THREE.SphereGeometry(outerRadius, widthSegments, heightSegments);
  const innerGeom = new THREE.SphereGeometry(innerRadius, widthSegments, heightSegments);

  const posOuter = outerGeom.attributes.position;
  const normOuter = outerGeom.attributes.normal;
  const posInner = innerGeom.attributes.position;
  const normInner = innerGeom.attributes.normal;

  const totalCount = posOuter.count + posInner.count;
  const positions = new Float32Array(totalCount * 3);
  const normals = new Float32Array(totalCount * 3);

  for (let i = 0; i < posOuter.count; i++) {
    positions[i * 3] = posOuter.getX(i);
    positions[i * 3 + 1] = posOuter.getY(i);
    positions[i * 3 + 2] = posOuter.getZ(i);
    normals[i * 3] = normOuter.getX(i);
    normals[i * 3 + 1] = normOuter.getY(i);
    normals[i * 3 + 2] = normOuter.getZ(i);
  }

  for (let i = 0; i < posInner.count; i++) {
    const idx = (posOuter.count + i) * 3;
    positions[idx] = posInner.getX(i);
    positions[idx + 1] = posInner.getY(i);
    positions[idx + 2] = posInner.getZ(i);
    normals[idx] = -normInner.getX(i);
    normals[idx + 1] = -normInner.getY(i);
    normals[idx + 2] = -normInner.getZ(i);
  }

  const hollowGeom = new THREE.BufferGeometry();
  hollowGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  hollowGeom.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

  const indexOuter = outerGeom.index ? Array.from(outerGeom.index.array) : [];
  const indexInner = innerGeom.index ? Array.from(innerGeom.index.array) : [];
  const combinedIndices: number[] = [...indexOuter];

  for (let i = 0; i < indexInner.length; i += 3) {
    combinedIndices.push(posOuter.count + indexInner[i]);
    combinedIndices.push(posOuter.count + indexInner[i + 2]);
    combinedIndices.push(posOuter.count + indexInner[i + 1]);
  }
  hollowGeom.setIndex(combinedIndices);
  return hollowGeom;
}

/**
 * Creates a hollow cylinder (tube) with real wall thickness using ExtrudeGeometry.
 */
export function createHollowCylinderGeometry(outerRadius: number, innerRadius: number, length: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);

  const holePath = new THREE.Path();
  holePath.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  shape.holes.push(holePath);

  const extrudeSettings = {
    depth: length,
    bevelEnabled: false,
    steps: 1,
  };
  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geom.center();
  return geom;
}

/**
 * Creates a hollow cylinder (tube) oriented vertically along the Y-axis.
 */
export function createHollowCylinderGeometryY(outerRadius: number, innerRadius: number, length: number): THREE.BufferGeometry {
  const geom = createHollowCylinderGeometry(outerRadius, innerRadius, length);
  geom.rotateX(Math.PI * 0.5);
  return geom;
}

/**
 * Creates a hollow rectangular tube with real wall thickness using ExtrudeGeometry.
 */
export function createHollowBoxGeometry(outerW: number, outerD: number, innerW: number, innerD: number, length: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-outerW / 2, -outerD / 2);
  shape.lineTo(outerW / 2, -outerD / 2);
  shape.lineTo(outerW / 2, outerD / 2);
  shape.lineTo(-outerW / 2, outerD / 2);
  shape.closePath();

  const holePath = new THREE.Path();
  holePath.moveTo(-innerW / 2, -innerD / 2);
  holePath.lineTo(-innerW / 2, innerD / 2);
  shape.holes.push(holePath);
  holePath.lineTo(innerW / 2, innerD / 2);
  holePath.lineTo(innerW / 2, -innerD / 2);
  holePath.closePath();

  const extrudeSettings = {
    depth: length,
    bevelEnabled: false,
    steps: 1,
  };
  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geom.center();
  geom.rotateX(Math.PI / 2);
  return geom;
}

/**
 * Creates the pink organ tube connecting neck to stomach (Esophagus / Pink connecting organ tube).
 * Directive: "falta cuello tubo rosa como genital con utero pero para estomago y cuello conectados que se vean en organos"
 * "falta tubo de cuello conectado a esyomago como el de genital y peovis"
 */
export function createNeckToStomachTube(scale: number = 1.0): THREE.Mesh {
  const tubeMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    roughness: 0.35,
    metalness: 0.08,
    emissive: 0xdb2777,
    emissiveIntensity: 0.35,
    side: THREE.DoubleSide,
  });
  const baseTubeLen = 0.35 * scale;
  const tubeRadius = 0.024 * scale;
  const tubeInnerRad = tubeRadius * 0.62;
  const neckTubeGeom = createHollowBoxGeometry(
    tubeRadius * 2,
    tubeRadius * 2,
    tubeInnerRad * 2,
    tubeInnerRad * 2,
    baseTubeLen
  );
  const neckTubeMesh = new THREE.Mesh(neckTubeGeom, tubeMat);
  neckTubeMesh.name = 'cuello_estomago_pink_tube';
  neckTubeMesh.userData = {
    originalLength: baseTubeLen,
    baseRadius: tubeRadius,
  };
  applyInternalAnatomyPainting(neckTubeMesh, {
    innerColorHex: 0x701a2b,
    outerRimColorHex: 0xf472b6,
    isPassThroughTube: true,
  });
  neckTubeMesh.visible = false;
  return neckTubeMesh;
}

export function updateRagdollGenitals(ragdoll: Ragdoll3D, type: 'none' | 'male' | 'female' = 'none') {
  ragdoll.genitalType = type;
  const pelvis = ragdoll.particles.find((p) => p.name === 'pelvis');

  cleanupAnatomyParticles(ragdoll, [
    'male_shaft_0', 'male_shaft_1', 'male_shaft_2', 'male_glans', 'testicle_l', 'testicle_r',
    'labio_izq', 'labio_der', 'female_labia_l', 'female_labia_r', 'female_clitoris',
    'female_labia_minora_l', 'female_labia_minora_r', 'entrada_femenina', 'female_entrance',
    'female_canal_tube', 'ovary_l', 'ovary_r', 'uterus'
  ]);

  if (pelvis && pelvis.voxelsGroup) {
    if (!pelvis.voxelBlocks) pelvis.voxelBlocks = [];
    pelvis.voxelBlocks = pelvis.voxelBlocks.filter((b) => 
      !b.isGenitalBlock && 
      !b.id.startsWith('genital_') && 
      !b.id.includes('labia') && 
      !b.id.includes('clitoris') && 
      !b.id.includes('entrance') && 
      !b.id.includes('testicle') && 
      !b.id.includes('shaft') &&
      !b.id.includes('canal') &&
      !b.id.includes('uterus')
    );

    pelvis.voxelsGroup.children.slice().forEach((child) => {
      const name = child.name || '';
      if (
        name === 'GenitalExtraGroup' ||
        name.startsWith('female_') ||
        name.startsWith('male_') ||
        name.startsWith('testicle_') ||
        name.startsWith('labia_') ||
        name.startsWith('clitoris_') ||
        name.startsWith('entrance_') ||
        name.startsWith('entrada_')
      ) {
        pelvis.voxelsGroup.remove(child);
        child.traverse((c) => {
          if (c instanceof THREE.Mesh) {
            c.geometry?.dispose();
            if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
            else c.material?.dispose();
          }
        });
      }
    });

    if (type !== 'none') {
      const genitalGroup = new THREE.Group();
      genitalGroup.name = 'GenitalExtraGroup';
      const reproScale = 0.2 + 2.3 * (((ragdoll as any).reproduction ?? 50) / 100);
      // Keep group scale at 1.0 so positions are relative to pelvis center, scale children instead
      genitalGroup.scale.set(1.0, 1.0, 1.0);

      // Materials
      const pelvisSkinColor = getRagdollSkinColor(ragdoll);
      ragdoll.skinColorHex = pelvisSkinColor;
      const bodySkinColor = pelvisSkinColor;
      const skinMat = new THREE.MeshStandardMaterial({
        color: bodySkinColor,
        roughness: 0.50,
        metalness: 0.05,
        polygonOffset: true,
        polygonOffsetFactor: -1.0,
        polygonOffsetUnits: -1.0,
      });

      const pinkMat = new THREE.MeshStandardMaterial({
        color: 0xf472b6,
        roughness: 0.45,
        metalness: 0.05,
        polygonOffset: true,
        polygonOffsetFactor: -1.0,
        polygonOffsetUnits: -1.0,
      });

      const rootY = -0.04;
      const genitalFrontZ = 0.155;
      const femaleRootZ = 0.155;

      const shaftLenMultiplier = ragdoll.genitalMShaftLength ?? 1.0;
      const shaftThickMultiplier = ragdoll.genitalMShaftThickness ?? 1.0;
      const pinkSizeMultiplier = ragdoll.genitalMPinkSize ?? 1.0;
      const fSizeMultiplier = ragdoll.genitalFSize ?? 1.0;

      if (type === 'male') {
        const testW = 0.052 * shaftThickMultiplier, testH = 0.052 * shaftThickMultiplier, testD = 0.052 * shaftThickMultiplier;
        const testY = rootY - 0.010 * shaftThickMultiplier;
        const testZ = genitalFrontZ - 0.012 * shaftThickMultiplier;

        // 1. Male penis shaft & glans pivot group for erection animation
        const erectionPivot = new THREE.Group();
        erectionPivot.name = 'ErectionPivotGroup';
        // Position erectionPivot flush to pelvis groin, and scale by reproduction scale
        erectionPivot.position.set(0, rootY * reproScale, 0.10 + (genitalFrontZ - 0.10) * reproScale);
        genitalGroup.add(erectionPivot);

        // Testicles (Bolas M - Spheres with horizontal connecting cylinders directly connected to shaft inside pivot)
        const testRadius = 0.028 * shaftThickMultiplier;
        const testGeom = new THREE.SphereGeometry(testRadius, 16, 16);

        const localTestY = -0.012 * shaftThickMultiplier * reproScale;
        const localTestZ = -0.008 * shaftThickMultiplier * reproScale;
        const localTestX_L = -0.018 * shaftThickMultiplier * reproScale;
        const localTestX_R = 0.018 * shaftThickMultiplier * reproScale;

        // --- LEFT TESTICLE ---
        const testLPseudoGeom = new THREE.SphereGeometry(testRadius * 1.12, 16, 16);
        const testLPseudo = new THREE.Mesh(testLPseudoGeom, skinMat.clone());
        testLPseudo.name = 'male_testicle_pseudo_l';
        testLPseudo.position.set(localTestX_L, localTestY, localTestZ);
        testLPseudo.scale.set(reproScale, reproScale, reproScale);
        testLPseudo.renderOrder = 17;
        testLPseudo.visible = Boolean(ragdoll.contourLayerEnabled);
        erectionPivot.add(testLPseudo);

        const testConnPseudoGeomL = new THREE.CylinderGeometry(0.009 * shaftThickMultiplier * reproScale * 1.15, 0.009 * shaftThickMultiplier * reproScale * 1.15, Math.abs(localTestX_L), 12, 1);
        const testConnPseudoL = new THREE.Mesh(testConnPseudoGeomL, skinMat.clone());
        testConnPseudoL.position.set(localTestX_L / 2, localTestY, localTestZ);
        testConnPseudoL.rotation.z = Math.PI / 2;
        testConnPseudoL.name = 'male_testicle_conn_pseudo_l';
        testConnPseudoL.renderOrder = 17;
        testConnPseudoL.visible = Boolean(ragdoll.contourLayerEnabled);
        erectionPivot.add(testConnPseudoL);

        const testL = new THREE.Mesh(testGeom, skinMat);
        testL.position.set(localTestX_L, localTestY, localTestZ);
        testL.scale.set(reproScale, reproScale, reproScale);
        testL.renderOrder = 16;
        testL.name = 'male_testicle_mesh_l';
        testL.visible = !ragdoll.contourLayerEnabled;
        erectionPivot.add(testL);

        const testConnGeomL = new THREE.CylinderGeometry(0.009 * shaftThickMultiplier * reproScale, 0.009 * shaftThickMultiplier * reproScale, Math.abs(localTestX_L), 12, 1);
        const testConnMeshL = new THREE.Mesh(testConnGeomL, skinMat);
        testConnMeshL.position.set(localTestX_L / 2, localTestY, localTestZ);
        testConnMeshL.rotation.z = Math.PI / 2;
        testConnMeshL.name = 'male_testicle_conn_l';
        testConnMeshL.renderOrder = 16;
        testConnMeshL.visible = !ragdoll.contourLayerEnabled;
        erectionPivot.add(testConnMeshL);
        const activeTestLMesh = testL;

        // --- RIGHT TESTICLE ---
        const testRPseudoGeom = new THREE.SphereGeometry(testRadius * 1.12, 16, 16);
        const testRPseudo = new THREE.Mesh(testRPseudoGeom, skinMat.clone());
        testRPseudo.name = 'male_testicle_pseudo_r';
        testRPseudo.position.set(localTestX_R, localTestY, localTestZ);
        testRPseudo.scale.set(reproScale, reproScale, reproScale);
        testRPseudo.renderOrder = 17;
        testRPseudo.visible = Boolean(ragdoll.contourLayerEnabled);
        erectionPivot.add(testRPseudo);

        const testConnPseudoGeomR = new THREE.CylinderGeometry(0.009 * shaftThickMultiplier * reproScale * 1.15, 0.009 * shaftThickMultiplier * reproScale * 1.15, Math.abs(localTestX_R), 12, 1);
        const testConnPseudoR = new THREE.Mesh(testConnPseudoGeomR, skinMat.clone());
        testConnPseudoR.position.set(localTestX_R / 2, localTestY, localTestZ);
        testConnPseudoR.rotation.z = Math.PI / 2;
        testConnPseudoR.name = 'male_testicle_conn_pseudo_r';
        testConnPseudoR.renderOrder = 17;
        testConnPseudoR.visible = Boolean(ragdoll.contourLayerEnabled);
        erectionPivot.add(testConnPseudoR);

        const testR = new THREE.Mesh(testGeom, skinMat);
        testR.position.set(localTestX_R, localTestY, localTestZ);
        testR.scale.set(reproScale, reproScale, reproScale);
        testR.renderOrder = 16;
        testR.name = 'male_testicle_mesh_r';
        testR.visible = !ragdoll.contourLayerEnabled;
        erectionPivot.add(testR);

        const testConnGeomR = new THREE.CylinderGeometry(0.009 * shaftThickMultiplier * reproScale, 0.009 * shaftThickMultiplier * reproScale, Math.abs(localTestX_R), 12, 1);
        const testConnMeshR = new THREE.Mesh(testConnGeomR, skinMat);
        testConnMeshR.position.set(localTestX_R / 2, localTestY, localTestZ);
        testConnMeshR.rotation.z = Math.PI / 2;
        testConnMeshR.name = 'male_testicle_conn_r';
        testConnMeshR.renderOrder = 16;
        testConnMeshR.visible = !ragdoll.contourLayerEnabled;
        erectionPivot.add(testConnMeshR);
        const activeTestRMesh = testR;

        // 3. Male penis shaft voxels
        const shaftLength = 0.22 * shaftLenMultiplier;
        const shaftW = 0.038 * shaftThickMultiplier;
        const shaftD = 0.038 * shaftThickMultiplier;

        const shaftPseudoGeom = new THREE.CylinderGeometry(shaftW * 0.5 * 1.15, shaftW * 0.5 * 1.15, shaftLength, 16, 1);
        const shaftPseudo = new THREE.Mesh(shaftPseudoGeom, skinMat.clone());
        shaftPseudo.position.set(0, -shaftLength / 2, 0);
        shaftPseudo.name = 'male_shaft_pseudo';
        shaftPseudo.renderOrder = 17;
        shaftPseudo.visible = Boolean(ragdoll.contourLayerEnabled);
        erectionPivot.add(shaftPseudo);

        const shaftGeom = new THREE.CylinderGeometry(shaftW * 0.5, shaftW * 0.5, shaftLength, 16, 1);
        const shaftMesh = new THREE.Mesh(shaftGeom, skinMat);
        shaftMesh.position.set(0, -shaftLength / 2, 0);
        shaftMesh.name = 'male_shaft_mesh';
        shaftMesh.renderOrder = 16;
        shaftMesh.visible = !ragdoll.contourLayerEnabled;
        erectionPivot.add(shaftMesh);
        const activeShaftMesh = shaftMesh;

        pelvis.voxelBlocks.push({
          id: 'genital_male_shaft_block',
          localPos: new THREE.Vector3(0, -shaftLength / 2 + rootY, genitalFrontZ),
          size: [shaftW, shaftLength, shaftD],
          color: bodySkinColor,
          originalColor: bodySkinColor,
          active: true,
          mesh: activeShaftMesh,
          isContour: false,
          isGenitalBlock: true,
          gridIndex: [0, 0, 0]
        });

        // 4. Glans (Glande / Punta Rosa)
        const glansRadius = shaftW * 0.58 * pinkSizeMultiplier;
        const glansPseudoGeom = new THREE.SphereGeometry(glansRadius, 16, 16);
        const glansPseudo = new THREE.Mesh(glansPseudoGeom, pinkMat.clone());
        glansPseudo.position.set(0, -shaftLength - glansRadius * 0.35, 0);
        glansPseudo.name = 'male_glans_pseudo';
        glansPseudo.renderOrder = 18;
        glansPseudo.visible = Boolean(ragdoll.contourLayerEnabled);
        applyInternalAnatomyPainting(glansPseudo, {
          innerColorHex: 0xf472b6,
          outerRimColorHex: 0xf472b6,
          entrancePos: new THREE.Vector3(0, -glansRadius, 0),
          entranceRadius: glansRadius * 0.5,
        });
        erectionPivot.add(glansPseudo);

        const glansGeom = new THREE.SphereGeometry(glansRadius, 16, 16);
        const glansMesh = new THREE.Mesh(glansGeom, pinkMat);
        glansMesh.position.set(0, -shaftLength - glansRadius * 0.35, 0);
        glansMesh.name = 'male_glans_mesh';
        glansMesh.renderOrder = 17;
        glansMesh.visible = !ragdoll.contourLayerEnabled;
        applyInternalAnatomyPainting(glansMesh, {
          innerColorHex: 0xf472b6,
          outerRimColorHex: 0xf472b6,
          entrancePos: new THREE.Vector3(0, -glansRadius, 0),
          entranceRadius: glansRadius * 0.5,
        });
        erectionPivot.add(glansMesh);
        const activeGlansMesh = glansMesh;

        pelvis.voxelBlocks.push({
          id: 'genital_male_glans_block',
          localPos: new THREE.Vector3(0, -shaftLength - glansRadius * 0.35 + rootY, genitalFrontZ),
          size: [glansRadius * 2, glansRadius * 2, glansRadius * 2],
          color: bodySkinColor,
          originalColor: bodySkinColor,
          active: true,
          mesh: activeGlansMesh,
          isContour: false,
          isGenitalBlock: true,
          isOrganBlock: true,
          gridIndex: [0, 0, 0]
        });

        // Register glans tip opening (punta rosa genital M) as an inactive missing block with exact painted hole size
        const maleGlansHoleBlock: LimbVoxelBlock = {
          id: 'genital_male_glans_hole_block',
          localPos: new THREE.Vector3(0, -shaftLength - glansRadius * 1.0 + rootY, genitalFrontZ),
          size: [glansRadius * 0.7, glansRadius * 0.7, glansRadius * 0.7],
          color: 0xf472b6,
          originalColor: 0xf472b6,
          active: false,
          mesh: undefined,
          isContour: false,
          isGenitalBlock: true,
          isOrganBlock: true,
          gridIndex: [0, 0, 0]
        };
        pelvis.voxelBlocks.push(maleGlansHoleBlock);
        paintMissingBlockWoundHole(pelvis, maleGlansHoleBlock);

        // Apply initial erection state
        const targetRot = -(Math.PI / 2 + 0.6) * (ragdoll.erectionLevel || 0);
        erectionPivot.rotation.x = targetRot;
        const scaleVal = (1.0 + 0.5 * (ragdoll.erectionLevel || 0)) * reproScale;
        erectionPivot.scale.set(scaleVal, scaleVal, scaleVal);

        // 5. Internal urethral tube - Hollow Box Tube with real thickness
        const mTubeStartY = rootY;
        const mTubeStartZ = genitalFrontZ;
        const mTubeEndY = 0.12;
        const mTubeEndZ = 0.02;
        const mTubeLength = Math.sqrt((mTubeEndY - mTubeStartY) ** 2 + (mTubeEndZ - mTubeStartZ) ** 2);
        const tubeW = 0.038 * shaftThickMultiplier;
        const tubeD = 0.038 * shaftThickMultiplier;

        const tubeGeom = createHollowBoxGeometry(tubeW, tubeD, tubeW * 0.6, tubeD * 0.6, mTubeLength);
        const tubeMat = new THREE.MeshStandardMaterial({
          color: 0xf472b6,
          roughness: 0.35,
          emissive: 0xdb2777,
          emissiveIntensity: 0.3,
          side: THREE.DoubleSide,
        });
        const urethralTubeMesh = new THREE.Mesh(tubeGeom, tubeMat);
        urethralTubeMesh.position.set(0, ((mTubeStartY + mTubeEndY) / 2) * reproScale, 0.10 + (((mTubeStartZ + mTubeEndZ) / 2) - 0.10) * reproScale);
        urethralTubeMesh.scale.set(reproScale, reproScale, reproScale);
        urethralTubeMesh.rotation.x = Math.atan2(mTubeStartZ - mTubeEndZ, mTubeEndY - mTubeStartY);
        urethralTubeMesh.renderOrder = 0;
        urethralTubeMesh.name = 'male_internal_tube';
        urethralTubeMesh.userData = { originalLength: mTubeLength };
        applyInternalAnatomyPainting(urethralTubeMesh, {
          innerColorHex: 0x701a2b,
          outerRimColorHex: 0xf472b6,
          isPassThroughTube: true,
        });
        genitalGroup.add(urethralTubeMesh);

        pelvis.voxelBlocks.push({
          id: 'genital_male_testicle_l',
          localPos: new THREE.Vector3(-0.032 * shaftThickMultiplier, testY, testZ),
          size: [testW, testH, testD],
          color: bodySkinColor,
          originalColor: bodySkinColor,
          active: true,
          mesh: activeTestLMesh,
          isContour: false,
          isGenitalBlock: true,
          gridIndex: [0, 0, 0],
        });

        pelvis.voxelBlocks.push({
          id: 'genital_male_testicle_r',
          localPos: new THREE.Vector3(0.032 * shaftThickMultiplier, testY, testZ),
          size: [testW, testH, testD],
          color: bodySkinColor,
          originalColor: bodySkinColor,
          active: true,
          mesh: activeTestRMesh,
          isContour: false,
          isGenitalBlock: true,
          gridIndex: [0, 0, 0],
        });

        pelvis.voxelBlocks.push({
          id: 'genital_male_urethra_tube',
          localPos: urethralTubeMesh.position.clone(),
          size: [tubeW, mTubeLength, tubeD],
          color: 0xf472b6,
          originalColor: 0xf472b6,
          active: true,
          mesh: urethralTubeMesh,
          isContour: false,
          isGenitalBlock: true,
          isOrganBlock: true,
          gridIndex: [0, 0, 0],
        });

        // Add physical ragdoll particles and tendons for male genital M (always active ragdoll tendons)
        if (pelvis) {
          const pTestL = addAnatomyParticle(ragdoll, 'testicle_l', pelvis.x + localTestX_L, pelvis.y + localTestY, pelvis.z + localTestZ, 0.15);
          const pTestR = addAnatomyParticle(ragdoll, 'testicle_r', pelvis.x + localTestX_R, pelvis.y + localTestY, pelvis.z + localTestZ, 0.15);
          const pShaftBase = addAnatomyParticle(ragdoll, 'male_shaft_0', pelvis.x, pelvis.y + rootY, pelvis.z + genitalFrontZ, 0.20);
          const pShaftMid = addAnatomyParticle(ragdoll, 'male_shaft_1', pelvis.x, pelvis.y + rootY - shaftLength * 0.5, pelvis.z + genitalFrontZ + 0.04, 0.18);
          const pGlans = addAnatomyParticle(ragdoll, 'male_glans', pelvis.x, pelvis.y + rootY - shaftLength, pelvis.z + genitalFrontZ + 0.08, 0.15);

          addAnatomyConstraint(ragdoll, pelvis, pTestL, 0.95, 2000, 'tendon_pelvis_testicle_l');
          addAnatomyConstraint(ragdoll, pelvis, pTestR, 0.95, 2000, 'tendon_pelvis_testicle_r');
          addAnatomyConstraint(ragdoll, pTestL, pTestR, 0.95, 2000, 'tendon_testicle_l_r');
          addAnatomyConstraint(ragdoll, pelvis, pShaftBase, 0.98, 2500, 'tendon_pelvis_male_shaft_base');
          addAnatomyConstraint(ragdoll, pShaftBase, pShaftMid, 0.96, 2200, 'tendon_male_shaft_base_mid');
          addAnatomyConstraint(ragdoll, pShaftMid, pGlans, 0.96, 2200, 'tendon_male_shaft_mid_glans');
          addAnatomyConstraint(ragdoll, pTestL, pShaftMid, 0.90, 1800, 'tendon_testicle_l_shaft');
          addAnatomyConstraint(ragdoll, pTestR, pShaftMid, 0.90, 1800, 'tendon_testicle_r_shaft');
        }

        // Keep pelvis voxel blocks intact so there are no holes or missing blocks in the pelvis skin
      } else if (type === 'female') {
        const sideCylRadius = 0.010 * fSizeMultiplier;
        const sideCylHeight = 0.052 * fSizeMultiplier;
        const tipSphereRadius = 0.012 * fSizeMultiplier;

        const sideCylGeom = new THREE.CylinderGeometry(sideCylRadius, sideCylRadius, sideCylHeight, 16, 1);
        const tipSphereGeom = new THREE.SphereGeometry(tipSphereRadius, 16, 16);

        const sideCylPseudoGeom = new THREE.CylinderGeometry(sideCylRadius * 1.15, sideCylRadius * 1.15, sideCylHeight, 16, 1);
        const tipSpherePseudoGeom = new THREE.SphereGeometry(tipSphereRadius * 1.15, 16, 16);

        // --- 1. LABIA MAJORA (Outer Skin-Colored Folds on Left & Right) ---
        // Left Labia
        const posLabiaL = new THREE.Vector3(-0.012 * fSizeMultiplier * reproScale, rootY * reproScale, 0.10 + (femaleRootZ - 0.10) * reproScale);
        const labiaLPseudo = new THREE.Mesh(sideCylPseudoGeom, skinMat.clone());
        labiaLPseudo.position.copy(posLabiaL);
        labiaLPseudo.scale.set(reproScale, reproScale, reproScale);
        labiaLPseudo.renderOrder = 17;
        labiaLPseudo.name = 'female_labia_pseudo_l';
        labiaLPseudo.visible = Boolean(ragdoll.contourLayerEnabled);
        genitalGroup.add(labiaLPseudo);

        const tipLPseudo_bottom = new THREE.Mesh(tipSpherePseudoGeom, skinMat.clone());
        tipLPseudo_bottom.position.set(0, -sideCylHeight * 0.5, 0);
        tipLPseudo_bottom.name = 'female_labia_tip_bottom_pseudo_l';
        tipLPseudo_bottom.renderOrder = 17;
        labiaLPseudo.add(tipLPseudo_bottom);

        const tipLPseudo_top = new THREE.Mesh(tipSpherePseudoGeom, skinMat.clone());
        tipLPseudo_top.position.set(0, sideCylHeight * 0.5, 0);
        tipLPseudo_top.name = 'female_labia_tip_top_pseudo_l';
        tipLPseudo_top.renderOrder = 17;
        labiaLPseudo.add(tipLPseudo_top);

        const labiaL = new THREE.Mesh(sideCylGeom, skinMat);
        labiaL.position.copy(posLabiaL);
        labiaL.scale.set(reproScale, reproScale, reproScale);
        labiaL.renderOrder = 16;
        labiaL.name = 'female_labia_mesh_l';
        labiaL.visible = !ragdoll.contourLayerEnabled;
        genitalGroup.add(labiaL);

        const tipL_bottom = new THREE.Mesh(tipSphereGeom, skinMat);
        tipL_bottom.position.set(0, -sideCylHeight * 0.5, 0);
        tipL_bottom.name = 'female_labia_tip_bottom_l';
        tipL_bottom.renderOrder = 16;
        labiaL.add(tipL_bottom);

        const tipL_top = new THREE.Mesh(tipSphereGeom, skinMat);
        tipL_top.position.set(0, sideCylHeight * 0.5, 0);
        tipL_top.name = 'female_labia_tip_top_l';
        tipL_top.renderOrder = 16;
        labiaL.add(tipL_top);
        const activeLabiaLMesh = labiaL;

        pelvis.voxelBlocks.push({
          id: 'genital_female_labia_cylinder_l',
          localPos: posLabiaL.clone(),
          size: [sideCylRadius * 2 * reproScale, sideCylHeight * reproScale, sideCylRadius * 2 * reproScale],
          color: bodySkinColor,
          originalColor: bodySkinColor,
          active: true,
          mesh: activeLabiaLMesh,
          isContour: false,
          isGenitalBlock: true,
          gridIndex: [0, 0, 0],
        });

        // Right Labia
        const posLabiaR = new THREE.Vector3(0.012 * fSizeMultiplier * reproScale, rootY * reproScale, 0.10 + (femaleRootZ - 0.10) * reproScale);
        const labiaRPseudo = new THREE.Mesh(sideCylPseudoGeom, skinMat.clone());
        labiaRPseudo.position.copy(posLabiaR);
        labiaRPseudo.scale.set(reproScale, reproScale, reproScale);
        labiaRPseudo.renderOrder = 17;
        labiaRPseudo.name = 'female_labia_pseudo_r';
        labiaRPseudo.visible = Boolean(ragdoll.contourLayerEnabled);
        genitalGroup.add(labiaRPseudo);

        const tipRPseudo_bottom = new THREE.Mesh(tipSpherePseudoGeom, skinMat.clone());
        tipRPseudo_bottom.position.set(0, -sideCylHeight * 0.5, 0);
        tipRPseudo_bottom.name = 'female_labia_tip_bottom_pseudo_r';
        tipRPseudo_bottom.renderOrder = 17;
        labiaRPseudo.add(tipRPseudo_bottom);

        const tipRPseudo_top = new THREE.Mesh(tipSpherePseudoGeom, skinMat.clone());
        tipRPseudo_top.position.set(0, sideCylHeight * 0.5, 0);
        tipRPseudo_top.name = 'female_labia_tip_top_pseudo_r';
        tipRPseudo_top.renderOrder = 17;
        labiaRPseudo.add(tipRPseudo_top);

        const labiaR = new THREE.Mesh(sideCylGeom, skinMat);
        labiaR.position.copy(posLabiaR);
        labiaR.scale.set(reproScale, reproScale, reproScale);
        labiaR.renderOrder = 16;
        labiaR.name = 'female_labia_mesh_r';
        labiaR.visible = !ragdoll.contourLayerEnabled;
        genitalGroup.add(labiaR);

        const tipR_bottom = new THREE.Mesh(tipSphereGeom, skinMat);
        tipR_bottom.position.set(0, -sideCylHeight * 0.5, 0);
        tipR_bottom.name = 'female_labia_tip_bottom_r';
        tipR_bottom.renderOrder = 16;
        labiaR.add(tipR_bottom);

        const tipR_top = new THREE.Mesh(tipSphereGeom, skinMat);
        tipR_top.position.set(0, sideCylHeight * 0.5, 0);
        tipR_top.name = 'female_labia_tip_top_r';
        tipR_top.renderOrder = 16;
        labiaR.add(tipR_top);
        const activeLabiaRMesh = labiaR;

        pelvis.voxelBlocks.push({
          id: 'genital_female_labia_cylinder_r',
          localPos: posLabiaR.clone(),
          size: [sideCylRadius * 2 * reproScale, sideCylHeight * reproScale, sideCylRadius * 2 * reproScale],
          color: bodySkinColor,
          originalColor: bodySkinColor,
          active: true,
          mesh: activeLabiaRMesh,
          isContour: false,
          isGenitalBlock: true,
          gridIndex: [0, 0, 0],
        });

        // --- 2. SINGLE PINK SPHERE FOR PARTE ROSA ---
        const pinkRadius = 0.016 * fSizeMultiplier;
        const worldY = rootY;
        const worldZ = femaleRootZ + 0.002 * fSizeMultiplier;
        const posPink = new THREE.Vector3(0, worldY * reproScale, 0.10 + (worldZ - 0.10) * reproScale);

        const pinkPseudoSphereGeom = new THREE.SphereGeometry(pinkRadius * 1.15, 16, 16);
        const pinkPseudoSphere = new THREE.Mesh(pinkPseudoSphereGeom, pinkMat.clone());
        pinkPseudoSphere.position.copy(posPink);
        pinkPseudoSphere.scale.set(reproScale, reproScale, reproScale);
        pinkPseudoSphere.renderOrder = 19;
        pinkPseudoSphere.name = 'female_pink_pseudo_sphere';
        pinkPseudoSphere.visible = Boolean(ragdoll.contourLayerEnabled);
        genitalGroup.add(pinkPseudoSphere);

        const pinkSphereGeom = new THREE.SphereGeometry(pinkRadius, 16, 16);
        const pinkSphereMesh = new THREE.Mesh(pinkSphereGeom, pinkMat);
        pinkSphereMesh.position.copy(posPink);
        pinkSphereMesh.scale.set(reproScale, reproScale, reproScale);
        pinkSphereMesh.renderOrder = 18;
        pinkSphereMesh.name = 'female_pink_sphere';
        pinkSphereMesh.visible = !ragdoll.contourLayerEnabled;
        applyInternalAnatomyPainting(pinkSphereMesh, {
          innerColorHex: 0xf472b6,
          outerRimColorHex: 0xf472b6,
        });
        genitalGroup.add(pinkSphereMesh);
        const activePinkMesh = pinkSphereMesh;

        pelvis.voxelBlocks.push({
          id: 'genital_female_pink_sphere_block',
          localPos: posPink.clone(),
          size: [pinkRadius * 2 * reproScale, pinkRadius * 2 * reproScale, pinkRadius * 2 * reproScale],
          color: 0xf472b6,
          originalColor: 0xf472b6,
          active: true,
          mesh: activePinkMesh,
          isContour: false,
          isGenitalBlock: true,
          isOrganBlock: true,
          gridIndex: [0, 0, 0],
        });

        // Register female central vaginal entrance (punta rosa genital F) as an inactive missing block with exact painted hole size
        const femaleEntranceHoleBlock: LimbVoxelBlock = {
          id: 'genital_female_entrance_hole_block',
          localPos: posPink.clone().add(new THREE.Vector3(0, 0, 0.005 * reproScale)),
          size: [pinkRadius * 1.0 * reproScale, pinkRadius * 1.0 * reproScale, pinkRadius * 1.0 * reproScale],
          color: 0xf472b6,
          originalColor: 0xf472b6,
          active: false,
          mesh: undefined,
          isContour: false,
          isGenitalBlock: true,
          isOrganBlock: true,
          gridIndex: [0, 0, 0]
        };
        pelvis.voxelBlocks.push(femaleEntranceHoleBlock);

        const fTubeStartY = rootY;
        const fTubeStartZ = femaleRootZ - 0.005;
        const fTubeEndY = 0.08;
        const fTubeEndZ = 0.012;
        const fTubeLength = Math.sqrt((fTubeEndY - fTubeStartY) ** 2 + (fTubeEndZ - fTubeStartZ) ** 2);
        const fTubeW = 0.018 * fSizeMultiplier;
        const fTubeD = 0.018 * fSizeMultiplier;

        const fTubeMat = new THREE.MeshStandardMaterial({
          color: 0xf472b6,
          roughness: 0.35,
          emissive: 0xdb2777,
          emissiveIntensity: 0.3,
          side: THREE.DoubleSide,
        });

        // Vaginal Canal (Internal Tube) - Pink Hollow Box Tube with real thickness
        const fCanalGeom = createHollowBoxGeometry(fTubeW, fTubeD, fTubeW * 0.6, fTubeD * 0.6, fTubeLength);
        const fCanalMesh = new THREE.Mesh(fCanalGeom, fTubeMat);
        fCanalMesh.name = 'female_internal_tube';
        fCanalMesh.position.set(0, ((fTubeStartY + fTubeEndY) / 2) * reproScale, 0.10 + (((fTubeStartZ + fTubeEndZ) / 2) - 0.10) * reproScale);
        fCanalMesh.scale.set(reproScale, reproScale, reproScale);
        fCanalMesh.rotation.x = Math.atan2(fTubeStartZ - fTubeEndZ, fTubeEndY - fTubeStartY);
        fCanalMesh.userData = { originalLength: fTubeLength };
        applyInternalAnatomyPainting(fCanalMesh, {
          innerColorHex: 0x701a2b,
          outerRimColorHex: 0xf472b6,
          isPassThroughTube: true,
        });
        genitalGroup.add(fCanalMesh);

        const uterusGroup = new THREE.Group();
        uterusGroup.name = 'UterusOrganGroup';
        uterusGroup.position.set(0, 0.08 * reproScale, 0.10 + (0.012 - 0.10) * reproScale);
        uterusGroup.scale.set(reproScale, reproScale, reproScale);

        const uterusMat = new THREE.MeshStandardMaterial({
          color: 0x7f1d1d,
          roughness: 0.6,
          emissive: 0x000000,
          emissiveIntensity: 0.0,
          side: THREE.DoubleSide,
        });

        // Uterus Body - Single Hollow Sphere (pear-shaped via scale) with hollow lumen cavity
        const uterusRadius = 0.024 * fSizeMultiplier;
        const uterusBodyGeom = createHollowSphereGeometry(uterusRadius, uterusRadius * 0.65, 16, 14);
        const uterusBodyMesh = new THREE.Mesh(uterusBodyGeom, uterusMat);
        uterusBodyMesh.name = 'female_uterus_body';
        uterusBodyMesh.scale.set(1.0, 1.2, 0.8); // Slightly pear/flattened shape
        applyInternalAnatomyPainting(uterusBodyMesh, {
          innerColorHex: 0x701a2b,
          outerRimColorHex: 0x9f1239,
        });
        uterusGroup.add(uterusBodyMesh);

        const fallopianMat = new THREE.MeshStandardMaterial({
          color: 0x7f1d1d,
          roughness: 0.6,
          emissive: 0x000000,
          emissiveIntensity: 0.0,
        });
        const ovaryMat = new THREE.MeshStandardMaterial({
          color: 0x881111,
          roughness: 0.6,
          emissive: 0x000000,
          emissiveIntensity: 0.0,
        });

        // Fallopian tubes (Trompas de Falopio - CylinderGeometry)
        const tubeRadius = 0.005 * fSizeMultiplier;
        const tubeLen = 0.038 * fSizeMultiplier;
        const tubeGeom = new THREE.CylinderGeometry(tubeRadius, tubeRadius, tubeLen, 12, 1);

        const leftTubeMesh = new THREE.Mesh(tubeGeom, fallopianMat);
        leftTubeMesh.position.set(-0.030 * fSizeMultiplier, 0.018, 0);
        leftTubeMesh.rotation.z = Math.PI / 2 - 0.25;
        uterusGroup.add(leftTubeMesh);

        const rightTubeMesh = new THREE.Mesh(tubeGeom, fallopianMat);
        rightTubeMesh.position.set(0.030 * fSizeMultiplier, 0.018, 0);
        rightTubeMesh.rotation.z = -(Math.PI / 2 - 0.25);
        uterusGroup.add(rightTubeMesh);

        // Ovaries (Ovarios - SphereGeometry)
        const ovaryRadius = 0.011 * fSizeMultiplier;
        const ovaryGeom = new THREE.SphereGeometry(ovaryRadius, 16, 16);

        const leftOvary = new THREE.Mesh(ovaryGeom, ovaryMat);
        leftOvary.position.set(-0.052 * fSizeMultiplier, 0.020, 0);
        leftOvary.scale.set(1.2, 0.9, 1.0); // Smooth oval sphere
        uterusGroup.add(leftOvary);

        const rightOvary = new THREE.Mesh(ovaryGeom, ovaryMat);
        rightOvary.position.set(0.052 * fSizeMultiplier, 0.020, 0);
        rightOvary.scale.set(1.2, 0.9, 1.0); // Smooth oval sphere
        uterusGroup.add(rightOvary);

        uterusGroup.renderOrder = 0;
        genitalGroup.add(uterusGroup);

        pelvis.voxelBlocks.push({
          id: 'genital_female_canal_tube',
          localPos: fCanalMesh.position.clone(),
          size: [fTubeW, fTubeLength, fTubeD],
          color: 0xf472b6,
          originalColor: 0xf472b6,
          active: true,
          mesh: fCanalMesh,
          isContour: false,
          isGenitalBlock: true,
          isOrganBlock: true,
          gridIndex: [0, 0, 0],
        });

        pelvis.voxelBlocks.push({
          id: 'genital_female_uterus',
          localPos: new THREE.Vector3(0, 0.08, 0.012),
          size: [0.07 * fSizeMultiplier, 0.07 * fSizeMultiplier, 0.05 * fSizeMultiplier],
          color: 0xf43f5e,
          originalColor: 0xf43f5e,
          active: true,
          mesh: uterusBodyMesh,
          isContour: false,
          isGenitalBlock: true,
          isOrganBlock: true,
          gridIndex: [0, 0, 0],
        });

        // Carve out / remove pelvis voxel blocks along female internal vaginal canal & pink entrance going inward ("falta de bloques en la parte rosa hacia adentro")
        const fTubeStart = new THREE.Vector3(0, fTubeStartY * reproScale, 0.10 + (fTubeStartZ - 0.10) * reproScale);
        const fTubeEnd = new THREE.Vector3(0, fTubeEndY * reproScale, 0.10 + (fTubeEndZ - 0.10) * reproScale);
        pelvis.voxelBlocks = pelvis.voxelBlocks.filter((b) => {
          if (b.isGenitalBlock || b.isAnusBlock) return true;
          const dist = distToSegment(b.localPos, fTubeStart, fTubeEnd);
          if (dist < 0.042 * fSizeMultiplier * reproScale) {
            if (b.mesh) {
              pelvis.voxelsGroup.remove(b.mesh);
              b.mesh.geometry?.dispose();
            }
            return false;
          }
          return true;
        });
      }

      genitalGroup.traverse((c) => forceAnatomySkinVertexColors(c, bodySkinColor));
      pelvis.voxelsGroup.add(genitalGroup);
    }
  }

  // Update anus position and blocks to adjust for genital status
  updateRagdollAnus(ragdoll);

  updateRagdollSphericalContour(ragdoll, ragdoll.sphericalContourLevel);
}

export function updateRagdollAnus(ragdoll: Ragdoll3D) {
  const pelvis = ragdoll.particles.find((p) => p.name === 'pelvis');
  if (!pelvis || !pelvis.voxelsGroup) return;

  if (!pelvis.voxelBlocks) pelvis.voxelBlocks = [];

  // Remove old anus group from pelvis.voxelsGroup and dispose
  const oldAnusGroup = pelvis.voxelsGroup.getObjectByName('AnusExtraGroup') as THREE.Group | undefined;
  if (oldAnusGroup) {
    pelvis.voxelsGroup.remove(oldAnusGroup);
    oldAnusGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    });
  }

  // Remove old anus blocks from pelvis.voxelBlocks
  pelvis.voxelBlocks = pelvis.voxelBlocks.filter((b) => !b.isAnusBlock);

  // If genitals are enabled (genitalType is not none), render the anus and its pink tube
  if (ragdoll.genitalType && ragdoll.genitalType !== 'none') {
    const anusGroup = new THREE.Group();
    anusGroup.name = 'AnusExtraGroup';

    const reproScale = 0.2 + 2.3 * (((ragdoll as any).reproduction ?? 50) / 100);
    // Keep group scale at 1.0, scale children instead to avoid detaching from pelvis
    anusGroup.scale.set(1.0, 1.0, 1.0);

    // Compute anus position: nestled exactly below/behind the glutes (or inferior pelvis floor if no glutes)
    const hasGlutes = !!ragdoll.hasBustAndGlutes;
    const reproAnusY = hasGlutes 
      ? (-0.01 - 0.09 * reproScale) 
      : (-0.09 * reproScale);
    const reproAnusZ = hasGlutes 
      ? (-0.10 - 0.045 * reproScale) 
      : (-0.10 * reproScale);

    // 1. Create Pink Tube ("tubo rosa") connecting pelvis internal center straight down to the anus
    const startPos = new THREE.Vector3(0, 0.05, -0.02);
    const reproStartPos = new THREE.Vector3(0, 0.05 * reproScale, -0.10 + (-0.02 - (-0.10)) * reproScale);
    const reproEndPos = new THREE.Vector3(0, reproAnusY, reproAnusZ);
    const distance = reproStartPos.distanceTo(reproEndPos);

    const tubeW = 0.016;
    const tubeD = 0.016;
    const tubeWScaled = tubeW * reproScale;
    const tubeDScaled = tubeD * reproScale;
    const tubeGeom = createHollowBoxGeometry(tubeWScaled, tubeDScaled, tubeWScaled * 0.6, tubeDScaled * 0.6, distance);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6, // Pink
      roughness: 0.35,
      emissive: 0xdb2777,
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide,
    });
    const tubeMesh = new THREE.Mesh(tubeGeom, tubeMat);
    tubeMesh.position.copy(reproStartPos).add(reproEndPos).multiplyScalar(0.5);

    const dir = new THREE.Vector3().subVectors(reproEndPos, reproStartPos).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
    tubeMesh.quaternion.copy(q);
    tubeMesh.name = 'anus_pink_tube';
    applyInternalAnatomyPainting(tubeMesh, {
      innerColorHex: 0x701a2b,
      outerRimColorHex: 0xdb2777,
      isPassThroughTube: true,
    });
    anusGroup.add(tubeMesh);

    // Register pink tube as physical organ block
    pelvis.voxelBlocks.push({
      id: 'anatomy_anus_pink_tube_block',
      localPos: tubeMesh.position.clone(),
      size: [tubeW * reproScale, distance, tubeD * reproScale],
      color: 0xf472b6,
      originalColor: 0xf43f5e,
      active: true,
      mesh: tubeMesh,
      isContour: false,
      isGenitalBlock: false,
      isAnusBlock: true,
      isOrganBlock: true,
      gridIndex: [0, 0, 0],
    });

    // 2. Create Anus made of blocks in horizontal XZ plane with central downward hole
    const step = 0.015;
    const blockW = 0.013;
    const blockH = 0.013;
    const blockD = 0.013;

    for (let ix = -1; ix <= 1; ix++) {
      for (let iz = -1; iz <= 1; iz++) {
        // Leave central downward hole but register it as an inactive block with precise paint hole cavity
        if (ix === 0 && iz === 0) {
          const lx = 0;
          const ly = reproAnusY;
          const lz = reproAnusZ;
          const missingBlock: LimbVoxelBlock = {
            id: `anatomy_anus_sphincter_voxel_0_0_missing`,
            localPos: new THREE.Vector3(lx, ly, lz),
            size: [blockW * reproScale, blockH * reproScale, blockD * reproScale],
            color: 0x7f1d1d,
            originalColor: 0x7f1d1d,
            active: false,
            mesh: undefined,
            isContour: false,
            isGenitalBlock: false,
            isAnusBlock: true,
            gridIndex: [0, 0, 0]
          };
          pelvis.voxelBlocks.push(missingBlock);
          continue;
        }

        const lx = ix * step * reproScale;
        const ly = reproAnusY;
        const lz = reproAnusZ + iz * step * reproScale;

        const blockGeom = new THREE.BoxGeometry(blockW, blockH, blockD);
        const blockMat = new THREE.MeshStandardMaterial({
          color: 0x7f1d1d,
          roughness: 0.6,
          metalness: 0.05,
        });
        const blockMesh = new THREE.Mesh(blockGeom, blockMat);
        blockMesh.position.set(lx, ly, lz);
        blockMesh.scale.set(reproScale, reproScale, reproScale);
        blockMesh.renderOrder = 24;
        blockMesh.name = `anus_voxel_mesh_${ix}_${iz}`;
        blockMesh.visible = !ragdoll.contourLayerEnabled;
        applyInternalAnatomyPainting(blockMesh, {
          innerColorHex: 0x701a2b,
          outerRimColorHex: 0x9d174d,
          entrancePos: new THREE.Vector3(0, ly, reproAnusZ),
          entranceRadius: step * 1.5 * reproScale,
        });
        anusGroup.add(blockMesh);

        pelvis.voxelBlocks.push({
          id: `anatomy_anus_sphincter_voxel_${ix}_${iz}`,
          localPos: new THREE.Vector3(lx, ly, lz),
          size: [blockW * reproScale, blockH * reproScale, blockD * reproScale],
          color: 0x7f1d1d,
          originalColor: 0x7f1d1d,
          active: true,
          mesh: blockMesh,
          isContour: false,
          isGenitalBlock: false,
          isAnusBlock: true,
          gridIndex: [ix + 1, iz + 1, 0],
        });
      }
    }

    // Carve out / remove pelvis voxel blocks along anus pink rectal tube going inward ("falta de bloques para ano por sus tubos internos")
    pelvis.voxelBlocks = pelvis.voxelBlocks.filter((b) => {
      if (b.isGenitalBlock || b.isAnusBlock) return true;
      const dist = distToSegment(b.localPos, reproStartPos, reproEndPos);
      if (dist < 0.038 * reproScale) {
        if (b.mesh) {
          pelvis.voxelsGroup.remove(b.mesh);
          b.mesh.geometry?.dispose();
        }
        return false;
      }
      return true;
    });

    pelvis.voxelsGroup.add(anusGroup);
  }
}

/**
 * Updates the visual state of the male erection (rotation and scale)
 */
export function updateRagdollErection(ragdoll: Ragdoll3D, _jitter: number = 0) {
  const pelvis = ragdoll.particles.find((p) => p.name === 'pelvis');
  if (pelvis && pelvis.voxelsGroup) {
    const pivot = pelvis.voxelsGroup.getObjectByName('ErectionPivotGroup') as THREE.Group | undefined;
    if (pivot) {
      // Scale: growth from 100% to 150% with erection
      const scaleVal = 1.0 + 0.5 * (ragdoll.erectionLevel || 0);
      pivot.scale.set(scaleVal, scaleVal, scaleVal);
    }
  }
}

export function toggleRagdollRamps(_ragdoll: Ragdoll3D, _enabled?: boolean): boolean {
  return false;
}

export const SHIRT_BODY_PARTS = new Set<string>([
  'pechobase',
  'pecho_bajo',
  'torso',
  'ombligo',
  'ombligo_bajo',
  'hombro_izq',
  'hombro_der',
  'brazo_izq',
  'brazo_der',
  'codo_izq',
  'codo_der',
  'antebrazo_izq',
  'antebrazo_der',
]);

/**
 * Applies or removes the outer Shirt (Camisa) voxel layer and its dedicated pseudo-3D contour
 * on pechobase, torso, ombligo, hombros, brazos, codos, antebrazos.
 * The shirt is a hollow outer shell of voxels placed over the body blocks with its own pseudo contour.
 */
export function applyShirtToRagdoll(
  ragdoll: Ragdoll3D,
  enabled: boolean,
  shirtColorHex?: number
) {
  ragdoll.hasShirt = enabled;
  if (shirtColorHex !== undefined) {
    ragdoll.shirtColorHex = shirtColorHex;
  }
  const effectiveShirtColor = ragdoll.shirtColorHex ?? shirtColorHex ?? 0x38bdf8;
  ragdoll.shirtColorHex = effectiveShirtColor;
  const skinColor = getRagdollSkinColor(ragdoll);
  const activeColor = enabled ? effectiveShirtColor : skinColor;

  for (const p of ragdoll.particles) {
    if (!SHIRT_BODY_PARTS.has(p.name)) continue;

    // 1. Remove duplicate shirt clone blocks
    if (p.voxelBlocks) {
      for (let i = p.voxelBlocks.length - 1; i >= 0; i--) {
        const b = p.voxelBlocks[i];
        if (b.id.includes('_shirt_clone')) {
          if (b.mesh) {
            b.mesh.visible = false;
            p.voxelsGroup?.remove(b.mesh);
            if (b.mesh.geometry) b.mesh.geometry.dispose();
          }
          p.voxelBlocks.splice(i, 1);
        }
      }
    }

    // 2. Remove any old duplicate shirt contour mesh envelope
    const existingShirtContour = p.mesh?.getObjectByName('ShirtContourEnvelope');
    if (existingShirtContour && p.mesh) {
      p.mesh.remove(existingShirtContour);
      if (existingShirtContour instanceof THREE.Mesh && existingShirtContour.geometry) {
        existingShirtContour.geometry.dispose();
      }
    }

    const colToUse = activeColor;
    const isShirtToUse = enabled;

    // 3. Directly update limb's original contour mesh to shirt color or skin color!
    if (p.contourMesh && p.contourMesh instanceof THREE.Mesh) {
      p.contourMesh.userData.baseColor = colToUse;
      p.contourMesh.userData.isShirt = isShirtToUse;
      if (p.contourMesh.geometry && p.contourMesh.geometry.attributes.color) {
        const colorAttr = p.contourMesh.geometry.attributes.color;
        const col = new THREE.Color(colToUse).convertSRGBToLinear();
        for (let ci = 0; ci < colorAttr.count; ci++) {
          colorAttr.setXYZ(ci, col.r, col.g, col.b);
        }
        colorAttr.needsUpdate = true;
      }
      if (p.contourMesh.material) {
        const mat = Array.isArray(p.contourMesh.material) ? p.contourMesh.material[0] : p.contourMesh.material;
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.color.setHex(0xffffff);
          mat.vertexColors = true;
          mat.needsUpdate = true;
        }
      }
      applySphericalMorph(p.contourMesh, ragdoll.sphericalContourLevel, p, ragdoll);
    }

    // 4. Directly update the extremity's surface voxel blocks to match shirt color or skin color!
    if (p.voxelBlocks) {
      for (const b of p.voxelBlocks) {
        if (b.isBoneBlock || b.isOrganBlock) continue;
        // Skip genital, breast, glute, or nipple blocks so they always retain skin color!
        if (
          b.isGenitalBlock ||
          b.id.startsWith('genital_') ||
          b.id.includes('labia') ||
          b.id.includes('testicle') ||
          b.id.includes('shaft') ||
          b.id.includes('glans') ||
          b.id.includes('glute') ||
          b.id.includes('gluteo') ||
          b.id.includes('breast') ||
          b.id.includes('pecho') ||
          b.id.includes('nipple') ||
          b.id.includes('tetilla')
        ) {
          continue;
        }
        b.color = colToUse;
        b.originalColor = colToUse;
        b.isShirtBlock = isShirtToUse;
        if (b.mesh) {
          const mat = Array.isArray(b.mesh.material) ? b.mesh.material[0] : b.mesh.material;
          if (mat instanceof THREE.MeshStandardMaterial) {
            if (mat.vertexColors) {
              mat.color.setHex(0xffffff);
              if (b.mesh.geometry && b.mesh.geometry.attributes.color) {
                const colorAttr = b.mesh.geometry.attributes.color;
                const col = new THREE.Color(colToUse).convertSRGBToLinear();
                for (let i = 0; i < colorAttr.count; i++) {
                  colorAttr.setXYZ(i, col.r, col.g, col.b);
                }
                colorAttr.needsUpdate = true;
              }
            } else {
              mat.color.setHex(colToUse);
            }
            mat.needsUpdate = true;
          }
        }
      }
    }
  }

  // Synchronize breasts with shirt toggle
  if (ragdoll.hasBustAndGlutes) {
    updateRagdollBustAndGlutes(ragdoll, true);
  }

  // Update jointBridges and jointSpheres colors to match clothing in their respective body zones
  if (ragdoll.jointBridges) {
    for (const bridge of ragdoll.jointBridges) {
      const c = bridge.userData.constraint;
      if (!c) continue;
      const isShirtBridge = SHIRT_BODY_PARTS.has(c.p1.name) && SHIRT_BODY_PARTS.has(c.p2.name);
      const isPantsBridge = ragdoll.hasPants && PANTS_BODY_PARTS.has(c.p1.name) && PANTS_BODY_PARTS.has(c.p2.name);
      const strBridge = (c.name + '_' + c.p1.name + '_' + c.p2.name).toLowerCase();
      const isInternal = (
        strBridge.includes('canal') ||
        strBridge.includes('uterus') ||
        strBridge.includes('utero') ||
        strBridge.includes('ovary') ||
        strBridge.includes('ovario')
      );
      if (bridge.material && (bridge.material as THREE.MeshStandardMaterial).color) {
        if (isInternal) {
          (bridge.material as THREE.MeshStandardMaterial).color.setHex(0xf43f5e);
        } else if (enabled && isShirtBridge) {
          (bridge.material as THREE.MeshStandardMaterial).color.setHex(shirtColorHex);
        } else if (isPantsBridge) {
          (bridge.material as THREE.MeshStandardMaterial).color.setHex(ragdoll.pantsColorHex || 0x1e3a8a);
        } else {
          (bridge.material as THREE.MeshStandardMaterial).color.setHex(skinColor);
        }
      }
    }
  }

  if (ragdoll.jointSpheres) {
    for (const sphere of ragdoll.jointSpheres) {
      const p = sphere.userData.particle;
      if (!p) continue;
      const col = new THREE.Color(skinColor);
      const strP = p.name.toLowerCase();
      const isInternal = (
        strP.includes('canal') ||
        strP.includes('uterus') ||
        strP.includes('utero') ||
        strP.includes('ovary') ||
        strP.includes('ovario')
      );
      if (isInternal) {
        col.setHex(0xf43f5e);
      } else if (enabled && SHIRT_BODY_PARTS.has(p.name)) {
        col.setHex(shirtColorHex);
      } else if (ragdoll.hasPants && PANTS_BODY_PARTS.has(p.name)) {
        col.setHex(ragdoll.pantsColorHex || 0x1e3a8a);
      } else {
        col.setHex(skinColor);
      }
      if (sphere.material && (sphere.material as THREE.MeshStandardMaterial).color) {
        (sphere.material as THREE.MeshStandardMaterial).color.copy(col);
      }
    }
  }

  // 3. Remove any residual Blanket Mesh (Aro/Manta)
  if (ragdoll.shirtBlanket) {
    ragdoll.groupMesh.remove(ragdoll.shirtBlanket.mesh);
    if (ragdoll.shirtBlanket.mesh.geometry) ragdoll.shirtBlanket.mesh.geometry.dispose();
    if (ragdoll.shirtBlanket.mesh.material instanceof THREE.Material) ragdoll.shirtBlanket.mesh.material.dispose();
    ragdoll.shirtBlanket = undefined;
  }
}

export const PANTS_BODY_PARTS = new Set<string>([
  'pelvis',
  'muslo_izq',
  'muslo_der',
  'rodilla_izq',
  'rodilla_der',
  'antepierna_izq',
  'antepierna_der',
]);

const UNDERWEAR_BODY_PARTS = new Set<string>([
  'pelvis',
  'ombligo_bajo',
]);

const UNDERWEAR_BRA_PARTS = new Set<string>([
  'pechobase',
]);

const GLOVES_BODY_PARTS = new Set<string>([
  'antebrazo_izq',
  'antebrazo_der',
  'muneca_izq',
  'muneca_der',
  'mano_izq',
  'mano_der',
  'dedo_pulgar_izq',
  'dedo_pulgar_der',
  'dedo_indice_izq',
  'dedo_indice_der',
]);

const BOOTS_BODY_PARTS = new Set<string>([
  'tobillo_izq',
  'tobillo_der',
  'pie_izq',
  'pie_der',
  'pie_izq_talon',
  'pie_der_talon',
]);

const SOCKS_BODY_PARTS = new Set<string>([
  'tobillo_izq',
  'tobillo_der',
  'pie_izq',
  'pie_der',
]);

export function applyClothingOverlayToLimb(
  p: Particle3D,
  envelopeName: string,
  enabled: boolean,
  colorHex: number,
  sphericalLevel: number,
  contourLayerEnabled: boolean,
  scaleFactor: number = 1.04
) {
  if (!p.mesh) return;

  // 1. Remove existing envelope if present
  const existingEnvelope = p.mesh.getObjectByName(envelopeName);
  if (existingEnvelope) {
    p.mesh.remove(existingEnvelope);
    if (existingEnvelope instanceof THREE.Mesh && existingEnvelope.geometry) {
      existingEnvelope.geometry.dispose();
    }
  }

  if (!enabled) return;

  const w = (p.boxDims ? p.boxDims[0] : p.radius * 2) * scaleFactor;
  const h = (p.boxDims ? p.boxDims[1] : p.radius * 2) * scaleFactor;
  const d = (p.boxDims ? p.boxDims[2] : p.radius * 2) * scaleFactor;

  // Build clothing clone envelope mesh
  const clothingMesh = createPseudo3DContourMesh(
    p.name,
    w,
    h,
    d,
    sphericalLevel,
    colorHex
  );
  clothingMesh.name = envelopeName;
  clothingMesh.userData.voxelBlocks = p.voxelBlocks;
  clothingMesh.visible = contourLayerEnabled;
  p.mesh.add(clothingMesh);
}

export function applyPantsToRagdoll(ragdoll: Ragdoll3D, enabled: boolean, pantsColorHex?: number) {
  ragdoll.hasPants = enabled;
  if (pantsColorHex !== undefined) {
    ragdoll.pantsColorHex = pantsColorHex;
  }
  const effectivePantsColor = ragdoll.pantsColorHex ?? pantsColorHex ?? 0x1e3a8a;
  ragdoll.pantsColorHex = effectivePantsColor;
  const skinColor = getRagdollSkinColor(ragdoll);
  const activeColor = enabled ? effectivePantsColor : skinColor;

  for (const p of ragdoll.particles) {
    if (!PANTS_BODY_PARTS.has(p.name)) continue;

    // 1. Remove duplicate pants clone blocks
    if (p.voxelBlocks) {
      for (let i = p.voxelBlocks.length - 1; i >= 0; i--) {
        const b = p.voxelBlocks[i];
        if (b.id.includes('_pants_clone')) {
          if (b.mesh) {
            b.mesh.visible = false;
            p.voxelsGroup?.remove(b.mesh);
            if (b.mesh.geometry) b.mesh.geometry.dispose();
          }
          p.voxelBlocks.splice(i, 1);
        }
      }
    }

    // 2. Remove existing dedicated pants contour mesh if present
    const existingPantsContour = p.mesh?.getObjectByName('PantsContourEnvelope');
    if (existingPantsContour && p.mesh) {
      p.mesh.remove(existingPantsContour);
      if (existingPantsContour instanceof THREE.Mesh && existingPantsContour.geometry) {
        existingPantsContour.geometry.dispose();
      }
    }

    const colToUse = activeColor;
    const isPantsToUse = enabled;

    // 3. Directly update limb's original contour mesh to pants color or skin color!
    if (p.contourMesh && p.contourMesh instanceof THREE.Mesh) {
      p.contourMesh.userData.baseColor = colToUse;
      p.contourMesh.userData.isPants = isPantsToUse;
      if (p.contourMesh.geometry && p.contourMesh.geometry.attributes.color) {
        const colorAttr = p.contourMesh.geometry.attributes.color;
        const col = new THREE.Color(colToUse).convertSRGBToLinear();
        for (let ci = 0; ci < colorAttr.count; ci++) {
          colorAttr.setXYZ(ci, col.r, col.g, col.b);
        }
        colorAttr.needsUpdate = true;
      }
      if (p.contourMesh.material) {
        const mat = Array.isArray(p.contourMesh.material) ? p.contourMesh.material[0] : p.contourMesh.material;
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.color.setHex(0xffffff);
          mat.vertexColors = true;
          mat.needsUpdate = true;
        }
      }
      applySphericalMorph(p.contourMesh, ragdoll.sphericalContourLevel, p, ragdoll);
    }

    // 4. Directly update the extremity's surface voxel blocks to match pants color or skin color!
    if (p.voxelBlocks) {
      for (const b of p.voxelBlocks) {
        if (b.isBoneBlock || b.isOrganBlock) continue;
        // Skip genital, breast, glute, or nipple blocks so they always retain skin color!
        if (
          b.isGenitalBlock ||
          b.id.startsWith('genital_') ||
          b.id.includes('labia') ||
          b.id.includes('testicle') ||
          b.id.includes('shaft') ||
          b.id.includes('glans') ||
          b.id.includes('glute') ||
          b.id.includes('gluteo') ||
          b.id.includes('breast') ||
          b.id.includes('pecho') ||
          b.id.includes('nipple') ||
          b.id.includes('tetilla')
        ) {
          continue;
        }
        b.color = colToUse;
        b.originalColor = colToUse;
        b.isPantsBlock = isPantsToUse;
        if (b.mesh) {
          const mat = Array.isArray(b.mesh.material) ? b.mesh.material[0] : b.mesh.material;
          if (mat instanceof THREE.MeshStandardMaterial) {
            if (mat.vertexColors) {
              mat.color.setHex(0xffffff);
              if (b.mesh.geometry && b.mesh.geometry.attributes.color) {
                const colorAttr = b.mesh.geometry.attributes.color;
                const col = new THREE.Color(colToUse).convertSRGBToLinear();
                for (let i = 0; i < colorAttr.count; i++) {
                  colorAttr.setXYZ(i, col.r, col.g, col.b);
                }
                colorAttr.needsUpdate = true;
              }
            } else {
              mat.color.setHex(colToUse);
            }
            mat.needsUpdate = true;
          }
        }
      }
    }
  }

  // Synchronize glutes with pants toggle
  if (ragdoll.hasBustAndGlutes) {
    updateRagdollBustAndGlutes(ragdoll, true);
  }

  // Update jointBridges and jointSpheres colors to match clothing in their respective body zones
  if (ragdoll.jointBridges) {
    for (const bridge of ragdoll.jointBridges) {
      const c = bridge.userData.constraint;
      if (!c) continue;
      const isPantsBridge = PANTS_BODY_PARTS.has(c.p1.name) && PANTS_BODY_PARTS.has(c.p2.name);
      const isShirtBridge = SHIRT_BODY_PARTS.has(c.p1.name) && SHIRT_BODY_PARTS.has(c.p2.name);
      const strBridge = (c.name + '_' + c.p1.name + '_' + c.p2.name).toLowerCase();
      const isInternal = (
        strBridge.includes('canal') ||
        strBridge.includes('uterus') ||
        strBridge.includes('utero') ||
        strBridge.includes('ovary') ||
        strBridge.includes('ovario')
      );
      if (bridge.material && (bridge.material as THREE.MeshStandardMaterial).color) {
        if (isInternal) {
          (bridge.material as THREE.MeshStandardMaterial).color.setHex(0xf43f5e);
        } else if (enabled && isPantsBridge) {
          (bridge.material as THREE.MeshStandardMaterial).color.setHex(pantsColorHex);
        } else if (ragdoll.hasShirt && isShirtBridge) {
          (bridge.material as THREE.MeshStandardMaterial).color.setHex(ragdoll.shirtColorHex || 0x475569);
        } else {
          (bridge.material as THREE.MeshStandardMaterial).color.setHex(skinColor);
        }
      }
    }
  }

  if (ragdoll.jointSpheres) {
    for (const sphere of ragdoll.jointSpheres) {
      const p = sphere.userData.particle;
      if (!p) continue;
      const col = new THREE.Color(skinColor);
      const strP = p.name.toLowerCase();
      const isInternal = (
        strP.includes('canal') ||
        strP.includes('uterus') ||
        strP.includes('utero') ||
        strP.includes('ovary') ||
        strP.includes('ovario')
      );
      if (isInternal) {
        col.setHex(0xf43f5e);
      } else if (enabled && PANTS_BODY_PARTS.has(p.name)) {
        col.setHex(pantsColorHex);
      } else if (ragdoll.hasShirt && SHIRT_BODY_PARTS.has(p.name)) {
        col.setHex(ragdoll.shirtColorHex || 0x38bdf8);
      } else {
        col.setHex(skinColor);
      }
      if (sphere.material && (sphere.material as THREE.MeshStandardMaterial).color) {
        (sphere.material as THREE.MeshStandardMaterial).color.copy(col);
      }
    }
  }
}

export function applyUnderwearToRagdoll(ragdoll: Ragdoll3D, enabled: boolean, underwearColorHex: number = 0xffffff) {
  ragdoll.hasUnderwear = enabled;
  ragdoll.underwearColorHex = underwearColorHex;
  for (const p of ragdoll.particles) {
    const isUnderwearLimb = UNDERWEAR_BODY_PARTS.has(p.name) || (ragdoll.hasBustAndGlutes && UNDERWEAR_BRA_PARTS.has(p.name));
    if (isUnderwearLimb) {
      applyClothingOverlayToLimb(p, 'UnderwearContourEnvelope', enabled, underwearColorHex, ragdoll.sphericalContourLevel, ragdoll.contourLayerEnabled, 1.025);
    } else {
      // Remove any leftover underwear mesh if disabled or not applicable
      const existing = p.voxelsGroup?.getObjectByName('UnderwearContourEnvelope');
      if (existing && p.voxelsGroup) p.voxelsGroup.remove(existing);
    }
  }
}

export function applyGlovesToRagdoll(ragdoll: Ragdoll3D, enabled: boolean, glovesColorHex: number = 0x0f172a) {
  ragdoll.hasGloves = enabled;
  ragdoll.glovesColorHex = glovesColorHex;
  for (const p of ragdoll.particles) {
    if (GLOVES_BODY_PARTS.has(p.name)) {
      applyClothingOverlayToLimb(p, 'GlovesContourEnvelope', enabled, glovesColorHex, ragdoll.sphericalContourLevel, ragdoll.contourLayerEnabled, 1.06);
    }
  }
}

export function applyBootsToRagdoll(ragdoll: Ragdoll3D, enabled: boolean, bootsColorHex: number = 0x0f172a) {
  ragdoll.hasBoots = enabled;
  ragdoll.bootsColorHex = bootsColorHex;
  for (const p of ragdoll.particles) {
    if (BOOTS_BODY_PARTS.has(p.name)) {
      applyClothingOverlayToLimb(p, 'BootsContourEnvelope', enabled, bootsColorHex, ragdoll.sphericalContourLevel, ragdoll.contourLayerEnabled, 1.07);
    }
  }
}

export function applySocksToRagdoll(ragdoll: Ragdoll3D, enabled: boolean, socksColorHex: number = 0xffffff) {
  ragdoll.hasSocks = enabled;
  ragdoll.socksColorHex = socksColorHex;
  for (const p of ragdoll.particles) {
    if (SOCKS_BODY_PARTS.has(p.name)) {
      applyClothingOverlayToLimb(p, 'SocksContourEnvelope', enabled, socksColorHex, ragdoll.sphericalContourLevel, ragdoll.contourLayerEnabled, 1.02);
    }
  }
}

export function applyAllClothingToRagdoll(ragdoll: Ragdoll3D) {
  if (!ragdoll) return;
  if (ragdoll.hasShirt !== undefined) applyShirtToRagdoll(ragdoll, ragdoll.hasShirt, ragdoll.shirtColorHex);
  if (ragdoll.hasPants !== undefined) applyPantsToRagdoll(ragdoll, ragdoll.hasPants, ragdoll.pantsColorHex);
  if (ragdoll.hasUnderwear !== undefined) applyUnderwearToRagdoll(ragdoll, ragdoll.hasUnderwear, ragdoll.underwearColorHex);
  if (ragdoll.hasGloves !== undefined) applyGlovesToRagdoll(ragdoll, ragdoll.hasGloves, ragdoll.glovesColorHex);
  if (ragdoll.hasBoots !== undefined) applyBootsToRagdoll(ragdoll, ragdoll.hasBoots, ragdoll.bootsColorHex);
  if (ragdoll.hasSocks !== undefined) applySocksToRagdoll(ragdoll, ragdoll.hasSocks, ragdoll.socksColorHex);
  if (ragdoll.genitalType && ragdoll.genitalType !== 'none') {
    updateRagdollGenitals(ragdoll, ragdoll.genitalType);
  }
  if (ragdoll.hasBustAndGlutes) {
    updateRagdollBustAndGlutes(ragdoll, true);
  }
}

/**
 * Creates an aggressive Undead Zombie NPC with rotten green flesh, torn bloody clothes,
 * open jaw and sharp teeth ("boca y dientes"), and hunting/biting AI logic.
 */
export function createZombieRagdoll3D(
  spawnX: number = 0,
  spawnY: number = 0,
  spawnZ: number = 0,
  scene?: THREE.Scene,
  initialVoxelShape: 'cube' | 'sphere' = 'cube'
): Ragdoll3D {
  const zombieSkinColor = 0x65a30d; // Rotten green zombie skin
  const zombieMat = new THREE.MeshStandardMaterial({
    color: zombieSkinColor,
    roughness: 0.8,
    metalness: 0.05,
  });

  const zombie = createArticulatedRagdoll3D(
    spawnX,
    spawnY,
    spawnZ,
    1.0,
    scene,
    80,
    true,
    zombieMat,
    'Zombie Voraz',
    initialVoxelShape
  );

  zombie.isZombie = true;
  zombie.skinColorHex = zombieSkinColor;
  zombie.shirtColorHex = 0x450a0a; // Ripped bloody dark red shirt
  zombie.pantsColorHex = 0x1f2937; // Tattered dark trousers
  zombie.zombieBiteCooldown = 0;

  // Apply shirt and colors
  applyShirtToRagdoll(zombie, true, 0x450a0a);

  // Anatomy setup
  if (Math.random() < 0.5) {
    updateRagdollBustAndGlutes(zombie, true);
    updateRagdollGenitals(zombie, 'female');
  } else {
    updateRagdollBustAndGlutes(zombie, true);
    updateRagdollGenitals(zombie, 'male');
  }

  return zombie;
}

/**
 * Creates a stationary organism composed of 3 Tentacles (5 segments each, uniform color)
 * rooted in a central Dirt Pit ("pozo de tierra") made of destructible dirt voxel blocks
 * and its own earthen pseudo-3D contour envelope.
 */
export function createTentacleRagdoll3D(
  spawnX: number = 0,
  spawnY: number = 0,
  spawnZ: number = 0,
  scale: number = 1.0,
  scene?: THREE.Scene,
  initialSphericalContour: number = 85,
  contourEnabled: boolean = true,
  initialVoxelShape: 'cube' | 'sphere' = 'cube'
): Ragdoll3D {
  const id = 'tentacle_pit_' + Math.random().toString(36).substring(2, 9);
  const particles: Particle3D[] = [];
  const constraints: Constraint3D[] = [];

  const groupMesh = new THREE.Group();
  groupMesh.name = id;

  // 1. POZO DE TIERRA (Dirt Pit Base made of dirt/stone blocks covered neatly by pseudo-3D layer)
  const dirtColor = 0x5c3d2e; // Dark brown earth
  const pitWidth = 1.35 * scale;
  const pitHeight = 0.32 * scale;
  const pitDepth = 1.35 * scale;

  const pitCarrierMesh = new THREE.Group();
  pitCarrierMesh.name = `Carrier_pozo_tierra`;
  pitCarrierMesh.position.set(spawnX, spawnY + pitHeight / 2, spawnZ);
  groupMesh.add(pitCarrierMesh);

  // Build dirt pit multi-voxel blocks (crater ring)
  const pitVoxelsGroup = new THREE.Group();
  pitVoxelsGroup.name = 'VoxelsGroup_pozo_tierra';
  const pitVoxelBlocks: LimbVoxelBlock[] = [];

  const nx = 4;
  const ny = 2;
  const nz = 4;
  const vxW = pitWidth / nx;
  const vxH = pitHeight / ny;
  const vxD = pitDepth / nz;

  const dirtMat = new THREE.MeshStandardMaterial({
    color: dirtColor,
    roughness: 0.85,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: 3,
    polygonOffsetUnits: 3,
  });

  for (let ix = 0; ix < nx; ix++) {
    for (let iy = 0; iy < ny; iy++) {
      for (let iz = 0; iz < nz; iz++) {
        // Leave center open as a crater hole for tentacles to emerge
        const isCenter = (ix === 1 || ix === 2) && (iz === 1 || iz === 2) && iy === 1;
        if (isCenter) continue;

        const lx = -pitWidth / 2 + (ix + 0.5) * vxW;
        const ly = -pitHeight / 2 + (iy + 0.5) * vxH;
        const lz = -pitDepth / 2 + (iz + 0.5) * vxD;
        const localPos = new THREE.Vector3(lx, ly, lz);

        const geom = initialVoxelShape === 'sphere'
          ? new THREE.SphereGeometry(0.5, 8, 8)
          : new THREE.BoxGeometry(vxW, vxH, vxD);

        // Slightly vary earthen tone
        const blockMat = dirtMat.clone();
        if ((ix + iz) % 2 === 0) {
          blockMat.color.setHex(0x452c1e); // Darker soil
        } else if (iy === ny - 1) {
          blockMat.color.setHex(0x3e4a28); // Mossy grass patches on top
        }

        const mesh = new THREE.Mesh(geom, blockMat);
        mesh.position.copy(localPos);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (initialVoxelShape === 'sphere') {
          mesh.scale.set(vxW * 1.35, vxH * 1.35, vxD * 1.35);
        } else {
          const posAttr = geom.attributes.position;
          const count = posAttr.count;
          const basePositions = new Float32Array(count * 3);
          for (let k = 0; k < count; k++) {
            basePositions[k * 3] = posAttr.getX(k);
            basePositions[k * 3 + 1] = posAttr.getY(k);
            basePositions[k * 3 + 2] = posAttr.getZ(k);
          }
          mesh.userData = { basePositions, w: vxW, h: vxH, d: vxD };
        }

        pitVoxelsGroup.add(mesh);

        pitVoxelBlocks.push({
          id: `pozo_tierra_vx_${ix}_${iy}_${iz}`,
          localPos,
          size: [vxW, vxH, vxD],
          color: dirtColor,
          originalColor: dirtColor,
          active: true,
          mesh,
          isContour: true,
          gridIndex: [ix, iy, iz],
        });
      }
    }
  }

  pitCarrierMesh.add(pitVoxelsGroup);

  // Earthen Pseudo-3D Envelope for the Dirt Pit (neatly wrapping and covering blocks)
  const pitContourMesh = createPseudo3DContourMesh(
    'pozo_tierra',
    pitWidth * 1.02,
    pitHeight * 1.02,
    pitDepth * 1.02,
    initialSphericalContour,
    dirtColor
  );
  pitContourMesh.userData.voxelBlocks = pitVoxelBlocks;
  pitContourMesh.visible = contourEnabled;
  pitCarrierMesh.add(pitContourMesh);

  const pozoParticle: Particle3D = {
    id: `${id}_pozo_tierra`,
    x: spawnX,
    y: spawnY + pitHeight / 2,
    z: spawnZ,
    oldX: spawnX,
    oldY: spawnY + pitHeight / 2,
    oldZ: spawnZ,
    vx: 0,
    vy: 0,
    vz: 0,
    mass: 20.0,
    radius: pitWidth * 0.5,
    pinned: true, // Rooted to the floor: does not walk or slide
    name: 'pozo_tierra',
    parentRagdollId: id,
    health: 400,
    maxHealth: 400,
    fractured: false,
    dismembered: false,
    isVital: false,
    bleedingRate: 0,
    mesh: pitCarrierMesh,
    boxDims: [pitWidth / scale, pitHeight / scale, pitDepth / scale],
    voxelBlocks: pitVoxelBlocks,
    voxelsGroup: pitVoxelsGroup,
    contourMesh: pitContourMesh,
  };
  particles.push(pozoParticle);

  // 2. 3 TENTÁCULOS (Uniform color for all 3 tentacles, 5 slim segments each)
  const uniformTentacleColor = 0x15803d; // Emerald Alien Green (Uniform on all 3 tentacles!)

  function addTentacleSegmentPart(
    name: BodyPartName,
    tentacleIndex: number,
    segIndex: number,
    baseRelX: number,
    relY: number,
    baseRelZ: number,
    width: number,
    height: number,
    depth: number,
    mass: number
  ): Particle3D {
    const px = spawnX + baseRelX * scale;
    const py = spawnY + relY * scale;
    const pz = spawnZ + baseRelZ * scale;

    const w = width * scale;
    const h = height * scale;
    const d = depth * scale;

    const carrierMesh = new THREE.Group();
    carrierMesh.name = `Carrier_${name}`;
    carrierMesh.position.set(px, py, pz);
    groupMesh.add(carrierMesh);

    // Multi-voxel grid (cubes/spheres per segment)
    const { voxelsGroup, voxelBlocks } = createMultiVoxelLimb(
      name,
      w,
      h,
      d,
      uniformTentacleColor,
      initialVoxelShape,
      initialSphericalContour / 100
    );

    // Add Suction Cups ("Ventosas") along the inner face
    const suctionMat = new THREE.MeshStandardMaterial({
      color: 0x166534, // Dark Emerald Green / Natural Earth tone
      emissive: 0x14532d,
      emissiveIntensity: 0.25,
      roughness: 0.5,
      metalness: 0.1,
    });

    const numSuction = segIndex >= 3 ? 1 : 2;
    const suctionSize = Math.max(0.035, w * 0.28);
    for (let s = 0; s < numSuction; s++) {
      const suctionGeom = initialVoxelShape === 'sphere'
        ? new THREE.SphereGeometry(suctionSize * 0.55, 8, 8)
        : new THREE.BoxGeometry(suctionSize, suctionSize * 0.6, suctionSize * 0.4);
      const suctionMesh = new THREE.Mesh(suctionGeom, suctionMat);
      const offsetY = ((s + 0.5) / numSuction - 0.5) * (h * 0.7);
      suctionMesh.position.set(0, offsetY, d * 0.52);
      voxelsGroup.add(suctionMesh);
    }

    voxelsGroup.visible = true;
    carrierMesh.add(voxelsGroup);

    // Pseudo-3D Spherical Contour Envelope Layer with Uniform Tentacle Color
    const contourMesh = createPseudo3DContourMesh(
      name,
      w,
      h,
      d,
      initialSphericalContour,
      uniformTentacleColor
    );
    contourMesh.userData.voxelBlocks = voxelBlocks;
    contourMesh.visible = contourEnabled;
    carrierMesh.add(contourMesh);

    const radius = Math.max(w, h, d) * 0.45;

    const p: Particle3D = {
      id: `${id}_${name}`,
      x: px,
      y: py,
      z: pz,
      oldX: px,
      oldY: py,
      oldZ: pz,
      vx: 0,
      vy: 0,
      vz: 0,
      mass,
      radius,
      pinned: false,
      name,
      parentRagdollId: id,
      health: 150,
      maxHealth: 150,
      fractured: false,
      dismembered: false,
      isVital: segIndex === 0 || segIndex === 4,
      bleedingRate: 0,
      mesh: carrierMesh,
      boxDims: [width, height, depth],
      voxelBlocks,
      voxelsGroup,
      contourMesh,
    };

    particles.push(p);
    return p;
  }

  function addJoint(
    p1: Particle3D,
    p2: Particle3D,
    stiffness: number = 0.95,
    breakForce: number = 2200,
    name: string = ''
  ): Constraint3D {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;

    const c: Constraint3D = {
      id: `${p1.id}_to_${p2.id}`,
      p1,
      p2,
      length: len,
      stiffness,
      breakForce,
      broken: false,
      name: name || `${p1.name}-${p2.name}`,
    };
    constraints.push(c);
    return c;
  }

  // 3 Tentacles at 120-degree radial angles around the dirt pit with slimmer, tapered profiles
  const tentacleRadialAngles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]; // 0°, 120°, 240°
  const tentacleRadius = 0.22;

  for (let t = 1; t <= 3; t++) {
    const angle = tentacleRadialAngles[t - 1];
    const offX = Math.cos(angle) * tentacleRadius;
    const offZ = Math.sin(angle) * tentacleRadius;
    const prefix = `t${t}` as 't1' | 't2' | 't3';

    // 5 Slimmer and MUCH longer Segments per tentacle (mas largos!)
    const s1 = addTentacleSegmentPart(`${prefix}_seg1` as BodyPartName, t, 0, offX, 0.85, offZ, 0.14, 1.15, 0.14, 3.5);
    const s2 = addTentacleSegmentPart(`${prefix}_seg2` as BodyPartName, t, 1, offX * 1.20, 1.90, offZ * 1.20, 0.12, 1.05, 0.12, 3.0);
    const s3 = addTentacleSegmentPart(`${prefix}_seg3` as BodyPartName, t, 2, offX * 1.40, 2.85, offZ * 1.40, 0.10, 0.95, 0.10, 2.4);
    const s4 = addTentacleSegmentPart(`${prefix}_seg4` as BodyPartName, t, 3, offX * 1.60, 3.70, offZ * 1.60, 0.08, 0.85, 0.08, 1.8);
    const s5 = addTentacleSegmentPart(`${prefix}_seg5` as BodyPartName, t, 4, offX * 1.80, 4.45, offZ * 1.80, 0.06, 0.75, 0.06, 1.2);

    // Connect base segment to dirt pit
    addJoint(pozoParticle, s1, 0.98, 3500, `pozo_${prefix}_seg1`);

    // Connect sequential segments 1 -> 2 -> 3 -> 4 -> 5
    addJoint(s1, s2, 0.98, 2600, `${prefix}_seg1_seg2`);
    addJoint(s2, s3, 0.98, 2400, `${prefix}_seg2_seg3`);
    addJoint(s3, s4, 0.98, 2200, `${prefix}_seg3_seg4`);
    addJoint(s4, s5, 0.98, 2000, `${prefix}_seg4_seg5`);

    // Springy stabilizer joints across segments
    addJoint(s1, s3, 0.88, 2800, `${prefix}_seg1_seg3_stab`);
    addJoint(s2, s4, 0.86, 2600, `${prefix}_seg2_seg4_stab`);
    addJoint(s3, s5, 0.84, 2400, `${prefix}_seg3_seg5_stab`);
  }

  if (scene) {
    scene.add(groupMesh);
  }

  const ragdoll: Ragdoll3D = {
    id,
    name: 'Pozo con 3 Tentáculos',
    particles,
    constraints,
    isAlive: true,
    isGrounded: true,
    isJumping: false,
    charPos: new THREE.Vector3(spawnX, spawnY, spawnZ),
    charVel: new THREE.Vector3(0, 0, 0),
    facingAngle: 0,
    walkCycle: 0,
    totalHealth: 450,
    scale,
    isControlled: false,
    groupMesh,
    bustMorphValue: initialSphericalContour,
    rampsEnabled: false,
    hasWeapon: false,
    isAiming: false,
    sphericalContourLevel: initialSphericalContour,
    contourLayerEnabled: contourEnabled,
    contourJointStyle: 'pseudo3d',
    voxelShape: initialVoxelShape,
    erectionLevel: 0,
    isErecting: false,
    isTentacle: true,
    tentacleColorHex: uniformTentacleColor,
    stats: {
      brokenBones: 0,
      dismemberedLimbs: 0,
      bloodLossPercent: 0,
      destroyedBlocks: 0,
    },
  };

  updateRagdollSphericalContour(ragdoll, initialSphericalContour, contourEnabled);

  return ragdoll;
}

// Shared resources for water optimization
let waterGeometry: THREE.SphereGeometry | null = null;
let waterMaterial: THREE.MeshStandardMaterial | null = null;

function getWaterResources() {
  if (!waterGeometry) {
    waterGeometry = new THREE.SphereGeometry(0.125, 8, 8);
  }
  if (!waterMaterial) {
    waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
      metalness: 0.2,
      emissive: 0x0284c7,
      emissiveIntensity: 0.5
    });
  }
  return { geometry: waterGeometry, material: waterMaterial };
}

/**
 * Creates a liquid body composed of multiple cubic blocks with pseudo-3D spherical contours.
 * These blocks can merge visually to form larger liquid volumes.
 */
export function createLiquidBody3D(
  spawnX: number,
  spawnY: number,
  spawnZ: number,
  count: number = 8,
  scene?: THREE.Scene
): LiquidBody3D {
  const id = 'liquid_' + Math.random().toString(36).substring(2, 9);
  const particles: LiquidParticle3D[] = [];
  const groupMesh = new THREE.Group();
  groupMesh.name = id;

  const color = 0x0ea5e9; // Water blue
  const { geometry, material } = getWaterResources();

  for (let i = 0; i < count; i++) {
    // Spawn in a small cluster
    const px = spawnX + (Math.random() - 0.5) * 0.4;
    const py = spawnY + (Math.random() - 0.5) * 0.4;
    const pz = spawnZ + (Math.random() - 0.5) * 0.4;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(px, py, pz);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    groupMesh.add(mesh);

    const radius = 0.125;

    const p: LiquidParticle3D = {
      id: `${id}_p${i}`,
      liquidBodyId: id,
      x: px,
      y: py,
      z: pz,
      oldX: px,
      oldY: py,
      oldZ: pz,
      vx: 0,
      vy: 0,
      vz: 0,
      mass: 0.5,
      radius,
      pinned: false,
      name: 'ombligo',
      parentRagdollId: id,
      health: 100,
      maxHealth: 100,
      fractured: false,
      dismembered: false,
      bleedingRate: 0,
      mesh: mesh,
      contourMesh: null,
    };
    particles.push(p);
  }

  if (scene) {
    scene.add(groupMesh);
  }

  return {
    id,
    particles,
    color,
    sphericalContourLevel: 100,
    contourLayerEnabled: true,
    groupMesh,
  };
}

/**
 * Creates a physical pool structure with walls and floor.
 */
export function createPool3D(
  spawnX: number,
  spawnY: number,
  spawnZ: number,
  scene: THREE.Scene
): THREE.Group {
  const poolGroup = new THREE.Group();
  poolGroup.name = 'piscina';
  poolGroup.position.set(spawnX, spawnY, spawnZ);

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // Slate gray cement
    roughness: 0.8,
    metalness: 0.2,
  });

  const poolWidth = 4; // Much smaller (was 8)
  const poolDepth = 4; // Much smaller (was 8)
  const wallHeight = 2.5;
  const thickness = 0.4;

  // Floor
  const floor = new THREE.Mesh(new THREE.BoxGeometry(poolWidth, thickness, poolDepth), wallMat);
  floor.position.y = thickness / 2;
  floor.userData = { isObstacle: true, type: 'pool_part' };
  poolGroup.add(floor);

  // Water Surface
  const { geometry: waterGeom, material: waterMat } = getWaterResources();
  const waterSurface = new THREE.Mesh(new THREE.PlaneGeometry(poolWidth - thickness, poolDepth - thickness), waterMat);
  waterSurface.rotation.x = -Math.PI / 2;
  waterSurface.position.y = 0.5; // Initial water height
  waterSurface.name = 'water_surface';
  poolGroup.add(waterSurface);

  // Walls
  const wallPositions = [
    { x: 0, z: poolDepth / 2 - thickness / 2, w: poolWidth, d: thickness }, // Front
    { x: 0, z: -poolDepth / 2 + thickness / 2, w: poolWidth, d: thickness }, // Back
    { x: poolWidth / 2 - thickness / 2, z: 0, w: thickness, d: poolDepth }, // Right
    { x: -poolWidth / 2 + thickness / 2, z: 0, w: thickness, d: poolDepth }, // Left
  ];

  wallPositions.forEach((pos) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(pos.w, wallHeight, pos.d), wallMat);
    wall.position.set(pos.x, wallHeight / 2, pos.z);
    wall.userData = { isObstacle: true, type: 'pool_part' };
    poolGroup.add(wall);
  });

  scene.add(poolGroup);
  return poolGroup;
}

export function createVoxelProp3D(
  type: 'cup' | 'bed' | 'sofa' | 'brick_wall' | 'block_arm' | 'block_leg' | 'block_hand' | 'block_head' | 'block_torso' | 'block_slime' | 'block_skin' | 'block_tube' | 'block_tube_npc' | 'block_3x3',
  spawnX: number,
  spawnY: number,
  spawnZ: number,
  scene: THREE.Scene,
  scale: number = 1.0
): Ragdoll3D {
  const id = 'prop_' + Math.random().toString(36).substring(2, 9);
  const particles: Particle3D[] = [];
  const constraints: Constraint3D[] = [];
  const groupMesh = new THREE.Group();
  groupMesh.name = id;

  function addPart(name: BodyPartName, rx: number, ry: number, rz: number, pw: number, ph: number, pd: number, color: number): Particle3D {
    const px = spawnX + rx * scale;
    const py = spawnY + ry * scale;
    const pz = spawnZ + rz * scale;
    const w = pw * scale;
    const h = ph * scale;
    const d = pd * scale;

    const carrier = new THREE.Group();
    carrier.position.set(px, py, pz);
    groupMesh.add(carrier);

    const { voxelsGroup, voxelBlocks } = createMultiVoxelLimb(name, w, h, d, color, 'cube', 0);
    carrier.add(voxelsGroup);

    const contourMesh = createPseudo3DContourMesh(name, w, h, d, 0, color);
    contourMesh.userData.voxelBlocks = voxelBlocks;
    carrier.add(contourMesh);

    const p: Particle3D = {
      id: `${id}_${name}`,
      x: px, y: py, z: pz, oldX: px, oldY: py, oldZ: pz, vx: 0, vy: 0, vz: 0,
      mass: 5, radius: Math.max(w, h, d) * 0.5, pinned: false,
      name, parentRagdollId: id, health: 100, maxHealth: 100, fractured: false, dismembered: false, bleedingRate: 0,
      mesh: carrier, boxDims: [pw, ph, pd], voxelBlocks, voxelsGroup, contourMesh
    };
    particles.push(p);
    return p;
  }

  function addPropJoint(p1: Particle3D, p2: Particle3D, stiffness: number = 0.95, breakForce: number = 2000, name: string = 'limb_conn') {
    const dist = new THREE.Vector3(p1.x, p1.y, p1.z).distanceTo(new THREE.Vector3(p2.x, p2.y, p2.z));
    constraints.push({
      id: `${p1.id}_${p2.id}`, p1, p2, length: dist, stiffness, breakForce, broken: false, name
    });
  }

  const skinColor = 0xffdbac;
  const shirtColor = 0x2563eb;

  if (type === 'cup') {
    addPart('vaso', 0, 0.2, 0, 0.3, 0.4, 0.3, 0xffffff);
  } else if (type === 'sofa') {
    addPart('sofa', 0, 0.3, 0, 1.2, 0.6, 0.6, 0x8b4513);
  } else if (type === 'block_hand') {
    const muneca = addPart('muneca_der', 0, 0.88, 0, 0.11, 0.08, 0.12, skinColor);
    const mano = addPart('mano_der', 0, 0.78, 0, 0.11, 0.12, 0.12, skinColor);

    const thumb1 = addPart('dedo_pulgar_der', 0.040, 0.740, 0.042, 0.026, 0.035, 0.026, skinColor);
    const thumb2 = addPart('dedo_pulgar_der_seg2', 0.050, 0.705, 0.045, 0.024, 0.035, 0.024, skinColor);
    const thumb3 = addPart('dedo_pulgar_der_seg3', 0.055, 0.675, 0.048, 0.022, 0.030, 0.022, skinColor);

    const idx1 = addPart('dedo_indice_der', 0, 0.720, 0.042, 0.024, 0.035, 0.024, skinColor);
    const idx2 = addPart('dedo_indice_der_seg2', 0, 0.680, 0.042, 0.022, 0.035, 0.022, skinColor);
    const idx3 = addPart('dedo_indice_der_seg3', 0, 0.645, 0.042, 0.020, 0.030, 0.020, skinColor);

    const mid1 = addPart('dedo_medio_der', 0, 0.715, 0.014, 0.024, 0.038, 0.024, skinColor);
    const mid2 = addPart('dedo_medio_der_seg2', 0, 0.670, 0.014, 0.022, 0.036, 0.022, skinColor);
    const mid3 = addPart('dedo_medio_der_seg3', 0, 0.630, 0.014, 0.020, 0.032, 0.020, skinColor);

    const ring1 = addPart('dedo_anular_der', 0, 0.720, -0.014, 0.024, 0.035, 0.024, skinColor);
    const ring2 = addPart('dedo_anular_der_seg2', 0, 0.680, -0.014, 0.022, 0.035, 0.022, skinColor);
    const ring3 = addPart('dedo_anular_der_seg3', 0, 0.645, -0.014, 0.020, 0.030, 0.020, skinColor);

    const pink1 = addPart('dedo_menique_der', 0, 0.725, -0.042, 0.022, 0.032, 0.022, skinColor);
    const pink2 = addPart('dedo_menique_der_seg2', 0, 0.690, -0.042, 0.020, 0.030, 0.020, skinColor);
    const pink3 = addPart('dedo_menique_der_seg3', 0, 0.660, -0.042, 0.018, 0.026, 0.018, skinColor);

    addPropJoint(muneca, mano);
    addPropJoint(mano, thumb1); addPropJoint(thumb1, thumb2); addPropJoint(thumb2, thumb3);
    addPropJoint(mano, idx1); addPropJoint(idx1, idx2); addPropJoint(idx2, idx3);
    addPropJoint(mano, mid1); addPropJoint(mid1, mid2); addPropJoint(mid2, mid3);
    addPropJoint(mano, ring1); addPropJoint(ring1, ring2); addPropJoint(ring2, ring3);
    addPropJoint(mano, pink1); addPropJoint(pink1, pink2); addPropJoint(pink2, pink3);
  } else if (type === 'block_arm') {
    const hombro = addPart('hombro_der', 0, 1.52, 0, 0.16, 0.14, 0.16, shirtColor);
    const brazo = addPart('brazo_der', 0, 1.34, 0, 0.13, 0.22, 0.14, shirtColor);
    const codo = addPart('codo_der', 0, 1.19, 0, 0.12, 0.10, 0.13, skinColor);
    const antebrazo = addPart('antebrazo_der', 0, 1.03, 0, 0.12, 0.22, 0.13, skinColor);
    const muneca = addPart('muneca_der', 0, 0.88, 0, 0.11, 0.08, 0.12, skinColor);
    const mano = addPart('mano_der', 0, 0.78, 0, 0.11, 0.12, 0.12, skinColor);

    const thumb1 = addPart('dedo_pulgar_der', 0.040, 0.740, 0.042, 0.026, 0.035, 0.026, skinColor);
    const thumb2 = addPart('dedo_pulgar_der_seg2', 0.050, 0.705, 0.045, 0.024, 0.035, 0.024, skinColor);
    const thumb3 = addPart('dedo_pulgar_der_seg3', 0.055, 0.675, 0.048, 0.022, 0.030, 0.022, skinColor);

    const idx1 = addPart('dedo_indice_der', 0, 0.720, 0.042, 0.024, 0.035, 0.024, skinColor);
    const idx2 = addPart('dedo_indice_der_seg2', 0, 0.680, 0.042, 0.022, 0.035, 0.022, skinColor);
    const idx3 = addPart('dedo_indice_der_seg3', 0, 0.645, 0.042, 0.020, 0.030, 0.020, skinColor);

    const mid1 = addPart('dedo_medio_der', 0, 0.715, 0.014, 0.024, 0.038, 0.024, skinColor);
    const mid2 = addPart('dedo_medio_der_seg2', 0, 0.670, 0.014, 0.022, 0.036, 0.022, skinColor);
    const mid3 = addPart('dedo_medio_der_seg3', 0, 0.630, 0.014, 0.020, 0.032, 0.020, skinColor);

    const ring1 = addPart('dedo_anular_der', 0, 0.720, -0.014, 0.024, 0.035, 0.024, skinColor);
    const ring2 = addPart('dedo_anular_der_seg2', 0, 0.680, -0.014, 0.022, 0.035, 0.022, skinColor);
    const ring3 = addPart('dedo_anular_der_seg3', 0, 0.645, -0.014, 0.020, 0.030, 0.020, skinColor);

    const pink1 = addPart('dedo_menique_der', 0, 0.725, -0.042, 0.022, 0.032, 0.022, skinColor);
    const pink2 = addPart('dedo_menique_der_seg2', 0, 0.690, -0.042, 0.020, 0.030, 0.020, skinColor);
    const pink3 = addPart('dedo_menique_der_seg3', 0, 0.660, -0.042, 0.018, 0.026, 0.018, skinColor);

    addPropJoint(hombro, brazo); addPropJoint(brazo, codo); addPropJoint(codo, antebrazo);
    addPropJoint(antebrazo, muneca); addPropJoint(muneca, mano);
    addPropJoint(mano, thumb1); addPropJoint(thumb1, thumb2); addPropJoint(thumb2, thumb3);
    addPropJoint(mano, idx1); addPropJoint(idx1, idx2); addPropJoint(idx2, idx3);
    addPropJoint(mano, mid1); addPropJoint(mid1, mid2); addPropJoint(mid2, mid3);
    addPropJoint(mano, ring1); addPropJoint(ring1, ring2); addPropJoint(ring2, ring3);
    addPropJoint(mano, pink1); addPropJoint(pink1, pink2); addPropJoint(pink2, pink3);
  } else if (type === 'block_leg') {
    const muslo = addPart('muslo_der', 0, 0.95, 0, 0.16, 0.28, 0.16, 0x1e3a8a);
    const rodilla = addPart('rodilla_der', 0, 0.76, 0, 0.14, 0.10, 0.15, 0x1e3a8a);
    const antepierna = addPart('antepierna_der', 0, 0.56, 0, 0.14, 0.30, 0.14, 0x1e3a8a);
    const tobillo = addPart('tobillo_der', 0, 0.36, 0, 0.13, 0.10, 0.14, skinColor);
    const pie = addPart('pie_der', 0, 0.20, 0.05, 0.14, 0.12, 0.24, 0x111827);

    addPropJoint(muslo, rodilla);
    addPropJoint(rodilla, antepierna);
    addPropJoint(antepierna, tobillo);
    addPropJoint(tobillo, pie);
  } else if (type === 'block_head') {
    const cuello = addPart('cuello', 0, 1.62, 0, 0.14, 0.10, 0.14, skinColor);
    const cabeza = addPart('cabeza', 0, 1.82, 0, 0.28, 0.28, 0.28, skinColor);
    addPropJoint(cuello, cabeza);
  } else if (type === 'block_torso') {
    const pecho = addPart('pechobase', 0, 1.48, 0, 0.34, 0.22, 0.22, shirtColor);
    const torso = addPart('torso', 0, 1.28, 0, 0.32, 0.18, 0.20, shirtColor);
    const ombligo = addPart('ombligo', 0, 1.12, 0, 0.30, 0.14, 0.19, shirtColor);
    const pelvis = addPart('pelvis', 0, 0.98, 0, 0.32, 0.14, 0.21, 0x1e3a8a);

    addPropJoint(pecho, torso);
    addPropJoint(torso, ombligo);
    addPropJoint(ombligo, pelvis);
  } else if (type === 'brick_wall') {
    // Build a 3x3 grid of brick units.
    // Each brick unit has nx=2, ny=3, nz=2 (12 blocks, exactly the same count as a character calf / antepierna).
    // Total wall has 9 units * 12 blocks = 108 solid blocks, larger overall size.
    const cols = 3;
    const rows = 3;
    const brickW = 0.55;
    const brickH = 0.5;
    const brickD = 0.2;

    const brickParticles: Particle3D[][] = [];

    for (let r = 0; r < rows; r++) {
      brickParticles[r] = [];
      for (let c = 0; c < cols; c++) {
        const rx = (c - (cols - 1) / 2) * (brickW + 0.01);
        const ry = (r + 0.5) * brickH;
        const rz = 0;

        const px = spawnX + rx * scale;
        const py = spawnY + ry * scale;
        const pz = spawnZ + rz * scale;
        const w = brickW * scale;
        const h = brickH * scale;
        const d = brickD * scale;

        const carrier = new THREE.Group();
        carrier.position.set(px, py, pz);
        groupMesh.add(carrier);

        const { voxelsGroup, voxelBlocks } = createMultiVoxelLimb('pared_base', w, h, d, 0x8b2514, 'cube', 0);
        carrier.add(voxelsGroup);

        const isPinned = (r === 0); // Bottom row is pinned ground support
        const p: Particle3D = {
          id: `${id}_brick_${r}_${c}`,
          x: px, y: py, z: pz, oldX: px, oldY: py, oldZ: pz, vx: 0, vy: 0, vz: 0,
          mass: 5, radius: Math.max(w, h, d) * 0.5, pinned: isPinned,
          name: r === 0 ? 'pared_base' : 'pared_top', parentRagdollId: id, health: 100, maxHealth: 100, fractured: false, dismembered: false, bleedingRate: 0,
          mesh: carrier, boxDims: [brickW, brickH, brickD], voxelBlocks, voxelsGroup
        };
        particles.push(p);
        brickParticles[r][c] = p;
      }
    }

    // Connect adjacent brick units with constraints
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const p1 = brickParticles[r][c];
        if (c + 1 < cols) {
          const p2 = brickParticles[r][c + 1];
          const dist = new THREE.Vector3(p1.x, p1.y, p1.z).distanceTo(new THREE.Vector3(p2.x, p2.y, p2.z));
          constraints.push({
            id: `${p1.id}_h_${p2.id}`, p1, p2, length: dist, stiffness: 0.92, breakForce: 900, broken: false, name: 'brick_h_conn'
          });
        }
        if (r + 1 < rows) {
          const p2 = brickParticles[r + 1][c];
          const dist = new THREE.Vector3(p1.x, p1.y, p1.z).distanceTo(new THREE.Vector3(p2.x, p2.y, p2.z));
          constraints.push({
            id: `${p1.id}_v_${p2.id}`, p1, p2, length: dist, stiffness: 0.92, breakForce: 900, broken: false, name: 'brick_v_conn'
          });
        }
      }
    }
  } else if (type === 'bed') {
    const base = addPart('cama_base', 0, 0.2, 0, 0.8, 0.4, 1.6, 0x5a3a22);
    const headboard = addPart('cama_cabecero', 0, 0.6, 0.75, 0.8, 0.8, 0.1, 0x5a3a22);
    const sheet = addPart('cama_sabana', 0, 0.42, -0.1, 0.82, 0.05, 1.35, 0xffffff);
    const pillow = addPart('cama_almohada', 0, 0.45, 0.55, 0.6, 0.1, 0.3, 0xffffff);
    
    // Connect parts
    const parts = [base, headboard, sheet, pillow];
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        const p1 = parts[i];
        const p2 = parts[j];
        const dist = new THREE.Vector3(p1.x, p1.y, p1.z).distanceTo(new THREE.Vector3(p2.x, p2.y, p2.z));
        constraints.push({
          id: `${p1.id}_${p2.id}`, p1, p2, length: dist, stiffness: 0.95, breakForce: 2000, broken: false, name: 'bed_conn'
        });
      }
    }
  } else if (type === 'block_slime') {
    const slimePart = addPart('bloque_slime' as any, 0, 0.44, 0, 0.88, 0.88, 0.88, 0x22c55e);
    if (slimePart.voxelsGroup) {
      slimePart.voxelsGroup.traverse((c) => {
        if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
          c.material.color.setHex(0x22c55e);
          c.material.roughness = 0.05;
          c.material.metalness = 0.12;
          c.material.transparent = true;
          c.material.opacity = 0.82;
        }
      });
    }
    if (slimePart.contourMesh instanceof THREE.Mesh && slimePart.contourMesh.material instanceof THREE.MeshStandardMaterial) {
      slimePart.contourMesh.material.color.setHex(0x22c55e);
      slimePart.contourMesh.material.transparent = true;
      slimePart.contourMesh.material.opacity = 0.45;
    }
  } else if (type === 'block_skin') {
    addPart('bloque_piel' as any, 0, 0.44, 0, 0.88, 0.88, 0.88, skinColor);
  }

  scene.add(groupMesh);

  const ragdoll: Ragdoll3D = {
    id, name: type, particles, constraints, isAlive: false, isGrounded: true, isJumping: false,
    charPos: new THREE.Vector3(spawnX, spawnY, spawnZ), charVel: new THREE.Vector3(0, 0, 0),
    facingAngle: 0, walkCycle: 0, totalHealth: 100, scale, isControlled: false, groupMesh,
    bustMorphValue: 0, rampsEnabled: false, hasWeapon: false, isAiming: false,
    sphericalContourLevel: 0,
    contourLayerEnabled: true,
    erectionLevel: 0,
    isErecting: false,
    stats: { brokenBones: 0, dismemberedLimbs: 0, bloodLossPercent: 0, destroyedBlocks: 0 }
  };

  updateRagdollSphericalContour(ragdoll, 0, true, 'pseudo3d');

  return ragdoll;
}

/**
 * Synchronizes all particle carrier meshes, voxels, joint bridges, joint spheres,
 * and facial canvas textures for a static or standalone ragdoll (e.g. in AvatarEditorModal).
 */
export function syncRagdollMeshes3D(ragdoll: Ragdoll3D) {
  if (!ragdoll) return;

  const isCylinderMode =
    ragdoll.contourJointStyle === 'cylinder' &&
    ragdoll.contourLayerEnabled &&
    (!ragdoll.xrayMode || ragdoll.xrayMode === 0);

  // 1. Sync Particle Meshes & Limb Block Visibility
  const isPseudo3DMode =
    ragdoll.contourJointStyle === 'pseudo3d' &&
    ragdoll.contourLayerEnabled &&
    (!ragdoll.xrayMode || ragdoll.xrayMode === 0);

  for (const p of ragdoll.particles) {
    if (p.mesh) {
      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.scale.set(1.0, 1.0, 1.0);
    }

    const wMult = p.widthMultiplier !== undefined ? p.widthMultiplier : 1.0;
    const nLow = p.name.toLowerCase();
    const isCompact = (
      nLow.startsWith('cabeza') ||
      nLow.startsWith('cuello') ||
      nLow.startsWith('mano') ||
      nLow.startsWith('dedo') ||
      nLow.startsWith('pie') ||
      nLow.startsWith('tobillo') ||
      nLow.startsWith('muneca') ||
      nLow.startsWith('codo') ||
      nLow.startsWith('rodilla') ||
      nLow.startsWith('hombro') ||
      nLow.startsWith('gluteo') ||
      nLow.startsWith('busto')
    );
    const scaleX = wMult;
    const scaleY = isCompact ? wMult : 1.0;
    const scaleZ = wMult;

    if (p.voxelsGroup) {
      p.voxelsGroup.scale.set(scaleX, scaleY, scaleZ);
    }

    // Contour mesh visibility & scale
    if (p.contourMesh) {
      p.contourMesh.visible = isPseudo3DMode;
      p.contourMesh.scale.set(scaleX, scaleY, scaleZ);
    }

    // Voxels group items visibility
    if (p.voxelsGroup) {
      p.voxelsGroup.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) {
          // Container groups (e.g. GenitalExtraGroup, BustExtraGroup, ErectionPivotGroup) must remain visible
          child.visible = true;
          return;
        }

        const name = child.name || '';
        const parentName = child.parent?.name || '';

        if (
          name.includes('Pubic') ||
          name.includes('pubic') ||
          name.includes('PubicHair') ||
          name.includes('PubicStrand') ||
          name.includes('hair_cyl') ||
          name.includes('Strand') ||
          parentName.includes('Pubic') ||
          parentName.includes('Strand')
        ) {
          child.visible = Boolean(ragdoll.pubicHairEnabled !== false);
          return;
        }

        const isAnatomyFeature =
          name.includes('pecho') ||
          name.includes('tetilla') ||
          name.includes('gluteo') ||
          name.includes('shaft') ||
          name.includes('glans') ||
          name.includes('testicle') ||
          name.includes('labia') ||
          name.includes('labio') ||
          name.includes('entrance') ||
          name.includes('uterus') ||
          name.includes('ovary') ||
          name.includes('prostate') ||
          name.includes('anus') ||
          name.includes('ano') ||
          name.includes('sphincter') ||
          name.includes('clitoris') ||
          name.includes('minora') ||
          name.includes('breast') ||
          name.includes('glute') ||
          name.includes('penis') ||
          name.includes('erection') ||
          name.includes('genital') ||
          parentName.includes('Bust') ||
          parentName.includes('Glute') ||
          parentName.includes('Genital') ||
          parentName.includes('Anus') ||
          parentName.includes('Erection') ||
          parentName === 'BustExtraGroup' ||
          parentName === 'GluteExtraGroup' ||
          parentName === 'GenitalExtraGroup' ||
          parentName === 'AnusExtraGroup' ||
          parentName === 'ErectionPivotGroup';

        if (name.includes('ShirtContourEnvelope')) {
          child.visible = Boolean(ragdoll.hasShirt) && isPseudo3DMode;
        } else if (name.includes('PantsContourEnvelope')) {
          child.visible = Boolean(ragdoll.hasPants) && isPseudo3DMode;
        } else if (name.includes('ShirtBlock') || child.userData?.isShirtBlock) {
          child.visible = Boolean(ragdoll.hasShirt) && !isCylinderMode && !isPseudo3DMode;
        } else if (name.includes('PantsBlock') || child.userData?.isPantsBlock) {
          child.visible = Boolean(ragdoll.hasPants) && !isCylinderMode && !isPseudo3DMode;
        } else if (name.includes('pseudo') || name.includes('Contour') || name.includes('Pseudo')) {
          child.visible = isPseudo3DMode;
        } else if (
          name.includes('AnimeFaceMesh') ||
          name.includes('Hair') ||
          name.includes('Beard') ||
          name.includes('Hat') ||
          name.includes('Glasses') ||
          name.includes('Voxel3DFaceGroup') ||
          name.startsWith('3D_') ||
          name.includes('eyebrow') ||
          name.includes('mouth') ||
          name.includes('sclera') ||
          name.includes('iris') ||
          name.includes('pupil') ||
          name.includes('tongue') ||
          name.includes('saliva') ||
          name.includes('blush') ||
          parentName.includes('3D_') ||
          parentName.includes('Voxel3DFaceGroup')
        ) {
          if (name.includes('AnimeFaceMesh')) {
            child.visible = ragdoll.faceFeatureMode === 'anime_canvas' || ragdoll.faceFeatureMode === 'hybrid';
          } else if (
            name.includes('Voxel3DFaceGroup') ||
            name.startsWith('3D_') ||
            name.includes('eyebrow') ||
            name.includes('mouth') ||
            name.includes('sclera') ||
            name.includes('iris') ||
            name.includes('pupil') ||
            name.includes('tongue') ||
            name.includes('saliva') ||
            name.includes('blush') ||
            parentName.includes('3D_') ||
            parentName.includes('Voxel3DFaceGroup')
          ) {
            child.visible = ragdoll.faceFeatureMode !== 'anime_canvas';
          } else {
            child.visible = true;
          }
        } else if (isAnatomyFeature) {
          const isPseudoMesh = name.includes('pseudo') || name.includes('Pseudo');
          if (isPseudo3DMode) {
            if (isPseudoMesh) {
              child.visible = true;
            } else if (name.includes('mesh') && (name.includes('gluteo_mesh') || name.includes('pecho_mesh'))) {
              child.visible = false;
            } else {
              child.visible = true;
            }
          } else {
            if (isPseudoMesh) {
              child.visible = false;
            } else {
              child.visible = true;
            }
          }

          // Ensure anatomy skin meshes always maintain exact active skin color without needing paint sphere
          const isPinkOrgan = (
            name.includes('glans') || name.includes('pink_sphere') || name.includes('tetilla') ||
            name.includes('nipple') || name.includes('anus') || name.includes('internal') ||
            name.includes('uterus') || name.includes('canal') || name.includes('urethra') || name.includes('ovary')
          );
          const isGenital = (
            name.includes('shaft') || name.includes('testicle') || name.includes('labia') ||
            name.includes('clitoris') || name.includes('male_') || name.includes('female_') ||
            name.includes('penis') || name.includes('erection') || name.includes('genital') ||
            name.includes('entrance') || name.includes('prostate') ||
            name.includes('pecho') || name.includes('gluteo') || name.includes('breast') || name.includes('glute') ||
            parentName === 'BustExtraGroup' || parentName === 'GluteExtraGroup' ||
            parentName === 'GenitalExtraGroup' || parentName === 'ErectionPivotGroup'
          );
          if (!isPinkOrgan && child.material) {
            const currentSkinColor = getRagdollSkinColor(ragdoll);
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            for (const mat of mats) {
              if (mat instanceof THREE.MeshStandardMaterial) {
                if (child.geometry && child.geometry.attributes.color) {
                  mat.vertexColors = true;
                  mat.color.setHex(0xffffff);
                  const colorAttr = child.geometry.attributes.color;
                  const col = new THREE.Color(currentSkinColor).convertSRGBToLinear();
                  for (let ci = 0; ci < colorAttr.count; ci++) {
                    colorAttr.setXYZ(ci, col.r, col.g, col.b);
                  }
                  colorAttr.needsUpdate = true;
                } else {
                  mat.vertexColors = false;
                  mat.color.setHex(currentSkinColor);
                }
                mat.roughness = 0.50;
                mat.metalness = 0.05;
                mat.needsUpdate = true;
              }
            }
            if (child.userData) {
              child.userData.baseColor = currentSkinColor;
            }
          }
        } else if (isCylinderMode) {
          // In cylinder mode, keep hands, fingers, feet, toes, ankles, wrists, head, face, and clothing blocks visible so extremities never vanish or hide
          const isExtremity = p.name.startsWith('mano') || p.name.startsWith('dedo') || p.name.startsWith('pie') || p.name.startsWith('cabeza') || p.name.startsWith('tobillo') || p.name.startsWith('muneca');
          if (isExtremity) {
            child.visible = true;
          } else {
            child.visible = false;
          }
        } else if (isPseudo3DMode) {
          // In pseudo-3d mode, keep extremities (hands, fingers, feet, toes, head) visible as well
          const isExtremity = p.name.startsWith('mano') || p.name.startsWith('dedo') || p.name.startsWith('pie') || p.name.startsWith('cabeza') || p.name.startsWith('tobillo') || p.name.startsWith('muneca');
          if (isExtremity) {
            child.visible = true;
          } else {
            child.visible = false;
          }
        } else {
          child.visible = true;
        }
      });
    }
  }

  // 2. Sync Joint Bridges (Cylinders connecting adjacent body parts)
  if (ragdoll.jointBridges) {
    const isCylinderMode =
      (ragdoll.contourJointStyle === 'cylinder' &&
      ragdoll.contourLayerEnabled &&
      (!ragdoll.xrayMode || ragdoll.xrayMode === 0)) ||
      ragdoll.xrayMode === 1;
    const showBridges = isCylinderMode;

    for (const bridge of ragdoll.jointBridges) {
      if (!showBridges) {
        bridge.visible = false;
        continue;
      }
      const c = bridge.userData.constraint;
      if (c && c.p1 && c.p2 && !c.broken && !c.p1.dismembered && !c.p2.dismembered) {
        let p1Pos = new THREE.Vector3(c.p1.x, c.p1.y, c.p1.z);
        let p2Pos = new THREE.Vector3(c.p2.x, c.p2.y, c.p2.z);

        // For pelvis to thigh bridges, start at the hip socket (lateral side of pelvis) so leg connects vertically like shoulder/arm
        if (c.name.includes('pelvis_muslo')) {
          const scale = ragdoll.scale || 1.0;
          const isLeft = c.p2.name.includes('izq');
          if (c.p1.mesh) {
            c.p1.mesh.updateMatrixWorld(true);
            p1Pos = c.p1.mesh.localToWorld(new THREE.Vector3(isLeft ? -0.145 * scale : 0.145 * scale, -0.04 * scale, 0));
          } else {
            const angle = ragdoll.facingAngle || 0;
            const charRight = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle));
            const hipOffsetLateral = isLeft ? -0.145 * scale : 0.145 * scale;
            p1Pos.addScaledVector(charRight, hipOffsetLateral);
            p1Pos.y -= 0.04 * scale;
          }
        }

        // For toe bridges connected from foot base to toes, align p1Pos laterally to match toe axis so cylinders run parallel straight forward
        if (c.p2.name.startsWith('dedo_pie_')) {
          const angle = ragdoll.facingAngle || 0;
          const charRight = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle));
          const rel = new THREE.Vector3().subVectors(p2Pos, p1Pos);
          const lateralOffset = rel.dot(charRight);
          p1Pos.addScaledVector(charRight, lateralOffset);
        }

        const dist = p1Pos.distanceTo(p2Pos);

        if (dist < 0.0001) {
          bridge.visible = false;
          continue;
        }

        const mid = new THREE.Vector3().addVectors(p1Pos, p2Pos).multiplyScalar(0.5);
        bridge.position.copy(mid);

        const wMult1 = c.p1.widthMultiplier !== undefined ? c.p1.widthMultiplier : 1.0;
        const wMult2 = c.p2.widthMultiplier !== undefined ? c.p2.widthMultiplier : 1.0;
        const scale = ragdoll.scale || 1.0;
        const limbMult = ragdoll.limbSizeMultiplier !== undefined ? ragdoll.limbSizeMultiplier : 1.0;
        const { r1, r2, skip } = getConstraintCylinderRadii(c.name, c.p1.name, c.p2.name, scale, wMult1, wMult2, limbMult);

        if (skip) {
          bridge.visible = false;
          continue;
        }

        if (
          Math.abs((bridge.userData.lastR1 || 0) - r1) > 0.001 ||
          Math.abs((bridge.userData.lastR2 || 0) - r2) > 0.001 ||
          !bridge.geometry ||
          bridge.userData.lastXrayMode !== ragdoll.xrayMode
        ) {
          bridge.geometry.dispose();
          if (ragdoll.xrayMode === 1) {
            // Create a gorgeous 3-strand fibrous rope/tendon geometry!
            const baseGeom = new THREE.CylinderGeometry(r2, r1, 1.0, 32, 32, false);
            const posAttr = baseGeom.attributes.position;
            const count = posAttr.count;
            for (let i = 0; i < count; i++) {
              let x = posAttr.getX(i);
              let y = posAttr.getY(i);
              let z = posAttr.getZ(i);
              const r = Math.sqrt(x*x + z*z);
              if (r > 0.001) {
                const theta = Math.atan2(z, x);
                // 3 helical strands twisted around the cylinder with high-frequency rope spirals
                const factor = 1.0 + 0.22 * Math.sin(theta * 3 + y * 35.0);
                posAttr.setX(i, x * factor);
                posAttr.setZ(i, z * factor);
              }
            }
            posAttr.needsUpdate = true;
            baseGeom.computeVertexNormals();
            bridge.geometry = baseGeom;
          } else {
            bridge.geometry = new THREE.CylinderGeometry(r2, r1, 1.0, 24, 20, false);
          }
          bridge.userData.lastR1 = r1;
          bridge.userData.lastR2 = r2;
          bridge.userData.lastXrayMode = ragdoll.xrayMode;
          bridge.userData.basePositions = undefined;
          if (bridge.userData.holes && bridge.userData.holes.length > 0) {
            applyHoleMorphToMesh(bridge);
          }
        }

        const dir = new THREE.Vector3().subVectors(p2Pos, p1Pos).divideScalar(dist);
        bridge.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

        // Scale standard tapered cylinder to cover distance between joints.
        const visualDist = dist;
        bridge.scale.set(1.0, visualDist, 1.0);
        bridge.visible = true;

        if (bridge.material && (bridge.material as THREE.MeshStandardMaterial).color) {
          const isShirtBridge = SHIRT_BODY_PARTS.has(c.p1.name) && SHIRT_BODY_PARTS.has(c.p2.name);
          const isPantsBridge = PANTS_BODY_PARTS.has(c.p1.name) && PANTS_BODY_PARTS.has(c.p2.name);
          const strBridge = (c.name + '_' + c.p1.name + '_' + c.p2.name).toLowerCase();
          const isInternal = (
            strBridge.includes('canal') ||
            strBridge.includes('uterus') ||
            strBridge.includes('utero') ||
            strBridge.includes('ovary') ||
            strBridge.includes('ovario')
          );
          const isFlowerBridge = strBridge.includes('flower');
          if (isInternal) {
            (bridge.material as THREE.MeshStandardMaterial).color.setHex(0xf43f5e);
          } else if (ragdoll.xrayMode === 1) {
            // Tendon/rope-like colors: pearl-white/beige fibrous tendon look!
            (bridge.material as THREE.MeshStandardMaterial).color.setHex(0xf1f5f9);
            (bridge.material as THREE.MeshStandardMaterial).roughness = 0.45;
            (bridge.material as THREE.MeshStandardMaterial).metalness = 0.10;
            if (!(bridge.material as THREE.MeshStandardMaterial).emissive) {
              (bridge.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x475569);
            } else {
              (bridge.material as THREE.MeshStandardMaterial).emissive.setHex(0x475569);
            }
            (bridge.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.12;
          } else if (isFlowerBridge) {
            if (strBridge.includes('blossom')) {
              (bridge.material as THREE.MeshStandardMaterial).color.setHex(ragdoll.hatColorHex || 0xf472b6);
            } else {
              (bridge.material as THREE.MeshStandardMaterial).color.setHex(0x16a34a);
            }
          } else if (ragdoll.hasShirt && isShirtBridge) {
            (bridge.material as THREE.MeshStandardMaterial).color.setHex(ragdoll.shirtColorHex || 0x38bdf8);
          } else if (ragdoll.hasPants && isPantsBridge) {
            (bridge.material as THREE.MeshStandardMaterial).color.setHex(ragdoll.pantsColorHex || 0x1e3a8a);
          } else {
            const currentSkinColor = getRagdollSkinColor(ragdoll);
            (bridge.material as THREE.MeshStandardMaterial).color.setHex(currentSkinColor);
          }
        }
      } else {
        bridge.visible = false;
      }
    }
  }

  // 3. Sync Joint Spheres (Ball joints connecting cylinder limbs)
  if (ragdoll.jointSpheres) {
    for (const sphere of ragdoll.jointSpheres) {
      const p = sphere.userData.particle;
      const isDeadLimbs = p && p.voxelBlocks ? p.voxelBlocks.filter((bk: any) => bk.active).length === 0 : false;
      if (p && isCylinderMode && !p.dismembered && !isDeadLimbs) {
        const offset = sphere.userData.localOffset as THREE.Vector3 | undefined;
        if (offset && p.mesh) {
          p.mesh.updateMatrixWorld(true);
          const worldPos = p.mesh.localToWorld(offset.clone());
          sphere.position.copy(worldPos);
        } else if (offset) {
          sphere.position.set(p.x + offset.x, p.y + offset.y, p.z + offset.z);
        } else {
          sphere.position.set(p.x, p.y, p.z);
        }
        if (p.mesh) {
          sphere.quaternion.copy(p.mesh.quaternion);
        }
        const targetLimb = sphere.userData.targetLimbName
          ? ragdoll.particles.find((pt) => pt.name === sphere.userData.targetLimbName)
          : p;
        const wMult = targetLimb && targetLimb.widthMultiplier !== undefined ? targetLimb.widthMultiplier : 1.0;
        sphere.scale.set(wMult, wMult, wMult);
        sphere.visible = true;

        if (sphere.material && (sphere.material as THREE.MeshStandardMaterial).color) {
          const strP = p.name.toLowerCase();
          const isInternal = (
            strP.includes('canal') ||
            strP.includes('uterus') ||
            strP.includes('utero') ||
            strP.includes('ovary') ||
            strP.includes('ovario')
          );
          if (isInternal) {
            (sphere.material as THREE.MeshStandardMaterial).color.setHex(0xf43f5e);
          } else if (ragdoll.hasShirt && SHIRT_BODY_PARTS.has(p.name)) {
            (sphere.material as THREE.MeshStandardMaterial).color.setHex(ragdoll.shirtColorHex || 0x38bdf8);
          } else if (ragdoll.hasPants && PANTS_BODY_PARTS.has(p.name)) {
            (sphere.material as THREE.MeshStandardMaterial).color.setHex(ragdoll.pantsColorHex || 0x1e3a8a);
          } else {
            const currentSkinColor = getRagdollSkinColor(ragdoll);
            (sphere.material as THREE.MeshStandardMaterial).color.setHex(currentSkinColor);
          }
        }
      } else {
        sphere.visible = false;
      }
    }
  }

  // 4. Sync Neck-to-Stomach Pink Organ Tube
  if (ragdoll.neckToStomachTube) {
    const cuelloP = ragdoll.particles.find((p) => p.name === 'cuello');
    const torsoP = ragdoll.particles.find((p) => p.name === 'torso');
    const neckEmpty = cuelloP?.voxelBlocks ? cuelloP.voxelBlocks.filter((b: any) => b.active).length === 0 : false;
    const torsoEmpty = torsoP?.voxelBlocks ? torsoP.voxelBlocks.filter((b: any) => b.active).length === 0 : false;

    if (!cuelloP || !torsoP || cuelloP.dismembered || torsoP.dismembered || neckEmpty || torsoEmpty) {
      ragdoll.neckToStomachTube.visible = false;
    } else {
      let neckWorldPos = new THREE.Vector3();
      if (cuelloP.mesh) {
        cuelloP.mesh.updateMatrixWorld(true);
        neckWorldPos = cuelloP.mesh.localToWorld(new THREE.Vector3(0, -cuelloP.radius * 0.7, 0.02 * (ragdoll.scale || 1.0)));
      } else {
        neckWorldPos.set(cuelloP.x, cuelloP.y - cuelloP.radius * 0.7, cuelloP.z + 0.02 * (ragdoll.scale || 1.0));
      }

      let stomachWorldPos = new THREE.Vector3();
      const stomachBody = torsoP.voxelsGroup?.getObjectByName('stomach_body');
      if (stomachBody) {
        stomachBody.updateMatrixWorld(true);
        stomachBody.getWorldPosition(stomachWorldPos);
        const upVec = new THREE.Vector3(0, 1, 0).applyQuaternion(torsoP.mesh?.quaternion || new THREE.Quaternion());
        stomachWorldPos.addScaledVector(upVec, 0.04 * (ragdoll.scale || 1.0));
      } else if (torsoP.mesh) {
        torsoP.mesh.updateMatrixWorld(true);
        stomachWorldPos = torsoP.mesh.localToWorld(new THREE.Vector3(0.035 * (ragdoll.scale || 1.0), 0.045 * (ragdoll.scale || 1.0), 0.01 * (ragdoll.scale || 1.0)));
      } else {
        stomachWorldPos.set(torsoP.x + 0.035 * (ragdoll.scale || 1.0), torsoP.y + 0.045 * (ragdoll.scale || 1.0), torsoP.z + 0.01 * (ragdoll.scale || 1.0));
      }

      const parentContainer = torsoP.voxelsGroup || ragdoll.groupMesh;
      if (parentContainer) {
        if (ragdoll.neckToStomachTube.parent !== parentContainer) {
          if (ragdoll.neckToStomachTube.parent) {
            ragdoll.neckToStomachTube.parent.remove(ragdoll.neckToStomachTube);
          }
          parentContainer.add(ragdoll.neckToStomachTube);
        }
        parentContainer.updateMatrixWorld(true);
        const localNeck = parentContainer.worldToLocal(neckWorldPos.clone());
        const localStomach = parentContainer.worldToLocal(stomachWorldPos.clone());

        const dir = new THREE.Vector3().subVectors(localStomach, localNeck);
        const len = dir.length();
        if (len > 0.001) {
          dir.normalize();
          ragdoll.neckToStomachTube.position.copy(localNeck).addScaledVector(dir, len * 0.5);
          ragdoll.neckToStomachTube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
          const origLen = (ragdoll.neckToStomachTube.userData && ragdoll.neckToStomachTube.userData.originalLength) || 0.35;
          const scaleY = Math.min(1.2, Math.max(0.15, len / origLen));
          ragdoll.neckToStomachTube.scale.set(0.70, scaleY, 0.70);
          ragdoll.neckToStomachTube.visible = (!ragdoll.xrayMode || ragdoll.xrayMode === 0 || ragdoll.xrayMode === 2 || ragdoll.xrayMode === 3 || ragdoll.xrayMode === 4);
        } else {
          ragdoll.neckToStomachTube.visible = false;
        }
      }
    }
  }

  // 5. Sync Pubic / Genital Hair
  setupPubicHair(ragdoll);
}

/**
 * Procedurally adds or updates pubic/genital hair on the pelvis of a character.
 * Configured via ragdoll.pubicHairEnabled and ragdoll.pubicHairIntensity (1 to 10).
 * "mientra mas intenso mas pelos y mas pelos juntos haya en donde va genital
 *  que pelos esten hecho de 3 cilindros y 3 extremidades tambien osea 3 partes cada una con divisiones"
 */
export function setupPubicHair(ragdoll: Ragdoll3D) {
  const pelvis = ragdoll.particles.find((p) => p.name === 'pelvis');
  if (!pelvis || !pelvis.voxelsGroup) return;

  // 1. Remove existing pubic hair group
  const existingGroup = pelvis.voxelsGroup.getObjectByName('PubicHairGroup');
  if (existingGroup) {
    pelvis.voxelsGroup.remove(existingGroup);
    existingGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material?.dispose();
      }
    });
  }

  const enabled = Boolean(ragdoll.pubicHairEnabled) && !ragdoll.hasPants && !ragdoll.hasUnderwear;
  const intensity = Math.max(1, Math.min(10, ragdoll.pubicHairIntensity ?? 5));
  if (!enabled || intensity <= 0) return;

  const pubicHairGroup = new THREE.Group();
  pubicHairGroup.name = 'PubicHairGroup';
  pubicHairGroup.renderOrder = 999;

  const scale = ragdoll.scale ?? 1.0;
  const hairColorHex = (ragdoll as any).pubicHairColorHex ?? (ragdoll as any).hairColorHex ?? 0x1c1917;

  const hairMat = new THREE.MeshStandardMaterial({
    color: hairColorHex,
    roughness: 0.85,
    metalness: 0.1,
    polygonOffset: true,
    polygonOffsetFactor: -10.0,
    polygonOffsetUnits: -10.0,
    depthTest: true,
    depthWrite: true,
  });

  // Compute actual outer depth envelope of the pelvis skin
  let contourDepth = 0.22;
  if (ragdoll.contourLayerEnabled) {
    const level = (ragdoll.sphericalContourLevel || 85) / 100;
    contourDepth = 0.22 + 0.12 * level;
  }

  // Clustered pubic hair formation adhering directly to the pelvis groin skin
  const gridCols = Math.min(8, Math.max(4, Math.round(3 + intensity * 0.55)));
  const gridRows = Math.min(6, Math.max(3, Math.round(2 + intensity * 0.45)));
  const spacingX = 0.018 * scale; // Clustered horizontal separation
  const spacingY = 0.014 * scale; // Clustered vertical separation

  let strandIndex = 0;
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      // Omit corner outer cells at bottom edges to give natural pubic inverted triangle
      if (r === gridRows - 1 && (c === 0 || c === gridCols - 1) && gridCols > 3) continue;
      if (r === gridRows - 2 && (c === 0 || c === gridCols - 1) && gridCols > 5) continue;

      const strandGroup = new THREE.Group();
      strandGroup.name = `PubicStrand_Cubic_${strandIndex}`;

      // Local grid coordinates
      const rootX = ((c - (gridCols - 1) / 2) * spacingX);
      const rootY = (-0.005 * scale) - (r * spacingY);

      // Exact surface Z coordinate calculated directly from pelvis pseudo 3D contour envelope
      const rx = 0.18 * scale;
      const rz = (contourDepth * 0.5) * scale;
      const normX = Math.min(0.92, Math.abs(rootX) / rx);
      const surfaceZ = rz * Math.sqrt(Math.max(0.05, 1.0 - normX * normX));
      // Embed root 2mm into pelvis skin so zero strands ever float
      const rootZ = surfaceZ - 0.002 * scale;

      strandGroup.position.set(rootX, rootY, rootZ);

      // 3 volumetric articulated cylinders per strand with realistic downward curl
      const p1Len = 0.040 * scale;
      const p2Len = 0.032 * scale;
      const p3Len = 0.024 * scale;
      const r1 = 0.006 * scale;
      const r2 = 0.0045 * scale;
      const r3 = 0.003 * scale;

      // --- PART 1 (Base Segment) ---
      const part1Group = new THREE.Group();
      part1Group.name = `Strand_${strandIndex}_Part1`;
      const cyl1Geom = new THREE.CylinderGeometry(r2, r1, p1Len, 6);
      cyl1Geom.translate(0, p1Len * 0.5, 0);
      const cyl1Mesh = new THREE.Mesh(cyl1Geom, hairMat);
      cyl1Mesh.name = `hair_cyl1_${strandIndex}`;
      cyl1Mesh.renderOrder = 999;
      cyl1Mesh.castShadow = true;
      part1Group.add(cyl1Mesh);

      const outAngle = (c - (gridCols - 1) / 2) * 0.12 + (Math.sin(strandIndex * 1.7) * 0.06);
      const downAngle = 0.35 + (r * 0.08);
      part1Group.rotation.set(downAngle, outAngle, outAngle * 0.3);

      // --- PART 2 (Middle Segment) ---
      const part2Group = new THREE.Group();
      part2Group.name = `Strand_${strandIndex}_Part2`;
      part2Group.position.set(0, p1Len, 0);
      const cyl2Geom = new THREE.CylinderGeometry(r3, r2, p2Len, 6);
      cyl2Geom.translate(0, p2Len * 0.5, 0);
      const cyl2Mesh = new THREE.Mesh(cyl2Geom, hairMat);
      cyl2Mesh.name = `hair_cyl2_${strandIndex}`;
      cyl2Mesh.renderOrder = 999;
      cyl2Mesh.castShadow = true;
      part2Group.add(cyl2Mesh);
      part2Group.rotation.set(0.25, (Math.sin(strandIndex * 2.3) * 0.12), (Math.cos(strandIndex * 3.1) * 0.12));

      // --- PART 3 (Tip Segment) ---
      const part3Group = new THREE.Group();
      part3Group.name = `Strand_${strandIndex}_Part3`;
      part3Group.position.set(0, p2Len, 0);
      const cyl3Geom = new THREE.CylinderGeometry(0.001 * scale, r3, p3Len, 6);
      cyl3Geom.translate(0, p3Len * 0.5, 0);
      const cyl3Mesh = new THREE.Mesh(cyl3Geom, hairMat);
      cyl3Mesh.name = `hair_cyl3_${strandIndex}`;
      cyl3Mesh.renderOrder = 999;
      cyl3Mesh.castShadow = true;
      part3Group.add(cyl3Mesh);
      part3Group.rotation.set(0.22, (Math.cos(strandIndex * 1.5) * 0.15), (Math.sin(strandIndex * 1.9) * 0.15));

      // Assemble 3-tier chain
      part2Group.add(part3Group);
      part1Group.add(part2Group);
      strandGroup.add(part1Group);

      pubicHairGroup.add(strandGroup);
      strandIndex++;
    }
  }

  pelvis.voxelsGroup.add(pubicHairGroup);
}

/**
 * Creates a Tube Network made strictly of standard cube blocks ("Tubo Bloques" / "Cave Tube"):
 * A hollow block tube (2 blocks wide interior, 4 blocks outer perimeter) with OPEN entrance,
 * OPEN exit (both tips open), and completely hollow interior so players and objects can pass through freely.
 */
export function createCaveTentacleRagdoll3D(
  spawnX: number = 0,
  spawnY: number = 0,
  spawnZ: number = 0,
  scale: number = 1.0,
  scene?: THREE.Scene,
  initialSphericalContour: number = 85,
  contourEnabled: boolean = false,
  initialVoxelShape: 'cube' | 'sphere' = 'cube'
): Ragdoll3D {
  const id = 'cave_tentacle_' + Math.random().toString(36).substring(2, 9);
  const particles: Particle3D[] = [];
  const constraints: Constraint3D[] = [];

  const groupMesh = new THREE.Group();
  groupMesh.name = id;

  // Solid cavern stone palette (pure natural stone voxel cube blocks without division lines)
  const stoneColorDark = 0x1f2937;   // Dark Slate Obsidian
  const stoneColorMedium = 0x374151; // Slate Stone
  const stoneColorAccent = 0x475569; // Gray Stone
  const stoneFloorColor = 0x111827;  // Bedrock Floor

  const cubeSize = 0.88 * scale;
  const boxGeom = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

  const stoneMat1 = new THREE.MeshStandardMaterial({
    color: stoneColorDark,
    roughness: 0.8,
    metalness: 0.15,
  });
  const stoneMat2 = new THREE.MeshStandardMaterial({
    color: stoneColorMedium,
    roughness: 0.8,
    metalness: 0.15,
  });
  const stoneMatAccent = new THREE.MeshStandardMaterial({
    color: stoneColorAccent,
    roughness: 0.75,
    metalness: 0.2,
  });
  const stoneMatFloor = new THREE.MeshStandardMaterial({
    color: stoneFloorColor,
    roughness: 0.9,
    metalness: 0.05,
  });

  // Track all occupied block positions to prevent duplicates
  const occupiedSet = new Set<string>();

  /**
   * Builds an authentic subterranean vertical tube and branching cave network ("cuevas aleatorias").
   * - Main tube points DOWNWARD into the floor/ground (1 block wide bore).
   * - No rings/sleeves around cylinders.
   * - At the bottom of the tube: multiple branching cave corridors with cylinder/block connections.
   */
  function addDownwardCaveTubeAndBranches(
    name: BodyPartName,
    startX: number,
    startY: number,
    startZ: number,
    depthBlocks: number = 12
  ): Particle3D {
    const carrierMesh = new THREE.Group();
    carrierMesh.name = `Carrier_${name}`;
    carrierMesh.position.set(startX, startY, startZ);
    groupMesh.add(carrierMesh);

    const voxelsGroup = new THREE.Group();
    voxelsGroup.name = `VoxelsGroup_${name}`;
    const voxelBlocks: LimbVoxelBlock[] = [];
    let blockIdx = 0;

    const tubeLengthTotal = depthBlocks * cubeSize;
    // 1-block interior clearance: inner radius lines the 1-block opening
    const tubeRadiusInner = 0.54 * cubeSize; // Exactly matches 1-block square bore (~0.48m radius)
    const tubeRadiusOuter = 1.55 * cubeSize; // Outer envelope around 3x3 block ring (~1.36m radius)

    // Pseudo-cylinder block geometry ("esos bloques deben tener pseudo cilindro")
    const pseudoCylBlockGeom = new THREE.CylinderGeometry(cubeSize * 0.52, cubeSize * 0.52, cubeSize, 16);

    const cylOuterMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Dark slate cave stone
      roughness: 0.8,
      metalness: 0.15,
      side: THREE.DoubleSide,
    });

    const cylInnerMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Deep subterranean rock liner
      roughness: 0.85,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    // Helper to register voxel blocks with pseudo-cylinder geometry
    const addVoxelAt = (lx: number, ly: number, lz: number, mat: THREE.Material, col: number, rotY: number = 0, usePseudoCyl: boolean = true) => {
      const worldX = Math.round((startX + lx) / (cubeSize * 0.4));
      const worldY = Math.round((startY + ly) / (cubeSize * 0.4));
      const worldZ = Math.round((startZ + lz) / (cubeSize * 0.4));
      const key = `${worldX}_${worldY}_${worldZ}`;
      if (occupiedSet.has(key)) return;
      occupiedSet.add(key);

      const localPos = new THREE.Vector3(lx, ly, lz);
      const mesh = new THREE.Mesh(usePseudoCyl ? pseudoCylBlockGeom : boxGeom, mat);
      mesh.position.copy(localPos);
      if (rotY !== 0) mesh.rotation.y = rotY;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      voxelsGroup.add(mesh);

      voxelBlocks.push({
        id: `${name}_cube_${blockIdx++}`,
        localPos,
        size: [cubeSize, cubeSize, cubeSize],
        color: col,
        originalColor: col,
        active: true,
        mesh,
        isContour: true,
        gridIndex: [Math.round(lx / cubeSize), Math.round(ly / cubeSize), Math.round(lz / cubeSize)],
      });
    };

    // 1. VERTICAL SHAFT OF BLOCKS LEAVING EXACTLY 1 BLOCK TO ENTER ("tubo de bloques que deje un espacio para entrar de 1 bloque")
    // 8 wall blocks per layer surrounding the central 1-block entry (0, 0)
    const tubeWallOffsets = [
      { ox: -1, oz: -1 }, { ox: 0, oz: -1 }, { ox: 1, oz: -1 },
      { ox: -1, oz:  0 },                    { ox: 1, oz:  0 },
      { ox: -1, oz:  1 }, { ox: 0, oz:  1 }, { ox: 1, oz:  1 },
    ];

    for (let step = 0; step < depthBlocks; step++) {
      const ly = -step * cubeSize;
      for (let k = 0; k < tubeWallOffsets.length; k++) {
        const off = tubeWallOffsets[k];
        const lx = off.ox * cubeSize;
        const lz = off.oz * cubeSize;
        const isAlt = (k + step) % 2 === 0;
        addVoxelAt(lx, ly, lz, isAlt ? stoneMat1 : stoneMat2, isAlt ? stoneColorDark : stoneColorMedium, 0, true);
      }
    }

    // Floor block at bottom of vertical shaft to catch player when falling down the 1-block entrance, aligned with branch corridors
    addVoxelAt(0, -tubeLengthTotal - cubeSize, 0, stoneMatFloor, stoneFloorColor, 0, true);

    // Outer vertical cylinder envelope around the block tube ("pseudo cilindro")
    const outerCylGeom = new THREE.CylinderGeometry(tubeRadiusOuter, tubeRadiusOuter, tubeLengthTotal, 24, 24, true);
    const outerCylMesh = new THREE.Mesh(outerCylGeom, cylOuterMat);
    outerCylMesh.name = `TubeCylinderOuter_${name}`;
    outerCylMesh.position.set(0, -tubeLengthTotal / 2, 0); // Centers along vertical shaft
    outerCylMesh.castShadow = true;
    outerCylMesh.receiveShadow = true;
    outerCylMesh.userData.basePositions = new Float32Array(outerCylGeom.attributes.position.array);
    outerCylMesh.userData.holes = [];
    carrierMesh.add(outerCylMesh);

    // Inner hollow cylinder lining the empty 1-block cylindrical bore (NO RINGS, 100% HOLLOW INSIDE!)
    const innerCylGeom = new THREE.CylinderGeometry(tubeRadiusInner, tubeRadiusInner, tubeLengthTotal, 24, 24, true);
    const innerCylMesh = new THREE.Mesh(innerCylGeom, cylInnerMat);
    innerCylMesh.name = `TubeCylinderInner_${name}`;
    innerCylMesh.position.set(0, -tubeLengthTotal / 2, 0);
    innerCylMesh.receiveShadow = true;
    innerCylMesh.userData.basePositions = new Float32Array(innerCylGeom.attributes.position.array);
    innerCylMesh.userData.holes = [];
    carrierMesh.add(innerCylMesh);

    // 2. SUBTERRANEAN BRANCHING CAVES AT THE BOTTOM ("cuevas aleatorias")
    const bottomY = -tubeLengthTotal; // Bottom elevation underground
    const caveBranches = [
      { name: 'south_west', angle: -0.4 * Math.PI, length: 10, dy: -0.1 },
      { name: 'south_east', angle: 0.35 * Math.PI, length: 11, dy: 0.1 },
      { name: 'north_west', angle: -0.85 * Math.PI, length: 9, dy: 0.0 },
      { name: 'north_east', angle: 0.8 * Math.PI, length: 12, dy: 0.15 },
    ];

    const upAxis = new THREE.Vector3(0, 1, 0);

    for (const br of caveBranches) {
      const brLen = br.length * cubeSize;
      const sinA = Math.sin(br.angle);
      const cosA = Math.cos(br.angle);

      // Branch cylinder tunnel section connecting with blocks
      const brCylGeom = new THREE.CylinderGeometry(tubeRadiusOuter * 0.95, tubeRadiusOuter * 0.95, brLen, 16, 16, true);
      const brCylMesh = new THREE.Mesh(brCylGeom, cylOuterMat);
      brCylMesh.name = `CaveBranch_${br.name}`;

      // Orient cylinder along branch direction
      const branchDir = new THREE.Vector3(sinA * brLen, br.dy * cubeSize * br.length, cosA * brLen);
      const midPoint = new THREE.Vector3(sinA * brLen * 0.5, bottomY + br.dy * cubeSize * br.length * 0.5, cosA * brLen * 0.5);
      brCylMesh.position.copy(midPoint);

      const normDir = branchDir.clone().normalize();
      brCylMesh.quaternion.setFromUnitVectors(upAxis, normDir);
      brCylMesh.userData.basePositions = new Float32Array(brCylGeom.attributes.position.array);
      brCylMesh.userData.holes = [];
      carrierMesh.add(brCylMesh);

      // Inner tunnel cylinder liner
      const brInnerCylGeom = new THREE.CylinderGeometry(tubeRadiusInner, tubeRadiusInner, brLen, 16, 16, true);
      const brInnerCylMesh = new THREE.Mesh(brInnerCylGeom, cylInnerMat);
      brInnerCylMesh.name = `CaveBranchInner_${br.name}`;
      brInnerCylMesh.position.copy(midPoint);
      brInnerCylMesh.quaternion.copy(brCylMesh.quaternion);
      brInnerCylMesh.userData.basePositions = new Float32Array(brInnerCylGeom.attributes.position.array);
      brInnerCylMesh.userData.holes = [];
      carrierMesh.add(brInnerCylMesh);

      // Per-step block walls, floor, and ceiling along this cave branch with pseudo-cylinders
      for (let s = 1; s <= br.length; s++) {
        const dist = s * cubeSize;
        const cx = sinA * dist;
        const cz = cosA * dist;
        const cy = bottomY + (s / br.length) * br.dy * cubeSize * br.length;

        // Normal perpendicular to branch direction in XZ plane
        const perpX = -cosA * cubeSize;
        const perpZ = sinA * cubeSize;

        // Floor block
        addVoxelAt(cx, cy - cubeSize, cz, stoneMatFloor, stoneFloorColor, 0, true);
        // Ceiling block
        addVoxelAt(cx, cy + cubeSize * 1.5, cz, stoneMat2, stoneColorMedium, 0, true);
        // Left wall block
        addVoxelAt(cx + perpX, cy, cz + perpZ, stoneMat1, stoneColorDark, 0, true);
        // Right wall block
        addVoxelAt(cx - perpX, cy, cz - perpZ, stoneMatAccent, stoneColorAccent, 0, true);

        // Cavern chamber alcoves & stalactites at end of branch
        if (s === br.length) {
          // Cavern pocket
          addVoxelAt(cx + perpX * 1.8, cy, cz + perpZ * 1.8, stoneMat1, stoneColorDark, 0, true);
          addVoxelAt(cx - perpX * 1.8, cy, cz - perpZ * 1.8, stoneMat2, stoneColorMedium, 0, true);
          // Stalactite hanging from ceiling
          addVoxelAt(cx, cy + cubeSize * 0.8, cz, stoneMatAccent, stoneColorAccent, 0, true);
        }
      }
    }

    voxelsGroup.visible = true;
    carrierMesh.add(voxelsGroup);

    const p: Particle3D = {
      id: `${id}_${name}`,
      x: startX,
      y: startY,
      z: startZ,
      oldX: startX,
      oldY: startY,
      oldZ: startZ,
      vx: 0,
      vy: 0,
      vz: 0,
      mass: 50.0,
      radius: 4.0 * cubeSize,
      pinned: true,
      name,
      parentRagdollId: id,
      health: 2000,
      maxHealth: 2000,
      fractured: false,
      dismembered: false,
      isVital: false,
      bleedingRate: 0,
      mesh: carrierMesh,
      contourMesh: outerCylMesh,
      boxDims: [6 * cubeSize, depthBlocks * cubeSize, 6 * cubeSize],
      voxelBlocks,
      voxelsGroup,
    };

    particles.push(p);
    return p;
  }

  // =========================================================================
  // SUBTERRANEAN 1-BLOCK WIDE VERTICAL TUBE (POINTS DOWN) & CAVE NETWORK
  // Placed at ground level (spawnY) pointing DOWNWARDS into subterranean earth
  // =========================================================================
  const verticalDepth = 12; // 12 blocks deep ~ 10.5 meters
  addDownwardCaveTubeAndBranches(
    'cave_tube_vertical' as BodyPartName,
    spawnX,
    spawnY, // Top rim sits flush at spawnY
    spawnZ,
    verticalDepth
  );

  if (scene) {
    scene.add(groupMesh);
  }

  const ragdoll: Ragdoll3D = {
    id,
    name: 'Cave Tentacle',
    particles,
    constraints,
    isAlive: true,
    isGrounded: true,
    isJumping: false,
    charPos: new THREE.Vector3(spawnX, spawnY, spawnZ),
    charVel: new THREE.Vector3(0, 0, 0),
    facingAngle: 0,
    walkCycle: 0,
    totalHealth: 2000,
    scale,
    isControlled: false,
    groupMesh,
    bustMorphValue: 0,
    rampsEnabled: false,
    hasWeapon: false,
    isAiming: false,
    sphericalContourLevel: 0,
    contourLayerEnabled: false,
    contourJointStyle: 'cylinder',
    voxelShape: 'cube',
    erectionLevel: 0,
    isErecting: false,
    isTentacle: true,
    isStaticZone: true,
    tentacleColorHex: stoneColorDark,
    stats: {
      brokenBones: 0,
      dismemberedLimbs: 0,
      bloodLossPercent: 0,
      destroyedBlocks: 0,
    },
    intelligence: 0,
    strength: 100,
    speed: 0,
    jumpPower: 0,
    immunity: 100,
    hearing: 0,
    resilience: 100,
  };

  return ragdoll;
}


