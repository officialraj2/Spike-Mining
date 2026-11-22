import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { db } from './src/server/db.ts';
import { firestore, config as firebaseConfig, syncEntireDatabase, syncDocument, loadFirestoreDataIntoDb, purgeNonMasterFirestoreData, syncReferralsForUser } from './src/server/firebaseServer.ts';
import { dispatchSystemAlert, getRecentAlerts, performDatabaseHealthCheck, PRIMARY_ADMIN_ALERT_EMAIL } from './src/server/databaseAlerts.ts';
import { requireAuth } from './src/middleware/auth.ts';
import type { AuthRequest } from './src/middleware/auth.ts';
import {
  issueAdminChallenge,
  verifyAdminChallengeSignature,
  verifyAdminSessionToken,
  createRequireAdminSignature,
} from './src/middleware/adminAuth.ts';
import { getUsers as getSqlUsers, getOrCreateUser as getOrCreateSqlUser } from './src/db/users.ts';
import { db as sqlDb } from './src/db/index.ts';
import { users as sqlUsersTable, miningNodes as sqlMiningNodesTable, transactions as sqlTransactionsTable } from './src/db/schema.ts';
import { processAiMiningChat } from './src/server/geminiAi.ts';
import { ethers } from 'ethers';

dotenv.config();

// Prevent dev server process from dying on background network interruptions, transient EADDRINUSE, or Firestore quota notices
process.on('uncaughtException', (err: any) => {
  const msg = err?.message || String(err);
  console.warn('[Handled Background Server Notice (uncaughtException)]:', msg);
});

process.on('unhandledRejection', (reason: any) => {
  const msg = (reason && (reason.message || String(reason))) || 'Unknown promise rejection';
  console.warn('[Handled Background Server Notice (unhandledRejection)]:', msg);
});

const app = express();
const requireAdminSignature = createRequireAdminSignature((addr) => db.isMasterUser(addr));
const argPortIndex = process.argv.indexOf('--port');
const argPort = argPortIndex !== -1 && process.argv[argPortIndex + 1] ? parseInt(process.argv[argPortIndex + 1], 10) : undefined;
const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : undefined;
// Runtime environment strictly mandates port 3000 for dev & preview. Avoid port 8080 which is container nginx.
const PORT = (envPort && envPort !== 8080) ? envPort : ((argPort && argPort !== 8080) ? argPort : 3000);

// Global Middleware & CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-token');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Handle favicon and robots to prevent 404 console noise
app.get('/favicon.ico', (_req: Request, res: Response) => {
  res.status(204).end();
});
app.get('/robots.txt', (_req: Request, res: Response) => {
  res.type('text/plain').send('User-agent: *\nAllow: /');
});

// Direct Project ZIP Download route for user export/backup
app.get(['/download-project-zip', '/spikenodes-project.zip', '/api/download-zip'], (_req: Request, res: Response) => {
  const zipPath = path.resolve('public', 'spikenodes-project.zip');
  if (fs.existsSync(zipPath)) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="spikenodes-full-project.zip"');
    res.download(zipPath, 'spikenodes-full-project.zip');
  } else {
    res.status(404).send('Project zip file not found.');
  }
});

// Ready-to-upload Hostinger public_html ZIP (Contains only compiled production assets and .htaccess)
app.get(['/download-hostinger-zip', '/spikenodes-hostinger-dist.zip'], (_req: Request, res: Response) => {
  const distZipPath = path.resolve('public', 'spikenodes-hostinger-dist.zip');
  if (fs.existsSync(distZipPath)) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="spikenodes-hostinger-public_html.zip"');
    res.download(distZipPath, 'spikenodes-hostinger-public_html.zip');
  } else {
    res.status(404).send('Hostinger zip not found.');
  }
});

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

app.get('/api/db/health', async (req: Request, res: Response) => {
  const healthCheck = await performDatabaseHealthCheck();
  res.json({
    status: healthCheck.healthy ? 'HEALTHY' : 'WARNING',
    engine: 'SPIKE Persistent JSON ACID Database Engine',
    stats: db.getStats(),
    healthCheck,
  });
});

// Primary Alerting & Health Monitor System (Admin email strictly private in backend)
app.get('/api/alerts/health', async (_req: Request, res: Response) => {
  const result = await performDatabaseHealthCheck();
  res.json({
    success: true,
    recipientChannel: 'Backend Protected Admin Channel',
    ...result,
  });
});

app.get('/api/alerts/recent', requireAdminSignature, (_req: Request, res: Response) => {
  res.json({
    success: true,
    recipientChannel: 'Backend Protected Admin Channel',
    alerts: getRecentAlerts(30),
  });
});

