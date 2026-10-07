import React from 'react';

interface AuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditModal: React.FC<AuditModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-[#010f1e]/80 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-[#0d1d2c] border border-[#1c2b3b] rounded-2xl p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-[#1c2b3b]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#D4AF37]">verified_user</span>
            <h3 className="text-lg font-bold font-headline text-white">CertiK Security Audit Report</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#c6c6cc] hover:text-white hover:bg-[#1c2b3b]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#0a0f1d] border border-[#1c2b3b]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#00F0FF]/10 text-[#00F0FF] flex items-center justify-center font-headline text-xl font-bold">
                98.4
              </div>
              <div>
                <div className="text-white font-bold font-headline text-sm">CertiK Skynet Level 2</div>
                <div className="text-[#c6c6cc]">Security Score · Top 5% BSC Protocols</div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-semibold border border-emerald-500/20">
              PASSED
            </span>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-white font-headline">Audit Invariant Checks:</div>
            <div className="grid grid-cols-2 gap-2 text-[#c6c6cc]">
              <div className="p-2.5 rounded-lg bg-[#122130] flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-[16px]">check_circle</span>
                <span>Reentrancy Guard: Verified</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#122130] flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-[16px]">check_circle</span>
                <span>Oracle Manipulation: Immune</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#122130] flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-[16px]">check_circle</span>
                <span>Timelock Governance: Active</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#122130] flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-[16px]">check_circle</span>
                <span>Arithmetic Overflow: Safe</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#122130] border border-[#1c2b3b] space-y-1 font-mono text-[11px]">
            <div className="text-[#c6c6cc]">Verified Contract Address:</div>
            <div className="text-[#00F0FF] select-all break-all">
              0x9F41a84B7971C5e7F0565228D13F70A37eD62c14
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <a
              href="https://bscscan.com"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl bg-[#122130] hover:bg-[#1c2b3b] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>View on BscScan</span>
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            </a>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-[#00F0FF] text-[#0A0F1D] text-xs font-bold font-headline hover:bg-[#7df4ff]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
