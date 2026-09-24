import React from 'react';
import {
  Activity,
  Bomb,
  Crosshair,
  Feather,
  Flame,
  Hammer,
  Magnet,
  Radio,
  Rocket,
  Shield,
  Skull,
  Sparkles,
  Sword,
  Target,
  Zap,
} from 'lucide-react';
import { WEAPON_REGISTRY } from '../engine/weapons';
import { WeaponType } from '../types/physics';

interface QuickWeaponBarProps {
  activeWeapon: WeaponType;
  onSelectWeapon: (weapon: WeaponType) => void;
}

export const QuickWeaponBar: React.FC<QuickWeaponBarProps> = ({ activeWeapon, onSelectWeapon }) => {
  const quickWeapons: WeaponType[] = [
    'physgun',
    'pistol',
    'shotgun',
    'ak47',
    'sniper',
    'rpg',
    'katana',
    'sledgehammer',
    'grenade',
    'syringe_adrenaline',
    'syringe_acid',
  ];

  const getWeaponIcon = (id: WeaponType) => {
    switch (id) {
      case 'physgun':
        return <Magnet className="w-5 h-5" />;
      case 'pistol':
        return <Crosshair className="w-5 h-5" />;
      case 'shotgun':
        return <Zap className="w-5 h-5" />;
      case 'ak47':
        return <Flame className="w-5 h-5" />;
      case 'sniper':
        return <Target className="w-5 h-5" />;
      case 'rpg':
        return <Rocket className="w-5 h-5" />;
      case 'katana':
        return <Sword className="w-5 h-5" />;
      case 'sledgehammer':
        return <Hammer className="w-5 h-5" />;
      case 'grenade':
        return <Bomb className="w-5 h-5" />;
      case 'syringe_adrenaline':
        return <Activity className="w-5 h-5 text-emerald-400" />;
      case 'syringe_acid':
        return <Skull className="w-5 h-5 text-purple-400" />;
      default:
        return <Crosshair className="w-5 h-5" />;
    }
  };

  return (
    <div
      id="quick-weapon-bar"
      className="flex items-center gap-1.5 p-1.5 bg-slate-950/80 backdrop-blur-md border border-slate-700/80 rounded-2xl overflow-x-auto max-w-[92vw] sm:max-w-2xl scrollbar-none shadow-xl"
    >
      {quickWeapons.map((wId) => {
        const info = WEAPON_REGISTRY[wId];
        const isSelected = activeWeapon === wId;
        return (
          <button
            key={wId}
            id={`quick-weapon-${wId}`}
            onClick={() => onSelectWeapon(wId)}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all shrink-0 min-w-[50px] ${
              isSelected
                ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/30 ring-1 ring-cyan-400 scale-105'
                : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={info.name}
          >
            {getWeaponIcon(wId)}
            <span className="text-[9px] font-bold mt-1 tracking-tight truncate max-w-[48px]">
              {info.name.split(' ')[0]}
            </span>
          </button>
        );
      })}
    </div>
  );
};
