import React, { useState, useEffect, useRef } from 'react';
import { Home, Globe, Settings, LogOut, Search, User, Play, Users, RefreshCw, MoreHorizontal, ChevronRight, Check, Sparkles, Store, Loader2, Pencil, Cpu, Wrench, Compass, Send } from 'lucide-react';

export interface ServerInfo {
  id: string;
  name: string;
  mapId: string;
  maxPlayers: number;
  playerCount: number;
  pingMs: number;
  status: string;
}

interface GameMenuModalProps {
  isOpen: boolean;
  onStartSingleplayer: (mapId: string) => void;
  onJoinMultiplayer: (server: ServerInfo, playerName: string) => void;
  onClose?: () => void;
  currentMapId?: string;
  onOpenAvatarEditor?: () => void;
}

// Security Checksum to prevent manual tampering of downloaded account backup files (Anti-Cheat/Anti-Tamper)
export function calculateAccountChecksum(username: string, money: number, isVerified18: boolean, password?: string): string {
  const secretSalt = "gorebox_vps_salt_2026_antitamper";
  const dataString = `${username.trim().toLowerCase()}:${money}:${isVerified18 ? 'true' : 'false'}:${password || ''}:${secretSalt}`;
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

// Simple cipher to encrypt and decrypt the private key text so users cannot easily edit it
export function encryptAccountData(data: any): string {
  const jsonStr = JSON.stringify(data);
  const key = "gorebox_suburbia_super_secret_vps_key_2026";
  let output = "";
  for (let i = 0; i < jsonStr.length; i++) {
    const charCode = jsonStr.charCodeAt(i);
    const keyChar = key.charCodeAt(i % key.length);
    const obfuscated = charCode ^ keyChar;
    output += String.fromCharCode(obfuscated);
  }
  return btoa(unescape(encodeURIComponent(output)));
}

export function decryptAccountData(encryptedStr: string): any {
  let rawStr = "";
  try {
    rawStr = decodeURIComponent(escape(atob(encryptedStr)));
  } catch {
    // If base64 fails, maybe it is raw text or old format
    return JSON.parse(encryptedStr);
  }
  
  const key = "gorebox_suburbia_super_secret_vps_key_2026";
  let jsonStr = "";
  for (let i = 0; i < rawStr.length; i++) {
    const charCode = rawStr.charCodeAt(i);
    const keyChar = key.charCodeAt(i % key.length);
    jsonStr += String.fromCharCode(charCode ^ keyChar);
  }
  return JSON.parse(jsonStr);
}

export function parseAccountFile(fileContent: string): any {
  const parsed = JSON.parse(fileContent);
  if (parsed && parsed.encrypted && typeof parsed.data === 'string') {
    return decryptAccountData(parsed.data);
  }
  return parsed;
}

const PixelGreenCoin = () => (
  <svg 
    width="16" 
    height="16" 
    viewBox="0 0 16 16" 
    className="shrink-0 inline-block align-middle select-none" 
    style={{ imageRendering: 'pixelated' }}
  >
    {/* Dark green border */}
    <path d="M5 0h6v1H5V0zm-2 1h2v1H3V1zm8 0h2v1h-2V1zm-2 1h2v1h-2V2zM2 2h1v1H2V2zm11 0h1v1h-1V2zM1 3h1v2H1V3zm13 0h1v2h-1V3zM0 5h1v6H0V5zm15 0h1v6h-1V5zM1 11h1v2H1v-2zm13 0h1v2h-1v-2zm1 1h1v1h-1v-1zM2 13h1v1H2v-1zm11 0h1v1h-1v-1zm-2 1h2v1h-2v-1zm-6 0h2v1H5v-1zm1 1h4v1H6v-1z" fill="#043214" />
    {/* Coin base fill (green) */}
    <path d="M5 1h6v1H5V1zM3 2h8v1H3V2zm-1 1h12v2H2V3zm-1 2h14v6H1V5zm1 6h12v2H2v-2zm1 2h8v1H3v-1zm2 1h4v1H5v-1z" fill="#22c55e" />
    {/* Light Green highlights */}
    <path d="M5 2h4v1H5V2zM3 3h2v1H3V3zm-1 2h1v4H2V5zm1 4h1v2H3V9z" fill="#8efc9f" />
    {/* Darker green shadow inner */}
    <path d="M12 3h1v4h-1V3zm1 4h1v4h-1V7zm-2 4h1v1h-1v-1zm-2 1h2v1h-2v-1z" fill="#15803d" />
    {/* Pixel '$' symbol in dark green */}
    <path d="M7 4h3v1H7V4zm-1 1h1v2H6V5zm1 2h2v1H7V7zm2 1h1v2H9V8zm-3 2h3v1H6v-1zM8 3h1v9H8V3z" fill="#052e16" />
  </svg>
);

const PlayerAvatarPreview = ({ player }: { player: any }) => {
  const skinColor = player.skinColor || '#e0a96d';
  const faceStyle = player.faceStyle || 'classic';
  
  let faceElements = null;
  if (faceStyle === 'classic') {
    faceElements = (
      <svg viewBox="0 0 16 16" className="w-16 h-16">
        <rect x="4" y="5" width="2" height="2" fill="#000000" />
        <rect x="10" y="5" width="2" height="2" fill="#000000" />
        <rect x="5" y="10" width="6" height="1" fill="#000000" />
        <rect x="4" y="9" width="1" height="1" fill="#000000" />
        <rect x="11" y="9" width="1" height="1" fill="#000000" />
      </svg>
    );
  } else if (faceStyle === 'angry') {
    faceElements = (
      <svg viewBox="0 0 16 16" className="w-16 h-16">
        <path d="M3 4l3 1M13 4l-3 1" stroke="#000000" strokeWidth="1" strokeLinecap="round" />
        <rect x="4" y="6" width="2" height="2" fill="#000000" />
        <rect x="10" y="6" width="2" height="2" fill="#000000" />
        <rect x="5" y="10" width="6" height="1.5" fill="#000000" />
      </svg>
    );
  } else if (faceStyle === 'creepy') {
    faceElements = (
      <svg viewBox="0 0 16 16" className="w-16 h-16">
        <rect x="4" y="5" width="2" height="2" fill="#ef4444" />
        <rect x="10" y="5" width="2" height="2" fill="#ef4444" />
        <path d="M4 9h8v4H4V9z" fill="#000" />
        <path d="M5 9l1 2 1-2M9 9l1 2 1-2" fill="#fff" />
      </svg>
    );
  } else if (faceStyle === 'anime') {
    faceElements = (
      <svg viewBox="0 0 16 16" className="w-16 h-16">
        <rect x="3" y="4" width="3" height="4" rx="1" fill="#ec4899" />
        <rect x="10" y="4" width="3" height="4" rx="1" fill="#ec4899" />
        <rect x="4" y="5" width="1" height="1" fill="#ffffff" />
        <rect x="11" y="5" width="1" height="1" fill="#ffffff" />
        <rect x="2" y="8" width="2" height="1" fill="#fbcfe8" />
        <rect x="12" y="8" width="2" height="1" fill="#fbcfe8" />
        <path d="M7 9.5a1 1 0 012 0" stroke="#000" fill="none" />
      </svg>
    );
  } else if (faceStyle === 'cool') {
    faceElements = (
      <svg viewBox="0 0 16 16" className="w-16 h-16">
        <path d="M2 5h12v3H9L8 6 7 8H2V5z" fill="#111827" />
        <path d="M3 6h2v1H3V6zm7 0h2v1h-10V6z" fill="#ffffff" opacity="0.4" />
        <rect x="6" y="10" width="5" height="1" fill="#000000" />
      </svg>
    );
  } else {
    faceElements = (
      <span className="text-4xl">{player.icon || '👤'}</span>
    );
  }

  return (
    <div 
      className="w-24 h-24 rounded-3xl border-[4px] border-black flex items-center justify-center shadow-lg transition-transform"
      style={{ backgroundColor: skinColor }}
    >
      <div className="w-20 h-20 flex items-center justify-center relative">
        {faceElements}
      </div>
    </div>
  );
};

export const GameMenuModal: React.FC<GameMenuModalProps> = ({
  isOpen,
  onStartSingleplayer,
  onJoinMultiplayer,
  currentMapId = 'lab',
  onOpenAvatarEditor,
}) => {
  const [view, setView] = useState<'main' | 'multiplayer' | 'personalize' | 'settings'>('main');
  const [selectedUserProfile, setSelectedUserProfile] = useState<any | null>(null);
  const [fpsLimit, setFpsLimit] = useState<string>(() => {
    return localStorage.getItem('gorebox_fps_limit') || '60';
  });

  useEffect(() => {
    localStorage.setItem('gorebox_fps_limit', fpsLimit);
    window.dispatchEvent(new CustomEvent('gorebox_fps_change', { detail: fpsLimit }));
  }, [fpsLimit]);
  const [playerPassword, setPlayerPassword] = useState<string>(() => {
    return localStorage.getItem('gorebox_player_password') || '';
  });
  const [personalizeSubView, setPersonalizeSubView] = useState<'choice' | 'avatar' | 'market' | 'plugins'>('choice');
  const [birthdate, setBirthdate] = useState<string>('');
  const [birthdateError, setBirthdateError] = useState<string>('');
  const [unlockedItems, setUnlockedItems] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('gorebox_unlocked_items');
      return saved ? JSON.parse(saved) : ['normal_skin', 'zombie_skin', 'blue_skin', 'classic_face', 'angry_face', 'anime_face'];
    } catch {
      return ['normal_skin', 'zombie_skin', 'blue_skin', 'classic_face', 'angry_face', 'anime_face'];
    }
  });
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('gorebox_player_name') || `Player_${Math.floor(100 + Math.random() * 900)}`;
  });

  const [language, setLanguage] = useState<'en' | 'es'>(() => {
    return (localStorage.getItem('gorebox_game_language') as 'en' | 'es') || 'es';
  });

  const [signedIn, setSignedIn] = useState<boolean>(() => {
    return localStorage.getItem('gorebox_signed_in') === 'true';
  });
  const [isVerified18, setIsVerified18] = useState<boolean>(() => {
    return localStorage.getItem('gorebox_verified_18') === 'true';
  });
  const [isFaceScannerOpen, setIsFaceScannerOpen] = useState<boolean>(false);
  const [faceScanStatus, setFaceScanStatus] = useState<'scanning' | 'success' | 'idle'>('idle');

  const startFaceIdVerification = () => {
    setIsFaceScannerOpen(true);
    setFaceScanStatus('idle');
    setBirthdate('');
    setBirthdateError('');
  };

  // Money & DB States
  const [money, setMoney] = useState<number>(() => {
    return parseInt(localStorage.getItem('gorebox_player_money') || '0', 10);
  });
  const [dbUsers, setDbUsers] = useState<any[]>([]);

  // Admin Panel & Draggable Button states for "Xrency"
  const [adminMenuOpen, setAdminMenuOpen] = useState<boolean>(false);
  const [adminTab, setAdminTab] = useState<'player' | 'rank' | 'records' | 'aprobaciones'>('player');
  const [adminTargetPlayer, setAdminTargetPlayer] = useState<string>('');
  const [adminMoneyAmount, setAdminMoneyAmount] = useState<number>(1000);
  const [adminRankLevel, setAdminRankLevel] = useState<number>(1);
  const [adminRankName, setAdminRankName] = useState<string>('Ayudante');
  const [isRankDropdownOpen, setIsRankDropdownOpen] = useState<boolean>(false);
  const [adminPlayerSearchQuery, setAdminPlayerSearchQuery] = useState<string>('');
  const [adminFeedback, setAdminFeedback] = useState<string>('');
  const [adminAccountsLog, setAdminAccountsLog] = useState<any[]>([]);

  const [pendingServersList, setPendingServersList] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState<boolean>(false);

  const fetchPendingServers = async () => {
    setLoadingPending(true);
    try {
      const res = await fetch('/api/servers/pending');
      if (res.ok) {
        const data = await res.json();
        if (data.pendingServers) {
          setPendingServersList(data.pendingServers);
        }
      }
    } catch (err) {
      console.error("Error fetching pending servers:", err);
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    if (adminMenuOpen && adminTab === 'aprobaciones') {
      fetchPendingServers();
    }
  }, [adminMenuOpen, adminTab]);

  const fetchAdminAccountsLog = async () => {
    try {
      const res = await fetch('/api/vps/admin/accounts');
      if (res.ok) {
        const data = await res.json();
        if (data.accounts && Array.isArray(data.accounts)) {
          setAdminAccountsLog(data.accounts);
        }
      }
    } catch (err) {
      console.error("Error fetching admin accounts log:", err);
    }
  };

  useEffect(() => {
    fetchAdminAccountsLog();
  }, []);

  useEffect(() => {
    if (adminMenuOpen || adminTab === 'records') {
      fetchAdminAccountsLog();
    }
  }, [adminMenuOpen, adminTab]);

  const [adminBtnPos, setAdminBtnPos] = useState({ x: 20, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const [discoverSubMode, setDiscoverSubMode] = useState<'servers' | 'create_menu'>('servers');
  const [serverCreationChoice, setServerCreationChoice] = useState<'create' | 'load'>('create');
  const dragStart = useRef({ x: 0, y: 0 });
  const dragMoved = useRef(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    setIsDragging(true);
    dragMoved.current = false;
    dragStart.current = {
      x: e.clientX - adminBtnPos.x,
      y: e.clientY - adminBtnPos.y
    };
    buttonRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;
    const newX = Math.max(0, Math.min(window.innerWidth - 60, e.clientX - dragStart.current.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragStart.current.y));
    
    if (Math.abs(newX - adminBtnPos.x) > 3 || Math.abs(newY - adminBtnPos.y) > 3) {
      dragMoved.current = true;
    }
    setAdminBtnPos({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    setIsDragging(false);
    buttonRef.current?.releasePointerCapture(e.pointerId);
  };

  const handleAdminGiveMoney = async () => {
    if (!adminTargetPlayer) {
      setAdminFeedback(language === 'es' ? 'Selecciona un jugador' : 'Select a player');
      return;
    }
    try {
      const getRes = await fetch(`/api/vps/user/${encodeURIComponent(adminTargetPlayer)}`);
      let currentMoney = 0;
      if (getRes.ok) {
        const d = await getRes.json();
        currentMoney = d.user?.money || 0;
      }
      const newMoney = currentMoney + adminMoneyAmount;

      await fetch('/api/vps/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminTargetPlayer, money: newMoney })
      });

      if (adminTargetPlayer.toLowerCase() === playerName.toLowerCase()) {
        setMoney(newMoney);
        localStorage.setItem('gorebox_player_money', newMoney.toString());
      }

      setAdminFeedback(
        language === 'es' 
          ? `¡Dinero entregado con éxito! Nuevo saldo: ☘️${newMoney}`
          : `Money added successfully! New balance: ☘️${newMoney}`
      );
      
      fetchAllUsersFromVps();
    } catch (err) {
      console.error("Error giving money as admin via VPS:", err);
      setAdminFeedback(language === 'es' ? 'Error al actualizar el servidor' : 'Server update error');
    }
  };

  const handleAdminChangeRank = async () => {
    if (!adminTargetPlayer) {
      setAdminFeedback(language === 'es' ? 'Selecciona un jugador' : 'Select a player');
      return;
    }
    const rankMap: { [key: string]: number } = {
      'Ayudante': 10,
      'Mod': 20,
      'Super Mod': 30,
      'Administrador': 50,
      'Super Administrador': 100
    };
    const levelToSave = rankMap[adminRankName] || 1;

    try {
      await fetch('/api/vps/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: adminTargetPlayer, 
          level: levelToSave,
          rankName: adminRankName
        })
      });

      setAdminFeedback(
        language === 'es' 
          ? `¡Rango cambiado a "${adminRankName}" con éxito!`
          : `Rank successfully changed to "${adminRankName}"!`
      );
      
      fetchAllUsersFromVps();
    } catch (err) {
      console.error("Error changing rank as admin via VPS:", err);
      setAdminFeedback(language === 'es' ? 'Error al actualizar rango en el servidor' : 'Server rank update error');
    }
  };

  const showAdminFeatures = signedIn && (playerName.trim().toLowerCase() === 'xrency' || playerName.trim().toLowerCase() === 'xrenxy');

  const PendingServerCard = ({ server, language, onApproved, onRejected }: any) => {
    const [showSection, setShowSection] = useState<'user' | 'server' | null>(null);
    const [ownerDetails, setOwnerDetails] = useState<any | null>(null);
    const [loadingOwner, setLoadingOwner] = useState(false);

    const handleShowUser = async () => {
      if (showSection === 'user') {
        setShowSection(null);
        return;
      }
      setShowSection('user');
      if (!ownerDetails) {
        setLoadingOwner(true);
        try {
          const res = await fetch(`/api/vps/user/${encodeURIComponent(server.ownerName)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              setOwnerDetails(data.user);
            }
          }
        } catch (err) {
          console.error("Error loading owner details:", err);
        } finally {
          setLoadingOwner(false);
        }
      }
    };

    const handleShowServer = () => {
      setShowSection(showSection === 'server' ? null : 'server');
    };

    const handleApprove = async () => {
      try {
        const myPrivateKey = localStorage.getItem('gorebox_admin_private_key') || `pk_${playerName.toLowerCase()}_baughborxd_gorebox_staff`;
        const res = await fetch('/api/servers/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id: server.id,
            approvedBy: playerName,
            approvedByPrivateKey: myPrivateKey
          })
        });
        const data = await res.json();
        if (res.ok) {
          alert(language === 'es' ? `¡Servidor aprobado y firmado digitalmente con éxito!` : `Server approved and digitally signed successfully!`);
          onApproved();
        } else {
          alert(data.error || 'Error approving server');
        }
      } catch (err) {
        console.error(err);
        alert('Connection error');
      }
    };

    const handleReject = async () => {
      try {
        const res = await fetch('/api/servers/reject', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: server.id })
        });
        if (res.ok) {
          onRejected();
        } else {
          alert('Error rejecting server');
        }
      } catch (err) {
        console.error(err);
      }
    };

    return (
      <div className="bg-zinc-950 border-2 border-[#00ff00]/60 rounded-2xl p-4 space-y-3 shadow-[0_0_15px_rgba(0,255,0,0.1)] text-white font-mono text-xs">
        <div className="flex items-center justify-between border-b border-[#00ff00]/30 pb-2">
          <span className="font-bold text-[#00ff00] truncate flex-1">🖥️ {server.name}</span>
          <span className="text-[10px] bg-amber-500/10 border border-amber-500/40 text-amber-400 px-2.5 py-0.5 rounded uppercase font-black animate-pulse">
            PENDIENTE
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleShowUser}
            className={`py-1.5 rounded-lg border font-black uppercase text-[10px] transition-all cursor-pointer ${
              showSection === 'user'
                ? 'bg-[#00ff00] text-black border-[#00ff00]'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            👤 JUGADOR
          </button>
          <button
            type="button"
            onClick={handleShowServer}
            className={`py-1.5 rounded-lg border font-black uppercase text-[10px] transition-all cursor-pointer ${
              showSection === 'server'
                ? 'bg-[#00ff00] text-black border-[#00ff00]'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            🖥️ SERVIDOR
          </button>
        </div>

        {showSection === 'user' && (
          <div className="bg-zinc-900/50 rounded-xl p-3 border border-zinc-800 text-[11px] space-y-1.5 text-zinc-300">
            {loadingOwner ? (
              <div className="text-center text-[#00ff00] font-bold py-1">CONSULTANDO BASE DE DATOS...</div>
            ) : ownerDetails ? (
              <>
                <div className="flex justify-between"><span className="text-zinc-500">CREADOR:</span> <span className="font-bold text-white">{ownerDetails.username}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">PASSWORD:</span> <code className="bg-red-500/10 text-red-400 border border-red-500/30 px-1 rounded font-mono font-bold">{ownerDetails.password || '123'}</code></div>
                <div className="flex justify-between"><span className="text-zinc-500">DINERO:</span> <span className="text-emerald-400 font-bold">☘️{(ownerDetails.money || 0).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">REGISTRO:</span> <span className="text-zinc-400">{ownerDetails.createdAt ? new Date(ownerDetails.createdAt).toLocaleDateString() : 'N/A'}</span></div>
              </>
            ) : (
              <div className="text-center text-rose-500 font-bold">Cuentas creadas locales no registradas en VPS</div>
            )}
          </div>
        )}

        {showSection === 'server' && (
          <div className="bg-zinc-900/50 rounded-xl p-3 border border-zinc-800 text-[11px] space-y-2 text-zinc-300">
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-zinc-500">MAPA:</span> <span className="text-white block font-bold">{server.mapId === 'cesped2' ? 'Césped Forest 2' : 'Laboratory'}</span></div>
              <div><span className="text-zinc-500">MAX JUGADORES:</span> <span className="text-white block font-bold">{server.maxPlayers || 16}</span></div>
            </div>
            {server.previewImage && (
              <div className="space-y-1.5">
                <span className="text-zinc-500">PORTADA:</span>
                <div className="w-24 h-24 bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden mx-auto rounded-lg">
                  <img src={server.previewImage} alt="Server icon" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t border-zinc-900">
          <button
            type="button"
            onClick={handleReject}
            className="flex-1 py-2 bg-red-950/40 hover:bg-red-900 border border-red-500/40 text-red-400 font-black uppercase text-[10px] rounded-lg transition-all cursor-pointer"
          >
            ❌ RECHAZAR
          </button>
          <button
            type="button"
            onClick={handleApprove}
            className="flex-1 py-2 bg-emerald-950/40 hover:bg-emerald-900 border border-emerald-500/40 text-[#00ff00] font-black uppercase text-[10px] rounded-lg shadow-lg transition-all cursor-pointer"
          >
            ✓ APROBAR CON FIRMA
          </button>
        </div>
      </div>
    );
  };

  const renderAdminUI = () => {
    if (!showAdminFeatures) return null;
    return (
      <>
        {/* Circular Draggable Admin Trigger Button with glass Frutiger Aero design */}
        <button
          ref={buttonRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={() => {
            if (!dragMoved.current) {
              setAdminMenuOpen(!adminMenuOpen);
            }
          }}
          style={{
            left: `${adminBtnPos.x}px`,
            top: `${adminBtnPos.y}px`,
            touchAction: 'none'
          }}
          className="fixed z-[100] w-14 h-14 rounded-full bg-gradient-to-br from-red-600 via-red-500 to-amber-500 hover:from-red-700 hover:via-red-600 hover:to-amber-600 text-white font-mono flex flex-col items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.5),_inset_0_1px_3px_rgba(255,255,255,0.4)] border-2 border-white select-none cursor-grab active:cursor-grabbing transition-transform active:scale-95 duration-75 p-0"
          title="Staff Console (Arrastrame / Draggable)"
        >
          {/* Pulsing online status indicator badge */}
          <div className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border border-white"></span>
          </div>
          <span className="text-[7px] font-bold opacity-80 tracking-widest leading-none mb-0.5">STAFF</span>
          <span className="text-[10px] font-black tracking-tighter leading-none text-white uppercase">admin</span>
        </button>

        {/* Remade Sleek Hacker Admin Panel */}
        {adminMenuOpen && (
          <div className="fixed inset-0 z-[101] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-zinc-950 border-4 border-[#00ff00] rounded-3xl w-full max-w-[460px] h-[580px] max-h-[90vh] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,255,0,0.3)] animate-in zoom-in-95 duration-200">
              
              {/* Terminal Header */}
              <div className="bg-[#00ff00] text-black px-5 py-3.5 flex items-center justify-between shrink-0 border-b-2 border-black font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-xl">☣️</span>
                  <span className="font-black text-xs uppercase tracking-widest text-black">SUBURBIA STAFF PORTAL v4.2</span>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setAdminMenuOpen(false);
                    setAdminFeedback('');
                  }}
                  className="w-7 h-7 rounded-lg bg-black text-[#00ff00] hover:bg-zinc-900 border border-[#00ff00] flex items-center justify-center font-black text-xs transition-transform active:scale-90 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Console Tabs Row */}
              <div className="bg-zinc-900 p-2.5 flex items-center gap-1 overflow-x-auto scrollbar-none shrink-0 border-b border-[#00ff00]/20">
                {[
                  { id: 'player', label: '👤 GRUPO' },
                  { id: 'rank', label: '🏆 RANGO' },
                  { id: 'records', label: '📋 CUENTAS' },
                  { id: 'aprobaciones', label: '🖥️ SERVERS' },
                  { id: 'paint', label: '🎨 PORTADA' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setAdminTab(tab.id as any);
                      setAdminFeedback('');
                      if (tab.id === 'aprobaciones') fetchPendingServers();
                      if (tab.id === 'records') fetchAdminAccountsLog();
                    }}
                    className={`px-3 py-1.5 rounded-lg font-mono font-black text-[9px] uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                      adminTab === tab.id
                        ? 'bg-[#00ff00] text-black shadow-inner font-extrabold'
                        : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Scrollable Content Container */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 font-mono text-zinc-300">
                
                {/* Global Status/Feedback banner */}
                {adminFeedback && (
                  <div className="p-3 rounded-xl bg-zinc-900 border border-[#00ff00]/60 text-[#00ff00] text-[10px] font-bold text-center flex items-center justify-center gap-1.5 shadow-[0_0_10px_rgba(0,255,0,0.1)]">
                    <span className="text-xs">▶</span>
                    <span>{adminFeedback}</span>
                  </div>
                )}

                {/* Sub-modules */}

                {/* Target Player Search/Selection Area */}
                {(adminTab === 'player' || adminTab === 'rank') && (
                  <div className="space-y-2 bg-zinc-900/50 p-3.5 border border-zinc-800/80 rounded-2xl">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">
                      SELECCIÓN DE OBJETIVO (JUGADOR ACTIVO)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={adminPlayerSearchQuery}
                        onChange={(e) => setAdminPlayerSearchQuery(e.target.value)}
                        placeholder="Escribe el nombre del jugador para buscar..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono font-bold text-white outline-none focus:border-[#00ff00] transition-all placeholder-zinc-600"
                      />
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">🔍</span>
                      {adminPlayerSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setAdminPlayerSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white font-bold text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Auto-suggest results */}
                    {adminPlayerSearchQuery && (
                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl mt-1.5 max-h-36 overflow-y-auto shadow-2xl divide-y divide-zinc-900/80">
                        {allSearchablePlayers
                          .filter(p => p.name.toLowerCase().includes(adminPlayerSearchQuery.toLowerCase()))
                          .map(p => (
                            <button
                              key={p.name}
                              type="button"
                              onClick={() => {
                                setAdminTargetPlayer(p.name);
                                setAdminPlayerSearchQuery('');
                              }}
                              className={`w-full text-left px-3.5 py-2 text-xs font-bold font-mono flex items-center justify-between hover:bg-zinc-900 ${adminTargetPlayer === p.name ? 'text-[#00ff00] bg-zinc-900/50' : 'text-zinc-300'}`}
                            >
                              <span className="flex items-center gap-2">
                                <span>{p.icon || '👤'}</span>
                                <span>{p.name}</span>
                              </span>
                              <span className="text-[10px] text-zinc-500">☘️{p.money.toLocaleString()}</span>
                            </button>
                          ))
                        }
                        {allSearchablePlayers.filter(p => p.name.toLowerCase().includes(adminPlayerSearchQuery.toLowerCase())).length === 0 && (
                          <div className="p-3 text-center text-[11px] text-zinc-600">No se encontraron registros</div>
                        )}
                      </div>
                    )}

                    {adminTargetPlayer && (
                      <div className="text-[10px] font-black text-[#00ff00] bg-[#00ff00]/5 border border-[#00ff00]/20 px-3.5 py-2.5 rounded-xl flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span>🎯 JUGADOR ACTIVO:</span>
                          <strong className="underline text-white font-black">{adminTargetPlayer}</strong>
                        </span>
                        <button type="button" onClick={() => setAdminTargetPlayer('')} className="text-zinc-500 hover:text-white font-bold">✕</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab Content: Give Money */}
                {adminTab === 'player' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5 bg-zinc-900/30 p-3 rounded-2xl border border-zinc-800">
                      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">CANTIDAD DE DINERO (SUBURBIA COINS)</label>
                      <input
                        type="number"
                        min="1"
                        max="999999"
                        value={adminMoneyAmount}
                        onChange={(e) => setAdminMoneyAmount(parseInt(e.target.value) || 0)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-[#00ff00] outline-none focus:border-[#00ff00]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAdminGiveMoney}
                      className="w-full py-3 bg-[#00ff00]/10 hover:bg-[#00ff00]/20 border-2 border-[#00ff00] text-[#00ff00] font-mono font-black text-[11px] uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(0,255,0,0.15)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <span>💸</span> ENTREGAR Y MODIFICAR BASE DE DATOS
                    </button>
                  </div>
                )}

                {/* Tab Content: Change Rank */}
                {adminTab === 'rank' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5 bg-zinc-900/30 p-3 rounded-2xl border border-zinc-800 relative">
                      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1">RANGOS DISPONIBLES DE STAFF</label>
                      <button
                        type="button"
                        onClick={() => setIsRankDropdownOpen(!isRankDropdownOpen)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-mono font-black text-white flex items-center justify-between transition-colors shadow-inner"
                      >
                        <span className="flex items-center gap-2 text-[#00ff00]">
                          <span>🛡️</span>
                          <span>{adminRankName.toUpperCase()}</span>
                        </span>
                        <span className="text-zinc-500 text-[9px]">{isRankDropdownOpen ? '▲' : '▼'}</span>
                      </button>

                      {isRankDropdownOpen && (
                        <div className="absolute left-3 right-3 mt-1 bg-zinc-950 border-2 border-[#00ff00]/60 rounded-xl shadow-2xl z-40 divide-y divide-zinc-900 overflow-hidden animate-in fade-in duration-100">
                          {['Ayudante', 'Mod', 'Super Mod', 'Administrador', 'Super Administrador'].map((rank) => (
                            <button
                              key={rank}
                              type="button"
                              onClick={() => {
                                setAdminRankName(rank);
                                setIsRankDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors hover:bg-zinc-900 flex items-center justify-between ${adminRankName === rank ? 'text-[#00ff00]' : 'text-zinc-400'}`}
                            >
                              <span>{rank.toUpperCase()}</span>
                              {adminRankName === rank && <span>✓</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleAdminChangeRank}
                      className="w-full py-3 bg-[#00ff00]/10 hover:bg-[#00ff00]/20 border-2 border-[#00ff00] text-[#00ff00] font-mono font-black text-[11px] uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <span>🏆</span> APLICAR NIVEL DE STAFF A VPS
                    </button>
                  </div>
                )}

                {/* Tab Content: Live Accounts list */}
                {adminTab === 'records' && (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                      <span className="text-[10px] font-black text-zinc-500 tracking-wider">CUENTAS REGISTRADAS EN LA RED</span>
                      <button
                        type="button"
                        onClick={fetchAdminAccountsLog}
                        className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold text-[9px] rounded-lg transition-all active:scale-95 cursor-pointer"
                      >
                        🔄 RECARGAR
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {adminAccountsLog.length === 0 ? (
                        <div className="text-center py-8 text-zinc-600 font-bold text-[11px]">CONSULTANDO VPS...</div>
                      ) : (
                        adminAccountsLog.map((acc: any, idx: number) => (
                          <div key={idx} className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 space-y-2 shadow-inner">
                            <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5">
                              <span className="font-black text-xs text-white flex items-center gap-1.5">
                                <span>👤</span> {acc.username}
                              </span>
                              <span className="text-[#00ff00] font-black text-xs">
                                ☘️{(acc.money || 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400">
                              <div><span className="text-zinc-600 font-bold">KEY:</span> <code className="bg-red-500/10 border border-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-mono font-bold text-[9px]">{acc.password || 'N/A'}</code></div>
                              <div><span className="text-zinc-600 font-bold">ROL:</span> <span className="text-[#00ff00] uppercase font-black">{acc.role || ((acc.level || 1) >= 50 ? 'ADMIN' : 'USER')}</span></div>
                              <div className="col-span-2 truncate"><span className="text-zinc-600 font-bold">FECHA:</span> <span className="text-zinc-500">{acc.createdAt ? new Date(acc.createdAt).toLocaleString() : 'N/A'}</span></div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Tab Content: Portada Paint Canvas */}
                {adminTab === 'paint' && (
                  <div className="space-y-3 bg-zinc-900/20 p-4 border border-zinc-800 rounded-3xl">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">DIBUJO DE PORTADA / ICONO PERSONALIZADO</p>
                    
                    <div className="flex flex-col items-center gap-3 bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                      <canvas 
                        ref={(el) => {
                          if (el && !el.dataset.initialized) {
                            el.dataset.initialized = 'true';
                            const ctx = el.getContext('2d');
                            if (ctx) {
                              ctx.fillStyle = '#09090b';
                              ctx.fillRect(0, 0, 120, 120);
                            }
                          }
                        }}
                        id="admin-paint-canvas"
                        width={120}
                        height={120}
                        className="w-36 h-36 bg-zinc-950 border-2 border-[#00ff00] rounded-2xl cursor-crosshair touch-none shadow-inner shadow-black"
                        onMouseDown={(e) => {
                          const canvas = e.currentTarget;
                          const ctx = canvas.getContext('2d');
                          if (!ctx) return;
                          ctx.strokeStyle = '#00ff00';
                          ctx.lineWidth = 6;
                          ctx.lineCap = 'round';
                          const rect = canvas.getBoundingClientRect();
                          const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
                          const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
                          ctx.beginPath();
                          ctx.moveTo(x, y);
                          canvas.dataset.drawing = 'true';
                        }}
                        onMouseMove={(e) => {
                          const canvas = e.currentTarget;
                          if (canvas.dataset.drawing !== 'true') return;
                          const ctx = canvas.getContext('2d');
                          if (!ctx) return;
                          const rect = canvas.getBoundingClientRect();
                          const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
                          const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
                          ctx.lineTo(x, y);
                          ctx.stroke();
                        }}
                        onMouseUp={(e) => { e.currentTarget.dataset.drawing = 'false'; }}
                        onMouseLeave={(e) => { e.currentTarget.dataset.drawing = 'false'; }}
                        onTouchStart={(e) => {
                          const canvas = e.currentTarget;
                          const ctx = canvas.getContext('2d');
                          if (!ctx || e.touches.length === 0) return;
                          ctx.strokeStyle = '#00ff00';
                          ctx.lineWidth = 6;
                          ctx.lineCap = 'round';
                          const rect = canvas.getBoundingClientRect();
                          const x = ((e.touches[0].clientX - rect.left) / rect.width) * canvas.width;
                          const y = ((e.touches[0].clientY - rect.top) / rect.height) * canvas.height;
                          ctx.beginPath();
                          ctx.moveTo(x, y);
                          canvas.dataset.drawing = 'true';
                          e.preventDefault();
                        }}
                        onTouchMove={(e) => {
                          const canvas = e.currentTarget;
                          if (canvas.dataset.drawing !== 'true' || e.touches.length === 0) return;
                          const ctx = canvas.getContext('2d');
                          if (!ctx) return;
                          const rect = canvas.getBoundingClientRect();
                          const x = ((e.touches[0].clientX - rect.left) / rect.width) * canvas.width;
                          const y = ((e.touches[0].clientY - rect.top) / rect.height) * canvas.height;
                          ctx.lineTo(x, y);
                          ctx.stroke();
                          e.preventDefault();
                        }}
                        onTouchEnd={(e) => { e.currentTarget.dataset.drawing = 'false'; }}
                      />

                      <div className="flex gap-2 w-full mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const canvas = document.getElementById('admin-paint-canvas') as HTMLCanvasElement;
                            if (!canvas) return;
                            const ctx = canvas.getContext('2d');
                            if (!ctx) return;
                            ctx.fillStyle = '#09090b';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            setAdminFeedback('Lienzo limpiado');
                          }}
                          className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 font-bold text-[10px] uppercase rounded-xl cursor-pointer transition-all active:scale-95"
                        >
                          LIMPIAR
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const canvas = document.getElementById('admin-paint-canvas') as HTMLCanvasElement;
                            if (!canvas) return;
                            const dataUrl = canvas.toDataURL('image/png');
                            setServerPreviewDataUrl(dataUrl);
                            setAdminFeedback('¡Dibujo de portada guardado para la creación de tu servidor!');
                          }}
                          className="flex-1 py-2 bg-[#00ff00] hover:bg-[#00dd00] text-black font-black text-[10px] uppercase rounded-xl shadow-lg cursor-pointer transition-all active:scale-95"
                        >
                          GUARDAR DIBUJO
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab Content: Aprobación de Servidores con el nuevo sistema */}
                {adminTab === 'aprobaciones' && (
                  <div className="space-y-4">
                    {/* Sub-tab Selection */}
                    <div className="flex gap-2 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setAdminAprobacionesSubTab('pending');
                          fetchPendingServers();
                        }}
                        className={`flex-1 py-2 text-[10px] font-black rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                          adminAprobacionesSubTab === 'pending'
                            ? 'bg-[#00ff00] text-black font-extrabold'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        PENDIENTES
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminAprobacionesSubTab('registry');
                          fetchRegistryServers();
                        }}
                        className={`flex-1 py-2 text-[10px] font-black rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                          adminAprobacionesSubTab === 'registry'
                            ? 'bg-[#00ff00] text-black font-extrabold'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        REGISTRO GLOBAL
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminAprobacionesSubTab('waiting');
                          fetchServers();
                        }}
                        className={`flex-1 py-2 text-[10px] font-black rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                          adminAprobacionesSubTab === 'waiting'
                            ? 'bg-[#00ff00] text-black font-extrabold'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        ⏳ EN ESPERA
                      </button>
                    </div>

                    {adminAprobacionesSubTab === 'pending' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-zinc-900 pb-1">
                          <span className="text-[10px] font-bold text-zinc-500">COLA DE APROBACIÓN DE SERVIDORES</span>
                          <button
                            type="button"
                            onClick={fetchPendingServers}
                            className="text-[9px] text-[#00ff00] font-black underline bg-transparent"
                          >
                            [RECARGAR COLA]
                          </button>
                        </div>

                        <div className="space-y-3.5">
                          {loadingPending ? (
                            <div className="text-center py-6 text-zinc-400 font-bold flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin text-[#00ff00]" />
                              <span>CARGANDO COLA DE VPS...</span>
                            </div>
                          ) : pendingServersList.length === 0 ? (
                            <div className="text-center py-8 text-zinc-600 font-black text-xs border border-dashed border-zinc-900 rounded-2xl bg-zinc-950/20">
                              NINGÚN SERVIDOR ESPERANDO APROBACIÓN
                            </div>
                          ) : (
                            pendingServersList.map((server: any) => (
                              <PendingServerCard 
                                key={server.id} 
                                server={server} 
                                language={language}
                                onApproved={fetchPendingServers}
                                onRejected={fetchPendingServers}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {adminAprobacionesSubTab === 'registry' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-zinc-900 pb-1">
                          <span className="text-[10px] font-bold text-zinc-500">REGISTRO DE SERVIDORES AUTORIZADOS</span>
                          <button
                            type="button"
                            onClick={fetchRegistryServers}
                            className="text-[9px] text-[#00ff00] font-black underline bg-transparent"
                          >
                            [RECARGAR REGISTRO]
                          </button>
                        </div>

                        {/* List of approved servers from DB and presence info */}
                        <div className="space-y-3">
                          {loadingRegistry ? (
                            <div className="text-center py-6 text-zinc-400 font-bold flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin text-[#00ff00]" />
                              <span>CARGANDO REGISTRO...</span>
                            </div>
                          ) : registryServersList.length === 0 ? (
                            <div className="text-center py-8 text-zinc-600 font-black text-xs border border-dashed border-zinc-900 rounded-2xl bg-zinc-950/20">
                              EL REGISTRO ESTÁ VACÍO
                            </div>
                          ) : (
                            registryServersList.map((server: any, idx: number) => {
                              const isApproved = server.status === 'approved';
                              const approver = server.approvedBy || 'xrency';
                              const isApproverOnline = server.isApproverOnline;
                              
                              return (
                                <div key={idx} className="bg-zinc-950 border border-zinc-900 p-4 rounded-2xl flex flex-col gap-2.5 text-[11px] font-mono shadow-inner shadow-black">
                                  <div className="flex items-start justify-between border-b border-zinc-900 pb-2">
                                    <div>
                                      <h5 className="font-extrabold text-white text-xs truncate">🖥️ {server.name}</h5>
                                      <p className="text-[9px] text-zinc-500 mt-0.5 font-bold">
                                        PROPIETARIO: <strong className="text-pink-400">{server.ownerName}</strong>
                                      </p>
                                    </div>
                                    <div>
                                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${isApproved ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'}`}>
                                        {server.status}
                                      </span>
                                    </div>
                                  </div>

                                  {isApproved && (
                                    <div className="space-y-2">
                                      {/* Security Metadata & Presence Status Checklist */}
                                      <div className="bg-zinc-900/40 border border-zinc-900 p-2.5 rounded-xl text-[10px] space-y-1">
                                        <div className="flex items-center justify-between">
                                          <span className="text-zinc-500">APROBADO POR:</span>
                                          <span className="text-white font-black">{approver}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-zinc-500">ESTADO DEL STAFF:</span>
                                          <span className={`font-black flex items-center gap-1 ${isApproverOnline ? 'text-emerald-400' : 'text-rose-500 animate-pulse'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${isApproverOnline ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'}`}></span>
                                            {isApproverOnline ? 'ONLINE' : 'OFFLINE'}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[9px] text-zinc-600 font-mono truncate">
                                          <span>FIRMA PRIVATE-KEY:</span>
                                          <span className="text-[#00ff00] font-bold">{server.approvedByPrivateKey ? server.approvedByPrivateKey.slice(0, 18) + '...' : 'pk_default_legacy'}</span>
                                        </div>
                                      </div>

                                      {/* Revoke Permission button */}
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (!confirm(language === 'es' 
                                            ? `¿Estás seguro de que quieres quitarle el permiso de aprobación al servidor "${server.name}" de "${server.ownerName}"?` 
                                            : `Are you sure you want to revoke the approval of "${server.name}" owned by "${server.ownerName}"?`
                                          )) return;

                                          try {
                                            const res = await fetch('/api/servers/revoke', {
                                              method: 'POST',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({
                                                ownerName: server.ownerName,
                                                serverName: server.name,
                                              })
                                            });
                                            const rdata = await res.json();
                                            if (res.ok) {
                                              alert(rdata.message || 'Revocación exitosa!');
                                              fetchRegistryServers();
                                            } else {
                                              alert(rdata.error || 'Error');
                                            }
                                          } catch (e) {
                                            console.error(e);
                                            alert('Error de conexión');
                                          }
                                        }}
                                        className="w-full py-1.5 bg-rose-950/20 hover:bg-rose-900/60 border border-rose-500/40 text-rose-400 font-bold text-[9px] uppercase rounded-xl transition-all active:scale-95 cursor-pointer"
                                      >
                                        REVOCAR PERMISO DE PUBLICACIÓN (QUITAR FIRMA)
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}

                    {adminAprobacionesSubTab === 'waiting' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-zinc-900 pb-1">
                          <span className="text-[10px] font-bold text-zinc-500">SERVIDORES EN ESPERA DE USUARIOS</span>
                          <button
                            type="button"
                            onClick={fetchServers}
                            className="text-[9px] text-[#00ff00] font-black underline bg-transparent"
                          >
                            [RECARGAR LISTA]
                          </button>
                        </div>

                        <div className="space-y-3">
                          {isLoadingServers ? (
                            <div className="text-center py-6 text-zinc-400 font-bold flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin text-[#00ff00]" />
                              <span>ESCANEANDO SERVIDORES...</span>
                            </div>
                          ) : (() => {
                            const waitingServersList = servers.filter(s => (s.playerCount ?? 0) === 0);
                            if (waitingServersList.length === 0) {
                              return (
                                <div className="text-center py-8 text-zinc-600 font-black text-xs border border-dashed border-zinc-900 rounded-2xl bg-zinc-950/20 leading-relaxed px-4">
                                  TODOS LOS SERVIDORES ACTIVOS TIENEN JUGADORES O NO HAY NINGÚN SERVIDOR PÚBLICO DISPONIBLE
                                </div>
                              );
                            }
                            return waitingServersList.map((server, idx) => (
                              <div key={idx} className="bg-zinc-950 border border-zinc-900 p-4 rounded-2xl flex flex-col gap-2.5 text-[11px] font-mono shadow-inner shadow-black animate-in fade-in-50 duration-200">
                                <div className="flex items-start justify-between border-b border-zinc-900 pb-2">
                                  <div>
                                    <h5 className="font-extrabold text-[#00ff00] text-xs truncate">🖥️ {server.name}</h5>
                                    <p className="text-[9px] text-zinc-500 mt-0.5 font-bold">
                                      MAPA: <strong className="text-pink-400 uppercase">{server.mapId}</strong>
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className="px-2 py-0.5 rounded text-[8px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
                                      SIN JUGADORES
                                    </span>
                                    <span className="text-[8px] text-zinc-600 font-bold mt-1">
                                      PING: {server.pingMs || 15}ms
                                    </span>
                                  </div>
                                </div>

                                <div className="bg-zinc-900/40 border border-zinc-900 p-2.5 rounded-xl text-[10px] space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-zinc-500">ID SERVIDOR:</span>
                                    <span className="text-white font-mono font-bold text-[9px]">{server.id}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-zinc-500">CAPACIDAD MÁXIMA:</span>
                                    <span className="text-white font-bold">{server.maxPlayers || 16} JUGADORES</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-zinc-500">JUGADORES ACTUALES:</span>
                                    <span className="text-rose-400 font-black animate-pulse">0 JUGADORES</span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    alert(language === 'es' ? `Uniendo al servidor '${server.name}'...` : `Joining server '${server.name}'...`);
                                    setAdminMenuOpen(false);
                                  }}
                                  className="w-full py-1.5 bg-[#00ff00]/10 hover:bg-[#00ff00]/30 border border-[#00ff00]/40 text-[#00ff00] font-black text-[9px] uppercase rounded-xl transition-all active:scale-95 cursor-pointer"
                                >
                                  INGRESAR COMO ADMINISTRADOR / PROBAR CONEXIÓN
                                </button>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  // Auth States
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [registeredDataForDownload, setRegisteredDataForDownload] = useState<any | null>(null);
  const [showDownloadBtn, setShowDownloadBtn] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authName, setAuthName] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [authSuccess, setAuthSuccess] = useState<string>('');
  const [adminConfirmOpen, setAdminConfirmOpen] = useState<boolean>(false);
  const [adminConfirmPassword, setAdminConfirmPassword] = useState<string>('');
  const [adminConfirmError, setAdminConfirmError] = useState<string>('');
  const [adminConfirmed, setAdminConfirmed] = useState<boolean>(false);
  const [hasDownloadedKey, setHasDownloadedKey] = useState<boolean>(false);
  const [registerBirthdate, setRegisterBirthdate] = useState<string>('');

  const [mySavedServers, setMySavedServers] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('gorebox_my_saved_servers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [adminAprobacionesSubTab, setAdminAprobacionesSubTab] = useState<'pending' | 'registry' | 'waiting'>('pending');
  const [registryServersList, setRegistryServersList] = useState<any[]>([]);
  const [loadingRegistry, setLoadingRegistry] = useState<boolean>(false);

  const fetchRegistryServers = async () => {
    setLoadingRegistry(true);
    try {
      const res = await fetch('/api/servers/registry');
      if (res.ok) {
        const data = await res.json();
        if (data.servers) {
          setRegistryServersList(data.servers);
        }
      }
    } catch (err) {
      console.error("Error fetching registry servers:", err);
    } finally {
      setLoadingRegistry(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('gorebox_my_saved_servers', JSON.stringify(mySavedServers));
  }, [mySavedServers]);

  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Personalization State (Stored locally)
  const [skinPreset, setSkinPreset] = useState<string>(() => localStorage.getItem('gbox_skin_preset') || 'normal');
  const [skinColor, setSkinColor] = useState<string>(() => localStorage.getItem('gbox_skin_color') || '#e0a96d');
  const [faceStyle, setFaceStyle] = useState<string>(() => localStorage.getItem('gbox_face_style') || 'classic');
  const [headScale, setHeadScale] = useState<number>(() => parseFloat(localStorage.getItem('gbox_head_scale') || '1.0'));

  const [isLoadingServers, setIsLoadingServers] = useState<boolean>(false);
  const [servers, setServers] = useState<ServerInfo[]>([
    {
      id: 'server-1',
      name: 'Default Server',
      mapId: 'cesped2',
      maxPlayers: 16,
      playerCount: 1,
      pingMs: 14,
      status: 'ONLINE',
    },
    {
      id: 'server-3',
      name: 'Deathmatch Arena',
      mapId: 'cesped2',
      maxPlayers: 24,
      playerCount: 12,
      pingMs: 25,
      status: 'ONLINE',
    },
    {
      id: 'server-4',
      name: 'Roleplay Downtown',
      mapId: 'lab',
      maxPlayers: 32,
      playerCount: 30,
      pingMs: 45,
      status: 'ONLINE',
    }
  ]);

  const recommendedServers = React.useMemo(() => {
    return [...servers].sort(() => 0.5 - Math.random()).slice(0, 2);
  }, [servers]);

  const fetchServers = async () => {
    setIsLoadingServers(true);
    try {
      const viewerParam = playerName ? `?viewer=${encodeURIComponent(playerName)}` : '';
      const res = await fetch(`/api/servers${viewerParam}`);
      if (res.ok) {
        const data = await res.json();
        if (data.servers && Array.isArray(data.servers)) {
          setServers(data.servers);
        }
      }
    } catch {
      // Fallback local list if offline
    } finally {
      setIsLoadingServers(false);
    }
  };

  const fetchAllUsersFromVps = async () => {
    try {
      const res = await fetch('/api/vps/users');
      if (res.ok) {
        const data = await res.json();
        if (data.users && Array.isArray(data.users)) {
          setDbUsers(data.users);
        }
      }
    } catch (err) {
      console.error("Error fetching users from VPS:", err);
    }
  };

  useEffect(() => {
    fetchAllUsersFromVps();
  }, []);

  useEffect(() => {
    if (searchOpen) {
      fetchAllUsersFromVps();
    }
  }, [searchOpen]);

  useEffect(() => {
    const loadUserData = async () => {
      if (signedIn && playerName) {
        try {
          const res = await fetch(`/api/vps/user/${encodeURIComponent(playerName)}`);
          if (res.ok) {
            const data = await res.json();
            const user = data.user;
            if (user) {
              if (user.money !== undefined) {
                setMoney(user.money);
                localStorage.setItem('gorebox_player_money', user.money.toString());
              }
              if (user.createdAt) {
                localStorage.setItem('gorebox_player_created_at', user.createdAt);
              }
              if (user.skinPreset) setSkinPreset(user.skinPreset);
              if (user.skinColor) setSkinColor(user.skinColor);
              if (user.faceStyle) setFaceStyle(user.faceStyle);
              if (user.headScale) setHeadScale(user.headScale);
              if (user.unlockedItems) {
                setUnlockedItems(user.unlockedItems);
                localStorage.setItem('gorebox_unlocked_items', JSON.stringify(user.unlockedItems));
              }
              if (user.isVerified18 !== undefined) {
                setIsVerified18(user.isVerified18);
                localStorage.setItem('gorebox_verified_18', user.isVerified18 ? 'true' : 'false');
              }
              if (user.servers) {
                setMySavedServers(user.servers);
                localStorage.setItem('gorebox_my_saved_servers', JSON.stringify(user.servers));
              }
            }
          }
        } catch (err) {
          console.error("Error loading user data from VPS:", err);
        }
      }
    };
    loadUserData();
  }, [signedIn, playerName]);

  useEffect(() => {
    if (view === 'multiplayer') {
      fetchServers();
    }
  }, [view]);

  useEffect(() => {
    localStorage.setItem('gorebox_player_name', playerName);
  }, [playerName]);

  useEffect(() => {
    localStorage.setItem('gorebox_game_language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('gorebox_signed_in', signedIn ? 'true' : 'false');
  }, [signedIn]);

  useEffect(() => {
    localStorage.setItem('gorebox_player_money', money.toString());
  }, [money]);

  useEffect(() => {
    localStorage.setItem('gbox_skin_preset', skinPreset);
    localStorage.setItem('gbox_skin_color', skinColor);
    localStorage.setItem('gbox_face_style', faceStyle);
    localStorage.setItem('gbox_head_scale', headScale.toString());
  }, [skinPreset, skinColor, faceStyle, headScale]);

  const handleNameChange = (val: string) => {
    const clean = val.replace(/[^a-zA-Z0-9_]/g, '');
    setPlayerName(clean);
  };

  const getFansCount = (player: any) => {
    return 0;
  };

  const getFriendsCount = (player: any) => {
    return 0;
  };

  // Translations Dictionary
  const translations = {
    en: {
      menu: "Menu",
      discover: "Discover",
      settings: "Settings",
      personalize: "Workshop",
      exit: "Exit",
      signIn: "Sign In",
      signedIn: "Signed In",
      offlineMaps: "Offline Maps",
      defaultGrass: "Default Grass",
      grassForest: "Grass Forest 2",
      warehouse: "Industrial Warehouse",
      recommended: "Servers with more users",
      refresh: "Refresh List",
      language: "Language",
      selectLanguage: "Select Language",
      searchPlayers: "Search Players",
      searchServers: "Search Servers",
      searchPlaceholder: "search player",
      searchServersPlaceholder: "Search server names...",
      playerLevel: "Level",
      playerStatus: "Online",
      noPlayersFound: "No players found",
      noServersFound: "No servers found",
      customizeAvatar: "Personalize Avatar",
      skinPreset: "Skin Preset",
      skinColor: "Skin Color",
      faceStyle: "Face Style",
      headSize: "Head Size",
      save: "Apply Customizations",
      savedAlert: "Customizations Applied!",
      classic: "Classic",
      zombie: "Zombie",
      werewolf: "Werewolf",
      neonBlue: "Neon Blue",
      cyberPink: "Cyber Pink",
      golden: "Golden Elite",
      angry: "Angry",
      creepy: "Creepy",
      anime: "Anime Glow",
      cool: "Cool Shades",
      audioGraphics: "Audio, graphics, and gameplay settings will be added in a future update.",
      verifiedBadge: "Verified",
    },
    es: {
      menu: "Menú",
      discover: "Descubrir",
      settings: "Configuración",
      personalize: "Taller",
      exit: "Salir",
      signIn: "Iniciar Sesión",
      signedIn: "Sesión Iniciada",
      offlineMaps: "Mapas Locales",
      defaultGrass: "Césped Por Defecto",
      grassForest: "Bosque de Césped 2",
      warehouse: "Almacén Industrial",
      recommended: "Servidores con más usuarios",
      refresh: "Actualizar Lista",
      language: "Idioma",
      selectLanguage: "Seleccionar Idioma",
      searchPlayers: "Buscar Jugadores",
      searchServers: "Buscar Servidores",
      searchPlaceholder: "buscar jugador",
      searchServersPlaceholder: "Buscar servidores...",
      playerLevel: "Nivel",
      playerStatus: "En línea",
      noPlayersFound: "No se encontraron jugadores",
      noServersFound: "No se encontraron servidores",
      customizeAvatar: "Personalizar Avatar",
      skinPreset: "Aspecto del Cuerpo",
      skinColor: "Color de Piel",
      faceStyle: "Estilo de Cara",
      headSize: "Tamaño de Cabeza",
      save: "Aplicar Personalización",
      savedAlert: "¡Personalización Aplicada!",
      classic: "Clásico",
      zombie: "Zombi",
      werewolf: "Hombre Lobo",
      neonBlue: "Azul Neón",
      cyberPink: "Rosa Ciber",
      golden: "Élite Dorado",
      angry: "Enojado",
      creepy: "Escalofríos",
      anime: "Brillo Anime",
      cool: "Gafas de Sol",
      audioGraphics: "La configuración de audio, gráficos y jugabilidad se agregará en una futura actualización.",
      verifiedBadge: "Verificado",
    }
  };

  const t = translations[language];

  const getPlayerRankInfo = (player: any) => {
    const nameLower = (player.name || '').toLowerCase();
    if (nameLower === 'xrency' || player.role === 'owner' || (player.level || 0) >= 100) {
      return { name: 'OWNER', bg: 'bg-purple-600 text-white shadow-purple-500/30 border border-purple-400' };
    }
    if ((player.level || 0) >= 50 || player.role === 'superadmin' || player.role === 'admin') {
      return { name: 'ADMINISTRADOR', bg: 'bg-red-600 text-white shadow-red-500/30' };
    }
    if ((player.level || 0) >= 30) {
      return { name: 'SUPER MOD', bg: 'bg-blue-600 text-white shadow-blue-500/30' };
    }
    if ((player.level || 0) >= 20) {
      return { name: 'MOD', bg: 'bg-emerald-600 text-white shadow-emerald-500/30' };
    }
    if ((player.level || 0) >= 10) {
      return { name: 'AYUDANTE', bg: 'bg-indigo-600 text-white shadow-indigo-500/30' };
    }
    return { name: 'JUGADOR', bg: 'bg-slate-700 text-white shadow-slate-500/30' };
  };

  // Simulated & Admin Registered Players for Player Search
  const simulatedPlayers = [
    { name: "GoreMaster", email: "goremaster@vps.net", level: 99, status: "ONLINE", icon: "🔥", money: 50000, skinPreset: 'normal', skinColor: '#e0a96d', faceStyle: 'angry' },
    { name: "BlockySlayer", email: "blocky@vps.net", level: 42, status: "ONLINE", icon: "⚔️", money: 12000, skinPreset: 'zombie', skinColor: '#52b788', faceStyle: 'creepy' },
    { name: "RagdollKing", email: "king@vps.net", level: 77, status: "ONLINE", icon: "👑", money: 25000, skinPreset: 'werewolf', skinColor: '#4a4e69', faceStyle: 'classic' },
    { name: "PhysX_Fan", email: "physx@vps.net", level: 12, status: "ONLINE", icon: "🔮", money: 1500, skinPreset: 'blue', skinColor: '#06b6d4', faceStyle: 'anime' },
    { name: "AlphaWerewolf", email: "alpha@vps.net", level: 85, status: "ONLINE", icon: "🐺", money: 18000, skinPreset: 'werewolf', skinColor: '#4a4e69', faceStyle: 'classic' },
    { name: "SuburbanVoxel", email: "voxel@vps.net", level: 23, status: "ONLINE", icon: "🏠", money: 4500, skinPreset: 'pink', skinColor: '#ec4899', faceStyle: 'cool' }
  ];

  // Combined searchable players, combining simulated with registered Firestore players
  const allSearchablePlayers = React.useMemo(() => {
    const map = new Map<string, any>();
    const currentLocalName = (playerName || '').trim().toLowerCase();

    simulatedPlayers.forEach(p => {
      map.set(p.name.toLowerCase(), { ...p, isReal: false });
    });

    dbUsers.forEach(u => {
      const uNameLower = (u.name || '').toLowerCase();
      
      // Strict rule for xrency: Only show xrency if xrency is registered AND status is ONLINE (or if local user is xrency)!
      if (uNameLower === 'xrency') {
        const isSelf = currentLocalName === 'xrency' && signedIn;
        const isOnlineInDb = u.status === 'ONLINE';
        if (!isSelf && !isOnlineInDb) {
          return; // Skip xrency when not registered/logged in
        }
      }

      map.set(uNameLower, {
        name: u.name,
        level: u.level || 1,
        status: u.status || 'OFFLINE',
        icon: u.icon || '👤',
        money: u.money || 0,
        role: u.role || (uNameLower === 'xrency' ? 'owner' : 'user'),
        skinPreset: u.skinPreset || 'normal',
        skinColor: u.skinColor || '#e0a96d',
        faceStyle: u.faceStyle || 'classic',
        headScale: u.headScale || 1.0,
        isReal: true
      });
    });

    return Array.from(map.values()).filter(p => {
      if (p.name.toLowerCase() === 'xrency') {
        const xrencyInDb = dbUsers.find(u => u.name && u.name.toLowerCase() === 'xrency');
        if (!xrencyInDb) return false; // Not registered in DB
        const isSelf = currentLocalName === 'xrency' && signedIn;
        if (!isSelf && xrencyInDb.status !== 'ONLINE') return false; // Not logged in
      }
      return true;
    });
  }, [dbUsers, playerName, signedIn]);

  const filteredPlayers = allSearchablePlayers.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredServers = servers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleSignIn = async () => {
    if (signedIn) {
      if (playerName) {
        try {
          await fetch('/api/vps/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: playerName })
          });
        } catch (e) {
          console.error("Presence logout error:", e);
        }
      }
      setSignedIn(false);
      localStorage.removeItem('gorebox_signed_in');
      setMoney(0);
      localStorage.removeItem('gorebox_player_money');
      localStorage.removeItem('gorebox_admin_private_key');
    } else {
      setRegisteredDataForDownload(null);
      setIsAuthOpen(true);
      setAuthMode('login');
      setAuthName('');
      setAuthPassword('');
      setAuthEmail('');
      setAuthError('');
      setAuthSuccess('');
      setAdminConfirmed(false);
      setHasDownloadedKey(false);
    }
  };

  const handleLoginWithFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      e.target.value = ''; // Reset to allow re-selecting the same file
      fileReader.readAsText(file, "UTF-8");
      fileReader.onload = async (event) => {
        try {
          const parsed = parseAccountFile(event.target?.result as string);
          if (!parsed.playerName || !parsed.password) {
            setAuthError(language === 'es' ? 'Archivo de cuenta inválido o sin contraseña.' : 'Invalid account file or missing password.');
            return;
          }
          
          // Check anti-tamper signature
          const expectedSig = calculateAccountChecksum(
            parsed.playerName,
            parsed.money || 0,
            !!parsed.isVerified18,
            parsed.password
          );
          if (parsed.security_signature !== expectedSig) {
            setAuthError(
              language === 'es'
                ? '🛑 ¡ERROR DE SEGURIDAD! El archivo de guardado ha sido modificado de forma ilegal.'
                : '🛑 SECURITY ERROR! The save file has been illegally modified.'
            );
            return;
          }

          setAuthName(parsed.playerName);
          setAuthPassword(parsed.password);
          setAuthError('');
          setAuthSuccess(language === 'es' ? '¡Archivo verificado! Iniciando sesión...' : 'File verified! Logging in...');
          
          const res = await fetch('/api/vps/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: parsed.playerName, password: parsed.password })
          });
          const data = await res.json();
          
          if (!res.ok) {
            // Not found on VPS server (e.g. server restart), register on server now to keep search persistence
            setAuthSuccess(language === 'es' ? 'Registrando en Google Cloud...' : 'Registering on Google Cloud...');
            const regRes = await fetch('/api/vps/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                username: parsed.playerName,
                password: parsed.password,
                createdAt: parsed.createdAt || parsed.saveDate || new Date().toISOString()
              })
            });
            if (regRes.ok) {
              await fetch('/api/vps/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  username: parsed.playerName,
                  money: parsed.money || 1000,
                  unlockedItems: parsed.unlockedItems || [],
                  skinPreset: parsed.skinPreset || 'normal',
                  skinColor: parsed.skinColor || '#e0a96d',
                  faceStyle: parsed.faceStyle || 'classic',
                  headScale: parsed.headScale || 1.0,
                  isVerified18: !!parsed.isVerified18
                })
              });
              
              setPlayerName(parsed.playerName);
              setMoney(parsed.money ?? 1000);
              localStorage.setItem('gorebox_player_money', (parsed.money ?? 1000).toString());
              setPlayerPassword(parsed.password);
              localStorage.setItem('gorebox_player_password', parsed.password);
              localStorage.setItem('gorebox_player_created_at', parsed.createdAt || parsed.saveDate || new Date().toISOString());
              if (parsed.skinPreset) setSkinPreset(parsed.skinPreset);
              if (parsed.skinColor) setSkinColor(parsed.skinColor);
              if (parsed.faceStyle) setFaceStyle(parsed.faceStyle);
              if (parsed.headScale) setHeadScale(parsed.headScale);
              if (parsed.unlockedItems) {
                setUnlockedItems(parsed.unlockedItems);
                localStorage.setItem('gorebox_unlocked_items', JSON.stringify(parsed.unlockedItems));
              }
              if (parsed.isVerified18 !== undefined) {
                setIsVerified18(parsed.isVerified18);
                localStorage.setItem('gorebox_verified_18', parsed.isVerified18 ? 'true' : 'false');
              }
              setSignedIn(true);
              setAuthSuccess(language === 'es' ? '¡Sesión iniciada con éxito!' : 'Logged in successfully!');
              fetchAllUsersFromVps();
              setTimeout(() => setIsAuthOpen(false), 1500);
            } else {
              setAuthError(language === 'es' ? 'Error al restaurar cuenta en el servidor.' : 'Error restoring account on the server.');
            }
            return;
          }
          
          const user = data.user;
          setPlayerName(user.username);
          setMoney(user.money ?? 1000);
          localStorage.setItem('gorebox_player_money', (user.money ?? 1000).toString());
          setPlayerPassword(parsed.password);
          localStorage.setItem('gorebox_player_password', parsed.password);
          localStorage.setItem('gorebox_player_created_at', user.createdAt || parsed.createdAt || parsed.saveDate || new Date().toISOString());
          if (user.skinPreset) setSkinPreset(user.skinPreset);
          if (user.skinColor) setSkinColor(user.skinColor);
          if (user.faceStyle) setFaceStyle(user.faceStyle);
          if (user.headScale) setHeadScale(user.headScale);
          if (user.unlockedItems) {
            setUnlockedItems(user.unlockedItems);
            localStorage.setItem('gorebox_unlocked_items', JSON.stringify(user.unlockedItems));
          }
          if (user.isVerified18 !== undefined) {
            setIsVerified18(user.isVerified18);
            localStorage.setItem('gorebox_verified_18', user.isVerified18 ? 'true' : 'false');
          }
          setSignedIn(true);
          setAuthSuccess(language === 'es' ? '¡Sesión iniciada con éxito!' : 'Logged in successfully!');
          fetchAllUsersFromVps();
          setTimeout(() => setIsAuthOpen(false), 1500);
        } catch (err) {
          setAuthError(language === 'es' ? 'Archivo corrupto o inválido.' : 'Corrupted or invalid file.');
        }
      };
    }
  };

  const handleEntrarFileCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      e.target.value = ''; // Reset to allow re-selecting the same file
      fileReader.readAsText(file, "UTF-8");
      fileReader.onload = async (event) => {
        try {
          const parsed = parseAccountFile(event.target?.result as string);
          if (!parsed.playerName || !parsed.password) {
            setAuthError(language === 'es' ? 'Archivo de cuenta inválido o sin contraseña.' : 'Invalid account file or missing password.');
            return;
          }

          // Anti-tamper verification
          const expectedSig = calculateAccountChecksum(
            parsed.playerName,
            parsed.money || 0,
            !!parsed.isVerified18,
            parsed.password
          );
          if (parsed.security_signature !== expectedSig) {
            setAuthError(
              language === 'es'
                ? '🛑 ¡ERROR DE SEGURIDAD! El archivo de guardado ha sido modificado ilegalmente.'
                : '🛑 SECURITY ERROR! The save file has been illegally modified.'
            );
            return;
          }

          const cleanInputName = authName.trim().toLowerCase();
          const cleanFilePlayerName = parsed.playerName.trim().toLowerCase();

          if (cleanFilePlayerName !== cleanInputName || parsed.password !== authPassword) {
            setAuthError(
              language === 'es'
                ? '❌ El nombre de usuario o la contraseña ingresados no coinciden con el archivo de registro seleccionado.'
                : '❌ Entered username or password does not match the selected registration file.'
            );
            return;
          }

          setAuthError('');
          setAuthSuccess(language === 'es' ? '¡Coincidencia exitosa! Iniciando sesión...' : 'Credentials match successfully! Logging in...');

          const res = await fetch('/api/vps/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: parsed.playerName, password: parsed.password })
          });
          const data = await res.json();

          if (res.ok && data.user && data.user.privateKey) {
            localStorage.setItem('gorebox_admin_private_key', data.user.privateKey);
          }

          if (!res.ok) {
            // Register on server if missing to ensure consistency
            await fetch('/api/vps/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                username: parsed.playerName,
                password: parsed.password,
                createdAt: parsed.createdAt || parsed.saveDate || new Date().toISOString()
              })
            });
            await fetch('/api/vps/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                username: parsed.playerName,
                money: parsed.money || 1000,
                unlockedItems: parsed.unlockedItems || [],
                skinPreset: parsed.skinPreset || 'normal',
                skinColor: parsed.skinColor || '#e0a96d',
                faceStyle: parsed.faceStyle || 'classic',
                headScale: parsed.headScale || 1.0,
                isVerified18: !!parsed.isVerified18
              })
            });
          }

          setPlayerName(parsed.playerName);
          setMoney(parsed.money ?? 1000);
          localStorage.setItem('gorebox_player_money', (parsed.money ?? 1000).toString());
          setPlayerPassword(parsed.password);
          localStorage.setItem('gorebox_player_password', parsed.password);
          localStorage.setItem('gorebox_player_created_at', parsed.createdAt || parsed.saveDate || new Date().toISOString());
          if (parsed.skinPreset) setSkinPreset(parsed.skinPreset);
          if (parsed.skinColor) setSkinColor(parsed.skinColor);
          if (parsed.faceStyle) setFaceStyle(parsed.faceStyle);
          if (parsed.headScale) setHeadScale(parsed.headScale);
          if (parsed.unlockedItems) {
            setUnlockedItems(parsed.unlockedItems);
            localStorage.setItem('gorebox_unlocked_items', JSON.stringify(parsed.unlockedItems));
          }
          if (parsed.isVerified18 !== undefined) {
            setIsVerified18(parsed.isVerified18);
            localStorage.setItem('gorebox_verified_18', parsed.isVerified18 ? 'true' : 'false');
          }
          setSignedIn(true);
          setAuthSuccess(language === 'es' ? '¡Sesión iniciada con éxito!' : 'Logged in successfully!');
          fetchAllUsersFromVps();
          setTimeout(() => setIsAuthOpen(false), 1500);
        } catch (err) {
          setAuthError(language === 'es' ? 'Archivo corrupto o inválido.' : 'Corrupted or invalid file.');
        }
      };
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const cleanName = authName.trim();
    if (!cleanName) {
      setAuthError(language === 'es' ? 'El nombre es obligatorio' : 'Username is required');
      return;
    }

    if (cleanName.toLowerCase() === 'xrency' && !adminConfirmed) {
      setAdminConfirmOpen(true);
      setAdminConfirmPassword('');
      setAdminConfirmError('');
      return;
    }

    let finalPassword = authPassword;
    if (cleanName.toLowerCase() === 'xrency') {
      finalPassword = 'baughborxd';
    } else {
      if (authPassword.length < 3) {
        setAuthError(language === 'es' ? 'La contraseña debe tener al menos 3 caracteres' : 'Password must be at least 3 characters');
        return;
      }
    }

    if (authMode === 'register') {
      if (!registerBirthdate) {
        setAuthError(language === 'es' ? 'La fecha de nacimiento es obligatoria.' : 'Birthdate is required.');
        return;
      }
      const birthDateObj = new Date(registerBirthdate);
      const today = new Date();
      let age = today.getFullYear() - birthDateObj.getFullYear();
      const m = today.getMonth() - birthDateObj.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
        age--;
      }
      if (isNaN(birthDateObj.getTime())) {
        setAuthError(language === 'es' ? 'Fecha de nacimiento inválida.' : 'Invalid birthdate.');
        return;
      }
      if (age < 18) {
        setAuthError(
          language === 'es'
            ? `Acceso denegado. Tienes ${age} años. Debes tener 18 años o más para crear una cuenta.`
            : `Access denied. You are ${age} years old. You must be 18 or older to register.`
        );
        return;
      }
    }

    if (authMode === 'login') {
      setAuthSuccess(
        language === 'es'
          ? 'Inicio de sesion exitosa ahora ingrese la key-private de su cuenta registrada'
          : 'Successful login, now enter the key-private of your registered account'
      );
      
      const fileInput = document.getElementById('auth-entrar-file-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
        fileInput.click(); // Synchronous direct click triggers the file dialog immediately, bypassing security blocks
      }
      return;
    }

    try {
      const endpoint = '/api/vps/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanName, password: finalPassword, email: authEmail })
      });
      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || (language === 'es' ? 'Error de autenticación' : 'Authentication error'));
        return;
      }

      const user = data.user;
      setAuthSuccess(language === 'es' ? '¡Cuenta creada con éxito!' : 'Account created successfully!');
      setPlayerName(user.username);
      setMoney(user.money ?? 0);
      localStorage.setItem('gorebox_player_money', (user.money ?? 0).toString());
      setPlayerPassword(finalPassword);
      localStorage.setItem('gorebox_player_password', finalPassword);
      localStorage.setItem('gorebox_player_created_at', user.createdAt || new Date().toISOString());

      if (user.skinPreset) setSkinPreset(user.skinPreset);
      if (user.skinColor) setSkinColor(user.skinColor);
      if (user.faceStyle) setFaceStyle(user.faceStyle);
      if (user.headScale) setHeadScale(user.headScale);
      if (user.unlockedItems) {
        setUnlockedItems(user.unlockedItems);
        localStorage.setItem('gorebox_unlocked_items', JSON.stringify(user.unlockedItems));
      }
      if (user.isVerified18 !== undefined) {
        setIsVerified18(user.isVerified18);
        localStorage.setItem('gorebox_verified_18', user.isVerified18 ? 'true' : 'false');
      }

      if (user.servers) {
        setMySavedServers(user.servers);
        localStorage.setItem('gorebox_my_saved_servers', JSON.stringify(user.servers));
      }

      setSignedIn(true);
      fetchAllUsersFromVps();

      // Generate a security anti-tamper signature & encrypt the save backup file
      const currentMoney = user.money ?? 1000;
      const currentVerified = !!user.isVerified18;
      const sig = calculateAccountChecksum(user.username, currentMoney, currentVerified, finalPassword);
      
      const downloadData = {
        playerName: user.username,
        money: currentMoney,
        unlockedItems: user.unlockedItems || ['normal_skin', 'zombie_skin', 'blue_skin', 'classic_face', 'angry_face', 'anime_face'],
        isVerified18: currentVerified,
        skinPreset: user.skinPreset || 'normal',
        skinColor: user.skinColor || '#e0a96d',
        faceStyle: user.faceStyle || 'classic',
        headScale: user.headScale || 1.0,
        password: finalPassword,
        createdAt: user.createdAt || new Date().toISOString(),
        security_signature: sig,
        saveDate: new Date().toISOString(),
        servers: user.servers || []
      };
      
      const encryptedData = {
        encrypted: true,
        data: encryptAccountData(downloadData)
      };

      // Show the dedicated professional key download view instead of closing immediately
      setRegisteredDataForDownload(encryptedData);
      setShowDownloadBtn(false);
      setTimeout(() => {
        setShowDownloadBtn(true);
      }, 2500);
    } catch (err) {
      console.error("VPS auth error:", err);
      setAuthError(language === 'es' ? 'Error al conectar con el servidor' : 'Server connection error');
    }
  };

  // Automatic background account key file download disabled to ensure the user must manually click the green download key button first.

  const [showExitConfirmModal, setShowExitConfirmModal] = useState<boolean>(false);
  const [showCreateServerModal, setShowCreateServerModal] = useState<boolean>(false);
  const [paintModalOpen, setPaintModalOpen] = useState<boolean>(false);
  const [brushColor, setBrushColor] = useState<string>('#000000');
  const [brushSize, setBrushSize] = useState<number>(6);
  const [isPainting, setIsPainting] = useState<boolean>(false);
  const paintCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showRulesWaitingModal, setShowRulesWaitingModal] = useState<boolean>(false);
  const [newServerName, setNewServerName] = useState<string>('');
  const [newServerMapId, setNewServerMapId] = useState<string>('cesped2');
  const [newServerMaxPlayers, setNewServerMaxPlayers] = useState<number>(16);
  const [serverPreviewDataUrl, setServerPreviewDataUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawingPreview, setIsDrawingPreview] = useState<boolean>(false);

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawingPreview(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const drawPreview = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingPreview) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawingPreview(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setServerPreviewDataUrl(canvas.toDataURL());
    }
  };

  const startPainting = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsPainting(true);
    const canvas = paintCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const drawPainting = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPainting) return;
    const canvas = paintCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopPainting = () => {
    setIsPainting(false);
  };

  const clearPaintCanvas = () => {
    const canvas = paintCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const savePaintDrawing = () => {
    const canvas = paintCanvasRef.current;
    if (canvas) {
      setServerPreviewDataUrl(canvas.toDataURL());
    }
    setPaintModalOpen(false);
  };

  const handleCreateServerSubmit = async () => {
    if (!newServerName.trim()) {
      alert(language === 'es' ? 'Ingresa un nombre para el servidor' : 'Enter server name');
      return;
    }
    const canvas = canvasRef.current;
    const previewImg = canvas ? canvas.toDataURL() : serverPreviewDataUrl;

    try {
      const res = await fetch('/api/servers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newServerName.trim(),
          mapId: newServerMapId,
          maxPlayers: newServerMaxPlayers,
          previewImage: previewImg,
        })
      });
      const data = await res.json();
      if (res.ok && data.server) {
        setServers(prev => [data.server, ...prev]);
        setShowCreateServerModal(false);
        setNewServerName('');
        alert(language === 'es' ? '¡Servidor creado exitosamente en Descubrir!' : 'Server successfully created in Discover!');
      } else {
        alert(data.error || 'Error creating server');
      }
    } catch (err) {
      console.error("Error creating server:", err);
      alert('Error connecting to server');
    }
  };

  const [savedBadgeVisible, setSavedBadgeVisible] = useState<boolean>(false);
  const handleSavePersonalization = async () => {
    setSavedBadgeVisible(true);
    
    localStorage.setItem('gbox_skin_preset', skinPreset);
    localStorage.setItem('gbox_skin_color', skinColor);
    localStorage.setItem('gbox_face_style', faceStyle);
    localStorage.setItem('gbox_head_scale', headScale.toString());

    if (signedIn && playerName) {
      try {
        await fetch('/api/vps/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: playerName,
            skinPreset,
            skinColor,
            faceStyle,
            headScale
          })
        });
      } catch (err) {
        console.error("Error saving customization to VPS:", err);
      }
    }

    setTimeout(() => {
      setSavedBadgeVisible(false);
    }, 1500);
  };

  const handleBuyItem = async (itemId: string, price: number) => {
    if (money < price) {
      alert(language === 'es' ? '¡No tienes suficiente dinero!' : 'Not enough money!');
      return;
    }

    const newMoney = money - price;
    const newUnlocked = [...unlockedItems, itemId];
    
    setMoney(newMoney);
    setUnlockedItems(newUnlocked);
    
    localStorage.setItem('gorebox_player_money', newMoney.toString());
    localStorage.setItem('gorebox_unlocked_items', JSON.stringify(newUnlocked));

    let updatedSkinPreset = skinPreset;
    let updatedSkinColor = skinColor;
    let updatedFaceStyle = faceStyle;

    if (itemId === 'golden_skin') {
      updatedSkinPreset = 'golden';
      updatedSkinColor = '#eab308';
      setSkinPreset('golden');
      setSkinColor('#eab308');
    } else if (itemId === 'werewolf_skin') {
      updatedSkinPreset = 'werewolf';
      updatedSkinColor = '#4a4e69';
      setSkinPreset('werewolf');
      setSkinColor('#4a4e69');
    } else if (itemId === 'pink_skin') {
      updatedSkinPreset = 'pink';
      updatedSkinColor = '#ec4899';
      setSkinPreset('pink');
      setSkinColor('#ec4899');
    } else if (itemId === 'cool_face') {
      updatedFaceStyle = 'cool';
      setFaceStyle('cool');
    } else if (itemId === 'creepy_face') {
      updatedFaceStyle = 'creepy';
      setFaceStyle('creepy');
    }

    if (signedIn && playerName) {
      try {
        await fetch('/api/vps/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: playerName,
            money: newMoney,
            unlockedItems: newUnlocked,
            skinPreset: updatedSkinPreset,
            skinColor: updatedSkinColor,
            faceStyle: updatedFaceStyle
          })
        });
      } catch (err) {
        console.error("Error updating purchase on VPS:", err);
      }
    }

    alert(language === 'es' ? '¡Compra exitosa y equipada!' : 'Purchase successful and equipped!');
  };

  const handleEarnMoney = async () => {
    const newBalance = money + 100;
    setMoney(newBalance);
    localStorage.setItem('gorebox_player_money', newBalance.toString());

    if (signedIn && playerName) {
      try {
        await fetch('/api/vps/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: playerName,
            money: newBalance
          })
        });
      } catch (err) {
        console.error("Error updating money on VPS:", err);
      }
    }
  };

  const exportAccountToFile = () => {
    const currentMoney = money;
    const currentVerified = isVerified18;
    const sig = calculateAccountChecksum(playerName, currentMoney, currentVerified, playerPassword);
    
    const saveData = {
      playerName,
      money: currentMoney,
      unlockedItems,
      isVerified18: currentVerified,
      skinPreset,
      skinColor,
      faceStyle,
      headScale,
      password: playerPassword,
      createdAt: localStorage.getItem('gorebox_player_created_at') || new Date().toISOString(),
      security_signature: sig,
      saveDate: new Date().toISOString(),
      servers: mySavedServers
    };
    
    // Encrypt the save data so the user cannot easily modify it
    const encryptedData = {
      encrypted: true,
      data: encryptAccountData(saveData)
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(encryptedData, null, 2));
    const filename = 'key-private.json';
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importAccountFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      e.target.value = ''; // Reset to allow re-selecting the same file
      fileReader.readAsText(file, "UTF-8");
      fileReader.onload = async (event) => {
        try {
          const parsed = parseAccountFile(event.target?.result as string);
          if (!parsed.playerName) {
            alert(language === 'es' ? 'Archivo de guardado inválido.' : 'Invalid save file.');
            return;
          }

          // Anti-tamper verification
          const expectedSig = calculateAccountChecksum(
            parsed.playerName,
            parsed.money || 0,
            !!parsed.isVerified18,
            parsed.password || ''
          );

          if (parsed.security_signature !== expectedSig) {
            alert(
              language === 'es'
                ? '🛑 ¡ERROR DE SEGURIDAD!\nEl archivo de guardado ha sido modificado ilegalmente o está dañado. No se permite la alteración de dinero o estado de verificación.'
                : '🛑 SECURITY ERROR!\nThe account save file has been illegally modified or is corrupted. Altering money or verification status is not allowed.'
            );
            return;
          }

          setPlayerName(parsed.playerName);
          localStorage.setItem('gorebox_player_name', parsed.playerName);
          localStorage.setItem('gorebox_player_created_at', parsed.createdAt || parsed.saveDate || new Date().toISOString());
          
          if (typeof parsed.money === 'number') {
            setMoney(parsed.money);
            localStorage.setItem('gorebox_player_money', parsed.money.toString());
          }
          if (parsed.password) {
            setPlayerPassword(parsed.password);
            localStorage.setItem('gorebox_player_password', parsed.password);
          }
          if (Array.isArray(parsed.unlockedItems)) {
            setUnlockedItems(parsed.unlockedItems);
            localStorage.setItem('gorebox_unlocked_items', JSON.stringify(parsed.unlockedItems));
          }
          if (typeof parsed.isVerified18 === 'boolean') {
            setIsVerified18(parsed.isVerified18);
            localStorage.setItem('gorebox_verified_18', parsed.isVerified18 ? 'true' : 'false');
          }
          if (parsed.skinPreset) setSkinPreset(parsed.skinPreset);
          if (parsed.skinColor) setSkinColor(parsed.skinColor);
          if (parsed.faceStyle) setFaceStyle(parsed.faceStyle);
          if (typeof parsed.headScale === 'number') setHeadScale(parsed.headScale);
          if (Array.isArray(parsed.servers)) {
            setMySavedServers(parsed.servers);
            localStorage.setItem('gorebox_my_saved_servers', JSON.stringify(parsed.servers));
          }
          
          setSignedIn(true);
          localStorage.setItem('gorebox_signed_in', 'true');
          
          // Sync account to server (Google Cloud run VPS) so that it remains registered for Search Players
          try {
            // Check if user exists on server
            const checkRes = await fetch(`/api/vps/user/${encodeURIComponent(parsed.playerName)}`);
            if (checkRes.ok) {
              const uRes = await fetch('/api/vps/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  username: parsed.playerName,
                  money: parsed.money || 1000,
                  unlockedItems: parsed.unlockedItems || [],
                  skinPreset: parsed.skinPreset || 'normal',
                  skinColor: parsed.skinColor || '#e0a96d',
                  faceStyle: parsed.faceStyle || 'classic',
                  headScale: parsed.headScale || 1.0,
                  isVerified18: !!parsed.isVerified18,
                  servers: parsed.servers || []
                })
              });
              if (uRes.ok) {
                const uData = await uRes.json();
                if (uData.user && uData.user.servers) {
                  setMySavedServers(uData.user.servers);
                  localStorage.setItem('gorebox_my_saved_servers', JSON.stringify(uData.user.servers));
                }
              }
            } else {
              // Register new on server
              await fetch('/api/vps/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  username: parsed.playerName,
                  password: parsed.password || '123',
                  email: '',
                  createdAt: parsed.createdAt || parsed.saveDate || new Date().toISOString()
                })
              });
              // Then update
              const uRes = await fetch('/api/vps/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  username: parsed.playerName,
                  money: parsed.money || 1000,
                  unlockedItems: parsed.unlockedItems || [],
                  skinPreset: parsed.skinPreset || 'normal',
                  skinColor: parsed.skinColor || '#e0a96d',
                  faceStyle: parsed.faceStyle || 'classic',
                  headScale: parsed.headScale || 1.0,
                  isVerified18: !!parsed.isVerified18,
                  servers: parsed.servers || []
                })
              });
              if (uRes.ok) {
                const uData = await uRes.json();
                if (uData.user && uData.user.servers) {
                  setMySavedServers(uData.user.servers);
                  localStorage.setItem('gorebox_my_saved_servers', JSON.stringify(uData.user.servers));
                }
              }
            }
            fetchAllUsersFromVps();
          } catch (syncErr) {
            console.error("Could not sync imported save to local server db:", syncErr);
          }

          alert(language === 'es' ? '¡Cuenta cargada con éxito!' : 'Account loaded successfully!');
        } catch (err) {
          alert(language === 'es' ? 'Archivo de guardado inválido.' : 'Invalid save file.');
        }
      };
    }
  };

  const handleExitWithBackup = () => {
    setShowExitConfirmModal(true);
  };

  const confirmExitAndDownload = () => {
    exportAccountToFile();
    setTimeout(() => {
      window.close();
      window.location.reload();
    }, 800);
  };

  if (!isOpen) {
    return renderAdminUI();
  }

  return (
    <>
      {renderAdminUI()}
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center sm:p-4 select-none font-sans">
      {/* Mobile App Container */}
      <div className="relative w-full h-full sm:max-w-[400px] sm:h-[800px] sm:max-h-[90vh] bg-white sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border-4 border-gray-100">
        
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-white sticky top-0 z-10 border-b border-gray-100">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center">
            {view === 'main' ? (
              <span 
                className="text-[1.7rem] font-black text-pink-400 tracking-wider" 
                style={{ 
                  WebkitTextStroke: '1.5px #fbcfe8', 
                  textShadow: '3px 3px 0px #db2777, -1px -1px 0 #fdf2f8, 0 0 10px rgba(219, 39, 119, 0.4)' 
                }}
              >
                Suburbia
              </span>
            ) : view === 'multiplayer' ? t.discover : view === 'personalize' ? t.personalize : t.settings}
          </h1>
          
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex flex-col items-end gap-1 shrink-0">
              {/* Sign In Button (Fully Functional) */}
              <button 
                onClick={handleToggleSignIn}
                className={`text-[10px] sm:text-xs font-black px-2 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-md transition-all active:scale-95 flex items-center gap-1 shrink-0 ${
                  signedIn 
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                    : 'bg-pink-500 text-white hover:bg-pink-600'
                }`}
              >
                {signedIn ? <Check className="w-3.5 h-3.5" /> : null}
                {signedIn ? t.signedIn : t.signIn}
              </button>

              {/* Money System Badge */}
              <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 shadow-sm text-emerald-700 font-extrabold shrink-0">
                <PixelGreenCoin />
                <span className="text-[10px] sm:text-xs font-black tracking-tight">{money.toLocaleString()}</span>
              </div>
            </div>

            {/* Search Lupa Button (Functional for filtering in Main & Server, Greyed in Settings) */}
            <button 
              disabled={view === 'settings' || view === 'personalize'}
              onClick={() => {
                setSearchOpen(!searchOpen);
                setSearchQuery('');
              }}
              className={`p-1.5 rounded-full transition-colors ${
                view === 'settings' || view === 'personalize'
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Search className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
            </button>
          </div>
        </div>

        {/* Floating Search Input HUD */}
        {searchOpen && (view === 'main' || view === 'multiplayer') && (
          <div className="bg-gray-50 border-b border-gray-100 px-4 py-2.5 flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input 
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={view === 'main' ? t.searchPlaceholder : t.searchServersPlaceholder}
              className="bg-transparent text-sm font-bold text-gray-900 outline-none flex-1 placeholder-gray-400"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-xs font-bold text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto bg-white pb-6 scrollbar-none">
          
          {/* Main Menu View */}
          {view === 'main' && (
            <div className="flex flex-col">
              
              {/* Active Player Search Mode */}
              {searchOpen && searchQuery ? (
                <div className="px-4 py-4 flex flex-col gap-3">
                  <h2 className="text-sm font-black text-gray-400 uppercase tracking-wider">{t.searchPlayers}</h2>
                  {filteredPlayers.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {filteredPlayers.map((player, idx) => {
                        const rankInfo = getPlayerRankInfo(player);
                        return (
                          <div 
                            key={idx} 
                            onClick={() => setSelectedUserProfile(player)}
                            className="flex items-center justify-between p-3.5 rounded-2xl border transition-all shadow-xs cursor-pointer active:scale-95 hover:scale-[1.01] bg-gradient-to-r from-gray-50 to-white border-gray-100 hover:border-pink-300 hover:bg-pink-50/20"
                          >
                            <div className="flex items-center gap-3.5">
                              <span className="text-2xl w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-inner select-none border border-gray-100">{player.icon}</span>
                              <div>
                                <div className="font-extrabold text-gray-900 tracking-tight text-sm flex items-center gap-2">
                                  <span>{player.name}</span>
                                  <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase ${rankInfo.bg} tracking-wider`}>
                                    {rankInfo.name}
                                  </span>
                                </div>
                                <div className="text-[11px] text-gray-500 font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                                  {player.email && <span className="text-gray-400">{player.email}</span>}
                                  {player.password && <span className="text-amber-700 font-mono text-[10px]">{player.password}</span>}
                                  <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                                    <PixelGreenCoin />
                                    <span>{(player.money || 0).toLocaleString()}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-200/50 shadow-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              {t.playerStatus}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-gray-400 text-center py-6">{t.noPlayersFound}</p>
                  )}
                </div>
              ) : (
                <>
                  {/* Profile Section */}
                  <div className="px-4 py-4 flex items-center gap-3 border-b border-gray-50 bg-gradient-to-b from-gray-50/50 to-white">
                    <div 
                      onClick={() => setSelectedUserProfile({
                        name: playerName,
                        email: signedIn ? `${playerName.toLowerCase()}@vps.net` : undefined,
                        money: money,
                        icon: "👤",
                        skinPreset: skinPreset,
                        skinColor: skinColor,
                        faceStyle: faceStyle,
                        headScale: headScale,
                        isReal: true
                      })}
                      className="w-12 h-12 rounded-full bg-pink-50 border-2 border-pink-100 flex items-center justify-center overflow-hidden shrink-0 shadow-inner relative cursor-pointer hover:scale-105 active:scale-95 transition-all"
                      title={language === 'es' ? 'Ver Perfil' : 'View Profile'}
                    >
                      <User className="w-7 h-7 text-pink-400" />
                      {signedIn && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-[8px] text-white font-bold">✓</span>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <input
                        type="text"
                        maxLength={18}
                        value={playerName}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="Enter Username"
                        className="bg-transparent text-xl font-extrabold text-gray-900 placeholder-gray-400 outline-none w-full"
                      />
                    </div>
                  </div>

                  {/* Work & Earn Money Feature removed per user request */}

                  {/* Offline Maps */}
                  <div className="px-4 pt-4 pb-2">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-1">
                        {t.offlineMaps} <ChevronRight className="w-5 h-5 text-gray-500" />
                      </h2>
                    </div>
                    
                    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none snap-x">
                      {/* Card 1 - Default Grass */}
                      <div 
                        onClick={() => onStartSingleplayer('lab')}
                        className="flex-none w-36 snap-start cursor-pointer group"
                      >
                        <div className="w-36 h-36 rounded-2xl bg-gray-100 mb-2 overflow-hidden relative border border-gray-200 shadow-sm group-hover:border-pink-300 transition-all">
                          <img src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80" alt="Grass" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                        </div>
                        <h3 className="font-extrabold text-gray-900 text-[15px] leading-tight truncate">{t.defaultGrass}</h3>
                      </div>

                      {/* Card 2 - Bosque de Césped 2 */}
                      <div 
                        onClick={() => onStartSingleplayer('cesped2')}
                        className="flex-none w-36 snap-start cursor-pointer group"
                      >
                        <div className="w-36 h-36 rounded-2xl bg-gray-100 mb-2 overflow-hidden relative border border-gray-200 shadow-sm group-hover:border-pink-300 transition-all">
                          <img src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&q=80" alt="Bosque" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                        </div>
                        <h3 className="font-extrabold text-gray-900 text-[15px] leading-tight truncate">{t.grassForest}</h3>
                      </div>

                      {/* Card 3 - Almacén Industrial */}
                      <div 
                        onClick={() => onStartSingleplayer('almacen')}
                        className="flex-none w-36 snap-start cursor-pointer group"
                      >
                        <div className="w-36 h-36 rounded-2xl bg-gray-100 mb-2 overflow-hidden relative border border-gray-200 shadow-sm group-hover:border-pink-300 transition-all">
                          <img src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&q=80" alt="Almacen" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                        </div>
                        <h3 className="font-extrabold text-gray-900 text-[15px] leading-tight truncate">{t.warehouse}</h3>
                      </div>
                    </div>
                  </div>

                  {/* Multiplayer Servers (Recommended) */}
                  <div className="px-4 pt-2">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-xl font-extrabold text-gray-900">{t.recommended}</h2>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {recommendedServers.map(server => (
                        <div 
                          key={server.id}
                          onClick={() => onJoinMultiplayer(server, playerName)}
                          className="cursor-pointer group flex flex-col"
                        >
                          <div className="aspect-square rounded-2xl bg-gray-100 mb-2 overflow-hidden relative border border-gray-200 shadow-sm group-hover:border-pink-300 transition-all">
                            <img 
                              src={server.mapId === 'cesped2' ? 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80' : 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&q=80'} 
                              alt="Map"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                            />
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-md text-[11px] text-white font-extrabold flex items-center gap-1">
                              <Users className="w-3 h-3 text-pink-300" /> {server.playerCount}/{server.maxPlayers}
                            </div>
                          </div>
                          <h3 className="font-extrabold text-gray-900 text-[15px] leading-tight truncate">{server.name}</h3>
                          <p className="text-xs text-gray-400 font-bold mt-0.5 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> {server.pingMs}ms
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Servers View */}
          {view === 'multiplayer' && (
            <div className="px-4 py-4 flex flex-col h-full overflow-y-auto">
              
              {/* Opción abajo de descubrir de Crear servidor */}
              {discoverSubMode === 'servers' ? (
                <div className="flex flex-col h-full">
                  <div className="mb-4">
                    <button
                      onClick={() => {
                        setDiscoverSubMode('create_menu');
                        setServerCreationChoice('create');
                      }}
                      className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>➕</span> {language === 'es' ? 'Crear Servidor' : 'Create Server'}
                    </button>
                  </div>

                  <div className="flex flex-col gap-4">
                    {filteredServers.length > 0 ? (
                      filteredServers.map((server) => (
                        <div
                          key={server.id}
                          onClick={() => onJoinMultiplayer(server, playerName)}
                          className="flex items-center gap-4 cursor-pointer group p-2 bg-gray-50 hover:bg-gray-100/70 border border-gray-100 hover:border-pink-200 rounded-2xl transition-all"
                        >
                          <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 relative bg-gray-100 border border-gray-200">
                            <img 
                              src={server.mapId === 'cesped2' ? 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80' : 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&q=80'} 
                              alt="Map"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <h3 className="font-extrabold text-gray-900 text-base leading-tight mb-0.5 truncate">
                              {server.name}
                            </h3>
                            <p className="text-xs font-bold text-pink-400 mb-1.5">
                              {server.mapId === 'lab' ? t.defaultGrass : t.grassForest}
                            </p>
                            <div className="flex items-center gap-3 text-xs font-bold text-gray-400">
                              <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-gray-100">
                                <Users className="w-3.5 h-3.5 text-pink-400" /> {server.playerCount} / {server.maxPlayers}
                              </span>
                              <span className="text-emerald-500 font-black">{server.pingMs} ms</span>
                            </div>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center shrink-0 shadow-md group-hover:bg-pink-600 active:scale-90 transition-all">
                            <Play className="w-4 h-4 text-white ml-1" />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm font-bold text-gray-400 text-center py-6">{t.noServersFound}</p>
                    )}
                  </div>
                  
                  <button 
                    onClick={fetchServers}
                    className="mt-6 w-full py-3.5 bg-gray-50 hover:bg-gray-100 text-gray-900 font-extrabold rounded-2xl flex items-center justify-center gap-2 border border-gray-100 transition-colors"
                  >
                    <RefreshCw className={`w-5 h-5 ${isLoadingServers ? 'animate-spin' : ''}`} />
                    {t.refresh}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Back to server list */}
                  <button
                    onClick={() => setDiscoverSubMode('servers')}
                    className="self-start text-xs font-black text-gray-500 hover:text-gray-800 flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                  >
                    ← {language === 'es' ? 'Volver a Servidores' : 'Back to Servers'}
                  </button>

                  {/* Submenu tabs: Crear servidor, Cargar uno creado */}
                  <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                    <button
                      onClick={() => setServerCreationChoice('create')}
                      className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                        serverCreationChoice === 'create'
                          ? 'bg-white text-pink-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      {language === 'es' ? 'Crear Servidor' : 'Create Server'}
                    </button>
                    <button
                      onClick={() => setServerCreationChoice('load')}
                      className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                        serverCreationChoice === 'load'
                          ? 'bg-white text-pink-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      {language === 'es' ? 'Servidores guardados' : 'Saved servers'}
                    </button>
                  </div>

                  {serverCreationChoice === 'create' ? (
                    <div className="space-y-4">
                      {/* Cuadro vacío con marco negro */}
                      <div className="w-full bg-white border border-slate-200/90 rounded-2xl flex items-center justify-center gap-6 p-6 relative overflow-hidden shadow-md">
                        {/* Cuadro vacío con marco negro para dibujo de carga */}
                        <div className="w-28 h-28 sm:w-32 sm:h-32 bg-zinc-50 border-[6px] border-black flex items-center justify-center shadow-inner relative overflow-hidden shrink-0">
                          {serverPreviewDataUrl ? (
                            <img src={serverPreviewDataUrl} className="w-full h-full object-contain" alt="Server icon" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-[10px] font-black text-gray-400 uppercase text-center px-1">
                              {language === 'es' ? 'Dibujo vacío' : 'Empty drawing'}
                            </span>
                          )}
                        </div>

                        {/* Pencil button al lado del marco */}
                        <button
                          type="button"
                          onClick={() => setPaintModalOpen(true)}
                          className="w-12 h-12 rounded-full bg-pink-500 hover:bg-pink-600 active:scale-90 text-white flex items-center justify-center shadow-lg transition-transform border border-white shrink-0 cursor-pointer"
                          title={language === 'es' ? 'Dibujar Portada' : 'Draw Cover'}
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Opción abajo de cuadro para colocar nombre al servidor */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
                          {language === 'es' ? 'Nombre del Servidor' : 'Server Name'}
                        </label>
                        <input
                          type="text"
                          maxLength={24}
                          value={newServerName}
                          onChange={(e) => setNewServerName(e.target.value)}
                          placeholder={language === 'es' ? 'Nombre de servidor' : 'Server name'}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 font-bold outline-none focus:border-pink-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
                          {language === 'es' ? 'Mapa' : 'Map'}
                        </label>
                        <select
                          value={newServerMapId}
                          onChange={(e) => setNewServerMapId(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 font-bold outline-none focus:border-pink-500 transition-colors"
                        >
                          <option value="cesped2">{language === 'es' ? 'Bosque de Césped' : 'Grass Forest'}</option>
                          <option value="lab">{language === 'es' ? 'Laboratorio' : 'Laboratory'}</option>
                        </select>
                      </div>

                      <button
                        onClick={async () => {
                          if (!signedIn || !playerName) {
                            alert(language === 'es' ? 'Debes iniciar sesión para publicar un servidor en la web.' : 'You must sign in to publish a server on the web.');
                            return;
                          }
                          if (!newServerName.trim()) {
                            alert(language === 'es' ? 'Ingresa un nombre para el servidor' : 'Enter server name');
                            return;
                          }
                          const isUserAdmin = playerName.trim().toLowerCase() === 'xrency' || playerName.trim().toLowerCase() === 'xrenxy';
                          
                          if (isUserAdmin) {
                            try {
                              const res = await fetch('/api/servers/create', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  name: newServerName.trim(),
                                  mapId: newServerMapId,
                                  maxPlayers: 16,
                                  previewImage: serverPreviewDataUrl,
                                })
                              });
                              const data = await res.json();
                              if (res.ok && data.server) {
                                setServers(prev => [data.server, ...prev]);
                                setDiscoverSubMode('servers');
                                setNewServerName('');
                                setServerPreviewDataUrl('');
                                alert(language === 'es' ? '¡Servidor creado exitosamente en Descubrir!' : 'Server successfully created in Discover!');
                              } else {
                                alert(data.error || 'Error creating server');
                              }
                            } catch (err) {
                              console.error("Error creating server:", err);
                              alert('Error connecting to server');
                            }
                          } else {
                            try {
                              const res = await fetch('/api/servers/publish-pending', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  name: newServerName.trim(),
                                  mapId: newServerMapId,
                                  ownerName: playerName,
                                  previewImage: serverPreviewDataUrl,
                                  maxPlayers: 16,
                                })
                              });
                              const data = await res.json();
                              if (res.ok) {
                                if (data.autoApproved) {
                                  alert(language === 'es' 
                                    ? '¡Servidor auto-aprobado y publicado directamente en Descubrir!' 
                                    : 'Server auto-approved and published directly to Discover!'
                                  );
                                  fetchServers();
                                } else {
                                  setShowRulesWaitingModal(true);
                                }
                                // Sync saved servers state
                                if (signedIn && playerName) {
                                  const ures = await fetch(`/api/vps/user/${encodeURIComponent(playerName)}`);
                                  if (ures.ok) {
                                    const udata = await ures.json();
                                    if (udata.user && udata.user.servers) {
                                      setMySavedServers(udata.user.servers);
                                      localStorage.setItem('gorebox_my_saved_servers', JSON.stringify(udata.user.servers));
                                    }
                                  }
                                }
                                setNewServerName('');
                                setServerPreviewDataUrl('');
                                setDiscoverSubMode('servers');
                              } else {
                                alert(data.error || 'Error submitting server for approval');
                              }
                            } catch (err) {
                              console.error("Error submitting server for approval:", err);
                              alert('Error connecting to server');
                            }
                          }
                        }}
                        className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:scale-95 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Send className="w-4 h-4" /> {language === 'es' ? 'Publicar Servidor en Descubrir' : 'Publish Server in Discover'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-[11px] font-black text-gray-400 text-center py-2 uppercase tracking-wider">
                        {language === 'es' ? 'Servidores guardados' : 'Saved servers'}
                      </p>
                      
                      {!signedIn ? (
                        <div className="text-center p-6 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50">
                          <p className="text-xs font-bold text-gray-500">
                            {language === 'es' ? 'Debes iniciar sesión' : 'You must sign in'}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-1 font-semibold uppercase tracking-wider">
                            {language === 'es' ? 'Los servidores deben registrarse en la web' : 'Servers must be registered on the web'}
                          </p>
                          <button
                            onClick={() => {
                              setIsAuthOpen(true);
                              setAuthMode('login');
                            }}
                            className="mt-3 px-4 py-1.5 bg-pink-500 hover:bg-pink-600 text-white font-black text-[10px] uppercase rounded-xl transition-all cursor-pointer"
                          >
                            {language === 'es' ? 'Iniciar Sesión / Registrarse' : 'Login / Register'}
                          </button>
                        </div>
                      ) : mySavedServers.length > 0 ? (
                        <div className="space-y-2.5">
                          {mySavedServers.map((server, index) => {
                            const isApproved = server.status === 'approved';
                            const isRejected = server.status === 'rejected';
                            const isPending = server.status === 'pending';
                            return (
                              <div
                                key={index}
                                className="flex flex-col p-3.5 bg-gray-50 hover:bg-gray-100/80 rounded-2xl border border-gray-200 shadow-2xs transition-all gap-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <h4 className="font-extrabold text-sm text-gray-900 truncate">{server.name}</h4>
                                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                                      {server.mapId === 'lab' ? t.defaultGrass : t.grassForest}
                                    </p>
                                  </div>
                                  
                                  {/* Approval Status Badge with custom colors */}
                                  <div className="shrink-0 flex items-center gap-1.5">
                                    {isApproved ? (
                                      <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-3xs flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        {language === 'es' ? 'Aprobado de forma profesional' : 'Approved Professionally'}
                                      </span>
                                    ) : isRejected ? (
                                      <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md bg-rose-100 text-rose-800 border border-rose-200">
                                        {language === 'es' ? 'Rechazado' : 'Rejected'}
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md bg-amber-500/10 text-amber-700 border border-amber-300 animate-pulse flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                        {language === 'es' ? 'Aun no aprobado' : 'Not approved yet'}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Trigger Activation Button */}
                                <div className="flex gap-2 mt-1">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        const res = await fetch('/api/servers/publish-pending', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            name: server.name,
                                            mapId: server.mapId,
                                            ownerName: playerName,
                                            previewImage: server.previewImage,
                                            maxPlayers: server.maxPlayers || 16,
                                          })
                                        });
                                        const data = await res.json();
                                        if (res.ok) {
                                          if (data.autoApproved) {
                                            alert(language === 'es' 
                                              ? '¡Servidor reactivado exitosamente directo en Descubrir! (Auto-Aprobado por Staff anterior)' 
                                              : 'Server successfully reactivated directly in Discover! (Auto-Approved from previous staff approval)'
                                            );
                                            fetchServers();
                                            setDiscoverSubMode('servers');
                                          } else {
                                            alert(language === 'es'
                                              ? 'Servidor enviado a cola de aprobación de Staff.'
                                              : 'Server submitted to the Staff approval queue.'
                                            );
                                          }
                                          // Refresh user profile servers array
                                          if (signedIn && playerName) {
                                            const ures = await fetch(`/api/vps/user/${encodeURIComponent(playerName)}`);
                                            if (ures.ok) {
                                              const udata = await ures.json();
                                              if (udata.user && udata.user.servers) {
                                                setMySavedServers(udata.user.servers);
                                                localStorage.setItem('gorebox_my_saved_servers', JSON.stringify(udata.user.servers));
                                              }
                                            }
                                          }
                                        } else {
                                          alert(data.error || 'Error');
                                        }
                                      } catch (e) {
                                        console.error(e);
                                        alert('Error');
                                      }
                                    }}
                                    className="flex-1 py-1.5 bg-pink-500 hover:bg-pink-600 active:scale-95 text-white font-black text-[10px] uppercase rounded-xl transition-all cursor-pointer"
                                  >
                                    {language === 'es' ? 'Activar Servidor' : 'Activate Server'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center p-6 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50">
                          <p className="text-xs font-bold text-gray-400">
                            {language === 'es' ? 'No tienes servidores guardados creados' : 'No saved created servers found'}
                          </p>
                          <p className="text-[10px] text-gray-300 mt-1 font-semibold">
                            {language === 'es' ? 'Crea un servidor nuevo para guardarlo' : 'Create a new server first to save it'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* Personalize View (Complete Interactive Avatar customization workshop) */}
          {view === 'personalize' && personalizeSubView === 'choice' && (
            <div className="px-4 py-8 flex flex-col items-center justify-center gap-6 h-full min-h-[360px]">
              <div className="text-center space-y-1 mb-2">
                <h3 className="text-base font-black text-gray-800 uppercase tracking-tight">
                  {language === 'es' ? 'Taller de Suburbia' : 'Suburbia Workshop'}
                </h3>
                <p className="text-[11px] text-gray-400 font-bold">
                  {language === 'es' ? 'Selecciona una categoría para continuar' : 'Select a category to continue'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
                {/* Avatar Button */}
                <button
                  onClick={() => {
                    setPersonalizeSubView('avatar');
                  }}
                  className="aspect-square w-full rounded-2xl bg-white border-2 border-pink-100 hover:border-pink-500 hover:shadow-lg hover:shadow-pink-500/10 active:scale-95 transition-all flex flex-col items-center justify-center gap-2 text-pink-600 font-black cursor-pointer group shadow-sm p-1"
                >
                  <div className="p-2 bg-pink-50 rounded-xl group-hover:bg-pink-100 transition-colors">
                    <User className="w-6 h-6 text-pink-500" />
                  </div>
                  <span className="text-[11px] uppercase tracking-wider font-extrabold text-gray-800 group-hover:text-pink-600 transition-colors">Avatar</span>
                </button>

                {/* Market Button */}
                <button
                  onClick={() => {
                    setPersonalizeSubView('market');
                  }}
                  className="aspect-square w-full rounded-2xl bg-white border-2 border-emerald-100 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10 active:scale-95 transition-all flex flex-col items-center justify-center gap-2 text-emerald-600 font-black cursor-pointer group shadow-sm p-1"
                >
                  <div className="p-2 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
                    <Store className="w-6 h-6 text-emerald-500" />
                  </div>
                  <span className="text-[11px] uppercase tracking-wider font-extrabold text-gray-800 group-hover:text-emerald-600 transition-colors">Market</span>
                </button>

                {/* Plugins Button */}
                <button
                  onClick={() => {
                    setPersonalizeSubView('plugins');
                  }}
                  className="aspect-square w-full rounded-2xl bg-white border-2 border-indigo-100 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10 active:scale-95 transition-all flex flex-col items-center justify-center gap-2 text-indigo-600 font-black cursor-pointer group shadow-sm p-1"
                >
                  <div className="p-2 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors">
                    <Cpu className="w-6 h-6 text-indigo-500" />
                  </div>
                  <span className="text-[11px] uppercase tracking-wider font-extrabold text-gray-800 group-hover:text-indigo-600 transition-colors">Plugins</span>
                </button>
              </div>
            </div>
          )}

          {view === 'personalize' && personalizeSubView === 'avatar' && (
            <div className="px-4 py-4 flex flex-col gap-5">
              {/* Back Button to choice */}
              <button
                onClick={() => setPersonalizeSubView('choice')}
                className="self-start text-xs font-black text-gray-500 hover:text-gray-800 flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
              >
                ← {language === 'es' ? 'Atrás' : 'Back'}
              </button>

              <div className="bg-pink-50/50 rounded-2xl p-4 border border-pink-100 flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-pink-500 shrink-0" />
                <div>
                  <h3 className="text-sm font-black text-pink-600 uppercase tracking-wider">{t.customizeAvatar}</h3>
                  <p className="text-xs text-gray-500 font-bold mt-0.5">Define tu estilo personalizado.</p>
                </div>
              </div>

              {onOpenAvatarEditor && (
                <button
                  onClick={onOpenAvatarEditor}
                  className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:scale-95 font-black text-xs text-white rounded-2xl shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  ✨ {language === 'es' ? 'ABRIR EDITOR EN 3D COMPLETO' : 'OPEN FULL 3D EDITOR'}
                </button>
              )}

              {/* Skin Presets */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">{t.skinPreset}</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'normal', label: t.classic, bg: 'bg-amber-100', key: 'normal_skin' },
                    { id: 'zombie', label: t.zombie, bg: 'bg-emerald-200', key: 'zombie_skin' },
                    { id: 'werewolf', label: t.werewolf, bg: 'bg-zinc-700 text-white', key: 'werewolf_skin' },
                    { id: 'blue', label: t.neonBlue, bg: 'bg-cyan-400 text-white', key: 'blue_skin' },
                    { id: 'pink', label: t.cyberPink, bg: 'bg-pink-400 text-white', key: 'pink_skin' },
                    { id: 'golden', label: t.golden, bg: 'bg-yellow-400 text-yellow-950 font-black', key: 'golden_skin' }
                  ].map((p) => {
                    const locked = !unlockedItems.includes(p.key);
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          if (locked) {
                            alert(language === 'es' ? '¡Aspecto bloqueado! Cómpralo en el Market.' : 'Skin locked! Buy it in the Market.');
                            return;
                          }
                          setSkinPreset(p.id);
                          if (p.id === 'normal') setSkinColor('#e0a96d');
                          else if (p.id === 'zombie') setSkinColor('#52b788');
                          else if (p.id === 'werewolf') setSkinColor('#4a4e69');
                          else if (p.id === 'blue') setSkinColor('#06b6d4');
                          else if (p.id === 'pink') setSkinColor('#ec4899');
                          else if (p.id === 'golden') setSkinColor('#eab308');
                        }}
                        className={`py-2 px-1 rounded-xl text-[10px] font-black border transition-all active:scale-95 text-center leading-tight truncate ${
                          skinPreset === p.id 
                            ? 'border-pink-500 shadow-md ring-2 ring-pink-400/30 font-black scale-[1.03]' 
                            : 'border-gray-200 hover:border-gray-300'
                        } ${p.bg}`}
                      >
                        {p.label} {locked ? '🔒' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Skin Color Palette */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">{t.skinColor}</label>
                <div className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-2xl border border-gray-100">
                  <input 
                    type="color" 
                    value={skinColor}
                    onChange={(e) => setSkinColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent flex-shrink-0"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-gray-700 block">HEX: {skinColor.toUpperCase()}</span>
                    <span className="text-[10px] font-bold text-gray-400">Selecciona cualquier color de piel.</span>
                  </div>
                </div>
              </div>

              {/* Face Style */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">{t.faceStyle}</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'classic', label: t.classic, emoji: '🙂', key: 'classic_face' },
                    { id: 'angry', label: t.angry, emoji: '😠', key: 'angry_face' },
                    { id: 'creepy', label: t.creepy, emoji: '👹', key: 'creepy_face' },
                    { id: 'anime', label: t.anime, emoji: '✨', key: 'anime_face' },
                    { id: 'cool', label: t.cool, emoji: '😎', key: 'cool_face' }
                  ].map((f) => {
                    const locked = !unlockedItems.includes(f.key);
                    return (
                      <button
                        key={f.id}
                        onClick={() => {
                          if (locked) {
                            alert(language === 'es' ? '¡Cara bloqueada! Cómprala en el Market.' : 'Face locked! Buy it in the Market.');
                            return;
                          }
                          setFaceStyle(f.id);
                        }}
                        className={`py-2 px-3 bg-gray-50 border rounded-xl font-bold text-xs flex items-center justify-between transition-all active:scale-95 ${
                          faceStyle === f.id 
                            ? 'border-pink-500 bg-pink-50/20 shadow-sm shadow-pink-500/10' 
                            : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <span className="text-gray-900">{f.label} {locked ? '🔒' : ''}</span>
                        <span className="text-lg">{f.emoji}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Head Size */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-black text-gray-400 uppercase tracking-wider">
                  <span>{t.headSize}</span>
                  <span className="text-pink-500 font-mono font-black">{Math.round(headScale * 100)}%</span>
                </div>
                <input 
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={headScale}
                  onChange={(e) => setHeadScale(parseFloat(e.target.value))}
                  className="w-full accent-pink-500 h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Apply Changes Button */}
              <div className="relative pt-2">
                <button
                  onClick={handleSavePersonalization}
                  className="w-full py-3 bg-pink-500 hover:bg-pink-600 active:scale-95 font-black text-sm text-white rounded-2xl shadow-lg shadow-pink-500/25 transition-all flex items-center justify-center gap-1.5 animate-pulse"
                >
                  <span>💾</span>
                  <span>{t.save}</span>
                </button>

                {savedBadgeVisible && (
                  <div className="absolute top-[-30px] left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[11px] font-black px-3 py-1 rounded-full shadow-md animate-bounce flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>{t.savedAlert}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Market Sub-View */}
          {view === 'personalize' && personalizeSubView === 'market' && (
            <div className="px-4 py-4 flex flex-col gap-4">
              {/* Back Button to choice */}
              <button
                onClick={() => setPersonalizeSubView('choice')}
                className="self-start text-xs font-black text-gray-500 hover:text-gray-800 flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
              >
                ← {language === 'es' ? 'Atrás' : 'Back'}
              </button>

              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-center gap-3">
                <Store className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <h3 className="text-sm font-black text-emerald-700 uppercase tracking-wider">Suburbia Market</h3>
                  <p className="text-xs text-gray-500 font-bold mt-0.5">
                    {language === 'es' ? 'Gasta tu dinero en aspectos premium.' : 'Spend your cash on premium aspects.'}
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
                {[
                  { id: 'werewolf_skin', name: language === 'es' ? 'Aspecto Hombre Lobo' : 'Werewolf Body', price: 3000, desc: language === 'es' ? 'Conviértete en un feroz hombre lobo.' : 'Become a fierce werewolf.', icon: '🐺', bg: 'bg-zinc-800 text-white' },
                  { id: 'pink_skin', name: language === 'es' ? 'Piel Rosa Ciber' : 'Cyber Pink Skin', price: 2000, desc: language === 'es' ? 'Brillo cibernético rosa de alta tecnología.' : 'High-tech cyber pink glow.', icon: '🌸', bg: 'bg-pink-500 text-white' },
                  { id: 'golden_skin', name: language === 'es' ? 'Piel Dorada de Élite' : 'Golden Elite Skin', price: 5000, desc: language === 'es' ? 'Aspecto de oro macizo ultra brillante.' : 'Ultra shiny solid gold body skin.', icon: '👑', bg: 'bg-yellow-400 text-yellow-950 font-black' },
                  { id: 'creepy_face', name: language === 'es' ? 'Cara Terrorífica' : 'Creepy Face', price: 1500, desc: language === 'es' ? 'Asusta a todos con esta cara de demonio.' : 'Scare everyone with this demon face.', icon: '👹', bg: 'bg-red-500 text-white' },
                  { id: 'cool_face', name: language === 'es' ? 'Gafas de Sol Premium' : 'Premium Sunglasses', price: 1200, desc: language === 'es' ? 'Gafas de sol oscuras ultra facheras.' : 'Super cool dark shades style face.', icon: '😎', bg: 'bg-blue-600 text-white' }
                ].map((item) => {
                  const owned = unlockedItems.includes(item.id);
                  return (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-emerald-300 transition-all shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner ${item.bg}`}>
                          {item.icon}
                        </span>
                        <div>
                          <h4 className="font-extrabold text-gray-900 text-sm leading-tight">{item.name}</h4>
                          <p className="text-[10px] text-gray-400 font-bold mt-0.5 leading-snug">{item.desc}</p>
                          <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full inline-block mt-1">
                            ☘️{item.price.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {owned ? (
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-100/50 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                          {language === 'es' ? 'COMPRADO' : 'OWNED'}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleBuyItem(item.id, item.price)}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-xl active:scale-95 transition-all shadow-sm cursor-pointer whitespace-nowrap"
                        >
                          {language === 'es' ? 'Comprar' : 'Buy'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Plugins Sub-View */}
          {view === 'personalize' && personalizeSubView === 'plugins' && (
            <div className="px-4 py-4 flex flex-col gap-4 text-left">
              {/* Back Button to choice */}
              <button
                onClick={() => setPersonalizeSubView('choice')}
                className="self-start text-xs font-black text-gray-500 hover:text-gray-800 flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
              >
                ← {language === 'es' ? 'Atrás' : 'Back'}
              </button>

              <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 flex items-center gap-3">
                <Cpu className="w-6 h-6 text-indigo-600 shrink-0" />
                <div className="text-left">
                  <h3 className="text-sm font-black text-indigo-700 uppercase tracking-wider">Taller de Plugins</h3>
                  <p className="text-[11px] text-gray-500 font-semibold mt-0.5 leading-snug">
                    {language === 'es' ? 'Equipa y activa tus extensiones especiales para el juego.' : 'Equip and toggle your custom engine mods.'}
                  </p>
                </div>
              </div>

              {/* Plugins List */}
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
                {[
                  { id: 'plugin_gravity', name: language === 'es' ? 'Gravedad Cero (Lunar)' : 'Zero Gravity Physics', price: 2500, desc: language === 'es' ? 'Haz que todo flote suavemente al saltar.' : 'Make everything float weightlessly.', icon: '🌌', bg: 'bg-indigo-600 text-white' },
                  { id: 'plugin_speed', name: language === 'es' ? 'Super Velocidad Flash' : 'Flash Speed Mod', price: 1500, desc: language === 'es' ? 'Aumenta el ritmo y camina a velocidad sónica.' : 'Walk and run at supersonic speed.', icon: '⚡', bg: 'bg-amber-500 text-white' },
                  { id: 'plugin_slowmo', name: language === 'es' ? 'Cámara Lenta Matrix' : 'Matrix Slow Motion', price: 2000, desc: language === 'es' ? 'Ralentiza el paso del tiempo en combate.' : 'Slow down the fabric of time.', icon: '👁️', bg: 'bg-purple-600 text-white' },
                  { id: 'plugin_explosive', name: language === 'es' ? 'Balas Explosivas' : 'Explosive Bullets', price: 3500, desc: language === 'es' ? 'Las balas causan estallidos destructivos.' : 'Make all bullets explode on impact.', icon: '💥', bg: 'bg-red-500 text-white' },
                  { id: 'plugin_godmode', name: language === 'es' ? 'Inmunidad de Dios' : 'God Mode Shield', price: 5000, desc: language === 'es' ? 'Inmortalidad total frente a los enemigos.' : 'Total invincibility from any damage.', icon: '🛡️', bg: 'bg-emerald-600 text-white' }
                ].map((item) => {
                  const owned = unlockedItems.includes(item.id);
                  const isEnabled = localStorage.getItem(`gbox_${item.id}`) === 'true';

                  return (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-indigo-300 transition-all shadow-xs"
                    >
                      <div className="flex items-center gap-3 text-left">
                        <span className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner shrink-0 ${item.bg}`}>
                          {item.icon}
                        </span>
                        <div className="max-w-[140px] sm:max-w-xs">
                          <h4 className="font-extrabold text-gray-900 text-xs leading-tight">{item.name}</h4>
                          <p className="text-[10px] text-gray-400 font-bold mt-0.5 leading-snug">{item.desc}</p>
                          {!owned && (
                            <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full inline-block mt-1">
                              ☘️{item.price.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {owned ? (
                        <button
                          onClick={() => {
                            const nextState = !isEnabled;
                            localStorage.setItem(`gbox_${item.id}`, nextState ? 'true' : 'false');
                            window.dispatchEvent(new Event('storage'));
                            alert(language === 'es' 
                              ? `Plugin ${nextState ? 'activado' : 'desactivado'} correctamente.` 
                              : `Plugin ${nextState ? 'enabled' : 'disabled'} successfully.`
                            );
                            setUnlockedItems([...unlockedItems]);
                          }}
                          className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all active:scale-95 cursor-pointer select-none whitespace-nowrap border ${
                            isEnabled
                              ? 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                              : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {isEnabled ? 'ON' : 'OFF'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBuyItem(item.id, item.price)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl active:scale-95 transition-all shadow-sm cursor-pointer whitespace-nowrap animate-in fade-in"
                        >
                          {language === 'es' ? 'Comprar' : 'Buy'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Settings View with Choose Language */}
          {view === 'settings' && (
            <div className="px-4 py-4 flex flex-col gap-5">
              
              {/* Language Selector */}
              <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex flex-col gap-3">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <span>🌐</span> {t.language}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLanguage('es')}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-extrabold border transition-all active:scale-95 flex items-center justify-center gap-2 ${
                      language === 'es'
                        ? 'bg-pink-500 text-white border-pink-600 shadow-md shadow-pink-500/20 font-black'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span>🇪🇸</span> Español
                  </button>
                  <button
                    onClick={() => setLanguage('en')}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-extrabold border transition-all active:scale-95 flex items-center justify-center gap-2 ${
                      language === 'en'
                        ? 'bg-pink-500 text-white border-pink-600 shadow-md shadow-pink-500/20 font-black'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span>🇺🇸</span> English
                  </button>
                </div>
              </div>

              {/* Frame Rate / FPS Limit Option */}
              <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex flex-col gap-3">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <span>⚡</span> {language === 'es' ? 'Tasa de Cuadros (FPS)' : 'Frame Rate Limit (FPS)'}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: '30', label: language === 'es' ? '30 FPS (Bajo)' : '30 FPS (Low)' },
                    { id: '60', label: language === 'es' ? '60 FPS (Fluido)' : '60 FPS (Fluid)' },
                    { id: '90', label: language === 'es' ? '90 FPS (Ultra)' : '90 FPS (Ultra)' },
                    { id: '120', label: language === 'es' ? '120 FPS (Súper)' : '120 FPS (Super)' },
                    { id: '144', label: language === 'es' ? '144 FPS (Pro)' : '144 FPS (Pro)' },
                    { id: '240', label: language === 'es' ? '240 FPS (Extremo)' : '240 FPS (Extreme)' },
                    { id: 'unlimited', label: language === 'es' ? 'Sin Límite (Máximo)' : 'Unlimited (Max)' }
                  ].map((fps) => (
                    <button
                      key={fps.id}
                      type="button"
                      onClick={() => setFpsLimit(fps.id)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-black border transition-all active:scale-95 text-center truncate ${
                        fpsLimit === fps.id 
                          ? 'bg-pink-500 text-white border-pink-600 shadow-md shadow-pink-500/20 scale-[1.02]' 
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {fps.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 font-bold mt-1 leading-snug">
                  {language === 'es' 
                    ? 'Ajuste de tasa de cuadros local independiente. La física y la simulación se ejecutan a 60 Hz estables sin trabarse ni afectar a los demás jugadores en la partida.' 
                    : 'Independent local frame rate setting. Physics and simulation execute at stable 60 Hz without freezing or affecting other players in the session.'}
                </p>
              </div>

              {/* Informational Message */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 text-center">
                <Settings className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900">{t.settings}</h3>
                <p className="text-gray-500 text-sm mt-2 font-medium">
                  {t.audioGraphics}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation Bar */}
        <div className="bg-white border-t border-gray-200 flex items-center justify-around py-2 px-1 sticky bottom-0 z-20 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
          
          {/* Menu Button (Renamed from Home) */}
          <button 
            onClick={() => {
              setView('main');
              setSearchOpen(false);
            }} 
            className={`flex-1 py-2 flex flex-col items-center gap-1 transition-colors ${view === 'main' ? 'text-pink-500' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <div className={`p-1.5 rounded-full ${view === 'main' ? 'bg-pink-50' : ''}`}>
              <Home className={`w-6 h-6 sm:w-7 sm:h-7 ${view === 'main' ? 'fill-current' : ''}`} />
            </div>
            <span className="text-[10px] font-bold">{t.menu}</span>
          </button>

          {/* Personalize Button (Added brand new next to Menu) */}
          <button 
            onClick={() => {
              setView('personalize');
              setPersonalizeSubView('choice');
              setSearchOpen(false);
            }} 
            className={`flex-1 py-2 flex flex-col items-center gap-1 transition-colors ${view === 'personalize' ? 'text-pink-500' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <div className={`p-1.5 rounded-full ${view === 'personalize' ? 'bg-pink-50' : ''}`}>
              <Wrench className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <span className="text-[10px] font-bold">{t.personalize}</span>
          </button>

          {/* Servers Button */}
          <button 
            onClick={() => {
              setView('multiplayer');
              setSearchOpen(false);
            }} 
            className={`flex-1 py-2 flex flex-col items-center gap-1 transition-colors ${view === 'multiplayer' ? 'text-pink-500' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <div className={`p-1.5 rounded-full ${view === 'multiplayer' ? 'bg-pink-50' : ''}`}>
              <Compass className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <span className="text-[10px] font-bold">{t.discover}</span>
          </button>

          {/* Settings Button */}
          <button 
            onClick={() => {
              setView('settings');
              setSearchOpen(false);
            }} 
            className={`flex-1 py-2 flex flex-col items-center gap-1 transition-colors ${view === 'settings' ? 'text-pink-500' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <div className={`p-1.5 rounded-full ${view === 'settings' ? 'bg-pink-50' : ''}`}>
              <MoreHorizontal className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <span className="text-[10px] font-bold">{t.settings}</span>
          </button>

          {/* Exit / Save Button Unified */}
          <div className="flex-1 flex flex-col items-center relative">
            <button 
              onClick={async () => {
                await handleSavePersonalization();
                handleExitWithBackup();
              }} 
              className="py-1 flex flex-col items-center gap-1 text-emerald-600 hover:text-emerald-700 transition-all active:scale-95 cursor-pointer"
            >
              <div className="relative p-1.5 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg flex items-center justify-center">
                <LogOut className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="absolute -top-1 -right-1 bg-white text-emerald-600 text-[8px] font-black rounded-full w-4 h-4 border border-emerald-200 flex items-center justify-center shadow-xs">
                  💾
                </span>
              </div>
              <span className="text-[9px] font-black uppercase tracking-tight text-center leading-tight">
                {language === 'es' ? 'Salir y Guardar' : 'Exit & Save'}
              </span>
            </button>
          </div>
        </div>

        {/* Authentication Modal Overlay */}
        {isAuthOpen && (
          <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md flex flex-col justify-end">
            <div className="relative bg-slate-900 border-t border-slate-800 rounded-t-[2rem] p-6 space-y-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
              {adminConfirmOpen && (
                <div className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-md flex flex-col justify-center p-6 space-y-6 rounded-t-[2rem]">
                  <div className="text-center space-y-2">
                    <span className="text-4xl">🛡️</span>
                    <h3 className="text-lg font-black text-white tracking-tight leading-snug">
                      Debemos confirmar si eres un verdadero administrador
                    </h3>
                    <p className="text-xs text-slate-400 font-bold">
                      Insertar contraseña:
                    </p>
                  </div>

                  <div className="space-y-4">
                    {adminConfirmError && (
                      <div className="p-3 rounded-xl bg-rose-900/40 border border-rose-500/30 text-rose-200 text-xs font-bold text-center">
                        ⚠️ {adminConfirmError}
                      </div>
                    )}

                    <input
                      type="password"
                      placeholder="••••••••"
                      value={adminConfirmPassword}
                      onChange={(e) => setAdminConfirmPassword(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none placeholder-slate-600 focus:border-red-500/50 transition-colors text-center"
                      autoFocus
                    />

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setAdminConfirmOpen(false);
                          setAdminConfirmPassword('');
                          setAdminConfirmError('');
                        }}
                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-extrabold uppercase tracking-wider rounded-xl border border-slate-700 transition-colors cursor-pointer"
                      >
                        {language === 'es' ? 'Cancelar' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (adminConfirmPassword === 'baughborxd') {
                            setAdminConfirmed(true);
                            setAdminConfirmOpen(false);
                            setAuthPassword('baughborxd');
                            setAdminConfirmError('');
                            setTimeout(() => {
                              const form = document.querySelector('form') as HTMLFormElement;
                              if (form) {
                                form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                              }
                            }, 100);
                          } else {
                            setAdminConfirmError(language === 'es' ? 'Contraseña incorrecta' : 'Incorrect password');
                          }
                        }}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-colors cursor-pointer"
                      >
                        {language === 'es' ? 'Confirmar' : 'Confirm'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {registeredDataForDownload ? (
                /* Dedicated key-private.json download view upon registration */
                <div className="flex flex-col items-center text-center space-y-5 py-4 animate-in zoom-in-95 duration-200">
                  <div className="w-14 h-14 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 shadow-inner">
                    <Check className="w-7 h-7 stroke-[2.5]" />
                  </div>
                  
                  <div className="space-y-1">
                    <h2 className="text-xl font-black text-white tracking-tight">
                      {language === 'es' ? '¡Registro Exitoso!' : 'Registration Successful!'}
                    </h2>
                    <p className="text-[10px] text-emerald-400 font-bold tracking-wider uppercase">
                      SERVIDOR PRINCIPAL • CONEXIÓN EXITOSA
                    </p>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 font-semibold leading-relaxed max-w-[320px]">
                    {language === 'es'
                      ? 'Por favor, descargue la siguiente clave privada (private-key) para que pueda iniciar sesión, ya que es parte fundamental de su cuenta. Mantenga este archivo en un lugar seguro.'
                      : 'Please download the following private-key to log into your account, as it is a fundamental part of your credentials. Keep this file safe.'}
                  </p>

                  {!showDownloadBtn ? (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
                      <span className="text-[11px] text-emerald-400/80 font-semibold tracking-wide">
                        {language === 'es' ? 'Preparando clave de seguridad cifrada...' : 'Preparing encrypted security key...'}
                      </span>
                    </div>
                  ) : (
                    <div className="w-full space-y-3.5 animate-in fade-in duration-300">
                      {/* Private Key Download Button (styled GREEN as requested) */}
                      <button
                        type="button"
                        onClick={() => {
                          const fileDataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(registeredDataForDownload, null, 2));
                          const backupFilename = 'key-private.json';
                          const anchor = document.createElement('a');
                          anchor.setAttribute("href", fileDataStr);
                          anchor.setAttribute("download", backupFilename);
                          document.body.appendChild(anchor);
                          anchor.click();
                          anchor.remove();
                          setHasDownloadedKey(true);
                        }}
                        className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 active:scale-95 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>📥</span> {language === 'es' ? 'Descargar clave privada' : 'Download private key'}
                      </button>

                      {/* Accept and Continue Button (Disabled until private key is downloaded) */}
                      <button
                        type="button"
                        disabled={!hasDownloadedKey}
                        onClick={() => {
                          setRegisteredDataForDownload(null);
                          setIsAuthOpen(false);
                        }}
                        className={`w-full py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-xl border transition-colors ${
                          hasDownloadedKey
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 cursor-pointer'
                            : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed opacity-50'
                        }`}
                      >
                        {language === 'es' ? 'Aceptar y Continuar' : 'Accept & Continue'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-extrabold text-white tracking-tight">
                        {authMode === 'login' 
                          ? (language === 'es' ? 'Iniciar Sesión' : 'Sign In') 
                          : (language === 'es' ? 'Crear Cuenta' : 'Register Account')}
                      </h2>
                      <p className="text-xs text-slate-400 font-bold mt-0.5">
                        {authMode === 'login'
                          ? (language === 'es' ? 'Ingresa a tu cuenta de Suburbia' : 'Access your Suburbia account')
                          : (language === 'es' ? 'Regístrate y guarda tu progreso' : 'Sign up to persist your progress')}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsAuthOpen(false)}
                      className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold flex items-center justify-center text-sm transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                    {/* Error & Success Messages */}
                    {authError && (
                      <div className="p-3 rounded-xl bg-rose-900/40 border border-rose-500/30 text-rose-200 text-xs font-bold text-center">
                        ⚠️ {authError}
                      </div>
                    )}
                    {authSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-900/40 border border-emerald-500/30 text-emerald-200 text-xs font-bold text-center">
                        ✨ {authSuccess}
                      </div>
                    )}

                    {/* Input Fields */}
                    <div className="space-y-3.5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                          {language === 'es' ? 'Nombre de Usuario' : 'Username'}
                        </label>
                        <input
                          type="text"
                          maxLength={18}
                          placeholder={language === 'es' ? 'Tu nombre de jugador' : 'Your player name'}
                          value={authName}
                          onChange={(e) => setAuthName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none placeholder-slate-600 focus:border-pink-500/50 transition-colors"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                          {language === 'es' ? 'Contraseña' : 'Password'}
                        </label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none placeholder-slate-600 focus:border-pink-500/50 transition-colors"
                          required
                        />
                      </div>

                      {authMode === 'register' && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                              {language === 'es' ? 'Fecha de Nacimiento (Mayor de 18)' : 'Date of Birth (18+ Required)'}
                            </label>
                            <input
                              type="date"
                              value={registerBirthdate}
                              onChange={(e) => setRegisterBirthdate(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-pink-500/50 transition-colors text-center cursor-pointer"
                              required
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                              {language === 'es' ? 'Correo Electrónico (Opcional)' : 'Email Address (Optional)'}
                            </label>
                            <input
                              type="email"
                              placeholder="ejemplo@correo.com"
                              value={authEmail}
                              onChange={(e) => setAuthEmail(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none placeholder-slate-600 focus:border-pink-500/50 transition-colors"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Hidden check input for "Entrar" button flow */}
                    {authMode === 'login' && (
                      <input
                        type="file"
                        accept="*/*"
                        id="auth-entrar-file-input"
                        className="hidden"
                        onChange={handleEntrarFileCheck}
                      />
                    )}

                    {/* Submit button */}
                    <button
                      type="submit"
                      className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:scale-98 text-white font-black text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5"
                    >
                      {authMode === 'login' 
                        ? (language === 'es' ? 'Entrar' : 'Sign In') 
                        : (language === 'es' ? 'Registrarse' : 'Create Account')}
                    </button>
                  </form>

                  {/* Mode Toggle footer */}
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode(authMode === 'login' ? 'register' : 'login');
                        setAuthError('');
                        setAuthSuccess('');
                        setAdminConfirmed(false);
                        setHasDownloadedKey(false);
                      }}
                      className="text-xs font-black text-pink-400 hover:text-pink-300 transition-colors"
                    >
                      {authMode === 'login'
                        ? (language === 'es' ? '¿No tienes cuenta? Regístrate aquí' : "Don't have an account? Register here")
                        : (language === 'es' ? '¿Ya tienes cuenta? Inicia sesión' : 'Already have an account? Sign In')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Birthdate & Age Verification Scanner Modal */}
    {isFaceScannerOpen && (
      <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-zinc-950 border-2 border-indigo-500/50 rounded-[2rem] w-full max-w-sm p-6 text-white flex flex-col items-center text-center shadow-[0_0_35px_rgba(99,102,241,0.25)] animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mb-4 shadow-inner">
            <span className="text-3.5xl">📅</span>
          </div>
          <h2 className="text-base font-black tracking-widest uppercase text-indigo-400 mb-1">
            {language === 'es' ? 'Verificación de Edad' : 'Age Verification'}
          </h2>
          <p className="text-[11px] text-zinc-400 mb-5 leading-normal">
            {language === 'es' 
              ? 'Introduce tu fecha de nacimiento. El sistema detectará si eres mayor de 18 años.' 
              : 'Enter your birthdate. The system will detect if you are over 18.'}
          </p>

          {faceScanStatus === 'idle' ? (
            <div className="w-full space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                  {language === 'es' ? 'Fecha de Nacimiento' : 'Date of Birth'}
                </label>
                <input
                  type="date"
                  value={birthdate}
                  onChange={(e) => {
                    setBirthdate(e.target.value);
                    setBirthdateError('');
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white font-extrabold outline-none focus:border-indigo-500/50 transition-colors text-center cursor-pointer"
                />
              </div>

              {birthdateError && (
                <div className="p-3 bg-red-900/30 border border-red-500/30 text-red-300 rounded-xl text-xs font-bold leading-relaxed text-left">
                  ⚠️ {birthdateError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFaceScannerOpen(false)}
                  className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-extrabold uppercase rounded-xl border border-zinc-800 transition-colors cursor-pointer active:scale-95"
                >
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!birthdate) {
                      setBirthdateError(language === 'es' ? 'Por favor, selecciona una fecha válida.' : 'Please select a valid date.');
                      return;
                    }
                    const birthDateObj = new Date(birthdate);
                    const today = new Date();
                    let age = today.getFullYear() - birthDateObj.getFullYear();
                    const m = today.getMonth() - birthDateObj.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
                      age--;
                    }

                    if (isNaN(birthDateObj.getTime())) {
                      setBirthdateError(language === 'es' ? 'Fecha inválida.' : 'Invalid date.');
                      return;
                    }

                    if (age < 18) {
                      setBirthdateError(language === 'es' 
                        ? `Acceso denegado. Tienes ${age} años. Debes tener 18 o más.` 
                        : `Access denied. You are ${age} years old. You must be 18 or older.`
                      );
                    } else {
                      // Trigger scanning animation
                      setFaceScanStatus('scanning');
                      setTimeout(() => {
                        setFaceScanStatus('success');
                        setTimeout(async () => {
                          setIsVerified18(true);
                          localStorage.setItem('gorebox_verified_18', 'true');
                          setIsFaceScannerOpen(false);
                          setFaceScanStatus('idle');

                          if (playerName) {
                            try {
                              await fetch('/api/vps/update', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  username: playerName,
                                  isVerified18: true,
                                  verificationDate: new Date().toISOString()
                                })
                              });
                            } catch (e) {
                              console.error("VPS verification save error:", e);
                            }
                          }
                        }, 1500);
                      }, 2000);
                    }
                  }}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl shadow-md transition-colors cursor-pointer active:scale-95"
                >
                  {language === 'es' ? 'Verificar' : 'Verify'}
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              <div className="relative w-44 h-44 rounded-2xl bg-zinc-900 border border-indigo-500/30 overflow-hidden mb-5 flex items-center justify-center">
                {faceScanStatus === 'scanning' && (
                  <div className="absolute inset-x-0 h-1 bg-indigo-500 shadow-[0_0_10px_indigo] animate-[bounce_1.5s_infinite]" />
                )}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.1)_0%,transparent_70%)]" />
                <div className="flex flex-col items-center gap-2 z-10 px-2">
                  {faceScanStatus === 'scanning' && (
                    <span className="text-[10px] font-mono text-indigo-300 animate-pulse uppercase tracking-wider">
                      {language === 'es' ? 'Validando fecha de nacimiento...' : 'Analyzing date of birth...'}
                    </span>
                  )}
                  {faceScanStatus === 'success' && (
                    <div className="flex flex-col items-center text-emerald-400 animate-in zoom-in">
                      <span className="text-3xl mb-1">✓</span>
                      <span className="text-xs font-black tracking-wider uppercase">
                        {language === 'es' ? '¡Mayor de edad verificado!' : 'Over 18+ Detected!'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[11px] font-mono text-zinc-500">
                {faceScanStatus === 'scanning' 
                  ? (language === 'es' ? 'Ejecutando algoritmo inteligente...' : 'Executing check algorithm...') 
                  : (language === 'es' ? '¡Verificación completada!' : 'Verification completed!')}
              </div>
            </div>
          )}
        </div>
      </div>
    )}

    {/* Exit Confirmation Professional Backup Modal */}
    {showExitConfirmModal && (
      <div className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] w-full max-w-sm p-6 text-white flex flex-col items-center text-center shadow-2xl animate-in zoom-in-95">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 shadow-inner">
            <LogOut className="w-7 h-7" />
          </div>
          <h2 className="text-base font-black tracking-wider uppercase text-white mb-2">Aviso de Salida</h2>
          <p className="text-xs text-slate-300 font-medium mb-6 leading-relaxed">
            {language === 'es'
              ? '¿Deseas descargar una copia de seguridad profesional de tus datos actuales antes de salir del juego?'
              : 'Do you want to download a professional backup of your current game data before exiting?'}
          </p>

          <div className="flex flex-col gap-2.5 w-full">
            <button
              onClick={confirmExitAndDownload}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>📥</span> {language === 'es' ? 'Descargar Copia y Salir' : 'Download Backup & Exit'}
            </button>
            <button
              onClick={() => {
                setShowExitConfirmModal(false);
                window.close();
              }}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              {language === 'es' ? 'Salir sin Guardar' : 'Exit Without Saving'}
            </button>
            <button
              onClick={() => setShowExitConfirmModal(false)}
              className="w-full py-2 text-slate-500 hover:text-slate-300 font-bold text-xs transition-colors cursor-pointer mt-1"
            >
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Create Server Modal in Discover */}
    {showCreateServerModal && (
      <div className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] w-full max-w-sm p-6 text-white flex flex-col shadow-2xl animate-in zoom-in-95">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-black tracking-wider uppercase text-white">
              {language === 'es' ? 'Crear Servidor Privado' : 'Create Private Server'}
            </h2>
            <button
              onClick={() => setShowCreateServerModal(false)}
              className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold flex items-center justify-center text-sm"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                {language === 'es' ? 'Nombre del Servidor' : 'Server Name'}
              </label>
              <input
                type="text"
                maxLength={24}
                value={newServerName}
                onChange={(e) => setNewServerName(e.target.value)}
                placeholder={language === 'es' ? 'Ej: Servidor Pro Gore' : 'Ex: Pro Gore Server'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-bold outline-none focus:border-pink-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                {language === 'es' ? 'Mapa' : 'Map'}
              </label>
              <select
                value={newServerMapId}
                onChange={(e) => setNewServerMapId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-bold outline-none focus:border-pink-500"
              >
                <option value="cesped2">Bosque de Césped</option>
                <option value="lab">Laboratorio</option>
                <option value="almacen">Almacén Industrial</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                {language === 'es' ? 'Dibujar / Crear Vista Previa del Servidor' : 'Draw / Create Server Preview'}
              </label>
              <div className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden relative touch-none flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  width={280}
                  height={128}
                  onPointerDown={startDrawing}
                  onPointerMove={drawPreview}
                  onPointerUp={stopDrawing}
                  onPointerLeave={stopDrawing}
                  className="w-full h-full cursor-crosshair bg-zinc-950"
                />
                {!serverPreviewDataUrl && (
                  <span className="absolute text-[10px] text-zinc-500 font-bold pointer-events-none">
                    {language === 'es' ? 'Dibuja aquí tu portada' : 'Draw your cover here'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleCreateServerSubmit}
            className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:scale-95 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" /> {language === 'es' ? 'Publicar Servidor en Descubrir' : 'Publish Server in Discover'}
          </button>
        </div>
      </div>
    )}

    {/* Canvas Painting Modal */}
    {paintModalOpen && (
      <div className="fixed inset-0 z-[140] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
        <div className="bg-white border-4 border-black rounded-[2rem] w-full max-w-sm p-6 text-slate-900 flex flex-col shadow-2xl animate-in zoom-in-95">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h2 className="text-xs font-black tracking-wider uppercase text-gray-800 flex items-center gap-1.5">
              <span>🎨</span> {language === 'es' ? 'Dibujar Portada de Servidor' : 'Draw Server Cover'}
            </h2>
            <button
              onClick={() => setPaintModalOpen(false)}
              className="w-8 h-8 rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200 font-bold flex items-center justify-center text-xs"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col items-center gap-4">
            {/* Color Palette */}
            <div className="flex flex-wrap gap-2 justify-center shrink-0">
              {[
                { name: 'Negro', code: '#000000' },
                { name: 'Rojo', code: '#ef4444' },
                { name: 'Azul', code: '#3b82f6' },
                { name: 'Verde', code: '#10b981' },
                { name: 'Amarillo', code: '#f59e0b' },
                { name: 'Rosa', code: '#ec4899' },
                { name: 'Gris', code: '#6b7280' },
                { name: 'Blanco', code: '#ffffff' }
              ].map((color) => (
                <button
                  key={color.code}
                  type="button"
                  onClick={() => setBrushColor(color.code)}
                  className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                    brushColor === color.code ? 'border-pink-500 scale-110 shadow-md' : 'border-gray-300 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.code }}
                  title={color.name}
                />
              ))}
            </div>

            {/* Brush Size Slider */}
            <div className="w-full flex items-center gap-3 shrink-0">
              <span className="text-[10px] font-black uppercase text-gray-400">Grosor:</span>
              <input
                type="range"
                min="2"
                max="24"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value) || 6)}
                className="flex-1 accent-pink-500"
              />
              <span className="text-xs font-black text-gray-700 w-5 text-right">{brushSize}px</span>
            </div>

            {/* Drawing Canvas */}
            <div className="w-64 h-64 bg-white border-[4px] border-black rounded-2xl overflow-hidden relative touch-none shadow-inner">
              <canvas
                ref={paintCanvasRef}
                width={256}
                height={256}
                onPointerDown={startPainting}
                onPointerMove={drawPainting}
                onPointerUp={stopPainting}
                onPointerLeave={stopPainting}
                className="w-full h-full bg-white cursor-crosshair"
              />
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 w-full shrink-0">
              <button
                type="button"
                onClick={clearPaintCanvas}
                className="py-2.5 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                🗑️ {language === 'es' ? 'Limpiar' : 'Clear'}
              </button>
              <button
                type="button"
                onClick={savePaintDrawing}
                className="py-2.5 bg-pink-500 hover:bg-pink-600 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
              >
                💾 {language === 'es' ? 'Guardar' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Rules Compliance Delay Notification Modal */}
    {showRulesWaitingModal && (
      <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
        <div className="bg-white border-4 border-black rounded-[2.5rem] w-full max-w-sm p-6 text-slate-900 flex flex-col items-center text-center shadow-2xl animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-3xl bg-pink-50 border-2 border-pink-500 flex items-center justify-center text-pink-500 mb-4 animate-bounce">
            <span className="text-3xl">⏳</span>
          </div>
          <h2 className="text-sm font-black tracking-wider uppercase text-gray-900 mb-2">
            {language === 'es' ? 'Servidor Recibido' : 'Server Submitted'}
          </h2>
          <p className="text-xs text-gray-500 font-bold leading-relaxed mb-6 px-1">
            {language === 'es'
              ? 'Por favor espere hasta que un administrador confirme que el servidor cumple con las reglas para que aparezca en Descubrir.'
              : 'Please wait until an administrator confirms that the server complies with the rules to appear in Discover.'}
          </p>
          <button
            onClick={() => setShowRulesWaitingModal(false)}
            className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:scale-95 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-all cursor-pointer"
          >
            {language === 'es' ? 'Comprendido' : 'Got it'}
          </button>
        </div>
      </div>
    )}

    {/* Search Profile Viewer Modal */}
    {selectedUserProfile && (
      <div className="fixed inset-0 z-[160] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
        <div 
          className="w-full max-w-[340px] bg-white rounded-[2.5rem] border-[6px] border-pink-100 shadow-[0_24px_50px_-12px_rgba(219,39,119,0.3)] overflow-hidden transform transition-all p-6 relative animate-scale-up"
          style={{
            boxShadow: '0 24px 50px rgba(219, 39, 119, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.4)'
          }}
        >
          {/* Header / Close Button */}
          <button 
            onClick={() => setSelectedUserProfile(null)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 flex items-center justify-center font-black text-sm cursor-pointer transition-transform active:scale-90"
          >
            ✕
          </button>

          {/* Profile Content */}
          <div className="flex flex-col items-center text-center mt-2">
            
            {/* Dynamic Animated Avatar Frame */}
            <div className="relative mb-4">
              <PlayerAvatarPreview player={selectedUserProfile} />
            </div>

            {/* Player Name & Badges */}
            <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-1.5 justify-center flex-wrap">
              <span>{selectedUserProfile.name}</span>
              {(() => {
                const rankInfo = getPlayerRankInfo(selectedUserProfile);
                return (
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${rankInfo.bg} tracking-wider`}>
                    {rankInfo.name}
                  </span>
                );
              })()}
            </h3>

            {/* Status */}
            <p className="text-xs font-bold text-gray-400 mt-0.5 uppercase tracking-widest flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              <span>{language === 'es' ? 'En línea' : 'Online'}</span>
            </p>

            {/* Dividers */}
            <div className="w-full h-px bg-gray-100 my-5" />

            {/* Stats Grid: Fanáticos & Amigos */}
            <div className="grid grid-cols-2 gap-4 w-full">
              {/* Fanáticos Card */}
              <div className="bg-pink-50/60 border border-pink-100/50 rounded-2xl p-3 flex flex-col items-center">
                <span className="text-2xl mb-1 filter drop-shadow-sm select-none">⭐</span>
                <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest leading-none">
                  {language === 'es' ? 'Fanáticos' : 'Fans'}
                </span>
                <span className="text-lg font-black text-pink-600 mt-1">
                  0
                </span>
              </div>

              {/* Amigos Card */}
              <div className="bg-emerald-50/60 border border-emerald-100/50 rounded-2xl p-3 flex flex-col items-center">
                <span className="text-2xl mb-1 filter drop-shadow-sm select-none">🤝</span>
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">
                  {language === 'es' ? 'Amigos' : 'Friends'}
                </span>
                <span className="text-lg font-black text-emerald-600 mt-1">
                  0
                </span>
              </div>
            </div>

            {/* Extra Info: Balance/Money only shown if viewing own profile */}
            {selectedUserProfile && selectedUserProfile.name && selectedUserProfile.name.trim().toLowerCase() === playerName.trim().toLowerCase() && (
              <div className="mt-4 bg-emerald-50/50 border border-emerald-200/50 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-xs text-xs font-black text-emerald-700">
                <PixelGreenCoin />
                <span>{selectedUserProfile.money ? selectedUserProfile.money.toLocaleString() : '0'}</span>
              </div>
            )}

            {/* Friend Request & Admire Buttons */}
            {(() => {
              const isOwn = selectedUserProfile && selectedUserProfile.name && selectedUserProfile.name.trim().toLowerCase() === playerName.trim().toLowerCase();
              return (
                <div className="grid grid-cols-2 gap-2 w-full mt-4">
                  <button
                    disabled={isOwn}
                    onClick={() => {
                      if (!isOwn) {
                        try {
                          const priv = JSON.parse(localStorage.getItem('gorebox_key_private_state') || '{}');
                          priv.friendRequested = priv.friendRequested || {};
                          priv.friendRequested[selectedUserProfile.name] = true;
                          localStorage.setItem('gorebox_key_private_state', JSON.stringify(priv));
                        } catch {}
                        alert(language === 'es' ? '¡Solicitud de amistad enviada y guardada en key-private!' : 'Friend request sent and saved to key-private!');
                      }
                    }}
                    className={`py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                      isOwn
                        ? 'bg-gray-200 text-gray-400 border border-gray-300 opacity-50 cursor-not-allowed pointer-events-none'
                        : 'bg-sky-500 hover:bg-sky-600 text-white shadow-md active:scale-95 cursor-pointer'
                    }`}
                  >
                    <span>🤝</span>
                    <span>{language === 'es' ? 'Pedir Amistad' : 'Add Friend'}</span>
                  </button>

                  <button
                    disabled={isOwn}
                    onClick={() => {
                      if (!isOwn) {
                        try {
                          const priv = JSON.parse(localStorage.getItem('gorebox_key_private_state') || '{}');
                          priv.admired = priv.admired || {};
                          priv.admired[selectedUserProfile.name] = true;
                          localStorage.setItem('gorebox_key_private_state', JSON.stringify(priv));
                        } catch {}
                        alert(language === 'es' ? '¡Ahora eres admirador y se guardó en key-private!' : 'You are now admiring and saved to key-private!');
                      }
                    }}
                    className={`py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                      isOwn
                        ? 'bg-gray-200 text-gray-400 border border-gray-300 opacity-50 cursor-not-allowed pointer-events-none'
                        : 'bg-amber-500 hover:bg-amber-600 text-white shadow-md active:scale-95 cursor-pointer'
                    }`}
                  >
                    <span>⭐</span>
                    <span>{language === 'es' ? 'Admirar' : 'Admire'}</span>
                  </button>
                </div>
              );
            })()}

            {/* Action Button */}
            <button 
              onClick={() => setSelectedUserProfile(null)}
              className="w-full mt-4 py-3 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-pink-500/20 active:scale-95 transition-transform cursor-pointer"
            >
              {language === 'es' ? 'Cerrar Perfil' : 'Close Profile'}
            </button>

          </div>
        </div>
      </div>
    )}
    </>
  );
};
