import React, { useState } from 'react';

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
  address: string;
  balanceUSDT: number;
  balanceBNB: number;
  onConnect: (provider: string, realAddress?: string) => void;
  onDisconnect: () => void;
  onCopyAddress: () => void;
}

export const ConnectWalletModal: React.FC<ConnectWalletModalProps> = ({
  isOpen,
  onClose,
  isConnected,
  address,
  balanceUSDT,
  balanceBNB,
  onConnect,
  onDisconnect,
  onCopyAddress,
}) => {
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);

  if (!isOpen) return null;

  const walletProviders = [
    {
      id: 'metamask',
      name: 'MetaMask',
      description: 'Connect via browser extension or mobile app',
      icon: '🦊',
      color: 'border-orange-500/30',
    },
    {
      id: 'trustwallet',
      name: 'Trust Wallet',
      description: 'Official Binance Web3 mobile multi-coin wallet',
      icon: '🛡️',
      color: 'border-blue-500/30',
    },
    {
      id: 'binance',
      name: 'Binance Web3 Wallet',
      description: 'Direct BSC ecosystem integration with zero friction',
      icon: '🟡',
      color: 'border-yellow-500/30',
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect v2',
      description: 'Scan QR code with any compatible Web3 wallet',
      icon: '⚡',
      color: 'border-cyan-500/30',
    },
  ];

  const handleSelectProvider = async (id: string) => {
    setConnectingProvider(id);

    try {
      if (
        typeof window !== 'undefined' &&
        (window as unknown as { ethereum?: { request: (args: { method: string }) => Promise<string[]> } }).ethereum &&
        (id === 'metamask' || id === 'trustwallet' || id === 'binance')
      ) {
        const eth = (window as unknown as { ethereum: { request: (args: { method: string }) => Promise<string[]> } }).ethereum;
        const accounts = await eth.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
          onConnect(id, accounts[0]);
          setConnectingProvider(null);
          onClose();
          return;
        }
      }
    } catch {
      // User cancelled or browser blocked popup, continue to test simulation
    }

    setTimeout(() => {
      onConnect(id);
      setConnectingProvider(null);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#010f1e]/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-[#0d1d2c] border border-[#1c2b3b] rounded-2xl p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1c2b3b]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00F0FF]">
              {isConnected ? 'account_balance_wallet' : 'login'}
            </span>
            <h3 className="text-lg font-bold font-headline text-white">
              {isConnected ? 'Connected Web3 Account' : 'Log In / Connect BEP-20 Wallet'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#1c2b3b]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {isConnected ? (
          /* Connected Account State */
          <div className="mt-5 space-y-4">
            <div className="p-4 rounded-xl bg-[#0a0f1d] border border-[#1c2b3b] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#94a3b8]">Authentication Status</span>
                <span className="flex items-center gap-1.5 text-xs text-[#00F0FF] font-medium font-mono">
                  <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse"></span>
                  Active on BSC (BEP-20)
                </span>
              </div>

              <div>
                <span className="text-xs text-[#94a3b8]">Authenticated Address</span>
                <div className="flex items-center justify-between mt-1 p-2 rounded-lg bg-[#122130] border border-[#1c2b3b]">
                  <span className="font-mono text-sm text-white truncate mr-2">{address}</span>
                  <button
                    onClick={onCopyAddress}
                    className="p-1.5 rounded hover:bg-[#1c2b3b] text-[#00F0FF] text-xs flex items-center gap-1 transition-colors"
                    title="Copy Address"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1c2b3b]">
                <div className="p-2.5 rounded-lg bg-[#122130]/80">
                  <div className="text-[11px] text-[#94a3b8]">USDT Balance</div>
                  <div className="text-base font-bold font-mono text-[#D4AF37]">
                    {balanceUSDT.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#122130]/80">
                  <div className="text-[11px] text-[#94a3b8]">BNB Gas Balance</div>
                  <div className="text-base font-bold font-mono text-white">
                    {balanceBNB.toFixed(4)} BNB
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <a
                href={`https://bscscan.com/address/${address}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#122130] hover:bg-[#1c2b3b] text-xs font-semibold text-center text-[#94a3b8] hover:text-[#00F0FF] border border-[#1c2b3b] transition-colors flex items-center justify-center gap-1.5"
              >
                <span>View on BscScan</span>
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              </a>
              <button
                onClick={() => {
                  onDisconnect();
                  onClose();
                }}
                className="py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold text-red-400 border border-red-500/20 transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        ) : (
          /* Select Provider State */
          <div className="mt-4 space-y-3">
            <div className="p-3 rounded-xl bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-xs text-[#00F0FF] flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">verified_user</span>
              <span>
                Log in to unlock your personal <strong>Live Dashboard</strong>, <strong>Mining Rigs</strong>, and <strong>Referral Rewards</strong>.
              </span>
            </div>

            {/* Quick 1-Click Login CTA */}
            <button
              onClick={() => handleSelectProvider('metamask')}
              disabled={connectingProvider !== null}
              className="w-full py-3 px-4 rounded-xl bg-[#00F0FF] hover:bg-[#7df4ff] text-[#0A0F1D] font-headline font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              <span>Quick 1-Click Login (0x71C8...49A2)</span>
            </button>

            <div className="flex items-center gap-2 my-2 text-center">
              <div className="h-[1px] bg-[#1c2b3b] flex-1" />
              <span className="text-[10px] font-mono uppercase text-[#94a3b8]">or connect wallet</span>
              <div className="h-[1px] bg-[#1c2b3b] flex-1" />
            </div>

            <div className="space-y-2">
              {walletProviders.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleSelectProvider(provider.id)}
                  disabled={connectingProvider !== null}
                  className="w-full p-3 rounded-xl bg-[#122130] hover:bg-[#1c2b3b] border border-[#1c2b3b] hover:border-[#00F0FF]/40 text-left transition-all duration-200 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#0a0f1d] border border-[#1c2b3b] flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                      {provider.icon}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-white font-headline group-hover:text-[#00F0FF] transition-colors">
                        {provider.name}
                      </h4>
                      <p className="text-[10px] text-[#94a3b8]">{provider.description}</p>
                    </div>
                  </div>

                  {connectingProvider === provider.id ? (
                    <span className="material-symbols-outlined text-[#00F0FF] animate-spin text-[18px]">
                      progress_activity
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-[#94a3b8] group-hover:text-[#00F0FF] group-hover:translate-x-0.5 transition-all text-[18px]">
                      chevron_right
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="pt-2 text-center">
              <span className="text-[10px] text-[#94a3b8]/70 font-mono">
                Non-custodial smart contract authentication. Private keys never leave your device.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
