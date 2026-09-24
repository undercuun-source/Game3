import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { BodyPartName, Particle3D, Ragdoll3D } from '../types/physics3d';

// Collision Filtering Bits
export const COLLISION_ENV = 1;
export const COLLISION_TORSO = 2;
export const COLLISION_PELVIS_TORSO = 2;
export const COLLISION_LIMB_L = 4;
export const COLLISION_LIMB_R = 8;
export const COLLISION_HEAD = 16;

export interface CannonLimbPart {
  name: string;
  body: CANNON.Body;
  partNames: BodyPartName[];
  localOffset?: THREE.Vector3;
}

export class CannonRagdoll {
  public id: string;
  public ragdoll: Ragdoll3D;
  public scale: number;
  public world: CANNON.World;

  public parts: Map<string, CannonLimbPart> = new Map();
  public constraints: CANNON.Constraint[] = [];
  public constraintMap: Map<string, CANNON.Constraint> = new Map();

  // Active Ragdoll State (Sin plugins - PD controller & locomotion motor)
  public isHumanoid: boolean = false;
  public walkPhase: number = 0;
  public isGrounded: boolean = false;
  public defaultPelvisHeight: number = 0.98;

  constructor(ragdoll: Ragdoll3D, world: CANNON.World, ragdollMat: CANNON.Material, scale: number = 1.0) {
    this.id = ragdoll.id;
    this.ragdoll = ragdoll;
    this.scale = Math.max(0.2, scale);
    this.world = world;
    this.defaultPelvisHeight = 0.98 * this.scale;

    this.buildSkeleton(ragdollMat);
  }

