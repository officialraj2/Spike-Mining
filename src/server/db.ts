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
  type: 'activation' | 'claim' | 'swap' | 'referral_bonus' | 'faucet' | 'admin_adjustment';
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
      notes: 'Tier 1 Referral partner',
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
      details: 'Tier-1 Direct Referral Hash Commission (10%)',
      blockNumber: 42918491,
    },
  ],
  referrals: [
    {
      id: 'ref-1',
      referrerAddress: '0x71C8a914B97e889F12A0987cB32456Fa12349A2',
      refereeAddress: '0x38F2B78d9b8A6c0d87AeE9e6Fa2c5D551a89E239',
      tier: 1,
      commissionUsdt: 64.02,
      volumeUsdt: 640.2,
      createdAt: '2025-02-10T12:30:00.000Z',
    },
    {
      id: 'ref-2',
      referrerAddress: '0x71C8a914B97e889F12A0987cB32456Fa12349A2',
      refereeAddress: '0x992B1048b6cF8F7d402E8eE755497B1A0a42Ce08',
      tier: 1,
      commissionUsdt: 32.0,
      volumeUsdt: 320.0,
      createdAt: '2025-02-28T16:15:00.000Z',
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
          return {
            ...INITIAL_DATA,
            ...parsed,
            settings: loadedSettings,
          };
        }
      }
    } catch (err) {
      console.error('[DB] Error loading database file, checking backup:', err);
      try {
        if (fs.existsSync(BACKUP_FILE)) {
          const raw = fs.readFileSync(BACKUP_FILE, 'utf-8');
          return JSON.parse(raw);
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
      (r) => r.referrerAddress.toLowerCase() === norm && r.tier === 1
    );
    const downlines = this.data.referrals.filter(
      (r) => r.referrerAddress.toLowerCase() === norm && r.tier === 2
    );
    const totalCommissions = directs.reduce((sum, r) => sum + (r.commissionUsdt || 0), 0) +
      downlines.reduce((sum, r) => sum + (r.commissionUsdt || 0), 0);

    return {
      directPartners: directs.length,
      downlinePartners: downlines.length,
      totalPartners: directs.length + downlines.length,
      totalCommissions: +totalCommissions.toFixed(2),
      referrals: [...directs, ...downlines],
    };
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
    const commission = 15.0; // 10% on Starter/Standard activation

    const newRef = this.createReferral({
      referrerAddress,
      refereeAddress: referee,
      tier: 1,
      commissionUsdt: commission,
      volumeUsdt: 150.0,
    });

    // Credit referrer wallet with commission
    this.adjustUserBalance(referrerAddress, commission, 0, `Direct referral hash commission from ${referee.slice(0, 6)}...${referee.slice(-4)}`, 'SYSTEM');

    return { referral: newRef, commissionAdded: commission };
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
}

export const db = new PersistentDatabase();
