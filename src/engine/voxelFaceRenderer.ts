import * as THREE from 'three';
import { AnimeFaceData } from './animeFaceRenderer';
import { FaceFeatureMode, Ragdoll3D } from '../types/physics3d';
import { applyHoleMorphToMesh, enableHoleAlphaOnMaterial } from './ragdollBuilder3D';

export interface Voxel3DFaceMeshes {
  group: THREE.Group;
  leftSclera: THREE.Mesh;
  rightSclera: THREE.Mesh;
  leftIris: THREE.Mesh;
  rightIris: THREE.Mesh;
  leftPupilHeart?: THREE.Mesh;
  rightPupilHeart?: THREE.Mesh;
  leftEyebrow: THREE.Group | THREE.Mesh;
  rightEyebrow: THREE.Group | THREE.Mesh;
  mouth: THREE.Group;
  upperLip?: THREE.Group;
  lowerLip?: THREE.Group;
  leftBlush: THREE.Mesh;
  rightBlush: THREE.Mesh;
  mode: FaceFeatureMode;
  lastScale: number;
}

/**
 * Helper to build a 3-part feature (eyebrow or lip) made of connected cylinders and spherical joint nodes
 */
function createCylinderAndSphereFeature(
  partType: 'eyebrow' | 'upper_lip' | 'lower_lip',
  totalWidth: number,
  height: number,
  depth: number,
  material: THREE.Material,
  scale: number
): THREE.Group {
  const featureGroup = new THREE.Group();
  featureGroup.name = `${partType}_group`;
  const segW = totalWidth / 3;
  const cylRadius = Math.max(0.0055 * scale, Math.min(height, depth) * 0.42);
  const sphereRadius = cylRadius * 1.15;

  const sphereGeom = new THREE.SphereGeometry(sphereRadius, 12, 12);
  const cylGeom = new THREE.CylinderGeometry(cylRadius, cylRadius, segW * 0.96, 12);
  cylGeom.rotateZ(Math.PI / 2);

  // 3 Cylinder segments with 4 Spherical connecting nodes
  const nodePositions: number[] = [-totalWidth * 0.48, -segW * 0.5, segW * 0.5, totalWidth * 0.48];

  // 1. Add Spherical joint nodes at each intersection and end
  for (let i = 0; i < nodePositions.length; i++) {
    const sphereNode = new THREE.Mesh(sphereGeom, material);
    sphereNode.name = `${partType}_node_${i}`;
    let yOffset = 0;
    if (i === 0 || i === nodePositions.length - 1) {
      if (partType === 'eyebrow') yOffset = -0.004 * scale;
      else if (partType === 'upper_lip') yOffset = -0.003 * scale;
      else if (partType === 'lower_lip') yOffset = 0.003 * scale;
    }
    sphereNode.position.set(nodePositions[i], yOffset, 0);
    featureGroup.add(sphereNode);
  }

  // 2. Add 3 Cylinder Segments between the nodes
  for (let i = -1; i <= 1; i++) {
    const partGroup = new THREE.Group();
    partGroup.name = `${partType}_seg_${i + 1}`;
    const xPos = i * segW;

    const cylMesh = new THREE.Mesh(cylGeom, material);
    cylMesh.name = `${partType}_cyl_${i + 1}`;
    cylMesh.castShadow = false;
    cylMesh.receiveShadow = false;
    partGroup.add(cylMesh);

    // Curvature angle for outer segments
    if (i === -1) {
      if (partType === 'eyebrow') partGroup.rotation.z = -0.22;
      else if (partType === 'upper_lip') partGroup.rotation.z = 0.16;
      else if (partType === 'lower_lip') partGroup.rotation.z = -0.16;
    } else if (i === 1) {
      if (partType === 'eyebrow') partGroup.rotation.z = 0.22;
      else if (partType === 'upper_lip') partGroup.rotation.z = -0.16;
      else if (partType === 'lower_lip') partGroup.rotation.z = 0.16;
    }

    partGroup.position.set(xPos, 0, 0);
    featureGroup.add(partGroup);
  }

  return featureGroup;
}

/**
 * Helper to build 3 cylinder eyelashes ("pestañas con 3 cilindros") on top of an eye.
 */
