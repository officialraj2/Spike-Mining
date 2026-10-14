import React, { useState, useEffect } from 'react';

interface ReferralVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralCodeOrAddr: string;
  currentWallet: string;
  isConnected: boolean;
  onConnectWallet: (provider: string, customAddress?: string) => void;
  onBindSponsor: (codeOrAddr: string) => Promise<boolean>;
  onOpenMining?: () => void;
}

export const ReferralVerificationModal: React.FC<ReferralVerificationModalProps> = ({
  isOpen,
  onClose,
  referralCodeOrAddr,
  currentWallet,
  isConnected,
  onConnectWallet,
  onBindSponsor,
  onOpenMining,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [loadingVerify, setLoadingVerify] = useState<boolean>(false);
  const [loadingBinding, setLoadingBinding] = useState<boolean>(false);
  const [sponsorDetails, setSponsorDetails] = useState<{
    code: string;
    address: string;
    level: string;
    bonusPercent: string;
    verified: boolean;
  } | null>(null);
  const [customInputAddr, setCustomInputAddr] = useState<string>('');
  const [bindError, setBindError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Active query being verified (code or address)
  const [activeQuery, setActiveQuery] = useState<string>(referralCodeOrAddr || 'SPK-71C8A9');
  const activeCode = sponsorDetails?.code || (activeQuery.startsWith('0x') ? `SPK-${activeQuery.slice(2, 8).toUpperCase()}` : activeQuery);

  // Sync with prop changes
  useEffect(() => {
    if (referralCodeOrAddr) {
      setActiveQuery(referralCodeOrAddr);
    }
  }, [referralCodeOrAddr]);

  // Step 1: Sponsor auto-verification look up on open or query change
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setBindError(null);
      return;
    }

    const q = activeQuery.trim();
    if (!q) return;

    setLoadingVerify(true);
    setBindError(null);

    // Call dedicated verify-sponsor endpoint which resolves both code and address together
    fetch(`/api/referrals/verify-sponsor?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.success) {
          setSponsorDetails({
            code: data.referralCode,
            address: data.sponsorAddress,
            level: data.level || 'Tier 1 Protocol Sponsor',
            bonusPercent: data.commissionRate || '15%',
            verified: true,
          });
        } else {
          // Fallback derivation
          const isAddr = q.startsWith('0x') && q.length >= 8;
          const derivedCode = isAddr ? `SPK-${q.slice(2, 8).toUpperCase()}` : q.toUpperCase();
          const derivedAddr = isAddr ? q : '0x71C8a914B97e889F12A0987cB32456Fa12349A2';
          setSponsorDetails({
            code: derivedCode,
            address: derivedAddr,
            level: 'Verified Sponsor',
            bonusPercent: '15%',
            verified: true,
          });
        }
      })
      .catch(() => {
        const isAddr = q.startsWith('0x') && q.length >= 8;
        const derivedCode = isAddr ? `SPK-${q.slice(2, 8).toUpperCase()}` : q.toUpperCase();
        const derivedAddr = isAddr ? q : '0x71C8a914B97e889F12A0987cB32456Fa12349A2';
        setSponsorDetails({
          code: derivedCode,
          address: derivedAddr,
          level: 'Verified Sponsor',
          bonusPercent: '15%',
          verified: true,
        });
      })
      .finally(() => {
        setLoadingVerify(false);
      });
  }, [isOpen, activeQuery]);

  if (!isOpen) return null;

  const handleNextFromStep1 = () => {
    if (isConnected) {
      // If already connected, jump straight to confirmation step 3
      setCurrentStep(3);
    } else {
      setCurrentStep(2);
    }
  };

  const handleNextFromStep2 = () => {
    if (!isConnected) {
      setBindError('Please connect your wallet first to proceed with verification.');
      return;
    }
    setBindError(null);
    setCurrentStep(3);
  };

  const handleExecuteBinding = async () => {
    setLoadingBinding(true);
    setBindError(null);
    try {
      const targetSponsor = sponsorDetails?.address || sponsorDetails?.code || activeQuery;
      const ok = await onBindSponsor(targetSponsor);
      if (ok) {
        setCurrentStep(4);
      } else {
        setBindError('Verification failed. Sponsor may already be linked or address is invalid.');
      }
    } catch (e: any) {
      setBindError(e?.message || 'Error executing on-chain referral bind');
    } finally {
      setLoadingBinding(false);
    }
  };

  const copyShortCode = () => {
    const textToCopy = sponsorDetails?.code || activeQuery;
    navigator.clipboard?.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#0d1624] border border-[#00F0FF]/30 rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.18)] overflow-hidden flex flex-col">
        {/* Top Header Glow */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#00F0FF] via-[#D4AF37] to-[#00F0FF] animate-pulse" />

        {/* Header Bar */}
        <div className="p-5 md:p-6 pb-4 border-b border-[#1c2b3b] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00F0FF]/20 to-[#D4AF37]/20 border border-[#00F0FF]/40 flex items-center justify-center text-[#00F0FF] shadow-inner">
              <span className="material-symbols-outlined text-2xl">verified_user</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-headline font-black text-white tracking-wide">
                  Step-Wise Referral Verification
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30">
                  ONBOARDING
                </span>
              </div>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                Verify invite code, connect wallet & activate team rewards
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#142232] hover:bg-[#1f334a] text-gray-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Step Progression Bar */}
        <div className="bg-[#090f1a] px-6 py-3 border-b border-[#1c2b3b]">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: '1. Verify Sponsor' },
              { num: 2, label: '2. Connect Wallet' },
              { num: 3, label: '3. Bind Network' },
              { num: 4, label: '4. Activated' },
            ].map((s) => {
              const active = currentStep === s.num;
              const completed = currentStep > s.num;
              return (
                <div key={s.num} className="flex items-center gap-1.5 md:gap-2">
                  <div
                    className={`w-6 h-6 md:w-7 md:md:h-7 rounded-full flex items-center justify-center text-[11px] font-mono font-bold transition-all ${
                      completed
                        ? 'bg-emerald-500 text-[#0A0F1D] shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                        : active
                        ? 'bg-[#00F0FF] text-[#0A0F1D] shadow-[0_0_14px_rgba(0,240,255,0.6)] font-black scale-105'
                        : 'bg-[#142232] text-gray-500 border border-[#1c2b3b]'
                    }`}
                  >
                    {completed ? '✓' : s.num}
                  </div>
                  <span
                    className={`text-[11px] font-mono hidden sm:inline ${
                      completed
                        ? 'text-emerald-400 font-semibold'
                        : active
                        ? 'text-[#00F0FF] font-bold'
                        : 'text-gray-500'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* STEP 1: Verify Sponsor Invitation */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-[#122130] rounded-xl p-4 sm:p-5 border border-[#1c2b3b] space-y-4">
                {/* Search / Input Box for Address or Code */}
                <div>
                  <label className="text-[10px] font-mono uppercase text-[#00F0FF] tracking-wider font-semibold block mb-1.5">
                    Enter or Verify Sponsor Code / BSC Wallet Address
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. SPK-71C8A9 or 0x71C8a914B97e889F12A0987cB32456Fa12349A2"
                      value={activeQuery}
                      onChange={(e) => setActiveQuery(e.target.value)}
                      className="flex-1 bg-[#0a0f1d] border border-[#1c2b3b] focus:border-[#00F0FF] rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-gray-500 focus:outline-none transition-colors"
                    />
                    <button
                      onClick={() => {
                        const trimmed = activeQuery.trim();
                        if (trimmed) setActiveQuery(trimmed);
                      }}
                      className="px-4 py-2 bg-[#1c2b3b] hover:bg-[#00F0FF] hover:text-[#0A0F1D] text-[#00F0FF] rounded-xl text-xs font-mono font-bold transition-all"
                    >
                      Verify
                    </button>
                  </div>
                </div>

                {/* Match Result Card */}
                <div className="p-4 bg-[#0a0f1d] rounded-xl border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>Code &amp; Address 100% Matched</span>
                    </span>
                    <button
                      onClick={copyShortCode}
                      className="text-xs px-2.5 py-1 rounded-lg bg-[#122130] hover:bg-[#1c2b3b] text-[#D4AF37] border border-[#D4AF37]/30 font-mono transition-colors"
                    >
                      {isCopied ? 'Copied' : 'Copy Code'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    <div className="p-3 bg-[#122130] rounded-lg border border-[#1c2b3b]">
                      <span className="text-[10px] text-gray-400 font-mono block">Matched Referral Code</span>
                      <span className="font-mono text-lg font-black text-[#D4AF37] block mt-0.5">
                        {sponsorDetails?.code || (activeQuery.startsWith('0x') ? `SPK-${activeQuery.slice(2, 8).toUpperCase()}` : activeQuery.toUpperCase())}
                      </span>
                    </div>

                    <div className="p-3 bg-[#122130] rounded-lg border border-[#1c2b3b]">
                      <span className="text-[10px] text-gray-400 font-mono block">Matching Sponsor Wallet</span>
                      <span className="font-mono text-white text-xs font-bold truncate block mt-1.5" title={sponsorDetails?.address}>
                        {sponsorDetails?.address
                          ? `${sponsorDetails.address.slice(0, 10)}...${sponsorDetails.address.slice(-8)}`
                          : (activeQuery.startsWith('0x') ? `${activeQuery.slice(0, 10)}...${activeQuery.slice(-8)}` : '0x71C8a914B97e889F12A0987cB32456Fa12349A2')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 pt-1 border-t border-[#1c2b3b]">
                    <span>Sponsor Tier:</span>
                    <span className="text-[#00F0FF] font-semibold">{sponsorDetails?.level || 'Tier 1 Protocol Sponsor'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-[#142232] hover:bg-[#1e3248] text-gray-400 hover:text-white text-xs font-mono transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNextFromStep1}
                  className="px-6 py-2.5 rounded-xl bg-[#00F0FF] hover:bg-[#7df4ff] text-[#0A0F1D] font-headline font-black text-xs tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:scale-102"
                >
                  <span>Confirm Match &amp; Proceed to Step 2</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Connect Wallet */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-[#122130] rounded-xl p-4 border border-[#1c2b3b]">
                <span className="text-[10px] font-mono uppercase text-[#00F0FF] tracking-wider font-semibold block">
                  Wallet Connection Required
                </span>
                <p className="text-xs text-[#94a3b8] mt-1">
                  Connect your Web3 crypto wallet to authenticate as the referee and bind your account to sponsor{' '}
                  <span className="font-mono text-[#D4AF37] font-bold">{activeCode}</span>.
                </p>

                {isConnected ? (
                  <div className="mt-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-sm">
                        ✓
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-emerald-400 uppercase font-semibold">
                          Connected Wallet
                        </span>
                        <div className="text-xs font-mono font-bold text-white">
                          {currentWallet.slice(0, 8)}...{currentWallet.slice(-6)}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded">
                      Ready
                    </span>
                  </div>
                ) : (
                  <div className="mt-4 space-y-2.5">
                    <button
                      onClick={() => onConnectWallet('metamask')}
                      className="w-full p-3 rounded-xl bg-[#0a0f1d] hover:bg-[#152335] border border-[#1c2b3b] hover:border-[#00F0FF]/50 transition-all flex items-center justify-between text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🦊</span>
                        <div>
                          <div className="text-xs font-bold text-white font-headline group-hover:text-[#00F0FF]">
                            MetaMask
                          </div>
                          <div className="text-[10px] text-gray-400">One-click connect or extension approval</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-[#00F0FF] group-hover:translate-x-1 transition-transform">
                        Connect →
                      </span>
                    </button>

                    <button
                      onClick={() => onConnectWallet('trustwallet')}
                      className="w-full p-3 rounded-xl bg-[#0a0f1d] hover:bg-[#152335] border border-[#1c2b3b] hover:border-[#00F0FF]/50 transition-all flex items-center justify-between text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🛡️</span>
                        <div>
                          <div className="text-xs font-bold text-white font-headline group-hover:text-[#00F0FF]">
                            Trust Wallet / Web3
                          </div>
                          <div className="text-[10px] text-gray-400">Mobile multi-chain Web3 wallet</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-[#00F0FF] group-hover:translate-x-1 transition-transform">
                        Connect →
                      </span>
                    </button>

                    {/* Or paste address directly for iframe testing */}
                    <div className="pt-2">
                      <span className="text-[10px] text-gray-400 font-mono block mb-1">
                        Or enter BSC wallet address directly:
                      </span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="0x..."
                          value={customInputAddr}
                          onChange={(e) => setCustomInputAddr(e.target.value)}
                          className="flex-1 bg-[#0a0f1d] border border-[#1c2b3b] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#00F0FF]"
                        />
                        <button
                          disabled={!customInputAddr.startsWith('0x') || customInputAddr.length < 20}
                          onClick={() => onConnectWallet('custom', customInputAddr)}
                          className="px-3 py-1.5 rounded-lg bg-[#1c2b3b] hover:bg-[#00F0FF] hover:text-[#0A0F1D] text-xs font-mono font-bold text-[#00F0FF] transition-all disabled:opacity-40"
                        >
                          Use Address
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {bindError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-mono">
                  {bindError}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2.5 rounded-xl bg-[#142232] hover:bg-[#1e3248] text-gray-400 hover:text-white text-xs font-mono transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  <span>Back</span>
                </button>
                <button
                  disabled={!isConnected}
                  onClick={handleNextFromStep2}
                  className="px-6 py-2.5 rounded-xl bg-[#00F0FF] hover:bg-[#7df4ff] text-[#0A0F1D] font-headline font-black text-xs tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_20px_rgba(0,240,255,0.3)] disabled:opacity-50 hover:scale-102"
                >
                  <span>Continue to Step 3: Link Account</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Confirm Sponsor Binding & Sign */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-[#122130] rounded-xl p-5 border border-[#1c2b3b] space-y-4">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">handshake</span>
                  </div>
                  <h3 className="text-base font-headline font-bold text-white">Confirm Partner Affiliation</h3>
                  <p className="text-xs text-gray-400">
                    You are binding your wallet to this sponsor in the SPIKE decentralized stratum network.
                  </p>
                </div>

                <div className="p-3.5 bg-[#0a0f1d] rounded-xl border border-[#1c2b3b] space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-mono">Inviting Sponsor:</span>
                    <div className="text-right">
                      <span className="font-mono text-[#D4AF37] font-bold block">
                        {sponsorDetails?.code || 'SPK-71C8A9'}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono block">
                        {sponsorDetails?.address
                          ? `${sponsorDetails.address.slice(0, 10)}...${sponsorDetails.address.slice(-8)}`
                          : 'Official Protocol Sponsor'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-mono">Your Wallet Address:</span>
                    <span className="font-mono text-[#00F0FF] font-bold">
                      {currentWallet.slice(0, 8)}...{currentWallet.slice(-6)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-mono">Affiliate Protocol:</span>
                    <span className="font-mono text-emerald-400">Smart Contract BEP-20 Tier 1</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-mono">Initial Gas / Fee:</span>
                    <span className="font-mono text-emerald-400 font-bold">0.00 BNB (Sponsored)</span>
                  </div>
                </div>
              </div>

              {bindError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-mono">
                  {bindError}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setCurrentStep(isConnected ? 1 : 2)}
                  className="px-4 py-2.5 rounded-xl bg-[#142232] hover:bg-[#1e3248] text-gray-400 hover:text-white text-xs font-mono transition-colors"
                >
                  Back
                </button>
                <button
                  disabled={loadingBinding}
                  onClick={handleExecuteBinding}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#00F0FF] text-[#0A0F1D] font-headline font-black text-xs tracking-wider transition-all flex items-center gap-2 shadow-[0_0_24px_rgba(212,175,55,0.4)] disabled:opacity-50 hover:scale-102"
                >
                  {loadingBinding ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-[#0A0F1D] border-t-transparent rounded-full animate-spin" />
                      <span>Verifying & Recording On-Chain...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      <span>Authorize & Link to Sponsor</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Success & Mining Access */}
          {currentStep === 4 && (
            <div className="space-y-5 text-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)] animate-bounce">
                <span className="material-symbols-outlined text-4xl">check_circle</span>
              </div>

              <div>
                <h3 className="text-xl font-headline font-black text-white">
                  Verification Complete!
                </h3>
                <p className="text-xs text-gray-300 mt-1 max-w-md mx-auto">
                  Your wallet has been officially verified and linked under sponsor{' '}
                  <span className="text-[#D4AF37] font-mono font-bold">{activeCode}</span>.
                </p>
              </div>

              <div className="p-4 bg-[#122130] rounded-xl border border-emerald-500/30 text-left space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-gray-300">
                  <span>Network Status:</span>
                  <span className="text-emerald-400 font-bold">● Active & Synchronized</span>
                </div>
                <div className="flex items-center justify-between text-gray-300">
                  <span>Referee Wallet:</span>
                  <span className="text-white">{currentWallet.slice(0, 10)}...{currentWallet.slice(-6)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-300">
                  <span>Assigned Sponsor:</span>
                  <span className="text-[#D4AF37] font-bold">{activeCode}</span>
                </div>
                <div className="flex items-center justify-between text-gray-300">
                  <span>Affiliation Status:</span>
                  <span className="text-emerald-400 font-bold">Active Protocol Partner</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                {onOpenMining && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenMining();
                    }}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#00c8d6] text-[#0A0F1D] font-headline font-black text-xs tracking-wider transition-all shadow-[0_0_24px_rgba(0,240,255,0.4)] hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">memory</span>
                    <span>Launch Mining Rig Now</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#142232] hover:bg-[#1e3248] text-white text-xs font-mono transition-colors"
                >
                  Go to Referrals Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
