import * as THREE from 'three';
import { Ragdoll3D } from '../types/physics3d';

export interface RealisticFluid3DProp {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  vrotX: number;
  vrotY: number;
  vrotZ: number;
  width: number;
  height: number;
  depth: number;
  meshGroup: THREE.Group; // Contains the inner block with core spheres, cylinders and articulated leg unions
  pseudoMesh: THREE.Group | THREE.Mesh; // The outer pseudo envelope with pseudo spheres, cylinders, and leg unions
  bridgeMesh?: THREE.Mesh; // Connection bridge pseudo-mesh
  tendonMesh?: THREE.Mesh; // Tendon cylinder connecting chained blocks
  tendonSphere?: THREE.Mesh; // Tendon union sphere connecting chained blocks
  prevNodeId?: string;
  nextNodeId?: string;
  streamKey?: string;
  chainId?: string;
  chainIndex?: number;
  chainTotal?: number;
  sourceType: 'male' | 'female' | 'breast' | 'glute';
  color: number;
  opacity: number;
  isOnFloor: boolean;
  clusterId?: string;
  life: number;
  maxLife: number;
}

interface FloorPuddleCluster {
  id: string;
  props: RealisticFluid3DProp[];
  color: number;
  opacity: number;
  pseudoMesh?: THREE.Mesh;
}

export class RealisticFluidEngine {
  private static instance: RealisticFluidEngine;
  public fluidProps: RealisticFluid3DProp[] = [];
  public isZeroGravity: boolean = false;
  private puddleClusters: Map<string, FloorPuddleCluster> = new Map();
  private scene: THREE.Scene | null = null;
  private idCounter: number = 0;
  private pseudoGroup: THREE.Group = new THREE.Group();
  private clusterMeshGroup: THREE.Group = new THREE.Group();

  private lastStreamNode: Map<string, RealisticFluid3DProp> = new Map();

  public static getInstance(): RealisticFluidEngine {
    if (!RealisticFluidEngine.instance) {
      RealisticFluidEngine.instance = new RealisticFluidEngine();
    }
    return RealisticFluidEngine.instance;
  }

  public setScene(scene: THREE.Scene) {
    this.scene = scene;
    this.pseudoGroup.name = 'RealisticFluidPseudoGroup';
    this.clusterMeshGroup.name = 'RealisticFluidClusterMeshGroup';
    if (!this.pseudoGroup.parent) {
      scene.add(this.pseudoGroup);
    }
    if (!this.clusterMeshGroup.parent) {
      scene.add(this.clusterMeshGroup);
    }
  }

