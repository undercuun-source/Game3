import re

with open('src/engine/ragdollBuilder3D.ts', 'r') as f:
    content = f.read()

# Fix root positions
content = content.replace("const maleRootY = -0.02;", "const maleRootY = -0.07;")
content = content.replace("const maleRootZ = 0.22;", "const maleRootZ = 0.15;")

# Fix shaft length
content = content.replace("const shaftLength = 0.50;", "const shaftLength = 0.18;")

# Fix testicles
content = content.replace("testL.position.set(-0.020, -0.025, 0.015);", "testL.position.set(-0.020, -0.035, -0.015);")
content = content.replace("testR.position.set(0.020, -0.025, 0.015);", "testR.position.set(0.020, -0.035, -0.015);")

with open('src/engine/ragdollBuilder3D.ts', 'w') as f:
    f.write(content)

