import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

let firestoreInstance: any = null;
let firebaseConfig: any = null;

try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const apps = getApps();
    const app = apps.length === 0 ? initializeApp(firebaseConfig, 'spike-server') : apps[0];
    firestoreInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    console.log('[Firebase Server] Initialized Firestore connected to database:', firebaseConfig.firestoreDatabaseId);
  }
} catch (err) {
  console.error('[Firebase Server] Failed to initialize Firebase:', err);
}

export const firestore = firestoreInstance;
export const config = firebaseConfig;

export async function syncDocument(collectionName: string, docId: string, data: any): Promise<boolean> {
  if (!firestore) return false;
  try {
    const cleanId = docId.replace(/[^a-zA-Z0-9_.-]/g, '_');
    await setDoc(doc(firestore, collectionName, cleanId), {
      ...data,
      _syncedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.error(`[Firebase Server] Sync failed for ${collectionName}/${docId}:`, err);
    return false;
  }
}

export async function syncEntireDatabase(dbData: any): Promise<{
  success: boolean;
  synced: { users: number; nodes: number; transactions: number; settings: boolean };
  error?: string;
}> {
  if (!firestore) {
    return { success: false, synced: { users: 0, nodes: 0, transactions: 0, settings: false }, error: 'Firestore not initialized' };
  }

  try {
    let usersCount = 0;
    let nodesCount = 0;
    let txCount = 0;

    // Sync settings
    if (dbData.settings) {
      await setDoc(doc(firestore, 'settings', 'global'), {
        ...dbData.settings,
        _syncedAt: new Date().toISOString(),
      }, { merge: true });
    }

    // Sync users
    if (Array.isArray(dbData.users)) {
      for (const user of dbData.users) {
        if (user.address) {
          await syncDocument('users', user.address, user);
          usersCount++;
        }
      }
    }

    // Sync nodes
    if (Array.isArray(dbData.nodes)) {
      for (const node of dbData.nodes) {
        if (node.id) {
          await syncDocument('nodes', node.id, node);
          nodesCount++;
        }
      }
    }

    // Sync transactions
    if (Array.isArray(dbData.transactions)) {
      for (const tx of dbData.transactions) {
        if (tx.id) {
          await syncDocument('transactions', tx.id, tx);
          txCount++;
        }
      }
    }

    return {
      success: true,
      synced: {
        users: usersCount,
        nodes: nodesCount,
        transactions: txCount,
        settings: true,
      },
    };
  } catch (err: any) {
    console.error('[Firebase Server] Full sync error:', err);
    return {
      success: false,
      synced: { users: 0, nodes: 0, transactions: 0, settings: false },
      error: err?.message || String(err),
    };
  }
}
