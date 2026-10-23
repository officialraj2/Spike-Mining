// ============================================================
// ON-CHAIN BSC TOKEN BALANCE SERVICE (SPIKE & USDT BEP-20)
// Contract Addresses:
// - SPIKE (SPK): 0xc213905ac995bCC943c077b7918c8134094A9267
// - USDT (BEP-20): 0x55d398326f99059fF775485246999027B3197955
// ============================================================

export const SPIKE_CONTRACT_ADDRESS = '0xc213905ac995bCC943c077b7918c8134094A9267';
export const USDT_CONTRACT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';

export interface OnChainBalances {
  spike: number;
  usdt: number;
  bnb: number;
  walletAddress: string;
  source: 'onchain_bsc' | 'cache' | 'error';
  timestamp: number;
}

const BSC_PUBLIC_RPCS = [
  'https://bsc-dataseed.binance.org/',
  'https://bsc-dataseed1.defibit.io/',
  'https://binance.llamarpc.com',
  'https://rpc.ankr.com/bsc',
];

/**
 * Format raw hex balance from ERC20/BEP20 contract call into a decimal number
 */
function parseTokenHex(rawHex: string | null, decimals = 18): number {
  if (!rawHex || rawHex === '0x') return 0;
  try {
    const bi = BigInt(rawHex);
    const divisor = BigInt(10 ** decimals);
    const whole = bi / divisor;
    const remainder = bi % divisor;
    const remFloat = Number(remainder) / (10 ** decimals);
    return +(Number(whole) + remFloat).toFixed(4);
  } catch {
    return 0;
  }
}

/**
 * Directly calls BSC JSON-RPC with fallback endpoints
 */
async function callBscRpc(method: string, params: unknown[]): Promise<string | null> {
  for (const url of BSC_PUBLIC_RPCS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const json = await res.json();
        if (json && json.result !== undefined) {
          return json.result;
        }
      }
    } catch {
      // try next RPC
    }
  }
  return null;
}

/**
 * Query on-chain BEP-20 balances for SPIKE, USDT, and BNB for any BSC wallet address.
 * Uses backend proxy first (to avoid browser CORS/sandbox issues), then falls back to direct BSC RPCs or browser extension.
 */
export async function fetchOnChainBalances(walletAddress: string): Promise<OnChainBalances> {
  const norm = (walletAddress || '').trim().toLowerCase();
  if (!norm.startsWith('0x') || norm.length < 10) {
    return {
      spike: 0,
      usdt: 0,
      bnb: 0,
      walletAddress: norm,
      source: 'error',
      timestamp: Date.now(),
    };
  }

  // 1. Try Backend Proxy endpoint
  try {
    const res = await fetch(`/api/bsc/balances/${norm}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.balances) {
        const result: OnChainBalances = {
          spike: typeof data.balances.spike === 'number' ? data.balances.spike : 0,
          usdt: typeof data.balances.usdt === 'number' ? data.balances.usdt : 0,
          bnb: typeof data.balances.bnb === 'number' ? data.balances.bnb : 0,
          walletAddress: norm,
          source: 'onchain_bsc',
          timestamp: Date.now(),
        };

        // Cache locally for instant loading
        try {
          localStorage.setItem(`spike_onchain_spk_${norm}`, String(result.spike));
          localStorage.setItem(`spike_onchain_usdt_${norm}`, String(result.usdt));
          localStorage.setItem(`spike_onchain_bnb_${norm}`, String(result.bnb));
          window.dispatchEvent(
            new CustomEvent('spike_onchain_balances_updated', { detail: result })
          );
        } catch {}

        return result;
      }
    }
  } catch {
    // proceed to direct on-chain fallback
  }

  // 2. Direct BSC Public RPC Query Fallback
  try {
    const cleanAddr = norm.replace(/^0x/, '').padStart(64, '0');
    const dataPayload = '0x70a08231' + cleanAddr; // balanceOf(address) selector

    const [rawSpikeHex, rawUsdtHex, rawBnbHex] = await Promise.all([
      callBscRpc('eth_call', [{ to: SPIKE_CONTRACT_ADDRESS, data: dataPayload }, 'latest']),
      callBscRpc('eth_call', [{ to: USDT_CONTRACT_ADDRESS, data: dataPayload }, 'latest']),
      callBscRpc('eth_getBalance', [norm, 'latest']),
    ]);

    const spike = parseTokenHex(rawSpikeHex, 18);
    const usdt = parseTokenHex(rawUsdtHex, 18);
    const bnb = parseTokenHex(rawBnbHex, 18);

    const result: OnChainBalances = {
      spike,
      usdt,
      bnb,
      walletAddress: norm,
      source: 'onchain_bsc',
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(`spike_onchain_spk_${norm}`, String(spike));
      localStorage.setItem(`spike_onchain_usdt_${norm}`, String(usdt));
      localStorage.setItem(`spike_onchain_bnb_${norm}`, String(bnb));
      window.dispatchEvent(
        new CustomEvent('spike_onchain_balances_updated', { detail: result })
      );
    } catch {}

    return result;
  } catch (err) {
    console.warn('[OnChainBalance] Direct BSC query error:', err);
    // Return cached if available
    const cachedSpk = Number(localStorage.getItem(`spike_onchain_spk_${norm}`)) || 0;
    const cachedUsdt = Number(localStorage.getItem(`spike_onchain_usdt_${norm}`)) || 0;
    const cachedBnb = Number(localStorage.getItem(`spike_onchain_bnb_${norm}`)) || 0;
    return {
      spike: cachedSpk,
      usdt: cachedUsdt,
      bnb: cachedBnb,
      walletAddress: norm,
      source: 'cache',
      timestamp: Date.now(),
    };
  }
}
