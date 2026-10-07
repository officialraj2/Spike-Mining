import React, { useState, useEffect } from 'react';

interface ExchangeItem {
  rank: number;
  name: string;
  cmcScore: number;
  tier: string;
  volume24hUsd: string;
  status: 'Listing Imminent' | 'Integration Phase' | 'Compliance Review' | 'Tier-1 Target';
  statusColor: string;
  phaseProgress: number; // 0 to 100%
  pairs: string[];
  launchWindow: string;
  iconBg: string;
  iconLetter: string;
  cmcUrl: string;
  notes: string;
}

const TOP_10_EXCHANGES: ExchangeItem[] = [
  {
    rank: 1,
    name: 'Binance',
    cmcScore: 9.9,
    tier: 'Tier 1 CEX',
    volume24hUsd: '$14.28B',
    status: 'Tier-1 Target',
    statusColor: 'from-[#F3BA2F] to-[#E5A812]',
    phaseProgress: 65,
    pairs: ['SPIKE / USDT', 'SPIKE / BNB', 'SPIKE / FDUSD'],
    launchWindow: 'Phase 3 ($5 Threshold Milestone)',
    iconBg: 'bg-[#F3BA2F]/15 border-[#F3BA2F]/40 text-[#F3BA2F]',
    iconLetter: 'B',
    cmcUrl: 'https://coinmarketcap.com/exchanges/binance/',
    notes: 'BSC Ecosystem Native priority alignment with BEP-20 validator cluster verification.',
  },
  {
    rank: 2,
    name: 'Coinbase Exchange',
    cmcScore: 8.7,
    tier: 'Tier 1 US/EU',
    volume24hUsd: '$2.84B',
    status: 'Compliance Review',
    statusColor: 'from-[#0052FF] to-[#0045D8]',
    phaseProgress: 60,
    pairs: ['SPIKE / USD', 'SPIKE / USDT'],
    launchWindow: 'Q1 2027 Expansion',
    iconBg: 'bg-[#0052FF]/15 border-[#0052FF]/40 text-[#3b82f6]',
    iconLetter: 'C',
    cmcUrl: 'https://coinmarketcap.com/exchanges/coinbase-exchange/',
    notes: 'Regulatory asset vetting & CertiK smart contract security audit dossier submitted.',
  },
  {
    rank: 3,
    name: 'Bybit',
    cmcScore: 8.5,
    tier: 'Tier 1 Global',
    volume24hUsd: '$4.62B',
    status: 'Integration Phase',
    statusColor: 'from-[#F7A600] to-[#E09600]',
    phaseProgress: 80,
    pairs: ['SPIKE / USDT', 'SPIKE / USDC'],
    launchWindow: 'Q4 2026 / Bybit Launchpool',
    iconBg: 'bg-[#F7A600]/15 border-[#F7A600]/40 text-[#f59e0b]',
    iconLetter: 'BY',
    cmcUrl: 'https://coinmarketcap.com/exchanges/bybit/',
    notes: 'Spot market maker agreement and order book depth liquidity provision in progress.',
  },
  {
    rank: 4,
    name: 'OKX',
    cmcScore: 8.4,
    tier: 'Tier 1 Global',
    volume24hUsd: '$3.15B',
    status: 'Integration Phase',
    statusColor: 'from-[#FFFFFF] to-[#94a3b8]',
    phaseProgress: 75,
    pairs: ['SPIKE / USDT', 'SPIKE / OKB'],
    launchWindow: 'Q4 2026 Jumpstart',
    iconBg: 'bg-white/10 border-white/30 text-white',
    iconLetter: 'O',
    cmcUrl: 'https://coinmarketcap.com/exchanges/okx/',
    notes: 'OKX Web3 Wallet indexing approved; primary exchange spot listing under review.',
  },
  {
    rank: 5,
    name: 'Upbit',
    cmcScore: 8.1,
    tier: 'Tier 1 APAC',
    volume24hUsd: '$1.92B',
    status: 'Compliance Review',
    statusColor: 'from-[#093687] to-[#002670]',
    phaseProgress: 55,
    pairs: ['SPIKE / KRW', 'SPIKE / USDT'],
    launchWindow: 'H1 2027 KRW Market',
    iconBg: 'bg-[#093687]/20 border-[#093687]/40 text-[#60a5fa]',
    iconLetter: 'U',
    cmcUrl: 'https://coinmarketcap.com/exchanges/upbit/',
    notes: 'South Korea FSC compliance documentation and travel-rule bridge integration pending.',
  },
  {
    rank: 6,
    name: 'Kraken',
    cmcScore: 8.0,
    tier: 'Tier 1 US/EU',
    volume24hUsd: '$985M',
    status: 'Compliance Review',
    statusColor: 'from-[#5741D9] to-[#4531B8]',
    phaseProgress: 68,
    pairs: ['SPIKE / EUR', 'SPIKE / USD', 'SPIKE / USDT'],
    launchWindow: 'Q1 2027 European Route',
    iconBg: 'bg-[#5741D9]/20 border-[#5741D9]/40 text-[#a78bfa]',
    iconLetter: 'K',
    cmcUrl: 'https://coinmarketcap.com/exchanges/kraken/',
    notes: 'Institutional custody & Kraken Pro dark pool liquidity assessment initiated.',
  },
  {
    rank: 7,
    name: 'KuCoin',
    cmcScore: 7.8,
    tier: 'Global CEX',
    volume24hUsd: '$1.41B',
    status: 'Listing Imminent',
    statusColor: 'from-[#24AE8F] to-[#1B8E74]',
    phaseProgress: 90,
    pairs: ['SPIKE / USDT', 'SPIKE / KCS'],
    launchWindow: 'Next Major Round (Scheduled)',
    iconBg: 'bg-[#24AE8F]/20 border-[#24AE8F]/40 text-[#2dd4bf]',
    iconLetter: 'KU',
    cmcUrl: 'https://coinmarketcap.com/exchanges/kucoin/',
    notes: 'Primary Listing Agreement finalized; testnet deposit & withdrawal bridge validated.',
  },
  {
    rank: 8,
    name: 'Gate.io',
    cmcScore: 7.6,
    tier: 'Global CEX',
    volume24hUsd: '$2.18B',
    status: 'Listing Imminent',
    statusColor: 'from-[#2354E6] to-[#00F0FF]',
    phaseProgress: 95,
    pairs: ['SPIKE / USDT', 'SPIKE / GT'],
    launchWindow: 'Confirmed Initial Launch',
    iconBg: 'bg-[#00F0FF]/15 border-[#00F0FF]/40 text-[#00F0FF]',
    iconLetter: 'G',
    cmcUrl: 'https://coinmarketcap.com/exchanges/gate-io/',
    notes: 'Gate Startup Initial Offering approved; smart contract BEP-20 verification complete.',
  },
  {
    rank: 9,
    name: 'Bitget',
    cmcScore: 7.5,
    tier: 'Global CEX',
    volume24hUsd: '$1.85B',
    status: 'Listing Imminent',
    statusColor: 'from-[#00F0FF] to-[#00A3FF]',
    phaseProgress: 88,
    pairs: ['SPIKE / USDT', 'SPIKE / BGB'],
    launchWindow: 'Bitget Innovation Zone Q4',
    iconBg: 'bg-[#00F0FF]/15 border-[#00F0FF]/40 text-[#38bdf8]',
    iconLetter: 'BG',
    cmcUrl: 'https://coinmarketcap.com/exchanges/bitget/',
    notes: 'Innovation Zone listing approved; $250,000 USDT deposit protection pool deposited.',
  },
  {
    rank: 10,
    name: 'MEXC Global',
    cmcScore: 7.4,
    tier: 'Global CEX',
    volume24hUsd: '$1.64B',
    status: 'Listing Imminent',
    statusColor: 'from-[#2563EB] to-[#10B981]',
    phaseProgress: 96,
    pairs: ['SPIKE / USDT', 'SPIKE / MX'],
    launchWindow: 'Kickstarter Round Confirmed',
    iconBg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
    iconLetter: 'M',
    cmcUrl: 'https://coinmarketcap.com/exchanges/mexc/',
    notes: 'Zero-fee trading pair allocation and global marketing campaign ready for launch.',
  },
];

