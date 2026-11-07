import { doc, setDoc, getDocs, getDoc, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export interface FirestoreReferralRecord {
  id: string;
  referrerAddress: string;
  refereeAddress: string;
  tier: number;
  referralCode?: string;
  timestamp?: string;
}

export const MASTER_WALLET = '0x3471e07c4d2f7e11c155760a7b386e616b5c3715'.toLowerCase();
export const MASTER_REFERRAL_CODE = 'SPK-3471E0';

export const BASELINE_MASTER_DIRECTS: Array<{ refereeAddress: string; timestamp: string }> = [];

/**
 * Robust normalizer: parses Ethereum address or referral code from URLs,
 * parameters, codes, or raw addresses. Always returns safe strings <= 64 chars.
 */
export function normalizeSponsor(input: string): { address: string; code: string } {
  if (!input) {
    return { address: MASTER_WALLET, code: MASTER_REFERRAL_CODE };
  }
  let s = input.trim();

  // If input contains full URL or query string, parse out the parameters
  if (s.includes('?') || s.includes('http') || s.includes('/ref/') || s.includes('&')) {
    try {
      const urlStr = s.startsWith('http') ? s : `https://spikenodes.com/${s}`;
      const url = new URL(urlStr);
      const sponsorParam = url.searchParams.get('sponsor');
      const refParam = url.searchParams.get('ref') || url.searchParams.get('code') || url.searchParams.get('referrer');
      if (sponsorParam && /^0x[a-fA-F0-9]{40}$/i.test(sponsorParam.trim())) {
        const addr = sponsorParam.trim().toLowerCase();
        return { address: addr, code: `SPK-${addr.slice(2, 8).toUpperCase()}` };
      }
      if (refParam) {
        s = refParam.trim();
      }
    } catch {}
  }

  // Check if string contains an Ethereum 0x address
  const ethMatch = s.match(/0x[a-fA-F0-9]{40}/i);
  if (ethMatch) {
    const addr = ethMatch[0].toLowerCase();
    return { address: addr, code: `SPK-${addr.slice(2, 8).toUpperCase()}` };
  }

  // Check master wallet keywords
  if (s.toLowerCase().includes('3471e0')) {
    return { address: MASTER_WALLET, code: MASTER_REFERRAL_CODE };
  }

  // Format as clean SPK-XXXXXX code
  const cleanCode = s.toUpperCase().startsWith('SPK-') ? s.toUpperCase() : `SPK-${s.toUpperCase()}`;
  return { address: cleanCode.slice(0, 64), code: cleanCode.slice(0, 32) };
}

/**
 * Check if a user (by wallet address) is already bonded to a sponsor.
 * Checks localStorage, Firestore 'users' doc, Firestore 'referrals' doc, and backend.
 */
export async function isUserAlreadyBonded(walletAddress: string): Promise<{ isBonded: boolean; sponsor?: string }> {
  if (!walletAddress) return { isBonded: false };
  const norm = walletAddress.toLowerCase().trim();

  // 1. Instant check in localStorage
  try {
    const cachedRef = localStorage.getItem(`spike_referred_by_${norm}`);
    const isBondedFlag = localStorage.getItem(`spike_is_bonded_${norm}`);
    const bondedSponsor = localStorage.getItem(`spike_bonded_sponsor_${norm}`);
    if (cachedRef || isBondedFlag === 'true' || bondedSponsor) {
      return { isBonded: true, sponsor: cachedRef || bondedSponsor || undefined };
    }
  } catch {}

  // 2. Check Firestore 'users' collection
  try {
    const uSnap = await getDoc(doc(db, 'users', norm));
    if (uSnap.exists()) {
      const uData = uSnap.data();
      if (uData?.referredBy && uData.referredBy.toLowerCase() !== norm) {
        try {
          localStorage.setItem(`spike_referred_by_${norm}`, uData.referredBy);
          localStorage.setItem(`spike_is_bonded_${norm}`, 'true');
        } catch {}
        return { isBonded: true, sponsor: uData.referredBy };
      }
    }
  } catch {}

  // 3. Check Firestore 'referrals' collection (document ref_{norm})
  try {
    const cleanId = `ref_${norm.replace(/[^a-zA-Z0-9]/g, '')}`;
    const refSnap = await getDoc(doc(db, 'referrals', cleanId));
    if (refSnap.exists()) {
      const rData = refSnap.data();
      if (rData?.referrerAddress && rData.referrerAddress.toLowerCase() !== norm) {
        try {
          localStorage.setItem(`spike_referred_by_${norm}`, rData.referrerAddress);
          localStorage.setItem(`spike_is_bonded_${norm}`, 'true');
        } catch {}
        return { isBonded: true, sponsor: rData.referrerAddress };
      }
    }
  } catch {}

  // 4. Check backend API
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(`/api/referrals/check-bonded?address=${encodeURIComponent(norm)}`, {
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data && data.isBonded) {
        try {
          if (data.sponsor) localStorage.setItem(`spike_referred_by_${norm}`, data.sponsor);
          localStorage.setItem(`spike_is_bonded_${norm}`, 'true');
        } catch {}
        return { isBonded: true, sponsor: data.sponsor };
      }
    }
  } catch {}

  return { isBonded: false };
}

