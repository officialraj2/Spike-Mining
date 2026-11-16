import React, { useState } from 'react';
import { TEAM_MILESTONE_TIERS, SPIKE_LOGO_URL } from '../data/mockData';
import { TeamMilestoneTier } from '../types';

interface TeamRewardMilestonesSectionProps {
  directPartners?: number;
  downlinePartners?: number;
  levelCounts?: Record<number, number>;
  activeDirectPartners?: number;
  activeDownlinePartners?: number;
  activeLevelCounts?: Record<number, number>;
  onClaimReward?: (amountUsd: number, milestoneName: string) => void;
  walletAddress?: string;
  hasActiveMining?: boolean;
  onOpenDepositModal?: () => void;
}

export const TeamRewardMilestonesSection: React.FC<TeamRewardMilestonesSectionProps> = ({
  directPartners = 0,
  downlinePartners = 0,
  levelCounts,
  activeDirectPartners,
  activeDownlinePartners,
  activeLevelCounts,
  onClaimReward,
  walletAddress,
  hasActiveMining = false,
  onOpenDepositModal,
}) => {
  // Use active miners for milestone unlocking (must have active mining ring)
  const effectiveActiveLevelCounts = activeLevelCounts || { 1: activeDirectPartners || 0, 2: activeDownlinePartners || 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  const effectiveActiveDirects = typeof activeDirectPartners === 'number' ? activeDirectPartners : 0;

  // Helper to determine if a specific unilevel milestone tier is unlocked
  // Strict condition:
  // 1. Current user must have an active mining ring (hasActiveMining === true)
  // 2. Active level count must meet or exceed required partners
  const isTierReached = (tier: TeamMilestoneTier) => {
    if (!hasActiveMining) return false;
    const levelNum = tier.level || 1;
    const countAtLevel = effectiveActiveLevelCounts?.[levelNum] ?? (levelNum === 1 ? effectiveActiveDirects : 0);
    return countAtLevel >= tier.partnersRequired;
  };

  const getTierProgressCount = (tier: TeamMilestoneTier) => {
    const levelNum = tier.level || 1;
    return effectiveActiveLevelCounts?.[levelNum] ?? (levelNum === 1 ? effectiveActiveDirects : 0);
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

  // Keep claimedIds synced if wallet changes or if reset occurs
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(`spike_claimed_milestones_${walletAddress || 'default'}`);
      let parsed: string[] = saved ? JSON.parse(saved) : [];
      // If team partners were reset (e.g. 0 active directs), reset claimed milestones so test starts fresh from scratch
      if (effectiveActiveDirects < 10) {
        parsed = [];
        try {
          localStorage.removeItem(`spike_claimed_milestones_${walletAddress || 'default'}`);
          localStorage.removeItem(`spike_referral_stats_${(walletAddress || '').toLowerCase()}`);
        } catch {}
      }
      setClaimedIds(parsed);
    } catch {
      setClaimedIds([]);
    }
  }, [walletAddress, effectiveActiveDirects]);

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
    if (!hasActiveMining) return;
    if (!isTierReached(milestone)) return;
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
      {/* Mining Inactive Alert if User Has Not Deployed 10$ Ring */}
      {!hasActiveMining && (
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-2 border-amber-500/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_25px_rgba(245,158,11,0.15)]">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <div className="text-white font-bold text-sm sm:text-base flex items-center justify-center sm:justify-start gap-2">
                <span>Mining Ring Activation Required ($10 USDT)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">Locked</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Milestone rewards and referral invitations require an active mining node. Only partners with active nodes count toward team milestones.
              </p>
            </div>
          </div>
          {onOpenDepositModal && (
            <button
              onClick={onOpenDepositModal}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all hover:scale-105 shrink-0"
            >
              Deposit $10 To Activate
            </button>
          )}
        </div>
      )}

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

        {/* ============================================================
            MILESTONE TIER CARD GRIDS (LEVEL 1 - LEVEL 9 INDIVIDUAL BOXES)
           ============================================================ */}
        {(() => {
          const levelColorThemes: Record<number, {
            outerBorder: string;
            reachedBorder: string;
            topAccent: string;
            iconBox: string;
            progressBar: string;
          }> = {
            1: {
              outerBorder: 'border-2 border-cyan-400/65 shadow-[0_0_18px_rgba(34,211,238,0.18)] hover:border-cyan-300 hover:shadow-[0_0_26px_rgba(34,211,238,0.32)]',
              reachedBorder: 'border-2 border-cyan-300 shadow-[0_0_28px_rgba(34,211,238,0.38)]',
              topAccent: 'bg-gradient-to-r from-transparent via-cyan-400 to-transparent',
              iconBox: 'bg-cyan-500/15 border-cyan-400/50 text-cyan-300',
              progressBar: 'bg-gradient-to-r from-cyan-400 to-sky-300',
            },
            2: {
              outerBorder: 'border-2 border-sky-400/65 shadow-[0_0_18px_rgba(56,189,248,0.18)] hover:border-sky-300 hover:shadow-[0_0_26px_rgba(56,189,248,0.32)]',
              reachedBorder: 'border-2 border-sky-300 shadow-[0_0_28px_rgba(56,189,248,0.38)]',
              topAccent: 'bg-gradient-to-r from-transparent via-sky-400 to-transparent',
              iconBox: 'bg-sky-500/15 border-sky-400/50 text-sky-300',
              progressBar: 'bg-gradient-to-r from-sky-400 to-blue-400',
            },
            3: {
              outerBorder: 'border-2 border-emerald-400/65 shadow-[0_0_18px_rgba(52,211,153,0.18)] hover:border-emerald-300 hover:shadow-[0_0_26px_rgba(52,211,153,0.32)]',
              reachedBorder: 'border-2 border-emerald-300 shadow-[0_0_28px_rgba(52,211,153,0.38)]',
              topAccent: 'bg-gradient-to-r from-transparent via-emerald-400 to-transparent',
              iconBox: 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300',
              progressBar: 'bg-gradient-to-r from-emerald-400 to-teal-300',
            },
            4: {
              outerBorder: 'border-2 border-indigo-400/65 shadow-[0_0_18px_rgba(129,140,248,0.2)] hover:border-indigo-300 hover:shadow-[0_0_26px_rgba(129,140,248,0.34)]',
              reachedBorder: 'border-2 border-indigo-300 shadow-[0_0_28px_rgba(129,140,248,0.4)]',
              topAccent: 'bg-gradient-to-r from-transparent via-indigo-400 to-transparent',
              iconBox: 'bg-indigo-500/15 border-indigo-400/50 text-indigo-300',
              progressBar: 'bg-gradient-to-r from-indigo-400 to-violet-400',
            },
            5: {
              outerBorder: 'border-2 border-purple-400/65 shadow-[0_0_18px_rgba(192,132,252,0.2)] hover:border-purple-300 hover:shadow-[0_0_26px_rgba(192,132,252,0.34)]',
              reachedBorder: 'border-2 border-purple-300 shadow-[0_0_28px_rgba(192,132,252,0.4)]',
              topAccent: 'bg-gradient-to-r from-transparent via-purple-400 to-transparent',
              iconBox: 'bg-purple-500/15 border-purple-400/50 text-purple-300',
              progressBar: 'bg-gradient-to-r from-purple-400 to-fuchsia-400',
            },
            6: {
              outerBorder: 'border-2 border-fuchsia-400/65 shadow-[0_0_20px_rgba(232,121,249,0.2)] hover:border-fuchsia-300 hover:shadow-[0_0_28px_rgba(232,121,249,0.34)]',
              reachedBorder: 'border-2 border-fuchsia-300 shadow-[0_0_30px_rgba(232,121,249,0.4)]',
              topAccent: 'bg-gradient-to-r from-transparent via-fuchsia-400 to-transparent',
              iconBox: 'bg-fuchsia-500/15 border-fuchsia-400/50 text-fuchsia-300',
              progressBar: 'bg-gradient-to-r from-fuchsia-400 to-pink-400',
            },
            7: {
              outerBorder: 'border-2 border-rose-400/65 shadow-[0_0_20px_rgba(251,113,133,0.22)] hover:border-rose-300 hover:shadow-[0_0_28px_rgba(251,113,133,0.36)]',
              reachedBorder: 'border-2 border-rose-300 shadow-[0_0_30px_rgba(251,113,133,0.42)]',
              topAccent: 'bg-gradient-to-r from-transparent via-rose-400 to-transparent',
              iconBox: 'bg-rose-500/15 border-rose-400/50 text-rose-300',
              progressBar: 'bg-gradient-to-r from-rose-400 to-orange-400',
            },
            8: {
              outerBorder: 'border-2 border-amber-400/70 shadow-[0_0_22px_rgba(251,191,36,0.22)] hover:border-amber-300 hover:shadow-[0_0_30px_rgba(251,191,36,0.38)]',
              reachedBorder: 'border-2 border-amber-300 shadow-[0_0_32px_rgba(251,191,36,0.44)]',
              topAccent: 'bg-gradient-to-r from-transparent via-amber-400 to-transparent',
              iconBox: 'bg-amber-500/15 border-amber-400/55 text-amber-300',
              progressBar: 'bg-gradient-to-r from-amber-400 to-yellow-300',
            },
            9: {
              outerBorder: 'border-2 border-[#D4AF37]/85 shadow-[0_0_26px_rgba(212,175,55,0.28)] hover:border-[#ffe088] hover:shadow-[0_0_34px_rgba(255,224,136,0.45)]',
              reachedBorder: 'border-2 border-[#ffe088] shadow-[0_0_36px_rgba(212,175,55,0.52)]',
              topAccent: 'bg-gradient-to-r from-transparent via-[#ffe088] to-transparent',
              iconBox: 'bg-[#D4AF37]/20 border-[#D4AF37]/60 text-[#ffe088]',
              progressBar: 'bg-gradient-to-r from-[#D4AF37] via-[#ffe088] to-[#00F0FF]',
            },
          };

          return (
            <div className="space-y-6 relative z-10">
              {/* CONSOLE 1: CORE CAREER MILESTONES (LEVELS 1 - 5) */}
              <div className="rounded-2xl border-2 border-[#00F0FF]/40 bg-[#051424]/95 overflow-hidden animate-box-glow-cyan">
                {/* Box 1 Header */}
                <div className="bg-gradient-to-r from-[#071d33] via-[#092542] to-[#071d33] px-4 sm:px-5 py-3.5 border-b border-[#00F0FF]/30 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#00F0FF]/15 border border-[#00F0FF]/40 flex items-center justify-center text-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.2)]">
                      <span className="material-symbols-outlined text-[20px]">verified</span>
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold font-headline text-white tracking-wide">
                        Core Career Milestones
                      </h3>
                      <p className="text-xs text-[#00F0FF] font-body">
                        Level 1 – Level 5 · Community Growth Tiers
                      </p>
                    </div>
                  </div>
                </div>

                {/* 5 Individual Stylish Cards for Levels 1 to 5 */}
                <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
                  {TEAM_MILESTONE_TIERS.slice(0, 5).map((tier) => {
                    const isReached = isTierReached(tier);
                    const isClaimed = claimedIds.includes(tier.id);
                    const isJustClaimed = justClaimedId === tier.id;
                    const currentLevelCount = getTierProgressCount(tier);
                    const progressPct = Math.min(100, Math.round((currentLevelCount / tier.partnersRequired) * 100));
                    const remainingCount = Math.max(0, tier.partnersRequired - currentLevelCount);
                    const coreIcons = ['bolt', 'groups', 'hub', 'verified', 'workspace_premium'];
                    const tierIcon = coreIcons[(tier.level - 1) % coreIcons.length] || 'bolt';
                    const theme = levelColorThemes[tier.level] || levelColorThemes[1];

                    return (
                      <div
                        key={tier.id}
                        className={`group relative rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 overflow-hidden hover:-translate-y-0.5 ${
                          isReached
                            ? `bg-gradient-to-b from-[#0b2640] via-[#071a2d] to-[#04101d] ${theme.reachedBorder}`
                            : `bg-gradient-to-b from-[#08192b]/95 via-[#061424] to-[#040e1a] ${theme.outerBorder}`
                        }`}
                      >
                        {/* Distinct Colorful Top Accent Bar */}
                        <div className={`absolute top-0 inset-x-0 h-[2px] ${theme.topAccent}`} />

                        {/* Card Top Row: Level Badge + Status */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${theme.iconBox}`}>
                              <span className="material-symbols-outlined text-[16px]">{tierIcon}</span>
                            </div>
                            <span className="text-xs font-headline font-extrabold tracking-wider uppercase text-white">
                              Level {tier.level}
                            </span>
                          </div>

                          {isClaimed ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-headline font-bold uppercase tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              <span className="material-symbols-outlined text-[12px]">check_circle</span>
                              Claimed
                            </span>
                          ) : isReached ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-headline font-bold uppercase tracking-wide bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/45">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-pulse" />
                              Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-body font-semibold text-slate-400 bg-[#050f1b] border border-[#1c2b3b]">
                              <span className="material-symbols-outlined text-[11px]">lock</span>
                              Locked
                            </span>
                          )}
                        </div>

                        {/* Center Reward Showcase */}
                        <div className="rounded-xl bg-[#040f1c]/90 border border-[#1c2b3b]/80 px-3 py-2.5 mb-3 text-center relative overflow-hidden">
                          <div className="text-[10px] font-headline uppercase tracking-widest text-slate-400 mb-0.5">
                            Milestone Reward
                          </div>
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-xl sm:text-2xl font-black font-headline tabular-nums text-[#D4AF37] text-glow-gold">
                              {tier.rewardFormatted}
                            </span>
                            <span className="text-[11px] font-headline font-bold text-[#00F0FF]/85">
                              USDT
                            </span>
                          </div>
                          <div className="text-[11px] font-body text-slate-300 mt-1">
                            {tier.level === 1
                              ? '10 Direct Active Partners'
                              : `${tier.partnersRequired.toLocaleString()} L${tier.level} Team Partners`}
                          </div>
                        </div>

                        {/* Progress Bar & Action Footer */}
                        <div className="space-y-2.5">
                          <div>
                            <div className="flex items-center justify-between text-[11px] font-body mb-1">
                              <span className="text-slate-300 tabular-nums font-medium">
                                {currentLevelCount.toLocaleString()} / {tier.partnersRequired.toLocaleString()}
                              </span>
                              <span className={`font-headline font-bold tabular-nums ${isReached ? 'text-[#00F0FF]' : 'text-slate-400'}`}>
                                {progressPct}%
                              </span>
                            </div>
                            <div className="w-full h-2 bg-[#030b14] rounded-full overflow-hidden border border-[#1c2b3b]">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isClaimed
                                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-300'
                                    : theme.progressBar
                                }`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>

                          {isClaimed ? (
                            <div className="w-full py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 font-headline font-bold text-xs flex items-center justify-center gap-1.5">
                              <span className="material-symbols-outlined text-[15px]">check_circle</span>
                              <span>Reward Claimed</span>
                            </div>
                          ) : isReached ? (
                            <button
                              onClick={() => handleClaim(tier)}
                              className="w-full py-2 rounded-xl font-headline font-extrabold text-xs bg-gradient-to-r from-[#00F0FF] to-[#D4AF37] text-[#051424] shadow-[0_0_16px_rgba(0,240,255,0.4)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-[16px]">payments</span>
                              <span>{isJustClaimed ? 'Claimed!' : `Claim ${tier.rewardFormatted}`}</span>
                            </button>
                          ) : (
                            <div className="w-full py-1.5 px-2.5 rounded-xl bg-[#040c16] border border-[#1c2b3b] text-slate-400 font-body text-[11px] flex items-center justify-center gap-1.5 tabular-nums">
                              <span className="material-symbols-outlined text-[13px] text-[#00F0FF]/70">lock</span>
                              <span>{remainingCount.toLocaleString()} partners left</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CONSOLE 2: APEX LEADERSHIP MILESTONES (LEVELS 6 - 9) */}
              <div className="rounded-2xl border-2 border-[#D4AF37]/45 bg-[#051424]/95 overflow-hidden animate-box-glow-gold">
                {/* Box 2 Header */}
                <div className="bg-gradient-to-r from-[#1c1806] via-[#282209] to-[#1c1806] px-4 sm:px-5 py-3.5 border-b border-[#D4AF37]/30 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/45 flex items-center justify-center text-[#D4AF37] shadow-[0_0_14px_rgba(212,175,55,0.22)]">
                      <span className="material-symbols-outlined text-[20px]">military_tech</span>
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold font-headline text-white tracking-wide">
                        Apex Leadership Milestones
                      </h3>
                      <p className="text-xs text-[#D4AF37] font-body">
                        Level 6 – Level 9 · High-Volume Fleet Tiers
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4 Individual Stylish Cards for Levels 6 to 9 */}
                <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {TEAM_MILESTONE_TIERS.slice(5).map((tier) => {
                    const isReached = isTierReached(tier);
                    const isClaimed = claimedIds.includes(tier.id);
                    const isJustClaimed = justClaimedId === tier.id;
                    const currentLevelCount = getTierProgressCount(tier);
                    const progressPct = Math.min(100, Math.round((currentLevelCount / tier.partnersRequired) * 100));
                    const remainingCount = Math.max(0, tier.partnersRequired - currentLevelCount);
                    const apexIcons = ['stars', 'diamond', 'military_tech', 'emoji_events'];
                    const tierIcon = apexIcons[(tier.level - 6) % apexIcons.length] || 'military_tech';
                    const theme = levelColorThemes[tier.level] || levelColorThemes[9];

                    return (
                      <div
                        key={tier.id}
                        className={`group relative rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 overflow-hidden hover:-translate-y-0.5 ${
                          isReached
                            ? `bg-gradient-to-b from-[#251e0b] via-[#15140d] to-[#051424] ${theme.reachedBorder}`
                            : `bg-gradient-to-b from-[#131217]/95 via-[#091422] to-[#040e1a] ${theme.outerBorder}`
                        }`}
                      >
                        {/* Distinct Colorful Top Accent Bar */}
                        <div className={`absolute top-0 inset-x-0 h-[2px] ${theme.topAccent}`} />

                        {/* Card Top Row: Level Badge + Status */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${theme.iconBox}`}>
                              <span className="material-symbols-outlined text-[16px]">{tierIcon}</span>
                            </div>
                            <span className="text-xs font-headline font-extrabold tracking-wider uppercase text-white">
                              Level {tier.level}
                            </span>
                          </div>

                          {isClaimed ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-headline font-bold uppercase tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              <span className="material-symbols-outlined text-[12px]">check_circle</span>
                              Claimed
                            </span>
                          ) : isReached ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-headline font-bold uppercase tracking-wide bg-[#D4AF37]/25 text-[#ffe088] border border-[#D4AF37]/55">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#ffe088] animate-pulse" />
                              Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-body font-semibold text-slate-400 bg-[#0b1119] border border-[#1c2b3b]">
                              <span className="material-symbols-outlined text-[11px]">lock</span>
                              Locked
                            </span>
                          )}
                        </div>

                        {/* Center Reward Showcase */}
                        <div className="rounded-xl bg-[#070d16]/90 border border-[#D4AF37]/20 px-3 py-3 mb-3 text-center relative overflow-hidden">
                          <div className="text-[10px] font-headline uppercase tracking-widest text-[#D4AF37]/80 mb-0.5">
                            Apex Bonus Pool
                          </div>
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-xl sm:text-2xl font-black font-headline tabular-nums text-[#ffe088] text-glow-gold">
                              {tier.rewardFormatted}
                            </span>
                            <span className="text-[11px] font-headline font-bold text-[#D4AF37]">
                              USDT
                            </span>
                          </div>
                          <div className="text-[11px] font-body text-slate-300 mt-1">
                            {tier.partnersRequired.toLocaleString()} L{tier.level} Team Partners
                          </div>
                        </div>

                        {/* Progress Bar & Action Footer */}
                        <div className="space-y-2.5">
                          <div>
                            <div className="flex items-center justify-between text-[11px] font-body mb-1">
                              <span className="text-slate-300 tabular-nums font-medium">
                                {currentLevelCount.toLocaleString()} / {tier.partnersRequired.toLocaleString()}
                              </span>
                              <span className={`font-headline font-bold tabular-nums ${isReached ? 'text-[#ffe088]' : 'text-slate-400'}`}>
                                {progressPct}%
                              </span>
                            </div>
                            <div className="w-full h-2 bg-[#040911] rounded-full overflow-hidden border border-[#1c2b3b]">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isClaimed
                                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-300'
                                    : theme.progressBar
                                }`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>

                          {isClaimed ? (
                            <div className="w-full py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 font-headline font-bold text-xs flex items-center justify-center gap-1.5">
                              <span className="material-symbols-outlined text-[15px]">check_circle</span>
                              <span>Reward Claimed</span>
                            </div>
                          ) : isReached ? (
                            <button
                              onClick={() => handleClaim(tier)}
                              className="w-full py-2 rounded-xl font-headline font-extrabold text-xs bg-gradient-to-r from-[#D4AF37] to-[#ffe088] text-[#051424] shadow-[0_0_18px_rgba(212,175,55,0.45)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-[16px]">payments</span>
                              <span>{isJustClaimed ? 'Claimed!' : `Claim ${tier.rewardFormatted}`}</span>
                            </button>
                          ) : (
                            <div className="w-full py-1.5 px-2.5 rounded-xl bg-[#070d16] border border-[#1c2b3b] text-slate-400 font-body text-[11px] flex items-center justify-center gap-1.5 tabular-nums">
                              <span className="material-symbols-outlined text-[13px] text-[#D4AF37]/80">lock</span>
                              <span>{remainingCount.toLocaleString()} partners left</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Milestone Footer Trust Banner */}
        <div className="mt-4 pt-3 border-t border-[#1c2b3b] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-body relative z-10">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00F0FF] text-[18px]">verified</span>
            <span>Non-custodial BEP-20 smart contract payouts settled in liquid USDT</span>
          </div>
          <div className="flex items-center gap-2 text-[#D4AF37] font-semibold">
            <span className="material-symbols-outlined text-[18px]">military_tech</span>
            <span>Cumulative Rewards: Up to $980,230 USDT Total Career Bonus</span>
          </div>
        </div>
      </div>
    </div>
  );
};
