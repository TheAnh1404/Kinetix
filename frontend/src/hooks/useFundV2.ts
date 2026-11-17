"use client";

import { useState, useCallback } from "react";
import { formatEther } from "viem";
import { authRequest, useAuth } from "./useAuth";
import {
  createOnchainFund,
  depositOnchainFund,
  proposeExpenseOnchain,
  approveExpenseOnchain,
  executeExpenseOnchain,
  refundFailedGoalOnchain,
  proposePolicyOnchain,
  proposeActionOnchain,
  approveGovernanceOnchain,
  executeGovernanceOnchain,
  getFundV2Details,
  getUserContributionOnchain,
  humanizeV2Error,
  V2_PERMISSIONS,
  DEFAULT_FACTORY_V2_ADDRESS,
  FundV2PreflightOptions,
} from "@/lib/web3/fundV2Client";
import {
  GroupFundItem,
  GroupExpenseRequest,
  CreateFundParams,
  ProposeExpenseParams,
  FundV2Policy,
  FundV2Member,
  RefundEligibility,
} from "@/types/groupFinance";
import { groupAmount } from "../../../shared/groupFinance";

export type FundV2SyncStatus =
  | "IDLE"
  | "SIGNING"
  | "MINING"
  | "SYNCING"
  | "CONFIRMED"
  | "FAILED";

