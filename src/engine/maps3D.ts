import * as THREE from 'three';
import { GameMap3D } from '../types/physics3d';

export const GAME_MAPS_3D: Record<string, GameMap3D> = {
  lab: {
    id: 'grass_field',
    name: 'Campo de Sandbox',
    description: 'Terreno amplio de césped verde para combate libre y pruebas físicas de sandbox.',
    width: 120,
    depth: 120,
    gravity: { x: 0, y: -9.81, z: 0 },
    spawnPoint: { x: 0, y: 0, z: 0 },
    theme: 'grassland',
    obstacles: [
      {
        id: 'floor',
        x: 0,
        y: -0.15,
        z: 0,
        width: 140,
        height: 0.3,
        depth: 140,
        color: 0x3f9b2d,
        type: 'ground',
      },
    ],
  },
  cesped2: {
    id: 'cesped2',
    name: 'Bosque de Césped 2 (Colinas & Árboles)',
    description: 'Extenso bosque procedural con subidas y bajadas naturales, árboles de madera y hojas destructibles, césped y capas de tierra 100% destruibles bloque a bloque.',
    width: 180,
    depth: 180,
    gravity: { x: 0, y: -9.81, z: 0 },
    spawnPoint: { x: 0, y: 0, z: 0 },
    theme: 'cesped2',
    obstacles: [
      {
        id: 'floor',
        x: 0,
        y: -0.15,
        z: 0,
        width: 180,
        height: 0.3,
        depth: 180,
        color: 0x3f9b2d,
        type: 'ground',
      },
    ],
  },
  almacen: {
    id: 'almacen',
    name: 'Almacén Industrial',
    description: 'Gran almacén techado con estanterías, cajas de madera destructibles, pasillos angostos y barriles de combustible.',
    width: 60,
    depth: 60,
    gravity: { x: 0, y: -9.81, z: 0 },
    spawnPoint: { x: 0, y: 0, z: 0 },
    theme: 'almacen',
    obstacles: [
      {
        id: 'floor',
        x: 0,
        y: -0.15,
        z: 0,
        width: 60,
        height: 0.3,
        depth: 60,
        color: 0x475569,
        type: 'ground',
      },
    ],
  },
};

export const CESPED2_BLOCK_SIZE = 0.88;
export const CESPED2_STEP_HEIGHT = 0.88;

/**
 * Quantized stepped elevation for Minecraft-style voxel landscape
 */
export function getMinecraftElevationTier(x: number, z: number): number {
  const distFromCenter = Math.sqrt(x * x + z * z);
  const clearingFactor = THREE.MathUtils.smoothstep(distFromCenter, 2.5, 9.0);

  // Multi-frequency hill noise with ridges
  const wave1 = Math.sin(x * 0.065) * Math.cos(z * 0.065) * 3.4;
  const wave2 = Math.sin(x * 0.13 + z * 0.09) * 1.6;
  const wave3 = Math.cos(x * 0.035 - z * 0.055) * 2.2;
  const wave4 = Math.sin(x * 0.24 - z * 0.20) * 0.6;
  const rawH = (wave1 + wave2 + wave3 + wave4) * clearingFactor;

  return Math.round(rawH / CESPED2_STEP_HEIGHT);
}

/**
 * Calculates terraced plateau levels and smooth sloped ramps for Cesped 2 voxel terrain
 */
export function getForestTerrainHeight(x: number, z: number): number {
  const B = CESPED2_BLOCK_SIZE;
  const H = CESPED2_STEP_HEIGHT;

  const gx = x / B;
  const gz = z / B;
  const ix = Math.floor(gx);
  const iz = Math.floor(gz);
  const fx = THREE.MathUtils.clamp(gx - ix, 0, 1);
  const fz = THREE.MathUtils.clamp(gz - iz, 0, 1);

  // Elevation tiers at the 4 grid corners
  const t00 = getMinecraftElevationTier(ix * B, iz * B);
  const t10 = getMinecraftElevationTier((ix + 1) * B, iz * B);
  const t01 = getMinecraftElevationTier(ix * B, (iz + 1) * B);
  const t11 = getMinecraftElevationTier((ix + 1) * B, (iz + 1) * B);

  // Bilinear ramp surface connecting discrete Minecraft terraces
  const topTier = t00 * (1 - fx) * (1 - fz) +
                  t10 * fx * (1 - fz) +
                  t01 * (1 - fx) * fz +
                  t11 * fx * fz;

  return topTier * H;
}

/**
 * Calculates surface normal vector on Cesped 2 terrain for rotating ramp blocks
 */
