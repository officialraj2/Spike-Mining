/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { db as firestoreDb } from './firebase';
import { doc, onSnapshot, getDoc, getDocs, collection } from 'firebase/firestore';
import { TabType, MiningNode, RewardTransaction, ToastMessage, HashrateLevelInfo, AdminSettings } from './types';
import { INITIAL_NODES, INITIAL_REWARDS } from './data/mockData';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { HomeView } from './components/views/HomeView';
import { Toast } from './components/Toast';
import { BlockchainBackground } from './components/BlockchainBackground';
import { fetchOnChainBalances } from './services/onchainBalance';
import { registerReferralInFirestore, getReferralsFromFirestore, isUserAlreadyBonded } from './services/firestoreReferrals';
import { persistMiningStart, fetchActiveMiningSession } from './services/miningSessionSync';
import { getRealActiveAccount, requestWeb3Connection, subscribeToWeb3AccountChanges } from './services/web3WalletSync';
import { AiMiningAssistant } from './components/AiMiningAssistant';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DashboardView } from './components/views/DashboardView';
import { MiningNodesView } from './components/views/MiningNodesView';
import { ReferralsView } from './components/views/ReferralsView';
import { WithdrawalHistoryView } from './components/views/WithdrawalHistoryView';
import { RoadmapView } from './components/views/RoadmapView';
import {
  clearAdminSession,
  getActiveAdminSession,
  isMasterWalletHashMatch,
} from './services/adminAuth';

function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    const delays = [400, 1000, 2000];
    let lastError: unknown;
    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        return await factory();
      } catch (err) {
        lastError = err;
        if (attempt < delays.length) {
          await new Promise((r) => setTimeout(r, delays[attempt]));
        }
      }
    }
    throw lastError;
  });
}

// Lazy-load Admin panel and on-demand modals with multi-attempt retry
const AdminView = lazyWithRetry(() => import('./components/views/AdminView').then(m => ({ default: m.AdminView })));

const ConnectWalletModal = lazyWithRetry(() => import('./components/modals/ConnectWalletModal').then(m => ({ default: m.ConnectWalletModal })));
const DeployNodeModal = lazyWithRetry(() => import('./components/modals/DeployNodeModal').then(m => ({ default: m.DeployNodeModal })));
const ClaimRewardsModal = lazyWithRetry(() => import('./components/modals/ClaimRewardsModal').then(m => ({ default: m.ClaimRewardsModal })));
const AuditModal = lazyWithRetry(() => import('./components/modals/AuditModal').then(m => ({ default: m.AuditModal })));
const SwapModal = lazyWithRetry(() => import('./components/modals/SwapModal').then(m => ({ default: m.SwapModal })));
const TestnetTestingModal = lazyWithRetry(() => import('./components/modals/TestnetTestingModal').then(m => ({ default: m.TestnetTestingModal })));
const DepositUsdtModal = lazyWithRetry(() => import('./components/modals/DepositUsdtModal').then(m => ({ default: m.DepositUsdtModal })));
const ReferralVerificationModal = lazyWithRetry(() => import('./components/modals/ReferralVerificationModal').then(m => ({ default: m.ReferralVerificationModal })));

