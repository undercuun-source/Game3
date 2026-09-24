export interface RemotePlayerState {
  id: string;
  name: string;
  mapId: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  facingAngle?: number;
  skinColorHex?: number;
  shirtColorHex?: number;
  pantsColorHex?: number;
  hasShirt?: boolean;
  hasPants?: boolean;
  hairType?: string;
  hairColorHex?: number;
  genitalType?: string;
  hasBustAndGlutes?: boolean;
  isShooting?: boolean;
  weaponType?: string;
  health?: number;
  isAlive?: boolean;
  lastUpdate: number;
  avatarConfig?: {
    skinColorHex?: number;
    hasShirt?: boolean;
    shirtColorHex?: number;
    hasPants?: boolean;
    pantsColorHex?: number;
    genitalType?: string;
    hasBustAndGlutes?: boolean;
  };
}

export interface MultiplayerClientCallbacks {
  onInit?: (playerId: string, roomName: string, mapId: string, existingPlayers: RemotePlayerState[]) => void;
  onPlayerJoined?: (player: RemotePlayerState) => void;
  onPlayerUpdated?: (playerId: string, state: RemotePlayerState) => void;
  onPlayerLeft?: (playerId: string) => void;
  onPlayerShot?: (playerId: string, origin: { x: number; y: number; z: number }, direction: { x: number; y: number; z: number }, weaponType: string) => void;
  onPropSpawned?: (playerId: string, propType: string, position: { x: number; y: number; z: number }) => void;
  onChatMessage?: (sender: string, message: string, playerId?: string, speakerType?: string, targetRagdollId?: string) => void;
  onStatusChange?: (connected: boolean, pingMs: number) => void;
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private localPlayerId: string | null = null;
  private isConnected: boolean = false;
  private roomId: string = 'server-1';
  private playerName: string = 'Jugador';
  private callbacks: MultiplayerClientCallbacks = {};
  private lastSendTime: number = 0;
  private pingInterval: any = null;
  private reconnectTimer: any = null;
  private isIntentionallyClosed: boolean = false;

  private sendIntervalMs: number = 16;

  constructor(callbacks: MultiplayerClientCallbacks) {
    this.callbacks = callbacks;
    this.updateFpsInterval();
    if (typeof window !== 'undefined') {
      window.addEventListener('gorebox_fps_change', (e: any) => {
        this.updateFpsInterval(e.detail);
      });
    }
  }

  public updateFpsInterval(limit?: string) {
    const fps = limit || (typeof localStorage !== 'undefined' ? localStorage.getItem('gorebox_fps_limit') : '60') || '60';
    if (fps === '30') this.sendIntervalMs = 33;
    else if (fps === '60') this.sendIntervalMs = 16;
    else if (fps === '90') this.sendIntervalMs = 11;
    else if (fps === '120') this.sendIntervalMs = 8;
    else this.sendIntervalMs = 16;
  }

  public connect(roomId: string, playerName: string) {
    this.roomId = roomId;
    this.playerName = playerName;
    this.isIntentionallyClosed = false;

    this.cleanupSocket();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws?roomId=${encodeURIComponent(roomId)}&playerName=${encodeURIComponent(playerName)}`;

    try {
      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        if (this.ws !== socket) return;
        this.isConnected = true;
        this.callbacks.onStatusChange?.(true, 15);
      };

      socket.onmessage = (event) => {
        if (this.ws !== socket) return;
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (e) {
          console.error('[Multiplayer WS] Parse error:', e);
        }
      };

      socket.onclose = () => {
        if (this.ws !== socket) return;
        this.isConnected = false;
        this.callbacks.onStatusChange?.(false, 0);

        if (!this.isIntentionallyClosed) {
          this.scheduleReconnect();
        }
      };

      socket.onerror = () => {
        if (this.ws !== socket) return;
        this.isConnected = false;
        this.callbacks.onStatusChange?.(false, 0);
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.isIntentionallyClosed || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isIntentionallyClosed) {
        this.connect(this.roomId, this.playerName);
      }
    }, 2000);
  }

  private cleanupSocket() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.close();
      } catch {
        // Ignore
      }
      this.ws = null;
    }
  }

  private handleMessage(data: any) {
    switch (data.type) {
      case 'INIT':
        this.localPlayerId = data.playerId;
        this.callbacks.onInit?.(data.playerId, data.roomName, data.mapId, data.existingPlayers || []);
        break;

      case 'PLAYER_JOINED':
        if (data.player && data.player.id !== this.localPlayerId) {
          this.callbacks.onPlayerJoined?.(data.player);
        }
        break;

      case 'PLAYER_UPDATED':
        if (data.playerId && data.playerId !== this.localPlayerId) {
          this.callbacks.onPlayerUpdated?.(data.playerId, data.state);
        }
        break;

      case 'PLAYER_LEFT':
        if (data.playerId) {
          this.callbacks.onPlayerLeft?.(data.playerId);
        }
        break;

      case 'PLAYER_SHOT':
        if (data.playerId !== this.localPlayerId) {
          this.callbacks.onPlayerShot?.(data.playerId, data.origin, data.direction, data.weaponType);
        }
        break;

      case 'PROP_SPAWNED':
        if (data.playerId !== this.localPlayerId) {
          this.callbacks.onPropSpawned?.(data.playerId, data.propType, data.position);
        }
        break;

      case 'CHAT_MESSAGE':
        this.callbacks.onChatMessage?.(
          data.sender,
          data.message,
          data.playerId,
          data.speakerType,
          data.targetRagdollId
        );
        break;
    }
  }

  public sendPosition(
    x: number,
    y: number,
    z: number,
    rotY: number,
    extra: {
      skinColorHex?: number;
      shirtColorHex?: number;
      pantsColorHex?: number;
      hairType?: string;
      hairColorHex?: number;
      isShooting?: boolean;
      weaponType?: string;
      health?: number;
      isAlive?: boolean;
    } = {}
  ) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const now = Date.now();
    // Cap position broadcasts based on user configured FPS rate (fluid network sync)
    if (now - this.lastSendTime < this.sendIntervalMs - 1) return;
    this.lastSendTime = now;

    this.ws.send(
      JSON.stringify({
        type: 'UPDATE_STATE',
        state: {
          x,
          y,
          z,
          rotY,
          ...extra,
        },
      })
    );
  }

  public sendShot(origin: { x: number; y: number; z: number }, direction: { x: number; y: number; z: number }, weaponType: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        type: 'SHOOT',
        origin,
        direction,
        weaponType,
      })
    );
  }

  public sendSpawnProp(propType: string, position: { x: number; y: number; z: number }) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        type: 'SPAWN_PROP',
        propType,
        position,
      })
    );
  }

  public sendChat(message: string, speakerType: string = 'player', targetRagdollId?: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        type: 'CHAT',
        message,
        speakerType,
        targetRagdollId,
      })
    );
  }

  public getLocalPlayerId(): string | null {
    return this.localPlayerId;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public disconnect() {
    this.isIntentionallyClosed = true;
    this.cleanupSocket();
    this.isConnected = false;
  }
}
