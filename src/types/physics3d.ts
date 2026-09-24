import * as THREE from 'three';

export type BodyPartName =
  | 'cabeza'
  | 'cuello'
  | 'pechobase'
  | 'pecho_bajo'
  | 'torso'
  | 'ombligo'
  | 'ombligo_bajo'
  | 'pelvis'
  | 'cuello_estomago_tubo'
  | 'estomago'
  | 'higado'
  | 'intestino_grueso'
  | 'intestino_grueso_seg1'
  | 'intestino_grueso_seg2'
  | 'intestino_grueso_seg3'
  | 'intestino_delgado'
  | 'intestino_delgado_seg1'
  | 'intestino_delgado_seg2'
  | 'intestino_delgado_seg3'
  | 'hombro_izq'
  | 'brazo_izq'
  | 'codo_izq'
  | 'antebrazo_izq'
  | 'muneca_izq'
  | 'mano_izq'
  | 'dedo_pulgar_izq'
  | 'dedo_pulgar_izq_seg2'
  | 'dedo_pulgar_izq_seg3'
  | 'dedo_indice_izq'
  | 'dedo_indice_izq_seg2'
  | 'dedo_indice_izq_seg3'
  | 'dedo_medio_izq'
  | 'dedo_medio_izq_seg2'
  | 'dedo_medio_izq_seg3'
  | 'dedo_anular_izq'
  | 'dedo_anular_izq_seg2'
  | 'dedo_anular_izq_seg3'
  | 'dedo_menique_izq'
  | 'dedo_menique_izq_seg2'
  | 'dedo_menique_izq_seg3'
  | 'hombro_der'
  | 'brazo_der'
  | 'codo_der'
  | 'antebrazo_der'
  | 'muneca_der'
  | 'mano_der'
  | 'dedo_pulgar_der'
  | 'dedo_pulgar_der_seg2'
  | 'dedo_pulgar_der_seg3'
  | 'dedo_indice_der'
  | 'dedo_indice_der_seg2'
  | 'dedo_indice_der_seg3'
  | 'dedo_medio_der'
  | 'dedo_medio_der_seg2'
  | 'dedo_medio_der_seg3'
  | 'dedo_anular_der'
  | 'dedo_anular_der_seg2'
  | 'dedo_anular_der_seg3'
  | 'dedo_menique_der'
  | 'dedo_menique_der_seg2'
  | 'dedo_menique_der_seg3'
  | 'muslo_izq'
  | 'rodilla_izq'
  | 'antepierna_izq'
  | 'tobillo_izq'
  | 'pie_izq'
  | 'pie_izq_talon'
  | 'pie_izq_medio'
  | 'dedo_pie_pulgar_izq'
  | 'dedo_pie_indice_izq'
  | 'dedo_pie_medio_izq'
  | 'dedo_pie_anular_izq'
  | 'dedo_pie_menique_izq'
  | 'muslo_der'
  | 'rodilla_der'
  | 'antepierna_der'
  | 'tobillo_der'
  | 'pie_der'
  | 'pie_der_talon'
  | 'pie_der_medio'
  | 'dedo_pie_pulgar_der'
  | 'dedo_pie_indice_der'
  | 'dedo_pie_medio_der'
  | 'dedo_pie_anular_der'
  | 'dedo_pie_menique_der'
  | 'pecho_izq'
  | 'pecho_der'
  | 'tetilla_izq'
  | 'tetilla_der'
  | 'boca_zombie'
  | 'dientes_zombie'
  | 'gluteo_izq'
  | 'gluteo_der'
  | 'male_shaft'
  | 'male_shaft_0'
  | 'male_shaft_1'
  | 'male_shaft_2'
  | 'male_glans'
  | 'testicle_l'
  | 'testicle_r'
  | 'labio_izq'
  | 'labio_der'
  | 'entrada_femenina'
  | 'tentaculo_seg1'
  | 'tentaculo_seg2'
  | 'tentaculo_seg3'
  | 'tentaculo_seg4'
  | 'tentaculo_seg5'
  | 'tentaculo_seg6'
  | 'tentaculo_seg7'
  | 't1_seg1'
  | 't1_seg2'
  | 't1_seg3'
  | 't1_seg4'
  | 't1_seg5'
  | 't2_seg1'
  | 't2_seg2'
  | 't2_seg3'
  | 't2_seg4'
  | 't2_seg5'
  | 't3_seg1'
  | 't3_seg2'
  | 't3_seg3'
  | 't3_seg4'
  | 't3_seg5'
  | 'cola_seg1'
  | 'cola_seg2'
  | 'cola_seg3'
  | 'cave_seg0'
  | 'cave_seg1'
  | 'cave_seg2'
  | 'cave_seg3'
  | 'cave_seg4'
  | 'cave_seg5'
  | 'cave_seg6'
  | 'cave_seg7'
  | 'pozo_tierra'
  | 'vaso'
  | 'cama_base'
  | 'cama_sabana'
  | 'cama_almohada'
  | 'cama_cabecero'
  | 'sofa'
  | 'pared_ladrillo'
  | 'pared_base'
  | 'pared_top';

