import re

with open('src/engine/physicsEngine3D.ts', 'r') as f:
    content = f.read()

# Remove shader logic from joint bridges inside physicsEngine3D.ts
content = content.replace("if (ragdoll.contourJointStyle === 'metaball3' || ragdoll.contourJointStyle === 'shader') {", "if (ragdoll.contourJointStyle === 'metaball3') {")

# Remove the wireframe creation inside the bridge for shader (from line 3508-3522)
to_remove = """
            bridgeM.wireframe = false;
            let wfMesh = bridge.children.find(c => c.name === 'ShaderWireframeMesh') as THREE.Mesh;
            if (ragdoll.contourJointStyle === 'shader') {
              if (!wfMesh) {
                const wfMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.6 });
                wfMat.polygonOffset = true;
                wfMat.polygonOffsetFactor = -3;
                wfMat.polygonOffsetUnits = -3;
                wfMesh = new THREE.Mesh(bridge.geometry, wfMat);
                wfMesh.name = 'ShaderWireframeMesh';
                bridge.add(wfMesh);
              }
              wfMesh.visible = true;
            } else if (wfMesh) {
              wfMesh.visible = false;
            }
"""
content = content.replace(to_remove, "")

with open('src/engine/physicsEngine3D.ts', 'w') as f:
    f.write(content)