export function useFundV2() {
  const auth = useAuth();
  const [isTransacting, setIsTransacting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<FundV2SyncStatus>("IDLE");
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  /**
   * Tạo options preflight chuẩn hóa khớp phiên người dùng và workspace
   */
  const makePreflight = useCallback(
    (workspaceId?: string): FundV2PreflightOptions => ({
      expectedWalletAddress: auth.user?.walletAddress,
      expectedWorkspaceId: workspaceId,
      onBroadcast: (hash: `0x${string}`) => {
        setLastTxHash(hash);
        setSyncStatus("MINING");
      },
    }),
    [auth.user?.walletAddress]
  );

  /**
   * Khởi tạo quỹ On-Chain V2 nguyên tử qua KinetixFundFactoryV2
   */
  const createFundOnchain = useCallback(
    async (workspaceId: string, params: CreateFundParams) => {
      setIsTransacting(true);
      setSyncStatus("SIGNING");
      setError(null);
      try {
        // Fix R09: KHÔNG tự ý inject ví người tạo vào danh sách nếu không được chọn
        const rawGuardians = (params.guardianWallets || []).filter(Boolean);
        if (rawGuardians.length === 0 && (!params.members || params.members.length === 0)) {
          throw new Error("Cần chọn ít nhất một người bảo hộ / người duyệt cho quỹ.");
        }

        const members: {
          account: `0x${string}`;
          permissions: number;
          dailyAllowanceWei: bigint | string;
        }[] =
          params.members && params.members.length > 0
            ? params.members.map((m) => ({
                account: m.account as `0x${string}`,
                permissions: m.permissions,
                dailyAllowanceWei: m.dailyAllowanceWei || "0",
              }))
            : rawGuardians.map((wallet) => ({
                account: wallet as `0x${string}`,
                permissions: V2_PERMISSIONS.PROPOSE | V2_PERMISSIONS.APPROVE,
                dailyAllowanceWei: "0",
              }));

        const isGoal = params.fundType === "GOAL";
        const goalTargetWei =
          isGoal && params.targetAmountAvax
            ? groupAmount(params.targetAmountAvax).toString()
            : "0";

        const goalDeadlineSeconds = params.targetDeadline
          ? Math.floor(new Date(params.targetDeadline).getTime() / 1000)
          : 0;

        const dailyLimitWei = params.dailyLimitAvax
          ? groupAmount(params.dailyLimitAvax).toString()
          : "0";

        const preflight = makePreflight(workspaceId);

        const onchainResult = await createOnchainFund(
          {
            kind: isGoal ? "GOAL" : "OPERATING",
            goalTargetWei,
            goalDeadlineSeconds,
            terms: `${params.name}: ${params.description || "Kinetix On-Chain Fund"}`,
            policy: {
              quorum: params.requiredApprovals || 2,
              transactionLimitWei: "0",
              dailyLimitWei,
            },
            members,
          },
          preflight
        );

        setLastTxHash(onchainResult.txHash);
        setSyncStatus("SYNCING");

        // Đồng bộ với backend registry
        let registeredFund: any = null;
        try {
          const syncRes = await authRequest("/api/funds/register-onchain", {
            workspaceId,
            name: params.name,
            description: params.description,
            fundType: params.fundType,
            custodyType: "ONCHAIN_V2",
            contractAddress: onchainResult.fundAddress,
            factoryAddress: DEFAULT_FACTORY_V2_ADDRESS,
            targetAmountWei: goalTargetWei,
            targetDeadline: params.targetDeadline,
            requiredApprovals: params.requiredApprovals,
            guardianWallets: rawGuardians,
            txHash: onchainResult.txHash,
          });
          registeredFund = syncRes.data;
        } catch {
          // Fallback lưu qua API tạo quỹ thông thường nếu endpoint register-onchain chưa sẵn sàng
          const fallbackRes = await authRequest(`/api/groups/${workspaceId}/funds`, {
            ...params,
            custodyType: "ONCHAIN_V2",
            contractAddress: onchainResult.fundAddress,
            fastWithdrawLimitWei: "0",
            targetAmountWei: goalTargetWei,
          });
          registeredFund = fallbackRes.data;
        }

        setSyncStatus("CONFIRMED");
        return {
          fund: registeredFund,
          fundAddress: onchainResult.fundAddress,
          fundId: onchainResult.fundId,
          txHash: onchainResult.txHash,
        };
      } catch (err) {
        setSyncStatus("FAILED");
        const msg = humanizeV2Error(err);
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsTransacting(false);
      }
    },
    [makePreflight]
  );

  /**
   * Góp tiền trực tiếp vào hợp đồng quỹ On-Chain V2
   */
  const contributeOnchain = useCallback(
    async (fund: GroupFundItem, amountAvax: string) => {
      const fundAddress = (fund.contractAddress || fund.onchainVaultAddress) as `0x${string}`;
      if (!fundAddress || !/^0x[\da-f]{40}$/i.test(fundAddress)) {
        throw new Error("Quỹ chưa có địa chỉ hợp đồng on-chain hợp lệ.");
      }

      setIsTransacting(true);
      setSyncStatus("SIGNING");
      setError(null);
      try {
        const amountWei = groupAmount(amountAvax).toString();
        const preflight = makePreflight(fund.workspaceId);

        const result = await depositOnchainFund(
          {
            fundAddress,
            amountWei,
            referenceMemo: `Góp quỹ ${fund.name}`,
          },
          preflight
        );

        setLastTxHash(result.txHash);
        setSyncStatus("SYNCING");

        // Báo cho backend ghi nhận ý định góp nếu có
        try {
          await authRequest(
            `/api/groups/${fund.workspaceId}/funds/${fund.id}/contributions/intent`,
            { amountWei, txHash: result.txHash }
          );
        } catch {
          // Bỏ qua lỗi sync off-chain vì indexer sẽ tự động bắt event Deposited
        }

        setSyncStatus("CONFIRMED");
        return { txHash: result.txHash };
      } catch (err) {
        setSyncStatus("FAILED");
        const msg = humanizeV2Error(err);
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsTransacting(false);
      }
    },
    [makePreflight]
  );

  /**
   * Tạo đề nghị chi tiêu trên hợp đồng On-Chain V2
   */
  const proposeExpenseOnchainAction = useCallback(
    async (fund: GroupFundItem, params: ProposeExpenseParams) => {
      const fundAddress = (fund.contractAddress || fund.onchainVaultAddress) as `0x${string}`;
      if (!fundAddress || !/^0x[\da-f]{40}$/i.test(fundAddress)) {
        throw new Error("Quỹ chưa có địa chỉ hợp đồng on-chain hợp lệ.");
      }

      setIsTransacting(true);
      setSyncStatus("SIGNING");
      setError(null);
      try {
        const amountWei = groupAmount(params.amountAvax).toString();
        const deadlineHours = params.deadlineHours || 168; // 7 ngày
        const deadlineSeconds = Math.floor(Date.now() / 1000) + deadlineHours * 3600;
        const preflight = makePreflight(fund.workspaceId);

        const result = await proposeExpenseOnchain(
          {
            fundAddress,
            recipient: params.recipientAddress as `0x${string}`,
            amountWei,
            deadlineSeconds,
            memo: `${params.title}: ${params.purpose}`,
          },
          preflight
        );

        setLastTxHash(result.txHash);
        setSyncStatus("SYNCING");

        // Ghi nhận vào DB backend
        try {
          await authRequest(`/api/funds/${fund.id}/sync-v2-expense`, {
            onchainExpenseId: Number(result.expenseId),
            txHash: result.txHash,
            amountWei,
            recipientAddress: params.recipientAddress,
            recipientName: params.recipientName,
            title: params.title,
            purpose: params.purpose,
            category: params.category,
            receiptAttachmentUrl: params.receiptAttachmentUrl,
          });
        } catch {
          await authRequest(
            `/api/groups/${fund.workspaceId}/funds/${fund.id}/expenses`,
            {
              ...params,
              amountWei,
              onchainExpenseId: Number(result.expenseId),
              txHash: result.txHash,
            }
          );
        }

        setSyncStatus("CONFIRMED");
        return { txHash: result.txHash, expenseId: result.expenseId };
      } catch (err) {
        setSyncStatus("FAILED");
        const msg = humanizeV2Error(err);
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsTransacting(false);
      }
    },
    [makePreflight]
  );

  /**
   * Biểu quyết duyệt chi on-chain
   */
  const approveExpenseOnchainAction = useCallback(
    async (fund: GroupFundItem, expense: GroupExpenseRequest, comment?: string) => {
      const fundAddress = (fund.contractAddress || fund.onchainVaultAddress) as `0x${string}`;
      if (!fundAddress || !/^0x[\da-f]{40}$/i.test(fundAddress)) {
        throw new Error("Quỹ chưa có địa chỉ hợp đồng on-chain hợp lệ.");
      }

      // Fix R02: Chặn ký khi thiếu onchainExpenseId hợp lệ (không fallback về 1)
      const expenseId = expense.onchainExpenseId;
      if (expenseId === undefined || expenseId === null || expenseId <= 0) {
        throw new Error(
          `Đề xuất chi #${expense.id} chưa có mã on-chain hợp lệ (onchainExpenseId). Vui lòng chờ indexer đồng bộ trước khi duyệt.`
        );
      }

      setIsTransacting(true);
      setSyncStatus("SIGNING");
      setError(null);
      try {
        const preflight = makePreflight(fund.workspaceId);

        const result = await approveExpenseOnchain(
          {
            fundAddress,
            expenseId,
          },
          preflight
        );

        setLastTxHash(result.txHash);
        setSyncStatus("SYNCING");

        // Cập nhật trạng thái duyệt trên backend
        try {
          await authRequest(`/api/expenses/${expense.id}/approve`, {
            comment,
            txHash: result.txHash,
          });
        } catch {
          // Bỏ qua nếu indexer đồng bộ
        }

        setSyncStatus("CONFIRMED");
        return { txHash: result.txHash };
      } catch (err) {
        setSyncStatus("FAILED");
        const msg = humanizeV2Error(err);
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsTransacting(false);
      }
    },
    [makePreflight]
  );

  /**
   * Thực thi giải ngân chi tiêu on-chain khi đã đủ điều kiện
   */
  const executeExpenseOnchainAction = useCallback(
    async (fund: GroupFundItem, expense: GroupExpenseRequest) => {
      const fundAddress = (fund.contractAddress || fund.onchainVaultAddress) as `0x${string}`;
      if (!fundAddress || !/^0x[\da-f]{40}$/i.test(fundAddress)) {
        throw new Error("Quỹ chưa có địa chỉ hợp đồng on-chain hợp lệ.");
      }

      // Fix R02: Chặn ký khi thiếu onchainExpenseId hợp lệ (không fallback về 1)
      const expenseId = expense.onchainExpenseId;
      if (expenseId === undefined || expenseId === null || expenseId <= 0) {
        throw new Error(
          `Đề xuất chi #${expense.id} chưa có mã on-chain hợp lệ (onchainExpenseId). Vui lòng chờ indexer đồng bộ trước khi thực thi.`
        );
      }

      setIsTransacting(true);
      setSyncStatus("SIGNING");
      setError(null);
      try {
        const preflight = makePreflight(fund.workspaceId);

        const result = await executeExpenseOnchain(
          {
            fundAddress,
            expenseId,
          },
          preflight
        );

        setLastTxHash(result.txHash);
        setSyncStatus("SYNCING");

        // Xác nhận thanh toán với backend
        try {
          await authRequest(`/api/expenses/${expense.id}/verify-payment`, {
            txHash: result.txHash,
          });
        } catch {
          // Indexer sẽ chốt trạng thái
        }

        setSyncStatus("CONFIRMED");
        return { txHash: result.txHash };
      } catch (err) {
        setSyncStatus("FAILED");
        const msg = humanizeV2Error(err);
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsTransacting(false);
      }
    },
    [makePreflight]
  );

  /**
   * Rút hoàn tiền khi quỹ mục tiêu hết hạn mà không đạt target (1-tap refund)
   */
  const refundFailedGoal = useCallback(
    async (fund: GroupFundItem) => {
      const fundAddress = (fund.contractAddress || fund.onchainVaultAddress) as `0x${string}`;
      if (!fundAddress || !/^0x[\da-f]{40}$/i.test(fundAddress)) {
        throw new Error("Quỹ chưa có địa chỉ hợp đồng on-chain hợp lệ.");
      }

      setIsTransacting(true);
      setSyncStatus("SIGNING");
      setError(null);
      try {
        const preflight = makePreflight(fund.workspaceId);
        const result = await refundFailedGoalOnchain({ fundAddress }, preflight);

        setLastTxHash(result.txHash);
        setSyncStatus("CONFIRMED");
        return {
          txHash: result.txHash,
          amountRefunded: result.amountRefunded,
        };
      } catch (err) {
        setSyncStatus("FAILED");
        const msg = humanizeV2Error(err);
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsTransacting(false);
      }
    },
    [makePreflight]
  );

  /**
   * Đề xuất chính sách & danh sách quyền thành viên mới (Policy Governance)
   */
  const proposePolicy = useCallback(
    async (
      fund: GroupFundItem,
      policy: FundV2Policy,
      members: FundV2Member[],
      terms?: string
    ) => {
      const fundAddress = (fund.contractAddress || fund.onchainVaultAddress) as `0x${string}`;
      if (!fundAddress || !/^0x[\da-f]{40}$/i.test(fundAddress)) {
        throw new Error("Quỹ chưa có địa chỉ hợp đồng on-chain hợp lệ.");
      }

      setIsTransacting(true);
      setSyncStatus("SIGNING");
      setError(null);
      try {
        const preflight = makePreflight(fund.workspaceId);

        const result = await proposePolicyOnchain(
          {
            fundAddress,
            policy,
            members: members.map((m) => ({
              account: m.account as `0x${string}`,
              permissions: m.permissions,
              dailyAllowanceWei: m.dailyAllowanceWei || "0",
            })),
            terms,
          },
          preflight
        );

        setLastTxHash(result.txHash);
        setSyncStatus("SYNCING");

        try {
          await authRequest(`/api/funds/${fund.id}/governance`, {
            action: "POLICY",
            proposalId: Number(result.proposalId),
            txHash: result.txHash,
          });
        } catch {
          // Bỏ qua lỗi sync off-chain
        }

        setSyncStatus("CONFIRMED");
        return { txHash: result.txHash, proposalId: result.proposalId };
      } catch (err) {
        setSyncStatus("FAILED");
        const msg = humanizeV2Error(err);
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsTransacting(false);
      }
    },
    [makePreflight]
  );

  /**
   * Đề xuất tạm dừng khẩn cấp (Emergency Pause)
   */
  const proposePause = useCallback(
    async (fund: GroupFundItem, reason?: string) => {
      const fundAddress = (fund.contractAddress || fund.onchainVaultAddress) as `0x${string}`;
      if (!fundAddress || !/^0x[\da-f]{40}$/i.test(fundAddress)) {
        throw new Error("Quỹ chưa có địa chỉ hợp đồng on-chain hợp lệ.");
      }

      setIsTransacting(true);
      setSyncStatus("SIGNING");
      setError(null);
      try {
        const preflight = makePreflight(fund.workspaceId);

        const result = await proposeActionOnchain(
          {
            fundAddress,
            action: "PAUSE",
            memo: reason || "Tạm dừng khẩn cấp quỹ",
          },
          preflight
        );

        setLastTxHash(result.txHash);
        setSyncStatus("CONFIRMED");
        return { txHash: result.txHash, proposalId: result.proposalId };
      } catch (err) {
        setSyncStatus("FAILED");
        const msg = humanizeV2Error(err);
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsTransacting(false);
      }
    },
    [makePreflight]
  );

  /**
   * Đề xuất tiếp tục hoạt động quỹ (Emergency Resume)
   */
  const proposeResume = useCallback(
    async (fund: GroupFundItem, reason?: string) => {
      const fundAddress = (fund.contractAddress || fund.onchainVaultAddress) as `0x${string}`;
      if (!fundAddress || !/^0x[\da-f]{40}$/i.test(fundAddress)) {
        throw new Error("Quỹ chưa có địa chỉ hợp đồng on-chain hợp lệ.");
      }

      setIsTransacting(true);
      setSyncStatus("SIGNING");
      setError(null);
      try {
        const preflight = makePreflight(fund.workspaceId);

        const result = await proposeActionOnchain(
          {
            fundAddress,
            action: "RESUME",
            memo: reason || "Mở khóa tiếp tục quỹ",
          },
          preflight
        );

        setLastTxHash(result.txHash);
        setSyncStatus("CONFIRMED");
        return { txHash: result.txHash, proposalId: result.proposalId };
      } catch (err) {
        setSyncStatus("FAILED");
        const msg = humanizeV2Error(err);
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsTransacting(false);
      }
    },
    [makePreflight]
  );

  /**
   * Biểu quyết duyệt đề xuất governance
   */
  const approveGovernance = useCallback(
    async (fund: GroupFundItem, proposalId: number | bigint) => {
      const fundAddress = (fund.contractAddress || fund.onchainVaultAddress) as `0x${string}`;
      if (!fundAddress || !/^0x[\da-f]{40}$/i.test(fundAddress)) {
        throw new Error("Quỹ chưa có địa chỉ hợp đồng on-chain hợp lệ.");
      }

      setIsTransacting(true);
      setSyncStatus("SIGNING");
      setError(null);
      try {
        const preflight = makePreflight(fund.workspaceId);

        const result = await approveGovernanceOnchain(
          {
            fundAddress,
            proposalId,
          },
          preflight
        );

        setLastTxHash(result.txHash);
        setSyncStatus("CONFIRMED");
        return { txHash: result.txHash };
      } catch (err) {
        setSyncStatus("FAILED");
        const msg = humanizeV2Error(err);
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsTransacting(false);
      }
    },
    [makePreflight]
  );

  /**
   * Thực thi đề xuất governance sau khi đã đủ phiếu và hết 24h timelock
   */
  const executeGovernance = useCallback(
    async (fund: GroupFundItem, proposalId: number | bigint) => {
      const fundAddress = (fund.contractAddress || fund.onchainVaultAddress) as `0x${string}`;
      if (!fundAddress || !/^0x[\da-f]{40}$/i.test(fundAddress)) {
        throw new Error("Quỹ chưa có địa chỉ hợp đồng on-chain hợp lệ.");
      }

      setIsTransacting(true);
      setSyncStatus("SIGNING");
      setError(null);
      try {
        const preflight = makePreflight(fund.workspaceId);

        const result = await executeGovernanceOnchain(
          {
            fundAddress,
            proposalId,
          },
          preflight
        );

        setLastTxHash(result.txHash);
        setSyncStatus("CONFIRMED");
        return { txHash: result.txHash };
      } catch (err) {
        setSyncStatus("FAILED");
        const msg = humanizeV2Error(err);
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsTransacting(false);
      }
    },
    [makePreflight]
  );

  /**
   * Kiểm tra điều kiện rút hoàn tiền mục tiêu thất bại của thành viên hiện tại
   */
  const checkRefundEligibility = useCallback(
    async (fund: GroupFundItem): Promise<RefundEligibility> => {
      const userWallet = (auth.user?.walletAddress || "").toLowerCase();
      const fundAddress = (fund.contractAddress || fund.onchainVaultAddress) as `0x${string}`;

      // Thử gọi backend trước
      try {
        const res = await authRequest(
          `/api/funds/${fund.id}/refund-eligibility`,
          undefined,
          "GET"
        );
        if (res.data) return res.data;
      } catch {
        // Fallback kiểm tra trực tiếp qua on-chain
      }

      if (!fundAddress || !userWallet || !/^0x[\da-f]{40}$/i.test(fundAddress)) {
        return {
          fundId: fund.id,
          userAddress: userWallet,
          contributedWei: "0",
          contributedAvax: 0,
          isEligible: false,
          reason: "Chưa kết nối ví hoặc quỹ không hợp lệ",
        };
      }

      try {
        const [contributionWei, fundDetails] = await Promise.all([
          getUserContributionOnchain(fundAddress, userWallet as `0x${string}`),
          getFundV2Details(fundAddress),
        ]);

        const nowSeconds = Math.floor(Date.now() / 1000);
        // Fix R07: Dùng số nguyên unix timestamp nguyên bản, không parse chuỗi hiển thị
        const deadlinePassed =
          fundDetails.goalDeadlineSeconds > 0 &&
          nowSeconds > fundDetails.goalDeadlineSeconds;
        const goalFailed = deadlinePassed && !fundDetails.goalReached;
        const hasContribution = contributionWei > 0n;
        const isEligible = goalFailed && hasContribution;

        return {
          fundId: fund.id,
          userAddress: userWallet,
          contributedWei: contributionWei.toString(),
          contributedAvax: Number(formatEther(contributionWei)),
          isEligible,
          deadlinePassed,
          goalFailed,
          goalTargetWei: fundDetails.goalTargetWei,
          currentBalanceWei: fundDetails.accountedBalanceWei,
          reason: !hasContribution
            ? "Bạn chưa có khoản đóng góp nào vào quỹ này."
            : !deadlinePassed
            ? "Mục tiêu chưa hết hạn."
            : fundDetails.goalReached
            ? "Mục tiêu đã hoàn thành thành công."
            : undefined,
        };
      } catch (err) {
        return {
          fundId: fund.id,
          userAddress: userWallet,
          contributedWei: "0",
          contributedAvax: 0,
          isEligible: false,
          reason: humanizeV2Error(err),
        };
      }
    },
    [auth.user?.walletAddress]
  );

  /**
   * Lấy chi tiết thông số quỹ on-chain theo thời gian thực
   */
  const fetchFundDetails = useCallback(async (contractAddress: string) => {
    if (!/^0x[\da-f]{40}$/i.test(contractAddress)) {
      throw new Error("Địa chỉ hợp đồng không hợp lệ.");
    }
    return getFundV2Details(contractAddress as `0x${string}`);
  }, []);

  return {
    isTransacting,
    syncStatus,
    lastTxHash,
    error,
    clearError,
    createFundOnchain,
    contributeOnchain,
    proposeExpenseOnchain: proposeExpenseOnchainAction,
    approveExpenseOnchain: approveExpenseOnchainAction,
    executeExpenseOnchain: executeExpenseOnchainAction,
    refundFailedGoal,
    proposePolicy,
    proposePause,
    proposeResume,
    approveGovernance,
    executeGovernance,
    checkRefundEligibility,
    fetchFundDetails,
  };
}
