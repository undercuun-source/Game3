import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OverheadBubble } from '../types/chat';

interface OverheadChatBubblesProps {
  bubbles: OverheadBubble[];
  camera?: THREE.Camera | null;
  cameraRef?: React.RefObject<THREE.Camera | null> | React.MutableRefObject<THREE.Camera | null>;
  getSpeakerPosition?: (bubble: OverheadBubble) => THREE.Vector3 | null;
  getSpeakerWorldPosition?: (bubble: OverheadBubble) => THREE.Vector3 | null;
}

export const OverheadChatBubbles: React.FC<OverheadChatBubblesProps> = ({
  bubbles,
  camera: cameraProp,
  cameraRef,
  getSpeakerPosition,
  getSpeakerWorldPosition,
}) => {
  const elementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const tempVec3 = useRef(new THREE.Vector3());

  const getPositionFn = getSpeakerPosition || getSpeakerWorldPosition;

  useEffect(() => {
    let animId: number;

    const updateBubblePositions = () => {
      const camera = cameraProp || (cameraRef && 'current' in cameraRef ? cameraRef.current : null);
      if (!camera) {
        animId = requestAnimationFrame(updateBubblePositions);
        return;
      }

      const halfW = window.innerWidth * 0.5;
      const halfH = window.innerHeight * 0.5;

      bubbles.forEach((bubble) => {
        const el = elementsRef.current?.get(bubble.id);
        if (!el) return;

        const worldPos = getPositionFn ? getPositionFn(bubble) : null;
        if (!worldPos) {
          el.style.opacity = '0';
          el.style.display = 'none';
          return;
        }

        // Copy position and project to 2D screen space
        tempVec3.current.copy(worldPos);
        const distanceToCam = camera.position.distanceTo(tempVec3.current);

        // Project into NDC (-1 to +1)
        tempVec3.current.project(camera);

        // Behind camera check or too far away
        const isBehind = tempVec3.current.z > 1.0;
        const isTooFar = distanceToCam > 75;

        if (isBehind || isTooFar) {
          el.style.opacity = '0';
          el.style.display = 'none';
          return;
        }

        const screenX = tempVec3.current.x * halfW + halfW;
        const screenY = -tempVec3.current.y * halfH + halfH;

        // Dynamic perspective scaling (closer = slightly larger, far = compact)
        const scaleFactor = Math.max(0.68, Math.min(1.15, 12 / Math.max(3, distanceToCam)));

        el.style.display = 'flex';
        el.style.transform = `translate3d(${screenX}px, ${screenY}px, 0) translate(-50%, -100%) scale(${scaleFactor})`;
        el.style.opacity = '1';
      });

      animId = requestAnimationFrame(updateBubblePositions);
    };

    animId = requestAnimationFrame(updateBubblePositions);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [bubbles, cameraProp, cameraRef, getPositionFn]);

  if (bubbles.length === 0) return null;

  return (
    <div
      id="overhead-chat-container"
      className="absolute inset-0 pointer-events-none z-40 overflow-hidden select-none"
    >
      {bubbles.map((b) => {
        const isPlayer = b.speakerType === 'player';
        const isRagdoll = b.speakerType === 'ragdoll';
        const isRemote = b.speakerType === 'remote';

        // Styling themes based on speaker
        const borderColor = isPlayer
          ? 'border-cyan-400/70 shadow-cyan-500/30'
          : isRagdoll
          ? 'border-amber-400/80 shadow-amber-500/30'
          : isRemote
          ? 'border-emerald-400/80 shadow-emerald-500/30'
          : 'border-purple-400/80 shadow-purple-500/30';

        const badgeBg = isPlayer
          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
          : isRagdoll
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          : isRemote
          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
          : 'bg-purple-500/20 text-purple-300 border-purple-500/40';

        const speakerIcon = isPlayer
          ? '👤'
          : isRagdoll
          ? '🤖'
          : isRemote
          ? '🌐'
          : '💬';

        return (
          <div
            key={b.id}
            ref={(el) => {
              if (el) elementsRef.current.set(b.id, el);
              else elementsRef.current.delete(b.id);
            }}
            id={`overhead-bubble-${b.id}`}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              willChange: 'transform, opacity',
              transformOrigin: 'bottom center',
              transition: 'opacity 0.2s ease',
            }}
            className="flex flex-col items-center pointer-events-none -translate-y-2"
          >
            {/* The Speech Bubble Body */}
            <div
              className={`relative bg-slate-950/95 text-white border ${borderColor} px-3.5 py-2 rounded-2xl shadow-2xl backdrop-blur-md max-w-xs text-center flex flex-col gap-1 min-w-[130px]`}
            >
              {/* Top Tag with speaker name */}
              <div className="flex items-center justify-center gap-1">
                <span className={`text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full border ${badgeBg}`}>
                  {speakerIcon} {b.speakerName}
                </span>
              </div>

              {/* Chat Text Message */}
              <span className="text-xs sm:text-[13px] font-bold leading-snug font-sans text-slate-100 break-words px-0.5">
                {b.text}
              </span>

              {/* Speech pointer tail at the bottom pointing to the head */}
              <div
                className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-950 border-r border-b ${borderColor} rotate-45`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
