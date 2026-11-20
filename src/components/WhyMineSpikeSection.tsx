import React, { useState, useMemo, useEffect } from 'react';
import { TabType } from '../types';

export interface WhyMineSpikeSectionProps {
  mode?: 'landing' | 'workspace';
  isWalletConnected: boolean;
  onConnectWallet: () => void;
  onNavigate?: (tab: TabType) => void;
  onOpenSwapModal?: () => void;
}

type LayerId = 'l2-compute' | 'bsc-settlement' | 'nodescan-amm' | 'velocity-guard';
type ComparisonCategory = 'all' | 'architecture' | 'economics' | 'liquidity';

interface ArchitectureLayer {
  id: LayerId;
  step: string;
  shortTitle: string;
  title: string;
  classification: string;
  accent: 'cyan' | 'gold' | 'emerald';
  summary: string;
  mechanism: string;
  securityGuarantee: string;
  minerImpact: string;
  specs: { label: string; value: string }[];
}

interface ComparisonRow {
  id: string;
  category: Exclude<ComparisonCategory, 'all'>;
  categoryLabel: string;
  dimension: string;
  btcMetric: string;
  btcConstraint: string;
  spikeMetric: string;
  spikeAdvantage: string;
  engineeringRationale: string;
}

const ARCHITECTURE_LAYERS: ArchitectureLayer[] = [
  {
    id: 'l2-compute',
    step: '01',
    shortTitle: 'Layer-2 Compute Engine',
    title: 'Off-Chain Layer-2 Compute & Validator Engine',
    classification: 'Execution Layer · Golden Hawk Cluster',
    accent: 'cyan',
    summary:
      'High-frequency 24-hour mining cycles, virtual hashrate allocation, and network multiplier calculations run on a zero-gas off-chain execution layer modeled on modern rollup architecture.',
    mechanism:
      'Instead of forcing miners to sign expensive Layer-1 transactions every hour, the Golden Hawk Validator Cluster tracks Virtual Hashrate (VH/s) deterministically across 24-hour consensus windows.',
    securityGuarantee:
      'Cycle timestamps, node states, and cumulative reward ledgers are cryptographically bound to each user’s verified BEP-20 wallet address prior to settlement.',
    minerImpact:
      'Eliminates daily gas burn and ASIC electricity overhead while enabling instant scalability from 100 VH/s base rigs up to 857.14 VH/s network tiers.',
    specs: [
      { label: 'Execution Gas Cost', value: '$0.00 / cycle' },
      { label: 'Consensus Window', value: '24 Hours' },
      { label: 'Peak Node Speed', value: '857.14 VH/s' },
    ],
  },
  {
    id: 'bsc-settlement',
    step: '02',
    shortTitle: 'BSC Layer-1 Settlement',
    title: 'BNB Smart Chain On-Chain Settlement Layer',
    classification: 'Finality Layer · BEP-20 Standard',
    accent: 'gold',
    summary:
      'Whenever rewards are harvested or swapped, final token accounting settles natively on BNB Smart Chain (BSC Mainnet) directly inside the user’s self-custodial Web3 wallet.',
    mechanism:
      'SPIKE operates as a fixed-cap BEP-20 asset governed by transparent smart-contract supply rules rather than an opaque, revocable off-chain points balance.',
    securityGuarantee:
      'Self-custodial wallet ownership with ~3-second on-chain finality and a strict 50,000,000 maximum token supply cap.',
    minerImpact:
      'Miners retain verifiable on-chain custody of every harvested SPIKE token without centralized withdrawal lockups or exchange intermediaries.',
    specs: [
      { label: 'Maximum Supply', value: '50,000,000 SPIKE' },
      { label: 'Block Finality', value: '~3 Seconds' },
      { label: 'Custody Model', value: 'Self-Custodial' },
    ],
  },
  {
    id: 'nodescan-amm',
    step: '03',
    shortTitle: 'Nodescan V3 Liquidity',
    title: 'Nodescan V3 Concentrated Liquidity AMM',
    classification: 'DeFi Market Layer · 0.05% Fee Tier',
    accent: 'emerald',
    summary:
      'Mined SPIKE connects directly to an active Nodescan V3 concentrated liquidity market paired with BEP-20 USDT for real-time, non-custodial price discovery and settlement.',
    mechanism:
      'Swap quotes are validated on-chain via V3 Quoter pricing and executed through the V3 Smart Router, routing SPIKE straight into USDT inside the caller’s wallet.',
    securityGuarantee:
      'Atomic on-chain swap execution ensures either exact verified USDT settlement arrives in your wallet or the transaction reverts safely with zero asset loss.',
    minerImpact:
      'Provides immediate DeFi utility and live market liquidity without waiting years for centralized exchange listings.',
    specs: [
      { label: 'Pool Fee Tier', value: '0.05% V3' },
      { label: 'Settlement Asset', value: 'BEP-20 USDT' },
      { label: 'Execution Model', value: 'Atomic On-Chain' },
    ],
  },
  {
    id: 'velocity-guard',
    step: '04',
    shortTitle: '10% Velocity Guard',
    title: 'Algorithmic 10% Sell-Velocity Guard & Cross-Chain Layer',
    classification: 'Economic Defense · Anti-Dump Shield',
    accent: 'gold',
    summary:
      'A protocol-enforced 10% wallet sell-velocity cap protects market depth from sudden whale liquidation shocks while EVM compatibility prepares the network for cross-chain expansion.',
    mechanism:
      'Each Web3 wallet can liquidate up to 10% of its on-chain SPIKE holdings per swap at live Nodescan V3 market rates, pacing sell-side supply velocity smoothly.',
    securityGuarantee:
      'Prevents single-block liquidity drain attacks and dampens severe AMM price-impact cascades that historically collapse early mining tokens.',
    minerImpact:
      'Aligns protocol incentives with committed validators and long-term holders while maintaining EVM readiness for LayerZero cross-chain interoperability.',
    specs: [
      { label: 'Max Swap Velocity', value: '10% Wallet Cap' },
      { label: 'Whale Shock Shield', value: 'Protocol-Enforced' },
      { label: 'Expansion Path', value: 'EVM / LayerZero' },
    ],
  },
];

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    id: 'consensus-layer',
    category: 'architecture',
    categoryLabel: 'Architecture',
    dimension: 'Consensus & Layer Model',
    btcMetric: 'Layer-1 Proof-of-Work',
    btcConstraint: 'Brute-force SHA-256 hash competition on a single congested base layer.',
    spikeMetric: 'Hybrid Layer-2 + BSC L1',
    spikeAdvantage: 'Zero-gas Layer-2 compute cycles anchored to BNB Smart Chain finality.',
    engineeringRationale:
      'Separating continuous mining execution (Layer-2 Golden Hawk Cluster) from asset custody and swaps (Layer-1 BSC Mainnet) delivers rollup-grade efficiency without sacrificing on-chain verifiability.',
  },
  {
    id: 'hardware-energy',
    category: 'architecture',
    categoryLabel: 'Architecture',
    dimension: 'Hardware & Energy Overhead',
    btcMetric: '$5,000–$15,000 ASICs',
    btcConstraint: 'High electricity burn, thermal cooling, and rapid hardware obsolescence.',
    spikeMetric: 'Zero-Hardware VH/s Nodes',
    spikeAdvantage: 'Cloud-validated Virtual Hashrate with 99.9% lower energy footprint.',
    engineeringRationale:
      'Bitcoin miners constantly bleed revenue to utility bills and depreciating silicon. SPIKE replaces physical energy waste with protocol-backed cloud validation accessible from any Web3 device.',
  },
  {
    id: 'finality-gas',
    category: 'architecture',
    categoryLabel: 'Architecture',
    dimension: 'Settlement Speed & Gas',
    btcMetric: '~10 Min Block Time',
    btcConstraint: 'Slow confirmations and unpredictable mempool fee spikes during congestion.',
    spikeMetric: '~3 Sec BSC Finality',
    spikeAdvantage: 'Sub-second L2 mining state updates with low-cost on-chain settlement.',
    engineeringRationale:
      'Fast EVM finality allows real-time swap verification and rapid USDT settlement directly inside non-custodial wallets, removing multi-confirmation delays.',
  },
  {
    id: 'capital-entry',
    category: 'economics',
    categoryLabel: 'Economics & Yield',
    dimension: 'Entry Barrier & Access',
    btcMetric: 'Industrial Farm Monopoly',
    btcConstraint: 'Retail participants are priced out by institutional hash-farm scale.',
    spikeMetric: '$10 Micro-Node Entry',
    spikeAdvantage: 'Globally inclusive validator activation with transparent emission math.',
    engineeringRationale:
      'By lowering validator activation to a $10 protocol entry rather than industrial warehouse capital, SPIKE restores grassroots participation to digital asset mining.',
  },
  {
    id: 'yield-predictability',
    category: 'economics',
    categoryLabel: 'Economics & Yield',
    dimension: 'Yield Scaling & Halving Risk',
    btcMetric: 'Difficulty Compression',
    btcConstraint: 'Global difficulty spikes and halvings squeeze small miners into net losses.',
    spikeMetric: 'Structured 24h Cycles',
    spikeAdvantage: 'Deterministic VH/s output scaling from 100 VH/s up to 857.14 VH/s.',
    engineeringRationale:
      'Miners can calculate exact daily output using published protocol emission rules and grow their effective hashrate through verified network participation instead of buying more physical rigs.',
  },
  {
    id: 'defi-composability',
    category: 'economics',
    categoryLabel: 'Economics & Yield',
    dimension: 'DeFi & Cross-Chain Utility',
    btcMetric: 'Isolated UTXO Ledger',
    btcConstraint: 'No native smart-contract execution or direct AMM composability.',
    spikeMetric: 'Full EVM / BEP-20 DeFi',
    spikeAdvantage: 'Native smart-contract liquidity pools and LayerZero cross-chain roadmap.',
    engineeringRationale:
      'Operating on an EVM-compatible standard allows SPIKE to integrate natively with V3 concentrated liquidity pools, decentralized wallets, and future omnichain bridges.',
  },
  {
    id: 'exit-liquidity',
    category: 'liquidity',
    categoryLabel: 'Liquidity & Safety',
    dimension: 'Exit Liquidity & Off-Ramp',
    btcMetric: 'Centralized Exchange Flow',
    btcConstraint: 'Miners transfer coins to custodial exchanges, incurring counterparty risk.',
    spikeMetric: 'Native Nodescan V3 Swap',
    spikeAdvantage: 'Direct wallet-to-wallet SPIKE to USDT conversion at live on-chain rates.',
    engineeringRationale:
      'Users never hand custody to a centralized exchange order book. Swaps route atomically through Nodescan V3 directly from and back to the user’s Web3 wallet.',
  },
  {
    id: 'anti-dump',
    category: 'liquidity',
    categoryLabel: 'Liquidity & Safety',
    dimension: 'Anti-Dump Price Defense',
    btcMetric: 'Uncapped Pool Dumps',
    btcConstraint: 'Large mining pools can dump entire treasuries in minutes, crashing price.',
    spikeMetric: '10% Wallet Velocity Guard',
    spikeAdvantage: 'Protocol-level 10% sell cap shields V3 liquidity depth from whale shocks.',
    engineeringRationale:
      'Most mining ecosystems fail from sudden sell-pressure cascades. Enforcing a 10% wallet swap cap keeps circulating sell velocity disciplined and protects concentrated liquidity stability.',
  },
];

