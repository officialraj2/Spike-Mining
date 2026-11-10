import React, { useState, useRef, useEffect } from 'react';
import { getUserWithdrawals, FirestoreWithdrawalRecord } from '../services/firestoreWithdrawals';

type Language = 'en' | 'hi';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  time: string;
}

// ============================================================
// HARDCODED IMMUTABLE KNOWLEDGE BASE (EN & HI)
// ============================================================
const IMMUTABLE_KNOWLEDGE_BASE = {
  cloud_mining: {
    en: `⚡ **HOW CLOUD MINING WORKS (SPIKE PROTOCOL ARCHITECTURE):**

1. **Decentralized Cloud Hashing:**
   SPIKE operates enterprise-grade ASIC and GPU stratum clusters hosted across high-efficiency European and North American tier-4 data facilities. Users do not need physical hardware at home.

2. **Zero Capital Expenditure & Zero Electric Bills:**
   • No expensive mining machines to purchase.
   • No hardware wear-and-tear or thermal throttling.
   • Zero domestic power overhead; electricity and cooling costs are absorbed by protocol data facilities.

3. **Automated 24-Hour Mining Epochs:**
   Once a mining node is provisioned, the hashing engine runs autonomously 24 hours a day, generating continuous cryptographic share confirmations.

4. **Yield Model (Daily Compounding):**
   • **Daily Base Yield:** **3.88%** per 24-hour cycle.
   • **Turbo Multiplier:** **10X network throughput** secured on BNB Smart Chain validator nodes.
   • **Liquidity:** Mined rewards are claimable in SPIKE tokens and instantly convertible to BEP-20 USDT via the protocol liquidity pool.`,

    hi: `⚡ **CLOUD MINING KAISE KAAM KARTA HAI (SPIKE PROTOCOL GUIDE):**

1. **Decentralized Cloud Hashing:**
   SPIKE ke high-efficiency ASIC aur GPU stratum clusters European aur US data centers me 24/7 host hote hain. Aapko ghar par koi costly machine lagane ki zaroorat nahi hai.

2. **Zero Hardware Kharch & Zero Bijli Ka Bill:**
   • Mehnge hardware ya graphic cards purchase karne ki koi avashyakta nahi.
   • Machines ki servicing ya heating ka koi jhanjhat nahi.
   • Bijli ka bill zero rehta hai kyunki saari power facility data centers dwara manage hoti hai.

3. **24-Ghante ka Automated Mining Cycle:**
   Ek baar Node activate hone ke baad mining engine 24 ghante continuously auto-run karta hai.

4. **Daily Earning & Yield:**
   • **Daily Compounding Yield:** **3.88%** har 24 ghante me.
   • **Turbo 10X Multiplier:** BNB Smart Chain validator consensus par 10X fast block rewards.
   • **Instant USDT Conversion:** Mined SPIKE tokens ko aap dashboard se instant BEP-20 USDT me convert ya withdraw kar sakte hain.`
  },

  referral_logic: {
    en: `👥 **REFERRAL LOGIC & REWARD MATRIX ARCHITECTURE:**

1. **On-Chain Referral Binding:**
   Each user receives a unique cryptographic invitation code (e.g. \`SPK-XXXXXX\`). When a friend connects their Web3 wallet and verifies the connection, they are permanently bound to your referral tree on-chain.

2. **Hashrate Speed Multipliers (Direct & Team Boost):**
   Your personal ASIC hashing speed accelerates dynamically based on your verified partners:
   • **Fresh User (0 Directs):** 100 VH/s Hashrate (Target mining duration: **60 Days**).
   • **Level 1 (10 Directs):** 200 VH/s Hashrate (Mining duration drops to **30 Days**).
   • **Level 2 (100 Team):** 400 VH/s Hashrate (Mining duration drops to **15 Days**).
   • **Level 3 (1,000 Team):** 600 VH/s Hashrate (Mining duration drops to **10 Days**).
   • **Level 4 (5,000 Team):** 857.14 VH/s Hashrate (Mining duration drops to **7 Days**).

3. **Institutional Milestone Cash Bonuses:**
   As your referral network expands, you unlock tiered USDT cash payouts:
   • **Milestone Level 1:** **$50.00 USDT** Direct Cash Bonus.
   • **Milestone Level 2:** **$250.00 USDT** Direct Cash Bonus.
   • **Milestone Level 3:** **$1,000.00 USDT** Direct Cash Bonus.

4. **How to Verify & Track Referrals:**
   Navigate to Dashboard > **Referrals** tab. You can inspect all bound wallet addresses, verify their active mining status, check downline depth, and claim pending milestone payouts.`,

    hi: `👥 **REFERRAL LOGIC AUR NETWORK CHECKING GUIDE:**

1. **On-Chain Referral Binding:**
   Har user ko ek unique code (jaise \`SPK-XXXXXX\`) milta hai. Jab aapka friend apna Web3 wallet connect karke bind karta hai, toh wo permanently aapki team me jud jata hai.

2. **Hashrate Speed Boost (Mining Fast Karein):**
   Aapke direct partners se aapki personal mining speed badhti hai:
   • **Fresh User (0 Directs):** 100 VH/s Speed (Target duration: **60 Din**).
   • **Level 1 (10 Directs):** 200 VH/s Speed (Mining duration ghatkar **30 Din**).
   • **Level 2 (100 Team):** 400 VH/s Speed (Mining duration ghatkar **15 Din**).
   • **Level 3 (1,000 Team):** 600 VH/s Speed (Mining duration ghatkar **10 Din**).
   • **Level 4 (5,000 Team):** 857.14 VH/s Speed (Mining duration sirf **7 Din**!).

3. **Cash Milestone Rewards (USDT Bonuses):**
   Team size badhne par direct cash payouts milte hain:
   • **Level 1 Milestone:** **$50.00 USDT**
   • **Level 2 Milestone:** **$250.00 USDT**
   • **Level 3 Milestone:** **$1,000.00 USDT**

4. **Referral Kaise Check Karein:**
   Dashboard ke **Referrals** tab me jayein. Wahan aapke saare **Direct Bound Wallets**, unka **Active Mining Status**, aur **Cumulative Team Volume** live show hota hai.`
  },

  node_activation: {
    en: `🚀 **VALIDATOR RIG & NODE ACTIVATION PROTOCOL:**

1. **Step 1 [Wallet Authentication]:**
   Connect your Web3 Wallet (MetaMask, TrustWallet, or Binance Web3) on the **BNB Smart Chain (BEP-20)** network.

2. **Step 2 [Protocol Entry — $5.00 USDT]:**
   Click **"Deposit / Protocol Entry"** and transfer $5.00 USDT into the Official Protocol Treasury. This verifies your wallet on-chain and permanently unlocks your unique referral code.

3. **Step 3 [Rig Provisioning — $10.00 USDT]:**
   Click **"Activate Node"**. Your dedicated ASIC cloud stratum rig is instantly deployed to the network pool and commences the automated 24-hour mining cycle.

4. **Step 4 [Daily Harvesting]:**
   Return every 24 hours to the Dashboard to harvest generated SPIKE tokens and swap to USDT.`,

    hi: `🚀 **MINING RIG & NODE ACTIVATE KARNE KA EXACT PROCESS:**

1. **Step 1 [Wallet Connect]:**
   Apna Web3 Wallet (MetaMask, TrustWallet ya Binance Web3) connect karein aur network **BNB Smart Chain (BEP-20)** select karein.

2. **Step 2 [Protocol Entry — $5.00 USDT]:**
   "Deposit / Protocol Entry" par click karke $5.00 USDT deposit karein. Isse aapka wallet on-chain verify hota hai aur referral link unlock ho jata hai.

3. **Step 3 [Rig Activation — $10.00 USDT]:**
   "Activate Node" par click karein. Aapka dedicated ASIC Cloud Rig instant deploy ho jayega aur 24-ghante ki mining cycle start ho jayegi.

4. **Step 4 [Daily Harvest]:**
   Har 24 ghante baad dashboard par aakar "Harvest Rewards" claim karein aur USDT me swap karein.`
  },

  harvest_settlement: {
    en: `💰 **SETTLEMENT, HARVEST & TOKENOMICS:**

• **24-Hour Cycle Settlement:** Mining rewards calculate every block and finalize at the end of each 24-hour epoch.
• **Instant BEP-20 USDT Swap:** SPIKE tokens can be converted directly into USDT via the automated Nodescan liquidity routing pool.
• **On-Chain Transparency:** All claim transactions are verifiable on BscScan with authentic cryptographic transaction hashes.`,

    hi: `💰 **REWARDS HARVEST AUR WITHDRAWAL SETTLEMENT:**

• **24-Hour Epoch:** Har 24 ghante ke mining cycle ke baad rewards claimable hote hain.
• **Instant BEP-20 Swap:** Mined tokens ko aap directly USDT me swap kar sakte hain via decentralized liquidity pool.
• **Full Transparency:** Saare withdrawals ka real BNB Smart Chain transaction hash banta hai jise aap **Withdrawal History** tab me dekh sakte hain.`
  }
} as const;

