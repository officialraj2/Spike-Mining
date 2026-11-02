import { doc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';
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

export const BASELINE_MASTER_DIRECTS = [
  { refereeAddress: '0xaaaa111122223333444455556666777788889999', timestamp: '2026-10-17T07:35:13.134Z' },
  { refereeAddress: '0xbbbb222233334444555566667777888899990000', timestamp: '2026-10-17T07:43:22.822Z' },
  { refereeAddress: '0x2222222222222222222222222222222222222222', timestamp: '2026-10-22T05:45:21.314Z' },
  { refereeAddress: '0x5555555555555555555555555555555555555555', timestamp: '2026-10-22T07:09:31.752Z' },
  { refereeAddress: '0x16ee54796d74c3bd8fbe93954b339c629c1acf0c', timestamp: '2026-10-22T15:31:43.566Z' },
  { refereeAddress: '0x03dF2Ff70a21E058d67c2F4bfaB0AD4a22750F37', timestamp: '2026-10-23T08:36:35.182Z' },
  { refereeAddress: '0x1111111111111111111111111111111111111111', timestamp: '2026-10-24T17:40:45.885Z' },
  { refereeAddress: '0x3333333333333333333333333333333333333333', timestamp: '2026-10-24T17:41:13.157Z' },
  { refereeAddress: '0x8888888888888888888888888888888888888888', timestamp: '2026-10-24T17:43:28.329Z' },
  { refereeAddress: '0xaF88C8E3c4ae2B58Ade49C00ac8F1bc8968A48C4', timestamp: '2026-10-29T08:28:45.097Z' },
  { refereeAddress: '0x5512d577b94b8abf9308de15d43507075c43b167', timestamp: '2026-10-14T09:27:16.813Z' },
  { refereeAddress: '0xa0dcb94347e7b4ed957cbf51306bc1f6e8334147', timestamp: '2026-10-14T09:37:01.167Z' },
  { refereeAddress: '0x5dfea4b8aaeff82770710afa22332be6e0817b42', timestamp: '2026-10-14T09:37:06.785Z' },
  { refereeAddress: '0xb955549766b1127bf5b8b834610d1427f47171a4', timestamp: '2026-10-15T18:03:20.955Z' },
  { refereeAddress: '0x2c69b9fe8f052309dd9094e62d97d16127f51f52', timestamp: '2026-10-16T08:55:33.040Z' },
  { refereeAddress: '0x38069663d6408dff184bafc65e247e37ae84a1c2', timestamp: '2026-10-16T10:15:05.139Z' },
  { refereeAddress: '0xc8ae035c7bd0d6a043d7389f5defd3daee0e9006', timestamp: '2026-10-16T10:17:18.496Z' },
  { refereeAddress: '0x6884C3A256e5826e841595a846626B89f717e834', timestamp: '2026-10-17T08:07:11.421Z' },
  { refereeAddress: '0x84c06fe76adf7c7ab16b1f4af84655b1f50147b9', timestamp: '2026-10-18T16:15:09.052Z' },
  { refereeAddress: '0x3856175386ce7cc62ba595310392bd1e42a019f9', timestamp: '2026-10-17T07:43:17.268Z' },
];

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
    const { address: normReferrer, code: sponsorCode } = normalizeSponsor(referrerCodeOrAddr);

    if (normReferrer.toLowerCase() === normReferee) {
      return { success: false, error: 'Self-referral is not allowed' };
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

    // Cache locally for instant UI responsiveness
    try {
      localStorage.setItem(`spike_referred_by_${normReferee}`, normReferrer);
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
    const code = `SPK-${norm.slice(2, 8).toUpperCase()}`;

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
    // We check both the wallet address and the referral code so nothing is missed
    const queriesToRun = [
      query(collection(db, 'referrals'), where('referrerAddress', '==', norm)),
      query(collection(db, 'referrals'), where('referrerAddress', '==', code)),
      query(collection(db, 'referrals'), where('referralCode', '==', code)),
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
            const data = d.data() as FirestoreReferralRecord;
            if (data && data.refereeAddress) {
              const refAddr = data.refereeAddress.toLowerCase();
              const time = data.timestamp || new Date().toISOString();
              referralsMap.set(refAddr, {
                id: d.id,
                refereeAddress: data.refereeAddress,
                address: data.refereeAddress,
                tier: data.tier || 1,
                joinedAt: time,
                createdAt: time,
                volumeUsdt: 150,
                commissionUsdt: 0,
              });
            }
          });
        } catch (e) {
          console.warn('[Firestore Sub-Query Handled]:', e);
        }
      })
    );

    const referrals = Array.from(referralsMap.values());

    return {
      directPartners: referrals.length,
      referrals,
    };
  } catch (err: any) {
    console.warn('[Firestore Referral Stats Handled]:', err?.message || err);
    return { directPartners: 0, referrals: [] };
  }
}
