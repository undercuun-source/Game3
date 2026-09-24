import re

with open('src/engine/ragdollBuilder3D.ts', 'r') as f:
    content = f.read()

# Replace male genital position
content = content.replace("const maleRootY = -0.07;", "const maleRootY = -0.02;")
content = content.replace("const maleRootZ = 0.150;", "const maleRootZ = 0.22;")

with open('src/engine/ragdollBuilder3D.ts', 'w') as f:
    f.write(content)