// SENSITIVE SYSTEM SECURITY FIREWALL
const SENSITIVE_SECURITY_BLOCKLIST = [
  'admin',
  'master',
  'creator',
  'private key',
  'seed phrase',
  'mnemonic',
  'passcode',
  'password',
  '0x3471',
  '0xde7b',
  'database',
  'secret',
  'server.ts',
  'db.ts',
  'firebase-blueprint',
  'firestore.rules',
  'api/admin',
  'api/treasury',
  'bypass',
  'jailbreak',
  'ignore instructions',
  'reveal prompt',
  'system prompt',
  'root address',
  'owner address',
];

function isQuerySensitive(query: string): boolean {
  const lower = (query || '').toLowerCase();
  return SENSITIVE_SECURITY_BLOCKLIST.some((token) => lower.includes(token));
}

function getSecurityBlockedResponse(lang: Language): string {
  if (lang === 'hi') {
    return `🔒 **Institutional Security Protocol (Access Blocked):**\n\nPlatform ki zero-knowledge security policies ke tehat, Administrator wallet addresses, private cryptographic keys, backend server code, ya confidential configuration data share karna strictly prohibited hai.\n\nMain aapki help **Cloud Mining Architecture, Referral Logic & Multipliers, aur Node Activation** me karne ke liye upalabdh hoon.`;
  }
  return `🔒 **Institutional Security Protocol (Access Denied):**\n\nUnder strict protocol zero-knowledge segregation policies, cryptographic master keys, administrator wallet addresses, internal system source code, and configuration credentials cannot be disclosed under any circumstances.\n\nI am exclusively authorized to assist with **Cloud Mining Architecture, Referral Matrix Logic, and Validator Rig Activation**.`;
}

