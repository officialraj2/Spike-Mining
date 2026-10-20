# Master User (Super Admin) Project Control System

## Summary
A comprehensive Master User control suite enabling the project creator to authenticate automatically via their designated master wallet (`0x3471e07c4d2f7e11c155760a7b386e616b5c3715`) and make real-time global changes across the entire dApp. Updates to mining yields, hashrate tiers, referral commission percentages, user balances, and system parameters immediately persist to both local server storage and Firestore, governing how the dApp runs for every connected user.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following core decisions were confirmed through interactive requirements clarification:
> - **Authentication Method**: Dedicated master wallet address with instantaneous automatic recognition upon Web3 connection.
> - **Control Scope**: 
>   1. Global mining parameters, hashrates, and token rewards.
>   2. Team referral percentages, tier thresholds, and sponsor rules.
>   3. User management, custom wallet balances, and role assignments.
> - **Default Master Wallet**: `0x3471e07c4d2f7e11c155760a7b386e616b5c3715` (with the ability for the master to add/update backup master addresses).

---

## 1. Overview & Core Concept

- **What It Does**: Provides a dedicated, root-privileged Master Control Center inside the dApp that automatically unlocks when the creator connects their wallet. Any parameters updated by the Master (such as mining yield %, node base power, referral commission rates, or user account balances) are saved directly to the backend database (`spike_database.json`) and synchronized to Firestore, immediately altering how the entire project behaves for all users and visitors.
- **Target Audience / Persona**: The dApp owner/creator (Master User) managing live tokenomics, user disputes, and team bonus parameters without editing raw code.
- **Key Value**: Real-time project governance and permanent configuration persistence without requiring redeployments or downtime.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Master Recognition**: 
   - Creator connects their wallet (`0x3471...3715`).
   - The dApp immediately detects the Master User status, displaying a distinctive gold and neon cyan indicator: `MASTER ADMIN (ROOT)`.
   - The Sidebar and Header expose the dedicated **Master Control Center** tab (`/admin`).
2. **Global Mining & Yield Orchestration**:
   - Master navigates to **Mining Controls**: edits Daily Yield % (e.g. 1.2% to 2.5%), Turbo Multiplier, Base Hashrate (TH/s), Node Activation Cost, and Mining Cycle Duration.
   - Master clicks `Apply Global Mining Settings`.
   - All mining calculators, node deployment prices, and yields across the app instantly update for all visitors.
3. **Team Referral & Commission Governance**:
   - Master navigates to **Referral & Team Rules**: configures Tier 1 commission (e.g. 15%), Tier 2 commission (e.g. 5%), direct partner requirements for hashrate bonuses (Level 1: 10 directs, Level 2: 25 directs, Level 3: 50 directs).
   - Master saves changes; all referral reward cards, partner bonus rules, and team earnings calculations synchronize immediately.
4. **User & Balance Administration**:
   - Master searches any user address in the **User Directory**.
   - Master can view complete user stats (sponsor, downline count, mining nodes, earnings).
   - Master can directly adjust user balances (USDT, SPK), set custom hashrate overrides, change user status (Active / Frozen / Banned), or grant moderator roles.
5. **System Safeguards**:
   - One-click toggle for **Maintenance Mode** (with custom banner message).
   - Live audit logging recording timestamped actions executed by the Master.

### Visual Identity & Theme
- **Aesthetic Direction**: High-density, professional Web3 developer & administrative console aligned with the Spike Stratum dark theme.
- **Color Palette**: Deep slate background (`#051424` / `#0a101d`), hairline borders (`#1c2b3b` / `#1e2e42`), bright cyan accent (`#00F0FF`), and gold root accents (`#D4AF37`) for Master actions.
- **Typography**: Clean display headings in `Plus Jakarta Sans` / `Outfit`, accompanied by strict monospace tabular figures (`font-mono tabular-nums`) for addresses, hashrates, balances, and timestamps.
- **Anti-Slop Restraint**: Zero decorative pulsing dots, zero fake compiler logs or pseudocode headers, clean unboxed metadata, and clear single-line action buttons.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Master Authentication Strategy**
  - *Chosen Approach*: Automatic recognition of designated master wallet addresses (`0x3471e07c4d2f7e11c155760a7b386e616b5c3715`) stored in a secure server-side master list, supplemented by an optional emergency passkey modal for administrative sessions.
  - *Why*: Eliminates friction for the owner while preventing spoofing; server-side routes rigorously verify request headers and sender addresses before executing mutations.
