import React, { useState, useEffect, useMemo } from 'react';

interface TVCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TradingViewChartProps {
  pairName?: string;
  dexUrl?: string;
  onBuyClick?: () => void;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  pairName = 'SPIKE (SPK) / USDT [BEP-20]',
  dexUrl = '#dashboard-testnet',
  onBuyClick,
}) => {
  const [selectedInterval, setSelectedInterval] = useState<'1s' | '1m' | '5m' | '15m' | '1h' | '4h' | 'D'>('15m');
  const [hoveredCandle, setHoveredCandle] = useState<TVCandle | null>(null);
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number } | null>(null);

  // Candlesticks for SPIKE (SPK) / USDT (Base Price ~ $0.03450 USDT, Total Supply 50M)
  const [spikeCandles, setSpikeCandles] = useState<TVCandle[]>([
    { time: '12:00', open: 0.0315, high: 0.0322, low: 0.0312, close: 0.0320, volume: 45000 },
    { time: '12:30', open: 0.0320, high: 0.0328, low: 0.0318, close: 0.0325, volume: 62000 },
    { time: '13:00', open: 0.0325, high: 0.0329, low: 0.0321, close: 0.0322, volume: 38000 },
    { time: '13:30', open: 0.0322, high: 0.0331, low: 0.0320, close: 0.0328, volume: 54000 },
    { time: '14:00', open: 0.0328, high: 0.0334, low: 0.0326, close: 0.0332, volume: 82000 },
    { time: '14:30', open: 0.0332, high: 0.0335, low: 0.0330, close: 0.0333, volume: 49000 },
    { time: '15:00', open: 0.0333, high: 0.0348, low: 0.0331, close: 0.0345, volume: 145000 },
    { time: '15:30', open: 0.0345, high: 0.0349, low: 0.0338, close: 0.0340, volume: 88000 },
    { time: '16:00', open: 0.0340, high: 0.0344, low: 0.0337, close: 0.0341, volume: 72000 },
    { time: '16:30', open: 0.0341, high: 0.0356, low: 0.0340, close: 0.0352, volume: 195000 },
    { time: '17:00', open: 0.0352, high: 0.0354, low: 0.0346, close: 0.0348, volume: 110000 },
    { time: '17:30', open: 0.0348, high: 0.0350, low: 0.0345, close: 0.0347, volume: 65000 },
    { time: '18:00', open: 0.0347, high: 0.0349, low: 0.0344, close: 0.0346, volume: 52000 },
    { time: '18:30', open: 0.0346, high: 0.0359, low: 0.0345, close: 0.0355, volume: 240000 },
    { time: '19:00', open: 0.0355, high: 0.0356, low: 0.0335, close: 0.0338, volume: 310000 },
    { time: '19:30', open: 0.0338, high: 0.0351, low: 0.0336, close: 0.0348, volume: 215000 },
    { time: '20:00', open: 0.0348, high: 0.0352, low: 0.0346, close: 0.0350, volume: 175000 },
    { time: '20:30', open: 0.0350, high: 0.0368, low: 0.0348, close: 0.0365, volume: 490000 },
    { time: '21:00', open: 0.0365, high: 0.0367, low: 0.0352, close: 0.0355, volume: 280000 },
    { time: '21:30', open: 0.0355, high: 0.0360, low: 0.0353, close: 0.0358, volume: 160000 },
    { time: '22:00', open: 0.0358, high: 0.0361, low: 0.0345, close: 0.0348, volume: 320000 },
    { time: '22:30', open: 0.0348, high: 0.0352, low: 0.0342, close: 0.0345, volume: 190000 },
    { time: '23:00', open: 0.0345, high: 0.0348, low: 0.0342, close: 0.03450, volume: 145000 },
  ]);

  const [currentSpikePrice, setCurrentSpikePrice] = useState<number>(0.03450);
  const [deltaPct, setDeltaPct] = useState<number>(8.84);
  const [isTickUp, setIsTickUp] = useState<boolean>(true);

  // Live real-time tick simulator
  useEffect(() => {
    const interval = setInterval(() => {
      const tickDelta = (Math.random() - 0.44) * 0.00015;
      setCurrentSpikePrice((prev) => {
        const next = Math.max(0.0310, Math.min(0.0375, +(prev + tickDelta).toFixed(5)));
        setIsTickUp(next >= prev);
        return next;
      });
      setDeltaPct((prev) => +(prev + (Math.random() - 0.46) * 0.08).toFixed(2));

      // Micro update last candle
      setSpikeCandles((prev) => {
        if (!prev.length) return prev;
        const last = { ...prev[prev.length - 1] };
        last.close = +(last.close + tickDelta).toFixed(5);
        last.high = Math.max(last.high, last.close);
        last.low = Math.min(last.low, last.close);
        last.volume += Math.floor(Math.random() * 500);
        return [...prev.slice(0, prev.length - 1), last];
      });
    }, 2400);

    return () => clearInterval(interval);
  }, []);

  const candles = spikeCandles;

  // SVG Chart Coordinate Mapping
  const chartHeight = 360;
  const chartWidth = 720;
  const paddingLeft = 10;
  const paddingRight = 10;
  const volumeHeight = 65;
  const mainPlotHeight = chartHeight - volumeHeight - 30;

  // Y-Scale levels based on SPIKE (SPK)
  const yMin = 0.0300;
  const yMax = 0.0380;
  const yRange = yMax - yMin;

  const yToCoord = (val: number) => {
    return 15 + mainPlotHeight - ((val - yMin) / yRange) * mainPlotHeight;
  };

  const maxVolume = useMemo(() => Math.max(...candles.map((c) => c.volume), 1000), [candles]);
  const candleSpacing = (chartWidth - paddingLeft - paddingRight) / candles.length;
  const candleBarWidth = Math.max(6, candleSpacing * 0.72);

  const activeDisplayPrice = currentSpikePrice;
  const priceY = yToCoord(activeDisplayPrice);

  const priceLadder = [0.0380, 0.0360, 0.0340, 0.0320, 0.0300];

  return (
    <div className="w-full bg-[#131722] text-[#d1d4dc] font-sans rounded-2xl border border-[#2a2e39] overflow-hidden shadow-2xl flex flex-col select-none">
      {/* ============================================================
          1. TOP TRADINGVIEW TOOLBAR
         ============================================================ */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#131722] border-b border-[#2a2e39] text-xs font-medium">
        {/* Left items: + icon, intervals, chart type, indicators */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          {/* Compare (+) button */}
          <button className="w-7 h-7 rounded flex items-center justify-center text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] transition-colors">
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

          {/* Interval dropdown arrow */}
          <button className="text-[#787b86] hover:text-[#d1d4dc] p-1">
            <span className="material-symbols-outlined text-[14px]">expand_more</span>
          </button>

          <div className="w-[1px] h-4 bg-[#2a2e39] mx-0.5"></div>

          {/* Chart style: Line / Candles */}
          <button className="p-1 rounded text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] flex items-center gap-0.5">
            <span className="material-symbols-outlined text-[16px]">show_chart</span>
          </button>

          <button className="p-1 rounded text-[#2962FF] bg-[#2962FF]/15 hover:bg-[#2962FF]/25 flex items-center gap-0.5 font-bold">
            <span className="material-symbols-outlined text-[16px]">candlestick_chart</span>
            <span className="material-symbols-outlined text-[12px]">expand_more</span>
          </button>

          <div className="w-[1px] h-4 bg-[#2a2e39] mx-0.5"></div>

          {/* Indicators fx */}
          <button className="px-2 py-1 rounded text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] flex items-center gap-1 font-mono text-xs">
            <span>fx</span>
            <span className="hidden sm:inline text-[11px]">Indicators</span>
          </button>
        </div>

        {/* Right tools */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>PancakeSwap V2 AMM</span>
          </span>

          <button className="w-7 h-7 rounded flex items-center justify-center text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]">
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

          {/* Network and Token Standard Badge */}
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30">
            BEP-20 (50M SPK Supply)
          </span>

          <span className="text-[#787b86]">· {selectedInterval} · Testnet Live</span>

          {/* Live pulsing green dot */}
          <span className="w-2 h-2 rounded-full bg-[#089981] animate-pulse"></span>

          {/* Current Price */}
          <span className="font-bold tabular-nums text-sm text-emerald-400">
            ${activeDisplayPrice.toFixed(5)} USDT
          </span>

          {/* Change Delta */}
          <span className="font-mono text-xs tabular-nums text-emerald-400">
            +{deltaPct.toFixed(2)}%
          </span>
        </div>

        {/* Volume & Quick Action */}
        <div className="flex items-center gap-2 text-[#787b86] text-xs font-mono">
          {onBuyClick && (
            <button
              onClick={onBuyClick}
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#00F0FF] to-emerald-400 text-[#051424] font-headline font-bold text-[11px] shadow-sm hover:brightness-110 transition-all cursor-pointer"
            >
              + Copy Contract
            </button>
          )}
          <span>Volume</span>
          <span className="material-symbols-outlined text-[14px]">keyboard_arrow_up</span>
        </div>
      </div>

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
            {/* Emoji */}
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

          {/* SVG Rendering: Candlesticks & Volume */}
          <svg
            className="w-full h-full overflow-visible"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
          >
            {/* 1. Volume Histogram at Bottom */}
            <g opacity="0.85">
              {candles.map((c, idx) => {
                const isGreen = c.close >= c.open;
                const color = isGreen ? '#089981' : '#f23645';
                const x = paddingLeft + idx * candleSpacing + candleSpacing / 2;
                const vHeight = (c.volume / maxVolume) * volumeHeight;
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

            {/* 2. Japanese Candlesticks (Wicks + Bodies) */}
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

            {/* 3. Horizontal Dotted Active Price Line */}
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

            {/* 4. Active Interactive Crosshairs */}
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

          {/* Candle Hover Tooltip */}
          {hoveredCandle && (
            <div className="absolute top-2 left-3 bg-[#1e222d]/95 backdrop-blur-md border border-[#2a2e39] rounded px-2.5 py-1 text-[11px] font-mono shadow-xl z-20 flex items-center gap-3">
              <span className="text-[#787b86]">{hoveredCandle.time}</span>
              <span>O: <span className="text-white font-bold">${hoveredCandle.open.toFixed(5)}</span></span>
              <span>H: <span className="text-white font-bold">${hoveredCandle.high.toFixed(5)}</span></span>
              <span>L: <span className="text-white font-bold">${hoveredCandle.low.toFixed(5)}</span></span>
              <span>C: <span className={hoveredCandle.close >= hoveredCandle.open ? 'text-[#089981] font-bold' : 'text-[#f23645] font-bold'}>
                ${hoveredCandle.close.toFixed(5)}
              </span></span>
            </div>
          )}
        </div>

        {/* Right TradingView Y-Axis Ladder */}
        <div className="w-16 sm:w-20 bg-[#131722] border-l border-[#2a2e39] relative flex flex-col justify-between py-4 text-[11px] font-mono text-[#787b86] shrink-0 select-none">
          {priceLadder.map((val) => {
            const yPos = yToCoord(val);
            return (
              <div
                key={val}
                className="absolute right-2 transform -translate-y-1/2 text-right tabular-nums text-[10px]"
                style={{ top: `${(yPos / chartHeight) * 100}%` }}
              >
                ${val.toFixed(4)}
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
            ${activeDisplayPrice.toFixed(5)}
          </div>
        </div>
      </div>

      {/* ============================================================
          4. BOTTOM TIME AXIS SCALE
         ============================================================ */}
      <div className="flex items-center justify-between pl-12 pr-20 py-1.5 bg-[#131722] border-t border-[#2a2e39] text-[10px] font-mono text-[#787b86]">
        <span>12:00</span>
        <span>15:00</span>
        <span>18:00</span>
        <span>21:00</span>
        <span>00:00</span>
        <span className="text-white font-bold">Now (Live)</span>
      </div>
    </div>
  );
};
