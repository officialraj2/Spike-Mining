import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, setLogLevel } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

let firestoreInstance: any = null;
let firebaseConfig: any = null;

try {
  setLogLevel('silent');
} catch {}

let quotaExhaustedUntil = 0;

export function isQuotaExhausted(): boolean {
  return Date.now() < quotaExhaustedUntil;
}

export function markQuotaExhausted() {
  quotaExhaustedUntil = Date.now() + 30 * 60 * 1000; // pause for 30 minutes
  console.warn('[Firebase Server] Free daily write quota reached; write sync paused. Local persistent database remains active.');
}

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
  if (!firestore || isQuotaExhausted()) return false;
  try {
    const cleanId = docId.replace(/[^a-zA-Z0-9_.-]/g, '_');
    await setDoc(doc(firestore, collectionName, cleanId), {
      ...data,
      _syncedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota limit exceeded')) {
      markQuotaExhausted();
      return false;
    }
    console.warn(`[Firebase Server] Sync notice for ${collectionName}/${docId}:`, msg);
    return false;
  }
}

export async function syncEntireDatabase(dbData: any): Promise<{
  success: boolean;
  synced: { users: number; nodes: number; transactions: number; settings: boolean };
  error?: string;
}> {
  if (!firestore || isQuotaExhausted()) {
    return { success: false, synced: { users: 0, nodes: 0, transactions: 0, settings: false }, error: 'Firestore write quota reached or paused' };
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

/**
 * Loads all users and referrals from Firestore directly into local database
 * Normalizes referral codes and canonical 0x addresses so every partner is counted
 */
export async function loadFirestoreDataIntoDb(dbInstance: any): Promise<{
  success: boolean;
  usersLoaded: number;
  referralsLoaded: number;
  nodesLoaded: number;
  transactionsLoaded: number;
}> {
  if (!firestore) return { success: false, usersLoaded: 0, referralsLoaded: 0, nodesLoaded: 0, transactionsLoaded: 0 };
  try {
    let usersLoaded = 0;
    let referralsLoaded = 0;
    let nodesLoaded = 0;
    let transactionsLoaded = 0;
    const userCodeMap = new Map<string, string>(); // code/slice -> canonical address

    // 1. Fetch all users from Firestore
    const usersSnap = await getDocs(collection(firestore, 'users'));
    usersSnap.forEach((d) => {
      const data = d.data();
      const addr = (data.address || d.id || '').trim();
      if (addr && addr.startsWith('0x') && addr.length === 42) {
        const norm = addr.toLowerCase();
        const code = data.referralCode || `SPK-${norm.slice(2, 8).toUpperCase()}`;
        dbInstance.upsertUser({
          ...data,
          address: addr,
          referralCode: code,
        });
        userCodeMap.set(code.toLowerCase(), norm);
        userCodeMap.set(norm.slice(2, 8), norm);
        usersLoaded++;
      }
    });

    // 2. Fetch all referrals from Firestore
    const refSnap = await getDocs(collection(firestore, 'referrals'));
    refSnap.forEach((d) => {
      const data = d.data();
      let refAddr = (data.referrerAddress || '').trim();
      const refereeAddr = (data.refereeAddress || '').trim();
      if (!refAddr || !refereeAddr) return;

      // Normalize referrerAddress if it was saved as code (e.g. SPK-3471E0)
      if (refAddr.toUpperCase().startsWith('SPK-') || refAddr.toUpperCase().startsWith('SPIKE-')) {
        const cleanCode = refAddr.toLowerCase();
        const codeSlice = refAddr.replace(/^(spike-|spk-)/i, '').toLowerCase();
        const resolved = userCodeMap.get(cleanCode) || userCodeMap.get(codeSlice);
        if (resolved) {
          refAddr = resolved;
        } else if (/^[a-f0-9]{6}$/i.test(codeSlice)) {
          const matchU = dbInstance.data.users.find((u: any) =>
            u.address.toLowerCase().includes(codeSlice)
          );
          if (matchU) {
            refAddr = matchU.address;
          }
        }
      }

      // Check if already in memory
      const exists = dbInstance.data.referrals.some(
        (r: any) =>
          r.id === d.id ||
          (r.referrerAddress.toLowerCase() === refAddr.toLowerCase() &&
            r.refereeAddress.toLowerCase() === refereeAddr.toLowerCase())
      );

      if (!exists && refAddr.toLowerCase() !== refereeAddr.toLowerCase()) {
        dbInstance.data.referrals.push({
          id: data.id || d.id,
          referrerAddress: refAddr,
          refereeAddress: refereeAddr,
          tier: data.tier || 1,
          commissionUsdt: Number(data.commissionUsdt) || 0,
          volumeUsdt: Number(data.volumeUsdt) || 150.0,
          createdAt: data.createdAt || new Date().toISOString(),
        });
        referralsLoaded++;
      }
    });

    // 3. Fetch nodes from Firestore
    try {
      const nodesSnap = await getDocs(collection(firestore, 'nodes'));
      nodesSnap.forEach((d) => {
        const data = d.data();
        const nodeId = data.id || d.id;
        if (!nodeId) return;
        const existingIdx = dbInstance.data.nodes.findIndex((n: any) => n.id === nodeId);
        if (existingIdx >= 0) {
          dbInstance.data.nodes[existingIdx] = { ...dbInstance.data.nodes[existingIdx], ...data };
        } else {
          dbInstance.data.nodes.push({ ...data, id: nodeId });
          nodesLoaded++;
        }
      });
    } catch (nodeErr) {
      console.warn('[Firebase Server] Node hydration notice:', nodeErr);
    }

    // 4. Fetch transactions from Firestore
    try {
      const txSnap = await getDocs(collection(firestore, 'transactions'));
      txSnap.forEach((d) => {
        const data = d.data();
        const txId = data.id || d.id;
        if (!txId) return;
        const exists = dbInstance.data.transactions.some((t: any) => t.id === txId || t.txHash === data.txHash);
        if (!exists) {
          dbInstance.data.transactions.push({ ...data, id: txId });
          transactionsLoaded++;
        }
      });
    } catch (txErr) {
      console.warn('[Firebase Server] Transaction hydration notice:', txErr);
    }

    // 5. Fetch global settings if present
    try {
      const settingsDoc = await getDoc(doc(firestore, 'settings', 'global'));
      if (settingsDoc.exists()) {
        const sData = settingsDoc.data();
        dbInstance.data.settings = { ...dbInstance.data.settings, ...sData };
      }
    } catch {}

    dbInstance.save();
    console.log(
      `[Firebase Server] Successfully synced Firestore data: ${usersLoaded} users, ${referralsLoaded} new referrals, ${nodesLoaded} nodes, ${transactionsLoaded} transactions.`
    );
    return { success: true, usersLoaded, referralsLoaded, nodesLoaded, transactionsLoaded };
  } catch (err: any) {
    console.error('[Firebase Server] Error loading data from Firestore:', err);
    return { success: false, usersLoaded: 0, referralsLoaded: 0, nodesLoaded: 0, transactionsLoaded: 0 };
  }
}

/**
 * Purges all non-master documents from Firestore collections (users, nodes, referrals, transactions)
 */
export async function purgeNonMasterFirestoreData(masterAddresses: string[]): Promise<{
  success: boolean;
  deletedUsers: number;
  deletedNodes: number;
  deletedReferrals: number;
  deletedTransactions: number;
}> {
  if (!firestore) {
    return { success: false, deletedUsers: 0, deletedNodes: 0, deletedReferrals: 0, deletedTransactions: 0 };
  }
  const masterLower = masterAddresses.map((a) => a.toLowerCase().trim());
  let deletedUsers = 0;
  let deletedNodes = 0;
  let deletedReferrals = 0;
  let deletedTransactions = 0;

  try {
    // Delete non-master nodes
    const nodesSnap = await getDocs(collection(firestore, 'nodes'));
    for (const d of nodesSnap.docs) {
      const data = d.data();
      const userAddr = (data.userAddress || '').toLowerCase().trim();
      if (!masterLower.includes(userAddr)) {
        await deleteDoc(d.ref).catch(() => {});
        deletedNodes++;
      }
    }

    // Delete non-master users
    const usersSnap = await getDocs(collection(firestore, 'users'));
    for (const d of usersSnap.docs) {
      const data = d.data();
      const addr = (data.address || d.id || '').toLowerCase().trim();
      if (!masterLower.includes(addr)) {
        await deleteDoc(d.ref).catch(() => {});
        deletedUsers++;
      }
    }

    // Delete non-master referrals
    const refSnap = await getDocs(collection(firestore, 'referrals'));
    for (const d of refSnap.docs) {
      const data = d.data();
      const referrerAddr = (data.referrerAddress || '').toLowerCase().trim();
      const refereeAddr = (data.refereeAddress || '').toLowerCase().trim();
      if (!masterLower.includes(referrerAddr) && !masterLower.includes(refereeAddr)) {
        await deleteDoc(d.ref).catch(() => {});
        deletedReferrals++;
      }
    }

    // Delete non-master transactions
    const txSnap = await getDocs(collection(firestore, 'transactions'));
    for (const d of txSnap.docs) {
      const data = d.data();
      const userAddr = (data.userAddress || '').toLowerCase().trim();
      if (!masterLower.includes(userAddr)) {
        await deleteDoc(d.ref).catch(() => {});
        deletedTransactions++;
      }
    }

    console.log(
      `[Firebase Server] Purged non-master records: ${deletedUsers} users, ${deletedNodes} nodes, ${deletedReferrals} referrals, ${deletedTransactions} transactions.`
    );
    return { success: true, deletedUsers, deletedNodes, deletedReferrals, deletedTransactions };
  } catch (err) {
    console.warn('[Firebase Server] Error purging non-master documents:', err);
    return { success: false, deletedUsers, deletedNodes, deletedReferrals, deletedTransactions };
  }
}

