import React, { useState } from 'react';

interface ClaimRewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  claimableUSDT: number;
  walletAddress: string;
  onConfirmClaim: (amount: number) => void;
}

export const ClaimRewardsModal: React.FC<ClaimRewardsModalProps> = ({
  isOpen,
  onClose,
  claimableUSDT,
  walletAddress,
  onConfirmClaim,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [claimed, setClaimed] = useState(false);

  if (!isOpen) return null;

  const handleClaim = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setClaimed(true);
      onConfirmClaim(claimableUSDT);
      setTimeout(() => {
        setClaimed(false);
        onClose();
      }, 1200);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-[#010f1e]/80 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-[#0d1d2c] border border-[#1c2b3b] rounded-2xl p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-[#1c2b3b]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#D4AF37]">payments</span>
            <h3 className="text-lg font-bold font-headline text-white">Claim Mining Rewards</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#c6c6cc] hover:text-white hover:bg-[#1c2b3b]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {claimed ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#00F0FF]/20 text-[#00F0FF] flex items-center justify-center mx-auto animate-bounce">
              <span className="material-symbols-outlined text-[32px]">check_circle</span>
            </div>
            <h4 className="text-lg font-bold font-headline text-white">Payout Transferred!</h4>
            <p className="text-xs text-[#c6c6cc]">
              +{claimableUSDT.toFixed(2)} USDT credited directly to your connected BEP-20 address.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="p-4 rounded-xl bg-[#0a0f1d] border border-[#1c2b3b] text-center">
              <span className="text-xs text-[#c6c6cc] uppercase tracking-wider font-mono">
                Total Unclaimed Earnings
              </span>
              <div className="text-3xl font-bold font-headline text-[#D4AF37] my-1">
                {claimableUSDT.toFixed(2)} <span className="text-lg text-white">USDT</span>
              </div>
              <div className="text-xs text-[#7df4ff] font-mono">
                +14.20 SPIKE Protocol Loyalty Bonus
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 rounded-lg bg-[#122130]">
                <span className="text-[#c6c6cc]">Destination Address:</span>
                <span className="text-white font-mono truncate max-w-[180px]">{walletAddress}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-[#122130]">
                <span className="text-[#c6c6cc]">Network / Standard:</span>
                <span className="text-[#00F0FF] font-semibold font-mono">BNB Chain (BEP-20)</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-[#122130]">
                <span className="text-[#c6c6cc]">Estimated Gas Fee:</span>
                <span className="text-white font-mono">~0.00042 BNB ($0.24)</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#122130]/60 border border-[#1c2b3b] text-[11px] text-[#c6c6cc] flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#00F0FF]">shield</span>
              <span>Rewards are disbursed via verified BSC smart contract without lockups.</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-[#122130] text-[#c6c6cc] hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleClaim}
                disabled={isProcessing}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#00F0FF] text-[#0A0F1D] font-bold font-headline text-xs hover:bg-[#7df4ff] transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.3)] disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    <span>Broadcasting to BSC...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">payments</span>
                    <span>Confirm &amp; Claim Payout</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
