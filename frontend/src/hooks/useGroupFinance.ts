"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { formatEther } from "viem";
import { authRequest, useAuth } from "./useAuth";
import { useFamily } from "@/context/FamilyContext";
import {
  GroupFundItem,
  GroupExpenseRequest,
  GroupObligation,
  GroupAuditEvent,
  CreateFundParams,
  ProposeExpenseParams,
  FundV2Policy,
  FundV2Member,
  RefundEligibility,
} from "@/types/groupFinance";
import { groupAmount } from "../../../shared/groupFinance";
import {
  GroupTransfer,
  sendGroupTransfer,
  savedGroupHash,
} from "@/lib/web3/groupTransfers";
import { useFundV2 } from "./useFundV2";

const avax = (wei: string) => Number(formatEther(BigInt(wei || "0")));
const date = (value: string | null) =>
  value ? new Date(value).toLocaleString("vi-VN") : "Chưa đặt hạn";
const auditLabels: Record<string, string> = {
  FUND_CREATED: "Tạo quỹ",
  CONTRIBUTION_RECONCILED: "Đã nhận góp",
  EXPENSE_PROPOSED: "Đề nghị chi",
  EXPENSE_APPROVED: "Duyệt chi",
  EXPENSE_SETTLED: "Đã thanh toán",
  EXPENSE_REJECTED: "Từ chối chi",
  EXPENSE_CANCELLED: "Hủy đề nghị",
  EXPENSES_EXPIRED: "Hết hạn đề nghị",
};
function mapAudit({ event: e, actorName, fundName }: any): GroupAuditEvent {
  return {
    ...e,
    actorName: actorName || "Hệ thống",
    actorWallet: e.actorWallet || "",
    fundName: fundName || "",
    action:
      e.action === "CONTRIBUTION_RECONCILED"
        ? "CONTRIBUTION_MADE"
        : e.action === "EXPENSE_SETTLED"
          ? "PAYMENT_EXECUTED"
          : e.action,
    description: [
      auditLabels[e.action] || e.action,
      e.metadataDiff?.title || e.metadataDiff?.name,
    ]
      .filter(Boolean)
      .join(": "),
    amountAvax: e.metadataDiff?.amountWei
      ? avax(e.metadataDiff.amountWei)
      : undefined,
    txHash: e.metadataDiff?.txHash,
    createdAt: date(e.createdAt),
  };
}
export function useGroupFinance() {
  const auth = useAuth();
  const fundV2 = useFundV2();
  const { currentWorkspace } = useFamily();
  const workspaceId = currentWorkspace?.id;
  const userId = auth.user?.id;
  const scope = `${userId}:${workspaceId}`;
  const latestScope = useRef(scope);
  latestScope.current = scope;
  const sequence = useRef(0);
  const loadedScope = useRef<string | null>(null);
  const refreshing = useRef({ scope: "", request: 0 });
  const active = useRef(false);
  const [state, setState] = useState<{
    scope: string;
    funds: GroupFundItem[];
    expenses: GroupExpenseRequest[];
    obligations: GroupObligation[];
    auditEvents: GroupAuditEvent[];
    transfers: GroupTransfer[];
    unsupportedFunds: { id: string; name: string }[];
  }>({
    scope,
    funds: [],
    expenses: [],
    obligations: [],
    auditEvents: [],
    transfers: [],
    unsupportedFunds: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreActivity, setHasMoreActivity] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const visible =
    state.scope === scope
      ? state
      : {
          funds: [],
          expenses: [],
          obligations: [],
          auditEvents: [],
          transfers: [],
          unsupportedFunds: [],
        };
  const {
    funds,
    expenses,
    obligations,
    auditEvents,
    transfers,
    unsupportedFunds,
  } = visible;
  const [selectedFundId, setSelectedFundId] = useState("all");
  const refresh = useCallback(async () => {
    if (!workspaceId || !userId) return;
    if (
      refreshing.current.scope === scope &&
      refreshing.current.request === sequence.current
    )
      return;
    const request = ++sequence.current;
    refreshing.current = { scope, request };
    if (loadedScope.current !== scope) setIsLoading(true);
    fundV2?.clearError?.();
    try {
      const [fundResponse, auditResponse, transferResponse] = await Promise.all(
        [
          authRequest(`/api/groups/${workspaceId}/funds`, undefined, "GET"),
          authRequest(
            `/api/groups/${workspaceId}/audit?limit=100`,
            undefined,
            "GET",
          ),
          authRequest(`/api/groups/${workspaceId}/transfers`, undefined, "GET"),
        ],
      );
      const supportsAdapter = (fund: any) =>
        (fund.custodyType === "SHARED_TREASURY" &&
          /^0x[\da-f]{40}$/i.test(fund.treasuryWalletAddress || "")) ||
        (fund.custodyType === "ONCHAIN_V2" &&
          /^0x[\da-f]{40}$/i.test(fund.contractAddress || fund.onchainVaultAddress || ""));
      const unsupportedFunds = fundResponse.data
        .filter((fund: any) => !supportsAdapter(fund))
        .map((fund: any) => ({ id: fund.id, name: fund.name }));
      const mapped: GroupFundItem[] = fundResponse.data
        .filter(supportsAdapter)
        .map((f: any) => ({
          ...f,
          custodyType: f.custodyType,
          contractAddress: f.contractAddress || f.onchainVaultAddress,
          factoryAddress: f.factoryAddress,
          policyEpoch: f.policyEpoch || 1,
          isPaused: f.isPaused || f.status === "PAUSED",
          balanceAvax: avax(f.balanceWei),
          reservedAvax: avax(f.reservedWei),
          availableAvax: avax(f.availableWei),
          fastWithdrawLimitWei: f.policy?.fastWithdrawLimitWei || f.fastWithdrawLimitWei || "0",
          fastWithdrawLimitAvax: avax(f.policy?.fastWithdrawLimitWei || f.fastWithdrawLimitWei),
          requiredApprovals: f.policy?.quorum || f.requiredApprovals || 0,
          totalSigners: f.policy?.signers?.length || f.signers?.length || 0,
          signers: f.policy?.signers || f.signers || [],
          targetAmountAvax: avax(f.targetAmountWei),
          goalReached: f.goalReached ?? (BigInt(f.balanceWei || "0") >= BigInt(f.targetAmountWei || "1")),
          targetDeadline: f.targetDeadline || null,
          targetDeadlineFormatted: date(f.targetDeadline),
          createdAt: date(f.createdAt),
        }));
      const details = await Promise.all(
        mapped.map(async (fund) => {
          const [requests, obligations] = await Promise.all([
            authRequest(
              `/api/groups/${workspaceId}/funds/${fund.id}/expenses`,
              undefined,
              "GET",
            ),
            authRequest(
              `/api/groups/${workspaceId}/funds/${fund.id}/obligations`,
              undefined,
              "GET",
            ),
          ]);
          return {
            expenses: requests.data.map((e: any) => ({
              ...e,
              fundName: fund.name,
              fundType: fund.fundType,
              status: e.status === "SETTLED" ? "EXECUTED" : e.status,
              amountAvax: avax(e.amountWei),
              approvedCount: e.approvalsCount,
              deadline: e.deadline,
              deadlineFormatted: date(e.deadline),
              createdAt: date(e.createdAt),
              approvals: e.approvals.map((a: any) => ({
                ...a,
                createdAt: date(a.createdAt),
              })),
              payment: e.payment
                ? {
                    ...e.payment,
                    amountAvax: avax(e.payment.amountWei),
                    confirmedAt: date(e.payment.confirmedAt),
                  }
                : undefined,
            })),
            obligations: obligations.data
              .filter((o: any) => o.memberUserId === userId)
              .map((o: any) => ({
                ...o,
                fundName: fund.name,
                memberName: o.memberFullName,
                memberAddress: o.memberWallet || "",
                amountAvax: avax(o.amountWei),
                dueDate: o.dueDate,
                dueDateFormatted: date(o.dueDate),
              })),
          };
        }),
      );
      if (latestScope.current !== scope || request !== sequence.current) return;
      setState({
        scope,
        funds: mapped,
        unsupportedFunds,
        expenses: details.flatMap((item) => item.expenses),
        obligations: details.flatMap((item) => item.obligations),
        transfers: transferResponse.data,
        auditEvents: auditResponse.data.map(mapAudit),
      });
      setHasMoreActivity(auditResponse.data.length === 100);
      loadedScope.current = scope;
      setError(null);
    } catch (err) {
      if (latestScope.current === scope && request === sequence.current) {
        loadedScope.current = null;
        setState({
          scope,
          funds: [],
          expenses: [],
          obligations: [],
          auditEvents: [],
          transfers: [],
          unsupportedFunds: [],
        });
        setError(
          err instanceof Error ? err.message : "Không tải được dữ liệu nhóm.",
        );
      }
    } finally {
      if (refreshing.current.request === request)
        refreshing.current = { scope: "", request: 0 };
      if (latestScope.current === scope && request === sequence.current)
        setIsLoading(false);
    }
  }, [scope, userId, workspaceId]);
  const loadMoreActivity = async () => {
    if (isLoadingMore || !auditEvents.length) return;
    const generation = sequence.current;
    setIsLoadingMore(true);
    setHistoryError("");
    try {
      const response = await authRequest(
        `/api/groups/${workspaceId}/audit?limit=100&cursor=${auditEvents[auditEvents.length - 1].id}`,
        undefined,
        "GET",
      );
      if (latestScope.current !== scope || sequence.current !== generation)
        return;
      setState((previous) => ({
        ...previous,
        auditEvents: [...previous.auditEvents, ...response.data.map(mapAudit)],
      }));
      setHasMoreActivity(response.data.length === 100);
    } catch (err) {
      if (latestScope.current === scope)
        setHistoryError((err as Error).message);
    } finally {
      setIsLoadingMore(false);
    }
  };
  useEffect(() => {
    setError(null);
    setSelectedFundId("all");
    void refresh();
    return () => {
      sequence.current++;
    };
  }, [refresh]);
  useEffect(() => {
    const resume = () => {
      if (document.visibilityState === "visible" && !active.current)
        void refresh();
    };
    document.addEventListener("visibilitychange", resume);
    return () => document.removeEventListener("visibilitychange", resume);
  }, [refresh]);
  useEffect(() => {
    if (!transfers.length) return;
    const timer = window.setInterval(() => {
      if (!active.current && document.visibilityState === "visible")
        void refresh();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [transfers.length, refresh]);
  async function mutate<T extends object>(action: () => Promise<T>) {
    if (active.current)
      return {
        success: false as const,
        error: "Có thao tác đang xử lý. Vui lòng chờ.",
      };
    active.current = true;
    setIsMutating(true);
    setError(null);
    try {
      if (!workspaceId || !userId || latestScope.current !== scope)
        throw new Error("Chọn nhóm và đăng nhập trước khi thao tác.");
      const result = await action();
      if (latestScope.current === scope) await refresh();
      return { ...result, success: true as const };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không thực hiện được thao tác.";
      if (latestScope.current === scope) {
        await refresh();
        setError(message);
      }
      return { success: false as const, error: message };
    } finally {
      active.current = false;
      setIsMutating(false);
    }
  }
  async function finishTransfer(intent: GroupTransfer, suppliedHash?: string) {
    const txHash =
      suppliedHash ||
      intent.txHash ||
      savedGroupHash(userId!, intent.id) ||
      (await sendGroupTransfer(userId!, workspaceId!, intent));
    await authRequest(`/api/fund-transfers/${intent.id}/submit`, { txHash });
    const path =
      intent.kind === "PAYMENT"
        ? `/api/expenses/${intent.requestId}/verify-payment`
        : `/api/groups/${workspaceId}/funds/${intent.fundId}/contributions/reconcile`;
    try {
      await authRequest(path, { txHash, intentId: intent.id });
    } catch {
      throw new Error(
        `Giao dịch ${txHash} đang cần đối soát. Dùng “Đối soát lệnh” để kiểm tra lại; không gửi tiền lần hai.`,
      );
    }
    return { txHash };
  }
  const createFund = (params: CreateFundParams) =>
    mutate(async () => {
      if (params.custodyType === "ONCHAIN_V2") {
        return fundV2.createFundOnchain(workspaceId!, params);
      }
      const response = await authRequest(`/api/groups/${workspaceId}/funds`, {
        ...params,
        fastWithdrawLimitWei: "0",
        targetAmountWei:
          params.fundType === "GOAL"
            ? groupAmount(params.targetAmountAvax).toString()
            : "0",
      });
      return { fund: response.data };
    });
  const contribute = (params: {
    fundId: string;
    amount: string;
    txHash?: string;
  }) =>
    mutate(async () => {
      const targetFund = funds.find((f) => f.id === params.fundId);
      if (targetFund?.custodyType === "ONCHAIN_V2") {
        return fundV2.contributeOnchain(targetFund, params.amount);
      }
      const response = await authRequest(
        `/api/groups/${workspaceId}/funds/${params.fundId}/contributions/intent`,
        { amountWei: groupAmount(params.amount).toString() },
      );
      return finishTransfer(response.data, params.txHash);
    });
  const proposeExpense = (params: ProposeExpenseParams) =>
    mutate(async () => {
      const targetFund = funds.find((f) => f.id === params.fundId);
      if (targetFund?.custodyType === "ONCHAIN_V2") {
        return fundV2.proposeExpenseOnchain(targetFund, params);
      }
      const receipt = params.receiptAttachmentUrl;
      if (receipt && !receipt.startsWith("data:image/png;base64,"))
        throw new Error("Chứng từ cần được chuyển thành PNG trước khi gửi.");
      await authRequest(
        `/api/groups/${workspaceId}/funds/${params.fundId}/expenses`,
        {
          ...params,
          amountWei: groupAmount(params.amountAvax).toString(),
          receiptImageBase64: receipt?.split(",")[1],
        },
      );
      return {};
    });
  const approveExpense = (id: string, comment?: string) =>
    mutate(async () => {
      const expense = expenses.find((e) => e.id === id);
      const targetFund = funds.find((f) => f.id === expense?.fundId);
      if (targetFund?.custodyType === "ONCHAIN_V2" && expense) {
        return fundV2.approveExpenseOnchain(targetFund, expense, comment);
      }
      await authRequest(`/api/expenses/${id}/approve`, { comment });
      return {};
    });
  const rejectExpense = (id: string, reason: string) =>
    mutate(async () => {
      const expense = expenses.find((e) => e.id === id);
      const targetFund = funds.find((f) => f.id === expense?.fundId);
      if (targetFund?.custodyType === "ONCHAIN_V2") {
        if (!expense) throw new Error("Không tìm thấy thông tin đề xuất chi.");
        return fundV2.rejectExpenseOnchain(targetFund, expense, reason);
      }
      await authRequest(`/api/expenses/${id}/reject`, { reason });
      return {};
    });
  const cancelExpense = (id: string) =>
    mutate(async () => {
      const expense = expenses.find((e) => e.id === id);
      const targetFund = funds.find((f) => f.id === expense?.fundId);
      if (targetFund?.custodyType === "ONCHAIN_V2") {
        if (!expense) throw new Error("Không tìm thấy thông tin đề xuất chi.");
        return fundV2.cancelExpenseOnchain(targetFund, expense);
      }
      await authRequest(`/api/expenses/${id}/cancel`, {});
      return {};
    });
  const executePayment = (id: string) =>
    mutate(async () => {
      const expense = expenses.find((e) => e.id === id);
      const targetFund = funds.find((f) => f.id === expense?.fundId);
      if (targetFund?.custodyType === "ONCHAIN_V2" && expense) {
        return fundV2.executeExpenseOnchain(targetFund, expense);
      }
      const response = await authRequest(`/api/expenses/${id}/pay`, {});
      return finishTransfer(response.data);
    });
  const refundFailedGoal = (fundId: string) =>
    mutate(async () => {
      const targetFund = funds.find((f) => f.id === fundId);
      if (!targetFund) throw new Error("Không tìm thấy thông tin quỹ.");
      return fundV2.refundFailedGoal(targetFund);
    });
  const proposePolicy = (
    fundId: string,
    policy: FundV2Policy,
    members: FundV2Member[],
    terms?: string
  ) =>
    mutate(async () => {
      const targetFund = funds.find((f) => f.id === fundId);
      if (!targetFund) throw new Error("Không tìm thấy thông tin quỹ.");
      return fundV2.proposePolicy(targetFund, policy, members, terms);
    });
  const executeGovernance = (fundId: string, proposalId: number) =>
    mutate(async () => {
      const targetFund = funds.find((f) => f.id === fundId);
      if (!targetFund) throw new Error("Không tìm thấy thông tin quỹ.");
      return fundV2.executeGovernance(targetFund, proposalId);
    });
  const proposePause = (fundId: string, reason?: string) =>
    mutate(async () => {
      const targetFund = funds.find((f) => f.id === fundId);
      if (!targetFund) throw new Error("Không tìm thấy thông tin quỹ.");
      return fundV2.proposePause(targetFund, reason);
    });
  const proposeResume = (fundId: string, reason?: string) =>
    mutate(async () => {
      const targetFund = funds.find((f) => f.id === fundId);
      if (!targetFund) throw new Error("Không tìm thấy thông tin quỹ.");
      return fundV2.proposeResume(targetFund, reason);
    });
  const approveGovernance = (fundId: string, proposalId: number) =>
    mutate(async () => {
      const targetFund = funds.find((f) => f.id === fundId);
      if (!targetFund) throw new Error("Không tìm thấy thông tin quỹ.");
      return fundV2.approveGovernance(targetFund, proposalId);
    });
  const checkRefundEligibility = useCallback(
    async (fundId: string): Promise<RefundEligibility> => {
      const targetFund = funds.find((f) => f.id === fundId);
      if (!targetFund) throw new Error("Không tìm thấy thông tin quỹ.");
      return fundV2.checkRefundEligibility(targetFund);
    },
    [funds, fundV2]
  );
  const resumeTransfer = (intent: GroupTransfer, hash?: string) =>
    mutate(() => finishTransfer(intent, hash));
  const resolveTransfer = (intent: GroupTransfer, hash: string) =>
    mutate(async () => {
      await authRequest(`/api/fund-transfers/${intent.id}/resolve`, {
        txHash: hash,
      });
      return {};
    });
  const pendingUserApprovals = expenses.filter((item) => item.canApprove);
  const awaitingPaymentExpenses = expenses.filter(
    (item) =>
      item.canPay && ["APPROVED", "PAYMENT_PENDING"].includes(item.status),
  );
  const summary = useMemo(() => {
    const total = (field: "balanceWei" | "reservedWei" | "availableWei") =>
      avax(
        funds.reduce((sum, item) => sum + BigInt(item[field]), 0n).toString(),
      );
    return {
      totalBalanceAvax: total("balanceWei"),
      totalReservedAvax: total("reservedWei"),
      totalAvailableAvax: total("availableWei"),
      fundsCount: funds.length,
      pendingApprovalsCount: pendingUserApprovals.length,
      awaitingPaymentCount: awaitingPaymentExpenses.length,
    };
  }, [funds, pendingUserApprovals.length, awaitingPaymentExpenses.length]);
  const clearError = useCallback(() => {
    setError(null);
    fundV2?.clearError?.();
  }, [fundV2]);

  return {
    funds,
    expenses,
    obligations,
    auditEvents,
    transfers,
    unsupportedFunds,
    selectedFundId,
    setSelectedFundId,
    pendingUserApprovals,
    awaitingPaymentExpenses,
    summary,
    isLoading,
    isMutating: isMutating || fundV2.isTransacting,
    error: error || fundV2.error,
    clearError,
    refresh,
    createFund,
    contribute,
    proposeExpense,
    approveExpense,
    rejectExpense,
    cancelExpense,
    executePayment,
    refundFailedGoal,
    proposePolicy,
    executeGovernance,
    proposePause,
    proposeResume,
    approveGovernance,
    checkRefundEligibility,
    fundV2,
    resumeTransfer,
    resolveTransfer,
    hasMoreActivity,
    isLoadingMore,
    historyError,
    loadMoreActivity,
  };
}
