import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Info, Cpu, Loader2 } from 'lucide-react';
import { TouchHUD } from './TouchHUD';
import { StartupDisclaimer } from './StartupDisclaimer';
import { AvatarEditorModal } from './AvatarEditorModal';
import { GameMenuModal, ServerInfo } from './GameMenuModal';
import { MultiplayerClient, RemotePlayerState } from '../engine/multiplayerClient';
import { GAME_MAPS_3D, buildSceneEnvironment3D } from '../engine/maps3D';
import { PhysicsEngine3D } from '../engine/physicsEngine3D';
import {
  createArticulatedRagdoll3D,
  destroyLimbVoxelsAtPoint,
  addConnectedWoundSpheresToLimb,
  applySphericalMorph,
  applyHoleMorphToMesh,
  paintWoundOnParticleAndAnatomy,
  paintOrDigHoleOnParticle,
} from '../engine/ragdollBuilder3D';
import { soundEngine } from '../engine/soundEngine';
import { FaceFeatureMode, HotPoseType } from '../types/physics3d';
import { paintCanvasBulletWoundOnMesh } from '../engine/bulletHoleShader';
import { humanSpeechEngine } from '../engine/humanSpeechEngine';
import { GameChat } from './GameChat';
import { BlockInspectorHUD } from './BlockInspectorHUD';
import { ElectroCubeHUD } from './ElectroCubeHUD';
import { OverheadChatBubbles } from './OverheadChatBubbles';
import { ChatMessage, OverheadBubble, SpeakerType } from '../types/chat';
import { InspectedBlockInfo, ElectroCube3D } from '../types/physics3d';