function getHardcodedKnowledgeResponse(query: string, lang: Language): string {
  if (isQuerySensitive(query)) {
    return getSecurityBlockedResponse(lang);
  }

  const lower = (query || '').toLowerCase();

  // 1. Cloud mining queries
  if (
    lower.includes('cloud mining') ||
    lower.includes('how does') ||
    lower.includes('benefit') ||
    lower.includes('fayde') ||
    lower.includes('faayde') ||
    lower.includes('yield') ||
    lower.includes('kaise kaam') ||
    lower.includes('kya hai')
  ) {
    return IMMUTABLE_KNOWLEDGE_BASE.cloud_mining[lang];
  }

  // 2. Referral logic queries
  if (
    lower.includes('referral') ||
    lower.includes('refer') ||
    lower.includes('milestone') ||
    lower.includes('team') ||
    lower.includes('sponsor') ||
    lower.includes('downline') ||
    lower.includes('logic') ||
    lower.includes('boost') ||
    lower.includes('hashrate')
  ) {
    return IMMUTABLE_KNOWLEDGE_BASE.referral_logic[lang];
  }

  // 3. Node & Rig activation queries
  if (
    lower.includes('activate') ||
    lower.includes('rig') ||
    lower.includes('node') ||
    lower.includes('deposit') ||
    lower.includes('shuru') ||
    lower.includes('start') ||
    lower.includes('5$') ||
    lower.includes('10$') ||
    lower.includes('step')
  ) {
    return IMMUTABLE_KNOWLEDGE_BASE.node_activation[lang];
  }

  // 4. Harvest & Settlement
  if (
    lower.includes('harvest') ||
    lower.includes('claim') ||
    lower.includes('withdraw') ||
    lower.includes('swap') ||
    lower.includes('settle') ||
    lower.includes('nikal')
  ) {
    return IMMUTABLE_KNOWLEDGE_BASE.harvest_settlement[lang];
  }

  // Default welcome response
  if (lang === 'hi') {
    return `👋 **Namaste! SPIKE Protocol Intelligence me aapka swagat hai.**\n\nMain aapka specialized Web3 Cloud Mining and Validator Guide hoon. Kripya apna sawal select karein ya type karein:\n\n• ⚡ **Cloud Mining Architecture:** Automated 24h hashing aur 3.88% daily yield benefits\n• 👥 **Referral Matrix Logic:** Direct bound wallets check karna aur milestone bonuses unlock karna\n• 🚀 **Node & Rig Activation:** Step 1 ($5 USDT Protocol Entry) aur Step 2 ($10 USDT Rig Provisioning)\n• 💰 **Settlement & Payouts:** Daily reward harvesting aur on-chain USDT swap`;
  }

  return `👋 **Welcome to SPIKE Protocol Intelligence.**\n\nI am your specialized Web3 Cloud Mining and Validator Guide. Please select a topic or enter your inquiry below:\n\n• ⚡ **Cloud Mining Architecture:** Automated 24h hashing and 3.88% daily compounding yield\n• 👥 **Referral Matrix Logic:** On-chain code binding, speed multipliers (up to 857.14 VH/s), and milestone payouts\n• 🚀 **Node Provisioning Workflow:** Step 1 ($5 Protocol Entry) and Step 2 ($10 Rig Activation)\n• 💰 **Settlement & Tokenomics:** 24-hour harvest cycles and instant BEP-20 USDT swaps`;
}

