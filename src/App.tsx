/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { TabType, MiningNode, RewardTransaction, ToastMessage } from './types';
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
const AnnouncementsView = lazy(() => import('./components/views/AnnouncementsView').then(m => ({ default: m.AnnouncementsView })));
const AdminView = lazy(() => import('./components/views/AdminView').then(m => ({ default: m.AdminView })));

const ConnectWalletModal = lazy(() => import('./components/modals/ConnectWalletModal').then(m => ({ default: m.ConnectWalletModal })));
const DeployNodeModal = lazy(() => import('./components/modals/DeployNodeModal').then(m => ({ default: m.DeployNodeModal })));
const ClaimRewardsModal = lazy(() => import('./components/modals/ClaimRewardsModal').then(m => ({ default: m.ClaimRewardsModal })));
const AuditModal = lazy(() => import('./components/modals/AuditModal').then(m => ({ default: m.AuditModal })));
const SwapModal = lazy(() => import('./components/modals/SwapModal').then(m => ({ default: m.SwapModal })));
const TestnetTestingModal = lazy(() => import('./components/modals/TestnetTestingModal').then(m => ({ default: m.TestnetTestingModal })));

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

  // Application Data States (Scoped to current connected wallet)
  const [nodes, setNodes] = useState<MiningNode[]>([]);
  const [rewards, setRewards] = useState<RewardTransaction[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletBNB, setWalletBNB] = useState<number>(0.005);
  const [dailyEarnings, setDailyEarnings] = useState<number>(0);
  const [network, setNetwork] = useState<string>('BEP-20 / BSC Network');
  const [referralStats, setReferralStats] = useState<any>({
    directPartners: 0,
    downlinePartners: 0,
    totalPartners: 0,
    totalCommissions: 0,
    referrals: [],
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

  // Designated Protocol Primary Admin Wallet
  const PRIMARY_ADMIN_WALLET = '0x71C8a914B97e889F12A0987cB32456Fa12349A2';

  // Admin access state (checked via admin wallet or verified passcode session)
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('spike_admin_authenticated') === 'true';
    } catch {
      return false;
    }
  });

  const isAdmin =
    (isWalletConnected && walletAddress.toLowerCase() === PRIMARY_ADMIN_WALLET.toLowerCase()) ||
    isAdminUnlocked;

  // Sync tab with URL parameter (?tab=admin or #admin)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'admin' || window.location.hash === '#admin') {
        setActiveTab('admin');
      } else if (
        tabParam &&
        ['home', 'dashboard', 'mining-nodes', 'referrals', 'announcements'].includes(tabParam)
      ) {
        setActiveTab(tabParam as TabType);
      }
    } catch {
      // ignore
    }
  }, []);

  // Update browser URL query param whenever activeTab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
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
    if (
      typeof window !== 'undefined' &&
      (window as unknown as { ethereum?: { on: (event: string, cb: (acc: string[]) => void) => void; removeListener: (event: string, cb: (acc: string[]) => void) => void } }).ethereum
    ) {
      const eth = (window as unknown as { ethereum: { on: (event: string, cb: (acc: string[]) => void) => void; removeListener: (event: string, cb: (acc: string[]) => void) => void } }).ethereum;
      const handleAccountsChanged = (accs: string[]) => {
        if (accs && accs.length > 0) {
          handleConnectWallet('MetaMask', accs[0]);
        } else {
          handleDisconnectWallet();
        }
      };
      eth.on('accountsChanged', handleAccountsChanged);
      return () => {
        eth.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  // Sync state with persistent backend database on start (Non-blocking background refresh)
  useEffect(() => {
    if (!walletAddress) {
      setNodes([]);
      setRewards([]);
      setWalletBalance(0);
      setWalletBNB(0.005);
      setDailyEarnings(0);
      setReferralStats({
        directPartners: 0,
        downlinePartners: 0,
        totalPartners: 0,
        totalCommissions: 0,
        referrals: [],
      });
      return;
    }

    // Immediately ensure clean initial baseline for the address while fetching
    setNodes([]);
    setRewards([]);
    setDailyEarnings(0);

    fetch(`/api/user/${walletAddress}`)
      .then((res) => {
        if (!res.ok || res.headers.get('content-type')?.includes('text/html')) {
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.user) {
          const uBal = typeof data.user.balanceUsdt === 'number' ? data.user.balanceUsdt : 0;
          const bBal = typeof data.user.balanceBnb === 'number' ? data.user.balanceBnb : 0.005;
          setWalletBalance(uBal);
          setWalletBNB(bBal);
          try {
            localStorage.setItem('spike_balance_usdt', String(uBal));
            localStorage.setItem('spike_balance_bnb', String(bBal));
          } catch {}
        } else {
          setWalletBalance(0);
          setWalletBNB(0.005);
        }
        // Set nodes array (for a new wallet this is [] 0 nodes!)
        if (data && Array.isArray(data.nodes) && data.nodes.length > 0) {
          setNodes(data.nodes);
          const activeMining = data.nodes.filter((n: MiningNode) => n.status === 'mining');
          const calculatedYield = activeMining.reduce((acc: number, n: MiningNode) => acc + (n.hashrate * 39), 0);
          setDailyEarnings(+calculatedYield.toFixed(2));
        } else {
          setNodes([]);
          setDailyEarnings(0);
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
        } else {
          setRewards([]);
        }
        // Set real referral stats
        if (data && data.referralStats) {
          setReferralStats(data.referralStats);
        } else {
          setReferralStats({
            directPartners: 0,
            downlinePartners: 0,
            totalPartners: 0,
            totalCommissions: 0,
            referrals: [],
          });
        }
      })
      .catch((err) => {
        console.warn('[App] Backend DB sync note:', err);
        setNodes([]);
        setRewards([]);
        setWalletBalance(0);
        setDailyEarnings(0);
      });
  }, [walletAddress]);

  // Modals
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [isTestnetModalOpen, setIsTestnetModalOpen] = useState(false);

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

  // Testnet & QA Controls
  const handleTopUpUsdt = (amt: number) => {
    setWalletBalance((prev) => +(prev + amt).toFixed(2));
    if (walletAddress) {
      fetch('/api/faucet/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: walletAddress, amount: amt }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data && data.user && typeof data.user.balanceUsdt === 'number') {
            setWalletBalance(data.user.balanceUsdt);
          }
          if (data && data.transaction) {
            const mappedTx: RewardTransaction = {
              id: data.transaction.id,
              txHash: data.transaction.txHash,
              rewardSource: data.transaction.details || 'Testnet Faucet USDT Grant',
              amount: data.transaction.amount,
              currency: data.transaction.currency || 'USDT',
              timestamp: 'Just now',
              status: 'Confirmed',
            };
            setRewards((prev) => [mappedTx, ...prev]);
          }
        })
        .catch(() => {});
    }
    addToast('Faucet Claimed', `+${amt.toFixed(2)} Test USDT credited for testing.`, 'success');
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
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            temperature: 58,
            logs: [
              `[${new Date().toLocaleTimeString()}] Cold restart initialized by operator`,
              `[${new Date().toLocaleTimeString()}] Re-syncing Stratum difficulty with BSC node...`,
              ...n.logs.slice(0, 3),
            ],
          };
        }
        return n;
      })
    );
    fetch(`/api/nodes/${nodeId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restart', userAddress: walletAddress }),
    }).catch(() => {});
    addToast('Node Restarted', `${nodeId} rebooted and re-syncing with BSC validator.`, 'info');
  };

  const handleStopNode = (nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, status: 'idle' as const, temperature: 45 } : n))
    );
    fetch(`/api/nodes/${nodeId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop', userAddress: walletAddress }),
    }).catch(() => {});
    addToast('Node Paused', `${nodeId} transitioned to Idle / Power-save mode.`, 'warning');
  };

  const handleStartNode = (nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, status: 'mining' as const, temperature: 63 } : n))
    );
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

    // Dynamically recalculate daily yield from all active rigs
    const activeMining = updatedNodes.filter((n) => n.status === 'mining');
    const calculatedYield = activeMining.reduce((acc, n) => acc + (n.hashrate * 39), 0);
    setDailyEarnings(+calculatedYield.toFixed(2));

    const randomTxHash = `0x${Array.from({ length: 4 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}...${Array.from({ length: 4 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`;

    const newTx: RewardTransaction = {
      id: `tx-node-${Date.now()}`,
      txHash: randomTxHash,
      rewardSource: `Node Activation Fee (${newNode.name})`,
      amount: -costUsdt,
      currency: 'USDT',
      timestamp: 'Just now',
      status: 'Confirmed',
    };
    setRewards((prev) => [newTx, ...prev]);

    // Save to persistent backend database
    fetch('/api/nodes/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAddress: walletAddress,
        name: newNode.name,
        region: newNode.region,
        hashrate: newNode.hashrate,
        costUsdt,
      }),
    }).catch((err) => console.warn('[App] Deploy API error:', err));

    addToast(
      'Rig Deployed & Activated',
      `-${costUsdt} USDT deducted. ${newNode.name} is now hashing on BSC validator network! Generating +${(newNode.hashrate * 39).toFixed(2)} USDT/day.`,
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
    if (fromToken === 'SPIKE') {
      setWalletBalance((prev) => Math.max(0, +(prev - fromAmount).toFixed(2)));
    } else if (toToken === 'SPIKE') {
      setWalletBalance((prev) => +(prev + toAmount).toFixed(2));
    }
    if (fromToken === 'BNB') {
      setWalletBNB((prev) => Math.max(0, +(prev - fromAmount).toFixed(4)));
    } else if (toToken === 'BNB') {
      setWalletBNB((prev) => +(prev + toAmount).toFixed(4));
    }
    addToast(
      'Swap Executed Successfully',
      `Swapped ${fromAmount} ${fromToken} for ${toAmount.toFixed(4)} ${toToken} on BSC!`,
      'success'
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
      const data = await res.json();
      if (data && data.success) {
        setReferralStats(data.stats);
        if (typeof data.commissionAdded === 'number') {
          setWalletBalance((prev) => +(prev + data.commissionAdded).toFixed(2));
          const newTx: RewardTransaction = {
            id: `tx-ref-${Date.now()}`,
            txHash: `0x${Array.from({ length: 4 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}...${Array.from({ length: 4 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
            rewardSource: `Direct Referral Commission (${data.referral?.refereeAddress?.slice(0, 6)}...)`,
            amount: data.commissionAdded,
            currency: 'USDT',
            timestamp: 'Just now',
            status: 'Confirmed',
          };
          setRewards((prev) => [newTx, ...prev]);
        }
        addToast('Referral Joined!', `+1 Partner joined via your link! +${data.commissionAdded} USDT commission added.`, 'success');
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

  const handleConnectWallet = (provider: string, realAddress?: string) => {
    let finalAddress = realAddress;
    if (!finalAddress) {
      const chars = '0123456789abcdef';
      let addr = '0x';
      for (let i = 0; i < 40; i++) {
        addr += chars[Math.floor(Math.random() * chars.length)];
      }
      finalAddress = addr;
    }

    // Immediately reset in-memory data to pure 0-slate before loading new wallet state
    setNodes([]);
    setRewards([]);
    setWalletBalance(0);
    setWalletBNB(0.005);
    setDailyEarnings(0);
    setReferralStats({
      directPartners: 0,
      downlinePartners: 0,
      totalPartners: 0,
      totalCommissions: 0,
      referrals: [],
    });

    setIsWalletConnected(true);
    setWalletAddress(finalAddress);
    setActiveTab('dashboard');
    try {
      localStorage.setItem('spike_wallet_connected', 'true');
      localStorage.setItem('spike_wallet_address', finalAddress);
      localStorage.setItem('spike_active_tab', 'dashboard');
    } catch {}
    addToast(
      'Wallet Authenticated',
      `Logged in via ${provider} (${finalAddress.slice(0, 6)}...${finalAddress.slice(-4)}). Initialized personal dashboard!`,
      'success'
    );
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
    if (!isWalletConnected && activeTab !== 'home' && activeTab !== 'announcements' && activeTab !== 'admin') {
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
            onOpenSwapModal={() => setIsSwapModalOpen(true)}
            onSwapSuccess={handleSwapSuccess}
            onCopyText={copyToClipboard}
            walletAddress={walletAddress}
            onNavigateToReferrals={() => handleTabChange('referrals')}
            onClaimReferralBonus={(amt) => {
              setWalletBalance((prev) => prev + amt);
              addToast('Commission Claimed', `+${amt.toFixed(2)} USDT added to balance.`, 'success');
            }}
          />
        );
        break;
      case 'mining-nodes':
        currentComponent = (
          <MiningNodesView
            nodes={nodes}
            onRestartNode={handleRestartNode}
            onStopNode={handleStopNode}
            onStartNode={handleStartNode}
            onOpenDeployModal={() => setIsDeployModalOpen(true)}
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
            onCopyText={copyToClipboard}
            onClaimReferralRewards={handleClaimReferralMilestone}
            referralStats={referralStats}
            onSimulateReferral={handleSimulateReferralJoin}
          />
        );
        break;
      case 'announcements':
        currentComponent = (
          <AnnouncementsView
            onCopyText={copyToClipboard}
            onNavigateHome={(tab) => handleTabChange(tab as TabType)}
          />
        );
        break;
      case 'admin':
        currentComponent = (
          <AdminView
            onNotify={addToast}
            onNavigateTab={handleTabChange}
            isAdmin={isAdmin}
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
      <div className="min-h-screen bg-[#010f1e] flex flex-col items-center justify-start p-4 py-8 select-none">
        {/* View Mode Bar */}
        <div className="mb-4 flex items-center gap-3 bg-[#0d1d2c] border border-[#1c2b3b] px-4 py-2 rounded-xl text-xs">
          <span className="text-[#c6c6cc]">Device Viewport:</span>
          <button
            onClick={() => setViewMode('auto')}
            className="px-2.5 py-1 rounded bg-[#1c2b3b] text-[#c6c6cc] hover:text-white"
          >
            Auto Responsive
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            className="px-2.5 py-1 rounded bg-[#00F0FF] text-[#0A0F1D] font-bold"
          >
            Mobile Simulator
          </button>
          <button
            onClick={() => setViewMode('desktop')}
            className="px-2.5 py-1 rounded bg-[#1c2b3b] text-[#c6c6cc] hover:text-white"
          >
            Desktop Wide
          </button>
        </div>

        {/* Mobile Device Frame */}
        <div className="w-[390px] max-w-full h-[844px] bg-[#051424] rounded-[44px] border-[10px] border-[#1c2b3b] shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_30px_rgba(0,240,255,0.15)] flex flex-col overflow-hidden relative">
          {/* Dynamic Island / Speaker Notch */}
          <div className="w-full h-8 bg-[#051424] flex items-center justify-between px-7 shrink-0 z-50 pt-1 text-[11px] font-mono text-[#c6c6cc]">
            <span>9:41</span>
            <div className="w-20 h-4 bg-black rounded-full" />
            <div className="flex items-center gap-1.5 text-[12px]">
              <span className="material-symbols-outlined text-[13px]">wifi</span>
              <span className="material-symbols-outlined text-[13px]">battery_full</span>
            </div>
          </div>

          {/* Embedded Mobile Header */}
          <div className="shrink-0">
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
              onNavigateHomeSection={handleNavigateHomeSection}
              onDisconnectWallet={handleDisconnectWallet}
              isAdmin={isAdmin}
            />
          </div>

          {/* Scrollable Viewport Content */}
          <div className="flex-1 overflow-y-auto pt-16 px-4 pb-20">
            {renderCurrentView()}
          </div>

          {/* Fixed Mobile Bottom Bar */}
          <MobileBottomNav
            activeTab={activeTab}
            onTabChange={handleTabChange}
            nodeCount={nodes.length}
            isWalletConnected={isWalletConnected}
            onOpenLogin={() => setIsConnectModalOpen(true)}
            onNavigateHomeSection={handleNavigateHomeSection}
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
                  className="px-3 py-1 rounded-lg bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#D4AF37] border border-[#D4AF37]/40 font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">shield_person</span>
                  <span>Check Admin Panel →</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Viewport */}
        <main className={`flex-1 ${activeTab === 'admin' ? 'pt-20 md:pt-24' : 'pt-4 md:pt-6'} px-4 sm:px-6 md:px-8 ${activeTab === 'home' ? 'max-w-7xl mx-auto w-full' : 'max-w-7xl w-full mx-auto'} pb-20 md:pb-12`}>
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
      </Suspense>

      {/* Toast Notification Container */}
      <Toast toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
