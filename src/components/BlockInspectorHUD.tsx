import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Box, Shield, Cpu, Scale, Activity, Flame } from 'lucide-react';
import { getBlockStateInfo } from '../engine/electroCubeEngine';
import { InspectedBlockInfo } from '../types/physics3d';

interface BlockInspectorHUDProps {
  info: InspectedBlockInfo | null;
  cameraRef?: React.RefObject<THREE.Camera | null> | React.MutableRefObject<THREE.Camera | null>;
  camera?: THREE.Camera | null;
}

const getBlockDisplayName = (name: string): string => {
  const norm = name.toLowerCase().replace('block_', '');
  switch (norm) {
    case 'slime': return 'Bloque de Slime';
    case 'skin': return 'Bloque de Piel (Flesh)';
    case 'stone': return 'Bloque de Piedra';
    case 'wood': return 'Bloque de Madera';
    case 'metal': return 'Bloque de Metal';
    case 'brick': return 'Bloque de Ladrillo';
    case 'dirt': return 'Bloque de Tierra';
    case 'sand': return 'Bloque de Arena';
    case 'glass': return 'Bloque de Vidrio';
    default:
      return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }
};

const getBlockSubtype = (name: string): string => {
  const norm = name.toLowerCase().replace('block_', '');
  switch (norm) {
    case 'slime': return 'MATERIAL JELLY VISCO-ELÁSTICO';
    case 'skin': return 'MATERIAL ORGÁNICO DÉRMICO';
    case 'stone': return 'COMPOSICIÓN MINERAL SÓLIDA';
    case 'wood': return 'COMPUESTO LIGNOCELULÓSICO';
    case 'metal': return 'ESTRUCTURA METÁLICA CRISTALINA';
    case 'brick': return 'CERÁMICO INDUSTRIAL REFORZADO';
    case 'glass': return 'RED SÍLICE AMORFA';
    default:
      return 'PROPIEDADES FÍSICAS REVOLUCIONARIAS';
  }
};

