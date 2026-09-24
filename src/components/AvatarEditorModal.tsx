import React, { useState } from 'react';
import {
  Shirt,
  Sparkles,
  X,
  Palette,
  Eye,
  User,
  Sliders,
  Check,
  Layers,
  Flame,
  Droplets,
  RotateCw,
  Camera,
  Heart,
  Smile,
  Maximize2,
  Globe,
} from 'lucide-react';
import { FaceFeatureMode } from '../types/physics3d';

export const MuscleIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4C10 4 8.5 5.5 8 7C6.5 7.2 5 8.5 5 10.5C5 12 6 13 7.5 13.5L8.5 18C8.8 19.5 10 20.5 11.5 20.5H16.5C18 20.5 19.2 19.3 19.5 17.8L20 15C20.5 12 18.5 9 15.5 8.5C14.5 8.3 13.5 7 13 5.5C12.8 4.6 12.5 4 12 4Z" fill="currentColor" fillOpacity="0.3" />
    <path d="M11 8.5C12.5 8.5 14 9.5 14.5 11" />
    <path d="M7.5 13.5C8.5 14.5 10 15 12 15" />
  </svg>
);

interface AvatarEditorModalProps {
  isOpen: boolean;
  onClose: () => void;

  // 3D In-Frame Camera Angle Controls
  previewAngle?: 'front' | 'side' | 'back' | 'face';
  onSetPreviewAngle?: (angle: 'front' | 'side' | 'back' | 'face') => void;
  previewDistance?: number;
  onSetPreviewDistance?: (dist: number) => void;

  // In-game camera controls for focusing character in the live game
  onRotateCameraToFront?: () => void;
  onRotateCameraToBack?: () => void;
  onRotateCameraToSide?: () => void;
  onFocusCameraOnPlayer?: () => void;

  // Fluid & Erection triggers
  isFluidEmitting?: boolean;
  onTogglePlayerFluidEmission?: () => void;
  onTriggerPlayerFluidBurst?: () => void;
  onTriggerErection?: () => void;

  // Face & 3D Eyes props
  faceFeatureMode?: FaceFeatureMode;
  faceFloatDepth?: number;
  eyeHolesEnabled?: boolean;
  onFaceFeatureModeChange?: (mode: FaceFeatureMode) => void;
  onFaceFloatDepthChange?: (depth: number) => void;
  onToggleEyeHoles?: (enabled: boolean) => void;

  // Shirt props
  hasShirt: boolean;
  shirtColorHex: number;
  onToggleShirt: (enabled: boolean) => void;
  onShirtColorChange: (color: number) => void;

  // Pants props
  hasPants?: boolean;
  pantsColorHex: number;
  onTogglePants?: (enabled: boolean) => void;
  onPantsColorChange: (color: number) => void;

  // Underwear props
  hasUnderwear?: boolean;
  underwearColorHex?: number;
  onToggleUnderwear?: (enabled: boolean) => void;
  onUnderwearColorChange?: (color: number) => void;

  // Gloves props
  hasGloves?: boolean;
  glovesColorHex?: number;
  onToggleGloves?: (enabled: boolean) => void;
  onGlovesColorChange?: (color: number) => void;

  // Boots props
  hasBoots?: boolean;
  bootsColorHex?: number;
  onToggleBoots?: (enabled: boolean) => void;
  onBootsColorChange?: (color: number) => void;

  // Socks props
  hasSocks?: boolean;
  socksColorHex?: number;
  onToggleSocks?: (enabled: boolean) => void;
  onSocksColorChange?: (color: number) => void;

  // Skin props
  skinColorHex: number;
  onSkinColorChange: (color: number) => void;

  // Joint / Contour style
  contourJointStyle: 'pseudo3d' | 'blocky' | 'cylinder';
  contourLevel: number;
  contourEnabled: boolean;
  onContourJointStyleChange: (style: 'pseudo3d' | 'blocky' | 'cylinder') => void;
  onContourLevelChange: (level: number) => void;
  onToggleContour: (enabled: boolean) => void;

  // Anatomy props
  hasBustAndGlutes: boolean;
  onToggleBustAndGlutes: (enabled: boolean) => void;
  genitalType?: 'none' | 'male' | 'female';
  onGenitalTypeChange?: (type: 'none' | 'male' | 'female') => void;
  genitalMShaftLength?: number;
  onGenitalMShaftLengthChange?: (val: number) => void;
  genitalMShaftThickness?: number;
  onGenitalMShaftThicknessChange?: (val: number) => void;
  genitalMPinkSize?: number;
  onGenitalMPinkSizeChange?: (val: number) => void;
  genitalFSize?: number;
  onGenitalFSizeChange?: (val: number) => void;

  // Density props
  voxelDensity?: number;
  onVoxelDensityChange?: (val: number) => void;
  voxelShape?: 'cube' | 'sphere';
  onVoxelShapeChange?: (shape: 'cube' | 'sphere') => void;
  onSpawnPaloRod?: () => void;

  // Hair & Accessories props
  hairType?: string;
  hairColorHex?: number;
  onHairTypeChange?: (type: string) => void;
  onHairColorChange?: (color: number) => void;
  beardType?: string;
  beardColorHex?: number;
  onBeardTypeChange?: (type: string) => void;
  onBeardColorChange?: (color: number) => void;
  hatType?: string;
  hatColorHex?: number;
  onHatTypeChange?: (type: string) => void;
  onHatColorChange?: (color: number) => void;
  glassesType?: string;
  glassesColorHex?: number;
  onGlassesTypeChange?: (type: string) => void;
  onGlassesColorChange?: (color: number) => void;

