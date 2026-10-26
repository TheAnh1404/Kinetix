/**
 * Avalanche Network & Contract Addresses Configuration for Kinetix
 */

import { defineChain } from 'viem';

// Mạng Avalanche Fuji C-Chain (Chain ID 43113)
export const avalancheFuji = defineChain({
  id: 43113,
  name: 'Avalanche Fuji',
  nativeCurrency: {
    decimals: 18,
    name: 'Avalanche',
    symbol: 'AVAX',
  },
  rpcUrls: {
    default: { http: ['https://api.avax-test.network/ext/bc/C/rpc'] },
    public: { http: ['https://api.avax-test.network/ext/bc/C/rpc'] },
  },
  blockExplorers: {
    default: { name: 'SnowTrace', url: 'https://testnet.snowtrace.io' },
  },
  testnet: true,
});

// Mạng tùy biến Avalanche Family L1 (Chain ID 43114, 0 Gas Fee)
export const avalancheFamilyL1 = defineChain({
  id: 43114,
  name: 'Avalanche Family L1',
  nativeCurrency: {
    decimals: 18,
    name: 'Family AVAX',
    symbol: 'AVAX',
  },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_FAMILY_L1_RPC || 'http://127.0.0.1:9650/ext/bc/FamilyL1/rpc'] },
    public: { http: [process.env.NEXT_PUBLIC_FAMILY_L1_RPC || 'http://127.0.0.1:9650/ext/bc/FamilyL1/rpc'] },
  },
  testnet: true,
});

// Địa chỉ Smart Contract mặc định (Deployments)
export const CONTRACT_ADDRESSES = {
  // Hợp đồng FamilyHub.sol trên Family L1
  familyHub: (process.env.NEXT_PUBLIC_FAMILY_HUB_ADDRESS ||
    '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0') as `0x${string}`,

  // Hợp đồng FamilyYieldVault.sol trên Fuji C-Chain
  familyYieldVault: (process.env.NEXT_PUBLIC_FAMILY_VAULT_ADDRESS ||
    '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512') as `0x${string}`,
};

// URL Backend API
export const BACKEND_API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001/api';

// Enum Vault Type khớp với Smart Contract & Backend Schema
export enum VaultType {
  RetirementShield = 0,
  KidsSavings = 1,
  FamilyROSCA = 2,
}
