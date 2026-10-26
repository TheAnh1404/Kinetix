/**
 * Contract ABIs for Kinetix Family Finance OS
 * Trích xuất từ artifacts/contracts/FamilyHub.sol và FamilyYieldVault.sol
 */

export const FAMILY_HUB_ABI = [
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint8", name: "vaultType", type: "uint8" },
      { indexed: true, internalType: "address", name: "depositor", type: "address" },
      { indexed: false, internalType: "uint256", name: "totalAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "toBuffer", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "toBridge", type: "uint256" }
    ],
    name: "FundsDeposited",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint8", name: "vaultType", type: "uint8" },
      { indexed: true, internalType: "address", name: "recipient", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" }
    ],
    name: "FastWithdrawalExecuted",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "requestId", type: "uint256" },
      { indexed: true, internalType: "address", name: "requester", type: "address" },
      { indexed: true, internalType: "uint8", name: "vaultType", type: "uint8" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: false, internalType: "address", name: "recipient", type: "address" },
      { indexed: false, internalType: "string", name: "reason", type: "string" },
      { indexed: false, internalType: "uint256", name: "deadline", type: "uint256" }
    ],
    name: "WithdrawalRequested",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "requestId", type: "uint256" },
      { indexed: true, internalType: "address", name: "guardian", type: "address" },
      { indexed: false, internalType: "uint256", name: "currentApprovals", type: "uint256" }
    ],
    name: "WithdrawalApproved",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "taskId", type: "uint256" },
      { indexed: false, internalType: "string", name: "title", type: "string" },
      { indexed: false, internalType: "uint256", name: "rewardAmount", type: "uint256" },
      { indexed: true, internalType: "address", name: "kidAddress", type: "address" }
    ],
    name: "ChoreCreated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "taskId", type: "uint256" },
      { indexed: true, internalType: "address", name: "kidAddress", type: "address" }
    ],
    name: "ChoreClaimed",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "taskId", type: "uint256" },
      { indexed: true, internalType: "address", name: "kidAddress", type: "address" },
      { indexed: false, internalType: "uint256", name: "rewardAmount", type: "uint256" }
    ],
    name: "ChoreRewarded",
    type: "event"
  },
  // Functions
  {
    inputs: [{ internalType: "uint8", name: "vaultType", type: "uint8" }],
    name: "depositToVault",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint8", name: "vaultType", type: "uint8" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "address payable", name: "recipient", type: "address" }
    ],
    name: "fastWithdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint8", name: "vaultType", type: "uint8" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "string", name: "reason", type: "string" }
    ],
    name: "requestLargeWithdrawal",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "requestId", type: "uint256" }],
    name: "approveWithdrawal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "string", name: "title", type: "string" },
      { internalType: "uint256", name: "rewardAmount", type: "uint256" },
      { internalType: "address", name: "kidAddress", type: "address" }
    ],
    name: "createChore",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "taskId", type: "uint256" }],
    name: "claimChoreCompleted",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "taskId", type: "uint256" }],
    name: "verifyAndRewardChore",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint8", name: "vaultType", type: "uint8" }],
    name: "getVaultOverview",
    outputs: [
      { internalType: "uint256", name: "localBuffer", type: "uint256" },
      { internalType: "uint256", name: "remoteYield", type: "uint256" },
      { internalType: "uint256", name: "total", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getGuardians",
    outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "withdrawalRequests",
    outputs: [
      { internalType: "uint256", name: "requestId", type: "uint256" },
      { internalType: "address", name: "requester", type: "address" },
      { internalType: "uint8", name: "vaultType", type: "uint8" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "string", name: "reason", type: "string" },
      { internalType: "uint256", name: "approvalsCount", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "bool", name: "executed", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "familyAdmin",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "fastWithdrawLimit",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
] as const;

export const FAMILY_YIELD_VAULT_ABI = [
  {
    inputs: [{ internalType: "uint8", name: "vaultType", type: "uint8" }],
    name: "calculateYield",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint8", name: "vaultType", type: "uint8" }],
    name: "getYieldVaultInfo",
    outputs: [
      { internalType: "uint256", name: "principal", type: "uint256" },
      { internalType: "uint256", name: "accruedYield", type: "uint256" },
      { internalType: "uint256", name: "totalValue", type: "uint256" },
      { internalType: "uint256", name: "lastUpdated", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  }
] as const;
