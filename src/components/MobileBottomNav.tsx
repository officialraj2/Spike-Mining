import React from 'react';
import { TabType } from '../types';

interface MobileBottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  nodeCount: number;
  isWalletConnected: boolean;
  onOpenLogin: () => void;
  onNavigateHomeSection?: (sectionId: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  nodeCount,
  isWalletConnected,
  onOpenLogin,
  onNavigateHomeSection,
}) => {
  if (!isWalletConnected) {
    return (
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0d1d2c]/95 backdrop-blur-xl border-t border-[#1c2b3b] z-40 grid grid-cols-4 items-center px-2 safe-area-pb"
        aria-label="Mobile Bottom Navigation"
      >
        <button
          onClick={() => {
            onTabChange('home');
            onNavigateHomeSection?.('hero');
          }}
          className={`flex flex-col items-center justify-center min-h-[44px] py-1 transition-colors relative ${
            activeTab === 'home' ? 'text-[#00F0FF]' : 'text-[#94a3b8]'
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
            <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] absolute bottom-0.5 shadow-[0_0_8px_#00F0FF]" />
          )}
        </button>

        <button
          onClick={() => {
            onTabChange('home');
            onNavigateHomeSection?.('features');
          }}
          className="flex flex-col items-center justify-center min-h-[44px] py-1 text-[#94a3b8] hover:text-[#00F0FF] transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">bolt</span>
          <span className="text-[10px] font-headline font-semibold mt-0.5">Features</span>
        </button>

        <button
          onClick={() => {
            onTabChange('home');
            onNavigateHomeSection?.('calculator');
          }}
          className="flex flex-col items-center justify-center min-h-[44px] py-1 text-[#94a3b8] hover:text-[#00F0FF] transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">calculate</span>
          <span className="text-[10px] font-headline font-semibold mt-0.5">Yield</span>
        </button>

        <button
          onClick={onOpenLogin}
          className="flex flex-col items-center justify-center min-h-[44px] py-1 text-[#00F0FF] hover:text-[#7df4ff] transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#00F0FF] to-[#D4AF37] text-[#0A0F1D] flex items-center justify-center shadow-[0_0_12px_rgba(0,240,255,0.4)]">
            <span className="material-symbols-outlined text-[16px] font-bold">account_balance_wallet</span>
          </div>
          <span className="text-[10px] font-headline font-bold text-[#00F0FF] mt-0.5">Connect</span>
        </button>
      </nav>
    );
  }

  const tabs: { id: TabType; label: string; icon: string; badge?: number; hot?: boolean }[] = [
    { id: 'dashboard', label: 'Dash', icon: 'dashboard' },
    { id: 'mining-nodes', label: 'Nodes', icon: 'dns', badge: nodeCount },
    { id: 'referrals', label: 'Referrals', icon: 'groups' },
    { id: 'announcements', label: 'CEX', icon: 'campaign', hot: true },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0d1d2c]/95 backdrop-blur-xl border-t border-[#1c2b3b] z-40 grid grid-cols-4 items-center px-1 safe-area-pb"
      aria-label="Mobile Bottom Navigation"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center min-h-[44px] py-1 transition-colors relative ${
              isActive ? 'text-[#00F0FF]' : 'text-[#94a3b8] hover:text-[#d4e4fa]'
            }`}
          >
            <div className="relative">
              <span
                className="material-symbols-outlined text-[20px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {tab.icon}
              </span>
              {tab.badge !== undefined && (
                <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-[#00F0FF] text-[#0A0F1D] text-[8px] font-bold rounded-full flex items-center justify-center font-mono">
                  {tab.badge}
                </span>
              )}
              {tab.hot && (
                <span className="absolute -top-1.5 -right-2.5 w-2 h-2 bg-[#D4AF37] rounded-full animate-ping" />
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
              <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] absolute bottom-0.5 shadow-[0_0_8px_#00F0FF]" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