interface AnnouncementsViewProps {
  onCopyText: (text: string) => void;
  onNavigateHome?: (tab: string) => void;
}

export const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({ onCopyText }) => {
  const [filter, setFilter] = useState<'all' | 'imminent' | 'tier1'>('all');
  const [subscribed, setSubscribed] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  // Live countdown timer to upcoming major listing window
  const [timeLeft, setTimeLeft] = useState({
    days: 14,
    hours: 8,
    minutes: 42,
    seconds: 19,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: 59, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const filteredExchanges = TOP_10_EXCHANGES.filter((ex) => {
    if (filter === 'imminent') return ex.status === 'Listing Imminent';
    if (filter === 'tier1') return ex.rank <= 5;
    return true;
  });

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      setSubscribed(true);
      setTimeout(() => setSubscribed(false), 5000);
      setEmailInput('');
    }
  };

  return (
    <div className="flex flex-col w-full space-y-6 md:space-y-8 pb-16">
      {/* ============================================================
          1. HERO HEADER: OFFICIAL ANNOUNCEMENT BANNER
         ============================================================ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1f33] via-[#091726] to-[#05111d] border border-[#D4AF37]/40 p-6 sm:p-8 md:p-10 shadow-[0_0_35px_rgba(212,175,55,0.2)]">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00F0FF]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/50 flex items-center gap-1.5 shadow-[0_0_12px_rgba(212,175,55,0.3)]">
                <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse"></span>
                OFFICIAL ANNOUNCEMENT
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#3861FB]/20 text-[#3861FB] border border-[#3861FB]/40 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px]">verified</span>
                CoinMarketCap Top 10 Spot Ranked
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                BEP-20 / BNB Smart Chain
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-headline text-white tracking-tight leading-tight">
              SPIKE Token ($SPIKE) <br />
              <span className="bg-gradient-to-r from-[#D4AF37] via-[#FFF3B0] to-[#00F0FF] bg-clip-text text-transparent drop-shadow-[0_2px_15px_rgba(212,175,55,0.4)]">
                Global Exchange Listing Roadmap
              </span>
            </h1>

            <p className="text-sm sm:text-base text-[#94a3b8] leading-relaxed">
              In accordance with our official tokenomics and the <strong className="text-white">$5 Swap &amp; Liquidity Threshold</strong>, the SPIKE Foundation is preparing centralized exchange (CEX) deployments across the <strong className="text-[#00F0FF]">Top 10 Global Exchanges ranked by CoinMarketCap</strong>. Initial allocations, security compliance, and market-making liquidity pools have been designated.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-[#94a3b8]">Listing Pairs:</span>
                <span className="text-white font-bold px-2 py-0.5 rounded bg-[#1c2b3b] border border-[#1c2b3b]">SPIKE / USDT</span>
                <span className="text-white font-bold px-2 py-0.5 rounded bg-[#1c2b3b] border border-[#1c2b3b]">SPIKE / BNB</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#94a3b8]">Treasury CEX Reserve:</span>
                <span className="text-[#D4AF37] font-bold">$5,000,000 USDT</span>
              </div>
            </div>
          </div>

          {/* Right: Live Countdown Card */}
          <div className="lg:w-80 shrink-0 p-5 rounded-2xl bg-[#051424]/90 backdrop-blur-md border border-[#00F0FF]/30 shadow-xl flex flex-col items-center text-center space-y-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#00F0FF] font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-ping"></span>
              INITIAL CEX LAUNCH COUNTDOWN
            </span>

            <div className="grid grid-cols-4 gap-2 w-full text-center">
              <div className="p-2 rounded-xl bg-[#0c1f33] border border-[#1c2b3b]">
                <div className="text-2xl font-extrabold font-headline text-white tabular-nums">
                  {String(timeLeft.days).padStart(2, '0')}
                </div>
                <div className="text-[9px] uppercase font-mono text-[#94a3b8]">Days</div>
              </div>
              <div className="p-2 rounded-xl bg-[#0c1f33] border border-[#1c2b3b]">
                <div className="text-2xl font-extrabold font-headline text-white tabular-nums">
                  {String(timeLeft.hours).padStart(2, '0')}
                </div>
                <div className="text-[9px] uppercase font-mono text-[#94a3b8]">Hours</div>
              </div>
              <div className="p-2 rounded-xl bg-[#0c1f33] border border-[#1c2b3b]">
                <div className="text-2xl font-extrabold font-headline text-[#00F0FF] tabular-nums">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </div>
                <div className="text-[9px] uppercase font-mono text-[#94a3b8]">Mins</div>
              </div>
              <div className="p-2 rounded-xl bg-[#0c1f33] border border-[#1c2b3b]">
                <div className="text-2xl font-extrabold font-headline text-[#D4AF37] tabular-nums">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </div>
                <div className="text-[9px] uppercase font-mono text-[#94a3b8]">Secs</div>
              </div>
            </div>

            <div className="text-xs text-[#94a3b8] pt-1">
              Target Reference Threshold: <span className="text-emerald-400 font-bold">$1.00 ➔ $5.00 USDT</span>
            </div>

            <button
              onClick={() => onCopyText('0x097C0f7Cb2469a854ab002DE00B74D49596594bF')}
              className="w-full py-2 px-3 rounded-xl bg-[#1c2b3b] hover:bg-[#273647] text-white text-xs font-headline font-semibold flex items-center justify-center gap-1.5 transition-all border border-[#1c2b3b]"
            >
              <span className="material-symbols-outlined text-[15px]">content_copy</span>
              <span>Copy Verified Token Contract</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================
          2. COINMARKETCAP TOP 10 SPOT EXCHANGES SECTION
         ============================================================ */}
      <div className="space-y-4">
        {/* Section Header & Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold font-headline text-white tracking-tight">
                Top 10 Global Exchanges (CoinMarketCap Ranked)
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#3861FB]/20 text-[#3861FB] border border-[#3861FB]/40">
                CMC Verified
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#94a3b8] mt-0.5">
              Live deployment tracking across the top centralized cryptocurrency spot exchanges worldwide
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-[#122130] p-1 rounded-xl border border-[#1c2b3b] self-start sm:self-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-headline font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-[#00F0FF] text-[#0A0F1D] shadow-[0_0_12px_rgba(0,240,255,0.35)]'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              All Top 10
            </button>
            <button
              onClick={() => setFilter('imminent')}
              className={`px-3 py-1.5 rounded-lg text-xs font-headline font-semibold transition-all ${
                filter === 'imminent'
                  ? 'bg-[#00F0FF] text-[#0A0F1D] shadow-[0_0_12px_rgba(0,240,255,0.35)]'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              Listing Imminent (Q4)
            </button>
            <button
              onClick={() => setFilter('tier1')}
              className={`px-3 py-1.5 rounded-lg text-xs font-headline font-semibold transition-all ${
                filter === 'tier1'
                  ? 'bg-[#00F0FF] text-[#0A0F1D] shadow-[0_0_12px_rgba(0,240,255,0.35)]'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              Tier-1 Giants (#1 - #5)
            </button>
          </div>
        </div>

        {/* Exchange Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredExchanges.map((ex) => {
            const isImminent = ex.status === 'Listing Imminent';
            return (
              <div
                key={ex.rank}
                className={`p-5 rounded-2xl bg-[#0c1d2e] border transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-xl relative overflow-hidden group ${
                  isImminent
                    ? 'border-[#00F0FF]/50 hover:border-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.08)]'
                    : 'border-[#1c2b3b] hover:border-[#D4AF37]/50'
                }`}
              >
                {/* Background glow on hover */}
                <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-[#00F0FF]/5 rounded-full blur-2xl group-hover:bg-[#00F0FF]/15 transition-all pointer-events-none" />

                <div className="flex items-start justify-between gap-3 mb-3">
                  {/* Exchange Identity */}
                  <div className="flex items-center gap-3">
                    {/* Rank Badge */}
                    <div className="w-10 h-10 rounded-xl bg-[#051424] border border-[#1c2b3b] flex items-center justify-center font-headline font-extrabold text-sm text-[#D4AF37]">
                      #{ex.rank}
                    </div>

                    {/* Logo Emblem */}
                    <div className={`w-11 h-11 rounded-xl border flex items-center justify-center font-headline font-extrabold text-base shadow-sm ${ex.iconBg}`}>
                      {ex.iconLetter}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold font-headline text-white group-hover:text-[#00F0FF] transition-colors">
                          {ex.name}
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1c2b3b] text-[#94a3b8]">
                          {ex.tier}
                        </span>
                      </div>
                      <div className="text-xs text-[#94a3b8] font-mono flex items-center gap-2 mt-0.5">
                        <span>CMC Score: <strong className="text-white">{ex.cmcScore}</strong></span>
                        <span>·</span>
                        <span>24h Vol: <strong className="text-emerald-400">{ex.volume24hUsd}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold tracking-wide ${
                        isImminent
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-pulse'
                          : ex.status === 'Integration Phase'
                          ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40'
                          : 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {ex.status}
                    </span>
                    <div className="text-[10px] font-mono text-[#94a3b8] mt-1">
                      {ex.launchWindow}
                    </div>
                  </div>
                </div>

                {/* Progress Bar of Listing Pipeline */}
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-[#94a3b8]">Listing Pipeline Integration:</span>
                    <span className="text-white font-bold">{ex.phaseProgress}% Ready</span>
                  </div>
                  <div className="w-full h-2 bg-[#051424] rounded-full overflow-hidden border border-[#1c2b3b]">
                    <div
                      className={`h-full bg-gradient-to-r ${
                        isImminent
                          ? 'from-emerald-500 via-[#00F0FF] to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                          : 'from-[#D4AF37] to-[#00F0FF]'
                      }`}
                      style={{ width: `${ex.phaseProgress}%` }}
                    />
                  </div>
                </div>

                {/* Exchange Specific Notes */}
                <p className="text-xs text-[#94a3b8] leading-relaxed mb-3 bg-[#051424]/60 p-2.5 rounded-xl border border-[#1c2b3b]/60">
                  {ex.notes}
                </p>

                {/* Card Footer: Pairs & CMC Link */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1c2b3b]/70 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#94a3b8] text-[11px]">Pairs:</span>
                    {ex.pairs.map((p, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 rounded bg-[#1c2b3b] text-white text-[10px] font-semibold">
                        {p}
                      </span>
                    ))}
                  </div>

                  <a
                    href={ex.cmcUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#00F0FF] hover:underline flex items-center gap-1 font-semibold text-[11px] transition-all group-hover:translate-x-0.5"
                  >
                    <span>View on CMC</span>
                    <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================
          3. OFFICIAL PRESS RELEASES & COMPLIANCE ANNOUNCEMENTS
         ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Foundation Listing Disclosures */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0c1d2e] border border-[#1c2b3b] space-y-4 shadow-md">
          <div className="flex items-center justify-between pb-3 border-b border-[#1c2b3b]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#D4AF37] text-[22px]">campaign</span>
              <h3 className="text-lg font-bold font-headline text-white">
                Official Listing Disclosures &amp; Bulletins
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[#94a3b8]">Updated Daily</span>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-[#051424] border border-[#1c2b3b] hover:border-[#00F0FF]/40 transition-all">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#94a3b8] mb-1">
                <span className="text-[#00F0FF] font-bold">RELEASE #CEX-2026-08</span>
                <span>October 2026</span>
              </div>
              <h4 className="text-sm font-bold font-headline text-white mb-1">
                Gate.io &amp; MEXC Initial Listing Smart Contract Authorization
              </h4>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                The technical review for SPIKE token BEP-20 smart contract deposit and withdrawal bridges has been cleared with zero security vulnerabilities. Test transactions on the BSC mainnet completed with sub-second finality.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#051424] border border-[#1c2b3b] hover:border-[#00F0FF]/40 transition-all">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#94a3b8] mb-1">
                <span className="text-[#D4AF37] font-bold">RELEASE #CEX-2026-07</span>
                <span>September 2026</span>
              </div>
              <h4 className="text-sm font-bold font-headline text-white mb-1">
                $5,000,000 USDT Multi-Sig CEX Liquidity Vault Allocation
              </h4>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                In strict compliance with the platform’s transparent treasury guidelines, $5M USDT has been partitioned into a multi-signature vault to supply tight bid-ask spreads and deep order books upon Tier-1 exchange activation.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#051424] border border-[#1c2b3b] hover:border-[#00F0FF]/40 transition-all">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#94a3b8] mb-1">
                <span className="text-emerald-400 font-bold">RELEASE #CEX-2026-06</span>
                <span>August 2026</span>
              </div>
              <h4 className="text-sm font-bold font-headline text-white mb-1">
                CertiK &amp; Hacken Audit Clearance for Centralized Custody
              </h4>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Both Tier-1 security auditors have completed deep bytecode analysis, verifying standard BEP-20 compatibility without blacklist capabilities, ensuring safe integration for institutional and retail exchange custody.
              </p>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Get Listing Alerts Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-b from-[#0c1f33] to-[#051424] border border-[#D4AF37]/40 shadow-lg flex flex-col justify-between space-y-4">
          <div>
            <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] mb-3">
              <span className="material-symbols-outlined text-[26px]">notifications_active</span>
            </div>

            <h3 className="text-lg font-bold font-headline text-white mb-1">
              Never Miss a Listing Drop
            </h3>
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              Get instant automated alerts the moment SPIKE token deposits and trading pairs open on Binance, Bybit, Gate.io, and other top-tier exchanges.
            </p>
          </div>

          <form onSubmit={handleSubscribe} className="space-y-3">
            <div>
              <label className="text-[10px] uppercase font-mono text-[#94a3b8] block mb-1">
                Email / Telegram Handle
              </label>
              <input
                type="text"
                placeholder="you@domain.com or @username"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#051424] border border-[#1c2b3b] text-white text-xs font-mono focus:outline-none focus:border-[#00F0FF] transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#00F0FF] text-[#051424] font-headline font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:brightness-110 transition-all"
            >
              <span>Get Immediate Listing Alerts</span>
              <span className="material-symbols-outlined text-[15px]">send</span>
            </button>

            {subscribed && (
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-mono text-center animate-pulse">
                ✓ Successfully subscribed to SPIKE CEX listing alerts!
              </div>
            )}
          </form>

          <div className="text-[10px] text-[#94a3b8]/70 text-center font-mono pt-2 border-t border-[#1c2b3b]/60">
            Zero spam · Instant cryptographic announcements only
          </div>
        </div>
      </div>
    </div>
  );
};
