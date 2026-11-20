import React, { useState, useEffect, useCallback } from 'react';
import { SPIKE_LOGO_URL } from '../../data/mockData';
import { fetchOnChainBalances, SPIKE_CONTRACT_ADDRESS, USDT_CONTRACT_ADDRESS } from '../../services/onchainBalance';

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  spikeBalance: number;
  bnbBalance: number;
  usdtBalance?: number;
  walletAddress?: string;
  initialMode?: 'sellSpike';
  onSwapSuccess: (fromToken: string, toToken: string, fromAmount: number, toAmount: number) => void;
}

const ERC20_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const AUTO_SLIPPAGE_PERCENT = '1.0';

async function waitForReceipt(ethereum: any, txHash: string, maxAttempts = 30): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const receipt = await ethereum.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      });
      if (receipt && receipt.blockNumber) {
        return receipt;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return null;
}

function extractReceivedUsdtFromReceipt(receipt: any, recipientAddress: string): number {
  if (!receipt || !Array.isArray(receipt.logs)) return 0;
  const targetUsdt = USDT_CONTRACT_ADDRESS.toLowerCase();
  const normRecip = (recipientAddress || '').toLowerCase();
  let total = 0;
  for (const log of receipt.logs) {
    if (
      String(log.address || '').toLowerCase() === targetUsdt &&
      String(log.topics?.[0] || '').toLowerCase() === ERC20_TRANSFER_TOPIC &&
      log.topics?.[2]
    ) {
      const toAddr = ('0x' + String(log.topics[2]).slice(-40)).toLowerCase();
      if (!normRecip || toAddr === normRecip) {
        try {
          const amtWei = BigInt(log.data || '0x0');
          total += Number(amtWei) / 1e18;
        } catch {}
      }
    }
  }
  return +total.toFixed(6);
}