  /**
   * Creates a specialized fluid block node with core voxel box, spherical joints, and pseudo cylinders/spheres
   * forming articulated chain segments like a leg ("cadenas de bloques con pseudos de cilindros y esferas como pierna").
   */
  private createFluidNodeMeshGroup(
    sourceType: 'male' | 'female' | 'breast' | 'glute',
    color: number,
    opacity: number,
    id: string
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = `fluid_node_${sourceType}_${id}`;

    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.03,
      metalness: 0.12,
      transparent: true,
      opacity: opacity * 0.95,
    });

    // 1. Central core cubic voxel block
    const coreBoxGeom = new THREE.BoxGeometry(0.046, 0.046, 0.046);
    const coreBox = new THREE.Mesh(coreBoxGeom, mat);
    coreBox.name = `fluid_core_box_${id}`;
    group.add(coreBox);

    // 2. Central articulation sphere
    const coreSphereGeom = new THREE.SphereGeometry(0.026, 14, 14);
    const coreSphere = new THREE.Mesh(coreSphereGeom, mat);
    coreSphere.name = `fluid_core_sphere_${id}`;
    group.add(coreSphere);

    // 3. Segment cylinder connecting sleeve along strand axis (Z)
    const cylGeom = new THREE.CylinderGeometry(0.022, 0.022, 0.052, 12, 1);
    const cylZ = new THREE.Mesh(cylGeom, mat);
    cylZ.rotation.x = Math.PI * 0.5;
    group.add(cylZ);

    // 4. Joint spheres at front and back ends of the block segment (like knee/ankle joints)
    const capGeom = new THREE.SphereGeometry(0.018, 10, 10);
    const capFront = new THREE.Mesh(capGeom, mat);
    capFront.position.set(0, 0, 0.024);
    group.add(capFront);

    const capBack = new THREE.Mesh(capGeom, mat);
    capBack.position.set(0, 0, -0.024);
    group.add(capBack);

    return group;
  }

  /**
   * Creates the outer pseudo envelope group containing pseudo blocks, pseudo spheres, and pseudo cylinders
   * mimicking the pseudo 3D contour of articulated leg segments ("pseudos de cilindros y esferas como pierna").
   */
  private createFluidNodePseudoGroup(
    sourceType: 'male' | 'female' | 'breast' | 'glute',
    color: number,
    opacity: number,
    id: string
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = `fluid_pseudo_group_${sourceType}_${id}`;

    const pseudoMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.03,
      metalness: 0.16,
      transparent: true,
      opacity: opacity * 0.48,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -1.0,
    });

    // 1. Outer pseudo cubic envelope block
    const pseudoBoxGeom = new THREE.BoxGeometry(0.054, 0.054, 0.054);
    const pseudoBox = new THREE.Mesh(pseudoBoxGeom, pseudoMat);
    pseudoBox.name = `fluid_pseudo_box_${id}`;
    group.add(pseudoBox);

    // 2. Outer pseudo joint sphere
    const pseudoSphereGeom = new THREE.SphereGeometry(0.032, 14, 14);
    const pseudoSphere = new THREE.Mesh(pseudoSphereGeom, pseudoMat);
    pseudoSphere.name = `fluid_pseudo_sphere_${id}`;
    group.add(pseudoSphere);

    // 3. Outer pseudo cylinder contour sleeve
    const pseudoCylGeom = new THREE.CylinderGeometry(0.027, 0.027, 0.060, 12, 1);
    const pseudoCyl = new THREE.Mesh(pseudoCylGeom, pseudoMat);
    pseudoCyl.rotation.x = Math.PI * 0.5;
    group.add(pseudoCyl);

    // 4. Outer pseudo sphere caps on joint ends
    const pseudoCapGeom = new THREE.SphereGeometry(0.022, 10, 10);
    const capF = new THREE.Mesh(pseudoCapGeom, pseudoMat);
    capF.position.set(0, 0, 0.028);
    group.add(capF);

    const capB = new THREE.Mesh(pseudoCapGeom, pseudoMat);
    capB.position.set(0, 0, -0.028);
    group.add(capB);

    return group;
  }

  /**
   * Spawns liquid in a continuous chain of connected blocks with physical tendons holding them together.
   * ("mientras salga continuo las cadenas sigan saliendo unidas")
   */
  public spawnFluidChain(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    sourceType: 'male' | 'female' | 'breast' | 'glute',
    speed: number = 3.6,
    chainLength: number = 3
  ) {
    if (!this.scene) return;

    this.idCounter++;
    const chainId = `fluid_chain_${sourceType}_${this.idCounter}`;
    let color = 0xffffff;
    let opacity = 0.94;
    if (sourceType === 'male') {
      color = 0xf1f5f9;
      opacity = 0.90;
    } else if (sourceType === 'female') {
      color = 0xfce7f3;
      opacity = 0.85;
    }

    const normDir = direction.clone().normalize();
    const rightVec = new THREE.Vector3(-normDir.z, 0, normDir.x).normalize();
    if (rightVec.lengthSq() < 0.01) rightVec.set(1, 0, 0);
    const upVec = new THREE.Vector3().crossVectors(normDir, rightVec).normalize();

    for (let c = 0; c < chainLength; c++) {
      this.idCounter++;
      const id = `fluid_prop_${sourceType}_${this.idCounter}`;

      const meshGroup = this.createFluidNodeMeshGroup(sourceType, color, opacity, id);

      const totalWidth = 0.062;
      const totalDepth = 0.062;
      const totalHeight = 0.032;

      // Outer pseudo-envelope with spheres, cylinders, and leg unions
      const pseudoMesh = this.createFluidNodePseudoGroup(sourceType, color, opacity, id);
      this.pseudoGroup.add(pseudoMesh);

      // Sequential spatial offset along emission stream
      const linkSpacing = 0.052;
      const nodePos = origin.clone().addScaledVector(normDir, -c * linkSpacing);
      nodePos.addScaledVector(rightVec, (Math.random() - 0.5) * 0.008);
      nodePos.addScaledVector(upVec, (Math.random() - 0.5) * 0.008);

      meshGroup.position.copy(nodePos);
      pseudoMesh.position.copy(nodePos);
      this.scene.add(meshGroup);

      // Tendon cylinder mesh linking node c to node c+1 so chains stay connected
      let tendonMesh: THREE.Mesh | undefined;
      if (c < chainLength - 1) {
        const tendonGeom = new THREE.CylinderGeometry(0.0068, 0.0068, 1.0, 10, 1);
        const tendonMat = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.03,
          metalness: 0.12,
          transparent: true,
          opacity: opacity * 0.86,
        });
        tendonMesh = new THREE.Mesh(tendonGeom, tendonMat);
        tendonMesh.name = `tendon_${chainId}_${c}`;
        tendonMesh.visible = true;
        this.pseudoGroup.add(tendonMesh);
      }

      // Bridge pseudo-mesh (connection bridge linking chain nodes)
      const bridgeGeom = new THREE.BoxGeometry(totalWidth * 0.85, totalHeight * 0.85, 0.20);
      const bridgeMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.02,
        metalness: 0.18,
        transparent: true,
        opacity: opacity * 0.40,
        polygonOffset: true,
        polygonOffsetFactor: -1.0,
        polygonOffsetUnits: -1.0,
      });
      const bridgeMesh = new THREE.Mesh(bridgeGeom, bridgeMat);
      bridgeMesh.name = `fluid_bridge_${id}`;
      bridgeMesh.visible = false;
      this.pseudoGroup.add(bridgeMesh);

      // Forward ejection trajectory velocity
      const forwardSpeed = speed * (0.94 + Math.random() * 0.12) - c * 0.08;
      const vx = normDir.x * forwardSpeed;
      const vy = normDir.y * forwardSpeed + 0.18;
      const vz = normDir.z * forwardSpeed;

      const prop: RealisticFluid3DProp = {
        id,
        x: nodePos.x,
        y: nodePos.y,
        z: nodePos.z,
        vx,
        vy,
        vz,
        rotX: (Math.random() - 0.5) * 0.4,
        rotY: Math.random() * Math.PI * 2,
        rotZ: (Math.random() - 0.5) * 0.4,
        vrotX: (Math.random() - 0.5) * 2.5,
        vrotY: (Math.random() - 0.5) * 3.5,
        vrotZ: (Math.random() - 0.5) * 2.5,
        width: totalWidth,
        height: totalHeight,
        depth: totalDepth,
        meshGroup,
        pseudoMesh,
        bridgeMesh,
        tendonMesh,
        chainId,
        chainIndex: c,
        chainTotal: chainLength,
        sourceType,
        color,
        opacity,
        isOnFloor: false,
        life: 14.0,
        maxLife: 14.0,
      };

      this.fluidProps.push(prop);
    }
  }

  /**
   * Spawns a continuous fluid block node that remains united/chained to the previously emitted node
   * in this specific stream with physical tendon cylinders and joint union spheres.
   * ("salgan sin parar y salgan unidos los bloques y esos bloques tengan pseudos de esferas y cilindros como si fueran piernas con cilindros de uniones y cilindros y esferas")
   */
  public spawnContinuousFluidNode(
    streamKey: string,
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    sourceType: 'male' | 'female' | 'breast' | 'glute',
    speed: number = 3.6
  ): RealisticFluid3DProp | null {
    if (!this.scene) return null;

    this.idCounter++;
    const id = `fluid_node_${sourceType}_${this.idCounter}`;

    let color = 0xffffff;
    let opacity = 0.94;
    if (sourceType === 'male') {
      color = 0xf1f5f9;
      opacity = 0.90;
    } else if (sourceType === 'female') {
      color = 0xfce7f3;
      opacity = 0.85;
    } else if (sourceType === 'glute') {
      color = 0xfbf5ee; // Warm creamy glistening fluid for glutes
      opacity = 0.93;
    } else if (sourceType === 'breast') {
      color = 0xffffff;
      opacity = 0.95;
    }

    const normDir = direction.clone().normalize();
    const rightVec = new THREE.Vector3(-normDir.z, 0, normDir.x).normalize();
    if (rightVec.lengthSq() < 0.01) rightVec.set(1, 0, 0);
    const upVec = new THREE.Vector3().crossVectors(normDir, rightVec).normalize();

    // 1. Inner mesh group with articulated legs, cylinders & spheres
    const meshGroup = this.createFluidNodeMeshGroup(sourceType, color, opacity, id);

    // 2. Outer pseudo group with pseudo spheres, pseudo cylinders, and leg unions
    const pseudoMesh = this.createFluidNodePseudoGroup(sourceType, color, opacity, id);

    const totalWidth = 0.062;
    const totalDepth = 0.062;
    const totalHeight = 0.032;

    const nodePos = origin.clone();
    nodePos.addScaledVector(rightVec, (Math.random() - 0.5) * 0.006);
    nodePos.addScaledVector(upVec, (Math.random() - 0.5) * 0.006);

    meshGroup.position.copy(nodePos);
    pseudoMesh.position.copy(nodePos);
    this.scene.add(meshGroup);
    this.pseudoGroup.add(pseudoMesh);

    // 3. Connect to previous node in this continuous stream so blocks stay united! ("salgan unidos los bloques")
    let tendonMesh: THREE.Mesh | undefined;
    let tendonSphere: THREE.Mesh | undefined;
    let prevNodeId: string | undefined;

    const prevProp = this.lastStreamNode.get(streamKey);
    if (prevProp && prevProp.life > 0) {
      const dist = Math.hypot(nodePos.x - prevProp.x, nodePos.y - prevProp.y, nodePos.z - prevProp.z);
      const maxConnectDist = 0.38;
      if (dist < maxConnectDist) {
        prevNodeId = prevProp.id;

        // Tendon cylinder connection
        const tendonGeom = new THREE.CylinderGeometry(0.0075, 0.0075, 1.0, 10, 1);
        const tendonMat = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.03,
          metalness: 0.14,
          transparent: true,
          opacity: opacity * 0.88,
        });
        tendonMesh = new THREE.Mesh(tendonGeom, tendonMat);
        tendonMesh.name = `stream_tendon_${id}`;
        this.pseudoGroup.add(tendonMesh);

        // Union joint sphere at connector ("cilindros de uniones y cilindros y esferas")
        const sphereGeom = new THREE.SphereGeometry(0.011, 10, 10);
        tendonSphere = new THREE.Mesh(sphereGeom, tendonMat);
        tendonSphere.name = `stream_union_sphere_${id}`;
        this.pseudoGroup.add(tendonSphere);

        prevProp.nextNodeId = id;
      }
    }

    // Velocity along ejection trajectory with realistic parabolic arc
    const forwardSpeed = speed * (0.95 + Math.random() * 0.10);
    const vx = normDir.x * forwardSpeed;
    const vy = normDir.y * forwardSpeed + 0.18;
    const vz = normDir.z * forwardSpeed;

    const prop: RealisticFluid3DProp = {
      id,
      x: nodePos.x,
      y: nodePos.y,
      z: nodePos.z,
      vx,
      vy,
      vz,
      rotX: (Math.random() - 0.5) * 0.3,
      rotY: Math.random() * Math.PI * 2,
      rotZ: (Math.random() - 0.5) * 0.3,
      vrotX: (Math.random() - 0.5) * 2.0,
      vrotY: (Math.random() - 0.5) * 3.0,
      vrotZ: (Math.random() - 0.5) * 2.0,
      width: totalWidth,
      height: totalHeight,
      depth: totalDepth,
      meshGroup,
      pseudoMesh,
      tendonMesh,
      tendonSphere,
      prevNodeId,
      streamKey,
      sourceType,
      color,
      opacity,
      isOnFloor: false,
      life: 14.0,
      maxLife: 14.0,
    };

    this.lastStreamNode.set(streamKey, prop);
    this.fluidProps.push(prop);

    // Limit maximum active fluid props for silky 60fps performance and zero memory leaks
    const MAX_FLUID_PROPS = 160;
    while (this.fluidProps.length > MAX_FLUID_PROPS) {
      const oldest = this.fluidProps.shift();
      if (oldest) {
        if (oldest.meshGroup && oldest.meshGroup.parent) {
          oldest.meshGroup.parent.remove(oldest.meshGroup);
        }
        if (oldest.pseudoMesh && oldest.pseudoMesh.parent) {
          oldest.pseudoMesh.parent.remove(oldest.pseudoMesh);
        }
        if (oldest.tendonMesh && oldest.tendonMesh.parent) {
          oldest.tendonMesh.parent.remove(oldest.tendonMesh);
        }
        if (oldest.tendonSphere && oldest.tendonSphere.parent) {
          oldest.tendonSphere.parent.remove(oldest.tendonSphere);
        }
      }
    }

    return prop;
  }

  /**
   * Spawns breast liquid in a continuous chain of connected blocks with physical tendons holding them together.
   */
  public spawnBreastFluidChain(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    speed: number = 3.6,
    chainLength: number = 3
  ) {
    this.spawnFluidChain(origin, direction, 'breast', speed, chainLength);
  }

  /**
   * Spawns continuous fluid chains for all liquid sources.
   */
  public spawnFluid3DProp(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    sourceType: 'male' | 'female' | 'breast' | 'glute',
    speed: number = 3.6
  ) {
    this.spawnFluidChain(origin, direction, sourceType, speed, 3);
  }

  /**
   * Updates all fluid props with normal prop physics and merges touching floor puddles into a single pseudo
   * ("tengan fisicas normales de prop y se conviertan en un solo pseudo al juntarse con otros en piso")
   */
  public update(dt: number, getGroundHeight: (x: number, z: number, currentY?: number) => number) {
    if (this.fluidProps.length === 0 && this.puddleClusters.size === 0) return;

    const gravity = this.isZeroGravity ? 0.0 : -14.5;
    const dragAir = Math.pow(0.985, dt * 60);
    const dragFloor = Math.pow(0.85, dt * 60);

    // 1. Physics integration for each fluid prop
    const toRemoveIndices: number[] = [];

    for (let i = 0; i < this.fluidProps.length; i++) {
      const p = this.fluidProps[i];
      p.life -= dt;

      if (p.life <= 0) {
        toRemoveIndices.push(i);
        this.disposePropMeshes(p);
        continue;
      }

      // Tendon spring physics for chained fluid blocks ("salgan unidos los bloques")
      let connectedNode: RealisticFluid3DProp | undefined;
      if (p.prevNodeId) {
        connectedNode = this.fluidProps.find((other) => other.id === p.prevNodeId);
      } else if (p.chainId && p.chainIndex !== undefined) {
        connectedNode = this.fluidProps.find(
          (other) => other.chainId === p.chainId && other.chainIndex === p.chainIndex! + 1
        );
      }

      if (connectedNode && connectedNode.life > 0) {
        const dx = connectedNode.x - p.x;
        const dy = connectedNode.y - p.y;
        const dz = connectedNode.z - p.z;
        const dist = Math.hypot(dx, dy, dz);
        const restLen = 0.075;
        if (dist > 0.005) {
          const diff = dist - restLen;
          const springK = p.isOnFloor && connectedNode.isOnFloor ? 32.0 : 68.0;
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;
          const pull = diff * springK * dt;

          p.vx += nx * pull * 0.5;
          p.vy += ny * pull * 0.5;
          p.vz += nz * pull * 0.5;

          connectedNode.vx -= nx * pull * 0.5;
          connectedNode.vy -= ny * pull * 0.5;
          connectedNode.vz -= nz * pull * 0.5;
        }
      }

      // Gravity & drag
      p.vy += gravity * dt;
      const drag = p.isOnFloor ? dragFloor : dragAir;
      p.vx *= drag;
      p.vy *= p.isOnFloor ? 1.0 : drag;
      p.vz *= drag;

      // Position update
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      // Angular rotation physics
      p.rotX += p.vrotX * dt;
      p.rotY += p.vrotY * dt;
      p.rotZ += p.vrotZ * dt;

      // Ground height collision with prop bounce and settling (only active if normal gravity exists)
      if (!this.isZeroGravity) {
        const groundY = getGroundHeight(p.x, p.z, p.y);
        const halfH = p.height * 0.5;

        if (p.y <= groundY + halfH) {
          p.y = groundY + halfH;

          if (Math.abs(p.vy) > 0.6) {
            // Normal prop bounce
            p.vy = -p.vy * 0.24;
            p.vx *= 0.72;
            p.vz *= 0.72;
            p.vrotX *= 0.6;
            p.vrotZ *= 0.6;
          } else {
            // Settle on floor
            p.vy = 0;
            p.isOnFloor = true;
            // Align flat with the ground surface
            p.rotX *= Math.pow(0.82, dt * 60);
            p.rotZ *= Math.pow(0.82, dt * 60);
            p.vrotX *= 0.5;
            p.vrotY *= 0.7;
            p.vrotZ *= 0.5;
          }
        }
      } else {
        p.isOnFloor = false; // Floating in zero-g
      }

      // Sync 3D transforms
      p.meshGroup.position.set(p.x, p.y, p.z);
      if (!p.isOnFloor) {
        // Airborne droplets tumble naturally with their 3D angular velocities
        p.meshGroup.rotation.set(p.rotX, p.rotY, p.rotZ);
        p.meshGroup.scale.set(1.0, 1.0, 1.0);

        p.pseudoMesh.position.set(p.x, p.y, p.z);
        p.pseudoMesh.rotation.set(p.rotX, p.rotY, p.rotZ);
        p.pseudoMesh.scale.set(1.0, 1.0, 1.0);
        p.pseudoMesh.visible = true; // Pseudo cube visible in flight wrapping 3x3 blocks

        // Link with previous airborne droplet in the chain via bridge pseudo-cube
        let linked = false;
        if (i > 0 && p.bridgeMesh) {
          const prev = this.fluidProps[i - 1];
          if (prev && !prev.isOnFloor && prev.sourceType === p.sourceType) {
            const dist = Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z);
            if (dist > 0.01 && dist < 0.45) {
              p.bridgeMesh.position.set((p.x + prev.x) * 0.5, (p.y + prev.y) * 0.5, (p.z + prev.z) * 0.5);
              const dir = new THREE.Vector3(prev.x - p.x, prev.y - p.y, prev.z - p.z).normalize();
              p.bridgeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
              p.bridgeMesh.scale.set(1.0, 1.0, Math.max(0.1, dist / 0.20));
              p.bridgeMesh.visible = true;
              linked = true;
            }
          }
        }
        if (!linked && p.bridgeMesh) {
          p.bridgeMesh.visible = false;
        }

        // Visual update for physical tendon cylinder & union sphere connecting chained fluid blocks
        if (p.tendonMesh) {
          let targetNode: RealisticFluid3DProp | undefined;
          if (p.prevNodeId) {
            targetNode = this.fluidProps.find((other) => other.id === p.prevNodeId);
          } else if (p.chainId && p.chainIndex !== undefined) {
            targetNode = this.fluidProps.find(
              (other) => other.chainId === p.chainId && other.chainIndex === p.chainIndex! + 1
            );
          }

          if (targetNode && targetNode.life > 0) {
            const dx = targetNode.x - p.x;
            const dy = targetNode.y - p.y;
            const dz = targetNode.z - p.z;
            const dist = Math.hypot(dx, dy, dz);

            if (dist < 1.8) {
              const midX = (p.x + targetNode.x) * 0.5;
              const midY = (p.y + targetNode.y) * 0.5;
              const midZ = (p.z + targetNode.z) * 0.5;

              p.tendonMesh.position.set(midX, midY, midZ);
              const dir = new THREE.Vector3(dx, dy, dz).normalize();
              p.tendonMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
              p.tendonMesh.scale.set(1.0, Math.max(0.01, dist), 1.0);
              p.tendonMesh.visible = true;

              if (p.tendonSphere) {
                p.tendonSphere.position.set(midX, midY, midZ);
                p.tendonSphere.visible = true;
              }
            } else {
              p.tendonMesh.visible = false;
              if (p.tendonSphere) p.tendonSphere.visible = false;
            }
          } else {
            p.tendonMesh.visible = false;
            if (p.tendonSphere) p.tendonSphere.visible = false;
          }
        }
      } else {
        // On floor: flatten the voxel block or leg cluster unit and turn pseudo envelope into a flattened pseudo-cube
        p.meshGroup.rotation.set(0, p.rotY, 0);
        p.meshGroup.scale.set(1.35, 0.22, 1.35);

        p.pseudoMesh.position.set(p.x, p.y, p.z);
        p.pseudoMesh.rotation.set(0, p.rotY, 0);
        p.pseudoMesh.scale.set(1.45, 0.22, 1.45);
        p.pseudoMesh.visible = true;
        if (p.bridgeMesh) {
          p.bridgeMesh.visible = false;
        }

        // Keep chained tendons and union spheres visible on the floor so blocks stay united as a leg
        if (p.tendonMesh) {
          let targetNode: RealisticFluid3DProp | undefined;
          if (p.prevNodeId) {
            targetNode = this.fluidProps.find((other) => other.id === p.prevNodeId);
          } else if (p.chainId && p.chainIndex !== undefined) {
            targetNode = this.fluidProps.find(
              (other) => other.chainId === p.chainId && other.chainIndex === p.chainIndex! + 1
            );
          }

          if (targetNode && targetNode.life > 0) {
            const dx = targetNode.x - p.x;
            const dy = targetNode.y - p.y;
            const dz = targetNode.z - p.z;
            const dist = Math.hypot(dx, dy, dz);

            if (dist < 1.8) {
              const midX = (p.x + targetNode.x) * 0.5;
              const midY = (p.y + targetNode.y) * 0.5;
              const midZ = (p.z + targetNode.z) * 0.5;

              p.tendonMesh.position.set(midX, midY, midZ);
              const dir = new THREE.Vector3(dx, dy, dz).normalize();
              p.tendonMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
              p.tendonMesh.scale.set(1.2, Math.max(0.01, dist), 0.35);
              p.tendonMesh.visible = true;

              if (p.tendonSphere) {
                p.tendonSphere.position.set(midX, midY, midZ);
                p.tendonSphere.scale.set(1.3, 0.35, 1.3);
                p.tendonSphere.visible = true;
              }
            } else {
              p.tendonMesh.visible = false;
              if (p.tendonSphere) p.tendonSphere.visible = false;
            }
          } else {
            p.tendonMesh.visible = false;
            if (p.tendonSphere) p.tendonSphere.visible = false;
          }
        }
      }

      // Fade out near end of life
      if (p.life < 3.0) {
        const fade = p.life / 3.0;
        p.meshGroup.traverse((c) => {
          if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
            c.material.opacity = p.opacity * 0.92 * fade;
          }
        });
        p.pseudoMesh.traverse((c) => {
          if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
            c.material.opacity = p.opacity * 0.42 * fade;
          }
        });
      }
    }

    // Clean up expired props
    for (let idx = toRemoveIndices.length - 1; idx >= 0; idx--) {
      this.fluidProps.splice(toRemoveIndices[idx], 1);
    }

    // 2. Floor Puddle Fusion: merges touching floor/zero-g props into single pseudo puddles
    this.updateFloorPuddleClusters(dt, getGroundHeight);
  }

  /**
   * Merges touching fluid props on the floor (or floating in zero gravity) into unified continuous single pseudo shapes
   */
  private updateFloorPuddleClusters(
    dt: number,
    getGroundHeight: (x: number, z: number, currentY?: number) => number
  ) {
    const floorProps = this.fluidProps.filter((p) => p.isOnFloor || this.isZeroGravity);
    const n = floorProps.length;

    // Disjoint-set union to identify connected puddles
    const parent: number[] = Array.from({ length: n }, (_, i) => i);
    const find = (i: number): number => {
      if (parent[i] === i) return i;
      parent[i] = find(parent[i]);
      return parent[i];
    };
    const union = (i: number, j: number) => {
      const rootI = find(i);
      const rootJ = find(j);
      if (rootI !== rootJ) parent[rootI] = rootJ;
    };

    const contactDistThreshold = 0.35; // Proximity threshold for joining to combine pseudos!
    const thresholdSq = contactDistThreshold * contactDistThreshold;

    for (let i = 0; i < n; i++) {
      const p1 = floorProps[i];
      for (let j = i + 1; j < n; j++) {
        const p2 = floorProps[j];
        if (p1.sourceType !== p2.sourceType) continue; // Must be same liquid type to merge

        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const dy = this.isZeroGravity ? (p2.y - p1.y) : 0;
        const distSq = dx * dx + dz * dz + dy * dy;

        if (distSq < thresholdSq) {
          union(i, j);

          // Separation and Cohesion forces to prevent overlapping
          const dist = Math.sqrt(distSq);
          if (dist > 0.001) {
            const targetDist = 0.16; // Minimum separation distance so they don't occupy the same space!
            const kCohesion = 4.5;
            const kSeparation = 9.5; // Strong force to push them out of occupied spaces
            
            // If overlapping, push apart; if separated, pull together slightly
            const force = dist < targetDist
              ? (dist - targetDist) * kSeparation
              : (dist - targetDist) * kCohesion;
              
            const pull = force * dt;
            const nx = dx / dist;
            const nz = dz / dist;
            const ny = this.isZeroGravity ? (dy / dist) : 0;
            
            p1.x += nx * pull * 0.5;
            p1.z += nz * pull * 0.5;
            p1.y += ny * pull * 0.5;
            
            p2.x -= nx * pull * 0.5;
            p2.z -= nz * pull * 0.5;
            p2.y -= ny * pull * 0.5;
          }
        }
      }
    }

    // Clamp floor positions to actual ground height after repulsion moves them horizontally
    if (!this.isZeroGravity) {
      for (let i = 0; i < n; i++) {
        const p = floorProps[i];
        const groundY = getGroundHeight(p.x, p.z, p.y);
        const halfH = p.height * 0.5;
        p.y = groundY + halfH;
      }
    }

    // Group props by cluster root
    const clusterMap = new Map<number, RealisticFluid3DProp[]>();
    for (let i = 0; i < n; i++) {
      const root = find(i);
      if (!clusterMap.has(root)) clusterMap.set(root, []);
      clusterMap.get(root)!.push(floorProps[i]);
    }

    const activeClusterIds = new Set<string>();

    clusterMap.forEach((members, rootIndex) => {
      if (members.length > 1) {
        const clusterId = `cluster_${members[0].sourceType}_${rootIndex}`;
        activeClusterIds.add(clusterId);

        // Hide individual voxel envelopes
        members.forEach((m) => {
          m.pseudoMesh.visible = false;
          if (m.bridgeMesh) m.bridgeMesh.visible = false;
        });

        // Compute collective bounding box covering all clustered parts
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        let avgY = 0;

        members.forEach((m) => {
          minX = Math.min(minX, m.x - m.width * 0.5);
          maxX = Math.max(maxX, m.x + m.width * 0.5);
          minY = Math.min(minY, m.y - m.height * 0.5);
          maxY = Math.max(maxY, m.y + m.height * 0.5);
          minZ = Math.min(minZ, m.z - m.depth * 0.5);
          maxZ = Math.max(maxZ, m.z + m.depth * 0.5);
          avgY += m.y;
        });

        avgY /= members.length;
        const centerX = (minX + maxX) * 0.5;
        const centerY = this.isZeroGravity ? (minY + maxY) * 0.5 : avgY;
        const centerZ = (minZ + maxZ) * 0.5;

        // Reorder members into a compact grid layout consolidating all 3x3 blocks into one cohesive formation
        const numMembers = members.length;
        const gridDim = Math.ceil(Math.sqrt(numMembers));
        const memberSpacing = (members[0].width || 0.066) * 0.96;
        for (let mIdx = 0; mIdx < numMembers; mIdx++) {
          const row = Math.floor(mIdx / gridDim);
          const col = mIdx % gridDim;
          const targetX = centerX + (col - (gridDim - 1) * 0.5) * memberSpacing;
          const targetZ = centerZ + (row - (gridDim - 1) * 0.5) * memberSpacing;
          const blend = Math.min(1.0, dt * 6.5);
          const m = members[mIdx];
          m.x += (targetX - m.x) * blend;
          m.z += (targetZ - m.z) * blend;
          m.meshGroup.position.set(m.x, m.y, m.z);
        }

        let spanX = Math.max(0.06, (maxX - minX) * 1.10);
        let spanZ = Math.max(0.06, (maxZ - minZ) * 1.10);
        if (!this.isZeroGravity) {
          // Form a square cube base footprint on the ground, without increasing height
          const maxSpan = Math.max(spanX, spanZ, gridDim * memberSpacing * 1.05);
          spanX = maxSpan;
          spanZ = maxSpan;
        }
        const spanY = this.isZeroGravity ? Math.max(0.06, (maxY - minY) * 1.10) : 0.024; // flat puddle on floor, volumetric box in zero-g

        let cluster = this.puddleClusters.get(clusterId);
        if (!cluster || !cluster.pseudoMesh) {
          const geom = new THREE.BoxGeometry(1, 1, 1);
          const mat = new THREE.MeshStandardMaterial({
            color: members[0].color,
            roughness: 0.02,
            metalness: 0.16,
            transparent: true,
            opacity: members[0].opacity * 0.48,
          });
          const mesh = new THREE.Mesh(geom, mat);
          mesh.name = `unified_pseudo_${clusterId}`;
          this.clusterMeshGroup.add(mesh);

          cluster = {
            id: clusterId,
            props: members,
            color: members[0].color,
            opacity: members[0].opacity,
            pseudoMesh: mesh,
          };
          this.puddleClusters.set(clusterId, cluster);
        }

        if (cluster.pseudoMesh) {
          cluster.pseudoMesh.position.set(centerX, centerY, centerZ);
          cluster.pseudoMesh.scale.set(spanX, spanY, spanZ);
          cluster.pseudoMesh.visible = true;
        }
      } else {
        // Single isolated prop on floor: keep its own pseudo envelope visible as a flat cube
        const m0 = members[0];
        m0.pseudoMesh.position.set(m0.x, m0.y, m0.z);
        m0.pseudoMesh.rotation.set(0, m0.rotY, 0); // Flat on ground, keep Y rotation
        
        // Form a perfect square footprint like a flat cube, without increasing height
        const targetWidth = Math.max(m0.width, m0.depth) * 1.5;
        const targetHeight = 0.024; // Low profile height
        const defaultW = m0.width * 1.12;
        const defaultH = m0.height * 1.15;
        const defaultD = m0.depth * 1.12;
        
        m0.pseudoMesh.scale.set(
          targetWidth / defaultW,
          targetHeight / defaultH,
          targetWidth / defaultD
        );
        m0.pseudoMesh.visible = true;
      }
    });

    // Clean up inactive clusters
    this.puddleClusters.forEach((cluster, id) => {
      if (!activeClusterIds.has(id)) {
        if (cluster.pseudoMesh) {
          this.clusterMeshGroup.remove(cluster.pseudoMesh);
          cluster.pseudoMesh.geometry?.dispose();
          if (Array.isArray(cluster.pseudoMesh.material)) {
            cluster.pseudoMesh.material.forEach((m) => m.dispose());
          } else {
            cluster.pseudoMesh.material?.dispose();
          }
        }
        this.puddleClusters.delete(id);
      }
    });
  }

  /**
   * Ticks fluid emission states for ragdolls with continuous, non-stop streams ("que salga sin parar").
   * Emits from breasts and glutes with connected fluid blocks having pseudo spheres, cylinders, and leg unions.
   * ("Liquido de pechos y gluteos cuando salga continuk me referia a que salga sin parar y salgan unidos los bloques y esos bloques tengan pseudos de esferas y cilindros como si fueran piernas con cilindros de uniones y cilindros y esferas")
   */
  public updateRagdollEmission(ragdolls: Ragdoll3D[], dt: number) {
    const soundEngine = (window as any).soundEngine || { playWormSlime: () => {} };

    for (const ragdoll of ragdolls) {
      if (!ragdoll.isAlive && !ragdoll.isWalkingRagdoll && !ragdoll.isCollapsed) continue;

      // Initialize state machine: fluid emission is triggered by user or event, default off
      if (ragdoll.fluidEmissionActive === undefined) {
        ragdoll.fluidEmissionActive = false;
        ragdoll.fluidEmissionNextPulseTimer = 0;
      }

      // Check duration timer if timed emission was triggered
      if (ragdoll.fluidEmissionDurationLeft !== undefined && ragdoll.fluidEmissionDurationLeft > 0) {
        ragdoll.fluidEmissionDurationLeft -= dt;
        if (ragdoll.fluidEmissionDurationLeft <= 0) {
          ragdoll.fluidEmissionActive = false;
          ragdoll.fluidEmissionDurationLeft = 0;
        }
      }

      if (ragdoll.fluidEmissionActive) {
        // CONTINUOUS EMISSION: STREAMS WITHOUT STOPPING ("sin parar")
        ragdoll.fluidEmissionNextPulseTimer = (ragdoll.fluidEmissionNextPulseTimer ?? 0.05) - dt;

        if (ragdoll.fluidEmissionNextPulseTimer <= 0) {
          ragdoll.fluidEmissionNextPulseTimer = 0.09 + Math.random() * 0.04; // High-frequency continuous stream pulses

          let emittedAny = false;
          const currentOrigins: THREE.Vector3[] = [];
          let hasGenitalEmission = false;
          let hasBreastEmission = false;
          let hasGluteEmission = false;

          // 1. Male Genital Emission (Continuous connected stream)
          if (ragdoll.genitalType === 'male' || (!ragdoll.hasBustAndGlutes && ragdoll.genitalType !== 'female')) {
            const pelvis = ragdoll.particles.find((p) => p.name === 'pelvis' || (p.name as string).includes('cadera')) || ragdoll.particles[1] || ragdoll.particles[0];
            if (pelvis) {
              let dir = new THREE.Vector3(0, -0.15, 1.0).normalize();
              if (pelvis.mesh) {
                dir.applyQuaternion(pelvis.mesh.quaternion).normalize();
              } else {
                const sinA = Math.sin(ragdoll.facingAngle || 0);
                const cosA = Math.cos(ragdoll.facingAngle || 0);
                dir.set(sinA, -0.15, cosA).normalize();
              }

              emittedAny = true;
              hasGenitalEmission = true;
              const origin = new THREE.Vector3(pelvis.x + dir.x * 0.18, pelvis.y + dir.y * 0.18, pelvis.z + dir.z * 0.18);
              currentOrigins.push(origin);

              // Spawn continuous connected fluid node!
              this.spawnContinuousFluidNode(`${ragdoll.id}_male`, origin, dir, 'male', 4.0);
            }
          }

          // 2. Female Genital Emission (Continuous connected stream)
          if (ragdoll.genitalType === 'female') {
            const pelvis = ragdoll.particles.find((p) => p.name === 'pelvis' || (p.name as string).includes('cadera')) || ragdoll.particles[1] || ragdoll.particles[0];
            if (pelvis) {
              let dir = new THREE.Vector3(0, -0.7, 0.5).normalize();
              if (pelvis.mesh) {
                dir.applyQuaternion(pelvis.mesh.quaternion).normalize();
              } else {
                const sinA = Math.sin(ragdoll.facingAngle || 0);
                const cosA = Math.cos(ragdoll.facingAngle || 0);
                dir.set(sinA * 0.5, -0.7, cosA * 0.5).normalize();
              }

              emittedAny = true;
              hasGenitalEmission = true;
              const origin = new THREE.Vector3(pelvis.x + dir.x * 0.14, pelvis.y + dir.y * 0.14, pelvis.z + dir.z * 0.14);
              currentOrigins.push(origin);

              // Spawn continuous connected fluid node!
              this.spawnContinuousFluidNode(`${ragdoll.id}_female`, origin, dir, 'female', 3.6);
            }
          }

          // 3. Breasts & Glutes Emission (Continuous connected streams without stopping)
          // ("Liquido de pechos y gluteos cuando salga continuk me referia a que salga sin parar y salgan unidos los bloques")
          if (ragdoll.hasBustAndGlutes || ragdoll.genitalType === 'female') {
            // A. PECHOS (Breasts: left & right forward emission)
            const torso = ragdoll.particles.find((p) => p.name === 'torso' || p.name === 'pechobase' || (p.name as string).includes('pecho')) || ragdoll.particles[0];
            if (torso) {
              let dir = new THREE.Vector3(0, 0.05, 1.0);
              if (torso.mesh) {
                dir.applyQuaternion(torso.mesh.quaternion).normalize();
              } else {
                const sinA = Math.sin(ragdoll.facingAngle || 0);
                const cosA = Math.cos(ragdoll.facingAngle || 0);
                dir.set(sinA, 0.05, cosA).normalize();
              }

              let rightVec = new THREE.Vector3(1, 0, 0);
              if (torso.mesh) {
                rightVec.applyQuaternion(torso.mesh.quaternion).normalize();
              } else {
                const sinA = Math.sin(ragdoll.facingAngle || 0);
                const cosA = Math.cos(ragdoll.facingAngle || 0);
                rightVec.set(cosA, 0, -sinA).normalize();
              }
              const scale = ragdoll.scale || 1.0;
              const leftBreast = new THREE.Vector3(torso.x, torso.y + 0.05, torso.z)
                .addScaledVector(rightVec, -0.14 * scale)
                .addScaledVector(dir, 0.12 * scale);
              const rightBreast = new THREE.Vector3(torso.x, torso.y + 0.05, torso.z)
                .addScaledVector(rightVec, 0.14 * scale)
                .addScaledVector(dir, 0.12 * scale);

              emittedAny = true;
              hasBreastEmission = true;
              currentOrigins.push(leftBreast, rightBreast);

              // Spawn continuous connected fluid streams for pechos!
              this.spawnContinuousFluidNode(`${ragdoll.id}_breast_l`, leftBreast, dir, 'breast', 3.6);
              this.spawnContinuousFluidNode(`${ragdoll.id}_breast_r`, rightBreast, dir, 'breast', 3.6);
            }

            // B. GLÚTEOS (Glutes: left & right backward emission)
            const pelvis = ragdoll.particles.find((p) => p.name === 'pelvis' || (p.name as string).includes('cadera')) || ragdoll.particles[1] || ragdoll.particles[0];
            if (pelvis) {
              let backDir = new THREE.Vector3(0, -0.12, -1.0);
              if (pelvis.mesh) {
                backDir.applyQuaternion(pelvis.mesh.quaternion).normalize();
              } else {
                const sinA = Math.sin(ragdoll.facingAngle || 0);
                const cosA = Math.cos(ragdoll.facingAngle || 0);
                backDir.set(-sinA, -0.12, -cosA).normalize();
              }

              let rightVec = new THREE.Vector3(1, 0, 0);
              if (pelvis.mesh) {
                rightVec.applyQuaternion(pelvis.mesh.quaternion).normalize();
              } else {
                const sinA = Math.sin(ragdoll.facingAngle || 0);
                const cosA = Math.cos(ragdoll.facingAngle || 0);
                rightVec.set(cosA, 0, -sinA).normalize();
              }
              const scale = ragdoll.scale || 1.0;
              const leftGlute = new THREE.Vector3(pelvis.x, pelvis.y - 0.02, pelvis.z)
                .addScaledVector(rightVec, -0.12 * scale)
                .addScaledVector(backDir, 0.14 * scale);
              const rightGlute = new THREE.Vector3(pelvis.x, pelvis.y - 0.02, pelvis.z)
                .addScaledVector(rightVec, 0.12 * scale)
                .addScaledVector(backDir, 0.14 * scale);

              const leftGluteDir = backDir.clone().addScaledVector(rightVec, -0.06).normalize();
              const rightGluteDir = backDir.clone().addScaledVector(rightVec, 0.06).normalize();

              emittedAny = true;
              hasGluteEmission = true;
              currentOrigins.push(leftGlute, rightGlute);

              // Spawn continuous connected fluid streams for glúteos!
              this.spawnContinuousFluidNode(`${ragdoll.id}_glute_l`, leftGlute, leftGluteDir, 'glute', 3.5);
              this.spawnContinuousFluidNode(`${ragdoll.id}_glute_r`, rightGlute, rightGluteDir, 'glute', 3.5);
            }
          }

          if (currentOrigins.length > 0) {
            ragdoll.fluidEmissionActiveOrigins = currentOrigins;
            if (hasBreastEmission && hasGluteEmission) {
              ragdoll.fluidEmissionSourceType = 'all';
            } else if (hasBreastEmission) {
              ragdoll.fluidEmissionSourceType = 'breasts';
            } else if (hasGluteEmission) {
              ragdoll.fluidEmissionSourceType = 'glutes';
            } else if (hasGenitalEmission) {
              ragdoll.fluidEmissionSourceType = 'genitals';
            }
          }

          if (emittedAny) {
            soundEngine.playWormSlime();
            ragdoll.fluidContractionBurstTimer = 0.30;
            ragdoll.fluidContractionIntensity = 0.35;
          }
        }
        // Continuous emission runs without stopping ("sin parar") - no cutoff duration!
      }
    }
  }

  /**
   * Manually activates continuous emission stream for a specific ragdoll (defaults to 2-10 seconds if unassigned)
   */
  public triggerContinuousEmission(ragdoll: Ragdoll3D, duration?: number) {
    ragdoll.fluidEmissionActive = true;
    ragdoll.fluidEmissionDurationLeft = duration ?? (2.0 + Math.random() * 8.0);
    ragdoll.fluidEmissionNextPulseTimer = 0;
  }

  private disposePropMeshes(p: RealisticFluid3DProp) {
    if (p.streamKey && this.lastStreamNode.get(p.streamKey) === p) {
      this.lastStreamNode.delete(p.streamKey);
    }

    if (this.scene) {
      this.scene.remove(p.meshGroup);
      p.meshGroup.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          c.geometry?.dispose();
          if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
          else c.material?.dispose();
        }
      });

      if (p.pseudoMesh) {
        this.pseudoGroup.remove(p.pseudoMesh);
        p.pseudoMesh.traverse((c) => {
          if (c instanceof THREE.Mesh) {
            c.geometry?.dispose();
            if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
            else c.material?.dispose();
          }
        });
      }

      if (p.bridgeMesh) {
        this.pseudoGroup.remove(p.bridgeMesh);
        p.bridgeMesh.geometry?.dispose();
        if (Array.isArray(p.bridgeMesh.material)) p.bridgeMesh.material.forEach((m) => m.dispose());
        else p.bridgeMesh.material?.dispose();
      }

      if (p.tendonMesh) {
        this.pseudoGroup.remove(p.tendonMesh);
        p.tendonMesh.geometry?.dispose();
        if (Array.isArray(p.tendonMesh.material)) p.tendonMesh.material.forEach((m) => m.dispose());
        else p.tendonMesh.material?.dispose();
      }

      if (p.tendonSphere) {
        this.pseudoGroup.remove(p.tendonSphere);
        p.tendonSphere.geometry?.dispose();
        if (Array.isArray(p.tendonSphere.material)) p.tendonSphere.material.forEach((m) => m.dispose());
        else p.tendonSphere.material?.dispose();
      }
    }
  }

  public clear() {
    this.lastStreamNode.clear();
    for (const p of this.fluidProps) {
      this.disposePropMeshes(p);
    }
    this.fluidProps = [];

    this.puddleClusters.forEach((cluster) => {
      if (cluster.pseudoMesh) {
        this.clusterMeshGroup.remove(cluster.pseudoMesh);
        cluster.pseudoMesh.geometry?.dispose();
      }
    });
    this.puddleClusters.clear();
  }
}
