import * as RAPIER from '@dimforge/rapier3d-compat';

export class RapierManager {
  private static instance: RapierManager;
  public world: RAPIER.World;
  private initialized: boolean = false;
  private isStepping: boolean = false;
  private initializing: boolean = false;
  private envBody: RAPIER.RigidBody | null = null;
  private lastStaticBlocksHash: string = '';

  private constructor() {
    // We will initialize in init()
    this.world = null as any;
  }

  public async init() {
    if (this.initialized || this.initializing) return;
    this.initializing = true;
    try {
      await RAPIER.init();
      const gravity = { x: 0.0, y: -20.0, z: 0.0 };
      this.world = new RAPIER.World(gravity);
      this.world.timestep = 0.016;
      this.world.numSolverIterations = 8;
      this.world.numInternalPgsIterations = 1;
      
      // Infinite Ground Plane (Group 0: Environment)
      const groundDesc = RAPIER.RigidBodyDesc.fixed();
      const groundBody = this.world.createRigidBody(groundDesc);
      const groundColliderDesc = RAPIER.ColliderDesc.cuboid(1000, 1, 1000)
        .setTranslation(0, -1, 0) // Floor is at y=0, thickness of 1 below it
        .setCollisionGroups((0x0001 << 16) | 0xFFFF);
      this.world.createCollider(groundColliderDesc, groundBody);
      
      this.initialized = true;
    } finally {
      this.initializing = false;
    }
  }

  public static getInstance(): RapierManager {
    if (!RapierManager.instance) {
      RapierManager.instance = new RapierManager();
    }
    return RapierManager.instance;
  }

  public reset() {
    if (this.world) {
      this.world.free();
      this.world = null as any;
      this.envBody = null;
      this.lastStaticBlocksHash = '';
      this.initialized = false;
      this.init();
    }
  }

  public step(dt?: number) {
    if (!this.initialized || !this.world || this.isStepping) return;
    this.isStepping = true;
    try {
      if (dt !== undefined) {
        // Clamp timestep for stability
        this.world.timestep = Math.min(dt, 0.02);
      }
      this.world.step();
    } catch (e) {
      console.warn("Rapier step failed:", e);
    } finally {
      this.isStepping = false;
    }
  }

  public syncEnvironment(blocks: { x: number; y: number; z: number; w: number; h: number; d: number }[]) {
    if (!this.initialized || !this.world || this.isStepping) return;
    
    // Quick hash to skip redundant rebuilds when environment hasn't changed
    const hash = `${blocks.length}_${blocks[0]?.x.toFixed(1) || 0}_${blocks[blocks.length - 1]?.x.toFixed(1) || 0}`;
    if (this.envBody && hash === this.lastStaticBlocksHash) {
      return;
    }
    this.lastStaticBlocksHash = hash;

    this.isStepping = true;
    try {
      if (this.envBody) {
        this.world.removeRigidBody(this.envBody);
        this.envBody = null;
      }
      // Create one static body for all building blocks
      const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
      this.envBody = this.world.createRigidBody(rigidBodyDesc);

      for (const b of blocks) {
        // IMPORTANT: Rapier cuboid takes HALF-EXTENTS
        const colliderDesc = RAPIER.ColliderDesc.cuboid(
          Math.max(0.04, b.w / 2),
          Math.max(0.04, b.h / 2),
          Math.max(0.04, b.d / 2)
        ).setTranslation(b.x, b.y, b.z)
         .setFriction(1.0)
         .setRestitution(0.0)
         .setCollisionGroups((0x0001 << 16) | 0xFFFF);
        this.world.createCollider(colliderDesc, this.envBody);
      }
    } finally {
      this.isStepping = false;
    }
  }

  public setGravity(y: number) {
    if (!this.initialized || !this.world || this.isStepping) return;
    this.world.gravity = { x: 0.0, y, z: 0.0 };
  }
}
