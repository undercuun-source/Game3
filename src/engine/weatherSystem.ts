import * as THREE from 'three';
import { soundEngine } from './soundEngine';

export type WeatherType = 'day' | 'evening' | 'night' | 'rain' | 'storm';

export interface WeatherConfig {
  name: string;
  label: string;
  icon: string;
  skyColor: number;
  fogColor: number;
  fogDensity: number;
  ambientColor: number;
  ambientIntensity: number;
  sunColor: number;
  sunIntensity: number;
  sunPos: THREE.Vector3;
  hasRain: boolean;
  rainCount: number;
  rainSpeed: number;
  rainWind: THREE.Vector3;
  hasLightning: boolean;
}

export const WEATHER_PRESETS: Record<WeatherType, WeatherConfig> = {
  day: {
    name: 'day',
    label: 'Día',
    icon: '☀️',
    skyColor: 0x38bdf8, // Vibrant clear sky blue
    fogColor: 0xbae6fd,
    fogDensity: 0.018, // Clean atmospheric fog
    ambientColor: 0xe0f2fe,
    ambientIntensity: 0.65,
    sunColor: 0xfffbeb,
    sunIntensity: 1.30,
    sunPos: new THREE.Vector3(15, 32, 15),
    hasRain: false,
    rainCount: 0,
    rainSpeed: 0,
    rainWind: new THREE.Vector3(0, 0, 0),
    hasLightning: false,
  },
  evening: {
    name: 'evening',
    label: 'Tarde / Atardecer',
    icon: '🌅',
    skyColor: 0xea580c, // Rich Sunset Orange
    fogColor: 0xfb923c,
    fogDensity: 0.022,
    ambientColor: 0xffedd5,
    ambientIntensity: 0.55,
    sunColor: 0xfdba74,
    sunIntensity: 1.10,
    sunPos: new THREE.Vector3(30, 8, 12), // Low sunset sun angle
    hasRain: false,
    rainCount: 0,
    rainSpeed: 0,
    rainWind: new THREE.Vector3(0, 0, 0),
    hasLightning: false,
  },
  night: {
    name: 'night',
    label: 'Noche',
    icon: '🌙',
    skyColor: 0x030712, // Deep midnight slate
    fogColor: 0x090d16,
    fogDensity: 0.025,
    ambientColor: 0x38bdf8,
    ambientIntensity: 0.35,
    sunColor: 0x7dd3fc,
    sunIntensity: 0.70,
    sunPos: new THREE.Vector3(-12, 28, -12),
    hasRain: false,
    rainCount: 0,
    rainSpeed: 0,
    rainWind: new THREE.Vector3(0, 0, 0),
    hasLightning: false,
  },
  rain: {
    name: 'rain',
    label: 'Lluvia',
    icon: '🌧️',
    skyColor: 0x334155, // Overcast slate
    fogColor: 0x475569,
    fogDensity: 0.028,
    ambientColor: 0xe2e8f0,
    ambientIntensity: 0.55,
    sunColor: 0xffffff,
    sunIntensity: 0.90,
    sunPos: new THREE.Vector3(10, 22, 10),
    hasRain: true,
    rainCount: 1200,
    rainSpeed: 28.0,
    rainWind: new THREE.Vector3(-1.5, 0, -1.0),
    hasLightning: false,
  },
  storm: {
    name: 'storm',
    label: 'Tormenta',
    icon: '⛈️',
    skyColor: 0x0f172a, // Dark stormy charcoal
    fogColor: 0x111827,
    fogDensity: 0.035,
    ambientColor: 0xcbd5e1,
    ambientIntensity: 0.45,
    sunColor: 0x94a3b8,
    sunIntensity: 0.80,
    sunPos: new THREE.Vector3(8, 18, 8),
    hasRain: true,
    rainCount: 1800,
    rainSpeed: 36.0,
    rainWind: new THREE.Vector3(-4.5, 0, -3.0),
    hasLightning: true,
  },
};

export class WeatherSystem {
  public currentWeather: WeatherType;
  private scene: THREE.Scene;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;

  // Fog & Sky target colors for smooth transitions
  private targetSkyColor: THREE.Color;
  private currentSkyColor: THREE.Color;
  private targetFogColor: THREE.Color;
  private currentFogColor: THREE.Color;
  private targetFogDensity: number = 0.01;
  private currentFogDensity: number = 0.01;

  // Target light values
  private targetAmbientColor: THREE.Color;
  private targetAmbientIntensity: number = 0.8;
  private targetSunColor: THREE.Color;
  private targetSunIntensity: number = 1.0;
  private targetSunPos: THREE.Vector3;

