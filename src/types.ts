export type TabType = 'home' | 'dashboard' | 'mining-nodes' | 'referrals' | 'announcements' | 'admin';

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

export interface AdminUser {
  address: string;
  balanceUsdt: number;
  balanceBnb: number;
  totalMined: number;
  referralCode: string;
  referredBy: string | null;
  role: 'admin' | 'user' | 'moderator';
  status: 'active' | 'frozen' | 'banned';
  createdAt: string;
  lastActive: string;
  notes?: string;
}

export interface AdminSettings {
  turboMultiplier: number;
  dailyYieldPercent: number;
  maintenanceMode: boolean;
  stratumPoolUrl: string;
  bscContractAddress: string;
  minWithdrawalUsdt: number;
  autoPayoutEnabled: boolean;
  updatedAt: string;
  primaryDomain?: string;
  protocolUrl?: string;
  apiBaseUrl?: string;
  docsUrl?: string;
  rpcUrl?: string;
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