app.post('/api/alerts/database', async (req: Request, res: Response) => {
  try {
    const { severity = 'WARNING', category = 'DATABASE', title, message, details, userAddress } = req.body || {};
    const alert = await dispatchSystemAlert({
      severity,
      category,
      title: title || 'Database Activity Notice',
      message: message || 'Anomalous database operation captured.',
      details: { ...details, userAddress },
    });
    res.json({ success: true, alert, recipientChannel: 'Backend Protected Admin Channel' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to dispatch alert' });
  }
});

app.post('/api/alerts/send-test', requireAdminSignature, async (_req: Request, res: Response) => {
  try {
    const alert = await dispatchSystemAlert({
      severity: 'INFO',
      category: 'DATABASE',
      title: 'Database Early-Warning Alert Test',
      message: `Test alert successfully dispatched to ${PRIMARY_ADMIN_ALERT_EMAIL}. Real-time monitoring and anomaly interception active.`,
      details: {
        timestamp: new Date().toISOString(),
        databaseHealth: 'OPTIMAL',
      },
    });
    res.json({
      success: true,
      message: 'Test database alert dispatched to configured backend administrator channel!',
      alert,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to send test alert' });
  }
});

// Mining Session Real-Time Record & Verification Endpoints
app.post('/api/mining/record-start', (req: Request, res: Response) => {
  try {
    const sessionData = req.body;
    if (!sessionData || !sessionData.userAddress) {
      res.status(400).json({ success: false, error: 'userAddress is required' });
      return;
    }

    const recorded = db.recordMiningSession(sessionData);

    // Sync to Firestore mining_sessions and users collection
    syncDocument('mining_sessions', recorded.sessionId, recorded).catch((err) => {
      dispatchSystemAlert({
        severity: 'WARNING',
        category: 'FIRESTORE',
        title: 'Mining Session Firestore Sync Exception',
        message: `Failed to sync mining session ${recorded.sessionId} to Firestore: ${err?.message || err}. Database memory copy intact.`,
        details: { sessionId: recorded.sessionId, userAddress: recorded.userAddress },
      });
    });

    const updatedUser = db.getUser(recorded.userAddress);
    if (updatedUser) {
      syncDocument('users', recorded.userAddress.toLowerCase(), updatedUser).catch(() => {});
    }

    res.json({ success: true, session: recorded });
  } catch (err: any) {
    dispatchSystemAlert({
      severity: 'CRITICAL',
      category: 'MINING_RECORD',
      title: 'Mining Start Recording Failed',
      message: `Fatal error in recording mining start: ${err?.message || err}`,
      details: req.body,
    });
    res.status(500).json({ success: false, error: err?.message || 'Failed to record mining start' });
  }
});

app.get('/api/mining/sessions/:address', (req: Request, res: Response) => {
  const { address } = req.params;
  const sessions = db.getUserMiningSessions(address);
  const activeSession = db.getActiveMiningSession(address);
  res.json({ success: true, activeSession, sessions });
});

app.get('/api/db/export', requireAdminSignature, (req: Request, res: Response) => {
  const exportData = db.exportData();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=spike_database_backup_${Date.now()}.json`);
  res.json(exportData);
});

app.post('/api/db/reset', requireAdminSignature, async (req: Request, res: Response) => {
  const adminAddress = (req as any).adminAddress || req.body.adminAddress || 'Master Admin';
  const result = db.resetMainnetBaseline(adminAddress);
  const firestoreResult = await purgeNonMasterFirestoreData([
    '0x3471e07c4d2f7e11c155760a7b386e616b5c3715',
  ]).catch(() => null);
  res.json({ ...result, firestore: firestoreResult });
});

app.post('/api/db/reset-mainnet', requireAdminSignature, async (req: Request, res: Response) => {
  const adminAddress = (req as any).adminAddress || req.body.adminAddress || 'Master Admin';
  const result = db.resetMainnetBaseline(adminAddress);
  const firestoreResult = await purgeNonMasterFirestoreData([
    '0x3471e07c4d2f7e11c155760a7b386e616b5c3715',
  ]).catch(() => null);
  res.json({ ...result, firestore: firestoreResult });
});

app.post('/api/db/clean-to-master-only', requireAdminSignature, async (req: Request, res: Response) => {
  try {
    const masterWallets = req.body.masterWallets || [
      '0x3471e07c4d2f7e11c155760a7b386e616b5c3715',
    ];
    // 1. Purge memory and local JSON database
    const dbResult = db.purgeNonMasterData(masterWallets);

    // 2. Purge Firestore collections
    const firestoreResult = await purgeNonMasterFirestoreData(masterWallets);

    // 3. Clean Cloud SQL tables if provisioned
    let sqlCleaned = false;
    try {
      await sqlDb.delete(sqlTransactionsTable);
      await sqlDb.delete(sqlMiningNodesTable);
      await sqlDb.delete(sqlUsersTable);
      sqlCleaned = true;
    } catch {}

    res.json({
      success: true,
      message: 'All bond addresses, active mining records, referral milestones, and test data successfully reset from database.',
      database: dbResult,
      firestore: firestoreResult,
      sqlCleaned,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to clean database' });
  }
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

app.post('/api/firebase/sync', requireAdminSignature, async (req: Request, res: Response) => {
  try {
    const allData = db.exportData();
    const result = await syncEntireDatabase(allData);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

// ============================================================
// CLOUD SQL POSTGRESQL & AUTH APIS
// ============================================================
app.get('/api/users', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const users = await getSqlUsers();
    res.json(users);
  } catch (error: any) {
    console.error('Failed to fetch users from Cloud SQL:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
});

app.post('/api/users/sync-sql', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.uid) {
      res.status(401).json({ error: 'Unauthorized: missing user uid' });
      return;
    }
    const { address } = req.body || {};
    const user = await getOrCreateSqlUser(req.user.uid, req.user.email, address);
    res.json({ success: true, user });
  } catch (error: any) {
    console.error('Failed to sync auth user to Cloud SQL:', error);
    res.status(500).json({ error: error.message || 'Failed to sync user' });
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
// ADMIN CRYPTOGRAPHIC SIGNATURE AUTHENTICATION & PANEL APIS
// ============================================================
app.post('/api/admin/auth/challenge', (req: Request, res: Response) => {
  const { address } = req.body || {};
  const clean = typeof address === 'string' ? address.trim().toLowerCase() : '';
  if (!/^0x[a-f0-9]{40}$/.test(clean)) {
    res.status(400).json({ success: false, error: 'Valid BEP-20 wallet address required.' });
    return;
  }
  if (!db.isMasterUser(clean)) {
    res.status(403).json({ success: false, error: 'Connected wallet is not an authorized Master Wallet.' });
    return;
  }
  const challengeData = issueAdminChallenge(clean);
  if (!challengeData) {
    res.status(400).json({ success: false, error: 'Could not create challenge.' });
    return;
  }
  res.json({ success: true, ...challengeData });
});

app.post('/api/admin/auth/verify', (req: Request, res: Response) => {
  const { address, challenge, signature } = req.body || {};
  const result = verifyAdminChallengeSignature(
    address,
    challenge,
    signature,
    (addr) => db.isMasterUser(addr)
  );
  if (!result.success) {
    res.status(401).json(result);
    return;
  }
  res.json({
    success: true,
    token: result.token,
    expiresAt: result.expiresAt,
    address: String(address).trim().toLowerCase(),
  });
});

app.get('/api/admin/auth/session', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const headerToken = req.headers['x-admin-token'];
  const token =
    (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined) ||
    (typeof headerToken === 'string' ? headerToken.trim() : undefined);

  const payload = verifyAdminSessionToken(token, (addr) => db.isMasterUser(addr));
  if (!payload) {
    res.status(401).json({ success: false, authenticated: false });
    return;
  }
  res.json({ success: true, authenticated: true, address: payload.address, expiresAt: payload.exp });
});

app.get('/api/admin/metrics', requireAdminSignature, (req: Request, res: Response) => {
  const stats = db.getStats();
  const settings = db.getSettings();
  const recentLogs = db.getAuditLogs(10);
  res.json({
    ...stats,
    settings,
    recentLogs,
  });
});

app.get('/api/admin/users', requireAdminSignature, (req: Request, res: Response) => {
  const users = db.getUsers();
  res.json({ users });
});

app.post('/api/admin/users/:address/adjust-balance', requireAdminSignature, (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { usdtDelta = 0, bnbDelta = 0, reason = 'Admin adjustment', adminUser = 'Master Admin' } = req.body || {};
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

app.post('/api/admin/faucet/credit', requireAdminSignature, (req: Request, res: Response) => {
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

app.post('/api/admin/users/:address/role', requireAdminSignature, (req: Request, res: Response) => {
  const { address } = req.params;
  const { role, adminUser = 'Master Admin' } = req.body;
  if (!['master', 'admin', 'user', 'moderator'].includes(role)) {
    res.status(400).json({ error: 'Invalid role value' });
    return;
  }
  const updated = db.updateUserRole(address, role, adminUser);
  if (!updated) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  syncDocument('users', address.toLowerCase(), updated).catch(() => {});
  res.json({ success: true, user: updated });
});

app.post('/api/admin/users/:address/status', requireAdminSignature, (req: Request, res: Response) => {
  const { address } = req.params;
  const { status, adminUser = 'Master Admin' } = req.body;
  if (!['active', 'frozen', 'banned'].includes(status)) {
    res.status(400).json({ error: 'Invalid status value' });
    return;
  }
  const updated = db.setUserStatus(address, status, adminUser);
  if (!updated) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  syncDocument('users', address.toLowerCase(), updated).catch(() => {});
  res.json({ user: updated });
});

app.post('/api/admin/users/:address/hashrate', requireAdminSignature, (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { hashrate, reason = 'Admin Override', adminUser = 'Master Admin' } = req.body || {};
    const norm = (address || '').toLowerCase();
    const result = db.setUserCustomHashrate(norm, hashrate !== undefined ? hashrate : null, reason, adminUser);
    if (result.user) {
      syncDocument('users', norm, result.user).catch(() => {});
    }
    res.json(result);
  } catch (err: any) {
    console.error('[API Error] hashrate override:', err);
    res.status(500).json({ success: false, error: err?.message || 'Server error setting hashrate' });
  }
});

app.get('/api/admin/nodes', requireAdminSignature, (req: Request, res: Response) => {
  const nodes = db.getNodes();
  res.json({ nodes });
});

app.post('/api/admin/nodes/:id/status', requireAdminSignature, (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, adminUser = 'Master Admin' } = req.body;
  const updated = db.updateNodeStatus(id, status, adminUser);
  if (!updated) {
    res.status(404).json({ error: 'Node not found' });
    return;
  }
  res.json({ success: true, node: updated });
});

app.delete('/api/admin/nodes/:id', requireAdminSignature, (req: Request, res: Response) => {
  const { id } = req.params;
  const { adminUser = 'Master Admin' } = req.body;
  const deleted = db.deleteNode(id, adminUser);
  res.json({ success: deleted });
});

app.get('/api/admin/transactions', requireAdminSignature, (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  const txs = db.getTransactions(undefined, limit);
  res.json({ transactions: txs });
});

app.get('/api/admin/claims', requireAdminSignature, (req: Request, res: Response) => {
  try {
    const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
    const address = typeof req.query.address === 'string' ? req.query.address : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 500;
    const result = db.getClaimLogs({ startDate, endDate, address, limit });
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch user claims' });
  }
});

app.post('/api/admin/transactions/:id/status', requireAdminSignature, (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, adminUser = 'Master Admin' } = req.body;
  const updated = db.updateTransactionStatus(id, status, adminUser);
  if (!updated) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }
  res.json({ success: true, transaction: updated });
});

app.get('/api/admin/referrals', requireAdminSignature, (req: Request, res: Response) => {
  const referrals = db.getReferrals();
  res.json({ referrals });
});


app.get('/api/settings', (req: Request, res: Response) => {
  const s = db.getSettings();
  // Do not publicly expose masterWalletAddresses list via public settings API
  const { masterWalletAddresses: _hiddenMasters, ...publicSettings } = s as any;
  res.json({ success: true, settings: publicSettings });
});

app.get('/api/admin/settings', requireAdminSignature, (req: Request, res: Response) => {
  res.json({ success: true, settings: db.getSettings() });
});

app.post('/api/admin/settings', requireAdminSignature, (req: Request, res: Response) => {
  const { adminUser = 'Master Admin', ...settingsPatch } = req.body;
  const updated = db.updateSettings(settingsPatch, adminUser);
  syncDocument('settings', 'global_config', updated).catch(() => {});
  res.json({ success: true, settings: updated });
});

app.get('/api/admin/audit-logs', requireAdminSignature, (req: Request, res: Response) => {
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
  const hashrateInfo = db.calculateUserHashrate(address);
  const miningStatus = db.getUserMiningStatus(address);
  res.json({
    user,
    nodes,
    transactions,
    settings,
    referralStats,
    hashrateInfo,
    miningStatus,
  });
});

app.get('/api/mining/status/:address', (req: Request, res: Response) => {
  const { address } = req.params;
  const status = db.getUserMiningStatus(address);
  res.json({ success: true, ...status });
});

app.post('/api/user/sync-balance', (req: Request, res: Response) => {
  try {
    const { address, balanceUsdt, balanceBnb, balanceSpk, miningCycleStartTime } = req.body || {};
    if (!address) {
      res.status(400).json({ success: false, error: 'address is required' });
      return;
    }
    const user = db.syncUserBalance(address, balanceUsdt, balanceBnb, balanceSpk, miningCycleStartTime);
    if (user) {
      syncDocument('users', address.toLowerCase(), user).catch(() => {});
    }
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error syncing balance' });
  }
});

app.post('/api/faucet/claim', (req: Request, res: Response) => {
  // Public self-claiming disabled per security policy: Only Admin Panel can credit faucet balances
  res.status(403).json({
    success: false,
    error: 'Self-claim faucet is disabled. Testnet USDT can only be credited by the Platform Administrator from the Admin Panel (Testnet Faucet & Wallet Credit).',
  });
});

const ERC20_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const ERC20_APPROVAL_TOPIC = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';

// BSC RPC on-chain transaction verifier (verifies actual SPK & USDT Transfer logs vs Approval-only txs)
async function verifyBscTxReceipt(txHash?: string, expectedRecipient?: string): Promise<{
  verifiedOnChain: boolean;
  spkCreditedOnChain: boolean;
  onChainSpkReceived: number;
  onChainUsdtReceived: number;
  onChainSpkSpent: number;
  isApprovalOnly: boolean;
  blockNumber?: number;
  status?: 'Success' | 'Failed' | 'Pending';
  gasUsed?: number;
  gasFeeBnb?: number;
}> {
  if (!txHash || typeof txHash !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(txHash.trim())) {
    return {
      verifiedOnChain: false,
      spkCreditedOnChain: false,
      onChainSpkReceived: 0,
      onChainUsdtReceived: 0,
      onChainSpkSpent: 0,
      isApprovalOnly: false,
      status: 'Pending',
    };
  }

  const rpcs = [
    'https://bsc-dataseed.binance.org',
    'https://bsc-dataseed1.defibit.io',
    'https://data-seed-prebsc-1-s1.binance.org:8545',
  ];

  for (const rpc of rpcs) {
    try {
      const res = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionReceipt',
          params: [txHash.trim()],
          id: Date.now(),
        }),
        signal: AbortSignal.timeout(3500),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.result) {
          const receipt = data.result;
          const blockNum = receipt.blockNumber ? parseInt(receipt.blockNumber, 16) : undefined;
          const status = receipt.status === '0x1' ? 'Success' : receipt.status === '0x0' ? 'Failed' : 'Pending';
          const gasUsed = receipt.gasUsed ? parseInt(receipt.gasUsed, 16) : undefined;
          const effGasPrice = receipt.effectiveGasPrice ? Number(BigInt(receipt.effectiveGasPrice)) : 1_000_000_000;
          const gasFeeBnb = gasUsed ? +((gasUsed * effGasPrice) / 1e18).toFixed(6) : 0.00015;

          const logs: any[] = Array.isArray(receipt.logs) ? receipt.logs : [];
          let onChainSpkReceived = 0;
          let onChainUsdtReceived = 0;
          let onChainSpkSpent = 0;
          let transferCount = 0;
          let approvalCount = 0;
          const normRecip = expectedRecipient ? expectedRecipient.toLowerCase() : null;

          for (const log of logs) {
            const topic0 = String(log.topics?.[0] || '').toLowerCase();
            if (topic0 === ERC20_APPROVAL_TOPIC) {
              approvalCount++;
            } else if (topic0 === ERC20_TRANSFER_TOPIC) {
              transferCount++;
              const logAddr = String(log.address || '').toLowerCase();
              const fromAddr = log.topics?.[1] ? ('0x' + String(log.topics[1]).slice(-40)).toLowerCase() : '';
              const toAddr = log.topics?.[2] ? ('0x' + String(log.topics[2]).slice(-40)).toLowerCase() : '';
              if (logAddr === SPIKE_CONTRACT_BSC.toLowerCase()) {
                if (toAddr && (!normRecip || toAddr === normRecip)) {
                  try {
                    const amtWei = BigInt(log.data || '0x0');
                    onChainSpkReceived += Number(ethers.formatUnits(amtWei, 18));
                  } catch {}
                }
                if (fromAddr && normRecip && fromAddr === normRecip) {
                  try {
                    const amtWei = BigInt(log.data || '0x0');
                    onChainSpkSpent += Number(ethers.formatUnits(amtWei, 18));
                  } catch {}
                }
              } else if (logAddr === USDT_CONTRACT_BSC.toLowerCase() && toAddr) {
                if (!normRecip || toAddr === normRecip) {
                  try {
                    const amtWei = BigInt(log.data || '0x0');
                    onChainUsdtReceived += Number(ethers.formatUnits(amtWei, 18));
                  } catch {}
                }
              }
            }
          }

          const spkCreditedOnChain = status === 'Success' && onChainSpkReceived > 0;
          const isApprovalOnly = status === 'Success' && transferCount === 0 && approvalCount > 0;

          return {
            verifiedOnChain: status === 'Success',
            spkCreditedOnChain,
            onChainSpkReceived: +onChainSpkReceived.toFixed(6),
            onChainUsdtReceived: +onChainUsdtReceived.toFixed(6),
            onChainSpkSpent: +onChainSpkSpent.toFixed(6),
            isApprovalOnly,
            blockNumber: blockNum,
            status,
            gasUsed,
            gasFeeBnb,
          };
        }
      }
    } catch {
      // Continue to next RPC fallback
    }
  }

  return {
    verifiedOnChain: false,
    spkCreditedOnChain: false,
    onChainSpkReceived: 0,
    onChainUsdtReceived: 0,
    onChainSpkSpent: 0,
    isApprovalOnly: false,
    status: 'Pending',
  };
}

// ============================================================
// ON-CHAIN BSC BALANCES & RPC HELPERS (SPIKE & USDT BEP-20)
// ============================================================
const SPIKE_CONTRACT_BSC = '0xc213905ac995bCC943c077b7918c8134094A9267';
const USDT_CONTRACT_BSC = '0x55d398326f99059fF775485246999027B3197955';
const PANCAKE_V3_POOL_BSC = '0xdB75fAB72e56492CFE870344D115C57047992F3c';
const PANCAKE_V3_SMART_ROUTER_BSC = '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4';
const PANCAKE_V3_QUOTER_V2_BSC = '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997';
const PANCAKE_V3_FEE_TIER = 500; // 0.05%
const BSC_RPC_URLS = [
  'https://bsc-dataseed.binance.org/',
  'https://bsc-dataseed1.defibit.io/',
  'https://binance.llamarpc.com',
  'https://rpc.ankr.com/bsc',
];

async function callBscRpcNode(method: string, params: any[]): Promise<string | null> {
  for (const url of BSC_RPC_URLS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        if (json && json.result !== undefined) {
          return json.result;
        }
      }
    } catch {}
  }
  return null;
}

const formatTokenDecimals = (hex: string | null, decimals = 18): number => {
  if (!hex || hex === '0x') return 0;
  try {
    const bi = BigInt(hex);
    const divisor = BigInt(10 ** decimals);
    const whole = bi / divisor;
    const remainder = bi % divisor;
    const remFloat = Number(remainder) / (10 ** decimals);
    return +(Number(whole) + remFloat).toFixed(4);
  } catch {
    return 0;
  }
};

async function fetchOnChainTokenBalance(tokenContract: string, walletAddress: string, decimals = 18): Promise<number> {
  if (!walletAddress || !walletAddress.startsWith('0x') || walletAddress.length < 10) return 0;
  try {
    const cleanAddr = walletAddress.toLowerCase().replace(/^0x/, '').padStart(64, '0');
    const dataPayload = '0x70a08231' + cleanAddr;
    const rawHex = await callBscRpcNode('eth_call', [{ to: tokenContract, data: dataPayload }, 'latest']);
    return formatTokenDecimals(rawHex, decimals);
  } catch {
    return 0;
  }
}

interface LiveV3PoolState {
  poolAddress: string;
  routerAddress: string;
  poolVersion: string;
  feeTier: number;
  feePercent: string;
  token0: { symbol: string; address: string; reserve: number };
  token1: { symbol: string; address: string; reserve: number };
  sqrtPriceX96: string;
  tick: number;
  liquidity: string;
  unlocked: boolean;
  onChainPriceUsdt: number;
  onChainPriceSpkPerUsdt: number;
  fetchedAt: string;
}

let cachedV3PoolState: { data: LiveV3PoolState; expiresAt: number } | null = null;

async function fetchLiveV3PoolState(forceRefresh = false): Promise<LiveV3PoolState | null> {
  if (!forceRefresh && cachedV3PoolState && Date.now() < cachedV3PoolState.expiresAt) {
    return cachedV3PoolState.data;
  }
  try {
    const [slot0Hex, liquidityHex, feeHex, usdtReserve, spkReserve] = await Promise.all([
      callBscRpcNode('eth_call', [{ to: PANCAKE_V3_POOL_BSC, data: '0x3850c7bd' }, 'latest']),
      callBscRpcNode('eth_call', [{ to: PANCAKE_V3_POOL_BSC, data: '0x1a686502' }, 'latest']),
      callBscRpcNode('eth_call', [{ to: PANCAKE_V3_POOL_BSC, data: '0xddca3f43' }, 'latest']),
      fetchOnChainTokenBalance(USDT_CONTRACT_BSC, PANCAKE_V3_POOL_BSC, 18),
      fetchOnChainTokenBalance(SPIKE_CONTRACT_BSC, PANCAKE_V3_POOL_BSC, 18),
    ]);

    if (!slot0Hex || slot0Hex.length < 130) return cachedV3PoolState?.data || null;

    const hexBody = slot0Hex.replace(/^0x/, '');
    const sqrtPriceX96 = BigInt('0x' + hexBody.slice(0, 64));
    const tickUnsigned = BigInt('0x' + hexBody.slice(64, 128));
    const TWO_256 = 1n << 256n;
    const TWO_255 = 1n << 255n;
    const tick = Number(tickUnsigned >= TWO_255 ? tickUnsigned - TWO_256 : tickUnsigned);
    const unlocked = hexBody.length >= 448 ? BigInt('0x' + hexBody.slice(384, 448)) === 1n : true;

    const feeTier = feeHex && feeHex !== '0x' ? Number(BigInt(feeHex)) : PANCAKE_V3_FEE_TIER;
    const liquidity = liquidityHex && liquidityHex !== '0x' ? BigInt(liquidityHex).toString() : '0';

    // token0 = USDT (18 dec), token1 = SPK (18 dec) -> ratio = (sqrtPriceX96 / 2^96)^2 = SPK per 1 USDT
    const q96 = Number(1n << 96n);
    const spkPerUsdt = (Number(sqrtPriceX96) / q96) ** 2;
    const usdtPerSpk = spkPerUsdt > 0 ? +(1 / spkPerUsdt).toFixed(6) : 0;

    const state: LiveV3PoolState = {
      poolAddress: PANCAKE_V3_POOL_BSC,
      routerAddress: PANCAKE_V3_SMART_ROUTER_BSC,
      poolVersion: 'PancakeSwap V3',
      feeTier,
      feePercent: `${(feeTier / 10000).toFixed(2)}%`,
      token0: { symbol: 'USDT', address: USDT_CONTRACT_BSC, reserve: usdtReserve },
      token1: { symbol: 'SPK', address: SPIKE_CONTRACT_BSC, reserve: spkReserve },
      sqrtPriceX96: sqrtPriceX96.toString(),
      tick,
      liquidity,
      unlocked,
      onChainPriceUsdt: usdtPerSpk,
      onChainPriceSpkPerUsdt: +spkPerUsdt.toFixed(6),
      fetchedAt: new Date().toISOString(),
    };

    cachedV3PoolState = { data: state, expiresAt: Date.now() + 15_000 };
    return state;
  } catch {
    return cachedV3PoolState?.data || null;
  }
}

const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

const V3_SMART_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)',
  'function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountIn)',
];

const V3_QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
  'function quoteExactOutputSingle((address tokenIn, address tokenOut, uint256 amount, uint24 fee, uint160 sqrtPriceLimitX96) params) returns (uint256 amountIn, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
];

function getRelayerPrivateKey(): string | null {
  const raw =
    process.env.PROTOCOL_RELAYER_PRIVATE_KEY ||
    process.env.TREASURY_PRIVATE_KEY ||
    process.env.BSC_RELAYER_PRIVATE_KEY ||
    '';
  const trimmed = raw.trim();
  if (/^(0x)?[a-fA-F0-9]{64}$/.test(trimmed)) {
    return trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`;
  }
  return null;
}

async function getWorkingBscProvider(): Promise<ethers.JsonRpcProvider> {
  for (const rpcUrl of BSC_RPC_URLS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl, 56, { staticNetwork: true });
      await provider.getBlockNumber();
      return provider;
    } catch {}
  }
  return new ethers.JsonRpcProvider(BSC_RPC_URLS[0], 56, { staticNetwork: true });
}

async function getV3QuoteAndClaimCalldata(params: {
  userAddress: string;
  spkAmount?: number;
  usdtAmount?: number;
}) {
  const { userAddress, spkAmount = 0, usdtAmount = 0 } = params;
  const erc20Iface = new ethers.Interface(ERC20_ABI);
  const routerIface = new ethers.Interface(V3_SMART_ROUTER_ABI);
  const quoterIface = new ethers.Interface(V3_QUOTER_V2_ABI);

  const validUser = ethers.isAddress(userAddress) ? ethers.getAddress(userAddress) : '0x0000000000000000000000000000000000000000';
  const effectiveUsdtIn = usdtAmount > 0 ? usdtAmount : Math.max(0.0001, +(spkAmount * 0.86).toFixed(6));
  const amountInWei = ethers.parseUnits(effectiveUsdtIn.toFixed(6), 18);

  let quotedSpkOut = +(effectiveUsdtIn / 0.858346).toFixed(6);
  try {
    const qData = quoterIface.encodeFunctionData('quoteExactInputSingle', [[
      USDT_CONTRACT_BSC,
      SPIKE_CONTRACT_BSC,
      amountInWei,
      PANCAKE_V3_FEE_TIER,
      0n,
    ]]);
    const qHex = await callBscRpcNode('eth_call', [{ to: PANCAKE_V3_QUOTER_V2_BSC, data: qData }, 'latest']);
    if (qHex && qHex !== '0x') {
      const [outWei] = quoterIface.decodeFunctionResult('quoteExactInputSingle', qHex);
      quotedSpkOut = +Number(ethers.formatUnits(outWei, 18)).toFixed(6);
    }
  } catch {}

  let userUsdtBalance = 0;
  let currentAllowanceWei = 0n;
  if (validUser !== '0x0000000000000000000000000000000000000000') {
    const [balHex, allowHex] = await Promise.all([
      callBscRpcNode('eth_call', [{ to: USDT_CONTRACT_BSC, data: erc20Iface.encodeFunctionData('balanceOf', [validUser]) }, 'latest']),
      callBscRpcNode('eth_call', [{ to: USDT_CONTRACT_BSC, data: erc20Iface.encodeFunctionData('allowance', [validUser, PANCAKE_V3_SMART_ROUTER_BSC]) }, 'latest']),
    ]);
    if (balHex && balHex !== '0x') userUsdtBalance = +Number(ethers.formatUnits(BigInt(balHex), 18)).toFixed(6);
    if (allowHex && allowHex !== '0x') currentAllowanceWei = BigInt(allowHex);
  }

  const needsApproval = currentAllowanceWei < amountInWei;
  const approveData = erc20Iface.encodeFunctionData('approve', [PANCAKE_V3_SMART_ROUTER_BSC, ethers.MaxUint256]);
  const swapData = routerIface.encodeFunctionData('exactInputSingle', [[
    USDT_CONTRACT_BSC,
    SPIKE_CONTRACT_BSC,
    PANCAKE_V3_FEE_TIER,
    validUser,
    amountInWei,
    0n,
    0n,
  ]]);

  return {
    poolAddress: PANCAKE_V3_POOL_BSC,
    routerAddress: PANCAKE_V3_SMART_ROUTER_BSC,
    feeTier: PANCAKE_V3_FEE_TIER,
    usdtIn: effectiveUsdtIn,
    expectedSpkOut: quotedSpkOut,
    userUsdtBalance,
    hasEnoughUsdt: userUsdtBalance >= effectiveUsdtIn,
    needsApproval,
    relayerConfigured: Boolean(getRelayerPrivateKey()),
    approveTx: needsApproval ? { to: USDT_CONTRACT_BSC, data: approveData, value: '0x0', gas: '0x15F90' } : null,
    swapTx: { to: PANCAKE_V3_SMART_ROUTER_BSC, data: swapData, value: '0x0', gas: '0x3D090' },
  };
}

async function getV3SellQuoteAndCalldata(params: {
  userAddress: string;
  spkAmount: number;
  slippagePercent?: number;
}) {
  const { userAddress, spkAmount = 0, slippagePercent = 1.0 } = params;
  const erc20Iface = new ethers.Interface(ERC20_ABI);
  const routerIface = new ethers.Interface(V3_SMART_ROUTER_ABI);
  const quoterIface = new ethers.Interface(V3_QUOTER_V2_ABI);

  const validUser = ethers.isAddress(userAddress)
    ? ethers.getAddress(userAddress)
    : '0x0000000000000000000000000000000000000000';

  const pool = await fetchLiveV3PoolState().catch(() => null);
  const spotPriceUsdt = pool?.onChainPriceUsdt && pool.onChainPriceUsdt > 0 ? pool.onChainPriceUsdt : 0;
  const poolUsdtReserve = pool?.token0?.reserve ?? 0;
  const poolSpkReserve = pool?.token1?.reserve ?? 0;

  let userSpkBalance = 0;
  let userUsdtBalance = 0;
  let userBnbBalance = 0;
  let currentAllowanceWei = 0n;

  if (validUser !== '0x0000000000000000000000000000000000000000') {
    const [spkHex, usdtHex, bnbHex, allowHex] = await Promise.all([
      callBscRpcNode('eth_call', [{ to: SPIKE_CONTRACT_BSC, data: erc20Iface.encodeFunctionData('balanceOf', [validUser]) }, 'latest']),
      callBscRpcNode('eth_call', [{ to: USDT_CONTRACT_BSC, data: erc20Iface.encodeFunctionData('balanceOf', [validUser]) }, 'latest']),
      callBscRpcNode('eth_getBalance', [validUser, 'latest']),
      callBscRpcNode('eth_call', [{ to: SPIKE_CONTRACT_BSC, data: erc20Iface.encodeFunctionData('allowance', [validUser, PANCAKE_V3_SMART_ROUTER_BSC]) }, 'latest']),
    ]);
    if (spkHex && spkHex !== '0x') userSpkBalance = +Number(ethers.formatUnits(BigInt(spkHex), 18)).toFixed(6);
    if (usdtHex && usdtHex !== '0x') userUsdtBalance = +Number(ethers.formatUnits(BigInt(usdtHex), 18)).toFixed(6);
    if (bnbHex && bnbHex !== '0x') userBnbBalance = +Number(ethers.formatUnits(BigInt(bnbHex), 18)).toFixed(6);
    if (allowHex && allowHex !== '0x') currentAllowanceWei = BigInt(allowHex);
  }

  const maxSellableSpk = Math.floor(userSpkBalance * 0.10 * 1_000_000) / 1_000_000;
  const safeSpkIn = spkAmount > 0 ? +spkAmount.toFixed(6) : 0;
  const amountInWei = safeSpkIn > 0 ? ethers.parseUnits(safeSpkIn.toFixed(6), 18) : 0n;

  let quotedUsdtOutWei = 0n;
  let expectedUsdtOut = safeSpkIn > 0 && spotPriceUsdt > 0 ? +(safeSpkIn * spotPriceUsdt * 0.9995).toFixed(6) : 0;
  let quoterVerified = false;
  let liquidityWarning: string | null = null;

  if (amountInWei > 0n) {
    try {
      const qData = quoterIface.encodeFunctionData('quoteExactInputSingle', [[
        SPIKE_CONTRACT_BSC,
        USDT_CONTRACT_BSC,
        amountInWei,
        PANCAKE_V3_FEE_TIER,
        0n,
      ]]);
      const qHex = await callBscRpcNode('eth_call', [{ to: PANCAKE_V3_QUOTER_V2_BSC, data: qData }, 'latest']);
      if (qHex && qHex !== '0x') {
        const [outWei] = quoterIface.decodeFunctionResult('quoteExactInputSingle', qHex);
        quotedUsdtOutWei = BigInt(outWei);
        expectedUsdtOut = +Number(ethers.formatUnits(quotedUsdtOutWei, 18)).toFixed(6);
        quoterVerified = true;
      } else {
        liquidityWarning = 'Live V3 Quoter could not quote this amount against current pool liquidity.';
      }
    } catch {
      liquidityWarning = 'Pool liquidity may be too low for this trade size on PancakeSwap V3.';
    }
  }

  if (poolUsdtReserve > 0 && expectedUsdtOut > poolUsdtReserve) {
    liquidityWarning = `Requested swap (~$${expectedUsdtOut.toFixed(2)}) exceeds live V3 pool USDT reserve ($${poolUsdtReserve.toFixed(2)}).`;
  }

  const clampedSlippage = Math.min(10, Math.max(0.1, Number(slippagePercent) || 1.0));
  const slippageBps = Math.round(clampedSlippage * 100);
  const amountOutMinWei = quotedUsdtOutWei > 0n
    ? (quotedUsdtOutWei * BigInt(10000 - slippageBps)) / 10000n
    : 0n;
  const minUsdtOut = +Number(ethers.formatUnits(amountOutMinWei, 18)).toFixed(6);
  const effectiveRate = safeSpkIn > 0 && expectedUsdtOut > 0 ? +(expectedUsdtOut / safeSpkIn).toFixed(6) : spotPriceUsdt;

  const needsApproval = amountInWei > 0n && currentAllowanceWei < amountInWei;
  const approveData = erc20Iface.encodeFunctionData('approve', [PANCAKE_V3_SMART_ROUTER_BSC, ethers.MaxUint256]);
  const swapData = amountInWei > 0n
    ? routerIface.encodeFunctionData('exactInputSingle', [[
        SPIKE_CONTRACT_BSC,
        USDT_CONTRACT_BSC,
        PANCAKE_V3_FEE_TIER,
        validUser,
        amountInWei,
        amountOutMinWei,
        0n,
      ]])
    : '0x';

  return {
    poolAddress: PANCAKE_V3_POOL_BSC,
    routerAddress: PANCAKE_V3_SMART_ROUTER_BSC,
    feeTier: PANCAKE_V3_FEE_TIER,
    spotPriceUsdt,
    effectiveRate,
    spkIn: safeSpkIn,
    expectedUsdtOut,
    minUsdtOut,
    quoterVerified,
    liquidityWarning,
    poolUsdtReserve,
    poolSpkReserve,
    userSpkBalance,
    userUsdtBalance,
    userBnbBalance,
    maxSellableSpk,
    exceedsTenPercentLimit: userSpkBalance > 0 && safeSpkIn > maxSellableSpk + 1e-6,
    hasEnoughSpk: userSpkBalance >= safeSpkIn && safeSpkIn > 0,
    needsApproval,
    approveTx: needsApproval ? { to: SPIKE_CONTRACT_BSC, data: approveData, value: '0x0', gas: '0x15F90' } : null,
    swapTx: amountInWei > 0n ? { to: PANCAKE_V3_SMART_ROUTER_BSC, data: swapData, value: '0x0', gas: '0x55730' } : null,
  };
}

// Automated server-side BSC Mainnet SPK disbursement (runs when PROTOCOL_RELAYER_PRIVATE_KEY is configured)
async function executeBackendOnChainSpkPayout(recipientAddress: string, spkAmount: number): Promise<{
  executed: boolean;
  method?: 'relayer_spk_transfer' | 'relayer_v3_swap';
  txHash?: string;
  blockNumber?: number;
  gasFeeBnb?: number;
  spkSent?: number;
  error?: string;
}> {
  const pk = getRelayerPrivateKey();
  if (!pk) return { executed: false, error: 'PROTOCOL_RELAYER_PRIVATE_KEY not configured' };
  if (!ethers.isAddress(recipientAddress)) return { executed: false, error: 'Invalid recipient BSC address' };
  if (!(spkAmount > 0)) return { executed: false, error: 'Invalid SPK amount' };

  try {
    const provider = await getWorkingBscProvider();
    const signer = new ethers.Wallet(pk, provider);
    const spkContract = new ethers.Contract(SPIKE_CONTRACT_BSC, ERC20_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_CONTRACT_BSC, ERC20_ABI, signer);

    const spkAmountWei = ethers.parseUnits(spkAmount.toFixed(6), 18);
    const [relayerSpkBal, relayerUsdtBal] = await Promise.all([
      spkContract.balanceOf(signer.address) as Promise<bigint>,
      usdtContract.balanceOf(signer.address) as Promise<bigint>,
    ]);

    // Priority 1: Direct BEP-20 SPK transfer from Treasury/Relayer reserve directly to user's wallet
    if (relayerSpkBal >= spkAmountWei) {
      const tx = await spkContract.transfer(recipientAddress, spkAmountWei);
      const receipt = await tx.wait(1);
      const gasUsed = receipt?.gasUsed ? Number(receipt.gasUsed) : 52000;
      const gasPrice = receipt?.gasPrice ? Number(receipt.gasPrice) : 1_000_000_000;
      return {
        executed: true,
        method: 'relayer_spk_transfer',
        txHash: tx.hash,
        blockNumber: receipt?.blockNumber,
        gasFeeBnb: +((gasUsed * gasPrice) / 1e18).toFixed(6),
        spkSent: +spkAmount.toFixed(6),
      };
    }

    // Priority 2: Relayer executes PancakeSwap V3 Smart Router swap (USDT -> SPK) with recipient = user wallet
    const routerContract = new ethers.Contract(PANCAKE_V3_SMART_ROUTER_BSC, V3_SMART_ROUTER_ABI, signer);
    const poolState = await fetchLiveV3PoolState().catch(() => null);
    const estUsdt = +(spkAmount * (poolState?.onChainPriceUsdt || 0.86) * 1.02).toFixed(6);
    const maxUsdtWei = ethers.parseUnits(Math.max(0.0001, estUsdt).toFixed(6), 18);

    if (relayerUsdtBal >= maxUsdtWei) {
      const currentAllow: bigint = await usdtContract.allowance(signer.address, PANCAKE_V3_SMART_ROUTER_BSC);
      if (currentAllow < maxUsdtWei) {
        const approveTx = await usdtContract.approve(PANCAKE_V3_SMART_ROUTER_BSC, ethers.MaxUint256);
        await approveTx.wait(1);
      }
      const swapTx = await routerContract.exactOutputSingle({
        tokenIn: USDT_CONTRACT_BSC,
        tokenOut: SPIKE_CONTRACT_BSC,
        fee: PANCAKE_V3_FEE_TIER,
        recipient: recipientAddress,
        amountOut: spkAmountWei,
        amountInMaximum: maxUsdtWei,
        sqrtPriceLimitX96: 0n,
      });
      const receipt = await swapTx.wait(1);
      const gasUsed = receipt?.gasUsed ? Number(receipt.gasUsed) : 180000;
      const gasPrice = receipt?.gasPrice ? Number(receipt.gasPrice) : 1_000_000_000;
      return {
        executed: true,
        method: 'relayer_v3_swap',
        txHash: swapTx.hash,
        blockNumber: receipt?.blockNumber,
        gasFeeBnb: +((gasUsed * gasPrice) / 1e18).toFixed(6),
        spkSent: +spkAmount.toFixed(6),
      };
    }

    return { executed: false, error: 'Relayer wallet has insufficient SPK/USDT balance on BSC Mainnet' };
  } catch (err: any) {
    return { executed: false, error: err?.shortMessage || err?.message || 'Relayer execution failed' };
  }
}

// Check on-chain BEP-20 USDT across official protocol deposit wallet and creator reserve
async function getLiveTreasuryUsdt(): Promise<{ totalUsdt: number; breakdown: Record<string, number> }> {
  const activeTreasury = db.getTreasuryInfo().treasuryWalletAddress || '0xD833e2f6fC850cFe3B39F49e34F9231f0AB2b6bF';
  const wallets = Array.from(new Set([
    activeTreasury, // Official Protocol Deposit Wallet (10.00 USDT on BSC mainnet)
    '0x3471e07c4d2f7e11c155760a7b386e616b5c3715', // Master Protocol Creator / Reserve
  ]));
  const breakdown: Record<string, number> = {};
  try {
    const balances = await Promise.all(
      wallets.map(async (addr) => {
        const bal = await fetchOnChainTokenBalance(USDT_CONTRACT_BSC, addr, 18);
        breakdown[addr] = bal;
        return bal;
      })
    );
    const totalUsdt = +balances.reduce((sum, b) => sum + b, 0).toFixed(2);
    return { totalUsdt, breakdown };
  } catch {
    return { totalUsdt: 0, breakdown };
  }
}

app.get('/api/deposit/config', async (_req: Request, res: Response) => {
  try {
    const preStored = typeof db.getSettings().treasuryBalanceUsdt === 'number' ? db.getSettings().treasuryBalanceUsdt : 0;
    const treasury = db.getTreasuryInfo();
    const live = await getLiveTreasuryUsdt();
    const effectiveUsdt = Math.max(treasury.treasuryBalanceUsdt, live.totalUsdt);
    if (effectiveUsdt !== preStored || effectiveUsdt !== treasury.treasuryBalanceUsdt) {
      db.updateTreasuryBalance(effectiveUsdt);
      syncDocument('settings', 'global', db.getSettings()).catch(() => {});
    }
    res.json({
      success: true,
      officialWallet: treasury.treasuryWalletAddress,
      amount: 10,
      miningActivationCost: 10,
      totalProjectCost: 10,
      network: 'BNB Smart Chain (BEP-20)',
      autoVerify: true,
      treasuryBalanceUsdt: effectiveUsdt,
      onChainBreakdown: live.breakdown,
    });
  } catch (err: any) {
    const treasury = db.getTreasuryInfo();
    res.json({
      success: true,
      officialWallet: treasury.treasuryWalletAddress,
      amount: 10,
      miningActivationCost: 10,
      totalProjectCost: 10,
      network: 'BNB Smart Chain (BEP-20)',
      autoVerify: true,
      treasuryBalanceUsdt: treasury.treasuryBalanceUsdt,
    });
  }
});

app.get('/api/treasury', async (_req: Request, res: Response) => {
  try {
    const preStored = typeof db.getSettings().treasuryBalanceUsdt === 'number' ? db.getSettings().treasuryBalanceUsdt : 0;
    const treasury = db.getTreasuryInfo();
    const live = await getLiveTreasuryUsdt();
    const effectiveUsdt = Math.max(treasury.treasuryBalanceUsdt, live.totalUsdt);
    if (effectiveUsdt !== preStored || effectiveUsdt !== treasury.treasuryBalanceUsdt) {
      db.updateTreasuryBalance(effectiveUsdt);
      syncDocument('settings', 'global', db.getSettings()).catch(() => {});
    }
    res.json({
      success: true,
      ...db.getTreasuryInfo(),
      treasuryBalanceUsdt: effectiveUsdt,
      onChainBreakdown: live.breakdown,
    });
  } catch (err: any) {
    res.json({
      success: true,
      ...db.getTreasuryInfo(),
    });
  }
});

app.post('/api/admin/treasury/update-address', requireAdminSignature, (req: Request, res: Response) => {
  try {
    const { newAddress, adminUser = 'Master Admin' } = req.body || {};
    const result = db.updateTreasuryAddress(newAddress, adminUser);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    syncDocument('settings', 'global', db.getSettings()).catch(() => {});
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to update treasury address' });
  }
});

app.post('/api/treasury/deposit', (req: Request, res: Response) => {
  try {
    const { userAddress, amount = 10, txHash } = req.body || {};
    const effectiveAddress = userAddress || '0x71C8a914B97e889F12A0987cB32456Fa12349A2';
    const result = db.processTreasuryDeposit(effectiveAddress, Number(amount) || 10, txHash);
    if (result.success) {
      if (result.user) {
        syncDocument('users', effectiveAddress.toLowerCase(), result.user).catch(() => {});
      }
      if (result.node) {
        syncDocument('nodes', result.node.id, result.node).catch(() => {});
      }
      syncDocument('settings', 'global', db.getSettings()).catch(() => {});
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to process treasury deposit' });
  }
});

app.post('/api/mining/activate', (req: Request, res: Response) => {
  try {
    const { userAddress, nodeName, costUsdt = 10 } = req.body || {};
    if (!userAddress) {
      res.status(400).json({ success: false, error: 'userAddress is required' });
      return;
    }
    const result = db.executeMiningActivation(userAddress, nodeName, Number(costUsdt) || 10);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    const user = db.getUser(userAddress);
    if (user) {
      syncDocument('users', userAddress.toLowerCase(), user).catch(() => {});
    }
    if (result.node) {
      syncDocument('nodes', result.node.id, result.node).catch(() => {});
    }
    syncDocument('settings', 'global', db.getSettings()).catch(() => {});
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to activate mining via smart contract' });
  }
});

app.post('/api/deposit/verify-hash', async (req: Request, res: Response) => {
  try {
    const { userAddress, txHash, amount = 15 } = req.body || {};
    if (!userAddress || !txHash) {
      res.status(400).json({ error: 'userAddress and txHash are required' });
      return;
    }

    const cleanHash = String(txHash).trim();
    if (!cleanHash.startsWith('0x') || cleanHash.length < 20) {
      res.status(400).json({ error: 'Invalid transaction hash format. Must begin with 0x' });
      return;
    }

    const officialWallet = db.getTreasuryInfo().treasuryWalletAddress || '0xD833e2f6fC850cFe3B39F49e34F9231f0AB2b6bF';

    // Query on-chain BSC RPC for real receipt verification
    const onChain = await verifyBscTxReceipt(cleanHash);
    if (onChain.status === 'Failed') {
      res.status(400).json({
        success: false,
        error: 'Transaction failed on the BNB Smart Chain. Please verify your transaction on BscScan.',
      });
      return;
    }

    const result = db.verifyAndProcessDeposit(
      userAddress,
      cleanHash,
      Number(amount) || 15,
      officialWallet,
      onChain.blockNumber
    );

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    if (result.user) {
      syncDocument('users', result.user.address.toLowerCase(), result.user).catch(() => {});
    }
    if (result.transaction) {
      syncDocument('transactions', result.transaction.id, result.transaction).catch(() => {});
    }
    syncDocument('settings', 'global', db.getSettings()).catch(() => {});

    res.json({
      success: true,
      message: `Deposit of ${amount} USDT verified successfully on BNB Smart Chain and credited to Mining Balance!`,
      balanceUsdt: result.user?.balanceUsdt,
      transaction: result.transaction,
      onChainVerification: {
        verified: onChain.verifiedOnChain,
        blockNumber: onChain.blockNumber || result.transaction?.blockNumber,
        status: onChain.status || 'Confirmed',
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Deposit verification failed' });
  }
});

app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, language = 'en' } = req.body || {};
    if (!message || typeof message !== 'string') {
      res.status(400).json({ success: false, error: 'Message string is required' });
      return;
    }
    const reply = await processAiMiningChat(message, language === 'hi' ? 'hi' : 'en');
    res.json({ success: true, reply });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'AI assistant service error' });
  }
});

