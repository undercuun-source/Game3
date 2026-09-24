import * as THREE from 'three';
import { BodyPartName, HotNPCEmotions, HotPoseType, Ragdoll3D } from '../types/physics3d';

export const ALL_HOT_POSES: { type: HotPoseType; label: string; description: string }[] = [
  { type: 'standing_lift_face_to_face', label: 'Abrazo Elevado Frontal', description: 'Elevación en el aire con piernas entrelazadas cara a cara' },
  { type: 'standing_lift_rear', label: 'Abrazo Trasero Elevado', description: 'Elevación desde atrás sujetando muslos y cintura' },
  { type: 'all_fours_arch', label: 'A Cuatro Patas Inclinado', description: 'En suelo apoyado sobre rodillas y codos/manos arqueado' },
  { type: 'missionary_embrace', label: 'Misionero Íntimo en Suelo', description: 'Acostados cara a cara con piernas elevadas en suelo' },
  { type: 'mating_press', label: 'Flexión Profunda (Mating Press)', description: 'Acostado boca arriba con piernas replegadas al pecho' },
  { type: 'standing_wheelbarrow', label: 'Carretilla Elevada de Pie', description: 'Manos en suelo y cadera/piernas elevadas por el NPC' },
  { type: 'bridal_cradle', label: 'Cuna en Brazos (Carga Nupcial)', description: 'Sostenido horizontalmente en brazos con delicadeza' },
  { type: 'lap_straddle_cowgirl', label: 'A Horcajadas Sentados de Frente', description: 'Sentado en el regazo cara a cara con piernas rodeando cadera' },
  { type: 'lap_reverse_cowgirl', label: 'A Horcajadas Sentados de Espaldas', description: 'Sentado en el regazo mirando hacia adelante' },
  { type: 'standing_wall_press', label: 'Abrazo Vertical Firme', description: 'Cuerpos pegados de pie en abrazo estrecho' },
  { type: 'chair_lean_over', label: 'Inclinación en Soporte / Silla', description: 'Torso inclinado 80° hacia adelante sobre soporte' },
  { type: 'standing_bent_over', label: 'Flexión de Pie 90 Grados', description: 'Cuerpo inclinado en ángulo recto de pie' },
  { type: 'side_spoon_embrace', label: 'Cuchara Lateral en Suelo', description: 'Acostados de lado acoplados con piernas flexionadas' },
  { type: 'standing_shoulder_carry', label: 'Carga sobre el Hombro', description: 'Sostenido y balanceado sobre el hombro del NPC' },
];

/**
 * Autonomous AI decision-making engine for Hot Sandbox NPCs.
 * Updates mood, passion, dominance, affection, stamina, and chooses poses dynamically based on thoughts.
 */
