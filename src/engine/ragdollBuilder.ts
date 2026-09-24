import { BodyPartName, Constraint, Particle, Ragdoll, RagdollType } from '../types/physics';

export function createArticulatedRagdoll(
  type: RagdollType = 'civilian',
  spawnX: number = 400,
  spawnY: number = 600,
  scale: number = 1.0
): Ragdoll {
  const id = 'ragdoll_' + Math.random().toString(36).substring(2, 9);
  const particles: Particle[] = [];
  const constraints: Constraint[] = [];

  let skinTone = '#fcd34d';
  let clothesColor = '#3b82f6';
  let pantsColor = '#1e293b';
  let shoeColor = '#0f172a';
  let armorColor: string | undefined = undefined;
  let maxHpMultiplier = 1.0;
  let armorVal = 0;

  if (type === 'swat') {
    skinTone = '#fbcfe8';
    clothesColor = '#0f172a';
    pantsColor = '#0f172a';
    shoeColor = '#020617';
    armorColor = '#334155';
    armorVal = 45;
    maxHpMultiplier = 1.6;
  } else if (type === 'mutant') {
    skinTone = '#4ade80';
    clothesColor = '#713f12';
    pantsColor = '#451a03';
    shoeColor = '#292524';
    maxHpMultiplier = 2.5;
    scale *= 1.15;
  } else if (type === 'dummy') {
    skinTone = '#fbbf24';
    clothesColor = '#d97706';
    pantsColor = '#92400e';
    shoeColor = '#78350f';
    maxHpMultiplier = 5.0; // test dummy is very durable
  } else if (type === 'golden') {
    skinTone = '#fef08a';
    clothesColor = '#eab308';
    pantsColor = '#ca8a04';
    shoeColor = '#a16207';
    armorVal = 70;
    maxHpMultiplier = 3.0;
  }

  // Helper to add a particle
  function addPart(
    name: BodyPartName,
    relX: number,
    relY: number,
    radius: number,
    mass: number,
    isVital: boolean = false,
    baseHealth: number = 100
  ): Particle {
    const p: Particle = {
      id: `${id}_${name}`,
      x: spawnX + relX * scale,
      y: spawnY + relY * scale,
      oldX: spawnX + relX * scale,
      oldY: spawnY + relY * scale,
      vx: 0,
      vy: 0,
      mass,
      radius: radius * scale,
      pinned: false,
      name,
      parentRagdollId: id,
      health: baseHealth * maxHpMultiplier,
      maxHealth: baseHealth * maxHpMultiplier,
      fractured: false,
      dismembered: false,
      skinColor: skinTone,
      armor: armorVal,
      isVital,
      bleedingRate: 0,
    };
    particles.push(p);
    return p;
  }

  // Helper to link two particles with a constraint
  function addLink(
    p1: Particle,
    p2: Particle,
    stiffness: number = 0.95,
    breakForce: number = 2200,
    name: string = '',
    isLimb: boolean = false
  ): Constraint {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const c: Constraint = {
      id: `${p1.id}_to_${p2.id}`,
      p1,
      p2,
      length: len,
      stiffness,
      breakForce: breakForce * (type === 'dummy' ? 3.0 : 1.0),
      broken: false,
      name: name || `${p1.name}-${p2.name}`,
      isLimb,
    };
    constraints.push(c);
    return c;
  }

  // 1. Central Core Spine & Anatomical Center
  // Head, Neck, Pechobase (upper chest), Torso (mid chest), Ombligo (navel/abdomen), Pelvis (hips)
  const cabeza = addPart('cabeza', 0, -115, 15, 4.0, true, 80);
  const cuello = addPart('cuello', 0, -90, 8, 2.0, true, 70);
  const pechobase = addPart('pechobase', 0, -75, 12, 5.0, true, 110);
  const torso = addPart('torso', 0, -50, 13, 6.0, false, 120);
  const ombligo = addPart('ombligo', 0, -25, 11, 4.5, false, 90);
  const pelvis = addPart('pelvis', 0, 0, 14, 7.0, false, 120);

  // Link central spine
  addLink(cabeza, cuello, 0.95, 1500, 'cuello_cabeza');
  addLink(cuello, pechobase, 0.95, 1800, 'cuello_pecho');
  addLink(pechobase, torso, 0.95, 2600, 'pecho_torso');
  addLink(torso, ombligo, 0.95, 2400, 'torso_ombligo');
  addLink(ombligo, pelvis, 0.95, 2600, 'ombligo_pelvis');
  // Spine stability cross constraints (soft)
  addLink(pechobase, pelvis, 0.85, 3200, 'pecho_pelvis_spine');
  addLink(cabeza, torso, 0.7, 2000, 'cabeza_torso_neck_support');

  // 2. Left Arm & Hand with articulated fingers
  const hombroIzq = addPart('hombro_izq', -18, -75, 7, 2.0, false, 70);
  const brazoIzq = addPart('brazo_izq', -30, -55, 6.5, 2.0, false, 65);
  const codoIzq = addPart('codo_izq', -42, -36, 6, 1.5, false, 60);
  const antebrazoIzq = addPart('antebrazo_izq', -50, -18, 5.5, 1.5, false, 55);
  const munecaIzq = addPart('muneca_izq', -57, 0, 4.5, 1.0, false, 50);
  const manoIzq = addPart('mano_izq', -63, 10, 5, 1.0, false, 45);

  // Finger tips for left hand
  const dedoPulgarIzq = addPart('dedo_pulgar_izq', -58, 16, 2.5, 0.3, false, 30);
  const dedoIndiceIzq = addPart('dedo_indice_izq', -64, 20, 2.5, 0.3, false, 30);
  const dedoMedioIzq = addPart('dedo_medio_izq', -69, 18, 2.5, 0.3, false, 30);

  // Left Arm Links
  addLink(pechobase, hombroIzq, 0.95, 2000, 'clavicula_izq', true);
  addLink(hombroIzq, brazoIzq, 0.95, 1800, 'hombro_brazo_izq', true);
  addLink(brazoIzq, codoIzq, 0.95, 1700, 'brazo_codo_izq', true);
  addLink(codoIzq, antebrazoIzq, 0.95, 1600, 'codo_antebrazo_izq', true);
  addLink(antebrazoIzq, munecaIzq, 0.95, 1400, 'antebrazo_muneca_izq', true);
  addLink(munecaIzq, manoIzq, 0.95, 1200, 'muneca_mano_izq', true);

  // Left fingers links
  addLink(manoIzq, dedoPulgarIzq, 0.9, 800, 'mano_pulgar_izq');
  addLink(manoIzq, dedoIndiceIzq, 0.9, 800, 'mano_indice_izq');
  addLink(manoIzq, dedoMedioIzq, 0.9, 800, 'mano_medio_izq');

  // 3. Right Arm & Hand with articulated fingers
  const hombroDer = addPart('hombro_der', 18, -75, 7, 2.0, false, 70);
  const brazoDer = addPart('brazo_der', 30, -55, 6.5, 2.0, false, 65);
  const codoDer = addPart('codo_der', 42, -36, 6, 1.5, false, 60);
  const antebrazoDer = addPart('antebrazo_der', 50, -18, 5.5, 1.5, false, 55);
  const munecaDer = addPart('muneca_der', 57, 0, 4.5, 1.0, false, 50);
  const manoDer = addPart('mano_der', 63, 10, 5, 1.0, false, 45);

  // Finger tips for right hand
  const dedoPulgarDer = addPart('dedo_pulgar_der', 58, 16, 2.5, 0.3, false, 30);
  const dedoIndiceDer = addPart('dedo_indice_der', 64, 20, 2.5, 0.3, false, 30);
  const dedoMedioDer = addPart('dedo_medio_der', 69, 18, 2.5, 0.3, false, 30);

  // Right Arm Links
  addLink(pechobase, hombroDer, 0.95, 2000, 'clavicula_der', true);
  addLink(hombroDer, brazoDer, 0.95, 1800, 'hombro_brazo_der', true);
  addLink(brazoDer, codoDer, 0.95, 1700, 'brazo_codo_der', true);
  addLink(codoDer, antebrazoDer, 0.95, 1600, 'codo_antebrazo_der', true);
  addLink(antebrazoDer, munecaDer, 0.95, 1400, 'antebrazo_muneca_der', true);
  addLink(munecaDer, manoDer, 0.95, 1200, 'muneca_mano_der', true);

  // Right fingers links
  addLink(manoDer, dedoPulgarDer, 0.9, 800, 'mano_pulgar_der');
  addLink(manoDer, dedoIndiceDer, 0.9, 800, 'mano_indice_der');
  addLink(manoDer, dedoMedioDer, 0.9, 800, 'mano_medio_der');

  // 4. Left Leg, Knee, Antepierna (Shin), Tobillo (Ankle) & Pie (Foot)
  const musloIzq = addPart('muslo_izq', -14, 28, 8, 3.5, false, 80);
  const rodillaIzq = addPart('rodilla_izq', -17, 58, 7, 2.5, false, 75);
  const antepiernaIzq = addPart('antepierna_izq', -18, 88, 6.5, 2.5, false, 70);
  const tobilloIzq = addPart('tobillo_izq', -19, 115, 5.5, 1.5, false, 60);
  const pieIzq = addPart('pie_izq', -26, 126, 6, 1.5, false, 55);

  // Left Leg Links
  addLink(pelvis, musloIzq, 0.95, 2500, 'cadera_muslo_izq', true);
  addLink(musloIzq, rodillaIzq, 0.95, 2300, 'muslo_rodilla_izq', true);
  addLink(rodillaIzq, antepiernaIzq, 0.95, 2200, 'rodilla_antepierna_izq', true);
  addLink(antepiernaIzq, tobilloIzq, 0.95, 1900, 'antepierna_tobillo_izq', true);
  addLink(tobilloIzq, pieIzq, 0.95, 1600, 'tobillo_pie_izq', true);

  // 5. Right Leg, Knee, Antepierna (Shin), Tobillo (Ankle) & Pie (Foot)
  const musloDer = addPart('muslo_der', 14, 28, 8, 3.5, false, 80);
  const rodillaDer = addPart('rodilla_der', 17, 58, 7, 2.5, false, 75);
  const antepiernaDer = addPart('antepierna_der', 18, 88, 6.5, 2.5, false, 70);
  const tobilloDer = addPart('tobillo_der', 19, 115, 5.5, 1.5, false, 60);
  const pieDer = addPart('pie_der', 26, 126, 6, 1.5, false, 55);

  // Right Leg Links
  addLink(pelvis, musloDer, 0.95, 2500, 'cadera_muslo_der', true);
  addLink(musloDer, rodillaDer, 0.95, 2300, 'muslo_rodilla_der', true);
  addLink(rodillaDer, antepiernaDer, 0.95, 2200, 'rodilla_antepierna_der', true);
  addLink(antepiernaDer, tobilloDer, 0.95, 1900, 'antepierna_tobillo_der', true);
  addLink(tobilloDer, pieDer, 0.95, 1600, 'tobillo_pie_der', true);

  // Extra joint support constraints to stabilize natural standing posture
  addLink(hombroIzq, hombroDer, 0.9, 2800, 'hombros_ancho');
  addLink(hombroIzq, torso, 0.8, 2200, 'hombro_izq_torso');
  addLink(hombroDer, torso, 0.8, 2200, 'hombro_der_torso');
  addLink(musloIzq, musloDer, 0.85, 2800, 'caderas_ancho');

  const namesByType: Record<RagdollType, string> = {
    civilian: 'Civil Inocente',
    swat: 'Agente SWAT Táctico',
    mutant: 'Mutante Zombi G-Virus',
    dummy: 'Muñeco de Pruebas Crash',
    golden: 'Ragdoll de Oro Macizo',
  };

  return {
    id,
    type,
    name: namesByType[type] || 'Personaje Articulado',
    particles,
    constraints,
    isAlive: true,
    isStunned: false,
    isStanding: true,
    walkCycle: 0,
    facing: 1,
    totalHealth: 100 * maxHpMultiplier,
    skinTone,
    clothesColor,
    pantsColor,
    shoeColor,
    armorColor,
    scale,
    isControlled: false,
    stats: {
      brokenBones: 0,
      dismemberedLimbs: 0,
      bloodLossPercent: 0,
    },
  };
}
