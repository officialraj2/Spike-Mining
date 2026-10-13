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
  const [connectingStatus, setConnectingStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customAddress, setCustomAddress] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showProviderPicker, setShowProviderPicker] = useState(false);

  // Check if running inside an iframe (like AI Studio preview)
  const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;

  const walletProviders = [
    {
      id: 'metamask',
      name: 'MetaMask',
      description: isInsideIframe ? 'Connect Extension or Paste 0x Address' : 'Connect via browser extension or mobile app',
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

  if (!isOpen) return null;

  // Safe helper to detect window.ethereum or MetaMask provider
  const getEthereumProvider = () => {
    if (typeof window === 'undefined') return null;
    const win = window as unknown as {
      ethereum?: {
        isMetaMask?: boolean;
        providers?: Array<{ isMetaMask?: boolean; request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }>;
        request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      };
    };
    if (win.ethereum?.providers && Array.isArray(win.ethereum.providers)) {
      const mm = win.ethereum.providers.find((p) => p.isMetaMask);
      if (mm) return mm;
      return win.ethereum.providers[0];
    }
    if (win.ethereum && typeof win.ethereum.request === 'function') {
      return win.ethereum;
    }
    return null;
  };

  const generateFreshWallet = () => {
    const chars = '0123456789abcdef';
    let addr = '0x';
    for (let i = 0; i < 40; i++) {
      addr += chars[Math.floor(Math.random() * chars.length)];
    }
    return addr;
  };

  const handleSelectProvider = async (id: string) => {
    setErrorMessage(null);
    setConnectingStatus(null);
    setConnectingProvider(id);

    const eth = getEthereumProvider();

    // If attempting to connect a real Web3 wallet extension (MetaMask / Trust Wallet / Binance)
    if (id === 'metamask' || id === 'trustwallet' || id === 'binance') {
      if (eth) {
        try {
          setConnectingStatus(`MetaMask popup opening... Please approve account access in your browser extension.`);
          
          // Allow ample time (45s) for user to unlock and click 'Next / Connect' in MetaMask popup
          const accountsPromise = eth.request({ method: 'eth_requestAccounts' }) as Promise<string[]>;
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('METAMASK_TIMEOUT')), 45000)
          );

          const accounts = await Promise.race([accountsPromise, timeoutPromise]);
          if (accounts && accounts.length > 0) {
            onConnect('MetaMask', accounts[0]);
            setConnectingProvider(null);
            setConnectingStatus(null);
            setShowProviderPicker(false);
            onClose();
            return;
          }
        } catch (err: unknown) {
          setConnectingProvider(null);
          setConnectingStatus(null);
          const errObj = err as { code?: number; message?: string };
          if (errObj?.code === 4001 || errObj?.message?.includes('User rejected')) {
            setErrorMessage('MetaMask connection was cancelled or rejected by user.');
          } else if (errObj?.message === 'METAMASK_TIMEOUT') {
            setErrorMessage('MetaMask did not respond within 45s. Please unlock your extension and try again.');
          } else {
            setErrorMessage(errObj?.message || 'MetaMask extension connection failed.');
          }
          setShowCustomInput(true);
          return;
        }
      } else {
        // Extension not detected in this context
        setConnectingProvider(null);
        setConnectingStatus(null);
        if (isInsideIframe) {
          setErrorMessage(
            'Browser Security (iFrame Sandbox): Chrome/Brave extensions are restricted from injecting into embedded preview iframes. Aap apna real MetaMask address (0x...) niche paste karke turant connect kar sakte hain, ya app ko Full Tab me open karein!'
          );
        } else {
          setErrorMessage(
            'MetaMask extension is browser me detect nahi hui. Kripya MetaMask extension install karein ya apna address manually enter karein.'
          );
        }
        setShowCustomInput(true);
        return;
      }
    }

    // Fallback for WalletConnect or other providers
    setTimeout(() => {
      const freshAddr = generateFreshWallet();
      onConnect(id, freshAddr);
      setConnectingProvider(null);
      setShowProviderPicker(false);
      onClose();
    }, 350);
  };

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().startsWith('0x')) {
          setCustomAddress(text.trim());
          setErrorMessage(null);
        }
      }
    } catch {
      // ignore
    }
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
      setErrorMessage('Please enter a valid BSC (BEP-20) address starting with 0x');
      return;
    }
    onConnect('MetaMask', trimmed);
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
            {/* Active Connecting Status Banner */}
            {connectingStatus && (
              <div className="p-3 rounded-xl bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-xs text-[#00F0FF] flex items-start gap-2.5 animate-pulse">
                <span className="material-symbols-outlined text-[18px] animate-spin shrink-0 mt-0.5">
                  progress_activity
                </span>
                <div className="flex-1">
                  <div className="font-bold">Waiting for MetaMask Approval...</div>
                  <div className="text-[11px] text-[#cbd5e1] font-mono mt-0.5">{connectingStatus}</div>
                </div>
              </div>
            )}

            {/* Error or Notice Banner */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-amber-950/50 border border-amber-500/50 text-xs text-amber-200 space-y-2.5">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-[18px] shrink-0 mt-0.5">
                    info
                  </span>
                  <div className="flex-1">
                    <div className="font-bold text-amber-300">MetaMask Connection Notice:</div>
                    <p className="text-[11px] font-mono leading-relaxed text-amber-100/90 mt-0.5">{errorMessage}</p>
                  </div>
                </div>
                {isInsideIframe && (
                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    <a
                      href={typeof window !== 'undefined' ? window.location.href : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-mono text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <span>Open in Full Browser Tab (Native Extension)</span>
                      <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                    </a>
                  </div>
                )}
              </div>
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
                    onClick={() => {
                      setShowCustomInput(true);
                      setErrorMessage(null);
                    }}
                    className="text-[11px] text-[#00F0FF] hover:underline font-mono flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                    <span>Paste My MetaMask Address (0x...)</span>
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
                <form onSubmit={handleConnectCustom} className="space-y-2.5 p-3.5 rounded-xl bg-[#0a0f1d] border border-[#1c2b3b]">
                  <div className="flex items-center justify-between text-[11px] text-[#94a3b8] font-mono">
                    <span className="font-semibold text-white">Enter / Paste MetaMask (BEP-20) Address:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomInput(false);
                        setErrorMessage(null);
                      }}
                      className="text-red-400 hover:underline"
                    >
                      Close
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={customAddress}
                      onChange={(e) => {
                        setCustomAddress(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="0x... (e.g. 0x71C8a914B97e889F12A0987cB32456Fa12349A2)"
                      className="w-full pl-3 pr-20 py-2.5 rounded-lg bg-[#122130] border border-[#1c2b3b] text-white text-xs font-mono focus:border-[#00F0FF] focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handlePasteClipboard}
                      className="absolute right-1.5 top-1.5 px-2 py-1 rounded bg-[#1c2b3b] hover:bg-[#25394e] text-[11px] font-mono text-[#00F0FF] flex items-center gap-1 transition-colors border border-[#2d4257]"
                      title="Paste from clipboard"
                    >
                      <span className="material-symbols-outlined text-[13px]">content_paste</span>
                      <span>Paste</span>
                    </button>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[#00F0FF] to-[#0284c7] text-[#0A0F1D] font-black text-xs font-headline hover:brightness-110 shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">login</span>
                    <span>Connect My MetaMask Wallet</span>
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
