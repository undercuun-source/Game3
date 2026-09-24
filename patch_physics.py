import re

with open('src/engine/physicsEngine3D.ts', 'r') as f:
    content = f.read()

# 1. Remove shader from isJointBridgesVisible check (lines around 3443)
content = content.replace(
    "(ragdoll.contourJointStyle === 'metaball2' || ragdoll.contourJointStyle === 'metaball3' || ragdoll.contourJointStyle === 'shader') &&",
    "(ragdoll.contourJointStyle === 'metaball2' || ragdoll.contourJointStyle === 'metaball3') &&"
)

# 2. Add shader to applySphericalMorph call in physicsEngine3D.ts
content = content.replace(
    "if (isPseudo3DSpherical && (ragdoll.contourJointStyle === 'metaball4' || ragdoll.contourJointStyle === 'metaball2') && p.contourMesh instanceof THREE.Mesh) {",
    "if (isPseudo3DSpherical && (ragdoll.contourJointStyle === 'metaball4' || ragdoll.contourJointStyle === 'metaball2' || ragdoll.contourJointStyle === 'shader') && p.contourMesh instanceof THREE.Mesh) {"
)

with open('src/engine/physicsEngine3D.ts', 'w') as f:
    f.write(content)