// Live personalized withdrawal inquiry handler
async function getLiveWithdrawalStatusResponse(userAddress: string | null, lang: Language): Promise<string> {
  if (!userAddress) {
    if (lang === 'hi') {
      return `🔍 **Withdrawal Status Inquiry:**\n\nAapka Web3 Wallet filhal connect nahi hai.\n\n1. Top-right corner se apna **Web3 Wallet connect** karein (MetaMask, TrustWallet, ya Binance Web3).\n2. Wallet connect hone ke baad aapka live withdrawal status yahan turant show ho jayega.\n3. Ya aap Dashboard me **"Withdrawal History"** tab par click karke apne sabhi on-chain payouts track kar sakte hain.`;
    }
    return `🔍 **Withdrawal Status Inquiry:**\n\nNo Web3 wallet is currently connected.\n\n1. Please connect your Web3 wallet (MetaMask / TrustWallet / Binance Web3).\n2. Once connected, your personal withdrawal queue and confirmation telemetry will display here.\n3. You can also inspect full historical receipts under the **Withdrawal History** tab in the dashboard.`;
  }

  const norm = userAddress.toLowerCase().trim();
  const shortAddr = `${norm.slice(0, 6)}...${norm.slice(-4)}`;

  try {
    const records = await getUserWithdrawals(norm);

    if (!records || records.length === 0) {
      if (lang === 'hi') {
        return `🔍 **Live Withdrawal Status Telemetry:**\n• **Connected Wallet:** \`${shortAddr}\`\n• **Total Requests:** 0 (No active records)\n\nAapke is wallet se abhi tak koi withdrawal request submit nahi hui hai.\n\n• **Withdrawal Kaise Karein:** Dashboard me jakar mined SPIKE tokens ya Team Milestone bonus ko **"Claim / Withdraw"** karein.\n• Request submit hote hi wo yahan aur **Withdrawal History** tab me live track hona shuru ho jayega.`;
      }
      return `🔍 **Live Withdrawal Status Telemetry:**\n• **Connected Wallet:** \`${shortAddr}\`\n• **Total Records:** 0 (No active requests)\n\nNo withdrawal requests were found for this wallet.\n\n• **How to Initiate:** Claim your mined SPIKE or Team Milestone bonuses from the Dashboard.\n• Once submitted, transactions enter the validator consensus queue and can be monitored under the **Withdrawal History** tab.`;
    }

    const latest = records[0];
    const pendingCount = records.filter((r) => r.status === 'pending').length;
    const approvedCount = records.filter((r) => r.status === 'approved').length;
    const rejectedCount = records.filter((r) => r.status === 'rejected').length;

    let statusDescription = '';

    if (latest.status === 'pending') {
      if (lang === 'hi') {
        statusDescription = `⏳ **Latest Request: PENDING (Validator Verification Queue)**\n• **Amount:** **$${latest.amount.toFixed(2)} USDT**\n• **Source:** ${latest.milestoneLabel || latest.source || 'Milestone Rewards'}\n• **Request ID:** \`${latest.id}\`\n• **Date:** ${new Date(latest.createdAt).toLocaleDateString()}\n• **Status Note:** Aapka withdrawal request currently validator queue me hai. On-chain validation aur review ke baad funds seedhe aapke destination wallet me transfer kar diye jayenge.`;
      } else {
        statusDescription = `⏳ **Latest Request: PENDING (Validator Consensus Queue)**\n• **Amount:** **$${latest.amount.toFixed(2)} USDT**\n• **Source:** ${latest.milestoneLabel || latest.source || 'Milestone Rewards'}\n• **Request ID:** \`${latest.id}\`\n• **Date:** ${new Date(latest.createdAt).toLocaleDateString()}\n• **Details:** Your withdrawal request is queued for on-chain verification. Funds will be dispatched automatically upon consensus confirmation.`;
      }
    } else if (latest.status === 'approved') {
      if (lang === 'hi') {
        statusDescription = `✅ **Latest Request: APPROVED & CONFIRMED (Payout Completed)**\n• **Amount:** **$${latest.amount.toFixed(2)} USDT**\n• **Transaction Hash (TxID):** \`${latest.txHash || 'Confirmed on BNB Smart Chain'}\`\n• **Date:** ${new Date(latest.createdAt).toLocaleDateString()}\n• **Status Note:** Payout successfully execute ho chuka hai! Aap BscScan explorer par on-chain confirmation verify kar sakte hain.`;
      } else {
        statusDescription = `✅ **Latest Request: APPROVED & DISPATCHED (Completed)**\n• **Amount:** **$${latest.amount.toFixed(2)} USDT**\n• **Transaction Hash (TxID):** \`${latest.txHash || 'Confirmed on BNB Smart Chain'}\`\n• **Date:** ${new Date(latest.createdAt).toLocaleDateString()}\n• **Details:** Payout successfully settled. You may inspect the cryptographic receipt on BscScan.`;
      }
    } else {
      if (lang === 'hi') {
        statusDescription = `❌ **Latest Request: REJECTED / DECLINED**\n• **Amount:** **$${latest.amount.toFixed(2)} USDT**\n• **Reason:** ${latest.adminNote || 'Validation mismatch'}\n• **Status Note:** Kripya platform withdrawal guidelines check karein ya support team se sampark karein.`;
      } else {
        statusDescription = `❌ **Latest Request: DECLINED**\n• **Amount:** **$${latest.amount.toFixed(2)} USDT**\n• **Reason:** ${latest.adminNote || 'Validation mismatch'}`;
      }
    }

    if (lang === 'hi') {
      return `🔍 **Aapka Live Withdrawal Status:**\n• **Connected Wallet:** \`${shortAddr}\`\n• **Summary:** Total: ${records.length} | Pending: ${pendingCount} | Approved: ${approvedCount} | Rejected: ${rejectedCount}\n\n${statusDescription}\n\n💡 *Puri historical receipts dekhne ke liye Dashboard me **Withdrawal History** tab check karein.*`;
    }

    return `🔍 **Your Live Withdrawal Status:**\n• **Connected Wallet:** \`${shortAddr}\`\n• **Summary:** Total: ${records.length} | Pending: ${pendingCount} | Approved: ${approvedCount} | Rejected: ${rejectedCount}\n\n${statusDescription}\n\n💡 *Navigate to the **Withdrawal History** tab in your dashboard for complete ledger records.*`;
  } catch (err) {
    if (lang === 'hi') {
      return `🔍 **Withdrawal Telemetry:**\n\nAapka connected wallet: \`${shortAddr}\`.\nLive records check karne ke liye Dashboard me **Withdrawal History** tab par click karein.`;
    }
    return `🔍 **Withdrawal Telemetry:**\n\nConnected wallet: \`${shortAddr}\`.\nPlease review the **Withdrawal History** tab in the dashboard for real-time status.`;
  }
}

