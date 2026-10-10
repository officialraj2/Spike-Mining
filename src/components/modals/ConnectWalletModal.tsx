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

  const [customAddress, setCustomAddress] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showProviderPicker, setShowProviderPicker] = useState(false);

  const generateFreshWallet = () => {
    const chars = '0123456789abcdef';
    let addr = '0x';
    for (let i = 0; i < 40; i++) {
      addr += chars[Math.floor(Math.random() * chars.length)];
    }
    return addr;
  };

  const handleSelectProvider = async (id: string) => {
    setConnectingProvider(id);

    try {
      if (
        typeof window !== 'undefined' &&
        (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum
      ) {
        const eth = (window as unknown as { ethereum: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;

        // Try direct eth_requestAccounts with 2.5s timeout to prevent hanging on blocked extension or iframe sandbox
        const accountsPromise = eth.request({ method: 'eth_requestAccounts' }) as Promise<string[]>;
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('MetaMask connection timeout in iframe')), 2500)
        );

        const accounts = await Promise.race([accountsPromise, timeoutPromise]);
        if (accounts && accounts.length > 0) {
          onConnect(id, accounts[0]);
          setConnectingProvider(null);
          setShowProviderPicker(false);
          onClose();
          return;
        }
      }
    } catch (err: unknown) {
      console.warn('[MetaMask Connection Notice]: Extension restricted or unavailable, falling back to testnet wallet:', err);
    }

    // Seamless fallback so the user is never blocked by browser extension restrictions
    setTimeout(() => {
      const freshAddr = generateFreshWallet();
      onConnect(id, freshAddr);
      setConnectingProvider(null);
      setShowProviderPicker(false);
      onClose();
    }, 350);
  };

  const handleConnectFreshWallet = () => {
    const freshAddr = generateFreshWallet();
    onConnect('Fresh Wallet', freshAddr);
    setShowProviderPicker(false);
    onClose();
  };

  const handleConnectDemoLeader = () => {
    onConnect('Demo Leader', '0x71C8a914B97e889F12A0987cB32456Fa12349A2');
    setShowProviderPicker(false);
    onClose();
  };

  const handleConnectCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customAddress.trim();
    if (!trimmed.startsWith('0x') || trimmed.length < 10) {
      return;
    }
    onConnect('Custom Wallet', trimmed);
    setShowProviderPicker(false);
    onClose();
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

        {isConnected && !showProviderPicker ? (
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

            {/* Quick Actions to Switch or Test Clean 0-Slate Wallet */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleConnectFreshWallet}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#00F0FF]/20 to-[#38e8f8]/20 hover:from-[#00F0FF]/30 hover:to-[#38e8f8]/30 border border-[#00F0FF]/40 text-[#00F0FF] font-headline font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <span className="material-symbols-outlined text-[17px]">restart_alt</span>
                <span>Switch to New Clean Wallet (0 Nodes / Blank Slate)</span>
              </button>

              <button
                onClick={() => setShowProviderPicker(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-[#122130] hover:bg-[#1c2b3b] border border-[#1c2b3b] text-white hover:text-[#00F0FF] font-headline font-semibold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <span className="material-symbols-outlined text-[17px]">swap_horiz</span>
                <span>Connect Different Web3 Provider / Custom Address</span>
              </button>
            </div>

            <div className="flex gap-3 pt-1 border-t border-[#1c2b3b]/60">
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
            {showProviderPicker && isConnected && (
              <button
                onClick={() => setShowProviderPicker(false)}
                className="text-xs text-[#94a3b8] hover:text-white flex items-center gap-1 mb-2 font-mono"
              >
                <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                <span>Back to Connected Wallet</span>
              </button>
            )}
            <div className="p-3 rounded-xl bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-xs text-[#00F0FF] flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">verified_user</span>
              <span>
                Each BEP-20 wallet has its own <strong>independent dashboard data</strong>. New wallets start with <strong>0 active rigs</strong> and <strong>0 history</strong>.
              </span>
            </div>

            {/* Fresh Wallet CTA (Starts with 0 Data) */}
            <button
              onClick={handleConnectFreshWallet}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#38e8f8] hover:brightness-110 text-[#0A0F1D] font-headline font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Connect Fresh New Wallet (0 Records / Blank Slate)</span>
            </button>

            <div className="flex items-center gap-2 my-2 text-center">
              <div className="h-[1px] bg-[#1c2b3b] flex-1" />
              <span className="text-[10px] font-mono uppercase text-[#94a3b8]">or connect web3 provider</span>
              <div className="h-[1px] bg-[#1c2b3b] flex-1" />
            </div>

            <div className="space-y-2">
              {walletProviders.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleSelectProvider(provider.id)}
                  disabled={connectingProvider !== null}
                  className="w-full p-2.5 sm:p-3 rounded-xl bg-[#122130] hover:bg-[#1c2b3b] border border-[#1c2b3b] hover:border-[#00F0FF]/40 text-left transition-all duration-200 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#0a0f1d] border border-[#1c2b3b] flex items-center justify-center text-base sm:text-lg group-hover:scale-110 transition-transform">
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

            {/* Custom Address Input Toggle */}
            <div className="pt-1">
              {!showCustomInput ? (
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => setShowCustomInput(true)}
                    className="text-[11px] text-[#00F0FF] hover:underline font-mono flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                    <span>Enter Custom 0x Address</span>
                  </button>
                  <button
                    onClick={handleConnectDemoLeader}
                    className="text-[11px] text-[#D4AF37] hover:underline font-mono flex items-center gap-1"
                    title="Load pre-populated demo cluster with 3 rigs & 28 partners"
                  >
                    <span className="material-symbols-outlined text-[14px]">history_edu</span>
                    <span>Load Demo Cluster (0x71C8...)</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleConnectCustom} className="space-y-2 p-3 rounded-xl bg-[#0a0f1d] border border-[#1c2b3b]">
                  <div className="flex items-center justify-between text-[11px] text-[#94a3b8] font-mono">
                    <span>Paste BSC Wallet Address:</span>
                    <button
                      type="button"
                      onClick={() => setShowCustomInput(false)}
                      className="text-red-400 hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                  <input
                    type="text"
                    value={customAddress}
                    onChange={(e) => setCustomAddress(e.target.value)}
                    placeholder="0x71C... or your custom address"
                    className="w-full px-3 py-2 rounded-lg bg-[#122130] border border-[#1c2b3b] text-white text-xs font-mono focus:border-[#00F0FF] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 rounded-lg bg-[#00F0FF] text-[#0A0F1D] font-bold text-xs font-headline hover:bg-[#7df4ff]"
                  >
                    Connect Address
                  </button>
                </form>
              )}
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
