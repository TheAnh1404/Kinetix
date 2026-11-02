'use client';

import { useState, useCallback } from 'react';
import { parseEther, formatEther, Address } from 'viem';
import { CONTRACT_ADDRESSES } from '@/contracts/config';
import { FAMILY_YIELD_VAULT_ABI } from '@/contracts/abis';
import { publicClientFuji, getWalletClient, switchNetwork } from '@/lib/web3/client';

export interface YieldVaultInfo {
  principal: bigint;
  accruedYield: bigint;
  totalYield: bigint;
  totalValueLocked: bigint;
  principalFormatted: string;
  totalYieldFormatted: string;
  tvlFormatted: string;
}

export function useYieldVault() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Đọc chi tiết vốn gốc và lợi suất thực tế 8% APY của Hũ trên Fuji C-Chain
   */
  const getYieldInfo = useCallback(async (vaultId: number): Promise<YieldVaultInfo | null> => {
    try {
      const [principal, accrued, totalYield, tvl] = await Promise.all([
        publicClientFuji.readContract({
          address: CONTRACT_ADDRESSES.familyYieldVault,
          abi: FAMILY_YIELD_VAULT_ABI,
          functionName: 'vaultPrincipals',
          args: [BigInt(vaultId)],
        }),
        publicClientFuji.readContract({
          address: CONTRACT_ADDRESSES.familyYieldVault,
          abi: FAMILY_YIELD_VAULT_ABI,
          functionName: 'calculateAccruedYield',
          args: [BigInt(vaultId)],
        }),
        publicClientFuji.readContract({
          address: CONTRACT_ADDRESSES.familyYieldVault,
          abi: FAMILY_YIELD_VAULT_ABI,
          functionName: 'calculateTotalYield',
          args: [BigInt(vaultId)],
        }),
        publicClientFuji.readContract({
          address: CONTRACT_ADDRESSES.familyYieldVault,
          abi: FAMILY_YIELD_VAULT_ABI,
          functionName: 'getTotalValueLocked',
          args: [BigInt(vaultId)],
        }),
      ]);

      const prinBig = principal as bigint;
      const totalYieldBig = totalYield as bigint;
      const tvlBig = tvl as bigint;

      return {
        principal: prinBig,
        accruedYield: accrued as bigint,
        totalYield: totalYieldBig,
        totalValueLocked: tvlBig,
        principalFormatted: formatEther(prinBig),
        totalYieldFormatted: formatEther(totalYieldBig),
        tvlFormatted: formatEther(tvlBig),
      };
    } catch (err) {
      console.error(`Lỗi đọc lợi suất C-Chain cho Hũ #${vaultId}:`, err);
      return null;
    }
  }, []);

  /**
   * Đọc số dư Quỹ dự trữ bảo chứng thanh khoản chi trả lãi suất (Yield Reserve Pool)
   */
  const getYieldReservePool = useCallback(async (): Promise<string> => {
    try {
      const reserve = await publicClientFuji.readContract({
        address: CONTRACT_ADDRESSES.familyYieldVault,
        abi: FAMILY_YIELD_VAULT_ABI,
        functionName: 'yieldReservePool',
      });
      return formatEther(reserve as bigint);
    } catch (err) {
      console.warn('Lỗi đọc yieldReservePool:', err);
      return '0';
    }
  }, []);

  /**
   * Tái đầu tư lợi nhuận (Compound Yield) - cộng dồn lãi vào vốn gốc
   */
  const compoundYield = useCallback(async (vaultId: number): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      await switchNetwork(43113); // Đảm bảo ví đang ở Fuji C-Chain
      const walletClient = getWalletClient();
      if (!walletClient) throw new Error('Vui lòng kết nối ví Avalanche Core!');

      const [account] = await walletClient.getAddresses();
      if (!account) throw new Error('Không tìm thấy tài khoản ví hoạt động!');

      const txHash = await (walletClient as any).writeContract({
        address: CONTRACT_ADDRESSES.familyYieldVault,
        abi: FAMILY_YIELD_VAULT_ABI,
        functionName: 'compoundYield',
        args: [BigInt(vaultId)],
        account,
      });

      return txHash;
    } catch (err: any) {
      const msg = err.shortMessage || err.message || 'Lỗi khi tái đầu tư lãi suất';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Nạp trực tiếp vào Quỹ dự trữ bảo chứng (Yield Reserve Pool)
   */
  const depositYieldReserve = useCallback(async (amountAvax: string): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      await switchNetwork(43113);
      const walletClient = getWalletClient();
      if (!walletClient) throw new Error('Vui lòng kết nối ví Avalanche Core!');

      const [account] = await walletClient.getAddresses();
      if (!account) throw new Error('Không tìm thấy tài khoản ví hoạt động!');

      const value = parseEther(amountAvax);

      const txHash = await (walletClient as any).writeContract({
        address: CONTRACT_ADDRESSES.familyYieldVault,
        abi: FAMILY_YIELD_VAULT_ABI,
        functionName: 'depositYieldReserve',
        value,
        account,
      });

      return txHash;
    } catch (err: any) {
      const msg = err.shortMessage || err.message || 'Lỗi khi nạp quỹ dự trữ lãi suất';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    getYieldInfo,
    getYieldReservePool,
    compoundYield,
    depositYieldReserve,
  };
}
