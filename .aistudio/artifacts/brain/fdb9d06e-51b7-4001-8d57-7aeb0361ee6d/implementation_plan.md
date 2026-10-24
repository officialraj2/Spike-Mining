# Permanent Mining State & Income Persistence Architecture

## Summary
An end-to-end persistence engine that guarantees once a user activates mining (5 USDT deposit or 10 USDT node deployment), their active rigs, real-time accumulated yields, claimed SPIKE/USDT balances, and 24-hour countdown timer never wash away or reset on page reload. Employs a triple-redundant architecture combining instant browser storage, backend ACID JSON storage, and cloud Firestore synchronization.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were established through user clarification and requirements analysis:
> - **24-Hour Timer Persistence**: Countdown calculates elapsed wall-clock seconds from the initial start timestamp (`spike_cycle_start_${address}`). Reloading mid-cycle seamlessly continues from the exact remaining duration without resetting to 24h or freezing.
> - **Triple-Layer Data Redundancy**: 
>   1. *Layer 1 (Client Cache)*: Wallet-keyed `localStorage` ensures zero flicker, instant state hydration, and multi-tab sync.
>   2. *Layer 2 (Backend Engine)*: Server-side JSON database (`.data/spike_database.json`) records transactions, nodes, balances, and treasury metrics with atomic file locking.
>   3. *Layer 3 (Cloud Firestore)*: Asynchronous synchronization to `ai-studio-spikeweb3cryptom-...` Firestore collections (`users`, `nodes`, `transactions`, `settings`) for cloud resilience across environments.
> - **Permanent Node Binding**: Once a user deposits 5 USDT or deploys a 10 USDT rig, the user record is permanently flagged with `hasActivatedMining: true` and `hasDepositedTreasury: true`. The backend `/api/user/:address` endpoint will always return their active rigs even if the client cache is cleared.

---

## 1. Overview & Core Concept

- **What It Does**: Eliminates all risk of state loss on page refresh. When a user connects their wallet, the application immediately merges cached local data with the server database and Firestore. Any mining node activated, transaction confirmed, or SPIKE tokens harvested remain permanently linked to that wallet address.
- **Target Persona**: Miners and team builders on the SPIKE protocol who need complete confidence that their investments, mining hardware, and daily yields are secure, verifiable, and persistent across devices and sessions.
- **Key Value**: 100% session durability—no wiped rigs, no lost earnings, and seamless continuation of the 24-hour mining cycle.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Wallet Connection & State Hydration**:
   - User connects their Web3 wallet.
   - The app immediately hydrates cached balances, nodes, and referral stats from `localStorage` within 5ms.
   - Concurrently queries `GET /api/user/:address` to fetch the authoritative database state.
   - If server records show higher earnings, new referrals, or active nodes, state upgrades smoothly with zero visual layout shift.
2. **5 USDT Treasury Deposit & Mining Initialization**:
   - User completes the 5 USDT deposit modal.
   - Client records `spike_mining_active_${address} = true` and `spike_cycle_start_${address} = Date.now()`.
   - Backend `POST /api/treasury/deposit` flags `user.hasDepositedTreasury = true`, credits the treasury, and generates the active ASIC rig in the database.
   - User reloads the browser at any point: the mining engine remains active, the 24h timer displays the exact elapsed time, and the 3D medallion continues running.
3. **24-Hour Cycle Completion & Harvest**:
   - When 86,400 seconds elapse, mining halts automatically as designed.
   - User clicks **Claim SPK & Restart 24h Mining**.
   - PancakeSwap router swap completes, crediting SPK to the user's balance.
   - Backend `POST /api/user/sync-balance` updates the database and Firestore with the new SPK and USDT balances.
   - Next 24h cycle timer is recorded and persisted; subsequent reloads display the fresh running cycle.
4. **Deploy Additional Titan Nodes ($10 USDT)**:
   - User deploys a new node via `DeployNodeModal`.
   - Backend `POST /api/mining/activate` deducts 10 USDT, credits treasury, provisions the new node, and records the transaction.
   - Rigs are saved both in `.data/spike_database.json` and Firestore `nodes/{id}`.

### Visual Polish & Reliability Indicators
- Clean synchronization status badge in the UI (green live indicator showing database connectivity).
- Instant fallback hydration prevents zero-balance flashes during network queries.
- Strict numeric validation prevents `NaN` or `null` balance states.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Elapsed Wall-Clock Time vs. Tick-Based Timer**
  - *Chosen Approach*: Storing the initial cycle start timestamp (`Date.now()`) and calculating `remaining = 86400 - Math.floor((Date.now() - startTime) / 1000)`.
  - *Why*: Immune to browser throttling, background tab freezing, and page reloads.
- **Decision 2: Client-Server Conflict Resolution**
  - *Chosen Approach*: Highest confirmed balance / node count takes precedence. If client has local records of a recent swap or claim that the server has not yet received, client pushes synchronization via `/api/user/sync-balance` and `/api/nodes/sync`.
  - *Why*: Protects user earnings during transient network interruptions.
