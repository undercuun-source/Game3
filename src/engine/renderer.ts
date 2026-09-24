import {
  BodyPartName,
  Constraint,
  GameMap,
  Particle,
  PropObject,
  Ragdoll,
  Vector2,
  WeaponType,
} from '../types/physics';
import { PhysicsEngine } from './physicsEngine';
import { WEAPON_REGISTRY } from './weapons';

export class RagdollRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public render(
    engine: PhysicsEngine,
    camera: { x: number; y: number; zoom: number },
    canvasWidth: number,
    canvasHeight: number,
    crosshairWorldPos: Vector2,
    activeWeapon: WeaponType,
    isShooting: boolean,
    selectedRagdollId?: string
  ) {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    ctx.save();
    // Center & Apply camera transform
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // 1. Draw Map Background & Grid
    this.drawBackground(engine.map);

    // 2. Draw Blood Decals on walls/floors
    this.drawBloodDecals(engine);

    // 3. Draw Map Obstacles (Platforms, Ramps, Hazards)
    this.drawMapObstacles(engine.map);

    // 4. Draw Props (Crates, Barrels, Saws, Crusher Presses)
    this.drawProps(engine.props);

    // 5. Draw Ragdolls with full articulated anatomy
    for (const ragdoll of engine.ragdolls) {
      const isSelected = ragdoll.id === selectedRagdollId;
      this.drawRagdoll(ragdoll, engine.xRayMode, isSelected);
    }

    // 6. Draw Bullets & Projectile Trails
    this.drawBullets(engine);

    // 7. Draw Blood Particles in air
    this.drawBloodParticles(engine);

    // 8. Draw Explosions
    this.drawExplosions(engine);

    // 9. Draw Physgun Beam & Crosshair
    this.drawPhysgunBeam(engine, crosshairWorldPos, activeWeapon, isShooting);

    ctx.restore();
  }

  private drawBackground(map: GameMap) {
    const ctx = this.ctx;
    const bgGradient = ctx.createLinearGradient(0, 0, 0, map.height);

    if (map.theme === 'lab') {
      bgGradient.addColorStop(0, '#0f172a');
      bgGradient.addColorStop(1, '#1e293b');
    } else if (map.theme === 'stairs') {
      bgGradient.addColorStop(0, '#1c1917');
      bgGradient.addColorStop(1, '#292524');
    } else if (map.theme === 'city') {
      bgGradient.addColorStop(0, '#09090b');
      bgGradient.addColorStop(1, '#18181b');
    } else if (map.theme === 'zerog') {
      bgGradient.addColorStop(0, '#030712');
      bgGradient.addColorStop(1, '#0b1329');
    } else {
      bgGradient.addColorStop(0, '#18181b');
      bgGradient.addColorStop(1, '#27272a');
    }

    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, map.width, map.height);

    // Subtle sandbox grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridSize = 60;
    for (let x = 0; x < map.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, map.height);
      ctx.stroke();
    }
    for (let y = 0; y < map.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(map.width, y);
      ctx.stroke();
    }
  }

  private drawBloodDecals(engine: PhysicsEngine) {
    const ctx = this.ctx;
    for (const decal of engine.bloodDecals) {
      ctx.save();
      ctx.translate(decal.x, decal.y);
      ctx.rotate(decal.angle);
      ctx.fillStyle = decal.color;
      ctx.globalAlpha = decal.alpha;

      ctx.beginPath();
      if (decal.splatterType === 'drip') {
        ctx.ellipse(0, 0, decal.radius * 1.6, decal.radius * 0.8, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(0, 0, decal.radius, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1.0;
  }

  private drawMapObstacles(map: GameMap) {
    const ctx = this.ctx;

    for (const obs of map.obstacles) {
      ctx.save();
      ctx.translate(obs.x, obs.y);
      if (obs.angle) ctx.rotate(obs.angle);

      const hw = obs.width / 2;
      const hh = obs.height / 2;

      if (obs.type === 'hazard') {
        // Spikes with warning stripes
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(-hw, -hh, obs.width, obs.height);
        // Draw sharp triangular teeth
        ctx.fillStyle = '#dc2626';
        const spikeCount = Math.floor(obs.width / 20);
        const spikeW = obs.width / spikeCount;
        for (let i = 0; i < spikeCount; i++) {
          ctx.beginPath();
          ctx.moveTo(-hw + i * spikeW, hh);
          ctx.lineTo(-hw + (i + 0.5) * spikeW, -hh - 14);
          ctx.lineTo(-hw + (i + 1) * spikeW, hh);
          ctx.fill();
        }
      } else if (obs.type === 'glass') {
        // Translucent glass
        ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.fillRect(-hw, -hh, obs.width, obs.height);
        ctx.strokeRect(-hw, -hh, obs.width, obs.height);
      } else {
        // Platform / Solid Wall
        ctx.fillStyle = obs.color;
        ctx.fillRect(-hw, -hh, obs.width, obs.height);

        // Highlight bevel
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 2;
        ctx.strokeRect(-hw, -hh, obs.width, obs.height);

        // Industrial hazard stripes on top ledge
        ctx.fillStyle = '#eab308';
        ctx.fillRect(-hw, -hh, obs.width, 4);
      }

      ctx.restore();
    }
  }

  private drawProps(props: PropObject[]) {
    const ctx = this.ctx;

    for (const prop of props) {
      if (prop.destroyed) continue;

      ctx.save();
      ctx.translate(prop.x, prop.y);
      ctx.rotate(prop.angle);

      const hw = prop.width / 2;
      const hh = prop.height / 2;

      if (prop.type === 'explosive_barrel') {
        // Red explosive barrel with flammable icon
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-hw, -hh, prop.width, prop.height);
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 3;
        ctx.strokeRect(-hw, -hh, prop.width, prop.height);

        // Yellow warning label
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TNT', 0, 0);
      } else if (prop.type === 'spinning_blade') {
        // Circular metallic saw blade with razor teeth
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(0, 0, hw, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Teeth
        ctx.fillStyle = '#f8fafc';
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI * 2) / 8;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * hw, Math.sin(a) * hw);
          ctx.lineTo(Math.cos(a + 0.2) * (hw + 10), Math.sin(a + 0.2) * (hw + 10));
          ctx.lineTo(Math.cos(a + 0.4) * hw, Math.sin(a + 0.4) * hw);
          ctx.fill();
        }
        // Center hub
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
      } else if (prop.type === 'jump_pad') {
        ctx.fillStyle = '#10b981';
        ctx.fillRect(-hw, -hh, prop.width, prop.height);
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 2;
        ctx.strokeRect(-hw, -hh, prop.width, prop.height);
        // Arrow pointing up
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, -hh + 3);
        ctx.lineTo(-8, hh - 4);
        ctx.lineTo(8, hh - 4);
        ctx.fill();
      } else if (prop.type === 'hydraulic_press') {
        ctx.fillStyle = '#0369a1';
        ctx.fillRect(-hw, -hh, prop.width, prop.height);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(-hw, hh - 6, prop.width, 6);
      } else {
        // Generic box / concrete
        ctx.fillStyle = prop.color;
        ctx.fillRect(-hw, -hh, prop.width, prop.height);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        ctx.strokeRect(-hw, -hh, prop.width, prop.height);
        // Diagonal cross line on wooden crate
        if (prop.type === 'wooden_box') {
          ctx.beginPath();
          ctx.moveTo(-hw, -hh);
          ctx.lineTo(hw, hh);
          ctx.moveTo(hw, -hh);
          ctx.lineTo(-hw, hh);
          ctx.stroke();
        }
      }

      ctx.restore();
    }
  }

  private drawRagdoll(ragdoll: Ragdoll, xRayMode: boolean, isSelected: boolean) {
    const ctx = this.ctx;

    // Helper map of particle by name
    const partMap = new Map<BodyPartName, Particle>();
    for (const p of ragdoll.particles) {
      partMap.set(p.name, p);
    }

    const cabeza = partMap.get('cabeza');
    const cuello = partMap.get('cuello');
    const pechobase = partMap.get('pechobase');
    const torso = partMap.get('torso');
    const ombligo = partMap.get('ombligo');
    const pelvis = partMap.get('pelvis');

    const hombroIzq = partMap.get('hombro_izq');
    const brazoIzq = partMap.get('brazo_izq');
    const codoIzq = partMap.get('codo_izq');
    const antebrazoIzq = partMap.get('antebrazo_izq');
    const munecaIzq = partMap.get('muneca_izq');
    const manoIzq = partMap.get('mano_izq');
    const pulgarIzq = partMap.get('dedo_pulgar_izq');
    const indiceIzq = partMap.get('dedo_indice_izq');
    const medioIzq = partMap.get('dedo_medio_izq');

    const hombroDer = partMap.get('hombro_der');
    const brazoDer = partMap.get('brazo_der');
    const codoDer = partMap.get('codo_der');
    const antebrazoDer = partMap.get('antebrazo_der');
    const munecaDer = partMap.get('muneca_der');
    const manoDer = partMap.get('mano_der');
    const pulgarDer = partMap.get('dedo_pulgar_der');
    const indiceDer = partMap.get('dedo_indice_der');
    const medioDer = partMap.get('dedo_medio_der');

    const musloIzq = partMap.get('muslo_izq');
    const rodillaIzq = partMap.get('rodilla_izq');
    const antepiernaIzq = partMap.get('antepierna_izq');
    const tobilloIzq = partMap.get('tobillo_izq');
    const pieIzq = partMap.get('pie_izq');

    const musloDer = partMap.get('muslo_der');
    const rodillaDer = partMap.get('rodilla_der');
    const antepiernaDer = partMap.get('antepierna_der');
    const tobilloDer = partMap.get('tobillo_der');
    const pieDer = partMap.get('pie_der');

    // Selection ring
    if (isSelected && pechobase) {
      ctx.save();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(pechobase.x, pechobase.y, 75 * ragdoll.scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (xRayMode) {
      // ---------------- X-RAY SKELETON MODE ----------------
      this.drawSkeletonXRay(ragdoll);
      return;
    }

    // ---------------- FULL ANATOMICAL BODY RENDERING ----------------

    // 1. Draw Legs (Muslos, Rodillas, Antepiernas/Canillas, Tobillos, Pies)
    this.drawLimbSegment(pelvis, musloIzq, ragdoll.pantsColor, 15, 'muslo');
    this.drawLimbSegment(musloIzq, rodillaIzq, ragdoll.pantsColor, 13, 'rodilla');
    this.drawLimbSegment(rodillaIzq, antepiernaIzq, ragdoll.pantsColor, 12, 'antepierna');
    this.drawLimbSegment(antepiernaIzq, tobilloIzq, ragdoll.pantsColor, 10, 'tobillo');
    this.drawFootSegment(tobilloIzq, pieIzq, ragdoll.shoeColor, ragdoll.facing);

    this.drawLimbSegment(pelvis, musloDer, ragdoll.pantsColor, 15, 'muslo');
    this.drawLimbSegment(musloDer, rodillaDer, ragdoll.pantsColor, 13, 'rodilla');
    this.drawLimbSegment(rodillaDer, antepiernaDer, ragdoll.pantsColor, 12, 'antepierna');
    this.drawLimbSegment(antepiernaDer, tobilloDer, ragdoll.pantsColor, 10, 'tobillo');
    this.drawFootSegment(tobilloDer, pieDer, ragdoll.shoeColor, ragdoll.facing);

    // 2. Draw Torso, Ombligo, Pelvis, Pechobase (Upper chest)
    this.drawSpineTorso(pechobase, torso, ombligo, pelvis, ragdoll);

    // 3. Draw Left Arm (Hombro, Brazo, Codo, Antebrazo, Muñeca, Mano con Dedos)
    this.drawLimbSegment(pechobase, hombroIzq, ragdoll.clothesColor, 12, 'hombro');
    this.drawLimbSegment(hombroIzq, brazoIzq, ragdoll.clothesColor, 11, 'brazo');
    this.drawLimbSegment(brazoIzq, codoIzq, ragdoll.skinTone, 10, 'codo');
    this.drawLimbSegment(codoIzq, antebrazoIzq, ragdoll.skinTone, 9, 'antebrazo');
    this.drawLimbSegment(antebrazoIzq, munecaIzq, ragdoll.skinTone, 8, 'muneca');
    this.drawHandWithFingers(munecaIzq, manoIzq, pulgarIzq, indiceIzq, medioIzq, ragdoll.skinTone);

    // 4. Draw Right Arm (Hombro, Brazo, Codo, Antebrazo, Muñeca, Mano con Dedos)
    this.drawLimbSegment(pechobase, hombroDer, ragdoll.clothesColor, 12, 'hombro');
    this.drawLimbSegment(hombroDer, brazoDer, ragdoll.clothesColor, 11, 'brazo');
    this.drawLimbSegment(brazoDer, codoDer, ragdoll.skinTone, 10, 'codo');
    this.drawLimbSegment(codoDer, antebrazoDer, ragdoll.skinTone, 9, 'antebrazo');
    this.drawLimbSegment(antebrazoDer, munecaDer, ragdoll.skinTone, 8, 'muneca');
    this.drawHandWithFingers(munecaDer, manoDer, pulgarDer, indiceDer, medioDer, ragdoll.skinTone);

    // 5. Draw Cuello (Neck)
    if (cuello && pechobase && !cuello.dismembered) {
      this.drawLimbSegment(pechobase, cuello, ragdoll.skinTone, 11, 'cuello');
    }

    // 6. Draw Cabeza (Head with face, eyes, hair)
    if (cabeza && !cabeza.dismembered) {
      this.drawHead(cabeza, cuello, ragdoll);
    } else if (cabeza) {
      // Severed head flying independently
      this.drawHead(cabeza, undefined, ragdoll);
    }

    // 7. Draw bone stumps & arterial blood if parts are dismembered
    for (const p of ragdoll.particles) {
      if (p.dismembered) {
        this.drawSeveredStump(p);
      }
      if (p.fractured) {
        this.drawFractureIndicator(p);
      }
    }

    // 8. Overhead Health & Status Bar
    if (cabeza || pechobase) {
      const topP = cabeza || pechobase!;
      this.drawHealthBar(topP.x, topP.y - 30 * ragdoll.scale, ragdoll);
    }
  }

  private drawLimbSegment(
    p1: Particle | undefined,
    p2: Particle | undefined,
    color: string,
    thickness: number,
    label: string
  ) {
    if (!p1 || !p2) return;
    const ctx = this.ctx;

    // Check if detached
    const isDetached = p1.dismembered && p2.dismembered;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 85) return; // limb has been completely ripped off

    ctx.save();
    ctx.strokeStyle = p1.isAcidic ? '#4ade80' : color;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    // Damage redness overlay
    if (p2.health < p2.maxHealth * 0.7) {
      ctx.strokeStyle = `rgba(220, 38, 38, ${0.7 - (p2.health / p2.maxHealth) * 0.7})`;
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawSpineTorso(
    pechobase: Particle | undefined,
    torso: Particle | undefined,
    ombligo: Particle | undefined,
    pelvis: Particle | undefined,
    ragdoll: Ragdoll
  ) {
    if (!pechobase || !pelvis) return;
    const ctx = this.ctx;

    ctx.save();
    // Torso clothing shape
    ctx.fillStyle = pechobase.isAcidic ? '#4ade80' : ragdoll.clothesColor;

    ctx.beginPath();
    if (torso && ombligo) {
      ctx.moveTo(pechobase.x - 20, pechobase.y);
      ctx.lineTo(pechobase.x + 20, pechobase.y);
      ctx.lineTo(torso.x + 18, torso.y);
      ctx.lineTo(ombligo.x + 15, ombligo.y);
      ctx.lineTo(pelvis.x + 16, pelvis.y);
      ctx.lineTo(pelvis.x - 16, pelvis.y);
      ctx.lineTo(ombligo.x - 15, ombligo.y);
      ctx.lineTo(torso.x - 18, torso.y);
      ctx.closePath();
      ctx.fill();
    }

    // SWAT vest or clothing details
    if (ragdoll.armorColor) {
      ctx.fillStyle = ragdoll.armorColor;
      ctx.fillRect(torso ? torso.x - 14 : pechobase.x - 14, pechobase.y + 4, 28, 26);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('POLICE', torso ? torso.x : pechobase.x, pechobase.y + 18);
    }

    // Belt on pelvis
    if (pelvis) {
      ctx.fillStyle = '#020617';
      ctx.fillRect(pelvis.x - 16, pelvis.y - 4, 32, 8);
      ctx.fillStyle = '#f59e0b'; // buckle
      ctx.fillRect(pelvis.x - 4, pelvis.y - 4, 8, 8);
    }

    ctx.restore();
  }

  private drawHandWithFingers(
    muneca: Particle | undefined,
    mano: Particle | undefined,
    pulgar: Particle | undefined,
    indice: Particle | undefined,
    medio: Particle | undefined,
    skinColor: string
  ) {
    if (!mano) return;
    const ctx = this.ctx;

    ctx.save();
    // Hand palm
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(mano.x, mano.y, mano.radius, 0, Math.PI * 2);
    ctx.fill();

    // Finger rays
    ctx.strokeStyle = skinColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    if (pulgar) {
      ctx.beginPath();
      ctx.moveTo(mano.x, mano.y);
      ctx.lineTo(pulgar.x, pulgar.y);
      ctx.stroke();
    }
    if (indice) {
      ctx.beginPath();
      ctx.moveTo(mano.x, mano.y);
      ctx.lineTo(indice.x, indice.y);
      ctx.stroke();
    }
    if (medio) {
      ctx.beginPath();
      ctx.moveTo(mano.x, mano.y);
      ctx.lineTo(medio.x, medio.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawFootSegment(
    tobillo: Particle | undefined,
    pie: Particle | undefined,
    shoeColor: string,
    facing: number
  ) {
    if (!tobillo || !pie) return;
    const ctx = this.ctx;

    ctx.save();
    ctx.fillStyle = shoeColor;
    ctx.beginPath();
    // Boot shape
    ctx.ellipse(pie.x, pie.y, 11, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // White sole
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(pie.x - 10, pie.y + 4, 20, 3);

    ctx.restore();
  }

  private drawHead(cabeza: Particle, cuello: Particle | undefined, ragdoll: Ragdoll) {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(cabeza.x, cabeza.y);

    // Head base circle
    ctx.fillStyle = cabeza.isAcidic ? '#4ade80' : ragdoll.skinTone;
    ctx.beginPath();
    ctx.arc(0, 0, cabeza.radius, 0, Math.PI * 2);
    ctx.fill();

    // Facial expression (alive vs dead)
    const eyeOffsetX = ragdoll.facing * 5;

    if (!ragdoll.isAlive) {
      // Dead "X" eyes
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      // Eye 1
      ctx.beginPath();
      ctx.moveTo(eyeOffsetX - 3, -4);
      ctx.lineTo(eyeOffsetX + 3, 2);
      ctx.moveTo(eyeOffsetX + 3, -4);
      ctx.lineTo(eyeOffsetX - 3, 2);
      ctx.stroke();
      // Bleeding mouth
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.arc(eyeOffsetX, 6, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Alive eyes looking towards target
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(eyeOffsetX, -2, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Mouth
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(eyeOffsetX, 4, 3, 0, Math.PI);
      ctx.stroke();
    }

    // Hair or Helmet
    if (ragdoll.type === 'swat') {
      // Tactical helmet & visor
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, -3, cabeza.radius + 2, Math.PI, Math.PI * 2);
      ctx.fill();
      // Visor
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-8, -4, 16, 5);
    } else if (ragdoll.type === 'mutant') {
      // Mutated spikes on head
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.moveTo(-10, -12);
      ctx.lineTo(0, -22);
      ctx.lineTo(10, -12);
      ctx.fill();
    } else {
      // Normal hair
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.arc(0, -4, cabeza.radius + 1, Math.PI * 0.8, Math.PI * 2.2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawSeveredStump(p: Particle) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);

    // Exposed bone cylinder
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawFractureIndicator(p: Particle) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Lightning fracture icon
    ctx.moveTo(p.x - 6, p.y - 6);
    ctx.lineTo(p.x, p.y);
    ctx.lineTo(p.x - 2, p.y + 4);
    ctx.lineTo(p.x + 6, p.y + 7);
    ctx.stroke();
    ctx.restore();
  }

  private drawSkeletonXRay(ragdoll: Ragdoll) {
    const ctx = this.ctx;
    ctx.save();

    // Draw all bone constraints
    for (const c of ragdoll.constraints) {
      if (c.broken) continue;
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(c.p1.x, c.p1.y);
      ctx.lineTo(c.p2.x, c.p2.y);
      ctx.stroke();
    }

    // Draw bone joints (Skull, Vert, Pelvis, Knees)
    for (const p of ragdoll.particles) {
      ctx.fillStyle = p.fractured ? '#ef4444' : '#f8fafc';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.name === 'cabeza' ? 14 : 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawHealthBar(x: number, y: number, ragdoll: Ragdoll) {
    const ctx = this.ctx;
    const barW = 55 * ragdoll.scale;
    const barH = 6;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(x - barW / 2 - 1, y - 1, barW + 2, barH + 2);

    const hpPercent = Math.max(0, ragdoll.totalHealth) / 100;
    ctx.fillStyle = hpPercent > 0.5 ? '#22c55e' : hpPercent > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillRect(x - barW / 2, y, barW * hpPercent, barH);

    // Name tag
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(ragdoll.name, x, y - 4);

    ctx.restore();
  }

  private drawBullets(engine: PhysicsEngine) {
    const ctx = this.ctx;

    for (const b of engine.bullets) {
      ctx.save();

      // Bullet trail
      if (b.trail.length > 1) {
        ctx.strokeStyle = b.color;
        ctx.lineWidth = b.caliber === 'rocket' ? 4 : 2;
        ctx.beginPath();
        ctx.moveTo(b.trail[0].x, b.trail[0].y);
        for (let i = 1; i < b.trail.length; i++) {
          ctx.lineTo(b.trail[i].x, b.trail[i].y);
        }
        ctx.stroke();
      }

      // Bullet head
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.caliber === 'rocket' ? 6 : 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawBloodParticles(engine: PhysicsEngine) {
    const ctx = this.ctx;
    for (const bp of engine.bloodParticles) {
      ctx.save();
      ctx.fillStyle = bp.color;
      ctx.globalAlpha = bp.life;
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, bp.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1.0;
  }

  private drawExplosions(engine: PhysicsEngine) {
    const ctx = this.ctx;

    for (const exp of engine.explosions) {
      ctx.save();
      const grad = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, exp.radius);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      grad.addColorStop(0.3, 'rgba(249, 115, 22, 0.8)');
      grad.addColorStop(0.7, 'rgba(220, 38, 38, 0.5)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawPhysgunBeam(
    engine: PhysicsEngine,
    crosshair: Vector2,
    activeWeapon: WeaponType,
    isShooting: boolean
  ) {
    const ctx = this.ctx;

    // Physgun tether beam
    if (engine.physgunTarget.active && (engine.physgunTarget.particle || engine.physgunTarget.prop)) {
      const targetPos = engine.physgunTarget.particle
        ? { x: engine.physgunTarget.particle.x, y: engine.physgunTarget.particle.y }
        : { x: engine.physgunTarget.prop!.x, y: engine.physgunTarget.prop!.y };

      ctx.save();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 10;

      // Electric arc
      ctx.beginPath();
      ctx.moveTo(crosshair.x, crosshair.y);
      const segments = 8;
      for (let i = 1; i < segments; i++) {
        const t = i / segments;
        const lx = crosshair.x + (targetPos.x - crosshair.x) * t;
        const ly = crosshair.y + (targetPos.y - crosshair.y) * t;
        const jitter = (Math.random() - 0.5) * 14;
        ctx.lineTo(lx + jitter, ly + jitter);
      }
      ctx.lineTo(targetPos.x, targetPos.y);
      ctx.stroke();

      // Highlight target particle
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(targetPos.x, targetPos.y, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Aim Crosshair
    ctx.save();
    ctx.strokeStyle = activeWeapon === 'physgun' ? '#06b6d4' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(crosshair.x, crosshair.y, 14, 0, Math.PI * 2);
    ctx.moveTo(crosshair.x - 18, crosshair.y);
    ctx.lineTo(crosshair.x + 18, crosshair.y);
    ctx.moveTo(crosshair.x, crosshair.y - 18);
    ctx.lineTo(crosshair.x, crosshair.y + 18);
    ctx.stroke();
    ctx.restore();
  }
}
