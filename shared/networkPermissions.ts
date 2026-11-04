export const TRANSACTION_ALLOWLIST_ADDRESS =
  "0x0200000000000000000000000000000000000002" as const;
export const TRANSACTION_ALLOWLIST_ABI = [
  {
    type: "function",
    name: "readAllowList",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "role", type: "uint256" }],
  },
] as const;
