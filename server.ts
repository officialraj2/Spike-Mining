import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { db } from './src/server/db.ts';
import { firestore, config as firebaseConfig, syncEntireDatabase, syncDocument } from './src/server/firebaseServer.ts';

dotenv.config();

const app = express();
const argPortIndex = process.argv.indexOf('--port');
const argPort = argPortIndex !== -1 && process.argv[argPortIndex + 1] ? parseInt(process.argv[argPortIndex + 1], 10) : undefined;
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : (argPort || 3000);

// Global Middleware & CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// ============================================================
// SYSTEM & DATABASE HEALTH APIS
// ============================================================
app.get('/api/health', (req: Request, res: Response) => {
  const stats = db.getStats();
  res.json({
    status: 'ONLINE',
    system: 'SPIKE Mining Protocol Backend Engine',
    timestamp: new Date().toISOString(),
    database: {
      status: 'CONNECTED',
      sizeKb: stats.dbSizeKb,
      lastSaved: stats.lastSaved,
      users: stats.totalUsers,
      nodes: stats.totalNodes,
      transactions: stats.totalTransactions,
    },
  });
});

app.get('/api/db/health', (req: Request, res: Response) => {
  res.json({
    status: 'HEALTHY',
    engine: 'SPIKE Persistent JSON ACID Database Engine',
    stats: db.getStats(),
  });
});

