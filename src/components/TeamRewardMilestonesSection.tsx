import React, { useState } from 'react';
import { TEAM_MILESTONE_TIERS, SPIKE_LOGO_URL } from '../data/mockData';
import { TeamMilestoneTier } from '../types';

interface TeamRewardMilestonesSectionProps {
  directPartners?: number;
  downlinePartners?: number;
  onClaimReward?: (amountUsd: number, milestoneName: string) => void;
  walletAddress?: string;
}

export const TeamRewardMilestonesSection: React.FC<TeamRewardMilestonesSectionProps> = ({
  directPartners = 0,
  downlinePartners = 0,
  onClaimReward,
  walletAddress,
}) => {
  // Real team partner calculations from actual referrals
  const totalTeamPartners = directPartners + downlinePartners;
  const directCount = directPartners;
  const downlineCount = downlinePartners;

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
    (m) => totalTeamPartners >= m.partnersRequired && !claimedIds.includes(m.id)
  );

  // Next upcoming milestone
  const nextMilestone = TEAM_MILESTONE_TIERS.find(
    (m) => totalTeamPartners < m.partnersRequired
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

        {/* Total Team Partners Calculation Box */}
        <div className="bg-[#0a1828] rounded-2xl p-4 md:p-5 border border-[#00F0FF]/30 shadow-inner mb-6 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Explanation & Breakdown */}
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
            </div>

            {/* Live Count Pill Cards */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <div className="px-3.5 py-2 rounded-xl bg-[#051424] border border-[#1c2b3b] text-center">
                <div className="text-[10px] text-[#94a3b8] font-mono uppercase">Direct Partners</div>
                <div className="text-base font-extrabold font-mono text-white">{directCount}</div>
              </div>

              <span className="text-[#00F0FF] font-bold text-lg">+</span>

              <div className="px-3.5 py-2 rounded-xl bg-[#051424] border border-[#1c2b3b] text-center">
                <div className="text-[10px] text-[#94a3b8] font-mono uppercase">Downline Partners</div>
                <div className="text-base font-extrabold font-mono text-white">{downlineCount}</div>
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
            OFFICIAL TEAM MILESTONE TABLE (MATCHING THE UPLOADED IMAGE)
           ============================================================ */}
        <div className="relative z-10 overflow-hidden rounded-2xl border-2 border-[#00F0FF]/40 bg-[#051424] shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-[#071d33] via-[#092542] to-[#071d33] border-b-2 border-[#00F0FF]/40 text-white font-headline">
                  <th className="py-3.5 px-4 sm:px-6 font-bold tracking-wide flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#00F0FF] text-[20px]">groups</span>
                    <span>Team Partners / Milestone</span>
                  </th>
                  <th className="py-3.5 px-4 sm:px-6 font-bold tracking-wide">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#D4AF37] text-[20px]">featured_seasonal_and_gifts</span>
                      <span>Reward (USDT)</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-4 sm:px-6 font-bold tracking-wide text-right">
                    <span>Unlock Status / Action</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c2b3b]/60">
                {TEAM_MILESTONE_TIERS.map((tier, idx) => {
                  const isReached = totalTeamPartners >= tier.partnersRequired;
                  const isClaimed = claimedIds.includes(tier.id);
                  const isJustClaimed = justClaimedId === tier.id;
                  const progressPct = Math.min(100, Math.round((totalTeamPartners / tier.partnersRequired) * 100));

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
                      <td className="py-3.5 px-4 sm:px-6 font-mono font-semibold text-white">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2 h-2 rounded-full ${isReached ? 'bg-[#00F0FF] shadow-[0_0_8px_#00F0FF]' : 'bg-[#1c2b3b]'}`} />
                          <span className="text-sm sm:text-base font-headline font-bold">
                            {tier.label}
                          </span>
                          {tier.partnersRequired === 10 && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00F0FF]/15 text-[#00F0FF] font-semibold border border-[#00F0FF]/30 hidden sm:inline">
                              Entry Milestone
                            </span>
                          )}
                          {tier.partnersRequired === 500000 && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37] font-bold border border-[#D4AF37]/40 hidden sm:inline">
                              Apex Milestone
                            </span>
                          )}
                        </div>
                        {/* Progress Bar for locked milestones */}
                        {!isReached && (
                          <div className="mt-1.5 pl-4 max-w-xs">
                            <div className="flex justify-between text-[10px] text-[#94a3b8] mb-0.5">
                              <span>Progress: {totalTeamPartners} / {tier.partnersRequired}</span>
                              <span>{progressPct}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-[#0a0f1d] rounded-full overflow-hidden border border-[#1c2b3b]">
                              <div
                                className="h-full bg-gradient-to-r from-[#00F0FF] to-[#D4AF37] rounded-full transition-all duration-500"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Column 2: Reward */}
                      <td className="py-3.5 px-4 sm:px-6 font-mono">
                        <span className="text-base sm:text-lg font-black text-[#00F0FF] drop-shadow-[0_0_10px_rgba(0,240,255,0.35)]">
                          {tier.rewardFormatted}
                        </span>
                        <span className="text-xs text-[#94a3b8] ml-1 font-mono">USDT</span>
                      </td>

                      {/* Column 3: Status / Action */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        {isClaimed ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-headline font-bold text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            <span>Claimed (+{tier.rewardFormatted})</span>
                          </span>
                        ) : isReached ? (
                          <button
                            onClick={() => handleClaim(tier)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-headline font-extrabold text-xs bg-gradient-to-r from-[#00F0FF] via-[#7df4ff] to-[#D4AF37] text-[#0A0F1D] shadow-[0_0_20px_rgba(0,240,255,0.5)] hover:shadow-[0_0_28px_rgba(0,240,255,0.7)] hover:scale-105 active:scale-95 transition-all"
                          >
                            <span className="material-symbols-outlined text-[16px]">payments</span>
                            <span>
                              {isJustClaimed ? 'Claimed!' : `Claim ${tier.rewardFormatted} Reward`}
                            </span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-mono text-xs text-[#94a3b8] bg-[#0a0f1d] border border-[#1c2b3b]">
                            <span className="material-symbols-outlined text-[14px]">lock</span>
                            <span>Locked ({tier.partnersRequired - totalTeamPartners} needed)</span>
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

        {/* Milestone Footer Trust Banner */}
        <div className="mt-4 pt-3 border-t border-[#1c2b3b] flex flex-wrap items-center justify-between gap-3 text-xs text-[#94a3b8] font-mono relative z-10">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00F0FF] text-[16px]">verified</span>
            <span>Non-custodial BEP-20 smart contract payouts settled in liquid USDT</span>
          </div>
          <div className="flex items-center gap-2 text-[#D4AF37]">
            <span className="material-symbols-outlined text-[16px]">military_tech</span>
            <span>Cumulative Rewards: Up to $677,615 USDT Total Career Bonus</span>
          </div>
        </div>
      </div>
    </div>
  );
};