export interface LimbVoxelBlock {
  id: string;
  localPos: THREE.Vector3;
  size: [number, number, number]; // [width, height, depth]
  color: number;
  originalColor: number;
  active: boolean; // false when destroyed by bullet
  mesh?: THREE.Mesh;
  isContour: boolean;
  isShirtBlock?: boolean;
  isPantsBlock?: boolean;
  isGenitalBlock?: boolean;
  isAnusBlock?: boolean;
  isBoneBlock?: boolean; // Internal skeleton bone block
  isOrganBlock?: boolean; // Internal anatomical organ / tube (Uterus / Prostate / Urethral / Vaginal canal)
  layerIndex?: number; // 0 = skin, 1 = outer flesh/clothes, 2 = deep muscle, 3 = bone
  gridIndex: [number, number, number]; // [ix, iy, iz]
}

export interface SoundWave3D {
  id: string;
  origin: THREE.Vector3;
  radius: number;
  maxRadius: number;
  speed: number;
  intensity: number;
  size: number;
  color: number;
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

export interface Particle3D {
  id: string;
  x: number;
  y: number;
  z: number;
  oldX: number;
  oldY: number;
  oldZ: number;
  vx: number;
  vy: number;
  vz: number;
  mass: number;
  radius: number;
  pinned: boolean;
  name: BodyPartName;
  parentRagdollId: string;
  health: number;
  maxHealth: number;
  fractured: boolean;
  dismembered: boolean;
  isVital?: boolean;
  bleedingRate: number;
  mesh?: THREE.Object3D;
  quaternion?: THREE.Quaternion;
  boxDims?: [number, number, number]; // [width, height, depth]
  voxelBlocks?: LimbVoxelBlock[];
  voxelsGroup?: THREE.Group;
  contourMesh?: THREE.Mesh | THREE.Group;
  leftEarContourMesh?: THREE.Mesh;
  rightEarContourMesh?: THREE.Mesh;
  metaball3Mesh?: THREE.Group;
  hearingSphereMesh?: THREE.Mesh;
  hearingSphereLeftMesh?: THREE.Mesh;
  hearingSphereRightMesh?: THREE.Mesh;
  dragTargetPos?: THREE.Vector3;
  widthMultiplier?: number;
  needsCylinderDeform?: boolean;
  adheredSlimeBlockId?: string;
  isDigit?: boolean;
  isFootOrHand?: boolean;
  isLeft?: boolean;
  isRight?: boolean;
  isLeg?: boolean;
  isArm?: boolean;
  isTorso?: boolean;
  userData?: Record<string, any>;
  skinColor?: number;
}

export interface Constraint3D {
  id: string;
  p1: Particle3D;
  p2: Particle3D;
  length: number;
  originalLength?: number;
  stiffness: number;
  breakForce: number;
  broken: boolean;
  name: string;
  isLeftArm?: boolean;
  isRightArm?: boolean;
  isLegOrFoot?: boolean;
  isFingerOrToe?: boolean;
  isExtremityRigid?: boolean;
}

export interface BloodParticle3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  life: number;
  decay: number;
  color: string;
  mesh?: THREE.Mesh;
  isCubic?: boolean;
  maxLife?: number;
  isGrounded?: boolean;
  size?: number;
}