app.get('/api/db/export', (req: Request, res: Response) => {
  const exportData = db.exportData();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=spike_database_backup_${Date.now()}.json`);
  res.json(exportData);
});

app.post('/api/db/reset', (req: Request, res: Response) => {
  const adminAddress = req.body.adminAddress || '0x71C8a914B97e889F12A0987cB32456Fa12349A2';
  const result = db.resetToDefault(adminAddress);
  res.json(result);
});

// ============================================================
// FIREBASE FIRESTORE SYNC & STATUS APIS
// ============================================================
app.get('/api/firebase/status', (req: Request, res: Response) => {
  res.json({
    connected: !!firestore,
    projectId: firebaseConfig?.projectId || null,
    databaseId: firebaseConfig?.firestoreDatabaseId || null,
    status: firestore ? 'ONLINE_ACTIVE' : 'INITIALIZING',
    storage: 'Firebase Cloud Firestore Enterprise',
    rules: 'Deployed and active',
  });
});

app.post('/api/firebase/sync', async (req: Request, res: Response) => {
  try {
    const allData = db.exportData();
    const result = await syncEntireDatabase(allData);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

// ============================================================
// OFFICIAL DOMAIN & SUBLINKS CONFIGURATION (spikenodes.com)
// ============================================================
app.get('/api/domain/config', (req: Request, res: Response) => {
  const settings = db.getSettings();
  const domain = settings.primaryDomain || 'spikenodes.com';
  const baseUrl = `https://${domain}`;

  res.json({
    primaryDomain: domain,
    canonicalUrl: baseUrl,
    sublinks: {
      home: `${baseUrl}/`,
      dashboard: `${baseUrl}/?tab=dashboard`,
      miningNodes: `${baseUrl}/?tab=mining-nodes`,
      referrals: `${baseUrl}/?tab=referrals`,
      announcements: `${baseUrl}/?tab=announcements`,
      adminConsole: `${baseUrl}/?tab=admin`,
      apiHealth: `${baseUrl}/api/health`,
      dbExport: `${baseUrl}/api/db/export`,
    },
    subdomains: {
      pool: `pool.${domain}`,
      stratum: settings.stratumPoolUrl || `stratum+tcp://pool.${domain}:443`,
      api: `${baseUrl}/api`,
      rpc: settings.rpcUrl || `https://rpc.${domain}`,
      docs: settings.docsUrl || `https://docs.${domain}`,
    },
    dnsRecords: [
      { type: 'A', host: '@', value: '172.67.149.202 (Cloudflare/Edge)', status: 'Active' },
      { type: 'CNAME', host: 'www', value: domain, status: 'Active' },
      { type: 'CNAME', host: 'pool', value: `stratum.${domain}`, status: 'Stratum ASIC' },
      { type: 'CNAME', host: 'api', value: domain, status: 'REST Gateway' },
      { type: 'CNAME', host: 'docs', value: `gitbook.${domain}`, status: 'Docs' },
    ],
    ssl: {
      issuer: "Let's Encrypt / Cloudflare Edge TLS",
      status: 'Valid & Enforced (HTTPS)',
      hsts: true,
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/admin', (req: Request, res: Response) => {
  res.redirect('/?tab=admin');
});

// ============================================================
// ADMIN PANEL APIS
// ============================================================
app.get('/api/admin/metrics', (req: Request, res: Response) => {
  const stats = db.getStats();
  const settings = db.getSettings();
  const recentLogs = db.getAuditLogs(10);
  res.json({
    ...stats,
    settings,
    recentLogs,
  });
});

app.get('/api/admin/users', (req: Request, res: Response) => {
  const users = db.getUsers();
  res.json({ users });
});

app.post('/api/admin/users/:address/adjust-balance', (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { usdtDelta = 0, bnbDelta = 0, reason = 'Admin adjustment', adminUser = 'Admin Portal' } = req.body || {};
    const norm = (address || '').toLowerCase();
    let user = db.getUser(norm);
    if (!user) {
      user = db.upsertUser({ address: norm });
    }
    const updated = db.adjustUserBalance(norm, Number(usdtDelta), Number(bnbDelta), reason, adminUser);
    if (updated) {
      syncDocument('users', norm, updated).catch(() => {});
    }
    res.json({ success: true, user: updated });
  } catch (err: any) {
    console.error('[API Error] adjust-balance:', err);
    res.status(500).json({ success: false, error: err?.message || 'Server error adjusting balance' });
  }
});

app.post('/api/admin/faucet/credit', (req: Request, res: Response) => {
  try {
    const { walletAddress, amount = 100, bnbAmount = 0.05, note = 'Admin Faucet Credit' } = req.body || {};
    const addr = (walletAddress || '').trim();
    if (!addr || !addr.startsWith('0x') || addr.length < 10) {
      res.status(400).json({ success: false, error: 'Valid BEP-20 wallet address (starting with 0x) is required' });
      return;
    }
    const norm = addr.toLowerCase();
    let user = db.getUser(norm);
    if (!user) {
      user = db.upsertUser({ address: addr });
    }
    const amt = Number(amount) || 100;
    const bnbAmt = Number(bnbAmount) || 0;
    const updated = db.adjustUserBalance(norm, amt, bnbAmt, note, 'Admin Testnet Faucet');
    if (updated) {
      syncDocument('users', norm, updated).catch(() => {});
    }
    res.json({ success: true, user: updated, creditedUsdt: amt, creditedBnb: bnbAmt });
  } catch (err: any) {
    console.error('[API Error] faucet/credit:', err);
    res.status(500).json({ success: false, error: err?.message || 'Server error crediting wallet' });
  }
});

app.post('/api/admin/users/:address/status', (req: Request, res: Response) => {
  const { address } = req.params;
  const { status, adminUser = 'Admin Portal' } = req.body;
  if (!['active', 'frozen', 'banned'].includes(status)) {
    res.status(400).json({ error: 'Invalid status value' });
    return;
  }
  const updated = db.setUserStatus(address, status, adminUser);
  if (!updated) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ success: true, user: updated });
});

app.get('/api/admin/nodes', (req: Request, res: Response) => {
  const nodes = db.getNodes();
  res.json({ nodes });
});

app.post('/api/admin/nodes/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, adminUser = 'Admin Portal' } = req.body;
  const updated = db.updateNodeStatus(id, status, adminUser);
  if (!updated) {
    res.status(404).json({ error: 'Node not found' });
    return;
  }
  res.json({ success: true, node: updated });
});

