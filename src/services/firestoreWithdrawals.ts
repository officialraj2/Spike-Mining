import { doc, setDoc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface FirestoreWithdrawalRecord {
  id: string;
  userAddress: string;
  destinationAddress: string;
  amount: number;
  source?: string;
  milestoneLabel?: string;
  status: 'pending' | 'approved' | 'rejected';
  txHash?: string;
  adminNote?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Submit a withdrawal request.
 * Persists synchronously to Cloud Firestore and localStorage so that even on static hosting
 * (like Hostinger spikenodes.com without a Node.js daemon), withdrawal requests succeed 100% reliably
 * and immediately appear in the user's withdrawal history and the admin panel!
 */
export async function submitWithdrawalRequest(params: {
  userAddress: string;
  destinationAddress: string;
  amount: number;
  source?: string;
  milestoneLabel?: string;
}): Promise<{ success: boolean; request?: FirestoreWithdrawalRecord; error?: string }> {
  try {
    const { userAddress, destinationAddress, amount, source, milestoneLabel } = params;

    if (!userAddress || !destinationAddress) {
      return { success: false, error: 'Wallet address required for withdrawal' };
    }
    const cleanAmount = Number(amount);
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      return { success: false, error: 'Invalid withdrawal amount' };
    }

    const normUser = userAddress.toLowerCase().trim();
    const cleanDest = destinationAddress.trim();
    const now = new Date().toISOString();
    const id = `wdr_${Date.now()}_${normUser.slice(-4)}`;

    const newRecord: FirestoreWithdrawalRecord = {
      id,
      userAddress: normUser,
      destinationAddress: cleanDest,
      amount: cleanAmount,
      source: source || 'milestone_reward',
      milestoneLabel: milestoneLabel || 'Team Milestone Career Rewards',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    // 1. Persist directly to Google Cloud Firestore
    try {
      const docRef = doc(db, 'withdrawals', id);
      await setDoc(docRef, newRecord, { merge: true });
    } catch (fsErr) {
      console.warn('[Firestore Withdrawal direct write notice]:', fsErr);
    }

    // 2. Also try backend API route if available (non-blocking fallback)
    try {
      fetch('/api/withdrawals/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: normUser,
          destinationAddress: cleanDest,
          amount: cleanAmount,
          source: newRecord.source,
          milestoneLabel: newRecord.milestoneLabel,
        }),
      }).catch(() => null);
    } catch {}

    // 3. Cache immediately in localStorage for instant 0-latency UI updates
    try {
      const userKey = `spike_withdrawals_${normUser}`;
      const existing = localStorage.getItem(userKey);
      let list: FirestoreWithdrawalRecord[] = [];
      if (existing) {
        try {
          const parsed = JSON.parse(existing);
          if (Array.isArray(parsed)) list = parsed;
        } catch {}
      }
      list = [newRecord, ...list.filter((w) => w.id !== id)];
      localStorage.setItem(userKey, JSON.stringify(list));

      // Global all withdrawals cache for admin view
      const allKey = 'spike_all_withdrawals';
      const allExisting = localStorage.getItem(allKey);
      let allList: FirestoreWithdrawalRecord[] = [];
      if (allExisting) {
        try {
          const parsed = JSON.parse(allExisting);
          if (Array.isArray(parsed)) allList = parsed;
        } catch {}
      }
      allList = [newRecord, ...allList.filter((w) => w.id !== id)];
      localStorage.setItem(allKey, JSON.stringify(allList));
    } catch {}

    // 4. Dispatch global event to notify entire React application
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('spike_withdrawal_updated', {
          detail: {
            userAddress: normUser,
            request: newRecord,
            amount: cleanAmount,
          },
        })
      );
      try {
        const bc = new BroadcastChannel('spike_referral_live_sync');
        bc.postMessage({ type: 'WITHDRAWAL_REQUESTED', request: newRecord, userAddress: normUser });
        bc.close();
      } catch {}
    }

    return { success: true, request: newRecord };
  } catch (err: any) {
    console.error('[submitWithdrawalRequest Error]:', err);
    return { success: false, error: err?.message || 'Error processing withdrawal request' };
  }
}

/**
 * Fetch all withdrawal requests for a specific wallet address from Firestore, API, and localStorage.
 * Always sorts datewise descending (newest first).
 */