export interface WoundBloodJet3D {
  id: string;
  ragdollId: string;
  particleName: BodyPartName;
  localPos: THREE.Vector3;
  localDir: THREE.Vector3;
  timeLeft: number;
  accumulator: number;
  targetMesh?: THREE.Object3D;
}

export interface BloodDecal3D {
  x: number;
  y: number;
  z: number;
  normalX: number;
  normalY: number;
  normalZ: number;
  radius: number;
  color: string;
  mesh?: THREE.Mesh;
}

export interface JellyDebrisParticle3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  life: number;
  maxLife: number;
  decay: number;
  type: 'slime' | 'skin';
  color: number;
  mesh: THREE.Mesh;
  wobbleScale: THREE.Vector3;
  wobbleVel: THREE.Vector3;
}

export interface VoxelBlock3D {
  id: string;
  x: number;
  y: number;
  z: number;
  size: number;
  color: number;
  type: 'stone' | 'wood' | 'neon' | 'flesh' | 'brick' | 'gold' | 'water' | 'leaf' | 'roof' | 'glass' | 'wall' | 'asphalt' | 'slime' | 'skin';
  mesh: THREE.Mesh;
  customColor?: number;
  // Jelly / Gelatinous Wobble Physics
  isJelly?: boolean;
  jellyType?: 'slime' | 'skin';
  wobbleScale?: THREE.Vector3;
  wobbleVel?: THREE.Vector3;
  shearOffset?: THREE.Vector3;
  shearVel?: THREE.Vector3;
  stiffness?: number;
  damping?: number;
  health?: number;
  maxHealth?: number;
  baseScale?: number;
  attachedTargetPos?: THREE.Vector3;
  structureId?: string;
  // Inspection / Material physical properties
  hardness?: number;
  resistance?: number;
  density?: number;
  elasticity?: number;
  pursuingParticle?: any;
  pursuingRagdoll?: any;
  pursuitVel?: THREE.Vector3;
  isPursuing?: boolean;
  pursuitTimer?: number;
  isOpenWall?: boolean;
  openedCavityPos?: THREE.Vector3;
  openedCavityRadius?: number;
  submergedDepth?: number;
  isSubBlock?: boolean;
  parentSlimeBlockId?: string;
  adheredEntityId?: string;
  adheredLimbName?: string;
  isDynamicProp?: boolean;
  userData?: Record<string, any>;
}

export interface WeaponPickup3D {
  id: string;
  x: number;
  y: number;
  z: number;
  type: 'rifle' | 'pistol' | 'shotgun' | 'hammer';
  mesh: THREE.Group;
  isEquipped: boolean;
  respawnTime?: number;
}

export interface Bullet3D {
  id: string;
  shooterId?: string;
  fromPlayer: boolean;
  origin: THREE.Vector3;
  pos: THREE.Vector3;
  dir: THREE.Vector3;
  speed: number;
  life: number;
  maxLife: number;
  damage: number;
  tracerMesh?: THREE.Line | THREE.Mesh;
  embeddedInSlime?: boolean;
  embeddedBlock?: VoxelBlock3D;
  localEmbeddedPos?: THREE.Vector3;
}

export interface SoldierNPC {
  id: string;
  name: string;
  ragdoll: Ragdoll3D;
  isAggro: boolean;
  shootCooldown: number;
  patrolAngle: number;
  patrolCenter: THREE.Vector3;
  state: 'idle' | 'patrol' | 'aim' | 'shoot';
  targetPos: THREE.Vector3;
}

export type FaceFeatureMode = 'anime_canvas' | 'voxel_blocks' | 'pseudo_spheres' | 'pseudo_cylinders' | 'hybrid';

