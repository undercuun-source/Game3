import { GameMap } from '../types/physics';

export const GAME_MAPS: Record<string, GameMap> = {
  lab: {
    id: 'lab',
    name: 'Laboratorio de Pruebas',
    description: 'Instalación de pruebas con plataformas, trampa de pinchos y pistones.',
    width: 2400,
    height: 1400,
    gravity: { x: 0, y: 980 },
    spawnPoint: { x: 500, y: 800 },
    theme: 'lab',
    obstacles: [
      // Ground
      { id: 'floor', x: 1200, y: 1350, width: 2400, height: 100, color: '#334155', type: 'ground' },
      // Ceiling
      { id: 'ceil', x: 1200, y: 50, width: 2400, height: 100, color: '#1e293b', type: 'wall' },
      // Left wall
      { id: 'wall_left', x: 50, y: 700, width: 100, height: 1400, color: '#1e293b', type: 'wall' },
      // Right wall
      { id: 'wall_right', x: 2350, y: 700, width: 100, height: 1400, color: '#1e293b', type: 'wall' },
      // Mid platforms
      { id: 'plat_1', x: 550, y: 950, width: 450, height: 30, color: '#475569', type: 'platform' },
      { id: 'plat_2', x: 1200, y: 750, width: 500, height: 30, color: '#475569', type: 'platform' },
      { id: 'plat_3', x: 1850, y: 950, width: 450, height: 30, color: '#475569', type: 'platform' },
      // Raised lookout
      { id: 'plat_top', x: 1200, y: 400, width: 350, height: 25, color: '#475569', type: 'platform' },
      // Ramp
      { id: 'ramp_1', x: 900, y: 1150, width: 350, height: 25, angle: -0.4, color: '#64748b', type: 'ramp' },
      // Hazard spike pit
      { id: 'spikes_pit', x: 1550, y: 1290, width: 300, height: 20, color: '#dc2626', type: 'hazard' },
    ],
  },
  stairs: {
    id: 'stairs',
    name: 'Escaleras & Rampa de Caída',
    description: 'Enorme torre con escalinatas empinadas y rampas ideales para rodar y fracturas.',
    width: 2800,
    height: 1600,
    gravity: { x: 0, y: 1050 },
    spawnPoint: { x: 400, y: 350 },
    theme: 'stairs',
    obstacles: [
      // Ground
      { id: 'floor', x: 1400, y: 1550, width: 2800, height: 100, color: '#292524', type: 'ground' },
      // Walls
      { id: 'wall_l', x: 50, y: 800, width: 100, height: 1600, color: '#1c1917', type: 'wall' },
      { id: 'wall_r', x: 2750, y: 800, width: 100, height: 1600, color: '#1c1917', type: 'wall' },
      // High Spawn Platform
      { id: 'spawn_tower', x: 400, y: 450, width: 400, height: 40, color: '#44403c', type: 'platform' },
      // Giant Stairs steps
      { id: 'stair_1', x: 750, y: 550, width: 150, height: 40, color: '#57534e', type: 'platform' },
      { id: 'stair_2', x: 950, y: 670, width: 150, height: 40, color: '#57534e', type: 'platform' },
      { id: 'stair_3', x: 1150, y: 790, width: 150, height: 40, color: '#57534e', type: 'platform' },
      { id: 'stair_4', x: 1350, y: 910, width: 150, height: 40, color: '#57534e', type: 'platform' },
      { id: 'stair_5', x: 1550, y: 1030, width: 150, height: 40, color: '#57534e', type: 'platform' },
      { id: 'stair_6', x: 1750, y: 1150, width: 150, height: 40, color: '#57534e', type: 'platform' },
      // Long tumble Ramp
      { id: 'mega_ramp', x: 2200, y: 1300, width: 600, height: 30, angle: 0.35, color: '#78716c', type: 'ramp' },
      // Bounce blocker
      { id: 'bounce_wall', x: 2550, y: 1400, width: 40, height: 200, color: '#b91c1c', type: 'platform' },
    ],
  },
  city: {
    id: 'city',
    name: 'Azoteas Urbanas & Vidrieras',
    description: 'Rascacielos con paneles de cristal rompibles, grúas y caídas libres al vacío.',
    width: 3000,
    height: 1800,
    gravity: { x: 0, y: 980 },
    spawnPoint: { x: 500, y: 600 },
    theme: 'city',
    obstacles: [
      // Street floor
      { id: 'street', x: 1500, y: 1750, width: 3000, height: 100, color: '#18181b', type: 'ground' },
      // Building 1 (Left)
      { id: 'bld_1', x: 450, y: 1200, width: 500, height: 1000, color: '#27272a', type: 'wall' },
      // Building 2 (Center Low)
      { id: 'bld_2', x: 1200, y: 1400, width: 400, height: 600, color: '#3f3f46', type: 'wall' },
      // Building 3 (Right High)
      { id: 'bld_3', x: 2100, y: 1050, width: 600, height: 1300, color: '#27272a', type: 'wall' },
      // Glass Walkway Bridge
      { id: 'glass_bridge', x: 1650, y: 1000, width: 300, height: 15, color: '#38bdf8', type: 'glass', destructible: true, health: 40 },
      // Rooftop Crane Girder
      { id: 'crane_girder', x: 2100, y: 350, width: 700, height: 25, color: '#eab308', type: 'platform' },
      // Scaffoldings
      { id: 'scaffold_1', x: 1200, y: 1000, width: 300, height: 20, color: '#71717a', type: 'platform' },
    ],
  },
  zerog: {
    id: 'zerog',
    name: 'Cámara Gravedad Cero',
    description: 'Cámara espacial sellada sin gravedad donde los cuerpos flotan libremente.',
    width: 2000,
    height: 1400,
    gravity: { x: 0, y: 0 },
    spawnPoint: { x: 1000, y: 700 },
    theme: 'zerog',
    obstacles: [
      { id: 'f_top', x: 1000, y: 50, width: 2000, height: 100, color: '#0f172a', type: 'wall' },
      { id: 'f_bot', x: 1000, y: 1350, width: 2000, height: 100, color: '#0f172a', type: 'wall' },
      { id: 'f_l', x: 50, y: 700, width: 100, height: 1400, color: '#0f172a', type: 'wall' },
      { id: 'f_r', x: 1950, y: 700, width: 100, height: 1400, color: '#0f172a', type: 'wall' },
      // Floating central rings
      { id: 'ring_top', x: 1000, y: 400, width: 300, height: 30, color: '#06b6d4', type: 'platform' },
      { id: 'ring_bot', x: 1000, y: 1000, width: 300, height: 30, color: '#06b6d4', type: 'platform' },
      { id: 'ring_l', x: 450, y: 700, width: 30, height: 300, color: '#06b6d4', type: 'platform' },
      { id: 'ring_r', x: 1550, y: 700, width: 30, height: 300, color: '#06b6d4', type: 'platform' },
    ],
  },
  grinder: {
    id: 'grinder',
    name: 'Triturador & Peligros Industriales',
    description: 'Zona de pruebas extrema con sierras rotatorias, prensas hidráulicas y pozos de fuego.',
    width: 2400,
    height: 1400,
    gravity: { x: 0, y: 1000 },
    spawnPoint: { x: 450, y: 500 },
    theme: 'grinder',
    obstacles: [
      { id: 'f_bot', x: 1200, y: 1350, width: 2400, height: 100, color: '#18181b', type: 'ground' },
      { id: 'f_top', x: 1200, y: 50, width: 2400, height: 100, color: '#18181b', type: 'wall' },
      { id: 'f_l', x: 50, y: 700, width: 100, height: 1400, color: '#18181b', type: 'wall' },
      { id: 'f_r', x: 2350, y: 700, width: 100, height: 1400, color: '#18181b', type: 'wall' },
      // High feeder chute
      { id: 'chute_l', x: 800, y: 600, width: 500, height: 25, angle: 0.5, color: '#52525b', type: 'ramp' },
      { id: 'chute_r', x: 1600, y: 600, width: 500, height: 25, angle: -0.5, color: '#52525b', type: 'ramp' },
      // Trap Pit Floor
      { id: 'pit_bottom', x: 1200, y: 1200, width: 600, height: 30, color: '#7f1d1d', type: 'hazard' },
      // Side ledges
      { id: 'ledge_1', x: 350, y: 800, width: 300, height: 30, color: '#3f3f46', type: 'platform' },
      { id: 'ledge_2', x: 2050, y: 800, width: 300, height: 30, color: '#3f3f46', type: 'platform' },
    ],
  },
};
