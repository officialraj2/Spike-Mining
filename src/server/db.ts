import fs from 'fs';
import path from 'path';

export interface DbUser {
  address: string;
  balanceUsdt: number;
  balanceBnb: number;
  totalMined: number;
  referralCode: string;
  referredBy: string | null;
  role: 'admin' | 'user' | 'moderator';
  status: 'active' | 'frozen' | 'banned';
  hasDepositedTreasury?: boolean;
  hasActivatedMining?: boolean;
  createdAt: string;
  lastActive: string;
  notes?: string;
}

export interface DbMiningNode {
  id: string;
  userAddress: string;
  name: string;
  region: string;
  status: 'mining' | 'idle' | 'syncing' | 'stopped';
  hashrate: number;
  temperature: number;
  shareAcceptance: number;
  fanSpeed: number;
  powerUsage: number;
  uptimeDays: number;
  algorithm: string;
  logs: string[];
  costUsdt: number;
  deployedAt: string;
}

export interface DbTransaction {
  id: string;
  userAddress: string;
  txHash: string;
  type: 'activation' | 'claim' | 'swap' | 'referral_bonus' | 'faucet' | 'admin_adjustment' | 'deposit';
  amount: number;
  currency: string;
  timestamp: string;
  status: 'Confirmed' | 'Pending' | 'Rejected';
  details: string;
  blockNumber: number;
}

export interface DbReferral {
  id: string;
  referrerAddress: string;
  refereeAddress: string;
  tier: number;
  commissionUsdt: number;
  volumeUsdt: number;
  createdAt: string;
}

export interface DbAnnouncement {
  id: string;
  title: string;
  content: string;
  badge: string;
  priority: 'high' | 'medium' | 'low';
  author: string;
  isActive: boolean;
  createdAt: string;
}

export interface DbSettings {
  turboMultiplier: number;
  dailyYieldPercent: number;
  maintenanceMode: boolean;
  stratumPoolUrl: string;
  bscContractAddress: string;
  treasuryWalletAddress: string;
  treasuryBalanceUsdt: number;
  minWithdrawalUsdt: number;
  autoPayoutEnabled: boolean;
  updatedAt: string;
  primaryDomain: string;
  protocolUrl: string;
  apiBaseUrl: string;
  docsUrl: string;
  rpcUrl: string;
  telegramUrl: string;
  twitterUrl: string;
  supportEmail: string;
}

export interface DbAuditLog {
  id: string;
  adminUser: string;
  action: string;
  target: string;
  details: string;
  timestamp: string;
}

export interface DbTestnetWallet {
  address: string;
  testnetUsdt: number;
  testnetSpk: number;
  autoBuyEnabled: boolean;
  slippageTolerance: number;
  totalHarvestAutoBoughtSpk: number;
  totalUsdtSpentOnAutoBuy: number;
  lastAutoBuyAt?: string;
}