  private buildSkeleton(ragdollMat: CANNON.Material) {
    const s = this.scale;

    // Find reference spawn point from existing particles or default to (0, 0, 0)
    const pPelvis = this.ragdoll.particles.find((p) => p.name === 'pelvis');
    if (!pPelvis) {
      this.isHumanoid = false;
      return;
    }
    this.isHumanoid = true;

    const rootX = pPelvis.x;
    const rootY = pPelvis.y;
    const rootZ = pPelvis.z;

    const createBoxBody = (
      name: string,
      hw: number,
      hh: number,
      hd: number,
      mass: number,
      posX: number,
      posY: number,
      posZ: number,
      group: number,
      mask: number,
      partNames: BodyPartName[]
    ): CANNON.Body => {
      const shape = new CANNON.Box(new CANNON.Vec3(hw * s, hh * s, hd * s));
      const body = new CANNON.Body({
        mass: mass * s,
        shape,
        material: ragdollMat,
        linearDamping: 0.15,
        angularDamping: 0.35,
        collisionFilterGroup: group,
        collisionFilterMask: mask,
      });
      body.position.set(posX, posY, posZ);

      this.world.addBody(body);
      this.parts.set(name, { name, body, partNames });
      return body;
    };

    // Environment + Cross-limb collision masks:
    // Left limbs collide with Environment, Right limbs, and Torso
    // Right limbs collide with Environment, Left limbs, and Torso
    // Torso collides with Environment, Left limbs, and Right limbs
    const maskTorso = COLLISION_ENV | COLLISION_LIMB_L | COLLISION_LIMB_R;
    const maskLimbL = COLLISION_ENV | COLLISION_LIMB_R | COLLISION_TORSO;
    const maskLimbR = COLLISION_ENV | COLLISION_LIMB_L | COLLISION_TORSO;
    const maskHead = COLLISION_ENV;

    // 1. Pelvis
    const pelvis = createBoxBody(
      'pelvis',
      0.19, 0.08, 0.12,
      6.0,
      rootX, rootY, rootZ,
      COLLISION_PELVIS_TORSO, maskTorso,
      ['pelvis', 'ombligo_bajo']
    );

    // 2. Mid Spine (Ombligo / Torso)
    const spine = createBoxBody(
      'spine',
      0.18, 0.11, 0.11,
      5.5,
      rootX, rootY + 0.24 * s, rootZ,
      COLLISION_PELVIS_TORSO, maskTorso,
      ['ombligo', 'torso']
    );

    // 3. Chest (Pechobase / Pecho Bajo)
    const chest = createBoxBody(
      'chest',
      0.20, 0.12, 0.12,
      6.5,
      rootX, rootY + 0.48 * s, rootZ,
      COLLISION_PELVIS_TORSO, maskTorso,
      ['pecho_bajo', 'pechobase', 'cuello']
    );

    // 4. Head (Cabeza)
    const head = createBoxBody(
      'head',
      0.14, 0.14, 0.14,
      4.0,
      rootX, rootY + 0.78 * s, rootZ,
      COLLISION_HEAD, maskHead,
      ['cabeza']
    );

    // 5. Left Arm: Upper arm, Forearm, Hand
    const upperArmL = createBoxBody(
      'upperArmL',
      0.06, 0.13, 0.06,
      1.8,
      rootX - 0.28 * s, rootY + 0.46 * s, rootZ,
      COLLISION_LIMB_L, maskLimbL,
      ['hombro_izq', 'brazo_izq']
    );
    const lowerArmL = createBoxBody(
      'lowerArmL',
      0.05, 0.13, 0.05,
      1.4,
      rootX - 0.28 * s, rootY + 0.18 * s, rootZ,
      COLLISION_LIMB_L, maskLimbL,
      ['codo_izq', 'antebrazo_izq']
    );
    const handL = createBoxBody(
      'handL',
      0.04, 0.07, 0.04,
      0.7,
      rootX - 0.28 * s, rootY - 0.04 * s, rootZ,
      COLLISION_LIMB_L, maskLimbL,
      [
        'muneca_izq', 'mano_izq',
        'dedo_pulgar_izq', 'dedo_pulgar_izq_seg2', 'dedo_pulgar_izq_seg3',
        'dedo_indice_izq', 'dedo_indice_izq_seg2', 'dedo_indice_izq_seg3',
        'dedo_medio_izq', 'dedo_medio_izq_seg2', 'dedo_medio_izq_seg3',
        'dedo_anular_izq', 'dedo_anular_izq_seg2', 'dedo_anular_izq_seg3',
        'dedo_menique_izq', 'dedo_menique_izq_seg2', 'dedo_menique_izq_seg3'
      ]
    );

    // 6. Right Arm: Upper arm, Forearm, Hand
    const upperArmR = createBoxBody(
      'upperArmR',
      0.06, 0.13, 0.06,
      1.8,
      rootX + 0.28 * s, rootY + 0.46 * s, rootZ,
      COLLISION_LIMB_R, maskLimbR,
      ['hombro_der', 'brazo_der']
    );
    const lowerArmR = createBoxBody(
      'lowerArmR',
      0.05, 0.13, 0.05,
      1.4,
      rootX + 0.28 * s, rootY + 0.18 * s, rootZ,
      COLLISION_LIMB_R, maskLimbR,
      ['codo_der', 'antebrazo_der']
    );
    const handR = createBoxBody(
      'handR',
      0.04, 0.07, 0.04,
      0.7,
      rootX + 0.28 * s, rootY - 0.04 * s, rootZ,
      COLLISION_LIMB_R, maskLimbR,
      [
        'muneca_der', 'mano_der',
        'dedo_pulgar_der', 'dedo_pulgar_der_seg2', 'dedo_pulgar_der_seg3',
        'dedo_indice_der', 'dedo_indice_der_seg2', 'dedo_indice_der_seg3',
        'dedo_medio_der', 'dedo_medio_der_seg2', 'dedo_medio_der_seg3',
        'dedo_anular_der', 'dedo_anular_der_seg2', 'dedo_anular_der_seg3',
        'dedo_menique_der', 'dedo_menique_der_seg2', 'dedo_menique_der_seg3'
      ]
    );

    // 7. Left Leg: Upper leg (Thigh), Lower leg (Shin), Foot
    const upperLegL = createBoxBody(
      'upperLegL',
      0.08, 0.18, 0.08,
      4.5,
      rootX - 0.12 * s, rootY - 0.26 * s, rootZ,
      COLLISION_LIMB_L, maskLimbL,
      ['muslo_izq']
    );
    const lowerLegL = createBoxBody(
      'lowerLegL',
      0.07, 0.18, 0.07,
      3.5,
      rootX - 0.12 * s, rootY - 0.64 * s, rootZ,
      COLLISION_LIMB_L, maskLimbL,
      ['rodilla_izq', 'antepierna_izq']
    );
    const footL = createBoxBody(
      'footL',
      0.06, 0.05, 0.11,
      1.5,
      rootX - 0.12 * s, rootY - 0.89 * s, rootZ + 0.03 * s,
      COLLISION_LIMB_L, maskLimbL,
      [
        'tobillo_izq', 'pie_izq_talon', 'pie_izq_medio', 'pie_izq',
        'dedo_pie_pulgar_izq', 'dedo_pie_indice_izq', 'dedo_pie_medio_izq',
        'dedo_pie_anular_izq', 'dedo_pie_menique_izq'
      ]
    );

    // 8. Right Leg: Upper leg (Thigh), Lower leg (Shin), Foot
    const upperLegR = createBoxBody(
      'upperLegR',
      0.08, 0.18, 0.08,
      4.5,
      rootX + 0.12 * s, rootY - 0.26 * s, rootZ,
      COLLISION_LIMB_R, maskLimbR,
      ['muslo_der']
    );
    const lowerLegR = createBoxBody(
      'lowerLegR',
      0.07, 0.18, 0.07,
      3.5,
      rootX + 0.12 * s, rootY - 0.64 * s, rootZ,
      COLLISION_LIMB_R, maskLimbR,
      ['rodilla_der', 'antepierna_der']
    );
    const footR = createBoxBody(
      'footR',
      0.06, 0.05, 0.11,
      1.5,
      rootX + 0.12 * s, rootY - 0.89 * s, rootZ + 0.03 * s,
      COLLISION_LIMB_R, maskLimbR,
      [
        'tobillo_der', 'pie_der_talon', 'pie_der_medio', 'pie_der',
        'dedo_pie_pulgar_der', 'dedo_pie_indice_der', 'dedo_pie_medio_der',
        'dedo_pie_anular_der', 'dedo_pie_menique_der'
      ]
    );

    // ==========================================
    // CONSTRAINTS & ANATOMICAL JOINT LIMITS
    // ==========================================

    const addCone = (
      name: string,
      bA: CANNON.Body,
      bB: CANNON.Body,
      pA: CANNON.Vec3,
      pB: CANNON.Vec3,
      angle: number,
      twistAngle: number
    ) => {
      const c = new CANNON.ConeTwistConstraint(bA, bB, {
        pivotA: pA,
        pivotB: pB,
        axisA: new CANNON.Vec3(0, 1, 0),
        axisB: new CANNON.Vec3(0, 1, 0),
        angle,
        twistAngle,
        collideConnected: false,
      });
      this.world.addConstraint(c);
      this.constraints.push(c);
      this.constraintMap.set(name, c);
      return c;
    };

    const addHinge = (
      name: string,
      bA: CANNON.Body,
      bB: CANNON.Body,
      pA: CANNON.Vec3,
      pB: CANNON.Vec3,
      axisA: CANNON.Vec3,
      axisB: CANNON.Vec3,
      lowerLimit?: number,
      upperLimit?: number
    ) => {
      const c = new CANNON.HingeConstraint(bA, bB, {
        pivotA: pA,
        pivotB: pB,
        axisA,
        axisB,
        collideConnected: false,
      });
      if (lowerLimit !== undefined && upperLimit !== undefined) {
        (c as any).lowerLimit = lowerLimit;
        (c as any).upperLimit = upperLimit;
      }
      this.world.addConstraint(c);
      this.constraints.push(c);
      this.constraintMap.set(name, c);
      return c;
    };

    // Spine joints: Pelvis <-> Spine <-> Chest
    addCone(
      'pelvis_spine',
      pelvis, spine,
      new CANNON.Vec3(0, 0.10 * s, 0),
      new CANNON.Vec3(0, -0.12 * s, 0),
      0.22, 0.18
    );
    addCone(
      'spine_chest',
      spine, chest,
      new CANNON.Vec3(0, 0.12 * s, 0),
      new CANNON.Vec3(0, -0.13 * s, 0),
      0.22, 0.18
    );

    // Neck: Chest <-> Head
    addCone(
      'chest_head',
      chest, head,
      new CANNON.Vec3(0, 0.16 * s, 0),
      new CANNON.Vec3(0, -0.16 * s, 0),
      0.40, 0.35
    );

    // Left Arm Joints:
    // Shoulder: Chest <-> Upper Arm
    addCone(
      'chest_upperArmL',
      chest, upperArmL,
      new CANNON.Vec3(-0.24 * s, 0.08 * s, 0),
      new CANNON.Vec3(0, 0.14 * s, 0),
      0.85, 0.50
    );
    // Left Elbow: Hinge bending ONLY forward/inward (0 to 135 degrees)
    addHinge(
      'upperArmL_lowerArmL',
      upperArmL, lowerArmL,
      new CANNON.Vec3(0, -0.14 * s, 0),
      new CANNON.Vec3(0, 0.14 * s, 0),
      new CANNON.Vec3(-1, 0, 0),
      new CANNON.Vec3(-1, 0, 0),
      0.0, 2.35
    );
    // Left Wrist: Lower Arm <-> Hand
    addCone(
      'lowerArmL_handL',
      lowerArmL, handL,
      new CANNON.Vec3(0, -0.14 * s, 0),
      new CANNON.Vec3(0, 0.07 * s, 0),
      0.30, 0.20
    );

    // Right Arm Joints:
    // Shoulder: Chest <-> Upper Arm
    addCone(
      'chest_upperArmR',
      chest, upperArmR,
      new CANNON.Vec3(0.24 * s, 0.08 * s, 0),
      new CANNON.Vec3(0, 0.14 * s, 0),
      0.85, 0.50
    );
    // Right Elbow: Hinge bending ONLY forward/inward (0 to 135 degrees)
    addHinge(
      'upperArmR_lowerArmR',
      upperArmR, lowerArmR,
      new CANNON.Vec3(0, -0.14 * s, 0),
      new CANNON.Vec3(0, 0.14 * s, 0),
      new CANNON.Vec3(1, 0, 0),
      new CANNON.Vec3(1, 0, 0),
      0.0, 2.35
    );
    // Right Wrist: Lower Arm <-> Hand
    addCone(
      'lowerArmR_handR',
      lowerArmR, handR,
      new CANNON.Vec3(0, -0.14 * s, 0),
      new CANNON.Vec3(0, 0.07 * s, 0),
      0.30, 0.20
    );

    // Left Leg Joints:
    // Hip: Pelvis <-> Upper Leg
    addCone(
      'pelvis_upperLegL',
      pelvis, upperLegL,
      new CANNON.Vec3(-0.12 * s, -0.09 * s, 0),
      new CANNON.Vec3(0, 0.19 * s, 0),
      0.45, 0.20
    );
    // Left Knee: Hinge bending ONLY backward (0 to 135 degrees)
    addHinge(
      'upperLegL_lowerLegL',
      upperLegL, lowerLegL,
      new CANNON.Vec3(0, -0.19 * s, 0),
      new CANNON.Vec3(0, 0.19 * s, 0),
      new CANNON.Vec3(1, 0, 0),
      new CANNON.Vec3(1, 0, 0),
      0.0, 2.35
    );
    // Left Ankle: Lower Leg <-> Foot
    addCone(
      'lowerLegL_footL',
      lowerLegL, footL,
      new CANNON.Vec3(0, -0.19 * s, 0),
      new CANNON.Vec3(0, 0.05 * s, -0.03 * s),
      0.28, 0.15
    );

    // Right Leg Joints:
    // Hip: Pelvis <-> Upper Leg
    addCone(
      'pelvis_upperLegR',
      pelvis, upperLegR,
      new CANNON.Vec3(0.12 * s, -0.09 * s, 0),
      new CANNON.Vec3(0, 0.19 * s, 0),
      0.45, 0.20
    );
    // Right Knee: Hinge bending ONLY backward (0 to 135 degrees)
    addHinge(
      'upperLegR_lowerLegR',
      upperLegR, lowerLegR,
      new CANNON.Vec3(0, -0.19 * s, 0),
      new CANNON.Vec3(0, 0.19 * s, 0),
      new CANNON.Vec3(1, 0, 0),
      new CANNON.Vec3(1, 0, 0),
      0.0, 2.35
    );
    // Right Ankle: Lower Leg <-> Foot
    addCone(
      'lowerLegR_footR',
      lowerLegR, footR,
      new CANNON.Vec3(0, -0.19 * s, 0),
      new CANNON.Vec3(0, 0.05 * s, -0.03 * s),
      0.28, 0.15
    );
  }

