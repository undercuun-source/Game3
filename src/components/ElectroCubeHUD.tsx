import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Shield, X, Layers } from 'lucide-react';
import { ElectroCube3D } from '../types/physics3d';
import { getBlockStateInfo } from '../engine/electroCubeEngine';

interface ElectroCubeHUDProps {
  cube: ElectroCube3D | null;
  cameraRef?: React.RefObject<THREE.Camera | null> | React.MutableRefObject<THREE.Camera | null>;
  camera?: THREE.Camera | null;
  onBlockStateChange: (val: number) => void;
  onHardnessChange?: (val: number) => void;
  onViscosityChange?: (val: number) => void;
  onElectronegativityChange?: (val: number) => void;
  onClose?: () => void;
}

export const ElectroCubeHUD: React.FC<ElectroCubeHUDProps> = ({
  cube,
  cameraRef,
  camera: cameraProp,
  onBlockStateChange,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tempVec3 = useRef(new THREE.Vector3());

  useEffect(() => {
    let animId: number;

    const updatePosition = () => {
      const camera = cameraProp || (cameraRef && 'current' in cameraRef ? cameraRef.current : null);
      const el = containerRef.current;

      if (!cube || !el || cube.isDestroyed) {
        if (el) {
          el.style.opacity = '0';
          el.style.display = 'none';
        }
        animId = requestAnimationFrame(updatePosition);
        return;
      }

      if (!camera) {
        el.style.display = 'flex';
        el.style.transform = 'translate(-50%, 0)';
        el.style.left = '50%';
        el.style.top = '75px';
        el.style.opacity = '1';
        animId = requestAnimationFrame(updatePosition);
        return;
      }

      const halfW = window.innerWidth * 0.5;
      const halfH = window.innerHeight * 0.5;

      if (cube.groupMesh) {
        tempVec3.current.copy(cube.groupMesh.position);
        tempVec3.current.y += (cube.size * 0.55) * cube.groupMesh.scale.y + 0.25;
      } else {
        tempVec3.current.set(cube.x, cube.y + cube.size * 0.55 + 0.25, cube.z);
      }

      const distanceToCam = camera.position.distanceTo(tempVec3.current);

      tempVec3.current.project(camera);

      const isBehind = tempVec3.current.z > 1.0;
      const isTooFar = distanceToCam > 50;

      if (isBehind || isTooFar) {
        el.style.opacity = '0';
        el.style.display = 'none';
        animId = requestAnimationFrame(updatePosition);
        return;
      }

      const screenX = tempVec3.current.x * halfW + halfW;
      const screenY = -tempVec3.current.y * halfH + halfH;

      const scaleFactor = Math.max(0.75, Math.min(1.0, 10 / Math.max(3, distanceToCam)));

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
  }, [cube, cameraProp, cameraRef]);

  if (!cube || cube.isDestroyed) return null;

  const blockState = Math.round(cube.blockState ?? cube.hardness ?? 100);
  const info = getBlockStateInfo(blockState);

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
      className="pointer-events-auto select-none z-40 font-sans"
    >
      {/* Frutiger Aero Sleek HUD */}
      <div className="relative bg-slate-950/95 text-slate-100 border border-cyan-500/60 rounded-2xl shadow-2xl backdrop-blur-md p-3.5 w-[250px] flex flex-col gap-2.5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-black text-cyan-300 tracking-wide">
              Propiedad del Bloque
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-red-400 transition-colors"
              title="Cerrar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* State Badge */}
        <div 
          className="px-2.5 py-1.5 rounded-xl border text-xs font-black flex items-center justify-between shadow-inner"
          style={{
            backgroundColor: `${info.color}15`,
            borderColor: `${info.color}60`,
            color: info.color,
          }}
        >
          <span>{info.badge}</span>
          <span className="font-mono text-[11px] font-bold">{blockState}%</span>
        </div>

        {/* State Description & Visual Effect Cue */}
        <div className="flex flex-col gap-1 px-0.5">
          <p className="text-[10px] font-medium text-slate-300 leading-tight">
            {info.description}
          </p>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[9px] text-cyan-200 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: info.color }} />
            <span className="truncate">Efecto Visual: {info.visualEffect}</span>
          </div>
        </div>

        {/* Hardness Spectrum Meter (Visual Gradient from Liquid to Hard Solid) */}
        <div className="flex flex-col gap-1 pt-1">
          <div className="flex justify-between items-center text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
            <span className="text-pink-400 flex items-center gap-0.5">💨 Gas</span>
            <span className="text-cyan-400 flex items-center gap-0.5">🌊 Líquido</span>
            <span className="text-amber-400 flex items-center gap-0.5">🧱 Masa</span>
            <span className="text-emerald-400 flex items-center gap-0.5">🛡️ Duro</span>
          </div>
          <div className="relative w-full h-2.5 rounded-full overflow-hidden bg-slate-900 p-0.5 border border-slate-800">
            {/* Gradient background */}
            <div className="w-full h-full rounded-full bg-gradient-to-r from-pink-500 via-cyan-400 via-amber-400 to-emerald-400 opacity-80" />
            {/* Position Marker */}
            <div
              className="absolute top-0 bottom-0 w-2.5 bg-white border-2 border-slate-950 rounded-full shadow-lg transform -translate-x-1/2 transition-all duration-75"
              style={{ left: `${Math.max(3, Math.min(97, blockState))}%` }}
            />
          </div>
        </div>

        {/* Single Estado Slider (1% - 100%) */}
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-300">
            <span className="flex items-center gap-1 text-cyan-300">
              <Shield className="w-3 h-3 text-cyan-400" />
              <span>Dureza / Estado Físico</span>
            </span>
            <span className="font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded-lg border border-cyan-500/40 text-[10px]">
              {blockState}%
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={blockState}
            onChange={(e) => onBlockStateChange(parseInt(e.target.value))}
            className="w-full h-2.5 accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Pointer Tail */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-950 border-r border-b border-cyan-500/60 rotate-45" />
      </div>
    </div>
  );
};
