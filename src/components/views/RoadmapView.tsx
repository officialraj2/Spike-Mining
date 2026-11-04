import React, { useState } from 'react';

interface MindmapLeaf {
  id: string;
  title: string;
  tagline: string;
  icon: string;
  status: 'completed' | 'in_progress' | 'upcoming';
  deliverables: string[];
  techSpec?: string;
  metric?: string;
}

interface RoadmapPhase {
  id: string;
  phase: string;
  title: string;
  quarter: string;
  status: 'completed' | 'in_progress' | 'upcoming';
  progressPercent: number;
  badge: string;
  themeColor: string;
  glowColor: string;
  borderColor: string;
  accentBg: string;
  description: string;
  leaves: MindmapLeaf[];
}

export const RoadmapView: React.FC = () => {
  const [viewMode, setViewMode] = useState<'mindmap' | 'timeline'>('mindmap');
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('all');
  const [inspectedLeaf, setInspectedLeaf] = useState<MindmapLeaf | null>(null);
  const [activeHoverNode, setActiveHoverNode] = useState<string | null>(null);

  const phases: RoadmapPhase[] = [
    {
      id: 'phase-01',
      phase: 'Phase 01',
      title: 'Genesis & Stratum Mining Launch',
      quarter: 'Q4 2024 / Q1 2025',
      status: 'completed',
      progressPercent: 100,
      badge: '100% DEPLOYED',
      themeColor: '#10B981',
      glowColor: 'rgba(16, 185, 129, 0.4)',
      borderColor: 'border-emerald-500/40',
      accentBg: 'bg-emerald-500/10',
      description:
        'Foundational blockchain architecture, verified smart contract deployment on BNB Smart Chain, Stratum node simulation engine, and real-time ledger synchronization.',
      leaves: [
        {
          id: 'p1-1',
          title: 'BEP-20 Smart Contract',
          tagline: 'On-Chain Deployment & Verification',
          icon: 'token',
          status: 'completed',
          metric: '50M Cap',
          deliverables: [
            '50,000,000 SPK maximum immutable token supply',
            'Full source code published & verified on BscScan',
            'Anti-whale transfer caps and liquidity protection mechanics',
          ],
          techSpec: 'BNB Smart Chain · Solidity 0.8.20 · OpenZeppelin Standard',
        },
        {
          id: 'p1-2',
          title: 'Stratum Mining Nodes',
          tagline: 'Virtual Rig Clustering & 24h Cycles',
          icon: 'dns',
          status: 'completed',
          metric: '100 TH/s',
          deliverables: [
            'Falcon Titan Apex & Antminer SHA-256 cloud fleet emulation',
            '24-hour autonomous reward harvesting cycle',
            'Dynamic power, temperature, and fan telemetry simulation',
          ],
          techSpec: 'Stratum v2 Protocol · Sub-100ms WebSocket sync',
        },
        {
          id: 'p1-3',
          title: 'DEX Liquidity Establishment',
          tagline: 'Nodescan V3 Initial Pair',
          icon: 'swap_horiz',
          status: 'completed',
          metric: '$1.12 Base',
          deliverables: [
            'SPK/USDT initial liquidity pool established at $1.12 baseline on Nodescan',
            'Automated slippage control and LP routing',
            'Real-time price oracle updates from AMM reserves',
          ],
          techSpec: 'Nodescan V3 · Automated Market Maker routing',
        },
        {
          id: 'p1-4',
          title: 'Real-Time State Engine',
          tagline: 'Instant Multi-Device Synchronization',
          icon: 'sync',
          status: 'completed',
          metric: '<100ms Sync',
          deliverables: [
            'Firebase Firestore & BroadcastChannel distributed state sync',
            'Sub-100ms balance updates across concurrent devices',
            'Automatic offline fallback and transaction recovery',
          ],
          techSpec: 'WebRTC / BroadcastChannel API + Firestore persistent cache',
        },
      ],
    },
    {
      id: 'phase-02',
      phase: 'Phase 02',
      title: 'Affiliate Milestones & DEX Settlement',
      quarter: 'Q2 2025 (Current)',
      status: 'in_progress',
      progressPercent: 78,
      badge: 'ACTIVE LIVE FOCUS',
      themeColor: '#00F0FF',
      glowColor: 'rgba(0, 240, 255, 0.45)',
      borderColor: 'border-[#00F0FF]/50',
      accentBg: 'bg-[#00F0FF]/10',
      description:
        '3-Tier referral affiliate engine, automated milestone unlocking ($15 to $500,000 USDT), instant DEX swap engine, and direct USDT withdrawal settlement to personal BSC wallets.',
      leaves: [
        {
          id: 'p2-1',
          title: '3-Tier Team Milestones',
          tagline: 'Progressive USDT Career Rewards',
          icon: 'groups',
          status: 'in_progress',
          metric: '$15 - $500k',
          deliverables: [
            'Tier milestones from 3 partners ($15) up to 25,000 partners ($500,000)',
            'Real-time direct and downline network tree tracking',
            'Automated milestone eligibility calculation engine',
          ],
          techSpec: 'Hierarchical recursive downline indexing algorithm',
        },
        {
          id: 'p2-2',
          title: 'Self-Custodial Payouts',
          tagline: 'Direct BSC Wallet Settlements',
          icon: 'account_balance_wallet',
          status: 'in_progress',
          metric: '0% Fee',
          deliverables: [
            'Instant 0.00 USDT balance deduction upon withdrawal request',
            'Zero protocol fee BEP-20 USDT transfer channel',
            'Locked destination wallet binding to prevent unauthorized redirection',
          ],
          techSpec: 'EIP-712 typed signature verification & on-chain transfer',
        },
        {
          id: 'p2-3',
          title: 'Nodescan Admin Ledger',
          tagline: 'Transparent Payout Verification',
          icon: 'fact_check',
          status: 'in_progress',
          metric: '100% Audit',
          deliverables: [
            'Admin review console with on-chain BscScan transaction hash linking',
            'Complete transparent breakdown: Claimed, Approved, and Remaining',
            'Audit log records with irreversible timestamp sequencing',
          ],
          techSpec: 'Role-Based Access Control (RBAC) & BscScan API verification',
        },
        {
          id: 'p2-4',
          title: 'Responsive Web3 UI',
          tagline: 'Mobile-First Terminal & Visuals',
          icon: 'devices',
          status: 'in_progress',
          metric: '120 FPS',
          deliverables: [
            'Zero-lag touch controls on mobile browsers and tablets',
            'Native Web3 wallet connector (MetaMask, TrustWallet, OKX, Rabby)',
            'Dynamic dark cybernetic theme with high-legibility type scales',
          ],
          techSpec: 'Tailwind CSS v4 · Web3Modal / EIP-1193 Provider',
        },
      ],
    },
    {
      id: 'phase-03',
      phase: 'Phase 03',
      title: 'Liquid Staking & Cross-Chain Bridges',
      quarter: 'Q3 2025',
      status: 'upcoming',
      progressPercent: 30,
      badge: 'ARCHITECTURE READY',
      themeColor: '#8B5CF6',
      glowColor: 'rgba(139, 92, 246, 0.4)',
      borderColor: 'border-purple-500/40',
      accentBg: 'bg-purple-500/10',
      description:
        'Proof-of-Stake validator clustering, liquid staking yield farms, multi-chain bridge expansion (Polygon, Arbitrum, Solana), and automated smart contracts audit.',
      leaves: [
        {
          id: 'p3-1',
          title: 'Dual-Token Staking Vaults',
          tagline: 'SPK & USDT Liquidity Farms',
          icon: 'lock_clock',
          status: 'upcoming',
          metric: 'Dynamic APY',
          deliverables: [
            'Lock-up terms: 30, 90, 180, and 365 days with tiered APY rates',
            'Compound interest auto-restaking smart contract',
            'Early emergency unstake safety mechanism with penalty burn',
          ],
          techSpec: 'ERC-4626 Tokenized Vault Standard on BSC',
        },
        {
          id: 'p3-2',
          title: 'LayerZero Cross-Chain Bridge',
          tagline: 'Multi-Network Interoperability',
          icon: 'alt_route',
          status: 'upcoming',
          metric: '4 Chains',
          deliverables: [
            'Bridge liquidity expansion to Arbitrum One, Polygon PoS, and Base',
            'OFT (Omnichain Fungible Token) standard integration',
            'Cross-chain slippage optimizer and gas relayer',
          ],
          techSpec: 'LayerZero v2 Endpoint Contracts & Oracle Mesh',
        },
        {
          id: 'p3-3',
          title: 'CertiK & Hacken Audits',
          tagline: 'Top-Tier Protocol Security Verification',
          icon: 'verified_user',
          status: 'upcoming',
          metric: '$100k Bounty',
          deliverables: [
            'Formal verification of smart contract mathematical invariants',
            'Public audit badges and comprehensive vulnerability report',
            'Bug bounty pool established on Immunefi ($100,000 reserve)',
          ],
          techSpec: 'Formal Verification · Mythril / Slither Static Analysis',
        },
        {
          id: 'p3-4',
          title: 'Mobile Mining Companion',
          tagline: 'Hardware Node Remote Manager',
          icon: 'smartphone',
          status: 'upcoming',
          metric: 'Android APK',
          deliverables: [
            'Dedicated Android APK and Progressive Web App companion',
            'Push notification alerts for harvest cycles and milestone claims',
            'Biometric wallet signing and rig telemetry widgets',
          ],
          techSpec: 'Capacitor Web3 runtime & Push API endpoints',
        },
      ],
    },
    {
      id: 'phase-04',
      phase: 'Phase 04',
      title: 'Community DAO & AI Compute Stratum',
      quarter: 'Q4 2025 & Beyond',
      status: 'upcoming',
      progressPercent: 5,
      badge: 'FUTURE HORIZON',
      themeColor: '#D4AF37',
      glowColor: 'rgba(212, 175, 55, 0.4)',
      borderColor: 'border-[#D4AF37]/40',
      accentBg: 'bg-[#D4AF37]/10',
      description:
        'Community DAO governance, decentralized compute nodes for Web3 AI workloads, and tier-1 centralized exchange listings.',
      leaves: [
        {
          id: 'p4-1',
          title: 'SPIKE DAO Governance',
          tagline: 'Decentralized Community Protocol Control',
          icon: 'how_to_vote',
          status: 'upcoming',
          metric: '100% Voting',
          deliverables: [
            'Snapshot off-chain gasless voting for token holders',
            'On-chain timelock execution for protocol fee adjustments',
            'Community treasury grant distribution for node operators',
          ],
          techSpec: 'OpenZeppelin Governor + TimelockController on BSC',
        },
        {
          id: 'p4-2',
          title: 'Decentralized AI Compute',
          tagline: 'Stratum GPU Workload Aggregation',
          icon: 'neurology',
          status: 'upcoming',
          metric: 'DePIN GPU',
          deliverables: [
            'Repurposing idle hashing rig power for LLM inference workloads',
            'Decentralized proof-of-useful-work reward algorithm',
            'API gateway for Web3 AI model fine-tuning and hosting',
          ],
          techSpec: 'DePIN Compute Network · CUDA / OpenCL Worker Node Daemon',
        },
        {
          id: 'p4-3',
          title: 'Tier-1 CEX Listings',
          tagline: 'Global Liquidity & Institutional Access',
          icon: 'domain',
          status: 'upcoming',
          metric: 'Binance / OKX',
          deliverables: [
            'Target listings: Binance, OKX, Bybit, KuCoin, Gate.io',
            'Market maker partnerships for deep global orderbook liquidity',
            'Fiat on-ramps and institutional custody via Fireblocks',
          ],
          techSpec: 'CCXT standardized API endpoints & institutional API',
        },
        {
          id: 'p4-4',
          title: 'Global Fleet Expansion',
          tagline: '100,000+ Hardware Node Network',
          icon: 'public',
          status: 'upcoming',
          metric: '100k+ Rigs',
          deliverables: [
            'Global distributed datacenter partnerships in Iceland, Norway, and Texas',
            '100% renewable geothermal and hydroelectric energy certification',
            'Hardware ASIC plug-and-play SPIKE node boxes for home miners',
          ],
          techSpec: 'Green Hashrate Verification & ESG Carbon Offset Ledger',
        },
      ],
    },
  ];

  const filteredPhases =
    selectedPhaseId === 'all'
      ? phases
      : phases.filter((p) => p.id === selectedPhaseId);

  // Overall milestone calculations
  const totalLeaves = phases.reduce((acc, p) => acc + p.leaves.length, 0);
  const completedLeaves = phases.reduce(
    (acc, p) => acc + p.leaves.filter((l) => l.status === 'completed').length,
    0
  );
  const inProgressLeaves = phases.reduce(
    (acc, p) => acc + p.leaves.filter((l) => l.status === 'in_progress').length,
    0
  );
  const overallProgress = Math.round(
    phases.reduce((acc, p) => acc + p.progressPercent, 0) / phases.length
  );

  return (
    <div className="space-y-8 select-none animate-in fade-in duration-300 pb-16">
      {/* ========================================================================= */}
      {/* 1. TOP HERO BANNER WITH DYNAMIC SHIMMER & BRAND GRAPHICS */}
      {/* ========================================================================= */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#071626] via-[#0a1b2d] to-[#040e1b] border-2 border-[#00F0FF]/40 shadow-[0_0_50px_rgba(0,240,255,0.18)] flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden group">
        {/* Ambient Animated Blurred Aura Spheres */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-[#00F0FF]/20 rounded-full blur-[100px] pointer-events-none animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-[#D4AF37]/20 rounded-full blur-[100px] pointer-events-none animate-pulse [animation-duration:4s]" />

        {/* Dynamic Light Sweep Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent pointer-events-none -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

        {/* Left Side: Brand & Visual Identity with 3D Float */}
        <div className="relative z-10 flex items-start gap-4 sm:gap-5">
          <div className="relative shrink-0">
            {/* Pulsing Radar Ring Behind Logo */}
            <div className="absolute inset-0 rounded-2xl bg-[#00F0FF] animate-radar-wave pointer-events-none" />

            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#091827] border-2 border-[#00F0FF]/60 p-2.5 flex items-center justify-center shadow-[0_0_30px_rgba(0,240,255,0.4)] relative overflow-hidden group cursor-pointer transition-transform hover:scale-105 active:scale-95 duration-300 animate-core-breathing">
              <img
                src="/spike_logo.png"
                alt="SPIKE Protocol Logo"
                className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(0,240,255,0.7)]"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-[#00F0FF]/25 to-transparent pointer-events-none" />
            </div>

            <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500 text-black shadow-md flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
              <span>v2.4</span>
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-headline font-extrabold bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 flex items-center gap-1.5 shadow-sm">
                <span className="material-symbols-outlined text-[15px] animate-spin [animation-duration:10s]">
                  hub
                </span>
                <span>SYNAPTIC PROTOCOL ARCHITECTURE</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono text-[#D4AF37] bg-[#D4AF37]/15 border border-[#D4AF37]/30">
                2025 · 2026 Horizon
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black font-headline text-white tracking-tight flex items-center gap-2.5">
              <span>SPIKE Visual Roadmap</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 font-body max-w-2xl leading-relaxed">
              Explore the technical journey, decentralized mining evolution, and smart contracts architecture through an interactive neural mindmap.
            </p>
          </div>
        </div>

        {/* Right Side: Animated Protocol Progress Console */}
        <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div className="p-4 rounded-2xl bg-[#05111e]/90 border border-[#1c2b3b] shadow-inner space-y-2.5 min-w-[220px] relative overflow-hidden">
            {/* Background laser sweep */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent animate-laser-sweep" />

            <div className="flex items-center justify-between text-xs font-headline font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#00F0FF] animate-pulse">
                  speed
                </span>
                <span>Protocol Readiness</span>
              </span>
              <span className="font-mono text-[#00F0FF] font-black text-sm tabular-nums">
                {overallProgress}%
              </span>
            </div>

            {/* Glowing Multi-Segment Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-[#0d1d2d] overflow-hidden border border-[#1c2b3b] relative">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#10B981] via-[#00F0FF] to-[#D4AF37] transition-all duration-700 shadow-[0_0_15px_rgba(0,240,255,0.7)] relative"
                style={{ width: `${overallProgress}%` }}
              >
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-white rounded-full shadow-[0_0_8px_white] animate-pulse" />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {completedLeaves} Deployed
              </span>
              <span className="text-[#00F0FF] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-ping" />
                {inProgressLeaves} Active
              </span>
              <span className="text-slate-500">
                {totalLeaves - completedLeaves - inProgressLeaves} Upcoming
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CONTROL BAR: DYNAMIC FILTERS & VIEW MODE SWITCHER */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a1523] p-3 rounded-2xl border border-[#1c2b3b] shadow-sm">
        {/* Phase Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedPhaseId('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-headline font-bold transition-all whitespace-nowrap cursor-pointer active:scale-95 flex items-center gap-1.5 ${
              selectedPhaseId === 'all'
                ? 'bg-gradient-to-r from-[#00F0FF] to-[#00b4d8] text-[#05111e] shadow-[0_0_18px_rgba(0,240,255,0.4)]'
                : 'text-slate-400 hover:text-white bg-[#0e1e30] border border-[#1c2b3b]'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">select_all</span>
            <span>All Clusters (4)</span>
          </button>

          {phases.map((p) => {
            const isActive = selectedPhaseId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPhaseId(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-headline font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                  isActive
                    ? 'text-white border shadow-md'
                    : 'text-slate-400 hover:text-white bg-[#0e1e30] border border-[#1c2b3b]'
                }`}
                style={{
                  borderColor: isActive ? p.themeColor : undefined,
                  backgroundColor: isActive ? `${p.themeColor}26` : undefined,
                  boxShadow: isActive ? `0 0 18px ${p.glowColor}` : undefined,
                }}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${p.status === 'in_progress' ? 'animate-pulse' : ''}`}
                  style={{ backgroundColor: p.themeColor }}
                />
                <span>{p.phase}</span>
              </button>
            );
          })}
        </div>

        {/* View Mode Toggle (Mindmap vs Linear Matrix) */}
        <div className="flex items-center gap-1 bg-[#05111e] p-1 rounded-xl border border-[#1c2b3b] self-end md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('mindmap')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-headline font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'mindmap'
                ? 'bg-gradient-to-r from-[#00F0FF] to-[#00b4d8] text-[#05111e] shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">account_tree</span>
            <span>Mindmap View</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-headline font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'timeline'
                ? 'bg-gradient-to-r from-[#00F0FF] to-[#00b4d8] text-[#05111e] shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">view_timeline</span>
            <span>Timeline Matrix</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. VIEW MODE 1: DYNAMIC SYNAPTIC MINDMAP CANVAS WITH ANIMATED CONNECTORS */}
      {/* ========================================================================= */}
      {viewMode === 'mindmap' && (
        <div className="space-y-10 animate-in fade-in duration-300">
          {/* Central Nexus Core Node */}
          <div className="relative flex flex-col items-center justify-center p-6 sm:p-12 rounded-3xl bg-gradient-to-b from-[#091a2e] via-[#051322] to-[#030b14] border-2 border-[#00F0FF]/50 shadow-[0_0_60px_rgba(0,240,255,0.22)] text-center overflow-hidden">
            {/* Background Circuit Grid Lines */}
            <div className="absolute inset-0 bg-[radial-gradient(#00F0FF_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

            {/* Glowing Orbital Rings with Satellite Beacons */}
            <div className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full border border-[#00F0FF]/25 animate-spin [animation-duration:35s] pointer-events-none flex items-start justify-center">
              <div className="w-3 h-3 rounded-full bg-[#00F0FF] shadow-[0_0_12px_#00F0FF] -mt-1.5 animate-ping" />
            </div>

            <div className="absolute w-80 h-80 sm:w-[440px] sm:h-[440px] rounded-full border border-dashed border-[#D4AF37]/25 animate-spin [animation-duration:50s] [animation-direction:reverse] pointer-events-none flex items-end justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] shadow-[0_0_10px_#D4AF37] -mb-1" />
            </div>

            <div className="absolute w-96 h-96 sm:w-[500px] sm:h-[500px] rounded-full border border-emerald-500/10 pointer-events-none" />

            {/* Center Nexus Emblem with Logo & Pulsing Aura */}
            <div className="relative z-10 flex flex-col items-center space-y-3.5">
              <div className="relative group cursor-pointer">
                {/* Outward expanding radar ripple */}
                <div className="absolute -inset-4 rounded-3xl bg-[#00F0FF]/20 animate-radar-wave pointer-events-none" />

                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-b from-[#0d2642] to-[#061424] border-2 border-[#00F0FF] p-3.5 flex items-center justify-center shadow-[0_0_40px_rgba(0,240,255,0.6)] transform transition-transform group-hover:scale-110 duration-300 animate-core-breathing">
                  <img
                    src="/spike_logo.png"
                    alt="SPIKE Central Core"
                    className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(0,240,255,0.8)]"
                  />
                </div>
                <div className="absolute -top-2 -right-2 px-2.5 py-0.5 rounded-full text-[10px] font-headline font-black bg-gradient-to-r from-[#D4AF37] via-[#fff0a8] to-[#D4AF37] text-black shadow-lg animate-pulse">
                  NEXUS
                </div>
              </div>

              <div>
                <span className="text-[11px] font-mono tracking-widest text-[#00F0FF] uppercase block font-bold">
                  Core Protocol Origin
                </span>
                <h2 className="text-xl sm:text-2xl font-black font-headline text-white tracking-tight mt-0.5">
                  SPIKE Stratum Consensus Engine
                </h2>
                <p className="text-xs text-slate-300 font-body max-w-lg mt-1 mx-auto leading-relaxed">
                  Decentralized BEP-20 mining infrastructure powering multi-tiered affiliate network nodes, automated liquidity provision, and AI compute strata.
                </p>
              </div>

              {/* Core Vital Badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <span className="px-3 py-1 rounded-xl bg-[#0e2238] border border-[#1c3854] text-xs font-mono text-slate-300 flex items-center gap-1.5 shadow-inner">
                  <span className="text-[#00F0FF] font-bold">Contract:</span>
                  <span>BEP-20 Verified</span>
                </span>
                <span className="px-3 py-1 rounded-xl bg-[#0e2238] border border-[#1c3854] text-xs font-mono text-slate-300 flex items-center gap-1.5 shadow-inner">
                  <span className="text-[#D4AF37] font-bold">Supply:</span>
                  <span>50M Fixed Max</span>
                </span>
                <span className="px-3 py-1 rounded-xl bg-[#0e2238] border border-[#1c3854] text-xs font-mono text-slate-300 flex items-center gap-1.5 shadow-inner">
                  <span className="text-emerald-400 font-bold">Chain:</span>
                  <span>BNB Smart Chain</span>
                </span>
              </div>
            </div>

            {/* Connecting Synaptic Energy Stream radiating to clusters */}
            <div className="relative mt-8 flex flex-col items-center">
              {/* Animated SVG Laser Dash Connector */}
              <svg className="w-16 h-12 overflow-visible" viewBox="0 0 64 48">
                <line
                  x1="32"
                  y1="0"
                  x2="32"
                  y2="48"
                  stroke="#00F0FF"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  className="animate-flow-dash"
                />
              </svg>
              <div className="w-3.5 h-3.5 rounded-full bg-[#00F0FF] shadow-[0_0_15px_#00F0FF] -mt-1 animate-ping" />
            </div>
          </div>

          {/* Mindmap Clusters: Each Phase with Dynamic Glowing Leaves */}
          <div className="space-y-12">
            {filteredPhases.map((phase, pIdx) => {
              const isCompleted = phase.status === 'completed';
              const isInProgress = phase.status === 'in_progress';

              return (
                <div
                  key={phase.id}
                  className={`p-6 sm:p-8 rounded-3xl bg-[#071322] border-2 transition-all duration-300 relative overflow-hidden shadow-xl ${
                    isInProgress
                      ? 'border-[#00F0FF]/60 shadow-[0_0_45px_rgba(0,240,255,0.22)] animate-box-glow-cyan'
                      : isCompleted
                      ? 'border-emerald-500/40 shadow-[0_0_35px_rgba(16,185,129,0.12)] animate-box-glow-emerald'
                      : pIdx === 2
                      ? 'border-[#D4AF37]/40 animate-box-glow-gold'
                      : 'border-purple-500/40 animate-box-glow-purple'
                  }`}
                >
                  {/* Background Watermark Number */}
                  <div
                    className="absolute -top-4 -right-2 text-7xl sm:text-8xl font-black font-headline select-none pointer-events-none opacity-5 transition-opacity"
                    style={{ color: phase.themeColor }}
                  >
                    0{pIdx + 1}
                  </div>

                  {/* Top Laser Stripe on Active Sprint Cluster */}
                  {isInProgress && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent animate-laser-sweep" />
                  )}

                  {/* Phase Hub Node (Cluster Parent Header) */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#1c2b3b] relative z-10">
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md font-headline font-black text-lg border transition-transform hover:scale-105 duration-200"
                        style={{
                          backgroundColor: `${phase.themeColor}1a`,
                          borderColor: `${phase.themeColor}66`,
                          color: phase.themeColor,
                          boxShadow: `0 0 20px ${phase.glowColor}`,
                        }}
                      >
                        0{pIdx + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-xs font-mono font-bold tracking-wider uppercase"
                            style={{ color: phase.themeColor }}
                          >
                            {phase.phase} · {phase.quarter}
                          </span>

                          <span
                            className="px-2.5 py-0.5 rounded-full text-[11px] font-headline font-extrabold flex items-center gap-1.5 border shadow-sm"
                            style={{
                              backgroundColor: `${phase.themeColor}22`,
                              borderColor: `${phase.themeColor}66`,
                              color: phase.themeColor,
                            }}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isInProgress ? 'animate-ping' : ''
                              }`}
                              style={{ backgroundColor: phase.themeColor }}
                            />
                            <span>{phase.badge}</span>
                          </span>
                        </div>

                        <h3 className="text-xl sm:text-2xl font-black font-headline text-white mt-1">
                          {phase.title}
                        </h3>

                        <p className="text-xs text-slate-300 font-body max-w-3xl mt-1 leading-relaxed">
                          {phase.description}
                        </p>
                      </div>
                    </div>

                    {/* Progress Indicator for Cluster with Animated Track */}
                    <div className="flex lg:flex-col items-center lg:items-end justify-between gap-1.5 bg-[#0b1c2e] p-3 rounded-2xl border border-[#1c2b3b] shrink-0 shadow-inner">
                      <span className="text-[11px] font-body text-slate-400">Cluster Readiness:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full bg-[#05111e] overflow-hidden border border-[#1c2b3b]">
                          <div
                            className="h-full rounded-full transition-all duration-700 shadow-sm"
                            style={{
                              width: `${phase.progressPercent}%`,
                              backgroundColor: phase.themeColor,
                              boxShadow: `0 0 10px ${phase.glowColor}`,
                            }}
                          />
                        </div>
                        <span
                          className="font-mono text-xs font-black tabular-nums"
                          style={{ color: phase.themeColor }}
                        >
                          {phase.progressPercent}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mindmap Leaves / Branches radiating out from Phase Hub */}
                  <div className="pt-6 relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-headline font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span
                          className="material-symbols-outlined text-[16px] animate-pulse"
                          style={{ color: phase.themeColor }}
                        >
                          account_tree
                        </span>
                        <span>Mindmap Deliverable Leaves ({phase.leaves.length})</span>
                      </span>
                      <span className="text-[11px] font-body text-slate-400">
                        Tap node for technical blueprint &amp; invariants
                      </span>
                    </div>

                    {/* 4 Interactive Leaf Nodes Grid with SVG Synapse Connections */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {phase.leaves.map((leaf) => {
                        const isLeafDone = leaf.status === 'completed';
                        const isLeafActive = leaf.status === 'in_progress';
                        const isHovered = activeHoverNode === leaf.id;

                        return (
                          <div
                            key={leaf.id}
                            onMouseEnter={() => setActiveHoverNode(leaf.id)}
                            onMouseLeave={() => setActiveHoverNode(null)}
                            onClick={() => setInspectedLeaf(leaf)}
                            className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden active:scale-95 ${
                              isLeafActive
                                ? 'bg-gradient-to-b from-[#0d2238] to-[#071524] border-[#00F0FF]/60 hover:border-[#00F0FF] animate-box-glow-cyan -translate-y-1'
                                : isLeafDone
                                ? 'bg-[#091b2c] border-emerald-500/35 hover:border-emerald-500/70 animate-box-glow-emerald hover:-translate-y-1'
                                : 'bg-[#071322] border-purple-500/30 hover:border-slate-400 hover:-translate-y-1 animate-box-glow-purple'
                            }`}
                          >
                            {/* Animated SVG Branch Stem at top of card */}
                            <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden pointer-events-none">
                              <div
                                className={`w-full h-full transition-transform duration-500 ${
                                  isHovered ? 'scale-x-100' : 'scale-x-75'
                                }`}
                                style={{ backgroundColor: phase.themeColor }}
                              />
                            </div>

                            <div>
                              {/* Top Icon & Status Row */}
                              <div className="flex items-center justify-between mb-3">
                                <div
                                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-md"
                                  style={{
                                    backgroundColor: `${phase.themeColor}1f`,
                                    borderColor: `${phase.themeColor}55`,
                                    color: phase.themeColor,
                                    boxShadow: isHovered ? `0 0 15px ${phase.glowColor}` : undefined,
                                  }}
                                >
                                  <span className="material-symbols-outlined text-[20px]">
                                    {leaf.icon}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {leaf.metric && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#05111e] border border-[#1c2b3b] text-slate-300">
                                      {leaf.metric}
                                    </span>
                                  )}
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-headline font-bold uppercase tracking-wider flex items-center gap-1 ${
                                      isLeafDone
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                        : isLeafActive
                                        ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/50 animate-pulse'
                                        : 'bg-[#1c2b3b] text-slate-400 border border-[#2d4257]'
                                    }`}
                                  >
                                    {isLeafDone ? '✓ DONE' : isLeafActive ? '● SPRINT' : '○ QUEUED'}
                                  </span>
                                </div>
                              </div>

                              {/* Leaf Title & Tagline */}
                              <h4 className="text-sm font-headline font-extrabold text-white group-hover:text-[#00F0FF] transition-colors line-clamp-1">
                                {leaf.title}
                              </h4>
                              <p className="text-[11px] font-body text-slate-400 mt-0.5 line-clamp-1">
                                {leaf.tagline}
                              </p>

                              {/* Deliverable Checkpoints Preview */}
                              <div className="mt-3.5 pt-2.5 border-t border-[#1c2b3b]/70 space-y-1.5">
                                {leaf.deliverables.slice(0, 2).map((d, dIdx) => (
                                  <div
                                    key={dIdx}
                                    className="text-[11px] font-body text-slate-300 flex items-start gap-1.5 leading-tight"
                                  >
                                    <span
                                      className="material-symbols-outlined text-[13px] shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5"
                                      style={{ color: phase.themeColor }}
                                    >
                                      chevron_right
                                    </span>
                                    <span className="truncate">{d}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Card Footer: Interactive CTA */}
                            <div className="mt-4 pt-2.5 border-t border-[#1c2b3b]/60 flex items-center justify-between text-[11px] font-headline font-bold text-slate-400 group-hover:text-white transition-colors">
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: phase.themeColor }} />
                                <span>Inspect Node</span>
                              </span>
                              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform" style={{ color: phase.themeColor }}>
                                arrow_forward
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. VIEW MODE 2: LINEAR TIMELINE MATRIX WITH LASER TRACER */}
      {/* ========================================================================= */}
      {viewMode === 'timeline' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="relative border-l-2 border-[#1c2b3b] ml-4 sm:ml-8 pl-6 sm:pl-10 space-y-10">
            {/* Animated Laser Progress Spine */}
            <div className="absolute top-0 bottom-0 -left-[2px] w-[2px] bg-gradient-to-b from-[#10B981] via-[#00F0FF] to-transparent pointer-events-none" />

            {filteredPhases.map((phase, pIdx) => {
              const isDone = phase.status === 'completed';
              const isLive = phase.status === 'in_progress';

              return (
                <div key={phase.id} className="relative group">
                  {/* Timeline Node Bead with Radial Ripple */}
                  <div
                    className={`absolute -left-[35px] sm:-left-[51px] top-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 flex items-center justify-center transition-all shadow-md group-hover:scale-125 duration-200 ${
                      isLive
                        ? 'bg-[#00F0FF] border-white shadow-[0_0_20px_#00F0FF] animate-pulse'
                        : isDone
                        ? 'bg-emerald-500 border-white shadow-[0_0_15px_#10B981]'
                        : 'bg-[#071322] border-[#2c3e50]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px] text-black font-bold">
                      {isDone ? 'check' : isLive ? 'play_arrow' : 'schedule'}
                    </span>
                  </div>

                  {/* Phase Timeline Card */}
                  <div
                    className={`p-6 sm:p-7 rounded-3xl border transition-all duration-300 hover:shadow-xl ${
                      isLive
                        ? 'bg-gradient-to-r from-[#0d2238] to-[#071524] border-[#00F0FF]/50 shadow-[0_0_35px_rgba(0,240,255,0.18)]'
                        : isDone
                        ? 'bg-[#091b2c] border-emerald-500/40'
                        : 'bg-[#071322] border-[#1c2b3b]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="font-mono text-xs font-bold uppercase tracking-wider"
                          style={{ color: phase.themeColor }}
                        >
                          {phase.phase} · {phase.quarter}
                        </span>
                        <span
                          className="px-2.5 py-0.5 rounded text-[11px] font-headline font-bold uppercase"
                          style={{
                            backgroundColor: `${phase.themeColor}22`,
                            color: phase.themeColor,
                            border: `1px solid ${phase.themeColor}55`,
                          }}
                        >
                          {phase.badge}
                        </span>
                      </div>

                      <span className="font-mono text-xs font-bold text-slate-300">
                        {phase.progressPercent}% Delivered
                      </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black font-headline text-white mb-2">
                      {phase.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-300 font-body mb-5 leading-relaxed">
                      {phase.description}
                    </p>

                    {/* Timeline Deliverables Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-[#1c2b3b]/70">
                      {phase.leaves.map((leaf) => (
                        <div
                          key={leaf.id}
                          onClick={() => setInspectedLeaf(leaf)}
                          className="p-3.5 rounded-xl bg-[#05111e] border border-[#1c2b3b] hover:border-[#00F0FF]/50 cursor-pointer transition-all flex items-start gap-3 hover:-translate-y-0.5 shadow-sm"
                        >
                          <span
                            className="material-symbols-outlined text-[20px] shrink-0 mt-0.5"
                            style={{ color: phase.themeColor }}
                          >
                            {leaf.icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <h5 className="text-xs font-headline font-bold text-white truncate">
                                {leaf.title}
                              </h5>
                              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                {leaf.status === 'completed'
                                  ? 'Done'
                                  : leaf.status === 'in_progress'
                                  ? 'Active'
                                  : 'Queued'}
                              </span>
                            </div>
                            <p className="text-[11px] font-body text-slate-400 truncate mt-0.5">
                              {leaf.tagline}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. NODE SPECIFICATION INSPECTOR MODAL WITH SPRING ANIMATION */}
      {/* ========================================================================= */}
      {inspectedLeaf && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setInspectedLeaf(null)}
        >
          <div
            className="w-full max-w-lg p-6 sm:p-7 rounded-3xl bg-[#081728] border-2 border-[#00F0FF]/50 shadow-[0_0_70px_rgba(0,240,255,0.35)] space-y-5 relative overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top ambient laser streak */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent animate-laser-sweep" />

            {/* Header Lockup */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] flex items-center justify-center shrink-0 shadow-lg animate-core-breathing">
                  <span className="material-symbols-outlined text-[24px]">
                    {inspectedLeaf.icon}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-[#00F0FF] font-bold uppercase">
                      Deliverable Spec
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-headline font-extrabold uppercase ${
                        inspectedLeaf.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : inspectedLeaf.status === 'in_progress'
                          ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 animate-pulse'
                          : 'bg-[#1c2b3b] text-slate-400 border border-[#2d4257]'
                      }`}
                    >
                      {inspectedLeaf.status === 'completed'
                        ? '100% Verified'
                        : inspectedLeaf.status === 'in_progress'
                        ? 'In Sprint'
                        : 'Scheduled'}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-headline font-extrabold text-white mt-0.5">
                    {inspectedLeaf.title}
                  </h3>
                  <p className="text-xs font-body text-slate-300">
                    {inspectedLeaf.tagline}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectedLeaf(null)}
                className="w-8 h-8 rounded-xl bg-[#0d2238] hover:bg-[#163554] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Technical Specifications Strip */}
            {inspectedLeaf.techSpec && (
              <div className="p-3.5 rounded-xl bg-[#05111e] border border-[#1c2b3b] space-y-1 shadow-inner">
                <span className="text-[10px] font-headline font-bold uppercase tracking-wider text-slate-400 block">
                  Technical Architecture &amp; Stack
                </span>
                <span className="text-xs font-mono text-[#D4AF37] font-semibold block">
                  {inspectedLeaf.techSpec}
                </span>
              </div>
            )}

            {/* Key Deliverables Checkpoint List */}
            <div className="space-y-2.5">
              <span className="text-xs font-headline font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-emerald-400">
                  task_alt
                </span>
                <span>Milestone Scope &amp; Invariants</span>
              </span>

              <div className="space-y-2">
                {inspectedLeaf.deliverables.map((d, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#0a1a2b] border border-[#1c2b3b] flex items-start gap-2.5 text-xs text-slate-200 font-body hover:border-[#00F0FF]/30 transition-colors"
                  >
                    <span
                      className={`material-symbols-outlined text-[16px] shrink-0 mt-0.5 ${
                        inspectedLeaf.status === 'completed'
                          ? 'text-emerald-400'
                          : inspectedLeaf.status === 'in_progress'
                          ? 'text-[#00F0FF]'
                          : 'text-slate-500'
                      }`}
                    >
                      {inspectedLeaf.status === 'completed'
                        ? 'check_circle'
                        : inspectedLeaf.status === 'in_progress'
                        ? 'pending'
                        : 'radio_button_unchecked'}
                    </span>
                    <span className="leading-relaxed">{d}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Action */}
            <div className="pt-3 border-t border-[#1c2b3b] flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-body">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>On-chain verified by SPIKE Nodescan</span>
              </div>

              <button
                type="button"
                onClick={() => setInspectedLeaf(null)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#00b4d8] hover:from-[#7df4ff] hover:to-[#00F0FF] text-[#05111e] text-xs font-headline font-bold transition-all cursor-pointer shadow-md active:scale-95"
              >
                Close Spec
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