  // Active Ragdoll Physics Controller (Sin plugins! Pure PD Torque & Walking Loop)
  public updateActive(
    dt: number,
    inputMoveVector?: THREE.Vector3,
    cameraForward?: THREE.Vector3,
    cameraRight?: THREE.Vector3,
    isControlled?: boolean
  ) {
    if (!this.isHumanoid) return;

    // If dead or collapsed, do not apply active forces: pure passive ragdoll falls naturally!
    if (!this.ragdoll.isAlive || this.ragdoll.isCollapsed || !this.ragdoll.isWalkingRagdoll) {
      return;
    }

    const pelvisPart = this.parts.get('pelvis');
    const spinePart = this.parts.get('spine');
    const chestPart = this.parts.get('chest');
    const thighL = this.parts.get('upperLegL');
    const thighR = this.parts.get('upperLegR');
    const shinL = this.parts.get('lowerLegL');
    const shinR = this.parts.get('lowerLegR');
    const footL = this.parts.get('footL');
    const footR = this.parts.get('footR');
    const armL = this.parts.get('upperArmL');
    const armR = this.parts.get('upperArmR');

    if (!pelvisPart || !spinePart || !chestPart) return;

    const pelvis = pelvisPart.body;
    const spine = spinePart.body;
    const chest = chestPart.body;

    // 1. Upright Balancer (PD controller on Pelvis & Spine)
    const currentUp = pelvis.quaternion.vmult(new CANNON.Vec3(0, 1, 0));
    const worldUp = new CANNON.Vec3(0, 1, 0);
    const tiltAxis = currentUp.cross(worldUp); // magnitude is sin(theta)

    const kpTilt = 320 * this.scale;
    const kdTilt = 45 * this.scale;
    const uprightTorque = tiltAxis.scale(kpTilt).vsub(pelvis.angularVelocity.scale(kdTilt));
    pelvis.torque.vadd(uprightTorque, pelvis.torque);
    spine.torque.vadd(uprightTorque.scale(0.5), spine.torque);

    // 2. Facing Angle / Yaw Alignment
    const facing = this.ragdoll.facingAngle || 0;
    const curFwd = pelvis.quaternion.vmult(new CANNON.Vec3(0, 0, 1));
    const targetFwd = new CANNON.Vec3(Math.sin(facing), 0, Math.cos(facing));
    const yawError = curFwd.cross(targetFwd).y;
    const kpYaw = 160 * this.scale;
    const kdYaw = 25 * this.scale;
    pelvis.torque.y += yawError * kpYaw - pelvis.angularVelocity.y * kdYaw;

    // 3. Ground Proximity & Suspension Spring
    const lowestFootY = Math.min(
      footL ? footL.body.position.y : pelvis.position.y,
      footR ? footR.body.position.y : pelvis.position.y
    );
    this.isGrounded = lowestFootY <= 0.18 * this.scale;

    if (this.isGrounded) {
      const targetY = lowestFootY + this.defaultPelvisHeight;
      const heightErr = targetY - pelvis.position.y;
      const kpHeight = 450 * this.scale;
      const kdHeight = 60 * this.scale;
      const totalMass = 35 * this.scale;
      const gravityComp = totalMass * 16.0;
      const suspensionForceY = Math.max(0, heightErr * kpHeight - pelvis.velocity.y * kdHeight + gravityComp);
      pelvis.applyForce(new CANNON.Vec3(0, suspensionForceY, 0), pelvis.position);
    }

    // 4. Locomotion / Walking Cycle
    const hasMoveInput = isControlled && inputMoveVector && inputMoveVector.lengthSq() > 0.01;
    let moveSpeed = 0;
    let moveDir = new CANNON.Vec3(0, 0, 0);

    if (hasMoveInput && cameraForward && cameraRight) {
      const dirX = cameraForward.x * -inputMoveVector.z + cameraRight.x * inputMoveVector.x;
      const dirZ = cameraForward.z * -inputMoveVector.z + cameraRight.z * inputMoveVector.x;
      const len = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
      moveDir.set(dirX / len, 0, dirZ / len);
      moveSpeed = 3.6;

      // Update facing angle smoothly
      this.ragdoll.facingAngle = Math.atan2(moveDir.x, moveDir.z);
    } else if (this.ragdoll.charVel && this.ragdoll.charVel.lengthSq() > 0.01) {
      const cv = this.ragdoll.charVel;
      const len = Math.sqrt(cv.x * cv.x + cv.z * cv.z) || 1;
      moveDir.set(cv.x / len, 0, cv.z / len);
      moveSpeed = Math.min(len, 4.0);
    }

    if (moveSpeed > 0.1) {
      // Advance walk phase
      this.walkPhase += dt * 18.0;

      // Accelerate horizontal velocity
      const targetVx = moveDir.x * moveSpeed;
      const targetVz = moveDir.z * moveSpeed;
      pelvis.velocity.x += (targetVx - pelvis.velocity.x) * Math.min(1.0, dt * 12.0);
      pelvis.velocity.z += (targetVz - pelvis.velocity.z) * Math.min(1.0, dt * 12.0);

      // Swing thighs and flex knees dynamically
      const swingPower = 40.0 * this.scale;
      const swingL = Math.sin(this.walkPhase) * swingPower;
      const swingR = -Math.sin(this.walkPhase) * swingPower;

      if (thighL) thighL.body.torque.x += swingL;
      if (thighR) thighR.body.torque.x += swingR;

      // Knee flexion during forward swing (flex backward, positive theta rotation)
      if (shinL && swingL > 0) shinL.body.torque.x += swingL * 0.8;
      if (shinR && swingR > 0) shinR.body.torque.x += swingR * 0.8;

      // Arm swing in opposition to legs
      const armSwing = 18.0 * this.scale;
      if (armL) armL.body.torque.x -= swingL * (armSwing / swingPower);
      if (armR) armR.body.torque.x -= swingR * (armSwing / swingPower);
    } else {
      // Idle Standing Pose Restorers (Legs straight, slightly damped)
      if (thighL) thighL.body.angularVelocity.scale(0.85, thighL.body.angularVelocity);
      if (thighR) thighR.body.angularVelocity.scale(0.85, thighR.body.angularVelocity);
      if (shinL) shinL.body.angularVelocity.scale(0.85, shinL.body.angularVelocity);
      if (shinR) shinR.body.angularVelocity.scale(0.85, shinR.body.angularVelocity);
      if (armL) armL.body.angularVelocity.scale(0.85, armL.body.angularVelocity);
      if (armR) armR.body.angularVelocity.scale(0.85, armR.body.angularVelocity);
    }
  }

