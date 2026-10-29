import React, { useState, useEffect, useMemo, useCallback } from 'react';

interface SparkleShatterMedallionProps {
  logoUrl: string;
  fallbackUrl?: string;
  className?: string;
}

interface NodePoint {
  id: number;
  label: string;
  angleDeg: number;
  x: number;
  y: number;
  type: 'validator' | 'hashrate' | 'relay' | 'quantum';
  color: '#00F0FF' | '#D4AF37' | '#7df4ff';
  pulseDelay: number;
}

interface LightningBolt {
  id: number;
  path: string;
  color: string;
  width: number;
}

// Generate jagged lightning path between two points (x1, y1) and (x2, y2)
function generateLightningPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  displace = 14,
  segments = 5
): string {
  let path = `M ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  const dx = (x2 - x1) / segments;
  const dy = (y2 - y1) / segments;
  const normalX = -(y2 - y1);
  const normalY = x2 - x1;
  const len = Math.hypot(normalX, normalY) || 1;
  const nx = normalX / len;
  const ny = normalY / len;

  for (let i = 1; i < segments; i++) {
    const jitter = (Math.random() - 0.5) * 2 * displace;
    const px = x1 + dx * i + nx * jitter;
    const py = y1 + dy * i + ny * jitter;
    path += ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
  }
  path += ` L ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  return path;
}

