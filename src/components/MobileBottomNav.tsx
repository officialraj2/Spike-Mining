import React from 'react';
import { TabType } from '../types';

interface MobileBottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  nodeCount: number;
  isWalletConnected: boolean;
  onOpenLogin: () => void;
  onNavigateHomeSection?: (sectionId: string) => void;
  isSimulator?: boolean;
  isAdmin?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  nodeCount,
  isWalletConnected,
  onOpenLogin,
  onNavigateHomeSection,
  isSimulator = false,
  isAdmin = false,
}) => {
  // Container class: in simulator it must be sticky inside phone frame; on real mobile it is fixed bottom
  const containerClasses = isSimulator
    ? "w-full shrink-0 sticky bottom-0 z-50 bg-[#071525]/98 backdrop-blur-2xl border-t border-[#1c2b3b] shadow-[0_-6px_25px_rgba(0,0,0,0.85)] py-1.5 px-2"
    : "md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-[#071525]/98 backdrop-blur-2xl border-t border-[#1c2b3b] shadow-[0_-6px_25px_rgba(0,0,0,0.85)] py-1 px-2 safe-area-pb";

  // Public visitor navigation
  if (!isWalletConnected) {
    return (
      <nav
        className={`${containerClasses} grid grid-cols-4 items-center`}
        aria-label="Mobile Bottom Navigation"
      >
        <button
          onClick={() => {
            onTabChange('home');
            onNavigateHomeSection?.('hero');
          }}
          className={`flex flex-col items-center justify-center min-h-[46px] py-1 transition-all relative rounded-xl ${
            activeTab === 'home'
              ? 'text-[#00F0FF] bg-[#00F0FF]/10'
              : 'text-[#94a3b8] hover:text-[#d4e4fa]'
          }`}
        >
          <span
            className="material-symbols-outlined text-[20px]"
            style={activeTab === 'home' ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            home
          </span>
          <span className="text-[10px] font-headline font-semibold mt-0.5">Home</span>
          {activeTab === 'home' && (
            <span className="w-5 h-0.5 rounded-full bg-[#00F0FF] absolute bottom-1 shadow-[0_0_8px_#00F0FF]" />
          )}
        </button>

        <button
          onClick={() => {
            onTabChange('home');
            onNavigateHomeSection?.('features');
          }}
          className="flex flex-col items-center justify-center min-h-[46px] py-1 text-[#94a3b8] hover:text-[#00F0FF] transition-all rounded-xl hover:bg-[#122130]"
        >
          <span className="material-symbols-outlined text-[20px]">bolt</span>
          <span className="text-[10px] font-headline font-semibold mt-0.5">Features</span>
        </button>

        <button
          onClick={() => {
            onTabChange('home');
            onNavigateHomeSection?.('calculator');
          }}
          className="flex flex-col items-center justify-center min-h-[46px] py-1 text-[#94a3b8] hover:text-[#00F0FF] transition-all rounded-xl hover:bg-[#122130]"
        >
          <span className="material-symbols-outlined text-[20px]">calculate</span>
          <span className="text-[10px] font-headline font-semibold mt-0.5">Yield</span>
        </button>

        <button
          onClick={onOpenLogin}
          className="flex flex-col items-center justify-center min-h-[46px] py-1 text-[#00F0FF] hover:text-[#7df4ff] transition-all rounded-xl"
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[#00F0FF] to-[#D4AF37] text-[#0A0F1D] flex items-center justify-center shadow-[0_0_12px_rgba(0,240,255,0.5)]">
            <span className="material-symbols-outlined text-[15px] font-bold">account_balance_wallet</span>
          </div>
          <span className="text-[10px] font-headline font-bold text-[#00F0FF] mt-0.5">Connect</span>
        </button>
      </nav>
    );
  }

  // Connected wallet user tabs
  const tabs: { id: TabType; label: string; icon: string; badge?: number; hot?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'mining-nodes', label: 'Nodes', icon: 'dns', badge: nodeCount },
    { id: 'referrals', label: 'Referrals', icon: 'groups' },
    { id: 'swap', label: 'Swap', icon: 'swap_horiz' },
    ...(isAdmin ? [{ id: 'admin' as TabType, label: 'Admin', icon: 'shield_person' }] : []),
  ];

  const gridColsClass = tabs.length >= 5 ? 'grid-cols-5' : 'grid-cols-4';

  return (
    <nav
      className={`${containerClasses} grid ${gridColsClass} items-center`}
      aria-label="Mobile Bottom Navigation"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center min-h-[46px] py-1 transition-all relative rounded-xl ${
              isActive
                ? 'text-[#00F0FF] bg-[#00F0FF]/10 font-bold'
                : 'text-[#94a3b8] hover:text-[#d4e4fa] hover:bg-[#122130]'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <span
                className="material-symbols-outlined text-[20px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {tab.icon}
              </span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute -top-1 -right-2.5 min-w-3.5 h-3.5 px-0.5 bg-[#00F0FF] text-[#0A0F1D] text-[8px] font-bold rounded-full flex items-center justify-center font-mono shadow-[0_0_6px_#00F0FF]">
                  {tab.badge}
                </span>
              )}
              {tab.hot && (
                <span className="absolute -top-1 -right-2 w-2 h-2 bg-[#D4AF37] rounded-full animate-ping" />
              )}
            </div>
            <span
              className={`text-[9px] font-headline tracking-tight mt-0.5 ${
                isActive ? 'font-bold text-[#00F0FF]' : 'font-medium'
              }`}
            >
              {tab.label}
            </span>
            {isActive && (
              <span className="w-5 h-0.5 rounded-full bg-[#00F0FF] absolute bottom-1 shadow-[0_0_8px_#00F0FF]" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
