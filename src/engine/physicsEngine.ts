import {
  BloodDecal,
  BloodParticle,
  Bullet,
  Explosion,
  GameMap,
  Particle,
  PropObject,
  Ragdoll,
  Vector2,
  WeaponType,
} from '../types/physics';
import { soundEngine } from './soundEngine';
import { WEAPON_REGISTRY } from './weapons';

export class PhysicsEngine {
  public ragdolls: Ragdoll[] = [];
  public props: PropObject[] = [];
  public bloodParticles: BloodParticle[] = [];
  public bloodDecals: BloodDecal[] = [];
  public bullets: Bullet[] = [];
  public explosions: Explosion[] = [];
  public map: GameMap;

  public timeScale: number = 1.0;
  public gravityMultiplier: number = 1.0;
  public goreLevel: 'high' | 'normal' | 'low' = 'high';
  public xRayMode: boolean = false;
  public immortalMode: boolean = false;

  // Physgun hold state
  public physgunTarget: {
    particle?: Particle;
    prop?: PropObject;
    targetPos: Vector2;
    active: boolean;
  } = {
    targetPos: { x: 0, y: 0 },
    active: false,
  };

  private lastTime: number = performance.now();

  constructor(initialMap: GameMap) {
    this.map = initialMap;
  }

  public setMap(newMap: GameMap) {
    this.map = newMap;
    this.bloodDecals = [];
    this.bloodParticles = [];
    this.bullets = [];
    this.explosions = [];
  }

  public update(
    inputLeftJoystick: { x: number; y: number },
    inputRightJoystick: { x: number; y: number },
    isShooting: boolean,
    activeWeapon: WeaponType,
    crosshairWorldPos: Vector2,
    playerControlledRagdollId?: string
  ) {
    const now = performance.now();
    const rawDt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    const dt = rawDt * this.timeScale;
    if (dt <= 0.0001) return;

    soundEngine.setTimeScale(this.timeScale);

    // 1. Process weapons and tools
    this.handleWeapons(
      activeWeapon,
      isShooting,
      crosshairWorldPos,
      playerControlledRagdollId,
      dt
    );

    // 2. Update active ragdoll motor control / AI
    this.updateRagdollMotors(inputLeftJoystick, playerControlledRagdollId, dt);

    // 3. Update physics sub-steps for stability
    const subSteps = 4;
    const subDt = dt / subSteps;

    for (let step = 0; step < subSteps; step++) {
      // Integrate particle physics (Verlet)
      this.integrateParticles(subDt);

      // Integrate props
      this.integrateProps(subDt);

      // Solve constraints
      for (let iter = 0; iter < 5; iter++) {
        this.solveConstraints();
      }

      // Collisions
      this.handleCollisions();
    }

    // 4. Update bullets & projectiles
    this.updateBullets(dt);

    // 5. Update explosions & shockwaves
    this.updateExplosions(dt);

    // 6. Update blood particles & decals
    this.updateBlood(dt);

    // 7. Update active props mechanics (hydraulic presses, rotating blades, etc.)
    this.updatePropMechanisms(dt);

    // 8. Update ragdoll vitals & bleeding
    this.updateRagdollVitals(dt);
  }

  private integrateParticles(dt: number) {
    const gx = this.map.gravity.x * this.gravityMultiplier;
    const gy = this.map.gravity.y * this.gravityMultiplier;
    const damping = 0.985;

    for (const ragdoll of this.ragdolls) {
      for (const p of ragdoll.particles) {
        if (p.pinned) continue;

        // Custom particle effects (e.g. anti-gravity syringe)
        let particleGy = gy;
        if (p.temperature && p.temperature > 50) {
          p.temperature = Math.max(0, p.temperature - dt * 10);
        }

        const vx = (p.x - p.oldX) * damping;
        const vy = (p.y - p.oldY) * damping;

        p.oldX = p.x;
        p.oldY = p.y;

        p.x += vx + gx * dt * dt;
        p.y += vy + particleGy * dt * dt;

        p.vx = vx / dt;
        p.vy = vy / dt;
      }
    }
  }

  private integrateProps(dt: number) {
    const gx = this.map.gravity.x * this.gravityMultiplier;
    const gy = this.map.gravity.y * this.gravityMultiplier;
    const damping = 0.97;

    for (const prop of this.props) {
      if (prop.pinned || prop.destroyed) continue;

      prop.vx = prop.vx * damping + gx * dt;
      prop.vy = prop.vy * damping + gy * dt;

      prop.x += prop.vx * dt;
      prop.y += prop.vy * dt;

      prop.angle += prop.angularVelocity * dt;
      prop.angularVelocity *= 0.95;
    }
  }

