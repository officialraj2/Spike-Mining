import React, { useState } from 'react';
import { SPIKE_LOGO_URL } from '../data/mockData';
import { TabType } from '../types';

interface HeaderProps {
  onConnectWalletClick: () => void;
  isWalletConnected: boolean;
  walletAddress: string;
  walletBalance: number;
  network: string;
  onNetworkChange: (network: string) => void;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  viewMode: 'auto' | 'mobile' | 'desktop';
  onViewModeChange: (mode: 'auto' | 'mobile' | 'desktop') => void;
  onOpenAuditModal: () => void;
  onOpenTestnetModal?: () => void;
  onOpenSwapModal?: () => void;
  onNavigateHomeSection?: (sectionId: string) => void;
  onDisconnectWallet?: () => void;
  isAdmin?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onConnectWalletClick,
  isWalletConnected,
  walletAddress,
  walletBalance,
  network,
  onNetworkChange,
  activeTab,
  onTabChange,
  viewMode,
  onViewModeChange,
  onOpenAuditModal,
  onOpenTestnetModal,
  onOpenSwapModal,
  onNavigateHomeSection,
  onDisconnectWallet,
  isAdmin = false,
}) => {
  const [showNetworkMenu, setShowNetworkMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [activeSection, setActiveSection] = useState<'hero' | 'features' | 'calculator' | 'security'>('hero');

  const networks = [
    { id: 'BEP-20 / BSC Network', name: 'BNB Smart Chain (BEP-20)', speed: '3.0s', active: true },
    { id: 'BSC Testnet', name: 'BSC Testnet Chapel', speed: '3.0s', active: false },
    { id: 'Arbitrum One', name: 'Arbitrum One', speed: '0.25s', active: false },
    { id: 'Ethereum Mainnet', name: 'Ethereum Mainnet', speed: '12.0s', active: false },
  ];

  const handleHomeSectionClick = (secId: 'hero' | 'features' | 'calculator' | 'security') => {
    setActiveSection(secId);
    if (activeTab !== 'home') {
      onTabChange('home');
      setTimeout(() => {
        onNavigateHomeSection?.(secId);
      }, 50);
    } else {
      onNavigateHomeSection?.(secId);
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 ${
          isWalletConnected && activeTab !== 'home' ? 'left-0 md:left-64' : 'left-0'
        } right-0 h-16 md:h-20 bg-[#051424]/95 backdrop-blur-xl shadow-[0_1px_20px_rgba(0,0,0,0.5)] z-40 flex items-center justify-between px-3 sm:px-6 md:px-8 border-b border-[#1c2b3b]/80 transition-all duration-200`}
      >
        {/* Left Side: Logo Branding & Chain Pill */}
        <div className="flex items-center gap-3">
          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setShowMobileDrawer(true)}
            className="md:hidden p-2 rounded-xl bg-[#122130] text-[#94a3b8] hover:text-[#00F0FF] focus:outline-none border border-[#1c2b3b]"
            aria-label="Open Navigation Menu"
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
          </button>

          {/* Logo Branding */}
          <div
            className="flex items-center gap-2.5 cursor-pointer group select-none"
            onClick={() => onTabChange('home')}
            title="SPIKE Mining Protocol"
          >
            <div className="relative">
              <img
                src={SPIKE_LOGO_URL}
                alt="SPIKE Logo"
                className="h-8 w-8 md:h-10 md:w-10 object-contain drop-shadow-[0_0_14px_rgba(212,175,55,0.45)] group-hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#051424]"></span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl md:text-2xl font-extrabold font-headline text-[#D4AF37] tracking-[0.14em] drop-shadow-[0_2px_8px_rgba(212,175,55,0.25)] leading-tight">
                SPIKE
              </span>
            </div>
          </div>

          {/* Network Selector Pill */}
          <div className="relative hidden xl:block ml-2">
            <button
              onClick={() => setShowNetworkMenu(!showNetworkMenu)}
              className="flex items-center gap-2 bg-[#122130] hover:bg-[#1c2b3b] border border-[#00F0FF]/30 px-3 py-1.5 rounded-full text-xs text-[#00F0FF] transition-colors focus:outline-none shadow-sm"
              title="Switch Network"
            >
              <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse"></span>
              <span className="font-mono font-medium tracking-tight">{network}</span>
              <span className="material-symbols-outlined text-[16px] text-[#94a3b8]">expand_more</span>
            </button>

            {showNetworkMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowNetworkMenu(false)}
                />
                <div className="absolute left-0 mt-2 w-64 bg-[#0d1d2c] border border-[#1c2b3b] rounded-xl shadow-2xl py-2 z-20">
                  <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-[0.14em] text-[#94a3b8] border-b border-[#1c2b3b] mb-1 font-semibold">
                    Select Validator Chain
                  </div>
                  {networks.map((net) => (
                    <button
                      key={net.id}
                      onClick={() => {
                        onNetworkChange(net.id);
                        setShowNetworkMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#1c2b3b] transition-colors ${
                        network === net.id ? 'text-[#00F0FF] font-semibold bg-[#122130]' : 'text-[#94a3b8]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            network === net.id ? 'bg-[#00F0FF]' : 'bg-[#94a3b8]/40'
                          }`}
                        />
                        <span className="font-medium tracking-normal">{net.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#94a3b8]/70 tabular-nums">{net.speed}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Dedicated Web3 Testnet Faucet & QA Studio Button */}
          {onOpenTestnetModal && (
            <button
              onClick={onOpenTestnetModal}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#122130] hover:bg-[#1c2b3b] border border-[#D4AF37]/50 text-[#D4AF37] hover:text-[#ffe088] text-xs font-headline font-bold transition-all shadow-sm hover:scale-102 shrink-0"
              title="Open Web3 Testnet Faucet & Records Verification Studio"
            >
              <span className="material-symbols-outlined text-[15px] text-[#00F0FF]">science</span>
              <span className="hidden sm:inline">Testnet Faucet &amp; QA</span>
              <span className="sm:hidden">QA Test</span>
            </button>
          )}

          {/* Admin Panel Direct Navigation Button (Shown ONLY to Admin) */}
          {isAdmin && (
            <button
              onClick={() => onTabChange('admin')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-headline font-bold transition-all shadow-sm hover:scale-102 shrink-0 ${
                activeTab === 'admin'
                  ? 'bg-[#D4AF37] text-[#0A0F1D] border border-[#ffe088] shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                  : 'bg-[#122130] hover:bg-[#1c2b3b] border border-[#00F0FF]/50 text-[#00F0FF] hover:text-white'
              }`}
              title="Open Core Backend Admin Panel & Database Console (?tab=admin)"
            >
              <span className="material-symbols-outlined text-[15px]">shield_person</span>
              <span className="hidden sm:inline">Admin Panel</span>
              <span className="sm:hidden">Admin</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </button>
          )}
        </div>

        {/* ===============================================================
            CENTER NAVIGATION:
            1. If Not Logged In OR on Home Page: Shows the 4 Home Menu items!
            2. If Logged In AND inside the App: Shows Dashboard, Mining, Staking, Referrals!
           =============================================================== */}
        <nav className="hidden lg:flex items-center gap-1 bg-[#0d1d2c]/90 px-1.5 py-1 rounded-2xl border border-[#1c2b3b] shadow-inner shrink-0">
          {!isWalletConnected ? (
            /* 4 Home Menu Items for Public Visitors */
            <>
              <button
                onClick={() => handleHomeSectionClick('hero')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-headline font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'home' && activeSection === 'hero'
                    ? 'bg-[#1c2b3b] text-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.25)] border border-[#00F0FF]/30'
                    : 'text-[#94a3b8] hover:text-white hover:bg-[#122130]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">home</span>
                <span>Home</span>
              </button>

              <button
                onClick={() => handleHomeSectionClick('features')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-headline font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'home' && activeSection === 'features'
                    ? 'bg-[#1c2b3b] text-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.25)] border border-[#00F0FF]/30'
                    : 'text-[#94a3b8] hover:text-white hover:bg-[#122130]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">bolt</span>
                <span>Features</span>
              </button>

              <button
                onClick={() => handleHomeSectionClick('calculator')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-headline font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'home' && activeSection === 'calculator'
                    ? 'bg-[#1c2b3b] text-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.25)] border border-[#00F0FF]/30'
                    : 'text-[#94a3b8] hover:text-white hover:bg-[#122130]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">calculate</span>
                <span>Tokenomics &amp; Yield</span>
              </button>

              <button
                onClick={() => handleHomeSectionClick('security')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-headline font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'home' && activeSection === 'security'
                    ? 'bg-[#1c2b3b] text-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.25)] border border-[#00F0FF]/30'
                    : 'text-[#94a3b8] hover:text-white hover:bg-[#122130]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">verified_user</span>
                <span>Security &amp; Audit</span>
              </button>

              <button
                onClick={() => onTabChange('announcements')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-headline font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'announcements'
                    ? 'bg-[#1c2b3b] text-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.25)] border border-[#00F0FF]/30'
                    : 'text-[#D4AF37] hover:text-[#ffe088] hover:bg-[#122130]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">campaign</span>
                <span>Announcements</span>
                <span className="px-1.5 py-0.2 text-[9px] font-mono bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 rounded font-bold animate-pulse">
                  HOT
                </span>
              </button>
            </>
          ) : (
            /* Logged-In Application Menu: Dashboard, Mining, Referral system, Staking, Announcements (Home navigation removed) */
            <>
              {[
                { id: 'dashboard' as TabType, label: 'Dashboard', icon: 'dashboard' },
                { id: 'mining-nodes' as TabType, label: 'Mining Nodes', icon: 'dns' },
                { id: 'referrals' as TabType, label: 'Referral system', icon: 'groups' },
                { id: 'announcements' as TabType, label: 'CEX Listings', icon: 'campaign', hot: true },
              ].map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-headline font-semibold flex items-center gap-1.5 transition-all ${
                      isActive
                        ? 'bg-[#1c2b3b] text-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.25)] border border-[#00F0FF]/30'
                        : 'text-[#94a3b8] hover:text-white hover:bg-[#122130]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                    <span>{item.label}</span>
                    {item.hot && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-ping" />
                    )}
                  </button>
                );
              })}
            </>
          )}
        </nav>

        {/* Right Side: Viewport Switcher & Single Prominent DEX Swap + Connect Wallet */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Responsive / Device Switcher */}
          <div className="hidden xl:flex items-center bg-[#0d1d2c] p-1 rounded-xl border border-[#1c2b3b]">
            <button
              onClick={() => onViewModeChange('auto')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-headline tracking-wide uppercase transition-colors ${
                viewMode === 'auto'
                  ? 'bg-[#1c2b3b] text-[#00F0FF] font-bold shadow-sm'
                  : 'text-[#94a3b8] hover:text-white font-medium'
              }`}
              title="Responsive Viewport"
            >
              Auto
            </button>
            <button
              onClick={() => onViewModeChange('desktop')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-headline tracking-wide uppercase transition-colors ${
                viewMode === 'desktop'
                  ? 'bg-[#1c2b3b] text-[#00F0FF] font-bold shadow-sm'
                  : 'text-[#94a3b8] hover:text-white font-medium'
              }`}
              title="Desktop Mode"
            >
              Desktop
            </button>
            <button
              onClick={() => onViewModeChange('mobile')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-headline tracking-wide uppercase flex items-center gap-1 transition-colors ${
                viewMode === 'mobile'
                  ? 'bg-[#00F0FF] text-[#0A0F1D] font-bold shadow-sm'
                  : 'text-[#94a3b8] hover:text-white font-medium'
              }`}
              title="Mobile Simulator"
            >
              <span className="material-symbols-outlined text-[13px]">smartphone</span>
              Mobile
            </button>
          </div>

          {/* ==========================================================
              CONNECT WALLET BUTTON (PROMINENT AT TOP / HOME MENU)
             ========================================================== */}
          {!isWalletConnected ? (
            <button
              onClick={onConnectWalletClick}
              className="relative group px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#00F0FF] via-[#38e8f8] to-[#D4AF37] text-[#0A0F1D] font-headline font-extrabold text-xs sm:text-sm shadow-[0_0_24px_rgba(0,240,255,0.45)] hover:shadow-[0_0_35px_rgba(0,240,255,0.7)] transition-all duration-200 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              title="Connect Web3 Wallet (BEP-20) to Log In"
            >
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
              <span className="tracking-wide">Connect Wallet</span>
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 bg-[#122130] hover:bg-[#1c2b3b] border border-[#00F0FF]/40 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs transition-colors shadow-md group"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <div className="flex flex-col text-left">
                  <span className="font-mono text-white font-bold text-xs">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </span>
                  <span className="font-mono text-[10px] text-[#00F0FF] tabular-nums font-semibold">
                    {walletBalance.toFixed(2)} USDT
                  </span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-[#94a3b8] group-hover:text-white transition-colors">
                  expand_more
                </span>
              </button>

              {/* User / Wallet Dropdown */}
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 mt-2 w-64 bg-[#0d1d2c] border border-[#1c2b3b] rounded-2xl shadow-2xl p-3 z-20 space-y-2">
                    <div className="p-2.5 rounded-xl bg-[#0a0f1d] border border-[#1c2b3b]/60 space-y-1">
                      <div className="text-[10px] text-[#94a3b8] font-mono uppercase tracking-wider">Connected Account</div>
                      <div className="text-xs font-mono text-white font-bold break-all">{walletAddress}</div>
                      <div className="text-xs text-[#00F0FF] font-mono font-semibold pt-1 flex justify-between">
                        <span>Balance:</span>
                        <span>{walletBalance.toFixed(2)} USDT</span>
                      </div>
                    </div>

                    <div className="space-y-1 pt-1 border-t border-[#1c2b3b]/60">
                      <button
                        onClick={() => {
                          onTabChange('dashboard');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#d4e4fa] hover:bg-[#1c2b3b] flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[16px] text-[#00F0FF]">dashboard</span>
                        <span>Open Dashboard</span>
                      </button>
                      <button
                        onClick={() => {
                          onTabChange('mining-nodes');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#d4e4fa] hover:bg-[#1c2b3b] flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[16px] text-[#00F0FF]">dns</span>
                        <span>Manage Mining Nodes</span>
                      </button>
                      <button
                        onClick={() => {
                          onTabChange('referrals');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#d4e4fa] hover:bg-[#1c2b3b] flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[16px] text-[#D4AF37]">groups</span>
                        <span>Referral system</span>
                      </button>
                      {onOpenTestnetModal && (
                        <button
                          onClick={() => {
                            onOpenTestnetModal();
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#00F0FF] hover:bg-[#1c2b3b] flex items-center gap-2 font-semibold"
                        >
                          <span className="material-symbols-outlined text-[16px]">science</span>
                          <span>Testnet Faucet &amp; QA Studio</span>
                        </button>
                      )}
                    </div>

                    <div className="pt-1 border-t border-[#1c2b3b]/60">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onDisconnectWallet?.();
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 font-semibold"
                      >
                        <span className="material-symbols-outlined text-[16px]">logout</span>
                        <span>Disconnect / Log Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Mobile Slide-Over Drawer */}
      {showMobileDrawer && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setShowMobileDrawer(false)}
          />
          <div className="relative w-80 max-w-[85%] bg-[#0d1d2c] h-full shadow-2xl flex flex-col pt-6 pb-6 px-4 z-10 border-r border-[#1c2b3b]">
            <div className="flex items-center justify-between pb-4 border-b border-[#1c2b3b] mb-4">
              <div className="flex items-center gap-2.5">
                <img
                  src={SPIKE_LOGO_URL}
                  alt="SPIKE"
                  className="h-8 w-8 object-contain"
                  referrerPolicy="no-referrer"
                />
                <span className="text-xl font-extrabold font-headline text-[#D4AF37] tracking-wider">SPIKE</span>
              </div>
              <button
                onClick={() => setShowMobileDrawer(false)}
                className="p-1.5 rounded-lg text-[#94a3b8] hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Mobile Nav Links */}
            <div className="space-y-1.5 flex-1 overflow-y-auto">
              {!isWalletConnected ? (
                /* ============================================================
                   PUBLIC HOME NAVIGATION (Shown ONLY when Wallet is NOT Connected)
                   ============================================================ */
                <>
                  <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#94a3b8] px-3 pt-1 font-semibold">
                    Home Navigation
                  </div>
                  <button
                    onClick={() => {
                      handleHomeSectionClick('hero');
                      setShowMobileDrawer(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#d4e4fa] hover:bg-[#122130]"
                  >
                    <span className="material-symbols-outlined text-[18px] text-[#00F0FF]">home</span>
                    <span>Home Overview</span>
                  </button>
                  <button
                    onClick={() => {
                      handleHomeSectionClick('features');
                      setShowMobileDrawer(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#d4e4fa] hover:bg-[#122130]"
                  >
                    <span className="material-symbols-outlined text-[18px] text-[#00F0FF]">bolt</span>
                    <span>Protocol Features</span>
                  </button>
                  <button
                    onClick={() => {
                      handleHomeSectionClick('calculator');
                      setShowMobileDrawer(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#d4e4fa] hover:bg-[#122130]"
                  >
                    <span className="material-symbols-outlined text-[18px] text-[#00F0FF]">calculate</span>
                    <span>Tokenomics &amp; Yield</span>
                  </button>
                  <button
                    onClick={() => {
                      handleHomeSectionClick('security');
                      setShowMobileDrawer(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#d4e4fa] hover:bg-[#122130]"
                  >
                    <span className="material-symbols-outlined text-[18px] text-[#00F0FF]">verified_user</span>
                    <span>Security &amp; Audit</span>
                  </button>

                  <button
                    onClick={() => {
                      onTabChange('announcements');
                      setShowMobileDrawer(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold text-[#D4AF37] hover:bg-[#122130]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[18px] text-[#D4AF37]">campaign</span>
                      <span>CEX Announcements</span>
                    </div>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 font-bold">
                      HOT
                    </span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        onTabChange('admin');
                        setShowMobileDrawer(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold text-[#00F0FF] bg-[#122130] hover:bg-[#1c2b3b] border border-[#00F0FF]/30 mt-1"
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[18px] text-[#00F0FF]">shield_person</span>
                        <span>Admin Panel &amp; Database</span>
                      </div>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 font-bold">
                        ROOT
                      </span>
                    </button>
                  )}

                  {/* Connect Wallet prompt in mobile drawer */}
                  <div className="pt-3 border-t border-[#1c2b3b]/60">
                    <div className="p-3 rounded-xl bg-[#0a0f1d] border border-[#1c2b3b] space-y-2 mt-1">
                      <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                        Connect your BEP-20 Web3 wallet to access Mining Nodes, Dashboard &amp; Referral System.
                      </p>
                      <button
                        onClick={() => {
                          setShowMobileDrawer(false);
                          onConnectWalletClick();
                        }}
                        className="w-full py-2.5 px-3 rounded-xl bg-[#00F0FF] text-[#0A0F1D] font-headline font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                        <span>Connect Wallet / Log In</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* ============================================================
                   AUTHENTICATED USER APP MODULES (Home Navigation is REMOVED!)
                   ============================================================ */
                <>
                  <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#00F0FF] px-3 pt-1 font-bold flex items-center justify-between">
                    <span>Protocol Navigation</span>
                    <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Connected
                    </span>
                  </div>

                  {[
                    { id: 'dashboard' as TabType, label: 'Dashboard', icon: 'dashboard' },
                    { id: 'mining-nodes' as TabType, label: 'Mining Nodes', icon: 'dns' },
                    { id: 'referrals' as TabType, label: 'Referral system', icon: 'groups', badge: 'REWARDS' },
                    { id: 'announcements' as TabType, label: 'CEX Announcements', icon: 'campaign', hot: true },
                    ...(isAdmin ? [{ id: 'admin' as TabType, label: 'Admin Panel & DB', icon: 'shield_person', badge: 'ROOT' }] : []),
                  ].map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onTabChange(item.id);
                          setShowMobileDrawer(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-[#1c2b3b] text-[#00F0FF] border border-[#00F0FF]/30 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                            : 'text-[#d4e4fa] hover:bg-[#122130]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="material-symbols-outlined text-[18px]"
                            style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                          >
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40">
                            {item.badge}
                          </span>
                        )}
                        {item.hot && !item.badge && (
                          <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-ping" />
                        )}
                      </button>
                    );
                  })}

                  {onOpenTestnetModal && (
                    <button
                      onClick={() => {
                        onOpenTestnetModal();
                        setShowMobileDrawer(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#122130] hover:bg-[#1c2b3b] text-[#00F0FF] border border-[#00F0FF]/30 mt-2 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[18px]">science</span>
                        <span>Testnet Faucet &amp; QA Studio</span>
                      </div>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 font-bold">
                        DEV
                      </span>
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Bottom Wallet Summary / Status */}
            <div className="p-3 bg-[#0a0f1d] rounded-xl border border-[#1c2b3b] text-xs space-y-1.5 mt-auto">
              <div className="flex justify-between text-[#94a3b8]">
                <span>Status:</span>
                <span className={isWalletConnected ? 'text-emerald-400 font-semibold' : 'text-[#D4AF37]'}>
                  {isWalletConnected ? 'Authenticated' : 'Public Visitor'}
                </span>
              </div>
              {isWalletConnected && (
                <div className="flex justify-between text-[#94a3b8]">
                  <span>Balance:</span>
                  <span className="text-[#00F0FF] font-mono font-bold">{walletBalance.toFixed(2)} USDT</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