export const SparkleShatterMedallion: React.FC<SparkleShatterMedallionProps> = ({
  logoUrl,
  fallbackUrl = '/spike_logo.png',
  className = '',
}) => {
  const [activeLightning, setActiveLightning] = useState<LightningBolt[]>([]);
  const [activeNodeIndex, setActiveNodeIndex] = useState<number>(0);
  const [isSurging, setIsSurging] = useState<boolean>(false);
  const [pulseCount, setPulseCount] = useState<number>(0);

  // SVG dimensions & center
  const size = 360;
  const cx = 180;
  const cy = 180;
  const orbitalRadius = 142; // Orbit ring radius for nodes

  // 8 Interconnected Blockchain / Quantum Nodes
  const nodes: NodePoint[] = useMemo(() => {
    const nodeTypes: ('validator' | 'hashrate' | 'relay' | 'quantum')[] = [
      'validator',
      'quantum',
      'hashrate',
      'relay',
      'validator',
      'quantum',
      'hashrate',
      'relay',
    ];
    const nodeColors: ('#00F0FF' | '#D4AF37' | '#7df4ff')[] = [
      '#00F0FF',
      '#D4AF37',
      '#00F0FF',
      '#7df4ff',
      '#D4AF37',
      '#00F0FF',
      '#D4AF37',
      '#00F0FF',
    ];
    const labels = ['NODE 01', 'ORBIT α', 'NODE 02', 'RELAY β', 'NODE 03', 'QUANTUM', 'NODE 04', 'SYNC γ'];

    return Array.from({ length: 8 }).map((_, i) => {
      const angleDeg = i * 45 - 90; // Start at top zenith
      const rad = (angleDeg * Math.PI) / 180;
      return {
        id: i,
        label: labels[i],
        angleDeg,
        x: cx + orbitalRadius * Math.cos(rad),
        y: cy + orbitalRadius * Math.sin(rad),
        type: nodeTypes[i],
        color: nodeColors[i],
        pulseDelay: i * 0.35,
      };
    });
  }, [cx, cy, orbitalRadius]);

  // Generate periodic electric lightning discharges between nodes & center
  const triggerLightningSurge = useCallback((boostIntensity = false) => {
    const bolts: LightningBolt[] = [];
    const count = boostIntensity ? 5 : 3;

    for (let k = 0; k < count; k++) {
      const fromNodeIdx = Math.floor(Math.random() * nodes.length);
      // Either connect to another node or to the center coin core
      const connectToCenter = Math.random() > 0.4;
      const fromNode = nodes[fromNodeIdx];

      let toX = cx;
      let toY = cy;
      if (!connectToCenter) {
        // pick neighbor node or diagonal node
        const offset = Math.random() > 0.5 ? 1 : 2;
        const toNodeIdx = (fromNodeIdx + offset) % nodes.length;
        toX = nodes[toNodeIdx].x;
        toY = nodes[toNodeIdx].y;
      } else {
        // point on inner rim (radius ~85)
        const rad = (fromNode.angleDeg * Math.PI) / 180 + (Math.random() - 0.5) * 0.5;
        toX = cx + 85 * Math.cos(rad);
        toY = cy + 85 * Math.sin(rad);
      }

      bolts.push({
        id: Date.now() + k,
        path: generateLightningPath(fromNode.x, fromNode.y, toX, toY, boostIntensity ? 16 : 10, 5),
        color: Math.random() > 0.5 ? '#00F0FF' : '#D4AF37',
        width: boostIntensity ? 2.5 : 1.5,
      });
    }

    setActiveLightning(bolts);
    setActiveNodeIndex((prev) => (prev + 1) % nodes.length);

    // Fade out lightning after quick discharge (crackling effect)
    setTimeout(() => {
      setActiveLightning([]);
    }, 280);
  }, [cx, cy, nodes]);

  // Periodic automatic lightning & node synchronization (electric pulses)
  useEffect(() => {
    const interval = setInterval(() => {
      triggerLightningSurge(false);
      setPulseCount((c) => c + 1);
    }, 1600);

    return () => clearInterval(interval);
  }, [triggerLightningSurge]);

  // User click or tap triggers high-energy electric lightning discharge surge
  const handleInteractiveSurge = () => {
    setIsSurging(true);
    triggerLightningSurge(true);

    // Follow-up micro discharges for realistic electric crackling
    setTimeout(() => triggerLightningSurge(true), 120);
    setTimeout(() => triggerLightningSurge(true), 240);

    setTimeout(() => {
      setIsSurging(false);
    }, 800);
  };

  return (
    <div
      onClick={handleInteractiveSurge}
      className={`relative flex flex-col items-center justify-center select-none cursor-pointer group ${className}`}
      title="Click to trigger Quantum Lightning Surge & Node Synchronization"
    >
      {/* Outer Atmospheric Aura (Cyan & Gold Plasma) */}
      <div
        className={`absolute inset-0 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
          isSurging
            ? 'bg-gradient-to-r from-[#00F0FF]/50 via-[#D4AF37]/50 to-[#00F0FF]/50 scale-140 opacity-100'
            : 'bg-gradient-to-r from-[#00F0FF]/20 via-[#D4AF37]/20 to-[#00F0FF]/20 scale-110 opacity-75 group-hover:scale-125 group-hover:opacity-100'
        }`}
      />

      {/* SVG Container for Quantum Nodes & Lightning Circuit Grid */}
      <div className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-[350px] md:h-[350px] flex items-center justify-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible"
        >
          <defs>
            {/* Cyan Glow Filter */}
            <filter id="cyan-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Gold Glow Filter */}
            <filter id="gold-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Lightning Intense Sparkle Filter */}
            <filter id="lightning-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Radial Core Gradients */}
            <linearGradient id="cyanGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.8" />
            </linearGradient>

            <linearGradient id="goldCyanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#00F0FF" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Background Concentric Radar Rings & Circuit Web */}
          <circle
            cx={cx}
            cy={cy}
            r={orbitalRadius}
            fill="none"
            stroke="#00F0FF"
            strokeOpacity="0.22"
            strokeWidth="1.2"
            strokeDasharray="4 6"
            className="animate-[spin_60s_linear_infinite]"
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />

          <circle
            cx={cx}
            cy={cy}
            r={orbitalRadius + 18}
            fill="none"
            stroke="#D4AF37"
            strokeOpacity="0.18"
            strokeWidth="1"
            strokeDasharray="8 8"
            className="animate-[spin_80s_linear_infinite_reverse]"
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />

          <circle
            cx={cx}
            cy={cy}
            r={orbitalRadius - 38}
            fill="none"
            stroke="#00F0FF"
            strokeOpacity="0.15"
            strokeWidth="1"
          />

          {/* Node Interconnection Polygon / Neural Circuit Lines */}
          {nodes.map((node, i) => {
            const nextNode = nodes[(i + 1) % nodes.length];
            const crossNode = nodes[(i + 3) % nodes.length];
            const isHighlighted = activeNodeIndex === i || activeNodeIndex === (i + 1) % nodes.length;

            return (
              <g key={`lines-${node.id}`}>
                {/* Perimeter Orbital Circuit Trace */}
                <line
                  x1={node.x}
                  y1={node.y}
                  x2={nextNode.x}
                  y2={nextNode.y}
                  stroke={isHighlighted ? '#00F0FF' : '#1c2b3b'}
                  strokeWidth={isHighlighted ? 1.8 : 1}
                  strokeOpacity={isHighlighted ? 0.85 : 0.5}
                  strokeDasharray={isHighlighted ? 'none' : '3 3'}
                  filter={isHighlighted ? 'url(#cyan-glow)' : undefined}
                  className="transition-all duration-300"
                />

                {/* Geometric Diagonal Star Chord (Quantum Web) */}
                <line
                  x1={node.x}
                  y1={node.y}
                  x2={crossNode.x}
                  y2={crossNode.y}
                  stroke={i % 2 === 0 ? '#D4AF37' : '#00F0FF'}
                  strokeWidth="0.75"
                  strokeOpacity={isSurging ? 0.5 : 0.15}
                  className="transition-opacity duration-300"
                />

                {/* Spoke Line: Node to Center Medallion */}
                <line
                  x1={node.x}
                  y1={node.y}
                  x2={cx}
                  y2={cy}
                  stroke={node.color}
                  strokeWidth={activeNodeIndex === i ? 1.4 : 0.6}
                  strokeOpacity={activeNodeIndex === i ? 0.75 : 0.12}
                  strokeDasharray="2 4"
                  className="transition-all duration-300"
                />
              </g>
            );
          })}

          {/* Traveling Energy Data Packets along the Orbital Ring */}
          {nodes.map((node, i) => {
            const nextNode = nodes[(i + 1) % nodes.length];
            // Compute animated particle position based on pulseCount
            const t = ((pulseCount * 0.25 + i * 0.125) % 1);
            const px = node.x + (nextNode.x - node.x) * t;
            const py = node.y + (nextNode.y - node.y) * t;

            return (
              <circle
                key={`packet-${node.id}`}
                cx={px}
                cy={py}
                r={1.8}
                fill={node.color}
                filter="url(#lightning-glow)"
                opacity={0.85}
              />
            );
          })}

          {/* Dynamic Electric Lightning Bolts */}
          {activeLightning.map((bolt, i) => (
            <path
              key={`bolt-${bolt.id}-${i}`}
              d={bolt.path}
              fill="none"
              stroke={bolt.color}
              strokeWidth={bolt.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#lightning-glow)"
              className="animate-in fade-in duration-75"
            />
          ))}

          {/* Blockchain Node Points (Validator, Quantum, Relay, Hashrate) */}
          {nodes.map((node, i) => {
            const isActive = activeNodeIndex === i;
            const isHovered = isSurging;

            return (
              <g key={`node-${node.id}`} className="transition-transform duration-300">
                {/* Node Outer Halo Pulse */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isActive || isHovered ? 13 : 8}
                  fill={node.color}
                  fillOpacity={isActive || isHovered ? 0.25 : 0.08}
                  stroke={node.color}
                  strokeWidth={isActive ? 1.5 : 0.8}
                  strokeOpacity={isActive ? 0.9 : 0.35}
                  filter={isActive ? 'url(#cyan-glow)' : undefined}
                  className={isActive ? 'animate-ping origin-center' : ''}
                  style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                />

                {/* Node Solid Micro Core */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isActive ? 4 : 2.8}
                  fill={isActive ? '#FFFFFF' : node.color}
                  stroke="#0A0F1D"
                  strokeWidth="1.2"
                  filter={isActive ? 'url(#lightning-glow)' : undefined}
                />

                {/* Micro Node Crosshairs / Tech Reticle */}
                <line
                  x1={node.x - 6}
                  y1={node.y}
                  x2={node.x + 6}
                  y2={node.y}
                  stroke={node.color}
                  strokeWidth="0.75"
                  strokeOpacity={isActive ? 0.9 : 0.3}
                />
                <line
                  x1={node.x}
                  y1={node.y - 6}
                  x2={node.x}
                  y2={node.y + 6}
                  stroke={node.color}
                  strokeWidth="0.75"
                  strokeOpacity={isActive ? 0.9 : 0.3}
                />
              </g>
            );
          })}
        </svg>

        {/* =========================================================
            PRISTINE CENTRAL MEDALLION (Unbroken, Majestic, Solid)
            Features High-Tech Bezel, Specular Glint & Electric Ring
           ========================================================= */}
        <div className="relative w-56 h-56 sm:w-64 sm:h-64 md:w-68 md:h-68 rounded-full flex items-center justify-center z-20 group-hover:scale-105 transition-all duration-500 animate-float-slow">
          {/* Outer Multi-layered Cybernetic Bezel */}
          <div
            className={`absolute inset-0 rounded-full p-2.5 transition-all duration-500 ${
              isSurging
                ? 'bg-gradient-to-tr from-[#00F0FF] via-[#FFFFFF] to-[#D4AF37] shadow-[0_0_80px_rgba(0,240,255,0.9),0_0_40px_rgba(212,175,55,0.8)] scale-105'
                : 'bg-gradient-to-tr from-[#D4AF37]/90 via-[#00F0FF]/50 to-[#D4AF37]/90 shadow-[0_0_45px_rgba(0,240,255,0.4),0_0_25px_rgba(212,175,55,0.35)] group-hover:shadow-[0_0_70px_rgba(0,240,255,0.7),0_0_35px_rgba(212,175,55,0.6)]'
            }`}
          >
            {/* Concentric Bezel Ring */}
            <div className="w-full h-full rounded-full border border-white/30 flex items-center justify-center bg-[#071322]">
              {/* Inner Neon Energy Track */}
              <div className="w-[94%] h-[94%] rounded-full border border-[#00F0FF]/40 p-1.5 flex items-center justify-center bg-gradient-to-b from-[#0A1626] to-[#040C16]">
                {/* Rotating Tech Tick Ring */}
                <div className="absolute inset-2.5 rounded-full border border-[#D4AF37]/30 border-dashed animate-[spin_40s_linear_infinite]" />
              </div>
            </div>
          </div>

          {/* Central Falcon Logo Image (Always Intact & Pristine) */}
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 md:w-56 md:h-56 p-2 rounded-full flex items-center justify-center z-10">
            <img
              src={logoUrl}
              alt="SPIKE Falcon Medallion"
              onError={(e) => {
                e.currentTarget.src = fallbackUrl;
              }}
              className="w-full h-full object-contain rounded-full drop-shadow-[0_15px_30px_rgba(0,0,0,0.95)] transition-transform duration-500 group-hover:scale-102"
              referrerPolicy="no-referrer"
            />

            {/* Specular Holographic Glint Beam across the coin */}
            <div className="absolute inset-0 rounded-full pointer-events-none overflow-hidden opacity-60 group-hover:opacity-95 transition-opacity duration-500">
              <div className="w-full h-full bg-gradient-to-tr from-transparent via-white/30 to-transparent animate-glint-sweep" />
            </div>

            {/* Micro Lightning Spark Overlay */}
            <div
              className={`absolute inset-0 rounded-full pointer-events-none transition-opacity duration-200 ${
                isSurging ? 'opacity-100 bg-[#00F0FF]/15' : 'opacity-0'
              }`}
            />
          </div>

          {/* Live Node Telemetry Mini-Pill Badge (Bottom Center of Medallion) */}
          <div className="absolute -bottom-3 px-3 py-1 rounded-full bg-[#071322]/95 border border-[#00F0FF]/50 shadow-[0_0_15px_rgba(0,240,255,0.4)] backdrop-blur-md flex items-center gap-1.5 z-30 transition-transform group-hover:scale-105">
            <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-white tracking-wider">
              {nodes[activeNodeIndex].label}
            </span>
            <span className="text-[#94a3b8]/60 text-[9px] font-mono">|</span>
            <span className="text-[9px] font-mono font-semibold text-[#D4AF37]">
              {isSurging ? '⚡ SURGE' : 'ACTIVE'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SparkleShatterMedallion;
