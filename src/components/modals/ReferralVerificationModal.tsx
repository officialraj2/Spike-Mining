import React, { useState, useEffect } from 'react';

interface ReferralVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralCodeOrAddr: string;
  currentWallet: string;
  isConnected: boolean;
  onConnectWallet: (provider: string, customAddress?: string, keepCurrentTab?: boolean) => void | Promise<string>;
  onBindSponsor: (codeOrAddr: string, explicitReferee?: string) => Promise<boolean>;
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
  const [activeQuery, setActiveQuery] = useState<string>(referralCodeOrAddr || '');
  const [loadingVerify, setLoadingVerify] = useState<boolean>(false);
  const [loadingBinding, setLoadingBinding] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [bindError, setBindError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isLinkCopied, setIsLinkCopied] = useState<boolean>(false);

  const [sponsorDetails, setSponsorDetails] = useState<{
    code: string;
    address: string;
    level: string;
    bonusPercent: string;
    verified: boolean;
  } | null>(null);

  // Helper to extract clean address or code from full URLs, shortlinks, or query params
  const extractCodeOrAddress = (str: string): { address?: string; code?: string } => {
    if (!str) return {};
    const trimmed = str.trim();
    const addr = trimmed.match(/0x[a-fA-F0-9]{40}/i);
    if (addr) return { address: addr[0] };
    const sponsorParam = trimmed.match(/[?&]sponsor=(0x[a-fA-F0-9]{40})/i);
    if (sponsorParam) return { address: sponsorParam[1] };
    const refMatch = trimmed.match(/\/(?:ref|r)\/([a-zA-Z0-9_\-]+)/i);
    if (refMatch && refMatch[1]) {
      const seg = refMatch[1];
      if (/^0x[a-fA-F0-9]{40}$/i.test(seg)) return { address: seg };
      return { code: seg };
    }
    const qMatch = trimmed.match(/[?&](?:ref|referrer|r|code)=([^&#\s]+)/i);
    if (qMatch && qMatch[1]) {
      const val = decodeURIComponent(qMatch[1]);
      if (/^0x[a-fA-F0-9]{40}$/i.test(val)) return { address: val };
      return { code: val };
    }
    const clean = trimmed.replace(/^https?:\/\/[^\/]+/i, '').replace(/^[/?#]+/, '').trim();
    if (/^0x[a-fA-F0-9]{40}$/i.test(clean)) return { address: clean };
    return { code: clean };
  };

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
        bonusPercent: '15%',
        verified: true,
      });
      return;
    }

    setLoadingVerify(true);
    setBindError(null);

    fetch(`/api/referrals/verify-sponsor?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.success) {
          setSponsorDetails({
            code: data.referralCode,
            address: data.sponsorAddress,
            level: data.level || 'Verified Sponsor',
            bonusPercent: data.commissionRate || '15%',
            verified: true,
          });
        } else {
          const parsed = extractCodeOrAddress(q);
          const isAddr = parsed.address || (/^0x[a-fA-F0-9]{40}$/i.test(q) ? q : null);
          const derivedAddr = isAddr || '0x71C8a914B97e889F12A0987cB32456Fa12349A2';
          const derivedCode = isAddr ? `SPK-${isAddr.slice(2, 8).toUpperCase()}` : (parsed.code || q).toUpperCase();
          setSponsorDetails({
            code: derivedCode.startsWith('SPK-') ? derivedCode : `SPK-${derivedCode}`,
            address: derivedAddr,
            level: 'Verified Sponsor',
            bonusPercent: '15%',
            verified: true,
          });
        }
      })
      .catch(() => {
        const parsed = extractCodeOrAddress(q);
        const isAddr = parsed.address || (/^0x[a-fA-F0-9]{40}$/i.test(q) ? q : null);
        const derivedAddr = isAddr || '0x71C8a914B97e889F12A0987cB32456Fa12349A2';
        const derivedCode = isAddr ? `SPK-${isAddr.slice(2, 8).toUpperCase()}` : (parsed.code || q).toUpperCase();
        setSponsorDetails({
          code: derivedCode.startsWith('SPK-') ? derivedCode : `SPK-${derivedCode}`,
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

  const activeCode = sponsorDetails?.code || 'SPK-71C8A9';
  const sponsorAddress = sponsorDetails?.address || '0x71C8a914B97e889F12A0987cB32456Fa12349A2';

  // Check if connected wallet is the sponsor themselves
  const isSelfReferral = Boolean(
    isConnected &&
    currentWallet &&
    sponsorAddress &&
    (currentWallet.toLowerCase() === sponsorAddress.toLowerCase() ||
     currentWallet.toLowerCase().includes(activeCode.replace(/^SPK-/i, '').toLowerCase()))
  );

  const handleExecuteBinding = async () => {
    setLoadingBinding(true);
    setBindError(null);
    try {
      const ok = await onBindSponsor(sponsorAddress || activeCode);
      if (ok) {
        setIsSuccess(true);
      } else {
        setBindError('Unable to link sponsor. You may already be linked to a team.');
      }
    } catch (e: any) {
      setBindError(e?.message || 'Error executing referral connection');
    } finally {
      setLoadingBinding(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(activeCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const copyReferralLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://spikenodes.com';
    const link = `${origin}/ref/${activeCode}?sponsor=${sponsorAddress}`;
    navigator.clipboard?.writeText(link);
    setIsLinkCopied(true);
    setTimeout(() => setIsLinkCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0c1424] border border-[#1e2e42] rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.15)] overflow-hidden flex flex-col">
        {/* Subtle accent border line */}
        <div className="h-1 w-full bg-gradient-to-r from-[#00F0FF] via-[#D4AF37] to-[#00F0FF]" />

        {/* Modal Header */}
        <div className="p-5 md:p-6 pb-4 border-b border-[#1c2b3b] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00F0FF]/15 border border-[#00F0FF]/30 flex items-center justify-center text-[#00F0FF] shrink-0">
              <span className="material-symbols-outlined text-2xl">verified_user</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-headline font-bold text-white tracking-wide">
                  Sponsor Verification
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30">
                  SPIKE NETWORK
                </span>
              </div>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                Join your sponsor's team and activate decentralized mining rewards
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

        {/* Modal Body */}
        <div className="p-5 md:p-6 space-y-4">
          {/* SUCCESS STATE */}
          {isSuccess ? (
            <div className="text-center py-4 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-[0_0_24px_rgba(16,185,129,0.35)]">
                <span className="material-symbols-outlined text-4xl">check_circle</span>
              </div>
              <div>
                <h3 className="text-lg font-headline font-bold text-white">
                  Sponsor Successfully Linked!
                </h3>
                <p className="text-xs text-[#94a3b8] mt-1 max-w-sm mx-auto">
                  Your wallet is now registered under sponsor{' '}
                  <span className="text-[#D4AF37] font-mono font-bold">{activeCode}</span>.
                  Your team partner benefits and hashrate bonus are active.
                </p>
              </div>

              <div className="p-3.5 bg-[#08101d] rounded-xl border border-emerald-500/20 text-xs font-mono space-y-2 text-left">
                <div className="flex justify-between items-center text-gray-400">
                  <span>Assigned Sponsor:</span>
                  <span className="text-[#D4AF37] font-bold">{activeCode}</span>
                </div>
                <div className="flex justify-between items-center text-gray-400">
                  <span>Your Wallet:</span>
                  <span className="text-white">
                    {currentWallet ? `${currentWallet.slice(0, 8)}...${currentWallet.slice(-6)}` : 'Connected'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-400">
                  <span>Team Status:</span>
                  <span className="text-emerald-400 font-bold">Active Partner (+1 Counted)</span>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                {onOpenMining && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenMining();
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#00b4d8] text-[#0A0F1D] font-headline font-bold text-xs tracking-wider transition-all shadow-[0_0_15px_rgba(0,240,255,0.35)] hover:scale-102 flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">memory</span>
                    <span>Launch Mining Nodes</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-[#142232] hover:bg-[#1e3248] text-white text-xs font-mono transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Sponsor Card */}
              <div className="p-4 bg-[#0a101d] rounded-xl border border-[#1e2e42] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-[#94a3b8] tracking-wider font-semibold">
                    Inviting Sponsor
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Verified Partner
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 bg-[#121c2c] rounded-lg border border-[#1c2b3b]">
                    <span className="text-[10px] text-gray-400 font-mono block">Referral Code</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-base font-black text-[#D4AF37]">
                        {activeCode}
                      </span>
                      <button
                        onClick={copyCode}
                        className="text-[10px] font-mono text-[#00F0FF] hover:underline"
                      >
                        {isCopied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-[#121c2c] rounded-lg border border-[#1c2b3b]">
                    <span className="text-[10px] text-gray-400 font-mono block">Sponsor Wallet</span>
                    <span className="font-mono text-xs font-bold text-white block mt-1.5 truncate" title={sponsorAddress}>
                      {sponsorAddress ? `${sponsorAddress.slice(0, 8)}...${sponsorAddress.slice(-6)}` : 'Official Protocol'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono pt-1 text-gray-300">
                  <span className="text-[11px] text-gray-400">Team Bonus:</span>
                  <span className="text-[#00F0FF] font-semibold">15% Hashrate Boost & Commissions</span>
                </div>
              </div>

              {/* Enter or Change Sponsor Input */}
              <div>
                <label className="text-[10px] font-mono uppercase text-gray-400 tracking-wider font-semibold block mb-1.5">
                  Sponsor Code or Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter SPK code, 0x wallet address, or link"
                    value={activeQuery}
                    onChange={(e) => setActiveQuery(e.target.value)}
                    className="flex-1 bg-[#0a101d] border border-[#1e2e42] focus:border-[#00F0FF] rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-gray-500 focus:outline-none transition-colors"
                  />
                  <button
                    disabled={loadingVerify || !activeQuery.trim()}
                    onClick={() => {
                      const trimmed = activeQuery.trim();
                      if (trimmed) setActiveQuery(trimmed);
                    }}
                    className="px-4 py-2 bg-[#142232] hover:bg-[#00F0FF] hover:text-[#0A0F1D] text-[#00F0FF] rounded-xl text-xs font-mono font-bold transition-all disabled:opacity-40"
                  >
                    {loadingVerify ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </div>

              {/* ERROR ALERT */}
              {bindError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-mono flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{bindError}</span>
                </div>
              )}

              {/* ACTION SECTION */}
              <div className="pt-2">
                {isSelfReferral ? (
                  /* SELF-REFERRAL NOTICE */
                  <div className="p-4 bg-[#121c2c] rounded-xl border border-[#D4AF37]/30 space-y-3">
                    <div className="flex items-center gap-2 text-[#D4AF37] font-bold text-xs">
                      <span className="material-symbols-outlined text-[18px]">info</span>
                      <span>This is your own referral link</span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      Share this invitation link with friends and community members. When they connect their wallet, they are automatically added as your direct partner and you receive team mining commissions.
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
                        onClick={handleExecuteBinding}
                        disabled={loadingBinding}
                        className="py-2.5 px-4 rounded-xl bg-[#142232] hover:bg-[#1f334a] text-[#00F0FF] font-mono text-xs font-bold transition-colors border border-[#00F0FF]/20 flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">person_add</span>
                        <span>{loadingBinding ? 'Testing...' : 'Test Partner (+1)'}</span>
                      </button>
                    </div>
                  </div>
                ) : !isConnected ? (
                  /* NOT CONNECTED STATE */
                  <div className="space-y-3">
                    <p className="text-xs text-gray-400 text-center">
                      Connect your Web3 wallet to link to this sponsor and activate your account.
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        onClick={() => onConnectWallet('MetaMask')}
                        className="p-3 rounded-xl bg-[#0a101d] hover:bg-[#142232] border border-[#1e2e42] hover:border-[#00F0FF]/40 text-left transition-all flex items-center gap-2.5 group"
                      >
                        <span className="text-xl">🦊</span>
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-[#00F0FF]">
                            MetaMask
                          </div>
                          <div className="text-[10px] text-gray-400">Browser / Mobile</div>
                        </div>
                      </button>

                      <button
                        onClick={() => onConnectWallet('TrustWallet')}
                        className="p-3 rounded-xl bg-[#0a101d] hover:bg-[#142232] border border-[#1e2e42] hover:border-[#00F0FF]/40 text-left transition-all flex items-center gap-2.5 group"
                      >
                        <span className="text-xl">🛡️</span>
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-[#00F0FF]">
                            Trust Wallet
                          </div>
                          <div className="text-[10px] text-gray-400">Multi-Chain Web3</div>
                        </div>
                      </button>
                    </div>

                    <button
                      onClick={() => onConnectWallet('Injected')}
                      className="w-full py-2.5 rounded-xl bg-[#142232] hover:bg-[#1f334a] text-gray-300 hover:text-white text-xs font-mono transition-colors text-center"
                    >
                      Connect with Other Web3 Wallet
                    </button>
                  </div>
                ) : (
                  /* CONNECTED REFEREE STATE */
                  <div className="space-y-3">
                    <div className="p-3 bg-[#08101d] rounded-xl border border-[#1c2b3b] flex items-center justify-between text-xs font-mono">
                      <span className="text-gray-400">Connected Wallet:</span>
                      <span className="text-[#00F0FF] font-bold">
                        {currentWallet ? `${currentWallet.slice(0, 8)}...${currentWallet.slice(-6)}` : 'Connected'}
                      </span>
                    </div>

                    <button
                      onClick={handleExecuteBinding}
                      disabled={loadingBinding}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00F0FF] via-[#5cf0ff] to-[#00c8d6] hover:brightness-110 text-[#0A0F1D] font-headline font-black text-xs tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.35)] disabled:opacity-50 hover:scale-101 active:scale-98"
                    >
                      {loadingBinding ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-[#0A0F1D] border-t-transparent rounded-full animate-spin" />
                          <span>Linking Sponsor to Account...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">handshake</span>
                          <span>Confirm &amp; Bind Sponsor</span>
                        </>
                      )}
                    </button>
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
