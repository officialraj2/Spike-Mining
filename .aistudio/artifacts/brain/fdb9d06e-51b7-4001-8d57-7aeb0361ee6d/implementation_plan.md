# Implementation Plan: BSC Testnet Testing Guide for SPIKE Token & Web3 Protocol

A comprehensive blueprint explaining exactly what steps and configurations are needed to test the SPIKE token and Web3 mining protocol on BNB Smart Chain (BSC) Testnet to verify that wallet connection, deposit, smart contract calls, balance deduction, and node activation work end-to-end without real funds.

---

## 1. System Architecture & Flow

The testing environment connects your Web3 wallet (MetaMask / Trust Wallet) running on BSC Testnet with the SPIKE DApp, smart contracts, and verification ledger:

```
┌─────────────────────────────────────────────────────────────┐
│                 User MetaMask / Web3 Wallet                 │
│                 (BSC Testnet - Chain ID: 97)                │
└──────────────┬──────────────────────────────▲───────────────┘
               │ 1. Connect & Read Balances   │ 4. MetaMask Approval
               ▼                              │    & Contract Call
┌─────────────────────────────────────────────┴───────────────┐
│                      SPIKE Web3 DApp                        │
│  - Testnet Testing Studio & RPC Switcher                    │
│  - Deposit 5 USDT / SPIKE to Treasury                       │
│  - Node Activation / Harvesting Trigger                     │
│  - Real-Time Balance & Hashing Visualizer                   │
└──────────────┬──────────────────────────────┬───────────────┘
               │ 2. eth_call / approve        │ 3. State & Hashes
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      BSC Testnet Network     │ │      Firestore Ledger      │
│  - SPIKE Token (BEP-20)      │ │  - Active Nodes Rig Data   │
│  - Protocol Treasury Wallet  │ │  - Transaction Records     │
│  - Validator Smart Contract  │ │  - Referral & Yields       │
└──────────────────────────────┘ └────────────────────────────┘
```

---

## 2. Step-by-Step User Action Guide (Testing Kaise Karein)

Aapko testnet par SPIKE token aur poore system ka flow test karne ke liye yeh steps follow karne honge:

### Step 1: MetaMask me BSC Testnet Network Add Karein
1. MetaMask kholein aur network selection me **Add Network** par click karein (ya DApp ke **Web3 Testnet Studio** modal me *"Switch MetaMask to BSC Testnet"* button par click karein).
2. Network details:
   - **Network Name:** BNB Smart Chain Testnet
   - **RPC URL:** `https://data-seed-prebsc-1-s1.binance.org:8545/`
   - **Chain ID:** `97` (hex: `0x61`)
   - **Currency Symbol:** `tBNB`
   - **Block Explorer:** `https://testnet.bscscan.com`

### Step 2: Free Gas Fees (tBNB) Faucet Se Praapt Karein
Smart contract call aur token transfer ke liye gas fees (tBNB) lagti hai:
1. Official faucet URL kholein: `https://testnet.bnbchain.org/faucet-smart`
2. Apna wallet address daalkar **0.1 tBNB** claim karein (yeh bilkul free test BNB hota hai).

### Step 3: Testnet SPIKE Token Setup (Deploy ya Address Bind)
- Agar aapne Remix (`remix.ethereum.org`) par apna standard BEP-20 SPIKE token deploy kiya hai:
  - Contract address copy karein.
  - DApp ke Testnet Studio / Admin panel me apna **Custom SPIKE Token Address** configure karein.
  - Apne test wallet me test SPIKE tokens mint/transfer kar lein.
- Agar aap standard BSC Testnet USDT test kar rahe hain:
  - Official BSC Testnet USDT: `0x337610d27c682E347C9cD60BD4b3b107C9d34dDd`.

### Step 4: Deposit & Node Activation Flow Test Karein
1. **Wallet Connect:** DApp par apna MetaMask BSC Testnet par connect karein.
2. **Deposit 5 USDT:**
   - Header me **Deposit 5 USDT** par click karein.
   - MetaMask popup open hoga -> confirm karein.
   - 5 USDT aapke test wallet se deduct hokar Protocol Treasury wallet me transfer ho jayenge.
   - BscScan Testnet explorer par transaction hash generate hoga.
3. **Node Activation / Harvest Call:**
   - Dashboard ya Mining Nodes view me jaakar **Deploy Rig / Harvest** par click karein.
   - Web3 contract call aayega (`activateNode` ya token deduction transaction).
   - MetaMask confirm karne par specified token amount deduct hogi aur naya Mining Rig online hashing start kar dega.
4. **Uncollected Mined Loot Harvest:**
   - Node run hone ke baad generated loot ko harvest/claim button se claim karke dekhein ki tokens wapas aapke wallet me credit ho rahe hain ya nahi.

---

## 3. Features & DApp Enhancements for Seamless Testing

Aapko testing me aasani dene ke liye DApp me yeh functionalities ready hain:

1. **Custom Token Contract Address Input:**
   - Testnet Studio me ek input box jisme aap apna deployed SPIKE testnet contract address paste kar sakein, taaki DApp usi contract ke functions ko call kare.
2. **Dual Testing Mode:**
   - **Live Web3 BSC Testnet Mode:** Asli MetaMask popup, gas estimation aur BscScan confirmation.
   - **Fast QA Simulator Mode:** Faucet aur instant state changes bina MetaMask confirmation ke test karne ke liye.
3. **Automated BscScan Tx Verification:**
   - Har transaction ke baad direct BscScan Testnet link click karke block confirmation dekhne ki suvidha.

---

## 4. Verification Checklist

- [ ] MetaMask automatically requests switch to BSC Testnet (Chain ID 97)
- [ ] Wallet balance displays correct test tokens and tBNB gas balance
- [ ] Deposit 5 USDT prompts transaction to Protocol Treasury wallet
- [ ] Node activation triggers contract call with appropriate allowance & deduction
- [ ] Hashing rate and active rigs update immediately in dashboard upon confirmation
- [ ] Transaction history records txHash with valid BscScan link