- **Decision 2: Global Configuration Persistence**
  - *Chosen Approach*: Dual-write architecture: Master updates write to `DbSettings` in `.data/spike_database.json` and sync asynchronously to Firestore (`settings/global_config`).
  - *Why*: Guarantees instant local API responses with zero latency, while ensuring cloud persistence across container restarts or multi-instance deployments.
- **Decision 3: Propagation to Active Clients**
  - *Chosen Approach*: The frontend queries `/api/settings` on mount and listens for live updates via WebSocket / polling / custom events. When the master changes settings, an instant broadcast triggers a re-sync on all active clients.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MASTER USER INTERFACE                           │
│  • Auto-Recognition on Connect (0x3471...3715)                         │
│  • Master Control Center (Mining | Referrals | Users | Safeguards)     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ HTTPS / REST (Auth: Master Address)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        EXPRESS BACKEND SERVER                          │
│  • /api/admin/settings (GET / PUT)                                     │
│  • /api/admin/referral-rules (GET / PUT)                               │
│  • /api/admin/users/:address (GET / PUT balance / hashrate / status)   │
│  • /api/admin/system (Maintenance / Faucet / Reset)                    │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
       ┌────────────────────────┐      ┌──────────────────────────┐
       │   Local Server DB      │      │   Firestore Database     │
       │  (spike_database.json) │◄────►│   (ai-studio-spikeweb3)  │
       │  • db.settings         │      │   • settings/global      │
       │  • db.users            │      │   • users/{address}      │
       │  • db.referrals        │      │   • audit_logs/{id}      │
       └────────────────────────┘      └──────────────────────────┘
```

### Data Model & State Entities

```typescript
// Master Global Settings
export interface MasterGlobalSettings {
  // Mining & Yield
  dailyYieldPercent: number;        // e.g. 1.2%
  turboMultiplier: number;          // e.g. 2.0x
  baseHashrateTh: number;           // e.g. 200 TH/s
  nodeCostUsdt: number;             // e.g. 150 USDT
  miningCycleHours: number;         // e.g. 24 hours
  dailyRewardSpk: number;           // e.g. 50 SPK
  
  // Referral & Team Rules
  tier1CommissionPercent: number;   // e.g. 15%
  tier2CommissionPercent: number;   // e.g. 5%
  level1DirectsRequired: number;    // e.g. 10
  level2DirectsRequired: number;    // e.g. 25
  level3DirectsRequired: number;    // e.g. 50
  
  // System Controls
  maintenanceMode: boolean;
  maintenanceMessage: string;
  masterWalletAddresses: string[];  // ['0x3471e07c4d2f7e11c155760a7b386e616b5c3715', ...]
}
```

### Component & API Implementation Steps
1. **Database & API Layer (`src/server/db.ts` & `server.ts`)**:
   - Expand `DbSettings` to incorporate global referral percentages, tier thresholds, node costs, and `masterWalletAddresses`.
   - Initialize `0x3471e07c4d2f7e11c155760a7b386e616b5c3715` as the default Master User.
   - Implement `/api/admin/settings` (GET/PUT) with validation.
   - Implement `/api/admin/users/:address` endpoints for balance adjustments, custom hashrate overrides, and status toggles.
2. **Master Control Center Component (`src/components/views/AdminView.tsx`)**:
   - Re-architect into clean, tabbed modules:
     - **Mining & Yield Parameters**: Live inputs for yields, cycle times, node pricing, and rewards.
     - **Referral & Partner Rules**: Live inputs for commission rates (Tier 1 & Tier 2) and level thresholds.
     - **User & Balance Manager**: Search any address, view their tree, adjust USDT/SPK balance, set custom hashrate, or toggle ban/freeze status.
     - **System Governance**: Maintenance toggle, master address manager, and exportable backup JSON.
3. **App Integration (`src/App.tsx`)**:
   - Seamless auto-recognition of the Master User wallet.
   - Live consumption of global settings so mining calculators, referral views, and node activation forms automatically adapt to the master's values.
