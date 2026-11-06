import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, setLogLevel, query, where } from 'firebase/firestore';
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

      // Check if already in memory by ID or refereeAddress
      const existingIdx = dbInstance.data.referrals.findIndex(
        (r: any) =>
          r.id === d.id ||
          r.refereeAddress.toLowerCase() === refereeAddr.toLowerCase()
      );

      if (existingIdx >= 0) {
        const existing = dbInstance.data.referrals[existingIdx];
        if (existing.referrerAddress.toLowerCase() !== refAddr.toLowerCase()) {
          existing.referrerAddress = refAddr;
          referralsLoaded++;
        }
        if (data.tier) existing.tier = data.tier;
        if (data.commissionUsdt !== undefined) existing.commissionUsdt = Number(data.commissionUsdt);
      } else if (refAddr.toLowerCase() !== refereeAddr.toLowerCase()) {
        dbInstance.data.referrals.push({
          id: data.id || d.id,
          referrerAddress: refAddr,
          refereeAddress: refereeAddr,
          tier: data.tier || 1,
          commissionUsdt: Number(data.commissionUsdt) || 0,
          volumeUsdt: Number(data.volumeUsdt) || 150.0,
          createdAt: data.createdAt || data.timestamp || new Date().toISOString(),
        });
        referralsLoaded++;
      }

      // Also ensure referee user has referredBy bound to the sponsor
      const refUser = dbInstance.getUser(refereeAddr.toLowerCase());
      if (refUser) {
        if (!refUser.referredBy || refUser.referredBy.toLowerCase() !== refAddr.toLowerCase()) {
          refUser.referredBy = refAddr;
        }
      } else {
        dbInstance.upsertUser({
          address: refereeAddr,
          referredBy: refAddr,
        });
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

    // 5. Fetch mining sessions from Firestore
    try {
      const sessionsSnap = await getDocs(collection(firestore, 'mining_sessions'));
      if (!dbInstance.data.miningSessions) dbInstance.data.miningSessions = [];
      sessionsSnap.forEach((d) => {
        const data = d.data() as any;
        const sessionId = data.sessionId || d.id;
        const userAddress = (data.userAddress || '').trim().toLowerCase();
        if (!userAddress) return;

        const exists = dbInstance.data.miningSessions.some((s: any) => s.sessionId === sessionId);
        if (!exists) {
          dbInstance.data.miningSessions.unshift({
            ...data,
            sessionId,
            userAddress,
          });
        }

        // If session was started within 24 hours (86,400,000 ms), ensure user and node are active
        const elapsed = Date.now() - (data.startTime || 0);
        if (data.startTime && elapsed < 24 * 3600 * 1000) {
          const user = dbInstance.upsertUser({ address: userAddress });
          user.hasActivatedMining = true;
          user.hasDepositedTreasury = true;
          if (!user.miningCycleStartTime) {
            user.miningCycleStartTime = data.startTime;
          }

          // Ensure node is in fleet
          const hasMiningNode = dbInstance.data.nodes.some(
            (n: any) => n.userAddress.toLowerCase() === userAddress && n.status === 'mining'
          );
          if (!hasMiningNode) {
            dbInstance.data.nodes.unshift({
              id: `spk-node-${data.startTime}-${userAddress.slice(2, 6)}`,
              userAddress,
              name: data.nodeName || 'SPIKE ASIC Rig #1',
              region: 'US-East (Stratum Cluster)',
              status: 'mining',
              hashrate: data.hashrateVh || 100,
              temperature: 64,
              shareAcceptance: 99.98,
              fanSpeed: 75,
              powerUsage: 1400,
              uptimeDays: 1,
              algorithm: 'SHA-256 (Stratum)',
              logs: [
                `24-Hour Mining Cycle Active [Level: ${data.tierName || 'Falcon Titan Apex'} · ${data.hashrateVh || 100} VH/s]`,
                'Stratum+SSL target diff accepted: 1048576 (hash: 00000000...a4f2)',
              ],
              costUsdt: data.treasuryContributionUsdt || 5.0,
              deployedAt: data.startDateIso || new Date(data.startTime).toISOString(),
            });
            nodesLoaded++;
          }
        }
      });
    } catch (sessionErr) {
      console.warn('[Firebase Server] Mining sessions hydration notice:', sessionErr);
    }

    // 6. Fetch global settings if present
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
 * On-demand real-time sync for a specific user wallet or sponsor from Cloud Firestore into in-memory database
 */
export async function syncReferralsForUser(dbInstance: any, walletAddress: string): Promise<number> {
  if (!firestore || !walletAddress) return 0;
  const norm = walletAddress.toLowerCase().trim();
  const hex6 = norm.startsWith('0x') ? norm.slice(2, 8) : norm.replace(/^(spike-|spk-)/i, '').slice(0, 6);
  const code = `SPK-${hex6.toUpperCase()}`;

  let updatedCount = 0;
  try {
    const queries = [
      query(collection(firestore, 'referrals'), where('referrerAddress', '==', norm)),
      query(collection(firestore, 'referrals'), where('referrerAddress', '==', code)),
      query(collection(firestore, 'referrals'), where('referralCode', '==', code)),
      query(collection(firestore, 'referrals'), where('refereeAddress', '==', norm)),
    ];

    const snaps = await Promise.all(queries.map((q) => getDocs(q).catch(() => null)));
    snaps.forEach((snap) => {
      if (!snap) return;
      snap.forEach((d) => {
        const data = d.data();
        let refAddr = (data.referrerAddress || '').trim().toLowerCase();
        const refereeAddr = (data.refereeAddress || '').trim().toLowerCase();
        if (!refAddr || !refereeAddr || refAddr === refereeAddr) return;

        // If referrerAddress is code, resolve to full user address if available
        if (refAddr.startsWith('spk-') || refAddr.startsWith('spike-') || refAddr === hex6) {
          const matchUser = dbInstance.data.users.find((u: any) =>
            u.address.toLowerCase().includes(hex6)
          );
          if (matchUser) refAddr = matchUser.address.toLowerCase();
        }

        const existingIdx = dbInstance.data.referrals.findIndex(
          (r: any) => r.id === d.id || r.refereeAddress.toLowerCase() === refereeAddr
        );

        if (existingIdx >= 0) {
          const existing = dbInstance.data.referrals[existingIdx];
          if (existing.referrerAddress.toLowerCase() !== refAddr) {
            existing.referrerAddress = refAddr;
            updatedCount++;
          }
        } else {
          dbInstance.data.referrals.unshift({
            id: data.id || d.id,
            referrerAddress: refAddr,
            refereeAddress: refereeAddr,
            tier: data.tier || 1,
            commissionUsdt: Number(data.commissionUsdt) || 0,
            volumeUsdt: Number(data.volumeUsdt) || 150.0,
            createdAt: data.createdAt || data.timestamp || new Date().toISOString(),
          });
          updatedCount++;
        }

        // Ensure referee user has referredBy
        const refUser = dbInstance.getUser(refereeAddr);
        if (refUser) {
          if (!refUser.referredBy || refUser.referredBy.toLowerCase() !== refAddr) {
            refUser.referredBy = refAddr;
          }
        } else {
          dbInstance.upsertUser({
            address: refereeAddr,
            referredBy: refAddr,
          });
        }
      });
    });

    if (updatedCount > 0) {
      dbInstance.save();
    }
  } catch (err) {
    console.warn('[Firebase Server] syncReferralsForUser notice:', err);
  }
  return updatedCount;
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

    // Delete all referral bindings so Root wallet has a clean 0-partner slate for fresh testing
    const refSnap = await getDocs(collection(firestore, 'referrals'));
    for (const d of refSnap.docs) {
      await deleteDoc(d.ref).catch(() => {});
      deletedReferrals++;
    }

    // Delete non-master mining sessions
    try {
      const sessionSnap = await getDocs(collection(firestore, 'miningSessions'));
      for (const d of sessionSnap.docs) {
        const data = d.data();
        const userAddr = (data.userAddress || '').toLowerCase().trim();
        if (!masterLower.includes(userAddr)) {
          await deleteDoc(d.ref).catch(() => {});
        }
      }
    } catch {}

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

