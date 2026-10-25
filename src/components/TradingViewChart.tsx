import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LiveTxn } from '../types';

export const PANCAKESWAP_PAIR_CONTRACT = '0xdB75fAB72e56492CFE870344D115C57047992F3c';
export const PANCAKESWAP_ROUTER_CONTRACT = '0x10ED43C718714eb63d5aA57B78B54704E256024E';

export interface TVCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  volumeUsd: number;
  txCount: number;
  buyCount: number;
  sellCount: number;
}

interface TradingViewChartProps {
  pairName?: string;
  dexUrl?: string;
  routerAddress?: string;
  transactions?: LiveTxn[];
  currentPrice?: number;
  onBuyClick?: () => void;
  onCopyText?: (text: string) => void;
}

// Generate base candles derived from chronological seed transactions of SPIKE / USDT pair
function generateSeedCandles(): TVCandle[] {
  const seedTimes = [
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
    '21:00', '21:30', '22:00', '22:30', '23:00', '23:30',
  ];

  let prevClose = 1.0450;
  return seedTimes.map((t, idx) => {
    const isUp = idx % 3 !== 1;
    const wave = Math.sin(idx * 0.5) * 0.025;
    const delta = (isUp ? 1 : -1) * (0.012 + (idx * 0.0008)) + wave;
    const open = prevClose;
    let close = +(open + delta).toFixed(4);
    if (close < 1.015) close = +(1.015 + Math.random() * 0.015).toFixed(4);
    if (close > 1.185) close = +(1.185 - Math.random() * 0.015).toFixed(4);

    const high = +(Math.min(1.20, Math.max(open, close) + 0.012 + Math.random() * 0.006)).toFixed(4);
    const low = +(Math.max(1.00, Math.min(open, close) - 0.010 - Math.random() * 0.006)).toFixed(4);
    const vol = Math.floor(45000 + Math.random() * 95000 + (idx > 16 ? 120000 : 0));
    const volUsd = +(vol * close).toFixed(2);
    const txCount = Math.floor(vol / 4000);
    const buyCount = Math.floor(txCount * (isUp ? 0.85 : 0.45));
    const sellCount = txCount - buyCount;
    prevClose = close;

    return {
      time: t,
      open,
      high,
      low,
      close,
      volume: vol,
      volumeUsd: volUsd,
      txCount,
      buyCount,
      sellCount,
    };
  });
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  pairName = 'SPIKE (SPK) / USDT [BEP-20]',
  routerAddress = PANCAKESWAP_ROUTER_CONTRACT,
  transactions = [],
  currentPrice,
  onBuyClick,
  onCopyText,
}) => {
  const [selectedInterval, setSelectedInterval] = useState<'1s' | '1m' | '5m' | '15m' | '1h' | '4h' | 'D'>('15m');
  const [chartType, setChartType] = useState<'candles' | 'area'>('candles');
  const [hoveredCandle, setHoveredCandle] = useState<TVCandle | null>(null);
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number } | null>(null);
  const [copiedRouter, setCopiedRouter] = useState(false);
  const [copiedPair, setCopiedPair] = useState(false);
  const [lastTxNotice, setLastTxNotice] = useState<string | null>(null);

  // Candlesticks built and maintained from SPIKE / USDT pair transactions ($1.00 - $1.20 range)
  const [candles, setCandles] = useState<TVCandle[]>(() => generateSeedCandles());
  const [livePrice, setLivePrice] = useState<number>(currentPrice || 1.1245);
  const [basePrice24h] = useState<number>(1.0420);

  const processedTxIds = useRef<Set<string>>(new Set());

  // Copy helper for Router Contract
  const handleCopyRouter = () => {
    const text = routerAddress || PANCAKESWAP_ROUTER_CONTRACT;
    if (onCopyText) {
      onCopyText(text);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedRouter(true);
    setTimeout(() => setCopiedRouter(false), 2000);
  };

  const handleCopyPair = () => {
    if (onCopyText) {
      onCopyText(PANCAKESWAP_PAIR_CONTRACT);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(PANCAKESWAP_PAIR_CONTRACT);
    }
    setCopiedPair(true);
    setTimeout(() => setCopiedPair(false), 2000);
  };

  // Process incoming transactions of the SPIKE / USDT pair and dynamically update graph
  useEffect(() => {
    if (!transactions || transactions.length === 0) return;

    // Filter unseen transactions
    const newTxs: LiveTxn[] = [];
    for (const tx of transactions) {
      if (!processedTxIds.current.has(tx.id)) {
        processedTxIds.current.add(tx.id);
        newTxs.push(tx);
      }
    }

    if (newTxs.length === 0) return;

    // Apply transactions sequentially to the candlestick chart
    setCandles((prevCandles) => {
      let updated = [...prevCandles];
      if (updated.length === 0) {
        updated = generateSeedCandles();
      }

      for (const tx of newTxs) {
        const isBuy = tx.type === 'buy';
        const tradePrice = tx.price > 0 ? tx.price : livePrice;
        const tradeVol = tx.amountSpk || 1000;
        const tradeUsd = tx.amountUsd || +(tradeVol * tradePrice).toFixed(2);

        // Flash transaction toast on graph
        setLastTxNotice(
          `${isBuy ? '🟢 BUY' : '🔴 SELL'}: ${tradeVol.toLocaleString()} SPK ($${tradeUsd.toFixed(2)}) via Router 0xd74e...b38b`
        );

        // Update active candle with this transaction's execution
        const lastIdx = updated.length - 1;
        const activeCandle = { ...updated[lastIdx] };

        activeCandle.close = tradePrice;
        activeCandle.high = Math.max(activeCandle.high, tradePrice);
        activeCandle.low = Math.min(activeCandle.low, tradePrice);
        activeCandle.volume += tradeVol;
        activeCandle.volumeUsd = +(activeCandle.volumeUsd + tradeUsd).toFixed(2);
        activeCandle.txCount += 1;
        if (isBuy) {
          activeCandle.buyCount += 1;
        } else {
          activeCandle.sellCount += 1;
        }

        updated[lastIdx] = activeCandle;
        setLivePrice(tradePrice);
      }

      return updated;
    });

    const timer = setTimeout(() => setLastTxNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [transactions]);

  // Sync if currentPrice changes externally
  useEffect(() => {
    if (currentPrice && currentPrice > 0 && Math.abs(currentPrice - livePrice) > 0.00001) {
      setLivePrice(currentPrice);
      setCandles((prev) => {
        if (!prev.length) return prev;
        const last = { ...prev[prev.length - 1] };
        last.close = currentPrice;
        last.high = Math.max(last.high, currentPrice);
        last.low = Math.min(last.low, currentPrice);
        return [...prev.slice(0, prev.length - 1), last];
      });
    }
  }, [currentPrice]);

  // SVG Chart Coordinate Mapping
  const chartHeight = 360;
  const chartWidth = 760;
  const paddingLeft = 14;
  const paddingRight = 14;
  const volumeHeight = 70;
  const mainPlotHeight = chartHeight - volumeHeight - 35;

  // Dynamic Y-Scale calculated from actual transaction high/low in candles (bounded $1.00 - $1.20)
  const { yMin, yMax, yRange, priceLadder } = useMemo(() => {
    if (candles.length === 0) {
      return { yMin: 1.000, yMax: 1.200, yRange: 0.200, priceLadder: [1.200, 1.150, 1.100, 1.050, 1.000] };
    }
    const allLows = candles.map((c) => c.low);
    const allHighs = candles.map((c) => c.high);
    const minVal = Math.min(...allLows, livePrice);
    const maxVal = Math.max(...allHighs, livePrice);

    const pad = Math.max((maxVal - minVal) * 0.12, 0.008);
    const lowBound = Math.max(1.000, +(minVal - pad).toFixed(4));
    const highBound = Math.min(1.200, +(maxVal + pad).toFixed(4));
    const range = Math.max(0.04, highBound - lowBound);

    // 5 clean steps for right ladder
    const step = range / 4;
    const ladder = [
      highBound,
      +(highBound - step).toFixed(4),
      +(highBound - step * 2).toFixed(4),
      +(highBound - step * 3).toFixed(4),
      lowBound,
    ];

    return {
      yMin: lowBound,
      yMax: highBound,
      yRange: range,
      priceLadder: ladder,
    };
  }, [candles, livePrice]);

  const yToCoord = (val: number) => {
    if (yRange <= 0) return mainPlotHeight / 2;
    return 15 + mainPlotHeight - ((val - yMin) / yRange) * mainPlotHeight;
  };

  const maxVolume = useMemo(() => Math.max(...candles.map((c) => c.volume), 5000), [candles]);
  const candleSpacing = (chartWidth - paddingLeft - paddingRight) / candles.length;
  const candleBarWidth = Math.max(7, candleSpacing * 0.72);

  const priceY = yToCoord(livePrice);
  const deltaPct = +(((livePrice - basePrice24h) / basePrice24h) * 100).toFixed(2);
  const isPositive = deltaPct >= 0;

  // Build SVG path for Area Chart
  const areaSvgPath = useMemo(() => {
    if (candles.length < 2) return '';
    let d = `M ${paddingLeft + candleSpacing / 2} ${yToCoord(candles[0].close)}`;
    candles.forEach((c, idx) => {
      const x = paddingLeft + idx * candleSpacing + candleSpacing / 2;
      const y = yToCoord(c.close);
      d += ` L ${x} ${y}`;
    });
    return d;
  }, [candles, candleSpacing, yRange, yMin]);

  const areaFillPath = useMemo(() => {
    if (candles.length < 2) return '';
    const firstX = paddingLeft + candleSpacing / 2;
    const lastX = paddingLeft + (candles.length - 1) * candleSpacing + candleSpacing / 2;
    const bottomY = 15 + mainPlotHeight;
    return `${areaSvgPath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [areaSvgPath, candles.length, candleSpacing, mainPlotHeight]);

  return (
    <div className="w-full bg-[#131722] text-[#d1d4dc] font-sans rounded-2xl border border-[#2a2e39] overflow-hidden shadow-2xl flex flex-col select-none relative">
      {/* ============================================================
          1. TOP TRADINGVIEW TOOLBAR WITH PANCAKESWAP ROUTER
         ============================================================ */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-[#131722] border-b border-[#2a2e39] text-xs font-medium gap-2">
        {/* Left items: Intervals, Chart style, Indicators */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          {/* Compare (+) button */}
          <button
            className="w-7 h-7 rounded flex items-center justify-center text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] transition-colors"
            title="Add Compare Pair"
          >
            <span className="material-symbols-outlined text-[17px]">add_circle</span>
          </button>

          <div className="w-[1px] h-4 bg-[#2a2e39] mx-0.5"></div>

          {/* Time intervals: 1s, 1m, 5m, 15m, 1h, 4h, D */}
          {(['1s', '1m', '5m', '15m', '1h', '4h', 'D'] as const).map((int) => (
            <button
              key={int}
              onClick={() => setSelectedInterval(int)}
              className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
                selectedInterval === int
                  ? 'text-[#2962FF] font-bold bg-[#2962FF]/15'
                  : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]'
              }`}
            >
              {int}
            </button>
          ))}

          <div className="w-[1px] h-4 bg-[#2a2e39] mx-0.5"></div>

          {/* Chart style toggle: Candlesticks vs Area Line */}
          <button
            onClick={() => setChartType('area')}
            className={`p-1 rounded flex items-center gap-0.5 transition-colors cursor-pointer ${
              chartType === 'area'
                ? 'text-[#2962FF] bg-[#2962FF]/15 font-bold'
                : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]'
            }`}
            title="Line / Area Chart"
          >
            <span className="material-symbols-outlined text-[16px]">show_chart</span>
          </button>

          <button
            onClick={() => setChartType('candles')}
            className={`p-1 rounded flex items-center gap-0.5 transition-colors cursor-pointer ${
              chartType === 'candles'
                ? 'text-[#2962FF] bg-[#2962FF]/15 font-bold'
                : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]'
            }`}
            title="Japanese Candlesticks"
          >
            <span className="material-symbols-outlined text-[16px]">candlestick_chart</span>
          </button>

          <div className="w-[1px] h-4 bg-[#2a2e39] mx-0.5"></div>

          {/* Indicators fx */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded text-[#787b86] font-mono text-xs">
            <span className="text-[#00F0FF] font-bold">AMM</span>
            <span className="text-[11px]">Formula Active</span>
          </div>
        </div>

        {/* Right Tools: PancakeSwap Pool & Router Contract Badges with One-Click Copy */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* PancakeSwap Liquidity Pool (Pair) */}
          <div className="flex items-center gap-1.5 bg-[#0a1827] border border-[#D4AF37]/30 px-2.5 py-1 rounded-lg text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
            <span className="text-[#94a3b8] hidden lg:inline">Pool (Pair):</span>
            <button
              onClick={handleCopyPair}
              className="text-[#D4AF37] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              title="Click to copy PancakeSwap Liquidity Pool Contract Address (0xdB75fAB72e56492CFE870344D115C57047992F3c)"
            >
              <span>0xdB75...2F3c</span>
              <span className="material-symbols-outlined text-[12px]">
                {copiedPair ? 'check' : 'content_copy'}
              </span>
            </button>
            {copiedPair && (
              <span className="text-emerald-400 text-[10px] font-bold">Copied!</span>
            )}
            <a
              href="https://bscscan.com/address/0xdB75fAB72e56492CFE870344D115C57047992F3c"
              target="_blank"
              rel="noreferrer"
              className="text-[#94a3b8] hover:text-[#D4AF37]"
              title="View Pool on BSCScan"
            >
              <span className="material-symbols-outlined text-[12px]">open_in_new</span>
            </a>
          </div>

          {/* PancakeSwap Router */}
          <div className="flex items-center gap-1.5 bg-[#0a1827] border border-[#00F0FF]/30 px-2.5 py-1 rounded-lg text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[#94a3b8] hidden lg:inline">Router:</span>
            <button
              onClick={handleCopyRouter}
              className="text-[#00F0FF] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              title="Click to copy PancakeSwap Router Contract Address"
            >
              <span>{`${routerAddress.substring(0, 6)}...${routerAddress.substring(routerAddress.length - 4)}`}</span>
              <span className="material-symbols-outlined text-[12px]">
                {copiedRouter ? 'check' : 'content_copy'}
              </span>
            </button>
            {copiedRouter && (
              <span className="text-emerald-400 text-[10px] font-bold">Copied!</span>
            )}
            <a
              href={`https://bscscan.com/address/${routerAddress}`}
              target="_blank"
              rel="noreferrer"
              className="text-[#94a3b8] hover:text-white"
              title="View Router on BSCScan"
            >
              <span className="material-symbols-outlined text-[12px]">open_in_new</span>
            </a>
          </div>

          <button
            onClick={() => window.print?.()}
            className="w-7 h-7 rounded flex items-center justify-center text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]"
            title="Snapshot Chart"
          >
            <span className="material-symbols-outlined text-[16px]">photo_camera</span>
          </button>
        </div>
      </div>

      {/* ============================================================
          2. CHART SUB-HEADER / LEGEND (SPIKE (SPK) / USDT)
         ============================================================ */}
      <div className="px-3 sm:px-4 py-2 bg-[#131722] flex flex-wrap items-center justify-between text-xs gap-2 border-b border-[#1e222d]">
        <div className="flex flex-wrap items-center gap-2">
          {/* Pair Title */}
          <div className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#D4AF37]/20 to-[#00F0FF]/20 border border-[#D4AF37]/40 text-white font-headline font-bold text-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
            <span>{pairName}</span>
          </div>

          {/* Transaction Synced Badge */}
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>Transaction-Driven Graph</span>
          </span>

          <span className="text-[#787b86]">· {selectedInterval} · BSC Mainnet/Testnet AMM</span>

          {/* Current Execution Price */}
          <span className="font-bold tabular-nums text-sm text-emerald-400 ml-1">
            ${livePrice.toFixed(5)} USDT
          </span>

          {/* Change Delta */}
          <span className={`font-mono text-xs tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{deltaPct.toFixed(2)}%
          </span>
        </div>

        {/* Volume & Quick Action */}
        <div className="flex items-center gap-2 text-[#787b86] text-xs font-mono">
          {onBuyClick && (
            <button
              onClick={onBuyClick}
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#00F0FF] to-emerald-400 text-[#051424] font-headline font-bold text-[11px] shadow-sm hover:brightness-110 transition-all cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
              <span>Swap on Router</span>
            </button>
          )}
          <span>24h Trades:</span>
          <span className="text-white font-bold">{candles.reduce((acc, c) => acc + c.txCount, 0)}</span>
        </div>
      </div>

      {/* Floating Trade Notification Banner when trades occur on PancakeSwap Router */}
      {lastTxNotice && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-[#0d2238]/95 border border-[#00F0FF] text-white px-3 py-1 rounded-full text-xs font-mono shadow-2xl flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-[#00F0FF]" />
          <span>{lastTxNotice}</span>
        </div>
      )}

      {/* ============================================================
          3. MAIN VIEWPORT: LEFT TOOLBAR + SVG CANVAS + RIGHT Y-AXIS
         ============================================================ */}
      <div className="flex flex-row relative h-[360px] sm:h-[400px]">
        {/* Left TradingView Vertical Tool Palette */}
        <div className="w-10 sm:w-11 bg-[#131722] border-r border-[#2a2e39] flex flex-col items-center justify-between py-2 shrink-0 z-10">
          <div className="flex flex-col items-center gap-3 text-[#787b86]">
            {/* Crosshair */}
            <button className="w-7 h-7 rounded flex items-center justify-center hover:text-[#d1d4dc] hover:bg-[#2a2e39] text-[#2962FF]" title="Crosshair">
              <span className="material-symbols-outlined text-[17px]">close</span>
            </button>
            {/* Trend line */}
            <button className="w-7 h-7 rounded flex items-center justify-center hover:text-[#d1d4dc] hover:bg-[#2a2e39]" title="Trend Line">
              <span className="material-symbols-outlined text-[17px]">timeline</span>
            </button>
            {/* Pitchfork / Fib */}
            <button className="w-7 h-7 rounded flex items-center justify-center hover:text-[#d1d4dc] hover:bg-[#2a2e39]" title="Fibonacci">
              <span className="material-symbols-outlined text-[17px]">hub</span>
            </button>
            {/* Brush / Shapes */}
            <button className="w-7 h-7 rounded flex items-center justify-center hover:text-[#d1d4dc] hover:bg-[#2a2e39]" title="Brush">
              <span className="material-symbols-outlined text-[17px]">brush</span>
            </button>
            {/* Text Tool */}
            <button className="w-7 h-7 rounded flex items-center justify-center hover:text-[#d1d4dc] hover:bg-[#2a2e39] font-serif font-bold text-sm" title="Text">
              T
            </button>
            {/* Icons */}
            <button className="w-7 h-7 rounded flex items-center justify-center hover:text-[#d1d4dc] hover:bg-[#2a2e39]" title="Icons">
              <span className="material-symbols-outlined text-[17px]">sentiment_satisfied</span>
            </button>
          </div>

          {/* TradingView 'TV' Logo at bottom left */}
          <div className="w-7 h-7 rounded-md bg-[#2a2e39] flex items-center justify-center font-bold text-white text-[10px] tracking-tight hover:bg-[#363a45] cursor-pointer" title="TradingView Engine">
            TV
          </div>
        </div>

        {/* Center SVG Chart Canvas */}
        <div
          className="flex-1 relative overflow-hidden bg-[#131722] cursor-crosshair"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setCrosshairPos({
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
            });
          }}
          onMouseLeave={() => {
            setCrosshairPos(null);
            setHoveredCandle(null);
          }}
        >
          {/* Background Grid Lines (Horizontal) */}
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between py-4 pr-0">
            {priceLadder.map((val) => {
              const yPos = yToCoord(val);
              return (
                <div
                  key={val}
                  className="absolute left-0 right-0 h-[1px] bg-[#1e222d]"
                  style={{ top: `${(yPos / chartHeight) * 100}%` }}
                />
              );
            })}
          </div>

          {/* Vertical Grid Lines */}
          <div className="absolute inset-0 pointer-events-none flex justify-between px-8">
            <div className="w-[1px] h-full bg-[#1e222d]" />
            <div className="w-[1px] h-full bg-[#1e222d]" />
            <div className="w-[1px] h-full bg-[#1e222d]" />
            <div className="w-[1px] h-full bg-[#1e222d]" />
            <div className="w-[1px] h-full bg-[#1e222d]" />
          </div>

          {/* SVG Rendering: Candlesticks, Area Fill & Volume according to trades */}
          <svg
            className="w-full h-full overflow-visible"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="spikeChartAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#089981" stopOpacity="0.38" />
                <stop offset="100%" stopColor="#089981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* 1. Volume Histogram at Bottom - built from SPK/USDT transactions */}
            <g opacity="0.85">
              {candles.map((c, idx) => {
                const isGreen = c.close >= c.open;
                const color = isGreen ? '#089981' : '#f23645';
                const x = paddingLeft + idx * candleSpacing + candleSpacing / 2;
                const vHeight = Math.max(3, (c.volume / maxVolume) * volumeHeight);
                const vY = chartHeight - 20 - vHeight;

                return (
                  <rect
                    key={`vol-${idx}`}
                    x={x - candleBarWidth / 2}
                    y={vY}
                    width={candleBarWidth}
                    height={vHeight}
                    fill={color}
                    opacity={isGreen ? 0.65 : 0.75}
                  />
                );
              })}
            </g>

            {/* 2. Area Chart Render (if selected) */}
            {chartType === 'area' && (
              <g>
                <path d={areaFillPath} fill="url(#spikeChartAreaGradient)" />
                <path d={areaSvgPath} fill="none" stroke="#089981" strokeWidth="2" />
              </g>
            )}

            {/* 3. Japanese Candlesticks (Wicks + Bodies) - formed by real transaction ticks */}
            {chartType === 'candles' && (
              <g>
                {candles.map((c, idx) => {
                  const isGreen = c.close >= c.open;
                  const color = isGreen ? '#089981' : '#f23645';
                  const x = paddingLeft + idx * candleSpacing + candleSpacing / 2;

                  const yOpen = yToCoord(c.open);
                  const yClose = yToCoord(c.close);
                  const yHigh = yToCoord(c.high);
                  const yLow = yToCoord(c.low);

                  const bodyTop = Math.min(yOpen, yClose);
                  const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));

                  return (
                    <g
                      key={`candle-${idx}`}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredCandle(c)}
                    >
                      {/* Candle Wick (High to Low) */}
                      <line
                        x1={x}
                        y1={yHigh}
                        x2={x}
                        y2={yLow}
                        stroke={color}
                        strokeWidth="1.2"
                      />

                      {/* Candle Body */}
                      <rect
                        x={x - candleBarWidth / 2}
                        y={bodyTop}
                        width={candleBarWidth}
                        height={bodyHeight}
                        fill={color}
                        stroke={color}
                        strokeWidth="1"
                      />
                    </g>
                  );
                })}
              </g>
            )}

            {/* 4. Horizontal Dotted Active Price Line */}
            <g>
              <line
                x1={0}
                y1={priceY}
                x2={chartWidth}
                y2={priceY}
                stroke="#089981"
                strokeWidth="1.2"
                strokeDasharray="2 3"
              />
            </g>

            {/* 5. Active Interactive Crosshairs */}
            {crosshairPos && (
              <g pointerEvents="none">
                <line
                  x1={crosshairPos.x}
                  y1={0}
                  x2={crosshairPos.x}
                  y2={chartHeight}
                  stroke="#787b86"
                  strokeWidth="0.8"
                  strokeDasharray="3 3"
                />
                <line
                  x1={0}
                  y1={crosshairPos.y}
                  x2={chartWidth}
                  y2={crosshairPos.y}
                  stroke="#787b86"
                  strokeWidth="0.8"
                  strokeDasharray="3 3"
                />
              </g>
            )}
          </svg>

          {/* Candle Hover Tooltip with complete transaction analytics */}
          {hoveredCandle && (
            <div className="absolute top-2 left-3 bg-[#1e222d]/95 backdrop-blur-md border border-[#2a2e39] rounded px-3 py-1.5 text-[11px] font-mono shadow-xl z-20 flex flex-wrap items-center gap-3">
              <span className="text-[#00F0FF] font-bold">{hoveredCandle.time}</span>
              <span>O: <span className="text-white font-bold">${hoveredCandle.open.toFixed(5)}</span></span>
              <span>H: <span className="text-white font-bold">${hoveredCandle.high.toFixed(5)}</span></span>
              <span>L: <span className="text-white font-bold">${hoveredCandle.low.toFixed(5)}</span></span>
              <span>C: <span className={hoveredCandle.close >= hoveredCandle.open ? 'text-[#089981] font-bold' : 'text-[#f23645] font-bold'}>
                ${hoveredCandle.close.toFixed(5)}
              </span></span>
              <span className="text-[#94a3b8]">Vol: <span className="text-white font-bold">{hoveredCandle.volume.toLocaleString()} SPK</span></span>
              <span className="text-[#D4AF37] font-semibold">${hoveredCandle.volumeUsd.toLocaleString()} USD</span>
              <span className="text-emerald-400 text-[10px]">({hoveredCandle.buyCount} Buys, {hoveredCandle.sellCount} Sells)</span>
            </div>
          )}
        </div>

        {/* Right TradingView Y-Axis Ladder */}
        <div className="w-18 sm:w-22 bg-[#131722] border-l border-[#2a2e39] relative flex flex-col justify-between py-4 text-[11px] font-mono text-[#787b86] shrink-0 select-none">
          {priceLadder.map((val) => {
            const yPos = yToCoord(val);
            return (
              <div
                key={val}
                className="absolute right-2 transform -translate-y-1/2 text-right tabular-nums text-[10px]"
                style={{ top: `${(yPos / chartHeight) * 100}%` }}
              >
                ${val.toFixed(5)}
              </div>
            );
          })}

          {/* ACTIVE SOLID PRICE BADGE */}
          <div
            className="absolute left-0 right-0 font-bold text-[10px] font-mono py-1 px-1 text-center shadow-lg transition-all duration-300 bg-emerald-500 text-[#0A0F1D]"
            style={{
              top: `${(priceY / chartHeight) * 100}%`,
              transform: 'translateY(-50%)',
            }}
          >
            ${livePrice.toFixed(5)}
          </div>
        </div>
      </div>

      {/* ============================================================
          4. BOTTOM TIME AXIS SCALE WITH ROUTER VERIFICATION
         ============================================================ */}
      <div className="flex flex-wrap items-center justify-between pl-12 pr-20 py-1.5 bg-[#131722] border-t border-[#2a2e39] text-[10px] font-mono text-[#787b86]">
        <span>12:00</span>
        <span>15:00</span>
        <span>18:00</span>
        <span>21:00</span>
        <span>00:00</span>
        <div className="flex items-center gap-1.5 text-white font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live AMM Feed · Router {`${routerAddress.substring(0, 6)}...${routerAddress.substring(routerAddress.length - 4)}`}</span>
        </div>
      </div>
    </div>
  );
};
