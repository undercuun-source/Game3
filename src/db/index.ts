import fs from 'fs/promises';
import path from 'path';

const DB_FILE = path.resolve(process.cwd(), 'src/db/users.json');

// Thread-safe queue to prevent concurrent write conflicts
let writeQueue = Promise.resolve();

async function readDb(): Promise<Record<string, any>> {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
      await fs.writeFile(DB_FILE, '{}', 'utf-8');
      return {};
    }
    console.error('Error reading local database file:', err);
    return {};
  }
}

async function writeDb(data: Record<string, any>): Promise<void> {
  await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function safeGetDoc(userId: string) {
  try {
    const db = await readDb();
    const key = userId.toLowerCase();
    return db[key] || null;
  } catch (err) {
    console.error(`Database error in safeGetDoc for "${userId}":`, err);
    throw new Error("Database query failed.", { cause: err });
  }
}

export async function safeSetDoc(userId: string, userData: any) {
  const key = userId.toLowerCase();
  const values = {
    userId: key,
    username: userData.username || userData.name || userId,
    password: userData.password || null,
    email: userData.email || null,
    money: typeof userData.money === 'number' ? userData.money : 1000,
    level: typeof userData.level === 'number' ? userData.level : 1,
    status: userData.status || 'ONLINE',
    icon: userData.icon || '👤',
    skinPreset: userData.skinPreset || 'normal',
    skinColor: userData.skinColor || '#e0a96d',
    faceStyle: userData.faceStyle || 'classic',
    headScale: typeof userData.headScale === 'number' ? userData.headScale : 1.0,
    unlockedItems: Array.isArray(userData.unlockedItems) ? userData.unlockedItems : ['normal_skin', 'zombie_skin', 'blue_skin', 'classic_face', 'angry_face', 'anime_face'],
    isVerified18: !!userData.isVerified18,
    verificationDate: userData.verificationDate || null,
    role: userData.role || 'user',
    banned: !!userData.banned,
    updatedAt: userData.updatedAt || new Date().toISOString(),
    createdAt: userData.createdAt || null,
  };

  return new Promise((resolve, reject) => {
    writeQueue = writeQueue.then(async () => {
      try {
        const db = await readDb();
        const existingCreatedAt = db[key]?.createdAt;
        const existingServers = db[key]?.servers || [];
        
        let mergedServers = existingServers;
        if (Array.isArray(userData.servers)) {
          const incomingServers = userData.servers;
          const merged = [...incomingServers];
          
          for (let i = 0; i < merged.length; i++) {
            const incoming = merged[i];
            if (incoming && incoming.name) {
              const existing = existingServers.find((s: any) => s && s.name && s.name.trim().toLowerCase() === incoming.name.trim().toLowerCase());
              if (existing) {
                if (existing.status === 'approved' && incoming.status !== 'approved') {
                  merged[i] = {
                    ...incoming,
                    id: existing.id || incoming.id,
                    status: 'approved'
                  };
                } else if (existing.status === 'rejected' && incoming.status === 'pending') {
                  merged[i] = {
                    ...incoming,
                    id: existing.id || incoming.id,
                    status: 'rejected'
                  };
                }
              }
            }
          }

          // Keep any approved servers from the existing list that might be missing in incoming
          for (const existing of existingServers) {
            if (existing && existing.status === 'approved' && existing.name) {
              const alreadyInMerged = merged.some((s: any) => s && s.name && s.name.trim().toLowerCase() === existing.name.trim().toLowerCase());
              if (!alreadyInMerged) {
                merged.push(existing);
              }
            }
          }
          mergedServers = merged;
        }

        db[key] = {
          ...(db[key] || {}),
          ...values,
          servers: mergedServers,
          createdAt: values.createdAt || existingCreatedAt || new Date().toISOString(),
        };
        await writeDb(db);
        resolve(true);
      } catch (err) {
        console.error(`Database error in safeSetDoc for "${userId}":`, err);
        reject(new Error("Database write failed.", { cause: err }));
      }
    });
  });
}

export async function safeGetDocs() {
  try {
    const db = await readDb();
    return Object.values(db);
  } catch (err) {
    console.error("Database error in safeGetDocs:", err);
    throw new Error("Database query failed.", { cause: err });
  }
}
