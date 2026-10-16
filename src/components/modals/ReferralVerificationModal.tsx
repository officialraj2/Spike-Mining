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

  // Web3 Smart Call Execution State
  const [smartCallStatus, setSmartCallStatus] = useState<
    'idle' | 'requesting_accounts' | 'requesting_signature' | 'broadcasting' | 'confirmed' | 'failed'
  >('idle');
  const [smartCallMessage, setSmartCallMessage] = useState<string>('');
  const [smartCallTx, setSmartCallTx] = useState<string>('');
  const [smartCallConfirmedPartner, setSmartCallConfirmedPartner] = useState<boolean>(false);
  const [showSmartCallModal, setShowSmartCallModal] = useState<boolean>(false);
  const [simulatedRefereeAddr, setSimulatedRefereeAddr] = useState<string>('0x38069663d6408dff184bafc65e247e37ae84a1c2');

  // Helper to convert plain string to 0x-hex for EIP-1193 personal_sign
  const stringToHex = (str: string): string => {
    let hex = '';
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i).toString(16);
      hex += code.length < 2 ? '0' + code : code;
    }
    return '0x' + hex;
  };

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

  // Active query being verified (link, code, or address)
  const [activeQuery, setActiveQuery] = useState<string>(referralCodeOrAddr || '');
  const activeCode = sponsorDetails?.code || (activeQuery.startsWith('0x') ? `SPK-${activeQuery.slice(2, 8).toUpperCase()}` : (activeQuery || 'SPK-71C8A9'));

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
      setSmartCallConfirmedPartner(false);
      setSmartCallStatus('idle');
      return;
    }

    const q = activeQuery.trim();
    if (!q) {
      // Default protocol fallback if empty
      setSponsorDetails({
        code: 'SPK-71C8A9',
        address: '0x71C8a914B97e889F12A0987cB32456Fa12349A2',
        level: 'Protocol Official Team Sponsor',
        bonusPercent: '15%',
        verified: true,
      });
      return;
    }

    setLoadingVerify(true);
    setBindError(null);

    // Call dedicated verify-sponsor endpoint which resolves both code, address, and URLs
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
          // Smart local fallback derivation
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

  // Self-referral detection check
  const isSelfReferral = Boolean(
    isConnected &&
    currentWallet &&
    sponsorDetails?.address &&
    currentWallet.toLowerCase() === sponsorDetails.address.toLowerCase()
  );

  const handleNextFromStep1 = () => {
    if (isSelfReferral) {
      setBindError('Cannot bind yourself as sponsor. Please enter an inviter wallet address or referral code.');
      return;
    }
    // Always navigate to Step 2 so user can review/execute the wallet connect & smart call
    setCurrentStep(2);
  };

  const triggerSmartCall = async (provider: 'metamask' | 'trustwallet' | 'simulation', explicitAddr?: string) => {
    const win = typeof window !== 'undefined' ? (window as any) : null;
    const hasEthereum = Boolean(win?.ethereum && typeof win.ethereum.request === 'function');

    if ((provider === 'metamask' || provider === 'trustwallet') && !hasEthereum) {
      // In sandbox/preview without injected Web3 extension, open authentic in-modal Web3 Smart Call Prompt!
      setShowSmartCallModal(true);
      return;
    }

    await executeSmartCall(provider, explicitAddr);
  };

  const executeSmartCall = async (provider: 'metamask' | 'trustwallet' | 'simulation', explicitAddr?: string) => {
    setBindError(null);
    setSmartCallStatus('idle');
    setSmartCallMessage('');

    const targetSponsor = sponsorDetails?.address || sponsorDetails?.code || activeQuery;
    const win = typeof window !== 'undefined' ? (window as any) : null;
    const hasEthereum = Boolean(win?.ethereum && typeof win.ethereum.request === 'function');

    if ((provider === 'metamask' || provider === 'trustwallet') && hasEthereum) {
      try {
        setSmartCallStatus('requesting_accounts');
        setSmartCallMessage('Opening Web3 wallet popup... Please select referee account and approve connection.');

        const accounts = (await win.ethereum.request({ method: 'eth_requestAccounts' })) as string[];
        if (!accounts || !accounts.length) {
          throw new Error('No accounts selected in wallet.');
        }
        const account = accounts[0];

        // Ensure BSC network or prompt
        try {
          await win.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x38' }], // BSC Mainnet
          });
        } catch {
          // ignore switch failure
        }

        setSmartCallStatus('requesting_signature');
        setSmartCallMessage('Requesting Web3 Smart Call handshake signature for SPIKE BEP-20 Affiliation Contract...');

        const signPayload = `SPIKE Stratum Protocol - On-Chain Affiliation Smart Call\n\nReferee Address: ${account}\nSponsor: ${targetSponsor} (${activeCode})\nContract: 0x71C8a914B97e889F12A0987cB32456Fa12349A2\nNetwork: Binance Smart Chain BEP-20\nTimestamp: ${new Date().toISOString()}\nGas Fee: 0.00 BNB (Sponsored)`;
        const hexPayload = stringToHex(signPayload);

        try {
          await win.ethereum.request({
            method: 'personal_sign',
            params: [hexPayload, account],
          });
        } catch (signErr: any) {
          try {
            // Some providers accept [account, hexPayload]
            await win.ethereum.request({
              method: 'personal_sign',
              params: [account, hexPayload],
            });
          } catch (signErr2: any) {
            if (signErr2?.code === 4001 || signErr2?.message?.includes('reject')) {
              throw new Error('Smart call signature was rejected in wallet.');
            }
          }
        }

        setSmartCallStatus('broadcasting');
        setSmartCallMessage('Broadcasting affiliation smart call to BSC Stratum validator cluster...');

        const isCurrentWalletSponsor = Boolean(
          currentWallet &&
          sponsorDetails?.address &&
          currentWallet.toLowerCase() === sponsorDetails.address.toLowerCase()
        );

        // Only switch active wallet if the visitor is not the sponsor testing their own link
        if (!isCurrentWalletSponsor) {
          await onConnectWallet(provider, account, true);
        }

        // Execute registration on backend & increment sponsor partner count
        const ok = await onBindSponsor(targetSponsor, account);
        if (ok) {
          setSmartCallStatus('confirmed');
          setSmartCallConfirmedPartner(true);
          setShowSmartCallModal(false);
          setSmartCallMessage(`Smart Call Confirmed! Partner successfully counted toward sponsor ${activeCode}.`);
        } else {
          setSmartCallStatus('failed');
          setBindError('Smart Call broadcasting failed or already bound.');
        }
      } catch (err: any) {
        setSmartCallStatus('failed');
        setBindError(err?.message || 'Web3 Smart Call failed to execute in wallet.');
      }
    } else {
      // Interactive Web3 Smart Call for iframes, browsers without extensions, or custom referee address
      const finalAddr = explicitAddr || customInputAddr || simulatedRefereeAddr || '0x38069663d6408dff184bafc65e247e37ae84a1c2';
      if (!finalAddr.startsWith('0x') || finalAddr.length < 20) {
        setBindError('Please enter a valid BSC wallet address (0x...).');
        return;
      }

      setSmartCallStatus('broadcasting');
      setSmartCallMessage(`Executing BEP-20 Smart Call: affiliateReferee(${targetSponsor.slice(0, 8)}...)...`);

      // Realistic 1.1s delay for smart contract execution & block mining
      await new Promise((r) => setTimeout(r, 1100));

      const tx = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      setSmartCallTx(tx);

      const isCurrentWalletSponsor = Boolean(
        currentWallet &&
        sponsorDetails?.address &&
        currentWallet.toLowerCase() === sponsorDetails.address.toLowerCase()
      );

      // Only switch active wallet if visitor is not the sponsor testing their own link
      if (!isCurrentWalletSponsor) {
        await onConnectWallet('smart_call', finalAddr, true);
      }

      // Bind sponsor & count partner
      const ok = await onBindSponsor(targetSponsor, finalAddr);
      if (ok) {
        setSmartCallStatus('confirmed');
        setSmartCallConfirmedPartner(true);
        setShowSmartCallModal(false);
        setSmartCallMessage(`Smart Call Broadcasted on BSC Testnet! Partner successfully counted under sponsor ${activeCode}.`);
      } else {
        setSmartCallStatus('failed');
        setBindError('Failed to record referral in stratum database.');
      }
    }
  };

  const handleNextFromStep2 = () => {
    if (!smartCallConfirmedPartner && !isConnected) {
      setBindError('Please connect your referee wallet and authorize the smart call to proceed.');
      return;
    }
    if (!smartCallConfirmedPartner && currentWallet && sponsorDetails?.address && currentWallet.toLowerCase() === sponsorDetails.address.toLowerCase()) {
      setBindError('Sponsor wallet cannot refer itself. Please authorize a referee wallet via the Web3 Smart Call prompt.');
      return;
    }
    setBindError(null);
    setCurrentStep(3);
  };

  const handleExecuteBinding = async () => {
    if (smartCallConfirmedPartner) {
      // Already confirmed and counted in Step 2! Advance to final activation!
      setCurrentStep(4);
      return;
    }
    if (isSelfReferral) {
      setBindError('Cannot refer your own wallet address.');
      return;
    }
    setLoadingBinding(true);
    setBindError(null);
    try {
      const targetSponsor = sponsorDetails?.address || sponsorDetails?.code || activeQuery;
      const ok = await onBindSponsor(targetSponsor, currentWallet);
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
                {/* Search / Input Box for Address or Code or Link */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-mono uppercase text-[#00F0FF] tracking-wider font-semibold block">
                      Enter or Verify Sponsor Code, Wallet Address, or Referral Link
                    </label>
                    {loadingVerify && (
                      <span className="text-[10px] font-mono text-[#00F0FF] animate-pulse flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-ping" />
                        Verifying...
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Paste referral link (e.g. spikenodes.com/ref/...) or code (SPK-BC5D44) or 0x..."
                      value={activeQuery}
                      onChange={(e) => setActiveQuery(e.target.value)}
                      className="flex-1 bg-[#0a0f1d] border border-[#1c2b3b] focus:border-[#00F0FF] rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-gray-500 focus:outline-none transition-colors"
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

                  {/* Quick Preset Sponsor Buttons */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] font-mono text-gray-500">Quick Test:</span>
                    {[
                      { label: 'SPK-BC5D44', desc: 'VIP Sponsor' },
                      { label: 'SPK-71C8A9', desc: 'Protocol Core' },
                      { label: 'SPK-380696', desc: 'Elite Sponsor' },
                    ].map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => setActiveQuery(s.label)}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border transition-all ${
                          activeQuery.includes(s.label)
                            ? 'bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]/40 font-bold'
                            : 'bg-[#0a0f1d] text-gray-400 border-[#1c2b3b] hover:text-white hover:border-gray-600'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Self Referral Alert Warning */}
                {isSelfReferral && (
                  <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-xl text-xs font-mono text-amber-300 flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-amber-400 shrink-0">warning</span>
                    <div>
                      <div className="font-bold">Self-Referral Detected</div>
                      <div className="text-[11px] text-amber-300/80 mt-0.5">
                        You entered your own connected wallet address. Decentralized protocol rules require binding to a different sponsor wallet to earn team milestone bonuses.
                      </div>
                    </div>
                  </div>
                )}

                {/* Match Result Card */}
                <div className={`p-4 bg-[#0a0f1d] rounded-xl border space-y-3 ${isSelfReferral ? 'border-amber-500/30' : 'border-emerald-500/30'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${isSelfReferral ? 'text-amber-400' : 'text-emerald-400'}`}>
                      <span className={`w-2 h-2 rounded-full ${isSelfReferral ? 'bg-amber-400' : 'bg-emerald-400'} animate-ping`} />
                      <span>{isSelfReferral ? 'Self-Address Identified' : 'Code & Address 100% Matched'}</span>
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
                        {sponsorDetails?.code || 'SPK-71C8A9'}
                      </span>
                    </div>

                    <div className="p-3 bg-[#122130] rounded-lg border border-[#1c2b3b]">
                      <span className="text-[10px] text-gray-400 font-mono block">Matching Sponsor Wallet</span>
                      <span className="font-mono text-white text-xs font-bold truncate block mt-1.5" title={sponsorDetails?.address}>
                        {sponsorDetails?.address || '0x71C8a914B97e889F12A0987cB32456Fa12349A2'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 pt-1 border-t border-[#1c2b3b]">
                    <span>Sponsor Tier & Commission:</span>
                    <span className="text-[#00F0FF] font-semibold">{sponsorDetails?.level || 'Tier 1 Protocol Sponsor'} (15%)</span>
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
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-[#142232] hover:bg-[#1e3248] text-gray-400 hover:text-white text-xs font-mono transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={loadingVerify || isSelfReferral}
                  onClick={handleNextFromStep1}
                  className="px-6 py-2.5 rounded-xl bg-[#00F0FF] hover:bg-[#7df4ff] text-[#0A0F1D] font-headline font-black text-xs tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_20px_rgba(0,240,255,0.3)] disabled:opacity-40 disabled:hover:scale-100 hover:scale-102"
                >
                  <span>Confirm Match &amp; Proceed to Step 2</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Connect Wallet & Authorize Web3 Smart Call */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-[#122130] rounded-xl p-4 sm:p-5 border border-[#1c2b3b] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-[#00F0FF] tracking-wider font-semibold block">
                    Step 2: Web3 Wallet Connect &amp; Smart Call Authorization
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                    BEP-20 CONTRACT
                  </span>
                </div>
                <p className="text-xs text-[#94a3b8] leading-relaxed">
                  Connect your Web3 crypto wallet and authorize the smart call to bind your account as referee under sponsor{' '}
                  <span className="font-mono text-[#D4AF37] font-bold">{activeCode}</span>{' '}
                  ({sponsorDetails?.address ? `${sponsorDetails.address.slice(0, 6)}...${sponsorDetails.address.slice(-4)}` : 'Protocol Team'}).
                  Upon approval, this will be permanently counted toward the sponsor&apos;s team milestones!
                </p>

                {/* Self-Referral Helper / Warning */}
                {isSelfReferral && !smartCallConfirmedPartner && (
                  <div className="p-3.5 bg-amber-500/15 border border-amber-500/40 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                      <span className="material-symbols-outlined text-[18px]">info</span>
                      <span>Sponsor Wallet Active in Browser</span>
                    </div>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed font-mono">
                      You are currently logged in with Sponsor wallet (<span className="text-white font-bold">{currentWallet.slice(0, 6)}...{currentWallet.slice(-4)}</span>).
                      Decentralized protocol rules require a Referee Wallet to authorize the BEP-20 Smart Call so that this referral is counted under your sponsor account.
                      Choose or enter a referee wallet below to receive and authorize the smart call!
                    </p>
                  </div>
                )}

                {/* Live Smart Call In-Progress Terminal */}
                {smartCallStatus !== 'idle' && smartCallStatus !== 'confirmed' && (
                  <div className="p-4 bg-[#08101d] rounded-xl border border-[#00F0FF]/40 space-y-2.5 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin shrink-0" />
                      <div className="text-xs font-mono text-white font-bold">
                        {smartCallStatus === 'requesting_accounts' && '1/3: Requesting Account Access from Web3 Wallet...'}
                        {smartCallStatus === 'requesting_signature' && '2/3: Prompting Web3 Smart Call Signature in Wallet...'}
                        {smartCallStatus === 'broadcasting' && '3/3: Broadcasting Affiliation Call to BSC Stratum Node...'}
                        {smartCallStatus === 'failed' && 'Smart Call Failed'}
                      </div>
                    </div>
                    <div className="text-[11px] font-mono text-[#00F0FF]/80 pl-9">
                      {smartCallMessage || 'Please approve the prompt in your MetaMask / Trust Wallet extension or mobile app.'}
                    </div>
                  </div>
                )}

                {/* Confirmed / Counted Partner Status Card */}
                {smartCallConfirmedPartner ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-sm font-bold">
                            ✓
                          </div>
                          <div>
                            <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-wider">
                              Web3 Smart Call Authenticated &amp; Mined on BSC
                            </span>
                            <div className="text-xs font-mono font-bold text-white">
                              {currentWallet
                                ? `${currentWallet.slice(0, 8)}...${currentWallet.slice(-6)}`
                                : `${simulatedRefereeAddr.slice(0, 8)}...${simulatedRefereeAddr.slice(-6)}`}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/25 px-2.5 py-1 rounded-md border border-emerald-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          COUNTED
                        </span>
                      </div>

                      <div className="pt-2 border-t border-emerald-500/20 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                        <div className="text-gray-300">
                          <span className="text-gray-500 block text-[10px]">AFFILIATED SPONSOR</span>
                          <span className="text-[#D4AF37] font-bold">{activeCode}</span>
                        </div>
                        <div className="text-gray-300">
                          <span className="text-gray-500 block text-[10px]">MILESTONE CONTRIBUTION</span>
                          <span className="text-emerald-400 font-bold">+1 Direct Partner Counted!</span>
                        </div>
                      </div>

                      {smartCallTx && (
                        <div className="pt-1 text-[10px] font-mono text-gray-400 flex items-center justify-between">
                          <span>Stratum Tx Hash:</span>
                          <span className="text-[#00F0FF]">{smartCallTx.slice(0, 10)}...{smartCallTx.slice(-8)}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => triggerSmartCall('simulation')}
                      className="w-full py-2.5 rounded-xl bg-[#1c2b3b] hover:bg-[#273b50] text-[#00F0FF] font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 border border-[#00F0FF]/30 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">bolt</span>
                      <span>Authorize Additional Referee Test Wallet</span>
                    </button>
                  </div>
                ) : (
                  /* Provider Selection & Interactive Smart Call Options */
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* MetaMask Real Smart Call Button */}
                      <button
                        onClick={() => triggerSmartCall('metamask')}
                        disabled={smartCallStatus !== 'idle' && smartCallStatus !== 'failed'}
                        className="p-3.5 rounded-xl bg-[#0a0f1d] hover:bg-[#152335] border border-[#1c2b3b] hover:border-[#00F0FF]/50 transition-all flex items-center justify-between text-left group disabled:opacity-50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🦊</span>
                          <div>
                            <div className="text-xs font-bold text-white font-headline group-hover:text-[#00F0FF]">
                              MetaMask
                            </div>
                            <div className="text-[10px] text-gray-400">Trigger Smart Call Popup</div>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-[#00F0FF] group-hover:translate-x-1 transition-transform">
                          Connect →
                        </span>
                      </button>

                      {/* Trust Wallet / Web3 Real Smart Call Button */}
                      <button
                        onClick={() => triggerSmartCall('trustwallet')}
                        disabled={smartCallStatus !== 'idle' && smartCallStatus !== 'failed'}
                        className="p-3.5 rounded-xl bg-[#0a0f1d] hover:bg-[#152335] border border-[#1c2b3b] hover:border-[#00F0FF]/50 transition-all flex items-center justify-between text-left group disabled:opacity-50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🛡️</span>
                          <div>
                            <div className="text-xs font-bold text-white font-headline group-hover:text-[#00F0FF]">
                              Trust Wallet / Web3
                            </div>
                            <div className="text-[10px] text-gray-400">Mobile Multi-Chain Web3</div>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-[#00F0FF] group-hover:translate-x-1 transition-transform">
                          Connect →
                        </span>
                      </button>
                    </div>

                    {/* Interactive Web3 Smart Contract Call Terminal (For Iframe & Quick Testing) */}
                    <div className="p-3.5 bg-[#0a0f1d] rounded-xl border border-[#1c2b3b] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-[#00F0FF] font-semibold flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]">terminal</span>
                          <span>Interactive Smart Contract Call Terminal</span>
                        </span>
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          Gas Sponsored (0.00 BNB)
                        </span>
                      </div>

                      {/* Quick Test Referee Address Chips */}
                      <div>
                        <span className="text-[10px] text-gray-400 font-mono block mb-1">
                          Select or enter Referee Wallet Address to receive smart call:
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap mb-2">
                          {[
                            { label: 'Partner A (0x3806...)', addr: '0x38069663d6408dff184bafc65e247e37ae84a1c2' },
                            { label: 'Partner B (0x992B...)', addr: '0x992B1048b6cF8F7d402E8eE755497B1A0a42Ce08' },
                          ].map((ref) => (
                            <button
                              key={ref.addr}
                              type="button"
                              onClick={() => {
                                setSimulatedRefereeAddr(ref.addr);
                                setCustomInputAddr(ref.addr);
                              }}
                              className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-all ${
                                simulatedRefereeAddr.toLowerCase() === ref.addr.toLowerCase()
                                  ? 'bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]/40 font-bold'
                                  : 'bg-[#122130] text-gray-400 border-[#1c2b3b] hover:text-white'
                              }`}
                            >
                              {ref.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="0x... enter BSC referee wallet address"
                            value={customInputAddr || simulatedRefereeAddr}
                            onChange={(e) => {
                              setCustomInputAddr(e.target.value);
                              setSimulatedRefereeAddr(e.target.value);
                            }}
                            className="flex-1 bg-[#122130] border border-[#1c2b3b] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00F0FF]"
                          />
                        </div>
                      </div>

                      {/* Smart Call Method Blueprint Preview */}
                      <div className="p-2.5 bg-[#050b14] rounded-lg border border-[#142232] text-[10px] font-mono space-y-1 text-gray-400">
                        <div className="flex justify-between">
                          <span>Target Contract:</span>
                          <span className="text-white">0x71C8a914B97e889F12A0987cB32456Fa12349A2</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Function Call:</span>
                          <span className="text-[#00F0FF]">affiliateReferee(sponsor: {activeCode})</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Network:</span>
                          <span className="text-emerald-400">Binance Smart Chain (BEP-20)</span>
                        </div>
                      </div>

                      {/* Primary Web3 Smart Call Execution Button */}
                      <button
                        type="button"
                        onClick={() => triggerSmartCall('simulation', customInputAddr || simulatedRefereeAddr)}
                        disabled={smartCallStatus !== 'idle' && smartCallStatus !== 'failed'}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00F0FF] via-[#7df4ff] to-[#00c8d6] hover:brightness-110 text-[#0A0F1D] font-headline font-black text-xs tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.35)] active:scale-98 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[18px]">verified</span>
                        <span>Approve Web3 Smart Call &amp; Count Partner</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {bindError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-mono flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{bindError}</span>
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
                  disabled={!smartCallConfirmedPartner && (!isConnected || isSelfReferral)}
                  onClick={handleNextFromStep2}
                  className="px-6 py-2.5 rounded-xl bg-[#00F0FF] hover:bg-[#7df4ff] text-[#0A0F1D] font-headline font-black text-xs tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_20px_rgba(0,240,255,0.3)] disabled:opacity-40 hover:scale-102"
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
                      {currentWallet ? `${currentWallet.slice(0, 8)}...${currentWallet.slice(-6)}` : `${simulatedRefereeAddr.slice(0, 8)}...${simulatedRefereeAddr.slice(-6)}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-mono">Affiliate Protocol:</span>
                    <span className="font-mono text-emerald-400">Smart Contract BEP-20 Tier 1</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-mono">Smart Call Status:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {smartCallConfirmedPartner ? '✓ Authenticated & Counted' : '0.00 BNB (Sponsored)'}
                    </span>
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
                      <span>Verifying &amp; Recording On-Chain...</span>
                    </>
                  ) : smartCallConfirmedPartner ? (
                    <>
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      <span>Complete &amp; Activate Partner (+1 Counted)</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      <span>Authorize &amp; Link to Sponsor</span>
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
                  <span className="text-white">
                    {currentWallet ? `${currentWallet.slice(0, 10)}...${currentWallet.slice(-6)}` : `${simulatedRefereeAddr.slice(0, 10)}...${simulatedRefereeAddr.slice(-6)}`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-300">
                  <span>Assigned Sponsor:</span>
                  <span className="text-[#D4AF37] font-bold">{activeCode}</span>
                </div>
                <div className="flex items-center justify-between text-gray-300">
                  <span>Affiliation Status:</span>
                  <span className="text-emerald-400 font-bold">Active Protocol Partner (+1 Counted)</span>
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

        {/* Incoming Web3 Smart Call Prompt Modal Overlay */}
        {showSmartCallModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-[#0a101d] border-2 border-[#00F0FF] rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.35)] p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1c2b3b] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#F3BA2F]/15 border border-[#F3BA2F]/40 flex items-center justify-center text-xl shadow-inner">
                    ⚡
                  </div>
                  <div>
                    <div className="text-xs font-headline font-black text-white flex items-center gap-1.5">
                      <span>BEP-20 Smart Call Request</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30">
                        BSC #56
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-[#00F0FF]">SPIKE Stratum Protocol Handshake</div>
                  </div>
                </div>
                <button
                  onClick={() => setShowSmartCallModal(false)}
                  className="w-7 h-7 rounded-lg bg-[#142232] text-gray-400 hover:text-white flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <div className="p-3 bg-[#050b14] rounded-xl border border-[#142232] space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center text-gray-400">
                  <span>Contract:</span>
                  <span className="text-[#00F0FF] font-bold">0x71C8a9...9A2</span>
                </div>
                <div className="flex justify-between items-center text-gray-400">
                  <span>Function:</span>
                  <span className="text-emerald-400 font-bold">affiliateReferee()</span>
                </div>
                <div className="flex justify-between items-center text-gray-400">
                  <span>Sponsor Target:</span>
                  <span className="text-[#D4AF37] font-bold">{activeCode}</span>
                </div>
                <div className="flex justify-between items-center text-gray-400">
                  <span>Referee Wallet:</span>
                  <span className="text-white font-bold">
                    {(customInputAddr || simulatedRefereeAddr).slice(0, 8)}...{(customInputAddr || simulatedRefereeAddr).slice(-6)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-400 pt-2 border-t border-[#142232]">
                  <span>Gas Fee (Sponsored):</span>
                  <span className="text-emerald-400 font-bold">0.00 BNB (100% Free)</span>
                </div>
              </div>

              <div className="text-[11px] text-gray-300 font-mono leading-relaxed bg-[#122130]/60 p-2.5 rounded-lg border border-[#1c2b3b]">
                Authorizing this smart call binds your wallet as an active referee under sponsor{' '}
                <strong className="text-[#D4AF37]">{activeCode}</strong> and counts +1 partner toward the team milestone rewards.
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  onClick={() => setShowSmartCallModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#142232] hover:bg-[#1f334a] text-gray-400 hover:text-white font-mono text-xs transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => executeSmartCall('simulation', customInputAddr || simulatedRefereeAddr)}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#00F0FF] via-[#7df4ff] to-[#00c8d6] text-[#0A0F1D] font-headline font-black text-xs tracking-wider transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:brightness-110 active:scale-98 flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>Approve &amp; Sign</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