// Professional Hexagonal Neural Core Vector Emblem
const SpikeAiLogoIcon: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`filter drop-shadow-[0_0_8px_rgba(0,240,255,0.6)] ${className}`}
  >
    <defs>
      <linearGradient id="spikeAiGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00F0FF" />
        <stop offset="50%" stopColor="#00A3FF" />
        <stop offset="100%" stopColor="#D4AF37" />
      </linearGradient>
      <linearGradient id="spikeAiInner2" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#00F0FF" stopOpacity="0.8" />
      </linearGradient>
    </defs>
    <path
      d="M24 4L41.32 14V34L24 44L6.68 34V14L24 4Z"
      stroke="url(#spikeAiGrad2)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M24 12L34.39 18V30L24 36L13.61 30V18L24 12Z"
      fill="#071322"
      stroke="url(#spikeAiInner2)"
      strokeWidth="1.8"
      strokeDasharray="2 1.5"
    />
    <circle cx="24" cy="24" r="4.5" fill="#00F0FF" className="animate-pulse" />
    <circle cx="24" cy="24" r="2" fill="#FFFFFF" />
    <line x1="24" y1="4" x2="24" y2="12" stroke="#00F0FF" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="24" y1="36" x2="24" y2="44" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="6.68" y1="14" x2="13.61" y2="18" stroke="#00F0FF" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="41.32" y1="34" x2="34.39" y2="30" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const AiMiningAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState<Language>(() => {
    try {
      return (localStorage.getItem('spike_ai_lang') as Language) || 'en';
    } catch {
      return 'en';
    }
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'assistant',
      text: getHardcodedKnowledgeResponse('', language),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, isOpen]);

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    try {
      localStorage.setItem('spike_ai_lang', newLang);
    } catch {}

    // Add language switch confirmation
    const switchMsg: ChatMessage = {
      id: `lang-${Date.now()}`,
      sender: 'assistant',
      text: newLang === 'hi'
        ? `🇮🇳 **Bhasha badal kar Hindi / Hinglish kar di gayi hai.**\n\nAb aap Cloud Mining ke benefits, Referral logic, ya Node activation se jude sawal poochh sakte hain!`
        : `🇬🇧 **Language switched to English.**\n\nFeel free to explore our immutable knowledge base on Cloud Mining architecture, Referral matrix, or Node provisioning.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, switchMsg]);
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || inputValue).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputValue('');
    setIsLoading(true);

    try {
      // 1. FIRST DEFENSE: If query touches sensitive data or matches hardcoded knowledge base, answer INSTANTLY
      if (isQuerySensitive(textToSend)) {
        const securityMsg: ChatMessage = {
          id: `bot-sec-${Date.now()}`,
          sender: 'assistant',
          text: getSecurityBlockedResponse(language),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, securityMsg]);
        setIsLoading(false);
        return;
      }

      // 2. LIVE WITHDRAWAL STATUS INQUIRY (Personalized on-chain lookup)
      const lower = textToSend.toLowerCase();
      const isWithdrawalStatusQuery =
        (lower.includes('withdr') ||
          lower.includes('withdraw') ||
          lower.includes('widraw') ||
          lower.includes('payout') ||
          lower.includes('nikal')) &&
        (lower.includes('status') ||
          lower.includes('mera') ||
          lower.includes('meri') ||
          lower.includes('my') ||
          lower.includes('kab') ||
          lower.includes('check') ||
          lower.includes('kahan') ||
          lower.includes('kya hai') ||
          lower.includes('pending') ||
          lower.includes('history') ||
          lower.includes('kimmera') ||
          lower.includes('update') ||
          lower.includes('batao') ||
          lower.includes('btao') ||
          lower.includes('dikhao') ||
          lower.includes('aayega') ||
          lower.includes('ayega'));

      if (isWithdrawalStatusQuery) {
        const activeWallet = localStorage.getItem('spike_wallet_address');
        const withdrawalReply = await getLiveWithdrawalStatusResponse(activeWallet, language);
        const botMsg: ChatMessage = {
          id: `bot-wdr-${Date.now()}`,
          sender: 'assistant',
          text: withdrawalReply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);
        setIsLoading(false);
        return;
      }

      // 3. Check if query matches core hardcoded knowledge topics
      const isCoreTopic =
        lower.includes('cloud mining') ||
        lower.includes('referral') ||
        lower.includes('activate') ||
        lower.includes('rig') ||
        lower.includes('node') ||
        lower.includes('harvest') ||
        lower.includes('fayde') ||
        lower.includes('benefit') ||
        lower.includes('logic');

      if (isCoreTopic) {
        // Instant response from hardcoded knowledge base
        const hardcodedReply = getHardcodedKnowledgeResponse(textToSend, language);
        const botMsg: ChatMessage = {
          id: `bot-kb-${Date.now()}`,
          sender: 'assistant',
          text: hardcodedReply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);
        setIsLoading(false);
        return;
      }

      // 2. FOR GENERAL QUERIES: Query backend Gemini API with fast 1.5s timeout
      let botReply = '';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: textToSend, language }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.reply) {
            botReply = data.reply;
          }
        }
      } catch {
        clearTimeout(timeoutId);
      }

      if (!botReply) {
        botReply = getHardcodedKnowledgeResponse(textToSend, language);
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: botReply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const fallbackMsg: ChatMessage = {
        id: `bot-fallback-${Date.now()}`,
        sender: 'assistant',
        text: getHardcodedKnowledgeResponse(textToSend, language),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: getHardcodedKnowledgeResponse('', language),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const PROMPT_CHIPS = language === 'hi'
    ? [
        { label: '🔍 Mera Withdrawal Status', query: 'Mera withdrawal status kya hai?' },
        { label: '⚡ Cloud Mining Kaise Kaam Karta Hai?', query: 'Cloud Mining kaise kaam karta hai aur iske kya fayde hain?' },
        { label: '👥 Referral Logic & Check Guide', query: 'Referral logic kaise kaam karta hai aur milestone rewards kaise milte hain?' },
        { label: '🚀 Node Activation Workflow ($5 + $10)', query: 'Mining Rig aur Node activate karne ka exact process kya hai?' },
        { label: '💰 Daily Yield & USDT Harvest', query: 'Daily rewards aur withdrawal settlement kaise hoti hai?' },
      ]
    : [
        { label: '🔍 My Withdrawal Status', query: 'What is my withdrawal status?' },
        { label: '⚡ How Cloud Mining Works', query: 'How does cloud mining work and what are the benefits?' },
        { label: '👥 Referral Logic & Matrix', query: 'Explain the referral logic, multipliers, and milestone rewards' },
        { label: '🚀 Node Activation Protocol ($5 + $10)', query: 'What are the steps to activate a mining node and ring?' },
        { label: '💰 Daily Compounding Yield & Harvest', query: 'How does daily yield harvest and settlement work?' },
      ];

  return (
    <>
      {/* Floating Launcher Button - positioned above mobile bottom bar (bottom-[74px] on mobile, bottom-6 on desktop) */}
      <div className="fixed bottom-[74px] sm:bottom-6 right-3 sm:right-6 z-[70]">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2 sm:gap-3 px-3 sm:pl-3 sm:pr-4 py-2 sm:py-2.5 rounded-full bg-[#071322]/95 backdrop-blur-xl border border-[#00F0FF]/50 text-white shadow-[0_4px_25px_rgba(0,240,255,0.35)] hover:border-[#D4AF37] hover:shadow-[0_4px_30px_rgba(212,175,55,0.4)] transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95"
            title="Open SPIKE Protocol Intelligence"
          >
            <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#00F0FF]/35 to-[#D4AF37]/35 blur-sm opacity-75 group-hover:opacity-100 transition duration-300 pointer-events-none" />

            <div className="relative flex items-center justify-center">
              <SpikeAiLogoIcon size={26} className="sm:w-[30px] sm:h-[30px]" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#071322] animate-pulse" />
            </div>

            <div className="relative text-left font-sans">
              <div className="text-[11px] sm:text-[12px] font-extrabold tracking-wide flex items-center gap-1 sm:gap-1.5 font-headline">
                <span className="bg-gradient-to-r from-white via-cyan-100 to-[#00F0FF] bg-clip-text text-transparent">
                  AI Guide
                </span>
                <span className="text-[8.5px] sm:text-[9px] px-1 sm:px-1.5 py-0.2 rounded-full bg-cyan-950/80 text-[#00F0FF] border border-[#00F0FF]/30 font-mono">
                  {language === 'hi' ? 'हिंदी' : 'EN'}
                </span>
              </div>
              <div className="hidden sm:flex text-[10px] text-[#94a3b8] group-hover:text-amber-300 transition-colors font-mono items-center gap-1">
                <span>Autonomous Mining Guide</span>
              </div>
            </div>
          </button>
        )}
      </div>

      {/* Expanded Chat Modal / Window - Full bottom sheet on mobile, floating widget on desktop */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-6 sm:right-6 z-[80] w-full sm:w-[440px] h-[88dvh] sm:h-[600px] max-h-[92dvh] sm:max-h-[88vh] bg-[#071322]/98 backdrop-blur-2xl border-t sm:border border-[#00F0FF]/40 rounded-t-3xl sm:rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.9),0_0_40px_rgba(0,240,255,0.25)] flex flex-col overflow-hidden transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in">
          {/* Mobile Sheet Handle */}
          <div className="pt-2 pb-1 flex justify-center sm:hidden bg-gradient-to-r from-[#0a1e33] via-[#081829] to-[#06121f]">
            <div className="w-10 h-1 rounded-full bg-slate-600" />
          </div>

          {/* Header */}
          <div className="px-4 py-2.5 sm:py-3 bg-gradient-to-r from-[#0a1e33] via-[#081829] to-[#06121f] border-b border-[#1b344d] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <SpikeAiLogoIcon size={34} />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#071322] animate-pulse" />
              </div>
              <div>
                <div className="text-sm font-extrabold text-white font-headline flex items-center gap-2">
                  <span>SPIKE Protocol Intelligence</span>
                </div>
                <div className="text-[10.5px] text-emerald-400 font-mono flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Decentralized Knowledge Base • Online</span>
                </div>
              </div>
            </div>

            {/* Language Selector + Controls */}
            <div className="flex items-center gap-1.5">
              {/* Language Switcher Segment */}
              <div className="flex items-center bg-[#050e18] p-0.5 rounded-lg border border-[#1b344d]">
                <button
                  onClick={() => handleLanguageChange('en')}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded font-bold transition-all ${
                    language === 'en'
                      ? 'bg-[#00F0FF] text-[#071322] shadow-[0_0_10px_rgba(0,240,255,0.5)]'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                  title="Switch to English"
                >
                  EN
                </button>
                <button
                  onClick={() => handleLanguageChange('hi')}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded font-bold transition-all ${
                    language === 'hi'
                      ? 'bg-[#D4AF37] text-[#071322] shadow-[0_0_10px_rgba(212,175,55,0.5)]'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                  title="Switch to Hindi / Hinglish"
                >
                  हिंदी
                </button>
              </div>

              <button
                onClick={handleClearChat}
                className="w-7 h-7 rounded-lg bg-[#0e2133] text-[#94a3b8] hover:text-[#00F0FF] hover:bg-[#152e47] transition-all flex items-center justify-center text-xs"
                title="Reset Chat"
              >
                <span className="material-symbols-outlined text-[15px]">refresh</span>
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg bg-[#0e2133] text-[#94a3b8] hover:text-white hover:bg-[#152e47] transition-all flex items-center justify-center text-xs"
                title="Minimize"
              >
                <span className="material-symbols-outlined text-[17px]">close</span>
              </button>
            </div>
          </div>

          {/* Language Selection Notice Banner */}
          <div className="px-4 py-1.5 bg-[#050e18] border-b border-[#13283c] flex items-center justify-between text-[10px] font-mono text-[#94a3b8]">
            <span className="flex items-center gap-1.5">
              <span className="text-[#00F0FF]">🌐</span>
              <span>
                {language === 'hi' ? 'Bhasha: हिंदी / Hinglish (Selected)' : 'Language: English (Selected)'}
              </span>
            </span>
            <span className="text-[9px] text-[#64748b]">Immutable Knowledge Base</span>
          </div>

          {/* Categorized Executive Prompt Pills */}
          <div className="px-3 py-2 bg-[#050e18] border-b border-[#13283c] flex items-center gap-2 overflow-x-auto no-scrollbar">
            {PROMPT_CHIPS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(item.query)}
                disabled={isLoading}
                className="whitespace-nowrap px-3 py-1 rounded-full text-[10.5px] font-mono bg-[#091b2c] border border-[#1b3a56] text-[#94a3b8] hover:text-[#00F0FF] hover:border-[#00F0FF]/60 hover:bg-[#0c243a] transition-all flex-shrink-0 active:scale-95"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs font-sans">
            {messages.map((m) => {
              const isAssistant = m.sender === 'assistant';
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2.5 ${isAssistant ? '' : 'flex-row-reverse'}`}
                >
                  {isAssistant && (
                    <div className="mt-1 flex-shrink-0">
                      <SpikeAiLogoIcon size={24} />
                    </div>
                  )}

                  <div
                    className={`relative max-w-[86%] rounded-2xl p-3.5 leading-relaxed shadow-md ${
                      isAssistant
                        ? 'bg-[#091b2c]/90 border border-[#1b3a56] text-[#e2e8f0]'
                        : 'bg-gradient-to-r from-[#00F0FF]/20 via-[#00A3FF]/20 to-[#0055FF]/20 border border-[#00F0FF]/50 text-white ml-auto'
                    }`}
                  >
                    <div className="whitespace-pre-line text-xs font-mono leading-relaxed select-text">
                      {m.text}
                    </div>

                    {isAssistant && (m.text.includes('Withdrawal History') || m.text.includes('Withdrawal Status') || m.text.includes('Withdrawal Telemetry')) && (
                      <button
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('spike_switch_tab', { detail: { tab: 'withdraw-history' } }));
                          setIsOpen(false);
                        }}
                        className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-blue-500/20 border border-amber-400/40 hover:border-amber-400 text-amber-300 hover:text-white font-mono text-[11px] font-bold transition-all shadow-[0_0_15px_rgba(212,175,55,0.15)] active:scale-95 group"
                      >
                        <span className="material-symbols-outlined text-[14px] text-amber-400 group-hover:scale-110 transition-transform">receipt_long</span>
                        <span>{language === 'hi' ? 'Withdrawal History Kholein ➔' : 'Open Withdrawal History ➔'}</span>
                      </button>
                    )}

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5 text-[9px] font-mono text-[#64748b]">
                      <span>{m.time}</span>
                      {isAssistant && (
                        <button
                          onClick={() => handleCopyText(m.id, m.text)}
                          className="hover:text-[#00F0FF] transition-colors flex items-center gap-1"
                          title="Copy text"
                        >
                          <span className="material-symbols-outlined text-[12px]">
                            {copiedId === m.id ? 'check' : 'content_copy'}
                          </span>
                          <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2.5 text-[#00F0FF] text-xs font-mono bg-[#091b2c]/80 border border-[#1b3a56] rounded-2xl px-4 py-2.5 w-fit">
                <SpikeAiLogoIcon size={18} className="animate-spin" />
                <span className="tracking-wide">
                  {language === 'hi' ? 'Knowledge base se process ho raha hai...' : 'Retrieving from protocol knowledge base...'}
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Institutional Security Notice Footer */}
          <div className="px-4 py-1.5 bg-[#050e18] border-t border-[#122538] text-[9.5px] font-mono text-[#64748b] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[12px] text-amber-400">lock</span>
              <span>Zero-Knowledge Isolation • Confidential Data Strictly Protected</span>
            </span>
            <span className="text-[#00F0FF] font-bold">BNB Chain</span>
          </div>

          {/* Prompt Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 pb-5 sm:pb-3 bg-[#081726] border-t border-[#18314a] flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                language === 'hi'
                  ? 'Cloud Mining, Referral logic, ya Node activation ke baare me poochhein...'
                  : 'Ask about Cloud Mining, Referral logic, or Node activation...'
              }
              className="flex-1 bg-[#050e18] border border-[#1a3652] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#64748b] font-sans focus:outline-none focus:border-[#00F0FF] transition-all"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00F0FF] via-[#00C2FF] to-[#0095FF] text-[#071322] font-bold text-xs flex items-center gap-1 hover:shadow-[0_0_20px_rgba(0,240,255,0.5)] disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">send</span>
            </button>
          </form>
        </div>
      )}
    </>
  );
};
