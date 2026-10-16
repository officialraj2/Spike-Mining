import React, { useState, useEffect } from 'react';
import { TEAM_MILESTONE_TIERS } from '../../data/mockData';
import { TeamRewardMilestonesSection } from '../TeamRewardMilestonesSection';
import { HashrateLevelInfo } from '../../types';

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
  referredBy?: string | null;
}

interface ReferralsViewProps {
  walletAddress: string;
  hashrateInfo?: HashrateLevelInfo | null;
  onCopyText: (text: string) => void;
  onClaimReferralRewards: (amount: number, label?: string) => void;
  referralStats?: ReferralStatsData;
  onSimulateReferral?: () => void;
  onBindSponsor?: (codeOrAddr: string) => Promise<boolean>;
  onOpenVerificationModal?: (code?: string) => void;
}

export const ReferralsView: React.FC<ReferralsViewProps> = ({
  walletAddress,
  hashrateInfo,
  onCopyText,
  onClaimReferralRewards,
  referralStats,
  onSimulateReferral,
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

  // Short referral link with sponsor wallet parameter for 100% deterministic matching
  const shortRefLink = walletAddress
    ? `${currentOrigin}/ref/${refCode}?sponsor=${walletAddress}`
    : `${currentOrigin}/ref/${refCode}`;

  // Universal address link fallback
  const fullRefLink = walletAddress ? `${currentOrigin}/?ref=${walletAddress}` : `${currentOrigin}/?ref=USER`;

  const [linkFormat, setLinkFormat] = useState<'short' | 'full'>('short');
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

    return () => {
      clearInterval(interval);
      window.removeEventListener('spike_partner_registered', handlePartnerEvent);
      window.removeEventListener('focus', refreshLiveStats);
    };
  }, [refreshLiveStats]);

  // Real-time calculated partners state from live stats
  const effectiveStats = localStats || referralStats;
  const directPartners = effectiveStats?.directPartners ?? 0;
  const downlinePartners = effectiveStats?.downlinePartners ?? 0;
  const totalTeamPartners = directPartners + downlinePartners;
  const totalEarnedUsdt = effectiveStats?.totalCommissions ?? 0;
  
  const referralsList = effectiveStats?.referrals || [];
  const activeSponsor = effectiveStats?.referredBy || null;

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
    onCopyText(activeLinkToCopy);
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
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#94a3b8] font-mono font-semibold uppercase tracking-[0.14em]">
                Your Short Referral Link
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">✓ 1-Click Auto-Copy & Send</span>
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
                className="px-4 py-2 rounded-lg bg-[#00F0FF] text-[#0A0F1D] font-bold text-xs font-headline hover:bg-[#7df4ff] transition-all flex items-center gap-1.5 shrink-0 tracking-wide shadow-[0_0_15px_rgba(0,240,255,0.3)] active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copied ? 'check' : 'content_copy'}
                </span>
                <span>{copied ? 'Copied!' : 'Copy Short Link'}</span>
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
              className="px-3 py-1.5 rounded-lg bg-[#1c2b3b] hover:bg-[#273647] text-[#00F0FF] text-xs transition-colors flex items-center gap-1 font-mono font-bold"
              title="Copy Code"
            >
              <span className="material-symbols-outlined text-[16px]">{copiedCode ? 'check' : 'content_copy'}</span>
              <span>{copiedCode ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Step-Wise Verification Flow Banner (User Requirement) */}
        <div className="p-4 bg-gradient-to-r from-[#00F0FF]/10 via-[#122130] to-[#D4AF37]/10 rounded-xl border border-[#00F0FF]/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-inner">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00F0FF]/20 border border-[#00F0FF]/40 text-[#00F0FF] flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-headline font-bold text-white">
                  Step-Wise Referral Verification & Wallet Connect
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                  STEP 1 → 4 FLOW
                </span>
              </div>
              <p className="text-[11px] text-[#94a3b8] mt-0.5 max-w-xl">
                Jab aap kisi user ko ye link bhejte hain, unke saamne step-wise verification aayega: (1. Code & Sponsor Verify → 2. Wallet Connect → 3. Network Binding → 4. 10 USDT Welcome Mining Activate).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            {onOpenVerificationModal && (
              <button
                onClick={() => onOpenVerificationModal(refCode)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#00b4d8] text-[#0A0F1D] font-headline font-black text-xs tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_18px_rgba(0,240,255,0.35)] hover:scale-102 active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">play_circle</span>
                <span>Test Verification Steps</span>
              </button>
            )}
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
                placeholder="0x... or SPK-..."
                value={sponsorInput}
                onChange={(e) => setSponsorInput(e.target.value)}
                className="bg-[#122130] border border-[#1c2b3b] text-white font-mono text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#00F0FF] w-full sm:w-48 placeholder:text-gray-500"
              />
              <button
                disabled={bindingSponsor || !sponsorInput.trim()}
                onClick={async () => {
                  setBindingSponsor(true);
                  const ok = await onBindSponsor(sponsorInput.trim());
                  setBindingSponsor(false);
                  if (ok) {
                    setBindMessage('Sponsor successfully linked!');
                    setSponsorInput('');
                    setTimeout(() => setBindMessage(null), 3500);
                  }
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#ffe088] text-[#0A0F1D] font-bold text-xs font-headline transition-all disabled:opacity-50 shrink-0"
              >
                {bindingSponsor ? 'Binding...' : 'Bind Sponsor'}
              </button>
            </div>
          )}
          {bindMessage && <span className="text-xs text-emerald-400 font-mono">{bindMessage}</span>}
        </div>

        {/* Live Invitation & Referral Simulation Action Bar */}
        <div className="pt-2 border-t border-[#1c2b3b] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a0f1d]/50 p-3 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-[#94a3b8]">
              Send this link to partners. Each registered miner directly joins your network and unlocks <strong className="text-white">Team Milestone Rewards</strong> ($15 to $500,000 USDT).
            </span>
          </div>

          {onSimulateReferral && (
            <button
              onClick={onSimulateReferral}
              className="px-4 py-2 rounded-xl bg-[#1c2b3b] hover:bg-[#273647] border border-[#00F0FF]/40 text-[#00F0FF] hover:text-white text-xs font-headline font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto shrink-0 shadow-sm"
              title="Test referral join: adds +1 Partner to team network"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              <span>Test Referral Join (+1 Partner)</span>
            </button>
          )}
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

        <div className="bg-[#122130] rounded-xl p-5 border border-[#1c2b3b]/60">
          <div className="text-[10px] text-[#94a3b8] font-mono font-semibold uppercase tracking-[0.14em]">Total Earned</div>
          <div className="text-3xl font-extrabold font-headline text-[#D4AF37] mt-1 tabular-nums tracking-tight">
            +{totalEarnedUsdt.toFixed(2)} <span className="text-sm text-white font-semibold">USDT</span>
          </div>
          <div className="text-xs text-[#D4AF37] font-mono mt-1 font-medium">Claimed from Team Milestones</div>
        </div>
      </div>

      {/* ============================================================
          5-TIER HASHRATE SPEED MATRIX (DIRECT REFERRAL PROTOCOL SPEC)
         ============================================================ */}
      <div className="bg-[#0b1d2e] rounded-2xl p-5 md:p-6 border-2 border-[#00F0FF]/30 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#1c2b3b] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00F0FF] text-[24px]">speed</span>
              <h2 className="text-lg md:text-xl font-bold font-headline text-white tracking-tight">
                Direct Referral Hashrate Speed Protocol
              </h2>
            </div>
            <p className="text-xs text-[#94a3b8] font-mono mt-1">
              Formula: <code className="text-[#00F0FF] font-bold">Required Hashrate = 100 × (60 / Target Days)</code>. Direct referrals aur team size se user ka speed automatically upgrade hota hai.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/40 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse" />
              <span>Current Rate: {hashrateInfo?.hashrate ?? 100} VH/s</span>
            </span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
              hashrateInfo?.isCustomOverride
                ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
            }`}>
              {hashrateInfo?.level || 'Fresh user'}
              {hashrateInfo?.isCustomOverride && ' (Admin Override)'}
            </span>
          </div>
        </div>

        {/* 5 Levels Grid Matching Uploaded Spec */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {[
            {
              level: 'Fresh user',
              num: 0,
              directs: '0 referrals',
              targetDays: 60,
              hashrate: 100,
              yield: '0.01667 SPK/day',
              qualifies: true,
            },
            {
              level: 'Level 1',
              num: 1,
              directs: '10 direct referrals',
              targetDays: 30,
              hashrate: 200,
              yield: '0.03333 SPK/day',
              qualifies: directPartners >= 10,
            },
            {
              level: 'Level 2',
              num: 2,
              directs: '25 directs or 100 team',
              targetDays: 15,
              hashrate: 400,
              yield: '0.06667 SPK/day',
              qualifies: directPartners >= 25 || totalTeamPartners >= 100,
            },
            {
              level: 'Level 3',
              num: 3,
              directs: '50 directs or 1,000 team',
              targetDays: 10,
              hashrate: 600,
              yield: '0.10000 SPK/day',
              qualifies: directPartners >= 50 || totalTeamPartners >= 1000,
            },
            {
              level: 'Level 4',
              num: 4,
              directs: '100 directs or 5,000 team',
              targetDays: 7,
              hashrate: 857.14,
              yield: '0.14286 SPK/day',
              qualifies: directPartners >= 100 || totalTeamPartners >= 5000,
            },
          ].map((tier) => {
            const isCurrent = hashrateInfo
              ? hashrateInfo.level === tier.level
              : (tier.level === 'Fresh user' && directPartners < 10);
            return (
              <div
                key={tier.level}
                className={`p-4 rounded-xl border relative transition-all ${
                  isCurrent
                    ? 'bg-[#00F0FF]/15 border-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.25)] ring-1 ring-[#00F0FF]'
                    : tier.qualifies
                    ? 'bg-[#0e2438] border-emerald-500/40'
                    : 'bg-[#071322] border-[#1c2b3b]'
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#00F0FF] text-[#0A0F1D] shadow-sm">
                    ACTIVE TIER
                  </span>
                )}
                <div className="flex items-center justify-between text-xs font-bold font-headline mb-1">
                  <span className={isCurrent ? 'text-white' : 'text-[#94a3b8]'}>{tier.level}</span>
                  <span className="text-[#00F0FF] font-mono">{tier.hashrate} VH/s</span>
                </div>
                <div className="text-[11px] text-[#D4AF37] font-mono font-semibold mt-1">
                  {tier.directs}
                </div>
                <div className="text-xs text-emerald-400 font-mono mt-1 flex items-center gap-1 font-bold">
                  <span className="material-symbols-outlined text-[14px]">timer</span>
                  <span>1 SPK in {tier.targetDays} days</span>
                </div>
                <div className="text-[10px] text-[#94a3b8] font-mono mt-0.5">
                  Yield: {tier.yield}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Upgrade Status Bar */}
        <div className="bg-[#071322] rounded-xl p-3.5 border border-[#1c2b3b] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400 text-[18px]">account_tree</span>
            <span className="text-[#94a3b8]">
              Your Network: <strong className="text-white">{directPartners} Directs</strong> · <strong className="text-[#D4AF37]">{totalTeamPartners} Total Team</strong>
            </span>
          </div>
          {hashrateInfo?.nextTier ? (
            <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <span>Next Upgrade:</span>
              <span className="text-white bg-[#122130] px-2 py-0.5 rounded border border-[#1c2b3b]">
                {hashrateInfo.nextTier.level} ({hashrateInfo.nextTier.hashrate} VH/s)
              </span>
              <span className="text-[#00F0FF]">
                — Needs {hashrateInfo.nextTier.neededDirects} more direct referrals
              </span>
            </div>
          ) : (
            <span className="text-emerald-400 font-bold">★ Maximum Hashrate Velocity Level Unlocked!</span>
          )}
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
    </div>
  );
};
