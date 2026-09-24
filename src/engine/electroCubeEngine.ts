import * as THREE from 'three';
import { ElectroCube3D, ElectroCubeSubBlock } from '../types/physics3d';

export function getBlockStateInfo(percent: number) {
  const p = Math.max(1, Math.min(100, Math.round(percent)));
  if (p === 100) {
    return {
      percent: p,
      name: 'Irrompible Diamante Sólido',
      description: '100% Irrompible. Dureza diamante extrema, no recibe daño alguno.',
      color: '#38bdf8', // Cyan
      badge: '🛡️ Diamante Irrompible (100%)',
      canTakeDamage: false,
      isMassPushOnly: false,
      isLiquid: false,
      isGaseous: false,
      isHard: true,
      visualEffect: 'Brillo rígido de cristal de alta dureza con aristas irrompibles',
      opacity: 1.0,
    };
  } else if (p >= 60) {
    return {
      percent: p,
      name: 'Sólido Casi Irrompible',
      description: 'Dureza elevada. Cuerpo rígido de alta resistencia física.',
      color: '#22c55e', // Green
      badge: `💎 Sólido Duro (${p}%)`,
      canTakeDamage: true,
      isMassPushOnly: false,
      isLiquid: false,
      isGaseous: false,
      isHard: true,
      visualEffect: 'Estructura rígida sólida con brillo metálico reflejante',
      opacity: 1.0,
    };
  } else if (p >= 40) {
    return {
      percent: p,
      name: 'Masa Viscoelástica Sólida',
      description: 'Masa elástica maleable. Los impactos rebotan y la desplazan.',
      color: '#eab308', // Amber/Yellow
      badge: `🧱 Masa Elástica (${p}%)`,
      canTakeDamage: false,
      isMassPushOnly: true,
      isLiquid: false,
      isGaseous: false,
      isHard: false,
      visualEffect: 'Bamboleo de goma elástica con destello dorado de impacto',
      opacity: 0.92,
    };
  } else if (p >= 20) {
    return {
      percent: p,
      name: 'Masa Líquida Viscosa',
      description: 'Líquido semitransparente viscoso con ondas de fluido.',
      color: '#3b82f6', // Royal Blue
      badge: `💧 Líquido Viscoso (${p}%)`,
      canTakeDamage: false,
      isMassPushOnly: true,
      isLiquid: true,
      isGaseous: false,
      isHard: false,
      visualEffect: 'Ondulación de gelatina fluida azul con reflejo viscoso',
      opacity: 0.50 + ((p - 20) / 20) * 0.35, // 0.50 - 0.85
    };
  } else if (p >= 10) {
    return {
      percent: p,
      name: 'Líquido Fluido Activo',
      description: 'Líquido fluido de alta transparencia y gran movilidad acuosa.',
      color: '#06b6d4', // Cyan Aquamarine
      badge: `🌊 Líquido Fluido (${p}%)`,
      canTakeDamage: false,
      isMassPushOnly: true,
      isLiquid: true,
      isGaseous: false,
      isHard: false,
      visualEffect: 'Fluidez acuosa ondulante con transparencia cristalina activa',
      opacity: 0.20 + ((p - 10) / 10) * 0.25, // 0.20 - 0.45
    };
  } else if (p >= 5) {
    return {
      percent: p,
      name: 'Líquido Ultra Fluido Cristalino',
      description: 'Fluido acuoso ultra ligero 100% transparente.',
      color: '#0284c7', // Sky Blue
      badge: `💧 Líquido Cristalino (${p}%)`,
      canTakeDamage: false,
      isMassPushOnly: true,
      isLiquid: true,
      isGaseous: false,
      isHard: false,
      visualEffect: 'Refración de agua pura cristalina en movimiento libre',
      opacity: 0.08 + ((p - 5) / 5) * 0.10, // 0.08 - 0.18
    };
  } else {
    return {
      percent: p,
      name: 'Gaseoso Vapor Volátil',
      description: 'Estado gaseoso volátil en forma de humo y vapor en expansión.',
      color: '#ec4899', // Pink
      badge: `💨 Gaseoso Vapor (${p}%)`,
      canTakeDamage: false,
      isMassPushOnly: false,
      isLiquid: false,
      isGaseous: true,
      isHard: false,
      visualEffect: 'Nube volátil rosada con pulsos de dispersión de humo',
      opacity: 0.04 + (p / 5) * 0.16, // 0.04 - 0.20
    };
  }
}

