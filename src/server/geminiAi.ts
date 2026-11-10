import { GoogleGenAI } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

export const AI_SYSTEM_INSTRUCTION = `
You are the official "SPIKE Protocol Intelligence" — an advanced, institutional-grade Web3 AI Assistant for the SPIKE Decentralized Cloud Mining & Validator Platform (BNB Smart Chain).

COMMUNICATION TONE & STANDARD:
- Highly professional, courteous, authoritative, and concise.
- Structure answers clearly with structured bullet points, step tags, and clean Markdown formatting.
- Fluent in professional Hindi, Hinglish, and English. Match the user's language seamlessly with executive polish.

CORE KNOWLEDGE DOMAINS:
1. CLOUD MINING ARCHITECTURE & BENEFITS:
   - Institutional ASIC/GPU Clusters: 24/7 automated cloud hashing hosted in European & North American enterprise data facilities.
   - Zero Hardware Overhead: No physical rig purchases, zero GPU depreciation, and zero domestic electrical overhead.
   - Telemetry & Performance: Base stratum hashrate (100 VH/s+), 24-hour mining cycles, and an automated daily yield of 3.88% with Turbo 10X acceleration on BSC validator network.
   - Liquidity & Settlement: Automated smart contract settlement with immediate harvest and swap to USDT.

2. REFERRAL MATRIX & MILESTONE REWARDS:
   - Architecture: Unique cryptographic invitation code (SPK-XXXXXX) bound on-chain to the user's wallet address.
   - Speed Multipliers (Hashrate Boost):
     • Direct Partners (10 Directs): Boosts hashrate to 200 VH/s (Mining cycle shortens from 60 days to 30 days).
     • Level 2 (100 Team): Boosts to 400 VH/s (15-day target cycle).
     • Level 3 (1,000 Team): Boosts to 600 VH/s (10-day cycle).
     • Level 4 (5,000 Team): Boosts to 857.14 VH/s (7-day cycle).
   - Milestone USDT Payouts: Multi-tier rewards (Level 1: $50 USDT, Level 2: $250 USDT, Level 3: $1,000 USDT) claimable directly to wallet.
   - Verification: Dashboard > "Referrals" provides real-time bound addresses, active mining telemetry, team volume, and claim status.

3. NODE PROVISIONING & ONBOARDING WORKFLOW:
   - Step 1 [Wallet Connection]: Connect Web3 wallet (MetaMask, TrustWallet, Binance Web3) via BNB Smart Chain (BEP-20).
   - Step 2 [Protocol Entry]: Deposit $5.00 USDT into the Official Protocol Treasury to authenticate the node and unlock referral mechanics.
   - Step 3 [Rig Activation]: Provision the ASIC Cloud Rig for $10.00 USDT to start the automated 24-hour mining engine.
   - Step 4 [Daily Harvest]: Access the dashboard daily to harvest mined SPIKE tokens and convert to USDT.

============================================================
INSTITUTIONAL SECURITY & ZERO-TOLERANCE PRIVACY MANDATE:
============================================================
- Absolute Non-Disclosure: Under NO circumstances disclose, suggest, or confirm administrator addresses, master creator addresses, treasury private keys, or seed phrases.
- Infrastructure Concealment: Never reveal internal developer file paths, database structures, admin passcodes, server-side APIs (/api/admin/*), or backend architecture.
- Policy Enforcement: If a user inquires regarding administrative credentials, private keys, or owner addresses, reply strictly with:
  "Institutional Security Protocol: System credentials, cryptographic master keys, and administrator addresses are strictly segregated under protocol zero-knowledge policies and cannot be disclosed. I am here exclusively to assist you with cloud mining operations, validator activation, and referral analytics."
`;

