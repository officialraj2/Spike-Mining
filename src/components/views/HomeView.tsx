import React, { useState, useEffect } from 'react';
import { SPIKE_LOGO_URL, SPIKE_TOKEN_METRICS } from '../../data/mockData';
import { TabType } from '../../types';

const HERO_PHRASES = [
  'Decentralized Technology',
  'Autonomous Mining Nodes',
  'Stratum 10X Hardware',
  'High-Yield BSC Infrastructure',
];

interface HomeViewProps {
  onNavigate: (tab: TabType) => void;
  onConnectWallet: () => void;
  isWalletConnected: boolean;
  walletBalance: number;
  totalHashrate: number;
  onOpenAuditModal: () => void;
  onOpenDeployModal: () => void;
  walletAddress?: string;
  onCopyText?: (text: string) => void;
  onClaimReferralRewards?: (amount: number) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onConnectWallet,
  isWalletConnected,
  walletBalance: _walletBalance,
  totalHashrate,
  onOpenAuditModal,
  onOpenDeployModal,
  walletAddress: _walletAddress = '',
  onCopyText: _onCopyText,
  onClaimReferralRewards: _onClaimReferralRewards,
}) => {
  // Calculator state (starts at 0.30 TH/s which corresponds to the $15 starter activation package)
  const [calcHashrate, setCalcHashrate] = useState<number>(0.30);
  const [activationTier, setActivationTier] = useState<number>(15);

  // Proportional reward calculations according to the official formula
  // Base daily yield factor
  const dailySpikeReward = (calcHashrate / 0.30) * 1.5; // SPIKE tokens mined daily
  const dailyUsdtRef = dailySpikeReward * SPIKE_TOKEN_METRICS.initialReferencePrice; // At $1 reference
  const dailyUsdtSwapTarget = dailySpikeReward * SPIKE_TOKEN_METRICS.swapThresholdPrice; // At $5 Swap Threshold
  const monthlySpikeReward = dailySpikeReward * 30;
  const annualSpikeReward = dailySpikeReward * 365;

  // Handle protected actions (Dashboard, Mining, Staking)
  const handleProtectedAction = (tab: TabType) => {
    if (!isWalletConnected) {
      onConnectWallet();
    } else {
      onNavigate(tab);
    }
  };

  const handleTierSelect = (usdAmount: number, ths: number) => {
    setActivationTier(usdAmount);
    setCalcHashrate(ths);
  };

  // Dynamic Letter-by-Letter Typewriter Animation for Hero Headline
  const [typedText, setTypedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    const currentPhrase = HERO_PHRASES[phraseIdx];
    let timeout: NodeJS.Timeout;

    if (!isDeleting && typedText === currentPhrase) {
      // Comfortable reading pause so the user can easily absorb the full phrase
      timeout = setTimeout(() => {
        setIsDeleting(true);
      }, 1800);
    } else if (isDeleting && typedText === '') {
      // Natural clean pause before typing the next phrase
      setIsDeleting(false);
      setPhraseIdx((prev) => (prev + 1) % HERO_PHRASES.length);
      timeout = setTimeout(() => {}, 300);
    } else {
      // Perfectly calibrated, consistent professional speed (smooth, readable & crisp)
      const speed = isDeleting ? 28 : 55;
      timeout = setTimeout(() => {
        setTypedText(
          isDeleting
            ? currentPhrase.substring(0, typedText.length - 1)
            : currentPhrase.substring(0, typedText.length + 1)
        );
      }, speed);
    }

    return () => clearTimeout(timeout);
  }, [typedText, isDeleting, phraseIdx]);

  return (
    <div className="flex flex-col w-full space-y-12 md:space-y-16 pb-12">
      {/* =========================================================
          SECTION 1: HERO SECTION
          Vision: Building the Next Generation of Decentralized Technology
         ========================================================= */}
      <section
        id="hero"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0d1d2c] via-[#091728] to-[#051424] border border-[#1c2b3b] pt-8 pb-7 px-5 sm:p-10 md:p-14 shadow-2xl mt-1 sm:mt-0"
      >
        {/* Atmospheric Glow Backdrops */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#00F0FF]/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#D4AF37]/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#00F0FF]/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Hero Left Content */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-7 pt-2 sm:pt-0">
            {/* HUD / System Labels from Official Whitepaper */}
            <div className="mt-3 sm:mt-0 inline-flex max-w-full flex-nowrap items-center gap-1 min-[360px]:gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#122130]/95 border border-[#00F0FF]/50 text-[9px] min-[360px]:text-[10px] min-[410px]:text-[11px] sm:text-xs font-mono text-[#00F0FF] shadow-[0_0_18px_rgba(0,240,255,0.25)] whitespace-nowrap overflow-x-auto scrollbar-none">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#00F0FF] animate-pulse shrink-0"></span>
              <span className="font-bold tracking-wide shrink-0 text-white">STATOR</span>
              <span className="text-[#94a3b8]/60 shrink-0">|</span>
              <span className="text-[#D4AF37] font-semibold shrink-0">Gear 7-38 270</span>
              <span className="text-[#94a3b8]/60 shrink-0">|</span>
              <span className="text-[#7df4ff] shrink-0 font-medium whitespace-nowrap">
                SPIKE BEP-20 · BNB Smart Chain
              </span>
            </div>

            {/* Main Headline with Text-by-Text Cinematic Animation */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black font-headline text-white leading-[1.14] sm:leading-[1.12] tracking-tight min-h-[3.6em] sm:min-h-[2.4em] break-words">
              <span className="inline">
                {"Building the Next Generation of".split(" ").map((word, idx) => (
                  <span
                    key={idx}
                    className="inline-block mr-1.5 sm:mr-3 transition-all"
                    style={{
                      animation: `fadeInUpWord 0.45s cubic-bezier(0.16, 1, 0.3, 1) both`,
                      animationDelay: `${idx * 0.06}s`,
                    }}
                  >
                    {word}
                  </span>
                ))}
              </span>{' '}
              <span className="inline-block relative">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F0FF] via-[#7df4ff] to-[#D4AF37] drop-shadow-[0_2px_22px_rgba(0,240,255,0.45)]">
                  {typedText}
                </span>
                <span
                  className="inline-block w-[3.5px] sm:w-[5px] h-[0.9em] ml-1 bg-gradient-to-b from-[#00F0FF] via-[#7df4ff] to-[#D4AF37] rounded-full shadow-[0_0_14px_#00F0FF,0_0_22px_rgba(212,175,55,0.65)] animate-cursor-pulse align-baseline"
                  aria-hidden="true"
                />
              </span>
            </h1>

            {/* Official Vision from Whitepaper */}
            <p className="text-sm sm:text-base text-[#d4e4fa]/90 max-w-xl leading-relaxed">
              The vision is to create a unified, technology-driven decentralized ecosystem where blockchain infrastructure, digital assets and real-world applications work together through a simple and intuitive user experience.
            </p>

            <p className="text-xs sm:text-sm text-[#94a3b8] max-w-xl leading-relaxed">
              Our platform bridges the gap between advanced blockchain technology and everyday digital interaction, making decentralized services more accessible, transparent and scalable.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                onClick={() => handleProtectedAction('dashboard')}
                className="px-6 py-3.5 rounded-xl bg-[#00F0FF] text-[#0A0F1D] font-headline font-bold text-sm hover:bg-[#7df4ff] transition-all flex items-center gap-2 shadow-[0_0_25px_rgba(0,240,255,0.45)] hover:shadow-[0_0_35px_rgba(0,240,255,0.6)] tracking-wide group"
              >
                <span>{isWalletConnected ? 'Enter Live Dashboard' : 'Launch Dashboard'}</span>
                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                  {isWalletConnected ? 'arrow_forward' : 'lock_open'}
                </span>
              </button>

              {!isWalletConnected ? (
                <button
                  onClick={onConnectWallet}
                  className="px-5 py-3.5 rounded-xl bg-gradient-to-r from-[#122130] to-[#1c2b3b] hover:from-[#1c2b3b] hover:to-[#273647] text-white border border-[#D4AF37]/50 font-headline font-semibold text-sm transition-all flex items-center gap-2 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#D4AF37]">
                    account_balance_wallet
                  </span>
                  <span>Connect Wallet</span>
                </button>
              ) : (
                <button
                  onClick={onOpenDeployModal}
                  className="px-5 py-3.5 rounded-xl bg-[#122130] hover:bg-[#1c2b3b] text-[#D4AF37] border border-[#D4AF37]/40 font-headline font-semibold text-sm transition-all flex items-center gap-2 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                  <span>Activate Hash Rate</span>
                </button>
              )}

              <button
                onClick={onOpenAuditModal}
                className="px-4 py-3.5 rounded-xl text-xs font-mono text-[#94a3b8] hover:text-[#00F0FF] flex items-center gap-1.5 transition-colors border border-transparent hover:border-[#1c2b3b]"
              >
                <span className="material-symbols-outlined text-[16px] text-[#D4AF37]">verified</span>
                <span>CertiK Audited (98.4)</span>
              </button>
            </div>

            {/* Quick Proof Trust Line from Whitepaper Foundation */}
            <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-[#94a3b8] font-mono border-t border-[#1c2b3b]/60">
              <span className="flex items-center gap-1 text-[#00F0FF]">
                <span className="material-symbols-outlined text-[15px]">electric_bolt</span>
                Activation from $15
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 text-[#D4AF37]">
                <span className="material-symbols-outlined text-[15px]">token</span>
                50M Max Supply
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="material-symbols-outlined text-[15px]">swap_horiz</span>
                $5 Swap Threshold
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-emerald-400 text-[15px]">check</span>
                Non-Custodial BEP-20
              </span>
            </div>
          </div>

          {/* Hero Right Visual: Golden Falcon Medallion with Sparkling Mini Logo Copies & Ambient Rings */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
            <div className="relative group flex items-center justify-center select-none py-6">
              {/* Outer Pulsing Glow Atmosphere */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/20 via-[#00F0FF]/25 to-[#D4AF37]/25 rounded-full blur-3xl group-hover:blur-4xl transition-all scale-125 animate-pulse-glow"></div>

              {/* Orbital Ambient Rings */}
              <div className="absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full border border-[#00F0FF]/30 animate-[spin_22s_linear_infinite]" />
              <div className="absolute w-84 h-84 sm:w-96 sm:h-96 rounded-full border border-[#D4AF37]/25 border-dashed animate-[spin_38s_linear_infinite_reverse]" />
              <div className="absolute w-[22rem] h-[22rem] sm:w-[26rem] sm:h-[26rem] rounded-full border border-[#00F0FF]/15 animate-[spin_48s_linear_infinite]" />

              {/* Sparkling Mini Logo Copies Around the Medallion */}
              {/* Mini Logo 1: Top-Right Orbit */}
              <div className="absolute -top-3 right-6 sm:-top-4 sm:right-10 z-20 animate-float-delayed group-hover:scale-110 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-500">
                <div className="relative flex items-center justify-center">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full p-1 bg-gradient-to-tr from-[#0d1d2c] via-[#122130] to-[#0a0f1d] border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.7)] backdrop-blur-md">
                    <img
                      src={SPIKE_LOGO_URL}
                      alt="SPIKE Mini Spark 1"
                      onError={(e) => { e.currentTarget.src = '/spike_logo.png'; }}
                      className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(212,175,55,0.6)]"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="absolute -top-2 -right-2 text-[#D4AF37] text-xs font-bold animate-spark-twinkle drop-shadow-[0_0_8px_#D4AF37]">
                    ✦
                  </span>
                  <div className="absolute inset-0 rounded-full bg-[#D4AF37]/20 blur-sm animate-pulse"></div>
                </div>
              </div>

              {/* Mini Logo 2: Top-Left Orbit */}
              <div className="absolute -top-1 left-4 sm:-top-2 sm:left-8 z-20 animate-float-reverse group-hover:scale-110 group-hover:-translate-x-2 group-hover:-translate-y-2 transition-transform duration-500">
                <div className="relative flex items-center justify-center">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full p-0.5 bg-gradient-to-br from-[#0d1d2c] to-[#051424] border-2 border-[#00F0FF] shadow-[0_0_18px_rgba(0,240,255,0.75)] backdrop-blur-md">
                    <img
                      src={SPIKE_LOGO_URL}
                      alt="SPIKE Mini Spark 2"
                      onError={(e) => { e.currentTarget.src = '/spike_logo.png'; }}
                      className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(0,240,255,0.6)]"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="absolute -top-1.5 -left-1.5 text-[#00F0FF] text-[11px] font-bold animate-spark-fast drop-shadow-[0_0_8px_#00F0FF]">
                    ✦
                  </span>
                  <div className="absolute inset-0 rounded-full bg-[#00F0FF]/25 blur-sm animate-pulse"></div>
                </div>
              </div>

              {/* Mini Logo 3: Bottom-Left Orbit */}
              <div className="absolute bottom-2 left-6 sm:bottom-3 sm:left-10 z-20 animate-float-slow group-hover:scale-110 group-hover:-translate-x-2 group-hover:translate-y-2 transition-transform duration-500">
                <div className="relative flex items-center justify-center">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full p-1 bg-gradient-to-tr from-[#0a0f1d] via-[#122130] to-[#0d1d2c] border-2 border-[#D4AF37]/90 shadow-[0_0_20px_rgba(212,175,55,0.65)] backdrop-blur-md">
                    <img
                      src={SPIKE_LOGO_URL}
                      alt="SPIKE Mini Spark 3"
                      onError={(e) => { e.currentTarget.src = '/spike_logo.png'; }}
                      className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(212,175,55,0.6)]"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="absolute -bottom-1 -left-1 text-[#D4AF37] text-[10px] font-bold animate-spark-delayed drop-shadow-[0_0_8px_#D4AF37]">
                    ✧
                  </span>
                  <div className="absolute inset-0 rounded-full bg-[#D4AF37]/20 blur-sm"></div>
                </div>
              </div>

              {/* Mini Logo 4: Bottom-Right Orbit */}
              <div className="absolute bottom-3 right-6 sm:bottom-4 sm:right-10 z-20 animate-float-delayed group-hover:scale-110 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-500">
                <div className="relative flex items-center justify-center">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full p-0.5 bg-gradient-to-bl from-[#0d1d2c] to-[#051424] border-2 border-[#00F0FF]/90 shadow-[0_0_18px_rgba(0,240,255,0.7)] backdrop-blur-md">
                    <img
                      src={SPIKE_LOGO_URL}
                      alt="SPIKE Mini Spark 4"
                      onError={(e) => { e.currentTarget.src = '/spike_logo.png'; }}
                      className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(0,240,255,0.6)]"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="absolute -bottom-1.5 -right-1 text-[#00F0FF] text-xs font-bold animate-spark-twinkle drop-shadow-[0_0_8px_#00F0FF]">
                    ✦
                  </span>
                  <div className="absolute inset-0 rounded-full bg-[#00F0FF]/20 blur-sm"></div>
                </div>
              </div>

              {/* Mini Logo 5: Top-Zenith Crown */}
              <div className="absolute -top-7 sm:-top-9 left-1/2 -translate-x-1/2 z-20 animate-float-slow group-hover:scale-115 group-hover:-translate-y-3 transition-transform duration-500">
                <div className="relative flex items-center justify-center">
                  <div className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full p-0.5 bg-[#0a0f1d] border border-[#D4AF37] shadow-[0_0_16px_rgba(212,175,55,0.8)]">
                    <img
                      src={SPIKE_LOGO_URL}
                      alt="SPIKE Mini Crown"
                      onError={(e) => { e.currentTarget.src = '/spike_logo.png'; }}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[#D4AF37] text-[10px] animate-spark-fast drop-shadow-[0_0_6px_#D4AF37]">
                    ✦
                  </span>
                </div>
              </div>

              {/* Extra Ambient Sparkle Stars */}
              <span className="absolute top-10 left-2 text-[#D4AF37] text-sm animate-spark-twinkle drop-shadow-[0_0_10px_#D4AF37]">
                ✦
              </span>
              <span className="absolute bottom-12 right-2 text-[#00F0FF] text-sm animate-spark-fast drop-shadow-[0_0_10px_#00F0FF]">
                ✦
              </span>

              {/* Central Main Medallion */}
              <div className="relative z-10 animate-float-slow">
                <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full p-3 bg-gradient-to-b from-[#D4AF37] via-[#00F0FF]/40 to-[#D4AF37]/60 shadow-[0_0_60px_rgba(212,175,55,0.45),0_0_30px_rgba(0,240,255,0.3)] flex items-center justify-center transition-all duration-500 group-hover:scale-105 group-hover:shadow-[0_0_80px_rgba(212,175,55,0.65),0_0_40px_rgba(0,240,255,0.45)]">
                  <div className="absolute inset-1 rounded-full border border-white/20 pointer-events-none"></div>
                  <img
                    src={SPIKE_LOGO_URL}
                    alt="SPIKE Falcon Medallion"
                    onError={(e) => { e.currentTarget.src = '/spike_logo.png'; }}
                    className="w-full h-full object-contain rounded-full drop-shadow-[0_15px_35px_rgba(0,0,0,0.9)] transition-transform duration-500 group-hover:scale-102"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none opacity-60 group-hover:opacity-90 transition-opacity"></div>
                </div>
              </div>

              {/* Floating Stat Badge 1: Global Hashrate */}
              <div className="absolute -bottom-4 -left-4 bg-[#0a0f1d]/95 backdrop-blur-md border border-[#00F0FF]/50 rounded-xl p-3 shadow-2xl flex items-center gap-3 z-30 animate-float-delayed">
                <div className="w-8 h-8 rounded-lg bg-[#00F0FF]/15 text-[#00F0FF] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">speed</span>
                </div>
                <div>
                  <div className="text-[10px] text-[#94a3b8] font-mono uppercase tracking-wider">Global Hashrate</div>
                  <div className="text-sm font-bold font-headline text-white tabular-nums">{totalHashrate.toFixed(2)} TH/s Active</div>
                </div>
              </div>

              {/* Floating Stat Badge 2: Initial Reference */}
              <div className="absolute -top-4 -right-4 bg-[#0a0f1d]/95 backdrop-blur-md border border-[#D4AF37]/50 rounded-xl p-3 shadow-2xl flex items-center gap-3 z-30 animate-float-reverse">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">trending_up</span>
                </div>
                <div>
                  <div className="text-[10px] text-[#94a3b8] font-mono uppercase tracking-wider">Initial Reference</div>
                  <div className="text-sm font-bold font-mono text-[#D4AF37]">$1.00 USD</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          PAGE 3 CONTENT: WEB3 PROBLEM & SOLUTION
          "Web3 Has Potential. The User Experience Is Still Fragmented."
         ========================================================= */}
      <section className="p-6 md:p-8 rounded-3xl bg-[#122130]/90 border border-[#1c2b3b] shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <span className="text-xs font-mono font-semibold uppercase tracking-[0.16em] text-[#00F0FF]">
              Platform Philosophy &amp; Mission
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-headline text-white tracking-tight mt-1">
              Web3 Has Potential. The User Experience Is Still Fragmented.
            </h2>
          </div>
          <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-[#0d1d2c] border border-[#00F0FF]/30 text-[#00F0FF] self-start md:self-auto">
            The SPIKE Solution
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-[#0a0f1d] border border-[#1c2b3b] flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center mb-3 border border-red-500/20">
                <span className="material-symbols-outlined text-[20px]">warning</span>
              </div>
              <h3 className="text-lg font-bold font-headline text-white mb-2">The Fragmented Web3 Landscape</h3>
              <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                Blockchain technology has created new possibilities for digital ownership, decentralized finance and peer-to-peer interaction. However, many users still face complex interfaces, disconnected platforms, hardware bottlenecks, and limited practical utility.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1c2b3b] text-xs font-mono text-[#94a3b8]">
              Status: High barrier to entry &amp; hardware friction
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0d1d2c] to-[#122130] border border-[#00F0FF]/40 shadow-[0_0_20px_rgba(0,240,255,0.1)] flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#00F0FF]/15 text-[#00F0FF] flex items-center justify-center mb-3 border border-[#00F0FF]/30">
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
              </div>
              <h3 className="text-lg font-bold font-headline text-[#00F0FF] mb-2">The SPIKE Mission</h3>
              <p className="text-xs sm:text-sm text-[#d4e4fa] leading-relaxed">
                Make decentralized technology simpler, more connected and more utility-focused—without compromising transparency, self-custody, or mathematical verifiability.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1c2b3b] text-xs font-mono text-[#D4AF37] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px]">verified</span>
              Capped 50M Supply · Non-Custodial BEP-20
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 2: FEATURES & UNDERSTANDING DIGITAL MINING (id="features")
          Page 4: WHAT IS MINING? UNDERSTANDING DIGITAL MINING
          Page 5: WHAT IS CLOUD MINING? Mining Without Owning Mining Hardware
          Page 9: WHAT IS HASH RATE? YOUR DIGITAL MINING POWER
         ========================================================= */}
      <section id="features" className="space-y-8 scroll-mt-24">
        {/* Features Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-xs font-mono font-semibold uppercase tracking-[0.16em] text-[#00F0FF]">
              Page 4 &amp; 5 Protocols
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-headline text-white tracking-tight mt-1">
              What Is Mining? Understanding Digital Mining
            </h2>
          </div>
          <p className="text-xs text-[#94a3b8] max-w-sm">
            Computational resources performing blockchain tasks and generating protocol rewards according to predefined rules.
          </p>
        </div>

        {/* 4 Types of Mining Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* CPU Mining */}
          <div className="p-6 rounded-2xl bg-[#122130] border border-[#1c2b3b] flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#94a3b8]/10 text-[#94a3b8] flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[24px]">memory</span>
              </div>
              <h3 className="text-lg font-bold font-headline text-white">CPU Mining</h3>
              <p className="text-xs text-[#94a3b8] mt-2 leading-relaxed">
                Using standard desktop central processing units to solve cryptographic puzzles. Highly inefficient for modern high-difficulty chains.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1c2b3b] text-[11px] font-mono text-[#94a3b8]">
              Type: Legacy Processing
            </div>
          </div>

          {/* GPU Mining */}
          <div className="p-6 rounded-2xl bg-[#122130] border border-[#1c2b3b] flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#94a3b8]/10 text-[#94a3b8] flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[24px]">developer_board</span>
              </div>
              <h3 className="text-lg font-bold font-headline text-white">GPU Mining</h3>
              <p className="text-xs text-[#94a3b8] mt-2 leading-relaxed">
                Utilizing high-end graphics cards for parallel mathematical processing. Requires intensive electricity and thermal dissipation.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1c2b3b] text-[11px] font-mono text-[#94a3b8]">
              Type: Parallel Compute
            </div>
          </div>

          {/* ASIC Mining */}
          <div className="p-6 rounded-2xl bg-[#122130] border border-[#1c2b3b] flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[24px]">dns</span>
              </div>
              <h3 className="text-lg font-bold font-headline text-white">ASIC Mining</h3>
              <p className="text-xs text-[#94a3b8] mt-2 leading-relaxed">
                Application-Specific Integrated Circuits engineered exclusively for a single hashing algorithm with ultra-high hashrate density.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1c2b3b] text-[11px] font-mono text-[#D4AF37]">
              Type: Dedicated Hardware
            </div>
          </div>

          {/* Cloud Mining (SPIKE Model) */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-[#122130] to-[#0a1928] border-2 border-[#00F0FF]/60 shadow-[0_0_20px_rgba(0,240,255,0.2)] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#00F0FF]/20 text-[#00F0FF] text-[9px] font-mono font-bold">
              SPIKE MODEL
            </div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#00F0FF]/15 text-[#00F0FF] flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[24px]">cloud_sync</span>
              </div>
              <h3 className="text-lg font-bold font-headline text-[#00F0FF]">Cloud Mining</h3>
              <p className="text-xs text-[#d4e4fa] mt-2 leading-relaxed">
                SPIKE is designed around a cloud-mining model, bringing digital mining participation into a simplified platform experience without hardware maintenance.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1c2b3b] text-[11px] font-mono text-[#00F0FF]">
              Participation from $15
            </div>
          </div>
        </div>

        {/* Cloud Mining Comparison: Traditional vs SPIKE */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#122130] border border-[#1c2b3b] shadow-xl">
          <div className="max-w-2xl mb-6">
            <span className="text-xs font-mono font-semibold uppercase tracking-[0.16em] text-[#D4AF37]">
              Page 5: What Is Cloud Mining?
            </span>
            <h3 className="text-xl sm:text-2xl font-bold font-headline text-white mt-1">
              Mining Without Owning Mining Hardware
            </h3>
            <p className="text-xs sm:text-sm text-[#94a3b8] mt-1">
              Cloud mining allows users to participate in a mining system through remote infrastructure rather than personally operating mining machines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-[#0a0f1d] border border-red-500/20 space-y-3">
              <div className="flex items-center gap-2 text-red-400 font-headline font-bold text-sm">
                <span className="material-symbols-outlined text-[18px]">cancel</span>
                <span>Traditional Mining Burdens</span>
              </div>
              <ul className="space-y-2 text-xs text-[#94a3b8]">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                  <strong>Hardware:</strong> Expensive ASIC purchase, shipping &amp; customs fees
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                  <strong>Electricity:</strong> High residential or industrial power bills
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                  <strong>Cooling:</strong> Extreme heat dissipation &amp; deafening noise
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                  <strong>Maintenance:</strong> Part replacements, firmware updates &amp; downtime
                </li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-[#0a0f1d] border border-emerald-500/30 space-y-3 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <div className="flex items-center gap-2 text-emerald-400 font-headline font-bold text-sm">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>SPIKE Cloud Mining Platform</span>
              </div>
              <ul className="space-y-2 text-xs text-[#d4e4fa]">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <strong>Hash Rate:</strong> Instant computational power assignment from $15
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <strong>Mining Infrastructure:</strong> Industrial high-uptime remote data centers
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <strong>Digital Rewards:</strong> Automated daily distribution according to rulebook
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <strong>Simplicity:</strong> 1-Click activation directly from your Web3 wallet
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Page 9: What is Hash Rate & Operational Protocol */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0d1d2c] via-[#122130] to-[#0a0f1d] border border-[#00F0FF]/30 shadow-xl space-y-6">
          <div className="max-w-2xl">
            <span className="text-xs font-mono font-semibold uppercase tracking-[0.16em] text-[#00F0FF]">
              Page 9: Your Digital Mining Power
            </span>
            <h3 className="text-xl sm:text-2xl font-bold font-headline text-white mt-1">
              What Is Hash Rate?
            </h3>
            <p className="text-xs sm:text-sm text-[#94a3b8] mt-1 leading-relaxed">
              Hash Rate represents the computational capacity assigned to a mining participant or mining system. In a cloud-mining model, users access this capacity through the platform rather than operating physical mining hardware themselves.
            </p>
          </div>

          {/* How Hash Rate Works Flow */}
          <div className="space-y-2">
            <div className="text-xs font-mono text-[#D4AF37] uppercase font-bold tracking-wider">
              How Hash Rate Works: Protocol Flow
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {[
                { step: '01', title: 'ACTIVATE', desc: 'Select hashrate allocation starting from $15' },
                { step: '02', title: 'ASSIGN', desc: 'Computational power assigned to validator node' },
                { step: '03', title: 'PROCESS', desc: 'ASIC cluster processes cryptographic blocks' },
                { step: '04', title: 'DISTRIBUTE', desc: 'Proportional rewards distributed to wallet' },
              ].map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[#0a0f1d] border border-[#1c2b3b] relative">
                  <span className="text-[10px] font-mono text-[#00F0FF] font-bold">PHASE {item.step}</span>
                  <div className="text-base font-extrabold font-headline text-white mt-1">{item.title}</div>
                  <p className="text-[11px] text-[#94a3b8] mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          PAGE 6: HOW SPIKE WORKS — THE SPIKE MINING JOURNEY
         ========================================================= */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-mono font-semibold uppercase tracking-[0.16em] text-[#D4AF37]">
            Page 6: The 5-Step Process
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-headline text-white tracking-tight">
            How SPIKE Works: The Mining Journey
          </h2>
          <p className="text-xs text-[#94a3b8]">
            Activate Your Hash Rate. Start Mining. Step Into the SPIKE Ecosystem.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              step: '1',
              title: 'Activate',
              desc: 'Start with Hash Rate activation from $15. Choose your computational scale.',
              icon: 'power_settings_new',
              color: 'text-[#00F0FF]',
            },
            {
              step: '2',
              title: 'Mine',
              desc: "Mining begins according to the platform's defined mechanical rules.",
              icon: 'settings_suggest',
              color: 'text-[#7df4ff]',
            },
            {
              step: '3',
              title: 'Accumulate',
              desc: 'SPIKE is distributed according to applicable proportional mining rules.',
              icon: 'savings',
              color: 'text-[#D4AF37]',
            },
            {
              step: '4',
              title: 'Track',
              desc: 'Monitor real-time blockchain telemetry, difficulty index and market activity.',
              icon: 'monitoring',
              color: 'text-[#00F0FF]',
            },
            {
              step: '5',
              title: 'Utility',
              desc: 'As platform develops, SPIKE connects with ecosystem utilities & staking.',
              icon: 'hub',
              color: 'text-emerald-400',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-[#122130] border border-[#1c2b3b] flex flex-col justify-between relative group hover:border-[#00F0FF]/40 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-[#0a0f1d] ${item.color} flex items-center justify-center border border-[#1c2b3b]`}>
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#94a3b8]">STEP 0{item.step}</span>
                </div>
                <h3 className="text-base font-bold font-headline text-white group-hover:text-[#00F0FF] transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-[#94a3b8] mt-1.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================
          SECTION 3: TOKENOMICS & THE $5 SWAP THRESHOLD (id="calculator" & id="tokenomics")
          Page 7: THE SPIKE TOKEN — Engineered for a Scalable Digital Ecosystem
          Page 8: THE $5 SWAP THRESHOLD — From Market Price to Swap
          Page 10: THE SPIKE MINING ENGINE — Dynamic Hash-Rate Reward Architecture
         ========================================================= */}
      <section id="calculator" className="space-y-8 scroll-mt-24">
        {/* Token Foundation Overview */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#122130] border border-[#1c2b3b] shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <span className="text-xs font-mono font-semibold uppercase tracking-[0.16em] text-[#00F0FF]">
                Page 7: Token Foundation
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-headline text-white tracking-tight mt-1">
                The SPIKE Token: Engineered for a Scalable Digital Ecosystem
              </h2>
            </div>
            <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-[#0d1d2c] border border-[#D4AF37]/30 text-[#D4AF37] self-start sm:self-auto">
              Fixed Hard Cap: 50,000,000
            </div>
          </div>

          {/* Token Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl bg-[#0a0f1d] border border-[#1c2b3b]">
              <div className="text-[10px] font-mono text-[#94a3b8] uppercase">Total Supply</div>
              <div className="text-xl sm:text-2xl font-extrabold font-headline text-white mt-1 tabular-nums">
                50,000,000
              </div>
              <div className="text-[10px] font-mono text-[#00F0FF]">Strict Max Cap</div>
            </div>

            <div className="p-4 rounded-xl bg-[#0a0f1d] border border-[#1c2b3b]">
              <div className="text-[10px] font-mono text-[#94a3b8] uppercase">Token Standard</div>
              <div className="text-xl sm:text-2xl font-extrabold font-headline text-[#00F0FF] mt-1">
                BEP-20
              </div>
              <div className="text-[10px] font-mono text-[#94a3b8]">Verified Contract</div>
            </div>

            <div className="p-4 rounded-xl bg-[#0a0f1d] border border-[#1c2b3b]">
              <div className="text-[10px] font-mono text-[#94a3b8] uppercase">Blockchain</div>
              <div className="text-xl sm:text-2xl font-extrabold font-headline text-[#D4AF37] mt-1">
                BNB Chain
              </div>
              <div className="text-[10px] font-mono text-[#94a3b8]">Smart Chain (BSC)</div>
            </div>

            <div className="p-4 rounded-xl bg-[#0a0f1d] border border-[#1c2b3b]">
              <div className="text-[10px] font-mono text-[#94a3b8] uppercase">Market Pair</div>
              <div className="text-xl sm:text-2xl font-extrabold font-headline text-white mt-1">
                SPIKE / USDT
              </div>
              <div className="text-[10px] font-mono text-emerald-400">Stable Settlement</div>
            </div>

            <div className="p-4 rounded-xl bg-[#0a0f1d] border border-[#1c2b3b]">
              <div className="text-[10px] font-mono text-[#94a3b8] uppercase">Initial Reference</div>
              <div className="text-xl sm:text-2xl font-extrabold font-headline text-[#00F0FF] mt-1">
                $1.00 USD
              </div>
              <div className="text-[10px] font-mono text-[#D4AF37]">Launch Baseline</div>
            </div>
          </div>
        </div>

        {/* The $5 Swap Threshold Section (Page 8) */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0d1d2c] via-[#122130] to-[#0a0f1d] border border-[#D4AF37]/40 shadow-xl space-y-6">
          <div className="max-w-2xl">
            <span className="text-xs font-mono font-semibold uppercase tracking-[0.16em] text-[#D4AF37]">
              Page 8: Roadmap &amp; Liquidity Framework
            </span>
            <h3 className="text-xl sm:text-2xl font-bold font-headline text-white mt-1">
              The $5 Swap Threshold: From Market Price to Swap
            </h3>
            <p className="text-xs sm:text-sm text-[#94a3b8] mt-1 leading-relaxed">
              SPIKE is planned around a defined $5 market-price threshold for swap functionality. The journey connects launch reference with liquid swap utility.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="p-5 rounded-2xl bg-[#0a0f1d] border border-[#1c2b3b] space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00F0FF]/15 text-[#00F0FF]">
                  PHASE 1
                </span>
                <span className="text-lg font-bold font-mono text-white">$1.00</span>
              </div>
              <h4 className="text-base font-bold font-headline text-white">Initial Reference Price</h4>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Initial reference and launch framework establishing initial computational mining valuation on BNB Smart Chain.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-5 rounded-2xl bg-[#0a0f1d] border border-[#1c2b3b] space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#7df4ff]/15 text-[#7df4ff]">
                  PHASE 2
                </span>
                <span className="text-lg font-bold font-mono text-[#7df4ff]">Discovery</span>
              </div>
              <h4 className="text-base font-bold font-headline text-white">Market Development</h4>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Price discovery phase fueled by liquidity pool expansion, validator node accumulation, and ecosystem staking participation.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#122130] to-[#0a1928] border-2 border-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.25)] space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#D4AF37]/20 text-[#D4AF37]">
                  PHASE 3
                </span>
                <span className="text-lg font-bold font-mono text-[#D4AF37]">$5.00 SWAP</span>
              </div>
              <h4 className="text-base font-bold font-headline text-[#D4AF37]">$5 Swap Activation</h4>
              <p className="text-xs text-[#d4e4fa] leading-relaxed">
                Defined swap activation threshold. SPIKE → USDT converts according to platform rules and available liquidity pools.
              </p>
            </div>
          </div>
        </div>

        {/* Page 10: The SPIKE Mining Engine & Mathematical Emission Formula */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#122130] border border-[#1c2b3b] shadow-xl space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-semibold uppercase tracking-[0.16em] text-[#00F0FF]">
                Page 10: Dynamic Hash-Rate Reward Architecture
              </span>
              <h3 className="text-xl sm:text-2xl font-bold font-headline text-white mt-1">
                The SPIKE Mining Engine: Mathematical Formulation
              </h3>
              <p className="text-xs sm:text-sm text-[#94a3b8] mt-1 max-w-xl">
                SPIKE uses a proportional, capped-emission mining mechanism where each participant's allocation is calculated according to their effective Hash Rate relative to total active network Hash Rate.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#0a0f1d] border border-[#1c2b3b] text-xs font-mono text-[#D4AF37]">
              &ldquo;Every Hash Rate earns a proportion. Every SPIKE comes from a defined maximum supply.&rdquo;
            </div>
          </div>

          {/* Formula Display Box */}
          <div className="p-6 rounded-2xl bg-[#0a0f1d] border border-[#00F0FF]/40 shadow-inner">
            <div className="text-xs font-mono text-[#00F0FF] mb-2 font-bold uppercase tracking-wider">
              Official Emission &amp; Reward Formula:
            </div>
            <div className="text-xl sm:text-2xl font-mono font-bold text-white bg-[#051424] p-4 rounded-xl border border-[#1c2b3b] overflow-x-auto text-center">
              Reward = min( ( (H<sub>u</sub> / H<sub>t</sub>) × E<sub>p</sub> ), R<sub>p</sub> )
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-[#0d1d2c] border border-[#1c2b3b]">
                <span className="text-[#00F0FF] font-bold">H<sub>u</sub>:</span> User Effective Hash Rate
              </div>
              <div className="p-2.5 rounded-lg bg-[#0d1d2c] border border-[#1c2b3b]">
                <span className="text-[#00F0FF] font-bold">H<sub>t</sub>:</span> Total Network Hash Rate
              </div>
              <div className="p-2.5 rounded-lg bg-[#0d1d2c] border border-[#1c2b3b]">
                <span className="text-[#D4AF37] font-bold">E<sub>p</sub>:</span> Period Emission
              </div>
              <div className="p-2.5 rounded-lg bg-[#0d1d2c] border border-[#1c2b3b]">
                <span className="text-emerald-400 font-bold">R<sub>p</sub>:</span> Remaining Mineable SPIKE
              </div>
            </div>

            {/* Emission Control Rules */}
            <div className="mt-4 pt-4 border-t border-[#1c2b3b] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#94a3b8] font-mono">
              <div>
                Remaining Supply = 50,000,000 − Total SPIKE Mined
              </div>
              <div className="text-amber-400 font-semibold">
                When Remaining Supply = 0 ➔ MINING EMISSION ➔ 0 (Zero New Tokens)
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Hash Rate Yield Calculator (Starting from $15 Activation) */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#122130] to-[#0d1d2c] border border-[#00F0FF]/30 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-4">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.16em] text-[#00F0FF]">
                Simulate Your Cloud Allocation
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-headline text-white tracking-tight">
                Hash Rate Yield Simulator
              </h2>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Select an activation package (from $15 starter) or drag custom computational hashrate to view daily, monthly and annual projections.
              </p>

              {/* Quick Preset Buttons */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-mono text-[#94a3b8]">Quick Activation Tiers:</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { usd: 15, ths: 0.30, label: '$15 Starter' },
                    { usd: 75, ths: 1.50, label: '$75 Standard' },
                    { usd: 250, ths: 5.00, label: '$250 Cluster' },
                  ].map((tier) => (
                    <button
                      key={tier.usd}
                      onClick={() => handleTierSelect(tier.usd, tier.ths)}
                      className={`py-2 px-2 rounded-xl text-xs font-mono font-semibold transition-all border ${
                        activationTier === tier.usd && calcHashrate === tier.ths
                          ? 'bg-[#00F0FF]/20 border-[#00F0FF] text-[#00F0FF]'
                          : 'bg-[#0a0f1d] border-[#1c2b3b] text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Slider */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs text-[#94a3b8] font-mono">
                  <span>Effective Hash Rate:</span>
                  <span className="text-[#00F0FF] font-bold text-base">{calcHashrate.toFixed(2)} TH/s</span>
                </div>
                <input
                  type="range"
                  min="0.30"
                  max="10.00"
                  step="0.10"
                  value={calcHashrate}
                  onChange={(e) => {
                    setCalcHashrate(parseFloat(e.target.value));
                    setActivationTier(0);
                  }}
                  className="w-full accent-[#00F0FF] cursor-pointer h-2 bg-[#0a0f1d] rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-[#94a3b8]/70 font-mono">
                  <span>0.30 TH/s ($15)</span>
                  <span>5.00 TH/s</span>
                  <span>10.00 TH/s</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    if (!isWalletConnected) {
                      onConnectWallet();
                    } else {
                      onOpenDeployModal();
                    }
                  }}
                  className="w-full py-3.5 rounded-xl bg-[#00F0FF] text-[#0A0F1D] font-headline font-bold text-xs hover:bg-[#7df4ff] transition-all flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(0,240,255,0.35)]"
                >
                  <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                  <span>{isWalletConnected ? 'Activate Hash Rate Allocation' : 'Connect Wallet to Activate ($15)'}</span>
                </button>
              </div>
            </div>

            {/* Projection Cards */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-[#0a0f1d] border border-[#1c2b3b] text-center flex flex-col justify-between">
                <div className="text-[11px] text-[#94a3b8] font-mono uppercase">Daily Distribution</div>
                <div className="text-3xl font-extrabold font-headline text-[#00F0FF] my-2 tabular-nums tracking-tight">
                  +{dailySpikeReward.toFixed(2)}
                </div>
                <div className="text-[11px] text-[#D4AF37] font-mono">SPIKE Daily</div>
                <div className="text-[10px] text-[#94a3b8] mt-1 font-mono pt-2 border-t border-[#1c2b3b]">
                  ≈ ${dailyUsdtRef.toFixed(2)} at $1 Ref<br />
                  <span className="text-emerald-400">≈ ${dailyUsdtSwapTarget.toFixed(2)} at $5 Swap</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0a0f1d] border border-[#1c2b3b] text-center flex flex-col justify-between">
                <div className="text-[11px] text-[#94a3b8] font-mono uppercase">30-Day Mining</div>
                <div className="text-3xl font-extrabold font-headline text-[#D4AF37] my-2 tabular-nums tracking-tight">
                  +{monthlySpikeReward.toFixed(1)}
                </div>
                <div className="text-[11px] text-[#D4AF37] font-mono">SPIKE / Month</div>
                <div className="text-[10px] text-[#94a3b8] mt-1 font-mono pt-2 border-t border-[#1c2b3b]">
                  ≈ ${(monthlySpikeReward * 1).toFixed(0)} at $1 Ref<br />
                  <span className="text-emerald-400">≈ ${(monthlySpikeReward * 5).toFixed(0)} at $5 Swap</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0a0f1d] border border-[#1c2b3b] text-center flex flex-col justify-between">
                <div className="text-[11px] text-[#94a3b8] font-mono uppercase">Annual Yield</div>
                <div className="text-3xl font-extrabold font-headline text-white my-2 tabular-nums tracking-tight">
                  +{annualSpikeReward.toFixed(0)}
                </div>
                <div className="text-[11px] text-emerald-400 font-mono">SPIKE / Year</div>
                <div className="text-[10px] text-[#94a3b8] mt-1 font-mono pt-2 border-t border-[#1c2b3b]">
                  Fixed Capped Emission<br />
                  <span className="text-emerald-400">Non-dilutive pool</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 4: SECURITY & CERTIK AUDIT (id="security")
         ========================================================= */}
      <section id="security" className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#0d1d2c] to-[#0a0f1d] border border-[#1c2b3b] flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl scroll-mt-24">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center shrink-0 border border-[#D4AF37]/30">
            <span className="material-symbols-outlined text-[32px]">security</span>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-bold font-headline text-white">CertiK Level 2 Verified Architecture</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                SCORE 98.4
              </span>
            </div>
            <p className="text-xs text-[#94a3b8] mt-1 max-w-xl">
              Zero critical vulnerabilities. Immutable contract rules enforce timelocks and non-custodial payouts directly to BEP-20 wallets.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAuditModal}
          className="px-5 py-2.5 rounded-xl bg-[#1c2b3b] hover:bg-[#273647] text-white border border-[#1c2b3b] text-xs font-headline font-semibold flex items-center gap-2 shrink-0 transition-colors"
        >
          <span>Read Full Audit Report</span>
          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
        </button>
      </section>

      {/* =========================================================
          FOOTER: INSTITUTIONAL WEB3
         ========================================================= */}
      <footer className="pt-8 border-t border-[#1c2b3b]/70 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#94a3b8]">
        <div className="flex items-center gap-2">
          <img src={SPIKE_LOGO_URL} alt="SPIKE" className="w-6 h-6 object-contain" referrerPolicy="no-referrer" />
          <span className="font-headline font-bold text-white tracking-wider">SPIKE Protocol</span>
          <span>© 2026. Decentralized Cloud-Mining &amp; Validator Layer on BNB Smart Chain.</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <button onClick={onOpenAuditModal} className="hover:text-[#00F0FF] transition-colors">
            CertiK Audit
          </button>
          <span>·</span>
          <span className="text-[#00F0FF] cursor-pointer hover:underline">BscScan Verified</span>
          <span>·</span>
          <span>BEP-20 Max 50,000,000 SPIKE</span>
        </div>
      </footer>
    </div>
  );
};