  private solveConstraints() {
    for (const ragdoll of this.ragdolls) {
      for (const c of ragdoll.constraints) {
        if (c.broken) continue;

        const p1 = c.p1;
        const p2 = c.p2;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist === 0) continue;

        const diff = (dist - c.length) / dist;

        // Check break tension force
        const tensionForce = Math.abs(dist - c.length) * c.stiffness * 400;
        if (!this.immortalMode && tensionForce > c.breakForce) {
          c.broken = true;
          p1.dismembered = true;
          p2.dismembered = true;
          p1.fractured = true;
          p2.fractured = true;
          ragdoll.stats.brokenBones++;
          ragdoll.stats.dismemberedLimbs++;
          soundEngine.playBoneSnap();
          soundEngine.playBloodSplatter();
          this.spawnBloodBurst(
            (p1.x + p2.x) / 2,
            (p1.y + p2.y) / 2,
            25,
            Math.atan2(dy, dx)
          );
          continue;
        }

        const totalMass = (p1.pinned ? 0 : p1.mass) + (p2.pinned ? 0 : p2.mass);
        if (totalMass === 0) continue;

        const p1Ratio = p1.pinned ? 0 : p2.pinned ? 1 : p2.mass / totalMass;
        const p2Ratio = p2.pinned ? 0 : p1.pinned ? 1 : p1.mass / totalMass;

        if (!p1.pinned) {
          p1.x += dx * diff * p1Ratio * c.stiffness;
          p1.y += dy * diff * p1Ratio * c.stiffness;
        }
        if (!p2.pinned) {
          p2.x -= dx * diff * p2Ratio * c.stiffness;
          p2.y -= dy * diff * p2Ratio * c.stiffness;
        }
      }
    }

