import React, { useState } from 'react';
import { MiningNode } from '../../types';

interface TestnetTestingModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  walletBalance: number;
  walletBNB: number;
  currentNetwork: string;
  nodesCount: number;
  onTopUpUsdt: (amount: number) => void;
  onTopUpBnb: (amount: number) => void;
  onResetToFreshUser: () => void;
  onSeedTeamLeader: () => void;
  onClearTransactions: () => void;
  onSwitchToBscTestnet: () => void;
}

export const TestnetTestingModal: React.FC<TestnetTestingModalProps> = ({
  isOpen,
  onClose,
  walletAddress,
  walletBalance,
  walletBNB,
  currentNetwork,
  nodesCount,
  onTopUpUsdt,
  onTopUpBnb,
  onResetToFreshUser,
  onSeedTeamLeader,
  onClearTransactions,
  onSwitchToBscTestnet,
}) => {
  const [activeTab, setActiveTab] = useState<'faucet' | 'reset' | 'blockchain' | 'smartcontract'>('faucet');
  const [copiedContract, setCopiedContract] = useState(false);

  if (!isOpen) return null;

  const sampleSolidityContract = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SPIKEMiningProtocol
 * @dev BSC Testnet Validator & Team Reward Registry
 */
contract SPIKEMiningProtocol is Ownable {
    IERC20 public immutable usdtToken;
    IERC20 public immutable spikeToken;

    // Node activation costs: Tier 1 = 15 USDT, Tier 2 = 75 USDT, Tier 3 = 250 USDT
    uint256[3] public tierCosts = [15 * 1e18, 75 * 1e18, 250 * 1e18];

    struct MinerProfile {
        uint256 activeNodes;
        address referrer;
        uint256 totalTeamCount;
        uint256 claimedMilestoneBonus;
    }

    mapping(address => MinerProfile) public miners;
    mapping(address => address[]) public directPartners;

    event NodeActivated(address indexed user, uint8 tier, uint256 costUsdt);
    event ReferralRegistered(address indexed user, address indexed referrer);
    event MilestoneRewardClaimed(address indexed user, uint256 amountUsdt, uint256 teamSize);

    constructor(address _usdt, address _spike) Ownable(msg.sender) {
        usdtToken = IERC20(_usdt);
        spikeToken = IERC20(_spike);
    }

    function activateNode(uint8 tier, address referrer) external {
        require(tier < 3, "Invalid tier");
        uint256 cost = tierCosts[tier];

        // Deduct USDT from user's BEP-20 wallet
        require(usdtToken.transferFrom(msg.sender, address(this), cost), "USDT transfer failed");

        miners[msg.sender].activeNodes += 1;

        // Register referral on first activation
        if (miners[msg.sender].referrer == address(0) && referrer != address(0) && referrer != msg.sender) {
            miners[msg.sender].referrer = referrer;
            directPartners[referrer].push(msg.sender);
            miners[referrer].totalTeamCount += 1;
            emit ReferralRegistered(msg.sender, referrer);
        }

        emit NodeActivated(msg.sender, tier, cost);
    }
}`;

  const copyContractCode = () => {
    navigator.clipboard?.writeText(sampleSolidityContract);
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#010f1e]/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-[#0a1828] border-2 border-[#00F0FF]/40 rounded-2xl p-5 sm:p-6 shadow-[0_0_50px_rgba(0,240,255,0.2)] z-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1c2b3b] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#00F0FF]/15 border border-[#00F0FF]/30 flex items-center justify-center text-[#00F0FF]">
              <span className="material-symbols-outlined text-[22px]">science</span>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-headline text-white flex items-center gap-2">
                <span>Web3 Testnet &amp; Testing Studio</span>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40">
                  DEVELOPER / QA
                </span>
              </h3>
              <p className="text-[11px] text-[#94a3b8]">
                Test faucet balance, reset test records, verify fund deduction, aur blockchain integration guide.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#122130] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Status Bar */}
        <div className="mt-3 p-3 rounded-xl bg-[#051424] border border-[#1c2b3b] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs shrink-0">
          <div>
            <span className="text-[10px] text-[#94a3b8] font-mono block">Active Network</span>
            <span className="font-mono text-white font-semibold truncate block">{currentNetwork}</span>
          </div>
          <div>
            <span className="text-[10px] text-[#94a3b8] font-mono block">USDT Balance</span>
            <span className="font-mono text-[#00F0FF] font-bold">{walletBalance.toFixed(2)} USDT</span>
          </div>
          <div>
            <span className="text-[10px] text-[#94a3b8] font-mono block">BNB (Gas) Balance</span>
            <span className="font-mono text-[#D4AF37] font-bold">{walletBNB.toFixed(4)} BNB</span>
          </div>
          <div>
            <span className="text-[10px] text-[#94a3b8] font-mono block">Online Nodes</span>
            <span className="font-mono text-emerald-400 font-bold">{nodesCount} Rigs Hashing</span>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 mt-3 pt-2 border-b border-[#1c2b3b] overflow-x-auto shrink-0 pb-2">
          <button
            onClick={() => setActiveTab('faucet')}
            className={`px-3 py-1.5 rounded-lg text-xs font-headline font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'faucet'
                ? 'bg-[#00F0FF] text-[#0A0F1D] shadow-[0_0_12px_rgba(0,240,255,0.4)] font-bold'
                : 'text-[#94a3b8] hover:text-white hover:bg-[#122130]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">water_drop</span>
            <span>1. Test Faucet (Funds)</span>
          </button>

          <button
            onClick={() => setActiveTab('reset')}
            className={`px-3 py-1.5 rounded-lg text-xs font-headline font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'reset'
                ? 'bg-[#00F0FF] text-[#0A0F1D] shadow-[0_0_12px_rgba(0,240,255,0.4)] font-bold'
                : 'text-[#94a3b8] hover:text-white hover:bg-[#122130]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            <span>2. Reset &amp; Verify Records</span>
          </button>

          <button
            onClick={() => setActiveTab('blockchain')}
            className={`px-3 py-1.5 rounded-lg text-xs font-headline font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'blockchain'
                ? 'bg-[#00F0FF] text-[#0A0F1D] shadow-[0_0_12px_rgba(0,240,255,0.4)] font-bold'
                : 'text-[#94a3b8] hover:text-white hover:bg-[#122130]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">hub</span>
            <span>3. BSC Testnet RPC</span>
          </button>

          <button
            onClick={() => setActiveTab('smartcontract')}
            className={`px-3 py-1.5 rounded-lg text-xs font-headline font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'smartcontract'
                ? 'bg-[#00F0FF] text-[#0A0F1D] shadow-[0_0_12px_rgba(0,240,255,0.4)] font-bold'
                : 'text-[#94a3b8] hover:text-white hover:bg-[#122130]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">code</span>
            <span>4. Smart Contract Code</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-4 text-xs">
          {/* TAB 1: FAUCET */}
          {activeTab === 'faucet' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-[#0c1d2e] border border-[#00F0FF]/30 space-y-2">
                <div className="flex items-center gap-2 text-white font-headline font-bold text-sm">
                  <span className="material-symbols-outlined text-[#00F0FF] text-[18px]">bolt</span>
                  <span>Instant In-App Test Faucet (Instant Credit)</span>
                </div>
                <p className="text-[#94a3b8] leading-relaxed">
                  Bina real crypto kharch kiye testing karne ke liye yahan se 1-click me test tokens apne wallet me credit karein:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => onTopUpUsdt(100)}
                    className="p-3 rounded-xl bg-[#122130] hover:bg-[#1c2b3b] border border-[#00F0FF]/40 text-left transition-all hover:scale-[1.02] active:scale-[0.98] group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#00F0FF] font-bold font-headline text-xs">+100.00 Test USDT</span>
                      <span className="material-symbols-outlined text-[18px] text-[#00F0FF] group-hover:translate-x-1 transition-transform">
                        add_circle
                      </span>
                    </div>
                    <span className="text-[10px] text-[#94a3b8] block">
                      Node deployment fees (15, 75, 250 USDT) deduct test karne ke liye.
                    </span>
                  </button>

                  <button
                    onClick={() => onTopUpBnb(0.5)}
                    className="p-3 rounded-xl bg-[#122130] hover:bg-[#1c2b3b] border border-[#D4AF37]/40 text-left transition-all hover:scale-[1.02] active:scale-[0.98] group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#D4AF37] font-bold font-headline text-xs">+0.50 Test BNB</span>
                      <span className="material-symbols-outlined text-[18px] text-[#D4AF37] group-hover:translate-x-1 transition-transform">
                        add_circle
                      </span>
                    </div>
                    <span className="text-[10px] text-[#94a3b8] block">
                      DEX Swap aur network validator gas fees testing ke liye.
                    </span>
                  </button>
                </div>
              </div>

              {/* Official BNB Faucet External */}
              <div className="p-4 rounded-xl bg-[#051424] border border-[#1c2b3b] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-bold font-headline">
                    <span className="material-symbols-outlined text-[#D4AF37] text-[18px]">account_balance</span>
                    <span>Official Binance Smart Chain Testnet Faucet</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#00F0FF]">FREE tBNB</span>
                </div>
                <p className="text-[#94a3b8]">
                  Agar aap real MetaMask par BSC Testnet network me real test BNB chahte hain, toh official Binance Faucet se le sakte hain:
                </p>
                <div className="pt-1">
                  <a
                    href="https://testnet.bnbchain.org/faucet-smart"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1c2b3b] hover:bg-[#273647] border border-[#00F0FF]/30 text-[#00F0FF] font-headline font-bold text-xs transition-colors"
                  >
                    <span>Open Official BSC Testnet Faucet</span>
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RESET & VERIFY RECORDS */}
          {activeTab === 'reset' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-[#0c1d2e] border border-[#00F0FF]/30 space-y-3">
                <div className="text-white font-headline font-bold text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00F0FF]">manage_history</span>
                  <span>Naye Test Case Ke Hisab Se Data Verify &amp; Reset Karna</span>
                </div>
                <p className="text-[#94a3b8] leading-relaxed">
                  Har naye test scenario (jaise fresh user onboarding, first node purchase deduction, ya referral milestone unlock) ko verify karne ke liye yahan se 1-click test state switch karein:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Option 1: Fresh User */}
                  <div className="p-3.5 rounded-xl bg-[#051424] border border-amber-500/30 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="text-white font-bold text-xs flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-amber-400 text-[16px]">person_add</span>
                        <span>Scenario A: Fresh User (Zero State)</span>
                      </div>
                      <p className="text-[11px] text-[#94a3b8] mt-1">
                        0 Active Nodes, 100 USDT balance, aur 0 referrals. Naye user ka node buy aur balance deduct verify karne ke liye.
                      </p>
                    </div>
                    <button
                      onClick={onResetToFreshUser}
                      className="w-full py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs font-headline transition-colors"
                    >
                      Reset to Fresh User
                    </button>
                  </div>

                  {/* Option 2: Team Leader Seed */}
                  <div className="p-3.5 rounded-xl bg-[#051424] border border-[#00F0FF]/30 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="text-white font-bold text-xs flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[#00F0FF] text-[16px]">military_tech</span>
                        <span>Scenario B: Team Milestone Ready</span>
                      </div>
                      <p className="text-[11px] text-[#94a3b8] mt-1">
                        10+ Team Partners aur active rig load karta hai, taaki aap $15 aur $100 referral bonus claim button ko test kar sakein.
                      </p>
                    </div>
                    <button
                      onClick={onSeedTeamLeader}
                      className="w-full py-2 px-3 rounded-lg bg-[#00F0FF]/20 hover:bg-[#00F0FF]/30 border border-[#00F0FF]/40 text-[#00F0FF] font-bold text-xs font-headline transition-colors"
                    >
                      Load Milestone Test State
                    </button>
                  </div>
                </div>

                {/* Clear Log */}
                <div className="pt-2 flex items-center justify-between border-t border-[#1c2b3b]">
                  <span className="text-[11px] text-[#94a3b8]">Claim &amp; Activation History Clean Karna:</span>
                  <button
                    onClick={onClearTransactions}
                    className="px-3 py-1.5 rounded-lg bg-[#122130] hover:bg-[#1c2b3b] text-rose-400 border border-rose-500/30 font-headline font-semibold text-xs transition-colors"
                  >
                    Clear Transaction Log
                  </button>
                </div>
              </div>

              {/* BscScan Verification */}
              <div className="p-4 rounded-xl bg-[#051424] border border-[#1c2b3b] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold font-headline">BscScan Testnet Verification:</span>
                  <a
                    href={`https://testnet.bscscan.com/address/${walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#00F0FF] hover:underline flex items-center gap-1 text-xs"
                  >
                    <span>Check Wallet on BscScan</span>
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </a>
                </div>
                <p className="text-[#94a3b8]">
                  Blockchain par deploy hone ke baad har ek transfer, node activation, aur reward claim ka record BscScan par block number ke sath verify hota hai.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: BSC TESTNET RPC */}
          {activeTab === 'blockchain' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-[#0c1d2e] border border-[#00F0FF]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-white font-headline font-bold text-sm">
                    BNB Smart Chain Testnet Parameters
                  </div>
                  <button
                    onClick={onSwitchToBscTestnet}
                    className="px-3 py-1.5 rounded-xl bg-[#00F0FF] text-[#0A0F1D] font-headline font-bold text-xs shadow-sm hover:bg-[#7df4ff] transition-all flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                    <span>Switch MetaMask to BSC Testnet</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-[#051424] border border-[#1c2b3b]">
                    <span className="text-[10px] text-[#94a3b8] uppercase block">Network Name</span>
                    <span className="text-white font-bold">BNB Smart Chain Testnet</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#051424] border border-[#1c2b3b]">
                    <span className="text-[10px] text-[#94a3b8] uppercase block">Chain ID</span>
                    <span className="text-[#00F0FF] font-bold">97 (0x61 in hex)</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#051424] border border-[#1c2b3b]">
                    <span className="text-[10px] text-[#94a3b8] uppercase block">New RPC URL</span>
                    <span className="text-white truncate block">https://data-seed-prebsc-1-s1.binance.org:8545/</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#051424] border border-[#1c2b3b]">
                    <span className="text-[10px] text-[#94a3b8] uppercase block">Block Explorer</span>
                    <span className="text-white truncate block">https://testnet.bscscan.com</span>
                  </div>
                </div>

                <p className="text-[11px] text-[#94a3b8]">
                  MetaMask me yeh network add karne ke baad aap free testnet BNB se gas fees pay kar sakte hain.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: SMART CONTRACT CODE */}
          {activeTab === 'smartcontract' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-[#0c1d2e] border border-[#00F0FF]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-headline font-bold text-sm">
                      Solidiy Smart Contract (Remix IDE Ready)
                    </div>
                    <p className="text-[11px] text-[#94a3b8]">
                      Is contract me Node activation fund deduction aur Referral team tracking built-in hai.
                    </p>
                  </div>
                  <button
                    onClick={copyContractCode}
                    className="px-3 py-1.5 rounded-xl bg-[#00F0FF] text-[#0A0F1D] font-headline font-bold text-xs flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {copiedContract ? 'check' : 'content_copy'}
                    </span>
                    <span>{copiedContract ? 'Copied!' : 'Copy Solidity Code'}</span>
                  </button>
                </div>

                <div className="p-3 bg-[#051424] rounded-xl border border-[#1c2b3b] font-mono text-[11px] text-[#7df4ff] max-h-56 overflow-y-auto whitespace-pre leading-relaxed">
                  {sampleSolidityContract}
                </div>

                <div className="text-[11px] text-[#94a3b8] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#D4AF37]">tips_and_updates</span>
                  <span>Is code ko seedhe <strong>remix.ethereum.org</strong> me paste karke BSC Testnet par 2 minute me deploy karein.</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
