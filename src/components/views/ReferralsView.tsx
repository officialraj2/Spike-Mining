import React, { useState, useEffect } from 'react';
import { TEAM_MILESTONE_TIERS } from '../../data/mockData';
import { TeamRewardMilestonesSection } from '../TeamRewardMilestonesSection';
import { HashrateLevelInfo } from '../../types';

export interface WithdrawalItem {
  id: string;
  userAddress: string;
  destinationAddress: string;
  amount: number;
  source?: string;
  milestoneLabel?: string;
  status: 'pending' | 'approved' | 'rejected';
  txHash?: string;
  adminNote?: string;
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface ReferralStatsData {
  directPartners: number;
  downlinePartners: number;
  totalPartners: number;
  totalCommissions: number;
  milestoneRewardsClaimed?: number;
  withdrawals?: WithdrawalItem[];
  pendingWithdrawalsAmount?: number;
  approvedWithdrawalsAmount?: number;
  referrals: Array<{
    id: string;
    referrerAddress: string;
    refereeAddress: string;
    tier: number;
    commissionUsdt: number;
    volumeUsdt: number;
    createdAt: string;
  }>;
  referredBy?: string | null;
}

interface ReferralsViewProps {
  walletAddress: string;
  hashrateInfo?: HashrateLevelInfo | null;
  onCopyText: (text: string) => void;
  onClaimReferralRewards: (amount: number, label?: string) => void;
  referralStats?: ReferralStatsData;
  onBindSponsor?: (codeOrAddr: string) => Promise<boolean>;
  onOpenVerificationModal?: (code?: string) => void;
}

export const ReferralsView: React.FC<ReferralsViewProps> = ({
  walletAddress,
  hashrateInfo,
  onCopyText,
  onClaimReferralRewards,
  referralStats,
  onBindSponsor,
  onOpenVerificationModal,
}) => {
  const normAddr = walletAddress ? walletAddress.toLowerCase() : '';
  const shortAddr = walletAddress ? walletAddress.slice(2, 8).toUpperCase() : 'USER';
  const refCode = `SPK-${shortAddr}`;

  // Automatically register and sync this connected wallet as an active sponsor on the backend
  useEffect(() => {
    if (walletAddress && walletAddress.startsWith('0x')) {
      fetch('/api/referrals/sync-sponsor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: walletAddress, referralCode: refCode }),
      }).catch(() => {});
    }
  }, [walletAddress, refCode]);

  // Current active origin (auto-adapts to testing preview, localhost, or production)
  const currentOrigin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://spikenodes.com';

  const isPreviewOrDev = typeof window !== 'undefined' && (
    window.location.hostname.includes('run.app') ||
    window.location.hostname.includes('localhost') ||
    window.location.hostname.includes('127.0.0.1')
  );

  // Official production domain (spikenodes.com) for all public referral links
  const selectedBaseOrigin = 'https://spikenodes.com';
  const [linkFormat, setLinkFormat] = useState<'short' | 'full'>('short');

  // Short referral link with sponsor wallet parameter for 100% deterministic matching
  const shortRefLink = walletAddress
    ? `${selectedBaseOrigin}/ref/${refCode}?sponsor=${walletAddress}`
    : `${selectedBaseOrigin}/ref/${refCode}`;

  // Universal address link fallback
  const fullRefLink = walletAddress ? `${selectedBaseOrigin}/?ref=${walletAddress}` : `${selectedBaseOrigin}/?ref=USER`;

  const activeLinkToCopy = linkFormat === 'short' ? shortRefLink : fullRefLink;

  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Sponsor input state for manual binding
  const [sponsorInput, setSponsorInput] = useState('');
  const [bindingSponsor, setBindingSponsor] = useState(false);
  const [bindMessage, setBindMessage] = useState<string | null>(null);

  // Local real-time synchronized stats
  const [localStats, setLocalStats] = useState<ReferralStatsData | null>(referralStats || null);
  const [isSyncingStats, setIsSyncingStats] = useState<boolean>(false);

  useEffect(() => {
    if (referralStats) {
      setLocalStats(referralStats);
    }
  }, [referralStats]);