/**
 * Creates a standard-sized cubic block (0.9m) with 3x3 subdivisions.
 * Controlled by a single blockState percentage (1-100%).
 */
export function createElectroCube3D(
  x: number,
  y: number,
  z: number,
  scene: THREE.Scene,
  blockState: number = 100,
  hardnessLegacy: number = 70,
  viscosityLegacy: number = 30,
  electronegativity: number = 100
): ElectroCube3D {
  const id = 'block3x3_' + Math.random().toString(36).substring(2, 9);
  const groupMesh = new THREE.Group();
  groupMesh.name = `Block3x3Group_${id}`;
  groupMesh.position.set(x, y, z);

  const totalSize = 0.90;
  const spacing = 0.30;
  const subBlockSize = 0.292;

  const blockColors = [
    0x38bdf8, // Cyan
    0x0284c7, // Ocean Blue
    0x0ea5e9, // Sky Blue
    0x06b6d4, // Teal
    0x6366f1, // Indigo
    0x3b82f6, // Royal Blue
  ];

  const subBlocks: ElectroCubeSubBlock[] = [];

  let colorIdx = 0;
  for (let gx = -1; gx <= 1; gx++) {
    for (let gy = -1; gy <= 1; gy++) {
      for (let gz = -1; gz <= 1; gz++) {
        const subId = `block_${id}_${gx + 1}_${gy + 1}_${gz + 1}`;
        const baseLocalPos = new THREE.Vector3(gx * spacing, gy * spacing, gz * spacing);

        const col = blockColors[(Math.abs(gx) + Math.abs(gy) + Math.abs(gz) + colorIdx) % blockColors.length];
        colorIdx++;

        const blockGeom = new THREE.BoxGeometry(subBlockSize, subBlockSize, subBlockSize);
        const blockMat = new THREE.MeshStandardMaterial({
          color: col,
          roughness: 0.3,
          metalness: 0.2,
          transparent: true,
          opacity: 1.0,
        });

        const blockMesh = new THREE.Mesh(blockGeom, blockMat);
        blockMesh.name = `SubBlock_${subId}`;
        blockMesh.position.copy(baseLocalPos);
        blockMesh.castShadow = true;
        blockMesh.receiveShadow = true;

        blockMesh.userData = {
          isElectroSubBlock: true,
          cubeId: id,
          subBlockId: subId,
          gridX: gx,
          gridY: gy,
          gridZ: gz,
          baseColor: col,
          blockState,
        };

        // Outline frame
        const edges = new THREE.EdgesGeometry(blockGeom);
        const lineMat = new THREE.LineBasicMaterial({
          color: 0x0369a1,
          linewidth: 1,
          transparent: true,
          opacity: 0.6,
        });
        const wireframe = new THREE.LineSegments(edges, lineMat);
        blockMesh.add(wireframe);

        groupMesh.add(blockMesh);

        subBlocks.push({
          id: subId,
          gridX: gx,
          gridY: gy,
          gridZ: gz,
          baseLocalPos,
          mesh: blockMesh,
          active: true,
          color: col,
          size: subBlockSize,
          blockState,
        });
      }
    }
  }

  // Envelope pseudo mesh
  const pseudoGeom = new THREE.BoxGeometry(totalSize + 0.06, totalSize + 0.06, totalSize + 0.06, 12, 12, 12);
  const posArray = pseudoGeom.attributes.position.array;
  const originalPos = new Float32Array(posArray.length);
  originalPos.set(posArray);
  pseudoGeom.userData = { originalPos };

  const pseudoMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.25,
    metalness: 0.35,
    transparent: true,
    opacity: 0.82,
    depthWrite: true,
  });

  const pseudoMesh = new THREE.Mesh(pseudoGeom, pseudoMat);
  pseudoMesh.name = `PseudoMesh_${id}`;
  pseudoMesh.castShadow = true;
  pseudoMesh.receiveShadow = true;
  groupMesh.add(pseudoMesh);

  scene.add(groupMesh);

  const cube: ElectroCube3D = {
    id,
    x,
    y,
    z,
    size: totalSize,
    subBlockSize,
    blockState,
    hardness: hardnessLegacy,
    viscosity: viscosityLegacy,
    electronegativity,
    groupMesh,
    pseudoMesh,
    subBlocks,
    resistance: 20 + blockState * 0.8,
    density: 25 + blockState * 0.75,
    elasticity: Math.round(100 - blockState * 0.5),
    health: 400,
    maxHealth: 400,
    isDestroyed: false,
    wobblePhase: Math.random() * Math.PI * 2,
  };

  applyElectroCubeProperties(cube, blockState);

  return cube;
}