    // Physgun spring constraint
    if (this.physgunTarget.active) {
      if (this.physgunTarget.particle) {
        const p = this.physgunTarget.particle;
        const dx = this.physgunTarget.targetPos.x - p.x;
        const dy = this.physgunTarget.targetPos.y - p.y;
        p.x += dx * 0.35;
        p.y += dy * 0.35;
        p.oldX = p.x - dx * 0.15;
        p.oldY = p.y - dy * 0.15;
      } else if (this.physgunTarget.prop) {
        const prop = this.physgunTarget.prop;
        const dx = this.physgunTarget.targetPos.x - prop.x;
        const dy = this.physgunTarget.targetPos.y - prop.y;
        prop.vx = dx * 10;
        prop.vy = dy * 10;
      }
    }
  }

  private handleCollisions() {
    // 1. Particle vs Obstacles
    for (const ragdoll of this.ragdolls) {
      for (const p of ragdoll.particles) {
        if (p.pinned) continue;

        for (const obs of this.map.obstacles) {
          if (obs.destructible && obs.health && obs.health <= 0) continue;

          // Standard Axis-Aligned or simple Ramps
          const halfW = obs.width / 2;
          const halfH = obs.height / 2;
          const minX = obs.x - halfW;
          const maxX = obs.x + halfW;
          const minY = obs.y - halfH;
          const maxY = obs.y + halfH;

          if (obs.angle) {
            // Rotated ramp obstacle calculation
            const cos = Math.cos(-obs.angle);
            const sin = Math.sin(-obs.angle);
            const relX = p.x - obs.x;
            const relY = p.y - obs.y;
            const localX = relX * cos - relY * sin;
            const localY = relX * sin + relY * cos;

            if (
              localX > -halfW - p.radius &&
              localX < halfW + p.radius &&
              localY > -halfH - p.radius &&
              localY < halfH + p.radius
            ) {
              const clampedX = Math.max(-halfW, Math.min(halfW, localX));
              const clampedY = Math.max(-halfH, Math.min(halfH, localY));
              const normCos = Math.cos(obs.angle);
              const normSin = Math.sin(obs.angle);

              const worldClampX = obs.x + clampedX * normCos - clampedY * normSin;
              const worldClampY = obs.y + clampedX * normSin + clampedY * normCos;

              const pushAngle = obs.angle - Math.PI / 2;
              p.x = worldClampX + Math.cos(pushAngle) * p.radius;
              p.y = worldClampY + Math.sin(pushAngle) * p.radius;
              p.oldX = p.x - (p.x - p.oldX) * 0.8;
              p.oldY = p.y - (p.y - p.oldY) * 0.8;
            }
          } else {
            // AABB
            if (
              p.x + p.radius > minX &&
              p.x - p.radius < maxX &&
              p.y + p.radius > minY &&
              p.y - p.radius < maxY
            ) {
              // Hazard damage (spikes)
              if (obs.type === 'hazard') {
                this.damageParticle(p, 15, 'spikes');
                this.spawnBloodBurst(p.x, p.y, 4, -Math.PI / 2);
              }

              // Calculate overlap
              const overlapLeft = p.x + p.radius - minX;
              const overlapRight = maxX - (p.x - p.radius);
              const overlapTop = p.y + p.radius - minY;
              const overlapBottom = maxY - (p.y - p.radius);

              const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

              const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
              if (speed > 450) {
                const impactDamage = (speed - 450) * 0.08;
                this.damageParticle(p, impactDamage, 'impact');
                soundEngine.playImpact(Math.min(1.0, speed / 800));
                if (speed > 650 && !p.fractured) {
                  p.fractured = true;
                  ragdoll.stats.brokenBones++;
                  soundEngine.playBoneSnap();
                }
              }

              if (minOverlap === overlapTop) {
                p.y = minY - p.radius;
                const vx = (p.x - p.oldX) * 0.7; // friction
                p.oldY = p.y + Math.abs(p.y - p.oldY) * 0.2; // slight bounce
                p.oldX = p.x - vx;
              } else if (minOverlap === overlapBottom) {
                p.y = maxY + p.radius;
                p.oldY = p.y - Math.abs(p.y - p.oldY) * 0.2;
              } else if (minOverlap === overlapLeft) {
                p.x = minX - p.radius;
                p.oldX = p.x + Math.abs(p.x - p.oldX) * 0.2;
              } else {
                p.x = maxX + p.radius;
                p.oldX = p.x - Math.abs(p.x - p.oldX) * 0.2;
              }
            }
          }
        }
      }
    }

    // 2. Props vs Obstacles & Floor
    for (const prop of this.props) {
      if (prop.destroyed) continue;
      const hw = prop.width / 2;
      const hh = prop.height / 2;

      for (const obs of this.map.obstacles) {
        const obsHw = obs.width / 2;
        const obsHh = obs.height / 2;

        if (
          Math.abs(prop.x - obs.x) < hw + obsHw &&
          Math.abs(prop.y - obs.y) < hh + obsHh
        ) {
          const ox = hw + obsHw - Math.abs(prop.x - obs.x);
          const oy = hh + obsHh - Math.abs(prop.y - obs.y);

          if (oy < ox) {
            if (prop.y < obs.y) {
              prop.y = obs.y - obsHh - hh;
              prop.vy = -prop.vy * 0.25;
              prop.vx *= 0.85; // friction
            } else {
              prop.y = obs.y + obsHh + hh;
              prop.vy = -prop.vy * 0.25;
            }
          } else {
            if (prop.x < obs.x) {
              prop.x = obs.x - obsHw - hw;
              prop.vx = -prop.vx * 0.25;
            } else {
              prop.x = obs.x + obsHw + hw;
              prop.vx = -prop.vx * 0.25;
            }
          }
        }
      }

      // Prop vs Ragdoll particles
      for (const ragdoll of this.ragdolls) {
        for (const p of ragdoll.particles) {
          if (
            Math.abs(p.x - prop.x) < hw + p.radius &&
            Math.abs(p.y - prop.y) < hh + p.radius
          ) {
            const dx = p.x - prop.x;
            const dy = p.y - prop.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const normX = dx / dist;
            const normY = dy / dist;

            // Prop specific reactions
            if (prop.type === 'spinning_blade') {
              this.damageParticle(p, 45, 'slash');
              this.spawnBloodBurst(p.x, p.y, 8, Math.atan2(dy, dx));
              soundEngine.playBladeSlash();
            } else if (prop.type === 'jump_pad') {
              p.vy = -800;
              p.oldY = p.y + 800 * 0.016;
              soundEngine.playImpact(1.0);
            } else if (prop.type === 'spikes') {
              this.damageParticle(p, 25, 'spikes');
              this.spawnBloodBurst(p.x, p.y, 6, -Math.PI / 2);
            } else if (prop.type === 'landmine' && !prop.extraState?.detonated) {
              this.triggerExplosion(prop.x, prop.y, 140, 200, 250);
              prop.destroyed = true;
              prop.extraState = { detonated: true };
            } else {
              // Heavy crushing / pushing
              const relSpeed = Math.sqrt(prop.vx * prop.vx + prop.vy * prop.vy);
              if (relSpeed > 300) {
                this.damageParticle(p, relSpeed * 0.08, 'crush');
              }
              p.x += normX * 4;
              p.y += normY * 4;
            }
          }
        }
      }
    }
  }

  private updateRagdollMotors(
    leftJoystick: { x: number; y: number },
    playerControlledRagdollId?: string,
    dt: number = 0.016
  ) {
    for (const ragdoll of this.ragdolls) {
      if (!ragdoll.isAlive || ragdoll.isStunned) {
        ragdoll.isStanding = false;
        continue;
      }

      const isPlayer = ragdoll.id === playerControlledRagdollId || ragdoll.isControlled;
      const inputX = isPlayer ? leftJoystick.x : 0;
      const inputY = isPlayer ? leftJoystick.y : 0;

      // Find key body parts
      const cabeza = ragdoll.particles.find((p) => p.name === 'cabeza');
      const pechobase = ragdoll.particles.find((p) => p.name === 'pechobase');
      const pelvis = ragdoll.particles.find((p) => p.name === 'pelvis');
      const pieIzq = ragdoll.particles.find((p) => p.name === 'pie_izq');
      const pieDer = ragdoll.particles.find((p) => p.name === 'pie_der');
      const rodillaIzq = ragdoll.particles.find((p) => p.name === 'rodilla_izq');
      const rodillaDer = ragdoll.particles.find((p) => p.name === 'rodilla_der');

      if (!cabeza || !pechobase || !pelvis || !pieIzq || !pieDer) continue;

      // Active balance upright force (PID Torques)
      const avgFeetX = (pieIzq.x + pieDer.x) / 2;
      const avgFeetY = (pieIzq.y + pieDer.y) / 2;
      const targetTorsoY = avgFeetY - 110 * ragdoll.scale;

      // Balance upright if head is above feet
      if (cabeza.y < avgFeetY - 40 && !cabeza.dismembered) {
        ragdoll.isStanding = true;

        // Upright standing spring
        const balanceCorrectionX = (avgFeetX - pelvis.x) * 4.0;
        pelvis.x += balanceCorrectionX * dt;
        pechobase.x += (pelvis.x - pechobase.x) * 4.0 * dt;
        cabeza.x += (pechobase.x - cabeza.x) * 5.0 * dt;

        // Crouch vs Stand height adjustment
        if (inputY > 0.4) {
          // Crouch / crouch-walk
          pechobase.y += (targetTorsoY + 35 - pechobase.y) * 4.0 * dt;
        } else if (inputY < -0.6) {
          // Jump impulse
          if (Math.abs(pieIzq.vy) < 50 || Math.abs(pieDer.vy) < 50) {
            pelvis.y -= 380 * dt;
            pechobase.y -= 450 * dt;
            cabeza.y -= 450 * dt;
          }
        } else {
          // Normal stand
          pechobase.y += (targetTorsoY - pechobase.y) * 3.0 * dt;
        }

        // Active Walking controller
        if (Math.abs(inputX) > 0.15) {
          ragdoll.facing = inputX > 0 ? 1 : -1;
          ragdoll.walkCycle += dt * 7.0 * Math.abs(inputX);

          const stepPhase = Math.sin(ragdoll.walkCycle);
          const walkSpeed = inputX * 180 * dt;

          pelvis.x += walkSpeed;
          pechobase.x += walkSpeed * 0.9;

          // Leg alternating kinematics
          if (stepPhase > 0) {
            pieIzq.x += walkSpeed * 1.6;
            pieIzq.y -= Math.abs(stepPhase) * 20 * dt;
            if (rodillaIzq) rodillaIzq.x += walkSpeed * 1.2;
          } else {
            pieDer.x += walkSpeed * 1.6;
            pieDer.y -= Math.abs(stepPhase) * 20 * dt;
            if (rodillaDer) rodillaDer.x += walkSpeed * 1.2;
          }
        }
      } else {
        ragdoll.isStanding = false;
        // Attempt recovery / stand up if alive and not knocked out
        if (ragdoll.isAlive && Math.random() < 0.03) {
          cabeza.y -= 20 * dt;
          pechobase.y -= 15 * dt;
        }
      }
    }
  }

  private handleWeapons(
    weapon: WeaponType,
    isShooting: boolean,
    crosshairWorldPos: Vector2,
    playerControlledRagdollId?: string,
    dt: number = 0.016
  ) {
    const controlledRagdoll =
      this.ragdolls.find((r) => r.id === playerControlledRagdollId) || this.ragdolls[0];

    let muzzleX = crosshairWorldPos.x - 50;
    let muzzleY = crosshairWorldPos.y - 50;

    if (controlledRagdoll) {
      const pechobase = controlledRagdoll.particles.find((p) => p.name === 'pechobase');
      const manoDer = controlledRagdoll.particles.find((p) => p.name === 'mano_der');
      if (pechobase) {
        muzzleX = manoDer ? manoDer.x : pechobase.x + controlledRagdoll.facing * 30;
        muzzleY = manoDer ? manoDer.y : pechobase.y;
      }
    }

    const angle = Math.atan2(crosshairWorldPos.y - muzzleY, crosshairWorldPos.x - muzzleX);

    // Physgun handling
    if (weapon === 'physgun') {
      if (isShooting) {
        soundEngine.playPhysgunBeam(true);
        this.physgunTarget.active = true;
        this.physgunTarget.targetPos = { ...crosshairWorldPos };

        // If not holding anything, search for closest particle or prop to grab
        if (!this.physgunTarget.particle && !this.physgunTarget.prop) {
          let closestDist = 120;
          let foundParticle: Particle | undefined;

          for (const ragdoll of this.ragdolls) {
            for (const p of ragdoll.particles) {
              const dx = p.x - crosshairWorldPos.x;
              const dy = p.y - crosshairWorldPos.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < closestDist) {
                closestDist = dist;
                foundParticle = p;
              }
            }
          }

          if (foundParticle) {
            this.physgunTarget.particle = foundParticle;
          } else {
            // Check props
            for (const prop of this.props) {
              if (prop.destroyed) continue;
              const dx = prop.x - crosshairWorldPos.x;
              const dy = prop.y - crosshairWorldPos.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 80) {
                this.physgunTarget.prop = prop;
                break;
              }
            }
          }
        }
      } else {
        this.physgunTarget.active = false;
        this.physgunTarget.particle = undefined;
        this.physgunTarget.prop = undefined;
      }
      return;
    }

    if (!isShooting) return;

    // Firearm & Tool actions
    const weaponInfo = WEAPON_REGISTRY[weapon];
    if (!weaponInfo) return;

    if (weapon === 'pistol') {
      soundEngine.playGunshot('pistol');
      this.fireBullet(muzzleX, muzzleY, angle, 1600, weaponInfo.damage, 1, '9mm', '#facc15');
    } else if (weapon === 'shotgun') {
      soundEngine.playGunshot('shotgun');
      // Fire 8 spread pellets
      for (let i = 0; i < 8; i++) {
        const spreadAngle = angle + (Math.random() - 0.5) * 0.28;
        const speed = 1400 + (Math.random() - 0.5) * 200;
        this.fireBullet(
          muzzleX,
          muzzleY,
          spreadAngle,
          speed,
          weaponInfo.damage,
          1,
          '12gauge',
          '#fb923c'
        );
      }
    } else if (weapon === 'ak47') {
      soundEngine.playGunshot('ak47');
      const spreadAngle = angle + (Math.random() - 0.5) * 0.08;
      this.fireBullet(muzzleX, muzzleY, spreadAngle, 1800, weaponInfo.damage, 2, '7.62mm', '#fbbf24');
    } else if (weapon === 'sniper') {
      soundEngine.playGunshot('sniper');
      this.fireBullet(muzzleX, muzzleY, angle, 2800, weaponInfo.damage, 5, '50cal', '#a3e635');
    } else if (weapon === 'rpg') {
      soundEngine.playGunshot('rocket');
      this.fireBullet(muzzleX, muzzleY, angle, 900, weaponInfo.damage, 0, 'rocket', '#ef4444');
    } else if (weapon === 'katana') {
      soundEngine.playBladeSlash();
      this.meleeSlash(muzzleX, muzzleY, crosshairWorldPos, 90, 80);
    } else if (weapon === 'sledgehammer') {
      soundEngine.playImpact(1.0);
      this.meleeBluntImpact(crosshairWorldPos.x, crosshairWorldPos.y, 110, 60);
    } else if (weapon === 'grenade') {
      soundEngine.playImpact(0.4);
      this.spawnProp(
        'explosive_barrel',
        muzzleX,
        muzzleY,
        Math.cos(angle) * 600,
        Math.sin(angle) * 600
      );
    } else if (weapon.startsWith('syringe_')) {
      soundEngine.playSyringeInject();
      this.applySyringe(crosshairWorldPos, weapon);
    }
  }

  private fireBullet(
    x: number,
    y: number,
    angle: number,
    speed: number,
    damage: number,
    pierce: number,
    caliber: Bullet['caliber'],
    color: string
  ) {
    this.bullets.push({
      id: 'bullet_' + Math.random(),
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage,
      pierce,
      range: 3000,
      traveled: 0,
      caliber,
      color,
      trail: [{ x, y }],
    });
  }

  private updateBullets(dt: number) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      const nextX = b.x + b.vx * dt;
      const nextY = b.y + b.vy * dt;
      const stepDist = Math.sqrt((nextX - b.x) ** 2 + (nextY - b.y) ** 2);

      b.traveled += stepDist;
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 5) b.trail.shift();

      if (b.traveled > b.range) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Check collision with map obstacles
      let hitWall = false;
      for (const obs of this.map.obstacles) {
        const halfW = obs.width / 2;
        const halfH = obs.height / 2;
        if (
          b.x > obs.x - halfW &&
          b.x < obs.x + halfW &&
          b.y > obs.y - halfH &&
          b.y < obs.y + halfH
        ) {
          hitWall = true;
          if (b.caliber === 'rocket') {
            this.triggerExplosion(b.x, b.y, 220, 260, 300);
          } else {
            soundEngine.playImpact(0.4);
            this.spawnBloodDecal(b.x, b.y, 3, '#64748b', 'circle');
          }
          if (obs.destructible && obs.health) {
            obs.health -= b.damage;
          }
          break;
        }
      }

      if (hitWall) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Check collision with ragdoll particles
      let hitRagdoll = false;
      for (const ragdoll of this.ragdolls) {
        for (const p of ragdoll.particles) {
          const dx = b.x - p.x;
          const dy = b.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < p.radius + 6) {
            hitRagdoll = true;

            if (b.caliber === 'rocket') {
              this.triggerExplosion(b.x, b.y, 220, 260, 300);
              break;
            }

            // Bullet impact physics transfer
            const pushFactor = b.caliber === '50cal' ? 600 : b.caliber === '12gauge' ? 400 : 250;
            p.oldX -= Math.cos(Math.atan2(b.vy, b.vx)) * pushFactor * dt;
            p.oldY -= Math.sin(Math.atan2(b.vy, b.vx)) * pushFactor * dt;

            // Damage and blood
            this.damageParticle(p, b.damage, 'bullet');
            this.spawnBloodBurst(p.x, p.y, b.caliber === '50cal' ? 16 : 8, Math.atan2(b.vy, b.vx));

            b.pierce--;
            if (b.pierce <= 0) break;
          }
        }
        if (hitRagdoll && b.pierce <= 0) break;
      }

      if (hitRagdoll && (b.pierce <= 0 || b.caliber === 'rocket')) {
        this.bullets.splice(i, 1);
        continue;
      }

      b.x = nextX;
      b.y = nextY;
    }
  }

  public triggerExplosion(x: number, y: number, radius: number, force: number, damage: number) {
    soundEngine.playExplosion();
    this.explosions.push({
      x,
      y,
      radius: 0,
      maxRadius: radius,
      force,
      damage,
      life: 1.0,
      color: '#f97316',
    });

    // Damage and launch particles in radius
    for (const ragdoll of this.ragdolls) {
      for (const p of ragdoll.particles) {
        const dx = p.x - x;
        const dy = p.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        if (dist < radius) {
          const falloff = 1 - dist / radius;
          const pushForce = force * falloff * 25;
          const normX = dx / dist;
          const normY = dy / dist;

          p.oldX = p.x - normX * pushForce * 0.03;
          p.oldY = p.y - normY * pushForce * 0.03;

          this.damageParticle(p, damage * falloff, 'explosion');
          this.spawnBloodBurst(p.x, p.y, Math.floor(12 * falloff), Math.atan2(dy, dx));
        }
      }
    }

    // Launch props
    for (const prop of this.props) {
      const dx = prop.x - x;
      const dy = prop.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      if (dist < radius) {
        const falloff = 1 - dist / radius;
        prop.vx += (dx / dist) * force * falloff * 5;
        prop.vy += (dy / dist) * force * falloff * 5;
        prop.angularVelocity += (Math.random() - 0.5) * 15;
      }
    }
  }

  private updateExplosions(dt: number) {
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.radius += (exp.maxRadius - exp.radius) * 12 * dt;
      exp.life -= dt * 2.2;
      if (exp.life <= 0) {
        this.explosions.splice(i, 1);
      }
    }
  }

  private meleeSlash(x: number, y: number, target: Vector2, damage: number, reach: number) {
    for (const ragdoll of this.ragdolls) {
      for (const c of ragdoll.constraints) {
        if (c.broken) continue;
        const midX = (c.p1.x + c.p2.x) / 2;
        const midY = (c.p1.y + c.p2.y) / 2;
        const dist = Math.sqrt((midX - target.x) ** 2 + (midY - target.y) ** 2);

        if (dist < reach) {
          c.broken = true;
          c.p1.dismembered = true;
          c.p2.dismembered = true;
          ragdoll.stats.dismemberedLimbs++;
          this.damageParticle(c.p1, damage, 'slash');
          this.damageParticle(c.p2, damage, 'slash');
          this.spawnBloodBurst(midX, midY, 20, Math.random() * Math.PI * 2);
          soundEngine.playBloodSplatter();
        }
      }
    }
  }

  private meleeBluntImpact(x: number, y: number, damage: number, radius: number) {
    for (const ragdoll of this.ragdolls) {
      for (const p of ragdoll.particles) {
        const dist = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
        if (dist < radius) {
          p.fractured = true;
          ragdoll.stats.brokenBones++;
          this.damageParticle(p, damage, 'impact');
          p.oldY = p.y + 25; // ground smash
          soundEngine.playBoneSnap();
          this.spawnBloodBurst(p.x, p.y, 8, -Math.PI / 2);
        }
      }
    }
  }

  private applySyringe(target: Vector2, syringeType: WeaponType) {
    for (const ragdoll of this.ragdolls) {
      for (const p of ragdoll.particles) {
        const dist = Math.sqrt((p.x - target.x) ** 2 + (p.y - target.y) ** 2);
        if (dist < p.radius + 15) {
          if (syringeType === 'syringe_adrenaline') {
            // Revive and heal entire body
            ragdoll.isAlive = true;
            ragdoll.isStunned = false;
            ragdoll.totalHealth = 100;
            for (const part of ragdoll.particles) {
              part.health = part.maxHealth;
              part.fractured = false;
              part.bleedingRate = 0;
            }
          } else if (syringeType === 'syringe_acid') {
            // Dissolve skin
            p.temperature = 100;
            p.isAcidic = true;
            this.damageParticle(p, 60, 'acid');
          } else if (syringeType === 'syringe_nitro') {
            p.pinned = false;
            // Next impact will trigger explosive reaction
            p.temperature = 999;
          } else if (syringeType === 'syringe_antigrav') {
            for (const part of ragdoll.particles) {
              part.oldY = part.y + 15; // float upward
            }
          }
          return;
        }
      }
    }
  }

  public damageParticle(
    p: Particle,
    amount: number,
    source: 'bullet' | 'slash' | 'impact' | 'explosion' | 'spikes' | 'acid' | 'crush'
  ) {
    if (this.immortalMode) return;

    const actualDmg = p.armor ? amount * (1 - p.armor / 100) : amount;
    p.health = Math.max(0, p.health - actualDmg);
    p.bleedingRate = Math.min(10, p.bleedingRate + actualDmg * 0.05);

    const ragdoll = this.ragdolls.find((r) => r.id === p.parentRagdollId);
    if (!ragdoll) return;

    // Vital check (head / neck damage)
    if (p.isVital && p.health <= 0) {
      ragdoll.isAlive = false;
      ragdoll.isStanding = false;
    }

    if (p.health <= 0 && (source === 'bullet' || source === 'slash' || source === 'explosion')) {
      p.dismembered = true;
    }
  }

  private updateRagdollVitals(dt: number) {
    for (const ragdoll of this.ragdolls) {
      let totalRemainingHp = 0;
      let maxPossibleHp = 0;

      for (const p of ragdoll.particles) {
        totalRemainingHp += p.health;
        maxPossibleHp += p.maxHealth;

        // Bleeding spurts from damaged / severed parts
        if (p.bleedingRate > 0.5 && this.goreLevel !== 'low') {
          if (Math.random() < p.bleedingRate * 0.15) {
            this.spawnBloodBurst(p.x, p.y, Math.ceil(p.bleedingRate * 0.5), Math.random() * Math.PI * 2);
          }
        }
      }

      ragdoll.totalHealth = (totalRemainingHp / (maxPossibleHp || 1)) * 100;
      if (ragdoll.totalHealth <= 0) {
        ragdoll.isAlive = false;
      }
    }
  }

  public spawnBloodBurst(x: number, y: number, count: number, angle: number = -Math.PI / 2) {
    if (this.goreLevel === 'low') return;
    const maxParticles = this.goreLevel === 'high' ? count * 1.5 : count;

    for (let i = 0; i < maxParticles; i++) {
      const spread = (Math.random() - 0.5) * 1.6;
      const speed = 120 + Math.random() * 320;
      const finalAngle = angle + spread;

      this.bloodParticles.push({
        x,
        y,
        vx: Math.cos(finalAngle) * speed,
        vy: Math.sin(finalAngle) * speed,
        radius: 2 + Math.random() * 3.5,
        life: 1.0,
        decay: 0.2 + Math.random() * 0.4,
        color: Math.random() > 0.3 ? '#b91c1c' : '#7f1d1d',
        stainFloor: true,
      });
    }
  }

  private updateBlood(dt: number) {
    const gy = this.map.gravity.y * this.gravityMultiplier;

    for (let i = this.bloodParticles.length - 1; i >= 0; i--) {
      const bp = this.bloodParticles[i];
      bp.vy += gy * dt * 0.8;
      bp.x += bp.vx * dt;
      bp.y += bp.vy * dt;
      bp.life -= bp.decay * dt;

      // Check collision with ground/walls to leave stain
      for (const obs of this.map.obstacles) {
        const halfW = obs.width / 2;
        const halfH = obs.height / 2;
        if (
          bp.x > obs.x - halfW &&
          bp.x < obs.x + halfW &&
          bp.y > obs.y - halfH &&
          bp.y < obs.y + halfH
        ) {
          if (bp.stainFloor && Math.random() < 0.6) {
            this.spawnBloodDecal(bp.x, bp.y, bp.radius * 2.2, bp.color, 'drip');
          }
          this.bloodParticles.splice(i, 1);
          break;
        }
      }

      if (bp.life <= 0) {
        this.bloodParticles.splice(i, 1);
      }
    }
  }

  public spawnBloodDecal(
    x: number,
    y: number,
    radius: number,
    color: string,
    splatterType: BloodDecal['splatterType']
  ) {
    if (this.bloodDecals.length > 350) {
      this.bloodDecals.shift(); // keep performance smooth
    }
    this.bloodDecals.push({
      x,
      y,
      radius,
      alpha: 0.85,
      color,
      angle: Math.random() * Math.PI * 2,
      splatterType,
    });
  }

  public spawnProp(type: PropObject['type'], x: number, y: number, vx: number = 0, vy: number = 0) {
    const id = 'prop_' + Math.random().toString(36).substring(2, 8);
    let width = 60;
    let height = 60;
    let mass = 15;
    let color = '#d97706';
    let extraState: PropObject['extraState'] = {};

    if (type === 'wooden_box') {
      width = 50;
      height = 50;
      mass = 10;
      color = '#b45309';
    } else if (type === 'metal_box') {
      width = 60;
      height = 60;
      mass = 35;
      color = '#475569';
    } else if (type === 'explosive_barrel') {
      width = 40;
      height = 65;
      mass = 20;
      color = '#dc2626';
    } else if (type === 'concrete_block') {
      width = 90;
      height = 45;
      mass = 80;
      color = '#64748b';
    } else if (type === 'spinning_blade') {
      width = 70;
      height = 70;
      mass = 25;
      color = '#94a3b8';
      extraState = { spinSpeed: 18 };
    } else if (type === 'hydraulic_press') {
      width = 120;
      height = 40;
      mass = 120;
      color = '#0284c7';
      extraState = { pressOffset: 0, pressDirection: 1, pressMaxTravel: 160 };
    } else if (type === 'jump_pad') {
      width = 70;
      height = 20;
      mass = 40;
      color = '#10b981';
    } else if (type === 'spikes') {
      width = 80;
      height = 25;
      mass = 30;
      color = '#ef4444';
    } else if (type === 'landmine') {
      width = 35;
      height = 15;
      mass = 5;
      color = '#15803d';
    }

    this.props.push({
      id,
      type,
      x,
      y,
      width,
      height,
      vx,
      vy,
      angle: 0,
      angularVelocity: 0,
      mass,
      health: 100,
      maxHealth: 100,
      destroyed: false,
      pinned: false,
      color,
      extraState,
    });
  }

  private updatePropMechanisms(dt: number) {
    for (const prop of this.props) {
      if (prop.destroyed) continue;

      if (prop.type === 'spinning_blade') {
        prop.angle += (prop.extraState?.spinSpeed || 15) * dt;
      } else if (prop.type === 'hydraulic_press') {
        const dir = prop.extraState?.pressDirection || 1;
        const max = prop.extraState?.pressMaxTravel || 160;
        let offset = (prop.extraState?.pressOffset || 0) + dir * 140 * dt;

        if (offset > max) {
          offset = max;
          if (prop.extraState) prop.extraState.pressDirection = -1;
        } else if (offset < 0) {
          offset = 0;
          if (prop.extraState) prop.extraState.pressDirection = 1;
        }

        if (prop.extraState) prop.extraState.pressOffset = offset;
        prop.y += dir * 140 * dt;
      }
    }
  }

  public clearBlood() {
    this.bloodParticles = [];
    this.bloodDecals = [];
  }

  public clearAll() {
    this.ragdolls = [];
    this.props = [];
    this.bullets = [];
    this.explosions = [];
    this.bloodParticles = [];
    this.bloodDecals = [];
  }

  public resetCurrentRagdolls(spawnX: number, spawnY: number) {
    this.ragdolls.forEach((r, idx) => {
      r.isAlive = true;
      r.isStunned = false;
      r.isStanding = true;
      r.totalHealth = 100;
      r.stats = { brokenBones: 0, dismemberedLimbs: 0, bloodLossPercent: 0 };
    });
  }
}