  // Real-time synchronization callback with backend stratum database
  const refreshLiveStats = React.useCallback(async () => {
    if (!walletAddress || !walletAddress.startsWith('0x')) return;
    try {
      const res = await fetch(`/api/referrals/stats/${walletAddress}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.stats) {
          setLocalStats(data.stats);
          try {
            localStorage.setItem(`spike_referral_stats_${walletAddress.toLowerCase()}`, JSON.stringify(data.stats));
          } catch {}
        }
      }
    } catch {}
  }, [walletAddress]);

  // Auto-sync on mount, on wallet change, on window focus, and on background periodic intervals
  useEffect(() => {
    refreshLiveStats();

    // Fast live poll every 3 seconds so partners joining reflect smoothly
    const interval = setInterval(refreshLiveStats, 3000);

    const handlePartnerEvent = () => {
      refreshLiveStats();
    };
    window.addEventListener('spike_partner_registered', handlePartnerEvent);
    window.addEventListener('focus', refreshLiveStats);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.includes('spike_referral')) {
        refreshLiveStats();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('spike_partner_registered', handlePartnerEvent);
      window.removeEventListener('focus', refreshLiveStats);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refreshLiveStats]);

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

  // Real-time calculated partners state from live stats
  const effectiveStats = localStats || referralStats;
  const directPartners = effectiveStats?.directPartners ?? 0;
  const downlinePartners = effectiveStats?.downlinePartners ?? 0;
  const totalTeamPartners = directPartners + downlinePartners;

  // Calculate total milestone reward sum claimed by this user
  const claimedMilestoneRewardSum = TEAM_MILESTONE_TIERS
    .filter((m) => claimedMilestones.includes(m.id))
    .reduce((sum, m) => sum + m.rewardUsd, 0);

  const serverEarned = effectiveStats?.totalCommissions ?? 0;
  // Total Earned will always display the claimed milestone rewards!
  const totalEarnedUsdt = Math.max(serverEarned, +(serverEarned + claimedMilestoneRewardSum).toFixed(2), claimedMilestoneRewardSum);
  
  const referralsList = effectiveStats?.referrals || [];
  const rawSponsor = effectiveStats?.referredBy || null;
  const isSelfSponsor = Boolean(
    rawSponsor &&
    walletAddress &&
    (rawSponsor.toLowerCase() === walletAddress.toLowerCase() ||
     rawSponsor.toLowerCase() === refCode.toLowerCase() ||
     rawSponsor.toLowerCase().replace(/^(spike-|spk-)/i, '') === walletAddress.toLowerCase().slice(2, 8))
  );
  const activeSponsor = isSelfSponsor ? null : rawSponsor;

  // Withdrawal Modal State & User Request Management
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawAddress, setWithdrawAddress] = useState<string>(walletAddress || '');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);
  const [withdrawMessage, setWithdrawMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeWithdrawals, setActiveWithdrawals] = useState<WithdrawalItem[]>([]);

  // Fetch user's withdrawal requests from backend & Firestore
  const fetchUserWithdrawals = React.useCallback(async () => {
    if (!walletAddress || !walletAddress.startsWith('0x')) return;
    try {
      const res = await fetch(`/api/withdrawals?userAddress=${walletAddress}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.withdrawals)) {
          setActiveWithdrawals(data.withdrawals);
        }
      }
    } catch {}
  }, [walletAddress]);

  useEffect(() => {
    fetchUserWithdrawals();
    const interval = setInterval(fetchUserWithdrawals, 4000);
    return () => clearInterval(interval);
  }, [fetchUserWithdrawals]);

  // Keep withdrawAddress synced with connected wallet
  useEffect(() => {
    if (walletAddress) {
      setWithdrawAddress(walletAddress);
    }
  }, [walletAddress]);

  const pendingAmount = activeWithdrawals
    .filter((w) => w.status === 'pending')
    .reduce((sum, w) => sum + w.amount, 0);
  const approvedAmount = activeWithdrawals
    .filter((w) => w.status === 'approved')
    .reduce((sum, w) => sum + w.amount, 0);

  // Available rewards to withdraw
  const availableToWithdraw = Math.max(0, +(totalEarnedUsdt - (pendingAmount + approvedAmount)).toFixed(2));

  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);

  const nextClaimable = TEAM_MILESTONE_TIERS.find(
    (m) => totalTeamPartners >= m.partnersRequired && !claimedMilestones.includes(m.id)
  );
  const nextLocked = TEAM_MILESTONE_TIERS.find(
    (m) => totalTeamPartners < m.partnersRequired
  );

  const handleCopy = () => {
    onCopyText(activeLinkToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClaimMilestone = (amountUsd: number, milestoneLabel: string) => {
    onClaimReferralRewards(amountUsd, milestoneLabel);
    setClaimSuccess(milestoneLabel);
    const milestoneId = nextClaimable?.id || TEAM_MILESTONE_TIERS.find(m => m.label === milestoneLabel)?.id || '';
    setClaimedMilestones((prev) => {
      const updated = prev.includes(milestoneId) ? prev : [...prev, milestoneId];
      try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch {}
      return updated;
    });

    // Update localStats totalCommissions immediately so the Total Earned card updates on screen
    setLocalStats((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        totalCommissions: +(Number(prev.totalCommissions || 0) + amountUsd).toFixed(2),
        milestoneRewardsClaimed: +(Number(prev.milestoneRewardsClaimed || 0) + amountUsd).toFixed(2),
      };
    });

    setTimeout(() => setClaimSuccess(null), 3500);
  };

  // Submit withdrawal request to backend & Admin Panel
  const handleExecuteWithdrawalRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setWithdrawMessage({ text: 'Please enter a valid withdrawal amount.', type: 'error' });
      return;
    }
    if (amountNum > availableToWithdraw) {
      setWithdrawMessage({
        text: `Amount exceeds available reward balance (${availableToWithdraw.toFixed(2)} USDT available).`,
        type: 'error',
      });
      return;
    }
    const dest = withdrawAddress.trim();
    if (!dest.startsWith('0x') || dest.length !== 42) {
      setWithdrawMessage({ text: 'Please enter a valid BEP-20 (BSC) wallet address starting with 0x (42 characters).', type: 'error' });
      return;
    }

    setIsSubmittingWithdraw(true);
    setWithdrawMessage(null);
    try {
      const res = await fetch('/api/withdrawals/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: walletAddress,
          destinationAddress: dest,
          amount: amountNum,
          source: 'milestone_reward',
          milestoneLabel: 'Team Milestone Career Rewards',
        }),
      });
      const data = await res.json();
      if (data && data.success) {
        setWithdrawMessage({
          text: `✓ Withdrawal request for ${amountNum.toFixed(2)} USDT submitted! Sent to Admin Panel for review & approval.`,
          type: 'success',
        });
        setWithdrawAmount('');
        fetchUserWithdrawals();
        refreshLiveStats();
        setTimeout(() => {
          setIsWithdrawModalOpen(false);
          setWithdrawMessage(null);
        }, 3000);
      } else {
        setWithdrawMessage({ text: data?.error || 'Failed to submit withdrawal request.', type: 'error' });
      }
    } catch {
      setWithdrawMessage({ text: 'Network error submitting request. Please try again.', type: 'error' });
    } finally {
      setIsSubmittingWithdraw(false);
    }
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
            Grow your network, reach team milestones, and unlock higher USDT rewards.
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
        {/* Short Referral Link & Code Inputs */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#94a3b8] font-mono font-semibold uppercase tracking-[0.14em]">
                  Your Referral Link
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30 font-bold">
                  <span>🌐 spikenodes.com</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono flex items-center gap-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>✓ Verified Official Link</span>
                </span>
              </div>
            </div>
            
            <div className="mt-2 flex items-center gap-2 bg-[#0a0f1d] border border-[#1c2b3b] rounded-xl p-2.5">
              <span className="material-symbols-outlined text-[#00F0FF] text-[18px] ml-1">link</span>
              <input
                type="text"
                readOnly
                value={activeLinkToCopy}
                className="bg-transparent text-white font-mono text-xs sm:text-sm truncate flex-1 tracking-tight border-none outline-none select-all"
              />
              <button
                onClick={handleCopy}
                className="px-3 sm:px-4 py-2 rounded-lg bg-[#00F0FF] text-[#0A0F1D] font-bold text-xs font-headline hover:bg-[#7df4ff] transition-all flex items-center gap-1.5 shrink-0 tracking-wide shadow-[0_0_15px_rgba(0,240,255,0.3)] active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copied ? 'check' : 'content_copy'}
                </span>
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>

              {/* Native / Social Share Button */}
              <div className="relative">
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'Join SPIKE Decentralized Mining',
                        text: `Join my SPIKE mining team and get 10 USDT welcome mining power! Use code ${refCode}:`,
                        url: activeLinkToCopy,
                      }).catch(() => {});
                    } else {
                      setShowShareMenu(!showShareMenu);
                    }
                  }}
                  className="p-2 rounded-lg bg-[#1c2b3b] hover:bg-[#273647] text-white hover:text-[#00F0FF] transition-colors"
                  title="Share link"
                >
                  <span className="material-symbols-outlined text-[18px]">share</span>
                </button>

                {showShareMenu && (
                  <div className="absolute right-0 top-full mt-2 z-30 w-44 bg-[#0d1624] border border-[#1c2b3b] rounded-xl p-2 shadow-xl space-y-1">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Join my SPIKE mining team and start earning with code ${refCode}! ${activeLinkToCopy}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-white hover:bg-[#152335] rounded-lg transition-colors"
                    >
                      <span>💬 WhatsApp</span>
                    </a>
                    <a
                      href={`https://t.me/share/url?url=${encodeURIComponent(activeLinkToCopy)}&text=${encodeURIComponent(`Join my SPIKE mining team with code ${refCode}!`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-white hover:bg-[#152335] rounded-lg transition-colors"
                    >
                      <span>✈️ Telegram</span>
                    </a>
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join my @SpikeNodes mining team using code ${refCode}! ${activeLinkToCopy}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-white hover:bg-[#152335] rounded-lg transition-colors"
                    >
                      <span>🐦 X / Twitter</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="md:w-64 p-3 rounded-xl bg-[#0a0f1d] border border-[#1c2b3b] flex items-center justify-between">
            <div>
              <div className="text-[10px] text-[#94a3b8] font-mono uppercase tracking-[0.12em]">Referral Code</div>
              <div className="text-base font-bold font-mono text-[#D4AF37] mt-0.5 tracking-wider">{refCode}</div>
            </div>
            <button
              onClick={() => {
                onCopyText(refCode);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#1c2b3b] hover:bg-[#273647] text-[#00F0FF] text-xs transition-colors flex items-center gap-1 font-mono font-bold cursor-pointer"
              title="Copy Code"
            >
              <span className="material-symbols-outlined text-[16px]">{copiedCode ? 'check' : 'content_copy'}</span>
              <span>{copiedCode ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Sponsor Status & Binding Card */}
        <div className="pt-3 border-t border-[#1c2b3b] bg-[#0a0f1d]/70 p-3.5 rounded-xl border border-[#1c2b3b]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeSponsor ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30'}`}>
              <span className="material-symbols-outlined text-[18px]">{activeSponsor ? 'verified_user' : 'handshake'}</span>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-[#94a3b8] tracking-wider">Sponsor Status</div>
              {activeSponsor ? (
                <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5 mt-0.5">
                  <span className="text-emerald-400 font-semibold">Active Sponsor:</span>
                  <span className="text-[#00F0FF]">{activeSponsor.slice(0, 6)}...{activeSponsor.slice(-4)}</span>
                  <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[10px] rounded font-mono">Bound</span>
                </div>
              ) : (
                <div className="text-xs text-[#94a3b8] mt-0.5">
                  Not linked to a sponsor yet. Enter your inviter's wallet or code below.
                </div>
              )}
            </div>
          </div>

          {!activeSponsor && onBindSponsor && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Paste link, SPK-..., or 0x..."
                value={sponsorInput}
                onChange={(e) => setSponsorInput(e.target.value)}
                className="bg-[#122130] border border-[#1c2b3b] text-white font-mono text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#00F0FF] w-full sm:w-64 placeholder:text-gray-500"
              />
              <button
                disabled={bindingSponsor || !sponsorInput.trim()}
                onClick={async () => {
                  const input = sponsorInput.trim();
                  if (!input) return;
                  setBindingSponsor(true);
                  try {
                    const ok = await onBindSponsor(input);
                    if (ok) {
                      setBindMessage('✓ Sponsor processed & team partner updated!');
                      setSponsorInput('');
                      refreshLiveStats();
                      setTimeout(() => setBindMessage(null), 4000);
                    }
                  } finally {
                    setBindingSponsor(false);
                  }
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#ffe088] text-[#0A0F1D] font-bold text-xs font-headline transition-all disabled:opacity-50 shrink-0 shadow-sm"
              >
                {bindingSponsor ? 'Processing...' : 'Process / Bind'}
              </button>
            </div>
          )}
          {bindMessage && <span className="text-xs text-emerald-400 font-mono">{bindMessage}</span>}
        </div>

        {/* Live Invitation & Partner Tracking Action Bar */}
        <div className="pt-2 border-t border-[#1c2b3b] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a0f1d]/50 p-3 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-[#94a3b8]">
              Share your link with partners. Every registered miner joins your network in real time and progresses your <strong className="text-white">Team Milestone Rewards</strong> ($15 to $500,000 USDT).
            </span>
          </div>

          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00F0FF]/20 to-[#D4AF37]/20 hover:from-[#00F0FF]/30 hover:to-[#D4AF37]/30 border border-[#00F0FF]/40 text-[#00F0FF] hover:text-white text-xs font-headline font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto shrink-0 shadow-sm active:scale-95"
            title="Copy Referral Link to share"
          >
            <span className="material-symbols-outlined text-[16px]">share</span>
            <span>{copied ? 'Link Copied!' : 'Share Referral Link'}</span>
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#122130] rounded-xl p-5 border border-[#1c2b3b]/60 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-[#94a3b8] font-mono font-semibold uppercase tracking-[0.14em]">
              Total Team Partners
            </div>
            <button
              onClick={() => {
                setIsSyncingStats(true);
                refreshLiveStats().finally(() => setTimeout(() => setIsSyncingStats(false), 500));
              }}
              className="text-[10px] font-mono text-[#00F0FF] hover:text-white flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded bg-[#0a0f1d] border border-[#1c2b3b]"
              title="Click to sync latest referral team count"
            >
              <span className={`material-symbols-outlined text-[13px] ${isSyncingStats ? 'animate-spin' : ''}`}>sync</span>
              <span className="hidden xs:inline">Live Sync</span>
            </button>
          </div>
          <div className="text-3xl font-extrabold font-headline text-white mt-1 tabular-nums tracking-tight">
            {totalTeamPartners}
          </div>
          <div className="text-xs text-[#7df4ff] font-mono mt-1 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{totalTeamPartners} Active Partners in Network</span>
          </div>
        </div>

        <div className="bg-[#122130] rounded-xl p-5 border border-[#1c2b3b]/60">
          <div className="text-[10px] text-[#94a3b8] font-mono font-semibold uppercase tracking-[0.14em]">Direct Partners</div>
          <div className="text-3xl font-extrabold font-headline text-[#00F0FF] mt-1 tabular-nums tracking-tight">
            {directPartners}
          </div>
          <div className="text-xs text-[#94a3b8] font-mono mt-1">
            {downlinePartners > 0 ? `+${downlinePartners} Downline partners` : 'Direct team contributors'}
          </div>
        </div>

        <div className="bg-[#122130] rounded-xl p-5 border border-[#1c2b3b]/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-[#94a3b8] font-mono font-semibold uppercase tracking-[0.14em]">
                Total Earned
              </div>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 uppercase">
                Milestones
              </span>
            </div>
            <div className="text-3xl font-extrabold font-headline text-[#D4AF37] mt-1 tabular-nums tracking-tight">
              +{totalEarnedUsdt.toFixed(2)} <span className="text-sm text-white font-semibold">USDT</span>
            </div>
            <div className="text-xs text-[#D4AF37] font-mono mt-1 font-medium flex flex-wrap items-center justify-between gap-1">
              <span>Claimed from Team Milestones</span>
              {pendingAmount > 0 && (
                <span className="text-amber-400 font-mono text-[10px] animate-pulse">
                  (${pendingAmount.toFixed(2)} Pending)
                </span>
              )}
            </div>
          </div>

          {/* User Requested: Withdrawal Button directly below Total Earned */}
          <div className="mt-4 pt-3 border-t border-[#1c2b3b]">
            <button
              type="button"
              onClick={() => {
                setWithdrawAmount(availableToWithdraw > 0 ? String(availableToWithdraw) : '');
                setWithdrawAddress(walletAddress || '');
                setIsWithdrawModalOpen(true);
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#ffe088] to-[#00F0FF] hover:from-[#ffe088] hover:to-[#7df4ff] text-[#0A0F1D] font-headline font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(212,175,55,0.35)] transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
              <span>Withdraw Rewards {availableToWithdraw > 0 ? `(${availableToWithdraw.toFixed(2)} USDT)` : ''}</span>
            </button>
          </div>
        </div>
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
        <h2 className="text-lg font-bold font-headline text-white mb-1">Recent Network Partner Activity</h2>
        <p className="text-xs text-[#c6c6cc] mb-4">Live partners joining your network and counting toward Team Milestones</p>

        {referralsList.length === 0 ? (
          <div className="py-10 px-4 rounded-xl bg-[#0a0f1d] border border-[#1c2b3b] text-center flex flex-col items-center justify-center space-y-2.5">
            <div className="w-12 h-12 rounded-xl bg-[#00F0FF]/10 text-[#00F0FF] flex items-center justify-center border border-[#00F0FF]/25 shadow-sm">
              <span className="material-symbols-outlined text-[26px]">group_add</span>
            </div>
            <div className="max-w-md">
              <h3 className="text-sm font-bold font-headline text-white">No Referred Partners Yet</h3>
              <p className="text-xs text-[#94a3b8] mt-0.5 leading-relaxed">
                Share your unique link above. As partners join and activate mining nodes, they will count toward your milestones here.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-[#c6c6cc] font-headline border-b border-[#1c2b3b]">
                  <th className="py-2.5 px-3">Invited Member</th>
                  <th className="py-2.5 px-3">Partner Status</th>
                  <th className="py-2.5 px-3">Rig Deployed</th>
                  <th className="py-2.5 px-3">Milestone Contribution</th>
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
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Team Partner
                      </span>
                    </td>
                    <td className="py-3 px-3 text-white font-mono">
                      {ref.volumeUsdt ? `$${ref.volumeUsdt.toFixed(0)} Volume` : 'Active Partner'}
                    </td>
                    <td className="py-3 px-3 text-[#00F0FF] font-bold font-mono">
                      +1 Partner Target
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

      {/* ============================================================
          WITHDRAWAL REQUEST MODAL (TEAM MILESTONE REWARDS)
         ============================================================ */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#0a1424] border-2 border-[#D4AF37]/50 rounded-2xl shadow-[0_0_50px_rgba(212,175,55,0.25)] p-5 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Ambient Top Glow */}
            <div className="absolute top-0 left-1/4 right-1/4 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />

            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#00F0FF]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shadow-inner">
                  <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black font-headline text-white tracking-tight">
                    Withdraw Milestone Rewards
                  </h3>
                  <p className="text-xs text-[#94a3b8] font-mono">
                    Team Career Milestones · BEP-20 Network
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsWithdrawModalOpen(false);
                  setWithdrawMessage(null);
                }}
                className="w-8 h-8 rounded-lg bg-[#142232] text-[#94a3b8] hover:text-white hover:bg-[#1e334c] flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Balance Overview Card */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#0d1d2c] via-[#091828] to-[#0d1d2c] border border-[#1c2b3b] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#94a3b8] uppercase tracking-wider">
                  Available Rewards to Withdraw
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                  READY
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold font-headline text-[#D4AF37] tabular-nums">
                  {availableToWithdraw.toFixed(2)}
                </span>
                <span className="text-sm font-bold text-white font-mono">USDT</span>
                <span className="text-[11px] text-[#94a3b8] font-mono ml-auto">
                  Total Claimed: ${totalEarnedUsdt.toFixed(2)}
                </span>
              </div>
              {pendingAmount > 0 && (
                <div className="text-[11px] font-mono text-amber-300/90 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span>You have <strong>${pendingAmount.toFixed(2)} USDT</strong> currently pending Admin approval.</span>
                </div>
              )}
            </div>

            {/* Withdrawal Form */}
            <form onSubmit={handleExecuteWithdrawalRequest} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono font-bold text-[#c6c6cc]">
                    Withdrawal Amount (USDT)
                  </label>
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(String(availableToWithdraw))}
                    className="text-[11px] font-mono font-bold text-[#00F0FF] hover:underline cursor-pointer"
                  >
                    MAX ({availableToWithdraw.toFixed(2)})
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="1"
                    max={availableToWithdraw}
                    placeholder="Enter amount (e.g. 15.00)"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full bg-[#05111e] border border-[#1c2b3b] focus:border-[#D4AF37] rounded-xl px-4 py-3 text-white font-mono text-sm outline-none transition-colors"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-xs text-[#94a3b8]">
                    USDT
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-[#c6c6cc] mb-1.5">
                  Destination BSC (BEP-20) Wallet Address
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="0x..."
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    className="w-full bg-[#05111e] border border-[#1c2b3b] focus:border-[#00F0FF] rounded-xl px-4 py-3 text-white font-mono text-xs sm:text-sm outline-none transition-colors"
                  />
                  {walletAddress && withdrawAddress.toLowerCase() === walletAddress.toLowerCase() && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Connected Wallet
                    </span>
                  )}
                </div>
              </div>

              {/* Protocol Specs Badge */}
              <div className="p-3 rounded-xl bg-[#071322] border border-[#1c2b3b] text-xs font-mono space-y-1 text-[#94a3b8]">
                <div className="flex justify-between">
                  <span>Network:</span>
                  <span className="text-white font-semibold">Binance Smart Chain (BEP-20)</span>
                </div>
                <div className="flex justify-between">
                  <span>Protocol Fee:</span>
                  <span className="text-emerald-400 font-bold">0.00 USDT (0%)</span>
                </div>
                <div className="flex justify-between">
                  <span>Approval Method:</span>
                  <span className="text-[#00F0FF] font-semibold">Review By Nodescan</span>
                </div>
              </div>

              {withdrawMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-mono flex items-start gap-2 border ${
                    withdrawMessage.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : 'bg-red-500/10 text-red-300 border-red-500/30'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">
                    {withdrawMessage.type === 'success' ? 'check_circle' : 'error'}
                  </span>
                  <span>{withdrawMessage.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingWithdraw || availableToWithdraw <= 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#ffe088] to-[#00F0FF] hover:from-[#ffe088] hover:to-[#7df4ff] text-[#0A0F1D] font-headline font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingWithdraw ? (
                  <>
                    <span className="w-4 h-4 border-2 border-[#0A0F1D] border-t-transparent rounded-full animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">send</span>
                    <span>Submit Withdrawal Request</span>
                  </>
                )}
              </button>
            </form>

            {/* Withdrawal Requests History */}
            <div className="pt-3 border-t border-[#1c2b3b] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-headline font-bold text-white uppercase tracking-wider">
                  Your Withdrawal Requests
                </span>
                <span className="text-[10px] font-mono text-[#94a3b8]">
                  {activeWithdrawals.length} Total
                </span>
              </div>

              {activeWithdrawals.length === 0 ? (
                <div className="py-4 text-center text-xs font-mono text-[#94a3b8] bg-[#071322] rounded-xl border border-[#1c2b3b]">
                  No withdrawal requests made yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                  {activeWithdrawals.map((w) => (
                    <div
                      key={w.id}
                      className="p-2.5 rounded-xl bg-[#071322] border border-[#1c2b3b] flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-headline font-bold text-white">
                            {w.amount.toFixed(2)} USDT
                          </span>
                          <span
                            className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                              w.status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : w.status === 'pending'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                : 'bg-red-500/20 text-red-400 border border-red-500/40'
                            }`}
                          >
                            {w.status === 'approved' ? '✓ DONE / APPROVED' : w.status === 'pending' ? '⏳ PENDING REVIEW' : '✕ REJECTED'}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-[#94a3b8] mt-0.5">
                          To: {w.destinationAddress ? `${w.destinationAddress.slice(0, 8)}...${w.destinationAddress.slice(-6)}` : 'Wallet'}
                        </div>
                        {w.txHash && (
                          <div className="text-[10px] font-mono text-emerald-400 truncate max-w-xs mt-0.5">
                            Tx: {w.txHash.slice(0, 16)}...
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0 text-[10px] font-mono text-[#94a3b8]">
                        {new Date(w.requestedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
