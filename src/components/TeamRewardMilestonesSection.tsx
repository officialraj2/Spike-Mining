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
  directPartners = 12,
  downlinePartners = 16,
  onClaimReward,
  walletAddress,
}) => {
  // Team counts (Direct + Downline = Total Team Partners)
  const [directCount, setDirectCount] = useState<number>(directPartners);
  const [downlineCount, setDownlineCount] = useState<number>(downlinePartners);
  const totalTeamPartners = directCount + downlineCount;

  // Track claimed milestone IDs
  const [claimedIds, setClaimedIds] = useState<string[]>([]);
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
    setClaimedIds((prev) => [...prev, milestone.id]);
    setJustClaimedId(milestone.id);
    onClaimReward?.(milestone.rewardUsd, milestone.label);
    setTimeout(() => {
      setJustClaimedId(null);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      {/* ============================================================
          TOP ALGORITHM & EMISSION CONTROL ARCHITECTURE (FROM DEMO FILE)
         ============================================================ */}
      <div className="bg-gradient-to-r from-[#071626] via-[#0b2138] to-[#071626] rounded-2xl p-5 md:p-6 border border-[#00F0FF]/30 shadow-[0_0_25px_rgba(0,240,255,0.12)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00F0FF]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1c2b3b]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00F0FF] text-[20px]">memory</span>
            <span className="text-xs font-mono font-bold tracking-[0.16em] uppercase text-[#00F0FF]">
              A Dynamic Hash-Rate Reward Architecture
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#94a3b8] px-2 py-0.5 rounded bg-[#0a0f1d] border border-[#1c2b3b]">
            Verified Protocol Specification
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Core Algorithm (5 cols) */}
          <div className="md:col-span-5 p-4 rounded-xl bg-[#051424]/90 border border-[#00F0FF]/25 space-y-3">
            <div className="flex items-center gap-2 text-white font-headline font-bold text-xs">
              <span className="material-symbols-outlined text-[16px] text-[#00F0FF]">settings</span>
              <span>CORE ALGORITHM</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-[#0a0f1d] border border-[#1c2b3b]/80">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#94a3b8]">
                  <span className="material-symbols-outlined text-[14px] text-[#00F0FF]">group</span>
                  <span>Mining Share:</span>
                </div>
                <div className="text-[11px] font-mono text-white mt-1 pl-5">
                  <span className="text-[#00F0FF]">Mining Share</span> = <span className="underline decoration-[#00F0FF]/50">User Effective Hash Rate</span> / Total Effective Hash Rate
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0a0f1d] border border-[#1c2b3b]/80">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#94a3b8]">
                  <span className="material-symbols-outlined text-[14px] text-[#D4AF37]">featured_seasonal_and_gifts</span>
                  <span>User Reward:</span>
                </div>
                <div className="text-[11px] font-mono text-white mt-1 pl-5">
                  <span className="text-[#D4AF37]">SPIKE Reward</span> = Mining Share × Period Emission
                </div>
              </div>
            </div>
          </div>

          {/* Emission Control (3 cols) */}
          <div className="md:col-span-3 p-4 rounded-xl bg-[#051424]/90 border border-[#00F0FF]/25 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-white font-headline font-bold text-xs mb-3">
                <span className="material-symbols-outlined text-[16px] text-[#00F0FF]">database</span>
                <span>EMISSION CONTROL</span>
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#94a3b8]">
                Maximum Mining Pool
              </div>
              <div className="text-xl lg:text-2xl font-extrabold font-headline text-[#00F0FF] mt-0.5 tracking-tight drop-shadow-[0_0_12px_rgba(0,240,255,0.4)]">
                50,000,000
              </div>
              <div className="text-[10px] font-mono text-[#D4AF37] font-semibold">
                SPIKE COINS (MAX CAPPED)
              </div>
            </div>
            <div className="pt-2 mt-2 border-t border-[#1c2b3b] text-[10px] font-mono text-[#94a3b8]">
              Remaining Supply = 50,000,000 − Total SPIKE Mined
            </div>
          </div>

          {/* Powerful Formula (4 cols) */}
          <div className="md:col-span-4 p-4 rounded-xl bg-[#051424]/90 border border-[#00F0FF]/25 space-y-2">
            <div className="flex items-center gap-2 text-white font-headline font-bold text-xs">
              <span className="material-symbols-outlined text-[16px] text-[#00F0FF]">calculate</span>
              <span>POWERFUL FORMULA</span>
            </div>

            <div className="p-2.5 rounded-lg bg-gradient-to-r from-[#00F0FF]/10 to-[#D4AF37]/10 border border-[#00F0FF]/40 text-center">
              <div className="text-xs sm:text-sm font-mono font-extrabold text-[#00F0FF] tracking-wider">
                Reward = min((<span className="text-white">Hu</span> / <span className="text-white">Ht</span>) × Ep, Rp)
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-[#94a3b8] pt-1">
              <div><strong className="text-white">Hu</strong> = User Effective Hash</div>
              <div><strong className="text-white">Ht</strong> = Total Effective Hash</div>
              <div><strong className="text-white">Ep</strong> = Period Emission</div>
              <div><strong className="text-white">Rp</strong> = Remaining Mined</div>
            </div>
          </div>
        </div>
      </div>

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
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00F0FF] text-[20px]">groups</span>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Total Team Calculation (Direct + Downline Team)
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ENTIRE TEAM CALCULATED
                </span>
              </div>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Yahan aapke <strong className="text-white">khud ke direct partners</strong> aur <strong className="text-white">baki sabhi partner teams ke downstream partners</strong> milakar <strong className="text-[#00F0FF]">Total Team</strong> calculate hoti hai. Jaise hi Total Team required target par pahunchti hai, reward unlock ho jata hai!
              </p>
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

          {/* Quick interactive counter adjustments for testing / simulating network growth */}
          <div className="mt-3.5 pt-3 border-t border-[#1c2b3b]/70 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-[11px] font-mono text-[#94a3b8]">
              Simulate Team Scaling:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {[10, 28, 100, 1000, 5000].map((count) => (
                <button
                  key={count}
                  onClick={() => {
                    const half = Math.floor(count / 2);
                    setDirectCount(half);
                    setDownlineCount(count - half);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all border ${
                    totalTeamPartners === count
                      ? 'bg-[#00F0FF] text-[#0A0F1D] border-[#00F0FF] shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                      : 'bg-[#051424] text-[#94a3b8] hover:text-white border-[#1c2b3b]'
                  }`}
                >
                  {count} Team
                </button>
              ))}
              <button
                onClick={() => {
                  setDirectCount(directPartners);
                  setDownlineCount(downlinePartners);
                }}
                className="px-2 py-1 rounded-lg text-[10px] font-mono text-[#94a3b8] hover:text-[#00F0FF]"
                title="Reset to default"
              >
                Reset
              </button>
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
