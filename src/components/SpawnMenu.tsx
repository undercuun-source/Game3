import React, { useState } from 'react';
import {
  Activity,
  Award,
  Bomb,
  Box,
  Crosshair,
  Feather,
  Flame,
  Globe,
  Hammer,
  HelpCircle,
  Layers,
  Magnet,
  Play,
  PlusCircle,
  Radio,
  RefreshCw,
  Rocket,
  Shield,
  ShieldAlert,
  Skull,
  Sparkles,
  Sword,
  Target,
  Trash2,
  Users,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { GAME_MAPS_3D } from '../engine/maps3D';
import { WEAPON_REGISTRY } from '../engine/weapons';
import { PropType, RagdollType, WeaponType } from '../types/physics';

interface SpawnMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSpawnRagdoll: (type: RagdollType) => void;
  onSelectWeapon: (weapon: WeaponType) => void;
  onSpawnProp: (type: PropType) => void;
  onSelectMap: (mapId: string) => void;
  currentMapId: string;
  activeWeapon: WeaponType;
  timeScale: number;
  onSetTimeScale: (scale: number) => void;
  gravityMult: number;
  onSetGravityMult: (mult: number) => void;
  goreLevel: 'high' | 'normal' | 'low';
  onSetGoreLevel: (level: 'high' | 'normal' | 'low') => void;
  xRayMode: boolean;
  onToggleXRay: () => void;
  immortalMode: boolean;
  onToggleImmortal: () => void;
  onClearBlood: () => void;
  onClearAll: () => void;
  onReviveAll: () => void;
  onSpawnLiquid: (quantity: number) => void;
  onSpawnPool: () => void;
  liquidQuantity: number;
  onSetLiquidQuantity: (val: number) => void;
}

