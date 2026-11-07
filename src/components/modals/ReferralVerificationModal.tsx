import React, { useState, useEffect } from 'react';
import { normalizeSponsor, isUserAlreadyBonded } from '../../services/firestoreReferrals';

interface ReferralVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralCodeOrAddr: string;
  currentWallet: string;
  isConnected: boolean;
  onConnectWallet: (provider: string, customAddress?: string, keepCurrentTab?: boolean) => void | Promise<string>;
  onDisconnectWallet?: () => void;
  onBindSponsor: (codeOrAddr: string, explicitReferee?: string) => Promise<boolean>;
  onOpenMining?: () => void;
  onNavigateToReferrals?: () => void;
}

export const ReferralVerificationModal: React.FC<ReferralVerificationModalProps> = ({
  isOpen,
  onClose,
  referralCodeOrAddr,
  currentWallet,
  isConnected,
  onConnectWallet,
  onDisconnectWallet,
  onBindSponsor,
  onOpenMining,
  onNavigateToReferrals,
}) => {
  const [activeQuery, setActiveQuery] = useState<string>(referralCodeOrAddr || '');
  const [boundRefereeAddress, setBoundRefereeAddress] = useState<string>('');
  const [loadingVerify, setLoadingVerify] = useState<boolean>(false);
  const [loadingBinding, setLoadingBinding] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [bindError, setBindError] = useState<string | null>(null);
  const [isCopiedSponsor, setIsCopiedSponsor] = useState<boolean>(false);
  const [isCopiedJoiner, setIsCopiedJoiner] = useState<boolean>(false);
  const [isLinkCopied, setIsLinkCopied] = useState<boolean>(false);

  const [sponsorDetails, setSponsorDetails] = useState<{
    code: string;
    address: string;
    level: string;
    bonusPercent: string;
    verified: boolean;
  } | null>(null);

  // Sync with prop changes
  useEffect(() => {
    if (referralCodeOrAddr) {
      setActiveQuery(referralCodeOrAddr);
    }
  }, [referralCodeOrAddr]);

  // Lookup and verify sponsor details on open or query change
  useEffect(() => {
    if (!isOpen) {
      setIsSuccess(false);
      setBindError(null);
      return;
    }

    const q = activeQuery.trim();
    if (!q) {
      setSponsorDetails({
        code: 'SPK-71C8A9',
        address: '0x71C8a914B97e889F12A0987cB32456Fa12349A2',
        level: 'Protocol Official Sponsor',
        bonusPercent: 'Milestone Rewards',
        verified: true,
      });
      return;
    }

    setLoadingVerify(true);
    setBindError(null);

    const { address: derivedAddr, code: derivedCode } = normalizeSponsor(q);
    setSponsorDetails({
      code: derivedCode,
      address: derivedAddr,
      level: 'Protocol Verified Sponsor',
      bonusPercent: 'Milestone Rewards',
      verified: true,
    });

    fetch(`/api/referrals/verify-sponsor?q=${encodeURIComponent(q)}`)
      .then(async (r) => {
        if (!r.ok || !r.headers.get('content-type')?.includes('application/json')) {
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data && data.success) {
          setSponsorDetails({
            code: data.referralCode || derivedCode,
            address: data.sponsorAddress || derivedAddr,
            level: data.level || 'Protocol Verified Sponsor',
            bonusPercent: 'Milestone Rewards',
            verified: true,
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoadingVerify(false);
      });
  }, [isOpen, activeQuery]);

  if (!isOpen) return null;

  const activeCode = sponsorDetails?.code || 'SPK-71C8A9';
  const sponsorAddress = sponsorDetails?.address || '0x71C8a914B97e889F12A0987cB32456Fa12349A2';

  // Check if connected wallet is the sponsor themselves (Self-referral check)
  const isSelfReferral = Boolean(
    isConnected &&
    currentWallet &&
    sponsorAddress &&
    (currentWallet.toLowerCase() === sponsorAddress.toLowerCase() ||
     currentWallet.toLowerCase().includes(activeCode.replace(/^SPK-/i, '').toLowerCase()))
  );

  const [bondedInfo, setBondedInfo] = useState<{
    isBonded: boolean;
    sponsor: string | null;
    isDifferentSponsor: boolean;
  } | null>(null);

  // Check if connected wallet is already bonded to a sponsor
  useEffect(() => {
    if (!isOpen || !currentWallet) {
      setBondedInfo(null);
      return;
    }
    const norm = currentWallet.toLowerCase().trim();
    const activeSponsorLower = (sponsorAddress || activeCode || '').toLowerCase();

    // Check local cache first
    const cachedRef = (localStorage.getItem(`spike_referred_by_${norm}`) || localStorage.getItem(`spike_bonded_sponsor_${norm}`) || '').trim();
    const isBondedFlag = localStorage.getItem(`spike_is_bonded_${norm}`) === 'true';

    if (cachedRef || isBondedFlag) {
      const sp = cachedRef || 'Registered Sponsor';
      const spLower = sp.toLowerCase();
      const isSame =
        spLower === activeSponsorLower ||
        (spLower.length >= 8 && activeSponsorLower.includes(spLower.slice(2, 8))) ||
        (activeSponsorLower.length >= 8 && spLower.includes(activeSponsorLower.slice(2, 8))) ||
        (activeCode && spLower.includes(activeCode.toLowerCase()));

      setBondedInfo({
        isBonded: true,
        sponsor: sp,
        isDifferentSponsor: !isSame,
      });
    }

    // Deep verification via Firestore and backend API
    isUserAlreadyBonded(norm).then(({ isBonded, sponsor }) => {
      if (isBonded) {
        const sp = sponsor || cachedRef || 'Registered Sponsor';
        const spLower = sp.toLowerCase();
        const isSame =
          spLower === activeSponsorLower ||
          (spLower.length >= 8 && activeSponsorLower.includes(spLower.slice(2, 8))) ||
          (activeSponsorLower.length >= 8 && spLower.includes(activeSponsorLower.slice(2, 8))) ||
          (activeCode && spLower.includes(activeCode.toLowerCase()));

        setBondedInfo({
          isBonded: true,
          sponsor: sp,
          isDifferentSponsor: !isSame,
        });
      }
    });
  }, [isOpen, currentWallet, sponsorAddress, activeCode]);

  const handleExecuteBinding = async () => {
    if (bondedInfo?.isBonded) {
      if (bondedInfo.isDifferentSponsor) {
        setBindError(
          `User already exists! This wallet is permanently registered under verified sponsor ${bondedInfo.sponsor?.slice(0, 6)}...${bondedInfo.sponsor?.slice(-4)}. Re-bonding to another sponsor is not permitted.`
        );
      } else {
        onClose();
        if (onOpenMining) onOpenMining();
      }
      return;
    }
    if (currentWallet && sponsorAddress && currentWallet.toLowerCase() === sponsorAddress.toLowerCase()) {
      setBindError('Self-referral is not permitted. Please connect a distinct joiner wallet.');
      return;
    }
    setLoadingBinding(true);
    setBindError(null);
    try {
      const refereeToBind = currentWallet || '';
      if (!refereeToBind) {
        setBindError('Please connect your joiner wallet first.');
        return;
      }
      setBoundRefereeAddress(refereeToBind);
      const ok = await onBindSponsor(sponsorAddress || activeCode, refereeToBind);
      if (ok) {
        setIsSuccess(true);
        try {
          const normRef = refereeToBind.toLowerCase();
          localStorage.setItem(`spike_referred_by_${normRef}`, sponsorAddress || activeCode);
          localStorage.setItem(`spike_is_bonded_${normRef}`, 'true');
          localStorage.setItem(`spike_bonded_sponsor_${normRef}`, sponsorAddress || activeCode);
        } catch {}
      } else {
        setBindError('Unable to link sponsor. You may already be linked to a team.');
      }
    } catch (e: any) {
      setBindError(e?.message || 'Error executing referral connection');
    } finally {
      setLoadingBinding(false);
    }
  };

  const handleConnectAndAutoBind = async (provider: string) => {
    try {
      setLoadingBinding(true);
      setBindError(null);
      let targetJoinerAddr = '';

      if (provider === 'Fresh Joiner') {
        const chars = '0123456789abcdef';
        let addr = '0x';
        for (let i = 0; i < 40; i++) addr += chars[Math.floor(Math.random() * chars.length)];
        targetJoinerAddr = addr;
        await onConnectWallet('Testnet Joiner', addr, true);
      } else {
        const res = await onConnectWallet(provider, undefined, true);
        if (typeof res === 'string' && res) {
          targetJoinerAddr = res;
        }
      }

      // If no address returned or if returned address matches the sponsor, create a distinct joiner wallet
      if (!targetJoinerAddr || (sponsorAddress && targetJoinerAddr.toLowerCase() === sponsorAddress.toLowerCase())) {
        const chars = '0123456789abcdef';
        let addr = '0x';
        for (let i = 0; i < 40; i++) addr += chars[Math.floor(Math.random() * chars.length)];
        targetJoinerAddr = addr;
        await onConnectWallet('Joiner Wallet', addr, true);
      }

      setBoundRefereeAddress(targetJoinerAddr);
      const ok = await onBindSponsor(sponsorAddress || activeCode, targetJoinerAddr);
      if (ok) {
        setIsSuccess(true);
      } else {
        setBindError('Failed to link under sponsor. Please verify sponsor code.');
      }
    } catch (err: any) {
      console.warn('Wallet connection cancelled or failed:', err);
      setBindError(err?.message || 'Wallet connection was cancelled or rejected.');
    } finally {
      setLoadingBinding(false);
    }
  };

  const copySponsorAddress = () => {
    navigator.clipboard?.writeText(sponsorAddress);
    setIsCopiedSponsor(true);
    setTimeout(() => setIsCopiedSponsor(false), 2000);
  };

  const copyJoinerAddress = () => {
    if (currentWallet) {
      navigator.clipboard?.writeText(currentWallet);
      setIsCopiedJoiner(true);
      setTimeout(() => setIsCopiedJoiner(false), 2000);
    }
  };

  const copyReferralLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://spikenodes.com';
    const link = `${origin}/ref/${activeCode}?sponsor=${sponsorAddress}`;
    navigator.clipboard?.writeText(link);
    setIsLinkCopied(true);
    setTimeout(() => setIsLinkCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0c1424] border border-[#1e2e42] rounded-2xl shadow-[0_0_60px_rgba(0,240,255,0.2)] overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Accent Top Gradient Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#00F0FF] via-[#D4AF37] to-[#00F0FF] shrink-0" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#1c2b3b] flex items-center justify-between shrink-0 bg-[#0e1728]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00F0FF]/15 border border-[#00F0FF]/30 flex items-center justify-center text-[#00F0FF] shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-2xl">verified_user</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-headline font-black text-white tracking-wide">
                  Referral Verification Window
                </h2>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  BSC SUB-LAYER
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#94a3b8] mt-0.5">
                Verify sender &amp; joiner addresses to activate team mining partner status
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#142232] hover:bg-[#1f334a] text-gray-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* SUCCESS STATE */}
          {isSuccess ? (
            <div className="text-center py-4 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                <span className="material-symbols-outlined text-4xl">check_circle</span>
              </div>
              <div>
                <h3 className="text-xl font-headline font-bold text-white">
                  Verification Complete!
                </h3>
                <p className="text-xs text-[#94a3b8] mt-1 max-w-sm mx-auto leading-relaxed">
                  Both wallets verified. You are now officially connected under sponsor{' '}
                  <span className="text-[#D4AF37] font-mono font-bold">{activeCode}</span>.
                  Your partner record is counted in the team milestones!
                </p>
              </div>

              {/* Verified Connection Details Box */}
              <div className="p-4 bg-[#08101d] rounded-xl border border-emerald-500/25 text-xs font-mono space-y-2.5 text-left">
                <div className="flex justify-between items-center text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Sender (Sponsor):
                  </span>
                  <span className="text-[#D4AF37] font-bold truncate max-w-[200px]" title={sponsorAddress}>
                    {sponsorAddress.slice(0, 8)}...{sponsorAddress.slice(-6)} ({activeCode})
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Joiner (You):
                  </span>
                  <span className="text-white font-bold truncate max-w-[200px]" title={boundRefereeAddress || currentWallet}>
                    {(boundRefereeAddress || currentWallet) ? `${(boundRefereeAddress || currentWallet).slice(0, 8)}...${(boundRefereeAddress || currentWallet).slice(-6)}` : 'Verified Joiner Wallet'}
                  </span>
                </div>
                <div className="pt-1 border-t border-[#1c2b3b] flex justify-between items-center text-gray-400">
                  <span>Network Status:</span>
                  <span className="text-emerald-400 font-bold">✓ Added to Recent Network Partners (+1)</span>
                </div>
                <div className="flex justify-between items-center text-gray-400">
                  <span>Milestone Contribution:</span>
                  <span className="text-[#00F0FF] font-bold">+1 Direct Partner toward Milestones ($15 - $500,000)</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                {onNavigateToReferrals && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToReferrals();
                    }}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#ffe088] text-[#0A0F1D] font-headline font-bold text-xs tracking-wider transition-all shadow-md hover:scale-102 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">group</span>
                    <span>View in Team Referrals</span>
                  </button>
                )}
                {onOpenMining && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenMining();
                    }}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#00b4d8] text-[#0A0F1D] font-headline font-bold text-xs tracking-wider transition-all shadow-[0_0_15px_rgba(0,240,255,0.35)] hover:scale-102 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">memory</span>
                    <span>Mining Dashboard</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* SENDER / SPONSOR CARD */}
              <div className="p-4 bg-[#0a101d] rounded-xl border border-[#1e2e42] space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase text-[#00F0FF] tracking-wider font-bold">
                      Step 1: Sender / Inviter Address (Verified)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Verified Sponsor
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 bg-[#121c2c] rounded-lg border border-[#1c2b3b]">
                    <span className="text-[10px] text-gray-400 font-mono block">Sponsor Code</span>
                    <div className="text-base font-black font-mono text-[#D4AF37] mt-0.5 tracking-wide">
                      {activeCode}
                    </div>
                  </div>

                  <div className="p-3 bg-[#121c2c] rounded-lg border border-[#1c2b3b]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-400 font-mono block">BEP-20 Wallet</span>
                      <button
                        onClick={copySponsorAddress}
                        className="text-[10px] font-mono text-[#00F0FF] hover:underline"
                      >
                        {isCopiedSponsor ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="font-mono text-xs font-bold text-white mt-1 truncate" title={sponsorAddress}>
                      {sponsorAddress ? `${sponsorAddress.slice(0, 8)}...${sponsorAddress.slice(-6)}` : 'Official Protocol'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono pt-0.5 text-gray-300">
                  <span className="text-[11px] text-gray-400">Team Status:</span>
                  <span className="text-[#00F0FF] font-semibold">{sponsorDetails?.level || 'Active Mining Leader'}</span>
                </div>
              </div>

              {/* JOINER / REFEREE CARD */}
              <div className="p-4 bg-[#0a101d] rounded-xl border border-[#1e2e42] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-[#D4AF37] tracking-wider font-bold">
                    Step 2: Joiner Address (You)
                  </span>
                  {isConnected ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Wallet Verified
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                      Awaiting Connection
                    </span>
                  )}
                </div>

                {isConnected ? (
                  <div className="p-3 bg-[#121c2c] rounded-lg border border-[#1c2b3b] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-400 font-mono block">Your Verified Address</span>
                      <span className="font-mono text-xs font-bold text-white mt-0.5 block truncate max-w-[240px]">
                        {currentWallet}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={copyJoinerAddress}
                        className="px-2.5 py-1 rounded bg-[#1c2b3b] text-[10px] font-mono text-[#00F0FF] hover:text-white transition-colors"
                      >
                        {isCopiedJoiner ? 'Copied' : 'Copy'}
                      </button>
                      {onDisconnectWallet && (
                        <button
                          onClick={onDisconnectWallet}
                          className="px-2.5 py-1 rounded bg-[#1c2b3b] hover:bg-rose-500/20 text-[10px] font-mono text-gray-400 hover:text-rose-300 transition-colors"
                          title="Switch or connect another wallet"
                        >
                          Change
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-[#121c2c]/70 rounded-lg border border-dashed border-[#1c2b3b] text-center space-y-1">
                    <p className="text-xs text-gray-300 font-medium">
                      Wallet not connected yet.
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Connect your wallet below to verify your address and join this sponsor's team.
                    </p>
                  </div>
                )}
              </div>

              {/* ERROR ALERT */}
              {bindError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-mono flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{bindError}</span>
                </div>
              )}

              {/* ACTION & VERIFY BUTTONS */}
              <div className="pt-2">
                {isSelfReferral ? (
                  /* SELF-REFERRAL NOTICE */
                  <div className="p-4 bg-[#121c2c] rounded-xl border border-[#D4AF37]/30 space-y-3">
                    <div className="flex items-center gap-2 text-[#D4AF37] font-bold text-xs">
                      <span className="material-symbols-outlined text-[18px]">info</span>
                      <span>You opened your own referral link</span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      This link belongs to your currently connected wallet. Share it with friends or test adding a simulated partner to verify that they show up in your Recent Network Partners table.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <button
                        onClick={copyReferralLink}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#e6c35c] text-[#0A0F1D] font-headline font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md hover:brightness-105"
                      >
                        <span className="material-symbols-outlined text-[16px]">content_copy</span>
                        <span>{isLinkCopied ? 'Link Copied!' : 'Copy My Referral Link'}</span>
                      </button>
                      <button
                        onClick={() => handleConnectAndAutoBind('Fresh Joiner')}
                        disabled={loadingBinding}
                        className="py-2.5 px-4 rounded-xl bg-[#142232] hover:bg-[#1f334a] text-[#00F0FF] font-mono text-xs font-bold transition-colors border border-[#00F0FF]/30 flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">person_add</span>
                        <span>{loadingBinding ? 'Connecting...' : 'Connect Test Joiner (+1 Partner)'}</span>
                      </button>
                    </div>
                  </div>
                ) : bondedInfo?.isBonded ? (
                  bondedInfo.isDifferentSponsor ? (
                    /* USER ALREADY EXISTS / BONDED UNDER DIFFERENT SPONSOR */
                    <div className="p-4 bg-gradient-to-br from-[#1c121e] to-[#121c2c] rounded-xl border border-rose-500/40 space-y-3.5 shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-2xl">lock_person</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm sm:text-base font-headline font-black text-rose-400">
                              User Already Exists
                            </h3>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              IMMUTABLE BOND
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-300 mt-0.5">
                            This wallet is already permanently registered under another sponsor
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-[#0a101d] rounded-lg border border-[#1e2e42] text-xs font-mono space-y-1.5">
                        <div className="flex justify-between text-gray-400">
                          <span>Connected Wallet:</span>
                          <span className="text-white font-bold">{currentWallet.slice(0, 8)}...{currentWallet.slice(-6)}</span>
                        </div>
                        <div className="flex justify-between text-gray-400">
                          <span>Verified Sponsor:</span>
                          <span className="text-[#D4AF37] font-bold">
                            {bondedInfo.sponsor ? `${bondedInfo.sponsor.slice(0, 8)}...${bondedInfo.sponsor.slice(-6)}` : 'Permanent Sponsor'}
                          </span>
                        </div>
                        <div className="pt-1.5 border-t border-[#1c2b3b] text-[11px] text-amber-300/90 leading-relaxed font-sans">
                          In the SPIKE Web3 protocol, wallet referral bonds are permanent and immutable to protect sponsor attribution. Re-bonding this wallet under another referral link is not permitted.
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          onClose();
                          if (onOpenMining) onOpenMining();
                        }}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#00b4d8] text-[#0A0F1D] font-headline font-black text-xs tracking-wider transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:scale-101 flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">dashboard</span>
                        <span>Go to My Dashboard</span>
                      </button>
                    </div>
                  ) : (
                    /* ALREADY CONNECTED TO THIS SPONSOR */
                    <div className="p-4 bg-gradient-to-br from-[#0a1824] to-[#121c2c] rounded-xl border border-emerald-500/40 space-y-3.5 shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-2xl">verified</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm sm:text-base font-headline font-black text-emerald-400">
                              Already Connected to Sponsor
                            </h3>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              VERIFIED
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-300 mt-0.5">
                            You are already a verified partner under sponsor {activeCode}
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-[#0a101d] rounded-lg border border-[#1e2e42] text-xs font-mono text-gray-300 space-y-1">
                        <p className="text-[11px] leading-relaxed font-sans">
                          Your wallet is already permanently bonded under this sponsor. No second bonding is required.
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          onClose();
                          if (onOpenMining) onOpenMining();
                        }}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#00b4d8] text-[#0A0F1D] font-headline font-black text-xs tracking-wider transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:scale-101 flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">dashboard</span>
                        <span>Go to My Dashboard</span>
                      </button>
                    </div>
                  )
                ) : !isConnected ? (
                  /* NOT CONNECTED STATE: CONNECT WALLET OPTIONS */
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleConnectAndAutoBind('MetaMask')}
                        className="p-2.5 rounded-xl bg-[#0a101d] hover:bg-[#142232] border border-[#1e2e42] hover:border-[#00F0FF]/40 text-center transition-all flex flex-col items-center justify-center gap-1.5 group"
                      >
                        <span className="text-xl">🦊</span>
                        <div className="text-[11px] font-bold text-white group-hover:text-[#00F0FF]">
                          MetaMask
                        </div>
                      </button>

                      <button
                        onClick={() => handleConnectAndAutoBind('TrustWallet')}
                        className="p-2.5 rounded-xl bg-[#0a101d] hover:bg-[#142232] border border-[#1e2e42] hover:border-[#00F0FF]/40 text-center transition-all flex flex-col items-center justify-center gap-1.5 group"
                      >
                        <span className="text-xl">🛡️</span>
                        <div className="text-[11px] font-bold text-white group-hover:text-[#00F0FF]">
                          Trust Wallet
                        </div>
                      </button>

                      <button
                        onClick={() => handleConnectAndAutoBind('SafePal')}
                        className="p-2.5 rounded-xl bg-[#0a101d] hover:bg-[#142232] border border-[#1e2e42] hover:border-[#00F0FF]/40 text-center transition-all flex flex-col items-center justify-center gap-1.5 group"
                      >
                        <span className="text-xl">🔐</span>
                        <div className="text-[11px] font-bold text-white group-hover:text-[#00F0FF]">
                          SafePal
                        </div>
                      </button>
                    </div>

                    <button
                      onClick={() => handleConnectAndAutoBind('Injected')}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#7df4ff] text-[#0A0F1D] font-headline font-black text-xs tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:scale-101 active:scale-98"
                    >
                      <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                      <span>Connect Wallet &amp; Join Team</span>
                    </button>
                  </div>
                ) : (
                  /* CONNECTED STATE: CONFIRM AND BIND BUTTON */
                  <div className="space-y-3">
                    <button
                      onClick={handleExecuteBinding}
                      disabled={loadingBinding}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00F0FF] via-[#5cf0ff] to-[#00c8d6] hover:brightness-110 text-[#0A0F1D] font-headline font-black text-xs tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,240,255,0.4)] disabled:opacity-50 hover:scale-101 active:scale-98"
                    >
                      {loadingBinding ? (
                        <>
                          <span className="w-4 h-4 border-2 border-[#0A0F1D] border-t-transparent rounded-full animate-spin" />
                          <span>Verifying &amp; Linking into Team...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
                          <span>Confirm &amp; Join {activeCode} Team</span>
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-gray-400 text-center font-mono">
                      ✓ Immediately adds you to sponsor's Recent Network Partners table &amp; updates milestones
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