  // Pubic hair options
  pubicHairEnabled?: boolean;
  onPubicHairEnabledChange?: (enabled: boolean) => void;
  pubicHairIntensity?: number;
  onPubicHairIntensityChange?: (val: number) => void;

  // Cubicity & Limb size props
  bodyCubicity?: number;
  onBodyCubicityChange?: (val: number) => void;
  limbSizeMultiplier?: number;
  onLimbSizeMultiplierChange?: (val: number) => void;

  onOpenMainMenu?: () => void;
  onUpdateSpecificLimbWidth?: (partName: string, mult: number) => void;
  limbScreenPositions?: Record<string, { top: string; left: string }>;
  onToggleMuscleOverlay?: (active: boolean) => void;
}

const SKIN_PALETTE = [
  { name: 'Pálido', hex: 0xfde2d9 },
  { name: 'Claro', hex: 0xfbcfe8 },
  { name: 'Melocotón', hex: 0xf5d0b5 },
  { name: 'Bronceado', hex: 0xd4a373 },
  { name: 'Moreno', hex: 0x9c6644 },
  { name: 'Oscuro', hex: 0x582f0e },
  { name: 'Anime Pink', hex: 0xf472b6 },
  { name: 'Neón Cyan', hex: 0x38bdf8 },
  { name: 'Oro', hex: 0xfbbf24 },
  { name: 'Esmeralda', hex: 0x34d399 },
];

const CLOTHING_PALETTE = [
  { name: 'Blanco', hex: 0xffffff },
  { name: 'Negro', hex: 0x111827 },
  { name: 'Rojo', hex: 0xef4444 },
  { name: 'Azul', hex: 0x3b82f6 },
  { name: 'Cian', hex: 0x06b6d4 },
  { name: 'Verde', hex: 0x22c55e },
  { name: 'Amarillo', hex: 0xeab308 },
  { name: 'Naranja', hex: 0xf97316 },
  { name: 'Púrpura', hex: 0xa855f7 },
  { name: 'Rosa', hex: 0xec4899 },
];