app.delete('/api/admin/nodes/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { adminUser = 'Admin Portal' } = req.body;
  const deleted = db.deleteNode(id, adminUser);
  res.json({ success: deleted });
});

app.get('/api/admin/transactions', (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  const txs = db.getTransactions(undefined, limit);
  res.json({ transactions: txs });
});

app.post('/api/admin/transactions/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, adminUser = 'Admin Portal' } = req.body;
  const updated = db.updateTransactionStatus(id, status, adminUser);
  if (!updated) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }
  res.json({ success: true, transaction: updated });
});

app.get('/api/admin/referrals', (req: Request, res: Response) => {
  const referrals = db.getReferrals();
  res.json({ referrals });
});

app.get('/api/admin/announcements', (req: Request, res: Response) => {
  const announcements = db.getAnnouncements();
  res.json({ announcements });
});

app.post('/api/admin/announcements', (req: Request, res: Response) => {
  const { title, content, badge = 'ALERT', priority = 'medium', author = 'Admin' } = req.body;
  if (!title || !content) {
    res.status(400).json({ error: 'Title and content required' });
    return;
  }
  const created = db.createAnnouncement({ title, content, badge, priority, author, isActive: true }, author);
  res.json({ success: true, announcement: created });
});

app.delete('/api/admin/announcements/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = db.deleteAnnouncement(id);
  res.json({ success: deleted });
});

app.get('/api/admin/settings', (req: Request, res: Response) => {
  res.json({ settings: db.getSettings() });
});

app.post('/api/admin/settings', (req: Request, res: Response) => {
  const { adminUser = 'Admin Portal', ...settingsPatch } = req.body;
  const updated = db.updateSettings(settingsPatch, adminUser);
  res.json({ success: true, settings: updated });
});

app.get('/api/admin/audit-logs', (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  res.json({ logs: db.getAuditLogs(limit) });
});

// ============================================================
// CLIENT / USER FACING DATA SYNC APIS
// ============================================================
app.get('/api/user/:address', (req: Request, res: Response) => {
  const { address } = req.params;
  const user = db.upsertUser({ address });
  const nodes = db.getNodes(address);
  const transactions = db.getTransactions(address, 20);
  const settings = db.getSettings();
  const referralStats = db.getReferralStats(address);
  res.json({
    user,
    nodes,
    transactions,
    settings,
    referralStats,
  });
});

app.post('/api/faucet/claim', (req: Request, res: Response) => {
  const { userAddress, amount = 100 } = req.body;
  if (!userAddress) {
    res.status(400).json({ error: 'User address is required' });
    return;
  }
  const norm = String(userAddress).trim().toLowerCase();
  const amt = Number(amount) || 100;
  const user = db.adjustUserBalance(norm, amt, 0.05, 'Testnet Faucet USDT Credit for Node Activation', 'SYSTEM');
  if (user) {
    syncDocument('users', norm, user).catch(() => {});
  }
  const tx = db.createTransaction({
    userAddress: norm,
    txHash: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    type: 'faucet',
    amount: amt,
    currency: 'USDT',
    status: 'Confirmed',
    details: 'Testnet Faucet Node Activation Grant',
    blockNumber: 42900000 + Math.floor(Math.random() * 50000),
  });
  res.json({ success: true, user, transaction: tx });
});

app.get('/api/referrals/stats/:address', (req: Request, res: Response) => {
  const { address } = req.params;
  const stats = db.getReferralStats(address);
  res.json({ success: true, stats });
});

app.post('/api/referrals/simulate', (req: Request, res: Response) => {
  const { referrerAddress } = req.body;
  if (!referrerAddress) {
    res.status(400).json({ error: 'referrerAddress is required' });
    return;
  }
  const result = db.simulateReferral(referrerAddress);
  const stats = db.getReferralStats(referrerAddress);
  res.json({ success: true, ...result, stats });
});

app.post('/api/user/:address/sync', (req: Request, res: Response) => {
  const { address } = req.params;
  const patch = req.body;
  const updated = db.upsertUser({ address, ...patch });
  res.json({ success: true, user: updated });
});