/**
 * Applies the single blockState (1 - 100%) property across the cube and its sub-blocks.
 */
export function applyElectroCubeProperties(
  cube: ElectroCube3D,
  blockState: number
) {
  const p = Math.max(1, Math.min(100, Math.round(blockState)));
  cube.blockState = p;
  cube.hardness = p;
  cube.viscosity = p;

  const info = getBlockStateInfo(p);

  cube.resistance = Math.round(20 + p * 0.8);
  cube.density = Math.round(25 + p * 0.75);
  cube.elasticity = Math.round(100 - p * 0.5);

  const wireColor = info.isHard
    ? (p === 100 ? 0x38bdf8 : 0x22c55e)
    : (info.isMassPushOnly && !info.isLiquid
      ? 0xeab308
      : (info.isLiquid
        ? (p >= 20 ? 0x3b82f6 : 0x06b6d4)
        : 0xec4899));

  for (const block of cube.subBlocks) {
    if (!block.active || !block.mesh) continue;
    block.blockState = p;
    block.mesh.userData.blockState = p;

    if (block.mesh.material instanceof THREE.MeshStandardMaterial) {
      block.mesh.material.transparent = info.opacity < 1.0;
      block.mesh.material.opacity = info.opacity;
      block.mesh.material.roughness = info.isHard ? 0.2 : (info.isLiquid ? 0.05 : (info.isGaseous ? 0.95 : 0.4));
      block.mesh.material.metalness = info.isHard ? 0.45 : (info.isLiquid ? 0.3 : (info.isGaseous ? 0.0 : 0.15));
      block.mesh.material.needsUpdate = true;
    }

    // Update wireframe line color based on hardness state
    block.mesh.traverse((child) => {
      if (child instanceof THREE.LineSegments && child.material instanceof THREE.LineBasicMaterial) {
        child.material.color.setHex(wireColor);
        child.material.opacity = info.isLiquid ? 0.85 : (info.isHard ? 0.7 : 0.5);
        child.material.needsUpdate = true;
      }
    });
  }

  if (cube.pseudoMesh && cube.pseudoMesh.material instanceof THREE.MeshStandardMaterial) {
    cube.pseudoMesh.material.transparent = info.opacity < 1.0 || info.isGaseous;
    cube.pseudoMesh.material.opacity = Math.min(0.85, info.opacity * 0.85);
    cube.pseudoMesh.material.roughness = info.isHard ? 0.2 : (info.isLiquid ? 0.03 : 0.25);
    cube.pseudoMesh.material.metalness = info.isHard ? 0.5 : 0.2;
    cube.pseudoMesh.material.color.setHex(wireColor);
    cube.pseudoMesh.material.needsUpdate = true;
  }
}

/**
 * Updates physics wobble, transparency, squish, mass-push response, and gaseous smoke effects per block.
 */
