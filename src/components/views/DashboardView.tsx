import React, { useState, useEffect, useMemo } from 'react';
import { MiningNode, RewardTransaction } from '../../types';
import { SPIKE_LOGO_URL } from '../../data/mockData';
import { TradingViewChart } from '../TradingViewChart';
import { GoldenHawkMiningSection } from '../GoldenHawkMiningSection';

const BSCSCAN_TOKEN_URL = 'https://bscscan.com/token/0x71C8a914B97e889F12A0987cB32456Fa12349A2';
const PANCAKESWAP_ROUTER_URL = 'https://pancakeswap.finance/swap?outputCurrency=0x71C8a914B97e889F12A0987cB32456Fa12349A2';

interface CandleTick {
  time: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isBuySurge?: boolean;
}

interface LiveTxn {
  id: string;
  type: 'buy' | 'sell';
  amountSpk: number;
  amountUsd: number;
  price: number;
  timeAgo: string;
  wallet: string;
  isWhale?: boolean;
}

interface DashboardViewProps {
  nodes: MiningNode[];
  rewards: RewardTransaction[];
  walletBalance: number;
  dailyEarnings: number;
  onRestartNode: (nodeId: string) => void;
  onStopNode: (nodeId: string) => void;
  onStartNode: (nodeId: string) => void;
  onOpenDeployModal: () => void;
  onOpenClaimModal: () => void;
  onOpenAuditModal: () => void;
  onOpenSwapModal?: (initialMode?: 'sellSpike' | 'buySpike') => void;
  onOpenDepositModal?: () => void;
  onSwapSuccess?: (fromToken: string, toToken: string, fromAmount: number, toAmount: number) => void;
  walletBNB?: number;
  onCopyText: (text: string) => void;
  walletAddress?: string;
  onClaimReferralBonus?: (amount: number) => void;
  onNavigateToReferrals?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  nodes,
  rewards,
  walletBalance,
  dailyEarnings,
  onRestartNode,
  onStopNode,
  onStartNode,
  onOpenDeployModal,
  onOpenClaimModal,
  onOpenAuditModal,
  onOpenSwapModal,
  onOpenDepositModal,
  onSwapSuccess,
  walletBNB = 0.005,
  onCopyText,
  walletAddress = '',
  onClaimReferralBonus,
  onNavigateToReferrals,
}) => {
  // Testnet Engine & Hashrate Auto-Buy States
  const [testnetWallet, setTestnetWallet] = useState<{
    address: string;
    testnetUsdt: number;
    testnetSpk: number;
    autoBuyEnabled: boolean;
    slippageTolerance: number;
    totalHarvestAutoBoughtSpk: number;
    totalUsdtSpentOnAutoBuy: number;
  }>({
    address: walletAddress || '0x71C8a914B97e889F12A0987cB32456Fa12349A2',
    testnetUsdt: 1000.0,
    testnetSpk: 250.0,
    autoBuyEnabled: true,
    slippageTolerance: 0.5,
    totalHarvestAutoBoughtSpk: 125.0,
    totalUsdtSpentOnAutoBuy: 4.31,
  });

  const [spikeTokenInfo, setSpikeTokenInfo] = useState<{
    name: string;
    symbol: string;
    totalSupply: number;
    circulatingSupply: number;
    currentPrice: number;
    poolSpkReserve: number;
    poolUsdtReserve: number;
    contractAddress: string;
    buyPressure: number;
    volume24h: number;
    change24h: number;
    high24h?: number;
    low24h?: number;
  }>({
    name: 'SPIKE',
    symbol: 'SPK',
    totalSupply: 50_000_000,
    circulatingSupply: 12_450_000,
    currentPrice: 0.0345,
    poolSpkReserve: 2_500_000,
    poolUsdtReserve: 86_250,
    contractAddress: '0x5P1KE777cE25a947C590823FaBe876610bFa3109',
    buyPressure: 88.5,
    volume24h: 1_420_000,
    change24h: 8.42,
    high24h: 0.0368,
    low24h: 0.0332,
  });

  const [testnetTransactions, setTestnetTransactions] = useState<any[]>([]);
  const [isHarvestAutoBuying, setIsHarvestAutoBuying] = useState<boolean>(false);
  const [lastAutoBuyReceipt, setLastAutoBuyReceipt] = useState<any | null>(null);
  const [pendingMinedSpk, setPendingMinedSpk] = useState<number>(18.42);
  const [isTestnetFaucetLoading, setIsTestnetFaucetLoading] = useState<boolean>(false);
  const [testnetActiveTab, setTestnetActiveTab] = useState<'autobuy' | 'swap' | 'history'>('autobuy');
  const [testnetSwapFrom, setTestnetSwapFrom] = useState<'USDT' | 'SPK'>('USDT');
  const [testnetSwapAmount, setTestnetSwapAmount] = useState<string>('50');
  const [isTestnetSwapping, setIsTestnetSwapping] = useState<boolean>(false);
  const [testnetSwapSuccessTx, setTestnetSwapSuccessTx] = useState<any | null>(null);

  // Global Protocol Treasury State (Common for all users)
  const [treasuryData, setTreasuryData] = useState<{
    treasuryBalanceUsdt: number;
    treasuryWalletAddress: string;
    depositRequiredUsdt: number;
    miningCostUsdt: number;
    totalProjectCostUsdt: number;
  }>({
    treasuryBalanceUsdt: 24850.0,
    treasuryWalletAddress: '0xDE7BfCaDE6F9BcC411aC67D970A4618054B8a4c7',
    depositRequiredUsdt: 5.0,
    miningCostUsdt: 10.0,
    totalProjectCostUsdt: 15.0,
  });

  const fetchTreasuryInfo = async () => {
    try {
      const res = await fetch('/api/treasury');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          setTreasuryData({
            treasuryBalanceUsdt: data.treasuryBalanceUsdt || 24850.0,
            treasuryWalletAddress: data.treasuryWalletAddress || '0xDE7BfCaDE6F9BcC411aC67D970A4618054B8a4c7',
            depositRequiredUsdt: data.depositRequiredUsdt || 5.0,
            miningCostUsdt: data.miningCostUsdt || 10.0,
            totalProjectCostUsdt: data.totalProjectCostUsdt || 15.0,
          });
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchTreasuryInfo();
    const handleUpdated = () => fetchTreasuryInfo();
    window.addEventListener('spike_balance_updated', handleUpdated);
    return () => window.removeEventListener('spike_balance_updated', handleUpdated);
  }, []);

  // Load live testnet data from backend
  useEffect(() => {
    const fetchTestnetData = async () => {
      try {
        const addr = walletAddress || '0x71C8a914B97e889F12A0987cB32456Fa12349A2';
        const [tokenRes, walletRes] = await Promise.all([
          fetch('/api/testnet/spike/info'),
          fetch(`/api/testnet/wallet/${addr}`),
        ]);
        if (tokenRes.ok) {
          const tData = await tokenRes.json();
          if (tData.token) setSpikeTokenInfo(tData.token);
        }
        if (walletRes.ok) {
          const wData = await walletRes.json();
          if (wData.wallet) setTestnetWallet(wData.wallet);
          if (wData.transactions) setTestnetTransactions(wData.transactions);
        }
      } catch (err) {
        console.error('Failed to load testnet state:', err);
      }
    };
    fetchTestnetData();
  }, [walletAddress]);

  // DEX Swap System State (Inside Dashboard)
  const [dashFromToken, setDashFromToken] = useState<string>('SPIKE');
  const [dashToToken, setDashToToken] = useState<string>('USDT');
  const [dashFromAmount, setDashFromAmount] = useState<string>('100');
  const [dashIsSwapping, setDashIsSwapping] = useState<boolean>(false);
  const [dashSwapSuccessTx, setDashSwapSuccessTx] = useState<string | null>(null);

  const dashTokens: Record<string, { symbol: string; name: string; balance: number; rate: number; isSpike?: boolean; icon?: string }> = {
    SPIKE: { symbol: 'SPIKE', name: 'SPIKE Protocol', balance: walletBalance, rate: 1.0, isSpike: true },
    USDT: { symbol: 'USDT', name: 'Tether USD (BEP-20)', balance: walletBalance, rate: 1.0, icon: 'attach_money' },
    BNB: { symbol: 'BNB', name: 'BNB Smart Chain', balance: walletBNB ?? 0.005, rate: 620.0, icon: 'token' },
  };

  const currentFrom = dashTokens[dashFromToken] || dashTokens.SPIKE;
  const currentTo = dashTokens[dashToToken] || dashTokens.USDT;
  const numFromAmount = parseFloat(dashFromAmount) || 0;
  const dashRate = currentFrom.rate / currentTo.rate;
  const calculatedToAmount = numFromAmount * dashRate;

  const handleFlipDashTokens = () => {
    setDashFromToken(dashToToken);
    setDashToToken(dashFromToken);
  };

  const handleExecuteDashSwap = () => {
    if (numFromAmount <= 0 || numFromAmount > currentFrom.balance) return;
    setDashIsSwapping(true);
    setDashSwapSuccessTx(null);
    setTimeout(() => {
      setDashIsSwapping(false);
      const fakeTx = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      setDashSwapSuccessTx(fakeTx);
      onSwapSuccess?.(currentFrom.symbol, currentTo.symbol, numFromAmount, calculatedToAmount);
    }, 1100);
  };

  const [chartMode, setChartMode] = useState<'animated-stream' | 'hashrate'>('animated-stream');
  const [timeframe, setTimeframe] = useState<'24H' | '7D' | '30D'>('24H');
  const [streamInterval, setStreamInterval] = useState<'1M' | '5M' | '15M' | '1H' | '24H'>('1M');
  const [currentPrice, setCurrentPrice] = useState<number>(0.03450);
  const [priceChange24h, setPriceChange24h] = useState<number>(8.42);
  const [lastTickDirection, setLastTickDirection] = useState<'up' | 'down'>('up');
  const [hoveredCandle, setHoveredCandle] = useState<{
    x: number;
    y: number;
    tick: CandleTick;
  } | null>(null);

  // Initial live ticks series around SPIKE spot price ($0.03450 USDT)
  const [ticks, setTicks] = useState<CandleTick[]>([
    { time: '10:14', open: 0.0322, high: 0.0330, low: 0.0320, close: 0.0328, price: 0.0328, volume: 14200, isBuySurge: true },
    { time: '10:15', open: 0.0328, high: 0.0335, low: 0.0325, close: 0.0332, price: 0.0332, volume: 18500, isBuySurge: true },
    { time: '10:16', open: 0.0332, high: 0.0338, low: 0.0330, close: 0.0334, price: 0.0334, volume: 9200, isBuySurge: false },
    { time: '10:17', open: 0.0334, high: 0.0342, low: 0.0332, close: 0.0340, price: 0.0340, volume: 24000, isBuySurge: true },
    { time: '10:18', open: 0.0340, high: 0.0346, low: 0.0338, close: 0.0344, price: 0.0344, volume: 16800, isBuySurge: true },
    { time: '10:19', open: 0.0344, high: 0.0349, low: 0.0341, close: 0.0345, price: 0.0345, volume: 21000, isBuySurge: true },
    { time: '10:20', open: 0.0345, high: 0.0350, low: 0.0342, close: 0.0347, price: 0.0347, volume: 11500, isBuySurge: false },
    { time: '10:21', open: 0.0347, high: 0.0352, low: 0.0344, close: 0.0349, price: 0.0349, volume: 32000, isBuySurge: true },
    { time: '10:22', open: 0.0349, high: 0.0355, low: 0.0346, close: 0.0345, price: 0.0345, volume: 28500, isBuySurge: true },
  ]);

  // Live Buy/Sell Transactions Stream for SPIKE (High Buy side hype 84%+)
  const [liveTxns, setLiveTxns] = useState<LiveTxn[]>([
    { id: 'tx-1', type: 'buy', amountSpk: 1250, amountUsd: 43.12, price: 0.0345, timeAgo: 'Just now', wallet: '0x8a92...3f1c', isWhale: false },
    { id: 'tx-2', type: 'buy', amountSpk: 6500, amountUsd: 224.25, price: 0.0345, timeAgo: '2s ago', wallet: '0x4f11...9cb2', isWhale: true },
    { id: 'tx-3', type: 'buy', amountSpk: 850, amountUsd: 29.32, price: 0.0345, timeAgo: '5s ago', wallet: '0xd340...e17a', isWhale: false },
    { id: 'tx-4', type: 'sell', amountSpk: 220, amountUsd: 7.59, price: 0.0344, timeAgo: '9s ago', wallet: '0x12bb...a840', isWhale: false },
    { id: 'tx-5', type: 'buy', amountSpk: 2400, amountUsd: 82.80, price: 0.0345, timeAgo: '12s ago', wallet: '0x99cc...451a', isWhale: false },
    { id: 'tx-6', type: 'buy', amountSpk: 15000, amountUsd: 517.50, price: 0.0345, timeAgo: '16s ago', wallet: '0x6e90...bb44', isWhale: true },
  ]);
  const [buyPressure, setBuyPressure] = useState<number>(84.5);
  const [totalBuysCount, setTotalBuysCount] = useState<number>(1420);
  const [totalSellsCount, setTotalSellsCount] = useState<number>(270);

  // Real-time animation ticker: updates price & adds live candle every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Generate realistic micro delta with upward buy pressure bias for SPIKE
      const delta = (Math.random() - 0.44) * 0.00008;

      setTicks((prev) => {
        const last = prev[prev.length - 1];
        const newPrice = Math.max(0.0315, +(last.close + delta).toFixed(5));
        const isUp = newPrice >= last.close;
        const newHigh = +(Math.max(last.close, newPrice) + Math.random() * 0.00004).toFixed(5);
        const newLow = +(Math.min(last.close, newPrice) - Math.random() * 0.00004).toFixed(5);
        
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        setCurrentPrice(newPrice);
        setLastTickDirection(isUp ? 'up' : 'down');

        const newTick: CandleTick = {
          time: timeStr,
          open: last.close,
          close: newPrice,
          high: newHigh,
          low: newLow,
          price: newPrice,
          volume: Math.floor(1200 + Math.random() * 4500),
          isBuySurge: isUp,
        };

        // Create new live trade (85% buy, 15% sell)
        const isBuyTrade = Math.random() < 0.85;
        const isWhaleTrade = isBuyTrade && Math.random() < 0.22;
        const tradeAmount = isWhaleTrade
          ? Math.floor(4000 + Math.random() * 12000)
          : isBuyTrade
          ? Math.floor(350 + Math.random() * 2200)
          : Math.floor(80 + Math.random() * 450);
        const tradeUsd = Number((tradeAmount * newPrice).toFixed(2));
        const randomHex = Math.random().toString(16).substring(2, 6);
        const randomEnd = Math.random().toString(16).substring(2, 6);

        const newTx: LiveTxn = {
          id: `tx-${Date.now()}`,
          type: isBuyTrade ? 'buy' : 'sell',
          amountSpk: tradeAmount,
          amountUsd: tradeUsd,
          price: newPrice,
          timeAgo: 'Just now',
          wallet: `0x${randomHex}...${randomEnd}`,
          isWhale: isWhaleTrade,
        };

        setLiveTxns((prevTx) => [newTx, ...prevTx.slice(0, 5)]);
        if (isBuyTrade) {
          setTotalBuysCount((c) => c + 1);
          setBuyPressure((p) => Math.min(94, Math.max(79, Number((p + 0.1).toFixed(1)))));
        } else {
          setTotalSellsCount((c) => c + 1);
          setBuyPressure((p) => Math.max(76, Number((p - 0.2).toFixed(1))));
        }

        const updated = [...prev.slice(prev.length >= 12 ? 1 : 0), newTick];
        return updated;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const [hoveredDataPoint, setHoveredDataPoint] = useState<{
    x: number;
    y: number;
    hashrate: string;
    time: string;
  } | null>(null);

  // Calculate live total hashrate from active mining nodes
  const totalHashrate = nodes
    .filter((n) => n.status === 'mining')
    .reduce((acc, curr) => acc + curr.hashrate, 0);

  const activeNodeCount = nodes.filter((n) => n.status === 'mining').length;
  const operationalEfficiency = nodes.length > 0 ? Math.round((activeNodeCount / nodes.length) * 100) : 0;

  // Timeframe chart curve data configurations
  const chartConfigs = {
    '24H': {
      points: [
        { cx: 50, cy: 155, rate: '1.18 TH/s', time: '00:00 UTC' },
        { cx: 200, cy: 110, rate: '1.21 TH/s', time: '06:00 UTC' },
        { cx: 400, cy: 125, rate: '1.20 TH/s', time: '12:00 UTC' },
        { cx: 600, cy: 75, rate: '1.23 TH/s', time: '18:00 UTC' },
        { cx: 780, cy: 45, rate: `${totalHashrate.toFixed(2)} TH/s`, time: 'Now' },
      ],
      pathD: 'M 0 160 Q 100 135, 200 110 T 400 125 T 600 75 T 780 45 L 800 40',
      fillD: 'M 0 160 Q 100 135, 200 110 T 400 125 T 600 75 T 780 45 L 800 40 L 800 200 L 0 200 Z',
      timeLabels: ['00:00 UTC', '06:00 UTC', '12:00 UTC', '18:00 UTC', `Now (${totalHashrate.toFixed(2)} TH/s)`],
    },
    '7D': {
      points: [
        { cx: 50, cy: 140, rate: '1.12 TH/s', time: 'Day 1' },
        { cx: 200, cy: 95, rate: '1.25 TH/s', time: 'Day 3' },
        { cx: 400, cy: 130, rate: '1.16 TH/s', time: 'Day 5' },
        { cx: 600, cy: 65, rate: '1.28 TH/s', time: 'Day 6' },
        { cx: 780, cy: 45, rate: `${totalHashrate.toFixed(2)} TH/s`, time: 'Today' },
      ],
      pathD: 'M 0 145 Q 100 110, 200 95 T 400 130 T 600 65 T 780 45 L 800 40',
      fillD: 'M 0 145 Q 100 110, 200 95 T 400 130 T 600 65 T 780 45 L 800 40 L 800 200 L 0 200 Z',
      timeLabels: ['7 Days Ago', '5 Days Ago', '3 Days Ago', 'Yesterday', `Now (${totalHashrate.toFixed(2)} TH/s)`],
    },
    '30D': {
      points: [
        { cx: 50, cy: 165, rate: '0.98 TH/s', time: 'Week 1' },
        { cx: 200, cy: 120, rate: '1.10 TH/s', time: 'Week 2' },
        { cx: 400, cy: 90, rate: '1.22 TH/s', time: 'Week 3' },
        { cx: 600, cy: 60, rate: '1.26 TH/s', time: 'Week 4' },
        { cx: 780, cy: 45, rate: `${totalHashrate.toFixed(2)} TH/s`, time: 'Current' },
      ],
      pathD: 'M 0 170 Q 100 140, 200 120 T 400 90 T 600 60 T 780 45 L 800 40',
      fillD: 'M 0 170 Q 100 140, 200 120 T 400 90 T 600 60 T 780 45 L 800 40 L 800 200 L 0 200 Z',
      timeLabels: ['30 Days Ago', '20 Days Ago', '10 Days Ago', '5 Days Ago', `Now (${totalHashrate.toFixed(2)} TH/s)`],
    },
  };

  const currentChart = chartConfigs[timeframe];

  // SVG Scaled coordinates for the Live Animated Chart
  const svgMetrics = useMemo(() => {
    if (!ticks.length) return { pathD: '', fillD: '', coords: [], minP: 0, maxP: 1 };
    const allLows = ticks.map((t) => t.low);
    const allHighs = ticks.map((t) => t.high);
    const minP = Math.min(...allLows) * 0.9992;
    const maxP = Math.max(...allHighs) * 1.0008;
    const range = maxP - minP || 0.00001;

    const width = 800;
    const height = 200;
    const paddingX = 40;
    const paddingY = 25;
    const plotWidth = width - paddingX * 2;
    const plotHeight = height - paddingY * 2;

    const coords = ticks.map((t, idx) => {
      const x = paddingX + (idx / (ticks.length - 1 || 1)) * plotWidth;
      const yClose = paddingY + plotHeight - ((t.close - minP) / range) * plotHeight;
      const yOpen = paddingY + plotHeight - ((t.open - minP) / range) * plotHeight;
      const yHigh = paddingY + plotHeight - ((t.high - minP) / range) * plotHeight;
      const yLow = paddingY + plotHeight - ((t.low - minP) / range) * plotHeight;
      return { x, yClose, yOpen, yHigh, yLow, tick: t };
    });

    let pathD = `M ${coords[0].x} ${coords[0].yClose}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const midX = (prev.x + curr.x) / 2;
      pathD += ` C ${midX} ${prev.yClose}, ${midX} ${curr.yClose}, ${curr.x} ${curr.yClose}`;
    }

    const last = coords[coords.length - 1];
    const first = coords[0];
    const fillD = `${pathD} L ${last.x} ${height} L ${first.x} ${height} Z`;

    return { pathD, fillD, coords, minP, maxP };
  }, [ticks]);

  // Live Hashrate accumulator for pending mined SPK
  useEffect(() => {
    const interval = setInterval(() => {
      const activeHash = totalHashrate > 0 ? totalHashrate : 1.25;
      const ratePerSec = activeHash * 0.025;
      setPendingMinedSpk((prev) => Number((prev + ratePerSec).toFixed(3)));
    }, 2000);
    return () => clearInterval(interval);
  }, [totalHashrate]);

  // Calculated required USDT for auto-buying current pending mined SPK
  const requiredUsdtForPending = useMemo(() => {
    return Number((pendingMinedSpk * spikeTokenInfo.currentPrice).toFixed(4));
  }, [pendingMinedSpk, spikeTokenInfo.currentPrice]);

  // Execute Harvest & Auto-Buy via backend testnet engine
  const handleExecuteHarvestAutoBuy = async () => {
    if (pendingMinedSpk <= 0) return;
    setIsHarvestAutoBuying(true);
    try {
      const addr = walletAddress || '0x71C8a914B97e889F12A0987cB32456Fa12349A2';
      const res = await fetch('/api/testnet/harvest-autobuy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: addr,
          minedSpkAmount: pendingMinedSpk,
          hashrate: totalHashrate || 1.25,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestnetWallet(data.wallet);
        setSpikeTokenInfo(data.token);
        setLastAutoBuyReceipt(data.tx);
        setTestnetTransactions((prev) => [data.tx, ...prev]);
        setPendingMinedSpk(0.25); // reset with tiny seed

        // Push bullish trade to order stream
        const newTrade: LiveTxn = {
          id: `tx-spk-${Date.now()}`,
          type: 'buy',
          amountSpk: Math.round(data.tx.spkAmount),
          amountUsd: Number(data.tx.usdtAmount.toFixed(2)),
          price: data.tx.priceUsdt,
          timeAgo: 'Just now',
          wallet: addr ? `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}` : '0xAuto...Miner',
          isWhale: data.tx.spkAmount > 50,
        };
        setLiveTxns((prev) => [newTrade, ...prev.slice(0, 5)]);
      } else {
        alert(data.error || 'Failed to execute auto-buy transaction');
      }
    } catch (err: any) {
      console.error('Harvest auto-buy error:', err);
    } finally {
      setIsHarvestAutoBuying(false);
    }
  };

  // 1-Click Faucet topup
  const handleClaimTestnetFaucet = async () => {
    setIsTestnetFaucetLoading(true);
    try {
      const addr = walletAddress || '0x71C8a914B97e889F12A0987cB32456Fa12349A2';
      const res = await fetch('/api/testnet/wallet/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: addr,
          usdtAmount: 500,
          spkAmount: 100,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestnetWallet(data.wallet);
        setTestnetTransactions((prev) => [data.tx, ...prev]);
      }
    } catch (err) {
      console.error('Faucet error:', err);
    } finally {
      setIsTestnetFaucetLoading(false);
    }
  };

  // Toggle Auto-buy automation
  const handleToggleAutoBuySetting = async (enabled: boolean) => {
    try {
      const addr = walletAddress || '0x71C8a914B97e889F12A0987cB32456Fa12349A2';
      const res = await fetch('/api/testnet/wallet/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: addr,
          autoBuyEnabled: enabled,
          slippageTolerance: testnetWallet.slippageTolerance,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestnetWallet(data.wallet);
      }
    } catch (err) {
      console.error('Settings error:', err);
    }
  };

  // Manual Testnet Swap
  const handleExecuteManualTestnetSwap = async () => {
    const num = parseFloat(testnetSwapAmount) || 0;
    if (num <= 0) return;
    setIsTestnetSwapping(true);
    setTestnetSwapSuccessTx(null);
    try {
      const addr = walletAddress || '0x71C8a914B97e889F12A0987cB32456Fa12349A2';
      const toToken = testnetSwapFrom === 'USDT' ? 'SPK' : 'USDT';
      const res = await fetch('/api/testnet/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: addr,
          fromToken: testnetSwapFrom,
          toToken,
          amountIn: num,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestnetWallet(data.wallet);
        setSpikeTokenInfo(data.token);
        setTestnetSwapSuccessTx(data.tx);
        setTestnetTransactions((prev) => [data.tx, ...prev]);
      } else {
        alert(data.error || 'Swap failed');
      }
    } catch (err) {
      console.error('Swap error:', err);
    } finally {
      setIsTestnetSwapping(false);
    }
  };

  return (
    <div className="flex flex-col w-full space-y-6 md:space-y-8 pb-12">
      {/* ============================================================
          DASHBOARD EXECUTIVE OVERVIEW & FAST ACCESS
         ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#122130] p-5 rounded-2xl border border-[#1c2b3b] shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#00F0FF] to-[#D4AF37] p-0.5 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
            <div className="w-full h-full bg-[#0a0f1d] rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px] text-[#00F0FF]">dashboard</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black font-headline text-white tracking-tight">
                Miner Executive Dashboard
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Live Hashrate Monitoring, BSC Validator Clusters, and SPIKE DEX Protocol.
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================
          GOLDEN HAWK (BAAZ) APEX MINING PROTOCOL ENGINE
         ============================================================ */}
      <GoldenHawkMiningSection
        totalHashrate={totalHashrate}
        walletBalance={walletBalance}
        walletAddress={walletAddress}
        isNodeActive={activeNodeCount > 0}
        activeNodesCount={activeNodeCount}
        onClaimReward={onClaimReferralBonus}
        onDeployMoreNodes={onOpenDeployModal}
        onAutoBuySuccess={(tx, wallet, token) => {
          if (wallet) setTestnetWallet(wallet);
          if (token) setSpikeTokenInfo(token);
          if (tx) {
            setLastAutoBuyReceipt(tx);
            setTestnetTransactions((prev) => [tx, ...prev]);
            const newTrade: LiveTxn = {
              id: `tx-spk-${Date.now()}`,
              type: 'buy',
              amountSpk: Math.round(tx.spkAmount),
              amountUsd: Number(tx.usdtAmount.toFixed(2)),
              price: tx.priceUsdt,
              timeAgo: 'Just now',
              wallet: walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : '0xAuto...Miner',
              isWhale: tx.spkAmount > 50,
            };
            setLiveTxns((prev) => [newTrade, ...prev.slice(0, 5)]);
          }
        }}
      />

      {/* ============================================================
          15$ PROTOCOL WORKFLOW: Step 1 (5$ Treasury Deposit) ➔ Step 2 (10$ Mining Start)
         ============================================================ */}
      <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-r from-[#071b2d] via-[#0b243b] to-[#071b2d] border border-[#00F0FF]/30 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">account_tree</span>
                <span>15$ Project Protocol Workflow</span>
              </span>
              <span className="text-xs text-[#94a3b8] font-mono">
                Budget: <strong className="text-white">15.00 USDT</strong> (5$ Treasury Deposit + 10$ Mining Call)
              </span>
            </div>
            <p className="text-xs text-[#94a3b8]">
              Step 1 me 5$ seedha Official Treasury me deposit hoga, baki bache 10$ se Smart Contract call execute hokar mining activate hogi (backend PancakeSwap buy route).
            </p>
          </div>

          {/* Stepper Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
            {/* Step 1: 5$ Deposit to Treasury */}
            <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
              walletBalance < 15
                ? 'bg-emerald-950/30 border-emerald-500/40'
                : 'bg-[#0a1826] border-[#D4AF37]/40'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                  walletBalance < 15 ? 'bg-emerald-500 text-[#051424]' : 'bg-[#D4AF37] text-[#051424]'
                }`}>
                  {walletBalance < 15 ? '✓' : '1'}
                </div>
                <div>
                  <div className="text-xs font-bold font-headline text-white">Step 1: Deposit 5$</div>
                  <div className="text-[10px] text-[#94a3b8] font-mono">To Treasury (0xDE7B...a4c7)</div>
                </div>
              </div>
              {onOpenDepositModal && (
                <button
                  onClick={onOpenDepositModal}
                  className="px-2.5 py-1 rounded-lg bg-[#D4AF37] hover:bg-[#ffe088] text-[#051424] font-headline font-bold text-[11px] transition-all cursor-pointer shadow-sm shrink-0"
                >
                  {walletBalance < 15 ? 'Deposited' : 'Deposit 5$'}
                </button>
              )}
            </div>

            {/* Step 2: 10$ Start Mining */}
            <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
              nodes.some(n => n.status === 'mining')
                ? 'bg-emerald-950/30 border-emerald-500/40'
                : 'bg-[#0a1826] border-[#00F0FF]/40'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                  nodes.some(n => n.status === 'mining') ? 'bg-emerald-500 text-[#051424]' : 'bg-[#00F0FF] text-[#051424]'
                }`}>
                  {nodes.some(n => n.status === 'mining') ? '✓' : '2'}
                </div>
                <div>
                  <div className="text-xs font-bold font-headline text-white">Step 2: Start Mining 10$</div>
                  <div className="text-[10px] text-[#94a3b8] font-mono">Smart Contract + PancakeSwap Buy</div>
                </div>
              </div>
              <button
                onClick={() => {
                  if (nodes.length > 0 && nodes[0].status !== 'mining') {
                    onStartNode(nodes[0].id);
                  } else {
                    onOpenDeployModal();
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-[#00F0FF] hover:bg-[#7df4ff] text-[#051424] font-headline font-bold text-[11px] transition-all cursor-pointer shadow-sm shrink-0"
              >
                {nodes.some(n => n.status === 'mining') ? 'Mining Active' : 'Start Mining'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards matching Image 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Card 1: Total Hashrate */}
        <div className="bg-[#122130] rounded-xl p-5 md:p-6 flex flex-col justify-between relative overflow-hidden shadow-md group hover:bg-[#1c2b3b] transition-all border border-[#1c2b3b]/60">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#00F0FF]/5 rounded-full blur-xl group-hover:bg-[#00F0FF]/15 transition-all"></div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[#94a3b8] font-mono text-[11px] font-semibold uppercase tracking-[0.14em]">
              Total Hashrate
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#00F0FF]/10 flex items-center justify-center text-[#00F0FF]">
              <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                speed
              </span>
            </div>
          </div>
          <div>
            <div className="text-3xl lg:text-[40px] leading-tight font-extrabold font-headline text-white mb-1 tabular-nums tracking-tight">
              {totalHashrate.toFixed(2)}{' '}
              <span className="text-lg lg:text-xl text-[#00F0FF] font-semibold tracking-normal">TH/s</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#7df4ff] font-medium">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              <span>+4.2% from last epoch</span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Nodes */}
        <div className="bg-[#122130] rounded-xl p-5 md:p-6 flex flex-col justify-between relative overflow-hidden shadow-md group hover:bg-[#1c2b3b] transition-all border border-[#1c2b3b]/60">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#D4AF37]/5 rounded-full blur-xl group-hover:bg-[#D4AF37]/15 transition-all"></div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[#94a3b8] font-mono text-[11px] font-semibold uppercase tracking-[0.14em]">
              Active Nodes
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
              <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                dns
              </span>
            </div>
          </div>
          <div>
            <div className="text-3xl lg:text-[40px] leading-tight font-extrabold font-headline text-white mb-1 tabular-nums tracking-tight">
              {activeNodeCount}{' '}
              <span className="text-lg lg:text-xl text-[#94a3b8] font-semibold tracking-normal">/ {nodes.length} online</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#D4AF37] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse"></span>
              <span>{operationalEfficiency}% Operational Efficiency</span>
            </div>
          </div>
        </div>

        {/* Card 3: SPIKE Balance with Instant PancakeSwap Sell Route */}
        <div className="bg-[#122130] rounded-xl p-5 md:p-6 flex flex-col justify-between relative overflow-hidden shadow-md group hover:bg-[#1c2b3b] transition-all border border-[#1c2b3b]/60">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#D4AF37]/5 rounded-full blur-xl group-hover:bg-[#D4AF37]/15 transition-all pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[#94a3b8] font-mono text-[11px] font-semibold uppercase tracking-[0.14em]">
                SPIKE Balance
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#f59e0b]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.25)] shrink-0">
                <img
                  src={SPIKE_LOGO_URL}
                  alt="SPIKE Token Medallion"
                  className="w-7 h-7 object-contain drop-shadow-[0_0_8px_rgba(212,175,55,0.5)] group-hover:scale-110 transition-transform"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            <div>
              <div className="text-3xl lg:text-[40px] leading-tight font-extrabold font-headline text-white mb-0.5 tabular-nums tracking-tight flex items-baseline gap-2">
                <span>{(testnetWallet?.testnetSpk ?? 150.0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-lg lg:text-xl text-[#D4AF37] font-semibold tracking-normal font-headline">SPK</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono mb-2">
                <span className="text-emerald-400 font-bold">
                  ≈ ${(((testnetWallet?.testnetSpk ?? 150.0)) * (spikeTokenInfo?.currentPrice || 0.0345)).toFixed(2)} USDT
                </span>
                <span className="text-[#475569]">•</span>
                <span className="text-[#94a3b8] text-[11px]">
                  1 SPK = ${(spikeTokenInfo?.currentPrice || 0.0345).toFixed(4)}
                </span>
              </div>
              <div className="flex items-center gap-2.5 mt-1.5">
                <button
                  onClick={() => {
                    if (onOpenSwapModal) {
                      onOpenSwapModal('sellSpike');
                    }
                  }}
                  className="text-xs text-[#D4AF37] hover:underline font-headline font-semibold flex items-center gap-1 transition-all group/btn cursor-pointer"
                  title="Open PancakeSwap Sell Route: Sell SPK for USDT"
                >
                  <span>Swap Now</span>
                  <span className="material-symbols-outlined text-[14px] group-hover/btn:translate-x-0.5 transition-transform">
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Protocol Treasury Wallet (Common for Everyone) */}
        <div className="bg-[#122130] rounded-xl p-5 md:p-6 flex flex-col justify-between relative overflow-hidden shadow-md group hover:bg-[#1c2b3b] transition-all border border-[#1c2b3b]/60">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#D4AF37]/5 rounded-full blur-xl group-hover:bg-[#D4AF37]/15 transition-all"></div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[#94a3b8] font-mono text-[11px] font-semibold uppercase tracking-[0.14em] flex items-center gap-1.5">
              <span>Treasury Wallet</span>
              <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Global Vault
              </span>
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
              <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                account_balance
              </span>
            </div>
          </div>
          <div>
            <div className="text-3xl lg:text-[40px] leading-tight font-extrabold font-headline text-white mb-0.5 tabular-nums tracking-tight">
              {treasuryData.treasuryBalanceUsdt.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
              <span className="text-lg lg:text-xl text-[#D4AF37] font-semibold tracking-normal">USDT</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#94a3b8] font-mono mb-2 truncate">
              <span className="material-symbols-outlined text-[13px] text-emerald-400">verified</span>
              <span className="text-emerald-300">Official: {treasuryData.treasuryWalletAddress.slice(0, 6)}...{treasuryData.treasuryWalletAddress.slice(-4)}</span>
              <span className="text-[#475569]">•</span>
              <span className="text-[11px] text-[#94a3b8]">Sabke liye common</span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
              {onOpenDepositModal && (
                <button
                  onClick={onOpenDepositModal}
                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#D4AF37]/20 to-[#f59e0b]/20 hover:from-[#D4AF37]/35 hover:to-[#f59e0b]/35 text-[#D4AF37] border border-[#D4AF37]/50 hover:border-[#D4AF37] text-xs font-headline font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                  title="Deposit 5 USDT Protocol Entry Fee to Official Treasury Wallet"
                >
                  <span className="material-symbols-outlined text-[14px]">payments</span>
                  <span>+ Deposit 5$ to Treasury</span>
                </button>
              )}
              <button
                onClick={onOpenClaimModal}
                className="text-xs text-[#00F0FF] hover:underline font-headline font-semibold flex items-center gap-1 transition-all group/btn"
              >
                <span>Claim Rewards</span>
                <span className="material-symbols-outlined text-[14px] group-hover/btn:translate-x-0.5 transition-transform">
                  arrow_forward
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          SPIKE (SPK) BEP-20 TESTNET ENGINE & HASHRATE AUTO-BUY SANDBOX
         ============================================================ */}
      <div id="dashboard-testnet" className="bg-gradient-to-br from-[#071727] via-[#0a1b2d] to-[#040e1a] rounded-2xl p-5 md:p-7 shadow-2xl border-2 border-[#00F0FF]/40 relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#00F0FF]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1c2b3b]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00F0FF] to-[#D4AF37] p-0.5 shadow-[0_0_20px_rgba(0,240,255,0.4)] flex items-center justify-center shrink-0">
                <div className="w-full h-full bg-[#0a0f1d] rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-[26px] text-[#00F0FF]">science</span>
                </div>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl md:text-2xl font-extrabold font-headline text-white tracking-tight">
                    SPIKE (SPK) Testnet Engine
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30">
                    BEP-20 BSC TESTNET
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                    TOTAL SUPPLY: 50,000,000 SPK
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    0% TAX AMM
                  </span>
                </div>
                <p className="text-xs text-[#94a3b8] mt-0.5">
                  Decentralized Hashrate Auto-Buy mechanism (<span className="text-[#00F0FF] font-mono">swapTokensForExactTokens</span>) using Temporary USDT and simulated PancakeSwap Liquidity Pool.
                </p>
              </div>
            </div>

            {/* Faucet Top-up button */}
            <div className="flex items-center gap-2 self-start lg:self-auto">
              <button
                onClick={handleClaimTestnetFaucet}
                disabled={isTestnetFaucetLoading}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#ffe088] hover:from-[#ffe088] hover:to-[#D4AF37] text-[#0A0F1D] font-headline font-bold text-xs transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Get +500 tUSDT & +100 SPK free for testing"
              >
                {isTestnetFaucetLoading ? (
                  <span className="w-4 h-4 border-2 border-[#0A0F1D] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[16px]">water_drop</span>
                )}
                <span>+ Faucet: Claim 500$ tUSDT</span>
              </button>
            </div>
          </div>

          {/* Testnet Balances & Contract Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-[#051424] border border-[#1c2b3b]">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#94a3b8] block">Testnet USDT Balance</span>
              <div className="text-lg sm:text-xl font-extrabold font-mono text-[#00F0FF] mt-0.5">
                ${testnetWallet.testnetUsdt.toFixed(2)}{' '}
                <span className="text-xs text-[#7df4ff]">tUSDT</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#94a3b8] block">SPIKE (SPK) Balance</span>
              <div className="text-lg sm:text-xl font-extrabold font-mono text-[#D4AF37] mt-0.5">
                {testnetWallet.testnetSpk.toFixed(2)}{' '}
                <span className="text-xs text-[#ffe088]">SPK</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#94a3b8] block">SPK Spot Price</span>
              <div className="text-lg sm:text-xl font-extrabold font-mono text-emerald-400 mt-0.5 flex items-center gap-1">
                <span>${spikeTokenInfo.currentPrice.toFixed(4)}</span>
                <span className="text-[10px] text-emerald-300 font-normal">USDT</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#94a3b8] block">Total Auto-Bought</span>
              <div className="text-lg sm:text-xl font-extrabold font-mono text-white mt-0.5">
                {testnetWallet.totalHarvestAutoBoughtSpk.toFixed(2)}{' '}
                <span className="text-[11px] text-[#94a3b8]">SPK</span>
              </div>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2 border-b border-[#1c2b3b] pb-2">
            <button
              onClick={() => setTestnetActiveTab('autobuy')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-headline font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                testnetActiveTab === 'autobuy'
                  ? 'bg-gradient-to-r from-[#00F0FF] to-[#7df4ff] text-[#0A0F1D] shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                  : 'text-[#94a3b8] hover:text-white hover:bg-[#122130]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">bolt</span>
              <span>Hashrate Auto-Buy on Harvest</span>
            </button>

            <button
              onClick={() => setTestnetActiveTab('swap')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-headline font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                testnetActiveTab === 'swap'
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#ffe088] text-[#0A0F1D] shadow-[0_0_15px_rgba(212,175,55,0.3)]'
                  : 'text-[#94a3b8] hover:text-white hover:bg-[#122130]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
              <span>Testnet DEX Swap (tUSDT ⇄ SPK)</span>
            </button>

            <button
              onClick={() => setTestnetActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-headline font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                testnetActiveTab === 'history'
                  ? 'bg-[#1c2b3b] text-white border border-[#00F0FF]/40'
                  : 'text-[#94a3b8] hover:text-white hover:bg-[#122130]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
              <span>Testnet Transactions ({testnetTransactions.length})</span>
            </button>
          </div>

          {/* TAB 1: HASHRATE AUTO-BUY ON HARVEST */}
          {testnetActiveTab === 'autobuy' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* Left: Interactive Harvest Auto-Buy Box (7 cols) */}
                <div className="lg:col-span-7 p-5 rounded-2xl bg-[#051424] border border-[#1c2b3b] space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#1c2b3b]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="font-headline font-bold text-sm text-white">
                        Hashrate Auto-Buy Engine (Live Linked)
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#00F0FF]">
                      Current Hashrate: <strong>{totalHashrate > 0 ? totalHashrate.toFixed(2) : '1.25'} TH/s</strong>
                    </span>
                  </div>

                  {/* Mining Calculation Display */}
                  <div className="p-4 rounded-xl bg-[#091b2e] border border-[#00F0FF]/30 space-y-2">
                    <div className="flex justify-between items-center text-xs text-[#94a3b8]">
                      <span>Hashrate Mined Output (Pending Harvest):</span>
                      <span className="text-emerald-400 font-mono font-bold animate-pulse">
                        ⛏️ Mined in real-time
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <div className="text-3xl sm:text-4xl font-black font-mono text-white tabular-nums tracking-tight">
                        {pendingMinedSpk.toFixed(2)}{' '}
                        <span className="text-lg text-[#D4AF37] font-bold">SPK</span>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-[#94a3b8] block">Required tUSDT</span>
                        <span className="text-lg font-mono font-bold text-[#00F0FF] tabular-nums">
                          ${requiredUsdtForPending.toFixed(4)} USDT
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#1c2b3b]/60 flex items-center justify-between text-[11px] font-mono text-[#94a3b8]">
                      <span>Smart Contract Method:</span>
                      <span className="text-white font-semibold">swapTokensForExactTokens</span>
                    </div>
                  </div>

                  {/* Automation Switch */}
                  <div className="p-3.5 rounded-xl bg-[#091524] border border-[#1c2b3b] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-headline font-bold text-white flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-[#00F0FF]">autorenew</span>
                        <span>Auto-Buy on Hashrate Epoch (Hands-Free)</span>
                      </div>
                      <p className="text-[11px] text-[#94a3b8] mt-0.5">
                        Automatically buy exact mined SPK whenever hashrate produces tokens.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={testnetWallet.autoBuyEnabled}
                        onChange={(e) => handleToggleAutoBuySetting(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#1c2b3b] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00F0FF]" />
                    </label>
                  </div>

                  {/* Trigger Auto-Buy Button */}
                  {testnetWallet.testnetUsdt < requiredUsdtForPending ? (
                    <div className="space-y-2">
                      <button
                        disabled
                        className="w-full py-3.5 rounded-xl bg-[#1c2b3b] text-[#94a3b8] font-headline font-bold text-sm cursor-not-allowed border border-[#1c2b3b]"
                      >
                        Insufficient tUSDT Balance (${testnetWallet.testnetUsdt.toFixed(2)} / ${requiredUsdtForPending.toFixed(2)})
                      </button>
                      <button
                        onClick={handleClaimTestnetFaucet}
                        className="w-full py-2 rounded-xl bg-[#D4AF37]/20 hover:bg-[#D4AF37]/35 text-[#D4AF37] border border-[#D4AF37]/50 text-xs font-mono font-bold transition-all cursor-pointer"
                      >
                        + Use Faucet to get 500$ Testnet USDT
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleExecuteHarvestAutoBuy}
                      disabled={isHarvestAutoBuying || pendingMinedSpk <= 0}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-[#00F0FF] via-[#7df4ff] to-[#D4AF37] text-[#0A0F1D] font-headline font-black text-sm shadow-[0_0_25px_rgba(0,240,255,0.4)] hover:shadow-[0_0_35px_rgba(0,240,255,0.6)] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isHarvestAutoBuying ? (
                        <>
                          <span className="w-5 h-5 border-2 border-[#0A0F1D] border-t-transparent rounded-full animate-spin" />
                          <span>Executing swapTokensForExactTokens on BSC Testnet...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[22px]">bolt</span>
                          <span>
                            Harvest &amp; Auto-Buy {pendingMinedSpk.toFixed(2)} SPK (Spend ${requiredUsdtForPending.toFixed(4)} tUSDT)
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Right: Technical Explanation & Latest Receipt (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  {lastAutoBuyReceipt ? (
                    <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/50 space-y-3 animate-fade-in shadow-xl">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                        <span className="material-symbols-outlined text-[18px]">verified</span>
                        <span>BEP-20 Transaction Confirmed!</span>
                      </div>

                      <div className="p-3 rounded-xl bg-[#04121f] border border-emerald-500/30 font-mono text-xs space-y-1.5">
                        <div className="flex justify-between text-[#94a3b8]">
                          <span>Tokens Bought:</span>
                          <span className="text-white font-bold">+{lastAutoBuyReceipt.spkAmount.toFixed(2)} SPK</span>
                        </div>
                        <div className="flex justify-between text-[#94a3b8]">
                          <span>USDT Deducted:</span>
                          <span className="text-[#00F0FF] font-bold">-${lastAutoBuyReceipt.usdtAmount.toFixed(4)} USDT</span>
                        </div>
                        <div className="flex justify-between text-[#94a3b8]">
                          <span>Effective Price:</span>
                          <span className="text-white font-bold">${lastAutoBuyReceipt.priceUsdt.toFixed(5)} USDT</span>
                        </div>
                        <div className="flex justify-between text-[#94a3b8]">
                          <span>Block Number:</span>
                          <span className="text-white font-mono">#{lastAutoBuyReceipt.blockNumber}</span>
                        </div>
                        <div className="pt-2 border-t border-[#1c2b3b] truncate text-[10px] text-[#94a3b8]">
                          <span>Tx Hash: </span>
                          <span className="text-[#00F0FF] font-mono">{lastAutoBuyReceipt.txHash}</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-[#94a3b8]">
                        Exact token quantity mine hui aur utni hi quantity DEX liquidity pool se auto-buy kar ke wallet me credit kar di gayi!
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-[#051424] border border-[#1c2b3b] space-y-3">
                      <div className="text-xs font-mono uppercase tracking-wider text-[#94a3b8] font-bold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-[#00F0FF]">info</span>
                        <span>How Hashrate Auto-Buy Works</span>
                      </div>

                      <ul className="space-y-2 text-xs text-[#94a3b8] font-sans">
                        <li className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-[#00F0FF]/15 text-[#00F0FF] flex items-center justify-center text-[10px] shrink-0 font-bold">1</span>
                          <span>Aapki hashrate se jitne bhi SPK token mine hote hain, system unka exact count karta hai.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-[#00F0FF]/15 text-[#00F0FF] flex items-center justify-center text-[10px] shrink-0 font-bold">2</span>
                          <span>Harvest click par Smart Contract ka <strong className="text-white">swapTokensForExactTokens</strong> function call hota hai.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-[#00F0FF]/15 text-[#00F0FF] flex items-center justify-center text-[10px] shrink-0 font-bold">3</span>
                          <span>User ke testnet USDT se utne exact SPK token buy hokar wallet me credit ho jaate hain aur trading chart par green candle ban jaati hai!</span>
                        </li>
                      </ul>

                      <div className="p-2.5 rounded-xl bg-[#091524] border border-[#1c2b3b] text-[11px] font-mono text-[#00F0FF] flex items-center justify-between">
                        <span>PancakeSwap v2 Pool:</span>
                        <span className="text-white font-bold">2.5M SPK / 86.25K USDT</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TESTNET DEX SWAP */}
          {testnetActiveTab === 'swap' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="p-4 rounded-2xl bg-[#051424] border border-[#1c2b3b] space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#94a3b8]">
                    <span className="font-mono font-semibold uppercase">You Swap ({testnetSwapFrom})</span>
                    <span className="font-mono">
                      Available: <strong className="text-white">
                        {testnetSwapFrom === 'USDT' ? `$${testnetWallet.testnetUsdt.toFixed(2)}` : `${testnetWallet.testnetSpk.toFixed(2)} SPK`}
                      </strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={testnetSwapAmount}
                      onChange={(e) => setTestnetSwapAmount(e.target.value)}
                      placeholder="0.0"
                      min="0"
                      className="w-full bg-transparent text-2xl sm:text-3xl font-extrabold font-mono text-white focus:outline-none"
                    />
                    <div className="px-3 py-1.5 rounded-xl bg-[#0c1d2e] border border-[#1c2b3b] text-sm font-bold text-white shrink-0">
                      {testnetSwapFrom}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      {[25, 50, 100, 250].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setTestnetSwapAmount(String(amt))}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0c1d2e] hover:bg-[#1c2b3b] text-[#94a3b8] hover:text-[#00F0FF] border border-[#1c2b3b] cursor-pointer"
                        >
                          {amt}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setTestnetSwapFrom(testnetSwapFrom === 'USDT' ? 'SPK' : 'USDT')}
                      className="text-xs text-[#00F0FF] hover:underline flex items-center gap-1 font-mono cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">swap_vert</span>
                      Switch Direction
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleExecuteManualTestnetSwap}
                  disabled={isTestnetSwapping || parseFloat(testnetSwapAmount) <= 0}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#00F0FF] text-[#0A0F1D] font-headline font-extrabold text-sm shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isTestnetSwapping ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#0A0F1D] border-t-transparent rounded-full animate-spin" />
                      <span>Swapping on BSC Testnet...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                      <span>Execute Swap ({testnetSwapFrom} ➔ {testnetSwapFrom === 'USDT' ? 'SPK' : 'USDT'})</span>
                    </>
                  )}
                </button>

                {testnetSwapSuccessTx && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      <span>Testnet Swap Executed!</span>
                    </div>
                    <div className="text-[10px] text-[#94a3b8] truncate">
                      Tx Hash: <span className="text-[#00F0FF]">{testnetSwapSuccessTx.txHash}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 p-4 rounded-2xl bg-[#051424] border border-[#1c2b3b] space-y-2.5 text-xs font-mono">
                <div className="text-[#94a3b8] uppercase font-bold text-[10px]">Pool Liquidity &amp; Route</div>
                <div className="flex justify-between text-[#94a3b8]">
                  <span>Pair:</span>
                  <span className="text-white font-bold">SPIKE / USDT (BEP-20)</span>
                </div>
                <div className="flex justify-between text-[#94a3b8]">
                  <span>Exchange Rate:</span>
                  <span className="text-white font-bold">1 SPK = ${spikeTokenInfo.currentPrice.toFixed(4)} USDT</span>
                </div>
                <div className="flex justify-between text-[#94a3b8]">
                  <span>Protocol Fee:</span>
                  <span className="text-emerald-400 font-bold">0.00% (Zero Tax)</span>
                </div>
                <div className="flex justify-between text-[#94a3b8]">
                  <span>Pool SPK Reserve:</span>
                  <span className="text-white font-bold">{spikeTokenInfo.poolSpkReserve.toLocaleString()} SPK</span>
                </div>
                <div className="flex justify-between text-[#94a3b8]">
                  <span>Pool USDT Reserve:</span>
                  <span className="text-white font-bold">${spikeTokenInfo.poolUsdtReserve.toLocaleString()} USDT</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TESTNET TRANSACTIONS LEDGER */}
          {testnetActiveTab === 'history' && (
            <div className="overflow-x-auto rounded-xl border border-[#1c2b3b]">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#051424] text-[#94a3b8] uppercase text-[10px] border-b border-[#1c2b3b]">
                  <tr>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">SPK Amount</th>
                    <th className="py-2.5 px-3">USDT Amount</th>
                    <th className="py-2.5 px-3">Price</th>
                    <th className="py-2.5 px-3">Tx Hash</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c2b3b] bg-[#081726]">
                  {testnetTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-[#94a3b8]">
                        No testnet transactions yet. Click "Harvest &amp; Auto-Buy" above to test!
                      </td>
                    </tr>
                  ) : (
                    testnetTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#0c1f33] transition-colors">
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.type === 'harvest_autobuy'
                              ? 'bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30'
                              : tx.type === 'faucet'
                              ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {tx.type === 'harvest_autobuy' ? '⚡ HARVEST AUTO-BUY' : tx.type === 'faucet' ? '💧 FAUCET' : '🔄 SWAP'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-white font-bold">
                          {tx.spkAmount ? `${Number(tx.spkAmount).toFixed(2)} SPK` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-[#00F0FF] font-bold">
                          ${Number(tx.usdtAmount || 0).toFixed(4)}
                        </td>
                        <td className="py-2.5 px-3 text-[#94a3b8]">
                          ${Number(tx.priceUsdt || 0.0345).toFixed(4)}
                        </td>
                        <td className="py-2.5 px-3 text-[#7df4ff] truncate max-w-[140px]">
                          {tx.txHash ? `${tx.txHash.substring(0, 10)}...${tx.txHash.substring(tx.txHash.length - 6)}` : '0x...'}
                        </td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Confirmed
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Main Section: Live Performance Chart (2 cols) & Pool Metrics (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Container (2 Cols) */}
        <div className="lg:col-span-2 bg-[#122130] rounded-xl p-5 md:p-6 flex flex-col justify-between shadow-md border border-[#1c2b3b]/60">
          {/* Header Bar with BSCScan Link & Mode Switchers */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-[#1c2b3b]/80">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <div className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#D4AF37]/20 to-[#00F0FF]/20 border border-[#D4AF37]/40 text-white font-headline font-bold text-xs flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                  <span>SPIKE (SPK) / USDT</span>
                </div>

                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40">
                  BEP-20 • 50M Supply
                </span>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>TESTNET LIVE</span>
                  <span className="tabular-nums font-semibold">${spikeTokenInfo.currentPrice.toFixed(4)} USDT</span>
                  <span className="text-[9px] text-emerald-300 font-normal">(+{spikeTokenInfo.change24h}%)</span>
                </div>
              </div>

              <h2 className="text-lg md:text-xl font-bold font-headline text-white tracking-tight flex items-center gap-2">
                <span>SPIKE (SPK) / USDT Live Trading Terminal</span>
              </h2>
            </div>

            {/* Actions: BSCScan Verified Contract & Tab Switchers */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <a
                href={BSCSCAN_TOKEN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 border border-[#00F0FF]/40 text-[#00F0FF] text-xs font-headline font-bold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(0,240,255,0.25)] hover:scale-102"
                title="View Verified SPIKE Contract on BSCScan"
              >
                <span>BSCScan</span>
                <span className="material-symbols-outlined text-[15px]">open_in_new</span>
              </a>

              {/* Chart Mode Toggle */}
              <div className="flex items-center gap-1 bg-[#1c2b3b] p-1 rounded-xl">
                <button
                  onClick={() => setChartMode('animated-stream')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-headline font-semibold tracking-wide transition-all flex items-center gap-1 ${
                    chartMode === 'animated-stream'
                      ? 'bg-[#00F0FF] text-[#0A0F1D] shadow-[0_0_12px_rgba(0,240,255,0.35)] font-bold'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                  title="Live Candlestick & Trading Terminal"
                >
                  <span className="material-symbols-outlined text-[14px]">show_chart</span>
                  <span>Live Stream</span>
                </button>

                <button
                  onClick={() => setChartMode('hashrate')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-headline font-semibold tracking-wide transition-all flex items-center gap-1 ${
                    chartMode === 'hashrate'
                      ? 'bg-[#00F0FF] text-[#0A0F1D] shadow-[0_0_12px_rgba(0,240,255,0.35)] font-bold'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                  title="BSC Hashrate Telemetry Wave"
                >
                  <span className="material-symbols-outlined text-[14px]">speed</span>
                  <span>Hashrate</span>
                </button>
              </div>
            </div>
          </div>

          {/* ============================================================
              VIEW 1: LIVE ANIMATED CHART WITH DYNAMIC TICKS & BEACON
             ============================================================ */}
          {chartMode === 'animated-stream' && (
            <div className="w-full flex flex-col justify-between relative py-1 space-y-3">
              {/* MEGA LIVE PRICE & HYPE BANNER */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#0d1f30] via-[#091a2a] to-[#071524] border border-[#00F0FF]/40 shadow-[0_0_20px_rgba(0,240,255,0.15)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-emerald-400">
                      LIVE TESTNET POOL PRICE (BEP-20)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      {spikeTokenInfo.buyPressure.toFixed(1)}% BUY DOMINANCE
                    </span>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-2.5">
                    <span className="text-3xl sm:text-4xl font-extrabold font-headline text-white tracking-tight tabular-nums drop-shadow-[0_0_15px_rgba(0,240,255,0.4)]">
                      ${spikeTokenInfo.currentPrice.toFixed(4)}
                    </span>
                    <span className="text-xs sm:text-sm font-headline font-bold text-emerald-400 flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[16px]">trending_up</span>
                      <span>
                        +{spikeTokenInfo.change24h}% (Extreme Bullish Momentum)
                      </span>
                    </span>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono">
                  <div className="px-3 py-1.5 rounded-xl bg-[#051424] border border-[#1c2b3b]">
                    <div className="text-[10px] text-[#94a3b8] uppercase">24h High</div>
                    <div className="text-white font-bold tabular-nums">
                      ${(spikeTokenInfo.high24h ?? 0.0368).toFixed(4)}
                    </div>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-[#051424] border border-[#1c2b3b]">
                    <div className="text-[10px] text-[#94a3b8] uppercase">24h Low</div>
                    <div className="text-white font-bold tabular-nums">
                      ${(spikeTokenInfo.low24h ?? 0.0332).toFixed(4)}
                    </div>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-[#051424] border border-[#1c2b3b]">
                    <div className="text-[10px] text-[#94a3b8] uppercase">Pool Liquidity</div>
                    <div className="text-[#D4AF37] font-bold">
                      ${spikeTokenInfo.poolUsdtReserve.toLocaleString()}
                    </div>
                  </div>

                  <button
                    onClick={handleExecuteHarvestAutoBuy}
                    className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#00F0FF] to-emerald-400 text-[#051424] font-headline font-extrabold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:brightness-110 transition-all ml-auto md:ml-0 cursor-pointer"
                  >
                    <span>⚡ Auto-Buy SPK</span>
                    <span className="material-symbols-outlined text-[15px]">bolt</span>
                  </button>
                </div>
              </div>

              {/* BUY VS SELL PRESSURE HYPE METER */}
              <div className="p-3 rounded-xl bg-[#081321] border border-[#1c2b3b] space-y-1.5">
                <div className="flex justify-between items-center text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>BUY PRESSURE: {buyPressure.toFixed(1)}% (EXTREME BULLISH)</span>
                    <span className="text-[10px] text-[#94a3b8]">({totalBuysCount} Buys)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-red-400 font-bold">
                    <span>SELL PRESSURE: {(100 - buyPressure).toFixed(1)}%</span>
                    <span className="text-[10px] text-[#94a3b8]">({totalSellsCount} Sells)</span>
                  </div>
                </div>

                {/* Pressure Progress Bar */}
                <div className="w-full h-2.5 bg-red-500/30 rounded-full overflow-hidden flex shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-[#00F0FF] to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.6)] transition-all duration-500 rounded-full"
                    style={{ width: `${buyPressure}%` }}
                  />
                </div>
              </div>

              {/* REAL-TIME LIVE BUY & SELL TRANSACTIONS FEED (85% BUY SIDE) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#94a3b8] px-1">
                  <span className="flex items-center gap-1 text-white font-bold">
                    <span className="material-symbols-outlined text-emerald-400 text-[14px]">swap_horizontal_circle</span>
                    <span>Real-Time SPIKE Swap Orders</span>
                  </span>
                  <span className="text-emerald-400 font-semibold animate-pulse">● Continuous Inflow</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {liveTxns.map((tx) => {
                    const isBuy = tx.type === 'buy';
                    return (
                      <div
                        key={tx.id}
                        className={`p-2 rounded-xl text-left border text-xs font-mono transition-all transform animate-[fadeIn_0.3s_ease] ${
                          isBuy
                            ? tx.isWhale
                              ? 'bg-emerald-950/40 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                              : 'bg-[#0d1f2d] border-emerald-500/40'
                            : 'bg-red-950/20 border-red-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] mb-0.5">
                          <span
                            className={`font-bold px-1.5 py-0.2 rounded ${
                              isBuy
                                ? tx.isWhale
                                  ? 'bg-emerald-500 text-black font-extrabold'
                                  : 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {isBuy ? (tx.isWhale ? '🐋 WHALE BUY' : '🟢 BUY') : '🔴 SELL'}
                          </span>
                          <span className="text-[#94a3b8] text-[9px]">{tx.timeAgo}</span>
                        </div>
                        <div className="font-bold text-white text-[11px] tabular-nums mt-0.5">
                          {isBuy ? '+' : '-'}{tx.amountSpk.toLocaleString()} SPK
                        </div>
                        <div className="text-[10px] text-[#D4AF37] font-semibold tabular-nums">
                          ${tx.amountUsd.toFixed(2)} USD
                        </div>
                        <div className="text-[9px] text-[#94a3b8] mt-0.5 truncate">
                          {tx.wallet}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* TRADINGVIEW LIVE CANDLESTICK TERMINAL */}
              <TradingViewChart
                pairName="SPIKE (SPK) / USDT [BEP-20]"
                dexUrl="#dashboard-testnet"
                onBuyClick={() => onCopyText(spikeTokenInfo.contractAddress)}
              />

              {/* Bottom Quick Bar with Direct Contract Details */}
              <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-[#1c2b3b]/70 text-xs font-mono text-[#94a3b8]">
                <div className="flex items-center gap-2">
                  <span className="text-[#94a3b8]">
                    SPIKE Contract (BEP-20):
                  </span>
                  <button
                    onClick={() => onCopyText(spikeTokenInfo.contractAddress)}
                    className="text-[#00F0FF] hover:underline flex items-center gap-1 font-semibold"
                    title="Click to copy contract"
                  >
                    <span>
                      {`${spikeTokenInfo.contractAddress.substring(0, 10)}...${spikeTokenInfo.contractAddress.substring(spikeTokenInfo.contractAddress.length - 6)}`}
                    </span>
                    <span className="material-symbols-outlined text-[13px]">content_copy</span>
                  </button>
                </div>

                <a
                  href="#dashboard-testnet"
                  className="text-xs text-[#00F0FF] hover:underline flex items-center gap-1 font-headline font-bold"
                >
                  <span>Go to SPIKE Testnet Auto-Buy Engine</span>
                  <span className="material-symbols-outlined text-[14px]">
                    arrow_upward
                  </span>
                </a>
              </div>
            </div>
          )}

          {/* ============================================================
              VIEW 3: HASHRATE TELEMETRY (Original)
             ============================================================ */}
          {chartMode === 'hashrate' && (
            <div className="w-full h-56 md:h-64 flex flex-col justify-end relative py-2">
              <div className="flex justify-between items-center text-xs font-mono text-[#94a3b8] mb-2">
                <span>Active Global Hashrate Output</span>
                <div className="flex items-center gap-1">
                  {(['24H', '7D', '30D'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeframe(t)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        timeframe === t ? 'bg-[#00F0FF] text-[#0A0F1D]' : 'hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                <div className="w-full h-[1px] bg-[#46464c]"></div>
                <div className="w-full h-[1px] bg-[#46464c]"></div>
                <div className="w-full h-[1px] bg-[#46464c]"></div>
                <div className="w-full h-[1px] bg-[#46464c]"></div>
              </div>

              {/* SVG Wave */}
              <div className="relative w-full h-44 overflow-visible">
                <svg
                  className="w-full h-full overflow-visible"
                  preserveAspectRatio="none"
                  viewBox="0 0 800 200"
                >
                  <defs>
                    <linearGradient id="chartGradientLive" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#00F0FF" stopOpacity="0.0" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="glow" />
                      <feComposite in="SourceGraphic" in2="glow" operator="over" />
                    </filter>
                  </defs>

                  {/* Shaded Area */}
                  <path d={currentChart.fillD} fill="url(#chartGradientLive)" />

                  {/* Main Curve */}
                  <path
                    d={currentChart.pathD}
                    fill="none"
                    stroke="#00F0FF"
                    strokeLinecap="round"
                    strokeWidth="3.5"
                    filter="url(#glow)"
                  />

                  {/* Interactive Points */}
                  {currentChart.points.map((pt, idx) => {
                    const isLast = idx === currentChart.points.length - 1;
                    return (
                      <g key={idx}>
                        <circle
                          cx={pt.cx}
                          cy={pt.cy}
                          r={isLast ? 6 : 5}
                          fill={isLast ? '#00F0FF' : '#0A0F1D'}
                          stroke={isLast ? '#FFFFFF' : '#00F0FF'}
                          strokeWidth={isLast ? 2.5 : 3}
                          className="cursor-pointer transition-transform hover:scale-150"
                          onMouseEnter={() =>
                            setHoveredDataPoint({
                              x: pt.cx,
                              y: pt.cy,
                              hashrate: pt.rate,
                              time: pt.time,
                            })
                          }
                          onMouseLeave={() => setHoveredDataPoint(null)}
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Hover Tooltip */}
                {hoveredDataPoint && (
                  <div
                    className="absolute pointer-events-none bg-[#0a0f1d] border border-[#00F0FF] rounded-lg px-2.5 py-1.5 shadow-xl text-xs font-mono transform -translate-x-1/2 -translate-y-full mb-2 z-20"
                    style={{
                      left: `${(hoveredDataPoint.x / 800) * 100}%`,
                      top: `${(hoveredDataPoint.y / 200) * 100}%`,
                    }}
                  >
                    <div className="text-[#00F0FF] font-bold tabular-nums">{hoveredDataPoint.hashrate}</div>
                    <div className="text-[10px] text-[#94a3b8]">{hoveredDataPoint.time}</div>
                  </div>
                )}
              </div>

              {/* Time labels matching Image 2 */}
              <div className="flex justify-between text-xs text-[#94a3b8] mt-4 font-mono">
                {currentChart.timeLabels.map((lbl, idx) => (
                  <span
                    key={idx}
                    className={idx === currentChart.timeLabels.length - 1 ? 'text-[#00F0FF] font-bold' : ''}
                  >
                    {lbl}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats / Pool Info (1 Col) */}
        <div className="bg-[#122130] rounded-xl p-5 md:p-6 flex flex-col justify-between shadow-md border border-[#1c2b3b]/60">
          <div>
            <h2 className="text-lg md:text-xl font-bold font-headline text-white mb-1 tracking-tight">
              Pool Metrics
            </h2>
            <p className="text-xs text-[#94a3b8] mb-5">BSC Smart Contract Overview</p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#1c2b3b] border border-[#1c2b3b]/60">
                <span className="text-[#94a3b8] text-xs font-medium">Network Difficulty</span>
                <span className="text-white font-headline font-semibold text-sm tabular-nums">
                  48.25 P
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#1c2b3b] border border-[#1c2b3b]/60">
                <span className="text-[#94a3b8] text-xs font-medium">Current Block Reward</span>
                <span className="text-[#D4AF37] font-headline font-semibold text-sm tabular-nums">
                  3.20 USDT
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#1c2b3b] border border-[#1c2b3b]/60">
                <span className="text-[#94a3b8] text-xs font-medium">Gas Fee Estimate</span>
                <span className="text-white font-mono font-medium text-xs tabular-nums">
                  0.00042 BNB
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#1c2b3b] border border-[#1c2b3b]/60">
                <span className="text-[#94a3b8] text-xs font-medium">Contract Uptime</span>
                <span className="text-[#00F0FF] font-headline font-semibold text-sm tabular-nums">
                  99.98%
                </span>
              </div>
            </div>
          </div>

          {/* Audited Contract Card */}
          <div className="mt-5 pt-3">
            <div
              onClick={onOpenAuditModal}
              className="p-3.5 rounded-xl bg-[#010f1e] hover:bg-[#0a0f1d] border border-[#1c2b3b] flex items-center justify-between cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#D4AF37] text-[24px]">
                  verified_user
                </span>
                <div>
                  <div className="text-xs font-bold font-headline text-white group-hover:text-[#00F0FF] transition-colors tracking-wide">
                    Audited Contract
                  </div>
                  <div className="text-[11px] text-[#94a3b8] font-mono">CertiK Secure Level 2</div>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#94a3b8] text-sm group-hover:text-[#00F0FF] group-hover:translate-x-0.5 transition-all">
                open_in_new
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Mining Nodes Status Table matching Image 2 */}
      <div className="bg-[#122130] rounded-xl p-5 md:p-6 shadow-md border border-[#1c2b3b]/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg md:text-xl font-bold font-headline text-white tracking-tight">
              Active Mining Nodes
            </h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Manage your rig allocations and real-time operational status
            </p>
          </div>
          <button
            onClick={onOpenDeployModal}
            className="bg-[#1c2b3b] hover:bg-[#273647] text-white font-headline text-xs px-4 py-2.5 rounded-xl border border-[#00F0FF]/30 transition-all flex items-center gap-2 self-start sm:self-auto shadow-sm font-semibold tracking-wide"
          >
            <span className="material-symbols-outlined text-[18px] text-[#00F0FF]">add</span>
            <span>Deploy New Node</span>
          </button>
        </div>

        {nodes.length === 0 ? (
          <div className="py-12 px-4 rounded-xl bg-[#0a0f1d] border border-[#1c2b3b] text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#00F0FF]/10 text-[#00F0FF] flex items-center justify-center border border-[#00F0FF]/25 shadow-[0_0_15px_rgba(0,240,255,0.15)]">
              <span className="material-symbols-outlined text-[30px]">dns</span>
            </div>
            <div className="max-w-md">
              <h3 className="text-base font-bold font-headline text-white">No Active Mining Nodes</h3>
              <p className="text-xs text-[#94a3b8] mt-1 leading-relaxed">
                This wallet has 0 active rigs online. Deploy your first node to connect to the BSC validator pool and start generating daily SPIKE token &amp; USDT yields.
              </p>
            </div>
            <button
              onClick={onOpenDeployModal}
              className="mt-2 px-5 py-2.5 rounded-xl bg-[#00F0FF] hover:bg-[#7df4ff] text-[#0A0F1D] font-headline font-bold text-xs flex items-center gap-2 shadow-[0_0_16px_rgba(0,240,255,0.3)] transition-all hover:scale-105 active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Deploy First Node (from 15 USDT)</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[#94a3b8] font-mono text-[10px] uppercase tracking-[0.14em] border-b border-[#1c2b3b]">
                  <th className="py-3 px-4 font-semibold">Node ID &amp; Name</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Hashrate</th>
                  <th className="py-3 px-4 font-semibold">Temperature</th>
                  <th className="py-3 px-4 font-semibold">Share Acceptance</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c2b3b]/40 text-sm">
                {nodes.map((node) => {
                  const isMining = node.status === 'mining';
                  return (
                    <tr
                      key={node.id}
                      className="hover:bg-[#1c2b3b]/30 transition-colors group"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isMining
                                ? 'bg-[#00F0FF]/10 text-[#00F0FF]'
                                : 'bg-[#1c2b3b] text-[#94a3b8]'
                            }`}
                          >
                            <span
                              className="material-symbols-outlined text-[18px]"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              dns
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-white font-headline text-xs sm:text-sm tracking-wide">
                              {node.name}
                            </div>
                            <div className="text-[11px] text-[#94a3b8] font-mono">
                              {node.region}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        {isMining ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-pulse"></span>
                            Mining
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#1c2b3b] text-[#94a3b8]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#909096]"></span>
                            Idle / Standby
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 font-headline text-sm text-white font-bold tabular-nums">
                        {node.hashrate.toFixed(2)} TH/s
                      </td>
                      <td className="py-4 px-4 text-[#94a3b8] text-xs font-mono">
                        {node.temperature}°C{' '}
                        <span
                          className={`text-[11px] font-sans ${
                            isMining ? 'text-[#7df4ff] font-medium' : 'text-[#94a3b8]'
                          }`}
                        >
                          ({isMining ? 'Optimal' : 'Idle'})
                        </span>
                      </td>
                      <td className="py-4 px-4 text-white text-xs font-mono tabular-nums">
                        {node.shareAcceptance}%
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {isMining ? (
                            <>
                              <button
                                onClick={() => onRestartNode(node.id)}
                                className="p-2 rounded-lg bg-[#1c2b3b] hover:bg-[#273647] text-[#D4AF37] transition-colors"
                                title="Restart Node"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                 restart_alt
                                </span>
                              </button>
                              <button
                                onClick={() => onStopNode(node.id)}
                                className="p-2 rounded-lg bg-[#1c2b3b] hover:bg-red-500/20 text-red-400 transition-colors"
                                title="Stop Node"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  stop
                                </span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => onStartNode(node.id)}
                              className="p-2 rounded-lg bg-[#00F0FF] text-[#0A0F1D] font-bold hover:bg-[#7df4ff] transition-colors"
                              title="Start Node"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                play_arrow
                              </span>
                            </button>
                          )}
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

      {/* Recent Reward Claim History Table matching Image 2 */}
      <div className="bg-[#122130] rounded-xl p-5 md:p-6 shadow-md border border-[#1c2b3b]/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg md:text-xl font-bold font-headline text-white tracking-tight">
              Reward Claim History
            </h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Recent USDT payouts transferred directly to your BEP-20 address
            </p>
          </div>
          <a
            href="https://bscscan.com"
            target="_blank"
            rel="noreferrer"
            className="text-[#00F0FF] hover:underline text-xs font-headline font-semibold flex items-center gap-1 self-start sm:self-auto"
          >
            <span>View on BscScan</span>
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          </a>
        </div>

        {rewards.length === 0 ? (
          <div className="py-10 px-4 rounded-xl bg-[#0a0f1d] border border-[#1c2b3b] text-center flex flex-col items-center justify-center space-y-2.5">
            <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center border border-[#D4AF37]/25 shadow-sm">
              <span className="material-symbols-outlined text-[26px]">receipt_long</span>
            </div>
            <div className="max-w-md">
              <h3 className="text-sm font-bold font-headline text-white">No Payout Records Yet</h3>
              <p className="text-xs text-[#94a3b8] mt-0.5 leading-relaxed">
                Daily mining payouts and activation transactions will be automatically recorded here once rigs are deployed.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[#94a3b8] font-mono text-[10px] uppercase tracking-[0.14em] border-b border-[#1c2b3b]">
                  <th className="py-3 px-4 font-semibold">Transaction Hash</th>
                  <th className="py-3 px-4 font-semibold">Reward Source</th>
                  <th className="py-3 px-4 font-semibold">Amount</th>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c2b3b]/40 text-sm">
                {rewards.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-[#1c2b3b]/30 transition-colors"
                  >
                    <td className="py-4 px-4 font-mono text-[#00F0FF] text-xs">
                      <button
                        onClick={() => onCopyText(tx.txHash)}
                        className="hover:underline flex items-center gap-1.5"
                        title="Copy TX Hash"
                      >
                        <span className="tabular-nums">{tx.txHash}</span>
                        <span className="material-symbols-outlined text-[14px] text-[#94a3b8] hover:text-[#00F0FF]">
                          content_copy
                        </span>
                      </button>
                    </td>
                    <td className="py-4 px-4 text-xs sm:text-sm text-white font-medium">
                      {tx.rewardSource}
                    </td>
                    <td className="py-4 px-4 font-headline text-sm text-[#D4AF37] font-bold tabular-nums">
                      {tx.amount > 0 ? `+${tx.amount.toFixed(2)}` : tx.amount.toFixed(2)} {tx.currency}
                    </td>
                    <td className="py-4 px-4 text-[#94a3b8] text-xs font-mono">
                      {tx.timestamp}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#7df4ff] bg-[#7df4ff]/10 px-2 py-0.5 rounded border border-[#7df4ff]/20">
                        <span className="material-symbols-outlined text-[14px]">
                          check_circle
                        </span>
                        Confirmed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
