import React, { useState } from 'react';
import { TEAM_MILESTONE_TIERS, SPIKE_LOGO_URL } from '../data/mockData';
import { TeamMilestoneTier } from '../types';

interface TeamRewardMilestonesSectionProps {
  directPartners?: number;
  downlinePartners?: number;
  levelCounts?: Record<number, number>;
  onClaimReward?: (amountUsd: number, milestoneName: string) => void;
  walletAddress?: string;
}

export const TeamRewardMilestonesSection: React.FC<TeamRewardMilestonesSectionProps> = ({
  directPartners = 0,
  downlinePartners = 0,
  levelCounts,
  onClaimReward,
  walletAddress,
}) => {
  // Real team partner calculations from actual referrals
  const totalTeamPartners = directPartners + downlinePartners;
  const l1Count = levelCounts?.[1] ?? directPartners;
  const l2Count = levelCounts?.[2] ?? 0;
  const l3Count = levelCounts?.[3] ?? 0;
  const l4Count = levelCounts?.[4] ?? 0;
  const l5PlusCount = Object.entries(levelCounts || {})
    .filter(([lvl]) => Number(lvl) >= 5)
    .reduce((sum, [, val]) => sum + (val || 0), 0);

  // Helper to determine if a specific unilevel milestone tier is unlocked
  const isTierReached = (tier: TeamMilestoneTier) => {
    const levelNum = tier.level || 1;
    const countAtLevel = levelCounts?.[levelNum] ?? (levelNum === 1 ? directPartners : 0);
    return countAtLevel >= tier.partnersRequired || totalTeamPartners >= tier.partnersRequired;
  };

  const getTierProgressCount = (tier: TeamMilestoneTier) => {
    const levelNum = tier.level || 1;
    const countAtLevel = levelCounts?.[levelNum] ?? (levelNum === 1 ? directPartners : 0);
    if (totalTeamPartners >= tier.partnersRequired && countAtLevel === 0) {
      return totalTeamPartners;
    }
    return countAtLevel;
  };

  // Track claimed milestone IDs per wallet
  const storageKey = `spike_claimed_milestones_${walletAddress || 'default'}`;
  const [claimedIds, setClaimedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Keep claimedIds synced if wallet changes
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(`spike_claimed_milestones_${walletAddress || 'default'}`);
      setClaimedIds(saved ? JSON.parse(saved) : []);
    } catch {
      setClaimedIds([]);
    }
  }, [walletAddress]);

  const [justClaimedId, setJustClaimedId] = useState<string | null>(null);

  // Find claimable milestones (reached but not claimed)
  const claimableMilestones = TEAM_MILESTONE_TIERS.filter(
    (m) => isTierReached(m) && !claimedIds.includes(m.id)
  );

  // Next upcoming milestone
  const nextMilestone = TEAM_MILESTONE_TIERS.find(
    (m) => !isTierReached(m)
  );

  const handleClaim = (milestone: TeamMilestoneTier) => {
    if (claimedIds.includes(milestone.id)) return;
    const updated = [...claimedIds, milestone.id];
    setClaimedIds(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}
    setJustClaimedId(milestone.id);
    onClaimReward?.(milestone.rewardUsd, milestone.label);
    setTimeout(() => {
      setJustClaimedId(null);
    }, 3000);
  };

  return (
    <div className="space-y-6">


      {/* ============================================================
          MAIN SPIKE TEAM-BASED REWARD PROGRAM CONSOLE (FROM ATTACHED PHOTO)
         ============================================================ */}
      <div className="bg-gradient-to-b from-[#071626] via-[#051424] to-[#040d18] rounded-2xl p-5 md:p-7 border-2 border-[#00F0FF]/40 shadow-[0_0_35px_rgba(0,240,255,0.18)] relative overflow-hidden">
        {/* Ambient Corner Accents */}
        <div className="absolute top-0 left-0 w-24 h-24 border-t-2 border-l-2 border-[#00F0FF] rounded-tl-2xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-24 h-24 border-t-2 border-r-2 border-[#00F0FF] rounded-tr-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 border-b-2 border-l-2 border-[#00F0FF] rounded-bl-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-24 h-24 border-b-2 border-r-2 border-[#00F0FF] rounded-br-2xl pointer-events-none" />

        {/* Brand & Section Header */}
        <div className="text-center space-y-1 mb-6 relative z-10">
          <div className="flex items-center justify-center gap-2 mb-1">
            <img
              src={SPIKE_LOGO_URL}
              alt="SPIKE"
              onError={(e) => { e.currentTarget.src = '/spike_logo.png'; }}
              className="w-7 h-7 object-contain drop-shadow-[0_0_10px_rgba(212,175,55,0.8)]"
            />
            <span className="text-xl md:text-2xl font-black font-headline tracking-[0.2em] text-[#D4AF37]">
              SPIKE
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-headline text-white tracking-tight drop-shadow-[0_2px_15px_rgba(0,240,255,0.35)]">
            BUILD THE TEAM. UNLOCK THE REWARD.
          </h2>

          <div className="inline-block px-4 py-1 rounded-full bg-gradient-to-r from-[#00F0FF]/20 via-[#00F0FF]/10 to-[#00F0FF]/20 border border-[#00F0FF]/40 text-[#00F0FF] font-headline font-extrabold text-sm sm:text-base tracking-wider uppercase mt-1">
            SPIKE TEAM-BASED REWARD PROGRAM
          </div>

          <p className="text-xs sm:text-sm text-[#94a3b8] max-w-2xl mx-auto pt-1 font-sans">
            Grow your network. Reach team milestones. Unlock higher rewards.
          </p>
        </div>

        {/* Total Team Partners Calculation Box - Clean Corporate Layout */}
        <div className="bg-[#0a1828] rounded-2xl p-4 md:p-5 border border-[#00F0FF]/30 shadow-inner mb-6 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00F0FF] text-[20px]">groups</span>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Total Team Calculation (Direct + Downline Team)
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ENTIRE TEAM CALCULATED
                </span>
              </div>
              <p className="text-xs text-[#94a3b8] font-sans">
                Real-time partner network tracking across all unilevel generations.
              </p>
            </div>

            {/* Live Count Pill Cards */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <div className="px-3.5 py-2 rounded-xl bg-[#051424] border border-[#1c2b3b] text-center">
                <div className="text-[10px] text-[#94a3b8] font-mono uppercase">Direct Partners</div>
                <div className="text-base font-extrabold font-mono text-white">{directPartners}</div>
              </div>

              <span className="text-[#00F0FF] font-bold text-lg">+</span>

              <div className="px-3.5 py-2 rounded-xl bg-[#051424] border border-[#1c2b3b] text-center">
                <div className="text-[10px] text-[#94a3b8] font-mono uppercase">Downline Partners</div>
                <div className="text-base font-extrabold font-mono text-white">{downlinePartners}</div>
              </div>

              <span className="text-[#00F0FF] font-bold text-lg">=</span>

              <div className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00F0FF]/20 to-[#D4AF37]/20 border border-[#00F0FF]/50 text-center shadow-[0_0_15px_rgba(0,240,255,0.25)]">
                <div className="text-[10px] text-[#00F0FF] font-mono font-bold uppercase tracking-wider">
                  Total Team Partners
                </div>
                <div className="text-xl font-black font-mono text-white tracking-tight">
                  {totalTeamPartners} <span className="text-xs text-[#00F0FF] font-normal">Partners</span>
                </div>
              </div>
            </div>
          </div>

          {/* Real Referral Network Live Sync Bar */}
          <div className="mt-3.5 pt-3 border-t border-[#1c2b3b]/70 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono text-[#94a3b8]">
                Real Network Referrals: <strong className="text-white">{totalTeamPartners} Real Partners Active</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-[#051424] text-[#00F0FF] border border-[#00F0FF]/30 text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-sm">
                <span className="material-symbols-outlined text-[12px] text-emerald-400">verified</span>
                <span>Milestones Unlock on Real Referrals</span>
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================
            DUAL BOX MILESTONE CONSOLES (BOX 1: LEVELS 1-5 | BOX 2: LEVELS 6-9)
           ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
          {/* BOX 1: CORE MILESTONES (LEVELS 1 - 5) */}
          <div className="rounded-2xl border-2 border-[#00F0FF]/40 bg-[#051424] shadow-2xl overflow-hidden flex flex-col justify-between">
            <div>
              {/* Box 1 Header */}
              <div className="bg-gradient-to-r from-[#071d33] via-[#092542] to-[#071d33] px-5 py-3.5 border-b border-[#00F0FF]/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#00F0FF]/15 border border-[#00F0FF]/40 flex items-center justify-center text-[#00F0FF]">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold font-headline text-white tracking-wide">
                      Core Career Milestones
                    </h3>
                    <p className="text-[11px] font-mono text-[#00F0FF]">
                      Level 1 – Level 5 (Community Growth)
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30">
                  5 Levels
                </span>
              </div>

              {/* Table for Levels 1 to 5 */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#071626]/80 border-b border-[#1c2b3b] text-xs text-[#94a3b8] font-headline uppercase tracking-wider">
                      <th className="py-2.5 px-4 font-bold">Level / Partners</th>
                      <th className="py-2.5 px-4 font-bold text-center">Reward</th>
                      <th className="py-2.5 px-4 font-bold text-right">Status / Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1c2b3b]/60">
                    {TEAM_MILESTONE_TIERS.slice(0, 5).map((tier, idx) => {
                      const isReached = isTierReached(tier);
                      const isClaimed = claimedIds.includes(tier.id);
                      const isJustClaimed = justClaimedId === tier.id;
                      const currentLevelCount = getTierProgressCount(tier);
                      const progressPct = Math.min(100, Math.round((currentLevelCount / tier.partnersRequired) * 100));

                      return (
                        <tr
                          key={tier.id}
                          className={`transition-colors ${
                            isReached
                              ? isClaimed
                                ? 'bg-[#081829]/60 hover:bg-[#0a2038]/60'
                                : 'bg-[#00F0FF]/10 hover:bg-[#00F0FF]/15 border-l-4 border-l-[#00F0FF]'
                              : idx % 2 === 0
                              ? 'bg-[#051424]'
                              : 'bg-[#06182c]'
                          }`}
                        >
                          {/* Column 1: Team Partners */}
                          <td className="py-3 px-4 font-mono font-semibold text-white">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${isReached ? 'bg-[#00F0FF] shadow-[0_0_8px_#00F0FF]' : 'bg-[#1c2b3b]'}`} />
                              <span className="text-xs sm:text-sm font-headline font-bold">
                                {tier.label}
                              </span>
                            </div>
                            {!isReached && (
                              <div className="mt-1 pl-4 max-w-[190px]">
                                <div className="flex justify-between text-[9px] text-[#94a3b8] mb-0.5 font-mono">
                                  <span>{currentLevelCount} / {tier.partnersRequired.toLocaleString()}</span>
                                  <span>{progressPct}%</span>
                                </div>
                                <div className="w-full h-1 bg-[#0a0f1d] rounded-full overflow-hidden border border-[#1c2b3b]">
                                  <div
                                    className="h-full bg-gradient-to-r from-[#00F0FF] to-[#D4AF37] rounded-full transition-all duration-500"
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Column 2: Reward */}
                          <td className="py-3 px-4 font-mono text-center">
                            <span className="text-sm sm:text-base font-black text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.35)]">
                              {tier.rewardFormatted}
                            </span>
                            <span className="text-[10px] text-[#94a3b8] ml-1 font-mono">USDT</span>
                          </td>

                          {/* Column 3: Status / Action */}
                          <td className="py-3 px-4 text-right">
                            {isClaimed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-headline font-bold text-[11px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                <span>Claimed</span>
                              </span>
                            ) : isReached ? (
                              <button
                                onClick={() => handleClaim(tier)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-headline font-extrabold text-[11px] bg-gradient-to-r from-[#00F0FF] to-[#D4AF37] text-[#0A0F1D] shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[14px]">payments</span>
                                <span>{isJustClaimed ? 'Claimed!' : 'Claim'}</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] text-[#94a3b8] bg-[#0a0f1d] border border-[#1c2b3b]">
                                <span className="material-symbols-outlined text-[12px]">lock</span>
                                <span>{Math.max(0, tier.partnersRequired - currentLevelCount)} left</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* BOX 2: APEX LEADERSHIP MILESTONES (LEVELS 6 - 9) */}
          <div className="rounded-2xl border-2 border-[#D4AF37]/40 bg-[#051424] shadow-2xl overflow-hidden flex flex-col justify-between">
            <div>
              {/* Box 2 Header */}
              <div className="bg-gradient-to-r from-[#1c1806] via-[#241f08] to-[#1c1806] px-5 py-3.5 border-b border-[#D4AF37]/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                    <span className="material-symbols-outlined text-[18px]">military_tech</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold font-headline text-white tracking-wide">
                      Apex Leadership Milestones
                    </h3>
                    <p className="text-[11px] font-mono text-[#D4AF37]">
                      Level 6 – Level 9 (High-Volume Fleet)
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                  4 Levels
                </span>
              </div>

              {/* Table for Levels 6 to 9 */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#141208]/80 border-b border-[#1c2b3b] text-xs text-[#94a3b8] font-headline uppercase tracking-wider">
                      <th className="py-2.5 px-4 font-bold">Level / Partners</th>
                      <th className="py-2.5 px-4 font-bold text-center">Reward</th>
                      <th className="py-2.5 px-4 font-bold text-right">Status / Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1c2b3b]/60">
                    {TEAM_MILESTONE_TIERS.slice(5).map((tier, idx) => {
                      const isReached = isTierReached(tier);
                      const isClaimed = claimedIds.includes(tier.id);
                      const isJustClaimed = justClaimedId === tier.id;
                      const currentLevelCount = getTierProgressCount(tier);
                      const progressPct = Math.min(100, Math.round((currentLevelCount / tier.partnersRequired) * 100));

                      return (
                        <tr
                          key={tier.id}
                          className={`transition-colors ${
                            isReached
                              ? isClaimed
                                ? 'bg-[#081829]/60 hover:bg-[#0a2038]/60'
                                : 'bg-[#D4AF37]/10 hover:bg-[#D4AF37]/15 border-l-4 border-l-[#D4AF37]'
                              : idx % 2 === 0
                              ? 'bg-[#051424]'
                              : 'bg-[#06182c]'
                          }`}
                        >
                          {/* Column 1: Team Partners */}
                          <td className="py-3 px-4 font-mono font-semibold text-white">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${isReached ? 'bg-[#D4AF37] shadow-[0_0_8px_#D4AF37]' : 'bg-[#1c2b3b]'}`} />
                              <span className="text-xs sm:text-sm font-headline font-bold">
                                {tier.label}
                              </span>
                            </div>
                            {!isReached && (
                              <div className="mt-1 pl-4 max-w-[190px]">
                                <div className="flex justify-between text-[9px] text-[#94a3b8] mb-0.5 font-mono">
                                  <span>{currentLevelCount} / {tier.partnersRequired.toLocaleString()}</span>
                                  <span>{progressPct}%</span>
                                </div>
                                <div className="w-full h-1 bg-[#0a0f1d] rounded-full overflow-hidden border border-[#1c2b3b]">
                                  <div
                                    className="h-full bg-gradient-to-r from-[#00F0FF] to-[#D4AF37] rounded-full transition-all duration-500"
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Column 2: Reward */}
                          <td className="py-3 px-4 font-mono text-center">
                            <span className="text-sm sm:text-base font-black text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.35)]">
                              {tier.rewardFormatted}
                            </span>
                            <span className="text-[10px] text-[#94a3b8] ml-1 font-mono">USDT</span>
                          </td>

                          {/* Column 3: Status / Action */}
                          <td className="py-3 px-4 text-right">
                            {isClaimed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-headline font-bold text-[11px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                <span>Claimed</span>
                              </span>
                            ) : isReached ? (
                              <button
                                onClick={() => handleClaim(tier)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-headline font-extrabold text-[11px] bg-gradient-to-r from-[#D4AF37] to-[#ffe088] text-[#0A0F1D] shadow-[0_0_15px_rgba(212,175,55,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[14px]">payments</span>
                                <span>{isJustClaimed ? 'Claimed!' : 'Claim'}</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] text-[#94a3b8] bg-[#0a0f1d] border border-[#1c2b3b]">
                                <span className="material-symbols-outlined text-[12px]">lock</span>
                                <span>{Math.max(0, tier.partnersRequired - currentLevelCount)} left</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

        {/* Milestone Footer Trust Banner */}
        <div className="mt-4 pt-3 border-t border-[#1c2b3b] flex flex-wrap items-center justify-between gap-3 text-xs text-[#94a3b8] font-mono relative z-10">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00F0FF] text-[16px]">verified</span>
            <span>Non-custodial BEP-20 smart contract payouts settled in liquid USDT</span>
          </div>
          <div className="flex items-center gap-2 text-[#D4AF37]">
            <span className="material-symbols-outlined text-[16px]">military_tech</span>
            <span>Cumulative Rewards: Up to $738,115 USDT Total Career Bonus</span>
          </div>
        </div>
      </div>
    </div>
  );
};