export type HotPoseType =
  | 'standing_lift_face_to_face'
  | 'standing_lift_rear'
  | 'all_fours_arch'
  | 'missionary_embrace'
  | 'mating_press'
  | 'standing_wheelbarrow'
  | 'bridal_cradle'
  | 'lap_straddle_cowgirl'
  | 'lap_reverse_cowgirl'
  | 'standing_wall_press'
  | 'chair_lean_over'
  | 'standing_bent_over'
  | 'side_spoon_embrace'
  | 'standing_shoulder_carry';

export interface HotNPCEmotions {
  passion: number;
  dominance: number;
  affection: number;
  playfulness: number;
  stamina: number;
  currentMood: 'passionate' | 'dominant' | 'tender' | 'playful' | 'ecstatic' | 'resting';
  decisionTimer: number;
  currentThought: string;
}

export interface Ragdoll3D {
  id: string;
  name: string;
  particles: Particle3D[];
  constraints: Constraint3D[];
  _connectedPairsSet?: Set<string>;
  _constraintsDirty?: boolean;
  isAlive: boolean; // TRUE = Standing upright tall block character, FALSE = Ragdoll blocks on floor
  isWalkingRagdoll?: boolean; // TRUE = Active walking ragdoll with physics balance and locomotion
  activeEmote?: string | null; // Active emote animation e.g. 'baile1'
  emoteTimer?: number;
  emoteBlend?: number;
  hitStaggerTimer?: number;
  wasWalkingRagdollBeforeHit?: boolean;
  customLimbOffsets?: Record<string, THREE.Vector3>; // Retained pose offsets when moving limbs
  cylinderDeformWarmup?: number; // Warmup frames to settle cylinder deformations correctly
  wanderTimer?: number;
  wanderAngle?: number;
  isGrounded: boolean;
  isJumping: boolean;
  charPos: THREE.Vector3; // Root base position
  charVel: THREE.Vector3;
  facingAngle: number;
  walkCycle: number;
  totalHealth: number;
  scale: number;
  isControlled: boolean;
  isNPC?: boolean;
  // NPC AI Stats (0-100)
  intelligence?: number;
  aiState?: 'approaching' | 'observing' | 'retreating' | 'tripped' | 'orbit_left' | 'orbit_right' | 'strafe_left' | 'strafe_right' | 'hiding' | 'wandering';
  aiTimer?: number;
  tripTimer?: number;
  lookAtTarget?: boolean;
  hasTargetInSight?: boolean;
  lastSeenTargetPos?: THREE.Vector3;
  hidingSpot?: THREE.Vector3;
  strength?: number;
  speed?: number;
  jumpPower?: number;
  immunity?: number;
  hearing?: number;
  resilience?: number;
  reproduction?: number;
  asesino?: number;
  fluidEmissionTimer?: number;
  fluidEmissionActive?: boolean;
  fluidEmissionDurationLeft?: number;
  fluidEmissionCooldownLeft?: number;
  fluidEmissionNextPulseTimer?: number;
  fluidSpasmPhase?: number;
  fluidSpasmAngles?: Record<string, { rotX: number; rotY: number; rotZ: number }>;
  fluidEmissionSourceType?: 'genitals' | 'breasts' | 'glutes' | 'both' | 'all';
  fluidEmissionActiveOrigins?: THREE.Vector3[];
  psicopata?: number;
  amable?: number;
  groupMesh: THREE.Group;
  jointBridges?: THREE.Mesh[];
  jointSpheres?: THREE.Mesh[];
  neckToStomachTube?: THREE.Mesh;
  tendonLines?: THREE.LineSegments;
  heardSoundTarget?: THREE.Vector3;
  heardSoundTimer?: number;
  heardSoundIds?: Set<string>;
  genitalMShaftLength?: number;
  genitalMShaftThickness?: number;
  genitalMPinkSize?: number;
  genitalFSize?: number;
  bustMorphValue: number; // 0 to 100 spherical voxel curvature
  rampsEnabled: boolean; // Add ramps/wedges on body voxels
  hasWeapon: boolean;
  isAiming: boolean;
  weaponMesh?: THREE.Group;
  marchingCubesMesh?: any;
  // Pseudo-3D Spherical Contour Layer
  sphericalContourLevel: number; // 0 to 100 (0 = cubic contour, 100 = full spherical pseudo-3D contour)
  contourSmoothness?: number; // 0 to 100
  contourLayerEnabled: boolean;
  contourJointStyle?: 'pseudo3d' | 'blocky' | 'cylinder';
  breathingTimer?: number;
  breathingPhase?: 'inhale' | 'exhale';
  bodyCubicity?: number; // 4 to 24 (radialSegments of Cylinder and Sphere geometries). Default 24, lower is more cubic
  limbSizeMultiplier?: number; // 0.5 to 2.0. Default 1.0, adjusts thickness of limbs
  isCollapsed?: boolean;
  xrayMode?: number; // 0 = Normal, 1 = Sin Piel, 2 = Solo Esqueleto, 3 = Rayos X Holográfico
  voxelShape?: 'cube' | 'sphere';
  voxelDensity?: number; // 1 to 5 (resolution of cubes per limb, default 2 which is 2x3x2 = 12 cubes like calves)
  hasBustAndGlutes?: boolean;
  genitalType?: 'none' | 'male' | 'female';
  isTentacle?: boolean;
  isStaticZone?: boolean;
  isZombie?: boolean;
  isWerewolf?: boolean;
  isWerewolfHot?: boolean;
  isDummy?: boolean;
  isDummyHot?: boolean;
  erectionLevel: number; // 0 to 1 (flaccid to erect)
  isErecting: boolean;
  zombieBiteCooldown?: number;
  werewolfBiteCooldown?: number;
  punchTimer?: number;
  punchLeftArm?: boolean;
  tentacleBiteCooldowns?: { [key: number]: number };
  zombieTargetLimbPos?: THREE.Vector3;
  zombieTargetLimbName?: BodyPartName;
  zombieGrabbedTargetId?: string;
  zombieGrabbedLimbName?: BodyPartName;
  zombieGrabDecisionTimer?: number;
  hotGrabTargetId?: string;
  hotGrabLimbLeft?: BodyPartName;
  hotGrabLimbRight?: BodyPartName;
  hotTargetHolePos?: THREE.Vector3;
  pelvisThrustCycle?: number;
  crouchOffset?: number;
  hasShirt?: boolean;
  shirtColorHex?: number;
  shirtBlanket?: { mesh: THREE.Mesh, vels: THREE.Vector3[], originalPos: THREE.Vector3[] };
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
  hairType?: string;
  hairColorHex?: number;
  beardType?: string;
  beardColorHex?: number;
  hatType?: string;
  hatColorHex?: number;
  glassesType?: string;
  glassesColorHex?: number;
  skinColorHex?: number;
  tentacleColorHex?: number;
  bustSway?: {
    bounceY: number;
    velY: number;
    pitch: number;
    velPitch: number;
    yaw: number;
    velYaw: number;
    roll: number;
    velRoll: number;
  };
  genitalSway?: {
    pitch: number;
    velPitch: number;
    yaw: number;
    velYaw: number;
    roll: number;
    velRoll: number;
  };
  fluidContractionBurstTimer?: number;
  fluidContractionIntensity?: number;
  stats: {
    brokenBones: number;
    dismemberedLimbs: number;
    bloodLossPercent: number;
    destroyedBlocks: number;
  };
  fatigue?: number;
  isSleeping?: boolean;
  faceFeatureMode?: FaceFeatureMode;
  faceFloatDepth?: number; // 0.0 to 0.15 depth offset for 3D blocky/pseudo eyes and mouth floating out of head
  eyeHolesEnabled?: boolean; // Forced bullet holes in both eyes
  pubicHairEnabled?: boolean; // Genital / pubic hair toggle
  pubicHairIntensity?: number; // Genital hair density / count intensity (1 to 10)
  hotNPCPose?: HotPoseType;
  hotNPCEmotions?: HotNPCEmotions;
  hotPoseTimer?: number;
  hotPoseDuration?: number;
}

