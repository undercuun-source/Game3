import React, { useEffect, useRef, useState } from 'react';

interface VirtualJoystickProps {
  onMove: (vector: { x: number; y: number }) => void;
  size?: number;
  label?: string;
  className?: string;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  onMove,
  size = 130,
  label = 'MOVIMIENTO',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchPos, setTouchPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [active, setActive] = useState<boolean>(false);
  const touchIdRef = useRef<number | null>(null);

  const radius = size / 2;
  const stickRadius = size * 0.28;

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + radius;
    const centerY = rect.top + radius;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      const touch = e.touches[0];
      touchIdRef.current = touch.identifier;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    updatePosition(clientX - centerX, clientY - centerY);
    setActive(true);
  };

  const updatePosition = (dx: number, dy: number) => {
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = radius - stickRadius;

    let clampedX = dx;
    let clampedY = dy;

    if (dist > maxDist) {
      clampedX = (dx / dist) * maxDist;
      clampedY = (dy / dist) * maxDist;
    }

    setTouchPos({ x: clampedX, y: clampedY });

    // Normalize output (-1 to 1) with small deadzone
    const normX = clampedX / maxDist;
    const normY = clampedY / maxDist;
    const deadzone = 0.08;

    const finalX = Math.abs(normX) > deadzone ? normX : 0;
    const finalY = Math.abs(normY) > deadzone ? normY : 0;

    onMove({ x: finalX, y: finalY });
  };

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!active || !containerRef.current) return;
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        if (touch.identifier === touchIdRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const centerX = rect.left + radius;
          const centerY = rect.top + radius;
          updatePosition(touch.clientX - centerX, touch.clientY - centerY);
          break;
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!active || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + radius;
      const centerY = rect.top + radius;
      updatePosition(e.clientX - centerX, e.clientY - centerY);
    };

    const handleEnd = () => {
      if (!active) return;
      setActive(false);
      touchIdRef.current = null;
      setTouchPos({ x: 0, y: 0 });
      onMove({ x: 0, y: 0 });
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
    };
  }, [active]);

  return (
    <div
      id="virtual-joystick-container"
      ref={containerRef}
      className={`relative select-none touch-none ${className}`}
      style={{ width: size, height: size }}
      onTouchStart={handleTouchStart}
      onMouseDown={handleTouchStart}
    >
      {/* Outer base ring */}
      <div
        className={`w-full h-full rounded-full border-2 transition-colors flex items-center justify-center ${
          active
            ? 'bg-black/60 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
            : 'bg-black/40 border-white/20'
        } backdrop-blur-sm`}
      >
        {/* Direction indicators */}
        <div className="absolute top-2 w-1.5 h-1.5 rounded-full bg-white/30" />
        <div className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-white/30" />
        <div className="absolute left-2 w-1.5 h-1.5 rounded-full bg-white/30" />
        <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white/30" />

        <span className="text-[9px] font-bold tracking-widest text-white/40 uppercase pointer-events-none">
          {label}
        </span>
      </div>

      {/* Inner thumb stick */}
      <div
        className={`absolute rounded-full pointer-events-none transition-transform ${
          active
            ? 'bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_12px_rgba(6,182,212,0.8)] border border-cyan-200'
            : 'bg-gradient-to-br from-slate-600 to-slate-800 border border-white/20'
        }`}
        style={{
          width: stickRadius * 2,
          height: stickRadius * 2,
          top: radius - stickRadius,
          left: radius - stickRadius,
          transform: `translate(${touchPos.x}px, ${touchPos.y}px)`,
        }}
      />
    </div>
  );
};