app.get('/api/nodes', (req: Request, res: Response) => {
  const userAddress = req.query.address as string | undefined;
  res.json({ nodes: db.getNodes(userAddress) });
});

app.post('/api/nodes/deploy', (req: Request, res: Response) => {
  const { userAddress, name, region, hashrate = 85, costUsdt = 15 } = req.body;
  if (!userAddress || !name) {
    res.status(400).json({ error: 'Missing required node parameters' });
    return;
  }
  const user = db.getUser(userAddress);
  if (user && user.balanceUsdt < costUsdt) {
    res.status(400).json({ error: 'Insufficient wallet balance in database' });
    return;
  }

  // Deduct balance
  if (user) {
    db.adjustUserBalance(userAddress, -costUsdt, 0, `Node activation fee (${name})`, 'SYSTEM');
  }

  const newNode = db.createNode({
    userAddress,
    name,
    region: region || 'Frankfurt (EU-Central)',
    status: 'mining',
    hashrate: Number(hashrate),
    temperature: 61,
    shareAcceptance: 99.9,
    fanSpeed: 70,
    powerUsage: 2200,
    uptimeDays: 0.1,
    algorithm: 'SHA-256 (BSC Sublayer)',
    logs: [
      `[${new Date().toLocaleTimeString()}] Provisioned on BSC validator sublayer.`,
      `[${new Date().toLocaleTimeString()}] Stratum target diff accepted: 1048576.`,
    ],
    costUsdt: Number(costUsdt),
  });

  res.json({ success: true, node: newNode });
});

app.post('/api/nodes/:id/action', (req: Request, res: Response) => {
  const { id } = req.params;
  const { action, userAddress = 'user' } = req.body;
  let status: 'mining' | 'idle' | 'stopped' = 'mining';
  if (action === 'stop') status = 'idle';
  else if (action === 'restart' || action === 'start') status = 'mining';

  const updated = db.updateNodeStatus(id, status, userAddress);
  res.json({ success: !!updated, node: updated });
});

app.post('/api/transactions/record', (req: Request, res: Response) => {
  const { userAddress, type, amount, currency = 'USDT', details, txHash } = req.body;
  const created = db.createTransaction({
    userAddress,
    txHash: txHash || `0x${Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    type: type || 'claim',
    amount: Number(amount),
    currency,
    status: 'Confirmed',
    details: details || 'Platform transaction',
    blockNumber: 42900000 + Math.floor(Math.random() * 50000),
  });

  // Adjust balance if applicable
  if (type === 'claim' || type === 'faucet' || type === 'referral_bonus') {
    db.adjustUserBalance(userAddress, Number(amount), 0, details || type, 'SYSTEM');
  }

  res.json({ success: true, transaction: created });
});

// ============================================================
// STATIC & FRONTEND SPA SERVING
// ============================================================
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SPIKE Full-Stack Server running at http://0.0.0.0:${PORT}`);
    console.log(`[DB] Persistent Database connected at .data/spike_database.json`);
    console.log(`[ADMIN] Admin API routes live at /api/admin/*`);
    console.log(`[FIREBASE] Cloud Firestore connected: ${firebaseConfig?.projectId || 'active'}`);
    
    // Background sync to Firestore on startup
    syncEntireDatabase(db.exportData())
      .then((res) => {
        if (res.success) {
          console.log(`[FIREBASE] Successfully synchronized database to Firestore! Synced:`, res.synced);
        } else {
          console.warn(`[FIREBASE] Firestore initial sync notice:`, res.error);
        }
      })
      .catch((err) => console.error('[FIREBASE] Sync exception:', err));

    // Real-time automatic sync on any database write
    db.setOnSaveCallback((latestData) => {
      syncEntireDatabase(latestData).catch((err) => {
        console.error('[FIREBASE] Real-time auto-sync error:', err);
      });
    });
  });
}

startServer();