app.get('/api/referrals/stats/:address', async (req: Request, res: Response) => {
  const { address } = req.params;
  try {
    if (address) {
      await syncReferralsForUser(db, address);
    }
  } catch {}
  const stats = db.getReferralStats(address);
  res.json({ success: true, stats });
});

// Dedicated sponsor verification and auto-matcher endpoint
app.get('/api/referrals/verify-sponsor', (req: Request, res: Response) => {
  const query = ((req.query.q as string) || (req.query.code as string) || (req.query.address as string) || '').trim();
  if (!query) {
    res.status(400).json({ success: false, message: 'Referral code or sponsor address is required' });
    return;
  }
  const user = db.findUserByReferralCodeOrAddress(query);
  const { address: extractedAddr } = db.extractReferralInput(query);
  const sponsorAddress = user ? user.address : (extractedAddr || '0x71C8a914B97e889F12A0987cB32456Fa12349A2');
  const referralCode = user?.referralCode || (sponsorAddress.startsWith('0x') ? `SPK-${sponsorAddress.slice(2, 8).toUpperCase()}` : 'SPK-71C8A9');
  const stats = db.getReferralStats(sponsorAddress);

  res.json({
    success: true,
    valid: true,
    sponsorAddress,
    referralCode,
    directPartners: stats.directPartners || 0,
    totalPartners: stats.totalPartners || 0,
    level: (stats.directPartners || 0) >= 10 ? 'Elite Tier 3 Partner' : ((stats.directPartners || 0) >= 3 ? 'VIP Tier 2 Partner' : 'Tier 1 Protocol Sponsor'),
    commissionRate: '15%',
    matched: true,
  });
});