export function updateHotNPCAIEngine(npc: Ragdoll3D, partner: Ragdoll3D, dt: number) {
  if (!npc.hotNPCEmotions) {
    npc.hotNPCEmotions = {
      passion: 70 + Math.random() * 25,
      dominance: 45 + Math.random() * 45,
      affection: 60 + Math.random() * 35,
      playfulness: 50 + Math.random() * 40,
      stamina: 80 + Math.random() * 20,
      currentMood: 'passionate',
      decisionTimer: 3.0 + Math.random() * 3.0,
      currentThought: '¡Atracción intensa! Iniciando interacción y analizando pose...',
    };
    npc.hotNPCPose = 'standing_lift_face_to_face';
  }

  const emo = npc.hotNPCEmotions;
  emo.decisionTimer -= dt;

  // Emotional feedback dynamics
  emo.passion = Math.min(100, emo.passion + dt * 2.0);

  // Stamina consumption depending on physical intensity of pose
  const isStrenuous =
    npc.hotNPCPose === 'standing_lift_face_to_face' ||
    npc.hotNPCPose === 'standing_shoulder_carry' ||
    npc.hotNPCPose === 'standing_wheelbarrow' ||
    npc.hotNPCPose === 'standing_lift_rear';

  if (isStrenuous) {
    emo.stamina = Math.max(15, emo.stamina - dt * 3.5);
  } else {
    emo.stamina = Math.min(100, emo.stamina + dt * 2.2);
  }

  // Recalculate mood state
  if (emo.stamina < 30) {
    emo.currentMood = 'resting';
  } else if (emo.dominance > 75 && emo.passion > 75) {
    emo.currentMood = 'dominant';
  } else if (emo.affection > 75) {
    emo.currentMood = 'tender';
  } else if (emo.playfulness > 70) {
    emo.currentMood = 'playful';
  } else if (emo.passion > 85) {
    emo.currentMood = 'ecstatic';
  } else {
    emo.currentMood = 'passionate';
  }

  // Autonomous Decision: Switch Pose when timer expires
  if (emo.decisionTimer <= 0) {
    emo.decisionTimer = 4.5 + Math.random() * 6.5; // Next decision in 4.5 - 11s

    const posesForMood: Record<string, HotPoseType[]> = {
      passionate: [
        'standing_lift_face_to_face',
        'missionary_embrace',
        'standing_wall_press',
        'lap_straddle_cowgirl',
        'standing_bent_over',
      ],
      dominant: [
        'mating_press',
        'standing_wheelbarrow',
        'all_fours_arch',
        'standing_shoulder_carry',
        'standing_lift_rear',
      ],
      tender: [
        'bridal_cradle',
        'side_spoon_embrace',
        'missionary_embrace',
        'standing_wall_press',
        'lap_straddle_cowgirl',
      ],
      playful: [
        'lap_reverse_cowgirl',
        'standing_lift_rear',
        'chair_lean_over',
        'standing_wheelbarrow',
        'bridal_cradle',
      ],
      ecstatic: [
        'standing_lift_face_to_face',
        'mating_press',
        'all_fours_arch',
        'standing_lift_rear',
        'standing_shoulder_carry',
      ],
      resting: [
        'side_spoon_embrace',
        'lap_straddle_cowgirl',
        'missionary_embrace',
        'standing_wall_press',
      ],
    };

    const pool = posesForMood[emo.currentMood] || [
      'standing_lift_face_to_face',
      'missionary_embrace',
      'all_fours_arch',
    ];

    // Filter out current pose if multiple available
    const available = pool.filter((p) => p !== npc.hotNPCPose);
    const chosenPose = available.length > 0
      ? available[Math.floor(Math.random() * available.length)]
      : pool[0];

    npc.hotNPCPose = chosenPose;

    const thoughtMap: Record<HotPoseType, string> = {
      standing_lift_face_to_face: 'Deseo intenso: ¡Elevando en el aire cara a cara!',
      standing_lift_rear: 'Jugando con ritmo: Abrazo trasero elevado',
      all_fours_arch: 'Dominancia apasionada: Inclinación en suelo',
      missionary_embrace: 'Ternura e intimidad: Abrazo íntimo en suelo',
      mating_press: 'Pasión total: Flexión profunda y cercanía máxima',
      standing_wheelbarrow: 'Acrobacia atrevida: Elevación de cadera de pie',
      bridal_cradle: 'Afecto dulce: Sosteniendo en brazos estilo cuna',
      lap_straddle_cowgirl: 'Comodidad compartida: Sentados a horcajadas cara a cara',
      lap_reverse_cowgirl: 'Curiosidad juguetona: A horcajadas de espaldas',
      standing_wall_press: 'Firmeza y deseo: Abrazo de pie contra soporte',
      chair_lean_over: 'Variación ergonómica: Inclinación hacia adelante',
      standing_bent_over: 'Contacto directo: Flexión de pie 90°',
      side_spoon_embrace: 'Descanso y placer: Abrazados en posición de cuchara',
      standing_shoulder_carry: 'Fuerza extrema: Carga sobre el hombro',
    };

    emo.currentThought = thoughtMap[chosenPose] || 'Pensando en la siguiente pose ideal...';
  }
}

