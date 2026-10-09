import React, { useState, useEffect, useMemo } from 'react';
import { MiningNode, RewardTransaction } from '../../types';
import { SPIKE_LOGO_URL } from '../../data/mockData';
import { TradingViewChart } from '../TradingViewChart';
import { GoldenHawkMiningSection } from '../GoldenHawkMiningSection';

const DEX_PAIR_URL = 'https://dexscreener.com/polygon/0x3c12eca24ebafd6795e731753879d5b629dd2741';
const DEX_EMBED_URL = 'https://dexscreener.com/polygon/0x3c12eca24ebafd6795e731753879d5b629dd2741?embed=1&theme=dark&trades=0&info=0';

interface CandleTick {
  time: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isBuySurge?: boolean;
}

interface LiveTxn {
  id: string;
  type: 'buy' | 'sell';
  amountLgns: number;
  amountUsd: number;
  price: number;
  timeAgo: string;
  wallet: string;
  isWhale?: boolean;
}

interface DashboardViewProps {
  nodes: MiningNode[];
  rewards: RewardTransaction[];
  walletBalance: number;
  dailyEarnings: number;
  onRestartNode: (nodeId: string) => void;
  onStopNode: (nodeId: string) => void;
  onStartNode: (nodeId: string) => void;
  onOpenDeployModal: () => void;
  onOpenClaimModal: () => void;
  onOpenAuditModal: () => void;
  onOpenSwapModal?: () => void;
  onOpenDepositModal?: () => void;
  onSwapSuccess?: (fromToken: string, toToken: string, fromAmount: number, toAmount: number) => void;
  walletBNB?: number;
  onCopyText: (text: string) => void;
  walletAddress?: string;
  onClaimReferralBonus?: (amount: number) => void;
  onNavigateToReferrals?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  nodes,
  rewards,
  walletBalance,
  dailyEarnings,
  onRestartNode,
  onStopNode,
  onStartNode,
  onOpenDeployModal,
  onOpenClaimModal,
  onOpenAuditModal,
  onOpenSwapModal,
  onOpenDepositModal,
  onSwapSuccess,
  walletBNB = 0.005,
  onCopyText,
  walletAddress = '',
  onClaimReferralBonus,
  onNavigateToReferrals,
}) => {
  // DEX Swap System State (Inside Dashboard)
  const [dashFromToken, setDashFromToken] = useState<string>('SPIKE');
  const [dashToToken, setDashToToken] = useState<string>('USDT');
  const [dashFromAmount, setDashFromAmount] = useState<string>('100');
  const [dashIsSwapping, setDashIsSwapping] = useState<boolean>(false);
  const [dashSwapSuccessTx, setDashSwapSuccessTx] = useState<string | null>(null);

  const dashTokens: Record<string, { symbol: string; name: string; balance: number; rate: number; isSpike?: boolean; icon?: string }> = {
    SPIKE: { symbol: 'SPIKE', name: 'SPIKE Protocol', balance: walletBalance, rate: 1.0, isSpike: true },
    USDT: { symbol: 'USDT', name: 'Tether USD (BEP-20)', balance: walletBalance, rate: 1.0, icon: 'attach_money' },
    BNB: { symbol: 'BNB', name: 'BNB Smart Chain', balance: walletBNB ?? 0.005, rate: 620.0, icon: 'token' },
  };

  const currentFrom = dashTokens[dashFromToken] || dashTokens.SPIKE;
  const currentTo = dashTokens[dashToToken] || dashTokens.USDT;
  const numFromAmount = parseFloat(dashFromAmount) || 0;
  const dashRate = currentFrom.rate / currentTo.rate;
  const calculatedToAmount = numFromAmount * dashRate;

  const handleFlipDashTokens = () => {
    setDashFromToken(dashToToken);
    setDashToToken(dashFromToken);
  };

  const handleExecuteDashSwap = () => {
    if (numFromAmount <= 0 || numFromAmount > currentFrom.balance) return;
    setDashIsSwapping(true);
    setDashSwapSuccessTx(null);
    setTimeout(() => {
      setDashIsSwapping(false);
      const fakeTx = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      setDashSwapSuccessTx(fakeTx);
      onSwapSuccess?.(currentFrom.symbol, currentTo.symbol, numFromAmount, calculatedToAmount);
    }, 1100);
  };

  const [chartMode, setChartMode] = useState<'animated-stream' | 'dex-embed' | 'hashrate'>('animated-stream');
  const [timeframe, setTimeframe] = useState<'24H' | '7D' | '30D'>('24H');
  const [streamInterval, setStreamInterval] = useState<'1M' | '5M' | '15M' | '1H' | '24H'>('1M');
  const [currentPrice, setCurrentPrice] = useState<number>(0.0003271);
  const [priceChange24h, setPriceChange24h] = useState<number>(4.82);
  const [lastTickDirection, setLastTickDirection] = useState<'up' | 'down'>('up');
  const [hoveredCandle, setHoveredCandle] = useState<{
    x: number;
    y: number;
    tick: CandleTick;
  } | null>(null);

  // Initial live ticks series around DexScreener price
  const [ticks, setTicks] = useState<CandleTick[]>([
    { time: '10:14', open: 0.0003215, high: 0.0003230, low: 0.0003208, close: 0.0003222, price: 0.0003222, volume: 1420, isBuySurge: true },
    { time: '10:15', open: 0.0003222, high: 0.0003241, low: 0.0003218, close: 0.0003235, price: 0.0003235, volume: 1850, isBuySurge: true },
    { time: '10:16', open: 0.0003235, high: 0.0003238, low: 0.0003220, close: 0.0003228, price: 0.0003228, volume: 920, isBuySurge: false },
    { time: '10:17', open: 0.0003228, high: 0.0003250, low: 0.0003225, close: 0.0003246, price: 0.0003246, volume: 2400, isBuySurge: true },
    { time: '10:18', open: 0.0003246, high: 0.0003258, low: 0.0003240, close: 0.0003252, price: 0.0003252, volume: 1680, isBuySurge: true },
    { time: '10:19', open: 0.0003252, high: 0.0003265, low: 0.0003245, close: 0.0003260, price: 0.0003260, volume: 2100, isBuySurge: true },
    { time: '10:20', open: 0.0003260, high: 0.0003262, low: 0.0003248, close: 0.0003254, price: 0.0003254, volume: 1150, isBuySurge: false },
    { time: '10:21', open: 0.0003254, high: 0.0003272, low: 0.0003251, close: 0.0003268, price: 0.0003268, volume: 3200, isBuySurge: true },
    { time: '10:22', open: 0.0003268, high: 0.0003278, low: 0.0003262, close: 0.0003271, price: 0.0003271, volume: 2850, isBuySurge: true },
  ]);

  // Live Buy/Sell Transactions Stream (High Buy side hype 84%+)
  const [liveTxns, setLiveTxns] = useState<LiveTxn[]>([
    { id: 'tx-1', type: 'buy', amountLgns: 54200, amountUsd: 17.72, price: 0.0003271, timeAgo: 'Just now', wallet: '0x8a92...3f1c', isWhale: false },
    { id: 'tx-2', type: 'buy', amountLgns: 210000, amountUsd: 68.62, price: 0.0003268, timeAgo: '2s ago', wallet: '0x4f11...9cb2', isWhale: true },
    { id: 'tx-3', type: 'buy', amountLgns: 38500, amountUsd: 12.57, price: 0.0003265, timeAgo: '5s ago', wallet: '0xd340...e17a', isWhale: false },
    { id: 'tx-4', type: 'sell', amountLgns: 3100, amountUsd: 1.01, price: 0.0003260, timeAgo: '9s ago', wallet: '0x12bb...a840', isWhale: false },
    { id: 'tx-5', type: 'buy', amountLgns: 94000, amountUsd: 30.69, price: 0.0003258, timeAgo: '12s ago', wallet: '0x99cc...451a', isWhale: false },
    { id: 'tx-6', type: 'buy', amountLgns: 350000, amountUsd: 114.28, price: 0.0003254, timeAgo: '16s ago', wallet: '0x6e90...bb44', isWhale: true },
  ]);
  const [buyPressure, setBuyPressure] = useState<number>(84.5);
  const [totalBuysCount, setTotalBuysCount] = useState<number>(1420);
  const [totalSellsCount, setTotalSellsCount] = useState<number>(270);

  // Real-time animation ticker: updates price & adds live candle every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Generate realistic micro delta with upward buy pressure bias
      const delta = (Math.random() - 0.44) * 0.0000009;

      setTicks((prev) => {
        const last = prev[prev.length - 1];
        const newPrice = Math.max(0.000315, last.close + delta);
        const isUp = newPrice >= last.close;
        const newHigh = Math.max(last.close, newPrice) + Math.random() * 0.0000004;
        const newLow = Math.min(last.close, newPrice) - Math.random() * 0.0000004;
        
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        setCurrentPrice(newPrice);
        setLastTickDirection(isUp ? 'up' : 'down');

        const newTick: CandleTick = {
          time: timeStr,
          open: last.close,
          close: newPrice,
          high: newHigh,
          low: newLow,
          price: newPrice,
          volume: Math.floor(800 + Math.random() * 2500),
          isBuySurge: isUp,
        };

        // Create new live trade (85% buy, 15% sell)
        const isBuyTrade = Math.random() < 0.85;
        const isWhaleTrade = isBuyTrade && Math.random() < 0.22;
        const tradeAmount = isWhaleTrade
          ? Math.floor(120000 + Math.random() * 280000)
          : isBuyTrade
          ? Math.floor(15000 + Math.random() * 65000)
          : Math.floor(1800 + Math.random() * 7500);
        const tradeUsd = Number((tradeAmount * newPrice).toFixed(2));
        const randomHex = Math.random().toString(16).substring(2, 6);
        const randomEnd = Math.random().toString(16).substring(2, 6);

        const newTx: LiveTxn = {
          id: `tx-${Date.now()}`,
          type: isBuyTrade ? 'buy' : 'sell',
          amountLgns: tradeAmount,
          amountUsd: tradeUsd,
          price: newPrice,
          timeAgo: 'Just now',
          wallet: `0x${randomHex}...${randomEnd}`,
          isWhale: isWhaleTrade,
        };

        setLiveTxns((prevTx) => [newTx, ...prevTx.slice(0, 5)]);
        if (isBuyTrade) {
          setTotalBuysCount((c) => c + 1);
          setBuyPressure((p) => Math.min(94, Math.max(79, Number((p + 0.1).toFixed(1)))));
        } else {
          setTotalSellsCount((c) => c + 1);
          setBuyPressure((p) => Math.max(76, Number((p - 0.2).toFixed(1))));
        }

        const updated = [...prev.slice(prev.length >= 12 ? 1 : 0), newTick];
        return updated;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const [hoveredDataPoint, setHoveredDataPoint] = useState<{
    x: number;
    y: number;
    hashrate: string;
    time: string;
  } | null>(null);

  // Calculate live total hashrate from active mining nodes
  const totalHashrate = nodes
    .filter((n) => n.status === 'mining')
    .reduce((acc, curr) => acc + curr.hashrate, 0);

  const activeNodeCount = nodes.filter((n) => n.status === 'mining').length;
  const operationalEfficiency = nodes.length > 0 ? Math.round((activeNodeCount / nodes.length) * 100) : 0;

  // Timeframe chart curve data configurations
  const chartConfigs = {
    '24H': {
      points: [
        { cx: 50, cy: 155, rate: '1.18 TH/s', time: '00:00 UTC' },
        { cx: 200, cy: 110, rate: '1.21 TH/s', time: '06:00 UTC' },
        { cx: 400, cy: 125, rate: '1.20 TH/s', time: '12:00 UTC' },
        { cx: 600, cy: 75, rate: '1.23 TH/s', time: '18:00 UTC' },
        { cx: 780, cy: 45, rate: `${totalHashrate.toFixed(2)} TH/s`, time: 'Now' },
      ],
      pathD: 'M 0 160 Q 100 135, 200 110 T 400 125 T 600 75 T 780 45 L 800 40',
      fillD: 'M 0 160 Q 100 135, 200 110 T 400 125 T 600 75 T 780 45 L 800 40 L 800 200 L 0 200 Z',
      timeLabels: ['00:00 UTC', '06:00 UTC', '12:00 UTC', '18:00 UTC', `Now (${totalHashrate.toFixed(2)} TH/s)`],
    },
    '7D': {
      points: [
        { cx: 50, cy: 140, rate: '1.12 TH/s', time: 'Day 1' },
        { cx: 200, cy: 95, rate: '1.25 TH/s', time: 'Day 3' },
        { cx: 400, cy: 130, rate: '1.16 TH/s', time: 'Day 5' },
        { cx: 600, cy: 65, rate: '1.28 TH/s', time: 'Day 6' },
        { cx: 780, cy: 45, rate: `${totalHashrate.toFixed(2)} TH/s`, time: 'Today' },
      ],
      pathD: 'M 0 145 Q 100 110, 200 95 T 400 130 T 600 65 T 780 45 L 800 40',
      fillD: 'M 0 145 Q 100 110, 200 95 T 400 130 T 600 65 T 780 45 L 800 40 L 800 200 L 0 200 Z',
      timeLabels: ['7 Days Ago', '5 Days Ago', '3 Days Ago', 'Yesterday', `Now (${totalHashrate.toFixed(2)} TH/s)`],
    },
    '30D': {
      points: [
        { cx: 50, cy: 165, rate: '0.98 TH/s', time: 'Week 1' },
        { cx: 200, cy: 120, rate: '1.10 TH/s', time: 'Week 2' },
        { cx: 400, cy: 90, rate: '1.22 TH/s', time: 'Week 3' },
        { cx: 600, cy: 60, rate: '1.26 TH/s', time: 'Week 4' },
        { cx: 780, cy: 45, rate: `${totalHashrate.toFixed(2)} TH/s`, time: 'Current' },
      ],
      pathD: 'M 0 170 Q 100 140, 200 120 T 400 90 T 600 60 T 780 45 L 800 40',
      fillD: 'M 0 170 Q 100 140, 200 120 T 400 90 T 600 60 T 780 45 L 800 40 L 800 200 L 0 200 Z',
      timeLabels: ['30 Days Ago', '20 Days Ago', '10 Days Ago', '5 Days Ago', `Now (${totalHashrate.toFixed(2)} TH/s)`],
    },
  };

  const currentChart = chartConfigs[timeframe];

  // SVG Scaled coordinates for the Live Animated Chart
  const svgMetrics = useMemo(() => {
    if (!ticks.length) return { pathD: '', fillD: '', coords: [], minP: 0, maxP: 1 };
    const allLows = ticks.map((t) => t.low);
    const allHighs = ticks.map((t) => t.high);
    const minP = Math.min(...allLows) * 0.9992;
    const maxP = Math.max(...allHighs) * 1.0008;
    const range = maxP - minP || 0.00001;

    const width = 800;
    const height = 200;
    const paddingX = 40;
    const paddingY = 25;
    const plotWidth = width - paddingX * 2;
    const plotHeight = height - paddingY * 2;

    const coords = ticks.map((t, idx) => {
      const x = paddingX + (idx / (ticks.length - 1 || 1)) * plotWidth;
      const yClose = paddingY + plotHeight - ((t.close - minP) / range) * plotHeight;
      const yOpen = paddingY + plotHeight - ((t.open - minP) / range) * plotHeight;
      const yHigh = paddingY + plotHeight - ((t.high - minP) / range) * plotHeight;
      const yLow = paddingY + plotHeight - ((t.low - minP) / range) * plotHeight;
      return { x, yClose, yOpen, yHigh, yLow, tick: t };
    });

    let pathD = `M ${coords[0].x} ${coords[0].yClose}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const midX = (prev.x + curr.x) / 2;
      pathD += ` C ${midX} ${prev.yClose}, ${midX} ${curr.yClose}, ${curr.x} ${curr.yClose}`;
    }

    const last = coords[coords.length - 1];
    const first = coords[0];
    const fillD = `${pathD} L ${last.x} ${height} L ${first.x} ${height} Z`;

    return { pathD, fillD, coords, minP, maxP };
  }, [ticks]);

  return (
    <div className="flex flex-col w-full space-y-6 md:space-y-8 pb-12">
      {/* ============================================================
          DASHBOARD EXECUTIVE OVERVIEW & FAST ACCESS
         ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#122130] p-5 rounded-2xl border border-[#1c2b3b] shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#00F0FF] to-[#D4AF37] p-0.5 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
            <div className="w-full h-full bg-[#0a0f1d] rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px] text-[#00F0FF]">dashboard</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black font-headline text-white tracking-tight">
                Miner Executive Dashboard
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Live Hashrate Monitoring, BSC Validator Clusters, and SPIKE DEX Protocol.
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================
          GOLDEN HAWK (BAAZ) APEX MINING PROTOCOL ENGINE
         ============================================================ */}
      <GoldenHawkMiningSection
        totalHashrate={totalHashrate}
        walletBalance={walletBalance}
        isNodeActive={activeNodeCount > 0}
        activeNodesCount={activeNodeCount}
        onClaimReward={onClaimReferralBonus}
        onDeployMoreNodes={onOpenDeployModal}
      />

      {/* 4 Metric Cards matching Image 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Card 1: Total Hashrate */}
        <div className="bg-[#122130] rounded-xl p-5 md:p-6 flex flex-col justify-between relative overflow-hidden shadow-md group hover:bg-[#1c2b3b] transition-all border border-[#1c2b3b]/60">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#00F0FF]/5 rounded-full blur-xl group-hover:bg-[#00F0FF]/15 transition-all"></div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[#94a3b8] font-mono text-[11px] font-semibold uppercase tracking-[0.14em]">
              Total Hashrate
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#00F0FF]/10 flex items-center justify-center text-[#00F0FF]">
              <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                speed
              </span>
            </div>
          </div>
          <div>
            <div className="text-3xl lg:text-[40px] leading-tight font-extrabold font-headline text-white mb-1 tabular-nums tracking-tight">
              {totalHashrate.toFixed(2)}{' '}
              <span className="text-lg lg:text-xl text-[#00F0FF] font-semibold tracking-normal">TH/s</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#7df4ff] font-medium">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              <span>+4.2% from last epoch</span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Nodes */}
        <div className="bg-[#122130] rounded-xl p-5 md:p-6 flex flex-col justify-between relative overflow-hidden shadow-md group hover:bg-[#1c2b3b] transition-all border border-[#1c2b3b]/60">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#D4AF37]/5 rounded-full blur-xl group-hover:bg-[#D4AF37]/15 transition-all"></div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[#94a3b8] font-mono text-[11px] font-semibold uppercase tracking-[0.14em]">
              Active Nodes
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
              <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                dns
              </span>
            </div>
          </div>
          <div>
            <div className="text-3xl lg:text-[40px] leading-tight font-extrabold font-headline text-white mb-1 tabular-nums tracking-tight">
              {activeNodeCount}{' '}
              <span className="text-lg lg:text-xl text-[#94a3b8] font-semibold tracking-normal">/ {nodes.length} online</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#D4AF37] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse"></span>
              <span>{operationalEfficiency}% Operational Efficiency</span>
            </div>
          </div>
        </div>

        {/* Card 3: Daily USDT Earnings */}
        <div className="bg-[#122130] rounded-xl p-5 md:p-6 flex flex-col justify-between relative overflow-hidden shadow-md group hover:bg-[#1c2b3b] transition-all border border-[#1c2b3b]/60">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#00F0FF]/5 rounded-full blur-xl group-hover:bg-[#00F0FF]/15 transition-all"></div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[#94a3b8] font-mono text-[11px] font-semibold uppercase tracking-[0.14em]">
              Daily USDT Earnings
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#00F0FF]/10 flex items-center justify-center text-[#00F0FF]">
              <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                payments
              </span>
            </div>
          </div>
          <div>
            <div className="text-3xl lg:text-[40px] leading-tight font-extrabold font-headline text-white mb-1 tabular-nums tracking-tight">
              {dailyEarnings.toFixed(2)}{' '}
              <span className="text-lg lg:text-xl text-[#00F0FF] font-semibold tracking-normal">USDT</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#7df4ff] font-medium">
              <span className="material-symbols-outlined text-[14px]">schedule</span>
              <span>Next payout in 3h 12m</span>
            </div>
          </div>
        </div>

        {/* Card 4: Treasury Wallet */}
        <div className="bg-[#122130] rounded-xl p-5 md:p-6 flex flex-col justify-between relative overflow-hidden shadow-md group hover:bg-[#1c2b3b] transition-all border border-[#1c2b3b]/60">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#D4AF37]/5 rounded-full blur-xl group-hover:bg-[#D4AF37]/15 transition-all"></div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[#94a3b8] font-mono text-[11px] font-semibold uppercase tracking-[0.14em] flex items-center gap-1.5">
              <span>Treasury Wallet</span>
              <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
              <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                account_balance_wallet
              </span>
            </div>
          </div>
          <div>
            <div className="text-3xl lg:text-[40px] leading-tight font-extrabold font-headline text-white mb-1 tabular-nums tracking-tight">
              {walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
              <span className="text-lg lg:text-xl text-[#D4AF37] font-semibold tracking-normal">USDT</span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
              <button
                onClick={onOpenClaimModal}
                className="text-xs text-[#00F0FF] hover:underline font-headline font-semibold flex items-center gap-1 transition-all group/btn"
              >
                <span>Claim Rewards</span>
                <span className="material-symbols-outlined text-[14px] group-hover/btn:translate-x-0.5 transition-transform">
                  arrow_forward
                </span>
              </button>
              {onOpenDepositModal && (
                <button
                  onClick={onOpenDepositModal}
                  className="px-2 py-0.5 rounded-lg bg-[#D4AF37]/20 hover:bg-[#D4AF37]/35 text-[#D4AF37] border border-[#D4AF37]/50 hover:border-[#D4AF37] text-[11px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                  title="Deposit 15 USDT to Official Protocol Wallet (+$15 Mining Balance)"
                >
                  <span className="material-symbols-outlined text-[13px]">payments</span>
                  <span>+ Deposit 15$</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          SPIKE DEX SWAP SYSTEM CONSOLE (INSIDE DASHBOARD)
         ============================================================ */}
      <div id="dashboard-swap" className="bg-gradient-to-br from-[#0c2035] via-[#0a1828] to-[#06121f] rounded-2xl p-5 md:p-7 shadow-2xl border-2 border-[#D4AF37]/50 relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#00F0FF]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1c2b3b]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#D4AF37] to-[#00F0FF] p-0.5 shadow-[0_0_20px_rgba(212,175,55,0.4)] flex items-center justify-center shrink-0">
                <div className="w-full h-full bg-[#0a0f1d] rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px] text-[#D4AF37]">swap_horiz</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl md:text-2xl font-extrabold font-headline text-white tracking-tight">
                    SPIKE DEX Swap System
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    0% TAX
                  </span>
                  <span className="hidden sm:inline px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30">
                    BEP-20
                  </span>
                </div>
                <p className="text-xs text-[#94a3b8] mt-0.5">
                  Instant non-custodial decentralized swapping with live automated market liquidity on BNB Smart Chain.
                </p>
              </div>
            </div>

            {/* Quick Action to open full swap modal if preferred */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={onOpenSwapModal}
                className="px-3.5 py-2 rounded-xl bg-[#122130] hover:bg-[#1c2b3b] text-[#00F0FF] hover:text-white border border-[#00F0FF]/40 text-xs font-headline font-semibold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                <span>Advanced Terminal</span>
              </button>
            </div>
          </div>

          {/* Swap Interactive Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left: Interactive Swap Controls (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Preset Mode Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-[#051424] rounded-xl border border-[#1c2b3b] w-fit">
                <button
                  onClick={() => {
                    setDashFromToken('SPIKE');
                    setDashToToken('USDT');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-headline font-semibold transition-all ${
                    dashFromToken === 'SPIKE' && dashToToken === 'USDT'
                      ? 'bg-gradient-to-r from-[#D4AF37] to-[#ffe088] text-[#0A0F1D] font-bold shadow-sm'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  Sell SPIKE
                </button>
                <button
                  onClick={() => {
                    setDashFromToken('USDT');
                    setDashToToken('SPIKE');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-headline font-semibold transition-all ${
                    dashFromToken === 'USDT' && dashToToken === 'SPIKE'
                      ? 'bg-gradient-to-r from-[#00F0FF] to-[#7df4ff] text-[#0A0F1D] font-bold shadow-sm'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  Buy SPIKE
                </button>
                <button
                  onClick={() => {
                    setDashFromToken('BNB');
                    setDashToToken('SPIKE');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-headline font-semibold transition-all ${
                    dashFromToken === 'BNB' && dashToToken === 'SPIKE'
                      ? 'bg-gradient-to-r from-[#D4AF37] to-[#00F0FF] text-[#0A0F1D] font-bold shadow-sm'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  BNB ➔ SPIKE
                </button>
              </div>

              {/* Pay Input Box */}
              <div className="p-4 rounded-2xl bg-[#051424] border border-[#1c2b3b] hover:border-[#D4AF37]/50 transition-colors space-y-2">
                <div className="flex items-center justify-between text-xs text-[#94a3b8]">
                  <span className="font-mono font-semibold uppercase tracking-wider">You Pay</span>
                  <span className="font-mono">
                    Balance:{' '}
                    <strong className="text-white">
                      {currentFrom.balance.toFixed(currentFrom.symbol === 'BNB' ? 4 : 2)} {currentFrom.symbol}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={dashFromAmount}
                    onChange={(e) => setDashFromAmount(e.target.value)}
                    placeholder="0.0"
                    min="0"
                    className="w-full bg-transparent text-2xl sm:text-3xl font-extrabold font-mono text-white focus:outline-none placeholder-[#94a3b8]/40"
                  />

                  {/* Token selector badge */}
                  <div className="shrink-0 flex items-center gap-2 bg-[#0c1d2e] border border-[#1c2b3b] px-3.5 py-1.5 rounded-xl">
                    {currentFrom.isSpike ? (
                      <img
                        src={SPIKE_LOGO_URL}
                        alt="SPIKE"
                        onError={(e) => { e.currentTarget.src = '/spike_logo.png'; }}
                        className="w-6 h-6 object-contain"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-[20px] text-[#00F0FF]">
                        {currentFrom.icon}
                      </span>
                    )}
                    <span className="font-headline font-bold text-sm text-white">{currentFrom.symbol}</span>
                  </div>
                </div>

                {/* Percentage Shortcuts */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-[#94a3b8] font-mono">
                    ≈ ${(numFromAmount * currentFrom.rate).toFixed(2)} USD
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[0.25, 0.5, 0.75, 1.0].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => {
                          const val = (currentFrom.balance * pct).toFixed(currentFrom.symbol === 'BNB' ? 4 : 2);
                          setDashFromAmount(val);
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0c1d2e] hover:bg-[#1c2b3b] text-[#94a3b8] hover:text-[#00F0FF] border border-[#1c2b3b] transition-colors"
                      >
                        {pct * 100}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Flip Direction Button */}
              <div className="flex justify-center -my-2 relative z-10">
                <button
                  onClick={handleFlipDashTokens}
                  className="w-9 h-9 rounded-xl bg-[#0c1d2e] border border-[#D4AF37]/60 text-[#D4AF37] hover:text-[#00F0FF] hover:border-[#00F0FF] hover:rotate-180 transition-all duration-300 shadow-md flex items-center justify-center active:scale-95"
                  title="Switch Token Direction"
                >
                  <span className="material-symbols-outlined text-[18px]">swap_vert</span>
                </button>
              </div>

              {/* Receive Output Box */}
              <div className="p-4 rounded-2xl bg-[#051424] border border-[#1c2b3b] hover:border-[#00F0FF]/50 transition-colors space-y-2">
                <div className="flex items-center justify-between text-xs text-[#94a3b8]">
                  <span className="font-mono font-semibold uppercase tracking-wider">You Receive (Estimated)</span>
                  <span className="font-mono">
                    Balance:{' '}
                    <strong className="text-white">
                      {currentTo.balance.toFixed(currentTo.symbol === 'BNB' ? 4 : 2)} {currentTo.symbol}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    readOnly
                    value={calculatedToAmount.toFixed(currentTo.symbol === 'BNB' ? 4 : 2)}
                    className="w-full bg-transparent text-2xl sm:text-3xl font-extrabold font-mono text-[#00F0FF] focus:outline-none"
                  />

                  {/* Token selector badge */}
                  <div className="shrink-0 flex items-center gap-2 bg-[#0c1d2e] border border-[#1c2b3b] px-3.5 py-1.5 rounded-xl">
                    {currentTo.isSpike ? (
                      <img
                        src={SPIKE_LOGO_URL}
                        alt="SPIKE"
                        onError={(e) => { e.currentTarget.src = '/spike_logo.png'; }}
                        className="w-6 h-6 object-contain"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-[20px] text-emerald-400">
                        {currentTo.icon}
                      </span>
                    )}
                    <span className="font-headline font-bold text-sm text-white">{currentTo.symbol}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-[#94a3b8] font-mono">
                    ≈ ${(calculatedToAmount * currentTo.rate).toFixed(2)} USD
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                    <span className="material-symbols-outlined text-[13px]">check_circle</span>
                    0% Transfer Fee
                  </span>
                </div>
              </div>

              {/* Swap Trigger Button */}
              {numFromAmount > currentFrom.balance ? (
                <button
                  disabled
                  className="w-full py-3.5 rounded-xl bg-[#1c2b3b] text-[#94a3b8] font-headline font-bold text-sm cursor-not-allowed border border-[#1c2b3b]"
                >
                  Insufficient {currentFrom.symbol} Balance
                </button>
              ) : numFromAmount <= 0 ? (
                <button
                  disabled
                  className="w-full py-3.5 rounded-xl bg-[#1c2b3b] text-[#94a3b8] font-headline font-bold text-sm cursor-not-allowed border border-[#1c2b3b]"
                >
                  Enter an Amount to Swap
                </button>
              ) : (
                <button
                  onClick={handleExecuteDashSwap}
                  disabled={dashIsSwapping}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#ffe088] to-[#00F0FF] text-[#0A0F1D] font-headline font-extrabold text-sm shadow-[0_0_24px_rgba(212,175,55,0.4)] hover:shadow-[0_0_32px_rgba(212,175,55,0.6)] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-75"
                >
                  {dashIsSwapping ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#0A0F1D] border-t-transparent rounded-full animate-spin" />
                      <span>Executing Swap on BNB Smart Chain...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">swap_horiz</span>
                      <span>Execute Instant Swap ({currentFrom.symbol} ➔ {currentTo.symbol})</span>
                    </>
                  )}
                </button>
              )}

              {/* Success Alert */}
              {dashSwapSuccessTx && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono space-y-1 animate-fade-in">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>Swap Executed Successfully!</span>
                  </div>
                  <div className="text-[10px] text-[#94a3b8] truncate">
                    Tx Hash: <span className="text-[#00F0FF]">{dashSwapSuccessTx}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Pool Metrics & Routing Transparency (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 rounded-xl bg-[#051424] border border-[#1c2b3b] space-y-3">
                <div className="text-xs font-mono uppercase tracking-wider text-[#94a3b8] font-bold">
                  Order Routing &amp; Liquidity
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center text-[#94a3b8]">
                    <span>Exchange Rate:</span>
                    <span className="text-white font-bold">
                      1 {currentFrom.symbol} ≈ {dashRate.toFixed(4)} {currentTo.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[#94a3b8]">
                    <span>Router:</span>
                    <span className="text-[#00F0FF] font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">alt_route</span>
                      PancakeSwap V3 (BSC)
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[#94a3b8]">
                    <span>Protocol Fee:</span>
                    <span className="text-emerald-400 font-bold">0.00% (Zero Tax)</span>
                  </div>
                  <div className="flex justify-between items-center text-[#94a3b8]">
                    <span>Network Gas:</span>
                    <span className="text-white font-semibold">≈ 0.00045 BNB (~$0.28)</span>
                  </div>
                  <div className="flex justify-between items-center text-[#94a3b8]">
                    <span>Slippage:</span>
                    <span className="text-white font-semibold">0.5% (Auto)</span>
                  </div>
                </div>
              </div>

              {/* Liquidity Pool Health */}
              <div className="p-4 rounded-xl bg-[#051424] border border-[#1c2b3b] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[#94a3b8] uppercase font-bold">Liquidity Pool Health</span>
                  <span className="font-mono text-emerald-400 font-bold">Optimal (99.8%)</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-[#0c1d2e] border border-[#1c2b3b]">
                    <div className="text-[10px] text-[#94a3b8]">24h Volume</div>
                    <div className="text-sm font-bold text-white mt-0.5">$482,910</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0c1d2e] border border-[#1c2b3b]">
                    <div className="text-[10px] text-[#94a3b8]">Total Locked</div>
                    <div className="text-sm font-bold text-[#00F0FF] mt-0.5">$3,420,000</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Section: Live Performance Chart (2 cols) & Pool Metrics (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Container (2 Cols) */}
        <div className="lg:col-span-2 bg-[#122130] rounded-xl p-5 md:p-6 flex flex-col justify-between shadow-md border border-[#1c2b3b]/60">
          {/* Header Bar with DexScreener Link & Mode Switchers */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-[#1c2b3b]/80">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#8247E5]/20 text-[#a87ffb] border border-[#8247E5]/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8247E5]"></span>
                  Polygon
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1c2b3b] text-white border border-[#1c2b3b]">
                  0rigin LGNS / WPOL
                </span>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>LIVE</span>
                  <span className="tabular-nums font-semibold">${currentPrice.toFixed(7)}</span>
                  <span className="text-[9px] text-emerald-300 font-normal">({lastTickDirection === 'up' ? '▲' : '▼'} +{priceChange24h}%)</span>
                </div>
              </div>

              <h2 className="text-lg md:text-xl font-bold font-headline text-white tracking-tight flex items-center gap-2">
                <span>DexScreener Live Terminal</span>
              </h2>
            </div>

            {/* Actions: Direct DexScreener Link & Tab Switchers */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              {/* Direct DexScreener External Link */}
              <a
                href={DEX_PAIR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 border border-[#00F0FF]/40 text-[#00F0FF] text-xs font-headline font-bold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(0,240,255,0.25)] hover:scale-102"
                title="Open DexScreener Pair in New Window"
              >
                <span>DexScreener</span>
                <span className="material-symbols-outlined text-[15px]">open_in_new</span>
              </a>

              {/* Chart Mode Toggle */}
              <div className="flex items-center gap-1 bg-[#1c2b3b] p-1 rounded-xl">
                <button
                  onClick={() => setChartMode('animated-stream')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-headline font-semibold tracking-wide transition-all flex items-center gap-1 ${
                    chartMode === 'animated-stream'
                      ? 'bg-[#00F0FF] text-[#0A0F1D] shadow-[0_0_12px_rgba(0,240,255,0.35)] font-bold'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                  title="Live Animated Candle & Waveform Stream"
                >
                  <span className="material-symbols-outlined text-[14px]">show_chart</span>
                  <span>Live Stream</span>
                </button>

                <button
                  onClick={() => setChartMode('dex-embed')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-headline font-semibold tracking-wide transition-all flex items-center gap-1 ${
                    chartMode === 'dex-embed'
                      ? 'bg-[#00F0FF] text-[#0A0F1D] shadow-[0_0_12px_rgba(0,240,255,0.35)] font-bold'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                  title="Direct DexScreener Interactive Iframe"
                >
                  <span className="material-symbols-outlined text-[14px]">candlestick_chart</span>
                  <span>Dex Embed</span>
                </button>

                <button
                  onClick={() => setChartMode('hashrate')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-headline font-semibold tracking-wide transition-all flex items-center gap-1 ${
                    chartMode === 'hashrate'
                      ? 'bg-[#00F0FF] text-[#0A0F1D] shadow-[0_0_12px_rgba(0,240,255,0.35)] font-bold'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                  title="BSC Hashrate Telemetry Wave"
                >
                  <span className="material-symbols-outlined text-[14px]">speed</span>
                  <span>Hashrate</span>
                </button>
              </div>
            </div>
          </div>

          {/* ============================================================
              VIEW 1: LIVE ANIMATED CHART WITH DYNAMIC TICKS & BEACON
             ============================================================ */}
          {chartMode === 'animated-stream' && (
            <div className="w-full flex flex-col justify-between relative py-1 space-y-3">
              {/* MEGA LIVE PRICE & HYPE BANNER */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#0d1f30] via-[#091a2a] to-[#071524] border border-[#00F0FF]/40 shadow-[0_0_20px_rgba(0,240,255,0.15)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-emerald-400">
                      LIVE DEX PRICE (POLYGON)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      84.5% BUY DOMINANCE
                    </span>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-2.5">
                    <span className="text-3xl sm:text-4xl font-extrabold font-headline text-white tracking-tight tabular-nums drop-shadow-[0_0_15px_rgba(0,240,255,0.4)]">
                      ${currentPrice.toFixed(7)}
                    </span>
                    <span className="text-xs sm:text-sm font-headline font-bold text-emerald-400 flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[16px]">trending_up</span>
                      <span>+{priceChange24h}% (Strong Buy Pressure)</span>
                    </span>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono">
                  <div className="px-3 py-1.5 rounded-xl bg-[#051424] border border-[#1c2b3b]">
                    <div className="text-[10px] text-[#94a3b8] uppercase">24h High</div>
                    <div className="text-white font-bold tabular-nums">${svgMetrics.maxP.toFixed(7)}</div>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-[#051424] border border-[#1c2b3b]">
                    <div className="text-[10px] text-[#94a3b8] uppercase">24h Low</div>
                    <div className="text-white font-bold tabular-nums">${svgMetrics.minP.toFixed(7)}</div>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-[#051424] border border-[#1c2b3b]">
                    <div className="text-[10px] text-[#94a3b8] uppercase">Pool Liquidity</div>
                    <div className="text-[#D4AF37] font-bold">$261.7K</div>
                  </div>

                  <a
                    href={DEX_PAIR_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-[#00F0FF] text-[#051424] font-headline font-extrabold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:brightness-110 transition-all ml-auto md:ml-0"
                  >
                    <span>Buy LGNS</span>
                    <span className="material-symbols-outlined text-[15px]">shopping_cart</span>
                  </a>
                </div>
              </div>

              {/* BUY VS SELL PRESSURE HYPE METER */}
              <div className="p-3 rounded-xl bg-[#081321] border border-[#1c2b3b] space-y-1.5">
                <div className="flex justify-between items-center text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>BUY PRESSURE: {buyPressure.toFixed(1)}% (EXTREME BULLISH)</span>
                    <span className="text-[10px] text-[#94a3b8]">({totalBuysCount} Buys)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-red-400 font-bold">
                    <span>SELL PRESSURE: {(100 - buyPressure).toFixed(1)}%</span>
                    <span className="text-[10px] text-[#94a3b8]">({totalSellsCount} Sells)</span>
                  </div>
                </div>

                {/* Pressure Progress Bar */}
                <div className="w-full h-2.5 bg-red-500/30 rounded-full overflow-hidden flex shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-[#00F0FF] to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.6)] transition-all duration-500 rounded-full"
                    style={{ width: `${buyPressure}%` }}
                  />
                </div>
              </div>

              {/* REAL-TIME LIVE BUY & SELL TRANSACTIONS FEED (85% BUY SIDE) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#94a3b8] px-1">
                  <span className="flex items-center gap-1 text-white font-bold">
                    <span className="material-symbols-outlined text-emerald-400 text-[14px]">swap_horizontal_circle</span>
                    <span>Real-Time Swap Orders</span>
                  </span>
                  <span className="text-emerald-400 font-semibold animate-pulse">● Continuous Inflow</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {liveTxns.map((tx) => {
                    const isBuy = tx.type === 'buy';
                    return (
                      <div
                        key={tx.id}
                        className={`p-2 rounded-xl text-left border text-xs font-mono transition-all transform animate-[fadeIn_0.3s_ease] ${
                          isBuy
                            ? tx.isWhale
                              ? 'bg-emerald-950/40 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                              : 'bg-[#0d1f2d] border-emerald-500/40'
                            : 'bg-red-950/20 border-red-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] mb-0.5">
                          <span
                            className={`font-bold px-1.5 py-0.2 rounded ${
                              isBuy
                                ? tx.isWhale
                                  ? 'bg-emerald-500 text-black font-extrabold'
                                  : 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {isBuy ? (tx.isWhale ? '🐋 WHALE BUY' : '🟢 BUY') : '🔴 SELL'}
                          </span>
                          <span className="text-[#94a3b8] text-[9px]">{tx.timeAgo}</span>
                        </div>
                        <div className="font-bold text-white text-[11px] tabular-nums mt-0.5">
                          {isBuy ? '+' : '-'}{tx.amountLgns.toLocaleString()} LGNS
                        </div>
                        <div className="text-[10px] text-[#D4AF37] font-semibold tabular-nums">
                          ${tx.amountUsd.toFixed(2)} USD
                        </div>
                        <div className="text-[9px] text-[#94a3b8] mt-0.5 truncate">
                          {tx.wallet}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* TRADINGVIEW LIVE CANDLESTICK TERMINAL (Exact replica of user screenshot) */}
              <TradingViewChart
                pairName="LGNS/WPOL (Market Cap)"
                dexUrl={DEX_PAIR_URL}
                onBuyClick={() => onCopyText('0x3C12eCa24eBafd6795e731753879d5B629Dd2741')}
              />

              {/* Bottom Quick Bar with Direct DexScreener Details */}
              <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-[#1c2b3b]/70 text-xs font-mono text-[#94a3b8]">
                <div className="flex items-center gap-2">
                  <span className="text-[#94a3b8]">Pair Address:</span>
                  <button
                    onClick={() => onCopyText('0x3C12eCa24eBafd6795e731753879d5B629Dd2741')}
                    className="text-[#00F0FF] hover:underline flex items-center gap-1 font-semibold"
                    title="Click to copy contract"
                  >
                    <span>0x3C12...2741</span>
                    <span className="material-symbols-outlined text-[13px]">content_copy</span>
                  </button>
                </div>

                <a
                  href={DEX_PAIR_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#00F0FF] hover:underline flex items-center gap-1 font-headline font-bold"
                >
                  <span>Open DexScreener Full Terminal &amp; Trades</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </a>
              </div>
            </div>
          )}

          {/* ============================================================
              VIEW 2: DEXSCREENER INTERACTIVE IFRAME EMBED
             ============================================================ */}
          {chartMode === 'dex-embed' && (
            <div className="w-full flex flex-col justify-between relative">
              <div className="w-full h-[400px] sm:h-[450px] rounded-xl overflow-hidden border border-[#1c2b3b] bg-[#051424] relative shadow-inner">
                <iframe
                  src={DEX_EMBED_URL}
                  title="DexScreener Live Polygon Chart"
                  className="w-full h-full border-0"
                  allow="clipboard-write"
                  loading="lazy"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-[#1c2b3b]/70 text-xs font-mono text-[#94a3b8]">
                <span>Uniswap v3 · Polygon Network · Verified Contract</span>
                <a
                  href={DEX_PAIR_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00F0FF] hover:underline flex items-center gap-1 font-headline font-semibold"
                >
                  <span>View Full Chart &amp; Orders on DexScreener</span>
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </a>
              </div>
            </div>
          )}

          {/* ============================================================
              VIEW 3: HASHRATE TELEMETRY (Original)
             ============================================================ */}
          {chartMode === 'hashrate' && (
            <div className="w-full h-56 md:h-64 flex flex-col justify-end relative py-2">
              <div className="flex justify-between items-center text-xs font-mono text-[#94a3b8] mb-2">
                <span>Active Global Hashrate Output</span>
                <div className="flex items-center gap-1">
                  {(['24H', '7D', '30D'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeframe(t)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        timeframe === t ? 'bg-[#00F0FF] text-[#0A0F1D]' : 'hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                <div className="w-full h-[1px] bg-[#46464c]"></div>
                <div className="w-full h-[1px] bg-[#46464c]"></div>
                <div className="w-full h-[1px] bg-[#46464c]"></div>
                <div className="w-full h-[1px] bg-[#46464c]"></div>
              </div>

              {/* SVG Wave */}
              <div className="relative w-full h-44 overflow-visible">
                <svg
                  className="w-full h-full overflow-visible"
                  preserveAspectRatio="none"
                  viewBox="0 0 800 200"
                >
                  <defs>
                    <linearGradient id="chartGradientLive" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#00F0FF" stopOpacity="0.0" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="glow" />
                      <feComposite in="SourceGraphic" in2="glow" operator="over" />
                    </filter>
                  </defs>

                  {/* Shaded Area */}
                  <path d={currentChart.fillD} fill="url(#chartGradientLive)" />

                  {/* Main Curve */}
                  <path
                    d={currentChart.pathD}
                    fill="none"
                    stroke="#00F0FF"
                    strokeLinecap="round"
                    strokeWidth="3.5"
                    filter="url(#glow)"
                  />

                  {/* Interactive Points */}
                  {currentChart.points.map((pt, idx) => {
                    const isLast = idx === currentChart.points.length - 1;
                    return (
                      <g key={idx}>
                        <circle
                          cx={pt.cx}
                          cy={pt.cy}
                          r={isLast ? 6 : 5}
                          fill={isLast ? '#00F0FF' : '#0A0F1D'}
                          stroke={isLast ? '#FFFFFF' : '#00F0FF'}
                          strokeWidth={isLast ? 2.5 : 3}
                          className="cursor-pointer transition-transform hover:scale-150"
                          onMouseEnter={() =>
                            setHoveredDataPoint({
                              x: pt.cx,
                              y: pt.cy,
                              hashrate: pt.rate,
                              time: pt.time,
                            })
                          }
                          onMouseLeave={() => setHoveredDataPoint(null)}
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Hover Tooltip */}
                {hoveredDataPoint && (
                  <div
                    className="absolute pointer-events-none bg-[#0a0f1d] border border-[#00F0FF] rounded-lg px-2.5 py-1.5 shadow-xl text-xs font-mono transform -translate-x-1/2 -translate-y-full mb-2 z-20"
                    style={{
                      left: `${(hoveredDataPoint.x / 800) * 100}%`,
                      top: `${(hoveredDataPoint.y / 200) * 100}%`,
                    }}
                  >
                    <div className="text-[#00F0FF] font-bold tabular-nums">{hoveredDataPoint.hashrate}</div>
                    <div className="text-[10px] text-[#94a3b8]">{hoveredDataPoint.time}</div>
                  </div>
                )}
              </div>

              {/* Time labels matching Image 2 */}
              <div className="flex justify-between text-xs text-[#94a3b8] mt-4 font-mono">
                {currentChart.timeLabels.map((lbl, idx) => (
                  <span
                    key={idx}
                    className={idx === currentChart.timeLabels.length - 1 ? 'text-[#00F0FF] font-bold' : ''}
                  >
                    {lbl}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats / Pool Info (1 Col) */}
        <div className="bg-[#122130] rounded-xl p-5 md:p-6 flex flex-col justify-between shadow-md border border-[#1c2b3b]/60">
          <div>
            <h2 className="text-lg md:text-xl font-bold font-headline text-white mb-1 tracking-tight">
              Pool Metrics
            </h2>
            <p className="text-xs text-[#94a3b8] mb-5">BSC Smart Contract Overview</p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#1c2b3b] border border-[#1c2b3b]/60">
                <span className="text-[#94a3b8] text-xs font-medium">Network Difficulty</span>
                <span className="text-white font-headline font-semibold text-sm tabular-nums">
                  48.25 P
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#1c2b3b] border border-[#1c2b3b]/60">
                <span className="text-[#94a3b8] text-xs font-medium">Current Block Reward</span>
                <span className="text-[#D4AF37] font-headline font-semibold text-sm tabular-nums">
                  3.20 USDT
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#1c2b3b] border border-[#1c2b3b]/60">
                <span className="text-[#94a3b8] text-xs font-medium">Gas Fee Estimate</span>
                <span className="text-white font-mono font-medium text-xs tabular-nums">
                  0.00042 BNB
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#1c2b3b] border border-[#1c2b3b]/60">
                <span className="text-[#94a3b8] text-xs font-medium">Contract Uptime</span>
                <span className="text-[#00F0FF] font-headline font-semibold text-sm tabular-nums">
                  99.98%
                </span>
              </div>
            </div>
          </div>

          {/* Audited Contract Card */}
          <div className="mt-5 pt-3">
            <div
              onClick={onOpenAuditModal}
              className="p-3.5 rounded-xl bg-[#010f1e] hover:bg-[#0a0f1d] border border-[#1c2b3b] flex items-center justify-between cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#D4AF37] text-[24px]">
                  verified_user
                </span>
                <div>
                  <div className="text-xs font-bold font-headline text-white group-hover:text-[#00F0FF] transition-colors tracking-wide">
                    Audited Contract
                  </div>
                  <div className="text-[11px] text-[#94a3b8] font-mono">CertiK Secure Level 2</div>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#94a3b8] text-sm group-hover:text-[#00F0FF] group-hover:translate-x-0.5 transition-all">
                open_in_new
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Mining Nodes Status Table matching Image 2 */}
      <div className="bg-[#122130] rounded-xl p-5 md:p-6 shadow-md border border-[#1c2b3b]/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg md:text-xl font-bold font-headline text-white tracking-tight">
              Active Mining Nodes
            </h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Manage your rig allocations and real-time operational status
            </p>
          </div>
          <button
            onClick={onOpenDeployModal}
            className="bg-[#1c2b3b] hover:bg-[#273647] text-white font-headline text-xs px-4 py-2.5 rounded-xl border border-[#00F0FF]/30 transition-all flex items-center gap-2 self-start sm:self-auto shadow-sm font-semibold tracking-wide"
          >
            <span className="material-symbols-outlined text-[18px] text-[#00F0FF]">add</span>
            <span>Deploy New Node</span>
          </button>
        </div>

        {nodes.length === 0 ? (
          <div className="py-12 px-4 rounded-xl bg-[#0a0f1d] border border-[#1c2b3b] text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#00F0FF]/10 text-[#00F0FF] flex items-center justify-center border border-[#00F0FF]/25 shadow-[0_0_15px_rgba(0,240,255,0.15)]">
              <span className="material-symbols-outlined text-[30px]">dns</span>
            </div>
            <div className="max-w-md">
              <h3 className="text-base font-bold font-headline text-white">No Active Mining Nodes</h3>
              <p className="text-xs text-[#94a3b8] mt-1 leading-relaxed">
                This wallet has 0 active rigs online. Deploy your first node to connect to the BSC validator pool and start generating daily SPIKE token &amp; USDT yields.
              </p>
            </div>
            <button
              onClick={onOpenDeployModal}
              className="mt-2 px-5 py-2.5 rounded-xl bg-[#00F0FF] hover:bg-[#7df4ff] text-[#0A0F1D] font-headline font-bold text-xs flex items-center gap-2 shadow-[0_0_16px_rgba(0,240,255,0.3)] transition-all hover:scale-105 active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Deploy First Node (from 15 USDT)</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[#94a3b8] font-mono text-[10px] uppercase tracking-[0.14em] border-b border-[#1c2b3b]">
                  <th className="py-3 px-4 font-semibold">Node ID &amp; Name</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Hashrate</th>
                  <th className="py-3 px-4 font-semibold">Temperature</th>
                  <th className="py-3 px-4 font-semibold">Share Acceptance</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c2b3b]/40 text-sm">
                {nodes.map((node) => {
                  const isMining = node.status === 'mining';
                  return (
                    <tr
                      key={node.id}
                      className="hover:bg-[#1c2b3b]/30 transition-colors group"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isMining
                                ? 'bg-[#00F0FF]/10 text-[#00F0FF]'
                                : 'bg-[#1c2b3b] text-[#94a3b8]'
                            }`}
                          >
                            <span
                              className="material-symbols-outlined text-[18px]"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              dns
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-white font-headline text-xs sm:text-sm tracking-wide">
                              {node.name}
                            </div>
                            <div className="text-[11px] text-[#94a3b8] font-mono">
                              {node.region}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        {isMining ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-pulse"></span>
                            Mining
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#1c2b3b] text-[#94a3b8]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#909096]"></span>
                            Idle / Standby
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 font-headline text-sm text-white font-bold tabular-nums">
                        {node.hashrate.toFixed(2)} TH/s
                      </td>
                      <td className="py-4 px-4 text-[#94a3b8] text-xs font-mono">
                        {node.temperature}°C{' '}
                        <span
                          className={`text-[11px] font-sans ${
                            isMining ? 'text-[#7df4ff] font-medium' : 'text-[#94a3b8]'
                          }`}
                        >
                          ({isMining ? 'Optimal' : 'Idle'})
                        </span>
                      </td>
                      <td className="py-4 px-4 text-white text-xs font-mono tabular-nums">
                        {node.shareAcceptance}%
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {isMining ? (
                            <>
                              <button
                                onClick={() => onRestartNode(node.id)}
                                className="p-2 rounded-lg bg-[#1c2b3b] hover:bg-[#273647] text-[#D4AF37] transition-colors"
                                title="Restart Node"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                 restart_alt
                                </span>
                              </button>
                              <button
                                onClick={() => onStopNode(node.id)}
                                className="p-2 rounded-lg bg-[#1c2b3b] hover:bg-red-500/20 text-red-400 transition-colors"
                                title="Stop Node"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  stop
                                </span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => onStartNode(node.id)}
                              className="p-2 rounded-lg bg-[#00F0FF] text-[#0A0F1D] font-bold hover:bg-[#7df4ff] transition-colors"
                              title="Start Node"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                play_arrow
                              </span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Reward Claim History Table matching Image 2 */}
      <div className="bg-[#122130] rounded-xl p-5 md:p-6 shadow-md border border-[#1c2b3b]/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg md:text-xl font-bold font-headline text-white tracking-tight">
              Reward Claim History
            </h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Recent USDT payouts transferred directly to your BEP-20 address
            </p>
          </div>
          <a
            href="https://bscscan.com"
            target="_blank"
            rel="noreferrer"
            className="text-[#00F0FF] hover:underline text-xs font-headline font-semibold flex items-center gap-1 self-start sm:self-auto"
          >
            <span>View on BscScan</span>
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          </a>
        </div>

        {rewards.length === 0 ? (
          <div className="py-10 px-4 rounded-xl bg-[#0a0f1d] border border-[#1c2b3b] text-center flex flex-col items-center justify-center space-y-2.5">
            <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center border border-[#D4AF37]/25 shadow-sm">
              <span className="material-symbols-outlined text-[26px]">receipt_long</span>
            </div>
            <div className="max-w-md">
              <h3 className="text-sm font-bold font-headline text-white">No Payout Records Yet</h3>
              <p className="text-xs text-[#94a3b8] mt-0.5 leading-relaxed">
                Daily mining payouts and activation transactions will be automatically recorded here once rigs are deployed.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[#94a3b8] font-mono text-[10px] uppercase tracking-[0.14em] border-b border-[#1c2b3b]">
                  <th className="py-3 px-4 font-semibold">Transaction Hash</th>
                  <th className="py-3 px-4 font-semibold">Reward Source</th>
                  <th className="py-3 px-4 font-semibold">Amount</th>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c2b3b]/40 text-sm">
                {rewards.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-[#1c2b3b]/30 transition-colors"
                  >
                    <td className="py-4 px-4 font-mono text-[#00F0FF] text-xs">
                      <button
                        onClick={() => onCopyText(tx.txHash)}
                        className="hover:underline flex items-center gap-1.5"
                        title="Copy TX Hash"
                      >
                        <span className="tabular-nums">{tx.txHash}</span>
                        <span className="material-symbols-outlined text-[14px] text-[#94a3b8] hover:text-[#00F0FF]">
                          content_copy
                        </span>
                      </button>
                    </td>
                    <td className="py-4 px-4 text-xs sm:text-sm text-white font-medium">
                      {tx.rewardSource}
                    </td>
                    <td className="py-4 px-4 font-headline text-sm text-[#D4AF37] font-bold tabular-nums">
                      {tx.amount > 0 ? `+${tx.amount.toFixed(2)}` : tx.amount.toFixed(2)} {tx.currency}
                    </td>
                    <td className="py-4 px-4 text-[#94a3b8] text-xs font-mono">
                      {tx.timestamp}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#7df4ff] bg-[#7df4ff]/10 px-2 py-0.5 rounded border border-[#7df4ff]/20">
                        <span className="material-symbols-outlined text-[14px]">
                          check_circle
                        </span>
                        Confirmed
                      </span>
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