export function updateElectroCubePhysics(cube: ElectroCube3D, dt: number, elapsedTime: number) {
  if (cube.isDestroyed || !cube.groupMesh) return;

  const p = cube.blockState ?? 100;
  const info = getBlockStateInfo(p);

  // Gaseous smoke handling (1 - 5%)
  if (info.isGaseous) {
    const t = elapsedTime * 3.5 + cube.wobblePhase;
    // Waft/smoke floats and pulses gently
    const smokeYScale = 1.1 + Math.sin(t) * 0.2;
    const smokeXZScale = 1.2 + Math.cos(t * 0.8) * 0.25;
    cube.groupMesh.scale.set(smokeXZScale, smokeYScale, smokeXZScale);

    if (cube.pseudoMesh && cube.pseudoMesh.material instanceof THREE.MeshStandardMaterial) {
      cube.pseudoMesh.material.opacity = 0.15 + Math.sin(t * 2) * 0.08;
      cube.pseudoMesh.material.needsUpdate = true;
    }
    for (const block of cube.subBlocks) {
      if (block.active && block.mesh && block.mesh.material instanceof THREE.MeshStandardMaterial) {
        block.mesh.material.opacity = 0.12 + Math.cos(t * 1.5 + block.gridX) * 0.06;
        block.mesh.material.needsUpdate = true;
      }
    }
    return;
  }

  // Liquid squish / wobble / wave ripple handling (5 - 40%)
  if (info.isLiquid) {
    const liquidity = (40 - p) / 35; // 0 at 40%, 1 at 5%
    const heightFactor = THREE.MathUtils.lerp(0.95, 0.22, liquidity);
    const widthFactor = THREE.MathUtils.lerp(1.05, 1.85, liquidity);

    const wobbleInt = 0.06 + liquidity * 0.12;
    const speed = 3.0 + liquidity * 2.0;
    const t = elapsedTime * speed + cube.wobblePhase;

    const sy = Math.max(0.1, heightFactor * (1.0 + Math.sin(t) * wobbleInt));
    const sxz = Math.max(0.2, widthFactor * (1.0 - Math.sin(t) * (wobbleInt * 0.5)));

    cube.groupMesh.scale.set(sxz, sy, sxz);
    const unscaledHalfHeight = cube.size * 0.5;
    cube.groupMesh.position.y = cube.y - unscaledHalfHeight * (1.0 - sy);

    // Real-time liquid wave ripple across sub-blocks
    for (const block of cube.subBlocks) {
      if (block.active && block.mesh) {
        const wave = Math.sin(elapsedTime * 5.0 + block.gridX * 1.5 + block.gridZ * 1.5) * (0.012 + liquidity * 0.030);
        block.mesh.position.y = block.baseLocalPos.y + wave;
      }
    }
  } else if (info.isMassPushOnly) {
    // Doughy mass wobble (40 - 60%)
    const t = elapsedTime * 2.0 + cube.wobblePhase;
    const sy = 1.0 + Math.sin(t) * 0.03;
    const sxz = 1.0 - Math.sin(t) * 0.02;
    cube.groupMesh.scale.set(sxz, sy, sxz);
    cube.groupMesh.position.y = cube.y;

    for (const block of cube.subBlocks) {
      if (block.active && block.mesh) {
        block.mesh.position.copy(block.baseLocalPos);
      }
    }
  } else {
    // Solid / Tough states (60 - 100%)
    cube.groupMesh.scale.set(1, 1, 1);
    cube.groupMesh.position.y = cube.y;

    for (const block of cube.subBlocks) {
      if (block.active && block.mesh) {
        block.mesh.position.copy(block.baseLocalPos);
      }
    }
  }

  // Keep materials updated with block state opacity
  if (cube.pseudoMesh && cube.pseudoMesh.material instanceof THREE.MeshStandardMaterial) {
    cube.pseudoMesh.material.opacity = Math.min(0.82, info.opacity);
    cube.pseudoMesh.material.needsUpdate = true;
  }
}
