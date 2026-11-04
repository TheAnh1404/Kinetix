"use client";

import { useState, useCallback } from "react";
import { parseEther, formatEther, Address } from "viem";
import { CONTRACT_ADDRESSES, RuleTemplate } from "@/contracts/config";
import { FAMILY_HUB_ABI } from "@/contracts/abis";
import {
  publicClientL1,
  getWalletClient,
  switchNetwork,
} from "@/lib/web3/client";

export interface VaultOverviewData {
  total: bigint;
  l1Buffer: bigint;
  cChainPrincipal: bigint;
  bufferRatioBps: bigint;
  totalFormatted: string;
  l1BufferFormatted: string;
  cChainPrincipalFormatted: string;
}

export function useFamilyHub() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Kiểm tra địa chỉ ví có nằm trong Transaction Allowlist của Family L1 hay không
   */
  const checkIsAllowlisted = useCallback(
    async (account: Address): Promise<boolean> => {
      try {
        const allowed = await publicClientL1.readContract({
          address: CONTRACT_ADDRESSES.familyHub,
          abi: FAMILY_HUB_ABI,
          functionName: "isAllowlisted",
          args: [account],
        });
        return Boolean(allowed);
      } catch (err) {
        console.warn(
          "Lỗi kiểm tra Allowlist (có thể contract chạy testnet standalone):",
          err,
        );
        return false; // RPC failures must not grant transaction permission.
      }
    },
    [],
  );

  /**
   * Đọc tổng quan thông tin số dư Hũ từ Smart Contract
   */
  const getVaultOverview = useCallback(
    async (vaultId: number): Promise<VaultOverviewData | null> => {
      try {
        const data = await publicClientL1.readContract({
          address: CONTRACT_ADDRESSES.familyHub,
          abi: FAMILY_HUB_ABI,
          functionName: "getVaultOverview",
          args: [BigInt(vaultId)],
        });

        const [total, l1Buffer, cChainPrincipal, bufferRatioBps] = data as [
          bigint,
          bigint,
          bigint,
          bigint,
        ];
        return {
          total,
          l1Buffer,
          cChainPrincipal,
          bufferRatioBps,
          totalFormatted: formatEther(total),
          l1BufferFormatted: formatEther(l1Buffer),
          cChainPrincipalFormatted: formatEther(cChainPrincipal),
        };
      } catch (err: any) {
        console.error(`Lỗi đọc thông tin Hũ #${vaultId}:`, err);
        return null;
      }
    },
    [],
  );

  /**
   * Lấy Wallet Client và kiểm tra quyền tương tác mạng khép kín
   */
  const getAuthorizedWallet = async (): Promise<{
    walletClient: any;
    account: Address;
  }> => {
    const walletClient = getWalletClient();
    if (!walletClient) {
      throw new Error(
        "Vui lòng kết nối ví Avalanche Core Wallet hoặc MetaMask!",
      );
    }

    const [account] = await walletClient.getAddresses();
    if (!account) {
      throw new Error("Không tìm thấy tài khoản ví đang hoạt động!");
    }

    // Kiểm tra Allowlist
    const isAllowed = await checkIsAllowlisted(account);
    if (!isAllowed) {
      throw new Error(
        `Địa chỉ ${account.slice(0, 6)}...${account.slice(-4)} chưa được cấp quyền (Allowlist) trên mạng Family L1. Hãy liên hệ Bố/Mẹ (Admin) để cấp quyền truy cập!`,
      );
    }

    return { walletClient, account };
  };

  /**
   * 1. Nạp tiền vào Hũ tiền (Tự động tách đệm L1 & vốn sinh lời C-Chain)
   */
  const depositToVault = useCallback(
    async (vaultId: number, amountAvax: string): Promise<string> => {
      setIsLoading(true);
      setError(null);
      try {
        const { walletClient, account } = await getAuthorizedWallet();
        const value = parseEther(amountAvax);

        const txHash = await (walletClient as any).writeContract({
          address: CONTRACT_ADDRESSES.familyHub,
          abi: FAMILY_HUB_ABI,
          functionName: "depositToVault",
          args: [BigInt(vaultId)],
          value,
          account,
        });

        return txHash;
      } catch (err: any) {
        const msg =
          err.shortMessage || err.message || "Lỗi khi nạp tiền vào Hũ";
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [checkIsAllowlisted],
  );

  /**
   * 2. Rút tiền nhanh giải ngân tức thì (<1s, 0 gas fee) từ đệm L1
   */
  const fastWithdraw = useCallback(
    async (vaultId: number, amountAvax: string): Promise<string> => {
      setIsLoading(true);
      setError(null);
      try {
        const { walletClient, account } = await getAuthorizedWallet();
        const amount = parseEther(amountAvax);

        const txHash = await (walletClient as any).writeContract({
          address: CONTRACT_ADDRESSES.familyHub,
          abi: FAMILY_HUB_ABI,
          functionName: "fastWithdraw",
          args: [BigInt(vaultId), amount],
          account,
        });

        return txHash;
      } catch (err: any) {
        const msg = err.shortMessage || err.message || "Lỗi khi rút tiền nhanh";
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [checkIsAllowlisted],
  );

  /**
   * 3. Tạo yêu cầu rút tiền lớn (Đưa vào hàng đợi đa chữ ký M/N)
   */
  const requestLargeWithdrawal = useCallback(
    async (
      vaultId: number,
      amountAvax: string,
      reason: string,
    ): Promise<string> => {
      setIsLoading(true);
      setError(null);
      try {
        const { walletClient, account } = await getAuthorizedWallet();
        const amount = parseEther(amountAvax);

        const txHash = await (walletClient as any).writeContract({
          address: CONTRACT_ADDRESSES.familyHub,
          abi: FAMILY_HUB_ABI,
          functionName: "requestLargeWithdrawal",
          args: [BigInt(vaultId), amount, reason],
          account,
        });

        return txHash;
      } catch (err: any) {
        const msg =
          err.shortMessage || err.message || "Lỗi khi tạo yêu cầu rút tiền lớn";
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [checkIsAllowlisted],
  );

  /**
   * 4. Ký duyệt yêu cầu rút tiền lớn (Guardian ký on-chain)
   */
  const approveWithdrawal = useCallback(
    async (requestId: number): Promise<string> => {
      setIsLoading(true);
      setError(null);
      try {
        const { walletClient, account } = await getAuthorizedWallet();

        const txHash = await (walletClient as any).writeContract({
          address: CONTRACT_ADDRESSES.familyHub,
          abi: FAMILY_HUB_ABI,
          functionName: "approveWithdrawal",
          args: [BigInt(requestId)],
          account,
        });

        return txHash;
      } catch (err: any) {
        const msg =
          err.shortMessage ||
          err.message ||
          "Lỗi khi ký duyệt yêu cầu rút tiền";
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [checkIsAllowlisted],
  );

  /**
   * 5. Tạo nhiệm vụ việc nhà Chore-to-Earn (MILESTONE)
   */
  const createChore = useCallback(
    async (
      vaultId: number,
      title: string,
      rewardAvax: string,
      assignee: Address,
    ): Promise<string> => {
      setIsLoading(true);
      setError(null);
      try {
        const { walletClient, account } = await getAuthorizedWallet();
        const reward = parseEther(rewardAvax);

        const txHash = await (walletClient as any).writeContract({
          address: CONTRACT_ADDRESSES.familyHub,
          abi: FAMILY_HUB_ABI,
          functionName: "createChore",
          args: [BigInt(vaultId), title, reward, assignee],
          account,
        });

        return txHash;
      } catch (err: any) {
        const msg =
          err.shortMessage || err.message || "Lỗi khi tạo nhiệm vụ việc nhà";
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [checkIsAllowlisted],
  );

  /**
   * 6. Con nhỏ báo cáo hoàn thành nhiệm vụ
   */
  const claimChoreCompleted = useCallback(
    async (taskId: number): Promise<string> => {
      setIsLoading(true);
      setError(null);
      try {
        const { walletClient, account } = await getAuthorizedWallet();

        const txHash = await (walletClient as any).writeContract({
          address: CONTRACT_ADDRESSES.familyHub,
          abi: FAMILY_HUB_ABI,
          functionName: "claimChoreCompleted",
          args: [BigInt(taskId)],
          account,
        });

        return txHash;
      } catch (err: any) {
        const msg =
          err.shortMessage ||
          err.message ||
          "Lỗi khi báo cáo hoàn thành việc nhà";
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [checkIsAllowlisted],
  );

  /**
   * 7. Phụ huynh xác nhận và giải ngân thưởng việc nhà
   */
  const verifyAndRewardChore = useCallback(
    async (taskId: number): Promise<string> => {
      setIsLoading(true);
      setError(null);
      try {
        const { walletClient, account } = await getAuthorizedWallet();

        const txHash = await (walletClient as any).writeContract({
          address: CONTRACT_ADDRESSES.familyHub,
          abi: FAMILY_HUB_ABI,
          functionName: "verifyAndRewardChore",
          args: [BigInt(taskId)],
          account,
        });

        return txHash;
      } catch (err: any) {
        const msg =
          err.shortMessage || err.message || "Lỗi khi duyệt thưởng việc nhà";
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [checkIsAllowlisted],
  );

  /**
   * 8. Giải ngân xoay vòng quỹ Họ Hụi ROSCA
   */
  const payoutRoscaRound = useCallback(
    async (vaultId: number): Promise<string> => {
      setIsLoading(true);
      setError(null);
      try {
        const { walletClient, account } = await getAuthorizedWallet();

        const txHash = await (walletClient as any).writeContract({
          address: CONTRACT_ADDRESSES.familyHub,
          abi: FAMILY_HUB_ABI,
          functionName: "payoutRoscaRound",
          args: [BigInt(vaultId)],
          account,
        });

        return txHash;
      } catch (err: any) {
        const msg =
          err.shortMessage || err.message || "Lỗi khi giải ngân quỹ ROSCA";
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [checkIsAllowlisted],
  );

  /**
   * 9. Tạo Hũ tiền Động tùy biến (Dynamic Vault)
   */
  const createCustomVault = useCallback(
    async (params: {
      name: string;
      ruleType: RuleTemplate;
      bufferRatioBps: number;
      fastWithdrawLimitAvax: string;
      requiredApprovals: number;
      guardians: Address[];
      beneficiaries: Address[];
    }): Promise<string> => {
      setIsLoading(true);
      setError(null);
      try {
        const { walletClient, account } = await getAuthorizedWallet();

        const txHash = await (walletClient as any).writeContract({
          address: CONTRACT_ADDRESSES.familyHub,
          abi: FAMILY_HUB_ABI,
          functionName: "createCustomVault",
          args: [
            params.name,
            params.ruleType,
            BigInt(params.bufferRatioBps),
            parseEther(params.fastWithdrawLimitAvax || "0"),
            BigInt(params.requiredApprovals),
            params.guardians,
            params.beneficiaries,
          ],
          account,
        });

        return txHash;
      } catch (err: any) {
        const msg =
          err.shortMessage || err.message || "Lỗi khi tạo Hũ tiền mới";
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [checkIsAllowlisted],
  );

  return {
    isLoading,
    error,
    checkIsAllowlisted,
    getVaultOverview,
    depositToVault,
    fastWithdraw,
    requestLargeWithdrawal,
    approveWithdrawal,
    createChore,
    claimChoreCompleted,
    verifyAndRewardChore,
    payoutRoscaRound,
    createCustomVault,
  };
}
