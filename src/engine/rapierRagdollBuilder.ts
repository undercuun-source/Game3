import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { RapierManager } from './rapierManager';
import { Ragdoll3D, Particle3D } from '../types/physics3d';

export interface RapierRagdollPart {
  name: string;
  body: RAPIER.RigidBody;
}

export class RapierRagdollBuilder {
  private handles: Map<string, number> = new Map();

  constructor() {}

  public destroy() {
    const manager = RapierManager.getInstance();
    const world = manager.world;
    if (!world) return;

    for (const handle of this.handles.values()) {
      const body = world.getRigidBody(handle);
      if (body) {
        world.removeRigidBody(body);
      }
    }
    this.handles.clear();
  }

  public buildRagdoll(ragdoll: Ragdoll3D) {
    const manager = RapierManager.getInstance();
    const world = manager.world;
    if (!world) return;
    
    // Create Collision Groups
    // GROUP_ENVIRONMENT = 0x0001 (Ground, walls, static blocks)
    // GROUP_LIMBS = 0x0002 (All cubic limbs & ragdoll parts)
    // Limbs belong to GROUP_LIMBS and filter is 0x0001 (ENVIRONMENT ONLY) so limbs NEVER collide with other limbs
    const membership = 0x0002;
    const filter = 0x0001; // Collide with floor and environment only, NEVER with any limb parts
    const collisionGroupValue = (membership << 16) | filter;

    // 1. Create Rigid Bodies
    for (const p of ragdoll.particles) {
      const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(p.x, p.y, p.z)
        .setLinvel(p.vx || 0, p.vy || 0, p.vz || 0)
        .setLinearDamping(0.6)
        .setAngularDamping(1.2);

      // Set initial rotation from mesh or quaternion
      if (p.mesh) {
        rigidBodyDesc.setRotation(p.mesh.quaternion);
      } else if (p.quaternion) {
        rigidBodyDesc.setRotation(p.quaternion);
      }

      const body = world.createRigidBody(rigidBodyDesc);

      let colliderDesc: RAPIER.ColliderDesc;
      if (p.boxDims) {
        const hw = (p.boxDims[0] * 0.90) / 2;
        const hh = (p.boxDims[1] * 0.90) / 2;
        const hd = (p.boxDims[2] * 0.90) / 2;
        colliderDesc = RAPIER.ColliderDesc.cuboid(Math.max(0.04, hw), Math.max(0.04, hh), Math.max(0.04, hd));
      } else {
        colliderDesc = RAPIER.ColliderDesc.ball(Math.max(0.04, (p.radius || 0.1) * 0.90));
      }

      colliderDesc
        .setMass(Math.max(0.5, p.mass))
        .setFriction(1.0)
        .setRestitution(0.0)
        .setCollisionGroups(collisionGroupValue);

      world.createCollider(colliderDesc, body);
      this.handles.set(p.name, body.handle);
    }

    // 2. Create Constraints (Joints) with Anatomical Limits & Non-Compressible Structure
    for (const c of ragdoll.constraints) {
      if (c.broken) continue;
      
      const handleA = this.handles.get(c.p1.name);
      const handleB = this.handles.get(c.p2.name);
      if (handleA === undefined || handleB === undefined) continue;

      const bodyA = world.getRigidBody(handleA);
      const bodyB = world.getRigidBody(handleB);
      if (!bodyA || !bodyB) continue;

      // Calculate world-space anchor (halfway between particles)
      const worldAnchor = new THREE.Vector3(
        (c.p1.x + c.p2.x) * 0.5,
        (c.p1.y + c.p2.y) * 0.5,
        (c.p1.z + c.p2.z) * 0.5
      );

      // Convert world anchor to local space of each body
      const posA = bodyA.translation();
      const rotA = bodyA.rotation();
      const quatA = new THREE.Quaternion(rotA.x, rotA.y, rotA.z, rotA.w);
      const anchorA = worldAnchor.clone().sub(new THREE.Vector3(posA.x, posA.y, posA.z))
                        .applyQuaternion(quatA.clone().invert());

      const posB = bodyB.translation();
      const rotB = bodyB.rotation();
      const quatB = new THREE.Quaternion(rotB.x, rotB.y, rotB.z, rotB.w);
      const anchorB = worldAnchor.clone().sub(new THREE.Vector3(posB.x, posB.y, posB.z))
                        .applyQuaternion(quatB.clone().invert());

      const cName = (c.name || '').toLowerCase();
      const p1Name = c.p1.name.toLowerCase();
      const p2Name = c.p2.name.toLowerCase();
      const combo = `${cName}_${p1Name}_${p2Name}`;

      // 1. Knees (Rodillas): Hinge flexion around X-axis. Bends backwards ONLY (0 to 130 deg = 2.25 rad), no forward hyperextension
      const isKnee = combo.includes('rodilla') || (combo.includes('muslo') && combo.includes('antepierna'));
      // 2. Elbows (Codos): Hinge flexion around X-axis. Bends forwards/inward ONLY (0 to 135 deg = 2.35 rad), no backward hyperextension
      const isElbow = combo.includes('codo') || (combo.includes('brazo') && combo.includes('antebrazo'));
      // 3. Ankles (Tobillos / Pies): Hinge pitch flexion around X-axis (-30 deg to +40 deg = -0.55 to 0.70 rad), locks twist/inversion
      const isAnkle = combo.includes('tobillo') || (combo.includes('antepierna') && combo.includes('pie'));
      // 4. Fingers (Dedos): Hinge flexion (curls inward into fist 0 to 80 deg = 0 to 1.4 rad)
      const isFinger = combo.includes('dedo') || combo.includes('pulgar') || combo.includes('indice') ||
                       combo.includes('medio') || combo.includes('anular') || combo.includes('menique');
      // 5. Neck / Head (Cuello / Cabeza): Restricted ball-socket with high postural muscle tone
      const isNeck = combo.includes('cuello') || combo.includes('cabeza');
      // 6. Spine / Torso (Columna): Postural muscle tone to prevent taco collapse or accordion compression
      const isSpine = combo.includes('pecho') || combo.includes('torso') || combo.includes('ombligo') || combo.includes('pelvis');

      if (isKnee) {
        const jointData = RAPIER.JointData.revolute(anchorA, anchorB, { x: 1, y: 0, z: 0 });
        jointData.limitsEnabled = true;
        jointData.limits = [-2.25, 0.0];
        jointData.stiffness = 35.0;
        jointData.damping = 10.0;
        world.createImpulseJoint(jointData, bodyA, bodyB, true);
      } else if (isElbow) {
        const jointData = RAPIER.JointData.revolute(anchorA, anchorB, { x: 1, y: 0, z: 0 });
        jointData.limitsEnabled = true;
        jointData.limits = [0.0, 2.35];
        jointData.stiffness = 30.0;
        jointData.damping = 8.0;
        world.createImpulseJoint(jointData, bodyA, bodyB, true);
      } else if (isAnkle) {
        const jointData = RAPIER.JointData.revolute(anchorA, anchorB, { x: 1, y: 0, z: 0 });
        jointData.limitsEnabled = true;
        jointData.limits = [-0.55, 0.70];
        jointData.stiffness = 45.0;
        jointData.damping = 12.0;
        world.createImpulseJoint(jointData, bodyA, bodyB, true);
      } else if (isFinger) {
        const jointData = RAPIER.JointData.revolute(anchorA, anchorB, { x: 1, y: 0, z: 0 });
        jointData.limitsEnabled = true;
        jointData.limits = [0.0, 1.40];
        jointData.stiffness = 25.0;
        jointData.damping = 6.0;
        world.createImpulseJoint(jointData, bodyA, bodyB, true);
      } else if (isNeck) {
        const jointData = RAPIER.JointData.spherical(anchorA, anchorB);
        jointData.stiffness = 85.0;
        jointData.damping = 25.0;
        world.createImpulseJoint(jointData, bodyA, bodyB, true);
      } else if (isSpine) {
        const jointData = RAPIER.JointData.spherical(anchorA, anchorB);
        jointData.stiffness = 95.0;
        jointData.damping = 28.0;
        world.createImpulseJoint(jointData, bodyA, bodyB, true);
      } else {
        // Hips, shoulders, and other multi-axial joints
        const jointData = RAPIER.JointData.spherical(anchorA, anchorB);
        jointData.stiffness = 45.0;
        jointData.damping = 12.0;
        world.createImpulseJoint(jointData, bodyA, bodyB, true);
      }
    }
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  public applyImpulse(impulse: THREE.Vector3) {
    // Disabled artificial activation push impulse as requested
    return;
  }

  public setLinvel(vel: THREE.Vector3) {
    const manager = RapierManager.getInstance();
    const world = manager.world;
    if (!world) return;

    for (const handle of this.handles.values()) {
      const body = world.getRigidBody(handle);
      if (body) {
        body.setLinvel({ x: vel.x, y: vel.y, z: vel.z }, true);
      }
    }
  }

  public syncFromRapier(ragdoll: Ragdoll3D) {
    const manager = RapierManager.getInstance();
    const world = manager.world;
    if (!world) return;

    for (const p of ragdoll.particles) {
      const handle = this.handles.get(p.name);
      if (handle === undefined) continue;

      const body = world.getRigidBody(handle);
      if (!body) continue;

      if (p.dragTargetPos) {
        const dt = 0.016;
        const dragVx = (p.dragTargetPos.x - p.x) / dt;
        const dragVy = (p.dragTargetPos.y - p.y) / dt;
        const dragVz = (p.dragTargetPos.z - p.z) / dt;

        body.setTranslation({ x: p.dragTargetPos.x, y: p.dragTargetPos.y, z: p.dragTargetPos.z }, true);
        body.setLinvel({ x: dragVx, y: dragVy, z: dragVz }, true);
        p.vx = dragVx;
        p.vy = dragVy;
        p.vz = dragVz;
        p.oldX = p.x;
        p.oldY = p.y;
        p.oldZ = p.z;
        p.x = p.dragTargetPos.x;
        p.y = p.dragTargetPos.y;
        p.z = p.dragTargetPos.z;
        if (p.mesh) {
          p.mesh.position.set(p.x, p.y, p.z);
        }
      } else {
        const pos = body.translation();
        const rot = body.rotation();
        const lv = body.linvel();

        // Floor clamping so ragdoll limbs never sink below ground level
        const floorMinY = p.radius ? p.radius * 0.9 : 0.08;
        let clampedY = pos.y;
        if (clampedY < floorMinY) {
          clampedY = floorMinY;
          body.setTranslation({ x: pos.x, y: clampedY, z: pos.z }, true);
          if (lv.y < 0) {
            body.setLinvel({ x: lv.x * 0.8, y: 0, z: lv.z * 0.8 }, true);
          }
        }

        p.vx = lv.x;
        p.vy = lv.y;
        p.vz = lv.z;

        p.oldX = p.x;
        p.oldY = p.y;
        p.oldZ = p.z;

        p.x = pos.x;
        p.y = clampedY;
        p.z = pos.z;
        
        if (p.quaternion) {
          p.quaternion.set(rot.x, rot.y, rot.z, rot.w);
        }
        if (p.mesh) {
          p.mesh.position.set(pos.x, clampedY, pos.z);
          p.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
        }
      }
    }
  }
}