/**
 * Computes exact physical alignments, pelvis target offsets, crouch levels,
 * and limb orientations for the active pose between the Hot NPC and the partner.
 */
export function applyHotNPCPose(npc: Ragdoll3D, partner: Ragdoll3D, dt: number) {
  const pose: HotPoseType = npc.hotNPCPose || 'standing_lift_face_to_face';
  const npcScale = npc.scale ?? 1.0;
  const partnerScale = partner.scale ?? 1.0;

  const forwardX = Math.sin(npc.facingAngle);
  const forwardZ = Math.cos(npc.facingAngle);
  const rightX = Math.cos(npc.facingAngle);
  const rightZ = -Math.sin(npc.facingAngle);

  // Default lerp speed
  const lerpSpeed = 7.0 * dt;

  // Base NPC position
  const npcX = npc.charPos.x;
  const npcY = npc.charPos.y;
  const npcZ = npc.charPos.z;

  let targetPartnerX = npcX;
  let targetPartnerY = npcY;
  let targetPartnerZ = npcZ;
  let targetPartnerFacing = npc.facingAngle + Math.PI; // Face to face default
  let npcCrouch = 0.15 * npcScale;
  let partnerCrouch = 0.20 * partnerScale;

  switch (pose) {
    case 'standing_lift_face_to_face': {
      // Elevated Standing Carry: Partner lifted ~0.55m in the air, legs wrapped around hips
      const offsetDist = 0.28 * (npcScale + partnerScale) * 0.5;
      targetPartnerX = npcX + forwardX * offsetDist;
      targetPartnerY = npcY + 0.52 * npcScale;
      targetPartnerZ = npcZ + forwardZ * offsetDist;
      targetPartnerFacing = npc.facingAngle + Math.PI;
      npcCrouch = 0.12 * npcScale;
      partnerCrouch = 0.65 * partnerScale; // High leg flexion
      break;
    }

    case 'standing_lift_rear': {
      // Standing Rear Lift / Piggyback: Lifted from behind
      const offsetDist = 0.24 * (npcScale + partnerScale) * 0.5;
      targetPartnerX = npcX + forwardX * offsetDist;
      targetPartnerY = npcY + 0.42 * npcScale;
      targetPartnerZ = npcZ + forwardZ * offsetDist;
      targetPartnerFacing = npc.facingAngle; // Facing away from NPC
      npcCrouch = 0.18 * npcScale;
      partnerCrouch = 0.55 * partnerScale;
      break;
    }

    case 'all_fours_arch': {
      // Kneeling all-fours / doggy on ground
      const offsetDist = 0.38 * (npcScale + partnerScale) * 0.5;
      targetPartnerX = npcX + forwardX * offsetDist;
      targetPartnerY = Math.max(0, npcY - 0.35 * npcScale);
      targetPartnerZ = npcZ + forwardZ * offsetDist;
      targetPartnerFacing = npc.facingAngle;
      npcCrouch = 0.45 * npcScale; // NPC deep crouch
      partnerCrouch = 0.75 * partnerScale; // Partner arched on floor
      break;
    }

    case 'missionary_embrace': {
      // Lying on floor face to face
      const offsetDist = 0.18 * (npcScale + partnerScale) * 0.5;
      targetPartnerX = npcX + forwardX * offsetDist;
      targetPartnerY = Math.max(0, npcY - 0.70 * npcScale);
      targetPartnerZ = npcZ + forwardZ * offsetDist;
      targetPartnerFacing = npc.facingAngle + Math.PI;
      npcCrouch = 0.75 * npcScale; // NPC on ground
      partnerCrouch = 0.85 * partnerScale;
      break;
    }

    case 'mating_press': {
      // Lying on back with hips tilted up and legs pressed to chest
      const offsetDist = 0.22 * (npcScale + partnerScale) * 0.5;
      targetPartnerX = npcX + forwardX * offsetDist;
      targetPartnerY = Math.max(0, npcY - 0.55 * npcScale);
      targetPartnerZ = npcZ + forwardZ * offsetDist;
      targetPartnerFacing = npc.facingAngle + Math.PI;
      npcCrouch = 0.65 * npcScale;
      partnerCrouch = 0.90 * partnerScale;
      break;
    }

    case 'standing_wheelbarrow': {
      // Partner hands on floor, hips lifted high by NPC
      const offsetDist = 0.48 * (npcScale + partnerScale) * 0.5;
      targetPartnerX = npcX + forwardX * offsetDist;
      targetPartnerY = Math.max(0, npcY + 0.15 * npcScale);
      targetPartnerZ = npcZ + forwardZ * offsetDist;
      targetPartnerFacing = npc.facingAngle;
      npcCrouch = 0.15 * npcScale;
      partnerCrouch = 0.45 * partnerScale;
      break;
    }

    case 'bridal_cradle': {
      // Held horizontally in arms
      const offsetDist = 0.28 * (npcScale + partnerScale) * 0.5;
      targetPartnerX = npcX + forwardX * offsetDist + rightX * 0.1;
      targetPartnerY = npcY + 0.35 * npcScale;
      targetPartnerZ = npcZ + forwardZ * offsetDist + rightZ * 0.1;
      targetPartnerFacing = npc.facingAngle + Math.PI * 0.5; // Sideways in arms
      npcCrouch = 0.18 * npcScale;
      partnerCrouch = 0.40 * partnerScale;
      break;
    }

    case 'lap_straddle_cowgirl': {
      // NPC sitting, partner on lap face to face
      const offsetDist = 0.15 * (npcScale + partnerScale) * 0.5;
      targetPartnerX = npcX + forwardX * offsetDist;
      targetPartnerY = Math.max(0, npcY - 0.15 * npcScale);
      targetPartnerZ = npcZ + forwardZ * offsetDist;
      targetPartnerFacing = npc.facingAngle + Math.PI;
      npcCrouch = 0.55 * npcScale; // Seated NPC
      partnerCrouch = 0.70 * partnerScale;
      break;
    }

    case 'lap_reverse_cowgirl': {
      // NPC sitting, partner on lap facing away
      const offsetDist = 0.15 * (npcScale + partnerScale) * 0.5;
      targetPartnerX = npcX + forwardX * offsetDist;
      targetPartnerY = Math.max(0, npcY - 0.15 * npcScale);
      targetPartnerZ = npcZ + forwardZ * offsetDist;
      targetPartnerFacing = npc.facingAngle;
      npcCrouch = 0.55 * npcScale;
      partnerCrouch = 0.70 * partnerScale;
      break;
    }

    case 'standing_wall_press': {
      // Close standing embrace
      const offsetDist = 0.22 * (npcScale + partnerScale) * 0.5;
      targetPartnerX = npcX + forwardX * offsetDist;
      targetPartnerY = npcY;
      targetPartnerZ = npcZ + forwardZ * offsetDist;
      targetPartnerFacing = npc.facingAngle + Math.PI;
      npcCrouch = 0.08 * npcScale;
      partnerCrouch = 0.12 * partnerScale;
      break;
    }

    case 'chair_lean_over': {
      // Partner bent forward over support
      const offsetDist = 0.35 * (npcScale + partnerScale) * 0.5;
      targetPartnerX = npcX + forwardX * offsetDist;
      targetPartnerY = Math.max(0, npcY - 0.12 * npcScale);
      targetPartnerZ = npcZ + forwardZ * offsetDist;
      targetPartnerFacing = npc.facingAngle;
      npcCrouch = 0.22 * npcScale;
      partnerCrouch = 0.50 * partnerScale;
      break;
    }

    case 'standing_bent_over': {
      // Standing partner bent 90° forward
      const offsetDist = 0.32 * (npcScale + partnerScale) * 0.5;
      targetPartnerX = npcX + forwardX * offsetDist;
      targetPartnerY = npcY;
      targetPartnerZ = npcZ + forwardZ * offsetDist;
      targetPartnerFacing = npc.facingAngle;
      npcCrouch = 0.14 * npcScale;
      partnerCrouch = 0.40 * partnerScale;
      break;
    }

    case 'side_spoon_embrace': {
      // Lying on side spooning
      const offsetDist = 0.16 * (npcScale + partnerScale) * 0.5;
      targetPartnerX = npcX + forwardX * offsetDist;
      targetPartnerY = Math.max(0, npcY - 0.75 * npcScale);
      targetPartnerZ = npcZ + forwardZ * offsetDist;
      targetPartnerFacing = npc.facingAngle;
      npcCrouch = 0.85 * npcScale;
      partnerCrouch = 0.85 * partnerScale;
      break;
    }

    case 'standing_shoulder_carry': {
      // Partner carried over shoulder
      const offsetDist = 0.12 * npcScale;
      targetPartnerX = npcX + forwardX * offsetDist + rightX * 0.25 * npcScale;
      targetPartnerY = npcY + 0.75 * npcScale; // On shoulder
      targetPartnerZ = npcZ + forwardZ * offsetDist + rightZ * 0.25 * npcScale;
      targetPartnerFacing = npc.facingAngle + Math.PI * 0.5;
      npcCrouch = 0.10 * npcScale;
      partnerCrouch = 0.50 * partnerScale;
      break;
    }
  }

  // Smoothly lerp NPC and Partner crouch offsets
  npc.crouchOffset = THREE.MathUtils.lerp(npc.crouchOffset || 0, npcCrouch, lerpSpeed);
  partner.crouchOffset = THREE.MathUtils.lerp(partner.crouchOffset || 0, partnerCrouch, lerpSpeed);

  // Smoothly move partner root position
  partner.charPos.x = THREE.MathUtils.lerp(partner.charPos.x, targetPartnerX, lerpSpeed);
  partner.charPos.y = THREE.MathUtils.lerp(partner.charPos.y, targetPartnerY, lerpSpeed);
  partner.charPos.z = THREE.MathUtils.lerp(partner.charPos.z, targetPartnerZ, lerpSpeed);

  // Smoothly rotate partner to match target orientation
  let angleDiff = targetPartnerFacing - partner.facingAngle;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  partner.facingAngle += angleDiff * Math.min(1.0, 10.0 * dt);
}