  // Optimized Instanced/LineSegments Rain Particles
  private rainMesh: THREE.LineSegments | null = null;
  private rainPositions: Float32Array | null = null;
  private rainVelocities: Float32Array | null = null;
  private maxRainCount: number = 2000;
  private activeRainCount: number = 0;
  private rainBoxRadius: number = 24.0;
  private rainBoxHeight: number = 18.0;

  // Ground splash particles
  private splashMesh: THREE.Points | null = null;
  private splashPositions: Float32Array | null = null;
  private splashAlphas: Float32Array | null = null;
  private maxSplashes: number = 200;
  private nextSplashIndex: number = 0;

  // Lightning state
  private lightningTimer: number = 0;
  private lightningDuration: number = 0;
  private isFlashing: boolean = false;
  private lightningCooldown: number = 5.0;

  // Audio rain ambient trigger tracker
  private rainSoundTimer: number = 0;

  constructor(
    scene: THREE.Scene,
    ambientLight: THREE.AmbientLight,
    directionalLight: THREE.DirectionalLight,
    initialWeather?: WeatherType
  ) {
    this.scene = scene;
    this.ambientLight = ambientLight;
    this.directionalLight = directionalLight;

    // Pick a random weather type if none specified!
    if (!initialWeather) {
      const weatherList: WeatherType[] = ['day', 'evening', 'night', 'rain', 'storm'];
      this.currentWeather = weatherList[Math.floor(Math.random() * weatherList.length)];
    } else {
      this.currentWeather = initialWeather;
    }

    const cfg = WEATHER_PRESETS[this.currentWeather];
    this.currentSkyColor = new THREE.Color(cfg.skyColor);
    this.targetSkyColor = new THREE.Color(cfg.skyColor);
    this.currentFogColor = new THREE.Color(cfg.fogColor);
    this.targetFogColor = new THREE.Color(cfg.fogColor);
    this.currentFogDensity = cfg.fogDensity;
    this.targetFogDensity = cfg.fogDensity;

    this.targetAmbientColor = new THREE.Color(cfg.ambientColor);
    this.targetAmbientIntensity = cfg.ambientIntensity;
    this.targetSunColor = new THREE.Color(cfg.sunColor);
    this.targetSunIntensity = cfg.sunIntensity;
    this.targetSunPos = cfg.sunPos.clone();

    // Configure Scene Fog
    this.scene.fog = new THREE.FogExp2(cfg.fogColor, cfg.fogDensity);
    this.scene.background = this.currentSkyColor;

    // Apply initial light states immediately
    this.ambientLight.color.copy(this.targetAmbientColor);
    this.ambientLight.intensity = this.targetAmbientIntensity;
    this.directionalLight.color.copy(this.targetSunColor);
    this.directionalLight.intensity = this.targetSunIntensity;
    this.directionalLight.position.copy(this.targetSunPos);

    // Initialize rain and splash geometry buffers
    this.initRainSystem();
    this.initSplashSystem();

    this.setWeather(this.currentWeather, true);
  }

