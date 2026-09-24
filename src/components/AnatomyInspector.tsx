import React from 'react';
import { Activity, Bone, Heart, Shield, Skull, X, Zap } from 'lucide-react';
import { Ragdoll } from '../types/physics';

interface AnatomyInspectorProps {
  ragdoll: Ragdoll | undefined;
  onClose: () => void;
}

export const AnatomyInspector: React.FC<AnatomyInspectorProps> = ({ ragdoll, onClose }) => {
  if (!ragdoll) return null;

  const getPartStatus = (partName: string) => {
    let p = ragdoll.particles.find((item) => item.name === partName);
    if (!p) {
      if (partName === 'cuello_estomago_tubo') {
        p = ragdoll.particles.find((item) => item.name === 'cuello');
      } else if (partName === 'estomago' || partName === 'higado') {
        p = ragdoll.particles.find((item) => item.name === 'torso');
      } else if (partName.startsWith('intestino')) {
        p = ragdoll.particles.find((item) => item.name === 'ombligo');
      }
    }
    if (!p) return { health: 0, max: 100, dismembered: true, fractured: false };
    return {
      health: Math.round(p.health),
      max: Math.round(p.maxHealth),
      dismembered: p.dismembered,
      fractured: p.fractured,
    };
  };

  const getExtendedStats = (type: string) => {
    switch(type) {
      case 'swat': return { f: 75, v: 60, r: 85, s: 50, i: 70, sx: 50, o: 80, a: 30, p: 20, am: 40 };
      case 'mutant': return { f: 95, v: 85, r: 90, s: 90, i: 15, sx: 95, o: 95, a: 100, p: 90, am: 0 };
      case 'dummy': return { f: 10, v: 10, r: 100, s: 10, i: 0, sx: 0, o: 0, a: 0, p: 0, am: 100 };
      case 'golden': return { f: 100, v: 20, r: 100, s: 5, i: 50, sx: 0, o: 20, a: 0, p: 0, am: 50 };
      case 'civilian':
      default:
        return { f: 45, v: 50, r: 40, s: 45, i: 75, sx: 80, o: 60, a: 5, p: 5, am: 85 };
    }
  };
  const extendedStats = getExtendedStats(ragdoll.type);

  const anatomicalSegments = [
    { key: 'cabeza', label: 'Cabeza (Cráneo / Cerebro)', vital: true },
    { key: 'cuello', label: 'Cuello (Vértebras Cervicales / Tráquea y Carótidas)', vital: true },
    { key: 'cuello_estomago_tubo', label: 'Esófago / Tubo Rosa (Conector Dinámico Cuello a Estómago)', vital: true },
    { key: 'pechobase', label: 'Pecho Base (Clavículas / Corazón)', vital: true },
    { key: 'torso', label: 'Torso (Costillas / Pulmones)', vital: false },
    { key: 'higado', label: 'Hígado (Cavidad Cúbica)', vital: true },
    { key: 'estomago', label: 'Estómago (Cavidad Cúbica con Salida de Cuello)', vital: true },
    { key: 'ombligo', label: 'Abdomen (Pared Abdominal y Columna)', vital: false },
    { key: 'intestino_grueso', label: 'Intestino Grueso (3 Extremidades / Marco Exterior Unido)', vital: false },
    { key: 'intestino_delgado', label: 'Intestino Delgado (3 Extremidades / Papel Doblado y Cilindros Unidos)', vital: false },
    { key: 'pelvis', label: 'Pelvis (Caderas y Sistema Reproductor)', vital: false },
    { key: 'hombro_izq', label: 'Hombro Izquierdo', vital: false },
    { key: 'brazo_izq', label: 'Brazo Izq (Bíceps)', vital: false },
    { key: 'codo_izq', label: 'Codo Izquierdo', vital: false },
    { key: 'antebrazo_izq', label: 'Antebrazo Izquierdo', vital: false },
    { key: 'muneca_izq', label: 'Muñeca Izquierda', vital: false },
    { key: 'mano_izq', label: 'Mano con Dedos Izq', vital: false },
    { key: 'hombro_der', label: 'Hombro Derecho', vital: false },
    { key: 'brazo_der', label: 'Brazo Der (Bíceps)', vital: false },
    { key: 'codo_der', label: 'Codo Derecho', vital: false },
    { key: 'antebrazo_der', label: 'Antebrazo Derecho', vital: false },
    { key: 'muneca_der', label: 'Muñeca Derecha', vital: false },
    { key: 'mano_der', label: 'Mano con Dedos Der', vital: false },
    { key: 'muslo_izq', label: 'Muslo Izquierdo (Fémur)', vital: false },
    { key: 'rodilla_izq', label: 'Rodilla Izquierda (Rótula)', vital: false },
    { key: 'antepierna_izq', label: 'Pierna / Antepierna Izq (Tibia)', vital: false },
    { key: 'tobillo_izq', label: 'Tobillo Izquierdo', vital: false },
    { key: 'pie_izq', label: 'Pie Izquierdo', vital: false },
    { key: 'muslo_der', label: 'Muslo Derecho (Fémur)', vital: false },
    { key: 'rodilla_der', label: 'Rodilla Derecha (Rótula)', vital: false },
    { key: 'antepierna_der', label: 'Pierna / Antepierna Der (Tibia)', vital: false },
    { key: 'tobillo_der', label: 'Tobillo Derecho', vital: false },
    { key: 'pie_der', label: 'Pie Derecho', vital: false },
  ];

  return (
    <div
      id="anatomy-inspector-panel"
      className="absolute top-16 right-3 sm:right-4 z-40 w-72 sm:w-80 max-h-[80vh] bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col overflow-hidden text-slate-100 animate-in slide-in-from-right-4 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-red-500" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-white">
            Monitor Biométrico Anatómico
          </h3>
        </div>
        <button
          id="btn-close-anatomy"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Summary stats */}
      <div className="p-3.5 bg-slate-950/40 border-b border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-200">{ragdoll.name}</span>
          <span
            className={`font-black px-2 py-0.5 rounded text-[10px] ${
              ragdoll.isAlive
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            {ragdoll.isAlive ? 'VIVO / CONSCIENTE' : 'FALLECIDO'}
          </span>
        </div>

        {/* Global Health bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
            <span>Salud General</span>
            <span>{Math.round(ragdoll.totalHealth)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                ragdoll.totalHealth > 50
                  ? 'bg-emerald-500'
                  : ragdoll.totalHealth > 25
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${Math.max(0, ragdoll.totalHealth)}%` }}
            />
          </div>
        </div>

        {/* Counters */}
        <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
          <div className="p-1.5 rounded-lg bg-slate-800/80 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <Bone className="w-3 h-3 text-amber-400" />
              Fracturas:
            </span>
            <span className="font-bold text-amber-300">{ragdoll.stats.brokenBones}</span>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-800/80 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <Skull className="w-3 h-3 text-red-400" />
              Desmembrados:
            </span>
            <span className="font-bold text-red-300">{ragdoll.stats.dismemberedLimbs}</span>
          </div>
        </div>

        {/* Custom Stats */}
        <div className="space-y-2 mt-2 pt-2 border-t border-slate-700/50">
          <div className="text-[10px]">
            <span className="font-bold text-slate-300 block mb-1">[Stats]</span>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              <div className="flex justify-between"><span className="text-slate-400">Fuerza:</span> <span className="font-semibold text-cyan-400">{extendedStats.f}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Velocidad:</span> <span className="font-semibold text-cyan-400">{extendedStats.v}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Resistencia:</span> <span className="font-semibold text-cyan-400">{extendedStats.r}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Salto:</span> <span className="font-semibold text-cyan-400">{extendedStats.s}</span></div>
            </div>
          </div>
          <div className="text-[10px]">
            <span className="font-bold text-slate-300 block mb-1">[Sentidos]</span>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              <div className="flex justify-between"><span className="text-slate-400">Inteligencia:</span> <span className="font-semibold text-emerald-400">{extendedStats.i}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Oído:</span> <span className="font-semibold text-emerald-400">{extendedStats.o}</span></div>
              <div className="flex justify-between col-span-2"><span className="text-slate-400">Instinto Sexual (Reproducción):</span> <span className="font-semibold text-pink-400">{extendedStats.sx}</span></div>
            </div>
          </div>
          <div className="text-[10px]">
            <span className="font-bold text-slate-300 block mb-1">[Personalidad]</span>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              <div className="flex justify-between"><span className="text-slate-400">Asesino:</span> <span className="font-semibold text-red-400">{extendedStats.a}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Psicópata:</span> <span className="font-semibold text-red-400">{extendedStats.p}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Amable:</span> <span className="font-semibold text-amber-400">{extendedStats.am}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Anatomical Parts List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
        {anatomicalSegments.map((seg) => {
          const status = getPartStatus(seg.key);
          const percent = status.max > 0 ? (status.health / status.max) * 100 : 0;

          return (
            <div
              key={seg.key}
              className="p-2 rounded-lg bg-slate-800/50 border border-slate-800 hover:border-slate-700 transition-colors text-[11px]"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-slate-300 flex items-center gap-1.5">
                  {seg.vital && <span className="w-1.5 h-1.5 rounded-full bg-red-400" title="Órgano Vital" />}
                  {seg.label}
                </span>
                <div className="flex items-center gap-1">
                  {status.dismembered ? (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-600/30 text-red-400 border border-red-500/40">
                      CERCENADO
                    </span>
                  ) : status.fractured ? (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-600/30 text-amber-400 border border-amber-500/40">
                      FRACTURA
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-bold">{status.health} HP</span>
                  )}
                </div>
              </div>

              {!status.dismembered && (
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      percent > 60 ? 'bg-emerald-500' : percent > 25 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