export function getForestTerrainNormal(x: number, z: number, sampleDist: number = 0.22): THREE.Vector3 {
  const hR = getForestTerrainHeight(x + sampleDist, z);
  const hL = getForestTerrainHeight(x - sampleDist, z);
  const hU = getForestTerrainHeight(x, z + sampleDist);
  const hD = getForestTerrainHeight(x, z - sampleDist);
  const dhdx = (hR - hL) / (2 * sampleDist);
  const dhdz = (hU - hD) / (2 * sampleDist);
  return new THREE.Vector3(-dhdx, 1.0, -dhdz).normalize();
}

let _cachedDirtTexture: THREE.CanvasTexture | null = null;
let _cachedWoodTexture: THREE.CanvasTexture | null = null;
let _cachedLeavesTexture: THREE.CanvasTexture | null = null;
let _cachedGrassTexture: THREE.CanvasTexture | null = null;
let _cachedSlimeTexture: THREE.CanvasTexture | null = null;
let _cachedSkinTexture: THREE.CanvasTexture | null = null;

/**
 * Generates rich procedural dark dirt texture with organic loam, earth granules, and soil tones
 */
export function createProceduralDirtTexture(): THREE.CanvasTexture {
  if (_cachedDirtTexture) return _cachedDirtTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Rich earthy base soil
    ctx.fillStyle = '#3e2311';
    ctx.fillRect(0, 0, 256, 256);

    const soilColors = [
      '#451a03',
      '#78350f',
      '#92400e',
      '#2d1808',
      '#5c2e10',
      '#371c08',
      '#633310',
      '#1c0f05',
    ];

    for (let i = 0; i < 1800; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const s = 1.5 + Math.random() * 3.0;
      ctx.fillStyle = soilColors[Math.floor(Math.random() * soilColors.length)];
      ctx.fillRect(x, y, s, s);
    }

    // Small organic pebbles / stones
    ctx.fillStyle = '#71717a';
    for (let i = 0; i < 90; i++) {
      const px = Math.random() * 256;
      const py = Math.random() * 256;
      ctx.fillRect(px, py, 2.5, 2.5);
    }

    // Subtle fine border
    ctx.strokeStyle = '#271306';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, 256, 256);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  _cachedDirtTexture = tex;
  return tex;
}

/**
 * Generates procedural tree bark wood texture with vertical grain streaks and bark grooves
 */
export function createProceduralWoodTexture(): THREE.CanvasTexture {
  if (_cachedWoodTexture) return _cachedWoodTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(0, 0, 256, 256);

    const barkColors = ['#452a16', '#6e472a', '#3b2210', '#7d5232', '#2f1b0c'];

    // Vertical bark grain strips
    for (let i = 0; i < 600; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const w = 1.5 + Math.random() * 2.5;
      const h = 8 + Math.random() * 28;
      ctx.fillStyle = barkColors[Math.floor(Math.random() * barkColors.length)];
      ctx.fillRect(x, y, w, h);
    }

    // Bark groove lines
    ctx.strokeStyle = '#2a1608';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 40; i++) {
      const gx = Math.random() * 256;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx + (Math.random() - 0.5) * 8, 256);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  _cachedWoodTexture = tex;
  return tex;
}

/**
 * Generates procedural leafy foliage texture for forest tree canopies
 */
export function createProceduralLeavesTexture(): THREE.CanvasTexture {
  if (_cachedLeavesTexture) return _cachedLeavesTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1e4620';
    ctx.fillRect(0, 0, 256, 256);

    const leafGreens = [
      '#2d6a4f',
      '#40916c',
      '#52b788',
      '#1b4332',
      '#388e3c',
      '#43a047',
      '#66bb6a',
      '#2e7d32',
      '#14532d',
    ];

    for (let i = 0; i < 2200; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const s = 2.0 + Math.random() * 3.5;
      ctx.fillStyle = leafGreens[Math.floor(Math.random() * leafGreens.length)];
      ctx.fillRect(x, y, s, s);
    }

    // Fine leaf cluster outlines
    ctx.strokeStyle = '#143d22';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, 256, 256);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  _cachedLeavesTexture = tex;
  return tex;
}

/**
 * Generates the rich high-detail procedural grass texture with grass blades, organic soil, and moss
 */
