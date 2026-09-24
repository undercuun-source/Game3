export interface Vector2 {
  x: number;
  y: number;
}

export type BodyPartName =
  | 'cabeza'
  | 'cuello'
  | 'pechobase'
  | 'torso'
  | 'ombligo'
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
  | 'muslo_izq'
  | 'rodilla_izq'
  | 'antepierna_izq'
  | 'tobillo_izq'
  | 'pie_izq'
  | 'pie_izq_talon'
  | 'pie_izq_medio'
  | 'muslo_der'
  | 'rodilla_der'
  | 'antepierna_der'
  | 'tobillo_der'
  | 'pie_der'
  | 'pie_der_talon'
  | 'pie_der_medio';

export interface Particle {
  id: string;
  x: number;
  y: number;
  oldX: number;
  oldY: number;
  vx: number;
  vy: number;
  mass: number;
  radius: number;
  pinned: boolean;
  name: BodyPartName;
  parentRagdollId: string;
  health: number; // 0-100
  maxHealth: number;
  fractured: boolean;
  dismembered: boolean;
  color?: string;
  skinColor?: string;
  armor?: number; // 0-100 damage reduction
  isVital?: boolean; // head/neck/chest vital to life
  bleedingRate: number; // 0 to 10
  temperature?: number; // for acid/burn
  isAcidic?: boolean;
  isElectrified?: boolean;
}

export interface Constraint {
  id: string;
  p1: Particle;
  p2: Particle;
  length: number;
  stiffness: number; // 0-1
  breakForce: number; // Force threshold to tear/dismember
  broken: boolean;
  name: string;
  isLimb?: boolean;
  minAngle?: number;
  maxAngle?: number;
  color?: string;
  thickness?: number;
}

export interface AngleConstraint {
  p1: Particle; // e.g. shoulder
  pCenter: Particle; // e.g. elbow
  p2: Particle; // e.g. wrist
  minAngle: number;
  maxAngle: number;
  stiffness: number;
}

export interface BloodParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number; // 1.0 to 0
  decay: number;
  color: string;
  stainFloor: boolean;
}

export interface BloodDecal {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  color: string;
  angle: number;
  splatterType: 'circle' | 'drip' | 'burst';
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  pierce: number;
  range: number;
  traveled: number;
  caliber: '9mm' | '12gauge' | '7.62mm' | '50cal' | 'rocket' | 'laser';
  color: string;
  trail: { x: number; y: number }[];
}

export interface Explosion {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  force: number;
  damage: number;
  life: number;
  color: string;
}

export type PropType =
  | 'wooden_box'
  | 'metal_box'
  | 'explosive_barrel'
  | 'concrete_block'
  | 'spinning_blade'
  | 'hydraulic_press'
  | 'jump_pad'
  | 'spikes'
  | 'landmine'
  | 'c4_charge'
  | 'moving_platform'
  | 'block_tube'
  | 'block_tube_npc'
  | 'block_3x3'
  | 'block_arm'
  | 'block_leg'
  | 'block_hand'
  | 'block_head'
  | 'block_torso'
  | 'block_slime'
  | 'block_skin'
  | 'block_hammer';

export interface PropObject {
  id: string;
  type: PropType;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  angle: number;
  angularVelocity: number;
  mass: number;
  health: number;
  maxHealth: number;
  destroyed: boolean;
  pinned: boolean;
  color: string;
  extraState?: {
    exploded?: boolean;
    spinSpeed?: number;
    pressOffset?: number;
    pressDirection?: number;
    pressMaxTravel?: number;
    detonated?: boolean;
    armed?: boolean;
    flashTimer?: number;
  };
}

export type WeaponType =
  | 'physgun'
  | 'pistol'
  | 'shotgun'
  | 'ak47'
  | 'sniper'
  | 'rpg'
  | 'katana'
  | 'sledgehammer'
  | 'grenade'
  | 'c4'
  | 'syringe_adrenaline'
  | 'syringe_acid'
  | 'syringe_nitro'
  | 'syringe_antigrav';

export interface WeaponInfo {
  id: WeaponType;
  name: string;
  category: 'tool' | 'firearm' | 'melee' | 'explosive' | 'syringe';
  damage: number;
  fireRate: number; // delay in ms
  ammo: number;
  maxAmmo: number;
  description: string;
  iconName: string;
  color: string;
}

export type RagdollType = 'civilian' | 'swat' | 'mutant' | 'dummy' | 'golden';

export interface Ragdoll {
  id: string;
  type: RagdollType;
  name: string;
  particles: Particle[];
  constraints: Constraint[];
  isAlive: boolean;
  isStunned: boolean;
  isStanding: boolean;
  walkCycle: number;
  facing: 1 | -1; // 1 right, -1 left
  totalHealth: number;
  skinTone: string;
  clothesColor: string;
  pantsColor: string;
  shoeColor: string;
  armorColor?: string;
  scale: number;
  isControlled: boolean;
  speechText?: string;
  speechTimer?: number;
  heldWeapon?: WeaponType;
  stats: {
    brokenBones: number;
    dismemberedLimbs: number;
    bloodLossPercent: number;
  };
}

export interface MapObstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
  color: string;
  type: 'wall' | 'ground' | 'platform' | 'ramp' | 'hazard' | 'glass';
  destructible?: boolean;
  health?: number;
}

export interface GameMap {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  gravity: { x: number; y: number };
  obstacles: MapObstacle[];
  spawnPoint: { x: number; y: number };
  theme: 'lab' | 'stairs' | 'city' | 'zerog' | 'grinder';
}
