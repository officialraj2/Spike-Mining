import React, { useState } from 'react';
import { REFERRAL_TIERS, TEAM_MILESTONE_TIERS } from '../../data/mockData';
import { TeamRewardMilestonesSection } from '../TeamRewardMilestonesSection';

interface ReferralsViewProps {
  walletAddress: string;
  onCopyText: (text: string) => void;
  onClaimReferralRewards: (amount: number) => void;
}

export const ReferralsView: React.FC<ReferralsViewProps> = ({
  walletAddress,
  onCopyText,
  onClaimReferralRewards,
}) => {
  const shortAddr = walletAddress.slice(2, 8).toUpperCase();
  const refCode = `SPIKE-${shortAddr}`;
  const baseDomain = typeof window !== 'undefined' && window.location.origin.includes('spikenodes.com')
    ? window.location.origin
    : 'https://spikenodes.com';
  const refLink = `${baseDomain}/ref/${shortAddr}`;
  const [copied, setCopied] = useState(false);

  // Total Team state
  const directPartners = 12;
  const downlinePartners = 16;
  const totalTeamPartners = directPartners + downlinePartners;
  const [claimedMilestones, setClaimedMilestones] = useState<string[]>([]);
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
    onClaimReferralRewards(amountUsd);
    setClaimSuccess(milestoneLabel);
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
              setClaimedMilestones((prev) => [...prev, nextClaimable.id]);
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
      <div className="bg-[#122130] rounded-xl p-5 md:p-6 border border-[#1c2b3b]/60 shadow-md">
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
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#122130] rounded-xl p-5 border border-[#1c2b3b]/60">
          <div className="text-[10px] text-[#94a3b8] font-mono font-semibold uppercase tracking-[0.14em]">Total Referrals</div>
          <div className="text-3xl font-extrabold font-headline text-white mt-1 tabular-nums tracking-tight">28</div>
          <div className="text-xs text-[#7df4ff] font-mono mt-1 font-medium">Across 2 tiers</div>
        </div>

        <div className="bg-[#122130] rounded-xl p-5 border border-[#1c2b3b]/60">
          <div className="text-[10px] text-[#94a3b8] font-mono font-semibold uppercase tracking-[0.14em]">Active Miners</div>
          <div className="text-3xl font-extrabold font-headline text-[#00F0FF] mt-1 tabular-nums tracking-tight">19</div>
          <div className="text-xs text-[#94a3b8] font-mono mt-1">67.8% conversion rate</div>
        </div>

        <div className="bg-[#122130] rounded-xl p-5 border border-[#1c2b3b]/60">
          <div className="text-[10px] text-[#94a3b8] font-mono font-semibold uppercase tracking-[0.14em]">Total Earned</div>
          <div className="text-3xl font-extrabold font-headline text-[#D4AF37] mt-1 tabular-nums tracking-tight">
            +428.50 <span className="text-sm text-white font-semibold">USDT</span>
          </div>
          <div className="text-xs text-[#D4AF37] font-mono mt-1 font-medium">Direct wallet settlements</div>
        </div>

        <div className="bg-[#122130] rounded-xl p-5 border border-[#1c2b3b]/60">
          <div className="text-[10px] text-[#94a3b8] font-mono font-semibold uppercase tracking-[0.14em]">Hashrate Boost</div>
          <div className="text-3xl font-extrabold font-headline text-white mt-1 tabular-nums tracking-tight">
            +5.8% <span className="text-sm text-[#00F0FF] font-semibold">TH/s</span>
          </div>
          <div className="text-xs text-emerald-400 font-mono mt-1 font-medium">Team validator perk</div>
        </div>
      </div>

      {/* Tier Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {REFERRAL_TIERS.map((tier) => (
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
                <div className="text-lg font-bold font-mono text-white mt-0.5">{tier.totalMembers}</div>
              </div>
              <div>
                <div className="text-[#c6c6cc]">Active Rigs</div>
                <div className="text-lg font-bold font-mono text-[#00F0FF] mt-0.5">{tier.activeMiners}</div>
              </div>
              <div>
                <div className="text-[#c6c6cc]">Earned</div>
                <div className="text-lg font-bold font-mono text-[#D4AF37] mt-0.5">
                  +{tier.earningsUsdt.toFixed(2)} USDT
                </div>
              </div>
            </div>
          </div>
        ))}
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
              {[
                { user: '0x4f12...99a0', tier: 'Tier 1', rig: '0.65 TH/s Turbo', comm: '+18.50 USDT', date: 'Today, 08:30 UTC' },
                { user: '0x88c1...120e', tier: 'Tier 1', rig: '0.31 TH/s Standard', comm: '+12.25 USDT', date: '2 days ago' },
                { user: '0xa091...f3c4', tier: 'Tier 2', rig: '0.31 TH/s Standard', comm: '+6.12 USDT', date: '4 days ago' },
                { user: '0x32de...84b1', tier: 'Tier 1', rig: '1.25 TH/s Enterprise', comm: '+35.00 USDT', date: '1 week ago' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-[#1c2b3b]/30">
                  <td className="py-3 px-3 font-mono text-[#00F0FF]">{row.user}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#1c2b3b] text-white">
                      {row.tier}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-white font-mono">{row.rig}</td>
                  <td className="py-3 px-3 text-[#D4AF37] font-bold font-mono">{row.comm}</td>
                  <td className="py-3 px-3 text-[#c6c6cc] text-right">{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