export const GoreboxGame3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const engineRef = useRef<PhysicsEngine3D | null>(null);

  const [showDisclaimer, setShowDisclaimer] = useState<boolean>(true);
  const [isResourceLoading, setIsResourceLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadingText, setLoadingText] = useState<string>('Iniciando motor de física y gráficos 3D...');

  const loadingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawingOnLoading, setIsDrawingOnLoading] = useState<boolean>(false);

  const startLoadingDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = loadingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#db2777'; // Un color rosa bonito para dibujar
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      e.preventDefault();
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawingOnLoading(true);
  };

  const drawOnLoading = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingOnLoading) return;
    const canvas = loadingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      e.preventDefault();
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopLoadingDrawing = () => {
    setIsDrawingOnLoading(false);
  };

  const clearLoadingDrawing = () => {
    const canvas = loadingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    // Stage 0: Instant white screen mount frame (0ms)
    setLoadingProgress(5);
    setLoadingText('Iniciando pantalla de inicialización...');

    // Stage 1: White screen painted and visible on screen (500ms)
    const t1 = setTimeout(() => {
      setLoadingProgress(25);
      setLoadingText('Iniciando motor de física y gráficos 3D...');
    }, 500);

    // Stage 2: Heavy 3D scene & PhysicsEngine creation (1300ms)
    const t2 = setTimeout(() => {
      setLoadingProgress(60);
      setLoadingText('Cargando mapa, iluminación y colisiones...');
    }, 1300);

    // Stage 3: Character ragdolls & weapons (2200ms)
    const t3 = setTimeout(() => {
      setLoadingProgress(85);
      setLoadingText('Inicializando personajes y física ragdoll...');
    }, 2200);

    // Stage 4: Ready (3000ms)
    const t4 = setTimeout(() => {
      setLoadingProgress(100);
      setLoadingText('¡Entorno y física listos correctamente!');
    }, 3000);

    // Stage 5: Hide loading overlay (3400ms)
    const t5 = setTimeout(() => {
      setIsResourceLoading(false);
    }, 3400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, []);
  const [isAlive, setIsAlive] = useState<boolean>(true);
  const [isPaintMode, setIsPaintMode] = useState<boolean>(false);
  const [paintHoleRadius, setPaintHoleRadius] = useState<number>(0.08);
  const paintHoleRadiusRef = useRef<number>(0.08);
  useEffect(() => {
    paintHoleRadiusRef.current = paintHoleRadius;
  }, [paintHoleRadius]);
  const [activeMapId, setActiveMapId] = useState<string>('lab');
  const [isWalkingRagdoll, setIsWalkingRagdoll] = useState<boolean>(false);
  const [cameraDistance, setCameraDistance] = useState<number>(5.5);
  const [hasWeapon, setHasWeapon] = useState<boolean>(false);
  const [isAiming, setIsAiming] = useState<boolean>(false);
  const [isFreeCamAiming, setIsFreeCamAiming] = useState<boolean>(false);
  const isFreeCamAimingRef = useRef<boolean>(false);
  const [soldierCount, setSoldierCount] = useState<number>(0);
  const [dummyCount, setDummyCount] = useState<number>(0);
  const [zombieCount, setZombieCount] = useState<number>(0);
  const [tentacleCount, setTentacleCount] = useState<number>(0);
  const [werewolfCount, setWerewolfCount] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [inspectedBlock, setInspectedBlock] = useState<InspectedBlockInfo | null>(null);

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    soundEngine.setMuted(nextMute);
  };

  useEffect(() => {
    soundEngine.setMuted(true);
  }, []);
  
  const [selectedPart, setSelectedPart] = useState<{ragdollId: string, particleId: string, name: string, worldPos: THREE.Vector3} | null>(null);
  const [selectedPartWidth, setSelectedPartWidth] = useState<number>(100);
  const [copiedProportions, setCopiedProportions] = useState<boolean>(false);
  const [isSymmetricAdjustment, setIsSymmetricAdjustment] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const selectedPartRef = useRef<any>(null);

  const getSymmetricPartName = (name: string): string | null => {
    if (name.endsWith('_izq')) return name.replace(/_izq$/, '_der');
    if (name.endsWith('_der')) return name.replace(/_der$/, '_izq');
    if (name.includes('_izq_')) return name.replace('_izq_', '_der_');
    if (name.includes('_der_')) return name.replace('_der_', '_izq_');
    if (name.endsWith('1')) return name.replace(/1$/, '2');
    if (name.endsWith('2')) return name.replace(/2$/, '1');
    return null;
  };

  const handleUpdateLimbWidth = (newVal: number) => {
    setSelectedPartWidth(newVal);
    if (!engineRef.current || !selectedPart) return;

    engineRef.current.setLimbWidthMultiplier(
      selectedPart.ragdollId,
      selectedPart.particleId,
      newVal / 100
    );

    if (isSymmetricAdjustment) {
      const symName = getSymmetricPartName(selectedPart.name);
      if (symName) {
        const ragdoll = engineRef.current.ragdolls.find((r) => r.id === selectedPart.ragdollId);
        const symPart = ragdoll?.particles.find((p) => p.name === symName);
        if (symPart) {
          engineRef.current.setLimbWidthMultiplier(
            selectedPart.ragdollId,
            symPart.id,
            newVal / 100
          );
        }
      }
    }
  };

  const handleUpdateSpecificLimbWidth = (partName: string, mult: number) => {
    if (!engineRef.current) return;
    const player = engineRef.current.ragdolls.find((r) => r.isControlled) || engineRef.current.ragdolls[0];
    if (!player) return;
    engineRef.current.setLimbWidthMultiplier(player.id, partName, mult);
  };

  useEffect(() => {
    selectedPartRef.current = selectedPart;
  }, [selectedPart]);

  const copyLimbProportionsCode = () => {
    if (!selectedPart || !engineRef.current) return;
    const engine = engineRef.current;
    const ragdoll = engine.ragdolls.find((r) => r.id === selectedPart.ragdollId);
    if (!ragdoll) return;

    const proportions: Record<string, number> = {};
    for (const p of ragdoll.particles) {
      proportions[p.name] = p.widthMultiplier !== undefined ? p.widthMultiplier : 1.0;
    }

    const codeString = `// Proporciones de anchos de extremidades de Gorebox 3D:
const proporcionesAnchos: Record<string, number> = ${JSON.stringify(proportions, null, 2)};`;

    setProportionsCodeText(codeString);

    navigator.clipboard.writeText(codeString)
      .then(() => {
        setCopiedProportions(true);
        setToastMessage("¡Proporciones copiadas al portapapeles!");
        setTimeout(() => {
          setCopiedProportions(false);
          setToastMessage(null);
        }, 2500);
      })
      .catch((err) => {
        console.error("Error al copiar:", err);
        setToastMessage("No se pudo copiar. Inténtalo de nuevo.");
        setTimeout(() => setToastMessage(null), 2500);
      });
  };

  const inflateIntervalRef = useRef<number | null>(null);
  const [showGrabMenu, setShowGrabMenu] = useState<boolean>(false);
  const [activeGrabs, setActiveGrabs] = useState<{left: boolean, right: boolean}>({left: false, right: false});
  const [contourLevel, setContourLevel] = useState<number>(100);
  const [contourSmoothness, setContourSmoothness] = useState<number>(100);
  const [contourEnabled, setContourEnabled] = useState<boolean>(true);
  const [contourJointStyle, setContourJointStyle] = useState<'pseudo3d' | 'blocky' | 'cylinder'>('cylinder');
  const [startupBlockyRemaining, setStartupBlockyRemaining] = useState<number>(0);
  const startupBlockyRef = useRef<number>(0);
  const [voxelShape, setVoxelShape] = useState<'cube' | 'sphere'>('cube');
  const [voxelDensity, setVoxelDensity] = useState<number>(2);
  const [hasBustAndGlutes, setHasBustAndGlutes] = useState<boolean>(false);
  const [genitalType, setGenitalType] = useState<'none' | 'male' | 'female'>('male');
  const [genitalMShaftLength, setGenitalMShaftLength] = useState<number>(1.0);
  const [genitalMShaftThickness, setGenitalMShaftThickness] = useState<number>(1.0);
  const [genitalMPinkSize, setGenitalMPinkSize] = useState<number>(1.0);
  const [genitalFSize, setGenitalFSize] = useState<number>(1.0);
  const [hasShirt, setHasShirt] = useState<boolean>(false);
  const [shirtColorHex, setShirtColorHex] = useState<number>(0x38bdf8);
  const [hasPants, setHasPants] = useState<boolean>(false);
  const [pantsColorHex, setPantsColorHex] = useState<number>(0x1e3a8a);
  const [hasUnderwear, setHasUnderwear] = useState<boolean>(false);
  const [underwearColorHex, setUnderwearColorHex] = useState<number>(0x020617);
  const [hasGloves, setHasGloves] = useState<boolean>(false);
  const [glovesColorHex, setGlovesColorHex] = useState<number>(0x0f172a);
  const [hasBoots, setHasBoots] = useState<boolean>(false);
  const [bootsColorHex, setBootsColorHex] = useState<number>(0x0f172a);
  const [hasSocks, setHasSocks] = useState<boolean>(false);
  const [socksColorHex, setSocksColorHex] = useState<number>(0xffffff);
  const [skinColorHex, setSkinColorHex] = useState<number>(0xf5d0b5);
  const [proportionsCodeText, setProportionsCodeText] = useState<string | null>(null);
  const [hairType, setHairType] = useState<string>('none');
  const [hairColorHex, setHairColorHex] = useState<number>(0x1c1917);
  const [beardType, setBeardType] = useState<string>('none');
  const [beardColorHex, setBeardColorHex] = useState<number>(0x1c1917);
  const [hatType, setHatType] = useState<string>('none');
  const [hatColorHex, setHatColorHex] = useState<number>(0xdc2626);
  const [glassesType, setGlassesType] = useState<string>('none');
  const [glassesColorHex, setGlassesColorHex] = useState<number>(0x0f172a);
  const [activeEmote, setActiveEmote] = useState<string | null>(null);

  const handleTriggerEmote = (emoteName: string | null) => {
    setActiveEmote(emoteName);
    if (engineRef.current) {
      engineRef.current.triggerEmote(undefined, emoteName);
    }
  };

  const [faceFeatureMode, setFaceFeatureMode] = useState<FaceFeatureMode>('pseudo_cylinders');
  const [faceFloatDepth, setFaceFloatDepth] = useState<number>(0.04);
  const [eyeHolesEnabled, setEyeHolesEnabled] = useState<boolean>(false);
  const [activeHotNPCsInfo, setActiveHotNPCsInfo] = useState<any[]>([]);
  const [liquidQuantity, setLiquidQuantity] = useState<number>(35);
  const [poolWaterHeight, setPoolWaterHeight] = useState<number>(30); // 0-100
  const [shootCooldownRemaining, setShootCooldownRemaining] = useState<number>(0);
  const [isSprinting, setIsSprinting] = useState<boolean>(false);
  const isSprintingRef = useRef<boolean>(false);
  const [xrayMode, setXrayMode] = useState<number>(0);
  const [showSoundWaves, setShowSoundWaves] = useState<boolean>(true);
  const [isFlying, setIsFlying] = useState<boolean>(false);
  const [isGodMode, setIsGodMode] = useState<boolean>(false);
  const [isZeroGravity, setIsZeroGravity] = useState<boolean>(false);
  const [characterTexturesEnabled, setCharacterTexturesEnabled] = useState<boolean>(false);
  const [pubicHairEnabled, setPubicHairEnabled] = useState<boolean>(true);
  const [pubicHairIntensity, setPubicHairIntensity] = useState<number>(5);

  const [bodyCubicity, setBodyCubicity] = useState<number>(24);
  const [limbSizeMultiplier, setLimbSizeMultiplier] = useState<number>(1.0);

  const handleBodyCubicityChange = (val: number) => {
    setBodyCubicity(val);
    if (engineRef.current) {
      engineRef.current.setBodyCubicity(val);
    }
  };

  const handleLimbSizeMultiplierChange = (val: number) => {
    setLimbSizeMultiplier(val);
    if (engineRef.current) {
      engineRef.current.setLimbSizeMultiplier(val);
    }
  };

  const handlePubicHairEnabledChange = (enabled: boolean) => {
    setPubicHairEnabled(enabled);
    if (engineRef.current) {
      engineRef.current.setPlayerPubicHair(enabled, pubicHairIntensity);
    }
  };

  const handlePubicHairIntensityChange = (val: number) => {
    setPubicHairIntensity(val);
    if (engineRef.current) {
      engineRef.current.setPlayerPubicHair(pubicHairEnabled, val);
    }
  };
  const [currentWeather, setCurrentWeather] = useState<'day' | 'evening' | 'night' | 'rain' | 'storm'>('day');

  const handleWeatherChange = (weather: 'day' | 'evening' | 'night' | 'rain' | 'storm') => {
    setCurrentWeather(weather);
    if (engineRef.current) {
      engineRef.current.setWeather(weather);
    }
  };

  // --- SPEECH TEST SYSTEM (A to Z phonetically rich Spanish phrases) ---
  const ALPHABET_SPANISH_PHRASES = [
    "A de Araña y Alacrán. ¡Hola a todos!",
    "Bailo con las botas bien puestas.",
    "Canto canciones con cariño y calma.",
    "Dado dorado de dieciséis dados.",
    "El elefante elegante entra en escena.",
    "Fuego fuerte de fósforos finos.",
    "Gatos gordos ganan grandes galletas.",
    "Hablo con honestidad y sin humo.",
    "Imágenes de islas increíbles e idílicas.",
    "Jirafas jóvenes juegan juntas.",
    "Kilos de kiwis en el quiosco de Tokio.",
    "Luz de luna llena ilumina la llanura.",
    "Manos mágicas mueven montañas.",
    "Niños y niñas comen ñoquis con cariño.",
    "Ocho osos comen ostras con orgullo.",
    "Pequeños pájaros pintan paisajes.",
    "Queso quemado de calidad querida.",
    "Rápidas ruedas corren por la carretera.",
    "Soles sabios surcan cielos silenciosos.",
    "Tengo tres tigres tristes en el trigal.",
    "Un universo único de uvas y ukeleles.",
    "Viento veloz de verano en el valle.",
    "Wafles de Washington con mucha crema.",
    "Xilófonos de la galaxia en Texas.",
    "Yo ya comí yemas de huevo ayer.",
    "Zapatos azules de zanahoria en Zaragoza."
  ];

  const [speechText, setSpeechText] = useState<string>('');
  const [speechBubblePos, setSpeechBubblePos] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const speechIndexRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // --- CHAT & OVERHEAD SPEECH BUBBLES SYSTEM ---
  const [activeElectroCube, setActiveElectroCube] = useState<ElectroCube3D | null>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }
      if (e.key === 'Enter' || e.key === 't' || e.key === 'T') {
        setIsChatOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      senderId: 'system',
      senderName: 'Sistema',
      speakerType: 'system',
      text: '¡Bienvenido! Presiona [Enter] o el botón de Chat para hablar como tu personaje o hacer hablar a los ragdolls.',
      timestamp: Date.now(),
    },
  ]);
  const [activeBubbles, setActiveBubbles] = useState<OverheadBubble[]>([]);
  const [chatTtsEnabled, setChatTtsEnabled] = useState<boolean>(true);
  const chatTtsEnabledRef = useRef<boolean>(true);
  chatTtsEnabledRef.current = chatTtsEnabled;

  const [selectedSpeakerType, setSelectedSpeakerType] = useState<SpeakerType>('player');
  const [selectedRagdollId, setSelectedRagdollId] = useState<string | undefined>(undefined);

  const addOverheadBubble = (
    speakerId: string,
    speakerType: SpeakerType,
    speakerName: string,
    text: string,
    color?: string
  ) => {
    const id = `bubble_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const bubble: OverheadBubble = {
      id,
      speakerId,
      speakerType,
      speakerName,
      text,
      color: color || (speakerType === 'player' ? '#38bdf8' : speakerType === 'ragdoll' ? '#fbbf24' : '#34d399'),
      timestamp: Date.now(),
      expiresAt: Date.now() + 5500,
    };

    setActiveBubbles((prev) => {
      const filtered = prev.filter((b) => b.speakerId !== speakerId);
      return [...filtered, bubble];
    });

    setTimeout(() => {
      setActiveBubbles((prev) => prev.filter((b) => b.id !== id));
    }, 5500);
  };

  const getSpeakerWorldPosition = (bubble: OverheadBubble): THREE.Vector3 | null => {
    const engine = engineRef.current;
    if (!engine) return null;

    if (bubble.speakerType === 'player') {
      const player = engine.ragdolls.find((r) => r.isControlled) || engine.ragdolls[0];
      if (!player) return null;

      if (player.isAlive && !player.isWalkingRagdoll) {
        if (!player.charPos) return null;
        return new THREE.Vector3(
          player.charPos.x,
          player.charPos.y + 1.85 * (player.scale || 1.0),
          player.charPos.z
        );
      } else {
        const headP = player.particles?.find((p) => p.name === 'cabeza') || player.particles?.[0];
        if (headP) {
          return new THREE.Vector3(headP.x, headP.y + 0.45 * (player.scale || 1.0), headP.z);
        }
        if (player.charPos) {
          return new THREE.Vector3(player.charPos.x, player.charPos.y + 0.8, player.charPos.z);
        }
        return null;
      }
    }

    if (bubble.speakerType === 'ragdoll') {
      const ragdoll = engine.ragdolls.find((r) => r.id === bubble.speakerId);
      if (!ragdoll) return null;

      const headP = ragdoll.particles?.find((p) => p.name === 'cabeza') || ragdoll.particles?.[0];
      if (ragdoll.isAlive && !ragdoll.isWalkingRagdoll) {
        if (!ragdoll.charPos) return null;
        return new THREE.Vector3(
          ragdoll.charPos.x,
          ragdoll.charPos.y + 1.85 * (ragdoll.scale || 1.0),
          ragdoll.charPos.z
        );
      } else if (headP) {
        return new THREE.Vector3(headP.x, headP.y + 0.45 * (ragdoll.scale || 1.0), headP.z);
      } else if (ragdoll.charPos) {
        return new THREE.Vector3(ragdoll.charPos.x, ragdoll.charPos.y + 0.8, ragdoll.charPos.z);
      }
      return null;
    }

    if (bubble.speakerType === 'remote') {
      const remote = engine.getRemotePlayer(bubble.speakerId);
      if (remote) {
        const headP = remote.ragdoll?.particles?.find((p) => p.name === 'cabeza') || remote.ragdoll?.particles?.[0];
        if (headP) {
          return new THREE.Vector3(headP.x, headP.y + 0.75, headP.z);
        }
        if (remote.state) {
          return new THREE.Vector3(remote.state.x, remote.state.y + 1.85, remote.state.z);
        }
      }
    }

    return null;
  };

  const handleSendChatMessage = (
    text: string,
    speakerType: SpeakerType,
    targetRagdollId?: string,
    speakAudio: boolean = true
  ) => {
    if (!text.trim()) return;
    const cleanText = text.trim();
    const timestamp = Date.now();

    if (speakerType === 'player') {
      const newMsg: ChatMessage = {
        id: `msg_${timestamp}_player`,
        senderId: 'player',
        senderName: 'Tú (Personaje)',
        speakerType: 'player',
        text: cleanText,
        timestamp,
        color: '#38bdf8',
      };
      setChatMessages((prev) => [...prev.slice(-49), newMsg]);
      addOverheadBubble('player', 'player', 'Tú', cleanText, '#38bdf8');

      if (speakAudio) {
        proceduralSpeak(cleanText);
      }

      if (isMultiplayer && multiplayerClientRef.current) {
        multiplayerClientRef.current.sendChat(cleanText, 'player');
      }
    } else if (speakerType === 'ragdoll') {
      const engine = engineRef.current;
      if (!engine) return;

      if (!targetRagdollId || targetRagdollId === 'all') {
        const nonPlayerRagdolls = engine.ragdolls.filter((r) => !r.isControlled);
        const targetList = nonPlayerRagdolls.length > 0 ? nonPlayerRagdolls : [engine.ragdolls[0]];

        targetList.forEach((r, idx) => {
          setTimeout(() => {
            addOverheadBubble(r.id, 'ragdoll', r.name || 'Ragdoll', cleanText, '#fbbf24');
          }, idx * 100);
        });

        const newMsg: ChatMessage = {
          id: `msg_${timestamp}_all`,
          senderId: 'all_ragdolls',
          senderName: 'Todos los Ragdolls',
          speakerType: 'ragdoll',
          text: cleanText,
          timestamp,
          color: '#c084fc',
        };
        setChatMessages((prev) => [...prev.slice(-49), newMsg]);

        if (speakAudio) {
          proceduralSpeak(cleanText);
        }

        if (isMultiplayer && multiplayerClientRef.current) {
          multiplayerClientRef.current.sendChat(cleanText, 'ragdoll', 'all');
        }
      } else if (targetRagdollId === 'nearest') {
        const player = engine.ragdolls.find((r) => r.isControlled) || engine.ragdolls[0];
        const nonPlayerRagdolls = engine.ragdolls.filter((r) => !r.isControlled);

        let nearest = nonPlayerRagdolls[0];
        let minDist = Infinity;
        if (player) {
          for (const r of nonPlayerRagdolls) {
            const dist = player.charPos.distanceTo(r.charPos);
            if (dist < minDist) {
              minDist = dist;
              nearest = r;
            }
          }
        }

        const target = nearest || player;
        const name = target.name || 'Ragdoll';
        const newMsg: ChatMessage = {
          id: `msg_${timestamp}_${target.id}`,
          senderId: target.id,
          senderName: name,
          speakerType: 'ragdoll',
          targetRagdollId: target.id,
          text: cleanText,
          timestamp,
          color: '#fbbf24',
        };
        setChatMessages((prev) => [...prev.slice(-49), newMsg]);
        addOverheadBubble(target.id, 'ragdoll', name, cleanText, '#fbbf24');

        if (speakAudio) {
          proceduralSpeak(cleanText);
        }

        if (isMultiplayer && multiplayerClientRef.current) {
          multiplayerClientRef.current.sendChat(cleanText, 'ragdoll', target.id);
        }
      } else {
        const target = engine.ragdolls.find((r) => r.id === targetRagdollId);
        if (target) {
          const name = target.name || 'Ragdoll';
          const newMsg: ChatMessage = {
            id: `msg_${timestamp}_${target.id}`,
            senderId: target.id,
            senderName: name,
            speakerType: 'ragdoll',
            targetRagdollId: target.id,
            text: cleanText,
            timestamp,
            color: '#fbbf24',
          };
          setChatMessages((prev) => [...prev.slice(-49), newMsg]);
          addOverheadBubble(target.id, 'ragdoll', name, cleanText, '#fbbf24');

          if (speakAudio) {
            proceduralSpeak(cleanText);
          }

          if (isMultiplayer && multiplayerClientRef.current) {
            multiplayerClientRef.current.sendChat(cleanText, 'ragdoll', target.id);
          }
        }
      }
    }
  };

  // --- REAL HUMAN VOICE ENGINE (100% OFFLINE ZERO-API ACOUSTIC FORMANT SYNTHESIS) ---
  const [isVoiceLabOpen, setIsVoiceLabOpen] = useState<boolean>(true);
  const [voicePreset, setVoicePreset] = useState<string>('normal');
  const [voicePitch, setVoicePitch] = useState<number>(122); // in Hz
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.0); // speed factor (0.5 to 1.8)
  const [voiceWarmth, setVoiceWarmth] = useState<number>(0.85); // chest resonance
  const [voiceBreathiness, setVoiceBreathiness] = useState<number>(0.18); // aspiration air turbulence
  const [voiceTrillStrength, setVoiceTrillStrength] = useState<number>(0.85); // rolled R intensity
  const [activePhonemeViz, setActivePhonemeViz] = useState<string>(''); // current visual phoneme

  useEffect(() => {
    const unsubPhoneme = humanSpeechEngine.subscribePhoneme((p) => {
      setActivePhonemeViz(p);
    });

    return () => {
      unsubPhoneme();
    };
  }, []);

  const handleTestVoice = () => {
    humanSpeechEngine.speak('Hola, esta es una prueba de la voz humana real en español.');
  };

  const handleSelectVoicePreset = (presetId: string) => {
    setVoicePreset(presetId);
    humanSpeechEngine.setVoicePreset(presetId);
    const preset = humanSpeechEngine.PRESETS.find(p => p.id === presetId);
    if (preset) {
      setVoicePitch(preset.basePitch);
      setVoiceWarmth(preset.warmth);
      setVoiceBreathiness(preset.breathiness);
      setVoiceSpeed(preset.speedMult || 1.0);
    }
  };

  const handleVoicePitchChange = (pitch: number) => {
    setVoicePitch(pitch);
    humanSpeechEngine.setPitch(pitch);
  };

  const handleVoiceSpeedChange = (speed: number) => {
    setVoiceSpeed(speed);
    humanSpeechEngine.setSpeed(speed);
  };

  const handleVoiceWarmthChange = (warmth: number) => {
    setVoiceWarmth(warmth);
    humanSpeechEngine.setWarmth(warmth);
  };

  const handleVoiceBreathinessChange = (breath: number) => {
    setVoiceBreathiness(breath);
    humanSpeechEngine.setBreathiness(breath);
  };

  const handleVoiceTrillStrengthChange = (trill: number) => {
    setVoiceTrillStrength(trill);
    humanSpeechEngine.setTrillStrength(trill);
  };

  const proceduralSpeak = (_text: string) => {
    // Chat voice removed completely per user request ("saca voz de chat por completo")
  };

  const handleNextSpeechPhrase = () => {
    const text = ALPHABET_SPANISH_PHRASES[speechIndexRef.current];
    setSpeechText(text);

    // Add overhead bubble on player character
    addOverheadBubble('player', 'player', 'Tú (Personaje)', text, '#38bdf8');

    // Move to next phrase in exact sequential order
    speechIndexRef.current = (speechIndexRef.current + 1) % ALPHABET_SPANISH_PHRASES.length;
  };

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  // Main Menu & Multiplayer States
  const [isMainMenuOpen, setIsMainMenuOpen] = useState<boolean>(true);
  const [isMultiplayer, setIsMultiplayer] = useState<boolean>(false);
  const [multiplayerRoomName, setMultiplayerRoomName] = useState<string>('Servidor #1');
  const [multiplayerPlayerCount, setMultiplayerPlayerCount] = useState<number>(1);
  const multiplayerClientRef = useRef<MultiplayerClient | null>(null);

  const handleStartSingleplayer = (mapId: string) => {
    if (multiplayerClientRef.current) {
      multiplayerClientRef.current.disconnect();
      multiplayerClientRef.current = null;
    }
    setIsMultiplayer(false);
    setIsMainMenuOpen(false);
    if (engineRef.current) {
      engineRef.current.clearRemotePlayers();
    }
    handleSelectMap(mapId);
  };

  const handleJoinMultiplayer = (server: ServerInfo, playerName: string) => {
    setIsMainMenuOpen(false);
    setIsMultiplayer(true);
    setMultiplayerRoomName(server.name);

    if (multiplayerClientRef.current) {
      multiplayerClientRef.current.disconnect();
    }

    if (engineRef.current) {
      engineRef.current.clearRemotePlayers();
    }

    // Switch map to server map (e.g. 'cesped2')
    handleSelectMap(server.mapId);

    const client = new MultiplayerClient({
      onInit: (_id, roomName, _mapId, existing) => {
        setMultiplayerRoomName(roomName);
        setMultiplayerPlayerCount(existing.length + 1);
        if (engineRef.current) {
          for (const p of existing) {
            engineRef.current.updateRemotePlayer(p);
          }
        }
      },
      onPlayerJoined: (player) => {
        setMultiplayerPlayerCount((prev) => prev + 1);
        if (engineRef.current) {
          engineRef.current.updateRemotePlayer(player);
        }
      },
      onPlayerUpdated: (_id, state) => {
        if (engineRef.current) {
          engineRef.current.updateRemotePlayer(state);
        }
      },
      onPlayerLeft: (id) => {
        setMultiplayerPlayerCount((prev) => Math.max(1, prev - 1));
        if (engineRef.current) {
          engineRef.current.removeRemotePlayer(id);
        }
      },
      onChatMessage: (sender, message, playerId, speakerType, targetRagdollId) => {
        const timestamp = Date.now();
        const isRemote = playerId && playerId !== multiplayerClientRef.current?.getLocalPlayerId();
        const type: SpeakerType = speakerType === 'ragdoll' ? 'ragdoll' : (isRemote ? 'remote' : 'player');

        const newMsg: ChatMessage = {
          id: `msg_${timestamp}_${Math.random().toString(36).slice(2, 6)}`,
          senderId: playerId || sender,
          senderName: sender,
          speakerType: type,
          targetRagdollId,
          text: message,
          timestamp,
        };
        setChatMessages((prev) => [...prev.slice(-49), newMsg]);

        const bubbleSpeakerId = type === 'ragdoll' ? (targetRagdollId || 'ragdoll') : (playerId || sender);
        addOverheadBubble(bubbleSpeakerId, type, sender, message);

        if (chatTtsEnabledRef.current) {
          proceduralSpeak(message);
        }
      },
    });

    multiplayerClientRef.current = client;
    client.connect(server.id, playerName);
  };

  // Multiplayer position sync loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (isMultiplayer && multiplayerClientRef.current && engineRef.current?.playerRagdoll) {
        const rootP = engineRef.current.playerRagdoll.particles?.find((p) => p.name === 'pelvis') || engineRef.current.playerRagdoll.particles?.[0];
        if (rootP) {
          multiplayerClientRef.current.sendPosition(
            rootP.x,
            rootP.y,
            rootP.z,
            cameraOrbitRef.current?.yaw || 0,
            {
              skinColorHex,
              shirtColorHex,
              pantsColorHex,
              hairType,
              hairColorHex,
              isShooting: isAiming,
            }
          );
        }
      }
    }, 40);
    return () => clearInterval(interval);
  }, [isMultiplayer, skinColorHex, shirtColorHex, pantsColorHex, hairType, hairColorHex, isAiming]);

  const handleToggleCharacterTextures = (enabled: boolean) => {
    setCharacterTexturesEnabled(enabled);
    if (engineRef.current) {
      engineRef.current.setCharacterTexturesEnabled(enabled);
    }
  };

  const formatLimbName = (name: string): string => {
    const map: Record<string, string> = {
      cabeza: 'Cabeza',
      cuello: 'Cuello',
      pechobase: 'Pechobase (Torso Superior)',
      torso: 'Torso Medio',
      ombligo: 'Ombligo / Abdomen',
      pelvis: 'Pelvis / Cadera',
      hombro_izq: 'Hombro Izquierdo',
      hombro_der: 'Hombro Derecho',
      brazo_izq: 'Brazo Izquierdo',
      brazo_der: 'Brazo Derecho',
      codo_izq: 'Codo Izquierdo',
      codo_der: 'Codo Derecho',
      antebrazo_izq: 'Antebrazo Izquierdo',
      antebrazo_der: 'Antebrazo Derecho',
      muneca_izq: 'Muñeca Izquierda',
      muneca_der: 'Muñeca Derecha',
      mano_izq: 'Mano Izquierda',
      mano_der: 'Mano Derecha',
      muslo_izq: 'Muslo Izquierdo',
      muslo_der: 'Muslo Derecho',
      rodilla_izq: 'Rodilla Izquierda',
      rodilla_der: 'Rodilla Derecha',
      antepierna_izq: 'Antepierna Izquierda',
      antepierna_der: 'Antepierna Derecha',
      tobillo_izq: 'Tobillo Izquierdo',
      tobillo_der: 'Tobillo Derecho',
      pie_izq: 'Pie Izquierdo',
      pie_der: 'Pie Derecho',
    };
    if (map[name]) return map[name];
    if (name.startsWith('dedo_pie_')) return `Dedo Pie (${name.replace('dedo_pie_', '').replace('_', ' ')})`;
    if (name.startsWith('dedo_')) return `Dedo Mano (${name.replace('dedo_', '').replace('_', ' ')})`;
    if (name.startsWith('tentaculo_')) return `Tentáculo Segmento`;
    return name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ');
  };

  const startInflatingLimb = (delta: number) => {
    if (inflateIntervalRef.current) clearInterval(inflateIntervalRef.current);
    if (!selectedPart || !engineRef.current) return;

    engineRef.current.inflateLimbWidth(selectedPart.ragdollId, selectedPart.particleId, delta, 2);
    const mult = engineRef.current.getLimbWidthMultiplier(selectedPart.ragdollId, selectedPart.particleId);
    setSelectedPartWidth(Math.round(mult * 100));

    inflateIntervalRef.current = window.setInterval(() => {
      if (!selectedPart || !engineRef.current) return;
      engineRef.current.inflateLimbWidth(selectedPart.ragdollId, selectedPart.particleId, delta, 2);
      const m = engineRef.current.getLimbWidthMultiplier(selectedPart.ragdollId, selectedPart.particleId);
      setSelectedPartWidth(Math.round(m * 100));
    }, 40);
  };

  const stopLimbWidthChange = () => {
    if (inflateIntervalRef.current) {
      clearInterval(inflateIntervalRef.current);
      inflateIntervalRef.current = null;
    }
  };

  const handleResetLimbWidth = () => {
    if (!selectedPart || !engineRef.current) return;
    engineRef.current.resetLimbWidth(selectedPart.ragdollId, selectedPart.particleId);
    if (isSymmetricAdjustment) {
      const symName = getSymmetricPartName(selectedPart.name);
      if (symName) {
        const ragdoll = engineRef.current.ragdolls.find((r) => r.id === selectedPart.ragdollId);
        const symPart = ragdoll?.particles.find((p) => p.name === symName);
        if (symPart) {
          engineRef.current.resetLimbWidth(selectedPart.ragdollId, symPart.id);
        }
      }
    }
    setSelectedPartWidth(100);
  };

  const handleResetAllLimbsWidth = () => {
    if (!selectedPart || !engineRef.current) return;
    engineRef.current.resetLimbWidth(selectedPart.ragdollId);
    setSelectedPartWidth(100);
  };

  const handleToggleFly = () => {
    const next = !isFlying;
    setIsFlying(next);
    if (engineRef.current) {
      engineRef.current.toggleFly(next);
    }
  };

  const handleFlyAscend = (active: boolean) => {
    if (engineRef.current) {
      engineRef.current.flyAscend = active;
    }
  };

  const handleFlyDescend = (active: boolean) => {
    if (engineRef.current) {
      engineRef.current.flyDescend = active;
    }
  };

  const handleToggleGodMode = () => {
    const next = !isGodMode;
    setIsGodMode(next);
    if (engineRef.current) {
      engineRef.current.toggleGodMode(next);
    }
  };

  const handleToggleZeroGravity = () => {
    const next = !isZeroGravity;
    setIsZeroGravity(next);
    if (engineRef.current) {
      engineRef.current.toggleZeroGravity(next);
    }
  };

  const handleExplodeAllRagdolls = () => {
    if (engineRef.current) {
      engineRef.current.explodeAllRagdolls();
    }
  };

  const handleFocusCameraOnPlayer = () => {
    if (cameraOrbitRef.current) {
      cameraOrbitRef.current.targetDistance = 2.6;
      cameraOrbitRef.current.pitch = 0.05;
      if (engineRef.current) {
        const player = engineRef.current.ragdolls.find((r) => r.isControlled) || engineRef.current.ragdolls[0];
        if (player) {
          cameraOrbitRef.current.yaw = player.facingAngle + Math.PI;
        }
      }
    }
    setCameraDistance(2.6);
  };

  const [isAvatarEditorOpen, setIsAvatarEditorOpen] = useState<boolean>(false);
  const isAvatarEditorOpenRef = useRef<boolean>(false);

  // 3D In-Frame Avatar Preview Camera (0 clones, 0 lag, direct scissor focus)
  const [avatarPreviewAngle, setAvatarPreviewAngle] = useState<'front' | 'side' | 'back' | 'face'>('back');
  const avatarPreviewAngleRef = useRef<'front' | 'side' | 'back' | 'face'>('back');
  const [avatarPreviewDistance, setAvatarPreviewDistance] = useState<number>(3.4);
  const avatarPreviewDistanceRef = useRef<number>(3.4);
  const avatarPreviewCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [avatarLimbScreenPositions, setAvatarLimbScreenPositions] = useState<Record<string, { top: string; left: string }>>({});

  const handleToggleMuscleOverlay = useCallback((active: boolean) => {
    if (engineRef.current) {
      const player = engineRef.current.ragdolls.find((r) => r.isControlled) || engineRef.current.ragdolls[0];
      if (player) {
        engineRef.current.applyXRayModeToRagdoll(player, active ? 1 : 0);
      }
    }
  }, []);

  const handleSetAvatarPreviewAngle = (angle: 'front' | 'side' | 'back' | 'face') => {
    setAvatarPreviewAngle(angle);
    avatarPreviewAngleRef.current = angle;
    if (angle === 'face') {
      setAvatarPreviewDistance(0.78);
      avatarPreviewDistanceRef.current = 0.78;
    } else {
      setAvatarPreviewDistance(3.4);
      avatarPreviewDistanceRef.current = 3.4;
    }
  };

  const handleSetAvatarPreviewDistance = (dist: number) => {
    const clamped = Math.max(1.0, Math.min(6.5, dist));
    setAvatarPreviewDistance(clamped);
    avatarPreviewDistanceRef.current = clamped;
  };

  // Performance Optimization Refs for 60fps render loop
  const isAlivePrevRef = useRef<boolean>(true);
  const isWalkingRagdollPrevRef = useRef<boolean>(false);
  const hasWeaponPrevRef = useRef<boolean>(false);
  const isAimingPrevRef = useRef<boolean>(false);
  const shootCooldownPrevRef = useRef<number>(0);

  const handleToggleAvatarEditor = (isOpen: boolean) => {
    setIsAvatarEditorOpen(isOpen);
    isAvatarEditorOpenRef.current = isOpen;
    if (isOpen) {
      setAvatarPreviewAngle('back');
      avatarPreviewAngleRef.current = 'back';
      if (engineRef.current) {
        const player = engineRef.current.ragdolls.find((r) => r.isControlled) || engineRef.current.ragdolls[0];
        if (player) {
          if (cameraOrbitRef.current) {
            cameraOrbitRef.current.yaw = player.facingAngle; // Face back predeterminadamente
          }
          if (player.skinColorHex !== undefined) setSkinColorHex(player.skinColorHex);
          if (player.hasShirt !== undefined) setHasShirt(Boolean(player.hasShirt));
          if (player.shirtColorHex !== undefined) setShirtColorHex(player.shirtColorHex);
          if (player.hasPants !== undefined) setHasPants(Boolean(player.hasPants));
          if (player.pantsColorHex !== undefined) setPantsColorHex(player.pantsColorHex);
          if (player.hasUnderwear !== undefined) setHasUnderwear(Boolean(player.hasUnderwear));
          if (player.underwearColorHex !== undefined) setUnderwearColorHex(player.underwearColorHex);
          if (player.hasGloves !== undefined) setHasGloves(Boolean(player.hasGloves));
          if (player.glovesColorHex !== undefined) setGlovesColorHex(player.glovesColorHex);
          if (player.hasBoots !== undefined) setHasBoots(Boolean(player.hasBoots));
          if (player.bootsColorHex !== undefined) setBootsColorHex(player.bootsColorHex);
          if (player.hasSocks !== undefined) setHasSocks(Boolean(player.hasSocks));
          if (player.socksColorHex !== undefined) setSocksColorHex(player.socksColorHex);
          if (player.hasBustAndGlutes !== undefined) setHasBustAndGlutes(Boolean(player.hasBustAndGlutes));
          if (player.genitalType !== undefined) setGenitalType(player.genitalType);
          if (player.genitalMShaftLength !== undefined) setGenitalMShaftLength(player.genitalMShaftLength);
          if (player.genitalMShaftThickness !== undefined) setGenitalMShaftThickness(player.genitalMShaftThickness);
          if (player.genitalFSize !== undefined) setGenitalFSize(player.genitalFSize);
          if (player.faceFeatureMode !== undefined) setFaceFeatureMode(player.faceFeatureMode);
          if (player.faceFloatDepth !== undefined) setFaceFloatDepth(player.faceFloatDepth);
          if (player.eyeHolesEnabled !== undefined) setEyeHolesEnabled(Boolean(player.eyeHolesEnabled));
          if ((player as any).hairType !== undefined) setHairType((player as any).hairType);
          if ((player as any).hairColorHex !== undefined) setHairColorHex((player as any).hairColorHex);
          if ((player as any).beardType !== undefined) setBeardType((player as any).beardType);
          if ((player as any).beardColorHex !== undefined) setBeardColorHex((player as any).beardColorHex);
          if ((player as any).hatType !== undefined) setHatType((player as any).hatType);
          if ((player as any).hatColorHex !== undefined) setHatColorHex((player as any).hatColorHex);
          if ((player as any).glassesType !== undefined) setGlassesType((player as any).glassesType);
          if ((player as any).glassesColorHex !== undefined) setGlassesColorHex((player as any).glassesColorHex);
          if (player.pubicHairEnabled !== undefined) setPubicHairEnabled(Boolean(player.pubicHairEnabled));
          if ((player as any).pubicHairIntensity !== undefined) setPubicHairIntensity((player as any).pubicHairIntensity);
          if (player.contourJointStyle !== undefined) setContourJointStyle(player.contourJointStyle);
          if (player.sphericalContourLevel !== undefined) setContourLevel(player.sphericalContourLevel);
          if (player.contourLayerEnabled !== undefined) setContourEnabled(Boolean(player.contourLayerEnabled));
          if (player.bodyCubicity !== undefined) setBodyCubicity(player.bodyCubicity);
          if (player.limbSizeMultiplier !== undefined) setLimbSizeMultiplier(player.limbSizeMultiplier);
          if (player.voxelDensity !== undefined) setVoxelDensity(player.voxelDensity);
          if (player.voxelShape !== undefined) setVoxelShape(player.voxelShape);
        }
      }
      if (cameraOrbitRef.current) {
        cameraOrbitRef.current.targetDistance = 2.6; // Focused close-up for live avatar preview
        cameraOrbitRef.current.pitch = 0.05;
        const player = engineRef.current?.ragdolls.find((r) => r.isControlled) || engineRef.current?.ragdolls[0];
        if (player) {
          cameraOrbitRef.current.yaw = player.facingAngle;
        }
      }
      setCameraDistance(2.6);
    } else {
      if (cameraOrbitRef.current) {
        cameraOrbitRef.current.targetDistance = 3.2;
      }
      setCameraDistance(3.2);

      // Save avatar customization state to Google Cloud VPS
      try {
        const savedPlayerName = localStorage.getItem('gorebox_player_name');
        if (savedPlayerName) {
          fetch('/api/vps/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: savedPlayerName,
              skinColorHex,
              hasShirt,
              shirtColorHex,
              hasPants,
              pantsColorHex,
              hasUnderwear,
              underwearColorHex,
              hasGloves,
              glovesColorHex,
              hasBoots,
              bootsColorHex,
              hasSocks,
              socksColorHex,
              hairType,
              hairColorHex,
              beardType,
              beardColorHex,
              hatType,
              hatColorHex,
              glassesType,
              glassesColorHex,
            }),
          }).catch((err) => {
            console.error('VPS avatar sync notice:', err);
          });
        }
      } catch (err) {
        console.error('Avatar VPS save error:', err);
      }
    }
  };

  const handleRotateCameraToFront = () => {
    if (cameraOrbitRef.current && engineRef.current) {
      const player = engineRef.current.ragdolls.find((r) => r.isControlled) || engineRef.current.ragdolls[0];
      if (player) {
        cameraOrbitRef.current.yaw = player.facingAngle + Math.PI;
        cameraOrbitRef.current.pitch = 0.05;
        cameraOrbitRef.current.targetDistance = 2.6;
        setCameraDistance(2.6);
      }
    }
  };

  const handleRotateCameraToBack = () => {
    if (cameraOrbitRef.current && engineRef.current) {
      const player = engineRef.current.ragdolls.find((r) => r.isControlled) || engineRef.current.ragdolls[0];
      if (player) {
        cameraOrbitRef.current.yaw = player.facingAngle;
        cameraOrbitRef.current.pitch = 0.05;
        cameraOrbitRef.current.targetDistance = 2.6;
        setCameraDistance(2.6);
      }
    }
  };

  const handleRotateCameraToSide = () => {
    if (cameraOrbitRef.current && engineRef.current) {
      const player = engineRef.current.ragdolls.find((r) => r.isControlled) || engineRef.current.ragdolls[0];
      if (player) {
        cameraOrbitRef.current.yaw = player.facingAngle + Math.PI * 0.5;
        cameraOrbitRef.current.pitch = 0.05;
        cameraOrbitRef.current.targetDistance = 2.6;
        setCameraDistance(2.6);
      }
    }
  };



  // Sandbox Stats (0 to 100)
  const [intelligence, setIntelligence] = useState<number>(50);
  const [strength, setStrength] = useState<number>(50);
  const [speed, setSpeed] = useState<number>(50);
  const [jumpPower, setJumpPower] = useState<number>(50);
  const [immunity, setImmunity] = useState<number>(50);
  const [hearing, setHearing] = useState<number>(50);
  const [resilience, setResilience] = useState<number>(50);
  const [reproduction, setReproduction] = useState<number>(50);
  const [asesino, setAsesino] = useState<number>(50);
  const [psicopata, setPsicopata] = useState<number>(50);
  const [amable, setAmable] = useState<number>(50);

  const handleIntelligenceChange = (val: number) => {
    setIntelligence(val);
    if (engineRef.current) engineRef.current.setIntelligence(val);
  };
  const handleStrengthChange = (val: number) => {
    setStrength(val);
    if (engineRef.current) engineRef.current.setStrength(val);
  };
  const handleSpeedChange = (val: number) => {
    setSpeed(val);
    if (engineRef.current) engineRef.current.setSpeed(val);
  };
  const handleJumpPowerChange = (val: number) => {
    setJumpPower(val);
    if (engineRef.current) engineRef.current.setJumpPower(val);
  };
  const handleImmunityChange = (val: number) => {
    setImmunity(val);
    if (engineRef.current) engineRef.current.setImmunity(val);
  };
  const handleHearingChange = (val: number) => {
    setHearing(val);
    if (engineRef.current) engineRef.current.setHearing(val);
  };
  const handleResilienceChange = (val: number) => {
    setResilience(val);
    if (engineRef.current) engineRef.current.setResilience(val);
  };
  const handleReproductionChange = (val: number) => {
    setReproduction(val);
    if (engineRef.current) engineRef.current.setReproduction(val);
  };
  const handleAsesinoChange = (val: number) => {
    setAsesino(val);
    if (engineRef.current) engineRef.current.setAsesino(val);
  };
  const handlePsicopataChange = (val: number) => {
    setPsicopata(val);
    if (engineRef.current) engineRef.current.setPsicopata(val);
  };
  const handleAmableChange = (val: number) => {
    setAmable(val);
    if (engineRef.current) engineRef.current.setAmable(val);
  };

  const handleSpawnBlockHouse = () => {
    if (engineRef.current) {
      const player = engineRef.current.ragdolls.find(r => r.isControlled);
      if (player) {
        const sin = Math.sin(player.facingAngle);
        const cos = Math.cos(player.facingAngle);
        const sx = player.charPos.x + sin * 4.5;
        const sz = player.charPos.z + cos * 4.5;
        engineRef.current.spawnBlockHouse(sx, 0, sz);
      } else {
        engineRef.current.spawnBlockHouse(0, 0, 0);
      }
    }
  };

  const handleSpawnObbyCourse = () => {
    if (engineRef.current) {
      const player = engineRef.current.ragdolls.find(r => r.isControlled);
      if (player) {
        const sin = Math.sin(player.facingAngle);
        const cos = Math.cos(player.facingAngle);
        const sx = player.charPos.x + sin * 5.0;
        const sz = player.charPos.z + cos * 5.0;
        engineRef.current.spawnObbyCourse(sx, 0, sz);
      } else {
        engineRef.current.spawnObbyCourse(0, 0, 0);
      }
    }
  };

  const handleToggleSprint = () => {
    const next = !isSprinting;
    setIsSprinting(next);
    isSprintingRef.current = next;
  };

  const handleXRayModeChange = (mode: number) => {
    setXrayMode(mode);
    if (engineRef.current) {
      engineRef.current.setXRayMode(mode);
    }
  };

  const handleToggleSoundWaves = () => {
    const next = !showSoundWaves;
    setShowSoundWaves(next);
    if (engineRef.current) {
      engineRef.current.setShowSoundWaves(next);
    }
  };
  const lastPlayerShootTimeRef = useRef<number>(0);

  // 3D Camera Spherical Orbit & Follow Coordinates (Roblox-style)
  const cameraOrbitRef = useRef<{
    yaw: number;
    pitch: number;
    distance: number;
    targetDistance: number;
    target: THREE.Vector3;
  }>({
    yaw: 0,
    pitch: 0.35,
    distance: 5.5,
    targetDistance: 5.5,
    target: new THREE.Vector3(0, 1.2, 0),
  });

  // Joystick & Keyboard Input
  const leftJoystickRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const keysPressedRef = useRef<{ [key: string]: boolean }>({});
  const keyboardMoveRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Touch Camera Look Drag tracking + Pinch-to-zoom
  const touchLookRef = useRef<{
    active: boolean;
    touchId?: number;
    lastX: number;
    lastY: number;
    pinchDist?: number;
  }>({ active: false, lastX: 0, lastY: 0 });

  // Hold-to-drag character limb tracking ref
  const draggedLimbRef = useRef<{
    ragdollId: string;
    particleId: string;
    distance: number;
    touchId?: number;
  } | null>(null);

  // Continuous slime sculpting & deformation drag tracking ref
  const draggedSlimeRef = useRef<{
    active: boolean;
    lastPos: THREE.Vector3;
    touchId?: number;
  } | null>(null);

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    let animationFrameId: number;
    let handleResize: () => void;
    let handleWheel: (e: WheelEvent) => void;
    let handleTouchStart: (e: TouchEvent) => void;
    let handleTouchMove: (e: TouchEvent) => void;
    let isCleanedUp = false;

    // Defer heavy 3D scene, renderer and physics instantiation by 700ms so the white screen renders and paints first
    const initTimer = setTimeout(() => {
      if (isCleanedUp || !containerRef.current) return;

      // 1. Scene with Cielo Celeste (Light Blue Sky) & atmospheric fog
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x38bdf8); // Vibrant sky celeste
      scene.fog = new THREE.FogExp2(0xbae6fd, 0.020); // Soft, clean atmospheric fog
      sceneRef.current = scene;

      // 2. Camera with crisp short cubic render distance clip (20 meters)
      const camera = new THREE.PerspectiveCamera(
        60,
        container.clientWidth / container.clientHeight,
        0.1,
        20.0 // Tight short view distance cutoff plane
      );
      cameraRef.current = camera;

      // 3. Renderer with ACES Filmic Tone Mapping for authentic 3D volumetric shading
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.debug.checkShaderErrors = false;
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // 4. Realistic 3D Volumetric Lighting & Shadows
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.42);
      scene.add(ambientLight);

      const sunLight = new THREE.DirectionalLight(0xfff8ee, 1.25);
      sunLight.position.set(6, 12, 6);
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 1024;
      sunLight.shadow.mapSize.height = 1024;
      sunLight.shadow.camera.near = 0.5;
      sunLight.shadow.camera.far = 18.0; // Short shadow render distance immediately around player
      sunLight.shadow.camera.left = -6.0;
      sunLight.shadow.camera.right = 6.0;
      sunLight.shadow.camera.top = 6.0;
      sunLight.shadow.camera.bottom = -6.0;
      sunLight.shadow.bias = -0.0005;
      sunLight.shadow.normalBias = 0.025;
      scene.add(sunLight);
      scene.add(sunLight.target);

      // Volumetric 3D secondary fill light from opposite angle to clearly sculpt character 3D depth and eliminate 2D appearance
      const secondaryFillLight = new THREE.DirectionalLight(0xd0e8ff, 0.45);
      secondaryFillLight.position.set(-6, 8, -6);
      scene.add(secondaryFillLight);
      scene.add(secondaryFillLight.target);

      const skyHemisphere = new THREE.HemisphereLight(0xe0f2fe, 0x334155, 0.40);
      scene.add(skyHemisphere);

      // 5. Floor Map & Physics Engine (Default Grass Field / Lab map)
      const map = GAME_MAPS_3D.lab || Object.values(GAME_MAPS_3D)[0];
      const engine = new PhysicsEngine3D(scene, map);
      engine.camera = camera;
      engine.onRagdollReaction = (ragdollId: string, ragdollName: string, phrase: string) => {
        const newMsg: ChatMessage = {
          id: `react_${Date.now()}_${ragdollId}_${Math.random().toString(36).slice(2, 5)}`,
          senderId: ragdollId,
          senderName: ragdollName,
          speakerType: 'ragdoll',
          targetRagdollId: ragdollId,
          text: phrase,
          timestamp: Date.now(),
          color: '#fbbf24',
        };
        setChatMessages((prev) => [...prev.slice(-49), newMsg]);
        addOverheadBubble(ragdollId, 'ragdoll', ragdollName, phrase, '#fbbf24');
        if (chatTtsEnabledRef.current) {
          proceduralSpeak(phrase);
        }
      };
      engineRef.current = engine;

      buildSceneEnvironment3D(scene, map);
      if (map.theme === 'cesped2' || map.id === 'cesped2') {
        engine.spawnCesped2Floor();
      }

      // Spawn 3D Clean Cubic Character (Standing upright by default)
      const playerRagdoll = createArticulatedRagdoll3D(0, 0, 0, 1.0, scene, 100, true);
      playerRagdoll.isControlled = true;
      engine.ragdolls.push(playerRagdoll);
      
      // Apply consistent initial avatar appearance matching current state
      engine.setPlayerSkinColor(skinColorHex);
      engine.setPlayerShirt(hasShirt, shirtColorHex);
      engine.setPlayerPantsColor(pantsColorHex);
      engine.setPlayerClothing({
        hasShirt,
        shirtColorHex,
        hasPants,
        pantsColorHex,
        hasUnderwear,
        underwearColorHex,
        hasGloves,
        glovesColorHex,
        hasBoots,
        bootsColorHex,
        hasSocks,
        socksColorHex,
      });
      engine.setPlayerHair(hairType, hairColorHex);
      engine.setPlayerBeard(beardType, beardColorHex);
      engine.setPlayerHat(hatType, hatColorHex);
      engine.setPlayerGlasses(glassesType, glassesColorHex);
      engine.setPlayerPubicHair(pubicHairEnabled, pubicHairIntensity);
      engine.setContourJointStyle(contourJointStyle);
      engine.setSphericalContour(contourLevel, contourEnabled);
      engine.setGenitalType(genitalType);
      engine.toggleBustAndGlutes(hasBustAndGlutes);
      engine.setPlayerFaceFeatureMode(faceFeatureMode);
      engine.setPlayerFaceFloatDepth(faceFloatDepth);
      engine.setBodyCubicity(bodyCubicity);
      engine.setLimbSizeMultiplier(limbSizeMultiplier);

      // Force a final skin color update to ensure all dynamically created anatomy meshes 
      // precisely match the body skin color, mirroring the AvatarEditorModal behavior.
      engine.setPlayerSkinColor(skinColorHex);

      // Spawn initial floating weapon pickup on the grass in front of the player
      engine.spawnWeaponPickup(0, 0.4, 2.5);
      
      // Spawn standalone interactive door in map ("solo la puerta")
      engine.spawnDoor(0, 0, 4.0);

      // Spawn 3x3 Division Block directly in front of player
      const initialElectroCube = engine.spawnElectroCube(1.5, 0.45, 2.0, 70, 30, 100);
      setActiveElectroCube(initialElectroCube);

      // Mouse wheel zoom (Roblox style)
      handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        const zoomSpeed = 0.004;
        cameraOrbitRef.current.targetDistance = Math.max(
          1.2,
          Math.min(22.0, cameraOrbitRef.current.targetDistance + e.deltaY * zoomSpeed)
        );
        setCameraDistance(cameraOrbitRef.current.targetDistance);
      };
      container.addEventListener('wheel', handleWheel, { passive: false });

      // Pinch-to-zoom Touch Handlers (Juntar o separar dedos para acercar y alejar)
      let initialPinchDist = 0;
      let initialTargetDist = 5.5;

      handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 2) {
          const t1 = e.touches[0];
          const t2 = e.touches[1];
          initialPinchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
          initialTargetDist = cameraOrbitRef.current.targetDistance;
        }
      };

      handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 2) {
          e.preventDefault();
          const t1 = e.touches[0];
          const t2 = e.touches[1];
          const currentPinchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
          if (initialPinchDist > 0) {
            const deltaPinch = initialPinchDist - currentPinchDist;
            const zoomFactor = 0.012;
            const newDist = Math.max(1.2, Math.min(22.0, initialTargetDist + deltaPinch * zoomFactor));
            cameraOrbitRef.current.targetDistance = newDist;
            setCameraDistance(newDist);
          }
        }
      };

      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });

      // Resize Handler
      handleResize = () => {
        if (!cameraRef.current || !rendererRef.current) return;
        cameraRef.current.aspect = container.clientWidth / container.clientHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(container.clientWidth, container.clientHeight);
      };
      window.addEventListener('resize', handleResize);

      // Main Game Animation Loop
      let lastTime = performance.now();
      let lastFrameTime = performance.now();

      const getTargetInterval = () => {
        const savedLimit = localStorage.getItem('gorebox_fps_limit') || '60';
        if (savedLimit === 'unlimited') return 0;
        const val = parseInt(savedLimit) || 60;
        return 1000 / val;
      };
      let currentInterval = getTargetInterval();
      const onFpsChange = () => {
        currentInterval = getTargetInterval();
      };
      window.addEventListener('gorebox_fps_change', onFpsChange);
      window.addEventListener('storage', onFpsChange);

      const animate = (currentTime: number) => {
        animationFrameId = requestAnimationFrame(animate);

        if (currentInterval > 0) {
          const elapsed = currentTime - lastFrameTime;
          if (elapsed < currentInterval - 0.75) {
            return;
          }
          // Adjust lastFrameTime, accounting for interval spillover
          lastFrameTime = currentTime - (elapsed % currentInterval);
        }

        const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
        lastTime = currentTime;

        const player = engine.ragdolls.find((r) => r.isControlled) || engine.ragdolls[0];

        // Smooth Camera Zoom & Orbit
        const orbit = cameraOrbitRef.current;
        orbit.distance += (orbit.targetDistance - orbit.distance) * 0.15;

        // Camera orientation vectors
        const camForward = new THREE.Vector3(
          -Math.sin(orbit.yaw) * Math.cos(orbit.pitch),
          -Math.sin(orbit.pitch),
          -Math.cos(orbit.yaw) * Math.cos(orbit.pitch)
        ).normalize();

        const camRight = new THREE.Vector3(
          Math.cos(orbit.yaw),
          0,
          -Math.sin(orbit.yaw)
        ).normalize();

        // Step 3D Physics Engine with Player Input and Camera
        engine.isSprinting = !isAvatarEditorOpenRef.current && isSprintingRef.current;
        const combinedMove = isAvatarEditorOpenRef.current
          ? { x: 0, y: 0 }
          : {
              x: Math.max(-1, Math.min(1, leftJoystickRef.current.x + keyboardMoveRef.current.x)),
              y: Math.max(-1, Math.min(1, leftJoystickRef.current.y + keyboardMoveRef.current.y)),
            };
        engine.update(
          combinedMove,
          camForward,
          camRight,
          player?.id,
          camera,
          isFreeCamAimingRef.current
        );

        if (draggedLimbRef.current && !isAvatarEditorOpenRef.current) {
          engine.holdParticle(draggedLimbRef.current.ragdollId, draggedLimbRef.current.particleId);
        }

        // Track player state efficiently without redundant state updates
        if (player) {
          if (isAlivePrevRef.current !== player.isAlive) {
            isAlivePrevRef.current = player.isAlive;
            setIsAlive(player.isAlive);
          }
          const walking = !!player.isWalkingRagdoll;
          if (isWalkingRagdollPrevRef.current !== walking) {
            isWalkingRagdollPrevRef.current = walking;
            setIsWalkingRagdoll(walking);
          }
          if (hasWeaponPrevRef.current !== player.hasWeapon) {
            hasWeaponPrevRef.current = player.hasWeapon;
            setHasWeapon(player.hasWeapon);
          }
          if (isAimingPrevRef.current !== player.isAiming) {
            isAimingPrevRef.current = player.isAiming;
            setIsAiming(player.isAiming);
          }

          // Smooth camera follow on player's position (or pelvis if ragdoll)
          const isStanding = player.isAlive && !player.isCollapsed;
          const pelvis = player.particles.find((p) => p.name === 'pelvis');
          const targetHeadPos = isStanding
            ? new THREE.Vector3(player.charPos.x, player.charPos.y + 1.25, player.charPos.z)
            : new THREE.Vector3(
                pelvis ? pelvis.x : player.charPos.x,
                (pelvis ? pelvis.y : player.charPos.y) + 0.35,
                pelvis ? pelvis.z : player.charPos.z
              );

          // Keep shadow light frustum tightly locked to player position for high performance & short shadow render distance
          sunLight.position.set(targetHeadPos.x + 6, targetHeadPos.y + 12, targetHeadPos.z + 6);
          sunLight.target.position.copy(targetHeadPos);
          sunLight.target.updateMatrixWorld();

          secondaryFillLight.position.set(targetHeadPos.x - 6, targetHeadPos.y + 8, targetHeadPos.z - 6);
          secondaryFillLight.target.position.copy(targetHeadPos);
          secondaryFillLight.target.updateMatrixWorld();

          if (isAvatarEditorOpenRef.current) {
            // Avatar Editor: Focus camera directly and strictly on the character ("solo enfocar camara en personaje nada mas")
            const avatarTargetPos = new THREE.Vector3(
              player.charPos.x,
              player.charPos.y + 0.88,
              player.charPos.z
            );
            orbit.target.lerp(avatarTargetPos, 0.22);
            orbit.distance = THREE.MathUtils.lerp(orbit.distance, 2.35, 0.12);
            orbit.pitch = THREE.MathUtils.lerp(orbit.pitch, 0.05, 0.12);
          } else if (isStanding && player.isAiming) {
            // Position camera further to the right side of the character (over-the-shoulder view)
            const shoulderSideOffset = camRight.clone().multiplyScalar(1.65); // Increased offset further to the right
            const aimTargetPos = targetHeadPos.clone().add(shoulderSideOffset);
            aimTargetPos.y += 0.35; // Aiming target slightly higher up as requested
            orbit.target.lerp(aimTargetPos, 0.22);
          } else {
            orbit.target.lerp(targetHeadPos, 0.20);
          }
        }

        // Update shoot/punch cooldown remaining based on weapon state
        const now = performance.now();
        const cooldownMs = 300; // Universally 0.3s cooldown
        const rem = Math.max(0, (cooldownMs - (now - lastPlayerShootTimeRef.current)) / 1000);
        if (Math.abs(rem - shootCooldownPrevRef.current) > 0.05) {
          shootCooldownPrevRef.current = rem;
          setShootCooldownRemaining(rem);
        }

        // Periodically sync Hot NPC AI & Pose status for HUD
        if (Math.random() < 0.08) {
          const info = engine.getActiveHotNPCsInfo();
          setActiveHotNPCsInfo(info);
        }

        // Sync proximity block inspector HUD
        const blockInfo = engine.getInspectedBlockInfo();
        setInspectedBlock(blockInfo);

        // Startup countdown handler (if any remaining)
        if (startupBlockyRef.current > 0) {
          startupBlockyRef.current -= dt;
          const remaining = Math.max(0, startupBlockyRef.current);
          setStartupBlockyRemaining(remaining);
          if (startupBlockyRef.current <= 0) {
            engine.setContourJointStyle('cylinder');
            engine.setSphericalContour(100, true);
            setContourJointStyle('cylinder');
            setContourLevel(100);
            setContourEnabled(true);
          }
        }

        // Calculate 3D Spherical Camera Coordinates
        const cx = orbit.target.x + orbit.distance * Math.sin(orbit.yaw) * Math.cos(orbit.pitch);
        const cy = Math.max(-25.0, orbit.target.y + orbit.distance * Math.sin(orbit.pitch));
        const cz = orbit.target.z + orbit.distance * Math.cos(orbit.yaw) * Math.cos(orbit.pitch);

        camera.position.set(cx, cy, cz);
        camera.lookAt(orbit.target);

        renderer.render(scene, camera);

        // 3D In-Frame Avatar Camera: Focus real 3D character directly in the editor frame (0 clones, 0 lag, direct scissor)
        if (isAvatarEditorOpenRef.current && player) {
          const previewViewport = document.getElementById('avatar-3d-preview-viewport');
          if (previewViewport) {
            const rect = previewViewport.getBoundingClientRect();
            if (rect.width > 20 && rect.height > 20) {
              const left = Math.round(rect.left);
              const bottom = Math.round(window.innerHeight - rect.bottom);
              const width = Math.round(rect.width);
              const height = Math.round(rect.height);

              renderer.setScissorTest(true);
              renderer.setScissor(left, bottom, width, height);
              renderer.setViewport(left, bottom, width, height);

              // Render sleek studio backdrop inside the preview frame
              renderer.setClearColor(0x060a16, 1.0);
              renderer.clear(true, true, true);

              if (!avatarPreviewCameraRef.current) {
                avatarPreviewCameraRef.current = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
              }
              const pCam = avatarPreviewCameraRef.current;
              pCam.aspect = width / height;

              // Determine camera angle relative to character facing
              const facing = player.facingAngle || 0;
              let angleOffset = Math.PI; // Face front by default
              const angleMode = avatarPreviewAngleRef.current;
              if (angleMode === 'side') angleOffset = Math.PI * 0.5;
              else if (angleMode === 'back') angleOffset = 0;
              else if (angleMode === 'face') angleOffset = Math.PI;

              const isFace = angleMode === 'face';
              pCam.fov = isFace ? 32 : 38;
              pCam.updateProjectionMatrix();

              // Camera distance and height framing:
              // Full character is ~1.9m tall. Midpoint is y=0.95.
              // At distance 3.4m, the entire character from head to toes is fully visible in frame.
              const currentCustomDist = avatarPreviewDistanceRef.current || 3.4;
              const dist = isFace ? 0.78 : currentCustomDist;
              const targetH = isFace ? 1.74 : 0.95;
              const camH = isFace ? 1.74 : 1.02;

              const totalAngle = facing + angleOffset;
              const px = player.charPos.x;
              const py = player.charPos.y;
              const pz = player.charPos.z;

              pCam.position.set(
                px + Math.sin(totalAngle) * dist,
                py + camH,
                pz + Math.cos(totalAngle) * dist
              );
              pCam.lookAt(px, py + targetH, pz);

              // Render the existing 3D scene (NO CLONE!) directly into the preview frame
              renderer.render(scene, pCam);

              // Compute 3D world-to-screen projection for muscle handles on each extremity
              if (player && player.particles) {
                const projectedPositions: Record<string, { top: string; left: string }> = {};
                const targetLimbNames = [
                  'cabeza', 'pechobase', 'pecho', 'brazo_izq', 'antebrazo_izq',
                  'brazo_der', 'antebrazo_der', 'muslo_izq', 'antepierna_izq',
                  'muslo_der', 'antepierna_der', 'tobillo_izq', 'tobillo_der'
                ];

                targetLimbNames.forEach((name) => {
                  let p = player.particles.find((pt) => pt.name === name);
                  if (!p && name === 'pecho') {
                    p = player.particles.find((pt) => pt.name === 'pechobase' || pt.name === 'torso');
                  }
                  if (p) {
                    const worldVec = new THREE.Vector3(p.x, p.y, p.z);
                    const proj = worldVec.clone().project(pCam);
                    const leftPct = Math.max(5, Math.min(95, (proj.x + 1) * 50)).toFixed(1) + '%';
                    const topPct = Math.max(5, Math.min(95, (-proj.y + 1) * 50)).toFixed(1) + '%';
                    projectedPositions[name] = { top: topPct, left: leftPct };
                  }
                });

                setAvatarLimbScreenPositions((prev) => {
                  const nextJson = JSON.stringify(projectedPositions);
                  if (JSON.stringify(prev) !== nextJson) {
                    return projectedPositions;
                  }
                  return prev;
                });
              }

              // Reset scissor and viewport to full screen
              renderer.setScissorTest(false);
              renderer.setViewport(0, 0, container.clientWidth, container.clientHeight);
              renderer.setClearColor(0x000000, 0.0);
            }
          }
        }
      };

      animationFrameId = requestAnimationFrame(animate);
    }, 700);

    return () => {
      isCleanedUp = true;
      clearTimeout(initTimer);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (handleResize) window.removeEventListener('resize', handleResize);
      if (container) {
        if (handleWheel) container.removeEventListener('wheel', handleWheel);
        if (handleTouchStart) container.removeEventListener('touchstart', handleTouchStart);
        if (handleTouchMove) container.removeEventListener('touchmove', handleTouchMove);
      }
      if (rendererRef.current) {
        if (rendererRef.current.domElement && rendererRef.current.domElement.parentElement) {
          rendererRef.current.domElement.parentElement.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    };
  }, []);

  // Global keyboard shortcuts (Enter/T for chat, Y for paint mode, R for Ragdoll, K for Ragdoll Walk, WASD/Arrows for movement)
  useEffect(() => {
    const updateKeyboardMove = () => {
      let x = 0;
      let y = 0;
      const keys = keysPressedRef.current;
      if (keys['w'] || keys['W'] || keys['ArrowUp']) y += 1;
      if (keys['s'] || keys['S'] || keys['ArrowDown']) y -= 1;
      if (keys['d'] || keys['D'] || keys['ArrowRight']) x += 1;
      if (keys['a'] || keys['A'] || keys['ArrowLeft']) x -= 1;

      // Normalize diagonal movement
      if (x !== 0 && y !== 0) {
        x *= 0.7071;
        y *= 0.7071;
      }
      keyboardMoveRef.current = { x, y };

      if (keys['Shift'] || keys['ShiftLeft'] || keys['ShiftRight']) {
        setIsSprinting(true);
      } else {
        setIsSprinting(false);
      }
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      keysPressedRef.current[e.key] = true;
      keysPressedRef.current[e.code] = true;
      updateKeyboardMove();

      if (e.key === ' ' && !e.repeat) {
        e.preventDefault();
        handleJump();
      }
      if (e.key === 'Enter' || e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setIsChatOpen((prev) => !prev);
      }
      if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        setIsPaintMode((prev) => !prev);
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleToggleRagdoll();
      }
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        handleToggleWalkingRagdoll();
      }
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        handleTogglePlayerFluidEmission();
      }
      if ((e.key === 'f' || e.key === 'F') && !e.repeat) {
        e.preventDefault();
        handleShoot();
      }
    };

    const handleGlobalKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key] = false;
      keysPressedRef.current[e.code] = false;
      updateKeyboardMove();
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('keyup', handleGlobalKeyUp);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('keyup', handleGlobalKeyUp);
    };
  }, []);

  const isPaintingRef = useRef<boolean>(false);
  const lastPaintPointRef = useRef<THREE.Vector3 | null>(null);
  const lastPaintTimeRef = useRef<number>(0);

  const performPaint = (clientX: number, clientY: number) => {
    try {
      const camera = cameraRef.current;
      const scene = sceneRef.current;
      const container = containerRef.current;
      const engine = engineRef.current;
      if (!camera || !scene || !container || !engine) return;

      // Rate-limit drag painting to at most every 25ms to ensure smooth performance on Android and PC
      const now = performance.now();
      if (now - lastPaintTimeRef.current < 25) return;
      lastPaintTimeRef.current = now;

      const rect = container.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

      // Exclude decal layers, overhead helpers, skybox, tags, bubbles, and sprites from raycast
      const hits = raycaster.intersectObjects(scene.children, true).filter((hit) => {
        const obj = hit.object;
        if (!obj) return false;
        let curr: THREE.Object3D | null = obj;
        while (curr) {
          if (!curr.visible) return false;
          curr = curr.parent;
        }
        const objName = (obj.name || '').toLowerCase();
        if (
          objName.includes('decal') ||
          objName.includes('paint') ||
          objName.includes('bullethole') ||
          objName.includes('wound') ||
          objName.includes('arrow') ||
          objName.includes('tag') ||
          objName.includes('sky') ||
          objName.includes('bubble') ||
          objName.includes('helper')
        ) return false;
        if (obj instanceof THREE.Sprite || obj instanceof THREE.Line) return false;
        return true;
      });

      if (hits.length === 0) return;
      const hit = hits[0];
      if (!(hit.object instanceof THREE.Mesh) || (hit.object as any).isInstancedMesh) return;

      // Prevent spamming the exact same position
      if (lastPaintPointRef.current && hit.point.distanceTo(lastPaintPointRef.current) < 0.030) {
        return;
      }
      lastPaintPointRef.current = hit.point.clone();

      const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
      const normal = (hit.face && hit.face.normal)
        ? hit.face.normal.clone().applyMatrix3(normalMatrix).normalize()
        : new THREE.Vector3(0, 0, 1);

      // Identify if hit particle or mesh belongs to any ragdoll, joint, cylinder, or sphere
      let hitParticle: any = null;
      let hitRagdoll: any = null;

      for (const rd of engine.ragdolls) {
        // 1. Joint bridges (cylinders connecting limbs)
        if (rd.jointBridges) {
          for (const bridge of rd.jointBridges) {
            if (bridge === hit.object) {
              hitRagdoll = rd;
              hitParticle = bridge.userData?.p1 || bridge.userData?.p2 || rd.particles[0];
              break;
            }
          }
        }
        if (hitRagdoll) break;

        // 2. Joint spheres (spheres connecting joints)
        if (rd.jointSpheres) {
          for (const sphere of rd.jointSpheres) {
            if (sphere === hit.object) {
              hitRagdoll = rd;
              hitParticle = sphere.userData?.particle || rd.particles[0];
              break;
            }
          }
        }
        if (hitRagdoll) break;

        // 3. Particles and their hierarchy
        for (const p of rd.particles) {
          if (
            hit.object.userData?.particle === p ||
            hit.object.userData?.p1 === p ||
            hit.object.userData?.p2 === p ||
            hit.object.userData?.constraint?.p1 === p ||
            hit.object.userData?.constraint?.p2 === p ||
            p.mesh === hit.object ||
            p.contourMesh === hit.object ||
            p.metaball3Mesh === hit.object ||
            (p as any).jointSphere === hit.object
          ) {
            hitParticle = p;
            hitRagdoll = rd;
            break;
          }
          let curr: THREE.Object3D | null = hit.object;
          while (curr) {
            if (curr === p.mesh || curr === p.voxelsGroup || curr === p.contourMesh || curr === p.metaball3Mesh) {
              hitParticle = p;
              hitRagdoll = rd;
              break;
            }
            curr = curr.parent;
          }
          if (hitParticle) break;
        }
        if (hitParticle) break;
      }

      // Proximity fallback: search closest ragdoll particle within 0.40m
      if (!hitParticle) {
        let closestDist = 0.40;
        for (const rd of engine.ragdolls) {
          for (const p of rd.particles) {
            const d = hit.point.distanceTo(new THREE.Vector3(p.x, p.y, p.z));
            if (d < closestDist) {
              closestDist = d;
              hitParticle = p;
              hitRagdoll = rd;
            }
          }
        }
      }

      if (hitParticle && hitRagdoll) {
        (hitParticle as any).parentRagdoll = hitRagdoll;
      }

      // 1. Unhook clicked block from division, match exact block size, and link deep hole spheres (NO blood decal)
      let paintedHoleRadius = paintHoleRadiusRef.current || 0.08;
      if (hitParticle) {
        const digResult = paintOrDigHoleOnParticle(hitParticle, hit.point.clone(), raycaster.ray.direction.clone(), paintedHoleRadius);
        paintedHoleRadius = digResult.holeRadius;
      }

      // 2. Always morph the hit object directly if it has BufferGeometry (cylinders, spheres, props, voxels)
      if (hit.object instanceof THREE.Mesh && hit.object.geometry && !hitParticle) {
        if (!hit.object.userData) hit.object.userData = {};
        if (!hit.object.userData.holes) hit.object.userData.holes = [];
        const localHit = hit.object.worldToLocal(hit.point.clone());
        const localNorm = (hit.face && hit.face.normal) ? hit.face.normal.clone() : new THREE.Vector3(0, 0, 1);
        hit.object.userData.holes.push({
          pos: localHit,
          radius: paintedHoleRadius,
          dir: localNorm,
          isSphericalHole: true,
          colorHex: 0x0a0202
        });
        applyHoleMorphToMesh(hit.object);
      }

      soundEngine.playImpact(0.25);
    } catch (err) {
      console.warn('performPaint caught non-fatal exception:', err);
    }
  };

  // Touch Camera Look & Orbit Drag Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only capture drag if clicking background, not buttons/joystick
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('#virtual-joystick-container')
    ) {
      return;
    }

    // Paint Mode: direct painting on Android touch & mouse without moving camera
    if (isPaintMode) {
      isPaintingRef.current = true;
      try {
        (e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId);
      } catch (_) {}
      performPaint(e.clientX, e.clientY);
      return;
    }

    if (cameraRef.current && sceneRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
      
      const intersects = raycaster.intersectObjects(sceneRef.current.children, true);
      let foundPart = false;
      for (const hit of intersects) {
        let curr: THREE.Object3D | null = hit.object;
        let particleObj: THREE.Object3D | null = null;
        while (curr) {
          if (curr.name && curr.name.startsWith('Carrier_')) {
             particleObj = curr;
             break;
          }
          curr = curr.parent;
        }

        const engine = engineRef.current;
        if (engine) {
          let foundRagdollId: string | null = null;
          let foundParticleId: string | null = null;
          let foundParticleName = '';

          for (const rd of engine.ragdolls) {
             for (const p of rd.particles) {
                let matchesParticle = (particleObj && p.mesh === particleObj);
                if (!matchesParticle) {
                  if (
                    hit.object.userData?.particle === p ||
                    hit.object.userData?.p1 === p ||
                    hit.object.userData?.p2 === p ||
                    hit.object.userData?.constraint?.p1 === p ||
                    hit.object.userData?.constraint?.p2 === p
                  ) {
                    matchesParticle = true;
                  }
                }
                if (!matchesParticle) {
                  let pCurr: THREE.Object3D | null = hit.object;
                  while (pCurr) {
                    if (pCurr === p.mesh || pCurr === p.voxelsGroup || pCurr === p.contourMesh || pCurr === (p as any).jointSphere) {
                      matchesParticle = true;
                      break;
                    }
                    pCurr = pCurr.parent;
                  }
                }
                if (matchesParticle) {
                   foundRagdollId = rd.id;
                   foundParticleId = p.id;
                   foundParticleName = p.name;
                   break;
                }
             }
             if (foundRagdollId) break;
          }

          if (isPaintMode) {
            try {
              const normal = (hit.face && hit.face.normal)
                ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize()
                : new THREE.Vector3(0, 0, 1);
              
              let paintedHoleRadius = paintHoleRadiusRef.current || 0.08;
              if (foundRagdollId && foundParticleId) {
                const rd = engine.ragdolls.find((r) => r.id === foundRagdollId);
                const p = rd?.particles.find((p) => p.id === foundParticleId);
                if (p) {
                  (p as any).parentRagdoll = rd;
                  const digResult = paintOrDigHoleOnParticle(p, hit.point.clone(), raycaster.ray.direction.clone(), paintedHoleRadius);
                  paintedHoleRadius = digResult.holeRadius;
                }
              }

              // 1. Morph mesh geometry to carve hole if not ragdoll particle (NO blood decal)
              if (hit.object instanceof THREE.Mesh && !(hit.object as any).isInstancedMesh) {
                if (!foundParticleId) {
                  if (!hit.object.userData) hit.object.userData = {};
                  if (!hit.object.userData.holes) hit.object.userData.holes = [];
                  const localPos = hit.object.worldToLocal(hit.point.clone());
                  const localNorm = (hit.face && hit.face.normal) ? hit.face.normal.clone() : new THREE.Vector3(0, 0, 1);
                  hit.object.userData.holes.push({
                    pos: localPos,
                    radius: paintedHoleRadius,
                    dir: localNorm,
                    isSphericalHole: true,
                    colorHex: 0x9d174d
                  });
                  applyHoleMorphToMesh(hit.object);
                }
              }
            } catch (err) {
              console.warn('PointerDown paint caught non-fatal exception:', err);
            }
            
            foundPart = true;
            break;
          }

          if (foundRagdollId && foundParticleId) {

            const distToCam = hit.point.distanceTo(cameraRef.current.position);
            draggedLimbRef.current = {
              ragdollId: foundRagdollId,
              particleId: foundParticleId,
              distance: distToCam,
              touchId: e.pointerId,
            };

            const targetRagdoll = engine.ragdolls.find(r => r.id === foundRagdollId);
            
            // Spawn 3D arrow above character's head for 5 seconds when clicked
            if (targetRagdoll) {
              const cabeza = targetRagdoll.particles.find(p => p.name === 'cabeza');
              if (cabeza && cabeza.voxelsGroup) {
                const arrowGroup = new THREE.Group();
                arrowGroup.name = 'OverheadArrow';

                // Cone pointing down
                const coneGeom = new THREE.ConeGeometry(0.04, 0.12, 8);
                coneGeom.rotateX(Math.PI);
                const coneMat = new THREE.MeshStandardMaterial({ 
                  color: 0xf59e0b, 
                  roughness: 0.2, 
                  metalness: 0.8,
                  emissive: 0xf59e0b,
                  emissiveIntensity: 0.5
                });
                const cone = new THREE.Mesh(coneGeom, coneMat);
                cone.position.set(0, 0, 0);
                arrowGroup.add(cone);

                // Cylinder shaft
                const shaftGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8);
                const shaftMat = new THREE.MeshStandardMaterial({ 
                  color: 0xf59e0b, 
                  roughness: 0.2, 
                  metalness: 0.8,
                  emissive: 0xf59e0b,
                  emissiveIntensity: 0.5
                });
                const shaft = new THREE.Mesh(shaftGeom, shaftMat);
                shaft.position.set(0, 0.12, 0);
                arrowGroup.add(shaft);

                // Remove old arrow
                const existingArrow = cabeza.voxelsGroup.getObjectByName('OverheadArrow');
                if (existingArrow) {
                  cabeza.voxelsGroup.remove(existingArrow);
                  existingArrow.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                      child.geometry?.dispose();
                      if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
                      else child.material?.dispose();
                    }
                  });
                }

                cabeza.voxelsGroup.add(arrowGroup);
                arrowGroup.position.set(0, 0.35, 0);

                setTimeout(() => {
                  if (cabeza.voxelsGroup) {
                    const arrowToRemove = cabeza.voxelsGroup.getObjectByName('OverheadArrow');
                    if (arrowToRemove) {
                      cabeza.voxelsGroup.remove(arrowToRemove);
                      arrowToRemove.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                          child.geometry?.dispose();
                          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
                          else child.material?.dispose();
                        }
                      });
                    }
                  }
                }, 5000);
              }
            }

            // Open adjustment menu for any clicked character (including my character and NPC/dummies)
            const currentMult = engine.getLimbWidthMultiplier(foundRagdollId, foundParticleId);
            setSelectedPartWidth(Math.round(currentMult * 100));

            setSelectedPart({
               ragdollId: foundRagdollId,
               particleId: foundParticleId,
               name: foundParticleName,
               worldPos: hit.point
            });

            setShowGrabMenu(false);
            foundPart = true;
            break;
          }

          // Check if clicked/touched a slime block directly in the scene
          const hitSlimeBlock = engine.voxelBlocks.find((vb) => {
            if (vb.type !== 'slime' || !vb.mesh) return false;
            let checkObj: THREE.Object3D | null = hit.object;
            while (checkObj) {
              if (checkObj === vb.mesh) return true;
              checkObj = checkObj.parent;
            }
            return false;
          });

          if (hitSlimeBlock && cameraRef.current) {
            const camDir = new THREE.Vector3();
            cameraRef.current.getWorldDirection(camDir);
            // Deform the touched block AND all nearby/distant blocks in the slime mass without ever self-repairing!
            engine.deformSlimeClusterAtPoint(hit.point, camDir, 1.45, 10.5);
            draggedSlimeRef.current = {
              active: true,
              lastPos: hit.point.clone(),
              touchId: e.pointerId,
            };
            foundPart = true;
            break;
          }

          // Check if clicked/touched an ElectroCube 3x3 or its morphable pseudo-cube envelope
          const hitElectroCube = engine.electroCubes.find((ec) => {
            if (ec.isDestroyed || !ec.groupMesh) return false;
            let checkObj: THREE.Object3D | null = hit.object;
            while (checkObj) {
              if (checkObj === ec.groupMesh || checkObj === ec.pseudoMesh) return true;
              checkObj = checkObj.parent;
            }
            return false;
          });

          if (hitElectroCube) {
            setActiveElectroCube(hitElectroCube);
            foundPart = true;
            break;
          }
        }
      }
      if (!foundPart) {
         setSelectedPart(null);
         setShowGrabMenu(false);
      } else {
         return; // Skip camera drag if clicked a body part
      }
    }

    touchLookRef.current = {
      active: true,
      touchId: e.pointerId,
      lastX: e.clientX,
      lastY: e.clientY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // Continuous paint on drag (Android Touch & Mouse)
    if (isPaintMode) {
      if (isPaintingRef.current || e.buttons > 0 || e.pointerType === 'touch') {
        performPaint(e.clientX, e.clientY);
      }
      return;
    }

    if (draggedLimbRef.current && draggedLimbRef.current.touchId === e.pointerId) {
      if (cameraRef.current && containerRef.current && engineRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

        const targetPos = new THREE.Vector3();
        raycaster.ray.at(draggedLimbRef.current.distance, targetPos);

        engineRef.current.setDragTarget(
          draggedLimbRef.current.ragdollId,
          draggedLimbRef.current.particleId,
          targetPos
        );
        engineRef.current.holdParticle(
          draggedLimbRef.current.ragdollId,
          draggedLimbRef.current.particleId
        );

        setSelectedPart(prev => prev ? { ...prev, worldPos: targetPos } : null);
      }
      return;
    }

    // Continuous interactive slime sculpting/deformation drag
    if (draggedSlimeRef.current && draggedSlimeRef.current.touchId === e.pointerId) {
      if (cameraRef.current && containerRef.current && engineRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
        const intersects = raycaster.intersectObjects(engineRef.current.scene.children, true);
        for (const hit of intersects) {
          const hitSlime = engineRef.current.voxelBlocks.find((vb) => {
            if (vb.type !== 'slime' || !vb.mesh) return false;
            let checkObj: THREE.Object3D | null = hit.object;
            while (checkObj) {
              if (checkObj === vb.mesh) return true;
              checkObj = checkObj.parent;
            }
            return false;
          });
          if (hitSlime) {
            if (hit.point.distanceTo(draggedSlimeRef.current.lastPos) > 0.15) {
              const camDir = new THREE.Vector3();
              cameraRef.current.getWorldDirection(camDir);
              engineRef.current.deformSlimeClusterAtPoint(hit.point, camDir, 1.15, 10.5);
              draggedSlimeRef.current.lastPos.copy(hit.point);
            }
            break;
          }
        }
      }
      return;
    }

    if (!touchLookRef.current.active) return;
    if (touchLookRef.current.touchId !== undefined && touchLookRef.current.touchId !== e.pointerId) {
      return;
    }

    const deltaX = e.clientX - touchLookRef.current.lastX;
    const deltaY = e.clientY - touchLookRef.current.lastY;

    touchLookRef.current.lastX = e.clientX;
    touchLookRef.current.lastY = e.clientY;

    const rotSensitivity = 0.0055;
    cameraOrbitRef.current.yaw -= deltaX * rotSensitivity;
    cameraOrbitRef.current.pitch = Math.max(
      -0.2,
      Math.min(1.4, cameraOrbitRef.current.pitch + deltaY * rotSensitivity)
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPaintMode) {
      isPaintingRef.current = false;
      lastPaintPointRef.current = null;
      try {
        (e.currentTarget as HTMLElement)?.releasePointerCapture?.(e.pointerId);
      } catch (_) {}
    }
    if (draggedLimbRef.current && draggedLimbRef.current.touchId === e.pointerId) {
      const engine = engineRef.current;
      if (engine) {
        engine.clearDragTarget(draggedLimbRef.current.ragdollId, draggedLimbRef.current.particleId);
      }
      draggedLimbRef.current = null;
    }
    if (draggedSlimeRef.current && draggedSlimeRef.current.touchId === e.pointerId) {
      draggedSlimeRef.current = null;
    }
    touchLookRef.current.active = false;
  };

  // Combat & Movement Actions
  const handleJump = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const player = engine.ragdolls.find((r) => r.isControlled) || engine.ragdolls[0];
    if (!player) return;
    if (player.isWalkingRagdoll) {
      engine.jumpWalkingRagdoll(player.id);
    } else {
      engine.jumpCharacter(player.id);
    }
  };

  const handleRespawn = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const player = engine.ragdolls.find((r) => r.isControlled) || engine.ragdolls[0];
    if (!player) return;

    engine.respawnCharacter(player.id);
    engine.releaseNPCGrab();
    setActiveGrabs({left: false, right: false});
    setIsAlive(true);
    setIsWalkingRagdoll(false);
  };

  const handleToggleRagdoll = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const player = engine.ragdolls.find((r) => r.isControlled) || engine.ragdolls[0];
    if (!player) return;

    const ragdollState = engine.toggleRagdoll(player.id);
    setIsAlive(!ragdollState);
    setIsWalkingRagdoll(false);
  };

  const handleToggleWalkingRagdoll = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const player = engine.ragdolls.find((r) => r.isControlled) || engine.ragdolls[0];
    if (!player) return;

    const walkingState = engine.toggleWalkingRagdoll(player.id);
    setIsWalkingRagdoll(walkingState);
    setIsAlive(true);
  };

  const handleContourLevelChange = (level: number) => {
    setContourLevel(level);
    if (engineRef.current) {
      engineRef.current.setContourLevel(level);
    }
  };

  const handleContourSmoothnessChange = (smoothness: number) => {
    setContourSmoothness(smoothness);
    if (engineRef.current) {
      engineRef.current.setContourSmoothness(smoothness);
    }
  };

  const handleContourJointStyleChange = (style: 'pseudo3d' | 'blocky' | 'cylinder') => {
    setContourJointStyle(style);
    if (engineRef.current) {
      engineRef.current.setContourJointStyle(style);
    }
  };

  const handleToggleContour = () => {
    const next = !contourEnabled;
    setContourEnabled(next);
    if (engineRef.current) {
      engineRef.current.setSphericalContour(contourLevel, next);
    }
  };

  const handleVoxelShapeChange = (shape: 'cube' | 'sphere') => {
    setVoxelShape(shape);
    if (engineRef.current) {
      engineRef.current.setVoxelShape(shape);
    }
  };

  const handleVoxelDensityChange = (density: number) => {
    setVoxelDensity(density);
    if (engineRef.current) {
      engineRef.current.setVoxelDensity(density);
    }
  };

  const handleToggleBustAndGlutes = (enabled: boolean) => {
    const engine = engineRef.current;
    if (!engine) return;
    const player = engine.ragdolls.find((r) => r.isControlled);
    const res = engine.toggleBustAndGlutes(enabled, player?.id);
    setHasBustAndGlutes(res);
  };

  const handleGenitalTypeChange = (type: 'none' | 'male' | 'female') => {
    const engine = engineRef.current;
    if (!engine) return;
    const player = engine.ragdolls.find((r) => r.isControlled);
    engine.setGenitalType(type, player?.id);
    setGenitalType(type);
  };

  const handleGenitalMShaftLengthChange = (val: number) => {
    setGenitalMShaftLength(val);
    const engine = engineRef.current;
    if (engine) {
      const player = engine.ragdolls.find((r) => r.isControlled);
      engine.setGenitalMShaftLength(val, player?.id);
    }
  };

  const handleGenitalMShaftThicknessChange = (val: number) => {
    setGenitalMShaftThickness(val);
    const engine = engineRef.current;
    if (engine) {
      const player = engine.ragdolls.find((r) => r.isControlled);
      engine.setGenitalMShaftThickness(val, player?.id);
    }
  };

  const handleGenitalMPinkSizeChange = (val: number) => {
    setGenitalMPinkSize(val);
    const engine = engineRef.current;
    if (engine) {
      const player = engine.ragdolls.find((r) => r.isControlled);
      engine.setGenitalMPinkSize(val, player?.id);
    }
  };

  const handleGenitalFSizeChange = (val: number) => {
    setGenitalFSize(val);
    const engine = engineRef.current;
    if (engine) {
      const player = engine.ragdolls.find((r) => r.isControlled);
      engine.setGenitalFSize(val, player?.id);
    }
  };

  const [isFluidEmitting, setIsFluidEmitting] = useState<boolean>(false);

  const handleTogglePlayerFluidEmission = () => {
    if (engineRef.current) {
      const active = engineRef.current.togglePlayerFluidEmission();
      setIsFluidEmitting(active);
    }
  };

  const handleTriggerPlayerFluidBurst = () => {
    if (engineRef.current) {
      engineRef.current.triggerPlayerFluidEmissionBurst(undefined, 4.0);
      setIsFluidEmitting(true);
      setTimeout(() => {
        if (engineRef.current) {
          setIsFluidEmitting(engineRef.current.isPlayerFluidEmitting());
        }
      }, 4200);
    }
  };

  const handleTriggerErection = () => {
    if (engineRef.current) {
      const player = engineRef.current.ragdolls.find((r) => r.isControlled);
      engineRef.current.triggerErection(player?.id);
      setIsFluidEmitting(true);
    }
  };

  const handleToggleShirt = (enabled: boolean) => {
    setHasShirt(enabled);
    if (engineRef.current) {
      engineRef.current.setPlayerShirt(enabled, shirtColorHex);
    }
  };

  const handleShirtColorChange = (color: number) => {
    setShirtColorHex(color);
    setHasShirt(true);
    if (engineRef.current) {
      engineRef.current.setPlayerShirt(true, color);
    }
  };

  const handleTogglePants = (enabled: boolean) => {
    setHasPants(enabled);
    if (engineRef.current) {
      engineRef.current.setPlayerClothing({ hasPants: enabled, pantsColorHex });
    }
  };

  const handlePantsColorChange = (color: number) => {
    setPantsColorHex(color);
    setHasPants(true);
    if (engineRef.current) {
      engineRef.current.setPlayerClothing({ hasPants: true, pantsColorHex: color });
    }
  };

  const handleToggleUnderwear = (enabled: boolean) => {
    setHasUnderwear(enabled);
    if (engineRef.current) {
      engineRef.current.setPlayerClothing({ hasUnderwear: enabled, underwearColorHex });
    }
  };

  const handleUnderwearColorChange = (color: number) => {
    setUnderwearColorHex(color);
    if (engineRef.current) {
      engineRef.current.setPlayerClothing({ hasUnderwear: true, underwearColorHex: color });
    }
  };

  const handleToggleGloves = (enabled: boolean) => {
    setHasGloves(enabled);
    if (engineRef.current) {
      engineRef.current.setPlayerClothing({ hasGloves: enabled, glovesColorHex });
    }
  };

  const handleGlovesColorChange = (color: number) => {
    setGlovesColorHex(color);
    if (engineRef.current) {
      engineRef.current.setPlayerClothing({ hasGloves: true, glovesColorHex: color });
    }
  };

  const handleToggleBoots = (enabled: boolean) => {
    setHasBoots(enabled);
    if (engineRef.current) {
      engineRef.current.setPlayerClothing({ hasBoots: enabled, bootsColorHex });
    }
  };

  const handleBootsColorChange = (color: number) => {
    setBootsColorHex(color);
    if (engineRef.current) {
      engineRef.current.setPlayerClothing({ hasBoots: true, bootsColorHex: color });
    }
  };

  const handleToggleSocks = (enabled: boolean) => {
    setHasSocks(enabled);
    if (engineRef.current) {
      engineRef.current.setPlayerClothing({ hasSocks: enabled, socksColorHex });
    }
  };

  const handleSocksColorChange = (color: number) => {
    setSocksColorHex(color);
    if (engineRef.current) {
      engineRef.current.setPlayerClothing({ hasSocks: true, socksColorHex: color });
    }
  };

  const handleSkinColorChange = (color: number) => {
    setSkinColorHex(color);
    if (engineRef.current) {
      engineRef.current.setPlayerSkinColor(color);
    }
  };

  const handleHairTypeChange = (type: string) => {
    setHairType(type);
    if (engineRef.current) {
      engineRef.current.setPlayerHair(type, hairColorHex);
    }
  };

  const handleHairColorChange = (color: number) => {
    setHairColorHex(color);
    if (engineRef.current) {
      engineRef.current.setPlayerHair(hairType, color);
    }
  };

  const handleBeardTypeChange = (type: string) => {
    setBeardType(type);
    if (engineRef.current) {
      engineRef.current.setPlayerBeard(type, beardColorHex);
    }
  };

  const handleBeardColorChange = (color: number) => {
    setBeardColorHex(color);
    if (engineRef.current) {
      engineRef.current.setPlayerBeard(beardType, color);
    }
  };

  const handleHatTypeChange = (type: string) => {
    setHatType(type);
    if (engineRef.current) {
      engineRef.current.setPlayerHat(type, hatColorHex);
    }
  };

  const handleHatColorChange = (color: number) => {
    setHatColorHex(color);
    if (engineRef.current) {
      engineRef.current.setPlayerHat(hatType, color);
    }
  };

  const handleGlassesTypeChange = (type: string) => {
    setGlassesType(type);
    if (engineRef.current) {
      engineRef.current.setPlayerGlasses(type, glassesColorHex);
    }
  };

  const handleGlassesColorChange = (color: number) => {
    setGlassesColorHex(color);
    if (engineRef.current) {
      engineRef.current.setPlayerGlasses(glassesType, color);
    }
  };

  const handleFaceFeatureModeChange = (mode: FaceFeatureMode) => {
    setFaceFeatureMode(mode);
    if (engineRef.current) {
      engineRef.current.setPlayerFaceFeatureMode(mode);
    }
  };

  const handleFaceFloatDepthChange = (depth: number) => {
    setFaceFloatDepth(depth);
    if (engineRef.current) {
      engineRef.current.setPlayerFaceFloatDepth(depth);
    }
  };

  const handleToggleEyeHoles = (enabled: boolean) => {
    setEyeHolesEnabled(enabled);
    if (engineRef.current) {
      engineRef.current.setPlayerEyeHolesEnabled(enabled);
    }
  };

  const handleSetHotNPCPose = (pose: HotPoseType, npcId?: string) => {
    if (engineRef.current) {
      engineRef.current.setHotNPCPose(pose, npcId);
    }
  };

  const handleToggleAim = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const player = engine.ragdolls.find((r) => r.isControlled) || engine.ragdolls[0];
    if (!player) return;

    const nextAiming = !player.isAiming;
    engine.setAiming(nextAiming, player.id);
    setIsAiming(nextAiming);
    if (nextAiming) {
      if (cameraOrbitRef.current.targetDistance > 3.2) {
        cameraOrbitRef.current.targetDistance = 3.2;
        setCameraDistance(3.2);
      }
    } else {
      setIsFreeCamAiming(false);
      isFreeCamAimingRef.current = false;
    }
  };

  const handleToggleFreeCamAiming = () => {
    const nextVal = !isFreeCamAimingRef.current;
    setIsFreeCamAiming(nextVal);
    isFreeCamAimingRef.current = nextVal;
  };

  const handleShoot = () => {
    const engine = engineRef.current;
    if (!engine || !cameraRef.current) return;
    const player = engine.ragdolls.find((r) => r.isControlled) || engine.ragdolls[0];
    if (!player || (!player.isAlive && !player.isWalkingRagdoll)) return;

    // Check 0.3s weapon cooldown only if they have a weapon
    const now = performance.now();
    if (player.hasWeapon && now - lastPlayerShootTimeRef.current < 300) return;
    if (player.hasWeapon) {
      lastPlayerShootTimeRef.current = now;
    }

    // If player does NOT have a weapon: throw ragdoll punch strike!
    // Do NOT auto-equip weapon, do NOT aim, do NOT spawn weapon!
    if (!player.hasWeapon) {
      if (!player.isWalkingRagdoll) {
        engine.toggleWalkingRagdoll(player.id);
        setIsWalkingRagdoll(true);
      }
      // 200ms cooldown for punches
      if (now - lastPlayerShootTimeRef.current < 200) return;
      lastPlayerShootTimeRef.current = now;
      engine.performUnarmedAttack(player.id);
      return;
    }

    // Determine 3D aiming raycast point directly in front of camera
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), cameraRef.current);
    const cameraRayDir = raycaster.ray.direction.clone().normalize();

    // Check intersection with valid physical target meshes in the scene
    const candidateMeshes: THREE.Object3D[] = [];
    for (const r of engine.ragdolls) {
      if (r.id === player.id) continue;
      candidateMeshes.push(r.groupMesh);
    }
    for (const d of engine.doors) {
      if (!d.isDestroyed) candidateMeshes.push(d.hingeGroup);
    }
    for (const vb of engine.voxelBlocks) {
      if (vb.mesh) candidateMeshes.push(vb.mesh);
    }
    for (const bed of engine.beds) {
      if (bed.groupMesh) candidateMeshes.push(bed.groupMesh);
    }

    const intersects = raycaster.intersectObjects(candidateMeshes, true);
    let targetPoint: THREE.Vector3 | null = null;

    if (intersects.length > 0) {
      targetPoint = intersects[0].point;
    }

    if (!targetPoint) {
      // Check intersection with floor plane or project far along camera ray
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hitGround = new THREE.Vector3();
      if (cameraRayDir.y < -0.001 && raycaster.ray.intersectPlane(plane, hitGround)) {
        targetPoint = hitGround;
      } else {
        targetPoint = raycaster.ray.origin.clone().addScaledVector(cameraRayDir, 100);
      }
    }

    // When aiming/shooting with ranged firearms only, face target; for melee strikes, punches, and hammer swings, keep facing angle rock solid without rotating character
    const isMeleeOrHammer = !player.hasWeapon || (player as any).activeWeapon === 'hammer';
    if (!isMeleeOrHammer && player.isAiming) {
      const dx = targetPoint.x - player.charPos.x;
      const dz = targetPoint.z - player.charPos.z;
      if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
        player.facingAngle = Math.atan2(dx, dz);
      }
    }

    // Fire high-speed bullet with tracer directly towards reticle target point with zero deviation
    engine.shoot(true, targetPoint, player.id, cameraRayDir);
  };

  const handleDropWeapon = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const player = engine.ragdolls.find((r) => r.isControlled) || engine.ragdolls[0];
    if (player && player.hasWeapon) {
      engine.dropWeapon(player.id);
      setHasWeapon(false);
    }
  };

  // Spawners
  const handleSpawnWeaponPickup = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const player = engine.ragdolls[0];
    let spawnX = 0;
    let spawnY = 0.4;
    let spawnZ = 2.0;

    if (player) {
      const forwardZ = Math.cos(player.facingAngle);
      const forwardX = Math.sin(player.facingAngle);
      spawnX = player.charPos.x + forwardX * 2.0;
      spawnY = player.charPos.y + 0.4;
      spawnZ = player.charPos.z + forwardZ * 2.0;
    }

    engine.spawnWeaponPickup(spawnX, spawnY, spawnZ);
  };

  const handleSpawnDummy = () => {
    const engine = engineRef.current;
    if (!engine) return;

    const player = engine.ragdolls[0];
    let spawnX = 0;
    let spawnZ = 6.0;

    if (player) {
      const forwardZ = Math.cos(player.facingAngle);
      const forwardX = Math.sin(player.facingAngle);
      spawnX = player.charPos.x + forwardX * 6.0;
      spawnZ = player.charPos.z + forwardZ * 6.0;
    }

    engine.spawnDummy(spawnX, 0, spawnZ);
    // engine.ragdolls.length has increased, could count specifically if needed
    // For now we'll just track how many times button was clicked
    setDummyCount(prev => prev + 1);
  };

  const handleSpawnRagdoll = () => {
    const engine = engineRef.current;
    if (!engine) return;

    const player = engine.ragdolls[0];
    let spawnX = 0;
    let spawnZ = 5.0;

    if (player) {
      const forwardZ = Math.cos(player.facingAngle);
      const forwardX = Math.sin(player.facingAngle);
      spawnX = player.charPos.x + forwardX * 5.0;
      spawnZ = player.charPos.z + forwardZ * 5.0;
    }

    engine.spawnRagdoll(spawnX, 0, spawnZ);
    setDummyCount(prev => prev + 1);
  };

  const handleSpawnEvilDummy = () => {
    const engine = engineRef.current;
    if (!engine) return;

    const player = engine.ragdolls[0];
    let spawnX = 0;
    let spawnZ = 6.0;

    if (player) {
      const forwardZ = Math.cos(player.facingAngle);
      const forwardX = Math.sin(player.facingAngle);
      spawnX = player.charPos.x + forwardX * 6.0;
      spawnZ = player.charPos.z + forwardZ * 6.0;
    }

    engine.spawnEvilDummy(spawnX, 0, spawnZ);
  };

  const handleSpawnSoldier = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const player = engine.ragdolls[0];
    let spawnX = 0;
    let spawnZ = 6.0;

    if (player) {
      const forwardZ = Math.cos(player.facingAngle);
      const forwardX = Math.sin(player.facingAngle);
      spawnX = player.charPos.x + forwardX * 6.0;
      spawnZ = player.charPos.z + forwardZ * 6.0;
    }

    engine.spawnSoldier(spawnX, 0, spawnZ);
    setSoldierCount(engine.soldiers.length);
  };

  const handleSpawnZombie = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const player = engine.ragdolls[0];
    let spawnX = 0;
    let spawnZ = 5.0;

    if (player) {
      const forwardZ = Math.cos(player.facingAngle);
      const forwardX = Math.sin(player.facingAngle);
      spawnX = player.charPos.x + forwardX * 5.0;
      spawnZ = player.charPos.z + forwardZ * 5.0;
    }

    engine.spawnZombie(spawnX, 0, spawnZ);
    const count = engine.ragdolls.filter((r) => r.isZombie).length;
    setZombieCount(count);
  };

  const handleSpawnTentacle = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const player = engine.ragdolls[0];
    let spawnX = 0;
    let spawnZ = 5.0;

    if (player) {
      const forwardZ = Math.cos(player.facingAngle);
      const forwardX = Math.sin(player.facingAngle);
      spawnX = player.charPos.x + forwardX * 5.0;
      spawnZ = player.charPos.z + forwardZ * 5.0;
    }

    engine.spawnTentacle(spawnX, 0, spawnZ);
    const count = engine.ragdolls.filter((r) => r.isTentacle).length;
    setTentacleCount(count);
  };

  const handleSpawnCaveTentacle = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const player = engine.ragdolls[0];
    let spawnX = 0;
    let spawnZ = 5.0;

    if (player) {
      const forwardZ = Math.cos(player.facingAngle);
      const forwardX = Math.sin(player.facingAngle);
      spawnX = player.charPos.x + forwardX * 7.0;
      spawnZ = player.charPos.z + forwardZ * 7.0;
    }

    engine.spawnCaveTentacle(spawnX, 0, spawnZ);
  };

  const handleSpawnWerewolf = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const player = engine.ragdolls[0];
    let spawnX = 0;
    let spawnZ = 5.0;

    if (player) {
      const forwardZ = Math.cos(player.facingAngle);
      const forwardX = Math.sin(player.facingAngle);
      spawnX = player.charPos.x + forwardX * 5.0;
      spawnZ = player.charPos.z + forwardZ * 5.0;
    }

    engine.spawnWerewolf(spawnX, 0, spawnZ);
    const count = engine.ragdolls.filter((r) => r.isWerewolf).length;
    setWerewolfCount(count);
  };

  const handleSpawnWerewolfHot = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const player = engine.ragdolls[0];
    let spawnX = 0;
    let spawnZ = 5.0;

    if (player) {
      const forwardZ = Math.cos(player.facingAngle);
      const forwardX = Math.sin(player.facingAngle);
      spawnX = player.charPos.x + forwardX * 5.0;
      spawnZ = player.charPos.z + forwardZ * 5.0;
    }

    engine.spawnWerewolfHot(spawnX, 0, spawnZ);
  };

  const handleSpawnDummyHot = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const player = engine.ragdolls[0];
    let spawnX = 0;
    let spawnZ = 5.0;

    if (player) {
      const forwardZ = Math.cos(player.facingAngle);
      const forwardX = Math.sin(player.facingAngle);
      spawnX = player.charPos.x + forwardX * 5.0;
      spawnZ = player.charPos.z + forwardZ * 5.0;
    }

    engine.spawnDummyHot(spawnX, 0, spawnZ);
  };

  const handleSpawnProp = (type: string) => {
    const engine = engineRef.current;
    if (!engine) return;
    const player = engine.ragdolls[0];
    let spawnX = 0;
    let spawnZ = 5.0;

    if (player) {
      const forwardZ = Math.cos(player.facingAngle);
      const forwardX = Math.sin(player.facingAngle);
      spawnX = player.charPos.x + forwardX * 3.5;
      spawnZ = player.charPos.z + forwardZ * 3.5;
    }

    if (type === 'moving_platform') {
      engine.spawnMovingPlatform(spawnX, 0.38, spawnZ, 3.2, 0.36, 0.8, 5.2, 9.0, 'x', 'Barredora Cinética');
      return;
    }

    if (type === 'block_tube_npc') {
      engine.spawnCaveTentacle(spawnX, 0, spawnZ);
      return;
    }

    if (type === 'block_3x3') {
      const cube = engine.spawnElectroCube(spawnX, 0.45, spawnZ, 70, 30, 100);
      setActiveElectroCube(cube);
      return;
    }

    if (type === 'block_hammer' || type === 'hammer') {
      const pickupX = player ? player.charPos.x + Math.sin(player.facingAngle) * 1.4 : spawnX;
      const pickupZ = player ? player.charPos.z + Math.cos(player.facingAngle) * 1.4 : spawnZ;
      engine.spawnHammerPickup(pickupX, 0.4, pickupZ);
      return;
    }

    const validTypes: ('cup' | 'bed' | 'sofa' | 'brick_wall' | 'block_arm' | 'block_leg' | 'block_hand' | 'block_head' | 'block_torso' | 'block_slime' | 'block_skin' | 'block_tube' | 'block_tube_npc' | 'block_3x3')[] = [
      'cup', 'bed', 'sofa', 'brick_wall', 'block_arm', 'block_leg', 'block_hand', 'block_head', 'block_torso', 'block_slime', 'block_skin', 'block_tube', 'block_tube_npc', 'block_3x3'
    ];
    const matchedType = validTypes.find(t => t === type) || 'brick_wall';
    engine.spawnVoxelProp3D(matchedType, spawnX, 0.4, spawnZ);
  };

  const handleDuplicateProp = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.duplicateVoxelProp();
  };

  const handleSpawnLiquid = (type: string, quantity: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    const player = engine.ragdolls[0];
    let spawnX = 0;
    let spawnZ = 3.0;

    if (player) {
      const forwardZ = Math.cos(player.facingAngle);
      const forwardX = Math.sin(player.facingAngle);
      spawnX = player.charPos.x + forwardX * 3.0;
      spawnZ = player.charPos.z + forwardZ * 3.0;
    }

    if (type === 'water') {
      engine.spawnLiquid(spawnX, 2.5, spawnZ, quantity);
    }
  };

  const handleSpawnPool = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const player = engine.ragdolls[0];
    let spawnX = 0;
    let spawnZ = 8.0;

    if (player) {
      const forwardZ = Math.cos(player.facingAngle);
      const forwardX = Math.sin(player.facingAngle);
      spawnX = player.charPos.x + forwardX * 8.0;
      spawnZ = player.charPos.z + forwardZ * 8.0;
    }

    engine.spawnPool(spawnX, 0, spawnZ);
    // Apply current water height to newly spawned pool
    engine.setPoolWaterHeight(poolWaterHeight);
  };

  const handlePoolWaterHeightChange = (val: number) => {
    setPoolWaterHeight(val);
    if (engineRef.current) {
      engineRef.current.setPoolWaterHeight(val);
    }
  };

  // Zoom Controls
  const handleZoomIn = () => {
    const nextDist = Math.max(1.2, cameraOrbitRef.current.targetDistance - 1.2);
    cameraOrbitRef.current.targetDistance = nextDist;
    setCameraDistance(nextDist);
  };

  const handleZoomOut = () => {
    const nextDist = Math.min(22.0, cameraOrbitRef.current.targetDistance + 1.2);
    cameraOrbitRef.current.targetDistance = nextDist;
    setCameraDistance(nextDist);
  };

  const handleResetZoom = () => {
    cameraOrbitRef.current.targetDistance = 5.5;
    setCameraDistance(5.5);
  };

  const handleSpawnPaloRod = () => {
    if (engineRef.current) {
      engineRef.current.spawnPaloRod();
    }
  };

  const handleSelectMap = (mapId: string) => {
    const map = GAME_MAPS_3D[mapId];
    if (map && engineRef.current) {
      engineRef.current.loadMap(map);
      setActiveMapId(mapId);
    }
  };

  const handleRegenerateNeighborhood = () => {
    if (engineRef.current) {
      engineRef.current.spawnNeighborhoodVoxelWorld();
    }
  };

  const handleRegenerateGenerateWorld = () => {
    if (engineRef.current) {
      engineRef.current.spawnGenerateVoxelWorld();
    }
  };

  return (
    <div
      id="gorebox-3d-viewport"
      className="relative w-screen h-screen overflow-hidden bg-sky-300 select-none touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {showDisclaimer && (
        <StartupDisclaimer onComplete={() => setShowDisclaimer(false)} />
      )}
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="w-full h-full block" />

      {/* Dynamic 3D Projected Overhead Chat Bubbles (Player, Ragdolls, Remote Players) */}
      <OverheadChatBubbles
        bubbles={activeBubbles}
        cameraRef={cameraRef}
        camera={cameraRef.current}
        getSpeakerPosition={getSpeakerWorldPosition}
      />

      {/* Toast Message Notification */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-500/90 border border-white/20 text-white text-xs font-bold rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
          <span>✅</span> {toastMessage}
        </div>
      )}

      {/* Sleek, Comfortable & Minimal Limb Selection HUD (Solo lo necesario) */}
      {selectedPart && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 p-3 bg-slate-950/90 backdrop-blur-md border border-cyan-500/40 rounded-2xl shadow-2xl flex flex-col gap-2.5 pointer-events-auto max-w-sm w-[92vw] sm:w-[360px] animate-in fade-in zoom-in-95 duration-200">
          {/* Header: Limb name, current width badge, Symmetry toggle, and close button */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-base flex-shrink-0">🦾</span>
              <span className="text-xs font-black text-cyan-300 tracking-wide uppercase truncate">
                {formatLimbName(selectedPart.name)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Botón de Simetría (ambos lados a la vez: ej. hombro1/hombro2, muslo_izq/muslo_der) */}
              <button
                onClick={() => setIsSymmetricAdjustment(!isSymmetricAdjustment)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border transition-all active:scale-95 ${
                  isSymmetricAdjustment
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 shadow-sm shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-400'
                }`}
                title={
                  isSymmetricAdjustment
                    ? 'Simetría Activada: Modifica ambos lados simultáneamente'
                    : 'Simetría Desactivada: Modifica sólo esta extremidad'
                }
              >
                <span>🪞</span>
                <span>{isSymmetricAdjustment ? 'Simetría' : 'Individual'}</span>
              </button>
              <span className="px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-black">
                {selectedPartWidth}%
              </span>
              <button
                onClick={() => {
                  stopLimbWidthChange();
                  setSelectedPart(null);
                  setShowGrabMenu(false);
                }}
                className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-90 text-slate-300 flex items-center justify-center text-xs font-bold transition-all"
                title="Cerrar selección"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Width Adjustment Slider with Quick - / + Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const newVal = Math.max(20, selectedPartWidth - 5);
                handleUpdateLimbWidth(newVal);
              }}
              className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-90 text-cyan-400 border border-slate-800 flex items-center justify-center font-black text-sm transition-all"
              title="Reducir grosor (-5%)"
            >
              −
            </button>
            <input
              type="range"
              min="20"
              max="300"
              value={selectedPartWidth}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                handleUpdateLimbWidth(val);
              }}
              className="flex-1 accent-cyan-500 bg-slate-800 h-2 rounded-lg appearance-none cursor-pointer"
            />
            <button
              onClick={() => {
                const newVal = Math.min(300, selectedPartWidth + 5);
                handleUpdateLimbWidth(newVal);
              }}
              className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-90 text-cyan-400 border border-slate-800 flex items-center justify-center font-black text-sm transition-all"
              title="Aumentar grosor (+5%)"
            >
              +
            </button>
          </div>

          {/* Action Buttons: Copiar Proporciones, Ver Código & Restablecer */}
          <div className="flex flex-col gap-1.5 pt-0.5">
            <div className="flex items-center gap-1.5">
              <button
                onClick={copyLimbProportionsCode}
                className={`flex-1 py-2 px-2.5 rounded-xl font-black text-xs shadow-lg flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 ${
                  copiedProportions
                    ? 'bg-emerald-600 text-white border border-emerald-400/50'
                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-400/30'
                }`}
              >
                <span className="text-sm">{copiedProportions ? '✅' : '📋'}</span>
                <span>{copiedProportions ? '¡Copiado!' : 'Copiar Código'}</span>
              </button>
              <button
                onClick={() => {
                  copyLimbProportionsCode();
                }}
                className="py-2 px-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-white border border-cyan-800/60 rounded-xl font-bold text-xs active:scale-95 transition-all whitespace-nowrap flex items-center gap-1"
                title="Ver código de proporciones para enviar"
              >
                <span>👁️</span>
                <span>Ver Código</span>
              </button>
            </div>
          </div>

          {/* Compact Grab Toggles */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-900">
            <span className="text-[10px] font-bold text-slate-400">Agarrar con jugador:</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  const isGrabbed = !activeGrabs.left;
                  setActiveGrabs((prev) => ({ ...prev, left: isGrabbed }));
                  if (engineRef.current && selectedPart) {
                    engineRef.current.grabNPCLimb(
                      selectedPart.ragdollId,
                      selectedPart.particleId,
                      isGrabbed,
                      activeGrabs.right
                    );
                  }
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                  activeGrabs.left
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                }`}
              >
                Brazo 1 {activeGrabs.left ? '✓' : ''}
              </button>
              <button
                onClick={() => {
                  const isGrabbed = !activeGrabs.right;
                  setActiveGrabs((prev) => ({ ...prev, right: isGrabbed }));
                  if (engineRef.current && selectedPart) {
                    engineRef.current.grabNPCLimb(
                      selectedPart.ragdollId,
                      selectedPart.particleId,
                      activeGrabs.left,
                      isGrabbed
                    );
                  }
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                  activeGrabs.right
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                }`}
              >
                Brazo 2 {activeGrabs.right ? '✓' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HUD with Combat Controls, Zoom, Spawners, Joystick & Jump */}
      <TouchHUD
        onOpenChat={() => setIsChatOpen(true)}
        activeEmote={activeEmote}
        onTriggerEmote={handleTriggerEmote}
        isPaintMode={isPaintMode}
        onTogglePaintMode={() => setIsPaintMode(!isPaintMode)}
        paintHoleRadius={paintHoleRadius}
        onChangePaintHoleRadius={(r) => setPaintHoleRadius(r)}
        onMoveJoystick={(vec) => {
          leftJoystickRef.current = vec;
        }}
        onJump={handleJump}
        onRespawn={handleRespawn}
        isAlive={isAlive}
        cameraDistance={cameraDistance}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        hasWeapon={hasWeapon}
        onDropWeapon={handleDropWeapon}
        isAiming={isAiming}
        onToggleAim={handleToggleAim}
        isFreeCamAiming={isFreeCamAiming}
        onToggleFreeCamAiming={handleToggleFreeCamAiming}
        onShoot={handleShoot}
        shootCooldownRemaining={shootCooldownRemaining}
        onSpawnWeaponPickup={handleSpawnWeaponPickup}
        onSpawnDummy={handleSpawnDummy}
        onSpawnRagdoll={handleSpawnRagdoll}
        dummyCount={dummyCount}
        onSpawnEvilDummy={handleSpawnEvilDummy}
        onSpawnSoldier={handleSpawnSoldier}
        soldierCount={soldierCount}
        onSpawnZombie={handleSpawnZombie}
        zombieCount={zombieCount}
        onSpawnProp={handleSpawnProp}
        onSpawnLiquid={handleSpawnLiquid}
        onSpawnPool={handleSpawnPool}
        contourLevel={contourLevel}
        contourSmoothness={contourSmoothness}
        contourEnabled={contourEnabled}
        contourJointStyle={contourJointStyle}
        startupBlockyRemaining={startupBlockyRemaining}
        onContourLevelChange={handleContourLevelChange}
        onContourSmoothnessChange={handleContourSmoothnessChange}
        onContourJointStyleChange={handleContourJointStyleChange}
        onToggleContour={handleToggleContour}
        voxelShape={voxelShape}
        onVoxelShapeChange={handleVoxelShapeChange}
        voxelDensity={voxelDensity}
        onVoxelDensityChange={handleVoxelDensityChange}
        hasBustAndGlutes={hasBustAndGlutes}
        onToggleBustAndGlutes={handleToggleBustAndGlutes}
        genitalType={genitalType}
        onGenitalTypeChange={handleGenitalTypeChange}
        genitalMShaftLength={genitalMShaftLength}
        onGenitalMShaftLengthChange={handleGenitalMShaftLengthChange}
        genitalMShaftThickness={genitalMShaftThickness}
        onGenitalMShaftThicknessChange={handleGenitalMShaftThicknessChange}
        genitalMPinkSize={genitalMPinkSize}
        onGenitalMPinkSizeChange={handleGenitalMPinkSizeChange}
        genitalFSize={genitalFSize}
        onGenitalFSizeChange={handleGenitalFSizeChange}
        onToggleRagdoll={handleToggleRagdoll}
        isWalkingRagdoll={isWalkingRagdoll}
        onToggleWalkingRagdoll={handleToggleWalkingRagdoll}
        onSpawnTentacle={handleSpawnTentacle}
        tentacleCount={tentacleCount}
        onSpawnCaveTentacle={handleSpawnCaveTentacle}
        onSpawnWerewolf={handleSpawnWerewolf}
        werewolfCount={werewolfCount}
        onSpawnWerewolfHot={handleSpawnWerewolfHot}
        onSpawnDummyHot={handleSpawnDummyHot}
        hasShirt={hasShirt}
        shirtColorHex={shirtColorHex}
        onToggleShirt={handleToggleShirt}
        onShirtColorChange={handleShirtColorChange}
        skinColorHex={skinColorHex}
        onSkinColorChange={handleSkinColorChange}
        pantsColorHex={pantsColorHex}
        onPantsColorChange={handlePantsColorChange}
        hairType={hairType}
        hairColorHex={hairColorHex}
        onHairTypeChange={handleHairTypeChange}
        onHairColorChange={handleHairColorChange}
        beardType={beardType}
        beardColorHex={beardColorHex}
        onBeardTypeChange={handleBeardTypeChange}
        onBeardColorChange={handleBeardColorChange}
        hatType={hatType}
        hatColorHex={hatColorHex}
        onHatTypeChange={handleHatTypeChange}
        onHatColorChange={handleHatColorChange}
        glassesType={glassesType}
        glassesColorHex={glassesColorHex}
        onGlassesTypeChange={handleGlassesTypeChange}
        onGlassesColorChange={handleGlassesColorChange}
        liquidQuantity={liquidQuantity}
        onSetLiquidQuantity={setLiquidQuantity}
        poolWaterHeight={poolWaterHeight}
        onSetPoolWaterHeight={handlePoolWaterHeightChange}
        isSprinting={isSprinting}
        onToggleSprint={handleToggleSprint}
        characterTexturesEnabled={characterTexturesEnabled}
        onToggleCharacterTextures={handleToggleCharacterTextures}
        xrayMode={xrayMode}
        onXRayModeChange={handleXRayModeChange}
        showSoundWaves={showSoundWaves}
        onToggleSoundWaves={handleToggleSoundWaves}
        intelligence={intelligence}
        onIntelligenceChange={handleIntelligenceChange}
        strength={strength}
        onStrengthChange={handleStrengthChange}
        speed={speed}
        onSpeedChange={handleSpeedChange}
        jumpPower={jumpPower}
        onJumpPowerChange={handleJumpPowerChange}
        immunity={immunity}
        onImmunityChange={handleImmunityChange}
        hearing={hearing}
        onHearingChange={handleHearingChange}
        resilience={resilience}
        onResilienceChange={handleResilienceChange}
        reproduction={reproduction}
        onReproductionChange={handleReproductionChange}
        asesino={asesino}
        onAsesinoChange={handleAsesinoChange}
        psicopata={psicopata}
        onPsicopataChange={handlePsicopataChange}
        amable={amable}
        onAmableChange={handleAmableChange}
        onSpawnBlockHouse={handleSpawnBlockHouse}
        onSpawnObbyCourse={handleSpawnObbyCourse}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onSpawnPaloRod={handleSpawnPaloRod}
        onTriggerErection={handleTriggerErection}
        isFluidEmitting={isFluidEmitting}
        onTogglePlayerFluidEmission={handleTogglePlayerFluidEmission}
        onTriggerPlayerFluidBurst={handleTriggerPlayerFluidBurst}
        isFlying={isFlying}
        onToggleFly={handleToggleFly}
        onFlyAscend={handleFlyAscend}
        onFlyDescend={handleFlyDescend}
        isGodMode={isGodMode}
        onToggleGodMode={handleToggleGodMode}
        isZeroGravity={isZeroGravity}
        onToggleZeroGravity={handleToggleZeroGravity}
        onExplodeAllRagdolls={handleExplodeAllRagdolls}
        onDuplicateProp={handleDuplicateProp}
        activeHotNPCsInfo={activeHotNPCsInfo}
        onSetHotNPCPose={handleSetHotNPCPose}
        activeMapId={activeMapId}
        onSelectMap={handleSelectMap}
        onRegenerateNeighborhood={handleRegenerateNeighborhood}
        onRegenerateGenerateWorld={handleRegenerateGenerateWorld}
        onFocusCameraOnPlayer={handleFocusCameraOnPlayer}
        isAvatarEditorOpen={isAvatarEditorOpen}
        onToggleAvatarEditor={handleToggleAvatarEditor}
        onRotateCameraToFront={handleRotateCameraToFront}
        onRotateCameraToBack={handleRotateCameraToBack}
        onRotateCameraToSide={handleRotateCameraToSide}
        currentWeather={currentWeather}
        onWeatherChange={handleWeatherChange}
      />

      <AvatarEditorModal
        isOpen={isAvatarEditorOpen}
        onClose={() => handleToggleAvatarEditor(false)}
        previewAngle={avatarPreviewAngle}
        onSetPreviewAngle={handleSetAvatarPreviewAngle}
        previewDistance={avatarPreviewDistance}
        onSetPreviewDistance={handleSetAvatarPreviewDistance}
        onRotateCameraToFront={handleRotateCameraToFront}
        onRotateCameraToBack={handleRotateCameraToBack}
        onRotateCameraToSide={handleRotateCameraToSide}
        onFocusCameraOnPlayer={handleFocusCameraOnPlayer}
        isFluidEmitting={isFluidEmitting}
        onTogglePlayerFluidEmission={handleTogglePlayerFluidEmission}
        onTriggerPlayerFluidBurst={handleTriggerPlayerFluidBurst}
        onTriggerErection={handleTriggerErection}
        faceFeatureMode={faceFeatureMode}
        faceFloatDepth={faceFloatDepth}
        eyeHolesEnabled={eyeHolesEnabled}
        onFaceFeatureModeChange={handleFaceFeatureModeChange}
        onFaceFloatDepthChange={handleFaceFloatDepthChange}
        onToggleEyeHoles={handleToggleEyeHoles}
        hasShirt={hasShirt}
        shirtColorHex={shirtColorHex}
        onToggleShirt={handleToggleShirt}
        onShirtColorChange={handleShirtColorChange}
        hasPants={hasPants}
        pantsColorHex={pantsColorHex}
        onTogglePants={handleTogglePants}
        onPantsColorChange={handlePantsColorChange}
        hasUnderwear={hasUnderwear}
        underwearColorHex={underwearColorHex}
        onToggleUnderwear={handleToggleUnderwear}
        onUnderwearColorChange={handleUnderwearColorChange}
        hasGloves={hasGloves}
        glovesColorHex={glovesColorHex}
        onToggleGloves={handleToggleGloves}
        onGlovesColorChange={handleGlovesColorChange}
        hasBoots={hasBoots}
        bootsColorHex={bootsColorHex}
        onToggleBoots={handleToggleBoots}
        onBootsColorChange={handleBootsColorChange}
        hasSocks={hasSocks}
        socksColorHex={socksColorHex}
        onToggleSocks={handleToggleSocks}
        onSocksColorChange={handleSocksColorChange}
        skinColorHex={skinColorHex}
        onSkinColorChange={handleSkinColorChange}
        contourJointStyle={contourJointStyle}
        contourLevel={contourLevel}
        contourEnabled={contourEnabled}
        onContourJointStyleChange={handleContourJointStyleChange}
        onContourLevelChange={handleContourLevelChange}
        onToggleContour={handleToggleContour}
        hasBustAndGlutes={hasBustAndGlutes}
        onToggleBustAndGlutes={handleToggleBustAndGlutes}
        genitalType={genitalType}
        onGenitalTypeChange={handleGenitalTypeChange}
        genitalMShaftLength={genitalMShaftLength}
        onGenitalMShaftLengthChange={handleGenitalMShaftLengthChange}
        genitalMShaftThickness={genitalMShaftThickness}
        onGenitalMShaftThicknessChange={handleGenitalMShaftThicknessChange}
        genitalMPinkSize={genitalMPinkSize}
        onGenitalMPinkSizeChange={handleGenitalMPinkSizeChange}
        genitalFSize={genitalFSize}
        onGenitalFSizeChange={handleGenitalFSizeChange}
        voxelDensity={voxelDensity}
        onVoxelDensityChange={handleVoxelDensityChange}
        voxelShape={voxelShape}
        onVoxelShapeChange={handleVoxelShapeChange}
        onSpawnPaloRod={handleSpawnPaloRod}
        hairType={hairType}
        hairColorHex={hairColorHex}
        onHairTypeChange={handleHairTypeChange}
        onHairColorChange={handleHairColorChange}
        beardType={beardType}
        beardColorHex={beardColorHex}
        onBeardTypeChange={handleBeardTypeChange}
        onBeardColorChange={handleBeardColorChange}
        hatType={hatType}
        hatColorHex={hatColorHex}
        onHatTypeChange={handleHatTypeChange}
        onHatColorChange={handleHatColorChange}
        glassesType={glassesType}
        glassesColorHex={glassesColorHex}
        onGlassesTypeChange={handleGlassesTypeChange}
        onGlassesColorChange={handleGlassesColorChange}
        pubicHairEnabled={pubicHairEnabled}
        onPubicHairEnabledChange={handlePubicHairEnabledChange}
        pubicHairIntensity={pubicHairIntensity}
        onPubicHairIntensityChange={handlePubicHairIntensityChange}
        bodyCubicity={bodyCubicity}
        onBodyCubicityChange={handleBodyCubicityChange}
        limbSizeMultiplier={limbSizeMultiplier}
        onLimbSizeMultiplierChange={handleLimbSizeMultiplierChange}
        onUpdateSpecificLimbWidth={handleUpdateSpecificLimbWidth}
        onOpenMainMenu={() => setIsMainMenuOpen(true)}
        limbScreenPositions={avatarLimbScreenPositions}
        onToggleMuscleOverlay={handleToggleMuscleOverlay}
        isMultiplayer={isMultiplayer}
        multiplayerRoomName={multiplayerRoomName}
        multiplayerPlayerCount={multiplayerPlayerCount}
      />

      {/* Modal Visor de Código de Proporciones del Cuerpo */}
      {proportionsCodeText && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl shadow-2xl max-w-lg w-full p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">📋</span>
                <span className="text-sm font-black text-cyan-300 uppercase tracking-wide">
                  Código de Proporciones
                </span>
              </div>
              <button
                onClick={() => setProportionsCodeText(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Aquí tienes el código completo con las proporciones de todas las extremidades modificadas. Cópialo para enviármelo:
            </p>

            <textarea
              readOnly
              value={proportionsCodeText}
              className="w-full h-48 bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-cyan-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 overflow-y-auto"
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(proportionsCodeText);
                  setToastMessage("¡Código copiado!");
                  setTimeout(() => setToastMessage(null), 2000);
                }}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>📋</span>
                <span>Copiar Todo el Código</span>
              </button>
              <button
                onClick={() => setProportionsCodeText(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl active:scale-95 transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Menu & Server List Modal */}
      <GameMenuModal
        isOpen={isMainMenuOpen}
        onStartSingleplayer={handleStartSingleplayer}
        onJoinMultiplayer={handleJoinMultiplayer}
        currentMapId={activeMapId}
        onOpenAvatarEditor={() => handleToggleAvatarEditor(true)}
      />

      {/* Voice button removed per user request */}
      {false ? (
        <div 
          className="absolute top-20 right-4 sm:right-6 max-h-[78vh] w-80 sm:w-[360px] z-40 p-4 rounded-2xl bg-slate-950/95 border border-rose-500/60 shadow-2xl backdrop-blur-md flex flex-col gap-3 pointer-events-auto select-none overflow-y-auto animate-in fade-in slide-in-from-right-4 duration-250"
          id="speech-lab-panel"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl animate-pulse">🗣️</span>
              <div className="flex flex-col">
                <span className="text-xs font-black text-rose-300 uppercase tracking-wide">
                  Voz Humana 100% Offline
                </span>
                <span className="text-[9px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                  <span>●</span> 0 APIs • 100% Local • Síntesis Acústica DSP
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsVoiceLabOpen(false)}
              className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center text-xs transition-all active:scale-90"
              title="Minimizar panel"
            >
              ✕
            </button>
          </div>

          {/* Real-time Phonetic & Vocal Tract Oscilloscope */}
          <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800/80 flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[8px] uppercase text-slate-400 font-bold tracking-wider">Fonema Activo</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-mono font-black text-rose-400 tracking-widest min-h-[28px] flex items-center">
                  {activePhonemeViz ? `[ ${activePhonemeViz} ]` : '[ Reposo ]'}
                </span>
              </div>
            </div>

            {/* Simulated Vocal Tract Oscilloscope */}
            <div className="flex items-center gap-1 h-8 w-28 px-1 justify-center bg-slate-950 rounded-lg border border-slate-800/60 overflow-hidden">
              {[...Array(6)].map((_, j) => {
                const isActive = !!activePhonemeViz;
                return (
                  <div 
                    key={j}
                    className="w-1.5 bg-gradient-to-t from-rose-600 to-amber-400 rounded-full transition-all duration-75"
                    style={{
                      height: isActive 
                        ? `${Math.max(15, Math.floor(Math.random() * 100))}%` 
                        : '15%'
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Test Voice Button */}
          <button
            onClick={handleTestVoice}
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span>🔊 Probar Voz Humana Offline</span>
          </button>

          {/* Preset Selectors */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase text-slate-400 font-black tracking-wide">Modelos Vocales Acústicos (Sin Internet / Sin APIs)</span>
            <div className="grid grid-cols-2 gap-1.5">
              {humanSpeechEngine.PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectVoicePreset(p.id)}
                  className={`py-2 px-2 rounded-xl text-[10px] font-bold text-left border transition-all active:scale-95 flex flex-col gap-0.5 ${
                    voicePreset === p.id 
                      ? 'bg-rose-950/60 text-rose-200 border-rose-500/70 shadow-inner'
                      : 'bg-slate-900/80 text-slate-300 border-slate-800/80 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span className="font-black text-rose-300">{p.name}</span>
                  <span className="text-[8px] text-slate-400 truncate">{p.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Voice Tone Parameters Sliders */}
          <div className="flex flex-col gap-2.5 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/40">
            {/* Pitch Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-300 font-bold uppercase">Tono Fundamental (F0)</span>
                <span className="font-mono text-rose-300 font-black">{voicePitch} Hz</span>
              </div>
              <input 
                type="range"
                min="70"
                max="260"
                value={voicePitch}
                onChange={(e) => handleVoicePitchChange(parseInt(e.target.value))}
                className="w-full h-1.5 accent-rose-500 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Speed Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-300 font-bold uppercase">Velocidad de Habla</span>
                <span className="font-mono text-rose-300 font-black">{voiceSpeed.toFixed(2)}x</span>
              </div>
              <input 
                type="range"
                min="0.6"
                max="1.8"
                step="0.05"
                value={voiceSpeed}
                onChange={(e) => handleVoiceSpeedChange(parseFloat(e.target.value))}
                className="w-full h-1.5 accent-rose-500 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Chest Warmth Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-300 font-bold uppercase">Calidez / Resonancia Torácica</span>
                <span className="font-mono text-rose-300 font-black">{Math.round(voiceWarmth * 100)}%</span>
              </div>
              <input 
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={voiceWarmth}
                onChange={(e) => handleVoiceWarmthChange(parseFloat(e.target.value))}
                className="w-full h-1.5 accent-rose-500 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Breathiness / Aspiration Turbulence */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-300 font-bold uppercase">Textura de Aire (Respiración Humana)</span>
                <span className="font-mono text-rose-300 font-black">{Math.round(voiceBreathiness * 100)}%</span>
              </div>
              <input 
                type="range"
                min="0.0"
                max="0.8"
                step="0.05"
                value={voiceBreathiness}
                onChange={(e) => handleVoiceBreathinessChange(parseFloat(e.target.value))}
                className="w-full h-1.5 accent-rose-500 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Trill R Strength Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-300 font-bold uppercase">Trino de R (Doble R Española)</span>
                <span className="font-mono text-rose-300 font-black">{Math.round(voiceTrillStrength * 100)}%</span>
              </div>
              <input 
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={voiceTrillStrength}
                onChange={(e) => handleVoiceTrillStrengthChange(parseFloat(e.target.value))}
                className="w-full h-1.5 accent-rose-500 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Interactive Custom Text Synthesizer */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] uppercase text-slate-400 font-black tracking-wide">Pronunciar Frase Personalizada</span>
            <div className="flex gap-1.5">
              <input 
                type="text"
                placeholder="Escribe en español (ej: ¡Hola amigo, cómo va!)..."
                className="flex-1 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-rose-500/80 rounded-xl px-3 py-2 text-xs text-rose-50 font-medium placeholder-slate-500 focus:outline-none focus:ring-0 select-text pointer-events-auto"
                id="custom-voice-input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const text = (e.currentTarget as HTMLInputElement).value.trim();
                    if (text) {
                      setSpeechText(text);
                      proceduralSpeak(text);
                    }
                  }
                }}
              />
              <button
                onClick={() => {
                  const el = document.getElementById('custom-voice-input') as HTMLInputElement;
                  const text = el?.value.trim();
                  if (text) {
                    setSpeechText(text);
                    proceduralSpeak(text);
                  } else {
                    setSpeechText("Escribe algo en la caja.");
                    proceduralSpeak("Escribe algo en la caja.");
                  }
                }}
                className="px-3.5 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1 flex-shrink-0"
              >
                <span>🗣️</span>
                <span>Hablar</span>
              </button>
            </div>
          </div>

          {/* Phonetic Phrases Explorer Carousel */}
          <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-800/60">
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase text-slate-400 font-black tracking-wide">Pruebas Fonéticas (A-Z)</span>
              <button
                onClick={() => handleNextSpeechPhrase()}
                className="text-[8px] font-black uppercase text-rose-400 hover:text-rose-300 transition-all"
              >
                Siguiente frase ➔
              </button>
            </div>
            
            <div className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-1">
              {[
                { label: "🚗 R con R Cigarro (Especial Trinos)", phrase: "Rápidas ruedas corren por la carretera." },
                { label: "👶 Niños comiendo Ñoquis (Especial Ñ)", phrase: "Niños y niñas comen ñoquis con cariño." },
                { label: "🐅 Tres tristes tigres (Especial Plosivos)", phrase: "Tengo tres tigres tristes en el trigal." },
                { label: "🍕 Queso quemado (Especial C/Q/K)", phrase: "Queso quemado de calidad querida." },
                { label: "👋 Saludo & Pregunta (Especial Entonación)", phrase: "¡Hola a todos! ¿Qué tal estás hoy?" }
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSpeechText(item.phrase);
                    handleSendChatMessage(item.phrase, 'player', undefined, true);
                  }}
                  className="w-full text-left p-1.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/60 hover:border-slate-700/80 rounded-lg text-[9px] font-bold text-slate-300 hover:text-rose-100 transition-all flex items-center justify-between"
                >
                  <span className="truncate">{item.label}</span>
                  <span className="text-[8px] text-rose-400 select-none">▶</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {/* Proximity Voxel Block Inspector HUD (5s countdown properties) */}
      <BlockInspectorHUD info={inspectedBlock} cameraRef={cameraRef} />

      {/* 3D 3x3 Division Block HUD (Estado del Bloque: 1-100%) */}
      {activeElectroCube && (
        <ElectroCubeHUD
          cube={activeElectroCube}
          cameraRef={cameraRef}
          onBlockStateChange={(val) => {
            if (activeElectroCube && engineRef.current) {
              engineRef.current.setElectroCubeProperties(
                activeElectroCube.id,
                val
              );
              setActiveElectroCube({ ...activeElectroCube, blockState: val, hardness: val, viscosity: val });
            }
          }}
          onClose={() => setActiveElectroCube(null)}
        />
      )}

      {/* Interactive In-Game Chat & Ragdoll Dialogue Modal */}
      <GameChat
        isOpen={isChatOpen}
        onToggleOpen={() => setIsChatOpen(!isChatOpen)}
        messages={chatMessages}
        onSendMessage={handleSendChatMessage}
        ragdollList={
          engineRef.current
            ? engineRef.current.ragdolls.map((r) => ({
                id: r.id,
                name: r.name || (r.isControlled ? 'Mi Personaje' : 'Ragdoll'),
                isControlled: r.isControlled,
              }))
            : []
        }
        selectedSpeakerType={selectedSpeakerType}
        selectedRagdollId={selectedRagdollId}
        onSelectSpeaker={(type, ragdollId) => {
          setSelectedSpeakerType(type);
          setSelectedRagdollId(ragdollId);
        }}
        ttsEnabled={chatTtsEnabled}
        onToggleTts={() => setChatTtsEnabled(!chatTtsEnabled)}
        onClearMessages={() => setChatMessages([])}
        isMultiplayer={isMultiplayer}
        voicePreset={voicePreset}
        onSelectVoicePreset={handleSelectVoicePreset}
        onTriggerEmote={handleTriggerEmote}
      />

      {/* Pantalla de Carga Blanca - Aviso Profesional e Inicialización */}
      {isResourceLoading && (
        <div className="fixed inset-0 z-[99999] bg-white flex flex-col items-center justify-center p-6 select-none font-sans text-slate-800 transition-opacity duration-500">
          <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center space-y-6">
            
            {/* Header Icon & Brand - Styled like the game menu */}
            <div className="flex flex-col items-center gap-2">
              <span 
                className="text-[2.2rem] sm:text-[2.6rem] font-black text-pink-400 tracking-wider select-none" 
                style={{ 
                  WebkitTextStroke: '1.5px #fbcfe8', 
                  textShadow: '3px 3px 0px #db2777, -1px -1px 0 #fdf2f8, 0 0 10px rgba(219, 39, 119, 0.4)' 
                }}
              >
                Suburbia
              </span>
            </div>

            {/* Cuadro vacío con marco negro para futuro dibujo */}
            <div 
              id="future-drawing-canvas-frame"
              className="w-48 h-48 sm:w-56 sm:h-56 bg-zinc-50 border-[6px] border-black flex items-center justify-center shadow-inner relative overflow-hidden"
            >
              {/* Espacio vacío para futuro dibujo */}
            </div>

            {/* Prominent "cargando..." with blinking indicator (Saca porcentaje de carga) */}
            <div className="w-full pt-1">
              <div className="flex items-center justify-center bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl gap-2.5">
                <div className="animate-[pulse_1s_infinite] flex items-center justify-center">
                  <Loader2 className="w-4.5 h-4.5 animate-spin text-slate-900" />
                </div>
                <span className="text-sm font-black tracking-wider text-slate-900 uppercase flex items-center gap-2 animate-[pulse_1s_infinite]">
                  cargando...
                </span>
              </div>
            </div>

          </div>

          {/* Descripción abajo de cuadro en forma profesional */}
          <p className="mt-6 max-w-xs sm:max-w-md text-xs font-semibold text-slate-500 leading-relaxed text-center px-4">
            Nota: Es completamente normal que el simulador experimente pausas temporales o breves congelamientos durante la inicialización. Este proceso puede tardar desde unos segundos hasta un par de minutos según el dispositivo.
          </p>
        </div>
      )}
    </div>
  );
};
