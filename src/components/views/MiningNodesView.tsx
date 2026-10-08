import React, { useState } from 'react';
import { MiningNode } from '../../types';

interface MiningNodesViewProps {
  nodes: MiningNode[];
  onRestartNode: (nodeId: string) => void;
  onStopNode: (nodeId: string) => void;
  onStartNode: (nodeId: string) => void;
  onOpenDeployModal: () => void;
  onNavigateToReferrals?: () => void;
  onResetToFreshUser?: () => void;
  onOpenTestnetModal?: () => void;
}

export const MiningNodesView: React.FC<MiningNodesViewProps> = ({
  nodes,
  onRestartNode,
  onStopNode,
  onStartNode,
  onOpenDeployModal,
  onNavigateToReferrals,
  onResetToFreshUser,
  onOpenTestnetModal,
}) => {
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedNodeLogs, setSelectedNodeLogs] = useState<MiningNode | null>(nodes[0] || null);
  // Turbo 10x is permanently fixed
  const overclockMode = 'turbo';

  const filteredNodes = nodes.filter((n) => {
    if (filterRegion !== 'all' && !n.region.includes(filterRegion)) return false;
    if (filterStatus !== 'all' && n.status !== filterStatus) return false;
    return true;
  });

  const totalHashrate = nodes
    .filter((n) => n.status === 'mining')
    .reduce((acc, curr) => acc + curr.hashrate, 0);

  const totalPower = nodes
    .filter((n) => n.status === 'mining')
    .reduce((acc, curr) => acc + curr.powerUsage, 0);

  const avgTemp = nodes.length > 0
    ? Math.round(nodes.reduce((acc, curr) => acc + curr.temperature, 0) / nodes.length)
    : 0;

  return (
    <div className="flex flex-col w-full space-y-6 md:space-y-8 pb-12">
      {/* Top Banner & Quick Telemetry */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-headline text-white tracking-tight">
            Mining Nodes &amp; Hardware Telemetry
          </h1>
          <p className="text-xs md:text-sm text-[#94a3b8] mt-0.5">
            Stratum+ssl ASIC rig clustering, real-time temperature throttling &amp; BSC validator routing
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenDeployModal}
            className="bg-[#00F0FF] text-[#0A0F1D] hover:bg-[#7df4ff] font-headline font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-[0_0_18px_rgba(0,240,255,0.3)] tracking-wide active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Deploy New Node</span>
          </button>
        </div>
      </div>

      {/* Hardware Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#122130] rounded-xl p-5 border border-[#1c2b3b]/60 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#94a3b8] font-mono font-semibold uppercase tracking-[0.14em]">Combined Hashrate</div>
            <div className="text-2xl lg:text-3xl font-extrabold font-headline text-white mt-1 tabular-nums tracking-tight">
              {totalHashrate.toFixed(2)} <span className="text-sm text-[#00F0FF] font-semibold">TH/s</span>
            </div>
            <div className="text-[11px] text-[#7df4ff] font-mono mt-0.5">Stratum SHA-256 Engine</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#00F0FF]/10 text-[#00F0FF] flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">speed</span>
          </div>
        </div>

        <div className="bg-[#122130] rounded-xl p-5 border border-[#1c2b3b]/60 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#94a3b8] font-mono font-semibold uppercase tracking-[0.14em]">Cluster Power Draw</div>
            <div className="text-2xl lg:text-3xl font-extrabold font-headline text-white mt-1 tabular-nums tracking-tight">
              {totalPower} <span className="text-sm text-[#D4AF37] font-semibold">Watts</span>
            </div>
            <div className="text-[11px] text-[#94a3b8] font-mono mt-0.5">~{(totalPower / 1000).toFixed(2)} kWh Load</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">bolt</span>
          </div>
        </div>

        <div className="bg-[#122130] rounded-xl p-5 border border-[#1c2b3b]/60 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#94a3b8] font-mono font-semibold uppercase tracking-[0.14em]">Average Temp</div>
            <div className="text-2xl lg:text-3xl font-extrabold font-headline text-white mt-1 tabular-nums tracking-tight">
              {nodes.length > 0 ? `${avgTemp}°C` : '-- °C'}
            </div>
            <div className="text-[11px] text-emerald-400 font-mono mt-0.5">
              {nodes.length > 0 ? 'Hydro Cooling Nominal' : 'Standby / 0 Nodes'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">thermostat</span>
          </div>
        </div>

        <div className="bg-[#122130] rounded-xl p-5 border border-[#1c2b3b]/60 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#94a3b8] font-mono font-semibold uppercase tracking-[0.14em]">Tuning Profile</div>
            <div className="text-lg font-bold font-headline text-[#00F0FF] mt-1 capitalize tracking-wide flex items-center gap-2">
              <span>Turbo 10X Mode</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40 font-bold animate-pulse">
                FIXED
              </span>
            </div>
            <div className="text-[11px] text-[#D4AF37] font-mono mt-1 flex items-center gap-1 font-semibold">
              <span className="material-symbols-outlined text-[13px]">bolt</span>
              <span>10X Turbo Overclock Locked &amp; Active</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">bolt</span>
          </div>
        </div>
      </div>

      {/* Filter and Control Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#122130] p-4 rounded-xl border border-[#1c2b3b]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#c6c6cc] font-headline mr-2">Filters:</span>
          {/* Status Filter */}
          <div className="flex rounded-lg bg-[#0d1d2c] p-1 border border-[#1c2b3b]">
            {[
              { id: 'all', label: 'All' },
              { id: 'mining', label: 'Mining' },
              { id: 'idle', label: 'Idle' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFilterStatus(btn.id)}
                className={`px-3 py-1 text-xs rounded-md font-headline transition-colors ${
                  filterStatus === btn.id
                    ? 'bg-[#1c2b3b] text-[#00F0FF] font-semibold'
                    : 'text-[#c6c6cc] hover:text-white'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Region Filter */}
          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[#0d1d2c] border border-[#1c2b3b] text-xs text-[#c6c6cc] focus:outline-none focus:border-[#00F0FF]"
          >
            <option value="all">All Regions</option>
            <option value="US-East">US-East (Virginia)</option>
            <option value="EU-Central">EU-Central (Frankfurt)</option>
            <option value="AP-Southeast">AP-Southeast (Singapore)</option>
            <option value="SA-East">SA-East (São Paulo)</option>
          </select>
        </div>

        <div className="text-xs text-[#c6c6cc] font-mono">
          Showing <span className="text-white font-bold">{filteredNodes.length}</span> of {nodes.length} nodes
        </div>
      </div>

      {/* Nodes Detail Grid */}
      {filteredNodes.length === 0 ? (
        <div className="py-14 px-6 rounded-2xl bg-[#0a0f1d] border border-[#1c2b3b] text-center flex flex-col items-center justify-center space-y-3.5">
          <div className="w-16 h-16 rounded-2xl bg-[#00F0FF]/10 text-[#00F0FF] flex items-center justify-center border border-[#00F0FF]/30 shadow-[0_0_20px_rgba(0,240,255,0.15)]">
            <span className="material-symbols-outlined text-[34px]">dns</span>
          </div>
          <div className="max-w-md">
            <h3 className="text-lg font-bold font-headline text-white">No Mining Rigs in Fleet</h3>
            <p className="text-xs text-[#94a3b8] mt-1.5 leading-relaxed">
              You haven't deployed any mining rigs to this wallet yet. Choose a starter (15 USDT), standard (75 USDT), or cluster node to start hashing on the BSC validator sublayer.
            </p>
          </div>
          <button
            onClick={onOpenDeployModal}
            className="mt-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#38e8f8] hover:brightness-110 text-[#0A0F1D] font-headline font-black text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all hover:scale-105 active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Deploy First Node (from 15 USDT)</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredNodes.map((node) => {
          const isMining = node.status === 'mining';
          const isSelected = selectedNodeLogs?.id === node.id;

          return (
            <div
              key={node.id}
              className={`bg-[#122130] rounded-xl p-5 border transition-all ${
                isSelected
                  ? 'border-[#00F0FF]/60 shadow-[0_0_20px_rgba(0,240,255,0.1)]'
                  : 'border-[#1c2b3b] hover:border-[#1c2b3b]/80'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isMining
                        ? 'bg-[#00F0FF]/10 text-[#00F0FF]'
                        : 'bg-[#1c2b3b] text-[#c6c6cc]'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-[20px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      dns
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-base font-headline text-white">{node.name}</h3>
                    <div className="text-xs text-[#c6c6cc] font-mono">{node.region}</div>
                  </div>
                </div>

                {/* Status Badge */}
                {isMining ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-pulse"></span>
                    Mining Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#1c2b3b] text-[#c6c6cc]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#909096]"></span>
                    Idle Standby
                  </span>
                )}
              </div>

              {/* Hardware Telemetry Progress & Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-[#0a0f1d] border border-[#1c2b3b] mb-4 text-xs">
                <div>
                  <div className="text-[#c6c6cc]">Hashrate</div>
                  <div className="text-sm font-bold font-mono text-white mt-0.5">
                    {node.hashrate.toFixed(2)} TH/s
                  </div>
                </div>
                <div>
                  <div className="text-[#c6c6cc]">Temp / Fan</div>
                  <div className="text-sm font-bold font-mono text-[#D4AF37] mt-0.5">
                    {node.temperature}°C / {node.fanSpeed}%
                  </div>
                </div>
                <div>
                  <div className="text-[#c6c6cc]">Shares</div>
                  <div className="text-sm font-bold font-mono text-white mt-0.5">
                    {node.shareAcceptance}%
                  </div>
                </div>
                <div>
                  <div className="text-[#c6c6cc]">Power</div>
                  <div className="text-sm font-bold font-mono text-[#00F0FF] mt-0.5">
                    {node.powerUsage}W
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setSelectedNodeLogs(node)}
                  className={`text-xs font-mono flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-colors ${
                    isSelected
                      ? 'bg-[#00F0FF]/10 text-[#00F0FF] border-[#00F0FF]/30'
                      : 'bg-[#1c2b3b] text-[#c6c6cc] border-transparent hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">terminal</span>
                  <span>Inspect Console</span>
                </button>

                <div className="flex items-center gap-2">
                  {isMining ? (
                    <>
                      <button
                        onClick={() => onRestartNode(node.id)}
                        className="p-2 rounded-lg bg-[#1c2b3b] hover:bg-[#273647] text-[#D4AF37] transition-colors"
                        title="Restart Node"
                      >
                        <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                      </button>
                      <button
                        onClick={() => onStopNode(node.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#1c2b3b] hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">stop</span>
                        <span>Pause</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => onStartNode(node.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#00F0FF] text-[#0A0F1D] font-bold text-xs hover:bg-[#7df4ff] transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                      <span>Start Mining</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Live Stratum Console Logs Viewer */}
      {selectedNodeLogs && (
        <div className="bg-[#0a0f1d] rounded-xl p-5 border border-[#1c2b3b] shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#1c2b3b] mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00F0FF] text-[18px]">terminal</span>
              <span className="text-xs font-bold font-mono text-white">
                Live Stratum Daemon Logs — {selectedNodeLogs.name}
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#00F0FF] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-ping" />
              Stream Connected
            </span>
          </div>

          <div className="bg-[#051424] rounded-lg p-3.5 font-mono text-xs text-[#c6c6cc] space-y-1 max-h-48 overflow-y-auto">
            {selectedNodeLogs.logs.map((log, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="text-[#00F0FF]/70 select-none">&gt;</span>
                <span className={log.includes('accepted') ? 'text-emerald-400' : 'text-[#d4e4fa]'}>
                  {log}
                </span>
              </div>
            ))}
            <div className="flex gap-2 animate-pulse text-[#00F0FF]">
              <span className="select-none">&gt;</span>
              <span>listening on port 3333 (stratum+ssl)...</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          REFERRAL SYSTEM (DIRECT ACTION BELOW MINING NODES)
         ============================================================ */}
      <div className="bg-[#122130] rounded-2xl p-5 md:p-6 border border-[#1c2b3b] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#00F0FF]/20 to-[#D4AF37]/20 border border-[#00F0FF]/30 flex items-center justify-center text-[#00F0FF] shrink-0">
            <span className="material-symbols-outlined text-[26px]">groups</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold font-headline text-white">
                Team Network &amp; Hashrate Expansion
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40">
                UP TO $200,000 USDT
              </span>
            </div>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Build your partner team. Reaching team partner milestones unlocks instant USDT bonuses.
            </p>
          </div>
        </div>

        {onNavigateToReferrals && (
          <button
            onClick={onNavigateToReferrals}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#00F0FF] via-[#38e8f8] to-[#D4AF37] text-[#0A0F1D] font-headline font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(0,240,255,0.35)] hover:shadow-[0_0_28px_rgba(0,240,255,0.6)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0 tracking-wide"
            title="Open Team-Based Reward Program & Milestone Table"
          >
            <span className="material-symbols-outlined text-[18px]">groups</span>
            <span>Referral system</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        )}
      </div>
    </div>
  );
};