export function createProceduralGrassTexture(): THREE.CanvasTexture {
  if (_cachedGrassTexture) return _cachedGrassTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Rich base lawn soil/grass underlayer
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#2d6a4f');
    grad.addColorStop(0.5, '#1b4332');
    grad.addColorStop(1, '#24593f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Organic soil and moss speckles under grass
    for (let i = 0; i < 2500; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const s = Math.random() * 2.5 + 1;
      ctx.fillStyle = Math.random() > 0.4 ? '#163824' : '#081c15';
      ctx.fillRect(x, y, s, s);
    }

    // Rich grass patches & clusters
    const greens = [
      '#2d6a4f',
      '#40916c',
      '#52b788',
      '#388e3c',
      '#43a047',
      '#4caf50',
      '#66bb6a',
      '#7cb342',
      '#8bc34a',
      '#558b2f',
      '#33691e',
    ];

    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const w = 1.5 + Math.random() * 3.5;
      const h = 1.5 + Math.random() * 3.5;
      ctx.fillStyle = greens[Math.floor(Math.random() * greens.length)];
      ctx.fillRect(x, y, w, h);
    }

    // Realistic individual grass blades with varied angles and blade tips
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3500; i++) {
      const gx = Math.random() * 512;
      const gy = Math.random() * 512;
      const bladeLength = 4 + Math.random() * 7;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;
      const bladeColor = greens[Math.floor(Math.random() * greens.length)];

      ctx.strokeStyle = bladeColor;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + Math.cos(angle) * bladeLength, gy + Math.sin(angle) * bladeLength);
      ctx.stroke();
    }

    // Subtle fine grid outline for clean spatial voxel orientation
    ctx.strokeStyle = '#1b4332';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 512, 512);
  }

  const grassTexture = new THREE.CanvasTexture(canvas);
  grassTexture.wrapS = THREE.RepeatWrapping;
  grassTexture.wrapT = THREE.RepeatWrapping;
  grassTexture.repeat.set(32, 32);
  grassTexture.generateMipmaps = true;
  _cachedGrassTexture = grassTexture;
  return grassTexture;
}

/**
 * Generates procedural translucent glossy green Slime texture with bubbles and specular highlights
 */
export function createProceduralSlimeTexture(): THREE.CanvasTexture {
  if (_cachedSlimeTexture) return _cachedSlimeTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Radial gradient for vibrant jelly depth
    const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.5, '#facc15');
    grad.addColorStop(0.85, '#ca8a04');
    grad.addColorStop(1, '#a16207');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Inner gel floating bubbles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let i = 0; i < 60; i++) {
      const bx = Math.random() * 256;
      const by = Math.random() * 256;
      const br = 2 + Math.random() * 6;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glossy light reflections
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.ellipse(64, 64, 32, 16, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Subtle edge contour outline
    ctx.strokeStyle = '#854d0e';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, 256, 256);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  _cachedSlimeTexture = tex;
  return tex;
}

/**
 * Generates procedural organic human skin texture with pores and flesh tone variation
 */
export function createProceduralSkinTexture(): THREE.CanvasTexture {
  if (_cachedSkinTexture) return _cachedSkinTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Rich flesh base tone
    ctx.fillStyle = '#e2a784';
    ctx.fillRect(0, 0, 256, 256);

    const skinTones = ['#d19c80', '#f0b898', '#cca088', '#e8b292', '#c98e72', '#f5c2a5'];
    for (let i = 0; i < 1200; i++) {
      const px = Math.random() * 256;
      const py = Math.random() * 256;
      const ps = 1.2 + Math.random() * 2.8;
      ctx.fillStyle = skinTones[Math.floor(Math.random() * skinTones.length)];
      ctx.fillRect(px, py, ps, ps);
    }

    // Fine organic skin lines & micro-creases
    ctx.strokeStyle = 'rgba(150, 90, 70, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 256, Math.random() * 256);
      ctx.lineTo(Math.random() * 256, Math.random() * 256);
      ctx.stroke();
    }

    // Edge outline
    ctx.strokeStyle = '#b87c63';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 256, 256);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

/**
 * Creates procedural environment (grass floor, neighborhood streets/sidewalks, or construction site)
 */
