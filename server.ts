import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { safeGetDoc, safeSetDoc, safeGetDocs } from './src/db/index.ts';

async function ensureAdminsInDb() {
  console.log('Database initialized. User accounts are created upon user registration/login.');
}

interface PlayerState {
  id: string;
  name: string;
  mapId: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  skinColorHex?: number;
  shirtColorHex?: number;
  pantsColorHex?: number;
  hairType?: string;
  hairColorHex?: number;
  isShooting?: boolean;
  weaponType?: string;
  health?: number;
  isAlive?: boolean;
  lastUpdate: number;
}

interface ServerRoom {
  id: string;
  name: string;
  mapId: string;
  maxPlayers: number;
  players: Map<string, { ws: WebSocket; state: PlayerState }>;
  previewImage?: string;
  bot?: BotPlayer;
  ownerName?: string;
  pendingApproval?: boolean;
  approvedBy?: string;
  approvedByPrivateKey?: string;
}

interface BotPlayer {
  id: string;
  state: PlayerState;
  targetX: number;
  targetZ: number;
  targetYaw: number;
  speed: number;
  lastChatTime: number;
  lastGreetPlayerId: string;
  respawnTimer: number;
  shootCooldown: number;
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);

  app.use(express.json());

  // Active Multiplayer Rooms
  const rooms: Record<string, ServerRoom> = {
    'server-1': {
      id: 'server-1',
      name: 'Default Server',
      mapId: 'cesped2',
      maxPlayers: 16,
      players: new Map(),
    },
  };

  interface PendingServer {
    id: string;
    name: string;
    mapId: string;
    maxPlayers: number;
    previewImage: string;
    ownerName: string;
    createdAt: string;
  }

  const pendingServers: Record<string, PendingServer> = {};

  // Firebase Firestore Database Endpoints for User Accounts and Data Storage with robust local fallback
  app.get('/api/vps/users', async (_req, res) => {
    try {
      const docs = await safeGetDocs();
      const list = docs.map((acc: any) => {
        return {
          name: acc.username || acc.name,
          level: acc.level || 1,
          money: acc.money || 0,
          status: acc.status || 'ONLINE',
          icon: acc.icon || '👤',
          isVerified18: !!acc.isVerified18,
          skinPreset: acc.skinPreset || 'normal',
          skinColor: acc.skinColor || '#e0a96d',
          faceStyle: acc.faceStyle || 'classic',
          headScale: acc.headScale || 1.0,
        };
      });
      return res.json({ users: list });
    } catch (e) {
      console.error('get users error:', e);
      return res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/vps/register', async (req, res) => {
    const { username, password, email, createdAt } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    const cleanName = username.trim();
    const key = cleanName.toLowerCase();

    if (key === 'xrency' && password !== 'baughborxd') {
      return res.status(400).json({ error: 'Contraseña de administrador incorrecta para xrency. Debe ser baughborxd' });
    }

    const incomingCreatedAtStr = createdAt || new Date().toISOString();

    const newUser = {
      userId: key,
      username: cleanName,
      password,
      email: email || '',
      money: 0,
      level: 1,
      status: 'ONLINE',
      icon: key === 'xrency' ? '👑' : '👤',
      skinPreset: 'normal',
      skinColor: '#e0a96d',
      faceStyle: 'classic',
      headScale: 1.0,
      unlockedItems: ['normal_skin', 'zombie_skin', 'blue_skin', 'classic_face', 'angry_face', 'anime_face'],
      isVerified18: false,
      verificationDate: null,
      updatedAt: new Date().toISOString(),
      createdAt: incomingCreatedAtStr,
      role: key === 'xrency' ? 'owner' : 'user',
    };

    try {
      const existingUser = await safeGetDoc(key);
      if (existingUser) {
        if (key === 'xrency' && password === 'baughborxd') {
          await safeSetDoc(key, newUser);
          return res.json({ success: true, user: newUser });
        }
        const existingCreatedAtStr = existingUser.createdAt || existingUser.updatedAt || new Date().toISOString();
        const existingTime = new Date(existingCreatedAtStr).getTime();
        const incomingTime = new Date(incomingCreatedAtStr).getTime();

        if (existingTime <= incomingTime) {
          // The existing user is older or equal. Prevent overriding it with a newer one.
          return res.status(400).json({ error: 'Username already exists' });
        } else {
          // The incoming account is older than the existing one on the server.
          // This means the existing one is newer (hijacked) and the incoming one is the authentic older one.
          // We delete/overwrite the newer one and register the older real one!
          await safeSetDoc(key, newUser);
          return res.json({ success: true, user: newUser });
        }
      }
      await safeSetDoc(key, newUser);
      return res.json({ success: true, user: newUser });
    } catch (e) {
      console.error('register error:', e);
      return res.status(500).json({ error: 'Database error' });
    }
  });

  app.get('/api/vps/admin/accounts', async (_req, res) => {
    try {
      const accounts = await safeGetDocs();
      return res.json({ accounts });
    } catch (e) {
      console.error('admin accounts error:', e);
      return res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/vps/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    const cleanName = username.trim();
    const key = cleanName.toLowerCase();

    try {
      const user = await safeGetDoc(key);
      if (!user) {
        return res.status(400).json({ error: 'Invalid username or password' });
      }
      if (user.password !== password) {
        return res.status(400).json({ error: 'Invalid username or password' });
      }
      // Update status to ONLINE on login
      user.status = 'ONLINE';
      
      // Handle staff/admin privateKey generation
      const isStaff = user.role === 'owner' || user.role === 'admin' || (user.level ?? 1) >= 50 || key === 'xrency';
      if (isStaff && !user.privateKey) {
        user.privateKey = `pk_${user.username.toLowerCase()}_${user.password || '123'}_gorebox_staff`;
      }
      
      user.updatedAt = new Date().toISOString();
      await safeSetDoc(key, user);
      
      const refreshedUser = await safeGetDoc(key);
      return res.json({ success: true, user: refreshedUser });
    } catch (e) {
      console.error('login error:', e);
      return res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/vps/logout', async (req, res) => {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }
    const key = username.trim().toLowerCase();
    try {
      const user = await safeGetDoc(key);
      if (user) {
        user.status = 'OFFLINE';
        user.updatedAt = new Date().toISOString();
        await safeSetDoc(key, user);
      }
      return res.json({ success: true });
    } catch (e) {
      console.error('logout error:', e);
      return res.status(500).json({ error: 'Database error' });
    }
  });

  app.get('/api/vps/user/:name', async (req, res) => {
    const cleanName = req.params.name.trim();
    const key = cleanName.toLowerCase();

    try {
      const user = await safeGetDoc(key);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.json({ user });
    } catch (e) {
      console.error('get user error:', e);
      return res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/vps/update', async (req, res) => {
    const { username, ...updates } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }
    const cleanName = username.trim();
    const key = cleanName.toLowerCase();

    try {
      const existingUser = await safeGetDoc(key);
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      const updatedUser = {
        ...existingUser,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await safeSetDoc(key, updatedUser);
      const finalUser = await safeGetDoc(key);
      return res.json({ success: true, user: finalUser });
    } catch (e) {
      console.error('update error:', e);
      return res.status(500).json({ error: 'Database error' });
    }
  });

  // API Routes
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.get('/api/servers', (req, res) => {
    const viewer = req.query.viewer ? String(req.query.viewer).trim().toLowerCase() : '';
    const list = Object.values(rooms).map((r: any) => {
      // If room has connected players and is default server, it also includes the interactive test bot
      const totalUsers = r.players.size + (r.bot ? 1 : (r.id === 'server-1' && r.players.size > 0 ? 1 : 0));
      return {
        id: r.id,
        name: r.name,
        mapId: r.mapId,
        maxPlayers: r.maxPlayers,
        playerCount: totalUsers,
        pingMs: Math.floor(12 + Math.random() * 10),
        status: 'ONLINE',
        previewImage: r.previewImage || '',
        ownerName: r.ownerName,
        pendingApproval: !!r.pendingApproval,
      };
    }).filter((r: any) => {
      // If server is pending approval, it is ONLY visible to its owner/viewer
      if (r.pendingApproval) {
        return r.ownerName && r.ownerName.trim().toLowerCase() === viewer;
      }
      return true;
    });
    res.json({ servers: list });
  });

  app.post('/api/servers/create', (req, res) => {
    const { name, mapId, maxPlayers, previewImage } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Server name required' });
    }
    const serverId = `server_${Date.now()}`;
    const newRoom: any = {
      id: serverId,
      name: name.trim(),
      mapId: mapId || 'cesped2',
      maxPlayers: maxPlayers || 16,
      players: new Map(),
      previewImage: previewImage || '',
      pendingApproval: false,
    };
    rooms[serverId] = newRoom;
    return res.json({
      success: true,
      server: {
        id: serverId,
        name: newRoom.name,
        mapId: newRoom.mapId,
        maxPlayers: newRoom.maxPlayers,
        playerCount: 0,
        pingMs: 15,
        status: 'ONLINE',
        previewImage: newRoom.previewImage,
      },
    });
  });

  app.get('/api/servers/pending', (_req, res) => {
    return res.json({ pendingServers: Object.values(pendingServers) });
  });

  app.post('/api/servers/publish-pending', async (req, res) => {
    const { name, mapId, ownerName, previewImage, maxPlayers } = req.body;
    if (!name || !ownerName) {
      return res.status(400).json({ error: 'Server name and owner name are required' });
    }
    const cleanServerName = name.trim();
    const cleanOwnerName = ownerName.trim();

    try {
      const userDoc = await safeGetDoc(cleanOwnerName);
      if (userDoc && Array.isArray(userDoc.servers)) {
        const existingServer = userDoc.servers.find((s: any) => s.name === cleanServerName);
        if (existingServer && existingServer.status === 'approved') {
          // Check if the admin who approved it is ONLINE
          const approver = existingServer.approvedBy || 'xrency';
          const approverDoc = await safeGetDoc(approver.toLowerCase());
          
          if (!approverDoc || approverDoc.status !== 'ONLINE') {
            return res.status(403).json({ 
              error: `El administrador '${approver}' que aprobó este servidor está DESCONECTADO de la web. Para poder publicarlo de forma directa sin permisos, el administrador aprobador debe estar conectado (ONLINE) con su Clave Privada.`
            });
          }

          // Active server room
          const serverId = `server_${Date.now()}`;
          const newRoom: any = {
            id: serverId,
            name: cleanServerName,
            mapId: mapId || 'cesped2',
            maxPlayers: maxPlayers || 16,
            players: new Map(),
            previewImage: previewImage || '',
            ownerName: cleanOwnerName,
            pendingApproval: false,
            approvedBy: approver,
            approvedByPrivateKey: existingServer.approvedByPrivateKey || ''
          };
          rooms[serverId] = newRoom;
          
          return res.json({ 
            success: true, 
            autoApproved: true, 
            message: `¡Servidor publicado! Aprobado anteriormente por ${approver} (ONLINE).`,
            server: {
              id: serverId,
              name: cleanServerName,
              mapId: newRoom.mapId,
              maxPlayers: newRoom.maxPlayers,
              playerCount: 0,
              pingMs: 15,
              status: 'ONLINE',
              previewImage: newRoom.previewImage,
              approvedBy: approver
            }
          });
        }
      }

      // Not previously approved, place in pending list
      const id = `pending_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      pendingServers[id] = {
        id,
        name: cleanServerName,
        mapId: mapId || 'cesped2',
        maxPlayers: maxPlayers || 16,
        previewImage: previewImage || '',
        ownerName: cleanOwnerName,
        createdAt: new Date().toISOString()
      };

      // Create pending room in memory
      const serverId = `server_${Date.now()}`;
      const newRoom: any = {
        id: serverId,
        name: cleanServerName,
        mapId: mapId || 'cesped2',
        maxPlayers: maxPlayers || 16,
        players: new Map(),
        previewImage: previewImage || '',
        ownerName: cleanOwnerName,
        pendingApproval: true,
      };
      rooms[serverId] = newRoom;

      if (userDoc) {
        const updatedServers = Array.isArray(userDoc.servers) ? [...userDoc.servers] : [];
        const idx = updatedServers.findIndex((s: any) => s.name === cleanServerName);
        const serverObj = {
          id,
          name: cleanServerName,
          mapId: mapId || 'cesped2',
          maxPlayers: maxPlayers || 16,
          previewImage: previewImage || '',
          status: 'pending',
        };
        if (idx >= 0) {
          updatedServers[idx].status = 'pending';
        } else {
          updatedServers.push(serverObj);
        }
        await safeSetDoc(cleanOwnerName, { ...userDoc, servers: updatedServers });
      }

      return res.json({ success: true, autoApproved: false, message: 'Server request submitted for approval' });
    } catch (e) {
      console.error('Publish pending error:', e);
      return res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/servers/approve', async (req, res) => {
    const { id, approvedBy, approvedByPrivateKey } = req.body;
    if (!id || !pendingServers[id]) {
      return res.status(404).json({ error: 'Pending server not found' });
    }
    const p = pendingServers[id];

    const approverName = approvedBy || 'xrency';
    const approverKey = approverName.toLowerCase();

    try {
      // Validate approving user
      const adminDoc = await safeGetDoc(approverKey);
      if (!adminDoc) {
        return res.status(403).json({ error: 'El usuario aprobador no existe en la base de datos' });
      }
      const isStaff = adminDoc.role === 'owner' || adminDoc.role === 'admin' || (adminDoc.level || 0) >= 50 || approverKey === 'xrency';
      if (!isStaff) {
        return res.status(403).json({ error: 'No tienes permisos de Administrador para aprobar servidores' });
      }

      // Check key
      let expectedPrivateKey = adminDoc.privateKey;
      if (!expectedPrivateKey) {
        expectedPrivateKey = `pk_${adminDoc.username.toLowerCase()}_${adminDoc.password || '123'}_gorebox_staff`;
        adminDoc.privateKey = expectedPrivateKey;
        await safeSetDoc(approverKey, adminDoc);
      }

      if (expectedPrivateKey !== approvedByPrivateKey) {
        return res.status(403).json({ error: 'Firma digital / Clave Privada inválida para el administrador.' });
      }

      // Find memory room and approve it
      let matchingRoom = Object.values(rooms).find((r: any) => r.name === p.name && r.ownerName === p.ownerName);
      if (matchingRoom) {
        (matchingRoom as any).pendingApproval = false;
        (matchingRoom as any).approvedBy = adminDoc.username;
        (matchingRoom as any).approvedByPrivateKey = expectedPrivateKey;
      } else {
        const serverId = `server_${Date.now()}`;
        matchingRoom = {
          id: serverId,
          name: p.name,
          mapId: p.mapId,
          maxPlayers: p.maxPlayers || 16,
          players: new Map(),
          previewImage: p.previewImage || '',
          ownerName: p.ownerName,
          pendingApproval: false,
          approvedBy: adminDoc.username,
          approvedByPrivateKey: expectedPrivateKey
        };
        rooms[serverId] = matchingRoom;
      }

      const userDoc = await safeGetDoc(p.ownerName);
      if (userDoc) {
        const updatedServers = Array.isArray(userDoc.servers) ? [...userDoc.servers] : [];
        const idx = updatedServers.findIndex((s: any) => s.name === p.name);
        const serverObj = {
          id: p.id,
          name: p.name,
          mapId: p.mapId,
          maxPlayers: p.maxPlayers || 16,
          previewImage: p.previewImage || '',
          status: 'approved',
          approvedBy: adminDoc.username,
          approvedByPrivateKey: expectedPrivateKey
        };
        if (idx >= 0) {
          updatedServers[idx] = serverObj;
        } else {
          updatedServers.push(serverObj);
        }
        await safeSetDoc(p.ownerName, { ...userDoc, servers: updatedServers });
      }

      delete pendingServers[id];
      return res.json({
        success: true,
        server: {
          id: (matchingRoom as any).id,
          name: (matchingRoom as any).name,
          mapId: (matchingRoom as any).mapId,
          maxPlayers: (matchingRoom as any).maxPlayers,
          playerCount: 0,
          pingMs: 15,
          status: 'ONLINE',
          previewImage: (matchingRoom as any).previewImage,
          approvedBy: adminDoc.username
        }
      });

    } catch (e) {
      console.error('Approve server error:', e);
      return res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/servers/reject', async (req, res) => {
    const { id } = req.body;
    if (!id || !pendingServers[id]) {
      return res.status(404).json({ error: 'Pending server not found' });
    }
    const p = pendingServers[id];

    try {
      const userDoc = await safeGetDoc(p.ownerName);
      if (userDoc) {
        const updatedServers = Array.isArray(userDoc.servers) ? [...userDoc.servers] : [];
        const idx = updatedServers.findIndex((s: any) => s.name === p.name);
        const serverObj = {
          id: p.id,
          name: p.name,
          mapId: p.mapId,
          maxPlayers: p.maxPlayers || 16,
          previewImage: p.previewImage || '',
          status: 'rejected',
        };
        if (idx >= 0) {
          updatedServers[idx] = serverObj;
        } else {
          updatedServers.push(serverObj);
        }
        await safeSetDoc(p.ownerName, { ...userDoc, servers: updatedServers });
      }
    } catch (e) {
      console.error('Save rejected server to db error:', e);
    }

    delete pendingServers[id];
    return res.json({ success: true });
  });

  app.post('/api/servers/revoke', async (req, res) => {
    const { ownerName, serverName } = req.body;
    if (!ownerName || !serverName) {
      return res.status(400).json({ error: 'Missing ownerName or serverName' });
    }
    const key = ownerName.trim().toLowerCase();
    try {
      const userDoc = await safeGetDoc(key);
      if (userDoc && Array.isArray(userDoc.servers)) {
        const idx = userDoc.servers.findIndex((s: any) => s.name === serverName);
        if (idx >= 0) {
          // Change approved status to pending or remove approval fields
          userDoc.servers[idx].status = 'pending';
          if (userDoc.servers[idx].approvedBy) delete userDoc.servers[idx].approvedBy;
          if (userDoc.servers[idx].approvedByPrivateKey) delete userDoc.servers[idx].approvedByPrivateKey;
          
          await safeSetDoc(key, userDoc);
          return res.json({ success: true, message: `Permiso de aprobación para '${serverName}' revocado.` });
        }
      }
      return res.status(404).json({ error: 'Server record not found under this user' });
    } catch (e) {
      console.error('Revoke server error:', e);
      return res.status(500).json({ error: 'Database error' });
    }
  });

  app.get('/api/servers/registry', async (_req, res) => {
    try {
      const docs = await safeGetDocs();
      const userStatusMap: Record<string, string> = {};
      for (const doc of docs) {
        const uName = (doc.username || doc.name || '').toLowerCase();
        if (uName) {
          userStatusMap[uName] = doc.status || 'OFFLINE';
        }
      }

      const registryList: any[] = [];
      for (const doc of docs) {
        if (Array.isArray(doc.servers)) {
          for (const s of doc.servers) {
            const approver = (s.approvedBy || '').toLowerCase();
            registryList.push({
              ...s,
              ownerName: doc.username || doc.name,
              isApproverOnline: approver ? (userStatusMap[approver] === 'ONLINE') : false
            });
          }
        }
      }
      return res.json({ servers: registryList });
    } catch (e) {
      console.error('Get registry error:', e);
      return res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/servers/revoke', async (req, res) => {
    const { ownerName, serverName } = req.body;
    if (!ownerName || !serverName) {
      return res.status(400).json({ error: 'Owner name and server name are required' });
    }
    const cleanOwnerName = ownerName.trim();
    const cleanServerName = serverName.trim();
    try {
      const userDoc = await safeGetDoc(cleanOwnerName);
      if (!userDoc) {
        return res.status(404).json({ error: 'Owner account not found' });
      }
      const updatedServers = Array.isArray(userDoc.servers) ? [...userDoc.servers] : [];
      const idx = updatedServers.findIndex((s: any) => s.name === cleanServerName);
      if (idx >= 0) {
        updatedServers[idx].status = 'pending';
        await safeSetDoc(cleanOwnerName, { ...userDoc, servers: updatedServers });
        return res.json({ success: true, message: 'Server approval revoked successfully' });
      } else {
        return res.status(404).json({ error: 'Server record not found under owner' });
      }
    } catch (e) {
      console.error('Revoke permission error:', e);
      return res.status(500).json({ error: 'Database error' });
    }
  });

  // Attach WebSocket Server
  const wss = new WebSocketServer({ noServer: true });

  wss.on('error', (err) => {
    console.error('[WS Server Error]:', err);
  });

  server.on('upgrade', (request, socket, head) => {
    try {
      const reqUrl = request.url || '';
      const pathname = reqUrl.split('?')[0];
      if (pathname === '/ws' || pathname === '/ws/') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
        return;
      }
    } catch (err) {
      console.error('[WS Upgrade Exception]:', err);
    }
  });

  wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    ws.on('error', (err) => {
      console.warn('[WS Client Socket Error]:', err.message);
    });

    const reqUrl = req.url || '';
    let roomId = 'server-1';
    let playerName = `Jugador #${Math.floor(100 + Math.random() * 900)}`;

    try {
      const parsedUrl = new URL(reqUrl, 'http://localhost');
      roomId = parsedUrl.searchParams.get('roomId') || 'server-1';
      playerName = parsedUrl.searchParams.get('playerName') || playerName;
    } catch (e) {
      // Fallback if URL parsing fails
    }

    const room = rooms[roomId] || rooms['server-1'];
    const playerId = `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Ensure bot exists in default server for testing multiplayer interaction
    if (room.id === 'server-1' && !room.bot) {
      room.bot = {
        id: 'bot_player_alex',
        state: {
          id: 'bot_player_alex',
          name: 'Bot_Alex',
          mapId: room.mapId,
          x: 2.5,
          y: 0.9,
          z: 2.0,
          rotY: 0,
          skinColorHex: 0xfbcfe8,
          shirtColorHex: 0x22c55e,
          pantsColorHex: 0x1e293b,
          hairType: 'classic',
          hairColorHex: 0x1c1917,
          weaponType: 'revolver',
          health: 100,
          isAlive: true,
          lastUpdate: Date.now(),
        },
        targetX: 2.5,
        targetZ: 2.0,
        targetYaw: 0,
        speed: 2.2,
        lastChatTime: 0,
        lastGreetPlayerId: '',
        respawnTimer: 0,
        shootCooldown: 0,
      };
    }

    const initialPlayerState: PlayerState = {
      id: playerId,
      name: playerName,
      mapId: room.mapId,
      x: (Math.random() - 0.5) * 4,
      y: 1.0,
      z: (Math.random() - 0.5) * 4,
      rotY: 0,
      skinColorHex: 0xfbcfe8,
      shirtColorHex: 0x38bdf8,
      pantsColorHex: 0x1e3a8a,
      hairType: 'none',
      hairColorHex: 0x1c1917,
      health: 100,
      isAlive: true,
      lastUpdate: Date.now(),
    };

    room.players.set(playerId, { ws, state: initialPlayerState });

    // Mark registered account as ONLINE when connected
    const connectedAccountKey = playerName.trim().toLowerCase();
    safeGetDoc(connectedAccountKey).then((uDoc) => {
      if (uDoc) {
        uDoc.status = 'ONLINE';
        uDoc.updatedAt = new Date().toISOString();
        safeSetDoc(connectedAccountKey, uDoc);
      }
    }).catch(() => {});

    // Send init handshake with assigned playerId and existing players list (including bot if active)
    const existingPlayers = Array.from(room.players.values())
      .filter((p) => p.state.id !== playerId)
      .map((p) => p.state);

    if (room.bot && room.bot.state.isAlive) {
      existingPlayers.push(room.bot.state);
    }

    ws.send(
      JSON.stringify({
        type: 'INIT',
        playerId,
        roomId: room.id,
        roomName: room.name,
        mapId: room.mapId,
        existingPlayers,
      })
    );

    // Broadcast JOIN event to all other clients in room
    const joinPayload = JSON.stringify({
      type: 'PLAYER_JOINED',
      player: initialPlayerState,
    });

    for (const [otherId, client] of room.players.entries()) {
      if (otherId !== playerId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(joinPayload);
      }
    }

    // Bot friendly greeting when player joins
    if (room.bot && room.bot.lastGreetPlayerId !== playerId) {
      room.bot.lastGreetPlayerId = playerId;
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'CHAT_MESSAGE',
              playerId: room.bot?.id || 'bot_player_alex',
              sender: room.bot?.state.name || 'Bot_Alex',
              message: `¡Hola ${playerName}! Bienvenido al servidor. Estoy aquí como jugador bot para probar la sincronización multijugador, movimiento y combate.`,
              speakerType: 'remote',
            })
          );
        }
      }, 1000);
    }

    // Handle incoming messages
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'MOVE' || data.type === 'UPDATE_STATE') {
          const p = room.players.get(playerId);
          if (p) {
            Object.assign(p.state, data.state, { lastUpdate: Date.now() });

            // Broadcast movement/state to other players in room
            const updatePayload = JSON.stringify({
              type: 'PLAYER_UPDATED',
              playerId,
              state: p.state,
            });

            for (const [otherId, client] of room.players.entries()) {
              if (otherId !== playerId && client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(updatePayload);
              }
            }
          }
        } else if (data.type === 'SHOOT') {
          // Broadcast bullet/shot event
          const shootPayload = JSON.stringify({
            type: 'PLAYER_SHOT',
            playerId,
            origin: data.origin,
            direction: data.direction,
            weaponType: data.weaponType,
          });
          for (const [otherId, client] of room.players.entries()) {
            if (otherId !== playerId && client.ws.readyState === WebSocket.OPEN) {
              client.ws.send(shootPayload);
            }
          }

          // Bot hit test: check if bullet shot hits bot
          if (room.bot && room.bot.state.isAlive && data.origin && data.direction) {
            const bx = room.bot.state.x;
            const by = room.bot.state.y;
            const bz = room.bot.state.z;
            const ox = data.origin.x;
            const oy = data.origin.y;
            const oz = data.origin.z;
            const dx = data.direction.x;
            const dy = data.direction.y;
            const dz = data.direction.z;

            // Vector from origin to bot
            const vx = bx - ox;
            const vy = by - oy;
            const vz = bz - oz;
            const proj = vx * dx + vy * dy + vz * dz;

            if (proj > 0) {
              const closeX = ox + dx * proj;
              const closeY = oy + dy * proj;
              const closeZ = oz + dz * proj;
              const distSq = (bx - closeX) ** 2 + (by - closeY) ** 2 + (bz - closeZ) ** 2;

              if (distSq < 1.4) {
                // Bot hit!
                const nextHp = Math.max(0, (room.bot.state.health ?? 100) - 35);
                room.bot.state.health = nextHp;
                if (nextHp <= 0) {
                  room.bot.state.isAlive = false;
                  room.bot.respawnTimer = 3.5;
                }

                const botUpdate = JSON.stringify({
                  type: 'PLAYER_UPDATED',
                  playerId: room.bot.id,
                  state: room.bot.state,
                });

                for (const [, client] of room.players.entries()) {
                  if (client.ws.readyState === WebSocket.OPEN) {
                    client.ws.send(botUpdate);
                  }
                }

                if (nextHp <= 0) {
                  const botKillMsg = JSON.stringify({
                    type: 'CHAT_MESSAGE',
                    playerId: room.bot.id,
                    sender: room.bot.state.name,
                    message: `¡Buen disparo ${playerName}! Reapareciendo en 3 segundos...`,
                    speakerType: 'remote',
                  });
                  for (const [, client] of room.players.entries()) {
                    if (client.ws.readyState === WebSocket.OPEN) {
                      client.ws.send(botKillMsg);
                    }
                  }
                }
              }
            }
          }
        } else if (data.type === 'SPAWN_PROP') {
          // Broadcast spawned object across clients
          const spawnPayload = JSON.stringify({
            type: 'PROP_SPAWNED',
            playerId,
            propType: data.propType,
            position: data.position,
          });
          for (const [otherId, client] of room.players.entries()) {
            if (otherId !== playerId && client.ws.readyState === WebSocket.OPEN) {
              client.ws.send(spawnPayload);
            }
          }
        } else if (data.type === 'CHAT') {
          const chatPayload = JSON.stringify({
            type: 'CHAT_MESSAGE',
            playerId,
            sender: playerName,
            message: data.message,
            speakerType: data.speakerType || 'player',
            targetRagdollId: data.targetRagdollId,
          });
          for (const [, client] of room.players.entries()) {
            if (client.ws.readyState === WebSocket.OPEN) {
              client.ws.send(chatPayload);
            }
          }

          // Bot chat interaction
          if (room.bot && room.bot.state.isAlive && Date.now() - room.bot.lastChatTime > 2500) {
            const clean = (data.message || '').toLowerCase();
            let botReply = '';
            if (clean.includes('hola') || clean.includes('buenas') || clean.includes('hey')) {
              botReply = `¡Hola ${playerName}! Estoy sincronizado en tiempo real con el servidor.`;
            } else if (clean.includes('bot') || clean.includes('servidor') || clean.includes('test') || clean.includes('prueba')) {
              botReply = `¡Exacto! Soy un jugador bot interactivo para validar la latencia y la sincronización 3D.`;
            } else if (clean.includes('arma') || clean.includes('dispar') || clean.includes('pvp') || clean.includes('pelea')) {
              botReply = `¡Tengo mi revólver listo! Puedes dispararme para probar el registro de daño multijugador.`;
            } else if (clean.includes('liquido') || clean.includes('pecho') || clean.includes('genital') || clean.includes('avatar')) {
              botReply = `¡El motor de fluidos y el editor de avatar con cámara en juego funcionan de maravilla!`;
            } else {
              const replies = [
                `¡Te recibo fuerte y claro por el chat del servidor, ${playerName}!`,
                `¡Movimiento y sincronización al 100%!`,
                `¡Vamos a explorar el mapa!`,
              ];
              botReply = replies[Math.floor(Math.random() * replies.length)];
            }

            room.bot.lastChatTime = Date.now();
            setTimeout(() => {
              const botChatPayload = JSON.stringify({
                type: 'CHAT_MESSAGE',
                playerId: room.bot?.id || 'bot_player_alex',
                sender: room.bot?.state.name || 'Bot_Alex',
                message: botReply,
                speakerType: 'remote',
              });
              for (const [, client] of room.players.entries()) {
                if (client.ws.readyState === WebSocket.OPEN) {
                  client.ws.send(botChatPayload);
                }
              }
            }, 900);
          }
        }
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      room.players.delete(playerId);

      const disconnectedKey = playerName.trim().toLowerCase();
      safeGetDoc(disconnectedKey).then((uDoc) => {
        if (uDoc) {
          uDoc.status = 'OFFLINE';
          uDoc.updatedAt = new Date().toISOString();
          safeSetDoc(disconnectedKey, uDoc);
        }
      }).catch(() => {});

      const leavePayload = JSON.stringify({
        type: 'PLAYER_LEFT',
        playerId,
      });
      for (const [, client] of room.players.entries()) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(leavePayload);
        }
      }
    });
  });

  // Vite or Static file middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bot movement & simulation tick loop (15 Hz)
  setInterval(() => {
    for (const room of Object.values(rooms)) {
      if (!room.bot || room.players.size === 0) continue;
      const bot = room.bot;

      // Handle respawn timer
      if (!bot.state.isAlive) {
        bot.respawnTimer -= 0.066;
        if (bot.respawnTimer <= 0) {
          bot.state.isAlive = true;
          bot.state.health = 100;
          bot.state.x = (Math.random() - 0.5) * 6;
          bot.state.z = (Math.random() - 0.5) * 6;
          bot.state.y = 0.9;
          bot.targetX = bot.state.x;
          bot.targetZ = bot.state.z;

          const respawnPayload = JSON.stringify({
            type: 'PLAYER_UPDATED',
            playerId: bot.id,
            state: bot.state,
          });
          for (const [, client] of room.players.entries()) {
            if (client.ws.readyState === WebSocket.OPEN) {
              client.ws.send(respawnPayload);
            }
          }
        }
        continue;
      }

      // Check distance to target
      const dx = bot.targetX - bot.state.x;
      const dz = bot.targetZ - bot.state.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 0.4 || Math.random() < 0.015) {
        // Pick new patrol point around world or near a player
        const playersArr = Array.from(room.players.values());
        const focusPlayer = playersArr[Math.floor(Math.random() * playersArr.length)]?.state;
        if (focusPlayer && Math.random() < 0.6) {
          // Approach player but keep polite distance
          bot.targetX = focusPlayer.x + (Math.random() - 0.5) * 4;
          bot.targetZ = focusPlayer.z + (Math.random() - 0.5) * 4;
        } else {
          bot.targetX = (Math.random() - 0.5) * 14;
          bot.targetZ = (Math.random() - 0.5) * 14;
        }
      } else {
        const step = Math.min(dist, bot.speed * 0.066);
        bot.state.x += (dx / dist) * step;
        bot.state.z += (dz / dist) * step;
        bot.state.rotY = Math.atan2(dx, dz);
        // Gentle bobbing / walking height
        bot.state.y = 0.9 + Math.abs(Math.sin(Date.now() * 0.008)) * 0.08;
      }

      bot.state.lastUpdate = Date.now();

      const updatePayload = JSON.stringify({
        type: 'PLAYER_UPDATED',
        playerId: bot.id,
        state: bot.state,
      });

      for (const [, client] of room.players.entries()) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(updatePayload);
        }
      }
    }
  }, 66);

  server.listen(PORT, '0.0.0.0', async () => {
    await ensureAdminsInDb();
    console.log(`[Multiplayer Cloud Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
