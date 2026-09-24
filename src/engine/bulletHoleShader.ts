import * as THREE from 'three';

export interface BulletHoleDecal {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  parentObj?: THREE.Object3D | null;
  targetObj?: THREE.Object3D | null;
  localOffset?: THREE.Vector3;
  localQuat?: THREE.Quaternion;
  radius?: number;
}

// Custom Shader for Realistic 3D Bullet Holes with Multi-layer Parallax Cavity & Charred Blood Rim
const BulletHoleVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const BulletHoleFragmentShader = `
  uniform float uTime;
  uniform vec3 uHoleColor;
  uniform vec3 uRimColor;
  uniform vec3 uBloodColor;
  uniform float uIsExit;
  uniform float uOpacity;
  uniform float uPenetrated; // 1.0 if it went through the limb, 0.0 if not (depth cavity)

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  // Pseudo-random noise functions
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec3 viewDir = normalize(vViewPosition);
    vec3 normal = normalize(vNormal);

    // Compute tangent space projection from view-space normal
    vec3 tangent = normalize(cross(normal, vec3(0.0, 1.0, 0.0)));
    if (length(tangent) < 0.001) {
      tangent = normalize(cross(normal, vec3(0.0, 0.0, 1.0)));
    }
    vec3 bitangent = cross(normal, tangent);

    float offsetX = dot(viewDir, tangent);
    float offsetY = dot(viewDir, bitangent);
    vec2 pOffset = vec2(offsetX, offsetY);

    vec2 centeredUv = vUv * 2.0 - 1.0;
    float dist = length(centeredUv);

    // Jagged bullet rim tearing
    float angle = atan(centeredUv.y, centeredUv.x);
    float tearFreq = (uIsExit > 0.5) ? 6.0 : 4.0;
    float tearAmp = (uIsExit > 0.5) ? 0.24 : 0.16;
    float n = noise(vec2(cos(angle * tearFreq), sin(angle * tearFreq)) * 2.5) * tearAmp;
    float n2 = noise(centeredUv * 7.0) * 0.10;
    float distortedDist = dist + n + n2;

    if (distortedDist > 0.95) {
      discard;
    }

    vec3 col;
    float alpha = uOpacity;

    // Multi-layer volumetric crater depth parallax stepping
    float depthScale = (uIsExit > 0.5) ? 0.35 : 0.28;
    vec2 midUv = centeredUv - pOffset * (depthScale * 0.5);
    float midDist = length(midUv) + noise(midUv * 5.0) * 0.10;
    
    vec2 bottomUv = centeredUv - pOffset * depthScale;
    float bottomDist = length(bottomUv) + noise(bottomUv * 6.0) * 0.08;

    float innerCore = smoothstep(0.42, 0.14, bottomDist);
    float midWall = smoothstep(0.78, 0.32, midDist);
    float outerRim = smoothstep(0.95, 0.68, distortedDist);
    float bloodRim = smoothstep(0.92, 0.50, distortedDist);

    // Deep charred black pit in center, bloody dark red walls, scorched skin perimeter
    vec3 pitColor = (uPenetrated > 0.5) ? vec3(0.02, 0.005, 0.005) : vec3(0.06, 0.01, 0.01);
    vec3 wallColor = mix(uRimColor * 0.8, uHoleColor, 1.0 - midWall);
    wallColor = mix(wallColor, pitColor, innerCore);

    col = mix(uRimColor, wallColor, 1.0 - outerRim);
    col = mix(col, uBloodColor, (1.0 - bloodRim) * 0.6);

    // Specular wet sheen from blood pool & metallic bullet impact at core
    float spec = pow(max(dot(reflect(-viewDir, normal), normalize(vec3(0.2, 0.9, 0.5))), 0.0), 16.0) * 0.7;
    vec3 slugGlint = vec3(0.65, 0.6, 0.55) * pow(max(dot(reflect(-viewDir, normal), vec3(0.0, 1.0, 0.3)), 0.0), 32.0);
    col += (vec3(spec) * vec3(1.0, 0.25, 0.25) + slugGlint) * (1.0 - innerCore * 0.5);

    // Fade cleanly at the jagged ragged perimeter
    alpha *= smoothstep(0.95, 0.82, distortedDist);

    gl_FragColor = vec4(col, alpha);
  }
`;

export function createBulletHoleShaderMaterial(isExitHole: boolean = false, penetrated: boolean = false): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: BulletHoleVertexShader,
    fragmentShader: BulletHoleFragmentShader,
    uniforms: {
      uTime: { value: 0.0 },
      uHoleColor: { value: new THREE.Color(0x0a0202) }, // Deep charred black core
      uRimColor: { value: isExitHole ? new THREE.Color(0x7f1d1d) : new THREE.Color(0x3f0e0e) }, // Scorched flesh
      uBloodColor: { value: new THREE.Color(0xb91c1c) }, // Fresh glistening blood splatter
      uIsExit: { value: isExitHole ? 1.0 : 0.0 },
      uOpacity: { value: 0.98 },
      uPenetrated: { value: penetrated ? 1.0 : 0.0 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -8.0,
    polygonOffsetUnits: -8.0,
    side: THREE.DoubleSide,
  });
}