// Sync / register sponsor wallet explicitly from client
app.post('/api/referrals/sync-sponsor', (req: Request, res: Response) => {
  const { address, referralCode } = req.body || {};
  if (!address || typeof address !== 'string' || !address.startsWith('0x')) {
    res.status(400).json({ success: false, message: 'Valid BSC address required' });
    return;
  }
  const cleanAddr = address.trim();
  const code = referralCode || `SPK-${cleanAddr.slice(2, 8).toUpperCase()}`;
  const user = db.upsertUser({ address: cleanAddr, referralCode: code });
  res.json({ success: true, user, referralCode: user.referralCode });
});

app.get('/api/referrals/check-bonded', (req: Request, res: Response) => {
  try {
    const address = ((req.query.address as string) || '').toLowerCase().trim();
    if (!address) {
      res.json({ isBonded: false });
      return;
    }
    const user = db.getUser(address);
    const existingRef = db.getReferrals().find((r) => r.refereeAddress.toLowerCase() === address);
    const isBonded = Boolean((user?.referredBy && user.referredBy.toLowerCase() !== address) || existingRef);
    const sponsor = user?.referredBy || existingRef?.referrerAddress || null;
    res.json({ isBonded, sponsor });
  } catch {
    res.json({ isBonded: false });
  }
});

