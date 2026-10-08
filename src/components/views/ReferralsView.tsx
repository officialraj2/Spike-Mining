import React, { useState } from 'react';
import { REFERRAL_TIERS, TEAM_MILESTONE_TIERS } from '../../data/mockData';
import { TeamRewardMilestonesSection } from '../TeamRewardMilestonesSection';

export interface ReferralStatsData {
  directPartners: number;
  downlinePartners: number;
  totalPartners: number;
  totalCommissions: number;
  referrals: Array<{
    id: string;
    referrerAddress: string;
    refereeAddress: string;
    tier: number;
    commissionUsdt: number;
    volumeUsdt: number;
    createdAt: string;
  }>;
}

interface ReferralsViewProps {
  walletAddress: string;
  onCopyText: (text: string) => void;
  onClaimReferralRewards: (amount: number, label?: string) => void;
  referralStats?: ReferralStatsData;
  onSimulateReferral?: () => void;
}

export const ReferralsView: React.FC<ReferralsViewProps> = ({
  walletAddress,
  onCopyText,
  onClaimReferralRewards,
  referralStats,
  onSimulateReferral,
}) => {
  const shortAddr = walletAddress ? walletAddress.slice(2, 8).toUpperCase() : 'USER';
  const refCode = `SPIKE-${shortAddr}`;
  const baseDomain = typeof window !== 'undefined' && window.location.origin.includes('spikenodes.com')
    ? window.location.origin
    : 'https://spikenodes.com';
  const refLink = `${baseDomain}/ref/${shortAddr}`;
  const [copied, setCopied] = useState(false);

  // Total Team state from real props (defaults to 0 for a fresh wallet)
  const directPartners = referralStats?.directPartners ?? 0;
  const downlinePartners = referralStats?.downlinePartners ?? 0;
  const totalTeamPartners = directPartners + downlinePartners;
  const totalEarnedUsdt = referralStats?.totalCommissions ?? 0;
  const referralsList = referralStats?.referrals ?? [];

  // Track claimed milestone IDs per wallet
  const storageKey = `spike_claimed_milestones_${walletAddress || 'default'}`;
  const [claimedMilestones, setClaimedMilestones] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(`spike_claimed_milestones_${walletAddress || 'default'}`);
      setClaimedMilestones(saved ? JSON.parse(saved) : []);
    } catch {
      setClaimedMilestones([]);
    }
  }, [walletAddress]);

  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);

  const nextClaimable = TEAM_MILESTONE_TIERS.find(
    (m) => totalTeamPartners >= m.partnersRequired && !claimedMilestones.includes(m.id)
  );
  const nextLocked = TEAM_MILESTONE_TIERS.find(
    (m) => totalTeamPartners < m.partnersRequired
  );

  const handleCopy = () => {
    onCopyText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClaimMilestone = (amountUsd: number, milestoneLabel: string) => {
    onClaimReferralRewards(amountUsd, milestoneLabel);
    setClaimSuccess(milestoneLabel);
    setClaimedMilestones((prev) => {
      const updated = [...prev, nextClaimable?.id || ''];
      try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch {}
      return updated;
    });
    setTimeout(() => setClaimSuccess(null), 3500);
  };

  return (
    <div className="flex flex-col w-full space-y-6 md:space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.16em] text-[#00F0FF]">
            SPIKE Team-Based Reward Program
          </span>
          <h1 className="text-2xl md:text-3xl font-black font-headline text-white tracking-tight mt-0.5">
            Build the Team. Unlock the Reward.
          </h1>
          <p className="text-xs md:text-sm text-[#94a3b8] mt-0.5">
            Grow your network. Reach team milestones. Unlock higher rewards (tabhi milta hai jab total team partners milestone hit karte hain).
          </p>
        </div>

        {nextClaimable ? (
          <button
            onClick={() => {
              handleClaimMilestone(nextClaimable.rewardUsd, nextClaimable.label);
            }}
            className="bg-gradient-to-r from-[#D4AF37] via-[#ffe088] to-[#00F0FF] text-[#0A0F1D] font-headline font-black text-xs px-5 py-3 rounded-xl transition-all flex items-center gap-2 self-start md:self-auto shadow-[0_0_22px_rgba(212,175,55,0.45)] hover:scale-105 active:scale-95 tracking-wide shrink-0 animate-pulse"
          >
            <span className="material-symbols-outlined text-[18px]">payments</span>
            <span>
              {claimSuccess
                ? 'Claimed Successfully!'
                : `Claim ${nextClaimable.label} Reward (+${nextClaimable.rewardFormatted} USDT)`}
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-2.5 bg-[#122130] px-4 py-2.5 rounded-xl border border-[#00F0FF]/30 self-start md:self-auto shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-[#00F0FF] text-[18px]">military_tech</span>
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-mono text-[#94a3b8] uppercase">Next Milestone Target</span>
              <span className="text-xs font-mono font-bold text-white">
                {nextLocked
                  ? `${nextLocked.rewardFormatted} at ${nextLocked.label} (${totalTeamPartners} / ${nextLocked.partnersRequired})`
                  : 'All Career Milestones Unlocked!'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Referral Link & Code Box */}
      <div className="bg-[#122130] rounded-xl p-5 md:p-6 border border-[#1c2b3b]/60 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex-1">
            <span className="text-[10px] text-[#94a3b8] font-mono font-semibold uppercase tracking-[0.14em]">Your Unique Referral Link</span>
            <div className="mt-2 flex items-center gap-2 bg-[#0a0f1d] border border-[#1c2b3b] rounded-xl p-2.5">
              <span className="material-symbols-outlined text-[#00F0FF] text-[18px] ml-1">link</span>
              <span className="text-white font-mono text-xs sm:text-sm truncate flex-1 tracking-tight">{refLink}</span>
              <button
                onClick={handleCopy}
                className="px-3.5 py-1.5 rounded-lg bg-[#00F0FF] text-[#0A0F1D] font-bold text-xs font-headline hover:bg-[#7df4ff] transition-all flex items-center gap-1 shrink-0 tracking-wide"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copied ? 'check' : 'content_copy'}
                </span>
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          <div className="md:w-64 p-3 rounded-xl bg-[#0a0f1d] border border-[#1c2b3b] flex items-center justify-between">
            <div>
              <div className="text-[10px] text-[#94a3b8] font-mono uppercase tracking-[0.12em]">Referral Code</div>
              <div className="text-base font-bold font-mono text-[#D4AF37] mt-0.5 tracking-wider">{refCode}</div>
            </div>
            <button
              onClick={() => onCopyText(refCode)}
              className="p-2 rounded-lg bg-[#1c2b3b] hover:bg-[#273647] text-[#00F0FF] text-xs transition-colors"
              title="Copy Code"
            >
              <span className="material-symbols-outlined text-[18px]">content_copy</span>
            </button>
          </div>
        </div>

        {/* Live Invitation & Referral Simulation Action Bar */}
        <div className="pt-3 border-t border-[#1c2b3b] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a0f1d]/50 p-3 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-[#94a3b8]">
              Send this link to partners. Each active miner joining gives you <strong className="text-white">10% direct hashrate commission</strong> and counts toward milestone bonus targets.
            </span>
          </div>

          {onSimulateReferral && (
            <button
              onClick={onSimulateReferral}
              className="px-4 py-2 rounded-xl bg-[#1c2b3b] hover:bg-[#273647] border border-[#00F0FF]/40 text-[#00F0FF] hover:text-white text-xs font-headline font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto shrink-0 shadow-sm"
              title="Test referral join counter: adds a new partner and triggers commission"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              <span>Test Referral Join (+1 Partner)</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#122130] rounded-xl p-5 border border-[#1c2b3b]/60">
          <div className="text-[10px] text-[#94a3b8] font-mono font-semibold uppercase tracking-[0.14em]">Total Referrals</div>
          <div className="text-3xl font-extrabold font-headline text-white mt-1 tabular-nums tracking-tight">
            {totalTeamPartners}
          </div>
          <div className="text-xs text-[#7df4ff] font-mono mt-1 font-medium">
            {directPartners} Direct · {downlinePartners} Downline
          </div>
        </div>

        <div className="bg-[#122130] rounded-xl p-5 border border-[#1c2b3b]/60">
          <div className="text-[10px] text-[#94a3b8] font-mono font-semibold uppercase tracking-[0.14em]">Active Miners</div>
          <div className="text-3xl font-extrabold font-headline text-[#00F0FF] mt-1 tabular-nums tracking-tight">
            {totalTeamPartners > 0 ? Math.round(totalTeamPartners * 0.75) : 0}
          </div>
          <div className="text-xs text-[#94a3b8] font-mono mt-1">
            {totalTeamPartners > 0 ? '75% conversion rate' : 'No active miners yet'}
          </div>
        </div>

        <div className="bg-[#122130] rounded-xl p-5 border border-[#1c2b3b]/60">
          <div className="text-[10px] text-[#94a3b8] font-mono font-semibold uppercase tracking-[0.14em]">Total Earned</div>
          <div className="text-3xl font-extrabold font-headline text-[#D4AF37] mt-1 tabular-nums tracking-tight">
            +{totalEarnedUsdt.toFixed(2)} <span className="text-sm text-white font-semibold">USDT</span>
          </div>
          <div className="text-xs text-[#D4AF37] font-mono mt-1 font-medium">Direct wallet settlements</div>
        </div>

        <div className="bg-[#122130] rounded-xl p-5 border border-[#1c2b3b]/60">
          <div className="text-[10px] text-[#94a3b8] font-mono font-semibold uppercase tracking-[0.14em]">Hashrate Boost</div>
          <div className="text-3xl font-extrabold font-headline text-white mt-1 tabular-nums tracking-tight">
            +{totalTeamPartners > 0 ? (totalTeamPartners * 0.2).toFixed(1) : '0.0'}% <span className="text-sm text-[#00F0FF] font-semibold">TH/s</span>
          </div>
          <div className="text-xs text-emerald-400 font-mono mt-1 font-medium">Team validator perk</div>
        </div>
      </div>

      {/* Tier Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {REFERRAL_TIERS.map((tier) => {
          const members = tier.tier === 1 ? directPartners : downlinePartners;
          const activeMiners = members > 0 ? Math.round(members * 0.75) : 0;
          const earned = tier.tier === 1 ? totalEarnedUsdt * 0.8 : totalEarnedUsdt * 0.2;

          return (
            <div
              key={tier.tier}
              className="bg-[#122130] rounded-xl p-6 border border-[#1c2b3b] shadow-md"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#00F0FF]/10 text-[#00F0FF] flex items-center justify-center font-headline font-bold text-lg">
                    T{tier.tier}
                  </div>
                  <div>
                    <h3 className="font-bold text-base font-headline text-white">
                      Tier {tier.tier} Direct Network
                    </h3>
                    <div className="text-xs text-[#c6c6cc]">
                      {tier.tier === 1 ? 'Direct invites from your link' : 'Sub-referrals invited by your network'}
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-[#00F0FF]/15 text-[#00F0FF]">
                  {tier.percentage}% Lifetime Payout
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#0a0f1d] border border-[#1c2b3b] text-center text-xs">
                <div>
                  <div className="text-[#c6c6cc]">Members</div>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">{members}</div>
                </div>
                <div>
                  <div className="text-[#c6c6cc]">Active Rigs</div>
                  <div className="text-lg font-bold font-mono text-[#00F0FF] mt-0.5">{activeMiners}</div>
                </div>
                <div>
                  <div className="text-[#c6c6cc]">Earned</div>
                  <div className="text-lg font-bold font-mono text-[#D4AF37] mt-0.5">
                    +{earned.toFixed(2)} USDT
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Official Team-Based Reward Program Milestones */}
      <TeamRewardMilestonesSection
        directPartners={directPartners}
        downlinePartners={downlinePartners}
        onClaimReward={handleClaimMilestone}
        walletAddress={walletAddress}
      />

      {/* Recent Referral Activity Table */}
      <div className="bg-[#122130] rounded-xl p-5 md:p-6 border border-[#1c2b3b] shadow-md">
        <h2 className="text-lg font-bold font-headline text-white mb-1">Recent Affiliate Activity</h2>
        <p className="text-xs text-[#c6c6cc] mb-4">Real-time commissions credited from referred hash power</p>

        {referralsList.length === 0 ? (
          <div className="py-10 px-4 rounded-xl bg-[#0a0f1d] border border-[#1c2b3b] text-center flex flex-col items-center justify-center space-y-2.5">
            <div className="w-12 h-12 rounded-xl bg-[#00F0FF]/10 text-[#00F0FF] flex items-center justify-center border border-[#00F0FF]/25 shadow-sm">
              <span className="material-symbols-outlined text-[26px]">group_add</span>
            </div>
            <div className="max-w-md">
              <h3 className="text-sm font-bold font-headline text-white">No Referred Partners Yet</h3>
              <p className="text-xs text-[#94a3b8] mt-0.5 leading-relaxed">
                Share your unique link above. As partners join and activate mining nodes, commissions and volume will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-[#c6c6cc] font-headline border-b border-[#1c2b3b]">
                  <th className="py-2.5 px-3">Invited Member</th>
                  <th className="py-2.5 px-3">Tier</th>
                  <th className="py-2.5 px-3">Rig Deployed</th>
                  <th className="py-2.5 px-3">Your Commission</th>
                  <th className="py-2.5 px-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c2b3b]/40">
                {referralsList.map((ref, i) => (
                  <tr key={ref.id || i} className="hover:bg-[#1c2b3b]/30">
                    <td className="py-3 px-3 font-mono text-[#00F0FF]">
                      {ref.refereeAddress ? `${ref.refereeAddress.slice(0, 6)}...${ref.refereeAddress.slice(-4)}` : '0xUnknown'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#1c2b3b] text-white">
                        Tier {ref.tier}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-white font-mono">
                      {ref.volumeUsdt ? `$${ref.volumeUsdt.toFixed(0)} Hash Allocation` : 'Mining Rig'}
                    </td>
                    <td className="py-3 px-3 text-[#D4AF37] font-bold font-mono">
                      +{ref.commissionUsdt.toFixed(2)} USDT
                    </td>
                    <td className="py-3 px-3 text-[#c6c6cc] text-right">
                      {ref.createdAt ? new Date(ref.createdAt).toLocaleDateString() : 'Recent'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
