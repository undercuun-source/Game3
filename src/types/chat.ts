export type SpeakerType = 'player' | 'ragdoll' | 'remote' | 'system';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  speakerType: SpeakerType;
  targetRagdollId?: string;
  text: string;
  timestamp: number;
  color?: string;
  isCustomRagdoll?: boolean;
}

export interface OverheadBubble {
  id: string;
  speakerId: string;
  speakerType: SpeakerType;
  speakerName: string;
  text: string;
  color: string;
  timestamp: number;
  expiresAt: number;
  // Screen projection state updated per frame
  screenX?: number;
  screenY?: number;
  scale?: number;
  visible?: boolean;
}

export interface QuickPhraseCategory {
  category: string;
  icon: string;
  phrases: string[];
}

export const QUICK_CHAT_PRESETS: QuickPhraseCategory[] = [
  {
    category: 'Saludos & Charla',
    icon: '👋',
    phrases: [
      '¡Hola a todos!',
      '¿Quién anda por ahí?',
      '¡Buenos días!',
      '¡Miren lo que puedo hacer!',
      '¡Qué buen lugar para experimentar!',
    ],
  },
  {
    category: 'Acción & Combate',
    icon: '⚔️',
    phrases: [
      '¡Cuidado con el retroceso!',
      '¡Alto el fuego!',
      '¡No dispares a los muñecos!',
      '¡A cubierto todos!',
      '¡A la carga con todo!',
      '¡Retirada táctica!',
    ],
  },
  {
    category: 'Reacciones Ragdoll',
    icon: '💥',
    phrases: [
      '¡Auch, mis huesos de gelatina!',
      '¡Eso me dolió hasta el alma!',
      '¡No siento los brazos!',
      '¡Qué golpe tan espectacular!',
      '¡Alguien que me ayude a pararme!',
      '¡Vuelo por los aires!',
    ],
  },
  {
    category: 'Burlas & Cómico',
    icon: '😂',
    phrases: [
      '¡A ver si me alcanzas!',
      '¡Eso ni me hizo cosquillas!',
      '¡Soy indestructible, mírame!',
      '¡Buen tiro, pero sigo vivo!',
      '¡Vaya física tan realista!',
    ],
  },
];