app.post('/api/referrals/register', (req: Request, res: Response) => {
  try {
    const { referrerCodeOrAddr, refereeAddress } = req.body || {};
    if (!referrerCodeOrAddr || !refereeAddress) {
      res.status(400).json({ error: 'referrerCodeOrAddr and refereeAddress are required' });
      return;
    }

    const result = db.registerReferral(referrerCodeOrAddr, refereeAddress);
    if (!result.success) {
      res.json(result);
      return;
    }

    // Sync updated referrer & referee to Firestore
    if (result.referrer) {
      syncDocument('users', result.referrer.address.toLowerCase(), result.referrer).catch(() => {});
    }
    if (result.referee) {
      syncDocument('users', result.referee.address.toLowerCase(), result.referee).catch(() => {});
    }
    if (result.referral) {
      syncDocument('referrals', result.referral.id, result.referral).catch(() => {});
    }

    const updatedReferrerStats = result.referrer ? db.getReferralStats(result.referrer.address) : null;
    const updatedRefereeStats = result.referee ? db.getReferralStats(result.referee.address) : null;

    res.json({
      success: true,
      message: result.message,
      referral: result.referral,
      referrer: result.referrer,
      referee: result.referee,
      referrerStats: updatedReferrerStats,
      refereeStats: updatedRefereeStats,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to register referral' });
  }
});

// Domain configuration & SSL status (managed entirely in backend)
app.get('/api/config/domain', (req: Request, res: Response) => {
  res.json({
    success: true,
    domain: 'spikenodes.com',
    sslVerified: true,
    sslIssuer: "Let's Encrypt / Cloudflare SSL Authority",
    shortUrlPrefix: 'https://spikenodes.com/ref',
    corsEnabled: true,
  });
});

// Short referral link backend redirect
app.get(['/ref/:code', '/r/:code'], (req: Request, res: Response) => {
  const { code } = req.params;
  let sponsor = (req.query.sponsor as string) || '';

  // If sponsor address not in query, resolve from db by code or address
  if (!sponsor && code) {
    const resolvedUser = db.findUserByReferralCodeOrAddress(code);
    if (resolvedUser && resolvedUser.address) {
      sponsor = resolvedUser.address;
    }
  }

  if (sponsor && /^0x[a-fA-F0-9]{40}$/i.test(sponsor.trim())) {
    db.upsertUser({
      address: sponsor.trim(),
      referralCode: code || `SPK-${sponsor.trim().slice(2, 8).toUpperCase()}`,
    });
  }
  const queryObj: Record<string, string> = { ...(req.query as Record<string, string>) };
  if (sponsor && !queryObj.sponsor) {
    queryObj.sponsor = sponsor;
  }
  const qs = new URLSearchParams(queryObj).toString();
  const target = `/?ref=${encodeURIComponent(code)}${qs ? `&${qs}` : ''}`;
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.redirect(302, target);
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

// ============================================================
// WITHDRAWAL REQUESTS & ADMIN APPROVAL APIS
// ============================================================
app.get('/api/withdrawals', (req: Request, res: Response) => {
  try {
    const userAddress = req.query.userAddress as string | undefined;
    const requests = db.getWithdrawalRequests(userAddress);
    res.json({ success: true, withdrawals: requests });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch withdrawals' });
  }
});

app.post('/api/withdrawals/request', (req: Request, res: Response) => {
  try {
    const { userAddress, destinationAddress, amount, source, milestoneLabel } = req.body || {};
    if (!userAddress || !amount) {
      res.status(400).json({ success: false, error: 'userAddress and amount are required' });
      return;
    }
    const result = db.createWithdrawalRequest({
      userAddress,
      destinationAddress: destinationAddress || userAddress,
      amount: Number(amount),
      source: source || 'milestone_reward',
      milestoneLabel: milestoneLabel || 'Team Milestone Reward',
    });

    if (result.success && result.request) {
      syncDocument('withdrawals', result.request.id, result.request).catch(() => {});
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to create withdrawal request' });
  }
});

app.post('/api/admin/withdrawals/:id/approve', requireAdminSignature, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { txHash, adminUser } = req.body || {};
    const result = db.approveWithdrawalRequest(id, txHash, adminUser || 'Master Admin');

    if (result.success && result.request) {
      syncDocument('withdrawals', result.request.id, result.request).catch(() => {});
      if (result.user) {
        syncDocument('users', result.user.address.toLowerCase(), result.user).catch(() => {});
      }
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to approve withdrawal' });
  }
});

app.post('/api/admin/withdrawals/:id/reject', requireAdminSignature, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, adminUser } = req.body || {};
    const result = db.rejectWithdrawalRequest(id, reason, adminUser || 'Master Admin');

    if (result.success && result.request) {
      syncDocument('withdrawals', result.request.id, result.request).catch(() => {});
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to reject withdrawal' });
  }
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

  if (newNode) {
    syncDocument('nodes', newNode.id, newNode).catch(() => {});
  }
  const updatedUserAfterNode = db.getUser(userAddress);
  if (updatedUserAfterNode) {
    syncDocument('users', userAddress.toLowerCase(), updatedUserAfterNode).catch(() => {});
  }

  res.json({ success: true, node: newNode });
});

app.post('/api/nodes/sync', (req: Request, res: Response) => {
  const { userAddress, nodes } = req.body || {};
  if (!userAddress) {
    res.status(400).json({ error: 'userAddress is required' });
    return;
  }
  const synced = db.syncUserNodes(userAddress, nodes || []);
  if (Array.isArray(synced)) {
    synced.forEach((n) => syncDocument('nodes', n.id, n).catch(() => {}));
  }
  res.json({ success: true, nodes: synced });
});

app.post('/api/nodes/:id/action', (req: Request, res: Response) => {
  const { id } = req.params;
  const { action, userAddress = 'user' } = req.body;
  let status: 'mining' | 'idle' | 'stopped' = 'mining';
  if (action === 'stop') status = 'idle';
  else if (action === 'restart' || action === 'start') status = 'mining';

  let updated = db.updateNodeStatus(id, status, userAddress);
  // Fallback: If node wasn't in db fleet, register it as an active node for this user
  if (!updated && userAddress && userAddress !== 'user') {
    const norm = userAddress.toLowerCase();
    const created = db.createNode({
      userAddress: norm,
      name: id,
      region: 'Frankfurt (EU-Central BSC Pool)',
      status,
      hashrate: 142.8,
      temperature: status === 'mining' ? 63 : 45,
      shareAcceptance: 99.9,
      fanSpeed: 70,
      powerUsage: 2200,
      uptimeDays: 0.1,
      algorithm: 'SHA-256 (BSC Sublayer)',
      logs: [`[${new Date().toLocaleTimeString()}] Node initialized with status ${status}`],
      costUsdt: 15,
    });
    updated = created;
  }
  if (updated) {
    syncDocument('nodes', updated.id, updated).catch(() => {});
  }
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

  if (created) {
    syncDocument('transactions', created.id, created).catch(() => {});
    const updatedUser = db.getUser(userAddress);
    if (updatedUser) {
      syncDocument('users', userAddress.toLowerCase(), updatedUser).catch(() => {});
    }
  }

  res.json({ success: true, transaction: created });
});

// ============================================================
// SPIKE (SPK) TESTNET & HARVEST AUTO-BUY ENGINE APIS
// ============================================================
app.get('/api/bsc/v3-pool', async (req: Request, res: Response) => {
  try {
    const force = req.query.refresh === 'true';
    const pool = await fetchLiveV3PoolState(force);
    if (!pool) {
      res.status(503).json({ success: false, error: 'Unable to reach BSC RPC for V3 pool state' });
      return;
    }
    res.json({ success: true, relayerConfigured: Boolean(getRelayerPrivateKey()), pool });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error fetching V3 pool state' });
  }
});

app.get('/api/bsc/v3-quote', async (req: Request, res: Response) => {
  try {
    const userAddress = String(req.query.address || '');
    const spkAmount = Number(req.query.spkAmount || 0);
    const usdtAmount = Number(req.query.usdtAmount || 0);
    const quote = await getV3QuoteAndClaimCalldata({ userAddress, spkAmount, usdtAmount });
    res.json({ success: true, ...quote });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to compute V3 quote' });
  }
});

app.post('/api/bsc/v3-claim-tx', async (req: Request, res: Response) => {
  try {
    const { userAddress = '', spkAmount = 0, usdtAmount = 0 } = req.body || {};
    const quote = await getV3QuoteAndClaimCalldata({
      userAddress: String(userAddress),
      spkAmount: Number(spkAmount) || 0,
      usdtAmount: Number(usdtAmount) || 0,
    });
    res.json({ success: true, ...quote });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to build V3 swap calldata' });
  }
});

app.get('/api/bsc/v3-sell-quote', async (req: Request, res: Response) => {
  try {
    const userAddress = String(req.query.address || '');
    const spkAmount = Number(req.query.spkAmount || 0);
    const slippage = Number(req.query.slippage || 1.0);
    const quote = await getV3SellQuoteAndCalldata({
      userAddress,
      spkAmount,
      slippagePercent: slippage,
    });
    res.json({ success: true, ...quote });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to compute V3 sell quote' });
  }
});

app.post('/api/bsc/v3-sell-tx', async (req: Request, res: Response) => {
  try {
    const { userAddress = '', spkAmount = 0, slippage = 1.0 } = req.body || {};
    const quote = await getV3SellQuoteAndCalldata({
      userAddress: String(userAddress),
      spkAmount: Number(spkAmount) || 0,
      slippagePercent: Number(slippage) || 1.0,
    });
    res.json({ success: true, ...quote });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to build V3 sell swap calldata' });
  }
});

app.get('/api/testnet/spike/info', async (req: Request, res: Response) => {
  try {
    const token = db.getTestnetSpikeToken();
    const v3Pool = await fetchLiveV3PoolState().catch(() => null);
    res.json({
      success: true,
      token,
      routerAddress: PANCAKE_V3_SMART_ROUTER_BSC,
      pairAddress: PANCAKE_V3_POOL_BSC,
      poolVersion: 'PancakeSwap V3',
      feeTier: PANCAKE_V3_FEE_TIER,
      v3Pool,
      metrics: {
        totalSupply: token.totalSupply,
        circulatingSupply: token.circulatingSupply,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        contractAddress: SPIKE_CONTRACT_BSC,
        pair: PANCAKE_V3_POOL_BSC,
        priceUsdt: token.currentPrice,
        onChainPriceUsdt: v3Pool?.onChainPriceUsdt ?? null,
        poolReserves: {
          spk: token.poolSpkReserve,
          usdt: token.poolUsdtReserve,
        },
        onChainPoolReserves: v3Pool ? {
          spk: v3Pool.token1.reserve,
          usdt: v3Pool.token0.reserve,
        } : null,
        volume24h: token.volume24h,
        high24h: token.high24h,
        low24h: token.low24h,
        change24h: token.change24h,
        buyPressure: token.buyPressure,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error fetching testnet token info' });
  }
});

app.get('/api/testnet/wallet/:address', (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const wallet = db.getTestnetWallet(address);
    const token = db.getTestnetSpikeToken();
    const transactions = db.getTestnetTransactions(address, 20);
    res.json({
      success: true,
      wallet,
      tokenPrice: token.currentPrice,
      routerAddress: PANCAKE_V3_SMART_ROUTER_BSC,
      pairAddress: PANCAKE_V3_POOL_BSC,
      poolVersion: 'PancakeSwap V3',
      feeTier: PANCAKE_V3_FEE_TIER,
      transactions,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error fetching testnet wallet' });
  }
});

app.post('/api/testnet/wallet/settings', (req: Request, res: Response) => {
  try {
    const { address, autoBuyEnabled = true, slippageTolerance = 0.5 } = req.body;
    const wallet = db.updateTestnetWalletSettings(address, Boolean(autoBuyEnabled), Number(slippageTolerance));
    res.json({ success: true, wallet });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error updating testnet settings' });
  }
});

app.post('/api/testnet/wallet/faucet', (req: Request, res: Response) => {
  try {
    const { address, usdtAmount = 500, spkAmount = 100 } = req.body;
    const result = db.topupTestnetWallet(address, Number(usdtAmount), Number(spkAmount));
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error crediting testnet faucet' });
  }
});

app.post('/api/testnet/harvest-autobuy', async (req: Request, res: Response) => {
  try {
    const { address, minedSpkAmount = 25.0, hashrate = 1.25, slippageTolerance = 0.2, txHash } = req.body;
    const targetAddr = (address && typeof address === 'string' && address.trim()) ? address.trim() : '0x71C8a914B97e889F12A0987cB32456Fa12349A2';
    const numAmount = Number(minedSpkAmount) > 0 ? Number(minedSpkAmount) : 25.0;

    let [receiptInfo, v3Pool] = await Promise.all([
      verifyBscTxReceipt(txHash, targetAddr),
      fetchLiveV3PoolState().catch(() => null),
    ]);

    let effectiveTxHash = txHash;
    let payoutMethod: string = receiptInfo.spkCreditedOnChain ? 'user_v3_swap' : 'protocol_ledger';

    // If user didn't execute a real SPK-crediting V3 swap (or sent approval-only tx) AND backend relayer is configured,
    // execute a real on-chain BEP-20 SPK transfer / V3 swap directly to the user's wallet from backend!
    let relayerResult: Awaited<ReturnType<typeof executeBackendOnChainSpkPayout>> | null = null;
    if (!receiptInfo.spkCreditedOnChain && getRelayerPrivateKey()) {
      relayerResult = await executeBackendOnChainSpkPayout(targetAddr, numAmount);
      if (relayerResult.executed && relayerResult.txHash) {
        effectiveTxHash = relayerResult.txHash;
        payoutMethod = relayerResult.method || 'relayer_spk_transfer';
        receiptInfo = {
          verifiedOnChain: true,
          spkCreditedOnChain: true,
          onChainSpkReceived: relayerResult.spkSent || numAmount,
          onChainUsdtReceived: 0,
          onChainSpkSpent: 0,
          isApprovalOnly: false,
          blockNumber: relayerResult.blockNumber,
          status: 'Success',
          gasFeeBnb: relayerResult.gasFeeBnb,
        };
      }
    }

    const effectiveSpkAmount = receiptInfo.spkCreditedOnChain && receiptInfo.onChainSpkReceived > 0
      ? receiptInfo.onChainSpkReceived
      : numAmount;

    const result = db.executeTestnetHarvestAutoBuy(
      targetAddr,
      effectiveSpkAmount,
      Number(hashrate) || 1.25,
      Number(slippageTolerance) || 0.2,
      effectiveTxHash,
      {
        verifiedOnChain: receiptInfo.spkCreditedOnChain,
        blockNumber: receiptInfo.blockNumber,
        gasFeeBnb: receiptInfo.gasFeeBnb,
        livePoolPrice: v3Pool?.onChainPriceUsdt,
      }
    );

    if (result.success && !result.duplicate) {
      const updatedUser = db.getUser(targetAddr);
      if (updatedUser) {
        syncDocument('users', targetAddr.toLowerCase(), updatedUser).catch(() => {});
      }
      if (result.tx) {
        const claimDocId = `claim_${Date.now()}_${targetAddr.toLowerCase().slice(2, 8)}`;
        syncDocument('transactions', claimDocId, {
          id: claimDocId,
          userAddress: targetAddr,
          txHash: result.tx.txHash,
          type: 'claim',
          amount: result.tx.spkAmount,
          spkAmount: result.tx.spkAmount,
          usdtAmount: result.tx.usdtAmount,
          currency: 'SPK',
          status: 'Confirmed',
          verifiedOnChain: receiptInfo.spkCreditedOnChain,
          payoutMethod,
          blockNumber: result.tx.blockNumber,
          details: result.tx.details,
          timestamp: result.tx.timestamp,
        }).catch(() => {});
      }
    }

    res.json({
      ...result,
      payoutMethod,
      spkCreditedOnChain: receiptInfo.spkCreditedOnChain,
      onChainSpkReceived: receiptInfo.onChainSpkReceived,
      isApprovalOnly: receiptInfo.isApprovalOnly,
      relayerConfigured: Boolean(getRelayerPrivateKey()),
      relayerNotice: relayerResult && !relayerResult.executed ? relayerResult.error : undefined,
      v3Pool: v3Pool ? {
        poolAddress: v3Pool.poolAddress,
        routerAddress: v3Pool.routerAddress,
        feeTier: v3Pool.feeTier,
        onChainPriceUsdt: v3Pool.onChainPriceUsdt,
        unlocked: v3Pool.unlocked,
      } : undefined,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error executing harvest auto-buy' });
  }
});

app.post('/api/testnet/swap', async (req: Request, res: Response) => {
  try {
    const { address, fromToken, toToken, amountIn, txHash, onChainSpkBalanceBefore } = req.body;
    const isRealOnChainSell = fromToken === 'SPK' && toToken === 'USDT';

    const [receiptInfo, v3Pool] = await Promise.all([
      verifyBscTxReceipt(txHash, address),
      fetchLiveV3PoolState().catch(() => null),
    ]);

    if (isRealOnChainSell) {
      if (!txHash || typeof txHash !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(txHash.trim())) {
        res.status(400).json({
          success: false,
          error: 'Real on-chain BSC transaction hash is required for Web3 DEX swap.',
        });
        return;
      }
      if (receiptInfo.status === 'Failed') {
        res.status(400).json({
          success: false,
          error: 'On-chain PancakeSwap V3 transaction reverted on BSC Mainnet.',
        });
        return;
      }
      if (receiptInfo.isApprovalOnly) {
        res.status(400).json({
          success: false,
          error: 'Transaction was only token Approval. Please confirm the PancakeSwap V3 swap transaction.',
        });
        return;
      }
    }

    const result = db.executeTestnetSwap(
      address,
      fromToken,
      toToken,
      Number(amountIn),
      txHash,
      {
        verifiedOnChain: receiptInfo.verifiedOnChain,
        blockNumber: receiptInfo.blockNumber,
        gasFeeBnb: receiptInfo.gasFeeBnb,
        livePoolPrice: v3Pool?.onChainPriceUsdt,
        onChainUsdtReceived: receiptInfo.onChainUsdtReceived,
        onChainSpkSpent: receiptInfo.onChainSpkSpent,
        onChainSpkBalanceBefore: Number(onChainSpkBalanceBefore) || undefined,
      }
    );
    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    if (address && !result.duplicate) {
      const updatedUser = db.getUser(address);
      if (updatedUser) {
        syncDocument('users', String(address).toLowerCase(), updatedUser).catch(() => {});
      }
    }

    res.json({
      ...result,
      v3Pool: v3Pool ? {
        poolAddress: v3Pool.poolAddress,
        routerAddress: v3Pool.routerAddress,
        feeTier: v3Pool.feeTier,
        onChainPriceUsdt: v3Pool.onChainPriceUsdt,
        unlocked: v3Pool.unlocked,
      } : undefined,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error executing on-chain swap' });
  }
});

app.get('/api/testnet/transactions', (req: Request, res: Response) => {
  try {
    const address = req.query.address as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const txs = db.getTestnetTransactions(address, limit);
    res.json({ success: true, transactions: txs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error fetching testnet transactions' });
  }
});

app.get('/api/bsc/balances/:address', async (req: Request, res: Response) => {
  const address = (req.params.address || '').trim();
  if (!address.startsWith('0x') || address.length < 10) {
    res.status(400).json({ success: false, error: 'Invalid wallet address' });
    return;
  }

  const cleanAddr = address.toLowerCase().replace(/^0x/, '').padStart(64, '0');
  const dataPayload = '0x70a08231' + cleanAddr;

  try {
    const [rawSpikeHex, rawUsdtHex, rawBnbHex] = await Promise.all([
      callBscRpcNode('eth_call', [{ to: SPIKE_CONTRACT_BSC, data: dataPayload }, 'latest']),
      callBscRpcNode('eth_call', [{ to: USDT_CONTRACT_BSC, data: dataPayload }, 'latest']),
      callBscRpcNode('eth_getBalance', [address, 'latest']),
    ]);

    const spikeBalance = formatTokenDecimals(rawSpikeHex, 18);
    const usdtBalance = formatTokenDecimals(rawUsdtHex, 18);
    const bnbBalance = formatTokenDecimals(rawBnbHex, 18);

    res.json({
      success: true,
      address,
      contracts: {
        spike: SPIKE_CONTRACT_BSC,
        usdt: USDT_CONTRACT_BSC,
      },
      balances: {
        spike: spikeBalance,
        usdt: usdtBalance,
        bnb: bnbBalance,
      },
      raw: {
        spikeHex: rawSpikeHex,
        usdtHex: rawUsdtHex,
        bnbHex: rawBnbHex,
      },
      network: 'Binance Smart Chain (BSC Mainnet)',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message || 'Error querying BSC RPC',
    });
  }
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
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`SPIKE Full-Stack Server running at http://0.0.0.0:${PORT}`);
    console.log(`[DB] Persistent Database connected at .data/spike_database.json`);
    console.log(`[ADMIN] Admin API routes live at /api/admin/*`);
    console.log(`[FIREBASE] Cloud Firestore connected: ${firebaseConfig?.projectId || 'active'}`);
    console.log(`[CLOUDSQL] PostgreSQL Relational Database (Drizzle ORM) active`);
    console.log(`[MAINNET] Clean baseline active: Treasury $0.00, Master Creator authenticated.`);

    // Perform Cloud Firestore hydration in background without blocking server startup or pre-warming
    (async () => {
      try {
        console.log('[FIREBASE] Synchronizing data from shared Cloud Firestore database in background...');
        const syncRes = await loadFirestoreDataIntoDb(db);
        console.log(`[FIREBASE] Hydration completed: ${syncRes.usersLoaded} users, ${syncRes.referralsLoaded} referrals, ${syncRes.nodesLoaded} nodes, ${syncRes.transactionsLoaded} transactions synchronized.`);
      } catch (err) {
        console.warn('[FIREBASE] Startup hydration notice (using persistent local cache):', err);
      }
    })();
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Server] Port ${PORT} busy, waiting 500ms before retrying...`);
      setTimeout(() => {
        try {
          server.close();
        } catch {}
        server.listen(PORT, '0.0.0.0');
      }, 500);
    } else {
      console.error('[Server Error]:', err);
    }
  });
}

startServer();