/**
 * Custom particle position modifications for partner limbs depending on the pose
 */
export function getPosePartnerParticleOffset(
  pose: HotPoseType | undefined,
  partName: BodyPartName,
  npc: Ragdoll3D,
  partner: Ragdoll3D
): THREE.Vector3 | null {
  if (!pose) return null;
  const pScale = partner.scale ?? 1.0;
  const nScale = npc.scale ?? 1.0;

  const partnerForwardX = Math.sin(partner.facingAngle);
  const partnerForwardZ = Math.cos(partner.facingAngle);
  const partnerRightX = Math.cos(partner.facingAngle);
  const partnerRightZ = -Math.sin(partner.facingAngle);

  const npcForwardX = Math.sin(npc.facingAngle);
  const npcForwardZ = Math.cos(npc.facingAngle);
  const npcRightX = Math.cos(npc.facingAngle);
  const npcRightZ = -Math.sin(npc.facingAngle);

  const pPosX = partner.charPos.x;
  const pPosY = partner.charPos.y;
  const pPosZ = partner.charPos.z;

  const nPosX = npc.charPos.x;
  const nPosY = npc.charPos.y;
  const nPosZ = npc.charPos.z;

  // 1. STANDING LIFT FACE TO FACE (Elevated carry, legs wrapped around hips, arms around neck)
  if (pose === 'standing_lift_face_to_face') {
    if (partName.includes('muslo_izq') || partName.includes('rodilla_izq') || partName.includes('pie_izq') || partName.includes('antepierna_izq')) {
      return new THREE.Vector3(
        pPosX - partnerRightX * 0.28 * pScale + partnerForwardX * 0.18 * pScale,
        pPosY + 0.18 * pScale,
        pPosZ - partnerRightZ * 0.28 * pScale + partnerForwardZ * 0.18 * pScale
      );
    }
    if (partName.includes('muslo_der') || partName.includes('rodilla_der') || partName.includes('pie_der') || partName.includes('antepierna_der')) {
      return new THREE.Vector3(
        pPosX + partnerRightX * 0.28 * pScale + partnerForwardX * 0.18 * pScale,
        pPosY + 0.18 * pScale,
        pPosZ + partnerRightZ * 0.28 * pScale + partnerForwardZ * 0.18 * pScale
      );
    }
    if (partName.includes('mano_izq') || partName.includes('antebrazo_izq')) {
      return new THREE.Vector3(
        nPosX - npcRightX * 0.14 * nScale,
        nPosY + 1.42 * nScale,
        nPosZ - npcRightZ * 0.14 * nScale
      );
    }
    if (partName.includes('mano_der') || partName.includes('antebrazo_der')) {
      return new THREE.Vector3(
        nPosX + npcRightX * 0.14 * nScale,
        nPosY + 1.42 * nScale,
        nPosZ + npcRightZ * 0.14 * nScale
      );
    }
  }

  // 2. STANDING LIFT REAR (Elevated from behind, legs hooked around NPC hips, arms resting back)
  if (pose === 'standing_lift_rear') {
    if (partName.includes('muslo_izq') || partName.includes('rodilla_izq') || partName.includes('pie_izq')) {
      return new THREE.Vector3(
        pPosX - partnerRightX * 0.24 * pScale - partnerForwardX * 0.12 * pScale,
        pPosY + 0.20 * pScale,
        pPosZ - partnerRightZ * 0.24 * pScale - partnerForwardZ * 0.12 * pScale
      );
    }
    if (partName.includes('muslo_der') || partName.includes('rodilla_der') || partName.includes('pie_der')) {
      return new THREE.Vector3(
        pPosX + partnerRightX * 0.24 * pScale - partnerForwardX * 0.12 * pScale,
        pPosY + 0.20 * pScale,
        pPosZ + partnerRightZ * 0.24 * pScale - partnerForwardZ * 0.12 * pScale
      );
    }
  }

  // 3. ALL FOURS ARCH (Kneeling hands and knees on floor, arched pelvis)
  if (pose === 'all_fours_arch') {
    if (partName.includes('mano_izq') || partName.includes('mano_der')) {
      const isL = partName.includes('izq');
      return new THREE.Vector3(
        pPosX + partnerForwardX * 0.46 * pScale + (isL ? -partnerRightX : partnerRightX) * 0.18 * pScale,
        Math.max(0, pPosY),
        pPosZ + partnerForwardZ * 0.46 * pScale + (isL ? -partnerRightZ : partnerRightZ) * 0.18 * pScale
      );
    }
    if (partName.includes('rodilla_izq') || partName.includes('rodilla_der')) {
      const isL = partName.includes('izq');
      return new THREE.Vector3(
        pPosX - partnerForwardX * 0.10 * pScale + (isL ? -partnerRightX : partnerRightX) * 0.16 * pScale,
        Math.max(0, pPosY),
        pPosZ - partnerForwardZ * 0.10 * pScale + (isL ? -partnerRightZ : partnerRightZ) * 0.16 * pScale
      );
    }
  }

  // 4. MISSIONARY EMBRACE (Lying on back, legs bent up slightly, arms open)
  if (pose === 'missionary_embrace') {
    if (partName.includes('rodilla_izq') || partName.includes('rodilla_der')) {
      const isL = partName.includes('izq');
      return new THREE.Vector3(
        pPosX + (isL ? -partnerRightX : partnerRightX) * 0.26 * pScale,
        pPosY + 0.35 * pScale,
        pPosZ + (isL ? -partnerRightZ : partnerRightZ) * 0.26 * pScale
      );
    }
    if (partName.includes('mano_izq') || partName.includes('mano_der')) {
      const isL = partName.includes('izq');
      return new THREE.Vector3(
        nPosX + (isL ? -npcRightX : npcRightX) * 0.22 * nScale,
        nPosY + 0.45 * nScale,
        nPosZ + (isL ? -npcRightZ : npcRightZ) * 0.22 * nScale
      );
    }
  }

  // 5. MATING PRESS (Lying back, legs pressed tight back over chest)
  if (pose === 'mating_press') {
    if (partName.includes('rodilla_izq') || partName.includes('pie_izq') || partName.includes('antepierna_izq')) {
      return new THREE.Vector3(
        pPosX - partnerRightX * 0.20 * pScale,
        pPosY + 0.58 * pScale,
        pPosZ - partnerRightZ * 0.20 * pScale
      );
    }
    if (partName.includes('rodilla_der') || partName.includes('pie_der') || partName.includes('antepierna_der')) {
      return new THREE.Vector3(
        pPosX + partnerRightX * 0.20 * pScale,
        pPosY + 0.58 * pScale,
        pPosZ + partnerRightZ * 0.20 * pScale
      );
    }
  }

  // 6. STANDING WHEELBARROW (Hands on floor, hips/legs lifted high by standing NPC)
  if (pose === 'standing_wheelbarrow') {
    if (partName.includes('mano_izq') || partName.includes('mano_der')) {
      const isL = partName.includes('izq');
      return new THREE.Vector3(
        pPosX + partnerForwardX * 0.50 * pScale + (isL ? -partnerRightX : partnerRightX) * 0.20 * pScale,
        Math.max(0, pPosY - 0.40 * pScale),
        pPosZ + partnerForwardZ * 0.50 * pScale + (isL ? -partnerRightZ : partnerRightZ) * 0.20 * pScale
      );
    }
    if (partName.includes('pie_izq') || partName.includes('pie_der') || partName.includes('rodilla_izq') || partName.includes('rodilla_der')) {
      const isL = partName.includes('izq');
      return new THREE.Vector3(
        nPosX + (isL ? -npcRightX : npcRightX) * 0.18 * nScale + npcForwardX * 0.10 * nScale,
        nPosY + 0.90 * nScale,
        nPosZ + (isL ? -npcRightZ : npcRightZ) * 0.18 * nScale + npcForwardZ * 0.10 * nScale
      );
    }
  }

  // 7. BRIDAL CRADLE (Horizontal carry in arms)
  if (pose === 'bridal_cradle') {
    if (partName.includes('cabeza') || partName.includes('cuello')) {
      return new THREE.Vector3(
        nPosX - npcRightX * 0.28 * nScale,
        nPosY + 1.25 * nScale,
        nPosZ - npcRightZ * 0.28 * nScale
      );
    }
    if (partName.includes('pie_izq') || partName.includes('pie_der')) {
      return new THREE.Vector3(
        nPosX + npcRightX * 0.35 * nScale,
        nPosY + 1.15 * nScale,
        nPosZ + npcRightZ * 0.35 * nScale
      );
    }
  }

  // 8. LAP STRADDLE COWGIRL (Sitting lap face to face)
  if (pose === 'lap_straddle_cowgirl') {
    if (partName.includes('rodilla_izq') || partName.includes('pie_izq')) {
      return new THREE.Vector3(
        nPosX - npcRightX * 0.25 * nScale + npcForwardX * 0.12 * nScale,
        nPosY + 0.35 * nScale,
        nPosZ - npcRightZ * 0.25 * nScale + npcForwardZ * 0.12 * nScale
      );
    }
    if (partName.includes('rodilla_der') || partName.includes('pie_der')) {
      return new THREE.Vector3(
        nPosX + npcRightX * 0.25 * nScale + npcForwardX * 0.12 * nScale,
        nPosY + 0.35 * nScale,
        nPosZ + npcRightZ * 0.25 * nScale + npcForwardZ * 0.12 * nScale
      );
    }
  }

  // 9. LAP REVERSE COWGIRL (Sitting lap facing away)
  if (pose === 'lap_reverse_cowgirl') {
    if (partName.includes('rodilla_izq') || partName.includes('pie_izq')) {
      return new THREE.Vector3(
        nPosX - npcRightX * 0.24 * nScale + npcForwardX * 0.15 * nScale,
        nPosY + 0.35 * nScale,
        nPosZ - npcRightZ * 0.24 * nScale + npcForwardZ * 0.15 * nScale
      );
    }
    if (partName.includes('rodilla_der') || partName.includes('pie_der')) {
      return new THREE.Vector3(
        nPosX + npcRightX * 0.24 * nScale + npcForwardX * 0.15 * nScale,
        nPosY + 0.35 * nScale,
        nPosZ + npcRightZ * 0.24 * nScale + npcForwardZ * 0.15 * nScale
      );
    }
  }

  // 10. STANDING WALL PRESS (Standing tight embrace)
  if (pose === 'standing_wall_press') {
    if (partName.includes('mano_izq') || partName.includes('mano_der')) {
      const isL = partName.includes('izq');
      return new THREE.Vector3(
        nPosX + (isL ? -npcRightX : npcRightX) * 0.16 * nScale,
        nPosY + 1.30 * nScale,
        nPosZ + (isL ? -npcRightZ : npcRightZ) * 0.16 * nScale
      );
    }
  }

  // 11. CHAIR LEAN OVER (Torso leaned forward over support)
  if (pose === 'chair_lean_over') {
    if (partName.includes('mano_izq') || partName.includes('mano_der')) {
      const isL = partName.includes('izq');
      return new THREE.Vector3(
        pPosX + partnerForwardX * 0.38 * pScale + (isL ? -partnerRightX : partnerRightX) * 0.18 * pScale,
        pPosY + 0.65 * pScale,
        pPosZ + partnerForwardZ * 0.38 * pScale + (isL ? -partnerRightZ : partnerRightZ) * 0.18 * pScale
      );
    }
  }

  // 12. STANDING BENT OVER (Bent 90° forward at hips)
  if (pose === 'standing_bent_over') {
    if (partName.includes('cabeza') || partName.includes('cuello')) {
      return new THREE.Vector3(
        pPosX + partnerForwardX * 0.42 * pScale,
        pPosY + 0.90 * pScale,
        pPosZ + partnerForwardZ * 0.42 * pScale
      );
    }
  }

  // 13. SIDE SPOON EMBRACE (Side cuddle on floor)
  if (pose === 'side_spoon_embrace') {
    if (partName.includes('rodilla_izq') || partName.includes('rodilla_der')) {
      const isL = partName.includes('izq');
      return new THREE.Vector3(
        pPosX + partnerForwardX * 0.22 * pScale + (isL ? -partnerRightX : partnerRightX) * 0.10 * pScale,
        Math.max(0, pPosY),
        pPosZ + partnerForwardZ * 0.22 * pScale + (isL ? -partnerRightZ : partnerRightZ) * 0.10 * pScale
      );
    }
  }

  // 14. STANDING SHOULDER CARRY (Draped across shoulder)
  if (pose === 'standing_shoulder_carry') {
    if (partName.includes('cabeza')) {
      return new THREE.Vector3(
        nPosX - npcForwardX * 0.22 * nScale + npcRightX * 0.22 * nScale,
        nPosY + 1.15 * nScale,
        nPosZ - npcForwardZ * 0.22 * nScale + npcRightZ * 0.22 * nScale
      );
    }
    if (partName.includes('pie_izq') || partName.includes('pie_der')) {
      return new THREE.Vector3(
        nPosX + npcForwardX * 0.25 * nScale + npcRightX * 0.22 * nScale,
        nPosY + 1.15 * nScale,
        nPosZ + npcForwardZ * 0.25 * nScale + npcRightZ * 0.22 * nScale
      );
    }
  }

  return null;
}
