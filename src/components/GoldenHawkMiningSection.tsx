import React, { useState, useEffect } from 'react';
import { SPIKE_LOGO_URL } from '../data/mockData';

interface GoldenHawkMiningSectionProps {
  totalHashrate: number;
  walletBalance: number;
  isWalletConnected?: boolean;
  onClaimReward?: (amount: number) => void;
  onDeployMoreNodes?: () => void;
  activeNodesCount?: number;
  isNodeActive?: boolean;
}

export const GoldenHawkMiningSection: React.FC<GoldenHawkMiningSectionProps> = ({
  totalHashrate,
  walletBalance,
  isWalletConnected = true,
  onClaimReward,
  onDeployMoreNodes,
  activeNodesCount,
  isNodeActive,
}) => {
  // Turbo 10x is permanently fixed as requested
  const isTurbo = true;

  // Animation runs ONLY when mining node is active
  const isMining = isNodeActive !== undefined
    ? isNodeActive
    : activeNodesCount !== undefined
    ? activeNodesCount > 0
    : (totalHashrate > 0);

  const [isStriking, setIsStriking] = useState<boolean>(false);
  const [accumulatedSpike, setAccumulatedSpike] = useState<number>(0);
  const [accumulatedUsdt, setAccumulatedUsdt] = useState<number>(0);
  const [currentBlock, setCurrentBlock] = useState<number>(38192842);
  const [sharesCount, setSharesCount] = useState<number>(0);
  const [lastBlockTime, setLastBlockTime] = useState<string>('Standby');
  const [claimedNotice, setClaimedNotice] = useState<boolean>(false);
  const [strikeNotice, setStrikeNotice] = useState<string | null>(null);

  // Effective Hashrate with fixed 10x Turbo speed (0 TH/s if no active nodes)
  const effectiveHashrate = isMining && totalHashrate > 0 ? totalHashrate * 10 : 0;

  // Real-time mining ticker: accumulates tokens every 1.2 seconds when mining node is active
  useEffect(() => {
    if (!isMining || totalHashrate <= 0) {
      setAccumulatedSpike(0);
      setAccumulatedUsdt(0);
      setSharesCount(0);
      setLastBlockTime('Standby');
      return;
    }

    // Set initial active shares when first activated
    setSharesCount((prev) => (prev === 0 ? 124 : prev));
    setLastBlockTime('Just now');

    const interval = setInterval(() => {
      // Yield proportional to actual hashrate
      const increment = +(0.0052 * (totalHashrate / 1.28 || 1)).toFixed(5);
      setAccumulatedSpike((prev) => +(prev + increment).toFixed(5));
      setAccumulatedUsdt((prev) => +((prev + increment) * 1.0).toFixed(4));

      // Randomly forge new block every few ticks & trigger automated Baaz dive strike
      if (Math.random() > 0.45) {
        setCurrentBlock((b) => b + 1);
        setSharesCount((s) => s + 1);
        setLastBlockTime('Just now');

        if (Math.random() > 0.65) {
          setIsStriking(true);
          setTimeout(() => setIsStriking(false), 1400);
        }
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [isMining, totalHashrate]);

  // Trigger high-velocity power strike into the coin
  const handleStrikeBlock = () => {
    if (isStriking) return;
    setIsStriking(true);
    setStrikeNotice('⚡ CORE PULSE: BLOCK #38,192,845 FORGED!');
    setAccumulatedSpike((prev) => +(prev + 0.5).toFixed(5));
    setAccumulatedUsdt((prev) => +(prev + 0.5).toFixed(4));
    setCurrentBlock((b) => b + 1);
    setSharesCount((s) => s + 12);

    setTimeout(() => {
      setIsStriking(false);
    }, 1400);

    setTimeout(() => {
      setStrikeNotice(null);
    }, 3500);
  };

  const handleClaim = () => {
    if (accumulatedUsdt <= 0) return;
    const claimedAmt = accumulatedUsdt;
    setClaimedNotice(true);
    if (onClaimReward) {
      onClaimReward(claimedAmt);
    }
    setAccumulatedSpike(0);
    setAccumulatedUsdt(0);
    setTimeout(() => setClaimedNotice(false), 3000);
  };

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#071322] via-[#0a1a2e] to-[#040e1a] border-2 border-[#D4AF37]/50 p-6 md:p-8 shadow-[0_0_40px_rgba(212,175,55,0.25)] transition-all">
      {/* Background Energy Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#D4AF37]/15 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#00F0FF]/15 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(0,240,255,0.06)_0%,transparent_70%)] pointer-events-none" />

      {/* Cyber Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1c2b3b15_1px,transparent_1px),linear-gradient(to_bottom,#1c2b3b15_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#1c2b3b]/80">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-[0.16em] bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 flex items-center gap-1.5 shadow-[0_0_10px_rgba(212,175,55,0.3)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-ping" />
              <span>APEX MINING ENGINE · SPIKE CORE</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30">
              BEP-20 HIGH-VELOCITY STRATUM
            </span>
            {isTurbo && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                ⚡ 10X TURBO OVERCLOCK ACTIVE
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-headline text-white tracking-tight mt-1.5 flex items-center gap-2.5">
            <span>SPIKE Apex Mining Engine: Live Medallion</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono font-normal">
              {isMining ? '● HASHING LIVE' : '○ STANDBY'}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-[#94a3b8] mt-1 max-w-2xl">
            Live 3D Medallion Hashrate Core: Dynamic BSC Validator Cluster &amp; Stratum Telemetry Matrix running at 10X Turbo speed.
          </p>
        </div>

        {/* Active Telemetry: Turbo 10x Fixed & Dynamic Active Mining Status */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="px-3.5 py-2 rounded-xl bg-[#0c1d2e] border border-[#D4AF37]/50 flex items-center gap-2 shadow-[0_0_16px_rgba(212,175,55,0.25)]">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
            <span className="text-xs font-mono font-extrabold text-[#D4AF37] tracking-wider">
              ⚡ TURBO 10X (FIXED)
            </span>
          </div>

          <div
            className={`px-3.5 py-2 rounded-xl border flex items-center gap-2 transition-all ${
              isMining
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                : 'bg-[#122130] border-[#1c2b3b] text-[#94a3b8]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isMining ? 'bg-emerald-400 animate-ping' : 'bg-[#94a3b8]'
              }`}
            />
            <span className="text-xs font-headline font-bold">
              {isMining ? 'NODE ACTIVE · HASHING' : 'IDLE · NO ACTIVE NODE'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Interactive Stage: The Golden Baaz Swooping & Orbiting the SPIKE Gold Coin */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-6">
        {/* Left Visual: 3D Medallion Coin with the Flying Baaz Swooping in from above and rotating */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center relative select-none">
          {/* Flight Arena Container with high perspective */}
          <div className="relative w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center">
            {/* Sonic Expanding Rings from Coin Center */}
            {isMining && (
              <>
                <div
                  className="absolute inset-4 rounded-full border border-[#D4AF37]/35 pointer-events-none animate-ping"
                  style={{ animationDuration: isTurbo ? '1.4s' : '2.8s' }}
                />
                <div
                  className="absolute -inset-4 rounded-full border border-[#00F0FF]/30 pointer-events-none animate-pulse"
                  style={{ animationDuration: '2s' }}
                />
                <div className="absolute -inset-10 rounded-full border border-dashed border-[#D4AF37]/20 pointer-events-none animate-[spin_24s_linear_infinite]" />
              </>
            )}

            {/* Glowing Golden & Cyan Backdrop Vortex */}
            <div
              className={`absolute inset-6 rounded-full transition-all duration-700 blur-2xl ${
                isTurbo
                  ? 'bg-gradient-to-tr from-[#D4AF37]/45 via-amber-400/40 to-[#00F0FF]/35 scale-110'
                  : isMining
                  ? 'bg-gradient-to-tr from-[#D4AF37]/25 via-amber-500/20 to-[#00F0FF]/25 scale-100'
                  : 'bg-transparent scale-90'
              }`}
            />

            {/* ============================================================
                THE CENTER SPIKE GOLD MEDALLION COIN
               ============================================================ */}
            <div
              className={`relative z-20 w-48 h-48 sm:w-56 sm:h-56 rounded-full transition-all duration-500 ${
                isMining ? 'animate-[coin3DTilt_8s_ease-in-out_infinite]' : 'scale-95 grayscale opacity-80'
              }`}
              style={{
                boxShadow: isTurbo
                  ? '0 0 50px rgba(212,175,55,0.7), inset 0 0 25px rgba(0,240,255,0.4)'
                  : '0 0 35px rgba(212,175,55,0.5), inset 0 0 15px rgba(0,240,255,0.3)',
              }}
            >
              {/* Outer Serrated Gold Coin Rim */}
              <div className="absolute inset-0 rounded-full border-[5px] border-[#D4AF37] ring-4 ring-[#ffe088]/40 shadow-2xl bg-gradient-to-b from-[#1a2d42] to-[#040e1b] overflow-hidden flex items-center justify-center">
                {/* Metallic Edge Shimmer */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,224,136,0.3)_0%,transparent_60%)] pointer-events-none" />

                {/* Deep Blue Cosmic Vortex with Swirling Sonic Energy */}
                <div
                  className={`absolute inset-2 rounded-full bg-gradient-to-tr from-[#020b17] via-[#0a2747] to-[#04162c] border-2 border-[#00F0FF]/40 overflow-hidden flex items-center justify-center ${
                    isMining ? 'animate-[vortexSwirl_16s_linear_infinite]' : ''
                  }`}
                >
                  {/* Swirling Blue & Gold Energy Streaks */}
                  <svg
                    viewBox="0 0 200 200"
                    className="absolute inset-0 w-full h-full opacity-60 pointer-events-none"
                  >
                    <defs>
                      <linearGradient id="sonicGold" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#D4AF37" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#00F0FF" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 30,100 C 50,40 150,40 170,100 C 150,160 50,160 30,100 Z"
                      fill="none"
                      stroke="url(#sonicGold)"
                      strokeWidth="2.5"
                      strokeDasharray="18 10"
                    />
                    <path
                      d="M 50,100 C 70,60 130,60 150,100 C 130,140 70,140 50,100 Z"
                      fill="none"
                      stroke="#00F0FF"
                      strokeWidth="1.5"
                      strokeDasharray="8 6"
                      opacity="0.8"
                    />
                  </svg>
                </div>

                {/* Inner SPIKE Medallion Image */}
                <img
                  src={SPIKE_LOGO_URL}
                  alt="SPIKE Gold Medallion"
                  className="relative z-10 w-40 h-40 sm:w-48 sm:h-48 object-contain drop-shadow-[0_0_20px_rgba(212,175,55,0.7)] select-none pointer-events-none"
                  referrerPolicy="no-referrer"
                />

                {/* Impact Flash Shockwave on Strike */}
                {isStriking && (
                  <div className="absolute inset-0 bg-[#ffe088] rounded-full animate-ping opacity-80 pointer-events-none z-30" />
                )}
              </div>
            </div>

            {/* ============================================================
                3 ROTATING COPIES OF THE OFFICIAL SPIKE LOGO MEDALLION
                (Smooth orbital rotation with glowing rims, flares & depth)
               ============================================================ */}
            {/* Orbital Copy 1: Upper Right Orbit */}
            <div
              className={`absolute inset-0 pointer-events-none transition-all duration-700 ${
                isMining
                  ? isTurbo
                    ? 'animate-[spin_12s_linear_infinite]'
                    : 'animate-[spin_20s_linear_infinite]'
                  : 'opacity-40'
              }`}
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 pointer-events-auto group">
                <div className="relative flex items-center justify-center">
                  <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full p-1 bg-gradient-to-tr from-[#0d1d2c] via-[#122130] to-[#0a0f1d] border-2 border-[#D4AF37] shadow-[0_0_24px_rgba(212,175,55,0.8)] backdrop-blur-md transition-transform duration-300 group-hover:scale-110">
                    <img
                      src={SPIKE_LOGO_URL}
                      alt="SPIKE Validator Copy 1"
                      onError={(e) => { e.currentTarget.src = '/spike_logo.png'; }}
                      className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(212,175,55,0.7)]"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="absolute -top-1.5 -right-1.5 text-[#D4AF37] text-xs font-bold animate-pulse drop-shadow-[0_0_8px_#D4AF37]">
                    ✦
                  </span>
                  <div className="absolute inset-0 rounded-full bg-[#D4AF37]/25 blur-md pointer-events-none"></div>
                </div>
              </div>
            </div>

            {/* Orbital Copy 2: Bottom Left Counter-Rotating */}
            <div
              className={`absolute inset-0 pointer-events-none transition-all duration-700 ${
                isMining
                  ? isTurbo
                    ? 'animate-[spin_15s_linear_infinite_reverse]'
                    : 'animate-[spin_26s_linear_infinite_reverse]'
                  : 'opacity-40'
              }`}
            >
              <div className="absolute bottom-5 -left-4 pointer-events-auto group">
                <div className="relative flex items-center justify-center">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full p-0.5 bg-gradient-to-br from-[#0d1d2c] to-[#051424] border-2 border-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.85)] backdrop-blur-md transition-transform duration-300 group-hover:scale-110">
                    <img
                      src={SPIKE_LOGO_URL}
                      alt="SPIKE Validator Copy 2"
                      onError={(e) => { e.currentTarget.src = '/spike_logo.png'; }}
                      className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(0,240,255,0.8)]"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="absolute -top-1 -left-1 text-[#00F0FF] text-[11px] font-bold drop-shadow-[0_0_8px_#00F0FF]">
                    ✦
                  </span>
                  <div className="absolute inset-0 rounded-full bg-[#00F0FF]/30 blur-md pointer-events-none"></div>
                </div>
              </div>
            </div>

            {/* Orbital Copy 3: Bottom Right Orbit */}
            <div
              className={`absolute inset-0 pointer-events-none transition-all duration-700 ${
                isMining
                  ? isTurbo
                    ? 'animate-[spin_18s_linear_infinite]'
                    : 'animate-[spin_32s_linear_infinite]'
                  : 'opacity-40'
              }`}
            >
              <div className="absolute bottom-4 -right-4 pointer-events-auto group">
                <div className="relative flex items-center justify-center">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full p-1 bg-gradient-to-tr from-[#0a0f1d] via-[#122130] to-[#0d1d2c] border-2 border-[#D4AF37]/90 shadow-[0_0_20px_rgba(212,175,55,0.7)] backdrop-blur-md transition-transform duration-300 group-hover:scale-110">
                    <img
                      src={SPIKE_LOGO_URL}
                      alt="SPIKE Validator Copy 3"
                      onError={(e) => { e.currentTarget.src = '/spike_logo.png'; }}
                      className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(212,175,55,0.7)]"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="absolute -bottom-1 -right-1 text-[#D4AF37] text-[10px] font-bold drop-shadow-[0_0_8px_#D4AF37]">
                    ✧
                  </span>
                  <div className="absolute inset-0 rounded-full bg-[#D4AF37]/25 blur-md pointer-events-none"></div>
                </div>
              </div>
            </div>

            {/* Orbiting Orbital Trail Rings */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none opacity-40"
              viewBox="0 0 320 320"
            >
              <ellipse
                cx="160"
                cy="160"
                rx="140"
                ry="100"
                fill="none"
                stroke="url(#orbitGoldGrad)"
                strokeWidth="1.5"
                strokeDasharray="6 8"
                transform="rotate(-15 160 160)"
              />
              <defs>
                <linearGradient id="orbitGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00F0FF" />
                  <stop offset="50%" stopColor="#D4AF37" />
                  <stop offset="100%" stopColor="#00F0FF" stopOpacity="0.2" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Dynamic Flight HUD Indicator */}
          <div className="mt-2 text-center space-y-1">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-xs font-mono font-bold text-[#D4AF37] shadow-sm">
              <span className="material-symbols-outlined text-[15px] animate-bounce text-[#D4AF37]">
                auto_awesome
              </span>
              <span>
                {strikeNotice ||
                  (isMining
                    ? '⚡ SPIKE VALIDATOR CORE · MINING BLOCKS'
                    : 'MINING PAUSED · CORE ON STANDBY')}
              </span>
              <span className="material-symbols-outlined text-[15px] animate-bounce text-[#D4AF37]">
                auto_awesome
              </span>
            </div>

            <div className="text-xs text-[#94a3b8] font-mono">
              Validator Node Synced · Block #{currentBlock.toLocaleString()} Verified ({lastBlockTime})
            </div>
          </div>
        </div>

        {/* Right Console: Live Hashing Power, Accrued Rewards & Loot Claim */}
        <div className="lg:col-span-6 space-y-5">
          {/* Main Hash Power & Live Rate Card */}
          <div className="bg-[#051424] rounded-2xl p-5 md:p-6 border border-[#1c2b3b] shadow-inner space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#94a3b8] font-mono font-semibold uppercase tracking-[0.14em]">
                  Effective Hashrate Velocity
                </span>
                <div className="text-3xl sm:text-4xl font-extrabold font-headline text-white mt-1 tabular-nums tracking-tight flex items-baseline gap-2">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#7df4ff] to-[#00F0FF]">
                    {effectiveHashrate.toFixed(2)}
                  </span>
                  <span className="text-base sm:text-lg text-[#00F0FF] font-semibold">TH/s</span>
                  {isTurbo && (
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/40 animate-pulse">
                      OVERCLOCKED
                    </span>
                  )}
                </div>
              </div>

              {/* Live Hash Equalizer Visualizer */}
              <div className="flex items-end gap-1 h-10 px-3 py-1 rounded-lg bg-[#0c1d2e] border border-[#1c2b3b]">
                {[40, 70, 95, 60, 85, 100, 75, 90, 65, 80].map((h, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-300 ${
                      isMining
                        ? isTurbo
                          ? 'bg-gradient-to-t from-red-500 to-[#D4AF37]'
                          : 'bg-gradient-to-t from-[#00F0FF] to-[#7df4ff]'
                        : 'bg-[#1c2b3b]'
                    }`}
                    style={{
                      height: isMining
                        ? `${Math.max(15, (h * (isTurbo ? 1.0 : 0.85)) % 100)}%`
                        : '20%',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Accrued Mining Loot Box */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#0c1d2e] to-[#0a1726] border border-[#D4AF37]/40 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[10px] text-[#D4AF37] font-mono font-bold uppercase tracking-[0.14em] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">savings</span>
                  <span>Uncollected Mined Loot (Real-Time)</span>
                </div>
                <div className="text-2xl font-extrabold font-headline text-white mt-1 tabular-nums">
                  +{accumulatedSpike.toFixed(4)}{' '}
                  <span className="text-sm font-semibold text-[#D4AF37]">SPIKE</span>
                  <span className="text-xs text-[#94a3b8] font-mono ml-2">
                    (≈ ${accumulatedUsdt.toFixed(2)} USDT)
                  </span>
                </div>
              </div>

              <button
                onClick={handleClaim}
                disabled={accumulatedUsdt <= 0}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#e6c35c] hover:from-[#ffe088] hover:to-[#D4AF37] text-[#0A0F1D] font-headline font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(212,175,55,0.4)] disabled:opacity-40 disabled:cursor-not-allowed hover:scale-102 shrink-0 tracking-wide"
              >
                <span className="material-symbols-outlined text-[16px]">toll</span>
                <span>{claimedNotice ? 'Loot Harvested!' : 'Harvest Mined Loot'}</span>
              </button>
            </div>

            {/* 3 Telemetry Metrics */}
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-[#0c1d2e] border border-[#1c2b3b]">
                <div className="text-[10px] text-[#94a3b8] font-mono uppercase">ASIC Temp</div>
                <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                  {isTurbo ? '71°C' : '64°C'}
                </div>
                <div className="text-[9px] text-[#94a3b8]">Optimal Gold Zone</div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#0c1d2e] border border-[#1c2b3b]">
                <div className="text-[10px] text-[#94a3b8] font-mono uppercase">Share Acceptance</div>
                <div className="text-sm font-bold font-mono text-[#00F0FF] mt-0.5">99.98%</div>
                <div className="text-[9px] text-[#94a3b8]">{sharesCount.toLocaleString()} shares</div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#0c1d2e] border border-[#1c2b3b]">
                <div className="text-[10px] text-[#94a3b8] font-mono uppercase">Stratum Latency</div>
                <div className="text-sm font-bold font-mono text-[#D4AF37] mt-0.5">18ms</div>
                <div className="text-[9px] text-[#94a3b8]">BNB Smart Chain</div>
              </div>
            </div>
          </div>

          {/* Quick Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#94a3b8] pt-1">
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Algorithm: SHA-256 (Stratum+SSL)</span>
              <span>·</span>
              <span className="text-[#00F0FF]">Zero Slashing Guarantee</span>
            </div>

            {onDeployMoreNodes && (
              <button
                onClick={onDeployMoreNodes}
                className="text-[#00F0FF] hover:underline font-headline font-bold flex items-center gap-1"
              >
                <span>Deploy Additional ASIC Nodes ($15)</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
