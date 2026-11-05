/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Professional Web3 Wallet Detection & Real-Time Account Synchronization
 * Handles MetaMask, Trust Wallet, SafePal, Binance Web3, OKX, and multiple EIP-1193 providers.
 */

export function getAllWeb3Providers(): any[] {
  if (typeof window === 'undefined') return [];
  const win = window as any;
  const list: any[] = [];
  const seen = new Set();

  const add = (p: any) => {
    if (p && typeof p === 'object' && !seen.has(p)) {
      seen.add(p);
      list.push(p);
    }
  };

  if (win.ethereum?.providers && Array.isArray(win.ethereum.providers)) {
    win.ethereum.providers.forEach(add);
  }
  if (win.safepalProvider) add(win.safepalProvider);
  if (win.safePal) add(win.safePal);
  if (win.trustwallet) add(win.trustwallet);
  if (win.ethereum) add(win.ethereum);

  return list;
}

export function getActiveWeb3Provider(): any {
  const providers = getAllWeb3Providers();
  if (providers.length === 0) return null;
  // Prefer provider with active selectedAddress or isConnected
  const active =
    providers.find((p) => p.selectedAddress || (typeof p.isConnected === 'function' && p.isConnected())) ||
    providers.find((p) => p.isMetaMask) ||
    providers[0];
  return active;
}

/**
 * Directly queries the current active/authorized Web3 address without any popup
 */
export async function getRealActiveAccount(): Promise<string | null> {
  const providers = getAllWeb3Providers();
  for (const p of providers) {
    try {
      if (typeof p.request === 'function') {
        const accounts = await p.request({ method: 'eth_accounts' });
        if (Array.isArray(accounts) && accounts.length > 0 && accounts[0]) {
          return accounts[0].toLowerCase();
        }
      }
      if (p.selectedAddress && typeof p.selectedAddress === 'string') {
        return p.selectedAddress.toLowerCase();
      }
    } catch {}
  }
  return null;
}

/**
 * Triggers interactive wallet connection popup on the best available provider
 */
export async function requestWeb3Connection(preferredProviderName?: string): Promise<string | null> {
  const providers = getAllWeb3Providers();
  if (providers.length === 0) return null;

  let target = providers[0];
  if (preferredProviderName) {
    const nameLower = preferredProviderName.toLowerCase();
    if (nameLower.includes('safepal')) {
      const sp = providers.find((p) => p.isSafePal || (window as any).safepalProvider === p);
      if (sp) target = sp;
    } else if (nameLower.includes('trust')) {
      const tw = providers.find((p) => p.isTrust || p.isTrustWallet || (window as any).trustwallet === p);
      if (tw) target = tw;
    } else if (nameLower.includes('binance')) {
      const bn = providers.find((p) => p.isBinance);
      if (bn) target = bn;
    } else if (nameLower.includes('meta')) {
      const mm = providers.find((p) => p.isMetaMask);
      if (mm) target = mm;
    }
  }

  if (target && typeof target.request === 'function') {
    const accounts = await target.request({ method: 'eth_requestAccounts' });
    if (Array.isArray(accounts) && accounts.length > 0 && accounts[0]) {
      return accounts[0].toLowerCase();
    }
  }
  return null;
}

/**
 * Subscribes to real-time account change, chain change, and disconnect events across all providers
 */
export function subscribeToWeb3AccountChanges(
  onAccountSwitched: (newAddress: string) => void,
  onAccountDisconnected: () => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const cleanups: Array<() => void> = [];

  const attachToProvider = (p: any) => {
    if (!p || typeof p.on !== 'function') return;

    const handleAccounts = (accounts: string[]) => {
      if (Array.isArray(accounts) && accounts.length > 0 && accounts[0]) {
        onAccountSwitched(accounts[0].toLowerCase());
      } else {
        onAccountDisconnected();
      }
    };

    const handleDisconnect = () => {
      onAccountDisconnected();
    };

    try {
      p.on('accountsChanged', handleAccounts);
      p.on('disconnect', handleDisconnect);
      cleanups.push(() => {
        try {
          p.removeListener?.('accountsChanged', handleAccounts);
          p.removeListener?.('disconnect', handleDisconnect);
        } catch {}
      });
    } catch {}
  };

  getAllWeb3Providers().forEach(attachToProvider);

  // In case providers are injected late (e.g. mobile dApp browsers or delayed extensions)
  const onInitialized = () => {
    getAllWeb3Providers().forEach(attachToProvider);
  };
  window.addEventListener('ethereum#initialized', onInitialized);
  cleanups.push(() => window.removeEventListener('ethereum#initialized', onInitialized));

  return () => {
    cleanups.forEach((fn) => fn());
  };
}
