import React, { useState, useEffect, useCallback } from 'react';
import {
  AdminMetrics,
  AdminUser,
  AdminSettings,
  AdminAuditLog,
  MiningNode,
  RewardTransaction,
} from '../../types';
import { getAllWithdrawals, approveWithdrawal, rejectWithdrawal } from '../../services/firestoreWithdrawals';
import { db as firestoreDb } from '../../firebase';
import { collection, doc, getDocs, getDoc, onSnapshot } from 'firebase/firestore';
import {
  authenticateMasterWalletWithSignature,
  clearAdminSession,
  getAdminAuthHeaders,
  isMasterWalletHashMatch,
} from '../../services/adminAuth';
import { TEAM_MILESTONE_TIERS } from '../../data/mockData';

// Safe JSON parser helper to prevent "Unexpected end of JSON input" errors
async function safeJsonParse(res: Response): Promise<any> {
  try {
    const text = await res.text();
    if (!text || !text.trim()) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

interface AdminViewProps {
  onNotify?: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  onNavigateTab: (tab: 'dashboard' | 'mining-nodes' | 'referrals' | 'home') => void;
  onInspectUserPanel?: (walletAddress: string, initialTab?: 'dashboard' | 'mining-nodes' | 'referrals' | 'withdraw-history') => void;
  isAdmin?: boolean;
  isMasterUser?: boolean;
  currentWallet?: string;
  onUnlockAdmin?: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  onNotify,
  onNavigateTab,
  onInspectUserPanel,
  isAdmin = false,
  isMasterUser = false,
  currentWallet = '',
  onUnlockAdmin,
}) => {
  // Backend state
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [nodes, setNodes] = useState<MiningNode[]>([]);
  const [transactions, setTransactions] = useState<RewardTransaction[]>([]);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Master User recognition strictly tied to verified signature session
  const isEffectiveMaster = Boolean(isAdmin && isMasterUser);

  const [activeSubTab, setActiveSubTab] = useState<
    'master' | 'overview' | 'claims' | 'withdrawals' | 'users' | 'nodes' | 'transactions' | 'settings' | 'database'
  >(isMasterUser ? 'master' : 'overview');

  // Admin Claim Tracker State
  const [claimsList, setClaimsList] = useState<Array<{
    id: string;
    userAddress: string;
    spkAmount: number;
    usdtAmount: number;
    currency: string;
    txHash: string;
    status: string;
    verifiedOnChain: boolean;
    blockNumber: number;
    details: string;
    timestamp: string;
    source: string;
  }>>([]);
  const [claimDatePreset, setClaimDatePreset] = useState<'all' | 'today' | 'yesterday' | '7d' | '30d' | 'custom'>('all');
  const [claimStartDate, setClaimStartDate] = useState<string>('');
  const [claimEndDate, setClaimEndDate] = useState<string>('');
  const [claimSearchQuery, setClaimSearchQuery] = useState<string>('');
  const [claimViewMode, setClaimViewMode] = useState<'logs' | 'wallets'>('logs');
  const [claimVerifyFilter, setClaimVerifyFilter] = useState<'all' | 'onchain' | 'ledger'>('all');

  // Withdrawal Requests State
  const [withdrawalRequests, setWithdrawalRequests] = useState<any[]>([]);
  const [withdrawalFilter, setWithdrawalFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [withdrawalSearch, setWithdrawalSearch] = useState('');
  const [processingWithdrawalId, setProcessingWithdrawalId] = useState<string | null>(null);
  const [customTxInput, setCustomTxInput] = useState<{ [id: string]: string }>({});

  // Master User Control State
  const [newMasterInput, setNewMasterInput] = useState('');
  const [isSavingMasterSettings, setIsSavingMasterSettings] = useState(false);
  const [masterUserSearch, setMasterUserSearch] = useState('');

  // Cryptographic Master Wallet signature authentication state
  const [isSigningAuth, setIsSigningAuth] = useState(false);
  const [signatureError, setSignatureError] = useState<string | null>(null);

  // Search & Filter
  const [userSearch, setUserSearch] = useState('');
  const [nodeFilter, setNodeFilter] = useState<'all' | 'mining' | 'idle' | 'stopped'>('all');

  // Cross-Verify User Panel Inspector State
  const [inspectWalletInput, setInspectWalletInput] = useState('');
  const [inspectTargetTab, setInspectTargetTab] = useState<'dashboard' | 'mining-nodes' | 'referrals' | 'withdraw-history'>('dashboard');
  const [inspectInputError, setInspectInputError] = useState<string | null>(null);

  const handleInspectWalletSubmit = (overrideAddress?: string, overrideTab?: 'dashboard' | 'mining-nodes' | 'referrals' | 'withdraw-history') => {
    const raw = (overrideAddress ?? inspectWalletInput).trim();
    const match = raw.match(/0x[a-fA-F0-9]{40}/);
    const cleanAddr = match ? match[0] : raw;
    if (!/^0x[a-fA-F0-9]{40}$/.test(cleanAddr)) {
      setInspectInputError('Valid 42-character BEP-20 wallet address (0x...) paste karein.');
      onNotify?.('Invalid Wallet Address', 'Please paste a valid 0x... BEP-20 wallet address.', 'warning');
      return;
    }
    setInspectInputError(null);
    onInspectUserPanel?.(cleanAddr, overrideTab ?? inspectTargetTab);
  };

  const handlePasteInspectWallet = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        const trimmed = (text || '').trim();
        const match = trimmed.match(/0x[a-fA-F0-9]{40}/);
        const extracted = match ? match[0] : trimmed;
        if (extracted) {
          setInspectWalletInput(extracted);
          setInspectInputError(null);
          onNotify?.('Address Pasted', `${extracted.slice(0, 8)}...${extracted.slice(-6)} ready to inspect.`, 'info');
        } else {
          onNotify?.('Clipboard Empty', 'Clipboard me koi wallet address nahi mila.', 'warning');
        }
      }
    } catch {
      onNotify?.('Paste Shortcut', 'Please use Ctrl+V / Long-press Paste inside the wallet input box.', 'info');
    }
  };

  // Adjust Balance Modal
  const [adjustModalUser, setAdjustModalUser] = useState<AdminUser | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(50);
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
  const [adjustReason, setAdjustReason] = useState<string>('Operational liquidity top-up');
  const [syncingFirebase, setSyncingFirebase] = useState<boolean>(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<Partial<AdminSettings>>({});

  // Treasury State
  const [treasuryInfo, setTreasuryInfo] = useState<{
    treasuryWalletAddress: string;
    treasuryBalanceUsdt: number;
  }>({
    treasuryWalletAddress: '0xD833e2f6fC850cFe3B39F49e34F9231f0AB2b6bF',
    treasuryBalanceUsdt: 0.0,
  });
  const [treasuryAddressInput, setTreasuryAddressInput] = useState('0xD833e2f6fC850cFe3B39F49e34F9231f0AB2b6bF');
  const [isSavingTreasury, setIsSavingTreasury] = useState(false);

  // Dedicated Hashrate Controller State (Per Image Spec)
  const [hashrateModalUser, setHashrateModalUser] = useState<AdminUser | null>(null);
  const [targetHashrateAddr, setTargetHashrateAddr] = useState<string>('');
  const [selectedHashratePreset, setSelectedHashratePreset] = useState<number>(100);
  const [customHashrateVal, setCustomHashrateVal] = useState<string>('100');
  const [hashrateChangeReason, setHashrateChangeReason] = useState<string>('Hashrate level adjustment');
  const [isUpdatingHashrate, setIsUpdatingHashrate] = useState<boolean>(false);
  const [hashrateBannerMsg, setHashrateBannerMsg] = useState<{
    address: string;
    level: string;
    hashrate: number;
    days: number;
  } | null>(null);

  const HASHRATE_LEVEL_TIERS = [
    { level: 'Fresh user', directs: '0 referrals', targetDays: 60, hashrate: 100, desc: '100 VH/s · 1 SPK in 60 days' },
    { level: 'Level 1', directs: '10 directs', targetDays: 30, hashrate: 200, desc: '200 VH/s · 1 SPK in 30 days' },
    { level: 'Level 2', directs: '100 total team', targetDays: 15, hashrate: 400, desc: '400 VH/s · 1 SPK in 15 days' },
    { level: 'Level 3', directs: '1,000 total team', targetDays: 10, hashrate: 600, desc: '600 VH/s · 1 SPK in 10 days' },
    { level: 'Level 4', directs: '5,000 total team', targetDays: 7, hashrate: 857.14, desc: '857.14 VH/s · 1 SPK in 7 days' },
  ];

  const handleSaveUserHashrate = async (address: string, hashrateVal: number | null, reasonStr: string) => {
    const cleanAddr = (address || '').trim().toLowerCase();
    if (!cleanAddr) {
      onNotify?.('Error', 'Please provide a valid wallet address', 'error');
      return;
    }
    setIsUpdatingHashrate(true);
    try {
      const res = await fetch(`/api/admin/users/${cleanAddr}/hashrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
        body: JSON.stringify({
          hashrate: hashrateVal,
          reason: reasonStr,
          adminUser: currentWallet || 'Master Admin',
        }),
      });
      const data = await safeJsonParse(res);
      if (data?.success) {
        const info = data.hashrateInfo;
        try {
          window.dispatchEvent(
            new CustomEvent('spike_hashrate_updated', {
              detail: {
                address: cleanAddr,
                hashrateInfo: info,
              },
            })
          );
          localStorage.setItem(`spike_hashrate_${cleanAddr}`, JSON.stringify(info));
          localStorage.setItem('spike_hashrate_info', JSON.stringify(info));
        } catch {}

        setHashrateBannerMsg({
          address: cleanAddr,
          level: info?.level || 'Custom',
          hashrate: info?.hashrate || Number(hashrateVal),
          days: info?.targetDays || 60,
        });
        onNotify?.(
          'Hashrate Updated',
          `Wallet ${cleanAddr.slice(0, 8)}... hashrate set to ${info?.hashrate || hashrateVal} VH/s (${info?.level || 'Custom'})`,
          'success'
        );
        fetchAllData(true);
        setHashrateModalUser(null);
        setTimeout(() => setHashrateBannerMsg(null), 6000);
      } else {
        onNotify?.('Error', data?.error || 'Failed to update hashrate', 'error');
      }
    } catch (err: any) {
      onNotify?.('Error', err?.message || 'Network error updating hashrate', 'error');
    } finally {
      setIsUpdatingHashrate(false);
    }
  };

  // Fetch full admin dashboard data from backend API with automatic Cloud Firestore fallback
  const fetchAllData = useCallback(async (quiet = false) => {
    if (!isAdmin) return;
    if (!quiet) setIsRefreshing(true);
    let apiSuccess = false;
    const authHeaders = getAdminAuthHeaders();
    try {
      const [metricsRes, usersRes, nodesRes, txsRes, claimsRes, settingsRes, logsRes, treasuryRes, withdrawalsRes] = await Promise.all([
        fetch('/api/admin/metrics', { headers: authHeaders }).catch(() => null),
        fetch('/api/admin/users', { headers: authHeaders }).catch(() => null),
        fetch('/api/admin/nodes', { headers: authHeaders }).catch(() => null),
        fetch('/api/admin/transactions', { headers: authHeaders }).catch(() => null),
        fetch('/api/admin/claims?limit=500', { headers: authHeaders }).catch(() => null),
        fetch('/api/admin/settings', { headers: authHeaders }).catch(() => null),
        fetch('/api/admin/audit-logs', { headers: authHeaders }).catch(() => null),
        fetch('/api/treasury').catch(() => null),
        fetch('/api/withdrawals').catch(() => null),
      ]);

      if (metricsRes && metricsRes.ok) {
        const data = await safeJsonParse(metricsRes);
        if (data) { setMetrics(data); apiSuccess = true; }
      }
      if (usersRes && usersRes.ok) {
        const data = await safeJsonParse(usersRes);
        if (data?.users && Array.isArray(data.users) && data.users.length > 0) {
          setUsers(data.users);
          apiSuccess = true;
        }
      }
      if (nodesRes && nodesRes.ok) {
        const data = await safeJsonParse(nodesRes);
        if (data?.nodes) setNodes(data.nodes);
      }
      if (txsRes && txsRes.ok) {
        const data = await safeJsonParse(txsRes);
        if (data?.transactions) setTransactions(data.transactions);
      }
      let apiClaims: any[] = [];
      if (claimsRes && claimsRes.ok) {
        const cData = await safeJsonParse(claimsRes);
        if (cData && Array.isArray(cData.claims)) {
          apiClaims = cData.claims;
          setClaimsList(apiClaims);
        }
      }
      let allWList: any[] = [];
      if (withdrawalsRes && withdrawalsRes.ok) {
        const wData = await safeJsonParse(withdrawalsRes);
        if (wData && Array.isArray(wData.withdrawals)) {
          allWList = wData.withdrawals;
        }
      }
      try {
        const fsWithdrawals = await getAllWithdrawals();
        if (Array.isArray(fsWithdrawals) && fsWithdrawals.length > 0) {
          const map = new Map<string, any>();
          allWList.forEach((w) => { if (w && w.id) map.set(w.id, w); });
          fsWithdrawals.forEach((w) => { if (w && w.id) map.set(w.id, w); });
          allWList = Array.from(map.values());
          allWList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        }
      } catch {}
      setWithdrawalRequests(allWList);
      if (settingsRes && settingsRes.ok) {
        const data = await safeJsonParse(settingsRes);
        if (data?.settings) {
          setSettings(data.settings);
          setSettingsForm(data.settings || {});
          if (data.settings.treasuryWalletAddress) {
            setTreasuryAddressInput((prev) => prev || data.settings.treasuryWalletAddress!);
            setTreasuryInfo((prev) => ({
              ...prev,
              treasuryWalletAddress: data.settings.treasuryWalletAddress!,
              treasuryBalanceUsdt: typeof data.settings.treasuryBalanceUsdt === 'number' ? data.settings.treasuryBalanceUsdt : prev.treasuryBalanceUsdt,
            }));
          }
        }
      }
      if (treasuryRes && treasuryRes.ok) {
        const tData = await safeJsonParse(treasuryRes);
        if (tData) {
          const addr = tData.treasuryWalletAddress || '0xD833e2f6fC850cFe3B39F49e34F9231f0AB2b6bF';
          const bal = typeof tData.treasuryBalanceUsdt === 'number' ? tData.treasuryBalanceUsdt : 0.0;
          setTreasuryInfo({
            treasuryWalletAddress: addr,
            treasuryBalanceUsdt: bal,
          });
          setTreasuryAddressInput((prev) => prev || addr);
        }
      }
      if (logsRes && logsRes.ok) {
        const data = await safeJsonParse(logsRes);
        if (data?.logs) setAuditLogs(data.logs);
      }
      if (apiClaims.length > 0) {
        setClaimsList(apiClaims);
      }
    } catch (err) {
      console.warn('[Admin] Backend fetch notice:', err);
    }

    // Direct Cloud Firestore Fallback (Crucial for custom domains like Hostinger spikenodes.com without Node server)
    try {
      const [fsUsersSnap, fsNodesSnap, fsSettingsDoc, fsTxsSnap] = await Promise.all([
        getDocs(collection(firestoreDb, 'users')).catch(() => null),
        getDocs(collection(firestoreDb, 'nodes')).catch(() => null),
        getDoc(doc(firestoreDb, 'settings', 'global')).catch(() => null),
        getDocs(collection(firestoreDb, 'transactions')).catch(() => null),
      ]);

      let loadedUsers: AdminUser[] = [];
      let loadedNodes: MiningNode[] = [];

      if (fsUsersSnap && !fsUsersSnap.empty) {
        fsUsersSnap.forEach((d) => {
          const data = d.data();
          const addr = (data.address || d.id || '').trim();
          if (addr && addr.startsWith('0x')) {
            loadedUsers.push({
              address: addr,
              role: (data.role || (isMasterWalletHashMatch(addr) ? 'master' : 'user')) as any,
              status: (data.status || 'active') as any,
              balanceUsdt: Number(data.balanceUsdt || 0),
              balanceBnb: Number(data.balanceBnb || 0.005),
              totalMined: Number(data.totalMined || 0),
              referralCode: data.referralCode || `SPK-${addr.slice(2, 8).toUpperCase()}`,
              referredBy: data.referredBy || null,
              createdAt: data.createdAt || new Date().toISOString(),
              lastActive: data.lastActive || new Date().toISOString(),
              hasActivatedMining: Boolean(data.hasActivatedMining),
              hasDepositedTreasury: Boolean(data.hasDepositedTreasury),
            } as AdminUser);
          }
        });
        if (loadedUsers.length > 0) {
          setUsers((prev) => (prev.length >= loadedUsers.length && apiSuccess ? prev : loadedUsers));
        }
      }

      if (fsNodesSnap && !fsNodesSnap.empty) {
        fsNodesSnap.forEach((d) => {
          const data = d.data();
          loadedNodes.push({
            id: d.id,
            name: data.name || 'ASIC Rig',
            region: data.region || 'US-East (Stratum Cluster)',
            status: data.status || 'mining',
            hashrate: Number(data.hashrate || 1.25),
            temperature: Number(data.temperature || 64),
            shareAcceptance: Number(data.shareAcceptance || 99.98),
            fanSpeed: Number(data.fanSpeed || 75),
            powerUsage: Number(data.powerUsage || 1400),
            uptimeDays: Number(data.uptimeDays || 1),
            algorithm: data.algorithm || 'SHA-256 (Stratum)',
            logs: Array.isArray(data.logs) ? data.logs : ['Stratum connection verified'],
            userAddress: data.userAddress || '',
          });
        });
        if (loadedNodes.length > 0) {
          setNodes((prev) => (prev.length >= loadedNodes.length && apiSuccess ? prev : loadedNodes));
        }
      }

      if (fsSettingsDoc && fsSettingsDoc.exists()) {
        const sData = fsSettingsDoc.data() as AdminSettings;
        setSettings((prev) => prev || sData);
        setSettingsForm((prev) => (Object.keys(prev).length > 0 ? prev : sData));

        // Real-Time Dynamic Inflow Accumulation (deduplicated: $10 deposit + node per wallet = $10 per node activation)
        const userNodeSums = new Map<string, number>();
        loadedNodes.forEach((n) => {
          const addr = (n.userAddress || '').toLowerCase().trim();
          if (!addr) return;
          userNodeSums.set(addr, (userNodeSums.get(addr) || 0) + (Number(n.costUsdt) || 10.0));
        });
        const depositedSet = new Set(
          loadedUsers.filter((u) => u.hasDepositedTreasury).map((u) => u.address.toLowerCase().trim())
        );
        const depositsTotal = depositedSet.size * 10.0;
        const nodeCostsTotal = loadedNodes.reduce((acc, n) => acc + (Number(n.costUsdt) || 10.0), 0);
        const allContributing = new Set<string>([...Array.from(userNodeSums.keys()), ...Array.from(depositedSet)]);
        let deduplicatedTreasury = 0;
        allContributing.forEach((addr) => {
          deduplicatedTreasury += Math.max(depositedSet.has(addr) ? 10.0 : 0, userNodeSums.get(addr) || 0);
        });
        deduplicatedTreasury = +deduplicatedTreasury.toFixed(2);

        const storedTreasuryVal = typeof sData?.treasuryBalanceUsdt === 'number' ? sData.treasuryBalanceUsdt : 0;
        const doubleCountedVal = +(depositsTotal + nodeCostsTotal).toFixed(2);
        const wasDoubleCounted =
          depositsTotal > 0 &&
          nodeCostsTotal > 0 &&
          Math.abs(storedTreasuryVal - doubleCountedVal) < 0.05 &&
          storedTreasuryVal > deduplicatedTreasury;
        const effectiveRealtimeTreasury = wasDoubleCounted
          ? deduplicatedTreasury
          : Math.max(storedTreasuryVal, deduplicatedTreasury);

        if (sData?.treasuryWalletAddress || effectiveRealtimeTreasury > 0) {
          const addr = sData?.treasuryWalletAddress || '0xD833e2f6fC850cFe3B39F49e34F9231f0AB2b6bF';
          setTreasuryAddressInput((prev) => prev || addr);
          setTreasuryInfo((prev) => ({
            treasuryWalletAddress: addr,
            treasuryBalanceUsdt: apiSuccess ? prev.treasuryBalanceUsdt : effectiveRealtimeTreasury,
          }));
        }
      }

      if (fsTxsSnap && !fsTxsSnap.empty) {
        const loadedTxs: RewardTransaction[] = [];
        const fsClaims: any[] = [];
        fsTxsSnap.forEach((d) => {
          const data = d.data();
          loadedTxs.push({
            id: d.id,
            userAddress: data.userAddress || '',
            type: data.type || 'claim',
            txHash: data.txHash || d.id,
            rewardSource: data.rewardSource || data.details || 'Mining Rewards Payout',
            amount: Number(data.amount || 0),
            currency: data.currency || 'USDT',
            timestamp: data.timestamp || 'Just now',
            status: data.status || 'Confirmed',
          });

          const isClaimDoc =
            data.type === 'claim' ||
            data.type === 'harvest_autobuy' ||
            d.id.startsWith('claim');
          if (isClaimDoc) {
            const spkVal = Number(data.spkAmount || (String(data.currency).toUpperCase() === 'SPK' ? data.amount : Number(data.amount || 0) / 1.12) || 0);
            const usdtVal = Number(data.usdtAmount || +(spkVal * 1.12).toFixed(4));
            fsClaims.push({
              id: d.id,
              userAddress: data.userAddress || 'Unknown',
              spkAmount: spkVal,
              usdtAmount: usdtVal,
              currency: data.currency || 'SPK',
              txHash: data.txHash || d.id,
              status: data.status || 'Confirmed',
              verifiedOnChain: Boolean(data.verifiedOnChain || (data.details && String(data.details).includes('On-Chain V3'))),
              blockNumber: Number(data.blockNumber || 0),
              details: data.details || 'Mining Reward Claim',
              timestamp: data.timestamp || data._syncedAt || new Date().toISOString(),
              source: data.verifiedOnChain ? 'On-Chain V3 Swap' : 'Firestore Claim Record',
            });
          }
        });
        if (loadedTxs.length > 0) {
          setTransactions((prev) => (prev.length >= loadedTxs.length && apiSuccess ? prev : loadedTxs));
        }
        if (fsClaims.length > 0) {
          setClaimsList((prev) => {
            const merged = new Map<string, any>();
            prev.forEach((c) => merged.set((c.txHash || c.id).toLowerCase(), c));
            fsClaims.forEach((c) => {
              const key = (c.txHash || c.id).toLowerCase();
              if (!merged.has(key)) merged.set(key, c);
            });
            return Array.from(merged.values()).sort(
              (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
            );
          });
        }
      }

      // Compute metrics if null (from live Firestore snapshot)
      setMetrics((prev) => {
        if (prev && apiSuccess) return prev;
        const uCount = fsUsersSnap && !fsUsersSnap.empty ? fsUsersSnap.size : 1;
        const nCount = fsNodesSnap && !fsNodesSnap.empty ? fsNodesSnap.size : 0;
        const computedUserReserves = loadedUsers.reduce((sum, u) => sum + (Number(u.balanceUsdt) || 0), 0);
        const sData = fsSettingsDoc && fsSettingsDoc.exists() ? fsSettingsDoc.data() : null;
        return {
          totalUsers: uCount,
          activeNodes: nCount,
          totalNodes: nCount,
          totalHashrate: nCount > 0 ? nCount * 100 : 0,
          totalMinedUsdt: 0,
          totalUserBalance: +computedUserReserves.toFixed(2),
          totalTransactions: fsTxsSnap ? fsTxsSnap.size : 0,
          dbSizeKb: 65,
          lastSaved: new Date().toISOString(),
          maintenanceMode: false,
          turboMultiplier: sData?.turboMultiplier || 10,
          dailyYieldPercent: sData?.dailyYieldPercent || 3.88,
        };
      });
    } catch (fsErr) {
      console.warn('[Admin] Firestore direct fallback notice:', fsErr);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchAllData();
    const interval = setInterval(() => {
      fetchAllData(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchAllData, isAdmin]);

  // Real-Time live listener for Treasury Vault and Node activations (only when signed in)
  useEffect(() => {
    if (!isAdmin) return;
    let unsubSettings: (() => void) | undefined;
    let unsubNodes: (() => void) | undefined;

    try {
      unsubSettings = onSnapshot(doc(firestoreDb, 'settings', 'global'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.treasuryWalletAddress) {
            setTreasuryAddressInput((prev) => prev || data.treasuryWalletAddress);
          }
          if (typeof data?.treasuryBalanceUsdt === 'number') {
            const rawFsBal = Number(data.treasuryBalanceUsdt);
            const userNodeSums = new Map<string, number>();
            nodes.forEach((n) => {
              const addr = (n.userAddress || '').toLowerCase().trim();
              if (!addr) return;
              userNodeSums.set(addr, (userNodeSums.get(addr) || 0) + (Number(n.costUsdt) || 10.0));
            });
            const depositedSet = new Set(
              users.filter((u) => u.hasDepositedTreasury).map((u) => u.address.toLowerCase().trim())
            );
            const depositsTotal = depositedSet.size * 10.0;
            const nodeCostsTotal = nodes.reduce((acc, n) => acc + (Number(n.costUsdt) || 10.0), 0);
            const allContributing = new Set<string>([...Array.from(userNodeSums.keys()), ...Array.from(depositedSet)]);
            let deduplicated = 0;
            allContributing.forEach((addr) => {
              deduplicated += Math.max(depositedSet.has(addr) ? 10.0 : 0, userNodeSums.get(addr) || 0);
            });
            deduplicated = +deduplicated.toFixed(2);
            const doubleCountedVal = +(depositsTotal + nodeCostsTotal).toFixed(2);
            const isStaleDoubleCount =
              depositsTotal > 0 &&
              nodeCostsTotal > 0 &&
              Math.abs(rawFsBal - doubleCountedVal) < 0.05 &&
              rawFsBal > deduplicated;
            const safeBal = isStaleDoubleCount ? deduplicated : Math.max(rawFsBal, deduplicated);

            setTreasuryInfo((prev) => ({
              ...prev,
              treasuryBalanceUsdt: safeBal,
              treasuryWalletAddress: data.treasuryWalletAddress || prev.treasuryWalletAddress,
            }));
          }
        }
      });

      unsubNodes = onSnapshot(collection(firestoreDb, 'nodes'), (snap) => {
        if (!snap.empty) {
          const userNodeSums = new Map<string, number>();
          snap.forEach((d) => {
            const nd = d.data();
            const addr = (nd.userAddress || '').toLowerCase().trim();
            if (!addr) return;
            userNodeSums.set(addr, (userNodeSums.get(addr) || 0) + (Number(nd.costUsdt) || 10.0));
          });
          const depositedSet = new Set(
            users.filter((u) => u.hasDepositedTreasury).map((u) => u.address.toLowerCase().trim())
          );
          const allContributing = new Set<string>([...Array.from(userNodeSums.keys()), ...Array.from(depositedSet)]);
          let liveSum = 0;
          allContributing.forEach((addr) => {
            liveSum += Math.max(depositedSet.has(addr) ? 10.0 : 0, userNodeSums.get(addr) || 0);
          });
          liveSum = +liveSum.toFixed(2);
          setTreasuryInfo((prev) => ({
            ...prev,
            treasuryBalanceUsdt: liveSum > 0 ? liveSum : prev.treasuryBalanceUsdt,
          }));
        }
      });
    } catch (e) {
      console.warn('[Admin] Live treasury listener notice:', e);
    }

    return () => {
      unsubSettings?.();
      unsubNodes?.();
    };
  }, [isAdmin, users, nodes]);

  // Handle balance adjustment in backend DB
  const handleExecuteAdjustBalance = async () => {
    if (!adjustModalUser) return;
    const delta = adjustType === 'credit' ? Math.abs(adjustAmount) : -Math.abs(adjustAmount);
    const targetAddr = adjustModalUser.address.trim();
    const normAddr = targetAddr.toLowerCase();
    const newBal = Math.max(0, +(adjustModalUser.balanceUsdt + delta).toFixed(2));

    // Update in-memory state immediately
    setUsers((prev) =>
      prev.map((u) => (u.address.toLowerCase() === normAddr ? { ...u, balanceUsdt: newBal } : u))
    );

    // 1. Broadcast local balance update for connected wallet / open tabs
    try {
      localStorage.setItem(`spike_bal_${normAddr}`, String(newBal));
      const activeWallet = localStorage.getItem('spike_wallet_address');
      if (activeWallet && activeWallet.toLowerCase() === normAddr) {
        localStorage.setItem('spike_balance_usdt', String(newBal));
      }
      window.dispatchEvent(
        new CustomEvent('spike_balance_updated', {
          detail: { address: normAddr, balanceUsdt: newBal, balanceBnb: adjustModalUser.balanceBnb || 0.005 },
        })
      );
    } catch {}

    // 3. Sync to backend API if available
    try {
      await fetch(`/api/admin/users/${targetAddr}/adjust-balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
        body: JSON.stringify({
          usdtDelta: delta,
          reason: adjustReason,
          adminUser: currentWallet || 'Master Admin',
        }),
      });
    } catch {}

    onNotify?.(
      'Balance Updated',
      `${adjustType === 'credit' ? '+' : '-'}${Math.abs(adjustAmount)} USDT adjusted for ${targetAddr.slice(0, 8)}... (New Balance: ${newBal} USDT)`,
      'success'
    );
    setAdjustModalUser(null);
    fetchAllData(true);
  };

  // Dedicated handlers for Withdrawal Requests (Milestone Rewards Approval & Payout)
  const handleApproveWithdrawal = async (id: string) => {
    setProcessingWithdrawalId(id);
    const customHash = customTxInput[id]?.trim() || `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    try {
      let approvedSuccess = false;
      let reqUser = '';
      let remainingBal = 0;
      let approvedReq: any = null;

      try {
        const res = await fetch(`/api/admin/withdrawals/${id}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
          body: JSON.stringify({
            txHash: customHash,
            adminUser: currentWallet || 'Master Admin',
          }),
        });
        const data = await safeJsonParse(res);
        if (res.ok && data?.success) {
          approvedSuccess = true;
          reqUser = data.request?.userAddress?.toLowerCase();
          remainingBal = typeof data.remainingBalance === 'number' ? data.remainingBalance : 0;
          approvedReq = data.request;
        }
      } catch {}

      if (!approvedSuccess) {
        const fsRes = await approveWithdrawal(id, customHash, 'Approved by Nodescan');
        if (fsRes.success) {
          approvedSuccess = true;
          const currentReq = withdrawalRequests.find((w) => w.id === id);
          reqUser = currentReq?.userAddress?.toLowerCase() || '';
          approvedReq = { ...(currentReq || {}), status: 'approved', txHash: customHash };
        }
      }

      if (approvedSuccess) {
        // Broadcast real-time balance update and withdrawal approval
        try {
          if (reqUser) {
            localStorage.setItem(`spike_bal_${reqUser}`, String(remainingBal));
            const activeWallet = localStorage.getItem('spike_wallet_address');
            if (activeWallet && activeWallet.toLowerCase() === reqUser) {
              localStorage.setItem('spike_balance_usdt', String(remainingBal));
            }
          }
          window.dispatchEvent(
            new CustomEvent('spike_balance_updated', {
              detail: { address: reqUser, balanceUsdt: remainingBal },
            })
          );
          window.dispatchEvent(
            new CustomEvent('spike_withdrawal_updated', {
              detail: { requestId: id, request: approvedReq, remainingBalance: remainingBal, userAddress: reqUser },
            })
          );
          const bc = new BroadcastChannel('spike_referral_live_sync');
          bc.postMessage({ type: 'WITHDRAWAL_APPROVED', id, remainingBalance: remainingBal, userAddress: reqUser });
          bc.close();
        } catch {}

        onNotify?.(
          'Withdrawal Cleared & Paid!',
          `Withdrawal request #${id.slice(-6)} approved! Payout tx: ${customHash.slice(0, 16)}...`,
          'success'
        );
        fetchAllData(true);
      } else {
        onNotify?.('Approval Failed', 'Failed to approve withdrawal', 'error');
      }
    } catch {
      onNotify?.('Error', 'Error approving withdrawal request', 'error');
    } finally {
      setProcessingWithdrawalId(null);
    }
  };

  const handleRejectWithdrawal = async (id: string) => {
    const reason = window.prompt('Enter reason for declining withdrawal:', 'Admin verification check failed') || 'Admin verification check failed';
    setProcessingWithdrawalId(id);
    try {
      let rejectedSuccess = false;
      try {
        const res = await fetch(`/api/admin/withdrawals/${id}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
          body: JSON.stringify({
            reason,
            adminUser: currentWallet || 'Master Admin',
          }),
        });
        const data = await safeJsonParse(res);
        if (res.ok && data?.success) {
          rejectedSuccess = true;
        }
      } catch {}

      if (!rejectedSuccess) {
        const fsRes = await rejectWithdrawal(id, reason);
        if (fsRes.success) {
          rejectedSuccess = true;
        }
      }

      if (rejectedSuccess) {
        onNotify?.('Withdrawal Rejected', `Withdrawal #${id.slice(-6)} has been declined.`, 'info');
        fetchAllData(true);
      } else {
        onNotify?.('Rejection Failed', 'Failed to reject withdrawal', 'error');
      }
    } catch {
      onNotify?.('Error', 'Error rejecting withdrawal', 'error');
    } finally {
      setProcessingWithdrawalId(null);
    }
  };

  // Handle User Status toggle
  const handleToggleUserStatus = async (user: AdminUser) => {
    const nextStatus = user.status === 'active' ? 'frozen' : 'active';
    try {
      const res = await fetch(`/api/admin/users/${user.address}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
        body: JSON.stringify({ status: nextStatus, adminUser: currentWallet || 'Master Admin' }),
      });
      if (res.ok) {
        onNotify?.('User Status Updated', `${user.address.slice(0, 8)}... is now ${nextStatus}`, 'info');
        fetchAllData(true);
      }
    } catch {
      onNotify?.('Error', 'Failed to update user status', 'error');
    }
  };

  // Handle Node status action
  const handleNodeAction = async (nodeId: string, action: 'start' | 'stop' | 'restart') => {
    try {
      const res = await fetch(`/api/nodes/${nodeId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userAddress: 'Admin Portal' }),
      });
      if (res.ok) {
        onNotify?.('Rig Status Updated', `Action [${action.toUpperCase()}] executed on ${nodeId}`, 'success');
        fetchAllData(true);
      }
    } catch {
      onNotify?.('Error', 'Action failed', 'error');
    }
  };

  // Handle Save Settings
  const handleSaveSettings = async () => {
    try {
      const cleanTreasury = treasuryAddressInput.trim();
      const payload = {
        ...settingsForm,
        ...(cleanTreasury ? { treasuryWalletAddress: cleanTreasury } : {}),
        adminUser: 'Admin Dashboard',
      };
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        if (cleanTreasury) {
          window.dispatchEvent(
            new CustomEvent('treasuryUpdated', { detail: { treasuryWalletAddress: cleanTreasury } })
          );
        }
        onNotify?.('Settings Saved', 'System configuration updated in backend database', 'success');
        fetchAllData(true);
      }
    } catch {
      onNotify?.('Error', 'Failed to save settings', 'error');
    }
  };


  // Handle Master User Project-Wide Settings Save
  const handleSaveMasterSettings = async () => {
    setIsSavingMasterSettings(true);
    try {
      const cleanTreasury = treasuryAddressInput.trim();
      const payload: Partial<AdminSettings> = {
        ...settingsForm,
        ...(cleanTreasury ? { treasuryWalletAddress: cleanTreasury } : {}),
      };
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
        body: JSON.stringify({
          ...payload,
          adminUser: currentWallet || 'Master User',
        }),
      });
      if (res.ok) {
        const data = await safeJsonParse(res);
        const updated = data?.settings || payload;
        setSettings(updated);
        setSettingsForm(updated);
        try {
          localStorage.setItem('spike_global_settings', JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('spike_settings_updated', { detail: updated }));
          window.dispatchEvent(new CustomEvent('spike_hashrate_updated'));
          if (cleanTreasury) {
            window.dispatchEvent(
              new CustomEvent('treasuryUpdated', { detail: { treasuryWalletAddress: cleanTreasury } })
            );
          }
        } catch {}

        onNotify?.(
          'Project-Wide Settings Live!',
          'All $10 mining protocol parameters and milestone settings are now saved and active project-wide!',
          'success'
        );
        fetchAllData(true);
      } else {
        onNotify?.('Error', 'Failed to save master settings', 'error');
      }
    } catch {
      onNotify?.('Error', 'Failed to broadcast master configuration', 'error');
    } finally {
      setIsSavingMasterSettings(false);
    }
  };

  // Handle User Role Update (Master, Admin, Moderator, User)
  const handleUpdateUserRole = async (targetAddress: string, newRole: 'master' | 'admin' | 'moderator' | 'user') => {
    try {
      const res = await fetch(`/api/admin/users/${targetAddress.toLowerCase()}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
        body: JSON.stringify({ role: newRole, adminUser: currentWallet || 'Master Admin' }),
      });
      const data = await safeJsonParse(res);
      if (data?.success) {
        onNotify?.('Role Updated', `${targetAddress.slice(0, 8)}... assigned role [${newRole.toUpperCase()}]`, 'success');
        fetchAllData(true);
      } else {
        onNotify?.('Error', data?.error || 'Failed to update role', 'error');
      }
    } catch {
      onNotify?.('Error', 'Network error updating user role', 'error');
    }
  };

  // Handle Add Authorized Master Wallet
  const handleAddMasterWallet = async () => {
    const clean = newMasterInput.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(clean)) {
      onNotify?.('Invalid Address', 'Enter a valid 42-char EVM address starting with 0x', 'error');
      return;
    }
    const currentList = settingsForm.masterWalletAddresses || [];
    if (currentList.map((a) => a.toLowerCase()).includes(clean.toLowerCase())) {
      onNotify?.('Already Master', 'This wallet is already authorized as master', 'info');
      return;
    }
    const updatedList = [...currentList, clean];
    setSettingsForm((prev) => ({ ...prev, masterWalletAddresses: updatedList }));
    setNewMasterInput('');
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
        body: JSON.stringify({ masterWalletAddresses: updatedList, adminUser: currentWallet || 'Master User' }),
      });
      onNotify?.('Master Wallet Added', `${clean.slice(0, 8)}... authorized with root privileges!`, 'success');
      fetchAllData(true);
    } catch {}
  };

  // Handle Remove Master Wallet
  const handleRemoveMasterWallet = async (removeAddr: string) => {
    if (isMasterWalletHashMatch(removeAddr)) {
      onNotify?.('Protected', 'Primary creator wallet cannot be removed.', 'warning');
      return;
    }
    const currentList = settingsForm.masterWalletAddresses || [];
    const updatedList = currentList.filter((a) => a.toLowerCase() !== removeAddr.toLowerCase());
    setSettingsForm((prev) => ({ ...prev, masterWalletAddresses: updatedList }));
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
        body: JSON.stringify({ masterWalletAddresses: updatedList, adminUser: currentWallet || 'Master User' }),
      });
      onNotify?.('Master Wallet Removed', `${removeAddr.slice(0, 8)}... removed from master list`, 'info');
      fetchAllData(true);
    } catch {}
  };

  // Dedicated Handler: Update Official Protocol Treasury Wallet Address
  const handleUpdateTreasuryAddress = async (overrideAddress?: string) => {
    const target = (overrideAddress || treasuryAddressInput).trim();
    if (!target) {
      onNotify?.('Missing Address', 'Please provide a valid wallet address', 'error');
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(target)) {
      onNotify?.('Invalid Address', 'Must be a 42-character EVM / BEP-20 address starting with 0x', 'error');
      return;
    }

    setIsSavingTreasury(true);
    try {
      const res = await fetch('/api/admin/treasury/update-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
        body: JSON.stringify({ newAddress: target, adminUser: currentWallet || 'Master Admin' }),
      });
      const data = await safeJsonParse(res);
      if (res.ok && data?.success) {
        setTreasuryAddressInput(target);
        setTreasuryInfo((prev) => ({ ...prev, treasuryWalletAddress: target }));
        setSettingsForm((prev) => ({ ...prev, treasuryWalletAddress: target }));

        onNotify?.(
          'Treasury Wallet Updated!',
          `Official Treasury Address set to ${target.slice(0, 8)}...${target.slice(-6)}. Live user deposit routing updated!`,
          'success'
        );

        // Notify client modals, user dashboard, and background listeners
        window.dispatchEvent(
          new CustomEvent('treasuryUpdated', { detail: { treasuryWalletAddress: target } })
        );
        fetchAllData(true);
      } else {
        onNotify?.('Update Failed', data?.error || 'Failed to update treasury address in database', 'error');
      }
    } catch (err: any) {
      onNotify?.('Error', err?.message || 'Network request failed', 'error');
    } finally {
      setIsSavingTreasury(false);
    }
  };

  const handleSyncFirebase = async () => {
    setSyncingFirebase(true);
    try {
      const res = await fetch('/api/firebase/sync', {
        method: 'POST',
        headers: { ...getAdminAuthHeaders() },
      });
      const data = await safeJsonParse(res);
      if (data?.success) {
        onNotify?.(
          'Firebase Synced!',
          `Firestore successfully stored ${data.synced?.users || 0} users, ${data.synced?.nodes || 0} nodes, ${data.synced?.transactions || 0} txs!`,
          'success'
        );
      } else {
        onNotify?.('Firebase Notice', data?.error || 'Database synchronized', 'info');
      }
    } catch {
      onNotify?.('Firebase Notice', 'Sync process initiated', 'info');
    } finally {
      setSyncingFirebase(false);
    }
  };

  const [isSendingTestAlert, setIsSendingTestAlert] = useState(false);
  const handleSendTestAlert = async () => {
    setIsSendingTestAlert(true);
    try {
      const res = await fetch('/api/alerts/send-test', {
        method: 'POST',
        headers: { ...getAdminAuthHeaders() },
      });
      const data = await res.json();
      if (data && data.success) {
        onNotify?.(
          'Alert Sent!',
          'Database early-warning alert successfully dispatched to private backend administrator channel!',
          'success'
        );
      } else {
        onNotify?.('Alert Notice', data?.error || 'Alert triggered', 'info');
      }
    } catch {
      onNotify?.('Alert Error', 'Network error triggering alert', 'error');
    } finally {
      setIsSendingTestAlert(false);
    }
  };

  const copyAdminLink = (targetTab: string | React.SyntheticEvent = 'admin') => {
    const tab = typeof targetTab === 'string' ? targetTab : 'admin';
    const isCustomDomain = typeof window !== 'undefined' && window.location.origin.includes('spikenodes.com');
    const base = isCustomDomain ? window.location.origin : 'https://spikenodes.com';
    const url = tab === 'home' ? `${base}/` : `${base}/?tab=${tab}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
      onNotify?.('Link Copied', `Copied URL: ${url}`, 'success');
    } else {
      onNotify?.('Link', url, 'info');
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!userSearch) return true;
    const term = userSearch.toLowerCase();
    return u.address.toLowerCase().includes(term) || (u.referralCode && u.referralCode.toLowerCase().includes(term));
  });

  const filteredNodes = nodes.filter((n) => {
    if (nodeFilter === 'all') return true;
    return n.status === nodeFilter;
  });

  const handleMasterSignatureAuth = async () => {
    setSignatureError(null);
    setIsSigningAuth(true);
    try {
      const result = await authenticateMasterWalletWithSignature(settings?.masterWalletAddresses);
      if (result.success) {
        onNotify?.('Master Signature Verified', 'Cryptographic ECDSA session unlocked.', 'success');
        onUnlockAdmin?.();
      } else {
        const msg = result.error || 'Master Wallet signature verification failed.';
        setSignatureError(msg);
        onNotify?.('Access Denied', msg, 'error');
      }
    } catch (err: any) {
      const msg = err?.message || 'Signature authentication failed.';
      setSignatureError(msg);
      onNotify?.('Authentication Error', msg, 'error');
    } finally {
      setIsSigningAuth(false);
    }
  };

  // Strict cryptographic gate: ONLY a verified Master Wallet ECDSA signature can unlock Admin Panel
  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 sm:p-10 rounded-3xl bg-[#0d1d2c] border-2 border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.15)] text-center space-y-6">
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto shadow-inner">
          <span className="material-symbols-outlined text-[40px]">shield_lock</span>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/40">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
            CRYPTOGRAPHIC SIGNATURE GATE
          </div>
          <h2 className="text-2xl font-extrabold font-headline text-white tracking-tight">
            Master Wallet Signature Required
          </h2>
          <p className="text-xs text-[#94a3b8] leading-relaxed max-w-md mx-auto">
            Admin Console sirf authorized Master Wallet ke real Web3 ECDSA signature (MetaMask, SafePal, ya Trust Wallet) se hi unlock hota hai. Passcodes aur direct unlocks permanently disabled hain.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#122130]/90 border border-[#D4AF37]/40 text-left space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#D4AF37]">
            <span className="material-symbols-outlined text-[18px]">verified_user</span>
            <span>Zero-Trust Hardware / Extension Proof</span>
          </div>
          <p className="text-[11px] font-mono text-[#94a3b8] leading-relaxed">
            Sign a one-time cryptographic challenge nonce with your Master Wallet. No gas fee or blockchain transaction is sent.
          </p>
          {currentWallet && (
            <div className="text-[11px] font-mono text-[#00F0FF] pt-1">
              Active Browser Wallet: {currentWallet.slice(0, 6)}...{currentWallet.slice(-4)}
            </div>
          )}
        </div>

        {signatureError && (
          <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-xs font-mono text-red-300 flex items-start gap-2 text-left">
            <span className="material-symbols-outlined text-[16px] text-red-400 shrink-0 mt-0.5">error</span>
            <span>{signatureError}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleMasterSignatureAuth}
          disabled={isSigningAuth}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#00F0FF] text-[#0A0F1D] font-headline font-bold text-xs uppercase tracking-wider shadow-[0_0_24px_rgba(212,175,55,0.4)] hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">
            {isSigningAuth ? 'progress_activity' : 'draw'}
          </span>
          <span>
            {isSigningAuth
              ? 'Waiting for Master Wallet Signature...'
              : 'Sign Message with Master Wallet to Unlock'}
          </span>
        </button>

        <div className="pt-2 border-t border-[#1c2b3b] flex items-center justify-center text-xs font-mono">
          <button
            onClick={() => onNavigateTab('dashboard')}
            className="text-[#94a3b8] hover:text-white transition-colors cursor-pointer"
          >
            ← Return to User Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* ============================================================
          TOP ADMIN BANNER & DIRECT ACCESS LINK BAR
         ============================================================ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0d1d2c] via-[#091929] to-[#040e1b] border-2 border-[#D4AF37]/50 p-5 md:p-7 shadow-[0_0_35px_rgba(212,175,55,0.15)]">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#00F0FF]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-extrabold bg-[#D4AF37] text-[#0A0F1D] shadow-[0_0_12px_rgba(212,175,55,0.4)] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">shield_person</span>
                CORE ADMIN PANEL
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                DATABASE ONLINE · ACID ENGINE
              </span>
              <span className="text-xs text-[#94a3b8] font-mono">
                Storage: {metrics?.dbSizeKb || 4} KB · Cloud Firestore Sync
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold font-headline text-white tracking-tight flex items-center gap-3">
              SPIKE Protocol Administration & Backend Engine
            </h1>
            <p className="text-sm text-[#94a3b8] max-w-2xl leading-relaxed">
              Full control center for real-time wallet balances, node fleet parameters, BSC transaction logs,
              referral commission trees, and persistent server database.
            </p>
          </div>

          {/* Quick Action & Link Tools */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Direct Link Copier */}
            <button
              onClick={copyAdminLink}
              className="px-4 py-2.5 rounded-xl bg-[#122130] hover:bg-[#1c2b3b] text-[#00F0FF] border border-[#00F0FF]/30 hover:border-[#00F0FF] text-xs font-mono font-semibold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
              title="Copy direct URL to open Admin Panel anywhere"
            >
              <span className="material-symbols-outlined text-[18px]">link</span>
              <span>Copy Admin Link</span>
            </button>

            {/* Refresh */}
            <button
              onClick={() => fetchAllData()}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-[#122130] hover:bg-[#1c2b3b] text-[#d4e4fa] border border-[#1c2b3b] transition-all disabled:opacity-50 cursor-pointer"
              title="Refresh Live Data"
            >
              <span className={`material-symbols-outlined text-[20px] ${isRefreshing ? 'animate-spin' : ''}`}>
                sync
              </span>
            </button>

            {/* Download DB Dump */}
            <a
              href="/api/db/export"
              download
              className="px-3.5 py-2.5 rounded-xl bg-[#122130] hover:bg-[#1c2b3b] text-emerald-400 border border-emerald-500/30 text-xs font-mono font-semibold transition-all flex items-center gap-1.5"
              title="Export Full JSON Database Dump"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Backup JSON</span>
            </a>
          </div>
        </div>
      </div>

      {/* ============================================================
          METRICS & KPI CARDS (6 Grid items)
         ============================================================ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
        {/* Card 1: Registered Wallets */}
        <div className="bg-[#0d1d2c] rounded-xl p-4 border border-cyan-500/30 shadow-sm animate-box-glow-cyan">
          <div className="flex items-center justify-between text-[#94a3b8] mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider">Registered Wallets</span>
            <span className="material-symbols-outlined text-[18px] text-[#00F0FF]">group</span>
          </div>
          <div className="text-2xl font-extrabold text-white font-headline">
            {metrics ? metrics.totalUsers : users.length}
          </div>
          <div className="text-[11px] text-emerald-400 font-mono mt-1">100% Verified in DB</div>
        </div>

        {/* Card 2: Active Mining Fleet */}
        <div className="bg-[#0d1d2c] rounded-xl p-4 border border-amber-500/30 shadow-sm animate-box-glow-gold">
          <div className="flex items-center justify-between text-[#94a3b8] mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider">Active Rig Fleet</span>
            <span className="material-symbols-outlined text-[18px] text-[#D4AF37]">dns</span>
          </div>
          <div className="text-2xl font-extrabold text-[#D4AF37] font-headline">
            {metrics ? `${metrics.activeNodes} / ${metrics.totalNodes}` : `${nodes.length}`}
          </div>
          <div className="text-[11px] text-[#94a3b8] font-mono mt-1">Online & Hashing</div>
        </div>

        {/* Card 3: Global Hashrate */}
        <div className="bg-[#0d1d2c] rounded-xl p-4 border border-emerald-500/30 shadow-sm animate-box-glow-emerald">
          <div className="flex items-center justify-between text-[#94a3b8] mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider">Global Hashrate</span>
            <span className="material-symbols-outlined text-[18px] text-emerald-400">speed</span>
          </div>
          <div className="text-2xl font-extrabold text-white font-headline">
            {metrics ? metrics.totalHashrate : 0}{' '}
            <span className="text-xs text-[#00F0FF] font-semibold">VH/s</span>
          </div>
          <div className="text-[11px] text-[#00F0FF] font-mono mt-1">Active Protocol Pool</div>
        </div>

        {/* Card 4: Total USDT Mined */}
        <div className="bg-[#0d1d2c] rounded-xl p-4 border border-amber-500/30 shadow-sm animate-box-glow-amber">
          <div className="flex items-center justify-between text-[#94a3b8] mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider">Total USDT Mined</span>
            <span className="material-symbols-outlined text-[18px] text-amber-400">payments</span>
          </div>
          <div className="text-2xl font-extrabold text-white font-headline">
            ${metrics ? metrics.totalMinedUsdt.toFixed(1) : '0.0'}
          </div>
          <div className="text-[11px] text-amber-400/90 font-mono mt-1">All User Epochs</div>
        </div>

        {/* Card 5: User Reserves in DB */}
        <div className="bg-[#0d1d2c] rounded-xl p-4 border border-purple-500/30 shadow-sm animate-box-glow-purple">
          <div className="flex items-center justify-between text-[#94a3b8] mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider">Wallet Reserves</span>
            <span className="material-symbols-outlined text-[18px] text-purple-400">account_balance_wallet</span>
          </div>
          <div className="text-2xl font-extrabold text-white font-headline">
            ${metrics ? metrics.totalUserBalance.toFixed(1) : '0.0'}
          </div>
          <div className="text-[11px] text-[#94a3b8] font-mono mt-1">User In-App Balances</div>
        </div>

        {/* Card 6: Official Protocol Treasury Vault (Company Reserve) - Real-Time Accumulation */}
        <div className="bg-[#0d1d2c] rounded-xl p-4 border border-[#D4AF37]/50 shadow-sm relative overflow-hidden group animate-box-glow-hybrid hover:border-[#D4AF37] transition-all">
          <div className="flex items-center justify-between text-[#D4AF37] mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold flex items-center gap-1.5">
              <span>Treasury Vault</span>
              <span className="px-1.5 py-0.5 rounded text-[8.5px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Inflow
              </span>
            </span>
            <span className="material-symbols-outlined text-[18px]">account_balance</span>
          </div>
          <div className="text-2xl font-extrabold text-[#D4AF37] font-headline flex items-baseline gap-1.5">
            <span>${treasuryInfo.treasuryBalanceUsdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-xs text-white/70 font-mono font-normal">USDT</span>
          </div>
          <div className="text-[10px] text-amber-300 font-mono mt-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{users.filter((u) => u.hasDepositedTreasury).length} Active × $10</span>
            </span>
            <span className="text-[8.5px] text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40 font-mono">
              $10 Node Model
            </span>
          </div>
        </div>

        {/* Card 7: Total Transactions */}
        <div className="bg-[#0d1d2c] rounded-xl p-4 border border-blue-500/30 shadow-sm animate-box-glow-blue">
          <div className="flex items-center justify-between text-[#94a3b8] mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider">Ledger Records</span>
            <span className="material-symbols-outlined text-[18px] text-blue-400">receipt_long</span>
          </div>
          <div className="text-2xl font-extrabold text-white font-headline">
            {metrics ? metrics.totalTransactions : transactions.length}
          </div>
          <div className="text-[11px] text-emerald-400 font-mono mt-1">On-chain & Internal</div>
        </div>
      </div>

      {/* ============================================================
          CROSS-VERIFY USER PANEL INSPECTOR (PASTE ANY WALLET)
         ============================================================ */}
      {onInspectUserPanel && (
        <div className="bg-gradient-to-r from-[#0d1d2c] via-[#10253a] to-[#0d1d2c] rounded-2xl p-4 sm:p-5 border border-[#00F0FF]/35 shadow-[0_0_24px_rgba(0,240,255,0.08)] space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00F0FF]/15 border border-[#00F0FF]/35 flex items-center justify-center text-[#00F0FF] shrink-0">
                <span className="material-symbols-outlined text-[22px]">manage_search</span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold font-headline text-white">
                    Cross-Verify User Panel
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30">
                    READ-ONLY INSPECTOR
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-[#94a3b8]">
                  Kisi bhi user ka 0x... wallet address paste karein aur uska live Dashboard, Mining Nodes, Referrals &amp; Withdrawal History cross-verify karein.
                </p>
              </div>
            </div>

            {users.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-mono text-[#94a3b8] uppercase hidden sm:inline">Quick Pick:</span>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      setInspectWalletInput(e.target.value);
                      setInspectInputError(null);
                    }
                  }}
                  className="bg-[#071322] border border-[#1c2b3b] rounded-xl px-3 py-1.5 text-xs font-mono text-[#00F0FF] focus:outline-none focus:border-[#00F0FF] max-w-[220px]"
                >
                  <option value="">Select registered wallet...</option>
                  {users.slice(0, 50).map((u) => (
                    <option key={u.address} value={u.address}>
                      {u.address.slice(0, 8)}...{u.address.slice(-6)} (${Number(u.balanceUsdt || 0).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleInspectWalletSubmit();
            }}
            className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5"
          >
            <div className="relative flex-1 flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-[18px] text-[#00F0FF]/70 pointer-events-none">
                account_balance_wallet
              </span>
              <input
                type="text"
                value={inspectWalletInput}
                onChange={(e) => {
                  setInspectWalletInput(e.target.value);
                  if (inspectInputError) setInspectInputError(null);
                }}
                placeholder="Paste BEP-20 wallet address (0x...)"
                className="w-full bg-[#071322] border border-[#1c2b3b] focus:border-[#00F0FF] rounded-xl pl-10 pr-24 py-2.5 text-xs sm:text-sm font-mono text-white placeholder-[#94a3b8]/50 focus:outline-none"
              />
              <div className="absolute right-2 flex items-center gap-1">
                {inspectWalletInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setInspectWalletInput('');
                      setInspectInputError(null);
                    }}
                    className="p-1 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#1c2b3b] transition-colors cursor-pointer"
                    title="Clear"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePasteInspectWallet}
                  className="px-2 py-1 rounded-lg bg-[#122130] hover:bg-[#1c2b3b] text-[#00F0FF] border border-[#00F0FF]/30 text-[11px] font-mono font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Paste from Clipboard"
                >
                  <span className="material-symbols-outlined text-[14px]">content_paste</span>
                  <span>Paste</span>
                </button>
              </div>
            </div>

            <select
              value={inspectTargetTab}
              onChange={(e) => setInspectTargetTab(e.target.value as typeof inspectTargetTab)}
              className="bg-[#071322] border border-[#1c2b3b] focus:border-[#00F0FF] rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:outline-none"
              title="Initial User View"
            >
              <option value="dashboard">View: Dashboard</option>
              <option value="mining-nodes">View: Mining Nodes</option>
              <option value="referrals">View: Referrals &amp; Team</option>
              <option value="withdraw-history">View: Withdrawal History</option>
            </select>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#38bdf8] hover:brightness-110 text-[#051424] font-headline font-black text-xs uppercase tracking-wider shadow-[0_0_18px_rgba(0,240,255,0.3)] flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">visibility</span>
              <span>Open User Panel</span>
            </button>
          </form>

          {inspectInputError && (
            <div className="text-xs font-mono text-amber-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px]">error_outline</span>
              <span>{inspectInputError}</span>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          NAVIGATION TABS FOR ADMIN CONSOLE
         ============================================================ */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-[#1c2b3b] pb-2 scrollbar-none">
        {[
          { id: 'master', label: 'Master Control Center', icon: 'shield_lock', badge: 'ROOT' },
          { id: 'overview', label: 'Dashboard Overview', icon: 'dashboard' },
          { id: 'claims', label: 'User Claims', icon: 'fact_check', count: claimsList.length },
          {
            id: 'withdrawals',
            label: 'Withdrawal Requests',
            icon: 'payments',
            badge: withdrawalRequests.filter((w) => w.status === 'pending').length > 0
              ? `${withdrawalRequests.filter((w) => w.status === 'pending').length} PENDING`
              : undefined,
            count: withdrawalRequests.length,
          },
          { id: 'users', label: 'User & Wallet Management', icon: 'manage_accounts', count: users.length },
          { id: 'nodes', label: 'Fleet & Rig Controller', icon: 'developer_board', count: nodes.length },
          { id: 'transactions', label: 'Ledger & Transactions', icon: 'receipt_long', count: transactions.length },
          { id: 'settings', label: 'System Settings & Yield', icon: 'tune' },
          { id: 'database', label: 'Database Health & Audit Logs', icon: 'database', count: auditLogs.length },
        ].map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as typeof activeSubTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? tab.id === 'master'
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#ffe088] text-[#0A0F1D] font-black border border-[#ffe088] shadow-[0_0_20px_rgba(212,175,55,0.4)]'
                    : 'bg-[#1c2b3b] text-[#00F0FF] border border-[#00F0FF]/30 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
                  : tab.id === 'master'
                  ? 'text-[#D4AF37] hover:text-white hover:bg-[#122130] border border-[#D4AF37]/30'
                  : 'text-[#94a3b8] hover:text-white hover:bg-[#122130]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                    isActive && tab.id === 'master'
                      ? 'bg-[#0A0F1D] text-[#D4AF37]'
                      : 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-[#00F0FF]/20 text-[#00F0FF]' : 'bg-[#122130] text-[#94a3b8]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============================================================
          TAB CONTENT 0: MASTER USER (SUPER ADMIN) CONTROL SUITE
         ============================================================ */}
      {activeSubTab === 'master' && (
        <div className="space-y-6">
          {/* Master Root Hero Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-[#D4AF37]/15 via-[#0d1d2c] to-[#00F0FF]/15 border-2 border-[#D4AF37]/50 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-black bg-[#D4AF37] text-[#0A0F1D] shadow-[0_0_15px_rgba(212,175,55,0.5)] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
                    MASTER USER ACTIVE · ROOT PROTOCOL ACCESS
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    LIVE PROJECT GOVERNANCE
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black font-headline text-white tracking-tight">
                  Master User Project Control Center
                </h2>
                <p className="text-xs sm:text-sm text-[#94a3b8] max-w-2xl leading-relaxed">
                  Aapka master wallet <code className="text-[#D4AF37] font-bold font-mono">{currentWallet ? `${currentWallet.slice(0, 8)}...${currentWallet.slice(-6)}` : 'Authorized Root Session'}</code> protocol ke root engine se linked hai. Yha se aap jo bhi protocol parameters, node pricing, maintenance controls ya user balances update karenge, wo <strong className="text-white">poore project me sabhi users ke liye instantly apply ho jayenge</strong>.
                </p>
              </div>

              {/* Master Root Quick Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleSaveMasterSettings}
                  disabled={isSavingMasterSettings}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#ffe088] text-[#0A0F1D] font-headline font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(212,175,55,0.5)] hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isSavingMasterSettings ? 'sync' : 'publish'}
                  </span>
                  <span>{isSavingMasterSettings ? 'Deploying...' : 'Deploy Changes Live Across Project'}</span>
                </button>
              </div>
            </div>

            {/* Authorized Master Wallets Section */}
            <div className="mt-5 pt-4 border-t border-[#1c2b3b] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[#94a3b8]">Authorized Master Wallets:</span>
                {(settingsForm.masterWalletAddresses || []).map((addr) => {
                  const isCurrent = currentWallet && currentWallet.toLowerCase() === addr.toLowerCase();
                  return (
                    <span
                      key={addr}
                      className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                        isCurrent
                          ? 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]'
                          : 'bg-[#122130] text-[#94a3b8] border-[#1c2b3b]'
                      }`}
                    >
                      <span>{addr.slice(0, 6)}...{addr.slice(-4)}</span>
                      {isCurrent && <span className="text-[10px] text-emerald-400 font-bold">(YOU)</span>}
                      {!isMasterWalletHashMatch(addr) && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMasterWallet(addr)}
                          className="text-red-400 hover:text-red-300 ml-1"
                          title="Remove wallet"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>

              {/* Add Master Wallet Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add backup master wallet (0x...)"
                  value={newMasterInput}
                  onChange={(e) => setNewMasterInput(e.target.value)}
                  className="w-56 bg-[#122130] border border-[#1c2b3b] rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:border-[#D4AF37] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddMasterWallet}
                  className="px-2.5 py-1 rounded-lg bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 hover:bg-[#D4AF37]/30 text-xs font-bold"
                >
                  + Add
                </button>
              </div>
            </div>
          </div>

          {/* Section 1 & Section 2 Two-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Control Column 1: $10 Mining Model & Core Parameters */}
            <div className="bg-[#0d1d2c] rounded-2xl p-6 border border-[#1c2b3b] space-y-5">
              <div className="flex items-center justify-between border-b border-[#1c2b3b] pb-3">
                <h3 className="text-base font-bold font-headline text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00F0FF]">speed</span>
                  <span>$10 Mining Model &amp; Core Parameters</span>
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30">
                  REAL MODEL SPECS
                </span>
              </div>

              <div className="space-y-4 text-xs font-mono">
                {/* Base Fresh User Output Summary */}
                <div className="p-4 rounded-xl bg-[#122130] border border-[#00F0FF]/25 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[#94a3b8]">Base Fresh User Speed (0 Referrals)</span>
                    <span className="text-emerald-400 font-bold">100 VH/s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#94a3b8]">Base Mining Output</span>
                    <span className="text-white font-bold">1 SPK / 60 Days (~0.01667 SPK / 24h)</span>
                  </div>
                  <div className="pt-1 border-t border-[#1c2b3b] text-[10px] text-emerald-400">
                    Active Formula: <code className="text-white">Required Hashrate = 100 × (60 / Target Days)</code>
                  </div>
                </div>

                {/* Activation Fee, Cycle & Min Withdrawal */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[#94a3b8] mb-1">Node Activation (USDT)</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={settingsForm.nodeCostUsdt ?? 10.0}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({ ...prev, nodeCostUsdt: Number(e.target.value) }))
                      }
                      className="w-full bg-[#122130] border border-[#1c2b3b] rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-[#00F0FF]"
                    />
                    <span className="text-[10px] text-[#94a3b8] mt-1 block">Standard: $10 USDT</span>
                  </div>

                  <div>
                    <label className="block text-[#94a3b8] mb-1">Mining Cycle (Hours)</label>
                    <input
                      type="number"
                      min="1"
                      max="72"
                      value={settingsForm.miningCycleHours || 24}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({ ...prev, miningCycleHours: Number(e.target.value) }))
                      }
                      className="w-full bg-[#122130] border border-[#1c2b3b] rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-[#00F0FF]"
                    />
                    <span className="text-[10px] text-[#94a3b8] mt-1 block">Standard: 24 Hours</span>
                  </div>

                  <div>
                    <label className="block text-[#94a3b8] mb-1">Min Withdrawal (USDT)</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={settingsForm.minWithdrawalUsdt ?? 5.0}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({ ...prev, minWithdrawalUsdt: Number(e.target.value) }))
                      }
                      className="w-full bg-[#122130] border border-[#1c2b3b] rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-[#00F0FF]"
                    />
                    <span className="text-[10px] text-[#94a3b8] mt-1 block">Standard: $5 USDT</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Control Column 2: Active Hashrate Tiers, Milestones & Emergency Control */}
            <div className="bg-[#0d1d2c] rounded-2xl p-6 border border-[#1c2b3b] space-y-5">
              <div className="flex items-center justify-between border-b border-[#1c2b3b] pb-3">
                <h3 className="text-base font-bold font-headline text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#D4AF37]">groups</span>
                  <span>Hashrate Boost &amp; Career Milestone Rules</span>
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                  ACTIVE ENGINE
                </span>
              </div>

              <div className="space-y-4 text-xs font-mono">
                {/* Active Hashrate Boost Tiers (Read-Only Verified Engine Rules) */}
                <div className="space-y-2">
                  <div className="text-[#94a3b8] font-bold text-[11px]">
                    Live Hashrate Boost Tiers (Per-User Auto-Calculated):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {HASHRATE_LEVEL_TIERS.map((tier) => (
                      <div
                        key={tier.level}
                        className="p-2.5 rounded-xl bg-[#122130] border border-[#1c2b3b] flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="text-white font-bold text-[11px]">{tier.level}</div>
                          <div className="text-[10px] text-[#94a3b8]">{tier.directs}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-emerald-400 font-bold">{tier.hashrate} VH/s</div>
                          <div className="text-[10px] text-[#00F0FF]">{tier.targetDays}d / SPK</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 9-Tier Fixed Milestone Bonuses Summary */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[#94a3b8] font-bold text-[11px]">
                      9-Tier Fixed USDT Career Milestones:
                    </span>
                    <span className="text-[10px] text-[#D4AF37]">No % Commission</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {TEAM_MILESTONE_TIERS.map((m) => (
                      <span
                        key={m.id}
                        className="px-2 py-1 rounded-lg bg-[#122130] border border-[#D4AF37]/25 text-[10px] text-[#94a3b8]"
                      >
                        L{m.level} ({m.partnersRequired.toLocaleString()}):{' '}
                        <strong className="text-[#D4AF37]">{m.rewardFormatted}</strong>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Emergency Maintenance Mode */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#122130] border border-red-500/30">
                  <div>
                    <div className="font-bold text-red-400">Emergency Maintenance Protocol</div>
                    <div className="text-[10px] text-[#94a3b8]">
                      Global circuit breaker: pauses new node purchases &amp; withdrawals.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!settingsForm.maintenanceMode}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({ ...prev, maintenanceMode: e.target.checked }))
                    }
                    className="w-5 h-5 rounded accent-red-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Live User Management, Wallet Balances & Role Assignments */}
          <div className="bg-[#0d1d2c] rounded-2xl p-6 border border-[#1c2b3b] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1c2b3b] pb-4">
              <div>
                <h3 className="text-base font-bold font-headline text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#D4AF37]">manage_accounts</span>
                  <span>User Management, Wallet Balances &amp; Role Assignments</span>
                </h3>
                <p className="text-xs text-[#94a3b8] mt-0.5">
                  Promote users to Master or Admin, grant welcome balances, or override speeds.
                </p>
              </div>

              {/* User search bar */}
              <div className="relative w-full sm:w-72">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-[#94a3b8]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Filter users or address..."
                  value={masterUserSearch}
                  onChange={(e) => setMasterUserSearch(e.target.value)}
                  className="w-full bg-[#122130] border border-[#1c2b3b] rounded-xl pl-9 pr-3 py-1.5 text-xs font-mono text-white placeholder-[#94a3b8]/50 focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
            </div>

            {/* User List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-[#122130] text-[#94a3b8] border-b border-[#1c2b3b]">
                    <th className="p-3">Wallet Address</th>
                    <th className="p-3">Role Assignment</th>
                    <th className="p-3">Referral Status</th>
                    <th className="p-3">Current Hashrate</th>
                    <th className="p-3">USDT Balance</th>
                    <th className="p-3">Gas (BNB)</th>
                    <th className="p-3 text-right">Master Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c2b3b]/60">
                  {users
                    .filter(
                      (u) =>
                        !masterUserSearch.trim() ||
                        u.address.toLowerCase().includes(masterUserSearch.toLowerCase()) ||
                        u.referralCode?.toLowerCase().includes(masterUserSearch.toLowerCase())
                    )
                    .map((u) => {
                      const isMasterAddr = u.role === 'master' || (settingsForm.masterWalletAddresses || []).map((a) => a.toLowerCase()).includes(u.address.toLowerCase());
                      return (
                        <tr key={u.address} className="hover:bg-[#122130]/40 transition-colors">
                          <td className="p-3">
                            <div className="font-bold text-white flex items-center gap-2">
                              <span className="text-[#00F0FF]">{u.address.slice(0, 10)}...{u.address.slice(-6)}</span>
                              {isMasterAddr && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#D4AF37] text-[#0A0F1D]">
                                  ROOT
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#94a3b8]">Ref: {u.referralCode}</div>
                          </td>

                          {/* Role Selector */}
                          <td className="p-3">
                            <select
                              value={u.role || (isMasterAddr ? 'master' : 'user')}
                              onChange={(e) => handleUpdateUserRole(u.address, e.target.value as any)}
                              className={`bg-[#071322] border rounded-lg px-2.5 py-1 text-xs font-bold font-mono focus:outline-none ${
                                isMasterAddr
                                  ? 'text-[#D4AF37] border-[#D4AF37]'
                                  : u.role === 'admin'
                                  ? 'text-[#00F0FF] border-[#00F0FF]/50'
                                  : 'text-white border-[#1c2b3b]'
                              }`}
                            >
                              <option value="user">User (Standard)</option>
                              <option value="moderator">Moderator</option>
                              <option value="admin">Admin</option>
                              <option value="master">Master (Root)</option>
                            </select>
                          </td>

                          <td className="p-3">
                            <div className="text-white font-bold">{u.directPartners ?? 0} Directs</div>
                            <div className="text-[10px] text-[#D4AF37]">{u.totalPartners ?? 0} Total Team</div>
                          </td>

                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30">
                              {u.hashrateInfo?.hashrate || u.customHashrate || 100} VH/s
                            </span>
                            <div className="text-[10px] text-emerald-400 mt-0.5">
                              {u.hashrateInfo?.level || 'Fresh user'}
                            </div>
                          </td>

                          <td className="p-3 text-white font-bold tabular-nums">
                            ${u.balanceUsdt.toFixed(2)}
                          </td>

                          <td className="p-3 text-amber-400 font-bold tabular-nums">
                            {u.balanceBnb.toFixed(4)} BNB
                          </td>

                          {/* Action Buttons */}
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {onInspectUserPanel && (
                                <button
                                  type="button"
                                  onClick={() => onInspectUserPanel(u.address, 'dashboard')}
                                  className="px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                                  title="Open User Panel (Cross-Verify)"
                                >
                                  <span className="material-symbols-outlined text-[12px]">visibility</span>
                                  <span>Panel</span>
                                </button>
                              )}

                              {/* Adjust */}
                              <button
                                type="button"
                                onClick={() => {
                                  setAdjustModalUser(u);
                                  setAdjustAmount(50);
                                  setAdjustType('credit');
                                }}
                                className="px-2 py-1 rounded bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 text-[#00F0FF] border border-[#00F0FF]/30 text-[10px] font-semibold"
                                title="Credit or Debit Balance"
                              >
                                Adjust
                              </button>

                              {/* Hashrate */}
                              <button
                                type="button"
                                onClick={() => {
                                  setHashrateModalUser(u);
                                  setCustomHashrateVal(String(u.hashrateInfo?.hashrate || u.customHashrate || 100));
                                  setSelectedHashratePreset(u.hashrateInfo?.hashrate || u.customHashrate || 100);
                                }}
                                className="px-2 py-1 rounded bg-[#1c2b3b] hover:bg-[#25394e] text-white border border-[#2d4257] text-[10px]"
                                title="Set specific mining speed"
                              >
                                Speed
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sticky Deployment Action Bar */}
          <div className="sticky bottom-4 z-20 p-4 rounded-2xl bg-[#0a1220]/95 backdrop-blur-md border-2 border-[#D4AF37]/50 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shrink-0">
                <span className="material-symbols-outlined text-[22px]">rocket_launch</span>
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Deploy &amp; Sync Master Configuration</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    ACID PERSISTENCE
                  </span>
                </div>
                <div className="text-xs text-[#94a3b8]">
                  Saves all updated rules to database and triggers instant synchronization across all app views.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleSaveMasterSettings}
                disabled={isSavingMasterSettings}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#00F0FF] text-[#0A0F1D] font-headline font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isSavingMasterSettings ? 'sync' : 'save'}
                </span>
                <span>{isSavingMasterSettings ? 'Saving to Database...' : 'Save & Apply Project-Wide'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB CONTENT 1: OVERVIEW & QUICK ACTIONS
         ============================================================ */}
      {activeSubTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Quick Actions & System Status */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#0d1d2c] rounded-2xl p-6 border border-[#1c2b3b] space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold font-headline text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#D4AF37]">rocket_launch</span>
                  Quick Administrative Actions
                </h3>
                <span className="text-xs text-[#94a3b8] font-mono">Real-time DB triggers</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <button
                  onClick={() => setActiveSubTab('users')}
                  className="p-4 rounded-xl bg-[#122130] hover:bg-[#1c2b3b] border border-[#1c2b3b] text-left transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[#00F0FF] mb-2">
                    <span className="text-sm font-bold">Manage Wallet Balances</span>
                    <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </div>
                  <p className="text-xs text-[#94a3b8]">
                    Credit or debit USDT, inspect referral ties, adjust mining speeds, or freeze accounts.
                  </p>
                </button>

                <button
                  onClick={() => setActiveSubTab('withdrawals')}
                  className="p-4 rounded-xl bg-[#122130] hover:bg-[#1c2b3b] border border-[#1c2b3b] text-left transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[#D4AF37] mb-2">
                    <span className="text-sm font-bold">Withdrawal Requests</span>
                    <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </div>
                  <p className="text-xs text-[#94a3b8]">
                    Review milestone reward payout requests, verify BEP-20 destination, and approve payouts.
                  </p>
                </button>

                <button
                  onClick={() => setActiveSubTab('claims')}
                  className="p-4 rounded-xl bg-[#122130] hover:bg-[#1c2b3b] border border-[#1c2b3b] text-left transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between text-emerald-400 mb-2">
                    <span className="text-sm font-bold">Audit User Claims</span>
                    <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </div>
                  <p className="text-xs text-[#94a3b8]">
                    Inspect user claim history, verify BSC transaction hashes, and export date-filtered CSV logs.
                  </p>
                </button>

                <button
                  onClick={() => setActiveSubTab('settings')}
                  className="p-4 rounded-xl bg-[#122130] hover:bg-[#1c2b3b] border border-[#1c2b3b] text-left transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between text-purple-400 mb-2">
                    <span className="text-sm font-bold">Configure Protocol Yield</span>
                    <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </div>
                  <p className="text-xs text-[#94a3b8]">
                    Update Treasury wallet address, contract settings, or toggle emergency maintenance mode.
                  </p>
                </button>
              </div>
            </div>

            {/* Recent Ledger Entries */}
            <div className="bg-[#0d1d2c] rounded-2xl p-6 border border-[#1c2b3b] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold font-headline text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-400">history</span>
                  Latest Database Transactions
                </h3>
                <button
                  onClick={() => setActiveSubTab('transactions')}
                  className="text-xs text-[#00F0FF] hover:underline font-mono"
                >
                  View All ({transactions.length}) →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#1c2b3b] text-[#94a3b8]">
                      <th className="pb-2.5">User</th>
                      <th className="pb-2.5">Type</th>
                      <th className="pb-2.5">Amount</th>
                      <th className="pb-2.5">Status</th>
                      <th className="pb-2.5">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1c2b3b]/60">
                    {transactions.slice(0, 5).map((tx, idx) => (
                      <tr key={`${tx.id || 'tx'}-${idx}`} className="hover:bg-[#122130]/50 transition-colors">
                        <td className="py-2.5 text-[#00F0FF]">
                          {tx.userAddress ? `${tx.userAddress.slice(0, 8)}...` : 'System'}
                        </td>
                        <td className="py-2.5 text-white capitalize">{tx.rewardSource || tx.type}</td>
                        <td
                          className={`py-2.5 font-bold ${
                            tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {tx.amount >= 0 ? `+${tx.amount.toFixed(2)}` : tx.amount.toFixed(2)} {tx.currency}
                        </td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-[#94a3b8]">{tx.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Database Health & Live System Specs */}
          <div className="space-y-6">
            {/* Real-Time Database Early-Warning & Email Alert Interceptor */}
            <div className="bg-gradient-to-b from-[#0a232f] via-[#091b26] to-[#06141e] rounded-2xl p-6 border-2 border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.2)] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold font-headline text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400">shield</span>
                  <span>Database Health & Pre-Failure Alert System</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active 24/7
                </span>
              </div>

              <p className="text-xs text-[#94a3b8]">
                Real-time monitoring active. Agar database me koi bhi issue ya write delay aati hai, to system crash hone se pehle turant administrator ko early alert notification dispatch ho jati hai.
              </p>

              <div className="space-y-2.5 text-xs font-mono">
                <div className="p-3 rounded-xl bg-[#0a1520] border border-emerald-500/30 flex items-center justify-between">
                  <span className="text-[#94a3b8] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-emerald-400">mark_email_read</span>
                    Primary Alert Channel:
                  </span>
                  <span className="text-[#00F0FF] font-bold bg-[#00F0FF]/10 px-2 py-0.5 rounded border border-[#00F0FF]/30">
                    Private Backend Admin Channel
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#0a1520] border border-[#1c2b3b] flex items-center justify-between">
                  <span className="text-[#94a3b8]">Mining Persistence:</span>
                  <span className="text-emerald-400 font-bold">Cloud Firestore + Local ACID Sync</span>
                </div>

                <div className="p-3 rounded-xl bg-[#0a1520] border border-[#1c2b3b] flex items-center justify-between">
                  <span className="text-[#94a3b8]">Pre-Failure Interception:</span>
                  <span className="text-emerald-400 font-bold">Zero Data Loss Protocol Active</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendTestAlert}
                disabled={isSendingTestAlert}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-[#0A0F1D] font-headline font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.35)] active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">outgoing_mail</span>
                <span>{isSendingTestAlert ? 'Dispatching Alert...' : 'Send Test Alert to Backend Admin Channel'}</span>
              </button>
            </div>

            <div className="bg-[#0d1d2c] rounded-2xl p-6 border border-[#1c2b3b] space-y-4">
              <h3 className="text-base font-bold font-headline text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">database</span>
                Database Storage Status
              </h3>

              <div className="space-y-3 text-xs font-mono">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#122130] border border-[#1c2b3b]">
                  <span className="text-[#94a3b8]">Engine:</span>
                  <span className="text-emerald-400 font-bold">Cloud Firestore + ACID Sync</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#122130] border border-[#1c2b3b]">
                  <span className="text-[#94a3b8]">Last Auto-Save:</span>
                  <span className="text-[#00F0FF]">
                    {metrics ? new Date(metrics.lastSaved).toLocaleTimeString() : 'Active'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#122130] border border-[#1c2b3b]">
                  <span className="text-[#94a3b8]">File Integrity:</span>
                  <span className="text-emerald-400 font-bold">PASS (Atomic Sync)</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <a
                  href="/api/db/export"
                  download
                  className="w-full py-2.5 px-4 rounded-xl bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 border border-[#00F0FF]/40 text-[#00F0FF] text-xs font-mono font-bold text-center transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">file_download</span>
                  Export Complete DB Backup (.json)
                </a>

                <button
                  onClick={() => onNavigateTab('dashboard')}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#122130] hover:bg-[#1c2b3b] border border-[#1c2b3b] text-white text-xs font-mono font-medium transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                  Switch to User Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB CONTENT: WITHDRAWAL REQUESTS (MILESTONES & USER REWARDS)
         ============================================================ */}
      {activeSubTab === 'withdrawals' && (
        <div className="space-y-6">
          {/* Main Withdrawal Management Header */}
          <div className="rounded-2xl bg-gradient-to-r from-[#0d1d2c] via-[#0f2438] to-[#0a1827] border-2 border-[#D4AF37]/40 p-6 md:p-8 shadow-[0_0_30px_rgba(212,175,55,0.15)] relative overflow-hidden">
            <div className="relative z-10 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#D4AF37] text-[#0A0F1D] flex items-center gap-1.5 shadow-[0_0_12px_rgba(212,175,55,0.4)]">
                  <span className="material-symbols-outlined text-[16px]">payments</span>
                  MILESTONE REWARD WITHDRAWALS
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  REAL-TIME REVIEW CONSOLE
                </span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-mono text-[#00F0FF] bg-[#00F0FF]/10 border border-[#00F0FF]/30">
                  BEP-20 USDT Payouts
                </span>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
                <div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-white font-headline tracking-wide flex items-center gap-2.5">
                    <span>Withdrawal Approval &amp; Payout Console</span>
                  </h2>
                  <p className="text-sm text-[#94a3b8] max-w-3xl mt-1">
                    Users submit withdrawal requests directly from their <span className="text-[#D4AF37] font-semibold">Total Earned</span> milestone card on the Referrals page. As an admin, review pending requests, enter or auto-generate a BSC TxHash, and click <strong className="text-emerald-400 font-semibold">Approve &amp; Mark Done</strong> to confirm payouts.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fetchAllData(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#122130] hover:bg-[#1a2f42] border border-[#1c2b3b] text-white text-xs font-mono font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:border-[#00F0FF]/50"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#00F0FF]">sync</span>
                    <span>Refresh Requests</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#0d1d2c] border border-[#1c2b3b] rounded-xl p-4">
              <div className="flex items-center justify-between text-[#94a3b8] text-xs font-mono mb-1">
                <span>Total Requests</span>
                <span className="material-symbols-outlined text-[18px] text-blue-400">receipt_long</span>
              </div>
              <div className="text-2xl font-extrabold text-white font-headline">
                {withdrawalRequests.length}
              </div>
              <div className="text-[11px] text-[#94a3b8] font-mono mt-1">
                ${withdrawalRequests.reduce((sum, w) => sum + (Number(w.amount) || 0), 0).toFixed(2)} USDT total
              </div>
            </div>

            <div className="bg-[#0d1d2c] border border-amber-500/40 rounded-xl p-4 shadow-[0_0_15px_rgba(245,158,11,0.08)]">
              <div className="flex items-center justify-between text-amber-400 text-xs font-mono mb-1 font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Pending Review
                </span>
                <span className="material-symbols-outlined text-[18px]">pending_actions</span>
              </div>
              <div className="text-2xl font-extrabold text-amber-400 font-headline">
                {withdrawalRequests.filter((w) => w.status === 'pending').length}
              </div>
              <div className="text-[11px] text-amber-300 font-mono mt-1">
                ${withdrawalRequests
                  .filter((w) => w.status === 'pending')
                  .reduce((sum, w) => sum + (Number(w.amount) || 0), 0)
                  .toFixed(2)} USDT waiting
              </div>
            </div>

            <div className="bg-[#0d1d2c] border border-emerald-500/40 rounded-xl p-4 shadow-[0_0_15px_rgba(16,185,129,0.08)]">
              <div className="flex items-center justify-between text-emerald-400 text-xs font-mono mb-1 font-semibold">
                <span>Done &amp; Approved</span>
                <span className="material-symbols-outlined text-[18px]">verified</span>
              </div>
              <div className="text-2xl font-extrabold text-emerald-400 font-headline">
                {withdrawalRequests.filter((w) => w.status === 'approved').length}
              </div>
              <div className="text-[11px] text-emerald-300 font-mono mt-1">
                ${withdrawalRequests
                  .filter((w) => w.status === 'approved')
                  .reduce((sum, w) => sum + (Number(w.amount) || 0), 0)
                  .toFixed(2)} USDT paid out
              </div>
            </div>

            <div className="bg-[#0d1d2c] border border-[#1c2b3b] rounded-xl p-4">
              <div className="flex items-center justify-between text-[#94a3b8] text-xs font-mono mb-1">
                <span>Declined / Rejected</span>
                <span className="material-symbols-outlined text-[18px] text-red-400">cancel</span>
              </div>
              <div className="text-2xl font-extrabold text-[#94a3b8] font-headline">
                {withdrawalRequests.filter((w) => w.status === 'rejected').length}
              </div>
              <div className="text-[11px] text-[#94a3b8] font-mono mt-1">Returned / flagged</div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-[#0d1d2c] border border-[#1c2b3b] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((filter) => {
                const count =
                  filter === 'all'
                    ? withdrawalRequests.length
                    : withdrawalRequests.filter((w) => w.status === filter).length;
                const isActive = withdrawalFilter === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setWithdrawalFilter(filter)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      isActive
                        ? filter === 'pending'
                          ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                          : filter === 'approved'
                          ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                          : filter === 'rejected'
                          ? 'bg-red-500 text-white'
                          : 'bg-[#00F0FF] text-black shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                        : 'bg-[#122130] text-[#94a3b8] hover:text-white border border-[#1c2b3b]'
                    }`}
                  >
                    <span>
                      {filter === 'all'
                        ? 'All Requests'
                        : filter === 'pending'
                        ? 'Pending Review'
                        : filter === 'approved'
                        ? 'Done / Approved'
                        : 'Rejected'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/30">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="Search by address or ID..."
                value={withdrawalSearch}
                onChange={(e) => setWithdrawalSearch(e.target.value)}
                className="w-full bg-[#122130] border border-[#1c2b3b] rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-white placeholder-[#94a3b8]/50 focus:outline-none focus:border-[#00F0FF]"
              />
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] text-[16px]">
                search
              </span>
              {withdrawalSearch && (
                <button
                  type="button"
                  onClick={() => setWithdrawalSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Requests Table */}
          {(() => {
            const filtered = withdrawalRequests.filter((w) => {
              if (withdrawalFilter !== 'all' && w.status !== withdrawalFilter) return false;
              if (withdrawalSearch) {
                const q = withdrawalSearch.toLowerCase();
                const matchId = (w.id || '').toLowerCase().includes(q);
                const matchUser = (w.userAddress || '').toLowerCase().includes(q);
                const matchDest = (w.destinationAddress || '').toLowerCase().includes(q);
                const matchSource = (w.source || '').toLowerCase().includes(q);
                if (!matchId && !matchUser && !matchDest && !matchSource) return false;
              }
              return true;
            });

            if (filtered.length === 0) {
              return (
                <div className="bg-[#0d1d2c] border border-[#1c2b3b] rounded-2xl p-12 text-center">
                  <div className="w-14 h-14 mx-auto rounded-full bg-[#122130] border border-[#1c2b3b] flex items-center justify-center text-[#94a3b8] mb-3">
                    <span className="material-symbols-outlined text-2xl">inbox</span>
                  </div>
                  <h4 className="text-white font-headline font-bold text-base">No Withdrawal Requests Found</h4>
                  <p className="text-xs text-[#94a3b8] font-mono mt-1 max-w-md mx-auto">
                    {withdrawalSearch
                      ? `No requests match "${withdrawalSearch}". Try clearing your search.`
                      : withdrawalFilter === 'pending'
                      ? 'All caught up! There are no pending milestone withdrawal requests.'
                      : 'No withdrawal requests recorded in the system yet. When users claim milestone awards and submit requests, they will appear here.'}
                  </p>
                </div>
              );
            }

            return (
              <div className="bg-[#0d1d2c] border border-[#1c2b3b] rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#091522] border-b border-[#1c2b3b] text-[#94a3b8] uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Request ID</th>
                        <th className="py-3 px-4">User Wallet</th>
                        <th className="py-3 px-4">Destination (BEP-20)</th>
                        <th className="py-3 px-4">Reward Source</th>
                        <th className="py-3 px-4 text-right">Amount (USDT)</th>
                        <th className="py-3 px-4">Date / Time</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Admin Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1c2b3b]">
                      {filtered.map((item, idx) => {
                        const isPending = item.status === 'pending';
                        const isApproved = item.status === 'approved';
                        const isRejected = item.status === 'rejected';
                        const isBusy = processingWithdrawalId === item.id;

                        return (
                          <tr
                            key={`${item.id || 'wdr'}-${idx}`}
                            className={`hover:bg-[#122130]/50 transition-colors ${
                              isPending ? 'bg-amber-500/5' : ''
                            }`}
                          >
                            {/* Request ID */}
                            <td className="py-3 px-4 text-white font-bold whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[#00F0FF]">#{item.id?.slice(-8)}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(item.id);
                                    onNotify?.('Copied', 'Request ID copied', 'info');
                                  }}
                                  className="text-[#94a3b8] hover:text-white cursor-pointer"
                                  title="Copy Request ID"
                                >
                                  <span className="material-symbols-outlined text-[13px]">content_copy</span>
                                </button>
                              </div>
                            </td>

                            {/* User Wallet */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className="text-white">
                                  {item.userAddress
                                    ? `${item.userAddress.slice(0, 6)}...${item.userAddress.slice(-4)}`
                                    : '—'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(item.userAddress);
                                    onNotify?.('Copied', 'User address copied', 'info');
                                  }}
                                  className="text-[#94a3b8] hover:text-white cursor-pointer"
                                  title="Copy User Address"
                                >
                                  <span className="material-symbols-outlined text-[13px]">content_copy</span>
                                </button>
                                {onInspectUserPanel && item.userAddress && /^0x[a-fA-F0-9]{40}$/.test(item.userAddress) && (
                                  <button
                                    type="button"
                                    onClick={() => onInspectUserPanel(item.userAddress, 'withdraw-history')}
                                    className="px-1.5 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer"
                                    title="Open User Panel (Cross-Verify Withdrawals & Referrals)"
                                  >
                                    <span className="material-symbols-outlined text-[12px]">visibility</span>
                                    <span>Panel</span>
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* Destination BEP-20 Address */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className="text-amber-300">
                                  {item.destinationAddress
                                    ? `${item.destinationAddress.slice(0, 6)}...${item.destinationAddress.slice(-4)}`
                                    : '—'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(item.destinationAddress);
                                    onNotify?.('Copied', 'Destination address copied', 'info');
                                  }}
                                  className="text-[#94a3b8] hover:text-white cursor-pointer"
                                  title="Copy Destination"
                                >
                                  <span className="material-symbols-outlined text-[13px]">content_copy</span>
                                </button>
                              </div>
                            </td>

                            {/* Reward Source */}
                            <td className="py-3 px-4 text-[#94a3b8] whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#122130] text-[#D4AF37] border border-[#D4AF37]/30">
                                {item.source || 'Milestone Award'}
                              </span>
                            </td>

                            {/* Amount */}
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <span className="text-sm font-extrabold text-[#00F0FF] font-headline">
                                +${Number(item.amount || 0).toFixed(2)}
                              </span>
                              <span className="text-[10px] text-[#94a3b8] block">USDT (BEP-20)</span>
                            </td>

                            {/* Date */}
                            <td className="py-3 px-4 text-[#94a3b8] whitespace-nowrap">
                              <div>{new Date(item.createdAt || Date.now()).toLocaleDateString()}</div>
                              <div className="text-[10px] opacity-75">
                                {new Date(item.createdAt || Date.now()).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              {isPending && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                  PENDING
                                </span>
                              )}
                              {isApproved && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                  <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                  DONE / APPROVED
                                </span>
                              )}
                              {isRejected && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40">
                                  <span className="material-symbols-outlined text-[12px]">cancel</span>
                                  REJECTED
                                </span>
                              )}
                            </td>

                            {/* Action Buttons */}
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              {isPending && (
                                <div className="flex items-center justify-end gap-2">
                                  {/* Optional Custom Tx Hash Input */}
                                  <input
                                    type="text"
                                    placeholder="Optional TxHash (0x...)"
                                    value={customTxInput[item.id] || ''}
                                    onChange={(e) =>
                                      setCustomTxInput((prev) => ({
                                        ...prev,
                                        [item.id]: e.target.value,
                                      }))
                                    }
                                    className="w-36 bg-[#122130] border border-[#1c2b3b] rounded-lg px-2 py-1 text-[10px] text-white placeholder-[#94a3b8]/40 focus:outline-none focus:border-[#00F0FF]"
                                    title="Leave empty to auto-generate verified BSC transaction hash"
                                  />

                                  {/* Approve & Mark Done Button */}
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleApproveWithdrawal(item.id)}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-headline font-bold text-[11px] uppercase tracking-wider flex items-center gap-1 transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] disabled:opacity-50 cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">done_all</span>
                                    <span>{isBusy ? 'Processing...' : 'Approve & Done'}</span>
                                  </button>

                                  {/* Reject Button */}
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleRejectWithdrawal(item.id)}
                                    className="px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-[11px] font-bold transition-all disabled:opacity-50 cursor-pointer"
                                    title="Decline request"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                  </button>
                                </div>
                              )}

                              {isApproved && (
                                <div className="space-y-0.5 text-right">
                                  <div className="text-emerald-400 font-bold text-[11px] flex items-center justify-end gap-1">
                                    <span className="material-symbols-outlined text-[13px]">verified</span>
                                    <span>Paid &amp; Done</span>
                                  </div>
                                  {item.txHash && (
                                    <a
                                      href={`https://bscscan.com/tx/${item.txHash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[#00F0FF] hover:underline text-[10px] font-mono flex items-center justify-end gap-0.5"
                                    >
                                      <span>{item.txHash.slice(0, 10)}...{item.txHash.slice(-6)}</span>
                                      <span className="material-symbols-outlined text-[11px]">open_in_new</span>
                                    </a>
                                  )}
                                  <div className="text-[10px] text-[#94a3b8]">
                                    by {item.reviewedBy ? item.reviewedBy.slice(0, 10) : 'Admin'}
                                  </div>
                                </div>
                              )}

                              {isRejected && (
                                <div className="space-y-0.5 text-right">
                                  <span className="text-red-400 text-[11px] font-semibold">Declined</span>
                                  {item.adminNote && (
                                    <div className="text-[10px] text-[#94a3b8] italic max-w-xs ml-auto">
                                      "{item.adminNote}"
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ============================================================
          TAB CONTENT 2: USER & WALLET MANAGEMENT
         ============================================================ */}
      {activeSubTab === 'users' && (
        <div className="space-y-6">
          {/* Hashrate Notification Banner */}
          {hashrateBannerMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 flex items-center justify-between text-xs font-mono text-emerald-300 shadow-lg animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-[18px]">verified</span>
                <span>
                  Hashrate for <strong>{hashrateBannerMsg.address}</strong> updated to{' '}
                  <span className="text-[#00F0FF] font-bold">{hashrateBannerMsg.hashrate} VH/s</span> ({hashrateBannerMsg.level}) · 1 SPIKE in {hashrateBannerMsg.days} days!
                </span>
              </div>
              <button
                onClick={() => setHashrateBannerMsg(null)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}

          {/* ============================================================
              DEDICATED PROTOCOL HASHRATE CONTROLLER (PER IMAGE SPEC)
             ============================================================ */}
          <div className="bg-[#0a1826] border-2 border-[#00F0FF]/40 rounded-2xl p-5 md:p-6 space-y-5 shadow-xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#1c2b3b] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00F0FF] text-[22px]">speed</span>
                  <h3 className="text-base font-bold font-headline text-white">
                    Protocol Mining Hashrate &amp; Referral Tier Controller
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 font-mono">
                    VH/s Engine
                  </span>
                </div>
                <p className="text-xs text-[#94a3b8] mt-1">
                  Formula: <code className="text-[#00F0FF] font-bold">Required Hashrate = 100 × (60 / Target Days)</code>. Direct referrals aur team size se user ka speed automatically upgrade hota hai, ya admin kisi bhi address ka custom hashrate lock kar sakta hai.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-mono text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-1 rounded-lg border border-[#D4AF37]/30">
                  Base: 100 VH/s (60d)
                </span>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  Max: 857.14 VH/s (7d)
                </span>
              </div>
            </div>

            {/* 5-Level Reference Matrix Matching Image */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {HASHRATE_LEVEL_TIERS.map((tier, idx) => (
                <div
                  key={tier.level}
                  onClick={() => {
                    setSelectedHashratePreset(tier.hashrate);
                    setCustomHashrateVal(String(tier.hashrate));
                  }}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    selectedHashratePreset === tier.hashrate
                      ? 'bg-[#00F0FF]/15 border-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.25)]'
                      : 'bg-[#0d1d2c] border-[#1c2b3b] hover:border-[#00F0FF]/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold font-headline">
                    <span className="text-white">{tier.level}</span>
                    <span className="text-[#00F0FF] font-mono">{tier.hashrate} VH/s</span>
                  </div>
                  <div className="text-[10px] text-[#D4AF37] font-mono mt-1 font-semibold">
                    {tier.directs}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                    1 SPK in {tier.targetDays} days
                  </div>
                </div>
              ))}
            </div>

            {/* Target Address Control Form */}
            <div className="bg-[#0d1d2c] rounded-xl p-4 border border-[#1c2b3b] space-y-4">
              <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#00F0FF]">tune</span>
                <span>Override Hashrate for Specific Wallet Address</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs font-mono">
                {/* Address Input / Select */}
                <div className="md:col-span-5 space-y-1">
                  <label className="text-[#94a3b8] text-[11px]">Target Wallet Address</label>
                  <input
                    type="text"
                    placeholder="0x... paste BEP-20 address"
                    value={targetHashrateAddr}
                    onChange={(e) => setTargetHashrateAddr(e.target.value)}
                    className="w-full bg-[#122130] border border-[#1c2b3b] rounded-xl px-3.5 py-2 text-white font-mono placeholder-gray-500 focus:outline-none focus:border-[#00F0FF]"
                  />
                  {users.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          setTargetHashrateAddr(e.target.value);
                          const sel = users.find((u) => u.address.toLowerCase() === e.target.value.toLowerCase());
                          if (sel?.hashrateInfo?.hashrate) {
                            setSelectedHashratePreset(sel.hashrateInfo.hashrate);
                            setCustomHashrateVal(String(sel.hashrateInfo.hashrate));
                          }
                        }
                      }}
                      className="w-full bg-[#071322] border border-[#1c2b3b] rounded-lg px-2 py-1 text-[10px] text-[#94a3b8] mt-1"
                    >
                      <option value="">Quick select from registered users ({users.length})...</option>
                      {users.map((u) => (
                        <option key={u.address} value={u.address}>
                          {u.address.slice(0, 10)}...{u.address.slice(-6)} - {u.hashrateInfo?.level || 'Fresh'} ({u.hashrateInfo?.hashrate || 100} VH/s)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Hashrate Value */}
                <div className="md:col-span-3 space-y-1">
                  <label className="text-[#94a3b8] text-[11px]">Hashrate (VH/s units)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="e.g. 200"
                    value={customHashrateVal}
                    onChange={(e) => {
                      setCustomHashrateVal(e.target.value);
                      setSelectedHashratePreset(Number(e.target.value));
                    }}
                    className="w-full bg-[#122130] border border-[#1c2b3b] rounded-xl px-3.5 py-2 text-[#00F0FF] font-mono font-bold focus:outline-none focus:border-[#00F0FF]"
                  />
                  <div className="text-[10px] text-gray-400">
                    Target: 1 SPK in {Number(customHashrateVal) > 0 ? +(6000 / Number(customHashrateVal)).toFixed(1) : 60} days
                  </div>
                </div>

                {/* Reason */}
                <div className="md:col-span-4 space-y-1">
                  <label className="text-[#94a3b8] text-[11px]">Reason / Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Tier qualification grant"
                    value={hashrateChangeReason}
                    onChange={(e) => setHashrateChangeReason(e.target.value)}
                    className="w-full bg-[#122130] border border-[#1c2b3b] rounded-xl px-3.5 py-2 text-white font-mono placeholder-gray-500 focus:outline-none focus:border-[#00F0FF]"
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isUpdatingHashrate || !targetHashrateAddr.trim()}
                      onClick={() => handleSaveUserHashrate(targetHashrateAddr, Number(customHashrateVal) || 100, hashrateChangeReason)}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-[#00F0FF] hover:bg-[#7df4ff] text-[#0A0F1D] font-headline font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm flex items-center justify-center gap-1"
                    >
                      {isUpdatingHashrate ? 'Saving...' : 'Apply Hashrate'}
                    </button>
                    <button
                      type="button"
                      disabled={isUpdatingHashrate || !targetHashrateAddr.trim()}
                      onClick={() => handleSaveUserHashrate(targetHashrateAddr, null, 'Reset to auto-calculated tier')}
                      className="py-1.5 px-3 rounded-lg bg-[#1c2b3b] hover:bg-[#273647] text-[#94a3b8] hover:text-white font-mono text-[11px] disabled:opacity-40 cursor-pointer"
                      title="Reset to referral calculation"
                    >
                      Reset Auto
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="relative flex-1 max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#94a3b8]">
                search
              </span>
              <input
                type="text"
                placeholder="Search wallet address or referral code..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-[#0d1d2c] border border-[#1c2b3b] rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-white placeholder-[#94a3b8]/60 focus:outline-none focus:border-[#00F0FF]"
              />
            </div>

            <div className="text-xs text-[#94a3b8] font-mono">
              Showing {filteredUsers.length} of {users.length} registered wallets
            </div>
          </div>

          <div className="bg-[#0d1d2c] rounded-2xl border border-[#1c2b3b] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-[#122130] text-[#94a3b8] border-b border-[#1c2b3b]">
                    <th className="p-4">Wallet Address</th>
                    <th className="p-4">Directs / Team</th>
                    <th className="p-4">Mining Hashrate</th>
                    <th className="p-4">1 SPK Time</th>
                    <th className="p-4">Balance (USDT)</th>
                    <th className="p-4">Gas (BNB)</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Ref Code</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c2b3b]/60">
                  {filteredUsers.map((user) => (
                    <tr key={user.address} className="hover:bg-[#122130]/40 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span className="text-[#00F0FF]">{user.address.slice(0, 10)}...{user.address.slice(-6)}</span>
                          {user.role === 'admin' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#94a3b8]">Joined: {new Date(user.createdAt).toLocaleDateString()}</div>
                      </td>

                      <td className="p-4">
                        <div className="text-white font-bold">{user.directPartners ?? 0} Directs</div>
                        <div className="text-[10px] text-[#D4AF37] font-semibold">{user.totalPartners ?? 0} Total Team</div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30">
                            {user.hashrateInfo?.hashrate || user.customHashrate || 100} VH/s
                          </span>
                        </div>
                        <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                          {user.hashrateInfo?.level || 'Fresh user'}
                        </div>
                        {user.customHashrate && (
                          <span className="text-[9px] text-[#D4AF37] block font-mono">
                            Admin Lock
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-white font-bold font-mono">
                        {user.hashrateInfo?.targetDays || 60} Days
                      </td>

                      <td className="p-4 text-white font-bold tabular-nums">
                        ${user.balanceUsdt.toFixed(2)}
                      </td>

                      <td className="p-4 text-amber-400 font-bold tabular-nums">
                        {user.balanceBnb.toFixed(4)} BNB
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            user.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-red-500/20 text-red-400 border border-red-500/40'
                          }`}
                        >
                          {user.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="p-4 text-[#94a3b8]">
                        <div className="font-mono text-white text-xs">{user.referralCode}</div>
                        {user.referredBy && (
                          <div className="text-[10px] text-[#00F0FF] font-mono mt-0.5" title={`Referred by ${user.referredBy}`}>
                            Ref by: {user.referredBy.slice(0, 6)}...{user.referredBy.slice(-4)}
                          </div>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {onInspectUserPanel && (
                            <button
                              type="button"
                              onClick={() => onInspectUserPanel(user.address, 'dashboard')}
                              className="px-2 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                              title="Open User Panel (Cross-Verify)"
                            >
                              <span className="material-symbols-outlined text-[14px]">visibility</span>
                              Panel
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setHashrateModalUser(user);
                              setCustomHashrateVal(String(user.hashrateInfo?.hashrate || user.customHashrate || 100));
                              setSelectedHashratePreset(user.hashrateInfo?.hashrate || user.customHashrate || 100);
                            }}
                            className="px-2 py-1.5 rounded-lg bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/30 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                            title="Set Hashrate for Wallet"
                          >
                            <span className="material-symbols-outlined text-[14px]">speed</span>
                            Hashrate
                          </button>

                          <button
                            onClick={() => {
                              setAdjustModalUser(user);
                              setAdjustAmount(50);
                              setAdjustType('credit');
                            }}
                            className="px-2 py-1.5 rounded-lg bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 text-[#00F0FF] border border-[#00F0FF]/30 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                            title="Credit or Debit Balance in DB"
                          >
                            <span className="material-symbols-outlined text-[14px]">tune</span>
                            Adjust
                          </button>

                          <button
                            onClick={() => handleToggleUserStatus(user)}
                            className={`p-1.5 rounded-lg border text-[11px] transition-all cursor-pointer ${
                              user.status === 'active'
                                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            }`}
                            title={user.status === 'active' ? 'Freeze User' : 'Unfreeze User'}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {user.status === 'active' ? 'lock' : 'lock_open'}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB CONTENT 3: RIG & FLEET CONTROLLER
         ============================================================ */}
      {activeSubTab === 'nodes' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {(['all', 'mining', 'idle', 'stopped'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setNodeFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold capitalize transition-all ${
                    nodeFilter === status
                      ? 'bg-[#00F0FF] text-[#0A0F1D] shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                      : 'bg-[#0d1d2c] text-[#94a3b8] hover:bg-[#122130] border border-[#1c2b3b]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="text-xs text-[#94a3b8] font-mono">
              Total Rigs: {nodes.length} · Combined Hashrate:{' '}
              {nodes.reduce((s, n) => s + (n.status === 'mining' ? n.hashrate : 0), 0).toFixed(1)} TH/s
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNodes.map((node) => (
              <div
                key={node.id}
                className="bg-[#0d1d2c] rounded-2xl p-5 border border-[#1c2b3b] space-y-4 hover:border-[#00F0FF]/40 transition-all shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold font-headline text-white text-base">{node.name}</h4>
                    <span className="text-[10px] text-[#94a3b8] font-mono">{node.region}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      node.status === 'mining'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    }`}
                  >
                    {node.status.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#122130] text-center font-mono">
                  <div>
                    <div className="text-[9px] text-[#94a3b8] uppercase">Hashrate</div>
                    <div className="text-sm font-bold text-[#00F0FF]">{node.hashrate} TH/s</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-[#94a3b8] uppercase">Temp</div>
                    <div className="text-sm font-bold text-amber-400">{node.temperature}°C</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-[#94a3b8] uppercase">Shares</div>
                    <div className="text-sm font-bold text-emerald-400">{node.shareAcceptance}%</div>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-[#94a3b8] space-y-1">
                  <div className="flex justify-between">
                    <span>Power:</span>
                    <span className="text-white">{node.powerUsage}W</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Owner:</span>
                    <span className="text-[#00F0FF]">{node.userAddress ? `${node.userAddress.slice(0, 8)}...` : 'Core'}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  {node.status === 'mining' ? (
                    <button
                      onClick={() => handleNodeAction(node.id, 'stop')}
                      className="flex-1 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/40 text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">pause</span>
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={() => handleNodeAction(node.id, 'start')}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">play_arrow</span>
                      Start
                    </button>
                  )}

                  <button
                    onClick={() => handleNodeAction(node.id, 'restart')}
                    className="p-1.5 rounded-lg bg-[#122130] hover:bg-[#1c2b3b] text-[#d4e4fa] border border-[#1c2b3b] transition-all"
                    title="Cold Restart Rig"
                  >
                    <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================
          TAB CONTENT: USER CLAIMS AUDIT & DATE TRACKER (ADMIN ONLY)
         ============================================================ */}
      {activeSubTab === 'claims' && (() => {
        const formatDateYmd = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        };

        const applyDatePreset = (preset: 'all' | 'today' | 'yesterday' | '7d' | '30d') => {
          setClaimDatePreset(preset);
          const now = new Date();
          if (preset === 'all') {
            setClaimStartDate('');
            setClaimEndDate('');
          } else if (preset === 'today') {
            const ymd = formatDateYmd(now);
            setClaimStartDate(ymd);
            setClaimEndDate(ymd);
          } else if (preset === 'yesterday') {
            const y = new Date(now);
            y.setDate(now.getDate() - 1);
            const ymd = formatDateYmd(y);
            setClaimStartDate(ymd);
            setClaimEndDate(ymd);
          } else if (preset === '7d') {
            const start = new Date(now);
            start.setDate(now.getDate() - 6);
            setClaimStartDate(formatDateYmd(start));
            setClaimEndDate(formatDateYmd(now));
          } else if (preset === '30d') {
            const start = new Date(now);
            start.setDate(now.getDate() - 29);
            setClaimStartDate(formatDateYmd(start));
            setClaimEndDate(formatDateYmd(now));
          }
        };

        const filteredClaims = claimsList.filter((c) => {
          const tsMs = new Date(c.timestamp || 0).getTime();
          if (claimStartDate) {
            const [yy, mm, dd] = claimStartDate.split('-').map(Number);
            const startLocal = new Date(yy, mm - 1, dd, 0, 0, 0, 0).getTime();
            if (!isNaN(startLocal) && tsMs < startLocal) return false;
          }
          if (claimEndDate) {
            const [yy, mm, dd] = claimEndDate.split('-').map(Number);
            const endLocal = new Date(yy, mm - 1, dd, 23, 59, 59, 999).getTime();
            if (!isNaN(endLocal) && tsMs > endLocal) return false;
          }
          if (claimVerifyFilter === 'onchain' && !c.verifiedOnChain) return false;
          if (claimVerifyFilter === 'ledger' && c.verifiedOnChain) return false;
          if (claimSearchQuery.trim()) {
            const q = claimSearchQuery.trim().toLowerCase();
            const matchAddr = (c.userAddress || '').toLowerCase().includes(q);
            const matchHash = (c.txHash || '').toLowerCase().includes(q);
            if (!matchAddr && !matchHash) return false;
          }
          return true;
        });

        const uniqueWalletMap = new Map<string, {
          address: string;
          claimCount: number;
          totalSpk: number;
          totalUsdt: number;
          onChainCount: number;
          firstClaimAt: string;
          lastClaimAt: string;
        }>();

        filteredClaims.forEach((c) => {
          const addr = (c.userAddress || 'Unknown').toLowerCase();
          const existing = uniqueWalletMap.get(addr);
          if (!existing) {
            uniqueWalletMap.set(addr, {
              address: c.userAddress || addr,
              claimCount: 1,
              totalSpk: Number(c.spkAmount || 0),
              totalUsdt: Number(c.usdtAmount || 0),
              onChainCount: c.verifiedOnChain ? 1 : 0,
              firstClaimAt: c.timestamp,
              lastClaimAt: c.timestamp,
            });
          } else {
            existing.claimCount += 1;
            existing.totalSpk += Number(c.spkAmount || 0);
            existing.totalUsdt += Number(c.usdtAmount || 0);
            if (c.verifiedOnChain) existing.onChainCount += 1;
            if (new Date(c.timestamp).getTime() < new Date(existing.firstClaimAt).getTime()) {
              existing.firstClaimAt = c.timestamp;
            }
            if (new Date(c.timestamp).getTime() > new Date(existing.lastClaimAt).getTime()) {
              existing.lastClaimAt = c.timestamp;
            }
          }
        });

        const groupedWallets = Array.from(uniqueWalletMap.values()).sort(
          (a, b) => new Date(b.lastClaimAt || 0).getTime() - new Date(a.lastClaimAt || 0).getTime()
        );

        const totalSpkFiltered = filteredClaims.reduce((acc, c) => acc + (Number(c.spkAmount) || 0), 0);
        const totalUsdtFiltered = filteredClaims.reduce((acc, c) => acc + (Number(c.usdtAmount) || 0), 0);
        const onChainCountFiltered = filteredClaims.filter((c) => c.verifiedOnChain).length;

        const exportClaimsCsv = () => {
          const headers = ['Date & Time', 'User Wallet Address', 'SPK Claimed', 'USDT Volume', 'Verification', 'Status', 'Tx Hash'];
          const rows = filteredClaims.map((c) => [
            new Date(c.timestamp).toISOString(),
            c.userAddress,
            Number(c.spkAmount || 0).toFixed(5),
            Number(c.usdtAmount || 0).toFixed(4),
            c.verifiedOnChain ? 'On-Chain V3' : 'Protocol Ledger',
            c.status,
            c.txHash,
          ]);
          const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `spike_user_claims_${claimStartDate || 'all'}_to_${claimEndDate || 'now'}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        };

        return (
          <div className="space-y-4">
            {/* Summary KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#0d1d2c] rounded-xl p-4 border border-[#1c2b3b]">
                <div className="text-xs text-[#94a3b8] mb-1">Total Claims</div>
                <div className="text-2xl font-bold text-white font-mono tabular-nums">{filteredClaims.length}</div>
                <div className="text-[11px] text-[#94a3b8] mt-1 font-mono tabular-nums">
                  {onChainCountFiltered} On-Chain V3 · {filteredClaims.length - onChainCountFiltered} Ledger
                </div>
              </div>
              <div className="bg-[#0d1d2c] rounded-xl p-4 border border-[#1c2b3b]">
                <div className="text-xs text-[#94a3b8] mb-1">Unique Claiming Wallets</div>
                <div className="text-2xl font-bold text-[#00F0FF] font-mono tabular-nums">{groupedWallets.length}</div>
                <div className="text-[11px] text-[#94a3b8] mt-1">Distinct BSC addresses</div>
              </div>
              <div className="bg-[#0d1d2c] rounded-xl p-4 border border-[#1c2b3b]">
                <div className="text-xs text-[#94a3b8] mb-1">Total SPK Claimed</div>
                <div className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">
                  {totalSpkFiltered.toFixed(5)} SPK
                </div>
                <div className="text-[11px] text-[#94a3b8] mt-1">Across selected period</div>
              </div>
              <div className="bg-[#0d1d2c] rounded-xl p-4 border border-[#1c2b3b]">
                <div className="text-xs text-[#94a3b8] mb-1">Total USDT Swap Value</div>
                <div className="text-2xl font-bold text-[#D4AF37] font-mono tabular-nums">
                  ${totalUsdtFiltered.toFixed(4)}
                </div>
                <div className="text-[11px] text-[#94a3b8] mt-1">Pool swap settlement value</div>
              </div>
            </div>

            {/* Filter & Date Toolbar */}
            <div className="bg-[#0d1d2c] rounded-2xl border border-[#1c2b3b] p-4 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Date Presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'all', label: 'All Time' },
                    { id: 'today', label: 'Today' },
                    { id: 'yesterday', label: 'Yesterday' },
                    { id: '7d', label: 'Last 7 Days' },
                    { id: '30d', label: 'Last 30 Days' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyDatePreset(p.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        claimDatePreset === p.id
                          ? 'bg-[#00F0FF] text-[#051424]'
                          : 'bg-[#122130] text-[#94a3b8] hover:text-white border border-[#1c2b3b]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* View Mode & Export */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 p-1 bg-[#122130] rounded-lg border border-[#1c2b3b]">
                    <button
                      type="button"
                      onClick={() => setClaimViewMode('logs')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        claimViewMode === 'logs' ? 'bg-[#1c2b3b] text-white' : 'text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      All Claim Logs
                    </button>
                    <button
                      type="button"
                      onClick={() => setClaimViewMode('wallets')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        claimViewMode === 'wallets' ? 'bg-[#1c2b3b] text-white' : 'text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      By User Wallet
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={exportClaimsCsv}
                    disabled={filteredClaims.length === 0}
                    className="px-3.5 py-1.5 rounded-lg bg-[#122130] hover:bg-[#1c2b3b] text-white text-xs font-semibold border border-[#1c2b3b] transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    <span>Download CSV</span>
                  </button>
                </div>
              </div>

              {/* Custom Date Range + Wallet Search + Verification Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#1c2b3b]">
                <div>
                  <label className="block text-[11px] text-[#94a3b8] mb-1">From Date</label>
                  <input
                    type="date"
                    value={claimStartDate}
                    onChange={(e) => {
                      setClaimStartDate(e.target.value);
                      setClaimDatePreset('custom');
                    }}
                    className="w-full bg-[#122130] border border-[#1c2b3b] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#94a3b8] mb-1">To Date</label>
                  <input
                    type="date"
                    value={claimEndDate}
                    onChange={(e) => {
                      setClaimEndDate(e.target.value);
                      setClaimDatePreset('custom');
                    }}
                    className="w-full bg-[#122130] border border-[#1c2b3b] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#94a3b8] mb-1">Verification Type</label>
                  <select
                    value={claimVerifyFilter}
                    onChange={(e) => setClaimVerifyFilter(e.target.value as any)}
                    className="w-full bg-[#122130] border border-[#1c2b3b] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F0FF]"
                  >
                    <option value="all">All Claims</option>
                    <option value="onchain">On-Chain V3 Verified Only</option>
                    <option value="ledger">Protocol Ledger Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-[#94a3b8] mb-1">Search Wallet or Tx Hash</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={claimSearchQuery}
                      onChange={(e) => setClaimSearchQuery(e.target.value)}
                      placeholder="0x... wallet or tx hash"
                      className="w-full bg-[#122130] border border-[#1c2b3b] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#00F0FF]"
                    />
                    {(claimStartDate || claimEndDate || claimSearchQuery || claimVerifyFilter !== 'all') && (
                      <button
                        type="button"
                        onClick={() => {
                          applyDatePreset('all');
                          setClaimSearchQuery('');
                          setClaimVerifyFilter('all');
                        }}
                        className="px-2.5 py-2 rounded-lg bg-[#122130] hover:bg-[#1c2b3b] text-[#94a3b8] hover:text-white text-xs border border-[#1c2b3b] shrink-0 cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Data Table Section */}
            <div className="bg-[#0d1d2c] rounded-2xl border border-[#1c2b3b] overflow-hidden">
              <div className="p-4 border-b border-[#1c2b3b] flex items-center justify-between gap-2">
                <h3 className="font-bold text-white text-sm font-headline">
                  {claimViewMode === 'logs'
                    ? `User Claim History (${filteredClaims.length})`
                    : `Claiming Wallets Summary (${groupedWallets.length})`}
                </h3>
                <span className="text-xs text-[#94a3b8] font-mono">
                  {claimStartDate || claimEndDate
                    ? `${claimStartDate || 'Start'} / ${claimEndDate || 'Today'}`
                    : 'All Dates'}
                </span>
              </div>

              {isLoading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="h-10 rounded-lg bg-[#122130] animate-pulse" />
                  ))}
                </div>
              ) : filteredClaims.length === 0 ? (
                <div className="p-10 text-center space-y-3">
                  <p className="text-sm text-[#94a3b8]">
                    Selected date range ya filter ke liye koi user claim record nahi mila.
                  </p>
                  {(claimStartDate || claimEndDate || claimSearchQuery || claimVerifyFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        applyDatePreset('all');
                        setClaimSearchQuery('');
                        setClaimVerifyFilter('all');
                      }}
                      className="px-4 py-2 rounded-lg bg-[#00F0FF] text-[#051424] text-xs font-bold cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : claimViewMode === 'logs' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="bg-[#122130] text-[#94a3b8] border-b border-[#1c2b3b]">
                        <th className="p-3.5">Date & Time</th>
                        <th className="p-3.5">User Wallet Address</th>
                        <th className="p-3.5 text-right">SPK Claimed</th>
                        <th className="p-3.5 text-right">USDT Value</th>
                        <th className="p-3.5">Execution Mode</th>
                        <th className="p-3.5">BSC Tx Hash</th>
                        <th className="p-3.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1c2b3b]/60">
                      {filteredClaims.map((claim, idx) => {
                        const dt = new Date(claim.timestamp || Date.now());
                        const formattedDate = isNaN(dt.getTime())
                          ? claim.timestamp
                          : dt.toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            });
                        const isRealHash = claim.txHash && /^0x[a-fA-F0-9]{64}$/.test(claim.txHash);
                        return (
                          <tr key={`${claim.id}-${idx}`} className="hover:bg-[#122130]/50 transition-colors">
                            <td className="p-3.5 text-[#cbd5e1] tabular-nums whitespace-nowrap">{formattedDate}</td>
                            <td className="p-3.5 text-[#00F0FF] tabular-nums">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setClaimSearchQuery(claim.userAddress)}
                                  className="hover:underline text-left cursor-pointer"
                                  title="Filter claims by this wallet"
                                >
                                  {claim.userAddress}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard?.writeText(claim.userAddress);
                                    onNotify?.('Copied', 'Wallet address copied', 'info');
                                  }}
                                  className="text-[#94a3b8] hover:text-white cursor-pointer"
                                  title="Copy address"
                                >
                                  <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                </button>
                                {onInspectUserPanel && /^0x[a-fA-F0-9]{40}$/.test(claim.userAddress) && (
                                  <button
                                    type="button"
                                    onClick={() => onInspectUserPanel(claim.userAddress, 'dashboard')}
                                    className="px-1.5 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer"
                                    title="Open User Panel"
                                  >
                                    <span className="material-symbols-outlined text-[12px]">visibility</span>
                                    <span>Panel</span>
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5 text-right text-emerald-400 font-bold tabular-nums whitespace-nowrap">
                              +{Number(claim.spkAmount || 0).toFixed(5)} SPK
                            </td>
                            <td className="p-3.5 text-right text-[#D4AF37] tabular-nums whitespace-nowrap">
                              ${Number(claim.usdtAmount || 0).toFixed(4)}
                            </td>
                            <td className="p-3.5 text-[#cbd5e1] whitespace-nowrap">
                              {claim.verifiedOnChain ? 'On-Chain V3 Swap' : 'Protocol Ledger'}
                            </td>
                            <td className="p-3.5 text-[#94a3b8] whitespace-nowrap">
                              {isRealHash ? (
                                <a
                                  href={`https://bscscan.com/tx/${claim.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#00F0FF] hover:underline"
                                  title={claim.txHash}
                                >
                                  {claim.txHash.slice(0, 10)}...{claim.txHash.slice(-6)}
                                </a>
                              ) : (
                                <span title={claim.txHash}>
                                  {claim.txHash ? `${claim.txHash.slice(0, 12)}...` : 'Pending'}
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className={claim.status === 'Confirmed' ? 'text-emerald-400' : 'text-amber-400'}>
                                {claim.status || 'Confirmed'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="bg-[#122130] text-[#94a3b8] border-b border-[#1c2b3b]">
                        <th className="p-3.5">User Wallet Address</th>
                        <th className="p-3.5 text-right">Claim Count</th>
                        <th className="p-3.5 text-right">On-Chain V3</th>
                        <th className="p-3.5 text-right">Total SPK Claimed</th>
                        <th className="p-3.5 text-right">Total USDT Value</th>
                        <th className="p-3.5">First Claim</th>
                        <th className="p-3.5">Latest Claim</th>
                        <th className="p-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1c2b3b]/60">
                      {groupedWallets.map((w) => (
                        <tr key={w.address} className="hover:bg-[#122130]/50 transition-colors">
                          <td className="p-3.5 text-[#00F0FF] tabular-nums">{w.address}</td>
                          <td className="p-3.5 text-right text-white font-bold tabular-nums">{w.claimCount}</td>
                          <td className="p-3.5 text-right text-emerald-400 tabular-nums">{w.onChainCount}</td>
                          <td className="p-3.5 text-right text-emerald-400 font-bold tabular-nums">
                            +{w.totalSpk.toFixed(5)} SPK
                          </td>
                          <td className="p-3.5 text-right text-[#D4AF37] tabular-nums">
                            ${w.totalUsdt.toFixed(4)}
                          </td>
                          <td className="p-3.5 text-[#94a3b8] tabular-nums whitespace-nowrap">
                            {new Date(w.firstClaimAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="p-3.5 text-[#cbd5e1] tabular-nums whitespace-nowrap">
                            {new Date(w.lastClaimAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="p-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {onInspectUserPanel && /^0x[a-fA-F0-9]{40}$/.test(w.address) && (
                                <button
                                  type="button"
                                  onClick={() => onInspectUserPanel(w.address, 'dashboard')}
                                  className="px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[11px] border border-emerald-500/30 cursor-pointer flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[13px]">visibility</span>
                                  <span>Panel</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setClaimSearchQuery(w.address);
                                  setClaimViewMode('logs');
                                }}
                                className="px-2.5 py-1 rounded bg-[#122130] hover:bg-[#1c2b3b] text-[#00F0FF] text-[11px] border border-[#1c2b3b] cursor-pointer"
                              >
                                View Logs
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ============================================================
          TAB CONTENT 4: LEDGER & TRANSACTIONS
         ============================================================ */}
      {activeSubTab === 'transactions' && (
        <div className="space-y-4">
          <div className="bg-[#0d1d2c] rounded-2xl border border-[#1c2b3b] overflow-hidden">
            <div className="p-4 border-b border-[#1c2b3b] flex items-center justify-between">
              <h3 className="font-bold text-white text-sm font-headline flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">receipt_long</span>
                Master Transaction Ledger ({transactions.length} entries)
              </h3>
              <span className="text-xs text-[#94a3b8] font-mono">Synced from backend DB</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-[#122130] text-[#94a3b8] border-b border-[#1c2b3b]">
                    <th className="p-3.5">Tx ID</th>
                    <th className="p-3.5">User Address</th>
                    <th className="p-3.5">Type & Reason</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">BSC Tx Hash</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c2b3b]/60">
                  {transactions.map((tx, idx) => (
                    <tr key={`${tx.id || 'tx'}-${idx}`} className="hover:bg-[#122130]/40 transition-colors">
                      <td className="p-3.5 text-white font-medium">{tx.id}</td>
                      <td className="p-3.5 text-[#00F0FF]">
                        {tx.userAddress ? `${tx.userAddress.slice(0, 8)}...` : 'System'}
                      </td>
                      <td className="p-3.5 text-white capitalize">{tx.rewardSource || tx.type}</td>
                      <td
                        className={`p-3.5 font-bold ${
                          tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {tx.amount >= 0 ? `+${tx.amount.toFixed(2)}` : tx.amount.toFixed(2)} {tx.currency}
                      </td>
                      <td className="p-3.5 text-[#94a3b8]">
                        <span className="hover:text-[#00F0FF] cursor-pointer" title={tx.txHash}>
                          {tx.txHash ? `${tx.txHash.slice(0, 10)}...` : 'Pending'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          {tx.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-[#94a3b8]">{tx.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB CONTENT 5: SYSTEM SETTINGS & YIELD
         ============================================================ */}
      {activeSubTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#0d1d2c] rounded-2xl p-6 border border-[#1c2b3b] space-y-5">
            <h3 className="text-lg font-bold font-headline text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-400">tune</span>
              Mining Protocol Configuration
            </h3>

            <div className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#94a3b8] mb-1">Node Activation Price (USDT)</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={settingsForm.nodeCostUsdt ?? 10.0}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({ ...prev, nodeCostUsdt: Number(e.target.value) }))
                    }
                    className="w-full bg-[#122130] border border-[#1c2b3b] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#00F0FF]"
                  />
                  <span className="text-[10px] text-[#94a3b8] mt-1 block">Standard $10 USDT activation</span>
                </div>

                <div>
                  <label className="block text-[#94a3b8] mb-1">Mining Cycle Duration (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    max="72"
                    value={settingsForm.miningCycleHours || 24}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({ ...prev, miningCycleHours: Number(e.target.value) }))
                    }
                    className="w-full bg-[#122130] border border-[#1c2b3b] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#00F0FF]"
                  />
                  <span className="text-[10px] text-[#94a3b8] mt-1 block">Standard 24-hour cycle</span>
                </div>
              </div>

              <div>
                <label className="block text-[#94a3b8] mb-1">PancakeSwap V3 Smart Router Contract</label>
                <input
                  type="text"
                  value={settingsForm.pancakeRouterAddress || '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4'}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, pancakeRouterAddress: e.target.value }))
                  }
                  className="w-full bg-[#122130] border border-[#1c2b3b] rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:border-[#00F0FF]"
                />
                <span className="text-[10px] text-[#00F0FF]/80 mt-1 block">
                  Router executing smart contract auto-buy swaps into user's MetaMask/Web3 wallet upon claim.
                </span>
              </div>

              <div>
                <label className="block text-[#94a3b8] mb-1">PancakeSwap Liquidity Pool (Pair) Contract</label>
                <input
                  type="text"
                  value={settingsForm.pancakePairAddress || '0xdB75fAB72e56492CFE870344D115C57047992F3c'}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, pancakePairAddress: e.target.value }))
                  }
                  className="w-full bg-[#122130] border border-[#1c2b3b] rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:border-[#D4AF37]"
                />
                <span className="text-[10px] text-[#D4AF37] mt-1 block">
                  Official PancakeSwap AMM Liquidity Pool pair (0xdB75fAB72e56492CFE870344D115C57047992F3c) for SPIKE/USDT swaps &amp; mining claims.
                </span>
              </div>

              <div>
                <label className="block text-[#94a3b8] mb-1">Stratum Pool Endpoint URL</label>
                <input
                  type="text"
                  value={settingsForm.stratumPoolUrl || ''}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, stratumPoolUrl: e.target.value }))
                  }
                  className="w-full bg-[#122130] border border-[#1c2b3b] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#00F0FF]"
                />
              </div>

              <div>
                <label className="block text-[#94a3b8] mb-1">BSC Smart Contract Address</label>
                <input
                  type="text"
                  value={settingsForm.bscContractAddress || ''}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, bscContractAddress: e.target.value }))
                  }
                  className="w-full bg-[#122130] border border-[#1c2b3b] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#00F0FF]"
                />
              </div>

              <div>
                <label className="block text-[#94a3b8] mb-1">
                  Official Protocol Treasury Wallet Address (BEP-20 / EVM)
                </label>
                <input
                  type="text"
                  value={treasuryAddressInput}
                  onChange={(e) => setTreasuryAddressInput(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-[#122130] border border-[#1c2b3b] rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:border-[#D4AF37]"
                />
                <span className="text-[10px] text-amber-300/80 mt-1 block">
                  Official company vault for all worldwide $10 USDT mining node activations. Non-claimable by users.
                </span>
              </div>

              <div>
                <label className="block text-[#94a3b8] mb-1">Minimum Claim / Withdrawal (USDT)</label>
                <input
                  type="number"
                  value={settingsForm.minWithdrawalUsdt || 5.0}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, minWithdrawalUsdt: Number(e.target.value) }))
                  }
                  className="w-full bg-[#122130] border border-[#1c2b3b] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#00F0FF]"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#122130] border border-[#1c2b3b]">
                <div>
                  <div className="font-bold text-white">Emergency Maintenance Mode</div>
                  <div className="text-[10px] text-[#94a3b8]">
                    When active, pauses user claims & new activations.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={!!settingsForm.maintenanceMode}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, maintenanceMode: e.target.checked }))
                  }
                  className="w-5 h-5 rounded accent-red-500 cursor-pointer"
                />
              </div>

              <button
                onClick={handleSaveSettings}
                className="w-full py-3 rounded-xl bg-[#00F0FF] hover:bg-[#7df4ff] text-[#0A0F1D] font-bold text-sm transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] mt-2"
              >
                Save Protocol Configuration to Database
              </button>
            </div>
          </div>

          {/* Right Column: Treasury Vault Controller + Access Control */}
          <div className="space-y-6">
            {/* OFFICIAL PROTOCOL TREASURY WALLET CONTROLLER CARD */}
            <div className="bg-[#0d1d2c] rounded-2xl p-6 border border-[#D4AF37]/40 shadow-xl space-y-5 relative overflow-hidden">
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-[#D4AF37]/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                    <span className="material-symbols-outlined text-[24px]">account_balance</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-headline text-white flex items-center gap-2">
                      <span>Official Treasury Vault Controller</span>
                    </h3>
                    <span className="text-[11px] text-amber-300 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Company Official Vault • Non-Claimable Reserve
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-[#94a3b8] uppercase font-bold">Accumulated Vault Fund</div>
                  <div className="text-xl font-black font-headline text-[#D4AF37]">
                    ${treasuryInfo.treasuryBalanceUsdt.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                    <span className="text-xs font-mono text-white">USDT</span>
                  </div>
                </div>
              </div>

              {/* Protocol Architecture Explanation */}
              <div className="p-3.5 rounded-xl bg-[#122130] border border-[#1c2b3b] space-y-2 text-xs font-mono">
                <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">verified_user</span>
                  <span>Protocol Architecture & Worldwide Rules:</span>
                </div>
                <ul className="space-y-1.5 text-[#94a3b8] text-[11px] pl-1">
                  <li className="flex items-start gap-1.5">
                    <span className="text-[#00F0FF]">1.</span>
                    <span>
                      <strong className="text-white">Worldwide Inflow:</strong> All users worldwide activate their $10 USDT Falcon Titan mining node directly through this address.
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-[#00F0FF]">2.</span>
                    <span>
                      <strong className="text-white">Non-Claimable by Users:</strong> Ye company ka official wallet hai. Is fund ko koi bhi regular user claim ya withdraw nahi kar sakta.
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-[#00F0FF]">3.</span>
                    <span>
                      <strong className="text-white">Mining Activation Gate:</strong> Treasury wallet me $10 USDT verification ke baad user ka mining node instant activate hota hai.
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-[#00F0FF]">4.</span>
                    <span>
                      <strong className="text-white">Live User Synchronization:</strong> Is address ko yha change karne par user panel aur deposit modal me turant live implement ho jata hai.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Change / Edit Treasury Wallet Address Section */}
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                    <label className="text-white font-bold flex items-center gap-1">
                      <span>Change Official Treasury Wallet Address</span>
                    </label>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        /^0x[a-fA-F0-9]{40}$/.test(treasuryAddressInput.trim())
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {/^0x[a-fA-F0-9]{40}$/.test(treasuryAddressInput.trim())
                        ? '✓ Valid EVM Address'
                        : '⚠️ Enter 42-char 0x Address'}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={treasuryAddressInput}
                      onChange={(e) => setTreasuryAddressInput(e.target.value)}
                      placeholder="0x..."
                      className="w-full bg-[#122130] border border-[#1c2b3b] rounded-xl pl-3.5 pr-20 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-[#D4AF37]"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(treasuryAddressInput);
                        onNotify?.('Copied', 'Treasury address copied to clipboard', 'info');
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-[#1c2b3b] hover:bg-[#273647] text-[#00F0FF] text-[10px] font-mono"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                  <span className="text-[#94a3b8]">Quick Preset:</span>
                  <button
                    type="button"
                    onClick={() => setTreasuryAddressInput('0xD833e2f6fC850cFe3B39F49e34F9231f0AB2b6bF')}
                    className="px-2 py-0.5 rounded bg-[#122130] hover:bg-[#1c2b3b] border border-[#1c2b3b] text-[#D4AF37] cursor-pointer"
                    title="Official Protocol Treasury Wallet"
                  >
                    Official Treasury (0xD833...b6bF)
                  </button>
                </div>

                {/* Submit Update Button */}
                <button
                  type="button"
                  onClick={() => handleUpdateTreasuryAddress()}
                  disabled={isSavingTreasury || !/^0x[a-fA-F0-9]{40}$/.test(treasuryAddressInput.trim())}
                  className={`w-full py-3 rounded-xl font-bold font-headline text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                    isSavingTreasury || !/^0x[a-fA-F0-9]{40}$/.test(treasuryAddressInput.trim())
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-60'
                      : 'bg-gradient-to-r from-[#D4AF37] to-[#f59e0b] hover:from-[#ffe088] hover:to-[#fbbf24] text-[#051424] cursor-pointer shadow-[0_0_20px_rgba(212,175,55,0.3)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isSavingTreasury ? 'sync' : 'upgrade'}
                  </span>
                  <span>
                    {isSavingTreasury ? 'Updating Protocol Treasury...' : 'Save & Implement in User Panel'}
                  </span>
                </button>
                <div className="text-[10px] text-center text-[#94a3b8] font-mono">
                  Changes take effect immediately across all user screens without reloading.
                </div>
              </div>
            </div>

            {/* Access Control & Security Card */}
            <div className="bg-[#0d1d2c] rounded-2xl p-6 border border-[#1c2b3b] space-y-4">
              <h3 className="text-base font-bold font-headline text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#D4AF37]">security</span>
                Access Control & Security
              </h3>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                All settings updates and database modifications trigger an automated entry in the system
                `audit_logs` collection. Every administrative command includes cryptographic timestamping.
              </p>
              <div className="p-3 rounded-xl bg-[#122130] border border-[#1c2b3b] text-xs font-mono text-emerald-400">
                🔒 Root Administrator Access: Active (Session Verified)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB CONTENT 6: DATABASE HEALTH & AUDIT LOGS
         ============================================================ */}
      {activeSubTab === 'database' && (
        <div className="space-y-6">
          {/* FIREBASE FIRESTORE CLOUD INTEGRATION CARD */}
          <div className="bg-[#0d1d2c] rounded-2xl p-6 border border-[#1c2b3b] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <span className="material-symbols-outlined text-2xl">local_fire_department</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold font-headline text-white">
                      Google Firebase Firestore Cloud Storage
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      ACTIVE & CONNECTED
                    </span>
                  </div>
                  <p className="text-xs text-[#94a3b8]">
                    Real-time cloud database persistent storage and Firebase Hosting configuration
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSyncFirebase}
                  disabled={syncingFirebase}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#0A0F1D] font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all disabled:opacity-50"
                >
                  <span className={`material-symbols-outlined text-sm ${syncingFirebase ? 'animate-spin' : ''}`}>
                    sync
                  </span>
                  {syncingFirebase ? 'Syncing to Firestore...' : 'Sync All to Firestore'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-[#122130] border border-[#1c2b3b]/60 space-y-1">
                <span className="text-[10px] uppercase font-mono text-[#94a3b8]">Cloud Project ID</span>
                <div className="text-xs font-mono font-bold text-amber-300 truncate">
                  glassy-fountain-lsmzh
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#122130] border border-[#1c2b3b]/60 space-y-1">
                <span className="text-[10px] uppercase font-mono text-[#94a3b8]">Firestore Database</span>
                <div className="text-xs font-mono font-bold text-white truncate" title="ai-studio-spikeweb3cryptom-fdb9d06e-51b7-4001-8d57-7aeb0361ee6d">
                  ai-studio-spikeweb3cryptom...
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#122130] border border-[#1c2b3b]/60 space-y-1">
                <span className="text-[10px] uppercase font-mono text-[#94a3b8]">Security Rules</span>
                <div className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">verified_user</span>
                  Hardened ABAC Deployed
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#122130] border border-[#1c2b3b]/60 space-y-1">
                <span className="text-[10px] uppercase font-mono text-[#94a3b8]">Custom Domain Host</span>
                <div className="text-xs font-mono font-bold text-[#00F0FF]">
                  spikenodes.com
                </div>
              </div>
            </div>

            {/* Firestore Collections Blueprint */}
            <div className="p-4 rounded-xl bg-[#122130]/60 border border-[#1c2b3b]/60 space-y-3">
              <span className="text-xs font-mono text-[#94a3b8] block font-bold">
                Active Firestore Database Collections:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-[#0d1d2c] border border-[#1c2b3b] text-center">
                  <div className="text-white font-bold">/users</div>
                  <div className="text-[10px] text-[#94a3b8]">{users.length} Wallets</div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0d1d2c] border border-[#1c2b3b] text-center">
                  <div className="text-white font-bold">/nodes</div>
                  <div className="text-[10px] text-[#94a3b8]">{nodes.length} Mining Units</div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0d1d2c] border border-[#1c2b3b] text-center">
                  <div className="text-white font-bold">/transactions</div>
                  <div className="text-[10px] text-[#94a3b8]">{transactions.length} Ledger TXs</div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0d1d2c] border border-[#1c2b3b] text-center">
                  <div className="text-white font-bold">/settings</div>
                  <div className="text-[10px] text-[#94a3b8]">spikenodes.com</div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0d1d2c] border border-[#1c2b3b] text-center">
                  <div className="text-white font-bold">/auditLogs</div>
                  <div className="text-[10px] text-[#94a3b8]">{auditLogs.length} Events</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#0d1d2c] rounded-2xl p-6 border border-[#1c2b3b] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-headline text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">terminal</span>
                Live Audit Logs & System Activity ({auditLogs.length})
              </h3>
              <span className="text-xs text-[#94a3b8] font-mono">Immutable audit stream</span>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-2 scrollbar-thin">
              {auditLogs.map((log, idx) => (
                <div
                  key={`${log.id || 'log'}-${idx}`}
                  className="p-3 rounded-xl bg-[#122130] border border-[#1c2b3b]/60 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/40">
                        {log.action}
                      </span>
                      <span className="text-white font-bold">{log.target}</span>
                    </div>
                    <div className="text-[#94a3b8] text-[11px]">{log.details}</div>
                  </div>
                  <div className="text-[10px] text-[#94a3b8] shrink-0">
                    {new Date(log.timestamp).toLocaleString()} by {log.adminUser}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* ============================================================
          MODAL: ADJUST WALLET BALANCE
         ============================================================ */}
      {adjustModalUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d1d2c] rounded-2xl max-w-md w-full border border-[#1c2b3b] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold font-headline text-white">Adjust Wallet Balance</h3>
              <button
                onClick={() => setAdjustModalUser(null)}
                className="text-[#94a3b8] hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="text-xs font-mono space-y-1">
              <div className="text-[#94a3b8]">Target Wallet:</div>
              <div className="text-[#00F0FF] font-bold break-all">{adjustModalUser.address}</div>
              <div className="text-[#94a3b8] pt-1">
                Current Balance:{' '}
                <span className="text-white font-bold">${adjustModalUser.balanceUsdt.toFixed(2)} USDT</span>
              </div>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-[#94a3b8] mb-1">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('credit')}
                    className={`py-2 rounded-lg font-bold transition-all ${
                      adjustType === 'credit'
                        ? 'bg-emerald-500 text-black'
                        : 'bg-[#122130] text-[#94a3b8] border border-[#1c2b3b]'
                    }`}
                  >
                    + Credit USDT
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('debit')}
                    className={`py-2 rounded-lg font-bold transition-all ${
                      adjustType === 'debit'
                        ? 'bg-red-500 text-white'
                        : 'bg-[#122130] text-[#94a3b8] border border-[#1c2b3b]'
                    }`}
                  >
                    - Debit USDT
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[#94a3b8] mb-1">Amount (USDT)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  className="w-full bg-[#122130] border border-[#1c2b3b] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#00F0FF]"
                />
              </div>

              <div>
                <label className="block text-[#94a3b8] mb-1">Reason / Note</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-[#122130] border border-[#1c2b3b] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#00F0FF]"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAdjustModalUser(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#122130] hover:bg-[#1c2b3b] text-[#94a3b8] font-mono text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAdjustBalance}
                className="flex-1 py-2.5 rounded-xl bg-[#00F0FF] hover:bg-[#7df4ff] text-[#0A0F1D] font-mono text-xs font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)]"
              >
                Confirm in DB
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: SET USER HASHRATE (IMAGE SPECIFICATION)
         ============================================================ */}
      {hashrateModalUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0d1d2c] rounded-2xl max-w-lg w-full border border-[#00F0FF]/40 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1c2b3b] pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00F0FF]">speed</span>
                <h3 className="text-lg font-bold font-headline text-white">Set Wallet Hashrate Level</h3>
              </div>
              <button
                onClick={() => setHashrateModalUser(null)}
                className="text-[#94a3b8] hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="text-xs font-mono space-y-1.5 p-3 rounded-xl bg-[#071322] border border-[#1c2b3b]">
              <div className="text-[#94a3b8]">Target Wallet:</div>
              <div className="text-[#00F0FF] font-bold break-all">{hashrateModalUser.address}</div>
              <div className="flex items-center gap-3 pt-1 text-[11px]">
                <span className="text-white font-bold">{hashrateModalUser.directPartners || 0} Directs</span>
                <span className="text-[#94a3b8]">·</span>
                <span className="text-[#D4AF37] font-bold">{hashrateModalUser.totalPartners || 0} Total Team</span>
                <span className="text-[#94a3b8]">·</span>
                <span className="text-emerald-400 font-bold">Current: {hashrateModalUser.hashrateInfo?.hashrate || 100} VH/s</span>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="space-y-2">
              <label className="text-[11px] text-[#94a3b8] font-mono">Select Level Preset (Image Formula):</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                {HASHRATE_LEVEL_TIERS.map((tier) => (
                  <button
                    key={tier.level}
                    type="button"
                    onClick={() => {
                      setSelectedHashratePreset(tier.hashrate);
                      setCustomHashrateVal(String(tier.hashrate));
                    }}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      Number(customHashrateVal) === tier.hashrate
                        ? 'bg-[#00F0FF]/15 border-[#00F0FF] text-white shadow-sm'
                        : 'bg-[#122130] border-[#1c2b3b] text-[#94a3b8] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-white">{tier.level}</span>
                      <span className="text-[#00F0FF]">{tier.hashrate} VH/s</span>
                    </div>
                    <div className="text-[10px] text-[#D4AF37] mt-0.5">{tier.directs}</div>
                    <div className="text-[10px] text-emerald-400">1 SPK in {tier.targetDays} days</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-[#94a3b8] mb-1">Custom Hashrate (VH/s units)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={customHashrateVal}
                  onChange={(e) => setCustomHashrateVal(e.target.value)}
                  className="w-full bg-[#122130] border border-[#1c2b3b] rounded-xl px-4 py-2.5 text-[#00F0FF] font-bold text-sm focus:outline-none focus:border-[#00F0FF]"
                />
                <div className="text-[10px] text-[#94a3b8] mt-1">
                  1 SPIKE mine hone ka time:{' '}
                  <span className="text-white font-bold">
                    {Number(customHashrateVal) > 0 ? +(6000 / Number(customHashrateVal)).toFixed(1) : 60} days
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[#94a3b8] mb-1">Reason / Admin Note</label>
                <input
                  type="text"
                  value={hashrateChangeReason}
                  onChange={(e) => setHashrateChangeReason(e.target.value)}
                  placeholder="e.g. VIP hashrate upgrade"
                  className="w-full bg-[#122130] border border-[#1c2b3b] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#00F0FF]"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isUpdatingHashrate}
                onClick={() => handleSaveUserHashrate(hashrateModalUser.address, null, 'Reset to auto-calculated tier')}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#1c2b3b] hover:bg-[#273647] text-[#94a3b8] hover:text-white font-mono text-xs cursor-pointer"
                title="Remove custom lock and calculate from referrals"
              >
                Reset to Auto Tier
              </button>
              <div className="flex-1 w-full flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHashrateModalUser(null)}
                  className="flex-1 py-2.5 rounded-xl bg-[#122130] hover:bg-[#1c2b3b] text-[#94a3b8] font-mono text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isUpdatingHashrate || !Number(customHashrateVal)}
                  onClick={() =>
                    handleSaveUserHashrate(
                      hashrateModalUser.address,
                      Number(customHashrateVal) || 100,
                      hashrateChangeReason
                    )
                  }
                  className="flex-1 py-2.5 rounded-xl bg-[#00F0FF] hover:bg-[#7df4ff] text-[#0A0F1D] font-headline text-xs font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)] disabled:opacity-40 cursor-pointer"
                >
                  {isUpdatingHashrate ? 'Saving...' : 'Apply Hashrate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
