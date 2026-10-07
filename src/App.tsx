/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TabType, MiningNode, RewardTransaction, ToastMessage } from './types';
import { INITIAL_NODES, INITIAL_REWARDS } from './data/mockData';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { HomeView } from './components/views/HomeView';
import { DashboardView } from './components/views/DashboardView';
import { MiningNodesView } from './components/views/MiningNodesView';
import { ReferralsView } from './components/views/ReferralsView';
import { AnnouncementsView } from './components/views/AnnouncementsView';
import { AdminView } from './components/views/AdminView';
import { ConnectWalletModal } from './components/modals/ConnectWalletModal';
import { DeployNodeModal } from './components/modals/DeployNodeModal';
import { ClaimRewardsModal } from './components/modals/ClaimRewardsModal';
import { AuditModal } from './components/modals/AuditModal';
import { SwapModal } from './components/modals/SwapModal';
import { TestnetTestingModal } from './components/modals/TestnetTestingModal';
import { Toast } from './components/Toast';
import { BlockchainBackground } from './components/BlockchainBackground';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [viewMode, setViewMode] = useState<'auto' | 'mobile' | 'desktop'>('auto');

  // Application Data States
  const [nodes, setNodes] = useState<MiningNode[]>(INITIAL_NODES);
  const [rewards, setRewards] = useState<RewardTransaction[]>(INITIAL_REWARDS);
  const [walletBalance, setWalletBalance] = useState<number>(1250.0);
  const [walletBNB, setWalletBNB] = useState<number>(0.428);
  const [dailyEarnings, setDailyEarnings] = useState<number>(48.5);
  const [network, setNetwork] = useState<string>('BEP-20 / BSC Network');

  // Wallet Auth State - Initially false so options appear AFTER login panel
  const [isWalletConnected, setIsWalletConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string>(
    '0x71C8a914B97e889F12A0987cB32456Fa12349A2'
  );

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

  // Sync state with persistent backend database on start
  useEffect(() => {
    fetch(`/api/user/${walletAddress}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.user) {
          if (typeof data.user.balanceUsdt === 'number') setWalletBalance(data.user.balanceUsdt);
          if (typeof data.user.balanceBnb === 'number') setWalletBNB(data.user.balanceBnb);
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
    addToast(
      'Wallet Authenticated',
      `Logged in via ${provider} (${finalAddress.slice(0, 6)}...${finalAddress.slice(-4)}). Dashboard, Mining Nodes & Referral System unlocked!`,
      'success'
    );
  };

  const handleDisconnectWallet = () => {
    setIsWalletConnected(false);
    setActiveTab('home');
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

    switch (activeTab) {
      case 'home':
        return (
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
      case 'dashboard':
        return (
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
      case 'mining-nodes':
        return (
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
      case 'referrals':
        return (
          <ReferralsView
            walletAddress={walletAddress}
            onCopyText={copyToClipboard}
            onClaimReferralRewards={(amt) => {
              setWalletBalance((prev) => prev + amt);
              addToast('Commission Claimed', `+${amt.toFixed(2)} USDT added to balance.`, 'success');
            }}
          />
        );
      case 'announcements':
        return (
          <AnnouncementsView
            onCopyText={copyToClipboard}
            onNavigateHome={(tab) => handleTabChange(tab as TabType)}
          />
        );
      case 'admin':
        return (
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
      default:
        return null;
    }
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

        {/* Modals and Toasts inside Mobile View */}
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
        <DeployNodeModal
          isOpen={isDeployModalOpen}
          onClose={() => setIsDeployModalOpen(false)}
          onDeploy={handleDeployNode}
          existingCount={nodes.length}
        />
        <ClaimRewardsModal
          isOpen={isClaimModalOpen}
          onClose={() => setIsClaimModalOpen(false)}
          claimableUSDT={dailyEarnings}
          walletAddress={walletAddress}
          onConfirmClaim={handleConfirmClaim}
        />
        <AuditModal
          isOpen={isAuditModalOpen}
          onClose={() => setIsAuditModalOpen(false)}
        />
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
        <SwapModal
          isOpen={isSwapModalOpen}
          onClose={() => setIsSwapModalOpen(false)}
          spikeBalance={walletBalance}
          bnbBalance={walletBNB}
          onSwapSuccess={handleSwapSuccess}
        />
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

      {/* Modals & Dialogs */}
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

      <DeployNodeModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
        onDeploy={handleDeployNode}
        existingCount={nodes.length}
      />

      <ClaimRewardsModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        claimableUSDT={dailyEarnings}
        walletAddress={walletAddress}
        onConfirmClaim={handleConfirmClaim}
      />

      <AuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />

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

      <SwapModal
        isOpen={isSwapModalOpen}
        onClose={() => setIsSwapModalOpen(false)}
        spikeBalance={walletBalance}
        bnbBalance={walletBNB}
        onSwapSuccess={handleSwapSuccess}
      />

      {/* Toast Notification Container */}
      <Toast toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