const PROTOCOL_HIGHLIGHTS = [
  {
    label: 'Fixed Hard Cap',
    value: '50,000,000 SPIKE',
    sublabel: 'Strict BEP-20 Maximum Supply',
    valueClass: 'text-white',
    glowClass: 'animate-box-glow-cyan border-[#00F0FF]/45',
    topLine: 'from-transparent via-[#7df4ff]/85 to-transparent',
  },
  {
    label: 'Sell Velocity Guard',
    value: '10% Wallet Cap',
    sublabel: 'Protocol-Enforced Anti-Dump Shield',
    valueClass: 'text-[#fde68a]',
    glowClass: 'animate-box-glow-gold border-[#D4AF37]/45',
    topLine: 'from-transparent via-[#fde68a]/85 to-transparent',
  },
  {
    label: 'On-Chain Finality',
    value: '~3s BSC Mainnet',
    sublabel: 'Self-Custodial Web3 Settlement',
    valueClass: 'text-emerald-300',
    glowClass: 'animate-box-glow-emerald border-emerald-400/45',
    topLine: 'from-transparent via-emerald-300/85 to-transparent',
  },
];

const CORE_PILLARS = [
  {
    index: '01',
    title: 'Hybrid Layer-2 Efficiency',
    metric: 'Zero-Gas Compute',
    description:
      'Daily mining cycles execute off-chain on the Golden Hawk Cluster while harvests settle on BSC Mainnet with 3-second cryptographic finality.',
    cardGlow: 'border-[#00F0FF]/45 animate-box-glow-cyan',
    topLine: 'from-transparent via-[#00F0FF]/85 to-transparent',
    accentText: 'text-[#7df4ff]',
  },
  {
    index: '02',
    title: 'Live Nodescan V3 Liquidity',
    metric: '0.05% V3 Routing',
    description:
      'Mined SPIKE is backed by real on-chain concentrated liquidity paired with BEP-20 USDT for non-custodial wallet swaps at live market pricing.',
    cardGlow: 'border-emerald-400/45 animate-box-glow-emerald',
    topLine: 'from-transparent via-emerald-300/85 to-transparent',
    accentText: 'text-emerald-300',
  },
  {
    index: '03',
    title: '10% Anti-Dump Velocity Guard',
    metric: 'Whale Protection',
    description:
      'Protocol-enforced sell velocity caps each Web3 wallet to 10% liquidation per cycle, preventing catastrophic liquidity-pool drains.',
    cardGlow: 'border-[#D4AF37]/45 animate-box-glow-gold',
    topLine: 'from-transparent via-[#fde68a]/85 to-transparent',
    accentText: 'text-[#fde68a]',
  },
  {
    index: '04',
    title: 'Fixed 50M Scarcity Cap',
    metric: 'Zero Hardware Decay',
    description:
      'Strict 50,000,000 BEP-20 hard cap paired with zero-hardware virtual validation replaces megawatt electricity burn with sustainable yield.',
    cardGlow: 'border-sky-400/45 animate-box-glow-blue',
    topLine: 'from-transparent via-sky-300/85 to-transparent',
    accentText: 'text-sky-200',
  },
];

