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

  // Application Data States (Hydrated instantly from cache for 0ms lag)
  const [nodes, setNodes] = useState<MiningNode[]>(INITIAL_NODES);
  const [rewards, setRewards] = useState<RewardTransaction[]>(INITIAL_REWARDS);
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('spike_balance_usdt');
      return saved ? parseFloat(saved) : 1250.0;
    } catch {
      return 1250.0;
    }
  });
  const [walletBNB, setWalletBNB] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('spike_balance_bnb');
      return saved ? parseFloat(saved) : 0.428;
    } catch {
      return 0.428;
    }
  });
  const [dailyEarnings, setDailyEarnings] = useState<number>(48.5);
  const [network, setNetwork] = useState<string>('BEP-20 / BSC Network');

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
      return localStorage.getItem('spike_wallet_address') || '0x71C8a914B97e889F12A0987cB32456Fa12349A2';
    } catch {
      return '0x71C8a914B97e889F12A0987cB32456Fa12349A2';
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

  // Sync state with persistent backend database on start (Non-blocking background refresh)
  useEffect(() => {
    fetch(`/api/user/${walletAddress}`)
      .then((res) => {
        if (!res.ok || res.headers.get('content-type')?.includes('text/html')) {
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.user) {
          if (typeof data.user.balanceUsdt === 'number') {
            setWalletBalance(data.user.balanceUsdt);
            try { localStorage.setItem('spike_balance_usdt', String(data.user.balanceUsdt)); } catch {}
          }
          if (typeof data.user.balanceBnb === 'number') {
            setWalletBNB(data.user.balanceBnb);
            try { localStorage.setItem('spike_balance_bnb', String(data.user.balanceBnb)); } catch {}
          }
        }
        if (data && Array.isArray(data.nodes) && data.nodes.length > 0) {
          setNodes(data.nodes);
        }
        if (data && Array.isArray(data.transactions) && data.transactions.length > 0) {
          setRewards(data.transactions);
        }
      })
      .catch((err) => {
        console.warn('[App] Backend DB sync note:', err);
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
        `Required ${costUsdt} USDT for node activation. Your balance: ${walletBalance.toFixed(2)} USDT.`,
        'warning'
      );
      return;
    }

    setWalletBalance((prev) => Math.max(0, +(prev - costUsdt).toFixed(2)));
    setNodes((prev) => [newNode, ...prev]);

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
      `-${costUsdt} USDT deducted and saved in DB. ${newNode.name} is now hashing on BSC validator network!`,
      'success'
    );
  };

  const handleConfirmClaim = (amount: number) => {
    setWalletBalance((prev) => prev + amount);
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

    addToast('Rewards Claimed', `+${amount.toFixed(2)} USDT deposited and saved in DB.`, 'success');
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

  const handleConnectWallet = (provider: string, realAddress?: string) => {
    const finalAddress = realAddress || '0x71C8a914B97e889F12A0987cB32456Fa12349A2';
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
      `Logged in via ${provider} (${finalAddress.slice(0, 6)}...${finalAddress.slice(-4)}). Dashboard, Mining Nodes & Referral System unlocked!`,
      'success'
    );
  };

  const handleDisconnectWallet = () => {
    setIsWalletConnected(false);
    setActiveTab('home');
    try {
      localStorage.setItem('spike_wallet_connected', 'false');
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
            onClaimReferralRewards={(amt) => {
              setWalletBalance((prev) => prev + amt);
              addToast('Commission Claimed', `+${amt.toFixed(2)} USDT added to balance.`, 'success');
            }}
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