export const SpawnMenu: React.FC<SpawnMenuProps> = ({
  isOpen,
  onClose,
  onSpawnRagdoll,
  onSelectWeapon,
  onSpawnProp,
  onSelectMap,
  currentMapId,
  activeWeapon,
  timeScale,
  onSetTimeScale,
  gravityMult,
  onSetGravityMult,
  goreLevel,
  onSetGoreLevel,
  xRayMode,
  onToggleXRay,
  immortalMode,
  onToggleImmortal,
  onClearBlood,
  onClearAll,
  onReviveAll,
  onSpawnLiquid,
  onSpawnPool,
  liquidQuantity,
  onSetLiquidQuantity,
}) => {
  const [activeTab, setActiveTab] = useState<'ragdolls' | 'weapons' | 'props' | 'maps' | 'world'>('ragdolls');
  const [weaponCategoryFilter, setWeaponCategoryFilter] = useState<string>('all');
  const [propCategoryFilter, setPropCategoryFilter] = useState<string>('all');

  if (!isOpen) return null;

  return (
    <div
      id="spawn-menu-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="spawn-menu-modal"
        className="w-full max-w-4xl max-h-[90vh] bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wide text-white uppercase flex items-center gap-2">
                Gorebox Sandbox Spawner
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                  Android Edition
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Selecciona personajes articulados, arsenal táctico, trampas y físicas
              </p>
            </div>
          </div>
          <button
            id="btn-close-spawn-menu"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="w-full max-w-full flex overflow-x-auto border-b border-slate-800 bg-slate-950/80 px-3 gap-1.5 py-2.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-950 touch-pan-x flex-nowrap shrink-0 snap-x">
          <button
            id="tab-ragdolls"
            onClick={() => setActiveTab('ragdolls')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap snap-start shrink-0 ${
              activeTab === 'ragdolls'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 bg-slate-900/50 border border-slate-800/80'
            }`}
          >
            <Users className="w-4 h-4 text-blue-400" />
            Personajes Articulados
          </button>
          <button
            id="tab-weapons"
            onClick={() => setActiveTab('weapons')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap snap-start shrink-0 ${
              activeTab === 'weapons'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30 ring-1 ring-orange-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 bg-slate-900/50 border border-slate-800/80'
            }`}
          >
            <Crosshair className="w-4 h-4 text-orange-400" />
            Arsenal & Herramientas
          </button>
          <button
            id="tab-props"
            onClick={() => setActiveTab('props')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap snap-start shrink-0 ${
              activeTab === 'props'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 bg-slate-900/50 border border-slate-800/80'
            }`}
          >
            <Box className="w-4 h-4 text-emerald-400" />
            Objetos & Trampas
          </button>
          <button
            id="tab-maps"
            onClick={() => setActiveTab('maps')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap snap-start shrink-0 ${
              activeTab === 'maps'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 ring-1 ring-purple-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 bg-slate-900/50 border border-slate-800/80'
            }`}
          >
            <Globe className="w-4 h-4 text-purple-400" />
            Mapas de Prueba
          </button>
          <button
            id="tab-world"
            onClick={() => setActiveTab('world')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap snap-start shrink-0 ${
              activeTab === 'world'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30 ring-1 ring-cyan-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 bg-slate-900/50 border border-slate-800/80'
            }`}
          >
            <Wrench className="w-4 h-4 text-cyan-400" />
            Ajustes del Mundo
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* 1. PERSONAJES */}
          {activeTab === 'ragdolls' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Generar Personajes con Anatomía Completa (Cabeza, Cuello, Pecho, Torso, Ombligo, Pelvis, Hombros, Brazos, Codos, Antebrazos, Muñecas, Manos con Dedos, Muslos, Rodillas, Piernas, Tobillos y Pies)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <button
                  id="spawn-civilian"
                  onClick={() => {
                    onSpawnRagdoll('civilian');
                    onClose();
                  }}
                  className="p-4 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-blue-500 hover:bg-slate-800 transition-all text-left flex items-start gap-3 group"
                >
                  <div className="w-12 h-12 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-xl group-hover:scale-105 transition-transform">
                    🧍
                  </div>
                  <div>
                    <h3 className="font-bold text-white group-hover:text-blue-400">Civil Inocente</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Ragdoll articulado estándar con peso humano realista y reacciones motoras de equilibrio.
                    </p>
                    <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                      100 HP • 27 Huesos Articulados
                    </span>
                  </div>
                </button>

                <button
                  id="spawn-swat"
                  onClick={() => {
                    onSpawnRagdoll('swat');
                    onClose();
                  }}
                  className="p-4 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-slate-400 hover:bg-slate-800 transition-all text-left flex items-start gap-3 group"
                >
                  <div className="w-12 h-12 rounded-lg bg-slate-500/20 text-slate-300 flex items-center justify-center font-black text-xl group-hover:scale-105 transition-transform">
                    👮
                  </div>
                  <div>
                    <h3 className="font-bold text-white group-hover:text-cyan-400">Agente SWAT Táctico</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Equipado con chaleco antibalas pesado y casco táctico resistente a impactos.
                    </p>
                    <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                      160 HP • 45% Armadura Balística
                    </span>
                  </div>
                </button>

                <button
                  id="spawn-mutant"
                  onClick={() => {
                    onSpawnRagdoll('mutant');
                    onClose();
                  }}
                  className="p-4 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-green-500 hover:bg-slate-800 transition-all text-left flex items-start gap-3 group"
                >
                  <div className="w-12 h-12 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center font-black text-xl group-hover:scale-105 transition-transform">
                    🧟
                  </div>
                  <div>
                    <h3 className="font-bold text-white group-hover:text-green-400">Mutante Zombi G-Virus</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Masa muscular densa y resistente a las roturas de huesos y caídas extremas.
                    </p>
                    <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-green-500/20 text-green-300">
                      250 HP • Mayor Masa y Fuerza
                    </span>
                  </div>
                </button>

                <button
                  id="spawn-dummy"
                  onClick={() => {
                    onSpawnRagdoll('dummy');
                    onClose();
                  }}
                  className="p-4 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-amber-500 hover:bg-slate-800 transition-all text-left flex items-start gap-3 group"
                >
                  <div className="w-12 h-12 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xl group-hover:scale-105 transition-transform">
                    🎯
                  </div>
                  <div>
                    <h3 className="font-bold text-white group-hover:text-amber-400">Muñeco de Pruebas Crash</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Diseñado para pruebas de laboratorio de alta resistencia y absorción de choques.
                    </p>
                    <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      500 HP • Articulaciones Reforzadas
                    </span>
                  </div>
                </button>

                <button
                  id="spawn-golden"
                  onClick={() => {
                    onSpawnRagdoll('golden');
                    onClose();
                  }}
                  className="p-4 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-yellow-400 hover:bg-slate-800 transition-all text-left flex items-start gap-3 group"
                >
                  <div className="w-12 h-12 rounded-lg bg-yellow-500/20 text-yellow-300 flex items-center justify-center font-black text-xl group-hover:scale-105 transition-transform">
                    👑
                  </div>
                  <div>
                    <h3 className="font-bold text-white group-hover:text-yellow-300">Ragdoll de Oro Macizo</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Cuerpo extremadamente pesado de metal precioso con física de impacto contundente.
                    </p>
                    <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300">
                      Super Densidad • 70% Blindaje
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* 2. ARSENAL & WEAPONS */}
          {activeTab === 'weapons' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Selecciona el Arma o Herramienta Activa
                </div>
              </div>

              {/* Scrollable Category Filter Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900 touch-pan-x flex-nowrap">
                {[
                  { id: 'all', label: 'Todas' },
                  { id: 'firearm', label: 'Fuego' },
                  { id: 'melee', label: 'Cuerpo a Cuerpo' },
                  { id: 'explosive', label: 'Explosivos' },
                  { id: 'tool', label: 'Herramientas' },
                  { id: 'syringe', label: 'Jeringas' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setWeaponCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                      weaponCategoryFilter === cat.id
                        ? 'bg-orange-600 text-white border-orange-400 shadow'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.values(WEAPON_REGISTRY)
                  .filter((w) => weaponCategoryFilter === 'all' || w.category === weaponCategoryFilter)
                  .map((w) => {
                  const isSelected = activeWeapon === w.id;
                  return (
                    <button
                      key={w.id}
                      id={`select-weapon-${w.id}`}
                      onClick={() => {
                        onSelectWeapon(w.id);
                        onClose();
                      }}
                      className={`p-3.5 rounded-xl border transition-all text-left flex items-start gap-3 ${
                        isSelected
                          ? 'bg-slate-800 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400'
                          : 'bg-slate-800/60 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0 shadow"
                        style={{ backgroundColor: `${w.color}33`, borderColor: w.color, borderWidth: 1 }}
                      >
                        {w.category === 'tool' && <Magnet className="w-5 h-5 text-cyan-400" />}
                        {w.category === 'firearm' && <Crosshair className="w-5 h-5 text-amber-400" />}
                        {w.category === 'melee' && <Sword className="w-5 h-5 text-slate-200" />}
                        {w.category === 'explosive' && <Bomb className="w-5 h-5 text-red-400" />}
                        {w.category === 'syringe' && <Activity className="w-5 h-5 text-emerald-400" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-white truncate">{w.name}</h4>
                          {isSelected && (
                            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-bold px-1.5 py-0.5 rounded">
                              ACTIVA
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{w.description}</p>
                        <div className="flex items-center gap-2 mt-2 text-[10px] font-semibold text-slate-300">
                          <span>Daño: {w.damage > 0 ? w.damage : w.damage < 0 ? 'Cura' : 'Especial'}</span>
                          <span>•</span>
                          <span className="capitalize">{w.category}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. PROPS & TRAPS */}
          {activeTab === 'props' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Objetos Interactivos, Trampas de Tortura y Peligros Físicos
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <button
                  id="spawn-prop-explosive_barrel"
                  onClick={() => {
                    onSpawnProp('explosive_barrel');
                    onClose();
                  }}
                  className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-red-500 hover:bg-slate-800 transition-all text-center flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Bomb className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-red-400">
                    Barril Explosivo TNT
                  </span>
                  <span className="text-[10px] text-slate-400">Detona con impactos o fuego</span>
                </button>

                <button
                  id="spawn-prop-spinning_blade"
                  onClick={() => {
                    onSpawnProp('spinning_blade');
                    onClose();
                  }}
                  className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-slate-300 hover:bg-slate-800 transition-all text-center flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-600/20 text-slate-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Zap className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-cyan-400">
                    Sierra Rotatoria
                  </span>
                  <span className="text-[10px] text-slate-400">Corta y cercena articulaciones</span>
                </button>

                <button
                  id="spawn-prop-hydraulic_press"
                  onClick={() => {
                    onSpawnProp('hydraulic_press');
                    onClose();
                  }}
                  className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-blue-500 hover:bg-slate-800 transition-all text-center flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Hammer className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-blue-400">
                    Prensa Hidráulica
                  </span>
                  <span className="text-[10px] text-slate-400">Aplastador motorizado continuo</span>
                </button>

                <button
                  id="spawn-prop-jump_pad"
                  onClick={() => {
                    onSpawnProp('jump_pad');
                    onClose();
                  }}
                  className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-emerald-500 hover:bg-slate-800 transition-all text-center flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 -rotate-90" />
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-emerald-400">
                    Cama Elástica / Salto
                  </span>
                  <span className="text-[10px] text-slate-400">Propulsa cuerpos hacia arriba</span>
                </button>

                <button
                  id="spawn-prop-spikes"
                  onClick={() => {
                    onSpawnProp('spikes');
                    onClose();
                  }}
                  className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-red-500 hover:bg-slate-800 transition-all text-center flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Flame className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-red-400">
                    Cama de Pinchos
                  </span>
                  <span className="text-[10px] text-slate-400">Empala y desangra en contacto</span>
                </button>

                <button
                  id="spawn-prop-wooden_box"
                  onClick={() => {
                    onSpawnProp('wooden_box');
                    onClose();
                  }}
                  className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-amber-500 hover:bg-slate-800 transition-all text-center flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-600/20 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Box className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-amber-400">
                    Caja de Madera
                  </span>
                  <span className="text-[10px] text-slate-400">Objeto apilable rompible</span>
                </button>

                <button
                  id="spawn-prop-metal_box"
                  onClick={() => {
                    onSpawnProp('metal_box');
                    onClose();
                  }}
                  className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-slate-400 hover:bg-slate-800 transition-all text-center flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-500/20 text-slate-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Shield className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-slate-300">
                    Caja Metálica Pesada
                  </span>
                  <span className="text-[10px] text-slate-400">Masa pesada de impacto</span>
                </button>

                <button
                  id="spawn-prop-moving-platform"
                  onClick={() => {
                    onSpawnProp('moving_platform');
                    onClose();
                  }}
                  className="p-3.5 rounded-xl bg-slate-800/70 border border-amber-500/60 hover:border-amber-400 hover:bg-slate-800 transition-all text-center flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-2xl">🚧</span>
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-amber-400">
                    Barredora Cinética
                  </span>
                  <span className="text-[10px] text-slate-400">Plataforma móvil veloz a ras de pierna</span>
                </button>

                <button
                  id="spawn-prop-landmine"
                  onClick={() => {
                    onSpawnProp('landmine');
                    onClose();
                  }}
                  className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-green-500 hover:bg-slate-800 transition-all text-center flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-green-600/20 text-green-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Radio className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-green-400">
                    Mina Antipersonal
                  </span>
                  <span className="text-[10px] text-slate-400">Detona al pisarla</span>
                </button>

                <button
                  id="spawn-prop-block-tube"
                  onClick={() => {
                    onSpawnProp('block_tube');
                    onClose();
                  }}
                  className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-emerald-500 hover:bg-slate-800 transition-all text-center flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-2xl">🧱</span>
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-emerald-400">
                    Tubo de Bloques NPC
                  </span>
                  <span className="text-[10px] text-slate-400">Bloque de superficie con tubo y NPC abajo</span>
                </button>

                <button
                  id="spawn-prop-block-3x3"
                  onClick={() => {
                    onSpawnProp('block_3x3');
                    onClose();
                  }}
                  className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-amber-500 hover:bg-slate-800 transition-all text-center flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-2xl">🟩</span>
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-amber-400">
                    Terreno Bloques 3x3
                  </span>
                  <span className="text-[10px] text-slate-400">Matriz 3x3 de bloques de terreno</span>
                </button>

                <button
                  id="spawn-prop-block-arm"
                  onClick={() => {
                    onSpawnProp('block_arm');
                    onClose();
                  }}
                  className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-blue-500 hover:bg-slate-800 transition-all text-center flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-2xl">🦾</span>
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-blue-400">
                    Brazo Bloque
                  </span>
                  <span className="text-[10px] text-slate-400">Brazo físico de bloques</span>
                </button>

                <button
                  id="spawn-prop-block-leg"
                  onClick={() => {
                    onSpawnProp('block_leg');
                    onClose();
                  }}
                  className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-indigo-500 hover:bg-slate-800 transition-all text-center flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-2xl">🦿</span>
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-indigo-400">
                    Pierna Bloque
                  </span>
                  <span className="text-[10px] text-slate-400">Pierna física de bloques</span>
                </button>

                <button
                  id="spawn-prop-block-hand"
                  onClick={() => {
                    onSpawnProp('block_hand');
                    onClose();
                  }}
                  className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-sky-500 hover:bg-slate-800 transition-all text-center flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-sky-600/20 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-2xl">🖐️</span>
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-sky-400">
                    Mano Bloque
                  </span>
                  <span className="text-[10px] text-slate-400">Mano articulada detallada</span>
                </button>

                <button
                  id="spawn-prop-block-head"
                  onClick={() => {
                    onSpawnProp('block_head');
                    onClose();
                  }}
                  className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-amber-500 hover:bg-slate-800 transition-all text-center flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-2xl">👤</span>
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-amber-400">
                    Cabeza Bloque
                  </span>
                  <span className="text-[10px] text-slate-400">Cabeza física de bloques</span>
                </button>

                <button
                  id="spawn-prop-block-torso"
                  onClick={() => {
                    onSpawnProp('block_torso');
                    onClose();
                  }}
                  className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-purple-500 hover:bg-slate-800 transition-all text-center flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-2xl">👕</span>
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-purple-400">
                    Torso Bloque
                  </span>
                  <span className="text-[10px] text-slate-400">Torso físico de bloques</span>
                </button>

                <button
                  id="spawn-prop-block-slime"
                  onClick={() => {
                    onSpawnProp('block_slime');
                    onClose();
                  }}
                  className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-emerald-500 hover:bg-slate-800 transition-all text-center flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-2xl">🟢</span>
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-emerald-400">
                    Cubo de Slime
                  </span>
                  <span className="text-[10px] text-slate-400">Gelatina verde que vibra y se rompe</span>
                </button>

                <button
                  id="spawn-prop-block-skin"
                  onClick={() => {
                    onSpawnProp('block_skin');
                    onClose();
                  }}
                  className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-rose-500 hover:bg-slate-800 transition-all text-center flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-2xl">🥩</span>
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-rose-400">
                    Bloque de Piel
                  </span>
                  <span className="text-[10px] text-slate-400">Tejido blando con física orgánica</span>
                </button>

                <button
                  id="spawn-prop-block-hammer"
                  onClick={() => {
                    onSpawnProp('block_hammer');
                    onClose();
                  }}
                  className="p-3.5 rounded-xl bg-slate-800/70 border border-amber-500/60 hover:border-amber-400 hover:bg-slate-800 transition-all text-center flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-2xl">🔨</span>
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-amber-400">
                    Martillo de Bloques
                  </span>
                  <span className="text-[10px] text-slate-400">Arma pick de sandbox a dos manos</span>
                </button>

                <button
                  id="spawn-liquid"
                  onClick={() => {
                    onSpawnLiquid(liquidQuantity);
                    onClose();
                  }}
                  className="p-3.5 rounded-xl bg-blue-800/70 border border-blue-700 hover:border-blue-400 hover:bg-blue-800 transition-all text-center flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-blue-300">
                    Agua de Liquid
                  </span>
                  <span className="text-[10px] text-slate-400">Fluido físico deformable</span>
                </button>

                {/* Water Quantity Slider */}
                <div className="col-span-2 p-3 rounded-xl bg-blue-900/40 border border-blue-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">Cantidad de Bloques</span>
                    <span className="text-xs font-black text-blue-400">{liquidQuantity}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={liquidQuantity}
                    onChange={(e) => onSetLiquidQuantity(parseInt(e.target.value))}
                    className="w-full accent-blue-500 h-1"
                  />
                </div>

                <button
                  id="spawn-pool"
                  onClick={() => {
                    onSpawnPool();
                    onClose();
                  }}
                  className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-slate-400 hover:bg-slate-800 transition-all text-center flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-600/20 text-slate-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Box className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-slate-300">
                    Piscina
                  </span>
                  <span className="text-[10px] text-slate-400">Contenedor físico</span>
                </button>
              </div>
            </div>
          )}

          {/* 4. MAPS */}
          {activeTab === 'maps' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Selecciona el Escenario de Pruebas Físicas
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.values(GAME_MAPS_3D).map((m) => {
                  const isSelected = currentMapId === m.id || (m.id === 'grass_field' && currentMapId === 'lab');
                  return (
                    <button
                      key={m.id}
                      id={`select-map-${m.id}`}
                      onClick={() => {
                        onSelectMap(m.id);
                        onClose();
                      }}
                      className={`p-4 rounded-xl border transition-all text-left flex items-start gap-3.5 ${
                        isSelected
                          ? 'bg-slate-800 border-purple-500 ring-1 ring-purple-500 shadow-lg shadow-purple-500/20'
                          : 'bg-slate-800/60 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-lg shrink-0">
                        🗺️
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-white">{m.name}</h4>
                          {isSelected && (
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded">
                              ACTUAL
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{m.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                          <span>Gravedad: {m.gravity.y === 0 ? 'Cero G' : `${m.gravity.y} m/s²`}</span>
                          <span>•</span>
                          <span>{m.obstacles.length} Elementos</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. WORLD SETTINGS & GORE */}
          {activeTab === 'world' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Slow Motion Slider */}
                <div className="p-4 rounded-xl bg-slate-800/70 border border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      Velocidad de Tiempo (Cámara Lenta)
                    </span>
                    <span className="text-xs font-black text-cyan-400">{timeScale.toFixed(2)}x</span>
                  </div>
                  <input
                    id="slider-time-scale"
                    type="range"
                    min="0.1"
                    max="1.5"
                    step="0.05"
                    value={timeScale}
                    onChange={(e) => onSetTimeScale(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                    <button onClick={() => onSetTimeScale(0.2)} className="hover:text-white">
                      0.2x Super Slow
                    </button>
                    <button onClick={() => onSetTimeScale(0.5)} className="hover:text-white">
                      0.5x Matrix
                    </button>
                    <button onClick={() => onSetTimeScale(1.0)} className="hover:text-white">
                      1.0x Normal
                    </button>
                  </div>
                </div>

                {/* Gravity Multiplier */}
                <div className="p-4 rounded-xl bg-slate-800/70 border border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Feather className="w-4 h-4 text-blue-400" />
                      Multiplicador de Gravedad
                    </span>
                    <span className="text-xs font-black text-blue-400">{gravityMult.toFixed(1)}g</span>
                  </div>
                  <input
                    id="slider-gravity-mult"
                    type="range"
                    min="0"
                    max="2.5"
                    step="0.1"
                    value={gravityMult}
                    onChange={(e) => onSetGravityMult(parseFloat(e.target.value))}
                    className="w-full accent-blue-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                    <button onClick={() => onSetGravityMult(0)} className="hover:text-white">
                      0g (Flotar)
                    </button>
                    <button onClick={() => onSetGravityMult(0.5)} className="hover:text-white">
                      Lunar 0.5g
                    </button>
                    <button onClick={() => onSetGravityMult(1.0)} className="hover:text-white">
                      Tierra 1.0g
                    </button>
                    <button onClick={() => onSetGravityMult(2.0)} className="hover:text-white">
                      Júpiter 2.0g
                    </button>
                  </div>
                </div>

                {/* Gore Level */}
                <div className="p-4 rounded-xl bg-slate-800/70 border border-slate-700 space-y-2">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Skull className="w-4 h-4 text-red-500" />
                    Intensidad de Sangre y Desmembramiento
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['low', 'normal', 'high'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        id={`gore-btn-${lvl}`}
                        onClick={() => onSetGoreLevel(lvl)}
                        className={`py-2 px-3 rounded-lg text-xs font-bold capitalize transition-all ${
                          goreLevel === lvl
                            ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                            : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {lvl === 'high' ? 'Extremo (Gorebox)' : lvl === 'normal' ? 'Normal' : 'Bajo'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles: X-Ray & Immortal */}
                <div className="p-4 rounded-xl bg-slate-800/70 border border-slate-700 flex flex-col justify-center gap-2">
                  <button
                    id="btn-toggle-xray"
                    onClick={onToggleXRay}
                    className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-bold transition-all ${
                      xRayMode
                        ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                        : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      Visión de Rayos X (Esqueleto y Huesos)
                    </span>
                    <span className="text-[10px] uppercase font-black">{xRayMode ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    id="btn-toggle-immortal"
                    onClick={onToggleImmortal}
                    className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-bold transition-all ${
                      immortalMode
                        ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                        : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4" />
                      Modo Inmortal (Cuerpos Indestructibles)
                    </span>
                    <span className="text-[10px] uppercase font-black">{immortalMode ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              </div>

              {/* Utility Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800">
                <button
                  id="btn-clear-blood"
                  onClick={onClearBlood}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                  Limpiar Toda la Sangre
                </button>
                <button
                  id="btn-revive-all"
                  onClick={onReviveAll}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-bold transition-colors"
                >
                  <Activity className="w-4 h-4" />
                  Revivir y Curar Cuerpos
                </button>
                <button
                  id="btn-clear-all"
                  onClick={onClearAll}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-800/80 hover:bg-red-700 text-white text-xs font-bold transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar Todos los Objetos
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