  // Enforce strict anatomical joint limits on Cannon.js bodies post-step (prevents unnatural reverse bending & inverted twisting)
  public enforceJointLimits() {
    const thighL = this.parts.get('upperLegL');
    const shinL = this.parts.get('lowerLegL');
    const thighR = this.parts.get('upperLegR');
    const shinR = this.parts.get('lowerLegR');

    const armL = this.parts.get('upperArmL');
    const foreL = this.parts.get('lowerArmL');
    const handL = this.parts.get('handL');
    const armR = this.parts.get('upperArmR');
    const foreR = this.parts.get('lowerArmR');
    const handR = this.parts.get('handR');

    const footL = this.parts.get('footL');
    const footR = this.parts.get('footR');

    const pelvis = this.parts.get('pelvis');
    const spine = this.parts.get('spine');
    const chest = this.parts.get('chest');
    const head = this.parts.get('head');

    // Helper to clamp single-axis hinge joint (knees & elbows)
    const clampHinge = (
      parentPart: any,
      childPart: any,
      minAngle: number,
      maxAngle: number,
      axisSign: number = 1.0
    ) => {
      if (!parentPart || !childPart) return;
      const qParent = parentPart.body.quaternion;
      const qChild = childPart.body.quaternion;

      const qParentConj = new CANNON.Quaternion();
      qParent.conjugate(qParentConj);

      const qRel = qParentConj.mult(qChild);

      // Angle of rotation around the local X-axis
      let theta = 2 * Math.atan2(axisSign * qRel.x, qRel.w);
      if (theta > Math.PI) theta -= 2 * Math.PI;
      if (theta < -Math.PI) theta += 2 * Math.PI;

      let clamped = false;
      if (theta < minAngle) {
        theta = minAngle;
        clamped = true;
      } else if (theta > maxAngle) {
        theta = maxAngle;
        clamped = true;
      }

      // Check if out-of-plane twist is leaking (Y/Z components)
      const nonHingeMag = Math.sqrt(qRel.y * qRel.y + qRel.z * qRel.z);
      if (nonHingeMag > 0.45) {
        clamped = true;
      }

      if (clamped) {
        const halfTheta = (theta * axisSign) / 2;
        const qRelClamped = new CANNON.Quaternion(
          Math.sin(halfTheta),
          0,
          0,
          Math.cos(halfTheta)
        );
        qParent.mult(qRelClamped, qChild);

        // Smoothly damp velocity around limits rather than hard locking
        childPart.body.angularVelocity.scale(0.85, childPart.body.angularVelocity);
      }
    };

    // 1. Knees: bend backward ONLY (0 to 2.45 rad, ~140 degrees)
    clampHinge(thighL, shinL, -0.05, 2.45, 1.0);
    clampHinge(thighR, shinR, -0.05, 2.45, 1.0);

    // 2. Elbows: bend forward/inward ONLY (0 to 2.45 rad, ~140 degrees)
    clampHinge(armL, foreL, -0.05, 2.45, -1.0);
    clampHinge(armR, foreR, -0.05, 2.45, 1.0);

    // 3. Spine / Neck: prevent backward hyperextension or inverted twisting
    const clampConeBend = (parentPart: any, childPart: any, maxConeAngle: number) => {
      if (!parentPart || !childPart) return;
      const qParent = parentPart.body.quaternion;
      const qChild = childPart.body.quaternion;

      const qParentConj = new CANNON.Quaternion();
      qParent.conjugate(qParentConj);

      const qRel = qParentConj.mult(qChild);

      const childYLocal = qRel.vmult(new CANNON.Vec3(0, 1, 0));
      const dot = CANNON.Vec3.UNIT_Y.dot(childYLocal);
      const clampedDot = Math.min(1.0, Math.max(-1.0, dot));
      const angle = Math.acos(clampedDot);

      if (angle > maxConeAngle) {
        const axis = CANNON.Vec3.UNIT_Y.cross(childYLocal);
        const lenSq = axis.x * axis.x + axis.y * axis.y + axis.z * axis.z;
        if (lenSq > 0.00001) {
          axis.normalize();
          const halfLimit = maxConeAngle / 2;
          const qRelClamped = new CANNON.Quaternion(
            axis.x * Math.sin(halfLimit),
            axis.y * Math.sin(halfLimit),
            axis.z * Math.sin(halfLimit),
            Math.cos(halfLimit)
          );
          qParent.mult(qRelClamped, qChild);
          childPart.body.angularVelocity.scale(0.9, childPart.body.angularVelocity);
        }
      }
    };

    clampConeBend(pelvis, spine, 0.40); // ~23 degrees max spine bend
    clampConeBend(spine, chest, 0.40);  // ~23 degrees max chest bend
    clampConeBend(chest, head, 0.55);   // ~32 degrees max neck bend

    // 4. Hips & Shoulders cone limits (smooth leg swing and arm swing)
    clampConeBend(pelvis, thighL, 1.25);
    clampConeBend(pelvis, thighR, 1.25);
    clampConeBend(chest, armL, 1.45);
    clampConeBend(chest, armR, 1.45);

    // 5. Wrists & Hands cone limits
    clampConeBend(foreL, handL, 0.65);
    clampConeBend(foreR, handR, 0.65);

    // 6. Feet & Ankles cone limits
    clampConeBend(shinL, footL, 0.75);
    clampConeBend(shinR, footR, 0.75);
  }

