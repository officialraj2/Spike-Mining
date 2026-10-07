import React, { useState } from 'react';
import { MiningNode } from '../../types';

interface DeployNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (newNode: MiningNode, costAmount: number) => void;
  existingCount: number;
}

export const DeployNodeModal: React.FC<DeployNodeModalProps> = ({
  isOpen,
  onClose,
  onDeploy,
  existingCount,
}) => {
  const nextNum = (existingCount + 1).toString().padStart(2, '0');
  const [nodeName, setNodeName] = useState(`SPIKE-NODE-${nextNum}`);
  const [region, setRegion] = useState('BSC Validator Region: US-East');
  const [tier, setTier] = useState<'starter' | 'standard' | 'enterprise'>('starter');
  const [isDeploying, setIsDeploying] = useState(false);

  if (!isOpen) return null;

  const tiers = [
    {
      id: 'starter',
      name: 'Starter Hash Rate',
      hashrate: 0.30,
      power: 85,
      cost: '15 USDT (Activation)',
      specs: 'SHA-256 Stratum+ssl · Protocol Entry',
    },
    {
      id: 'standard',
      name: 'Validator Rig Standard',
      hashrate: 1.50,
      power: 420,
      cost: '75 USDT (Activation)',
      specs: 'High Yield Matrix · 99.9% SLA',
    },
    {
      id: 'enterprise',
      name: 'Dedicated Cluster',
      hashrate: 5.00,
      power: 1250,
      cost: '250 USDT (Activation)',
      specs: 'Dedicated Remote Rack · 100% SLA',
    },
  ];

  const currentTier = tiers.find((t) => t.id === tier)!;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeploying(true);

    const costValues: Record<string, number> = {
      starter: 15,
      standard: 75,
      enterprise: 250,
    };
    const costUsdt = costValues[tier] || 15;

    setTimeout(() => {
      const newNode: MiningNode = {
        id: nodeName.trim() || `SPIKE-NODE-${nextNum}`,
        name: nodeName.trim() || `SPIKE-NODE-${nextNum}`,
        region: region,
        status: 'mining',
        hashrate: currentTier.hashrate,
        temperature: Math.floor(61 + Math.random() * 6),
        shareAcceptance: 99.9,
        fanSpeed: 70,
        powerUsage: currentTier.power,
        uptimeDays: 0,
        algorithm: 'BSC Sha-256 (Stratum+ssl)',
        logs: [
          `[${new Date().toLocaleTimeString()}] Provisioned node via BSC Smart Contract`,
          `[${new Date().toLocaleTimeString()}] Connected to Stratum pool port 3333`,
          `[${new Date().toLocaleTimeString()}] Initial hashrate locked at ${currentTier.hashrate} TH/s`,
        ],
      };

      onDeploy(newNode, costUsdt);
      setIsDeploying(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#010f1e]/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-[#0d1d2c] border border-[#1c2b3b] rounded-2xl p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-[#1c2b3b]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00F0FF]">dns</span>
            <h3 className="text-lg font-bold font-headline text-white">Deploy New Mining Node</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#c6c6cc] hover:text-white hover:bg-[#1c2b3b]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-headline text-[#c6c6cc] mb-1.5">
              Node Identifier / Name
            </label>
            <input
              type="text"
              value={nodeName}
              onChange={(e) => setNodeName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#122130] border border-[#1c2b3b] focus:border-[#00F0FF] text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#00F0FF]"
              placeholder="e.g. SPIKE-NODE-05"
            />
          </div>

          <div>
            <label className="block text-xs font-headline text-[#c6c6cc] mb-1.5">
              Validator Geographical Region
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#122130] border border-[#1c2b3b] focus:border-[#00F0FF] text-white text-sm focus:outline-none"
            >
              <option value="BSC Validator Region: US-East">BSC Validator Region: US-East (Virginia)</option>
              <option value="BSC Validator Region: EU-Central">BSC Validator Region: EU-Central (Frankfurt)</option>
              <option value="BSC Validator Region: AP-Southeast">BSC Validator Region: AP-Southeast (Singapore)</option>
              <option value="BSC Validator Region: SA-East">BSC Validator Region: SA-East (São Paulo)</option>
              <option value="BSC Validator Region: US-West">BSC Validator Region: US-West (Oregon)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-headline text-[#c6c6cc] mb-1.5">
              Hashrate Rig Allocation Tier
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {tiers.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setTier(t.id as any)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    tier === t.id
                      ? 'bg-[#1c2b3b] border-[#00F0FF] text-white shadow-[0_0_12px_rgba(0,240,255,0.15)]'
                      : 'bg-[#122130] border-[#1c2b3b] text-[#c6c6cc] hover:border-[#c6c6cc]/40'
                  }`}
                >
                  <div className="text-xs font-bold font-headline mb-1">{t.name}</div>
                  <div className="text-base font-bold font-mono text-[#00F0FF]">
                    {t.hashrate} <span className="text-xs">TH/s</span>
                  </div>
                  <div className="text-[11px] text-[#D4AF37] font-mono mt-1">{t.cost}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Allocation Summary */}
          <div className="p-3.5 rounded-xl bg-[#0a0f1d] border border-[#1c2b3b] text-xs space-y-1.5">
            <div className="flex justify-between text-[#c6c6cc]">
              <span>Hardware Specs:</span>
              <span className="text-white font-mono">{currentTier.specs}</span>
            </div>
            <div className="flex justify-between text-[#c6c6cc]">
              <span>Estimated Daily Rewards:</span>
              <span className="text-[#D4AF37] font-bold font-mono">
                +{(currentTier.hashrate * 39).toFixed(2)} USDT / day
              </span>
            </div>
            <div className="flex justify-between text-[#c6c6cc]">
              <span>Power Allocation:</span>
              <span className="text-white font-mono">{currentTier.power} W (Hydro Cooled)</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#122130] text-[#c6c6cc] hover:text-white text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDeploying}
              className="px-5 py-2.5 rounded-xl bg-[#00F0FF] text-[#0A0F1D] hover:bg-[#7df4ff] text-xs font-bold font-headline flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] disabled:opacity-50"
            >
              {isDeploying ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  <span>Provisioning Rig...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                  <span>Deploy Node Now</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
