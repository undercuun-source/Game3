import React, { useEffect, useRef, useState } from 'react';
import { AnatomyInspector } from './AnatomyInspector';
import { QuickWeaponBar } from './QuickWeaponBar';
import { SpawnMenu } from './SpawnMenu';
import { TouchHUD } from './TouchHUD';
import { GAME_MAPS } from '../engine/maps';
import { PhysicsEngine } from '../engine/physicsEngine';
import { createArticulatedRagdoll } from '../engine/ragdollBuilder';
import { RagdollRenderer } from '../engine/renderer';
import { soundEngine } from '../engine/soundEngine';
import { PropType, RagdollType, Vector2, WeaponType } from '../types/physics';

export const GoreboxGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game Engine & Renderer References
  const engineRef = useRef<PhysicsEngine | null>(null);
  const rendererRef = useRef<RagdollRenderer | null>(null);

  // States
  const [currentMapId, setCurrentMapId] = useState<string>('lab');
  const [activeWeapon, setActiveWeapon] = useState<WeaponType>('physgun');
  const [isShooting, setIsShooting] = useState<boolean>(false);
  const [timeScale, setTimeScale] = useState<number>(1.0);
  const [gravityMult, setGravityMult] = useState<number>(1.0);
  const [goreLevel, setGoreLevel] = useState<'high' | 'normal' | 'low'>('high');
  const [xRayMode, setXRayMode] = useState<boolean>(false);
  const [immortalMode, setImmortalMode] = useState<boolean>(false);
  const [isSpawnMenuOpen, setIsSpawnMenuOpen] = useState<boolean>(false);
  const [isAnatomyOpen, setIsAnatomyOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Selected Ragdoll ID for Inspection / Control
  const [selectedRagdollId, setSelectedRagdollId] = useState<string | undefined>();
  const [selectedRagdollData, setSelectedRagdollData] = useState<any>(null);

  // Camera state
  const cameraRef = useRef<{ x: number; y: number; zoom: number }>({
    x: 1000,
    y: 900,
    zoom: 0.85,
  });

  // Controls & Inputs
  const leftJoystickRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isShootingRef = useRef<boolean>(false);
  const crosshairWorldPosRef = useRef<Vector2>({ x: 500, y: 700 });
  const activeWeaponRef = useRef<WeaponType>('physgun');
  activeWeaponRef.current = activeWeapon;

  // Direct touch dragging on canvas (for grabbing limbs directly)
  const touchDragRef = useRef<{
    active: boolean;
    touchId?: number;
    targetParticle?: any;
    targetProp?: any;
  }>({ active: false });

  // Initialize Engine
  useEffect(() => {
    const initialMap = GAME_MAPS[currentMapId] || GAME_MAPS.lab;
    const engine = new PhysicsEngine(initialMap);
    engineRef.current = engine;

    // Spawn initial player character
    const playerRagdoll = createArticulatedRagdoll('civilian', initialMap.spawnPoint.x, initialMap.spawnPoint.y);
    playerRagdoll.isControlled = true;
    engine.ragdolls.push(playerRagdoll);
    setSelectedRagdollId(playerRagdoll.id);

    // Spawn a couple initial testing props
    engine.spawnProp('wooden_box', initialMap.spawnPoint.x + 120, initialMap.spawnPoint.y);
    engine.spawnProp('explosive_barrel', initialMap.spawnPoint.x + 220, initialMap.spawnPoint.y);

    cameraRef.current.x = initialMap.spawnPoint.x;
    cameraRef.current.y = initialMap.spawnPoint.y - 100;

    return () => {
      engine.clearAll();
    };
  }, []);

  // Main Game Loop (60 FPS)
  useEffect(() => {
    let animationFrameId: number;
    let lastFrameTime = performance.now();

    const loop = () => {
      const currentTime = performance.now();
      const savedLimit = localStorage.getItem('gorebox_fps_limit') || '60';
      if (savedLimit !== 'unlimited') {
        const fpsLimitVal = parseInt(savedLimit) || 60;
        const fpsInterval = 1000 / fpsLimitVal;
        const elapsed = currentTime - lastFrameTime;
        if (elapsed < fpsInterval) {
          animationFrameId = requestAnimationFrame(loop);
          return;
        }
        lastFrameTime = currentTime - (elapsed % fpsInterval);
      }

      const engine = engineRef.current;
      const canvas = canvasRef.current;

      if (engine && canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (!rendererRef.current) {
            rendererRef.current = new RagdollRenderer(ctx);
          }

          // Camera smooth follow primary controlled ragdoll if present
          const mainRagdoll =
            engine.ragdolls.find((r) => r.isControlled) || engine.ragdolls[0];
          if (mainRagdoll && !touchDragRef.current.active) {
            const pechobase = mainRagdoll.particles.find((p) => p.name === 'pechobase');
            if (pechobase) {
              cameraRef.current.x += (pechobase.x - cameraRef.current.x) * 0.08;
              cameraRef.current.y += (pechobase.y - cameraRef.current.y) * 0.08;
            }
          }

          // Update physics
          engine.timeScale = timeScale;
          engine.gravityMultiplier = gravityMult;
          engine.goreLevel = goreLevel;
          engine.xRayMode = xRayMode;
          engine.immortalMode = immortalMode;

          engine.update(
            leftJoystickRef.current,
            { x: 0, y: 0 },
            isShootingRef.current,
            activeWeaponRef.current,
            crosshairWorldPosRef.current,
            selectedRagdollId
          );

          // Update selected ragdoll status data for UI Inspector
          if (isAnatomyOpen && selectedRagdollId) {
            const currentSelected = engine.ragdolls.find((r) => r.id === selectedRagdollId);
            if (currentSelected) {
              setSelectedRagdollData({ ...currentSelected });
            }
          }

          // Render scene
          rendererRef.current.render(
            engine,
            cameraRef.current,
            canvas.width,
            canvas.height,
            crosshairWorldPosRef.current,
            activeWeaponRef.current,
            isShootingRef.current,
            selectedRagdollId
          );
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    timeScale,
    gravityMult,
    goreLevel,
    xRayMode,
    immortalMode,
    isAnatomyOpen,
    selectedRagdollId,
  ]);

  // Handle Canvas Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Screen to World coordinate transformer
  const screenToWorld = (screenX: number, screenY: number): Vector2 => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const zoom = cameraRef.current.zoom;
    const worldX = (screenX - canvas.width / 2) / zoom + cameraRef.current.x;
    const worldY = (screenY - canvas.height / 2) / zoom + cameraRef.current.y;
    return { x: worldX, y: worldY };
  };

  // Canvas Touch & Pointer Event Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    crosshairWorldPosRef.current = worldPos;

    const engine = engineRef.current;
    if (!engine) return;

    // Check if clicked directly on a ragdoll particle to select or drag
    let clickedParticle = false;
    for (const ragdoll of engine.ragdolls) {
      for (const p of ragdoll.particles) {
        const dx = p.x - worldPos.x;
        const dy = p.y - worldPos.y;
        if (Math.sqrt(dx * dx + dy * dy) < p.radius + 15) {
          setSelectedRagdollId(ragdoll.id);
          touchDragRef.current = {
            active: true,
            touchId: e.pointerId,
            targetParticle: p,
          };
          clickedParticle = true;
          break;
        }
      }
      if (clickedParticle) break;
    }

    if (!clickedParticle) {
      // Check props
      for (const prop of engine.props) {
        if (prop.destroyed) continue;
        const hw = prop.width / 2;
        const hh = prop.height / 2;
        if (
          Math.abs(prop.x - worldPos.x) < hw + 10 &&
          Math.abs(prop.y - worldPos.y) < hh + 10
        ) {
          touchDragRef.current = {
            active: true,
            touchId: e.pointerId,
            targetProp: prop,
          };
          break;
        }
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    crosshairWorldPosRef.current = worldPos;

    if (touchDragRef.current.active) {
      if (touchDragRef.current.targetParticle) {
        const p = touchDragRef.current.targetParticle;
        p.x = worldPos.x;
        p.y = worldPos.y;
        p.oldX = worldPos.x;
        p.oldY = worldPos.y;
      } else if (touchDragRef.current.targetProp) {
        const prop = touchDragRef.current.targetProp;
        prop.x = worldPos.x;
        prop.y = worldPos.y;
        prop.vx = 0;
        prop.vy = 0;
      }
    }
  };

  const handlePointerUp = () => {
    touchDragRef.current = { active: false };
  };

  // Keyboard desktop fallback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        leftJoystickRef.current.x = -1;
      } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        leftJoystickRef.current.x = 1;
      } else if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp' || e.key === ' ') {
        leftJoystickRef.current.y = -1;
      } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
        leftJoystickRef.current.y = 1;
      } else if (e.key === 'q' || e.key === 'Q') {
        setIsSpawnMenuOpen((prev) => !prev);
      } else if (e.key === 'f' || e.key === 'F') {
        setTimeScale((prev) => (prev < 1.0 ? 1.0 : 0.2));
      } else if (e.key === 'x' || e.key === 'X') {
        setXRayMode((prev) => !prev);
      } else if (e.key === 'r' || e.key === 'R') {
        handleResetScene();
      } else if (e.key >= '1' && e.key <= '9') {
        const weapons: WeaponType[] = [
          'physgun',
          'pistol',
          'shotgun',
          'ak47',
          'sniper',
          'rpg',
          'katana',
          'sledgehammer',
          'grenade',
        ];
        const idx = parseInt(e.key) - 1;
        if (weapons[idx]) setActiveWeapon(weapons[idx]);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (
        e.key === 'a' ||
        e.key === 'A' ||
        e.key === 'd' ||
        e.key === 'D' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight'
      ) {
        leftJoystickRef.current.x = 0;
      }
      if (
        e.key === 'w' ||
        e.key === 'W' ||
        e.key === 's' ||
        e.key === 'S' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === ' '
      ) {
        leftJoystickRef.current.y = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Action Handlers
  const handleSpawnRagdoll = (type: RagdollType) => {
    const engine = engineRef.current;
    if (!engine) return;
    const spawnX = crosshairWorldPosRef.current.x || engine.map.spawnPoint.x;
    const spawnY = crosshairWorldPosRef.current.y || engine.map.spawnPoint.y;
    const newRagdoll = createArticulatedRagdoll(type, spawnX, spawnY);
    engine.ragdolls.push(newRagdoll);
    setSelectedRagdollId(newRagdoll.id);
  };

  const handleSpawnProp = (type: PropType) => {
    const engine = engineRef.current;
    if (!engine) return;
    const spawnX = crosshairWorldPosRef.current.x || engine.map.spawnPoint.x;
    const spawnY = crosshairWorldPosRef.current.y || engine.map.spawnPoint.y;
    engine.spawnProp(type, spawnX, spawnY);
  };

  const handleSelectMap = (mapId: string) => {
    const newMap = GAME_MAPS[mapId];
    if (!newMap || !engineRef.current) return;
    setCurrentMapId(mapId);
    engineRef.current.setMap(newMap);
    // Spawn fresh test ragdoll
    const ragdoll = createArticulatedRagdoll('civilian', newMap.spawnPoint.x, newMap.spawnPoint.y);
    engineRef.current.ragdolls = [ragdoll];
    setSelectedRagdollId(ragdoll.id);
    cameraRef.current.x = newMap.spawnPoint.x;
    cameraRef.current.y = newMap.spawnPoint.y - 100;
  };

  const handleResetScene = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.resetCurrentRagdolls(engine.map.spawnPoint.x, engine.map.spawnPoint.y);
    cameraRef.current.x = engine.map.spawnPoint.x;
    cameraRef.current.y = engine.map.spawnPoint.y - 100;
  };

  const handlePinTarget = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const crosshair = crosshairWorldPosRef.current;

    for (const r of engine.ragdolls) {
      for (const p of r.particles) {
        const dx = p.x - crosshair.x;
        const dy = p.y - crosshair.y;
        if (Math.sqrt(dx * dx + dy * dy) < p.radius + 15) {
          p.pinned = !p.pinned;
          soundEngine.playImpact(0.8);
          return;
        }
      }
    }
  };

  const handleCollapseRagdoll = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const controlled =
      engine.ragdolls.find((r) => r.id === selectedRagdollId) || engine.ragdolls[0];
    if (controlled) {
      controlled.isStanding = !controlled.isStanding;
      controlled.isStunned = !controlled.isStunned;
    }
  };

  const handleReviveAll = () => {
    const engine = engineRef.current;
    if (!engine) return;
    for (const r of engine.ragdolls) {
      r.isAlive = true;
      r.isStunned = false;
      r.isStanding = true;
      r.totalHealth = 100;
      r.stats = { brokenBones: 0, dismemberedLimbs: 0, bloodLossPercent: 0 };
      for (const p of r.particles) {
        p.health = p.maxHealth;
        p.fractured = false;
        p.bleedingRate = 0;
      }
    }
    soundEngine.playSyringeInject();
  };

  const handleShootStart = () => {
    setIsShooting(true);
    isShootingRef.current = true;
  };

  const handleShootEnd = () => {
    setIsShooting(false);
    isShootingRef.current = false;
  };

  return (
    <div
      id="gorebox-game-viewport"
      className="relative w-screen h-screen overflow-hidden bg-black select-none touch-none"
    >
      {/* 2D Physics Canvas */}
      <canvas
        id="gorebox-canvas"
        ref={canvasRef}
        className="w-full h-full block cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

      {/* Floating Quick Weapon Bar on Top-Center */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <QuickWeaponBar
          activeWeapon={activeWeapon}
          onSelectWeapon={(w) => setActiveWeapon(w)}
        />
      </div>

      {/* Android Touch HUD & Dual Joysticks */}
      <TouchHUD
        onMoveJoystick={(vec) => {
          leftJoystickRef.current = vec;
        }}
        onShootStart={handleShootStart}
        onShootEnd={handleShootEnd}
        isShooting={isShooting}
        activeWeapon={activeWeapon}
        onOpenSpawnMenu={() => setIsSpawnMenuOpen(true)}
        onToggleAnatomy={() => setIsAnatomyOpen((prev) => !prev)}
        isAnatomyOpen={isAnatomyOpen}
        timeScale={timeScale}
        onToggleSlowMo={() => setTimeScale((prev) => (prev < 1.0 ? 1.0 : 0.2))}
        onJump={() => {
          leftJoystickRef.current.y = -1;
          setTimeout(() => {
            leftJoystickRef.current.y = 0;
          }, 250);
        }}
        onCollapseRagdoll={handleCollapseRagdoll}
        onResetScene={handleResetScene}
        onPinTarget={handlePinTarget}
        onZoomIn={() => {
          cameraRef.current.zoom = Math.min(1.8, cameraRef.current.zoom + 0.15);
        }}
        onZoomOut={() => {
          cameraRef.current.zoom = Math.max(0.4, cameraRef.current.zoom - 0.15);
        }}
        onResetCamera={() => {
          cameraRef.current.zoom = 0.85;
          const engine = engineRef.current;
          if (engine) {
            cameraRef.current.x = engine.map.spawnPoint.x;
            cameraRef.current.y = engine.map.spawnPoint.y - 100;
          }
        }}
        isMuted={isMuted}
        onToggleMute={() => {
          const nextMute = !isMuted;
          setIsMuted(nextMute);
          soundEngine.setMuted(nextMute);
        }}
        xRayMode={xRayMode}
        onToggleXRay={() => setXRayMode((prev) => !prev)}
      />

      {/* Anatomy Real-time Inspector */}
      {isAnatomyOpen && selectedRagdollData && (
        <AnatomyInspector
          ragdoll={selectedRagdollData}
          onClose={() => setIsAnatomyOpen(false)}
        />
      )}

      {/* Spawn & Sandbox Menu Modal */}
      <SpawnMenu
        isOpen={isSpawnMenuOpen}
        onClose={() => setIsSpawnMenuOpen(false)}
        onSpawnRagdoll={handleSpawnRagdoll}
        onSelectWeapon={(w) => setActiveWeapon(w)}
        onSpawnProp={handleSpawnProp}
        onSelectMap={handleSelectMap}
        currentMapId={currentMapId}
        activeWeapon={activeWeapon}
        timeScale={timeScale}
        onSetTimeScale={setTimeScale}
        gravityMult={gravityMult}
        onSetGravityMult={setGravityMult}
        goreLevel={goreLevel}
        onSetGoreLevel={setGoreLevel}
        xRayMode={xRayMode}
        onToggleXRay={() => setXRayMode((prev) => !prev)}
        immortalMode={immortalMode}
        onToggleImmortal={() => setImmortalMode((prev) => !prev)}
        onClearBlood={() => engineRef.current?.clearBlood()}
        onClearAll={() => engineRef.current?.clearAll()}
        onReviveAll={handleReviveAll}
      />
    </div>
  );
};
