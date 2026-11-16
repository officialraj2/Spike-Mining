import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';

interface PendingChallenge {
  address: string;
  challenge: string;
  expiresAt: number;
}

export interface AdminSessionPayload {
  address: string;
  iat: number;
  exp: number;
  nonce: string;
}

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const pendingChallenges = new Map<string, PendingChallenge>();

function pruneChallenges() {
  const now = Date.now();
  for (const [key, item] of pendingChallenges.entries()) {
    if (item.expiresAt <= now) {
      pendingChallenges.delete(key);
    }
  }
  if (pendingChallenges.size > 500) {
    const oldestKey = pendingChallenges.keys().next().value;
    if (oldestKey) pendingChallenges.delete(oldestKey);
  }
}

function signPayload(payload: AdminSessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyAdminSessionToken(
  token: string | undefined,
  isMasterCheck: (address: string) => boolean
): AdminSessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encoded, providedSig] = parts;
  if (!encoded || !providedSig) return null;

  try {
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(encoded)
      .digest('base64url');

    const bufA = Buffer.from(providedSig, 'utf8');
    const bufB = Buffer.from(expectedSig, 'utf8');
    if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
      return null;
    }

    const decoded = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as AdminSessionPayload;

    if (!decoded?.address || typeof decoded.exp !== 'number') return null;
    if (decoded.exp <= Date.now()) return null;
    if (!isMasterCheck(decoded.address)) return null;

    return decoded;
  } catch {
    return null;
  }
}

export function issueAdminChallenge(address: string): {
  challenge: string;
  expiresAt: number;
} | null {
  const clean = (address || '').trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(clean)) {
    return null;
  }

  pruneChallenges();
  const nonce = crypto.randomBytes(16).toString('hex');
  const issuedAt = new Date().toISOString();
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;

  const challenge = [
    'SPIKE PROTOCOL ADMIN AUTHENTICATION',
    `Signer: ${clean}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    'Chain: BNB Smart Chain (56)',
    'Action: Unlock Master Admin Console (No gas fee, no fund transfer)',
  ].join('\n');

  pendingChallenges.set(`${clean}:${nonce}`, {
    address: clean,
    challenge,
    expiresAt,
  });

  return { challenge, expiresAt };
}

export function verifyAdminChallengeSignature(
  address: string,
  challenge: string,
  signature: string,
  isMasterCheck: (address: string) => boolean
): { success: boolean; token?: string; expiresAt?: number; error?: string } {
  const clean = (address || '').trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(clean) || !challenge || !signature) {
    return { success: false, error: 'Missing or invalid authentication parameters.' };
  }

  // Match pending challenge (single-use)
  let matchedKey: string | null = null;
  for (const [key, entry] of pendingChallenges.entries()) {
    if (entry.address === clean && entry.challenge === challenge) {
      matchedKey = key;
      if (entry.expiresAt <= Date.now()) {
        pendingChallenges.delete(key);
        return { success: false, error: 'Authentication challenge expired. Please sign again.' };
      }
      break;
    }
  }

  if (!matchedKey) {
    return { success: false, error: 'Challenge nonce invalid or already consumed.' };
  }

  // Consume immediately to prevent replay attacks
  pendingChallenges.delete(matchedKey);

  try {
    const recovered = ethers.verifyMessage(challenge, signature).toLowerCase();
    if (recovered !== clean) {
      return { success: false, error: 'Cryptographic signature does not match signer wallet.' };
    }
    if (!isMasterCheck(recovered)) {
      return { success: false, error: 'Connected wallet is not an authorized Master Wallet.' };
    }

    const now = Date.now();
    const expiresAt = now + SESSION_TTL_MS;
    const token = signPayload({
      address: recovered,
      iat: now,
      exp: expiresAt,
      nonce: crypto.randomBytes(8).toString('hex'),
    });

    return { success: true, token, expiresAt };
  } catch {
    return { success: false, error: 'Invalid ECDSA signature format.' };
  }
}

export interface AdminAuthRequest extends Request {
  adminAddress?: string;
}

export function createRequireAdminSignature(
  isMasterCheck: (address: string) => boolean
) {
  return (req: AdminAuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const headerToken = req.headers['x-admin-token'];
    const token =
      (authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : undefined) ||
      (typeof headerToken === 'string' ? headerToken.trim() : undefined);

    const payload = verifyAdminSessionToken(token, isMasterCheck);
    if (!payload) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Valid Master Wallet cryptographic signature session required.',
      });
      return;
    }

    req.adminAddress = payload.address;
    next();
  };
}