function create3CylinderEyelashes(eyeWidth: number, scale: number, hairMaterial: THREE.Material): THREE.Group {
  const lashGroup = new THREE.Group();
  lashGroup.name = 'Eyelashes3Cyl';

  const cylRadius = 0.003 * scale;
  const cylLength = 0.024 * scale;
  const lashGeom = new THREE.CylinderGeometry(cylRadius * 0.4, cylRadius, cylLength, 8);
  // Point upward/forward along Y
  lashGeom.translate(0, cylLength * 0.5, 0);

  // 3 Cylinder Eyelashes extending from top rim of eye
  const angles = [-0.35, 0.0, 0.35];
  const posX = [-eyeWidth * 0.32, 0.0, eyeWidth * 0.32];

  for (let i = 0; i < 3; i++) {
    const lash = new THREE.Mesh(lashGeom, hairMaterial);
    lash.position.set(posX[i], 0, 0);
    lash.rotation.z = angles[i];
    lash.rotation.x = -0.35; // Angle forward from face
    lashGroup.add(lash);
  }

  return lashGroup;
}

/**
 * Creates 3D spherical eyes, cylinder & sphere eyebrows, and opening cylinder & sphere mouth (no tongue).
 */
export function setupVoxel3DFace(ragdoll: Ragdoll3D): Voxel3DFaceMeshes | null {
  const cabeza = ragdoll.particles.find((p) => p.name === 'cabeza');
  if (!cabeza || !cabeza.voxelsGroup) return null;

  // Remove any existing 3D face group
  const existingGroup = cabeza.voxelsGroup.getObjectByName('Voxel3DFaceGroup');
  if (existingGroup) {
    cabeza.voxelsGroup.remove(existingGroup);
    existingGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material?.dispose();
      }
    });
  }

  const mode: FaceFeatureMode = ragdoll.faceFeatureMode || 'anime_canvas';
  const scale = ragdoll.scale ?? 1.0;
  const eyeColorHex = (ragdoll as any).eyeColorHex ?? 0x0284c7;
  const hairColorHex = (ragdoll as any).hairColorHex ?? 0x1c1917;

  const group = new THREE.Group();
  group.name = 'Voxel3DFaceGroup';

  // Sclera Material (white clean porcelain)
  const scleraMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.20,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -2.0,
    polygonOffsetUnits: -2.0,
  });

  // Iris Material
  const irisMat = new THREE.MeshStandardMaterial({
    color: eyeColorHex,
    roughness: 0.25,
    metalness: 0.1,
    polygonOffset: true,
    polygonOffsetFactor: -3.0,
    polygonOffsetUnits: -3.0,
  });

  // Eyebrow Material
  const browMat = new THREE.MeshStandardMaterial({
    color: hairColorHex,
    roughness: 0.7,
    polygonOffset: true,
    polygonOffsetFactor: -2.0,
    polygonOffsetUnits: -2.0,
  });

  // Mouth Material (Red 3D Cylinder & Sphere Mesh - "boca tenga mesh y sea como cejas pero color rojo")
  const mouthMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626, // Vibrant bold red
    roughness: 0.35,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -2.0,
    polygonOffsetUnits: -2.0,
  });

  // Blush Material (Transparent/Hidden)
  const blushMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    transparent: true,
    opacity: 0.0,
    visible: false,
  });

  // 1. Eyes as True 3D Spheres ("que ojos sean esferas")
  const eyeRadius = 0.038 * scale;
  const eyeSpacing = 0.065 * scale;
  const eyePosY = 0.020 * scale;

  const scleraGeom = new THREE.SphereGeometry(eyeRadius, 20, 20);

  const leftSclera = new THREE.Mesh(scleraGeom, scleraMat);
  leftSclera.name = '3D_LeftSclera';
  leftSclera.position.set(-eyeSpacing, eyePosY, 0.002 * scale);

  const rightSclera = new THREE.Mesh(scleraGeom.clone(), scleraMat);
  rightSclera.name = '3D_RightSclera';
  rightSclera.position.set(eyeSpacing, eyePosY, 0.002 * scale);

  // Irises as spherical front caps
  const irisRadius = eyeRadius * 0.68;
  const irisGeom = new THREE.SphereGeometry(irisRadius, 16, 16);

  const leftIris = new THREE.Mesh(irisGeom, irisMat);
  leftIris.name = '3D_LeftIris';
  leftIris.scale.set(1.0, 1.0, 0.35);
  leftIris.position.set(0, 0, eyeRadius * 0.88);
  leftSclera.add(leftIris);

  const rightIris = new THREE.Mesh(irisGeom.clone(), irisMat);
  rightIris.name = '3D_RightIris';
  rightIris.scale.set(1.0, 1.0, 0.35);
  rightIris.position.set(0, 0, eyeRadius * 0.88);
  rightSclera.add(rightIris);

  // Eyelashes made of 3 cylinders on top of each spherical eye
  const leftLashes = create3CylinderEyelashes(eyeRadius * 2, scale, browMat);
  leftLashes.position.set(0, eyeRadius * 0.85, eyeRadius * 0.5);
  leftSclera.add(leftLashes);

  const rightLashes = create3CylinderEyelashes(eyeRadius * 2, scale, browMat);
  rightLashes.position.set(0, eyeRadius * 0.85, eyeRadius * 0.5);
  rightSclera.add(rightLashes);

  // 2. Eyebrows with Cylinders & Spheres ("cejas este hecho con cilindros y esferas")
  const browW = 0.075 * scale;
  const browH = 0.018 * scale;
  const browD = 0.025 * scale;
  const browPosY = eyePosY + 0.052 * scale;

  const leftEyebrow = createCylinderAndSphereFeature('eyebrow', browW, browH, browD, browMat, scale);
  leftEyebrow.name = '3D_LeftEyebrow';
  leftEyebrow.position.set(-eyeSpacing, browPosY, browD * 0.5 + 0.005 * scale);

  const rightEyebrow = createCylinderAndSphereFeature('eyebrow', browW, browH, browD, browMat, scale);
  rightEyebrow.name = '3D_RightEyebrow';
  rightEyebrow.position.set(eyeSpacing, browPosY, browD * 0.5 + 0.005 * scale);

  // 3. Mouth with Cylinders & Spheres (Single clean arch like eyebrow in red, no extra overlapping meshes - "boca debe ser como ceja pero color rojo")
  const mouthW = 0.082 * scale;
  const mouthH = 0.018 * scale;
  const mouthD = 0.024 * scale;
  const mouthPosY = -0.062 * scale;

  const mouthGroup = createCylinderAndSphereFeature('eyebrow', mouthW, mouthH, mouthD, mouthMat, scale);
  mouthGroup.name = '3D_Mouth';
  mouthGroup.rotation.x = Math.PI; // Invert curvature so it forms a gentle smiling/neutral mouth arch
  mouthGroup.position.set(0, mouthPosY, 0.006 * scale);

  // 4. Cheek Blush (Disabled/Hidden)
  const blushGeom = new THREE.SphereGeometry(0.02 * scale, 8, 8);
  const leftBlush = new THREE.Mesh(blushGeom, blushMat);
  leftBlush.name = '3D_LeftBlush';
  leftBlush.visible = false;

  const rightBlush = new THREE.Mesh(blushGeom.clone(), blushMat);
  rightBlush.name = '3D_RightBlush';
  rightBlush.visible = false;

  // Add components to group
  group.add(leftSclera);
  group.add(rightSclera);
  group.add(leftEyebrow);
  group.add(rightEyebrow);
  group.add(mouthGroup);
  group.add(leftBlush);
  group.add(rightBlush);

  // Position group closer to head surface
  const style = ragdoll.contourJointStyle || 'cylinder';
  let baseFaceZ = 0.160 * scale;
  if (style === 'blocky') baseFaceZ = 0.110 * scale;
  else if (style === 'cylinder') baseFaceZ = 0.138 * scale;

  const floatDepth = Math.max(0.0, (ragdoll.faceFloatDepth ?? 0.005)) * scale;
  group.position.set(0, -0.010 * scale, baseFaceZ + floatDepth);

  // Visibility toggle based on mode
  group.visible = mode !== 'anime_canvas';

  cabeza.voxelsGroup.add(group);

  const meshes: Voxel3DFaceMeshes = {
    group,
    leftSclera,
    rightSclera,
    leftIris,
    rightIris,
    leftEyebrow,
    rightEyebrow,
    mouth: mouthGroup,
    leftBlush,
    rightBlush,
    mode,
    lastScale: scale,
  };

  (ragdoll as any).voxel3DFace = meshes;
  return meshes;
}

