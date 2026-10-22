import React, { useState } from 'react';
import { MiningNode } from '../../types';

interface DeployNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (newNode: MiningNode, costAmount: number) => void;
  existingCount: number;
  walletBalance?: number;
  onClaimFaucet?: (amount: number) => void;
}

export const DeployNodeModal: React.FC<DeployNodeModalProps> = ({
  isOpen,
  onClose,
  onDeploy,
  existingCount,
  walletBalance = 0,
  onClaimFaucet,
}) => {
  const nextNum = (existingCount + 1).toString().padStart(2, '0');
  const [nodeName, setNodeName] = useState(`SPIKE-NODE-${nextNum}`);
  const [region, setRegion] = useState('BSC Validator Region: US-East');
  const [isDeploying, setIsDeploying] = useState(false);

  if (!isOpen) return null;

  const currentTier = {
    id: 'falcon',
    name: 'Falcon Titan Apex',
    hashrate: 100, // 100 VH/s
    unit: 'VH/s',
    power: 3180,
    cost: '10 USDT',
    costUsdt: 10,
    specs: 'Falcon Titan 100 VH/s Stratum ASIC · Hydro Cooled',
    cycleYield: '1 SPK in 60 Days',
    dailySpkYield: 0.01667,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeploying(true);

    const costUsdt = currentTier.costUsdt;

    setTimeout(() => {
      const newNode: MiningNode = {
        id: nodeName.trim() || `SPIKE-NODE-${nextNum}`,
        name: nodeName.trim() || `Falcon Titan Apex Rig #${nextNum}`,
        region: region,
        status: 'mining',
        hashrate: 100,
        temperature: Math.floor(61 + Math.random() * 6),
        shareAcceptance: 99.95,
        fanSpeed: 70,
        powerUsage: currentTier.power,
        uptimeDays: 0,
        algorithm: 'BSC Sha-256 (Stratum+ssl)',
        logs: [
          `[${new Date().toLocaleTimeString()}] Provisioned Falcon Titan node via BSC Smart Contract`,
          `[${new Date().toLocaleTimeString()}] Connected to Stratum pool port 3333`,
          `[${new Date().toLocaleTimeString()}] Initial hashrate locked at 100 VH/s (1 SPK / 60 Days)`,
        ],
      };

      onDeploy(newNode, costUsdt);
      setIsDeploying(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#010f1e]/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Container - Fits into single window without overflow */}
      <div className="relative w-full max-w-lg max-h-[92dvh] sm:max-h-[90vh] bg-[#0c1a29] border-t sm:border border-[#1c2b3b] rounded-t-3xl sm:rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.85)] sm:shadow-2xl z-10 flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1 bg-[#27384a] rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Fixed Header */}
        <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-[#1c2b3b] flex items-center justify-between bg-[#0a1522]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#00F0FF]/15 border border-[#00F0FF]/30 text-[#00F0FF] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">dns</span>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-headline text-white leading-tight">
                Deploy Mining Node
              </h3>
              <p className="text-[11px] text-[#94a3b8] font-mono">
                Falcon Titan 100 VH/s · BSC Stratum Engine
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-[#94a3b8] hover:text-white bg-[#122130] hover:bg-[#1c2b3b] flex items-center justify-center border border-[#1c2b3b] transition-all"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3.5 space-y-3 custom-scrollbar">
            
            {/* Compact 2-Column Row for Node ID and Region */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-headline font-semibold text-[#94a3b8] mb-1">
                  Node Identifier
                </label>
                <input
                  type="text"
                  value={nodeName}
                  onChange={(e) => setNodeName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[#122130] border border-[#1c2b3b] focus:border-[#00F0FF] text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#00F0FF]"
                  placeholder="e.g. SPIKE-NODE-05"
                />
              </div>

              <div>
                <label className="block text-[11px] font-headline font-semibold text-[#94a3b8] mb-1">
                  Validator Region
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#122130] border border-[#1c2b3b] focus:border-[#00F0FF] text-white text-xs focus:outline-none"
                >
                  <option value="BSC Validator Region: US-East">US-East (Virginia)</option>
                  <option value="BSC Validator Region: EU-Central">EU-Central (Frankfurt)</option>
                  <option value="BSC Validator Region: AP-Southeast">AP-Southeast (Singapore)</option>
                  <option value="BSC Validator Region: SA-East">SA-East (São Paulo)</option>
                  <option value="BSC Validator Region: US-West">US-West (Oregon)</option>
                </select>
              </div>
            </div>

            {/* Falcon Titan 100 VH/s Package Card (Supreme & Professional) */}
            <div className="p-3.5 rounded-2xl border border-[#00F0FF]/50 bg-gradient-to-br from-[#102438] via-[#0d1d2c] to-[#091522] shadow-[0_0_20px_rgba(0,240,255,0.12)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">rocket</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold font-headline text-white flex items-center gap-1.5">
                      <span>Falcon Titan Apex</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30">Active</span>
                    </div>
                    <div className="text-[10px] text-[#94a3b8] font-mono">
                      Stratum SHA-256 BSC Sublayer Engine
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-extrabold font-mono text-[#00F0FF] tracking-tight">
                    100 <span className="text-xs font-semibold">VH/s</span>
                  </div>
                  <div className="text-[11px] text-[#D4AF37] font-mono font-bold">
                    10 USDT Cost
                  </div>
                </div>
              </div>

              {/* 3 Metrics Pills */}
              <div className="mt-2.5 pt-2.5 border-t border-[#1c2b3b] grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-[#081320]/80 p-1.5 rounded-xl border border-[#1c2b3b]/60">
                  <div className="text-[9px] text-[#94a3b8] font-mono uppercase">Hash Speed</div>
                  <div className="text-white font-mono font-bold text-xs mt-0.5">100 VH/s</div>
                </div>
                <div className="bg-[#081320]/80 p-1.5 rounded-xl border border-[#1c2b3b]/60">
                  <div className="text-[9px] text-[#94a3b8] font-mono uppercase">Cycle Target</div>
                  <div className="text-[#00F0FF] font-mono font-bold text-xs mt-0.5">1 SPK / 60d</div>
                </div>
                <div className="bg-[#081320]/80 p-1.5 rounded-xl border border-[#1c2b3b]/60">
                  <div className="text-[9px] text-[#94a3b8] font-mono uppercase">Daily Yield</div>
                  <div className="text-[#D4AF37] font-mono font-bold text-xs mt-0.5">+0.0167 SPK</div>
                </div>
              </div>
            </div>

            {/* Hardware Telemetry & Allocation Grid */}
            <div className="p-3 rounded-xl bg-[#081320] border border-[#1c2b3b] text-xs">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[#c6c6cc]">
                <div className="flex justify-between border-b border-[#1c2b3b]/50 pb-1">
                  <span className="text-[#94a3b8]">Activation:</span>
                  <span className="text-[#00F0FF] font-bold font-mono">10.00 USDT</span>
                </div>
                <div className="flex justify-between border-b border-[#1c2b3b]/50 pb-1">
                  <span className="text-[#94a3b8]">Wallet Bal:</span>
                  <span className={`font-mono font-bold ${walletBalance >= 10 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {walletBalance.toFixed(2)} USDT
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">Power Load:</span>
                  <span className="text-white font-mono">3,180 W Hydro</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">Daily Yield:</span>
                  <span className="text-[#D4AF37] font-bold font-mono">+0.01667 SPK</span>
                </div>
              </div>
            </div>

            {/* Insufficient Balance Notice with 1-Click Faucet */}
            {walletBalance < 10 && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-amber-300 font-mono">
                  <span className="material-symbols-outlined text-[18px] text-amber-400 shrink-0">account_balance_wallet</span>
                  <span>Balance: {walletBalance.toFixed(2)} USDT (Need 10 USDT)</span>
                </div>
                {onClaimFaucet && (
                  <button
                    type="button"
                    onClick={() => onClaimFaucet(50)}
                    className="px-2.5 py-1 rounded-lg bg-amber-400 text-[#0A0F1D] text-[11px] font-bold shrink-0 hover:bg-amber-300 transition-colors shadow-sm cursor-pointer"
                  >
                    +50 Faucet
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Guaranteed Visible Sticky Footer */}
          <div className="shrink-0 px-4 sm:px-6 py-3.5 bg-[#081320] border-t border-[#1c2b3b] flex items-center gap-2.5 z-20">
            <button
              type="button"
              onClick={onClose}
              className="w-24 sm:w-28 py-3 rounded-xl bg-[#122130] hover:bg-[#1a2c3f] text-[#c6c6cc] hover:text-white text-xs font-semibold text-center transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDeploying}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#00F0FF] via-[#7df4ff] to-[#00F0FF] hover:brightness-110 text-[#0A0F1D] font-headline font-extrabold text-xs sm:text-sm shadow-[0_0_20px_rgba(0,240,255,0.4)] flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isDeploying ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  <span>Provisioning Rig...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                  <span>Deploy Falcon Titan (10 USDT)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