const FILTER_TABS: { id: ComparisonCategory; label: string }[] = [
  { id: 'all', label: 'All Metrics' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'economics', label: 'Economics & Yield' },
  { id: 'liquidity', label: 'Liquidity & Safety' },
];

export const WhyMineSpikeSection: React.FC<WhyMineSpikeSectionProps> = ({
  mode = 'landing',
  isWalletConnected,
  onConnectWallet,
  onNavigate,
  onOpenSwapModal,
}) => {
  const [activeLayerId, setActiveLayerId] = useState<LayerId>('l2-compute');
  const [autoPlayTour, setAutoPlayTour] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<ComparisonCategory>('all');
  const [expandedMetricId, setExpandedMetricId] = useState<string | null>('consensus-layer');

  const activeLayerIndex = ARCHITECTURE_LAYERS.findIndex((l) => l.id === activeLayerId);
  const activeLayer = ARCHITECTURE_LAYERS[activeLayerIndex] || ARCHITECTURE_LAYERS[0];

  // Optional presentation auto-walkthrough across the 4 architecture layers
  useEffect(() => {
    if (!autoPlayTour) return;
    const timer = window.setInterval(() => {
      setActiveLayerId((prevId) => {
        const idx = ARCHITECTURE_LAYERS.findIndex((l) => l.id === prevId);
        const nextIdx = (idx + 1) % ARCHITECTURE_LAYERS.length;
        return ARCHITECTURE_LAYERS[nextIdx].id;
      });
    }, 5500);
    return () => window.clearInterval(timer);
  }, [autoPlayTour]);

  const filteredRows = useMemo(() => {
    if (selectedCategory === 'all') return COMPARISON_ROWS;
    return COMPARISON_ROWS.filter((row) => row.category === selectedCategory);
  }, [selectedCategory]);

  const handleCategoryChange = (cat: ComparisonCategory) => {
    setSelectedCategory(cat);
    const nextRows = cat === 'all' ? COMPARISON_ROWS : COMPARISON_ROWS.filter((r) => r.category === cat);
    if (expandedMetricId && !nextRows.some((r) => r.id === expandedMetricId)) {
      setExpandedMetricId(nextRows[0]?.id ?? null);
    }
  };

  const handleSelectLayer = (id: LayerId) => {
    setAutoPlayTour(false);
    setActiveLayerId(id);
  };

  const handleStepLayer = (direction: -1 | 1) => {
    setAutoPlayTour(false);
    const nextIdx = (activeLayerIndex + direction + ARCHITECTURE_LAYERS.length) % ARCHITECTURE_LAYERS.length;
    setActiveLayerId(ARCHITECTURE_LAYERS[nextIdx].id);
  };

  const getLayerBorderStyle = (layer: ArchitectureLayer, isActive: boolean) => {
    if (!isActive) {
      return 'border-[#1e324a]/90 bg-[#071525]/90 hover:border-[#355373] hover:bg-[#0b1c30]';
    }
    if (layer.accent === 'gold') {
      return 'border-[#fde68a]/80 bg-gradient-to-br from-[#122437] via-[#0e1f31] to-[#1a1c1a] animate-box-glow-gold';
    }
    if (layer.accent === 'emerald') {
      return 'border-emerald-300/80 bg-gradient-to-br from-[#102535] via-[#0d1f30] to-[#0a2325] animate-box-glow-emerald';
    }
    return 'border-[#7df4ff]/80 bg-gradient-to-br from-[#0e2438] via-[#0c1d30] to-[#081a2c] animate-box-glow-cyan';
  };

  const getAccentTextClass = (accent: ArchitectureLayer['accent']) => {
    if (accent === 'gold') return 'text-[#fde68a]';
    if (accent === 'emerald') return 'text-emerald-300';
    return 'text-[#7df4ff]';
  };

  const getInspectorGlowClass = (accent: ArchitectureLayer['accent']) => {
    if (accent === 'gold') {
      return 'border-[#D4AF37]/60 animate-box-glow-gold';
    }
    if (accent === 'emerald') {
      return 'border-emerald-400/60 animate-box-glow-emerald';
    }
    return 'border-[#00F0FF]/60 animate-box-glow-cyan';
  };

  const getInspectorBeamColor = (accent: ArchitectureLayer['accent']) => {
    if (accent === 'gold') return 'from-transparent via-[#fde68a] to-transparent';
    if (accent === 'emerald') return 'from-transparent via-emerald-300 to-transparent';
    return 'from-transparent via-[#7df4ff] to-transparent';
  };

  return (
    <section
      id="why-spike"
      aria-labelledby="why-spike-heading"
      className={`${
        mode === 'workspace'
          ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28 md:pb-16'
          : 'scroll-mt-24'
      } space-y-14 relative`}
    >
      {/* 1. Flagship Executive Hero Header (Clean Standalone Frame, Zero Nested Boxes) */}
      <div className="space-y-6">
        <div className="relative rounded-3xl bg-gradient-to-b from-[#0b1c30] via-[#071525] to-[#051221] border border-sky-200/25 animate-box-glow-hybrid overflow-hidden">
          {/* Subtle Architectural Grid & Ambient Top Luminance */}
          <div className="absolute inset-0 why-grid-backdrop opacity-55 pointer-events-none" aria-hidden="true" />
          <div
            className="absolute -top-28 left-1/2 -translate-x-1/2 w-[560px] h-[220px] rounded-full bg-gradient-to-r from-[#00F0FF]/20 via-sky-200/18 to-[#fde68a]/20 blur-3xl why-halo-drift pointer-events-none"
            aria-hidden="true"
          />
          {/* Animated Top Specular Light Beam */}
          <div
            className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-sky-200/40 to-transparent overflow-hidden pointer-events-none"
            aria-hidden="true"
          >
            <div className="w-1/3 h-full bg-gradient-to-r from-transparent via-white to-transparent why-beam-glide" />
          </div>

          <div className="relative z-10 p-7 sm:p-10 lg:p-12 space-y-4 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono tracking-wide">
              <span className="text-[#7df4ff] font-medium">Protocol Architecture</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-[#fde68a] font-medium">Hybrid Layer-2 &amp; DeFi</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-300/80">Institutional Investor Brief</span>
            </div>

            <h2
              id="why-spike-heading"
              className="text-3xl sm:text-5xl lg:text-[3.25rem] font-bold font-headline tracking-[-0.03em] leading-[1.08] [text-wrap:balance] why-heading-light"
            >
              Why Mine SPIKE? Engineered Like a Layer-2, Settled in Real DeFi Liquidity.
            </h2>

            <p className="text-[15px] sm:text-[17px] text-[#d6e4f5] font-normal leading-[1.7] max-w-3xl">
              Legacy Proof-of-Work mining prices out independent participants with megawatt ASIC farms, while typical mobile mining apps issue illiquid database points. SPIKE unifies zero-gas Layer-2 compute with on-chain BNB Smart Chain settlement, live Nodescan V3 liquidity, and protocol-enforced anti-dump protection.
            </p>
          </div>
        </div>

        {/* Standalone Key Protocol Metric Boxes (Extracted Outside Main Hero Box with Animated Outer Glow) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {PROTOCOL_HIGHLIGHTS.map((item) => (
            <div
              key={item.label}
              className={`relative overflow-hidden p-6 rounded-2xl bg-gradient-to-b from-[#0b1c30] to-[#071525] border ${item.glowClass} transition-transform duration-300 hover:-translate-y-0.5`}
            >
              <div
                className={`absolute top-0 inset-x-5 h-[1px] bg-gradient-to-r ${item.topLine} pointer-events-none`}
                aria-hidden="true"
              />
              <div className="space-y-1.5">
                <div className="text-xs font-mono text-slate-400 tracking-wide">{item.label}</div>
                <div className={`text-2xl sm:text-[1.65rem] font-bold font-mono tabular-nums tracking-tight ${item.valueClass}`}>
                  {item.value}
                </div>
                <div className="text-xs text-[#9eb4ce] pt-0.5">{item.sublabel}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Standalone Four Technical Pillar Boxes (Extracted Outside Main Hero Box with Animated Outer Glow) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CORE_PILLARS.map((pillar) => (
            <div
              key={pillar.index}
              className={`relative overflow-hidden p-6 rounded-2xl bg-gradient-to-b from-[#0a1b2e] to-[#071525] border ${pillar.cardGlow} flex flex-col justify-between gap-4 transition-transform duration-300 hover:-translate-y-0.5`}
            >
              {/* Luminous Top Hairline Edge */}
              <div
                className={`absolute top-0 inset-x-4 h-[1px] bg-gradient-to-r ${pillar.topLine} pointer-events-none`}
                aria-hidden="true"
              />
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500 font-semibold tabular-nums">{pillar.index}</span>
                  <span className={`${pillar.accentText} font-semibold tracking-tight`}>
                    {pillar.metric}
                  </span>
                </div>
                <h3 className="text-[17px] font-semibold font-headline text-[#f8fafc] tracking-[-0.015em] leading-snug">
                  {pillar.title}
                </h3>
                <p className="text-[13.5px] text-[#a9bdd6] leading-[1.65]">
                  {pillar.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Interactive Layer-2 & DeFi Architecture Flow Diagram */}
      <div className="space-y-7">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="text-xs font-mono text-[#7df4ff] tracking-wide">
              Interactive System Blueprint · 4-Layer Protocol Stack
            </div>
            <h3 className="text-2xl sm:text-4xl font-bold font-headline tracking-[-0.025em] leading-[1.15] [text-wrap:balance] why-subheading-light">
              Layer-2 Execution to On-Chain DeFi Settlement Flow
            </h3>
            <p className="text-sm sm:text-[15px] text-[#9eb4ce] leading-relaxed">
              Click any protocol layer below to inspect how off-chain compute connects directly to non-custodial BNB Smart Chain liquidity.
            </p>
          </div>

          {/* Presentation Controls: Auto-Tour + Stepper */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setAutoPlayTour((prev) => !prev)}
              className={`px-3.5 py-2.5 rounded-xl border text-xs font-headline font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] ${
                autoPlayTour
                  ? 'bg-[#12263b] border-[#fde68a]/65 text-[#fde68a] shadow-[0_0_20px_-4px_rgba(212,175,55,0.4)]'
                  : 'bg-[#091829] hover:bg-[#122438] border-[#1e324a] text-[#d4e4fa]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {autoPlayTour ? 'pause' : 'play_arrow'}
              </span>
              <span>{autoPlayTour ? 'Pause Tour' : 'Auto-Tour'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleStepLayer(-1)}
              className="px-3.5 py-2.5 rounded-xl bg-[#091829] hover:bg-[#122438] border border-[#1e324a] text-xs font-headline font-semibold text-[#d4e4fa] transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
              aria-label="Inspect previous architecture layer"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Previous</span>
            </button>

            <button
              type="button"
              onClick={() => handleStepLayer(1)}
              className="px-4 py-2.5 rounded-xl bg-[#0e2236] hover:bg-[#15314d] border border-[#7df4ff]/50 shadow-[0_0_18px_-4px_rgba(0,240,255,0.3)] text-xs font-headline font-semibold text-[#e0f9ff] transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
              aria-label="Inspect next architecture layer"
            >
              <span>Next Layer</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Asymmetric 2-Column Architecture Blueprint */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-stretch">
          {/* Left Column (5 cols): Interactive Connected 4-Layer Flow Nodes */}
          <div
            className="lg:col-span-5 flex flex-col justify-between"
            role="tablist"
            aria-label="SPIKE Protocol Architecture Layers"
          >
            {ARCHITECTURE_LAYERS.map((layer, index) => {
              const isActive = layer.id === activeLayer.id;
              const isLast = index === ARCHITECTURE_LAYERS.length - 1;
              return (
                <div key={layer.id} className="flex flex-col">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleSelectLayer(layer.id)}
                    className={`relative overflow-hidden w-full text-left p-5 rounded-2xl border transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] ${getLayerBorderStyle(
                      layer,
                      isActive
                    )}`}
                  >
                    {isActive && (
                      <div
                        className={`absolute top-0 inset-x-4 h-[1.5px] bg-gradient-to-r ${getInspectorBeamColor(
                          layer.accent
                        )} pointer-events-none`}
                        aria-hidden="true"
                      />
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className={`${getAccentTextClass(layer.accent)} font-bold tabular-nums`}>
                            Layer {layer.step}
                          </span>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span className="text-slate-400 truncate">{layer.classification}</span>
                        </div>
                        <div className="text-[17px] font-semibold font-headline text-[#f8fafc] tracking-[-0.01em] leading-snug">
                          {layer.shortTitle}
                        </div>
                      </div>

                      <span
                        className={`material-symbols-outlined text-[20px] shrink-0 transition-transform duration-200 ${
                          isActive ? `${getAccentTextClass(layer.accent)} translate-x-0.5` : 'text-slate-500'
                        }`}
                        aria-hidden="true"
                      >
                        chevron_right
                      </span>
                    </div>

                    <div className="mt-3.5 pt-3 border-t border-sky-200/10 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-mono text-slate-400">
                      {layer.specs.map((spec, sIdx) => (
                        <React.Fragment key={spec.label}>
                          {sIdx > 0 && <span aria-hidden="true" className="text-slate-700">·</span>}
                          <span className="tabular-nums text-[#d8e6f7]">{spec.value}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  </button>

                  {/* Animated Directional Data-Stream SVG Connector */}
                  {!isLast && (
                    <div className="flex items-center justify-center py-1 relative" aria-hidden="true">
                      <svg width="28" height="30" viewBox="0 0 28 30" fill="none" className="overflow-visible">
                        <line
                          x1="14"
                          y1="2"
                          x2="14"
                          y2="24"
                          stroke={isActive ? '#7df4ff' : 'rgba(125, 244, 255, 0.35)'}
                          strokeWidth="1.5"
                          strokeDasharray="4 4"
                          className="animate-flow-dash"
                        />
                        <path
                          d="M9.5 19.5L14 25L18.5 19.5"
                          stroke={isActive ? '#fde68a' : 'rgba(125, 244, 255, 0.5)'}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx="14"
                          cy="4"
                          r="2.4"
                          fill={isActive ? '#ffffff' : '#7df4ff'}
                          className="why-packet-travel"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Column (7 cols): Live Technical Specification Inspector */}
          <div
            role="tabpanel"
            aria-label={activeLayer.title}
            className={`relative overflow-hidden lg:col-span-7 p-7 sm:p-9 rounded-3xl bg-gradient-to-b from-[#0b1c30] via-[#081627] to-[#061322] border flex flex-col justify-between gap-8 transition-all duration-300 ${getInspectorGlowClass(
              activeLayer.accent
            )}`}
          >
            {/* Moving Specular Top Edge Light */}
            <div className="absolute top-0 inset-x-0 h-[1.5px] overflow-hidden pointer-events-none" aria-hidden="true">
              <div className={`w-1/2 h-full bg-gradient-to-r ${getInspectorBeamColor(activeLayer.accent)} why-beam-glide`} />
            </div>

            {/* Subtle Corner Ambient Glow */}
            <div
              className={`absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-20 ${
                activeLayer.accent === 'gold'
                  ? 'bg-[#D4AF37]'
                  : activeLayer.accent === 'emerald'
                  ? 'bg-emerald-400'
                  : 'bg-[#00F0FF]'
              }`}
              aria-hidden="true"
            />

            <div key={activeLayer.id} className="relative z-10 space-y-7 why-panel-enter">
              {/* Layer Identity Header */}
              <div className="space-y-3 pb-6 border-b border-sky-200/10">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                  <span className={`${getAccentTextClass(activeLayer.accent)} font-semibold tabular-nums`}>
                    Stage {activeLayer.step} of 04 · {activeLayer.classification}
                  </span>
                  <span className="text-slate-400">Protocol Specification</span>
                </div>
                <h4 className="text-2xl sm:text-[1.75rem] font-bold font-headline tracking-[-0.02em] leading-snug text-[#f8fafc]">
                  {activeLayer.title}
                </h4>
                <p className="text-[15px] text-[#cbdcf0] leading-[1.7]">
                  {activeLayer.summary}
                </p>
              </div>

              {/* Key Quantitative Spec Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-6 border-b border-sky-200/10">
                {activeLayer.specs.map((spec) => (
                  <div key={spec.label} className="space-y-1.5">
                    <div className="text-xs font-mono text-slate-400">{spec.label}</div>
                    <div
                      className={`text-xl font-bold font-mono tabular-nums tracking-tight ${getAccentTextClass(
                        activeLayer.accent
                      )}`}
                    >
                      {spec.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Three Structured Engineering Breakdowns */}
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <div className="text-xs font-mono font-semibold text-slate-300">
                    01. Technical Mechanism
                  </div>
                  <p className="text-[14.5px] text-[#c7d9ee] leading-[1.7]">
                    {activeLayer.mechanism}
                  </p>
                </div>

                <div className="space-y-1.5 pt-4 border-t border-sky-200/10">
                  <div className="text-xs font-mono font-semibold text-slate-300">
                    02. Cryptographic &amp; Economic Guarantee
                  </div>
                  <p className="text-[14.5px] text-[#c7d9ee] leading-[1.7]">
                    {activeLayer.securityGuarantee}
                  </p>
                </div>

                <div className="space-y-1.5 pt-4 border-t border-sky-200/10">
                  <div className="text-xs font-mono font-semibold text-[#fde68a]">
                    03. Direct Impact for SPIKE Miners
                  </div>
                  <p className="text-[14.5px] text-[#f8fafc] leading-[1.7]">
                    {activeLayer.minerImpact}
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Layer Progress Track & Flow Summary Footer */}
            <div className="relative z-10 pt-5 border-t border-sky-200/10 space-y-3">
              <div className="grid grid-cols-4 gap-2" aria-hidden="true">
                {ARCHITECTURE_LAYERS.map((layer, idx) => (
                  <div
                    key={layer.id}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      idx <= activeLayerIndex
                        ? layer.accent === 'gold'
                          ? 'bg-[#fde68a] shadow-[0_0_10px_rgba(253,230,138,0.65)]'
                          : layer.accent === 'emerald'
                          ? 'bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.65)]'
                          : 'bg-[#7df4ff] shadow-[0_0_10px_rgba(125,244,255,0.65)]'
                        : 'bg-[#1a2d44]'
                    }`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
                <span>Settlement Pipeline: Golden Hawk L2 → BSC Mainnet → Nodescan V3 → Wallet USDT</span>
                <span className={`${getAccentTextClass(activeLayer.accent)} font-semibold tabular-nums`}>
                  Layer {activeLayer.step} / 04
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Interactive Bitcoin (BTC) vs. SPIKE Mining Comparison Matrix */}
      <div className="space-y-7">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="text-[#fde68a] font-medium">Head-to-Head Protocol Benchmark</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-400 tabular-nums">
                Showing {filteredRows.length} of {COMPARISON_ROWS.length} engineering dimensions
              </span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-bold font-headline tracking-[-0.025em] leading-[1.15] [text-wrap:balance] why-subheading-light">
              Bitcoin Mining vs. SPIKE Protocol Mining
            </h3>
            <p className="text-sm sm:text-[15px] text-[#9eb4ce] leading-relaxed">
              Select any dimension below to inspect the architectural and economic advantages that protect SPIKE miners.
            </p>
          </div>

          {/* Interactive Category Filter Segmented Control */}
          <div
            className="flex items-center gap-1 p-1.5 rounded-xl bg-[#071525] border border-[#1e324a] shadow-[0_0_24px_-8px_rgba(0,240,255,0.2)] overflow-x-auto max-w-full shrink-0"
            role="tablist"
            aria-label="Filter Bitcoin vs SPIKE comparison categories"
          >
            {FILTER_TABS.map((tab) => {
              const isSelected = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => handleCategoryChange(tab.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-headline font-semibold transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] ${
                    isSelected
                      ? 'bg-[#142a42] text-[#e0f9ff] border border-[#7df4ff]/50 shadow-[0_0_16px_-4px_rgba(0,240,255,0.35)]'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Comparison Matrix Container with Animated Outer Glow & Top Light Line */}
        <div className="relative rounded-3xl bg-[#071525] border border-[#D4AF37]/45 animate-box-glow-gold overflow-hidden">
          <div
            className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#fde68a]/80 to-transparent pointer-events-none"
            aria-hidden="true"
          />

          {/* Desktop Column Header */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-7 py-4.5 bg-[#0b1c30] border-b border-sky-200/10 text-xs font-mono font-semibold text-slate-300">
            <div className="col-span-3">Engineering Dimension</div>
            <div className="col-span-4 text-slate-400">Bitcoin (BTC) Legacy PoW</div>
            <div className="col-span-4 text-[#7df4ff]">SPIKE Hybrid L2 + DeFi</div>
            <div className="col-span-1 text-right text-slate-400">Inspect</div>
          </div>

          {/* Comparison Rows */}
          <div className="divide-y divide-sky-200/10">
            {filteredRows.map((row) => {
              const isExpanded = expandedMetricId === row.id;
              return (
                <div key={row.id} className="transition-colors duration-200">
                  <button
                    type="button"
                    onClick={() => setExpandedMetricId(isExpanded ? null : row.id)}
                    aria-expanded={isExpanded}
                    className={`w-full text-left px-5 sm:px-7 py-5.5 grid grid-cols-1 md:grid-cols-12 gap-4 items-start transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00F0FF] ${
                      isExpanded ? 'bg-[#0e2136]' : 'hover:bg-[#0a1a2d]'
                    }`}
                  >
                    {/* Dimension Column */}
                    <div className="md:col-span-3 space-y-1">
                      <div className="text-[11px] font-mono text-slate-400">{row.categoryLabel}</div>
                      <div className="text-[15px] sm:text-base font-semibold font-headline text-[#f8fafc] tracking-[-0.01em]">
                        {row.dimension}
                      </div>
                    </div>

                    {/* Bitcoin Column */}
                    <div className="md:col-span-4 space-y-1">
                      <div className="md:hidden text-[11px] font-mono text-slate-400">
                        Bitcoin (BTC) Legacy PoW
                      </div>
                      <div className="text-sm font-mono font-semibold text-slate-200 tabular-nums">
                        {row.btcMetric}
                      </div>
                      <p className="text-[13px] text-slate-400 leading-[1.6]">
                        {row.btcConstraint}
                      </p>
                    </div>

                    {/* SPIKE Column */}
                    <div className="md:col-span-4 space-y-1">
                      <div className="md:hidden text-[11px] font-mono text-[#7df4ff]">
                        SPIKE Hybrid L2 + DeFi
                      </div>
                      <div className="text-sm font-mono font-bold text-[#fde68a] tabular-nums">
                        {row.spikeMetric}
                      </div>
                      <p className="text-[13px] text-[#d6e5f7] leading-[1.6]">
                        {row.spikeAdvantage}
                      </p>
                    </div>

                    {/* Expand Affordance */}
                    <div className="md:col-span-1 flex items-center md:justify-end">
                      <span className="inline-flex items-center gap-1 text-xs font-mono text-[#7df4ff]">
                        <span className="md:hidden">{isExpanded ? 'Hide rationale' : 'Inspect rationale'}</span>
                        <span
                          className={`material-symbols-outlined text-[20px] transition-transform duration-200 ${
                            isExpanded ? 'rotate-180 text-[#fde68a]' : 'text-slate-400'
                          }`}
                          aria-hidden="true"
                        >
                          expand_more
                        </span>
                      </span>
                    </div>
                  </button>

                  {/* Expanded Investor Engineering Rationale Drawer */}
                  {isExpanded && (
                    <div className="px-5 sm:px-7 pb-6 pt-1 bg-[#0e2136] why-panel-enter">
                      <div className="pt-4 border-t border-sky-200/10 flex flex-col sm:flex-row sm:items-start gap-3">
                        <span className="text-xs font-mono font-semibold text-[#7df4ff] shrink-0">
                          Engineering Rationale:
                        </span>
                        <p className="text-[13.5px] sm:text-[14.5px] text-[#e6f0fc] leading-[1.7]">
                          {row.engineeringRationale}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Luminous Flagship Conversion Banner */}
      <div className="relative overflow-hidden p-7 sm:p-9 rounded-3xl bg-gradient-to-r from-[#0a1c30] via-[#0d2238] to-[#081728] border border-[#7df4ff]/45 animate-box-glow-cyan flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="absolute top-0 inset-x-0 h-[1.5px] overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="w-1/3 h-full bg-gradient-to-r from-transparent via-[#e0f9ff] to-transparent why-beam-glide" />
        </div>

        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="text-xs font-mono text-[#fde68a] tracking-wide">
            Self-Protecting DeFi Mining Economy · BNB Smart Chain
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold font-headline tracking-[-0.02em] why-subheading-light">
            Ready to Validate on the Golden Hawk Layer-2 Network?
          </h3>
          <p className="text-sm sm:text-[15px] text-[#b4c8e0] leading-[1.65]">
            Activate a zero-hardware virtual node with $10 entry, settle harvested SPIKE on-chain, and swap directly through Nodescan V3 liquidity.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
          {!isWalletConnected ? (
            <button
              type="button"
              onClick={onConnectWallet}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#e0f9ff] via-[#7df4ff] to-[#00F0FF] hover:brightness-110 text-[#051424] font-headline font-bold text-sm shadow-[0_0_28px_-4px_rgba(0,240,255,0.55)] transition-all duration-200 hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
            >
              <span>Connect Web3 Wallet</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onNavigate?.('mining-nodes')}
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#e0f9ff] via-[#7df4ff] to-[#00F0FF] hover:brightness-110 text-[#051424] font-headline font-bold text-sm shadow-[0_0_28px_-4px_rgba(0,240,255,0.55)] transition-all duration-200 hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
              >
                <span>Open Mining Nodes</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
              {onOpenSwapModal && (
                <button
                  type="button"
                  onClick={onOpenSwapModal}
                  className="px-5 py-3.5 rounded-xl bg-[#0c1d30] hover:bg-[#142b44] border border-[#fde68a]/55 shadow-[0_0_22px_-6px_rgba(212,175,55,0.35)] text-[#fde68a] font-headline font-semibold text-sm transition-all duration-200 hover:-translate-y-0.5 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fde68a]"
                >
                  Open Nodescan DEX
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
};