- **Decision 3: Firestore Quota Defense**
  - *Chosen Approach*: Local JSON database acts as the primary immediate persistence layer, with non-blocking fire-and-forget sync to Firestore.
  - *Why*: Ensures the application functions with zero downtime even if Firestore daily free-tier quotas are reached.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (REACT SPA)                           │
│  • Wallet Connection & Multi-Tab Event Broadcaster                     │
│  • LocalStorage Hydration (spike_bal_*, spike_nodes_*, spike_cycle_*)  │
│  • Live Mining Engine & 24h Wall-Clock Countdown                       │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   │ 1. Local Cache                  │ 2. REST API Sync
                   ▼                                 ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│       BROWSER LOCALSTORAGE           │  │    EXPRESS BACKEND SERVER    │
│  • Scoped per wallet address         │  │  • /api/user/:address        │
│  • Sub-millisecond instant render    │  │  • /api/user/sync-balance    │
│  • Preserves active cycle timestamps │  │  • /api/treasury/deposit     │
└──────────────────────────────────────┘  │  • /api/mining/activate      │
                                          │  • /api/nodes/sync           │
                                          └──────────────┬───────────────┘
                                                         │
                                    ┌────────────────────┴────────────────────┐
                                    ▼                                         ▼
                     ┌─────────────────────────────┐           ┌─────────────────────────────┐
                     │   SERVER JSON ACID DB       │           │   CLOUD FIRESTORE           │
                     │   (.data/spike_database.json)│◄─────────►│   (ai-studio-spikeweb3)     │
                     │   • users table             │           │   • users/{address}         │
                     │   • nodes table             │           │   • nodes/{id}              │
                     │   • transactions table      │           │   • settings/global_config  │
                     │   • treasury state          │           │   • referrals/{id}          │
                     └─────────────────────────────┘           └─────────────────────────────┘
```

### Data Entities & Schema Mapping
1. **User Record (`users` collection / `db.users`)**:
   - `address`: EVM address (lowercase normalized).
   - `balanceUsdt`: Real-time available USDT balance.
   - `balanceSpk`: Claimed SPIKE token holdings.
   - `balanceBnb`: Gas balance.
   - `hasActivatedMining`: Boolean flag ensuring rigs are never wiped.
   - `hasDepositedTreasury`: Boolean flag for 5 USDT entry verification.
   - `miningCycleStartTime`: Epoch millisecond timestamp of current 24h run.
   - `referralCode` & `referredBy`: Permanent referral bond.
2. **Mining Rig Record (`nodes` collection / `db.nodes`)**:
   - `id`: Unique rig identifier (`node-${timestamp}-${random}`).
   - `userAddress`: Rig owner wallet.
   - `status`: `'mining' | 'idle' | 'stopped'`.
   - `hashrate`: Active hashrate tier in VH/s or TH/s.
   - `deployedAt`: ISO timestamp of deployment.
3. **Transaction Record (`transactions` collection / `db.transactions`)**:
   - `type`: `'deposit' | 'activation' | 'claim' | 'swap' | 'milestone_reward'`.
   - `amount`: Token or USDT volume.
   - `status`: `'Confirmed'`.

---

## 5. Implementation Steps & Verifications

1. **Backend Route Audit & Fortification**:
   - Verify `POST /api/treasury/deposit` sets `user.hasDepositedTreasury = true` and `user.hasActivatedMining = true`, saves the active rig to `db.nodes`, and syncs to Firestore.
   - Verify `POST /api/mining/activate` deducts 10 USDT, credits the treasury wallet (`0x3471...3715`), creates the new Titan node in `db.nodes`, and syncs to Firestore.
   - Add explicit `miningCycleStartTime` and `hasActivatedMining` persistence in `POST /api/user/sync-balance` and `POST /api/nodes/sync`.
2. **Frontend State Hydration Hardening (`src/App.tsx`)**:
   - In `handleDepositSuccess`, guarantee `localStorage.setItem('spike_nodes_' + norm, JSON.stringify(updatedNodes))` and call `/api/nodes/sync`.
   - In `handleDeployNode`, ensure deployed nodes are immediately dispatched to `/api/mining/activate` and saved in `spike_nodes_${norm}`.
   - On page load / wallet switch, query `/api/user/:address` and merge server nodes with local nodes, guaranteeing no user ever sees zero active nodes if they previously started mining.
3. **24-Hour Timer Hydration (`src/components/GoldenHawkMiningSection.tsx`)**:
   - Ensure `cycleStartTime` is loaded from `localStorage.getItem('spike_cycle_start_' + walletAddress)` and falls back to server `user.miningCycleStartTime`.
   - Guarantee `secondsRemaining` is computed dynamically from `Date.now() - cycleStartTime`, so refreshing 5 hours into a mining cycle correctly shows 19 hours remaining.
4. **Full Verification**:
   - Run `lint_applet` and `compile_applet` to confirm clean compilation.
   - Test reload behavior: connect wallet, deposit 5 USDT, refresh page, and verify the node, balance, and timer remain fully active and persistent.
