import * as THREE from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import {
  BloodDecal3D,
  BloodParticle3D,
  BodyPartName,
  Bullet3D,
  Constraint3D,
  Bed3D,
  Door3D,
  DoorVoxelBlock,
  DynamicPropBlock,
  GameMap3D,
  MovingPlatform3D,
  Particle3D,
  LiquidBody3D,
  LiquidParticle3D,
  Ragdoll3D,
  FaceFeatureMode,
  HotPoseType,
  SoldierNPC,
  SoundWave3D,
  VoxelBlock3D,
  WeaponPickup3D,
  WoundBloodJet3D,
  JellyDebrisParticle3D,
  InspectedBlockInfo,
  ElectroCube3D,
} from '../types/physics3d';
import {
  buildSceneEnvironment3D,
  createProceduralGrassTexture,
  createProceduralDirtTexture,
  createProceduralWoodTexture,
  createProceduralLeavesTexture,
  getForestTerrainHeight,
  getForestTerrainNormal,
} from './maps3D';
import {
  attachWeaponToRagdoll,
  attachHammerToRagdoll,
  createSoldierRagdoll3D,
  createDummyRagdoll3D,
  createFunctionalRagdoll3D,
  createEvilDummyRagdoll3D,
  createTentacleRagdoll3D,
  createZombieRagdoll3D,
  createWeaponPickupGroup,
  createHammerPickupGroup,
  destroyLimbVoxelsAtPoint,
  destroyLimbVoxelsAlongRay,
  paintWoundOnParticleAndAnatomy,
  addConnectedWoundSpheresToLimb,
  detachWeaponFromRagdoll,
  restoreRagdollVoxels,
  toggleRagdollRamps,
  updateRagdollBustAndGlutes,
  getRagdollSkinColor,
  updateRagdollSkinColor,
  updateRagdollSkinSleeves,
  updateRagdollBustMorph,
  updateRagdollSphericalContour,
  applySphericalMorph,
  applyHoleMorphToMesh,
  updateRagdollVoxelShape,
  updateRagdollGenitals,
  updateRagdollErection,
  applyShirtToRagdoll,
  applyPantsToRagdoll,
  SHIRT_BODY_PARTS,
  PANTS_BODY_PARTS,
  applyAllClothingToRagdoll,
  applyXRayModeToRagdoll,
  addHairAndAccessoriesToHead,
  createWerewolfRagdoll3D,
  createLiquidBody3D,
  createPool3D,
  createVoxelProp3D,
  rebuildRagdollVoxelDensity,
  createPseudo3DContourMesh,
  getPartBaseCylinderRadius,
  getConstraintCylinderRadii,
  createCaveTentacleRagdoll3D,
  createArticulatedRagdoll3D,
  setupPubicHair,
  syncRagdollMeshes3D,
} from './ragdollBuilder3D';
import {
  updateHotNPCAIEngine,
  applyHotNPCPose,
  getPosePartnerParticleOffset,
} from './hotPoseEngine';
import { soundEngine } from './soundEngine';
import { RemotePlayerState } from './multiplayerClient';
import { RapierManager } from './rapierManager';
import { RapierRagdollBuilder } from './rapierRagdollBuilder';
import { CannonRagdollEngine } from './cannonRagdollEngine';
import { RealisticFluidEngine } from './realisticFluidEngine';
import { BulletHoleManager, paintCanvasBulletWoundOnMesh } from './bulletHoleShader';
import { WeatherSystem, WeatherType } from './weatherSystem';
import { updateAnimeFace } from './animeFaceRenderer';
import { updateVoxel3DFace, setupVoxel3DFace } from './voxelFaceRenderer';
import {
  createElectroCube3D,
  applyElectroCubeProperties,
  updateElectroCubePhysics,
} from './electroCubeEngine';

const _slimeCenterline = new THREE.Vector3();
const _slimeVCurr = new THREE.Vector3();
const _slimeToCenterline = new THREE.Vector3();

export interface VoxelDebrisParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  life: number;
  decay: number;
  color: number;
  mesh: THREE.Mesh;
}

const textureCache: Record<string, THREE.CanvasTexture> = {};

// Reusable zero-allocation scratch objects for high-performance physics & rendering
const _scratchVec1 = new THREE.Vector3();
const _scratchVec2 = new THREE.Vector3();
const _scratchVec3 = new THREE.Vector3();
const _scratchVec4 = new THREE.Vector3();
const _scratchVec5 = new THREE.Vector3();
const _scratchMat1 = new THREE.Matrix4();
const _scratchQuat1 = new THREE.Quaternion();
const _scratchQuat2 = new THREE.Quaternion();

function getLowResTexture(type: string): THREE.CanvasTexture | null {
  if (textureCache[type]) return textureCache[type];
  
  if (type === 'brick' || type === 'stone' || type === 'water' || type === 'fur' || type === 'leaf' || type === 'roof' || type === 'wall' || type === 'glass' || type === 'slime' || type === 'skin') {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    if (type === 'brick') {
      ctx.fillStyle = '#8b2514';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#cccccc';
      // Mortar joints
      ctx.fillRect(0, 14, 32, 4);
      ctx.fillRect(14, 0, 4, 14);
      ctx.fillRect(0, 18, 4, 14);
      ctx.fillRect(28, 18, 4, 14);
    } else if (type === 'stone') { // Cement
      ctx.fillStyle = '#64748b';
      ctx.fillRect(0, 0, 32, 32);
      for(let i=0; i<30; i++) {
        const x = Math.random() * 32;
        const y = Math.random() * 32;
        const size = Math.random() * 2 + 1;
        ctx.fillStyle = Math.random() > 0.5 ? '#94a3b8' : '#475569';
        ctx.fillRect(x, y, size, size);
      }
    } else if (type === 'water') {
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for(let i=0; i<10; i++) {
        const x = Math.random() * 32;
        const y = Math.random() * 32;
        const size = Math.random() * 6 + 2;
        ctx.fillRect(x, y, size, size);
      }
    } else if (type === 'leaf') {
      ctx.fillStyle = '#15803d'; // Rich foliage green
      ctx.fillRect(0, 0, 32, 32);
      for (let i = 0; i < 35; i++) {
        const x = Math.random() * 32;
        const y = Math.random() * 32;
        const size = Math.random() * 3 + 1;
        ctx.fillStyle = Math.random() > 0.5 ? '#22c55e' : (Math.random() > 0.5 ? '#166534' : '#4ade80');
        ctx.fillRect(x, y, size, size);
      }
    } else if (type === 'roof') {
      ctx.fillStyle = '#991b1b'; // Terracotta roof tiles
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(0, 8, 32, 2);
      ctx.fillRect(0, 16, 32, 2);
      ctx.fillRect(0, 24, 32, 2);
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(8, 0, 2, 8);
      ctx.fillRect(24, 0, 2, 8);
      ctx.fillRect(16, 8, 2, 8);
      ctx.fillRect(0, 16, 2, 8);
      ctx.fillRect(16, 24, 2, 8);
    } else if (type === 'wall') {
      ctx.fillStyle = '#e2e8f0'; // Siding plaster
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(0, 10, 32, 1.5);
      ctx.fillRect(0, 21, 32, 1.5);
    } else if (type === 'glass') {
      ctx.fillStyle = '#93c5fd';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(4, 4, 10, 3);
      ctx.fillRect(18, 18, 8, 3);
    } else if (type === 'fur') {
      ctx.fillStyle = '#292524'; // Dark wolf fur base
      ctx.fillRect(0, 0, 32, 32);
      for (let i = 0; i < 45; i++) {
        const x = Math.floor(Math.random() * 32);
        const y = Math.floor(Math.random() * 32);
        const w = Math.floor(Math.random() * 3 + 1);
        const h = Math.floor(Math.random() * 3 + 1);
        ctx.fillStyle = Math.random() > 0.5 ? '#44403c' : (Math.random() > 0.5 ? '#1c1917' : '#57534e');
        ctx.fillRect(x, y, w, h);
      }
    } else if (type === 'slime') {
      ctx.fillStyle = '#10b981'; // Lucid emerald slime green
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#34d399'; // Bright highlights
      for (let i = 0; i < 15; i++) {
        const x = Math.random() * 32;
        const y = Math.random() * 32;
        const size = Math.random() * 3 + 2;
        ctx.fillRect(x, y, size, size);
      }
    } else if (type === 'skin') {
      ctx.fillStyle = '#e2a784'; // Organic skin tone
      ctx.fillRect(0, 0, 32, 32);
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * 32;
        const y = Math.random() * 32;
        ctx.fillStyle = Math.random() > 0.5 ? '#d19c80' : '#f0b898';
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter; // Low quality retro look
    tex.minFilter = THREE.NearestFilter;
    textureCache[type] = tex;
    return tex;
  }
  return null;
}

export class PhysicsEngine3D {
  public scene: THREE.Scene;
  public ragdolls: Ragdoll3D[] = [];
  public bloodParticles: BloodParticle3D[] = [];
  public woundBloodJets: WoundBloodJet3D[] = [];
  public cutterRedSpheres: { mesh: THREE.Mesh; life: number }[] = [];
  public persistentBloodMeshes: THREE.Mesh[] = [];
  public bloodDecals: BloodDecal3D[] = [];
  public electroCubes: ElectroCube3D[] = [];
  public voxelBlocks: VoxelBlock3D[] = [];
  public weaponPickups: WeaponPickup3D[] = [];
  public soldiers: SoldierNPC[] = [];
  public bullets: Bullet3D[] = [];
  public debrisParticles: VoxelDebrisParticle[] = [];
  public dynamicProps: DynamicPropBlock[] = [];
  public jellyDebris: JellyDebrisParticle3D[] = [];
  public slimeTendrils: {
    id: string;
    slimeBlockId: string;
    ragdollId: string;
    particleName?: string;
    cavityPos: THREE.Vector3;
    mesh: THREE.Mesh;
    life: number;
  }[] = [];
  public liquidBodies: LiquidBody3D[] = [];
  public pools: THREE.Group[] = [];
  public soundWaves: SoundWave3D[] = [];
  public showSoundWaves: boolean = true;
  public inspectedBlockInfo: InspectedBlockInfo | null = null;
  private lastInspectedBlockId: string | null = null;
  public xrayMode: number = 0; // 0 = Normal, 1 = Sin Piel, 2 = Solo Esqueleto, 3 = Rayos X Holográfico
  public camera?: THREE.Camera;
  public contourLevel: number = 100;
  public contourSmoothness: number = 100;
  public contourEnabled: boolean = true;
  public contourJointStyle: 'pseudo3d' | 'blocky' | 'cylinder' = 'pseudo3d';
  public bodyCubicity: number = 24;
  public limbSizeMultiplier: number = 1.0;
  public adjuntEnabled: boolean = false;
  public map: GameMap3D;
  public onRagdollReaction?: (ragdollId: string, ragdollName: string, phrase: string) => void;
  private rapierBuilders: Map<string, RapierRagdollBuilder> = new Map();

  public setContourLevel(level: number, ragdollId?: string) {
    this.contourLevel = THREE.MathUtils.clamp(level, 0, 100);
    this.setSphericalContour(this.contourLevel, this.contourEnabled, ragdollId);
  }

  public setContourSmoothness(smoothness: number, ragdollId?: string) {
    this.contourSmoothness = THREE.MathUtils.clamp(smoothness, 0, 100);
    const cubicity = Math.max(4, Math.min(24, Math.round(4 + (smoothness / 100) * 20)));
    this.setBodyCubicity(cubicity, ragdollId);
  }

  // Sandbox Stats adjustment (0 to 100)
  public intelligence: number = 50;
  public strength: number = 50;
  public speed: number = 50;
  public jumpPower: number = 50;
  public immunity: number = 50;
  public hearing: number = 50;
  public resilience: number = 50;
  public reproduction: number = 50;
  public asesino: number = 50;
  public psicopata: number = 50;
  public amable: number = 50;

  // Hinged Doors list
  public doors: Door3D[] = [];

  // Spawned Beds list
  public beds: Bed3D[] = [];

  // Dynamic Moving Platforms & Hazard Sweeper Blocks list
  public movingPlatforms: MovingPlatform3D[] = [];

  // Static simple house blocks for solid walls
  public houseBlocks: {
    id?: string;
    x: number;
    y: number;
    z: number;
    width: number;
    height: number;
    depth: number;
    mesh: THREE.Mesh;
  }[] = [];

  // Cesped2 Optimized Multi-Layer Instanced Forest Floor & Destructible Trees
  public cesped2InstancedMesh: THREE.InstancedMesh | null = null;
  public cesped2DirtInstancedMesh: THREE.InstancedMesh | null = null;
  public cesped2WoodInstancedMesh: THREE.InstancedMesh | null = null;
  public cesped2LeavesInstancedMesh: THREE.InstancedMesh | null = null;

  public cesped2SubGrassMesh: THREE.InstancedMesh | null = null;
  public cesped2SubDirtMesh: THREE.InstancedMesh | null = null;
  public cesped2SubWoodMesh: THREE.InstancedMesh | null = null;
  public cesped2SubLeavesMesh: THREE.InstancedMesh | null = null;

  public cesped2Blocks: Map<string, { index: number; active: boolean; x: number; y: number; z: number; color: number }> = new Map();
  public cesped2DirtBlocks: Map<string, { index: number; active: boolean; x: number; y: number; z: number; color: number }> = new Map();
  public cesped2WoodBlocks: Map<string, { index: number; active: boolean; x: number; y: number; z: number; color: number }> = new Map();
  public cesped2LeavesBlocks: Map<string, { index: number; active: boolean; x: number; y: number; z: number; color: number }> = new Map();
  public cesped2ColBlocks: Map<number, { y: number; active: boolean }[]> = new Map();

  // Dynamic Full-Block -> Sub-Block division structure
  public cesped2FullBlocks: Map<string, {
    key: string;
    type: 'grass' | 'dirt' | 'wood' | 'leaves';
    fullMesh?: THREE.InstancedMesh | null;
    fullIndex: number;
    x: number;
    y: number;
    z: number;
    color: number;
    subdivided: boolean;
    active: boolean;
    subBlocks: { subKey: string; subIndex: number; sx: number; sy: number; sz: number; x: number; y: number; z: number; active: boolean; color: number }[];
  }> = new Map();

  public timeScale: number = 1.0;
  public voxelShape: 'cube' | 'sphere' = 'cube';
  public isSprinting: boolean = false;
  public isFlying: boolean = false;
  public flyAscend: boolean = false;
  public flyDescend: boolean = false;
  public isGodMode: boolean = false;
  public isZeroGravity: boolean = false;
  public bulletHoleManager: BulletHoleManager;
  public weatherSystem!: WeatherSystem;
  private lastTime: number = performance.now();
  private physicsAccumulator: number = 0;
  private lastPlayerShootTime: number = 0;
  private lastSoundWaveSpawnTime: number = 0;
  public activePenetratorRod: {
    ragdollId: string;
    type: 'male' | 'female';
    progress: number;
    rodMesh: THREE.Object3D;
    speed: number;
    direction: number;
    cleanUp: () => void;
  } | null = null;

  // Shared geometry and material caches to prevent lagging when spawning blood or debris particles
  private sharedBoxGeom = new THREE.BoxGeometry(1, 1, 1);
  private bloodMaterials = new Map<number, THREE.MeshStandardMaterial>();
  private debrisMaterials = new Map<number, THREE.MeshStandardMaterial>();

  constructor(scene: THREE.Scene, initialMap: GameMap3D, ambientLight?: THREE.AmbientLight, sunLight?: THREE.DirectionalLight) {
    this.scene = scene;
    this.map = initialMap;
    this.bulletHoleManager = new BulletHoleManager(this.scene);
    RealisticFluidEngine.getInstance().setScene(this.scene);
    
    let amb = ambientLight;
    let sun = sunLight;
    if (!amb) {
      scene.traverse((child) => {
        if (child instanceof THREE.AmbientLight) {
          amb = child;
        }
      });
    }
    if (!sun) {
      scene.traverse((child) => {
        if (child instanceof THREE.DirectionalLight) {
          sun = child;
        }
      });
    }
    if (!amb) {
      amb = new THREE.AmbientLight(0xffffff, 1.5);
      scene.add(amb);
    }
    if (!sun) {
      sun = new THREE.DirectionalLight(0xffffff, 0.0);
      sun.position.set(20, 35, 20);
      scene.add(sun);
    }
    this.weatherSystem = new WeatherSystem(scene, amb, sun, 'day');
    RapierManager.getInstance().init();
  }

  private checkLineOfSight(observer: Ragdoll3D, target: Ragdoll3D): boolean {
    const head = observer.particles.find(p => p.name === 'cabeza');
    const targetHead = target.particles.find(p => p.name === 'cabeza');
    if (!head || !targetHead) return false;

    const start = new THREE.Vector3(head.x, head.y, head.z);
    const end = new THREE.Vector3(targetHead.x, targetHead.y, targetHead.z);
    const dir = new THREE.Vector3().subVectors(end, start).normalize();
    const dist = start.distanceTo(end);

    // 1. HouseBlocks
    for (const block of this.houseBlocks) {
      if (this.rayIntersectsAABB(start, dir, dist, block)) return false;
    }
    // 2. VoxelBlocks
    for (const block of this.voxelBlocks) {
      const aabb = {
        x: block.x, y: block.y, z: block.z,
        width: block.size, height: block.size, depth: block.size
      };
      if (this.rayIntersectsAABB(start, dir, dist, aabb)) return false;
    }
    // 3. Doors
    for (const door of this.doors) {
      if (door.isDestroyed) continue;
      const aabb = {
        x: door.x, y: door.y, z: door.z,
        width: door.width, height: door.height, depth: door.depth
      };
      if (this.rayIntersectsAABB(start, dir, dist, aabb)) return false;
    }
    // 4. Beds
    for (const bed of this.beds) {
      const aabb = {
        x: bed.x, y: bed.y, z: bed.z,
        width: bed.width, height: bed.height, depth: bed.depth
      };
      if (this.rayIntersectsAABB(start, dir, dist, aabb)) return false;
    }

    return true;
  }

  private rayIntersectsAABB(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number, box: {x:number, y:number, z:number, width:number, height:number, depth:number}): boolean {
    const minX = box.x - box.width/2;
    const maxX = box.x + box.width/2;
    const minY = box.y - box.height/2;
    const maxY = box.y + box.height/2;
    const minZ = box.z - box.depth/2;
    const maxZ = box.z + box.depth/2;

    let tmin = (minX - origin.x) / dir.x;
    let tmax = (maxX - origin.x) / dir.x;
    if (tmin > tmax) [tmin, tmax] = [tmax, tmin];

    let tymin = (minY - origin.y) / dir.y;
    let tymax = (maxY - origin.y) / dir.y;
    if (tymin > tymax) [tymin, tymax] = [tymax, tymin];

    if ((tmin > tymax) || (tymin > tmax)) return false;
    if (tymin > tmin) tmin = tymin;
    if (tymax < tmax) tmax = tymax;

    let tzmin = (minZ - origin.z) / dir.z;
    let tzmax = (maxZ - origin.z) / dir.z;
    if (tzmin > tzmax) [tzmin, tzmax] = [tzmax, tzmin];

    if ((tmin > tzmax) || (tzmin > tmax)) return false;
    if (tzmin > tmin) tmin = tzmin;
    if (tzmax < tmax) tmax = tzmax;

    return tmin > 0 && tmin < maxDist;
  }

  private findHidingSpot(npc: Ragdoll3D, player: Ragdoll3D): THREE.Vector3 | null {
    // Find closest obstacle to hide behind
    let bestSpot: THREE.Vector3 | null = null;
    let minDist = Infinity;

    const obstacles = [
      ...this.houseBlocks.map(b => ({ x: b.x, y: b.y, z: b.z, width: b.width, height: b.height, depth: b.depth })),
      ...this.voxelBlocks.map(b => ({ x: b.x, y: b.y, z: b.z, width: b.size, height: b.size, depth: b.size })),
      ...this.doors.filter(d => !d.isDestroyed).map(d => ({ x: d.x, y: d.y, z: d.z, width: d.width, height: d.height, depth: d.depth }))
    ];

    for (const obs of obstacles) {
      const dist = Math.sqrt(Math.pow(obs.x - npc.charPos.x, 2) + Math.pow(obs.z - npc.charPos.z, 2));
      if (dist < 20 && dist < minDist) {
        // Point on the opposite side of the obstacle from the player
        const toObs = new THREE.Vector3(obs.x - player.charPos.x, 0, obs.z - player.charPos.z).normalize();
        const spot = new THREE.Vector3(
          obs.x + toObs.x * (obs.width / 2 + 1.5),
          0,
          obs.z + toObs.z * (obs.depth / 2 + 1.5)
        );
        
        // Ensure the spot is actually out of sight
        const head = npc.particles.find(p => p.name === 'cabeza');
        const tempRagdoll = { ...npc, charPos: spot, particles: npc.particles.map(p => ({ ...p, x: spot.x + (p.x - npc.charPos.x), y: p.y, z: spot.z + (p.z - npc.charPos.z) })) };
        
        if (!this.checkLineOfSight(tempRagdoll as any, player)) {
          minDist = dist;
          bestSpot = spot;
        }
      }
    }

    return bestSpot;
  }

  public toggleFly(enabled?: boolean): boolean {
    this.isFlying = enabled !== undefined ? enabled : !this.isFlying;
    return this.isFlying;
  }

  public toggleGodMode(enabled?: boolean): boolean {
    this.isGodMode = enabled !== undefined ? enabled : !this.isGodMode;
    return this.isGodMode;
  }

  public toggleZeroGravity(enabled?: boolean): boolean {
    this.isZeroGravity = enabled !== undefined ? enabled : !this.isZeroGravity;
    return this.isZeroGravity;
  }

  public explodeAllRagdolls() {
    soundEngine.playBoneSnap();
    for (const r of this.ragdolls) {
      const impulse = new THREE.Vector3(
        (Math.random() - 0.5) * 32,
        20 + Math.random() * 12,
        (Math.random() - 0.5) * 32
      );
      this.collapseRagdoll(r, impulse);
      for (const p of r.particles) {
        p.vx += impulse.x;
        p.vy += impulse.y;
        p.vz += impulse.z;
        p.oldX = p.x - p.vx * 0.016;
        p.oldY = p.y - p.vy * 0.016;
        p.oldZ = p.z - p.vz * 0.016;
      }
      this.spawnBloodChorro3D(r.charPos.x, r.charPos.y + 1, r.charPos.z, new THREE.Vector3(0, 1, 0), 10);
    }
  }

  public characterTexturesEnabled: boolean = false;

  public setCharacterTexturesEnabled(enabled: boolean) {
    this.characterTexturesEnabled = enabled;
    const furTex = enabled ? getLowResTexture('fur') : null;

    for (const r of this.ragdolls) {
      if (r.isWerewolf || enabled) {
        for (const p of r.particles) {
          if (p.voxelsGroup) {
            p.voxelsGroup.traverse((child) => {
              if (child instanceof THREE.Mesh && child.material) {
                const mat = child.material as THREE.MeshStandardMaterial;
                mat.map = furTex;
                mat.needsUpdate = true;
              }
            });
          }
        }
      }
    }
  }

  public setXRayMode(mode: number, ragdollId?: string) {
    this.xrayMode = mode;
    for (const ragdoll of this.ragdolls) {
      if (!ragdollId || ragdoll.id === ragdollId) {
        applyXRayModeToRagdoll(ragdoll, mode);
      }
    }
  }

  public applyXRayModeToRagdoll(ragdoll: Ragdoll3D, mode: number) {
    applyXRayModeToRagdoll(ragdoll, mode);
  }

  public setShowSoundWaves(enabled: boolean) {
    this.showSoundWaves = enabled;
  }

  public spawnSoundWave(
    origin: THREE.Vector3,
    speed: number,
    size: number,
    color: number = 0x38bdf8
  ) {
    if (!this.showSoundWaves || soundEngine.getMuted()) return;

    const id = 'wave_' + Math.random().toString(36).substring(2, 9);
    const intensity = Math.min(1.0, (speed / 10.0) * Math.sqrt(size));
    const maxRadius = Math.max(1.5, Math.min(12.0, (speed * 0.45) + (size * 1.5)));

    // Spherical ring / concentric pulse wave mesh
    const geom = new THREE.RingGeometry(0.08, 0.22, 24);
    geom.rotateX(-Math.PI / 2); // Lay flat or face velocity

    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(origin);
    mesh.position.y += 0.05; // Slightly above ground
    this.scene.add(mesh);

    const wave: SoundWave3D = {
      id,
      origin: origin.clone(),
      radius: 0.2,
      maxRadius,
      speed: 12.0 + speed * 0.4, // Expanding wavefront velocity
      intensity,
      size,
      color,
      mesh,
      life: 0,
      maxLife: Math.min(0.8, 0.25 + (maxRadius / 15.0)),
    };

    this.soundWaves.push(wave);
  }

  private updateErections(dt: number) {
    for (const ragdoll of this.ragdolls) {
      if (ragdoll.isErecting || (ragdoll.erectionLevel > 0 && ragdoll.erectionLevel < 1)) {
        if (ragdoll.erectionLevel < 1) {
          ragdoll.erectionLevel += dt * 0.4; // Slightly slower
          if (ragdoll.erectionLevel >= 1) {
            ragdoll.erectionLevel = 1;
            ragdoll.isErecting = false;
          }
        }
        
        // Add 'convulsions' (shaking up and down)
        // Frequency: every 0.5 seconds (2Hz) -> 2 * PI * 2 * time
        const time = Date.now() / 1000;
        const jitter = Math.sin(time * Math.PI * 4) * 0.08; // Oscillate a bit
        
        updateRagdollErection(ragdoll, jitter);
      }
    }
  }

  private updateSoundWaves(dt: number) {
    for (let i = this.soundWaves.length - 1; i >= 0; i--) {
      const wave = this.soundWaves[i];
      wave.life += dt;

      if (wave.life >= wave.maxLife || !this.showSoundWaves) {
        this.scene.remove(wave.mesh);
        if (wave.mesh.geometry) wave.mesh.geometry.dispose();
        if (wave.mesh.material instanceof THREE.Material) wave.mesh.material.dispose();
        this.soundWaves.splice(i, 1);
        continue;
      }

      const progress = wave.life / wave.maxLife;
      wave.radius += wave.speed * dt;
      const currentScale = wave.radius;
      wave.mesh.scale.set(currentScale, currentScale, currentScale);

      const mat = wave.mesh.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = (1.0 - progress) * 0.85 * wave.intensity;
      }
    }
  }

  public setBustMorph(value: number, ragdollId?: string) {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId) || this.ragdolls[0];
    if (!ragdoll) return;
    updateRagdollBustMorph(ragdoll, value);
  }

  public setSphericalContour(value: number, enabled?: boolean, ragdollId?: string) {
    this.contourLevel = value;
    if (enabled !== undefined) {
      this.contourEnabled = enabled;
    }
    for (const ragdoll of this.ragdolls) {
      if (!ragdollId || ragdoll.id === ragdollId) {
        updateRagdollSphericalContour(ragdoll, value, enabled);
      }
    }
  }

  public setContourJointStyle(style: 'pseudo3d' | 'blocky' | 'cylinder', ragdollId?: string) {
    this.contourJointStyle = style;
    for (const ragdoll of this.ragdolls) {
      if (!ragdollId || ragdoll.id === ragdollId) {
        updateRagdollSphericalContour(ragdoll, ragdoll.sphericalContourLevel, ragdoll.contourLayerEnabled, style);
      }
    }
  }

  public setBodyCubicity(val: number, ragdollId?: string) {
    this.bodyCubicity = val;
    for (const ragdoll of this.ragdolls) {
      if (!ragdollId || ragdoll.id === ragdollId) {
        ragdoll.bodyCubicity = val;
        updateRagdollSphericalContour(ragdoll, ragdoll.sphericalContourLevel, ragdoll.contourLayerEnabled);
      }
    }
  }

  public setLimbSizeMultiplier(val: number, ragdollId?: string) {
    this.limbSizeMultiplier = val;
    for (const ragdoll of this.ragdolls) {
      if (!ragdollId || ragdoll.id === ragdollId) {
        ragdoll.limbSizeMultiplier = val;
        updateRagdollSphericalContour(ragdoll, ragdoll.sphericalContourLevel, ragdoll.contourLayerEnabled);
      }
    }
  }

  public setLimbWidthMultiplier(ragdollIdOrVal: string | number, particleIdOrPartName?: string, mult?: number) {
    if (typeof ragdollIdOrVal === 'number') {
      this.setLimbSizeMultiplier(ragdollIdOrVal, particleIdOrPartName);
      return;
    }
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollIdOrVal || r.isControlled) || this.ragdolls[0];
    if (!ragdoll || !particleIdOrPartName || mult === undefined) return;

    const lowerPart = particleIdOrPartName.toLowerCase();
    const clampedMult = Math.max(0.2, Math.min(3.0, mult));
    for (const p of ragdoll.particles) {
      if (
        p.id === particleIdOrPartName ||
        p.name === lowerPart ||
        p.name.startsWith(lowerPart) ||
        (lowerPart === 'pecho' && (p.name.includes('pecho') || p.name === 'torso' || (p.name as string) === 'ombligo' || p.name === 'pechobase')) ||
        (lowerPart === 'cabeza' && p.name.includes('cabeza'))
      ) {
        this.applySingleLimbWidth(ragdoll, p, clampedMult);
      }
    }
    updateRagdollSphericalContour(ragdoll, ragdoll.sphericalContourLevel, ragdoll.contourLayerEnabled);
  }

  public setWeather(type: WeatherType) {
    if (this.weatherSystem) {
      this.weatherSystem.setWeather(type, true);
    }
  }

  public setVoxelShape(shape: 'cube' | 'sphere', ragdollId?: string) {
    this.voxelShape = shape;
    for (const ragdoll of this.ragdolls) {
      if (!ragdollId || ragdoll.id === ragdollId) {
        updateRagdollVoxelShape(ragdoll, shape);
      }
    }
  }

  public toggleContourLayer(enabled?: boolean, ragdollId?: string): boolean {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId) || this.ragdolls[0];
    if (!ragdoll) return false;
    const newState = enabled !== undefined ? enabled : !ragdoll.contourLayerEnabled;
    updateRagdollSphericalContour(ragdoll, ragdoll.sphericalContourLevel, newState);
    return newState;
  }

  public toggleBustAndGlutes(enabled?: boolean, ragdollId?: string): boolean {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId) || this.ragdolls[0];
    if (!ragdoll) return false;
    const newState = enabled !== undefined ? enabled : !ragdoll.hasBustAndGlutes;
    updateRagdollBustAndGlutes(ragdoll, newState);
    return newState;
  }

  public toggleSkinSleeves(enabled?: boolean, ragdollId?: string): boolean {
    return false;
  }

  public setGenitalType(type: 'none' | 'male' | 'female', ragdollId?: string) {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId || r.isControlled) || this.ragdolls[0];
    if (!ragdoll) return;
    ragdoll.genitalType = type;
    updateRagdollGenitals(ragdoll, type);
    syncRagdollMeshes3D(ragdoll);
  }

  public setGenitalMShaftLength(val: number, ragdollId?: string) {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId || r.isControlled) || this.ragdolls[0];
    if (!ragdoll) return;
    ragdoll.genitalMShaftLength = val;
    updateRagdollGenitals(ragdoll, ragdoll.genitalType);
    syncRagdollMeshes3D(ragdoll);
  }

  public setGenitalMShaftThickness(val: number, ragdollId?: string) {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId || r.isControlled) || this.ragdolls[0];
    if (!ragdoll) return;
    ragdoll.genitalMShaftThickness = val;
    updateRagdollGenitals(ragdoll, ragdoll.genitalType);
    syncRagdollMeshes3D(ragdoll);
  }

  public setGenitalMPinkSize(val: number, ragdollId?: string) {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId || r.isControlled) || this.ragdolls[0];
    if (!ragdoll) return;
    ragdoll.genitalMPinkSize = val;
    updateRagdollGenitals(ragdoll, ragdoll.genitalType);
    syncRagdollMeshes3D(ragdoll);
  }

  public setGenitalFSize(val: number, ragdollId?: string) {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId || r.isControlled) || this.ragdolls[0];
    if (!ragdoll) return;
    ragdoll.genitalFSize = val;
    updateRagdollGenitals(ragdoll, ragdoll.genitalType);
    syncRagdollMeshes3D(ragdoll);
  }

  public triggerErection(ragdollId?: string) {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId) || this.ragdolls[0];
    if (ragdoll && ragdoll.genitalType === 'male') {
      ragdoll.isErecting = true;
    }
  }

  public setIntelligence(val: number) {
    this.intelligence = val;
  }

  public setStrength(val: number) {
    this.strength = val;
  }

  public setSpeed(val: number) {
    this.speed = val;
  }

  public setJumpPower(val: number) {
    this.jumpPower = val;
  }

  public setImmunity(val: number) {
    this.immunity = val;
  }

  public setHearing(val: number) {
    this.hearing = val;
  }

  public setResilience(val: number) {
    this.resilience = val;
    const maxHealth = 180 * (0.1 + 1.9 * (val / 100));
    for (const ragdoll of this.ragdolls) {
      for (const p of ragdoll.particles) {
        p.maxHealth = maxHealth;
        if (p.health > maxHealth) p.health = maxHealth;
      }
    }
  }

  public setReproduction(val: number) {
    this.reproduction = val;
    for (const ragdoll of this.ragdolls) {
      ragdoll.reproduction = val;
      if (ragdoll.hasBustAndGlutes) {
        updateRagdollBustAndGlutes(ragdoll, true);
      }
      if (ragdoll.genitalType && ragdoll.genitalType !== 'none') {
        updateRagdollGenitals(ragdoll, ragdoll.genitalType);
      }
    }
  }

  public setAsesino(val: number) {
    this.asesino = val;
    for (const r of this.ragdolls) r.asesino = val;
  }

  public setPsicopata(val: number) {
    this.psicopata = val;
    for (const r of this.ragdolls) r.psicopata = val;
  }

  public setAmable(val: number) {
    this.amable = val;
    for (const r of this.ragdolls) r.amable = val;
  }

  public restoreAllCharacterVoxels(ragdollId?: string) {
    if (ragdollId) {
      this.woundBloodJets = this.woundBloodJets.filter((j) => j.ragdollId !== ragdollId);
    } else {
      this.woundBloodJets = [];
    }
    for (const ragdoll of this.ragdolls) {
      if (!ragdollId || ragdoll.id === ragdollId) {
        restoreRagdollVoxels(ragdoll);

        // Clean up spawned bullet 3D paint spheres on the character
        for (const p of ragdoll.particles) {
          if (p.mesh) {
            const toRemove: THREE.Object3D[] = [];
            p.mesh.traverse((child) => {
              if (child.name === 'BulletPaintSphere') {
                toRemove.push(child);
              }
            });
            for (const child of toRemove) {
              child.parent?.remove(child);
              if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                if (child.material instanceof THREE.Material) {
                  child.material.dispose();
                }
              }
            }
          }
        }
      }
    }
  }

  public toggleRamps(enabled?: boolean, ragdollId?: string): boolean {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId) || this.ragdolls[0];
    if (!ragdoll) return false;
    const res = toggleRagdollRamps(ragdoll, enabled);
    soundEngine.playImpact(0.3);
    return res;
  }

  public spawnWeaponPickup(x: number, y: number, z: number): WeaponPickup3D {
    const id = 'pickup_' + Math.random().toString(36).substring(2, 9);
    const mesh = createWeaponPickupGroup();
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    const pickup: WeaponPickup3D = {
      id,
      x,
      y,
      z,
      type: 'rifle',
      mesh,
      isEquipped: false,
    };

    this.weaponPickups.push(pickup);
    return pickup;
  }

  public spawnHammerPickup(x: number, y: number, z: number): WeaponPickup3D {
    const player = this.ragdolls.find((r) => r.isControlled) || this.ragdolls[0];

    // "al spawnear se agarre como arma pick de sandbox que martillo lo agarre en ragdoll walk solamente"
    if (player && player.isAlive && player.isWalkingRagdoll) {
      this.equipHammer(player.id);
      const dummyPickup: WeaponPickup3D = {
        id: 'pickup_hammer_' + Math.random().toString(36).substring(2, 9),
        x,
        y,
        z,
        type: 'hammer',
        mesh: new THREE.Group(),
        isEquipped: true,
      };
      return dummyPickup;
    }

    const id = 'pickup_hammer_' + Math.random().toString(36).substring(2, 9);
    const mesh = createHammerPickupGroup();
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    const pickup: WeaponPickup3D = {
      id,
      x,
      y,
      z,
      type: 'hammer',
      mesh,
      isEquipped: false,
    };

    this.weaponPickups.push(pickup);
    return pickup;
  }

  private applyGlobalXRayAndContourToNPC(ragdoll: Ragdoll3D) {
    if ((ragdoll as any).isStaticZone || ragdoll.name === 'Cave Tentacle' || ragdoll.id.startsWith('cave_tentacle')) {
      return;
    }
    applyXRayModeToRagdoll(ragdoll, this.xrayMode);
    updateRagdollSphericalContour(ragdoll, this.contourLevel, this.contourEnabled, this.contourJointStyle);

    // Apply sandbox stats to newly spawned NPC
    ragdoll.intelligence = this.intelligence;
    ragdoll.strength = this.strength;
    ragdoll.speed = this.speed;
    ragdoll.jumpPower = this.jumpPower;
    ragdoll.immunity = this.immunity;
    ragdoll.hearing = this.hearing;
    ragdoll.reproduction = this.reproduction;
    ragdoll.asesino = this.asesino;
    ragdoll.psicopata = this.psicopata;
    ragdoll.amable = this.amable;

    // Apply low-res fur texture if enabled and character is a wolf
    if (this.characterTexturesEnabled || ragdoll.isWerewolf) {
      const furTex = getLowResTexture('fur');
      if (furTex) {
        for (const p of ragdoll.particles) {
          if (p.voxelsGroup) {
            p.voxelsGroup.traverse((child) => {
              if (child instanceof THREE.Mesh && child.material) {
                (child.material as THREE.MeshStandardMaterial).map = furTex;
                (child.material as THREE.MeshStandardMaterial).needsUpdate = true;
              }
            });
          }
        }
      }
    }

    // Copy clothing preferences from player if applicable
    const player = this.ragdolls[0];
    if (player && !ragdoll.isDummy && ragdoll.name !== 'Ragdoll') {
      ragdoll.hasBustAndGlutes = player.hasBustAndGlutes;
      ragdoll.hasShirt = player.hasShirt;
      ragdoll.hasPants = player.hasPants;
      ragdoll.shirtColorHex = player.shirtColorHex;
      ragdoll.skinColorHex = player.skinColorHex;
      ragdoll.pantsColorHex = player.pantsColorHex;

      applyShirtToRagdoll(ragdoll, ragdoll.hasShirt ?? false, ragdoll.shirtColorHex);
      applyPantsToRagdoll(ragdoll, ragdoll.hasPants ?? false, ragdoll.pantsColorHex);
      updateRagdollBustAndGlutes(ragdoll, ragdoll.hasBustAndGlutes);
      if (player.genitalType && player.genitalType !== 'none') {
        updateRagdollGenitals(ragdoll, player.genitalType);
      }
    }

    // Apply global Resistencia setting to newly spawned NPC health
    const maxHealth = 180 * (0.1 + 1.9 * (this.resilience / 100));
    for (const p of ragdoll.particles) {
      p.maxHealth = maxHealth;
      p.health = maxHealth;
    }
  }

  public spawnRagdoll(x: number, y: number, z: number): Ragdoll3D {
    const player = this.ragdolls.find((r) => r.isControlled) || this.ragdolls[0];
    const playerSkin = player ? getRagdollSkinColor(player) : 0xf5d0b5;
    const ragdoll = createFunctionalRagdoll3D(x, y + 0.1, z, this.scene, this.voxelShape, playerSkin);
    this.applyGlobalXRayAndContourToNPC(ragdoll);
    this.ragdolls.push(ragdoll);
    return ragdoll;
  }

  public spawnDummy(x: number, y: number, z: number): Ragdoll3D {
    const dummy = createDummyRagdoll3D(x, y, z, this.scene, this.voxelShape);
    this.applyGlobalXRayAndContourToNPC(dummy);
    dummy.isWalkingRagdoll = false;
    dummy.isAlive = true;
    if (dummy.intelligence === 0) {
      this.collapseRagdoll(dummy);
    }
    this.ragdolls.push(dummy);
    return dummy;
  }

  public spawnEvilDummy(x: number, y: number, z: number): Ragdoll3D {
    const dummy = createEvilDummyRagdoll3D(x, y, z, this.scene, this.voxelShape);
    this.applyGlobalXRayAndContourToNPC(dummy);
    dummy.isWalkingRagdoll = false;
    dummy.isAlive = true;
    if (dummy.intelligence === 0) {
      this.collapseRagdoll(dummy);
    }
    this.ragdolls.push(dummy);
    return dummy;
  }

  public spawnSoldier(x: number, y: number, z: number): SoldierNPC {
    const id = 'soldier_' + Math.random().toString(36).substring(2, 9);
    const ragdoll = createSoldierRagdoll3D(x, y, z, this.scene, this.voxelShape);
    this.applyGlobalXRayAndContourToNPC(ragdoll);
    ragdoll.isWalkingRagdoll = false;
    ragdoll.isAlive = true;
    if (ragdoll.intelligence === 0) {
      this.collapseRagdoll(ragdoll);
    }
    this.ragdolls.push(ragdoll);

    const soldier: SoldierNPC = {
      id,
      name: 'Soldado Enemigo',
      ragdoll,
      isAggro: false,
      shootCooldown: 1.0,
      patrolAngle: Math.random() * Math.PI * 2,
      patrolCenter: new THREE.Vector3(x, y, z),
      state: 'idle',
      targetPos: new THREE.Vector3(0, 0, 0),
    };

    this.soldiers.push(soldier);
    return soldier;
  }

  public spawnTentacle(x: number, y: number, z: number): Ragdoll3D {
    const tentacle = createTentacleRagdoll3D(
      x,
      y,
      z,
      1.0,
      this.scene,
      85,
      true,
      this.voxelShape
    );
    this.applyGlobalXRayAndContourToNPC(tentacle);
    tentacle.isWalkingRagdoll = true;
    if (tentacle.intelligence === 0) {
      this.collapseRagdoll(tentacle);
    }
    this.ragdolls.push(tentacle);
    soundEngine.playImpact(0.7);
    return tentacle;
  }

  public carveVoxelTunnel(centerX: number, surfaceY: number, centerZ: number, radius: number = 0.88, depth: number = 1.2) {
    const dummy = new THREE.Object3D();
    dummy.position.set(0, -999, 0);
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();

    // Clears only the exact 2x2 block opening at the mouth of the shaft without carving a giant crater
    const intersectsBaseCrater = (bx: number, by: number, bz: number): boolean => {
      const dx = Math.abs(bx - centerX);
      const dz = Math.abs(bz - centerZ);
      return dx <= radius && dz <= radius && by >= surfaceY - depth && by <= surfaceY + 0.6;
    };

    // 1. Clear intersecting full blocks
    for (const [key, full] of this.cesped2FullBlocks.entries()) {
      if (full.active && intersectsBaseCrater(full.x, full.y, full.z)) {
        full.active = false;
        if (full.fullMesh) {
          full.fullMesh.setMatrixAt(full.fullIndex, dummy.matrix);
          full.fullMesh.instanceMatrix.needsUpdate = true;
        }
      }
    }

    // 2. Clear intersecting sub-blocks
    const pools: [Map<string, any>, THREE.InstancedMesh | null][] = [
      [this.cesped2Blocks, this.cesped2SubGrassMesh],
      [this.cesped2DirtBlocks, this.cesped2SubDirtMesh],
      [this.cesped2WoodBlocks, this.cesped2SubWoodMesh],
      [this.cesped2LeavesBlocks, this.cesped2SubLeavesMesh],
    ];

    for (const [subMap, subMesh] of pools) {
      if (!subMesh) continue;
      let meshUpdated = false;
      for (const [key, sub] of subMap.entries()) {
        if (sub.active && intersectsBaseCrater(sub.x, sub.y, sub.z)) {
          sub.active = false;
          subMesh.setMatrixAt(sub.index, dummy.matrix);
          meshUpdated = true;
        }
      }
      if (meshUpdated) {
        subMesh.instanceMatrix.needsUpdate = true;
      }
    }
  }

  public spawnCaveTentacle(x: number, y: number, z: number): Ragdoll3D {
    const isCesped2 = (this.map.id === 'cesped2' || this.map.theme === 'cesped2');
    const surfaceY = isCesped2
      ? getForestTerrainHeight(x, z)
      : this.getGroundHeight(x, z, y);

    const bottomY = surfaceY - 12 * 0.88;
    const cylinderRadius = 1.45;
    const branches = [
      { angle: -0.4 * Math.PI, length: 10 },
      { angle: 0.35 * Math.PI, length: 11 },
      { angle: -0.85 * Math.PI, length: 9 },
      { angle: 0.8 * Math.PI, length: 12 },
    ];

    const isInTubeOrBranches = (bx: number, by: number, bz: number): boolean => {
      // 1. Inside vertical shaft (deactivate any terrain blocks within the 3x3 square block column centered at x,z)
      const inTubeX = Math.abs(bx - x) <= 1.52 * 0.88;
      const inTubeZ = Math.abs(bz - z) <= 1.52 * 0.88;
      if (inTubeX && inTubeZ && by >= bottomY - 1.2 && by <= surfaceY + 12.0) {
        return true;
      }
      // 2. Inside subterranean branch tunnels
      for (const br of branches) {
        for (let dist = 0.5; dist <= br.length; dist += 0.5) {
          const bxCenter = x + Math.sin(br.angle) * dist * 0.88;
          const bzCenter = z + Math.cos(br.angle) * dist * 0.88;
          const byCenter = bottomY + 0.88;
          if (Math.hypot(bx - bxCenter, bz - bzCenter) <= 1.55 * 0.88 && Math.abs(by - byCenter) <= 1.95 * 0.88) {
            return true;
          }
        }
      }
      return false;
    };

    // Thoroughly remove ALL terrain blocks inside the cylinder and cave tunnels ("todo lo que este adentro de cilindro de bloques de terreno no esten al spawnearlo")
    const dummy = new THREE.Object3D();
    dummy.position.set(0, -999, 0);
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();

    if (this.cesped2FullBlocks && this.cesped2FullBlocks.size > 0) {
      for (const [, full] of this.cesped2FullBlocks.entries()) {
        if (full.active && isInTubeOrBranches(full.x, full.y, full.z)) {
          full.active = false;
          if (full.fullMesh) {
            full.fullMesh.setMatrixAt(full.fullIndex, dummy.matrix);
            full.fullMesh.instanceMatrix.needsUpdate = true;
          }
        }
      }
    }

    const subBlockPools: [Map<string, any>, THREE.InstancedMesh | null][] = [
      [this.cesped2Blocks, this.cesped2SubGrassMesh],
      [this.cesped2DirtBlocks, this.cesped2SubDirtMesh],
      [this.cesped2WoodBlocks, this.cesped2SubWoodMesh],
      [this.cesped2LeavesBlocks, this.cesped2SubLeavesMesh],
    ];

    for (const [subMap, subMesh] of subBlockPools) {
      if (!subMesh || !subMap) continue;
      let meshUpdated = false;
      for (const [, sub] of subMap.entries()) {
        if (sub.active && isInTubeOrBranches(sub.x, sub.y, sub.z)) {
          sub.active = false;
          subMesh.setMatrixAt(sub.index, dummy.matrix);
          meshUpdated = true;
        }
      }
      if (meshUpdated) {
        subMesh.instanceMatrix.needsUpdate = true;
      }
    }

    // Filter out of collision blocks list
    for (const [key, arr] of this.cesped2ColBlocks.entries()) {
      const filtered = arr.filter((b: any) => !isInTubeOrBranches(b.x || 0, b.y, b.z || 0));
      if (filtered.length === 0) {
        this.cesped2ColBlocks.delete(key);
      } else {
        this.cesped2ColBlocks.set(key, filtered);
      }
    }

    // Also remove any loose voxel blocks inside the cylinder
    for (let i = this.voxelBlocks.length - 1; i >= 0; i--) {
      const vb = this.voxelBlocks[i];
      if (isInTubeOrBranches(vb.x, vb.y, vb.z)) {
        this.scene.remove(vb.mesh);
        this.voxelBlocks.splice(i, 1);
      }
    }

    // Also remove any house blocks inside the tube
    if (this.houseBlocks && this.houseBlocks.length > 0) {
      for (let i = this.houseBlocks.length - 1; i >= 0; i--) {
        const hb = this.houseBlocks[i];
        if (isInTubeOrBranches(hb.x, hb.y, hb.z)) {
          if (hb.mesh) this.scene.remove(hb.mesh);
          this.houseBlocks.splice(i, 1);
        }
      }
    }

    const caveTubeZone = createCaveTentacleRagdoll3D(
      x,
      surfaceY,
      z,
      1.0,
      this.scene,
      0,
      false,
      'cube'
    );

    caveTubeZone.isWalkingRagdoll = false; // Permanently static explorable zone
    (caveTubeZone as any).isStaticZone = true;
    this.ragdolls.push(caveTubeZone);

    soundEngine.playImpact(0.8);
    return caveTubeZone;
  }

  public spawnVoxelProp3D(type: 'cup' | 'bed' | 'sofa' | 'brick_wall' | 'block_arm' | 'block_leg' | 'block_hand' | 'block_head' | 'block_torso' | 'block_slime' | 'block_skin' | 'block_tube' | 'block_tube_npc' | 'block_3x3', x: number, y: number, z: number): Ragdoll3D {
    if (type === 'block_tube_npc') {
      const tentacle = this.spawnCaveTentacle(x, y, z);
      return tentacle;
    }

    if (type === 'block_3x3') {
      const voxelType = 'stone';
      const sz = 0.88;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const bx = x + dx * sz;
          const bz = z + dz * sz;
          const gY = this.getGroundHeight(bx, bz);
          const by = (gY !== -Infinity && gY !== undefined) ? gY + sz * 0.5 : y;
          this.spawnVoxelBlock(bx, by, bz, voxelType, sz);
        }
      }
      return {
        id: 'jelly_' + Math.random().toString(36).substring(2, 9),
        name: type,
        charPos: new THREE.Vector3(x, y, z),
        charVel: new THREE.Vector3(0, 0, 0),
        particles: [],
        constraints: [],
        facingAngle: 0,
        isControlled: false,
        isAlive: false,
        isGrounded: true,
        isJumping: false,
        walkCycle: 0,
        totalHealth: 100,
        scale: 1,
        groupMesh: new THREE.Group(),
        bustMorphValue: 0,
        rampsEnabled: false,
        hasWeapon: false,
        isAiming: false,
        sphericalContourLevel: 0,
        contourLayerEnabled: false,
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
        erectionLevel: 0,
        isErecting: false,
      };
    }

    if (type === 'block_slime' || type === 'block_skin') {
      const prop = createVoxelProp3D(type as any, x, y, z, this.scene);
      this.applyGlobalXRayAndContourToNPC(prop);
      this.ragdolls.push(prop);
      const voxelType = type === 'block_slime' ? 'slime' : 'skin';
      const slimeColor = type === 'block_slime' ? 0x22c55e : undefined;
      this.spawnVoxelBlock(x, y + 0.44, z, voxelType, 0.88, slimeColor);
      soundEngine.playImpact(0.5);
      return prop;
    }
    const prop = createVoxelProp3D(type as any, x, y, z, this.scene);
    this.applyGlobalXRayAndContourToNPC(prop);
    this.ragdolls.push(prop);
    soundEngine.playImpact(0.5);
    return prop;
  }

  public duplicateVoxelProp(targetId?: string): Ragdoll3D | null {
    let target = this.ragdolls.find(r => r.id === targetId);
    if (!target) {
      const player = this.ragdolls[0];
      const pPos = player ? player.charPos : new THREE.Vector3(0, 0, 0);
      let minDist = Infinity;
      for (const r of this.ragdolls) {
        if (r === player) continue;
        const d = r.charPos.distanceTo(pPos);
        if (d < minDist) {
          minDist = d;
          target = r;
        }
      }
    }
    const player = this.ragdolls[0];
    const spawnX = target ? target.charPos.x + 0.8 : (player?.charPos.x || 0) + 1.2;
    const spawnY = target ? Math.max(0.2, target.charPos.y) : 0.5;
    const spawnZ = target ? target.charPos.z + 0.8 : (player?.charPos.z || 0) + 1.2;

    const validTypes: ('cup' | 'bed' | 'sofa' | 'brick_wall' | 'block_arm' | 'block_leg' | 'block_hand' | 'block_head' | 'block_torso' | 'block_slime' | 'block_skin')[] = [
      'cup', 'bed', 'sofa', 'brick_wall', 'block_arm', 'block_leg', 'block_hand', 'block_head', 'block_torso', 'block_slime', 'block_skin'
    ];
    const matchedType = (target && validTypes.find(t => t === target!.name)) || 'block_arm';
    const cloned = this.spawnVoxelProp3D(matchedType, spawnX, spawnY, spawnZ);
    soundEngine.playBoneSnap();
    return cloned;
  }

  public spawnZombie(x: number, y: number, z: number): Ragdoll3D {
    const zombie = createZombieRagdoll3D(
      x,
      y,
      z,
      this.scene,
      this.voxelShape
    );
    this.applyGlobalXRayAndContourToNPC(zombie);
    zombie.isWalkingRagdoll = false;
    zombie.isAlive = true;
    if (zombie.intelligence === 0) {
      this.collapseRagdoll(zombie);
    }
    this.ragdolls.push(zombie);
    soundEngine.playBoneSnap();
    return zombie;
  }

  public spawnLiquid(x: number, y: number, z: number, count: number = 10): LiquidBody3D {
    const liquid = createLiquidBody3D(x, y, z, count, this.scene);
    this.liquidBodies.push(liquid);
    
    // Play splash sound
    soundEngine.playImpact(0.2);
    return liquid;
  }

  public spawnPool(x: number, y: number, z: number): THREE.Group {
    const pool = createPool3D(x, y, z, this.scene);
    this.pools.push(pool);
    return pool;
  }

  public spawnBlockHouse(spawnX: number, spawnY: number, spawnZ: number): THREE.Group {
    const houseGroup = new THREE.Group();
    houseGroup.name = `BlockHouse_${Math.random().toString(36).substring(2, 9)}`;

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x9a3412, // Brick red cubic wall
      roughness: 0.85,
      metalness: 0.1,
    });

    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x7f1d1d, // Dark red roof tiles
      roughness: 0.8,
      metalness: 0.1,
    });

    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x475569, // Slate gray floor tile
      roughness: 0.9,
      metalness: 0.15,
    });

    // Cubic block size for the house structure
    const cs = 0.6;

    // Helper to add a wall block to houseGroup and houseBlocks for physical wall collisions
    const addWallBlock = (rx: number, ry: number, rz: number, w: number, h: number, d: number, mat: THREE.Material) => {
      const geom = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(spawnX + rx, spawnY + ry, spawnZ + rz);
      houseGroup.add(mesh);

      this.houseBlocks.push({
        x: spawnX + rx,
        y: spawnY + ry,
        z: spawnZ + rz,
        width: w,
        height: h,
        depth: d,
        mesh,
      });
    };

    // 1. Concrete floor base (flat floor tile slab, y = 0.05, height = 0.1)
    const floorGeom = new THREE.BoxGeometry(6.4, 0.1, 6.4);
    const floorMesh = new THREE.Mesh(floorGeom, floorMat);
    floorMesh.position.set(spawnX, spawnY + 0.05, spawnZ);
    houseGroup.add(floorMesh);

    // 2. Cubic Wall Composition: 6m x 6m x 3.6m Cubic House
    // Back Wall (z = -3.0, x from -3.0 to +3.0)
    addWallBlock(0, 1.8, -3.0, 6.0, 3.6, cs, wallMat);

    // Left Wall (x = -3.0, z from -2.4 to +2.4)
    addWallBlock(-3.0, 1.8, 0, cs, 3.6, 5.4, wallMat);

    // Right Wall (x = +3.0, z from -2.4 to +2.4)
    addWallBlock(3.0, 1.8, 0, cs, 3.6, 5.4, wallMat);

    // Front Wall (z = +3.0) with doorway from x = -0.9 to x = +0.9 (width = 1.8m, height = 2.4m)
    // Left Front Section (x = -2.1, width = 1.8m)
    addWallBlock(-2.1, 1.8, 3.0, 1.8, 3.6, cs, wallMat);
    // Right Front Section (x = +2.1, width = 1.8m)
    addWallBlock(2.1, 1.8, 3.0, 1.8, 3.6, cs, wallMat);
    // Lintel above door (x = 0, y = 3.0, height = 1.2m, width = 2.4m)
    addWallBlock(0, 3.0, 3.0, 2.4, 1.2, cs, wallMat);

    // 3. Cubic Flat Roof (resting on top of walls at y = 3.7)
    addWallBlock(0, 3.7, 0, 6.4, 0.2, 6.4, roofMat);

    // Register roof in voxelBlocks so characters can stand on top of the cubic house!
    this.voxelBlocks.push({
      id: `house_roof_${Math.random().toString(36).substring(2, 9)}`,
      x: spawnX,
      y: spawnY + 3.7,
      z: spawnZ,
      size: 6.4,
      color: 0x7f1d1d,
      type: 'brick',
      mesh: floorMesh,
    });

    // 4. Interactive Destructible Door with Voxel Cubes & Uneven Handle (Manija)
    const doorW = 1.4;
    const doorH = 2.3;
    const doorD = 0.12;

    const hingeGroup = new THREE.Group();
    hingeGroup.name = `HingeGroup_${Math.random().toString(36).substring(2, 9)}`;
    hingeGroup.position.set(spawnX - 0.7, spawnY, spawnZ + 3.0);

    const voxelBlocks: DoorVoxelBlock[] = [];
    const cols = 5;
    const rows = 8;
    const blockW = doorW / cols;
    const blockH = doorH / rows;
    const blockD = doorD;

    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x78350f, // Wood brown door
      roughness: 0.8,
      metalness: 0.1,
    });

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const geom = new THREE.BoxGeometry(blockW, blockH, blockD);
        const mesh = new THREE.Mesh(geom, doorMat);
        const lx = (c + 0.5) * blockW;
        const ly = (r + 0.5) * blockH;
        const lz = 0;
        mesh.position.set(lx, ly, lz);
        hingeGroup.add(mesh);

        voxelBlocks.push({
          id: `dvox_house_${c}_${r}_${Math.random().toString(36).substring(2, 6)}`,
          localPos: new THREE.Vector3(lx, ly, lz),
          size: Math.max(blockW, blockH),
          color: 0x78350f,
          active: true,
          mesh,
          col: c,
          row: r,
          width: blockW,
          height: blockH,
          depth: blockD,
        });
      }
    }

    // Detailed Brass Door Handle (Manija perfectamente colocada y orientada)
    const handleGroup = new THREE.Group();
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.2, metalness: 0.95 });
    const plateGeom = new THREE.BoxGeometry(0.05, 0.22, 0.012);
    const plate = new THREE.Mesh(plateGeom, brassMat);
    handleGroup.add(plate);

    const stemGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.06, 12);
    stemGeom.rotateX(Math.PI / 2);
    const stem = new THREE.Mesh(stemGeom, brassMat);
    stem.position.set(0, 0, 0.035);
    handleGroup.add(stem);

    const leverGeom = new THREE.CylinderGeometry(0.016, 0.01, 0.2, 12);
    const lever = new THREE.Mesh(leverGeom, brassMat);
    lever.position.set(0, -0.08, 0.08);
    lever.rotation.z = Math.PI / 12;
    handleGroup.add(lever);

    handleGroup.position.set(doorW - 0.22, doorH / 2, doorD / 2 + 0.01);
    hingeGroup.add(handleGroup);
    const handleMesh = plate; // reference for removal on destruction

    houseGroup.add(hingeGroup);
    this.scene.add(houseGroup);

    this.doors.push({
      id: `door_${Math.random().toString(36).substring(2, 9)}`,
      x: spawnX,
      y: spawnY + doorH / 2,
      z: spawnZ + 3.0,
      width: doorW,
      height: doorH,
      depth: doorD,
      hingeGroup,
      doorGroup: houseGroup,
      currentAngle: 0,
      targetAngle: 0,
      health: 100,
      maxHealth: 100,
      isDestroyed: false,
      voxelBlocks,
      handleMesh,
    });

    soundEngine.playImpact(0.4);
    return houseGroup;
  }

  public spawnDoor(x: number, y: number, z: number, width: number = 1.4, height: number = 2.3, depth: number = 0.12): THREE.Group {
    const doorGroup = new THREE.Group();
    doorGroup.name = `StandaloneDoor_${Math.random().toString(36).substring(2, 9)}`;
    doorGroup.position.set(x, y, z);

    const hingeGroup = new THREE.Group();
    hingeGroup.name = `HingeGroup_${Math.random().toString(36).substring(2, 9)}`;
    hingeGroup.position.set(-width / 2, 0, 0);

    const voxelBlocks: DoorVoxelBlock[] = [];
    const cols = 5;
    const rows = 8;
    const blockW = width / cols;
    const blockH = height / rows;
    const blockD = depth;

    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x92400e, // Wood brown door
      roughness: 0.7,
      metalness: 0.1,
    });

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const geom = new THREE.BoxGeometry(blockW, blockH, blockD);
        const mesh = new THREE.Mesh(geom, doorMat);
        const lx = (c + 0.5) * blockW;
        const ly = (r + 0.5) * blockH;
        const lz = 0;
        mesh.position.set(lx, ly, lz);
        hingeGroup.add(mesh);

        voxelBlocks.push({
          id: `dvox_${c}_${r}_${Math.random().toString(36).substring(2, 6)}`,
          localPos: new THREE.Vector3(lx, ly, lz),
          size: Math.max(blockW, blockH),
          color: 0x92400e,
          active: true,
          mesh,
          col: c,
          row: r,
          width: blockW,
          height: blockH,
          depth: blockD,
        });
      }
    }

    // Unified pseudo-cubo contour covering all the door blocks into one single seamless structure ("puerta debe tener pseudo cubo en todos los bloques como uno solo")
    const pseudoGeom = new THREE.BoxGeometry(width * 1.002, height * 1.002, depth * 1.01);
    const pseudoMat = new THREE.MeshStandardMaterial({
      color: 0x92400e, // Rich warm wood brown
      roughness: 0.65,
      metalness: 0.08,
    });
    const pseudoMesh = new THREE.Mesh(pseudoGeom, pseudoMat);
    pseudoMesh.name = 'door_pseudo_cube';
    pseudoMesh.position.set(width / 2, height / 2, 0);
    pseudoMesh.castShadow = true;
    pseudoMesh.receiveShadow = true;
    hingeGroup.add(pseudoMesh);

    // Detailed Ergonomic Brass Door Handle on BOTH sides (Front & Back)
    const handleGroup = new THREE.Group();
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.9 });
    const keyholeMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 });

    // Front Handle
    const frontPlate = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.20, 0.008), brassMat);
    frontPlate.position.set(0, 0, depth / 2 + 0.004);
    handleGroup.add(frontPlate);

    const frontKeyhole = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, 0.002), keyholeMat);
    frontKeyhole.position.set(0, -0.04, depth / 2 + 0.009);
    handleGroup.add(frontKeyhole);

    const frontStem = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.04, 12), brassMat);
    frontStem.rotateX(Math.PI / 2);
    frontStem.position.set(0, 0.04, depth / 2 + 0.024);
    handleGroup.add(frontStem);

    // Front horizontal ergonomic lever (points toward door center)
    const frontLever = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.022, 0.018), brassMat);
    frontLever.position.set(-0.045, 0.04, depth / 2 + 0.044);
    handleGroup.add(frontLever);

    // Back Handle (Rear side)
    const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.20, 0.008), brassMat);
    backPlate.position.set(0, 0, -depth / 2 - 0.004);
    handleGroup.add(backPlate);

    const backStem = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.04, 12), brassMat);
    backStem.rotateX(Math.PI / 2);
    backStem.position.set(0, 0.04, -depth / 2 - 0.024);
    handleGroup.add(backStem);

    // Back horizontal ergonomic lever
    const backLever = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.022, 0.018), brassMat);
    backLever.position.set(-0.045, 0.04, -depth / 2 - 0.044);
    handleGroup.add(backLever);

    handleGroup.position.set(width - 0.18, height / 2, 0);
    hingeGroup.add(handleGroup);
    const handleMesh = frontPlate;

    doorGroup.add(hingeGroup);
    this.scene.add(doorGroup);

    this.doors.push({
      id: `door_${Math.random().toString(36).substring(2, 9)}`,
      x,
      y: y + height / 2,
      z,
      width,
      height,
      depth,
      hingeGroup,
      doorGroup,
      currentAngle: 0,
      targetAngle: 0,
      health: 100,
      maxHealth: 100,
      isDestroyed: false,
      voxelBlocks,
      handleMesh,
      pseudoMesh,
    });

    soundEngine.playImpact(0.3);
    return doorGroup;
  }

  public spawnDynamicPropBlock(
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
    color: number,
    initialVel?: THREE.Vector3
  ): DynamicPropBlock {
    const geom = new THREE.BoxGeometry(width, height, depth);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.75,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const vx = initialVel ? initialVel.x : (Math.random() - 0.5) * 1.5;
    const vy = initialVel ? initialVel.y : Math.random() * 1.2 + 0.3;
    const vz = initialVel ? initialVel.z : (Math.random() - 0.5) * 1.5;

    const prop: DynamicPropBlock = {
      id: `prop_${Math.random().toString(36).substring(2, 9)}`,
      x,
      y,
      z,
      vx,
      vy,
      vz,
      rotX: 0,
      rotY: Math.random() * Math.PI * 2,
      rotZ: 0,
      avx: (Math.random() - 0.5) * 4.0,
      avy: (Math.random() - 0.5) * 3.0,
      avz: (Math.random() - 0.5) * 4.0,
      width,
      height,
      depth,
      color,
      mesh,
      life: 60.0,
      isSettled: false,
    };

    this.dynamicProps.push(prop);

    if (this.dynamicProps.length > 200) {
      const oldest = this.dynamicProps.shift()!;
      if (oldest.mesh) {
        this.scene.remove(oldest.mesh);
        oldest.mesh.geometry.dispose();
        if (Array.isArray(oldest.mesh.material)) {
          oldest.mesh.material.forEach((m) => m.dispose());
        } else {
          oldest.mesh.material.dispose();
        }
      }
    }

    return prop;
  }

  public updateDynamicProps(dt: number) {
    if (dt <= 0 || this.dynamicProps.length === 0) return;
    const gy = this.map.gravity.y;

    for (let i = this.dynamicProps.length - 1; i >= 0; i--) {
      const p = this.dynamicProps[i];
      p.life -= dt;
      if (p.life <= 0) {
        if (p.mesh) {
          this.scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          if (Array.isArray(p.mesh.material)) {
            p.mesh.material.forEach((m) => m.dispose());
          } else {
            p.mesh.material.dispose();
          }
        }
        this.dynamicProps.splice(i, 1);
        continue;
      }

      if (p.isSettled) {
        for (const ragdoll of this.ragdolls) {
          const dist = Math.hypot(ragdoll.charPos.x - p.x, ragdoll.charPos.z - p.z);
          if (dist < 0.65 && Math.abs(ragdoll.charPos.y - p.y) < 1.2) {
            p.isSettled = false;
            p.vx += (p.x - ragdoll.charPos.x) * 2.0;
            p.vz += (p.z - ragdoll.charPos.z) * 2.0;
            p.vy += 0.8;
            p.avx = (Math.random() - 0.5) * 3;
            p.avz = (Math.random() - 0.5) * 3;
            break;
          }
        }
        continue;
      }

      p.vy += gy * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      p.rotX += p.avx * dt;
      p.rotY += p.avy * dt;
      p.rotZ += p.avz * dt;

      const drag = Math.pow(0.97, dt * 60);
      p.vx *= drag;
      p.vz *= drag;
      p.avx *= Math.pow(0.95, dt * 60);
      p.avy *= Math.pow(0.95, dt * 60);
      p.avz *= Math.pow(0.95, dt * 60);

      const groundY = this.getGroundHeight(p.x, p.z, p.y);
      const halfH = p.height / 2;
      if (p.y <= groundY + halfH) {
        p.y = groundY + halfH;
        if (Math.abs(p.vy) > 0.4) {
          p.vy = -p.vy * 0.35;
          p.vx *= 0.75;
          p.vz *= 0.75;
          p.avx *= 0.7;
          p.avz *= 0.7;
        } else {
          p.vy = 0;
          p.vx *= 0.82;
          p.vz *= 0.82;
          if (Math.hypot(p.vx, p.vz) < 0.05 && Math.abs(p.avx) < 0.1 && Math.abs(p.avz) < 0.1) {
            p.vx = 0;
            p.vz = 0;
            p.avx = 0;
            p.avy = 0;
            p.avz = 0;
            p.isSettled = true;
          }
        }
      }

      if (p.mesh) {
        p.mesh.position.set(p.x, p.y, p.z);
        p.mesh.rotation.set(p.rotX, p.rotY, p.rotZ);
      }
    }
  }

  public checkDoorSeparation(door: Door3D) {
    if (door.isDestroyed) return;

    const activeBlocks = door.voxelBlocks.filter((v) => v.active);
    if (activeBlocks.length === 0) {
      door.isDestroyed = true;
      if (door.handleMesh) {
        door.hingeGroup.remove(door.handleMesh);
        door.handleMesh = undefined;
      }
      if (door.pseudoMesh) {
        door.hingeGroup.remove(door.pseudoMesh);
        door.pseudoMesh = undefined;
      }
      return;
    }

    const hingeBlocks = activeBlocks.filter((b) => (b.col ?? 0) === 0);

    // If NO blocks at column 0 remain active, the entire door has separated from the hinge!
    // All remaining active blocks detach as dynamic props/pieces!
    if (hingeBlocks.length === 0) {
      for (const b of activeBlocks) {
        b.active = false;
        if (b.mesh) {
          door.hingeGroup.remove(b.mesh);
        }
        const worldPos = b.localPos.clone();
        door.hingeGroup.localToWorld(worldPos);
        const bw = b.width || b.size;
        const bh = b.height || b.size;
        const bd = b.depth || 0.1;
        this.spawnDynamicPropBlock(worldPos.x, worldPos.y, worldPos.z, bw, bh, bd, b.color);
        this.spawnVoxelDebris(worldPos.x, worldPos.y, worldPos.z, b.color, 2);
      }
      door.isDestroyed = true;
      if (door.handleMesh) {
        const handleWorld = new THREE.Vector3();
        door.handleMesh.getWorldPosition(handleWorld);
        door.hingeGroup.remove(door.handleMesh);
        door.handleMesh = undefined;
        this.spawnDynamicPropBlock(handleWorld.x, handleWorld.y, handleWorld.z, 0.12, 0.18, 0.12, 0xd97706);
      }
      if (door.pseudoMesh) {
        door.hingeGroup.remove(door.pseudoMesh);
        door.pseudoMesh = undefined;
      }
      return;
    }

    // BFS to find all active blocks connected to hinge blocks (c === 0)
    const connectedToHinge = new Set<DoorVoxelBlock>();
    const queue: DoorVoxelBlock[] = [];

    for (const hb of hingeBlocks) {
      connectedToHinge.add(hb);
      queue.push(hb);
    }

    const blockW = door.width / 5;
    const blockH = door.height / 8;

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const cc = curr.col ?? Math.round(curr.localPos.x / blockW - 0.5);
      const cr = curr.row ?? Math.round(curr.localPos.y / blockH - 0.5);

      for (const other of activeBlocks) {
        if (connectedToHinge.has(other)) continue;
        const oc = other.col ?? Math.round(other.localPos.x / blockW - 0.5);
        const or = other.row ?? Math.round(other.localPos.y / blockH - 0.5);

        // Orthogonal 4-way adjacency on door grid
        const dist = Math.abs(cc - oc) + Math.abs(cr - or);
        if (dist === 1) {
          connectedToHinge.add(other);
          queue.push(other);
        }
      }
    }

    // Detach all separated blocks (those not connected to the hinge) as dynamic props/pieces!
    for (const b of activeBlocks) {
      if (!connectedToHinge.has(b)) {
        b.active = false;
        if (b.mesh) {
          door.hingeGroup.remove(b.mesh);
        }
        const worldPos = b.localPos.clone();
        door.hingeGroup.localToWorld(worldPos);
        const bw = b.width || b.size;
        const bh = b.height || b.size;
        const bd = b.depth || 0.1;
        this.spawnDynamicPropBlock(worldPos.x, worldPos.y, worldPos.z, bw, bh, bd, b.color);
        this.spawnVoxelDebris(worldPos.x, worldPos.y, worldPos.z, b.color, 2);
      }
    }

    // Check handle: if block near handle is separated or broken, detach handle as prop
    if (door.handleMesh) {
      const handleBlock = door.voxelBlocks.find(
        (b) => (b.col === 4 || b.col === 3) && (b.row === 4 || b.row === 3)
      );
      if (!handleBlock || !handleBlock.active || !connectedToHinge.has(handleBlock)) {
        const handleWorld = new THREE.Vector3();
        door.handleMesh.getWorldPosition(handleWorld);
        door.hingeGroup.remove(door.handleMesh);
        door.handleMesh = undefined;
        this.spawnDynamicPropBlock(handleWorld.x, handleWorld.y, handleWorld.z, 0.12, 0.18, 0.12, 0xd97706);
      }
    }

    if (connectedToHinge.size === 0) {
      door.isDestroyed = true;
    }
  }

  public checkVoxelSeparation() {
    if (this.voxelBlocks.length === 0) return;

    const isAnchored = (vb: VoxelBlock3D): boolean => {
      const groundY = this.getGroundHeight(vb.x, vb.z, vb.y);
      if (vb.y <= groundY + vb.size * 0.75) return true;
      for (const bed of this.beds) {
        if (
          Math.abs(vb.x - bed.x) <= bed.width / 2 + 0.1 &&
          Math.abs(vb.z - bed.z) <= bed.depth / 2 + 0.1 &&
          Math.abs(vb.y - (bed.y + 0.55)) <= vb.size * 0.75
        ) {
          return true;
        }
      }
      for (const hb of this.houseBlocks) {
        if (
          Math.abs(vb.x - hb.x) <= hb.width / 2 + 0.1 &&
          Math.abs(vb.z - hb.z) <= hb.depth / 2 + 0.1 &&
          Math.abs(vb.y - (hb.y + hb.height / 2)) <= vb.size * 0.75
        ) {
          return true;
        }
      }
      return false;
    };

    const supported = new Set<string>();
    const queue: VoxelBlock3D[] = [];

    const cellSize = 0.5;
    const grid = new Map<string, VoxelBlock3D[]>();
    const getCellKey = (x: number, y: number, z: number) =>
      `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)},${Math.floor(z / cellSize)}`;

    for (const vb of this.voxelBlocks) {
      const key = getCellKey(vb.x, vb.y, vb.z);
      let list = grid.get(key);
      if (!list) {
        list = [];
        grid.set(key, list);
      }
      list.push(vb);

      if (isAnchored(vb)) {
        supported.add(vb.id);
        queue.push(vb);
      }
    }

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const cx = Math.floor(curr.x / cellSize);
      const cy = Math.floor(curr.y / cellSize);
      const cz = Math.floor(curr.z / cellSize);

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const key = `${cx + dx},${cy + dy},${cz + dz}`;
            const nbrs = grid.get(key);
            if (!nbrs) continue;
            for (const nbr of nbrs) {
              if (supported.has(nbr.id)) continue;
              const maxDim = Math.max(curr.size, nbr.size);
              const distSq = (curr.x - nbr.x) ** 2 + (curr.y - nbr.y) ** 2 + (curr.z - nbr.z) ** 2;
              if (distSq <= (maxDim * 1.35) ** 2) {
                supported.add(nbr.id);
                queue.push(nbr);
              }
            }
          }
        }
      }
    }

    const separated: VoxelBlock3D[] = [];
    for (let i = this.voxelBlocks.length - 1; i >= 0; i--) {
      const vb = this.voxelBlocks[i];
      if (!supported.has(vb.id)) {
        separated.push(vb);
        this.voxelBlocks.splice(i, 1);
      }
    }

    for (const sep of separated) {
      if (sep.mesh) {
        this.scene.remove(sep.mesh);
      }
      this.spawnDynamicPropBlock(
        sep.x,
        sep.y,
        sep.z,
        sep.size,
        sep.size,
        sep.size,
        sep.color || 0x78716c,
        new THREE.Vector3((Math.random() - 0.5) * 0.8, -0.5, (Math.random() - 0.5) * 0.8)
      );
      this.spawnVoxelDebris(sep.x, sep.y, sep.z, sep.color || 0x78716c, 2);
    }
  }

  public spawnBed(x: number, y: number, z: number): THREE.Group {
    const bedGroup = new THREE.Group();
    bedGroup.name = `Bed_${Math.random().toString(36).substring(2, 9)}`;
    bedGroup.position.set(x, y, z);

    // Bed Wooden Frame Materials
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.65, metalness: 0.05 });
    const sheetWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.85 }); // Crisp white sheets
    const blanketBlueMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.7 }); // Navy blue quilt
    const pillowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });

    // 1. Four solid wooden legs
    const legGeom = new THREE.BoxGeometry(0.1, 0.35, 0.1);
    const legPositions = [
      [-0.7, 0.175, -0.95],
      [0.7, 0.175, -0.95],
      [-0.7, 0.175, 0.95],
      [0.7, 0.175, 0.95],
    ];
    for (const [lx, ly, lz] of legPositions) {
      const leg = new THREE.Mesh(legGeom, woodMat);
      leg.position.set(lx, ly, lz);
      bedGroup.add(leg);
    }

    // 2. Bed Base Board / Frame Box
    const baseFrameGeom = new THREE.BoxGeometry(1.5, 0.15, 2.0);
    const baseFrame = new THREE.Mesh(baseFrameGeom, woodMat);
    baseFrame.position.set(0, 0.28, 0);
    bedGroup.add(baseFrame);

    // 3. Headboard (Cabecera)
    const headboardGeom = new THREE.BoxGeometry(1.56, 0.9, 0.12);
    const headboardMesh = new THREE.Mesh(headboardGeom, woodMat);
    headboardMesh.position.set(0, 0.58, -1.0);
    bedGroup.add(headboardMesh);

    // 4. Footboard (Piecero)
    const footboardGeom = new THREE.BoxGeometry(1.56, 0.55, 0.12);
    const footboardMesh = new THREE.Mesh(footboardGeom, woodMat);
    footboardMesh.position.set(0, 0.40, 1.0);
    bedGroup.add(footboardMesh);

    // 5. Mattress (Colchón blanco)
    const mattressGeom = new THREE.BoxGeometry(1.4, 0.24, 1.9);
    const mattressMesh = new THREE.Mesh(mattressGeom, sheetWhiteMat);
    mattressMesh.position.set(0, 0.44, 0);
    bedGroup.add(mattressMesh);

    // 6. Duvet / Quilt Blanket (Manta / Colcha azul cubriendo 3/4 de la cama y cayendo por los bordes)
    const blanketTopGeom = new THREE.BoxGeometry(1.44, 0.04, 1.35);
    const blanketTop = new THREE.Mesh(blanketTopGeom, blanketBlueMat);
    blanketTop.position.set(0, 0.57, 0.28);
    bedGroup.add(blanketTop);

    // Blanket Drapes (Caída de la colcha a los lados)
    const drapeLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.20, 1.35), blanketBlueMat);
    drapeLeft.position.set(-0.72, 0.47, 0.28);
    bedGroup.add(drapeLeft);

    const drapeRight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.20, 1.35), blanketBlueMat);
    drapeRight.position.set(0.72, 0.47, 0.28);
    bedGroup.add(drapeRight);

    const drapeFoot = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.20, 0.04), blanketBlueMat);
    drapeFoot.position.set(0, 0.47, 0.94);
    bedGroup.add(drapeFoot);

    // 7. Folded Top Sheet (Doblez de la sábana blanca encima de la manta)
    const foldedSheetGeom = new THREE.BoxGeometry(1.44, 0.042, 0.22);
    const foldedSheet = new THREE.Mesh(foldedSheetGeom, sheetWhiteMat);
    foldedSheet.position.set(0, 0.585, -0.42);
    bedGroup.add(foldedSheet);

    // 8. Fluffy Pillows (Almohadas)
    const pillowGeom = new THREE.BoxGeometry(0.55, 0.12, 0.36);
    const pillowLeft = new THREE.Mesh(pillowGeom, pillowMat);
    pillowLeft.position.set(-0.35, 0.61, -0.7);
    pillowLeft.rotation.x = 0.15;
    bedGroup.add(pillowLeft);

    const pillowRight = new THREE.Mesh(pillowGeom, pillowMat);
    pillowRight.position.set(0.35, 0.61, -0.7);
    pillowRight.rotation.x = 0.15;
    bedGroup.add(pillowRight);

    this.scene.add(bedGroup);

    this.beds.push({
      id: `bed_${Math.random().toString(36).substring(2, 9)}`,
      x,
      y,
      z,
      width: 1.5,
      height: 1.0,
      depth: 2.1,
      groupMesh: bedGroup,
    });

    soundEngine.playImpact(0.4);
    return bedGroup;
  }

  public spawnBedWithCage(x: number, y: number, z: number): THREE.Group {
    return this.spawnBed(x, y, z);
  }

  public spawnObbyCourse(spawnX: number, spawnY: number, spawnZ: number): THREE.Group {
    const obbyGroup = new THREE.Group();
    obbyGroup.name = `ObbyCourse_${Math.random().toString(36).substring(2, 9)}`;

    const colors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899];
    
    for (let i = 0; i < 8; i++) {
      const bx = spawnX + (i * 2.2);
      const by = spawnY + 0.35 + (i * 0.45);
      const bz = spawnZ + (i % 2 === 0 ? 1.0 : -1.0);
      const size = 1.0 - (i * 0.05);

      const mat = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
        roughness: 0.7,
        metalness: 0.1,
      });
      const geom = new THREE.BoxGeometry(size, 0.3, size);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(bx, by, bz);
      obbyGroup.add(mesh);

      this.voxelBlocks.push({
        id: `obby_vb_${Math.random().toString(36).substring(2, 9)}`,
        x: bx,
        y: by,
        z: bz,
        size,
        color: colors[i % colors.length],
        type: 'neon',
        mesh,
      });
    }

    this.scene.add(obbyGroup);
    soundEngine.playImpact(0.3);
    return obbyGroup;
  }

  public spawnWerewolf(x: number, y: number, z: number): Ragdoll3D {
    const werewolf = createWerewolfRagdoll3D(
      x,
      y,
      z,
      this.scene,
      this.voxelShape
    );
    
    // Set werewolf to walk using active ragdoll physics by default!
    werewolf.isAlive = true;
    werewolf.isWalkingRagdoll = false;
    for (const c of werewolf.constraints) {
      if (c.broken) continue;
      c.stiffness = 0.92;
    }

    this.applyGlobalXRayAndContourToNPC(werewolf);
    werewolf.isWalkingRagdoll = false;
    if (werewolf.intelligence === 0) {
      this.collapseRagdoll(werewolf);
    }
    this.ragdolls.push(werewolf);
    soundEngine.playZombieGroan(); // nice growl sound
    return werewolf;
  }

  public spawnWerewolfHot(x: number, y: number, z: number): Ragdoll3D {
    const werewolf = createWerewolfRagdoll3D(
      x,
      y,
      z,
      this.scene,
      this.voxelShape
    );
    werewolf.name = 'Werewolf Hot';
    werewolf.isWerewolf = true;
    werewolf.isWerewolfHot = true;
    werewolf.isAlive = true;
    werewolf.isWalkingRagdoll = false;
    werewolf.genitalType = 'male';
    updateRagdollGenitals(werewolf, 'male');
    werewolf.erectionLevel = 1.0;
    werewolf.isErecting = true;
    for (const c of werewolf.constraints) {
      if (c.broken) continue;
      c.stiffness = 0.92;
    }

    this.applyGlobalXRayAndContourToNPC(werewolf);
    werewolf.isWalkingRagdoll = false;
    if (werewolf.intelligence === 0) {
      this.collapseRagdoll(werewolf);
    }
    this.ragdolls.push(werewolf);
    soundEngine.playZombieGroan();
    return werewolf;
  }

  public spawnDummyHot(x: number, y: number, z: number): Ragdoll3D {
    const dummy = createDummyRagdoll3D(x, y, z, this.scene, this.voxelShape);
    dummy.name = 'Dummy Hot';
    dummy.isDummy = true;
    dummy.isDummyHot = true;
    dummy.isAlive = true;
    dummy.isWalkingRagdoll = false;
    dummy.hasBustAndGlutes = true;
    dummy.genitalType = 'female';
    updateRagdollBustAndGlutes(dummy, true);
    updateRagdollGenitals(dummy, 'female');
    for (const c of dummy.constraints) {
      if (c.broken) continue;
      c.stiffness = 0.92;
    }

    this.applyGlobalXRayAndContourToNPC(dummy);
    dummy.isWalkingRagdoll = false;
    if (dummy.intelligence === 0) {
      this.collapseRagdoll(dummy);
    }
    this.ragdolls.push(dummy);
    soundEngine.playImpact(0.4);
    return dummy;
  }

  public collapseRagdoll(ragdoll: Ragdoll3D, impulseDir?: THREE.Vector3, currentDt?: number) {
    ragdoll.isAlive = false;
    ragdoll.isWalkingRagdoll = false;
    ragdoll.isCollapsed = true;

    // Restore constraint lengths and keep anatomical bone stiffness so ragdoll falls naturally without limbs doubling over or folding incorrectly
    for (const c of ragdoll.constraints) {
      if (c.broken) continue;
      if (c.originalLength !== undefined) {
        c.length = c.originalLength;
      }
      c.stiffness = 0.95; // Firm anatomical bone stiffness
    }

    const dt = currentDt || 0.016;
    let impX = 0;
    let impY = 0;
    let impZ = 0;

    if (impulseDir) {
      const impLen = Math.sqrt(impulseDir.x * impulseDir.x + impulseDir.y * impulseDir.y + impulseDir.z * impulseDir.z);
      const maxImp = 6.0;
      const factor = impLen > maxImp ? maxImp / impLen : 1.0;
      impX = impulseDir.x * factor;
      impY = impulseDir.y * factor;
      impZ = impulseDir.z * factor;
    }

    const facingAngle = ragdoll.facingAngle || 0;
    const fwdX = Math.sin(facingAngle);
    const fwdZ = Math.cos(facingAngle);
    const rightX = Math.cos(facingAngle);
    const rightZ = -Math.sin(facingAngle);

    // Transfer preexisting movement momentum from charVel (walking/running)
    const initMoveVx = (ragdoll.charVel ? ragdoll.charVel.x : 0) * 0.55;
    const initMoveVy = (ragdoll.charVel ? ragdoll.charVel.y : 0) * 0.55;
    const initMoveVz = (ragdoll.charVel ? ragdoll.charVel.z : 0) * 0.55;
    ragdoll.charVel.set(0, 0, 0);

    // Initialize particle positions and velocities smoothly for a clean, natural fall under gravity from 0
    for (const p of ragdoll.particles) {
      if (p.dismembered) continue;

      let curVx = initMoveVx * dt + impX * dt;
      let curVy = initMoveVy * dt + impY * dt;
      let curVz = initMoveVz * dt + impZ * dt;

      // Natural anatomical knee and hip buckle on collapse from standing
      if (!impulseDir) {
        if (p.name === 'pelvis' || p.name.includes('ombligo')) {
          curVy -= 1.4 * dt;
          curVx += fwdX * 0.22 * dt;
          curVz += fwdZ * 0.22 * dt;
        } else if (p.name.includes('rodilla')) {
          // Knees buckle naturally backwards on collapse
          curVx -= fwdX * 0.35 * dt;
          curVz -= fwdZ * 0.35 * dt;
          curVy -= 1.1 * dt;
        } else if (p.name.includes('muslo')) {
          curVy -= 1.3 * dt;
          curVx += fwdX * 0.15 * dt;
          curVz += fwdZ * 0.15 * dt;
        } else if (p.name.includes('torso') || p.name.includes('pecho')) {
          curVy -= 1.35 * dt;
          curVx += fwdX * 0.30 * dt;
          curVz += fwdZ * 0.30 * dt;
        } else if (p.name === 'cabeza' || p.name === 'cuello') {
          curVy -= 1.5 * dt;
          curVx += fwdX * 0.35 * dt;
          curVz += fwdZ * 0.35 * dt;
        } else if (p.name.includes('_izq') && (p.name.includes('brazo') || p.name.includes('codo') || p.name.includes('mano') || p.name.includes('hombro'))) {
          curVy -= 0.95 * dt;
          curVx -= rightX * 0.28 * dt;
          curVz -= rightZ * 0.28 * dt;
        } else if (p.name.includes('_der') && (p.name.includes('brazo') || p.name.includes('codo') || p.name.includes('mano') || p.name.includes('hombro'))) {
          curVy -= 0.95 * dt;
          curVx += rightX * 0.28 * dt;
          curVz += rightZ * 0.28 * dt;
        } else if (p.name.includes('pie') || p.name.includes('tobillo') || p.name.includes('antepierna')) {
          // Feet stay grounded initially while body folds over them
          curVy -= 0.4 * dt;
        }
      }

      // Cap initial impulse speed so ragdoll does not fly away
      const speed = Math.sqrt(curVx * curVx + curVy * curVy + curVz * curVz);
      const maxInitDisp = 0.25;
      if (speed > maxInitDisp && speed > 0) {
        const factor = maxInitDisp / speed;
        curVx *= factor;
        curVy *= factor;
        curVz *= factor;
      }

      p.oldX = p.x - curVx;
      p.oldY = p.y - curVy;
      p.oldZ = p.z - curVz;
      p.vx = curVx / dt;
      p.vy = curVy / dt;
      p.vz = curVz / dt;
      p.needsCylinderDeform = false;
    }

    // Trigger Cannon.js Ragdoll collapse & impulse after particle velocities and positions are ready
    CannonRagdollEngine.getInstance().collapse(ragdoll, impulseDir);

    if (ragdoll.jointBridges) {
      for (const bridge of ragdoll.jointBridges) {
        bridge.userData.needsDeform = true;
        bridge.userData.lastR1 = undefined;
        bridge.userData.lastR2 = undefined;
      }
    }

    soundEngine.playBoneSnap();
  }

  public toggleRagdoll(ragdollId?: string): boolean {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId) || this.ragdolls[0];
    if (!ragdoll) return false;

    // Ragdoll button: active collapse into physics ragdoll on ground, stand up cleanly when toggled back
    if (ragdoll.isAlive || ragdoll.isWalkingRagdoll) {
      this.collapseRagdoll(ragdoll);
      return true;
    } else {
      // Transitioning back to Alive mode: Stand up cleanly with zero joint glitch
      ragdoll.isAlive = true;
      ragdoll.isWalkingRagdoll = false;
      ragdoll.isCollapsed = false;

      // Clean up Rapier physics builder
      const builder = this.rapierBuilders.get(ragdoll.id);
      if (builder) {
        builder.destroy();
        this.rapierBuilders.delete(ragdoll.id);
      }
      CannonRagdollEngine.getInstance().unregisterRagdoll(ragdoll.id);
      CannonRagdollEngine.getInstance().registerRagdoll(ragdoll, ragdoll.scale || 1.0);
      const pelvis = ragdoll.particles.find((p) => p.name === 'pelvis') || ragdoll.particles[0];
      if (pelvis) {
        ragdoll.charPos.x = pelvis.x;
        ragdoll.charPos.z = pelvis.z;
        ragdoll.charPos.y = Math.max(-12.0, pelvis.y - 0.98 * ragdoll.scale);
      }
      ragdoll.charVel.set(0, 0, 0);
      this.resetRagdollParticlesToKinematicPose(ragdoll);
      this.syncMeshes();
      return false;
    }
  }

  private resetRagdollParticlesToKinematicPose(ragdoll: Ragdoll3D) {
    ragdoll.cylinderDeformWarmup = 10;
    const scale = ragdoll.scale || 1.0;
    const cosYaw = Math.cos(ragdoll.facingAngle);
    const sinYaw = Math.sin(ragdoll.facingAngle);

    // Standard standing local offsets for all body parts and finger segments
    const defaultLocalOffsets: Record<string, [number, number, number]> = {
      cabeza: [0, 1.91, 0],
      cuello: [0, 1.70, 0],
      pechobase: [0, 1.55, 0],
      pecho_bajo: [0, 1.43, 0],
      torso: [0, 1.31, 0],
      ombligo: [0, 1.19, 0],
      ombligo_bajo: [0, 1.07, 0],
      pelvis: [0, 0.95, 0],

      // Left Arm
      hombro_izq: [-0.28, 1.55, 0],
      brazo_izq: [-0.28, 1.36, 0],
      codo_izq: [-0.28, 1.21, 0],
      antebrazo_izq: [-0.28, 1.05, 0],
      muneca_izq: [-0.28, 0.90, 0],
      mano_izq: [-0.28, 0.80, 0],

      dedo_pulgar_izq: [-0.250, 0.770, 0.035],
      dedo_pulgar_izq_seg2: [-0.240, 0.735, 0.038],
      dedo_pulgar_izq_seg3: [-0.235, 0.705, 0.040],

      dedo_indice_izq: [-0.280, 0.750, 0.035],
      dedo_indice_izq_seg2: [-0.280, 0.710, 0.035],
      dedo_indice_izq_seg3: [-0.280, 0.675, 0.035],

      dedo_medio_izq: [-0.280, 0.745, 0.012],
      dedo_medio_izq_seg2: [-0.280, 0.700, 0.012],
      dedo_medio_izq_seg3: [-0.280, 0.660, 0.012],

      dedo_anular_izq: [-0.280, 0.750, -0.012],
      dedo_anular_izq_seg2: [-0.280, 0.710, -0.012],
      dedo_anular_izq_seg3: [-0.280, 0.675, -0.012],

      dedo_menique_izq: [-0.280, 0.755, -0.035],
      dedo_menique_izq_seg2: [-0.280, 0.720, -0.035],
      dedo_menique_izq_seg3: [-0.280, 0.690, -0.035],

      // Right Arm
      hombro_der: [0.28, 1.55, 0],
      brazo_der: [0.28, 1.36, 0],
      codo_der: [0.28, 1.21, 0],
      antebrazo_der: [0.28, 1.05, 0],
      muneca_der: [0.28, 0.90, 0],
      mano_der: [0.28, 0.80, 0],

      dedo_pulgar_der: [0.250, 0.770, 0.035],
      dedo_pulgar_der_seg2: [0.240, 0.735, 0.038],
      dedo_pulgar_der_seg3: [0.235, 0.705, 0.040],

      dedo_indice_der: [0.280, 0.750, 0.035],
      dedo_indice_der_seg2: [0.280, 0.710, 0.035],
      dedo_indice_der_seg3: [0.280, 0.675, 0.035],

      dedo_medio_der: [0.280, 0.745, 0.012],
      dedo_medio_der_seg2: [0.280, 0.700, 0.012],
      dedo_medio_der_seg3: [0.280, 0.660, 0.012],

      dedo_anular_der: [0.280, 0.750, -0.012],
      dedo_anular_der_seg2: [0.280, 0.710, -0.012],
      dedo_anular_der_seg3: [0.280, 0.675, -0.012],

      dedo_menique_der: [0.280, 0.755, -0.035],
      dedo_menique_der_seg2: [0.280, 0.720, -0.035],
      dedo_menique_der_seg3: [0.280, 0.690, -0.035],

      // Left Leg
      muslo_izq: [-0.11, 0.74, 0],
      rodilla_izq: [-0.11, 0.53, 0],
      antepierna_izq: [-0.11, 0.28, 0],
      tobillo_izq: [-0.11, 0.065, 0],
      pie_izq_talon: [-0.11, 0.035, -0.01],
      pie_izq_medio: [-0.11, 0.035, 0.05],
      pie_izq: [-0.11, 0.035, 0.11],
      dedo_pie_pulgar_izq: [-0.06, 0.035, 0.18],
      dedo_pie_indice_izq: [-0.085, 0.035, 0.18],
      dedo_pie_medio_izq: [-0.11, 0.035, 0.18],
      dedo_pie_anular_izq: [-0.135, 0.035, 0.18],
      dedo_pie_menique_izq: [-0.16, 0.035, 0.18],

      // Right Leg
      muslo_der: [0.11, 0.74, 0],
      rodilla_der: [0.11, 0.53, 0],
      antepierna_der: [0.11, 0.28, 0],
      tobillo_der: [0.11, 0.065, 0],
      pie_der_talon: [0.11, 0.035, -0.01],
      pie_der_medio: [0.11, 0.035, 0.05],
      pie_der: [0.11, 0.035, 0.11],
      dedo_pie_pulgar_der: [0.06, 0.035, 0.18],
      dedo_pie_indice_der: [0.085, 0.035, 0.18],
      dedo_pie_medio_der: [0.11, 0.035, 0.18],
      dedo_pie_anular_der: [0.135, 0.035, 0.18],
      dedo_pie_menique_der: [0.16, 0.035, 0.18],

      // Bust & Glutes
      pecho_izq: [-0.08, 1.48, 0.14],
      pecho_der: [0.08, 1.48, 0.14],
      tetilla_izq: [-0.08, 1.48, 0.20],
      tetilla_der: [0.08, 1.48, 0.20],
      gluteo_izq: [-0.11, 0.94, -0.14],
      gluteo_der: [0.11, 0.94, -0.14],

      // Male Anatomy
      male_shaft1: [0, 0.88, 0.10],
      male_shaft2: [0, 0.85, 0.15],
      male_shaft3: [0, 0.82, 0.19],
      male_glans: [0, 0.80, 0.22],
      testicle_izq: [-0.038, 0.84, 0.06],
      testicle_der: [0.038, 0.84, 0.06],

      // Female Anatomy
      female_clitoris: [0, 0.87, 0.09],
      female_labia_izq: [-0.032, 0.83, 0.07],
      female_labia_der: [0.032, 0.83, 0.07],
      female_labia_minora_izq: [-0.018, 0.83, 0.075],
      female_labia_minora_der: [0.018, 0.83, 0.075],
      female_entrance: [0, 0.83, 0.05],
      uterus: [0, 0.95, 0.02],
      ovary_izq: [-0.06, 0.95, 0.02],
      ovary_der: [0.06, 0.95, 0.02],
    };

    for (const p of ragdoll.particles) {
      if (p.dismembered) continue;
      const offset = defaultLocalOffsets[p.name];
      if (offset) {
        const lx = offset[0] * scale;
        const ly = offset[1] * scale;
        const lz = offset[2] * scale;

        const wx = ragdoll.charPos.x + lx * cosYaw + lz * sinYaw;
        const wy = ragdoll.charPos.y + ly;
        const wz = ragdoll.charPos.z - lx * sinYaw + lz * cosYaw;

        p.x = wx;
        p.y = wy;
        p.z = wz;
        p.oldX = wx;
        p.oldY = wy;
        p.oldZ = wz;
        p.vx = 0;
        p.vy = 0;
        p.vz = 0;
        p.needsCylinderDeform = false;
        if (p.mesh) {
          p.mesh.position.set(wx, wy, wz);
          p.mesh.rotation.set(0, ragdoll.facingAngle, 0);
        }
      }
    }

    // If character has an active emote or ragdoll walk posture, ensure particle positions match the active pose
    if (ragdoll.activeEmote || ragdoll.isWalkingRagdoll) {
      if (!ragdoll.emoteBlend) ragdoll.emoteBlend = 1.0;
    }

    for (const c of ragdoll.constraints) {
      if (c.broken) continue;
      if (c.originalLength !== undefined) c.length = c.originalLength;
      c.stiffness = 0.92;
    }

    if (ragdoll.jointBridges) {
      for (const bridge of ragdoll.jointBridges) {
        bridge.userData.needsDeform = true;
        bridge.userData.lastR1 = undefined;
        bridge.userData.lastR2 = undefined;
      }
    }
  }

  public toggleWalkingRagdoll(ragdollId?: string): boolean {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId) || this.ragdolls[0];
    if (!ragdoll) return false;

    if (ragdoll.isWalkingRagdoll) {
      // Disabling walk ragdoll: restore standard kinematic mode
      ragdoll.isWalkingRagdoll = false;
      ragdoll.isAlive = true;
      ragdoll.isCollapsed = false;

      this.resetRagdollParticlesToKinematicPose(ragdoll);
      this.syncMeshes();
      return false;
    } else {
      // Turn on Ragdoll Walk (Kinematic Movement): upright standing & locomotion with loose ragdoll physics on limbs
      ragdoll.isAlive = true;
      ragdoll.isWalkingRagdoll = true;
      ragdoll.isCollapsed = false;

      // Stand upright at current ground position
      const pelvis = ragdoll.particles.find((p) => p.name === 'pelvis') || ragdoll.particles[0];
      if (pelvis) {
        ragdoll.charPos.x = pelvis.x;
        ragdoll.charPos.z = pelvis.z;
        const groundH = this.getGroundHeight(ragdoll.charPos.x, ragdoll.charPos.z, ragdoll.charPos.y);
        ragdoll.charPos.y = groundH > -9000 ? groundH : Math.max(-12.0, pelvis.y - 0.98 * ragdoll.scale);
      }
      ragdoll.charVel.set(0, 0, 0);

      this.resetRagdollParticlesToKinematicPose(ragdoll);
      this.syncMeshes();

      CannonRagdollEngine.getInstance().unregisterRagdoll(ragdoll.id);

      soundEngine.playBoneSnap();
      return true;
    }
  }

  public jumpWalkingRagdoll(ragdollId?: string) {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId) || this.ragdolls[0];
    if (!ragdoll) return;
    this.jumpCharacter(ragdoll.id);
  }

  public triggerEmote(ragdollId?: string, emoteName?: string | null) {
    const ragdoll = (ragdollId ? this.ragdolls.find((r) => r.id === ragdollId) : undefined) || this.ragdolls.find((r) => r.isControlled) || this.ragdolls[0];
    if (!ragdoll) return;

    if (!emoteName) {
      ragdoll.activeEmote = null;
      ragdoll.emoteBlend = 0;
      return;
    }

    // Ensure ragdoll walk is active for dancing!
    if (!ragdoll.isWalkingRagdoll) {
      ragdoll.isAlive = true;
      ragdoll.isWalkingRagdoll = true;
      ragdoll.isCollapsed = false;
      this.resetRagdollParticlesToKinematicPose(ragdoll);
    }

    ragdoll.activeEmote = emoteName;
    ragdoll.emoteTimer = 0;
    ragdoll.emoteBlend = 0.0;
    soundEngine.playWeaponEquip();
  }

  public equipWeapon(ragdollId?: string) {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId) || this.ragdolls[0];
    if (!ragdoll) return;
    attachWeaponToRagdoll(ragdoll);
    soundEngine.playWeaponEquip();
  }

  public equipHammer(ragdollId?: string) {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId) || this.ragdolls[0];
    if (!ragdoll || !ragdoll.isAlive) return;
    // "que martillo lo agarre en ragdoll walk solamente"
    if (!ragdoll.isWalkingRagdoll) return;
    attachHammerToRagdoll(ragdoll);
    soundEngine.playWeaponEquip();
  }

  public dropWeapon(ragdollId: string) {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId);
    if (!ragdoll || !ragdoll.hasWeapon) return;

    const weaponType = (ragdoll as any).activeWeapon;
    const dropX = ragdoll.charPos.x;
    const dropY = ragdoll.charPos.y + 0.3;
    const dropZ = ragdoll.charPos.z;

    detachWeaponFromRagdoll(ragdoll);

    if (weaponType === 'hammer') {
      this.spawnHammerPickup(dropX, dropY, dropZ);
    } else {
      this.spawnWeaponPickup(dropX, dropY, dropZ);
    }
  }

  public setAiming(isAiming: boolean, ragdollId?: string) {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId) || this.ragdolls[0];
    if (!ragdoll) return;
    ragdoll.isAiming = isAiming;
  }

  public performUnarmedAttack(ragdollId?: string) {
    const shooter = ragdollId
      ? this.ragdolls.find((r) => r.id === ragdollId)
      : this.ragdolls.find((r) => r.isControlled) || this.ragdolls[0];

    // Punch strike works strictly with ragdoll walk activated!
    if (!shooter || !shooter.isAlive || !shooter.isWalkingRagdoll) return;

    // Unarmed attack does NOT aim
    shooter.isAiming = false;

    // Preserve facingAngle so character never rotates or twists when punching!
    const originalFacing = shooter.facingAngle;

    // Trigger smooth procedural punch animation on arms
    shooter.punchTimer = shooter.isWerewolf ? 0.6 : 0.35;
    shooter.punchLeftArm = !shooter.punchLeftArm;

    const forward = new THREE.Vector3(Math.sin(shooter.facingAngle), 0, Math.cos(shooter.facingAngle));
    const strengthMultiplier = 0.1 + 1.9 * (((shooter as any).strength ?? this.strength) / 100);

    // Subtle natural punch thrust to the fist particle only (does not rip or stretch joints)
    const activeHandName = shooter.punchLeftArm ? 'mano_izq' : 'mano_der';
    const handParticle = shooter.particles.find((p) => p.name === activeHandName);
    if (handParticle && !handParticle.dismembered) {
      handParticle.vx += forward.x * 2.5 * strengthMultiplier;
      handParticle.vy += 0.5;
      handParticle.vz += forward.z * 2.5 * strengthMultiplier;
    }

    if (shooter.isWerewolf) {
      soundEngine.playZombieGroan();
    } else {
      soundEngine.playImpact(0.25);
    }

    // Ensure character facing angle remains rock steady (no rotation on punch)
    shooter.facingAngle = originalFacing;

    // Fist contact point in front of chest
    const fistPos = new THREE.Vector3(
      shooter.charPos.x + forward.x * 1.05,
      shooter.charPos.y + 1.35,
      shooter.charPos.z + forward.z * 1.05
    );

    // 1. Break Door Voxel Blocks (realistic, not brutal: breaks 1 block and nudges door open)
    let hitObject = false;
    for (const door of this.doors) {
      if (door.isDestroyed) continue;
      let closestBlock: any = null;
      let minDist = Infinity;
      const closestWorldPos = new THREE.Vector3();

      for (const vb of door.voxelBlocks) {
        if (!vb.active) continue;
        const worldPos = vb.localPos.clone();
        door.hingeGroup.localToWorld(worldPos);
        const dist = fistPos.distanceTo(worldPos);
        if (dist < 1.20 && dist < minDist) {
          minDist = dist;
          closestBlock = vb;
          closestWorldPos.copy(worldPos);
        }
      }

      if (closestBlock) {
        // Detach this single block cleanly and drop as a physical prop
        closestBlock.active = false;
        if (closestBlock.mesh) {
          door.hingeGroup.remove(closestBlock.mesh);
        }
        if (door.pseudoMesh) {
          door.pseudoMesh.visible = false;
        }

        const bw = closestBlock.width || closestBlock.size || 0.28;
        const bh = closestBlock.height || closestBlock.size || 0.28;
        const bd = closestBlock.depth || 0.12;
        const pushImpulse = forward.clone().multiplyScalar(2.8).add(new THREE.Vector3(0, 0.8, 0));
        this.spawnDynamicPropBlock(closestWorldPos.x, closestWorldPos.y, closestWorldPos.z, bw, bh, bd, closestBlock.color, pushImpulse);

        this.spawnVoxelDebris(closestWorldPos.x, closestWorldPos.y, closestWorldPos.z, closestBlock.color, 2);
        soundEngine.playImpact(0.4);

        // Realistic door hinge swing push
        const swingNudge = 0.25;
        door.targetAngle = THREE.MathUtils.clamp(door.currentAngle + swingNudge, -Math.PI / 2, Math.PI / 2);

        // Check if remaining door blocks separated from hinge to drop them as props too
        this.checkDoorSeparation(door);

        hitObject = true;
        break;
      }
    }

    // 2. Break Standalone Voxel Blocks (rocks / structures)
    if (!hitObject && this.voxelBlocks && this.voxelBlocks.length > 0) {
      let closestIdx = -1;
      let minVbDist = Infinity;
      for (let i = 0; i < this.voxelBlocks.length; i++) {
        const vb = this.voxelBlocks[i];
        if (!vb.mesh) continue;
        const dist = fistPos.distanceTo(vb.mesh.position);
        if (dist < 1.25 && dist < minVbDist) {
          minVbDist = dist;
          closestIdx = i;
        }
      }

      if (closestIdx !== -1) {
        const closestVb = this.voxelBlocks[closestIdx];
        if (closestVb.mesh) {
          this.scene.remove(closestVb.mesh);
        }
        this.spawnVoxelDebris(
          closestVb.x,
          closestVb.y,
          closestVb.z,
          closestVb.color || 0x78716c,
          4
        );
        this.voxelBlocks.splice(closestIdx, 1);
        soundEngine.playImpact(0.4);
        hitObject = true;

        // Rule: if blocks separate from others, they separate as props or pieces!
        this.checkVoxelSeparation();
      }
    }

    // 2.5 Punch Dynamic Props
    for (const prop of this.dynamicProps) {
      const d = Math.hypot(prop.x - fistPos.x, prop.y - fistPos.y, prop.z - fistPos.z);
      if (d < 1.1) {
        prop.isSettled = false;
        prop.vx += forward.x * 5.5 * strengthMultiplier;
        prop.vy += 1.6;
        prop.vz += forward.z * 5.5 * strengthMultiplier;
        prop.avx += (Math.random() - 0.5) * 4;
        prop.avz += (Math.random() - 0.5) * 4;
        this.spawnVoxelDebris(prop.x, prop.y, prop.z, prop.color, 3);
        soundEngine.playImpact(0.35);
      }
    }

    // 3. Punch nearby character / ragdoll target
    const damage = (shooter.isWerewolf ? 65 : 30) * strengthMultiplier;
    for (const other of this.ragdolls) {
      if (other.id === shooter.id) continue;
      const dx = other.charPos.x - shooter.charPos.x;
      const dy = other.charPos.y - shooter.charPos.y;
      const dz = other.charPos.z - shooter.charPos.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 1.4 && Math.abs(dy) < 1.5) {
        const toTarget = new THREE.Vector3(dx, 0, dz).normalize();
        if (forward.dot(toTarget) > 0.15) {
          const hitPos = other.charPos.clone().add(new THREE.Vector3(0, 1.25, 0));
          soundEngine.playBoneSnap();

          // Controlled physical punch impulse (realistic stagger, not launching into space)
          const punchImpulse = forward.clone().multiplyScalar(4.5 * strengthMultiplier).add(new THREE.Vector3(0, 1.2, 0));
          other.charVel.add(punchImpulse);

          // Find closest particle on victim and break at most 1 single voxel block on that limb
          let closestParticle: Particle3D | null = null;
          let minPartDist = Infinity;
          for (const p of other.particles) {
            const d = Math.hypot(p.x - fistPos.x, p.y - fistPos.y, p.z - fistPos.z);
            if (d < minPartDist) {
              minPartDist = d;
              closestParticle = p;
            }
          }

          if (closestParticle && closestParticle.voxelBlocks && closestParticle.voxelBlocks.length > 0) {
            const activeBlocks = closestParticle.voxelBlocks.filter((b) => b.active);
            if (activeBlocks.length > 0) {
              const b = activeBlocks[0];
              b.active = false;
              if (b.mesh && closestParticle.mesh) {
                closestParticle.mesh.remove(b.mesh);
              }
              this.spawnVoxelDebris(closestParticle.x, closestParticle.y, closestParticle.z, b.color, 3);
            }
          }

          for (const p of other.particles) {
            p.health = Math.max(0, p.health - damage);
          }

          const faceData = (other as any).faceData;
          if (faceData) {
            faceData.painTimer = 1.5;
          } else {
            (other as any).painTimer = 1.5;
          }

          if (!other.isAlive || other.particles.reduce((acc, p) => acc + p.health, 0) <= 0) {
            this.killCharacter(other.id, punchImpulse);
          } else {
            other.isWalkingRagdoll = true;
          }
          break;
        }
      }
    }
  }

  public performHammerSmash(shooterId?: string, targetPos?: THREE.Vector3) {
    const shooter = shooterId
      ? this.ragdolls.find((r) => r.id === shooterId)
      : this.ragdolls.find((r) => r.isControlled) || this.ragdolls[0];

    if (!shooter || !shooter.isAlive || !shooter.isWalkingRagdoll) return;

    shooter.punchTimer = 0.55;
    (shooter as any).isHammerSmashing = true;
    soundEngine.playImpact(0.8);

    const forwardX = Math.sin(shooter.facingAngle);
    const forwardZ = Math.cos(shooter.facingAngle);
    const impactPos = shooter.charPos.clone().add(new THREE.Vector3(forwardX * 1.6, 0.3, forwardZ * 1.6));

    setTimeout(() => {
      soundEngine.playExplosion();
      soundEngine.playBoneSnap();

      for (const target of this.ragdolls) {
        if (target.id === shooter.id) continue;
        const dx = target.charPos.x - impactPos.x;
        const dz = target.charPos.z - impactPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 2.5) {
          const impulse = new THREE.Vector3(forwardX * 14 + (dx / (dist || 1)) * 4, 7, forwardZ * 14 + (dz / (dist || 1)) * 4);
          target.charVel.add(impulse);
          for (const p of target.particles) {
            p.vx += impulse.x;
            p.vy += impulse.y;
            p.vz += impulse.z;
          }
          target.stats.brokenBones += 2;
          soundEngine.playBloodSplatter();
        }
      }

      // Impact debris burst
      this.spawnVoxelDebris(impactPos.x, impactPos.y, impactPos.z, 0x64748b, 8);
    }, 180);
  }

  public shoot(
    fromPlayer: boolean = true,
    targetPosition?: THREE.Vector3,
    shooterRagdollId?: string,
    aimRayDir?: THREE.Vector3
  ) {
    const shooter = shooterRagdollId
      ? this.ragdolls.find((r) => r.id === shooterRagdollId)
      : fromPlayer
      ? this.ragdolls.find((r) => r.isControlled) || this.ragdolls[0]
      : this.ragdolls[0];

    if (!shooter || (!shooter.isAlive && !shooter.isWalkingRagdoll)) return;

    // Enforce 1 bullet per 0.3 seconds (0.3s cooldown) for player shooting, but no cooldown for punches
    if (fromPlayer) {
      const now = performance.now();
      if (shooter.hasWeapon && now - this.lastPlayerShootTime < 300) {
        return;
      }
      if (shooter.hasWeapon) {
        this.lastPlayerShootTime = now;
      }
    }

    // If holding hammer, perform two-handed block hammer smash
    if ((shooter as any).activeWeapon === 'hammer') {
      this.performHammerSmash(shooter.id, targetPosition);
      return;
    }

    // If shooter has no weapon, throw ragdoll punch strike only if ragdoll walk is activated
    if (!shooter.hasWeapon) {
      if (shooter.isWalkingRagdoll) {
        this.performUnarmedAttack(shooter.id);
      }
      return;
    }

    // Determine target direction
    let target = targetPosition;
    if (!target) {
      if (aimRayDir) {
        target = shooter.charPos.clone().add(new THREE.Vector3(0, 1.45, 0)).addScaledVector(aimRayDir, 60);
      } else {
        // Default: shoot forward in current facing direction
        const forwardX = Math.sin(shooter.facingAngle);
        const forwardZ = Math.cos(shooter.facingAngle);
        target = new THREE.Vector3(
          shooter.charPos.x + forwardX * 25,
          shooter.charPos.y + 1.45,
          shooter.charPos.z + forwardZ * 25
        );
      }
    } else {
      // When shooting at a zone, make character face towards that zone!
      const dx = target.x - shooter.charPos.x;
      const dz = target.z - shooter.charPos.z;
      if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
        shooter.facingAngle = Math.atan2(dx, dz);
      }
    }

    // Calculate muzzle origin position in front of character
    const sinYaw = Math.sin(shooter.facingAngle);
    const cosYaw = Math.cos(shooter.facingAngle);

    const muzzleLocalX = 0.16;
    const muzzleLocalY = shooter.isAiming ? 1.48 : 1.25;
    const muzzleLocalZ = 0.85;

    const muzzleX = shooter.charPos.x + muzzleLocalX * cosYaw + muzzleLocalZ * sinYaw;
    const muzzleY = shooter.charPos.y + muzzleLocalY;
    const muzzleZ = shooter.charPos.z - muzzleLocalX * sinYaw + muzzleLocalZ * cosYaw;

    const origin = new THREE.Vector3(muzzleX, muzzleY, muzzleZ);
    // Direct zero-deviation raycast direction towards target point
    let dir = new THREE.Vector3().subVectors(target, origin);
    if (dir.lengthSq() < 0.001) {
      dir = aimRayDir ? aimRayDir.clone() : new THREE.Vector3(sinYaw, 0, cosYaw);
    } else {
      dir.normalize();
    }

    // Muzzle Flash
    this.spawnMuzzleFlash(muzzleX, muzzleY, muzzleZ);

    // Spawn Bullet
    this.spawnBullet(origin, dir, fromPlayer, 45, shooter.id);

    // Sound
    soundEngine.playGunshot('ak47');
    this.spawnSoundWave(origin, 35.0, 1.5, 0xfacc15);
  }

  private spawnMuzzleFlash(x: number, y: number, z: number) {
    const flashGeom = new THREE.SphereGeometry(0.12, 8, 8);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const flashMesh = new THREE.Mesh(flashGeom, flashMat);
    flashMesh.position.set(x, y, z);
    this.scene.add(flashMesh);

    const flashLight = new THREE.PointLight(0xfef08a, 4.0, 6);
    flashLight.position.set(x, y, z);
    this.scene.add(flashLight);

    setTimeout(() => {
      this.scene.remove(flashMesh);
      this.scene.remove(flashLight);
    }, 60);
  }

  private spawnBullet(
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    fromPlayer: boolean,
    damage: number,
    shooterId?: string
  ) {
    const id = 'bullet_' + Math.random().toString(36).substring(2, 9);
    const pos = origin.clone();

    // Compact pseudo-cubic bullet (single small clean cube mesh, no weird properties)
    const tracerGroup = new THREE.Group();
    const bulletGeom = new THREE.BoxGeometry(0.045, 0.045, 0.055);
    const bulletMat = new THREE.MeshStandardMaterial({
      color: fromPlayer ? 0xfacc15 : 0xf97316, // Golden yellow for player, bright orange for NPCs
      emissive: fromPlayer ? 0xeab308 : 0xe11d48,
      emissiveIntensity: 1.2,
      roughness: 0.15,
      metalness: 0.85,
    });
    const bulletMesh = new THREE.Mesh(bulletGeom, bulletMat);
    tracerGroup.add(bulletMesh);

    tracerGroup.position.copy(pos);
    tracerGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    this.scene.add(tracerGroup);

    const bullet: Bullet3D = {
      id,
      shooterId,
      fromPlayer,
      origin: origin.clone(),
      pos,
      dir: dir.clone(),
      speed: 52, // Physical visible speed (52 m/s)
      life: 1.8,
      maxLife: 1.8,
      damage,
      tracerMesh: tracerGroup as any,
    };

    this.bullets.push(bullet);
  }

  public spawnVoxelBlock(
    x: number,
    y: number,
    z: number,
    type: 'stone' | 'wood' | 'neon' | 'flesh' | 'brick' | 'gold' | 'water' | 'leaf' | 'roof' | 'glass' | 'wall' | 'asphalt' | 'slime' | 'skin' = 'stone',
    size: number = 0.8,
    customColor?: number
  ): VoxelBlock3D {
    const id = 'voxel_' + Math.random().toString(36).substring(2, 9);

    const colorMap: Record<string, { color: number; emissive?: number; roughness: number }> = {
      stone: { color: 0x64748b, roughness: 0.8 },
      wood: { color: 0x78350f, roughness: 0.75 },
      leaf: { color: 0x15803d, roughness: 0.9 },
      roof: { color: 0x991b1b, roughness: 0.75 },
      brick: { color: 0xb91c1c, roughness: 0.85 },
      wall: { color: 0xf1f5f9, roughness: 0.8 },
      glass: { color: 0x93c5fd, roughness: 0.1 },
      asphalt: { color: 0x1e293b, roughness: 0.9 },
      neon: { color: 0x06b6d4, emissive: 0x0891b2, roughness: 0.2 },
      flesh: { color: 0xf5d0b5, roughness: 0.55 },
      gold: { color: 0xfacc15, emissive: 0x854d0e, roughness: 0.3 },
      water: { color: 0x0ea5e9, roughness: 0.1, emissive: 0x0284c7 },
      slime: { color: 0x22c55e, roughness: 0.05, emissive: 0x14532d },
      skin: { color: 0xe2a784, roughness: 0.65 },
    };

    const conf = colorMap[type] || colorMap.stone;
    const finalColor = customColor !== undefined ? customColor : conf.color;
    
    let geom: THREE.BufferGeometry;
    const isJelly = type === 'slime' || type === 'skin';
    if (isJelly) {
      geom = new THREE.BoxGeometry(size, size, size, 8, 8, 8);
      
      // Store a clone of the original position coordinates for vertex-level stretching!
      const origPosArray = new Float32Array(geom.attributes.position.array);
      const baseDeformedArray = new Float32Array(geom.attributes.position.array);
      geom.userData = { origPosArray, baseDeformedArray, isDeformed: false };
      
      // Initialize vertex colors
      const count = geom.attributes.position.count;
      const colors = new Float32Array(count * 3);
      const baseColorObj = new THREE.Color(finalColor);
      for (let j = 0; j < count; j++) {
        colors[j * 3] = baseColorObj.r;
        colors[j * 3 + 1] = baseColorObj.g;
        colors[j * 3 + 2] = baseColorObj.b;
      }
      geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    } else {
      geom = new THREE.BoxGeometry(size, size, size);
    }
    
    const texture = getLowResTexture(type);
    
    const mat = new THREE.MeshStandardMaterial({
      color: isJelly ? (type === 'slime' ? (customColor !== undefined ? customColor : 0x22c55e) : 0xffffff) : finalColor, // white so vertex colors render perfectly
      vertexColors: isJelly && type !== 'slime',
      emissive: type === 'slime' ? (customColor !== undefined ? 0x000000 : 0x14532d) : (conf.emissive || 0x000000),
      roughness: type === 'slime' ? 0.08 : conf.roughness,
      metalness: type === 'gold' ? 0.8 : (type === 'glass' ? 0.1 : (type === 'slime' ? 0.2 : 0.05)),
      map: texture || null,
      transparent: type === 'water' || type === 'glass' || type === 'slime',
      opacity: type === 'water' ? 0.65 : (type === 'glass' ? 0.6 : (type === 'slime' ? 0.45 : 1.0)),
      side: type === 'slime' ? THREE.DoubleSide : THREE.FrontSide,
      depthWrite: type !== 'slime',
    });

    const mesh = new THREE.Mesh(geom, mat);
    if (type === 'slime') {
      mesh.renderOrder = 8;
      // Add visible internal green cubic voxel blocks inside the translucent slime mesh (3x3x3 grid)
      const innerGroup = new THREE.Group();
      innerGroup.name = 'slime_inner_voxels';
      const divisions = 3; // 3x3x3 grid of inner voxel blocks
      const innerVoxelSize = (size * 0.74) / divisions;
      const innerGeom = new THREE.BoxGeometry(innerVoxelSize * 0.88, innerVoxelSize * 0.88, innerVoxelSize * 0.88);
      const innerMat = new THREE.MeshStandardMaterial({
        color: customColor !== undefined ? customColor : 0x16a34a,
        emissive: customColor !== undefined ? 0x000000 : 0x064e3b,
        roughness: 0.35,
        metalness: 0.10,
        depthWrite: true,
      });
      for (let ix = 0; ix < divisions; ix++) {
        for (let iy = 0; iy < divisions; iy++) {
          for (let iz = 0; iz < divisions; iz++) {
            const bx = -((divisions - 1) * innerVoxelSize) / 2 + ix * innerVoxelSize;
            const by = -((divisions - 1) * innerVoxelSize) / 2 + iy * innerVoxelSize;
            const bz = -((divisions - 1) * innerVoxelSize) / 2 + iz * innerVoxelSize;
            const innerCube = new THREE.Mesh(innerGeom, innerMat);
            innerCube.position.set(bx, by, bz);
            innerCube.renderOrder = 2;
            const isWall = (ix === 0 || ix === divisions - 1 || iy === 0 || iy === divisions - 1 || iz === 0 || iz === divisions - 1);
            innerCube.userData = {
              origX: bx,
              origY: by,
              origZ: bz,
              origPos: new THREE.Vector3(bx, by, bz),
              currentOffset: new THREE.Vector3(0, 0, 0),
              ix,
              iy,
              iz,
              isWallBlock: isWall,
            };
            innerGroup.add(innerCube);
          }
        }
      }
      mesh.add(innerGroup);
    }
    // Snap Y to sit flat on floor or stack
    const clampedY = Math.max(size / 2, y);
    mesh.position.set(x, clampedY, z);
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    this.scene.add(mesh);

    const block: VoxelBlock3D = {
      id,
      x,
      y: clampedY,
      z,
      size,
      color: finalColor,
      type: type as any,
      mesh,
      customColor,
      isJelly,
      jellyType: isJelly ? (type as 'slime' | 'skin') : undefined,
      wobbleScale: isJelly ? new THREE.Vector3(1, 1, 1) : undefined,
      wobbleVel: isJelly ? new THREE.Vector3(0, 0, 0) : undefined,
      shearOffset: isJelly ? new THREE.Vector3(0, 0, 0) : undefined,
      shearVel: isJelly ? new THREE.Vector3(0, 0, 0) : undefined,
      stiffness: type === 'slime' ? 180 : 320,
      damping: type === 'slime' ? 8 : 15,
      health: 100,
      maxHealth: 100,
      baseScale: isJelly ? 1.0 : undefined,
    };

    this.voxelBlocks.push(block);
    soundEngine.playImpact(0.4);
    return block;
  }

  public spawnVoxelStructure(structure: 'stair' | 'tower' | 'wall' | 'flesh_pyramid', originX: number, originZ: number) {
    const size = 0.8;
    if (structure === 'stair') {
      for (let i = 0; i < 4; i++) {
        for (let h = 0; h <= i; h++) {
          this.spawnVoxelBlock(originX + i * size, h * size + size / 2, originZ, 'stone', size);
        }
      }
    } else if (structure === 'tower') {
      for (let h = 0; h < 5; h++) {
        this.spawnVoxelBlock(originX, h * size + size / 2, originZ, 'neon', size);
      }
    } else if (structure === 'wall') {
      for (let dx = -1; dx <= 1; dx++) {
        for (let h = 0; h < 3; h++) {
          this.spawnVoxelBlock(originX + dx * size, h * size + size / 2, originZ, 'brick', size);
        }
      }
    } else if (structure === 'flesh_pyramid') {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          this.spawnVoxelBlock(originX + dx * size, size / 2, originZ + dz * size, 'flesh', size);
        }
      }
      this.spawnVoxelBlock(originX, size + size / 2, originZ, 'gold', size);
    }
  }

  /**
   * Spawns a fully destructible voxel tree composed of individual wood trunk blocks and leaf canopy blocks.
   * Every single block can be shot, shattered into debris, or exploded!
   */
  public spawnVoxelTree(originX: number, originZ: number, trunkHeight: number = 4, size: number = 0.8, originY: number = 0) {
    // 1. Wood Trunk Blocks
    for (let h = 0; h < trunkHeight; h++) {
      this.spawnVoxelBlock(originX, originY + h * size + size / 2, originZ, 'wood', size, 0x78350f);
    }

    // 2. Leaf Canopy Lower Tier (3x3 blocks around trunk upper levels)
    const canopyStartH = trunkHeight - 1;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dz === 0) continue; // Trunk is in center
        this.spawnVoxelBlock(
          originX + dx * size,
          originY + canopyStartH * size + size / 2,
          originZ + dz * size,
          'leaf',
          size,
          0x15803d
        );
      }
    }

    // 3. Leaf Canopy Mid Tier (3x3 solid block layer above trunk)
    const midH = trunkHeight;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        this.spawnVoxelBlock(
          originX + dx * size,
          originY + midH * size + size / 2,
          originZ + dz * size,
          'leaf',
          size,
          0x16a34a
        );
      }
    }

    // 4. Leaf Canopy Crown (Top cross / peak)
    const topH = trunkHeight + 1;
    const crownOffsets = [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dx, dz] of crownOffsets) {
      this.spawnVoxelBlock(
        originX + dx * size,
        originY + topH * size + size / 2,
        originZ + dz * size,
        'leaf',
        size,
        0x22c55e
      );
    }
  }

  /**
   * Spawns a destructible rock formation consisting of exactly 40 voxel blocks (same block count as a door: 5x8).
   * Arranged in a tiered boulder mound (16 + 12 + 9 + 3 = 40 blocks) that can be individually shot & shattered.
   */
  public spawnVoxelRock(originX: number, originY: number = 0, originZ: number, size: number = 0.75) {
    const rockColors = [0x475569, 0x64748b, 0x334155, 0x52525b, 0x3f3f46, 0x71717a];
    const getRandomRockColor = () => rockColors[Math.floor(Math.random() * rockColors.length)];

    // Layer 0: Base 4x4 = 16 blocks (dx: -1.5, -0.5, 0.5, 1.5; dz: -1.5, -0.5, 0.5, 1.5)
    const h0_y = originY + size / 2;
    for (let ix = 0; ix < 4; ix++) {
      for (let iz = 0; iz < 4; iz++) {
        const rx = originX + (ix - 1.5) * size;
        const rz = originZ + (iz - 1.5) * size;
        this.spawnVoxelBlock(rx, h0_y, rz, 'stone', size, getRandomRockColor());
      }
    }

    // Layer 1: Mid Tier 3x4 = 12 blocks (dx: -1, 0, 1; dz: -1.5, -0.5, 0.5, 1.5)
    const h1_y = originY + size + size / 2;
    for (let ix = 0; ix < 3; ix++) {
      for (let iz = 0; iz < 4; iz++) {
        const rx = originX + (ix - 1.0) * size;
        const rz = originZ + (iz - 1.5) * size;
        this.spawnVoxelBlock(rx, h1_y, rz, 'stone', size, getRandomRockColor());
      }
    }

    // Layer 2: Upper Tier 3x3 = 9 blocks (dx: -1, 0, 1; dz: -1, 0, 1)
    const h2_y = originY + size * 2 + size / 2;
    for (let ix = 0; ix < 3; ix++) {
      for (let iz = 0; iz < 3; iz++) {
        const rx = originX + (ix - 1.0) * size;
        const rz = originZ + (iz - 1.0) * size;
        this.spawnVoxelBlock(rx, h2_y, rz, 'stone', size, getRandomRockColor());
      }
    }

    // Layer 3: Top Apex Tier 1x3 = 3 blocks (dx: 0; dz: -1, 0, 1)
    const h3_y = originY + size * 3 + size / 2;
    for (let iz = 0; iz < 3; iz++) {
      const rx = originX;
      const rz = originZ + (iz - 1.0) * size;
      this.spawnVoxelBlock(rx, h3_y, rz, 'stone', size, getRandomRockColor());
    }

    // Total blocks = 16 + 12 + 9 + 3 = 40 blocks (equal to door block count: 5x8 = 40)
  }

  /**
   * Generates the procedural "generate" map:
   * - Destructible grass floor (individual voxel blocks)
   * - Procedurally generated hills with stacked destructible terrain blocks
   * - Destructible voxel trees (wood trunk + leaf canopy) on top of hills/terrain
   * - Destructible rock formations of exactly 40 blocks (same block count as a door)
   */
  public spawnGenerateVoxelWorld() {
    this.clearVoxelBlocks();

    const blockSize = 1.0;
    const halfGrid = 20; // 41x41 columns with smooth performance

    const seedX = Math.random() * 100;
    const seedZ = Math.random() * 100;
    const freq = 0.09 + Math.random() * 0.03;

    const getHillHeight = (gx: number, gz: number): number => {
      const distFromCenter = Math.sqrt(gx * gx + gz * gz);
      if (distFromCenter < 4.0) return 0; // Flat safe spawn zone for character
      
      const n1 = Math.sin(gx * freq + seedX) * Math.cos(gz * freq + seedZ) * 2.2;
      const n2 = Math.sin((gx + gz) * (freq * 1.4) + seedZ * 0.5) * 1.1;
      const n3 = Math.cos(gx * (freq * 0.6) - gz * (freq * 0.6)) * 0.9;
      const raw = n1 + n2 + n3;
      
      const edgeFactor = Math.min(1.0, (distFromCenter - 3.5) / 5.0);
      const elevation = Math.max(0, Math.floor((raw + 0.7) * edgeFactor * 0.85));
      return Math.min(3, elevation); // 0 to 3 extra hill layers
    };

    const grassColors = [0x16a34a, 0x22c55e, 0x15803d, 0x166534, 0x4ade80, 0x15803d];
    const soilColors = [0x78350f, 0x5c2e0b, 0x451a03, 0x92400e];

    // 1. Generate destructible voxel floor & rolling hills
    for (let ix = -halfGrid; ix <= halfGrid; ix++) {
      for (let iz = -halfGrid; iz <= halfGrid; iz++) {
        const wx = ix * blockSize;
        const wz = iz * blockSize;
        const hillElevation = getHillHeight(wx, wz);

        // Sub-layers (dirt/soil) for hills
        for (let h = 0; h < hillElevation; h++) {
          const hy = h * blockSize + blockSize / 2;
          const dirtColor = soilColors[Math.floor(Math.random() * soilColors.length)];
          this.spawnVoxelBlock(wx, hy, wz, 'wood', blockSize, dirtColor);
        }

        // Top surface layer (grass)
        const topY = hillElevation * blockSize + blockSize / 2;
        const grassColor = grassColors[Math.floor(Math.random() * grassColors.length)];
        this.spawnVoxelBlock(wx, topY, wz, 'leaf', blockSize, grassColor);
      }
    }

    // 2. Destructible Voxel Trees placed on hills & valleys
    const treeCoords: { x: number; z: number }[] = [];
    const minTreeDist = 4.5;

    for (let attempts = 0; attempts < 60 && treeCoords.length < 16; attempts++) {
      const tx = (Math.floor((Math.random() - 0.5) * (halfGrid * 1.5))) * blockSize;
      const tz = (Math.floor((Math.random() - 0.5) * (halfGrid * 1.5))) * blockSize;
      const distToSpawn = Math.sqrt(tx * tx + tz * tz);
      if (distToSpawn < 4.5) continue;

      const tooClose = treeCoords.some(c => Math.hypot(c.x - tx, c.z - tz) < minTreeDist);
      if (tooClose) continue;

      treeCoords.push({ x: tx, z: tz });
      const elevation = getHillHeight(tx, tz);
      const baseGroundY = (elevation + 1) * blockSize;
      const trunkH = 4 + Math.floor(Math.random() * 3);
      this.spawnVoxelTree(tx, tz, trunkH, 0.8, baseGroundY);
    }

    // 3. Destructible Voxel Rocks of 40 blocks each placed across terrain
    const rockCoords: { x: number; z: number }[] = [];
    const minRockDist = 5.0;

    for (let attempts = 0; attempts < 50 && rockCoords.length < 9; attempts++) {
      const rx = (Math.floor((Math.random() - 0.5) * (halfGrid * 1.5))) * blockSize;
      const rz = (Math.floor((Math.random() - 0.5) * (halfGrid * 1.5))) * blockSize;
      const distToSpawn = Math.sqrt(rx * rx + rz * rz);
      if (distToSpawn < 4.5) continue;

      const nearTree = treeCoords.some(c => Math.hypot(c.x - rx, c.z - rz) < 3.5);
      if (nearTree) continue;

      const tooClose = rockCoords.some(c => Math.hypot(c.x - rx, c.z - rz) < minRockDist);
      if (tooClose) continue;

      rockCoords.push({ x: rx, z: rz });
      const elevation = getHillHeight(rx, rz);
      const baseGroundY = (elevation + 1) * blockSize;
      this.spawnVoxelRock(rx, baseGroundY, rz, 0.75);
    }
  }

  /**
   * Spawns a small residential house constructed completely of destructible voxel blocks.
   */
  public spawnVoxelHouse(
    originX: number,
    originZ: number,
    style: 'brick_cottage' | 'modern_villa' | 'wooden_cabin' | 'townhouse' = 'brick_cottage',
    size: number = 0.8
  ) {
    const half = 2; // 5x5 footprint: dx from -2 to 2, dz from -2 to 2
    const wallType = style === 'brick_cottage' ? 'brick' : (style === 'wooden_cabin' ? 'wood' : (style === 'modern_villa' ? 'wall' : 'brick'));
    const roofType = style === 'wooden_cabin' ? 'wood' : (style === 'modern_villa' ? 'stone' : 'roof');
    const wallColor = style === 'brick_cottage' ? 0xb91c1c : (style === 'wooden_cabin' ? 0x92400e : (style === 'modern_villa' ? 0xf8fafc : 0xb45309));

    // 1. Foundation & Stone Floor
    for (let dx = -half; dx <= half; dx++) {
      for (let dz = -half; dz <= half; dz++) {
        this.spawnVoxelBlock(originX + dx * size, size / 2, originZ + dz * size, 'stone', size, 0x64748b);
      }
    }

    // 2. Wall Blocks (3 layers of height: h = 1, 2, 3)
    for (let h = 1; h <= 3; h++) {
      for (let dx = -half; dx <= half; dx++) {
        for (let dz = -half; dz <= half; dz++) {
          const isPerimeter = Math.abs(dx) === half || Math.abs(dz) === half;
          if (!isPerimeter) continue;

          // Door opening at front center (dz === half, dx === 0, h <= 2)
          if (dz === half && dx === 0 && h <= 2) {
            continue;
          }

          // Window openings on left/right side walls (h === 2, dx === ±half, dz === 0)
          if (h === 2 && Math.abs(dx) === half && dz === 0) {
            this.spawnVoxelBlock(originX + dx * size, h * size + size / 2, originZ + dz * size, 'glass', size);
            continue;
          }

          // Back wall window (h === 2, dz === -half, dx === 0)
          if (h === 2 && dz === -half && dx === 0) {
            this.spawnVoxelBlock(originX + dx * size, h * size + size / 2, originZ + dz * size, 'glass', size);
            continue;
          }

          this.spawnVoxelBlock(originX + dx * size, h * size + size / 2, originZ + dz * size, wallType, size, wallColor);
        }
      }
    }

    // 3. Roof Structures
    if (style === 'modern_villa') {
      // Flat Terrace Roof with accessible balcony parapet
      const roofH = 4;
      for (let dx = -half; dx <= half; dx++) {
        for (let dz = -half; dz <= half; dz++) {
          this.spawnVoxelBlock(originX + dx * size, roofH * size + size / 2, originZ + dz * size, 'stone', size, 0x94a3b8);
        }
      }
      // Parapet border
      const parapetH = 5;
      for (let dx = -half; dx <= half; dx++) {
        for (let dz = -half; dz <= half; dz++) {
          if (Math.abs(dx) === half || Math.abs(dz) === half) {
            this.spawnVoxelBlock(originX + dx * size, parapetH * size + size / 2, originZ + dz * size, 'wall', size, 0xf1f5f9);
          }
        }
      }
    } else {
      // Pitched / Gabled Roof
      // Tier 1: 5x5 roof overhang
      const roofH1 = 4;
      for (let dx = -half; dx <= half; dx++) {
        for (let dz = -half; dz <= half; dz++) {
          this.spawnVoxelBlock(originX + dx * size, roofH1 * size + size / 2, originZ + dz * size, roofType, size);
        }
      }
      // Tier 2: 3x5 pitched ridge
      const roofH2 = 5;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -half; dz <= half; dz++) {
          this.spawnVoxelBlock(originX + dx * size, roofH2 * size + size / 2, originZ + dz * size, roofType, size);
        }
      }
      // Tier 3: 1x5 apex ridge
      const roofH3 = 6;
      for (let dz = -half; dz <= half; dz++) {
        this.spawnVoxelBlock(originX, roofH3 * size + size / 2, originZ + dz * size, roofType, size);
      }

      // Brick Chimney stack on roof
      this.spawnVoxelBlock(originX + size, (roofH2 + 1) * size + size / 2, originZ - size, 'brick', size, 0x881337);
      this.spawnVoxelBlock(originX + size, (roofH2 + 2) * size + size / 2, originZ - size, 'brick', size, 0x881337);
    }

    // 4. Interior Furniture (Destructible wooden table/sofa inside house)
    this.spawnVoxelBlock(originX - size, size + size / 2, originZ, 'wood', size, 0xb45309);

    // 5. Interactive Door in front opening
    this.spawnDoor(originX, 0, originZ + (half + 0.1) * size);
  }

  /**
   * Generates the complete neighborhood with small houses made of blocks, streets, and destructible trees.
   */
  public spawnNeighborhoodVoxelWorld() {
    this.clearVoxelBlocks();

    // 1. Four Neighborhood Houses in 4 Quadrants
    // North-West Quadrant House (Red Brick Cottage)
    this.spawnVoxelHouse(-18, -18, 'brick_cottage', 0.8);

    // North-East Quadrant House (Modern Slate & Stone Villa)
    this.spawnVoxelHouse(18, -18, 'modern_villa', 0.8);

    // South-West Quadrant House (Cozy Wooden Cabin)
    this.spawnVoxelHouse(-18, 18, 'wooden_cabin', 0.8);

    // South-East Quadrant House (Two-Story Townhouse)
    this.spawnVoxelHouse(18, 18, 'townhouse', 0.8);

    // 2. Destructible Voxel Trees across front yards and along sidewalks
    const treePositions = [
      // North-West lot trees
      [-9, -8, 4],
      [-26, -9, 5],
      [-25, -25, 4],
      [-9, -25, 4],
      // North-East lot trees
      [9, -8, 4],
      [26, -9, 5],
      [25, -25, 4],
      [9, -25, 4],
      // South-West lot trees
      [-9, 8, 4],
      [-26, 9, 5],
      [-25, 25, 4],
      [-9, 25, 4],
      // South-East lot trees
      [9, 8, 4],
      [26, 9, 5],
      [25, 25, 4],
      [9, 25, 4],
    ];

    for (const [tx, tz, th] of treePositions) {
      this.spawnVoxelTree(tx, tz, th, 0.8);
    }
  }

  /**
   * Loads a new map into the physics engine and reconstructs the scene environment.
   */
  public loadMap(map: GameMap3D) {
    this.map = map;

    // Remove existing environment meshes
    const existingEnv = this.scene.getObjectByName('map_environment');
    if (existingEnv) {
      this.scene.remove(existingEnv);
    }

    // Adjust shadows for cesped2 map (no shadows in cesped2)
    const isCesped2 = map.theme === 'cesped2' || map.id === 'cesped2';
    this.scene.traverse((obj) => {
      if ((obj as THREE.Light).isLight) {
        const light = obj as THREE.DirectionalLight;
        if (light.castShadow !== undefined) {
          light.castShadow = !isCesped2;
        }
      }
    });

    // Build new procedural environment floor & scenery
    buildSceneEnvironment3D(this.scene, map);
    this.clearMovingPlatforms();

    // Clear previous map-specific obstacles
    this.houseBlocks = this.houseBlocks.filter((b) => b.id !== 'map_obstacle');

    // If cesped2 map, spawn single-draw-call instanced destructible floor
    if (isCesped2) {
      this.spawnCesped2Floor();
    } else {
      this.clearCesped2Floor();
      this.clearVoxelBlocks();
    }

    if (map.theme === 'almacen') {
      // 1. Enclosing Walls
      const wallHeight = 10;
      const halfWidth = 30;

      // North Wall
      this.houseBlocks.push({ id: 'map_obstacle', x: 0, y: wallHeight / 2, z: -halfWidth, width: 60, height: wallHeight, depth: 1, mesh: new THREE.Mesh() });
      // South Wall
      this.houseBlocks.push({ id: 'map_obstacle', x: 0, y: wallHeight / 2, z: halfWidth, width: 60, height: wallHeight, depth: 1, mesh: new THREE.Mesh() });
      // West Wall
      this.houseBlocks.push({ id: 'map_obstacle', x: -halfWidth, y: wallHeight / 2, z: 0, width: 1, height: wallHeight, depth: 60, mesh: new THREE.Mesh() });
      // East Wall
      this.houseBlocks.push({ id: 'map_obstacle', x: halfWidth, y: wallHeight / 2, z: 0, width: 1, height: wallHeight, depth: 60, mesh: new THREE.Mesh() });

      // 2. Concrete Pillars - matching column/lamp positions at (-15,-15), (-15,15), (15,-15), (15,15), (0,0)
      const lampPositions = [
        { lx: -15, lz: -15 },
        { lx: -15, lz: 15 },
        { lx: 15, lz: -15 },
        { lx: 15, lz: 15 },
        { lx: 0, lz: 0 },
      ];
      lampPositions.forEach(({ lx, lz }) => {
        this.houseBlocks.push({
          id: 'map_obstacle',
          x: lx,
          y: wallHeight / 2,
          z: lz,
          width: 1.4,
          height: wallHeight,
          depth: 1.4,
          mesh: new THREE.Mesh(),
        });
      });

      // 3. Rack Shelves (Each rack has a middle shelf at y=2.47 and top shelf at y=4.67)
      const rackPositions = [
        { rx: -12, rz: -18 }, { rx: -12, rz: 0 }, { rx: -12, rz: 18 },
        { rx: 12, rz: -18 }, { rx: 12, rz: 0 }, { rx: 12, rz: 18 }
      ];
      rackPositions.forEach(({ rx, rz }) => {
        // Middle shelf
        this.houseBlocks.push({
          id: 'map_obstacle',
          x: rx,
          y: 2.47,
          z: rz,
          width: 2.0,
          height: 0.1,
          depth: 12.0,
          mesh: new THREE.Mesh(),
        });
        // Top shelf
        this.houseBlocks.push({
          id: 'map_obstacle',
          x: rx,
          y: 4.67,
          z: rz,
          width: 2.0,
          height: 0.1,
          depth: 12.0,
          mesh: new THREE.Mesh(),
        });

        // 4. Pre-spawn destructible wooden voxel blocks on the shelf levels!
        this.spawnVoxelBlock(rx, 2.91, rz - 3, 'wood', 0.88);
        this.spawnVoxelBlock(rx, 2.91, rz + 3, 'wood', 0.88);
        this.spawnVoxelBlock(rx, 5.11, rz, 'wood', 0.88);
      });
    }

    // Always ensure map has ONLY the door ("mapas no tengan plataforma ni bloques solo la puerta")
    if (this.doors.length === 0) {
      this.spawnDoor(0, 0, 4.0);
    }

    // Reset player position to safe map spawn
    const player = this.ragdolls.find((r) => r.isControlled) || this.ragdolls[0];
    if (player) {
      const dx = map.spawnPoint.x - player.charPos.x;
      const dz = map.spawnPoint.z - player.charPos.z;
      player.charPos.set(map.spawnPoint.x, 0, map.spawnPoint.z);
      for (const p of player.particles) {
        p.vx = 0;
        p.vy = 0;
        p.vz = 0;
        p.x += dx;
        p.z += dz;
        p.oldX = p.x;
        p.oldY = p.y;
        p.oldZ = p.z;
      }
    }
  }

  public getGroundHeight(x: number, z: number, currentY?: number): number {
    // 1. Check Subterranean / Surface 3D Vertical Voxel Tube & Branching Cave network
    for (const ragdoll of this.ragdolls) {
      if ((ragdoll.name === 'Cave Tentacle' || ragdoll.id.startsWith('cave_tentacle')) && ragdoll.isAlive) {
        const cubeSize = 0.88 * ragdoll.scale;
        const dx = x - ragdoll.charPos.x;
        const dz = z - ragdoll.charPos.z;
        const distToCenter = Math.hypot(dx, dz);

        const spawnY = ragdoll.charPos.y;
        const bottomY = spawnY - 12 * cubeSize;

        // A. Is player inside the 1-block entrance hole or inside the vertical shaft?
        // ("en realidad debe ser un tubo de bloques que deje un espacio para entrar de 1 bloque y no rompe bien el piso de adentro soluciona eso")
        if (Math.abs(dx) <= 0.65 * cubeSize && Math.abs(dz) <= 0.65 * cubeSize) {
          // Inside 1-block hole: floor is 100% hollow/broken from surface down to bottom! Aligned with branch floor (bottomY - 0.5 * cubeSize)
          return bottomY - 0.5 * cubeSize;
        }
        if (distToCenter <= 0.85 * cubeSize) {
          return bottomY - 0.5 * cubeSize;
        }

        // B. Is player inside one of the branching tunnels at the bottom?
        const caveBranches = [
          { angle: -0.4 * Math.PI, length: 10, dy: -0.1 },
          { angle: 0.35 * Math.PI, length: 11, dy: 0.1 },
          { angle: -0.85 * Math.PI, length: 9, dy: 0.0 },
          { angle: 0.8 * Math.PI, length: 12, dy: 0.15 },
        ];

        for (const br of caveBranches) {
          const sinA = Math.sin(br.angle);
          const cosA = Math.cos(br.angle);
          const dist = dx * sinA + dz * cosA;
          const perp = Math.abs(dx * (-cosA) - dz * sinA);

          if (dist >= 0 && dist <= br.length * cubeSize) {
            if (perp <= 1.45 * cubeSize) {
              const cy = bottomY + (dist / cubeSize) * br.dy * cubeSize;
              const floorY = cy - 0.5 * cubeSize; // Stand on floor block
              // If player is inside this branch corridor, return floorY as the ground height!
              if (currentY === undefined || currentY < spawnY - 1.2) {
                return floorY;
              }
            }
          }
        }
      }
    }

    if (this.map.id === 'cesped2' || this.map.theme === 'cesped2') {
      const subSize = 0.44;
      const subIx = Math.round(x / subSize);
      const subIz = Math.round(z / subSize);
      const colKey = (subIx + 1000) * 10000 + (subIz + 1000);
      const col = this.cesped2ColBlocks.get(colKey);
      if (col && col.length > 0) {
        // Step-up allowance of up to 1.15m (allows stepping onto hills, ramps, and tiered voxel steps)
        const scanTop = currentY !== undefined ? currentY + 1.15 : Infinity;
        for (let i = 0; i < col.length; i++) {
          const blk = col[i];
          if (blk.active && (blk.y + subSize * 0.5) <= scanTop) {
            return blk.y + subSize * 0.5;
          }
        }
        // If highest active block was slightly above scanTop (e.g. abrupt slope), step up if within 1.35m
        if (currentY !== undefined) {
          for (let i = 0; i < col.length; i++) {
            const blk = col[i];
            if (blk.active && (blk.y + subSize * 0.5) <= currentY + 1.35) {
              return blk.y + subSize * 0.5;
            }
          }
        }
      }

      // Fallback: outside voxelized grid or unexcavated area, use procedural terrain height (infinite bounds, no void limits)
      return getForestTerrainHeight(x, z);
    }

    if (this.map.width && (Math.abs(x) > this.map.width / 2 + 10 || Math.abs(z) > this.map.depth / 2 + 10)) {
      return -Infinity;
    }
    return 0;
  }

  public spawnCesped2Floor() {
    this.clearCesped2Floor();
    this.clearVoxelBlocks();
    this.cesped2ColBlocks.clear();

    const registerColBlock = (ix: number, iz: number, blkRef: { y: number; active: boolean }) => {
      const key = (ix + 1000) * 10000 + (iz + 1000);
      let arr = this.cesped2ColBlocks.get(key);
      if (!arr) {
        arr = [];
        this.cesped2ColBlocks.set(key, arr);
      }
      arr.push(blkRef);
    };

    const blockSize = 0.88;
    const subSize = blockSize / 2; // 0.44m sub-voxel size (2x2x2 = 8 sub-divisions per block)
    const halfGrid = 18; // 37x37 grid
    const gridDim = halfGrid * 2 + 1;
    const totalGrassBlocks = gridDim * gridDim;
    const totalDirtBlocks = totalGrassBlocks * 2; // 2 subsurface layers

    // Compute Tree Positions
    interface TreeDef {
      twx: number;
      twz: number;
      baseY: number;
      trunkH: number;
    }
    const trees: TreeDef[] = [];
    let estimatedWoodBlocks = 0;
    let estimatedLeavesBlocks = 0;

    for (let tx = -56; tx <= 56; tx += 16) {
      for (let tz = -56; tz <= 56; tz += 16) {
        const jx = Math.sin(tx * 4.3 + tz * 1.7) * 4.5;
        const jz = Math.cos(tx * 2.1 + tz * 3.9) * 4.5;
        const twx = Math.round((tx + jx)) * blockSize;
        const twz = Math.round((tz + jz)) * blockSize;

        const distCenter = Math.sqrt(twx * twx + twz * twz);
        if (distCenter < 3.8 || Math.abs(twx) > halfGrid * blockSize * 0.9 || Math.abs(twz) > halfGrid * blockSize * 0.9) {
          continue;
        }

        const treeNorm = getForestTerrainNormal(twx, twz, blockSize);
        if (treeNorm.y < 0.92) continue;

        const baseY = getForestTerrainHeight(twx, twz);
        const trunkH = 6 + Math.floor((Math.sin(tx * 5.1 + tz) + 1.0) * 1.5);

        trees.push({ twx, twz, baseY, trunkH });
        estimatedWoodBlocks += trunkH;

        for (let dy = trunkH - 3; dy <= trunkH + 1; dy++) {
          const radius = dy <= trunkH - 2 ? 2 : (dy <= trunkH ? 1 : 0);
          for (let lx = -radius; lx <= radius; lx++) {
            for (let lz = -radius; lz <= radius; lz++) {
              if (radius === 2 && Math.abs(lx) === 2 && Math.abs(lz) === 2) continue;
              if (lx === 0 && lz === 0 && dy < trunkH) continue;
              estimatedLeavesBlocks++;
            }
          }
        }
      }
    }

    // Sub-voxel geometry: 8 sub-divisions per block (0.44m) with visible seam divisions
    const subGeom = new THREE.BoxGeometry(subSize * 0.96, subSize * 0.96, subSize * 0.96);

    // Shaded materials: no shadows for cesped2 map
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x2d6a4f,
      roughness: 0.8,
      metalness: 0.05,
    });
    const dirtMat = new THREE.MeshStandardMaterial({
      color: 0x582f0e,
      roughness: 0.95,
      metalness: 0.02,
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x6f4e37,
      roughness: 0.85,
      metalness: 0.05,
    });
    const leavesMat = new THREE.MeshStandardMaterial({
      color: 0x1b4332,
      roughness: 0.75,
      metalness: 0.05,
      alphaTest: 0.2,
    });

    // SUB-VOXEL INSTANCED MESHES: all sub-divisions rendered directly from start
    const maxGrassSubCount = totalGrassBlocks * 8;
    const maxDirtSubCount = totalDirtBlocks * 8;
    const maxWoodSubCount = Math.max(1, estimatedWoodBlocks * 8);
    const maxLeavesSubCount = Math.max(1, estimatedLeavesBlocks * 8);

    const subGrassMesh = new THREE.InstancedMesh(subGeom, grassMat, maxGrassSubCount);
    subGrassMesh.name = 'cesped2_grass_sub';
    subGrassMesh.castShadow = false;
    subGrassMesh.receiveShadow = false;

    const subDirtMesh = new THREE.InstancedMesh(subGeom, dirtMat, maxDirtSubCount);
    subDirtMesh.name = 'cesped2_dirt_sub';
    subDirtMesh.castShadow = false;
    subDirtMesh.receiveShadow = false;

    const subWoodMesh = new THREE.InstancedMesh(subGeom, woodMat, maxWoodSubCount);
    subWoodMesh.name = 'cesped2_wood_sub';
    subWoodMesh.castShadow = false;
    subWoodMesh.receiveShadow = false;

    const subLeavesMesh = new THREE.InstancedMesh(subGeom, leavesMat, maxLeavesSubCount);
    subLeavesMesh.name = 'cesped2_leaves_sub';
    subLeavesMesh.castShadow = false;
    subLeavesMesh.receiveShadow = false;

    const dummy = new THREE.Object3D();

    let subGrassIdx = 0;
    let subDirtIdx = 0;
    let subWoodIdx = 0;
    let subLeavesIdx = 0;

    // 1. Generate Surface Grass and Subsurface Dirt with 8 Visible Sub-divisions per Block
    for (let ix = -halfGrid; ix <= halfGrid; ix++) {
      for (let iz = -halfGrid; iz <= halfGrid; iz++) {
        const wx = ix * blockSize;
        const wz = iz * blockSize;
        const topY = getForestTerrainHeight(wx, wz);

        // Top Grass Block (2x2x2 sub-divisions)
        const gCenterY = topY - blockSize * 0.5;
        for (let sx = 0; sx < 2; sx++) {
          for (let sy = 0; sy < 2; sy++) {
            for (let sz = 0; sz < 2; sz++) {
              const vx = wx - subSize * 0.5 + sx * subSize;
              const vy = gCenterY - subSize * 0.5 + sy * subSize;
              const vz = wz - subSize * 0.5 + sz * subSize;
              const subKey = `${Math.round(vx / subSize)}_${Math.round(vy / subSize)}_${Math.round(vz / subSize)}`;

              dummy.position.set(vx, vy, vz);
              dummy.rotation.set(0, 0, 0);
              dummy.scale.set(1, 1, 1);
              dummy.updateMatrix();
              subGrassMesh.setMatrixAt(subGrassIdx, dummy.matrix);

              const grassObj = {
                index: subGrassIdx,
                active: true,
                x: vx,
                y: vy,
                z: vz,
                color: 0x2d6a4f,
              };
              this.cesped2Blocks.set(subKey, grassObj);
              registerColBlock(Math.round(vx / subSize), Math.round(vz / subSize), grassObj);
              subGrassIdx++;
            }
          }
        }

        // Subsurface Dirt Layer 0 (2x2x2 sub-divisions)
        const d0CenterY = topY - blockSize * 1.5;
        for (let sx = 0; sx < 2; sx++) {
          for (let sy = 0; sy < 2; sy++) {
            for (let sz = 0; sz < 2; sz++) {
              const vx = wx - subSize * 0.5 + sx * subSize;
              const vy = d0CenterY - subSize * 0.5 + sy * subSize;
              const vz = wz - subSize * 0.5 + sz * subSize;
              const subKey = `${Math.round(vx / subSize)}_${Math.round(vy / subSize)}_${Math.round(vz / subSize)}`;

              dummy.position.set(vx, vy, vz);
              dummy.updateMatrix();
              subDirtMesh.setMatrixAt(subDirtIdx, dummy.matrix);

              const dirt0Obj = {
                index: subDirtIdx,
                active: true,
                x: vx,
                y: vy,
                z: vz,
                color: 0x582f0e,
              };
              this.cesped2DirtBlocks.set(subKey, dirt0Obj);
              registerColBlock(Math.round(vx / subSize), Math.round(vz / subSize), dirt0Obj);
              subDirtIdx++;
            }
          }
        }

        // Subsurface Dirt Layer 1 (2x2x2 sub-divisions)
        const d1CenterY = topY - blockSize * 2.5;
        for (let sx = 0; sx < 2; sx++) {
          for (let sy = 0; sy < 2; sy++) {
            for (let sz = 0; sz < 2; sz++) {
              const vx = wx - subSize * 0.5 + sx * subSize;
              const vy = d1CenterY - subSize * 0.5 + sy * subSize;
              const vz = wz - subSize * 0.5 + sz * subSize;
              const subKey = `${Math.round(vx / subSize)}_${Math.round(vy / subSize)}_${Math.round(vz / subSize)}`;

              dummy.position.set(vx, vy, vz);
              dummy.updateMatrix();
              subDirtMesh.setMatrixAt(subDirtIdx, dummy.matrix);

              const dirt1Obj = {
                index: subDirtIdx,
                active: true,
                x: vx,
                y: vy,
                z: vz,
                color: 0x3d1e03,
              };
              this.cesped2DirtBlocks.set(subKey, dirt1Obj);
              registerColBlock(Math.round(vx / subSize), Math.round(vz / subSize), dirt1Obj);
              subDirtIdx++;
            }
          }
        }
      }
    }

    // 2. Generate Trees with 8 Visible Sub-divisions per Block
    for (const tree of trees) {
      // Wood Trunk Blocks
      for (let iy = 0; iy < tree.trunkH; iy++) {
        const wy = tree.baseY + iy * blockSize + blockSize * 0.5;

        for (let sx = 0; sx < 2; sx++) {
          for (let sy = 0; sy < 2; sy++) {
            for (let sz = 0; sz < 2; sz++) {
              const vx = tree.twx - subSize * 0.5 + sx * subSize;
              const vy = wy - subSize * 0.5 + sy * subSize;
              const vz = tree.twz - subSize * 0.5 + sz * subSize;
              const subKey = `${Math.round(vx / subSize)}_${Math.round(vy / subSize)}_${Math.round(vz / subSize)}`;

              dummy.position.set(vx, vy, vz);
              dummy.updateMatrix();
              subWoodMesh.setMatrixAt(subWoodIdx, dummy.matrix);

              const woodObj = {
                index: subWoodIdx,
                active: true,
                x: vx,
                y: vy,
                z: vz,
                color: 0x6f4e37,
              };
              this.cesped2WoodBlocks.set(subKey, woodObj);
              registerColBlock(Math.round(vx / subSize), Math.round(vz / subSize), woodObj);
              subWoodIdx++;
            }
          }
        }
      }

      // Leaves Blocks
      for (let dy = tree.trunkH - 3; dy <= tree.trunkH + 1; dy++) {
        const radius = dy <= tree.trunkH - 2 ? 2 : (dy <= tree.trunkH ? 1 : 0);
        const wy = tree.baseY + dy * blockSize + blockSize * 0.5;

        for (let lx = -radius; lx <= radius; lx++) {
          for (let lz = -radius; lz <= radius; lz++) {
            if (radius === 2 && Math.abs(lx) === 2 && Math.abs(lz) === 2) continue;
            if (lx === 0 && lz === 0 && dy < tree.trunkH) continue;

            const lwx = tree.twx + lx * blockSize;
            const lwz = tree.twz + lz * blockSize;

            for (let sx = 0; sx < 2; sx++) {
              for (let sy = 0; sy < 2; sy++) {
                for (let sz = 0; sz < 2; sz++) {
                  const vx = lwx - subSize * 0.5 + sx * subSize;
                  const vy = wy - subSize * 0.5 + sy * subSize;
                  const vz = lwz - subSize * 0.5 + sz * subSize;
                  const subKey = `${Math.round(vx / subSize)}_${Math.round(vy / subSize)}_${Math.round(vz / subSize)}`;

                  dummy.position.set(vx, vy, vz);
                  dummy.updateMatrix();
                  subLeavesMesh.setMatrixAt(subLeavesIdx, dummy.matrix);

                  this.cesped2LeavesBlocks.set(subKey, {
                    index: subLeavesIdx,
                    active: true,
                    x: vx,
                    y: vy,
                    z: vz,
                    color: 0x1b4332,
                  });
                  subLeavesIdx++;
                }
              }
            }
          }
        }
      }
    }

    subGrassMesh.instanceMatrix.needsUpdate = true;
    subDirtMesh.instanceMatrix.needsUpdate = true;
    subWoodMesh.instanceMatrix.needsUpdate = true;
    subLeavesMesh.instanceMatrix.needsUpdate = true;

    this.scene.add(subGrassMesh);
    this.scene.add(subDirtMesh);
    this.scene.add(subWoodMesh);
    this.scene.add(subLeavesMesh);

    this.cesped2InstancedMesh = subGrassMesh;
    this.cesped2DirtInstancedMesh = subDirtMesh;
    this.cesped2WoodInstancedMesh = subWoodMesh;
    this.cesped2LeavesInstancedMesh = subLeavesMesh;

    this.cesped2SubGrassMesh = subGrassMesh;
    this.cesped2SubDirtMesh = subDirtMesh;
    this.cesped2SubWoodMesh = subWoodMesh;
    this.cesped2SubLeavesMesh = subLeavesMesh;

    // Sort column blocks by height descending for optimal O(1) vertical raycasting
    for (const arr of this.cesped2ColBlocks.values()) {
      arr.sort((a, b) => b.y - a.y);
    }
  }

  public clearCesped2Floor() {
    if (this.cesped2InstancedMesh) {
      this.scene.remove(this.cesped2InstancedMesh);
      this.cesped2InstancedMesh.geometry.dispose();
      this.cesped2InstancedMesh = null;
    }
    if (this.cesped2DirtInstancedMesh) {
      this.scene.remove(this.cesped2DirtInstancedMesh);
      this.cesped2DirtInstancedMesh.geometry.dispose();
      this.cesped2DirtInstancedMesh = null;
    }
    if (this.cesped2WoodInstancedMesh) {
      this.scene.remove(this.cesped2WoodInstancedMesh);
      this.cesped2WoodInstancedMesh.geometry.dispose();
      this.cesped2WoodInstancedMesh = null;
    }
    if (this.cesped2LeavesInstancedMesh) {
      this.scene.remove(this.cesped2LeavesInstancedMesh);
      this.cesped2LeavesInstancedMesh.geometry.dispose();
      this.cesped2LeavesInstancedMesh = null;
    }

    if (this.cesped2SubGrassMesh) {
      this.scene.remove(this.cesped2SubGrassMesh);
      this.cesped2SubGrassMesh.geometry.dispose();
      this.cesped2SubGrassMesh = null;
    }
    if (this.cesped2SubDirtMesh) {
      this.scene.remove(this.cesped2SubDirtMesh);
      this.cesped2SubDirtMesh.geometry.dispose();
      this.cesped2SubDirtMesh = null;
    }
    if (this.cesped2SubWoodMesh) {
      this.scene.remove(this.cesped2SubWoodMesh);
      this.cesped2SubWoodMesh.geometry.dispose();
      this.cesped2SubWoodMesh = null;
    }
    if (this.cesped2SubLeavesMesh) {
      this.scene.remove(this.cesped2SubLeavesMesh);
      this.cesped2SubLeavesMesh.geometry.dispose();
      this.cesped2SubLeavesMesh = null;
    }

    this.cesped2Blocks.clear();
    this.cesped2DirtBlocks.clear();
    this.cesped2WoodBlocks.clear();
    this.cesped2LeavesBlocks.clear();
    this.cesped2FullBlocks.clear();
    this.cesped2ColBlocks.clear();
  }

  public destroyCesped2BlockAt(worldX: number, worldYOrZ: number, worldZOrRadius?: number, radiusArg?: number) {
    if (!this.cesped2FullBlocks) return;

    let worldY: number;
    let worldZ: number;

    if (radiusArg !== undefined) {
      worldY = worldYOrZ;
      worldZ = worldZOrRadius as number;
    } else if (worldZOrRadius !== undefined) {
      if (typeof worldZOrRadius === 'number' && worldZOrRadius <= 2.0 && worldZOrRadius > 0 && Math.abs(worldYOrZ) > 2.0) {
        worldZ = worldYOrZ;
        worldY = this.getGroundHeight(worldX, worldZ);
      } else {
        worldY = worldYOrZ;
        worldZ = worldZOrRadius;
      }
    } else {
      worldZ = worldYOrZ;
      worldY = this.getGroundHeight(worldX, worldZ);
    }

    const blockSize = 0.88;
    const subSize = 0.44;

    const centerFullIx = Math.round(worldX / blockSize);
    const centerFullIy = Math.round(worldY / blockSize);
    const centerFullIz = Math.round(worldZ / blockSize);

    const centerSubIx = Math.round(worldX / subSize);
    const centerSubIy = Math.round(worldY / subSize);
    const centerSubIz = Math.round(worldZ / subSize);

    const destroyRadius = radiusArg !== undefined ? radiusArg : 0.28;
    const destroyRadiusSq = destroyRadius * destroyRadius;

    const dummy = new THREE.Object3D();
    const hiddenDummy = new THREE.Object3D();
    hiddenDummy.position.set(0, -999, 0);
    hiddenDummy.scale.set(0, 0, 0);
    hiddenDummy.updateMatrix();

    // 1. DYNAMIC FRACTURE: Subdivide any nearby full blocks that are receiving damage
    const fullScanR = Math.max(1, Math.ceil((destroyRadius + blockSize * 0.5) / blockSize));
    for (let dx = -fullScanR; dx <= fullScanR; dx++) {
      for (let dy = -fullScanR; dy <= fullScanR; dy++) {
        for (let dz = -fullScanR; dz <= fullScanR; dz++) {
          const testFullKey = `${centerFullIx + dx}_${centerFullIy + dy}_${centerFullIz + dz}`;
          const fullBlock = this.cesped2FullBlocks.get(testFullKey);

          if (fullBlock && fullBlock.active && !fullBlock.subdivided) {
            const distFullSq = (fullBlock.x - worldX) ** 2 + (fullBlock.y - worldY) ** 2 + (fullBlock.z - worldZ) ** 2;
            if (distFullSq <= (destroyRadius + blockSize * 0.65) ** 2) {
              // Subdivide this 1-unit block into its 8 sub-voxels!
              fullBlock.subdivided = true;

              // Hide full block in its full mesh
              if (fullBlock.fullMesh) {
                fullBlock.fullMesh.setMatrixAt(fullBlock.fullIndex, hiddenDummy.matrix);
                fullBlock.fullMesh.instanceMatrix.needsUpdate = true;
              }

              // Determine subMesh and subMap
              let subMesh: THREE.InstancedMesh | null = null;
              let subMap: Map<string, any> | null = null;

              if (fullBlock.type === 'grass') {
                subMesh = this.cesped2SubGrassMesh;
                subMap = this.cesped2Blocks;
              } else if (fullBlock.type === 'dirt') {
                subMesh = this.cesped2SubDirtMesh;
                subMap = this.cesped2DirtBlocks;
              } else if (fullBlock.type === 'wood') {
                subMesh = this.cesped2SubWoodMesh;
                subMap = this.cesped2WoodBlocks;
              } else if (fullBlock.type === 'leaves') {
                subMesh = this.cesped2SubLeavesMesh;
                subMap = this.cesped2LeavesBlocks;
              }

              // Activate all 8 sub-blocks in subMesh and register them
              if (subMesh && subMap) {
                for (const sub of fullBlock.subBlocks) {
                  dummy.position.set(sub.x, sub.y, sub.z);
                  dummy.rotation.set(0, 0, 0);
                  dummy.scale.set(1, 1, 1);
                  dummy.updateMatrix();
                  subMesh.setMatrixAt(sub.subIndex, dummy.matrix);

                  subMap.set(sub.subKey, {
                    index: sub.subIndex,
                    active: true,
                    x: sub.x,
                    y: sub.y,
                    z: sub.z,
                    color: sub.color,
                  });
                }
                subMesh.instanceMatrix.needsUpdate = true;
              }
            }
          }
        }
      }
    }

    // 2. DESTROY DAMAGED SUB-VOXELS ("en cesped2 debe romper 1 bloque no 2")
    let destroyedAny = false;
    let closestDistSq = Infinity;
    let closestSub: { map: Map<string, any>; key: string; mesh: THREE.InstancedMesh | null; block: any } | null = null;

    const subScanR = Math.max(1, Math.ceil(destroyRadius / subSize));

    for (let dx = -subScanR; dx <= subScanR; dx++) {
      for (let dy = -subScanR; dy <= subScanR; dy++) {
        for (let dz = -subScanR; dz <= subScanR; dz++) {
          const testKey = `${centerSubIx + dx}_${centerSubIy + dy}_${centerSubIz + dz}`;

          // Check each sub-voxel category
          const candidates: [Map<string, any>, THREE.InstancedMesh | null][] = [
            [this.cesped2Blocks, this.cesped2SubGrassMesh],
            [this.cesped2DirtBlocks, this.cesped2SubDirtMesh],
            [this.cesped2WoodBlocks, this.cesped2SubWoodMesh],
            [this.cesped2LeavesBlocks, this.cesped2SubLeavesMesh],
          ];

          for (const [subMap, subMesh] of candidates) {
            const sub = subMap.get(testKey);
            if (sub && sub.active) {
              const dSq = (sub.x - worldX) ** 2 + (sub.y - worldY) ** 2 + (sub.z - worldZ) ** 2;

              if (dSq < closestDistSq) {
                closestDistSq = dSq;
                closestSub = { map: subMap, key: testKey, mesh: subMesh, block: sub };
              }

              // Multi-block destruction only for heavy area-of-effect explosions (radius >= 0.9)
              if (destroyRadius >= 0.9 && dSq <= destroyRadiusSq) {
                sub.active = false;
                if (subMesh) {
                  subMesh.setMatrixAt(sub.index, hiddenDummy.matrix);
                  subMesh.instanceMatrix.needsUpdate = true;
                }
                this.spawnVoxelDebris(sub.x, sub.y, sub.z, sub.color || 0x2d6a4f, 2);
                destroyedAny = true;
              }
            }
          }
        }
      }
    }

    // For standard hits (bullets, punches, tools) or if no explosion occurred, destroy strictly ONLY 1 single sub-voxel!
    if (!destroyedAny && closestSub && closestDistSq <= 1.45) {
      closestSub.block.active = false;
      if (closestSub.mesh) {
        closestSub.mesh.setMatrixAt(closestSub.block.index, hiddenDummy.matrix);
        closestSub.mesh.instanceMatrix.needsUpdate = true;
      }
      this.spawnVoxelDebris(closestSub.block.x, closestSub.block.y, closestSub.block.z, closestSub.block.color || 0x2d6a4f, 2);
      destroyedAny = true;
    }

    if (destroyedAny) {
      soundEngine.playVoxelDestroy();
    }
  }

  public clearVoxelBlocks() {
    for (const b of this.voxelBlocks) {
      this.scene.remove(b.mesh);
    }
    this.voxelBlocks = [];
    soundEngine.playImpact(0.6);
  }

  public spawnDefaultJellyBlocks() {
    const size = 0.88;
    // Spawn exactly 1 slime block located at (x: -1.5, z: 4.0)
    this.spawnVoxelBlock(-1.5, size / 2, 4.0, 'slime', size);

    // Spawn exactly 1 skin block located at (x: 1.5, z: 4.0)
    this.spawnVoxelBlock(1.5, size / 2, 4.0, 'skin', size);
  }

  public setPlayerShirt(enabled: boolean, shirtColorHex: number = 0x38bdf8, ragdollId?: string) {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId || r.isControlled) || this.ragdolls[0];
    if (!ragdoll || ragdoll.isTentacle) return;
    ragdoll.hasShirt = enabled;
    ragdoll.shirtColorHex = shirtColorHex;
    applyShirtToRagdoll(ragdoll, enabled, shirtColorHex);
    if (ragdoll.hasBustAndGlutes) {
      updateRagdollBustAndGlutes(ragdoll, true);
    }
    syncRagdollMeshes3D(ragdoll);
  }

  public setPlayerSkinColor(skinColorHex: number, ragdollId?: string) {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId || r.isControlled) || this.ragdolls[0];
    if (!ragdoll || ragdoll.isTentacle) return;
    ragdoll.skinColorHex = skinColorHex;
    updateRagdollSkinColor(ragdoll, skinColorHex);
    applyAllClothingToRagdoll(ragdoll);
    updateRagdollGenitals(ragdoll, ragdoll.genitalType || 'none');
    updateRagdollBustAndGlutes(ragdoll, Boolean(ragdoll.hasBustAndGlutes));
    updateRagdollSphericalContour(ragdoll, ragdoll.sphericalContourLevel, ragdoll.contourLayerEnabled, ragdoll.contourJointStyle);
    syncRagdollMeshes3D(ragdoll);
  }

  public setPlayerPantsColor(pantsColorHex: number, ragdollId?: string) {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId || r.isControlled) || this.ragdolls[0];
    if (!ragdoll || ragdoll.isTentacle) return;
    ragdoll.pantsColorHex = pantsColorHex;
    applyPantsToRagdoll(ragdoll, ragdoll.hasPants ?? false, pantsColorHex);
    if (ragdoll.hasBustAndGlutes) {
      updateRagdollBustAndGlutes(ragdoll, true);
    }
    syncRagdollMeshes3D(ragdoll);
  }

  public setPlayerClothing(
    clothing: {
      hasShirt?: boolean;
      shirtColorHex?: number;
      hasPants?: boolean;
      pantsColorHex?: number;
      hasUnderwear?: boolean;
      underwearColorHex?: number;
      hasGloves?: boolean;
      glovesColorHex?: number;
      hasBoots?: boolean;
      bootsColorHex?: number;
      hasSocks?: boolean;
      socksColorHex?: number;
    },
    ragdollId?: string
  ) {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId || r.isControlled) || this.ragdolls[0];
    if (!ragdoll || ragdoll.isTentacle) return;

    if (clothing.hasShirt !== undefined) ragdoll.hasShirt = clothing.hasShirt;
    if (clothing.shirtColorHex !== undefined) ragdoll.shirtColorHex = clothing.shirtColorHex;
    if (clothing.hasPants !== undefined) ragdoll.hasPants = clothing.hasPants;
    if (clothing.pantsColorHex !== undefined) ragdoll.pantsColorHex = clothing.pantsColorHex;
    if (clothing.hasUnderwear !== undefined) ragdoll.hasUnderwear = clothing.hasUnderwear;
    if (clothing.underwearColorHex !== undefined) ragdoll.underwearColorHex = clothing.underwearColorHex;
    if (clothing.hasGloves !== undefined) ragdoll.hasGloves = clothing.hasGloves;
    if (clothing.glovesColorHex !== undefined) ragdoll.glovesColorHex = clothing.glovesColorHex;
    if (clothing.hasBoots !== undefined) ragdoll.hasBoots = clothing.hasBoots;
    if (clothing.bootsColorHex !== undefined) ragdoll.bootsColorHex = clothing.bootsColorHex;
    if (clothing.hasSocks !== undefined) ragdoll.hasSocks = clothing.hasSocks;
    if (clothing.socksColorHex !== undefined) ragdoll.socksColorHex = clothing.socksColorHex;

    applyAllClothingToRagdoll(ragdoll);
    if (ragdoll.hasBustAndGlutes) {
      updateRagdollBustAndGlutes(ragdoll, true);
    }
    if (ragdoll.genitalType && ragdoll.genitalType !== 'none') {
      updateRagdollGenitals(ragdoll, ragdoll.genitalType);
    }
  }

  public setPlayerHair(type: string, colorHex: number, ragdollId?: string) {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId || r.isControlled) || this.ragdolls[0];
    if (!ragdoll || ragdoll.isTentacle) return;
    (ragdoll as any).hairType = type;
    (ragdoll as any).hairColorHex = colorHex;
    addHairAndAccessoriesToHead(ragdoll);
  }

  public setPlayerBeard(type: string, colorHex: number, ragdollId?: string) {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId || r.isControlled) || this.ragdolls[0];
    if (!ragdoll || ragdoll.isTentacle) return;
    (ragdoll as any).beardType = type;
    (ragdoll as any).beardColorHex = colorHex;
    addHairAndAccessoriesToHead(ragdoll);
  }

  public setPlayerHat(type: string, colorHex: number, ragdollId?: string) {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId || r.isControlled) || this.ragdolls[0];
    if (!ragdoll || ragdoll.isTentacle) return;
    (ragdoll as any).hatType = type;
    (ragdoll as any).hatColorHex = colorHex;
    addHairAndAccessoriesToHead(ragdoll);
  }

  public setPlayerGlasses(type: string, colorHex: number, ragdollId?: string) {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId || r.isControlled) || this.ragdolls[0];
    if (!ragdoll || ragdoll.isTentacle) return;
    (ragdoll as any).glassesType = type;
    (ragdoll as any).glassesColorHex = colorHex;
    addHairAndAccessoriesToHead(ragdoll);
  }

  public setPlayerFaceFeatureMode(mode: FaceFeatureMode, ragdollId?: string) {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId || r.isControlled) || this.ragdolls[0];
    if (!ragdoll || ragdoll.isTentacle) return;
    ragdoll.faceFeatureMode = mode;
    addHairAndAccessoriesToHead(ragdoll);
  }

  public setPlayerFaceFloatDepth(depth: number, ragdollId?: string) {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId || r.isControlled) || this.ragdolls[0];
    if (!ragdoll || ragdoll.isTentacle) return;
    ragdoll.faceFloatDepth = depth;
  }

  public setPlayerEyeHolesEnabled(enabled: boolean, ragdollId?: string) {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId || r.isControlled) || this.ragdolls[0];
    if (!ragdoll || ragdoll.isTentacle) return;
    ragdoll.eyeHolesEnabled = enabled;
    setupVoxel3DFace(ragdoll);
  }

  public setHotNPCPose(pose: HotPoseType, npcId?: string) {
    const targetNPC = npcId
      ? this.ragdolls.find((r) => r.id === npcId)
      : this.ragdolls.find((r) => r.isWerewolfHot || r.isDummyHot);
    if (targetNPC) {
      targetNPC.hotNPCPose = pose;
      if (targetNPC.hotNPCEmotions) {
        targetNPC.hotNPCEmotions.decisionTimer = 8.0; // Hold chosen pose
      }
    }
  }

  public getActiveHotNPCsInfo() {
    return this.ragdolls
      .filter((r) => (r.isWerewolfHot || r.isDummyHot) && r.hotGrabTargetId)
      .map((r) => ({
        id: r.id,
        name: r.isWerewolfHot ? 'Hombre Lobo Ardiente' : 'Dummy Ardiente',
        pose: r.hotNPCPose || 'standing_lift_face_to_face',
        emotions: r.hotNPCEmotions,
        targetId: r.hotGrabTargetId,
      }));
  }

  public jumpCharacter(ragdollId?: string) {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId) || this.ragdolls[0];
    if (!ragdoll) return;

    // In ragdoll mode or collapsed state, controls/jumping are disabled - character stays a pure physical ragdoll!
    if (!ragdoll.isAlive || ragdoll.isCollapsed) {
      return;
    }

    // Check if they are inside a slime block
    let insideSlime = false;
    for (const vb of this.voxelBlocks) {
      if (vb.type === 'slime') {
        const halfS = vb.size / 2;
        const dx = Math.abs(ragdoll.charPos.x - vb.x);
        const dy = ragdoll.charPos.y - vb.y;
        const dz = Math.abs(ragdoll.charPos.z - vb.z);
        if (dx < halfS + 0.3 && dz < halfS + 0.3 && dy > -halfS - 1.8 && dy < halfS + 0.1) {
          insideSlime = true;
          break;
        }
      }
    }

    if (ragdoll.isGrounded || insideSlime) {
      const jumpMultiplier = 0.1 + 1.9 * (this.jumpPower / 100);
      let jumpSpd = 6.2 * jumpMultiplier;
      if (insideSlime) {
        jumpSpd *= 0.35; // Viscous resistance: reduced jump power to jump/swim out of slime!
        soundEngine.playWormSlime();
      }
      ragdoll.charVel.y = jumpSpd;
      ragdoll.isGrounded = false;
      ragdoll.isJumping = true;
      soundEngine.playImpact(0.5);
    }
  }

  public killCharacter(ragdollId?: string, impulse?: THREE.Vector3) {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId) || this.ragdolls[0];
    if (!ragdoll || (!ragdoll.isAlive && !ragdoll.isWalkingRagdoll && ragdoll.isCollapsed)) return;

    ragdoll.isAlive = false;
    ragdoll.isWalkingRagdoll = false;
    ragdoll.isCollapsed = true; // Collapse to the floor on death!
    soundEngine.playBoneSnap();
    soundEngine.playBloodSplatter();

    // Natural floppy constraints for fallen body
    for (const c of ragdoll.constraints) {
      if (c.broken) continue;
      if (c.originalLength !== undefined) {
        c.length = c.originalLength;
      }
      c.stiffness = 0.95; // Firm bone stiffness to prevent crushing
    }

    if (impulse && impulse.lengthSq() > 0.01) {
      ragdoll.charVel.copy(impulse);
      for (const p of ragdoll.particles) {
        p.vx = impulse.x + (Math.random() - 0.5) * 5.0;
        p.vy = impulse.y + Math.random() * 4.0;
        p.vz = impulse.z + (Math.random() - 0.5) * 5.0;
        p.oldX = p.x - p.vx * 0.016;
        p.oldY = p.y - p.vy * 0.016;
        p.oldZ = p.z - p.vz * 0.016;
      }
    } else {
      // Preserve existing momentum/velocity from fatal hit so corpse does not freeze
      for (const p of ragdoll.particles) {
        if (Math.abs(p.vx) > 0.1 || Math.abs(p.vy) > 0.1 || Math.abs(p.vz) > 0.1) {
          p.oldX = p.x - p.vx * 0.016;
          p.oldY = p.y - p.vy * 0.016;
          p.oldZ = p.z - p.vz * 0.016;
        }
      }
    }
  }

  public respawnCharacter(ragdollId?: string) {
    const ragdoll = this.ragdolls.find((r) => r.id === ragdollId) || this.ragdolls[0];
    if (!ragdoll) return;

    restoreRagdollVoxels(ragdoll);

    ragdoll.isAlive = true;
    ragdoll.isGrounded = true;
    ragdoll.isJumping = false;
    ragdoll.charPos.set(0, 0, 0);
    ragdoll.charVel.set(0, 0, 0);
    ragdoll.facingAngle = 0;
    ragdoll.walkCycle = 0;
    ragdoll.totalHealth = 100;
    ragdoll.stats = { brokenBones: 0, dismemberedLimbs: 0, bloodLossPercent: 0, destroyedBlocks: 0 };

    for (const p of ragdoll.particles) {
      p.health = p.maxHealth;
      p.fractured = false;
      p.dismembered = false;
      p.bleedingRate = 0;
      if (p.mesh) {
        p.mesh.rotation.set(0, 0, 0);
      }
    }

    for (const c of ragdoll.constraints) {
      c.broken = false;
    }

    soundEngine.playSyringeInject();
  }

  public update(
    inputMoveVector: { x: number; y: number },
    cameraForward: THREE.Vector3,
    cameraRight: THREE.Vector3,
    playerControlledRagdollId?: string,
    camera?: THREE.Camera,
    isFreeCamAiming: boolean = false
  ) {
    const now = performance.now();
    const rawDt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    const dt = rawDt * this.timeScale;
    if (dt <= 0.00001) return;

    // Set parentRagdoll back-reference on particles for easy lookups
    for (const r of this.ragdolls) {
      for (const p of r.particles) {
        (p as any).parentRagdoll = r;
      }
    }

    // High FPS Visual Updates (weather, billboard contours, facial expressions)
    if (this.weatherSystem) {
      this.weatherSystem.update(dt, camera ? camera.position : new THREE.Vector3());
    }

    if (camera) {
      this.updateContourBillboards(camera);
    }
    this.updateFacialAnimations(now, dt);

    // Fixed Timestep Simulation Loop (60Hz rate, independent of local display FPS)
    // Ensures high FPS local rendering never freezes or stalls physics, and multiplayer state progresses normally for all players
    const FIXED_DT = 1 / 60; // 0.016667s
    const MAX_STEPS = 4; // Capped to prevent spiral of death on massive lag spikes
    this.physicsAccumulator += dt;
    if (this.physicsAccumulator > FIXED_DT * MAX_STEPS) {
      this.physicsAccumulator = FIXED_DT * MAX_STEPS;
    }

    let steps = 0;
    while (this.physicsAccumulator >= FIXED_DT && steps < MAX_STEPS) {
      this.stepPhysicsSimulation(
        FIXED_DT,
        inputMoveVector,
        cameraForward,
        cameraRight,
        playerControlledRagdollId,
        isFreeCamAiming
      );
      this.physicsAccumulator -= FIXED_DT;
      steps++;
    }

    // High FPS Mesh Synchronization & Visual Effects (runs at full screen refresh rate)
    this.syncMeshes(camera);
    this.updateLiquidRendering(dt);
    this.updateSoundWaves(dt);
  }

  private stepPhysicsSimulation(
    dt: number,
    inputMoveVector: { x: number; y: number },
    cameraForward: THREE.Vector3,
    cameraRight: THREE.Vector3,
    playerControlledRagdollId?: string,
    isFreeCamAiming: boolean = false
  ) {
    // 0.5 Update interactive doors & moving platforms
    this.updateDoors(dt);
    this.updateMovingPlatforms(dt);

    // Update and slide/shrink cutter red spheres
    for (let i = this.cutterRedSpheres.length - 1; i >= 0; i--) {
      const rs = this.cutterRedSpheres[i];
      rs.life -= dt;
      // Let them slide or fall slightly downwards
      rs.mesh.position.y -= 1.8 * dt;
      
      const s = Math.max(0, rs.life / 1.5);
      rs.mesh.scale.set(s, s, s);

      if (rs.life <= 0) {
        this.scene.remove(rs.mesh);
        rs.mesh.geometry.dispose();
        if (Array.isArray(rs.mesh.material)) {
          rs.mesh.material.forEach((m) => m.dispose());
        } else {
          rs.mesh.material.dispose();
        }
        this.cutterRedSpheres.splice(i, 1);
      }
    }

    // 1. Kinematic Controller for Alive Tall Block Characters (Player & NPCs)
    this.updateAliveHumanoid(
      inputMoveVector,
      cameraForward,
      cameraRight,
      playerControlledRagdollId,
      dt,
      isFreeCamAiming
    );

    // 2. Weapon Pickups (auto-equip upon walking over)
    this.updatePickups(dt);

    // 2.5 Sound Wave Hearing AI Detection
    this.updateHearingSystem(dt);

    // 3. Enemy Soldiers AI & Combat Loop
    this.updateSoldiers(dt);

    // 3.1 Undead Zombies AI & Chomp/Biting Loop
    this.updateZombies(dt);

    // 3.2 Wild Werewolves AI, Slashes & Biting Loop
    this.updateWerewolves(dt);

    // 3.3 Werewolf Hot & Dummy Hot AI (Contour grabbing, limb seeking & pelvis genital alignment)
    this.updateHotNPCs(dt);

    // 4. Bullets & Voxel Destruction Physics
    this.updateBullets(dt);

    // 5. Voxel Debris & Particles
    this.updateDebris(dt);
    this.updateDynamicProps(dt);
    this.updateJellyPhysics(dt);
    this.updateElectroCubes(dt);
    this.updateSlimeBlockInteractions(dt);
    this.updateJellyDebris(dt);

    // Realistic Fluid Blocks System (Adaptive Squeeze, Magnetic Lattice, 10s Timer from Anatomy)
    RealisticFluidEngine.getInstance().isZeroGravity = this.isZeroGravity;
    RealisticFluidEngine.getInstance().updateRagdollEmission(this.ragdolls, dt);
    RealisticFluidEngine.getInstance().update(dt, (x, z, y) => this.getGroundHeight(x, z, y));

    // 5.5 Check Brick Wall Structural Support Collapse
    for (const ragdoll of this.ragdolls) {
      if (ragdoll.name === 'brick_wall') {
        for (const c of ragdoll.constraints) {
          if (c.name === 'brick_v_conn' && !c.broken) {
            const lower = c.p1.y < c.p2.y ? c.p1 : c.p2;
            const lowerActive = lower.voxelBlocks ? lower.voxelBlocks.filter(b => b.active).length : 0;
            if (lowerActive <= 2 || lower.health <= 0) {
              c.broken = true;
              soundEngine.playBoneSnap();
            }
          }
        }
      }
    }

    // 6. Physics Simulation Sub-steps for Dead / Ragdoll Character
    if (dt <= 0) return;

    const staticBlocks: { x: number; y: number; z: number; w: number; h: number; d: number }[] = [];
    for (const b of this.houseBlocks) {
      staticBlocks.push({ x: b.x, y: b.y, z: b.z, w: b.width, h: b.height, d: b.depth });
    }
    for (const vb of this.voxelBlocks) {
      staticBlocks.push({ x: vb.x, y: vb.y, z: vb.z, w: vb.size, h: vb.size, d: vb.size });
    }
    for (const d of this.doors) {
      staticBlocks.push({ x: d.x, y: d.y + d.height / 2, z: d.z, w: d.width, h: d.height, d: d.depth });
    }
    for (const bed of this.beds) {
      staticBlocks.push({ x: bed.x, y: bed.y + 0.275, z: bed.z, w: bed.width, h: 0.55, d: bed.depth });
    }

    const manager = RapierManager.getInstance();
    if (manager.world) {
      // Sync environment and gravity
      manager.setGravity(this.map.gravity.y);
      manager.syncEnvironment(staticBlocks);
    }

    // Cannon.js Ragdoll Engine Integration
    const cannonEngine = CannonRagdollEngine.getInstance();
    cannonEngine.syncEnvironment(staticBlocks);

    // Register active ragdolls with Cannon.js ONLY when ragdoll mode is active (collapsed or dead)
    for (const ragdoll of this.ragdolls) {
      const isRagdollActive = (!ragdoll.isAlive || ragdoll.isCollapsed) && !ragdoll.isWalkingRagdoll;
      if (isRagdollActive) {
        if (!cannonEngine.cannonRagdolls.has(ragdoll.id) && ragdoll.particles && ragdoll.particles.some(p => p.name === 'pelvis')) {
          cannonEngine.registerRagdoll(ragdoll, ragdoll.scale || 1.0);
          const cr = cannonEngine.cannonRagdolls.get(ragdoll.id);
          if (cr) cr.alignBodiesToParticles();
        }
      } else {
        if (cannonEngine.cannonRagdolls.has(ragdoll.id)) {
          cannonEngine.unregisterRagdoll(ragdoll.id);
        }
      }
    }

    const moveVec3 = inputMoveVector ? new THREE.Vector3(inputMoveVector.x, 0, inputMoveVector.y) : undefined;
    cannonEngine.step(dt, moveVec3, cameraForward, cameraRight, playerControlledRagdollId);

    const subSteps = 4;
    const subDt = dt / subSteps;

    for (let step = 0; step < subSteps; step++) {
      // Step environment physics if world active
      if (manager.world) {
        manager.step(subDt);
      }

      this.integrateRagdollPhysics(
        subDt,
        inputMoveVector,
        cameraForward,
        cameraRight,
        playerControlledRagdollId
      );

      this.solveConstraints();
      this.solveSkeletalJointLimits();
      this.solveConstraints(); // Relaxation pass to ensure rigid bone lengths remain exact after joint angle limits
      this.solveRagdollSelfCollisions();

      this.handleFloorCollisions(subDt);
      this.solveKineticCollisions(subDt);
    }

    // 7. Update Blood Particles & Decals
    this.updateBlood(dt);
    this.updateBloodStreams(dt);

    // 7.1 Update Bullet Holes Shader Decals
    this.bulletHoleManager.update(dt);

    // 7.5 Update Active Penetrator Rods (animation, movement & dynamic bulging)
    this.updatePenetratorRods(dt);

    // 7.6 Update Ragdoll Erections
    this.updateErections(dt);

    // 7.7 Update Coupled Genitals (dynamic penetration alignment and sliding)
    this.updateCoupledGenitals(dt);

    // 7.8 Update Male Genital (Genital M) Dynamic Ragdoll Physics (always active)
    this.updateGenitalMPhysics(dt);

    // 9. Liquid Physics
    this.updateLiquidPhysics(dt);

    // 11. Fundamental Acoustic Law (High velocity & massive size produces physical noise and sonic wavefronts)
    this.updateAcousticVelocityNoise(dt);
  }

  private updateLiquidPhysics(dt: number) {
    const gy = this.map.gravity.y;
    const subSteps = 2;
    const subDt = dt / subSteps;

    // Cache pool data
    const poolData = this.pools.flatMap(group => 
      group.children.filter(child => child instanceof THREE.Mesh && child.geometry instanceof THREE.BoxGeometry)
      .map(child => {
        const mesh = child as THREE.Mesh;
        const geom = mesh.geometry as THREE.BoxGeometry;
        const worldPos = new THREE.Vector3().setFromMatrixPosition(mesh.matrixWorld);
        return {
          worldPos,
          halfW: geom.parameters.width / 2,
          halfH: geom.parameters.height / 2,
          halfD: geom.parameters.depth / 2
        };
      })
    );

    for (let step = 0; step < subSteps; step++) {
      for (const body of this.liquidBodies) {
        for (const p of body.particles) {
          // If attached to a limb, follow it
          if (p.attachedLimb) {
            const ragdoll = this.ragdolls.find(r => r.id === p.attachedLimb?.ragdollId);
            if (ragdoll) {
              const limb = ragdoll.particles.find(lp => lp.name === p.attachedLimb?.particleName);
              if (limb && !limb.dismembered) {
                // Update position based on limb rotation and offset
                const offset = p.attachedLimb.localOffset;
                const pos = new THREE.Vector3(offset.x, offset.y, offset.z);
                
                if (limb.mesh) {
                   pos.applyQuaternion(limb.mesh.quaternion);
                   p.x = limb.x + pos.x;
                   p.y = limb.y + pos.y;
                   p.z = limb.z + pos.z;
                   p.oldX = p.x;
                   p.oldY = p.y;
                   p.oldZ = p.z;
                   continue; // Skip standard physics integration for attached particles
                }
              } else {
                // Limb dismembered or ragdoll gone, detach
                p.attachedLimb = undefined;
              }
            } else {
              p.attachedLimb = undefined;
            }
          }

          // Gravity
          p.vy += gy * subDt;

          // Verlet Integration
          const vx = (p.x - p.oldX) * 0.95;
          const vy = (p.y - p.oldY) * 0.95;
          const vz = (p.z - p.oldZ) * 0.95;

          p.oldX = p.x;
          p.oldY = p.y;
          p.oldZ = p.z;

          p.x += vx + p.vx * subDt;
          p.y += vy + p.vy * subDt;
          p.z += vz + p.vz * subDt;

          p.vx = 0;
          p.vy = 0;
          p.vz = 0;

          // Floor collision
          if (p.y < p.radius) {
            p.y = p.radius;
            p.oldY = p.y + (p.y - p.oldY) * -0.4;
          }

          // Ragdoll cubic attachment check
          if (!p.attachedLimb) {
            for (const ragdoll of this.ragdolls) {
              for (const limb of ragdoll.particles) {
                if (limb.dismembered) continue;
                
                const dx = p.x - limb.x;
                const dy = p.y - limb.y;
                const dz = p.z - limb.z;
                const distSq = dx * dx + dy * dy + dz * dz;
                
                // If touching limb (rough radius check)
                if (distSq < (p.radius + limb.radius) * (p.radius + limb.radius)) {
                   // Bond to limb
                   const localOffset = new THREE.Vector3(dx, dy, dz);
                   if (limb.mesh) {
                      localOffset.applyQuaternion(limb.mesh.quaternion.clone().invert());
                   }
                   p.attachedLimb = {
                      ragdollId: ragdoll.id,
                      particleName: limb.name,
                      localOffset
                   };
                   break;
                }
              }
              if (p.attachedLimb) break;
            }
          }

          // Wall collisions
          const mapLimit = this.map.width / 2;
          if (Math.abs(p.x) > mapLimit) {
            p.x = Math.sign(p.x) * mapLimit;
            p.oldX = p.x + (p.x - p.oldX) * -0.4;
          }
          if (Math.abs(p.z) > mapLimit) {
            p.z = Math.sign(p.z) * mapLimit;
            p.oldZ = p.z + (p.z - p.oldZ) * -0.4;
          }

          // Pool collisions
          for (const pool of poolData) {
            const minX = pool.worldPos.x - pool.halfW;
            const maxX = pool.worldPos.x + pool.halfW;
            const minY = pool.worldPos.y - pool.halfH;
            const maxY = pool.worldPos.y + pool.halfH;
            const minZ = pool.worldPos.z - pool.halfD;
            const maxZ = pool.worldPos.z + pool.halfD;

            if (
              p.x + p.radius > minX && p.x - p.radius < maxX &&
              p.y + p.radius > minY && p.y - p.radius < maxY &&
              p.z + p.radius > minZ && p.z - p.radius < maxZ
            ) {
              const dx = p.x - pool.worldPos.x;
              const dy = p.y - pool.worldPos.y;
              const dz = p.z - pool.worldPos.z;

              const overlapX = (pool.halfW + p.radius) - Math.abs(dx);
              const overlapY = (pool.halfH + p.radius) - Math.abs(dy);
              const overlapZ = (pool.halfD + p.radius) - Math.abs(dz);

              if (overlapX < overlapY && overlapX < overlapZ) {
                p.x += Math.sign(dx) * overlapX;
                p.oldX = p.x + (p.x - p.oldX) * -0.4;
              } else if (overlapY < overlapX && overlapY < overlapZ) {
                p.y += Math.sign(dy) * overlapY;
                p.oldY = p.y + (p.y - p.oldY) * -0.4;
              } else {
                p.z += Math.sign(dz) * overlapZ;
                p.oldZ = p.z + (p.z - p.oldZ) * -0.4;
              }
            }
          }
        }

        // Magnetic Attraction & Cohesion
        const pLen = body.particles.length;
        if (pLen > 1) {
          for (let i = 0; i < pLen; i++) {
            const p1 = body.particles[i];
            for (let j = i + 1; j < pLen; j++) {
              const p2 = body.particles[j];
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const dz = p2.z - p1.z;
              const distSq = dx * dx + dy * dy + dz * dz;
              
              const attractionRange = 1.25; // Range for magnetic pull (reduced from 2.5)
              const attractionRangeSq = attractionRange * attractionRange;

              if (distSq < attractionRangeSq) {
                const dist = Math.sqrt(distSq) || 0.001;
                const minDist = p1.radius + p2.radius;
                
                // 1. Magnetic pull if within range but not touching
                if (dist > minDist) {
                   const force = 0.12 * (1.0 - dist / attractionRange) * subDt; // Increased force
                   const ax = (dx / dist) * force;
                   const ay = (dy / dist) * force;
                   const az = (dz / dist) * force;
                   p1.vx += ax;
                   p1.vy += ay;
                   p1.vz += az;
                   p2.vx -= ax;
                   p2.vy -= ay;
                   p2.vz -= az;
                }

                // 2. Standard repulsion & cohesion when touching
                if (dist < minDist * 2.25) {
                  const diff = (minDist - dist) / dist;
                  
                  if (dist < minDist) {
                    const pushX = dx * diff * 0.35;
                    const pushY = dy * diff * 0.35;
                    const pushZ = dz * diff * 0.35;
                    p1.x -= pushX;
                    p1.y -= pushY;
                    p1.z -= pushZ;
                    p2.x += pushX;
                    p2.y += pushY;
                    p2.z += pushZ;
                  }

                  const cohesion = 0.22 * subDt; // Increased for "merging" effect (from 0.15)
                  p1.vx += dx * cohesion;
                  p1.vy += dy * cohesion;
                  p1.vz += dz * cohesion;
                  p2.vx -= dx * cohesion;
                  p2.vy -= dy * cohesion;
                  p2.vz -= dz * cohesion;
                }
              }
            }
          }
        }
      }
    }
  }

  private updateLiquidRendering(dt: number) {
    for (const body of this.liquidBodies) {
      for (const p of body.particles) {
        if (p.mesh) {
          p.mesh.position.set(p.x, p.y, p.z);

          // If attached to a limb, scale up to overlap and be slightly larger than the block
          if (p.attachedLimb) {
            p.mesh.scale.set(1.45, 1.45, 1.45); // Snap to reasonable larger size (reduced from 3.2)
          } else {
            // Smoothly return to normal size
            const curScale = p.mesh.scale.x;
            const targetScale = 1.0;
            const newScale = curScale + (targetScale - curScale) * 0.1;
            p.mesh.scale.set(newScale, newScale, newScale);
          }
        }
      }
    }
  }

  public setVoxelDensity(densityLevel: number) {
    for (const ragdoll of this.ragdolls) {
      rebuildRagdollVoxelDensity(ragdoll, densityLevel);
    }
  }

  public setPoolWaterHeight(height: number) {
    for (const pool of this.pools) {
      const waterSurface = pool.getObjectByName('water_surface');
      if (waterSurface) {
        // height is 0-100
        const h = (height / 100) * 2.0; // max 2.0m height
        waterSurface.position.y = 0.2 + h;
        waterSurface.scale.y = 1.0;
      }
    }
  }

  public spawnVoxelDebris(x: number, y: number, z: number, colorHex: number, count: number = 6) {
    for (let i = 0; i < count; i++) {
      const size = 0.08 + Math.random() * 0.08;
      
      let mat = this.debrisMaterials.get(colorHex);
      if (!mat) {
        mat = new THREE.MeshStandardMaterial({
          color: colorHex,
          roughness: 0.8,
        });
        this.debrisMaterials.set(colorHex, mat);
      }

      const mesh = new THREE.Mesh(this.sharedBoxGeom, mat);
      mesh.position.set(x, y, z);
      mesh.scale.set(size, size, size);
      this.scene.add(mesh);

      const vx = (Math.random() - 0.5) * 6;
      const vy = 2.0 + Math.random() * 5;
      const vz = (Math.random() - 0.5) * 6;

      this.debrisParticles.push({
        x,
        y,
        z,
        vx,
        vy,
        vz,
        size,
        life: 1.5 + Math.random() * 1.0,
        decay: 1.0,
        color: colorHex,
        mesh,
      });
    }
  }

  private updateDebris(dt: number) {
    const gy = this.map.gravity.y;
    for (let i = this.debrisParticles.length - 1; i >= 0; i--) {
      const dp = this.debrisParticles[i];
      dp.vy += gy * dt * 0.9;
      dp.x += dp.vx * dt;
      dp.y += dp.vy * dt;
      dp.z += dp.vz * dt;
      dp.life -= dp.decay * dt;

      if (dp.y <= dp.size / 2) {
        dp.y = dp.size / 2;
        dp.vy = -dp.vy * 0.35;
        dp.vx *= 0.75;
        dp.vz *= 0.75;
      }

      if (dp.mesh) {
        dp.mesh.position.set(dp.x, dp.y, dp.z);
        dp.mesh.rotation.x += dp.vx * dt * 4;
        dp.mesh.rotation.z += dp.vz * dt * 4;

        // Elegant scale shrink as debris decays
        const lifeRatio = Math.max(0, dp.life / 2.5);
        dp.mesh.scale.set(dp.size * lifeRatio, dp.size * lifeRatio, dp.size * lifeRatio);
      }

      if (dp.life <= 0) {
        if (dp.mesh) {
          this.scene.remove(dp.mesh);
        }
        this.debrisParticles.splice(i, 1);
      }
    }
  }

  public spawnElectroCube(
    x: number,
    y: number,
    z: number,
    hardness: number = 70,
    viscosity: number = 30,
    electronegativity: number = 100
  ): ElectroCube3D {
    const cube = createElectroCube3D(x, y, z, this.scene, hardness, viscosity, electronegativity);
    this.electroCubes.push(cube);
    return cube;
  }

  public setElectroCubeProperties(
    cubeId: string,
    hardness: number,
    viscosity: number,
    electronegativity?: number
  ) {
    const cube = this.electroCubes.find((c) => c.id === cubeId);
    if (cube) {
      if (electronegativity !== undefined) {
        cube.electronegativity = electronegativity;
      }
      applyElectroCubeProperties(cube, hardness);
    }
  }

  public setElectroCubeElectronegativity(cubeId: string, value: number) {
    const cube = this.electroCubes.find((c) => c.id === cubeId);
    if (cube) {
      cube.electronegativity = value;
      applyElectroCubeProperties(cube, cube.blockState ?? cube.hardness ?? 100);
    }
  }

  public removeElectroCube(cubeId: string) {
    const idx = this.electroCubes.findIndex((c) => c.id === cubeId);
    if (idx !== -1) {
      const cube = this.electroCubes[idx];
      if (cube.groupMesh) {
        this.scene.remove(cube.groupMesh);
      }
      this.electroCubes.splice(idx, 1);
    }
  }

  private updateElectroCubes(dt: number) {
    const time = performance.now() * 0.001;
    for (let i = this.electroCubes.length - 1; i >= 0; i--) {
      const cube = this.electroCubes[i];
      if (cube.isDestroyed) {
        if (cube.groupMesh) this.scene.remove(cube.groupMesh);
        this.electroCubes.splice(i, 1);
        continue;
      }
      updateElectroCubePhysics(cube, dt, time);
    }
  }

  private updateJellyPhysics(dt: number) {
    // 0. Update slime block target references dynamically based on active adhesion
    for (const vb of this.voxelBlocks) {
      if (vb.type === 'slime') {
        vb.attachedTargetPos = undefined;
      }
    }

    // Collect all actively trapped object target positions (ragdoll charPos, limb particles with voxel blocks, and dynamic object blocks)
    const trappedTargets: { pos: THREE.Vector3; blockId?: string; isPlayer?: boolean }[] = [];

    for (const r of this.ragdolls) {
      if ((r as any).adheredSlimeBlockId) {
        trappedTargets.push({
          pos: r.charPos.clone().add(new THREE.Vector3(0, 0.4, 0)),
          blockId: (r as any).adheredSlimeBlockId,
          isPlayer: r.isControlled,
        });
      }
      for (const p of r.particles) {
        if (p.adheredSlimeBlockId) {
          trappedTargets.push({
            pos: new THREE.Vector3(p.x, p.y, p.z),
            blockId: p.adheredSlimeBlockId,
            isPlayer: r.isControlled,
          });
        }
      }
    }

    // Check for other dynamic voxel blocks trapped by slime
    for (const ob of this.voxelBlocks) {
      if (ob.type !== 'slime' && (ob as any).adheredSlimeBlockId) {
        trappedTargets.push({
          pos: new THREE.Vector3(ob.x, ob.y, ob.z),
          blockId: (ob as any).adheredSlimeBlockId,
        });
      }
    }

    // Every slime block (especially wall blocks that form the slime wall or cluster) that trapped an object
    // or is adjacent in the wall surrounding the trapped object's blocks stretches towards the trapped blocks!
    for (const vb of this.voxelBlocks) {
      if (vb.type !== 'slime') continue;
      const bPos = new THREE.Vector3(vb.x, vb.y, vb.z);

      let closestTarget: THREE.Vector3 | null = null;
      let minTargetDist = Infinity;

      for (const t of trappedTargets) {
        const d = bPos.distanceTo(t.pos);
        // Slime clusters: influence connected and adjacent wall blocks (up to 5.5m away so distant blocks deform!)
        const maxCatchDist = Math.max(5.5, vb.size * 5.0);
        if (t.blockId === vb.id || d <= maxCatchDist) {
          if (d < minTargetDist) {
            minTargetDist = d;
            closestTarget = t.pos;
          }
        }
      }

      if (closestTarget && minTargetDist < Math.max(6.5, vb.size * 5.5)) {
        vb.attachedTargetPos = closestTarget.clone();
      }
    }

    // 1. Handle unanchored active slime pursuit physics
    this.updateSlimePursuit(dt);

    for (const vb of this.voxelBlocks) {
      const canFall = vb.isJelly || vb.id.startsWith('voxel_');
      if (!canFall) continue;

      // If the block is currently flying in pursuit, standard position/ground anchoring is bypassed!
      if (vb.isPursuing) {
        continue;
      }

      // DRAGGABLE PROP BEHAVIOR:
      // Only drag/move the slime block if it is a severed dynamic prop (not static placed blocks, so placed blocks stay anchored while stretching)
      const isDirectlyAdhered = trappedTargets.some(t => t.blockId === vb.id);
      if (vb.type === 'slime' && vb.attachedTargetPos && vb.isDynamicProp) {
        const blockCenter = new THREE.Vector3(vb.x, vb.y, vb.z);
        const toTarget = vb.attachedTargetPos.clone().sub(blockCenter);
        // Allow dynamic props to stretch first (dist > 1.8), then slide along elastically
        const distToTarget = toTarget.length();
        
        if (distToTarget > 1.8 && distToTarget < 12.0) {
          const dragStrength = 3.5;
          const dragAmt = Math.min(distToTarget, dragStrength * (distToTarget - 1.8) * dt);
          const dragDir = toTarget.clone().normalize();
          
          vb.x += dragDir.x * dragAmt;
          vb.y += dragDir.y * dragAmt;
          vb.z += dragDir.z * dragAmt;
          
          // Add subtle velocity/shear effect for gelatin visual feedback
          if (vb.shearVel) {
            vb.shearVel.x += dragDir.x * dragAmt * 2.0;
            vb.shearVel.y += dragDir.y * dragAmt * 2.0;
            vb.shearVel.z += dragDir.z * dragAmt * 2.0;
          }
        }
      }

      // Apply falling gravity to jelly blocks and dynamic blocks
      const currentGravity = this.isZeroGravity ? 0 : this.map.gravity.y;
      let groundY = this.getGroundHeight(vb.x, vb.z, vb.y);
      const halfSize = vb.size / 2;

      // Check collision with other blocks (e.g. falling onto a slime block or another voxel block)
      let restingOnSlimeBlock: any = null;
      for (const other of this.voxelBlocks) {
        if (other.id === vb.id) continue;
        const otherHalf = other.size / 2;
        const dx = Math.abs(vb.x - other.x);
        const dz = Math.abs(vb.z - other.z);
        if (dx < halfSize + otherHalf * 0.9 && dz < halfSize + otherHalf * 0.9) {
          const topFace = other.y + otherHalf;
          if (other.type === 'slime') {
            const vy = (vb as any).vy || 0;
            // If falling hard on slime block, it buries inside and gets trapped!
            if (vy < -1.0 || (vb as any).adheredSlimeBlockId === other.id) {
              restingOnSlimeBlock = other;
              (vb as any).adheredSlimeBlockId = other.id;
              // Viscous braking deceleration
              (vb as any).vy *= Math.exp(-8.0 * dt);
              if (other.wobbleScale) other.wobbleScale.set(0.85, 0.85, 0.85);
              break;
            } else if (vb.y >= topFace - 0.25 && topFace > groundY) {
              // Gentle rest on solid slime surface
              groundY = topFace;
            }
          } else if (vb.y >= topFace - 0.25 && topFace > groundY) {
            groundY = topFace;
          }
        }
      }

      const floorLevel = Math.max(halfSize, groundY + halfSize);

      if (!restingOnSlimeBlock) {
        if (vb.y > floorLevel) {
          if ((vb as any).vy === undefined) (vb as any).vy = 0;
          (vb as any).vy += currentGravity * dt;
          vb.y += (vb as any).vy * dt;

          if (vb.y <= floorLevel) {
            vb.y = floorLevel;
            (vb as any).vy = 0;
            // Impact wobble on landing
            if (vb.wobbleVel) {
              vb.wobbleVel.y = -3.5;
            }
          }
        } else {
          vb.y = floorLevel;
          (vb as any).vy = 0;
        }
      }

      if (!vb.wobbleScale) vb.wobbleScale = new THREE.Vector3(1, 1, 1);
      if (!vb.wobbleVel) vb.wobbleVel = new THREE.Vector3(0, 0, 0);
      if (!vb.shearOffset) vb.shearOffset = new THREE.Vector3(0, 0, 0);
      if (!vb.shearVel) vb.shearVel = new THREE.Vector3(0, 0, 0);

      // VERTEX-LEVEL DYNAMIC STRETCHING (PSEUDO-CUBO DEFORMATION)
      if (vb.type === 'slime' && vb.mesh && vb.mesh.geometry) {
        const geom = vb.mesh.geometry;
        const posAttr = geom.attributes.position as THREE.BufferAttribute;

        // Ensure original un-deformed box vertex array is cached
        if (!geom.userData) geom.userData = {};
        if (!geom.userData.origPosArray && posAttr) {
          geom.userData.origPosArray = new Float32Array(posAttr.array);
        }

        const restArray = geom.userData.baseDeformedArray || geom.userData.origPosArray;

        if (vb.attachedTargetPos && posAttr && restArray) {
          // Reset to rest shape (crater or box) before computing frame stretch
          posAttr.array.set(restArray);

          vb.mesh.updateMatrixWorld(true);
          const localTarget = vb.attachedTargetPos.clone();
          vb.mesh.worldToLocal(localTarget);

          const size = vb.size;
          const half = size / 2;

          // Clamp target distance to a safe physical maximum so vertices stretch far with target smoothly
          const rawTargetLen = localTarget.length();
          if (rawTargetLen > half * 0.4) {
            const maxStretch = Math.max(size * 9.0, 8.0);
            if (rawTargetLen > maxStretch) {
              localTarget.multiplyScalar(maxStretch / rawTargetLen);
            }

            const localDir = localTarget.clone().normalize();
            const maxProj = half * (Math.abs(localDir.x) + Math.abs(localDir.y) + Math.abs(localDir.z));
            const minProj = -maxProj;
            const anchorLoc = localDir.clone().multiplyScalar(-half);

            for (let i = 0; i < posAttr.count; i++) {
              const vx = posAttr.getX(i);
              const vy = posAttr.getY(i);
              const vz = posAttr.getZ(i);

              const proj = vx * localDir.x + vy * localDir.y + vz * localDir.z;
              const denom = maxProj - minProj;
              const h = denom > 0.0001 ? Math.min(1.0, Math.max(0.0, (proj - minProj) / denom)) : 0;

              // Non-linear weight so anchor vertices stay anchored
              const weight = Math.pow(h, 2.0);

              // Elastic stretch interpolation
              const newX = vx * (1 - weight) + localTarget.x * weight;
              const newY = vy * (1 - weight) + localTarget.y * weight;
              const newZ = vz * (1 - weight) + localTarget.z * weight;

              // Viscous Squeeze/Pinch (Zero-allocation using pre-allocated vectors)
              _slimeCenterline.lerpVectors(anchorLoc, localTarget, weight);
              _slimeVCurr.set(newX, newY, newZ);
              _slimeToCenterline.subVectors(_slimeVCurr, _slimeCenterline);

              const stretchDist = localTarget.distanceTo(anchorLoc);
              const stretchRatio = Math.min(3.5, stretchDist / size);

              if (stretchRatio > 1.0) {
                const pinchStrength = 3.2 * weight * (1.0 - weight);
                const squeezeFactor = Math.max(0.22, 1.0 - Math.min(0.78, (stretchRatio - 1.0) * 0.26) * pinchStrength);
                _slimeToCenterline.multiplyScalar(squeezeFactor);
              }

              _slimeCenterline.add(_slimeToCenterline);
              posAttr.setXYZ(i, _slimeCenterline.x, _slimeCenterline.y, _slimeCenterline.z);
            }

            posAttr.needsUpdate = true;
            geom.computeVertexNormals();
            vb.mesh.userData.isDeformed = true;
          }

          // Anchor block solidly to its coordinate
          vb.mesh.scale.set(1, 1, 1);
          vb.mesh.position.set(vb.x, vb.y, vb.z);
          vb.mesh.quaternion.set(0, 0, 0, 1);
          continue; // skip normal wobble physics
        } else {
          // If block is released, restore rest shape cleanly and smoothly without bugging out
          if (posAttr && restArray && (vb.mesh.userData.needsResetShape || vb.mesh.userData.isDeformed)) {
            let maxDiff = 0;
            for (let i = 0; i < posAttr.count * 3; i++) {
              const diff = restArray[i] - posAttr.array[i];
              if (Math.abs(diff) > 0.001) {
                posAttr.array[i] += diff * 0.35;
                maxDiff = Math.max(maxDiff, Math.abs(diff));
              }
            }
            if (maxDiff > 0.002) {
              posAttr.needsUpdate = true;
              geom.computeVertexNormals();
              vb.mesh.userData.isDeformed = true;
            } else {
              posAttr.array.set(restArray);
              posAttr.needsUpdate = true;
              geom.computeVertexNormals();
              vb.mesh.userData.needsResetShape = false;
              vb.mesh.userData.isDeformed = false;
            }
          }
        }
      }

      if (vb.mesh) {
        vb.mesh.quaternion.set(0, 0, 0, 1); // Reset rotation to normal axis-aligned state
      }

      const stiffness = vb.stiffness ?? 180;
      const damping = vb.damping ?? 8;
      const baseScale = vb.baseScale ?? 1.0;

      // Update scale wobble (Damped oscillator back to scale = baseScale)
      const fx = -stiffness * (vb.wobbleScale.x - baseScale);
      const dx = -damping * vb.wobbleVel.x;
      vb.wobbleVel.x += (fx + dx) * dt;
      vb.wobbleScale.x += vb.wobbleVel.x * dt;

      const fy = -stiffness * (vb.wobbleScale.y - baseScale);
      const dy = -damping * vb.wobbleVel.y;
      vb.wobbleVel.y += (fy + dy) * dt;
      vb.wobbleScale.y += vb.wobbleVel.y * dt;

      const fz = -stiffness * (vb.wobbleScale.z - baseScale);
      const dz = -damping * vb.wobbleVel.z;
      vb.wobbleVel.z += (fz + dz) * dt;
      vb.wobbleScale.z += vb.wobbleVel.z * dt;

      // Update position shear/sway (Damped oscillator back to (0,0,0))
      const fsx = -stiffness * vb.shearOffset.x;
      const dsx = -damping * vb.shearVel.x;
      vb.shearVel.x += (fsx + dsx) * dt;
      vb.shearOffset.x += vb.shearVel.x * dt;

      const fsy = -stiffness * vb.shearOffset.y;
      const dsy = -damping * vb.shearVel.y;
      vb.shearVel.y += (fsy + dsy) * dt;
      vb.shearOffset.y += vb.shearVel.y * dt;

      const fsz = -stiffness * vb.shearOffset.z;
      const dsz = -damping * vb.shearVel.z;
      vb.shearVel.z += (fsz + dsz) * dt;
      vb.shearOffset.z += vb.shearVel.z * dt;

      // Constrain scale
      vb.wobbleScale.x = Math.max(0.12, Math.min(2.2, vb.wobbleScale.x));
      vb.wobbleScale.y = Math.max(0.12, Math.min(2.2, vb.wobbleScale.y));
      vb.wobbleScale.z = Math.max(0.12, Math.min(2.2, vb.wobbleScale.z));

      // Apply to mesh
      if (vb.mesh) {
        vb.mesh.scale.copy(vb.wobbleScale);
        
        // Ensure the block's base never leaves the floor
        const halfSize = vb.size / 2;
        const bottomY = vb.y - halfSize; // baseline floor height
        const adjustedY = bottomY + (halfSize * vb.wobbleScale.y);

        // Slime blocks stay firmly flat on floor with no Y shear drift
        const currentShearY = vb.type === 'slime' ? 0 : vb.shearOffset.y;

        vb.mesh.position.set(
          vb.x + vb.shearOffset.x,
          adjustedY + currentShearY,
          vb.z + vb.shearOffset.z
        );
      }
    }
  }

  private updateSlimePursuit(dt: number) {
    const soundEngine = (window as any).soundEngine || { playWormSlime: () => {}, playImpact: () => {} };

    for (const vb of this.voxelBlocks) {
      if (vb.type !== 'slime' || !vb.isPursuing) continue;

      // Initialize or tick pursuit timer
      if (vb.pursuitTimer !== undefined) {
        vb.pursuitTimer -= dt;
      } else {
        vb.pursuitTimer = 6.0;
      }

      let targetPos: THREE.Vector3 | null = null;
      let targetActive = false;

      if (vb.pursuingRagdoll) {
        const exists = this.ragdolls.includes(vb.pursuingRagdoll);
        if (exists) {
          targetPos = vb.pursuingRagdoll.charPos.clone().add(new THREE.Vector3(0, 0.4, 0));
          targetActive = true;
        }
      } else if (vb.pursuingParticle) {
        let found = false;
        for (const r of this.ragdolls) {
          if (r.particles.includes(vb.pursuingParticle)) {
            found = true;
            break;
          }
        }
        if (found) {
          targetPos = new THREE.Vector3(vb.pursuingParticle.x, vb.pursuingParticle.y, vb.pursuingParticle.z);
          targetActive = true;
        }
      }

      const pos = new THREE.Vector3(vb.x, vb.y, vb.z);

      // If target lost, time limit exceeded, or they got extremely far (> 22), fall back to ground!
      if (!targetActive || !targetPos || vb.pursuitTimer <= 0 || pos.distanceTo(targetPos) > 22.0) {
        vb.isPursuing = false;
        vb.pursuingRagdoll = undefined;
        vb.pursuingParticle = undefined;
        vb.pursuitVel = undefined;

        // Gravity pull down to the nearest ground height
        const groundY = this.getGroundHeight(vb.x, vb.z, vb.y);
        vb.y = Math.max(vb.size / 2, groundY);
        if (vb.mesh) {
          vb.mesh.position.set(vb.x, vb.y, vb.z);
          vb.mesh.quaternion.set(0, 0, 0, 1);
        }
        continue;
      }

      // Chase physics
      const dir = targetPos.clone().sub(pos);
      const dist = dir.length();

      // If we catch up to the target, re-trap them!
      if (dist < vb.size * 0.9) {
        soundEngine.playWormSlime();
        soundEngine.playImpact(1.0);
        this.spawnJellyDebris(vb.x, vb.y, vb.z, 'slime', vb.color, 12);

        if (vb.pursuingRagdoll) {
          vb.pursuingRagdoll.adheredSlimeBlockId = vb.id;
        } else if (vb.pursuingParticle) {
          vb.pursuingParticle.adheredSlimeBlockId = vb.id;
        }

        vb.isPursuing = false;
        vb.pursuingRagdoll = undefined;
        vb.pursuingParticle = undefined;
        vb.pursuitVel = undefined;
        continue;
      }

      // Smooth flying movement towards target
      if (!vb.pursuitVel) vb.pursuitVel = new THREE.Vector3(0, 0, 0);

      // Apply steering force
      const desiredVel = dir.normalize().multiplyScalar(10.5); // speed of pursuit
      const steer = desiredVel.sub(vb.pursuitVel);
      vb.pursuitVel.addScaledVector(steer, 5.2 * dt);

      // Apply position updates
      vb.x += vb.pursuitVel.x * dt;
      vb.y += vb.pursuitVel.y * dt;
      vb.z += vb.pursuitVel.z * dt;

      // Update mesh position and slerp orientation to face the direction of flight!
      if (vb.mesh) {
        vb.mesh.position.set(vb.x, vb.y, vb.z);

        if (vb.pursuitVel.lengthSq() > 0.05) {
          const forward = vb.pursuitVel.clone().normalize();
          const up = new THREE.Vector3(0, 1, 0);
          const right = new THREE.Vector3().crossVectors(forward, up).normalize();
          const actualUp = new THREE.Vector3().crossVectors(right, forward).normalize();

          const rotMatrix = new THREE.Matrix4().makeBasis(right, actualUp, forward.negate());
          const targetQuat = new THREE.Quaternion().setFromRotationMatrix(rotMatrix);
          vb.mesh.quaternion.slerp(targetQuat, 12.0 * dt);
        }
      }
    }
  }

  public deformJellyBlockWound(vb: VoxelBlock3D, worldHitPos: THREE.Vector3, dir: THREE.Vector3, intensity: number = 1.0) {
    if (!vb.mesh || !vb.mesh.geometry) return;
    
    vb.mesh.updateMatrixWorld();
    const localHit = worldHitPos.clone();
    vb.mesh.worldToLocal(localHit);
    
    // Direction vector in local space
    const localDir = dir.clone().normalize();
    const rotMatrix = new THREE.Matrix4().extractRotation(vb.mesh.matrixWorld);
    const invRot = rotMatrix.invert();
    localDir.applyMatrix4(invRot);

    const posAttr = vb.mesh.geometry.attributes.position;
    const colorAttr = vb.mesh.geometry.attributes.color;
    
    if (posAttr) {
      // Scale crater radius based on intensity (minimum 0.3x, maximum 1.8x original)
      const radMultiplier = Math.max(0.3, Math.min(1.8, Math.sqrt(intensity)));
      const radius = vb.size * 0.42 * radMultiplier; // Crater size
      const targetWoundColor = vb.type === 'slime' 
        ? new THREE.Color(0x022c22) // Dark toxic slime inner wound
        : new THREE.Color(0x770000); // Raw deep bloody red flesh inner wound
      
      for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const vy = posAttr.getY(i);
        const vz = posAttr.getZ(i);
        const v = new THREE.Vector3(vx, vy, vz);
        
        const dist = v.distanceTo(localHit);
        if (dist < radius) {
          const factor = 1.0 - dist / radius; // 1.0 at center, 0.0 at edge
          
          // 1. "generarse un hueco" -> push inward along penetration path and center direction
          const toCenter = new THREE.Vector3(0, 0, 0).sub(v).normalize();
          const carveDir = new THREE.Vector3()
            .addScaledVector(localDir, 0.65)
            .addScaledVector(toCenter, 0.35)
            .normalize();
          
          // Scale carve depth based on intensity
          const depthMultiplier = Math.max(0.2, Math.min(2.0, intensity));
          v.addScaledVector(carveDir, vb.size * 0.26 * factor * depthMultiplier);

          // 2. "abrirse" -> push surrounding vertices outward to gash open the lips
          const lateral = v.clone().sub(localHit);
          lateral.addScaledVector(carveDir, -lateral.dot(carveDir));
          lateral.normalize();
          
          // Push outward at entry lips, scaled by intensity
          v.addScaledVector(lateral, vb.size * 0.16 * factor * (1.0 - factor * 0.4) * depthMultiplier);

          posAttr.setXYZ(i, v.x, v.y, v.z);

          // 3. Paint wound colors inside the cavity ("deben recibir heridas")
          if (colorAttr) {
            const r = colorAttr.getX(i);
            const g = colorAttr.getY(i);
            const b = colorAttr.getZ(i);
            const curColor = new THREE.Color(r, g, b);
            
            // Interpolate toward the wound color based on depth factor and intensity
            const colorBlend = Math.min(0.99, factor * 0.95 * Math.max(0.5, Math.min(1.0, intensity)));
            curColor.lerp(targetWoundColor, colorBlend);
            
            colorAttr.setXYZ(i, curColor.r, curColor.g, curColor.b);
          }
        }
      }
      
      posAttr.needsUpdate = true;
      if (colorAttr) {
        colorAttr.needsUpdate = true;
      }
      
      // PERSISTENT DEFORMATION: Store permanently in baseDeformedArray so subsequent touches or distant blocks never reset or repair it!
      if (!vb.mesh.geometry.userData) {
        vb.mesh.geometry.userData = {};
      }
      if (!vb.mesh.geometry.userData.baseDeformedArray) {
        vb.mesh.geometry.userData.baseDeformedArray = new Float32Array(posAttr.array);
      } else {
        (vb.mesh.geometry.userData.baseDeformedArray as Float32Array).set(posAttr.array);
      }
      vb.mesh.userData.isDeformed = true;

      vb.mesh.geometry.computeVertexNormals();
      vb.mesh.geometry.computeBoundingBox();
      vb.mesh.geometry.computeBoundingSphere();

      // Wobble scales with intensity!
      if (vb.wobbleVel) {
        vb.wobbleVel.y -= 2.8 * Math.min(2.0, intensity);
        vb.wobbleVel.x += (dir.x * 2.2 + (Math.random() - 0.5) * 1.2) * Math.min(2.0, intensity);
        vb.wobbleVel.z += (dir.z * 2.2 + (Math.random() - 0.5) * 1.2) * Math.min(2.0, intensity);
      }
      if (vb.shearVel) {
        vb.shearVel.x += dir.x * 0.35 * Math.min(2.0, intensity);
        vb.shearVel.z += dir.z * 0.35 * Math.min(2.0, intensity);
      }
    }
  }

  public deformSlimeClusterAtPoint(
    worldHitPos: THREE.Vector3,
    dir: THREE.Vector3,
    intensity: number = 1.0,
    searchRadius: number = 10.5
  ) {
    const nearbySlimes: { block: VoxelBlock3D; dist: number }[] = [];
    for (const vb of this.voxelBlocks) {
      if (vb.type !== 'slime' || !vb.mesh) continue;
      const bPos = new THREE.Vector3(vb.x, vb.y, vb.z);
      const dist = bPos.distanceTo(worldHitPos);
      if (dist <= searchRadius) {
        nearbySlimes.push({ block: vb, dist });
      }
    }

    if (nearbySlimes.length === 0) return;

    for (const item of nearbySlimes) {
      const vb = item.block;
      if (!vb.mesh || !vb.mesh.geometry) continue;

      // Smooth decay across the whole slime structure so distant blocks deform organically
      const falloff = Math.max(0.12, Math.pow(Math.max(0, 1.0 - (item.dist / searchRadius)), 1.05));
      const blockIntensity = intensity * falloff;

      if (item.dist <= vb.size * 1.35) {
        // Direct contact block: deep puncture crater, gash opening, and inner cavity wound
        this.deformJellyBlockWound(vb, worldHitPos, dir, blockIntensity);
      } else {
        // Distant connected block in slime mass: shockwave compression & lateral bulge!
        vb.mesh.updateMatrixWorld();
        const rotMatrix = new THREE.Matrix4().extractRotation(vb.mesh.matrixWorld);
        const invRot = rotMatrix.invert();

        const vbPos = new THREE.Vector3(vb.x, vb.y, vb.z);
        const toBlock = vbPos.clone().sub(worldHitPos).normalize();
        const pushDir = new THREE.Vector3().addScaledVector(dir, 0.65).addScaledVector(toBlock, 0.35).normalize();
        const localPush = pushDir.clone().applyMatrix4(invRot);

        const posAttr = vb.mesh.geometry.attributes.position;
        const colorAttr = vb.mesh.geometry.attributes.color;

        if (posAttr) {
          const targetWoundColor = new THREE.Color(0x022c22); // Dark toxic slime inner color

          for (let i = 0; i < posAttr.count; i++) {
            const vx = posAttr.getX(i);
            const vy = posAttr.getY(i);
            const vz = posAttr.getZ(i);
            const v = new THREE.Vector3(vx, vy, vz);

            // Distance & alignment along push direction
            const dot = vx * localPush.x + vy * localPush.y + vz * localPush.z;
            const compressionFactor = Math.max(0.15, 0.5 - dot / vb.size);

            // Compress inward along shockwave push direction
            const disp = vb.size * 0.22 * falloff * intensity * compressionFactor;
            v.addScaledVector(localPush, disp);

            // Lateral organic bulge perpendicular to push vector (slime volume preservation)
            const lateral = v.clone().sub(localPush.clone().multiplyScalar(v.dot(localPush)));
            if (lateral.lengthSq() > 0.0001) {
              lateral.normalize();
              v.addScaledVector(lateral, vb.size * 0.09 * falloff * intensity);
            }

            posAttr.setXYZ(i, v.x, v.y, v.z);

            // Subtle toxic darkening
            if (colorAttr) {
              const r = colorAttr.getX(i);
              const g = colorAttr.getY(i);
              const b = colorAttr.getZ(i);
              const curColor = new THREE.Color(r, g, b);
              curColor.lerp(targetWoundColor, 0.32 * falloff * Math.min(1.0, intensity));
              colorAttr.setXYZ(i, curColor.r, curColor.g, curColor.b);
            }
          }

          posAttr.needsUpdate = true;
          if (colorAttr) colorAttr.needsUpdate = true;

          // Commit permanently to baseDeformedArray if not actively stretching
          if (!vb.attachedTargetPos) {
            if (!vb.mesh.geometry.userData) {
              vb.mesh.geometry.userData = {};
            }
            if (!vb.mesh.geometry.userData.baseDeformedArray) {
              vb.mesh.geometry.userData.baseDeformedArray = new Float32Array(posAttr.array);
            } else {
              (vb.mesh.geometry.userData.baseDeformedArray as Float32Array).set(posAttr.array);
            }
            vb.mesh.userData.isDeformed = true;
          }

          vb.mesh.geometry.computeVertexNormals();
          vb.mesh.geometry.computeBoundingBox();
          vb.mesh.geometry.computeBoundingSphere();
        }
      }

      if (vb.wobbleVel) {
        vb.wobbleVel.y -= 2.4 * falloff * intensity;
        vb.wobbleVel.x += dir.x * 2.0 * falloff * intensity;
        vb.wobbleVel.z += dir.z * 2.0 * falloff * intensity;
      }
      if (vb.shearVel) {
        vb.shearVel.x += dir.x * 0.35 * falloff * intensity;
        vb.shearVel.z += dir.z * 0.35 * falloff * intensity;
      }
    }

    this.spawnJellyDebris(worldHitPos.x, worldHitPos.y, worldHitPos.z, 'slime', 0xfacc15, Math.ceil(3 * intensity));
    soundEngine.playWormSlime();
  }

  /**
   * Submerges the slime block upon entry:
   * Heavier and faster impact causes wider opening of the 3x3 wall blocks and deeper crater in the pseudo mesh.
   * Adheres the wall blocks to the penetrating entity so when it tries to leave, the wall blocks move with it and stretch the pseudo mesh.
   */
  public submergeAndOpenSlimeBlock(
    vb: VoxelBlock3D,
    worldContactPos: THREE.Vector3,
    impactVel: THREE.Vector3,
    entity?: { ragdollId?: string; particleName?: string; blockId?: string }
  ) {
    if (!vb.mesh || !vb.mesh.geometry || vb.type !== 'slime' || vb.isSubBlock) return;

    vb.mesh.updateMatrixWorld();
    const localHit = worldContactPos.clone();
    vb.mesh.worldToLocal(localHit);

    const posAttr = vb.mesh.geometry.attributes.position;
    const colorAttr = vb.mesh.geometry.attributes.color;
    if (!posAttr) return;

    const size = vb.size;
    const impactSpeed = impactVel.length();

    // Calculate mass multiplier: heavier objects open larger apertures
    let massFactor = 1.0;
    if (entity) {
      if (entity.ragdollId) {
        massFactor = 2.2; // Human ragdoll / heavy character body
      } else if (entity.blockId) {
        const blk = this.voxelBlocks.find((b) => b.id === entity.blockId);
        if (blk) {
          massFactor = (blk.type === 'stone' || blk.type === 'gold' || blk.type === 'asphalt') ? 2.5 : 1.4;
        }
      }
    }

    // Momentum-driven opening power ("mientras más pesado y rápido caiga más se abra esa zona paredes")
    const momentum = Math.max(0.2, Math.min(4.5, impactSpeed * massFactor * 0.45 + 0.35));
    const apertureRadius = Math.min(size * 0.85, size * (0.35 + 0.10 * momentum));
    const craterDepth = Math.min(size * 0.65, 0.12 + 0.11 * momentum);
    const wallSpread = Math.min(size * 0.42, 0.08 + 0.08 * momentum);

    // 1. Deform the outer pseudo-cubo box mesh
    const targetSlimeWound = new THREE.Color(0x022c22); // Deep toxic translucent green for submerged cavity

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      const v = new THREE.Vector3(vx, vy, vz);

      const distToHit = v.distanceTo(localHit);

      if (distToHit < apertureRadius) {
        const factor = 1.0 - distToHit / apertureRadius;
        const toCenter = new THREE.Vector3(0, 0, 0).sub(v).normalize();

        // Push inward along crater depth
        v.addScaledVector(toCenter, craterDepth * factor);

        // Wall flare outward at the boundary rim
        if (factor < 0.50) {
          const outward = v.clone().sub(localHit);
          outward.y = Math.abs(outward.y) + 0.15;
          outward.normalize();
          v.addScaledVector(outward, wallSpread * (0.50 - factor) * 2.0);
        }

        posAttr.setXYZ(i, v.x, v.y, v.z);

        if (colorAttr) {
          const r = colorAttr.getX(i);
          const g = colorAttr.getY(i);
          const b = colorAttr.getZ(i);
          const curColor = new THREE.Color(r, g, b);
          curColor.lerp(targetSlimeWound, factor * 0.85);
          colorAttr.setXYZ(i, curColor.r, curColor.g, curColor.b);
        }
      }
    }

    posAttr.needsUpdate = true;
    if (colorAttr) colorAttr.needsUpdate = true;

    // Cache base deformed state for rest shape
    if (!vb.mesh.geometry.userData) vb.mesh.geometry.userData = {};
    if (!vb.mesh.geometry.userData.baseDeformedArray) {
      vb.mesh.geometry.userData.baseDeformedArray = new Float32Array(posAttr.array);
    } else {
      (vb.mesh.geometry.userData.baseDeformedArray as Float32Array).set(posAttr.array);
    }
    vb.mesh.geometry.computeVertexNormals();
    vb.mesh.userData.isDeformed = true;

    // 2. Open up the 3x3 internal wall blocks ("se abran las paredes de bloques de slime para que entren los bloques de objeto")
    const innerGroup = vb.mesh.getObjectByName('slime_inner_voxels');
    if (innerGroup) {
      innerGroup.children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.userData) {
          const origPos = child.userData.origPos as THREE.Vector3;
          if (!origPos) return;

          const distToContact = origPos.distanceTo(localHit);
          if (distToContact < apertureRadius * 1.35) {
            const spreadFactor = 1.0 - distToContact / (apertureRadius * 1.35);
            // Push lateral wall blocks away from the entry axis
            const lateralDir = origPos.clone().sub(localHit);
            lateralDir.y = 0; // maintain planar spread or radial
            if (lateralDir.lengthSq() < 0.001) lateralDir.set(Math.random() - 0.5, 0, Math.random() - 0.5);
            lateralDir.normalize();

            const offset = lateralDir.multiplyScalar(wallSpread * spreadFactor);
            // Push slightly inward in penetration depth
            offset.y -= craterDepth * 0.45 * spreadFactor;

            child.position.copy(origPos).add(offset);
            child.userData.currentOffset = offset.clone();
            child.userData.adheredEntity = entity;
          }
        }
      });
    }

    // Mark slime block cavity
    vb.isOpenWall = true;
    vb.openedCavityPos = worldContactPos.clone();
    vb.openedCavityRadius = apertureRadius;
    vb.submergedDepth = craterDepth;

    // 3. Adhere entity
    if (entity) {
      if (entity.ragdollId) {
        const ragdoll = this.ragdolls.find((r) => r.id === entity.ragdollId);
        if (ragdoll) {
          (ragdoll as any).adheredSlimeBlockId = vb.id;
          (ragdoll as any).adheredCavityPos = worldContactPos.clone();
          if (entity.particleName) {
            const p = ragdoll.particles.find((part) => part.name === entity.particleName);
            if (p) p.adheredSlimeBlockId = vb.id;
          }
        }
      } else if (entity.blockId) {
        const block = this.voxelBlocks.find((b) => b.id === entity.blockId);
        if (block) {
          (block as any).adheredSlimeBlockId = vb.id;
          (block as any).adheredCavityPos = worldContactPos.clone();
        }
      }
    }

    const soundEngine = (window as any).soundEngine || { playWormSlime: () => {} };
    soundEngine.playWormSlime();
  }

  /**
   * Continuous frame loop for slime block immersion and wall-block adhesion/stretching.
   * When the adhered entity attempts to escape or move away:
   * The 3x3 wall blocks follow the object, and the outer pseudo mesh stretches to follow the wall blocks.
   */
  public updateSlimeBlockInteractions(dt: number) {
    const soundEngine = (window as any).soundEngine || { playWormSlime: () => {} };

    // A. Detect contacts and dynamically adapt slime wall geometry to inserted blocks/objects
    for (const vb of this.voxelBlocks) {
      if (vb.type !== 'slime' || !vb.mesh || !vb.mesh.geometry) continue;

      if (!vb.userData) vb.userData = {};
      if (!vb.userData.enteredEntities) {
        vb.userData.enteredEntities = new Map<string, {
          key: string;
          type: 'particle' | 'ragdoll' | 'block';
          ref: any;
          ragdoll?: any;
          lastPos: THREE.Vector3;
          isAdhered: boolean;
        }>();
      }

      const halfSize = vb.size * 0.55;
      const blockBoxMin = new THREE.Vector3(vb.x - halfSize, vb.y - halfSize, vb.z - halfSize);
      const blockBoxMax = new THREE.Vector3(vb.x + halfSize, vb.y + halfSize, vb.z + halfSize);

      // Collect all intersecting blocks or particles
      const intersectingObjects: { pos: THREE.Vector3; radius: number; vel: THREE.Vector3 }[] = [];

      // Check ragdoll particles
      for (const ragdoll of this.ragdolls) {
        for (const p of ragdoll.particles) {
          if (p.dismembered) continue;
          if (p.x >= blockBoxMin.x && p.x <= blockBoxMax.x &&
              p.y >= blockBoxMin.y && p.y <= blockBoxMax.y &&
              p.z >= blockBoxMin.z && p.z <= blockBoxMax.z) {
            
            const pPos = new THREE.Vector3(p.x, p.y, p.z);
            const pVel = new THREE.Vector3(p.vx, p.vy, p.vz);
            intersectingObjects.push({ pos: pPos, radius: 0.16, vel: pVel });

            const pKey = 'p_' + p.name + '_' + ragdoll.id;
            const existing = vb.userData.enteredEntities.get(pKey);
            if (!existing) {
              vb.userData.enteredEntities.set(pKey, {
                key: pKey,
                type: 'particle',
                ref: p,
                ragdoll,
                lastPos: pPos.clone(),
                isAdhered: false,
              });
            } else {
              existing.lastPos.copy(pPos);
            }

            // Trigger entry opening
            if (!vb.isOpenWall || (vb.openedCavityPos && vb.openedCavityPos.distanceTo(pPos) > vb.size * 0.45)) {
              this.submergeAndOpenSlimeBlock(vb, pPos, pVel, {
                ragdollId: ragdoll.id,
                particleName: p.name,
              });
            }

            // Viscous braking damping inside slime
            p.vx *= Math.exp(-6.0 * dt);
            p.vy *= Math.exp(-6.0 * dt);
            p.vz *= Math.exp(-6.0 * dt);
            p.oldX = p.x - p.vx * dt;
            p.oldY = p.y - p.vy * dt;
            p.oldZ = p.z - p.vz * dt;
          }
        }

        // Check ragdoll charPos
        const charP = ragdoll.charPos;
        if (charP.x >= blockBoxMin.x && charP.x <= blockBoxMax.x &&
            charP.y >= blockBoxMin.y && charP.y <= blockBoxMax.y + 0.8 &&
            charP.z >= blockBoxMin.z && charP.z <= blockBoxMax.z) {

          const rPos = charP.clone().add(new THREE.Vector3(0, 0.4, 0));
          intersectingObjects.push({ pos: rPos, radius: 0.32, vel: ragdoll.charVel });

          const rKey = 'ragdoll_' + ragdoll.id;
          const existingR = vb.userData.enteredEntities.get(rKey);
          if (!existingR) {
            vb.userData.enteredEntities.set(rKey, {
              key: rKey,
              type: 'ragdoll',
              ref: ragdoll,
              ragdoll,
              lastPos: charP.clone(),
              isAdhered: false,
            });
          } else {
            existingR.lastPos.copy(charP);
          }

          if (!vb.isOpenWall) {
            this.submergeAndOpenSlimeBlock(vb, charP.clone(), ragdoll.charVel, {
              ragdollId: ragdoll.id,
            });
          }

          ragdoll.charVel.multiplyScalar(Math.exp(-5.0 * dt));
        }
      }

      // Check non-slime dynamic voxel blocks & props inserted into the slime wall
      for (const ob of this.voxelBlocks) {
        if (ob.type === 'slime' || ob.id === vb.id) continue;
        const obHalf = (ob.size || 0.4) * 0.55;
        if (ob.x + obHalf >= blockBoxMin.x && ob.x - obHalf <= blockBoxMax.x &&
            ob.y + obHalf >= blockBoxMin.y && ob.y - obHalf <= blockBoxMax.y &&
            ob.z + obHalf >= blockBoxMin.z && ob.z - obHalf <= blockBoxMax.z) {
          
          const obPos = new THREE.Vector3(ob.x, ob.y, ob.z);
          const obVel = new THREE.Vector3((ob as any).vx || 0, (ob as any).vy || 0, (ob as any).vz || 0);
          intersectingObjects.push({ pos: obPos, radius: ob.size * 0.52, vel: obVel });

          const bKey = 'block_' + ob.id;
          const existingB = vb.userData.enteredEntities.get(bKey);
          if (!existingB) {
            vb.userData.enteredEntities.set(bKey, {
              key: bKey,
              type: 'block',
              ref: ob,
              lastPos: obPos.clone(),
              isAdhered: false,
            });
          } else {
            existingB.lastPos.copy(obPos);
          }

          if (!vb.isOpenWall) {
            this.submergeAndOpenSlimeBlock(vb, obPos, obVel, {
              blockId: ob.id,
            });
          }
        }
      }

      // Dynamic form-fitting adaptation (like female anatomical entrance wrapping snugly around an inserted male shaft/rod)
      if (intersectingObjects.length > 0 && vb.mesh && vb.mesh.geometry) {
        const geom = vb.mesh.geometry;
        const posAttr = geom.attributes.position as THREE.BufferAttribute;
        if (!geom.userData) geom.userData = {};
        if (!geom.userData.origPosArray && posAttr) {
          geom.userData.origPosArray = new Float32Array(posAttr.array);
        }
        const restArray = geom.userData.origPosArray;

        if (posAttr && restArray) {
          // Reset from rest shape
          posAttr.array.set(restArray);

          const innerGroup = vb.mesh.getObjectByName('slime_inner_voxels');

          for (const obj of intersectingObjects) {
            const localObjPos = vb.mesh.worldToLocal(obj.pos.clone());
            const objRad = obj.radius;
            const adaptRadius = objRad * 1.55;

            // 1. Deform outer vertex sleeve around the inserted block
            for (let i = 0; i < posAttr.count; i++) {
              const vx = posAttr.getX(i);
              const vy = posAttr.getY(i);
              const vz = posAttr.getZ(i);
              const dx = vx - localObjPos.x;
              const dy = vy - localObjPos.y;
              const dz = vz - localObjPos.z;
              const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

              if (dist < adaptRadius && dist > 0.001) {
                // Push vertices outward from the block surface with a snug snug sleeve profile
                const pushOut = Math.max(0, objRad * 1.08 - dist);
                const nX = dx / dist;
                const nY = dy / dist;
                const nZ = dz / dist;

                // Lip rim bulge at boundary
                const rimFactor = Math.sin((dist / adaptRadius) * Math.PI) * 0.06;

                posAttr.setXYZ(
                  i,
                  vx + nX * pushOut + nX * rimFactor,
                  vy + nY * pushOut + nY * rimFactor,
                  vz + nZ * pushOut + nZ * rimFactor
                );
              }
            }

            // 2. Displace internal 3x3 wall blocks to open space for the inserted block
            if (innerGroup) {
              innerGroup.children.forEach((child) => {
                if (child instanceof THREE.Mesh && child.userData && child.userData.origPos) {
                  const origPos = child.userData.origPos as THREE.Vector3;
                  const dist = origPos.distanceTo(localObjPos);
                  if (dist < adaptRadius * 1.3) {
                    const dispDir = origPos.clone().sub(localObjPos).normalize();
                    if (dispDir.lengthSq() < 0.001) dispDir.set(0, 1, 0);
                    const pushAmt = (adaptRadius * 1.3 - dist) * 0.75;
                    child.position.copy(origPos).addScaledVector(dispDir, pushAmt);
                  }
                }
              });
            }
          }

          posAttr.needsUpdate = true;
          geom.computeVertexNormals();
          vb.mesh.userData.isDeformed = true;
        }
      }
    }

    // B. ESCAPE & ADHESION:
    // "Que slime bloque adhiera sus bloques de afuera a los bloques que entraron dentro de slime si es que salen de la zona de bloque slime y que al estar adherido slime a esos bloques si se alejan se estire el pseudo de slime"
    for (const vb of this.voxelBlocks) {
      if (vb.type !== 'slime' || !vb.mesh) continue;

      const innerGroup = vb.mesh.getObjectByName('slime_inner_voxels');
      const bCenter = new THREE.Vector3(vb.x, vb.y, vb.z);
      const exitThreshold = vb.size * 0.46;
      let primaryStretchTarget: THREE.Vector3 | null = null;
      let maxStretchDist = 0;

      const enteredMap = vb.userData?.enteredEntities as Map<string, any> | undefined;
      if (!enteredMap || enteredMap.size === 0) continue;

      const toDeleteKeys: string[] = [];

      for (const [key, entry] of enteredMap.entries()) {
        const curPos = new THREE.Vector3();
        let curSpeed = 0;
        let isPlayerSprinting = false;

        if (entry.type === 'particle') {
          const p = entry.ref;
          if (!p || p.dismembered) {
            toDeleteKeys.push(key);
            continue;
          }
          curPos.set(p.x, p.y, p.z);
          curSpeed = Math.hypot(p.vx, p.vy, p.vz);
          if (entry.ragdoll && entry.ragdoll.isControlled && this.isSprinting) {
            isPlayerSprinting = true;
          }
        } else if (entry.type === 'ragdoll') {
          const r = entry.ref;
          if (!r) {
            toDeleteKeys.push(key);
            continue;
          }
          curPos.copy(r.charPos);
          curSpeed = r.charVel.length();
          if (r.isControlled && this.isSprinting) {
            isPlayerSprinting = true;
          }
        } else if (entry.type === 'block') {
          const b = entry.ref;
          if (!b) {
            toDeleteKeys.push(key);
            continue;
          }
          curPos.set(b.x, b.y, b.z);
          curSpeed = Math.hypot((b as any).vx || 0, (b as any).vy || 0, (b as any).vz || 0);
        }

        const distToCenter = curPos.distanceTo(bCenter);

        // 1. Check if the block/entity that entered is exiting the slime zone
        if (distToCenter > exitThreshold) {
          // Object entered inside and is now exiting the slime zone!
          // Adhere outer wall blocks of the slime to the exiting blocks
          entry.isAdhered = true;
          (entry.ref as any).adheredSlimeBlockId = vb.id;
          if (entry.ragdoll) {
            (entry.ragdoll as any).adheredSlimeBlockId = vb.id;
          }

          // Pick outer wall blocks that face this exit direction and bind them
          if (innerGroup) {
            const localTargetPos = vb.mesh.worldToLocal(curPos.clone());
            innerGroup.children.forEach((child) => {
              if (child instanceof THREE.Mesh && child.userData && child.userData.isWallBlock) {
                const origPos = child.userData.origPos as THREE.Vector3;
                // If not yet bound or already bound to this entry
                if (!child.userData.adheredTargetKey || child.userData.adheredTargetKey === key) {
                  const distToOrig = origPos.distanceTo(localTargetPos);
                  if (distToOrig < vb.size * 3.8) {
                    child.userData.adheredTargetKey = key;
                  }
                }
              }
            });
          }
        }

        // 2. If adhered, as it moves away ("si se alejan"), stretch outer blocks and the pseudo slime
        if (entry.isAdhered) {
          // Snap / Escape check: only snaps after stretching far (5.8m) or sprinting past 4.5m
          const snapLimit = 5.8;
          const shouldSnap = distToCenter > snapLimit || (isPlayerSprinting && curSpeed > 2.4 && distToCenter > 4.5);

          if (shouldSnap) {
            // SNAP / POP!
            soundEngine.playWormSlime();
            this.spawnJellyDebris(curPos.x, curPos.y + 0.3, curPos.z, 'slime', vb.color, 12);

            // Detach surface blocks as dynamic pursuing slime props!
            // "y persiguiendo como prop a los bloques que tratan de escapar"
            const spawnCount = Math.min(3, Math.max(1, innerGroup ? innerGroup.children.filter(c => c instanceof THREE.Mesh && c.userData?.adheredTargetKey === key).length : 2));
            for (let sIdx = 0; sIdx < spawnCount; sIdx++) {
              const angle = (sIdx / spawnCount) * Math.PI * 2 + Math.random() * 0.4;
              const spawnX = curPos.x + Math.cos(angle) * 0.4;
              const spawnY = curPos.y + 0.25;
              const spawnZ = curPos.z + Math.sin(angle) * 0.4;
              const propBlock = this.spawnVoxelBlock(spawnX, spawnY, spawnZ, 'slime', 0.38, vb.color);
              if (propBlock) {
                propBlock.isDynamicProp = true;
                propBlock.isPursuing = true;
                propBlock.pursuingRagdoll = entry.ragdoll;
                propBlock.pursuingParticle = entry.type === 'particle' ? entry.ref : undefined;
                propBlock.pursuitTimer = 10.0;
                propBlock.attachedTargetPos = curPos.clone();
                propBlock.pursuitVel = curPos.clone().sub(new THREE.Vector3(spawnX, spawnY, spawnZ)).normalize().multiplyScalar(12.5);
              }
            }

            (entry.ref as any).adheredSlimeBlockId = undefined;
            if (entry.ragdoll) {
              (entry.ragdoll as any).adheredSlimeBlockId = undefined;
            }

            // Release adhered outer wall blocks back to original positions smoothly
            if (innerGroup) {
              innerGroup.children.forEach((child) => {
                if (child instanceof THREE.Mesh && child.userData?.adheredTargetKey === key) {
                  child.userData.adheredTargetKey = undefined;
                  child.position.copy(child.userData.origPos);
                }
              });
            }

            toDeleteKeys.push(key);
            continue;
          }

          // Keep track of the primary stretch target for the pseudo mesh
          if (distToCenter > maxStretchDist) {
            maxStretchDist = distToCenter;
            primaryStretchTarget = curPos.clone();
          }

          // Elastic spring tension pulling the escaping entity back toward the slime center
          const pullDir = bCenter.clone().sub(curPos).normalize();
          const tension = Math.min(48.0, Math.max(0, distToCenter - vb.size * 0.45) * 16.0);

          if (entry.type === 'ragdoll') {
            entry.ref.charVel.addScaledVector(pullDir, tension * dt);
          } else if (entry.type === 'particle') {
            entry.ref.vx += pullDir.x * tension * dt * 0.4;
            entry.ref.vy += pullDir.y * tension * dt * 0.4;
            entry.ref.vz += pullDir.z * tension * dt * 0.4;
          } else if (entry.type === 'block') {
            if ((entry.ref as any).vx !== undefined) {
              (entry.ref as any).vx += pullDir.x * tension * dt;
              (entry.ref as any).vy += pullDir.y * tension * dt;
              (entry.ref as any).vz += pullDir.z * tension * dt;
            }
          }

          // Move the adhered outer wall blocks along with the exiting blocks
          if (innerGroup) {
            const localTargetPos = vb.mesh.worldToLocal(curPos.clone());
            innerGroup.children.forEach((child) => {
              if (child instanceof THREE.Mesh && child.userData?.adheredTargetKey === key) {
                const origPos = child.userData.origPos as THREE.Vector3;
                const toTarget = localTargetPos.clone().sub(origPos);
                // Clamp max offset of individual wall block
                const clamped = toTarget.clampLength(0, Math.min(distToCenter, 5.5));
                child.position.copy(origPos).addScaledVector(clamped, 0.90);
              }
            });
          }
        }
      }

      // Cleanup finished/snapped keys
      for (const k of toDeleteKeys) {
        enteredMap.delete(k);
      }

      // Reset unadhered outer wall blocks smoothly back to rest positions
      if (innerGroup) {
        innerGroup.children.forEach((child) => {
          if (child instanceof THREE.Mesh && child.userData && !child.userData.adheredTargetKey) {
            if (child.position.distanceTo(child.userData.origPos) > 0.005) {
              child.position.lerp(child.userData.origPos, 0.2);
            }
          }
        });
      }

      // 3. Stretch the pseudo of the slime ("se estire el pseudo de slime")
      if (primaryStretchTarget && maxStretchDist > vb.size * 0.5) {
        vb.attachedTargetPos = primaryStretchTarget;
      } else {
        vb.attachedTargetPos = undefined;
      }
    }
  }

  public spawnJellyDebris(x: number, y: number, z: number, type: 'slime' | 'skin', color: number, count: number = 4) {
    const size = 0.18 + Math.random() * 0.16;
    for (let i = 0; i < count; i++) {
      const geom = new THREE.BoxGeometry(size, size, size);
      
      const mat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: type === 'slime' ? 0.05 : 0.65,
        metalness: type === 'slime' ? 0.15 : 0.05,
        transparent: type === 'slime',
        opacity: type === 'slime' ? 0.82 : 1.0,
      });
      
      const texture = getLowResTexture(type);
      if (texture) {
        mat.map = texture;
      }

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(x, y, z);
      this.scene.add(mesh);

      // Random explosive velocity
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 5.0;
      const vx = Math.cos(angle) * speed * (Math.random() * 0.8 + 0.4);
      const vy = 3.0 + Math.random() * 5.0;
      const vz = Math.sin(angle) * speed * (Math.random() * 0.8 + 0.4);

      const maxLife = 1.4 + Math.random() * 1.2;
      this.jellyDebris.push({
        x,
        y,
        z,
        vx,
        vy,
        vz,
        size,
        life: maxLife,
        maxLife,
        decay: 1.0,
        type,
        color,
        mesh,
        wobbleScale: new THREE.Vector3(1, 1, 1),
        wobbleVel: new THREE.Vector3((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5),
      });
    }
  }

  private updateJellyDebris(dt: number) {
    const gy = this.map.gravity.y;
    for (let i = this.jellyDebris.length - 1; i >= 0; i--) {
      const jd = this.jellyDebris[i];
      
      // Gravity
      jd.vy += gy * dt * 0.95;
      
      // Position integration
      jd.x += jd.vx * dt;
      jd.y += jd.vy * dt;
      jd.z += jd.vz * dt;
      
      jd.life -= jd.decay * dt;

      // Floor bounce
      const radius = jd.size / 2;
      if (jd.y <= radius) {
        jd.y = radius;
        jd.vy = -jd.vy * 0.52; // Bounce!
        jd.vx *= 0.78;
        jd.vz *= 0.78;
        
        // Squeeze on bounce!
        jd.wobbleVel.y += -4.0;
        jd.wobbleVel.x += 2.0;
        jd.wobbleVel.z += 2.0;
        
        soundEngine.playImpact(0.12);
      }

      // Wobble animation inside debris particle
      const stiffness = jd.type === 'slime' ? 140 : 250;
      const damping = jd.type === 'slime' ? 6 : 12;

      // Update scale wobble for debris
      const fx = -stiffness * (jd.wobbleScale.x - 1);
      const dx = -damping * jd.wobbleVel.x;
      jd.wobbleVel.x += (fx + dx) * dt;
      jd.wobbleScale.x += jd.wobbleVel.x * dt;

      const fy = -stiffness * (jd.wobbleScale.y - 1);
      const dy = -damping * jd.wobbleVel.y;
      jd.wobbleVel.y += (fy + dy) * dt;
      jd.wobbleScale.y += jd.wobbleVel.y * dt;

      const fz = -stiffness * (jd.wobbleScale.z - 1);
      const dz = -damping * jd.wobbleVel.z;
      jd.wobbleVel.z += (fz + dz) * dt;
      jd.wobbleScale.z += jd.wobbleVel.z * dt;

      // Clip debris scales
      jd.wobbleScale.x = Math.max(0.1, Math.min(2.0, jd.wobbleScale.x));
      jd.wobbleScale.y = Math.max(0.1, Math.min(2.0, jd.wobbleScale.y));
      jd.wobbleScale.z = Math.max(0.1, Math.min(2.0, jd.wobbleScale.z));

      // Update mesh transforms
      if (jd.mesh) {
        jd.mesh.position.set(jd.x, jd.y, jd.z);
        jd.mesh.rotation.x += jd.vx * dt * 2;
        jd.mesh.rotation.y += jd.vy * dt;
        jd.mesh.rotation.z += jd.vz * dt * 2;
        
        // Shrink as it dies
        const lifeRatio = Math.max(0, jd.life / jd.maxLife);
        jd.mesh.scale.set(
          jd.size * jd.wobbleScale.x * lifeRatio,
          jd.size * jd.wobbleScale.y * lifeRatio,
          jd.size * jd.wobbleScale.z * lifeRatio
        );
      }

      // Cleanup
      if (jd.life <= 0) {
        if (jd.mesh) {
          this.scene.remove(jd.mesh);
        }
        this.jellyDebris.splice(i, 1);
      }
    }
  }

  private updatePickups(dt: number) {
    const player = this.ragdolls.find((r) => r.isControlled);
    if (!player || !player.isAlive) return;

    // If player is holding a weapon or hammer and is no longer in ragdoll walk, drop it
    if (player.hasWeapon && !player.isWalkingRagdoll) {
      this.dropWeapon(player.id);
    }

    for (let i = this.weaponPickups.length - 1; i >= 0; i--) {
      const pickup = this.weaponPickups[i];
      if (pickup.isEquipped) continue;

      // Animate hovering and spinning
      pickup.mesh.rotation.y += dt * 1.8;
      pickup.mesh.position.y = pickup.y + 0.35 + Math.sin(performance.now() * 0.003) * 0.08;

      // Check proximity with player
      const dx = player.charPos.x - pickup.x;
      const dz = player.charPos.z - pickup.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      // "que martillo lo agarre en ragdoll walk solamente igual que arma pick"
      if (dist < 1.45 && player.isWalkingRagdoll) {
        pickup.isEquipped = true;
        if (pickup.type === 'hammer') {
          this.equipHammer(player.id);
        } else {
          this.equipWeapon(player.id);
        }
        this.scene.remove(pickup.mesh);
        this.weaponPickups.splice(i, 1);
      }
    }
  }

  private updateSoldiers(dt: number) {
    const player = this.ragdolls.find((r) => r.isControlled);

    // Also update general non-controlled live ragdolls (dummies, etc.) to wander/walk toward player or doors
    for (const ragdoll of this.ragdolls) {
      if (ragdoll.isControlled || (ragdoll as any).isRemotePlayer || (!ragdoll.isAlive && !ragdoll.isWalkingRagdoll)) continue;
      // Check if this ragdoll is already managed by soldiers list
      const isSoldier = this.soldiers.some(s => s.ragdoll === ragdoll);
      if (isSoldier) continue;

      // Dummy / AI wandering & player seeking behavior
      let targetPos: { x: number, z: number } | null = null;
      let distToTarget = Infinity;
      
      const intel = ragdoll.intelligence ?? this.intelligence;
      const reproduction = ragdoll.reproduction ?? this.reproduction;
      const speedStat = ragdoll.speed ?? this.speed;
      const speedFactor = 0.2 + 1.8 * (speedStat / 100);
      const intelFactor = 0.2 + 1.8 * (intel / 100);

      // 1. Vision Check
      const canSeePlayer = player ? this.checkLineOfSight(ragdoll, player) : false;
      ragdoll.hasTargetInSight = canSeePlayer;
      if (canSeePlayer && player) {
        ragdoll.lastSeenTargetPos = player.charPos.clone();
      }

      // 2. Behavior state management
      if (!ragdoll.aiState) ragdoll.aiState = 'wandering';
      if (ragdoll.aiTimer === undefined) ragdoll.aiTimer = 0;
      if (ragdoll.tripTimer === undefined) ragdoll.tripTimer = 0;
      
      ragdoll.aiTimer -= dt;

      if (ragdoll.aiTimer <= 0) {
        const rand = Math.random();
        
        if (canSeePlayer && player) {
          // Engaged behavior
          const dist = Math.sqrt(Math.pow(player.charPos.x - ragdoll.charPos.x, 2) + Math.pow(player.charPos.z - ragdoll.charPos.z, 2));
          
          if (intel > 60 && rand < 0.3) {
            // High intelligence hiding logic
            const spot = this.findHidingSpot(ragdoll, player);
            if (spot) {
              ragdoll.aiState = 'hiding';
              ragdoll.hidingSpot = spot;
              ragdoll.aiTimer = 3.0 + Math.random() * 5.0;
            }
          } else {
            // Movement variety
            if (dist > 25) {
               ragdoll.aiState = 'approaching';
            } else if (dist < 10) {
               ragdoll.aiState = 'retreating';
            } else {
               const moves: ('orbit_left' | 'orbit_right' | 'strafe_left' | 'strafe_right')[] = ['orbit_left', 'orbit_right', 'strafe_left', 'strafe_right'];
               ragdoll.aiState = moves[Math.floor(Math.random() * moves.length)];
            }
            ragdoll.aiTimer = 1.5 + Math.random() * 3.0;
          }
          ragdoll.lookAtTarget = Math.random() < (0.4 + intel/200); // Smarter NPCs look more at the target
        } else if (ragdoll.lastSeenTargetPos) {
          // Searching for player
          ragdoll.aiState = 'approaching';
          ragdoll.lookAtTarget = true;
          ragdoll.aiTimer = 2.0;
          
          // If reached last seen pos, clear it and wander
          const distToLast = Math.sqrt(Math.pow(ragdoll.lastSeenTargetPos.x - ragdoll.charPos.x, 2) + Math.pow(ragdoll.lastSeenTargetPos.z - ragdoll.charPos.z, 2));
          if (distToLast < 2) {
            ragdoll.lastSeenTargetPos = undefined;
            ragdoll.aiState = 'wandering';
          }
        } else {
          // Just wandering
          ragdoll.aiState = 'wandering';
          ragdoll.facingAngle += (Math.random() - 0.5) * Math.PI;
          ragdoll.aiTimer = 2.0 + Math.random() * 4.0;
          ragdoll.lookAtTarget = false;
        }
      }

      if (ragdoll.tripTimer > 0) {
        ragdoll.tripTimer -= dt;
        ragdoll.isWalkingRagdoll = false;
        if (ragdoll.tripTimer <= 0 && ragdoll.isAlive) {
          const pelvis = ragdoll.particles.find((p) => p.name === 'pelvis') || ragdoll.particles[0];
          if (pelvis) {
            ragdoll.charPos.x = pelvis.x;
            ragdoll.charPos.z = pelvis.z;
            ragdoll.charPos.y = Math.max(-12.0, pelvis.y - 0.98 * ragdoll.scale);
          }
          ragdoll.charVel.set(0, 0, 0);
          this.resetRagdollParticlesToKinematicPose(ragdoll);
          ragdoll.isWalkingRagdoll = true;
        }
        continue;
      }

      // Unsteady walk / tripping for low intelligence (1-15)
      if (intel > 0 && intel <= 15 && ragdoll.isAlive) {
        if (Math.random() < 0.012) {
          ragdoll.tripTimer = 1.5 + Math.random() * 2.5;
          ragdoll.aiState = 'tripped';
          for (const p of ragdoll.particles) {
            p.vx += (Math.random() - 0.5) * 4;
            p.vz += (Math.random() - 0.5) * 4;
            if (p.name === 'cabeza' || p.name === 'pechobase') p.vy -= 2;
          }
        }
        if (Math.random() < 0.05) {
          const pushX = (Math.random() - 0.5) * 1.5;
          const pushZ = (Math.random() - 0.5) * 1.5;
          for (const p of ragdoll.particles) {
            if (p.name === 'cabeza' || p.name === 'pechobase' || p.name === 'torso') {
              p.vx += pushX;
              p.vz += pushZ;
            }
          }
        }
      }

      // 3. Movement Execution
      let targetCoords: { x: number, z: number } | null = null;
      if (ragdoll.aiState === 'hiding' && ragdoll.hidingSpot) {
        targetCoords = { x: ragdoll.hidingSpot.x, z: ragdoll.hidingSpot.z };
      } else if (canSeePlayer && player) {
        targetCoords = { x: player.charPos.x, z: player.charPos.z };
      } else if (ragdoll.lastSeenTargetPos) {
        targetCoords = { x: ragdoll.lastSeenTargetPos.x, z: ragdoll.lastSeenTargetPos.z };
      }

      if (ragdoll.aiState === 'wandering') {
        const walkSpeed = 1.2 * ragdoll.scale * speedFactor;
        ragdoll.charVel.x = Math.sin(ragdoll.facingAngle) * walkSpeed;
        ragdoll.charVel.z = Math.cos(ragdoll.facingAngle) * walkSpeed;
        ragdoll.charPos.x += ragdoll.charVel.x * dt;
        ragdoll.charPos.z += ragdoll.charVel.z * dt;
        ragdoll.walkCycle += dt * 4.0;
      } else if (targetCoords) {
        const dx = targetCoords.x - ragdoll.charPos.x;
        const dz = targetCoords.z - ragdoll.charPos.z;
        const distToTarget = Math.sqrt(dx * dx + dz * dz);
        let baseAngle = Math.atan2(dx, dz);
        let targetAngle = baseAngle;
        let walkSpeed = 2.2 * ragdoll.scale * speedFactor;

        if (distToTarget > 1.2) {
          switch (ragdoll.aiState) {
            case 'orbit_left': targetAngle = baseAngle + Math.PI / 2; break;
            case 'orbit_right': targetAngle = baseAngle - Math.PI / 2; break;
            case 'strafe_left': targetAngle = baseAngle + Math.PI / 2; walkSpeed *= 0.8; break;
            case 'strafe_right': targetAngle = baseAngle - Math.PI / 2; walkSpeed *= 0.8; break;
            case 'observing': walkSpeed = 0; break;
            case 'retreating': walkSpeed = -walkSpeed * 0.6; break;
          }

          if (intel > 0 && intel <= 15) {
            targetAngle += Math.sin(performance.now() * 0.004) * 0.8;
            walkSpeed *= (0.6 + Math.sin(performance.now() * 0.005 + 1) * 0.5);
          }

          let lookAngle = ragdoll.lookAtTarget ? baseAngle : targetAngle;
          let angleDiff = lookAngle - ragdoll.facingAngle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          ragdoll.facingAngle += angleDiff * Math.min(1.0, 6.0 * intelFactor * dt);

          ragdoll.charVel.x = Math.sin(targetAngle) * walkSpeed;
          ragdoll.charVel.z = Math.cos(targetAngle) * walkSpeed;
          ragdoll.charPos.x += ragdoll.charVel.x * dt;
          ragdoll.charPos.z += ragdoll.charVel.z * dt;
          ragdoll.walkCycle += dt * 6.5 * speedFactor * (walkSpeed < 0 ? -1 : 1);
        } else {
          ragdoll.charVel.x = 0;
          ragdoll.charVel.z = 0;
          
          // Attack the player if close enough!
          const isEvil = (ragdoll as any).isEvilDummy === true;
          if (isEvil && player && canSeePlayer && distToTarget <= 1.4 && (ragdoll as any).punchCooldown <= 0) {
            (ragdoll as any).punchCooldown = 0.4;
            this.performUnarmedAttack(ragdoll.id);
          }
        }
      } else {
        ragdoll.charVel.x = 0;
        ragdoll.charVel.z = 0;
      }
    }

    for (const soldier of this.soldiers) {
      if (!soldier.ragdoll.isAlive) {
        soldier.isAggro = false;
        continue;
      }

      if (player && player.isAlive) {
        const dx = player.charPos.x - soldier.ragdoll.charPos.x;
        const dz = player.charPos.z - soldier.ragdoll.charPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Aggro distance threshold: 26 meters
        if (dist < 26.0) {
          if (!soldier.isAggro) {
            soldier.isAggro = true;
            soundEngine.playSoldierAlert();
          }

          soldier.ragdoll.isAiming = true;

          // Rotate soldier to aim directly at player - scales with Intelligence
          const targetAngle = Math.atan2(dx, dz);
          let angleDiff = targetAngle - soldier.ragdoll.facingAngle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          const intelTurnFactor = 0.1 + 1.9 * (this.intelligence / 100);
          soldier.ragdoll.facingAngle += angleDiff * Math.min(1.0, 10.0 * intelTurnFactor * dt);

          // Tactical distance control ("Soldado haga distancia no se acerque tanto")
          // Maintain a tactical combat distance of ~12 to 18 meters
          const intelFactor = 0.2 + 1.8 * (this.intelligence / 100);
          const baseSpeed = 2.4 * soldier.ragdoll.scale * intelFactor;

          if (dist < 12.0) {
            // Player is too close: backpedal / retreat backwards away from player
            const retreatSpeed = baseSpeed * 1.15;
            soldier.ragdoll.charVel.x = -Math.sin(soldier.ragdoll.facingAngle) * retreatSpeed;
            soldier.ragdoll.charVel.z = -Math.cos(soldier.ragdoll.facingAngle) * retreatSpeed;
            soldier.ragdoll.charPos.x += soldier.ragdoll.charVel.x * dt;
            soldier.ragdoll.charPos.z += soldier.ragdoll.charVel.z * dt;
            soldier.ragdoll.walkCycle -= dt * 6.0 * intelFactor;
          } else if (dist > 18.0) {
            // Player is far away: advance cautiously towards firing distance
            const advanceSpeed = baseSpeed * 0.85;
            soldier.ragdoll.charVel.x = Math.sin(soldier.ragdoll.facingAngle) * advanceSpeed;
            soldier.ragdoll.charVel.z = Math.cos(soldier.ragdoll.facingAngle) * advanceSpeed;
            soldier.ragdoll.charPos.x += soldier.ragdoll.charVel.x * dt;
            soldier.ragdoll.charPos.z += soldier.ragdoll.charVel.z * dt;
            soldier.ragdoll.walkCycle += dt * 5.5 * intelFactor;
          } else {
            // In optimal range (12m - 18m): maintain position and strafe tactically
            const strafeDir = Math.sin(performance.now() * 0.0015) > 0 ? 1 : -1;
            const strafeSpeed = baseSpeed * 0.45;
            soldier.ragdoll.charVel.x = Math.cos(soldier.ragdoll.facingAngle) * strafeSpeed * strafeDir;
            soldier.ragdoll.charVel.z = -Math.sin(soldier.ragdoll.facingAngle) * strafeSpeed * strafeDir;
            soldier.ragdoll.charPos.x += soldier.ragdoll.charVel.x * dt;
            soldier.ragdoll.charPos.z += soldier.ragdoll.charVel.z * dt;
            soldier.ragdoll.walkCycle += dt * 3.0 * intelFactor;
          }

          // Shooting loop - cooldown scales inversely with Intelligence (faster fires when smarter)
          soldier.shootCooldown -= dt;
          if (soldier.shootCooldown <= 0) {
            // Target ANY active body part of the player
            let targetPos = null;
            const activePlayerLimbs = player.particles.filter(
              (p: any) => !p.dismembered && p.health > 0
            );

            if (activePlayerLimbs.length > 0) {
              // Calculate limb size/volume weight: larger limbs have higher probability of being targeted
              let totalWeight = 0;
              const limbWeights = activePlayerLimbs.map((p: any) => {
                const blockCount = p.voxelBlocks ? p.voxelBlocks.length : 1;
                const name = (p.name || '').toLowerCase();
                let mult = 1.0;
                if (name === 'pechobase' || name === 'torso' || name === 'ombligo' || name === 'pelvis') mult = 2.5;
                else if (name.includes('muslo') || name.includes('pantorrilla')) mult = 1.8;
                else if (name.includes('cabeza')) mult = 1.2;
                const weight = Math.max(1, blockCount * mult);
                totalWeight += weight;
                return weight;
              });

              let randomVal = Math.random() * totalWeight;
              let selectedLimb = activePlayerLimbs[0];
              for (let i = 0; i < activePlayerLimbs.length; i++) {
                if (randomVal <= limbWeights[i]) {
                  selectedLimb = activePlayerLimbs[i];
                  break;
                }
                randomVal -= limbWeights[i];
              }

              targetPos = new THREE.Vector3(selectedLimb.x, selectedLimb.y, selectedLimb.z);
              targetPos.x += (Math.random() - 0.5) * 0.12;
              targetPos.y += (Math.random() - 0.5) * 0.12;
              targetPos.z += (Math.random() - 0.5) * 0.12;
            } else {
              // Target anywhere randomly across full height of the body
              targetPos = new THREE.Vector3(
                player.charPos.x + (Math.random() - 0.5) * 0.6,
                player.charPos.y + Math.random() * 1.8,
                player.charPos.z + (Math.random() - 0.5) * 0.6
              );
            }

            this.shoot(false, targetPos, soldier.ragdoll.id);
            // Cooldown resets to smaller values with higher intelligence
            soldier.shootCooldown = (1.5 - 1.2 * (this.intelligence / 100)) + Math.random() * 0.4;
          }
        } else if (dist > 30.0) {
          soldier.isAggro = false;
          soldier.ragdoll.isAiming = false;
          soldier.shootCooldown = 1.0;
        }
      } else {
        soldier.isAggro = false;
        soldier.ragdoll.isAiming = false;
      }

      if (!soldier.isAggro) {
        // Find nearest door or sound target
        let targetX = 0;
        let targetZ = 0;
        let hasTarget = false;

        if (soldier.ragdoll.heardSoundTarget) {
          targetX = soldier.ragdoll.heardSoundTarget.x;
          targetZ = soldier.ragdoll.heardSoundTarget.z;
          hasTarget = true;
        } else if (this.doors.length > 0) {
          let nearestDoor = null;
          let minD = Infinity;
          for (const d of this.doors) {
            const distToD = Math.sqrt(Math.pow(d.x - soldier.ragdoll.charPos.x, 2) + Math.pow(d.z - soldier.ragdoll.charPos.z, 2));
            if (distToD < minD) {
              minD = distToD;
              nearestDoor = d;
            }
          }
          if (nearestDoor && minD > 1.2) {
            targetX = nearestDoor.x;
            targetZ = nearestDoor.z;
            hasTarget = true;
          }
        }

        if (hasTarget) {
          const dx = targetX - soldier.ragdoll.charPos.x;
          const dz = targetZ - soldier.ragdoll.charPos.z;
          const distToTarget = Math.sqrt(dx * dx + dz * dz);
          const isPlayerTarget = (soldier.ragdoll.heardSoundTarget && player && Math.abs(targetX - player.charPos.x) < 3.0 && Math.abs(targetZ - player.charPos.z) < 3.0);
          const stopDist = isPlayerTarget ? 12.0 : 1.1;
          if (distToTarget > stopDist) {
            soldier.ragdoll.facingAngle = Math.atan2(dx, dz);
            // Walk towards target
            const intelFactor = 0.2 + 1.8 * (this.intelligence / 100);
            const speed = 2.4 * soldier.ragdoll.scale * intelFactor;
            soldier.ragdoll.charVel.x = Math.sin(soldier.ragdoll.facingAngle) * speed;
            soldier.ragdoll.charVel.z = Math.cos(soldier.ragdoll.facingAngle) * speed;
            soldier.ragdoll.charPos.x += soldier.ragdoll.charVel.x * dt;
            soldier.ragdoll.charPos.z += soldier.ragdoll.charVel.z * dt;
            soldier.ragdoll.walkCycle += dt * 6.5 * intelFactor;
          } else {
            soldier.ragdoll.heardSoundTarget = undefined;
            soldier.ragdoll.charVel.x = 0;
            soldier.ragdoll.charVel.z = 0;
          }
        } else {
          // No active targets, stand still.
          soldier.ragdoll.charVel.x = 0;
          soldier.ragdoll.charVel.z = 0;
        }
      }
    }
  }

  private updateDoors(dt: number) {
    for (const d of this.doors) {
      let characterClose = false;
      let nearestRagdoll: Ragdoll3D | null = null;
      let minDist = Infinity;

      for (const ragdoll of this.ragdolls) {
        if (!ragdoll.isAlive) continue;
        const dist = ragdoll.charPos.distanceTo(new THREE.Vector3(d.x, d.y, d.z));
        if (dist < minDist) {
          minDist = dist;
          nearestRagdoll = ragdoll;
        }
      }

      // Intelligence stat (0 to 100) governs door opening capability and speed
      const intelFactor = 0.1 + 1.9 * (this.intelligence / 100);

      if (nearestRagdoll && minDist < 2.8) {
        characterClose = true;
        // Target angle: open 90 degrees (Math.PI / 2) in ONLY ONE direction (unidirectional hinge)
        d.targetAngle = Math.PI / 2;

        // If intelligence is high (> 30), smart NPCs turn to face and push/strike door handle
        if (this.intelligence > 20 && !nearestRagdoll.isControlled) {
          const dx = d.x - nearestRagdoll.charPos.x;
          const dz = d.z - nearestRagdoll.charPos.z;
          nearestRagdoll.facingAngle = Math.atan2(dx, dz);
        }
      } else {
        d.targetAngle = 0; // Close door back to 0
      }

      const diff = d.targetAngle - d.currentAngle;
      if (Math.abs(diff) > 0.001) {
        // Speed scales with Intelligence: smarter = faster, more decisive door opening
        d.currentAngle += diff * Math.min(1.0, 4.5 * intelFactor * dt);
        // UNIDIRECTIONAL HINGE: strictly clamp between 0 (fully closed) and Math.PI / 2 (fully open in only one direction)
        d.currentAngle = Math.max(0, Math.min(Math.PI / 2, d.currentAngle));
        d.hingeGroup.rotation.y = d.currentAngle;
      }
    }
  }

  public clearMovingPlatforms() {
    for (const p of this.movingPlatforms) {
      this.scene.remove(p.mesh);
    }
    this.movingPlatforms = [];
  }

  public initDefaultMovingPlatforms() {
    if (this.movingPlatforms.length > 0) return;
    // 1. Leg-height fast sweeper platform oscillating along X axis
    // Sweeps at y=0.38m (shin & knee level) with high mass and rapid sweep motion
    this.spawnMovingPlatform(
      0,
      0.38,
      2.5,
      3.2,
      0.36,
      0.8,
      5.2,
      9.0,
      'x',
      'Barredora Cinética de Piernas',
      false
    );

    // 2. Torso-height cutting blade platform oscillating along X axis
    // Slices at y=1.32m (torso, extremities, head height), leaving painted sphere cuts and dismembering on complete slice
    this.spawnMovingPlatform(
      0,
      1.32,
      -8.0,
      3.2,
      0.28,
      0.8,
      4.8,
      9.0,
      'x',
      'Plataforma Cortadora a Altura de Torso',
      true
    );
  }

  public spawnMovingPlatform(
    x: number = 0,
    y: number = 0.38,
    z: number = 0,
    width: number = 3.2,
    height: number = 0.36,
    depth: number = 0.8,
    speed: number = 5.2,
    travelDistance: number = 9.0,
    axis: 'x' | 'z' = 'x',
    name: string = 'Barredora Cinética',
    isCutter: boolean = false
  ): MovingPlatform3D {
    const id = `plat_mov_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const group = new THREE.Group();
    group.name = id;

    // Main heavy block geometry
    const geom = new THREE.BoxGeometry(width, height, depth);

    // Hazard stripe procedural texture
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = isCutter ? '#dc2626' : '#f59e0b'; // Crimson hazard for cutter, Amber for sweeper
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#18181b'; // Dark hazard stripe
      for (let i = -128; i < 256; i += 32) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 32, 128);
        ctx.lineTo(i + 16, 128);
        ctx.lineTo(i - 16, 0);
        ctx.fill();
      }
    }
    const stripeTex = new THREE.CanvasTexture(canvas);
    stripeTex.wrapS = THREE.RepeatWrapping;
    stripeTex.wrapT = THREE.RepeatWrapping;
    stripeTex.repeat.set(3, 1);

    const mat = new THREE.MeshStandardMaterial({
      map: stripeTex,
      roughness: 0.35,
      metalness: 0.45,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // Top metal bumper strip
    const bumperGeom = new THREE.BoxGeometry(width + 0.05, 0.06, depth + 0.05);
    const bumperMat = new THREE.MeshStandardMaterial({
      color: 0x3f3f46,
      metalness: 0.8,
      roughness: 0.2,
    });
    const topBumper = new THREE.Mesh(bumperGeom, bumperMat);
    topBumper.position.y = height / 2;
    group.add(topBumper);

    if (isCutter) {
      // Razor-sharp steel laser cutter blade edge along perimeter
      const bladeGeom = new THREE.BoxGeometry(width + 0.12, 0.04, depth + 0.12);
      const bladeMat = new THREE.MeshStandardMaterial({
        color: 0xff1e56,
        emissive: 0xdc2626,
        emissiveIntensity: 0.8,
        metalness: 0.95,
        roughness: 0.1,
      });
      const bladeMesh = new THREE.Mesh(bladeGeom, bladeMat);
      bladeMesh.position.y = 0;
      group.add(bladeMesh);
    }

    // Warning lights on corners (pulsing red/orange)
    const lightGeom = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const lightMat = new THREE.MeshStandardMaterial({
      color: isCutter ? 0xff0044 : 0xef4444,
      emissive: isCutter ? 0xff0055 : 0xdc2626,
      emissiveIntensity: 0.95,
    });
    const offsets = [
      [-width / 2 + 0.1, 0, -depth / 2 + 0.1],
      [width / 2 - 0.1, 0, -depth / 2 + 0.1],
      [-width / 2 + 0.1, 0, depth / 2 - 0.1],
      [width / 2 - 0.1, 0, depth / 2 - 0.1],
    ];
    for (const [ox, oy, oz] of offsets) {
      const lMesh = new THREE.Mesh(lightGeom, lightMat);
      lMesh.position.set(ox, oy, oz);
      group.add(lMesh);
    }

    group.position.set(x, y, z);
    this.scene.add(group);

    const startX = axis === 'x' ? x - travelDistance : x;
    const targetX = axis === 'x' ? x + travelDistance : x;
    const startZ = axis === 'z' ? z - travelDistance : z;
    const targetZ = axis === 'z' ? z + travelDistance : z;

    const platform: MovingPlatform3D = {
      id,
      name,
      mesh: group,
      x,
      y,
      z,
      startX,
      startY: y,
      startZ,
      targetX,
      targetY: y,
      targetZ,
      width,
      height,
      depth,
      speed,
      progress: 0.5,
      direction: 1,
      vx: axis === 'x' ? speed : 0,
      vy: 0,
      vz: axis === 'z' ? speed : 0,
      mass: 850, // 850 kg heavy mass for high kinetic momentum
      hazardStripes: true,
      isCutter,
      cutProgress: new Map(),
    };

    this.movingPlatforms.push(platform);
    return platform;
  }

  public updateMovingPlatforms(dt: number) {
    for (const plat of this.movingPlatforms) {
      const totalDistX = plat.targetX - plat.startX;
      const totalDistZ = plat.targetZ - plat.startZ;
      const totalDist = Math.sqrt(totalDistX * totalDistX + totalDistZ * totalDistZ) || 1.0;

      plat.progress += (plat.speed / totalDist) * plat.direction * dt;

      if (plat.progress >= 1.0) {
        plat.progress = 1.0;
        plat.direction = -1;
      } else if (plat.progress <= 0.0) {
        plat.progress = 0.0;
        plat.direction = 1;
      }

      const prevX = plat.x;
      const prevY = plat.y;
      const prevZ = plat.z;

      plat.x = plat.startX + totalDistX * plat.progress;
      plat.y = plat.startY;
      plat.z = plat.startZ + totalDistZ * plat.progress;

      plat.vx = (plat.x - prevX) / Math.max(dt, 0.0001);
      plat.vy = 0;
      plat.vz = (plat.z - prevZ) / Math.max(dt, 0.0001);

      plat.mesh.position.set(plat.x, plat.y, plat.z);
    }
  }

  /**
   * Universal Kinetic Energy & Momentum Collision System
   * Handles dynamic impacts of moving platforms, dynamic props, and ragdolls.
   * Characters hit with high kinetic energy are violently knocked down into ragdoll state,
   * leg-swept, launched, damaged, and fractured.
   */
  private solveKineticCollisions(dt: number) {
    const restitution = 0.55;

    // A. Moving Platforms Kinetic Collisions against all ragdolls/humanoids
    for (const plat of this.movingPlatforms) {
      const platSpeed = Math.sqrt(plat.vx * plat.vx + plat.vy * plat.vy + plat.vz * plat.vz);
      const halfW = plat.width / 2;
      const halfH = plat.height / 2;
      const halfD = plat.depth / 2;

      for (const ragdoll of this.ragdolls) {
        if (ragdoll.isTentacle) continue;

        let maxOverlapVal = 0;
        let maxPart: Particle3D | null = null;
        let bestDx = 0, bestDy = 0, bestDz = 0;
        let bestOverlapX = 0, bestOverlapY = 0, bestOverlapZ = 0;

        for (const p of ragdoll.particles) {
          if (p.dismembered) continue;
          const pRad = p.radius || (p.boxDims ? Math.max(p.boxDims[0], p.boxDims[1], p.boxDims[2]) * 0.5 * ragdoll.scale : 0.18);

          const dx = p.x - plat.x;
          const dy = p.y - plat.y;
          const dz = p.z - plat.z;

          const overlapX = (halfW + pRad) - Math.abs(dx);
          const overlapY = (halfH + pRad) - Math.abs(dy);
          const overlapZ = (halfD + pRad) - Math.abs(dz);

          if (overlapX > 0 && overlapY > 0 && overlapZ > 0) {
            const minOv = Math.min(overlapX, overlapY, overlapZ);
            if (minOv > maxOverlapVal) {
              maxOverlapVal = minOv;
              maxPart = p;
              bestDx = dx; bestDy = dy; bestDz = dz;
              bestOverlapX = overlapX; bestOverlapY = overlapY; bestOverlapZ = overlapZ;
            }

            // Custom Cutter Logic for Limbs & Head of NPCs
            if (plat.isCutter) {
              const nameLower = p.name.toLowerCase();
              const isExtremityOrHead = 
                nameLower.includes('brazo') || nameLower.includes('codo') || nameLower.includes('antebrazo') ||
                nameLower.includes('muneca') || nameLower.includes('mano') || nameLower.includes('dedo') ||
                nameLower.includes('hombro') ||
                nameLower.includes('muslo') || nameLower.includes('rodilla') || nameLower.includes('antepierna') ||
                nameLower.includes('tobillo') || nameLower.includes('pie') ||
                nameLower.includes('cabeza') || nameLower.includes('cuello');

              if (isExtremityOrHead) {
                if (!plat.cutProgress) {
                  plat.cutProgress = new Map();
                }
                const key = `${ragdoll.id}_${p.name}`;
                let entry = plat.cutProgress.get(key);
                if (!entry) {
                  entry = { progress: 0, lastSphereTime: 0, spheresCount: 0 };
                  plat.cutProgress.set(key, entry);
                }

                if (entry.progress < 1.0) {
                  // Speed of cutting progress: sever a limb in 0.8 seconds (1.2 per sec)
                  entry.progress = Math.min(1.0, entry.progress + 1.2 * dt);

                  // Spawning red spheres continuously during contact to visualize progress
                  const nowMs = performance.now();
                  if (nowMs - entry.lastSphereTime > 40) { // throttle slightly for aesthetics & performance
                    entry.lastSphereTime = nowMs;
                    entry.spheresCount++;

                    // Destroy voxel blocks at the contact point on the colliding limb p
                    const localHit = p.mesh ? p.mesh.worldToLocal(new THREE.Vector3(p.x, p.y, p.z)) : new THREE.Vector3(0, 0, 0);
                    const destroyed = destroyLimbVoxelsAtPoint(p, localHit, 0.22);

                    if (destroyed && destroyed.length > 0) {
                      ragdoll.stats.destroyedBlocks = (ragdoll.stats.destroyedBlocks || 0) + destroyed.length;
                      soundEngine.playVoxelDestroy();
                      for (const b of destroyed) {
                        this.spawnVoxelDebris(
                          p.x + b.localPos.x,
                          p.y + b.localPos.y,
                          p.z + b.localPos.z,
                          0x881337, // Dark blood color
                          6
                        );
                      }

                      // Paint cut wound onto skin/cylinder and whole anatomy using the paint system ("este sistema funcione con plataforma qud corta tambien")
                      paintWoundOnParticleAndAnatomy(p, new THREE.Vector3(p.x, p.y, p.z), false, 32);

                      // Add deeper interconnected wound spheres inward into the cut limb
                      addConnectedWoundSpheresToLimb(p, localHit, new THREE.Vector3(0, -1, 0), 0.07);

                      // Mark particle and adjacent particles/bridges for deforming
                      p.needsCylinderDeform = true;
                      for (const c of ragdoll.constraints) {
                        if (c.p1 === p || c.p2 === p) {
                          c.p1.needsCylinderDeform = true;
                          c.p2.needsCylinderDeform = true;
                        }
                      }
                      if (ragdoll.jointBridges) {
                        for (const bridge of ragdoll.jointBridges) {
                          const c = bridge.userData.constraint;
                          if (c && (c.p1 === p || c.p2 === p)) {
                            bridge.userData.needsDeform = true;
                            applyHoleMorphToMesh(bridge);
                          }
                        }
                      }
                      if (p.contourMesh instanceof THREE.Mesh) {
                        applySphericalMorph(p.contourMesh, ragdoll.sphericalContourLevel, p, ragdoll);
                      }
                    }

                    // Spawn small blood spurts too
                    this.spawnBloodChorro3D(p.x, p.y, p.z, new THREE.Vector3((Math.random() - 0.5) * 1.5, 1.2, (Math.random() - 0.5) * 1.5), 1);
                  }

                  if (entry.progress >= 1.0) {
                    // SEVER THE LIMB!
                    this.dismemberParticleChain(ragdoll, p);
                    ragdoll.stats.dismemberedLimbs++;
                    soundEngine.playBodyHit();
                    this.spawnBloodBurst3D(p.x, p.y, p.z, 8);
                  }
                }
              }
            }
          }
        }

        if (maxPart && maxOverlapVal > 0) {
          const p = maxPart;
          const dx = bestDx, dy = bestDy, dz = bestDz;
          const overlapX = bestOverlapX, overlapY = bestOverlapY, overlapZ = bestOverlapZ;

          // Penetration detected!
          const pVx = (p.x - p.oldX) / Math.max(dt, 0.001);
          const pVy = (p.y - p.oldY) / Math.max(dt, 0.001);
          const pVz = (p.z - p.oldZ) / Math.max(dt, 0.001);

          const relVx = plat.vx - pVx;
          const relVy = plat.vy - pVy;
          const relVz = plat.vz - pVz;
          const relSpeedSq = relVx * relVx + relVy * relVy + relVz * relVz;
          const relSpeed = Math.sqrt(relSpeedSq);

          // Kinetic energy of the impact: Ek = 0.5 * m * v^2
          const kineticEnergy = 0.5 * plat.mass * relSpeedSq;
          const isLegHeightHit = p.y < 0.65 || p.name.includes('pie') || p.name.includes('tobillo') || p.name.includes('tibia') || p.name.includes('antepierna') || p.name.includes('rodilla');

          // Push particle out of penetration along minimum penetration axis
          let shiftX = 0;
          let shiftY = 0;
          let shiftZ = 0;

          if (overlapY <= overlapX && overlapY <= overlapZ) {
            shiftY = Math.sign(dy) * overlapY;
          } else if (overlapX <= overlapZ) {
            shiftX = Math.sign(dx) * overlapX;
          } else {
            shiftZ = Math.sign(dz) * overlapZ;
          }

          // Move the WHOLE ragdoll uniformly out of platform penetration to preserve skeleton & tendons
          for (const part of ragdoll.particles) {
            if (part.dismembered) continue;
            part.x += shiftX;
            part.y += shiftY;
            part.z += shiftZ;
            part.oldX += shiftX;
            part.oldY += shiftY;
            part.oldZ += shiftZ;
          }
          if (ragdoll.charPos) {
            ragdoll.charPos.x += shiftX;
            ragdoll.charPos.y += shiftY;
            ragdoll.charPos.z += shiftZ;
          }

          // Platform only separates position overlap (no velocity push / no slinging)
          // Calculate impact strength from platform velocity, platform mass, and platform size on X and Y:
          const platAreaXY = Math.max(0.1, plat.width * plat.height);
          const massFactor = plat.mass / 20.0;
          const impactStrength = platSpeed * Math.sqrt(platAreaXY) * massFactor;

          if (platSpeed > 0.05 || impactStrength > 0.02) {
            if (ragdoll.isAlive || ragdoll.isWalkingRagdoll) {
              // Activate the normal ragdoll state by collapsing it in the direction of platform impact
              this.collapseRagdoll(ragdoll, new THREE.Vector3(plat.vx, plat.vy, plat.vz), dt);
            } else {
              // If already collapsed, push the particles to slide smoothly with the platform velocity
              const pushFactor = 0.85;
              for (const part of ragdoll.particles) {
                if (part.dismembered) continue;
                part.oldX = part.x - (part.vx * 0.15 + plat.vx * pushFactor) * dt;
                part.oldY = part.y - (part.vy * 0.15 + Math.max(0, plat.vy * pushFactor)) * dt;
                part.oldZ = part.z - (part.vz * 0.15 + plat.vz * pushFactor) * dt;
              }
            }

            // Quick anatomical localized constraint solver pass specifically for this ragdoll to prevent stretching or glitched frames when pushed by the platform
            for (let iter = 0; iter < 4; iter++) {
              for (const c of ragdoll.constraints) {
                if (c.broken) continue;
                const p1 = c.p1;
                const p2 = c.p2;
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const dz = p2.z - p1.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (dist > 0.0001) {
                  const diff = (dist - c.length) / dist;
                  const p1Ratio = p1.pinned ? 0 : 0.5;
                  const p2Ratio = p2.pinned ? 0 : 0.5;
                  if (!p1.pinned) {
                    p1.x += dx * diff * p1Ratio;
                    p1.y += dy * diff * p1Ratio;
                    p1.z += dz * diff * p1Ratio;
                  }
                  if (!p2.pinned) {
                    p2.x -= dx * diff * p2Ratio;
                    p2.y -= dy * diff * p2Ratio;
                    p2.z -= dz * diff * p2Ratio;
                  }
                }
              }
            }

            if (platSpeed > 1.2 || impactStrength > 1.5) {
              soundEngine.playBodyHit();
              this.spawnBloodChorro3D(p.x, p.y, p.z, new THREE.Vector3(0, 0.5, 0), 2);
            }
          }
        }
      }
    }

    // B. Dynamic Props & Thrown Objects Kinetic Collisions against all Ragdolls
    for (let i = 0; i < this.ragdolls.length; i++) {
      const objA = this.ragdolls[i];
      if (objA.isControlled) continue;
      // Ragdoll limbs do not collide with other ragdoll limbs (only props/vehicles/projectiles collide with ragdolls)
      if (!(objA as any).isProp && !(objA as any).isVehicle) continue;

      for (let j = 0; j < this.ragdolls.length; j++) {
        if (i === j) continue;
        const targetRagdoll = this.ragdolls[j];

        // Check particle-to-particle kinetic collisions between ragdolls
        for (const pA of objA.particles) {
          if (pA.dismembered) continue;
          const vAx = (pA.x - pA.oldX) / Math.max(dt, 0.001);
          const vAy = (pA.y - pA.oldY) / Math.max(dt, 0.001);
          const vAz = (pA.z - pA.oldZ) / Math.max(dt, 0.001);
          const speedSqA = vAx * vAx + vAy * vAy + vAz * vAz;
          if (speedSqA < 4.0) continue; // Only fast-moving particles

          for (const pB of targetRagdoll.particles) {
            if (pB.dismembered) continue;
            const distSq = (pA.x - pB.x) ** 2 + (pA.y - pB.y) ** 2 + (pA.z - pB.z) ** 2;
            const radSum = (pA.radius || 0.2) + (pB.radius || 0.2);

            if (distSq < radSum * radSum) {
              const dist = Math.sqrt(distSq) || 0.01;
              const normX = (pB.x - pA.x) / dist;
              const normY = (pB.y - pA.y) / dist;
              const normZ = (pB.z - pA.z) / dist;

              const vBx = (pB.x - pB.oldX) / Math.max(dt, 0.001);
              const vBy = (pB.y - pB.oldY) / Math.max(dt, 0.001);
              const vBz = (pB.z - pB.oldZ) / Math.max(dt, 0.001);

              const relVx = vAx - vBx;
              const relVy = vAy - vBy;
              const relVz = vAz - vBz;
              const relSpeedSq = relVx * relVx + relVy * relVy + relVz * relVz;

              // Kinetic energy transfer
              const kineticEnergy = 0.5 * pA.mass * relSpeedSq;
              if (kineticEnergy > 25) {
                const reducedMass = (pA.mass * pB.mass) / (pA.mass + pB.mass);
                const impulseMagnitude = (1 + restitution) * reducedMass * Math.sqrt(relSpeedSq);

                const impulseX = impulseMagnitude * normX;
                const impulseY = impulseMagnitude * normY;
                const impulseZ = impulseMagnitude * normZ;

                // Apply impulse to target particle
                pB.oldX -= (impulseX / pB.mass) * dt;
                pB.oldY -= (impulseY / pB.mass) * dt;
                pB.oldZ -= (impulseZ / pB.mass) * dt;

                // Action-reaction on striking particle
                pA.oldX += (impulseX / pA.mass) * dt * 0.6;
                pA.oldY += (impulseY / pA.mass) * dt * 0.6;
                pA.oldZ += (impulseZ / pA.mass) * dt * 0.6;

                // Trigger stagger recoil on target if walking
                if (targetRagdoll.isWalkingRagdoll || targetRagdoll.isAlive) {
                  targetRagdoll.wasWalkingRagdollBeforeHit = targetRagdoll.isWalkingRagdoll;
                  targetRagdoll.hitStaggerTimer = 0.5 + Math.min(1.0, kineticEnergy / 200);
                  targetRagdoll.tripTimer = targetRagdoll.hitStaggerTimer;
                }

                if (kineticEnergy > 70) {
                  soundEngine.playBodyHit();
                  this.spawnBloodChorro3D(pB.x, pB.y, pB.z, new THREE.Vector3(normX, normY + 0.3, normZ), 3);
                  const dmg = Math.min(60, Math.sqrt(kineticEnergy) * 1.4);
                  pB.health = Math.max(0, pB.health - dmg);
                  targetRagdoll.totalHealth = Math.max(0, targetRagdoll.totalHealth - dmg);
                }
              }
            }
          }
        }
      }
    }
  }

  private updateHearingSystem(dt: number) {
    for (const ragdoll of this.ragdolls) {
      if (!ragdoll.isAlive) continue;

      if (!ragdoll.heardSoundIds) {
        ragdoll.heardSoundIds = new Set<string>();
      }

      // Check if any sound wave has expanded to reach the ears of this ragdoll
      for (const wave of this.soundWaves) {
        if (ragdoll.heardSoundIds.has(wave.id)) continue;

        const cabeza = ragdoll.particles.find((p) => p.name === 'cabeza');
        if (!cabeza) continue;

        let leftEarWorld = new THREE.Vector3();
        let rightEarWorld = new THREE.Vector3();

        if (cabeza.hearingSphereLeftMesh && cabeza.hearingSphereRightMesh) {
          cabeza.hearingSphereLeftMesh.getWorldPosition(leftEarWorld);
          cabeza.hearingSphereRightMesh.getWorldPosition(rightEarWorld);
        } else {
          leftEarWorld.set(cabeza.x, cabeza.y, cabeza.z);
          rightEarWorld.set(cabeza.x, cabeza.y, cabeza.z);
        }

        const distL = leftEarWorld.distanceTo(wave.origin);
        const distR = rightEarWorld.distanceTo(wave.origin);
        const minDist = Math.min(distL, distR);

        // Modulate NPC hearing sensitivity based on global Oido setting (0.01 to 2.0x range)
        const hearingFactor = 0.01 + 1.99 * (this.hearing / 100);

        // Individual ear hearing range radius is 0.35 * scale
        if (wave.radius * hearingFactor >= minDist - 0.35 * ragdoll.scale) {
          ragdoll.heardSoundIds.add(wave.id);

          // Mark that they heard it and set target to the sound source origin
          ragdoll.heardSoundTarget = wave.origin.clone();
          ragdoll.heardSoundTimer = 6.0; // Investigate sound for 6s

          // Flash BOTH their left and right hearing spheres as active/listening
          const flashSphere = (sphere: THREE.Mesh | undefined) => {
            if (!sphere) return;
            const mat = sphere.material as THREE.MeshBasicMaterial;
            if (mat) {
              mat.color.set(0xef4444); // Alert red when hearing a sound!
              mat.opacity = 0.55;
              setTimeout(() => {
                if (mat) {
                  mat.color.set(0x10b981); // Emerald green
                  mat.opacity = 0.15;
                }
              }, 700);
            }
          };

          flashSphere(cabeza.hearingSphereLeftMesh);
          flashSphere(cabeza.hearingSphereRightMesh);
        }
      }

      // Decrement the timer
      if (ragdoll.heardSoundTimer !== undefined && ragdoll.heardSoundTimer > 0) {
        ragdoll.heardSoundTimer -= dt;
        if (ragdoll.heardSoundTimer <= 0) {
          ragdoll.heardSoundTarget = undefined;
        }
      }
    }
  }

  private updateZombies(dt: number) {
    const zombies = this.ragdolls.filter((r) => r.isZombie && (r.isAlive || r.isWalkingRagdoll));
    if (zombies.length === 0) return;

    for (const zombie of zombies) {
      // Find nearest living non-zombie humanoid/tentacle/player to target
      let nearestTarget: Ragdoll3D | null = null;
      let minDist = 25.0;

      for (const other of this.ragdolls) {
        if (other.id === zombie.id || other.isZombie || !other.isAlive) continue;
        const dist = zombie.charPos.distanceTo(other.charPos);
        if (dist < minDist) {
          minDist = dist;
          nearestTarget = other;
        }
      }

      if (nearestTarget) {
        // Find closest active limb on victim
        const activeLimbs = nearestTarget.particles.filter((p) => !p.dismembered && p.health > 0);
        let closestLimb: Particle3D | null = null;
        let closestLimbDist = Infinity;
        for (const limb of activeLimbs) {
          const ldx = limb.x - zombie.charPos.x;
          const ldy = limb.y - (zombie.charPos.y + 1.45);
          const ldz = limb.z - zombie.charPos.z;
          const dSq = ldx * ldx + ldy * ldy + ldz * ldz;
          if (dSq < closestLimbDist) {
            closestLimbDist = dSq;
            closestLimb = limb;
          }
        }

        // GRAB MECHANIC DECISION
        zombie.zombieGrabDecisionTimer = (zombie.zombieGrabDecisionTimer || 0) - dt;
        if (minDist < 2.5) {
          if (!zombie.zombieGrabbedTargetId || zombie.zombieGrabDecisionTimer <= 0) {
            zombie.zombieGrabDecisionTimer = 1.8; // Decide every 1.8 seconds

            if (activeLimbs.length > 0) {
              // 70% chance to target the closest limb, 30% chance to target a distant limb
              const pickDistant = Math.random() < 0.35 && activeLimbs.length > 1;
              let selectedLimb = closestLimb;

              if (pickDistant && closestLimb) {
                const nonClosest = activeLimbs.filter((l) => l.name !== closestLimb.name);
                if (nonClosest.length > 0) {
                  selectedLimb = nonClosest[Math.floor(Math.random() * nonClosest.length)];
                }
              }

              if (selectedLimb) {
                zombie.zombieGrabbedTargetId = nearestTarget.id;
                zombie.zombieGrabbedLimbName = selectedLimb.name;
              }
            }
          }
        } else {
          // Reset grab if they are too far away
          zombie.zombieGrabbedTargetId = undefined;
          zombie.zombieGrabbedLimbName = undefined;
        }

        // Set targeting target for visual arm stretching
        if (zombie.zombieGrabbedTargetId && zombie.zombieGrabbedLimbName) {
          const grabbedLimbPart = nearestTarget.particles.find((p) => p.name === zombie.zombieGrabbedLimbName);
          if (grabbedLimbPart && !grabbedLimbPart.dismembered) {
            zombie.zombieTargetLimbPos = new THREE.Vector3(grabbedLimbPart.x, grabbedLimbPart.y, grabbedLimbPart.z);
            zombie.zombieTargetLimbName = grabbedLimbPart.name;
          } else {
            // Grab broken
            zombie.zombieGrabbedTargetId = undefined;
            zombie.zombieGrabbedLimbName = undefined;
            if (closestLimb) {
              zombie.zombieTargetLimbPos = new THREE.Vector3(closestLimb.x, closestLimb.y, closestLimb.z);
              zombie.zombieTargetLimbName = closestLimb.name;
            }
          }
        } else if (closestLimb) {
          zombie.zombieTargetLimbPos = new THREE.Vector3(closestLimb.x, closestLimb.y, closestLimb.z);
          zombie.zombieTargetLimbName = closestLimb.name;
        } else {
          zombie.zombieTargetLimbPos = new THREE.Vector3(nearestTarget.charPos.x, nearestTarget.charPos.y + 1.2, nearestTarget.charPos.z);
          zombie.zombieTargetLimbName = undefined;
        }

        // PHYSICAL DRAGGING EFFECT:
        if (zombie.zombieGrabbedTargetId && zombie.zombieGrabbedLimbName) {
          const grabbedLimbPart = nearestTarget.particles.find((p) => p.name === zombie.zombieGrabbedLimbName);
          if (grabbedLimbPart && !grabbedLimbPart.dismembered) {
            // Apply real dynamic pulling force between zombie and victim!
            const pullDir = new THREE.Vector3(zombie.charPos.x - nearestTarget.charPos.x, 0, zombie.charPos.z - nearestTarget.charPos.z);
            const pullDist = pullDir.length();
            if (pullDist > 0.7) {
              pullDir.normalize();
              const force = 1.6 * dt; // Strong, realistic pulling drag force
              nearestTarget.charPos.addScaledVector(pullDir, force);
              nearestTarget.charVel.addScaledVector(pullDir, force * 6.0);
              zombie.charVel.addScaledVector(pullDir, -force * 2.5);
            }
          }
        }

        // Rotate to face and chase target
        const dx = nearestTarget.charPos.x - zombie.charPos.x;
        const dz = nearestTarget.charPos.z - zombie.charPos.z;
        const targetAngle = Math.atan2(dx, dz);

        let angleDiff = targetAngle - zombie.facingAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        zombie.facingAngle += angleDiff * Math.min(1.0, 9.0 * dt);

        // Play random zombie groans while active
        if (Math.random() < 0.015) {
          soundEngine.playZombieGroan();
        }

        // Move toward victim - NO automatic biting or damaging on approach
        if (minDist > 0.95) {
          const moveSpeed = 3.8;
          zombie.charVel.x = Math.sin(zombie.facingAngle) * moveSpeed;
          zombie.charVel.z = Math.cos(zombie.facingAngle) * moveSpeed;
          zombie.charPos.x += zombie.charVel.x * dt;
          zombie.charPos.z += zombie.charVel.z * dt;
          zombie.walkCycle += dt * 8.5;
        } else {
          zombie.charVel.x *= 0.5;
          zombie.charVel.z *= 0.5;
        }

        // Animate jaw on zombie's head
        const cabeza = zombie.particles.find((p) => p.name === 'cabeza');
        if (cabeza && cabeza.voxelsGroup) {
          const jawGroup = cabeza.voxelsGroup.getObjectByName('ZombieJawGroup') as THREE.Group | undefined;
          if (jawGroup) {
            const chompSpeed = zombie.zombieGrabbedTargetId ? 0.024 : 0.016;
            const biteChomp = Math.sin(performance.now() * chompSpeed) * 0.04;
            jawGroup.position.y = -0.06 + Math.abs(biteChomp);
            jawGroup.rotation.x = Math.abs(biteChomp) * 2.8;
          }
        }

        // Note: As requested, the zombie approaches without dealing any damage. Biting damage-on-approach is removed.
      } else if (zombie.heardSoundTarget) {
        // Rotate and move towards heard sound target!
        const dx = zombie.heardSoundTarget.x - zombie.charPos.x;
        const dz = zombie.heardSoundTarget.z - zombie.charPos.z;
        const distToSound = Math.sqrt(dx * dx + dz * dz);

        if (distToSound > 1.2) {
          const targetAngle = Math.atan2(dx, dz);
          let angleDiff = targetAngle - zombie.facingAngle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          zombie.facingAngle += angleDiff * Math.min(1.0, 9.0 * dt);

          const moveSpeed = 2.4; // Investigation slow walk
          zombie.charVel.x = Math.sin(zombie.facingAngle) * moveSpeed;
          zombie.charVel.z = Math.cos(zombie.facingAngle) * moveSpeed;
          zombie.charPos.x += zombie.charVel.x * dt;
          zombie.charPos.z += zombie.charVel.z * dt;
          zombie.walkCycle += dt * 6.0;

          if (Math.random() < 0.005) {
            soundEngine.playZombieGroan();
          }
        } else {
          // Reached sound target! Clear it.
          zombie.heardSoundTarget = undefined;
          zombie.charVel.x = 0;
          zombie.charVel.z = 0;
        }
      } else {
        zombie.charVel.x *= 0.8;
        zombie.charVel.z *= 0.8;
        zombie.zombieGrabbedTargetId = undefined;
        zombie.zombieGrabbedLimbName = undefined;
      }
    }
  }

  private updateWerewolves(dt: number) {
    const werewolves = this.ragdolls.filter((r) => r.isWerewolf && (r.isAlive || r.isWalkingRagdoll));
    if (werewolves.length === 0) return;

    for (const werewolf of werewolves) {
      // Find nearest living non-werewolf humanoid/player to attack
      let nearestTarget: Ragdoll3D | null = null;
      let minDist = 30.0;

      for (const other of this.ragdolls) {
        if (other.id === werewolf.id || other.isWerewolf || (!other.isAlive && !other.isWalkingRagdoll && other.isCollapsed)) continue;
        const dist = werewolf.charPos.distanceTo(other.charPos);
        if (dist < minDist) {
          minDist = dist;
          nearestTarget = other;
        }
      }

      if (nearestTarget) {
        // Rotate to face and chase target
        const dx = nearestTarget.charPos.x - werewolf.charPos.x;
        const dz = nearestTarget.charPos.z - werewolf.charPos.z;
        const targetAngle = Math.atan2(dx, dz);

        let angleDiff = targetAngle - werewolf.facingAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        werewolf.facingAngle += angleDiff * Math.min(1.0, 10.0 * dt);

        // Move toward victim at high, terrifying speed (werewolf sprint!)
        if (minDist > 1.2) {
          const moveSpeed = 5.8;
          werewolf.charVel.x = Math.sin(werewolf.facingAngle) * moveSpeed;
          werewolf.charVel.z = Math.cos(werewolf.facingAngle) * moveSpeed;
          werewolf.charPos.x += werewolf.charVel.x * dt;
          werewolf.charPos.z += werewolf.charVel.z * dt;
          werewolf.walkCycle += dt * 12.0; // Rapid wild movement animation
        } else {
          werewolf.charVel.x *= 0.5;
          werewolf.charVel.z *= 0.5;
        }

        // Bite/Claw Attack when close (< 1.9m)
        werewolf.werewolfBiteCooldown = (werewolf.werewolfBiteCooldown || 0) - dt;
        if (minDist < 1.9 && werewolf.werewolfBiteCooldown <= 0) {
          werewolf.werewolfBiteCooldown = 1.8; // Attack every 1.8 seconds (slower punch frequency)

          // Toggle which arm is punching for alternating left/right strikes!
          werewolf.punchLeftArm = !werewolf.punchLeftArm;
          // Trigger visual punch lunge action (1.2s is a slower, heavier punch animation)
          werewolf.punchTimer = 1.2;

          // Sound trigger: play werewolf claw/growl sound
          soundEngine.playZombieGroan();

          // Strike nearest limb in front of werewolf claws
          const activeLimbs = nearestTarget.particles.filter((p) => !p.dismembered && p.health > 0);
          if (activeLimbs.length > 0) {
            // Pick torso/chest/head preferentially or nearest limb in front of claws
            let hitLimb = activeLimbs[0];
            let bestScore = -Infinity;
            for (const p of activeLimbs) {
              let score = 0;
              if (p.name === 'pechobase' || p.name === 'torso') score += 6;
              if (p.name === 'cabeza') score += 5;
              if (p.name === 'ombligo' || p.name === 'pelvis') score += 4;
              score -= Math.abs(p.y - (werewolf.charPos.y + 1.4));
              if (score > bestScore) {
                bestScore = score;
                hitLimb = p;
              }
            }

            // Direction and Force of the werewolf strike
            const strikeDir = new THREE.Vector3(
              Math.sin(werewolf.facingAngle),
              0.40,
              Math.cos(werewolf.facingAngle)
            ).normalize();

            // Slower, much lower push force (very small push/knockback force)
            const werewolfPower = 4.2 + Math.min(2.0, werewolf.charVel.length() * 0.4);

            // 1. Where it strikes, create a real hole (missing blocks like a bullet wound)
            const worldHit = new THREE.Vector3(hitLimb.x, hitLimb.y, hitLimb.z);
            const localHit = hitLimb.mesh ? hitLimb.mesh.worldToLocal(worldHit.clone()) : new THREE.Vector3(0, 0, 0);
            const localRayDir = hitLimb.mesh
              ? strikeDir.clone().applyQuaternion(hitLimb.mesh.quaternion.clone().invert()).normalize()
              : strikeDir.clone();

            const penetration = destroyLimbVoxelsAlongRay(hitLimb, localHit, localRayDir, 0.32, 1.4);
            const { destroyed, entryLocal, exitLocal } = penetration;

            if (destroyed.length > 0) {
              nearestTarget.stats.destroyedBlocks = (nearestTarget.stats.destroyedBlocks || 0) + destroyed.length;
              soundEngine.playVoxelDestroy();
              for (const b of destroyed) {
                this.spawnVoxelDebris(
                  hitLimb.x + b.localPos.x,
                  hitLimb.y + b.localPos.y,
                  hitLimb.z + b.localPos.z,
                  0x881337,
                  6
                );
              }
            }

            // Recalculate 3D contour morph to physically sink into a cavity/hole where blocks were removed
            if (hitLimb.contourMesh instanceof THREE.Mesh) {
              applySphericalMorph(hitLimb.contourMesh, nearestTarget.sphericalContourLevel, hitLimb, nearestTarget);
            }

            // Spawn dynamic wound blood jet and blood splash on hit
            const worldEntry = hitLimb.mesh ? hitLimb.mesh.localToWorld(entryLocal.clone()) : worldHit.clone();
            this.spawnBloodChorro3D(worldEntry.x, worldEntry.y, worldEntry.z, strikeDir.clone(), 7);

            this.woundBloodJets.push({
              id: 'jet_wolf_' + Math.random().toString(36).substring(2, 9),
              ragdollId: nearestTarget.id,
              particleName: hitLimb.name,
              localPos: entryLocal.clone(),
              localDir: localRayDir.clone().negate(),
              timeLeft: 2.5,
              accumulator: 0,
            });

            hitLimb.health -= 55;
            if (this.isGodMode && nearestTarget.isControlled) {
              nearestTarget.totalHealth = 240;
            } else {
              nearestTarget.totalHealth -= 35;
            }

            if (hitLimb.health <= 0 && hitLimb.name !== 'torso' && hitLimb.name !== 'pechobase' && hitLimb.name !== 'pelvis') {
              hitLimb.dismembered = true;
              nearestTarget.stats.dismemberedLimbs++;
            }

            // GOLPE DE HOMBRE LOBO: Golpe ragdoll con dirección y fuerza de empuje (reducido significativamente)
            const pushSpeed = werewolfPower;
            const liftSpeed = 1.5; // Very small upward lift
            const strikeImpulse = new THREE.Vector3(
              strikeDir.x * pushSpeed,
              liftSpeed,
              strikeDir.z * pushSpeed
            );

            // Collapse victim into physics ragdoll with massive directional momentum
            this.collapseRagdoll(nearestTarget, strikeImpulse);
            for (const p of nearestTarget.particles) {
              p.vx += strikeImpulse.x;
              p.vy += strikeImpulse.y;
              p.vz += strikeImpulse.z;
              p.oldX = p.x - p.vx * 0.016;
              p.oldY = p.y - p.vy * 0.016;
              p.oldZ = p.z - p.vz * 0.016;
            }

            soundEngine.playBoneSnap();
            soundEngine.playBloodSplatter();

            if (nearestTarget.totalHealth <= 0 && (!this.isGodMode || !nearestTarget.isControlled)) {
              this.killCharacter(nearestTarget.id, strikeImpulse);
            }
          }
        }
      } else if (werewolf.heardSoundTarget) {
        // Rotate and sprint towards heard sound target!
        const dx = werewolf.heardSoundTarget.x - werewolf.charPos.x;
        const dz = werewolf.heardSoundTarget.z - werewolf.charPos.z;
        const distToSound = Math.sqrt(dx * dx + dz * dz);

        if (distToSound > 1.2) {
          const targetAngle = Math.atan2(dx, dz);
          let angleDiff = targetAngle - werewolf.facingAngle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          werewolf.facingAngle += angleDiff * Math.min(1.0, 10.0 * dt);

          const moveSpeed = 4.8; // Terrifying quick investigation sprint!
          werewolf.charVel.x = Math.sin(werewolf.facingAngle) * moveSpeed;
          werewolf.charVel.z = Math.cos(werewolf.facingAngle) * moveSpeed;
          werewolf.charPos.x += werewolf.charVel.x * dt;
          werewolf.charPos.z += werewolf.charVel.z * dt;
          werewolf.walkCycle += dt * 10.0;
        } else {
          // Reached sound target! Clear it.
          werewolf.heardSoundTarget = undefined;
          werewolf.charVel.x = 0;
          werewolf.charVel.z = 0;
        }
      } else {
        werewolf.charVel.x *= 0.8;
        werewolf.charVel.z *= 0.8;
      }
    }
  }

  private updateHotNPCs(dt: number) {
    const hotNPCs = this.ragdolls.filter(
      (r) => (r.isWerewolfHot || r.isDummyHot) && (r.isAlive || r.isWalkingRagdoll)
    );

    const activeGrabIds = new Set<string>();

    if (hotNPCs.length > 0) {
      for (const npc of hotNPCs) {
        // Find nearest living non-self humanoid target
        let nearestTarget: Ragdoll3D | null = null;
        let minDist = 35.0;

        for (const other of this.ragdolls) {
          if (other.id === npc.id || (!other.isAlive && !other.isWalkingRagdoll && other.isCollapsed)) continue;
          const dist = npc.charPos.distanceTo(other.charPos);
          if (dist < minDist) {
            minDist = dist;
            nearestTarget = other;
          }
        }

        if (!nearestTarget) {
          npc.charVel.x *= 0.8;
          npc.charVel.z *= 0.8;
          npc.hotGrabTargetId = undefined;
          continue;
        }

        // Rotate smoothly to face target
        const dx = nearestTarget.charPos.x - npc.charPos.x;
        const dz = nearestTarget.charPos.z - npc.charPos.z;
        const targetAngle = Math.atan2(dx, dz);

        let angleDiff = targetAngle - npc.facingAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        npc.facingAngle += angleDiff * Math.min(1.0, 11.0 * dt);

        // Approach target at active stride
        const isCurrentlyGrabbing = npc.hotGrabTargetId === nearestTarget.id;
        const releaseThreshold = isCurrentlyGrabbing ? 1.8 : 0.85;

        if (minDist > releaseThreshold) {
          const moveSpeed = npc.isWerewolfHot ? 5.2 : 3.8;
          npc.charVel.x = Math.sin(npc.facingAngle) * moveSpeed;
          npc.charVel.z = Math.cos(npc.facingAngle) * moveSpeed;
          npc.charPos.x += npc.charVel.x * dt;
          npc.charPos.z += npc.charVel.z * dt;
          npc.walkCycle += dt * 9.0;
          npc.hotGrabTargetId = undefined;
        } else {
          // In intimate contact range: clasp hands onto target contours/limbs and align pelvis/genitals
          npc.hotGrabTargetId = nearestTarget.id;
          activeGrabIds.add(npc.id);
          activeGrabIds.add(nearestTarget.id);

          // Trigger facial pleasure/blush feedback during intimate interaction
          if ((nearestTarget as any).faceData) {
            (nearestTarget as any).faceData.blushTimer = Math.max((nearestTarget as any).faceData.blushTimer, 3.0);
            (nearestTarget as any).faceData.blushLevel = Math.min(1.0, ((nearestTarget as any).faceData.blushLevel ?? 0) + dt * 0.5);
            (nearestTarget as any).faceData.pleasureVariant = ((nearestTarget as any).faceData.pleasureVariant ?? 0);
          }
          if ((npc as any).faceData) {
            (npc as any).faceData.blushTimer = Math.max((npc as any).faceData.blushTimer, 3.0);
            (npc as any).faceData.blushLevel = Math.min(1.0, ((npc as any).faceData.blushLevel ?? 0) + dt * 0.5);
          }

          // Run Autonomous AI Emotional Thinking Engine & Pose Transition Solver
          updateHotNPCAIEngine(npc, nearestTarget, dt);
          applyHotNPCPose(npc, nearestTarget, dt);

          // Apply physical pull force between their positions
          const pullDir = new THREE.Vector3(npc.charPos.x - nearestTarget.charPos.x, 0, npc.charPos.z - nearestTarget.charPos.z);
          const pullDist = pullDir.length();
          if (pullDist > 0.45) {
            pullDir.normalize();
            const force = 3.6 * dt;
            nearestTarget.charPos.addScaledVector(pullDir, force);
            nearestTarget.charVel.addScaledVector(pullDir, force * 6.0);
            npc.charVel.addScaledVector(pullDir, -force * 3.0);
          } else {
            npc.charVel.x *= 0.2;
            npc.charVel.z *= 0.2;
          }

          // Select random grab limbs once when the grab session begins
          if (!npc.hotGrabLimbLeft || !npc.hotGrabLimbRight) {
            // Gather all non-dismembered candidate limbs of the nearest target
            const availableParts = nearestTarget.particles.filter(p => !p.dismembered && [
              'mano_izq', 'mano_der', 'antebrazo_izq', 'antebrazo_der', 'brazo_izq', 'brazo_der',
              'pie_izq', 'pie_der', 'antepierna_izq', 'antepierna_der', 'muslo_izq', 'muslo_der',
              'cabeza', 'torso', 'pelvis'
            ].includes(p.name));

            if (availableParts.length > 0) {
              // Pick a random first limb for the left arm/hand
              const p1 = availableParts[Math.floor(Math.random() * availableParts.length)];
              npc.hotGrabLimbLeft = p1.name as BodyPartName;

              // Gather the remaining limbs excluding the first picked limb
              const remainingParts = availableParts.filter(p => p.name !== p1.name);
              if (remainingParts.length > 0) {
                // Pick a different random second limb for the right arm/hand
                const p2 = remainingParts[Math.floor(Math.random() * remainingParts.length)];
                npc.hotGrabLimbRight = p2.name as BodyPartName;
              } else {
                // Only one limb is available, grab it with both arms/hands
                npc.hotGrabLimbRight = p1.name as BodyPartName;
              }
            } else {
              // Fallback to torso if all limbs are somehow dismembered
              npc.hotGrabLimbLeft = 'torso';
              npc.hotGrabLimbRight = 'torso';
            }
          }

          // Compute dynamic crouching heights so npc can actually reach low targets or accommodate shorter targets
          let npcTargetCrouch = 0.18 * npc.scale;
          const leftLimb = npc.hotGrabLimbLeft || '';
          const rightLimb = npc.hotGrabLimbRight || '';
          const isLowGrab = leftLimb.includes('pie') || leftLimb.includes('antepierna') || leftLimb.includes('muslo') || leftLimb.includes('pelvis') ||
                             rightLimb.includes('pie') || rightLimb.includes('antepierna') || rightLimb.includes('muslo') || rightLimb.includes('pelvis');
          if (isLowGrab) {
            npcTargetCrouch = 0.55 * npc.scale; // Deep crouch to reach legs/feet/pelvis
          } else if (npc.scale > nearestTarget.scale + 0.1) {
            npcTargetCrouch = (npc.scale - nearestTarget.scale) * 0.7; // Crouch to match shorter target height
          }

          npc.crouchOffset = THREE.MathUtils.lerp(npc.crouchOffset || 0, npcTargetCrouch, 4.0 * dt);
          
          let targetTargetCrouch = 0.25 * nearestTarget.scale; // Target buckles under grab
          nearestTarget.crouchOffset = THREE.MathUtils.lerp(nearestTarget.crouchOffset || 0, targetTargetCrouch, 4.0 * dt);
        }

        // Hole-seeking detection (Mouth on head or female genital opening on pelvis)
        let foundHole: THREE.Vector3 | null = null;

        // 1. Check mouth hole on head
        const targetHead = nearestTarget.particles.find((p) => p.name === 'cabeza');
        if (targetHead) {
          const headHolePos = new THREE.Vector3(targetHead.x, targetHead.y - 0.08, targetHead.z);
          const handDist = npc.charPos.distanceTo(headHolePos);
          if (handDist < 1.4) {
            foundHole = headHolePos;
          }
        }

        // 2. Check genital opening on pelvis
        const targetPelvis = nearestTarget.particles.find((p) => p.name === 'pelvis');
        if (targetPelvis) {
          const pelvisGenitalPos = new THREE.Vector3(
            targetPelvis.x,
            targetPelvis.y - 0.08,
            targetPelvis.z + Math.cos(nearestTarget.facingAngle) * 0.1
          );
          if (!foundHole || npc.charPos.distanceTo(pelvisGenitalPos) < npc.charPos.distanceTo(foundHole)) {
            foundHole = pelvisGenitalPos;
          }
        }

        npc.hotTargetHolePos = foundHole || undefined;

        // Pelvis & Genital Control: Thrust oscillation cycle
        npc.pelvisThrustCycle = (npc.pelvisThrustCycle || 0) + dt * 4.8;
        if (npc.genitalType === 'male' || npc.isWerewolfHot) {
          npc.erectionLevel = 1.0;
          npc.isErecting = true;
        }

        // Calculate custom target distance to align genitals perfectly
        let targetOffsetDist = 0.155 * npc.scale + 0.155 * nearestTarget.scale;
        if ((npc.genitalType === 'male' || npc.isWerewolfHot) && nearestTarget.genitalType === 'female') {
          const mLength = 0.22 * (npc.genitalMShaftLength ?? 1.0) * 1.5;
          targetOffsetDist += mLength * 0.35; // optimal penetration depth
        } else if (npc.genitalType === 'female' && nearestTarget.genitalType === 'male') {
          const mLength = 0.22 * (nearestTarget.genitalMShaftLength ?? 1.0) * 1.5;
          targetOffsetDist += mLength * 0.35; // optimal penetration depth
        } else {
          targetOffsetDist += 0.08; // close embrace fallback
        }

        // Get the exact world coordinates of npc's pelvis
        const npcPelvis = npc.particles.find((p) => p.name === 'pelvis');
        const npcPelvisX = npcPelvis ? npcPelvis.x : npc.charPos.x;
        const npcPelvisY = npcPelvis ? npcPelvis.y : (npc.charPos.y + 0.98 * npc.scale);
        const npcPelvisZ = npcPelvis ? npcPelvis.z : npc.charPos.z;

        const forwardX = Math.sin(npc.facingAngle);
        const forwardZ = Math.cos(npc.facingAngle);

        const pullSpeed = 6.0; // strong and steady physical pull
        if (targetPelvis) {
          const desiredX = npcPelvisX + forwardX * targetOffsetDist;
          const desiredY = npcPelvisY - 0.02 * npc.scale;
          const desiredZ = npcPelvisZ + forwardZ * targetOffsetDist;

          targetPelvis.x += (desiredX - targetPelvis.x) * pullSpeed * dt;
          targetPelvis.y += (desiredY - targetPelvis.y) * pullSpeed * dt;
          targetPelvis.z += (desiredZ - targetPelvis.z) * pullSpeed * dt;

          nearestTarget.charPos.x = targetPelvis.x;
          nearestTarget.charPos.y = Math.max(-12.0, targetPelvis.y - 0.98 * nearestTarget.scale);
          nearestTarget.charPos.z = targetPelvis.z;
        } else {
          const desiredX = npc.charPos.x + forwardX * targetOffsetDist;
          const desiredY = npc.charPos.y + 0.98 * npc.scale - 0.98 * nearestTarget.scale;
          const desiredZ = npc.charPos.z + forwardZ * targetOffsetDist;

          nearestTarget.charPos.x += (desiredX - nearestTarget.charPos.x) * pullSpeed * dt;
          nearestTarget.charPos.y += (desiredY - nearestTarget.charPos.y) * pullSpeed * dt;
          nearestTarget.charPos.z += (desiredZ - nearestTarget.charPos.z) * pullSpeed * dt;
        }

        // Smoothly rotate target to face the NPC (face-to-face genital alignment)
        const targetToNpcAngle = Math.atan2(npc.charPos.x - nearestTarget.charPos.x, npc.charPos.z - nearestTarget.charPos.z);
        let angleDiffT = targetToNpcAngle - nearestTarget.facingAngle;
        while (angleDiffT > Math.PI) angleDiffT -= Math.PI * 2;
        while (angleDiffT < -Math.PI) angleDiffT += Math.PI * 2;
        nearestTarget.facingAngle += angleDiffT * Math.min(1.0, 11.0 * dt);
      }
    }

    // Decay crouch offset smoothly to standing pose for any character not actively in a grab interaction
    for (const r of this.ragdolls) {
      if (!activeGrabIds.has(r.id)) {
        r.crouchOffset = THREE.MathUtils.lerp(r.crouchOffset || 0, 0, 5.0 * dt);
      }
    }
  }

  private distancePointToSegment(
    point: THREE.Vector3,
    segA: THREE.Vector3,
    segB: THREE.Vector3
  ): { dist: number; closest: THREE.Vector3; t: number } {
    const ab = new THREE.Vector3().subVectors(segB, segA);
    const ap = new THREE.Vector3().subVectors(point, segA);
    const abLenSq = ab.lengthSq();
    if (abLenSq === 0) {
      return { dist: ap.length(), closest: segA.clone(), t: 0 };
    }
    const t = Math.max(0, Math.min(1, ap.dot(ab) / abLenSq));
    const closest = segA.clone().addScaledVector(ab, t);
    return { dist: closest.distanceTo(point), closest, t };
  }

  public updateContourBillboards(camera?: THREE.Camera) {
    if (!camera) return;
    for (const ragdoll of this.ragdolls) {
      if (!ragdoll.contourLayerEnabled) continue;
      for (const p of ragdoll.particles) {
        if (p.contourMesh && p.contourMesh.visible) {
          // Only face camera if it's a legacy 2D billboard
          if (!p.contourMesh.userData?.isPseudo3DSpherical) {
            p.contourMesh.quaternion.copy(camera.quaternion);
          }
        }
      }
    }
  }

  public updateFacialAnimations(now: number, dt: number = 0.016) {
    for (const ragdoll of this.ragdolls) {
      // Initialize fatigue & sleeping state on Ragdoll3D
      ragdoll.fatigue = ragdoll.fatigue ?? 0.0;
      (ragdoll as any).isSleeping = (ragdoll as any).isSleeping ?? false;

      // Only track tiredness/fatigue for humanoids that are not tentacles
      if (!ragdoll.isTentacle) {
        if (ragdoll.isAlive || ragdoll.isWalkingRagdoll) {
          // If moving, fatigue increases
          const velSq = ragdoll.charVel ? (ragdoll.charVel.x * ragdoll.charVel.x + ragdoll.charVel.z * ragdoll.charVel.z) : 0;
          const isMoving = velSq > 0.05;
          const isPlayer = ragdoll.isControlled;
          const isSprinting = isMoving && isPlayer && this.isSprinting;

          if (isSprinting) {
            ragdoll.fatigue = Math.min(1.0, ragdoll.fatigue + 0.065 * dt); // Sprinting makes you fall asleep in ~15s
          } else if (isMoving) {
            ragdoll.fatigue = Math.min(1.0, ragdoll.fatigue + 0.015 * dt); // Normal walking makes you fall asleep in ~66s
          } else {
            // Recover fatigue when resting/standing still!
            ragdoll.fatigue = Math.max(0.0, ragdoll.fatigue - 0.018 * dt); // Recover fully in ~55s
          }

          // If fatigue reaches maximum, collapse and sleep!
          if (ragdoll.fatigue >= 1.0) {
            (ragdoll as any).isSleeping = true;
            ragdoll.isAlive = false;
            ragdoll.isWalkingRagdoll = false;
            ragdoll.isCollapsed = true;
            this.collapseRagdoll(ragdoll);
          }
        } else if ((ragdoll as any).isSleeping) {
          // Sleeping: recover energy/fatigue very rapidly
          ragdoll.fatigue = Math.max(0.0, ragdoll.fatigue - 0.16 * dt); // Recover fully and wake up in ~6 seconds

          if (ragdoll.fatigue <= 0.0) {
            // Wake up! Stand up cleanly and restore kinematics
            (ragdoll as any).isSleeping = false;
            ragdoll.isAlive = true;
            ragdoll.isWalkingRagdoll = false;
            ragdoll.isCollapsed = false;
            
            const pelvis = ragdoll.particles.find((p) => p.name === 'pelvis') || ragdoll.particles[0];
            if (pelvis) {
              ragdoll.charPos.x = pelvis.x;
              ragdoll.charPos.z = pelvis.z;
              ragdoll.charPos.y = Math.max(-12.0, pelvis.y - 0.98 * ragdoll.scale);
            }
            ragdoll.charVel.set(0, 0, 0);
            this.resetRagdollParticlesToKinematicPose(ragdoll);
            this.syncMeshes();
          }
        }
      }

      updateAnimeFace(ragdoll, dt);
      const faceData = (ragdoll as any).animeFace;
      updateVoxel3DFace(ragdoll, faceData, dt);
    }
  }

  private dismemberParticleChain(ragdoll: Ragdoll3D, rootP: Particle3D) {
    if (!rootP || rootP.dismembered) return;

    const rootName = rootP.name;
    const isLeft = rootName.includes('_izq') || rootName.includes('_l');
    const isRight = rootName.includes('_der') || rootName.includes('_r');
    const side = isLeft ? 'izq' : (isRight ? 'der' : '');

    const particlesToDismember: Particle3D[] = [rootP];

    if (rootName.includes('hombro') || rootName.includes('brazo')) {
      for (const p of ragdoll.particles) {
        if ((side === '' || p.name.includes(side)) &&
            (p.name.includes('brazo') || p.name.includes('codo') || p.name.includes('antebrazo') ||
             p.name.includes('muneca') || p.name.includes('mano') || p.name.includes('dedo'))) {
          particlesToDismember.push(p);
        }
      }
    } else if (rootName.includes('codo') || rootName.includes('antebrazo')) {
      for (const p of ragdoll.particles) {
        if ((side === '' || p.name.includes(side)) &&
            (p.name.includes('antebrazo') || p.name.includes('muneca') ||
             p.name.includes('mano') || p.name.includes('dedo'))) {
          particlesToDismember.push(p);
        }
      }
    } else if (rootName.includes('muneca') || rootName.includes('mano')) {
      for (const p of ragdoll.particles) {
        if ((side === '' || p.name.includes(side)) &&
            (p.name.includes('mano') || p.name.includes('dedo'))) {
          particlesToDismember.push(p);
        }
      }
    } else if (rootName.includes('muslo') || rootName.includes('rodilla')) {
      for (const p of ragdoll.particles) {
        if ((side === '' || p.name.includes(side)) &&
            (p.name.includes('rodilla') || p.name.includes('antepierna') ||
             p.name.includes('tobillo') || p.name.includes('pie') || p.name.includes('dedo_pie'))) {
          particlesToDismember.push(p);
        }
      }
    } else if (rootName.includes('antepierna') || rootName.includes('tobillo')) {
      for (const p of ragdoll.particles) {
        if ((side === '' || p.name.includes(side)) &&
            (p.name.includes('tobillo') || p.name.includes('pie') || p.name.includes('dedo_pie'))) {
          particlesToDismember.push(p);
        }
      }
    } else if (rootName.includes('cuello') || rootName.includes('cabeza')) {
      for (const p of ragdoll.particles) {
        if (p.name.includes('cabeza')) {
          particlesToDismember.push(p);
        }
      }
    }

    const disSet = new Set(particlesToDismember);
    for (const disP of particlesToDismember) {
      disP.dismembered = true;
    }

    for (const c of ragdoll.constraints) {
      const p1In = disSet.has(c.p1);
      const p2In = disSet.has(c.p2);
      if (p1In !== p2In) {
        c.broken = true;

        // "el corte le falta paint tambien" -> Paint the cut with 3D Crimson Red paint spheres on both stumps!
        const attachP1 = c.p1.voxelsGroup || c.p1.mesh;
        const attachP2 = c.p2.voxelsGroup || c.p2.mesh;

        if (attachP1) {
          // Add 3-4 random red paint spheres to represent shredded flesh & heavy paint/blood on the stump
          for (let k = 0; k < 4; k++) {
            const rad = 0.045 + Math.random() * 0.035;
            const geom = new THREE.SphereGeometry(rad, 6, 6);
            const mat = new THREE.MeshBasicMaterial({ color: 0xdc2626 }); // Crimson red paint
            const sphere = new THREE.Mesh(geom, mat);
            sphere.name = 'CutPaintSphere';

            // Position at the joint cut boundary relative to p1
            const dir = new THREE.Vector3(c.p2.x - c.p1.x, c.p2.y - c.p1.y, c.p2.z - c.p1.z).normalize();
            const localPos = dir.clone().multiplyScalar(0.08 + Math.random() * 0.04);
            // Add a bit of radial jitter
            const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
            const perp2 = dir.clone().cross(perp).normalize();
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * 0.09;
            localPos.addScaledVector(perp, Math.cos(angle) * r);
            localPos.addScaledVector(perp2, Math.sin(angle) * r);

            sphere.position.copy(localPos);
            attachP1.add(sphere);
          }
        }

        if (attachP2) {
          // Add 3-4 random red paint spheres representing the opposite face of the cut
          for (let k = 0; k < 4; k++) {
            const rad = 0.045 + Math.random() * 0.035;
            const geom = new THREE.SphereGeometry(rad, 6, 6);
            const mat = new THREE.MeshBasicMaterial({ color: 0xdc2626 }); // Crimson red paint
            const sphere = new THREE.Mesh(geom, mat);
            sphere.name = 'CutPaintSphere';

            // Position at the joint cut boundary relative to p2
            const dir = new THREE.Vector3(c.p1.x - c.p2.x, c.p1.y - c.p2.y, c.p1.z - c.p2.z).normalize();
            const localPos = dir.clone().multiplyScalar(0.08 + Math.random() * 0.04);
            // Add a bit of radial jitter
            const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
            const perp2 = dir.clone().cross(perp).normalize();
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * 0.09;
            localPos.addScaledVector(perp, Math.cos(angle) * r);
            localPos.addScaledVector(perp2, Math.sin(angle) * r);

            sphere.position.copy(localPos);
            attachP2.add(sphere);
          }
        }
      }
    }
  }

  private updateBullets(dt: number) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= dt;

      if (b.life <= 0) {
        if (b.tracerMesh) this.scene.remove(b.tracerMesh);
        this.bullets.splice(i, 1);
        continue;
      }

      if (b.embeddedInSlime && b.embeddedBlock && b.localEmbeddedPos) {
        const eb = b.embeddedBlock;
        const scaleX = eb.wobbleScale ? eb.wobbleScale.x : 1.0;
        const scaleY = eb.wobbleScale ? eb.wobbleScale.y : 1.0;
        const scaleZ = eb.wobbleScale ? eb.wobbleScale.z : 1.0;

        const shearX = eb.shearOffset ? eb.shearOffset.x : 0;
        const shearZ = eb.shearOffset ? eb.shearOffset.z : 0;

        b.pos.set(
          eb.x + b.localEmbeddedPos.x * scaleX + shearX * b.localEmbeddedPos.y,
          eb.y + b.localEmbeddedPos.y * scaleY,
          eb.z + b.localEmbeddedPos.z * scaleZ + shearZ * b.localEmbeddedPos.y
        );
        if (b.tracerMesh) {
          b.tracerMesh.position.copy(b.pos);
        }
        continue;
      }

      const prevPos = b.pos.clone();
      const stepDist = b.speed * dt;
      b.pos.addScaledVector(b.dir, stepDist);

      if (b.tracerMesh) {
        b.tracerMesh.position.copy(b.pos);
      }

      let bulletConsumed = false;

      // 1. Collision with Environmental Voxel Blocks & Destruction of cubes (CCD)
      for (let j = this.voxelBlocks.length - 1; j >= 0; j--) {
        const vb = this.voxelBlocks[j];
        const halfS = vb.size / 2;
        const blockCenter = new THREE.Vector3(vb.x, vb.y, vb.z);
        const { dist } = this.distancePointToSegment(blockCenter, prevPos, b.pos);

        if (dist <= halfS + 0.15) {
          // Direct hit!
          if (vb.isJelly) {
            const damage = b.damage ?? 35;
            const dir = b.dir.clone().normalize();

            if (vb.type === 'slime') {
              // SlimeSpecial Penetration & Stuck mechanics!
              // "abriendo camino": Deform the slime block
              this.deformJellyBlockWound(vb, b.pos, b.dir);

              // Create a bullet wound / paint sphere at the entry hole
              if (vb.mesh) {
                const localHit = vb.mesh.worldToLocal(b.pos.clone());
                const woundGeom = new THREE.SphereGeometry(0.08, 10, 10);
                const woundMat = new THREE.MeshStandardMaterial({
                  color: 0x052e16, // Toxic green for entry wounds
                  roughness: 0.1,
                  metalness: 0.3,
                  emissive: 0x022c22,
                });
                const woundMesh = new THREE.Mesh(woundGeom, woundMat);
                woundMesh.name = 'BulletPaintSphere';
                woundMesh.position.copy(localHit);
                vb.mesh.add(woundMesh);
              }

              // "vayan frenando": Brake the bullet
              b.speed *= 0.55;

              // "mientra mas velocidad mas traspase"
              if (b.speed > 16.0) {
                // Bullet passes through! Not consumed.
                if (vb.wobbleVel) {
                  vb.wobbleVel.y += -2.5;
                  vb.wobbleVel.x += (Math.random() - 0.5) * 2.0;
                  vb.wobbleVel.z += (Math.random() - 0.5) * 2.0;
                }
                this.spawnJellyDebris(b.pos.x, b.pos.y, b.pos.z, 'slime', vb.color, 3);
                soundEngine.playImpact(0.4);
                // Keep bulletConsumed = false; do not break, so bullet continues travel!
              } else {
                // "se quede atascado... se cierran si el objeto se detiene y aprietan"
                b.embeddedInSlime = true;
                b.embeddedBlock = vb;
                b.localEmbeddedPos = new THREE.Vector3(
                  b.pos.x - vb.x,
                  b.pos.y - vb.y,
                  b.pos.z - vb.z
                );
                b.speed = 0;
                b.life = 6.0;

                // "se cierran si el objeto se detiene y aprietan": Squeeze walls
                if (vb.wobbleVel) {
                  vb.wobbleVel.y += -5.5;
                  vb.wobbleVel.x += -2.0;
                  vb.wobbleVel.z += -2.0;
                }
                if (vb.wobbleScale) {
                  vb.wobbleScale.set(0.85, 0.75, 0.85);
                }

                // Paint wound sphere for the stuck bullet
                if (vb.mesh) {
                  const localHit = vb.mesh.worldToLocal(b.pos.clone());
                  const woundGeom = new THREE.SphereGeometry(0.09, 10, 10);
                  const woundMat = new THREE.MeshStandardMaterial({
                    color: 0xdc2626, // Bright contrast red stuck core
                    roughness: 0.1,
                    metalness: 0.6,
                    emissive: 0x7f1d1d,
                  });
                  const woundMesh = new THREE.Mesh(woundGeom, woundMat);
                  woundMesh.name = 'BulletPaintSphere';
                  woundMesh.position.copy(localHit);
                  vb.mesh.add(woundMesh);
                }

                this.spawnJellyDebris(b.pos.x, b.pos.y, b.pos.z, 'slime', vb.color, 5);
                soundEngine.playImpact(0.6);
                bulletConsumed = true;
                break;
              }
            } else {
              // Skin block: DO NOT shrink ("tampoco bloque de piel")
              this.deformJellyBlockWound(vb, b.pos, b.dir);
              if (vb.wobbleVel) {
                vb.wobbleVel.y += -3.5;
                vb.wobbleVel.x += 1.2;
                vb.wobbleVel.z += 1.2;
              }

              for (let d = 0; d < 8; d++) {
                const vx = (Math.random() - 0.5) * 4.5;
                const vy = 2.0 + Math.random() * 4.0;
                const vz = (Math.random() - 0.5) * 4.5;
                this.spawnCubicBloodDroplet(b.pos.x, b.pos.y, b.pos.z, vx, vy, vz);
              }
              this.spawnJellyDebris(b.pos.x, b.pos.y, b.pos.z, 'skin', vb.color, 4);

              soundEngine.playImpact(0.6);
              bulletConsumed = true;
              break;
            }
          } else {
            const hitX = vb.x;
            const hitY = vb.y;
            const hitZ = vb.z;

            this.spawnVoxelDebris(hitX, hitY, hitZ, vb.color, 10);
            soundEngine.playVoxelDestroy();

            // Remove the hit block and nearby blocks in radius
            const blastRadius = 1.1;
            for (let k = this.voxelBlocks.length - 1; k >= 0; k--) {
              const nearby = this.voxelBlocks[k];
              if (nearby.isJelly) continue; // Keep jelly blocks intact unless directly hit
              const ndx = nearby.x - hitX;
              const ndy = nearby.y - hitY;
              const ndz = nearby.z - hitZ;
              const d = Math.sqrt(ndx * ndx + ndy * ndy + ndz * ndz);

              if (d <= blastRadius) {
                this.scene.remove(nearby.mesh);
                this.spawnVoxelDebris(nearby.x, nearby.y, nearby.z, nearby.color, 4);
                this.voxelBlocks.splice(k, 1);
              }
            }

            // Apply rule: if blocks separate from others, they separate as props or pieces!
            this.checkVoxelSeparation();

            bulletConsumed = true;
            break;
          }
        }
      }

      if (bulletConsumed) {
        if (b.tracerMesh) this.scene.remove(b.tracerMesh);
        this.bullets.splice(i, 1);
        continue;
      }

      // 1.5 Collision with Destructible Doors & Voxel Blocks / Handle (Manija)
      for (const door of this.doors) {
        if (door.isDestroyed) continue;
        for (const vb of door.voxelBlocks) {
          if (!vb.active) continue;
          const worldPos = vb.localPos.clone();
          door.hingeGroup.localToWorld(worldPos);
          const { dist } = this.distancePointToSegment(worldPos, prevPos, b.pos);
          if (dist <= 0.35) {
            vb.active = false;
            if (vb.mesh) {
              door.hingeGroup.remove(vb.mesh);
            }
            if (door.pseudoMesh) {
              door.pseudoMesh.visible = false;
            }

            const bw = vb.width || vb.size || 0.28;
            const bh = vb.height || vb.size || 0.28;
            const bd = vb.depth || 0.12;
            const pushImpulse = b.dir.clone().multiplyScalar(3.5).add(new THREE.Vector3(0, 0.6, 0));
            this.spawnDynamicPropBlock(worldPos.x, worldPos.y, worldPos.z, bw, bh, bd, vb.color, pushImpulse);

            this.spawnVoxelDebris(worldPos.x, worldPos.y, worldPos.z, vb.color, 2);
            soundEngine.playVoxelDestroy();

            // Spawn bullet hole decal on the door hingeGroup
            this.bulletHoleManager.spawnBulletHole(worldPos, b.dir.clone().negate(), 0.10, false, door.hingeGroup);

            door.targetAngle = Math.PI / 2; // Swing open when hit/shot!

            // Check if remaining door blocks separated from hinge to drop them as props too
            this.checkDoorSeparation(door);

            bulletConsumed = true;
            break;
          }
        }
        if (bulletConsumed) break;
      }

      // 1.6 Collision with Dynamic Props
      if (!bulletConsumed) {
        for (const prop of this.dynamicProps) {
          const { dist } = this.distancePointToSegment(new THREE.Vector3(prop.x, prop.y, prop.z), prevPos, b.pos);
          if (dist <= Math.max(prop.width, prop.height, prop.depth) * 0.75) {
            prop.isSettled = false;
            prop.vx += b.dir.x * 7.0;
            prop.vy += 2.0;
            prop.vz += b.dir.z * 7.0;
            prop.avx += (Math.random() - 0.5) * 6;
            prop.avz += (Math.random() - 0.5) * 6;
            this.spawnVoxelDebris(prop.x, prop.y, prop.z, prop.color, 3);
            soundEngine.playImpact(0.4);
            bulletConsumed = true;
            break;
          }
        }
      }

      if (bulletConsumed) {
        if (b.tracerMesh) this.scene.remove(b.tracerMesh);
        this.bullets.splice(i, 1);
        continue;
      }

      // 1.8 Collision with Beds (Destructible wood & mattress debris)
      for (const bed of this.beds) {
        const halfW = bed.width / 2;
        const halfD = bed.depth / 2;
        const bedCenter = new THREE.Vector3(bed.x, bed.y + 0.45, bed.z);
        const { dist, closest } = this.distancePointToSegment(bedCenter, prevPos, b.pos);
        if (dist <= Math.max(halfW, halfD) * 0.75) {
          const hitX = closest.x;
          const hitY = closest.y;
          const hitZ = closest.z;
          this.spawnVoxelDebris(hitX, hitY, hitZ, 0x582f0e, 6);
          this.spawnVoxelDebris(hitX, hitY, hitZ, 0xf8fafc, 4);
          soundEngine.playImpact(0.5);

          // Spawn bullet hole decal on the bed mesh
          if (bed.groupMesh) {
            this.bulletHoleManager.spawnBulletHole(closest, b.dir.clone().negate(), 0.12, false, bed.groupMesh);
          }

          bulletConsumed = true;
          break;
        }
      }

      if (bulletConsumed) {
        if (b.tracerMesh) this.scene.remove(b.tracerMesh);
        this.bullets.splice(i, 1);
        continue;
      }

      // 2. Collision with Characters / Ragdolls & Voxel Deletion from Body Parts (Continuous Collision Detection)
      let closestHit: {
        ragdoll: Ragdoll3D;
        particle: Particle3D;
        closestPos: THREE.Vector3;
        t: number;
      } | null = null;

      for (const ragdoll of this.ragdolls) {
        // A bullet CAN NEVER hit or damage the character/soldier who shot it!
        if (b.shooterId && ragdoll.id === b.shooterId) {
          continue;
        }

        // Prevent friendly fire among NPC soldiers or player at point blank
        if (b.fromPlayer && ragdoll.isControlled) {
          continue;
        }

        // Check particle spheres
        for (const p of ragdoll.particles) {
          const partPos = new THREE.Vector3(p.x, p.y, p.z);
          const hitRadius = p.radius || 0.22;
          const { dist, closest, t } = this.distancePointToSegment(partPos, prevPos, b.pos);

          if (dist <= hitRadius + 0.22) {
            if (!closestHit || t < closestHit.t) {
              closestHit = {
                ragdoll,
                particle: p,
                closestPos: closest,
                t,
              };
            }
          }
        }

        // Also check constraint segment cylinders (bones/links between particles) so NO body part is missed!
        for (const c of ragdoll.constraints) {
          const p1Pos = new THREE.Vector3(c.p1.x, c.p1.y, c.p1.z);
          const p2Pos = new THREE.Vector3(c.p2.x, c.p2.y, c.p2.z);
          const midPos = p1Pos.clone().add(p2Pos).multiplyScalar(0.5);
          const boneRadius = Math.max(c.p1.radius || 0.12, c.p2.radius || 0.12) + 0.15;
          const { dist, closest, t } = this.distancePointToSegment(midPos, prevPos, b.pos);

          if (dist <= boneRadius) {
            const distToP1 = closest.distanceTo(p1Pos);
            const distToP2 = closest.distanceTo(p2Pos);
            const targetP = distToP1 <= distToP2 ? c.p1 : c.p2;

            if (!closestHit || t < closestHit.t) {
              closestHit = {
                ragdoll,
                particle: targetP,
                closestPos: closest,
                t,
              };
            }
          }
        }
      }

      if (closestHit) {
        const { ragdoll, particle: p, closestPos } = closestHit;

        // Destroy exactly 1 voxel block on the primary hit particle only
        const hitParticles: Particle3D[] = [p];

        const primaryRayDir = p.mesh
          ? b.dir.clone().applyQuaternion(p.mesh.quaternion.clone().invert()).normalize()
          : b.dir.clone().normalize();

        let primaryPenetration: ReturnType<typeof destroyLimbVoxelsAlongRay> | null = null;

        for (const pTarget of hitParticles) {
          // 1. Calculate local impact vector on the body part
          if (pTarget.mesh) {
            pTarget.mesh.updateMatrixWorld(true);
          }
          const localHit = pTarget.mesh ? pTarget.mesh.worldToLocal(closestPos.clone()) : new THREE.Vector3(0, 0, 0);

          // Calculate bullet ray direction in local space of limb
          const localRayDir = pTarget.mesh
            ? b.dir.clone().applyQuaternion(pTarget.mesh.quaternion.clone().invert()).normalize()
            : b.dir.clone().normalize();

          // 2. Destroy discrete voxels along bullet ray and detect entry and exit holes
          const penetration = destroyLimbVoxelsAlongRay(pTarget, localHit, localRayDir, 0.22, 0.8);
          if (pTarget === p) {
            primaryPenetration = penetration;
          }
          const { destroyed } = penetration;

          if (destroyed.length > 0) {
            ragdoll.stats.destroyedBlocks = (ragdoll.stats.destroyedBlocks || 0) + destroyed.length;
          }

          // Mark particle and adjacent particles for cylinder deformation
          pTarget.needsCylinderDeform = true;
          for (const c of ragdoll.constraints) {
            if (c.p1 === pTarget || c.p2 === pTarget) {
              c.p1.needsCylinderDeform = true;
              c.p2.needsCylinderDeform = true;
            }
          }
          if (ragdoll.jointBridges) {
            for (const bridge of ragdoll.jointBridges) {
              const c = bridge.userData.constraint;
              if (c && (c.p1 === pTarget || c.p2 === pTarget)) {
                bridge.userData.needsDeform = true;
              }
            }
          }

          // 2b. Recalculate skin layer morph to physically show bullet holes on outer skin across all body parts!
          if (pTarget.contourMesh instanceof THREE.Mesh) {
            applySphericalMorph(pTarget.contourMesh, ragdoll.sphericalContourLevel, pTarget, ragdoll);
          }
          if (pTarget.voxelsGroup) {
            pTarget.voxelsGroup.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                const name = child.name || '';
                const parentName = child.parent?.name || '';
                const isAnatomyFeature = (
                  name.includes('pecho_') ||
                  name.includes('tetilla_') ||
                  name.includes('gluteo_') ||
                  name.includes('shaft_') ||
                  name.includes('glans_') ||
                  name.includes('testicle_') ||
                  name.includes('labia_') ||
                  name.includes('labio_') ||
                  name.includes('entrance_') ||
                  name.includes('anus_') ||
                  name.includes('ano_') ||
                  name.includes('sphincter_') ||
                  parentName === 'BustExtraGroup' ||
                  parentName === 'GluteExtraGroup' ||
                  parentName === 'GenitalExtraGroup' ||
                  parentName === 'AnusExtraGroup'
                );
                if (isAnatomyFeature) {
                  applySphericalMorph(child, ragdoll.sphericalContourLevel, pTarget, ragdoll);
                }
              }
            });
          }
        }

        const radius = p.radius || 0.22;
        const localHit = p.mesh ? p.mesh.worldToLocal(closestPos.clone()) : new THREE.Vector3();
        const localProj = localHit.clone();

        const isSphere = p.name === 'cabeza' || p.name.includes('rodilla') || p.name.includes('tobillo') || p.name.includes('codo') || p.name.includes('muneca') || p.name.includes('pie');

        if (isSphere) {
          const len = localProj.length();
          if (len > 0.0001) {
            localProj.multiplyScalar(radius / len);
          } else {
            localProj.set(0, radius, 0);
          }
        } else {
          const distXZ = Math.sqrt(localProj.x * localProj.x + localProj.z * localProj.z);
          if (distXZ > 0.0001) {
            localProj.x = (localProj.x / distXZ) * radius;
            localProj.z = (localProj.z / distXZ) * radius;
          } else {
            localProj.x = radius;
          }
        }

        // Project exit point to opposite side
        const localExitProj = localProj.clone();
        if (isSphere) {
          localExitProj.negate();
        } else {
          localExitProj.x = -localExitProj.x;
          localExitProj.z = -localExitProj.z;
        }

        const lostBlock = (primaryPenetration && primaryPenetration.destroyed.length > 0) ? primaryPenetration.destroyed[0] : null;
        // Accurate ray-cast entry point directly at the visual impact surface (prevents misaligned/offset hole placement)
        const worldEntry = closestPos ? closestPos.clone() : (p.mesh ? p.mesh.localToWorld(localProj.clone()) : new THREE.Vector3(p.x, p.y, p.z));
        const penetratedThrough = true; // Always allow exit wounds for realism and visual feedback!
        const entryLocal = (lostBlock) ? lostBlock.localPos.clone() : localProj;
        const exitLocal = (primaryPenetration && primaryPenetration.exitLocal) ? primaryPenetration.exitLocal.clone() : localExitProj;

        soundEngine.playVoxelDestroy();

        // 1. Determine the EXACT visual sub-mesh hit (joint cylinder bridge vs joint sphere vs particle mesh)
        let entryTargetMesh: THREE.Object3D | undefined = p.mesh;
        let exitTargetMesh: THREE.Object3D | undefined = p.mesh;

        if (ragdoll.contourJointStyle === 'cylinder' && ragdoll.contourLayerEnabled) {
          let bestEntryDist = 999;
          if (ragdoll.jointSpheres) {
            for (const sphere of ragdoll.jointSpheres) {
              if (sphere.userData && sphere.userData.particle === p) {
                const d = sphere.position.distanceTo(worldEntry);
                if (d < 0.28 && d < bestEntryDist) {
                  bestEntryDist = d;
                  entryTargetMesh = sphere;
                }
              }
            }
          }
          if (ragdoll.jointBridges) {
            for (const bridge of ragdoll.jointBridges) {
              const c = bridge.userData?.constraint;
              if (c && (c.p1 === p || c.p2 === p)) {
                const d = bridge.position.distanceTo(worldEntry);
                if (d < bestEntryDist) {
                  bestEntryDist = d;
                  entryTargetMesh = bridge;
                }
              }
            }
          }
        }

        const worldExit = p.mesh ? p.mesh.localToWorld(localExitProj.clone()) : worldEntry.clone().addScaledVector(b.dir, 0.3);

        if (ragdoll.contourJointStyle === 'cylinder' && ragdoll.contourLayerEnabled) {
          let bestExitDist = 999;
          if (ragdoll.jointSpheres) {
            for (const sphere of ragdoll.jointSpheres) {
              if (sphere.userData && sphere.userData.particle === p) {
                const d = sphere.position.distanceTo(worldExit);
                if (d < 0.28 && d < bestExitDist) {
                  bestExitDist = d;
                  exitTargetMesh = sphere;
                }
              }
            }
          }
          if (ragdoll.jointBridges) {
            for (const bridge of ragdoll.jointBridges) {
              const c = bridge.userData?.constraint;
              if (c && (c.p1 === p || c.p2 === p)) {
                const d = bridge.position.distanceTo(worldExit);
                if (d < bestExitDist) {
                  bestExitDist = d;
                  exitTargetMesh = bridge;
                }
              }
            }
          }
        }

        // --- Bullet Wounds: Sphere paint holes applied to whole body ("los huecos de pintado de esfera a todo el cuerpo no el sistema viejo de herida de sangre") ---
        paintWoundOnParticleAndAnatomy(p, worldEntry, false, 32);

        const entryMeshToUse = entryTargetMesh || p.contourMesh || p.mesh;
        if (entryMeshToUse) {
          this.bulletHoleManager.spawnBulletHole(worldEntry, primaryRayDir.clone().negate(), 0.08, false, entryMeshToUse);
        }

        if (primaryPenetration && primaryPenetration.exitLocal) {
          paintWoundOnParticleAndAnatomy(p, worldExit, true, 38);
          const exitMeshToUse = exitTargetMesh || p.contourMesh || p.mesh;
          if (exitMeshToUse) {
            this.bulletHoleManager.spawnBulletHole(worldExit, primaryRayDir.clone(), 0.09, true, exitMeshToUse);
          }
        }

        // 3. Register Wound Blood Jets (Only if not a brick wall prop)
        if (ragdoll.name !== 'brick_wall') {
          this.spawnBloodChorro3D(worldEntry.x, worldEntry.y, worldEntry.z, b.dir.clone().negate(), 1);

          const entryJetDir = primaryRayDir.clone().negate();
          const entryMeshToUse = entryTargetMesh || p.contourMesh || p.mesh;
          const entryLocalPos = entryMeshToUse ? entryMeshToUse.worldToLocal(worldEntry.clone()) : entryLocal.clone();

          this.woundBloodJets.push({
            id: 'jet_in_' + Math.random().toString(36).substring(2, 9),
            ragdollId: ragdoll.id,
            particleName: p.name,
            localPos: entryLocalPos,
            localDir: entryJetDir,
            timeLeft: 30.0,
            accumulator: 0,
            targetMesh: entryMeshToUse,
          });

          if (penetratedThrough && exitLocal) {
            this.spawnBloodChorro3D(worldExit.x, worldExit.y, worldExit.z, b.dir.clone(), 1);

            const exitJetDir = primaryRayDir.clone();
            const exitMeshToUse = exitTargetMesh || p.contourMesh || p.mesh;
            const exitLocalPos = exitMeshToUse ? exitMeshToUse.worldToLocal(worldExit.clone()) : exitLocal.clone();

            this.woundBloodJets.push({
              id: 'jet_out_' + Math.random().toString(36).substring(2, 9),
              ragdollId: ragdoll.id,
              particleName: p.name,
              localPos: exitLocalPos,
              localDir: exitJetDir,
              timeLeft: 30.0,
              accumulator: 0,
              targetMesh: exitMeshToUse,
            });
          }
        }

        const strengthMultiplier = 0.1 + 1.9 * (this.strength / 100);
        const immunityMultiplier = Math.max(0.0, 1.0 - (this.immunity / 100));
        const finalDamage = b.damage * (b.fromPlayer ? strengthMultiplier : 1.0) * immunityMultiplier;

        if (p.isVital) {
          // Play extra blood spurts
          if (Math.random() < 0.6) {
            const worldExit = new THREE.Vector3(p.x, p.y, p.z).addScaledVector(b.dir, p.radius || 0.22);
            this.spawnBloodChorro3D(worldExit.x, worldExit.y, worldExit.z, b.dir.clone(), 5);

            const exitJetDir = primaryRayDir.clone();
            this.woundBloodJets.push({
              id: 'jet_out_' + Math.random().toString(36).substring(2, 9),
              ragdollId: ragdoll.id,
              particleName: p.name,
              localPos: exitLocal ? exitLocal.clone() : entryLocal.clone(),
              localDir: exitJetDir,
              timeLeft: 2.2,
              accumulator: 0,
            });
          }

          p.health = Math.max(0, p.health - finalDamage);
          p.bleedingRate += 0.5;
          ragdoll.stats.bloodLossPercent = Math.min(100, ragdoll.stats.bloodLossPercent + 8);
        } else {
          p.health = Math.max(0, p.health - finalDamage);
        }

        // Apply physical impact velocity/force to the hit particle and adjacent parent segments for realistic active flinching
        const impulseForce = 15.0;
        p.vx += b.dir.x * impulseForce;
        p.vy += b.dir.y * impulseForce + 2.5; // Slight upward pop
        p.vz += b.dir.z * impulseForce;

        CannonRagdollEngine.getInstance().applyImpulseToPart(
          ragdoll.id,
          p.name,
          new THREE.Vector3(b.dir.x * impulseForce * 0.3, b.dir.y * impulseForce * 0.3 + 0.5, b.dir.z * impulseForce * 0.3)
        );

        const parentSpine = ragdoll.particles.find(pt => pt.name === 'torso' || pt.name === 'pelvis');
        if (parentSpine) {
          parentSpine.vx += b.dir.x * impulseForce * 0.35;
          parentSpine.vy += b.dir.y * impulseForce * 0.35 + 1.0;
          parentSpine.vz += b.dir.z * impulseForce * 0.35;
        }

        const faceData = (ragdoll as any).faceData;
        if (faceData) {
          faceData.painTimer = 2.5;
        } else {
          (ragdoll as any).painTimer = 2.5;
        }

        // Check if limb lost its real voxel block structural connection
        const activeCount = p.voxelBlocks ? p.voxelBlocks.filter((block) => block.active).length : 0;
        const totalCount = p.voxelBlocks ? p.voxelBlocks.length : 1;
        const lostAllBlocks = p.voxelBlocks ? activeCount === 0 : false;
        const lostConnection = (activeCount / totalCount) <= 0.45 || activeCount <= 1;

        // Dismember extremity physically ("se despegue") if health is 0 OR real voxel connection is destroyed OR lost all blocks
        if ((lostAllBlocks || p.health <= 0 || lostConnection) && !p.dismembered && p.name !== 'torso' && p.name !== 'pechobase' && p.name !== 'pelvis' && p.name !== 'ombligo' && p.name !== 'pecho_bajo' && p.name !== 'ombligo_bajo') {
          this.dismemberParticleChain(ragdoll, p);
          p.dismembered = true;
          ragdoll.stats.dismemberedLimbs++;
          ragdoll.stats.brokenBones++;
          soundEngine.playBoneSnap();
          soundEngine.playBloodSplatter();
          this.spawnBloodChorro3D(closestPos.x, closestPos.y, closestPos.z, b.dir, 5);
          // If lost a leg, collapse NPC to ground (unless it's the player!)
          if ((p.name.includes('muslo') || p.name.includes('antepierna') || p.name.includes('rodilla')) && !ragdoll.isControlled) {
            if (ragdoll.isAlive) this.collapseRagdoll(ragdoll, b.dir);
          }
        }

        // If lost all blocks, make the zone completely empty ("hagan que este vacio la zona si perdio todos sus bloques")
        if (lostAllBlocks) {
          if (p.mesh) p.mesh.visible = false;
          if (p.contourMesh) p.contourMesh.visible = false;
          if (p.voxelsGroup) p.voxelsGroup.visible = false;
          if ((p as any).jointSphere) (p as any).jointSphere.visible = false;
        }

        // Player NEVER dies from bullets!
        if (ragdoll.isControlled) {
          ragdoll.isAlive = true;
          ragdoll.totalHealth = 240;
        } else {
          ragdoll.totalHealth = Math.max(0, ragdoll.totalHealth - finalDamage);
          if (ragdoll.totalHealth <= 0 || (p.isVital && p.health <= 0)) {
            if (ragdoll.isAlive) this.collapseRagdoll(ragdoll, b.dir);
          }
          if (this.onRagdollReaction && Math.random() < 0.32) {
            const painPhrases = [
              '¡Auch, me diste!',
              '¡Eso dolió bastante!',
              '¡Cuidado con dispararme!',
              '¡Mis piezas cúbicas!',
              '¡Ayuda, me caigo!',
              '¡Oye, con cuidado!',
              '¡Uff, qué impacto!',
            ];
            const phrase = painPhrases[Math.floor(Math.random() * painPhrases.length)];
            this.onRagdollReaction(ragdoll.id, ragdoll.name || 'Ragdoll', phrase);
          }
        }

        soundEngine.playBloodSplatter();
        soundEngine.playBoneSnap();

        bulletConsumed = true;
      }

      if (bulletConsumed) {
        if (b.tracerMesh) this.scene.remove(b.tracerMesh);
        this.bullets.splice(i, 1);
        continue;
      }

      // 2.8 Collision with Cesped2 Forest Trees (Wood Trunks & Leaf Canopies)
      if (this.cesped2InstancedMesh && (this.map.id === 'cesped2' || this.map.theme === 'cesped2')) {
        const blockSize = 0.88;
        const bIx = Math.round(b.pos.x / blockSize);
        const bIy = Math.round(b.pos.y / blockSize);
        const bIz = Math.round(b.pos.z / blockSize);

        let hitTree = false;
        for (let dx = -1; dx <= 1 && !hitTree; dx++) {
          for (let dy = -1; dy <= 1 && !hitTree; dy++) {
            for (let dz = -1; dz <= 1 && !hitTree; dz++) {
              for (let sx = 0; sx < 2 && !hitTree; sx++) {
                for (let sy = 0; sy < 3 && !hitTree; sy++) {
                  for (let sz = 0; sz < 2 && !hitTree; sz++) {
                    const testKey = `${bIx + dx}_${bIy + dy}_${bIz + dz}_${sx}_${sy}_${sz}`;
                    const wood = this.cesped2WoodBlocks.get(testKey);
                    const leaves = this.cesped2LeavesBlocks.get(testKey);
                    if ((wood && wood.active) || (leaves && leaves.active)) {
                      this.destroyCesped2BlockAt(b.pos.x, b.pos.y, b.pos.z, 0.35);
                      bulletConsumed = true;
                      hitTree = true;
                    }
                  }
                }
              }
            }
          }
        }
      }

      if (bulletConsumed) {
        if (b.tracerMesh) this.scene.remove(b.tracerMesh);
        this.bullets.splice(i, 1);
        continue;
      }

      // 3. Ground Impact
      const groundH = this.getGroundHeight(b.pos.x, b.pos.z);
      if (b.pos.y <= groundH + 0.05) {
        if (this.cesped2InstancedMesh && (this.map.id === 'cesped2' || this.map.theme === 'cesped2')) {
          this.destroyCesped2BlockAt(b.pos.x, b.pos.y, b.pos.z, 0.28);
        } else {
          soundEngine.playImpact(0.4);
          // Spawn bullet hole decal on the ground
          this.bulletHoleManager.spawnBulletHole(b.pos.clone(), new THREE.Vector3(0, 1, 0), 0.10, false);
        }

        if (b.tracerMesh) this.scene.remove(b.tracerMesh);
        this.bullets.splice(i, 1);
      }
    }
  }

  private updateAliveHumanoid(
    inputMoveVector: { x: number; y: number },
    cameraForward: THREE.Vector3,
    cameraRight: THREE.Vector3,
    playerControlledRagdollId?: string,
    dt: number = 0.016,
    isFreeCamAiming: boolean = false
  ) {
    for (const ragdoll of this.ragdolls) {
      if ((!ragdoll.isAlive || ragdoll.isCollapsed) && !ragdoll.isWalkingRagdoll) {
        const pelvis = ragdoll.particles.find((p) => p.name === 'pelvis') || ragdoll.particles[0];
        if (pelvis) {
          ragdoll.charPos.set(pelvis.x, Math.max(-12.0, pelvis.y - 0.98 * ragdoll.scale), pelvis.z);
        }
        ragdoll.charVel.set(0, 0, 0);
        ragdoll.isGrounded = false;
        continue;
      }

      if (ragdoll.isTentacle) {
        const time = performance.now() * 0.003;
        // AI Targeting: Find closest non-tentacle entity (player or soldier) to hunt
        let nearestTargetRagdoll: Ragdoll3D | null = null;
        let nearestTarget: THREE.Vector3 | null = null;
        let minDist = Infinity;
        for (const other of this.ragdolls) {
          if (other.id === ragdoll.id || other.isTentacle || (!other.isAlive && !other.isWalkingRagdoll && other.isCollapsed)) continue;
          const d = ragdoll.charPos.distanceTo(other.charPos);
          if (d < minDist) {
            minDist = d;
            nearestTargetRagdoll = other;
            nearestTarget = other.charPos;
          }
        }

        // Play random worm slime noises
        if (Math.random() < 0.008) {
          soundEngine.playWormSlime();
        }

        // "que no camine": The dirt/stone pit stays permanently anchored at its spot!
        // Base Pit (pozo_tierra)
        const pozo = ragdoll.particles.find((part) => part.name === 'pozo_tierra');
        if (pozo) {
          const pozoH = pozo.boxDims ? (pozo.boxDims[1] / 2) * ragdoll.scale : 0.16;
          pozo.x = ragdoll.charPos.x;
          pozo.y = ragdoll.charPos.y + pozoH;
          pozo.z = ragdoll.charPos.z;
          pozo.oldX = pozo.x;
          pozo.oldY = pozo.y;
          pozo.oldZ = pozo.z;
          pozo.vx = 0;
          pozo.vy = 0;
          pozo.vz = 0;
          if (pozo.mesh) {
            pozo.mesh.position.set(pozo.x, pozo.y, pozo.z);
            pozo.mesh.rotation.set(0, 0, 0);
          }
        }

        // Support 3 tentacles (standard) or 4 tentacles (Cave Tentacle)
        const hasT4 = ragdoll.particles.some((p) => p.name.startsWith('t4_'));
        const tentacleCount = hasT4 ? 4 : 3;
        const tentacleBaseOffsets = hasT4
          ? [
              { x: 0.35, z: 0.0, angle: 0 },
              { x: 0.0, z: 0.35, angle: Math.PI / 2 },
              { x: -0.35, z: 0.0, angle: Math.PI },
              { x: 0.0, z: -0.35, angle: (3 * Math.PI) / 2 },
            ]
          : [
              { x: 0.22, z: 0.0, angle: 0 },
              { x: -0.11, z: 0.1905, angle: (2 * Math.PI) / 3 },
              { x: -0.11, z: -0.1905, angle: (4 * Math.PI) / 3 },
            ];

        // Initialize bite cooldown tracker if not present
        if (!ragdoll.tentacleBiteCooldowns) {
          ragdoll.tentacleBiteCooldowns = {};
        }

        const segLengths = [1.15, 1.05, 0.95, 0.85, 0.75];

        for (let t = 1; t <= tentacleCount; t++) {
          const baseOffset = tentacleBaseOffsets[t - 1];
          const prefix = `t${t}`;

          // Find head segment of this tentacle
          const pHead = ragdoll.particles.find((part) => part.name === `${prefix}_seg5`);
          let closestLimb: Particle3D | null = null;
          let closestLimbDist = Infinity;

          if (pHead && !pHead.dismembered && nearestTargetRagdoll) {
            const activeLimbs = nearestTargetRagdoll.particles.filter((pl) => !pl.dismembered && pl.health > 0);
            for (const limb of activeLimbs) {
              const d = pHead.x ? Math.sqrt((limb.x - pHead.x) ** 2 + (limb.y - pHead.y) ** 2 + (limb.z - pHead.z) ** 2) : Infinity;
              if (d < closestLimbDist) {
                closestLimbDist = d;
                closestLimb = limb;
              }
            }
          }

          // Check if nearest target is in front of this tentacle
          let isAttacking = false;
          let lashFactor = 0;
          if (nearestTarget && minDist < 4.5) {
            const dirToTarget = new THREE.Vector3().subVectors(nearestTarget, ragdoll.charPos);
            const targetAngle = Math.atan2(dirToTarget.x, dirToTarget.z);
            const angleDiff = Math.abs(Math.atan2(Math.sin(targetAngle - baseOffset.angle), Math.cos(targetAngle - baseOffset.angle)));
            if (angleDiff < Math.PI * 0.6) {
              isAttacking = true;
              lashFactor = Math.sin(time * 5.0 + t) * 0.45;
            }
          }

          // Root anchor point on the ground pit
          const rootX = ragdoll.charPos.x + baseOffset.x * ragdoll.scale;
          const rootY = ragdoll.charPos.y + 0.25 * ragdoll.scale;
          const rootZ = ragdoll.charPos.z + baseOffset.z * ragdoll.scale;

          let currentJointPos = new THREE.Vector3(rootX, rootY, rootZ);

          const totalSegments = 5;
          for (let s = 1; s <= totalSegments; s++) {
            const pName = `${prefix}_seg${s}` as BodyPartName;
            const p = ragdoll.particles.find((part) => part.name === pName);
            if (!p || p.dismembered) continue;

            const segNorm = s / totalSegments;
            const sLen = (segLengths[s - 1] || 0.9) * ragdoll.scale;

            // Unified biological spine curve: compute smooth angular deflection for this segment
            const wavePhase = time * 2.2 + t * 2.094 + s * 0.55;
            const swaySideAngle = Math.sin(wavePhase) * (0.18 + segNorm * 0.22 + lashFactor * 0.25);
            const swayPitchAngle = Math.cos(wavePhase * 0.85) * (0.15 + segNorm * 0.18) - (isAttacking ? 0.35 * segNorm : 0.08);

            const totalYaw = baseOffset.angle + swaySideAngle;
            const totalPitch = THREE.MathUtils.clamp(swayPitchAngle, -0.75, 0.75);

            // Compute unit tangent vector pointing upward along the tentacle spine
            let tangent = new THREE.Vector3(
              Math.sin(totalYaw) * Math.cos(totalPitch),
              Math.cos(totalPitch),
              Math.cos(totalYaw) * Math.cos(totalPitch)
            ).normalize();

            // If nearby target limb exists, smoothly blend tangent towards target with weight increasing near tip
            if (closestLimb && closestLimbDist < 4.5) {
              const toLimb = new THREE.Vector3(
                closestLimb.x - currentJointPos.x,
                closestLimb.y - currentJointPos.y,
                closestLimb.z - currentJointPos.z
              ).normalize();
              const lungeWeight = Math.pow(segNorm, 1.4) * 0.65;
              tangent.lerp(toLimb, lungeWeight).normalize();
            }

            // Segment center is halfway along the segment bone
            const segCenterX = currentJointPos.x + tangent.x * (sLen * 0.5);
            const segCenterY = Math.max(0.12, currentJointPos.y + tangent.y * (sLen * 0.5));
            const segCenterZ = currentJointPos.z + tangent.z * (sLen * 0.5);

            // Advance joint position to the tip of this segment (which is the base of next segment)
            currentJointPos.addScaledVector(tangent, sLen);

            p.vx = (segCenterX - p.x) / dt;
            p.vy = (segCenterY - p.y) / dt;
            p.vz = (segCenterZ - p.z) / dt;

            p.oldX = p.x;
            p.oldY = p.y;
            p.oldZ = p.z;

            p.x = segCenterX;
            p.y = segCenterY;
            p.z = segCenterZ;

            if (p.mesh) {
              p.mesh.position.set(p.x, p.y, p.z);
              p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
            }
          }

          // Realistically functional biting attack:
          if (pHead && !pHead.dismembered && closestLimb && nearestTargetRagdoll) {
            ragdoll.tentacleBiteCooldowns[t] = (ragdoll.tentacleBiteCooldowns[t] || 0) - dt;
            if (closestLimbDist < 1.45 && ragdoll.tentacleBiteCooldowns[t] <= 0) {
              ragdoll.tentacleBiteCooldowns[t] = 0.85; // Bite attack cooldown

              // Inflict damage to victim
              closestLimb.health -= 40;
              nearestTargetRagdoll.totalHealth -= 25;

              // Destroy a voxel block from the bitten victim
              if (closestLimb.voxelBlocks) {
                const activeBlocks = closestLimb.voxelBlocks.filter((b) => b.active);
                if (activeBlocks.length > 0) {
                  const block = activeBlocks[Math.floor(Math.random() * activeBlocks.length)];
                  block.active = false;
                  if (block.mesh) block.mesh.visible = false;
                  nearestTargetRagdoll.stats.destroyedBlocks++;
                  this.spawnVoxelDebris(
                    closestLimb.x + block.localPos.x,
                    closestLimb.y + block.localPos.y,
                    closestLimb.z + block.localPos.z,
                    0x881337, // Bloody flesh
                    6
                  );
                }
              }

              // Sound & Gore splatters
              soundEngine.playZombieBite();
              soundEngine.playBoneSnap();
              soundEngine.playBloodSplatter();
              this.spawnBloodChorro3D(closestLimb.x, closestLimb.y, closestLimb.z, new THREE.Vector3(0, 0.7, 0.3), 7);

              // Wound blood jets
              this.woundBloodJets.push({
                id: `worm_bite_jet_${Date.now()}_${t}`,
                ragdollId: nearestTargetRagdoll.id,
                particleName: closestLimb.name,
                localPos: new THREE.Vector3((Math.random() - 0.5) * 0.05, 0, (Math.random() - 0.5) * 0.05),
                localDir: new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.8, (Math.random() - 0.5) * 0.4).normalize(),
                timeLeft: 2.5,
                accumulator: 0,
              });

              if (closestLimb.health <= 0) {
                closestLimb.dismembered = true;
                nearestTargetRagdoll.stats.dismemberedLimbs++;
              }

              if (nearestTargetRagdoll.totalHealth <= 0) {
                this.killCharacter(nearestTargetRagdoll.id);
              }
            }
          }
        }

        // Disabled self-collisions and inter-tentacle anti-clipping as explicitly requested.
        // This prevents the tentacles from glitching, vibrating, or exploding.
        continue;
      }

      const isPlayer = ragdoll.id === playerControlledRagdollId || ragdoll.isControlled;
      let inputLen = 0;
      if (ragdoll.isCollapsed) {
        const pelvis = ragdoll.particles.find((p) => p.name === 'pelvis');
        if (pelvis) {
          ragdoll.charPos.set(pelvis.x, Math.max(-12.0, pelvis.y - 0.98 * ragdoll.scale), pelvis.z);
        }
        ragdoll.charVel.set(0, 0, 0);
        ragdoll.isGrounded = false;
      } else {
        const inputX = isPlayer ? inputMoveVector.x : 0;
        const inputY = isPlayer ? inputMoveVector.y : 0;
        inputLen = Math.sqrt(inputX * inputX + inputY * inputY);

        let moveDir = new THREE.Vector3();
        if (inputLen > 0.05) {
          moveDir.addScaledVector(cameraRight, inputX)
                 .addScaledVector(cameraForward, -inputY);
          moveDir.y = 0;
        }

        // Handle Gravity, Flight & Jumping
        if (this.isFlying && isPlayer) {
          ragdoll.charVel.y = 0;
          if (this.flyAscend) {
            ragdoll.charPos.y += 9.0 * dt;
          }
          if (this.flyDescend) {
            ragdoll.charPos.y = Math.max(-10.5, ragdoll.charPos.y - 9.0 * dt);
          }
          ragdoll.isGrounded = false;
          ragdoll.isJumping = false;
        } else {
          const currentGravity = this.isZeroGravity ? 0 : this.map.gravity.y;

          // Check if already inside a slime block BEFORE applying standard movement & gravity
          let insideSlimeBlock: any = null;
          
          if ((ragdoll as any).adheredSlimeBlockId) {
            // Find currently adhered block
            const currentBlock = this.voxelBlocks.find(b => b.id === (ragdoll as any).adheredSlimeBlockId);
            if (currentBlock && currentBlock.type === 'slime') {
              const blockCenter = new THREE.Vector3(currentBlock.x, currentBlock.y, currentBlock.z);
              const dist = ragdoll.charPos.distanceTo(blockCenter);
              const escapeLimit = 5.8;
              
              // Calculate ragdoll momentum to see if velocity and mass or running input is sufficient to snap the stretched slime
              const ragdollMass = ragdoll.particles ? ragdoll.particles.reduce((sum, p) => sum + p.mass, 0) : 80;
              const speed = ragdoll.charVel.length();
              const momentum = speed * ragdollMass;
              
              // Only when stretching far and sprinting fast can the player snap the adhered slime!
              const isPlayer = ragdoll.isControlled;
              const escapeByForce = dist > escapeLimit || (isPlayer
                ? (this.isSprinting && speed > 2.4 && dist > 4.5)
                : (momentum > 280 && dist > 4.5));

              if (!escapeByForce) {
                insideSlimeBlock = currentBlock;
              } else {
                // SNAP / ESCAPE IMMEDIATELY!
                soundEngine.playWormSlime();
                soundEngine.playImpact(1.0);
                this.spawnJellyDebris(ragdoll.charPos.x, ragdoll.charPos.y + 0.8, ragdoll.charPos.z, 'slime', currentBlock.color, 18);

                // Recoil snap vibration
                if (currentBlock.shearVel) {
                  const stretchVec = ragdoll.charPos.clone().sub(blockCenter);
                  currentBlock.shearVel.copy(stretchVec.multiplyScalar(-18.0));
                }
                if (currentBlock.wobbleVel) {
                  currentBlock.wobbleVel.set(
                    (Math.random() - 0.5) * 14,
                    (Math.random() - 0.5) * 14,
                    (Math.random() - 0.5) * 14
                  );
                }
                if (currentBlock.wobbleScale) {
                  currentBlock.wobbleScale.set(1.4, 0.5, 1.4);
                }
                
                // Connection is completely broken! The block acts as a passive draggable prop instead of jumping.
                currentBlock.isPursuing = false;
                currentBlock.attachedTargetPos = undefined;

                (ragdoll as any).adheredSlimeBlockId = undefined;
              }
            } else {
              (ragdoll as any).adheredSlimeBlockId = undefined;
            }
          }

          if (!insideSlimeBlock) {
            // Check for new slime block penetration entry
            // "si algo cae encima o de lado fuerte debe enterrarse y las paredes dejar que pase hacia adentro"
            const lateralSpeed = Math.hypot(ragdoll.charVel.x, ragdoll.charVel.z);
            const isFallingHard = ragdoll.charVel.y < -0.7;
            const isHittingSideHard = lateralSpeed > 0.9 || inputLen > 0.4;

            for (const vb of this.voxelBlocks) {
              if (vb.type === 'slime') {
                const halfS = vb.size / 2;
                const dx = Math.abs(ragdoll.charPos.x - vb.x);
                const dy = ragdoll.charPos.y - vb.y;
                const dz = Math.abs(ragdoll.charPos.z - vb.z);

                if (dx < halfS + 0.35 && dz < halfS + 0.35 && dy > -halfS - 1.85 && dy < halfS + 0.25) {
                  // If falling with downward force or colliding into side strongly, penetrate and bury inside!
                  if (isFallingHard || isHittingSideHard || dy < halfS - 0.2) {
                    insideSlimeBlock = vb;
                    (ragdoll as any).adheredSlimeBlockId = vb.id;
                    soundEngine.playWormSlime();
                    soundEngine.playImpact(0.75);
                    this.spawnJellyDebris(ragdoll.charPos.x, ragdoll.charPos.y + 0.5, ragdoll.charPos.z, 'slime', vb.color, 6);
                    break;
                  }
                }
              }
            }
          }

          if (insideSlimeBlock) {
            // HIGH VISCOSITY DRAG:
            // "donde las paredes al frenarse objeto apriete y no deje escapar tan facilmente"
            // Rapidly brakes character velocity horizontally and vertically inside the gelatinous medium
            const dragValue = 9.5; 
            ragdoll.charVel.x *= Math.exp(-dragValue * dt);
            ragdoll.charVel.z *= Math.exp(-dragValue * dt);
            
            // Cushion vertical falling & gravity accumulation
            ragdoll.charVel.y += currentGravity * dt * 0.10; // 90% gravity neutralized inside slime
            ragdoll.charVel.y *= Math.exp(-dragValue * dt);

            ragdoll.charPos.x += ragdoll.charVel.x * dt;
            ragdoll.charPos.y += ragdoll.charVel.y * dt;
            ragdoll.charPos.z += ragdoll.charVel.z * dt;

            // Mark block as actively stretched by this character
            insideSlimeBlock.attachedTargetPos = ragdoll.charPos.clone();
          } else {
            // Standard air physics
            ragdoll.charVel.y += currentGravity * dt;
            ragdoll.charPos.y += ragdoll.charVel.y * dt;
          }

          // Ground / Voxel block surface detection for standing
          let groundHeight = this.getGroundHeight(ragdoll.charPos.x, ragdoll.charPos.z, ragdoll.charPos.y);

          for (const vb of this.voxelBlocks) {
            const halfS = vb.size / 2;
            const dx = Math.abs(ragdoll.charPos.x - vb.x);
            const dz = Math.abs(ragdoll.charPos.z - vb.z);

            if (vb.type === 'slime') {
              // Slime blocks act as SOLID support if walking/standing gently on top and not buried inside!
              if ((ragdoll as any).adheredSlimeBlockId === vb.id) {
                continue; // Inside the slime, custom viscoelastic damping handles movement
              }
              if (dx < halfS + 0.35 && dz < halfS + 0.35) {
                const currentHeight = vb.wobbleScale ? vb.wobbleScale.y : 1.0;
                const topY = vb.y + (halfS * currentHeight);
                if (ragdoll.charPos.y >= topY - 0.30 && ragdoll.charPos.y <= topY + 0.50 && topY > groundHeight) {
                  groundHeight = topY;
                  // Dynamic vertical squish & lateral bulge when standing on top
                  if (vb.wobbleVel) {
                    vb.wobbleVel.y += -14.0 * dt;
                    vb.wobbleVel.x += 7.0 * dt;
                    vb.wobbleVel.z += 7.0 * dt;
                  }
                }
              } else if (dx < halfS + 0.50 && dz < halfS + 0.50 && Math.abs(ragdoll.charPos.y - vb.y) < halfS + 0.40) {
                // Side push squish: block flattens inward on the pushed side and bulges up
                if (vb.wobbleVel) {
                  const pushX = Math.sign(vb.x - ragdoll.charPos.x);
                  const pushZ = Math.sign(vb.z - ragdoll.charPos.z);
                  vb.wobbleVel.x += pushX * 10.0 * dt;
                  vb.wobbleVel.z += pushZ * 10.0 * dt;
                  vb.wobbleVel.y += 6.0 * dt;
                }
              }
              continue;
            }

            if (dx < halfS + 0.25 && dz < halfS + 0.25) {
              const topY = vb.y + halfS;
              if (ragdoll.charPos.y >= topY - 0.35 && topY > groundHeight) {
                groundHeight = topY;
              }
            }
          }

          // Bed surface detection for standing/walking on top of bed mattress
          for (const bed of this.beds) {
            const halfW = bed.width / 2;
            const halfD = bed.depth / 2;
            const dx = Math.abs(ragdoll.charPos.x - bed.x);
            const dz = Math.abs(ragdoll.charPos.z - bed.z);
            if (dx < halfW + 0.25 && dz < halfD + 0.25) {
              const topY = bed.y + 0.50; // mattress height
              if (ragdoll.charPos.y >= topY - 0.35 && topY > groundHeight) {
                groundHeight = topY;
              }
            }
          }

          if (insideSlimeBlock) {
            const blockCenter = new THREE.Vector3(insideSlimeBlock.x, insideSlimeBlock.y, insideSlimeBlock.z);
            const stretchVec = ragdoll.charPos.clone().sub(blockCenter);
            const dist = stretchVec.length();

            // "al frenarse objeto apriete y no deje escapar tan facilmente"
            // The slime contracts around the character, tightening its grip!
            if (insideSlimeBlock.wobbleScale) {
              insideSlimeBlock.wobbleScale.set(0.80, 0.80, 0.80);
            }

            if (ragdoll.charVel.y < -1.5) {
              // High velocity impact deceleration
              const impactY = ragdoll.charVel.y;
              if (insideSlimeBlock.wobbleVel) {
                insideSlimeBlock.wobbleVel.y -= Math.min(8.0, Math.max(1.0, Math.abs(impactY) * 0.45));
                insideSlimeBlock.wobbleVel.x += (Math.random() - 0.5) * 1.5;
                insideSlimeBlock.wobbleVel.z += (Math.random() - 0.5) * 1.5;
              }
              soundEngine.playImpact(0.85);
              soundEngine.playWormSlime();
              this.spawnJellyDebris(ragdoll.charPos.x, ragdoll.charPos.y, ragdoll.charPos.z, 'slime', insideSlimeBlock.color, 8);
              ragdoll.charVel.y *= 0.50;
            } else {
              // Trapped and gripped tight by slime!
              ragdoll.isGrounded = false;
              ragdoll.isJumping = false;

              // Viscous pullback tension to trap character firmly
              const escapeLimit = 2.4;
              const tensionPower = 38.0;
              const pullBack = stretchVec.clone().normalize().multiplyScalar(-tensionPower * (dist / escapeLimit));
              
              // Prevent floating: if character is near floor, do not let upward tension lift them!
              if (ragdoll.charPos.y <= groundHeight + 0.1 && pullBack.y > 0) {
                pullBack.y = 0;
              }
              
              ragdoll.charVel.addScaledVector(pullBack, dt);

              if (insideSlimeBlock.wobbleVel) {
                insideSlimeBlock.wobbleVel.y += -0.8;
                insideSlimeBlock.wobbleVel.x += -0.4;
                insideSlimeBlock.wobbleVel.z += -0.4;
              }

              if (Math.random() < 0.08) {
                soundEngine.playWormSlime();
                this.spawnJellyDebris(ragdoll.charPos.x, ragdoll.charPos.y + 0.5, ragdoll.charPos.z, 'slime', insideSlimeBlock.color, 1);
              }
            }
          }

          // Apply grounding or standard resolution
          if (!insideSlimeBlock && groundHeight > -9000 && ragdoll.charPos.y <= groundHeight) {
            const fallingSpeed = ragdoll.charVel.y;
            if (!ragdoll.isGrounded && fallingSpeed < -1.4) {
              if (fallingSpeed < -7.0) {
                // Violent impact from a high fall! Collapses into physics ragdoll with bone fracture and blood
                (ragdoll as any).landingCompression = 0.45;
                soundEngine.playImpact(1.0);
                soundEngine.playBoneSnap();
                ragdoll.stats.brokenBones += 2;
                this.spawnBloodChorro3D(ragdoll.charPos.x, groundHeight + 0.1, ragdoll.charPos.z, new THREE.Vector3(0, 1, 0), 2);
                this.collapseRagdoll(ragdoll, new THREE.Vector3(ragdoll.charVel.x * 0.4, -0.5, ragdoll.charVel.z * 0.4));
                return;
              } else {
                (ragdoll as any).landingCompression = Math.min(0.35, Math.abs(fallingSpeed) * 0.045);
                soundEngine.playImpact(Math.min(0.85, Math.abs(fallingSpeed) * 0.08));
              }
            }
            ragdoll.charPos.y = groundHeight;
            ragdoll.charVel.y = 0;
            ragdoll.isGrounded = true;
            ragdoll.isJumping = false;
          } else if (insideSlimeBlock) {
            if (groundHeight > -9000 && ragdoll.charPos.y <= groundHeight) {
              ragdoll.charPos.y = groundHeight;
              ragdoll.charVel.y = 0;
              ragdoll.isGrounded = true;
              ragdoll.isJumping = false;
            } else {
              ragdoll.isGrounded = false;
            }
          } else {
            ragdoll.isGrounded = false;
          }

          if ((ragdoll as any).landingCompression !== undefined && (ragdoll as any).landingCompression > 0) {
            (ragdoll as any).landingCompression = Math.max(0, (ragdoll as any).landingCompression - dt * 1.6);
          }
        }

        // Movement & Character Facing Rotation
        if (inputLen > 0.05 && moveDir.lengthSq() > 0.001) {
          moveDir.normalize();

          // Turn character facing angle
          if (ragdoll.isAiming && !isFreeCamAiming) {
            // When aiming (without free cam), do NOT turn to face movement direction! Always face camera view direction!
            const camAngle = Math.atan2(cameraForward.x, cameraForward.z);
            let angleDiff = camAngle - ragdoll.facingAngle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            ragdoll.facingAngle += angleDiff * Math.min(1.0, 14.0 * dt);
          } else {
            // Turn character to face movement direction when walking normally
            const targetAngle = Math.atan2(moveDir.x, moveDir.z);
            let angleDiff = targetAngle - ragdoll.facingAngle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            ragdoll.facingAngle += angleDiff * Math.min(1.0, 14.0 * dt);
          }

          const speedMultiplier = 0.1 + 1.9 * (this.speed / 100);
          const moveSpeed = (this.isSprinting ? 12.5 : 4.4) * speedMultiplier;
          ragdoll.charVel.x = moveDir.x * moveSpeed;
          ragdoll.charVel.z = moveDir.z * moveSpeed;

          // In ragdoll walk, advance forward upon foot strike / stance phase, holding back during mid-air leg swing before planting the foot
          const stepWeight = ragdoll.isWalkingRagdoll ? Math.pow(Math.abs(Math.cos(ragdoll.walkCycle)), 1.4) : 1.0;
          const strideVelocityFactor = ragdoll.isWalkingRagdoll ? (0.35 + 0.85 * stepWeight) : 1.0;

          ragdoll.charPos.x += ragdoll.charVel.x * strideVelocityFactor * dt;
          ragdoll.charPos.z += ragdoll.charVel.z * strideVelocityFactor * dt;

          ragdoll.walkCycle += dt * (this.isSprinting ? 28.0 : 15.0);
        } else {
          // If it is a spawned walking ragdoll NPC (not player, not zombie, not werewolf), make them walk and wander around!
          if (!isPlayer && ragdoll.isWalkingRagdoll && !ragdoll.isZombie && !ragdoll.isWerewolf) {
            if (ragdoll.wanderTimer === undefined) ragdoll.wanderTimer = 0;
            if (ragdoll.wanderAngle === undefined) ragdoll.wanderAngle = ragdoll.facingAngle;

            ragdoll.wanderTimer -= dt;
            if (ragdoll.wanderTimer <= 0) {
              ragdoll.wanderTimer = 2.5 + Math.random() * 3.5; // Change wander direction every 2.5 - 6 seconds
              ragdoll.wanderAngle = ragdoll.facingAngle + (Math.random() - 0.5) * Math.PI * 0.9;
            }

            // Smoothly steer facing angle towards wander angle
            let diff = ragdoll.wanderAngle - ragdoll.facingAngle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            ragdoll.facingAngle += diff * Math.min(1.0, 3.5 * dt);

            const moveSpeed = 1.9; // Smooth natural active walking speed
            ragdoll.charVel.x = Math.sin(ragdoll.facingAngle) * moveSpeed;
            ragdoll.charVel.z = Math.cos(ragdoll.facingAngle) * moveSpeed;

            // Advance forward upon foot plant, holding back during mid-air leg swing before planting foot
            const stepWeight = Math.pow(Math.abs(Math.cos(ragdoll.walkCycle)), 1.4);
            const strideVelocityFactor = 0.35 + 0.85 * stepWeight;

            ragdoll.charPos.x += ragdoll.charVel.x * strideVelocityFactor * dt;
            ragdoll.charPos.z += ragdoll.charVel.z * strideVelocityFactor * dt;
            ragdoll.walkCycle += dt * 15.0;
          } else {
            ragdoll.charVel.x *= 0.8;
            ragdoll.charVel.z *= 0.8;
            ragdoll.walkCycle = THREE.MathUtils.lerp(ragdoll.walkCycle, 0, Math.min(1.0, 6.0 * dt));

            // When standing still AND aiming (and free camera is NOT active), turn character to face camera view direction
            if (ragdoll.isAiming && !isFreeCamAiming) {
              const camAngle = Math.atan2(cameraForward.x, cameraForward.z);
              let angleDiff = camAngle - ragdoll.facingAngle;
              while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
              while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
              ragdoll.facingAngle += angleDiff * Math.min(1.0, 12.0 * dt);
            }
          }
        }

        // 1. Solid house wall block collisions (horizontal push-out)
        for (const block of this.houseBlocks) {
          // Skip if block is under the player's feet (floor) or far above head (ceiling)
          if (block.y + block.height / 2 <= ragdoll.charPos.y + 0.15) continue;
          if (block.y - block.height / 2 >= ragdoll.charPos.y + 1.85) continue;

          const dx = ragdoll.charPos.x - block.x;
          const dy = (ragdoll.charPos.y + 0.9) - block.y;
          const dz = ragdoll.charPos.z - block.z;
          const overlapX = (block.width / 2 + 0.35) - Math.abs(dx);
          const overlapY = (block.height / 2 + 0.8) - Math.abs(dy);
          const overlapZ = (block.depth / 2 + 0.35) - Math.abs(dz);
          if (overlapX > 0 && overlapY > 0 && overlapZ > 0) {
            if (overlapX < overlapZ) {
              ragdoll.charPos.x += Math.sign(dx) * overlapX;
              ragdoll.charVel.x = 0;
            } else {
              ragdoll.charPos.z += Math.sign(dz) * overlapZ;
              ragdoll.charVel.z = 0;
            }
          }
        }

        // 1.5. Continuous 3D Vertical Voxel Tube & Branching Cave network corridor collisions (zero invisible seams)
        for (const tube of this.ragdolls) {
          if ((tube.name === 'Cave Tentacle' || tube.id.startsWith('cave_tentacle')) && tube.isAlive) {
            const cubeSize = 0.88 * tube.scale;
            const spawnY = tube.charPos.y;
            const bottomY = spawnY - 12 * cubeSize;

            const tdx = ragdoll.charPos.x - tube.charPos.x;
            const tdz = ragdoll.charPos.z - tube.charPos.z;
            const distToVerticalAxis = Math.hypot(tdx, tdz);

            // Is the character near the tube/cave system?
            if (distToVerticalAxis <= 15.0 * cubeSize) {
              const charFeetY = ragdoll.charPos.y;
              const charHeadY = ragdoll.charPos.y + 1.8;

              // Are we underground? (i.e. inside the cave system)
              if (charFeetY <= spawnY - 0.5) {
                // A. Check if inside vertical shaft
                const inVerticalShaft = distToVerticalAxis <= 1.35 * cubeSize && charFeetY >= bottomY - 0.5 && charFeetY <= spawnY;

                // B. Check if inside any of the branches
                const caveBranches = [
                  { angle: -0.4 * Math.PI, length: 10, dy: -0.1 },
                  { angle: 0.35 * Math.PI, length: 11, dy: 0.1 },
                  { angle: -0.85 * Math.PI, length: 9, dy: 0.0 },
                  { angle: 0.8 * Math.PI, length: 12, dy: 0.15 },
                ];

                let insideAnyBranch = false;
                let activeBranchIndex = -1;
                let activeBranchDist = 0;
                let activeBranchPerp = 0;

                for (let bIdx = 0; bIdx < caveBranches.length; bIdx++) {
                  const br = caveBranches[bIdx];
                  const sinA = Math.sin(br.angle);
                  const cosA = Math.cos(br.angle);
                  const dist = tdx * sinA + tdz * cosA;
                  const perp = Math.abs(tdx * (-cosA) - tdz * sinA);

                  if (dist >= 0 && dist <= br.length * cubeSize && perp <= 1.35 * cubeSize) {
                    insideAnyBranch = true;
                    activeBranchIndex = bIdx;
                    activeBranchDist = dist;
                    activeBranchPerp = perp;
                    break;
                  }
                }

                if (inVerticalShaft) {
                  // Constrain within vertical shaft walls:
                  const maxRadius = 1.35 * cubeSize - 0.32;
                  if (distToVerticalAxis > maxRadius) {
                    const pushRatio = maxRadius / distToVerticalAxis;
                    ragdoll.charPos.x = tube.charPos.x + tdx * pushRatio;
                    ragdoll.charPos.z = tube.charPos.z + tdz * pushRatio;
                    ragdoll.charVel.x = 0;
                    ragdoll.charVel.z = 0;
                  }
                } else if (insideAnyBranch) {
                  const br = caveBranches[activeBranchIndex];
                  const sinA = Math.sin(br.angle);
                  const cosA = Math.cos(br.angle);

                  // 1. Constrain within left and right tunnel walls
                  const maxPerp = 1.35 * cubeSize - 0.32;
                  if (activeBranchPerp > maxPerp) {
                    // Push back toward branch line
                    const perpDirX = -cosA;
                    const perpDirZ = sinA;
                    // Determine which side of center line player is on
                    const side = Math.sign(tdx * perpDirX + tdz * perpDirZ);
                    const centerLineX = tube.charPos.x + sinA * activeBranchDist;
                    const centerLineZ = tube.charPos.z + cosA * activeBranchDist;
                    ragdoll.charPos.x = centerLineX + side * maxPerp * perpDirX;
                    ragdoll.charPos.z = centerLineZ + side * maxPerp * perpDirZ;
                    ragdoll.charVel.x = 0;
                    ragdoll.charVel.z = 0;
                  }

                  // 2. Constrain below tunnel ceiling
                  const cy = bottomY + (activeBranchDist / cubeSize) * br.dy * cubeSize;
                  const ceilingY = cy + 1.8 * cubeSize;
                  if (charHeadY > ceilingY - 0.25) {
                    ragdoll.charPos.y = ceilingY - 0.25 - 1.8;
                    if (ragdoll.charVel.y > 0) ragdoll.charVel.y = 0;
                  }
                } else {
                  // Out of bounds / glitched inside solid rock! Push back to nearest allowed zone.
                  const pullForce = 0.15;
                  ragdoll.charPos.x = THREE.MathUtils.lerp(ragdoll.charPos.x, tube.charPos.x, pullForce);
                  ragdoll.charPos.z = THREE.MathUtils.lerp(ragdoll.charPos.z, tube.charPos.z, pullForce);
                }
              } else {
                // Character is on surface Y, but near the opening of the vertical tube
                if (distToVerticalAxis < 1.35 * cubeSize - 0.2) {
                  // If they step in, they can go down, no restriction here.
                } else if (distToVerticalAxis < 2.5 * cubeSize) {
                  // Push away from the vertical tube outer rim/block walls if they are above but not stepping in
                  const minRimRadius = 1.35 * cubeSize;
                  if (distToVerticalAxis < minRimRadius) {
                    const pushFactor = minRimRadius / distToVerticalAxis;
                    ragdoll.charPos.x = tube.charPos.x + tdx * pushFactor;
                    ragdoll.charPos.z = tube.charPos.z + tdz * pushFactor;
                    ragdoll.charVel.x = 0;
                    ragdoll.charVel.z = 0;
                  }
                }
              }
            }
          }
        }

        // 2. Door collision: if door is closed, check collision
        for (const d of this.doors) {
          if (Math.abs(d.currentAngle) < 0.15) {
            const dx = ragdoll.charPos.x - d.x;
            const dz = ragdoll.charPos.z - d.z;
            const overlapX = (d.width / 2 + 0.35) - Math.abs(dx);
            const overlapZ = (d.depth / 2 + 0.35) - Math.abs(dz);
            if (overlapX > 0 && overlapZ > 0) {
              if (overlapX < overlapZ) {
                ragdoll.charPos.x += Math.sign(dx) * overlapX;
                ragdoll.charVel.x = 0;
              } else {
                ragdoll.charPos.z += Math.sign(dz) * overlapZ;
                ragdoll.charVel.z = 0;
              }
            }
          }
        }

        // 3. Bed collision: horizontal block push-out if walking into side of bed
        for (const bed of this.beds) {
          if (ragdoll.charPos.y < bed.y + 0.40) {
            const dx = ragdoll.charPos.x - bed.x;
            const dz = ragdoll.charPos.z - bed.z;
            const overlapX = (bed.width / 2 + 0.35) - Math.abs(dx);
            const overlapZ = (bed.depth / 2 + 0.35) - Math.abs(dz);
            if (overlapX > 0 && overlapZ > 0) {
              if (overlapX < overlapZ) {
                ragdoll.charPos.x += Math.sign(dx) * overlapX;
                ragdoll.charVel.x = 0;
              } else {
                ragdoll.charPos.z += Math.sign(dz) * overlapZ;
                ragdoll.charVel.z = 0;
              }
            }
          }
        }

        // 4. Voxel block collision: horizontal push-out if walking into obstacles/walls
        for (const vb of this.voxelBlocks) {
          const halfS = vb.size / 2;
          if (ragdoll.charPos.y < vb.y + halfS - 0.15 && ragdoll.charPos.y > vb.y - halfS - 1.6) {
            const dx = ragdoll.charPos.x - vb.x;
            const dz = ragdoll.charPos.z - vb.z;
            const overlapX = (halfS + 0.35) - Math.abs(dx);
            const overlapZ = (halfS + 0.35) - Math.abs(dz);
            if (overlapX > 0 && overlapZ > 0) {
              if (vb.type === 'slime') {
                continue; // Slime penetration, adhesion, tension, and drag are handled in the unified vertical update section!
              }

              if (overlapX < overlapZ) {
                ragdoll.charPos.x += Math.sign(dx) * overlapX;
                ragdoll.charVel.x = 0;
              } else {
                ragdoll.charPos.z += Math.sign(dz) * overlapZ;
                ragdoll.charVel.z = 0;
              }

              // Physical jelly feedback when characters run into skin blocks (excluding slime)!
              if (vb.isJelly) {
                const speed = Math.hypot(ragdoll.charVel.x, ragdoll.charVel.z);
                const force = Math.max(1.5, Math.min(6.0, speed * 1.8));
                if (vb.wobbleVel) {
                  vb.wobbleVel.y += -force * 0.4;
                  vb.wobbleVel.x += (Math.random() - 0.5) * force;
                  vb.wobbleVel.z += (Math.random() - 0.5) * force;
                }
                if (vb.shearVel) {
                  vb.shearVel.x += Math.sign(dx) * force * 0.3;
                  vb.shearVel.z += Math.sign(dz) * force * 0.3;
                }
              }
            }
          }
        }
      }

      this.applyFluidEmissionSpasms(ragdoll, dt);

      // Hit Stagger Recovery for Ragdoll Walk (Que ragdoll walk al golpear no se buguee)
      if (ragdoll.hitStaggerTimer !== undefined && ragdoll.hitStaggerTimer > 0) {
        ragdoll.hitStaggerTimer -= dt;
        if (ragdoll.hitStaggerTimer <= 0) {
          if (ragdoll.isAlive && (ragdoll.wasWalkingRagdollBeforeHit || ragdoll.isWalkingRagdoll)) {
            ragdoll.isWalkingRagdoll = true;
            ragdoll.wasWalkingRagdollBeforeHit = false;
            const pelvis = ragdoll.particles.find((p) => p.name === 'pelvis') || ragdoll.particles[0];
            if (pelvis) {
              ragdoll.charPos.x = pelvis.x;
              ragdoll.charPos.z = pelvis.z;
              const groundH = this.getGroundHeight(ragdoll.charPos.x, ragdoll.charPos.z, ragdoll.charPos.y);
              ragdoll.charPos.y = groundH > -9000 ? groundH : Math.max(-12.0, pelvis.y - 0.98 * ragdoll.scale);
            }
            ragdoll.charVel.set(0, 0, 0);
            this.resetRagdollParticlesToKinematicPose(ragdoll);
          }
        }
      }

      const sinYaw = Math.sin(ragdoll.facingAngle);
      const cosYaw = Math.cos(ragdoll.facingAngle);

      const isWalking = (isPlayer ? inputLen > 0.05 : (Math.sqrt(ragdoll.charVel.x * ragdoll.charVel.x + ragdoll.charVel.z * ragdoll.charVel.z) > 0.15)) && ragdoll.isGrounded;
      const legSwing = isWalking ? Math.sin(ragdoll.walkCycle) * 0.22 : 0;
      let legSwingL = legSwing;
      let legSwingR = -legSwing;
      if (ragdoll.isZombie && isWalking) {
        // Drag left leg, swing right leg normally
        legSwingL = Math.sin(ragdoll.walkCycle) * 0.18;
        legSwingR = -Math.sin(ragdoll.walkCycle + 0.3) * 0.42;
      }

      // Emote Dance Blend Logic (Baile 1 transition & leg motion)
      if (ragdoll.activeEmote) {
        if (isWalking) {
          ragdoll.emoteBlend = Math.max(0, (ragdoll.emoteBlend || 0) - dt * 5.0);
          if (ragdoll.emoteBlend <= 0) ragdoll.activeEmote = null;
        } else {
          ragdoll.emoteTimer = (ragdoll.emoteTimer || 0) + dt;
          ragdoll.emoteBlend = Math.min(1.0, (ragdoll.emoteBlend || 0) + dt * 4.0);
        }
      } else {
        ragdoll.emoteBlend = Math.max(0, (ragdoll.emoteBlend || 0) - dt * 5.0);
      }

      const emoteBlend = ragdoll.emoteBlend || 0;
      const danceT = (ragdoll.emoteTimer || 0) * 8.0;

      let emoteLegL = 0;
      let emoteLegR = 0;
      let emoteKneeL = 0;
      let emoteKneeR = 0;
      let emoteFootL = 0;
      let emoteFootR = 0;

      if (emoteBlend > 0) {
        emoteLegL = Math.sin(danceT) * 0.45;
        emoteLegR = -Math.sin(danceT) * 0.45;
        emoteKneeL = Math.max(0, Math.sin(danceT)) * 0.55;
        emoteKneeR = Math.max(0, -Math.sin(danceT)) * 0.55;
        emoteFootL = Math.max(0, Math.sin(danceT)) * 0.14;
        emoteFootR = Math.max(0, -Math.sin(danceT)) * 0.14;
      }

      legSwingL = THREE.MathUtils.lerp(legSwingL, emoteLegL, emoteBlend);
      legSwingR = THREE.MathUtils.lerp(legSwingR, emoteLegR, emoteBlend);
      const armSwing = isWalking ? -legSwing * 0.7 : (ragdoll.isJumping ? 0.35 : 0);
      const bodyBounce = 0;

      // Realistic leg lifting during swing phase (lift legs and bend knees dynamically!)
      const liftL = isWalking ? Math.max(0, Math.sin(ragdoll.walkCycle)) * 0.15 : 0;
      const liftR = isWalking ? Math.max(0, -Math.sin(ragdoll.walkCycle)) * 0.15 : 0;

      // Resting / Idle Breathing animation cycle (animación de reposo)
      const breathing = Math.sin(performance.now() * 0.0028) * 0.02;

      // 3D Realistic Mouth Breathing Audio Synthesizer (Respiración desde la boca)
      if (ragdoll.isAlive || ragdoll.isWalkingRagdoll) {
        const rAny = ragdoll as any;
        if (!rAny.lastBreathTime) rAny.lastBreathTime = 0;
        const nowSec = performance.now() / 1000;
        const breathInterval = isWalking ? 1.8 : 3.4;
        if (!rAny.lastBreathTime) rAny.lastBreathTime = 0;
        if (nowSec - rAny.lastBreathTime > breathInterval) {
          rAny.lastBreathTime = nowSec;
          rAny.breathPhase = rAny.breathPhase === 'exhale' ? 'inhale' : 'exhale';
          const cabeza = ragdoll.particles.find((p) => p.name === 'cabeza');
          if (cabeza && this.camera) {
            const mouthPos = {
              x: cabeza.x + sinYaw * 0.15,
              y: cabeza.y + 0.05,
              z: cabeza.z + cosYaw * 0.15,
            };
            const camPos = {
              x: this.camera.position.x,
              y: this.camera.position.y,
              z: this.camera.position.z,
            };
            soundEngine.playBreathing(rAny.breathPhase, isWalking ? 0.85 : 0.60, mouthPos, camPos);
            this.spawnSoundWave(new THREE.Vector3(mouthPos.x, mouthPos.y, mouthPos.z), 2.5, 0.4, 0xa5f3fc);
          }
        }
      }

      let zSwayX = 0;
      let zSwayZ = 0;
      if (ragdoll.isZombie) {
        zSwayX = 0.28 + Math.sin(performance.now() * 0.0035) * 0.08; // Lean forward like a corpse
        zSwayZ = Math.sin(performance.now() * 0.002) * 0.12 + Math.sin(ragdoll.walkCycle) * 0.10; // Left-to-right shambling sway
      }

      // Gait and Walk Bobbing
      const walkBob = isWalking ? Math.abs(Math.sin(ragdoll.walkCycle)) * 0.025 : 0;

      // Heights from base for Tall 2.0m Character with natural walk bobbing & breathing
      const pelvisY = 0.95 - walkBob;
      const ombligoBajoY = 1.07 - walkBob * 0.9 + breathing * 0.2;
      const ombligoY = 1.19 - walkBob * 0.8 + breathing * 0.4;
      const torsoY = 1.31 - walkBob * 0.7 + breathing * 0.6;
      const pechoBajoY = 1.43 - walkBob * 0.5 + breathing * 0.8;
      const pechobaseY = 1.55 - walkBob * 0.4 + breathing;
      const cuelloY = 1.70 - walkBob * 0.3 + breathing * 0.9;
      const cabezaY = 1.91 - walkBob * 0.2 + breathing * 0.8;

      // Leg positions: Forward kinematics with constant anatomical bone distances and natural knee flexion ("ragdoll walk")
      // Left Leg Kinematics (Hip joint at pelvisY = 0.95 - walkBob)
      const stepPhaseL = Math.sin(ragdoll.walkCycle);
      const isSwingL = stepPhaseL > 0;
      const swingMagL = Math.abs(stepPhaseL);

      // Swing leg lifts high and flexes knee backwards; stance leg stays straight on the ground stepping forward firmly
      const kneeFlexL = THREE.MathUtils.lerp(isWalking && isSwingL ? Math.sin(swingMagL * Math.PI) * 0.45 : 0, emoteKneeL, emoteBlend);
      const footLiftL = THREE.MathUtils.lerp(isWalking && isSwingL ? Math.sin(swingMagL * Math.PI) * 0.08 : 0, emoteFootL, emoteBlend);
      const thetaHipL = legSwingL;
      // Anatomical knee flexion: knee bends backwards, so shin angle rotates backwards relative to hip
      const thetaShinL = thetaHipL - kneeFlexL;

      const hipJointY_L = pelvisY;
      const thighL_Z = Math.sin(thetaHipL) * 0.21;
      const thighL_Y = hipJointY_L - Math.cos(thetaHipL) * 0.21;

      const kneeJointL_Z = Math.sin(thetaHipL) * 0.42;
      const kneeJointL_Y = hipJointY_L - Math.cos(thetaHipL) * 0.42;

      const rodillaL_Z = kneeJointL_Z;
      const rodillaL_Y = kneeJointL_Y;

      const shinL_Z = kneeJointL_Z + Math.sin(thetaShinL) * 0.2325;
      const shinL_Y = kneeJointL_Y - Math.cos(thetaShinL) * 0.2325;

      const ankleL_Z = kneeJointL_Z + Math.sin(thetaShinL) * 0.465;
      const ankleL_Y = Math.max(0.065, kneeJointL_Y - Math.cos(thetaShinL) * 0.465 + footLiftL);

      // Right Leg Kinematics (Hip joint at pelvisY = 0.95 - walkBob)
      const stepPhaseR = -Math.sin(ragdoll.walkCycle);
      const isSwingR = stepPhaseR > 0;
      const swingMagR = Math.abs(stepPhaseR);

      const kneeFlexR = THREE.MathUtils.lerp(isWalking && isSwingR ? Math.sin(swingMagR * Math.PI) * 0.45 : 0, emoteKneeR, emoteBlend);
      const footLiftR = THREE.MathUtils.lerp(isWalking && isSwingR ? Math.sin(swingMagR * Math.PI) * 0.08 : 0, emoteFootR, emoteBlend);
      const thetaHipR = legSwingR;
      // Anatomical knee flexion: knee bends backwards, so shin angle rotates backwards relative to hip
      const thetaShinR = thetaHipR - kneeFlexR;

      const hipJointY_R = pelvisY;
      const thighR_Z = Math.sin(thetaHipR) * 0.21;
      const thighR_Y = hipJointY_R - Math.cos(thetaHipR) * 0.21;

      const kneeJointR_Z = Math.sin(thetaHipR) * 0.42;
      const kneeJointR_Y = hipJointY_R - Math.cos(thetaHipR) * 0.42;

      const rodillaR_Z = kneeJointR_Z;
      const rodillaR_Y = kneeJointR_Y;

      const shinR_Z = kneeJointR_Z + Math.sin(thetaShinR) * 0.2325;
      const shinR_Y = kneeJointR_Y - Math.cos(thetaShinR) * 0.2325;

      const ankleR_Z = kneeJointR_Z + Math.sin(thetaShinR) * 0.465;
      const ankleR_Y = Math.max(0.065, kneeJointR_Y - Math.cos(thetaShinR) * 0.465 + footLiftR);

      // Arm positions & Poses (Unarmed vs Armed Idle vs Armed Aiming vs Zombie - locked to shoulder pivots)
      const ragdollArmSwing = ragdoll.isWalkingRagdoll ? (Math.sin(ragdoll.walkCycle) * 0.35) : armSwing;
      let hombL_rotX = -ragdollArmSwing * 0.4;
      let hombR_rotX = ragdollArmSwing * 0.4;

      let armL_rotX = -ragdollArmSwing + breathing * 0.15;
      let armR_rotX = ragdollArmSwing + breathing * 0.15;

      let armL_lateralOffset = 0;
      let armR_lateralOffset = 0;

      if (emoteBlend > 0) {
        armL_rotX = THREE.MathUtils.lerp(armL_rotX, -Math.PI / 3.5 + Math.sin(danceT) * 0.65, emoteBlend);
        armR_rotX = THREE.MathUtils.lerp(armR_rotX, -Math.PI / 3.5 - Math.sin(danceT) * 0.65, emoteBlend);
        armL_lateralOffset = THREE.MathUtils.lerp(armL_lateralOffset, 0.22 + Math.cos(danceT) * 0.18, emoteBlend);
        armR_lateralOffset = THREE.MathUtils.lerp(armR_lateralOffset, -0.22 - Math.cos(danceT) * 0.18, emoteBlend);
      }

      // Zombie procedural targeting and faux-ragdoll biting rotation calculations
      let zombiePitch = 0;
      let zombieYaw = 0;
      let zombieBiteChomp = 0;
      if (ragdoll.isZombie) {
        if (ragdoll.zombieTargetLimbPos) {
          const tPos = ragdoll.zombieTargetLimbPos;
          const dx = tPos.x - ragdoll.charPos.x;
          const dy = tPos.y - (ragdoll.charPos.y + 1.45);
          const dz = tPos.z - ragdoll.charPos.z;

          const localX = dx * cosYaw - dz * sinYaw;
          const localZ = dx * sinYaw + dz * cosYaw;

          zombiePitch = THREE.MathUtils.clamp(-Math.atan2(dy, Math.max(0.15, localZ)), -0.75, 0.75);
          zombieYaw = THREE.MathUtils.clamp(Math.atan2(localX, Math.max(0.15, localZ)), -0.70, 0.70);
        }

        // Faux-ragdoll chomp / bite lunging convulsing rhythm
        zombieBiteChomp = Math.sin(performance.now() * 0.015) * 0.25;
      }

      if (ragdoll.isZombie) {
        // Outstretched undead grasping arms pose reaching towards the target limb
        armR_rotX = -Math.PI / 2 + 0.15 + zombiePitch * 0.55 + breathing * 0.15;
        armL_rotX = -Math.PI / 2 + 0.15 + zombiePitch * 0.55 + breathing * 0.15;
        armL_lateralOffset = -0.05 + zombieYaw * 0.1;
        armR_lateralOffset = -0.05 + zombieYaw * 0.1;
      } else if (!ragdoll.hasWeapon && ragdoll.isAiming) {
        // --- UNARMED FOCUS / AIMING POSE (Fighter's boxing ready stance) ---
        armR_rotX = -0.45 + breathing * 0.2;
        armL_rotX = -0.40 + breathing * 0.2;
        armL_lateralOffset = 0.08;
        armR_lateralOffset = -0.08;
      } else if (ragdoll.hasWeapon) {
        const isHammer = (ragdoll as any).activeWeapon === 'hammer';

        if (isHammer) {
          // --- TWO-HANDED BLOCK HAMMER POSE ("agarre con dos brazos al palo") ---
          const idleBob = Math.sin(ragdoll.walkCycle) * 0.03 + breathing * 0.4;
          let hammerPitch = -0.25 + idleBob * 0.2;
          let hammerOffsetY = 0.98 + idleBob;
          let hammerForward = 0.42;

          if (ragdoll.isAiming) {
            // Raised high ready pose (two arms holding the handle)
            armR_rotX = -Math.PI * 0.65 + breathing * 0.15;
            armL_rotX = -Math.PI * 0.60 + breathing * 0.15;
            armL_lateralOffset = 0.40;  // Left arm brought inward to grip shaft
            armR_lateralOffset = -0.40; // Right arm brought inward to grip shaft
            hammerPitch = -Math.PI * 0.35 + breathing * 0.1;
            hammerOffsetY = 1.45 + breathing * 0.5;
            hammerForward = 0.55;
          } else {
            // Two-handed ready walk / idle pose (both arms firmly hold hammer handle)
            armR_rotX = -0.75 + idleBob;
            armL_rotX = -0.68 + idleBob;
            armL_lateralOffset = 0.40;  // Left arm brought inward to grip shaft
            armR_lateralOffset = -0.40; // Right arm brought inward to grip shaft
          }

          // Hammer Smash Swing Animation Override
          if (ragdoll.punchTimer !== undefined && ragdoll.punchTimer > 0) {
            const t = Math.max(0, ragdoll.punchTimer) / 0.55;
            const swingPhase = 1.0 - t; // 0 to 1
            if (swingPhase < 0.35) {
              // Windup upwards
              const windup = swingPhase / 0.35;
              armR_rotX = THREE.MathUtils.lerp(armR_rotX, -Math.PI * 0.85, windup);
              armL_rotX = THREE.MathUtils.lerp(armL_rotX, -Math.PI * 0.80, windup);
              armL_lateralOffset = 0.40;
              armR_lateralOffset = -0.40;
              hammerPitch = THREE.MathUtils.lerp(hammerPitch, -Math.PI * 0.55, windup);
              hammerOffsetY += windup * 0.4;
            } else {
              // Downward crushing strike
              const strike = (swingPhase - 0.35) / 0.65;
              const smashCurve = Math.sin(strike * Math.PI * 0.5);
              armR_rotX = THREE.MathUtils.lerp(-Math.PI * 0.85, -0.25, smashCurve);
              armL_rotX = THREE.MathUtils.lerp(-Math.PI * 0.80, -0.20, smashCurve);
              armL_lateralOffset = 0.40;
              armR_lateralOffset = -0.40;
              hammerPitch = THREE.MathUtils.lerp(-Math.PI * 0.55, 0.45, smashCurve);
              hammerOffsetY = THREE.MathUtils.lerp(hammerOffsetY + 0.4, 0.65, smashCurve);
              hammerForward = THREE.MathUtils.lerp(0.55, 0.68, smashCurve);
            }
          }

          if (ragdoll.weaponMesh) {
            // Position hammer handle centered directly in the fingers and rotated sideways
            const wX = ragdoll.charPos.x + (hammerForward * sinYaw) * ragdoll.scale;
            const wY = ragdoll.charPos.y + hammerOffsetY * ragdoll.scale;
            const wZ = ragdoll.charPos.z + (hammerForward * cosYaw) * ragdoll.scale;
            ragdoll.weaponMesh.position.set(wX, wY, wZ);
            ragdoll.weaponMesh.rotation.set(hammerPitch, ragdoll.facingAngle + Math.PI / 2, 0, 'YXZ');
          }
        } else if (ragdoll.isAiming) {
          // --- AIMING POSE (Arms raised forward, hands together holding revolver) ---
          armR_rotX = -Math.PI / 2 + 0.05 + breathing * 0.15;
          armL_rotX = -Math.PI / 2 + 0.12 + breathing * 0.15;
          armL_lateralOffset = 0.12;
          armR_lateralOffset = -0.10;

          // Weapon mesh position & rotation when Aiming (revolver grip right in hands)
          if (ragdoll.weaponMesh) {
            const wX = ragdoll.charPos.x + (0.05 * cosYaw + 0.65 * sinYaw) * ragdoll.scale;
            const wY = ragdoll.charPos.y + (1.38 + breathing * 0.5) * ragdoll.scale;
            const wZ = ragdoll.charPos.z + (-0.05 * sinYaw + 0.65 * cosYaw) * ragdoll.scale;
            ragdoll.weaponMesh.position.set(wX, wY, wZ);
            ragdoll.weaponMesh.rotation.set(breathing * 0.1, ragdoll.facingAngle, 0, 'YXZ');
          }
        } else {
          // --- IDLE / WALK LOW-READY POSE (Hands brought close together holding weapon) ---
          const idleBob = Math.sin(ragdoll.walkCycle) * 0.03 + breathing * 0.4;
          armR_rotX = -0.55 + idleBob;
          armL_rotX = -0.50 + idleBob;
          armL_lateralOffset = 0.07;
          armR_lateralOffset = -0.07;

          // Weapon mesh position & rotation in Idle (revolver handle held by both hands)
          if (ragdoll.weaponMesh) {
            const wX = ragdoll.charPos.x + (0.05 * cosYaw + 0.38 * sinYaw) * ragdoll.scale;
            const wY = ragdoll.charPos.y + (0.90 + idleBob) * ragdoll.scale;
            const wZ = ragdoll.charPos.z + (-0.05 * sinYaw + 0.38 * cosYaw) * ragdoll.scale;
            ragdoll.weaponMesh.position.set(wX, wY, wZ);
            ragdoll.weaponMesh.rotation.set(-0.35 + idleBob * 0.3, ragdoll.facingAngle, 0, 'YXZ');
          }
        }
      }

      let hombL_Z = 0;
      let hombR_Z = 0;

      // Procedural Punch Override Animation for unarmed strikes (fist-fight attacks)
      if (ragdoll.punchTimer !== undefined && ragdoll.punchTimer > 0) {
        ragdoll.punchTimer -= dt;
        const totalDuration = ragdoll.isWerewolf ? 0.8 : 0.35;
        const t = Math.max(0, ragdoll.punchTimer) / totalDuration;
        const punchProgress = Math.sin((1.0 - t) * Math.PI); // Smooth bell curve 0 -> 1 -> 0
        
        if (ragdoll.punchLeftArm) {
          // Left arm extends straight forward in punch
          armL_rotX = THREE.MathUtils.lerp(-armSwing * 0.35, -Math.PI / 2, punchProgress);
          armL_lateralOffset = punchProgress * 0.05;
          hombL_Z = 0; // Torso stays straight, no rotation
          // Right arm held in natural guard stance
          armR_rotX = THREE.MathUtils.lerp(armSwing * 0.35, -0.40, punchProgress * 0.6);
          hombR_Z = 0;
        } else {
          // Right arm extends straight forward in punch
          armR_rotX = THREE.MathUtils.lerp(armSwing * 0.35, -Math.PI / 2, punchProgress);
          armR_lateralOffset = -punchProgress * 0.05;
          hombR_Z = 0; // Torso stays straight, no rotation
          // Left arm held in natural guard stance
          armL_rotX = THREE.MathUtils.lerp(-armSwing * 0.35, -0.40, punchProgress * 0.6);
          hombL_Z = 0;
        }
      }

      // Synchronize shoulder rotation with arm rotation so limbs are straight and never crooked
      if (ragdoll.isWalkingRagdoll && !ragdoll.isWerewolf && !(ragdoll.punchTimer !== undefined && ragdoll.punchTimer > 0) && !ragdoll.isZombie && !ragdoll.hasWeapon && !ragdoll.activeEmote) {
        // Natural straight arm swing animation during active unarmed ragdoll walking
        const isMoving = Math.sqrt(ragdoll.charVel.x * ragdoll.charVel.x + ragdoll.charVel.z * ragdoll.charVel.z) > 0.05;
        const naturalArmSwing = isMoving ? (Math.sin(ragdoll.walkCycle) * 0.35) : 0;
        armL_rotX = -naturalArmSwing + breathing * 0.05;
        armR_rotX = naturalArmSwing + breathing * 0.05;
        armL_lateralOffset = 0;
        armR_lateralOffset = 0;
      }

      hombL_rotX = armL_rotX;
      hombR_rotX = armR_rotX;

      const hombL_X = -0.28 + armL_lateralOffset * 0.50;
      const hombR_X = 0.28 + armR_lateralOffset * 0.50;

      // Compute rigid exact joint positions along shoulder rotation
      const cosL = Math.cos(armL_rotX);
      const sinL = Math.sin(armL_rotX);
      const armL_X = hombL_X;
      const armL_Y = pechobaseY - 0.19 * cosL;
      const armL_Z = hombL_Z - 0.19 * sinL;

      const elbowL_X = armL_X;
      const elbowL_Y = pechobaseY - 0.34 * cosL;
      const elbowL_Z = hombL_Z - 0.34 * sinL;

      const foreL_X = armL_X;
      const foreL_Y = pechobaseY - 0.50 * cosL;
      const foreL_Z = hombL_Z - 0.50 * sinL;

      const wristL_X = armL_X;
      const wristL_Y = pechobaseY - 0.65 * cosL;
      const wristL_Z = hombL_Z - 0.65 * sinL;

      const handL_X = armL_X;
      const handL_Y = pechobaseY - 0.75 * cosL;
      const handL_Z = hombL_Z - 0.75 * sinL;

      const cosR = Math.cos(armR_rotX);
      const sinR = Math.sin(armR_rotX);
      const armR_X = hombR_X;
      const armR_Y = pechobaseY - 0.19 * cosR;
      const armR_Z = hombR_Z - 0.19 * sinR;

      const elbowR_X = armR_X;
      const elbowR_Y = pechobaseY - 0.34 * cosR;
      const elbowR_Z = hombR_Z - 0.34 * sinR;

      const foreR_X = armR_X;
      const foreR_Y = pechobaseY - 0.50 * cosR;
      const foreR_Z = hombR_Z - 0.50 * sinR;

      const wristR_X = armR_X;
      const wristR_Y = pechobaseY - 0.65 * cosR;
      const wristR_Z = hombR_Z - 0.65 * sinR;

      const handR_X = armR_X;
      const handR_Y = pechobaseY - 0.75 * cosR;
      const handR_Z = hombR_Z - 0.75 * sinR;

      const calcFingerPos = (
        handX: number, handY: number, handZ: number,
        dx: number, dy: number, dz: number,
        rotX: number
      ): [number, number, number] => {
        const cA = Math.cos(rotX);
        const sA = Math.sin(rotX);
        return [
          handX + dx,
          handY + dy * cA - dz * sA,
          handZ + dy * sA + dz * cA,
        ];
      };

      const calcToePos = (
        ankleX: number, ankleY: number, ankleZ: number,
        dx: number, dy: number, dz: number,
        rotX: number
      ): [number, number, number] => {
        // Attenuate foot pitch rotation so toes remain flat parallel to ground without digging into dirt
        const footPitch = rotX * 0.12;
        const cA = Math.cos(footPitch);
        const sA = Math.sin(footPitch);
        return [
          ankleX + dx,
          ankleY + dy * cA - dz * sA,
          ankleZ + dy * sA + dz * cA,
        ];
      };

      // Fluid emission spasmic limb rotation (rotación involuntaria de extremidades durante emisión de líquidos)
      const sp = ragdoll.fluidEmissionActive && ragdoll.fluidSpasmAngles ? ragdoll.fluidSpasmAngles : {};
      const spRot = (name: string) => sp[name] || { rotX: 0, rotY: 0, rotZ: 0 };

      const blockLocalPositions: Record<string, { pos: [number, number, number]; rotX: number; rotY?: number; rotZ?: number }> = {
        // Spine with realistic ragdoll/procedural bending & twisting towards target limb
        cabeza: {
          pos: [0, cabezaY, 0],
          rotX: (ragdoll.isZombie ? (zombiePitch + zombieBiteChomp * 1.1 + zSwayX) : 0) + spRot('cabeza').rotX,
          rotY: (ragdoll.isZombie ? zombieYaw : 0) + spRot('cabeza').rotY,
          rotZ: (ragdoll.isZombie ? zSwayZ * 1.2 : 0) + spRot('cabeza').rotZ,
        },
        cuello: {
          pos: [0, cuelloY, 0],
          rotX: (ragdoll.isZombie ? (zombiePitch * 0.85 + zombieBiteChomp * 0.8 + zSwayX * 0.8) : 0) + spRot('cuello').rotX,
          rotY: (ragdoll.isZombie ? (zombieYaw * 0.85) : 0) + spRot('cuello').rotY,
          rotZ: (ragdoll.isZombie ? zSwayZ * 0.9 : 0) + spRot('cuello').rotZ,
        },
        pechobase: {
          pos: [0, pechobaseY, 0],
          rotX: (ragdoll.isZombie ? (zombiePitch * 0.65 + zombieBiteChomp * 0.5 + zSwayX * 0.6) : 0) + spRot('pechobase').rotX,
          rotY: (ragdoll.isZombie ? (zombieYaw * 0.65) : 0) + spRot('pechobase').rotY,
          rotZ: (ragdoll.isZombie ? zSwayZ * 0.75 : 0) + spRot('pechobase').rotZ,
        },
        pecho_bajo: {
          pos: [0, pechoBajoY, 0],
          rotX: ragdoll.isZombie ? (zombiePitch * 0.55 + zombieBiteChomp * 0.4 + zSwayX * 0.5) : 0,
          rotY: ragdoll.isZombie ? (zombieYaw * 0.55) : 0,
          rotZ: ragdoll.isZombie ? zSwayZ * 0.68 : 0,
        },
        torso: {
          pos: [0, torsoY, 0],
          rotX: ragdoll.isZombie ? (zombiePitch * 0.45 + zombieBiteChomp * 0.3 + zSwayX * 0.4) : 0,
          rotY: ragdoll.isZombie ? (zombieYaw * 0.45) : 0,
          rotZ: ragdoll.isZombie ? zSwayZ * 0.6 : 0,
        },
        ombligo: {
          pos: [0, ombligoY, 0],
          rotX: ragdoll.isZombie ? (zombiePitch * 0.35 + zombieBiteChomp * 0.2 + zSwayX * 0.3) : 0,
          rotY: ragdoll.isZombie ? (zombieYaw * 0.35) : 0,
          rotZ: ragdoll.isZombie ? zSwayZ * 0.5 : 0,
        },
        ombligo_bajo: {
          pos: [0, ombligoBajoY, 0],
          rotX: ragdoll.isZombie ? (zombiePitch * 0.20 + zombieBiteChomp * 0.1 + zSwayX * 0.15) : 0,
          rotY: ragdoll.isZombie ? (zombieYaw * 0.20) : 0,
          rotZ: ragdoll.isZombie ? zSwayZ * 0.3 : 0,
        },
        pelvis: { pos: [0, pelvisY, 0], rotX: 0, rotY: 0 },

        // Left Arm & 3-Segment Articulated Fingers (seg2 = flexor)
        hombro_izq: { pos: [hombL_X, pechobaseY, hombL_Z], rotX: hombL_rotX + spRot('hombro_izq').rotX, rotY: spRot('hombro_izq').rotY, rotZ: spRot('hombro_izq').rotZ },
        brazo_izq: { pos: [armL_X, armL_Y, armL_Z], rotX: armL_rotX + spRot('hombro_izq').rotX, rotY: spRot('hombro_izq').rotY, rotZ: spRot('hombro_izq').rotZ },
        codo_izq: { pos: [elbowL_X, elbowL_Y, elbowL_Z], rotX: armL_rotX + spRot('codo_izq').rotX, rotY: spRot('codo_izq').rotY, rotZ: spRot('codo_izq').rotZ },
        antebrazo_izq: { pos: [foreL_X, foreL_Y, foreL_Z], rotX: armL_rotX + spRot('codo_izq').rotX, rotY: spRot('codo_izq').rotY, rotZ: spRot('codo_izq').rotZ },
        muneca_izq: { pos: [wristL_X, wristL_Y, wristL_Z], rotX: armL_rotX + spRot('mano_izq').rotX, rotY: spRot('mano_izq').rotY, rotZ: spRot('mano_izq').rotZ },
        mano_izq: { pos: [handL_X, handL_Y, handL_Z], rotX: armL_rotX + spRot('mano_izq').rotX, rotY: spRot('mano_izq').rotY, rotZ: spRot('mano_izq').rotZ },

        dedo_pulgar_izq: { pos: calcFingerPos(handL_X, handL_Y, handL_Z, 0.040, -0.040, 0.035, armL_rotX), rotX: armL_rotX },
        dedo_pulgar_izq_seg2: { pos: calcFingerPos(handL_X, handL_Y, handL_Z, 0.050, -0.075, 0.038, armL_rotX), rotX: armL_rotX },
        dedo_pulgar_izq_seg3: { pos: calcFingerPos(handL_X, handL_Y, handL_Z, 0.055, -0.105, 0.040, armL_rotX), rotX: armL_rotX },

        dedo_indice_izq: { pos: calcFingerPos(handL_X, handL_Y, handL_Z, 0.000, -0.060, 0.038, armL_rotX), rotX: armL_rotX },
        dedo_indice_izq_seg2: { pos: calcFingerPos(handL_X, handL_Y, handL_Z, 0.000, -0.100, 0.038, armL_rotX), rotX: armL_rotX },
        dedo_indice_izq_seg3: { pos: calcFingerPos(handL_X, handL_Y, handL_Z, 0.000, -0.135, 0.038, armL_rotX), rotX: armL_rotX },

        dedo_medio_izq: { pos: calcFingerPos(handL_X, handL_Y, handL_Z, 0.000, -0.065, 0.012, armL_rotX), rotX: armL_rotX },
        dedo_medio_izq_seg2: { pos: calcFingerPos(handL_X, handL_Y, handL_Z, 0.000, -0.110, 0.012, armL_rotX), rotX: armL_rotX },
        dedo_medio_izq_seg3: { pos: calcFingerPos(handL_X, handL_Y, handL_Z, 0.000, -0.150, 0.012, armL_rotX), rotX: armL_rotX },

        dedo_anular_izq: { pos: calcFingerPos(handL_X, handL_Y, handL_Z, 0.000, -0.060, -0.012, armL_rotX), rotX: armL_rotX },
        dedo_anular_izq_seg2: { pos: calcFingerPos(handL_X, handL_Y, handL_Z, 0.000, -0.100, -0.012, armL_rotX), rotX: armL_rotX },
        dedo_anular_izq_seg3: { pos: calcFingerPos(handL_X, handL_Y, handL_Z, 0.000, -0.135, -0.012, armL_rotX), rotX: armL_rotX },

        dedo_menique_izq: { pos: calcFingerPos(handL_X, handL_Y, handL_Z, 0.000, -0.055, -0.038, armL_rotX), rotX: armL_rotX },
        dedo_menique_izq_seg2: { pos: calcFingerPos(handL_X, handL_Y, handL_Z, 0.000, -0.090, -0.038, armL_rotX), rotX: armL_rotX },
        dedo_menique_izq_seg3: { pos: calcFingerPos(handL_X, handL_Y, handL_Z, 0.000, -0.120, -0.038, armL_rotX), rotX: armL_rotX },

        // Right Arm & 3-Segment Articulated Fingers (seg2 = flexor)
        hombro_der: { pos: [hombR_X, pechobaseY, hombR_Z], rotX: hombR_rotX + spRot('hombro_der').rotX, rotY: spRot('hombro_der').rotY, rotZ: spRot('hombro_der').rotZ },
        brazo_der: { pos: [armR_X, armR_Y, armR_Z], rotX: armR_rotX + spRot('hombro_der').rotX, rotY: spRot('hombro_der').rotY, rotZ: spRot('hombro_der').rotZ },
        codo_der: { pos: [elbowR_X, elbowR_Y, elbowR_Z], rotX: armR_rotX + spRot('codo_der').rotX, rotY: spRot('codo_der').rotY, rotZ: spRot('codo_der').rotZ },
        antebrazo_der: { pos: [foreR_X, foreR_Y, foreR_Z], rotX: armR_rotX + spRot('codo_der').rotX, rotY: spRot('codo_der').rotY, rotZ: spRot('codo_der').rotZ },
        muneca_der: { pos: [wristR_X, wristR_Y, wristR_Z], rotX: armR_rotX + spRot('mano_der').rotX, rotY: spRot('mano_der').rotY, rotZ: spRot('mano_der').rotZ },
        mano_der: { pos: [handR_X, handR_Y, handR_Z], rotX: armR_rotX + spRot('mano_der').rotX, rotY: spRot('mano_der').rotY, rotZ: spRot('mano_der').rotZ },

        dedo_pulgar_der: { pos: calcFingerPos(handR_X, handR_Y, handR_Z, -0.040, -0.040, 0.035, armR_rotX), rotX: armR_rotX },
        dedo_pulgar_der_seg2: { pos: calcFingerPos(handR_X, handR_Y, handR_Z, -0.050, -0.075, 0.038, armR_rotX), rotX: armR_rotX },
        dedo_pulgar_der_seg3: { pos: calcFingerPos(handR_X, handR_Y, handR_Z, -0.055, -0.105, 0.040, armR_rotX), rotX: armR_rotX },

        dedo_indice_der: { pos: calcFingerPos(handR_X, handR_Y, handR_Z, 0.000, -0.060, 0.038, armR_rotX), rotX: armR_rotX },
        dedo_indice_der_seg2: { pos: calcFingerPos(handR_X, handR_Y, handR_Z, 0.000, -0.100, 0.038, armR_rotX), rotX: armR_rotX },
        dedo_indice_der_seg3: { pos: calcFingerPos(handR_X, handR_Y, handR_Z, 0.000, -0.135, 0.038, armR_rotX), rotX: armR_rotX },

        dedo_medio_der: { pos: calcFingerPos(handR_X, handR_Y, handR_Z, 0.000, -0.065, 0.012, armR_rotX), rotX: armR_rotX },
        dedo_medio_der_seg2: { pos: calcFingerPos(handR_X, handR_Y, handR_Z, 0.000, -0.110, 0.012, armR_rotX), rotX: armR_rotX },
        dedo_medio_der_seg3: { pos: calcFingerPos(handR_X, handR_Y, handR_Z, 0.000, -0.150, 0.012, armR_rotX), rotX: armR_rotX },

        dedo_anular_der: { pos: calcFingerPos(handR_X, handR_Y, handR_Z, 0.000, -0.060, -0.012, armR_rotX), rotX: armR_rotX },
        dedo_anular_der_seg2: { pos: calcFingerPos(handR_X, handR_Y, handR_Z, 0.000, -0.100, -0.012, armR_rotX), rotX: armR_rotX },
        dedo_anular_der_seg3: { pos: calcFingerPos(handR_X, handR_Y, handR_Z, 0.000, -0.135, -0.012, armR_rotX), rotX: armR_rotX },

        dedo_menique_der: { pos: calcFingerPos(handR_X, handR_Y, handR_Z, 0.000, -0.055, -0.038, armR_rotX), rotX: armR_rotX },
        dedo_menique_der_seg2: { pos: calcFingerPos(handR_X, handR_Y, handR_Z, 0.000, -0.090, -0.038, armR_rotX), rotX: armR_rotX },
        dedo_menique_der_seg3: { pos: calcFingerPos(handR_X, handR_Y, handR_Z, 0.000, -0.120, -0.038, armR_rotX), rotX: armR_rotX },

        // Left Leg
        muslo_izq: { pos: [-0.11, thighL_Y, thighL_Z], rotX: thetaHipL + spRot('muslo_izq').rotX, rotY: spRot('muslo_izq').rotY, rotZ: spRot('muslo_izq').rotZ },
        rodilla_izq: { pos: [-0.11, rodillaL_Y, rodillaL_Z], rotX: thetaShinL + spRot('rodilla_izq').rotX, rotY: spRot('rodilla_izq').rotY, rotZ: spRot('rodilla_izq').rotZ },
        antepierna_izq: { pos: [-0.11, shinL_Y, shinL_Z], rotX: thetaShinL + spRot('rodilla_izq').rotX, rotY: spRot('rodilla_izq').rotY, rotZ: spRot('rodilla_izq').rotZ },
        tobillo_izq: { pos: [-0.11, ankleL_Y, ankleL_Z], rotX: thetaShinL + spRot('rodilla_izq').rotX, rotY: spRot('rodilla_izq').rotY, rotZ: spRot('rodilla_izq').rotZ },
        pie_izq_talon: { pos: calcToePos(-0.11, ankleL_Y, ankleL_Z, 0, -0.030, -0.01, thetaShinL * 0.2), rotX: thetaShinL * 0.2 },
        pie_izq_medio: { pos: calcToePos(-0.11, ankleL_Y, ankleL_Z, 0, -0.030, 0.05, thetaShinL * 0.2), rotX: thetaShinL * 0.2 },
        pie_izq: { pos: calcToePos(-0.11, ankleL_Y, ankleL_Z, 0, -0.030, 0.11, thetaShinL * 0.2), rotX: thetaShinL * 0.2 },
        dedo_pie_pulgar_izq: { pos: calcToePos(-0.11, ankleL_Y, ankleL_Z, 0.05, -0.030, 0.18, thetaShinL * 0.2), rotX: thetaShinL * 0.2 },
        dedo_pie_indice_izq: { pos: calcToePos(-0.11, ankleL_Y, ankleL_Z, 0.025, -0.030, 0.18, thetaShinL * 0.2), rotX: thetaShinL * 0.2 },
        dedo_pie_medio_izq: { pos: calcToePos(-0.11, ankleL_Y, ankleL_Z, 0.000, -0.030, 0.18, thetaShinL * 0.2), rotX: thetaShinL * 0.2 },
        dedo_pie_anular_izq: { pos: calcToePos(-0.11, ankleL_Y, ankleL_Z, -0.025, -0.030, 0.18, thetaShinL * 0.2), rotX: thetaShinL * 0.2 },
        dedo_pie_menique_izq: { pos: calcToePos(-0.11, ankleL_Y, ankleL_Z, -0.050, -0.030, 0.18, thetaShinL * 0.2), rotX: thetaShinL * 0.2 },

        // Right Leg
        muslo_der: { pos: [0.11, thighR_Y, thighR_Z], rotX: thetaHipR + spRot('muslo_der').rotX, rotY: spRot('muslo_der').rotY, rotZ: spRot('muslo_der').rotZ },
        rodilla_der: { pos: [0.11, rodillaR_Y, rodillaR_Z], rotX: thetaShinR + spRot('rodilla_der').rotX, rotY: spRot('rodilla_der').rotY, rotZ: spRot('rodilla_der').rotZ },
        antepierna_der: { pos: [0.11, shinR_Y, shinR_Z], rotX: thetaShinR + spRot('rodilla_der').rotX, rotY: spRot('rodilla_der').rotY, rotZ: spRot('rodilla_der').rotZ },
        tobillo_der: { pos: [0.11, ankleR_Y, ankleR_Z], rotX: thetaShinR + spRot('rodilla_der').rotX, rotY: spRot('rodilla_der').rotY, rotZ: spRot('rodilla_der').rotZ },
        pie_der_talon: { pos: calcToePos(0.11, ankleR_Y, ankleR_Z, 0, -0.030, -0.01, thetaShinR * 0.2), rotX: thetaShinR * 0.2 },
        pie_der_medio: { pos: calcToePos(0.11, ankleR_Y, ankleR_Z, 0, -0.030, 0.05, thetaShinR * 0.2), rotX: thetaShinR * 0.2 },
        pie_der: { pos: calcToePos(0.11, ankleR_Y, ankleR_Z, 0, -0.030, 0.11, thetaShinR * 0.2), rotX: thetaShinR * 0.2 },
        dedo_pie_pulgar_der: { pos: calcToePos(0.11, ankleR_Y, ankleR_Z, -0.05, -0.030, 0.18, thetaShinR * 0.2), rotX: thetaShinR * 0.2 },
        dedo_pie_indice_der: { pos: calcToePos(0.11, ankleR_Y, ankleR_Z, -0.025, -0.030, 0.18, thetaShinR * 0.2), rotX: thetaShinR * 0.2 },
        dedo_pie_medio_der: { pos: calcToePos(0.11, ankleR_Y, ankleR_Z, 0.000, -0.030, 0.18, thetaShinR * 0.2), rotX: thetaShinR * 0.2 },
        dedo_pie_anular_der: { pos: calcToePos(0.11, ankleR_Y, ankleR_Z, 0.025, -0.030, 0.18, thetaShinR * 0.2), rotX: thetaShinR * 0.2 },
        dedo_pie_menique_der: { pos: calcToePos(0.11, ankleR_Y, ankleR_Z, 0.050, -0.030, 0.18, thetaShinR * 0.2), rotX: thetaShinR * 0.2 },

        // Werewolf Tail Segments (Synchronized with Pelvis spine base)
        cola_seg1: { pos: [0, pelvisY + 0.02, -0.16], rotX: 0 },
        cola_seg2: { pos: [0, pelvisY - 0.03, -0.36], rotX: 0 },
        cola_seg3: { pos: [0, pelvisY - 0.08, -0.54], rotX: 0 },
      };

      for (const p of ragdoll.particles) {
        if (p.dismembered) continue;
        const item = blockLocalPositions[p.name];
        if (!item) continue;

        const lx = item.pos[0] * ragdoll.scale;
        const ly = item.pos[1] * ragdoll.scale;
        const lz = item.pos[2] * ragdoll.scale;

        let worldX = ragdoll.charPos.x + lx * cosYaw + lz * sinYaw;
        let crouchSub = 0;
        if (ragdoll.crouchOffset && !p.name.includes('pie') && !p.name.includes('tobillo')) {
          if (p.name.includes('rodilla') || p.name.includes('antepierna')) {
            crouchSub = ragdoll.crouchOffset * 0.5;
          } else {
            crouchSub = ragdoll.crouchOffset;
          }
        }
        let worldY = ragdoll.charPos.y + ly - crouchSub;
        let worldZ = ragdoll.charPos.z - lx * sinYaw + lz * cosYaw;

        // Overlay: Werewolf Hot / Dummy Hot grabbing and hole seeking
        if ((ragdoll.isWerewolfHot || ragdoll.isDummyHot) && ragdoll.hotGrabTargetId) {
          const grabbedTarget = this.ragdolls.find(r => r.id === ragdoll.hotGrabTargetId);
          if (grabbedTarget && (grabbedTarget.isAlive || grabbedTarget.isWalkingRagdoll)) {
            const partName = p.name;
            let targetPosVec: THREE.Vector3 | null = null;
            let stretchFactor = 0.85;

            // Prevent legs, knees, shins, feet and toes from grabbing
            const isLegPart = partName.includes('muslo') || partName.includes('rodilla') || partName.includes('antepierna') || partName.includes('tobillo') || partName.includes('pie');
            
            // Only allow forearms, elbows, wrists, hands, and fingers to grab/stretch towards target
            const isArmStretchPart = partName.includes('mano') || partName.includes('muneca') || partName.includes('antebrazo') || partName.includes('dedo') || partName.includes('codo');

            if (isLegPart || !isArmStretchPart) {
              // Legs, shoulders, upper-arms, head, torso, pelvis do not grab/stretch; they remain skeleton-bound
            } else if (ragdoll.hotTargetHolePos && (partName.includes('mano') || partName.includes('muneca') || partName.includes('antebrazo') || partName.includes('dedo'))) {
              targetPosVec = ragdoll.hotTargetHolePos;
              stretchFactor = 0.90;
            } else {
              // 2. Symmetric limb / contour grabbing (only for arms/hands)
              let targetLimbName: BodyPartName | undefined;
              if (partName.includes('_izq')) {
                targetLimbName = (ragdoll.hotGrabLimbLeft as BodyPartName) || 'brazo_izq';
              } else if (partName.includes('_der')) {
                targetLimbName = (ragdoll.hotGrabLimbRight as BodyPartName) || 'brazo_der';
              }
              if (targetLimbName) {
                const targetLimb = grabbedTarget.particles.find(tp => tp.name === targetLimbName);
                if (targetLimb && !targetLimb.dismembered) {
                  targetPosVec = new THREE.Vector3(targetLimb.x, targetLimb.y, targetLimb.z);
                }
              }
            }

            if (targetPosVec) {
              if (partName.includes('codo')) stretchFactor = 0.22;
              if (partName.includes('antebrazo')) stretchFactor = 0.52;
              if (partName.includes('muneca')) stretchFactor = 0.72;
              if (partName.includes('mano') || partName.includes('dedo')) stretchFactor = 0.92;

              worldX = THREE.MathUtils.lerp(worldX, targetPosVec.x, stretchFactor);
              worldY = THREE.MathUtils.lerp(worldY, targetPosVec.y, stretchFactor);
              worldZ = THREE.MathUtils.lerp(worldZ, targetPosVec.z, stretchFactor);
            }
          }
        }

        // Overlay: Partner limb positioning in active Hot Pose
        const holdingHotNPC = this.ragdolls.find(r => (r.isWerewolfHot || r.isDummyHot) && r.hotGrabTargetId === ragdoll.id);
        if (holdingHotNPC && holdingHotNPC.hotNPCPose) {
          const poseTarget = getPosePartnerParticleOffset(holdingHotNPC.hotNPCPose, p.name as BodyPartName, holdingHotNPC, ragdoll);
          if (poseTarget) {
            worldX = THREE.MathUtils.lerp(worldX, poseTarget.x, 0.75);
            worldY = THREE.MathUtils.lerp(worldY, poseTarget.y, 0.75);
            worldZ = THREE.MathUtils.lerp(worldZ, poseTarget.z, 0.75);
          }
        }

        // Overlay: Pelvis thrusting motion
        if (p.name === 'pelvis' && ragdoll.pelvisThrustCycle !== undefined) {
          const thrust = Math.sin(ragdoll.pelvisThrustCycle) * 0.12;
          worldX += Math.sin(ragdoll.facingAngle) * thrust;
          worldZ += Math.cos(ragdoll.facingAngle) * thrust;
        }

        // Overlay: Zombie grab stretching hand connection
        if (ragdoll.isZombie && ragdoll.zombieGrabbedTargetId && ragdoll.zombieGrabbedLimbName) {
          const grabbedTarget = this.ragdolls.find(r => r.id === ragdoll.zombieGrabbedTargetId);
          if (grabbedTarget && grabbedTarget.isAlive) {
            const targetLimb = grabbedTarget.particles.find(tp => tp.name === ragdoll.zombieGrabbedLimbName);
            if (targetLimb && !targetLimb.dismembered) {
              const partName = p.name;
              // Stretch arms & hands toward the target limb
              if (partName === 'mano_izq' || partName === 'mano_der' ||
                  partName === 'muneca_izq' || partName === 'muneca_der' ||
                  partName === 'antebrazo_izq' || partName === 'antebrazo_der') {
                const targetPosVec = new THREE.Vector3(targetLimb.x, targetLimb.y, targetLimb.z);
                let stretchFactor = 0.85; // Clasp hands 85% exactly onto target limb
                if (partName === 'antebrazo_izq' || partName === 'antebrazo_der') stretchFactor = 0.5;
                if (partName === 'muneca_izq' || partName === 'muneca_der') stretchFactor = 0.7;

                worldX = THREE.MathUtils.lerp(worldX, targetPosVec.x, stretchFactor);
                worldY = THREE.MathUtils.lerp(worldY, targetPosVec.y, stretchFactor);
                worldZ = THREE.MathUtils.lerp(worldZ, targetPosVec.z, stretchFactor);
              }
            }
          }
        }

        const isPunchingArm =
          ragdoll.punchTimer !== undefined &&
          ragdoll.punchTimer > 0 &&
          (ragdoll.punchLeftArm ? p.name.includes('_izq') : p.name.includes('_der')) &&
          (p.name.includes('hombro') ||
            p.name.includes('brazo') ||
            p.name.includes('codo') ||
            p.name.includes('antebrazo') ||
            p.name.includes('muneca') ||
            p.name.includes('mano') ||
            p.name.includes('dedo'));

        // Disabled "Sistema Adjunt" to prevent tendon/limb clumping and ensure they stay fully separated.
        if (false && this.adjuntEnabled && !ragdoll.isTentacle) {
          const isLimbPart = (
            p.name.includes('muslo') || p.name.includes('cadera') ||
            p.name.includes('rodilla') || p.name.includes('pantorrilla') || p.name.includes('antepierna') ||
            p.name.includes('tobillo') || p.name.includes('pie')
          );
          if (isLimbPart) {
            const spinePart = ragdoll.particles.find(pt => pt.name === 'torso' || pt.name === 'pelvis') || ragdoll.particles[0];
            const centerX = spinePart ? spinePart.x : ragdoll.charPos.x;
            const groundH = this.getGroundHeight(p.x, p.z, p.y);
            const isGroundedSupport = groundH > -9000 && p.y <= groundH + 0.12;
            if (!isGroundedSupport) {
              worldX = THREE.MathUtils.lerp(worldX, centerX, 0.25);
            }
          }
        }

        if (ragdoll.isAlive && (isPunchingArm || ragdoll.isWalkingRagdoll)) {
          // ACTIVE RAGDOLL / KINEMATIC ANIMATION INTEGRATION
          let springStrength = 0.65;
          let dampingFactor = 0.92;
          if (isPunchingArm) {
            springStrength = 0.96; // Solid spring for realistic, straight, non-stretching punch
            dampingFactor = 0.96;
          } else if (p.name === 'cabeza' || p.name === 'cuello') {
            springStrength = 0.94;
            dampingFactor = 0.96;
          } else if (
            p.name === 'pechobase' ||
            p.name.startsWith('hombro_') ||
            p.name.startsWith('brazo_') ||
            p.name.startsWith('codo_') ||
            p.name.startsWith('antebrazo_') ||
            p.name.startsWith('muneca_') ||
            p.name.startsWith('mano_') ||
            p.name.startsWith('dedo_')
          ) {
            springStrength = 0.94;
            dampingFactor = 0.96;
          } else if (p.name === 'torso' || p.name === 'ombligo') {
            springStrength = 0.92;
            dampingFactor = 0.96;
          } else if (
            p.name === 'pelvis' ||
            p.name.includes('muslo') ||
            p.name.includes('rodilla') ||
            p.name.includes('antepierna') ||
            p.name.includes('tobillo') ||
            p.name.includes('pie')
          ) {
            springStrength = 0.94;
            dampingFactor = 0.96;
          }

          // Override spring factors if this arm is grabbed or grabbing to lock shoulder / keep it firm ("el agarre no se mueva el hombro como ragdoll")
          const isL_Arm = ['hombro_izq', 'brazo_izq', 'codo_izq', 'antebrazo_izq', 'muneca_izq', 'mano_izq'].includes(p.name);
          const isR_Arm = ['hombro_der', 'brazo_der', 'codo_der', 'antebrazo_der', 'muneca_der', 'mano_der'].includes(p.name);
          
          let armIsGrabbedOrGrabbing = false;
          const player = this.ragdolls[0];
          if (player) {
            for (const c of player.constraints) {
              if (!c.broken && (c.name === 'player_grab_left' || c.name === 'player_grab_right')) {
                if (c.p1 && c.p2) {
                  const p1L = ['hombro_izq', 'brazo_izq', 'codo_izq', 'antebrazo_izq', 'muneca_izq', 'mano_izq'].includes(c.p1.name);
                  const p2L = ['hombro_izq', 'brazo_izq', 'codo_izq', 'antebrazo_izq', 'muneca_izq', 'mano_izq'].includes(c.p2.name);
                  const p1R = ['hombro_der', 'brazo_der', 'codo_der', 'antebrazo_der', 'muneca_der', 'mano_der'].includes(c.p1.name);
                  const p2R = ['hombro_der', 'brazo_der', 'codo_der', 'antebrazo_der', 'muneca_der', 'mano_der'].includes(c.p2.name);
                  
                  if (c.p1.parentRagdollId === ragdoll.id) {
                    if (isL_Arm && p1L) armIsGrabbedOrGrabbing = true;
                    if (isR_Arm && p1R) armIsGrabbedOrGrabbing = true;
                  }
                  if (c.p2.parentRagdollId === ragdoll.id) {
                    if (isL_Arm && p1L) armIsGrabbedOrGrabbing = true;
                    if (isR_Arm && p1R) armIsGrabbedOrGrabbing = true;
                  }
                }
              }
            }
          }
          if (ragdoll.isWerewolfHot || ragdoll.isDummyHot || ragdoll.hotGrabTargetId) {
            if (isL_Arm || isR_Arm) armIsGrabbedOrGrabbing = true;
          }
          if (ragdoll.id === (player ? player.id : '')) {
            for (const c of player.constraints) {
              if (!c.broken && c.name === 'player_grab_left' && isL_Arm) armIsGrabbedOrGrabbing = true;
              if (!c.broken && c.name === 'player_grab_right' && isR_Arm) armIsGrabbedOrGrabbing = true;
            }
          }

          if (armIsGrabbedOrGrabbing) {
            springStrength = 0.98;
            dampingFactor = 0.98;
          }

          let targetX = worldX;
          let targetY = worldY;
          let targetZ = worldZ;

          // Active Ragdoll Kinematic Animation: body, legs, and arms follow direct animation without ragdoll distortion
          if (ragdoll.isWalkingRagdoll) {
            const groundH = this.getGroundHeight(ragdoll.charPos.x, ragdoll.charPos.z, ragdoll.charPos.y);
            const floorLevel = groundH > -9000 ? groundH : (ragdoll.charPos.y - 0.95 * ragdoll.scale);
            const isAirborne = !ragdoll.isGrounded || (ragdoll.charPos.y - floorLevel > 0.25);
            const landingOffset = (ragdoll as any).landingCompression || 0;

            const item = blockLocalPositions[p.name];
            if (item) {
              const lx = item.pos[0] * ragdoll.scale;
              const ly = (item.pos[1] - landingOffset * 0.5) * ragdoll.scale;
              const lz = item.pos[2] * ragdoll.scale;

              targetX = ragdoll.charPos.x + (lx * cosYaw + lz * sinYaw);
              targetY = (isAirborne ? ragdoll.charPos.y : floorLevel) + ly;
              targetZ = ragdoll.charPos.z + (-lx * sinYaw + lz * cosYaw);
            }
          }

          if (p.dragTargetPos) {
            targetX = p.dragTargetPos.x;
            targetY = p.dragTargetPos.y;
            targetZ = p.dragTargetPos.z;
            springStrength = 0.98;
            dampingFactor = 0.88;

            const targetVx = (targetX - p.x) / dt;
            const targetVy = (targetY - p.y) / dt;
            const targetVz = (targetZ - p.z) / dt;

            p.vx = THREE.MathUtils.lerp(p.vx * dampingFactor, targetVx, springStrength);
            p.vy = THREE.MathUtils.lerp(p.vy * dampingFactor, targetVy, springStrength);
            p.vz = THREE.MathUtils.lerp(p.vz * dampingFactor, targetVz, springStrength);

            p.oldX = p.x;
            p.oldY = p.y;
            p.oldZ = p.z;

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;

            if (p.mesh) {
              p.mesh.position.set(p.x, p.y, p.z);
            }
          } else {
            // Direct kinematic placement for undragged particles so arms, body, and legs stay clean & straight like animations
            p.vx = (targetX - p.oldX) / (dt || 0.016);
            p.vy = (targetY - p.oldY) / (dt || 0.016);
            p.vz = (targetZ - p.oldZ) / (dt || 0.016);

            p.oldX = targetX;
            p.oldY = targetY;
            p.oldZ = targetZ;

            p.x = targetX;
            p.y = targetY;
            p.z = targetZ;

            if (p.mesh) {
              p.mesh.position.set(p.x, p.y, p.z);
              const item = blockLocalPositions[p.name];
              if (item) {
                const rotYOffset = item.rotY !== undefined ? item.rotY : 0;
                const rotZOffset = item.rotZ !== undefined ? item.rotZ : 0;
                p.mesh.rotation.set(item.rotX, ragdoll.facingAngle + rotYOffset, rotZOffset, 'YXZ');
              }
            }
          }
        } else {
          // Standard kinematic update for normal alive characters
          p.vx = (worldX - p.x) / dt;
          p.vy = (worldY - p.y) / dt;
          p.vz = (worldZ - p.z) / dt;

          p.oldX = p.x;
          p.oldY = p.y;
          p.oldZ = p.z;

          p.x = worldX;
          p.y = worldY;
          p.z = worldZ;

          if (p.mesh) {
            p.mesh.position.set(p.x, p.y, p.z);
            const rotYOffset = item.rotY !== undefined ? item.rotY : 0;
            const rotZOffset = item.rotZ !== undefined ? item.rotZ : 0;
            p.mesh.rotation.set(item.rotX, ragdoll.facingAngle + rotYOffset, rotZOffset, 'YXZ');
          }
        }
      }

      // Dynamic bounce & 3D rotation physics for breasts and glutes (rebote y movimiento real)
      if (ragdoll.hasBustAndGlutes) {
        if (!ragdoll.bustSway) {
          ragdoll.bustSway = { bounceY: 0, velY: 0, pitch: 0, velPitch: 0, yaw: 0, velYaw: 0, roll: 0, velRoll: 0 };
        }
        const sway = ragdoll.bustSway;
        const springK = 180;
        const damp = 10;
        
        // Compute pseudo-acceleration based on vertical velocity
        const targetBounceY = (ragdoll.charVel.y * -0.01) + (isWalking ? Math.sin(ragdoll.walkCycle * 2.0) * 0.03 : 0);
        const targetPitch = (isWalking ? Math.sin(ragdoll.walkCycle * 2.0) * 0.15 : 0) + (ragdoll.charVel.y * -0.05);

        sway.velY += (targetBounceY - sway.bounceY) * springK * dt - sway.velY * damp * dt;
        sway.bounceY += sway.velY * dt;
        
        sway.velPitch += (targetPitch - sway.pitch) * springK * dt - sway.velPitch * damp * dt;
        sway.pitch += sway.velPitch * dt;

        const pechobaseP = ragdoll.particles.find((p) => p.name === 'pechobase');
        if (pechobaseP && pechobaseP.voxelsGroup) {
          const bustGroup = pechobaseP.voxelsGroup.getObjectByName('BustExtraGroup') as THREE.Group | undefined;
          if (bustGroup) {
            bustGroup.position.set(0, sway.bounceY, Math.abs(sway.bounceY) * 0.5);
            bustGroup.rotation.set(
              THREE.MathUtils.clamp(sway.pitch, -0.4, 0.4),
              isWalking ? Math.cos(ragdoll.walkCycle) * 0.1 : 0,
              isWalking ? -Math.sin(ragdoll.walkCycle) * 0.1 : 0
            );
          }
        }

        const pelvisP = ragdoll.particles.find((p) => p.name === 'pelvis');
        if (pelvisP && pelvisP.voxelsGroup) {
          const gluteGroup = pelvisP.voxelsGroup.getObjectByName('GluteExtraGroup') as THREE.Group | undefined;
          if (gluteGroup) {
            // Glutes bounce opposite to breasts slightly, and react to landing
            gluteGroup.position.set(0, sway.bounceY * 0.8, -Math.abs(sway.bounceY) * 0.3);
            gluteGroup.rotation.set(
              THREE.MathUtils.clamp(-sway.pitch * 0.8, -0.3, 0.3),
              isWalking ? -Math.cos(ragdoll.walkCycle) * 0.1 : 0,
              0
            );
          }
        }
      }

      // Dynamic downward sway for male genital (balance natural sway hanging downwards)
      if (ragdoll.genitalType === 'male') {
        const pelvisP = ragdoll.particles.find((p) => p.name === 'pelvis');
        if (pelvisP && pelvisP.voxelsGroup) {
          const genGroup = (pelvisP.voxelsGroup.getObjectByName('GenitalExtraGroup') || pelvisP.voxelsGroup.getObjectByName('GenitalGroup')) as THREE.Group | undefined;
          if (genGroup) {
            const pitchSway = (isWalking ? Math.sin(ragdoll.walkCycle * 2.0) * 0.08 : 0) + (ragdoll.charVel.y * -0.03);
            const rollSway = isWalking ? Math.cos(ragdoll.walkCycle) * 0.05 : 0;
            genGroup.rotation.set(
              THREE.MathUtils.clamp(pitchSway, -0.2, 0.2),
              0,
              THREE.MathUtils.clamp(rollSway, -0.15, 0.15)
            );
          }
        }
      }

      // Dynamic Shirt Blanket (Manta 2D layered covering gaps with max elasticity)
      if (ragdoll.shirtBlanket && ragdoll.shirtBlanket.mesh) {
        const { mesh, vels, originalPos } = ragdoll.shirtBlanket;
        const pechobase = ragdoll.particles.find(p => p.name === 'pechobase')?.mesh;
        const pecho_bajo = ragdoll.particles.find(p => p.name === 'pecho_bajo')?.mesh;
        const torso = ragdoll.particles.find(p => p.name === 'torso')?.mesh;
        const ombligo = ragdoll.particles.find(p => p.name === 'ombligo')?.mesh;
        const ombligo_bajo = ragdoll.particles.find(p => p.name === 'ombligo_bajo')?.mesh;
        const pelvis = ragdoll.particles.find(p => p.name === 'pelvis')?.mesh;

        if (pechobase && pecho_bajo && torso && ombligo && ombligo_bajo && pelvis) {
          const geom = mesh.geometry as THREE.BufferGeometry;
          const posAttr = geom.attributes.position;
          
          const springK = 120; // Pseudo elasticidad al maximo
          const damping = 8;
          const boundsY = 1.25 * ragdoll.scale;

          for (let i = 0; i < posAttr.count; i++) {
            // Normalized height from 0 (bottom) to 1 (top)
            const t = THREE.MathUtils.clamp((originalPos[i].y / boundsY) + 0.5, 0, 1);
            
            // Interpolate target body parts based on height 't'
            let targetObj1 = pelvis, targetObj2 = ombligo_bajo, localT = t * 5;
            if (t > 0.8) {
              targetObj1 = pecho_bajo; targetObj2 = pechobase; localT = (t - 0.8) * 5;
            } else if (t > 0.6) {
              targetObj1 = torso; targetObj2 = pecho_bajo; localT = (t - 0.6) * 5;
            } else if (t > 0.4) {
              targetObj1 = ombligo; targetObj2 = torso; localT = (t - 0.4) * 5;
            } else if (t > 0.2) {
              targetObj1 = ombligo_bajo; targetObj2 = ombligo; localT = (t - 0.2) * 5;
            }

            const pos1 = targetObj1.position;
            const pos2 = targetObj2.position;
            const rot1 = targetObj1.quaternion;
            const rot2 = targetObj2.quaternion;

            _scratchVec1.lerpVectors(pos1, pos2, localT);
            _scratchQuat1.slerpQuaternions(rot1, rot2, localT);

            _scratchVec2.set(originalPos[i].x, 0, originalPos[i].z);
            _scratchVec2.applyQuaternion(_scratchQuat1);

            // Target vertex position follows interpolated spine + outward radius
            _scratchVec3.copy(_scratchVec1).add(_scratchVec2);

            _scratchVec4.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
            
            // Soft-body physics spring formula
            _scratchVec5.subVectors(_scratchVec3, _scratchVec4).multiplyScalar(springK);
            vels[i].addScaledVector(_scratchVec5, dt);
            vels[i].addScaledVector(vels[i], -damping * dt);
            
            _scratchVec4.addScaledVector(vels[i], dt);
            posAttr.setXYZ(i, _scratchVec4.x, _scratchVec4.y, _scratchVec4.z);
          }
          posAttr.needsUpdate = true;
          geom.computeVertexNormals();
        }
      }

      // Dynamic natural swing & sway rotation physics for male genitals (natural frontal posture with responsive bounce)
      if (ragdoll.genitalType === 'male') {
        const pelvisP = ragdoll.particles.find((p) => p.name === 'pelvis');
        if (pelvisP && pelvisP.voxelsGroup) {
          const genitalGroup = pelvisP.voxelsGroup.getObjectByName('GenitalExtraGroup') as THREE.Group | undefined;
          if (genitalGroup) {
            const moveInertia = isWalking ? Math.sin(ragdoll.walkCycle * 2.0) * 0.08 : 0;
            const turnInertia = isWalking ? Math.cos(ragdoll.walkCycle) * 0.08 : 0;
            const idleSway = Math.sin(performance.now() * 0.003) * 0.02;

            const dynamicRotX = moveInertia + idleSway;
            const dynamicRotZ = turnInertia;
            const dynamicRotY = isWalking ? Math.sin(ragdoll.walkCycle) * 0.06 : 0;

            genitalGroup.position.set(0, isWalking ? Math.abs(Math.sin(ragdoll.walkCycle * 2.0)) * 0.008 : 0, 0);
            genitalGroup.rotation.set(
              THREE.MathUtils.clamp(dynamicRotX, -0.2, 0.2),
              THREE.MathUtils.clamp(dynamicRotY, -0.15, 0.15),
              THREE.MathUtils.clamp(dynamicRotZ, -0.15, 0.15)
            );

            // Dynamically stretch and align the internal connecting tube to cover the entire opening
            const pinkTube = genitalGroup.getObjectByName('male_internal_tube') as THREE.Mesh | undefined;
            const pelvEmpty = pelvisP.voxelBlocks ? pelvisP.voxelBlocks.filter((b) => b.active).length === 0 : false;
            if (pelvEmpty || pelvisP.dismembered) {
              genitalGroup.visible = false;
            } else if (pinkTube) {
              const rootY = -0.04;
              const genitalFrontZ = 0.155;

              // Base of shaft (junction with pelvis) in local space
              const baseInGenital = new THREE.Vector3(0, rootY, genitalFrontZ);

              // Pelvis connection/prostate center in pelvis local space
              const pelvisLocal = new THREE.Vector3(0, 0.06, 0.02);

              // Transform the fixed pelvis anchor into the rotating genital group local space
              const pelvisInGenital = pelvisLocal.clone()
                .sub(genitalGroup.position)
                .applyQuaternion(genitalGroup.quaternion.clone().invert())
                .divide(genitalGroup.scale);

              // Calculate connection vector and length
              const dir = new THREE.Vector3().subVectors(pelvisInGenital, baseInGenital);
              const len = dir.length();
              dir.normalize();

              // Update tube position to be centered between the base of shaft and the pelvic opening
              pinkTube.position.copy(baseInGenital).addScaledVector(dir, len / 2);

              // Scale the tube length (Y-axis) dynamically with strict clamping
              const originalLength = pinkTube.userData.originalLength || len;
              const scaleY = THREE.MathUtils.clamp(len / originalLength, 0.1, 1.05);
              pinkTube.scale.set(1, scaleY, 1);

              // Align the orientation of the tube with the connection direction
              pinkTube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
            }
          }
        }
      } else if (ragdoll.genitalType === 'female') {
        const pelvisP = ragdoll.particles.find((p) => p.name === 'pelvis');
        if (pelvisP && pelvisP.voxelsGroup) {
          const genitalGroup = pelvisP.voxelsGroup.getObjectByName('GenitalExtraGroup') as THREE.Group | undefined;
          if (genitalGroup) {
            const moveInertia = isWalking ? Math.sin(ragdoll.walkCycle * 2.0) * 0.04 : 0;
            const turnInertia = isWalking ? Math.cos(ragdoll.walkCycle) * 0.04 : 0;
            const idleSway = Math.sin(performance.now() * 0.003) * 0.01;

            const dynamicRotX = moveInertia + idleSway;
            const dynamicRotZ = turnInertia;
            const dynamicRotY = isWalking ? Math.sin(ragdoll.walkCycle) * 0.03 : 0;

            genitalGroup.position.set(0, isWalking ? Math.abs(Math.sin(ragdoll.walkCycle * 2.0)) * 0.004 : 0, 0);
            genitalGroup.rotation.set(
              THREE.MathUtils.clamp(dynamicRotX, -0.1, 0.1),
              THREE.MathUtils.clamp(dynamicRotY, -0.1, 0.1),
              THREE.MathUtils.clamp(dynamicRotZ, -0.1, 0.1)
            );

            // Dynamically stretch and align the internal connecting tube to cover the entire opening
            const pinkTube = genitalGroup.getObjectByName('female_internal_tube') as THREE.Mesh | undefined;
            const pelvEmpty = pelvisP.voxelBlocks ? pelvisP.voxelBlocks.filter((b) => b.active).length === 0 : false;
            if (pelvEmpty || pelvisP.dismembered) {
              genitalGroup.visible = false;
            } else if (pinkTube) {
              const rootY = -0.04;
              const femaleRootZ = 0.155;

              // Entrance of F genital in local space (adapting directly to the entrance)
              const entranceInGenital = new THREE.Vector3(0, rootY, femaleRootZ - 0.005);

              // Pelvis connection/uterus center in pelvis local space
              const pelvisLocal = new THREE.Vector3(0, 0.08, 0.012);

              // Transform the fixed pelvis anchor into the rotating genital group local space
              const pelvisInGenital = pelvisLocal.clone()
                .sub(genitalGroup.position)
                .applyQuaternion(genitalGroup.quaternion.clone().invert())
                .divide(genitalGroup.scale);

              // Calculate connection vector and length from entrance to uterus
              const dir = new THREE.Vector3().subVectors(pelvisInGenital, entranceInGenital);
              const len = dir.length();
              dir.normalize();

              // Update tube position to be centered between the entrance and the uterus
              pinkTube.position.copy(entranceInGenital).addScaledVector(dir, len / 2);

              // Scale the tube length dynamically with strict clamping
              const originalLength = pinkTube.userData.originalLength || len;
              const scaleY = THREE.MathUtils.clamp(len / originalLength, 0.1, 1.05);
              pinkTube.scale.set(1, scaleY, 1);

              // Align the orientation of the tube with the connection direction
              pinkTube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
            }
          }
        }
      }

      // Dynamically stretch and align pink connecting organ tube from neck to stomach
      // User directives:
      // "falta cuello tubo rosa como genital con utero pero para estomago y cuello conectados que se vean en organos"
      // "falta tubo de cuello conectado a esyomago como el de genital y peovis"
      if (ragdoll.neckToStomachTube) {
        const cuelloP = ragdoll.particles.find(p => p.name === 'cuello');
        const torsoP = ragdoll.particles.find(p => p.name === 'torso');
        const neckEmpty = cuelloP?.voxelBlocks ? cuelloP.voxelBlocks.filter(b => b.active).length === 0 : false;
        const torsoEmpty = torsoP?.voxelBlocks ? torsoP.voxelBlocks.filter(b => b.active).length === 0 : false;

        if (
          !cuelloP || !torsoP || 
          cuelloP.dismembered || torsoP.dismembered || 
          neckEmpty || torsoEmpty
        ) {
          ragdoll.neckToStomachTube.visible = false;
        } else {
          // Bottom of the neck (connecting at cervical larynx base)
          let neckWorldPos = new THREE.Vector3();
          if (cuelloP.mesh) {
            cuelloP.mesh.updateMatrixWorld(true);
            neckWorldPos = cuelloP.mesh.localToWorld(new THREE.Vector3(0, -cuelloP.radius * 0.7, 0.02 * (ragdoll.scale || 1.0)));
          } else {
            neckWorldPos.set(cuelloP.x, cuelloP.y - cuelloP.radius * 0.7, cuelloP.z + 0.02 * (ragdoll.scale || 1.0));
          }

          // Stomach opening / hole missing blocks where esophagus connects
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

      // Werewolf tail animation sways naturally as they walk/idle!
      if (ragdoll.isWerewolf) {
        const tail1 = ragdoll.particles.find(p => p.name === 'cola_seg1');
        const tail2 = ragdoll.particles.find(p => p.name === 'cola_seg2');
        const tail3 = ragdoll.particles.find(p => p.name === 'cola_seg3');
        const pelvisPart = ragdoll.particles.find(p => p.name === 'pelvis');

        if (pelvisPart && tail1 && !tail1.dismembered) {
          const time = performance.now() * 0.004;
          const swaySide = Math.sin(time * 1.5 + (isWalking ? 2.5 : 1.0)) * (isWalking ? 0.28 : 0.08);
          const swayUp = Math.cos(time * 2.0) * 0.04 - (isWalking ? 0.08 : 0.02);

          // Get forward/backward directions based on character facing angle
          const fwdX = Math.sin(ragdoll.facingAngle);
          const fwdZ = Math.cos(ragdoll.facingAngle);
          const perpX = Math.cos(ragdoll.facingAngle);
          const perpZ = -Math.sin(ragdoll.facingAngle);

          // Segment 1
          const t1_worldX = pelvisPart.x - fwdX * 0.16 * ragdoll.scale + perpX * swaySide * 0.3 * ragdoll.scale;
          const t1_worldY = pelvisPart.y - 0.08 * ragdoll.scale + swayUp * 0.5 * ragdoll.scale;
          const t1_worldZ = pelvisPart.z - fwdZ * 0.16 * ragdoll.scale + perpZ * swaySide * 0.3 * ragdoll.scale;

          tail1.vx = (t1_worldX - tail1.x) / dt;
          tail1.vy = (t1_worldY - tail1.y) / dt;
          tail1.vz = (t1_worldZ - tail1.z) / dt;
          tail1.oldX = tail1.x; tail1.oldY = tail1.y; tail1.oldZ = tail1.z;
          tail1.x = t1_worldX; tail1.y = t1_worldY; tail1.z = t1_worldZ;
          if (tail1.mesh) {
            tail1.mesh.position.set(tail1.x, tail1.y, tail1.z);
            tail1.mesh.rotation.set(0, ragdoll.facingAngle + Math.PI + swaySide * 0.5, 0);
          }

          // Segment 2
          if (tail2 && !tail2.dismembered) {
            const t2_worldX = tail1.x - fwdX * 0.18 * ragdoll.scale + perpX * swaySide * 0.7 * ragdoll.scale;
            const t2_worldY = tail1.y - 0.05 * ragdoll.scale + swayUp * 0.8 * ragdoll.scale;
            const t2_worldZ = tail1.z - fwdZ * 0.18 * ragdoll.scale + perpZ * swaySide * 0.7 * ragdoll.scale;

            tail2.vx = (t2_worldX - tail2.x) / dt;
            tail2.vy = (t2_worldY - tail2.y) / dt;
            tail2.vz = (t2_worldZ - tail2.z) / dt;
            tail2.oldX = tail2.x; tail2.oldY = tail2.y; tail2.oldZ = tail2.z;
            tail2.x = t2_worldX; tail2.y = t2_worldY; tail2.z = t2_worldZ;
            if (tail2.mesh) {
              tail2.mesh.position.set(tail2.x, tail2.y, tail2.z);
              tail2.mesh.rotation.set(swayUp * 0.4, ragdoll.facingAngle + Math.PI + swaySide * 0.9, 0);
            }

            // Segment 3
            if (tail3 && !tail3.dismembered) {
              const t3_worldX = tail2.x - fwdX * 0.18 * ragdoll.scale + perpX * swaySide * ragdoll.scale;
              const t3_worldY = tail2.y - 0.05 * ragdoll.scale + swayUp * ragdoll.scale;
              const t3_worldZ = tail2.z - fwdZ * 0.18 * ragdoll.scale + perpZ * swaySide * ragdoll.scale;

              tail3.vx = (t3_worldX - tail3.x) / dt;
              tail3.vy = (t3_worldY - tail3.y) / dt;
              tail3.vz = (t3_worldZ - tail3.z) / dt;
              tail3.oldX = tail3.x; tail3.oldY = tail3.y; tail3.oldZ = tail3.z;
              tail3.x = t3_worldX; tail3.y = t3_worldY; tail3.z = t3_worldZ;
              if (tail3.mesh) {
                tail3.mesh.position.set(tail3.x, tail3.y, tail3.z);
                tail3.mesh.rotation.set(swayUp * 0.8, ragdoll.facingAngle + Math.PI + swaySide * 1.3, 0);
              }
            }
          }
        }
      }

      // Realistic human breathing sound emitted from character's mouth cavity
      if ((ragdoll.isAlive || ragdoll.isWalkingRagdoll) && ragdoll.isControlled) {
        if (ragdoll.breathingTimer === undefined) ragdoll.breathingTimer = 0;
        ragdoll.breathingTimer += dt;
        const isMoving = Math.abs(ragdoll.charVel.x) > 0.1 || Math.abs(ragdoll.charVel.z) > 0.1;
        const breathPeriod = isMoving ? 1.5 : 2.5;

        if (ragdoll.breathingTimer >= breathPeriod) {
          ragdoll.breathingTimer = 0;
          ragdoll.breathingPhase = ragdoll.breathingPhase === 'exhale' ? 'inhale' : 'exhale';
          const headP = ragdoll.particles.find((p) => p.name === 'cabeza');
          const mouthPos = headP
            ? {
                x: headP.x + Math.sin(ragdoll.facingAngle) * 0.18,
                y: headP.y + 0.08,
                z: headP.z + Math.cos(ragdoll.facingAngle) * 0.18,
              }
            : { x: ragdoll.charPos.x, y: ragdoll.charPos.y + 1.7, z: ragdoll.charPos.z };

          const camPos = this.camera ? { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z } : undefined;
          soundEngine.playBreathing(ragdoll.breathingPhase, isMoving ? 0.65 : 0.45, mouthPos, camPos);
        }
      }
    }
  }

  /**
   * Realistic involuntary rotation spasms to character when releasing liquid.
   * STRICT REQUIREMENT: Only happens if ragdoll is activated or ragdoll walk is activated!
   * ("agrega rotaciones espasmos involuntarios realistas a personaje al liberar liquido pero solo suceda si esta ragdoll activado o ragdoll walk")
   */
  private applyFluidEmissionSpasms(ragdoll: Ragdoll3D, dt: number) {
    const isRagdollActive = (!ragdoll.isAlive || ragdoll.isCollapsed);
    const isRagdollWalk = !!ragdoll.isWalkingRagdoll;
    const canHaveSpasms = isRagdollActive || isRagdollWalk;

    if (!canHaveSpasms) {
      // STRICT REQUIREMENT: Spasms MUST ONLY happen if ragdoll is activated or ragdoll walk is activated!
      if (ragdoll.fluidSpasmAngles) {
        for (const key of Object.keys(ragdoll.fluidSpasmAngles)) {
          ragdoll.fluidSpasmAngles[key] = { rotX: 0, rotY: 0, rotZ: 0 };
        }
      }
      return;
    }

    // Check if liquid release is active (either continuous emission or burst contraction)
    const isEmitting = !!ragdoll.fluidEmissionActive || (ragdoll.fluidContractionBurstTimer ?? 0) > 0;

    // Decay burst timer
    if (ragdoll.fluidContractionBurstTimer !== undefined && ragdoll.fluidContractionBurstTimer > 0) {
      ragdoll.fluidContractionBurstTimer -= dt;
      if (ragdoll.fluidContractionBurstTimer <= 0) {
        ragdoll.fluidContractionBurstTimer = 0;
      }
    }

    if (!isEmitting) {
      if (ragdoll.fluidContractionIntensity && ragdoll.fluidContractionIntensity > 0.01) {
        ragdoll.fluidContractionIntensity = Math.max(0, ragdoll.fluidContractionIntensity - dt * 2.5);
      } else {
        ragdoll.fluidContractionIntensity = 0;
        if (ragdoll.fluidSpasmAngles) {
          for (const key of Object.keys(ragdoll.fluidSpasmAngles)) {
            const a = ragdoll.fluidSpasmAngles[key];
            if (a) {
              a.rotX *= 0.75;
              a.rotY *= 0.75;
              a.rotZ *= 0.75;
            }
          }
        }
        return;
      }
    }

    // Intensity during liquid emission spasm
    const intensity = Math.min(1.0, Math.max(0.35, ragdoll.fluidContractionIntensity || 0.75));

    // Phase progression for involuntary clonic & tonic contractions
    ragdoll.fluidSpasmPhase = (ragdoll.fluidSpasmPhase || 0) + dt * (8.5 + intensity * 7.5);
    const phase = ragdoll.fluidSpasmPhase;

    // Clonic pulses (sharp involuntary twitches) and tonic holds
    const clonicPulse = Math.pow(Math.max(0, Math.sin(phase * 4.2)), 2.0);
    const tonicHold = 0.5 + 0.5 * Math.sin(phase * 1.6);
    const tremorFine = Math.sin(phase * 24.0) * 0.16;
    const tremorFast = Math.cos(phase * 36.0) * 0.12;

    if (!ragdoll.fluidSpasmAngles) {
      ragdoll.fluidSpasmAngles = {};
    }

    // Face / Expression: involuntary mouth opening & blush reaction during release
    if ((ragdoll as any).faceData) {
      (ragdoll as any).faceData.mouthOpenness = Math.min(1.0, 0.45 + clonicPulse * 0.45);
      (ragdoll as any).faceData.blushTimer = Math.max((ragdoll as any).faceData.blushTimer || 0, 4.0);
    }

    // 1. INVOLUNTARY ROTATION SPASMS:
    // Pelvis (involuntary thrust spasms, rotation wobbles)
    ragdoll.fluidSpasmAngles['pelvis'] = {
      rotX: (0.32 * clonicPulse + 0.10 * tonicHold + tremorFine) * intensity,
      rotY: (0.15 * Math.sin(phase * 5.0) + tremorFast) * intensity,
      rotZ: (0.10 * Math.cos(phase * 6.0)) * intensity,
    };

    // Spine & Chest (involuntary hyperextension / opisthotonic back arching)
    const spineRotX = (-0.36 * clonicPulse - 0.14 * tonicHold - tremorFine * 0.4) * intensity;
    const spineRotY = (0.12 * Math.sin(phase * 3.5)) * intensity;
    const spineRotZ = (0.08 * tremorFast) * intensity;

    ragdoll.fluidSpasmAngles['pechobase'] = { rotX: spineRotX, rotY: spineRotY, rotZ: spineRotZ };
    ragdoll.fluidSpasmAngles['torso'] = { rotX: spineRotX * 0.85, rotY: spineRotY * 0.85, rotZ: spineRotZ * 0.85 };
    ragdoll.fluidSpasmAngles['ombligo'] = { rotX: spineRotX * 0.65, rotY: spineRotY * 0.65, rotZ: spineRotZ * 0.65 };
    ragdoll.fluidSpasmAngles['ombligo_bajo'] = { rotX: spineRotX * 0.45, rotY: spineRotY * 0.45, rotZ: spineRotZ * 0.45 };

    // Head & Neck (head thrown back involuntarily with high-frequency tremoring)
    ragdoll.fluidSpasmAngles['cabeza'] = {
      rotX: (-0.48 * clonicPulse - 0.22 * tonicHold) * intensity,
      rotY: (0.26 * Math.sin(phase * 7.5) + tremorFine * 1.5) * intensity,
      rotZ: (0.16 * Math.cos(phase * 8.0) + tremorFast) * intensity,
    };
    ragdoll.fluidSpasmAngles['cuello'] = {
      rotX: (-0.26 * clonicPulse - 0.12) * intensity,
      rotY: (0.14 * Math.sin(phase * 6.0)) * intensity,
      rotZ: (0.08 * tremorFine) * intensity,
    };

    // Upper Limbs (involuntary flexor muscle contractions, shivering forearms)
    ragdoll.fluidSpasmAngles['hombro_izq'] = {
      rotX: (-0.22 * clonicPulse - 0.12) * intensity,
      rotY: (0.28 + tremorFine) * intensity,
      rotZ: (-0.28 - tremorFast) * intensity,
    };
    ragdoll.fluidSpasmAngles['hombro_der'] = {
      rotX: (-0.22 * clonicPulse - 0.12) * intensity,
      rotY: (-0.28 - tremorFine) * intensity,
      rotZ: (0.28 + tremorFast) * intensity,
    };
    ragdoll.fluidSpasmAngles['codo_izq'] = {
      rotX: (0.60 * clonicPulse + 0.30 + tremorFine) * intensity,
      rotY: (0.10 * tremorFast) * intensity,
      rotZ: 0,
    };
    ragdoll.fluidSpasmAngles['codo_der'] = {
      rotX: (0.60 * clonicPulse + 0.30 + tremorFine) * intensity,
      rotY: (-0.10 * tremorFast) * intensity,
      rotZ: 0,
    };
    ragdoll.fluidSpasmAngles['mano_izq'] = {
      rotX: (0.42 * clonicPulse + 0.20 + tremorFast) * intensity,
      rotY: (0.14 * tremorFine) * intensity,
      rotZ: -0.18 * intensity,
    };
    ragdoll.fluidSpasmAngles['mano_der'] = {
      rotX: (0.42 * clonicPulse + 0.20 + tremorFast) * intensity,
      rotY: (-0.14 * tremorFine) * intensity,
      rotZ: 0.18 * intensity,
    };

    // Lower Limbs (involuntary leg tremors, jerking knees, curled feet)
    ragdoll.fluidSpasmAngles['muslo_izq'] = {
      rotX: (0.26 * clonicPulse + 0.10 + tremorFine) * intensity,
      rotY: (-0.20 + tremorFast) * intensity,
      rotZ: 0,
    };
    ragdoll.fluidSpasmAngles['muslo_der'] = {
      rotX: (0.26 * clonicPulse + 0.10 + tremorFine) * intensity,
      rotY: (0.20 - tremorFast) * intensity,
      rotZ: 0,
    };
    ragdoll.fluidSpasmAngles['rodilla_izq'] = {
      rotX: (0.42 * clonicPulse + 0.22 + Math.abs(tremorFine)) * intensity,
      rotY: 0,
      rotZ: 0,
    };
    ragdoll.fluidSpasmAngles['rodilla_der'] = {
      rotX: (0.42 * clonicPulse + 0.22 + Math.abs(tremorFine)) * intensity,
      rotY: 0,
      rotZ: 0,
    };
    ragdoll.fluidSpasmAngles['pie_izq'] = {
      rotX: (0.38 * clonicPulse + 0.18) * intensity,
      rotY: 0,
      rotZ: 0,
    };
    ragdoll.fluidSpasmAngles['pie_der'] = {
      rotX: (0.38 * clonicPulse + 0.18) * intensity,
      rotY: 0,
      rotZ: 0,
    };

    // 2. Physical involuntary twitch impulses on fallen ragdoll (convulsions on the ground)
    if (isRagdollActive) {
      const impulseMag = intensity * dt * 38.0;
      const pPel = ragdoll.particles.find((p) => p.name === 'pelvis');
      const pTor = ragdoll.particles.find((p) => p.name === 'pechobase' || p.name === 'torso');
      const pHead = ragdoll.particles.find((p) => p.name === 'cabeza');
      const pKL = ragdoll.particles.find((p) => p.name === 'rodilla_izq');
      const pKR = ragdoll.particles.find((p) => p.name === 'rodilla_der');

      if (pPel && !pPel.dismembered) {
        pPel.vy += (0.16 * clonicPulse + 0.04 * tremorFine) * impulseMag;
      }
      if (pTor && !pTor.dismembered) {
        pTor.vy += (0.12 * clonicPulse + 0.03 * tremorFast) * impulseMag;
      }
      if (pHead && !pHead.dismembered) {
        pHead.vx += (0.14 * tremorFine) * impulseMag;
        pHead.vy += (0.08 * clonicPulse) * impulseMag;
      }
      if (pKL && !pKL.dismembered) {
        pKL.vy += (0.14 * clonicPulse) * impulseMag;
      }
      if (pKR && !pKR.dismembered) {
        pKR.vy += (0.14 * clonicPulse) * impulseMag;
      }
    }
  }

  private integrateRagdollPhysics(
    dt: number,
    inputMoveVector?: { x: number; y: number },
    cameraForward?: THREE.Vector3,
    cameraRight?: THREE.Vector3,
    playerControlledRagdollId?: string
  ) {
    const gy = -20; // Natural downward gravity for ragdolls
    const damping = 0.996; // Air resistance per substep allowing natural free-fall acceleration under gravity
    const maxVel = 35.0; // Terminal velocity to allow normal falling speeds under gravity
    const gravityAccelMultiplier = 1.0; // Accurate Verlet acceleration

    const cannonEngine = CannonRagdollEngine.getInstance();

    for (const ragdoll of this.ragdolls) {

      this.updateTendonLines(ragdoll);
      this.applyFluidEmissionSpasms(ragdoll, dt);

      if (cannonEngine.cannonRagdolls.has(ragdoll.id)) {
        // Cannon.js is directly simulating this articulated humanoid ragdoll
        continue;
      }

      for (const p of ragdoll.particles) {
        const isRagdollDragged = ragdoll.particles.some((pt) => !!pt.dragTargetPos);
        if ((ragdoll.isAlive || (ragdoll.isWalkingRagdoll && !isRagdollDragged)) && !p.dismembered) continue;
        if (p.pinned) continue;

        if (p.dragTargetPos) {
          const dragDt = 0.016;
          p.vx = (p.dragTargetPos.x - p.x) / dragDt;
          p.vy = (p.dragTargetPos.y - p.y) / dragDt;
          p.vz = (p.dragTargetPos.z - p.z) / dragDt;
          // Maintain momentum on throw/release
          p.oldX = p.dragTargetPos.x - p.vx * dt;
          p.oldY = p.dragTargetPos.y - p.vy * dt;
          p.oldZ = p.dragTargetPos.z - p.vz * dt;
          p.x = p.dragTargetPos.x;
          p.y = p.dragTargetPos.y;
          p.z = p.dragTargetPos.z;
          if (p.mesh) {
            p.mesh.position.set(p.x, p.y, p.z);
          }
          continue;
        }

        const isFallingRagdoll = !ragdoll.isAlive || ragdoll.isCollapsed;
        const currentDamping = isFallingRagdoll ? 0.995 : damping;
        let vx = (p.x - p.oldX) * currentDamping;
        let vy = (p.y - p.oldY) * currentDamping;
        let vz = (p.z - p.oldZ) * currentDamping;

        // Cap speed to prevent particles flying away or vibrating wildly
        const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
        const maxDisp = maxVel * dt;
        if (speed > maxDisp && speed > 0) {
          const factor = maxDisp / speed;
          vx *= factor;
          vy *= factor;
          vz *= factor;
        }

        // Apply crawl and flop momentum when moving joystick while collapsed as ragdoll
        if (ragdoll.isControlled && ragdoll.isCollapsed && inputMoveVector && (inputMoveVector.x !== 0 || inputMoveVector.y !== 0) && cameraForward && cameraRight) {
          const crawlX = (cameraRight.x * inputMoveVector.x + cameraForward.x * inputMoveVector.y) * 6.0 * dt;
          const crawlZ = (cameraRight.z * inputMoveVector.x + cameraForward.z * inputMoveVector.y) * 6.0 * dt;
          vx += crawlX;
          vz += crawlZ;
        }

        p.oldX = p.x;
        p.oldY = p.y;
        p.oldZ = p.z;

        // Dynamic Verlet integration with downward gravity acceleration on Y-axis
        p.x += vx;
        p.y += vy + gy * gravityAccelMultiplier * dt * dt;
        p.z += vz;

        p.vx = vx / dt;
        p.vy = vy / dt;
        p.vz = vz / dt;
      }
    }
  }

  private solveConstraints() {
    const cannonEngine = CannonRagdollEngine.getInstance();
    for (const ragdoll of this.ragdolls) {
      if (cannonEngine.cannonRagdolls.has(ragdoll.id)) continue;
      const isRagdollDragged = ragdoll.particles.some((p) => !!p.dragTargetPos);
      if (ragdoll.isAlive || (ragdoll.isWalkingRagdoll && !isRagdollDragged)) continue;

      // Check if left/right arm is grabbed or grabbing
      let leftArmStiff = false;
      let rightArmStiff = false;

      const player = this.ragdolls[0];
      if (player) {
        for (const c of player.constraints) {
          if (!c.broken && (c.name === 'player_grab_left' || c.name === 'player_grab_right')) {
            const isP1Left = ['hombro_izq', 'brazo_izq', 'codo_izq', 'antebrazo_izq', 'muneca_izq', 'mano_izq'].includes(c.p1.name);
            const isP2Left = ['hombro_izq', 'brazo_izq', 'codo_izq', 'antebrazo_izq', 'muneca_izq', 'mano_izq'].includes(c.p2.name);
            const isP1Right = ['hombro_der', 'brazo_der', 'codo_der', 'antebrazo_der', 'muneca_der', 'mano_der'].includes(c.p1.name);
            const isP2Right = ['hombro_der', 'brazo_der', 'codo_der', 'antebrazo_der', 'muneca_der', 'mano_der'].includes(c.p2.name);

            if (c.p1.parentRagdollId === ragdoll.id) {
              if (isP1Left) leftArmStiff = true;
              if (isP1Right) rightArmStiff = true;
            }
            if (c.p2.parentRagdollId === ragdoll.id) {
              if (isP2Left) leftArmStiff = true;
              if (isP2Right) rightArmStiff = true;
            }
          }
        }
      }

      if (ragdoll.isWerewolfHot || ragdoll.isDummyHot || ragdoll.hotGrabTargetId) {
        leftArmStiff = true;
        rightArmStiff = true;
      }

      if (ragdoll.id === (player ? player.id : '')) {
        for (const c of player.constraints) {
          if (!c.broken && c.name === 'player_grab_left') leftArmStiff = true;
          if (!c.broken && c.name === 'player_grab_right') rightArmStiff = true;
        }
      }

      const solverIters = isRagdollDragged ? 12 : 8;

      // Increase solver iterations for stability and stiffness
      for (let i = 0; i < solverIters; i++) {
        for (const c of ragdoll.constraints) {
          if (c.broken) continue;

          const p1 = c.p1;
          const p2 = c.p2;

          // Skip genital constraints from distance relaxation (anchored directly to pelvis frame)
          const isGenitalP1 = p1.name.includes('shaft') || p1.name.includes('glans') || p1.name.includes('testicle');
          const isGenitalP2 = p2.name.includes('shaft') || p2.name.includes('glans') || p2.name.includes('testicle');
          if (isGenitalP1 || isGenitalP2) continue;

          let targetX = p2.x;
          let targetY = p2.y;
          let targetZ = p2.z;

          if ((c as any).grabOffset) {
            targetX += (c as any).grabOffset.x;
            targetY += (c as any).grabOffset.y;
            targetZ += (c as any).grabOffset.z;
          }

          const dx = targetX - p1.x;
          const dy = targetY - p1.y;
          const dz = targetZ - p1.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist === 0) continue;

          const diff = (dist - c.length) / dist;

          // Dismemberment / bone fracture tension check (only when stretched beyond 1.8x rest length with violent force and not manually dragged or stuck in slime)
          if (!ragdoll.isWalkingRagdoll && !isRagdollDragged && !p1.adheredSlimeBlockId && !p2.adheredSlimeBlockId) {
            const stretchDist = Math.max(0, dist - c.length * 1.8);
            const tensionForce = stretchDist * c.stiffness * 180;
            if (tensionForce > c.breakForce) {
              c.broken = true;
              p1.dismembered = true;
              p2.dismembered = true;
              ragdoll.stats.brokenBones++;
              ragdoll.stats.dismemberedLimbs++;
              soundEngine.playBoneSnap();
              soundEngine.playBloodSplatter();
              continue;
            }
          }

          const totalMass = (p1.pinned ? 0 : p1.mass) + (p2.pinned ? 0 : p2.mass);
          if (totalMass === 0) continue;

          const p1IsDragged = !!p1.dragTargetPos;
          const p2IsDragged = !!p2.dragTargetPos;

          let p1Ratio = 0.5;
          let p2Ratio = 0.5;

          if (p1.pinned || p1IsDragged) {
            p1Ratio = 0;
            p2Ratio = (p2.pinned || p2IsDragged) ? 0 : 1;
          } else if (p2.pinned || p2IsDragged) {
            p1Ratio = 1;
            p2Ratio = 0;
          } else {
            p1Ratio = p2.mass / totalMass;
            p2Ratio = p1.mass / totalMass;
          }

          // Pre-cache constraint type flags to avoid expensive string array lookup during solver iterations
          if (c.isLeftArm === undefined) {
            const cName = c.name || '';
            const p1Name = p1.name || '';
            const p2Name = p2.name || '';
            c.isLeftArm = cName.includes('_izq') || p1Name.includes('_izq') || p2Name.includes('_izq');
            c.isRightArm = cName.includes('_der') || p1Name.includes('_der') || p2Name.includes('_der');
            c.isLegOrFoot = cName.includes('pie') || cName.includes('tobillo') || cName.includes('rodilla') || cName.includes('muslo') || cName.includes('antepierna') || p1Name.includes('pie') || p1Name.includes('muslo') || p2Name.includes('pie') || p2Name.includes('muslo');
            c.isFingerOrToe = (
              cName.includes('pulgar') ||
              cName.includes('indice') ||
              cName.includes('medio') ||
              cName.includes('anular') ||
              cName.includes('menique') ||
              cName.includes('dedo') ||
              p1Name.includes('dedo') ||
              p2Name.includes('dedo')
            );
            const hasRigidName = (nStr: string) => {
              const n = nStr.toLowerCase();
              return n.includes('pulgar') || n.includes('indice') || n.includes('medio') || n.includes('anular') || n.includes('menique') || n.includes('dedo') || n.includes('pie') || n.includes('talon') || n.includes('tobillo') || n.includes('mano') || n.includes('muneca');
            };
            c.isExtremityRigid = hasRigidName(cName) || hasRigidName(p1Name) || hasRigidName(p2Name);
          }

          // Firm structural bone distance constraint enforcement
          // Smooth, damped convergence without overcorrection oscillations or telescoping
          let stiffnessFactor = isRagdollDragged ? 0.92 : (dist < c.length ? 0.90 : c.stiffness * 0.85);

          if (!ragdoll.isAlive) {
            // Natural ragdoll bone firmness: preserve bone length without stiffness locking
            stiffnessFactor = isRagdollDragged ? 0.92 : 0.88;
          }
          
          if (c.isExtremityRigid) {
            stiffnessFactor = 1.0;
          } else if (c.isFingerOrToe || c.isLegOrFoot) {
            stiffnessFactor = 0.98;
          } else if (leftArmStiff && c.isLeftArm) {
            stiffnessFactor = 0.98;
          } else if (rightArmStiff && c.isRightArm) {
            stiffnessFactor = 0.98;
          }

          const scalarCorr = diff * stiffnessFactor;

          const corrX = dx * scalarCorr;
          const corrY = dy * scalarCorr;
          const corrZ = dz * scalarCorr;

          if (!p1.pinned) {
            p1.x += corrX * p1Ratio;
            p1.y += corrY * p1Ratio;
            p1.z += corrZ * p1Ratio;
          }
          if (!p2.pinned) {
            p2.x -= corrX * p2Ratio;
            p2.y -= corrY * p2Ratio;
            p2.z -= corrZ * p2Ratio;
          }

          // MIN & MAX DISTANCE CLAMPS:
          // Prevents limbs and bones from telescoping (shrinking or stretching under impact/dragging)
          const isLimbDragged = p1IsDragged || p2IsDragged;
          const minAllowedDist = c.isExtremityRigid ? c.length * 0.999 : (c.isFingerOrToe ? c.length * 0.998 : c.length * 0.96);
          const maxAllowedFactor = c.isExtremityRigid ? 1.001 : (c.isFingerOrToe ? 1.002 : (c.isLegOrFoot ? 1.03 : (isLimbDragged ? 1.15 : 1.05)));
          const maxAllowedDist = c.length * maxAllowedFactor;
          const curDist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2 + (p1.z - p2.z) ** 2);

          if (curDist > maxAllowedDist && !c.broken) {
            const curDx = p1.x - p2.x;
            const curDy = p1.y - p2.y;
            const curDz = p1.z - p2.z;
            const excess = curDist - maxAllowedDist;
            const clampRatio = excess / (curDist || 0.001);

            if (!p1.pinned) {
              p1.x -= curDx * clampRatio * p1Ratio;
              p1.y -= curDy * clampRatio * p1Ratio;
              p1.z -= curDz * clampRatio * p1Ratio;
            }
            if (!p2.pinned) {
              p2.x += curDx * clampRatio * p2Ratio;
              p2.y += curDy * clampRatio * p2Ratio;
              p2.z += curDz * clampRatio * p2Ratio;
            }
          } else if (curDist < minAllowedDist && !c.broken && curDist > 0.0001) {
            const curDx = p1.x - p2.x;
            const curDy = p1.y - p2.y;
            const curDz = p1.z - p2.z;
            const deficit = minAllowedDist - curDist;
            const clampRatio = deficit / (curDist || 0.001);

            if (!p1.pinned) {
              p1.x += curDx * clampRatio * p1Ratio;
              p1.y += curDy * clampRatio * p1Ratio;
              p1.z += curDz * clampRatio * p1Ratio;
            }
            if (!p2.pinned) {
              p2.x -= curDx * clampRatio * p2Ratio;
              p2.y -= curDy * clampRatio * p2Ratio;
              p2.z -= curDz * clampRatio * p2Ratio;
            }
          }
        }
      }
    }
  }

  private solveRagdollSelfCollisions() {
    // Inter-limb collision for pseudo cylinders and joint spheres only.
    // Extremity cubic/voxel blocks DO NOT collide with each other (as desired: "las extremidades bloques no eso esta bien").
    interface LimbCapsule {
      name: string;
      pA: Particle3D;
      pB: Particle3D;
      rA: number;
      rB: number;
      group: 'torso' | 'arm_l' | 'arm_r' | 'leg_l' | 'leg_r' | 'head';
    }

    const collideCapsules = (c1: LimbCapsule, c2: LimbCapsule, scale: number = 1.0) => {
      const pA1 = c1.pA, pB1 = c1.pB;
      const pA2 = c2.pA, pB2 = c2.pB;

      const uX = pB1.x - pA1.x, uY = pB1.y - pA1.y, uZ = pB1.z - pA1.z;
      const vX = pB2.x - pA2.x, vY = pB2.y - pA2.y, vZ = pB2.z - pA2.z;
      const wX = pA1.x - pA2.x, wY = pA1.y - pA2.y, wZ = pA1.z - pA2.z;

      const a = uX * uX + uY * uY + uZ * uZ;
      const b = uX * vX + uY * vY + uZ * vZ;
      const c = vX * vX + vY * vY + vZ * vZ;
      const d = uX * wX + uY * wY + uZ * wZ;
      const e = vX * wX + vY * wY + vZ * wZ;

      const denom = a * c - b * b;
      let s = 0.0;
      let t = 0.0;

      if (denom > 1e-6) {
        s = THREE.MathUtils.clamp((b * e - c * d) / denom, 0.0, 1.0);
      } else {
        s = 0.0;
      }

      if (c > 1e-6) {
        t = THREE.MathUtils.clamp((b * s + e) / c, 0.0, 1.0);
      } else {
        t = 0.0;
      }

      if (a > 1e-6) {
        s = THREE.MathUtils.clamp((b * t - d) / a, 0.0, 1.0);
      }

      const c1x = pA1.x + s * uX;
      const c1y = pA1.y + s * uY;
      const c1z = pA1.z + s * uZ;

      const c2x = pA2.x + t * vX;
      const c2y = pA2.y + t * vY;
      const c2z = pA2.z + t * vZ;

      // For adjacent thigh vs thigh: thighs naturally join at the pelvis hip sockets.
      // Skip the proximal 35% near hip roots so legs don't get forced outward in natural posture
      if (
        ((c1.name === 'thigh_l' && c2.name === 'thigh_r') ||
         (c1.name === 'thigh_r' && c2.name === 'thigh_l')) &&
        s < 0.35 && t < 0.35
      ) {
        return;
      }

      const dx = c1x - c2x;
      const dy = c1y - c2y;
      const dz = c1z - c2z;
      const distSq = dx * dx + dy * dy + dz * dz;

      // Natural self-collision clearance: ~82% of outer cylinder radius prevents interpenetration
      // while keeping limbs flexible and letting ragdolls fall and settle naturally
      const r1 = c1.rA * (1.0 - s) + c1.rB * s;
      const r2 = c2.rA * (1.0 - t) + c2.rB * t;
      let minDist = (r1 + r2) * 0.80;

      // Special anatomical clearance: inner thighs have a natural resting separation of ~0.20-0.22.
      // Cap minDist so thighs do not artificially push each other when falling straight or walking.
      if (
        (c1.name === 'thigh_l' && c2.name === 'thigh_r') ||
        (c1.name === 'thigh_r' && c2.name === 'thigh_l')
      ) {
        minDist = Math.min(minDist, 0.185 * scale);
      }

      if (distSq < minDist * minDist && distSq > 1e-8) {
        const dist = Math.sqrt(distSq);
        const penetration = minDist - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;

        // Position-based dynamics: each body resolves half of the penetration smoothly
        const push = penetration * 0.5;

        const shift1x = nx * push;
        const shift1y = ny * push;
        const shift1z = nz * push;

        const shift2x = -nx * push;
        const shift2y = -ny * push;
        const shift2z = -nz * push;

        // In Verlet integration, moving position AND oldPosition together maintains the current momentum.
        // This ensures the ragdoll falls 100% naturally without twitching, spasming, or phantom flight impulses.
        const wA1 = 1.0 - s, wB1 = s;
        if (!pA1.pinned) {
          pA1.x += shift1x * wA1; pA1.y += shift1y * wA1; pA1.z += shift1z * wA1;
          pA1.oldX += shift1x * wA1; pA1.oldY += shift1y * wA1; pA1.oldZ += shift1z * wA1;
        }
        if (!pB1.pinned) {
          pB1.x += shift1x * wB1; pB1.y += shift1y * wB1; pB1.z += shift1z * wB1;
          pB1.oldX += shift1x * wB1; pB1.oldY += shift1y * wB1; pB1.oldZ += shift1z * wB1;
        }

        const wA2 = 1.0 - t, wB2 = t;
        if (!pA2.pinned) {
          pA2.x += shift2x * wA2; pA2.y += shift2y * wA2; pA2.z += shift2z * wA2;
          pA2.oldX += shift2x * wA2; pA2.oldY += shift2y * wA2; pA2.oldZ += shift2z * wA2;
        }
        if (!pB2.pinned) {
          pB2.x += shift2x * wB2; pB2.y += shift2y * wB2; pB2.z += shift2z * wB2;
          pB2.oldX += shift2x * wB2; pB2.oldY += shift2y * wB2; pB2.oldZ += shift2z * wB2;
        }
      }
    };

    for (const ragdoll of this.ragdolls) {
      if (CannonRagdollEngine.getInstance().cannonRagdolls.has(ragdoll.id)) continue;
      if (!ragdoll.particles || ragdoll.particles.length === 0) continue;
      // Alive active humanoids use their own upright kinematic animations; only collide in ragdoll/fallen states
      const isRagdollDragged = ragdoll.particles.some((p) => !!p.dragTargetPos);
      if (ragdoll.isAlive || (ragdoll.isWalkingRagdoll && !isRagdollDragged) || (!ragdoll.isWalkingRagdoll && !ragdoll.isCollapsed)) continue;

      const scale = ragdoll.scale || 1.0;
      const getParticle = (name: string) => ragdoll.particles.find((p) => p.name === name);

      const capsules: LimbCapsule[] = [];

      const addCapsule = (
        name: string,
        nameA: string,
        nameB: string,
        group: 'torso' | 'arm_l' | 'arm_r' | 'leg_l' | 'leg_r' | 'head'
      ) => {
        const pA = getParticle(nameA);
        const pB = getParticle(nameB);
        if (!pA || !pB || pA.dismembered || pB.dismembered) return;
        const rA = getPartBaseCylinderRadius(nameA, scale);
        const rB = getPartBaseCylinderRadius(nameB, scale);
        capsules.push({ name, pA, pB, rA, rB, group });
      };

      // 1. Torso & Spine segments
      addCapsule('torso_upper', 'pechobase', 'torso', 'torso');
      addCapsule('torso_lower', 'torso', 'pelvis', 'torso');

      // 2. Left Leg (Thigh, Shin, Foot)
      addCapsule('thigh_l', 'muslo_izq', 'rodilla_izq', 'leg_l');
      addCapsule('shin_l', 'rodilla_izq', 'tobillo_izq', 'leg_l');
      addCapsule('foot_l', 'tobillo_izq', 'pie_izq', 'leg_l');

      // 3. Right Leg (Thigh, Shin, Foot)
      addCapsule('thigh_r', 'muslo_der', 'rodilla_der', 'leg_r');
      addCapsule('shin_r', 'rodilla_der', 'tobillo_der', 'leg_r');
      addCapsule('foot_r', 'tobillo_der', 'pie_der', 'leg_r');

      // 4. Left Arm (Upper arm, Forearm, Hand)
      addCapsule('arm_l', 'hombro_izq', 'codo_izq', 'arm_l');
      addCapsule('forearm_l', 'codo_izq', 'muneca_izq', 'arm_l');
      addCapsule('hand_l', 'muneca_izq', 'mano_izq', 'arm_l');

      // 5. Right Arm (Upper arm, Forearm, Hand)
      addCapsule('arm_r', 'hombro_der', 'codo_der', 'arm_r');
      addCapsule('forearm_r', 'codo_der', 'muneca_der', 'arm_r');
      addCapsule('hand_r', 'muneca_der', 'mano_der', 'arm_r');

      // 6. Head
      addCapsule('head', 'cuello', 'cabeza', 'head');

      const nCaps = capsules.length;
      for (let i = 0; i < nCaps; i++) {
        const c1 = capsules[i];
        for (let j = i + 1; j < nCaps; j++) {
          const c2 = capsules[j];

          // Segments in the same group share joints and articulate without self-collision
          if (c1.group === c2.group) continue;

          // Upper arm and upper torso share the shoulder joint; only forearm/hand collide with torso
          if (c1.group === 'torso' && (c2.name === 'arm_l' || c2.name === 'arm_r')) continue;
          if (c2.group === 'torso' && (c1.name === 'arm_l' || c1.name === 'arm_r')) continue;

          // Upper thigh and lower torso share the hip socket; skip direct proximal hip joint overlap
          if (c1.group === 'torso' && (c2.name === 'thigh_l' || c2.name === 'thigh_r')) continue;
          if (c2.group === 'torso' && (c1.name === 'thigh_l' || c1.name === 'thigh_r')) continue;

          // Head and upper torso share neck/pecho
          if (c1.group === 'head' && c2.group === 'torso') continue;
          if (c2.group === 'head' && c1.group === 'torso') continue;

          collideCapsules(c1, c2, scale);
        }
      }
    }
  }

  private updateTendonLines(ragdoll: Ragdoll3D) {
    // Show anatomical tendon ropes when user turns on X-Ray mode or Sin Piel mode
    const isXRayOrOrganMode = ragdoll.xrayMode !== undefined && ragdoll.xrayMode > 0;

    const getTendonRadius = (cName: string, p1Name: string, p2Name: string, scale: number = 1.0) => {
      const name = (cName + '_' + p1Name + '_' + p2Name).toLowerCase();
      if (name.includes('torso') || name.includes('ombligo') || name.includes('pelvis') || name.includes('pecho')) {
        return 0.026 * scale;
      }
      if (name.includes('muslo') || name.includes('rodilla') || name.includes('antepierna')) {
        return 0.025 * scale; // Piernas: robust tendons matching torso/pelvis
      }
      if (name.includes('tobillo') || name.includes('pie_talon') || name.includes('pie_medio')) {
        return 0.018 * scale;
      }
      if (name.includes('cuello') || name.includes('cabeza')) {
        return 0.025 * scale; // Cuello y cabeza: robust cervical tendons matching spine/pechobase
      }
      if (name.includes('shaft') || name.includes('glans') || name.includes('testicle') || name.includes('genital') || name.includes('male_')) {
        return 0.013 * scale; // Tendones anatómicos genital M (siempre activos)
      }
      if (name.includes('hombro') || name.includes('brazo') || name.includes('codo') || name.includes('antebrazo')) {
        return 0.024 * scale; // Brazos: defined fibrous tendons matching torso/pechobase
      }
      if (name.includes('muneca') || name.includes('mano')) {
        return 0.016 * scale;
      }
      if (name.includes('dedo_pie') || (name.includes('pie_') && !name.includes('talon') && !name.includes('medio'))) {
        return 0.010 * scale; // Tendones finos para dedos de los pies
      }
      if (name.includes('dedo') || name.includes('pulgar') || name.includes('indice') || name.includes('medio') || name.includes('anular') || name.includes('menique')) {
        return 0.008 * scale; // Tendones delicados para dedos de las manos
      }
      return 0.016 * scale;
    };

    if (!(ragdoll as any).tendonRopesGroup) {
      const group = new THREE.Group();
      group.name = 'AnatomyTendonRopesGroup';
      const mat = new THREE.MeshStandardMaterial({
        color: 0xfff1f2, // Creamy anatomical tendon fiber
        emissive: 0xfecdd3, // Soft glowing organic tendon tone
        emissiveIntensity: 0.35,
        roughness: 0.45,
        metalness: 0.1,
      });

      const meshes: THREE.Mesh[] = [];
      for (let i = 0; i < ragdoll.constraints.length; i++) {
        const c = ragdoll.constraints[i];
        const p1Name = c.p1 ? c.p1.name : '';
        const p2Name = c.p2 ? c.p2.name : '';
        const tRadius = getTendonRadius(c.name || '', p1Name, p2Name, ragdoll.scale || 1.0);

        // Create 3-strand helical twisted fibrous tendon geometry matching torso/pechobase/pelvis/ombligo tendons
        const baseGeom = new THREE.CylinderGeometry(tRadius, tRadius, 1.0, 18, 20, false);
        const posAttr = baseGeom.attributes.position;
        const count = posAttr.count;
        for (let k = 0; k < count; k++) {
          const x = posAttr.getX(k);
          const y = posAttr.getY(k);
          const z = posAttr.getZ(k);
          const r = Math.sqrt(x * x + z * z);
          if (r > 0.0001) {
            const theta = Math.atan2(z, x);
            const factor = 1.0 + 0.22 * Math.sin(theta * 3 + y * 35.0);
            posAttr.setX(k, x * factor);
            posAttr.setZ(k, z * factor);
          }
        }
        posAttr.needsUpdate = true;
        baseGeom.computeVertexNormals();

        const mesh = new THREE.Mesh(baseGeom, mat.clone());
        mesh.visible = false;
        group.add(mesh);
        meshes.push(mesh);
      }
      group.userData.meshes = meshes;
      (ragdoll as any).tendonRopesGroup = group;
      if (this.scene) {
        this.scene.add(group);
      } else {
        ragdoll.groupMesh.add(group);
      }
    }

    const ropeGroup = (ragdoll as any).tendonRopesGroup as THREE.Group;
    let meshes = ropeGroup.userData.meshes as THREE.Mesh[];

    // Dynamically expand meshes if new constraints were added (e.g. genital M tendons)
    if (meshes && meshes.length < ragdoll.constraints.length) {
      const sampleMat = meshes[0]?.material || new THREE.MeshStandardMaterial({
        color: 0xfff1f2,
        emissive: 0xfecdd3,
        emissiveIntensity: 0.35,
        roughness: 0.45,
        metalness: 0.1,
      });

      while (meshes.length < ragdoll.constraints.length) {
        const i = meshes.length;
        const c = ragdoll.constraints[i];
        const p1Name = c.p1 ? c.p1.name : '';
        const p2Name = c.p2 ? c.p2.name : '';
        const tRadius = getTendonRadius(c.name || '', p1Name, p2Name, ragdoll.scale || 1.0);

        const baseGeom = new THREE.CylinderGeometry(tRadius, tRadius, 1.0, 18, 20, false);
        const posAttr = baseGeom.attributes.position;
        const count = posAttr.count;
        for (let k = 0; k < count; k++) {
          const x = posAttr.getX(k);
          const y = posAttr.getY(k);
          const z = posAttr.getZ(k);
          const r = Math.sqrt(x * x + z * z);
          if (r > 0.0001) {
            const theta = Math.atan2(z, x);
            const factor = 1.0 + 0.22 * Math.sin(theta * 3 + y * 35.0);
            posAttr.setX(k, x * factor);
            posAttr.setZ(k, z * factor);
          }
        }
        posAttr.needsUpdate = true;
        baseGeom.computeVertexNormals();

        const mesh = new THREE.Mesh(baseGeom, (sampleMat as THREE.Material).clone());
        mesh.visible = false;
        ropeGroup.add(mesh);
        meshes.push(mesh);
      }
    }

    // Rigidly anchor genital M, breasts, and glutes particles to their base bones (pelvis / pechobase) so they never drift or fly out of place
    const pPelvis = ragdoll.particles.find((p) => p.name === 'pelvis');
    const pPechobase = ragdoll.particles.find((p) => p.name === 'pechobase');
    const pScale = ragdoll.scale || 1.0;
    const facing = ragdoll.facingAngle || 0;
    const sinF = Math.sin(facing);
    const cosF = Math.cos(facing);

    if (pPelvis) {
      const erect = ragdoll.erectionLevel || 0;
      const erectAngle = -(Math.PI / 2 + 0.6) * erect;
      const reproScale = 1.0 + 0.5 * erect;

      // Softly anchor genital M base & glutes to pelvis so they move with the body while allowing natural bending and physics sway
      const anchorPelvisPart = (name: string, localX: number, localY: number, localZ: number, stiffness: number = 0.85) => {
        const pGen = ragdoll.particles.find((p) => p.name === name);
        if (pGen && !pGen.dismembered) {
          const wX = (localX * cosF + localZ * sinF) * pScale;
          const wY = localY * pScale;
          const wZ = (-localX * sinF + localZ * cosF) * pScale;
          const targetX = pPelvis.x + wX;
          const targetY = pPelvis.y + wY;
          const targetZ = pPelvis.z + wZ;
          pGen.x += (targetX - pGen.x) * stiffness;
          pGen.y += (targetY - pGen.y) * stiffness;
          pGen.z += (targetZ - pGen.z) * stiffness;
        }
      };

      anchorPelvisPart('testicle_l', -0.032, -0.06, 0.08, 0.85);
      anchorPelvisPart('testicle_r', 0.032, -0.06, 0.08, 0.85);
      anchorPelvisPart('male_shaft_0', 0, -0.04, 0.09, 0.85);
      // Let male_shaft_1 and male_glans move freely under constraints and tendon physics!
      anchorPelvisPart('male_shaft_1', 0, -0.04 - 0.07 * Math.cos(erectAngle) * reproScale, 0.09 + 0.07 * Math.sin(erectAngle) * reproScale, 0.25);
      anchorPelvisPart('male_glans', 0, -0.04 - 0.14 * Math.cos(erectAngle) * reproScale, 0.09 + 0.14 * Math.sin(erectAngle) * reproScale, 0.15);

      // Glutes
      anchorPelvisPart('gluteo_izq', -0.095, 0.01, -0.14, 0.75);
      anchorPelvisPart('gluteo_der', 0.095, 0.01, -0.14, 0.75);
    }

    if (pPechobase) {
      const anchorPechobasePart = (name: string, localX: number, localY: number, localZ: number, stiffness: number = 0.75) => {
        const pBust = ragdoll.particles.find((p) => p.name === name);
        if (pBust && !pBust.dismembered) {
          const wX = (localX * cosF + localZ * sinF) * pScale;
          const wY = localY * pScale;
          const wZ = (-localX * sinF + localZ * cosF) * pScale;
          const targetX = pPechobase.x + wX;
          const targetY = pPechobase.y + wY;
          const targetZ = pPechobase.z + wZ;
          pBust.x += (targetX - pBust.x) * stiffness;
          pBust.y += (targetY - pBust.y) * stiffness;
          pBust.z += (targetZ - pBust.z) * stiffness;
        }
      };

      anchorPechobasePart('pecho_izq', -0.095, 0.01, 0.14, 0.75);
      anchorPechobasePart('pecho_der', 0.095, 0.01, 0.14, 0.75);
      anchorPechobasePart('tetilla_izq', -0.095, 0.01, 0.21, 0.85);
      anchorPechobasePart('tetilla_der', 0.095, 0.01, 0.21, 0.85);
    }

    // Only show tendon ropes when X-Ray / Sin Piel (Organ) mode is active!
    ropeGroup.visible = isXRayOrOrganMode;
    if (!isXRayOrOrganMode) {
      for (let i = 0; i < meshes.length; i++) {
        if (meshes[i]) meshes[i].visible = false;
      }
      return;
    }

    const p1World = new THREE.Vector3();
    const p2World = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion();

    for (let i = 0; i < ragdoll.constraints.length; i++) {
      const c = ragdoll.constraints[i];
      const mesh = meshes[i];
      if (!mesh) continue;

      // Never draw broken or detached constraints, or cross-body/grab constraints
      if (c.broken || !c.p1 || !c.p2 || c.p1.dismembered || c.p2.dismembered) {
        mesh.visible = false;
        continue;
      }
      if (c.name && (c.name.includes('ancho') || c.name.includes('grab') || c.name.includes('cross') || c.name.includes('stabilizer'))) {
        mesh.visible = false;
        continue;
      }

      // Restrict tendons strictly to anatomical skeleton, limbs, spine, hands, fingers, feet, toes, bust, glutes, and genital joints
      const cNameLow = (c.name || '').toLowerCase();
      const p1Low = (c.p1.name || '').toLowerCase();
      const p2Low = (c.p2.name || '').toLowerCase();
      const combined = `${cNameLow}_${p1Low}_${p2Low}`;

      const isAnatomyTendon = (
        combined.includes('shaft') ||
        combined.includes('glans') ||
        combined.includes('testicle') ||
        combined.includes('genital') ||
        combined.includes('male_') ||
        combined.includes('pecho') ||
        combined.includes('tetilla') ||
        combined.includes('breast') ||
        combined.includes('gluteo') ||
        combined.includes('glute')
      );

      const isAnatomicalJoint = (
        combined.includes('muslo') ||
        combined.includes('rodilla') ||
        combined.includes('antepierna') ||
        combined.includes('tobillo') ||
        combined.includes('pie') ||
        combined.includes('dedo') ||
        combined.includes('pulgar') ||
        combined.includes('indice') ||
        combined.includes('medio') ||
        combined.includes('anular') ||
        combined.includes('menique') ||
        combined.includes('hombro') ||
        combined.includes('brazo') ||
        combined.includes('codo') ||
        combined.includes('antebrazo') ||
        combined.includes('muneca') ||
        combined.includes('mano') ||
        combined.includes('cuello') ||
        combined.includes('cabeza') ||
        combined.includes('torso') ||
        combined.includes('ombligo') ||
        combined.includes('pechobase') ||
        combined.includes('pecho_bajo') ||
        combined.includes('pecho') ||
        combined.includes('pelvis')
      );

      if (!isAnatomicalJoint && !isAnatomyTendon) {
        mesh.visible = false;
        continue;
      }

      p1World.set(c.p1.x, c.p1.y, c.p1.z);
      p2World.set(c.p2.x, c.p2.y, c.p2.z);

      dir.subVectors(p2World, p1World);
      const len = dir.length();
      const maxAllowedLen = (c.length || 0.35) * 1.35;
      if (len < 0.005 || len > maxAllowedLen) {
        mesh.visible = false;
        continue;
      }

      mesh.visible = true;
      const visualTendonLen = len;
      mesh.scale.set(1, visualTendonLen, 1);
      mesh.position.copy(p1World).add(p2World).multiplyScalar(0.5);
      dir.normalize();
      const dotUp = up.dot(dir);
      if (dotUp > 0.9999) {
        mesh.quaternion.identity();
      } else if (dotUp < -0.9999) {
        mesh.quaternion.set(1, 0, 0, 0);
      } else {
        q.setFromUnitVectors(up, dir);
        mesh.quaternion.copy(q);
      }

      // Axial tendon rotation for fingers, toes, feet extremities and genital M with physiological limits
      const isExtremityOrGenitalTendon = 
        combined.includes('dedo') || 
        combined.includes('pulgar') || 
        combined.includes('indice') || 
        combined.includes('medio') || 
        combined.includes('anular') || 
        combined.includes('menique') || 
        combined.includes('pie') || 
        combined.includes('tobillo') || 
        combined.includes('mano') || 
        combined.includes('muneca') ||
        isAnatomyTendon;

      if (isExtremityOrGenitalTendon) {
        // Calculate dynamic axial rotation along tendon axis with strict limit clamp
        const twistAngle = Math.sin((p1World.x + p1World.z + p2World.y) * 4.5) * 0.45;
        const clampedTwist = THREE.MathUtils.clamp(twistAngle, -0.42, 0.42); // Strict limit (~24 deg)
        const twistQuat = new THREE.Quaternion().setFromAxisAngle(dir, clampedTwist);
        mesh.quaternion.premultiply(twistQuat);
      }
    }
  }

  private applyPassiveMuscleTone(ragdoll: Ragdoll3D) {
    const isRagdollDragged = ragdoll.particles.some((p) => !!p.dragTargetPos);
    if (ragdoll.isAlive || (ragdoll.isWalkingRagdoll && !isRagdollDragged)) return;

    const getParticle = (name: string) => ragdoll.particles.find((p) => p.name === name);

    // Dynamic Balance & Upright Tendon State Detection
    const pPelvis = getParticle('pelvis');
    const pHead = getParticle('cabeza');
    const pTorso = getParticle('pechobase') || getParticle('torso');

    let isUpright = false;
    let spineTilt = 1.0;
    if (pPelvis && (pHead || pTorso)) {
      const topPart = pHead || pTorso!;
      const dy = topPart.y - pPelvis.y;
      const dx = topPart.x - pPelvis.x;
      const dz = topPart.z - pPelvis.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
      spineTilt = dy / dist; // 1 = standing straight up, 0 = lying horizontal, <0 = upside down
      isUpright = spineTilt > 0.48; // Standing upright within ~62 degrees of vertical
    }

    // Dynamic Tendon Strength:
    // Tendons are very strong by default and firmly hold standing posture when upright and grounded.
    // If falling or knocked over, posture hold zeroes out cleanly yielding natural limp ragdoll physics without tendon deformation.
    const tendonStrength = isUpright ? 1.0 : THREE.MathUtils.clamp((spineTilt - 0.10) / 0.38, 0.0, 1.0);
    (ragdoll as any).currentTendonStrength = tendonStrength;
    (ragdoll as any).isUprightBalanced = isUpright;

    // Joints with passive muscular resistance & internal rotational viscosity (along continuous straight limb/spine axes, hands, fingers, feet, toes)
    const muscleJoints: Array<{ a: string; b: string; c: string; drag: number; postureHold: number }> = [
      // Spine tone
      { a: 'pelvis', b: 'ombligo_bajo', c: 'ombligo', drag: 0.22, postureHold: 0.20 },
      { a: 'ombligo_bajo', b: 'ombligo', c: 'torso', drag: 0.22, postureHold: 0.20 },
      { a: 'ombligo', b: 'torso', c: 'pecho_bajo', drag: 0.22, postureHold: 0.20 },
      { a: 'torso', b: 'pecho_bajo', c: 'pechobase', drag: 0.22, postureHold: 0.20 },
      { a: 'pecho_bajo', b: 'pechobase', c: 'cuello', drag: 0.22, postureHold: 0.20 },
      { a: 'pechobase', b: 'cuello', c: 'cabeza', drag: 0.22, postureHold: 0.20 },

      // Legs passive tone (thighs, knees, shins, ankles, feet, toes strictly aligned along continuous limb chains)
      { a: 'muslo_izq', b: 'rodilla_izq', c: 'antepierna_izq', drag: 0.25, postureHold: 0.24 },
      { a: 'muslo_der', b: 'rodilla_der', c: 'antepierna_der', drag: 0.25, postureHold: 0.24 },
      { a: 'rodilla_izq', b: 'antepierna_izq', c: 'tobillo_izq', drag: 0.25, postureHold: 0.24 },
      { a: 'rodilla_der', b: 'antepierna_der', c: 'tobillo_der', drag: 0.25, postureHold: 0.24 },
      { a: 'antepierna_izq', b: 'tobillo_izq', c: 'pie_izq_talon', drag: 0.22, postureHold: 0.20 },
      { a: 'antepierna_der', b: 'tobillo_der', c: 'pie_der_talon', drag: 0.22, postureHold: 0.20 },
      { a: 'tobillo_izq', b: 'pie_izq_talon', c: 'pie_izq_medio', drag: 0.25, postureHold: 0.22 },
      { a: 'tobillo_der', b: 'pie_der_talon', c: 'pie_der_medio', drag: 0.25, postureHold: 0.22 },
      { a: 'pie_izq_talon', b: 'pie_izq_medio', c: 'pie_izq', drag: 0.25, postureHold: 0.22 },
      { a: 'pie_der_talon', b: 'pie_der_medio', c: 'pie_der', drag: 0.25, postureHold: 0.22 },
      { a: 'pie_izq_medio', b: 'pie_izq', c: 'dedo_pie_pulgar_izq', drag: 0.25, postureHold: 0.22 },
      { a: 'pie_izq_medio', b: 'pie_izq', c: 'dedo_pie_indice_izq', drag: 0.25, postureHold: 0.22 },
      { a: 'pie_izq_medio', b: 'pie_izq', c: 'dedo_pie_medio_izq', drag: 0.25, postureHold: 0.22 },
      { a: 'pie_izq_medio', b: 'pie_izq', c: 'dedo_pie_anular_izq', drag: 0.25, postureHold: 0.22 },
      { a: 'pie_izq_medio', b: 'pie_izq', c: 'dedo_pie_menique_izq', drag: 0.25, postureHold: 0.22 },
      { a: 'pie_der_medio', b: 'pie_der', c: 'dedo_pie_pulgar_der', drag: 0.25, postureHold: 0.22 },
      { a: 'pie_der_medio', b: 'pie_der', c: 'dedo_pie_indice_der', drag: 0.25, postureHold: 0.22 },
      { a: 'pie_der_medio', b: 'pie_der', c: 'dedo_pie_medio_der', drag: 0.25, postureHold: 0.22 },
      { a: 'pie_der_medio', b: 'pie_der', c: 'dedo_pie_anular_der', drag: 0.25, postureHold: 0.22 },
      { a: 'pie_der_medio', b: 'pie_der', c: 'dedo_pie_menique_der', drag: 0.25, postureHold: 0.22 },

      // Arms passive tone (shoulders, upper arms, elbows, forearms, wrists, hands strictly aligned along continuous limb chains)
      { a: 'hombro_izq', b: 'brazo_izq', c: 'codo_izq', drag: 0.25, postureHold: 0.24 },
      { a: 'hombro_der', b: 'brazo_der', c: 'codo_der', drag: 0.25, postureHold: 0.24 },
      { a: 'brazo_izq', b: 'codo_izq', c: 'antebrazo_izq', drag: 0.25, postureHold: 0.24 },
      { a: 'brazo_der', b: 'codo_der', c: 'antebrazo_der', drag: 0.25, postureHold: 0.24 },
      { a: 'codo_izq', b: 'antebrazo_izq', c: 'muneca_izq', drag: 0.25, postureHold: 0.24 },
      { a: 'codo_der', b: 'antebrazo_der', c: 'muneca_der', drag: 0.25, postureHold: 0.24 },
      { a: 'antebrazo_izq', b: 'muneca_izq', c: 'mano_izq', drag: 0.22, postureHold: 0.20 },
      { a: 'antebrazo_der', b: 'muneca_der', c: 'mano_der', drag: 0.22, postureHold: 0.20 },

      // Hand Fingers passive tone (Left Hand: 5 fingers x 3 segments)
      { a: 'mano_izq', b: 'dedo_pulgar_izq', c: 'dedo_pulgar_izq_seg2', drag: 0.22, postureHold: 0.20 },
      { a: 'dedo_pulgar_izq', b: 'dedo_pulgar_izq_seg2', c: 'dedo_pulgar_izq_seg3', drag: 0.22, postureHold: 0.20 },
      { a: 'mano_izq', b: 'dedo_indice_izq', c: 'dedo_indice_izq_seg2', drag: 0.22, postureHold: 0.20 },
      { a: 'dedo_indice_izq', b: 'dedo_indice_izq_seg2', c: 'dedo_indice_izq_seg3', drag: 0.22, postureHold: 0.20 },
      { a: 'mano_izq', b: 'dedo_medio_izq', c: 'dedo_medio_izq_seg2', drag: 0.22, postureHold: 0.20 },
      { a: 'dedo_medio_izq', b: 'dedo_medio_izq_seg2', c: 'dedo_medio_izq_seg3', drag: 0.22, postureHold: 0.20 },
      { a: 'mano_izq', b: 'dedo_anular_izq', c: 'dedo_anular_izq_seg2', drag: 0.22, postureHold: 0.20 },
      { a: 'dedo_anular_izq', b: 'dedo_anular_izq_seg2', c: 'dedo_anular_izq_seg3', drag: 0.22, postureHold: 0.20 },
      { a: 'mano_izq', b: 'dedo_menique_izq', c: 'dedo_menique_izq_seg2', drag: 0.22, postureHold: 0.20 },
      { a: 'dedo_menique_izq', b: 'dedo_menique_izq_seg2', c: 'dedo_menique_izq_seg3', drag: 0.22, postureHold: 0.20 },

      // Hand Fingers passive tone (Right Hand: 5 fingers x 3 segments)
      { a: 'mano_der', b: 'dedo_pulgar_der', c: 'dedo_pulgar_der_seg2', drag: 0.22, postureHold: 0.20 },
      { a: 'dedo_pulgar_der', b: 'dedo_pulgar_der_seg2', c: 'dedo_pulgar_der_seg3', drag: 0.22, postureHold: 0.20 },
      { a: 'mano_der', b: 'dedo_indice_der', c: 'dedo_indice_der_seg2', drag: 0.22, postureHold: 0.20 },
      { a: 'dedo_indice_der', b: 'dedo_indice_der_seg2', c: 'dedo_indice_der_seg3', drag: 0.22, postureHold: 0.20 },
      { a: 'mano_der', b: 'dedo_medio_der', c: 'dedo_medio_der_seg2', drag: 0.22, postureHold: 0.20 },
      { a: 'dedo_medio_der', b: 'dedo_medio_der_seg2', c: 'dedo_medio_der_seg3', drag: 0.22, postureHold: 0.20 },
      { a: 'mano_der', b: 'dedo_anular_der', c: 'dedo_anular_der_seg2', drag: 0.22, postureHold: 0.20 },
      { a: 'dedo_anular_der', b: 'dedo_anular_der_seg2', c: 'dedo_anular_der_seg3', drag: 0.22, postureHold: 0.20 },
      { a: 'mano_der', b: 'dedo_menique_der', c: 'dedo_menique_der_seg2', drag: 0.22, postureHold: 0.20 },
      { a: 'dedo_menique_der', b: 'dedo_menique_der_seg2', c: 'dedo_menique_der_seg3', drag: 0.22, postureHold: 0.20 },
    ];

    for (const j of muscleJoints) {
      const pA = getParticle(j.a);
      const pB = getParticle(j.b);
      const pC = getParticle(j.c);
      if (!pA || !pB || !pC || pA.dismembered || pB.dismembered || pC.dismembered) continue;

      // Bone vector 1 (A -> B) and Bone vector 2 (B -> C)
      const v1x = pB.x - pA.x;
      const v1y = pB.y - pA.y;
      const v1z = pB.z - pA.z;

      const v2x = pC.x - pB.x;
      const v2y = pC.y - pB.y;
      const v2z = pC.z - pB.z;

      const len1 = Math.sqrt(v1x * v1x + v1y * v1y + v1z * v1z);
      const len2 = Math.sqrt(v2x * v2x + v2y * v2y + v2z * v2z);
      if (len1 < 0.001 || len2 < 0.001) continue;

      const n2x = v2x / len2, n2y = v2y / len2, n2z = v2z / len2;

      // 1. Joint Rotational Friction / Drag (prevents chaotic flailing when falling)
      const relVx = (pC.x - pC.oldX) - (pB.x - pB.oldX);
      const relVy = (pC.y - pC.oldY) - (pB.y - pB.oldY);
      const relVz = (pC.z - pC.oldZ) - (pB.z - pB.oldZ);

      // Perpendicular velocity component relative to bone direction
      const parDot = relVx * n2x + relVy * n2y + relVz * n2z;
      const perpVx = relVx - parDot * n2x;
      const perpVy = relVy - parDot * n2y;
      const perpVz = relVz - parDot * n2z;

      if (!pC.pinned) {
        pC.oldX += perpVx * j.drag;
        pC.oldY += perpVy * j.drag;
        pC.oldZ += perpVz * j.drag;
      }

      // 2. Straight Extended Posture Maintenance (gentle tendon tone keeps limb blocks straight when falling, strong tone holds posture when upright)
      const isDeadOrCollapsed = !ragdoll.isAlive || ragdoll.isCollapsed;
      const baseHold = (ragdoll.isWalkingRagdoll ? j.postureHold * 0.45 : j.postureHold * 0.35);
      const kHold = isDeadOrCollapsed
        ? j.postureHold * 0.03
        : (isRagdollDragged
            ? (isUpright ? baseHold * 0.5 : baseHold * 0.18)
            : baseHold * tendonStrength + j.postureHold * 0.15);
      if (!pC.pinned && kHold > 0) {
        const idealCx = pB.x + (v1x / len1) * len2;
        const idealCy = pB.y + (v1y / len1) * len2;
        const idealCz = pB.z + (v1z / len1) * len2;

        const shiftX = (idealCx - pC.x) * kHold;
        const shiftY = (idealCy - pC.y) * kHold;
        const shiftZ = (idealCz - pC.z) * kHold;

        pC.x += shiftX;
        pC.y += shiftY;
        pC.z += shiftZ;

        // Re-project pC to maintain exact constant bone length len2 from pB
        const curVx = pC.x - pB.x;
        const curVy = pC.y - pB.y;
        const curVz = pC.z - pB.z;
        const curLen = Math.sqrt(curVx * curVx + curVy * curVy + curVz * curVz) || len2;
        pC.x = pB.x + (curVx / curLen) * len2;
        pC.y = pB.y + (curVy / curLen) * len2;
        pC.z = pB.z + (curVz / curLen) * len2;
      }
    }

    // 3. Global Extremity Flail & Spin Clamp
    // Re-use already declared isRagdollDragged variable
    const extremities = [
      'mano_izq', 'mano_der', 'muneca_izq', 'muneca_der', 'tobillo_izq', 'tobillo_der',
      'cabeza', 'antebrazo_izq', 'antebrazo_der', 'antepierna_izq', 'antepierna_der',
      'pie_izq', 'pie_der', 
      'dedo_pulgar_izq', 'dedo_pulgar_izq_seg2', 'dedo_pulgar_izq_seg3',
      'dedo_indice_izq', 'dedo_indice_izq_seg2', 'dedo_indice_izq_seg3',
      'dedo_medio_izq', 'dedo_medio_izq_seg2', 'dedo_medio_izq_seg3',
      'dedo_anular_izq', 'dedo_anular_izq_seg2', 'dedo_anular_izq_seg3',
      'dedo_menique_izq', 'dedo_menique_izq_seg2', 'dedo_menique_izq_seg3',
      'dedo_pulgar_der', 'dedo_pulgar_der_seg2', 'dedo_pulgar_der_seg3',
      'dedo_indice_der', 'dedo_indice_der_seg2', 'dedo_indice_der_seg3',
      'dedo_medio_der', 'dedo_medio_der_seg2', 'dedo_medio_der_seg3',
      'dedo_anular_der', 'dedo_anular_der_seg2', 'dedo_anular_der_seg3',
      'dedo_menique_der', 'dedo_menique_der_seg2', 'dedo_menique_der_seg3',
      'dedo_pie_pulgar_izq', 'dedo_pie_indice_izq', 'dedo_pie_medio_izq', 'dedo_pie_anular_izq', 'dedo_pie_menique_izq',
      'dedo_pie_pulgar_der', 'dedo_pie_indice_der', 'dedo_pie_medio_der', 'dedo_pie_anular_der', 'dedo_pie_menique_der'
    ];
    for (const name of extremities) {
      const p = getParticle(name);
      if (!p || p.pinned) continue;
      const vx = p.x - p.oldX;
      const vy = p.y - p.oldY;
      const vz = p.z - p.oldZ;
      const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
      const maxSpeed = isRagdollDragged ? 3.5 : 1.2;
      if (speed > maxSpeed) {
        const factor = maxSpeed / speed;
        p.oldX = p.x - vx * factor;
        p.oldY = p.y - vy * factor;
        p.oldZ = p.z - vz * factor;
      }
    }
  }

  private solveSkeletalJointLimits() {
    const cannonEngine = CannonRagdollEngine.getInstance();
    for (const ragdoll of this.ragdolls) {
      if (cannonEngine.cannonRagdolls.has(ragdoll.id)) continue;
      const isRagdollDragged = ragdoll.particles.some((p) => !!p.dragTargetPos);
      if (ragdoll.isAlive || (ragdoll.isWalkingRagdoll && !isRagdollDragged)) continue;

      // Apply passive muscle tone & internal joint viscosity during fall or walk
      this.applyPassiveMuscleTone(ragdoll);

      const getParticle = (name: string) => ragdoll.particles.find((p) => p.name === name);

      // Enforce 3D collinear alignment between contiguous bone segments (keeps limb blocks straight relative to each other)
      const enforceJointAxisLimits = (
        parentName: string,
        jointName: string,
        childName: string,
        maxDeviationAngleDeg: number = 30,
        stiffness: number = 0.35
      ) => {
        const pA = getParticle(parentName);
        const pB = getParticle(jointName);
        const pC = getParticle(childName);
        if (!pA || !pB || !pC || pA.dismembered || pB.dismembered || pC.dismembered) return;

        // Bone vector 1: A -> B
        const v1x = pB.x - pA.x;
        const v1y = pB.y - pA.y;
        const v1z = pB.z - pA.z;
        const len1 = Math.sqrt(v1x * v1x + v1y * v1y + v1z * v1z);

        // Bone vector 2: B -> C
        const v2x = pC.x - pB.x;
        const v2y = pC.y - pB.y;
        const v2z = pC.z - pB.z;
        const len2 = Math.sqrt(v2x * v2x + v2y * v2y + v2z * v2z);

        if (len1 < 0.001 || len2 < 0.001) return;

        const n1x = v1x / len1, n1y = v1y / len1, n1z = v1z / len1;
        const n2x = v2x / len2, n2y = v2y / len2, n2z = v2z / len2;

        const dot = THREE.MathUtils.clamp(n1x * n2x + n1y * n2y + n1z * n2z, -1, 1);
        const currentRad = Math.acos(dot);
        const angleDeg = THREE.MathUtils.radToDeg(currentRad);

        if (angleDeg > maxDeviationAngleDeg) {
          const maxRad = THREE.MathUtils.degToRad(maxDeviationAngleDeg);
          const alpha = Math.min(1.0, (currentRad - maxRad) / (currentRad || 0.001));

          const targetNx = n2x + (n1x - n2x) * alpha;
          const targetNy = n2y + (n1y - n2y) * alpha;
          const targetNz = n2z + (n1z - n2z) * alpha;
          const tLen = Math.sqrt(targetNx * targetNx + targetNy * targetNy + targetNz * targetNz) || 1.0;

          const idealCx = pB.x + (targetNx / tLen) * len2;
          const idealCy = pB.y + (targetNy / tLen) * len2;
          const idealCz = pB.z + (targetNz / tLen) * len2;

          const shiftK = Math.min(0.60, stiffness);
          if (!pC.pinned) {
            const shiftX = (idealCx - pC.x) * shiftK;
            const shiftY = (idealCy - pC.y) * shiftK;
            const shiftZ = (idealCz - pC.z) * shiftK;
            pC.x += shiftX;
            pC.y += shiftY;
            pC.z += shiftZ;
            pC.oldX += shiftX;
            pC.oldY += shiftY;
            pC.oldZ += shiftZ;

            // Re-project pC to maintain exact constant bone length len2 from pB
            const curVx = pC.x - pB.x;
            const curVy = pC.y - pB.y;
            const curVz = pC.z - pB.z;
            const curLen = Math.sqrt(curVx * curVx + curVy * curVy + curVz * curVz) || len2;
            const repX = pB.x + (curVx / curLen) * len2;
            const repY = pB.y + (curVy / curLen) * len2;
            const repZ = pB.z + (curVz / curLen) * len2;
            pC.oldX += (repX - pC.x);
            pC.oldY += (repY - pC.y);
            pC.oldZ += (repZ - pC.z);
            pC.x = repX;
            pC.y = repY;
            pC.z = repZ;
          }
        }
      };

      // 1. Whole Body Coordinated Rotation (only active for standing walking alive humanoid)
      const enforceWholeBodyCoordinatedRotation = () => {
        if (!ragdoll.isWalkingRagdoll || !ragdoll.isAlive) return;

        const pPecho = getParticle('pechobase') || getParticle('torso');
        const pPelvis = getParticle('pelvis');
        const pHipL = getParticle('muslo_izq');
        const pHipR = getParticle('muslo_der');
        const pShL = getParticle('hombro_izq');
        const pShR = getParticle('hombro_der');
        if (!pPecho || !pPelvis || !pHipL || !pHipR || !pShL || !pShR) return;

        // Shoulder lateral vector (Hombro_Izq -> Hombro_Der)
        const shX = pShR.x - pShL.x;
        const shZ = pShR.z - pShL.z;
        const shLen = Math.sqrt(shX * shX + shZ * shZ) || 0.56;

        // Hip lateral vector (Muslo_Izq -> Muslo_Der)
        const hipX = pHipR.x - pHipL.x;
        const hipZ = pHipR.z - pHipL.z;
        const hipLen = Math.sqrt(hipX * hipX + hipZ * hipZ) || 0.22;

        // Lateral axis from character's master facingAngle (facing +Z means lateral +X)
        const targetLatX = Math.cos(ragdoll.facingAngle);
        const targetLatZ = -Math.sin(ragdoll.facingAngle);

        // Synchronize shoulders and hips to common lateral axis (rigid torso yaw without rotating character on strikes)
        const midShX = (pShL.x + pShR.x) * 0.5;
        const midShZ = (pShL.z + pShR.z) * 0.5;
        const halfSh = shLen * 0.5;
        const stiff = 0.30;

        const dShLx = (midShX - targetLatX * halfSh - pShL.x) * stiff;
        const dShLz = (midShZ - targetLatZ * halfSh - pShL.z) * stiff;
        const dShRx = (midShX + targetLatX * halfSh - pShR.x) * stiff;
        const dShRz = (midShZ + targetLatZ * halfSh - pShR.z) * stiff;

        pShL.x += dShLx; pShL.z += dShLz;
        pShR.x += dShRx; pShR.z += dShRz;

        const midHipX = (pHipL.x + pHipR.x) * 0.5;
        const midHipZ = (pHipL.z + pHipR.z) * 0.5;
        const halfHip = hipLen * 0.5;

        const dHipLx = (midHipX - targetLatX * halfHip - pHipL.x) * stiff;
        const dHipLz = (midHipZ - targetLatZ * halfHip - pHipL.z) * stiff;
        const dHipRx = (midHipX + targetLatX * halfHip - pHipR.x) * stiff;
        const dHipRz = (midHipZ + targetLatZ * halfHip - pHipR.z) * stiff;

        pHipL.x += dHipLx; pHipL.z += dHipLz;
        pHipR.x += dHipRx; pHipR.z += dHipRz;

        // Align spine particles along central torso axis
        const spineParts = ['pecho_bajo', 'torso', 'ombligo', 'ombligo_bajo'];
        for (const spName of spineParts) {
          const sp = getParticle(spName);
          if (sp && !sp.pinned && !sp.dismembered) {
            const t = (sp.y - pPelvis.y) / ((pPecho.y - pPelvis.y) || 0.001);
            const idealSpX = pPelvis.x + (pPecho.x - pPelvis.x) * t;
            const idealSpZ = pPelvis.z + (pPecho.z - pPelvis.z) * t;
            const dSpX = (idealSpX - sp.x) * 0.25;
            const dSpZ = (idealSpZ - sp.z) * 0.25;
            sp.x += dSpX; sp.z += dSpZ;
          }
        }
      };

      // 2. Anti-Collapse Straight Limb Structural Integrity (keeps limb blocks straight for both standing and falling ragdolls)
      const enforceStraightLimbStiffness = (
        nameA: string,
        nameB: string,
        nameC: string,
        minExtRatio: number = 0.70,
        stiff: number = 0.25
      ) => {
        const pA = getParticle(nameA);
        const pB = getParticle(nameB);
        const pC = getParticle(nameC);
        if (!pA || !pB || !pC || pA.dismembered || pB.dismembered || pC.dismembered) return;

        const effectiveStiff = (ragdoll.isWalkingRagdoll && ragdoll.isAlive) ? stiff : stiff * 0.45;

        const dAB = Math.sqrt((pB.x - pA.x) ** 2 + (pB.y - pA.y) ** 2 + (pB.z - pA.z) ** 2);
        const dBC = Math.sqrt((pC.x - pB.x) ** 2 + (pC.y - pB.y) ** 2 + (pC.z - pB.z) ** 2);
        const maxReach = dAB + dBC;
        const dAC = Math.sqrt((pC.x - pA.x) ** 2 + (pC.y - pA.y) ** 2 + (pC.z - pA.z) ** 2);
        const minAllowed = maxReach * minExtRatio;

        if (dAC < minAllowed && dAC > 0.001) {
          const push = (minAllowed - dAC) * effectiveStiff;
          const dirX = (pC.x - pA.x) / dAC;
          const dirY = (pC.y - pA.y) / dAC;
          const dirZ = (pC.z - pA.z) / dAC;

          const half = push * 0.5;
          if (!pC.pinned) {
            pC.x += dirX * half;
            pC.y += dirY * half;
            pC.z += dirZ * half;
            pC.oldX += dirX * half;
            pC.oldY += dirY * half;
            pC.oldZ += dirZ * half;
          }
          if (!pA.pinned) {
            pA.x -= dirX * half;
            pA.y -= dirY * half;
            pA.z -= dirZ * half;
            pA.oldX -= dirX * half;
            pA.oldY -= dirY * half;
            pA.oldZ -= dirZ * half;
          }
        }
      };

      // Helper function to enforce max bending angle limit on joint chain A -> B -> C
      const enforceHingeRange = (
        nameA: string,
        nameB: string,
        nameC: string,
        maxBendAngleDeg: number,
        stiffness: number = 0.35,
        springThresholdRatio: number = 0.70
      ) => {
        const pA = getParticle(nameA);
        const pB = getParticle(nameB);
        const pC = getParticle(nameC);
        if (!pA || !pB || !pC || pA.dismembered || pB.dismembered || pC.dismembered) return;

        const v1x = pB.x - pA.x;
        const v1y = pB.y - pA.y;
        const v1z = pB.z - pA.z;

        const v2x = pC.x - pB.x;
        const v2y = pC.y - pB.y;
        const v2z = pC.z - pB.z;

        const len1 = Math.sqrt(v1x * v1x + v1y * v1y + v1z * v1z);
        const len2 = Math.sqrt(v2x * v2x + v2y * v2y + v2z * v2z);
        if (len1 < 0.001 || len2 < 0.001) return;

        const n1x = v1x / len1, n1y = v1y / len1, n1z = v1z / len1;
        const n2x = v2x / len2, n2y = v2y / len2, n2z = v2z / len2;

        const dot = THREE.MathUtils.clamp(n1x * n2x + n1y * n2y + n1z * n2z, -1, 1);
        const angleRad = Math.acos(dot);
        const angleDeg = THREE.MathUtils.radToDeg(angleRad);

        // 1. Soft Joint Limit Clamping (Strict stop at maxBendAngleDeg)
        if (angleDeg > maxBendAngleDeg) {
          const maxRad = THREE.MathUtils.degToRad(maxBendAngleDeg);
          const alpha = Math.min(1.0, (angleRad - maxRad) / (angleRad || 0.001));
          const targetNx = n2x + (n1x - n2x) * alpha;
          const targetNy = n2y + (n1y - n2y) * alpha;
          const targetNz = n2z + (n1z - n2z) * alpha;
          const tLen = Math.sqrt(targetNx * targetNx + targetNy * targetNy + targetNz * targetNz) || 1.0;

          const targetX = pB.x + (targetNx / tLen) * len2;
          const targetY = pB.y + (targetNy / tLen) * len2;
          const targetZ = pB.z + (targetNz / tLen) * len2;

          const k = Math.min(0.70, stiffness * 0.60);
          const shiftX = (targetX - pC.x) * k;
          const shiftY = (targetY - pC.y) * k;
          const shiftZ = (targetZ - pC.z) * k;

          pC.x += shiftX;
          pC.y += shiftY;
          pC.z += shiftZ;
          pC.oldX += shiftX;
          pC.oldY += shiftY;
          pC.oldZ += shiftZ;

          // Re-project pC to maintain exact constant bone length len2 from pB
          const curVx = pC.x - pB.x;
          const curVy = pC.y - pB.y;
          const curVz = pC.z - pB.z;
          const curLen = Math.sqrt(curVx * curVx + curVy * curVy + curVz * curVz) || len2;
          const repX = pB.x + (curVx / curLen) * len2;
          const repY = pB.y + (curVy / curLen) * len2;
          const repZ = pB.z + (curVz / curLen) * len2;
          pC.oldX += (repX - pC.x);
          pC.oldY += (repY - pC.y);
          pC.oldZ += (repZ - pC.z);
          pC.x = repX;
          pC.y = repY;
          pC.z = repZ;
        }

        // 2. Tendon Elastic Potential Energy Recoil
        // Stores potential energy as joint bends towards limits (especially near 90 degrees in ragdoll mode).
        // "debe ser que haya energia potencial en los tendones si se llega a los 90 grados en ragdoll pero que sea debido a la fuerza que no pueda si no hay fuerza suficiente"
        // If there is NOT enough external force acting on the limb, the stored tendon potential energy
        // recoils strongly, preventing the limb from reaching or staying bent near 90 degrees.
        const springThreshold = maxBendAngleDeg * springThresholdRatio;
        if (angleDeg > springThreshold) {
          const excessRatio = (angleDeg - springThreshold) / (maxBendAngleDeg - springThreshold || 1.0);

          const relVx = (pC.x - pC.oldX) - (pB.x - pB.oldX);
          const relVy = (pC.y - pC.oldY) - (pB.y - pB.oldY);
          const relVz = (pC.z - pC.oldZ) - (pB.z - pB.oldZ);
          const extSpeed = Math.sqrt(relVx * relVx + relVy * relVy + relVz * relVz);

          let springK = 0;
          if (ragdoll.isWalkingRagdoll && ragdoll.isAlive && !ragdoll.isCollapsed && (ragdoll as any).isUprightBalanced) {
            springK = Math.min(0.20, Math.pow(Math.min(1.5, Math.max(0, excessRatio)), 1.5) * stiffness * 0.20);
          } else {
            // Ragdoll mode (dead, collapsed, or falling ragdoll):
            // Tendon potential energy U = 0.5 * k * (theta - theta0)^2
            const potentialEnergyFactor = Math.pow(Math.min(1.5, Math.max(0, excessRatio)), 1.5);
            // Low external force/speed cannot overcome the tendon tension: restoring recoil
            // High external force/speed (e.g. violent floor crash, heavy drag) yields smoothly
            const forceResistance = Math.max(0.15, 1.0 - Math.min(1.0, extSpeed * 8.0));
            springK = Math.min(0.22, potentialEnergyFactor * stiffness * 0.22 * forceResistance);
          }

          if (springK > 0.001) {
            const idealX = pB.x + n1x * len2;
            const idealY = pB.y + n1y * len2;
            const idealZ = pB.z + n1z * len2;

            const springPushX = (idealX - pC.x) * springK;
            const springPushY = (idealY - pC.y) * springK;
            const springPushZ = (idealZ - pC.z) * springK;

            pC.x += springPushX;
            pC.y += springPushY;
            pC.z += springPushZ;
            pC.oldX += springPushX;
            pC.oldY += springPushY;
            pC.oldZ += springPushZ;

            // Re-project pC
            const curVx = pC.x - pB.x;
            const curVy = pC.y - pB.y;
            const curVz = pC.z - pB.z;
            const curLen = Math.sqrt(curVx * curVx + curVy * curVy + curVz * curVz) || len2;
            const repX = pB.x + (curVx / curLen) * len2;
            const repY = pB.y + (curVy / curLen) * len2;
            const repZ = pB.z + (curVz / curLen) * len2;
            pC.oldX += (repX - pC.x);
            pC.oldY += (repY - pC.y);
            pC.oldZ += (repZ - pC.z);
            pC.x = repX;
            pC.y = repY;
            pC.z = repZ;
          }
        }
      };

      // Directional Neck Constraint
      const enforceNeckFlexion = (chestName: string, neckName: string, headName: string) => {
        const pChest = getParticle(chestName);
        const pNeck = getParticle(neckName);
        const pHead = getParticle(headName);
        if (!pChest || !pNeck || !pHead || pChest.dismembered || pNeck.dismembered || pHead.dismembered) return;

        enforceHingeRange(chestName, neckName, headName, 65, 0.40);
      };

      // Directional Wrist Constraint
      const enforceWristFlexion = (forearmName: string, wristName: string, handName: string) => {
        const pForearm = getParticle(forearmName);
        const pWrist = getParticle(wristName);
        const pHand = getParticle(handName);
        if (!pForearm || !pWrist || !pHand || pForearm.dismembered || pWrist.dismembered || pHand.dismembered) return;

        enforceHingeRange(forearmName, wristName, handName, 75, 0.40);
      };

      // Directional Knee Constraint: strictly prevents knees from hyperextending forward; knee ONLY bends backward naturally (up to 135 deg max)
      const enforceKneeFlexion = (thighName: string, kneeName: string, shinName: string, isLeft: boolean) => {
        const pThigh = getParticle(thighName);
        const pKnee = getParticle(kneeName);
        const pShin = getParticle(shinName);
        const pPelvis = getParticle('pelvis');
        const pTorso = getParticle('pechobase') || getParticle('torso');
        if (!pThigh || !pKnee || !pShin || !pPelvis || pThigh.dismembered || pKnee.dismembered || pShin.dismembered) return;

        // Thigh bone vector (Thigh -> Knee)
        const tx = pKnee.x - pThigh.x;
        const ty = pKnee.y - pThigh.y;
        const tz = pKnee.z - pThigh.z;
        const tLen = Math.sqrt(tx * tx + ty * ty + tz * tz);
        if (tLen < 0.001) return;

        // Shin bone vector (Knee -> Shin)
        const sx = pShin.x - pKnee.x;
        const sy = pShin.y - pKnee.y;
        const sz = pShin.z - pKnee.z;
        const sLen = Math.sqrt(sx * sx + sy * sy + sz * sz);
        if (sLen < 0.001) return;

        const nTx = tx / tLen, nTy = ty / tLen, nTz = tz / tLen;
        const nSx = sx / sLen, nSy = sy / sLen, nSz = sz / sLen;

        // Hip lateral axis (Left hip to Right hip)
        const pHipL = getParticle('muslo_izq');
        const pHipR = getParticle('muslo_der');
        let latX = 1, latY = 0, latZ = 0;
        if (pHipL && pHipR && !pHipL.dismembered && !pHipR.dismembered) {
          latX = pHipR.x - pHipL.x;
          latY = pHipR.y - pHipL.y;
          latZ = pHipR.z - pHipL.z;
        }
        // Orthogonalize lateral axis to thigh vector
        const dotLatT = latX * nTx + latY * nTy + latZ * nTz;
        latX -= nTx * dotLatT;
        latY -= nTy * dotLatT;
        latZ -= nTz * dotLatT;
        const latLen = Math.sqrt(latX * latX + latY * latY + latZ * latZ);
        if (latLen > 0.001) {
          latX /= latLen; latY /= latLen; latZ /= latLen;
        } else {
          latX = 1; latY = 0; latZ = 0;
        }

        // Anterior (kneecap forward) vector of this femur: cross(lat, nT)
        let antX = latY * nTz - latZ * nTy;
        let antY = latZ * nTx - latX * nTz;
        let antZ = latX * nTy - latY * nTx;
        const antLen = Math.sqrt(antX * antX + antY * antY + antZ * antZ);
        if (antLen > 0.001) {
          antX /= antLen; antY /= antLen; antZ /= antLen;
        }

        // Orient ant towards front of pelvis (positive anterior = kneecap facing forward)
        if (pTorso) {
          const upX = pTorso.x - pPelvis.x;
          const upY = pTorso.y - pPelvis.y;
          const upZ = pTorso.z - pPelvis.z;
          const pelvAntX = latY * upZ - latZ * upY;
          const pelvAntY = latZ * upX - latX * upZ;
          const pelvAntZ = latX * upY - latY * upX;
          if (antX * pelvAntX + antY * pelvAntY + antZ * pelvAntZ < 0) {
            antX = -antX; antY = -antY; antZ = -antZ;
          }
        }

        // Knee flexes strictly BACKWARD (-ant direction).
        // If shin bends FORWARD (+ant direction, forwardDot > 0.05), it is hyperextending.
        // We push it backward (-ant direction) so forwardDot is clamped <= 0.05.
        const forwardDot = nSx * antX + nSy * antY + nSz * antZ;
        if (forwardDot > 0.05) {
          const shiftFactor = ragdoll.isWalkingRagdoll ? 0.15 : 0.45;
          const shiftAmount = (forwardDot - 0.05) * shiftFactor;
          const shiftX = -antX * shiftAmount * sLen;
          const shiftY = -antY * shiftAmount * sLen;
          const shiftZ = -antZ * shiftAmount * sLen;
          pShin.x += shiftX;
          pShin.y += shiftY;
          pShin.z += shiftZ;
          pShin.oldX += shiftX;
          pShin.oldY += shiftY;
          pShin.oldZ += shiftZ;

          // Re-project pShin to keep exact distance sLen from pKnee
          const curSx = pShin.x - pKnee.x;
          const curSy = pShin.y - pKnee.y;
          const curSz = pShin.z - pKnee.z;
          const curSLen = Math.sqrt(curSx * curSx + curSy * curSy + curSz * curSz) || sLen;
          const repX = pKnee.x + (curSx / curSLen) * sLen;
          const repY = pKnee.y + (curSy / curSLen) * sLen;
          const repZ = pKnee.z + (curSz / curSLen) * sLen;
          pShin.oldX += (repX - pShin.x);
          pShin.oldY += (repY - pShin.y);
          pShin.oldZ += (repZ - pShin.z);
          pShin.x = repX;
          pShin.y = repY;
          pShin.z = repZ;
        }

        // Maximum natural flexion backwards is 140 degrees (smooth stable damping like arms in ragdoll walk)
        if (ragdoll.isWalkingRagdoll) {
          enforceHingeRange(thighName, kneeName, shinName, 140, 0.65, 0.85);
        } else {
          enforceHingeRange(thighName, kneeName, shinName, 140, 0.40, 0.70);
        }
      };

      // Directional Arm / Elbow Constraint: flexes in opposite direction to knee (elbow flexes forward/inward, knee flexes backward)
      // Directional Elbow Constraint: strictly forces elbows to flex FORWARD (+bodyFwd) and prevents backward hyperextension
      const enforceElbowFlexion = (armName: string, elbowName: string, forearmName: string, isLeft: boolean) => {
        const pArm = getParticle(armName);
        const pElbow = getParticle(elbowName);
        const pForearm = getParticle(forearmName);
        const pTorso = getParticle('pechobase') || getParticle('torso');
        const pPelvis = getParticle('pelvis');
        const pShL = getParticle('hombro_izq');
        const pShR = getParticle('hombro_der');
        if (!pArm || !pElbow || !pForearm || !pTorso || !pPelvis || !pShL || !pShR || pArm.dismembered || pElbow.dismembered || pForearm.dismembered) return;

        // Body reference axes (rotate dynamically with character torso in 3D)
        let upX = pTorso.x - pPelvis.x, upY = pTorso.y - pPelvis.y, upZ = pTorso.z - pPelvis.z;
        const upLen = Math.sqrt(upX * upX + upY * upY + upZ * upZ) || 1.0;
        upX /= upLen; upY /= upLen; upZ /= upLen;

        let rightX = pShR.x - pShL.x, rightY = pShR.y - pShL.y, rightZ = pShR.z - pShL.z;
        const rightLen = Math.sqrt(rightX * rightX + rightY * rightY + rightZ * rightZ) || 1.0;
        rightX /= rightLen; rightY /= rightLen; rightZ /= rightLen;

        // Character Anterior (FORWARD) vector = bodyUp x bodyRight
        let fwdX = upY * rightZ - upZ * rightY;
        let fwdY = upZ * rightX - upX * rightZ;
        let fwdZ = upX * rightY - upY * rightX;
        const fwdLen = Math.sqrt(fwdX * fwdX + fwdY * fwdY + fwdZ * fwdZ) || 1.0;
        fwdX /= fwdLen; fwdY /= fwdLen; fwdZ /= fwdLen;

        const backX = -fwdX, backY = -fwdY, backZ = -fwdZ;

        // Upper Arm vector (Arm -> Elbow)
        const ax = pElbow.x - pArm.x, ay = pElbow.y - pArm.y, az = pElbow.z - pArm.z;
        const aLen = Math.sqrt(ax * ax + ay * ay + az * az);
        if (aLen < 0.001) return;

        // Forearm vector (Elbow -> Forearm)
        const fx = pForearm.x - pElbow.x, fy = pForearm.y - pElbow.y, fz = pForearm.z - pElbow.z;
        const fLen = Math.sqrt(fx * fx + fy * fy + fz * fz);
        if (fLen < 0.001) return;

        const nAx = ax / aLen, nAy = ay / aLen, nAz = az / aLen;
        const nFx = fx / fLen, nFy = fy / fLen, nFz = fz / fLen;

        // Check if forearm is bending backward relative to upper arm direction
        const upperArmDotBack = nAx * backX + nAy * backY + nAz * backZ;
        const forearmDotBack = nFx * backX + nFy * backY + nFz * backZ;
        const relativeBackBend = forearmDotBack - upperArmDotBack;

        if (relativeBackBend > 0.10) {
          const shiftAmount = (relativeBackBend - 0.02) * 0.90;
          const shiftX = fwdX * shiftAmount * fLen;
          const shiftY = fwdY * shiftAmount * fLen;
          const shiftZ = fwdZ * shiftAmount * fLen;

          pForearm.x += shiftX;
          pForearm.y += shiftY;
          pForearm.z += shiftZ;
          pForearm.oldX += shiftX;
          pForearm.oldY += shiftY;
          pForearm.oldZ += shiftZ;

          // Re-project pForearm to keep exact distance fLen from pElbow
          const curFx = pForearm.x - pElbow.x;
          const curFy = pForearm.y - pElbow.y;
          const curFz = pForearm.z - pElbow.z;
          const curFLen = Math.sqrt(curFx * curFx + curFy * curFy + curFz * curFz) || fLen;
          const repX = pElbow.x + (curFx / curFLen) * fLen;
          const repY = pElbow.y + (curFy / curFLen) * fLen;
          const repZ = pElbow.z + (curFz / curFLen) * fLen;
          pForearm.oldX += (repX - pForearm.x);
          pForearm.oldY += (repY - pForearm.y);
          pForearm.oldZ += (repZ - pForearm.z);
          pForearm.x = repX;
          pForearm.y = repY;
          pForearm.z = repZ;
        }

        enforceHingeRange(armName, elbowName, forearmName, 135, 0.65, 0.85);
      };

      // Directional Shoulder & Upper Arm Anatomical Constraints:
      // Strictly enforces human rotation limits:
      // 1. Prevents rotation to the opposite side of the body (medial adduction limit past midline)
      // 2. Prevents backward hyperextension (shoulder retroversion clamped <= ~22-25 deg)
      // 3. Prevents arm inverted rotation through chest/ribcage
      const enforceShoulderAnatomicalLimits = (
        shoulderName: string,
        armName: string,
        elbowName: string,
        isLeft: boolean
      ) => {
        const pShoulder = getParticle(shoulderName);
        const pArm = getParticle(armName);
        const pElbow = getParticle(elbowName);
        const pTorso = getParticle('pechobase') || getParticle('torso');
        const pPelvis = getParticle('pelvis');
        const pShL = getParticle('hombro_izq');
        const pShR = getParticle('hombro_der');
        if (!pShoulder || !pArm || !pElbow || !pTorso || !pPelvis || !pShL || !pShR ||
            pShoulder.dismembered || pArm.dismembered || pElbow.dismembered) return;

        let upX = pTorso.x - pPelvis.x, upY = pTorso.y - pPelvis.y, upZ = pTorso.z - pPelvis.z;
        const upLen = Math.sqrt(upX * upX + upY * upY + upZ * upZ) || 1.0;
        upX /= upLen; upY /= upLen; upZ /= upLen;

        let rightX = pShR.x - pShL.x, rightY = pShR.y - pShL.y, rightZ = pShR.z - pShL.z;
        const rightLen = Math.sqrt(rightX * rightX + rightY * rightY + rightZ * rightZ) || 1.0;
        rightX /= rightLen; rightY /= rightLen; rightZ /= rightLen;

        let fwdX = upY * rightZ - upZ * rightY;
        let fwdY = upZ * rightX - upX * rightZ;
        let fwdZ = upX * rightY - upY * rightX;
        const fwdLen = Math.sqrt(fwdX * fwdX + fwdY * fwdY + fwdZ * fwdZ) || 1.0;
        fwdX /= fwdLen; fwdY /= fwdLen; fwdZ /= fwdLen;

        // Arm direction from shoulder to elbow
        let ex = pElbow.x - pShoulder.x, ey = pElbow.y - pShoulder.y, ez = pElbow.z - pShoulder.z;
        const eLen = Math.sqrt(ex * ex + ey * ey + ez * ez);
        if (eLen < 0.001) return;
        let nEx = ex / eLen, nEy = ey / eLen, nEz = ez / eLen;

        let corrected = false;

        // 1. Inward opposite-side limit (adduction past torso midline):
        // For Left arm: normal lateral direction is -right. Crossing to opposite (right) side means dot(arm, right) > 0.18
        // For Right arm: normal lateral direction is +right. Crossing to opposite (left) side means dot(arm, -right) > 0.18
        const dotOpposite = isLeft ? (nEx * rightX + nEy * rightY + nEz * rightZ) : (-nEx * rightX - nEy * rightY - nEz * rightZ);
        const maxOppositeCross = 0.18; // Clamped at ~10 degrees past shoulder sagittal plane
        if (dotOpposite > maxOppositeCross) {
          const excess = (dotOpposite - maxOppositeCross) * 0.92;
          const pushSign = isLeft ? -1 : 1;
          nEx += rightX * pushSign * excess;
          nEy += rightY * pushSign * excess;
          nEz += rightZ * pushSign * excess;
          corrected = true;
        }

        // 2. Backward hyperextension limit (arm moving behind torso back):
        const dotBack = -(nEx * fwdX + nEy * fwdY + nEz * fwdZ);
        const maxBack = 0.45; // Clamped at ~26 degrees backward for natural arm swing
        if (dotBack > maxBack) {
          const excess = (dotBack - maxBack) * 0.92;
          nEx += fwdX * excess;
          nEy += fwdY * excess;
          nEz += fwdZ * excess;
          corrected = true;
        }

        if (corrected) {
          const tLen = Math.sqrt(nEx * nEx + nEy * nEy + nEz * nEz) || 1.0;
          nEx /= tLen; nEy /= tLen; nEz /= tLen;

          const targetX = pShoulder.x + nEx * eLen;
          const targetY = pShoulder.y + nEy * eLen;
          const targetZ = pShoulder.z + nEz * eLen;

          const k = ragdoll.isWalkingRagdoll ? 0.75 : 0.55;
          const shiftX = (targetX - pElbow.x) * k;
          const shiftY = (targetY - pElbow.y) * k;
          const shiftZ = (targetZ - pElbow.z) * k;

          pElbow.x += shiftX;
          pElbow.y += shiftY;
          pElbow.z += shiftZ;
          pElbow.oldX += shiftX;
          pElbow.oldY += shiftY;
          pElbow.oldZ += shiftZ;

          if (pArm) {
            pArm.x = pShoulder.x + nEx * (eLen * 0.5);
            pArm.y = pShoulder.y + nEy * (eLen * 0.5);
            pArm.z = pShoulder.z + nEz * (eLen * 0.5);
            pArm.oldX = pArm.x;
            pArm.oldY = pArm.y;
            pArm.oldZ = pArm.z;
          }
        }
      };

      // Directional Parent-Dependent Extremity Constraint
      const enforceParentDependentRotation = (
        parentStartName: string,
        joint1Name: string,
        joint2Name: string,
        extremityEndName: string,
        maxAngleRad: number = 1.35
      ) => {
        const pA = getParticle(parentStartName);
        const pB = getParticle(joint1Name);
        const pC = getParticle(joint2Name);
        const pD = getParticle(extremityEndName);
        if (!pA || !pB || !pC || !pD || pA.dismembered || pB.dismembered || pC.dismembered || pD.dismembered) return;

        // Parent limb vector (A -> C) e.g., elbow -> wrist or knee -> ankle
        const pVx = pC.x - pA.x;
        const pVy = pC.y - pA.y;
        const pVz = pC.z - pA.z;
        const pLen = Math.sqrt(pVx * pVx + pVy * pVy + pVz * pVz);
        if (pLen < 0.001) return;
        const pNx = pVx / pLen, pNy = pVy / pLen, pNz = pVz / pLen;

        // Extremity vector (C -> D) e.g., wrist -> hand or ankle -> heel/foot
        const eVx = pD.x - pC.x;
        const eVy = pD.y - pC.y;
        const eVz = pD.z - pC.z;
        const eLen = Math.sqrt(eVx * eVx + eVy * eVy + eVz * eVz);
        if (eLen < 0.001) return;
        const eNx = eVx / eLen, eNy = eVy / eLen, eNz = eVz / eLen;

        const dot = THREE.MathUtils.clamp(pNx * eNx + pNy * eNy + pNz * eNz, -1, 1);
        const angleBetween = Math.acos(dot);

        if (angleBetween > maxAngleRad) {
          const correctionAlpha = (angleBetween - maxAngleRad) / (angleBetween || 0.001);
          const targetNx = eNx + (pNx - eNx) * correctionAlpha;
          const targetNy = eNy + (pNy - eNy) * correctionAlpha;
          const targetNz = eNz + (pNz - eNz) * correctionAlpha;
          const tLen = Math.sqrt(targetNx * targetNx + targetNy * targetNy + targetNz * targetNz) || 1.0;

          const targetX = pC.x + (targetNx / tLen) * eLen;
          const targetY = pC.y + (targetNy / tLen) * eLen;
          const targetZ = pC.z + (targetNz / tLen) * eLen;

          const k = ragdoll.isWalkingRagdoll ? 0.45 : 0.30;
          const shiftX = (targetX - pD.x) * k;
          const shiftY = (targetY - pD.y) * k;
          const shiftZ = (targetZ - pD.z) * k;
          pD.x += shiftX;
          pD.y += shiftY;
          pD.z += shiftZ;
          pD.oldX += shiftX;
          pD.oldY += shiftY;
          pD.oldZ += shiftZ;

          // Re-project pD to maintain exact constant bone length eLen from pC
          const curVx = pD.x - pC.x;
          const curVy = pD.y - pC.y;
          const curVz = pD.z - pC.z;
          const curLen = Math.sqrt(curVx * curVx + curVy * curVy + curVz * curVz) || eLen;
          const repX = pC.x + (curVx / curLen) * eLen;
          const repY = pC.y + (curVy / curLen) * eLen;
          const repZ = pC.z + (curVz / curLen) * eLen;
          pD.oldX += (repX - pD.x);
          pD.oldY += (repY - pD.y);
          pD.oldZ += (repZ - pD.z);
          pD.x = repX;
          pD.y = repY;
          pD.z = repZ;
        }
      };

      if (ragdoll.isTentacle) {
        const tentacleCount = ragdoll.particles.some((p) => p.name.startsWith('t4_')) ? 4 : 3;
        for (let t = 1; t <= tentacleCount; t++) {
          enforceHingeRange(`t${t}_seg1`, `t${t}_seg2`, `t${t}_seg3`, 48, 0.5);
          enforceHingeRange(`t${t}_seg2`, `t${t}_seg3`, `t${t}_seg4`, 48, 0.5);
          enforceHingeRange(`t${t}_seg3`, `t${t}_seg4`, `t${t}_seg5`, 48, 0.5);
        }
      } else {
        // 1. Whole Body Coordinated Rotation (locks whole body to common yaw, prevents independent sideways twisting)
        enforceWholeBodyCoordinatedRotation();

        // 2. Organic Spine & Torso Frame (with Tendon Spring recoil)
        enforceJointAxisLimits('pelvis', 'ombligo_bajo', 'ombligo', 25, 0.45);
        enforceJointAxisLimits('ombligo_bajo', 'ombligo', 'torso', 25, 0.45);
        enforceJointAxisLimits('ombligo', 'torso', 'pecho_bajo', 25, 0.45);
        enforceJointAxisLimits('torso', 'pecho_bajo', 'pechobase', 25, 0.45);
        enforceJointAxisLimits('pecho_bajo', 'pechobase', 'cuello', 25, 0.45);
        enforceHingeRange('pelvis', 'ombligo_bajo', 'ombligo', 35, 0.55, 0.65);
        enforceHingeRange('ombligo_bajo', 'ombligo', 'torso', 35, 0.55, 0.65);
        enforceHingeRange('ombligo', 'torso', 'pecho_bajo', 35, 0.55, 0.65);
        enforceHingeRange('torso', 'pecho_bajo', 'pechobase', 35, 0.55, 0.65);
        enforceHingeRange('pecho_bajo', 'pechobase', 'cuello', 40, 0.55, 0.65);
        enforceHingeRange('ombligo_bajo', 'pelvis', 'muslo_izq', 90, 0.60, 0.70);
        enforceHingeRange('ombligo_bajo', 'pelvis', 'muslo_der', 90, 0.60, 0.70);
        enforceHingeRange('pechobase', 'hombro_izq', 'brazo_izq', 90, 0.60, 0.70);
        enforceHingeRange('pechobase', 'hombro_der', 'brazo_der', 90, 0.60, 0.70);

        // 3. Neck & Head Flexion
        enforceJointAxisLimits('pechobase', 'cuello', 'cabeza', 25, 0.45);
        enforceNeckFlexion('pechobase', 'cuello', 'cabeza');

        // 4. Straight Limb Anti-Collapse Stiffness (segments within each bone stay 100% straight and rigid)
        // Upper arms (húmero): hombro -> brazo -> codo is one rigid straight bone
        enforceStraightLimbStiffness('hombro_izq', 'brazo_izq', 'codo_izq', 0.99, 0.95);
        enforceStraightLimbStiffness('hombro_der', 'brazo_der', 'codo_der', 0.99, 0.95);

        // Forearms (cúbito/radio): codo -> antebrazo -> muneca is one rigid straight bone
        enforceStraightLimbStiffness('codo_izq', 'antebrazo_izq', 'muneca_izq', 0.99, 0.95);
        enforceStraightLimbStiffness('codo_der', 'antebrazo_der', 'muneca_der', 0.99, 0.95);

        // Forearm to hand alignment (antebrazo -> wrist -> hand)
        enforceStraightLimbStiffness('antebrazo_izq', 'muneca_izq', 'mano_izq', 0.99, 0.95);
        enforceStraightLimbStiffness('antebrazo_der', 'muneca_der', 'mano_der', 0.99, 0.95);

        // Whole arm straightness across shoulder, arm, elbow, forearm, wrist, and hand
        if (ragdoll.isWalkingRagdoll || (ragdoll.isAlive && !ragdoll.hasWeapon && !ragdoll.isAiming)) {
          // Upper arm bone: shoulder -> arm -> elbow
          enforceStraightLimbStiffness('hombro_izq', 'brazo_izq', 'codo_izq', 0.99, 0.95);
          enforceStraightLimbStiffness('hombro_der', 'brazo_der', 'codo_der', 0.99, 0.95);
          // Forearm bone: elbow -> forearm -> hand
          enforceStraightLimbStiffness('codo_izq', 'antebrazo_izq', 'mano_izq', 0.99, 0.95);
          enforceStraightLimbStiffness('codo_der', 'antebrazo_der', 'mano_der', 0.99, 0.95);
        }

        // Leg alignment during ragdoll walk: hips and knees stay flush and never protrude out of the limbs
        if (ragdoll.isWalkingRagdoll) {
          enforceStraightLimbStiffness('pelvis', 'muslo_izq', 'rodilla_izq', 0.99, 0.95);
          enforceStraightLimbStiffness('pelvis', 'muslo_der', 'rodilla_der', 0.99, 0.95);
        }

        // Lower legs / Shins (tibia/peroné): rodilla -> antepierna -> tobillo is one rigid straight bone
        enforceStraightLimbStiffness('rodilla_izq', 'antepierna_izq', 'tobillo_izq', 0.99, 0.90);
        enforceStraightLimbStiffness('rodilla_der', 'antepierna_der', 'tobillo_der', 0.99, 0.90);

        // Foot base (heel to toe line): pie_talon -> pie_medio -> pie is one rigid flat foot plate
        enforceStraightLimbStiffness('pie_izq_talon', 'pie_izq_medio', 'pie_izq', 0.99, 0.90);
        enforceStraightLimbStiffness('pie_der_talon', 'pie_der_medio', 'pie_der', 0.99, 0.90);

        // 5. Knee, Calf / Antepierna, Ankle, Foot & Toes Flexion (Knee flexes backwards only, strictly blocked from forward hyperextension)
        enforceJointAxisLimits('rodilla_izq', 'antepierna_izq', 'tobillo_izq', 15, 0.65);
        enforceJointAxisLimits('rodilla_der', 'antepierna_der', 'tobillo_der', 15, 0.65);
        enforceJointAxisLimits('pie_izq_talon', 'pie_izq_medio', 'pie_izq', 10, 0.70);
        enforceJointAxisLimits('pie_der_talon', 'pie_der_medio', 'pie_der', 10, 0.70);
        
        // Ankle hinge flexion: allows natural foot bending relative to leg
        enforceHingeRange('antepierna_izq', 'tobillo_izq', 'pie_izq_talon', 60, 0.45, 0.70);
        enforceHingeRange('antepierna_der', 'tobillo_der', 'pie_der_talon', 60, 0.45, 0.70);
        
        // Toe straightness and axis limits (Left & Right foot toes)
        const toeList = [
          { footMedio: 'pie_izq_medio', footFront: 'pie_izq', toe: 'dedo_pie_pulgar_izq' },
          { footMedio: 'pie_izq_medio', footFront: 'pie_izq', toe: 'dedo_pie_indice_izq' },
          { footMedio: 'pie_izq_medio', footFront: 'pie_izq', toe: 'dedo_pie_medio_izq' },
          { footMedio: 'pie_izq_medio', footFront: 'pie_izq', toe: 'dedo_pie_anular_izq' },
          { footMedio: 'pie_izq_medio', footFront: 'pie_izq', toe: 'dedo_pie_menique_izq' },
          { footMedio: 'pie_der_medio', footFront: 'pie_der', toe: 'dedo_pie_pulgar_der' },
          { footMedio: 'pie_der_medio', footFront: 'pie_der', toe: 'dedo_pie_indice_der' },
          { footMedio: 'pie_der_medio', footFront: 'pie_der', toe: 'dedo_pie_medio_der' },
          { footMedio: 'pie_der_medio', footFront: 'pie_der', toe: 'dedo_pie_anular_der' },
          { footMedio: 'pie_der_medio', footFront: 'pie_der', toe: 'dedo_pie_menique_der' },
        ];
        for (const t of toeList) {
          enforceJointAxisLimits(t.footMedio, t.footFront, t.toe, 20, 0.50);
          enforceStraightLimbStiffness(t.footMedio, t.footFront, t.toe, 0.95, 0.75);
          enforceHingeRange(t.footMedio, t.footFront, t.toe, 45, 0.45, 0.65);
        }
        
        enforceKneeFlexion('muslo_izq', 'rodilla_izq', 'antepierna_izq', true);
        enforceKneeFlexion('muslo_der', 'rodilla_der', 'antepierna_der', false);

        // 6. Shoulders, Elbows & Wrists Flexion (Arm cannot rotate backwards or cross into opposite side)
        enforceShoulderAnatomicalLimits('hombro_izq', 'brazo_izq', 'codo_izq', true);
        enforceShoulderAnatomicalLimits('hombro_der', 'brazo_der', 'codo_der', false);

        enforceJointAxisLimits('hombro_izq', 'brazo_izq', 'codo_izq', 15, 0.65);
        enforceJointAxisLimits('hombro_der', 'brazo_der', 'codo_der', 15, 0.65);
        enforceJointAxisLimits('codo_izq', 'antebrazo_izq', 'muneca_izq', 15, 0.65);
        enforceJointAxisLimits('codo_der', 'antebrazo_der', 'muneca_der', 15, 0.65);
        enforceElbowFlexion('hombro_izq', 'codo_izq', 'antebrazo_izq', true);
        enforceElbowFlexion('hombro_der', 'codo_der', 'antebrazo_der', false);
        enforceWristFlexion('antebrazo_izq', 'muneca_izq', 'mano_izq');
        enforceWristFlexion('antebrazo_der', 'muneca_der', 'mano_der');

        // Genital M anatomical tendon recoil & hinge flexion limits
        enforceHingeRange('pelvis', 'male_shaft_0', 'male_shaft_1', 65, 0.50, 0.70);
        enforceHingeRange('male_shaft_0', 'male_shaft_1', 'male_glans', 45, 0.50, 0.70);
        enforceStraightLimbStiffness('pelvis', 'male_shaft_0', 'male_shaft_1', 0.85, 0.60);
        enforceStraightLimbStiffness('male_shaft_0', 'male_shaft_1', 'male_glans', 0.85, 0.60);

        // Enforce parent-dependent rotation on lower extremities
        // Forearms cannot rotate if upper arms have not rotated
        enforceParentDependentRotation('hombro_izq', 'codo_izq', 'antebrazo_izq', 'muneca_izq', 1.35);
        enforceParentDependentRotation('hombro_der', 'codo_der', 'antebrazo_der', 'muneca_der', 1.35);

        // Hands/wrists rotation cone strictly clamped relative to forearm (max ~45 deg / 0.78 rad)
        enforceParentDependentRotation('codo_izq', 'antebrazo_izq', 'muneca_izq', 'mano_izq', 0.78);
        enforceParentDependentRotation('codo_der', 'antebrazo_der', 'muneca_der', 'mano_der', 0.78);

        // Shins/calves natural rotation and full knee flexion relative to thighs (max 140 deg / 2.45 rad)
        enforceParentDependentRotation('muslo_izq', 'rodilla_izq', 'antepierna_izq', 'tobillo_izq', 2.45);
        enforceParentDependentRotation('muslo_der', 'rodilla_der', 'antepierna_der', 'tobillo_der', 2.45);

        // Feet/ankles strictly clamped relative to shin alignment (max 50 deg / 0.87 rad)
        enforceParentDependentRotation('rodilla_izq', 'antepierna_izq', 'tobillo_izq', 'pie_izq_talon', 0.87);
        enforceParentDependentRotation('rodilla_der', 'antepierna_der', 'tobillo_der', 'pie_der_talon', 0.87);
        enforceParentDependentRotation('rodilla_izq', 'antepierna_izq', 'tobillo_izq', 'pie_izq_medio', 0.87);
        enforceParentDependentRotation('rodilla_der', 'antepierna_der', 'tobillo_der', 'pie_der_medio', 0.87);

        // 7. 3-Segment Articulated Finger Flexion & Alignment (Seg2 is the primary flexor)
        const fingerPrefixes = [
          'dedo_pulgar_izq', 'dedo_indice_izq', 'dedo_medio_izq', 'dedo_anular_izq', 'dedo_menique_izq',
          'dedo_pulgar_der', 'dedo_indice_der', 'dedo_medio_der', 'dedo_anular_der', 'dedo_menique_der'
        ];
        for (const fp of fingerPrefixes) {
          const isLeft = fp.includes('_izq');
          const handName = isLeft ? 'mano_izq' : 'mano_der';
          const wristName = isLeft ? 'muneca_izq' : 'muneca_der';

          // Allow natural finger flexion in ragdoll mode while preserving basic bone stability
          const fingerStiffness = ragdoll.isWalkingRagdoll ? 0.90 : 0.45;
          enforceStraightLimbStiffness(handName, fp, `${fp}_seg2`, 0.85, fingerStiffness);
          enforceStraightLimbStiffness(fp, `${fp}_seg2`, `${fp}_seg3`, 0.85, fingerStiffness);
          enforceHingeRange(handName, fp, `${fp}_seg2`, 85, 0.60, 0.75);
          enforceHingeRange(fp, `${fp}_seg2`, `${fp}_seg3`, 85, 0.60, 0.75);
          enforceParentDependentRotation(wristName, handName, fp, `${fp}_seg2`, 0.65);
          enforceParentDependentRotation(handName, fp, `${fp}_seg2`, `${fp}_seg3`, 0.65);
        }

        // 7.2 Flexion of Fingers, Hand Extremities, Toes, and Foot Extremities in Normal & Walking Ragdoll Mode
        const enforceNormalRagdollExtremityFlexion = () => {
          if (ragdoll.isWalkingRagdoll && !isRagdollDragged) return;

          const sides = [
            { side: '_izq', isLeft: true },
            { side: '_der', isLeft: false },
          ];

          for (const s of sides) {
            // A. Hands & Fingers Flexion (flexión palmar y curvatura de dedos de las manos)
            const pFore = getParticle(`antebrazo${s.side}`);
            const pWrist = getParticle(`muneca${s.side}`);
            const pHand = getParticle(`mano${s.side}`);

            if (pWrist && pHand && !pWrist.dismembered && !pHand.dismembered) {
              let foreVx = 0, foreVy = -1, foreVz = 0;
              if (pFore && !pFore.dismembered) {
                foreVx = pWrist.x - pFore.x;
                foreVy = pWrist.y - pFore.y;
                foreVz = pWrist.z - pFore.z;
                const fLen = Math.sqrt(foreVx * foreVx + foreVy * foreVy + foreVz * foreVz) || 1.0;
                foreVx /= fLen; foreVy /= fLen; foreVz /= fLen;
              }

              const hVx = pHand.x - pWrist.x;
              const hVy = pHand.y - pWrist.y;
              const hVz = pHand.z - pWrist.z;
              const hLen = Math.sqrt(hVx * hVx + hVy * hVy + hVz * hVz) || 1.0;
              const hNx = hVx / hLen, hNy = hVy / hLen, hNz = hVz / hLen;

              // Palm inward normal vector
              let palmX = -hNy * foreVz + hNz * foreVy;
              let palmY = -hNz * foreVx + hNx * foreVz;
              let palmZ = -hNx * foreVy + hNy * foreVx;
              let pLen = Math.sqrt(palmX * palmX + palmY * palmY + palmZ * palmZ);
              if (pLen < 0.001) {
                palmX = 0; palmY = -0.5; palmZ = 0.5;
                pLen = Math.sqrt(0.5);
              }
              palmX /= pLen; palmY /= pLen; palmZ /= pLen;

              // Flex wrist & hand extremity inward towards palm
              const flexWrist = 0.012;
              pHand.x += palmX * flexWrist; pHand.y += palmY * flexWrist; pHand.z += palmZ * flexWrist;
              pHand.oldX += palmX * flexWrist; pHand.oldY += palmY * flexWrist; pHand.oldZ += palmZ * flexWrist;

              // Flex 3-segment fingers
              const fingers = [
                `dedo_pulgar${s.side}`, `dedo_indice${s.side}`,
                `dedo_medio${s.side}`, `dedo_anular${s.side}`, `dedo_menique${s.side}`
              ];

              for (const fName of fingers) {
                const pBase = getParticle(fName);
                const pSeg2 = getParticle(`${fName}_seg2`);
                const pSeg3 = getParticle(`${fName}_seg3`);

                if (pBase && !pBase.dismembered) {
                  const cBase = 0.010;
                  pBase.x += palmX * cBase; pBase.y += palmY * cBase; pBase.z += palmZ * cBase;
                  pBase.oldX += palmX * cBase; pBase.oldY += palmY * cBase; pBase.oldZ += palmZ * cBase;
                }
                if (pSeg2 && !pSeg2.dismembered) {
                  const cSeg2 = 0.016;
                  pSeg2.x += palmX * cSeg2; pSeg2.y += palmY * cSeg2; pSeg2.z += palmZ * cSeg2;
                  pSeg2.oldX += palmX * cSeg2; pSeg2.oldY += palmY * cSeg2; pSeg2.oldZ += palmZ * cSeg2;
                }
                if (pSeg3 && !pSeg3.dismembered) {
                  const cSeg3 = 0.020;
                  pSeg3.x += palmX * cSeg3; pSeg3.y += palmY * cSeg3; pSeg3.z += palmZ * cSeg3;
                  pSeg3.oldX += palmX * cSeg3; pSeg3.oldY += palmY * cSeg3; pSeg3.oldZ += palmZ * cSeg3;
                }
              }
            }

            // B. Feet & Toes Flexion (flexión plantar y curvatura de dedos de los pies)
            const pShin = getParticle(`antepierna${s.side}`);
            const pAnkle = getParticle(`tobillo${s.side}`);
            const pHeel = getParticle(`pie${s.side}_talon`);
            const pMedio = getParticle(`pie${s.side}_medio`);
            const pFront = getParticle(`pie${s.side}`);

            if (pAnkle && !pAnkle.dismembered) {
              let shinVx = 0, shinVy = -1, shinVz = 0;
              if (pShin && !pShin.dismembered) {
                shinVx = pAnkle.x - pShin.x;
                shinVy = pAnkle.y - pShin.y;
                shinVz = pAnkle.z - pShin.z;
                const sLen = Math.sqrt(shinVx * shinVx + shinVy * shinVy + shinVz * shinVz) || 1.0;
                shinVx /= sLen; shinVy /= sLen; shinVz /= sLen;
              }

              // Sole plantar normal direction
              const soleX = shinVx, soleY = shinVy, soleZ = shinVz;
              const flexFoot = 0.010;

              if (pHeel && !pHeel.dismembered) {
                pHeel.x += soleX * flexFoot; pHeel.y += soleY * flexFoot; pHeel.z += soleZ * flexFoot;
                pHeel.oldX += soleX * flexFoot; pHeel.oldY += soleY * flexFoot; pHeel.oldZ += soleZ * flexFoot;
              }
              if (pMedio && !pMedio.dismembered) {
                pMedio.x += soleX * flexFoot; pMedio.y += soleY * flexFoot; pMedio.z += soleZ * flexFoot;
                pMedio.oldX += soleX * flexFoot; pMedio.oldY += soleY * flexFoot; pMedio.oldZ += soleZ * flexFoot;
              }
              if (pFront && !pFront.dismembered) {
                pFront.x += soleX * flexFoot * 1.2; pFront.y += soleY * flexFoot * 1.2; pFront.z += soleZ * flexFoot * 1.2;
                pFront.oldX += soleX * flexFoot * 1.2; pFront.oldY += soleY * flexFoot * 1.2; pFront.oldZ += soleZ * flexFoot * 1.2;
              }

              // Flex toes downward / inward into plantar curl
              const toes = [
                `dedo_pie_pulgar${s.side}`, `dedo_pie_indice${s.side}`,
                `dedo_pie_medio${s.side}`, `dedo_pie_anular${s.side}`, `dedo_pie_menique${s.side}`
              ];

              for (const toeName of toes) {
                const pToe = getParticle(toeName);
                if (pToe && !pToe.dismembered) {
                  const cToe = 0.014;
                  pToe.x += soleX * cToe; pToe.y += soleY * cToe; pToe.z += soleZ * cToe;
                  pToe.oldX += soleX * cToe; pToe.oldY += soleY * cToe; pToe.oldZ += soleZ * cToe;
                }
              }
            }
          }
        };

        enforceNormalRagdollExtremityFlexion();

        // 7.1 Directional Upward Rotation Limits for Toes, Feet, Hands and Fingers
        // Strictly prevents toes, feet, fingers, and hands from bending backward / upward beyond natural limits
        const enforceUpwardRotationLimits = () => {
          // A. Toes & Feet Upward Rotation Limit
          const feetList = [
            { ankle: 'tobillo_izq', heel: 'pie_izq_talon', front: 'pie_izq', side: '_izq' },
            { ankle: 'tobillo_der', heel: 'pie_der_talon', front: 'pie_der', side: '_der' },
          ];

          for (const f of feetList) {
            const pAnkle = getParticle(f.ankle);
            const pHeel = getParticle(f.heel);
            const pFront = getParticle(f.front);
            if (!pAnkle || !pHeel || !pFront || pAnkle.dismembered || pHeel.dismembered || pFront.dismembered) continue;

            // Foot vector (Heel -> Front)
            const fVx = pFront.x - pHeel.x;
            const fVy = pFront.y - pHeel.y;
            const fVz = pFront.z - pHeel.z;
            const fLen = Math.sqrt(fVx * fVx + fVy * fVy + fVz * fVz) || 1.0;
            const fNx = fVx / fLen, fNy = fVy / fLen, fNz = fVz / fLen;

            // Ankle to heel vector
            const aVx = pHeel.x - pAnkle.x;
            const aVy = pHeel.y - pAnkle.y;
            const aVz = pHeel.z - pAnkle.z;

            let footUpX = -fNy * aVz + fNz * aVy;
            let footUpY = -fNz * aVx + fNx * aVz;
            let footUpZ = -fNx * aVy + fNy * aVx;
            let uLen = Math.sqrt(footUpX * footUpX + footUpY * footUpY + footUpZ * footUpZ);
            if (uLen < 0.001) {
              footUpX = 0; footUpY = 1; footUpZ = 0;
            } else {
              footUpX /= uLen; footUpY /= uLen; footUpZ /= uLen;
            }

            const toeNames = [
              `dedo_pie_pulgar${f.side}`, `dedo_pie_indice${f.side}`,
              `dedo_pie_medio${f.side}`, `dedo_pie_anular${f.side}`, `dedo_pie_menique${f.side}`
            ];

            for (const toeName of toeNames) {
              const pToe = getParticle(toeName);
              if (!pToe || pToe.dismembered) continue;

              const tVx = pToe.x - pFront.x;
              const tVy = pToe.y - pFront.y;
              const tVz = pToe.z - pFront.z;
              const tLen = Math.sqrt(tVx * tVx + tVy * tVy + tVz * tVz);
              if (tLen < 0.001) continue;

              const tNx = tVx / tLen, tNy = tVy / tLen, tNz = tVz / tLen;

              const dotUp = tNx * footUpX + tNy * footUpY + tNz * footUpZ;
              const maxUpwardDot = 0.00; // Strictly blocked upward hyperextension (limit de rotacion para arriba)
              if (dotUp > maxUpwardDot) {
                const excess = dotUp - maxUpwardDot;
                const corrX = -footUpX * excess * tLen * 0.85;
                const corrY = -footUpY * excess * tLen * 0.85;
                const corrZ = -footUpZ * excess * tLen * 0.85;

                pToe.x += corrX; pToe.y += corrY; pToe.z += corrZ;
                pToe.oldX += corrX; pToe.oldY += corrY; pToe.oldZ += corrZ;

                const cVx = pToe.x - pFront.x;
                const cVy = pToe.y - pFront.y;
                const cVz = pToe.z - pFront.z;
                const cLen = Math.sqrt(cVx * cVx + cVy * cVy + cVz * cVz) || tLen;
                const rX = pFront.x + (cVx / cLen) * tLen;
                const rY = pFront.y + (cVy / cLen) * tLen;
                const rZ = pFront.z + (cVz / cLen) * tLen;
                pToe.oldX += (rX - pToe.x); pToe.oldY += (rY - pToe.y); pToe.oldZ += (rZ - pToe.z);
                pToe.x = rX; pToe.y = rY; pToe.z = rZ;
              }
            }
          }

          // B. Hands & Fingers Upward Rotation Limit
          const handsList = [
            { wrist: 'muneca_izq', hand: 'mano_izq', side: '_izq' },
            { wrist: 'muneca_der', hand: 'mano_der', side: '_der' },
          ];

          for (const h of handsList) {
            const pWrist = getParticle(h.wrist);
            const pHand = getParticle(h.hand);
            if (!pWrist || !pHand || pWrist.dismembered || pHand.dismembered) continue;

            const hVx = pHand.x - pWrist.x;
            const hVy = pHand.y - pWrist.y;
            const hVz = pHand.z - pWrist.z;
            const hLen = Math.sqrt(hVx * hVx + hVy * hVy + hVz * hVz) || 1.0;
            const hNx = hVx / hLen, hNy = hVy / hLen, hNz = hVz / hLen;

            const isLeft = h.side === '_izq';
            const foreName = isLeft ? 'antebrazo_izq' : 'antebrazo_der';
            const pFore = getParticle(foreName);
            let handBackX = 0, handBackY = 1, handBackZ = 0;
            if (pFore && !pFore.dismembered) {
              const fVx = pWrist.x - pFore.x;
              const fVy = pWrist.y - pFore.y;
              const fVz = pWrist.z - pFore.z;

              handBackX = fVy * hNz - fVz * hNy;
              handBackY = fVz * hNx - fVx * hNz;
              handBackZ = fVx * hNy - fVy * hNx;
              const hbLen = Math.sqrt(handBackX * handBackX + handBackY * handBackY + handBackZ * handBackZ);
              if (hbLen > 0.001) {
                handBackX /= hbLen; handBackY /= hbLen; handBackZ /= hbLen;
              } else {
                handBackX = 0; handBackY = 1; handBackZ = 0;
              }
            }

            const fingerBaseNames = [
              `dedo_pulgar${h.side}`, `dedo_indice${h.side}`,
              `dedo_medio${h.side}`, `dedo_anular${h.side}`, `dedo_menique${h.side}`
            ];

            for (const fBase of fingerBaseNames) {
              const pBase = getParticle(fBase);
              const pSeg2 = getParticle(`${fBase}_seg2`);
              const pSeg3 = getParticle(`${fBase}_seg3`);

              const chain = [
                { parent: pHand, child: pBase },
                { parent: pBase, child: pSeg2 },
                { parent: pSeg2, child: pSeg3 }
              ];

              for (const link of chain) {
                if (!link.parent || !link.child || link.parent.dismembered || link.child.dismembered) continue;

                const segVx = link.child.x - link.parent.x;
                const segVy = link.child.y - link.parent.y;
                const segVz = link.child.z - link.parent.z;
                const segLen = Math.sqrt(segVx * segVx + segVy * segVy + segVz * segVz);
                if (segLen < 0.001) continue;

                const sNx = segVx / segLen, sNy = segVy / segLen, sNz = segVz / segLen;

                const dotBack = sNx * handBackX + sNy * handBackY + sNz * handBackZ;
                const maxBackDot = 0.00; // Strictly blocked finger backward hyperextension
                if (dotBack > maxBackDot) {
                  const excess = dotBack - maxBackDot;
                  const corrX = -handBackX * excess * segLen * 0.85;
                  const corrY = -handBackY * excess * segLen * 0.85;
                  const corrZ = -handBackZ * excess * segLen * 0.85;

                  link.child.x += corrX; link.child.y += corrY; link.child.z += corrZ;
                  link.child.oldX += corrX; link.child.oldY += corrY; link.child.oldZ += corrZ;

                  const cVx = link.child.x - link.parent.x;
                  const cVy = link.child.y - link.parent.y;
                  const cVz = link.child.z - link.parent.z;
                  const cLen = Math.sqrt(cVx * cVx + cVy * cVy + cVz * cVz) || segLen;
                  const rX = link.parent.x + (cVx / cLen) * segLen;
                  const rY = link.parent.y + (cVy / cLen) * segLen;
                  const rZ = link.parent.z + (cVz / cLen) * segLen;
                  link.child.oldX += (rX - link.child.x);
                  link.child.oldY += (rY - link.child.y);
                  link.child.oldZ += (rZ - link.child.z);
                  link.child.x = rX; link.child.y = rY; link.child.z = rZ;
                }
              }
            }
          }
        };

        enforceUpwardRotationLimits();

        // 8. Lateral rotation limits (~88°, almost 90 degrees) to the sides of all extremities of the body
        // with tendon potential energy storing elastic restoring force as limbs bend/abduct towards 90°
        const pPelvis = getParticle('pelvis');
        const pTorso = getParticle('pechobase') || getParticle('torso');
        if (pPelvis && pTorso) {
          // Spine vector (Pelvis -> Torso)
          let spX = pTorso.x - pPelvis.x;
          let spY = pTorso.y - pPelvis.y;
          let spZ = pTorso.z - pPelvis.z;
          const spLen = Math.sqrt(spX * spX + spY * spY + spZ * spZ) || 1.0;
          spX /= spLen; spY /= spLen; spZ /= spLen;

          // Lateral chest/pelvis direction (Left -> Right)
          const pHipL = getParticle('muslo_izq');
          const pHipR = getParticle('muslo_der');
          const pShL = getParticle('hombro_izq');
          const pShR = getParticle('hombro_der');
          let latX = 1, latY = 0, latZ = 0;
          if (pShL && pShR && !pShL.dismembered && !pShR.dismembered) {
            latX = pShR.x - pShL.x;
            latY = pShR.y - pShL.y;
            latZ = pShR.z - pShL.z;
          } else if (pHipL && pHipR && !pHipL.dismembered && !pHipR.dismembered) {
            latX = pHipR.x - pHipL.x;
            latY = pHipR.y - pHipL.y;
            latZ = pHipR.z - pHipL.z;
          }
          const dotLatSp = latX * spX + latY * spY + latZ * spZ;
          latX -= spX * dotLatSp;
          latY -= spY * dotLatSp;
          latZ -= spZ * dotLatSp;
          const latLen = Math.sqrt(latX * latX + latY * latY + latZ * latZ) || 1.0;
          latX /= latLen; latY /= latLen; latZ /= latLen;

          // Forward normal
          let antX = latY * spZ - latZ * spY;
          let antY = latZ * spX - latX * spZ;
          let antZ = latX * spY - latY * spX;
          const antLen = Math.sqrt(antX * antX + antY * antY + antZ * antZ) || 1.0;
          antX /= antLen; antY /= antLen; antZ /= antLen;

          // A. Thighs lateral abduction (Apertura lateral de piernas: max ~88° to the sides)
          const checkThighLateral = (hipName: string, kneeName: string, isLeft: boolean) => {
            const pHip = getParticle(hipName);
            const pKnee = getParticle(kneeName);
            if (!pHip || !pKnee || pHip.dismembered || pKnee.dismembered) return;

            const vx = pKnee.x - pHip.x;
            const vy = pKnee.y - pHip.y;
            const vz = pKnee.z - pHip.z;
            const vLen = Math.sqrt(vx * vx + vy * vy + vz * vz);
            if (vLen < 0.001) return;

            const nVx = vx / vLen, nVy = vy / vLen, nVz = vz / vLen;
            const latDot = nVx * latX + nVy * latY + nVz * latZ;
            const outwardDot = isLeft ? -latDot : latDot;

            const maxOutward = 0.985; // ~88 degrees (almost 90 degrees to the side)
            const tendonThreshold = 0.82; // Elastic potential energy builds as limb approaches 90° limit

            if (outwardDot > tendonThreshold && !ragdoll.isWalkingRagdoll) {
              const relVx = (pKnee.x - pKnee.oldX) - (pHip.x - pHip.oldX);
              const relVy = (pKnee.y - pKnee.oldY) - (pHip.y - pHip.oldY);
              const relVz = (pKnee.z - pKnee.oldZ) - (pHip.z - pHip.oldZ);
              const extSpeed = Math.sqrt(relVx * relVx + relVy * relVy + relVz * relVz);

              const excess = (outwardDot - tendonThreshold) / (maxOutward - tendonThreshold || 0.001);
              const forceResistance = Math.max(0.12, 1.0 - Math.min(1.0, extSpeed * 12.0));
              const springK = Math.pow(Math.min(1.8, Math.max(0, excess)), 1.6) * 0.35 * forceResistance;

              const sideSign = isLeft ? -1 : 1;
              const recoilX = -latX * sideSign * springK * vLen;
              const recoilY = -latY * sideSign * springK * vLen;
              const recoilZ = -latZ * sideSign * springK * vLen;

              pKnee.x += recoilX; pKnee.y += recoilY; pKnee.z += recoilZ;
              pKnee.oldX += recoilX; pKnee.oldY += recoilY; pKnee.oldZ += recoilZ;

              const nLen = Math.sqrt((pKnee.x - pHip.x)**2 + (pKnee.y - pHip.y)**2 + (pKnee.z - pHip.z)**2) || vLen;
              const repX = pHip.x + ((pKnee.x - pHip.x) / nLen) * vLen;
              const repY = pHip.y + ((pKnee.y - pHip.y) / nLen) * vLen;
              const repZ = pHip.z + ((pKnee.z - pHip.z) / nLen) * vLen;
              pKnee.oldX += (repX - pKnee.x); pKnee.oldY += (repY - pKnee.y); pKnee.oldZ += (repZ - pKnee.z);
              pKnee.x = repX; pKnee.y = repY; pKnee.z = repZ;
            }

            if (outwardDot > maxOutward) {
              const sideSign = isLeft ? -1 : 1;
              const excess = outwardDot - maxOutward;
              const shiftX = -latX * sideSign * excess * vLen * 0.65;
              const shiftY = -latY * sideSign * excess * vLen * 0.65;
              const shiftZ = -latZ * sideSign * excess * vLen * 0.65;
              pKnee.x += shiftX; pKnee.y += shiftY; pKnee.z += shiftZ;
              pKnee.oldX += shiftX; pKnee.oldY += shiftY; pKnee.oldZ += shiftZ;

              const nLen = Math.sqrt((pKnee.x - pHip.x)**2 + (pKnee.y - pHip.y)**2 + (pKnee.z - pHip.z)**2) || vLen;
              const repX = pHip.x + ((pKnee.x - pHip.x) / nLen) * vLen;
              const repY = pHip.y + ((pKnee.y - pHip.y) / nLen) * vLen;
              const repZ = pHip.z + ((pKnee.z - pHip.z) / nLen) * vLen;
              pKnee.oldX += (repX - pKnee.x); pKnee.oldY += (repY - pKnee.y); pKnee.oldZ += (repZ - pKnee.z);
              pKnee.x = repX; pKnee.y = repY; pKnee.z = repZ;
            }
          };

          checkThighLateral('muslo_izq', 'rodilla_izq', true);
          checkThighLateral('muslo_der', 'rodilla_der', false);

          // B. Arms lateral abduction (Apertura lateral de brazos: max ~88° to the sides)
          const checkArmLateral = (shoulderName: string, elbowName: string, isLeft: boolean) => {
            const pShoulder = getParticle(shoulderName);
            const pElbow = getParticle(elbowName);
            if (!pShoulder || !pElbow || pShoulder.dismembered || pElbow.dismembered) return;

            const vx = pElbow.x - pShoulder.x;
            const vy = pElbow.y - pShoulder.y;
            const vz = pElbow.z - pShoulder.z;
            const vLen = Math.sqrt(vx * vx + vy * vy + vz * vz);
            if (vLen < 0.001) return;

            const nVx = vx / vLen, nVy = vy / vLen, nVz = vz / vLen;
            const latDot = nVx * latX + nVy * latY + nVz * latZ;
            const outwardDot = isLeft ? -latDot : latDot;

            const maxOutward = 0.985; // ~88 degrees (almost 90 degrees to the side)
            const tendonThreshold = 0.82; // Elastic potential energy builds as limb approaches 90° limit

            if (outwardDot > tendonThreshold) {
              const relVx = (pElbow.x - pElbow.oldX) - (pShoulder.x - pShoulder.oldX);
              const relVy = (pElbow.y - pElbow.oldY) - (pShoulder.y - pShoulder.oldY);
              const relVz = (pElbow.z - pElbow.oldZ) - (pShoulder.z - pShoulder.oldZ);
              const extSpeed = Math.sqrt(relVx * relVx + relVy * relVy + relVz * relVz);

              const excess = (outwardDot - tendonThreshold) / (maxOutward - tendonThreshold || 0.001);
              const forceResistance = Math.max(0.12, 1.0 - Math.min(1.0, extSpeed * 12.0));
              const springK = Math.pow(Math.min(1.8, Math.max(0, excess)), 1.6) * 0.35 * forceResistance;

              const sideSign = isLeft ? -1 : 1;
              const recoilX = -latX * sideSign * springK * vLen;
              const recoilY = -latY * sideSign * springK * vLen;
              const recoilZ = -latZ * sideSign * springK * vLen;

              pElbow.x += recoilX; pElbow.y += recoilY; pElbow.z += recoilZ;
              pElbow.oldX += recoilX; pElbow.oldY += recoilY; pElbow.oldZ += recoilZ;

              const nLen = Math.sqrt((pElbow.x - pShoulder.x)**2 + (pElbow.y - pShoulder.y)**2 + (pElbow.z - pShoulder.z)**2) || vLen;
              const repX = pShoulder.x + ((pElbow.x - pShoulder.x) / nLen) * vLen;
              const repY = pShoulder.y + ((pElbow.y - pShoulder.y) / nLen) * vLen;
              const repZ = pShoulder.z + ((pElbow.z - pShoulder.z) / nLen) * vLen;
              pElbow.oldX += (repX - pElbow.x); pElbow.oldY += (repY - pElbow.y); pElbow.oldZ += (repZ - pElbow.z);
              pElbow.x = repX; pElbow.y = repY; pElbow.z = repZ;
            }

            if (outwardDot > maxOutward) {
              const sideSign = isLeft ? -1 : 1;
              const excess = outwardDot - maxOutward;
              const shiftX = -latX * sideSign * excess * vLen * 0.65;
              const shiftY = -latY * sideSign * excess * vLen * 0.65;
              const shiftZ = -latZ * sideSign * excess * vLen * 0.65;
              pElbow.x += shiftX; pElbow.y += shiftY; pElbow.z += shiftZ;
              pElbow.oldX += shiftX; pElbow.oldY += shiftY; pElbow.oldZ += shiftZ;

              const nLen = Math.sqrt((pElbow.x - pShoulder.x)**2 + (pElbow.y - pShoulder.y)**2 + (pElbow.z - pShoulder.z)**2) || vLen;
              const repX = pShoulder.x + ((pElbow.x - pShoulder.x) / nLen) * vLen;
              const repY = pShoulder.y + ((pElbow.y - pShoulder.y) / nLen) * vLen;
              const repZ = pShoulder.z + ((pElbow.z - pShoulder.z) / nLen) * vLen;
              pElbow.oldX += (repX - pElbow.x); pElbow.oldY += (repY - pElbow.y); pElbow.oldZ += (repZ - pElbow.z);
              pElbow.x = repX; pElbow.y = repY; pElbow.z = repZ;
            }
          };

          checkArmLateral('hombro_izq', 'codo_izq', true);
          checkArmLateral('hombro_der', 'codo_der', false);

          // C. Head & Neck Lateral Tilt (limited to ~50 degrees sideways with tendon spring)
          const pHead = getParticle('cabeza');
          const pNeck = getParticle('cuello');
          if (pHead && pNeck && !pHead.dismembered && !pNeck.dismembered) {
            const vx = pHead.x - pNeck.x;
            const vy = pHead.y - pNeck.y;
            const vz = pHead.z - pNeck.z;
            const vLen = Math.sqrt(vx * vx + vy * vy + vz * vz);
            if (vLen > 0.001) {
              const nVx = vx / vLen, nVy = vy / vLen, nVz = vz / vLen;
              const latDot = Math.abs(nVx * latX + nVy * latY + nVz * latZ);
              if (latDot > 0.65) {
                const excess = (latDot - 0.65) * 0.50;
                const sign = (nVx * latX + nVy * latY + nVz * latZ) > 0 ? 1 : -1;
                const shiftX = -latX * sign * excess * vLen;
                const shiftY = -latY * sign * excess * vLen;
                const shiftZ = -latZ * sign * excess * vLen;
                pHead.x += shiftX; pHead.y += shiftY; pHead.z += shiftZ;
                pHead.oldX += shiftX; pHead.oldY += shiftY; pHead.oldZ += shiftZ;

                const nLen = Math.sqrt((pHead.x - pNeck.x)**2 + (pHead.y - pNeck.y)**2 + (pHead.z - pNeck.z)**2) || vLen;
                const repX = pNeck.x + ((pHead.x - pNeck.x) / nLen) * vLen;
                const repY = pNeck.y + ((pHead.y - pNeck.y) / nLen) * vLen;
                const repZ = pNeck.z + ((pHead.z - pNeck.z) / nLen) * vLen;
                pHead.oldX += (repX - pHead.x); pHead.oldY += (repY - pHead.y); pHead.oldZ += (repZ - pHead.z);
                pHead.x = repX; pHead.y = repY; pHead.z = repZ;
              }
            }
          }
        }
      }
    }
  }

  private handleFloorCollisions(dt: number = 0.012) {
    const cannonEngine = CannonRagdollEngine.getInstance();
    for (const ragdoll of this.ragdolls) {
      if (cannonEngine.cannonRagdolls.has(ragdoll.id)) continue;
      const isRagdollDragged = ragdoll.particles.some((p) => !!p.dragTargetPos);
      if (ragdoll.isAlive || (ragdoll.isWalkingRagdoll && !isRagdollDragged)) continue;

      for (const p of ragdoll.particles) {
        if (p.pinned) continue;

        // Pre-check if particle is already adhered to a slime block
        let adheredBlock: any = null;
        if (p.adheredSlimeBlockId) {
          adheredBlock = this.voxelBlocks.find(vb => vb.id === p.adheredSlimeBlockId);
          if (adheredBlock && adheredBlock.type === 'slime') {
            const blockCenter = new THREE.Vector3(adheredBlock.x, adheredBlock.y, adheredBlock.z);
            const distPart = p.radius + blockCenter.distanceTo(new THREE.Vector3(p.x, p.y, p.z)); // rough distance
            const escapeLimitPart = 5.8;
            
            // Calculate particle speed and momentum to check if velocity and mass are sufficient
            const pSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz);
            const pMomentum = pSpeed * p.mass;
            
            // Only when stretching far and sprinting fast can the particle snap the adhered slime!
            const isPlayerPart = ragdoll.isControlled;
            const escapeByForcePart = distPart > escapeLimitPart || (isPlayerPart
              ? (this.isSprinting && pSpeed > 2.4 && distPart > 4.5)
              : (pMomentum > 60.0 && distPart > 4.5));

            if (escapeByForcePart) {
              // SNAP / ESCAPE CONDITION
              soundEngine.playWormSlime();
              soundEngine.playImpact(0.85);
              this.spawnJellyDebris(p.x, p.y, p.z, 'slime', adheredBlock.color, 14);

              // Recoil snap back
              if (adheredBlock.shearVel) {
                const stretchVecPart = new THREE.Vector3(p.x - adheredBlock.x, p.y - adheredBlock.y, p.z - adheredBlock.z);
                adheredBlock.shearVel.copy(stretchVecPart.clone().multiplyScalar(-16.0));
              }
              if (adheredBlock.wobbleVel) {
                adheredBlock.wobbleVel.set((Math.random() - 0.5) * 10, -10, (Math.random() - 0.5) * 10);
              }
              if (adheredBlock.wobbleScale) {
                adheredBlock.wobbleScale.set(1.3, 0.6, 1.3);
              }
              
              // Connection completely broken! The block acts as a passive draggable prop instead of jumping.
              adheredBlock.isPursuing = false;
              adheredBlock.attachedTargetPos = undefined;

              p.adheredSlimeBlockId = undefined;
              adheredBlock = null;
            }
          } else {
            p.adheredSlimeBlockId = undefined;
          }
        }

        const halfH = p.boxDims ? (p.boxDims[1] / 2) * ragdoll.scale : p.radius;
        const pRad = halfH;
        const groundH = this.getGroundHeight(p.x, p.z, p.y);
        let groundLevel = groundH > -9000 ? groundH + halfH : -Infinity;

        // 1. Collision with house blocks (walls, floors, roofs) in full 3D
        for (const block of this.houseBlocks) {
          const hw = block.width / 2;
          const hh = block.height / 2;
          const hd = block.depth / 2;

          const dx = p.x - block.x;
          const dy = p.y - block.y;
          const dz = p.z - block.z;

          const overlapX = (hw + pRad) - Math.abs(dx);
          const overlapY = (hh + pRad) - Math.abs(dy);
          const overlapZ = (hd + pRad) - Math.abs(dz);

          if (overlapX > 0 && overlapY > 0 && overlapZ > 0) {
            // Push out along minimum overlap axis
            if (overlapY <= overlapX && overlapY <= overlapZ) {
              p.y += Math.sign(dy) * overlapY;
              p.oldY = p.y;
            } else if (overlapX <= overlapZ) {
              p.x += Math.sign(dx) * overlapX;
              p.oldX = p.x;
            } else {
              p.z += Math.sign(dz) * overlapZ;
              p.oldZ = p.z;
            }
          }
        }

        // 2. Collision with closed doors in 3D
        for (const d of this.doors) {
          if (Math.abs(d.currentAngle) < 0.15) {
            const hw = d.width / 2;
            const hh = d.height / 2;
            const hd = d.depth / 2;
            const dy = p.y - (d.y + hh);
            const dx = p.x - d.x;
            const dz = p.z - d.z;

            const overlapX = (hw + pRad) - Math.abs(dx);
            const overlapY = (hh + pRad) - Math.abs(dy);
            const overlapZ = (hd + pRad) - Math.abs(dz);

            if (overlapX > 0 && overlapY > 0 && overlapZ > 0) {
              if (overlapY <= overlapX && overlapY <= overlapZ) {
                p.y += Math.sign(dy) * overlapY;
                p.oldY = p.y;
              } else if (overlapX <= overlapZ) {
                p.x += Math.sign(dx) * overlapX;
                p.oldX = p.x;
              } else {
                p.z += Math.sign(dz) * overlapZ;
                p.oldZ = p.z;
              }
            }
          }
        }

        // 3. Collision with spawned voxel blocks in ragdoll mode (3D box) & Slime Impact Transmission
        for (const vb of this.voxelBlocks) {
          const halfS = vb.size / 2;
          const dx = p.x - vb.x;
          const dy = p.y - vb.y;
          const dz = p.z - vb.z;

          const overlapX = (halfS + pRad) - Math.abs(dx);
          const overlapY = (halfS + pRad) - Math.abs(dy);
          const overlapZ = (halfS + pRad) - Math.abs(dz);

          const isAdheredToThis = (p.adheredSlimeBlockId === vb.id);

          if ((overlapX > 0 && overlapY > 0 && overlapZ > 0) || isAdheredToThis) {
            if (vb.isJelly) {
              // Transmit impact force from hitting/falling object to slime block physics
              const impactVx = (p.x - p.oldX) * 60;
              const impactVy = (p.y - p.oldY) * 60;
              const impactVz = (p.z - p.oldZ) * 60;
              const impactSpd = Math.sqrt(impactVx * impactVx + impactVy * impactVy + impactVz * impactVz);

              if (vb.wobbleVel) {
                vb.wobbleVel.y -= Math.min(8.0, Math.max(1.0, Math.abs(impactVy) * 0.45));
                vb.wobbleVel.x += impactVx * 0.12 + (Math.random() - 0.5) * 0.5;
                vb.wobbleVel.z += impactVz * 0.12 + (Math.random() - 0.5) * 0.5;
              }
              if (vb.shearVel) {
                vb.shearVel.x += impactVx * 0.1;
                vb.shearVel.z += impactVz * 0.1;
              }
              if (impactSpd > 1.5) {
                soundEngine.playImpact(Math.min(0.6, impactSpd * 0.08));
              }

              // Calculate dynamic impact intensity based on rapidity (speed) and mass
              const momentum = impactSpd * p.mass;
              const intensity = Math.min(3.0, Math.max(0.1, momentum / 20));
              const moveDir = new THREE.Vector3(impactVx, impactVy, impactVz).normalize();
              if (moveDir.lengthSq() < 0.01) moveDir.set(0, -1, 0);

              // Apply deformation gash on both slime and skin blocks upon impact
              if (impactSpd > 1.2) {
                this.deformJellyBlockWound(vb, new THREE.Vector3(p.x, p.y, p.z), moveDir, intensity);
              }

              if (vb.type === 'slime') {
                const isHardImpact = (impactVy < -0.8 || Math.hypot(impactVx, impactVz) > 1.0 || impactSpd > 1.1);
                const isInsideVolume = Math.abs(dx) < halfS && Math.abs(dy) < halfS && Math.abs(dz) < halfS;

                // If not hard impact and not inside and resting on top surface:
                // Solid slime support! The limb can rest on top of the solid slime block and squish it!
                if (!isAdheredToThis && !isInsideVolume && !isHardImpact && dy > halfS - 0.25) {
                  if (vb.wobbleVel) {
                    vb.wobbleVel.y += -12.0 * dt;
                    vb.wobbleVel.x += 6.0 * dt;
                    vb.wobbleVel.z += 6.0 * dt;
                  }
                  const curH = vb.wobbleScale ? vb.wobbleScale.y : 1.0;
                  p.y = vb.y + (halfS * curH) + pRad;
                  p.oldY = p.y;
                  continue;
                }

                // If hitting hard or penetrating inside:
                // "si algo cae encima o de lado fuerte debe enterrarse y las paredes dejar que pase hacia adentro"
                // The walls allow the object to pass inside!
                
                // If it still has significant velocity:
                if (impactSpd > 0.45 && !isAdheredToThis) {
                  // Decelerate progressively inside the viscous medium ("vayan frenando")
                  const brakeDrag = Math.max(0.45, 1.0 - 16.0 * dt);
                  p.oldX = p.x - (p.x - p.oldX) * brakeDrag;
                  p.oldY = p.y - (p.y - p.oldY) * brakeDrag;
                  p.oldZ = p.z - (p.z - p.oldZ) * brakeDrag;

                  if (vb.wobbleVel) {
                    vb.wobbleVel.y += -1.5;
                    vb.wobbleVel.x += (Math.random() - 0.5) * 1.5;
                    vb.wobbleVel.z += (Math.random() - 0.5) * 1.5;
                  }
                  if (Math.random() < 0.2) this.spawnJellyDebris(p.x, p.y, p.z, 'slime', vb.color, 1);
                } else {
                  // As the object brakes to a stop inside ("donde las paredes al frenarse objeto apriete y no deje escapar tan facilmente")
                  // Squeeze and clamp down on the object!
                  p.adheredSlimeBlockId = vb.id;
                  
                  // Clamp velocity
                  p.oldX = p.x - (p.x - p.oldX) * 0.05;
                  p.oldY = p.y - (p.y - p.oldY) * 0.05;
                  p.oldZ = p.z - (p.z - p.oldZ) * 0.05;

                  const dxPart = p.x - vb.x;
                  const dyPart = p.y - vb.y;
                  const dzPart = p.z - vb.z;
                  const distPart = Math.sqrt(dxPart * dxPart + dyPart * dyPart + dzPart * dzPart);

                  const stretchDirPart = new THREE.Vector3(dxPart, dyPart, dzPart).normalize();
                  const escapeLimitPart = 2.4;

                  // Apply pullback sticky tension force to the dynamic particle
                  const tensionPowerPart = 40.0;
                  const pullBackForcePart = stretchDirPart.clone().multiplyScalar(-tensionPowerPart * (distPart / escapeLimitPart) * dt);
                  
                  // Prevent floating: if particle is on the floor, do not let upward tension lift it!
                  if (p.y <= groundLevel + 0.05 && pullBackForcePart.y > 0) {
                    pullBackForcePart.y = 0;
                  }

                  p.x += pullBackForcePart.x;
                  p.y += pullBackForcePart.y;
                  p.z += pullBackForcePart.z;

                  // Mark block as actively stretched by this particle
                  vb.attachedTargetPos = new THREE.Vector3(p.x, p.y, p.z);

                  // Slime walls squeeze inward!
                  if (vb.wobbleScale) {
                    vb.wobbleScale.set(0.82, 0.82, 0.82);
                  }
                  if (vb.wobbleVel) {
                    vb.wobbleVel.y += -3.5;
                    vb.wobbleVel.x += -1.5;
                    vb.wobbleVel.z += -1.5;
                  }

                  if (Math.random() < 0.15) this.spawnJellyDebris(p.x, p.y, p.z, 'slime', vb.color, 1);
                  if (Math.random() < 0.08) soundEngine.playImpact(0.15);
                }

                // Skip rigid box push-out so it stays inside!
                continue;
              } else if (vb.type === 'skin') {
                // Skin block impact feedback (no penetration)
                if (impactSpd > 1.2) {
                  this.spawnJellyDebris(p.x, p.y, p.z, 'skin', vb.color, Math.ceil(2 * intensity));
                  // Splash blood droplets!
                  for (let d = 0; d < Math.ceil(4 * intensity); d++) {
                    const vx = (Math.random() - 0.5) * 4.5 * intensity;
                    const vy = 1.0 + Math.random() * 3.0 * intensity;
                    const vz = (Math.random() - 0.5) * 4.5 * intensity;
                    this.spawnCubicBloodDroplet(p.x, p.y, p.z, vx, vy, vz);
                  }
                }
              }
            }

            if (overlapY <= overlapX && overlapY <= overlapZ) {
              p.y += Math.sign(dy) * overlapY;
              p.oldY = p.y;
            } else if (overlapX <= overlapZ) {
              p.x += Math.sign(dx) * overlapX;
              p.oldX = p.x;
            } else {
              p.z += Math.sign(dz) * overlapZ;
              p.oldZ = p.z;
            }
          }
        }

        // 4. Collision with beds in ragdoll mode (ragdolls fall and rest flat on bed mattress)
        for (const bed of this.beds) {
          const halfW = bed.width / 2;
          const halfD = bed.depth / 2;
          const dx = Math.abs(p.x - bed.x);
          const dz = Math.abs(p.z - bed.z);
          if (dx < halfW + halfH && dz < halfD + halfH) {
            const topY = bed.y + 0.50 + halfH; // mattress height
            if (p.y <= topY && topY > groundLevel) {
              groundLevel = topY;
            }
          }
        }

        // 5. Floor collision
        if (groundLevel > -9000 && p.y < groundLevel) {
          p.y = groundLevel;
          let vx = p.x - p.oldX;
          let vy = p.y - p.oldY;
          let vz = p.z - p.oldZ;

          const impactSpeed = Math.sqrt(vx * vx + vy * vy + vz * vz) * 60;
          if (impactSpeed > 7.5) {
            soundEngine.playImpact(Math.min(1.0, impactSpeed / 22));
            if (impactSpeed > 17.5 && !p.fractured) {
              p.fractured = true;
              ragdoll.stats.brokenBones++;
              soundEngine.playBoneSnap();
            }
          }

          // Natural inelastic rebound & ground friction
          if (vy < 0) {
            vy = -vy * 0.16; // Soft flesh/bone rebound
          }
          const friction = 0.74; // Realistic sliding friction on ground
          vx *= friction;
          vz *= friction;
          if (Math.abs(vx) < 0.005) vx = 0;
          if (Math.abs(vz) < 0.005) vz = 0;

          p.oldX = p.x - vx;
          p.oldY = p.y - vy;
          p.oldZ = p.z - vz;
        }
      }
    }
  }

  public spawnCubicBloodDroplet(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number
  ) {
    if (this.bloodParticles.length > 250) {
      const oldest = this.bloodParticles.shift();
      if (oldest && oldest.mesh) {
        this.scene.remove(oldest.mesh);
      }
    }

    const bloodColors = [0x880000, 0x990008, 0x7a0505, 0xaa1111, 0x580202];
    const colorHex = bloodColors[Math.floor(Math.random() * bloodColors.length)];

    const size = 0.048 + Math.random() * 0.024; // Solid 3D blood cube

    let mat = this.bloodMaterials.get(colorHex);
    if (!mat) {
      mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.18,
        metalness: 0.12,
        emissive: colorHex,
        emissiveIntensity: 0.15,
      });
      this.bloodMaterials.set(colorHex, mat);
    }

    const mesh = new THREE.Mesh(this.sharedBoxGeom, mat);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.position.set(x, y, z);
    mesh.scale.set(size, size, size);
    this.scene.add(mesh);

    const initLife = 4.5 + Math.random() * 2.5; // Controlled lifetime of 4.5 to 7.0 seconds

    this.bloodParticles.push({
      x,
      y,
      z,
      vx,
      vy,
      vz,
      radius: size * 0.5,
      size,
      life: initLife,
      maxLife: initLife,
      decay: 0,
      color: '#' + colorHex.toString(16),
      mesh,
      isCubic: true,
      isGrounded: false,
    });
  }

  public spawnBloodTrail3D(x: number, y: number, z: number, streamDir: THREE.Vector3, count: number = 4) {
    const normDir = streamDir.lengthSq() > 0.001 ? streamDir.clone().normalize() : new THREE.Vector3(0, 0.4, 1);
    const actualCount = Math.max(1, Math.min(count, 8)); // Support up to 8 blood cubes per trail/splatter for a beautiful rich trail effect!

    for (let i = 0; i < actualCount; i++) {
      const speed = 0.08 + Math.random() * 0.06; // Slow gentle dripping velocity
      const spread = 0.01;
      const vx = normDir.x * speed + (Math.random() - 0.5) * spread;
      const vy = normDir.y * speed * 0.3 + 0.01 + Math.random() * 0.02;
      const vz = normDir.z * speed + (Math.random() - 0.5) * spread;

      this.spawnCubicBloodDroplet(x, y, z, vx, vy, vz);
    }
  }

  public spawnBloodChorro3D(x: number, y: number, z: number, streamDir: THREE.Vector3, count: number = 4) {
    this.spawnBloodTrail3D(x, y, z, streamDir, count);
  }

  public spawnBloodBurst3D(x: number, y: number, z: number, count: number = 6) {
    this.spawnBloodTrail3D(x, y, z, new THREE.Vector3(0, 0.4, 0.1), count);
  }

  public spawnBloodStreamParticle(x: number, y: number, z: number, outDir: THREE.Vector3) {
    this.spawnBloodTrail3D(x, y, z, outDir, 3);
  }

  private updateBloodStreams(dt: number) {
    for (let i = this.woundBloodJets.length - 1; i >= 0; i--) {
      const jet = this.woundBloodJets[i];
      jet.timeLeft -= dt;

      if (jet.timeLeft <= 0) {
        this.woundBloodJets.splice(i, 1);
        continue;
      }

      const ragdoll = this.ragdolls.find((r) => r.id === jet.ragdollId);
      if (!ragdoll) {
        this.woundBloodJets.splice(i, 1);
        continue;
      }

      const p = ragdoll.particles.find((pt) => pt.name === jet.particleName);
      if (!p) continue;

      let worldWoundPos = new THREE.Vector3();
      let worldJetDir = new THREE.Vector3();

      if (jet.targetMesh) {
        jet.targetMesh.updateMatrixWorld(true);
        worldWoundPos = jet.targetMesh.localToWorld(jet.localPos.clone());
        worldJetDir = jet.localDir.clone().applyQuaternion(jet.targetMesh.quaternion).normalize();
      } else if (p.mesh) {
        p.mesh.updateMatrixWorld(true);
        worldWoundPos = p.mesh.localToWorld(jet.localPos.clone());
        worldJetDir = jet.localDir.clone().applyQuaternion(p.mesh.quaternion).normalize();
      } else {
        worldWoundPos.set(p.x, p.y, p.z).add(jet.localPos);
        worldJetDir.copy(jet.localDir).normalize();
      }

      jet.accumulator += dt;
      const emitInterval = 0.95; // Slow, spaced out dripping frequency

      while (jet.accumulator >= emitInterval) {
        jet.accumulator -= emitInterval;

        const streamSpeed = 0.08 + Math.random() * 0.05; // Slow gentle drip velocity
        const spread = 0.01;
        const vx = worldJetDir.x * streamSpeed + (Math.random() - 0.5) * spread + p.vx * 0.02;
        const vy = -0.04 - Math.random() * 0.03; // Falls directly down by gravity
        const vz = worldJetDir.z * streamSpeed + (Math.random() - 0.5) * spread + p.vz * 0.02;

        this.spawnCubicBloodDroplet(worldWoundPos.x, worldWoundPos.y, worldWoundPos.z, vx, vy, vz);
      }
    }
  }

  private updateBlood(dt: number) {
    const gy = this.map.gravity.y;

    for (let i = this.bloodParticles.length - 1; i >= 0; i--) {
      const bp = this.bloodParticles[i];
      
      // Decrease remaining life
      bp.life -= dt;
      if (bp.life <= 0) {
        if (bp.mesh) {
          this.scene.remove(bp.mesh);
        }
        this.bloodParticles.splice(i, 1);
        continue;
      }

      const size = bp.size || 0.05;
      const halfSize = size * 0.5;

      if (!bp.isGrounded) {
        bp.vy += gy * dt * 0.75;
        bp.x += bp.vx * dt;
        bp.y += bp.vy * dt;
        bp.z += bp.vz * dt;

        let groundY = this.getGroundHeight(bp.x, bp.z, bp.y);

        // Check voxel blocks and beds for top surface collision
        for (const vb of this.voxelBlocks) {
          const halfS = vb.size / 2;
          if (Math.abs(bp.x - vb.x) < halfS && Math.abs(bp.z - vb.z) < halfS) {
            const topY = vb.y + halfS;
            if (bp.y >= topY - 0.25 && topY > groundY) groundY = topY;
          }
        }
        for (const bed of this.beds) {
          const halfW = bed.width / 2;
          const halfD = bed.depth / 2;
          if (Math.abs(bp.x - bed.x) < halfW && Math.abs(bp.z - bed.z) < halfD) {
            const topY = bed.y + 0.50;
            if (bp.y >= topY - 0.25 && topY > groundY) groundY = topY;
          }
        }

        if (groundY > -9000 && bp.y <= groundY + halfSize) {
          bp.y = groundY + halfSize;
          bp.vx = 0;
          bp.vy = 0;
          bp.vz = 0;
          bp.isGrounded = true;
          bp.decay = 0;
          // Give it a short stable resting life on the floor
          bp.life = Math.min(bp.life, 3.0 + Math.random() * 1.5);
          if (bp.mesh) {
            bp.mesh.position.set(bp.x, bp.y, bp.z);
            bp.mesh.scale.set(size, size, size);
            bp.mesh.rotation.set(0, (Math.floor(Math.abs(bp.x + bp.z) * 10) % 4) * (Math.PI / 2), 0);
          }
          // spawnBloodDecal3D commented out to satisfy "sin charcos" and prevent lag
          // this.spawnBloodDecal3D(bp.x, groundY, bp.z, size * 2.8);
        } else if (bp.mesh) {
          bp.mesh.position.set(bp.x, bp.y, bp.z);
          bp.mesh.scale.set(size, size, size);
        }
      }

      // Smoothly shrink particles in their final 1.5 seconds of lifetime
      if (bp.mesh) {
        let currentScale = size;
        if (bp.life < 1.5) {
          currentScale *= Math.max(0.01, bp.life / 1.5);
        }
        bp.mesh.scale.set(currentScale, currentScale, currentScale);
      }
    }
  }

  public spawnBloodDecal3D(x: number, y: number, z: number, radius: number = 0.15) {
    if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number' || isNaN(x) || isNaN(y) || isNaN(z)) return;
    if (this.persistentBloodMeshes.length > 300) {
      const oldest = this.persistentBloodMeshes.shift();
      if (oldest) {
        this.scene.remove(oldest);
        if (oldest.geometry) oldest.geometry.dispose();
      }
    }

    const safeRadius = (typeof radius === 'number' && !isNaN(radius) && radius > 0) ? radius : 0.15;
    const rad = Math.max(0.06, Math.min(0.35, safeRadius));
    const geom = new THREE.CircleGeometry(rad, 10);
    geom.rotateX(-Math.PI / 2);

    const darkRed = [0x660000, 0x500000, 0x770000, 0x440000];
    const color = darkRed[Math.floor(Math.random() * darkRed.length)];

    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });

    const decal = new THREE.Mesh(geom, mat);
    decal.rotation.y = Math.random() * Math.PI * 2;
    decal.position.set(x + (Math.random() - 0.5) * 0.04, y + 0.003 + Math.random() * 0.002, z + (Math.random() - 0.5) * 0.04);
    decal.receiveShadow = true;

    this.scene.add(decal);
    this.persistentBloodMeshes.push(decal);
  }

  private syncMeshes(camera?: THREE.Camera) {
    // Skeletal parent-child alignment dictionary to direct down-axis vectors correctly
    const skeletalChildOf: Record<string, string> = {
      cabeza: 'cuello',
      cuello: 'pechobase',
      pechobase: 'pecho_bajo',
      pecho_bajo: 'torso',
      torso: 'ombligo',
      ombligo: 'ombligo_bajo',
      ombligo_bajo: 'pelvis',
      hombro_izq: 'brazo_izq',
      brazo_izq: 'codo_izq',
      codo_izq: 'antebrazo_izq',
      antebrazo_izq: 'muneca_izq',
      muneca_izq: 'mano_izq',
      hombro_der: 'brazo_der',
      brazo_der: 'codo_der',
      codo_der: 'antebrazo_der',
      antebrazo_der: 'muneca_der',
      muneca_der: 'mano_der',

      // 3-Segment Finger alignment chains
      dedo_pulgar_izq: 'dedo_pulgar_izq_seg2',
      dedo_pulgar_izq_seg2: 'dedo_pulgar_izq_seg3',
      dedo_indice_izq: 'dedo_indice_izq_seg2',
      dedo_indice_izq_seg2: 'dedo_indice_izq_seg3',
      dedo_medio_izq: 'dedo_medio_izq_seg2',
      dedo_medio_izq_seg2: 'dedo_medio_izq_seg3',
      dedo_anular_izq: 'dedo_anular_izq_seg2',
      dedo_anular_izq_seg2: 'dedo_anular_izq_seg3',
      dedo_menique_izq: 'dedo_menique_izq_seg2',
      dedo_menique_izq_seg2: 'dedo_menique_izq_seg3',

      dedo_pulgar_der: 'dedo_pulgar_der_seg2',
      dedo_pulgar_der_seg2: 'dedo_pulgar_der_seg3',
      dedo_indice_der: 'dedo_indice_der_seg2',
      dedo_indice_der_seg2: 'dedo_indice_der_seg3',
      dedo_medio_der: 'dedo_medio_der_seg2',
      dedo_medio_der_seg2: 'dedo_medio_der_seg3',
      dedo_anular_der: 'dedo_anular_der_seg2',
      dedo_anular_der_seg2: 'dedo_anular_der_seg3',
      dedo_menique_der: 'dedo_menique_der_seg2',
      dedo_menique_der_seg2: 'dedo_menique_der_seg3',

      muslo_izq: 'rodilla_izq',
      rodilla_izq: 'antepierna_izq',
      antepierna_izq: 'tobillo_izq',
      tobillo_izq: 'pie_izq_talon',
      pie_izq_talon: 'pie_izq_medio',
      pie_izq_medio: 'pie_izq',
      muslo_der: 'rodilla_der',
      rodilla_der: 'antepierna_der',
      antepierna_der: 'tobillo_der',
      tobillo_der: 'pie_der_talon',
      pie_der_talon: 'pie_der_medio',
      pie_der_medio: 'pie_der',
      tentaculo_seg1: 'tentaculo_seg2',
      tentaculo_seg2: 'tentaculo_seg3',
      tentaculo_seg3: 'tentaculo_seg4',
      tentaculo_seg4: 'tentaculo_seg5',
    };

    const skeletalParentOf: Record<string, string> = {};
    for (const [parentKey, childKey] of Object.entries(skeletalChildOf)) {
      skeletalParentOf[childKey] = parentKey;
    }
    skeletalParentOf['mano_izq'] = 'muneca_izq';
    skeletalParentOf['mano_der'] = 'muneca_der';
    skeletalParentOf['pie_izq'] = 'pie_izq_medio';
    skeletalParentOf['pie_der'] = 'pie_der_medio';
    skeletalParentOf['dedo_pie_pulgar_izq'] = 'pie_izq';
    skeletalParentOf['dedo_pie_indice_izq'] = 'pie_izq';
    skeletalParentOf['dedo_pie_medio_izq'] = 'pie_izq';
    skeletalParentOf['dedo_pie_anular_izq'] = 'pie_izq';
    skeletalParentOf['dedo_pie_menique_izq'] = 'pie_izq';
    skeletalParentOf['dedo_pie_pulgar_der'] = 'pie_der';
    skeletalParentOf['dedo_pie_indice_der'] = 'pie_der';
    skeletalParentOf['dedo_pie_medio_der'] = 'pie_der';
    skeletalParentOf['dedo_pie_anular_der'] = 'pie_der';
    skeletalParentOf['dedo_pie_menique_der'] = 'pie_der';

    for (const ragdoll of this.ragdolls) {
      if (ragdoll.cylinderDeformWarmup !== undefined && ragdoll.cylinderDeformWarmup > 0) {
        ragdoll.cylinderDeformWarmup--;
      }
      // Calculate stable torso orientation matrix so breasts/genitals (+Z) and glutes (-Z) never flip!
      const getStableSpineQuaternion = (): THREE.Quaternion | null => {
        const pPelvis = ragdoll.particles.find((pt) => pt.name === 'pelvis');
        const pPecho = ragdoll.particles.find((pt) => pt.name === 'pechobase');
        const pHipL = ragdoll.particles.find((pt) => pt.name === 'muslo_izq');
        const pHipR = ragdoll.particles.find((pt) => pt.name === 'muslo_der');
        const pHombL = ragdoll.particles.find((pt) => pt.name === 'hombro_izq');
        const pHombR = ragdoll.particles.find((pt) => pt.name === 'hombro_der');

        if (!pPelvis || !pPecho) return null;

        // Up vector (+Y) along spine from pelvis to chest
        _scratchVec1.set(pPecho.x - pPelvis.x, pPecho.y - pPelvis.y, pPecho.z - pPelvis.z);
        if (_scratchVec1.lengthSq() < 0.0001) return null;
        _scratchVec1.normalize();

        _scratchVec2.set(Math.cos(ragdoll.facingAngle), 0, -Math.sin(ragdoll.facingAngle));

        // Lock lateral axis to facing angle during ragdoll walk and punch so arms swing freely without rotating/twisting torso
        if (ragdoll.isWalkingRagdoll || (ragdoll.punchTimer !== undefined && ragdoll.punchTimer > 0)) {
          _scratchVec3.copy(_scratchVec2);
        } else if (pHombL && pHombR && !pHombL.dismembered && !pHombR.dismembered) {
          _scratchVec3.set(pHombR.x - pHombL.x, pHombR.y - pHombL.y, pHombR.z - pHombL.z);
        } else if (pHipL && pHipR && !pHipL.dismembered && !pHipR.dismembered) {
          _scratchVec3.set(pHipR.x - pHipL.x, pHipR.y - pHipL.y, pHipR.z - pHipL.z);
        } else {
          _scratchVec3.set(0, 0, 0);
        }

        if (_scratchVec3.lengthSq() < 0.0001) {
          _scratchVec3.copy(_scratchVec2);
        } else {
          // Orthogonalize against spine up vector
          const dotUp = _scratchVec3.dot(_scratchVec1);
          _scratchVec3.addScaledVector(_scratchVec1, -dotUp);
          if (_scratchVec3.lengthSq() < 0.0001) {
            _scratchVec3.copy(_scratchVec2);
          } else {
            _scratchVec3.normalize();
          }
          if (ragdoll.isAlive && !ragdoll.isCollapsed && _scratchVec3.dot(_scratchVec2) < -0.2) {
            _scratchVec3.negate();
          }
        }

        // Forward vector (+Z): right x up
        _scratchVec4.crossVectors(_scratchVec3, _scratchVec1);
        if (_scratchVec4.lengthSq() < 0.0001) {
          _scratchVec4.set(Math.sin(ragdoll.facingAngle), 0, Math.cos(ragdoll.facingAngle));
        } else {
          _scratchVec4.normalize();
        }

        // Re-orthogonalize right: up x forward
        _scratchVec3.crossVectors(_scratchVec1, _scratchVec4).normalize();
        _scratchMat1.makeBasis(_scratchVec3, _scratchVec1, _scratchVec4);
        return _scratchQuat1.setFromRotationMatrix(_scratchMat1).clone();
      };

      const stableSpineQ = getStableSpineQuaternion();

      // Extract stable character forward vector (+Z) and right vector (+X) to prevent sideways rotation
      const bodyForward = stableSpineQ
        ? new THREE.Vector3(0, 0, 1).applyQuaternion(stableSpineQ)
        : new THREE.Vector3(Math.sin(ragdoll.facingAngle), 0, Math.cos(ragdoll.facingAngle));
      const bodyRight = stableSpineQ
        ? new THREE.Vector3(1, 0, 0).applyQuaternion(stableSpineQ)
        : new THREE.Vector3(Math.cos(ragdoll.facingAngle), 0, -Math.sin(ragdoll.facingAngle));

      const _limbDir = new THREE.Vector3();
      const _limbUp = new THREE.Vector3();
      const _limbRight = new THREE.Vector3();
      const _limbFwd = new THREE.Vector3();
      const _limbMat = new THREE.Matrix4();
      const _limbQuat = new THREE.Quaternion();

      const getStableLimbQuaternion = (
        pPos: THREE.Vector3,
        cPos: THREE.Vector3,
        refFwd: THREE.Vector3
      ): THREE.Quaternion => {
        _limbDir.subVectors(cPos, pPos);
        const len = _limbDir.length();
        if (len < 0.0001) return _limbQuat.identity();
        _limbDir.divideScalar(len);

        // Limb axis pointing up towards parent (+Y local)
        _limbUp.copy(_limbDir).negate();

        // Project refFwd onto the plane perpendicular to _limbUp to construct stable _limbFwd without axial twisting
        _limbFwd.copy(refFwd);
        const dotUp = _limbFwd.dot(_limbUp);
        _limbFwd.addScaledVector(_limbUp, -dotUp);
        if (_limbFwd.lengthSq() < 0.0004) {
          _limbFwd.crossVectors(bodyRight, _limbUp);
          if (_limbFwd.lengthSq() < 0.0004) {
            _limbFwd.set(0, 0, 1);
          }
        }
        _limbFwd.normalize();

        _limbRight.crossVectors(_limbUp, _limbFwd).normalize();
        _limbMat.makeBasis(_limbRight, _limbUp, _limbFwd);
        return _limbQuat.setFromRotationMatrix(_limbMat).clone();
      };

      const getStableCylinderQuaternion = (
        posA: THREE.Vector3,
        posB: THREE.Vector3,
        refFwd: THREE.Vector3
      ): THREE.Quaternion => {
        _limbDir.subVectors(posB, posA);
        const len = _limbDir.length();
        if (len < 0.0001) return _limbQuat.identity();
        _limbDir.divideScalar(len);

        _limbRight.crossVectors(_limbDir, refFwd);
        if (_limbRight.lengthSq() < 0.0004) {
          _limbFwd.crossVectors(bodyRight, _limbDir);
          if (_limbFwd.lengthSq() < 0.0004) {
            _limbRight.crossVectors(_limbDir, new THREE.Vector3(0, 1, 0));
            if (_limbRight.lengthSq() < 0.0004) {
              _limbRight.crossVectors(_limbDir, new THREE.Vector3(0, 0, 1));
            }
          } else {
            _limbRight.crossVectors(_limbDir, _limbFwd);
          }
        }
        _limbRight.normalize();

        _limbFwd.crossVectors(_limbRight, _limbDir).normalize();
        _limbMat.makeBasis(_limbRight, _limbDir, _limbFwd);
        return _limbQuat.setFromRotationMatrix(_limbMat).clone();
      };

      const _footFwd = new THREE.Vector3();
      const _footUp = new THREE.Vector3();
      const _footRight = new THREE.Vector3();
      const _footMat = new THREE.Matrix4();
      const _footQuat = new THREE.Quaternion();

      const getStableFootQuaternion = (
        heelPos: THREE.Vector3,
        toePos: THREE.Vector3,
        refUp: THREE.Vector3
      ): THREE.Quaternion => {
        // Forward axis is heel -> toe (+Z in local voxel space)
        _footFwd.subVectors(toePos, heelPos);
        const len = _footFwd.length();
        if (len < 0.0001) _footFwd.set(0, 0, 1);
        else _footFwd.divideScalar(len);

        // Up axis (+Y in local voxel space)
        _footUp.copy(refUp);
        if (_footUp.y < 0.1) {
          _footUp.set(0, 1, 0);
        }
        const dot = _footUp.dot(_footFwd);
        _footUp.addScaledVector(_footFwd, -dot);
        if (_footUp.lengthSq() < 0.0004) {
          _footUp.set(0, 1, 0);
          const d2 = _footUp.dot(_footFwd);
          _footUp.addScaledVector(_footFwd, -d2);
        }
        _footUp.normalize();

        // Right axis (+X in local voxel space) = cross(Up, Forward)
        _footRight.crossVectors(_footUp, _footFwd).normalize();

        // makeBasis(right, up, forward)
        _footMat.makeBasis(_footRight, _footUp, _footFwd);
        return _footQuat.setFromRotationMatrix(_footMat).clone();
      };

      const isRagdollDragged = ragdoll.particles.some((p) => !!p.dragTargetPos);
      if (!ragdoll.isAlive || ragdoll.isCollapsed || (ragdoll.isWalkingRagdoll && isRagdollDragged)) {
        // Reset dynamic sway offsets on genitals, bust, and glutes when in ragdoll mode to keep them perfectly attached!
        const pechobaseP = ragdoll.particles.find((p) => p.name === 'pechobase');
        if (pechobaseP && pechobaseP.voxelsGroup) {
          const bustGroup = pechobaseP.voxelsGroup.getObjectByName('BustExtraGroup') as THREE.Group | undefined;
          if (bustGroup) {
            bustGroup.position.set(0, 0, 0);
            bustGroup.rotation.set(0, 0, 0);
          }
        }
        const pelvisP = ragdoll.particles.find((p) => p.name === 'pelvis');
        if (pelvisP && pelvisP.voxelsGroup) {
          const gluteGroup = pelvisP.voxelsGroup.getObjectByName('GluteExtraGroup') as THREE.Group | undefined;
          if (gluteGroup) {
            gluteGroup.position.set(0, 0, 0);
            gluteGroup.rotation.set(0, 0, 0);
          }
        }

        const getP = (name: string) => ragdoll.particles.find((pt) => pt.name === name);

        // Pre-pass: Set mesh position for all particles
        for (const p of ragdoll.particles) {
          if (p.mesh) {
            p.mesh.position.set(p.x, p.y, p.z);
          }
        }

        // Hierarchical Pass for fingers and toes: force exact anatomical attachment to parent bone mesh
        const fingerAndToeLevels = [
          // Level 0: Base fingers and toes attached to hands (mano) and front feet (pie)
          [
            'dedo_pulgar_izq', 'dedo_indice_izq', 'dedo_medio_izq', 'dedo_anular_izq', 'dedo_menique_izq',
            'dedo_pulgar_der', 'dedo_indice_der', 'dedo_medio_der', 'dedo_anular_der', 'dedo_menique_der',
            'dedo_pie_pulgar_izq', 'dedo_pie_indice_izq', 'dedo_pie_medio_izq', 'dedo_pie_anular_izq', 'dedo_pie_menique_izq',
            'dedo_pie_pulgar_der', 'dedo_pie_indice_der', 'dedo_pie_medio_der', 'dedo_pie_anular_der', 'dedo_pie_menique_der',
          ],
          // Level 1: Segment 2 for fingers
          [
            'dedo_pulgar_izq_seg2', 'dedo_indice_izq_seg2', 'dedo_medio_izq_seg2', 'dedo_anular_izq_seg2', 'dedo_menique_izq_seg2',
            'dedo_pulgar_der_seg2', 'dedo_indice_der_seg2', 'dedo_medio_der_seg2', 'dedo_anular_der_seg2', 'dedo_menique_der_seg2',
          ],
          // Level 2: Segment 3 for fingers
          [
            'dedo_pulgar_izq_seg3', 'dedo_indice_izq_seg3', 'dedo_medio_izq_seg3', 'dedo_anular_izq_seg3', 'dedo_menique_izq_seg3',
            'dedo_pulgar_der_seg3', 'dedo_indice_der_seg3', 'dedo_medio_der_seg3', 'dedo_anular_der_seg3', 'dedo_menique_der_seg3',
          ]
        ];

        const getSkeletalParentName = (name: string): string | null => {
          if (name.includes('_seg3')) return name.replace('_seg3', '_seg2');
          if (name.includes('_seg2')) return name.replace('_seg2', '');
          if (name.startsWith('dedo_') && !name.includes('pie_')) {
            return name.includes('_izq') ? 'mano_izq' : 'mano_der';
          }
          if (name.startsWith('dedo_pie_')) {
            return name.includes('_izq') ? 'pie_izq' : 'pie_der';
          }
          return null;
        };

        const anatomicalOffsets: Record<string, [number, number, number]> = {
          // Left hand fingers relative to mano_izq
          dedo_pulgar_izq: [0.030, -0.030, 0.035],
          dedo_indice_izq: [-0.010, -0.050, 0.035],
          dedo_medio_izq: [-0.010, -0.055, 0.012],
          dedo_anular_izq: [-0.010, -0.050, -0.012],
          dedo_menique_izq: [-0.010, -0.045, -0.035],
          // Right hand fingers relative to mano_der
          dedo_pulgar_der: [-0.030, -0.030, 0.035],
          dedo_indice_der: [0.010, -0.050, 0.035],
          dedo_medio_der: [0.010, -0.055, 0.012],
          dedo_anular_der: [0.010, -0.050, -0.012],
          dedo_menique_der: [0.010, -0.045, -0.035],
          // Left foot toes relative to pie_izq
          dedo_pie_pulgar_izq: [0.050, 0.0, 0.070],
          dedo_pie_indice_izq: [0.025, 0.0, 0.070],
          dedo_pie_medio_izq: [0.000, 0.0, 0.070],
          dedo_pie_anular_izq: [-0.025, 0.0, 0.070],
          dedo_pie_menique_izq: [-0.050, 0.0, 0.070],
          // Right foot toes relative to pie_der
          dedo_pie_pulgar_der: [-0.050, 0.0, 0.070],
          dedo_pie_indice_der: [-0.025, 0.0, 0.070],
          dedo_pie_medio_der: [0.000, 0.0, 0.070],
          dedo_pie_anular_der: [0.025, 0.0, 0.070],
          dedo_pie_menique_der: [0.050, 0.0, 0.070],
        };

        const curScale = ragdoll.scale || 1.0;

        // Only perform procedural constraint rest-length overrides for non-walking/ragdoll physical mode
        if (!ragdoll.isWalkingRagdoll || !ragdoll.isAlive) {
          for (const levelParts of fingerAndToeLevels) {
            for (const pName of levelParts) {
              const p = getP(pName);
              if (!p || !p.mesh || p.dismembered) continue;

              const parentName = getSkeletalParentName(pName);
              if (!parentName) continue;
              const parentPart = getP(parentName);
              if (!parentPart || !parentPart.mesh || parentPart.dismembered) continue;

              if (anatomicalOffsets[pName]) {
                const rawOff = anatomicalOffsets[pName];
                const localVec = new THREE.Vector3(rawOff[0] * curScale, rawOff[1] * curScale, rawOff[2] * curScale);
                localVec.applyQuaternion(parentPart.mesh.quaternion);
                p.mesh.position.copy(parentPart.mesh.position).add(localVec);
              } else if (pName.includes('_seg2') || pName.includes('_seg3')) {
                const segVec = new THREE.Vector3(0, -0.035 * curScale, 0);
                segVec.applyQuaternion(parentPart.mesh.quaternion);
                p.mesh.position.copy(parentPart.mesh.position).add(segVec);
              } else {
                const constraint = ragdoll.constraints.find(
                  (c) => ((c.p1 === p && c.p2 === parentPart) || (c.p1 === parentPart && c.p2 === p)) && !c.broken
                );

                const restLen = constraint ? (constraint.originalLength || constraint.length || 0.035) : 0.035;
                const dir = new THREE.Vector3(p.x - parentPart.x, p.y - parentPart.y, p.z - parentPart.z);
                if (dir.lengthSq() < 0.000001) {
                  dir.set(0, -1, 0).applyQuaternion(parentPart.mesh.quaternion);
                } else {
                  dir.normalize();
                }

                p.mesh.position.copy(parentPart.mesh.position).addScaledVector(dir, restLen);
              }

              p.x = p.mesh.position.x;
              p.y = p.mesh.position.y;
              p.z = p.mesh.position.z;
              p.oldX = p.x;
              p.oldY = p.y;
              p.oldZ = p.z;
            }
          }
        }

        for (const p of ragdoll.particles) {
          if (p.mesh) {

            let aligned = false;
            let stretchRatio = 1.0;

            // 1. Sophisticated, localized spine segment orientation to allow realistic spinal bending, hunching, and twisting
            if (['pelvis', 'ombligo_bajo', 'ombligo', 'torso', 'pecho_bajo', 'pechobase', 'cuello', 'cabeza'].includes(p.name)) {
              let segmentQ: THREE.Quaternion | null = null;
              const pHipL = getP('muslo_izq');
              const pHipR = getP('muslo_der');
              const pHombL = getP('hombro_izq');
              const pHombR = getP('hombro_der');
              
              const defaultRight = new THREE.Vector3(Math.cos(ragdoll.facingAngle), 0, -Math.sin(ragdoll.facingAngle));
              const hipRightVec = new THREE.Vector3();
              if (pHipL && pHipR && !pHipL.dismembered && !pHipR.dismembered) {
                hipRightVec.set(pHipR.x - pHipL.x, pHipR.y - pHipL.y, pHipR.z - pHipL.z).normalize();
              } else {
                hipRightVec.copy(defaultRight);
              }

              const shoulderRightVec = new THREE.Vector3();
              if (pHombL && pHombR && !pHombL.dismembered && !pHombR.dismembered) {
                shoulderRightVec.set(pHombR.x - pHombL.x, pHombR.y - pHombL.y, pHombR.z - pHombL.z).normalize();
              } else {
                shoulderRightVec.copy(defaultRight);
              }

              const segUp = new THREE.Vector3();
              const segRight = new THREE.Vector3();
              const segFwd = new THREE.Vector3();
              const segMat = new THREE.Matrix4();
              const segQuat = new THREE.Quaternion();

              const getSegmentQ = (pA: Particle3D, pB: Particle3D, rVec: THREE.Vector3): THREE.Quaternion => {
                segUp.set(pB.x - pA.x, pB.y - pA.y, pB.z - pA.z);
                if (segUp.lengthSq() < 0.0001) {
                  segUp.set(0, 1, 0);
                } else {
                  segUp.normalize();
                }
                segRight.copy(rVec);
                const d = segRight.dot(segUp);
                segRight.addScaledVector(segUp, -d);
                if (segRight.lengthSq() < 0.0001) {
                  segRight.copy(defaultRight);
                  const d2 = segRight.dot(segUp);
                  segRight.addScaledVector(segUp, -d2);
                }
                segRight.normalize();
                segFwd.crossVectors(segRight, segUp).normalize();
                segMat.makeBasis(segRight, segUp, segFwd);
                return segQuat.setFromRotationMatrix(segMat).clone();
              };

              if (p.name === 'pelvis') {
                const pNext = getP('ombligo_bajo');
                if (pNext && !pNext.dismembered && !p.dismembered) {
                  segmentQ = getSegmentQ(p, pNext, hipRightVec);
                }
              } else if (p.name === 'ombligo_bajo') {
                const pNext = getP('ombligo');
                if (pNext && !pNext.dismembered && !p.dismembered) {
                  segmentQ = getSegmentQ(p, pNext, hipRightVec);
                }
              } else if (p.name === 'ombligo') {
                const pNext = getP('torso');
                if (pNext && !pNext.dismembered && !p.dismembered) {
                  const midRight = hipRightVec.clone().lerp(shoulderRightVec, 0.5).normalize();
                  segmentQ = getSegmentQ(p, pNext, midRight);
                }
              } else if (p.name === 'torso') {
                const pNext = getP('pecho_bajo');
                if (pNext && !pNext.dismembered && !p.dismembered) {
                  segmentQ = getSegmentQ(p, pNext, shoulderRightVec);
                }
              } else if (p.name === 'pecho_bajo') {
                const pNext = getP('pechobase');
                if (pNext && !pNext.dismembered && !p.dismembered) {
                  segmentQ = getSegmentQ(p, pNext, shoulderRightVec);
                }
              } else if (p.name === 'pechobase') {
                const pNext = getP('cuello');
                if (pNext && !pNext.dismembered && !p.dismembered) {
                  segmentQ = getSegmentQ(p, pNext, shoulderRightVec);
                }
              } else if (p.name === 'cuello') {
                const pNext = getP('cabeza');
                if (pNext && !pNext.dismembered && !p.dismembered) {
                  segmentQ = getSegmentQ(p, pNext, shoulderRightVec);
                }
              } else if (p.name === 'cabeza') {
                const pCuello = getP('cuello');
                if (pCuello && !pCuello.dismembered && !p.dismembered) {
                  segmentQ = getSegmentQ(pCuello, p, shoulderRightVec);
                }
              }

              if (segmentQ) {
                p.mesh.quaternion.slerp(segmentQ, 0.85);
                aligned = true;
              } else if (stableSpineQ) {
                p.mesh.quaternion.slerp(stableSpineQ, 0.85);
                aligned = true;
              }
            }

            // 2. Rigid Upper Arm segments (hombro -> brazo -> codo): perfectly straight along whole upper arm bone, rotating only at shoulder & elbow
            if (!aligned && (p.name === 'hombro_izq' || p.name === 'brazo_izq')) {
              const pH = getP('hombro_izq');
              const pC = getP('codo_izq') || getP('mano_izq');
              if (pH && pC && !pH.dismembered && !pC.dismembered) {
                const targetQ = getStableLimbQuaternion(
                  new THREE.Vector3(pH.x, pH.y, pH.z),
                  new THREE.Vector3(pC.x, pC.y, pC.z),
                  bodyForward
                );
                p.mesh.quaternion.slerp(targetQ, ragdoll.isWalkingRagdoll ? 0.98 : 0.90);
                aligned = true;
              }
            } else if (!aligned && (p.name === 'hombro_der' || p.name === 'brazo_der')) {
              const pH = getP('hombro_der');
              const pC = getP('codo_der') || getP('mano_der');
              if (pH && pC && !pH.dismembered && !pC.dismembered) {
                const targetQ = getStableLimbQuaternion(
                  new THREE.Vector3(pH.x, pH.y, pH.z),
                  new THREE.Vector3(pC.x, pC.y, pC.z),
                  bodyForward
                );
                p.mesh.quaternion.slerp(targetQ, ragdoll.isWalkingRagdoll ? 0.98 : 0.90);
                aligned = true;
              }
            }

            // 3. Rigid Forearm segments (codo -> antebrazo -> muneca): perfectly straight along forearm bone, rotating only at elbow & wrist
            if (!aligned && (p.name === 'codo_izq' || p.name === 'antebrazo_izq' || p.name === 'muneca_izq')) {
              const pC = getP('codo_izq') || getP('hombro_izq');
              const pM = getP('muneca_izq') || getP('mano_izq');
              if (pC && pM && !pC.dismembered && !pM.dismembered) {
                const targetQ = getStableLimbQuaternion(
                  new THREE.Vector3(pC.x, pC.y, pC.z),
                  new THREE.Vector3(pM.x, pM.y, pM.z),
                  bodyForward
                );
                p.mesh.quaternion.slerp(targetQ, ragdoll.isWalkingRagdoll ? 0.98 : 0.90);
                aligned = true;
              }
            } else if (!aligned && (p.name === 'codo_der' || p.name === 'antebrazo_der' || p.name === 'muneca_der')) {
              const pC = getP('codo_der') || getP('hombro_der');
              const pM = getP('muneca_der') || getP('mano_der');
              if (pC && pM && !pC.dismembered && !pM.dismembered) {
                const targetQ = getStableLimbQuaternion(
                  new THREE.Vector3(pC.x, pC.y, pC.z),
                  new THREE.Vector3(pM.x, pM.y, pM.z),
                  bodyForward
                );
                p.mesh.quaternion.slerp(targetQ, ragdoll.isWalkingRagdoll ? 0.98 : 0.90);
                aligned = true;
              }
            }

            // 3b. Rigid Hand Palms (mano_izq / mano_der): aligned smoothly along forearm vector from wrist to hand
            if (!aligned && p.name === 'mano_izq') {
              const pMuneca = getP('muneca_izq') || getP('antebrazo_izq');
              const pMano = getP('mano_izq');
              if (pMuneca && pMano && !pMuneca.dismembered && !pMano.dismembered) {
                const targetQ = getStableLimbQuaternion(
                  new THREE.Vector3(pMuneca.x, pMuneca.y, pMuneca.z),
                  new THREE.Vector3(pMano.x, pMano.y, pMano.z),
                  bodyForward
                );
                p.mesh.quaternion.slerp(targetQ, 0.85);
                aligned = true;
              }
            } else if (!aligned && p.name === 'mano_der') {
              const pMuneca = getP('muneca_der') || getP('antebrazo_der');
              const pMano = getP('mano_der');
              if (pMuneca && pMano && !pMuneca.dismembered && !pMano.dismembered) {
                const targetQ = getStableLimbQuaternion(
                  new THREE.Vector3(pMuneca.x, pMuneca.y, pMuneca.z),
                  new THREE.Vector3(pMano.x, pMano.y, pMano.z),
                  bodyForward
                );
                p.mesh.quaternion.slerp(targetQ, 0.85);
                aligned = true;
              }
            }

            // 3c. Finger Segments: inherit palm orientation so fingers point naturally with the hand while flexing dynamically
            if (!aligned && p.name.startsWith('dedo_') && !p.name.startsWith('dedo_pie_')) {
              const isLeft = p.name.includes('_izq');
              const pHand = getP(isLeft ? 'mano_izq' : 'mano_der');
              if (pHand && !pHand.dismembered && !p.dismembered && pHand.mesh) {
                const nextSeg = p.name.endsWith('_seg2') ? getP(`${p.name.replace('_seg2', '_seg3')}`) : (p.name.includes('_seg') ? null : getP(`${p.name}_seg2`));
                if (nextSeg && !nextSeg.dismembered) {
                  const targetQ = getStableLimbQuaternion(
                    new THREE.Vector3(p.x, p.y, p.z),
                    new THREE.Vector3(nextSeg.x, nextSeg.y, nextSeg.z),
                    bodyForward
                  );
                  p.mesh.quaternion.slerp(targetQ, 0.75);
                } else {
                  p.mesh.quaternion.copy(pHand.mesh.quaternion);
                }
                aligned = true;
              }
            }

            // 4. Rigid Thigh segments (muslo -> rodilla): straight along thigh bone, rotating only at hip & knee
            if (!aligned && p.name === 'muslo_izq') {
              const pM = getP('muslo_izq');
              const pR = getP('rodilla_izq');
              if (pM && pR && !pM.dismembered && !pR.dismembered) {
                const targetQ = getStableLimbQuaternion(
                  new THREE.Vector3(pM.x, pM.y, pM.z),
                  new THREE.Vector3(pR.x, pR.y, pR.z),
                  bodyForward
                );
                p.mesh.quaternion.slerp(targetQ, 0.85);
                aligned = true;
              }
            } else if (!aligned && p.name === 'muslo_der') {
              const pM = getP('muslo_der');
              const pR = getP('rodilla_der');
              if (pM && pR && !pM.dismembered && !pR.dismembered) {
                const targetQ = getStableLimbQuaternion(
                  new THREE.Vector3(pM.x, pM.y, pM.z),
                  new THREE.Vector3(pR.x, pR.y, pR.z),
                  bodyForward
                );
                p.mesh.quaternion.slerp(targetQ, 0.85);
                aligned = true;
              }
            }

            // 5. Rigid Shin segments (rodilla -> antepierna -> tobillo): straight along shin bone, rotating only at knee & ankle
            if (!aligned && (p.name === 'rodilla_izq' || p.name === 'antepierna_izq' || p.name === 'tobillo_izq')) {
              const pR = getP('rodilla_izq');
              const pT = getP('tobillo_izq') || getP('pie_izq_talon');
              if (pR && pT && !pR.dismembered && !pT.dismembered) {
                const targetQ = getStableLimbQuaternion(
                  new THREE.Vector3(pR.x, pR.y, pR.z),
                  new THREE.Vector3(pT.x, pT.y, pT.z),
                  bodyForward
                );
                p.mesh.quaternion.slerp(targetQ, 0.85);
                aligned = true;
              }
            } else if (!aligned && (p.name === 'rodilla_der' || p.name === 'antepierna_der' || p.name === 'tobillo_der')) {
              const pR = getP('rodilla_der');
              const pT = getP('tobillo_der') || getP('pie_der_talon');
              if (pR && pT && !pR.dismembered && !pT.dismembered) {
                const targetQ = getStableLimbQuaternion(
                  new THREE.Vector3(pR.x, pR.y, pR.z),
                  new THREE.Vector3(pT.x, pT.y, pT.z),
                  bodyForward
                );
                p.mesh.quaternion.slerp(targetQ, 0.85);
                aligned = true;
              }
            }

            // 6. Rigid Foot Base (pie_talon -> pie_medio -> pie): perfectly straight, solid flat foot sole
            if (!aligned && (p.name === 'pie_izq_talon' || p.name === 'pie_izq_medio' || p.name === 'pie_izq')) {
              const pTalon = getP('pie_izq_talon');
              const pPie = getP('pie_izq');
              const pTobillo = getP('tobillo_izq');
              if (pTalon && pPie && !pTalon.dismembered && !pPie.dismembered) {
                let footUp = new THREE.Vector3(0, 1, 0);
                if (pTobillo) {
                  const tUp = new THREE.Vector3(pTobillo.x - pTalon.x, pTobillo.y - pTalon.y, pTobillo.z - pTalon.z);
                  const fwd = new THREE.Vector3(pPie.x - pTalon.x, pPie.y - pTalon.y, pPie.z - pTalon.z).normalize();
                  tUp.addScaledVector(fwd, -tUp.dot(fwd));
                  if (tUp.lengthSq() > 0.001) {
                    footUp = tUp.normalize();
                  }
                }
                const targetQ = getStableFootQuaternion(
                  new THREE.Vector3(pTalon.x, pTalon.y, pTalon.z),
                  new THREE.Vector3(pPie.x, pPie.y, pPie.z),
                  footUp
                );
                p.mesh.quaternion.slerp(targetQ, 0.85);
                aligned = true;
              }
            } else if (!aligned && (p.name === 'pie_der_talon' || p.name === 'pie_der_medio' || p.name === 'pie_der')) {
              const pTalon = getP('pie_der_talon');
              const pPie = getP('pie_der');
              const pTobillo = getP('tobillo_der');
              if (pTalon && pPie && !pTalon.dismembered && !pPie.dismembered) {
                let footUp = new THREE.Vector3(0, 1, 0);
                if (pTobillo) {
                  const tUp = new THREE.Vector3(pTobillo.x - pTalon.x, pTobillo.y - pTalon.y, pTobillo.z - pTalon.z);
                  const fwd = new THREE.Vector3(pPie.x - pTalon.x, pPie.y - pTalon.y, pPie.z - pTalon.z).normalize();
                  tUp.addScaledVector(fwd, -tUp.dot(fwd));
                  if (tUp.lengthSq() > 0.001) {
                    footUp = tUp.normalize();
                  }
                }
                const targetQ = getStableFootQuaternion(
                  new THREE.Vector3(pTalon.x, pTalon.y, pTalon.z),
                  new THREE.Vector3(pPie.x, pPie.y, pPie.z),
                  footUp
                );
                p.mesh.quaternion.slerp(targetQ, 0.85);
                aligned = true;
              }
            }

            // 7. Toe segments: inherit stable foot orientation while orienting along flexed toe direction
            if (!aligned && p.name.startsWith('dedo_pie_')) {
              const isLeftToe = p.name.includes('_izq');
              const pFoot = getP(isLeftToe ? 'pie_izq' : 'pie_der');
              if (pFoot && !pFoot.dismembered && !p.dismembered && pFoot.mesh) {
                const targetQ = getStableLimbQuaternion(
                  new THREE.Vector3(pFoot.x, pFoot.y, pFoot.z),
                  new THREE.Vector3(p.x, p.y, p.z),
                  bodyForward
                );
                p.mesh.quaternion.slerp(targetQ, 0.65);
                aligned = true;
              }
            }

            // 8. General hierarchical child fallback
            if (!aligned) {
              const targetChildName = skeletalChildOf[p.name];

              if (targetChildName) {
                const childPart = ragdoll.particles.find((other) => other.name === targetChildName);
                if (childPart && !childPart.dismembered && !p.dismembered) {
                  const constraint = ragdoll.constraints.find(
                    (c) =>
                      ((c.p1 === p && c.p2 === childPart) || (c.p1 === childPart && c.p2 === p)) &&
                      !c.broken
                  );
                  if (constraint) {
                    const dir = new THREE.Vector3(childPart.x - p.x, childPart.y - p.y, childPart.z - p.z);
                    const currentDist = dir.length();
                    const origLen = constraint.originalLength || constraint.length || 0.01;
                    if (currentDist > origLen) {
                      stretchRatio = Math.min(3.0, currentDist / origLen);
                    }
                    if (currentDist > 0.0001) {
                      const targetQ = getStableLimbQuaternion(
                        new THREE.Vector3(p.x, p.y, p.z),
                        new THREE.Vector3(childPart.x, childPart.y, childPart.z),
                        bodyForward
                      );
                      p.mesh.quaternion.slerp(targetQ, 0.85);
                      aligned = true;
                    }
                  }
                }
              }
            }

            // If terminal leaf particle, align in continuity along parent bone direction (e.g. wrist -> hand, finger seg2 -> seg3)
            if (!aligned) {
              const targetParentName = skeletalParentOf[p.name];
              if (targetParentName) {
                const parentPart = ragdoll.particles.find((other) => other.name === targetParentName);
                if (parentPart && !parentPart.dismembered && !p.dismembered) {
                  const dir = new THREE.Vector3(p.x - parentPart.x, p.y - parentPart.y, p.z - parentPart.z);
                  const currentDist = dir.length();
                  if (currentDist > 0.0001) {
                    const targetQ = getStableLimbQuaternion(
                      new THREE.Vector3(parentPart.x, parentPart.y, parentPart.z),
                      new THREE.Vector3(p.x, p.y, p.z),
                      bodyForward
                    );
                    p.mesh.quaternion.slerp(targetQ, 0.85);
                    aligned = true;
                  }
                }
              }
            }

            // Fallback if no hierarchical child or connection is broken (tumbling dismembered segment)
            if (!aligned) {
              const parentConstraint = ragdoll.constraints.find(
                (c) => (c.p1 === p || c.p2 === p) && !c.broken
              );
              if (parentConstraint) {
                const other = parentConstraint.p1 === p ? parentConstraint.p2 : parentConstraint.p1;
                const dir = new THREE.Vector3(other.x - p.x, other.y - p.y, other.z - p.z);
                const currentDist = dir.length();
                const origLen = parentConstraint.originalLength || parentConstraint.length || 0.01;
                if (currentDist > origLen) {
                  stretchRatio = Math.min(3.0, currentDist / origLen);
                }
                if (currentDist > 0.0001) {
                  const targetQ = getStableLimbQuaternion(
                    new THREE.Vector3(other.x, other.y, other.z),
                    new THREE.Vector3(p.x, p.y, p.z),
                    bodyForward
                  );
                  p.mesh.quaternion.slerp(targetQ, 0.85);
                }
              }
            }

            // Involuntary rotation spasms strictly gated to ragdoll or ragdoll walk mode
            const canHaveSpasms = (!ragdoll.isAlive || ragdoll.isCollapsed || ragdoll.isWalkingRagdoll);
            if (canHaveSpasms && ragdoll.fluidSpasmAngles) {
              const spAng = ragdoll.fluidSpasmAngles[p.name];
              if (spAng && (spAng.rotX !== 0 || spAng.rotY !== 0 || spAng.rotZ !== 0)) {
                const spasmEuler = new THREE.Euler(spAng.rotX, spAng.rotY || 0, spAng.rotZ || 0, 'YXZ');
                const spasmQuat = new THREE.Quaternion().setFromEuler(spasmEuler);
                p.mesh.quaternion.multiply(spasmQuat);
              }
            }

            p.mesh.scale.set(1.0, 1.0, 1.0);
          }
        }
      }

      // Update joint bridges if cylinder style is active or Sin Piel (mode 1) tendons are shown
      const isCylinderMode = (ragdoll.contourJointStyle === 'cylinder' && ragdoll.contourLayerEnabled && (!ragdoll.xrayMode || ragdoll.xrayMode === 0)) || (ragdoll.xrayMode === 1);
      if (ragdoll.jointBridges) {
        if (!isCylinderMode) {
          for (const bridge of ragdoll.jointBridges) {
            bridge.visible = false;
          }
        } else {
          for (const bridge of ragdoll.jointBridges) {
            const c = bridge.userData.constraint;
            if (c && c.p1 && c.p2 && !c.broken && !c.p1.dismembered && !c.p2.dismembered) {
              let p1Pos = new THREE.Vector3(c.p1.x, c.p1.y, c.p1.z);
              let p2Pos = new THREE.Vector3(c.p2.x, c.p2.y, c.p2.z);

              // For toe bridges connected from foot base (pie_) to toes (dedo_pie_), adjust p1Pos X to align with the toe's own X axis so toe cylinders run strictly parallel forward
              if (c.p2.name.startsWith('dedo_pie_')) {
                const angle = ragdoll.facingAngle || 0;
                const charRight = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle));
                const relVec = p2Pos.clone().sub(p1Pos);
                const sideDist = relVec.dot(charRight);
                p1Pos.addScaledVector(charRight, sideDist);
              }

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

              const dist = p1Pos.distanceTo(p2Pos);

              if (dist < 0.0001) {
                bridge.visible = false;
                continue;
              }

              const cName = c.name || '';
              const isFingerOrToe = (
                cName.includes('pulgar') ||
                cName.includes('indice') ||
                cName.includes('medio') ||
                cName.includes('anular') ||
                cName.includes('menique') ||
                cName.includes('dedo') ||
                c.p1.name.includes('dedo') ||
                c.p2.name.includes('dedo')
              );

              const visualDist = dist;
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

              // Create or update tapered cylinder geometry of unit length 1.0
              if (
                Math.abs((bridge.userData.lastR1 || 0) - r1) > 0.001 ||
                Math.abs((bridge.userData.lastR2 || 0) - r2) > 0.001 ||
                !bridge.userData.baseCylinderPositions
              ) {
                if (bridge.geometry && bridge.geometry !== (ragdoll as any).defaultBridgeGeom) {
                  bridge.geometry.dispose();
                }
                const radialSegs = Math.max(4, Math.min(24, Math.round(ragdoll.bodyCubicity !== undefined ? ragdoll.bodyCubicity : 24)));
                
                if (ragdoll.xrayMode === 1) {
                  // 3-strand helical tendon fibers across whole body
                  const baseGeom = new THREE.CylinderGeometry(r2, r1, 1.0, 32, 32, false);
                  const posAttr = baseGeom.attributes.position;
                  const count = posAttr.count;
                  for (let ki = 0; ki < count; ki++) {
                    const x = posAttr.getX(ki);
                    const y = posAttr.getY(ki);
                    const z = posAttr.getZ(ki);
                    const r = Math.sqrt(x * x + z * z);
                    if (r > 0.001) {
                      const theta = Math.atan2(z, x);
                      const factor = 1.0 + 0.22 * Math.sin(theta * 3 + y * 35.0);
                      posAttr.setX(ki, x * factor);
                      posAttr.setZ(ki, z * factor);
                    }
                  }
                  posAttr.needsUpdate = true;
                  baseGeom.computeVertexNormals();
                  bridge.geometry = baseGeom;
                } else {
                  bridge.geometry = new THREE.CylinderGeometry(r2, r1, 1.0, radialSegs, 10, false);
                }
                bridge.userData.lastR1 = r1;
                bridge.userData.lastR2 = r2;

                const posAttr = bridge.geometry.attributes.position;
                const basePos = new Float32Array(posAttr.count * 3);
                for (let k = 0; k < posAttr.count; k++) {
                  basePos[k * 3] = posAttr.getX(k);
                  basePos[k * 3 + 1] = posAttr.getY(k);
                  basePos[k * 3 + 2] = posAttr.getZ(k);
                }
                bridge.userData.baseCylinderPositions = basePos;
                bridge.userData.needsDeform = true;
              }

              const dir = new THREE.Vector3().subVectors(p2Pos, p1Pos).normalize();
              bridge.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

              // Scale standard tapered cylinder to cover distance between joints.
              bridge.scale.set(1.0, visualDist, 1.0);

              const p1Empty = c.p1 && c.p1.voxelBlocks ? c.p1.voxelBlocks.filter((b) => b.active).length === 0 : false;
              const p2Empty = c.p2 && c.p2.voxelBlocks ? c.p2.voxelBlocks.filter((b) => b.active).length === 0 : false;
              bridge.visible = !p1Empty && !p2Empty && ragdoll.xrayMode !== 1 && ragdoll.xrayMode !== 2 && ragdoll.xrayMode !== 4;

            // Ensure color attribute is initialized on the bridge geometry for staining bullet holes red and matching clothing!
            const brMat = Array.isArray(bridge.material) ? bridge.material[0] : bridge.material;
            const isShirtBridge = ragdoll.hasShirt && SHIRT_BODY_PARTS.has(c.p1.name) && SHIRT_BODY_PARTS.has(c.p2.name);
            const isPantsBridge = ragdoll.hasPants && PANTS_BODY_PARTS.has(c.p1.name) && PANTS_BODY_PARTS.has(c.p2.name);
            const strBridge = (c.name + '_' + c.p1.name + '_' + c.p2.name).toLowerCase();
            const isInternal = (
              strBridge.includes('canal') ||
              strBridge.includes('uterus') ||
              strBridge.includes('utero') ||
              strBridge.includes('ovary') ||
              strBridge.includes('ovario')
            );
            let expectedHex = getRagdollSkinColor(ragdoll);
            if (ragdoll.xrayMode === 1) {
              expectedHex = 0xf1f5f9;
              if (brMat instanceof THREE.MeshStandardMaterial) {
                brMat.roughness = 0.45;
                brMat.metalness = 0.10;
                if (!brMat.emissive) {
                  brMat.emissive = new THREE.Color(0x475569);
                } else {
                  brMat.emissive.setHex(0x475569);
                }
                brMat.emissiveIntensity = 0.12;
              }
            } else if (isInternal) {
              expectedHex = 0xf43f5e;
            } else if (isShirtBridge) {
              expectedHex = ragdoll.shirtColorHex || 0x38bdf8;
            } else if (isPantsBridge) {
              expectedHex = ragdoll.pantsColorHex || 0x1e3a8a;
            }
            const baseCol = new THREE.Color(expectedHex);
            if (brMat && (brMat as any).color) {
              (brMat as any).color.copy(baseCol);
            }

            // Apply real-time bullet hole deformation to cylinder vertices (only when dirty or hit)
            const checkParticles = [c.p1, c.p2];
            if (bridge.userData.baseCylinderPositions && bridge.userData.needsDeform) {
              const posAttr = bridge.geometry.attributes.position;
              const basePos = bridge.userData.baseCylinderPositions;
              const count = posAttr.count;

              if (!bridge.geometry.attributes.color) {
                const colors = new Float32Array(count * 3);
                for (let j = 0; j < count; j++) {
                  colors[j * 3] = baseCol.r;
                  colors[j * 3 + 1] = baseCol.g;
                  colors[j * 3 + 2] = baseCol.b;
                }
                bridge.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                if (brMat && 'vertexColors' in brMat) {
                  (brMat as any).vertexColors = true;
                  (brMat as any).needsUpdate = true;
                }
              }
              const colorAttr = bridge.geometry.attributes.color;
              const bloodColor = new THREE.Color(0xdc2626);

              const bridgeH = dist;

              for (let k = 0; k < count; k++) {
                const bx = basePos[k * 3];
                const by = basePos[k * 3 + 1];
                const bz = basePos[k * 3 + 2];

                // Get world position of this cylinder vertex, accounting for dynamic scale
                const vVertWorld = new THREE.Vector3(bx, by * bridgeH, bz);
                vVertWorld.applyQuaternion(bridge.quaternion);
                vVertWorld.add(bridge.position);

                let maxWeight = 0;

                for (const pCheck of checkParticles) {
                  const pScale = pCheck.mesh ? scale : 1.0;
                  if (pCheck.voxelBlocks) {
                    for (const b of pCheck.voxelBlocks) {
                      if (!b.active) {
                        // Get world position of the destroyed block
                        const bWorld = b.localPos.clone();
                        if (pCheck.mesh) {
                          bWorld.applyQuaternion(pCheck.mesh.quaternion);
                        }
                        bWorld.multiplyScalar(pScale);
                        bWorld.add(new THREE.Vector3(pCheck.x, pCheck.y, pCheck.z));

                        // Anisotropic distance based on block dimensions
                        const bSizeX = (b.size ? b.size[0] : 0.08) * 1.35 * pScale;
                        const bSizeY = (b.size ? b.size[1] : 0.08) * 1.35 * pScale;
                        const bSizeZ = (b.size ? b.size[2] : 0.08) * 1.35 * pScale;

                        const diff = vVertWorld.clone().sub(bWorld);
                        if (pCheck.mesh) {
                          diff.applyQuaternion(pCheck.mesh.quaternion.clone().invert());
                        }

                        const ellipSq = Math.pow(diff.x / bSizeX, 2) + Math.pow(diff.y / bSizeY, 2) + Math.pow(diff.z / bSizeZ, 2);
                        if (ellipSq < 1.0) {
                          // Morph vertices inward to make a hollow cavity (hueco) where block was destroyed
                          const weight = Math.pow(1.0 - Math.sqrt(ellipSq), 2.2);
                          if (weight > maxWeight) {
                            maxWeight = weight;
                          }
                        }
                      }
                    }
                  }

                  if (pCheck.contourMesh?.userData?.holes) {
                    for (const hole of pCheck.contourMesh.userData.holes) {
                      // Get world position of the hole
                      const hWorld = hole.pos.clone();
                      if (pCheck.mesh) {
                        hWorld.applyQuaternion(pCheck.mesh.quaternion);
                      }
                      hWorld.multiplyScalar(pScale);
                      hWorld.add(new THREE.Vector3(pCheck.x, pCheck.y, pCheck.z));

                      let weight = 0;
                      if (hole.radiusX && hole.radiusY) {
                        const hDiff = vVertWorld.clone().sub(hWorld);
                        if (pCheck.mesh) {
                          hDiff.applyQuaternion(pCheck.mesh.quaternion.clone().invert());
                        }
                        const rx = hole.radiusX * 1.35 * pScale;
                        const ry = hole.radiusY * 1.35 * pScale;
                        const rz = (rx + ry) * 0.5;
                        const ellipSq = Math.pow(hDiff.x / rx, 2) + Math.pow(hDiff.y / ry, 2) + Math.pow(hDiff.z / rz, 2);
                        if (ellipSq < 1.0) {
                          weight = Math.pow(1.0 - Math.sqrt(ellipSq), 2.2);
                        }
                      } else {
                        const distToHole = vVertWorld.distanceTo(hWorld);
                        const holeRadiusWorld = (hole.radius || 0.08) * 1.25 * pScale;
                        if (distToHole < holeRadiusWorld) {
                          weight = Math.pow(1.0 - (distToHole / holeRadiusWorld), 2.5);
                        }
                      }
                      if (weight > maxWeight) {
                        maxWeight = weight;
                      }
                    }
                  }
                }

                if (bridge.userData?.holes) {
                  for (const hole of bridge.userData.holes) {
                    const rx = (hole.radiusX || hole.radius || 0.08) * 1.35;
                    const ry = (hole.radiusY || hole.radius || 0.08) * 1.35;
                    const rz = (rx + ry) * 0.5;
                    const hDiffX = bx - hole.pos.x;
                    const hDiffY = (by * bridgeH) - hole.pos.y;
                    const hDiffZ = bz - hole.pos.z;
                    const ellipSq = Math.pow(hDiffX / rx, 2) + Math.pow(hDiffY / ry, 2) + Math.pow(hDiffZ / rz, 2);
                    if (ellipSq < 1.0) {
                      const weight = Math.pow(1.0 - Math.sqrt(ellipSq), 2.2);
                      if (weight > maxWeight) {
                        maxWeight = weight;
                      }
                    }
                  }
                }

                if (maxWeight > 0.01) {
                  // Morph vertex inward into a clean spherical cavity without altering cylinder height (by)
                  const radLen = Math.sqrt(bx * bx + bz * bz);
                  if (radLen > 0.0001) {
                    const depthFactor = Math.min(0.85, maxWeight);
                    const k_rad = 1.0 - depthFactor;
                    posAttr.setXYZ(k, bx * k_rad, by, bz * k_rad);
                  } else {
                    posAttr.setXYZ(k, bx, by, bz);
                  }

                  if (colorAttr) {
                    // Stain it deep red inside the hole
                    const stainK = Math.min(1.0, maxWeight * 1.5);
                    const r = THREE.MathUtils.lerp(baseCol.r, 0.20, stainK);
                    const g = THREE.MathUtils.lerp(baseCol.g, 0.02, stainK);
                    const b = THREE.MathUtils.lerp(baseCol.b, 0.02, stainK);
                    colorAttr.setXYZ(k, r, g, b);
                  }
                } else {
                  posAttr.setXYZ(k, bx, by, bz);
                  if (colorAttr) {
                    colorAttr.setXYZ(k, baseCol.r, baseCol.g, baseCol.b);
                  }
                }
              }

              posAttr.needsUpdate = true;
              if (colorAttr) colorAttr.needsUpdate = true;
              bridge.geometry.computeVertexNormals();
              bridge.userData.needsDeform = false;
            }
          } else {
            bridge.visible = false;
          }
        }
      }
    }

      // Update joint spheres (Seamless ball joint nodes connecting adjacent cylinders into one continuous body)
      if (ragdoll.jointSpheres) {
        for (const sphere of ragdoll.jointSpheres) {
          const p = sphere.userData.particle;
          const pEmpty = p && p.voxelBlocks ? p.voxelBlocks.filter((b) => b.active).length === 0 : false;
          if (p && isCylinderMode && !p.dismembered && !pEmpty) {
            const offset = sphere.userData.localOffset as THREE.Vector3 | undefined;
            if (offset && p.mesh) {
              p.mesh.updateMatrixWorld(true);
              const worldPos = p.mesh.localToWorld(offset.clone());
              sphere.position.copy(worldPos);
              sphere.quaternion.copy(p.mesh.quaternion);
            } else if (offset) {
              sphere.position.set(p.x + offset.x, p.y + offset.y, p.z + offset.z);
              if (p.mesh) sphere.quaternion.copy(p.mesh.quaternion);
            } else {
              sphere.position.set(p.x, p.y, p.z);
              if (p.mesh) sphere.quaternion.copy(p.mesh.quaternion);
            }
            const targetLimb = sphere.userData.targetLimbName
              ? ragdoll.particles.find((pt) => pt.name === sphere.userData.targetLimbName)
              : p;
            const wMult = targetLimb && targetLimb.widthMultiplier !== undefined ? targetLimb.widthMultiplier : 1.0;
            // Restored full anatomical 3D ball joint spheres across hips, knees, ankles, feet, and toes
            sphere.scale.set(wMult, wMult, wMult);
            sphere.visible = ragdoll.xrayMode !== 1 && ragdoll.xrayMode !== 2 && ragdoll.xrayMode !== 4;

            const posAttr = sphere.geometry.attributes.position;
            if (!sphere.userData.baseSpherePositions) {
              const basePos = new Float32Array(posAttr.count * 3);
              for (let k = 0; k < posAttr.count; k++) {
                basePos[k * 3] = posAttr.getX(k);
                basePos[k * 3 + 1] = posAttr.getY(k);
                basePos[k * 3 + 2] = posAttr.getZ(k);
              }
              sphere.userData.baseSpherePositions = basePos;
              sphere.userData.needsDeform = true;
            }

            // Ensure color attribute is initialized on the sphere geometry for staining bullet holes red and matching clothing!
            const spMat = Array.isArray(sphere.material) ? sphere.material[0] : sphere.material;
            const strP = p.name.toLowerCase();
            const isInternal = (
              strP.includes('canal') ||
              strP.includes('uterus') ||
              strP.includes('utero') ||
              strP.includes('ovary') ||
              strP.includes('ovario')
            );
            let expectedSpHex = getRagdollSkinColor(ragdoll);
            if (isInternal) {
              expectedSpHex = 0xf43f5e;
            } else if (ragdoll.hasShirt && SHIRT_BODY_PARTS.has(p.name)) {
              expectedSpHex = ragdoll.shirtColorHex || 0x38bdf8;
            } else if (ragdoll.hasPants && PANTS_BODY_PARTS.has(p.name)) {
              expectedSpHex = ragdoll.pantsColorHex || 0x1e3a8a;
            }
            const baseCol = new THREE.Color(expectedSpHex);
            if (spMat && (spMat as any).color) {
              (spMat as any).color.copy(baseCol);
            }

            // Apply real-time bullet hole deformation to joint sphere vertices (only when dirty or hit)
            if (sphere.userData.baseSpherePositions && sphere.userData.needsDeform) {
              const basePos = sphere.userData.baseSpherePositions;
              const count = posAttr.count;

              if (!sphere.geometry.attributes.color) {
                const colors = new Float32Array(count * 3);
                for (let j = 0; j < count; j++) {
                  colors[j * 3] = baseCol.r;
                  colors[j * 3 + 1] = baseCol.g;
                  colors[j * 3 + 2] = baseCol.b;
                }
                sphere.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                if (spMat && 'vertexColors' in spMat) {
                  (spMat as any).vertexColors = true;
                  (spMat as any).needsUpdate = true;
                }
              }
              const colorAttr = sphere.geometry.attributes.color;
              const bloodColor = new THREE.Color(0xdc2626);

              const scale = ragdoll.scale || 1.0;
              const pScale = p.mesh ? scale : 1.0;

              for (let k = 0; k < count; k++) {
                const bx = basePos[k * 3];
                const by = basePos[k * 3 + 1];
                const bz = basePos[k * 3 + 2];

                // Get world position of this sphere vertex, accounting for dynamic scale and orientation
                const vVertWorld = new THREE.Vector3(bx * wMult, by, bz * wMult);
                vVertWorld.applyQuaternion(sphere.quaternion);
                vVertWorld.add(sphere.position);

                let maxWeight = 0;

                if (p.voxelBlocks) {
                  for (const b of p.voxelBlocks) {
                    if (!b.active) {
                      // Get world position of the block
                      const bWorld = b.localPos.clone();
                      if (p.mesh) {
                        bWorld.applyQuaternion(p.mesh.quaternion);
                      }
                      bWorld.multiplyScalar(pScale);
                      bWorld.add(new THREE.Vector3(p.x, p.y, p.z));

                      const distToBlock = vVertWorld.distanceTo(bWorld);
                      // Tighten sphere influence radius to prevent general joint shrinking/narrowing (achicarse) and create a local hole
                      const blockRadiusWorld = Math.max(b.size[0], b.size[1], b.size[2]) * 1.15 * pScale;
                      if (distToBlock < blockRadiusWorld) {
                        // Apply a steep power falloff to create a localized deep crater/hole instead of shrinking
                        const weight = Math.pow(1.0 - (distToBlock / blockRadiusWorld), 2.5);
                        if (weight > maxWeight) {
                          maxWeight = weight;
                        }
                      }
                    }
                  }
                }

                if (p.contourMesh?.userData?.holes) {
                  for (const hole of p.contourMesh.userData.holes) {
                    // Get world position of the hole
                    const hWorld = hole.pos.clone();
                    if (p.mesh) {
                      hWorld.applyQuaternion(p.mesh.quaternion);
                    }
                    hWorld.multiplyScalar(pScale);
                    hWorld.add(new THREE.Vector3(p.x, p.y, p.z));

                    const distToHole = vVertWorld.distanceTo(hWorld);
                    const holeRadiusWorld = hole.radius * 1.15 * pScale;
                    if (distToHole < holeRadiusWorld) {
                      const weight = Math.pow(1.0 - (distToHole / holeRadiusWorld), 2.5);
                      if (weight > maxWeight) {
                        maxWeight = weight;
                      }
                    }
                  }
                }

                if (maxWeight > 0.01) {
                  // Morph vertex inward to create a deep hole
                  const k_shrink = 1.0 - Math.min(0.9, maxWeight); 
                  posAttr.setXYZ(k, bx * k_shrink, by * k_shrink, bz * k_shrink);

                  if (colorAttr) {
                    // Stain it deep red inside the hole
                    const stainK = Math.min(1.0, maxWeight * 1.5);
                    const r = THREE.MathUtils.lerp(baseCol.r, 0.4, stainK);
                    const g = THREE.MathUtils.lerp(baseCol.g, 0.0, stainK);
                    const b = THREE.MathUtils.lerp(baseCol.b, 0.0, stainK);
                    colorAttr.setXYZ(k, r, g, b);
                  }
                } else {
                  posAttr.setXYZ(k, bx, by, bz);
                  if (colorAttr) {
                    colorAttr.setXYZ(k, baseCol.r, baseCol.g, baseCol.b);
                  }
                }
              }

              posAttr.needsUpdate = true;
              if (colorAttr) colorAttr.needsUpdate = true;
              sphere.geometry.computeVertexNormals();
              sphere.userData.needsDeform = false;
            }
          } else {
            sphere.visible = false;
          }
        }
      }

      // 1. TENDONS (Visible strictly in X-Ray Mode 1: "Sin Piel" to show body blocks and tendons)
      if (ragdoll.xrayMode === 1) {
        if (!ragdoll.tendonLines) {
          const maxSegments = 160;
          const posArray = new Float32Array(maxSegments * 2 * 3);
          const colorArray = new Float32Array(maxSegments * 2 * 3);
          
          for (let i = 0; i < maxSegments * 2; i++) {
            // Ivory white tendon fiber color
            colorArray[i * 3] = 0.95;
            colorArray[i * 3 + 1] = 0.92;
            colorArray[i * 3 + 2] = 0.88;
          }
          
          const tendonGeom = new THREE.BufferGeometry();
          tendonGeom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
          tendonGeom.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
          
          const tendonMat = new THREE.LineBasicMaterial({
            vertexColors: true,
            linewidth: 3,
            depthTest: true,
            transparent: false,
          });
          const tendonLines = new THREE.LineSegments(tendonGeom, tendonMat);
          tendonLines.name = 'RagdollTendonLines';
          tendonLines.frustumCulled = false;
          ragdoll.tendonLines = tendonLines;
          this.scene.add(tendonLines);
        }

        const tendonLines = ragdoll.tendonLines;
        tendonLines.visible = true;
        const posAttr = tendonLines.geometry.attributes.position as THREE.BufferAttribute;
        const posArray = posAttr.array as Float32Array;
        let vIdx = 0;

        for (const c of ragdoll.constraints) {
          if (c.broken || !c.p1 || !c.p2) continue;
          if (c.p1.dismembered || c.p2.dismembered) continue;
          if (vIdx + 6 > posArray.length) break;

          posArray[vIdx++] = c.p1.x;
          posArray[vIdx++] = c.p1.y;
          posArray[vIdx++] = c.p1.z;

          posArray[vIdx++] = c.p2.x;
          posArray[vIdx++] = c.p2.y;
          posArray[vIdx++] = c.p2.z;
        }

        while (vIdx < posArray.length) {
          posArray[vIdx++] = 0;
        }
        posAttr.needsUpdate = true;
      } else {
        if (ragdoll.tendonLines) {
          ragdoll.tendonLines.visible = false;
        }
      }

      // 2. HEARING SPHERES ON THE EARS (Visible when showSoundWaves is active)
      const cabeza = ragdoll.particles.find((p) => p.name === 'cabeza');
      if (cabeza) {
        // Ensure old single head sphere is hidden
        const oldHeadSphere = cabeza.voxelsGroup?.getObjectByName('HearingSphereMesh');
        if (oldHeadSphere) {
          oldHeadSphere.visible = false;
        }

        const earsVisible = !!(this.showSoundWaves && !soundEngine.getMuted() && ragdoll.isAlive);
        if (cabeza.hearingSphereLeftMesh) {
          cabeza.hearingSphereLeftMesh.visible = earsVisible;
        }
        if (cabeza.hearingSphereRightMesh) {
          cabeza.hearingSphereRightMesh.visible = earsVisible;
        }
      }

      // Ensure all individual limbs and their visual layers are visible and updated
      for (const p of ragdoll.particles) {
        const activeCount = p.voxelBlocks ? p.voxelBlocks.filter((b) => b.active).length : 1;
        const hasNoBlocks = p.voxelBlocks ? activeCount === 0 : false;
        const wMult = p.widthMultiplier !== undefined ? p.widthMultiplier : 1.0;

        if (hasNoBlocks) {
          if (p.voxelsGroup) p.voxelsGroup.visible = false;
          if (p.contourMesh) p.contourMesh.visible = false;
          if (p.mesh) p.mesh.visible = false;
          if ((p as any).jointSphere) (p as any).jointSphere.visible = false;
          continue;
        }

        if (p.voxelsGroup) {
          p.voxelsGroup.visible = true;
          // Scale voxels along width (X & Z), using uniform 3D scaling for compact extremities (hands, feet, fingers, toes, wrists, ankles) so they do not squish or deform
          const isCompactExtremity = p.name.startsWith('mano') || p.name.startsWith('dedo') || p.name.startsWith('pie') || p.name.startsWith('tobillo') || p.name.startsWith('muneca');
          const scaleY = isCompactExtremity ? wMult : 1.0;
          p.voxelsGroup.scale.set(wMult, scaleY, wMult);
          if (p.contourMesh) {
            p.contourMesh.scale.set(wMult, scaleY, wMult);
          }
          const xray = ragdoll.xrayMode || 0;
          p.voxelsGroup.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              const name = child.name || '';
              const parentName = child.parent?.name || '';

              const isAllowedOrgan = (mesh: THREE.Object3D) => {
                let curr: THREE.Object3D | null = mesh;
                while (curr) {
                  const currName = curr.name || '';
                  if (
                    currName.includes('shaft') ||
                    currName.includes('glans') ||
                    currName.includes('testicle') ||
                    currName.includes('labia') ||
                    currName.includes('clitoris') ||
                    currName.includes('minora') ||
                    currName.includes('entrance') ||
                    currName.includes('canal') ||
                    currName.includes('ovary') ||
                    currName.includes('ovario') ||
                    currName.includes('uterus') ||
                    currName.includes('utero') ||
                    currName.includes('prostate') ||
                    currName.includes('prostata') ||
                    currName.includes('mouth_tube') ||
                    currName.includes('mouth_pseudo_tube') ||
                    currName.includes('breast_internal_tube') ||
                    currName.includes('rectal_tube') ||
                    currName.includes('intestino') ||
                    currName.includes('esophagus') ||
                    currName.includes('esofago') ||
                    currName.includes('stomach') ||
                    currName.includes('estomago') ||
                    currName.includes('liver') ||
                    currName.includes('higado') ||
                    currName.includes('gallbladder') ||
                    currName.includes('vesicula') ||
                    currName.includes('colon') ||
                    currName.includes('small_int') ||
                    currName.includes('pubic_hair') ||
                    currName.includes('boca') ||
                    currName.includes('tetilla') ||
                    currName.includes('nipple') ||
                    currName.includes('anus') ||
                    currName.includes('ano') ||
                    currName.includes('urethra')
                  ) {
                    return true;
                  }
                  curr = curr.parent;
                }
                return false;
              };

              const b = p.voxelBlocks?.find((block) => block.mesh === child);

              // X-Ray Mode 1 ("Sin Piel"): Strictly show ONLY the body voxel blocks (and tendons).
              // Hide everything else (genitals, breasts, glutes, hair, beard, face, clothes, hearing spheres, organ tubes, pseudo layers).
              if (xray === 1) {
                child.visible = !!(b && b.active);
                return;
              }

              const isAnatomyFeature = (
                name.includes('pecho_') ||
                name.includes('tetilla_') ||
                name.includes('gluteo_') ||
                name.includes('shaft_') ||
                name.includes('glans_') ||
                name.includes('testicle_') ||
                name.includes('labia_') ||
                name.includes('labio_') ||
                name.includes('entrance_') ||
                name.includes('uterus_') ||
                name.includes('ovary_') ||
                name.includes('prostate_') ||
                name.includes('anus_') ||
                name.includes('ano_') ||
                name.includes('sphincter_') ||
                parentName === 'BustExtraGroup' ||
                parentName === 'GluteExtraGroup' ||
                parentName === 'GenitalExtraGroup' ||
                parentName === 'AnusExtraGroup'
              );

              // In cylinder mode, transform breasts, glutes, genitals, and anus to stylized cylinder geometries
              if (isCylinderMode && isAnatomyFeature && !name.includes('pseudo') && !name.includes('Contour')) {
                if (child.userData.currentGeomType !== 'cylinder') {
                  if (!child.userData.originalGeometry) {
                    child.userData.originalGeometry = child.geometry;
                    child.userData.originalRotation = child.rotation.clone();
                    child.userData.originalPosition = child.position.clone();
                  }

                  child.geometry.computeBoundingBox();
                  const bbox = child.geometry.boundingBox;
                  if (bbox) {
                    const sizeX = bbox.max.x - bbox.min.x;
                    const sizeY = bbox.max.y - bbox.min.y;
                    const sizeZ = bbox.max.z - bbox.min.z;

                    let length = sizeY;
                    let radius = Math.max(sizeX, sizeZ) * 0.5;
                    let geom: THREE.BufferGeometry;

                    const isPechoOrGluteo = name.includes('pecho_') || name.includes('gluteo_') || name.includes('pecho') || name.includes('gluteo') || name.includes('tetilla') || parentName === 'BustExtraGroup' || parentName === 'GluteExtraGroup';
                    const isGenitalPart = name.includes('shaft') || name.includes('glans') || name.includes('testicle') || name.includes('labia') || name.includes('clitoris') || name.includes('entrance') || name.includes('female_') || name.includes('male_') || parentName === 'GenitalExtraGroup' || parentName === 'ErectionPivotGroup';

                    if (isGenitalPart || isPechoOrGluteo) {
                      // Preserve handcrafted anatomical meshes (spherical breasts, pink nipples, spherical glutes, genitals)
                      return;
                    } else {
                      // Fallback: only cylinder if elongated, else sphere
                      length = sizeY;
                      radius = Math.max(sizeX, sizeZ) * 0.5;
                      const isElongated = length > radius * 1.35;
                      if (isElongated) {
                        geom = new THREE.CylinderGeometry(radius, radius, length, 12, 2, false);
                      } else {
                        geom = new THREE.SphereGeometry(radius, 12, 12);
                      }
                    }

                    child.geometry = geom;
                    child.userData.currentGeomType = 'cylinder';
                  }
                }
              } else {
                // Keep original beautiful spherical/curved geometry for breasts, glutes, genitals, and anus
                // to ensure they look spherical and remain perfectly united with the body when not in cylinder mode!
                if (child.userData.originalGeometry && child.userData.currentGeomType === 'cylinder') {
                  child.geometry = child.userData.originalGeometry;
                  child.rotation.copy(child.userData.originalRotation);
                  child.position.copy(child.userData.originalPosition);
                  child.userData.currentGeomType = undefined;
                  // Clear old voxel indices cache to force clean rebuild back for original shape (prevents black texture / crash!)
                  child.userData.vertexNearestVoxelIndices = undefined;
                }
              }

              // Glutes, Bust & Extra Pseudo meshes vs Block meshes in X-Ray mode
              if (name.includes('pseudo') || name.includes('Contour') || name.includes('Pseudo')) {
                if (xray === 1 || xray === 2 || xray === 4) {
                  child.visible = false;
                } else if (xray === 3) {
                  child.visible = true;
                } else if (isCylinderMode && isAnatomyFeature) {
                  // In cylinder mode, hide spherical pseudo contour for breasts, glutes, genitals, and anus!
                  child.visible = false;
                } else {
                  // ONLY visible in pseudo3d mode - never in standard cylinder limb envelopes!
                  child.visible = ragdoll.contourJointStyle === 'pseudo3d' && ragdoll.contourLayerEnabled;
                }
              } else if (name.includes('HearingSphere')) {
                const earsVisible = !!(this.showSoundWaves && !soundEngine.getMuted() && ragdoll.isAlive);
                child.visible = earsVisible;
              } else if (
                name.includes('Pubic') ||
                name.includes('pubic') ||
                name.includes('hair_cyl') ||
                name.includes('Strand') ||
                parentName.includes('Pubic') ||
                parentName.includes('Strand')
              ) {
                child.visible = Boolean(ragdoll.pubicHairEnabled !== false);
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
                // Pechos, glúteos, genitales, y ano are visible in cylinder mode and across X-Ray layers
                if (xray === 0) {
                  const isPseudo3D = ragdoll.contourJointStyle === 'pseudo3d' && ragdoll.contourLayerEnabled;
                  if (name.includes('pseudo') || name.includes('Pseudo')) {
                    child.visible = isPseudo3D;
                  } else {
                    child.visible = !isPseudo3D;
                  }
                } else if (xray === 1) {
                  child.visible = true;
                } else if (xray === 2) {
                  child.visible = name.includes('prostate') || name.includes('uterus') || isAllowedOrgan(child);
                } else if (xray === 4) {
                  child.visible = isAllowedOrgan(child);
                } else {
                  child.visible = true;
                }
              } else if (isCylinderMode && xray === 0) {
                // In cylinder mode, cylinders and joint spheres envelop long limbs and feet. Hide foot voxel cubes!
                const isFootPart = p.name.startsWith('pie') || p.name.startsWith('dedo_pie') || p.name.startsWith('tobillo');
                const isHandPart = p.name.startsWith('mano') || (p.name.startsWith('dedo') && !p.name.startsWith('dedo_pie')) || p.name.startsWith('muneca');
                child.visible = isHandPart && !isFootPart;
              } else if (ragdoll.contourJointStyle === 'pseudo3d' && ragdoll.contourLayerEnabled && xray === 0) {
                // In pseudo3d mode, contour meshes envelop limbs and feet. Hide foot voxel cubes!
                const isFootPart = p.name.startsWith('pie') || p.name.startsWith('dedo_pie') || p.name.startsWith('tobillo');
                const isHandPart = p.name.startsWith('mano') || (p.name.startsWith('dedo') && !p.name.startsWith('dedo_pie')) || p.name.startsWith('muneca');
                child.visible = isHandPart && !isFootPart;
              } else {
                if (xray === 4) {
                  // Órganos: ONLY smooth organ meshes and tubes, hide cubical organ voxel blocks!
                  const isOrgan = (b && (b.isGenitalBlock || b.isAnusBlock || b.id.includes('nipple') || b.id.includes('tetilla') || b.id.includes('anus') || b.id.includes('ano'))) || isAllowedOrgan(child);
                  child.visible = !!isOrgan && !(b && b.isOrganBlock);
                } else if (xray === 2) {
                  // Solo Esqueleto: ONLY bone blocks, prostate, uterus, and allowed organs!
                  const isBoneOrOrgan = (b && (b.isBoneBlock || b.isOrganBlock || b.isGenitalBlock || b.isAnusBlock || b.id.includes('nipple') || b.id.includes('tetilla') || b.id.includes('anus') || b.id.includes('ano'))) || isAllowedOrgan(child);
                  child.visible = !!isBoneOrOrgan;
                } else {
                  child.visible = true;
                }
              }
            }
          });
        }
        if (p.contourMesh) {
          const xray = ragdoll.xrayMode || 0;
          if (xray === 1 || xray === 2 || xray === 4) {
            p.contourMesh.visible = false;
          } else if (xray === 3) {
            p.contourMesh.visible = true;
          } else {
            // Pseudo3D spheres are ONLY visible in 'pseudo3d' mode - strictly hidden in 'cylinder' mode!
            const isVisible = ragdoll.contourJointStyle === 'pseudo3d' && ragdoll.contourLayerEnabled;
            p.contourMesh.visible = isVisible;
            p.contourMesh.scale.set(wMult, 1.0, wMult);
          }
        }
      }

      // Clear the temporary cylinder deformation flags once they have been updated this frame
      for (const p of ragdoll.particles) {
        p.needsCylinderDeform = false;
      }
    }
  }

  private updateAcousticVelocityNoise(dt: number) {
    const now = performance.now();

    // 1. Ragdoll & Limb High-Speed Locomotion / Movement Acoustics
    for (const ragdoll of this.ragdolls) {
      const scale = ragdoll.scale;
      let maxSpeed = 0;
      const fastPos = new THREE.Vector3();

      if (ragdoll.isAlive) {
        const vel = ragdoll.charVel;
        maxSpeed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
        fastPos.copy(ragdoll.charPos);
        fastPos.y += 0.9 * scale;
      } else {
        for (const p of ragdoll.particles) {
          const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz);
          if (spd > maxSpeed) {
            maxSpeed = spd;
            fastPos.set(p.x, p.y, p.z);
          }
        }
      }

      // Fundamental Law: Louder sound & wider sonic waves for greater size and higher speed
      const acousticProduct = maxSpeed * (scale ** 1.3);

      if (acousticProduct > 3.8) {
        soundEngine.playVelocityWhoosh(maxSpeed, scale);

        if (this.showSoundWaves && now - this.lastSoundWaveSpawnTime > 0.08) {
          this.lastSoundWaveSpawnTime = now;
          const waveColor =
            acousticProduct > 8.0
              ? 0xf43f5e
              : acousticProduct > 5.5
              ? 0xf59e0b
              : 0x38bdf8;
          this.spawnSoundWave(fastPos, maxSpeed, scale, waveColor);
        }
      }
    }

    // 2. High-Speed Bullets & Projectiles Sonic Boom Rings
    if (this.showSoundWaves && this.bullets.length > 0 && Math.random() < 0.4) {
      for (const b of this.bullets) {
        this.spawnSoundWave(b.pos, b.speed, 0.4, 0xfacc15);
      }
    }

    // 3. Update Slime & Jelly Block Spring Physics
    this.updateJellyBlocks(dt);

    // 4. Update 3x3 ElectroCubes (Electronegativity, Viscosity & Hardness)
    this.updateElectroCubes(dt);

    // 5. Proximity Voxel Block Inspector (HUD)
    this.updateBlockInspector(dt);
  }

  private updateJellyBlocks(dt: number) {
    for (const vb of this.voxelBlocks) {
      if (!vb.isJelly) continue;

      const stiffness = vb.stiffness ?? 180;
      const damping = vb.damping ?? 8;

      if (vb.wobbleScale && vb.wobbleVel) {
        // Spring return towards default scale (1.0, 1.0, 1.0)
        const fx = (1.0 - vb.wobbleScale.x) * stiffness - vb.wobbleVel.x * damping;
        const fy = (1.0 - vb.wobbleScale.y) * stiffness - vb.wobbleVel.y * damping;
        const fz = (1.0 - vb.wobbleScale.z) * stiffness - vb.wobbleVel.z * damping;

        vb.wobbleVel.x += fx * dt;
        vb.wobbleVel.y += fy * dt;
        vb.wobbleVel.z += fz * dt;

        vb.wobbleScale.x += vb.wobbleVel.x * dt;
        vb.wobbleScale.y += vb.wobbleVel.y * dt;
        vb.wobbleScale.z += vb.wobbleVel.z * dt;

        vb.wobbleScale.x = THREE.MathUtils.clamp(vb.wobbleScale.x, 0.5, 1.8);
        vb.wobbleScale.y = THREE.MathUtils.clamp(vb.wobbleScale.y, 0.5, 1.8);
        vb.wobbleScale.z = THREE.MathUtils.clamp(vb.wobbleScale.z, 0.5, 1.8);

        if (vb.mesh) {
          vb.mesh.scale.copy(vb.wobbleScale);
        }
      }
    }
  }

  public grabNPCLimb(targetRagdollId: string, targetParticleId: string, useLeftArm: boolean, useRightArm: boolean) {
    const player = this.ragdolls[0];
    if (!player) return;
    
    const targetRagdoll = this.ragdolls.find(r => r.id === targetRagdollId);
    if (!targetRagdoll) return;
    
    const targetParticle = targetRagdoll.particles.find(p => p.id === targetParticleId);
    if (!targetParticle) return;
    
    if (useLeftArm) {
       const leftHand = player.particles.find(p => p.name === 'mano_izq');
       if (leftHand) {
          // Remove old constraint if any
          player.constraints = player.constraints.filter(c => c.name !== 'player_grab_left');
          const offsetAmount = 0.14;
          player.constraints.push({
             id: 'grab_left_' + Math.random(),
             p1: leftHand,
             p2: targetParticle,
             length: 0.12 + Math.random() * 0.16,
             stiffness: 0.9,
             breakForce: 10000,
             broken: false,
             name: 'player_grab_left',
             grabOffset: {
                x: (Math.random() - 0.5) * offsetAmount,
                y: (Math.random() - 0.5) * offsetAmount,
                z: (Math.random() - 0.5) * offsetAmount
             }
          } as any);
       }
    }
    
    if (useRightArm) {
       const rightHand = player.particles.find(p => p.name === 'mano_der');
       if (rightHand) {
          player.constraints = player.constraints.filter(c => c.name !== 'player_grab_right');
          const offsetAmount = 0.14;
          player.constraints.push({
             id: 'grab_right_' + Math.random(),
             p1: rightHand,
             p2: targetParticle,
             length: 0.12 + Math.random() * 0.16,
             stiffness: 0.9,
             breakForce: 10000,
             broken: false,
             name: 'player_grab_right',
             grabOffset: {
                x: (Math.random() - 0.5) * offsetAmount,
                y: (Math.random() - 0.5) * offsetAmount,
                z: (Math.random() - 0.5) * offsetAmount
             }
          } as any);
       }
    }
  }

  public releaseNPCGrab() {
     const player = this.ragdolls[0];
     if (!player) return;
     player.constraints = player.constraints.filter(c => c.name !== 'player_grab_left' && c.name !== 'player_grab_right');
  }

  public holdParticle(ragdollId: string, particleId: string, delta: number = 0.0) {
    if (delta !== 0) {
      this.inflateLimbWidth(ragdollId, particleId, delta, 2);
    }
  }

  public applySingleLimbWidth(ragdoll: any, p: Particle3D, value: number) {
    p.widthMultiplier = value;
    p.needsCylinderDeform = true;

    const n = p.name.toLowerCase();
    const isCompactExtremity = (
      n.startsWith('cabeza') ||
      n.startsWith('cuello') ||
      n.startsWith('mano') ||
      n.startsWith('dedo') ||
      n.startsWith('pie') ||
      n.startsWith('tobillo') ||
      n.startsWith('muneca') ||
      n.startsWith('codo') ||
      n.startsWith('rodilla') ||
      n.startsWith('hombro') ||
      n.startsWith('gluteo') ||
      n.startsWith('busto')
    );
    const scaleX = value;
    const scaleY = isCompactExtremity ? value : 1.0;
    const scaleZ = value;

    if (p.voxelsGroup) {
      p.voxelsGroup.scale.set(scaleX, scaleY, scaleZ);
      p.voxelsGroup.visible = true;
    }
    if (p.contourMesh) {
      p.contourMesh.scale.set(scaleX, scaleY, scaleZ);
    }
    if (p.mesh) {
      p.mesh.scale.set(scaleX, scaleY, scaleZ);
    }
    if ((p as any).jointSphere) {
      (p as any).jointSphere.scale.set(value, value, value);
    }

    if (ragdoll.jointBridges) {
      for (const bridge of ragdoll.jointBridges) {
        const c = bridge.userData.constraint;
        if (c && (c.p1 === p || c.p2 === p)) {
          bridge.userData.needsDeform = true;
          bridge.userData.lastR1 = undefined;
          bridge.userData.lastR2 = undefined;
        }
      }
    }
    if (ragdoll.jointSpheres) {
      for (const sphere of ragdoll.jointSpheres) {
        if (sphere.userData.particle === p || sphere.userData.targetLimbName === p.name) {
          sphere.userData.needsDeform = true;
        }
      }
    }
  }

  public inflateLimbWidth(
    ragdollId: string,
    particleId: string,
    delta: number,
    propagationDepth: number = 2
  ) {
    for (const ragdoll of this.ragdolls) {
      if (ragdoll.id !== ragdollId) continue;
      const targetParticle = ragdoll.particles.find((p) => p.id === particleId || p.name === particleId);
      if (!targetParticle) continue;

      const distances = new Map<string, number>();
      distances.set(targetParticle.id, 0);

      const queue: Array<{ p: Particle3D; dist: number }> = [{ p: targetParticle, dist: 0 }];

      while (queue.length > 0) {
        const { p: current, dist } = queue.shift()!;
        if (dist >= propagationDepth) continue;

        for (const c of ragdoll.constraints) {
          if (c.broken || c.name.includes('ancho') || c.name.includes('stabilizer')) continue;
          let neighbor: Particle3D | null = null;
          if (c.p1.id === current.id) neighbor = c.p2;
          else if (c.p2.id === current.id) neighbor = c.p1;

          if (neighbor && !neighbor.dismembered) {
            if (!distances.has(neighbor.id) || distances.get(neighbor.id)! > dist + 1) {
              distances.set(neighbor.id, dist + 1);
              queue.push({ p: neighbor, dist: dist + 1 });
            }
          }
        }
      }

      const falloffs = [1.0, 0.55, 0.25, 0.10];

      for (const [pId, dist] of distances.entries()) {
        const p = ragdoll.particles.find((part) => part.id === pId);
        if (!p) continue;
        const factor = falloffs[Math.min(dist, falloffs.length - 1)];
        const curMult = p.widthMultiplier !== undefined ? p.widthMultiplier : 1.0;
        const newMult = Math.max(0.20, Math.min(4.50, curMult + delta * factor));
        this.applySingleLimbWidth(ragdoll, p, newMult);
      }
    }
  }

  public resetLimbWidth(ragdollId: string, particleId?: string) {
    for (const ragdoll of this.ragdolls) {
      if (ragdoll.id !== ragdollId) continue;
      for (const p of ragdoll.particles) {
        if (!particleId || p.id === particleId || p.name === particleId) {
          this.applySingleLimbWidth(ragdoll, p, 1.0);
        }
      }
    }
  }

  public getLimbWidthMultiplier(ragdollId: string, particleId: string): number {
    for (const ragdoll of this.ragdolls) {
      if (ragdoll.id !== ragdollId) continue;
      const p = ragdoll.particles.find((part) => part.id === particleId || part.name === particleId);
      if (p) return p.widthMultiplier !== undefined ? p.widthMultiplier : 1.0;
    }
    return 1.0;
  }

  public setLimbWidthMultiplierAdvanced(ragdollId: string, particleId: string, value: number, propagate: boolean = false) {
    for (const ragdoll of this.ragdolls) {
      if (ragdoll.id !== ragdollId) continue;
      const targetP = ragdoll.particles.find((part) => part.id === particleId || part.name === particleId);
      if (!targetP) continue;

      if (!propagate) {
        this.applySingleLimbWidth(ragdoll, targetP, value);
        continue;
      }

      const distances = new Map<string, number>();
      distances.set(targetP.id, 0);

      const queue: Array<{ p: Particle3D; dist: number }> = [{ p: targetP, dist: 0 }];

      while (queue.length > 0) {
        const { p: current, dist } = queue.shift()!;
        if (dist >= 3) continue;

        for (const c of ragdoll.constraints) {
          if (c.broken || c.name.includes('ancho') || c.name.includes('stabilizer')) continue;
          let neighbor: Particle3D | null = null;
          if (c.p1.id === current.id) neighbor = c.p2;
          else if (c.p2.id === current.id) neighbor = c.p1;

          if (neighbor && !neighbor.dismembered) {
            if (!distances.has(neighbor.id) || distances.get(neighbor.id)! > dist + 1) {
              distances.set(neighbor.id, dist + 1);
              queue.push({ p: neighbor, dist: dist + 1 });
            }
          }
        }
      }

      const falloffs = [1.0, 0.55, 0.25, 0.10];

      for (const [pId, dist] of distances.entries()) {
        const p = ragdoll.particles.find((part) => part.id === pId);
        if (!p) continue;
        const factor = falloffs[Math.min(dist, falloffs.length - 1)];
        const targetMultiplier = 1.0 + (value - 1.0) * factor;
        const newMult = Math.max(0.20, Math.min(4.50, targetMultiplier));
        this.applySingleLimbWidth(ragdoll, p, newMult);
      }
    }
  }

  public setDragTarget(ragdollId: string, particleId: string, targetPos: THREE.Vector3) {
    for (const r of this.ragdolls) {
      if (r.id !== ragdollId) {
        for (const p of r.particles) p.dragTargetPos = undefined;
        continue;
      }
      for (const p of r.particles) {
        if (p.id === particleId || p.name === particleId) {
          let clampedTarget = targetPos.clone();
          const isArmL = ['hombro_izq', 'brazo_izq', 'codo_izq', 'antebrazo_izq', 'muneca_izq', 'mano_izq'].some(n => p.name.includes(n));
          const isArmR = ['hombro_der', 'brazo_der', 'codo_der', 'antebrazo_der', 'muneca_der', 'mano_der'].some(n => p.name.includes(n));
          const isLegL = ['muslo_izq', 'rodilla_izq', 'antepierna_izq', 'tobillo_izq', 'pie_izq'].some(n => p.name.includes(n));
          const isLegR = ['muslo_der', 'rodilla_der', 'antepierna_der', 'tobillo_der', 'pie_der'].some(n => p.name.includes(n));

          const scale = r.scale || 1.0;
          let rootName = '';
          let maxReach = 0.85 * scale;
          if (isArmL) {
            rootName = 'hombro_izq';
            maxReach = (p.name.includes('mano') ? 0.78 : (p.name.includes('codo') ? 0.40 : 0.60)) * scale;
          } else if (isArmR) {
            rootName = 'hombro_der';
            maxReach = (p.name.includes('mano') ? 0.78 : (p.name.includes('codo') ? 0.40 : 0.60)) * scale;
          } else if (isLegL) {
            rootName = 'muslo_izq';
            maxReach = (p.name.includes('pie') ? 0.88 : (p.name.includes('rodilla') ? 0.44 : 0.70)) * scale;
          } else if (isLegR) {
            rootName = 'muslo_der';
            maxReach = (p.name.includes('pie') ? 0.88 : (p.name.includes('rodilla') ? 0.44 : 0.70)) * scale;
          }

          if (rootName) {
            const rootP = r.particles.find((part) => part.name === rootName);
            if (rootP && rootP !== p) {
              const rootPos = new THREE.Vector3(rootP.x, rootP.y, rootP.z);
              const dir = targetPos.clone().sub(rootPos);
              const dist = dir.length();
              if (dist > maxReach && dist > 0.001) {
                clampedTarget = rootPos.clone().add(dir.normalize().multiplyScalar(maxReach));
              }
            }
          }
          p.dragTargetPos = clampedTarget;

          if (!r.customLimbOffsets) r.customLimbOffsets = {};
          
          const getLimbParticles = (name: string): string[] => {
            const isLeft = name.includes('_izq');
            const isRight = name.includes('_der');
            const side = isLeft ? '_izq' : (isRight ? '_der' : '');
            if (!side) return [name];

            const isArm = name.includes('brazo') || name.includes('codo') || name.includes('antebrazo') || name.includes('muneca') || name.includes('mano') || name.includes('dedo_') || name.includes('hombro');
            const isLeg = name.includes('muslo') || name.includes('rodilla') || name.includes('antepierna') || name.includes('tobillo') || name.includes('pie') || name.includes('talon') || name.includes('medio');

            if (isArm) {
              return [
                `hombro${side}`, `brazo${side}`, `codo${side}`, `antebrazo${side}`, `muneca${side}`, `mano${side}`,
                `dedo_pulgar${side}`, `dedo_pulgar${side}_seg2`, `dedo_pulgar${side}_seg3`,
                `dedo_indice${side}`, `dedo_indice${side}_seg2`, `dedo_indice${side}_seg3`,
                `dedo_medio${side}`, `dedo_medio${side}_seg2`, `dedo_medio${side}_seg3`,
                `dedo_anular${side}`, `dedo_anular${side}_seg2`, `dedo_anular${side}_seg3`,
                `dedo_menique${side}`, `dedo_menique${side}_seg2`, `dedo_menique${side}_seg3`
              ];
            }
            if (isLeg) {
              return [
                `muslo${side}`, `rodilla${side}`, `antepierna${side}`, `tobillo${side}`,
                `pie${side}_talon`, `pie${side}_medio`, `pie${side}`,
                `dedo_pie_pulgar${side}`, `dedo_pie_indice${side}`, `dedo_pie_medio${side}`, `dedo_pie_anular${side}`, `dedo_pie_menique${side}`
              ];
            }
            return [name];
          };

          const limbNames = getLimbParticles(p.name);
          for (const pName of limbNames) {
            const part = r.particles.find(pt => pt.name === pName);
            if (!part || part.dismembered) continue;
            const isUpperBody = pName.includes('brazo') || pName.includes('codo') || pName.includes('antebrazo') || pName.includes('muneca') || pName.includes('mano') || pName.includes('dedo') || pName.includes('hombro') || pName.includes('cuello') || pName.includes('cabeza');
            const refP = isUpperBody
              ? (r.particles.find(pt => pt.name === 'pechobase') || r.particles[0])
              : (r.particles.find(pt => pt.name === 'pelvis') || r.particles[0]);

            if (refP) {
              const targetX_pos = (pName === p.name) ? clampedTarget.x : part.x;
              const targetY_pos = (pName === p.name) ? clampedTarget.y : part.y;
              const targetZ_pos = (pName === p.name) ? clampedTarget.z : part.z;

              const dx = targetX_pos - refP.x;
              const dy = targetY_pos - refP.y;
              const dz = targetZ_pos - refP.z;
              const cosA = Math.cos(-r.facingAngle);
              const sinA = Math.sin(-r.facingAngle);
              const localX = dx * cosA - dz * sinA;
              const localY = dy;
              const localZ = dx * sinA + dz * cosA;
              r.customLimbOffsets[pName] = new THREE.Vector3(localX, localY, localZ);
            }
          }
        } else {
          p.dragTargetPos = undefined;
        }
      }
    }
  }

  public clearDragTarget(ragdollId?: string, particleId?: string) {
    for (const r of this.ragdolls) {
      if (ragdollId && r.id !== ragdollId) continue;
      for (const p of r.particles) {
        if (particleId && p.id !== particleId && p.name !== particleId) continue;
        p.dragTargetPos = undefined;
      }
    }
  }

  public spawnCubicPool(x: number, y: number, z: number) {
    const size = 0.8;
    const poolWidth = 6;
    const poolDepth = 6;
    const poolHeight = 2;
    
    // Walls
    for (let h = 0; h < poolHeight; h++) {
      for (let i = -poolWidth/2; i <= poolWidth/2; i++) {
        this.spawnVoxelBlock(x + i * size, y + h * size + size/2, z - (poolDepth/2) * size, 'brick', size);
        this.spawnVoxelBlock(x + i * size, y + h * size + size/2, z + (poolDepth/2) * size, 'brick', size);
      }
      for (let j = -poolDepth/2 + 1; j < poolDepth/2; j++) {
        this.spawnVoxelBlock(x - (poolWidth/2) * size, y + h * size + size/2, z + j * size, 'brick', size);
        this.spawnVoxelBlock(x + (poolWidth/2) * size, y + h * size + size/2, z + j * size, 'brick', size);
      }
    }
    
    // Floor
    for (let i = -poolWidth/2; i <= poolWidth/2; i++) {
      for (let j = -poolDepth/2; j <= poolDepth/2; j++) {
        this.spawnVoxelBlock(x + i * size, y - size/2, z + j * size, 'stone', size);
      }
    }

    // Water
    for (let h = 0; h < poolHeight - 1; h++) {
      for (let i = -poolWidth/2 + 1; i < poolWidth/2; i++) {
        for (let j = -poolDepth/2 + 1; j < poolDepth/2; j++) {
           this.spawnVoxelBlock(x + i * size, y + h * size + size/2, z + j * size, 'water', size);
        }
      }
    }
  }

  public clearAll() {
    for (const r of this.ragdolls) {
      this.scene.remove(r.groupMesh);
      if (r.marchingCubesMesh) {
        this.scene.remove(r.marchingCubesMesh);
        if (r.marchingCubesMesh.geometry) r.marchingCubesMesh.geometry.dispose();
        if (r.marchingCubesMesh.material) r.marchingCubesMesh.material.dispose();
        r.marchingCubesMesh = undefined;
      }
    }
    for (const bp of this.bloodParticles) {
      if (bp.mesh) this.scene.remove(bp.mesh);
    }
    for (const bd of this.bloodDecals) {
      if (bd.mesh) this.scene.remove(bd.mesh);
    }
    for (const vb of this.voxelBlocks) {
      this.scene.remove(vb.mesh);
    }
    for (const p of this.weaponPickups) {
      this.scene.remove(p.mesh);
    }
    for (const b of this.bullets) {
      if (b.tracerMesh) this.scene.remove(b.tracerMesh);
    }
    for (const d of this.debrisParticles) {
      this.scene.remove(d.mesh);
    }
    for (const lb of this.liquidBodies) {
      this.scene.remove(lb.groupMesh);
    }
    for (const p of this.pools) {
      this.scene.remove(p);
    }
    for (const d of this.doors) {
      this.scene.remove(d.doorGroup);
    }
    for (const bed of this.beds) {
      this.scene.remove(bed.groupMesh);
    }
    for (const plat of this.movingPlatforms) {
      this.scene.remove(plat.mesh);
    }
    RealisticFluidEngine.getInstance().clear();
    CannonRagdollEngine.getInstance().reset();
    this.ragdolls = [];
    this.bloodParticles = [];
    this.bloodDecals = [];
    this.voxelBlocks = [];
    this.weaponPickups = [];
    this.soldiers = [];
    this.bullets = [];
    for (const dp of this.dynamicProps) {
      if (dp.mesh) {
        this.scene.remove(dp.mesh);
        dp.mesh.geometry.dispose();
      }
    }
    this.dynamicProps = [];
    this.debrisParticles = [];
    this.liquidBodies = [];
    this.pools = [];
    this.doors = [];
    this.beds = [];
    this.movingPlatforms = [];
    this.bulletHoleManager.clearAll();
    if (this.activePenetratorRod) {
      this.activePenetratorRod.cleanUp();
      this.activePenetratorRod = null;
    }
  }

  public spawnPaloRod() {
    const ragdoll = this.ragdolls[0];
    if (!ragdoll) return;

    // Toggle off existing active rod if there is one on the same ragdoll
    if (this.activePenetratorRod && this.activePenetratorRod.ragdollId === ragdoll.id) {
      this.activePenetratorRod.cleanUp();
      this.activePenetratorRod = null;
      soundEngine.playImpact(0.4);
      return;
    }

    // Clean up if there is any other rod
    if (this.activePenetratorRod) {
      this.activePenetratorRod.cleanUp();
      this.activePenetratorRod = null;
    }

    // Must have male or female genital type active to receive the rod
    if (ragdoll.genitalType === 'none') {
      // Force set to female genital type if none is active, so the user sees it immediately!
      this.setGenitalType('female', ragdoll.id);
    }

    const genitalType = ragdoll.genitalType; // 'male' or 'female'

    const pelvisP = ragdoll.particles.find((p) => p.name === 'pelvis');
    if (!pelvisP || !pelvisP.voxelsGroup) return;

    const genitalGroup = pelvisP.voxelsGroup.getObjectByName('GenitalExtraGroup') as THREE.Group | undefined;
    if (!genitalGroup) return;

    // Create the visual Palo Rod of size genital M
    // Length: size of a male genital M shaft (approx 0.22) + head/glans (0.05) = 0.27
    const rodLength = 0.26;
    const rodRadius = 0.016;
    const segLength = rodLength / 3;

    // Build the main group representing the bendable 3-segment rod
    const rodMesh = new THREE.Group();
    rodMesh.name = 'penetrator_rod_mesh';

    // Shared segment Cylinder geometry and glossy golden material
    const segGeom = new THREE.CylinderGeometry(rodRadius, rodRadius, segLength, 16, 1);
    const rodMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Amber/Gold cyber rod
      roughness: 0.2,
      metalness: 0.5,
      emissive: 0xd97706,
      emissiveIntensity: 0.6,
    });

    const segmentGeoms: THREE.BufferGeometry[] = [segGeom];
    const segmentMats: THREE.Material[] = [rodMat];

    // Build 3 distinct segments, each with its own pseudo-3D contour layer
    for (let j = 0; j < 3; j++) {
      const segmentGroup = new THREE.Group();
      segmentGroup.name = `rod_segment_group_${j}`;

      // 3D Cylinder Mesh
      const segMesh = new THREE.Mesh(segGeom, rodMat);
      segMesh.name = `rod_segment_${j}`;
      segMesh.castShadow = true;
      segMesh.receiveShadow = true;
      segmentGroup.add(segMesh);

      // Pseudo-3D Contour Mesh specifically for this segment!
      const segPseudo = createPseudo3DContourMesh(
        'male_shaft',
        rodRadius * 2.5,
        segLength * 1.1,
        rodRadius * 2.5,
        ragdoll.sphericalContourLevel,
        0xf59e0b
      );
      segPseudo.name = `rod_segment_pseudo_${j}`;
      segPseudo.renderOrder = 17;
      if (segPseudo.material instanceof THREE.MeshStandardMaterial) {
        segPseudo.material.polygonOffset = true;
        segPseudo.material.polygonOffsetFactor = -1.0;
        segPseudo.material.polygonOffsetUnits = -1.0;
        segmentMats.push(segPseudo.material);
      }
      segmentGeoms.push(segPseudo.geometry);
      segmentGroup.add(segPseudo);

      rodMesh.add(segmentGroup);
    }

    // Add rodMesh directly to the genitalGroup so it moves and rotates perfectly with the ragdoll pelvis!
    genitalGroup.add(rodMesh);

    // Play a squishy organic entry sound or alert sound
    soundEngine.playImpact(0.6);

    this.activePenetratorRod = {
      ragdollId: ragdoll.id,
      type: genitalType as 'male' | 'female',
      progress: 0.0,
      rodMesh,
      speed: 1.428, // takes exactly 0.7 seconds per stroke (1 / 0.7)
      direction: 1, // inserting
      cleanUp: () => {
        if (rodMesh.parent) {
          rodMesh.parent.remove(rodMesh);
        }
        for (const geom of segmentGeoms) geom.dispose();
        for (const mat of segmentMats) mat.dispose();
      }
    };
  }

  private updatePenetratorRods(dt: number) {
    if (!this.activePenetratorRod) return;

    const rod = this.activePenetratorRod;
    const ragdoll = this.ragdolls.find((r) => r.id === rod.ragdollId);
    if (!ragdoll || ragdoll.genitalType === 'none') {
      rod.cleanUp();
      this.activePenetratorRod = null;
      return;
    }

    // Update the genital type if user switched it mid-animation
    rod.type = ragdoll.genitalType as 'male' | 'female';

    // Increment/decrement insertion progress
    rod.progress += rod.speed * dt * rod.direction;

    // Bounce / looping behavior when fully inserted or fully withdrawn
    if (rod.progress >= 1.0) {
      rod.progress = 1.0;
      rod.direction = -1; // withdraw
      
      // Trigger organ collision effect / sound on touching prostate or uterus!
      soundEngine.playBoneSnap(); // organic squish sound
      
      // Spawn tiny squirt/blood particles at the internal organ position as feedback!
      const pelvisP = ragdoll.particles.find((p) => p.name === 'pelvis');
      if (pelvisP) {
        const worldPos = new THREE.Vector3(pelvisP.x, pelvisP.y + 0.06, pelvisP.z);
        this.spawnSoundWave(worldPos, 1.5, 0.5, rod.type === 'male' ? 0xe9d5ff : 0xfbcfe8);
      }
    } else if (rod.progress <= 0.0) {
      rod.progress = 0.0;
      rod.direction = 1; // insert again
    }

    // Determine path positions based on type
    const pelvisP = ragdoll.particles.find((p) => p.name === 'pelvis');
    if (!pelvisP || !pelvisP.voxelsGroup) return;

    const genitalGroup = pelvisP.voxelsGroup.getObjectByName('GenitalExtraGroup') as THREE.Group | undefined;
    if (!genitalGroup) return;

    // Reset scales of all voxel blocks inside the genitals so we can apply the dynamic bulging effect
    if (pelvisP.voxelBlocks) {
      for (const block of pelvisP.voxelBlocks) {
        if (block.isGenitalBlock && block.mesh) {
          block.mesh.scale.set(1.0, 1.0, 1.0);
        }
      }
    }

    // Find custom outer meshes to reset their bulge as well
    genitalGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child !== rod.rodMesh && !child.name.includes('rod_segment')) {
        child.scale.set(1.0, 1.0, 1.0);
      }
    });

    const getPathInfo = (sValue: number) => {
      const s = THREE.MathUtils.clamp(sValue, 0, 1);
      const rootY = -0.04;
      const localPos = new THREE.Vector3();
      const localDir = new THREE.Vector3();

      if (rod.type === 'male') {
        const genitalFrontZ = 0.155;
        const shaftLen = 0.22 * (ragdoll.genitalMShaftLength ?? 1.0);
        const glansLen = 0.046;
        const totalPenisLen = shaftLen + glansLen;

        const pTip = new THREE.Vector3(0, rootY - totalPenisLen, genitalFrontZ);
        const pBase = new THREE.Vector3(0, rootY, genitalFrontZ);
        const pProstate = new THREE.Vector3(0, 0.06, 0.02);

        const segment1Ratio = 0.6;
        if (s < segment1Ratio) {
          const t = s / segment1Ratio;
          localPos.lerpVectors(pTip, pBase, t);
          localDir.subVectors(pBase, pTip).normalize();
        } else {
          const t = (s - segment1Ratio) / (1.0 - segment1Ratio);
          localPos.lerpVectors(pBase, pProstate, t);
          localDir.subVectors(pProstate, pBase).normalize();
        }
      } else {
        const femaleRootZ = 0.155;
        const pEntrance = new THREE.Vector3(0, rootY, femaleRootZ - 0.005);
        const pUterus = new THREE.Vector3(0, 0.08, 0.012);

        localPos.lerpVectors(pEntrance, pUterus, s);
        localDir.subVectors(pUterus, pEntrance).normalize();
      }
      return { pos: localPos, dir: localDir };
    };

    // Ensure main parent group stays at identity
    rod.rodMesh.position.set(0, 0, 0);
    rod.rodMesh.quaternion.set(0, 0, 0, 1);

    const middleSegPos = new THREE.Vector3();

    // Update each segment group position and rotation inside rodMesh
    for (let j = 0; j < 3; j++) {
      const segmentGroup = rod.rodMesh.getObjectByName(`rod_segment_group_${j}`) as THREE.Group | undefined;
      if (segmentGroup) {
        const segOffset = 0.18; // Spacing offset between segments along path
        const s_j = rod.progress - (2 - j) * segOffset;
        const info = getPathInfo(s_j);

        segmentGroup.position.copy(info.pos);
        segmentGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), info.dir);

        if (j === 1) {
          middleSegPos.copy(info.pos);
        }
      }
    }

    if (middleSegPos.lengthSq() === 0) {
      middleSegPos.copy(getPathInfo(rod.progress).pos);
    }

    // Apply Dynamic Wall Bulging / Expansion adapting strictly where the rod is!
    // Bulge radius: we want blocks within 0.065 meters of the rod center to expand
    const bulgeRadius = 0.065;
    const pelvisLocalRodPos = middleSegPos.clone()
      .applyQuaternion(genitalGroup.quaternion)
      .add(genitalGroup.position);

    if (pelvisP.voxelBlocks) {
      for (const block of pelvisP.voxelBlocks) {
        if ((block.isGenitalBlock || block.isOrganBlock) && block.mesh) {
          const dist = block.localPos.distanceTo(pelvisLocalRodPos);
          if (dist < bulgeRadius) {
            // Smooth bell curve expansion multiplier (up to 1.6x thickness)
            const t = 1.0 - dist / bulgeRadius;
            const scaleMult = 1.0 + 0.55 * Math.sin(t * Math.PI / 2);
            // Apply scale bulging along local X and Z (transverse diameter expansion!)
            block.mesh.scale.set(scaleMult, 1.0, scaleMult);
          }
        }
      }
    }

    // Also bulge the external smooth contour/labia meshes!
    genitalGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child !== rod.rodMesh && child.name && !child.name.includes('rod_segment')) {
        const name = child.name;
        // Apply bulge to shaft meshes, labia meshes, entrance clefts, etc.
        const isBuldgibleMesh = name.includes('shaft') || name.includes('labia') || name.includes('entrance') || name.includes('tube');
        if (isBuldgibleMesh) {
          // Get local position of the mesh
          const dist = child.position.distanceTo(middleSegPos);
          if (dist < bulgeRadius) {
            const t = 1.0 - dist / bulgeRadius;
            const scaleMult = 1.0 + 0.45 * Math.sin(t * Math.PI / 2);
            child.scale.set(scaleMult, 1.0, scaleMult);
          }
        }
      }
    });
  }

  private updateGenitalMPhysics(dt: number) {
    if (!this.ragdolls || this.ragdolls.length === 0) return;

    const clampedDt = Math.min(0.05, Math.max(0.001, dt));

    for (const ragdoll of this.ragdolls) {
      if (ragdoll.genitalType !== 'male') continue;

      const pelvisP = ragdoll.particles.find((p) => p.name === 'pelvis');
      if (!pelvisP || !pelvisP.voxelsGroup) continue;

      const genitalGroup = pelvisP.voxelsGroup.getObjectByName('GenitalExtraGroup') as THREE.Group | undefined;
      if (!genitalGroup) continue;

      const erectionPivot = genitalGroup.getObjectByName('ErectionPivotGroup') as THREE.Group | undefined;
      if (!erectionPivot) continue;

      // Initialize persistent physics state on erectionPivot.userData
      if (erectionPivot.userData.rotX === undefined) {
        erectionPivot.userData.rotX = 0;
        erectionPivot.userData.rotZ = 0;
        erectionPivot.userData.velX = 0;
        erectionPivot.userData.velZ = 0;
        erectionPivot.userData.prevPelvisX = pelvisP.x;
        erectionPivot.userData.prevPelvisY = pelvisP.y;
        erectionPivot.userData.prevPelvisZ = pelvisP.z;
        erectionPivot.userData.prevVx = 0;
        erectionPivot.userData.prevVy = 0;
        erectionPivot.userData.prevVz = 0;
      }

      const uData = erectionPivot.userData;

      // 1. Calculate pelvis linear velocity & acceleration
      const vx = THREE.MathUtils.clamp((pelvisP.x - uData.prevPelvisX) / clampedDt, -20, 20);
      const vy = THREE.MathUtils.clamp((pelvisP.y - uData.prevPelvisY) / clampedDt, -20, 20);
      const vz = THREE.MathUtils.clamp((pelvisP.z - uData.prevPelvisZ) / clampedDt, -20, 20);

      const ax = (vx - (uData.prevVx || 0)) / clampedDt;
      const ay = (vy - (uData.prevVy || 0)) / clampedDt;
      const az = (vz - (uData.prevVz || 0)) / clampedDt;

      uData.prevPelvisX = pelvisP.x;
      uData.prevPelvisY = pelvisP.y;
      uData.prevPelvisZ = pelvisP.z;
      uData.prevVx = vx;
      uData.prevVy = vy;
      uData.prevVz = vz;

      // 2. Transform world gravity & acceleration into the pelvis's local coordinate frame
      const pelvisQ = pelvisP.mesh ? pelvisP.mesh.quaternion.clone() : new THREE.Quaternion();
      const invPelvisQ = pelvisQ.clone().invert();

      const worldGrav = this.isZeroGravity ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3(0, -9.81, 0);
      const localGrav = worldGrav.clone().applyQuaternion(invPelvisQ);

      const worldAccel = new THREE.Vector3(ax, ay, az);
      const localAccel = worldAccel.clone().applyQuaternion(invPelvisQ);

      // 3. Local pendular hang angle based on local gravity
      // In pelvis space: -Y is down towards feet, +Z is anterior (front), -Z is posterior (glutes), +X is right
      let targetHangPitch = 0;
      let targetHangRoll = 0;

      const gravMag = localGrav.length();
      if (gravMag > 0.1) {
        // Pitch in local Y-Z plane: 0 when hanging straight down (-Y); negative when pulling forward (+Z)
        targetHangPitch = -Math.atan2(localGrav.z, -localGrav.y);
        // Roll in local X-Y plane: lateral swing between thighs
        targetHangRoll = Math.atan2(localGrav.x, -localGrav.y);
      }

      // 4. Erection target angle & convulsion jitter
      const erectionLevel = THREE.MathUtils.clamp(ragdoll.erectionLevel || 0, 0, 1);
      const erectionPitch = -(Math.PI / 2 + 0.35); // points forward and slightly upward
      const erectionRoll = 0;
      const jitter = ragdoll.isErecting ? Math.sin(Date.now() / 1000 * Math.PI * 8) * 0.05 : 0;

      // Blend between natural gravity hang (flaccid) and erect angle
      const targetPitch = THREE.MathUtils.lerp(targetHangPitch, erectionPitch + jitter, erectionLevel);
      const targetRoll = THREE.MathUtils.lerp(targetHangRoll, erectionRoll, erectionLevel);

      // 5. Dynamic inertia forces from pelvis acceleration and movement
      const inertiaPitch = THREE.MathUtils.clamp(localAccel.z * 0.04 - (vy * 0.12), -15.0, 15.0);
      const inertiaRoll = THREE.MathUtils.clamp(-localAccel.x * 0.04, -15.0, 15.0);

      // 6. Restoring spring & damping (stiffer and firmer when erect, softer when flaccid)
      const stiffness = THREE.MathUtils.lerp(18.0, 50.0, erectionLevel);
      const dampingFactor = THREE.MathUtils.lerp(0.86, 0.93, erectionLevel);

      const springPitch = (targetPitch - uData.rotX) * stiffness;
      const springRoll = (targetRoll - uData.rotZ) * stiffness;

      uData.velX += (springPitch + inertiaPitch) * clampedDt;
      uData.velZ += (springRoll + inertiaRoll) * clampedDt;

      const damping = Math.pow(dampingFactor, clampedDt * 60);
      uData.velX *= damping;
      uData.velZ *= damping;

      // 7. Integrate rotation angles
      uData.rotX += uData.velX * clampedDt;
      uData.rotZ += uData.velZ * clampedDt;

      // 8. Anatomical collision constraints
      // Cannot pass through pelvic crotch backward (pitch limit: max 0.32 rad flaccid, 0.0 rad erect)
      const maxBackPitch = THREE.MathUtils.lerp(0.32, -0.20, erectionLevel);
      const maxFwdPitch = -Math.PI * 0.85; // against abdomen
      uData.rotX = THREE.MathUtils.clamp(uData.rotX, maxFwdPitch, maxBackPitch);

      // Lateral limits (constrained between inner thighs)
      uData.rotZ = THREE.MathUtils.clamp(uData.rotZ, -0.42, 0.42);

      // 9. Ground clearance deflection if lying on floor
      if (pelvisP.y < 0.35) {
        const groundY = this.getGroundHeight(pelvisP.x, pelvisP.z, pelvisP.y);
        if (pelvisP.y <= groundY + 0.18) {
          // Flatten slightly along ground if in prone position
          if (uData.rotX > -0.2) {
            uData.rotX = THREE.MathUtils.lerp(uData.rotX, -0.2, 0.3);
          }
        }
      }

      // 10. Scale adjustment based on erection
      const scaleVal = 1.0 + 0.5 * erectionLevel;
      erectionPivot.scale.set(scaleVal, scaleVal, scaleVal);

      // 11. Apply dynamic ragdoll rotation to erectionPivot
      erectionPivot.rotation.set(uData.rotX, 0, uData.rotZ, 'YXZ');
    }
  }

  private updateCoupledGenitals(dt: number) {
    if (!this.ragdolls || this.ragdolls.length < 2) return;

    // Phase 1: Reset visual scales, positions, and rotations of all male erection pivots and female genitals back to defaults for safety
    for (const r of this.ragdolls) {
      const pelvisP = r.particles.find((p) => p.name === 'pelvis');
      if (!pelvisP || !pelvisP.voxelsGroup) continue;

      const genitalGroup = pelvisP.voxelsGroup.getObjectByName('GenitalExtraGroup') as THREE.Group | undefined;
      if (!genitalGroup) continue;

      // Keep ErectionPivotGroup scaled properly without overriding dynamic ragdoll physics rotation
      if (r.genitalType === 'male') {
        const erectionPivot = genitalGroup.getObjectByName('ErectionPivotGroup') as THREE.Group | undefined;
        if (erectionPivot) {
          const scaleVal = 1.0 + 0.5 * r.erectionLevel;
          erectionPivot.scale.set(scaleVal, scaleVal, scaleVal);
        }
      }

      if (pelvisP.voxelBlocks) {
        for (const block of pelvisP.voxelBlocks) {
          if (block.isGenitalBlock && block.mesh) {
            block.mesh.scale.set(1.0, 1.0, 1.0);
            if (block.mesh.userData.defaultPos) {
              block.mesh.position.copy(block.mesh.userData.defaultPos);
            }
          }
        }
      }

      genitalGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const isManualRod = this.activePenetratorRod && child === this.activePenetratorRod.rodMesh;
          if (!isManualRod) {
            child.scale.set(1.0, 1.0, 1.0);
            if (child.userData.defaultPos) {
              child.position.copy(child.userData.defaultPos);
            }
          }
        }
      });
    }

    // Phase 2: Detect any close male and female pairs and update physical penetration tracking using 100% precise World coordinates
    for (let i = 0; i < this.ragdolls.length; i++) {
      const rM = this.ragdolls[i];
      if (rM.genitalType !== 'male') continue;

      for (let j = 0; j < this.ragdolls.length; j++) {
        const rF = this.ragdolls[j];
        if (rF.genitalType !== 'female') continue;

        const pelvisM = rM.particles.find(p => p.name === 'pelvis');
        const pelvisF = rF.particles.find(p => p.name === 'pelvis');
        if (!pelvisM || !pelvisF) continue;

        const pelvisMPos = new THREE.Vector3(pelvisM.x, pelvisM.y, pelvisM.z);
        const pelvisFPos = new THREE.Vector3(pelvisF.x, pelvisF.y, pelvisF.z);
        const dist = pelvisMPos.distanceTo(pelvisFPos);

        // Maximum distance for proximity alignment is 0.45 meters
        if (dist > 0.45) continue;

        const faceDataM = (rM as any).faceData;
        if (faceDataM) {
          faceDataM.blushTimer = 2.0;
        } else {
          (rM as any).blushTimer = 2.0;
        }
        const faceDataF = (rF as any).faceData;
        if (faceDataF) {
          faceDataF.blushTimer = 2.0;
        } else {
          (rF as any).blushTimer = 2.0;
        }

        // Retrieve female entrance and uterus world positions dynamically
        const femaleEntrance = pelvisF.voxelsGroup?.getObjectByName('female_entrance_pseudo') || pelvisF.voxelsGroup?.getObjectByName('female_entrance_mesh');
        const femaleUterus = pelvisF.voxelsGroup?.getObjectByName('UterusOrganGroup') || pelvisF.voxelsGroup?.getObjectByName('female_internal_tube');
        
        if (!femaleEntrance || !femaleUterus) continue;

        const entranceFWorld = new THREE.Vector3();
        femaleEntrance.getWorldPosition(entranceFWorld);

        const uterusFWorld = new THREE.Vector3();
        femaleUterus.getWorldPosition(uterusFWorld);

        const genitalGroupM = pelvisM.voxelsGroup?.getObjectByName('GenitalExtraGroup') as THREE.Group | undefined;
        const erectionPivot = genitalGroupM?.getObjectByName('ErectionPivotGroup') as THREE.Group | undefined;

        if (genitalGroupM && erectionPivot) {
          // Find the male penis base in world space dynamically
          const baseMWorld = new THREE.Vector3();
          erectionPivot.getWorldPosition(baseMWorld);

          const toEntrance = new THREE.Vector3().subVectors(entranceFWorld, baseMWorld);
          const distToEntrance = toEntrance.length();

          // Total penis length in world units
          const shaftLenMultiplier = rM.genitalMShaftLength ?? 1.0;
          const erectionScale = 1.0 + 0.5 * rM.erectionLevel;
          const totalPenisLen = 0.26 * shaftLenMultiplier * erectionScale;

          // If the male penis base is close enough to reach or slide inside the vagina entrance
          if (distToEntrance < totalPenisLen) {
            // 1. DYNAMIC ROTATION: Align the penis to point directly into the vaginal entrance
            const dirWorld = new THREE.Vector3().subVectors(entranceFWorld, baseMWorld).normalize();
            
            const parentWorldRot = new THREE.Quaternion();
            genitalGroupM.getWorldQuaternion(parentWorldRot);
            
            const localDir = dirWorld.clone().applyQuaternion(parentWorldRot.invert());
            erectionPivot.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), localDir);

            // 2. PENETRATION TUBE TRAVERSAL: Slide penis segments along the vaginal canal tube
            const penetrationDepth = totalPenisLen - distToEntrance;
            const canalDirWorld = new THREE.Vector3().subVectors(uterusFWorld, entranceFWorld).normalize();

            erectionPivot.traverse((child) => {
              if (child instanceof THREE.Mesh && 
                  (child.name === 'male_shaft_mesh' || child.name === 'male_glans_mesh' || child.name === 'male_shaft_pseudo' || child.name === 'male_glans_pseudo')) {
                
                if (!child.userData.defaultPos) {
                  child.userData.defaultPos = child.position.clone();
                }

                const defaultPos = child.userData.defaultPos;
                const d = -defaultPos.y; // distance along shaft Y direction from base

                if (d >= distToEntrance) {
                  // This segment is inside! Let it travel down the vaginal canal
                  const canalDist = d - distToEntrance;
                  const blockWorldPos = entranceFWorld.clone().addScaledVector(canalDirWorld, canalDist);

                  // Convert world coordinate back to erectionPivot local space
                  const pivotWorldPos = new THREE.Vector3();
                  erectionPivot.getWorldPosition(pivotWorldPos);
                  
                  const pivotWorldRot = new THREE.Quaternion();
                  erectionPivot.getWorldQuaternion(pivotWorldRot);
                  
                  const blockLocalPos = blockWorldPos.clone()
                    .sub(pivotWorldPos)
                    .applyQuaternion(pivotWorldRot.invert())
                    .divide(erectionPivot.scale);

                  // Gently squeeze/compress penis width inside the vagina walls
                  // The pink tube (female canal) has fTubeLength, after which is the hollow uterus
                  const fTubeLength = (femaleUterus.parent?.getObjectByName('female_internal_tube') as any)?.userData?.originalLength ?? 0.12;

                  let compressK = 0.65;
                  if (canalDist <= fTubeLength) {
                    // Inside the narrow pink tube: compress more to fit perfectly inside the tube
                    const ratio = (0.014 * (rF.genitalFSize ?? 1.0)) / (0.038 * (rM.genitalMShaftThickness ?? 1.0));
                    compressK = THREE.MathUtils.clamp(ratio, 0.22, 0.55);
                  } else {
                    // Reached the hollow uterus: expand back to fill the uterus cavity!
                    const ratio = (0.034 * (rF.genitalFSize ?? 1.0)) / (0.038 * (rM.genitalMShaftThickness ?? 1.0));
                    compressK = THREE.MathUtils.clamp(ratio, 0.45, 1.1);
                  }

                  child.position.set(blockLocalPos.x + defaultPos.x * compressK, blockLocalPos.y, blockLocalPos.z + defaultPos.z * compressK);
                  child.scale.set(compressK, 1.0, compressK);
                } else {
                  // Remains outside of vaginal entrance
                  child.position.copy(defaultPos);
                  child.scale.set(1.0, 1.0, 1.0);
                }
              }
            });

            // 3. FEMALE WALL BULGING: Expand female labia and vagina walls to adapt to the penis width
            const genitalGroupF = pelvisF.voxelsGroup?.getObjectByName('GenitalExtraGroup') as THREE.Group | undefined;
            if (genitalGroupF) {
              // Bulge custom female visual meshes
              genitalGroupF.traverse((child) => {
                if (child instanceof THREE.Mesh && child.name.includes('female_')) {
                  const childWorldPos = new THREE.Vector3();
                  child.getWorldPosition(childWorldPos);

                  const proj = this.distancePointToSegment(childWorldPos, entranceFWorld, uterusFWorld);
                  if (proj.t > 0 && proj.t < (penetrationDepth / totalPenisLen) && proj.dist < 0.08) {
                    const t = 1.0 - proj.dist / 0.08;
                    const bulgeAmount = 1.0 + 0.38 * Math.sin(t * Math.PI / 2) * (rF.genitalFSize ?? 1.0);
                    child.scale.set(bulgeAmount, 1.0, bulgeAmount);
                  }
                }
              });

              // Bulge female pelvis voxel blocks
              if (pelvisF.voxelBlocks) {
                for (const block of pelvisF.voxelBlocks) {
                  if (block.isGenitalBlock && block.mesh) {
                    const blockWorldPos = block.localPos.clone().add(pelvisFPos);
                    const proj = this.distancePointToSegment(blockWorldPos, entranceFWorld, uterusFWorld);
                    if (proj.t > 0 && proj.t < (penetrationDepth / totalPenisLen) && proj.dist < 0.08) {
                      const t = 1.0 - proj.dist / 0.08;
                      const bulgeAmount = 1.0 + 0.45 * Math.sin(t * Math.PI / 2) * (rF.genitalFSize ?? 1.0);
                      block.mesh.scale.set(bulgeAmount, 1.0, bulgeAmount);
                    }
                  }
                }
              }
            }

            // Play squishy sound effect during movements
            if (Math.random() < 0.012) {
              soundEngine.playImpact(0.4);
            }
          }
        }
      }
    }
  }

  public setPlayerPubicHair(enabled: boolean, intensity: number, ragdollId?: string) {
    for (const r of this.ragdolls) {
      if (!ragdollId || r.id === ragdollId || r.isControlled) {
        r.pubicHairEnabled = enabled;
        r.pubicHairIntensity = intensity;
        setupPubicHair(r);
      }
    }
  }

  // --- MULTIPLAYER REAL ONLINE PLAYERS ---
  public remotePlayersMap: Map<string, { ragdoll: Ragdoll3D; nameTagSprite: THREE.Sprite; state: RemotePlayerState }> = new Map();

  public updateRemotePlayer(state: RemotePlayerState) {
    let entry = this.remotePlayersMap.get(state.id);
    if (!entry) {
      // Create a 3D ragdoll avatar for remote player with full anatomical features and cylinders/spheres
      const ragdoll = createArticulatedRagdoll3D(state.x, state.y, state.z, 1.0, this.scene, 100, true);
      ragdoll.name = state.name;
      (ragdoll as any).isRemotePlayer = true;
      ragdoll.isControlled = false;
      ragdoll.isAlive = state.isAlive !== undefined ? state.isAlive : true;
      ragdoll.isWalkingRagdoll = true;
      ragdoll.charPos.set(state.x, state.y, state.z);
      ragdoll.facingAngle = state.rotY ?? state.facingAngle ?? 0;

      // Apply complete anatomy matching player's body: cylinders, spheres, pelvis, genitals, bust and glutes
      const contourStyle = this.contourJointStyle || 'cylinder';
      updateRagdollSphericalContour(ragdoll, 100, true, contourStyle);

      const genitalTypeToUse = (state.avatarConfig?.genitalType as any) || (state.genitalType as any) || (this.ragdolls[0]?.genitalType) || 'male';
      updateRagdollGenitals(ragdoll, genitalTypeToUse);

      const bustGlutesToUse = state.avatarConfig?.hasBustAndGlutes !== undefined
        ? state.avatarConfig.hasBustAndGlutes
        : (state.hasBustAndGlutes !== undefined ? state.hasBustAndGlutes : true);
      updateRagdollBustAndGlutes(ragdoll, bustGlutesToUse);

      // Apply clothing and skin options if provided
      const skinColor = state.avatarConfig?.skinColorHex ?? state.skinColorHex;
      if (skinColor) {
        updateRagdollSkinColor(ragdoll, skinColor);
      }
      const hasShirt = state.avatarConfig?.hasShirt ?? state.hasShirt ?? false;
      const shirtColor = state.avatarConfig?.shirtColorHex ?? state.shirtColorHex ?? 0x3b82f6;
      applyShirtToRagdoll(ragdoll, hasShirt, shirtColor);

      const hasPants = state.avatarConfig?.hasPants ?? state.hasPants ?? false;
      const pantsColor = state.avatarConfig?.pantsColorHex ?? state.pantsColorHex ?? 0x1e293b;
      applyPantsToRagdoll(ragdoll, hasPants, pantsColor);

      // Add to world ragdolls array so all joints, cylinders, spheres, and physics sync properly every frame
      this.ragdolls.push(ragdoll);
      this.resetRagdollParticlesToKinematicPose(ragdoll);

      // Overhead Name Tag Sprite
      const isBot = state.id.includes('bot') || state.name.toLowerCase().includes('bot');
      const nameTagSprite = this.createPlayerNameTag(isBot ? `${state.name} [BOT]` : `${state.name} (Online)`);
      this.scene.add(nameTagSprite);

      entry = { ragdoll, nameTagSprite, state };
      this.remotePlayersMap.set(state.id, entry);
    }

    entry.state = state;
    const ragdoll = entry.ragdoll;

    // Detect movement delta to advance walk cycle naturally
    const dx = state.x - ragdoll.charPos.x;
    const dz = state.z - ragdoll.charPos.z;
    const distMoved = Math.sqrt(dx * dx + dz * dz);
    if (distMoved > 0.003) {
      ragdoll.walkCycle += distMoved * 7.5;
    }

    // Smoothly interpolate position & rotation for buttery smooth multiplayer sync
    if (distMoved > 4.0) {
      // Teleport if too far
      ragdoll.charPos.set(state.x, state.y, state.z);
    } else {
      ragdoll.charPos.x += (state.x - ragdoll.charPos.x) * 0.75;
      ragdoll.charPos.y += (state.y - ragdoll.charPos.y) * 0.75;
      ragdoll.charPos.z += (state.z - ragdoll.charPos.z) * 0.75;
    }

    const targetRot = state.rotY ?? state.facingAngle ?? ragdoll.facingAngle;
    let diffRot = targetRot - ragdoll.facingAngle;
    while (diffRot > Math.PI) diffRot -= Math.PI * 2;
    while (diffRot < -Math.PI) diffRot += Math.PI * 2;
    ragdoll.facingAngle += diffRot * 0.75;

    if (state.isAlive !== undefined) ragdoll.isAlive = state.isAlive;
    if (state.health !== undefined) ragdoll.totalHealth = state.health;

    // Reset kinematic pose smoothly
    if (ragdoll.isAlive) {
      this.resetRagdollParticlesToKinematicPose(ragdoll);
    }

    // Position overhead name tag sprite
    const headP = ragdoll.particles.find((p) => p.name === 'cabeza') || ragdoll.particles[0];
    if (headP && entry.nameTagSprite) {
      entry.nameTagSprite.position.set(headP.x, headP.y + 0.68, headP.z);
    }
  }

  public removeRemotePlayer(playerId: string) {
    const entry = this.remotePlayersMap.get(playerId);
    if (entry) {
      // Remove from ragdolls array
      const idx = this.ragdolls.indexOf(entry.ragdoll);
      if (idx !== -1) {
        this.ragdolls.splice(idx, 1);
      }

      // Clean up meshes and groups from scene
      if (entry.ragdoll.groupMesh) {
        this.scene.remove(entry.ragdoll.groupMesh);
      }
      if (entry.ragdoll.jointBridges) {
        for (const bridge of entry.ragdoll.jointBridges) {
          this.scene.remove(bridge);
        }
      }
      if (entry.ragdoll.jointSpheres) {
        for (const sp of entry.ragdoll.jointSpheres) {
          this.scene.remove(sp);
        }
      }
      for (const p of entry.ragdoll.particles) {
        if (p.mesh) this.scene.remove(p.mesh);
        if (p.voxelsGroup) this.scene.remove(p.voxelsGroup);
      }
      if (entry.nameTagSprite) {
        this.scene.remove(entry.nameTagSprite);
      }
      this.remotePlayersMap.delete(playerId);
    }
  }

  public clearRemotePlayers() {
    const ids = Array.from(this.remotePlayersMap.keys());
    for (const id of ids) {
      this.removeRemotePlayer(id);
    }
  }

  public getRemotePlayer(id: string): { ragdoll: Ragdoll3D; nameTagSprite: THREE.Sprite; state: RemotePlayerState } | undefined {
    return this.remotePlayersMap.get(id);
  }

  public getInspectedBlockInfo(): InspectedBlockInfo | null {
    return this.inspectedBlockInfo;
  }

  private updateBlockInspector(dt: number) {
    const player = this.ragdolls[0];
    if (!player || !player.charPos) {
      if (this.inspectedBlockInfo) {
        this.inspectedBlockInfo.timeRemaining -= dt;
        if (this.inspectedBlockInfo.timeRemaining <= 0) {
          this.inspectedBlockInfo = null;
          this.lastInspectedBlockId = null;
        }
      }
      return;
    }

    const px = player.charPos.x;
    const py = player.charPos.y;
    const pz = player.charPos.z;

    let closestBlock: VoxelBlock3D | null = null;
    let minDistanceSq = 3.5 * 3.5; // Within 3.5 meters

    for (const vb of this.voxelBlocks) {
      const dx = vb.x - px;
      const dy = vb.y - py;
      const dz = vb.z - pz;
      const dSq = dx * dx + dy * dy + dz * dz;
      if (dSq < minDistanceSq) {
        minDistanceSq = dSq;
        closestBlock = vb;
      }
    }

    if (closestBlock) {
      const blockId = closestBlock.id;
      if (this.lastInspectedBlockId !== blockId || !this.inspectedBlockInfo) {
        this.lastInspectedBlockId = blockId;
        const typeNameMap: Record<string, string> = {
          slime: 'Bloque de Slime (Gelatina)',
          skin: 'Bloque de Piel Sintética',
          metal: 'Bloque de Metal Reforzado',
          rock: 'Bloque de Piedra / Roca',
          wood: 'Bloque de Madera',
          glass: 'Bloque de Cristal Frágil',
          grass: 'Bloque de Césped Natural',
          dirt: 'Bloque de Tierra / Barro'
        };
        const rawType: string = closestBlock.type || 'standard';
        const displayName = typeNameMap[rawType] || `Bloque ${rawType.toUpperCase()}`;

        const h = closestBlock.hardness ?? (rawType === 'slime' ? 10 : rawType === 'skin' ? 20 : rawType === 'metal' ? 95 : rawType === 'rock' ? 85 : rawType === 'wood' ? 60 : rawType === 'glass' ? 30 : 50);
        const r = closestBlock.resistance ?? (rawType === 'slime' ? 15 : rawType === 'skin' ? 25 : rawType === 'metal' ? 90 : rawType === 'rock' ? 80 : rawType === 'wood' ? 55 : rawType === 'glass' ? 20 : 50);
        const d = closestBlock.density ?? (rawType === 'slime' ? 20 : rawType === 'skin' ? 40 : rawType === 'metal' ? 95 : rawType === 'rock' ? 85 : rawType === 'wood' ? 50 : rawType === 'glass' ? 45 : 50);
        const e = closestBlock.elasticity ?? (rawType === 'slime' ? 95 : rawType === 'skin' ? 85 : rawType === 'metal' ? 10 : rawType === 'rock' ? 5 : rawType === 'wood' ? 25 : rawType === 'glass' ? 0 : 30);
        const hp = closestBlock.health ?? 100;

        this.inspectedBlockInfo = {
          name: displayName,
          blockState: h,
          hardness: h,
          resistance: r,
          density: d,
          elasticity: e,
          health: hp,
          timeRemaining: 5.0,
          x: closestBlock.x,
          y: closestBlock.y,
          z: closestBlock.z,
        };
      } else if (this.inspectedBlockInfo) {
        this.inspectedBlockInfo.timeRemaining -= dt;
        if (this.inspectedBlockInfo.timeRemaining <= 0) {
          this.inspectedBlockInfo = null;
        }
      }
    } else {
      if (this.inspectedBlockInfo) {
        this.inspectedBlockInfo.timeRemaining -= dt;
        if (this.inspectedBlockInfo.timeRemaining <= 0) {
          this.inspectedBlockInfo = null;
          this.lastInspectedBlockId = null;
        }
      } else {
        this.lastInspectedBlockId = null;
      }
    }
  }

  private createPlayerNameTag(name: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(4, 4, 248, 56, 12);
      ctx.fill();
      ctx.stroke();

      // Green Dot for Real Online Player
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(24, 32, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(name.slice(0, 15), 38, 38);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.4, 0.35, 1);
    return sprite;
  }

  public togglePlayerFluidEmission(ragdollId?: string, enable?: boolean): boolean {
    const player = this.ragdolls.find((r) => (ragdollId ? r.id === ragdollId : r.isControlled)) || this.ragdolls[0];
    if (!player) return false;
    const next = enable !== undefined ? enable : !player.fluidEmissionActive;
    player.fluidEmissionActive = next;
    player.fluidEmissionDurationLeft = next ? undefined : 0; // Clear duration limit so emission streams continuously ("sin parar")
    if (next) {
      player.fluidEmissionNextPulseTimer = 0;
      player.fluidContractionBurstTimer = 0.50;
      player.fluidContractionIntensity = 0.85;
    }
    return next;
  }

  public triggerPlayerFluidEmissionBurst(ragdollId?: string, duration: number = 3.5) {
    const player = this.ragdolls.find((r) => (ragdollId ? r.id === ragdollId : r.isControlled)) || this.ragdolls[0];
    if (!player) return;
    RealisticFluidEngine.getInstance().triggerContinuousEmission(player, duration);
    player.fluidContractionBurstTimer = 0.50;
    player.fluidContractionIntensity = 0.90;
  }

  public isPlayerFluidEmitting(ragdollId?: string): boolean {
    const player = this.ragdolls.find((r) => (ragdollId ? r.id === ragdollId : r.isControlled)) || this.ragdolls[0];
    return player ? !!player.fluidEmissionActive : false;
  }
}

export function createSphereCubeGeometry(size: number, sphereRatio: number = 0.5): THREE.BufferGeometry {
  const geom = new THREE.BoxGeometry(size, size, size, 4, 4, 4);
  const posAttr = geom.attributes.position;
  if (posAttr) {
    const halfSize = size / 2;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      
      const dist = Math.sqrt(x * x + y * y + z * z);
      if (dist > 0.001) {
        // Spherized coordinates (projected onto a sphere of radius halfSize)
        const sx = (x / dist) * halfSize;
        const sy = (y / dist) * halfSize;
        const sz = (z / dist) * halfSize;
        
        // Blend between box coordinates and sphere coordinates
        const rx = x * (1 - sphereRatio) + sx * sphereRatio;
        const ry = y * (1 - sphereRatio) + sy * sphereRatio;
        const rz = z * (1 - sphereRatio) + sz * sphereRatio;
        
        posAttr.setXYZ(i, rx, ry, rz);
      }
    }
    geom.computeVertexNormals();
  }
  return geom;
}
