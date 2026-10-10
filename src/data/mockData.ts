import { MiningNode, RewardTransaction, ReferralTier, TeamMilestoneTier } from '../types';

export const SPIKE_LOGO_URL = '/spike_logo.png';

export const SPIKE_TOKEN_METRICS = {
  totalSupply: 50_000_000,
  tokenStandard: 'BEP-20',
  blockchain: 'BNB Smart Chain (BSC)',
  marketPair: 'SPIKE / USDT',
  initialReferencePrice: 1.0,
  swapThresholdPrice: 5.0,
  minActivationUsd: 15,
  maxMiningPool: 50_000_000,
};

export const INITIAL_NODES: MiningNode[] = [
  {
    id: 'SPIKE-NODE-01',
    name: 'SPIKE-NODE-01',
    region: 'BSC Validator Region: US-East',
    status: 'mining',
    hashrate: 0.32,
    temperature: 64,
    shareAcceptance: 99.9,
    fanSpeed: 72,
    powerUsage: 440,
    uptimeDays: 24,
    algorithm: 'BSC Sha-256 (Stratum+ssl)',
    logs: [
      '[14:22:10] Share #48291 accepted (22ms latency)',
      '[14:21:45] Difficulty target adjusted to 48.25 P',
      '[14:20:12] ASIC temperature stabilized at 64°C',
      '[14:18:04] Block header #38192040 validated on BEP-20',
    ],
  },
  {
    id: 'SPIKE-NODE-02',
    name: 'SPIKE-NODE-02',
    region: 'BSC Validator Region: EU-Central',
    status: 'mining',
    hashrate: 0.31,
    temperature: 67,
    shareAcceptance: 99.8,
    fanSpeed: 76,
    powerUsage: 430,
    uptimeDays: 18,
    algorithm: 'BSC Sha-256 (Stratum+ssl)',
    logs: [
      '[14:22:05] Share #41209 accepted (18ms latency)',
      '[14:21:30] Validator node sync: 100% verified',
      '[14:19:50] Auto-fan curve engaged at 67°C',
    ],
  },
  {
    id: 'SPIKE-NODE-03',
    name: 'SPIKE-NODE-03',
    region: 'BSC Validator Region: AP-Southeast',
    status: 'mining',
    hashrate: 0.31,
    temperature: 62,
    shareAcceptance: 100,
    fanSpeed: 68,
    powerUsage: 420,
    uptimeDays: 31,
    algorithm: 'BSC Sha-256 (Stratum+ssl)',
    logs: [
      '[14:22:15] Share #39912 accepted (28ms latency)',
      '[14:20:44] Zero rejected shares in last 1,000 blocks',
      '[14:17:22] Epoch reward distributed to contract pool',
    ],
  },
  {
    id: 'SPIKE-NODE-04',
    name: 'SPIKE-NODE-04',
    region: 'BSC Validator Region: SA-East',
    status: 'idle',
    hashrate: 0.30,
    temperature: 45,
    shareAcceptance: 99.5,
    fanSpeed: 30,
    powerUsage: 85,
    uptimeDays: 5,
    algorithm: 'BSC Sha-256 (Stratum+ssl)',
    logs: [
      '[13:50:00] Rig in Standby / Power-save mode',
      '[13:45:10] Warm cache verified, ready for instant deploy',
    ],
  },
];

export const INITIAL_REWARDS: RewardTransaction[] = [
  {
    id: 'tx-1',
    txHash: '0x8f4c...3e1a',
    rewardSource: 'Daily Epoch Payout #412',
    amount: 48.50,
    currency: 'USDT',
    timestamp: 'Today, 04:00 UTC',
    status: 'Confirmed',
    epoch: 412,
  },
  {
    id: 'tx-2',
    txHash: '0x3b21...9f82',
    rewardSource: 'Daily Epoch Payout #411',
    amount: 47.80,
    currency: 'USDT',
    timestamp: 'Yesterday, 04:00 UTC',
    status: 'Confirmed',
    epoch: 411,
  },
  {
    id: 'tx-3',
    txHash: '0x91aa...4c42',
    rewardSource: 'Team Milestone Bonus (10 Partners)',
    amount: 15.00,
    currency: 'USDT',
    timestamp: '2 days ago, 18:22 UTC',
    status: 'Confirmed',
  },
  {
    id: 'tx-4',
    txHash: '0x12bb...8e09',
    rewardSource: 'Daily Epoch Payout #410',
    amount: 49.10,
    currency: 'USDT',
    timestamp: '3 days ago, 04:00 UTC',
    status: 'Confirmed',
    epoch: 410,
  },
];

export const REFERRAL_TIERS: ReferralTier[] = [];

export const TEAM_MILESTONE_TIERS: TeamMilestoneTier[] = [
  { id: 'm-1', partnersRequired: 10, rewardUsd: 15, label: '10 Partners', rewardFormatted: '$15' },
  { id: 'm-2', partnersRequired: 100, rewardUsd: 100, label: '100 Partners', rewardFormatted: '$100' },
  { id: 'm-3', partnersRequired: 1000, rewardUsd: 500, label: '1,000 Partners', rewardFormatted: '$500' },
  { id: 'm-4', partnersRequired: 5000, rewardUsd: 2000, label: '5,000 Partners', rewardFormatted: '$2,000' },
  { id: 'm-5', partnersRequired: 25000, rewardUsd: 5000, label: '25,000 Partners', rewardFormatted: '$5,000' },
  { id: 'm-6', partnersRequired: 50800, rewardUsd: 20000, label: '50,800 Partners', rewardFormatted: '$20,000' },
  { id: 'm-7', partnersRequired: 100000, rewardUsd: 50000, label: '100,000 Partners', rewardFormatted: '$50,000' },
  { id: 'm-8', partnersRequired: 200000, rewardUsd: 100000, label: '200,000 Partners', rewardFormatted: '$100,000' },
  { id: 'm-9', partnersRequired: 500000, rewardUsd: 500000, label: '500,000 Partners', rewardFormatted: '$500,000' },
];
