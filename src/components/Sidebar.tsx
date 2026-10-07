import React from 'react';
import { TabType } from '../types';
import { SPIKE_LOGO_URL } from '../data/mockData';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  nodeCount: number;
  onOpenSwapModal?: () => void;
  isAdmin?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  nodeCount,
  onOpenSwapModal,
  isAdmin = false,
}) => {
  const navItems: { id: TabType; label: string; icon: string; count?: number; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'mining-nodes', label: 'Mining Nodes', icon: 'dns', count: nodeCount },
    { id: 'referrals', label: 'Referral system', icon: 'groups', badge: 'REWARDS' },
    { id: 'announcements', label: 'Announcements', icon: 'campaign', badge: 'TOP 10 CEX' },
    ...(isAdmin ? [{ id: 'admin' as TabType, label: 'Admin Panel', icon: 'shield_person', badge: 'ROOT' }] : []),
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#0d1d2c] z-50 hidden md:flex flex-col pt-6 pb-6 border-r border-[#1c2b3b]/60 select-none">
      {/* Brand Header */}
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="relative group cursor-pointer" onClick={() => onTabChange('dashboard')}>
          <img
            src={SPIKE_LOGO_URL}
            alt="SPIKE Falcon Medallion"
            className="h-10 w-10 object-contain drop-shadow-[0_0_15px_rgba(212,175,55,0.45)] group-hover:scale-105 transition-transform"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-extrabold tracking-[0.14em] text-[#D4AF37] font-headline drop-shadow-[0_2px_10px_rgba(212,175,55,0.25)]">
            SPIKE
          </span>
          <span className="text-[10px] tracking-[0.22em] uppercase text-[#94a3b8] font-mono -mt-0.5 font-medium">
            Mining Protocol
          </span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 space-y-1.5" aria-label="Sidebar Navigation">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                isActive
                  ? 'bg-[#1c2b3b] text-[#00F0FF] font-semibold shadow-[0_0_18px_rgba(0,240,255,0.14)] border border-[#00F0FF]/25'
                  : 'text-[#94a3b8] hover:bg-[#122130] hover:text-[#f8fafc]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                <span className="font-headline tracking-wide">{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] px-2 py-0.5 rounded-full font-mono font-extrabold bg-gradient-to-r from-[#D4AF37] to-[#00F0FF] text-[#0A0F1D] shadow-[0_0_12px_rgba(212,175,55,0.4)] animate-pulse tracking-tight whitespace-nowrap">
                  {item.badge}
                </span>
              )}
              {item.count !== undefined && !item.badge && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-semibold tabular-nums ${
                    isActive ? 'bg-[#00F0FF]/20 text-[#00F0FF]' : 'bg-[#1c2b3b] text-[#94a3b8]'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* BSC Network Telemetry Footer */}
      <div className="px-4 mt-auto">
        <div className="p-3.5 rounded-xl bg-[#0a0f1d] border border-[#1c2b3b]/60 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.16em] text-[#94a3b8] font-mono font-medium">
              BSC Validator
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#7df4ff] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-pulse"></span>
              Synchronized
            </span>
          </div>
          <div className="text-xs text-[#d4e4fa] font-mono flex items-center justify-between">
            <span className="text-[#94a3b8]/70">Block:</span>
            <span className="text-[#00F0FF] font-semibold tabular-nums">#38,419,204</span>
          </div>
          <div className="text-[10px] text-[#94a3b8]/60 flex items-center justify-between pt-1 border-t border-[#1c2b3b]/40">
            <span>CertiK Security:</span>
            <span className="text-[#D4AF37] font-semibold tracking-wide">Level 2 Verified</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
