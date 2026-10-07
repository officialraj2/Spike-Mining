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
  pairName = 'LGNS/WPOL (Market Cap)',
  dexUrl = 'https://dexscreener.com/polygon/0x3c12eca24ebafd6795e731753879d5b629dd2741',
  onBuyClick,
}) => {
  const [selectedInterval, setSelectedInterval] = useState<'1s' | '1m' | '5m' | '15m' | '1h' | '4h' | 'D'>('15m');
  const [hoveredCandle, setHoveredCandle] = useState<TVCandle | null>(null);
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number } | null>(null);

  // Exact candlestick pattern modeled from the user's uploaded TradingView screenshot
  // Market cap range: 290.00K to 365.00K, currently at 327.12K
  const [candles, setCandles] = useState<TVCandle[]>([
    { time: '12:00', open: 292.5, high: 298.2, low: 290.1, close: 296.8, volume: 450 },
    { time: '12:30', open: 296.8, high: 304.5, low: 295.2, close: 302.1, volume: 820 },
    { time: '13:00', open: 302.1, high: 304.0, low: 293.4, close: 295.0, volume: 610 },
    { time: '13:30', open: 295.0, high: 301.2, low: 294.0, close: 299.8, volume: 540 },
    { time: '14:00', open: 299.8, high: 303.4, low: 298.5, close: 302.6, volume: 730 },
    { time: '14:30', open: 302.6, high: 303.1, low: 300.2, close: 301.5, volume: 490 },
    { time: '15:00', open: 301.5, high: 322.8, low: 300.8, close: 320.4, volume: 2450 },
    { time: '15:30', open: 320.4, high: 321.2, low: 310.5, close: 312.0, volume: 1100 },
    { time: '16:00', open: 312.0, high: 314.8, low: 310.2, close: 313.5, volume: 780 },
    { time: '16:30', open: 313.5, high: 332.0, low: 312.8, close: 330.2, volume: 3200 },
    { time: '17:00', open: 330.2, high: 331.4, low: 323.0, close: 325.8, volume: 1350 },
    { time: '17:30', open: 325.8, high: 327.5, low: 324.2, close: 326.4, volume: 890 },
    { time: '18:00', open: 326.4, high: 327.2, low: 325.5, close: 326.8, volume: 640 },
    { time: '18:30', open: 326.8, high: 338.5, low: 326.0, close: 337.2, volume: 4100 },
    { time: '19:00', open: 337.2, high: 338.0, low: 304.0, close: 306.5, volume: 5600 },
    { time: '19:30', open: 306.5, high: 328.4, low: 305.2, close: 326.0, volume: 3800 },
    { time: '20:00', open: 326.0, high: 331.2, low: 325.0, close: 330.5, volume: 2900 },
    { time: '20:30', open: 330.5, high: 364.5, low: 329.8, close: 362.0, volume: 9200 },
    { time: '21:00', open: 362.0, high: 363.8, low: 346.0, close: 348.5, volume: 4800 },
    { time: '21:30', open: 348.5, high: 353.2, low: 347.0, close: 351.8, volume: 2600 },
    { time: '22:00', open: 351.8, high: 352.5, low: 334.0, close: 336.2, volume: 5100 },
    { time: '22:30', open: 336.2, high: 338.0, low: 329.5, close: 331.0, volume: 3400 },
    { time: '23:00', open: 331.0, high: 334.2, low: 326.5, close: 327.12, volume: 2800 },
  ]);

  const [currentMcap, setCurrentMcap] = useState<number>(327.12);
  const [deltaChange, setDeltaChange] = useState<number>(-379.14);
  const [deltaPct, setDeltaPct] = useState<number>(-0.12);
  const [isTickUp, setIsTickUp] = useState<boolean>(false);

  // Live real-time tick simulator (updating the active forming candle and price line)
  useEffect(() => {
    const interval = setInterval(() => {
      // Small realistic tick delta (-0.45 to +0.55) with upward momentum
      const tickDelta = (Math.random() - 0.45) * 0.75;
      setCurrentMcap((prev) => {
        const next = Math.max(315, Math.min(355, Number((prev + tickDelta).toFixed(2))));
        const isUp = next >= prev;
        setIsTickUp(isUp);
        setDeltaChange((c) => Number((c + (isUp ? 24.5 : -18.2)).toFixed(2)));
        setDeltaPct((p) => Number((p + (isUp ? 0.02 : -0.01)).toFixed(2)));

        setCandles((prevCandles) => {
          const last = prevCandles[prevCandles.length - 1];
          const updatedLast: TVCandle = {
            ...last,
            close: next,
            high: Math.max(last.high, next),
            low: Math.min(last.low, next),
            volume: last.volume + Math.floor(10 + Math.random() * 45),
          };
          return [...prevCandles.slice(0, prevCandles.length - 1), updatedLast];
        });

        return next;
      });
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  // SVG Chart Coordinate Mapping
  const chartHeight = 360;
  const chartWidth = 720;
  const paddingLeft = 10;
  const paddingRight = 10;
  const volumeHeight = 65;
  const mainPlotHeight = chartHeight - volumeHeight - 30;

  // Y-Scale fixed levels matching the photo
  const yMin = 285.0;
  const yMax = 365.0;
  const yRange = yMax - yMin;

  const yToCoord = (val: number) => {
    return 15 + mainPlotHeight - ((val - yMin) / yRange) * mainPlotHeight;
  };

  const maxVolume = useMemo(() => Math.max(...candles.map((c) => c.volume), 1000), [candles]);

  const candleSpacing = (chartWidth - paddingLeft - paddingRight) / candles.length;
  const candleBarWidth = Math.max(6, candleSpacing * 0.72);

  const priceY = yToCoord(currentMcap);

  // Exact Price Ladder steps matching the screenshot
  const priceLadder = [360.0, 350.0, 340.0, 330.0, 320.0, 310.0, 300.0, 290.0];

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
              className={`px-2 py-1 rounded text-xs transition-colors ${
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

        {/* Right tools: Open on DexScreener & Camera */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={dexUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2962FF]/15 hover:bg-[#2962FF]/25 border border-[#2962FF]/40 text-[#2962FF] text-xs font-bold transition-all"
          >
            <span>DexScreener Live</span>
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
          </a>

          <button className="w-7 h-7 rounded flex items-center justify-center text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]">
            <span className="material-symbols-outlined text-[16px]">photo_camera</span>
          </button>
        </div>
      </div>

      {/* ============================================================
          2. CHART SUB-HEADER / LEGEND (Exact match to screenshot)
         ============================================================ */}
      <div className="px-3 sm:px-4 py-2 bg-[#131722] flex flex-wrap items-center justify-between text-xs gap-2 border-b border-[#1e222d]">
        <div className="flex flex-wrap items-center gap-2">
          {/* Pair Circle Token Icon */}
          <div className="w-4 h-4 rounded-full bg-[#1e222d] border border-[#2a2e39] flex items-center justify-center text-[10px] text-[#787b86]">
            0
          </div>

          {/* Symbol */}
          <span className="font-bold text-white tracking-wide">
            {pairName}
          </span>
          <span className="text-[#787b86]">· {selectedInterval} · DexScreener</span>

          {/* Live pulsing green dot */}
          <span className="w-2 h-2 rounded-full bg-[#089981] animate-pulse"></span>

          {/* Current MCap / Price */}
          <span className="font-bold text-[#f23645] tabular-nums text-sm">
            {currentMcap.toFixed(2)}K
          </span>

          {/* Change Delta */}
          <span className="font-mono text-[#f23645] text-xs tabular-nums">
            {deltaChange.toFixed(2)} ({deltaPct.toFixed(2)}%)
          </span>
        </div>

        {/* Volume toggle */}
        <div className="flex items-center gap-1 text-[#787b86] text-xs font-mono">
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

            {/* 3. Horizontal Dotted Active Price Line (Red dotted across screen) */}
            <g>
              <line
                x1={0}
                y1={priceY}
                x2={chartWidth}
                y2={priceY}
                stroke="#f23645"
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
              <span>O: <span className="text-white font-bold">{hoveredCandle.open.toFixed(2)}K</span></span>
              <span>H: <span className="text-white font-bold">{hoveredCandle.high.toFixed(2)}K</span></span>
              <span>L: <span className="text-white font-bold">{hoveredCandle.low.toFixed(2)}K</span></span>
              <span>C: <span className={hoveredCandle.close >= hoveredCandle.open ? 'text-[#089981] font-bold' : 'text-[#f23645] font-bold'}>{hoveredCandle.close.toFixed(2)}K</span></span>
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
                className="absolute right-2 transform -translate-y-1/2 text-right tabular-nums"
                style={{ top: `${(yPos / chartHeight) * 100}%` }}
              >
                {val.toFixed(2)}K
              </div>
            );
          })}

          {/* ACTIVE SOLID RED PRICE BADGE (Exact match to 327.12K in screenshot) */}
          <div
            className="absolute left-0 right-0 bg-[#f23645] text-white font-bold text-[11px] font-mono py-1 px-1.5 text-center shadow-lg transition-all duration-300"
            style={{
              top: `${(priceY / chartHeight) * 100}%`,
              transform: 'translateY(-50%)',
            }}
          >
            {currentMcap.toFixed(2)}K
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