  // Backward compatibility wrapper
  public enforceKneeLimits() {
    this.enforceJointLimits();
  }

  // Handle Dragging Particle Interactions
  public handleDragging() {
    if (!this.isHumanoid) return;
    for (const p of this.ragdoll.particles) {
      if (p.dragTargetPos) {
        // Find which Cannon body corresponds to this particle
        for (const limb of this.parts.values()) {
          if (limb.partNames.includes(p.name)) {
            const body = limb.body;
            const diffX = p.dragTargetPos.x - body.position.x;
            const diffY = p.dragTargetPos.y - body.position.y;
            const diffZ = p.dragTargetPos.z - body.position.z;

            // Velocity-drive towards target
            body.velocity.set(diffX * 18.0, diffY * 18.0, diffZ * 18.0);
            body.wakeUp();
            break;
          }
        }
      }
    }
  }

  // Dismemberment update: remove constraints if limbs are severed
  public updateDismemberment() {
    if (!this.isHumanoid) return;
    for (const p of this.ragdoll.particles) {
      if (p.dismembered) {
        if (p.name === 'cabeza') {
          this.removeConstraint('chest_head');
        } else if (p.name === 'brazo_izq' || p.name === 'hombro_izq') {
          this.removeConstraint('chest_upperArmL');
        } else if (p.name === 'antebrazo_izq' || p.name === 'codo_izq') {
          this.removeConstraint('upperArmL_lowerArmL');
        } else if (p.name === 'mano_izq' || p.name === 'muneca_izq') {
          this.removeConstraint('lowerArmL_handL');
        } else if (p.name === 'brazo_der' || p.name === 'hombro_der') {
          this.removeConstraint('chest_upperArmR');
        } else if (p.name === 'antebrazo_der' || p.name === 'codo_der') {
          this.removeConstraint('upperArmR_lowerArmR');
        } else if (p.name === 'mano_der' || p.name === 'muneca_der') {
          this.removeConstraint('lowerArmR_handR');
        } else if (p.name === 'muslo_izq') {
          this.removeConstraint('pelvis_upperLegL');
        } else if (p.name === 'antepierna_izq' || p.name === 'rodilla_izq') {
          this.removeConstraint('upperLegL_lowerLegL');
        } else if (p.name === 'pie_izq' || p.name === 'tobillo_izq') {
          this.removeConstraint('lowerLegL_footL');
        } else if (p.name === 'muslo_der') {
          this.removeConstraint('pelvis_upperLegR');
        } else if (p.name === 'antepierna_der' || p.name === 'rodilla_der') {
          this.removeConstraint('upperLegR_lowerLegR');
        } else if (p.name === 'pie_der' || p.name === 'tobillo_der') {
          this.removeConstraint('lowerLegR_footR');
        }
      }
    }
  }