export function buildSceneEnvironment3D(scene: THREE.Scene, map: GameMap3D): THREE.Group {
  const envGroup = new THREE.Group();
  envGroup.name = 'map_environment';

  if (map.theme === 'cesped2' || map.id === 'cesped2') {
    // Underlayer dark earth substrate sitting beneath destructible hills (infinite bounds)
    const bedrockGeom = new THREE.PlaneGeometry(3000, 3000);
    const bedrockMat = new THREE.MeshStandardMaterial({
      color: 0x1c1208, // Dark fertile soil substrate beneath forest hills
      roughness: 0.95,
      metalness: 0.05,
    });
    const bedrockMesh = new THREE.Mesh(bedrockGeom, bedrockMat);
    bedrockMesh.rotation.x = -Math.PI / 2;
    bedrockMesh.position.y = -3.5;
    envGroup.add(bedrockMesh);
  } else if (map.theme === 'neighborhood') {
    // ==========================================
    // 1. NEIGHBORHOOD MAP: GRASS LOTS & ASPHALT STREETS
    // ==========================================

    // 1.1 Base Grass Layer
    const grassCanvas = document.createElement('canvas');
    grassCanvas.width = 256;
    grassCanvas.height = 256;
    const gCtx = grassCanvas.getContext('2d');
    if (gCtx) {
      gCtx.fillStyle = '#22c55e'; // Vibrant suburban lawn green
      gCtx.fillRect(0, 0, 256, 256);
      const greens = ['#16a34a', '#15803d', '#4ade80', '#166534'];
      for (let i = 0; i < 800; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        gCtx.fillStyle = greens[Math.floor(Math.random() * greens.length)];
        gCtx.fillRect(x, y, 2 + Math.random() * 3, 2 + Math.random() * 3);
      }
    }
    const grassTex = new THREE.CanvasTexture(grassCanvas);
    grassTex.wrapS = THREE.RepeatWrapping;
    grassTex.wrapT = THREE.RepeatWrapping;
    grassTex.repeat.set(32, 32);

    const baseGrassGeom = new THREE.PlaneGeometry(180, 180);
    const baseGrassMat = new THREE.MeshStandardMaterial({
      map: grassTex,
      roughness: 0.85,
      metalness: 0.05,
    });
    const baseGrass = new THREE.Mesh(baseGrassGeom, baseGrassMat);
    baseGrass.rotation.x = -Math.PI / 2;
    baseGrass.position.y = 0;
    envGroup.add(baseGrass);

    // 1.2 Asphalt Road Network (Crossroads: Main Avenue Z-axis, Cross Street X-axis)
    const asphaltCanvas = document.createElement('canvas');
    asphaltCanvas.width = 128;
    asphaltCanvas.height = 128;
    const aCtx = asphaltCanvas.getContext('2d');
    if (aCtx) {
      aCtx.fillStyle = '#1e293b'; // Dark asphalt slate
      aCtx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 400; i++) {
        const x = Math.random() * 128;
        const y = Math.random() * 128;
        aCtx.fillStyle = Math.random() > 0.5 ? '#334155' : '#0f172a';
        aCtx.fillRect(x, y, 1.5, 1.5);
      }
    }
    const asphaltTex = new THREE.CanvasTexture(asphaltCanvas);
    asphaltTex.wrapS = THREE.RepeatWrapping;
    asphaltTex.wrapT = THREE.RepeatWrapping;
    asphaltTex.repeat.set(6, 60);

    const roadMat = new THREE.MeshStandardMaterial({
      map: asphaltTex,
      roughness: 0.9,
      metalness: 0.1,
    });

    const roadWidth = 9.0; // 9 meters wide street
    const roadLength = 160.0;

    // Road 1 (North-South / Z-axis)
    const roadZGeom = new THREE.PlaneGeometry(roadWidth, roadLength);
    const roadZ = new THREE.Mesh(roadZGeom, roadMat);
    roadZ.rotation.x = -Math.PI / 2;
    roadZ.position.set(0, 0.015, 0);
    envGroup.add(roadZ);

    // Road 2 (East-West / X-axis)
    const roadXGeom = new THREE.PlaneGeometry(roadLength, roadWidth);
    const roadX = new THREE.Mesh(roadXGeom, roadMat);
    roadX.rotation.x = -Math.PI / 2;
    roadX.position.set(0, 0.016, 0);
    envGroup.add(roadX);

    // 1.3 Concrete Sidewalks / Aceras with Curbs (Bordillos)
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0xcfd8dc,
      roughness: 0.8,
      metalness: 0.05,
    });
    const curbMat = new THREE.MeshStandardMaterial({
      color: 0x90a4ae,
      roughness: 0.75,
      metalness: 0.1,
    });

    const sidewalkWidth = 2.4;
    const lotOffset = roadWidth / 2 + sidewalkWidth / 2;
    const lotSize = 70;

    // 4 Quadrant Concrete Sidewalk Borders
    const quadrants = [
      { qx: -1, qz: -1 }, // North-West
      { qx: 1, qz: -1 },  // North-East
      { qx: -1, qz: 1 },  // South-West
      { qx: 1, qz: 1 },   // South-East
    ];

    quadrants.forEach(({ qx, qz }) => {
      const centerX = qx * (roadWidth / 2 + lotSize / 2);
      const centerZ = qz * (roadWidth / 2 + lotSize / 2);

      // Elevated sidewalk slab around lot edge
      // Z-sidewalk strip
      const swZGeom = new THREE.BoxGeometry(sidewalkWidth, 0.14, lotSize);
      const swZ = new THREE.Mesh(swZGeom, concreteMat);
      swZ.position.set(qx * (roadWidth / 2 + sidewalkWidth / 2), 0.07, qz * (roadWidth / 2 + lotSize / 2));
      envGroup.add(swZ);

      // X-sidewalk strip
      const swXGeom = new THREE.BoxGeometry(lotSize, 0.14, sidewalkWidth);
      const swX = new THREE.Mesh(swXGeom, concreteMat);
      swX.position.set(qx * (roadWidth / 2 + lotSize / 2), 0.07, qz * (roadWidth / 2 + sidewalkWidth / 2));
      envGroup.add(swX);

      // Curb stone edge along Z road
      const curbZGeom = new THREE.BoxGeometry(0.2, 0.18, lotSize);
      const curbZ = new THREE.Mesh(curbZGeom, curbMat);
      curbZ.position.set(qx * (roadWidth / 2 + 0.1), 0.09, qz * (roadWidth / 2 + lotSize / 2));
      envGroup.add(curbZ);

      // Curb stone edge along X road
      const curbXGeom = new THREE.BoxGeometry(lotSize, 0.18, 0.2);
      const curbX = new THREE.Mesh(curbXGeom, curbMat);
      curbX.position.set(qx * (roadWidth / 2 + lotSize / 2), 0.09, qz * (roadWidth / 2 + 0.1));
      envGroup.add(curbX);

      // Corner Street Lamp Post
      const lampX = qx * (roadWidth / 2 + sidewalkWidth * 0.7);
      const lampZ = qz * (roadWidth / 2 + sidewalkWidth * 0.7);

      const lampPoleGeom = new THREE.CylinderGeometry(0.08, 0.1, 4.2, 8);
      const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });
      const lampPole = new THREE.Mesh(lampPoleGeom, lampPoleMat);
      lampPole.position.set(lampX, 2.1, lampZ);
      envGroup.add(lampPole);

      const lampHeadGeom = new THREE.BoxGeometry(0.5, 0.35, 0.5);
      const lampHeadMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xfde047,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      });
      const lampHead = new THREE.Mesh(lampHeadGeom, lampHeadMat);
      lampHead.position.set(lampX, 4.2, lampZ);
      envGroup.add(lampHead);

      // Picket fences around lot borders
      const fenceMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
      for (let f = 0; f < 6; f++) {
        // Front lot fence along Z
        const fz = qz * (roadWidth / 2 + sidewalkWidth + 3 + f * 2.2);
        const fx = qx * (roadWidth / 2 + sidewalkWidth + 1.2);
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), fenceMat);
        post.position.set(fx, 0.45, fz);
        envGroup.add(post);

        const plank = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 2.2), fenceMat);
        plank.position.set(fx, 0.55, fz + (qz * 1.1));
        envGroup.add(plank);
      }
    });

    // 1.4 Road Markings (Zebra Crosswalks & Yellow Dashed Lines)
    const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });

    // Center Dashed Yellow Lines (North-South Road)
    for (let z = -70; z <= 70; z += 4) {
      if (Math.abs(z) < 8) continue; // Skip intersection center
      const dashGeom = new THREE.PlaneGeometry(0.22, 2.2);
      const dash = new THREE.Mesh(dashGeom, yellowLineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.022, z);
      envGroup.add(dash);
    }

    // Center Dashed Yellow Lines (East-West Road)
    for (let x = -70; x <= 70; x += 4) {
      if (Math.abs(x) < 8) continue; // Skip intersection center
      const dashGeom = new THREE.PlaneGeometry(2.2, 0.22);
      const dash = new THREE.Mesh(dashGeom, yellowLineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.022, 0);
      envGroup.add(dash);
    }

    // Pedestrian Zebra Crosswalks (Rayados Peatonales) at 4 sides of intersection
    const makeCrosswalk = (cx: number, cz: number, isHorizontal: boolean) => {
      for (let s = -3.5; s <= 3.5; s += 0.9) {
        const stripeGeom = isHorizontal
          ? new THREE.PlaneGeometry(0.55, 1.8)
          : new THREE.PlaneGeometry(1.8, 0.55);
        const stripe = new THREE.Mesh(stripeGeom, whiteLineMat);
        stripe.rotation.x = -Math.PI / 2;
        if (isHorizontal) {
          stripe.position.set(cx + s, 0.025, cz);
        } else {
          stripe.position.set(cx, 0.025, cz + s);
        }
        envGroup.add(stripe);
      }
    };

    makeCrosswalk(0, -6.2, true);  // North crosswalk
    makeCrosswalk(0, 6.2, true);   // South crosswalk
    makeCrosswalk(-6.2, 0, false); // West crosswalk
    makeCrosswalk(6.2, 0, false);  // East crosswalk

  } else if (map.theme === 'construction') {
    // 1. Procedural Cement Texture Canvas (Low quality)
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#64748b'; // Slate gray
      ctx.fillRect(0, 0, 64, 64);
      for (let i = 0; i < 200; i++) {
        const x = Math.random() * 64;
        const y = Math.random() * 64;
        const size = Math.random() * 2 + 1;
        ctx.fillStyle = Math.random() > 0.5 ? '#94a3b8' : '#475569';
        ctx.fillRect(x, y, size, size);
      }
    }
    const cementTexture = new THREE.CanvasTexture(canvas);
    cementTexture.wrapS = THREE.RepeatWrapping;
    cementTexture.wrapT = THREE.RepeatWrapping;
    cementTexture.repeat.set(40, 40);
    cementTexture.magFilter = THREE.NearestFilter;
    cementTexture.minFilter = THREE.NearestFilter;

    // 2. Main Cement Ground Plane
    const floorGeom = new THREE.PlaneGeometry(160, 160);
    const floorMat = new THREE.MeshStandardMaterial({
      map: cementTexture,
      roughness: 0.9,
      metalness: 0.1,
    });
    const floorMesh = new THREE.Mesh(floorGeom, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = false;
    envGroup.add(floorMesh);

    // 3. Subtle Grid overlay
    const gridHelper = new THREE.GridHelper(160, 80, 0x000000, 0x000000);
    gridHelper.position.y = 0.005;
    (gridHelper.material as THREE.Material).opacity = 0.2;
    (gridHelper.material as THREE.Material).transparent = true;
    envGroup.add(gridHelper);
  } else if (map.theme === 'generate') {
    // 1. High-Detail Procedural Deep Bedrock Substrate Canvas
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1c1917'; // Dark deep bedrock
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 600; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const s = Math.random() * 3 + 1;
        ctx.fillStyle = Math.random() > 0.5 ? '#292524' : '#0c0a09';
        ctx.fillRect(x, y, s, s);
      }
    }
    const bedrockTexture = new THREE.CanvasTexture(canvas);
    bedrockTexture.wrapS = THREE.RepeatWrapping;
    bedrockTexture.wrapT = THREE.RepeatWrapping;
    bedrockTexture.repeat.set(24, 24);

    // Deep substrate plane sitting beneath the destructible voxel terrain
    const bedrockGeom = new THREE.PlaneGeometry(200, 200);
    const bedrockMat = new THREE.MeshStandardMaterial({
      map: bedrockTexture,
      roughness: 0.95,
      metalness: 0.05,
    });
    const bedrockMesh = new THREE.Mesh(bedrockGeom, bedrockMat);
    bedrockMesh.rotation.x = -Math.PI / 2;
    bedrockMesh.position.y = -0.05;
    envGroup.add(bedrockMesh);
  } else if (map.theme === 'almacen') {
    // 1. Warehouse concrete floor texture with yellow hazard warning stripes
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Concrete gray base
      ctx.fillStyle = '#475569';
      ctx.fillRect(0, 0, 512, 512);
      
      // Concrete grain / speckled texture
      for (let i = 0; i < 20000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const col = Math.random() > 0.5 ? '#334155' : '#64748b';
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      }

      // Expansion joints (concrete slabs)
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      for (let offset = 0; offset <= 512; offset += 128) {
        ctx.beginPath();
        ctx.moveTo(offset, 0);
        ctx.lineTo(offset, 512);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, offset);
        ctx.lineTo(512, offset);
        ctx.stroke();
      }

      // Yellow caution lines at the edges (hazard stripe borders)
      ctx.strokeStyle = '#eab308'; // Amber yellow
      ctx.lineWidth = 16;
      ctx.strokeRect(8, 8, 496, 496);
      
      // Hazard diagonal black stripes on yellow lines
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 8;
      for (let i = 0; i < 512; i += 32) {
        // Top border
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 16, 16); ctx.stroke();
        // Bottom border
        ctx.beginPath(); ctx.moveTo(i, 496); ctx.lineTo(i + 16, 512); ctx.stroke();
        // Left border
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(16, i + 16); ctx.stroke();
        // Right border
        ctx.beginPath(); ctx.moveTo(496, i); ctx.lineTo(512, i + 16); ctx.stroke();
      }
    }

    const concreteTexture = new THREE.CanvasTexture(canvas);
    concreteTexture.wrapS = THREE.RepeatWrapping;
    concreteTexture.wrapT = THREE.RepeatWrapping;
    concreteTexture.repeat.set(10, 10);

    const floorGeom = new THREE.PlaneGeometry(60, 60);
    const floorMat = new THREE.MeshStandardMaterial({
      map: concreteTexture,
      roughness: 0.7,
      metalness: 0.2,
    });
    const floorMesh = new THREE.Mesh(floorGeom, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0.005; // Slightly elevated to prevent z-fighting with bedrock
    floorMesh.receiveShadow = true;
    envGroup.add(floorMesh);

    // 2. High Industrial Warehouse Brick/Concrete Walls
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Slate dark gray concrete panels
      roughness: 0.9,
      metalness: 0.1,
    });

    const wallHeight = 10;
    const halfWidth = 30;

    // Back wall
    const backWallGeom = new THREE.BoxGeometry(60, wallHeight, 1);
    const backWall = new THREE.Mesh(backWallGeom, wallMat);
    backWall.position.set(0, wallHeight / 2, -halfWidth);
    envGroup.add(backWall);

    // Front wall (with large open hangar door space)
    const leftFrontGeom = new THREE.BoxGeometry(24, wallHeight, 1);
    const leftFront = new THREE.Mesh(leftFrontGeom, wallMat);
    leftFront.position.set(-18, wallHeight / 2, halfWidth);
    envGroup.add(leftFront);

    const rightFrontGeom = new THREE.BoxGeometry(24, wallHeight, 1);
    const rightFront = new THREE.Mesh(rightFrontGeom, wallMat);
    rightFront.position.set(18, wallHeight / 2, halfWidth);
    envGroup.add(rightFront);

    const topFrontGeom = new THREE.BoxGeometry(12, 3, 1);
    const topFront = new THREE.Mesh(topFrontGeom, wallMat);
    topFront.position.set(0, wallHeight - 1.5, halfWidth);
    envGroup.add(topFront);

    // Left wall
    const leftWallGeom = new THREE.BoxGeometry(1, wallHeight, 60);
    const leftWall = new THREE.Mesh(leftWallGeom, wallMat);
    leftWall.position.set(-halfWidth, wallHeight / 2, 0);
    envGroup.add(leftWall);

    // Right wall
    const rightWallGeom = new THREE.BoxGeometry(1, wallHeight, 60);
    const rightWall = new THREE.Mesh(rightWallGeom, wallMat);
    rightWall.position.set(halfWidth, wallHeight / 2, 0);
    envGroup.add(rightWall);

    // 3. High Ceiling with Steel Trusses/Beams
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.5,
      metalness: 0.8,
    });

    const roofPlateGeom = new THREE.PlaneGeometry(60, 60);
    const roofPlateMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Dark industrial techado paneling
      roughness: 0.95,
      metalness: 0.1,
    });
    const roofPlate = new THREE.Mesh(roofPlateGeom, roofPlateMat);
    roofPlate.rotation.x = Math.PI / 2;
    roofPlate.position.set(0, wallHeight, 0);
    envGroup.add(roofPlate);

    // Steel trusses running along Z and X axes
    for (let xOffset = -25; xOffset <= 25; xOffset += 12.5) {
      const beamGeom = new THREE.BoxGeometry(0.3, 0.4, 60);
      const beam = new THREE.Mesh(beamGeom, metalMat);
      beam.position.set(xOffset, wallHeight - 0.2, 0);
      envGroup.add(beam);
    }
    for (let zOffset = -25; zOffset <= 25; zOffset += 12.5) {
      const beamGeom = new THREE.BoxGeometry(60, 0.4, 0.3);
      const beam = new THREE.Mesh(beamGeom, metalMat);
      beam.position.set(0, wallHeight - 0.3, zOffset);
      envGroup.add(beam);
    }

    // 4. Industrial Hanging High-Bay Lights (Decorative glowing cylinders)
    const lampCasingGeom = new THREE.CylinderGeometry(0.8, 0.8, 0.4, 8);
    const lampGlowGeom = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 8);

    const casingMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });
    const glowMat = new THREE.MeshStandardMaterial({ color: 0xfffbeb, emissive: 0xfef08a, roughness: 0.1 });

    const lampPositions = [
      { lx: -15, lz: -15 },
      { lx: -15, lz: 15 },
      { lx: 15, lz: -15 },
      { lx: 15, lz: 15 },
      { lx: 0, lz: 0 },
    ];

    lampPositions.forEach(({ lx, lz }) => {
      // Hanging cord
      const cordGeom = new THREE.CylinderGeometry(0.04, 0.04, 2.0, 4);
      const cord = new THREE.Mesh(cordGeom, casingMat);
      cord.position.set(lx, wallHeight - 1.0, lz);
      envGroup.add(cord);

      // Lamp casing
      const casing = new THREE.Mesh(lampCasingGeom, casingMat);
      casing.position.set(lx, wallHeight - 2.0, lz);
      envGroup.add(casing);

      // Glowing lens
      const glow = new THREE.Mesh(lampGlowGeom, glowMat);
      glow.position.set(lx, wallHeight - 2.2, lz);
      envGroup.add(glow);

      // Add a decorative industrial column beneath each main lamp
      const colBaseGeom = new THREE.BoxGeometry(1.4, 0.4, 1.4);
      const colShaftGeom = new THREE.BoxGeometry(1.0, wallHeight - 0.4, 1.0);
      const concreteMat2 = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });

      const colBase = new THREE.Mesh(colBaseGeom, concreteMat2);
      colBase.position.set(lx, 0.2, lz);
      envGroup.add(colBase);

      const colShaft = new THREE.Mesh(colShaftGeom, concreteMat2);
      colShaft.position.set(lx, wallHeight / 2, lz);
      envGroup.add(colShaft);
    });

    // 5. Heavy-Duty Industrial Shelf Racks (Estanterías Industriales)
    const shelfOrangeMat = new THREE.MeshStandardMaterial({ color: 0xea580c, metalness: 0.6, roughness: 0.3 }); // Orange uprights
    const shelfGrayMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5, roughness: 0.4 }); // Dark gray shelf boards

    const spawnShelfRack = (rx: number, rz: number, length: number, height: number, depth: number) => {
      const rackGroup = new THREE.Group();
      rackGroup.position.set(rx, 0, rz);

      // 4 Vertical corner posts
      const postW = 0.15;
      const dx = depth / 2 - postW / 2;
      const dz = length / 2 - postW / 2;

      const posts = [
        { px: -dx, pz: -dz },
        { px: dx, pz: -dz },
        { px: -dx, pz: dz },
        { px: dx, pz: dz },
      ];

      posts.forEach(({ px, pz }) => {
        const postGeom = new THREE.BoxGeometry(postW, height, postW);
        const post = new THREE.Mesh(postGeom, shelfOrangeMat);
        post.position.set(px, height / 2, pz);
        rackGroup.add(post);
      });

      // 3 Horizontal shelf beams/boards
      const shelfH = 0.08;
      const shelfLevels = [0.1, height * 0.45, height * 0.85];

      shelfLevels.forEach((sy) => {
        const boardGeom = new THREE.BoxGeometry(depth, shelfH, length);
        const board = new THREE.Mesh(boardGeom, shelfGrayMat);
        board.position.set(0, sy, 0);
        rackGroup.add(board);
      });

      envGroup.add(rackGroup);
    };

    // Spawn 2 parallel rows of heavy industrial shelves on either side of the central aisle
    // Left Row
    spawnShelfRack(-12, -18, 12, 5.5, 2.0);
    spawnShelfRack(-12, 0, 12, 5.5, 2.0);
    spawnShelfRack(-12, 18, 12, 5.5, 2.0);

    // Right Row
    spawnShelfRack(12, -18, 12, 5.5, 2.0);
    spawnShelfRack(12, 0, 12, 5.5, 2.0);
    spawnShelfRack(12, 18, 12, 5.5, 2.0);
  } else {
    // 1. High-Detail Procedural Grass Texture
    const grassTexture = createProceduralGrassTexture();

    // 2. Main Grass Ground Plane
    const floorGeom = new THREE.PlaneGeometry(180, 180);
    const floorMat = new THREE.MeshStandardMaterial({
      map: grassTexture,
      roughness: 0.8,
      metalness: 0.05,
    });

    const floorMesh = new THREE.Mesh(floorGeom, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = false;
    envGroup.add(floorMesh);

    // 3. Subtle Clean Grid overlay on grass
    const gridHelper = new THREE.GridHelper(180, 90, 0x1b4332, 0x2d6a4f);
    gridHelper.position.y = 0.003;
    (gridHelper.material as THREE.Material).opacity = 0.25;
    (gridHelper.material as THREE.Material).transparent = true;
    envGroup.add(gridHelper);
  }

  // 4. Stylized Voxel Clouds in the Sky
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.0,
  });

  const cloudGroup = new THREE.Group();
  for (let c = 0; c < 12; c++) {
    const cx = (Math.random() - 0.5) * 120;
    const cy = 20 + Math.random() * 10;
    const cz = (Math.random() - 0.5) * 120;

    const singleCloud = new THREE.Group();
    const blocks = 4 + Math.floor(Math.random() * 5);
    for (let b = 0; b < blocks; b++) {
      const bw = 3 + Math.random() * 4;
      const bh = 1.5 + Math.random() * 2;
      const bd = 3 + Math.random() * 4;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), cloudMat);
      mesh.position.set(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 1,
        (Math.random() - 0.5) * 4
      );
      singleCloud.add(mesh);
    }
    singleCloud.position.set(cx, cy, cz);
    cloudGroup.add(singleCloud);
  }
  envGroup.add(cloudGroup);

  scene.add(envGroup);
  return envGroup;
}
