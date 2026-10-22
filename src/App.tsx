/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { db as firestoreDb } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { TabType, MiningNode, RewardTransaction, ToastMessage, HashrateLevelInfo, AdminSettings } from './types';
import { INITIAL_NODES, INITIAL_REWARDS } from './data/mockData';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { HomeView } from './components/views/HomeView';
import { Toast } from './components/Toast';
import { BlockchainBackground } from './components/BlockchainBackground';

// Code-split heavy views and modals for sub-100ms ultra-fast initial paint
const DashboardView = lazy(() => import('./components/views/DashboardView').then(m => ({ default: m.DashboardView })));
const MiningNodesView = lazy(() => import('./components/views/MiningNodesView').then(m => ({ default: m.MiningNodesView })));
const ReferralsView = lazy(() => import('./components/views/ReferralsView').then(m => ({ default: m.ReferralsView })));
const AdminView = lazy(() => import('./components/views/AdminView').then(m => ({ default: m.AdminView })));

const ConnectWalletModal = lazy(() => import('./components/modals/ConnectWalletModal').then(m => ({ default: m.ConnectWalletModal })));
const DeployNodeModal = lazy(() => import('./components/modals/DeployNodeModal').then(m => ({ default: m.DeployNodeModal })));
const ClaimRewardsModal = lazy(() => import('./components/modals/ClaimRewardsModal').then(m => ({ default: m.ClaimRewardsModal })));
const AuditModal = lazy(() => import('./components/modals/AuditModal').then(m => ({ default: m.AuditModal })));
const SwapModal = lazy(() => import('./components/modals/SwapModal').then(m => ({ default: m.SwapModal })));
const TestnetTestingModal = lazy(() => import('./components/modals/TestnetTestingModal').then(m => ({ default: m.TestnetTestingModal })));
const DepositUsdtModal = lazy(() => import('./components/modals/DepositUsdtModal').then(m => ({ default: m.DepositUsdtModal })));
const ReferralVerificationModal = lazy(() => import('./components/modals/ReferralVerificationModal').then(m => ({ default: m.ReferralVerificationModal })));

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
      const globalNodes = localStorage.getItem('spike_nodes_global');
      if (globalNodes) {
        const parsed = JSON.parse(globalNodes);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      if (localStorage.getItem('spike_active_mining') === 'true') {
        return [{
          id: 'spk-node-active',
          name: 'SPIKE ASIC Rig #1',
          region: 'US-East (Stratum Cluster)',
          status: 'mining',
          hashrate: 1.25,
          temperature: 64,
          shareAcceptance: 99.98,
          fanSpeed: 75,
          powerUsage: 1400,
          uptimeDays: 1,
          algorithm: 'SHA-256 (Stratum)',
          logs: ['24-Hour Mining Cycle Active · Connected to stratum pool'],
          userAddress: savedAddr || '0x71C8a914B97e889F12A0987cB32456Fa12349A2',
        }];
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
      const globalBal = localStorage.getItem('spike_balance_usdt');
      if (globalBal !== null && !isNaN(Number(globalBal))) return Number(globalBal);
      return 10.0;
    } catch {
      return 10.0;
    }
  });
  const [walletBNB, setWalletBNB] = useState<number>(() => {
    try {
      const savedAddr = localStorage.getItem('spike_wallet_address');
      if (savedAddr) {
        const cached = localStorage.getItem(`spike_bnb_${savedAddr.toLowerCase()}`);
        if (cached !== null && !isNaN(Number(cached))) return Number(cached);
      }
      const globalBnb = localStorage.getItem('spike_balance_bnb');
      if (globalBnb !== null && !isNaN(Number(globalBnb))) return Number(globalBnb);
      return 0.005;
    } catch {
      return 0.005;
    }
  });
  const [dailyEarnings, setDailyEarnings] = useState<number>(() => {
    try {
      if (localStorage.getItem('spike_active_mining') === 'true') return 48.75;
      return 0;
    } catch {
      return 0;
    }
  });
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

  // Designated Master Wallets with root auto-recognition
  const MASTER_WALLETS = [
    '0x3471e07c4d2f7e11c155760a7b386e616b5c3715', // Project Creator Master Wallet
    '0x71C8a914B97e889F12A0987cB32456Fa12349A2', // Protocol Co-Admin Wallet
  ];

  const [globalSettings, setGlobalSettings] = useState<AdminSettings | null>(null);

  // Auto-recognition of Master User
  const isMasterUser = Boolean(
    isWalletConnected &&
    walletAddress &&
    (
      MASTER_WALLETS.map((w) => w.toLowerCase()).includes(walletAddress.toLowerCase()) ||
      (globalSettings?.masterWalletAddresses &&
        globalSettings.masterWalletAddresses.map((w) => w.toLowerCase()).includes(walletAddress.toLowerCase()))
    )
  );

  // Admin access state (checked via master wallet, admin wallet, or verified passcode session)
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('spike_admin_authenticated') === 'true';
    } catch {
      return false;
    }
  });

  const isAdmin = isMasterUser || isAdminUnlocked;

  // Real-time synchronization of project-wide global settings
  useEffect(() => {
    const fetchGlobalSettings = () => {
      fetch('/api/settings')
        .then((r) => r.json())
        .then((data) => {
          if (data && data.settings) {
            setGlobalSettings(data.settings);
          }
        })
        .catch(() => {});
    };
    fetchGlobalSettings();
    const handleSettingsUpdate = () => fetchGlobalSettings();
    window.addEventListener('spike_settings_updated', handleSettingsUpdate);
    return () => window.removeEventListener('spike_settings_updated', handleSettingsUpdate);
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
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'admin' || window.location.hash === '#admin') {
        setActiveTab('admin');
      } else if (
        tabParam &&
        ['home', 'dashboard', 'mining-nodes', 'referrals'].includes(tabParam)
      ) {
        setActiveTab(tabParam as TabType);
      }

      // Capture referral code or address from URL (?ref=..., ?referrer=..., or /ref/..., /r/...)
      let refVal = params.get('ref') || params.get('referrer') || params.get('r');
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
        setIsReferralModalOpen(true);
        console.log('[App] Referral link detected and saved:', { cleanRef, sponsorAddr });
      } else if (sponsorAddr) {
        const code = `SPK-${sponsorAddr.slice(2, 8).toUpperCase()}`;
        localStorage.setItem('spike_pending_referrer', sponsorAddr);
        localStorage.setItem('spike_pending_sponsor_code', code);
        setPendingInvite({ code, sponsorAddr });
        setReferralCodeToVerify(sponsorAddr);
        setIsReferralModalOpen(true);
      }
    } catch {
      // ignore
    }
  }, []);

  // Auto-bind pending referral as soon as referee wallet is connected or restored
  useEffect(() => {
    if (!isWalletConnected || !walletAddress) return;
    const pendingReferrer = localStorage.getItem('spike_pending_referrer');
    if (!pendingReferrer) return;

    const normWallet = walletAddress.toLowerCase();
    const normPending = pendingReferrer.toLowerCase();
    const isSelf = normPending === normWallet || normPending.includes(normWallet.slice(2, 8));

    if (isSelf) {
      return;
    }

    fetch('/api/referrals/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referrerCodeOrAddr: pendingReferrer,
        refereeAddress: walletAddress,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data && data.success) {
          localStorage.setItem(`spike_referred_by_${normWallet}`, pendingReferrer);
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
        }
      })
      .catch(() => {});
  }, [isWalletConnected, walletAddress]);

  // Update browser URL query param whenever activeTab changes
  const handleTabChange = (tab: TabType) => {
    if (tab === 'swap') {
      setIsSwapModalOpen(true);
      return;
    }
    setActiveTab(tab);
    if (tab === 'referrals' && walletAddress) {
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

  // Listen to Web3 provider accountsChanged event for auto-switching
  useEffect(() => {
    try {
      if (
        typeof window !== 'undefined' &&
        (window as unknown as { ethereum?: { on?: (event: string, cb: (acc: string[]) => void) => void; removeListener?: (event: string, cb: (acc: string[]) => void) => void } }).ethereum
      ) {
        const eth = (window as unknown as { ethereum: { on?: (event: string, cb: (acc: string[]) => void) => void; removeListener?: (event: string, cb: (acc: string[]) => void) => void } }).ethereum;
        if (typeof eth?.on === 'function') {
          const handleAccountsChanged = (accs: string[]) => {
            if (accs && accs.length > 0) {
              handleConnectWallet('MetaMask', accs[0]);
            } else {
              handleDisconnectWallet();
            }
          };
          eth.on('accountsChanged', handleAccountsChanged);
          return () => {
            try {
              if (typeof eth?.removeListener === 'function') {
                eth.removeListener('accountsChanged', handleAccountsChanged);
              }
            } catch {
              // ignore
            }
          };
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Auto-persist wallet balance across reloads and sync to server
  useEffect(() => {
    try {
      localStorage.setItem('spike_balance_usdt', String(walletBalance));
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

  // Sync state with persistent Firebase Firestore & backend database (Real-time live sync)
  useEffect(() => {
    if (!walletAddress) {
      // Keep cached global balance & nodes so reloads never wipe the user view to 0
      const globalBal = localStorage.getItem('spike_balance_usdt');
      if (globalBal !== null && !isNaN(Number(globalBal))) {
        setWalletBalance(Number(globalBal));
      }
      if (localStorage.getItem('spike_active_mining') === 'true') {
        setNodes((prev) => (prev.length > 0 ? prev : [{
          id: 'spk-node-active',
          name: 'SPIKE ASIC Rig #1',
          region: 'US-East (Stratum Cluster)',
          status: 'mining',
          hashrate: 1.25,
          temperature: 64,
          shareAcceptance: 99.98,
          fanSpeed: 75,
          powerUsage: 1400,
          uptimeDays: 1,
          algorithm: 'SHA-256 (Stratum)',
          logs: ['24-Hour Mining Cycle Active · Connected to stratum pool'],
          userAddress: '0x71C8a914B97e889F12A0987cB32456Fa12349A2',
        }]));
      }
      return;
    }

    const norm = walletAddress.toLowerCase();

    // 1. Immediately load local cache if present strictly for this specific address
    try {
      const cachedUsdt = localStorage.getItem(`spike_bal_${norm}`) || localStorage.getItem('spike_balance_usdt');
      const cachedBnb = localStorage.getItem(`spike_bnb_${norm}`) || localStorage.getItem('spike_balance_bnb');
      if (cachedUsdt !== null && !isNaN(Number(cachedUsdt))) {
        setWalletBalance(Number(cachedUsdt));
      } else {
        setWalletBalance(15.0);
      }
      if (cachedBnb !== null && !isNaN(Number(cachedBnb))) {
        setWalletBNB(Number(cachedBnb));
      } else {
        setWalletBNB(0.005);
      }

      // Load cached nodes immediately so mining rigs stay persistent on refresh
      const cachedNodes = localStorage.getItem(`spike_nodes_${norm}`) || localStorage.getItem('spike_nodes_global');
      let loadedNodes: MiningNode[] = [];
      if (cachedNodes) {
        try {
          const parsed = JSON.parse(cachedNodes);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loadedNodes = parsed;
          }
        } catch {}
      }

      // If active mining is flagged or previously running, guarantee active rig is never lost
      if (loadedNodes.length === 0 && (localStorage.getItem('spike_active_mining') === 'true' || localStorage.getItem(`spike_mining_active_${norm}`) === 'true')) {
        loadedNodes = [{
          id: 'spk-node-active',
          name: 'SPIKE ASIC Rig #1',
          region: 'US-East (Stratum Cluster)',
          status: 'mining',
          hashrate: 1.25,
          temperature: 64,
          shareAcceptance: 99.98,
          fanSpeed: 75,
          powerUsage: 1400,
          uptimeDays: 1,
          algorithm: 'SHA-256 (Stratum)',
          logs: ['24-Hour Mining Cycle Active · Connected to stratum pool'],
          userAddress: norm,
        }];
        try {
          localStorage.setItem(`spike_nodes_${norm}`, JSON.stringify(loadedNodes));
        } catch {}
      }

      if (loadedNodes.length > 0) {
        setNodes(loadedNodes);
        const activeMining = loadedNodes.filter((n: MiningNode) => n.status === 'mining');
        const calculatedYield = activeMining.reduce((acc: number, n: MiningNode) => acc + (n.hashrate * 39), 0);
        setDailyEarnings(+calculatedYield.toFixed(2));
      }

      // Load cached referral stats
      const cachedRef = localStorage.getItem(`spike_referral_stats_${norm}`);
      if (cachedRef) {
        setReferralStats(JSON.parse(cachedRef));
      } else if (norm === '0xbc5d4447cd615daac2338ce7b9c70eab18d78e21'.toLowerCase()) {
        setReferralStats({
          directPartners: 1,
          downlinePartners: 0,
          totalPartners: 1,
          totalCommissions: 0,
          referrals: [
            {
              id: 'ref-bc5d-3806',
              referrerAddress: '0xbc5d4447cd615daac2338ce7b9c70eab18d78e21',
              refereeAddress: '0x38069663d6408dff184bafc65e247e37ae84a1c2',
              tier: 1,
              commissionUsdt: 0,
              volumeUsdt: 150.0,
              createdAt: new Date().toISOString(),
            },
          ],
          referredBy: null,
        });
      }
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
                localStorage.setItem('spike_balance_usdt', String(fsData.balanceUsdt));
              } catch {}
            }
            if (typeof fsData.balanceBnb === 'number') {
              setWalletBNB(fsData.balanceBnb);
              try {
                localStorage.setItem(`spike_bnb_${norm}`, String(fsData.balanceBnb));
                localStorage.setItem('spike_balance_bnb', String(fsData.balanceBnb));
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
          const cachedBalStr = localStorage.getItem(`spike_bal_${norm}`) || localStorage.getItem('spike_balance_usdt');
          const cachedBal = cachedBalStr !== null && !isNaN(Number(cachedBalStr)) ? Number(cachedBalStr) : null;
          const effectiveBal = cachedBal !== null ? cachedBal : (uBal !== null ? uBal : 15.0);
          
          setWalletBalance(effectiveBal);
          try {
            localStorage.setItem(`spike_bal_${norm}`, String(effectiveBal));
            localStorage.setItem('spike_balance_usdt', String(effectiveBal));
          } catch {}

          if (bBal !== null) {
            setWalletBNB(bBal);
            try {
              localStorage.setItem(`spike_bnb_${norm}`, String(bBal));
              localStorage.setItem('spike_balance_bnb', String(bBal));
            } catch {}
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
        if (data && Array.isArray(data.nodes) && data.nodes.length > 0) {
          setNodes(data.nodes);
          try {
            localStorage.setItem(`spike_nodes_${norm}`, JSON.stringify(data.nodes));
            localStorage.setItem('spike_nodes_global', JSON.stringify(data.nodes));
            if (data.nodes.some((n: MiningNode) => n.status === 'mining')) {
              localStorage.setItem('spike_active_mining', 'true');
              localStorage.setItem(`spike_mining_active_${norm}`, 'true');
            }
          } catch {}
          const activeMining = data.nodes.filter((n: MiningNode) => n.status === 'mining');
          const calculatedYield = activeMining.reduce((acc: number, n: MiningNode) => acc + (n.hashrate * 39), 0);
          setDailyEarnings(+calculatedYield.toFixed(2));
        } else {
          // If server currently has no nodes recorded for user, sync active client-side nodes to server
          try {
            const localCachedNodes = localStorage.getItem(`spike_nodes_${norm}`) || localStorage.getItem('spike_nodes_global');
            let nodesToSync: MiningNode[] = [];
            if (localCachedNodes) {
              const parsed = JSON.parse(localCachedNodes);
              if (Array.isArray(parsed) && parsed.length > 0) {
                nodesToSync = parsed;
              }
            }
            if (nodesToSync.length === 0 && (localStorage.getItem('spike_active_mining') === 'true' || localStorage.getItem(`spike_mining_active_${norm}`) === 'true')) {
              nodesToSync = [{
                id: 'spk-node-active',
                name: 'SPIKE ASIC Rig #1',
                region: 'US-East (Stratum Cluster)',
                status: 'mining',
                hashrate: 1.25,
                temperature: 64,
                shareAcceptance: 99.98,
                fanSpeed: 75,
                powerUsage: 1400,
                uptimeDays: 1,
                algorithm: 'SHA-256 (Stratum)',
                logs: ['24-Hour Mining Cycle Active · Connected to stratum pool'],
                userAddress: norm,
              }];
            }
            if (nodesToSync.length > 0) {
              setNodes(nodesToSync);
              const activeMining = nodesToSync.filter((n: MiningNode) => n.status === 'mining');
              const calculatedYield = activeMining.reduce((acc: number, n: MiningNode) => acc + (n.hashrate * 39), 0);
              setDailyEarnings(+calculatedYield.toFixed(2));
              fetch('/api/nodes/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userAddress: walletAddress, nodes: nodesToSync }),
              }).catch(() => {});
            }
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
    window.addEventListener('focus', handleWindowFocus);

    const handlePartnerRegistered = () => {
      syncLiveReferralData();
    };
    window.addEventListener('spike_partner_registered', handlePartnerRegistered);

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      clearInterval(referralPollInterval);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('spike_partner_registered', handlePartnerRegistered);
      window.removeEventListener('spike_balance_updated', handleBalanceEvent);
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
  const [swapModalMode, setSwapModalMode] = useState<'sellSpike' | 'buySpike'>('sellSpike');
  const [isTestnetModalOpen, setIsTestnetModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [referralCodeToVerify, setReferralCodeToVerify] = useState<string>('');

  const handleOpenSwapModal = (mode: 'sellSpike' | 'buySpike' = 'sellSpike') => {
    setSwapModalMode(mode);
    setIsSwapModalOpen(true);
  };

  // Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (title: string, message: string, type: ToastMessage['type'] = 'success') => {
    const id = Date.now().toString();
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
        localStorage.setItem('spike_active_mining', hasAnyMining ? 'true' : 'false');
        localStorage.setItem('spike_nodes_global', JSON.stringify(updated));
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
        localStorage.setItem('spike_active_mining', 'true');
        localStorage.setItem('spike_nodes_global', JSON.stringify(updated));
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

  const handleDeployNode = (newNode: MiningNode, costUsdt: number = 15) => {
    if (walletBalance < costUsdt) {
      addToast(
        'Insufficient Balance',
        `Required ${costUsdt} USDT for node activation. Your balance: ${walletBalance.toFixed(2)} USDT. Use Testnet Faucet to add funds!`,
        'warning'
      );
      return;
    }

    const updatedBalance = Math.max(0, +(walletBalance - costUsdt).toFixed(2));
    setWalletBalance(updatedBalance);
    const updatedNodes = [newNode, ...nodes];
    setNodes(updatedNodes);

    try {
      localStorage.setItem('spike_active_mining', 'true');
      localStorage.setItem('spike_nodes_global', JSON.stringify(updatedNodes));
      localStorage.setItem('spike_balance_usdt', String(updatedBalance));
      if (walletAddress) {
        localStorage.setItem(`spike_nodes_${walletAddress.toLowerCase()}`, JSON.stringify(updatedNodes));
        localStorage.setItem(`spike_mining_active_${walletAddress.toLowerCase()}`, 'true');
        localStorage.setItem(`spike_bal_${walletAddress.toLowerCase()}`, String(updatedBalance));
      }
    } catch {}

    if (walletAddress) {
      // Sync node to backend fleet
      fetch('/api/nodes/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: walletAddress, nodes: updatedNodes }),
      }).catch(() => {});
    }

    // Dynamically recalculate daily yield from all active rigs (100 VH/s = 1 SPK in 60 days = 0.01667 SPK/day)
    const activeMining = updatedNodes.filter((n) => n.status === 'mining');
    const calculatedDailySpk = activeMining.reduce((acc, n) => acc + ((n.hashrate || 100) / 6000), 0);
    const calculatedYield = +(calculatedDailySpk * 1.12).toFixed(4);
    setDailyEarnings(calculatedYield);

    const randomTxHash = `0x${Array.from({ length: 4 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}...${Array.from({ length: 4 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`;

    const newTx: RewardTransaction = {
      id: `tx-node-${Date.now()}`,
      txHash: randomTxHash,
      rewardSource: `Smart Contract Call: Mining Node Activation (${newNode.name})`,
      amount: -costUsdt,
      currency: 'USDT',
      timestamp: 'Just now',
      status: 'Confirmed',
    };
    setRewards((prev) => [newTx, ...prev]);

    // Save to persistent backend database & execute backend PancakeSwap buy
    fetch('/api/mining/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAddress: walletAddress,
        nodeName: newNode.name,
        costUsdt,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && data.boughtSpk) {
          addToast(
            'Smart Contract Mining Call Executed!',
            `Mining active (${newNode.name})! Backend executed PancakeSwap Buy Route: +${data.boughtSpk.toFixed(2)} SPK credited to your SPIKE Balance!`,
            'success'
          );
        }
      })
      .catch((err) => console.warn('[App] Mining activate error:', err));

    addToast(
      'Rig Deployed & Activated',
      `-${costUsdt} USDT deducted via Smart Contract call. ${newNode.name} is now hashing on BSC validator network! Generating +${(newNode.hashrate * 39).toFixed(2)} USDT/day.`,
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
      id: `tx-${Date.now()}`,
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
      // Selling SPIKE: USDT is credited directly to connected user's personal wallet!
      const newBal = +(walletBalance + toAmount).toFixed(2);
      setWalletBalance(newBal);
      if (walletAddress) {
        const norm = walletAddress.toLowerCase();
        localStorage.setItem(`spike_bal_${norm}`, newBal.toFixed(2));
        window.dispatchEvent(
          new CustomEvent('spike_balance_updated', {
            detail: { address: norm, balanceUsdt: newBal },
          })
        );
      }
      const shortAddr = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'your connected wallet';
      addToast(
        'PancakeSwap Sell Executed',
        `+${toAmount.toFixed(2)} USDT directly credited into your personal Web3 wallet (${shortAddr})!`,
        'success'
      );
    } else if (fromToken === 'USDT' && toToken === 'SPIKE') {
      // Buying SPIKE with USDT:
      setWalletBalance((prev) => Math.max(0, +(prev - fromAmount).toFixed(2)));
      addToast(
        'SPIKE Purchased',
        `+${toAmount.toFixed(2)} SPK added via PancakeSwap!`,
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
    setWalletBalance((prev) => +(prev + amountUsd).toFixed(2));
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
    fetch('/api/transactions/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAddress: walletAddress,
        type: 'referral_bonus',
        amount: amountUsd,
        currency: 'USDT',
        details: `Team Career Milestone (${milestoneLabel}) Payout`,
        txHash: randomTxHash,
      }),
    }).catch(() => {});
    addToast('Milestone Claimed', `+${amountUsd} USDT milestone bonus unlocked and credited to your wallet!`, 'success');
  };

  const handleDepositSuccess = (newBalance: number, txHash: string) => {
    setWalletBalance(newBalance);
    if (walletAddress) {
      const norm = walletAddress.toLowerCase();
      localStorage.setItem(`spike_bal_${norm}`, newBalance.toFixed(2));
      window.dispatchEvent(
        new CustomEvent('spike_balance_updated', {
          detail: { address: norm, balanceUsdt: newBalance },
        })
      );
    }
    const cleanHash = txHash.length > 14 ? `${txHash.slice(0, 8)}...${txHash.slice(-6)}` : txHash;
    const newTx: RewardTransaction = {
      id: `tx-dep-${Date.now()}`,
      txHash: cleanHash,
      rewardSource: 'Step 1: 5 USDT Protocol Deposit to Official Treasury Vault',
      amount: -5,
      currency: 'USDT',
      timestamp: 'Just now',
      status: 'Confirmed',
    };
    // Activate mining node upon 5$ deposit to treasury
    const activeNode: MiningNode = {
      id: `node-${Date.now()}`,
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
        'Deposit of 5.00 USDT received in Official Protocol Treasury Vault',
        'Connected to BSC stratum pool: stratum+tcp://pool.spikenodes.com:443',
        '24-Hour Mining Cycle Started · Automated PancakeSwap Buyback Enabled',
      ],
      userAddress: walletAddress,
    };
    setNodes((prev) => (prev.some((n) => n.status === 'mining') ? prev : [activeNode, ...prev]));

    // Start 24-hour harvesting cycle from 0 SPIKE
    try {
      localStorage.setItem('spike_active_mining', 'true');
      if (walletAddress) {
        const norm = walletAddress.toLowerCase();
        localStorage.setItem(`spike_mining_active_${norm}`, 'true');
        localStorage.setItem(`spike_cycle_start_${norm}`, String(Date.now()));
        localStorage.setItem(`spike_accumulated_spk_${norm}`, '0');
        localStorage.setItem(`spike_accumulated_usdt_${norm}`, '0');
      }
      localStorage.setItem('spike_accumulated_spk_global', '0');
      localStorage.setItem('spike_accumulated_usdt_global', '0');
      window.dispatchEvent(
        new CustomEvent('spike_mining_started', {
          detail: { address: walletAddress, startTime: Date.now() },
        })
      );
    } catch {}

    addToast(
      '5 USDT Deposit Confirmed!',
      'Funds deposited to Protocol Treasury. Mining started and 24-hour harvesting cycle active from 0 SPIKE!',
      'success'
    );
    // Switch to dashboard to show live mining
    setActiveTab('dashboard');
  };

  const handleConnectWallet = async (provider: string, realAddress?: string, keepCurrentTab?: boolean): Promise<string> => {
    let finalAddress = realAddress;
    if (!finalAddress && typeof window !== 'undefined') {
      const win = window as any;
      if (win.ethereum && typeof win.ethereum.request === 'function' && (provider.toLowerCase().includes('meta') || provider.toLowerCase().includes('trust') || provider.toLowerCase().includes('web3'))) {
        try {
          const accounts = await win.ethereum.request({ method: 'eth_requestAccounts' });
          if (Array.isArray(accounts) && accounts.length > 0) {
            finalAddress = accounts[0];
          }
        } catch (err) {
          console.warn('[App] Real Web3 connection popup was closed or rejected:', err);
        }
      }
    }

    if (!finalAddress) {
      const chars = '0123456789abcdef';
      let addr = '0x';
      for (let i = 0; i < 40; i++) {
        addr += chars[Math.floor(Math.random() * chars.length)];
      }
      finalAddress = addr;
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

    // Immediately fetch fresh on-chain referral stats from server for this wallet
    fetch(`/api/referrals/stats/${finalAddress}`)
      .then((r) => r.json())
      .then((d) => {
        if (d && d.stats) {
          setReferralStats(d.stats);
          try {
            localStorage.setItem(`spike_referral_stats_${norm}`, JSON.stringify(d.stats));
          } catch {}
        }
      })
      .catch(() => {});

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
      fetch('/api/referrals/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referrerCodeOrAddr: pendingReferrer,
          refereeAddress: finalAddress,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data && data.success) {
            localStorage.setItem(`spike_referred_by_${norm}`, pendingReferrer);
            localStorage.removeItem('spike_pending_referrer');
            localStorage.removeItem('spike_pending_sponsor_addr');
            localStorage.removeItem('spike_pending_sponsor_code');
            setPendingInvite(null);
            if (data.refereeStats) setReferralStats(data.refereeStats);
            window.dispatchEvent(new CustomEvent('spike_partner_registered', { detail: data }));
            addToast(
              'Referral Verified',
              `Successfully linked to sponsor ${data.referrer?.referralCode || pendingReferrer}! Partner counted.`,
              'success'
            );
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

    const isSelfReferral = clean.toLowerCase() === referee.toLowerCase() ||
      (walletAddress && (
        clean.toLowerCase().includes(walletAddress.toLowerCase().slice(2, 8)) ||
        clean.toLowerCase() === walletAddress.toLowerCase()
      ));

    if (isSelfReferral) {
      // User is verifying / testing their own referral link!
      try {
        const simRes = await fetch('/api/referrals/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referrerAddress: referee }),
        });
        const simData = await simRes.json();
        if (simData && simData.success) {
          if (simData.stats) setReferralStats(simData.stats);
          window.dispatchEvent(new CustomEvent('spike_partner_registered', { detail: simData }));
          addToast(
            'Referral Link Verified!',
            `Self-link verified! Added +1 Partner to your team network. Total: ${simData.stats?.directPartners || 1} Directs.`,
            'success'
          );
          return true;
        }
      } catch {}
      addToast('Referral Link Verified', 'Sponsor link belongs to your connected wallet.', 'info');
      return true;
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
      const data = await res.json();
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

        window.dispatchEvent(new CustomEvent('spike_partner_registered', { detail: data }));
        addToast('Sponsor Linked & Counted', data.message || 'Sponsor verified and partner counted toward team milestones!', 'success');
        return true;
      } else {
        addToast('Referral Error', data?.message || data?.error || 'Failed to bind sponsor', 'error');
        return false;
      }
    } catch {
      // Offline fallback
      setReferralStats((prev: any) => ({
        ...prev,
        referredBy: clean,
      }));
      addToast('Sponsor Bound', `Sponsor connection saved for ${clean.slice(0, 6)}...`, 'success');
      return true;
    }
  };

  const handleDisconnectWallet = () => {
    setIsWalletConnected(false);
    setWalletAddress('');
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

  // Render the current view content
  const renderCurrentView = () => {
    const totalHashrate = nodes
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
            nodes={nodes}
            rewards={rewards}
            walletBalance={walletBalance}
            walletBNB={walletBNB}
            dailyEarnings={dailyEarnings}
            onRestartNode={handleRestartNode}
            onStopNode={handleStopNode}
            onStartNode={handleStartNode}
            onOpenDeployModal={() => setIsDeployModalOpen(true)}
            onOpenClaimModal={() => setIsClaimModalOpen(true)}
            onOpenAuditModal={() => setIsAuditModalOpen(true)}
            onOpenSwapModal={handleOpenSwapModal}
            onOpenDepositModal={() => setIsDepositModalOpen(true)}
            onSwapSuccess={handleSwapSuccess}
            onCopyText={copyToClipboard}
            walletAddress={walletAddress}
            hashrateInfo={hashrateInfo}
            onNavigateToReferrals={() => handleTabChange('referrals')}
            onClaimReferralBonus={(amt) => {
              setWalletBalance((prev) => {
                const updated = +(prev + amt).toFixed(2);
                try {
                  localStorage.setItem('spike_balance_usdt', String(updated));
                  if (walletAddress) {
                    localStorage.setItem(`spike_bal_${walletAddress.toLowerCase()}`, String(updated));
                  }
                  localStorage.setItem('spike_active_mining', 'true');
                } catch {}
                return updated;
              });
              addToast('Commission Claimed', `+${amt.toFixed(2)} USDT added to balance.`, 'success');
            }}
          />
        );
        break;
      case 'mining-nodes':
        currentComponent = (
          <MiningNodesView
            nodes={nodes}
            hashrateInfo={hashrateInfo}
            onRestartNode={handleRestartNode}
            onStopNode={handleStopNode}
            onStartNode={handleStartNode}
            onOpenDeployModal={() => setIsDeployModalOpen(true)}
            onOpenDepositModal={() => setIsDepositModalOpen(true)}
            onNavigateToReferrals={() => handleTabChange('referrals')}
            onResetToFreshUser={handleResetToFreshUser}
            onOpenTestnetModal={() => setIsTestnetModalOpen(true)}
          />
        );
        break;
      case 'referrals':
        currentComponent = (
          <ReferralsView
            walletAddress={walletAddress}
            hashrateInfo={hashrateInfo}
            onCopyText={copyToClipboard}
            onClaimReferralRewards={handleClaimReferralMilestone}
            referralStats={referralStats}
            onBindSponsor={handleBindSponsor}
            onOpenVerificationModal={(code) => {
              setReferralCodeToVerify(code || '');
              setIsReferralModalOpen(true);
            }}
          />
        );
        break;
      case 'admin':
        currentComponent = (
          <AdminView
            onNotify={addToast}
            onNavigateTab={handleTabChange}
            isAdmin={isAdmin}
            isMasterUser={isMasterUser}
            currentWallet={walletAddress}
            network={network}
            onNetworkChange={setNetwork}
            onOpenTestnetModal={() => setIsTestnetModalOpen(true)}
            onUnlockAdmin={() => {
              setIsAdminUnlocked(true);
              try {
                sessionStorage.setItem('spike_admin_authenticated', 'true');
              } catch {
                // ignore
              }
            }}
          />
        );
        break;
      default:
        currentComponent = null;
    }

    return (
      <Suspense fallback={<ViewSkeleton />}>
        {currentComponent}
      </Suspense>
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
              onTabChange={setActiveTab}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onOpenAuditModal={() => setIsAuditModalOpen(true)}
              onOpenTestnetModal={() => setIsTestnetModalOpen(true)}
              onOpenSwapModal={() => setIsSwapModalOpen(true)}
              onOpenDepositModal={() => setIsDepositModalOpen(true)}
              onNavigateHomeSection={handleNavigateHomeSection}
              onDisconnectWallet={handleDisconnectWallet}
              isAdmin={isAdmin}
              isMasterUser={isMasterUser}
            />
          </div>

          {/* Scrollable Viewport Content */}
          <div className="flex-1 overflow-y-auto pt-16 px-3.5 pb-6">
            {renderCurrentView()}
          </div>

          {/* Pinned Mobile Bottom Bar */}
          <MobileBottomNav
            activeTab={activeTab}
            onTabChange={handleTabChange}
            nodeCount={nodes.length}
            isWalletConnected={isWalletConnected}
            onOpenLogin={() => setIsConnectModalOpen(true)}
            onNavigateHomeSection={handleNavigateHomeSection}
            isSimulator={true}
            isAdmin={isAdmin}
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
              walletBalance={walletBalance}
              onClaimFaucet={handleTopUpUsdt}
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
              spikeBalance={walletBalance}
              bnbBalance={walletBNB}
              onSwapSuccess={handleSwapSuccess}
            />
          )}
          {isDepositModalOpen && (
            <DepositUsdtModal
              isOpen={isDepositModalOpen}
              onClose={() => setIsDepositModalOpen(false)}
              walletAddress={walletAddress}
              walletBalance={walletBalance}
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
          nodeCount={nodes.length}
          onOpenSwapModal={() => setIsSwapModalOpen(true)}
          isAdmin={isAdmin}
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
          isAdmin={isAdmin}
        />



        {/* Admin Quick Direct Access Bar (Visible ONLY to verified Admin when not in admin view) */}
        {isAdmin && activeTab !== 'admin' && (
          <div className="pt-20 md:pt-24 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto w-full">
            <div className="bg-[#0d1d2c]/80 backdrop-blur-md rounded-xl p-2.5 sm:px-4 border border-[#1c2b3b] flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono shadow-sm">
              <div className="flex items-center gap-2 text-[#94a3b8]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[#00F0FF] font-bold">Backend DB &amp; Admin Panel:</span>
                <span className="hidden sm:inline">Active (.data/spike_database.json)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#94a3b8] hidden md:inline">Domain: spikenodes.com (?tab=admin)</span>
                <button
                  onClick={() => handleTabChange('admin')}
                  className="px-3 py-1 rounded-lg bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#D4AF37] border border-[#D4AF37]/40 font-bold transition-all transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">shield_person</span>
                  <span>Check Admin Panel →</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Viewport */}
        <main className={`flex-1 ${isAdmin && activeTab !== 'admin' ? 'pt-4 md:pt-6' : 'pt-20 sm:pt-24 md:pt-28'} px-4 sm:px-6 md:px-8 ${activeTab === 'home' ? 'max-w-7xl mx-auto w-full' : 'max-w-7xl w-full mx-auto'} pb-28 md:pb-12`}>
          {renderCurrentView()}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Visible on mobile screens) */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        nodeCount={nodes.length}
        isWalletConnected={isWalletConnected}
        onOpenLogin={() => setIsConnectModalOpen(true)}
        onNavigateHomeSection={handleNavigateHomeSection}
        isSimulator={false}
        isAdmin={isAdmin}
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
          />
        )}

        {isDeployModalOpen && (
          <DeployNodeModal
            isOpen={isDeployModalOpen}
            onClose={() => setIsDeployModalOpen(false)}
            onDeploy={handleDeployNode}
            existingCount={nodes.length}
            walletBalance={walletBalance}
            onClaimFaucet={handleTopUpUsdt}
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
            spikeBalance={150.0}
            bnbBalance={walletBNB}
            usdtBalance={walletBalance}
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
            walletBalance={walletBalance}
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
            onBindSponsor={handleBindSponsor}
            onOpenMining={() => handleTabChange('dashboard')}
            onNavigateToReferrals={() => handleTabChange('referrals')}
          />
        )}
      </Suspense>

      {/* Toast Notification Container */}
      <Toast toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