  private removeConstraint(name: string) {
    const c = this.constraintMap.get(name);
    if (c) {
      this.world.removeConstraint(c);
      this.constraintMap.delete(name);
      const idx = this.constraints.indexOf(c);
      if (idx !== -1) this.constraints.splice(idx, 1);
    }
  }

  // Align Cannon bodies to the current particle positions (used when transitioning to ragdoll)
  public alignBodiesToParticles() {
    if (!this.isHumanoid) return;
    const facing = this.ragdoll.facingAngle || 0;
    const facingQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), facing);

    for (const limb of this.parts.values()) {
      let sumX = 0, sumY = 0, sumZ = 0, count = 0;
      let sumVx = 0, sumVy = 0, sumVz = 0;
      let refQuat: THREE.Quaternion | undefined;

      for (const pName of limb.partNames) {
        const p = this.ragdoll.particles.find((pt) => pt.name === pName);
        if (p) {
          sumX += p.x;
          sumY += p.y;
          sumZ += p.z;
          sumVx += p.vx || 0;
          sumVy += p.vy || 0;
          sumVz += p.vz || 0;
          count++;
          if (!refQuat && p.mesh && p.mesh.quaternion) {
            refQuat = p.mesh.quaternion;
          }
        }
      }

      if (count > 0) {
        limb.body.position.set(sumX / count, sumY / count, sumZ / count);

        const qToUse = refQuat || facingQuat;
        limb.body.quaternion.set(qToUse.x, qToUse.y, qToUse.z, qToUse.w);

        const avgVx = count > 0 ? sumVx / count : 0;
        const avgVy = count > 0 ? sumVy / count : 0;
        const avgVz = count > 0 ? sumVz / count : 0;

        const charVx = this.ragdoll.charVel ? this.ragdoll.charVel.x : 0;
        const charVy = this.ragdoll.charVel ? this.ragdoll.charVel.y : 0;
        const charVz = this.ragdoll.charVel ? this.ragdoll.charVel.z : 0;

        const finalVx = avgVx !== 0 ? avgVx : charVx;
        const finalVy = avgVy !== 0 ? avgVy : charVy;
        const finalVz = avgVz !== 0 ? avgVz : charVz;

        limb.body.velocity.set(finalVx, finalVy, finalVz);
        limb.body.angularVelocity.set(0, 0, 0);
        limb.body.wakeUp();
      }
    }
  }

  // Apply Impulse to specific body part
  public applyImpulse(partName: BodyPartName, impulse: THREE.Vector3, worldPoint?: THREE.Vector3) {
    if (!this.isHumanoid) return;
    for (const limb of this.parts.values()) {
      if (limb.partNames.includes(partName)) {
        const body = limb.body;
        const imp = new CANNON.Vec3(impulse.x, impulse.y, impulse.z);
        const pt = worldPoint
          ? new CANNON.Vec3(worldPoint.x, worldPoint.y, worldPoint.z)
          : body.position;
        body.applyImpulse(imp, pt);
        body.wakeUp();
        break;
      }
    }
  }

  // Synchronize Cannon.js bodies back to Ragdoll3D particles and Three.js meshes
  public syncToRagdoll() {
    if (!this.isHumanoid) return;
    const s = this.scale;

    for (const limb of this.parts.values()) {
      const body = limb.body;
      const bPos = body.position;
      const bQuat = body.quaternion;
      const bodyQuat = new THREE.Quaternion(bQuat.x, bQuat.y, bQuat.z, bQuat.w);

      for (const pName of limb.partNames) {
        const p = this.ragdoll.particles.find((pt) => pt.name === pName);
        if (!p) continue;

        // Calculate anatomical 3D offsets within compound limb bodies
        let offX = 0;
        let offY = 0;
        let offZ = 0;
        if (pName === 'ombligo_bajo') offY = 0.08 * s;
        else if (pName === 'pecho_bajo') offY = -0.06 * s;
        else if (pName === 'cuello') offY = 0.12 * s;
        else if (pName === 'codo_izq' || pName === 'codo_der') offY = 0.12 * s;
        else if (pName === 'muneca_izq' || pName === 'muneca_der') offY = 0.06 * s;
        else if (pName === 'rodilla_izq' || pName === 'rodilla_der') offY = 0.15 * s;
        else if (pName === 'tobillo_izq' || pName === 'tobillo_der') offY = 0.035 * s;
        else if (pName === 'pie_izq_talon' || pName === 'pie_der_talon') offZ = -0.06 * s;
        else if (pName === 'pie_izq' || pName === 'pie_der') offZ = 0.06 * s;
        else if (pName.startsWith('dedo_pie_')) {
          offZ = 0.12 * s;
          const isL = pName.includes('_izq');
          let toeX = 0.0;
          if (pName.includes('pulgar')) toeX = -0.04;
          else if (pName.includes('indice')) toeX = -0.02;
          else if (pName.includes('anular')) toeX = 0.02;
          else if (pName.includes('menique')) toeX = 0.04;
          offX = (isL ? toeX : -toeX) * s;
        } else if (pName.startsWith('dedo_')) {
          offY = -0.05 * s;
        }

        p.oldX = p.x;
        p.oldY = p.y;
        p.oldZ = p.z;

        if (offX !== 0 || offY !== 0 || offZ !== 0) {
          const localOff = new THREE.Vector3(offX, offY, offZ).applyQuaternion(bodyQuat);
          p.x = bPos.x + localOff.x;
          p.y = bPos.y + localOff.y;
          p.z = bPos.z + localOff.z;
        } else {
          p.x = bPos.x;
          p.y = bPos.y;
          p.z = bPos.z;
        }

        p.vx = body.velocity.x;
        p.vy = body.velocity.y;
        p.vz = body.velocity.z;

        if (p.mesh) {
          p.mesh.position.set(p.x, p.y, p.z);
          p.mesh.quaternion.copy(bodyQuat);
        }
      }
    }
  }

  public destroy() {
    for (const c of this.constraints) {
      this.world.removeConstraint(c);
    }
    this.constraints = [];
    this.constraintMap.clear();

    for (const limb of this.parts.values()) {
      this.world.removeBody(limb.body);
    }
    this.parts.clear();
  }
}