export class BulletHoleManager {
  private decals: BulletHoleDecal[] = [];
  private scene: THREE.Scene;
  private sharedPlaneGeom: THREE.PlaneGeometry;
  private maxDecals: number = 250;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.sharedPlaneGeom = new THREE.PlaneGeometry(1, 1);
  }

  public spawnBulletHole(
    worldPos: THREE.Vector3,
    normalDir: THREE.Vector3,
    radius: number = 0.16,
    isExit: boolean = false,
    parentObject?: THREE.Object3D,
    penetrated: boolean = false
  ): THREE.Mesh {
    const safeRadius = (typeof radius === 'number' && !isNaN(radius) && radius > 0) ? radius : 0.16;

    // Keep max decal limit clean
    if (this.decals.length >= this.maxDecals) {
      const oldest = this.decals.shift();
      if (oldest) {
        this.scene.remove(oldest.mesh);
        if (oldest.mesh.material instanceof THREE.Material) {
          oldest.mesh.material.dispose();
        }
      }
    }

    const mat = createBulletHoleShaderMaterial(isExit, penetrated);
    const mesh = new THREE.Mesh(this.sharedPlaneGeom, mat);
    mesh.name = 'BulletHoleShaderDecal';
    mesh.renderOrder = 25;

    const scale = safeRadius * 2.0;

    // Align mesh orientation with normal direction in world coordinates
    const norm = (normalDir && normalDir.lengthSq() > 0.00001) ? normalDir.clone().normalize() : new THREE.Vector3(0, 0, 1);
    const worldQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), norm);

    // Always maintain strictly uniform (scale, scale, scale) in world space to guarantee perfectly spherical/circular hole decals without anisotropic squash or line distortion
    mesh.scale.set(scale, scale, scale);
    mesh.quaternion.copy(worldQuat);
    mesh.position.copy(worldPos).addScaledVector(norm, 0.003);
    this.scene.add(mesh);

    if (parentObject) {
      parentObject.updateMatrixWorld(true);
      const localOffset = parentObject.worldToLocal(worldPos.clone().addScaledVector(norm, 0.003));
      const parentQuat = parentObject.getWorldQuaternion(new THREE.Quaternion());
      const localQuat = parentQuat.clone().invert().multiply(worldQuat);

      this.decals.push({
        mesh,
        life: 999999.0,
        maxLife: 999999.0,
        targetObj: parentObject,
        localOffset,
        localQuat,
        radius: safeRadius,
      });
    } else {
      this.decals.push({
        mesh,
        life: 999999.0,
        maxLife: 999999.0,
        targetObj: null,
        radius: safeRadius,
      });
    }

    return mesh;
  }

  public update(dt: number) {
    const tempParentQuat = new THREE.Quaternion();
    const tempLocalPos = new THREE.Vector3();

    for (let i = this.decals.length - 1; i >= 0; i--) {
      const d = this.decals[i];
      d.life -= dt;

      // Keep bullet hole decals firmly anchored to their parent mesh when the character/prop moves
      if (d.targetObj && d.localOffset && d.localQuat) {
        if (d.targetObj.parent) {
          d.targetObj.updateMatrixWorld(true);
          tempLocalPos.copy(d.localOffset);
          const worldPos = d.targetObj.localToWorld(tempLocalPos);
          d.targetObj.getWorldQuaternion(tempParentQuat);
          const worldQuat = tempParentQuat.multiply(d.localQuat);

          d.mesh.position.copy(worldPos);
          d.mesh.quaternion.copy(worldQuat);
          d.mesh.visible = d.targetObj.visible;
        } else {
          // Parent object was removed from scene
          d.life = 0;
        }
      }

      if (d.mesh.material instanceof THREE.ShaderMaterial) {
        d.mesh.material.uniforms.uTime.value += dt;
        if (d.life < 4.0) {
          d.mesh.material.uniforms.uOpacity.value = Math.max(0, d.life / 4.0);
        }
      }

      if (d.life <= 0) {
        this.scene.remove(d.mesh);
        if (d.mesh.material instanceof THREE.Material) {
          d.mesh.material.dispose();
        }
        this.decals.splice(i, 1);
      }
    }
  }

  public clearAll() {
    for (const d of this.decals) {
      this.scene.remove(d.mesh);
      if (d.mesh.material instanceof THREE.Material) {
        d.mesh.material.dispose();
      }
    }
    this.decals = [];
  }
}

/**
 * Dynamically paints a detailed 2D canvas bullet wound directly onto the 2D texture map
 * of any cylinder, sphere, box, or limb mesh at the exact 3D impact location.
 */
export function paintCanvasBulletWoundOnMesh(
  mesh: THREE.Mesh | THREE.Object3D,
  worldHitPos: THREE.Vector3,
  isExit: boolean = false,
  woundRadiusPx: number = 32
) {
  // Completely disabled to satisfy "sin sangre de herida ninguna especie de billboard/canva"
  return;
}