export const BlockInspectorHUD: React.FC<BlockInspectorHUDProps> = ({ info, cameraRef, camera: cameraProp }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tempVec3 = useRef(new THREE.Vector3());

  useEffect(() => {
    let animId: number;

    const updatePosition = () => {
      const camera = cameraProp || (cameraRef && 'current' in cameraRef ? cameraRef.current : null);
      const el = containerRef.current;

      if (!info || info.timeRemaining <= 0 || !el) {
        if (el) {
          el.style.opacity = '0';
          el.style.display = 'none';
        }
        animId = requestAnimationFrame(updatePosition);
        return;
      }

      if (!camera || info.x === undefined || info.y === undefined || info.z === undefined) {
        // Fallback to top-center if 3D coordinates aren't provided
        el.style.display = 'flex';
        el.style.transform = 'translate(-50%, 0)';
        el.style.left = '50%';
        el.style.top = '80px';
        el.style.opacity = '1';
        animId = requestAnimationFrame(updatePosition);
        return;
      }

      const halfW = window.innerWidth * 0.5;
      const halfH = window.innerHeight * 0.5;

      // Position bubble chat slightly above the top face of the block in world space
      tempVec3.current.set(info.x, info.y + 0.70, info.z);

      const distanceToCam = camera.position.distanceTo(tempVec3.current);

      // Project world position into NDC (-1 to +1)
      tempVec3.current.project(camera);

      // Check if behind camera or too far away
      const isBehind = tempVec3.current.z > 1.0;
      const isTooFar = distanceToCam > 60;

      if (isBehind || isTooFar) {
        el.style.opacity = '0';
        el.style.display = 'none';
        animId = requestAnimationFrame(updatePosition);
        return;
      }

      const screenX = tempVec3.current.x * halfW + halfW;
      const screenY = -tempVec3.current.y * halfH + halfH;

      // Scale perspective based on camera distance
      const scaleFactor = Math.max(0.72, Math.min(1.15, 12 / Math.max(3, distanceToCam)));

      el.style.display = 'flex';
      el.style.left = '0px';
      el.style.top = '0px';
      el.style.transform = `translate3d(${screenX}px, ${screenY}px, 0) translate(-50%, -100%) scale(${scaleFactor})`;
      el.style.opacity = '1';

      animId = requestAnimationFrame(updatePosition);
    };

    animId = requestAnimationFrame(updatePosition);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [info, cameraProp, cameraRef]);

  if (!info || info.timeRemaining <= 0) return null;

  const progressPercent = Math.min(100, Math.max(0, (info.timeRemaining / 5.0) * 100));

  const renderStatBar = (label: string, value: number, colorClass: string, iconNode: React.ReactNode) => {
    const rounded = Math.min(100, Math.max(0, Math.round(value)));
    return (
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-zinc-400 font-medium flex items-center gap-1.5">
            <span className="text-zinc-500">{iconNode}</span>
            <span>{label}</span>
          </span>
          <span className="font-semibold text-zinc-200 font-mono">{rounded}%</span>
        </div>
        <div className="w-full bg-zinc-900/80 h-1 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-200 ${colorClass}`}
            style={{ width: `${rounded}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        willChange: 'transform, opacity',
        transformOrigin: 'bottom center',
        transition: 'opacity 0.15s ease-out',
      }}
      className="pointer-events-none select-none z-40 font-sans"
    >
      {/* 3D Bubble Container (Premium Dark Luxury Obsidian Card) */}
      <div className="relative bg-zinc-950/95 text-zinc-100 border border-zinc-800/85 rounded-xl shadow-2xl backdrop-blur-md p-4 w-[270px] sm:w-[300px] flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Bar with Countdown */}
        <div className="flex items-start justify-between border-b border-zinc-800/60 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300">
              <Box className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-semibold text-zinc-500 tracking-wider">
                {getBlockSubtype(info.name)}
              </span>
              <h3 className="text-sm font-bold text-zinc-100 truncate max-w-[155px]">
                {getBlockDisplayName(info.name)}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" />
            <span>{info.timeRemaining.toFixed(1)}s</span>
          </div>
        </div>

        {/* Minimalist Progress Bar */}
        <div className="w-full bg-zinc-900 h-0.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-zinc-300 transition-all duration-100 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Material Properties Grid */}
        <div className="flex flex-col gap-2.5 pt-1">
          {(() => {
            const stateInfo = getBlockStateInfo(info.blockState ?? 100);
            return (
              <div className="flex flex-col gap-1 p-2 rounded-lg bg-zinc-900/90 border border-zinc-800">
                <div className="flex justify-between items-center text-[11px] font-bold" style={{ color: stateInfo.color }}>
                  <span>{stateInfo.badge}</span>
                  <span className="font-mono">{stateInfo.percent}%</span>
                </div>
                <p className="text-[9px] text-zinc-400 leading-tight mt-0.5">{stateInfo.description}</p>
                {stateInfo.visualEffect && (
                  <div className="text-[8.5px] font-semibold text-cyan-300 mt-1 pt-1 border-t border-zinc-800/60 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stateInfo.color }} />
                    <span>Efecto: {stateInfo.visualEffect}</span>
                  </div>
                )}
              </div>
            );
          })()}
          {renderStatBar('Resistencia Impacto', info.resistance, 'bg-rose-500', <Shield className="w-3.5 h-3.5" />)}
          {renderStatBar('Estado / Propiedad', info.blockState ?? 100, 'bg-sky-500', <Cpu className="w-3.5 h-3.5" />)}
          {renderStatBar('Masa / Densidad', info.density, 'bg-violet-500', <Scale className="w-3.5 h-3.5" />)}
          {renderStatBar('Elasticidad / Rebote', info.elasticity, 'bg-emerald-500', <Activity className="w-3.5 h-3.5" />)}
          {renderStatBar('Integridad / Salud', info.health, 'bg-red-500', <Flame className="w-3.5 h-3.5" />)}
        </div>

        {/* Speech Bubble Pointer Tail pointing down at the top of the voxel block */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-zinc-950 border-r border-b border-zinc-800/85 rotate-45" />
      </div>
    </div>
  );
};