const LimbWidthCircularHandle: React.FC<{
  limbKey: string;
  label: string;
  top: string;
  left: string;
  currentVal: number;
  onChange: (key: string, val: number) => void;
}> = ({ limbKey, label, top, left, currentVal, onChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = React.useRef<number>(0);
  const startValRef = React.useRef<number>(1.0);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {}
    setIsDragging(true);
    startXRef.current = e.clientX;
    startValRef.current = currentVal;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startXRef.current;
    // Dragging right (->) increases width, dragging left (<-) decreases width
    const sensitivity = 0.008;
    const newVal = Math.max(0.3, Math.min(3.0, startValRef.current + deltaX * sensitivity));
    onChange(limbKey, newVal);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
      setIsDragging(false);
    }
  };

  return (
    <div
      style={{ top, left }}
      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto flex flex-col items-center group z-30 select-none"
    >
      {/* Hollow transparent circular handle with glowing outline ring (sin relleno gris por dentro) */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center cursor-ew-resize select-none touch-none transition-all shadow-lg ${
          isDragging
            ? 'bg-amber-400/20 border-amber-300 text-amber-200 scale-125 ring-2 ring-amber-400/80 shadow-amber-500/50'
            : 'bg-transparent hover:bg-amber-400/15 border-amber-400/90 hover:border-amber-300 text-amber-300 hover:scale-110 shadow-amber-500/30'
        }`}
        title={`Arrastrar a la derecha (->) para aumentar y a la izquierda (<-) para disminuir (${label})`}
      >
        <svg
          className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] pointer-events-none"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="4" y1="12" x2="20" y2="12" />
          <polyline points="7 9 4 12 7 15" />
          <polyline points="17 9 20 12 17 15" />
        </svg>
      </div>

      {/* Small badge displaying limb name & current scale */}
      <div
        className={`mt-0.5 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black font-mono transition-all shadow-md pointer-events-none whitespace-nowrap flex items-center gap-1 ${
          isDragging
            ? 'bg-slate-900 text-white border border-amber-400 scale-105'
            : 'bg-slate-950/85 text-slate-200 border border-slate-700/80 group-hover:bg-slate-900 group-hover:text-white'
        }`}
      >
        <span>{label}</span>
        <span className="text-amber-400 font-bold">{currentVal.toFixed(1)}x</span>
      </div>
    </div>
  );
};

export const AvatarEditorModal: React.FC<AvatarEditorModalProps> = ({
  isOpen,
  onClose,
  onRotateCameraToFront,
  onRotateCameraToBack,
  onRotateCameraToSide,
  onFocusCameraOnPlayer,
  isFluidEmitting = false,
  onTogglePlayerFluidEmission,
  onTriggerPlayerFluidBurst,
  onTriggerErection,
  faceFeatureMode = 'anime_canvas',
  faceFloatDepth = 0.002,
  eyeHolesEnabled = true,
  onFaceFeatureModeChange,
  onFaceFloatDepthChange,
  onToggleEyeHoles,
  hasShirt,
  shirtColorHex,
  onToggleShirt,
  onShirtColorChange,
  hasPants = true,
  pantsColorHex,
  onTogglePants,
  onPantsColorChange,
  hasUnderwear = true,
  underwearColorHex = 0xffffff,
  onToggleUnderwear,
  onUnderwearColorChange,
  hasGloves = false,
  glovesColorHex = 0x111827,
  onToggleGloves,
  onGlovesColorChange,
  hasBoots = true,
  bootsColorHex = 0x111827,
  onToggleBoots,
  onBootsColorChange,
  hasSocks = false,
  socksColorHex = 0xffffff,
  onToggleSocks,
  onSocksColorChange,
  skinColorHex,
  onSkinColorChange,
  contourJointStyle,
  contourLevel,
  contourEnabled,
  onContourJointStyleChange,
  onContourLevelChange,
  onToggleContour,
  hasBustAndGlutes,
  onToggleBustAndGlutes,
  genitalType = 'none',
  onGenitalTypeChange,
  genitalMShaftLength = 0.16,
  onGenitalMShaftLengthChange,
  genitalMShaftThickness = 0.045,
  onGenitalMShaftThicknessChange,
  genitalMPinkSize = 1.0,
  onGenitalMPinkSizeChange,
  genitalFSize = 0.08,
  onGenitalFSizeChange,
  voxelDensity = 1.0,
  onVoxelDensityChange,
  voxelShape = 'cube',
  onVoxelShapeChange,
  hairType = 'none',
  hairColorHex = 0x1c1917,
  onHairTypeChange,
  onHairColorChange,
  beardType = 'none',
  beardColorHex = 0x1c1917,
  onBeardTypeChange,
  onBeardColorChange,
  hatType = 'none',
  hatColorHex = 0x111827,
  onHatTypeChange,
  onHatColorChange,
  glassesType = 'none',
  glassesColorHex = 0x111827,
  onGlassesTypeChange,
  onGlassesColorChange,
  previewAngle = 'back',
  onSetPreviewAngle,
  previewDistance = 3.4,
  onSetPreviewDistance,
  pubicHairEnabled = false,
  onPubicHairEnabledChange,
  pubicHairIntensity = 0.5,
  onPubicHairIntensityChange,
  bodyCubicity = 1.0,
  onBodyCubicityChange,
  limbSizeMultiplier = 1.0,
  onLimbSizeMultiplierChange,
  onOpenMainMenu,
  onUpdateSpecificLimbWidth,
  limbScreenPositions,
  onToggleMuscleOverlay,
}) => {
  const [tab, setTab] = useState<'clothing' | 'accessories' | 'contour' | 'anatomy' | 'face'>('clothing');
  const [showLimbOverlay, setShowLimbOverlay] = useState<boolean>(false);

  const handleToggleMuscle = () => {
    const next = !showLimbOverlay;
    setShowLimbOverlay(next);
    onToggleMuscleOverlay?.(next);
  };
  const [limbWidths, setLimbWidths] = useState<Record<string, number>>({
    cabeza: 1.0,
    pecho: 1.0,
    brazo_izq: 1.0,
    antebrazo_izq: 1.0,
    brazo_der: 1.0,
    antebrazo_der: 1.0,
    muslo_izq: 1.0,
    antepierna_izq: 1.0,
    tobillo_izq: 1.0,
    muslo_der: 1.0,
    antepierna_der: 1.0,
    tobillo_der: 1.0,
  });

  const handleLimbWidthChange = (key: string, newVal: number) => {
    const clamped = Math.min(2.5, Math.max(0.4, Number(newVal.toFixed(2))));
    const symKey = key.includes('izq') ? key.replace('izq', 'der') : key.includes('der') ? key.replace('der', 'izq') : key;
    setLimbWidths((prev) => ({
      ...prev,
      [key]: clamped,
      [symKey]: clamped,
    }));
    onUpdateSpecificLimbWidth?.(key, clamped);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex justify-end p-3 sm:p-5">
      {/* Floating Modern Editor HUD Panel on the Right */}
      <div 
        id="avatar-editor-floating-panel"
        className="pointer-events-auto w-full max-w-[460px] h-full max-h-[96vh] flex flex-col rounded-3xl border border-slate-700/60 shadow-2xl shadow-black/80 overflow-hidden animate-in fade-in slide-in-from-right-8 duration-200"
      >
        {/* Header with Close and Live Badge */}
        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl border-b border-slate-700/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400 shadow-sm">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white tracking-wide">Editor de Avatar</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 animate-pulse">
                  3D EN VIVO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Cámara 3D enfocada en el personaje en el cuadro</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenMainMenu && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMainMenu();
                }}
                className="px-2.5 py-1.5 rounded-xl bg-pink-600/80 hover:bg-pink-500 text-white flex items-center gap-1.5 border border-pink-400/50 transition-all cursor-pointer active:scale-95 text-[11px] font-black shadow"
                title="Regresar al Menú Principal"
              >
                <Globe className="w-3.5 h-3.5 text-pink-200" />
                <span className="hidden sm:inline">MENÚ</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center border border-slate-700 transition-all cursor-pointer active:scale-95"
              title="Cerrar Editor"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cuadro de Vista Previa 3D Directo al Personaje (Cuerpo Completo & Rostro) */}
        <div className="p-3 bg-slate-950/30 border-b border-slate-800/80 flex flex-col gap-2">
          <div
            id="avatar-3d-preview-viewport"
            onWheel={(e) => {
              e.stopPropagation();
              onSetPreviewDistance?.(Math.min(6.0, Math.max(1.2, previewDistance + (e.deltaY > 0 ? 0.3 : -0.3))));
            }}
            className="relative w-full h-56 sm:h-64 rounded-2xl border-2 border-sky-400/70 overflow-hidden bg-transparent shadow-lg shadow-sky-950/40 select-none"
          >
            {/* Viewfinder Corners */}
            <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-sky-400 pointer-events-none" />
            <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-sky-400 pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-sky-400 pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-sky-400 pointer-events-none" />

            {/* Muscle Overlay Toggle Button in Viewport Corner */}
            <div className="absolute top-9 left-2 z-20 pointer-events-auto">
              <button
                type="button"
                onClick={handleToggleMuscle}
                className={`px-2 py-1 rounded-xl border backdrop-blur-md transition-all cursor-pointer active:scale-95 shadow-lg flex items-center gap-1.5 ${
                  showLimbOverlay
                    ? 'bg-amber-500 text-white border-amber-300 ring-2 ring-amber-400/80 shadow-amber-500/50 scale-105'
                    : 'bg-slate-900/85 hover:bg-slate-800 text-amber-300 border-amber-500/50'
                }`}
                title="Mostrar / Ocultar Controles de Ancho por Extremidad (+ / -)"
              >
                <MuscleIcon className="w-4 h-4 text-amber-200 shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-wider">Músculo</span>
              </button>
            </div>

            {/* Limb Width Drag Handles Overlay */}
            {showLimbOverlay && (
              <div className="absolute inset-0 pointer-events-none z-30 select-none">
                {(
                  previewAngle === 'face'
                    ? [
                        { key: 'cabeza', label: 'Cabeza', top: '45%', left: '50%' },
                        { key: 'pecho', label: 'Cuello/Pecho', top: '80%', left: '50%' },
                      ]
                    : previewAngle === 'side'
                    ? [
                        { key: 'cabeza', label: 'Cabeza', top: '12%', left: '50%' },
                        { key: 'pecho', label: 'Pecho', top: '28%', left: '50%' },
                        { key: 'brazo_izq', label: 'Brazo I.', top: '30%', left: '42%' },
                        { key: 'antebrazo_izq', label: 'Anteb. I.', top: '45%', left: '38%' },
                        { key: 'brazo_der', label: 'Brazo D.', top: '30%', left: '58%' },
                        { key: 'antebrazo_der', label: 'Anteb. D.', top: '45%', left: '62%' },
                        { key: 'muslo_izq', label: 'Muslo I.', top: '47%', left: '45%' },
                        { key: 'antepierna_izq', label: 'Pierna I.', top: '71%', left: '45%' },
                        { key: 'tobillo_izq', label: 'Tobillo I.', top: '88%', left: '45%' },
                        { key: 'muslo_der', label: 'Muslo D.', top: '47%', left: '55%' },
                        { key: 'antepierna_der', label: 'Pierna D.', top: '71%', left: '55%' },
                        { key: 'tobillo_der', label: 'Tobillo D.', top: '88%', left: '55%' },
                      ]
                    : [
                        { key: 'cabeza', label: 'Cabeza', top: '12%', left: '50%' },
                        { key: 'pecho', label: 'Pecho', top: '28%', left: '50%' },
                        { key: 'brazo_izq', label: 'Brazo I.', top: '30%', left: '33%' },
                        { key: 'antebrazo_izq', label: 'Anteb. I.', top: '45%', left: '26%' },
                        { key: 'brazo_der', label: 'Brazo D.', top: '30%', left: '67%' },
                        { key: 'antebrazo_der', label: 'Anteb. D.', top: '45%', left: '74%' },
                        { key: 'muslo_izq', label: 'Muslo I.', top: '47%', left: '41%' },
                        { key: 'antepierna_izq', label: 'Pierna I.', top: '71%', left: '41%' },
                        { key: 'tobillo_izq', label: 'Tobillo I.', top: '88%', left: '41%' },
                        { key: 'muslo_der', label: 'Muslo D.', top: '47%', left: '59%' },
                        { key: 'antepierna_der', label: 'Pierna D.', top: '71%', left: '59%' },
                        { key: 'tobillo_der', label: 'Tobillo D.', top: '88%', left: '59%' },
                      ]
                ).map((limb) => {
                  const projected = limbScreenPositions && limbScreenPositions[limb.key];
                  const finalTop = projected?.top || limb.top;
                  const finalLeft = projected?.left || limb.left;
                  return (
                    <LimbWidthCircularHandle
                      key={limb.key}
                      limbKey={limb.key}
                      label={limb.label}
                      top={finalTop}
                      left={finalLeft}
                      currentVal={limbWidths[limb.key] || 1.0}
                      onChange={handleLimbWidthChange}
                    />
                  );
                })}
              </div>
            )}

            {/* Top Overlay Badge & Distance Zoom Controls */}
            <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-none z-10">
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/85 backdrop-blur-md border border-sky-400/40 shadow">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black text-sky-200 tracking-wider">
                  {previewAngle === 'face' ? '🔍 ROSTRO 3D' : previewAngle === 'back' ? '🔙 ESPALDA 3D' : previewAngle === 'side' ? '📐 PERFIL 3D' : '👤 CUERPO COMPLETO'}
                </span>
              </div>
              <div className="flex items-center gap-1 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => onSetPreviewDistance?.(Math.min(6.0, previewDistance + 0.5))}
                  className="px-2 py-0.5 rounded-lg bg-slate-900/85 hover:bg-slate-800 text-[10px] font-black text-sky-200 border border-sky-400/40 transition-all cursor-pointer active:scale-95 shadow"
                  title="Alejar cámara para ver más cuerpo o entorno"
                >
                  🔍- Alejar
                </button>
                <button
                  type="button"
                  onClick={() => onSetPreviewDistance?.(Math.max(1.2, previewDistance - 0.5))}
                  className="px-2 py-0.5 rounded-lg bg-slate-900/85 hover:bg-slate-800 text-[10px] font-black text-sky-200 border border-sky-400/40 transition-all cursor-pointer active:scale-95 shadow"
                  title="Acercar cámara"
                >
                  🔍+ Acercar
                </button>
              </div>
            </div>

            {/* Bottom Camera Angle Selectors (Sin clones, solo enfoca cámara 3D) */}
            <div className="absolute bottom-2 inset-x-2 flex items-center justify-center gap-1.5 z-10 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  onSetPreviewAngle && onSetPreviewAngle('front');
                  onSetPreviewDistance && onSetPreviewDistance(3.4);
                  onRotateCameraToFront && onRotateCameraToFront();
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide border transition-all cursor-pointer active:scale-95 shadow-md ${
                  previewAngle === 'front'
                    ? 'bg-sky-500 text-white border-white/60 shadow-sky-500/40 scale-105'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700/60'
                }`}
              >
                👤 Cuerpo Completo
              </button>
              <button
                type="button"
                onClick={() => {
                  onSetPreviewAngle && onSetPreviewAngle('side');
                  onSetPreviewDistance && onSetPreviewDistance(3.4);
                  onRotateCameraToSide && onRotateCameraToSide();
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide border transition-all cursor-pointer active:scale-95 shadow-md ${
                  previewAngle === 'side'
                    ? 'bg-sky-500 text-white border-white/60 shadow-sky-500/40 scale-105'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700/60'
                }`}
              >
                📐 Perfil
              </button>
              <button
                type="button"
                onClick={() => {
                  onSetPreviewAngle && onSetPreviewAngle('back');
                  onSetPreviewDistance && onSetPreviewDistance(3.4);
                  onRotateCameraToBack && onRotateCameraToBack();
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide border transition-all cursor-pointer active:scale-95 shadow-md ${
                  previewAngle === 'back'
                    ? 'bg-sky-500 text-white border-white/60 shadow-sky-500/40 scale-105'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700/60'
                }`}
              >
                🔙 Espalda
              </button>
              <button
                type="button"
                onClick={() => {
                  onSetPreviewAngle && onSetPreviewAngle('face');
                  onSetPreviewDistance && onSetPreviewDistance(0.78);
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide border transition-all cursor-pointer active:scale-95 shadow-md ${
                  previewAngle === 'face'
                    ? 'bg-pink-500 text-white border-white/60 shadow-pink-500/40 scale-105'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700/60'
                }`}
              >
                🔍 Rostro
              </button>
            </div>
          </div>

          {/* Quick Fluid Test and Live 3D Focus Actions */}
          <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
            {onTogglePlayerFluidEmission && (
              <button
                onClick={onTogglePlayerFluidEmission}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                  isFluidEmitting
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 animate-pulse'
                    : 'bg-slate-800 hover:bg-pink-600 text-slate-200 hover:text-white border border-slate-700'
                }`}
              >
                <Droplets className="w-3 h-3" />
                {isFluidEmitting ? 'Líquido ON' : 'Probar Líquido'}
              </button>
            )}
            {onFocusCameraOnPlayer && (
              <button
                onClick={onFocusCameraOnPlayer}
                className="px-2.5 py-1 rounded-lg bg-pink-600/80 hover:bg-pink-500 text-white text-[10px] font-black border border-pink-400/50 shadow-sm transition-all cursor-pointer active:scale-95 flex items-center gap-1 ml-auto"
                title="Enfocar Rostro / Torso en 3D"
              >
                <RotateCw className="w-2.5 h-2.5" />
                <span>Centrar Avatar</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-xl px-2 pt-1 gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'clothing', label: 'Ropa & Color', icon: Shirt },
            { id: 'accessories', label: 'Accesorios', icon: Sparkles },
            { id: 'contour', label: 'Forma 3D', icon: Layers },
            { id: 'anatomy', label: 'Anatomía & Fluidos', icon: Heart },
            { id: 'face', label: 'Rostro & Ojos', icon: Smile },
          ].map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id as any)}
                className={`flex-1 py-2 px-2.5 rounded-t-xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer border-t border-x ${
                  active
                    ? 'bg-slate-800 text-pink-400 border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-pink-400' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-200 text-xs custom-scrollbar bg-slate-950/95 backdrop-blur-xl">
          {/* TAB 1: CLOTHING & COLORS */}
          {tab === 'clothing' && (
            <div className="space-y-4">
              {/* Skin Color */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-white flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-pink-400" /> Color de Piel
                  </span>
                  <div
                    className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: `#${skinColorHex.toString(16).padStart(6, '0')}` }}
                  />
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {SKIN_PALETTE.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => onSkinColorChange(c.hex)}
                      className={`h-7 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                        skinColorHex === c.hex ? 'border-pink-400 scale-105 shadow-md' : 'border-slate-700 hover:border-slate-500'
                      }`}
                      style={{ backgroundColor: `#${c.hex.toString(16).padStart(6, '0')}` }}
                      title={c.name}
                    >
                      {skinColorHex === c.hex && <Check className="w-3.5 h-3.5 text-slate-900 drop-shadow" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shirt */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="font-extrabold text-white flex items-center gap-1.5">
                    <Shirt className="w-3.5 h-3.5 text-sky-400" /> Camisa
                  </span>
                  <button
                    onClick={() => onToggleShirt(!hasShirt)}
                    className={`px-3 py-1 rounded-xl font-black text-[11px] transition-all cursor-pointer ${
                      hasShirt ? 'bg-sky-500 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {hasShirt ? 'Equipada' : 'Desactivada'}
                  </button>
                </div>
                {hasShirt && (
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    {CLOTHING_PALETTE.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => onShirtColorChange(c.hex)}
                        className={`h-7 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                          shirtColorHex === c.hex ? 'border-sky-400 scale-105 shadow-md' : 'border-slate-700 hover:border-slate-500'
                        }`}
                        style={{ backgroundColor: `#${c.hex.toString(16).padStart(6, '0')}` }}
                        title={c.name}
                      >
                        {shirtColorHex === c.hex && <Check className="w-3.5 h-3.5 text-white mix-blend-difference" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Pants */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="font-extrabold text-white flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" /> Pantalones
                  </span>
                  {onTogglePants && (
                    <button
                      onClick={() => onTogglePants(!hasPants)}
                      className={`px-3 py-1 rounded-xl font-black text-[11px] transition-all cursor-pointer ${
                        hasPants ? 'bg-indigo-500 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {hasPants ? 'Equipados' : 'Desactivados'}
                    </button>
                  )}
                </div>
                {hasPants && (
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    {CLOTHING_PALETTE.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => onPantsColorChange(c.hex)}
                        className={`h-7 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                          pantsColorHex === c.hex ? 'border-indigo-400 scale-105 shadow-md' : 'border-slate-700 hover:border-slate-500'
                        }`}
                        style={{ backgroundColor: `#${c.hex.toString(16).padStart(6, '0')}` }}
                        title={c.name}
                      >
                        {pantsColorHex === c.hex && <Check className="w-3.5 h-3.5 text-white mix-blend-difference" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Underwear */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="font-extrabold text-white flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-400" /> Ropa Interior
                  </span>
                  {onToggleUnderwear && (
                    <button
                      onClick={() => onToggleUnderwear(!hasUnderwear)}
                      className={`px-3 py-1 rounded-xl font-black text-[11px] transition-all cursor-pointer ${
                        hasUnderwear ? 'bg-rose-500 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {hasUnderwear ? 'Equipada' : 'Desactivada'}
                    </button>
                  )}
                </div>
                {hasUnderwear && onUnderwearColorChange && (
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    {CLOTHING_PALETTE.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => onUnderwearColorChange(c.hex)}
                        className={`h-7 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                          underwearColorHex === c.hex ? 'border-rose-400 scale-105 shadow-md' : 'border-slate-700 hover:border-slate-500'
                        }`}
                        style={{ backgroundColor: `#${c.hex.toString(16).padStart(6, '0')}` }}
                        title={c.name}
                      >
                        {underwearColorHex === c.hex && <Check className="w-3.5 h-3.5 text-white mix-blend-difference" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Boots & Gloves */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-white">Botas</span>
                    {onToggleBoots && (
                      <button
                        onClick={() => onToggleBoots(!hasBoots)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                          hasBoots ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {hasBoots ? 'ON' : 'OFF'}
                      </button>
                    )}
                  </div>
                  {hasBoots && onBootsColorChange && (
                    <div className="flex gap-1 overflow-x-auto pb-1">
                      {CLOTHING_PALETTE.slice(0, 5).map((c) => (
                        <button
                          key={c.name}
                          onClick={() => onBootsColorChange(c.hex)}
                          className="w-6 h-6 rounded-lg border border-slate-700 shrink-0"
                          style={{ backgroundColor: `#${c.hex.toString(16).padStart(6, '0')}` }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-white">Guantes</span>
                    {onToggleGloves && (
                      <button
                        onClick={() => onToggleGloves(!hasGloves)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                          hasGloves ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {hasGloves ? 'ON' : 'OFF'}
                      </button>
                    )}
                  </div>
                  {hasGloves && onGlovesColorChange && (
                    <div className="flex gap-1 overflow-x-auto pb-1">
                      {CLOTHING_PALETTE.slice(0, 5).map((c) => (
                        <button
                          key={c.name}
                          onClick={() => onGlovesColorChange(c.hex)}
                          className="w-6 h-6 rounded-lg border border-slate-700 shrink-0"
                          style={{ backgroundColor: `#${c.hex.toString(16).padStart(6, '0')}` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACCESSORIES */}
          {tab === 'accessories' && (
            <div className="space-y-4">
              {/* Hair */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="font-extrabold text-white block mb-2">Estilo de Cabello</span>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { id: 'none', label: 'Sin Pelo' },
                    { id: 'classic', label: 'Clásico' },
                    { id: 'spiky', label: 'Anime Puntas' },
                    { id: 'long', label: 'Largo' },
                    { id: 'ponytail', label: 'Coleta' },
                    { id: 'afro', label: 'Afro' },
                  ].map((h) => (
                    <button
                      key={h.id}
                      onClick={() => onHairTypeChange?.(h.id)}
                      className={`py-2 px-2 rounded-xl font-bold text-center border transition-all cursor-pointer ${
                        hairType === h.id
                          ? 'bg-pink-500 text-white border-pink-400 shadow-md'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
                {hairType !== 'none' && onHairColorChange && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block mb-1">Color del Cabello</span>
                    <div className="grid grid-cols-5 gap-1.5">
                      {CLOTHING_PALETTE.map((c) => (
                        <button
                          key={c.name}
                          onClick={() => onHairColorChange(c.hex)}
                          className={`h-7 rounded-xl border flex items-center justify-center ${
                            hairColorHex === c.hex ? 'border-pink-400 scale-105' : 'border-slate-700'
                          }`}
                          style={{ backgroundColor: `#${c.hex.toString(16).padStart(6, '0')}` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Hat & Glasses */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <span className="font-extrabold text-white block mb-2">Sombrero</span>
                  <div className="flex flex-col gap-1.5">
                    {['none', 'cap', 'beanie', 'helmet', 'tophat'].map((type) => (
                      <button
                        key={type}
                        onClick={() => onHatTypeChange?.(type)}
                        className={`py-1.5 px-2 rounded-lg font-bold text-[11px] capitalize border ${
                          hatType === type ? 'bg-sky-500 text-white border-sky-400' : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {type === 'none' ? 'Sin Sombrero' : type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <span className="font-extrabold text-white block mb-2">Gafas / Lentes</span>
                  <div className="flex flex-col gap-1.5">
                    {['none', 'sunglasses', 'nerd', 'visor', 'vr'].map((type) => (
                      <button
                        key={type}
                        onClick={() => onGlassesTypeChange?.(type)}
                        className={`py-1.5 px-2 rounded-lg font-bold text-[11px] capitalize border ${
                          glassesType === type ? 'bg-sky-500 text-white border-sky-400' : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {type === 'none' ? 'Sin Lentes' : type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONTOUR & 3D FORM */}
          {tab === 'contour' && (
            <div className="space-y-4">
              {/* Joint & Envelope Style */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="font-extrabold text-white block mb-2">Estilo de Contorno y Juntas</span>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { id: 'pseudo3d', label: 'Pseudo 3D' },
                    { id: 'blocky', label: 'Bloque Clásico' },
                    { id: 'cylinder', label: 'Cilindro Articulado' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      onClick={() => onContourJointStyleChange(style.id as any)}
                      className={`py-2 px-2 rounded-xl font-bold text-center border text-[11px] ${
                        contourJointStyle === style.id
                          ? 'bg-sky-500 text-white border-sky-400 shadow-md'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>

                {/* Contour Toggle & Slider */}
                <div className="flex items-center justify-between py-2 border-t border-slate-800">
                  <span className="font-bold text-slate-300">Capa de Contorno Esférico</span>
                  <button
                    onClick={() => onToggleContour(!contourEnabled)}
                    className={`px-3 py-1 rounded-xl font-black ${
                      contourEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {contourEnabled ? 'ACTIVADO' : 'DESACTIVADO'}
                  </button>
                </div>

                {contourEnabled && (
                  <div className="pt-2">
                    <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
                      <span>Nivel de Contorno</span>
                      <span className="text-sky-400">{contourLevel.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="2.0"
                      step="0.05"
                      value={contourLevel}
                      onChange={(e) => onContourLevelChange(parseFloat(e.target.value))}
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Voxel Density & Shape */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <span className="font-extrabold text-white block">Geometría de Vóxeles</span>
                
                {onVoxelShapeChange && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onVoxelShapeChange('cube')}
                      className={`py-2 rounded-xl font-bold border ${
                        voxelShape === 'cube' ? 'bg-pink-500 text-white border-pink-400' : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      Vóxeles Cúbicos
                    </button>
                    <button
                      onClick={() => onVoxelShapeChange('sphere')}
                      className={`py-2 rounded-xl font-bold border ${
                        voxelShape === 'sphere' ? 'bg-pink-500 text-white border-pink-400' : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      Vóxeles Esféricos
                    </button>
                  </div>
                )}

                {onVoxelDensityChange && (
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
                      <span>Densidad de Vóxeles</span>
                      <span className="text-pink-400">{voxelDensity.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.1"
                      value={voxelDensity}
                      onChange={(e) => onVoxelDensityChange(parseFloat(e.target.value))}
                      className="w-full accent-pink-400 cursor-pointer"
                    />
                  </div>
                )}

                {onLimbSizeMultiplierChange && (
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
                      <span>Grosor de Extremidades</span>
                      <span className="text-indigo-400">{limbSizeMultiplier.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.6"
                      max="1.6"
                      step="0.05"
                      value={limbSizeMultiplier}
                      onChange={(e) => onLimbSizeMultiplierChange(parseFloat(e.target.value))}
                      className="w-full accent-indigo-400 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: ANATOMY & FLUID EMISSION */}
          {tab === 'anatomy' && (
            <div className="space-y-4">
              {/* Bust & Glutes */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-extrabold text-white block">Pechos y Glúteos 3D</span>
                    <p className="text-[11px] text-slate-400">Modelado anatómico con tetillas y glúteos</p>
                  </div>
                  <button
                    onClick={() => onToggleBustAndGlutes(!hasBustAndGlutes)}
                    className={`px-3 py-1.5 rounded-xl font-black text-[11px] transition-all cursor-pointer ${
                      hasBustAndGlutes ? 'bg-pink-500 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {hasBustAndGlutes ? 'ACTIVADO' : 'DESACTIVADO'}
                  </button>
                </div>
              </div>

              {/* Genital Type Selection */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <span className="font-extrabold text-white block">Tipo de Genitales</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'none', label: 'Ninguno' },
                    { id: 'male', label: 'Masculino' },
                    { id: 'female', label: 'Femenino' },
                  ].map((g) => (
                    <button
                      key={g.id}
                      onClick={() => onGenitalTypeChange?.(g.id as any)}
                      className={`py-2 rounded-xl font-bold border text-[11px] ${
                        genitalType === g.id
                          ? 'bg-rose-500 text-white border-rose-400 shadow-md'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>

                {/* Male Specific Controls */}
                {genitalType === 'male' && (
                  <div className="space-y-2.5 pt-2 border-t border-slate-800">
                    {onGenitalMShaftLengthChange && (
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
                          <span>Longitud</span>
                          <span className="text-rose-400">{((genitalMShaftLength ?? 0.16) * 100).toFixed(0)} cm</span>
                        </div>
                        <input
                          type="range"
                          min="0.08"
                          max="0.45"
                          step="0.01"
                          value={genitalMShaftLength}
                          onChange={(e) => onGenitalMShaftLengthChange(parseFloat(e.target.value))}
                          className="w-full accent-rose-400 cursor-pointer"
                        />
                      </div>
                    )}
                    {onGenitalMShaftThicknessChange && (
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
                          <span>Grosor</span>
                          <span className="text-rose-400">{((genitalMShaftThickness ?? 0.045) * 100).toFixed(1)} cm</span>
                        </div>
                        <input
                          type="range"
                          min="0.02"
                          max="0.10"
                          step="0.005"
                          value={genitalMShaftThickness}
                          onChange={(e) => onGenitalMShaftThicknessChange(parseFloat(e.target.value))}
                          className="w-full accent-rose-400 cursor-pointer"
                        />
                      </div>
                    )}
                    {onTriggerErection && (
                      <button
                        onClick={onTriggerErection}
                        className="w-full py-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-black rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                      >
                        🍆 Disparar Erección + Convulsión
                      </button>
                    )}
                  </div>
                )}

                {/* Female Specific Controls */}
                {genitalType === 'female' && onGenitalFSizeChange && (
                  <div className="pt-2 border-t border-slate-800">
                    <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
                      <span>Tamaño Vulva</span>
                      <span className="text-rose-400">{((genitalFSize ?? 0.08) * 100).toFixed(0)} mm</span>
                    </div>
                    <input
                      type="range"
                      min="0.04"
                      max="0.18"
                      step="0.01"
                      value={genitalFSize}
                      onChange={(e) => onGenitalFSizeChange(parseFloat(e.target.value))}
                      className="w-full accent-rose-400 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Pubic Hair */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-white">Vello Púbico</span>
                  {onPubicHairEnabledChange && (
                    <button
                      onClick={() => onPubicHairEnabledChange(!pubicHairEnabled)}
                      className={`px-3 py-1 rounded-xl font-black text-[11px] ${
                        pubicHairEnabled ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {pubicHairEnabled ? 'ON' : 'OFF'}
                    </button>
                  )}
                </div>
                {pubicHairEnabled && onPubicHairIntensityChange && (
                  <div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={pubicHairIntensity}
                      onChange={(e) => onPubicHairIntensityChange(parseFloat(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Realistic Fluid Controls */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 border border-rose-800/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-rose-400 animate-bounce" />
                    <span className="font-extrabold text-white">Motor de Fluidos Realistas</span>
                  </div>
                  <span className="text-[10px] font-bold text-rose-300">Pechos & Genitales</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Emite chorros de bloques encadenados con uniones y esferas continuas desde pechos y genitales.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {onTogglePlayerFluidEmission && (
                    <button
                      onClick={onTogglePlayerFluidEmission}
                      className={`py-2.5 px-3 rounded-xl font-black text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                        isFluidEmitting
                          ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/50 animate-pulse'
                          : 'bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white border border-slate-700'
                      }`}
                    >
                      <Droplets className="w-3.5 h-3.5" />
                      {isFluidEmitting ? 'Detener Líquido' : 'Líquido Continuo'}
                    </button>
                  )}
                  {onTriggerPlayerFluidBurst && (
                    <button
                      onClick={onTriggerPlayerFluidBurst}
                      className="py-2.5 px-3 rounded-xl font-black text-[11px] bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      Ráfaga de Chorro
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: FACE & 3D EYES */}
          {tab === 'face' && (
            <div className="space-y-4">
              {/* Face Feature Mode */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <span className="font-extrabold text-white block">Modo de Renderizado de Rostro</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'anime_canvas', label: 'Anime 2D Canvas' },
                    { id: '3d_mesh_eyes', label: 'Ojos 3D en Cuencas' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => onFaceFeatureModeChange?.(mode.id as FaceFeatureMode)}
                      className={`py-2.5 px-2 rounded-xl font-bold border text-[11px] ${
                        faceFeatureMode === mode.id
                          ? 'bg-pink-500 text-white border-pink-400 shadow-md'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>

                {/* Eye Holes Toggle */}
                {onToggleEyeHoles && (
                  <div className="flex items-center justify-between py-2 border-t border-slate-800">
                    <span className="font-bold text-slate-300">Huecos de Cuencas Oculares</span>
                    <button
                      onClick={() => onToggleEyeHoles(!eyeHolesEnabled)}
                      className={`px-3 py-1 rounded-xl font-black text-[11px] ${
                        eyeHolesEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {eyeHolesEnabled ? 'ACTIVADOS' : 'PLANOS'}
                    </button>
                  </div>
                )}

                {/* Face Float Depth Slider */}
                {onFaceFloatDepthChange && (
                  <div className="pt-2 border-t border-slate-800">
                    <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
                      <span>Profundidad de Flotación</span>
                      <span className="text-pink-400">{(faceFloatDepth * 1000).toFixed(1)} mm</span>
                    </div>
                    <input
                      type="range"
                      min="0.001"
                      max="0.008"
                      step="0.0005"
                      value={faceFloatDepth}
                      onChange={(e) => onFaceFloatDepthChange(parseFloat(e.target.value))}
                      className="w-full accent-pink-400 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Done Button */}
        <div className="p-3.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400 font-medium">Todos los cambios se aplican al instante</span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:scale-95 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-pink-500/30 transition-all cursor-pointer"
          >
            Listo / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
