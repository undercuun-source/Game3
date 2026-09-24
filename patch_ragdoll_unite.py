import re

with open('src/engine/ragdollBuilder3D.ts', 'r') as f:
    content = f.read()

# Replace metaball2 checks with (metaball2 or shader) in applySphericalMorph
content = content.replace(
    "if (style === 'metaball2' && isConnected) {",
    "if ((style === 'metaball2' || style === 'shader') && isConnected) {"
)

content = content.replace(
    "const weight = style === 'metaball2' ? Math.pow(ratio, 1.5) * 1.5 : Math.pow(ratio, 2.0);",
    "const weight = (style === 'metaball2' || style === 'shader') ? Math.pow(ratio, 1.5) * 1.5 : Math.pow(ratio, 2.0);"
)

content = content.replace(
    "if (style === 'metaball2') {",
    "if (style === 'metaball2' || style === 'shader') {"
)

with open('src/engine/ragdollBuilder3D.ts', 'w') as f:
    f.write(content)