/**
 * Register a referral directly in Cloud Firestore.
 * This runs client-side directly from the browser to Google Cloud Firestore,
 * so even on static hosting (like Hostinger public_html) without a Node.js server,
 * the referral is permanently persisted across devices and visible to the sponsor!
 */
export async function registerReferralInFirestore(
  referrerCodeOrAddr: string,
  refereeAddress: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!refereeAddress || !referrerCodeOrAddr) {
      return { success: false, error: 'Missing address or sponsor' };
    }

    const normReferee = refereeAddress.toLowerCase().trim();
    let { address: normReferrer, code: sponsorCode } = normalizeSponsor(referrerCodeOrAddr);

    if (normReferrer.toLowerCase() === normReferee) {
      return { success: false, error: 'Self-referral is not allowed' };
    }

    // If normReferrer is an SPK code or slice rather than a full 0x BSC address, attempt resolving to real 0x address in Firestore
    if (!normReferrer.startsWith('0x') || normReferrer.length < 42) {
      try {
        const uSnap = await getDocs(
          query(collection(db, 'users'), where('referralCode', '==', sponsorCode.toUpperCase()))
        );
        if (!uSnap.empty) {
          const uDoc = uSnap.docs[0].data();
          if (uDoc?.address && uDoc.address.startsWith('0x')) {
            normReferrer = uDoc.address.toLowerCase();
          }
        } else {
          // Check slice in address
          const hex6 = sponsorCode.replace(/^(spike-|spk-)/i, '').toLowerCase();
          const allUsers = await getDocs(collection(db, 'users'));
          allUsers.forEach((d) => {
            const uData = d.data();
            const addr = (uData.address || d.id || '').toLowerCase();
            if (addr.startsWith(`0x${hex6}`) || addr.includes(hex6)) {
              normReferrer = addr;
            }
          });
        }
      } catch {}
    }

    // Create a deterministic document ID for this referee
    const cleanId = `ref_${normReferee.replace(/[^a-zA-Z0-9]/g, '')}`;
    const docRef = doc(db, 'referrals', cleanId);

    const now = new Date().toISOString();
    const data: FirestoreReferralRecord = {
      id: cleanId,
      referrerAddress: normReferrer.slice(0, 64),
      refereeAddress: normReferee.slice(0, 64),
      tier: 1,
      referralCode: sponsorCode.slice(0, 32),
      timestamp: now,
    };

    await setDoc(docRef, data, { merge: true });

    // Also update referee's user record in Firestore so referredBy is persistently bonded
    try {
      const refereeUserDoc = doc(db, 'users', normReferee);
      await setDoc(refereeUserDoc, {
        address: normReferee,
        referredBy: normReferrer.slice(0, 64),
        lastActive: now,
      }, { merge: true });
    } catch {}

    // Cache locally for instant UI responsiveness
    try {
      localStorage.setItem(`spike_referred_by_${normReferee}`, normReferrer);
      localStorage.setItem(`spike_is_bonded_${normReferee}`, 'true');
      localStorage.setItem(`spike_bonded_sponsor_${normReferee}`, normReferrer);
    } catch {}

    // Also update sponsor's local cached count if on the same browser
    try {
      const sponsorKey = `spike_referral_stats_${normReferrer}`;
      const existing = localStorage.getItem(sponsorKey);
      if (existing) {
        const parsed = JSON.parse(existing);
        parsed.directPartners = (parsed.directPartners || 0) + 1;
        parsed.totalPartners = (parsed.totalPartners || 0) + 1;
        if (Array.isArray(parsed.referrals)) {
          parsed.referrals.unshift({
            id: cleanId,
            address: normReferee,
            refereeAddress: normReferee,
            tier: 1,
            joinedAt: now,
            createdAt: now,
            activeMiners: 1,
            volumeUsdt: 150,
            totalCommission: 0,
          });
        }
        localStorage.setItem(sponsorKey, JSON.stringify(parsed));
      }
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.warn('[Firestore Referral Register Handled]:', err?.message || err);
    return { success: false, error: err?.message || 'Firestore write failed' };
  }
}

