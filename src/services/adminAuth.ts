import { ethers } from 'ethers';

export interface AdminAuthSession {
  address: string;
  challenge: string;
  signature: string;
  token: string;
  expiresAt: number;
  mode: 'backend' | 'static';
}

const SESSION_STORAGE_KEY = 'spike_admin_session';

// Keccak-256 hashes of normalized lowercase Master Wallets (zero plaintext addresses in client bundle)
const MASTER_WALLET_HASHES = [
  '0x953720712f1427efa1f0d0d13cbe1c83582f452b3c6d7debaa935c805ba6c6f9',
];

function computeAddressHash(address: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(address.toLowerCase().trim()));
}

export function isMasterWalletHashMatch(
  address?: string | null,
  extraAuthorizedAddresses?: string[]
): boolean {
  if (!address || typeof address !== 'string') return false;
  const clean = address.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(clean)) return false;

  const h = computeAddressHash(clean);
  if (MASTER_WALLET_HASHES.includes(h)) return true;

  if (Array.isArray(extraAuthorizedAddresses)) {
    return extraAuthorizedAddresses.some(
      (a) => typeof a === 'string' && a.trim().toLowerCase() === clean
    );
  }
  return false;
}

export function clearAdminSession(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem('spike_admin_authenticated');
  } catch {}
}

export function getActiveAdminSession(
  connectedWallet?: string | null,
  extraAuthorizedAddresses?: string[]
): AdminAuthSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminAuthSession;
    if (
      !parsed?.address ||
      !parsed?.challenge ||
      !parsed?.signature ||
      typeof parsed.expiresAt !== 'number'
    ) {
      return null;
    }

    if (parsed.expiresAt <= Date.now()) {
      clearAdminSession();
      return null;
    }

    const sessionAddr = parsed.address.toLowerCase();
    if (connectedWallet && connectedWallet.toLowerCase() !== sessionAddr) {
      return null;
    }

    if (!isMasterWalletHashMatch(sessionAddr, extraAuthorizedAddresses)) {
      return null;
    }

    // Cryptographically re-verify signature integrity so sessionStorage cannot be spoofed in DevTools
    const recovered = ethers.verifyMessage(parsed.challenge, parsed.signature).toLowerCase();
    if (recovered !== sessionAddr) {
      clearAdminSession();
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function getAdminAuthHeaders(): Record<string, string> {
  const session = getActiveAdminSession();
  if (!session || !session.token) return {};
  return {
    Authorization: `Bearer ${session.token}`,
    'x-admin-token': session.token,
  };
}

function getInjectedWeb3Provider(): {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
} | null {
  if (typeof window === 'undefined') return null;
  const win = window as any;

  if (win.ethereum?.providers && Array.isArray(win.ethereum.providers)) {
    const preferred =
      win.ethereum.providers.find((p: any) => p.isMetaMask || p.isSafePal || p.isTrust) ||
      win.ethereum.providers[0];
    if (preferred && typeof preferred.request === 'function') return preferred;
  }

  if (win.ethereum && typeof win.ethereum.request === 'function') {
    return win.ethereum;
  }
  if (win.safepalProvider && typeof win.safepalProvider.request === 'function') {
    return win.safepalProvider;
  }
  if (win.safePal && typeof win.safePal.request === 'function') {
    return win.safePal;
  }
  return null;
}

function createRandomHex(bytesLength = 16): string {
  const bytes = new Uint8Array(bytesLength);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytesLength; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function authenticateMasterWalletWithSignature(
  extraAuthorizedAddresses?: string[]
): Promise<{
  success: boolean;
  session?: AdminAuthSession;
  error?: string;
}> {
  const provider = getInjectedWeb3Provider();
  if (!provider) {
    return {
      success: false,
      error:
        'Web3 wallet extension (MetaMask, SafePal, or Trust Wallet) not detected. Please open in a Web3-enabled browser tab.',
    };
  }

  let activeSigner = '';
  try {
    const accounts = (await provider.request({
      method: 'eth_requestAccounts',
    })) as string[];
    if (!accounts || accounts.length === 0) {
      return { success: false, error: 'No wallet account approved in Web3 extension.' };
    }
    activeSigner = String(accounts[0]).trim().toLowerCase();
  } catch (err: any) {
    return {
      success: false,
      error: err?.code === 4001 ? 'Wallet connection request rejected.' : 'Failed to access Web3 wallet.',
    };
  }

  if (!isMasterWalletHashMatch(activeSigner, extraAuthorizedAddresses)) {
    return {
      success: false,
      error: 'Access Denied: Connected Web3 wallet is not authorized as Master Wallet.',
    };
  }

  // Request challenge from backend if Express server is available
  let challenge = '';
  let backendAvailable = false;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const challengeRes = await fetch('/api/admin/auth/challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: activeSigner }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    const contentType = challengeRes.headers.get('content-type') || '';
    if (challengeRes.ok && contentType.includes('application/json')) {
      const data = await challengeRes.json();
      if (data?.challenge) {
        challenge = data.challenge;
        backendAvailable = true;
      }
    }
  } catch {
    backendAvailable = false;
  }

  if (!challenge) {
    challenge = [
      'SPIKE PROTOCOL ADMIN AUTHENTICATION',
      `Signer: ${activeSigner}`,
      `Nonce: ${createRandomHex(16)}`,
      `Issued At: ${new Date().toISOString()}`,
      `Origin: ${typeof window !== 'undefined' ? window.location.origin : 'https://spikenodes.com'}`,
      'Action: Unlock Master Admin Console (No gas fee, no fund transfer)',
    ].join('\n');
  }

  // Request EIP-191 personal_sign cryptographic signature
  let signature = '';
  try {
    signature = (await provider.request({
      method: 'personal_sign',
      params: [challenge, activeSigner],
    })) as string;
  } catch (err: any) {
    return {
      success: false,
      error:
        err?.code === 4001
          ? 'Signature rejected in Web3 wallet. Master Wallet signature is mandatory.'
          : err?.message || 'Failed to sign authentication challenge.',
    };
  }

  if (!signature || typeof signature !== 'string') {
    return { success: false, error: 'Empty signature received from wallet.' };
  }

  // Verify recovered address locally first
  try {
    const recovered = ethers.verifyMessage(challenge, signature).toLowerCase();
    if (recovered !== activeSigner || !isMasterWalletHashMatch(recovered, extraAuthorizedAddresses)) {
      return { success: false, error: 'Signature verification failed: Invalid signer.' };
    }
  } catch {
    return { success: false, error: 'Invalid cryptographic signature format.' };
  }

  let token = '';
  let expiresAt = Date.now() + 4 * 60 * 60 * 1000;
  let mode: 'backend' | 'static' = 'static';

  if (backendAvailable) {
    try {
      const verifyRes = await fetch('/api/admin/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: activeSigner,
          challenge,
          signature,
        }),
      });
      const verifyData = await verifyRes.json().catch(() => null);
      if (!verifyRes.ok || !verifyData?.success || !verifyData?.token) {
        return {
          success: false,
          error: verifyData?.error || 'Backend refused Master Wallet signature.',
        };
      }
      token = verifyData.token;
      expiresAt = verifyData.expiresAt || expiresAt;
      mode = 'backend';
    } catch {
      return { success: false, error: 'Failed to verify signature with protocol server.' };
    }
  }

  const session: AdminAuthSession = {
    address: activeSigner,
    challenge,
    signature,
    token,
    expiresAt,
    mode,
  };

  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {}

  return { success: true, session };
}