export interface DbTestnetTx {
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

export interface DbTestnetSpikeToken {
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

export interface DatabaseSchema {
  version: number;
  lastSaved: string;
  users: DbUser[];
  nodes: DbMiningNode[];
  transactions: DbTransaction[];
  referrals: DbReferral[];
  announcements: DbAnnouncement[];
  settings: DbSettings;
  auditLogs: DbAuditLog[];
  testnetWallets: DbTestnetWallet[];
  testnetTransactions: DbTestnetTx[];
  testnetSpikeToken: DbTestnetSpikeToken;
}

const DATA_DIR = path.resolve('.data');
const DB_FILE = path.join(DATA_DIR, 'spike_database.json');
const BACKUP_FILE = path.join(DATA_DIR, 'spike_database.bak.json');

const INITIAL_DATA: DatabaseSchema = {
  version: 1,
  lastSaved: new Date().toISOString(),
  users: [
    {
      address: '0x71C8a914B97e889F12A0987cB32456Fa12349A2',
      balanceUsdt: 1250.0,
      balanceBnb: 0.428,
      totalMined: 4892.45,
      referralCode: 'SPK-71C8A9',
      referredBy: null,
      role: 'admin',
      status: 'active',
      createdAt: '2025-01-15T08:00:00.000Z',
      lastActive: new Date().toISOString(),
      notes: 'Super Admin & Primary Validator Node Owner',
    },
    {
      address: '0x38F2B78d9b8A6c0d87AeE9e6Fa2c5D551a89E239',
      balanceUsdt: 640.2,
      balanceBnb: 0.185,
      totalMined: 1240.8,
      referralCode: 'SPK-38F2B7',
      referredBy: '0x71C8a914B97e889F12A0987cB32456Fa12349A2',
      role: 'user',
      status: 'active',
      createdAt: '2025-02-10T12:30:00.000Z',
      lastActive: new Date().toISOString(),
      notes: 'Team referral partner',
    },
    {
      address: '0x992B1048b6cF8F7d402E8eE755497B1A0a42Ce08',
      balanceUsdt: 320.0,
      balanceBnb: 0.092,
      totalMined: 680.15,
      referralCode: 'SPK-992B10',
      referredBy: '0x71C8a914B97e889F12A0987cB32456Fa12349A2',
      role: 'user',
      status: 'active',
      createdAt: '2025-02-28T16:15:00.000Z',
      lastActive: new Date().toISOString(),
    },
    {
      address: '0xbc5d4447cd615daac2338ce7b9c70eab18d78e21',
      balanceUsdt: 0.0,
      balanceBnb: 0.005,
      totalMined: 0.0,
      referralCode: 'SPK-BC5D44',
      referredBy: null,
      role: 'user',
      status: 'active',
      createdAt: '2026-10-09T07:30:00.000Z',
      lastActive: new Date().toISOString(),
      notes: 'Primary Referrer Wallet',
    },
    {
      address: '0x38069663d6408dff184bafc65e247e37ae84a1c2',
      balanceUsdt: 0.0,
      balanceBnb: 0.005,
      totalMined: 0.0,
      referralCode: 'SPK-380696',
      referredBy: '0xbc5d4447cd615daac2338ce7b9c70eab18d78e21',
      role: 'user',
      status: 'active',
      createdAt: '2026-10-09T07:35:00.000Z',
      lastActive: new Date().toISOString(),
      notes: 'Referee Partner invited by 0xbc5d44...',
    },
  ],
  nodes: [
    {
      id: 'spk-node-01',
      userAddress: '0x71C8a914B97e889F12A0987cB32456Fa12349A2',
      name: 'Falcon Titan Apex Rig #1',
      region: 'Frankfurt (EU-Central)',
      status: 'mining',
      hashrate: 142.8,
      temperature: 63,
      shareAcceptance: 99.94,
      fanSpeed: 74,
      powerUsage: 3180,
      uptimeDays: 24.6,
      algorithm: 'SHA-256 (BSC Sublayer)',
      logs: [
        'Stratum target diff accepted: 1048576 (hash: 00000000...a4f2)',
        'Share #192,840 verified by validator block 42918491',
        'Fan speed adjusted dynamically to 74% (63°C ambient)',
      ],
      costUsdt: 50.0,
      deployedAt: '2025-02-01T10:00:00.000Z',
    },
    {
      id: 'spk-node-02',
      userAddress: '0x71C8a914B97e889F12A0987cB32456Fa12349A2',
      name: 'Falcon Quantum Rig #2',
      region: 'Singapore (AP-East)',
      status: 'mining',
      hashrate: 118.4,
      temperature: 61,
      shareAcceptance: 99.88,
      fanSpeed: 68,
      powerUsage: 2840,
      uptimeDays: 18.2,
      algorithm: 'SHA-256 (BSC Sublayer)',
      logs: [
        'Stratum heartbeat OK: 28ms latency to Singapore pool',
        'Epoch 48 payout confirmed: 0.042 tBNB credited',
      ],
      costUsdt: 35.0,
      deployedAt: '2025-02-12T14:20:00.000Z',
    },
    {
      id: 'spk-node-03',
      userAddress: '0x71C8a914B97e889F12A0987cB32456Fa12349A2',
      name: 'Falcon Micro Cluster #3',
      region: 'Virginia (US-East)',
      status: 'mining',
      hashrate: 86.5,
      temperature: 58,
      shareAcceptance: 99.91,
      fanSpeed: 62,
      powerUsage: 2150,
      uptimeDays: 12.8,
      algorithm: 'SHA-256 (BSC Sublayer)',
      logs: [
        'Stratum connection established with us-east.spike.network',
        'Valid shares accepted: 84,209 / 84,285 (99.91%)',
      ],
      costUsdt: 15.0,
      deployedAt: '2025-02-20T09:00:00.000Z',
    },
  ],
  transactions: [
    {
      id: 'tx-init-1',
      userAddress: '0x71C8a914B97e889F12A0987cB32456Fa12349A2',
      txHash: '0x9b4f2c81a938d7210e54b67fa9c8b71d9a24e8310c854129e73cba985a14d872',
      type: 'activation',
      amount: -50.0,
      currency: 'USDT',
      timestamp: '2025-02-01 10:00:00',
      status: 'Confirmed',
      details: 'Node Activation Fee (Falcon Titan Apex Rig #1)',
      blockNumber: 42901842,
    },
    {
      id: 'tx-init-2',
      userAddress: '0x71C8a914B97e889F12A0987cB32456Fa12349A2',
      txHash: '0x4f128c7391b8a472d93e821094ba8721c09841f3e72c819a04b8273918a24c51',
      type: 'claim',
      amount: 48.5,
      currency: 'USDT',
      timestamp: '2025-02-15 18:30:00',
      status: 'Confirmed',
      details: 'Daily Epoch Mining Rewards Payout',
      blockNumber: 42915830,
    },
    {
      id: 'tx-init-3',
      userAddress: '0x71C8a914B97e889F12A0987cB32456Fa12349A2',
      txHash: '0x18a93b4827c6d591823a748c9182b37491029c83719283749182736481928374',
      type: 'referral_bonus',
      amount: 32.0,
      currency: 'USDT',
      timestamp: '2025-02-18 12:45:00',
      status: 'Confirmed',
      details: 'Team Milestone Bonus Payout',
      blockNumber: 42918491,
    },
  ],
  referrals: [
    {
      id: 'ref-1',
      referrerAddress: '0x71C8a914B97e889F12A0987cB32456Fa12349A2',
      refereeAddress: '0x38F2B78d9b8A6c0d87AeE9e6Fa2c5D551a89E239',
      tier: 1,
      commissionUsdt: 0,
      volumeUsdt: 640.2,
      createdAt: '2025-02-10T12:30:00.000Z',
    },
    {
      id: 'ref-2',
      referrerAddress: '0x71C8a914B97e889F12A0987cB32456Fa12349A2',
      refereeAddress: '0x992B1048b6cF8F7d402E8eE755497B1A0a42Ce08',
      tier: 1,
      commissionUsdt: 0,
      volumeUsdt: 320.0,
      createdAt: '2025-02-28T16:15:00.000Z',
    },
    {
      id: 'ref-bc5d-3806',
      referrerAddress: '0xbc5d4447cd615daac2338ce7b9c70eab18d78e21',
      refereeAddress: '0x38069663d6408dff184bafc65e247e37ae84a1c2',
      tier: 1,
      commissionUsdt: 0,
      volumeUsdt: 150.0,
      createdAt: '2026-10-09T07:35:00.000Z',
    },
  ],
  announcements: [
    {
      id: 'ann-1',
      title: 'Top 10 Global CEX Listing Agreement Finalized',
      content:
        'SPIKE protocol has officially signed terms with Tier-1 Centralized Exchanges. Mining difficulty will adjust dynamically post-listing.',
      badge: 'TOP 10 CEX',
      priority: 'high',
      author: 'Core Protocol Foundation',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'ann-2',
      title: 'Stratum Turbo 10X Mining Engine Deployed to BSC Testnet & Mainnet',
      content:
        'Overclocking profile locked to Turbo 10X. All connected rigs receive high-priority ASIC share validation and zero orphan blocks.',
      badge: 'PROTOCOL UPDATE',
      priority: 'medium',
      author: 'Lead Infrastructure Engineer',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ],
  settings: {
    turboMultiplier: 10,
    dailyYieldPercent: 3.88,
    maintenanceMode: false,
    stratumPoolUrl: 'stratum+tcp://pool.spikenodes.com:443',
    bscContractAddress: '0x71C8a914B97e889F12A0987cB32456Fa12349A2',
    treasuryWalletAddress: '0xDE7BfCaDE6F9BcC411aC67D970A4618054B8a4c7',
    treasuryBalanceUsdt: 24850.0,
    minWithdrawalUsdt: 5.0,
    autoPayoutEnabled: true,
    updatedAt: new Date().toISOString(),
    primaryDomain: 'spikenodes.com',
    protocolUrl: 'https://spikenodes.com',
    apiBaseUrl: 'https://spikenodes.com/api',
    docsUrl: 'https://docs.spikenodes.com',
    rpcUrl: 'https://rpc.spikenodes.com',
    telegramUrl: 'https://t.me/spikenodes',
    twitterUrl: 'https://x.com/spikenodes',
    supportEmail: 'contact@spikenodes.com',
  },
  auditLogs: [
    {
      id: 'audit-init',
      adminUser: '0x71C8a914B97e889F12A0987cB32456Fa12349A2',
      action: 'SYSTEM_BOOTSTRAP',
      target: 'spike_database',
      details: 'Database initialized with persistent ACID JSON engine and schema v1.',
      timestamp: new Date().toISOString(),
    },
  ],
  testnetWallets: [
    {
      address: '0x71C8a914B97e889F12A0987cB32456Fa12349A2',
      testnetUsdt: 1000.0,
      testnetSpk: 250.0,
      autoBuyEnabled: true,
      slippageTolerance: 0.5,
      totalHarvestAutoBoughtSpk: 125.0,
      totalUsdtSpentOnAutoBuy: 4.31,
      lastAutoBuyAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
  testnetTransactions: [
    {
      id: 'test-tx-init-1',
      userAddress: '0x71C8a914B97e889F12A0987cB32456Fa12349A2',
      txHash: '0x7f3e829a1b4c5d6e7f8091a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2',
      type: 'harvest_autobuy',
      spkAmount: 25.0,
      usdtAmount: 0.8625,
      priceUsdt: 0.0345,
      status: 'Confirmed',
      blockNumber: 42918490,
      gasFeeBnb: 0.00012,
      details: 'PancakeRouter.swapTokensForExactTokens(amountOut=25 SPK, maxIn=0.87 USDT)',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'test-tx-init-2',
      userAddress: '0x71C8a914B97e889F12A0987cB32456Fa12349A2',
      txHash: '0x81b4c5d6e7f8091a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c27f3e829a',
      type: 'faucet',
      spkAmount: 100.0,
      usdtAmount: 1000.0,
      priceUsdt: 0.0345,
      status: 'Confirmed',
      blockNumber: 42918400,
      gasFeeBnb: 0.0,
      details: 'Testnet Faucet Initial Allocation (+1000 tUSDT, +100 SPK)',
      timestamp: new Date(Date.now() - 18000000).toISOString(),
    },
  ],
  testnetSpikeToken: {
    name: 'SPIKE',
    symbol: 'SPK',
    totalSupply: 50_000_000,
    circulatingSupply: 12_450_000,
    decimals: 18,
    contractAddress: '0x5P1KE777cE25a947C590823FaBe876610bFa3109',
    pair: 'SPIKE / USDT',
    poolSpkReserve: 2_500_000,
    poolUsdtReserve: 86_250,
    currentPrice: 0.0345,
    volume24h: 1_420_000,
    high24h: 0.0382,
    low24h: 0.0315,
    change24h: 8.42,
    buyPressure: 86.5,
  },
};

class PersistentDatabase {
  private data: DatabaseSchema;
  private isSaving = false;
  private onSaveCallback?: (data: DatabaseSchema) => void;

  constructor() {
    this.ensureDirectory();
    this.data = this.load();
  }

  public setOnSaveCallback(cb: (data: DatabaseSchema) => void) {
    this.onSaveCallback = cb;
  }

  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version) {
          const loadedSettings = {
            ...INITIAL_DATA.settings,
            ...(parsed.settings || {}),
          };
          if (!loadedSettings.primaryDomain || loadedSettings.primaryDomain.includes('spike.network') || loadedSettings.primaryDomain.includes('spike.finance')) {
            loadedSettings.primaryDomain = 'spikenodes.com';
            loadedSettings.protocolUrl = 'https://spikenodes.com';
            loadedSettings.apiBaseUrl = 'https://spikenodes.com/api';
            loadedSettings.docsUrl = 'https://docs.spikenodes.com';
            loadedSettings.rpcUrl = 'https://rpc.spikenodes.com';
          }
          if (loadedSettings.stratumPoolUrl?.includes('spike.network')) {
            loadedSettings.stratumPoolUrl = 'stratum+tcp://pool.spikenodes.com:443';
          }
          if (!loadedSettings.treasuryWalletAddress) {
            loadedSettings.treasuryWalletAddress = '0xDE7BfCaDE6F9BcC411aC67D970A4618054B8a4c7';
          }
          if (typeof loadedSettings.treasuryBalanceUsdt !== 'number') {
            loadedSettings.treasuryBalanceUsdt = 24850.0;
          }
          return {
            ...INITIAL_DATA,
            ...parsed,
            settings: loadedSettings,
            testnetWallets: Array.isArray(parsed.testnetWallets) && parsed.testnetWallets.length ? parsed.testnetWallets : INITIAL_DATA.testnetWallets,
            testnetTransactions: Array.isArray(parsed.testnetTransactions) && parsed.testnetTransactions.length ? parsed.testnetTransactions : INITIAL_DATA.testnetTransactions,
            testnetSpikeToken: parsed.testnetSpikeToken || INITIAL_DATA.testnetSpikeToken,
          };
        }
      }
    } catch (err) {
      console.error('[DB] Error loading database file, checking backup:', err);
      try {
        if (fs.existsSync(BACKUP_FILE)) {
          const raw = fs.readFileSync(BACKUP_FILE, 'utf-8');
          const parsedBackup = JSON.parse(raw);
          return {
            ...INITIAL_DATA,
            ...parsedBackup,
            testnetWallets: parsedBackup.testnetWallets || INITIAL_DATA.testnetWallets,
            testnetTransactions: parsedBackup.testnetTransactions || INITIAL_DATA.testnetTransactions,
            testnetSpikeToken: parsedBackup.testnetSpikeToken || INITIAL_DATA.testnetSpikeToken,
          };
        }
      } catch (backupErr) {
        console.error('[DB] Backup load failed too:', backupErr);
      }
    }

    // If no existing file, write initial data
    this.saveDirect(INITIAL_DATA);
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  private saveDirect(dataToSave: DatabaseSchema) {
    try {
      this.ensureDirectory();
      dataToSave.lastSaved = new Date().toISOString();
      const content = JSON.stringify(dataToSave, null, 2);
      const tempFile = path.join(DATA_DIR, `spike_database.${Date.now()}.tmp`);
      fs.writeFileSync(tempFile, content, 'utf-8');
      fs.renameSync(tempFile, DB_FILE);

      // Create backup copy periodically
      try {
        fs.writeFileSync(BACKUP_FILE, content, 'utf-8');
      } catch {
        // backup failure non-fatal
      }

      if (this.onSaveCallback) {
        try {
          this.onSaveCallback(dataToSave);
        } catch {
          // ignore callback failure
        }
      }
    } catch (err) {
      console.error('[DB] Failed to save database to disk:', err);
    }
  }

  public save() {
    if (this.isSaving) return;
    this.isSaving = true;
    setTimeout(() => {
      this.saveDirect(this.data);
      this.isSaving = false;
    }, 50);
  }

  // ---- System Statistics ----
  public getStats() {
    const totalUsers = this.data.users.length;
    const activeNodes = this.data.nodes.filter((n) => n.status === 'mining').length;
    const totalNodes = this.data.nodes.length;
    const totalHashrate = this.data.nodes
      .filter((n) => n.status === 'mining')
      .reduce((sum, n) => sum + (n.hashrate || 0), 0);
    const totalMinedUsdt = this.data.users.reduce((sum, u) => sum + (u.totalMined || 0), 0);
    const totalUserBalance = this.data.users.reduce((sum, u) => sum + (u.balanceUsdt || 0), 0);
    const totalTransactions = this.data.transactions.length;

    let dbSizeKb = 0;
    try {
      if (fs.existsSync(DB_FILE)) {
        dbSizeKb = Math.round(fs.statSync(DB_FILE).size / 1024);
      }
    } catch {
      dbSizeKb = 0;
    }

    return {
      totalUsers,
      activeNodes,
      totalNodes,
      totalHashrate: +totalHashrate.toFixed(2),
      totalMinedUsdt: +totalMinedUsdt.toFixed(2),
      totalUserBalance: +totalUserBalance.toFixed(2),
      totalTransactions,
      dbSizeKb,
      lastSaved: this.data.lastSaved,
      maintenanceMode: this.data.settings.maintenanceMode,
      turboMultiplier: this.data.settings.turboMultiplier,
      dailyYieldPercent: this.data.settings.dailyYieldPercent,
    };
  }

  // ---- Users ----
  public getUsers(): DbUser[] {
    return this.data.users;
  }

  public getUser(address: string): DbUser | undefined {
    const norm = address.toLowerCase();
    return this.data.users.find((u) => u.address.toLowerCase() === norm);
  }

  public upsertUser(user: Partial<DbUser> & { address: string }): DbUser {
    const norm = user.address.toLowerCase();
    const idx = this.data.users.findIndex((u) => u.address.toLowerCase() === norm);
    if (idx >= 0) {
      this.data.users[idx] = {
        ...this.data.users[idx],
        ...user,
        lastActive: new Date().toISOString(),
      };
      this.save();
      return this.data.users[idx];
    } else {
      const newUser: DbUser = {
        address: user.address,
        balanceUsdt: user.balanceUsdt ?? 0.0,
        balanceBnb: user.balanceBnb ?? 0.005,
        totalMined: user.totalMined ?? 0.0,
        referralCode: user.referralCode || `SPK-${user.address.slice(2, 8).toUpperCase()}`,
        referredBy: user.referredBy || null,
        role: user.role || 'user',
        status: user.status || 'active',
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        notes: user.notes || '',
      };
      this.data.users.push(newUser);
      this.logAudit('SYSTEM', 'USER_REGISTER', newUser.address, 'New user wallet connected to database');
      this.save();
      return newUser;
    }
  }

  public adjustUserBalance(
    address: string,
    usdtDelta: number,
    bnbDelta: number,
    reason: string,
    admin = 'admin'
  ): DbUser | null {
    const user = this.getUser(address);
    if (!user) return null;

    user.balanceUsdt = Math.max(0, +(user.balanceUsdt + usdtDelta).toFixed(2));
    if (bnbDelta !== 0) {
      user.balanceBnb = Math.max(0, +(user.balanceBnb + bnbDelta).toFixed(4));
    }
    user.lastActive = new Date().toISOString();

    // Record adjustment in transactions
    this.createTransaction({
      userAddress: user.address,
      txHash: `0x${Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      type: 'admin_adjustment',
      amount: usdtDelta,
      currency: 'USDT',
      status: 'Confirmed',
      details: `Admin adjustment: ${reason}`,
      blockNumber: 42900000 + Math.floor(Math.random() * 50000),
    });

    this.logAudit(admin, 'ADJUST_BALANCE', user.address, `USDT delta: ${usdtDelta}, Reason: ${reason}`);
    this.save();
    return user;
  }

  public setUserStatus(address: string, status: 'active' | 'frozen' | 'banned', admin = 'admin'): DbUser | null {
    const user = this.getUser(address);
    if (!user) return null;
    user.status = status;
    this.logAudit(admin, 'USER_STATUS_CHANGE', user.address, `Status set to ${status}`);
    this.save();
    return user;
  }

  // ---- Mining Nodes ----
  public getNodes(userAddress?: string): DbMiningNode[] {
    if (userAddress) {
      const norm = userAddress.toLowerCase();
      return this.data.nodes.filter((n) => n.userAddress.toLowerCase() === norm);
    }
    return this.data.nodes;
  }

  public getNode(id: string): DbMiningNode | undefined {
    return this.data.nodes.find((n) => n.id === id);
  }

  public createNode(nodeData: Omit<DbMiningNode, 'id' | 'deployedAt'>): DbMiningNode {
    const newNode: DbMiningNode = {
      ...nodeData,
      id: `spk-node-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      deployedAt: new Date().toISOString(),
    };
    this.data.nodes.unshift(newNode);
    this.logAudit(
      newNode.userAddress,
      'NODE_DEPLOYED',
      newNode.id,
      `Deployed ${newNode.name} (${newNode.hashrate} TH/s)`
    );
    this.save();
    return newNode;
  }

  public updateNodeStatus(id: string, status: DbMiningNode['status'], admin = 'user'): DbMiningNode | null {
    const node = this.getNode(id);
    if (!node) return null;
    node.status = status;
    if (status === 'mining') {
      node.temperature = 63;
      node.logs.unshift(`[${new Date().toLocaleTimeString()}] Resumed hashing on BSC sublayer pool.`);
    } else if (status === 'idle') {
      node.temperature = 45;
      node.logs.unshift(`[${new Date().toLocaleTimeString()}] Switched to idle power-save mode.`);
    } else if (status === 'stopped') {
      node.temperature = 38;
      node.logs.unshift(`[${new Date().toLocaleTimeString()}] Hashing stopped by controller.`);
    }
    node.logs = node.logs.slice(0, 10);
    this.logAudit(admin, 'NODE_STATUS_CHANGE', node.id, `Status set to ${status}`);
    this.save();
    return node;
  }

  public deleteNode(id: string, admin = 'admin'): boolean {
    const initialLen = this.data.nodes.length;
    this.data.nodes = this.data.nodes.filter((n) => n.id !== id);
    const removed = this.data.nodes.length < initialLen;
    if (removed) {
      this.logAudit(admin, 'NODE_DELETED', id, `Rig removed from database fleet`);
      this.save();
    }
    return removed;
  }

  // ---- Transactions ----
  public getTransactions(userAddress?: string, limit = 50): DbTransaction[] {
    let list = this.data.transactions;
    if (userAddress) {
      const norm = userAddress.toLowerCase();
      list = list.filter((t) => t.userAddress.toLowerCase() === norm);
    }
    return list.slice(0, limit);
  }

  public createTransaction(tx: Omit<DbTransaction, 'id' | 'timestamp'>): DbTransaction {
    const newTx: DbTransaction = {
      ...tx,
      id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    this.data.transactions.unshift(newTx);
    this.save();
    return newTx;
  }

  public updateTransactionStatus(id: string, status: DbTransaction['status'], admin = 'admin'): DbTransaction | null {
    const tx = this.data.transactions.find((t) => t.id === id);
    if (!tx) return null;
    tx.status = status;
    this.logAudit(admin, 'TRANSACTION_STATUS_UPDATE', tx.id, `Status updated to ${status}`);
    this.save();
    return tx;
  }

  public verifyAndProcessDeposit(
    userAddress: string,
    txHash: string,
    amount = 15,
    officialWallet = '0xDE7BfCaDE6F9BcC411aC67D970A4618054B8a4c7',
    customBlockNumber?: number
  ): { success: boolean; user?: DbUser; transaction?: DbTransaction; error?: string } {
    if (!userAddress || !txHash) {
      return { success: false, error: 'User address and transaction hash are required' };
    }

    const norm = userAddress.toLowerCase();
    const cleanHash = txHash.trim();

    // Verify hash uniqueness (prevent double crediting of same tx)
    const existing = this.data.transactions.find(
      (t) => t.txHash && t.txHash.toLowerCase() === cleanHash.toLowerCase()
    );
    if (existing) {
      return { success: false, error: 'This transaction hash has already been credited to a wallet.' };
    }

    const user = this.upsertUser({ address: norm });
    user.balanceUsdt = +(user.balanceUsdt + amount).toFixed(2);
    user.lastActive = new Date().toISOString();

    const newTx = this.createTransaction({
      userAddress: norm,
      txHash: cleanHash,
      type: 'deposit',
      amount,
      currency: 'USDT',
      status: 'Confirmed',
      details: `BEP-20 USDT deposit to official wallet ${officialWallet}. Credited $${amount} to Mining Balance.`,
      blockNumber: customBlockNumber || 42950000 + Math.floor(Math.random() * 25000),
    });

    this.logAudit(
      'SYSTEM_VERIFIER',
      'DEPOSIT_VERIFIED',
      norm,
      `Hash: ${cleanHash.slice(0, 16)}... | Amount: +${amount} USDT | Official: ${officialWallet}`
    );

    this.save();
    return { success: true, user, transaction: newTx };
  }

  // ---- Referrals ----
  public getReferrals(userAddress?: string): DbReferral[] {
    if (userAddress) {
      const norm = userAddress.toLowerCase();
      return this.data.referrals.filter(
        (r) => r.referrerAddress.toLowerCase() === norm || r.refereeAddress.toLowerCase() === norm
      );
    }
    return this.data.referrals;
  }

  public getReferralStats(userAddress: string) {
    const norm = userAddress.toLowerCase();
    const directs = this.data.referrals.filter(
      (r) => r.referrerAddress.toLowerCase() === norm
    );
    const totalCommissions = directs.reduce((sum, r) => sum + (r.commissionUsdt || 0), 0);

    const currentUser = this.getUser(userAddress);

    return {
      directPartners: directs.length,
      downlinePartners: 0,
      totalPartners: directs.length,
      totalCommissions: +totalCommissions.toFixed(2),
      referrals: directs,
      referredBy: currentUser?.referredBy || null,
      referralCode: currentUser?.referralCode || `SPK-${norm.slice(2, 8).toUpperCase()}`,
    };
  }

  public findUserByReferralCodeOrAddress(codeOrAddr: string): DbUser | undefined {
    if (!codeOrAddr) return undefined;
    const clean = codeOrAddr.trim().toLowerCase();
    
    // 1. Direct address match
    let user = this.data.users.find((u) => u.address.toLowerCase() === clean);
    if (user) return user;

    // 2. Referral code match (e.g. SPK-BC5D44, SPIKE-BC5D44, BC5D44)
    user = this.data.users.find((u) => {
      const code = u.referralCode ? u.referralCode.toLowerCase() : '';
      const slice = u.address.slice(2, 8).toLowerCase();
      const rawCode = clean.replace(/^spike-/, '').replace(/^spk-/, '');
      const rawUserCode = code.replace(/^spike-/, '').replace(/^spk-/, '');
      return (
        code === clean ||
        rawUserCode === rawCode ||
        slice === rawCode ||
        `spike-${slice}` === clean ||
        `spk-${slice}` === clean
      );
    });
    return user;
  }

  public registerReferral(
    referrerCodeOrAddr: string,
    refereeAddress: string
  ): { success: boolean; referrer?: DbUser; referee?: DbUser; referral?: DbReferral; message?: string } {
    if (!referrerCodeOrAddr || !refereeAddress) {
      return { success: false, message: 'Both referrer code/address and referee address are required' };
    }

    const normReferee = refereeAddress.trim().toLowerCase();
    let referee = this.getUser(normReferee);
    if (!referee) {
      referee = this.upsertUser({ address: refereeAddress.trim() });
    }

    // Check if referrer code is the same wallet (cannot self-refer)
    if (referee.address.toLowerCase() === referrerCodeOrAddr.trim().toLowerCase()) {
      return { success: false, message: 'Cannot refer your own wallet address' };
    }

    // Find referrer
    let referrer = this.findUserByReferralCodeOrAddress(referrerCodeOrAddr);
    if (!referrer) {
      // If referrerCodeOrAddr is a valid Ethereum/BSC 0x address not yet in memory, create their user profile
      if (/^0x[a-fA-F0-9]{40}$/.test(referrerCodeOrAddr.trim())) {
        referrer = this.upsertUser({ address: referrerCodeOrAddr.trim() });
      }
    }

    if (!referrer) {
      return { success: false, message: 'Sponsor referral code or address not found' };
    }

    if (referrer.address.toLowerCase() === referee.address.toLowerCase()) {
      return { success: false, message: 'Cannot refer yourself' };
    }

    // Check if referral link already established
    const existing = this.data.referrals.find(
      (r) =>
        r.referrerAddress.toLowerCase() === referrer!.address.toLowerCase() &&
        r.refereeAddress.toLowerCase() === normReferee &&
        r.tier === 1
    );

    if (existing) {
      if (!referee.referredBy) {
        referee.referredBy = referrer.address;
        this.save();
      }
      return { success: true, referrer, referee, referral: existing, message: 'Referral connection already verified and active' };
    }

    // Bind sponsor
    referee.referredBy = referrer.address;
    this.save();

    // Create Team Partner record (counted towards Team Milestone Rewards)
    const newRef = this.createReferral({
      referrerAddress: referrer.address,
      refereeAddress: referee.address,
      tier: 1,
      commissionUsdt: 0,
      volumeUsdt: 150.0,
    });

    this.logAudit('SYSTEM', 'REFERRAL_REGISTER', `${referrer.address}->${referee.address}`, `Linked partner ${referee.address} to sponsor ${referrer.address}`);

    return { success: true, referrer, referee, referral: newRef, message: 'Partner successfully linked to your team and counted toward milestones!' };
  }

  public createReferral(ref: Omit<DbReferral, 'id' | 'createdAt'>): DbReferral {
    const newRef: DbReferral = {
      ...ref,
      id: `ref-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    this.data.referrals.unshift(newRef);
    this.save();
    return newRef;
  }

  public simulateReferral(referrerAddress: string): { referral: DbReferral; commissionAdded: number } {
    const randomHex = Array.from({ length: 4 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const randomHexEnd = Array.from({ length: 4 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const referee = `0x${randomHex}${Date.now().toString(16).slice(-4)}${randomHexEnd}`;

    const newRef = this.createReferral({
      referrerAddress,
      refereeAddress: referee,
      tier: 1,
      commissionUsdt: 0,
      volumeUsdt: 150.0,
    });

    return { referral: newRef, commissionAdded: 0 };
  }

  // ---- Announcements ----
  public getAnnouncements(): DbAnnouncement[] {
    return this.data.announcements;
  }

  public createAnnouncement(ann: Omit<DbAnnouncement, 'id' | 'createdAt'>, admin = 'admin'): DbAnnouncement {
    const newAnn: DbAnnouncement = {
      ...ann,
      id: `ann-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.data.announcements.unshift(newAnn);
    this.logAudit(admin, 'ANNOUNCEMENT_CREATE', newAnn.id, `Created broadcast "${newAnn.title}"`);
    this.save();
    return newAnn;
  }

  public deleteAnnouncement(id: string, admin = 'admin'): boolean {
    const initialLen = this.data.announcements.length;
    this.data.announcements = this.data.announcements.filter((a) => a.id !== id);
    const removed = this.data.announcements.length < initialLen;
    if (removed) {
      this.logAudit(admin, 'ANNOUNCEMENT_DELETE', id, `Removed broadcast announcement`);
      this.save();
    }
    return removed;
  }

  // ---- Settings ----
  public getSettings(): DbSettings {
    return this.data.settings;
  }

  public updateSettings(partial: Partial<DbSettings>, admin = 'admin'): DbSettings {
    this.data.settings = {
      ...this.data.settings,
      ...partial,
      updatedAt: new Date().toISOString(),
    };
    this.logAudit(admin, 'SETTINGS_UPDATE', 'system_config', JSON.stringify(partial));
    this.save();
    return this.data.settings;
  }

  // ---- Audit Logs ----
  public getAuditLogs(limit = 100): DbAuditLog[] {
    return this.data.auditLogs.slice(0, limit);
  }

  public logAudit(adminUser: string, action: string, target: string, details: string) {
    const log: DbAuditLog = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      adminUser,
      action,
      target,
      details,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(log);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.save();
  }

  // ---- DB Maintenance & Export ----
  public resetToDefault(admin = 'admin') {
    this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
    this.logAudit(admin, 'DATABASE_RESET', 'all_tables', 'Database re-seeded to initial state');
    this.saveDirect(this.data);
    return { success: true, message: 'Database reset and re-seeded to default demo values' };
  }

  public exportData(): DatabaseSchema {
    return this.data;
  }

  // ---- Testnet SPIKE Token & Auto-Buy Engine ----
  public getTestnetSpikeToken(): DbTestnetSpikeToken {
    if (!this.data.testnetSpikeToken) {
      this.data.testnetSpikeToken = { ...INITIAL_DATA.testnetSpikeToken };
      this.save();
    }
    return this.data.testnetSpikeToken;
  }

  public getTestnetWallet(address: string): DbTestnetWallet {
    if (!this.data.testnetWallets) {
      this.data.testnetWallets = [];
    }
    const norm = (address || '').toLowerCase();
    let wallet = this.data.testnetWallets.find((w) => w.address.toLowerCase() === norm);
    if (!wallet) {
      wallet = {
        address: address || '0xDemoWallet...User',
        testnetUsdt: 1000.0,
        testnetSpk: 150.0,
        autoBuyEnabled: true,
        slippageTolerance: 0.5,
        totalHarvestAutoBoughtSpk: 0.0,
        totalUsdtSpentOnAutoBuy: 0.0,
      };
      this.data.testnetWallets.push(wallet);
      this.save();
    }
    return wallet;
  }

  public updateTestnetWalletSettings(
    address: string,
    autoBuyEnabled: boolean,
    slippageTolerance: number
  ): DbTestnetWallet {
    const wallet = this.getTestnetWallet(address);
    wallet.autoBuyEnabled = autoBuyEnabled;
    wallet.slippageTolerance = Number(slippageTolerance) || 0.5;
    this.save();
    return wallet;
  }

  public topupTestnetWallet(
    address: string,
    usdtAmount = 500,
    spkAmount = 100
  ): { wallet: DbTestnetWallet; tx: DbTestnetTx } {
    const wallet = this.getTestnetWallet(address);
    wallet.testnetUsdt += Number(usdtAmount);
    wallet.testnetSpk += Number(spkAmount);

    const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    const token = this.getTestnetSpikeToken();
    const newTx: DbTestnetTx = {
      id: `test-tx-${Date.now()}`,
      userAddress: wallet.address,
      txHash,
      type: 'faucet',
      spkAmount: Number(spkAmount),
      usdtAmount: Number(usdtAmount),
      priceUsdt: token.currentPrice,
      status: 'Confirmed',
      blockNumber: 42918400 + Math.floor(Math.random() * 5000),
      gasFeeBnb: 0.0,
      details: `Testnet Faucet Top-up: +${usdtAmount} tUSDT & +${spkAmount} SPK`,
      timestamp: new Date().toISOString(),
    };

    if (!this.data.testnetTransactions) {
      this.data.testnetTransactions = [];
    }
    this.data.testnetTransactions.unshift(newTx);
    this.save();
    return { wallet, tx: newTx };
  }

  public executeTestnetHarvestAutoBuy(
    address: string,
    minedSpkAmount: number,
    hashrate: number,
    slippageTolerance = 0.2
  ): {
    success: boolean;
    wallet: DbTestnetWallet;
    token: DbTestnetSpikeToken;
    tx: DbTestnetTx;
    route?: string[];
    routerAddress?: string;
    slippageUsed?: number;
    error?: string;
  } {
    const wallet = this.getTestnetWallet(address);
    const token = this.getTestnetSpikeToken();
    const exactMinedSpk = Number(minedSpkAmount) || 0;

    if (exactMinedSpk <= 0) {
      return { success: false, wallet, token, tx: null as any, error: 'Mined SPK amount must be greater than 0' };
    }

    // Dynamic AMM calculation on PancakeSwap v2 pool
    const poolSpk = token.poolSpkReserve;
    const poolUsdt = token.poolUsdtReserve;
    const numerator = poolUsdt * exactMinedSpk;
    const denominator = Math.max(1, (poolSpk - exactMinedSpk) * 0.9975);
    const baseRequiredUsdt = Number((numerator / denominator).toFixed(4));

    // Best slippage buffer (0.2% optimal slippage for ultra-fast confirmation)
    const effectiveSlippage = Number(slippageTolerance) > 0 ? Number(slippageTolerance) : 0.2;
    const maxUsdtWithSlippage = Number((baseRequiredUsdt * (1 + effectiveSlippage / 100)).toFixed(4));
    const requiredUsdt = baseRequiredUsdt;

    // If user's testnet USDT is insufficient, top up automatically so testing is effortless
    if (wallet.testnetUsdt < requiredUsdt) {
      wallet.testnetUsdt += 1000.0;
    }

    // Execute PancakeSwap Router V2 swap: Deduct USDT, Credit exact mined SPK
    wallet.testnetUsdt = Math.max(0, Number((wallet.testnetUsdt - requiredUsdt).toFixed(4)));
    wallet.testnetSpk = Number((wallet.testnetSpk + exactMinedSpk).toFixed(4));
    wallet.totalHarvestAutoBoughtSpk = Number((wallet.totalHarvestAutoBoughtSpk + exactMinedSpk).toFixed(4));
    wallet.totalUsdtSpentOnAutoBuy = Number((wallet.totalUsdtSpentOnAutoBuy + requiredUsdt).toFixed(4));
    wallet.lastAutoBuyAt = new Date().toISOString();

    // Update AMM liquidity pool reserves & live price
    token.poolSpkReserve = Math.max(100000, token.poolSpkReserve - exactMinedSpk);
    token.poolUsdtReserve = token.poolUsdtReserve + requiredUsdt;
    const newPrice = Number((token.poolUsdtReserve / token.poolSpkReserve).toFixed(6));
    token.currentPrice = newPrice;
    token.volume24h = Number((token.volume24h + exactMinedSpk).toFixed(2));
    token.high24h = Math.max(token.high24h || 0.0368, newPrice);
    token.change24h = Number((token.change24h + 0.18).toFixed(2));
    token.buyPressure = Math.min(96, Number((token.buyPressure + 0.25).toFixed(1)));

    const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    const blockNumber = 42918500 + (this.data.testnetTransactions?.length || 0);

    const tx: DbTestnetTx = {
      id: `test-tx-${Date.now()}`,
      userAddress: wallet.address,
      txHash,
      type: 'harvest_autobuy',
      spkAmount: exactMinedSpk,
      usdtAmount: requiredUsdt,
      priceUsdt: newPrice,
      status: 'Confirmed',
      blockNumber,
      gasFeeBnb: 0.00015,
      details: `PancakeRouter.swapTokensForExactTokens(amountOut=${exactMinedSpk.toFixed(4)} SPK, maxIn=${maxUsdtWithSlippage.toFixed(4)} USDT, path=[USDT->SPK], deadline=fast) [Best Slippage: ${effectiveSlippage}% | Hashrate: ${hashrate.toFixed(2)} TH/s]`,
      timestamp: new Date().toISOString(),
    };

    if (!this.data.testnetTransactions) {
      this.data.testnetTransactions = [];
    }
    this.data.testnetTransactions.unshift(tx);
    this.save();

    return {
      success: true,
      wallet,
      token,
      tx,
      route: ['USDT', 'SPK'],
      routerAddress: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
      slippageUsed: effectiveSlippage,
    };
  }

  public executeTestnetSwap(
    address: string,
    fromToken: 'USDT' | 'SPK',
    toToken: 'USDT' | 'SPK',
    amountIn: number
  ): { success: boolean; wallet: DbTestnetWallet; token: DbTestnetSpikeToken; tx: DbTestnetTx; error?: string } {
    const wallet = this.getTestnetWallet(address);
    const token = this.getTestnetSpikeToken();
    const numIn = Number(amountIn) || 0;

    if (numIn <= 0) {
      return { success: false, wallet, token, tx: null as any, error: 'Amount must be greater than 0' };
    }

    if (fromToken === 'USDT') {
      if (wallet.testnetUsdt < numIn) {
        return { success: false, wallet, token, tx: null as any, error: 'Insufficient testnet USDT balance' };
      }
      const amountInWithFee = numIn * 0.9975;
      const amountOut = Number(((token.poolSpkReserve * amountInWithFee) / (token.poolUsdtReserve + amountInWithFee)).toFixed(4));
      
      wallet.testnetUsdt -= numIn;
      wallet.testnetSpk += amountOut;

      token.poolUsdtReserve += numIn;
      token.poolSpkReserve -= amountOut;
      token.currentPrice = Number((token.poolUsdtReserve / token.poolSpkReserve).toFixed(6));
      token.volume24h += amountOut;
      token.buyPressure = Math.min(95, token.buyPressure + 0.1);

      const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      const tx: DbTestnetTx = {
        id: `test-tx-${Date.now()}`,
        userAddress: wallet.address,
        txHash,
        type: 'swap_buy',
        spkAmount: amountOut,
        usdtAmount: numIn,
        priceUsdt: token.currentPrice,
        status: 'Confirmed',
        blockNumber: 42918500 + (this.data.testnetTransactions?.length || 0),
        gasFeeBnb: 0.00015,
        details: `Swap ${numIn} USDT -> ${amountOut} SPK on PancakeSwap Testnet`,
        timestamp: new Date().toISOString(),
      };

      if (!this.data.testnetTransactions) this.data.testnetTransactions = [];
      this.data.testnetTransactions.unshift(tx);
      this.save();
      return { success: true, wallet, token, tx };
    } else {
      if (wallet.testnetSpk < numIn) {
        return { success: false, wallet, token, tx: null as any, error: 'Insufficient testnet SPK balance' };
      }
      const amountInWithFee = numIn * 0.9975;
      const amountOut = Number(((token.poolUsdtReserve * amountInWithFee) / (token.poolSpkReserve + amountInWithFee)).toFixed(4));

      wallet.testnetSpk -= numIn;
      wallet.testnetUsdt += amountOut;

      token.poolSpkReserve += numIn;
      token.poolUsdtReserve -= amountOut;
      token.currentPrice = Number((token.poolUsdtReserve / token.poolSpkReserve).toFixed(6));
      token.volume24h += numIn;
      token.buyPressure = Math.max(70, token.buyPressure - 0.2);

      const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      const tx: DbTestnetTx = {
        id: `test-tx-${Date.now()}`,
        userAddress: wallet.address,
        txHash,
        type: 'swap_sell',
        spkAmount: numIn,
        usdtAmount: amountOut,
        priceUsdt: token.currentPrice,
        status: 'Confirmed',
        blockNumber: 42918500 + (this.data.testnetTransactions?.length || 0),
        gasFeeBnb: 0.00015,
        details: `Swap ${numIn} SPK -> ${amountOut} USDT on PancakeSwap Testnet`,
        timestamp: new Date().toISOString(),
      };

      if (!this.data.testnetTransactions) this.data.testnetTransactions = [];
      this.data.testnetTransactions.unshift(tx);
      this.save();
      return { success: true, wallet, token, tx };
    }
  }

  public getTestnetTransactions(address?: string, limit = 50): DbTestnetTx[] {
    const all = this.data.testnetTransactions || [];
    if (!address) return all.slice(0, limit);
    const norm = address.toLowerCase();
    return all.filter((t) => t.userAddress.toLowerCase() === norm).slice(0, limit);
  }

  // ---- Protocol Treasury & $15 Project Flow ----
  public getTreasuryInfo() {
    return {
      treasuryWalletAddress: this.data.settings.treasuryWalletAddress || '0xDE7BfCaDE6F9BcC411aC67D970A4618054B8a4c7',
      treasuryBalanceUsdt: this.data.settings.treasuryBalanceUsdt || 24850.0,
      depositRequiredUsdt: 5.0,
      miningCostUsdt: 10.0,
      totalProjectCostUsdt: 15.0,
      network: 'BNB Smart Chain (BEP-20)',
      contractAddress: this.data.settings.bscContractAddress,
      lastUpdated: new Date().toISOString(),
    };
  }

  public processTreasuryDeposit(
    userAddress: string,
    amount = 5.0,
    txHash?: string
  ): { success: boolean; treasuryBalanceUsdt: number; remainingUserUsdt: number; txHash: string; error?: string } {
    if (!userAddress) {
      return { success: false, treasuryBalanceUsdt: 0, remainingUserUsdt: 0, txHash: '', error: 'User address is required' };
    }
    const norm = userAddress.toLowerCase();
    const user = this.upsertUser({ address: norm });
    const officialWallet = this.data.settings.treasuryWalletAddress || '0xDE7BfCaDE6F9BcC411aC67D970A4618054B8a4c7';
    
    // Accumulate in Global Treasury
    this.data.settings.treasuryBalanceUsdt = +( (this.data.settings.treasuryBalanceUsdt || 24850.0) + amount ).toFixed(2);
    
    // Deduct $5 from user's starting budget ($15 -> $10 remaining)
    if (user.balanceUsdt >= amount) {
      user.balanceUsdt = +(user.balanceUsdt - amount).toFixed(2);
    } else {
      user.balanceUsdt = 10.0; // default remainder for 15$ project flow
    }
    user.hasDepositedTreasury = true;
    user.lastActive = new Date().toISOString();

    const cleanHash = txHash || `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

    this.createTransaction({
      userAddress: norm,
      txHash: cleanHash,
      type: 'deposit',
      amount,
      currency: 'USDT',
      status: 'Confirmed',
      details: `Protocol Entry Fee ($${amount.toFixed(2)} USDT) deposited into Official Protocol Treasury (${officialWallet}). Remaining: $${user.balanceUsdt.toFixed(2)} USDT.`,
      blockNumber: 42950000 + Math.floor(Math.random() * 25000),
    });

    this.logAudit(norm, 'TREASURY_DEPOSIT', officialWallet, `Deposited $${amount} USDT to Treasury. Remaining balance: $${user.balanceUsdt}`);
    this.save();

    return {
      success: true,
      treasuryBalanceUsdt: this.data.settings.treasuryBalanceUsdt,
      remainingUserUsdt: user.balanceUsdt,
      txHash: cleanHash,
    };
  }

  public executeMiningActivation(
    userAddress: string,
    nodeName?: string,
    costUsdt = 10.0
  ): {
    success: boolean;
    node?: DbMiningNode;
    boughtSpk?: number;
    spkPrice?: number;
    remainingUsdt?: number;
    swapTxHash?: string;
    contractTxHash?: string;
    error?: string;
  } {
    if (!userAddress) {
      return { success: false, error: 'User address is required' };
    }
    const norm = userAddress.toLowerCase();
    const user = this.upsertUser({ address: norm });
    const wallet = this.getTestnetWallet(norm);
    const token = this.getTestnetSpikeToken();

    // Check user has the $10 USDT
    if (user.balanceUsdt < costUsdt && wallet.testnetUsdt < costUsdt) {
      return { success: false, error: `Insufficient balance: $${costUsdt} USDT required for Smart Contract Mining Activation.` };
    }

    // Deduct 10 USDT from user
    user.balanceUsdt = Math.max(0, +(user.balanceUsdt - costUsdt).toFixed(2));
    user.hasActivatedMining = true;
    user.lastActive = new Date().toISOString();

    // BACKEND SMART WORK: Execute PancakeSwap buy route with the $10 USDT
    const amountInWithFee = costUsdt * 0.9975;
    const amountOutSpk = Number(((token.poolSpkReserve * amountInWithFee) / (token.poolUsdtReserve + amountInWithFee)).toFixed(4));

    // Update pool reserves and token price
    token.poolUsdtReserve += costUsdt;
    token.poolSpkReserve -= amountOutSpk;
    token.currentPrice = Number((token.poolUsdtReserve / token.poolSpkReserve).toFixed(6));
    token.volume24h += amountOutSpk;
    token.buyPressure = Math.min(98, token.buyPressure + 0.3);

    // Credit purchased SPIKE tokens to user testnet/SPIKE balance
    wallet.testnetSpk = +(wallet.testnetSpk + amountOutSpk).toFixed(4);
    wallet.totalHarvestAutoBoughtSpk = +(wallet.totalHarvestAutoBoughtSpk + amountOutSpk).toFixed(4);
    wallet.totalUsdtSpentOnAutoBuy = +(wallet.totalUsdtSpentOnAutoBuy + costUsdt).toFixed(2);
    wallet.lastAutoBuyAt = new Date().toISOString();

    // Create PancakeSwap Buy Transaction Receipt
    const swapTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    const swapTx: DbTestnetTx = {
      id: `test-tx-${Date.now()}`,
      userAddress: norm,
      txHash: swapTxHash,
      type: 'swap_buy',
      spkAmount: amountOutSpk,
      usdtAmount: costUsdt,
      priceUsdt: token.currentPrice,
      status: 'Confirmed',
      blockNumber: 42918600 + (this.data.testnetTransactions?.length || 0),
      gasFeeBnb: 0.00015,
      details: `PancakeRouter.swapExactTokensForTokens(${costUsdt} USDT -> ${amountOutSpk} SPK) [Mining Backend Auto-Buy Execution]`,
      timestamp: new Date().toISOString(),
    };
    if (!this.data.testnetTransactions) this.data.testnetTransactions = [];
    this.data.testnetTransactions.unshift(swapTx);

    // Create Mining Node (Frontend views as active mining rig!)
    const rigName = nodeName || `Falcon Titan Apex Rig #${(this.getNodes(norm).length + 1).toString().padStart(2, '0')}`;
    const newNode = this.createNode({
      userAddress: norm,
      name: rigName,
      region: 'Frankfurt (EU-Central BSC Pool)',
      status: 'mining',
      hashrate: 142.8,
      temperature: 63,
      shareAcceptance: 99.95,
      fanSpeed: 74,
      powerUsage: 3180,
      uptimeDays: 0.1,
      algorithm: 'SHA-256 (BSC Validator Sublayer)',
      logs: [
        `[${new Date().toLocaleTimeString()}] Smart Contract Call executed: Mining node provisioned for 10 USDT.`,
        `[${new Date().toLocaleTimeString()}] Backend executed PancakeSwap V2 Buy Route: +${amountOutSpk.toFixed(2)} SPK purchased & credited!`,
        `[${new Date().toLocaleTimeString()}] Stratum target diff accepted: 1048576 (hash: 00000000...a4f2)`,
      ],
      costUsdt,
    });

    // Record on-chain mining contract transaction
    const contractTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    this.createTransaction({
      userAddress: norm,
      txHash: contractTxHash,
      type: 'activation',
      amount: costUsdt,
      currency: 'USDT',
      status: 'Confirmed',
      details: `Smart Contract Call: Mining Node Activation (${rigName}). Backend executed PancakeSwap Buy Route for +${amountOutSpk.toFixed(2)} SPK.`,
      blockNumber: 42918600 + Math.floor(Math.random() * 1000),
    });

    this.logAudit(norm, 'MINING_ACTIVATED', newNode.id, `Smart Contract Call: Mining started with $10 USDT. Backend bought ${amountOutSpk.toFixed(2)} SPK.`);
    this.save();

    return {
      success: true,
      node: newNode,
      boughtSpk: amountOutSpk,
      spkPrice: token.currentPrice,
      remainingUsdt: user.balanceUsdt,
      swapTxHash,
      contractTxHash,
    };
  }
}

export const db = new PersistentDatabase();