export class CannonRagdollEngine {
  private static instance: CannonRagdollEngine;
  public world: CANNON.World;

  public groundMaterial: CANNON.Material;
  public ragdollMaterial: CANNON.Material;
  public groundBody: CANNON.Body;

  public cannonRagdolls: Map<string, CannonRagdoll> = new Map();
  private staticObstacleBodies: CANNON.Body[] = [];
  private lastObstacleHash: string = '';

  private constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -18.0, 0),
    });

    // Iterative PGS Solver
    (this.world.solver as CANNON.GSSolver).iterations = 12;
    (this.world.solver as CANNON.GSSolver).tolerance = 0.001;

    // Contact Materials
    this.groundMaterial = new CANNON.Material('ground');
    this.ragdollMaterial = new CANNON.Material('ragdoll');

    const groundRagdollContact = new CANNON.ContactMaterial(
      this.groundMaterial,
      this.ragdollMaterial,
      {
        friction: 0.85,
        restitution: 0.02,
        contactEquationStiffness: 1e7,
        contactEquationRelaxation: 3,
      }
    );
    this.world.addContactMaterial(groundRagdollContact);

    const ragdollSelfContact = new CANNON.ContactMaterial(
      this.ragdollMaterial,
      this.ragdollMaterial,
      {
        friction: 0.50,
        restitution: 0.0,
        contactEquationStiffness: 1e7,
        contactEquationRelaxation: 3,
      }
    );
    this.world.addContactMaterial(ragdollSelfContact);

    // Infinite Solid Ground Plane (Floor at y = 0)
    const groundShape = new CANNON.Plane();
    this.groundBody = new CANNON.Body({
      mass: 0,
      material: this.groundMaterial,
      collisionFilterGroup: COLLISION_ENV,
      collisionFilterMask: 0xFFFF,
    });
    this.groundBody.addShape(groundShape);
    this.groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this.world.addBody(this.groundBody);
  }

  public static getInstance(): CannonRagdollEngine {
    if (!CannonRagdollEngine.instance) {
      CannonRagdollEngine.instance = new CannonRagdollEngine();
    }
    return CannonRagdollEngine.instance;
  }

  public registerRagdoll(ragdoll: Ragdoll3D, scale: number = 1.0) {
    if (this.cannonRagdolls.has(ragdoll.id)) {
      this.unregisterRagdoll(ragdoll.id);
    }
    const cr = new CannonRagdoll(ragdoll, this.world, this.ragdollMaterial, scale);
    this.cannonRagdolls.set(ragdoll.id, cr);
    return cr;
  }

  public unregisterRagdoll(ragdollId: string) {
    const cr = this.cannonRagdolls.get(ragdollId);
    if (cr) {
      cr.destroy();
      this.cannonRagdolls.delete(ragdollId);
    }
  }

  public syncEnvironment(blocks: { x: number; y: number; z: number; w: number; h: number; d: number }[]) {
    const hash = `${blocks.length}_${blocks[0]?.x.toFixed(1) || 0}_${blocks[blocks.length - 1]?.x.toFixed(1) || 0}`;
    if (hash === this.lastObstacleHash) return;
    this.lastObstacleHash = hash;

    for (const body of this.staticObstacleBodies) {
      this.world.removeBody(body);
    }
    this.staticObstacleBodies = [];

    for (const b of blocks) {
      const hw = Math.max(0.05, b.w / 2);
      const hh = Math.max(0.05, b.h / 2);
      const hd = Math.max(0.05, b.d / 2);
      const body = new CANNON.Body({
        mass: 0,
        material: this.groundMaterial,
        shape: new CANNON.Box(new CANNON.Vec3(hw, hh, hd)),
        collisionFilterGroup: COLLISION_ENV,
        collisionFilterMask: 0xFFFF,
      });
      body.position.set(b.x, b.y, b.z);
      this.world.addBody(body);
      this.staticObstacleBodies.push(body);
    }
  }

  public step(
    dt: number,
    inputMoveVector?: THREE.Vector3,
    cameraForward?: THREE.Vector3,
    cameraRight?: THREE.Vector3,
    playerControlledRagdollId?: string
  ) {
    // 1. Update Active Controllers, Locomotion & Dragging ONLY for collapsed/dead ragdolls
    for (const cr of this.cannonRagdolls.values()) {
      const isControlled = cr.id === playerControlledRagdollId;
      const isRagdollActive = (!cr.ragdoll.isAlive || cr.ragdoll.isCollapsed) && !cr.ragdoll.isWalkingRagdoll;
      if (isRagdollActive) {
        cr.updateActive(dt, inputMoveVector, cameraForward, cameraRight, isControlled);
        cr.handleDragging();
        cr.updateDismemberment();
      }
    }

    // 2. Physics Simulation Step (Substepped for pristine stability)
    const fixedTimeStep = 1 / 60;
    this.world.step(fixedTimeStep, Math.min(dt, 0.05), 3);

    // 2b. Enforce strict anatomical joint limits post-step (knees, elbows, hips, shoulders, spine, neck)
    for (const cr of this.cannonRagdolls.values()) {
      cr.enforceJointLimits();
    }

    // 3. Synchronize Bodies to Particles and Meshes ONLY if in dead/collapsed ragdoll mode
    for (const cr of this.cannonRagdolls.values()) {
      const isRagdollActive = (!cr.ragdoll.isAlive || cr.ragdoll.isCollapsed) && !cr.ragdoll.isWalkingRagdoll;
      if (isRagdollActive) {
        cr.syncToRagdoll();
      } else {
        cr.alignBodiesToParticles();
      }
    }
  }

  public applyImpulseToPart(
    ragdollId: string,
    partName: BodyPartName,
    impulse: THREE.Vector3,
    worldPoint?: THREE.Vector3
  ) {
    const cr = this.cannonRagdolls.get(ragdollId);
    if (cr) {
      cr.applyImpulse(partName, impulse, worldPoint);
    }
  }

  public collapse(ragdoll: Ragdoll3D, impulseDir?: THREE.Vector3) {
    ragdoll.isAlive = false;
    ragdoll.isWalkingRagdoll = false;
    ragdoll.isCollapsed = true;

    let cr = this.cannonRagdolls.get(ragdoll.id);
    if (!cr) {
      cr = this.registerRagdoll(ragdoll, ragdoll.scale || 1.0);
    }
    if (cr) {
      cr.alignBodiesToParticles();
      if (impulseDir) {
        cr.applyImpulse('pelvis', impulseDir);
      }
    }
  }

  public reset() {
    for (const cr of this.cannonRagdolls.values()) {
      cr.destroy();
    }
    this.cannonRagdolls.clear();
    for (const body of this.staticObstacleBodies) {
      this.world.removeBody(body);
    }
    this.staticObstacleBodies = [];
    this.lastObstacleHash = '';
  }
}