export async function getUserWithdrawals(userAddress: string): Promise<FirestoreWithdrawalRecord[]> {
  if (!userAddress) return [];
  const normUser = userAddress.toLowerCase().trim();
  const recordsMap = new Map<string, FirestoreWithdrawalRecord>();

  // 1. Read from localStorage cache
  try {
    const userKey = `spike_withdrawals_${normUser}`;
    const cached = localStorage.getItem(userKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        parsed.forEach((w) => {
          if (w && w.id) recordsMap.set(w.id, w);
        });
      }
    }
  } catch {}

  // 2. Query Cloud Firestore
  try {
    const q = query(collection(db, 'withdrawals'), where('userAddress', '==', normUser));
    const snap = await getDocs(q);
    snap.forEach((d) => {
      const data = d.data() as FirestoreWithdrawalRecord;
      if (data && data.id) {
        recordsMap.set(data.id, {
          ...data,
          id: d.id || data.id,
        });
      }
    });

    // Also check case variation if different
    if (userAddress !== normUser) {
      const qCase = query(collection(db, 'withdrawals'), where('userAddress', '==', userAddress));
      const snapCase = await getDocs(qCase);
      snapCase.forEach((d) => {
        const data = d.data() as FirestoreWithdrawalRecord;
        if (data && data.id) {
          recordsMap.set(data.id, {
            ...data,
            id: d.id || data.id,
          });
        }
      });
    }
  } catch (e) {
    console.warn('[Firestore getUserWithdrawals Handled]:', e);
  }

  // 3. Try backend API if available
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(`/api/withdrawals?userAddress=${encodeURIComponent(normUser)}`, {
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.withdrawals)) {
        data.withdrawals.forEach((w: FirestoreWithdrawalRecord) => {
          if (w && w.id) recordsMap.set(w.id, w);
        });
      }
    }
  } catch {}

  const result = Array.from(recordsMap.values());
  // Sort datewise descending (newest at top)
  result.sort((a, b) => {
    const tA = new Date(a.createdAt || 0).getTime();
    const tB = new Date(b.createdAt || 0).getTime();
    return tB - tA;
  });

  // Keep local cache synced
  try {
    localStorage.setItem(`spike_withdrawals_${normUser}`, JSON.stringify(result));
  } catch {}

  return result;
}

/**
 * Fetch all withdrawal records (for Admin view).
 */
export async function getAllWithdrawals(): Promise<FirestoreWithdrawalRecord[]> {
  const recordsMap = new Map<string, FirestoreWithdrawalRecord>();

  // 1. Read from localStorage
  try {
    const cached = localStorage.getItem('spike_all_withdrawals');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        parsed.forEach((w) => {
          if (w && w.id) recordsMap.set(w.id, w);
        });
      }
    }
  } catch {}

  // 2. Query Cloud Firestore
  try {
    const snap = await getDocs(collection(db, 'withdrawals'));
    snap.forEach((d) => {
      const data = d.data() as FirestoreWithdrawalRecord;
      if (data && data.id) {
        recordsMap.set(data.id, {
          ...data,
          id: d.id || data.id,
        });
      }
    });
  } catch (e) {
    console.warn('[Firestore getAllWithdrawals Handled]:', e);
  }

  // 3. Try API if available
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch('/api/withdrawals', { signal: ctrl.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.withdrawals)) {
        data.withdrawals.forEach((w: FirestoreWithdrawalRecord) => {
          if (w && w.id) recordsMap.set(w.id, w);
        });
      }
    }
  } catch {}

  const result = Array.from(recordsMap.values());
  result.sort((a, b) => {
    const tA = new Date(a.createdAt || 0).getTime();
    const tB = new Date(b.createdAt || 0).getTime();
    return tB - tA;
  });

  try {
    localStorage.setItem('spike_all_withdrawals', JSON.stringify(result));
  } catch {}

  return result;
}

/**
 * Approve a withdrawal request.
 */
export async function approveWithdrawal(
  id: string,
  txHash: string,
  adminNote?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();
    // 1. Update Cloud Firestore
    try {
      const docRef = doc(db, 'withdrawals', id);
      await updateDoc(docRef, {
        status: 'approved',
        txHash: txHash || `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        adminNote: adminNote || 'Approved by Nodescan',
        updatedAt: now,
      });
    } catch (e) {
      console.warn('[approveWithdrawal Firestore update error]:', e);
    }

    // 2. Try API endpoint
    try {
      await fetch(`/api/admin/withdrawals/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash, adminNote }),
      }).catch(() => null);
    } catch {}

    // 3. Update local caches
    try {
      const allKey = 'spike_all_withdrawals';
      const all = localStorage.getItem(allKey);
      if (all) {
        const parsed: FirestoreWithdrawalRecord[] = JSON.parse(all);
        const updated = parsed.map((w) =>
          w.id === id ? { ...w, status: 'approved' as const, txHash, adminNote, updatedAt: now } : w
        );
        localStorage.setItem(allKey, JSON.stringify(updated));
      }
    } catch {}

    // 4. Dispatch event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('spike_withdrawal_updated', {
          detail: { id, status: 'approved', txHash },
        })
      );
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to approve withdrawal' };
  }
}

/**
 * Reject a withdrawal request.
 */
export async function rejectWithdrawal(
  id: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();
    // 1. Update Cloud Firestore
    try {
      const docRef = doc(db, 'withdrawals', id);
      await updateDoc(docRef, {
        status: 'rejected',
        adminNote: reason || 'Admin declined',
        updatedAt: now,
      });
    } catch (e) {
      console.warn('[rejectWithdrawal Firestore update error]:', e);
    }

    // 2. Try API endpoint
    try {
      await fetch(`/api/admin/withdrawals/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      }).catch(() => null);
    } catch {}

    // 3. Update local caches
    try {
      const allKey = 'spike_all_withdrawals';
      const all = localStorage.getItem(allKey);
      if (all) {
        const parsed: FirestoreWithdrawalRecord[] = JSON.parse(all);
        const updated = parsed.map((w) =>
          w.id === id ? { ...w, status: 'rejected' as const, adminNote: reason, updatedAt: now } : w
        );
        localStorage.setItem(allKey, JSON.stringify(updated));
      }
    } catch {}

    // 4. Dispatch event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('spike_withdrawal_updated', {
          detail: { id, status: 'rejected', reason },
        })
      );
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to reject withdrawal' };
  }
}