export const SwapModal: React.FC<SwapModalProps> = ({
  isOpen,
  onClose,
  spikeBalance,
  bnbBalance,
  usdtBalance = 0.0,
  walletAddress = '',
  onSwapSuccess,
}) => {
  const [fromAmount, setFromAmount] = useState<string>('');
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [swapTxSuccess, setSwapTxSuccess] = useState<string | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [swapStatusStep, setSwapStatusStep] = useState<string>('');

  // Live on-chain BSC balances strictly from connected Web3 wallet
  const [liveSpikeBalance, setLiveSpikeBalance] = useState<number>(() => {
    if (walletAddress) {
      const cached = localStorage.getItem(`spike_onchain_spk_${walletAddress.toLowerCase()}`);
      if (cached !== null && !isNaN(Number(cached))) return Number(cached);
    }
    return spikeBalance || 0;
  });

  const [liveUsdtBalance, setLiveUsdtBalance] = useState<number>(() => {
    if (walletAddress) {
      const cached = localStorage.getItem(`spike_onchain_usdt_${walletAddress.toLowerCase()}`);
      if (cached !== null && !isNaN(Number(cached))) return Number(cached);
    }
    return usdtBalance || 0;
  });

  const [liveBnbBalance, setLiveBnbBalance] = useState<number>(() => {
    if (walletAddress) {
      const cached = localStorage.getItem(`spike_onchain_bnb_${walletAddress.toLowerCase()}`);
      if (cached !== null && !isNaN(Number(cached))) return Number(cached);
    }
    return bnbBalance || 0;
  });

  const [isLoadingOnchain, setIsLoadingOnchain] = useState<boolean>(false);

  // Live Nodescan V3 Pool State & Quoter Output
  const [liveSpotPrice, setLiveSpotPrice] = useState<number>(0);
  const [liveExpectedUsdt, setLiveExpectedUsdt] = useState<number>(0);
  const [isQuoting, setIsQuoting] = useState<boolean>(false);
  const [quoterVerified, setQuoterVerified] = useState<boolean>(false);

  const [confirmedDetails, setConfirmedDetails] = useState<{
    txHash: string;
    receivedAmount: number;
    spentAmount: number;
    executionRate: number;
    walletAddress: string;
  } | null>(null);

  // Query real on-chain BSC Mainnet balances (SPIKE, USDT, BNB)
  const refreshOnChainBalances = useCallback(async () => {
    if (!walletAddress || !walletAddress.startsWith('0x')) {
      setLiveSpikeBalance(0);
      setLiveUsdtBalance(0);
      setLiveBnbBalance(0);
      return;
    }
    setIsLoadingOnchain(true);
    try {
      const win = typeof window !== 'undefined' ? (window as any) : null;
      let queriedUsdt: number | null = null;
      let queriedSpk: number | null = null;
      let queriedBnb: number | null = null;

      if (win?.ethereum) {
        try {
          const cleanAddr = walletAddress.toLowerCase().replace(/^0x/, '').padStart(64, '0');
          const dataPayload = '0x70a08231' + cleanAddr;
          const [rawUsdt, rawSpk, rawBnb] = await Promise.all([
            win.ethereum.request({
              method: 'eth_call',
              params: [{ to: USDT_CONTRACT_ADDRESS, data: dataPayload }, 'latest'],
            }).catch(() => null),
            win.ethereum.request({
              method: 'eth_call',
              params: [{ to: SPIKE_CONTRACT_ADDRESS, data: dataPayload }, 'latest'],
            }).catch(() => null),
            win.ethereum.request({
              method: 'eth_getBalance',
              params: [walletAddress, 'latest'],
            }).catch(() => null),
          ]);

          if (rawUsdt && rawUsdt !== '0x') {
            queriedUsdt = +(Number(BigInt(rawUsdt)) / 1e18).toFixed(4);
          }
          if (rawSpk && rawSpk !== '0x') {
            queriedSpk = +(Number(BigInt(rawSpk)) / 1e18).toFixed(4);
          }
          if (rawBnb && rawBnb !== '0x') {
            queriedBnb = +(Number(BigInt(rawBnb)) / 1e18).toFixed(4);
          }
        } catch {}
      }

      const data = await fetchOnChainBalances(walletAddress);

      if (queriedUsdt !== null) {
        setLiveUsdtBalance(queriedUsdt);
        localStorage.setItem(`spike_onchain_usdt_${walletAddress.toLowerCase()}`, String(queriedUsdt));
      } else if (typeof data.usdt === 'number') {
        setLiveUsdtBalance(data.usdt);
        localStorage.setItem(`spike_onchain_usdt_${walletAddress.toLowerCase()}`, String(data.usdt));
      }

      if (queriedSpk !== null) {
        setLiveSpikeBalance(queriedSpk);
        localStorage.setItem(`spike_onchain_spk_${walletAddress.toLowerCase()}`, String(queriedSpk));
      } else if (typeof data.spike === 'number') {
        setLiveSpikeBalance(data.spike);
        localStorage.setItem(`spike_onchain_spk_${walletAddress.toLowerCase()}`, String(data.spike));
      }

      if (queriedBnb !== null) {
        setLiveBnbBalance(queriedBnb);
        localStorage.setItem(`spike_onchain_bnb_${walletAddress.toLowerCase()}`, String(queriedBnb));
      } else if (typeof data.bnb === 'number') {
        setLiveBnbBalance(data.bnb);
        localStorage.setItem(`spike_onchain_bnb_${walletAddress.toLowerCase()}`, String(data.bnb));
      }
    } catch (e) {
      console.warn('[SwapModal] On-chain balance fetch notice:', e);
    } finally {
      setIsLoadingOnchain(false);
    }
  }, [walletAddress]);

  // Fetch live V3 Pool Spot Price & QuoterV2 sell quote
  const fetchLiveSellQuote = useCallback(async (spkQty: number) => {
    setIsQuoting(true);
    try {
      const qs = new URLSearchParams({
        address: walletAddress || '',
        spkAmount: String(spkQty > 0 ? spkQty : 0),
        slippage: AUTO_SLIPPAGE_PERCENT,
      });
      const res = await fetch(`/api/bsc/v3-sell-quote?${qs.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.success) {
          if (typeof data.spotPriceUsdt === 'number' && data.spotPriceUsdt > 0) {
            setLiveSpotPrice(data.spotPriceUsdt);
          }
          if (typeof data.userSpkBalance === 'number' && walletAddress) {
            setLiveSpikeBalance(data.userSpkBalance);
            localStorage.setItem(`spike_onchain_spk_${walletAddress.toLowerCase()}`, String(data.userSpkBalance));
          }
          if (typeof data.userUsdtBalance === 'number' && walletAddress) {
            setLiveUsdtBalance(data.userUsdtBalance);
            localStorage.setItem(`spike_onchain_usdt_${walletAddress.toLowerCase()}`, String(data.userUsdtBalance));
          }
          if (typeof data.userBnbBalance === 'number' && walletAddress) {
            setLiveBnbBalance(data.userBnbBalance);
            localStorage.setItem(`spike_onchain_bnb_${walletAddress.toLowerCase()}`, String(data.userBnbBalance));
          }
          if (spkQty > 0) {
            setLiveExpectedUsdt(typeof data.expectedUsdtOut === 'number' ? data.expectedUsdtOut : 0);
            setQuoterVerified(Boolean(data.quoterVerified));
          } else {
            setLiveExpectedUsdt(0);
            setQuoterVerified(false);
          }
        }
      }
    } catch {
      // keep existing live price if transient RPC error
    } finally {
      setIsQuoting(false);
    }
  }, [walletAddress]);

  // On modal open: reset messages, refresh on-chain balances & live V3 pool rate
  useEffect(() => {
    if (isOpen) {
      setSwapTxSuccess(null);
      setSwapError(null);
      setConfirmedDetails(null);
      setSwapStatusStep('');
      refreshOnChainBalances();
      fetchLiveSellQuote(0);
    }
  }, [isOpen, refreshOnChainBalances, fetchLiveSellQuote]);

  // Preset 10% max of Web3 wallet SPIKE balance when modal opens or balance updates while empty
  useEffect(() => {
    if (isOpen && !fromAmount && liveSpikeBalance > 0) {
      const max10 = Math.floor(liveSpikeBalance * 0.10 * 10000) / 10000;
      if (max10 > 0) {
        setFromAmount(max10.toString());
      }
    }
  }, [isOpen, liveSpikeBalance, fromAmount]);

  // Debounced live QuoterV2 quote whenever amount changes
  const numericFrom = parseFloat(fromAmount) || 0;
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      fetchLiveSellQuote(numericFrom);
    }, 300);
    return () => clearTimeout(timer);
  }, [isOpen, numericFrom, fetchLiveSellQuote]);

  // Close on Escape Key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Strict 10% limit calculated exclusively from Web3 wallet on-chain SPIKE balance
  const maxSellableSpk = Math.floor(liveSpikeBalance * 0.10 * 10000) / 10000;
  const isExceeding10Percent = liveSpikeBalance > 0 && numericFrom > maxSellableSpk + 1e-6;
  const hasInsufficientSpk = numericFrom > liveSpikeBalance + 1e-6;
  const hasNoWalletSpk = liveSpikeBalance <= 0;

  const estimatedToUsdt = liveExpectedUsdt > 0
    ? liveExpectedUsdt
    : (numericFrom > 0 && liveSpotPrice > 0 ? +(numericFrom * liveSpotPrice * 0.9995).toFixed(6) : 0);
  const effectiveLiveRate = numericFrom > 0 && estimatedToUsdt > 0
    ? estimatedToUsdt / numericFrom
    : liveSpotPrice;

  const handlePercentage = (pctOfMax10: number) => {
    setSwapError(null);
    const val = Math.floor(maxSellableSpk * pctOfMax10 * 10000) / 10000;
    setFromAmount(val > 0 ? val.toString() : '0');
  };

  const handleExecuteSwap = async () => {
    setSwapError(null);
    setSwapTxSuccess(null);
    setConfirmedDetails(null);

    if (!walletAddress || !walletAddress.startsWith('0x')) {
      setSwapError('Please connect your Web3 wallet (MetaMask / TrustWallet) first.');
      return;
    }
    if (numericFrom <= 0) {
      setSwapError('Please enter a valid SPIKE amount to swap.');
      return;
    }
    if (hasInsufficientSpk || hasNoWalletSpk) {
      setSwapError(`Insufficient on-chain SPIKE in Web3 wallet. Available: ${liveSpikeBalance.toFixed(4)} SPK.`);
      return;
    }
    if (isExceeding10Percent) {
      setSwapError(`10% Sell Limit: Maximum ${maxSellableSpk.toFixed(4)} SPK (10% of your Web3 wallet balance) allowed.`);
      return;
    }

    const win = typeof window !== 'undefined' ? (window as any) : null;
    if (!win?.ethereum) {
      setSwapError('Web3 wallet extension not detected. Please open inside MetaMask, TrustWallet, or Binance Web3 browser.');
      return;
    }

    setIsSwapping(true);
    try {
      setSwapStatusStep('Connecting to Web3 Wallet (BSC Mainnet)...');
      let userWallet = walletAddress;
      const accounts = (await win.ethereum.request({ method: 'eth_requestAccounts' })) as string[];
      if (accounts && accounts[0]) {
        userWallet = accounts[0];
      }

      // Enforce BNB Smart Chain Mainnet (0x38 / Chain ID 56)
      const chainId = await win.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== '0x38' && chainId !== '56' && Number(chainId) !== 56) {
        setSwapStatusStep('Switching Web3 Wallet to BNB Smart Chain Mainnet...');
        try {
          await win.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x38' }],
          });
        } catch (switchErr: any) {
          if (switchErr?.code === 4902) {
            await win.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x38',
                chainName: 'BNB Smart Chain Mainnet',
                nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                rpcUrls: ['https://bsc-dataseed.binance.org/'],
                blockExplorerUrls: ['https://bscscan.com/'],
              }],
            });
          } else {
            throw new Error('Please switch your Web3 wallet network to BNB Smart Chain Mainnet (BSC) to swap.');
          }
        }
      }

      // Fetch live V3 quote, strict 10% server validation, and calldata
      setSwapStatusStep('Fetching Live Nodescan V3 Rate & Quote...');
      const txPrepRes = await fetch('/api/bsc/v3-sell-tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: userWallet,
          spkAmount: numericFrom,
          slippage: Number(AUTO_SLIPPAGE_PERCENT),
        }),
      });
      const prep = await txPrepRes.json();
      if (!txPrepRes.ok || !prep?.success || !prep?.swapTx) {
        throw new Error(prep?.error || 'Unable to prepare Nodescan V3 on-chain swap quote.');
      }

      // Update live state from verified BSC RPC response
      const verifiedWalletSpk = Number(prep.userSpkBalance || 0);
      const verifiedMax10 = Math.floor(verifiedWalletSpk * 0.10 * 10000) / 10000;
      setLiveSpikeBalance(verifiedWalletSpk);
      if (typeof prep.userBnbBalance === 'number') setLiveBnbBalance(prep.userBnbBalance);

      if (verifiedWalletSpk <= 0 || numericFrom > verifiedWalletSpk + 1e-6) {
        throw new Error(`Insufficient on-chain SPIKE balance (${verifiedWalletSpk.toFixed(4)} SPK available in Web3 wallet).`);
      }
      if (numericFrom > verifiedMax10 + 1e-6) {
        throw new Error(`10% Web3 Wallet Limit: Max sellable is ${verifiedMax10.toFixed(4)} SPK.`);
      }
      if (Number(prep.userBnbBalance || 0) < 0.0001) {
        throw new Error('Insufficient BNB in your Web3 wallet to cover BSC network gas fees (~0.0003 BNB needed).');
      }

      // Step 1: Approve SPIKE for Nodescan V3 Smart Router & wait for block confirmation
      if (prep.needsApproval && prep.approveTx) {
        setSwapStatusStep('Step 1/2: Confirm SPIKE Token Approval in Web3 Wallet...');
        const approveHash = await win.ethereum.request({
          method: 'eth_sendTransaction',
          params: [{
            from: userWallet,
            to: prep.approveTx.to,
            data: prep.approveTx.data,
            value: '0x0',
            gas: prep.approveTx.gas || '0x15F90',
          }],
        });

        if (!approveHash || typeof approveHash !== 'string' || !approveHash.startsWith('0x')) {
          throw new Error('SPIKE approval transaction was not submitted.');
        }

        setSwapStatusStep(`Step 1/2 Waiting for Approval Confirmation (${approveHash.slice(0, 10)}...)...`);
        const approveReceipt = await waitForReceipt(win.ethereum, approveHash, 30);
        if (!approveReceipt) {
          throw new Error(`Approval (${approveHash.slice(0, 10)}...) is still pending on BSC. Please wait a few seconds and click Swap again.`);
        }
        if (approveReceipt.status === '0x0' || approveReceipt.status === '0x00' || Number(approveReceipt.status) === 0) {
          throw new Error('SPIKE token approval transaction reverted on BSC Mainnet.');
        }
      }

      // Step 2: Execute Nodescan V3 exactInputSingle (SPIKE -> USDT directly to user's Web3 wallet)
      setSwapStatusStep('Confirm Nodescan V3 Swap (SPIKE ➔ USDT) in Web3 Wallet...');
      const swapHash = await win.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: userWallet,
          to: prep.swapTx.to,
          data: prep.swapTx.data,
          value: '0x0',
          gas: prep.swapTx.gas || '0x55730',
        }],
      });

      if (!swapHash || typeof swapHash !== 'string' || !swapHash.startsWith('0x')) {
        throw new Error('On-chain swap transaction was not submitted.');
      }

      setSwapStatusStep(`Swap Broadcasted (${swapHash.slice(0, 10)}...)! Waiting for BSC Block Confirmation...`);
      const swapReceipt = await waitForReceipt(win.ethereum, swapHash, 30);
      if (!swapReceipt) {
        throw new Error(`Swap broadcasted (${swapHash.slice(0, 10)}...), still confirming on BSC. Check BscScan before retrying.`);
      }
      if (swapReceipt.status === '0x0' || swapReceipt.status === '0x00' || Number(swapReceipt.status) === 0) {
        throw new Error('On-chain Nodescan V3 swap reverted on BSC Mainnet. Please check BNB gas or pool liquidity.');
      }

      // Parse exact USDT credited to the user's Web3 wallet from confirmed BSC receipt logs
      const onChainUsdtReceived = extractReceivedUsdtFromReceipt(swapReceipt, userWallet);
      const finalUsdtOut = onChainUsdtReceived > 0 ? onChainUsdtReceived : Number(prep.expectedUsdtOut || estimatedToUsdt);

      // Sync verified on-chain swap receipt with backend ledger & Firestore
      setSwapStatusStep('Syncing Verified On-Chain Receipt...');
      try {
        const res = await fetch('/api/testnet/swap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: userWallet,
            fromToken: 'SPK',
            toToken: 'USDT',
            amountIn: numericFrom,
            txHash: swapHash,
            onChainSpkBalanceBefore: verifiedWalletSpk,
          }),
        });
        const syncData = await res.json();
        if (!res.ok) {
          console.warn('[SwapModal] Ledger sync notice:', syncData?.error);
        }
      } catch {}

      const execRate = numericFrom > 0 && finalUsdtOut > 0 ? finalUsdtOut / numericFrom : (prep.spotPriceUsdt || liveSpotPrice);
      setSwapTxSuccess(swapHash);
      setConfirmedDetails({
        txHash: swapHash,
        receivedAmount: finalUsdtOut,
        spentAmount: numericFrom,
        executionRate: execRate,
        walletAddress: userWallet,
      });

      onSwapSuccess('SPIKE', 'USDT', numericFrom, finalUsdtOut);

      try {
        window.dispatchEvent(new CustomEvent('spike_trade_executed', {
          detail: {
            fromToken: 'SPIKE',
            toToken: 'USDT',
            fromAmount: numericFrom,
            toAmount: finalUsdtOut,
            walletAddress: userWallet,
            txHash: swapHash,
          },
        }));
      } catch {}

      await refreshOnChainBalances();
      fetchLiveSellQuote(0);
    } catch (err: any) {
      if (err?.code === 4001 || err?.message?.includes('User rejected') || err?.message?.includes('User denied')) {
        setSwapError('Wallet signature cancelled. On-chain swap was not executed.');
      } else {
        setSwapError(err?.shortMessage || err?.message || 'On-chain Web3 swap failed. No tokens were swapped.');
      }
    } finally {
      setIsSwapping(false);
      setSwapStatusStep('');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 select-none">
      {/* Clickable Backdrop */}
      <div
        className="fixed inset-0 bg-[#020b17]/85 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={onClose}
        aria-label="Close dialog backdrop"
      />

      {/* Main Modal Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl bg-gradient-to-b from-[#0d2238] via-[#091728] to-[#040e1b] border-2 border-[#D4AF37]/60 shadow-[0_0_60px_rgba(212,175,55,0.3)] text-white z-10 overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="swap-modal-title"
      >
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#D4AF37]/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#00F0FF]/20 rounded-full blur-[80px] pointer-events-none" />

        {/* Sticky Modal Header */}
        <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-[#1c2b3b]/90 bg-[#0d2238]/95 backdrop-blur-sm flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#f59e0b] text-[#0A0F1D] flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.5)]">
              <span className="material-symbols-outlined text-[22px] sm:text-[24px] font-bold">swap_horiz</span>
            </div>
            <div>
              <h3 id="swap-modal-title" className="text-base sm:text-lg font-extrabold font-headline text-white flex items-center gap-2">
                <span>SPIKE Web3 DEX Swap</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-body font-bold">
                  BSC On-Chain
                </span>
              </h3>
              <p className="text-xs text-slate-300 font-body mt-0.5">Nodescan V3 · Live Pool Settlement</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="group flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1a2b3d] hover:bg-red-500/20 text-[#cbd5e1] hover:text-red-400 border border-[#2d4257] hover:border-red-500/40 shadow-md transition-all active:scale-95 cursor-pointer"
              aria-label="Close Swap Modal"
              title="Close (Esc)"
            >
              <span className="material-symbols-outlined text-[20px] group-hover:rotate-90 transition-transform duration-200">
                close
              </span>
              <span className="hidden sm:inline font-body text-xs font-semibold">Close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">

          {/* Error Banner */}
          {swapError && (
            <div className="p-3.5 rounded-2xl bg-red-950/50 border border-red-500/50 text-red-200 text-xs flex items-start gap-2.5">
              <span className="material-symbols-outlined text-red-400 text-[20px] shrink-0 mt-0.5">error</span>
              <div className="space-y-0.5">
                <div className="font-bold text-red-300">On-Chain Swap Notice</div>
                <div className="leading-relaxed">{swapError}</div>
              </div>
            </div>
          )}

          {/* Success Transaction Receipt */}
          {swapTxSuccess && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-[#061e1b] border-2 border-emerald-500/50 text-white text-xs space-y-2.5 animate-fade-in shadow-[0_0_25px_rgba(16,185,129,0.2)]">
              <div className="flex items-center justify-between gap-2 border-b border-emerald-500/30 pb-2">
                <div className="flex items-center gap-2 text-emerald-400 font-headline font-bold text-sm">
                  <span className="material-symbols-outlined text-emerald-400 text-[22px]">check_circle</span>
                  <span>On-Chain BSC Swap Confirmed!</span>
                </div>
                <a
                  href={`https://bscscan.com/tx/${swapTxSuccess}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[11px] underline hover:text-white flex items-center gap-1 text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/30"
                >
                  <span>BscScan</span>
                  <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                </a>
              </div>

              {confirmedDetails && (
                <div className="space-y-1.5 font-body text-xs">
                  <div className="flex items-center justify-between text-[#cbd5e1]">
                    <span className="text-slate-400">Swapped On-Chain:</span>
                    <span className="text-white font-bold font-mono">
                      {confirmedDetails.spentAmount.toFixed(4)} SPK ➔ {confirmedDetails.receivedAmount.toFixed(4)} USDT
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#cbd5e1]">
                    <span className="text-slate-400">Live Execution Rate:</span>
                    <span className="text-[#D4AF37] font-mono font-bold">
                      1 SPK = ${confirmedDetails.executionRate.toFixed(4)} USDT
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Credited to Web3 Wallet:</span>
                    <span className="text-emerald-400 font-extrabold text-sm font-headline">
                      +{Number(confirmedDetails.receivedAmount).toFixed(4)} USDT
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#94a3b8]">
                    <span>Recipient Wallet:</span>
                    <span className="text-[#00F0FF] font-mono font-medium truncate max-w-[180px]">
                      {confirmedDetails.walletAddress}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#64748b] text-xs pt-1 border-t border-emerald-500/20 font-body">
                    <span>Tx Hash:</span>
                    <span className="truncate max-w-[200px] font-mono">{confirmedDetails.txHash}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SWAP FORM INPUTS */}
          <div className="space-y-2">
            {/* FROM TOKEN CARD (Web3 Wallet SPIKE) */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-[#0b1f36] via-[#071525] to-[#05101d] border border-[#D4AF37]/50 shadow-[0_0_24px_rgba(212,175,55,0.18),inset_0_1px_0_rgba(212,175,55,0.2)] hover:border-[#D4AF37]/75 hover:shadow-[0_0_30px_rgba(212,175,55,0.28)] transition-all">
              <div className="flex items-center justify-between text-xs text-[#94a3b8] mb-2 font-body">
                <span className="font-medium text-[#cbd5e1] flex items-center gap-1.5">
                  <span>You Sell (From Web3 Wallet)</span>
                  <span className="px-2 py-0.5 text-xs rounded font-body font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    BEP-20 On-Chain
                  </span>
                </span>
                <span className="font-semibold flex items-center gap-1.5">
                  <span className="text-slate-400">Wallet SPK:</span>
                  <span className="text-white font-bold font-mono tabular-nums">
                    {isLoadingOnchain
                      ? 'Checking...'
                      : `${liveSpikeBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} SPK`}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      refreshOnChainBalances();
                      fetchLiveSellQuote(numericFrom);
                    }}
                    disabled={isLoadingOnchain}
                    title="Refresh live Web3 wallet balance & V3 pool price"
                    className="text-[#00F0FF] hover:text-white p-0.5 rounded transition-transform active:rotate-180 cursor-pointer"
                  >
                    <span className={`material-symbols-outlined text-[15px] ${isLoadingOnchain ? 'animate-spin' : ''}`}>sync</span>
                  </button>
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <input
                  type="number"
                  value={fromAmount}
                  onChange={(e) => {
                    setSwapError(null);
                    setFromAmount(e.target.value);
                  }}
                  placeholder="0.00"
                  min="0"
                  step="any"
                  className="w-full bg-transparent text-2xl sm:text-3xl font-extrabold font-headline text-white placeholder-slate-600 focus:outline-none tabular-nums"
                />

                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#122130] border border-[#1c2b3b] shrink-0 shadow-sm">
                  <img
                    src={SPIKE_LOGO_URL}
                    alt="SPIKE"
                    className="w-6 h-6 object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <span className="font-extrabold font-headline text-sm sm:text-base">SPIKE</span>
                </div>
              </div>

              {/* 10% Web3 Wallet Limit Notice & Percentage Chips */}
              <div className="flex flex-col gap-2 pt-2.5 mt-2 border-t border-[#1c2b3b]/60">
                <div className={`p-2.5 rounded-xl text-xs font-body flex items-center justify-between gap-2 ${
                  isExceeding10Percent || hasInsufficientSpk
                    ? 'bg-red-950/40 border border-red-500/50 text-red-400'
                    : 'bg-[#D4AF37]/10 border border-[#D4AF37]/35 text-[#D4AF37]'
                }`}>
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-[16px]">
                      {isExceeding10Percent || hasInsufficientSpk ? 'warning' : 'security'}
                    </span>
                    <span>
                      {hasNoWalletSpk
                        ? 'Your connected Web3 wallet currently holds 0.00 SPK.'
                        : isExceeding10Percent
                          ? `Exceeds 10% limit: Max ${maxSellableSpk.toFixed(4)} SPK allowed from wallet`
                          : `10% Web3 Wallet Limit: Max ${maxSellableSpk.toFixed(4)} SPK sellable`}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded font-bold font-headline bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] shrink-0">
                    10% Max
                  </span>
                </div>

                <div className="flex items-center justify-end">
                  <div className="flex items-center gap-1.5">
                    {[
                      { label: '2.5%', pct: 0.25, title: '2.5% of Web3 Wallet SPIKE' },
                      { label: '5.0%', pct: 0.50, title: '5.0% of Web3 Wallet SPIKE' },
                      { label: '7.5%', pct: 0.75, title: '7.5% of Web3 Wallet SPIKE' },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => handlePercentage(btn.pct)}
                        disabled={maxSellableSpk <= 0}
                        className="px-2.5 py-1 rounded-lg bg-[#122130] hover:bg-[#1c2b3b] text-xs text-[#94a3b8] hover:text-white border border-[#1c2b3b] font-body font-semibold transition-colors cursor-pointer disabled:opacity-40"
                        title={btn.title}
                      >
                        {btn.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handlePercentage(1.0)}
                      disabled={maxSellableSpk <= 0}
                      className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#D4AF37]/20 to-[#f59e0b]/20 hover:from-[#D4AF37]/40 hover:to-[#f59e0b]/40 text-xs text-[#D4AF37] font-bold border border-[#D4AF37]/40 font-headline transition-colors cursor-pointer disabled:opacity-40"
                      title="Sell Maximum Allowable 10% of Web3 Wallet SPIKE Balance"
                    >
                      10% (MAX)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SWAP ROUTE DIRECTION */}
            <div className="flex items-center justify-center -my-2.5 relative z-10">
              <div
                className="w-10 h-10 rounded-full bg-[#122130] border-2 border-[#D4AF37] text-[#D4AF37] flex items-center justify-center shadow-[0_0_16px_rgba(212,175,55,0.45)]"
                title="Nodescan V3 On-Chain Route: Sell SPIKE ➔ Receive USDT"
              >
                <span className="material-symbols-outlined text-[20px] font-bold">arrow_downward</span>
              </div>
            </div>

            {/* TO TOKEN CARD (USDT credited directly to Web3 Wallet) */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-[#092036] via-[#071627] to-[#05101d] border border-[#00F0FF]/45 shadow-[0_0_24px_rgba(0,240,255,0.16),inset_0_1px_0_rgba(0,240,255,0.2)] hover:border-[#00F0FF]/70 hover:shadow-[0_0_30px_rgba(0,240,255,0.26)] transition-all">
              <div className="flex items-center justify-between text-xs text-[#94a3b8] mb-2 font-body">
                <span className="font-medium text-[#cbd5e1] flex items-center gap-1.5">
                  <span>You Receive (Live V3 Quote)</span>
                  <span className="px-2 py-0.5 text-xs rounded font-body font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {quoterVerified ? 'QuoterV2 Live' : 'Pool Live'}
                  </span>
                </span>
                <span className="font-semibold flex items-center gap-1.5">
                  <span className="text-slate-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Wallet USDT:</span>
                  </span>
                  <span className="text-white font-bold font-mono tabular-nums">
                    {walletAddress
                      ? isLoadingOnchain
                        ? 'Checking BSC...'
                        : `${liveUsdtBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} USDT`
                      : '0.00 USDT'}
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="text-2xl sm:text-3xl font-extrabold font-headline text-emerald-400 tabular-nums truncate">
                  {isQuoting && numericFrom > 0
                    ? '...'
                    : estimatedToUsdt > 0
                      ? estimatedToUsdt.toFixed(4)
                      : '0.0000'}
                </div>

                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#122130] border border-[#1c2b3b] shrink-0 shadow-sm">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    $
                  </div>
                  <span className="font-extrabold font-headline text-sm sm:text-base">USDT</span>
                </div>
              </div>
            </div>
          </div>

          {/* TELEMETRY & ON-CHAIN ROUTE */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-[#081c30] to-[#05111f] border border-emerald-400/40 shadow-[0_0_22px_rgba(16,185,129,0.16),inset_0_1px_0_rgba(16,185,129,0.16)] space-y-2.5 text-xs text-[#94a3b8] font-body">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-slate-400 font-medium">Settlement Wallet (USDT Credit)</span>
              <span className="font-mono text-emerald-400 text-xs font-semibold truncate max-w-[240px]">
                {walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)} (Your Web3 Wallet)` : 'Not Connected'}
              </span>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-slate-400 font-medium">Live V3 Pool Rate</span>
              <span className="font-mono text-white text-xs font-semibold">
                {effectiveLiveRate > 0 ? `1 SPIKE ≈ ${effectiveLiveRate.toFixed(6)} USDT` : 'Fetching live BSC rate...'}
              </span>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-slate-400 font-medium">Wallet BNB (Gas)</span>
              <span className={`font-mono text-xs font-semibold ${liveBnbBalance >= 0.0002 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {liveBnbBalance.toFixed(4)} BNB {liveBnbBalance < 0.0002 ? '(Low Gas)' : '(Ready)'}
              </span>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-slate-400 font-medium">On-Chain Liquidity Route</span>
              <span className="font-mono text-white text-xs truncate max-w-[240px]">
                SPIKE ➔ Nodescan V3 (0xdB75...2F3c) ➔ USDT
              </span>
            </div>
          </div>
        </div>

        {/* Sticky Modal Footer */}
        <div className="shrink-0 px-4 sm:px-6 py-4 border-t border-[#1c2b3b]/90 bg-[#0d2238]/95 backdrop-blur-sm space-y-2.5 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-3.5 px-5 rounded-2xl font-headline font-bold text-xs sm:text-sm bg-[#122130] hover:bg-[#1c2b3b] text-[#cbd5e1] hover:text-white border border-[#2d4257] transition-all shrink-0 active:scale-95 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleExecuteSwap}
              disabled={isSwapping || numericFrom <= 0 || hasNoWalletSpk || hasInsufficientSpk || isExceeding10Percent}
              className="flex-1 py-3.5 px-4 rounded-2xl font-headline font-extrabold text-xs sm:text-sm text-[#0A0F1D] bg-gradient-to-r from-[#D4AF37] to-[#f59e0b] hover:from-[#ffe088] hover:to-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.45)] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
            >
              {isSwapping ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#0A0F1D] border-t-transparent rounded-full animate-spin" />
                  <span className="truncate">{swapStatusStep || 'Executing Web3 On-Chain Swap...'}</span>
                </>
              ) : hasNoWalletSpk ? (
                <span>0.00 SPK in Web3 Wallet</span>
              ) : hasInsufficientSpk ? (
                <span>Insufficient Web3 Wallet SPIKE</span>
              ) : isExceeding10Percent ? (
                <span>Exceeds 10% Limit (Max {maxSellableSpk.toFixed(4)} SPK)</span>
              ) : numericFrom <= 0 ? (
                <span>Enter SPK Amount to Swap</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px] font-bold">account_balance_wallet</span>
                  <span>
                    Swap {numericFrom} SPK On-Chain ➔ ~{estimatedToUsdt.toFixed(4)} USDT
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