export interface DoorVoxelBlock {
  id: string;
  localPos: THREE.Vector3;
  size: number;
  color: number;
  active: boolean;
  mesh?: THREE.Mesh;
  col?: number;
  row?: number;
  width?: number;
  height?: number;
  depth?: number;
}

export interface DynamicPropBlock {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  avx: number;
  avy: number;
  avz: number;
  width: number;
  height: number;
  depth: number;
  color: number;
  mesh: THREE.Mesh;
  life: number;
  isSettled?: boolean;
}

export interface Door3D {
  id: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  hingeGroup: THREE.Group;
  doorGroup: THREE.Group;
  currentAngle: number;
  targetAngle: number;
  health: number;
  maxHealth: number;
  isDestroyed: boolean;
  voxelBlocks: DoorVoxelBlock[];
  handleMesh?: THREE.Mesh | THREE.Group;
  pseudoMesh?: THREE.Mesh;
}

export interface MovingPlatform3D {
  id: string;
  name: string;
  mesh: THREE.Group;
  x: number;
  y: number;
  z: number;
  startX: number;
  startY: number;
  startZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  width: number;
  height: number;
  depth: number;
  speed: number;
  progress: number;
  direction: number;
  vx: number;
  vy: number;
  vz: number;
  mass: number;
  color?: number;
  hazardStripes?: boolean;
  isCutter?: boolean;
  cutProgress?: Map<string, { progress: number; lastSphereTime: number; spheresCount: number }>;
}