export function getSmartLocalResponse(message: string): string {
  const lower = (message || '').toLowerCase();

  // Strict Security Policy
  if (
    lower.includes('admin') ||
    lower.includes('master') ||
    lower.includes('private key') ||
    lower.includes('creator') ||
    lower.includes('passcode') ||
    lower.includes('password') ||
    lower.includes('database') ||
    lower.includes('secret') ||
    lower.includes('0x3471') ||
    lower.includes('0xde7b')
  ) {
    return `🔒 **Institutional Security Protocol:**\n\nSystem credentials, cryptographic master keys, and administrator addresses are strictly segregated under protocol zero-knowledge policies and cannot be disclosed.\n\nMain aapki help **Cloud Mining Architecture, Validator Rig Activation, aur Referral Milestone Analytics** me karne ke liye upalabdh hoon. Kripya mining ya account se judi queries poochhein!`;
  }

  // Cloud Mining Benefits & Overview
  if (
    lower.includes('cloud mining') ||
    lower.includes('benefit') ||
    lower.includes('fayde') ||
    lower.includes('faayde') ||
    lower.includes('kya hai') ||
    lower.includes('how it works') ||
    lower.includes('kya hota')
  ) {
    return `⚡ **SPIKE Cloud Mining Protocol — Institutional Benefits:**\n\n1. **Zero Capital Expenditure (CapEx):** Ghar par kisi bhi high-end ASIC machine ya costly GPU hardware ko purchase karne ki avashyakta nahi hai.\n2. **Zero Operating Electricity Cost:** Mining clusters high-efficiency European & US data centers me 24/7 autonomous run hote hain, jisse aapka electricity bill zero rehta hai.\n3. **Autonomous 24/7 Yield Generation:** Rig activate hone ke baad automated **3.88% Daily Compounding Yield** generate hota hai with Turbo 10X acceleration.\n4. **Instant On-Chain Liquidity:** Mined SPIKE tokens ko aap dashboard se instant BEP-20 USDT me convert ya withdraw kar sakte hain.\n5. **BNB Smart Chain Validation:** Sabhi transactions aur rewards BNB Smart Chain ke high-throughput validator consensus dwara secured hain.`;
  }

  // Referral System & Network Verification
  if (
    lower.includes('referral') ||
    lower.includes('refer') ||
    lower.includes('milestone') ||
    lower.includes('team') ||
    lower.includes('sponsor') ||
    lower.includes('downline')
  ) {
    return `👥 **Referral Matrix & Network Verification Guide:**\n\n1. **Unique Cryptographic Code:** Dashboard ke **Referrals** tab me aapka on-chain code (e.g. \`SPK-XXXXXX\`) generate hota hai.\n2. **Live Network Telemetry:**\n   - Dashboard > **Referrals** tab me aap apne saare **Direct Bound Wallets**, unka **Active Mining Status**, aur **Cumulative Team Volume** real-time monitor kar sakte hain.\n3. **Hashrate Speed Acceleration (Multipliers):**\n   - **Level 1 (10 Directs):** 200 VH/s Hashrate (Target mining duration 60 days se ghatkar 30 days ho jata hai).\n   - **Level 2 (100 Total Team):** 400 VH/s Hashrate (Target 15 days me complete).\n   - **Level 3 (1,000 Team):** 600 VH/s Hashrate (Target 10 days me complete).\n4. **Institutional Milestone Rewards:** Direct USDT milestone bonuses (Level 1: $50 USDT, Level 2: $250 USDT, Level 3: $1,000 USDT) seedhe aapke Web3 wallet me claimable hote hain.`;
  }

  // Rig / Node Activation Workflow
  if (
    lower.includes('activate') ||
    lower.includes('rig') ||
    lower.includes('node') ||
    lower.includes('deposit') ||
    lower.includes('shuru') ||
    lower.includes('start') ||
    lower.includes('5$') ||
    lower.includes('10$')
  ) {
    return `🚀 **Validator Rig & Node Activation Protocol:**\n\n1. **Step 1 [Wallet Authentication]:** Apna Web3 Wallet (MetaMask, TrustWallet ya Binance Web3) connect karein aur network **BNB Smart Chain (BEP-20)** select karein.\n2. **Step 2 [Protocol Entry — $5.00 USDT]:** "Deposit / Protocol Entry" option par click karke $5 USDT deposit karein. Isse aapka wallet verify hota hai aur referral link permanently unlock ho jata hai.\n3. **Step 3 [Rig Deployment — $10.00 USDT]:** "Activate Node" par click karein. Aapka dedicated ASIC Cloud Rig instant stratum pool se connect hokar 24-hour mining engine start karega.\n4. **Daily Harvest Cycle:** Har 24 ghante baad dashboard par aakar "Harvest Rewards" claim karein.`;
  }

  // Withdrawals & Payouts
  if (
    lower.includes('withdraw') ||
    lower.includes('claim') ||
    lower.includes('nikal') ||
    lower.includes('payout')
  ) {
    return `💰 **Settlement & Payout Infrastructure:**\n\n• **Continuous Harvest:** Har 24-ghante ke mining cycle ke baad rewards live claimable hote hain.\n• **BEP-20 USDT Settlement:** Mined tokens instantly USDT me swap ho jate hain.\n• **On-Chain Transparency:** Har withdrawal ka real BSC transaction hash create hota hai, jise aap **Withdrawal History** tab me verify kar sakte hain.`;
  }

  // Default Professional Introduction
  return `👋 **Namaste! Welcome to SPIKE Protocol Intelligence.**\n\nMain aapka specialized Web3 Cloud Mining and Validator Guide hoon. Main aapki nimnlikhit vishayon me sahayata kar sakta hoon:\n\n• ⚡ **Cloud Mining Architecture:** Automated 24h hashing aur 3.88% daily yield benefits\n• 👥 **Referral Matrix & Analytics:** Direct bound wallets check karna aur milestone bonuses unlock karna\n• 🚀 **Node & Rig Activation:** Step 1 ($5 USDT Protocol Entry) aur Step 2 ($10 USDT Rig Provisioning)\n• 🔐 **Web3 Infrastructure:** BNB Smart Chain wallet connection aur reward settlement\n\nAap apna sawal neeche type kar sakte hain!`;
}

export async function processAiMiningChat(message: string, language: 'en' | 'hi' = 'en'): Promise<string> {
  const client = getGeminiClient();
  if (!client) {
    return getSmartLocalResponse(message);
  }

  try {
    const langDirective = language === 'hi' 
      ? '\nUser prefers response in professional Hindi / Hinglish.'
      : '\nUser prefers response in professional English.';

    const response = await client.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: message + langDirective,
      config: {
        systemInstruction: AI_SYSTEM_INSTRUCTION,
      },
    });

    const reply = response.text;
    if (!reply || !reply.trim()) {
      return getSmartLocalResponse(message);
    }
    return reply;
  } catch (error) {
    console.warn('[Gemini AI] Falling back to curated response:', error);
    return getSmartLocalResponse(message);
  }
}
