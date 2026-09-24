import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Trash2, Volume2, VolumeX, ChevronDown, ChevronUp } from 'lucide-react';
import { ChatMessage, SpeakerType } from '../types/chat';

interface GameChatProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  messages: ChatMessage[];
  onSendMessage: (
    text: string,
    speakerType: SpeakerType,
    targetRagdollId?: string,
    speakAudio?: boolean
  ) => void;
  ragdollList: { id: string; name: string; isControlled?: boolean }[];
  selectedSpeakerType: SpeakerType;
  selectedRagdollId?: string;
  onSelectSpeaker: (type: SpeakerType, ragdollId?: string) => void;
  ttsEnabled: boolean;
  onToggleTts: () => void;
  onClearMessages: () => void;
  isMultiplayer?: boolean;
  voicePreset: string;
  onSelectVoicePreset: (presetId: string) => void;
  onTriggerEmote?: (emote: string | null) => void;
}

export const GameChat: React.FC<GameChatProps> = ({
  isOpen,
  onToggleOpen,
  messages,
  onSendMessage,
  ragdollList,
  selectedSpeakerType,
  selectedRagdollId,
  onSelectSpeaker,
  ttsEnabled,
  onToggleTts,
  onClearMessages,
  isMultiplayer = false,
  voicePreset,
  onSelectVoicePreset,
  onTriggerEmote,
}) => {
  const [inputText, setInputText] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [showEmotePicker, setShowEmotePicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll message list to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isMinimized]);

  // Global key listener for 'Enter' or '/' to focus chat input
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // If typing in an input element already, don't intercept unless Escape
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      if (e.key === 'Enter' || e.key === '/') {
        e.preventDefault();
        setIsMinimized(false);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 30);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    // Roblox Chat Command Parsing:
    // Match commands like /normal, /aguda, /grave, /robotica, /baile, /baile1, /e dance
    const commandMatch = trimmed.match(/^\/([a-zA-Z0-9_]+)\s*(.*)/);
    if (commandMatch) {
      const command = commandMatch[1].toLowerCase();
      const restOfText = commandMatch[2].trim();

      const validPresets = ['normal', 'aguda', 'grave', 'robotica'];
      if (validPresets.includes(command)) {
        onSelectVoicePreset(command);
        if (restOfText) {
          onSendMessage(
            restOfText,
            selectedSpeakerType,
            selectedRagdollId,
            true // force speech synthesis
          );
        }
        setInputText('');
        return;
      }

      if (['baile', 'baile1', 'dance', 'dance1', 'e'].includes(command)) {
        if (onTriggerEmote) {
          onTriggerEmote('baile1');
        }
        onSendMessage(
          '🕺 [Emote: Baile 1]',
          selectedSpeakerType,
          selectedRagdollId,
          false
        );
        setInputText('');
        return;
      }
    }

    onSendMessage(
      trimmed,
      selectedSpeakerType,
      selectedRagdollId,
      ttsEnabled
    );

    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      inputRef.current?.blur();
    }
  };

  const getSpeakerBadgeColor = (type: SpeakerType) => {
    if (type === 'player') return 'text-emerald-400 font-bold';
    if (type === 'ragdoll') return 'text-amber-400 font-bold';
    return 'text-sky-400 font-bold';
  };

  if (!isOpen) return null;

  return (
    <div
      id="roblox-style-chat"
      className="absolute top-3 left-3 sm:top-4 sm:left-4 z-50 flex flex-col w-[320px] max-w-[88vw] pointer-events-auto select-none font-sans"
    >
      {/* Roblox-Style Chat Container */}
      <div className="bg-black/65 backdrop-blur-md border border-white/15 rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200">
        
        {/* Chat Header Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-black/40 border-b border-white/10 text-xs font-black text-white/90">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span className="tracking-wide">CHAT DE JUEGO</span>
            {isMultiplayer && (
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 rounded-full">
                ONLINE
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Voice Speech Toggle */}
            <button
              onClick={onToggleTts}
              className={`p-1 rounded transition-colors ${
                ttsEnabled ? 'text-emerald-400 hover:text-emerald-300' : 'text-zinc-500 hover:text-zinc-400'
              }`}
              title={ttsEnabled ? 'Voz sintética activa' : 'Voz desactivada'}
            >
              {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Clear History */}
            <button
              onClick={onClearMessages}
              className="p-1 text-zinc-400 hover:text-rose-400 transition-colors"
              title="Limpiar chat"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Minimize / Expand */}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 text-zinc-400 hover:text-white transition-colors"
              title={isMinimized ? 'Expandir chat' : 'Minimizar chat'}
            >
              {isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>

            {/* Close Chat Button */}
            <button
              onClick={onToggleOpen}
              className="p-1 text-zinc-400 hover:text-white transition-colors ml-1 bg-white/10 rounded-md hover:bg-white/20 text-[10px] px-1.5 font-bold"
              title="Cerrar Chat"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Message History Feed */}
        {!isMinimized && (
          <div
            ref={scrollRef}
            className="h-[110px] max-h-[22vh] overflow-y-auto px-2.5 py-1.5 flex flex-col gap-1 text-[11px] text-zinc-200 scrollbar-thin scrollbar-thumb-white/20"
          >
            {messages.length === 0 ? (
              <div className="text-[10px] text-zinc-500 italic py-1">
                Escribe un mensaje o presiona Enter para chatear. Usa /aguda, /grave, /robotica, /normal para cambiar voz.
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="leading-snug break-words bg-black/20 px-2 py-0.5 rounded border border-white/5">
                  <span className={getSpeakerBadgeColor(msg.speakerType)}>
                    [{msg.senderName}]:{' '}
                  </span>
                  <span className="text-zinc-100 font-medium">{msg.text}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Input Bar */}
        <div className="p-1 bg-black/50 border-t border-white/10 flex items-center gap-1">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsMinimized(false)}
            placeholder="Mensaje... [Enter]"
            className="flex-1 bg-white/10 border border-white/15 focus:border-emerald-400/80 rounded-lg px-2 py-1 text-[11px] text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-400/50 select-text"
          />
          {onTriggerEmote && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmotePicker(!showEmotePicker)}
                className="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow flex items-center gap-1 shrink-0 cursor-pointer"
                title="Elegir Emotes"
              >
                <span>🕺</span>
                <span>Emotes</span>
              </button>
              {showEmotePicker && (
                <div className="absolute bottom-9 right-0 w-32 bg-slate-950/95 border border-purple-500/50 rounded-xl p-1 shadow-2xl flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      onTriggerEmote('baile1');
                      setShowEmotePicker(false);
                      onSendMessage('🕺 [Emote: Baile 1]', selectedSpeakerType, selectedRagdollId, false);
                    }}
                    className="flex items-center gap-1.5 w-full px-2 py-1 hover:bg-purple-900/50 text-white rounded-lg text-[10px] font-bold text-left transition-colors cursor-pointer"
                  >
                    <span>🕺</span>
                    <span>Baile 1</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onTriggerEmote('baile2');
                      setShowEmotePicker(false);
                      onSendMessage('💃 [Emote: Baile 2]', selectedSpeakerType, selectedRagdollId, false);
                    }}
                    className="flex items-center gap-1.5 w-full px-2 py-1 hover:bg-pink-900/50 text-white rounded-lg text-[10px] font-bold text-left transition-colors cursor-pointer"
                  >
                    <span>💃</span>
                    <span>Baile 2</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onTriggerEmote('saludo');
                      setShowEmotePicker(false);
                      onSendMessage('🙋 [Emote: Saludo]', selectedSpeakerType, selectedRagdollId, false);
                    }}
                    className="flex items-center gap-1.5 w-full px-2 py-1 hover:bg-sky-900/50 text-white rounded-lg text-[10px] font-bold text-left transition-colors cursor-pointer"
                  >
                    <span>🙋</span>
                    <span>Saludo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onTriggerEmote(null);
                      setShowEmotePicker(false);
                      onSendMessage('🛑 [Detener Emote]', selectedSpeakerType, selectedRagdollId, false);
                    }}
                    className="flex items-center gap-1.5 w-full px-2 py-1 hover:bg-rose-900/50 text-rose-300 rounded-lg text-[10px] font-bold text-left transition-colors cursor-pointer border-t border-white/5"
                  >
                    <span>🛑</span>
                    <span>Detener</span>
                  </button>
                </div>
              )}
            </div>
          )}
          <button
            onClick={handleSend}
            className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors active:scale-95 shadow shrink-0"
            title="Enviar mensaje"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
