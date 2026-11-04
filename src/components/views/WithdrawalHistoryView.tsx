import React, { useState, useEffect, useCallback } from 'react';

interface WithdrawalRecord {
  id: string;
  userAddress: string;
  destinationAddress: string;
  amount: number;
  source?: string;
  milestoneLabel?: string;
  status: 'pending' | 'approved' | 'rejected';
  txHash?: string;
  adminNote?: string;
  createdAt: string;
  updatedAt?: string;
}

interface WithdrawalHistoryViewProps {
  walletAddress: string;
  onNavigateToReferrals: () => void;
  onCopyText?: (text: string) => void;
}

export const WithdrawalHistoryView: React.FC<WithdrawalHistoryViewProps> = ({
  walletAddress,
  onNavigateToReferrals,
  onCopyText,
}) => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchWithdrawals = useCallback(async () => {
    if (!walletAddress) {
      setWithdrawals([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/withdrawals?userAddress=${encodeURIComponent(walletAddress)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.withdrawals)) {
          setWithdrawals(data.withdrawals);
        }
      }
    } catch (err) {
      console.warn('[WithdrawalHistory] Failed to load records:', err);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchWithdrawals();

    const handleWithdrawalEvent = () => {
      fetchWithdrawals();
    };
    window.addEventListener('spike_withdrawal_updated', handleWithdrawalEvent);
    return () => {
      window.removeEventListener('spike_withdrawal_updated', handleWithdrawalEvent);
    };
  }, [fetchWithdrawals]);

  // Calculated Stats
  const totalWithdrawnApproved = withdrawals
    .filter((w) => w.status === 'approved')
    .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

  const pendingAmount = withdrawals
    .filter((w) => w.status === 'pending')
    .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

  const totalRequestsCount = withdrawals.length;

  const filteredRecords = withdrawals.filter((item) => {
    if (filter !== 'all' && item.status !== filter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchLabel = (item.milestoneLabel || '').toLowerCase().includes(q);
      const matchTx = (item.txHash || '').toLowerCase().includes(q);
      const matchDest = (item.destinationAddress || '').toLowerCase().includes(q);
      const matchId = (item.id || '').toLowerCase().includes(q);
      return matchLabel || matchTx || matchDest || matchId;
    }
    return true;
  });

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-300">
      {/* Top Banner Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0d2238] via-[#0a1829] to-[#040e1b] border-2 border-[#D4AF37]/50 shadow-[0_0_50px_rgba(212,175,55,0.15)] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#D4AF37]/15 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-[#00F0FF]/15 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 rounded-full text-xs font-headline font-extrabold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 flex items-center gap-1.5 shadow-sm">
              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
              REFERRAL MILESTONE PAYOUTS
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/30">
              BEP-20 USDT
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black font-headline text-white tracking-tight flex items-center gap-3">
            <span>Withdrawal History</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 font-body max-w-2xl leading-relaxed">
            Track all USDT payouts and team milestone rewards earned through the SPIKE Referral System. View verification status, approved amounts, and on-chain BSC transaction hashes.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={fetchWithdrawals}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl bg-[#122130] hover:bg-[#1c2b3b] text-[#00F0FF] border border-[#00F0FF]/40 text-xs font-headline font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Refresh Withdrawal Records"
          >
            <span className={`material-symbols-outlined text-[18px] ${isLoading ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToReferrals}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#f59e0b] hover:from-[#ffe088] hover:to-[#D4AF37] text-[#0A0F1D] text-xs font-headline font-extrabold flex items-center gap-2 transition-all shadow-[0_0_18px_rgba(212,175,55,0.4)] cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">groups</span>
            <span>Referral Milestones</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Approved Payouts */}
        <div className="p-5 rounded-2xl bg-[#0d1d2c] border border-[#1c2b3b] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-body mb-2">
            <span>Total Withdrawn (Paid)</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
            </span>
          </div>
          <div className="text-2xl font-black font-headline text-white tracking-tight">
            ${totalWithdrawnApproved.toFixed(2)}{' '}
            <span className="text-xs font-mono text-emerald-400">USDT</span>
          </div>
          <p className="text-[11px] text-slate-400 font-body mt-1">
            Cleared &amp; sent directly to your BSC wallet
          </p>
        </div>

        {/* Pending Payouts */}
        <div className="p-5 rounded-2xl bg-[#0d1d2c] border border-[#1c2b3b] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-body mb-2">
            <span>Pending Review</span>
            <span className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
            </span>
          </div>
          <div className="text-2xl font-black font-headline text-white tracking-tight">
            ${pendingAmount.toFixed(2)}{' '}
            <span className="text-xs font-mono text-amber-400">USDT</span>
          </div>
          <p className="text-[11px] text-slate-400 font-body mt-1">
            Currently in queue for protocol verification
          </p>
        </div>

        {/* Total Claims Count */}
        <div className="p-5 rounded-2xl bg-[#0d1d2c] border border-[#1c2b3b] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-body mb-2">
            <span>Total Claims</span>
            <span className="w-8 h-8 rounded-xl bg-[#00F0FF]/15 text-[#00F0FF] flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">history</span>
            </span>
          </div>
          <div className="text-2xl font-black font-headline text-white tracking-tight">
            {totalRequestsCount} <span className="text-xs font-body text-slate-400">Requests</span>
          </div>
          <p className="text-[11px] text-slate-400 font-body mt-1">
            Submitted team milestone withdrawal tickets
          </p>
        </div>

        {/* Connected Receiving Wallet */}
        <div className="p-5 rounded-2xl bg-[#0d1d2c] border border-[#1c2b3b] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-body mb-2">
            <span>Receiving Wallet</span>
            <span className="w-8 h-8 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            </span>
          </div>
          <div className="text-sm font-bold font-mono text-[#00F0FF] truncate" title={walletAddress}>
            {walletAddress
              ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`
              : 'Not Connected'}
          </div>
          <div className="mt-2 flex items-center gap-2">
            {walletAddress && (
              <button
                type="button"
                onClick={() => onCopyText?.(walletAddress)}
                className="px-2 py-0.5 rounded bg-[#122130] hover:bg-[#1c2b3b] text-[11px] text-slate-300 hover:text-white border border-[#1c2b3b] font-body flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[13px]">content_copy</span>
                <span>Copy Address</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Filter & Search Control Bar */}
      <div className="p-4 rounded-2xl bg-[#0d1d2c] border border-[#1c2b3b] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {(['all', 'approved', 'pending', 'rejected'] as const).map((st) => {
            const count =
              st === 'all'
                ? withdrawals.length
                : withdrawals.filter((w) => w.status === st).length;
            const isActive = filter === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-headline font-bold capitalize transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#00F0FF] text-[#0A0F1D] shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                    : 'bg-[#122130] text-slate-400 hover:text-white hover:bg-[#1c2b3b] border border-[#1c2b3b]'
                }`}
              >
                <span>{st === 'all' ? 'All Records' : st === 'approved' ? 'Paid / Done' : st}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-[#0A0F1D]/20 text-[#0A0F1D]' : 'bg-[#1c2b3b] text-slate-300'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search milestone or TxHash..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#122130] border border-[#1c2b3b] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F0FF]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Withdrawal Records List */}
      <div className="rounded-2xl bg-[#0d1d2c] border border-[#1c2b3b] overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-body">Loading your milestone withdrawal history...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#122130] border border-[#1c2b3b] text-slate-400 flex items-center justify-center mx-auto shadow-inner">
              <span className="material-symbols-outlined text-[32px]">receipt_long</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold font-headline text-white">No Withdrawal Records Found</h3>
              <p className="text-xs text-slate-400 font-body max-w-md mx-auto">
                {searchTerm
                  ? `No withdrawal records match "${searchTerm}". Try a different keyword.`
                  : filter !== 'all'
                  ? `You have no ${filter} withdrawal records.`
                  : 'You have not submitted any milestone withdrawal claims yet. Build your referral team, unlock milestone cash rewards, and withdraw directly to your BSC wallet!'}
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToReferrals}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#f59e0b] text-[#0A0F1D] text-xs font-headline font-extrabold hover:scale-102 transition-all shadow-[0_0_15px_rgba(212,175,55,0.35)] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
              <span>Go to Referral Milestones</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-body">
              <thead className="bg-[#081523] border-b border-[#1c2b3b] text-[11px] font-headline font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3 px-4">Milestone / Description</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Payout Wallet / TxHash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c2b3b]/60">
                {filteredRecords.map((item) => {
                  const isApproved = item.status === 'approved';
                  const isPending = item.status === 'pending';
                  const isRejected = item.status === 'rejected';

                  return (
                    <tr key={item.id} className="hover:bg-[#122130]/60 transition-colors">
                      {/* Milestone Label */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isApproved
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : isPending
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-red-500/15 text-red-400 border border-red-500/30'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {isApproved ? 'check_circle' : isPending ? 'hourglass_empty' : 'cancel'}
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-white block">
                              {item.milestoneLabel || 'Team Milestone Bonus'}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              ID: #{item.id.slice(-6).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 font-headline font-black text-sm">
                        <span className={isApproved ? 'text-emerald-400' : 'text-white'}>
                          ${Number(item.amount).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1 font-mono font-normal">
                          USDT
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-headline font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>Paid / Cleared</span>
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-headline font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                            <span>Pending Review</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-headline font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            <span>Rejected</span>
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        <div>{new Date(item.createdAt).toLocaleDateString()}</div>
                        <div className="text-slate-500 text-[10px]">
                          {new Date(item.createdAt).toLocaleTimeString()}
                        </div>
                      </td>

                      {/* Payout Destination / TxHash */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <span className="text-slate-500">Dest:</span>
                            <span title={item.destinationAddress}>
                              {item.destinationAddress
                                ? `${item.destinationAddress.slice(0, 6)}...${item.destinationAddress.slice(-4)}`
                                : 'Default Wallet'}
                            </span>
                            {item.destinationAddress && (
                              <button
                                type="button"
                                onClick={() => onCopyText?.(item.destinationAddress)}
                                className="text-slate-500 hover:text-[#00F0FF]"
                                title="Copy destination address"
                              >
                                <span className="material-symbols-outlined text-[13px]">content_copy</span>
                              </button>
                            )}
                          </div>

                          {item.txHash ? (
                            <div className="flex items-center gap-1">
                              <span className="text-slate-500">Tx:</span>
                              <a
                                href={`https://bscscan.com/tx/${item.txHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#00F0FF] hover:underline flex items-center gap-0.5"
                                title="View on BscScan"
                              >
                                <span>{item.txHash.slice(0, 8)}...{item.txHash.slice(-6)}</span>
                                <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                              </a>
                            </div>
                          ) : isPending ? (
                            <span className="text-slate-500 text-[10px] italic">
                              Awaiting admin batch payout
                            </span>
                          ) : isRejected && item.adminNote ? (
                            <span className="text-red-400 text-[10px] block truncate max-w-[200px]" title={item.adminNote}>
                              Reason: {item.adminNote}
                            </span>
                          ) : null}
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
    </div>
  );
};