export interface ResolvedReferralItem {
  id: string;
  refereeAddress: string;
  address: string;
  tier: number;
  joinedAt: string;
  createdAt: string;
  volumeUsdt: number;
  commissionUsdt: number;
}

export interface FirestoreReferralTreeStats {
  directPartners: number;
  downlinePartners: number;
  totalPartners: number;
  levelCounts: Record<number, number>;
  referrals: ResolvedReferralItem[];
}

/**
 * Fetch all direct and downline referrals for a sponsor wallet directly from Cloud Firestore + Baseline.
 * Traverses Unilevel Tree across all 9 levels so that:
 * 1. Direct partner joins count in directPartners (Tier 1).
 * 2. Downline partner joins count in downlinePartners (Tier 2 through Tier 9).
 * 3. Both direct and downline network members are included in the partner activity list.
 */
export async function getReferralsFromFirestore(walletAddress: string): Promise<FirestoreReferralTreeStats> {
  const emptyStats: FirestoreReferralTreeStats = {
    directPartners: 0,
    downlinePartners: 0,
    totalPartners: 0,
    levelCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
    referrals: [],
  };

  try {
    if (!walletAddress) return emptyStats;
    const norm = walletAddress.toLowerCase().trim();
    const hex6 = norm.startsWith('0x') ? norm.slice(2, 8) : norm.replace(/^(spike-|spk-)/i, '').slice(0, 6);
    const code = `SPK-${hex6.toUpperCase()}`;
    const isMaster = norm === MASTER_WALLET || norm.includes('3471e0');

    // 1. Gather all edges from Firestore referrals collection and users collection
    interface NetworkEdge {
      id: string;
      referrer: string;
      referee: string;
      tier: number;
      timestamp: string;
      volumeUsdt: number;
      commissionUsdt: number;
    }
    const edgeMap = new Map<string, NetworkEdge>();

    // Baseline direct partners for master wallet
    if (isMaster) {
      BASELINE_MASTER_DIRECTS.forEach((r, i) => {
        const addr = r.refereeAddress.toLowerCase();
        edgeMap.set(`edge_base_${addr}`, {
          id: `base_${i}_${addr.slice(2, 8)}`,
          referrer: MASTER_WALLET,
          referee: r.refereeAddress,
          tier: 1,
          timestamp: r.timestamp,
          volumeUsdt: 150,
          commissionUsdt: 0,
        });
      });
    }

    // Fetch all records from 'referrals' collection
    try {
      const refSnap = await getDocs(collection(db, 'referrals'));
      refSnap.forEach((d) => {
        const data = d.data() as any;
        const refAddr = (data.referrerAddress || data.referrer || data.referralCode || '').trim();
        const refereeAddr = (data.refereeAddress || data.address || d.id.replace(/^ref_/, '') || '').trim();
        if (refAddr && refereeAddr && refAddr.toLowerCase() !== refereeAddr.toLowerCase()) {
          const time = data.timestamp || data.createdAt || data.joinedAt || new Date().toISOString();
          const key = `ref_${refereeAddr.toLowerCase()}`;
          if (!edgeMap.has(key)) {
            edgeMap.set(key, {
              id: d.id,
              referrer: refAddr,
              referee: refereeAddr,
              tier: data.tier || 1,
              timestamp: time,
              volumeUsdt: Number(data.volumeUsdt) || 150,
              commissionUsdt: Number(data.commissionUsdt) || 0,
            });
          }
        }
      });
    } catch (e) {
      console.warn('[Firestore referrals collection fetch notice]:', e);
    }

    // Fetch all records from 'users' collection to capture referredBy links
    try {
      const userSnap = await getDocs(collection(db, 'users'));
      userSnap.forEach((d) => {
        const uData = d.data() as any;
        const refereeAddr = (uData.address || d.id || '').trim();
        const refAddr = (uData.referredBy || '').trim();
        if (refAddr && refereeAddr && refAddr.toLowerCase() !== refereeAddr.toLowerCase()) {
          const key = `ref_${refereeAddr.toLowerCase()}`;
          if (!edgeMap.has(key)) {
            const time = uData.createdAt || uData.lastActive || new Date().toISOString();
            edgeMap.set(key, {
              id: `user_ref_${refereeAddr.slice(2, 8)}`,
              referrer: refAddr,
              referee: refereeAddr,
              tier: 1,
              timestamp: time,
              volumeUsdt: 150,
              commissionUsdt: 0,
            });
          }
        }
      });
    } catch (e) {
      console.warn('[Firestore users collection fetch notice]:', e);
    }

    const allEdges = Array.from(edgeMap.values());

    // Helper to test if a referral edge matches a given sponsor address/code
    const matchesSponsor = (edgeReferrer: string, targetAddr: string, targetSlice: string, targetCode: string): boolean => {
      const r = edgeReferrer.toLowerCase().trim();
      const t = targetAddr.toLowerCase().trim();
      const s = targetSlice.toLowerCase().trim();
      const c = targetCode.toLowerCase().trim();
      if (r === t || r === c || r === `spike-${s}` || r === s) return true;
      if (s.length >= 6 && r.includes(s)) return true;
      if (targetAddr.length >= 10 && r.includes(targetAddr.slice(2, 8))) return true;
      return false;
    };

    // Level-by-level BFS traversal across unilevel structure (Level 1 direct, Levels 2..9 downline)
    const levelCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    const visited = new Set<string>();
    visited.add(norm);
    visited.add(code.toLowerCase());
    visited.add(hex6.toLowerCase());
    if (isMaster) {
      visited.add(MASTER_WALLET);
      visited.add(MASTER_REFERRAL_CODE.toLowerCase());
    }

    const resolvedMembersMap = new Map<string, ResolvedReferralItem>();

    // 1. LEVEL 1 (DIRECTS)
    const level1Queue: string[] = [];
    allEdges.forEach((edge) => {
      const child = edge.referee.toLowerCase().trim();
      if (!child || visited.has(child)) return;

      const isDirectMatch = matchesSponsor(edge.referrer, norm, hex6, code) ||
        (isMaster && (edge.referrer.toLowerCase() === MASTER_REFERRAL_CODE.toLowerCase() || edge.referrer.toLowerCase().includes('3471e0')));

      if (isDirectMatch) {
        visited.add(child);
        level1Queue.push(child);
        resolvedMembersMap.set(child, {
          id: edge.id,
          refereeAddress: edge.referee,
          address: edge.referee,
          tier: 1,
          joinedAt: edge.timestamp,
          createdAt: edge.timestamp,
          volumeUsdt: edge.volumeUsdt,
          commissionUsdt: edge.commissionUsdt,
        });
      }
    });

    levelCounts[1] = level1Queue.length;

    // 2. DOWNLINE LEVELS (2 through 9)
    let currentQueue = level1Queue;
    let currentLevel = 2;

    while (currentQueue.length > 0 && currentLevel <= 9) {
      const nextQueue: string[] = [];
      for (const parent of currentQueue) {
        const pSlice = parent.startsWith('0x') ? parent.slice(2, 8) : parent.replace(/^(spike-|spk-)/i, '').slice(0, 6);
        const pCode = `SPK-${pSlice.toUpperCase()}`;

        allEdges.forEach((edge) => {
          const child = edge.referee.toLowerCase().trim();
          if (!child || visited.has(child)) return;

          if (matchesSponsor(edge.referrer, parent, pSlice, pCode)) {
            visited.add(child);
            nextQueue.push(child);
            resolvedMembersMap.set(child, {
              id: edge.id,
              refereeAddress: edge.referee,
              address: edge.referee,
              tier: currentLevel,
              joinedAt: edge.timestamp,
              createdAt: edge.timestamp,
              volumeUsdt: edge.volumeUsdt,
              commissionUsdt: edge.commissionUsdt,
            });
          }
        });
      }

      levelCounts[currentLevel] = nextQueue.length;
      currentQueue = nextQueue;
      currentLevel++;
    }

    const directPartners = levelCounts[1];
    let downlinePartners = 0;
    for (let lvl = 2; lvl <= 9; lvl++) {
      downlinePartners += (levelCounts[lvl] || 0);
    }
    const totalPartners = directPartners + downlinePartners;

    const referrals = Array.from(resolvedMembersMap.values());
    referrals.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.joinedAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.joinedAt || 0).getTime();
      return timeB - timeA; // Newest joins at the top (datewise descending)
    });

    return {
      directPartners,
      downlinePartners,
      totalPartners,
      levelCounts,
      referrals,
    };
  } catch (err: any) {
    console.warn('[Firestore Referral Stats Handled]:', err?.message || err);
    return emptyStats;
  }
}