  private initRainSystem() {
    const count = this.maxRainCount;
    // Each rain droplet is a 2-vertex line segment (head and tail)
    this.rainPositions = new Float32Array(count * 2 * 3);
    this.rainVelocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * this.rainBoxRadius * 2;
      const y = Math.random() * this.rainBoxHeight;
      const z = (Math.random() - 0.5) * this.rainBoxRadius * 2;

      // Vertex 0 (Head)
      this.rainPositions[i * 6] = x;
      this.rainPositions[i * 6 + 1] = y;
      this.rainPositions[i * 6 + 2] = z;

      // Vertex 1 (Tail - slightly above)
      this.rainPositions[i * 6 + 3] = x;
      this.rainPositions[i * 6 + 4] = y + 0.45;
      this.rainPositions[i * 6 + 5] = z;

      this.rainVelocities[i * 3] = 0;
      this.rainVelocities[i * 3 + 1] = -28.0;
      this.rainVelocities[i * 3 + 2] = 0;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));

    const mat = new THREE.LineBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.rainMesh = new THREE.LineSegments(geom, mat);
    this.rainMesh.name = 'WeatherRainMesh';
    this.rainMesh.frustumCulled = false;
    this.rainMesh.renderOrder = 999;
    this.rainMesh.visible = false;
    this.scene.add(this.rainMesh);
  }

  private initSplashSystem() {
    const count = this.maxSplashes;
    this.splashPositions = new Float32Array(count * 3);
    this.splashAlphas = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      this.splashPositions[i * 3] = 0;
      this.splashPositions[i * 3 + 1] = -100; // start hidden
      this.splashPositions[i * 3 + 2] = 0;
      this.splashAlphas[i] = 0;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(this.splashPositions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xbae6fd,
      size: 0.18,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.splashMesh = new THREE.Points(geom, mat);
    this.splashMesh.name = 'WeatherSplashMesh';
    this.splashMesh.frustumCulled = false;
    this.splashMesh.renderOrder = 998;
    this.splashMesh.visible = false;
    this.scene.add(this.splashMesh);
  }

  public setPreset(type: WeatherType) {
    this.setWeather(type, true);
  }

  public setWeather(type: WeatherType, immediate: boolean = false) {
    this.currentWeather = type;
    const cfg = WEATHER_PRESETS[type] || WEATHER_PRESETS.day;

    this.targetSkyColor.setHex(cfg.skyColor);
    this.targetFogColor.setHex(cfg.fogColor);
    this.targetFogDensity = cfg.fogDensity;

    this.targetAmbientColor.setHex(cfg.ambientColor);
    this.targetAmbientIntensity = cfg.ambientIntensity;
    this.targetSunColor.setHex(cfg.sunColor);
    this.targetSunIntensity = cfg.sunIntensity;
    this.targetSunPos.copy(cfg.sunPos);

    this.activeRainCount = cfg.hasRain ? cfg.rainCount : 0;
    if (this.rainMesh) {
      this.rainMesh.visible = cfg.hasRain;
    }
    if (this.splashMesh) {
      this.splashMesh.visible = cfg.hasRain;
    }

    if (cfg.hasLightning) {
      this.lightningCooldown = 2.5 + Math.random() * 3.5;
    }

    // Apply immediate update so the user feels the instant change
    this.currentSkyColor.copy(this.targetSkyColor);
    this.currentFogColor.copy(this.targetFogColor);
    this.currentFogDensity = this.targetFogDensity;

    if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(this.currentFogColor);
      this.scene.fog.density = this.currentFogDensity;
    }
    this.scene.background = this.currentSkyColor;

    this.ambientLight.color.copy(this.targetAmbientColor);
    this.ambientLight.intensity = this.targetAmbientIntensity;
    this.directionalLight.color.copy(this.targetSunColor);
    this.directionalLight.intensity = this.targetSunIntensity;
    this.directionalLight.position.copy(this.targetSunPos);
  }

  public cycleNextWeather(): WeatherType {
    const list: WeatherType[] = ['day', 'evening', 'night', 'rain', 'storm'];
    const idx = list.indexOf(this.currentWeather);
    const next = list[(idx + 1) % list.length];
    this.setWeather(next);
    return next;
  }

  public randomizeWeather(): WeatherType {
    const list: WeatherType[] = ['day', 'evening', 'night', 'rain', 'storm'];
    const available = list.filter((w) => w !== this.currentWeather);
    const next = available[Math.floor(Math.random() * available.length)];
    this.setWeather(next);
    return next;
  }

  public spawnSplash(x: number, y: number, z: number) {
    if (!this.splashPositions) return;
    const idx = this.nextSplashIndex;
    this.splashPositions[idx * 3] = x + (Math.random() - 0.5) * 0.2;
    this.splashPositions[idx * 3 + 1] = y + 0.04;
    this.splashPositions[idx * 3 + 2] = z + (Math.random() - 0.5) * 0.2;
    this.nextSplashIndex = (idx + 1) % this.maxSplashes;
  }

  public update(dt: number, cameraPos: THREE.Vector3) {
    const cfg = WEATHER_PRESETS[this.currentWeather];
    const lerpSpeed = Math.min(1.0, 3.0 * dt);

    // 1. Smooth Transitions for Sky, Fog, and Lighting
    this.currentSkyColor.lerp(this.targetSkyColor, lerpSpeed);
    this.currentFogColor.lerp(this.targetFogColor, lerpSpeed);
    this.currentFogDensity = THREE.MathUtils.lerp(this.currentFogDensity, this.targetFogDensity, lerpSpeed);

    if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(this.currentFogColor);
      this.scene.fog.density = this.currentFogDensity;
    }
    this.scene.background = this.currentSkyColor;

    this.ambientLight.color.lerp(this.targetAmbientColor, lerpSpeed);
    this.ambientLight.intensity = THREE.MathUtils.lerp(this.ambientLight.intensity, this.targetAmbientIntensity, lerpSpeed);

    this.directionalLight.color.lerp(this.targetSunColor, lerpSpeed);
    this.directionalLight.position.lerp(this.targetSunPos, lerpSpeed);

    // 2. Handle Storm Lightning Flashes
    if (cfg.hasLightning) {
      this.lightningCooldown -= dt;
      if (this.lightningCooldown <= 0 && !this.isFlashing) {
        // Trigger lightning strike!
        this.isFlashing = true;
        this.lightningDuration = 0.12 + Math.random() * 0.14;
        this.directionalLight.intensity = 0.0;
        this.ambientLight.intensity = 2.2;
        this.ambientLight.color.setHex(0xffffff);
        if (this.scene.background instanceof THREE.Color) {
          this.scene.background.setHex(0x93c5fd);
        }
        // Play dynamic synthesized thunder crack & rolling rumble!
        soundEngine.playThunder(0.95);
      }

      if (this.isFlashing) {
        this.lightningDuration -= dt;
        if (this.lightningDuration <= 0) {
          this.isFlashing = false;
          this.lightningCooldown = 3.5 + Math.random() * 6.5; // Next strike in 3.5-10s
          this.directionalLight.intensity = 0.0;
          this.ambientLight.intensity = this.targetAmbientIntensity;
          this.ambientLight.color.copy(this.targetAmbientColor);
        }
      } else {
        this.directionalLight.intensity = 0.0;
      }
    } else {
      this.directionalLight.intensity = 0.0;
    }

    // 3. Fast Rain Droplet Physics & Camera Centering
    if (cfg.hasRain && this.rainPositions && this.rainMesh && this.rainMesh.geometry) {
      const count = this.activeRainCount;
      const speed = cfg.rainSpeed;
      const windX = cfg.rainWind.x;
      const windZ = cfg.rainWind.z;
      const streakLen = 0.45;

      const posAttr = this.rainMesh.geometry.attributes.position as THREE.BufferAttribute;
      const arr = this.rainPositions;

      const halfBox = this.rainBoxRadius;
      const boxH = this.rainBoxHeight;

      for (let i = 0; i < count; i++) {
        const headIdx = i * 6;
        let hx = arr[headIdx];
        let hy = arr[headIdx + 1];
        let hz = arr[headIdx + 2];

        // Move droplet downward with wind
        hy -= speed * dt;
        hx += windX * dt;
        hz += windZ * dt;

        // Check ground hit
        if (hy <= 0.05) {
          // Spawn tiny splash at ground
          if (Math.random() < 0.15) {
            this.spawnSplash(hx, 0.01, hz);
          }
          // Respawn at top inside camera bounding cylinder
          hy = cameraPos.y + boxH * 0.7 + Math.random() * 4.0;
          hx = cameraPos.x + (Math.random() - 0.5) * halfBox * 2;
          hz = cameraPos.z + (Math.random() - 0.5) * halfBox * 2;
        }

        // Keep centered near camera horizontally
        if (hx < cameraPos.x - halfBox) hx += halfBox * 2;
        if (hx > cameraPos.x + halfBox) hx -= halfBox * 2;
        if (hz < cameraPos.z - halfBox) hz += halfBox * 2;
        if (hz > cameraPos.z + halfBox) hz -= halfBox * 2;

        // Set Head
        arr[headIdx] = hx;
        arr[headIdx + 1] = hy;
        arr[headIdx + 2] = hz;

        // Set Tail (pointing up and against wind)
        arr[headIdx + 3] = hx - windX * 0.015;
        arr[headIdx + 4] = hy + streakLen;
        arr[headIdx + 5] = hz - windZ * 0.015;
      }

      posAttr.needsUpdate = true;

      // Update splashes
      if (this.splashMesh && this.splashPositions && this.splashMesh.geometry) {
        const splashAttr = this.splashMesh.geometry.attributes.position as THREE.BufferAttribute;
        splashAttr.needsUpdate = true;
      }

      // Rain sound droplets trigger periodically
      this.rainSoundTimer -= dt;
      if (this.rainSoundTimer <= 0) {
        this.rainSoundTimer = 0.12 + Math.random() * 0.08;
        if (Math.random() < 0.3) {
          soundEngine.playRainDrop();
        }
      }
    }
  }

  public dispose() {
    if (this.rainMesh) {
      this.scene.remove(this.rainMesh);
      this.rainMesh.geometry.dispose();
      (this.rainMesh.material as THREE.Material).dispose();
      this.rainMesh = null;
    }
    if (this.splashMesh) {
      this.scene.remove(this.splashMesh);
      this.splashMesh.geometry.dispose();
      (this.splashMesh.material as THREE.Material).dispose();
      this.splashMesh = null;
    }
  }
}
