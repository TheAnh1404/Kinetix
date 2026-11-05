import { defineChain, zeroAddress } from "viem";
import manifest from "../../../shared/deployment.json";

export const DEPLOYMENT = manifest;
export const avalancheFuji = defineChain({
  id: manifest.chainId,
  name: "Avalanche Fuji",
  nativeCurrency: { decimals: 18, name: "Avalanche", symbol: "AVAX" },
  rpcUrls: { default: { http: [manifest.rpcUrl] } },
  blockExplorers: { default: { name: "SnowTrace", url: manifest.explorerUrl } },
  testnet: true,
});
export const hubChain = avalancheFuji;
// Alias cho client cũ: T1 chỉ có cùng một Fuji chain.
export const avalancheFamilyL1 = hubChain;
export const SNOWTRACE_TESTNET_URL = manifest.explorerUrl;
const contracts = manifest.contracts as Record<
  string,
  { address: `0x${string}` } | null
>;
export const CONTRACT_ADDRESSES = {
  familyHub: contracts.hub?.address || zeroAddress,
  familyYieldVault: zeroAddress,
  kinetixForwarder: contracts.forwarder?.address || zeroAddress,
};
export const BACKEND_API_BASE_URL = "/api";
export enum RuleTemplate {
  SHIELD = 0,
  MILESTONE = 1,
  ROSCA = 2,
  SHARED_GOAL = 3,
}
export const VaultType = {
  RetirementShield: 0,
  KidsSavings: 1,
  FamilyROSCA: 2,
  SHIELD: 0,
  MILESTONE: 1,
  ROSCA: 2,
  SHARED_GOAL: 3,
};
export type VaultType = RuleTemplate;
