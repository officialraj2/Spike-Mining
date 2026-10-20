export type TabType = 'home' | 'dashboard' | 'mining-nodes' | 'referrals' | 'admin' | 'swap';

export interface AdminMetrics {
  totalUsers: number;
  activeNodes: number;
  totalNodes: number;
  totalHashrate: number;
  totalMinedUsdt: number;
  totalUserBalance: number;
  totalTransactions: number;
  dbSizeKb: number;
  lastSaved: string;
  maintenanceMode: boolean;
  turboMultiplier: number;
  dailyYieldPercent: number;
}

export const DEFAULT_PANCAKESWAP_ROUTER_ADDRESS = '0xd74eb1ee921a04589f5d0a4554938c1d06fbb38b';

export interface LiveTxn {
  id: string;
  type: 'buy' | 'sell';
  amountSpk: number;
  amountUsd: number;
  price: number;
  timeAgo: string;
  wallet: string;
  isWhale?: boolean;
  txHash?: string;
  timestamp?: number;
}

export interface HashrateLevelInfo {
  level: string; // 'Fresh user' | 'Level 1' | 'Level 2' | 'Level 3' | 'Level 4' | 'Custom Admin'
  levelNumber: number; // 0, 1, 2, 3, 4, -1
  hashrate: number; // in VH/s (e.g. 100, 200, 400, 600, 857.14)
  unit: string; // 'VH/s'
  targetDays: number; // 60, 30, 15, 10, 7
  dailySpkYield: number; // hashrate / 6000
  requirementText: string;
  directCount: number;
  totalTeamCount: number;
  isCustomOverride: boolean;
  nextTier?: {
    level: string;
    hashrate: number;
    requirementText: string;
    neededDirects: number;
    neededTeam: number;
  } | null;
}

export interface AdminUser {
  address: string;
  balanceUsdt: number;
  balanceBnb: number;
  totalMined: number;
  referralCode: string;
  referredBy: string | null;
  role: 'master' | 'admin' | 'user' | 'moderator';
  status: 'active' | 'frozen' | 'banned';
  createdAt: string;
  lastActive: string;
  notes?: string;
  customHashrate?: number | null;
  customHashrateReason?: string;
  directPartners?: number;
  totalPartners?: number;
  hashrateInfo?: HashrateLevelInfo;
}

export interface AdminSettings {
  turboMultiplier: number;
  dailyYieldPercent: number;
  baseHashrateTh?: number;
  miningCycleHours?: number;
  dailyRewardSpk?: number;
  minDepositUsdt?: number;
  pancakeRouterAddress?: string;
  testnetFastCycleEnabled?: boolean;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  stratumPoolUrl: string;
  bscContractAddress: string;
  minWithdrawalUsdt: number;
  autoPayoutEnabled: boolean;
  updatedAt: string;
  treasuryWalletAddress?: string;
  treasuryBalanceUsdt?: number;
  primaryDomain?: string;
  protocolUrl?: string;
  apiBaseUrl?: string;
  docsUrl?: string;
  rpcUrl?: string;
  masterWalletAddresses?: string[];
  nodeCostUsdt?: number;
  tier1CommissionPercent?: number;
  tier2CommissionPercent?: number;
  level1DirectsRequired?: number;
  level2DirectsRequired?: number;
  level3DirectsRequired?: number;
  level1HashrateBoost?: number;
  level2HashrateBoost?: number;
  level3HashrateBoost?: number;
}

export interface AdminAuditLog {
  id: string;
  adminUser: string;
  action: string;
  target: string;
  details: string;
  timestamp: string;
}

export interface MiningNode {
  id: string;
  name: string;
  region: string;
  status: 'mining' | 'idle' | 'syncing' | 'stopped';
  hashrate: number; // in TH/s
  temperature: number; // in °C
  shareAcceptance: number; // e.g. 99.9%
  fanSpeed: number; // percentage
  powerUsage: number; // Watts
  uptimeDays: number;
  algorithm: string;
  logs: string[];
  userAddress?: string;
  costUsdt?: number;
}

export interface RewardTransaction {
  id: string;
  txHash: string;
  rewardSource: string;
  amount: number;
  currency: string;
  timestamp: string;
  status: 'Confirmed' | 'Pending';
  epoch?: number;
  userAddress?: string;
  type?: string;
}

export interface ReferralItem {
  id: string;
  referrerAddress: string;
  refereeAddress: string;
  tier: number;
  commissionUsdt: number;
  volumeUsdt: number;
  createdAt: string;
}

export interface ReferralStatsData {
  directPartners: number;
  downlinePartners: number;
  totalPartners: number;
  totalCommissions: number;
  referrals: ReferralItem[];
  referredBy?: string | null;
}

export interface ReferralTier {
  tier: number;
  percentage: number;
  totalMembers: number;
  earningsUsdt: number;
  activeMiners: number;
}

export interface TeamMilestoneTier {
  id: string;
  partnersRequired: number;
  rewardUsd: number;
  label: string;
  rewardFormatted: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

export interface TestnetSpikeTokenInfo {
  name: string;
  symbol: string;
  totalSupply: number; // 50,000,000 SPK
  circulatingSupply: number;
  decimals: number;
  contractAddress: string;
  pair: string;
  poolSpkReserve: number;
  poolUsdtReserve: number;
  currentPrice: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  change24h: number;
  buyPressure: number;
}

export interface TestnetWalletState {
  address: string;
  testnetUsdt: number;
  testnetSpk: number;
  autoBuyEnabled: boolean;
  slippageTolerance: number;
  totalHarvestAutoBoughtSpk: number;
  totalUsdtSpentOnAutoBuy: number;
  lastAutoBuyAt?: string;
}

export interface TestnetTransaction {
  id: string;
  userAddress: string;
  txHash: string;
  type: 'harvest_autobuy' | 'swap_buy' | 'swap_sell' | 'faucet';
  spkAmount: number;
  usdtAmount: number;
  priceUsdt: number;
  status: 'Confirmed' | 'Pending';
  blockNumber: number;
  gasFeeBnb: number;
  details: string;
  timestamp: string;
}
