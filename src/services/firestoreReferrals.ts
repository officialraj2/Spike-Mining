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

/**
 * Fetch all direct referrals for a sponsor wallet directly from Cloud Firestore + Baseline.
 * Handles both 0x wallet address matching and SPK- referral code matching.
 */
export async function getReferralsFromFirestore(walletAddress: string): Promise<{
  directPartners: number;
  referrals: ResolvedReferralItem[];
}> {
  try {
    if (!walletAddress) return { directPartners: 0, referrals: [] };
    const norm = walletAddress.toLowerCase().trim();
    const hex6 = norm.startsWith('0x') ? norm.slice(2, 8) : norm.replace(/^(spike-|spk-)/i, '').slice(0, 6);
    const code = `SPK-${hex6.toUpperCase()}`;

    const referralsMap = new Map<string, ResolvedReferralItem>();

    // 1. If this is the master sponsor, seed with baseline verified direct partners
    const isMaster = norm === MASTER_WALLET || norm.includes('3471e0');
    if (isMaster) {
      BASELINE_MASTER_DIRECTS.forEach((r, i) => {
        const addr = r.refereeAddress.toLowerCase();
        referralsMap.set(addr, {
          id: `base_${i}_${addr.slice(2, 8)}`,
          refereeAddress: r.refereeAddress,
          address: r.refereeAddress,
          tier: 1,
          joinedAt: r.timestamp,
          createdAt: r.timestamp,
          volumeUsdt: 150,
          commissionUsdt: 0,
        });
      });
    }

    // 2. Query Cloud Firestore for any real-time registered referrals
    // We check wallet address variations, referral code, and users collection
    const queriesToRun = [
      query(collection(db, 'referrals'), where('referrerAddress', '==', norm)),
      query(collection(db, 'referrals'), where('referrerAddress', '==', walletAddress)),
      query(collection(db, 'referrals'), where('referrerAddress', '==', code)),
      query(collection(db, 'referrals'), where('referrerAddress', '==', code.toLowerCase())),
      query(collection(db, 'referrals'), where('referralCode', '==', code)),
      query(collection(db, 'referrals'), where('referralCode', '==', code.toLowerCase())),
      query(collection(db, 'referrals'), where('referralCode', '==', hex6.toUpperCase())),
      query(collection(db, 'referrals'), where('referralCode', '==', hex6.toLowerCase())),
      query(collection(db, 'users'), where('referredBy', '==', norm)),
      query(collection(db, 'users'), where('referredBy', '==', walletAddress)),
      query(collection(db, 'users'), where('referredBy', '==', code)),
    ];

    if (isMaster) {
      queriesToRun.push(
        query(collection(db, 'referrals'), where('referrerAddress', '==', MASTER_REFERRAL_CODE)),
        query(collection(db, 'referrals'), where('referrerAddress', '==', MASTER_REFERRAL_CODE.toLowerCase())),
        query(collection(db, 'referrals'), where('referralCode', '==', MASTER_REFERRAL_CODE))
      );
    }

    await Promise.allSettled(
      queriesToRun.map(async (q) => {
        try {
          const snapshot = await getDocs(q);
          snapshot.forEach((d) => {
            const data = d.data() as any;
            const refAddr = (data.refereeAddress || data.address || d.id || '').toLowerCase().trim();
            if (refAddr && refAddr !== norm && refAddr !== code.toLowerCase()) {
              const time = data.timestamp || data.createdAt || data.joinedAt || new Date().toISOString();
              if (!referralsMap.has(refAddr)) {
                referralsMap.set(refAddr, {
                  id: d.id,
                  refereeAddress: data.refereeAddress || data.address || refAddr,
                  address: data.refereeAddress || data.address || refAddr,
                  tier: data.tier || 1,
                  joinedAt: time,
                  createdAt: time,
                  volumeUsdt: Number(data.volumeUsdt) || 150,
                  commissionUsdt: Number(data.commissionUsdt) || 0,
                });
              }
            }
          });
        } catch (e) {
          console.warn('[Firestore Sub-Query Handled]:', e);
        }
      })
    );

    const referrals = Array.from(referralsMap.values());
    referrals.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.joinedAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.joinedAt || 0).getTime();
      return timeB - timeA; // Newest joining at the top (datewise descending)
    });

    return {
      directPartners: referrals.length,
      referrals,
    };
  } catch (err: any) {
    console.warn('[Firestore Referral Stats Handled]:', err?.message || err);
    return { directPartners: 0, referrals: [] };
  }
}