/**
 * Updates dynamic 3D voxel/pseudo face animations in sync with AnimeFaceData.
 * Implements eye blinking, pupil tracking, eyebrow expressions, and dynamic mouth opening without tongue!
 */
export function updateVoxel3DFace(ragdoll: Ragdoll3D, faceData: AnimeFaceData | null, dt: number) {
  const cabeza = ragdoll.particles.find((p) => p.name === 'cabeza');
  if (!cabeza || !cabeza.voxelsGroup) return;

  const mode = ragdoll.faceFeatureMode || 'anime_canvas';
  let face3D: Voxel3DFaceMeshes = (ragdoll as any).voxel3DFace;

  if (!face3D || face3D.mode !== mode || face3D.lastScale !== (ragdoll.scale ?? 1.0)) {
    const created = setupVoxel3DFace(ragdoll);
    if (!created) return;
    face3D = created;
  }

  const is3DActive = mode !== 'anime_canvas';
  face3D.group.visible = is3DActive;
  if (!is3DActive) return;

  const scale = ragdoll.scale ?? 1.0;
  const style = ragdoll.contourJointStyle || 'cylinder';

  let baseFaceZ = 0.160 * scale;
  if (style === 'blocky') baseFaceZ = 0.110 * scale;
  else if (style === 'cylinder') baseFaceZ = 0.138 * scale;

  const floatDepth = Math.max(0.0, (ragdoll.faceFloatDepth ?? 0.005)) * scale;
  const time = Date.now() * 0.003;
  const hoverOffset = Math.sin(time * 1.5) * 0.002 * scale;

  face3D.group.position.set(0, 0.005 * scale, baseFaceZ + floatDepth + hoverOffset);

  if (!faceData) return;

  // 1. Blinking and eye closure
  const leftBlink = faceData.leftEyeBlink ?? 0;
  const rightBlink = faceData.rightEyeBlink ?? 0;

  face3D.leftSclera.scale.y = Math.max(0.08, 1.0 - leftBlink * 0.92);
  face3D.rightSclera.scale.y = Math.max(0.08, 1.0 - rightBlink * 0.92);

  // Eye Direction Offset
  const dirX = (faceData.eyeDirectionX ?? 0) * 0.012 * scale;
  const dirY = (faceData.eyeDirectionY ?? 0) * 0.012 * scale;
  face3D.leftIris.position.x = dirX;
  face3D.leftIris.position.y = dirY;
  face3D.rightIris.position.x = dirX;
  face3D.rightIris.position.y = dirY;

  // 2. Eyebrow expressions & rotation
  let browRotZ = 0;
  let browOffsetY = 0;
  if (faceData.expression === 'pain') {
    browRotZ = 0.35; // Furrowed in pain
    browOffsetY = -0.01 * scale;
  } else if (faceData.expression === 'blush') {
    browRotZ = -0.22; // Soft raised arched brows
    browOffsetY = 0.008 * scale;
  }
  face3D.leftEyebrow.rotation.z = browRotZ;
  face3D.rightEyebrow.rotation.z = -browRotZ;
  face3D.leftEyebrow.position.y = (0.020 + 0.052) * scale + browOffsetY;
  face3D.rightEyebrow.position.y = (0.020 + 0.052) * scale + browOffsetY;

  // 3. Dynamic Mouth Opening & Expression
  const mouthOpenness = Math.max(0, Math.min(1.0, faceData.mouthOpenness ?? 0));
  if (face3D.mouth) {
    const baseMouthY = -0.062 * scale;
    face3D.mouth.position.y = baseMouthY - mouthOpenness * 0.015 * scale;
    face3D.mouth.scale.set(
      1.0 + mouthOpenness * 0.20 + (faceData.expression === 'blush' ? 0.15 : 0),
      1.0 + mouthOpenness * 0.80,
      1.0
    );
  }

  // 4. Cheek Blush (Disabled/Hidden)
  face3D.leftBlush.visible = false;
  face3D.rightBlush.visible = false;
}

