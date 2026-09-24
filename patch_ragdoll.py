import re

with open('src/engine/ragdollBuilder3D.ts', 'r') as f:
    content = f.read()

# Define global temp vectors above applySphericalMorph
temp_vectors = """
const _vWorldPos = new THREE.Vector3();
const _vBlendPos = new THREE.Vector3();
const _vOtherCenter = new THREE.Vector3();
const _vLocalPos = new THREE.Vector3();
const _vParticlePos = new THREE.Vector3();
const _vLocalOffset = new THREE.Vector3();
const _vInverseQuat = new THREE.Quaternion();

export function applySphericalMorph(
"""

content = content.replace('export function applySphericalMorph(', temp_vectors, 1)

# Inside applySphericalMorph, replace allocations
content = content.replace('const localOffset = new THREE.Vector3();', '_vLocalOffset.set(0, 0, 0);')
content = content.replace(
    'const worldPos = new THREE.Vector3(finalX, finalY, finalZ).add(localOffset);',
    '_vWorldPos.set(finalX, finalY, finalZ).add(_vLocalOffset);'
)
content = content.replace('worldPos.applyQuaternion(pMesh.quaternion);', '_vWorldPos.applyQuaternion(pMesh.quaternion);')
content = content.replace('worldPos.multiplyScalar(ragdoll.scale);', '_vWorldPos.multiplyScalar(ragdoll.scale);')
content = content.replace('worldPos.add(new THREE.Vector3(particle.x, particle.y, particle.z));', '_vParticlePos.set(particle.x, particle.y, particle.z);\n        _vWorldPos.add(_vParticlePos);')

content = content.replace('let blendPos = new THREE.Vector3(0, 0, 0);', '_vBlendPos.set(0, 0, 0);')
content = content.replace('const otherCenter = new THREE.Vector3(other.x, other.y, other.z);', '_vOtherCenter.set(other.x, other.y, other.z);')
content = content.replace('const dist = worldPos.distanceTo(otherCenter);', 'const dist = _vWorldPos.distanceTo(_vOtherCenter);')
content = content.replace('blendPos.addScaledVector(otherCenter, weight);', '_vBlendPos.addScaledVector(_vOtherCenter, weight);')
content = content.replace('const avgBlendPos = blendPos.divideScalar(totalWeight);', 'const avgBlendPos = _vBlendPos.divideScalar(totalWeight);')
content = content.replace('worldPos.lerp(avgBlendPos, Math.min(0.95, totalWeight * blendFactor * t));', '_vWorldPos.lerp(avgBlendPos, Math.min(0.95, totalWeight * blendFactor * t));')
content = content.replace('const localPosMorphed = worldPos.clone();', '_vLocalPos.copy(_vWorldPos);')
content = content.replace('localPosMorphed.sub(new THREE.Vector3(particle.x, particle.y, particle.z));', '_vLocalPos.sub(_vParticlePos);')
content = content.replace('localPosMorphed.divideScalar(ragdoll.scale);', '_vLocalPos.divideScalar(ragdoll.scale);')
content = content.replace('localPosMorphed.applyQuaternion(pMesh.quaternion.clone().invert());', '_vInverseQuat.copy(pMesh.quaternion).invert();\n        _vLocalPos.applyQuaternion(_vInverseQuat);')
content = content.replace('localPosMorphed.sub(localOffset);', '_vLocalPos.sub(_vLocalOffset);')
content = content.replace('finalX = localPosMorphed.x;', 'finalX = _vLocalPos.x;')
content = content.replace('finalY = localPosMorphed.y;', 'finalY = _vLocalPos.y;')
content = content.replace('finalZ = localPosMorphed.z;', 'finalZ = _vLocalPos.z;')
content = content.replace('const v = new THREE.Vector3(finalX, finalY, finalZ);', 'const v = _vLocalPos.set(finalX, finalY, finalZ);')

# Also for metaball4, but metaball4 doesn't matter much. Let's just fix the variables that conflict
content = content.replace('const diff = new THREE.Vector3().subVectors(worldPos, C0);', 'const diff = new THREE.Vector3().subVectors(_vWorldPos, C0);')
content = content.replace('worldPos.lerp(metaballPos, t * 0.90);', '_vWorldPos.lerp(metaballPos, t * 0.90);')
content = content.replace('const dist = worldPos.distanceTo(otherCenter);', 'const dist = _vWorldPos.distanceTo(_vOtherCenter);') # double replacement check

with open('src/engine/ragdollBuilder3D.ts', 'w') as f:
    f.write(content)