export interface Bed3D {
  id: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  groupMesh: THREE.Group;
}

export interface Obstacle3D {
  id: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  color: number;
  type: 'ground' | 'wall' | 'platform';
  mesh?: THREE.Mesh;
}

export interface GameMap3D {
  id: string;
  name: string;
  description: string;
  width: number;
  depth: number;
  gravity: { x: number; y: number; z: number };
  obstacles: Obstacle3D[];
  spawnPoint: { x: number; y: number; z: number };
  theme: string;
}

export interface LiquidParticle3D extends Particle3D {
  liquidBodyId: string;
  attachedLimb?: {
    ragdollId: string;
    particleName: BodyPartName;
    localOffset: THREE.Vector3;
  };
  userData?: any;
}

export interface MaterialProperties {
  hardness: number;     // Dureza (0 - 100)
  resistance: number;   // Resistencia a rotura (0 - 100)
  density: number;      // Masa / Densidad (0 - 100)
  elasticity: number;   // Elasticidad / Rebote (0 - 100)
  health: number;       // Integridad / Salud (0 - 100)
  name: string;         // Nombre legible en español
}

export interface InspectedBlockInfo {
  name: string;
  blockState: number; // 1 to 100% material state
  hardness?: number;
  resistance: number;
  density: number;
  elasticity: number;
  health: number;
  timeRemaining: number; // 5 seconds timer
  x?: number;
  y?: number;
  z?: number;
}

export interface LiquidBody3D {
  id: string;
  particles: LiquidParticle3D[];
  color: number;
  sphericalContourLevel: number;
  contourLayerEnabled: boolean;
  groupMesh: THREE.Group;
}

export interface ElectroCubeSubBlock {
  id: string;
  gridX: number; // -1, 0, 1
  gridY: number; // -1, 0, 1
  gridZ: number; // -1, 0, 1
  baseLocalPos: THREE.Vector3;
  mesh: THREE.Mesh;
  active: boolean;
  color: number;
  size: number;
  blockState?: number; // 1 to 100% material state
}

export interface ElectroCube3D {
  id: string;
  x: number;
  y: number;
  z: number;
  size: number; // Total width/height/depth (normal block size ~0.9m)
  subBlockSize: number; // Size of each 3x3 sub-block (~0.29m)
  blockState: number; // 1 to 100% material state
  hardness?: number; // legacy compatibility
  viscosity?: number; // legacy compatibility
  electronegativity?: number;
  groupMesh: THREE.Group;
  pseudoMesh?: THREE.Mesh;
  subBlocks: ElectroCubeSubBlock[];
  resistance: number;
  density: number;
  elasticity: number;
  health: number;
  maxHealth: number;
  isDestroyed: boolean;
  wobblePhase: number;
}

