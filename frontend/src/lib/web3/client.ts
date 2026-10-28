/**
 * Web3 Viem Clients for Kinetix
 * Cung cấp Public Client và Wallet Client tương thích Avalanche Core Wallet & MetaMask
 */

import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  PublicClient,
  WalletClient,
} from 'viem';
import { avalancheFamilyL1, avalancheFuji } from '@/contracts/config';

// Global Ethereum Provider (Avalanche Core Wallet / MetaMask)
declare global {
  interface Window {
    ethereum?: any;
    avalanche?: any;
  }
}

/**
 * Public Client cho Family L1
 */
export const publicClientL1: PublicClient = createPublicClient({
  chain: avalancheFamilyL1,
  transport: http(),
});

/**
 * Public Client cho Fuji C-Chain
 */
export const publicClientFuji: PublicClient = createPublicClient({
  chain: avalancheFuji,
  transport: http(),
});

/**
 * Lấy Wallet Client kết nối từ ví người dùng (Core Wallet / MetaMask)
 */
export function getWalletClient(targetChain?: any): WalletClient | null {
  if (typeof window === 'undefined') return null;

  // Ưu tiên Core Wallet (window.avalanche hoặc window.ethereum)
  const provider = window.avalanche || window.ethereum;
  if (!provider) return null;

  // Tự động điều chỉnh chain khớp với mạng của ví nếu không truyền targetChain
  let chain = targetChain || avalancheFamilyL1;
  if (!targetChain && provider.chainId) {
    const currentId = parseInt(provider.chainId, 16);
    if (currentId === 43113) {
      chain = avalancheFuji;
    }
  }

  return createWalletClient({
    chain,
    transport: custom(provider),
  });
}

/**
 * Yêu cầu ví Core Wallet chuyển sang mạng Family L1 hoặc Fuji
 */
export async function switchNetwork(chainId: number): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const provider = window.avalanche || window.ethereum;
  if (!provider) return false;

  try {
    const hexChainId = `0x${chainId.toString(16)}`;
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexChainId }],
    });
    return true;
  } catch (error: any) {
    // Nếu mạng chưa được thêm vào ví, yêu cầu thêm mạng mới
    if (error.code === 4902) {
      try {
        const chain = chainId === 43113 ? avalancheFuji : avalancheFamilyL1;
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${chain.id.toString(16)}`,
              chainName: chain.name,
              nativeCurrency: chain.nativeCurrency,
              rpcUrls: chain.rpcUrls.default.http,
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error('Lỗi thêm mạng vào ví:', addError);
        return false;
      }
    }
    console.error('Lỗi chuyển mạng:', error);
    return false;
  }
}