// Ultra-fast lightweight skeleton loader
const ViewSkeleton: React.FC = () => (
  <div className="w-full space-y-4 animate-pulse pt-2">
    <div className="h-44 bg-[#0d1d2c]/60 rounded-3xl border border-[#1c2b3b]/40 flex items-center justify-center">
      <div className="w-7 h-7 rounded-full border-2 border-[#00F0FF] border-t-transparent animate-spin" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="h-32 bg-[#0d1d2c]/40 rounded-2xl border border-[#1c2b3b]/30" />
      <div className="h-32 bg-[#0d1d2c]/40 rounded-2xl border border-[#1c2b3b]/30" />
      <div className="h-32 bg-[#0d1d2c]/40 rounded-2xl border border-[#1c2b3b]/30" />
    </div>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab') as TabType;
      if (tabParam) return tabParam;
      return (localStorage.getItem('spike_active_tab') as TabType) || 'home';
    } catch {
      return 'home';
    }
  });

  const [viewMode, setViewMode] = useState<'auto' | 'mobile' | 'desktop'>('auto');

  // Application Data States (Scoped to current connected wallet, persisted across reloads)
  const [nodes, setNodes] = useState<MiningNode[]>(() => {
    try {
      const savedAddr = localStorage.getItem('spike_wallet_address');
      if (savedAddr) {
        const cached = localStorage.getItem(`spike_nodes_${savedAddr.toLowerCase()}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
      return [];
    } catch {
      return [];
    }
  });
  const [rewards, setRewards] = useState<RewardTransaction[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    try {
      const savedAddr = localStorage.getItem('spike_wallet_address');
      if (savedAddr) {
        const cached = localStorage.getItem(`spike_bal_${savedAddr.toLowerCase()}`);
        if (cached !== null && !isNaN(Number(cached))) return Number(cached);
      }
      return 0.0;
    } catch {
      return 0.0;
    }
  });
  const [walletBNB, setWalletBNB] = useState<number>(() => {
    try {
      const savedAddr = localStorage.getItem('spike_wallet_address');
      if (savedAddr) {
        const cached = localStorage.getItem(`spike_bnb_${savedAddr.toLowerCase()}`);
        if (cached !== null && !isNaN(Number(cached))) return Number(cached);
      }
      return 0.0;
    } catch {
      return 0.0;
    }
  });
  // Real-time on-chain SPIKE BEP-20 token balance (Contract: 0xc213905ac995bCC943c077b7918c8134094A9267)
  const [walletSpk, setWalletSpk] = useState<number>(() => {
    try {
      const savedAddr = localStorage.getItem('spike_wallet_address');
      if (savedAddr) {
        const cached = localStorage.getItem(`spike_onchain_spk_${savedAddr.toLowerCase()}`);
        if (cached !== null && !isNaN(Number(cached))) return Number(cached);
      }
      return 0.0;
    } catch {
      return 0.0;
    }
  });
  // Real-time on-chain Web3 USDT balance (Contract: 0x55d398326f99059fF775485246999027B3197955)
  const [walletOnchainUsdt, setWalletOnchainUsdt] = useState<number>(() => {
    try {
      const savedAddr = localStorage.getItem('spike_wallet_address');
      if (savedAddr) {
        const cached = localStorage.getItem(`spike_onchain_usdt_${savedAddr.toLowerCase()}`);
        if (cached !== null && !isNaN(Number(cached))) return Number(cached);
      }
      return 0.0;
    } catch {
      return 0.0;
    }
  });

  const [dailyEarnings, setDailyEarnings] = useState<number>(() => 0);
  const [network, setNetwork] = useState<string>('BEP-20 / BSC Network');
  const [referralStats, setReferralStats] = useState<any>({
    directPartners: 0,
    downlinePartners: 0,
    totalPartners: 0,
    totalCommissions: 0,
    referrals: [],
  });

  // Dedicated Hashrate Tier Info state (Protocol formula: 100 * (60 / Target Days))
  const [hashrateInfo, setHashrateInfo] = useState<HashrateLevelInfo | null>(() => {
    try {
      const savedAddr = localStorage.getItem('spike_wallet_address');
      if (savedAddr) {
        const cached = localStorage.getItem(`spike_hashrate_${savedAddr.toLowerCase()}`);
        if (cached) return JSON.parse(cached);
      }
      const globalInfo = localStorage.getItem('spike_hashrate_info');
      if (globalInfo) return JSON.parse(globalInfo);
      return {
        level: 'Fresh user',
        levelNumber: 0,
        hashrate: 100,
        unit: 'VH/s',
        targetDays: 60,
        dailySpkYield: 0.01667,
        requirementText: '0 referrals (Base Tier)',
        directCount: 0,
        totalTeamCount: 0,
        isCustomOverride: false,
        nextTier: {
          level: 'Level 1',
          hashrate: 200,
          requirementText: '10 direct referrals',
          neededDirects: 10,
          neededTeam: 0,
        },
      };
    } catch {
      return null;
    }
  });

  // Wallet Auth State
  const [isWalletConnected, setIsWalletConnected] = useState<boolean>(() => {
    try {
      return localStorage.getItem('spike_wallet_connected') === 'true';
    } catch {
      return false;
    }
  });
  const [walletAddress, setWalletAddress] = useState<string>(() => {
    try {
      return localStorage.getItem('spike_wallet_address') || '';
    } catch {
      return '';
    }
  });

  const walletAddressRef = useRef(walletAddress);
  const isWalletConnectedRef = useRef(isWalletConnected);
  useEffect(() => {
    walletAddressRef.current = walletAddress;
    isWalletConnectedRef.current = isWalletConnected;
  }, [walletAddress, isWalletConnected]);

  const [globalSettings, setGlobalSettings] = useState<AdminSettings | null>(() => {
    try {
      const cached = localStorage.getItem('spike_global_settings');
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  });

  // Trigger counter to re-evaluate verified cryptographic admin session
  const [adminAuthTick, setAdminAuthTick] = useState<number>(0);

  // Hash-only check to show Admin navigation entry to connected Master Wallet owner (does NOT unlock admin!)
  const isMasterWalletEligible = Boolean(
    isWalletConnected &&
    walletAddress &&
    isMasterWalletHashMatch(walletAddress, globalSettings?.masterWalletAddresses)
  );

  // Admin & Master privileges strictly require an active verified ECDSA signature session
  const verifiedAdminSession =
    isWalletConnected && walletAddress
      ? getActiveAdminSession(walletAddress, globalSettings?.masterWalletAddresses)
      : null;

  // Keep adminAuthTick referenced so session unlock/lock re-renders immediately
  void adminAuthTick;

  const isMasterUser = Boolean(verifiedAdminSession);
  const isAdmin = Boolean(verifiedAdminSession);

  // Admin Cross-Verify User Panel Inspector State (100% isolated from Admin's walletAddress)
  const [inspectedWallet, setInspectedWallet] = useState<string | null>(null);
  const [isLoadingInspected, setIsLoadingInspected] = useState<boolean>(false);
  const [inspectedData, setInspectedData] = useState<{
    address: string;
    nodes: MiningNode[];
    rewards: RewardTransaction[];
    balanceUsdt: number;
    balanceBnb: number;
    balanceSpk: number;
    onchainUsdt: number;
    dailyEarnings: number;
    referralStats: any;
    hashrateInfo: HashrateLevelInfo | null;
    hasActivatedMining: boolean;
    isRootWallet: boolean;
    userFoundInDb: boolean;
  } | null>(null);

  const isInspectMode = Boolean(
    isAdmin &&
    inspectedWallet &&
    activeTab !== 'admin' &&
    activeTab !== 'home' &&
    activeTab !== 'roadmap'
  );

  // Read-only loader for inspected user wallet (never mutates target user's DB/localStorage state)
  useEffect(() => {
    if (!isAdmin || !inspectedWallet || !/^0x[a-fA-F0-9]{40}$/.test(inspectedWallet)) {
      setInspectedData(null);
      setIsLoadingInspected(false);
      return;
    }

    let cancelled = false;
    const targetAddr = inspectedWallet.trim();
    const norm = targetAddr.toLowerCase();

    setIsLoadingInspected(true);
    setInspectedData({
      address: targetAddr,
      nodes: [],
      rewards: [],
      balanceUsdt: 0,
      balanceBnb: 0,
      balanceSpk: 0,
      onchainUsdt: 0,
      dailyEarnings: 0,
      referralStats: {
        directPartners: 0,
        downlinePartners: 0,
        totalPartners: 0,
        totalCommissions: 0,
        referrals: [],
      },
      hashrateInfo: null,
      hasActivatedMining: false,
      isRootWallet: false,
      userFoundInDb: false,
    });

    (async () => {
      try {
        const [
          apiUserRes,
          apiRefRes,
          onchainRes,
          fsUserSnap,
          fsRefData,
          miningSession,
          fsNodesSnap,
          fsTxSnap,
        ] = await Promise.all([
          fetch(`/api/user/${targetAddr}`)
            .then((r) => (r.ok && !r.headers.get('content-type')?.includes('text/html') ? r.json() : null))
            .catch(() => null),
          fetch(`/api/referrals/stats/${targetAddr}`)
            .then((r) => (r.ok && !r.headers.get('content-type')?.includes('text/html') ? r.json() : null))
            .catch(() => null),
          fetchOnChainBalances(norm).catch(() => ({ usdt: 0, bnb: 0, spike: 0 })),
          getDoc(doc(firestoreDb, 'users', norm)).catch(() => null),
          getReferralsFromFirestore(norm).catch(() => null),
          fetchActiveMiningSession(norm).catch(() => null),
          getDocs(collection(firestoreDb, 'nodes')).catch(() => null),
          getDocs(collection(firestoreDb, 'transactions')).catch(() => null),
        ]);

        if (cancelled) return;

        const apiUser = apiUserRes?.user || null;
        const fsUser = fsUserSnap && fsUserSnap.exists() ? fsUserSnap.data() : null;
        const userFoundInDb = Boolean(apiUser || fsUser);

        // Merge nodes from API & Firestore
        let mergedNodes: MiningNode[] = Array.isArray(apiUserRes?.nodes) ? [...apiUserRes.nodes] : [];
        if (fsNodesSnap && !fsNodesSnap.empty) {
          const seenNodeIds = new Set(mergedNodes.map((n) => n.id));
          fsNodesSnap.forEach((docSnap) => {
            const d = docSnap.data() as any;
            if ((d.userAddress || '').toLowerCase() === norm && !seenNodeIds.has(d.id || docSnap.id)) {
              mergedNodes.push({ ...d, id: d.id || docSnap.id });
              seenNodeIds.add(d.id || docSnap.id);
            }
          });
        }

        const hasActivatedMining = Boolean(
          apiUser?.hasActivatedMining ||
          apiUser?.hasDepositedTreasury ||
          fsUser?.hasActivatedMining ||
          fsUser?.hasDepositedTreasury ||
          apiUserRes?.miningStatus?.is24hActive ||
          miningSession?.active ||
          mergedNodes.some((n) => n.status === 'mining')
        );

        if (mergedNodes.length === 0 && hasActivatedMining) {
          const cycleStart =
            Number(apiUserRes?.miningStatus?.cycleStartTime) ||
            Number(apiUser?.miningCycleStartTime) ||
            Number(miningSession?.startTime) ||
            Date.now();
          mergedNodes = [
            {
              id: `spk-node-${cycleStart}-${norm.slice(2, 6)}`,
              name: 'SPIKE ASIC Rig #1',
              region: 'US-East (Stratum Cluster)',
              status: 'mining',
              hashrate: miningSession?.hashrateVh || apiUserRes?.hashrateInfo?.hashrate || 100,
              temperature: 64,
              shareAcceptance: 99.98,
              fanSpeed: 75,
              powerUsage: 1400,
              uptimeDays: 1,
              algorithm: 'SHA-256 (Stratum)',
              logs: [
                '24-Hour Mining Cycle Active [Cross-Verify Snapshot]',
                'Connected to BSC stratum pool: stratum+tcp://pool.spikenodes.com:443',
              ],
              userAddress: targetAddr,
            },
          ];
        }

        // Merge transactions from API & Firestore
        let mergedRewards: RewardTransaction[] = Array.isArray(apiUserRes?.transactions)
          ? [...apiUserRes.transactions]
          : [];
        if (fsTxSnap && !fsTxSnap.empty) {
          const seenTxIds = new Set(mergedRewards.map((t) => t.id));
          fsTxSnap.forEach((docSnap) => {
            const d = docSnap.data() as any;
            if ((d.userAddress || '').toLowerCase() === norm && !seenTxIds.has(d.id || docSnap.id)) {
              mergedRewards.push({
                id: d.id || docSnap.id,
                txHash: d.txHash || '',
                rewardSource: d.rewardSource || d.details || d.type || 'Protocol Ledger',
                amount: Number(d.amount || 0),
                currency: d.currency || 'USDT',
                timestamp: d.timestamp || d.createdAt || '',
                status: d.status || 'Confirmed',
              });
              seenTxIds.add(d.id || docSnap.id);
            }
          });
        }

        // Merge Referral Stats
        let mergedRefStats: any =
          apiRefRes?.stats ||
          apiUserRes?.referralStats || {
            directPartners: 0,
            downlinePartners: 0,
            totalPartners: 0,
            totalCommissions: 0,
            referrals: [],
          };
        if (fsRefData && (fsRefData.directPartners > 0 || fsRefData.downlinePartners > 0)) {
          mergedRefStats = {
            ...mergedRefStats,
            directPartners: Math.max(mergedRefStats?.directPartners || 0, fsRefData.directPartners),
            downlinePartners: Math.max(mergedRefStats?.downlinePartners || 0, fsRefData.downlinePartners),
            totalPartners: Math.max(mergedRefStats?.totalPartners || 0, fsRefData.totalPartners),
            activeDirectPartners:
              typeof mergedRefStats?.activeDirectPartners === 'number'
                ? mergedRefStats.activeDirectPartners
                : fsRefData.activeDirectPartners || 0,
            activeDownlinePartners:
              typeof mergedRefStats?.activeDownlinePartners === 'number'
                ? mergedRefStats.activeDownlinePartners
                : fsRefData.activeDownlinePartners || 0,
            activeTotalPartners:
              typeof mergedRefStats?.activeTotalPartners === 'number'
                ? mergedRefStats.activeTotalPartners
                : fsRefData.activeTotalPartners || 0,
            levelCounts: fsRefData.levelCounts || mergedRefStats?.levelCounts,
            activeLevelCounts: mergedRefStats?.activeLevelCounts || fsRefData.activeLevelCounts,
            referrals:
              Array.isArray(mergedRefStats?.referrals) && mergedRefStats.referrals.length >= fsRefData.referrals.length
                ? mergedRefStats.referrals
                : fsRefData.referrals,
          };
        }

        const effectiveUsdt =
          typeof fsUser?.balanceUsdt === 'number'
            ? fsUser.balanceUsdt
            : typeof apiUser?.balanceUsdt === 'number'
            ? apiUser.balanceUsdt
            : typeof onchainRes?.usdt === 'number'
            ? onchainRes.usdt
            : 0;

        const effectiveBnb =
          typeof onchainRes?.bnb === 'number' && onchainRes.bnb > 0
            ? onchainRes.bnb
            : typeof fsUser?.balanceBnb === 'number'
            ? fsUser.balanceBnb
            : typeof apiUser?.balanceBnb === 'number'
            ? apiUser.balanceBnb
            : 0;

        const effectiveSpk = Math.max(
          typeof onchainRes?.spike === 'number' ? onchainRes.spike : 0,
          typeof apiUser?.balanceSpk === 'number' ? apiUser.balanceSpk : 0,
          typeof fsUser?.balanceSpk === 'number' ? fsUser.balanceSpk : 0
        );

        const activeMining = mergedNodes.filter((n) => n.status === 'mining');
        const calculatedYield = activeMining.reduce((acc, n) => acc + n.hashrate * 39, 0);

        const targetIsMaster = Boolean(
          isMasterWalletHashMatch(targetAddr, globalSettings?.masterWalletAddresses) ||
          apiUser?.role === 'master' ||
          fsUser?.role === 'master'
        );

        setInspectedData({
          address: targetAddr,
          nodes: mergedNodes,
          rewards: mergedRewards,
          balanceUsdt: effectiveUsdt,
          balanceBnb: effectiveBnb,
          balanceSpk: effectiveSpk,
          onchainUsdt: typeof onchainRes?.usdt === 'number' ? onchainRes.usdt : 0,
          dailyEarnings: +calculatedYield.toFixed(2),
          referralStats: mergedRefStats,
          hashrateInfo: apiUserRes?.hashrateInfo || null,
          hasActivatedMining,
          isRootWallet: targetIsMaster,
          userFoundInDb,
        });
      } catch (err) {
        console.warn('[App] Cross-Verify load note:', err);
      } finally {
        if (!cancelled) setIsLoadingInspected(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [inspectedWallet, isAdmin, globalSettings]);

  // Real-time synchronization of project-wide global settings
  useEffect(() => {
    const fetchGlobalSettings = () => {
      fetch('/api/settings')
        .then((r) => r.json())
        .then((data) => {
          if (data && data.settings) {
            setGlobalSettings(data.settings);
            try {
              localStorage.setItem('spike_global_settings', JSON.stringify(data.settings));
            } catch {}
          }
        })
        .catch(() => {});
    };
    fetchGlobalSettings();
    const handleSettingsUpdate = () => fetchGlobalSettings();
    window.addEventListener('spike_settings_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('spike_settings_updated', handleSettingsUpdate);
    };
  }, []);

  const [pendingInvite, setPendingInvite] = useState<{
    code: string;
    sponsorAddr: string | null;
  } | null>(() => {
    try {
      const code = localStorage.getItem('spike_pending_sponsor_code');
      const addr = localStorage.getItem('spike_pending_sponsor_addr') || localStorage.getItem('spike_pending_referrer');
      if (code || addr) {
        return {
          code: code || (addr ? `SPK-${addr.slice(2, 8).toUpperCase()}` : 'SPONSOR'),
          sponsorAddr: addr && addr.startsWith('0x') ? addr : null,
        };
      }
    } catch {}
    return null;
  });

  const isSelfInvite = Boolean(
    pendingInvite &&
    walletAddress &&
    ((pendingInvite.sponsorAddr && pendingInvite.sponsorAddr.toLowerCase() === walletAddress.toLowerCase()) ||
     (pendingInvite.code && pendingInvite.code.toLowerCase().replace(/^(spike-|spk-)/i, '') === walletAddress.toLowerCase().slice(2, 8)))
  );

  // Sync tab and capture referral link parameters (?tab=..., ?ref=..., /ref/...)
  useEffect(() => {
    try {
      let params = new URLSearchParams(window.location.search);
      if (!params.get('ref') && !params.get('sponsor') && window.location.hash.includes('?')) {
        params = new URLSearchParams(window.location.hash.slice(window.location.hash.indexOf('?') + 1));
      }
      const tabParam = params.get('tab');
      if (tabParam === 'admin' || window.location.hash === '#admin') {
        setActiveTab('admin');
      } else if (
        tabParam &&
        ['home', 'dashboard', 'mining-nodes', 'referrals', 'withdraw-history', 'roadmap'].includes(tabParam)
      ) {
        setActiveTab(tabParam as TabType);
      }

      // Live tab switcher event for AI Assistant and internal links
      const handleSwitchTab = (e: any) => {
        const t = e?.detail?.tab;
        if (t && ['home', 'dashboard', 'mining-nodes', 'referrals', 'withdraw-history', 'roadmap', 'admin'].includes(t)) {
          setActiveTab(t as TabType);
        }
      };
      window.addEventListener('spike_switch_tab', handleSwitchTab);

      // Capture referral code or address from URL (?ref=..., ?code=..., ?referrer=..., or /ref/..., /r/...)
      let refVal = params.get('ref') || params.get('code') || params.get('referrer') || params.get('r');
      const sponsorParam = params.get('sponsor');
      let sponsorAddr: string | null = null;
      if (sponsorParam && /^0x[a-fA-F0-9]{40}$/i.test(sponsorParam.trim())) {
        sponsorAddr = sponsorParam.trim();
      }

      if (!refVal && window.location.pathname.includes('/ref/')) {
        const parts = window.location.pathname.split('/ref/');
        if (parts[1]) {
          refVal = decodeURIComponent(parts[1].split('/')[0].split('?')[0]);
        }
      }
      if (!refVal && window.location.pathname.includes('/r/')) {
        const parts = window.location.pathname.split('/r/');
        if (parts[1]) {
          refVal = decodeURIComponent(parts[1].split('/')[0].split('?')[0]);
        }
      }

      // ALWAYS capture and store pending referral parameters from URL first
      if (sponsorAddr) {
        localStorage.setItem('spike_pending_sponsor_addr', sponsorAddr);
      }
      if (refVal && refVal.trim()) {
        const cleanRef = refVal.trim();
        const code = cleanRef.toUpperCase();
        localStorage.setItem('spike_pending_referrer', sponsorAddr || cleanRef);
        localStorage.setItem('spike_pending_sponsor_code', code);
        setPendingInvite({ code, sponsorAddr });
        setReferralCodeToVerify(sponsorAddr || cleanRef);
        console.log('[App] Referral link detected and saved:', { cleanRef, sponsorAddr });
      } else if (sponsorAddr) {
        const code = `SPK-${sponsorAddr.slice(2, 8).toUpperCase()}`;
        localStorage.setItem('spike_pending_referrer', sponsorAddr);
        localStorage.setItem('spike_pending_sponsor_code', code);
        setPendingInvite({ code, sponsorAddr });
        setReferralCodeToVerify(sponsorAddr);
      }

      // CHECK: If the CURRENTLY connected user is ALREADY permanently bonded, route them to Dashboard
      const savedUser = (localStorage.getItem('spike_wallet_address') || '').toLowerCase().trim();
      let isAlreadyBonded = false;
      if (savedUser) {
        const cachedRef = localStorage.getItem(`spike_referred_by_${savedUser}`);
        const isBondedFlag = localStorage.getItem(`spike_is_bonded_${savedUser}`);
        const bondedSponsor = localStorage.getItem(`spike_bonded_sponsor_${savedUser}`);
        if (cachedRef || isBondedFlag === 'true' || bondedSponsor) {
          isAlreadyBonded = true;
        }
      }

      if (isAlreadyBonded) {
        // User is already bonded; don't show prompt to self, but preserve pending referral in case they switch wallets
        setIsReferralModalOpen(false);
        setActiveTab('dashboard');
        return;
      }

      if (refVal || sponsorAddr) {
        setIsReferralModalOpen(true);
      }
    } catch {
      // ignore
    }
  }, []);

  // Reactive Bonded Check: If active connected wallet is already bonded, close verification modal for this wallet
  useEffect(() => {
    if (!walletAddress) return;
    const norm = walletAddress.toLowerCase().trim();
    isUserAlreadyBonded(norm).then(({ isBonded, sponsor }) => {
      if (isBonded) {
        setIsReferralModalOpen(false);
        const pendingRef = (localStorage.getItem('spike_pending_referrer') || '').toLowerCase().trim();
        // Only clear pending invite if this wallet is bonded to that specific sponsor
        if (pendingRef && sponsor && (sponsor.toLowerCase() === pendingRef || sponsor.toLowerCase().includes(pendingRef.slice(2, 8)))) {
          localStorage.removeItem('spike_pending_referrer');
          localStorage.removeItem('spike_pending_sponsor_addr');
          localStorage.removeItem('spike_pending_sponsor_code');
          setPendingInvite(null);
        }
      }
    });
  }, [walletAddress]);

  // Auto-bind pending referral as soon as referee wallet is connected or restored
  useEffect(() => {
    if (!isWalletConnected || !walletAddress) return;
    const normWallet = walletAddress.toLowerCase().trim();

    // Verify if this wallet is already bonded before attempting any auto-bind
    isUserAlreadyBonded(normWallet).then((bondedCheck) => {
      if (bondedCheck.isBonded) {
        setIsReferralModalOpen(false);
        const pendingRef = (localStorage.getItem('spike_pending_referrer') || '').toLowerCase().trim();
        // Only clear pending invite if this specific wallet was already bonded under that sponsor
        if (pendingRef && bondedCheck.sponsor && (bondedCheck.sponsor.toLowerCase() === pendingRef || bondedCheck.sponsor.toLowerCase().includes(pendingRef.slice(2, 8)))) {
          localStorage.removeItem('spike_pending_referrer');
          localStorage.removeItem('spike_pending_sponsor_addr');
          localStorage.removeItem('spike_pending_sponsor_code');
          setPendingInvite(null);
        }
        return;
      }

      const pendingReferrer = localStorage.getItem('spike_pending_referrer') || (pendingInvite ? (pendingInvite.sponsorAddr || pendingInvite.code) : null);
      if (!pendingReferrer) return;

      const normPending = pendingReferrer.toLowerCase();
      const isSelf = normPending === normWallet || normPending.includes(normWallet.slice(2, 8));

      if (isSelf) {
        return;
      }

      // Fire-and-forget sync to Cloud Firestore directly so referrals persist across devices on static hosting
      registerReferralInFirestore(pendingReferrer, walletAddress).catch(() => {});

      fetch('/api/referrals/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referrerCodeOrAddr: pendingReferrer,
          refereeAddress: walletAddress,
        }),
      })
        .then(async (r) => {
          const contentType = r.headers.get('content-type') || '';
          if (!contentType.includes('application/json')) {
            throw new Error(`Non-JSON or error response: ${r.status}`);
          }
          return r.json();
        })
        .then((data) => {
          if (data && data.success) {
            localStorage.setItem(`spike_referred_by_${normWallet}`, pendingReferrer);
            localStorage.setItem(`spike_is_bonded_${normWallet}`, 'true');
            localStorage.setItem(`spike_bonded_sponsor_${normWallet}`, pendingReferrer);
            localStorage.removeItem('spike_pending_referrer');
            localStorage.removeItem('spike_pending_sponsor_addr');
            localStorage.removeItem('spike_pending_sponsor_code');
            setPendingInvite(null);
            if (data.refereeStats) setReferralStats(data.refereeStats);
            window.dispatchEvent(new CustomEvent('spike_partner_registered', { detail: data }));
            addToast(
              'Referral Connected & Counted!',
              `Successfully linked to sponsor ${data.referrer?.referralCode || pendingReferrer}! Partner counted toward team milestones.`,
              'success'
            );
          } else if (data && data.alreadyBonded) {
            // Already bonded to another sponsor: clean pending state and do not count under new sponsor
            localStorage.removeItem('spike_pending_referrer');
            localStorage.removeItem('spike_pending_sponsor_addr');
            localStorage.removeItem('spike_pending_sponsor_code');
            setPendingInvite(null);
            setIsReferralModalOpen(false);
          }
        })
        .catch((_err) => {
          // Resilient fallback only if wallet was NOT already bonded to someone else
          const isLocallyBonded = localStorage.getItem(`spike_is_bonded_${normWallet}`) === 'true';
          const localSponsor = localStorage.getItem(`spike_bonded_sponsor_${normWallet}`) || localStorage.getItem(`spike_referred_by_${normWallet}`);
          if (isLocallyBonded && localSponsor && localSponsor.toLowerCase() !== pendingReferrer.toLowerCase()) {
            localStorage.removeItem('spike_pending_referrer');
            setPendingInvite(null);
            return;
          }
          localStorage.setItem(`spike_referred_by_${normWallet}`, pendingReferrer);
          localStorage.setItem(`spike_is_bonded_${normWallet}`, 'true');
          localStorage.setItem(`spike_bonded_sponsor_${normWallet}`, pendingReferrer);
          localStorage.removeItem('spike_pending_referrer');
          localStorage.removeItem('spike_pending_sponsor_addr');
          localStorage.removeItem('spike_pending_sponsor_code');
          setPendingInvite(null);
          window.dispatchEvent(new CustomEvent('spike_partner_registered', {
            detail: {
              referrerAddress: pendingReferrer,
              refereeAddress: walletAddress,
            },
          }));
        });
    });
  }, [isWalletConnected, walletAddress, pendingInvite]);

  // Update browser URL query param whenever activeTab changes
  const handleTabChange = (tab: TabType) => {
    if (tab === 'swap') {
      if (isInspectMode) {
        addToast(
          'Read-Only Cross-Verify Mode',
          'Swap modal is disabled while inspecting another user wallet.',
          'warning'
        );
        return;
      }
      setIsSwapModalOpen(true);
      return;
    }
    if (tab === 'admin') {
      setInspectedWallet(null);
      setInspectedData(null);
    }
    setActiveTab(tab);
    if (tab === 'referrals' && walletAddress && !(isAdmin && inspectedWallet)) {
      fetch(`/api/referrals/stats/${walletAddress}`)
        .then((r) => r.json())
        .then((d) => {
          if (d && d.stats) {
            setReferralStats(d.stats);
            try {
              localStorage.setItem(`spike_referral_stats_${walletAddress.toLowerCase()}`, JSON.stringify(d.stats));
            } catch {}
          }
        })
        .catch(() => {});
    }
    try {
      localStorage.setItem('spike_active_tab', tab);
      const url = new URL(window.location.href);
      if (tab === 'home') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', tab);
      }
      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignore
    }
  };

  // Real-Time Web3 Multi-Provider Synchronizer (MetaMask, Trust Wallet, SafePal, Injected)
  // Handles account shuffling, provider switching, and clean disconnects seamlessly in real-time
  useEffect(() => {
    // 1. Initial verification: Check if the extension's currently selected address differs from stored address
    getRealActiveAccount().then((realAccount) => {
      if (realAccount) {
        const currentAddr = walletAddressRef.current;
        if (currentAddr && currentAddr.toLowerCase() !== realAccount.toLowerCase()) {
          console.log('[Web3Sync] Active wallet on load differs from stored address. Auto-syncing:', realAccount);
          handleConnectWallet('Web3 Provider', realAccount, true);
        }
      }
    }).catch(() => {});

    // 2. Real-time event subscription for 'accountsChanged' and 'disconnect' across all injected Web3 providers
    const unsubscribe = subscribeToWeb3AccountChanges(
      (newAddress) => {
        const currentAddr = walletAddressRef.current;
        if (!currentAddr || currentAddr.toLowerCase() !== newAddress.toLowerCase()) {
          console.log('[Web3Sync] Account switched in Web3 wallet extension:', newAddress);
          handleConnectWallet('Web3 Provider', newAddress, true);
          addToast(
            'Wallet Synchronized',
            `Active account switched to ${newAddress.slice(0, 6)}...${newAddress.slice(-4)}. Updated in real-time!`,
            'info'
          );
        }
      },
      () => {
        console.log('[Web3Sync] Provider disconnected or account locked');
        if (isWalletConnectedRef.current) {
          handleDisconnectWallet();
        }
      }
    );

    // 3. Ultra-light non-intrusive heartbeat poll (1200ms) to guarantee sync even if mobile/extension suppresses events
    const heartbeat = setInterval(async () => {
      try {
        const activeAcc = await getRealActiveAccount();
        const currentAddr = walletAddressRef.current;
        if (activeAcc) {
          // If extension switched to a new authorized account
          if (currentAddr && currentAddr.toLowerCase() !== activeAcc.toLowerCase()) {
            console.log('[Web3Sync Heartbeat] Detected wallet switch to:', activeAcc);
            handleConnectWallet('Web3 Provider', activeAcc, true);
          }
        } else if (currentAddr && currentAddr.startsWith('0x') && isWalletConnectedRef.current) {
          // Check if provider was explicitly disconnected or revoked
          const win = window as any;
          const hasInjected = Boolean(win.ethereum || win.safepalProvider || win.trustwallet);
          if (hasInjected) {
            // Note: only auto-disconnect if user was connected through an extension that is now giving 0 accounts
            // We verify by checking if eth_accounts returned empty array
            if (activeAcc === null && win.ethereum?.selectedAddress === null) {
              handleDisconnectWallet();
            }
          }
        }
      } catch {}
    }, 1200);

    return () => {
      unsubscribe();
      clearInterval(heartbeat);
    };
  }, []);

  // Auto-persist wallet balance across reloads and sync to server
  useEffect(() => {
    try {
      if (walletAddress) {
        const norm = walletAddress.toLowerCase();
        localStorage.setItem(`spike_bal_${norm}`, String(walletBalance));
        fetch('/api/user/sync-balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: norm, balanceUsdt: walletBalance }),
        }).catch(() => {});
      }
    } catch {}
  }, [walletBalance, walletAddress]);

  // One-time cleanup effect on mount to purge any lingering cross-wallet global keys
  useEffect(() => {
    try {
      localStorage.removeItem('spike_active_mining');
      localStorage.removeItem('spike_nodes_global');
      localStorage.removeItem('spike_cycle_start_global');
      localStorage.removeItem('spike_accumulated_spk_global');
      localStorage.removeItem('spike_accumulated_usdt_global');
      localStorage.removeItem('spike_balance_usdt');
      localStorage.removeItem('spike_balance_bnb');
      localStorage.removeItem('spike_christmas_theme');
      localStorage.removeItem('spike_holiday_theme');
    } catch {}
  }, []);

  // Sync state with persistent Firebase Firestore & backend database (Real-time live sync)
  useEffect(() => {
    if (!walletAddress) {
      setWalletBalance(0);
      setWalletBNB(0);
      setWalletSpk(0);
      setNodes([]);
      setDailyEarnings(0);
      return;
    }

    const norm = walletAddress.toLowerCase();

    // 1. Immediately load local cache if present strictly for this specific address
    try {
      const cachedUsdt = localStorage.getItem(`spike_bal_${norm}`);
      const cachedBnb = localStorage.getItem(`spike_bnb_${norm}`);
      if (cachedUsdt !== null && !isNaN(Number(cachedUsdt))) {
        setWalletBalance(Number(cachedUsdt));
      } else {
        setWalletBalance(0.0);
      }
      if (cachedBnb !== null && !isNaN(Number(cachedBnb))) {
        setWalletBNB(Number(cachedBnb));
      } else {
        setWalletBNB(0.0);
      }

      // Load cached on-chain SPIKE token balance
      const cachedSpk = localStorage.getItem(`spike_onchain_spk_${norm}`);
      if (cachedSpk !== null && !isNaN(Number(cachedSpk))) {
        setWalletSpk(Number(cachedSpk));
      }

      // Live fetch on-chain BSC token balances (SPIKE contract & USDT contract)
      fetchOnChainBalances(norm)
        .then((onchain) => {
          if (typeof onchain.spike === 'number') {
            setWalletSpk(onchain.spike);
          }
          if (typeof onchain.usdt === 'number') {
            setWalletOnchainUsdt(onchain.usdt);
          }
          if (typeof onchain.bnb === 'number' && onchain.bnb > 0) {
            setWalletBNB(onchain.bnb);
          }
        })
        .catch(() => {});

      // Load cached nodes immediately so mining rigs stay persistent on refresh
      const cachedNodes = localStorage.getItem(`spike_nodes_${norm}`);
      let loadedNodes: MiningNode[] = [];
      if (cachedNodes) {
        try {
          const parsed = JSON.parse(cachedNodes);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loadedNodes = parsed;
          }
        } catch {}
      }

      setNodes(loadedNodes);
      if (loadedNodes.length > 0) {
        const activeMining = loadedNodes.filter((n: MiningNode) => n.status === 'mining');
        const calculatedYield = activeMining.reduce((acc: number, n: MiningNode) => acc + (n.hashrate * 39), 0);
        setDailyEarnings(+calculatedYield.toFixed(2));
      } else {
        setDailyEarnings(0);
      }

      // Load cached referral stats
      const cachedRef = localStorage.getItem(`spike_referral_stats_${norm}`);
      if (cachedRef) {
        setReferralStats(JSON.parse(cachedRef));
      }

      // Live sync direct & downline team partners from Cloud Firestore (works on static hosting & VPS)
      getReferralsFromFirestore(norm)
        .then((fsData) => {
          if (fsData && (fsData.directPartners > 0 || fsData.downlinePartners > 0)) {
            setReferralStats((prev: any) => ({
              ...prev,
              directPartners: Math.max(prev?.directPartners || 0, fsData.directPartners),
              downlinePartners: Math.max(prev?.downlinePartners || 0, fsData.downlinePartners),
              totalPartners: Math.max(prev?.totalPartners || 0, fsData.totalPartners),
              levelCounts: fsData.levelCounts || prev?.levelCounts,
              referrals: fsData.referrals,
            }));
          }
        })
        .catch(() => {});
    } catch {}

    // 2. Real-time Firebase Firestore listener for instant synchronization with Admin Panel
    let unsubscribeFirestore: (() => void) | null = null;
    try {
      const userDocRef = doc(firestoreDb, 'users', norm);
      unsubscribeFirestore = onSnapshot(
        userDocRef,
        (snap) => {
          if (snap.exists()) {
            const fsData = snap.data();
            if (typeof fsData.balanceUsdt === 'number') {
              setWalletBalance(fsData.balanceUsdt);
              try {
                localStorage.setItem(`spike_bal_${norm}`, String(fsData.balanceUsdt));
              } catch {}
            }
            if (typeof fsData.balanceBnb === 'number') {
              setWalletBNB(fsData.balanceBnb);
              try {
                localStorage.setItem(`spike_bnb_${norm}`, String(fsData.balanceBnb));
              } catch {}
            }
          }
        },
        (err) => {
          const msg = err?.message || String(err);
          if (
            msg.includes('RESOURCE_EXHAUSTED') ||
            msg.includes('Quota limit exceeded') ||
            (err as any)?.code === 'resource-exhausted'
          ) {
            // Firestore free tier quota reached; REST API continues serving real-time balance
            return;
          }
          console.warn('[App] Realtime Firestore sync note:', err);
        }
      );
    } catch (fsInitErr) {
      console.warn('[App] Firestore init note:', fsInitErr);
    }

    // 3. Multi-tab & Same-Device Real-time balance event listeners
    const handleBalanceEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.address?.toLowerCase() === norm) {
        if (typeof customEvent.detail.balanceUsdt === 'number') {
          setWalletBalance(customEvent.detail.balanceUsdt);
        }
        if (typeof customEvent.detail.balanceBnb === 'number') {
          setWalletBNB(customEvent.detail.balanceBnb);
        }
      }
    };
    window.addEventListener('spike_balance_updated', handleBalanceEvent);

    const handleOnChainEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.walletAddress?.toLowerCase() === norm) {
        if (typeof customEvent.detail.spike === 'number') setWalletSpk(customEvent.detail.spike);
        if (typeof customEvent.detail.usdt === 'number' && customEvent.detail.usdt > 0) {
          setWalletBalance((prev) => Math.max(prev, customEvent.detail.usdt));
        }
        if (typeof customEvent.detail.bnb === 'number' && customEvent.detail.bnb > 0) {
          setWalletBNB(customEvent.detail.bnb);
        }
      }
    };
    window.addEventListener('spike_onchain_balances_updated', handleOnChainEvent);

    const handleHashrateEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && (!customEvent.detail.address || customEvent.detail.address.toLowerCase() === norm)) {
        if (customEvent.detail.hashrateInfo) {
          setHashrateInfo(customEvent.detail.hashrateInfo);
        }
      }
    };
    window.addEventListener('spike_hashrate_updated', handleHashrateEvent);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `spike_bal_${norm}` && e.newValue !== null) {
        setWalletBalance(Number(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 4. Fetch backend database state (Nodes, transactions, referrals)
    fetch(`/api/user/${walletAddress}`)
      .then((res) => {
        if (!res.ok || res.headers.get('content-type')?.includes('text/html')) {
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.user) {
          const uBal = typeof data.user.balanceUsdt === 'number' ? data.user.balanceUsdt : null;
          const bBal = typeof data.user.balanceBnb === 'number' ? data.user.balanceBnb : null;
          
          // Priority: Check local cache first so user's active session earnings/deposits/swaps are never reverted!
          const cachedBalStr = localStorage.getItem(`spike_bal_${norm}`);
          const cachedBal = cachedBalStr !== null && !isNaN(Number(cachedBalStr)) ? Number(cachedBalStr) : null;
          const effectiveBal = cachedBal !== null ? cachedBal : (uBal !== null ? uBal : 0.0);
          
          setWalletBalance(effectiveBal);
          try {
            localStorage.setItem(`spike_bal_${norm}`, String(effectiveBal));
          } catch {}

          if (bBal !== null) {
            setWalletBNB(bBal);
            try {
              localStorage.setItem(`spike_bnb_${norm}`, String(bBal));
            } catch {}
          }

          const serverCycleStart = data.miningStatus?.cycleStartTime || data.user.miningCycleStartTime;
          if (serverCycleStart && typeof serverCycleStart === 'number') {
            const elapsed = Math.floor((Date.now() - serverCycleStart) / 1000);
            if (elapsed < 86400) {
              localStorage.setItem(`spike_cycle_start_${norm}`, String(serverCycleStart));
              localStorage.setItem(`spike_mining_active_${norm}`, 'true');
            }
          }
          if (data.user.hasActivatedMining || data.user.hasDepositedTreasury || data.miningStatus?.is24hActive) {
            localStorage.setItem(`spike_mining_active_${norm}`, 'true');
          }
          if (typeof data.user.balanceSpk === 'number' && !isNaN(data.user.balanceSpk)) {
            setWalletSpk((prev) => Math.max(prev, data.user.balanceSpk));
          }

          // If local balance was higher/different than server, sync back to server database
          if (cachedBal !== null && uBal !== null && cachedBal !== uBal) {
            fetch('/api/user/sync-balance', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ address: norm, balanceUsdt: effectiveBal }),
            }).catch(() => {});
          }
        }
        // Set nodes array and persist
        const is24hActive = Boolean(
          data?.miningStatus?.is24hActive ||
          localStorage.getItem(`spike_mining_active_${norm}`) === 'true'
        );
        if (data && Array.isArray(data.nodes) && data.nodes.length > 0) {
          setNodes(data.nodes);
          try {
            localStorage.setItem(`spike_nodes_${norm}`, JSON.stringify(data.nodes));
            if (data.nodes.some((n: MiningNode) => n.status === 'mining')) {
              localStorage.setItem(`spike_mining_active_${norm}`, 'true');
            }
          } catch {}
          const activeMining = data.nodes.filter((n: MiningNode) => n.status === 'mining');
          const calculatedYield = activeMining.reduce((acc: number, n: MiningNode) => acc + (n.hashrate * 39), 0);
          setDailyEarnings(+calculatedYield.toFixed(2));
        } else if (is24hActive) {
          // If user has active 24h mining, ensure node is active and NOT wiped!
          const cycleStart = Number(localStorage.getItem(`spike_cycle_start_${norm}`)) || Date.now();
          const fallbackNode: MiningNode = {
            id: `spk-node-${cycleStart}-${norm.slice(2, 6)}`,
            name: 'SPIKE ASIC Rig #1',
            region: 'US-East (Stratum Cluster)',
            status: 'mining',
            hashrate: 100,
            temperature: 64,
            shareAcceptance: 99.98,
            fanSpeed: 75,
            powerUsage: 1400,
            uptimeDays: 1,
            algorithm: 'SHA-256 (Stratum)',
            logs: [
              '24-Hour Mining Cycle Active [Restored from Database]',
              'Connected to BSC stratum pool: stratum+tcp://pool.spikenodes.com:443',
            ],
            userAddress: walletAddress,
          };
          setNodes([fallbackNode]);
          setDailyEarnings(3900);
          try {
            localStorage.setItem(`spike_nodes_${norm}`, JSON.stringify([fallbackNode]));
          } catch {}
        } else {
          // Only clear nodes if user has NO active 24h mining cycle
          setNodes([]);
          setDailyEarnings(0);
          try {
            localStorage.removeItem(`spike_nodes_${norm}`);
          } catch {}
        }
        // Set rewards transactions
        if (data && Array.isArray(data.transactions) && data.transactions.length > 0) {
          const mappedTxs: RewardTransaction[] = data.transactions.map((t: any) => ({
            id: t.id,
            txHash: t.txHash,
            rewardSource: t.details || t.rewardSource || 'Mining Payout',
            amount: t.amount,
            currency: t.currency || 'USDT',
            timestamp: t.timestamp || 'Recent',
            status: t.status === 'Rejected' ? 'Pending' : (t.status || 'Confirmed'),
            epoch: t.blockNumber,
          }));
          setRewards(mappedTxs);
        }
        // Set real referral stats
        if (data && data.referralStats) {
          setReferralStats(data.referralStats);
          try {
            localStorage.setItem(`spike_referral_stats_${norm}`, JSON.stringify(data.referralStats));
          } catch {}
        }
        // Set real hashrate tier info
        if (data && data.hashrateInfo) {
          setHashrateInfo(data.hashrateInfo);
          try {
            localStorage.setItem('spike_hashrate_info', JSON.stringify(data.hashrateInfo));
            localStorage.setItem(`spike_hashrate_${norm}`, JSON.stringify(data.hashrateInfo));
          } catch {}
        }
      })
      .catch((err) => {
        console.warn('[App] Backend DB sync notice (Firebase fallback active):', err);
      });

    // Query referral stats and hashrate tier info
    const syncLiveReferralData = () => {
      if (!walletAddress) return;
      fetch(`/api/referrals/stats/${walletAddress}`)
        .then((res) => {
          if (!res.ok || res.headers.get('content-type')?.includes('text/html')) return null;
          return res.json();
        })
        .then((rData) => {
          if (rData && rData.stats) {
            setReferralStats((prev: any) => {
              if (
                !prev ||
                prev.directPartners !== rData.stats.directPartners ||
                prev.totalPartners !== rData.stats.totalPartners ||
                (prev.referrals?.length || 0) !== (rData.stats.referrals?.length || 0)
              ) {
                return rData.stats;
              }
              return prev;
            });
            if (rData.stats.hashrateInfo) {
              setHashrateInfo(rData.stats.hashrateInfo);
            }
            try {
              localStorage.setItem(`spike_referral_stats_${norm}`, JSON.stringify(rData.stats));
            } catch {}
          }
        })
        .catch(() => {});
    };

    // Immediate sync
    syncLiveReferralData();

    // Fast 3-second polling to immediately catch whenever someone joins via sponsor's referral link
    const referralPollInterval = setInterval(syncLiveReferralData, 3000);

    const handleWindowFocus = () => {
      syncLiveReferralData();
    };
    const handlePartnerRegistered = () => {
      syncLiveReferralData();
    };
    window.addEventListener('spike_partner_registered', handlePartnerRegistered);

    const handleWithdrawalEvent = (e: Event) => {
      const ce = e as CustomEvent;
      if (ce.detail && (!ce.detail.userAddress || ce.detail.userAddress.toLowerCase() === norm)) {
        if (typeof ce.detail.remainingBalance === 'number') {
          setWalletBalance(ce.detail.remainingBalance);
          try {
            localStorage.setItem(`spike_bal_${norm}`, String(ce.detail.remainingBalance));
          } catch {}
        }
        syncLiveReferralData();
        if (ce.detail.request) {
          addToast(
            'Withdrawal Cleared & Paid!',
            `$${ce.detail.request.amount?.toFixed(2)} USDT milestone payout cleared by admin. Balance updated to $${(ce.detail.remainingBalance || 0).toFixed(2)} USDT.`,
            'success'
          );
        }
      }
    };
    window.addEventListener('spike_withdrawal_updated', handleWithdrawalEvent);

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      clearInterval(referralPollInterval);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('spike_partner_registered', handlePartnerRegistered);
      window.removeEventListener('spike_balance_updated', handleBalanceEvent);
      window.removeEventListener('spike_withdrawal_updated', handleWithdrawalEvent);
      window.removeEventListener('spike_onchain_balances_updated', handleOnChainEvent);
      window.removeEventListener('spike_hashrate_updated', handleHashrateEvent);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [walletAddress]);

  // Modals
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapModalMode, setSwapModalMode] = useState<'sellSpike'>('sellSpike');
  const [isTestnetModalOpen, setIsTestnetModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [referralCodeToVerify, setReferralCodeToVerify] = useState<string>('');

  const handleOpenSwapModal = (mode: 'sellSpike' = 'sellSpike') => {
    setSwapModalMode(mode);
    setIsSwapModalOpen(true);
  };

  // Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (title: string, message: string, type: ToastMessage['type'] = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const copyToClipboard = (text: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      addToast('Copied to Clipboard', text, 'info');
    } else {
      addToast('Copied', text, 'info');
    }
  };

  // Testnet & QA Controls - Restricted to Admin Panel per policy
  const handleTopUpUsdt = (_amt: number) => {
    addToast('Admin Faucet Required', 'Testnet USDT can only be credited via the Admin Panel. Redirecting...', 'info');
    setActiveTab('admin');
  };

  const handleTopUpBnb = (amt: number) => {
    setWalletBNB((prev) => +(prev + amt).toFixed(4));
    addToast('Faucet Claimed', `+${amt.toFixed(4)} Test BNB added for gas fees.`, 'success');
  };

  const handleResetToFreshUser = () => {
    setNodes([]);
    setWalletBalance(100.0);
    setRewards([]);
    addToast('Scenario: Fresh User', '0 Online Rigs, 100 USDT balance. Test first node purchase from scratch!', 'info');
  };

  const handleSeedTeamLeader = () => {
    setNodes(INITIAL_NODES);
    setWalletBalance(500.0);
    addToast('Scenario: Team Leader', 'Active node cluster & 28 team partners loaded. Ready to test milestone bonus claims!', 'success');
  };

  const handleClearTransactions = () => {
    setRewards([]);
    addToast('History Cleared', 'All claim & activation transaction logs reset.', 'info');
  };

  const handleSwitchToBscTestnet = async () => {
    try {
      if (typeof window !== 'undefined' && (window as unknown as { ethereum?: { request: (args: { method: string; params: unknown[] }) => Promise<unknown> } }).ethereum) {
        const eth = (window as unknown as { ethereum: { request: (args: { method: string; params: unknown[] }) => Promise<unknown> } }).ethereum;
        try {
          await eth.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x61' }], // 97 in hex
          });
        } catch (switchError: unknown) {
          if ((switchError as { code?: number })?.code === 4902) {
            await eth.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x61',
                  chainName: 'BNB Smart Chain Testnet',
                  nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
                  rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
                  blockExplorerUrls: ['https://testnet.bscscan.com'],
                },
              ],
            });
          }
        }
      }
    } catch {
      // User cancelled
    }
    setNetwork('BSC Testnet');
    addToast('Network Updated', 'Active network set to BNB Smart Chain Testnet (Chain ID 97)', 'success');
  };

  // Node Actions
  const handleRestartNode = (nodeId: string) => {
    setNodes((prev) => {
      const updated = prev.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            status: 'mining' as const,
            temperature: 58,
            logs: [
              `[${new Date().toLocaleTimeString()}] Cold restart initialized by operator`,
              `[${new Date().toLocaleTimeString()}] Re-syncing Stratum difficulty with BSC node...`,
              ...n.logs.slice(0, 3),
            ],
          };
        }
        return n;
      });
      if (walletAddress) {
        try {
          localStorage.setItem(`spike_nodes_${walletAddress.toLowerCase()}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
    fetch(`/api/nodes/${nodeId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restart', userAddress: walletAddress }),
    }).catch(() => {});
    addToast('Node Restarted', `${nodeId} rebooted and re-syncing with BSC validator.`, 'info');
  };

  const handleStopNode = (nodeId: string) => {
    setNodes((prev) => {
      const updated = prev.map((n) => (n.id === nodeId ? { ...n, status: 'idle' as const, temperature: 45 } : n));
      const hasAnyMining = updated.some((n) => n.status === 'mining');
      try {
        if (walletAddress) {
          localStorage.setItem(`spike_nodes_${walletAddress.toLowerCase()}`, JSON.stringify(updated));
          localStorage.setItem(`spike_mining_active_${walletAddress.toLowerCase()}`, hasAnyMining ? 'true' : 'false');
        }
      } catch {}
      return updated;
    });
    fetch(`/api/nodes/${nodeId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop', userAddress: walletAddress }),
    }).catch(() => {});
    addToast('Node Paused', `${nodeId} transitioned to Idle / Power-save mode.`, 'warning');
  };

  const handleStartNode = (nodeId: string) => {
    setNodes((prev) => {
      const updated = prev.map((n) => (n.id === nodeId ? { ...n, status: 'mining' as const, temperature: 63 } : n));
      try {
        if (walletAddress) {
          localStorage.setItem(`spike_nodes_${walletAddress.toLowerCase()}`, JSON.stringify(updated));
          localStorage.setItem(`spike_mining_active_${walletAddress.toLowerCase()}`, 'true');
        }
      } catch {}
      return updated;
    });
    fetch(`/api/nodes/${nodeId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', userAddress: walletAddress }),
    }).catch(() => {});
    addToast('Node Active', `${nodeId} started mining on BSC validator network.`, 'success');
  };

  const handleDeployNode = (newNode: MiningNode, costUsdt: number = 10, realTxHash?: string) => {
    if (walletOnchainUsdt < costUsdt && walletBalance < costUsdt) {
      addToast(
        'Insufficient Web3 Balance',
        `Required ${costUsdt} USDT in your connected Web3 wallet (BEP-20) for node activation.`,
        'warning'
      );
      return;
    }

    const updatedNodes = [newNode, ...nodes];
    setNodes(updatedNodes);

    try {
      if (walletAddress) {
        localStorage.setItem(`spike_nodes_${walletAddress.toLowerCase()}`, JSON.stringify(updatedNodes));
        localStorage.setItem(`spike_mining_active_${walletAddress.toLowerCase()}`, 'true');
      }
    } catch {}

    if (walletAddress) {
      fetchOnChainBalances(walletAddress).then((b) => {
        setWalletOnchainUsdt(b.usdt);
        setWalletBNB(b.bnb);
        setWalletSpk(b.spike);
      }).catch(() => {});
    }

    if (walletAddress) {
      // Sync node to backend fleet
      fetch('/api/nodes/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: walletAddress, nodes: updatedNodes }),
      }).catch(() => {});

      // Multi-layer persistent recording in Cloud Firestore & Backend DB
      persistMiningStart({
        userAddress: walletAddress,
        hashrateVh: newNode.hashrate || 100,
        tierName: newNode.name,
        nodeName: newNode.name,
        treasuryContributionUsdt: costUsdt,
      }).catch(() => {});
    }

    // Dynamically recalculate daily yield from all active rigs (100 VH/s = 1 SPK in 60 days = 0.01667 SPK/day)
    const activeMining = updatedNodes.filter((n) => n.status === 'mining');
    const calculatedDailySpk = activeMining.reduce((acc, n) => acc + ((n.hashrate || 100) / 6000), 0);
    const calculatedYield = +(calculatedDailySpk * 1.12).toFixed(4);
    setDailyEarnings(calculatedYield);

    const txHashToUse = realTxHash
      ? (realTxHash.length > 16 ? `${realTxHash.slice(0, 8)}...${realTxHash.slice(-6)}` : realTxHash)
      : `0x${Array.from({ length: 4 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}...${Array.from({ length: 4 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

    const newTx: RewardTransaction = {
      id: `tx-node-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      txHash: txHashToUse,
      rewardSource: `Smart Contract Call: Mining Node Activation (${newNode.name}) → Treasury Vault (0xD833...b6bF)`,
      amount: -costUsdt,
      currency: 'USDT',
      timestamp: 'Just now',
      status: 'Confirmed',
    };
    setRewards((prev) => [newTx, ...prev]);

    // Save to persistent backend database & credit protocol treasury wallet
    fetch('/api/mining/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAddress: walletAddress,
        nodeName: newNode.name,
        costUsdt,
        txHash: realTxHash,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          window.dispatchEvent(
            new CustomEvent('spike_treasury_updated', {
              detail: {
                treasuryBalanceUsdt: data.treasuryBalanceUsdt,
                treasuryWalletAddress: data.treasuryWalletAddress,
              },
            })
          );
          if (data.boughtSpk) {
            addToast(
              'Smart Contract Mining Call Executed!',
              `10.00 USDT credited to Treasury. Backend executed Nodescan route: +${data.boughtSpk.toFixed(2)} SPK credited!`,
              'success'
            );
          }
        }
      })
      .catch((err) => console.warn('[App] Mining activate error:', err));

    addToast(
      'Falcon Titan Deployed & Active',
      `-10.00 USDT deducted via Smart Contract call and credited to Treasury (0xD833...b6bF). ${newNode.name} is now hashing at 100 VH/s!`,
      'success'
    );
  };

  const handleConfirmClaim = (amount: number) => {
    setWalletBalance((prev) => +(prev + amount).toFixed(2));
    setDailyEarnings(0);

    const randomTxHash = `0x${Array.from({ length: 4 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}...${Array.from({ length: 4 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`;

    const newTx: RewardTransaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      txHash: randomTxHash,
      rewardSource: 'Daily Epoch Payout (Manual Claim)',
      amount: amount,
      currency: 'USDT',
      timestamp: 'Just now',
      status: 'Confirmed',
    };

    setRewards((prev) => [newTx, ...prev]);

    // Persist claim in backend database
    fetch('/api/transactions/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAddress: walletAddress,
        type: 'claim',
        amount,
        currency: 'USDT',
        details: 'Daily Epoch Mining Rewards Payout',
        txHash: randomTxHash,
      }),
    }).catch((err) => console.warn('[App] Claim API error:', err));

    addToast('Rewards Claimed', `+${amount.toFixed(2)} USDT deposited into your wallet.`, 'success');
  };

  const handleSwapSuccess = (
    fromToken: string,
    toToken: string,
    fromAmount: number,
    toAmount: number
  ) => {
    if (fromToken === 'SPIKE' && toToken === 'USDT') {
      // Real on-chain Web3 swap: USDT is credited directly into the user's personal Web3 wallet on BSC
      if (walletAddress) {
        const norm = walletAddress.toLowerCase();
        fetchOnChainBalances(norm)
          .then((b) => {
            if (typeof b.spike === 'number') setWalletSpk(b.spike);
            if (typeof b.usdt === 'number') setWalletOnchainUsdt(b.usdt);
            if (typeof b.bnb === 'number' && b.bnb > 0) setWalletBNB(b.bnb);
          })
          .catch(() => {});
      }
      const shortAddr = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'your connected wallet';
      addToast(
        'On-Chain Web3 Swap Confirmed',
        `+${toAmount.toFixed(4)} USDT credited directly into your Web3 wallet (${shortAddr})!`,
        'success'
      );
    } else if (fromToken === 'USDT' && toToken === 'SPIKE') {
      setWalletBalance((prev) => Math.max(0, +(prev - fromAmount).toFixed(2)));
      addToast(
        'SPIKE Purchased',
        `+${toAmount.toFixed(2)} SPK added via Nodescan V3!`,
        'success'
      );
    } else if (fromToken === 'SPIKE') {
      setWalletBalance((prev) => +(prev + toAmount).toFixed(2));
    } else if (toToken === 'SPIKE') {
      setWalletBalance((prev) => Math.max(0, +(prev - fromAmount).toFixed(2)));
    }
    if (fromToken === 'BNB') {
      setWalletBNB((prev) => Math.max(0, +(prev - fromAmount).toFixed(4)));
    } else if (toToken === 'BNB') {
      setWalletBNB((prev) => +(prev + toAmount).toFixed(4));
    }

    // Broadcast executed trade so TradingView chart & transactions stream update in real time
    window.dispatchEvent(
      new CustomEvent('spike_trade_executed', {
        detail: {
          fromToken,
          toToken,
          fromAmount,
          toAmount,
          walletAddress,
        },
      })
    );
  };

  const handleSimulateReferralJoin = async () => {
    if (!walletAddress) {
      addToast('Connect Wallet', 'Please connect a wallet first to test referrals.', 'warning');
      return;
    }
    try {
      const res = await fetch('/api/referrals/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referrerAddress: walletAddress }),
      });
      let data: any = null;
      try {
        const text = await res.text();
        if (text) data = JSON.parse(text);
      } catch {}
      if (data && data.success) {
        setReferralStats(data.stats);
        try {
          localStorage.setItem(`spike_referral_stats_${walletAddress.toLowerCase()}`, JSON.stringify(data.stats));
        } catch {}
        window.dispatchEvent(new CustomEvent('spike_partner_registered', { detail: data }));
        addToast('Referral Joined!', `+1 Partner joined via your link! Counted toward your Team Milestones.`, 'success');
      }
    } catch {
      addToast('Simulation Note', 'Added local test referral', 'info');
    }
  };

  const handleClaimReferralMilestone = (amountUsd: number, milestoneLabel: string = 'Team Milestone') => {
    const userHasActiveMining = Boolean(
      isMasterUser ||
      isAdmin ||
      nodes.some((n) => n.status === 'mining') ||
      (walletAddress && localStorage.getItem(`spike_mining_active_${walletAddress.toLowerCase()}`) === 'true')
    );
    if (!userHasActiveMining) {
      addToast('Mining Required', 'You must have an active $10 mining node to claim milestone rewards.', 'error');
      return;
    }

    const randomTxHash = `0x${Array.from({ length: 4 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}...${Array.from({ length: 4 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`;
    const newTx: RewardTransaction = {
      id: `tx-milestone-${Date.now()}`,
      txHash: randomTxHash,
      rewardSource: `Team Career Milestone Reward (${milestoneLabel})`,
      amount: amountUsd,
      currency: 'USDT',
      timestamp: 'Just now',
      status: 'Confirmed',
    };
    setRewards((prev) => [newTx, ...prev]);

    // Update referralStats milestone rewards cleanly
    setReferralStats((prev: any) => {
      const prevClaimed = Number(prev?.milestoneRewardsClaimed || 0);
      const updatedClaimed = +(prevClaimed + amountUsd).toFixed(2);
      const updated = {
        ...prev,
        milestoneRewardsClaimed: updatedClaimed,
      };
      if (walletAddress) {
        try {
          localStorage.setItem(`spike_referral_stats_${walletAddress.toLowerCase()}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    // Record milestone reward in backend database
    fetch('/api/transactions/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAddress: walletAddress,
        type: 'milestone_reward',
        amount: amountUsd,
        currency: 'USDT',
        details: `Team Career Milestone (${milestoneLabel}) Earned`,
        txHash: randomTxHash,
      }),
    }).catch(() => {});

    // Broadcast milestone claim event so other tabs and components sync
    window.dispatchEvent(
      new CustomEvent('spike_milestone_claimed', {
        detail: { amount: amountUsd, milestoneLabel, walletAddress },
      })
    );

    addToast(
      'Milestone Reward Claimed!',
      `+${amountUsd} USDT milestone bonus unlocked! Ready for withdrawal to your BSC wallet.`,
      'success'
    );
  };

  const handleDepositSuccess = (newBalance: number, txHash: string) => {
    if (walletAddress) {
      fetchOnChainBalances(walletAddress).then((b) => {
        setWalletOnchainUsdt(b.usdt);
        setWalletBNB(b.bnb);
        setWalletSpk(b.spike);
      }).catch(() => {});
    }
    const now = Date.now();
    const cleanHash = txHash.length > 14 ? `${txHash.slice(0, 8)}...${txHash.slice(-6)}` : txHash;
    const newTx: RewardTransaction = {
      id: `tx-dep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      txHash: cleanHash,
      rewardSource: 'Step 1: 10 USDT Protocol Deposit to Official Treasury Vault',
      amount: -10,
      currency: 'USDT',
      timestamp: 'Just now',
      status: 'Confirmed',
    };
    // Activate mining node upon 10$ deposit to treasury
    const activeNode: MiningNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: `SPIKE ASIC Rig #${nodes.length + 1}`,
      region: 'US-East (Stratum Cluster)',
      status: 'mining',
      hashrate: 1.25,
      temperature: 64,
      shareAcceptance: 99.98,
      fanSpeed: 75,
      powerUsage: 1400,
      uptimeDays: 1,
      algorithm: 'SHA-256 (Stratum)',
      logs: [
        'Deposit of 10.00 USDT received in Official Protocol Treasury Vault',
        'Connected to BSC stratum pool: stratum+tcp://pool.spikenodes.com:443',
        '24-Hour Mining Cycle Started · Automated Nodescan Buyback Enabled',
      ],
      userAddress: walletAddress,
    };
    const updatedNodes = nodes.some((n) => n.status === 'mining') ? nodes : [activeNode, ...nodes];
    setNodes(updatedNodes);

    if (walletAddress) {
      const norm = walletAddress.toLowerCase();
      localStorage.setItem(`spike_bal_${norm}`, newBalance.toFixed(2));
      localStorage.setItem(`spike_nodes_${norm}`, JSON.stringify(updatedNodes));
      localStorage.setItem(`spike_mining_active_${norm}`, 'true');
      localStorage.setItem(`spike_cycle_start_${norm}`, String(now));
      localStorage.setItem(`spike_accumulated_spk_${norm}`, '0');
      localStorage.setItem(`spike_accumulated_usdt_${norm}`, '0');

      window.dispatchEvent(
        new CustomEvent('spike_balance_updated', {
          detail: { address: norm, balanceUsdt: newBalance },
        })
      );

      // Sync nodes and balance immediately to backend database
      fetch('/api/nodes/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: walletAddress, nodes: updatedNodes }),
      }).catch(() => {});

      fetch('/api/user/sync-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: norm,
          balanceUsdt: newBalance,
          miningCycleStartTime: now,
        }),
      }).catch(() => {});

      // Multi-layer persistent recording in Cloud Firestore & Backend DB
      persistMiningStart({
        userAddress: walletAddress,
        hashrateVh: 100,
        tierName: 'Falcon Titan Apex',
        nodeName: activeNode.name,
        treasuryContributionUsdt: 10.0,
      }).catch(() => {});
    }

    try {
      window.dispatchEvent(
        new CustomEvent('spike_mining_started', {
          detail: { address: walletAddress, startTime: now },
        })
      );
    } catch {}

    addToast(
      '10 USDT Deposit Confirmed!',
      'Funds deposited to Protocol Treasury. Mining started and 24-hour harvesting cycle active from 0 SPIKE!',
      'success'
    );
    // Switch to dashboard to show live mining
    setActiveTab('dashboard');
  };

  const handleConnectWallet = async (provider: string, realAddress?: string, keepCurrentTab?: boolean): Promise<string> => {
    let finalAddress = realAddress;
    if (!finalAddress && typeof window !== 'undefined') {
      try {
        const connectedAddr = await requestWeb3Connection(provider);
        if (connectedAddr) {
          finalAddress = connectedAddr;
        }
      } catch (err) {
        console.warn('[App] Real Web3 connection popup note:', err);
      }
    }

    if (!finalAddress) {
      const errMsg = 'No Web3 wallet detected. Please open inside MetaMask, Trust Wallet, or SafePal browser.';
      if (typeof window !== 'undefined' && (window as any).spikeShowToast) {
        (window as any).spikeShowToast(errMsg, 'error');
      }
      throw new Error(errMsg);
    }

    const norm = finalAddress.toLowerCase();
    let initialUsdt = 15.0; // 15$ project entry budget
    let initialBnb = 0.005;
    try {
      const cachedUsdt = localStorage.getItem(`spike_bal_${norm}`);
      const cachedBnb = localStorage.getItem(`spike_bnb_${norm}`);
      if (cachedUsdt !== null && !isNaN(Number(cachedUsdt))) {
        initialUsdt = Number(cachedUsdt);
      }
      if (cachedBnb !== null && !isNaN(Number(cachedBnb))) {
        initialBnb = Number(cachedBnb);
      }
    } catch {}

    // Check cached nodes for this wallet so active mining is never wiped on connect
    let initialNodes: MiningNode[] = [];
    try {
      const cachedNodesStr = localStorage.getItem(`spike_nodes_${norm}`);
      if (cachedNodesStr) {
        const parsed = JSON.parse(cachedNodesStr);
        if (Array.isArray(parsed)) initialNodes = parsed;
      }
    } catch {}

    setNodes(initialNodes);
    setRewards([]);
    setWalletBalance(initialUsdt);
    setWalletBNB(initialBnb);
    const activeYield = initialNodes
      .filter((n) => n.status === 'mining')
      .reduce((acc, n) => acc + (n.hashrate * 39), 0);
    setDailyEarnings(+activeYield.toFixed(2));

    // Initial Referral stats check (read cache first for zero latency)
    let initRefStats: any = {
      directPartners: 0,
      downlinePartners: 0,
      totalPartners: 0,
      totalCommissions: 0,
      referrals: [],
      referredBy: null,
    };
    try {
      const cachedRef = localStorage.getItem(`spike_referral_stats_${norm}`);
      if (cachedRef) initRefStats = JSON.parse(cachedRef);
    } catch {}
    setReferralStats(initRefStats);

    // Immediately fetch fresh referral stats (with Cloud Firestore direct fallback)
    fetch(`/api/referrals/stats/${finalAddress}`)
      .then(async (r) => {
        if (!r.ok || !r.headers.get('content-type')?.includes('application/json')) {
          throw new Error('Static hosting fallback');
        }
        return r.json();
      })
      .then((d) => {
        if (d && d.stats) {
          setReferralStats(d.stats);
          try {
            localStorage.setItem(`spike_referral_stats_${norm}`, JSON.stringify(d.stats));
          } catch {}
        }
      })
      .catch(async () => {
        try {
          const fsData = await getReferralsFromFirestore(finalAddress);
          if (fsData && (fsData.directPartners > 0 || fsData.downlinePartners > 0)) {
            setReferralStats((prev: any) => ({
              ...prev,
              directPartners: Math.max(prev?.directPartners || 0, fsData.directPartners),
              downlinePartners: Math.max(prev?.downlinePartners || 0, fsData.downlinePartners),
              totalPartners: Math.max(prev?.totalPartners || 0, fsData.totalPartners),
              levelCounts: fsData.levelCounts || prev?.levelCounts,
              referrals: fsData.referrals,
            }));
          }
        } catch {}
      });

    setIsWalletConnected(true);
    setWalletAddress(finalAddress);
    if (!keepCurrentTab) {
      setActiveTab('dashboard');
    }
    try {
      localStorage.setItem('spike_wallet_connected', 'true');
      localStorage.setItem('spike_wallet_address', finalAddress);
      if (!keepCurrentTab) {
        localStorage.setItem('spike_active_tab', 'dashboard');
      }
    } catch {}

    // Authoritatively hydrate 24-hour mining session and rigs across disconnects/reconnects
    fetchActiveMiningSession(finalAddress)
      .then((session) => {
        if (session && session.active && session.startTime) {
          try {
            localStorage.setItem(`spike_cycle_start_${norm}`, String(session.startTime));
            localStorage.setItem(`spike_mining_active_${norm}`, 'true');
          } catch {}
          setNodes((prevNodes) => {
            const hasActiveMining = prevNodes.some((n) => n.status === 'mining');
            if (hasActiveMining) return prevNodes;
            const restoredNode: MiningNode = {
              id: `spk-node-${session.startTime}-${norm.slice(2, 6)}`,
              name: 'SPIKE ASIC Rig #1',
              region: 'US-East (Stratum Cluster)',
              status: 'mining',
              hashrate: session.hashrateVh || 100,
              temperature: 64,
              shareAcceptance: 99.98,
              fanSpeed: 75,
              powerUsage: 1400,
              uptimeDays: 1,
              algorithm: 'SHA-256 (Stratum)',
              logs: [
                `24-Hour Mining Cycle Active [Restored from Database · ${session.source}]`,
                'Connected to BSC stratum pool: stratum+tcp://pool.spikenodes.com:443',
              ],
              userAddress: finalAddress,
            };
            const updated = [restoredNode, ...prevNodes];
            try {
              localStorage.setItem(`spike_nodes_${norm}`, JSON.stringify(updated));
            } catch {}
            return updated;
          });
          setDailyEarnings(3900);
          try {
            window.dispatchEvent(
              new CustomEvent('spike_mining_started', {
                detail: { address: finalAddress, startTime: session.startTime },
              })
            );
          } catch {}
        }
      })
      .catch(() => {});

    // Register connected wallet as an active sponsor on backend immediately
    fetch('/api/referrals/sync-sponsor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: finalAddress,
        referralCode: `SPK-${finalAddress.slice(2, 8).toUpperCase()}`,
      }),
    }).catch(() => {});

    // Check if user came from a referral link (?ref=...) and bind sponsor
    const pendingReferrer = localStorage.getItem('spike_pending_referrer');
    if (pendingReferrer && pendingReferrer.toLowerCase() !== norm) {
      // 1. Direct write to Cloud Firestore - guarantees persistence across devices on static hosting
      registerReferralInFirestore(pendingReferrer, finalAddress)
        .then((res) => {
          if (res.success) {
            localStorage.setItem(`spike_referred_by_${norm}`, pendingReferrer);
            localStorage.removeItem('spike_pending_referrer');
            localStorage.removeItem('spike_pending_sponsor_addr');
            localStorage.removeItem('spike_pending_sponsor_code');
            setPendingInvite(null);
            window.dispatchEvent(new CustomEvent('spike_partner_registered', {
              detail: { referrerAddress: pendingReferrer, refereeAddress: finalAddress },
            }));
            try {
              const bc = new BroadcastChannel('spike_referral_live_sync');
              bc.postMessage({ type: 'PARTNER_JOINED', referrer: pendingReferrer, referee: finalAddress });
              bc.close();
            } catch {}
            addToast(
              'Referral Verified & Counted!',
              `Linked to sponsor ${pendingReferrer}! Your partner status is permanently counted.`,
              'success'
            );
          }
        })
        .catch(() => {});

      // 2. Also notify backend API if available
      fetch('/api/referrals/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referrerCodeOrAddr: pendingReferrer,
          refereeAddress: finalAddress,
        }),
      })
        .then(async (r) => {
          if (r.ok && r.headers.get('content-type')?.includes('application/json')) {
            return r.json();
          }
          return null;
        })
        .then((data) => {
          if (data && data.success) {
            if (data.refereeStats) setReferralStats(data.refereeStats);
          }
        })
        .catch(() => {});
    }

    addToast(
      'Wallet Authenticated',
      `Logged in via ${provider} (${finalAddress.slice(0, 6)}...${finalAddress.slice(-4)}). Initialized personal dashboard!`,
      'success'
    );
    return finalAddress;
  };

  const handleBindSponsor = async (codeOrAddr: string, explicitReferee?: string): Promise<boolean> => {
    const referee = explicitReferee || walletAddress;
    if (!referee) {
      addToast('Connect Wallet', 'Please connect your wallet first to bind a sponsor.', 'warning');
      return false;
    }
    let clean = codeOrAddr.trim();
    // Parse clean address or code from full URLs, shortlinks, or query params
    const match0x = clean.match(/0x[a-fA-F0-9]{40}/i);
    const matchSponsor = clean.match(/[?&]sponsor=(0x[a-fA-F0-9]{40})/i);
    const matchRefPath = clean.match(/\/(?:ref|r)\/([a-zA-Z0-9_\-]+)/i);
    const matchQuery = clean.match(/[?&](?:ref|referrer|r|code)=([^&#\s]+)/i);

    if (match0x) {
      clean = match0x[0];
    } else if (matchSponsor) {
      clean = matchSponsor[1];
    } else if (matchRefPath && matchRefPath[1]) {
      clean = matchRefPath[1];
    } else if (matchQuery && matchQuery[1]) {
      clean = decodeURIComponent(matchQuery[1]);
    }

    const isSelfReferral = clean.toLowerCase() === referee.toLowerCase();

    if (isSelfReferral) {
      addToast('Self-Referral Restricted', 'A sponsor cannot join under their own wallet. Please connect a distinct joiner wallet.', 'warning');
      return false;
    }

    // CRITICAL: Check if this referee wallet is ALREADY bonded under a sponsor
    const bondedCheck = await isUserAlreadyBonded(referee);
    if (bondedCheck.isBonded && bondedCheck.sponsor) {
      const activeSponsorLower = clean.toLowerCase();
      const existingSponsorLower = bondedCheck.sponsor.toLowerCase();
      const isSameSponsor =
        existingSponsorLower === activeSponsorLower ||
        (existingSponsorLower.length >= 8 && activeSponsorLower.includes(existingSponsorLower.slice(2, 8))) ||
        (activeSponsorLower.length >= 8 && existingSponsorLower.includes(activeSponsorLower.slice(2, 8)));

      if (!isSameSponsor) {
        addToast(
          'User Already Exists',
          `This wallet is already permanently registered under verified sponsor ${bondedCheck.sponsor.slice(0, 6)}...${bondedCheck.sponsor.slice(-4)}. Re-bonding to another sponsor is not permitted.`,
          'warning'
        );
        setIsReferralModalOpen(false);
        setActiveTab('dashboard');
        return false;
      } else {
        addToast('Already Connected', 'This wallet is already permanently bonded under this sponsor.', 'info');
        setIsReferralModalOpen(false);
        setActiveTab('dashboard');
        return true;
      }
    }

    // Direct Firestore registration attempt
    const firestoreRes = await registerReferralInFirestore(clean, referee).catch(() => null);
    if (firestoreRes && !firestoreRes.success && (firestoreRes as any).alreadyBonded) {
      addToast(
        'User Already Exists',
        firestoreRes.error || 'This wallet is already permanently registered under another sponsor. Re-bonding is not permitted.',
        'warning'
      );
      setIsReferralModalOpen(false);
      setActiveTab('dashboard');
      return false;
    }

    try {
      const res = await fetch('/api/referrals/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referrerCodeOrAddr: clean,
          refereeAddress: referee,
        }),
      });
      const data = await res.json().catch(() => null);
      if (data && data.success) {
        // Cache stats for both parties
        if (data.referrer && data.referrerStats) {
          try {
            localStorage.setItem(
              `spike_referral_stats_${data.referrer.address.toLowerCase()}`,
              JSON.stringify(data.referrerStats)
            );
          } catch {}
        }
        if (data.referee && data.refereeStats) {
          try {
            localStorage.setItem(
              `spike_referral_stats_${data.referee.address.toLowerCase()}`,
              JSON.stringify(data.refereeStats)
            );
          } catch {}
        }

        // If current connected wallet is the referee, update referee stats
        if (walletAddress && walletAddress.toLowerCase() === referee.toLowerCase()) {
          if (data.refereeStats) setReferralStats(data.refereeStats);
        } else if (walletAddress && data.referrer && walletAddress.toLowerCase() === data.referrer.address.toLowerCase()) {
          // If current wallet is the sponsor, update sponsor stats (+1 partner counted!)
          if (data.referrerStats) setReferralStats(data.referrerStats);
        }

        // Always sync the active wallet's stats
        if (walletAddress) {
          fetch(`/api/referrals/stats/${walletAddress}`)
            .then((r) => r.json())
            .then((s) => {
              if (s && s.stats) setReferralStats(s.stats);
            })
            .catch(() => {});
        }

        const normRef = referee.toLowerCase();
        localStorage.setItem(`spike_referred_by_${normRef}`, clean);
        localStorage.setItem(`spike_is_bonded_${normRef}`, 'true');
        localStorage.setItem(`spike_bonded_sponsor_${normRef}`, clean);
        localStorage.removeItem('spike_pending_referrer');
        localStorage.removeItem('spike_pending_sponsor_addr');
        localStorage.removeItem('spike_pending_sponsor_code');
        setPendingInvite(null);

        window.dispatchEvent(new CustomEvent('spike_partner_registered', { detail: data }));
        try {
          const bc = new BroadcastChannel('spike_referral_live_sync');
          bc.postMessage({ type: 'PARTNER_JOINED', data });
          bc.close();
        } catch {}
        addToast('Sponsor Linked & Counted', data.message || 'Sponsor verified and partner counted toward team milestones!', 'success');
        return true;
      } else if (data && data.alreadyBonded) {
        addToast(
          'User Already Exists',
          data.message || 'This wallet is already permanently bonded under another sponsor. Re-bonding is not permitted.',
          'warning'
        );
        setIsReferralModalOpen(false);
        setActiveTab('dashboard');
        return false;
      } else {
        addToast('Referral Error', data?.message || data?.error || 'Failed to bind sponsor', 'error');
        return false;
      }
    } catch {
      // Offline fallback: ONLY bind if referee is NOT already bonded to another sponsor
      const normRef = referee.toLowerCase();
      const localBonded = localStorage.getItem(`spike_is_bonded_${normRef}`) === 'true';
      const localSponsor = localStorage.getItem(`spike_bonded_sponsor_${normRef}`) || localStorage.getItem(`spike_referred_by_${normRef}`);
      if (localBonded && localSponsor && localSponsor.toLowerCase() !== clean.toLowerCase()) {
        addToast(
          'User Already Exists',
          'This wallet is already permanently registered under another sponsor. Re-bonding is not permitted.',
          'warning'
        );
        setIsReferralModalOpen(false);
        setActiveTab('dashboard');
        return false;
      }

      const fallbackData = {
        referrerAddress: clean,
        refereeAddress: referee,
      };
      localStorage.setItem(`spike_referred_by_${normRef}`, clean);
      localStorage.setItem(`spike_is_bonded_${normRef}`, 'true');
      localStorage.setItem(`spike_bonded_sponsor_${normRef}`, clean);
      localStorage.removeItem('spike_pending_referrer');
      localStorage.removeItem('spike_pending_sponsor_addr');
      localStorage.removeItem('spike_pending_sponsor_code');
      setPendingInvite(null);

      window.dispatchEvent(new CustomEvent('spike_partner_registered', { detail: fallbackData }));

      // If connected as sponsor, increment partner count
      if (walletAddress && walletAddress.toLowerCase() === clean.toLowerCase()) {
        setReferralStats((prev: any) => ({
          ...prev,
          directPartners: (prev?.directPartners || 0) + 1,
          totalPartners: (prev?.totalPartners || 0) + 1,
        }));
      }

      setReferralStats((prev: any) => ({
        ...prev,
        referredBy: clean,
      }));
      addToast('Sponsor Linked & Counted', `Sponsor connection successfully registered with ${clean.slice(0, 6)}...!`, 'success');
      return true;
    }
  };

  const handleDisconnectWallet = () => {
    setIsWalletConnected(false);
    setWalletAddress('');
    setInspectedWallet(null);
    setInspectedData(null);
    walletAddressRef.current = '';
    isWalletConnectedRef.current = false;
    setNodes([]);
    setRewards([]);
    setWalletBalance(0);
    setDailyEarnings(0);
    setReferralStats({
      directPartners: 0,
      downlinePartners: 0,
      totalPartners: 0,
      totalCommissions: 0,
      referrals: [],
    });
    setActiveTab('home');
    try {
      localStorage.removeItem('spike_wallet_connected');
      localStorage.removeItem('spike_wallet_address');
      localStorage.removeItem('spike_balance_usdt');
      localStorage.removeItem('spike_balance_bnb');
      clearAdminSession();
      setAdminAuthTick((t) => t + 1);
      localStorage.setItem('spike_active_tab', 'home');
    } catch {}
    addToast('Logged Out', 'Disconnected from BEP-20 provider. Switched to public Home overview.', 'info');
  };

  const handleNavigateHomeSection = (sectionId: string) => {
    setActiveTab('home');
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 80);
  };

  const handleInspectUserPanel = (
    targetWallet: string,
    initialTab: 'dashboard' | 'mining-nodes' | 'referrals' | 'withdraw-history' = 'dashboard'
  ) => {
    if (!isAdmin) {
      addToast('Admin Session Required', 'Please unlock Master Admin authentication first.', 'warning');
      return;
    }
    const clean = targetWallet.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(clean)) {
      addToast('Invalid Address', 'Please enter a valid 42-character BEP-20 wallet address (0x...).', 'error');
      return;
    }
    setInspectedWallet(clean);
    handleTabChange(initialTab);
    addToast(
      'Cross-Verify Mode Active',
      `Inspecting user panel for ${clean.slice(0, 6)}...${clean.slice(-4)} (Read-Only).`,
      'info'
    );
  };

  const handleExitInspectMode = () => {
    setInspectedWallet(null);
    setInspectedData(null);
    handleTabChange('admin');
  };

  const blockInspectMutation = (actionName: string) => {
    addToast(
      'Read-Only Cross-Verify Mode',
      `"${actionName}" is disabled while inspecting wallet ${inspectedWallet?.slice(0, 6)}...${inspectedWallet?.slice(-4)}.`,
      'warning'
    );
  };

  const renderInspectBanner = () => {
    if (!isInspectMode || !inspectedWallet) return null;
    const inspectTabs: Array<{ id: 'dashboard' | 'mining-nodes' | 'referrals' | 'withdraw-history'; label: string; icon: string }> = [
      { id: 'dashboard', label: 'Dashboard', icon: 'space_dashboard' },
      { id: 'mining-nodes', label: 'Mining Nodes', icon: 'dns' },
      { id: 'referrals', label: 'Referrals', icon: 'groups' },
      { id: 'withdraw-history', label: 'Withdrawals', icon: 'receipt_long' },
    ];

    return (
      <div className="mb-5 rounded-2xl bg-gradient-to-r from-[#0b1f33] via-[#102942] to-[#1a1506] border-2 border-[#00F0FF]/50 shadow-[0_0_28px_rgba(0,240,255,0.18)] p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#00F0FF]/15 border border-[#00F0FF]/40 flex items-center justify-center text-[#00F0FF] shrink-0">
              <span className="material-symbols-outlined text-[22px]">manage_search</span>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-[#00F0FF] text-[#051424] uppercase tracking-wider">
                  CROSS-VERIFY MODE · READ-ONLY
                </span>
                {isLoadingInspected ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>Loading Wallet Snapshot...</span>
                  </span>
                ) : inspectedData?.userFoundInDb ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Registered in DB
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-700/60 text-slate-300 border border-slate-600">
                    Unregistered / Fresh Wallet
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="font-mono text-xs sm:text-sm font-bold text-white break-all">
                  {inspectedWallet}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(inspectedWallet)}
                  className="p-1 rounded bg-[#122130] hover:bg-[#1c2b3b] text-[#00F0FF] border border-[#1c2b3b] cursor-pointer"
                  title="Copy Inspected Wallet Address"
                >
                  <span className="material-symbols-outlined text-[14px]">content_copy</span>
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExitInspectMode}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#ffe088] hover:brightness-110 text-[#0A0F1D] font-headline font-black text-xs uppercase tracking-wider shadow-[0_0_18px_rgba(212,175,55,0.35)] flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Back to Admin Panel</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-[#1c2b3b]/80">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {inspectTabs.map((t) => {
              const isCurrent = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTabChange(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-headline font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-[#00F0FF] text-[#051424] shadow-[0_0_12px_rgba(0,240,255,0.35)]'
                      : 'bg-[#071322] text-[#94a3b8] hover:text-white border border-[#1c2b3b]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            <span className="px-2 py-1 rounded bg-[#071322] border border-[#1c2b3b] text-white">
              USDT: <strong className="text-[#00F0FF]">${(inspectedData?.balanceUsdt ?? 0).toFixed(2)}</strong>
            </span>
            <span className="px-2 py-1 rounded bg-[#071322] border border-[#1c2b3b] text-white">
              BNB: <strong className="text-amber-400">{(inspectedData?.balanceBnb ?? 0).toFixed(4)}</strong>
            </span>
            <span className="px-2 py-1 rounded bg-[#071322] border border-[#1c2b3b] text-white">
              SPK: <strong className="text-emerald-400">{(inspectedData?.balanceSpk ?? 0).toFixed(2)}</strong>
            </span>
            <span className="px-2 py-1 rounded bg-[#071322] border border-[#1c2b3b] text-white">
              Nodes: <strong className="text-[#D4AF37]">{inspectedData?.nodes.length ?? 0}</strong>
            </span>
            <span className="px-2 py-1 rounded bg-[#071322] border border-[#1c2b3b] text-white">
              Team: <strong className="text-purple-300">{inspectedData?.referralStats?.totalPartners ?? 0}</strong>
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render the current view content
  const renderCurrentView = () => {
    const viewWalletAddress = isInspectMode && inspectedWallet ? inspectedWallet : walletAddress;
    const viewNodes = isInspectMode ? (inspectedData?.nodes || []) : nodes;
    const viewRewards = isInspectMode ? (inspectedData?.rewards || []) : rewards;
    const viewWalletBalance = isInspectMode ? (inspectedData?.balanceUsdt ?? 0) : walletBalance;
    const viewWalletBNB = isInspectMode ? (inspectedData?.balanceBnb ?? 0) : walletBNB;
    const viewDailyEarnings = isInspectMode ? (inspectedData?.dailyEarnings ?? 0) : dailyEarnings;
    const viewHashrateInfo = isInspectMode ? (inspectedData?.hashrateInfo ?? null) : hashrateInfo;
    const viewReferralStats = isInspectMode
      ? (inspectedData?.referralStats || {
          directPartners: 0,
          downlinePartners: 0,
          totalPartners: 0,
          totalCommissions: 0,
          referrals: [],
        })
      : referralStats;
    const viewIsRootWallet = isInspectMode ? Boolean(inspectedData?.isRootWallet) : Boolean(isMasterUser || isAdmin);
    const viewKey = isInspectMode && inspectedWallet ? `inspect-${inspectedWallet.toLowerCase()}` : 'self';

    const totalHashrate = viewNodes
      .filter((n) => n.status === 'mining')
      .reduce((acc, curr) => acc + curr.hashrate, 0);

    // If user attempts to view internal views without logging in, show login panel gate!
    if (!isWalletConnected && activeTab !== 'home' && activeTab !== 'admin') {
      return (
        <div className="p-8 md:p-12 rounded-3xl bg-[#122130] border border-[#1c2b3b] shadow-2xl text-center max-w-xl mx-auto my-12 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[#00F0FF]/10 text-[#00F0FF] flex items-center justify-center mx-auto border border-[#00F0FF]/30">
            <span className="material-symbols-outlined text-[32px]">lock</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold font-headline text-white tracking-tight">
              Log In Panel Required
            </h2>
            <p className="text-xs text-[#94a3b8] mt-2 leading-relaxed">
              Options like <strong>Dashboard</strong>, <strong>Mining Nodes</strong>, and <strong>Referral System</strong> are unlocked only after logging in. Please connect your BEP-20 Web3 wallet to access your live mining cluster.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setIsConnectModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#00F0FF] text-[#0A0F1D] font-headline font-bold text-xs hover:bg-[#7df4ff] shadow-[0_0_20px_rgba(0,240,255,0.4)] flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">login</span>
              <span>Log In / Connect Wallet</span>
            </button>
            <button
              onClick={() => handleTabChange('home')}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#1c2b3b] hover:bg-[#273647] text-[#94a3b8] hover:text-white font-headline text-xs font-semibold"
            >
              Back to Home Page
            </button>
          </div>
        </div>
      );
    }

    let currentComponent: React.ReactNode = null;

    switch (activeTab) {
      case 'home':
        currentComponent = (
          <HomeView
            onNavigate={handleTabChange}
            onConnectWallet={() => setIsConnectModalOpen(true)}
            isWalletConnected={isWalletConnected}
            walletBalance={walletBalance}
            totalHashrate={totalHashrate}
            onOpenAuditModal={() => setIsAuditModalOpen(true)}
            onOpenDeployModal={() => setIsDeployModalOpen(true)}
            walletAddress={walletAddress}
            onCopyText={copyToClipboard}
            onClaimReferralRewards={(amt) => {
              setWalletBalance((prev) => prev + amt);
              addToast('Commission Claimed', `+${amt.toFixed(2)} USDT added to balance.`, 'success');
            }}
          />
        );
        break;
      case 'swap':
      case 'dashboard':
        currentComponent = (
          <DashboardView
            key={viewKey}
            nodes={viewNodes}
            rewards={viewRewards}
            walletBalance={viewWalletBalance}
            walletBNB={viewWalletBNB}
            dailyEarnings={viewDailyEarnings}
            onRestartNode={isInspectMode ? () => blockInspectMutation('Restart Node') : handleRestartNode}
            onStopNode={isInspectMode ? () => blockInspectMutation('Pause Node') : handleStopNode}
            onStartNode={isInspectMode ? () => blockInspectMutation('Start Node') : handleStartNode}
            onOpenDeployModal={isInspectMode ? () => blockInspectMutation('Deploy Node') : () => setIsDeployModalOpen(true)}
            onOpenClaimModal={isInspectMode ? () => blockInspectMutation('Claim Rewards') : () => setIsClaimModalOpen(true)}
            onOpenAuditModal={() => setIsAuditModalOpen(true)}
            onOpenSwapModal={isInspectMode ? () => blockInspectMutation('Swap Tokens') : handleOpenSwapModal}
            onOpenDepositModal={isInspectMode ? () => blockInspectMutation('10 USDT Deposit') : () => setIsDepositModalOpen(true)}
            onSwapSuccess={isInspectMode ? () => blockInspectMutation('Execute Swap') : handleSwapSuccess}
            onCopyText={copyToClipboard}
            walletAddress={viewWalletAddress}
            hashrateInfo={viewHashrateInfo}
            isRootWallet={viewIsRootWallet}
            onNavigateToReferrals={() => handleTabChange('referrals')}
            onClaimReferralBonus={
              isInspectMode
                ? () => blockInspectMutation('Claim Mining Harvest')
                : (amt) => {
                    setWalletBalance((prev) => {
                      const updated = +(prev + amt).toFixed(2);
                      try {
                        if (walletAddress) {
                          localStorage.setItem(`spike_bal_${walletAddress.toLowerCase()}`, String(updated));
                        }
                      } catch {}
                      return updated;
                    });
                    addToast('Commission Claimed', `+${amt.toFixed(2)} USDT added to balance.`, 'success');
                  }
            }
          />
        );
        break;
      case 'mining-nodes':
        currentComponent = (
          <MiningNodesView
            key={viewKey}
            nodes={viewNodes}
            hashrateInfo={viewHashrateInfo}
            onRestartNode={isInspectMode ? () => blockInspectMutation('Restart Node') : handleRestartNode}
            onStopNode={isInspectMode ? () => blockInspectMutation('Stop Node') : handleStopNode}
            onStartNode={isInspectMode ? () => blockInspectMutation('Start Node') : handleStartNode}
            onOpenDeployModal={isInspectMode ? () => blockInspectMutation('Deploy Node') : () => setIsDeployModalOpen(true)}
            onOpenDepositModal={isInspectMode ? () => blockInspectMutation('10 USDT Deposit') : () => setIsDepositModalOpen(true)}
            onNavigateToReferrals={() => handleTabChange('referrals')}
            onResetToFreshUser={isInspectMode ? () => blockInspectMutation('Reset Session') : handleResetToFreshUser}
            onOpenTestnetModal={isInspectMode ? () => blockInspectMutation('QA Controls') : () => setIsTestnetModalOpen(true)}
          />
        );
        break;
      case 'referrals':
        const userHasActiveMining = isInspectMode
          ? Boolean(inspectedData?.hasActivatedMining || viewNodes.some((n) => n.status === 'mining'))
          : Boolean(
              isMasterUser ||
              isAdmin ||
              nodes.some((n) => n.status === 'mining') ||
              (walletAddress && localStorage.getItem(`spike_mining_active_${walletAddress.toLowerCase()}`) === 'true')
            );

        currentComponent = (
          <ReferralsView
            key={viewKey}
            walletAddress={viewWalletAddress}
            hashrateInfo={viewHashrateInfo}
            onCopyText={copyToClipboard}
            onClaimReferralRewards={
              isInspectMode ? () => blockInspectMutation('Claim Milestone Reward') : handleClaimReferralMilestone
            }
            referralStats={viewReferralStats}
            onBindSponsor={
              isInspectMode
                ? async () => {
                    blockInspectMutation('Bind Sponsor');
                    return false;
                  }
                : handleBindSponsor
            }
            onOpenVerificationModal={
              isInspectMode
                ? () => blockInspectMutation('Sponsor Verification')
                : (code) => {
                    setReferralCodeToVerify(code || '');
                    setIsReferralModalOpen(true);
                  }
            }
            hasActiveMining={userHasActiveMining}
            onOpenDepositModal={isInspectMode ? () => blockInspectMutation('10 USDT Deposit') : () => setIsDepositModalOpen(true)}
            readOnly={isInspectMode}
          />
        );
        break;
      case 'withdraw-history':
        currentComponent = (
          <WithdrawalHistoryView
            key={viewKey}
            walletAddress={viewWalletAddress}
            onNavigateToReferrals={() => handleTabChange('referrals')}
            onCopyText={copyToClipboard}
          />
        );
        break;
      case 'roadmap':
        currentComponent = (
          <RoadmapView />
        );
        break;
      case 'admin':
        currentComponent = (
          <AdminView
            onNotify={addToast}
            onNavigateTab={handleTabChange}
            onInspectUserPanel={handleInspectUserPanel}
            isAdmin={isAdmin}
            isMasterUser={isMasterUser}
            currentWallet={walletAddress}
            onUnlockAdmin={() => {
              setAdminAuthTick((t) => t + 1);
            }}
          />
        );
        break;
      default:
        currentComponent = null;
    }

    return (
      <ErrorBoundary fallbackTitle="View Render Recovery" resetKey={`${activeTab}-${viewKey}`}>
        <Suspense fallback={<ViewSkeleton />}>
          {currentComponent}
        </Suspense>
      </ErrorBoundary>
    );
  };

  // If Mobile Simulator View is selected, wrap in an interactive smartphone frame
  if (viewMode === 'mobile') {
    return (
      <div className="h-screen max-h-screen bg-[#010f1e] flex flex-col items-center justify-center p-2 sm:p-3 select-none overflow-hidden">
        {/* View Mode Bar */}
        <div className="mb-2 shrink-0 flex items-center gap-2 sm:gap-3 bg-[#0d1d2c] border border-[#1c2b3b] px-3.5 py-1.5 rounded-xl text-xs shadow-md">
          <span className="text-[#c6c6cc] font-medium">Device Viewport:</span>
          <button
            onClick={() => setViewMode('auto')}
            className="px-2.5 py-1 rounded bg-[#1c2b3b] text-[#c6c6cc] hover:text-white transition-colors"
          >
            Auto Responsive
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            className="px-2.5 py-1 rounded bg-[#00F0FF] text-[#0A0F1D] font-bold shadow-[0_0_10px_rgba(0,240,255,0.4)]"
          >
            Mobile Simulator
          </button>
          <button
            onClick={() => setViewMode('desktop')}
            className="px-2.5 py-1 rounded bg-[#1c2b3b] text-[#c6c6cc] hover:text-white transition-colors"
          >
            Desktop Wide
          </button>
        </div>

        {/* Mobile Device Frame - Perfectly fits into single screen without overflow */}
        <div className="w-[390px] max-w-[calc(100vw-16px)] h-[min(844px,calc(100vh-64px))] bg-[#051424] rounded-[36px] sm:rounded-[44px] border-[7px] sm:border-[10px] border-[#1c2b3b] shadow-[0_0_60px_rgba(0,0,0,0.85),0_0_35px_rgba(0,240,255,0.18)] flex flex-col overflow-hidden relative">
          {/* Dynamic Island / Speaker Notch */}
          <div className="w-full h-8 bg-[#051424] flex items-center justify-between px-7 shrink-0 z-50 pt-1 text-[11px] font-mono text-[#c6c6cc]">
            <span>9:41</span>
            <div className="w-20 h-4 bg-black rounded-full shadow-inner" />
            <div className="flex items-center gap-1.5 text-[12px]">
              <span className="material-symbols-outlined text-[13px]">wifi</span>
              <span className="material-symbols-outlined text-[13px]">battery_full</span>
            </div>
          </div>

          {/* Embedded Mobile Header */}
          <div className="shrink-0 relative z-30">
            <Header
              onConnectWalletClick={() => setIsConnectModalOpen(true)}
              isWalletConnected={isWalletConnected}
              walletAddress={walletAddress}
              walletBalance={walletBalance}
              network={network}
              onNetworkChange={setNetwork}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onOpenAuditModal={() => setIsAuditModalOpen(true)}
              onOpenTestnetModal={() => setIsTestnetModalOpen(true)}
              onOpenSwapModal={() => setIsSwapModalOpen(true)}
              onOpenDepositModal={() => setIsDepositModalOpen(true)}
              onNavigateHomeSection={handleNavigateHomeSection}
              onDisconnectWallet={handleDisconnectWallet}
              isAdmin={isAdmin || isMasterWalletEligible}
              isMasterUser={isMasterUser}
            />
          </div>

          {/* Scrollable Viewport Content */}
          <div className="flex-1 overflow-y-auto pt-16 px-3.5 pb-6">
            {renderInspectBanner()}
            {renderCurrentView()}
          </div>

          {/* Pinned Mobile Bottom Bar */}
          <MobileBottomNav
            activeTab={activeTab}
            onTabChange={handleTabChange}
            nodeCount={isInspectMode ? (inspectedData?.nodes.length || 0) : nodes.length}
            isWalletConnected={isWalletConnected}
            onOpenLogin={() => setIsConnectModalOpen(true)}
            onNavigateHomeSection={handleNavigateHomeSection}
            isSimulator={true}
            isAdmin={isAdmin || isMasterWalletEligible}
          />
        </div>

        {/* Modals and Toasts inside Mobile View (On-demand mount) */}
        <Suspense fallback={null}>
          {isConnectModalOpen && (
            <ConnectWalletModal
              isOpen={isConnectModalOpen}
              onClose={() => setIsConnectModalOpen(false)}
              isConnected={isWalletConnected}
              address={walletAddress}
              balanceUSDT={walletBalance}
              balanceBNB={walletBNB}
              onConnect={handleConnectWallet}
              onDisconnect={handleDisconnectWallet}
              onCopyAddress={() => copyToClipboard(walletAddress)}
            />
          )}
          {isDeployModalOpen && (
            <DeployNodeModal
              isOpen={isDeployModalOpen}
              onClose={() => setIsDeployModalOpen(false)}
              onDeploy={handleDeployNode}
              existingCount={nodes.length}
              walletBalance={walletOnchainUsdt}
              walletAddress={walletAddress}
            />
          )}
          {isClaimModalOpen && (
            <ClaimRewardsModal
              isOpen={isClaimModalOpen}
              onClose={() => setIsClaimModalOpen(false)}
              claimableUSDT={dailyEarnings}
              walletAddress={walletAddress}
              onConfirmClaim={handleConfirmClaim}
            />
          )}
          {isAuditModalOpen && (
            <AuditModal
              isOpen={isAuditModalOpen}
              onClose={() => setIsAuditModalOpen(false)}
            />
          )}
          {isTestnetModalOpen && (
            <TestnetTestingModal
              isOpen={isTestnetModalOpen}
              onClose={() => setIsTestnetModalOpen(false)}
              walletAddress={walletAddress}
              walletBalance={walletBalance}
              walletBNB={walletBNB}
              currentNetwork={network}
              nodesCount={nodes.length}
              onTopUpUsdt={handleTopUpUsdt}
              onTopUpBnb={handleTopUpBnb}
              onResetToFreshUser={handleResetToFreshUser}
              onSeedTeamLeader={handleSeedTeamLeader}
              onClearTransactions={handleClearTransactions}
              onSwitchToBscTestnet={handleSwitchToBscTestnet}
              onOpenAdminFaucet={() => setActiveTab('admin')}
            />
          )}
          {isSwapModalOpen && (
            <SwapModal
              isOpen={isSwapModalOpen}
              onClose={() => setIsSwapModalOpen(false)}
              spikeBalance={walletSpk}
              bnbBalance={walletBNB}
              usdtBalance={walletOnchainUsdt}
              walletAddress={walletAddress}
              initialMode={swapModalMode}
              onSwapSuccess={handleSwapSuccess}
            />
          )}
          {isDepositModalOpen && (
            <DepositUsdtModal
              isOpen={isDepositModalOpen}
              onClose={() => setIsDepositModalOpen(false)}
              walletAddress={walletAddress}
              walletBalance={walletOnchainUsdt}
              onDepositSuccess={handleDepositSuccess}
            />
          )}
          {isReferralModalOpen && (
            <ReferralVerificationModal
              isOpen={isReferralModalOpen}
              onClose={() => setIsReferralModalOpen(false)}
              referralCodeOrAddr={referralCodeToVerify || ''}
              currentWallet={walletAddress}
              isConnected={isWalletConnected}
              onConnectWallet={handleConnectWallet}
              onDisconnectWallet={handleDisconnectWallet}
              onBindSponsor={handleBindSponsor}
              onOpenMining={() => handleTabChange('dashboard')}
            />
          )}
        </Suspense>
        <Toast toasts={toasts} onDismiss={handleDismissToast} />
      </div>
    );
  }

  // Standard Auto-Responsive / Desktop Layout
  return (
    <div className="bg-[#051424] min-h-screen text-[#d4e4fa] font-body flex flex-col relative overflow-x-hidden">
      {/* Blockchain Nodes & Ambient Constellation Background */}
      <BlockchainBackground />



      {/* Desktop Sidebar (Shown for internal views or admin when logged in) */}
      {isWalletConnected && activeTab !== 'home' && (
        <Sidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          nodeCount={isInspectMode ? (inspectedData?.nodes.length || 0) : nodes.length}
          onOpenSwapModal={() => setIsSwapModalOpen(true)}
          isAdmin={isAdmin || isMasterWalletEligible}
          isMasterUser={isMasterUser}
        />
      )}

      {/* Main Content Area (Full width on Home page and before login, offset for sidebar when logged into app) */}
      <div className={`${isWalletConnected && activeTab !== 'home' ? 'md:pl-64' : ''} flex flex-col min-h-screen transition-all duration-200`}>


        {/* Top Header */}
        <Header
          onConnectWalletClick={() => setIsConnectModalOpen(true)}
          isWalletConnected={isWalletConnected}
          walletAddress={walletAddress}
          walletBalance={walletBalance}
          network={network}
          onNetworkChange={setNetwork}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onOpenAuditModal={() => setIsAuditModalOpen(true)}
          onOpenTestnetModal={() => setIsTestnetModalOpen(true)}
          onOpenSwapModal={() => setIsSwapModalOpen(true)}
          onOpenDepositModal={() => setIsDepositModalOpen(true)}
          onNavigateHomeSection={handleNavigateHomeSection}
          onDisconnectWallet={handleDisconnectWallet}
          isAdmin={isAdmin || isMasterWalletEligible}
          isMasterUser={isMasterUser}
        />



        {/* Main Content Viewport */}
        <main className={`flex-1 pt-20 sm:pt-24 md:pt-28 px-4 sm:px-6 md:px-8 ${activeTab === 'home' ? 'max-w-7xl mx-auto w-full' : 'max-w-7xl w-full mx-auto'} pb-28 md:pb-12`}>
          {renderInspectBanner()}
          {renderCurrentView()}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Visible on mobile screens) */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        nodeCount={isInspectMode ? (inspectedData?.nodes.length || 0) : nodes.length}
        isWalletConnected={isWalletConnected}
        onOpenLogin={() => setIsConnectModalOpen(true)}
        onNavigateHomeSection={handleNavigateHomeSection}
        isSimulator={false}
        isAdmin={isAdmin || isMasterWalletEligible}
      />

      {/* Modals & Dialogs (Mounted strictly on-demand for maximum speed) */}
      <Suspense fallback={null}>
        {isConnectModalOpen && (
          <ConnectWalletModal
            isOpen={isConnectModalOpen}
            onClose={() => setIsConnectModalOpen(false)}
            isConnected={isWalletConnected}
            address={walletAddress}
            balanceUSDT={walletBalance}
            balanceBNB={walletBNB}
            onConnect={handleConnectWallet}
            onDisconnect={handleDisconnectWallet}
            onCopyAddress={() => copyToClipboard(walletAddress)}
            isRootWallet={isMasterUser || isAdmin}
          />
        )}

        {isDeployModalOpen && (
          <DeployNodeModal
            isOpen={isDeployModalOpen}
            onClose={() => setIsDeployModalOpen(false)}
            onDeploy={handleDeployNode}
            existingCount={nodes.length}
            walletBalance={walletOnchainUsdt}
            walletAddress={walletAddress}
          />
        )}

        {isClaimModalOpen && (
          <ClaimRewardsModal
            isOpen={isClaimModalOpen}
            onClose={() => setIsClaimModalOpen(false)}
            claimableUSDT={dailyEarnings}
            walletAddress={walletAddress}
            onConfirmClaim={handleConfirmClaim}
          />
        )}

        {isAuditModalOpen && (
          <AuditModal
            isOpen={isAuditModalOpen}
            onClose={() => setIsAuditModalOpen(false)}
          />
        )}

        {isTestnetModalOpen && (
          <TestnetTestingModal
            isOpen={isTestnetModalOpen}
            onClose={() => setIsTestnetModalOpen(false)}
            walletAddress={walletAddress}
            walletBalance={walletBalance}
            walletBNB={walletBNB}
            currentNetwork={network}
            nodesCount={nodes.length}
            onTopUpUsdt={handleTopUpUsdt}
            onTopUpBnb={handleTopUpBnb}
            onResetToFreshUser={handleResetToFreshUser}
            onSeedTeamLeader={handleSeedTeamLeader}
            onClearTransactions={handleClearTransactions}
            onSwitchToBscTestnet={handleSwitchToBscTestnet}
            onOpenAdminFaucet={() => setActiveTab('admin')}
          />
        )}

        {isSwapModalOpen && (
          <SwapModal
            isOpen={isSwapModalOpen}
            onClose={() => setIsSwapModalOpen(false)}
            spikeBalance={walletSpk}
            bnbBalance={walletBNB}
            usdtBalance={walletOnchainUsdt}
            walletAddress={walletAddress}
            initialMode={swapModalMode}
            onSwapSuccess={handleSwapSuccess}
          />
        )}

        {isDepositModalOpen && (
          <DepositUsdtModal
            isOpen={isDepositModalOpen}
            onClose={() => setIsDepositModalOpen(false)}
            walletAddress={walletAddress}
            walletBalance={walletOnchainUsdt}
            onDepositSuccess={handleDepositSuccess}
          />
        )}

        {isReferralModalOpen && (
          <ReferralVerificationModal
            isOpen={isReferralModalOpen}
            onClose={() => setIsReferralModalOpen(false)}
            referralCodeOrAddr={referralCodeToVerify || ''}
            currentWallet={walletAddress}
            isConnected={isWalletConnected}
            onConnectWallet={handleConnectWallet}
            onDisconnectWallet={handleDisconnectWallet}
            onBindSponsor={handleBindSponsor}
            onOpenMining={() => handleTabChange('dashboard')}
            onNavigateToReferrals={() => handleTabChange('referrals')}
          />
        )}
      </Suspense>

      {/* Floating AI Mining Assistant with Zero-Leak Privacy Guardrails */}
      <AiMiningAssistant />

      {/* Toast Notification Container */}
      <Toast toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
